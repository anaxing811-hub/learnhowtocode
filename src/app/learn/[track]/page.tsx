import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRightIcon, ExternalLinkIcon } from "lucide-react";

import { getTrackModules, getTrackLessons } from "@/lib/content";
import { TRACKS, TRACK_ORDER, isTrackId } from "@/lib/tracks";
import { Button } from "@/components/ui/button";
import { ModuleList } from "@/components/lesson/module-list";
import { TrackProgressBar } from "@/components/lesson/track-progress-bar";

export function generateStaticParams() {
  return TRACK_ORDER.map((track) => ({ track }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ track: string }>;
}): Promise<Metadata> {
  const { track } = await params;
  if (!isTrackId(track)) return {};
  return {
    title: TRACKS[track].name,
    description: TRACKS[track].tagline,
  };
}

export default async function TrackPage({
  params,
}: {
  params: Promise<{ track: string }>;
}) {
  const { track } = await params;
  if (!isTrackId(track)) notFound();

  const meta = TRACKS[track];
  const modules = getTrackModules(track);
  const lessons = getTrackLessons(track);

  if (lessons.length === 0) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-start gap-4">
        <span
          className="flex size-12 shrink-0 items-center justify-center rounded-xl font-mono text-sm font-bold text-white"
          style={{ background: meta.colorVar }}
        >
          {meta.short}
        </span>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{meta.name}</h1>
          <p className="text-muted-foreground mt-1">{meta.tagline}.</p>
        </div>
      </div>

      <p className="text-muted-foreground mt-5 leading-7">{meta.description}</p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button asChild>
          <Link href={`/learn/${track}/${lessons[0].slug}`}>
            Start the first lesson <ArrowRightIcon />
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/reference/${track}`}>Reference</Link>
        </Button>
      </div>

      <TrackProgressBar
        track={track}
        slugs={lessons.map((l) => l.slug)}
        className="mt-8"
      />

      <div className="mt-8">
        <ModuleList track={track} modules={modules} />
      </div>

      <section className="mt-12">
        <h2 className="mb-3 text-sm font-semibold tracking-wide uppercase">
          Official documentation
        </h2>
        <ul className="space-y-1.5">
          {meta.docs.map((doc) => (
            <li key={doc.href}>
              <a
                href={doc.href}
                target="_blank"
                rel="noreferrer noopener"
                className="text-primary inline-flex items-center gap-1.5 text-sm hover:underline"
              >
                {doc.label}
                <ExternalLinkIcon className="size-3" />
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
