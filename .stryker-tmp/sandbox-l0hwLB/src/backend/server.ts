// @ts-nocheck
// Import OpenTelemetry tracing before anything else
function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
import './tracing';
import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import cors from '@fastify/cors';
import { offerRoutes } from './routes/offer';
import { tradeRoutes } from './routes/trade';

// Fastify instance must be created before registering plugins
const fastify = Fastify(stryMutAct_9fa48("251") ? {} : (stryCov_9fa48("251"), {
  trustProxy: stryMutAct_9fa48("252") ? false : (stryCov_9fa48("252"), true),
  // Enable trust proxy for correct client IP detection (rate limiting)
  logger: stryMutAct_9fa48("253") ? {} : (stryCov_9fa48("253"), {
    level: stryMutAct_9fa48("254") ? "" : (stryCov_9fa48("254"), 'info'),
    serializers: stryMutAct_9fa48("255") ? {} : (stryCov_9fa48("255"), {
      req(request) {
        if (stryMutAct_9fa48("256")) {
          {}
        } else {
          stryCov_9fa48("256");
          return stryMutAct_9fa48("257") ? {} : (stryCov_9fa48("257"), {
            method: request.method,
            url: request.url,
            id: request.id,
            remoteAddress: request.ip
          });
        }
      }
    })
  })
}));

// Health and readiness endpoint for observability
fastify.get(stryMutAct_9fa48("258") ? "" : (stryCov_9fa48("258"), '/health'), async (req, reply) => {
  if (stryMutAct_9fa48("259")) {
    {}
  } else {
    stryCov_9fa48("259");
    return stryMutAct_9fa48("260") ? {} : (stryCov_9fa48("260"), {
      status: stryMutAct_9fa48("261") ? "" : (stryCov_9fa48("261"), 'ok'),
      uptime: process.uptime()
    });
  }
});

// Cyber security: Advanced CORS policy
fastify.register(cors, stryMutAct_9fa48("262") ? {} : (stryCov_9fa48("262"), {
  origin: stryMutAct_9fa48("263") ? [] : (stryCov_9fa48("263"), [stryMutAct_9fa48("264") ? "" : (stryCov_9fa48("264"), 'https://your-production-domain.com'), stryMutAct_9fa48("265") ? "" : (stryCov_9fa48("265"), 'https://admin.your-production-domain.com'), stryMutAct_9fa48("266") ? "" : (stryCov_9fa48("266"), 'http://localhost:3000')]),
  methods: stryMutAct_9fa48("267") ? [] : (stryCov_9fa48("267"), [stryMutAct_9fa48("268") ? "" : (stryCov_9fa48("268"), 'GET'), stryMutAct_9fa48("269") ? "" : (stryCov_9fa48("269"), 'POST'), stryMutAct_9fa48("270") ? "" : (stryCov_9fa48("270"), 'PUT'), stryMutAct_9fa48("271") ? "" : (stryCov_9fa48("271"), 'DELETE'), stryMutAct_9fa48("272") ? "" : (stryCov_9fa48("272"), 'OPTIONS')]),
  allowedHeaders: stryMutAct_9fa48("273") ? [] : (stryCov_9fa48("273"), [stryMutAct_9fa48("274") ? "" : (stryCov_9fa48("274"), 'Content-Type'), stryMutAct_9fa48("275") ? "" : (stryCov_9fa48("275"), 'Authorization'), stryMutAct_9fa48("276") ? "" : (stryCov_9fa48("276"), 'X-Requested-With'), stryMutAct_9fa48("277") ? "" : (stryCov_9fa48("277"), 'Accept'), stryMutAct_9fa48("278") ? "" : (stryCov_9fa48("278"), 'Origin')]),
  credentials: stryMutAct_9fa48("279") ? false : (stryCov_9fa48("279"), true),
  maxAge: 86400,
  strictPreflight: stryMutAct_9fa48("280") ? false : (stryCov_9fa48("280"), true)
}));

// Cyber security: HTTP headers hardening (strictest settings)
fastify.register(helmet, stryMutAct_9fa48("281") ? {} : (stryCov_9fa48("281"), {
  global: stryMutAct_9fa48("282") ? false : (stryCov_9fa48("282"), true),
  contentSecurityPolicy: stryMutAct_9fa48("283") ? {} : (stryCov_9fa48("283"), {
    directives: stryMutAct_9fa48("284") ? {} : (stryCov_9fa48("284"), {
      defaultSrc: stryMutAct_9fa48("285") ? [] : (stryCov_9fa48("285"), [stryMutAct_9fa48("286") ? "" : (stryCov_9fa48("286"), "'self'")]),
      scriptSrc: stryMutAct_9fa48("287") ? [] : (stryCov_9fa48("287"), [stryMutAct_9fa48("288") ? "" : (stryCov_9fa48("288"), "'self'")]),
      styleSrc: stryMutAct_9fa48("289") ? [] : (stryCov_9fa48("289"), [stryMutAct_9fa48("290") ? "" : (stryCov_9fa48("290"), "'self'")]),
      imgSrc: stryMutAct_9fa48("291") ? [] : (stryCov_9fa48("291"), [stryMutAct_9fa48("292") ? "" : (stryCov_9fa48("292"), "'self'"), stryMutAct_9fa48("293") ? "" : (stryCov_9fa48("293"), 'data:')]),
      objectSrc: stryMutAct_9fa48("294") ? [] : (stryCov_9fa48("294"), [stryMutAct_9fa48("295") ? "" : (stryCov_9fa48("295"), "'none'")]),
      frameAncestors: stryMutAct_9fa48("296") ? [] : (stryCov_9fa48("296"), [stryMutAct_9fa48("297") ? "" : (stryCov_9fa48("297"), "'self'")]),
      formAction: stryMutAct_9fa48("298") ? [] : (stryCov_9fa48("298"), [stryMutAct_9fa48("299") ? "" : (stryCov_9fa48("299"), "'self'")]),
      baseUri: stryMutAct_9fa48("300") ? [] : (stryCov_9fa48("300"), [stryMutAct_9fa48("301") ? "" : (stryCov_9fa48("301"), "'self'")]),
      fontSrc: stryMutAct_9fa48("302") ? [] : (stryCov_9fa48("302"), [stryMutAct_9fa48("303") ? "" : (stryCov_9fa48("303"), "'self'"), stryMutAct_9fa48("304") ? "" : (stryCov_9fa48("304"), 'https:'), stryMutAct_9fa48("305") ? "" : (stryCov_9fa48("305"), 'data:')]),
      upgradeInsecureRequests: stryMutAct_9fa48("306") ? ["Stryker was here"] : (stryCov_9fa48("306"), [])
    })
  }),
  referrerPolicy: stryMutAct_9fa48("307") ? {} : (stryCov_9fa48("307"), {
    policy: stryMutAct_9fa48("308") ? "" : (stryCov_9fa48("308"), 'no-referrer')
  }),
  crossOriginResourcePolicy: stryMutAct_9fa48("309") ? {} : (stryCov_9fa48("309"), {
    policy: stryMutAct_9fa48("310") ? "" : (stryCov_9fa48("310"), 'same-origin')
  }),
  crossOriginOpenerPolicy: stryMutAct_9fa48("311") ? {} : (stryCov_9fa48("311"), {
    policy: stryMutAct_9fa48("312") ? "" : (stryCov_9fa48("312"), 'same-origin')
  }),
  xssFilter: stryMutAct_9fa48("313") ? true : (stryCov_9fa48("313"), false),
  // legacy, not needed
  xDownloadOptions: stryMutAct_9fa48("314") ? true : (stryCov_9fa48("314"), false),
  // legacy, not needed
  xPermittedCrossDomainPolicies: stryMutAct_9fa48("315") ? {} : (stryCov_9fa48("315"), {
    permittedPolicies: stryMutAct_9fa48("316") ? "" : (stryCov_9fa48("316"), 'none')
  }),
  hidePoweredBy: stryMutAct_9fa48("317") ? false : (stryCov_9fa48("317"), true),
  dnsPrefetchControl: stryMutAct_9fa48("318") ? {} : (stryCov_9fa48("318"), {
    allow: stryMutAct_9fa48("319") ? true : (stryCov_9fa48("319"), false)
  }),
  frameguard: stryMutAct_9fa48("320") ? {} : (stryCov_9fa48("320"), {
    action: stryMutAct_9fa48("321") ? "" : (stryCov_9fa48("321"), 'deny')
  })
  // Add more strict headers as needed
}));

// Cyber security: Rate limiting
// Only allow 127.0.0.1 in allowList for local dev, not for tests
const isTest = stryMutAct_9fa48("324") ? process.env.NODE_ENV === 'test' && process.env.JEST_WORKER_ID !== undefined : stryMutAct_9fa48("323") ? false : stryMutAct_9fa48("322") ? true : (stryCov_9fa48("322", "323", "324"), (stryMutAct_9fa48("326") ? process.env.NODE_ENV !== 'test' : stryMutAct_9fa48("325") ? false : (stryCov_9fa48("325", "326"), process.env.NODE_ENV === (stryMutAct_9fa48("327") ? "" : (stryCov_9fa48("327"), 'test')))) || (stryMutAct_9fa48("329") ? process.env.JEST_WORKER_ID === undefined : stryMutAct_9fa48("328") ? false : (stryCov_9fa48("328", "329"), process.env.JEST_WORKER_ID !== undefined)));
fastify.register(rateLimit, stryMutAct_9fa48("330") ? {} : (stryCov_9fa48("330"), {
  max: 100,
  timeWindow: stryMutAct_9fa48("331") ? "" : (stryCov_9fa48("331"), '1 minute'),
  allowList: isTest ? stryMutAct_9fa48("332") ? ["Stryker was here"] : (stryCov_9fa48("332"), []) : stryMutAct_9fa48("333") ? [] : (stryCov_9fa48("333"), [stryMutAct_9fa48("334") ? "" : (stryCov_9fa48("334"), '127.0.0.1')])
}));

// Register modularized routes
offerRoutes(fastify);
tradeRoutes(fastify);
export async function startServer(port = 4000) {
  if (stryMutAct_9fa48("335")) {
    {}
  } else {
    stryCov_9fa48("335");
    return fastify.listen(stryMutAct_9fa48("336") ? {} : (stryCov_9fa48("336"), {
      port
    }));
  }
}
if (stryMutAct_9fa48("339") ? require.main !== module : stryMutAct_9fa48("338") ? false : stryMutAct_9fa48("337") ? true : (stryCov_9fa48("337", "338", "339"), require.main === module)) {
  if (stryMutAct_9fa48("340")) {
    {}
  } else {
    stryCov_9fa48("340");
    // istanbul ignore next: cannot cover CLI entry in tests
    startServer();
  }
}
export default fastify;