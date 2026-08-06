"use client";

import { useState } from "react";
import { CheckCircle2Icon, XCircleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface QuizOption {
  text: string;
  correct?: boolean;
  /** Shown after answering — explain *why*, especially for wrong answers. */
  explain?: string;
}

/**
 * A single check-your-understanding question.
 *
 * Answers are revealed with an explanation for every option, not just the
 * right one — a wrong answer is only useful if the reader learns what they
 * were actually thinking.
 */
export function Quiz({
  question,
  options,
}: {
  question: string;
  options: QuizOption[];
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const correct = answered && options[picked]?.correct === true;

  return (
    <div className="not-prose my-6 rounded-xl border p-4">
      <p className="mb-3 text-sm font-medium">{question}</p>

      <div className="flex flex-col gap-2">
        {options.map((option, i) => {
          const isPicked = picked === i;
          const reveal = answered && (isPicked || option.correct);

          return (
            <button
              key={i}
              type="button"
              disabled={answered}
              onClick={() => setPicked(i)}
              className={cn(
                "flex w-full items-start gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                !answered && "hover:bg-accent hover:border-primary/40",
                reveal && option.correct && "border-emerald-500/50 bg-emerald-500/10",
                reveal &&
                  isPicked &&
                  !option.correct &&
                  "border-rose-500/50 bg-rose-500/10",
                answered && !reveal && "opacity-55",
              )}
            >
              <span className="mt-0.5 shrink-0">
                {reveal ? (
                  option.correct ? (
                    <CheckCircle2Icon className="size-4 text-emerald-600" />
                  ) : (
                    <XCircleIcon className="size-4 text-rose-600" />
                  )
                ) : (
                  <span className="border-muted-foreground/40 text-muted-foreground flex size-4 items-center justify-center rounded-full border text-[10px]">
                    {String.fromCharCode(65 + i)}
                  </span>
                )}
              </span>
              <span className="flex-1">
                <span className="[&_code]:bg-muted [&_code]:rounded [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.9em]">
                  {option.text}
                </span>
                {reveal && option.explain && (
                  <span className="text-muted-foreground mt-1 block text-xs">
                    {option.explain}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="mt-3 flex items-center gap-3">
          <span
            className={cn(
              "text-sm font-medium",
              correct ? "text-emerald-600" : "text-rose-600",
            )}
          >
            {correct ? "Correct." : "Not quite."}
          </span>
          <Button size="sm" variant="ghost" onClick={() => setPicked(null)}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
