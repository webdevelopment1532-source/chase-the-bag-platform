// @ts-nocheck
// Stub for audit-log used in tests
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
export function logOperation(...args: any[]) {
  if (stryMutAct_9fa48("0")) {
    {}
  } else {
    stryCov_9fa48("0");
    // If no arguments, log a unique message. This is intentional for mutation testing.
    if (stryMutAct_9fa48("3") ? arguments.length !== 0 : stryMutAct_9fa48("2") ? false : stryMutAct_9fa48("1") ? true : (stryCov_9fa48("1", "2", "3"), arguments.length === 0)) {
      if (stryMutAct_9fa48("4")) {
        {}
      } else {
        stryCov_9fa48("4");
        // This string must be unique and not trivially mutated.
        console.log(stryMutAct_9fa48("5") ? "" : (stryCov_9fa48("5"), '[AUDIT] (no arguments provided)'));
        return;
      }
    }
    // If called with a single argument that is null or undefined, log as [null] or [undefined]
    if (stryMutAct_9fa48("8") ? arguments.length === 1 || args[0] === null || args[0] === undefined : stryMutAct_9fa48("7") ? false : stryMutAct_9fa48("6") ? true : (stryCov_9fa48("6", "7", "8"), (stryMutAct_9fa48("10") ? arguments.length !== 1 : stryMutAct_9fa48("9") ? true : (stryCov_9fa48("9", "10"), arguments.length === 1)) && (stryMutAct_9fa48("12") ? args[0] === null && args[0] === undefined : stryMutAct_9fa48("11") ? true : (stryCov_9fa48("11", "12"), (stryMutAct_9fa48("14") ? args[0] !== null : stryMutAct_9fa48("13") ? false : (stryCov_9fa48("13", "14"), args[0] === null)) || (stryMutAct_9fa48("16") ? args[0] !== undefined : stryMutAct_9fa48("15") ? false : (stryCov_9fa48("15", "16"), args[0] === undefined)))))) {
      if (stryMutAct_9fa48("17")) {
        {}
      } else {
        stryCov_9fa48("17");
        console.log(stryMutAct_9fa48("18") ? "" : (stryCov_9fa48("18"), '[AUDIT]'), stryMutAct_9fa48("19") ? [] : (stryCov_9fa48("19"), [args[0]]));
        return;
      }
    }
    // If called with a single argument that is an array, log as [AUDIT] (array) ...args[0]
    if (stryMutAct_9fa48("22") ? arguments.length === 1 || Array.isArray(args[0]) : stryMutAct_9fa48("21") ? false : stryMutAct_9fa48("20") ? true : (stryCov_9fa48("20", "21", "22"), (stryMutAct_9fa48("24") ? arguments.length !== 1 : stryMutAct_9fa48("23") ? true : (stryCov_9fa48("23", "24"), arguments.length === 1)) && Array.isArray(args[0]))) {
      if (stryMutAct_9fa48("25")) {
        {}
      } else {
        stryCov_9fa48("25");
        console.log(stryMutAct_9fa48("26") ? "" : (stryCov_9fa48("26"), '[AUDIT] (array)'), ...args[0]);
        return;
      }
    }
    // If called with a single argument (object, string, etc), log as [AUDIT], arg
    if (stryMutAct_9fa48("29") ? arguments.length !== 1 : stryMutAct_9fa48("28") ? false : stryMutAct_9fa48("27") ? true : (stryCov_9fa48("27", "28", "29"), arguments.length === 1)) {
      if (stryMutAct_9fa48("30")) {
        {}
      } else {
        stryCov_9fa48("30");
        console.log(stryMutAct_9fa48("31") ? "" : (stryCov_9fa48("31"), '[AUDIT]'), args[0]);
        return;
      }
    }
    // If called with multiple arguments, spread them
    console.log(stryMutAct_9fa48("32") ? "" : (stryCov_9fa48("32"), '[AUDIT]'), ...args);
  }
}