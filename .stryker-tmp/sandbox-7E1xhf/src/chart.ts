// @ts-nocheck
// Chart generation using QuickChart API
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
import fetch from 'node-fetch';
export async function getChartUrl(data: number[], labels: string[], title = stryMutAct_9fa48("34") ? "" : (stryCov_9fa48("34"), 'Game Stats')): Promise<string> {
  if (stryMutAct_9fa48("35")) {
    {}
  } else {
    stryCov_9fa48("35");
    const chartConfig = stryMutAct_9fa48("36") ? {} : (stryCov_9fa48("36"), {
      type: stryMutAct_9fa48("37") ? "" : (stryCov_9fa48("37"), 'bar'),
      data: stryMutAct_9fa48("38") ? {} : (stryCov_9fa48("38"), {
        labels,
        datasets: stryMutAct_9fa48("39") ? [] : (stryCov_9fa48("39"), [stryMutAct_9fa48("40") ? {} : (stryCov_9fa48("40"), {
          label: title,
          data
        })])
      })
    });
    const url = stryMutAct_9fa48("41") ? `` : (stryCov_9fa48("41"), `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}`);
    return url;
  }
}