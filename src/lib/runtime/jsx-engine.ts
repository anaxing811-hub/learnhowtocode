"use client";

import { transform } from "sucrase";
import * as React from "react";

/**
 * Compiles a lesson's JSX/TSX snippet into a live React component.
 *
 * Snippets are evaluated in-page against the app's own React rather than in an
 * iframe. React 19 dropped its UMD builds, so an iframe would mean shipping a
 * second bundled copy of React purely to render a ten-line example. The
 * trade-off is that a snippet can throw during render, which is what the
 * surrounding error boundary is for.
 */

export interface CompiledSnippet {
  Component: React.ComponentType;
  /** Anything the snippet logged while its module body ran. */
  logs: string[];
}

export class SnippetError extends Error {
  constructor(
    message: string,
    readonly phase: "compile" | "evaluate",
  ) {
    super(message);
    this.name = "SnippetError";
  }
}

/** Modules a snippet is allowed to import. */
function createRequire(logs: string[]) {
  const reactHooks = { ...React };

  return (name: string): unknown => {
    if (name === "react") return reactHooks;
    if (name === "react-dom" || name === "react-dom/client") {
      // Snippets sometimes copy a full createRoot() example from the docs.
      // Accept it, but make render() a no-op — the lesson renders the default
      // export itself.
      return {
        createRoot: () => ({ render: () => {}, unmount: () => {} }),
      };
    }
    logs.push(`(import of "${name}" was ignored — not available in the sandbox)`);
    return {};
  };
}

export function compileSnippet(source: string): CompiledSnippet {
  let compiled: string;
  try {
    compiled = transform(source, {
      transforms: ["jsx", "typescript", "imports"],
      jsxRuntime: "classic",
      production: true,
    }).code;
  } catch (err) {
    throw new SnippetError(
      err instanceof Error ? err.message : String(err),
      "compile",
    );
  }

  const logs: string[] = [];
  const moduleExports: Record<string, unknown> = {};
  // Named `snippetModule`, not `module`: assigning to a bare `module` binding
  // trips bundler heuristics that treat it as the CommonJS global.
  const snippetModule = { exports: moduleExports };

  const sandboxConsole = {
    log: (...args: unknown[]) => logs.push(args.map(format).join(" ")),
    warn: (...args: unknown[]) => logs.push("⚠ " + args.map(format).join(" ")),
    error: (...args: unknown[]) => logs.push("✖ " + args.map(format).join(" ")),
    info: (...args: unknown[]) => logs.push(args.map(format).join(" ")),
  };

  try {
    const factory = new Function(
      "require",
      "module",
      "exports",
      "React",
      "console",
      compiled,
    );
    factory(createRequire(logs), snippetModule, moduleExports, React, sandboxConsole);
  } catch (err) {
    throw new SnippetError(
      err instanceof Error ? err.message : String(err),
      "evaluate",
    );
  }

  const candidate =
    (moduleExports.default as React.ComponentType | undefined) ??
    (moduleExports.App as React.ComponentType | undefined) ??
    pickFirstComponent(moduleExports);

  if (typeof candidate !== "function") {
    throw new SnippetError(
      "This snippet has nothing to render. Add `export default function App() { … }`.",
      "evaluate",
    );
  }

  return { Component: candidate, logs };
}

function pickFirstComponent(
  exports: Record<string, unknown>,
): React.ComponentType | undefined {
  for (const [name, value] of Object.entries(exports)) {
    // React components are capitalised by convention; that is the only signal
    // available at runtime.
    if (typeof value === "function" && /^[A-Z]/.test(name)) {
      return value as React.ComponentType;
    }
  }
  return undefined;
}

function format(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.message;
  try {
    return JSON.stringify(value, null, 0) ?? String(value);
  } catch {
    return String(value);
  }
}
