import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { Problem, ProblemLang, TestCase } from "./content";

export type Verdict =
  | "accepted"
  | "wrong_answer"
  | "compile_error"
  | "runtime_error"
  | "timeout";

export interface TestOutcome {
  index: number;
  sample: boolean;
  verdict: Verdict;
  passed: boolean;
  expected: string;
  actual: string;
  stderr: string;
  ms: number;
}

export interface RunReport {
  verdict: Verdict;
  passed: number;
  total: number;
  outcomes: TestOutcome[];
  compileError?: string;
}

export interface RunnerConfig {
  cppCompiler: string;
  cppStandard: string;
  pythonPath: string;
  timeLimitMultiplier: number;
}

/**
 * Same comparison rule as the website's judge: trailing whitespace on a line
 * and trailing blank lines are ignored, internal spacing is not.
 */
function normalize(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, ""))
    .join("\n")
    .replace(/\n+$/, "");
}

interface ExecResult {
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  ms: number;
}

function exec(
  command: string,
  args: string[],
  options: { stdin?: string; timeoutMs?: number; cwd?: string } = {},
): Promise<ExecResult> {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(command, args, { cwd: options.cwd });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = options.timeoutMs
      ? setTimeout(() => {
          timedOut = true;
          child.kill("SIGKILL");
        }, options.timeoutMs)
      : null;

    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));

    child.on("error", (err) => {
      if (timer) clearTimeout(timer);
      resolve({
        code: null,
        stdout,
        stderr: `${stderr}\n${err.message}`,
        timedOut,
        ms: Date.now() - started,
      });
    });

    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut, ms: Date.now() - started });
    });

    if (options.stdin !== undefined) child.stdin.write(options.stdin);
    child.stdin.end();
  });
}

/** Confirms the configured toolchain exists, so we can give a useful message. */
export async function checkToolchain(
  language: ProblemLang,
  config: RunnerConfig,
): Promise<string | null> {
  const command = language === "cpp" ? config.cppCompiler : config.pythonPath;
  const result = await exec(command, ["--version"], { timeoutMs: 10_000 });
  if (result.code === 0) return null;
  return (
    `Could not run "${command}". ` +
    (language === "cpp"
      ? "Install a C++ compiler (Xcode Command Line Tools on macOS, build-essential on Debian/Ubuntu, MinGW-w64 or MSVC on Windows), or set lhtc.cppCompiler to its path."
      : "Install Python 3, or set lhtc.pythonPath to your interpreter.")
  );
}

export async function runProblem(
  problem: Problem,
  sourcePath: string,
  language: ProblemLang,
  config: RunnerConfig,
  onProgress?: (done: number, total: number) => void,
): Promise<RunReport> {
  const tests: TestCase[] = problem.tests;
  const timeLimit = problem.timeLimitMs * Math.max(1, config.timeLimitMultiplier);

  let runCommand: string;
  let runArgs: string[];
  let tempDir: string | null = null;

  if (language === "cpp") {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "lhtc-"));
    const binary = path.join(tempDir, process.platform === "win32" ? "a.exe" : "a.out");

    const compile = await exec(
      config.cppCompiler,
      [`-std=${config.cppStandard}`, "-O2", "-o", binary, sourcePath],
      { timeoutMs: 60_000 },
    );

    if (compile.code !== 0) {
      await fs.rm(tempDir, { recursive: true, force: true });
      return {
        verdict: "compile_error",
        passed: 0,
        total: tests.length,
        outcomes: [],
        compileError: compile.stderr || compile.stdout || "Compilation failed.",
      };
    }

    runCommand = binary;
    runArgs = [];
  } else {
    runCommand = config.pythonPath;
    runArgs = [sourcePath];
  }

  const outcomes: TestOutcome[] = [];

  for (const [index, test] of tests.entries()) {
    const result = await exec(runCommand, runArgs, {
      stdin: test.input,
      timeoutMs: timeLimit,
    });

    const expected = normalize(test.output);
    const actual = normalize(result.stdout);

    let verdict: Verdict;
    if (result.timedOut) verdict = "timeout";
    else if (result.code !== 0) verdict = "runtime_error";
    else if (expected !== actual) verdict = "wrong_answer";
    else verdict = "accepted";

    outcomes.push({
      index,
      sample: Boolean(test.sample),
      verdict,
      passed: verdict === "accepted",
      expected: test.output,
      actual: result.stdout,
      stderr: result.stderr,
      ms: result.ms,
    });

    onProgress?.(index + 1, tests.length);
  }

  if (tempDir) await fs.rm(tempDir, { recursive: true, force: true });

  const failure = outcomes.find((o) => !o.passed);
  return {
    verdict: failure ? failure.verdict : "accepted",
    passed: outcomes.filter((o) => o.passed).length,
    total: tests.length,
    outcomes,
  };
}
