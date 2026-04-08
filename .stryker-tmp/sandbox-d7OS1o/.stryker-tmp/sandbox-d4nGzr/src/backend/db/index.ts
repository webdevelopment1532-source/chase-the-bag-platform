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
import mysql, { Pool } from 'mysql2/promise';
import 'dotenv/config';
export interface DbConfig {
  host: string;
  user: string;
  password?: string;
  database: string;
  port: number;
  charset: string;
  ssl: {
    rejectUnauthorized: boolean;
  };
  waitForConnections: boolean;
  connectionLimit: number;
  queueLimit: number;
}
export function getDbConfig(): DbConfig {
  if (stryMutAct_9fa48("44")) {
    {}
  } else {
    stryCov_9fa48("44");
    const env = process.env;
    const host = stryMutAct_9fa48("47") ? env.DISCORD_GAME_DB_HOST && env.DB_HOST : stryMutAct_9fa48("46") ? false : stryMutAct_9fa48("45") ? true : (stryCov_9fa48("45", "46", "47"), env.DISCORD_GAME_DB_HOST || env.DB_HOST);
    const user = stryMutAct_9fa48("50") ? env.DISCORD_GAME_DB_USER && env.DB_USER : stryMutAct_9fa48("49") ? false : stryMutAct_9fa48("48") ? true : (stryCov_9fa48("48", "49", "50"), env.DISCORD_GAME_DB_USER || env.DB_USER);
    const password = stryMutAct_9fa48("53") ? env.DISCORD_GAME_DB_PASS && env.DB_PASS : stryMutAct_9fa48("52") ? false : stryMutAct_9fa48("51") ? true : (stryCov_9fa48("51", "52", "53"), env.DISCORD_GAME_DB_PASS || env.DB_PASS);
    const database = stryMutAct_9fa48("56") ? env.DISCORD_GAME_DB_NAME && env.DB_NAME : stryMutAct_9fa48("55") ? false : stryMutAct_9fa48("54") ? true : (stryCov_9fa48("54", "55", "56"), env.DISCORD_GAME_DB_NAME || env.DB_NAME);
    let port = Number(stryMutAct_9fa48("59") ? (env.DISCORD_GAME_DB_PORT || env.DB_PORT) && 3306 : stryMutAct_9fa48("58") ? false : stryMutAct_9fa48("57") ? true : (stryCov_9fa48("57", "58", "59"), (stryMutAct_9fa48("61") ? env.DISCORD_GAME_DB_PORT && env.DB_PORT : stryMutAct_9fa48("60") ? false : (stryCov_9fa48("60", "61"), env.DISCORD_GAME_DB_PORT || env.DB_PORT)) || 3306));
    if (stryMutAct_9fa48("63") ? false : stryMutAct_9fa48("62") ? true : (stryCov_9fa48("62", "63"), isNaN(port))) port = 3306;
    if (stryMutAct_9fa48("66") ? (!host || !user) && !database : stryMutAct_9fa48("65") ? false : stryMutAct_9fa48("64") ? true : (stryCov_9fa48("64", "65", "66"), (stryMutAct_9fa48("68") ? !host && !user : stryMutAct_9fa48("67") ? false : (stryCov_9fa48("67", "68"), (stryMutAct_9fa48("69") ? host : (stryCov_9fa48("69"), !host)) || (stryMutAct_9fa48("70") ? user : (stryCov_9fa48("70"), !user)))) || (stryMutAct_9fa48("71") ? database : (stryCov_9fa48("71"), !database)))) {
      if (stryMutAct_9fa48("72")) {
        {}
      } else {
        stryCov_9fa48("72");
        throw new Error(stryMutAct_9fa48("73") ? "" : (stryCov_9fa48("73"), 'Missing required DB environment variables. Set DISCORD_GAME_DB_* or DB_*'));
      }
    }
    return stryMutAct_9fa48("74") ? {} : (stryCov_9fa48("74"), {
      host,
      user,
      password: (stryMutAct_9fa48("77") ? typeof password === 'string' || password.length > 0 : stryMutAct_9fa48("76") ? false : stryMutAct_9fa48("75") ? true : (stryCov_9fa48("75", "76", "77"), (stryMutAct_9fa48("79") ? typeof password !== 'string' : stryMutAct_9fa48("78") ? true : (stryCov_9fa48("78", "79"), typeof password === (stryMutAct_9fa48("80") ? "" : (stryCov_9fa48("80"), 'string')))) && (stryMutAct_9fa48("83") ? password.length <= 0 : stryMutAct_9fa48("82") ? password.length >= 0 : stryMutAct_9fa48("81") ? true : (stryCov_9fa48("81", "82", "83"), password.length > 0)))) ? password : undefined,
      database,
      port,
      charset: stryMutAct_9fa48("84") ? "" : (stryCov_9fa48("84"), 'utf8mb4'),
      ssl: stryMutAct_9fa48("85") ? {} : (stryCov_9fa48("85"), {
        rejectUnauthorized: stryMutAct_9fa48("86") ? true : (stryCov_9fa48("86"), false)
      }),
      waitForConnections: stryMutAct_9fa48("87") ? false : (stryCov_9fa48("87"), true),
      connectionLimit: 10,
      queueLimit: 0
    });
  }
}
let pool: Pool | null = null;
export function getDbPool(): Pool {
  if (stryMutAct_9fa48("88")) {
    {}
  } else {
    stryCov_9fa48("88");
    if (stryMutAct_9fa48("91") ? false : stryMutAct_9fa48("90") ? true : stryMutAct_9fa48("89") ? pool : (stryCov_9fa48("89", "90", "91"), !pool)) {
      if (stryMutAct_9fa48("92")) {
        {}
      } else {
        stryCov_9fa48("92");
        pool = mysql.createPool(getDbConfig());
      }
    }
    return pool;
  }
}

// TEST-ONLY: Reset the pool singleton for unit/mutation tests
export function __resetPoolForTest() {
  if (stryMutAct_9fa48("93")) {
    {}
  } else {
    stryCov_9fa48("93");
    pool = null;
  }
}

// No import-time pool creation or db export!
// Only create pools/connections when explicitly called in code or tests.

export async function getDbConnection() {
  if (stryMutAct_9fa48("94")) {
    {}
  } else {
    stryCov_9fa48("94");
    const env = process.env;
    let port = Number(stryMutAct_9fa48("97") ? (env.DISCORD_GAME_DB_PORT || env.DB_PORT) && 3306 : stryMutAct_9fa48("96") ? false : stryMutAct_9fa48("95") ? true : (stryCov_9fa48("95", "96", "97"), (stryMutAct_9fa48("99") ? env.DISCORD_GAME_DB_PORT && env.DB_PORT : stryMutAct_9fa48("98") ? false : (stryCov_9fa48("98", "99"), env.DISCORD_GAME_DB_PORT || env.DB_PORT)) || 3306));
    if (stryMutAct_9fa48("101") ? false : stryMutAct_9fa48("100") ? true : (stryCov_9fa48("100", "101"), isNaN(port))) port = 3306;
    const host = stryMutAct_9fa48("104") ? env.DISCORD_GAME_DB_HOST && env.DB_HOST : stryMutAct_9fa48("103") ? false : stryMutAct_9fa48("102") ? true : (stryCov_9fa48("102", "103", "104"), env.DISCORD_GAME_DB_HOST || env.DB_HOST);
    const user = stryMutAct_9fa48("107") ? env.DISCORD_GAME_DB_USER && env.DB_USER : stryMutAct_9fa48("106") ? false : stryMutAct_9fa48("105") ? true : (stryCov_9fa48("105", "106", "107"), env.DISCORD_GAME_DB_USER || env.DB_USER);
    const password = stryMutAct_9fa48("110") ? env.DISCORD_GAME_DB_PASS && env.DB_PASS : stryMutAct_9fa48("109") ? false : stryMutAct_9fa48("108") ? true : (stryCov_9fa48("108", "109", "110"), env.DISCORD_GAME_DB_PASS || env.DB_PASS);
    const database = stryMutAct_9fa48("113") ? env.DISCORD_GAME_DB_NAME && env.DB_NAME : stryMutAct_9fa48("112") ? false : stryMutAct_9fa48("111") ? true : (stryCov_9fa48("111", "112", "113"), env.DISCORD_GAME_DB_NAME || env.DB_NAME);
    if (stryMutAct_9fa48("116") ? (!host || !user) && !database : stryMutAct_9fa48("115") ? false : stryMutAct_9fa48("114") ? true : (stryCov_9fa48("114", "115", "116"), (stryMutAct_9fa48("118") ? !host && !user : stryMutAct_9fa48("117") ? false : (stryCov_9fa48("117", "118"), (stryMutAct_9fa48("119") ? host : (stryCov_9fa48("119"), !host)) || (stryMutAct_9fa48("120") ? user : (stryCov_9fa48("120"), !user)))) || (stryMutAct_9fa48("121") ? database : (stryCov_9fa48("121"), !database)))) {
      if (stryMutAct_9fa48("122")) {
        {}
      } else {
        stryCov_9fa48("122");
        throw new Error(stryMutAct_9fa48("123") ? "" : (stryCov_9fa48("123"), 'Missing database environment variables: DISCORD_GAME_DB_HOST, DISCORD_GAME_DB_USER, DISCORD_GAME_DB_NAME'));
      }
    }
    return await require('mysql2/promise').createConnection(stryMutAct_9fa48("124") ? {} : (stryCov_9fa48("124"), {
      host,
      port,
      user,
      password: (stryMutAct_9fa48("127") ? typeof password === 'string' || password.length > 0 : stryMutAct_9fa48("126") ? false : stryMutAct_9fa48("125") ? true : (stryCov_9fa48("125", "126", "127"), (stryMutAct_9fa48("129") ? typeof password !== 'string' : stryMutAct_9fa48("128") ? true : (stryCov_9fa48("128", "129"), typeof password === (stryMutAct_9fa48("130") ? "" : (stryCov_9fa48("130"), 'string')))) && (stryMutAct_9fa48("133") ? password.length <= 0 : stryMutAct_9fa48("132") ? password.length >= 0 : stryMutAct_9fa48("131") ? true : (stryCov_9fa48("131", "132", "133"), password.length > 0)))) ? password : undefined,
      database,
      charset: stryMutAct_9fa48("134") ? "" : (stryCov_9fa48("134"), 'utf8mb4'),
      ssl: stryMutAct_9fa48("135") ? {} : (stryCov_9fa48("135"), {
        rejectUnauthorized: stryMutAct_9fa48("136") ? true : (stryCov_9fa48("136"), false)
      })
    }));
  }
}