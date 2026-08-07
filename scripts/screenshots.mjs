#!/usr/bin/env node
/**
 * Captures screenshots of the running app for design review.
 *
 * Usage:  node scripts/screenshots.mjs [baseUrl] [outDir]
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://127.0.0.1:3900";
const OUT = process.argv[3] ?? "/tmp/shots";
const EXECUTABLE =
  process.env.CHROMIUM_PATH ??
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: EXECUTABLE,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--force-color-profile=srgb"],
});

/** Desktop shots, one per theme. */
async function shoot(name, url, { theme = "light", mobile = false, full = false, before } = {}) {
  const context = await browser.newContext({
    viewport: mobile ? { width: 402, height: 874 } : { width: 1440, height: 950 },
    deviceScaleFactor: 2,
    hasTouch: mobile,
    isMobile: mobile,
    colorScheme: theme,
  });
  const page = await context.newPage();

  // next-themes reads this before first paint.
  await page.addInitScript((t) => {
    try {
      window.localStorage.setItem("theme", t);
    } catch {}
  }, theme);

  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1600);

  if (before) await before(page);

  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: full });
  console.log(`  ${path.basename(file)}  ${(fs.statSync(file).size / 1024).toFixed(0)} KB`);
  await context.close();
}

console.log(`\nCapturing from ${BASE}\n`);

await shoot("01-home-light", `${BASE}/`, { theme: "light", full: true });
await shoot("02-home-dark", `${BASE}/`, { theme: "dark", full: true });
await shoot("03-track-cpp", `${BASE}/learn/cpp`, { theme: "light", full: true });
await shoot("04-lesson-cpp", `${BASE}/learn/cpp/hello-world`, { theme: "dark" });

// Scroll a lesson down to the quiz + exercise blocks.
await shoot("05-lesson-quiz", `${BASE}/learn/cpp/variables-and-types`, {
  theme: "light",
  before: async (page) => {
    await page.evaluate(() => window.scrollTo(0, 2600));
    await page.waitForTimeout(700);
  },
});

await shoot("06-lesson-python-ml", `${BASE}/learn/python/scikit-learn-first-model`, {
  theme: "dark",
});

await shoot("07-problems", `${BASE}/problems`, { theme: "light", full: true });
await shoot("08-problem-detail", `${BASE}/problems/water-rationing`, { theme: "dark" });
await shoot("09-reference", `${BASE}/reference/cpp`, { theme: "light" });
await shoot("10-dashboard", `${BASE}/dashboard`, { theme: "light", full: true });
await shoot("11-vscode", `${BASE}/vscode`, { theme: "dark", full: true });

// Mobile: reading mode, which is the deliberate phone experience.
await shoot("12-mobile-home", `${BASE}/`, { theme: "light", mobile: true, full: true });
await shoot("13-mobile-lesson", `${BASE}/learn/cpp/hello-world`, {
  theme: "dark",
  mobile: true,
});

await browser.close();
console.log(`\nWrote ${fs.readdirSync(OUT).length} screenshots to ${OUT}\n`);
