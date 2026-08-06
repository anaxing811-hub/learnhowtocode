/// <reference lib="webworker" />
/**
 * Runs real CPython (Pyodide) off the main thread.
 *
 * Pyodide is loaded from our own origin (public/pyodide, populated by
 * scripts/prepare-assets.mjs). Third-party wheels — numpy, pandas, matplotlib,
 * scikit-learn — come from `packageBaseUrl`, which defaults to the Pyodide CDN
 * unless the deployment has fetched them locally.
 */
import type { WorkerInbound, WorkerOutbound } from "@/lib/runtime/protocol";

// The Pyodide types are only available via the public asset, which webpack must
// not try to resolve at build time.
type PyodideInterface = {
  runPythonAsync: (code: string) => Promise<unknown>;
  runPython: (code: string) => unknown;
  loadPackage: (names: string[]) => Promise<unknown>;
  loadPackagesFromImports: (code: string) => Promise<unknown>;
  setStdout: (opts: { batched: (s: string) => void }) => void;
  setStderr: (opts: { batched: (s: string) => void }) => void;
  setStdin: (opts: { stdin: () => string | null }) => void;
  version: string;
  globals: { get: (k: string) => unknown };
};

let pyodide: PyodideInterface | null = null;
let bootPromise: Promise<PyodideInterface> | null = null;
let currentId = 0;

const post = (msg: WorkerOutbound) => self.postMessage(msg);

function stream(kind: "stdout" | "stderr" | "status", text: string) {
  post({ type: "stream", id: currentId, kind, text });
}

/**
 * Installed once after boot. Redirects matplotlib to the Agg backend so figures
 * render to PNG buffers instead of trying to open a GUI window that does not
 * exist in a worker.
 */
const MPL_SETUP = `
import sys
def _lhtc_configure_matplotlib():
    if "matplotlib" not in sys.modules:
        return
    import matplotlib
    matplotlib.use("AGG")
`;

/** Drains any figures the user's code created and returns them as base64 PNGs. */
const MPL_COLLECT = `
def _lhtc_collect_figures():
    import sys
    if "matplotlib" not in sys.modules:
        return []
    import base64, io
    import matplotlib.pyplot as plt
    out = []
    for num in plt.get_fignums():
        fig = plt.figure(num)
        buf = io.BytesIO()
        fig.savefig(buf, format="png", dpi=120, bbox_inches="tight")
        out.append(base64.b64encode(buf.getvalue()).decode("ascii"))
    plt.close("all")
    return out
_lhtc_collect_figures()
`;

async function boot(indexURL: string, packageBaseUrl?: string) {
  if (bootPromise) return bootPromise;

  bootPromise = (async () => {
    stream("status", "Downloading Python runtime…");

    const mod = await import(
      /* webpackIgnore: true */ `${indexURL}pyodide.mjs`
    );

    const instance: PyodideInterface = await mod.loadPyodide({
      indexURL,
      ...(packageBaseUrl ? { packageBaseUrl } : {}),
    });

    instance.setStdout({ batched: (s: string) => stream("stdout", s + "\n") });
    instance.setStderr({ batched: (s: string) => stream("stderr", s + "\n") });
    instance.runPython(MPL_SETUP);

    pyodide = instance;
    post({ type: "ready", version: instance.version });
    return instance;
  })();

  return bootPromise;
}

self.onmessage = async (event: MessageEvent<WorkerInbound>) => {
  const msg = event.data;

  try {
    if (msg.type === "init") {
      await boot(msg.indexURL, msg.packageBaseUrl);
      return;
    }

    if (msg.type === "run") {
      currentId = msg.id;
      const started = performance.now();
      const py = pyodide ?? (await bootPromise);
      if (!py) throw new Error("Python runtime is not ready yet");

      // Feed stdin one line at a time; returning null signals EOF.
      const lines = msg.stdin ? msg.stdin.split("\n") : [];
      let lineIndex = 0;
      py.setStdin({
        stdin: () => (lineIndex < lines.length ? lines[lineIndex++] : null),
      });

      if (msg.packages?.length) {
        stream("status", `Loading ${msg.packages.join(", ")}…`);
        await py.loadPackage(msg.packages);
      }

      // Pull in anything the code imports that Pyodide ships a wheel for.
      try {
        await py.loadPackagesFromImports(msg.code);
      } catch {
        // A missing wheel should surface as a normal ImportError from the run
        // below, not as a boot failure.
      }

      py.runPython(MPL_SETUP);

      let error: string | undefined;
      let ok = true;
      try {
        await py.runPythonAsync(msg.code);
      } catch (err) {
        ok = false;
        error = err instanceof Error ? err.message : String(err);
      }

      // Figures are worth showing even when the script later threw.
      try {
        const figures = py.runPython(MPL_COLLECT) as unknown;
        const list =
          figures && typeof (figures as { toJs?: unknown }).toJs === "function"
            ? ((figures as { toJs: () => string[] }).toJs() as string[])
            : (figures as string[] | undefined);
        for (const data of list ?? []) {
          post({ type: "image", id: msg.id, data });
        }
      } catch {
        // Matplotlib not in use — nothing to collect.
      }

      post({
        type: "done",
        id: msg.id,
        ok,
        error,
        durationMs: Math.round(performance.now() - started),
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (msg.type === "run") {
      post({
        type: "done",
        id: msg.id,
        ok: false,
        error: message,
        durationMs: 0,
      });
    } else {
      post({ type: "fatal", error: message });
    }
  }
};

export {};
