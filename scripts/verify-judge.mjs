#!/usr/bin/env node
/**
 * Focused check on the problem judge: a correct submission must be Accepted
 * and a wrong one must be Wrong answer — not "time limit exceeded", which is
 * what a wall-clock budget applied to a WebAssembly run produces.
 *
 * Usage:  node scripts/verify-judge.mjs [baseUrl]
 */
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://127.0.0.1:3700";
const EXECUTABLE =
  process.env.CHROMIUM_PATH ??
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const browser = await chromium.launch({
  executablePath: EXECUTABLE,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 1400, height: 1100 } });

const results = [];
const record = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

await page.goto(`${BASE}/problems/twin-totals`, {
  waitUntil: "domcontentloaded",
});
await page.locator('[data-testid="problem-workbench"]').waitFor({ timeout: 30_000 });

/**
 * Submits `source` and waits for a verdict containing `expect`.
 *
 * Deliberately does not touch the DOM to clear the previous result: removing a
 * React-managed node breaks reconciliation, so the panel never came back. The
 * component unmounts the panel itself while judging, so waiting for the text
 * we expect is both simpler and honest.
 */
async function submit(source, expect) {
  await page.locator(".cm-content").first().click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.insertText(source);
  await page.getByRole("button", { name: "Submit" }).click();

  try {
    await page.waitForFunction(
      (needle) =>
        document
          .querySelector('[data-testid="judge-result"]')
          ?.textContent?.includes(needle) ?? false,
      expect,
      { timeout: 600_000 },
    );
  } catch {
    // Fall through and report whatever the panel actually says.
  }

  return (
    (await page
      .locator('[data-testid="judge-result"]')
      .innerText()
      .catch(() => "(no verdict panel)")) ?? ""
  )
    .replace(/\s+/g, " ")
    .trim();
}

console.log(`\nJudge verification against ${BASE}\n`);

const correct = await submit(
  '#include <iostream>\nint main(){ long long a,b; std::cin>>a>>b; std::cout<<a+b<<" "<<a-b<<" "<<a*b<<"\\n"; return 0; }',
  "Accepted",
);
record("correct submission is Accepted", correct.includes("Accepted"), correct.slice(0, 120));

const wrong = await submit(
  '#include <iostream>\nint main(){ long long a,b; std::cin>>a>>b; std::cout<<a+b<<" "<<a+b<<" "<<a+b<<"\\n"; return 0; }',
  "Wrong answer",
);
record(
  "wrong submission is Wrong answer (not a spurious timeout)",
  wrong.includes("Wrong answer"),
  wrong.slice(0, 120),
);

const broken = await submit(
  "#include <iostream>\nint main(){ return zzz; }",
  "Compile error",
);
record(
  "uncompilable submission is a Compile error",
  broken.includes("Compile error"),
  broken.slice(0, 120),
);

await browser.close();

const failed = results.filter((ok) => !ok).length;
console.log(`\n${results.length - failed}/${results.length} judge checks passed\n`);
process.exit(failed ? 1 : 0);
