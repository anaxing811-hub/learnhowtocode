"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  Loader2Icon,
  PlayIcon,
  RotateCcwIcon,
  SmartphoneIcon,
  SquareIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Editor } from "@/components/runners/editor";
import { BoardSim } from "@/components/runners/board-sim";
import { ReactPreview } from "@/components/runners/react-preview";
import { useCanRunCode } from "@/hooks/use-media-query";
import { runCpp, terminateCpp } from "@/lib/runtime/cpp-engine";
import { runPython, terminatePython } from "@/lib/runtime/python-engine";
import {
  buildArduinoSource,
  parseArduinoOutput,
  type ArduinoEvent,
} from "@/lib/runtime/arduino-prelude";
import type { RunResult } from "@/lib/runtime/protocol";
import type { RunnerLang } from "@/lib/tracks";
import { cn } from "@/lib/utils";

export interface CodeRunnerProps {
  lang: RunnerLang;
  initialCode: string;
  /** Prefilled program input, for lessons that read from stdin. */
  stdin?: string;
  /** Show the stdin box so the reader can change the input. */
  editableStdin?: boolean;
  title?: string;
  /** Pins to draw on the simulated board (Arduino only). */
  ledPins?: number[];
  /** Pin the "Press button" control drives (Arduino only). */
  buttonPin?: number;
  /** Milliseconds of sketch time to simulate (Arduino only). */
  budgetMs?: number;
  className?: string;
}

const FILE_EXTENSION: Record<RunnerLang, string> = {
  cpp: "cpp",
  arduino: "ino",
  python: "py",
  jsx: "jsx",
  js: "js",
};

export function CodeRunner({
  lang,
  initialCode,
  stdin: initialStdin = "",
  editableStdin = false,
  title,
  ledPins,
  buttonPin,
  budgetMs,
  className,
}: CodeRunnerProps) {
  const canRun = useCanRunCode();

  const [code, setCode] = useState(initialCode);
  const [stdin, setStdin] = useState(initialStdin);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [events, setEvents] = useState<ArduinoEvent[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [liveOut, setLiveOut] = useState("");

  // Extra button edges appended to the Arduino input schedule.
  const [edges, setEdges] = useState<string[]>([]);
  const runToken = useRef(0);

  const isLive = lang === "jsx" || lang === "js";
  const dirty = code !== initialCode;

  const run = useCallback(async () => {
    const token = ++runToken.current;
    setBusy(true);
    setStatus(null);
    setLiveOut("");
    setResult(null);

    const append = (t: string) => setLiveOut((prev) => prev + t);

    try {
      let res: RunResult;

      if (lang === "python") {
        res = await runPython(code, {
          stdin,
          onStdout: append,
          onStderr: append,
          onStatus: setStatus,
        });
      } else if (lang === "arduino") {
        const schedule = edges.join("\n");
        res = await runCpp(buildArduinoSource(code, { budgetMs }), {
          stdin: schedule,
          filename: "sketch.cpp",
          onStatus: setStatus,
        });
        const { events: parsed, plain } = parseArduinoOutput(res.stdout);
        if (token === runToken.current) {
          setEvents(parsed);
          append(plain);
        }
        res = { ...res, stdout: plain };
      } else {
        res = await runCpp(code, {
          stdin,
          onStdout: append,
          onStderr: append,
          onStatus: setStatus,
        });
      }

      if (token === runToken.current) {
        setResult(res);
        setStatus(null);
      }
    } finally {
      if (token === runToken.current) setBusy(false);
    }
  }, [code, stdin, lang, edges, budgetMs]);

  // Re-run automatically when a button press adds a scheduled edge.
  const firstEdgeRun = useRef(true);
  useEffect(() => {
    if (firstEdgeRun.current) {
      firstEdgeRun.current = false;
      return;
    }
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edges]);

  const stop = () => {
    runToken.current++;
    if (lang === "python") terminatePython();
    else terminateCpp();
    setBusy(false);
    setStatus(null);
  };

  const reset = () => {
    setCode(initialCode);
    setStdin(initialStdin);
    setResult(null);
    setEvents([]);
    setEdges([]);
    setLiveOut("");
  };

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const download = () => {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title?.replace(/\W+/g, "-").toLowerCase() || "snippet"}.${FILE_EXTENSION[lang]}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const output = useMemo(() => {
    if (liveOut) return liveOut;
    if (!result) return "";
    return [result.stdout, result.stderr].filter(Boolean).join("");
  }, [liveOut, result]);

  return (
    <div
      data-testid="code-runner"
      data-lang={lang}
      className={cn(
        "not-prose bg-card my-6 overflow-hidden rounded-xl border shadow-sm",
        className,
      )}
    >
      {/* Toolbar */}
      <div className="bg-muted/50 flex flex-wrap items-center gap-2 border-b px-3 py-2">
        <span className="font-mono text-xs font-medium">
          {title ?? `${labelFor(lang)} example`}
        </span>
        {dirty && (
          <Badge variant="secondary" className="text-[10px]">
            edited
          </Badge>
        )}

        <div className="ml-auto flex items-center gap-1">
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={copy}
            aria-label="Copy code"
          >
            {copied ? (
              <CheckIcon className="size-3.5 text-emerald-500" />
            ) : (
              <CopyIcon className="size-3.5" />
            )}
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={download}
            aria-label="Download file"
          >
            <DownloadIcon className="size-3.5" />
          </Button>
          {dirty && (
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={reset}
              aria-label="Reset to the original code"
            >
              <RotateCcwIcon className="size-3.5" />
            </Button>
          )}
          {canRun &&
            !isLive &&
            (busy ? (
              <Button size="sm" variant="destructive" onClick={stop}>
                <SquareIcon className="size-3" />
                Stop
              </Button>
            ) : (
              <Button size="sm" onClick={() => void run()}>
                <PlayIcon className="size-3" />
                Run
              </Button>
            ))}
        </div>
      </div>

      <Editor
        value={code}
        onChange={canRun ? setCode : undefined}
        readOnly={!canRun}
        lang={lang}
      />

      {/* Phone: reading mode */}
      {!canRun && (
        <div className="text-muted-foreground flex items-center gap-2 border-t px-3 py-2 text-xs">
          <SmartphoneIcon className="size-3.5 shrink-0" />
          <span>
            Reading mode. Open this lesson on a laptop to edit and run the code —
            the compiler is a large download that is not worth it on a phone.
          </span>
        </div>
      )}

      {/* stdin */}
      {canRun && editableStdin && !isLive && (
        <div className="border-t px-3 py-2">
          <label className="text-muted-foreground mb-1 block text-[11px] font-medium tracking-wide uppercase">
            Program input (stdin)
          </label>
          <textarea
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            rows={2}
            spellCheck={false}
            className="bg-background focus-visible:ring-ring/50 w-full resize-y rounded-md border p-2 font-mono text-xs focus-visible:ring-[3px] focus-visible:outline-none"
          />
        </div>
      )}

      {/* Live React preview */}
      {isLive && canRun && (
        <div className="border-t p-3">
          <div className="text-muted-foreground mb-2 text-[11px] font-medium tracking-wide uppercase">
            Live preview
          </div>
          <ReactPreview source={code} onLogs={setLogs} />
          {logs.length > 0 && (
            <pre className="text-muted-foreground mt-2 rounded-md border bg-muted/40 p-2 font-mono text-[11px] whitespace-pre-wrap">
              {logs.join("\n")}
            </pre>
          )}
        </div>
      )}

      {/* Arduino board */}
      {lang === "arduino" && canRun && events.length > 0 && (
        <div className="border-t p-3">
          <BoardSim
            events={events}
            ledPins={ledPins}
            buttonPin={buttonPin}
            onButtonPress={(at) =>
              setEdges((prev) => [
                ...prev,
                `${at} ${buttonPin} 0`,
                `${at + 250_000} ${buttonPin} 1`,
              ])
            }
          />
        </div>
      )}

      {/* Status + output */}
      {canRun && !isLive && (status || output || result) && (
        <div className="border-t">
          <div className="text-muted-foreground flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium tracking-wide uppercase">
            <span>Output</span>
            {busy && <Loader2Icon className="size-3 animate-spin" />}
            {status && <span className="normal-case">{status}</span>}
            {result && !busy && (
              <span className="ml-auto flex items-center gap-2 normal-case">
                {result.ok ? (
                  <Badge variant="success" className="text-[10px]">
                    exit 0
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-[10px]">
                    {result.error ?? "failed"}
                  </Badge>
                )}
                <span className="font-mono">{result.durationMs} ms</span>
              </span>
            )}
          </div>
          {(output || result) && (
            <pre
              data-testid="runner-output"
              className={cn(
                "scrollbar-thin max-h-64 overflow-auto border-t bg-[#12161c] px-3 py-2 font-mono text-[12px] leading-5 whitespace-pre-wrap",
                result && !result.ok ? "text-red-300" : "text-slate-200",
              )}
            >
              {output || "(no output)"}
            </pre>
          )}
          {result?.images.map((img, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={`data:image/png;base64,${img}`}
              alt={`Figure ${i + 1}`}
              className="w-full border-t bg-white"
            />
          ))}
        </div>
      )}
    </div>
  );
}

function labelFor(lang: RunnerLang) {
  switch (lang) {
    case "cpp":
      return "C++";
    case "arduino":
      return "Arduino";
    case "python":
      return "Python";
    default:
      return "React";
  }
}
