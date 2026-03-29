// Scraper for Stake.us codes and selfmade code generator
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { getDbConnection } from './db';
import { logOperation } from './audit-log';
import { assertAuthorizedScraper, type ParticipationContext } from './payout-policy';

interface ScrapeOptions {
  actor?: ParticipationContext;
  enforceAccess?: boolean;
}

export async function scrapeStakeCodes(options: ScrapeOptions = {}) {
  const enforceAccess = options.enforceAccess ?? true;
  const actor: ParticipationContext =
    options.actor ??
    {
      userId: 'system',
      isOwner: process.env.CTB_ALLOW_SYSTEM_SCRAPER === 'true',
    };

  if (enforceAccess) {
    assertAuthorizedScraper(actor);
  }

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
      await logOperation({
        userId: actor.userId,
        serverId: 'system',
        action: 'scrape_code',
        details: `Scraped code: ${code}`,
      });
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
