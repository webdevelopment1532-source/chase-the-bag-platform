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
import { getDbPool } from '../backend/db/index';
import * as auditLog from '../audit-log';
import { validateGrantCoinsInput } from '../validation/coin.validation';
import { GrantCoinsOptions, GrantCoinsResult } from '../types/coin.types';
export async function grantCoins(opts: GrantCoinsOptions): Promise<GrantCoinsResult> {
  if (stryMutAct_9fa48("407")) {
    {}
  } else {
    stryCov_9fa48("407");
    validateGrantCoinsInput(opts);
    const {
      actorUserId,
      targetUserId,
      amount,
      serverId,
      details
    } = opts;
    const userId = stryMutAct_9fa48("408") ? `` : (stryCov_9fa48("408"), `${serverId}:${targetUserId}`);
    const actorId = stryMutAct_9fa48("409") ? `` : (stryCov_9fa48("409"), `${serverId}:${actorUserId}`);
    const conn = await getDbPool().getConnection();
    try {
      if (stryMutAct_9fa48("410")) {
        {}
      } else {
        stryCov_9fa48("410");
        await conn.beginTransaction();
        await conn.execute(stryMutAct_9fa48("411") ? "" : (stryCov_9fa48("411"), 'INSERT IGNORE INTO coin_wallets (user_id, available_balance, locked_balance) VALUES (?, 0, 0)'), stryMutAct_9fa48("412") ? [] : (stryCov_9fa48("412"), [userId]));
        const [rows] = await conn.execute(stryMutAct_9fa48("413") ? "" : (stryCov_9fa48("413"), 'SELECT available_balance, locked_balance FROM coin_wallets WHERE user_id=?'), stryMutAct_9fa48("414") ? [] : (stryCov_9fa48("414"), [userId]));
        const walletRow = (stryMutAct_9fa48("417") ? Array.isArray(rows) && rows.length > 0 || 'available_balance' in rows[0] : stryMutAct_9fa48("416") ? false : stryMutAct_9fa48("415") ? true : (stryCov_9fa48("415", "416", "417"), (stryMutAct_9fa48("419") ? Array.isArray(rows) || rows.length > 0 : stryMutAct_9fa48("418") ? true : (stryCov_9fa48("418", "419"), Array.isArray(rows) && (stryMutAct_9fa48("422") ? rows.length <= 0 : stryMutAct_9fa48("421") ? rows.length >= 0 : stryMutAct_9fa48("420") ? true : (stryCov_9fa48("420", "421", "422"), rows.length > 0)))) && (stryMutAct_9fa48("423") ? "" : (stryCov_9fa48("423"), 'available_balance')) in rows[0])) ? rows[0] : stryMutAct_9fa48("424") ? {} : (stryCov_9fa48("424"), {
          available_balance: 0,
          locked_balance: 0
        });
        const newAvailable = stryMutAct_9fa48("425") ? Number(walletRow.available_balance) - amount : (stryCov_9fa48("425"), Number(walletRow.available_balance) + amount);
        await conn.execute(stryMutAct_9fa48("426") ? "" : (stryCov_9fa48("426"), 'UPDATE coin_wallets SET available_balance=? WHERE user_id=?'), stryMutAct_9fa48("427") ? [] : (stryCov_9fa48("427"), [newAvailable, userId]));
        await conn.execute(stryMutAct_9fa48("428") ? "" : (stryCov_9fa48("428"), 'INSERT INTO coin_transactions (user_id, direction, kind, amount, balance_after, details, actor_user_id) VALUES (?, ?, ?, ?, ?, ?, ?)'), stryMutAct_9fa48("429") ? [] : (stryCov_9fa48("429"), [userId, stryMutAct_9fa48("430") ? "" : (stryCov_9fa48("430"), 'credit'), stryMutAct_9fa48("431") ? "" : (stryCov_9fa48("431"), 'grant'), amount, newAvailable, stryMutAct_9fa48("434") ? details && '' : stryMutAct_9fa48("433") ? false : stryMutAct_9fa48("432") ? true : (stryCov_9fa48("432", "433", "434"), details || (stryMutAct_9fa48("435") ? "Stryker was here!" : (stryCov_9fa48("435"), ''))), actorId]));
        await conn.commit();
        auditLog.logOperation(stryMutAct_9fa48("436") ? {} : (stryCov_9fa48("436"), {
          type: stryMutAct_9fa48("437") ? "" : (stryCov_9fa48("437"), 'grantCoins'),
          actorUserId,
          targetUserId,
          amount,
          serverId,
          details,
          newAvailable
        }));
        return stryMutAct_9fa48("438") ? {} : (stryCov_9fa48("438"), {
          userId,
          availableBalance: newAvailable,
          lockedBalance: Number(walletRow.locked_balance),
          totalBalance: stryMutAct_9fa48("439") ? newAvailable - Number(walletRow.locked_balance) : (stryCov_9fa48("439"), newAvailable + Number(walletRow.locked_balance))
        });
      }
    } catch (err) {
      if (stryMutAct_9fa48("440")) {
        {}
      } else {
        stryCov_9fa48("440");
        await conn.rollback();
        throw err;
      }
    } finally {
      if (stryMutAct_9fa48("441")) {
        {}
      } else {
        stryCov_9fa48("441");
        if (stryMutAct_9fa48("444") ? typeof conn.end !== 'function' : stryMutAct_9fa48("443") ? false : stryMutAct_9fa48("442") ? true : (stryCov_9fa48("442", "443", "444"), typeof conn.end === (stryMutAct_9fa48("445") ? "" : (stryCov_9fa48("445"), 'function')))) {
          if (stryMutAct_9fa48("446")) {
            {}
          } else {
            stryCov_9fa48("446");
            await conn.end();
          }
        }
        if (stryMutAct_9fa48("449") ? typeof global.mockEnd !== 'function' : stryMutAct_9fa48("448") ? false : stryMutAct_9fa48("447") ? true : (stryCov_9fa48("447", "448", "449"), typeof global.mockEnd === (stryMutAct_9fa48("450") ? "" : (stryCov_9fa48("450"), 'function')))) global.mockEnd();
      }
    }
  }
}