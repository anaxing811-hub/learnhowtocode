import fs from "node:fs";
import path from "node:path";

import matter from "gray-matter";

import { CONTENT_ROOT } from "./content";

const PROBLEM_ROOT = path.join(CONTENT_ROOT, "problems");

export type Tier = "warmup" | "bronze" | "silver" | "gold";

export const TIERS: {
  id: Tier;
  name: string;
  blurb: string;
  colorVar: string;
}[] = [
  {
    id: "warmup",
    name: "Warm-up",
    blurb:
      "One idea each, no algorithms. If you can write a loop and an if, you can finish these.",
    colorVar: "var(--track-python)",
  },
  {
    id: "bronze",
    name: "Bronze",
    blurb:
      "Careful simulation, sorting, and complete search over small inputs. Calibrated to USACO Bronze.",
    colorVar: "var(--track-arduino)",
  },
  {
    id: "silver",
    name: "Silver",
    blurb:
      "Binary search, prefix sums, two pointers, graph traversal. You now have to think about complexity.",
    colorVar: "var(--track-react)",
  },
  {
    id: "gold",
    name: "Gold",
    blurb:
      "Dynamic programming, shortest paths, and data structures that need to be chosen, not just used.",
    colorVar: "var(--track-cpp)",
  },
];

export type ProblemLang = "cpp" | "python";

export interface TestCase {
  input: string;
  output: string;
  /** Sample tests are shown in the statement; the rest stay hidden. */
  sample?: boolean;
  label?: string;
}

export interface Problem {
  id: string;
  title: string;
  tier: Tier;
  /** Ordering within the tier. */
  order: number;
  topics: string[];
  /** Wall-clock budget per test case. */
  timeLimitMs: number;
  statement: string;
  starter: Partial<Record<ProblemLang, string>>;
  solution: Partial<Record<ProblemLang, string>>;
  tests: TestCase[];
  /** Progressive hints, revealed one at a time. */
  hints: string[];
}

interface ProblemFrontmatter {
  title: string;
  tier: Tier;
  order: number;
  topics?: string[];
  timeLimitMs?: number;
  starter?: Partial<Record<ProblemLang, string>>;
  solution?: Partial<Record<ProblemLang, string>>;
  hints?: string[];
}

let cache: Problem[] | null = null;

function loadAll(): Problem[] {
  if (cache) return cache;
  if (!fs.existsSync(PROBLEM_ROOT)) {
    cache = [];
    return cache;
  }

  const problems: Problem[] = [];

  for (const file of fs.readdirSync(PROBLEM_ROOT)) {
    if (!file.endsWith(".mdx")) continue;

    const id = file.replace(/\.mdx$/, "");
    const raw = fs.readFileSync(path.join(PROBLEM_ROOT, file), "utf8");
    const { data, content } = matter(raw);
    const fm = data as Partial<ProblemFrontmatter>;

    if (!fm.title || !fm.tier || typeof fm.order !== "number") {
      throw new Error(
        `content/problems/${file}: frontmatter needs "title", "tier" and a numeric "order"`,
      );
    }

    const testPath = path.join(PROBLEM_ROOT, `${id}.tests.json`);
    if (!fs.existsSync(testPath)) {
      throw new Error(`content/problems/${id}.tests.json is missing`);
    }
    const tests = JSON.parse(fs.readFileSync(testPath, "utf8")) as TestCase[];
    if (!Array.isArray(tests) || tests.length === 0) {
      throw new Error(`content/problems/${id}.tests.json has no test cases`);
    }

    problems.push({
      id,
      title: fm.title,
      tier: fm.tier,
      order: fm.order,
      topics: fm.topics ?? [],
      timeLimitMs: fm.timeLimitMs ?? 2000,
      statement: content,
      starter: fm.starter ?? {},
      solution: fm.solution ?? {},
      hints: fm.hints ?? [],
      tests,
    });
  }

  const tierOrder = TIERS.map((t) => t.id);
  problems.sort(
    (a, b) =>
      tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier) ||
      a.order - b.order,
  );

  cache = problems;
  return problems;
}

export function getProblems(): Problem[] {
  return loadAll();
}

export function getProblem(id: string): Problem | undefined {
  return loadAll().find((p) => p.id === id);
}

export function getProblemsByTier(tier: Tier): Problem[] {
  return loadAll().filter((p) => p.tier === tier);
}

export function getProblemStats() {
  const all = loadAll();
  return {
    total: all.length,
    byTier: Object.fromEntries(
      TIERS.map((t) => [t.id, all.filter((p) => p.tier === t.id).length]),
    ) as Record<Tier, number>,
    tests: all.reduce((n, p) => n + p.tests.length, 0),
  };
}

/** Sample tests are safe to show; hidden ones are what the grader actually uses. */
export function publicTests(problem: Problem): TestCase[] {
  return problem.tests.filter((t) => t.sample);
}
