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
const attackPattern = stryMutAct_9fa48("619") ? /('|--|;|<script|\bselect\b|\bdrop\b|\bdelete\b|\binsert\b|\bupdate\b|\bexec\b|\bunion\b|\balert\b|\btruncate\b|\bxp_cmdshell\b|\\x[^0-9a-f]{2}|"|\*|\||\$|\{|\}|\[|\]|\(|\)|#)/i : stryMutAct_9fa48("618") ? /('|--|;|<script|\bselect\b|\bdrop\b|\bdelete\b|\binsert\b|\bupdate\b|\bexec\b|\bunion\b|\balert\b|\btruncate\b|\bxp_cmdshell\b|\\x[0-9a-f]|"|\*|\||\$|\{|\}|\[|\]|\(|\)|#)/i : (stryCov_9fa48("618", "619"), /('|--|;|<script|\bselect\b|\bdrop\b|\bdelete\b|\binsert\b|\bupdate\b|\bexec\b|\bunion\b|\balert\b|\btruncate\b|\bxp_cmdshell\b|\\x[0-9a-f]{2}|"|\*|\||\$|\{|\}|\[|\]|\(|\)|#)/i);
export function validateListUserTransactionsInput(userId: string, days: number): void {
  if (stryMutAct_9fa48("620")) {
    {}
  } else {
    stryCov_9fa48("620");
    if (stryMutAct_9fa48("623") ? (typeof userId !== 'string' || userId.trim().length === 0 || attackPattern.test(userId) || typeof days !== 'number' || !Number.isFinite(days) || isNaN(days)) && days <= 1e-6 : stryMutAct_9fa48("622") ? false : stryMutAct_9fa48("621") ? true : (stryCov_9fa48("621", "622", "623"), (stryMutAct_9fa48("625") ? (typeof userId !== 'string' || userId.trim().length === 0 || attackPattern.test(userId) || typeof days !== 'number' || !Number.isFinite(days)) && isNaN(days) : stryMutAct_9fa48("624") ? false : (stryCov_9fa48("624", "625"), (stryMutAct_9fa48("627") ? (typeof userId !== 'string' || userId.trim().length === 0 || attackPattern.test(userId) || typeof days !== 'number') && !Number.isFinite(days) : stryMutAct_9fa48("626") ? false : (stryCov_9fa48("626", "627"), (stryMutAct_9fa48("629") ? (typeof userId !== 'string' || userId.trim().length === 0 || attackPattern.test(userId)) && typeof days !== 'number' : stryMutAct_9fa48("628") ? false : (stryCov_9fa48("628", "629"), (stryMutAct_9fa48("631") ? (typeof userId !== 'string' || userId.trim().length === 0) && attackPattern.test(userId) : stryMutAct_9fa48("630") ? false : (stryCov_9fa48("630", "631"), (stryMutAct_9fa48("633") ? typeof userId !== 'string' && userId.trim().length === 0 : stryMutAct_9fa48("632") ? false : (stryCov_9fa48("632", "633"), (stryMutAct_9fa48("635") ? typeof userId === 'string' : stryMutAct_9fa48("634") ? false : (stryCov_9fa48("634", "635"), typeof userId !== (stryMutAct_9fa48("636") ? "" : (stryCov_9fa48("636"), 'string')))) || (stryMutAct_9fa48("638") ? userId.trim().length !== 0 : stryMutAct_9fa48("637") ? false : (stryCov_9fa48("637", "638"), (stryMutAct_9fa48("639") ? userId.length : (stryCov_9fa48("639"), userId.trim().length)) === 0)))) || attackPattern.test(userId))) || (stryMutAct_9fa48("641") ? typeof days === 'number' : stryMutAct_9fa48("640") ? false : (stryCov_9fa48("640", "641"), typeof days !== (stryMutAct_9fa48("642") ? "" : (stryCov_9fa48("642"), 'number')))))) || (stryMutAct_9fa48("643") ? Number.isFinite(days) : (stryCov_9fa48("643"), !Number.isFinite(days))))) || isNaN(days))) || (stryMutAct_9fa48("646") ? days > 1e-6 : stryMutAct_9fa48("645") ? days < 1e-6 : stryMutAct_9fa48("644") ? false : (stryCov_9fa48("644", "645", "646"), days <= 1e-6)))) {
      if (stryMutAct_9fa48("647")) {
        {}
      } else {
        stryCov_9fa48("647");
        throw new Error(stryMutAct_9fa48("648") ? "" : (stryCov_9fa48("648"), 'Invalid transaction query input'));
      }
    }
  }
}