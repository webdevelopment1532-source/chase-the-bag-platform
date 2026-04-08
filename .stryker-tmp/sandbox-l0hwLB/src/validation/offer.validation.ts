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
const attackPattern = stryMutAct_9fa48("509") ? /('|--|;|<script|\bselect\b|\bdrop\b|\bdelete\b|\binsert\b|\bupdate\b|\bexec\b|\bunion\b|\balert\b|\btruncate\b|\bxp_cmdshell\b|\\x[^0-9a-f]{2}|\"|\*|\||\$|\{|\}|\[|\]|\(|\))/i : stryMutAct_9fa48("508") ? /('|--|;|<script|\bselect\b|\bdrop\b|\bdelete\b|\binsert\b|\bupdate\b|\bexec\b|\bunion\b|\balert\b|\btruncate\b|\bxp_cmdshell\b|\\x[0-9a-f]|\"|\*|\||\$|\{|\}|\[|\]|\(|\))/i : (stryCov_9fa48("508", "509"), /('|--|;|<script|\bselect\b|\bdrop\b|\bdelete\b|\binsert\b|\bupdate\b|\bexec\b|\bunion\b|\balert\b|\btruncate\b|\bxp_cmdshell\b|\\x[0-9a-f]{2}|\"|\*|\||\$|\{|\}|\[|\]|\(|\))/i);
export function validateCreateOfferInput(opts: any): void {
  if (stryMutAct_9fa48("510")) {
    {}
  } else {
    stryCov_9fa48("510");
    if (stryMutAct_9fa48("513") ? (!opts || typeof opts.senderUserId !== 'string' || opts.senderUserId.trim().length === 0 || attackPattern.test(opts.senderUserId) || typeof opts.recipientUserId !== 'string' || opts.recipientUserId.trim().length === 0 || attackPattern.test(opts.recipientUserId) || typeof opts.amount !== 'number' || !Number.isFinite(opts.amount) || isNaN(opts.amount)) && opts.amount <= 1e-6 : stryMutAct_9fa48("512") ? false : stryMutAct_9fa48("511") ? true : (stryCov_9fa48("511", "512", "513"), (stryMutAct_9fa48("515") ? (!opts || typeof opts.senderUserId !== 'string' || opts.senderUserId.trim().length === 0 || attackPattern.test(opts.senderUserId) || typeof opts.recipientUserId !== 'string' || opts.recipientUserId.trim().length === 0 || attackPattern.test(opts.recipientUserId) || typeof opts.amount !== 'number' || !Number.isFinite(opts.amount)) && isNaN(opts.amount) : stryMutAct_9fa48("514") ? false : (stryCov_9fa48("514", "515"), (stryMutAct_9fa48("517") ? (!opts || typeof opts.senderUserId !== 'string' || opts.senderUserId.trim().length === 0 || attackPattern.test(opts.senderUserId) || typeof opts.recipientUserId !== 'string' || opts.recipientUserId.trim().length === 0 || attackPattern.test(opts.recipientUserId) || typeof opts.amount !== 'number') && !Number.isFinite(opts.amount) : stryMutAct_9fa48("516") ? false : (stryCov_9fa48("516", "517"), (stryMutAct_9fa48("519") ? (!opts || typeof opts.senderUserId !== 'string' || opts.senderUserId.trim().length === 0 || attackPattern.test(opts.senderUserId) || typeof opts.recipientUserId !== 'string' || opts.recipientUserId.trim().length === 0 || attackPattern.test(opts.recipientUserId)) && typeof opts.amount !== 'number' : stryMutAct_9fa48("518") ? false : (stryCov_9fa48("518", "519"), (stryMutAct_9fa48("521") ? (!opts || typeof opts.senderUserId !== 'string' || opts.senderUserId.trim().length === 0 || attackPattern.test(opts.senderUserId) || typeof opts.recipientUserId !== 'string' || opts.recipientUserId.trim().length === 0) && attackPattern.test(opts.recipientUserId) : stryMutAct_9fa48("520") ? false : (stryCov_9fa48("520", "521"), (stryMutAct_9fa48("523") ? (!opts || typeof opts.senderUserId !== 'string' || opts.senderUserId.trim().length === 0 || attackPattern.test(opts.senderUserId) || typeof opts.recipientUserId !== 'string') && opts.recipientUserId.trim().length === 0 : stryMutAct_9fa48("522") ? false : (stryCov_9fa48("522", "523"), (stryMutAct_9fa48("525") ? (!opts || typeof opts.senderUserId !== 'string' || opts.senderUserId.trim().length === 0 || attackPattern.test(opts.senderUserId)) && typeof opts.recipientUserId !== 'string' : stryMutAct_9fa48("524") ? false : (stryCov_9fa48("524", "525"), (stryMutAct_9fa48("527") ? (!opts || typeof opts.senderUserId !== 'string' || opts.senderUserId.trim().length === 0) && attackPattern.test(opts.senderUserId) : stryMutAct_9fa48("526") ? false : (stryCov_9fa48("526", "527"), (stryMutAct_9fa48("529") ? (!opts || typeof opts.senderUserId !== 'string') && opts.senderUserId.trim().length === 0 : stryMutAct_9fa48("528") ? false : (stryCov_9fa48("528", "529"), (stryMutAct_9fa48("531") ? !opts && typeof opts.senderUserId !== 'string' : stryMutAct_9fa48("530") ? false : (stryCov_9fa48("530", "531"), (stryMutAct_9fa48("532") ? opts : (stryCov_9fa48("532"), !opts)) || (stryMutAct_9fa48("534") ? typeof opts.senderUserId === 'string' : stryMutAct_9fa48("533") ? false : (stryCov_9fa48("533", "534"), typeof opts.senderUserId !== (stryMutAct_9fa48("535") ? "" : (stryCov_9fa48("535"), 'string')))))) || (stryMutAct_9fa48("537") ? opts.senderUserId.trim().length !== 0 : stryMutAct_9fa48("536") ? false : (stryCov_9fa48("536", "537"), (stryMutAct_9fa48("538") ? opts.senderUserId.length : (stryCov_9fa48("538"), opts.senderUserId.trim().length)) === 0)))) || attackPattern.test(opts.senderUserId))) || (stryMutAct_9fa48("540") ? typeof opts.recipientUserId === 'string' : stryMutAct_9fa48("539") ? false : (stryCov_9fa48("539", "540"), typeof opts.recipientUserId !== (stryMutAct_9fa48("541") ? "" : (stryCov_9fa48("541"), 'string')))))) || (stryMutAct_9fa48("543") ? opts.recipientUserId.trim().length !== 0 : stryMutAct_9fa48("542") ? false : (stryCov_9fa48("542", "543"), (stryMutAct_9fa48("544") ? opts.recipientUserId.length : (stryCov_9fa48("544"), opts.recipientUserId.trim().length)) === 0)))) || attackPattern.test(opts.recipientUserId))) || (stryMutAct_9fa48("546") ? typeof opts.amount === 'number' : stryMutAct_9fa48("545") ? false : (stryCov_9fa48("545", "546"), typeof opts.amount !== (stryMutAct_9fa48("547") ? "" : (stryCov_9fa48("547"), 'number')))))) || (stryMutAct_9fa48("548") ? Number.isFinite(opts.amount) : (stryCov_9fa48("548"), !Number.isFinite(opts.amount))))) || isNaN(opts.amount))) || (stryMutAct_9fa48("551") ? opts.amount > 1e-6 : stryMutAct_9fa48("550") ? opts.amount < 1e-6 : stryMutAct_9fa48("549") ? false : (stryCov_9fa48("549", "550", "551"), opts.amount <= 1e-6)))) {
      if (stryMutAct_9fa48("552")) {
        {}
      } else {
        stryCov_9fa48("552");
        throw new Error(stryMutAct_9fa48("553") ? "" : (stryCov_9fa48("553"), 'Invalid offer input'));
      }
    }
  }
}
export function validateAcceptOfferInput(opts: any): void {
  if (stryMutAct_9fa48("554")) {
    {}
  } else {
    stryCov_9fa48("554");
    if (stryMutAct_9fa48("557") ? (!opts || typeof opts.offerId !== 'number' || !Number.isFinite(opts.offerId) || opts.offerId <= 0 || typeof opts.userId !== 'string') && opts.userId.trim().length === 0 : stryMutAct_9fa48("556") ? false : stryMutAct_9fa48("555") ? true : (stryCov_9fa48("555", "556", "557"), (stryMutAct_9fa48("559") ? (!opts || typeof opts.offerId !== 'number' || !Number.isFinite(opts.offerId) || opts.offerId <= 0) && typeof opts.userId !== 'string' : stryMutAct_9fa48("558") ? false : (stryCov_9fa48("558", "559"), (stryMutAct_9fa48("561") ? (!opts || typeof opts.offerId !== 'number' || !Number.isFinite(opts.offerId)) && opts.offerId <= 0 : stryMutAct_9fa48("560") ? false : (stryCov_9fa48("560", "561"), (stryMutAct_9fa48("563") ? (!opts || typeof opts.offerId !== 'number') && !Number.isFinite(opts.offerId) : stryMutAct_9fa48("562") ? false : (stryCov_9fa48("562", "563"), (stryMutAct_9fa48("565") ? !opts && typeof opts.offerId !== 'number' : stryMutAct_9fa48("564") ? false : (stryCov_9fa48("564", "565"), (stryMutAct_9fa48("566") ? opts : (stryCov_9fa48("566"), !opts)) || (stryMutAct_9fa48("568") ? typeof opts.offerId === 'number' : stryMutAct_9fa48("567") ? false : (stryCov_9fa48("567", "568"), typeof opts.offerId !== (stryMutAct_9fa48("569") ? "" : (stryCov_9fa48("569"), 'number')))))) || (stryMutAct_9fa48("570") ? Number.isFinite(opts.offerId) : (stryCov_9fa48("570"), !Number.isFinite(opts.offerId))))) || (stryMutAct_9fa48("573") ? opts.offerId > 0 : stryMutAct_9fa48("572") ? opts.offerId < 0 : stryMutAct_9fa48("571") ? false : (stryCov_9fa48("571", "572", "573"), opts.offerId <= 0)))) || (stryMutAct_9fa48("575") ? typeof opts.userId === 'string' : stryMutAct_9fa48("574") ? false : (stryCov_9fa48("574", "575"), typeof opts.userId !== (stryMutAct_9fa48("576") ? "" : (stryCov_9fa48("576"), 'string')))))) || (stryMutAct_9fa48("578") ? opts.userId.trim().length !== 0 : stryMutAct_9fa48("577") ? false : (stryCov_9fa48("577", "578"), (stryMutAct_9fa48("579") ? opts.userId.length : (stryCov_9fa48("579"), opts.userId.trim().length)) === 0)))) {
      if (stryMutAct_9fa48("580")) {
        {}
      } else {
        stryCov_9fa48("580");
        throw new Error(stryMutAct_9fa48("581") ? "" : (stryCov_9fa48("581"), 'Invalid accept offer input'));
      }
    }
    if (stryMutAct_9fa48("583") ? false : stryMutAct_9fa48("582") ? true : (stryCov_9fa48("582", "583"), attackPattern.test(opts.userId))) {
      if (stryMutAct_9fa48("584")) {
        {}
      } else {
        stryCov_9fa48("584");
        throw new Error(stryMutAct_9fa48("585") ? "" : (stryCov_9fa48("585"), 'Potentially malicious input detected'));
      }
    }
  }
}
export function validateCancelOfferInput(opts: any): void {
  if (stryMutAct_9fa48("586")) {
    {}
  } else {
    stryCov_9fa48("586");
    if (stryMutAct_9fa48("589") ? (!opts || typeof opts.offerId !== 'number' || !Number.isFinite(opts.offerId) || opts.offerId <= 0 || typeof opts.userId !== 'string') && opts.userId.trim().length === 0 : stryMutAct_9fa48("588") ? false : stryMutAct_9fa48("587") ? true : (stryCov_9fa48("587", "588", "589"), (stryMutAct_9fa48("591") ? (!opts || typeof opts.offerId !== 'number' || !Number.isFinite(opts.offerId) || opts.offerId <= 0) && typeof opts.userId !== 'string' : stryMutAct_9fa48("590") ? false : (stryCov_9fa48("590", "591"), (stryMutAct_9fa48("593") ? (!opts || typeof opts.offerId !== 'number' || !Number.isFinite(opts.offerId)) && opts.offerId <= 0 : stryMutAct_9fa48("592") ? false : (stryCov_9fa48("592", "593"), (stryMutAct_9fa48("595") ? (!opts || typeof opts.offerId !== 'number') && !Number.isFinite(opts.offerId) : stryMutAct_9fa48("594") ? false : (stryCov_9fa48("594", "595"), (stryMutAct_9fa48("597") ? !opts && typeof opts.offerId !== 'number' : stryMutAct_9fa48("596") ? false : (stryCov_9fa48("596", "597"), (stryMutAct_9fa48("598") ? opts : (stryCov_9fa48("598"), !opts)) || (stryMutAct_9fa48("600") ? typeof opts.offerId === 'number' : stryMutAct_9fa48("599") ? false : (stryCov_9fa48("599", "600"), typeof opts.offerId !== (stryMutAct_9fa48("601") ? "" : (stryCov_9fa48("601"), 'number')))))) || (stryMutAct_9fa48("602") ? Number.isFinite(opts.offerId) : (stryCov_9fa48("602"), !Number.isFinite(opts.offerId))))) || (stryMutAct_9fa48("605") ? opts.offerId > 0 : stryMutAct_9fa48("604") ? opts.offerId < 0 : stryMutAct_9fa48("603") ? false : (stryCov_9fa48("603", "604", "605"), opts.offerId <= 0)))) || (stryMutAct_9fa48("607") ? typeof opts.userId === 'string' : stryMutAct_9fa48("606") ? false : (stryCov_9fa48("606", "607"), typeof opts.userId !== (stryMutAct_9fa48("608") ? "" : (stryCov_9fa48("608"), 'string')))))) || (stryMutAct_9fa48("610") ? opts.userId.trim().length !== 0 : stryMutAct_9fa48("609") ? false : (stryCov_9fa48("609", "610"), (stryMutAct_9fa48("611") ? opts.userId.length : (stryCov_9fa48("611"), opts.userId.trim().length)) === 0)))) {
      if (stryMutAct_9fa48("612")) {
        {}
      } else {
        stryCov_9fa48("612");
        throw new Error(stryMutAct_9fa48("613") ? "" : (stryCov_9fa48("613"), 'Invalid cancel offer input'));
      }
    }
    if (stryMutAct_9fa48("615") ? false : stryMutAct_9fa48("614") ? true : (stryCov_9fa48("614", "615"), attackPattern.test(opts.userId))) {
      if (stryMutAct_9fa48("616")) {
        {}
      } else {
        stryCov_9fa48("616");
        throw new Error(stryMutAct_9fa48("617") ? "" : (stryCov_9fa48("617"), 'Potentially malicious input detected'));
      }
    }
  }
}