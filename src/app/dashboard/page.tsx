import type { Metadata } from "next";

import { getTrackLessons } from "@/lib/content";
import { getProblems } from "@/lib/problems";
import { TRACKS, TRACK_ORDER } from "@/lib/tracks";
import { DashboardClient } from "@/components/dashboard-client";

export const metadata: Metadata = {
  title: "Progress",
  description: "What you have finished, what is next, and your streak.",
};

export default function DashboardPage() {
  const tracks = TRACK_ORDER.map((id) => ({
    id,
    name: TRACKS[id].name,
    colorVar: TRACKS[id].colorVar,
    lessons: getTrackLessons(id).map((l) => ({
      slug: l.slug,
      title: l.title,
      module: l.module,
    })),
  }));

  const problems = getProblems().map((p) => ({
    id: p.id,
    title: p.title,
    tier: p.tier,
  }));

  return <DashboardClient tracks={tracks} problems={problems} />;
}
