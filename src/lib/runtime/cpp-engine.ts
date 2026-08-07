"use client";

import type { RunResult } from "@/lib/runtime/protocol";
import type { RunHandlers } from "@/lib/runtime/python-engine";

/**
 * Real clang + lld + libc++, compiled to WebAssembly, running in a Web Worker.
 *
 * emception's `cpp` preset drives `clang -cc1` and `wasm-ld` directly rather
 * than going through the emcc driver, which means the ~28 MB CPython driver
 * bundle never has to be downloaded. scripts/prepare-assets.mjs prunes it.
 */

const MANIFEST_URL = "/emception/manifest.json";

// Type-only imports: erased at build time, so this does not pull the ~15 MB
// runtime into the server bundle or the initial client chunk.
type EmceptionModule = typeof import("@gameguild/emception-browser");
type EmceptionAPI = Awaited<ReturnType<EmceptionModule["createEmception"]>>;

let apiPromise: Promise<{
  api: EmceptionAPI;
  compileAndRun: EmceptionModule["compileAndRun"];
}> | null = null;

/**
 * Serialises compiles. The toolchain worker holds a single VFS, so two
 * concurrent runs would fight over /home/user/main.cpp.
 */
let queue: Promise<unknown> = Promise.resolve();

export function bootCpp(onStatus?: (text: string) => void) {
  if (apiPromise) return apiPromise;

  apiPromise = (async () => {
    onStatus?.("Downloading the C++ toolchain (one time, then cached)…");

    const { createEmception, compileAndRun } = await import(
      "@gameguild/emception-browser"
    );

    const api = await createEmception({
      tty: "none",
      manifestUrl: MANIFEST_URL,
    });

    onStatus?.("Toolchain ready.");
    return { api, compileAndRun };
  })();

  return apiPromise;
}

export function isCppBooted() {
  return apiPromise !== null;
}

export interface CppRunOptions extends RunHandlers {
  stdin?: string;
  /** Extra sources to drop in the VFS before compiling (e.g. Arduino.h). */
  extraFiles?: Record<string, string>;
  /** Defaults to "main.cpp" — shows up in compiler diagnostics. */
  filename?: string;
}

export async function runCpp(
  source: string,
  options: CppRunOptions = {},
): Promise<RunResult> {
  const { stdin, extraFiles, filename = "main.cpp", ...handlers } = options;

  const task = queue.then(async (): Promise<RunResult> => {
    const started = performance.now();
    const stdout: string[] = [];
    const stderr: string[] = [];

    try {
      const { api, compileAndRun } = await bootCpp(handlers.onStatus);

      for (const [path, contents] of Object.entries(extraFiles ?? {})) {
        await api.writeFile(`/home/user/${path}`, contents);
      }

      const result = await compileAndRun(api, {
        preset: "cpp",
        source,
        stdin,
        paths: {
          sourcePath: `/home/user/${filename}`,
          objectPath: `/home/user/${filename.replace(/\.\w+$/, "")}.o`,
          wasmPath: `/home/user/${filename.replace(/\.\w+$/, "")}.wasm`,
        },
        onPhase: (phase) => {
          if (phase === "compile") handlers.onStatus?.("Compiling…");
          if (phase === "link") handlers.onStatus?.("Linking…");
          if (phase === "run") handlers.onStatus?.("Running…");
        },
        // Emscripten's print/printErr fire once per *line*, with the trailing
        // newline already stripped. Re-add it on the way out, or every line of
        // a program's output runs into the next one — and clang's carefully
        // column-aligned diagnostics collapse into one unreadable string.
        onStdout: (t) => {
          stdout.push(t);
          handlers.onStdout?.(t + "\n");
        },
        onStderr: (t) => {
          stderr.push(t);
          handlers.onStderr?.(t + "\n");
        },
      });

      const failed = result.exitCode !== 0;

      // A diagnostic reaches us twice: streamed line-by-line through onStderr,
      // and again whole on the phase result. Showing both printed every error
      // twice, so pick one. They are the same text once the streamed lines are
      // rejoined correctly; prefer the streamed copy and fall back to the
      // phase result for the case where nothing was streamed at all.
      const buildError =
        result.finalPhase === "compile"
          ? result.compile?.stderr
          : result.finalPhase === "link"
            ? result.link?.stderr
            : undefined;

      const streamedStderr = stderr.join("\n");
      const combinedStderr =
        streamedStderr.trim() || (failed ? (buildError ?? "") : "");

      return {
        ok: !failed,
        stdout: stdout.join("\n"),
        stderr: combinedStderr,
        images: [],
        exitCode: result.exitCode,
        error: failed
          ? result.finalPhase === "compile"
            ? "Compilation failed"
            : result.finalPhase === "link"
              ? "Linking failed"
              : `Program exited with code ${result.exitCode}`
          : undefined,
        durationMs: Math.round(performance.now() - started),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        stdout: stdout.join(""),
        stderr: stderr.join("") + message,
        images: [],
        error: message,
        durationMs: Math.round(performance.now() - started),
      };
    }
  });

  // Keep the chain alive even if this run rejected.
  queue = task.catch(() => undefined);
  return task;
}

export function terminateCpp() {
  void apiPromise?.then(({ api }) => api.dispose()).catch(() => undefined);
  apiPromise = null;
  queue = Promise.resolve();
}

/* ------------------------------------------------------------------ */
/* Compile once, run many                                              */
/* ------------------------------------------------------------------ */

/**
 * The judge runs one program against dozens of inputs. Going through
 * `runCpp` for each would recompile and relink every time — by far the most
 * expensive part of the cycle, and identical work on each pass. These two
 * functions split it: compile once, then run the resulting wasm per test.
 */

export interface CompiledProgram {
  wasmPath: string;
}

export interface CompileOutcome {
  ok: boolean;
  program?: CompiledProgram;
  /** Compiler or linker diagnostics when `ok` is false. */
  diagnostics: string;
  stage: "compile" | "link" | "done";
}

const PATHS = {
  sourcePath: "/home/user/judge.cpp",
  objectPath: "/home/user/judge.o",
  wasmPath: "/home/user/judge.wasm",
};

/** Skips preloading the graphics bundles; nothing here uses SDL or raylib. */
const NO_GRAPHICS = { hints: { bundlesNeeded: [] as string[] } };

export async function compileCppProgram(
  source: string,
  onStatus?: (text: string) => void,
): Promise<CompileOutcome> {
  const task = queue.then(async (): Promise<CompileOutcome> => {
    const { api } = await bootCpp(onStatus);
    const { BROWSER_BUILD_PRESETS } = await import(
      "@gameguild/emception-browser"
    );
    const preset = BROWSER_BUILD_PRESETS.cpp;

    await api.writeFile(PATHS.sourcePath, source);

    onStatus?.("Compiling…");
    const compile = await api.run(
      preset.compileTool,
      preset.compileArgv(PATHS),
      NO_GRAPHICS,
    );
    if (compile.exitCode !== 0) {
      return {
        ok: false,
        diagnostics: compile.stderr || compile.stdout,
        stage: "compile",
      };
    }

    onStatus?.("Linking…");
    const link = await api.run(
      preset.linkTool,
      preset.linkArgv(PATHS),
      NO_GRAPHICS,
    );
    if (link.exitCode !== 0) {
      return {
        ok: false,
        diagnostics: link.stderr || link.stdout,
        stage: "link",
      };
    }

    return {
      ok: true,
      program: { wasmPath: PATHS.wasmPath },
      diagnostics: "",
      stage: "done",
    };
  });

  queue = task.catch(() => undefined);
  return task;
}

/** Feeds a string to the program's stdin one byte at a time, then EOF. */
function stdinFeeder(text: string | undefined) {
  if (text === undefined) return undefined;
  const bytes = new TextEncoder().encode(
    text.endsWith("\n") ? text : text + "\n",
  );
  let i = 0;
  return () => (i >= bytes.length ? null : bytes[i++]);
}

export async function runCompiledProgram(
  program: CompiledProgram,
  stdin?: string,
): Promise<RunResult> {
  const task = queue.then(async (): Promise<RunResult> => {
    const started = performance.now();
    const { api } = await bootCpp();

    const result = await api.run("wasi-run", ["wasi-run", program.wasmPath], {
      ...NO_GRAPHICS,
      stdin: stdinFeeder(stdin),
    });

    return {
      ok: result.exitCode === 0,
      stdout: result.stdout,
      stderr: result.stderr,
      images: [],
      exitCode: result.exitCode,
      error:
        result.exitCode === 0
          ? undefined
          : `Program exited with code ${result.exitCode}`,
      durationMs: Math.round(performance.now() - started),
    };
  });

  queue = task.catch(() => undefined);
  return task;
}
