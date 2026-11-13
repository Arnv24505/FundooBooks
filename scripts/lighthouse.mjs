#!/usr/bin/env node
/**
 * Lighthouse audit for the storefront.
 *
 * Usage:
 *   npm run lighthouse
 *   LIGHTHOUSE_URL=http://localhost:3000/books npm run lighthouse
 *
 * Start the app first (`npm run dev` or `npm run build && npm start`).
 * Requires Google Chrome or Chromium to be installed.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";

const url = process.env.LIGHTHOUSE_URL ?? "http://localhost:3000";
const outputDir = process.env.LIGHTHOUSE_OUTPUT ?? "lighthouse-report";

const chrome = await launch({
  chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"],
});

try {
  const result = await lighthouse(
    url,
    { port: chrome.port, output: "json", logLevel: "error" },
    {
      extends: "lighthouse:default",
      settings: {
        onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
        formFactor: "desktop",
        screenEmulation: { mobile: false, width: 1366, height: 900, deviceScaleFactor: 1 },
        // Lighthouse's desktop preset: 40 ms RTT, 10 Mbps, no CPU slowdown.
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0,
        },
        throttlingMethod: "simulate",
      },
    }
  );

  if (!result) throw new Error("Lighthouse returned no result");

  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });
  const host = new URL(url).hostname;
  const file = join(outputDir, `${host}-${Date.now()}.json`);
  writeFileSync(file, result.report);

  const scores = Object.fromEntries(
    Object.entries(result.lhr.categories).map(([key, category]) => [
      key,
      Math.round((category.score ?? 0) * 100),
    ])
  );

  console.log(`Lighthouse report for ${url}`);
  console.table(scores);
  console.log(`Full JSON report written to ${file}`);

  const failing = Object.entries(scores).filter(([, score]) => score < 80);
  if (failing.length > 0) {
    console.warn(
      `Some categories scored below 80: ${failing.map(([key]) => key).join(", ")}`
    );
  }
} finally {
  await chrome.kill();
}
