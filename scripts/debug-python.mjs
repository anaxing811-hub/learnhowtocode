import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://127.0.0.1:3400";
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });

page.on("console", (m) => console.log(`[${m.type()}]`, m.text().slice(0, 300)));
page.on("pageerror", (e) => console.log("[pageerror]", e.message.slice(0, 300)));
page.on("worker", (w) => console.log("[worker created]", w.url()));
page.on("requestfailed", (r) =>
  console.log("[reqfail]", r.url().replace(BASE, ""), r.failure()?.errorText),
);
page.on("response", (r) => {
  const u = r.url().replace(BASE, "");
  if (u.includes("pyodide") || r.status() >= 400) {
    console.log("[resp]", r.status(), u.slice(0, 120));
  }
});

await page.goto(`${BASE}/learn/python/your-first-program`, {
  waitUntil: "domcontentloaded",
});
await page.locator('[data-testid="code-runner"]').first().waitFor();
await page
  .locator('[data-testid="code-runner"]')
  .first()
  .getByRole("button", { name: "Run" })
  .click();

await page.waitForTimeout(60_000);

const out = await page.evaluate(() => {
  const r = document.querySelector('[data-testid="code-runner"]');
  return {
    output: r?.querySelector('[data-testid="runner-output"]')?.textContent ?? "(none)",
    all: r?.textContent?.slice(0, 600) ?? "",
  };
});
console.log("\n--- OUTPUT PANEL ---\n", out.output);
console.log("\n--- RUNNER TEXT ---\n", out.all.replace(/\s+/g, " "));

await browser.close();
