#!/usr/bin/env node
/**
 * Copies the in-browser toolchains out of node_modules and into public/ so the
 * app serves them from its own origin.
 *
 * Why not commit them? The emception payload alone is ~126 MB. Keeping it in
 * node_modules and copying at build time keeps the git repo small while still
 * producing a fully self-hosted deployment — Vercel runs `npm install` before
 * `next build`, so the files are always there when this runs.
 *
 * Run automatically via the `prebuild` and `predev` npm scripts.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");

/**
 * Bundles emception can lazily fetch that none of our lessons ever need.
 *
 * Verified empirically, not guessed: scripts/verify-runtime.mjs drives a real
 * compile in Chromium and fails the run if any asset 404s. `sdl3.tar.br` looks
 * prunable and is not — the C++ preset's include path touches it — which is
 * exactly why this list is checked rather than assumed. Re-run the verifier
 * after changing anything here.
 */
const EMCEPTION_SKIP = new Set([
  // The emcc driver is CPython-in-wasm. Our C++ preset drives clang -cc1 and
  // wasm-ld directly, so the whole Python driver is dead weight (~28 MB).
  "python-runtime.tar.br",
  "python.tar.br",
  // Game/graphics frameworks beyond SDL — no lesson uses them.
  "raylib.tar.br",
  "allegro.tar.br",
  // Build systems: every lesson compiles a single translation unit.
  "cmake.tar.br",
  "ninja.tar.br",
  // Sanitizer and debug runtime variants are never selected by our presets.
  "cache-sanitizers.tar.br",
  "cache-debug.tar.br",
]);

function copyDir(src, dest, { skip } = {}) {
  fs.mkdirSync(dest, { recursive: true });
  let bytes = 0;
  let skipped = 0;
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      const r = copyDir(from, to, { skip });
      bytes += r.bytes;
      skipped += r.skipped;
    } else {
      if (skip?.has(entry.name)) {
        skipped += fs.statSync(from).size;
        continue;
      }
      fs.copyFileSync(from, to);
      bytes += fs.statSync(to).size;
    }
  }
  return { bytes, skipped };
}

function mb(n) {
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function requirePackageDir(pkg) {
  const dir = path.join(root, "node_modules", pkg);
  if (!fs.existsSync(dir)) {
    throw new Error(
      `Missing node_modules/${pkg}. Run "npm install" before building.`,
    );
  }
  return dir;
}

/* ---------------------------------------------------------------- */
/* emception: clang + lld + libc++, compiled to WebAssembly          */
/* ---------------------------------------------------------------- */

function prepareEmception() {
  const src = path.join(requirePackageDir("emception"), "cdn");
  const dest = path.join(publicDir, "emception");
  fs.rmSync(dest, { recursive: true, force: true });
  const { bytes, skipped } = copyDir(src, dest, { skip: EMCEPTION_SKIP });
  console.log(
    `  emception -> public/emception  ${mb(bytes)} copied, ${mb(skipped)} pruned`,
  );
}

/* ---------------------------------------------------------------- */
/* Pyodide: CPython compiled to WebAssembly                          */
/* ---------------------------------------------------------------- */

// Only the core runtime lives in the npm package. Third-party wheels (numpy,
// pandas, scikit-learn, matplotlib) are fetched at runtime from the Pyodide
// CDN unless the user has run scripts/fetch-pyodide-packages.mjs.
const PYODIDE_CORE = [
  "pyodide.mjs",
  "pyodide.asm.mjs",
  "pyodide.asm.wasm",
  "python_stdlib.zip",
  "pyodide-lock.json",
  "ffi.d.ts",
  "pyodide.d.ts",
];

function preparePyodide() {
  const src = requirePackageDir("pyodide");
  const dest = path.join(publicDir, "pyodide");
  fs.mkdirSync(dest, { recursive: true });

  let bytes = 0;
  for (const file of PYODIDE_CORE) {
    const from = path.join(src, file);
    if (!fs.existsSync(from)) continue;
    fs.copyFileSync(from, path.join(dest, file));
    bytes += fs.statSync(from).size;
  }

  // Preserve any wheels a previous fetch-pyodide-packages run put here.
  const wheels = fs.readdirSync(dest).filter((f) => f.endsWith(".whl")).length;
  const version = JSON.parse(
    fs.readFileSync(path.join(src, "package.json"), "utf8"),
  ).version;

  fs.writeFileSync(
    path.join(dest, "version.json"),
    JSON.stringify({ version }, null, 2),
  );

  console.log(
    `  pyodide ${version} -> public/pyodide  ${mb(bytes)} copied` +
      (wheels ? `, ${wheels} local wheels kept` : ""),
  );
}

/* ---------------------------------------------------------------- */

/* ---------------------------------------------------------------- */
/* Problem test suites                                               */
/* ---------------------------------------------------------------- */

/**
 * Test data is served as static JSON rather than embedded in the problem
 * page. A single problem's suite can run to megabytes, which would otherwise
 * be inlined into the server-rendered payload of a page you might only be
 * reading. Fetching on submit keeps the page small and downloads the tests
 * exactly when they are needed.
 */
function prepareProblemTests() {
  const src = path.join(root, "content", "problems");
  const dest = path.join(publicDir, "problem-tests");
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });

  if (!fs.existsSync(src)) {
    console.log("  problem tests -> none found");
    return;
  }

  let bytes = 0;
  let count = 0;
  for (const file of fs.readdirSync(src)) {
    if (!file.endsWith(".tests.json")) continue;
    const id = file.replace(/\.tests\.json$/, "");
    const to = path.join(dest, `${id}.json`);
    // Re-serialise without the pretty-printing to save a chunk of bytes.
    const data = JSON.parse(fs.readFileSync(path.join(src, file), "utf8"));
    fs.writeFileSync(to, JSON.stringify(data));
    bytes += fs.statSync(to).size;
    count++;
  }

  console.log(
    `  problem tests -> public/problem-tests  ${count} suites, ${mb(bytes)}`,
  );
}

console.log("Preparing in-browser toolchains…");
prepareEmception();
preparePyodide();
prepareProblemTests();
console.log("Done.");
