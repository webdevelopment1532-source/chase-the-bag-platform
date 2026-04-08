// @ts-nocheck
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
import { validateTradeAcceptInput, validateTradeConfirmInput } from '../validation/trade';
import * as auditLog from '../../audit-log';
import { detectAnomaly } from '../security/anomaly-detection';
import { sanitizeObject } from '../security/sanitize';
export async function tradeRoutes(fastify: FastifyInstance) {
  if (stryMutAct_9fa48("159")) {
    {}
  } else {
    stryCov_9fa48("159");
    fastify.post(stryMutAct_9fa48("160") ? "" : (stryCov_9fa48("160"), '/api/trade/accept'), async (req, reply) => {
      if (stryMutAct_9fa48("161")) {
        {}
      } else {
        stryCov_9fa48("161");
        let body = req.body as any;
        body = sanitizeObject(body);
        const {
          error
        } = validateTradeAcceptInput(body);
        if (stryMutAct_9fa48("163") ? false : stryMutAct_9fa48("162") ? true : (stryCov_9fa48("162", "163"), error)) return reply.status(400).send(stryMutAct_9fa48("164") ? {} : (stryCov_9fa48("164"), {
          error: error.message
        }));
        const {
          offerId,
          buyerId
        } = body;
        const tradeId = uuidv4();
        const selectQuery = stryMutAct_9fa48("165") ? "" : (stryCov_9fa48("165"), 'SELECT * FROM offers WHERE id=?');
        detectAnomaly(selectQuery, stryMutAct_9fa48("166") ? [] : (stryCov_9fa48("166"), [offerId]), stryMutAct_9fa48("167") ? {} : (stryCov_9fa48("167"), {
          userId: buyerId,
          ip: req.ip
        }));
        const [rows]: any = await getDbPool().execute(selectQuery, stryMutAct_9fa48("168") ? [] : (stryCov_9fa48("168"), [offerId]));
        const offer = rows[0];
        const fee = stryMutAct_9fa48("169") ? offer.btc_amount / 0.005 : (stryCov_9fa48("169"), offer.btc_amount * 0.005);
        const insertQuery = stryMutAct_9fa48("170") ? "" : (stryCov_9fa48("170"), 'INSERT INTO trades (id, offer_id, buyer_id, seller_id, btc_locked, fee, status) VALUES (?, ?, ?, ?, ?, ?, ?)');
        const insertParams = stryMutAct_9fa48("171") ? [] : (stryCov_9fa48("171"), [tradeId, offerId, buyerId, offer.user_id, offer.btc_amount, fee, stryMutAct_9fa48("172") ? "" : (stryCov_9fa48("172"), 'FUNDED')]);
        detectAnomaly(insertQuery, insertParams, stryMutAct_9fa48("173") ? {} : (stryCov_9fa48("173"), {
          userId: buyerId,
          ip: req.ip
        }));
        await getDbPool().execute(insertQuery, insertParams);
        const updateOfferQuery = stryMutAct_9fa48("174") ? "" : (stryCov_9fa48("174"), 'UPDATE offers SET status="ACCEPTED" WHERE id=?');
        detectAnomaly(updateOfferQuery, stryMutAct_9fa48("175") ? [] : (stryCov_9fa48("175"), [offerId]), stryMutAct_9fa48("176") ? {} : (stryCov_9fa48("176"), {
          userId: buyerId,
          ip: req.ip
        }));
        await getDbPool().execute(updateOfferQuery, stryMutAct_9fa48("177") ? [] : (stryCov_9fa48("177"), [offerId]));
        auditLog.logOperation(stryMutAct_9fa48("178") ? {} : (stryCov_9fa48("178"), {
          action: stryMutAct_9fa48("179") ? "" : (stryCov_9fa48("179"), 'trade_accept'),
          offerId,
          buyerId,
          sellerId: offer.user_id,
          btcLocked: offer.btc_amount,
          fee,
          tradeId,
          ip: req.ip,
          timestamp: new Date().toISOString()
        }));
        return stryMutAct_9fa48("180") ? {} : (stryCov_9fa48("180"), {
          tradeId
        });
      }
    });
    fastify.post(stryMutAct_9fa48("181") ? "" : (stryCov_9fa48("181"), '/api/trade/confirm'), async (req, reply) => {
      if (stryMutAct_9fa48("182")) {
        {}
      } else {
        stryCov_9fa48("182");
        let body = req.body as any;
        body = sanitizeObject(body);
        const {
          error
        } = validateTradeConfirmInput(body);
        if (stryMutAct_9fa48("184") ? false : stryMutAct_9fa48("183") ? true : (stryCov_9fa48("183", "184"), error)) return reply.status(400).send(stryMutAct_9fa48("185") ? {} : (stryCov_9fa48("185"), {
          error: error.message
        }));
        const {
          tradeId
        } = body;
        const updateTradeQuery = stryMutAct_9fa48("186") ? "" : (stryCov_9fa48("186"), 'UPDATE trades SET status="COMPLETED" WHERE id=?');
        detectAnomaly(updateTradeQuery, stryMutAct_9fa48("187") ? [] : (stryCov_9fa48("187"), [tradeId]), stryMutAct_9fa48("188") ? {} : (stryCov_9fa48("188"), {
          ip: req.ip
        }));
        await getDbPool().execute(updateTradeQuery, stryMutAct_9fa48("189") ? [] : (stryCov_9fa48("189"), [tradeId]));
        auditLog.logOperation(stryMutAct_9fa48("190") ? {} : (stryCov_9fa48("190"), {
          action: stryMutAct_9fa48("191") ? "" : (stryCov_9fa48("191"), 'trade_confirm'),
          tradeId,
          ip: req.ip,
          timestamp: new Date().toISOString()
        }));
        return stryMutAct_9fa48("192") ? {} : (stryCov_9fa48("192"), {
          success: stryMutAct_9fa48("193") ? false : (stryCov_9fa48("193"), true)
        });
      }
    });
  }
}