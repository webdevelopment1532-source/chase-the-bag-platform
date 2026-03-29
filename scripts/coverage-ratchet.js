#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const summaryPath = path.join(rootDir, 'coverage', 'coverage-summary.json');
const baselinePath = path.join(rootDir, 'scripts', 'coverage-baseline.json');
const fileBaselinePath = path.join(rootDir, 'scripts', 'coverage-baseline-files.json');
const updateBaseline = process.argv.includes('--update-baseline');
const strictMode = process.env.COVERAGE_STRICT === '1';

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function fail(message) {
  console.error(`\nCoverage ratchet failed: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(summaryPath)) {
  fail(`coverage summary not found at ${summaryPath}. Run \"npm run test:coverage\" first.`);
}

const summary = readJson(summaryPath);
if (!summary.total) {
  fail('coverage summary is missing global totals.');
}

function normalizeFileKey(fileKey) {
  if (path.isAbsolute(fileKey)) {
    return path.relative(rootDir, fileKey).split(path.sep).join('/');
  }
  return fileKey.split(path.sep).join('/');
}

function extractCoverageMetrics(entry) {
  return {
    statement: round2(entry.statements.pct),
    branch: round2(entry.branches.pct),
    function: round2(entry.functions.pct),
    line: round2(entry.lines.pct),
  };
}

const current = {
  statement: round2(summary.total.statements.pct),
  branch: round2(summary.total.branches.pct),
  function: round2(summary.total.functions.pct),
  line: round2(summary.total.lines.pct),
};

const currentByFile = {};
for (const [key, value] of Object.entries(summary)) {
  if (key === 'total') continue;
  currentByFile[normalizeFileKey(key)] = extractCoverageMetrics(value);
}

if (updateBaseline) {
  const globalPayload = {
    ...current,
    updatedAt: new Date().toISOString().slice(0, 10),
  };

  const filePayload = {
    updatedAt: new Date().toISOString().slice(0, 10),
    files: currentByFile,
  };

  fs.writeFileSync(baselinePath, JSON.stringify(globalPayload, null, 2) + '\n', 'utf8');
  fs.writeFileSync(fileBaselinePath, JSON.stringify(filePayload, null, 2) + '\n', 'utf8');
  console.log('Coverage baseline updated:', globalPayload);
  console.log(`File coverage baseline updated for ${Object.keys(currentByFile).length} files.`);
  process.exit(0);
}

if (!fs.existsSync(baselinePath)) {
  fail(`baseline file not found at ${baselinePath}. Run \"npm run coverage:baseline:update\" first.`);
}

if (!fs.existsSync(fileBaselinePath)) {
  fail(`file baseline not found at ${fileBaselinePath}. Run \"npm run coverage:baseline:update\" first.`);
}

const baseline = readJson(baselinePath);
const fileBaseline = readJson(fileBaselinePath);
const keys = ['statement', 'branch', 'function', 'line'];

for (const key of keys) {
  if (typeof baseline[key] !== 'number') {
    fail(`baseline key \"${key}\" is missing or invalid in ${baselinePath}`);
  }
  if (current[key] + 0.001 < baseline[key]) {
    fail(`${key} coverage regressed. current=${current[key]} baseline=${baseline[key]}`);
  }
}

const baselineFiles = (fileBaseline && fileBaseline.files) || {};

for (const [fileName, metrics] of Object.entries(currentByFile)) {
  const baselineMetrics = baselineFiles[fileName];

  // Any new source file must start fully covered.
  if (!baselineMetrics) {
    for (const key of keys) {
      if (metrics[key] < 100) {
        fail(`new file ${fileName} must have 100% ${key} coverage. current=${metrics[key]}`);
      }
    }
    continue;
  }

  for (const key of keys) {
    if (metrics[key] + 0.001 < baselineMetrics[key]) {
      fail(`${fileName} ${key} coverage regressed. current=${metrics[key]} baseline=${baselineMetrics[key]}`);
    }
  }
}

if (strictMode) {
  for (const key of keys) {
    if (current[key] < 100) {
      fail(`strict mode requires 100% ${key} coverage. current=${current[key]}`);
    }
  }

  for (const [fileName, metrics] of Object.entries(currentByFile)) {
    for (const key of keys) {
      if (metrics[key] < 100) {
        fail(`strict mode requires 100% per file. ${fileName} ${key}=${metrics[key]}`);
      }
    }
  }
}

console.log('\nCoverage ratchet passed.');
console.log('Current:', current);
console.log('Baseline:', {
  statement: baseline.statement,
  branch: baseline.branch,
  function: baseline.function,
  line: baseline.line,
});
if (strictMode) {
  console.log('Strict mode: ON (100% enforced)');
} else {
  console.log('Strict mode: OFF (global and per-file non-regression enforced)');
}
