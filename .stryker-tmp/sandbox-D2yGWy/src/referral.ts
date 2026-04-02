// @ts-nocheck
// Referral competition and leaderboard logic
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
export async function getReferralLeaderboard(limit = 10) {
  if (stryMutAct_9fa48("253")) {
    {}
  } else {
    stryCov_9fa48("253");
    const db = await getDbConnection();
    // Count successful affiliate invites per user
    const [rows] = await db.execute(stryMutAct_9fa48("254") ? `` : (stryCov_9fa48("254"), `
    SELECT user_id, COUNT(*) as referrals
    FROM audit_logs
    WHERE action = 'send_affiliate_link'
    GROUP BY user_id
    ORDER BY referrals DESC
    LIMIT ?
  `), stryMutAct_9fa48("255") ? [] : (stryCov_9fa48("255"), [limit]));
    return rows as any[];
  }
}
export async function getUserReferralCount(userId: string) {
  if (stryMutAct_9fa48("256")) {
    {}
  } else {
    stryCov_9fa48("256");
    const db = await getDbConnection();
    const [rows] = await db.execute(stryMutAct_9fa48("257") ? "" : (stryCov_9fa48("257"), 'SELECT COUNT(*) as count FROM audit_logs WHERE action = "send_affiliate_link" AND user_id = ?'), stryMutAct_9fa48("258") ? [] : (stryCov_9fa48("258"), [userId]));
    const row = (rows as any[])[0];
    return row.count;
  }
}