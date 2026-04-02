// @ts-nocheck
// Audit log for all payout, code, and user operations
// Only logs actions for users and Discord servers on this bot
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
import { getDbConnection } from './db';
export async function logOperation({
  userId,
  serverId,
  action,
  details
}: {
  userId: string;
  serverId: string;
  action: string;
  details?: string;
}) {
  if (stryMutAct_9fa48("26")) {
    {}
  } else {
    stryCov_9fa48("26");
    const db = await getDbConnection();
    try {
      if (stryMutAct_9fa48("27")) {
        {}
      } else {
        stryCov_9fa48("27");
        await db.execute(stryMutAct_9fa48("28") ? "" : (stryCov_9fa48("28"), 'INSERT INTO audit_logs (user_id, server_id, action, details) VALUES (?, ?, ?, ?)'), stryMutAct_9fa48("29") ? [] : (stryCov_9fa48("29"), [userId, serverId, action, stryMutAct_9fa48("32") ? details && null : stryMutAct_9fa48("31") ? false : stryMutAct_9fa48("30") ? true : (stryCov_9fa48("30", "31", "32"), details || null)]));
      }
    } finally {
      if (stryMutAct_9fa48("33")) {
        {}
      } else {
        stryCov_9fa48("33");
        await db.end();
      }
    }
  }
}

// Example usage:
// await logOperation({ userId: message.author.id, serverId: message.guild.id, action: 'payout', details: 'Paid $10 to user' });