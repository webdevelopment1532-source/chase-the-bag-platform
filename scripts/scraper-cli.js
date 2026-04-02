#!/usr/bin/env node

/**
 * Scraper CLI - Run Stake.us code scraper locally or via API
 * Usage:
 *   node scripts/scraper-cli.js                 # Run once
 *   node scripts/scraper-cli.js --watch         # Run every 6 hours
 *   node scripts/scraper-cli.js --interval 3600 # Run every 3600s (1 hour)
 */

const fs = require('fs');
const path = require('path');

// Load environment
require('dotenv').config();

// Import scraper
const { scrapeStakeCodes, generateSelfCode } = require('../dist/scraper');

const args = new Set(process.argv.slice(2));
const watchMode = args.has('--watch');
const intervalArg = Array.from(args).find((arg) => arg.startsWith('--interval='));
const customInterval = intervalArg ? parseInt(intervalArg.split('=')[1]) * 1000 : null;

const DEFAULT_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours

async function runScraper() {
  console.log(`[${new Date().toISOString()}] Starting Stake.us code scraper...`);
  try {
    const codes = await scrapeStakeCodes();
    console.log(`[${new Date().toISOString()}] ✅ Scraper completed: ${codes.length} codes found`);
    if (codes.length > 0) {
      console.log(`   Sample codes: ${codes.slice(0, 3).join(', ')}`);
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Scraper failed:`, error.message);
  }
}

async function main() {
  // Run once
  await runScraper();

  // Watch mode - run periodically
  if (watchMode || customInterval) {
    const interval = customInterval || DEFAULT_INTERVAL;
    const intervalHours = (interval / (60 * 60 * 1000)).toFixed(1);
    console.log(`\n📡 Watch mode enabled - running every ${intervalHours} hours`);
    console.log('Press Ctrl+C to stop\n');

    setInterval(runScraper, interval);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
