"use client";

import {
  compileCppProgram,
  runCompiledProgram,
  type CompiledProgram,
} from "@/lib/runtime/cpp-engine";
import { runPython } from "@/lib/runtime/python-engine";
import type { ProblemLang, TestCase } from "@/lib/problems";

export type Verdict =
  | "accepted"
  | "wrong_answer"
  | "compile_error"
  | "runtime_error"
  | "timeout";

export interface TestOutcome {
  index: number;
  label?: string;
  sample: boolean;
  passed: boolean;
  verdict: Verdict;
  expected: string;
  actual: string;
  stderr: string;
  durationMs: number;
}

export interface JudgeResult {
  verdict: Verdict;
  passed: number;
  total: number;
  outcomes: TestOutcome[];
  compileError?: string;
  totalMs: number;
}

/**
 * Output comparison.
 *
 * Competitive judges normally ignore trailing whitespace on each line and
 * trailing blank lines at the end, because those differences are invisible and
 * almost never what the problem is testing. We do the same, but we do *not*
 * collapse internal whitespace — spacing between numbers on a line is real.
 */
export function normalizeOutput(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, ""))
    .join("\n")
    .replace(/\n+$/, "");
}

export interface JudgeOptions {
  onProgress?: (done: number, total: number) => void;
  onStatus?: (text: string) => void;
  /** Stop at the first failure. Faster feedback while iterating. */
  stopOnFirstFailure?: boolean;
}

export async function judge(
  source: string,
  language: ProblemLang,
  tests: TestCase[],
  timeLimitMs: number,
  options: JudgeOptions = {},
): Promise<JudgeResult> {
  const started = performance.now();
  const outcomes: TestOutcome[] = [];

  // Compile once, then run the same binary against every test. Compiling per
  // test would repeat by far the most expensive step of the cycle — for a
  // 15-test suite that is 15 identical compiles.
  let program: CompiledProgram | undefined;
  if (language === "cpp") {
    options.onStatus?.("Compiling your submission…");
    const build = await compileCppProgram(source, options.onStatus);
    if (!build.ok) {
      return {
        verdict: "compile_error",
        passed: 0,
        total: tests.length,
        outcomes: [],
        compileError: build.diagnostics || `${build.stage} failed`,
        totalMs: Math.round(performance.now() - started),
      };
    }
    program = build.program;
  }

  for (const [index, test] of tests.entries()) {
    const testStart = performance.now();

    const result =
      language === "cpp"
        ? await runCompiledProgram(program!, test.input)
        : await runPython(source, { stdin: test.input });

    const durationMs = Math.round(performance.now() - testStart);

    const expected = normalizeOutput(test.output);
    const actual = normalizeOutput(result.stdout);

    let verdict: Verdict;
    if (durationMs > timeLimitMs) verdict = "timeout";
    else if (!result.ok) verdict = "runtime_error";
    else if (actual !== expected) verdict = "wrong_answer";
    else verdict = "accepted";

    outcomes.push({
      index,
      label: test.label,
      sample: Boolean(test.sample),
      passed: verdict === "accepted",
      verdict,
      expected: test.output,
      actual: result.stdout,
      stderr: result.stderr,
      durationMs,
    });

    options.onProgress?.(index + 1, tests.length);

    if (verdict !== "accepted" && options.stopOnFirstFailure) break;
  }

  const passed = outcomes.filter((o) => o.passed).length;
  const firstFailure = outcomes.find((o) => !o.passed);

  return {
    verdict: firstFailure ? firstFailure.verdict : "accepted",
    passed,
    total: tests.length,
    outcomes,
    totalMs: Math.round(performance.now() - started),
  };
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  accepted: "Accepted",
  wrong_answer: "Wrong answer",
  compile_error: "Compile error",
  runtime_error: "Runtime error",
  timeout: "Time limit exceeded",
};
