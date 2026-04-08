// Auto-optimize popup variant based on A/B test results
// Run after ab-report.js or on a schedule
const fs = require("fs");
const path = require("path");

const REPORT_PATH = path.join(__dirname, "../../reports/ab-report.txt");
const VARIANT_PATH = path.join(__dirname, "../../frontend/popup-variant.json");

function parseCTR(line) {
  const match = line.match(/CTR (A|B): ([\d.]+)%/);
  return match ? { variant: match[1], ctr: parseFloat(match[2]) } : null;
}

function main() {
  if (!fs.existsSync(REPORT_PATH)) return;
  const lines = fs.readFileSync(REPORT_PATH, "utf8").split("\n");
  const ctrA = parseCTR(lines.find((l) => l.startsWith("CTR A")) || "");
  const ctrB = parseCTR(lines.find((l) => l.startsWith("CTR B")) || "");
  if (!ctrA || !ctrB) return;
  // Pick the better variant (higher CTR)
  const best = ctrA.ctr >= ctrB.ctr ? "A" : "B";
  fs.writeFileSync(
    VARIANT_PATH,
    JSON.stringify(
      { best, ctrA: ctrA.ctr, ctrB: ctrB.ctr, updated: Date.now() },
      null,
      2,
    ),
  );
  console.log(`Auto-optimized: Best popup variant is ${best}`);
}

if (require.main === module) main();
