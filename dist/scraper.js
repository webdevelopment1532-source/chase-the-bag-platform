"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeStakeCodes = scrapeStakeCodes;
exports.generateSelfCode = generateSelfCode;
// Scraper for Stake.us codes and selfmade code generator
const node_fetch_1 = __importDefault(require("node-fetch"));
const cheerio_1 = __importDefault(require("cheerio"));
const db_1 = require("./db");
const audit_log_1 = require("./audit-log");
async function scrapeStakeCodes() {
    const res = await (0, node_fetch_1.default)('https://stake.us/');
    const html = await res.text();
    const $ = cheerio_1.default.load(html);
    const codes = [];
    // Example: look for codes in elements with class 'promo-code' (update selector as needed)
    $('.promo-code').each((_, el) => {
        codes.push($(el).text().trim());
    });
    // Store codes in DB
    if (codes.length) {
        const db = await (0, db_1.getDbConnection)();
        for (const code of codes) {
            await db.execute('INSERT IGNORE INTO codes (code, source) VALUES (?, ?)', [code, 'stake.us']);
            // Log code scrape operation (no user/server context, so use 'system')
            await (0, audit_log_1.logOperation)({ userId: 'system', serverId: 'system', action: 'scrape_code', details: `Scraped code: ${code}` });
        }
    }
    return codes;
}
// Selfmade code generator
function generateSelfCode(prefix = 'CYBER44', length = 8) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = prefix + '-';
    for (let i = 0; i < length; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}
