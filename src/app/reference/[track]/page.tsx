import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, ExternalLinkIcon } from "lucide-react";

import { getReferencePage, getReferencePages } from "@/lib/content";
import { TRACKS, isTrackId } from "@/lib/tracks";
import { Mdx } from "@/components/lesson/mdx";

export function generateStaticParams() {
  return getReferencePages().map((p) => ({ track: p.track }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ track: string }>;
}): Promise<Metadata> {
  const { track } = await params;
  if (!isTrackId(track)) return {};
  const page = getReferencePage(track);
  return page ? { title: page.title, description: page.description } : {};
}

export default async function ReferencePage({
  params,
}: {
  params: Promise<{ track: string }>;
}) {
  const { track } = await params;
  if (!isTrackId(track)) notFound();

  const page = getReferencePage(track);
  if (!page) notFound();

  const meta = TRACKS[track];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href="/reference"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeftIcon className="size-3.5" /> Reference
      </Link>

      <h1 className="mt-3 text-3xl font-bold tracking-tight">{page.title}</h1>
      {page.description && (
        <p className="text-muted-foreground mt-2 leading-7">{page.description}</p>
      )}

      <div className="mt-4 flex flex-wrap gap-3 border-y py-3">
        {meta.docs.map((doc) => (
          <a
            key={doc.href}
            href={doc.href}
            target="_blank"
            rel="noreferrer noopener"
            className="text-primary inline-flex items-center gap-1 text-xs hover:underline"
          >
            {doc.label}
            <ExternalLinkIcon className="size-2.5" />
          </a>
        ))}
      </div>

      <div className="lesson-prose mt-8">
        <Mdx source={page.body} track={track} />
      </div>
    </div>
  );
}
