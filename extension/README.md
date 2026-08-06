# learnhowtocode — VS Code extension

The lessons and graded problem sets from the website, inside your editor, judged
against your own local compiler instead of WebAssembly.

## What it adds

- **Lessons** view — every track and module, with a webview reader. Each code
  block gets *copy* and *open in editor* buttons, and there is a
  "mark complete" button at the bottom.
- **Problems** view — the four tiers. **Start Problem** scaffolds a folder with
  a starter file, the statement as a README, and a marker file.
- **Run Tests** — compiles with your `g++` (or runs your `python3`) and judges
  your solution against the full hidden suite, reporting per-test verdicts in
  the output panel.

Hidden test inputs stay hidden. Only *sample* tests ever print their contents,
so the suite keeps its value.

## Building and installing

```bash
cd extension
npm install
npm run compile      # bundles content/ into src/content.json, then runs tsc
npm run package      # produces learnhowtocode-0.1.0.vsix
code --install-extension learnhowtocode-0.1.0.vsix
```

Then open a folder in VS Code and click the learnhowtocode icon in the activity
bar. Problem folders are created inside your workspace.

To develop it: open `extension/` in VS Code and press <kbd>F5</kbd> for an
Extension Development Host.

## You need a local toolchain

The extension does not bundle a compiler — learning to install and drive the
real one is part of the point.

| Platform | C++ | Python |
| --- | --- | --- |
| macOS | `xcode-select --install` | preinstalled as `python3` |
| Debian / Ubuntu | `sudo apt install build-essential` | `sudo apt install python3` |
| Windows | MSYS2 + MinGW-w64, or Visual Studio Build Tools | python.org installer |

If the tools are not on your `PATH`, point the settings at them.

## Settings

| Setting | Default | Notes |
| --- | --- | --- |
| `lhtc.workspaceFolder` | `learnhowtocode` | Where problem folders are created |
| `lhtc.cppCompiler` | `g++` | Use `clang++`, or an absolute path |
| `lhtc.cppStandard` | `c++17` | Passed as `-std=` |
| `lhtc.pythonPath` | `python3` | On Windows this is usually `python` |
| `lhtc.timeLimitMultiplier` | `3` | A laptop under load is slower than a judge |

Solutions are compiled with `-O2` and the standard you configure, and each test
is killed if it exceeds the problem's time limit times the multiplier.

## How content stays in sync with the website

`scripts/build-extension-content.mjs` (in the repository root) reads the same
`content/` directory the website reads and writes `extension/src/content.json`.
There is exactly one copy of every lesson and every test case, so the two
surfaces cannot disagree about what "passing" means.

Re-run `npm run compile` after editing any content.

## Arduino

For the Arduino track, install the
[PlatformIO IDE](https://marketplace.visualstudio.com/items?itemName=platformio.platformio-ide)
extension. Sketches from the lessons upload to a real Uno or Nano unchanged —
add `#include <Arduino.h>` at the top, which PlatformIO requires and the
Arduino IDE inserts for you.
