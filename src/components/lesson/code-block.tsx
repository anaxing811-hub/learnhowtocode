import { highlightToHtml, normalizeLang } from "@/lib/highlight";
import { CodeRunner } from "@/components/runners/code-runner";
import { CopyButton } from "@/components/lesson/copy-button";
import type { RunnerLang } from "@/lib/tracks";

/**
 * Parses a fence's info string: ```cpp run title="Hello" stdin="3 4"
 */
function parseMeta(meta: string) {
  const flags = new Set<string>();
  const values: Record<string, string> = {};

  const pattern = /(\w+)(?:=(?:"([^"]*)"|(\S+)))?/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(meta))) {
    const [, key, quoted, bare] = match;
    if (quoted !== undefined || bare !== undefined) {
      values[key] = (quoted ?? bare ?? "").replace(/\\n/g, "\n");
    } else {
      flags.add(key);
    }
  }
  return { flags, values };
}

const RUNNABLE: Record<string, RunnerLang> = {
  cpp: "cpp",
  arduino: "arduino",
  ino: "arduino",
  python: "python",
  py: "python",
  jsx: "jsx",
  tsx: "jsx",
  js: "js",
  javascript: "js",
};

interface CodeChildProps {
  className?: string;
  meta?: string;
  raw?: string;
  children?: React.ReactNode;
}

/**
 * Replaces the `<pre>` MDX emits. A fence marked `run` becomes an interactive
 * editor; everything else is highlighted server-side by Shiki so the reader
 * never downloads a syntax highlighter.
 */
export async function MdxPre({ children }: { children?: React.ReactNode }) {
  const child = children as
    | { props?: CodeChildProps; type?: unknown }
    | undefined;
  const props = child?.props ?? {};

  const langClass = props.className ?? "";
  const lang = langClass.replace(/^language-/, "") || "text";
  const source = (props.raw ?? "").replace(/\n$/, "");
  const { flags, values } = parseMeta(props.meta ?? "");

  const runnerLang = RUNNABLE[lang.toLowerCase()];

  if (flags.has("run") && runnerLang) {
    return (
      <CodeRunner
        lang={runnerLang}
        initialCode={source}
        title={values.title}
        stdin={values.stdin}
        editableStdin={flags.has("input") || values.stdin !== undefined}
        budgetMs={values.budget ? Number(values.budget) : undefined}
        buttonPin={values.button ? Number(values.button) : undefined}
        ledPins={
          values.leds
            ? values.leds.split(",").map((n) => Number(n.trim()))
            : undefined
        }
      />
    );
  }

  const html = await highlightToHtml(source, lang);
  const label = values.title ?? displayLang(lang);

  return (
    <div className="not-prose group relative my-5 overflow-hidden rounded-lg border">
      <div className="bg-muted/50 text-muted-foreground flex items-center justify-between border-b px-3 py-1.5 font-mono text-[11px]">
        <span>{label}</span>
        <CopyButton value={source} />
      </div>
      <div
        className="[&_pre]:scrollbar-thin [&_pre]:m-0 [&_pre]:overflow-x-auto [&_pre]:rounded-none [&_pre]:border-0 [&_pre]:p-3 [&_pre]:text-[13px] [&_pre]:leading-6"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

function displayLang(lang: string) {
  const normalized = normalizeLang(lang);
  if (lang === "arduino" || lang === "ino") return "Arduino sketch";
  switch (normalized) {
    case "cpp":
      return "C++";
    case "python":
      return "Python";
    case "jsx":
    case "tsx":
      return "JSX";
    case "javascript":
      return "JavaScript";
    case "bash":
      return "Terminal";
    default:
      return lang;
  }
}
