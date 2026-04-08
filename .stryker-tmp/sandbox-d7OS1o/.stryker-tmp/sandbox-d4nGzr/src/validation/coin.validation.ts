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
import { GrantCoinsOptions } from '../types/coin.types';
const attackPattern = stryMutAct_9fa48("476") ? /('|--|;|<script|\bselect\b|\bdrop\b|\bdelete\b|\binsert\b|\bupdate\b|\bexec\b|\bunion\b|\balert\b|\btruncate\b|\bxp_cmdshell\b|\\x[^0-9a-f]{2}|"|\*|\||\$|\{|\}|\[|\]|\(|\)|#)/i : stryMutAct_9fa48("475") ? /('|--|;|<script|\bselect\b|\bdrop\b|\bdelete\b|\binsert\b|\bupdate\b|\bexec\b|\bunion\b|\balert\b|\btruncate\b|\bxp_cmdshell\b|\\x[0-9a-f]|"|\*|\||\$|\{|\}|\[|\]|\(|\)|#)/i : (stryCov_9fa48("475", "476"), /('|--|;|<script|\bselect\b|\bdrop\b|\bdelete\b|\binsert\b|\bupdate\b|\bexec\b|\bunion\b|\balert\b|\btruncate\b|\bxp_cmdshell\b|\\x[0-9a-f]{2}|"|\*|\||\$|\{|\}|\[|\]|\(|\)|#)/i);
export function validateGrantCoinsInput(opts: GrantCoinsOptions): void {
  if (stryMutAct_9fa48("477")) {
    {}
  } else {
    stryCov_9fa48("477");
    const {
      actorUserId,
      targetUserId,
      amount,
      serverId
    } = opts;
    for (const field of stryMutAct_9fa48("478") ? [] : (stryCov_9fa48("478"), [actorUserId, targetUserId, serverId])) {
      if (stryMutAct_9fa48("479")) {
        {}
      } else {
        stryCov_9fa48("479");
        if (stryMutAct_9fa48("482") ? (typeof field !== 'string' || field.trim().length === 0) && attackPattern.test(field) : stryMutAct_9fa48("481") ? false : stryMutAct_9fa48("480") ? true : (stryCov_9fa48("480", "481", "482"), (stryMutAct_9fa48("484") ? typeof field !== 'string' && field.trim().length === 0 : stryMutAct_9fa48("483") ? false : (stryCov_9fa48("483", "484"), (stryMutAct_9fa48("486") ? typeof field === 'string' : stryMutAct_9fa48("485") ? false : (stryCov_9fa48("485", "486"), typeof field !== (stryMutAct_9fa48("487") ? "" : (stryCov_9fa48("487"), 'string')))) || (stryMutAct_9fa48("489") ? field.trim().length !== 0 : stryMutAct_9fa48("488") ? false : (stryCov_9fa48("488", "489"), (stryMutAct_9fa48("490") ? field.length : (stryCov_9fa48("490"), field.trim().length)) === 0)))) || attackPattern.test(field))) {
          if (stryMutAct_9fa48("491")) {
            {}
          } else {
            stryCov_9fa48("491");
            throw new Error(stryMutAct_9fa48("492") ? "" : (stryCov_9fa48("492"), 'Missing or malicious user/server info'));
          }
        }
      }
    }
    if (stryMutAct_9fa48("495") ? (typeof amount !== 'number' || isNaN(amount) || !Number.isFinite(amount)) && amount <= 1e-6 : stryMutAct_9fa48("494") ? false : stryMutAct_9fa48("493") ? true : (stryCov_9fa48("493", "494", "495"), (stryMutAct_9fa48("497") ? (typeof amount !== 'number' || isNaN(amount)) && !Number.isFinite(amount) : stryMutAct_9fa48("496") ? false : (stryCov_9fa48("496", "497"), (stryMutAct_9fa48("499") ? typeof amount !== 'number' && isNaN(amount) : stryMutAct_9fa48("498") ? false : (stryCov_9fa48("498", "499"), (stryMutAct_9fa48("501") ? typeof amount === 'number' : stryMutAct_9fa48("500") ? false : (stryCov_9fa48("500", "501"), typeof amount !== (stryMutAct_9fa48("502") ? "" : (stryCov_9fa48("502"), 'number')))) || isNaN(amount))) || (stryMutAct_9fa48("503") ? Number.isFinite(amount) : (stryCov_9fa48("503"), !Number.isFinite(amount))))) || (stryMutAct_9fa48("506") ? amount > 1e-6 : stryMutAct_9fa48("505") ? amount < 1e-6 : stryMutAct_9fa48("504") ? false : (stryCov_9fa48("504", "505", "506"), amount <= 1e-6)))) throw new Error(stryMutAct_9fa48("507") ? "" : (stryCov_9fa48("507"), 'Invalid amount'));
  }
}