"use client";

import { useState } from "react";
import { ChevronDownIcon, PencilRulerIcon } from "lucide-react";

import { CodeRunner } from "@/components/runners/code-runner";
import { Button } from "@/components/ui/button";
import type { RunnerLang } from "@/lib/tracks";
import { cn } from "@/lib/utils";

/**
 * A "now you try" block: a prompt, a starter file, and a solution the reader
 * has to deliberately choose to reveal.
 */
export function Exercise({
  title,
  lang,
  starter,
  solution,
  stdin,
  children,
}: {
  title: string;
  lang: RunnerLang;
  starter: string;
  solution?: string;
  stdin?: string;
  children?: React.ReactNode;
}) {
  const [showSolution, setShowSolution] = useState(false);

  return (
    <section className="not-prose border-primary/30 bg-primary/[0.03] my-8 rounded-xl border-2 border-dashed p-4">
      <header className="mb-2 flex items-center gap-2">
        <PencilRulerIcon className="text-primary size-4" />
        <h3 className="text-base font-semibold">{title}</h3>
      </header>

      {children && (
        <div className="lesson-prose mb-3 text-sm">{children}</div>
      )}

      <CodeRunner
        lang={lang}
        initialCode={starter}
        stdin={stdin}
        editableStdin={stdin !== undefined}
        title="your-attempt"
        className="my-0"
      />

      {solution && (
        <div className="mt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSolution((s) => !s)}
          >
            <ChevronDownIcon
              className={cn(
                "size-3.5 transition-transform",
                showSolution && "rotate-180",
              )}
            />
            {showSolution ? "Hide" : "Show"} one possible solution
          </Button>
          {showSolution && (
            <CodeRunner
              lang={lang}
              initialCode={solution}
              stdin={stdin}
              title="solution"
            />
          )}
        </div>
      )}
    </section>
  );
}
