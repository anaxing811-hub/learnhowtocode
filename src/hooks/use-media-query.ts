"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Subscribes to a media query.
 *
 * `useSyncExternalStore` is the right tool here rather than useState plus an
 * effect: it reads the value during render on the client, returns the server
 * snapshot during SSR, and re-renders on change — without the extra render an
 * effect-then-setState pattern costs.
 */
export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(
    () => window.matchMedia(query).matches,
    [query],
  );

  // The server has no viewport. Reporting false means the first paint matches
  // the server output and then corrects itself, rather than mismatching.
  const getServerSnapshot = () => false;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Whether this device should download and run the WebAssembly toolchains.
 *
 * The C++ toolchain is tens of megabytes and Pyodide with numpy is more again.
 * That is a bad trade on a phone, so lessons render code read-only there and
 * invite the reader back on a laptop.
 */
export function useCanRunCode() {
  const wideEnough = useMediaQuery("(min-width: 1024px)");
  const hasFinePointer = useMediaQuery("(pointer: fine)");
  return wideEnough && hasFinePointer;
}
