import fs from "node:fs";
import path from "node:path";

import matter from "gray-matter";

import { TRACK_ORDER, TRACKS, type TrackId, isTrackId } from "./tracks";

export const CONTENT_ROOT = path.join(process.cwd(), "content");
const LESSON_ROOT = path.join(CONTENT_ROOT, "lessons");

export interface LessonFrontmatter {
  title: string;
  description: string;
  /** Module the lesson belongs to, e.g. "Getting started". */
  module: string;
  /** Sort key within the whole track. Lower comes first. */
  order: number;
  /** Rough reading + doing time, in minutes. */
  minutes?: number;
  /** What the reader should be able to do afterwards. */
  objectives?: string[];
}

export interface Lesson extends LessonFrontmatter {
  track: TrackId;
  slug: string;
  /** Raw MDX body, frontmatter stripped. */
  body: string;
  minutes: number;
  objectives: string[];
}

export interface LessonRef {
  track: TrackId;
  slug: string;
  title: string;
  module: string;
  order: number;
  minutes: number;
}

export interface TrackModule {
  name: string;
  lessons: LessonRef[];
}

function readLessonFile(track: TrackId, file: string): Lesson | null {
  const full = path.join(LESSON_ROOT, track, file);
  const raw = fs.readFileSync(full, "utf8");
  const { data, content } = matter(raw);
  const fm = data as Partial<LessonFrontmatter>;

  if (!fm.title || !fm.module || typeof fm.order !== "number") {
    // A lesson missing its identity is a content bug — fail the build loudly
    // rather than rendering a half-broken page.
    throw new Error(
      `content/lessons/${track}/${file}: frontmatter needs "title", "module" and a numeric "order"`,
    );
  }

  return {
    track,
    // "12-pointers.mdx" -> "pointers"
    slug: file.replace(/\.mdx?$/, "").replace(/^\d+[-.]/, ""),
    title: fm.title,
    description: fm.description ?? "",
    module: fm.module,
    order: fm.order,
    minutes: fm.minutes ?? 8,
    objectives: fm.objectives ?? [],
    body: content,
  };
}

let cache: Map<TrackId, Lesson[]> | null = null;

function loadAll(): Map<TrackId, Lesson[]> {
  if (cache) return cache;

  const map = new Map<TrackId, Lesson[]>();
  for (const track of TRACK_ORDER) {
    const dir = path.join(LESSON_ROOT, track);
    if (!fs.existsSync(dir)) {
      map.set(track, []);
      continue;
    }
    const lessons = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".mdx") || f.endsWith(".md"))
      .map((f) => readLessonFile(track, f))
      .filter((l): l is Lesson => l !== null)
      .sort((a, b) => a.order - b.order);

    const seen = new Set<string>();
    for (const lesson of lessons) {
      if (seen.has(lesson.slug)) {
        throw new Error(
          `content/lessons/${track}: duplicate lesson slug "${lesson.slug}"`,
        );
      }
      seen.add(lesson.slug);
    }

    map.set(track, lessons);
  }

  cache = map;
  return map;
}

export function getTrackLessons(track: TrackId): Lesson[] {
  return loadAll().get(track) ?? [];
}

export function getLesson(track: TrackId, slug: string): Lesson | undefined {
  return getTrackLessons(track).find((l) => l.slug === slug);
}

/** Lessons grouped into modules, preserving first-seen module order. */
export function getTrackModules(track: TrackId): TrackModule[] {
  const modules: TrackModule[] = [];
  for (const lesson of getTrackLessons(track)) {
    let mod = modules.find((m) => m.name === lesson.module);
    if (!mod) {
      mod = { name: lesson.module, lessons: [] };
      modules.push(mod);
    }
    mod.lessons.push(toRef(lesson));
  }
  return modules;
}

function toRef(lesson: Lesson): LessonRef {
  return {
    track: lesson.track,
    slug: lesson.slug,
    title: lesson.title,
    module: lesson.module,
    order: lesson.order,
    minutes: lesson.minutes,
  };
}

export function getAdjacentLessons(track: TrackId, slug: string) {
  const lessons = getTrackLessons(track);
  const i = lessons.findIndex((l) => l.slug === slug);
  return {
    prev: i > 0 ? toRef(lessons[i - 1]) : null,
    next: i >= 0 && i < lessons.length - 1 ? toRef(lessons[i + 1]) : null,
    index: i,
    total: lessons.length,
  };
}

export function getAllLessonRefs(): LessonRef[] {
  return TRACK_ORDER.flatMap((t) => getTrackLessons(t).map(toRef));
}

export function getTrackStats() {
  return TRACK_ORDER.map((id) => {
    const lessons = getTrackLessons(id);
    return {
      ...TRACKS[id],
      lessonCount: lessons.length,
      moduleCount: new Set(lessons.map((l) => l.module)).size,
      minutes: lessons.reduce((sum, l) => sum + l.minutes, 0),
    };
  });
}

/* ------------------------------------------------------------------ */
/* Reference pages                                                     */
/* ------------------------------------------------------------------ */

const REFERENCE_ROOT = path.join(CONTENT_ROOT, "reference");

export interface ReferencePage {
  track: TrackId;
  slug: string;
  title: string;
  description: string;
  body: string;
}

export function getReferencePages(): ReferencePage[] {
  if (!fs.existsSync(REFERENCE_ROOT)) return [];
  return fs
    .readdirSync(REFERENCE_ROOT)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => {
      const raw = fs.readFileSync(path.join(REFERENCE_ROOT, f), "utf8");
      const { data, content } = matter(raw);
      const slug = f.replace(/\.mdx$/, "");
      if (!isTrackId(slug)) {
        throw new Error(
          `content/reference/${f}: filename must be one of ${TRACK_ORDER.join(", ")}`,
        );
      }
      return {
        track: slug,
        slug,
        title: (data.title as string) ?? TRACKS[slug].name,
        description: (data.description as string) ?? "",
        body: content,
      };
    })
    .sort(
      (a, b) => TRACK_ORDER.indexOf(a.track) - TRACK_ORDER.indexOf(b.track),
    );
}

export function getReferencePage(track: TrackId): ReferencePage | undefined {
  return getReferencePages().find((p) => p.track === track);
}
