"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
      className="hover:text-foreground inline-flex items-center gap-1 transition-colors"
      aria-label="Copy code"
    >
      {copied ? (
        <>
          <CheckIcon className="size-3 text-emerald-500" /> copied
        </>
      ) : (
        <>
          <CopyIcon className="size-3" /> copy
        </>
      )}
    </button>
  );
}
