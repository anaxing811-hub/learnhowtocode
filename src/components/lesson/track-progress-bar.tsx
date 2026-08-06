"use client";

import { useProgress } from "@/lib/progress/store";
import { Progress } from "@/components/ui/progress";
import type { TrackId } from "@/lib/tracks";
import { cn } from "@/lib/utils";

export function TrackProgressBar({
  track,
  slugs,
  className,
}: {
  track: TrackId;
  slugs: string[];
  className?: string;
}) {
  const { trackCompletion } = useProgress();
  const done = trackCompletion(track, slugs);
  const pct = slugs.length ? Math.round((done / slugs.length) * 100) : 0;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Your progress</span>
        <span className="text-muted-foreground tabular-nums">
          {done} / {slugs.length} lessons
        </span>
      </div>
      <Progress value={pct} />
    </div>
  );
}
