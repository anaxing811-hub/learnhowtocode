"use client";

import Link from "next/link";
import { CheckCircle2Icon, CircleIcon, CircleDotIcon } from "lucide-react";

import { useProgress } from "@/lib/progress/store";
import { Badge } from "@/components/ui/badge";
import type { Tier } from "@/lib/problems";

interface ProblemRef {
  id: string;
  title: string;
  topics: string[];
  testCount: number;
}

export function ProblemTierList({
  tier,
  problems,
}: {
  tier: { id: Tier; name: string; blurb: string; colorVar: string };
  problems: ProblemRef[];
}) {
  const { problems: records } = useProgress();

  if (problems.length === 0) return null;

  const solved = problems.filter(
    (p) => records[p.id]?.verdict === "accepted",
  ).length;

  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <span
          className="size-3 rounded-full"
          style={{ background: tier.colorVar }}
        />
        <h2 className="text-lg font-bold tracking-tight">{tier.name}</h2>
        <span className="text-muted-foreground text-sm tabular-nums">
          {solved} / {problems.length} solved
        </span>
      </div>
      <p className="text-muted-foreground mb-3 text-sm">{tier.blurb}</p>

      <ul className="divide-border overflow-hidden rounded-lg border divide-y">
        {problems.map((problem) => {
          const record = records[problem.id];
          const accepted = record?.verdict === "accepted";
          const attempted = Boolean(record);

          return (
            <li key={problem.id}>
              <Link
                href={`/problems/${problem.id}`}
                className="hover:bg-accent/60 flex items-center gap-3 px-3 py-2.5 transition-colors"
              >
                {accepted ? (
                  <CheckCircle2Icon className="size-4 shrink-0 text-emerald-500" />
                ) : attempted ? (
                  <CircleDotIcon className="size-4 shrink-0 text-amber-500" />
                ) : (
                  <CircleIcon className="text-muted-foreground/40 size-4 shrink-0" />
                )}

                <span className="flex-1 text-sm font-medium">{problem.title}</span>

                <span className="hidden gap-1 sm:flex">
                  {problem.topics.slice(0, 2).map((topic) => (
                    <Badge key={topic} variant="outline" className="text-[10px]">
                      {topic}
                    </Badge>
                  ))}
                </span>

                <span className="text-muted-foreground shrink-0 font-mono text-[11px]">
                  {problem.testCount} tests
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
