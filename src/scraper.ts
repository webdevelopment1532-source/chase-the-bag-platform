// Scraper for Stake.us codes and selfmade code generator
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { getDbConnection } from './db';
import { logOperation } from './audit-log';

export async function scrapeStakeCodes() {
  const res = await fetch('https://stake.us/');
  const html = await res.text();
  const $ = cheerio.load(html);
  const codes: string[] = [];
  // Example: look for codes in elements with class 'promo-code' (update selector as needed)
  $('.promo-code').each((_, el) => {
    codes.push($(el).text().trim());
  });
  // Store codes in DB
  if (codes.length) {
    const db = await getDbConnection();
    for (const code of codes) {
      await db.execute('INSERT IGNORE INTO codes (code, source) VALUES (?, ?)', [code, 'stake.us']);
      // Log code scrape operation (no user/server context, so use 'system')
      await logOperation({ userId: 'system', serverId: 'system', action: 'scrape_code', details: `Scraped code: ${code}` });
    }
  }
  return codes;
}

// Selfmade code generator
export function generateSelfCode(prefix = 'CYBER44', length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = prefix + '-';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
