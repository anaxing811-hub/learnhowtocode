import bundle from "./content.json";

export type TrackId = "cpp" | "arduino" | "python" | "react";
export type ProblemLang = "cpp" | "python";

export interface Lesson {
  slug: string;
  title: string;
  description: string;
  module: string;
  order: number;
  minutes: number;
  objectives: string[];
  body: string;
}

export interface TestCase {
  input: string;
  output: string;
  sample?: boolean;
  label?: string;
}

export interface Problem {
  id: string;
  title: string;
  tier: "warmup" | "bronze" | "silver" | "gold";
  order: number;
  topics: string[];
  timeLimitMs: number;
  statement: string;
  starter: Partial<Record<ProblemLang, string>>;
  hints: string[];
  tests: TestCase[];
}

interface Bundle {
  generatedAt: string;
  lessons: Record<TrackId, Lesson[]>;
  problems: Problem[];
}

const data = bundle as unknown as Bundle;

export const TRACK_NAMES: Record<TrackId, string> = {
  cpp: "C++",
  arduino: "Arduino",
  python: "Python",
  react: "React",
};

export const TIER_NAMES = {
  warmup: "Warm-up",
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
} as const;

export const TRACK_IDS: TrackId[] = ["cpp", "arduino", "python", "react"];

export function lessonsFor(track: TrackId): Lesson[] {
  return data.lessons[track] ?? [];
}

export function findLesson(track: TrackId, slug: string): Lesson | undefined {
  return lessonsFor(track).find((l) => l.slug === slug);
}

export function allProblems(): Problem[] {
  return data.problems;
}

export function findProblem(id: string): Problem | undefined {
  return data.problems.find((p) => p.id === id);
}
