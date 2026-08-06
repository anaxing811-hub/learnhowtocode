import { createHighlighter, type Highlighter } from "shiki";

const LANGS = [
  "cpp",
  "c",
  "python",
  "jsx",
  "tsx",
  "javascript",
  "typescript",
  "json",
  "bash",
  "diff",
  "ini",
  "cmake",
  "html",
  "css",
] as const;

export type HighlightLang = (typeof LANGS)[number];

const ALIASES: Record<string, HighlightLang> = {
  "c++": "cpp",
  arduino: "cpp",
  ino: "cpp",
  py: "python",
  js: "javascript",
  ts: "typescript",
  sh: "bash",
  shell: "bash",
  console: "bash",
  txt: "bash",
  text: "bash",
  output: "bash",
};

export function normalizeLang(lang?: string): HighlightLang | null {
  if (!lang) return null;
  const lower = lang.toLowerCase();
  if ((LANGS as readonly string[]).includes(lower)) return lower as HighlightLang;
  return ALIASES[lower] ?? null;
}

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ["github-dark-default"],
      langs: [...LANGS],
    });
  }
  return highlighterPromise;
}

/** Highlight `code` to HTML. Unknown languages fall back to plain text. */
export async function highlightToHtml(code: string, lang?: string) {
  const resolved = normalizeLang(lang);
  const highlighter = await getHighlighter();
  return highlighter.codeToHtml(code.replace(/\n$/, ""), {
    lang: resolved ?? "bash",
    theme: "github-dark-default",
  });
}
