"use client";

import { useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { cpp } from "@codemirror/lang-cpp";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import type { Extension } from "@codemirror/state";

import type { RunnerLang } from "@/lib/tracks";
import { cn } from "@/lib/utils";

function extensionsFor(lang: RunnerLang): Extension[] {
  switch (lang) {
    case "cpp":
    case "arduino":
      return [cpp()];
    case "python":
      return [python()];
    case "jsx":
      return [javascript({ jsx: true, typescript: true })];
    case "js":
      return [javascript()];
  }
}

export function Editor({
  value,
  onChange,
  lang,
  readOnly = false,
  minHeight = "9rem",
  maxHeight = "26rem",
  className,
}: {
  value: string;
  onChange?: (next: string) => void;
  lang: RunnerLang;
  readOnly?: boolean;
  minHeight?: string;
  maxHeight?: string;
  className?: string;
}) {
  const extensions = useMemo(() => extensionsFor(lang), [lang]);

  return (
    <div className={cn("overflow-hidden text-[13px]", className)}>
      <CodeMirror
        value={value}
        onChange={onChange}
        extensions={extensions}
        theme={oneDark}
        editable={!readOnly}
        readOnly={readOnly}
        minHeight={minHeight}
        maxHeight={maxHeight}
        basicSetup={{
          lineNumbers: true,
          foldGutter: false,
          highlightActiveLine: !readOnly,
          highlightActiveLineGutter: !readOnly,
          autocompletion: !readOnly,
          bracketMatching: true,
          closeBrackets: !readOnly,
          indentOnInput: !readOnly,
        }}
      />
    </div>
  );
}
