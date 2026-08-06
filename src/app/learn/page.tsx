import type { Metadata } from "next";

import { getTrackLessons, getTrackStats } from "@/lib/content";
import { TrackCard } from "@/components/track-card";

export const metadata: Metadata = {
  title: "Learn",
  description: "Four tracks: C++, Arduino, Python and React.",
};

export default function LearnIndex() {
  const tracks = getTrackStats();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Learn</h1>
      <p className="text-muted-foreground mt-2 max-w-2xl">
        Each track is a straight line: start at the top and work down. Nothing
        later assumes anything you have not already been shown.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tracks.map((track) => (
          <TrackCard
            key={track.id}
            track={track}
            slugs={getTrackLessons(track.id).map((l) => l.slug)}
          />
        ))}
      </div>
    </div>
  );
}
