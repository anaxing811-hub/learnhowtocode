"use client";

import Link from "next/link";
import { BookOpenIcon, ClockIcon } from "lucide-react";

import { useProgress } from "@/lib/progress/store";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { TrackMeta } from "@/lib/tracks";

export interface TrackCardData extends TrackMeta {
  lessonCount: number;
  moduleCount: number;
  minutes: number;
}

export function TrackCard({
  track,
  slugs = [],
}: {
  track: TrackCardData;
  slugs?: string[];
}) {
  const { trackCompletion } = useProgress();
  const done = slugs.length ? trackCompletion(track.id, slugs) : 0;
  const pct = slugs.length ? Math.round((done / slugs.length) * 100) : 0;

  return (
    <Card className="group hover:border-primary/40 h-full transition-colors">
      <CardContent className="flex h-full flex-col gap-3">
        <div className="flex items-center gap-2">
          <span
            className="flex size-9 items-center justify-center rounded-lg font-mono text-[11px] font-bold text-white"
            style={{ background: track.colorVar }}
          >
            {track.short}
          </span>
          <div>
            <h3 className="leading-tight font-semibold">
              <Link href={`/learn/${track.id}`} className="after:absolute after:inset-0">
                {track.name}
              </Link>
            </h3>
            <p className="text-muted-foreground text-xs">
              {track.lessonCount} lessons
            </p>
          </div>
        </div>

        <p className="text-muted-foreground flex-1 text-sm leading-6">
          {track.tagline}.
        </p>

        {slugs.length > 0 && done > 0 && (
          <div className="space-y-1">
            <Progress value={pct} className="h-1.5" />
            <p className="text-muted-foreground text-[11px]">
              {done} of {slugs.length} done
            </p>
          </div>
        )}

        <div className="text-muted-foreground flex items-center gap-3 text-[11px]">
          <span className="inline-flex items-center gap-1">
            <BookOpenIcon className="size-3" /> {track.moduleCount} modules
          </span>
          <span className="inline-flex items-center gap-1">
            <ClockIcon className="size-3" /> {formatDuration(track.minutes)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/** "45 min" under an hour, "~3 h" above it — never the useless "~0 h". */
function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return `~${hours < 10 ? hours.toFixed(1).replace(/\.0$/, "") : Math.round(hours)} h`;
}
