// @ts-nocheck
// 
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
import { FastifyInstance } from 'fastify';
import { getDbPool } from '../db/index';
import { v4 as uuidv4 } from 'uuid';
import { validateOfferInput } from '../validation/offer';
import * as auditLog from '../../audit-log';
import { detectAnomaly } from '../security/anomaly-detection';
import { sanitizeObject } from '../security/sanitize';
export async function offerRoutes(fastify: FastifyInstance) {
  if (stryMutAct_9fa48("140")) {
    {}
  } else {
    stryCov_9fa48("140");
    fastify.post(stryMutAct_9fa48("141") ? "" : (stryCov_9fa48("141"), '/api/offer'), async (req, reply) => {
      if (stryMutAct_9fa48("142")) {
        {}
      } else {
        stryCov_9fa48("142");
        let body = req.body as any;
        body = sanitizeObject(body);
        const {
          error
        } = validateOfferInput(body);
        if (stryMutAct_9fa48("144") ? false : stryMutAct_9fa48("143") ? true : (stryCov_9fa48("143", "144"), error)) return reply.status(400).send(stryMutAct_9fa48("145") ? {} : (stryCov_9fa48("145"), {
          error: error.message
        }));
        const {
          userId,
          btcAmount,
          usdAmount
        } = body;
        const id = uuidv4();
        const query = stryMutAct_9fa48("146") ? "" : (stryCov_9fa48("146"), 'INSERT INTO offers (id, user_id, type, btc_amount, usd_amount, status) VALUES (?, ?, ?, ?, ?, ?)');
        const params = stryMutAct_9fa48("147") ? [] : (stryCov_9fa48("147"), [id, userId, stryMutAct_9fa48("148") ? "" : (stryCov_9fa48("148"), 'SELL'), btcAmount, usdAmount, stryMutAct_9fa48("149") ? "" : (stryCov_9fa48("149"), 'CREATED')]);
        detectAnomaly(query, params, stryMutAct_9fa48("150") ? {} : (stryCov_9fa48("150"), {
          userId,
          ip: req.ip
        }));
        await getDbPool().execute(query, params);
        auditLog.logOperation(stryMutAct_9fa48("151") ? {} : (stryCov_9fa48("151"), {
          action: stryMutAct_9fa48("152") ? "" : (stryCov_9fa48("152"), 'offer_create'),
          userId,
          btcAmount,
          usdAmount,
          offerId: id,
          ip: req.ip,
          timestamp: new Date().toISOString()
        }));
        return stryMutAct_9fa48("153") ? {} : (stryCov_9fa48("153"), {
          id
        });
      }
    });
    fastify.get(stryMutAct_9fa48("154") ? "" : (stryCov_9fa48("154"), '/api/offers'), async (_req, reply) => {
      if (stryMutAct_9fa48("155")) {
        {}
      } else {
        stryCov_9fa48("155");
        const query = stryMutAct_9fa48("156") ? "" : (stryCov_9fa48("156"), 'SELECT * FROM offers WHERE status="CREATED"');
        detectAnomaly(query, stryMutAct_9fa48("157") ? ["Stryker was here"] : (stryCov_9fa48("157"), []), stryMutAct_9fa48("158") ? {} : (stryCov_9fa48("158"), {
          ip: _req.ip
        }));
        const [rows] = await getDbPool().execute(query);
        return rows;
      }
    });
  }
}