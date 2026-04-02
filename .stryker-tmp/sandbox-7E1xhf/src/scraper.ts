// @ts-nocheck
// Scraper for Stake.us codes and selfmade code generator
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
import * as cheerio from 'cheerio';
import { getDbConnection } from './db';
import { logOperation } from './audit-log';
export async function scrapeStakeCodes() {
  if (stryMutAct_9fa48("259")) {
    {}
  } else {
    stryCov_9fa48("259");
    const res = await fetch(stryMutAct_9fa48("260") ? "" : (stryCov_9fa48("260"), 'https://stake.us/'));
    const html = await res.text();
    const $ = cheerio.load(html);
    const codes: string[] = stryMutAct_9fa48("261") ? ["Stryker was here"] : (stryCov_9fa48("261"), []);
    // Example: look for codes in elements with class 'promo-code' (update selector as needed)
    $(stryMutAct_9fa48("262") ? "" : (stryCov_9fa48("262"), '.promo-code')).each((_, el) => {
      if (stryMutAct_9fa48("263")) {
        {}
      } else {
        stryCov_9fa48("263");
        codes.push(stryMutAct_9fa48("264") ? $(el).text() : (stryCov_9fa48("264"), $(el).text().trim()));
      }
    });
    // Store codes in DB
    if (stryMutAct_9fa48("266") ? false : stryMutAct_9fa48("265") ? true : (stryCov_9fa48("265", "266"), codes.length)) {
      if (stryMutAct_9fa48("267")) {
        {}
      } else {
        stryCov_9fa48("267");
        const db = await getDbConnection();
        for (const code of codes) {
          if (stryMutAct_9fa48("268")) {
            {}
          } else {
            stryCov_9fa48("268");
            await db.execute(stryMutAct_9fa48("269") ? "" : (stryCov_9fa48("269"), 'INSERT IGNORE INTO codes (code, source) VALUES (?, ?)'), stryMutAct_9fa48("270") ? [] : (stryCov_9fa48("270"), [code, stryMutAct_9fa48("271") ? "" : (stryCov_9fa48("271"), 'stake.us')]));
            // Log code scrape operation (no user/server context, so use 'system')
            await logOperation(stryMutAct_9fa48("272") ? {} : (stryCov_9fa48("272"), {
              userId: stryMutAct_9fa48("273") ? "" : (stryCov_9fa48("273"), 'system'),
              serverId: stryMutAct_9fa48("274") ? "" : (stryCov_9fa48("274"), 'system'),
              action: stryMutAct_9fa48("275") ? "" : (stryCov_9fa48("275"), 'scrape_code'),
              details: stryMutAct_9fa48("276") ? `` : (stryCov_9fa48("276"), `Scraped code: ${code}`)
            }));
          }
        }
      }
    }
    return codes;
  }
}

// Selfmade code generator
export function generateSelfCode(prefix = stryMutAct_9fa48("277") ? "" : (stryCov_9fa48("277"), 'CYBER44'), length = 8) {
  if (stryMutAct_9fa48("278")) {
    {}
  } else {
    stryCov_9fa48("278");
    const chars = stryMutAct_9fa48("279") ? "" : (stryCov_9fa48("279"), 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789');
    let code = prefix + (stryMutAct_9fa48("280") ? "" : (stryCov_9fa48("280"), '-'));
    for (let i = 0; stryMutAct_9fa48("283") ? i >= length : stryMutAct_9fa48("282") ? i <= length : stryMutAct_9fa48("281") ? false : (stryCov_9fa48("281", "282", "283"), i < length); stryMutAct_9fa48("284") ? i-- : (stryCov_9fa48("284"), i++)) {
      if (stryMutAct_9fa48("285")) {
        {}
      } else {
        stryCov_9fa48("285");
        stryMutAct_9fa48("286") ? code -= chars.charAt(Math.floor(Math.random() * chars.length)) : (stryCov_9fa48("286"), code += stryMutAct_9fa48("287") ? chars : (stryCov_9fa48("287"), chars.charAt(Math.floor(stryMutAct_9fa48("288") ? Math.random() / chars.length : (stryCov_9fa48("288"), Math.random() * chars.length)))));
      }
    }
    return code;
  }
}