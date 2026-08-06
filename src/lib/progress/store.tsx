"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";

import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { TrackId } from "@/lib/tracks";

const STORAGE_KEY = "lhtc.progress.v1";

export interface ProblemRecord {
  verdict: string;
  passed: number;
  total: number;
  at: number;
}

interface ProgressState {
  /** "<track>/<slug>" for every completed lesson. */
  completed: Record<string, number>;
  /** Best result per problem id. */
  problems: Record<string, ProblemRecord>;
  /** ISO dates (YYYY-MM-DD) on which something was completed. */
  days: string[];
  savedCode: Record<string, string>;
}

const EMPTY: ProgressState = {
  completed: {},
  problems: {},
  days: [],
  savedCode: {},
};

interface ProgressContextValue extends ProgressState {
  user: User | null;
  syncing: boolean;
  supabaseEnabled: boolean;
  isComplete: (track: TrackId, slug: string) => boolean;
  setComplete: (track: TrackId, slug: string, done: boolean) => void;
  recordProblem: (problemId: string, record: ProblemRecord) => void;
  saveCode: (key: string, source: string) => void;
  trackCompletion: (track: TrackId, slugs: string[]) => number;
  streak: number;
  reset: () => void;
  exportJson: () => string;
  importJson: (json: string) => boolean;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/** Consecutive days ending today (or yesterday, so a streak survives until midnight). */
function computeStreak(days: string[]): number {
  if (days.length === 0) return 0;
  const set = new Set(days);
  const cursor = new Date();

  if (!set.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!set.has(cursor.toISOString().slice(0, 10))) return 0;
  }

  let streak = 0;
  while (set.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function readLocal(): ProgressState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    return { ...EMPTY, ...(JSON.parse(raw) as Partial<ProgressState>) };
  } catch {
    return EMPTY;
  }
}

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ProgressState>(EMPTY);
  const [user, setUser] = useState<User | null>(null);
  const [syncing, setSyncing] = useState(false);
  const hydrated = useRef(false);

  // Hydrate from localStorage after mount so SSR output stays stable.
  useEffect(() => {
    setState(readLocal());
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Private-mode Safari and full quotas both land here. Losing the write is
      // better than losing the session.
    }
  }, [state]);

  // Watch auth state when Supabase is configured.
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    void supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Pull remote progress on sign-in and merge it with whatever is local.
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || !user) return;

    let cancelled = false;
    setSyncing(true);

    void (async () => {
      const [{ data: lessons }, { data: subs }, { data: days }] =
        await Promise.all([
          supabase
            .from("lesson_progress")
            .select("track, slug, completed, updated_at"),
          supabase
            .from("submissions")
            .select("problem_id, verdict, passed, total, created_at")
            .order("created_at", { ascending: false }),
          supabase.from("activity_days").select("day"),
        ]);

      if (cancelled) return;

      setState((prev) => {
        const completed = { ...prev.completed };
        for (const row of lessons ?? []) {
          if (row.completed) {
            const key = `${row.track}/${row.slug}`;
            completed[key] = Math.max(
              completed[key] ?? 0,
              new Date(row.updated_at as string).getTime(),
            );
          }
        }

        const problems = { ...prev.problems };
        for (const row of subs ?? []) {
          const id = row.problem_id as string;
          const existing = problems[id];
          // Keep whichever attempt got further.
          if (!existing || (row.passed as number) > existing.passed) {
            problems[id] = {
              verdict: row.verdict as string,
              passed: row.passed as number,
              total: row.total as number,
              at: new Date(row.created_at as string).getTime(),
            };
          }
        }

        const dayList = new Set(prev.days);
        for (const row of days ?? []) dayList.add(row.day as string);

        return {
          ...prev,
          completed,
          problems,
          days: [...dayList].sort(),
        };
      });

      setSyncing(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const setComplete = useCallback(
    (track: TrackId, slug: string, done: boolean) => {
      const key = `${track}/${slug}`;
      const day = todayIso();

      setState((prev) => {
        const completed = { ...prev.completed };
        if (done) completed[key] = Date.now();
        else delete completed[key];

        const days = done && !prev.days.includes(day)
          ? [...prev.days, day].sort()
          : prev.days;

        return { ...prev, completed, days };
      });

      const supabase = getSupabaseClient();
      if (supabase && user) {
        void supabase
          .from("lesson_progress")
          .upsert(
            {
              user_id: user.id,
              track,
              slug,
              completed: done,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,track,slug" },
          )
          .then(() => {
            if (!done) return;
            return supabase
              .from("activity_days")
              .upsert(
                { user_id: user.id, day, lessons: 1 },
                { onConflict: "user_id,day", ignoreDuplicates: true },
              );
          });
      }
    },
    [user],
  );

  const recordProblem = useCallback(
    (problemId: string, record: ProblemRecord) => {
      setState((prev) => {
        const existing = prev.problems[problemId];
        const better = !existing || record.passed >= existing.passed;
        const day = todayIso();
        return {
          ...prev,
          problems: better
            ? { ...prev.problems, [problemId]: record }
            : prev.problems,
          days: prev.days.includes(day) ? prev.days : [...prev.days, day].sort(),
        };
      });
    },
    [],
  );

  const saveCode = useCallback((key: string, source: string) => {
    setState((prev) => ({
      ...prev,
      savedCode: { ...prev.savedCode, [key]: source },
    }));
  }, []);

  const value = useMemo<ProgressContextValue>(
    () => ({
      ...state,
      user,
      syncing,
      supabaseEnabled: isSupabaseConfigured,
      isComplete: (track, slug) => Boolean(state.completed[`${track}/${slug}`]),
      setComplete,
      recordProblem,
      saveCode,
      trackCompletion: (track, slugs) =>
        slugs.filter((s) => state.completed[`${track}/${s}`]).length,
      streak: computeStreak(state.days),
      reset: () => setState(EMPTY),
      exportJson: () => JSON.stringify(state, null, 2),
      importJson: (json: string) => {
        try {
          const parsed = JSON.parse(json) as Partial<ProgressState>;
          setState({ ...EMPTY, ...parsed });
          return true;
        } catch {
          return false;
        }
      },
    }),
    [state, user, syncing, setComplete, recordProblem, saveCode],
  );

  return (
    <ProgressContext.Provider value={value}>
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) {
    throw new Error("useProgress must be used inside <ProgressProvider>");
  }
  return ctx;
}
