"use client";

import type {
  RunResult,
  WorkerOutbound,
} from "@/lib/runtime/protocol";

export interface RunHandlers {
  onStdout?: (text: string) => void;
  onStderr?: (text: string) => void;
  onStatus?: (text: string) => void;
  onImage?: (base64Png: string) => void;
}

const PYODIDE_INDEX_URL = "/pyodide/";

/**
 * Where Pyodide fetches numpy/pandas/matplotlib/scikit-learn wheels from.
 *
 * Defaults to the official CDN. Set NEXT_PUBLIC_PYODIDE_PACKAGE_URL to "/pyodide/"
 * after running `npm run fetch-pyodide-packages` for a fully self-hosted,
 * works-offline deployment.
 */
function packageBaseUrl(version: string | null) {
  const override = process.env.NEXT_PUBLIC_PYODIDE_PACKAGE_URL;
  if (override) return override;
  return version
    ? `https://cdn.jsdelivr.net/pyodide/v${version}/full/`
    : undefined;
}

let worker: Worker | null = null;
let ready: Promise<void> | null = null;
let nextId = 1;

const pending = new Map<
  number,
  {
    resolve: (r: RunResult) => void;
    handlers: RunHandlers;
    stdout: string[];
    stderr: string[];
    images: string[];
  }
>();

async function detectVersion(): Promise<string | null> {
  try {
    const res = await fetch("/pyodide/version.json");
    if (!res.ok) return null;
    return ((await res.json()) as { version?: string }).version ?? null;
  } catch {
    return null;
  }
}

function ensureWorker() {
  if (worker) return worker;

  worker = new Worker(
    new URL("../../workers/python.worker.ts", import.meta.url),
    { type: "module", name: "pyodide" },
  );

  worker.onmessage = (event: MessageEvent<WorkerOutbound>) => {
    const msg = event.data;

    if (msg.type === "ready") {
      resolveReady?.();
      return;
    }

    if (msg.type === "fatal") {
      rejectReady?.(new Error(msg.error));
      for (const [id, entry] of pending) {
        entry.resolve({
          ok: false,
          stdout: entry.stdout.join(""),
          stderr: entry.stderr.join(""),
          images: entry.images,
          error: msg.error,
          durationMs: 0,
        });
        pending.delete(id);
      }
      return;
    }

    const entry = pending.get(msg.id);
    if (!entry) return;

    if (msg.type === "stream") {
      if (msg.kind === "stdout") {
        entry.stdout.push(msg.text);
        entry.handlers.onStdout?.(msg.text);
      } else if (msg.kind === "stderr") {
        entry.stderr.push(msg.text);
        entry.handlers.onStderr?.(msg.text);
      } else {
        entry.handlers.onStatus?.(msg.text);
      }
      return;
    }

    if (msg.type === "image") {
      entry.images.push(msg.data);
      entry.handlers.onImage?.(msg.data);
      return;
    }

    if (msg.type === "done") {
      pending.delete(msg.id);
      entry.resolve({
        ok: msg.ok,
        stdout: entry.stdout.join(""),
        stderr: entry.stderr.join(""),
        images: entry.images,
        error: msg.error,
        durationMs: msg.durationMs,
      });
    }
  };

  return worker;
}

let resolveReady: (() => void) | null = null;
let rejectReady: ((e: Error) => void) | null = null;

export function bootPython(): Promise<void> {
  if (ready) return ready;

  ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });

  void (async () => {
    const version = await detectVersion();
    ensureWorker().postMessage({
      type: "init",
      indexURL: PYODIDE_INDEX_URL,
      packageBaseUrl: packageBaseUrl(version),
    });
  })();

  return ready;
}

export function isPythonBooted() {
  return ready !== null;
}

export async function runPython(
  code: string,
  options: { stdin?: string; packages?: string[] } & RunHandlers = {},
): Promise<RunResult> {
  const { stdin, packages, ...handlers } = options;
  await bootPython();

  const id = nextId++;
  return new Promise<RunResult>((resolve) => {
    pending.set(id, {
      resolve,
      handlers,
      stdout: [],
      stderr: [],
      images: [],
    });
    ensureWorker().postMessage({ type: "run", id, code, stdin, packages });
  });
}

/** Tears the interpreter down. Used to recover from a runaway loop. */
export function terminatePython() {
  worker?.terminate();
  worker = null;
  ready = null;
  resolveReady = null;
  rejectReady = null;
  for (const [id, entry] of pending) {
    entry.resolve({
      ok: false,
      stdout: entry.stdout.join(""),
      stderr: entry.stderr.join(""),
      images: entry.images,
      error: "Stopped.",
      durationMs: 0,
    });
    pending.delete(id);
  }
}
