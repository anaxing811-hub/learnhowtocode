import { CheckIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

const STEPS = [
  {
    title: "Build the extension",
    body: "From the repository root:",
    code: `cd extension
npm install
npm run compile`,
  },
  {
    title: "Package it into a .vsix",
    body: "This produces learnhowtocode-0.1.0.vsix in the extension folder.",
    code: `npm run package`,
  },
  {
    title: "Install it in VS Code",
    body: "Either from the command line, or via Extensions ▸ ⋯ ▸ Install from VSIX…",
    code: `code --install-extension learnhowtocode-0.1.0.vsix`,
  },
  {
    title: "Open a folder and start",
    body: "Click the learnhowtocode icon in the activity bar. Pick a lesson to read it in a side panel, or right-click a problem and choose Start Problem.",
  },
];

const TOOLCHAIN = [
  {
    platform: "macOS",
    cpp: "xcode-select --install",
    python: "Ships with macOS; python3 is already on your PATH.",
  },
  {
    platform: "Debian / Ubuntu",
    cpp: "sudo apt install build-essential",
    python: "sudo apt install python3",
  },
  {
    platform: "Windows",
    cpp: "Install MSYS2 + MinGW-w64, or Visual Studio Build Tools, then set lhtc.cppCompiler if g++ is not on PATH.",
    python: "Install from python.org, then set lhtc.pythonPath to python.",
  },
];

export function VsCodeGuide({ problemCount }: { problemCount: number }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">
        Practise in VS&nbsp;Code
      </h1>
      <p className="text-muted-foreground mt-3 leading-7">
        The website is good for reading and for quick experiments. Real practice
        happens in a real editor, with a real compiler and a real debugger. The
        companion extension bridges the two: the same lessons, the same{" "}
        {problemCount} problems, and the same hidden test suites — judged
        against your own local toolchain instead of WebAssembly.
      </p>

      <div className="mt-8 space-y-3">
        {[
          "Lessons in a side panel, with copy and open-in-editor buttons on every code block",
          "Start Problem scaffolds a folder: starter file, statement as README, and a marker file",
          "Run Tests compiles with your g++ or runs your python3, then reports per-test verdicts",
          "Hidden test inputs stay hidden — only sample tests ever print their contents",
          "Progress is tracked per lesson and per problem in VS Code's own storage",
        ].map((line) => (
          <div key={line} className="flex items-start gap-2 text-sm">
            <CheckIcon className="text-primary mt-0.5 size-4 shrink-0" />
            <span>{line}</span>
          </div>
        ))}
      </div>

      <h2 className="mt-10 mb-4 text-xl font-bold tracking-tight">
        Installing it
      </h2>

      <ol className="space-y-4">
        {STEPS.map((step, i) => (
          <li key={step.title}>
            <Card>
              <CardContent className="space-y-2">
                <h3 className="flex items-center gap-2 font-semibold">
                  <span className="bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs">
                    {i + 1}
                  </span>
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-sm">{step.body}</p>
                {step.code && (
                  <pre className="overflow-x-auto rounded-md border bg-[#12161c] p-3 font-mono text-[12.5px] text-slate-200">
                    {step.code}
                  </pre>
                )}
              </CardContent>
            </Card>
          </li>
        ))}
      </ol>

      <h2 className="mt-10 mb-2 text-xl font-bold tracking-tight">
        You will need a local toolchain
      </h2>
      <p className="text-muted-foreground mb-4 text-sm leading-6">
        The extension deliberately does not bundle a compiler. Learning to
        install and invoke the real thing is part of the point, and it is the
        setup you will actually use afterwards.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="px-3 py-2 text-left font-semibold">Platform</th>
              <th className="px-3 py-2 text-left font-semibold">C++</th>
              <th className="px-3 py-2 text-left font-semibold">Python</th>
            </tr>
          </thead>
          <tbody>
            {TOOLCHAIN.map((row) => (
              <tr key={row.platform} className="border-b">
                <td className="px-3 py-2 font-medium whitespace-nowrap">
                  {row.platform}
                </td>
                <td className="px-3 py-2">
                  <code className="bg-muted rounded px-1 font-mono text-xs">
                    {row.cpp}
                  </code>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{row.python}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 mb-2 text-xl font-bold tracking-tight">Settings</h2>
      <ul className="text-muted-foreground ml-5 list-disc space-y-1.5 text-sm">
        <li>
          <code className="bg-muted rounded px-1 font-mono text-xs">
            lhtc.cppCompiler
          </code>{" "}
          — defaults to <code className="font-mono">g++</code>
        </li>
        <li>
          <code className="bg-muted rounded px-1 font-mono text-xs">
            lhtc.cppStandard
          </code>{" "}
          — defaults to <code className="font-mono">c++17</code>
        </li>
        <li>
          <code className="bg-muted rounded px-1 font-mono text-xs">
            lhtc.pythonPath
          </code>{" "}
          — defaults to <code className="font-mono">python3</code>
        </li>
        <li>
          <code className="bg-muted rounded px-1 font-mono text-xs">
            lhtc.timeLimitMultiplier
          </code>{" "}
          — defaults to 3, because a laptop under load is slower than a judge
        </li>
      </ul>

      <h2 className="mt-10 mb-2 text-xl font-bold tracking-tight">
        Arduino on real hardware
      </h2>
      <p className="text-muted-foreground text-sm leading-6">
        For the Arduino track, install the{" "}
        <a
          href="https://marketplace.visualstudio.com/items?itemName=platformio.platformio-ide"
          target="_blank"
          rel="noreferrer noopener"
          className="text-primary hover:underline"
        >
          PlatformIO IDE
        </a>{" "}
        extension. Every sketch in the lessons is ordinary Arduino C++ and
        uploads to an Uno or Nano unchanged — the simulator on the website is
        there so you can iterate without reaching for the USB cable, not because
        the code is different.
      </p>
    </div>
  );
}
