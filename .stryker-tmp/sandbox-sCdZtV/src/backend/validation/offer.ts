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
import Joi from 'joi';
const offerSchema = Joi.object(stryMutAct_9fa48("347") ? {} : (stryCov_9fa48("347"), {
  userId: stryMutAct_9fa48("349") ? Joi.string().max(1).max(64).pattern(/^[a-zA-Z0-9_\-]+$/).required().messages({
    'string.pattern.base': 'userId contains invalid characters'
  }) : stryMutAct_9fa48("348") ? Joi.string().min(1).min(64).pattern(/^[a-zA-Z0-9_\-]+$/).required().messages({
    'string.pattern.base': 'userId contains invalid characters'
  }) : (stryCov_9fa48("348", "349"), Joi.string().min(1).max(64).pattern(stryMutAct_9fa48("353") ? /^[^a-zA-Z0-9_\-]+$/ : stryMutAct_9fa48("352") ? /^[a-zA-Z0-9_\-]$/ : stryMutAct_9fa48("351") ? /^[a-zA-Z0-9_\-]+/ : stryMutAct_9fa48("350") ? /[a-zA-Z0-9_\-]+$/ : (stryCov_9fa48("350", "351", "352", "353"), /^[a-zA-Z0-9_\-]+$/)).required().messages(stryMutAct_9fa48("354") ? {} : (stryCov_9fa48("354"), {
    'string.pattern.base': stryMutAct_9fa48("355") ? "" : (stryCov_9fa48("355"), 'userId contains invalid characters')
  }))),
  btcAmount: Joi.number().positive().required(),
  usdAmount: Joi.number().positive().required()
}));
export function validateOfferInput(input: any) {
  if (stryMutAct_9fa48("356")) {
    {}
  } else {
    stryCov_9fa48("356");
    return offerSchema.validate(input);
  }
}