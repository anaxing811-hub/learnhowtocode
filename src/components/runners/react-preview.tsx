"use client";

import * as React from "react";

import { compileSnippet, SnippetError } from "@/lib/runtime/jsx-engine";

class PreviewBoundary extends React.Component<
  { children: React.ReactNode; onError: (message: string) => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error.message);
  }

  componentDidUpdate(prev: { children: React.ReactNode }) {
    // A new snippet deserves a fresh attempt.
    if (prev.children !== this.props.children && this.state.failed) {
      this.setState({ failed: false });
    }
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function ReactPreview({
  source,
  onLogs,
}: {
  source: string;
  onLogs?: (logs: string[]) => void;
}) {
  const [error, setError] = React.useState<string | null>(null);
  const [rendered, setRendered] = React.useState<{
    Component: React.ComponentType;
    key: number;
  } | null>(null);
  const keyRef = React.useRef(0);

  React.useEffect(() => {
    try {
      const { Component, logs } = compileSnippet(source);
      keyRef.current += 1;
      setRendered({ Component, key: keyRef.current });
      setError(null);
      onLogs?.(logs);
    } catch (err) {
      setRendered(null);
      setError(
        err instanceof SnippetError
          ? `${err.phase === "compile" ? "Syntax error" : "Error while running"}: ${err.message}`
          : String(err),
      );
    }
    // onLogs is deliberately not a dependency — callers pass inline closures.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  if (error) {
    return (
      <div className="text-destructive rounded-md border border-destructive/30 bg-destructive/5 p-3 font-mono text-xs whitespace-pre-wrap">
        {error}
      </div>
    );
  }

  if (!rendered) return null;

  const { Component, key } = rendered;

  return (
    <div className="bg-background rounded-md border p-4">
      <PreviewBoundary key={key} onError={setError}>
        <Component />
      </PreviewBoundary>
    </div>
  );
}
