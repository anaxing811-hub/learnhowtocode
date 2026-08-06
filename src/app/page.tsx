import Link from "next/link";
import {
  ArrowRightIcon,
  CpuIcon,
  GraduationCapIcon,
  TerminalIcon,
  TrophyIcon,
} from "lucide-react";

import { getTrackStats, getTrackLessons } from "@/lib/content";
import { getProblemStats } from "@/lib/problems";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TrackCard } from "@/components/track-card";

export default function Home() {
  const tracks = getTrackStats();
  const problems = getProblemStats();
  const totalLessons = tracks.reduce((n, t) => n + t.lessonCount, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
      <section className="mx-auto max-w-3xl text-center">
        <p className="text-primary mb-3 font-mono text-xs tracking-[0.2em] uppercase">
          C++ · Arduino · Python · React
        </p>
        <h1 className="text-4xl font-black tracking-tight text-balance sm:text-5xl">
          Learn to code by running code, not by reading about it.
        </h1>
        <p className="text-muted-foreground mt-5 text-lg text-pretty">
          {totalLessons} lessons across four languages. A real clang compiler and
          real CPython run inside your browser, so every example on every page is
          something you can edit and execute — no installs, no accounts, nothing
          to configure.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/learn/cpp">
              Start with C++ <ArrowRightIcon />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/problems">Jump to the problem sets</Link>
          </Button>
        </div>
      </section>

      <section className="mt-16">
        <h2 className="mb-5 text-xl font-bold tracking-tight">Pick a track</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tracks.map((track) => (
            <TrackCard
              key={track.id}
              track={track}
              slugs={getTrackLessons(track.id).map((l) => l.slug)}
            />
          ))}
        </div>
      </section>

      <section className="mt-16 grid gap-4 md:grid-cols-3">
        <Feature
          icon={TerminalIcon}
          title="The compiler is really there"
          body="Not a sandbox that fakes output. clang, lld and libc++ are compiled to WebAssembly and run on your machine, so a missing semicolon gives you the same diagnostic it would in a terminal."
        />
        <Feature
          icon={CpuIcon}
          title="Arduino without an Arduino"
          body="Sketches compile as real C++ and drive a simulated Uno — LEDs, PWM fading, a serial monitor and a button you can press. The same .ino file uploads to a physical board unchanged."
        />
        <Feature
          icon={TrophyIcon}
          title="Graded problems, beginner to olympiad"
          body={`${problems.total} problems across four difficulty tiers, each with a full hidden test suite. Solve them here, or pull them into VS Code and run the same tests locally.`}
        />
      </section>

      <section className="mt-16">
        <Card className="bg-muted/30">
          <CardContent className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <GraduationCapIcon className="text-primary size-8 shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold">Practise in your real editor</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                The companion VS&nbsp;Code extension puts the lessons in a side
                panel, scaffolds each problem into a folder with a starter file,
                and runs the same hidden tests against your local g++ or Python.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/vscode">Set it up</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof TerminalIcon;
  title: string;
  body: string;
}) {
  return (
    <Card>
      <CardContent className="space-y-2">
        <Icon className="text-primary size-5" />
        <h3 className="font-semibold">{title}</h3>
        <p className="text-muted-foreground text-sm leading-6">{body}</p>
      </CardContent>
    </Card>
  );
}
