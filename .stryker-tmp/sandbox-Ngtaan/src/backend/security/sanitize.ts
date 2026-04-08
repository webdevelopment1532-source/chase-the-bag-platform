// @ts-nocheck
// Centralized input sanitization for all user input
// Prevents XSS, SQLi, and injection attacks
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
import xss from 'xss';
export function sanitizeString(str: string): string {
  if (stryMutAct_9fa48("222")) {
    {}
  } else {
    stryCov_9fa48("222");
    return xss(stryMutAct_9fa48("223") ? str : (stryCov_9fa48("223"), str.trim()));
  }
}
export function sanitizeNumber(n: any): number {
  if (stryMutAct_9fa48("224")) {
    {}
  } else {
    stryCov_9fa48("224");
    const num = Number(n);
    if (stryMutAct_9fa48("226") ? false : stryMutAct_9fa48("225") ? true : (stryCov_9fa48("225", "226"), isNaN(num))) throw new Error(stryMutAct_9fa48("227") ? "" : (stryCov_9fa48("227"), 'Invalid number input'));
    return num;
  }
}
export function sanitizeObject(obj: Record<string, any>): Record<string, any> {
  if (stryMutAct_9fa48("228")) {
    {}
  } else {
    stryCov_9fa48("228");
    const sanitized: Record<string, any> = {};
    for (const key in obj) {
      if (stryMutAct_9fa48("229")) {
        {}
      } else {
        stryCov_9fa48("229");
        if (stryMutAct_9fa48("232") ? typeof obj[key] !== 'string' : stryMutAct_9fa48("231") ? false : stryMutAct_9fa48("230") ? true : (stryCov_9fa48("230", "231", "232"), typeof obj[key] === (stryMutAct_9fa48("233") ? "" : (stryCov_9fa48("233"), 'string')))) {
          if (stryMutAct_9fa48("234")) {
            {}
          } else {
            stryCov_9fa48("234");
            // Try to convert to number if possible
            const num = Number(obj[key]);
            if (stryMutAct_9fa48("237") ? !isNaN(num) || obj[key].trim() !== '' : stryMutAct_9fa48("236") ? false : stryMutAct_9fa48("235") ? true : (stryCov_9fa48("235", "236", "237"), (stryMutAct_9fa48("238") ? isNaN(num) : (stryCov_9fa48("238"), !isNaN(num))) && (stryMutAct_9fa48("240") ? obj[key].trim() === '' : stryMutAct_9fa48("239") ? true : (stryCov_9fa48("239", "240"), (stryMutAct_9fa48("241") ? obj[key] : (stryCov_9fa48("241"), obj[key].trim())) !== (stryMutAct_9fa48("242") ? "Stryker was here!" : (stryCov_9fa48("242"), '')))))) {
              if (stryMutAct_9fa48("243")) {
                {}
              } else {
                stryCov_9fa48("243");
                sanitized[key] = sanitizeNumber(obj[key]);
              }
            } else {
              if (stryMutAct_9fa48("244")) {
                {}
              } else {
                stryCov_9fa48("244");
                sanitized[key] = sanitizeString(obj[key]);
              }
            }
          }
        } else if (stryMutAct_9fa48("247") ? typeof obj[key] !== 'number' : stryMutAct_9fa48("246") ? false : stryMutAct_9fa48("245") ? true : (stryCov_9fa48("245", "246", "247"), typeof obj[key] === (stryMutAct_9fa48("248") ? "" : (stryCov_9fa48("248"), 'number')))) {
          if (stryMutAct_9fa48("249")) {
            {}
          } else {
            stryCov_9fa48("249");
            sanitized[key] = sanitizeNumber(obj[key]);
          }
        } else {
          if (stryMutAct_9fa48("250")) {
            {}
          } else {
            stryCov_9fa48("250");
            sanitized[key] = obj[key];
          }
        }
      }
    }
    return sanitized;
  }
}