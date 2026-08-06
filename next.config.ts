import type { NextConfig } from "next";

/**
 * Cross-origin isolation.
 *
 * Both in-browser toolchains (emception for C++/Arduino, Pyodide for Python)
 * run their WebAssembly in Web Workers and are dramatically faster when
 * SharedArrayBuffer is available. Browsers only expose SharedArrayBuffer to
 * cross-origin-isolated documents, which requires these two headers.
 *
 * This is safe here because the app loads no cross-origin subresources:
 * next/font self-hosts the Google fonts at build time, and both toolchains are
 * served from our own origin by scripts/prepare-assets.mjs. The one exception
 * is Pyodide's scientific wheels when NEXT_PUBLIC_PYODIDE_PACKAGE_URL points at
 * the public CDN — those are CORS fetches, which COEP permits.
 */
const crossOriginIsolation = [
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
];

const immutableAsset = [
  ...crossOriginIsolation,
  { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/**": ["./content/**/*"],
  },

  turbopack: {
    rules: {
      // emception ships a Python shim that it imports as a plain string
      // (it is injected into the in-browser toolchain's filesystem, not run
      // here). Turbopack has no built-in handler for .py, so hand it to
      // raw-loader and treat the result as a JS module exporting the text.
      "*.py": {
        loaders: ["raw-loader"],
        as: "*.js",
      },
    },
  },

  async headers() {
    return [
      { source: "/:path*", headers: crossOriginIsolation },
      // The toolchains are versioned and never mutate in place, so they can be
      // cached hard. This is what makes the second visit fast after the first
      // download.
      { source: "/emception/:path*", headers: immutableAsset },
      { source: "/pyodide/:path*", headers: immutableAsset },
    ];
  },

  // Note: deliberately no `webpack()` config. Next 16 builds with Turbopack by
  // default and *fails the build* if a webpack config is present. The Node
  // built-ins that emception and Pyodide reference are resolved away by
  // Turbopack's browser condition instead.
};

export default nextConfig;
