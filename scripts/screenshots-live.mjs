#!/usr/bin/env node
/**
 * Screenshots that require actually running code: the Arduino board replaying
 * a compiled sketch, and the judge showing a verdict.
 *
 * Usage:  node scripts/screenshots-live.mjs [baseUrl] [outDir]
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
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 2,
  colorScheme: "dark",
});
await context.addInitScript(() => {
  try {
    window.localStorage.setItem("theme", "dark");
  } catch {}
});
const page = await context.newPage();

async function save(name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file });
  console.log(`  ${name}.png  ${(fs.statSync(file).size / 1024).toFixed(0)} KB`);
}

/* ---------------- Arduino board mid-playback ---------------- */
console.log("\nArduino board (compiling, ~1 min)…");
await page.goto(`${BASE}/learn/arduino/blink`, { waitUntil: "domcontentloaded" });
await page.locator('[data-testid="code-runner"]').first().waitFor({ timeout: 30_000 });
await page
  .locator('[data-testid="code-runner"]')
  .first()
  .getByRole("button", { name: "Run" })
  .click();

await page.waitForSelector("text=Serial Monitor", { timeout: 420_000 });
// Let the timeline advance so the LED is lit rather than at t=0.
await page.waitForTimeout(700);
await page
  .locator('[data-testid="code-runner"]')
  .first()
  .scrollIntoViewIfNeeded();
await page.waitForTimeout(400);
await save("14-arduino-board");

/* ---------------- C++ output panel ---------------- */
console.log("C++ runner with output…");
await page.goto(`${BASE}/learn/cpp/hello-world`, { waitUntil: "domcontentloaded" });
await page.locator('[data-testid="code-runner"]').first().waitFor({ timeout: 30_000 });
await page
  .locator('[data-testid="code-runner"]')
  .first()
  .getByRole("button", { name: "Run" })
  .click();
await page.waitForFunction(
  () =>
    document
      .querySelector('[data-testid="runner-output"]')
      ?.textContent?.includes("Hello, world!") ?? false,
  null,
  { timeout: 300_000 },
);
await page.locator('[data-testid="code-runner"]').first().scrollIntoViewIfNeeded();
await page.waitForTimeout(400);
await save("15-cpp-output");

/* ---------------- A real compiler diagnostic ---------------- */
console.log("C++ compiler diagnostic…");
await page.locator('[data-testid="code-runner"]').first().locator(".cm-content").click();
await page.keyboard.press("ControlOrMeta+a");
await page.keyboard.insertText(
  '#include <iostream>\n\nint main() {\n    std::cout << "missing a semicolon"\n    return 0;\n}',
);
await page
  .locator('[data-testid="code-runner"]')
  .first()
  .getByRole("button", { name: "Run" })
  .click();
await page.waitForFunction(
  () =>
    document
      .querySelector('[data-testid="runner-output"]')
      ?.textContent?.includes("error:") ?? false,
  null,
  { timeout: 300_000 },
);
await page.locator('[data-testid="code-runner"]').first().scrollIntoViewIfNeeded();
await page.waitForTimeout(400);
await save("16-cpp-error");

/* ---------------- Judge verdict ---------------- */
console.log("Judge verdict (15 tests, ~1 min)…");
await page.goto(`${BASE}/problems/twin-totals`, { waitUntil: "domcontentloaded" });
await page.locator('[data-testid="problem-workbench"]').waitFor({ timeout: 30_000 });
await page.locator(".cm-content").first().click();
await page.keyboard.press("ControlOrMeta+a");
await page.keyboard.insertText(
  '#include <iostream>\nint main() {\n    long long a, b;\n    std::cin >> a >> b;\n    std::cout << a + b << " " << a - b << " " << a * b << "\\n";\n    return 0;\n}',
);
await page.getByRole("button", { name: "Submit" }).click();
await page.waitForFunction(
  () =>
    document
      .querySelector('[data-testid="judge-result"]')
      ?.textContent?.includes("Accepted") ?? false,
  null,
  { timeout: 600_000 },
);
await page.waitForTimeout(400);
await save("17-judge-accepted");

await browser.close();
console.log("\nDone.\n");
