"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2Icon,
  ChevronDownIcon,
  DownloadIcon,
  LightbulbIcon,
  Loader2Icon,
  PlayIcon,
  XCircleIcon,
} from "lucide-react";

import { Editor } from "@/components/runners/editor";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useCanRunCode } from "@/hooks/use-media-query";
import { useProgress } from "@/lib/progress/store";
import {
  judge,
  VERDICT_LABEL,
  type JudgeResult,
} from "@/lib/runtime/judge";
import type { ProblemLang, TestCase } from "@/lib/problems";
import { cn } from "@/lib/utils";

/**
 * Full test suites live in public/problem-tests and are fetched on first
 * submit — some run to megabytes, and inlining them into the page payload
 * would make simply reading a statement expensive.
 */
async function loadTests(problemId: string): Promise<TestCase[]> {
  const res = await fetch(`/problem-tests/${problemId}.json`);
  if (!res.ok) {
    throw new Error(
      `Could not load the test suite for "${problemId}" (${res.status}).`,
    );
  }
  return (await res.json()) as TestCase[];
}

export function ProblemWorkbench({
  problemId,
  title,
  samples,
  testCount,
  starter,
  timeLimitMs,
  hints,
}: {
  problemId: string;
  title: string;
  samples: TestCase[];
  testCount: number;
  starter: Partial<Record<ProblemLang, string>>;
  timeLimitMs: number;
  hints: string[];
}) {
  const canRun = useCanRunCode();
  const { recordProblem, problems } = useProgress();

  const languages = useMemo(
    () => (Object.keys(starter) as ProblemLang[]).filter((l) => starter[l]),
    [starter],
  );

  const [lang, setLang] = useState<ProblemLang>(languages[0] ?? "cpp");
  const [code, setCode] = useState(starter[languages[0] ?? "cpp"] ?? "");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  const [result, setResult] = useState<JudgeResult | null>(null);
  const [hintsShown, setHintsShown] = useState(0);

  const [loadError, setLoadError] = useState<string | null>(null);
  const best = problems[problemId];

  const switchLanguage = (next: ProblemLang) => {
    setLang(next);
    setCode(starter[next] ?? "");
    setResult(null);
  };

  const submit = async (onlySamples: boolean) => {
    setRunning(true);
    setResult(null);
    setLoadError(null);

    try {
      let suite: TestCase[];
      if (onlySamples) {
        suite = samples;
      } else {
        setProgress({ done: 0, total: testCount });
        suite = await loadTests(problemId);
      }
      setProgress({ done: 0, total: suite.length });

      const outcome = await judge(code, lang, suite, timeLimitMs, {
        onProgress: (done, total) => setProgress({ done, total }),
      });
      setResult(outcome);
      if (!onlySamples) {
        recordProblem(problemId, {
          verdict: outcome.verdict,
          passed: outcome.passed,
          total: outcome.total,
          at: Date.now(),
        });
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
      setProgress(null);
    }
  };

  const download = () => {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${problemId}.${lang === "cpp" ? "cpp" : "py"}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!canRun) {
    return (
      <div className="bg-muted/40 rounded-xl border p-4 text-sm">
        <p className="font-medium">Solving works best on a laptop.</p>
        <p className="text-muted-foreground mt-1">
          The judge compiles your submission locally, which means downloading a
          real toolchain — too heavy for a phone. Read the statement here, then
          come back on a desktop, or open the problem in VS&nbsp;Code.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="problem-workbench" className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {languages.length > 1 && (
          <Tabs value={lang} onValueChange={(v) => switchLanguage(v as ProblemLang)}>
            <TabsList>
              {languages.map((l) => (
                <TabsTrigger key={l} value={l}>
                  {l === "cpp" ? "C++" : "Python"}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}

        {best && (
          <Badge variant={best.verdict === "accepted" ? "success" : "secondary"}>
            best: {best.passed}/{best.total}
          </Badge>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" onClick={download} aria-label="Download">
            <DownloadIcon className="size-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={running || samples.length === 0}
            onClick={() => void submit(true)}
          >
            Run samples
          </Button>
          <Button size="sm" disabled={running} onClick={() => void submit(false)}>
            {running ? (
              <Loader2Icon className="size-3 animate-spin" />
            ) : (
              <PlayIcon className="size-3" />
            )}
            Submit
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Editor value={code} onChange={setCode} lang={lang} minHeight="18rem" maxHeight="34rem" />
      </div>

      {progress && (
        <p className="text-muted-foreground text-xs">
          Judging test {progress.done} of {progress.total}…
        </p>
      )}

      {loadError && (
        <p className="text-destructive text-sm">{loadError}</p>
      )}

      {result && <ResultPanel result={result} />}

      {hints.length > 0 && (
        <div className="rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <LightbulbIcon className="text-amber-500 size-4" />
            <span className="text-sm font-medium">Hints</span>
            {hintsShown < hints.length && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={() => setHintsShown((n) => n + 1)}
              >
                <ChevronDownIcon className="size-3.5" />
                Reveal hint {hintsShown + 1} of {hints.length}
              </Button>
            )}
          </div>
          {hintsShown > 0 && (
            <ol className="mt-2 ml-4 list-decimal space-y-1.5 text-sm">
              {hints.slice(0, hintsShown).map((hint, i) => (
                <li key={i} className="text-muted-foreground">
                  {hint}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}

function ResultPanel({ result }: { result: JudgeResult }) {
  const accepted = result.verdict === "accepted";

  return (
    <div
      data-testid="judge-result"
      className={cn(
        "rounded-lg border p-3",
        accepted
          ? "border-emerald-500/40 bg-emerald-500/5"
          : "border-rose-500/40 bg-rose-500/5",
      )}
    >
      <div className="flex items-center gap-2">
        {accepted ? (
          <CheckCircle2Icon className="size-4 text-emerald-600" />
        ) : (
          <XCircleIcon className="size-4 text-rose-600" />
        )}
        <span className="font-semibold">{VERDICT_LABEL[result.verdict]}</span>
        <span className="text-muted-foreground text-sm">
          {result.passed} / {result.total} tests
        </span>
        <span className="text-muted-foreground ml-auto font-mono text-xs">
          {result.totalMs} ms
        </span>
      </div>

      {result.compileError && (
        <pre className="scrollbar-thin mt-2 max-h-56 overflow-auto rounded border bg-[#12161c] p-2 font-mono text-[11px] whitespace-pre-wrap text-red-300">
          {result.compileError}
        </pre>
      )}

      {!result.compileError && (
        <div className="mt-2 flex flex-wrap gap-1">
          {result.outcomes.map((o) => (
            <span
              key={o.index}
              title={`Test ${o.index + 1}: ${VERDICT_LABEL[o.verdict]}`}
              className={cn(
                "flex size-6 items-center justify-center rounded font-mono text-[10px]",
                o.passed
                  ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                  : "bg-rose-500/20 text-rose-700 dark:text-rose-300",
              )}
            >
              {o.index + 1}
            </span>
          ))}
        </div>
      )}

      {/* Only ever reveal the details of a *sample* test. Showing a hidden
          test's input would turn the judge into a lookup table. */}
      {result.outcomes
        .filter((o) => !o.passed && o.sample)
        .slice(0, 1)
        .map((o) => (
          <div key={o.index} className="mt-3 grid gap-2 sm:grid-cols-2">
            <Field label="Expected" value={o.expected} />
            <Field label="Your output" value={o.actual || "(nothing)"} />
            {o.stderr && (
              <div className="sm:col-span-2">
                <Field label="Standard error" value={o.stderr} />
              </div>
            )}
          </div>
        ))}

      {result.outcomes.some((o) => !o.passed && !o.sample) &&
        !result.outcomes.some((o) => !o.passed && o.sample) && (
          <p className="text-muted-foreground mt-3 text-xs">
            The samples passed but a hidden test did not. That usually means an
            edge case: the smallest allowed input, the largest, a tie, or an
            empty result.
          </p>
        )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground mb-1 text-[11px] font-medium tracking-wide uppercase">
        {label}
      </p>
      <pre className="scrollbar-thin max-h-40 overflow-auto rounded border bg-background p-2 font-mono text-[11px] whitespace-pre-wrap">
        {value}
      </pre>
    </div>
  );
}
