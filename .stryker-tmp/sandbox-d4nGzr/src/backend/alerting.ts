// @ts-nocheck
// src/backend/alerting.ts
// Real-time alerting hook for security/audit events
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
import axios from 'axios';
const ALERT_WEBHOOK_URL = stryMutAct_9fa48("35") ? process.env.ALERT_WEBHOOK_URL && 'https://your-alerting-webhook-url' : stryMutAct_9fa48("34") ? false : stryMutAct_9fa48("33") ? true : (stryCov_9fa48("33", "34", "35"), process.env.ALERT_WEBHOOK_URL || (stryMutAct_9fa48("36") ? "" : (stryCov_9fa48("36"), 'https://your-alerting-webhook-url')));
export async function sendSecurityAlert(event: {
  action: string;
  userId?: string;
  ip?: string;
  timestamp?: string;
  [key: string]: any;
}) {
  if (stryMutAct_9fa48("37")) {
    {}
  } else {
    stryCov_9fa48("37");
    try {
      if (stryMutAct_9fa48("38")) {
        {}
      } else {
        stryCov_9fa48("38");
        await axios.post(ALERT_WEBHOOK_URL, stryMutAct_9fa48("39") ? {} : (stryCov_9fa48("39"), {
          text: stryMutAct_9fa48("40") ? `` : (stryCov_9fa48("40"), `[SECURITY ALERT] ${event.action} for user ${event.userId} from IP ${event.ip} at ${event.timestamp}`),
          event
        }));
      }
    } catch (err) {
      if (stryMutAct_9fa48("41")) {
        {}
      } else {
        stryCov_9fa48("41");
        // Log locally if alerting fails
         
        console.error(stryMutAct_9fa48("42") ? "" : (stryCov_9fa48("42"), 'Failed to send security alert'), err);
      }
    }
  }
}

// CommonJS compatibility for Jest tests
module.exports = stryMutAct_9fa48("43") ? {} : (stryCov_9fa48("43"), {
  sendSecurityAlert
});