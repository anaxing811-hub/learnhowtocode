"use client";

import Link from "next/link";
import { CheckIcon } from "lucide-react";

import { useProgress } from "@/lib/progress/store";
import type { TrackModule } from "@/lib/content";
import { TRACKS, type TrackId } from "@/lib/tracks";
import { cn } from "@/lib/utils";

/**
 * Desktop-only lesson index. On a phone the header's sheet menu covers
 * navigation, and a 300px column would eat the reading width.
 */
export function LessonSidebar({
  track,
  modules,
  currentSlug,
}: {
  track: TrackId;
  modules: TrackModule[];
  currentSlug: string;
}) {
  const { isComplete } = useProgress();

  return (
    <aside className="sticky top-20 hidden h-[calc(100dvh-6rem)] w-64 shrink-0 lg:block">
      <div className="scrollbar-thin h-full overflow-y-auto pr-2">
        <Link
          href={`/learn/${track}`}
          className="mb-3 flex items-center gap-2 text-sm font-semibold"
        >
          <span
            className="size-2.5 rounded-full"
            style={{ background: TRACKS[track].colorVar }}
          />
          {TRACKS[track].name}
        </Link>

        {modules.map((mod) => (
          <div key={mod.name} className="mb-5">
            <p className="text-muted-foreground mb-1.5 text-[11px] font-semibold tracking-wide uppercase">
              {mod.name}
            </p>
            <ul className="border-border/70 space-y-0.5 border-l">
              {mod.lessons.map((lesson) => {
                const active = lesson.slug === currentSlug;
                const done = isComplete(track, lesson.slug);
                return (
                  <li key={lesson.slug}>
                    <Link
                      href={`/learn/${track}/${lesson.slug}`}
                      className={cn(
                        "-ml-px flex items-center gap-1.5 border-l-2 py-1 pr-2 pl-3 text-[13px] leading-5 transition-colors",
                        active
                          ? "border-primary text-foreground font-medium"
                          : "hover:text-foreground border-transparent text-muted-foreground",
                      )}
                    >
                      {done && (
                        <CheckIcon className="size-3 shrink-0 text-emerald-500" />
                      )}
                      <span className={cn(!done && "pl-0")}>{lesson.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
}
