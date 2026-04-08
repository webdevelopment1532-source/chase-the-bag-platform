// Automated A/B test reporting for popup variants
// Run on a schedule (e.g., daily via cron or CI)
const fs = require("fs");
const path = require("path");

// Simulate reading analytics logs (replace with DB or real log source)
const LOG_PATH = path.join(__dirname, "../logs/popup-events.json");

function loadEvents() {
  if (!fs.existsSync(LOG_PATH)) return [];
  return JSON.parse(fs.readFileSync(LOG_PATH, "utf8"));
}

function summarize(events) {
  const summary = {
    A: { impressions: 0, clicks: 0, dismissals: 0 },
    B: { impressions: 0, clicks: 0, dismissals: 0 },
  };
  for (const e of events) {
    if (!e.variant || !summary[e.variant]) continue;
    if (e.event === "impression") summary[e.variant].impressions++;
    if (e.event === "click") summary[e.variant].clicks++;
    if (e.event === "dismiss") summary[e.variant].dismissals++;
  }
  return summary;
}

function report(summary) {
  const lines = [
    "A/B Test Report: Popup Variants",
    "--------------------------------",
    `Variant A: ${summary.A.impressions} impressions, ${summary.A.clicks} clicks, ${summary.A.dismissals} dismissals`,
    `Variant B: ${summary.B.impressions} impressions, ${summary.B.clicks} clicks, ${summary.B.dismissals} dismissals`,
    "",
    `CTR A: ${summary.A.impressions ? ((100 * summary.A.clicks) / summary.A.impressions).toFixed(2) : "0"}%`,
    `CTR B: ${summary.B.impressions ? ((100 * summary.B.clicks) / summary.B.impressions).toFixed(2) : "0"}%`,
  ];
  fs.writeFileSync(
    path.join(__dirname, "../reports/ab-report.txt"),
    lines.join("\n"),
  );
  console.log(lines.join("\n"));
}

function main() {
  const events = loadEvents();
  const summary = summarize(events);
  report(summary);
}

if (require.main === module) main();
