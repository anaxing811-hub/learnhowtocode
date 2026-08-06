"use client";

import Link from "next/link";
import { CheckCircle2Icon, CircleIcon, ClockIcon } from "lucide-react";

import { useProgress } from "@/lib/progress/store";
import type { TrackModule } from "@/lib/content";
import type { TrackId } from "@/lib/tracks";
import { cn } from "@/lib/utils";

export function ModuleList({
  track,
  modules,
}: {
  track: TrackId;
  modules: TrackModule[];
}) {
  const { isComplete } = useProgress();

  return (
    <div className="space-y-8">
      {modules.map((mod, modIndex) => (
        <section key={mod.name}>
          <h2 className="mb-2 flex items-baseline gap-2 text-sm font-semibold tracking-wide uppercase">
            <span className="text-muted-foreground font-mono text-xs">
              {String(modIndex + 1).padStart(2, "0")}
            </span>
            {mod.name}
          </h2>

          <ol className="divide-border overflow-hidden rounded-lg border divide-y">
            {mod.lessons.map((lesson) => {
              const done = isComplete(track, lesson.slug);
              return (
                <li key={lesson.slug}>
                  <Link
                    href={`/learn/${track}/${lesson.slug}`}
                    className="hover:bg-accent/60 flex items-center gap-3 px-3 py-2.5 transition-colors"
                  >
                    {done ? (
                      <CheckCircle2Icon className="size-4 shrink-0 text-emerald-500" />
                    ) : (
                      <CircleIcon className="text-muted-foreground/40 size-4 shrink-0" />
                    )}
                    <span
                      className={cn(
                        "flex-1 text-sm",
                        done && "text-muted-foreground",
                      )}
                    >
                      {lesson.title}
                    </span>
                    <span className="text-muted-foreground inline-flex shrink-0 items-center gap-1 text-[11px]">
                      <ClockIcon className="size-3" />
                      {lesson.minutes}m
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
