"use client";

import Link from "next/link";
import { ArrowRightIcon, CheckIcon } from "lucide-react";

import { useProgress } from "@/lib/progress/store";
import { Button } from "@/components/ui/button";
import type { TrackId } from "@/lib/tracks";

export function CompleteButton({
  track,
  slug,
  nextHref,
}: {
  track: TrackId;
  slug: string;
  nextHref: string | null;
}) {
  const { isComplete, setComplete } = useProgress();
  const done = isComplete(track, slug);

  return (
    <div className="bg-muted/40 mt-12 flex flex-wrap items-center gap-3 rounded-xl border p-4">
      <Button
        variant={done ? "outline" : "default"}
        onClick={() => setComplete(track, slug, !done)}
      >
        <CheckIcon />
        {done ? "Completed — undo" : "Mark as complete"}
      </Button>

      {nextHref && (
        <Button asChild variant={done ? "default" : "ghost"}>
          <Link href={nextHref}>
            Next lesson <ArrowRightIcon />
          </Link>
        </Button>
      )}

      <p className="text-muted-foreground ml-auto text-xs">
        Progress is saved in this browser
        {/* The sync hint only makes sense once a backend exists. */}
      </p>
    </div>
  );
}
