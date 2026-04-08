// ...existing code...

// Import OpenTelemetry tracing before anything else
import './tracing';


import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import cors from '@fastify/cors';
import { offerRoutes } from './routes/offer';
import { tradeRoutes } from './routes/trade';

// Fastify instance must be created before registering plugins
const fastify = Fastify({
  trustProxy: true, // Enable trust proxy for correct client IP detection (rate limiting)
  logger: {
    level: 'info',
    serializers: {
      req (request) {
        return {
          method: request.method,
          url: request.url,
          id: request.id,
          remoteAddress: request.ip,
        };
      }
    }
  }
});

// Register modularized routes after fastify is declared
offerRoutes(fastify);
tradeRoutes(fastify);

// Global error handler to catch all errors and prevent Fastify from returning undefined
fastify.setErrorHandler((error: any, request, reply) => {
   
  console.error('[GLOBAL ERROR HANDLER]', error);
  reply.status(500).send({ error: error && error.message ? error.message : 'Internal Server Error' });
});

// Health and readiness endpoint for observability
fastify.get('/health', async (req, reply) => {
  return { status: 'ok', uptime: process.uptime() };
});

// Cyber security: Advanced CORS policy
fastify.register(cors, {
  origin: [
    'https://your-production-domain.com',
    'https://admin.your-production-domain.com',
    'http://localhost:3000'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  credentials: true,
  maxAge: 86400,
  strictPreflight: true,
  preflightContinue: false
});



// Only enable helmet in production (not test)
const isTest = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
if (!isTest) {
  fastify.register(helmet, {
    global: true,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        frameAncestors: ["'self'"],
        formAction: ["'self'"],
        baseUri: ["'self'"],
        fontSrc: ["'self'", 'https:', 'data:'],
        upgradeInsecureRequests: []
      }
    },
    referrerPolicy: { policy: 'no-referrer' },
    crossOriginResourcePolicy: { policy: 'same-origin' },
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    xssFilter: false, // legacy, not needed
    xDownloadOptions: false, // legacy, not needed
    xPermittedCrossDomainPolicies: { permittedPolicies: 'none' },
    hidePoweredBy: true,
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    // Add more strict headers as needed
  });
}

// Cyber security: Rate limiting
// Only enable in production (not test)
if (!isTest) {
  fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    allowList: ['127.0.0.1']
  });
}

// Register modularized routes
offerRoutes(fastify);
tradeRoutes(fastify);


export async function startServer(port = 4000) {
  return fastify.listen({ port });
}

if (require.main === module) {
  // istanbul ignore next: cannot cover CLI entry in tests
  startServer();
}

export default fastify;
