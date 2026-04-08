// @ts-nocheck
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
const attackPattern = stryMutAct_9fa48("650") ? /('|--|;|<script|\bselect\b|\bdrop\b|\bdelete\b|\binsert\b|\bupdate\b|\bexec\b|\bunion\b|\balert\b|\btruncate\b|\bxp_cmdshell\b|\\x[^0-9a-f]{2}|"|\*|\||\$|\{|\}|\[|\]|\(|\)|#)/i : stryMutAct_9fa48("649") ? /('|--|;|<script|\bselect\b|\bdrop\b|\bdelete\b|\binsert\b|\bupdate\b|\bexec\b|\bunion\b|\balert\b|\btruncate\b|\bxp_cmdshell\b|\\x[0-9a-f]|"|\*|\||\$|\{|\}|\[|\]|\(|\)|#)/i : (stryCov_9fa48("649", "650"), /('|--|;|<script|\bselect\b|\bdrop\b|\bdelete\b|\binsert\b|\bupdate\b|\bexec\b|\bunion\b|\balert\b|\btruncate\b|\bxp_cmdshell\b|\\x[0-9a-f]{2}|"|\*|\||\$|\{|\}|\[|\]|\(|\)|#)/i);
export function validateGetCoinWalletInput(opts: any): void {
  if (stryMutAct_9fa48("651")) {
    {}
  } else {
    stryCov_9fa48("651");
    if (stryMutAct_9fa48("654") ? (!opts || typeof opts.userId !== 'string' || opts.userId.trim().length === 0) && attackPattern.test(opts.userId) : stryMutAct_9fa48("653") ? false : stryMutAct_9fa48("652") ? true : (stryCov_9fa48("652", "653", "654"), (stryMutAct_9fa48("656") ? (!opts || typeof opts.userId !== 'string') && opts.userId.trim().length === 0 : stryMutAct_9fa48("655") ? false : (stryCov_9fa48("655", "656"), (stryMutAct_9fa48("658") ? !opts && typeof opts.userId !== 'string' : stryMutAct_9fa48("657") ? false : (stryCov_9fa48("657", "658"), (stryMutAct_9fa48("659") ? opts : (stryCov_9fa48("659"), !opts)) || (stryMutAct_9fa48("661") ? typeof opts.userId === 'string' : stryMutAct_9fa48("660") ? false : (stryCov_9fa48("660", "661"), typeof opts.userId !== (stryMutAct_9fa48("662") ? "" : (stryCov_9fa48("662"), 'string')))))) || (stryMutAct_9fa48("664") ? opts.userId.trim().length !== 0 : stryMutAct_9fa48("663") ? false : (stryCov_9fa48("663", "664"), (stryMutAct_9fa48("665") ? opts.userId.length : (stryCov_9fa48("665"), opts.userId.trim().length)) === 0)))) || attackPattern.test(opts.userId))) {
      if (stryMutAct_9fa48("666")) {
        {}
      } else {
        stryCov_9fa48("666");
        throw new Error(stryMutAct_9fa48("667") ? "" : (stryCov_9fa48("667"), 'Invalid wallet input'));
      }
    }
  }
}