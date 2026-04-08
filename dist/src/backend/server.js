"use strict";
// ...existing code...
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = startServer;
// Import OpenTelemetry tracing before anything else
require("./tracing");
const fastify_1 = __importDefault(require("fastify"));
const helmet_1 = __importDefault(require("@fastify/helmet"));
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
const cors_1 = __importDefault(require("@fastify/cors"));
const offer_1 = require("./routes/offer");
const trade_1 = require("./routes/trade");
// Fastify instance must be created before registering plugins
const fastify = (0, fastify_1.default)({
    trustProxy: true, // Enable trust proxy for correct client IP detection (rate limiting)
    logger: {
        level: 'info',
        serializers: {
            req(request) {
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
(0, offer_1.offerRoutes)(fastify);
(0, trade_1.tradeRoutes)(fastify);
// Global error handler to catch all errors and prevent Fastify from returning undefined
fastify.setErrorHandler((error, request, reply) => {
    console.error('[GLOBAL ERROR HANDLER]', error);
    reply.status(500).send({ error: error && error.message ? error.message : 'Internal Server Error' });
});
// Health and readiness endpoint for observability
fastify.get('/health', async (req, reply) => {
    return { status: 'ok', uptime: process.uptime() };
});
// Cyber security: Advanced CORS policy
fastify.register(cors_1.default, {
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
    fastify.register(helmet_1.default, {
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
    fastify.register(rate_limit_1.default, {
        max: 100,
        timeWindow: '1 minute',
        allowList: ['127.0.0.1']
    });
}
// Register modularized routes
(0, offer_1.offerRoutes)(fastify);
(0, trade_1.tradeRoutes)(fastify);
async function startServer(port = 4000) {
    return fastify.listen({ port });
}
if (require.main === module) {
    // istanbul ignore next: cannot cover CLI entry in tests
    startServer();
}
exports.default = fastify;
