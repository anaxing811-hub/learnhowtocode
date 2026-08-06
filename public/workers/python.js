/**
 * Pyodide worker — a plain, unbundled ES module served straight from /public.
 *
 * This deliberately sits outside the bundler. Turbopack rewrites
 * `new Worker(new URL("./x.ts", import.meta.url))` into its own worker
 * wrapper, which then fails with "Classic web workers are not supported" once
 * Pyodide is loaded inside it. Serving the worker as a static file means the
 * browser loads exactly these bytes and nothing transforms them.
 *
 * Protocol (see src/lib/runtime/protocol.ts):
 *   in : { type: "init", indexURL, packageBaseUrl }
 *        { type: "run", id, code, stdin, packages }
 *   out: { type: "ready" | "fatal" | "stream" | "image" | "done", … }
 */

let pyodide = null;
let bootPromise = null;
let currentId = 0;

const post = (message) => self.postMessage(message);

function stream(kind, text) {
  post({ type: "stream", id: currentId, kind, text });
}

/** Force matplotlib to render to a buffer; there is no display in a worker. */
const MPL_SETUP = `
import sys
if "matplotlib" in sys.modules:
    import matplotlib
    matplotlib.use("AGG")
`;

/** Drains any figures the user's code produced, as base64 PNGs. */
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

async function boot(indexURL, packageBaseUrl) {
  if (bootPromise) return bootPromise;

  bootPromise = (async () => {
    stream("status", "Starting Python…");

    const mod = await import(`${indexURL}pyodide.mjs`);
    const instance = await mod.loadPyodide({
      indexURL,
      ...(packageBaseUrl ? { packageBaseUrl } : {}),
    });

    instance.setStdout({ batched: (s) => stream("stdout", s + "\n") });
    instance.setStderr({ batched: (s) => stream("stderr", s + "\n") });

    pyodide = instance;
    post({ type: "ready", version: instance.version });
    return instance;
  })();

  return bootPromise;
}

self.onmessage = async (event) => {
  const msg = event.data;

  try {
    if (msg.type === "init") {
      await boot(msg.indexURL, msg.packageBaseUrl);
      return;
    }

    if (msg.type !== "run") return;

    currentId = msg.id;
    const started = performance.now();
    const py = pyodide ?? (await bootPromise);
    if (!py) throw new Error("Python runtime is not ready yet");

    // Feed stdin one line at a time; null signals EOF.
    const lines = msg.stdin ? msg.stdin.split("\n") : [];
    let lineIndex = 0;
    py.setStdin({
      stdin: () => (lineIndex < lines.length ? lines[lineIndex++] : null),
    });

    // Package loading reaches out to the wheel host. If that host is
    // unreachable — offline, a CDN outage, a restrictive network — the fetch
    // can hang rather than fail, which would leave the Run button spinning
    // forever with no explanation. Bound it and report what happened.
    const withTimeout = (promise, ms, what) =>
      Promise.race([
        promise,
        new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  `Timed out after ${Math.round(ms / 1000)}s while ${what}. ` +
                    `The Python package host may be unreachable from this network.`,
                ),
              ),
            ms,
          ),
        ),
      ]);

    const PACKAGE_TIMEOUT_MS = 90_000;

    if (msg.packages && msg.packages.length) {
      stream("status", `Loading ${msg.packages.join(", ")}…`);
      await withTimeout(
        py.loadPackage(msg.packages),
        PACKAGE_TIMEOUT_MS,
        `loading ${msg.packages.join(", ")}`,
      );
    }

    // Pull in anything the code imports that Pyodide ships a wheel for. A
    // missing wheel should surface as an ordinary ImportError from the run
    // below, not as a boot failure — but a *hang* must not be swallowed, so
    // a timeout here is reported and stops the run.
    try {
      stream("status", "Resolving imports…");
      await withTimeout(
        py.loadPackagesFromImports(msg.code),
        PACKAGE_TIMEOUT_MS,
        "downloading packages",
      );
    } catch (err) {
      const message = err && err.message ? err.message : String(err);
      if (message.startsWith("Timed out")) {
        post({
          type: "done",
          id: msg.id,
          ok: false,
          error: message,
          durationMs: Math.round(performance.now() - started),
        });
        return;
      }
      stream("status", `Could not preload packages: ${message}`);
    }

    try {
      py.runPython(MPL_SETUP);
    } catch {
      // matplotlib is not loaded; nothing to configure.
    }

    let ok = true;
    let error;
    try {
      await py.runPythonAsync(msg.code);
    } catch (err) {
      ok = false;
      error = err && err.message ? err.message : String(err);
    }

    // Figures are worth showing even if the script later threw.
    try {
      const figures = py.runPython(MPL_COLLECT);
      const list =
        figures && typeof figures.toJs === "function" ? figures.toJs() : figures;
      for (const data of list || []) {
        post({ type: "image", id: msg.id, data });
      }
    } catch {
      // matplotlib not in use.
    }

    post({
      type: "done",
      id: msg.id,
      ok,
      error,
      durationMs: Math.round(performance.now() - started),
    });
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    if (msg && msg.type === "run") {
      post({ type: "done", id: msg.id, ok: false, error: message, durationMs: 0 });
    } else {
      post({ type: "fatal", error: message });
    }
  }
};
