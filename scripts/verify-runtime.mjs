#!/usr/bin/env node
/**
 * Drives the built app in a real Chromium and proves the in-browser toolchains
 * actually work. This is the only honest way to test them: they are tens of MB
 * of WebAssembly that only run in a cross-origin-isolated browser context.
 *
 * Usage:  node scripts/verify-runtime.mjs [baseUrl]
 */
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://127.0.0.1:3000";
const results = [];

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

// This environment ships Chromium at a fixed path that may not match the npm
// playwright package's expected build number, so point at it explicitly rather
// than downloading a second copy.
const EXECUTABLE =
  process.env.CHROMIUM_PATH ??
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const browser = await chromium.launch({
  executablePath: EXECUTABLE,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const context = await browser.newContext({
  viewport: { width: 1400, height: 1000 },
  hasTouch: false,
});
const page = await context.newPage();

const consoleErrors = [];
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text());
});
page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));

const assetRequests = [];
const notFound = [];
page.on("response", (res) => {
  const url = res.url().replace(BASE, "");
  if (url.startsWith("/emception/") || url.startsWith("/pyodide/")) {
    assetRequests.push({ url, status: res.status() });
  }
  if (res.status() === 404) notFound.push(url);
});

/** The runner's output panel, not any old <pre> on the page. */
function outputPanel(root) {
  return root.locator('[data-testid="runner-output"]').first();
}

console.log(`\nVerifying ${BASE}\n`);

/* ------------------------------------------------------------------ */
console.log("Page load and cross-origin isolation");
/* ------------------------------------------------------------------ */
const response = await page.goto(BASE, { waitUntil: "domcontentloaded" });
record("home page responds 200", response?.status() === 200);
record(
  "crossOriginIsolated is true",
  await page.evaluate(() => window.crossOriginIsolated === true),
);
record(
  "SharedArrayBuffer available",
  await page.evaluate(() => typeof SharedArrayBuffer !== "undefined"),
);

/* ------------------------------------------------------------------ */
console.log("\nC++ toolchain (emception: clang + lld + libc++)");
/* ------------------------------------------------------------------ */
await page.goto(`${BASE}/learn/cpp/hello-world`, {
  waitUntil: "domcontentloaded",
});

const firstRunner = page.locator('[data-testid="code-runner"]').first();
await firstRunner.waitFor({ timeout: 30_000 });

const runButton = firstRunner.getByRole("button", { name: "Run" });
await runButton.waitFor({ state: "visible", timeout: 30_000 });
record("Run button is present (desktop mode)", true);

const coldStart = Date.now();
await runButton.click();

let cppOk = false;
let cppDetail = "";
try {
  // Assert on the output panel's text specifically.
  await outputPanel(firstRunner).waitFor({ timeout: 420_000 });
  await page.waitForFunction(
    () => {
      const el = document.querySelector('[data-testid="runner-output"]');
      return el && el.textContent && el.textContent.includes("Hello, world!");
    },
    { timeout: 420_000 },
  );
  cppOk = true;
  cppDetail = `${((Date.now() - coldStart) / 1000).toFixed(1)}s cold`;
} catch {
  cppDetail = (await outputPanel(firstRunner).innerText().catch(() => "(no output panel)"))
    .slice(0, 400)
    .replace(/\s+/g, " ");
}
record("C++ compiles and prints 'Hello, world!' in the OUTPUT panel", cppOk, cppDetail);

if (cppOk) {
  record(
    "exit status shown as 0",
    (await firstRunner.innerText()).includes("exit 0"),
  );

  // Warm run: the toolchain is booted, so this should be much faster.
  const warmStart = Date.now();
  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="runner-output"]');
    if (el) el.textContent = "";
  });
  await runButton.click();
  let warmOk = false;
  try {
    await page.waitForFunction(
      () => {
        const el = document.querySelector('[data-testid="runner-output"]');
        return el && el.textContent && el.textContent.includes("Hello, world!");
      },
      { timeout: 180_000 },
    );
    warmOk = true;
  } catch {}
  record(
    "second compile succeeds on the warm toolchain",
    warmOk,
    `${((Date.now() - warmStart) / 1000).toFixed(1)}s warm`,
  );

  // A deliberate syntax error must produce a real clang diagnostic.
  await firstRunner.locator(".cm-content").click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type("int main() { return zzz; }");
  await runButton.click();
  let diagOk = false;
  let diagText = "";
  try {
    await page.waitForFunction(
      () => {
        const el = document.querySelector('[data-testid="runner-output"]');
        const t = el?.textContent ?? "";
        return t.includes("error:") || t.includes("undeclared");
      },
      { timeout: 180_000 },
    );
    diagOk = true;
    diagText = (await outputPanel(firstRunner).innerText())
      .split("\n")
      .find((l) => l.includes("error:")) ?? "";
  } catch {
    diagText = (await outputPanel(firstRunner).innerText().catch(() => "")).slice(0, 200);
  }
  record("a broken program yields a real clang diagnostic", diagOk, diagText.trim().slice(0, 140));
}

/* ------------------------------------------------------------------ */
console.log("\nAsset delivery");
/* ------------------------------------------------------------------ */
const bad = assetRequests.filter((r) => r.status >= 400);
record(
  "every toolchain asset the app asked for was served",
  bad.length === 0,
  bad.length ? bad.map((b) => `${b.status} ${b.url}`).join(", ") : `${assetRequests.length} requests, all 2xx`,
);

const bytes = assetRequests.filter((r) => r.status < 400).map((r) => r.url);
console.log("    fetched:");
for (const u of bytes) console.log("      " + u);

/* ------------------------------------------------------------------ */
console.log("\nConsole health");
/* ------------------------------------------------------------------ */
const realErrors = consoleErrors.filter(
  (e) =>
    !e.includes("Download the React DevTools") &&
    !e.toLowerCase().includes("favicon"),
);
record(
  "no unexpected console errors",
  realErrors.length === 0,
  realErrors.slice(0, 4).join(" | ").slice(0, 400),
);
if (notFound.length) {
  console.log("    404s: " + [...new Set(notFound)].join(", "));
}

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed\n`);
process.exit(failed.length ? 1 : 0);
