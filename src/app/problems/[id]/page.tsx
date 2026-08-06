import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, ClockIcon } from "lucide-react";

import { getProblem, getProblems, publicTests, TIERS } from "@/lib/problems";
import { Mdx } from "@/components/lesson/mdx";
import { Badge } from "@/components/ui/badge";
import { ProblemWorkbench } from "@/components/problems/problem-workbench";

export function generateStaticParams() {
  return getProblems().map((p) => ({ id: p.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const problem = getProblem(id);
  if (!problem) return {};
  return { title: problem.title, description: problem.topics.join(", ") };
}

export default async function ProblemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const problem = getProblem(id);
  if (!problem) notFound();

  const tier = TIERS.find((t) => t.id === problem.tier)!;
  const samples = publicTests(problem);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link
        href="/problems"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeftIcon className="size-3.5" /> All problems
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{problem.title}</h1>
        <Badge style={{ background: tier.colorVar }} className="text-white">
          {tier.name}
        </Badge>
        <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
          <ClockIcon className="size-3" /> {problem.timeLimitMs} ms per test
        </span>
        {problem.topics.map((topic) => (
          <Badge key={topic} variant="outline" className="text-[10px]">
            {topic}
          </Badge>
        ))}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="lesson-prose min-w-0">
          <Mdx source={problem.statement} />

          {samples.length > 0 && (
            <section className="not-prose mt-6">
              <h2 className="mb-2 text-sm font-semibold tracking-wide uppercase">
                Sample tests
              </h2>
              <div className="space-y-3">
                {samples.map((test, i) => (
                  <div key={i} className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <p className="text-muted-foreground mb-1 text-[11px] font-medium tracking-wide uppercase">
                        Input
                      </p>
                      <pre className="overflow-x-auto rounded border p-2 font-mono text-[12px]">
                        {test.input}
                      </pre>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1 text-[11px] font-medium tracking-wide uppercase">
                        Expected output
                      </p>
                      <pre className="overflow-x-auto rounded border p-2 font-mono text-[12px]">
                        {test.output}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="min-w-0">
          {/* Only the samples cross the server/client boundary. The full suite
              is fetched from /problem-tests on submit. */}
          <ProblemWorkbench
            problemId={problem.id}
            samples={samples}
            testCount={problem.tests.length}
            starter={problem.starter}
            timeLimitMs={problem.timeLimitMs}
            hints={problem.hints}
          />
        </div>
      </div>
    </div>
  );
}
