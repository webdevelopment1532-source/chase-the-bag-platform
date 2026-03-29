"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeStakeCodes = scrapeStakeCodes;
exports.generateSelfCode = generateSelfCode;
// Scraper for Stake.us codes and selfmade code generator
const node_fetch_1 = __importDefault(require("node-fetch"));
const cheerio = __importStar(require("cheerio"));
const db_1 = require("./db");
const audit_log_1 = require("./audit-log");
const payout_policy_1 = require("./payout-policy");
async function scrapeStakeCodes(options = {}) {
    const enforceAccess = options.enforceAccess ?? true;
    const actor = options.actor ??
        {
            userId: 'system',
            isOwner: process.env.CTB_ALLOW_SYSTEM_SCRAPER === 'true',
        };
    if (enforceAccess) {
        (0, payout_policy_1.assertAuthorizedScraper)(actor);
    }
    const res = await (0, node_fetch_1.default)('https://stake.us/');
    const html = await res.text();
    const $ = cheerio.load(html);
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
            await (0, audit_log_1.logOperation)({
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
function generateSelfCode(prefix = 'CYBER44', length = 8) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = prefix + '-';
    for (let i = 0; i < length; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}
