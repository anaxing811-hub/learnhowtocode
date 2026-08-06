"use client";

import { useEffect, useState } from "react";

export function useMediaQuery(query: string) {
  // Start false so the server and first client render agree; the effect
  // corrects it before paint.
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/**
 * Whether this device should download and run the WebAssembly toolchains.
 *
 * The C++ toolchain is ~45 MB and Pyodide with numpy is ~25 MB. That is a bad
 * trade on a phone, so lessons render code read-only there and invite the
 * reader back on a laptop.
 */
export function useCanRunCode() {
  const wideEnough = useMediaQuery("(min-width: 1024px)");
  const hasFinePointer = useMediaQuery("(pointer: fine)");
  return wideEnough && hasFinePointer;
}
