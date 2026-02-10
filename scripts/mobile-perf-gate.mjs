import fs from "node:fs/promises";

const reportPath = process.argv[2];
if (!reportPath) {
  console.error("Usage: node scripts/mobile-perf-gate.mjs <lighthouse-report.json>");
  process.exit(1);
}

const MIN_SCORES = {
  performance: 0.7,
  pwa: 0.8,
  accessibility: 0.85,
  "best-practices": 0.85,
};

const report = JSON.parse(await fs.readFile(reportPath, "utf8"));
const categories = report.categories ?? {};

let failed = false;
for (const [key, minScore] of Object.entries(MIN_SCORES)) {
  const actual = categories[key]?.score;
  if (typeof actual !== "number") {
    console.error(`[perf] Missing category in report: ${key}`);
    failed = true;
    continue;
  }

  const pct = Math.round(actual * 100);
  const thresholdPct = Math.round(minScore * 100);
  const status = actual >= minScore ? "PASS" : "FAIL";
  console.log(`[perf] ${status} ${key}: ${pct} (min ${thresholdPct})`);

  if (actual < minScore) {
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}
