# learnhowtocode

A W3Schools-style course site for **C++**, **Arduino**, **Python** (with the
machine-learning stack) and **React** — where every code sample on every page
is something you can edit and actually run.

Not a sandbox that fakes output. A real `clang` front end, a real `wasm-ld`
linker and a real `libc++` are compiled to WebAssembly and run in your browser,
as does a real CPython. A missing semicolon produces the same diagnostic it
would in a terminal:

```
/home/user/main.cpp:1:21: error: use of undeclared identifier 'zzz'
    1 | int main() { return zzz; }
      |                     ^~~
```

## What is here

| | |
| --- | --- |
| **Four lesson tracks** | C++, Arduino, Python (core → NumPy → pandas → scikit-learn), React |
| **In-browser toolchains** | clang + lld + libc++ for C++/Arduino, Pyodide for Python, Sucrase for JSX |
| **An Arduino simulator** | Sketches compile as real C++ and drive a virtual Uno: LEDs, PWM, serial monitor, a scrubbable timeline |
| **Graded problem sets** | Four difficulty tiers with hidden test suites, judged locally |
| **A VS Code extension** | The same lessons and problems, judged against your own `g++` / `python3` |
| **Optional progress sync** | Supabase accounts, or a local export/import file |

## Quick start

```bash
npm install
npm run dev      # http://localhost:3000
```

Deployment instructions — including the two headers this site needs — are in
[DEPLOY.md](DEPLOY.md).

## How it fits together

```
content/                  the single source of truth for all content
  lessons/<track>/*.mdx     lesson bodies, with frontmatter
  problems/*.mdx            problem statements
  problems/*.tests.json     generated test data (see below)
  reference/*.mdx           per-language reference pages

src/
  app/                    Next.js App Router pages
  components/
    runners/                editor, output panel, Arduino board, React preview
    lesson/                 MDX components: Quiz, Callout, Exercise, code blocks
    problems/               the problem workbench and judge UI
  lib/
    runtime/                cpp-engine, python-engine, jsx-engine, judge
    content.ts              reads content/lessons at build time
    problems.ts             reads content/problems at build time

extension/                the VS Code extension (its own package)
scripts/                  asset preparation, content checks, verification
supabase/migrations/      the SQL to run if you want progress sync
```

### Content is authored once

The website and the VS Code extension are fed from the same `content/`
directory. `scripts/build-extension-content.mjs` bundles it into the extension
at build time. Without that the two drift, and "it passes in VS Code but not on
the site" becomes a real class of bug.

### Test data is computed, not typed

`scripts/generate-problems.mjs` holds a JavaScript reference solution for every
problem and *derives* each expected output from it. A hand-written expected
output is a guess; this is at least self-consistent. Regenerate with
`npm run problems`.

### Lessons are MDX with a few custom components

````mdx
---
title: Your first program
module: First steps
order: 1
---

```cpp run title="hello.cpp"
#include <iostream>
int main() { std::cout << "Hello!\n"; }
```

<Callout type="gotcha" title="Watch out">
Prose, with `inline code` and **markdown**.
</Callout>

<Quiz
  question="What does return 0 mean?"
  options={[
    { text: "Success", correct: true, explain: "It is the exit status." },
    { text: "Nothing", explain: "It is read by whatever launched the program." },
  ]}
/>
````

A fence marked `run` becomes an interactive editor. Everything else is
highlighted at build time by Shiki, so readers never download a syntax
highlighter. Meta options: `title="…"`, `stdin="…"`, `leds="13,12"`,
`button=2`, `budget=6000`.

Run `npm run check:content` after editing — it compiles every file and reports
the offending line in about a second, instead of failing a production build
five minutes in.

## The interesting decisions

**Why emception rather than a C++ interpreter.** The obvious lightweight option
is JSCPP (a C++ interpreter in JavaScript, ~200 KB). It was tested and rejected:
of twelve probes covering the language a course actually needs, eight failed —
no `<string>`, no `<vector>`, no classes, no references, no templates. A course
that cannot show you `std::vector` is not a C++ course. emception is far larger
but it is the genuine article.

**Why the Arduino simulator replays a timeline.** The compiled sketch has only
stdio to talk through, so instead of driving the UI live, the Arduino API
records every pin change against a *virtual* clock and prints a timeline; the
browser replays it. Three things fall out of that: `delay(1000)` costs no real
time, runs are deterministic, and the timeline can be paused and scrubbed.

**Why the code runners are desktop-only.** Downloading a ~45 MB compiler onto a
phone to run a six-line example is a bad trade. Lessons render read-only there
with an explanation.

**Why tests are fetched rather than embedded.** A single problem's suite can run
to megabytes. Inlining that into the page payload would make *reading* a
statement expensive, so suites live in `public/problem-tests/` and are fetched
on submit.

## Problem set licensing

Every problem statement and every test case is original, written for this
project. The difficulty tiers are *calibrated against* USACO's divisions so you
know where you stand — but nothing is copied from USACO or any other contest,
whose statements and test data are not licensed for reuse. When you want the
real thing, enter a contest at [usaco.org](https://usaco.org/).

## Verification

`npm run verify` drives the built site in real Chromium and checks that C++
compiles and links, that libc++ works, that a broken program yields a real
clang diagnostic, that the Arduino board actually blinks, that Python runs with
genuine CPython semantics, that the React preview re-renders as you type, and
that the judge accepts correct submissions and rejects wrong ones.

Things it cannot prove are reported as `SKIP`, not as passes.

## Design

The UI uses shadcn/ui with preset `b4cvaXruKW` (style `nova`, base `mist`,
accent teal, Roboto Slab + Merriweather). The theme tokens in
`src/app/globals.css` were written by hand because `ui.shadcn.com` was
unreachable from the build environment. To replace them with the canonical
values, run once on a machine with normal network access:

```bash
npx shadcn@latest apply b4cvaXruKW
```

That command overwrites only the preset-driven CSS variables.
