// @ts-nocheck
// MySQL database connection setup
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
import mysql from 'mysql2/promise';
function getDbEnv(name: 'HOST' | 'PORT' | 'USER' | 'PASS' | 'NAME') {
  if (stryMutAct_9fa48("42")) {
    {}
  } else {
    stryCov_9fa48("42");
    return stryMutAct_9fa48("43") ? process.env[`DISCORD_GAME_DB_${name}`] && process.env[`DB_${name}`] : (stryCov_9fa48("43"), process.env[stryMutAct_9fa48("44") ? `` : (stryCov_9fa48("44"), `DISCORD_GAME_DB_${name}`)] ?? process.env[stryMutAct_9fa48("45") ? `` : (stryCov_9fa48("45"), `DB_${name}`)]);
  }
}
export async function getDbConnection() {
  if (stryMutAct_9fa48("46")) {
    {}
  } else {
    stryCov_9fa48("46");
    const requiredVars = ['HOST', 'USER', 'NAME'] as const;
    const missingVars = stryMutAct_9fa48("47") ? requiredVars : (stryCov_9fa48("47"), requiredVars.filter(stryMutAct_9fa48("48") ? () => undefined : (stryCov_9fa48("48"), name => stryMutAct_9fa48("49") ? getDbEnv(name) : (stryCov_9fa48("49"), !getDbEnv(name)))));
    if (stryMutAct_9fa48("53") ? missingVars.length <= 0 : stryMutAct_9fa48("52") ? missingVars.length >= 0 : stryMutAct_9fa48("51") ? false : stryMutAct_9fa48("50") ? true : (stryCov_9fa48("50", "51", "52", "53"), missingVars.length > 0)) {
      if (stryMutAct_9fa48("54")) {
        {}
      } else {
        stryCov_9fa48("54");
        throw new Error(stryMutAct_9fa48("55") ? `` : (stryCov_9fa48("55"), `Missing database environment variables: ${missingVars.map(stryMutAct_9fa48("56") ? () => undefined : (stryCov_9fa48("56"), name => stryMutAct_9fa48("57") ? `` : (stryCov_9fa48("57"), `DISCORD_GAME_DB_${name}`))).join(stryMutAct_9fa48("58") ? "" : (stryCov_9fa48("58"), ', '))}`));
      }
    }
    return mysql.createConnection(stryMutAct_9fa48("59") ? {} : (stryCov_9fa48("59"), {
      host: getDbEnv(stryMutAct_9fa48("60") ? "" : (stryCov_9fa48("60"), 'HOST')),
      port: getDbEnv(stryMutAct_9fa48("61") ? "" : (stryCov_9fa48("61"), 'PORT')) ? Number(getDbEnv(stryMutAct_9fa48("62") ? "" : (stryCov_9fa48("62"), 'PORT'))) : 3306,
      user: getDbEnv(stryMutAct_9fa48("63") ? "" : (stryCov_9fa48("63"), 'USER')),
      password: getDbEnv(stryMutAct_9fa48("64") ? "" : (stryCov_9fa48("64"), 'PASS')),
      database: getDbEnv(stryMutAct_9fa48("65") ? "" : (stryCov_9fa48("65"), 'NAME'))
    }));
  }
}