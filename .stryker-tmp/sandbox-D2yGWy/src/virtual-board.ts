// @ts-nocheck
// Virtual board for real-time code tracking
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
import { logOperation } from './audit-log';

// Optionally pass user/server for logging
export async function getVirtualBoardData(userId?: string, serverId?: string) {
  if (stryMutAct_9fa48("289")) {
    {}
  } else {
    stryCov_9fa48("289");
    const db = await getDbConnection();
    const [rows]: [any[], any] = await db.execute(stryMutAct_9fa48("290") ? "" : (stryCov_9fa48("290"), 'SELECT code, source, created_at FROM codes ORDER BY created_at DESC LIMIT 50'));
    if (stryMutAct_9fa48("293") ? userId || serverId : stryMutAct_9fa48("292") ? false : stryMutAct_9fa48("291") ? true : (stryCov_9fa48("291", "292", "293"), userId && serverId)) {
      if (stryMutAct_9fa48("294")) {
        {}
      } else {
        stryCov_9fa48("294");
        await logOperation(stryMutAct_9fa48("295") ? {} : (stryCov_9fa48("295"), {
          userId,
          serverId,
          action: stryMutAct_9fa48("296") ? "" : (stryCov_9fa48("296"), 'view_virtual_board'),
          details: stryMutAct_9fa48("297") ? `` : (stryCov_9fa48("297"), `Viewed ${(rows as any[]).length} codes`)
        }));
      }
    }
    return rows;
  }
}