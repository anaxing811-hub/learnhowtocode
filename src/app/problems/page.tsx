import type { Metadata } from "next";

import { TIERS, getProblems, getProblemStats } from "@/lib/problems";
import { ProblemTierList } from "@/components/problems/problem-tier-list";

export const metadata: Metadata = {
  title: "Problem sets",
  description:
    "Graded programming problems from warm-up to olympiad level, each with a full hidden test suite.",
};

export default function ProblemsPage() {
  const problems = getProblems();
  const stats = getProblemStats();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Problem sets</h1>
      <p className="text-muted-foreground mt-2 max-w-2xl leading-7">
        {stats.total} problems and {stats.tests} test cases. Write a solution in
        C++ or Python, submit it, and it is compiled and judged on your own
        machine against every test — the same way a contest judge would, minus
        the queue.
      </p>

      <div className="bg-muted/40 mt-6 rounded-lg border p-4 text-sm">
        <p className="font-medium">About these problems</p>
        <p className="text-muted-foreground mt-1 leading-6">
          Every statement and every test case here is original, written for this
          site. The difficulty tiers are <em>calibrated against</em> USACO&apos;s
          divisions so you know roughly where you stand, but no problem is
          copied from USACO or any other contest. When you are ready for the
          real thing, go to{" "}
          <a
            href="https://usaco.org/"
            target="_blank"
            rel="noreferrer noopener"
            className="text-primary hover:underline"
          >
            usaco.org
          </a>{" "}
          and enter a contest.
        </p>
      </div>

      <div className="mt-10 space-y-10">
        {TIERS.map((tier) => (
          <ProblemTierList
            key={tier.id}
            tier={tier}
            problems={problems
              .filter((p) => p.tier === tier.id)
              .map((p) => ({
                id: p.id,
                title: p.title,
                topics: p.topics,
                testCount: p.tests.length,
              }))}
          />
        ))}
      </div>
    </div>
  );
}
