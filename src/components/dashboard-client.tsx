"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  DownloadIcon,
  FlameIcon,
  UploadIcon,
} from "lucide-react";

import { useProgress } from "@/lib/progress/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AuthPanel } from "@/components/auth-panel";
import type { TrackId } from "@/lib/tracks";
import type { Tier } from "@/lib/problems";

interface TrackSummary {
  id: TrackId;
  name: string;
  colorVar: string;
  lessons: { slug: string; title: string; module: string }[];
}

export function DashboardClient({
  tracks,
  problems,
}: {
  tracks: TrackSummary[];
  problems: { id: string; title: string; tier: Tier }[];
}) {
  const progress = useProgress();
  const fileInput = useRef<HTMLInputElement>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const totalLessons = tracks.reduce((n, t) => n + t.lessons.length, 0);
  const totalDone = tracks.reduce(
    (n, t) => n + progress.trackCompletion(t.id, t.lessons.map((l) => l.slug)),
    0,
  );
  const solved = problems.filter(
    (p) => progress.problems[p.id]?.verdict === "accepted",
  ).length;

  const exportProgress = () => {
    const blob = new Blob([progress.exportJson()], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "learnhowtocode-progress.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importProgress = async (file: File) => {
    const text = await file.text();
    setImportMessage(
      progress.importJson(text)
        ? "Progress restored."
        : "That file could not be read as progress data.",
    );
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Your progress</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Lessons completed" value={`${totalDone} / ${totalLessons}`} />
        <Stat label="Problems solved" value={`${solved} / ${problems.length}`} />
        <Stat
          label="Current streak"
          value={
            <span className="inline-flex items-center gap-1.5">
              <FlameIcon className="size-5 text-amber-500" />
              {progress.streak} {progress.streak === 1 ? "day" : "days"}
            </span>
          }
        />
      </div>

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-bold tracking-tight">By track</h2>
        <div className="space-y-4">
          {tracks.map((track) => {
            const slugs = track.lessons.map((l) => l.slug);
            const done = progress.trackCompletion(track.id, slugs);
            const pct = slugs.length ? Math.round((done / slugs.length) * 100) : 0;
            const nextLesson = track.lessons.find(
              (l) => !progress.isComplete(track.id, l.slug),
            );

            return (
              <Card key={track.id}>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ background: track.colorVar }}
                    />
                    <h3 className="font-semibold">{track.name}</h3>
                    <span className="text-muted-foreground ml-auto text-sm tabular-nums">
                      {done} / {slugs.length}
                    </span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                  {nextLesson ? (
                    <Button asChild variant="ghost" size="sm" className="-ml-2">
                      <Link href={`/learn/${track.id}/${nextLesson.slug}`}>
                        Continue: {nextLesson.title} <ArrowRightIcon />
                      </Link>
                    </Button>
                  ) : slugs.length > 0 ? (
                    <Badge variant="success">Track complete</Badge>
                  ) : (
                    <p className="text-muted-foreground text-sm italic">
                      No lessons published for this track yet.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-bold tracking-tight">
          Sync across devices
        </h2>
        <AuthPanel />
      </section>

      <section className="mt-8">
        <h2 className="mb-2 text-lg font-bold tracking-tight">
          Move progress by hand
        </h2>
        <p className="text-muted-foreground mb-3 text-sm">
          Works with or without an account — a plain JSON file you can carry
          between browsers.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportProgress}>
            <DownloadIcon /> Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInput.current?.click()}
          >
            <UploadIcon /> Import
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importProgress(file);
            }}
          />
          {importMessage && (
            <span className="text-muted-foreground text-sm">{importMessage}</span>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent>
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {label}
        </p>
        <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
