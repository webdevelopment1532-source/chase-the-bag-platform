// @ts-nocheck
// 
// Stubs for compatibility with legacy tests
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
import * as auditLog from './audit-log';
export async function transferCoins(opts: any) {
  if (stryMutAct_9fa48("386")) {
    {}
  } else {
    stryCov_9fa48("386");
    auditLog.logOperation();
    // TODO: Implement or migrate to service
    return {};
  }
}
export async function getCoinExchangeOverview() {
  if (stryMutAct_9fa48("387")) {
    {}
  } else {
    stryCov_9fa48("387");
    // TODO: Implement or migrate to service
    return {};
  }
}
declare global {
   
  var mockEnd: (() => void) | undefined;
}
// Stubs for all required coin-exchange exports for test compatibility
export function parseCoinAmount(input: any): number | null {
  if (stryMutAct_9fa48("388")) {
    {}
  } else {
    stryCov_9fa48("388");
    if (stryMutAct_9fa48("391") ? typeof input !== 'string' || typeof input !== 'number' : stryMutAct_9fa48("390") ? false : stryMutAct_9fa48("389") ? true : (stryCov_9fa48("389", "390", "391"), (stryMutAct_9fa48("393") ? typeof input === 'string' : stryMutAct_9fa48("392") ? true : (stryCov_9fa48("392", "393"), typeof input !== (stryMutAct_9fa48("394") ? "" : (stryCov_9fa48("394"), 'string')))) && (stryMutAct_9fa48("396") ? typeof input === 'number' : stryMutAct_9fa48("395") ? true : (stryCov_9fa48("395", "396"), typeof input !== (stryMutAct_9fa48("397") ? "" : (stryCov_9fa48("397"), 'number')))))) return null;
    const n = Number(input);
    if (stryMutAct_9fa48("400") ? !Number.isFinite(n) && n <= 0 : stryMutAct_9fa48("399") ? false : stryMutAct_9fa48("398") ? true : (stryCov_9fa48("398", "399", "400"), (stryMutAct_9fa48("401") ? Number.isFinite(n) : (stryCov_9fa48("401"), !Number.isFinite(n))) || (stryMutAct_9fa48("404") ? n > 0 : stryMutAct_9fa48("403") ? n < 0 : stryMutAct_9fa48("402") ? false : (stryCov_9fa48("402", "403", "404"), n <= 0)))) return null;
    return stryMutAct_9fa48("405") ? Math.round(n * 100) * 100 : (stryCov_9fa48("405"), Math.round(stryMutAct_9fa48("406") ? n / 100 : (stryCov_9fa48("406"), n * 100)) / 100);
  }
}
import { grantCoins } from './services/coin.service';
import { createExchangeOffer, acceptExchangeOffer, cancelExchangeOffer, listUserOffers } from './services/offer.service';
import { listUserTransactions } from './services/transaction.service';
import { getCoinWallet, listCoinWallets } from './services/wallet.service';

// Re-export service functions for compatibility
export { grantCoins };
export { createExchangeOffer, acceptExchangeOffer, cancelExchangeOffer, listUserOffers };
export { listUserTransactions };
export { getCoinWallet, listCoinWallets };