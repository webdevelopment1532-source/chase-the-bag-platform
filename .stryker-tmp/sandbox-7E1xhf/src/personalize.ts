// @ts-nocheck
// Personalized offers and targeted messages
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
import { getUserReward } from './advanced-commands';
export function getPersonalizedOffer(userId: string) {
  if (stryMutAct_9fa48("232")) {
    {}
  } else {
    stryCov_9fa48("232");
    const reward = getUserReward(userId);
    if (stryMutAct_9fa48("235") ? reward.tier !== 'VIP' : stryMutAct_9fa48("234") ? false : stryMutAct_9fa48("233") ? true : (stryCov_9fa48("233", "234", "235"), reward.tier === (stryMutAct_9fa48("236") ? "" : (stryCov_9fa48("236"), 'VIP')))) {
      if (stryMutAct_9fa48("237")) {
        {}
      } else {
        stryCov_9fa48("237");
        return stryMutAct_9fa48("238") ? "" : (stryCov_9fa48("238"), '🎁 VIP Bonus: You get a 10% cashback on your next game!');
      }
    } else if (stryMutAct_9fa48("241") ? reward.tier !== 'Gold' : stryMutAct_9fa48("240") ? false : stryMutAct_9fa48("239") ? true : (stryCov_9fa48("239", "240", "241"), reward.tier === (stryMutAct_9fa48("242") ? "" : (stryCov_9fa48("242"), 'Gold')))) {
      if (stryMutAct_9fa48("243")) {
        {}
      } else {
        stryCov_9fa48("243");
        return stryMutAct_9fa48("244") ? "" : (stryCov_9fa48("244"), '✨ Gold Bonus: Play 3 games this week for a $20 bonus!');
      }
    } else if (stryMutAct_9fa48("247") ? reward.tier !== 'Silver' : stryMutAct_9fa48("246") ? false : stryMutAct_9fa48("245") ? true : (stryCov_9fa48("245", "246", "247"), reward.tier === (stryMutAct_9fa48("248") ? "" : (stryCov_9fa48("248"), 'Silver')))) {
      if (stryMutAct_9fa48("249")) {
        {}
      } else {
        stryCov_9fa48("249");
        return stryMutAct_9fa48("250") ? "" : (stryCov_9fa48("250"), '💎 Silver Bonus: Refer a friend and get double points!');
      }
    } else {
      if (stryMutAct_9fa48("251")) {
        {}
      } else {
        stryCov_9fa48("251");
        return stryMutAct_9fa48("252") ? "" : (stryCov_9fa48("252"), '🚀 Play more to unlock exclusive bonuses and rewards!');
      }
    }
  }
}