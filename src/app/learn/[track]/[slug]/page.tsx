import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, ArrowRightIcon, ClockIcon } from "lucide-react";

import {
  getAdjacentLessons,
  getLesson,
  getTrackLessons,
  getTrackModules,
} from "@/lib/content";
import { TRACKS, TRACK_ORDER, isTrackId } from "@/lib/tracks";
import { Mdx } from "@/components/lesson/mdx";
import { LessonSidebar } from "@/components/lesson/lesson-sidebar";
import { CompleteButton } from "@/components/lesson/complete-button";
import { Button } from "@/components/ui/button";

export function generateStaticParams() {
  return TRACK_ORDER.flatMap((track) =>
    getTrackLessons(track).map((lesson) => ({ track, slug: lesson.slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ track: string; slug: string }>;
}): Promise<Metadata> {
  const { track, slug } = await params;
  if (!isTrackId(track)) return {};
  const lesson = getLesson(track, slug);
  if (!lesson) return {};
  return {
    title: `${lesson.title} — ${TRACKS[track].name}`,
    description: lesson.description,
  };
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ track: string; slug: string }>;
}) {
  const { track, slug } = await params;
  if (!isTrackId(track)) notFound();

  const lesson = getLesson(track, slug);
  if (!lesson) notFound();

  const { prev, next, index, total } = getAdjacentLessons(track, slug);
  const modules = getTrackModules(track);

  return (
    <div className="mx-auto flex max-w-7xl gap-8 px-4 py-8">
      <LessonSidebar track={track} modules={modules} currentSlug={slug} />

      <article className="min-w-0 flex-1 pb-16">
        <nav className="text-muted-foreground mb-3 flex items-center gap-2 text-xs">
          <Link href={`/learn/${track}`} className="hover:text-foreground">
            {TRACKS[track].name}
          </Link>
          <span>/</span>
          <span>{lesson.module}</span>
          <span className="ml-auto tabular-nums">
            {index + 1} of {total}
          </span>
        </nav>

        <h1 className="text-3xl font-bold tracking-tight text-balance">
          {lesson.title}
        </h1>

        <div className="text-muted-foreground mt-2 flex items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-1">
            <ClockIcon className="size-3.5" /> {lesson.minutes} min
          </span>
        </div>

        {lesson.description && (
          <p className="text-muted-foreground mt-4 text-lg leading-7 text-pretty">
            {lesson.description}
          </p>
        )}

        {lesson.objectives.length > 0 && (
          <div className="bg-muted/40 mt-6 rounded-lg border p-4">
            <p className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-wide uppercase">
              By the end of this lesson you can
            </p>
            <ul className="ml-4 list-disc space-y-1 text-sm">
              {lesson.objectives.map((objective) => (
                <li key={objective}>{objective}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="lesson-prose mt-8">
          <Mdx source={lesson.body} track={track} />
        </div>

        <CompleteButton track={track} slug={slug} nextHref={next ? `/learn/${track}/${next.slug}` : null} />

        <nav className="mt-8 flex items-center justify-between gap-3 border-t pt-6">
          {prev ? (
            <Button asChild variant="ghost" className="h-auto max-w-[45%] py-2">
              <Link href={`/learn/${track}/${prev.slug}`}>
                <ArrowLeftIcon />
                <span className="truncate text-left">
                  <span className="text-muted-foreground block text-[11px]">
                    Previous
                  </span>
                  <span className="block truncate text-sm">{prev.title}</span>
                </span>
              </Link>
            </Button>
          ) : (
            <span />
          )}

          {next && (
            <Button asChild variant="ghost" className="ml-auto h-auto max-w-[45%] py-2">
              <Link href={`/learn/${track}/${next.slug}`}>
                <span className="truncate text-right">
                  <span className="text-muted-foreground block text-[11px]">
                    Next
                  </span>
                  <span className="block truncate text-sm">{next.title}</span>
                </span>
                <ArrowRightIcon />
              </Link>
            </Button>
          )}
        </nav>
      </article>
    </div>
  );
}
