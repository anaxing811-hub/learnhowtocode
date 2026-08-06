export type TrackId = "cpp" | "arduino" | "react" | "python";

export type RunnerLang = "cpp" | "arduino" | "python" | "jsx" | "js";

export interface TrackMeta {
  id: TrackId;
  name: string;
  tagline: string;
  description: string;
  /** CSS custom property used for the track's accent colour. */
  colorVar: string;
  /** Language the in-browser runner should use for this track's code blocks. */
  runner: RunnerLang;
  /** Monospace label shown on cards, e.g. "C++". */
  short: string;
  /** Official documentation, surfaced on the track page and in the reference. */
  docs: { label: string; href: string }[];
}

export const TRACKS: Record<TrackId, TrackMeta> = {
  cpp: {
    id: "cpp",
    name: "C++",
    short: "C++",
    tagline: "The language that teaches you what a computer actually does",
    description:
      "Start from `int main()` and work up to pointers, classes, templates and the STL. Every example compiles with real clang in your browser — the same compiler front-end you would run locally.",
    colorVar: "var(--track-cpp)",
    runner: "cpp",
    docs: [
      { label: "cppreference.com", href: "https://en.cppreference.com/w/" },
      {
        label: "C++ Core Guidelines",
        href: "https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines",
      },
      { label: "The C++ Standard Library (cplusplus.com)", href: "https://cplusplus.com/reference/" },
    ],
  },
  arduino: {
    id: "arduino",
    name: "Arduino",
    short: "INO",
    tagline: "The same C++, but the output is a blinking light",
    description:
      "Arduino sketches are C++ with a small library bolted on and two functions the board calls for you. Write a sketch, watch it drive a simulated Uno right on the page, then upload the identical file to a real board.",
    colorVar: "var(--track-arduino)",
    runner: "arduino",
    docs: [
      {
        label: "Arduino Language Reference",
        href: "https://www.arduino.cc/reference/en/",
      },
      {
        label: "Arduino Uno R3 datasheet",
        href: "https://docs.arduino.cc/hardware/uno-rev3",
      },
      { label: "PlatformIO docs", href: "https://docs.platformio.org/" },
    ],
  },
  react: {
    id: "react",
    name: "React",
    short: "JSX",
    tagline: "Describe what the screen should look like; let React do the rest",
    description:
      "Components, props, state, effects and hooks — built up in the order that actually makes them click. Every example renders live next to the code, so you can break it and see what happens.",
    colorVar: "var(--track-react)",
    runner: "jsx",
    docs: [
      { label: "react.dev", href: "https://react.dev/reference/react" },
      { label: "MDN JavaScript reference", href: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference" },
      { label: "Next.js docs", href: "https://nextjs.org/docs" },
    ],
  },
  python: {
    id: "python",
    name: "Python",
    short: "PY",
    tagline: "From your first variable to training a model",
    description:
      "The core language first, then the libraries that made Python the default language of machine learning: NumPy, pandas, Matplotlib and scikit-learn. Real CPython runs in your browser, so the numbers you see are real numbers.",
    colorVar: "var(--track-python)",
    runner: "python",
    docs: [
      { label: "Python Standard Library", href: "https://docs.python.org/3/library/index.html" },
      { label: "NumPy reference", href: "https://numpy.org/doc/stable/reference/index.html" },
      { label: "pandas API reference", href: "https://pandas.pydata.org/docs/reference/index.html" },
      { label: "scikit-learn API", href: "https://scikit-learn.org/stable/api/index.html" },
      { label: "Matplotlib API", href: "https://matplotlib.org/stable/api/index.html" },
    ],
  },
};

export const TRACK_ORDER: TrackId[] = ["cpp", "arduino", "python", "react"];

export function isTrackId(value: string): value is TrackId {
  return value in TRACKS;
}
