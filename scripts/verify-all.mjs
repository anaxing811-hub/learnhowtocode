#!/usr/bin/env node
/**
 * End-to-end verification of every runtime in a real browser.
 *
 * Covers: C++ (emception), Arduino (compile + board timeline), Python
 * (Pyodide), React (live preview), and the problem judge. Anything that
 * cannot be proven here is reported as SKIP rather than quietly passing.
 *
 * Usage:  node scripts/verify-all.mjs [baseUrl]
 */
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://127.0.0.1:3100";
const EXECUTABLE =
  process.env.CHROMIUM_PATH ??
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const results = [];
function record(name, status, detail = "") {
  results.push({ name, status, detail });
  console.log(`  ${status.padEnd(4)} ${name}${detail ? ` — ${detail}` : ""}`);
}
const pass = (n, d) => record(n, "PASS", d);
const fail = (n, d) => record(n, "FAIL", d);
const skip = (n, d) => record(n, "SKIP", d);

const browser = await chromium.launch({
  executablePath: EXECUTABLE,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const context = await browser.newContext({
  viewport: { width: 1400, height: 1100 },
  hasTouch: false,
});
const page = await context.newPage();

const badResponses = [];
page.on("response", (res) => {
  if (res.status() >= 400 && !res.url().includes("favicon")) {
    badResponses.push(`${res.status()} ${res.url().replace(BASE, "")}`);
  }
});

/** Waits until the given runner's output panel contains `needle`. */
async function waitForOutput(runnerIndex, needle, timeout) {
  await page.waitForFunction(
    ({ index, text }) => {
      const runners = document.querySelectorAll('[data-testid="code-runner"]');
      const el = runners[index]?.querySelector('[data-testid="runner-output"]');
      return Boolean(el?.textContent?.includes(text));
    },
    { index: runnerIndex, text: needle },
    { timeout },
  );
}

async function runnerText(runnerIndex) {
  return page.evaluate((index) => {
    const runners = document.querySelectorAll('[data-testid="code-runner"]');
    return (
      runners[index]?.querySelector('[data-testid="runner-output"]')
        ?.textContent ?? ""
    );
  }, runnerIndex);
}

async function clickRun(runnerIndex) {
  const runner = page.locator('[data-testid="code-runner"]').nth(runnerIndex);
  await runner.getByRole("button", { name: "Run" }).click();
}

console.log(`\nVerifying ${BASE}\n`);

/* ================================================================== */
console.log("1. C++ — real clang toolchain");
/* ================================================================== */
await page.goto(`${BASE}/learn/cpp/hello-world`, { waitUntil: "domcontentloaded" });
await page.locator('[data-testid="code-runner"]').first().waitFor({ timeout: 30_000 });

const cppStart = Date.now();
await clickRun(0);
try {
  await waitForOutput(0, "Hello, world!", 480_000);
  pass("compiles and runs a C++ program", `${((Date.now() - cppStart) / 1000).toFixed(0)}s cold`);
} catch {
  fail("compiles and runs a C++ program", (await runnerText(0)).slice(0, 200));
}

// A vector + class + template program exercises libc++, which is the part a
// toy interpreter would fail on.
await page.locator('[data-testid="code-runner"]').first().locator(".cm-content").click();
await page.keyboard.press("ControlOrMeta+a");
await page.keyboard.insertText(
  '#include <iostream>\n#include <vector>\n#include <string>\n#include <algorithm>\nstruct P { std::string n; int a; };\ntemplate <typename T> T biggest(T x, T y) { return x > y ? x : y; }\nint main() {\n std::vector<P> v{{"cy",2},{"ana",3},{"bo",1}};\n std::sort(v.begin(), v.end(), [](const P& x, const P& y){ return x.a < y.a; });\n for (auto& p : v) std::cout << p.n << p.a << " ";\n std::cout << biggest(7, 3) << "\\n";\n return 0;\n}',
);
await clickRun(0);
try {
  await waitForOutput(0, "bo1 cy2 ana3 7", 300_000);
  pass("libc++ works: vector, string, sort, lambda, template");
} catch {
  fail("libc++ works: vector, string, sort, lambda, template", (await runnerText(0)).slice(0, 300));
}

/* ================================================================== */
console.log("\n2. Arduino — sketch compiles and drives the board");
/* ================================================================== */
await page.goto(`${BASE}/learn/arduino/blink`, { waitUntil: "domcontentloaded" });
await page.locator('[data-testid="code-runner"]').first().waitFor({ timeout: 30_000 });
await clickRun(0);

try {
  // The board only renders once a timeline came back from the compiled sketch.
  await page.waitForSelector("text=Serial Monitor", { timeout: 300_000 });
  pass("Arduino sketch compiles and produces a board timeline");

  const ledCount = await page.locator('[aria-label^="Pin 13"]').count();
  if (ledCount > 0) pass("pin 13 LED is rendered on the simulated board");
  else fail("pin 13 LED is rendered on the simulated board", "no LED element found");

  // The LED must actually change state over the timeline.
  const blinked = await page.evaluate(async () => {
    const led = () => document.querySelector('[aria-label^="Pin 13"]');
    const seen = new Set();
    for (let i = 0; i < 40; i++) {
      const el = led();
      if (el) seen.add(el.getAttribute("aria-label"));
      await new Promise((r) => setTimeout(r, 100));
    }
    return [...seen];
  });
  if (blinked.length > 1) pass("LED toggles during playback", blinked.join(" / "));
  else fail("LED toggles during playback", `only saw: ${blinked.join(",") || "nothing"}`);
} catch {
  fail("Arduino sketch compiles and produces a board timeline", (await runnerText(0)).slice(0, 300));
}

/* ================================================================== */
console.log("\n3. Python — real CPython via Pyodide");
/* ================================================================== */
await page.goto(`${BASE}/learn/python/your-first-program`, {
  waitUntil: "domcontentloaded",
});
await page.locator('[data-testid="code-runner"]').first().waitFor({ timeout: 30_000 });

const pyStart = Date.now();
await clickRun(0);
try {
  await waitForOutput(0, "Hello, world!", 300_000);
  pass("runs a Python program", `${((Date.now() - pyStart) / 1000).toFixed(0)}s cold`);
} catch {
  fail("runs a Python program", (await runnerText(0)).slice(0, 300));
}

// Arbitrary-precision integers prove this is genuine CPython, not a JS shim.
await page.locator('[data-testid="code-runner"]').first().locator(".cm-content").click();
await page.keyboard.press("ControlOrMeta+a");
await page.keyboard.insertText("import sys\nprint(2 ** 100)\nprint(sys.version.split()[0])");
await clickRun(0);
try {
  await waitForOutput(0, "1267650600228229401496703205376", 180_000);
  const text = await runnerText(0);
  const version = text.match(/3\.\d+\.\d+/)?.[0] ?? "?";
  pass("genuine CPython semantics (bignum ints)", `Python ${version}`);
} catch {
  fail("genuine CPython semantics (bignum ints)", (await runnerText(0)).slice(0, 300));
}

// NumPy and friends come from the Pyodide package CDN. Pre-flight it rather
// than waiting on a request that may never resolve: a host blocked at the
// network level does not fail fast, it simply hangs.
const cdnReachable = await page.evaluate(async () => {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    await fetch("https://cdn.jsdelivr.net/pyodide/", {
      method: "HEAD",
      mode: "no-cors",
      signal: controller.signal,
    });
    clearTimeout(timer);
    return true;
  } catch {
    return false;
  }
});

if (!cdnReachable) {
  skip(
    "NumPy loads and computes",
    "the Pyodide package CDN is unreachable from this network, so scientific packages cannot be exercised here",
  );
} else {
  await page
    .locator('[data-testid="code-runner"]')
    .first()
    .locator(".cm-content")
    .click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.insertText("import numpy as np\nprint(np.arange(5).sum())");
  await clickRun(0);
  try {
    await waitForOutput(0, "10", 240_000);
    pass("NumPy loads and computes");
  } catch {
    fail("NumPy loads and computes", (await runnerText(0)).slice(0, 200));
  }
}

/* ================================================================== */
console.log("\n4. React — live preview");
/* ================================================================== */
await page.goto(`${BASE}/learn/react/first-component`, {
  waitUntil: "domcontentloaded",
});
await page.locator('[data-testid="code-runner"]').first().waitFor({ timeout: 30_000 });
try {
  await page.waitForSelector("h1:has-text('Hello, world!')", { timeout: 30_000 });
  pass("JSX compiles and renders live");
} catch {
  fail("JSX compiles and renders live", "no rendered output found");
}

// Editing the source must re-render without a Run click.
await page.locator('[data-testid="code-runner"]').first().locator(".cm-content").click();
await page.keyboard.press("ControlOrMeta+a");
await page.keyboard.insertText(
  'export default function App() {\n const items = ["x","y"];\n return <ul>{items.map(i => <li key={i}>item {i}</li>)}</ul>;\n}',
);
try {
  await page.waitForSelector("li:has-text('item y')", { timeout: 30_000 });
  pass("preview updates as you type");
} catch {
  fail("preview updates as you type", "edited snippet did not render");
}

// A syntax error must be reported, not crash the page.
await page.keyboard.press("ControlOrMeta+a");
await page.keyboard.insertText("export default function App() { return <div>;  }");
try {
  await page.waitForSelector("text=/Syntax error|Error while running/", { timeout: 30_000 });
  pass("a broken snippet shows an error instead of crashing");
} catch {
  fail("a broken snippet shows an error instead of crashing");
}

/* ================================================================== */
console.log("\n5. Problem judge");
/* ================================================================== */
await page.goto(`${BASE}/problems/twin-totals`, { waitUntil: "domcontentloaded" });
await page.locator('[data-testid="problem-workbench"]').waitFor({ timeout: 30_000 });

// Submit a correct C++ solution against the full hidden suite.
await page.locator(".cm-content").first().click();
await page.keyboard.press("ControlOrMeta+a");
await page.keyboard.insertText(
  "#include <iostream>\nint main(){ long long a,b; std::cin>>a>>b; std::cout<<a+b<<\" \"<<a-b<<\" \"<<a*b<<\"\\n\"; return 0; }",
);
await page.getByRole("button", { name: "Submit" }).click();

try {
  await page.waitForSelector('[data-testid="judge-result"]', { timeout: 420_000 });
  const verdict = await page.locator('[data-testid="judge-result"]').innerText();
  if (verdict.includes("Accepted")) {
    pass("a correct C++ submission is Accepted", verdict.split("\n")[0]);
  } else {
    fail("a correct C++ submission is Accepted", verdict.replace(/\s+/g, " ").slice(0, 200));
  }
} catch {
  fail("a correct C++ submission is Accepted", "judge produced no result");
}

// And a wrong one must be rejected.
await page.locator(".cm-content").first().click();
await page.keyboard.press("ControlOrMeta+a");
await page.keyboard.insertText(
  "#include <iostream>\nint main(){ long long a,b; std::cin>>a>>b; std::cout<<a+b<<\" \"<<a+b<<\" \"<<a+b<<\"\\n\"; return 0; }",
);
await page.getByRole("button", { name: "Submit" }).click();
try {
  await page.waitForFunction(
    () =>
      document
        .querySelector('[data-testid="judge-result"]')
        ?.textContent?.includes("Wrong answer"),
    { timeout: 420_000 },
  );
  pass("an incorrect submission is rejected");
} catch {
  const verdict = await page
    .locator('[data-testid="judge-result"]')
    .innerText()
    .catch(() => "");
  fail("an incorrect submission is rejected", verdict.replace(/\s+/g, " ").slice(0, 160));
}

/* ================================================================== */
console.log("\n6. Site health");
/* ================================================================== */
for (const route of ["/", "/learn", "/problems", "/reference", "/vscode", "/dashboard"]) {
  const res = await page.goto(BASE + route, { waitUntil: "domcontentloaded" });
  if (res?.status() === 200) pass(`${route} responds 200`);
  else fail(`${route} responds 200`, `status ${res?.status()}`);
}

if (badResponses.length === 0) pass("no 4xx/5xx responses during the run");
else fail("no 4xx/5xx responses during the run", [...new Set(badResponses)].slice(0, 5).join(", "));

await browser.close();

const failed = results.filter((r) => r.status === "FAIL");
const skipped = results.filter((r) => r.status === "SKIP");
console.log(
  `\n${results.length - failed.length - skipped.length} passed, ${failed.length} failed, ${skipped.length} skipped\n`,
);
process.exit(failed.length ? 1 : 0);
