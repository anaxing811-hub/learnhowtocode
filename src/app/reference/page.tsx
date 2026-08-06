import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLinkIcon } from "lucide-react";

import { getReferencePages } from "@/lib/content";
import { TRACKS, TRACK_ORDER } from "@/lib/tracks";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Reference",
  description:
    "Condensed language reference for C++, Arduino, Python and React, plus links to the official documentation.",
};

export default function ReferenceIndex() {
  const pages = getReferencePages();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Reference</h1>
      <p className="text-muted-foreground mt-2 max-w-2xl leading-7">
        The things you look up rather than learn: syntax tables, the functions
        you half-remember, the arguments in the wrong order. Each page also
        links out to the canonical documentation, which is always the final
        word.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {TRACK_ORDER.map((id) => {
          const track = TRACKS[id];
          const page = pages.find((p) => p.track === id);
          return (
            <Card key={id} className="relative">
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <span
                    className="flex size-8 items-center justify-center rounded-lg font-mono text-[10px] font-bold text-white"
                    style={{ background: track.colorVar }}
                  >
                    {track.short}
                  </span>
                  <h2 className="font-semibold">
                    {page ? (
                      <Link
                        href={`/reference/${id}`}
                        className="after:absolute after:inset-0"
                      >
                        {track.name}
                      </Link>
                    ) : (
                      track.name
                    )}
                  </h2>
                </div>

                {page ? (
                  <p className="text-muted-foreground text-sm">
                    {page.description}
                  </p>
                ) : (
                  <p className="text-muted-foreground text-sm italic">
                    Reference page not written yet — the official docs below
                    cover everything.
                  </p>
                )}

                <ul className="relative z-10 space-y-1 pt-1">
                  {track.docs.map((doc) => (
                    <li key={doc.href}>
                      <a
                        href={doc.href}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-muted-foreground hover:text-primary inline-flex items-center gap-1 text-xs"
                      >
                        {doc.label}
                        <ExternalLinkIcon className="size-2.5" />
                      </a>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
