// @ts-nocheck
// Anti-fraud and compliance monitoring
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
export async function checkFraudulentActivity(userId: string): Promise<string[]> {
  if (stryMutAct_9fa48("6")) {
    {}
  } else {
    stryCov_9fa48("6");
    const db = await getDbConnection();
    const alerts: string[] = stryMutAct_9fa48("7") ? ["Stryker was here"] : (stryCov_9fa48("7"), []);

    // Example: Too many referrals in a short time
    const [refRows]: [any[], any] = await db.execute(stryMutAct_9fa48("8") ? `` : (stryCov_9fa48("8"), `SELECT COUNT(*) as count FROM audit_logs WHERE user_id = ? AND action = 'send_affiliate_link' AND created_at > NOW() - INTERVAL 1 HOUR`), stryMutAct_9fa48("9") ? [] : (stryCov_9fa48("9"), [userId]));
    if (stryMutAct_9fa48("13") ? refRows[0]?.count <= 5 : stryMutAct_9fa48("12") ? refRows[0]?.count >= 5 : stryMutAct_9fa48("11") ? false : stryMutAct_9fa48("10") ? true : (stryCov_9fa48("10", "11", "12", "13"), (stryMutAct_9fa48("14") ? refRows[0].count : (stryCov_9fa48("14"), refRows[0]?.count)) > 5)) {
      if (stryMutAct_9fa48("15")) {
        {}
      } else {
        stryCov_9fa48("15");
        alerts.push(stryMutAct_9fa48("16") ? "" : (stryCov_9fa48("16"), 'High referral activity detected (possible abuse)'));
      }
    }

    // Example: Too many codes generated
    const [codeRows]: [any[], any] = await db.execute(stryMutAct_9fa48("17") ? `` : (stryCov_9fa48("17"), `SELECT COUNT(*) as count FROM audit_logs WHERE user_id = ? AND action = 'generate_self_code' AND created_at > NOW() - INTERVAL 1 HOUR`), stryMutAct_9fa48("18") ? [] : (stryCov_9fa48("18"), [userId]));
    if (stryMutAct_9fa48("22") ? codeRows[0]?.count <= 10 : stryMutAct_9fa48("21") ? codeRows[0]?.count >= 10 : stryMutAct_9fa48("20") ? false : stryMutAct_9fa48("19") ? true : (stryCov_9fa48("19", "20", "21", "22"), (stryMutAct_9fa48("23") ? codeRows[0].count : (stryCov_9fa48("23"), codeRows[0]?.count)) > 10)) {
      if (stryMutAct_9fa48("24")) {
        {}
      } else {
        stryCov_9fa48("24");
        alerts.push(stryMutAct_9fa48("25") ? "" : (stryCov_9fa48("25"), 'Excessive code generation detected'));
      }
    }
    return alerts;
  }
}