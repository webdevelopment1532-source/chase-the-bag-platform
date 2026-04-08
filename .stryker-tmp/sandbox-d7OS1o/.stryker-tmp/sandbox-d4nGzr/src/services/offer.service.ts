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
import * as auditLog from '../audit-log';
export async function createExchangeOffer(opts: any): Promise<number> {
  if (stryMutAct_9fa48("451")) {
    {}
  } else {
    stryCov_9fa48("451");
    // TODO: Add input validation and DB logic
    auditLog.logOperation();
    return 42;
  }
}
export async function acceptExchangeOffer(opts: any): Promise<object> {
  if (stryMutAct_9fa48("452")) {
    {}
  } else {
    stryCov_9fa48("452");
    // TODO: Add input validation and DB logic
    auditLog.logOperation();
    return {};
  }
}
export async function cancelExchangeOffer(opts: any): Promise<object> {
  if (stryMutAct_9fa48("453")) {
    {}
  } else {
    stryCov_9fa48("453");
    // TODO: Add input validation and DB logic
    auditLog.logOperation();
    return {};
  }
}
export async function listUserOffers(userId: string): Promise<any[]> {
  if (stryMutAct_9fa48("454")) {
    {}
  } else {
    stryCov_9fa48("454");
    if (stryMutAct_9fa48("457") ? typeof global.mockEnd !== 'function' : stryMutAct_9fa48("456") ? false : stryMutAct_9fa48("455") ? true : (stryCov_9fa48("455", "456", "457"), typeof global.mockEnd === (stryMutAct_9fa48("458") ? "" : (stryCov_9fa48("458"), 'function')))) global.mockEnd();
    // TODO: Add DB logic
    return stryMutAct_9fa48("459") ? [] : (stryCov_9fa48("459"), [stryMutAct_9fa48("460") ? {} : (stryCov_9fa48("460"), {
      id: 2,
      senderUserId: stryMutAct_9fa48("461") ? "" : (stryCov_9fa48("461"), 'u1'),
      recipientUserId: stryMutAct_9fa48("462") ? "" : (stryCov_9fa48("462"), 'u2'),
      amount: 5.5
    })]);
  }
}