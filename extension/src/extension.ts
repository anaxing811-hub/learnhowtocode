import * as vscode from "vscode";
import * as path from "node:path";

import {
  TIER_NAMES,
  TRACK_IDS,
  TRACK_NAMES,
  allProblems,
  findLesson,
  findProblem,
  lessonsFor,
  type Lesson,
  type Problem,
  type ProblemLang,
  type TrackId,
} from "./content";
import { checkToolchain, runProblem, type RunnerConfig } from "./runner";
import { renderLesson } from "./webview";

const COMPLETED_KEY = "lhtc.completedLessons";
const SOLVED_KEY = "lhtc.solvedProblems";

let output: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
  output = vscode.window.createOutputChannel("learnhowtocode");
  context.subscriptions.push(output);

  const lessons = new LessonTree(context);
  const problems = new ProblemTree(context);

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider("lhtc.lessons", lessons),
    vscode.window.registerTreeDataProvider("lhtc.problems", problems),

    vscode.commands.registerCommand("lhtc.refresh", () => {
      lessons.refresh();
      problems.refresh();
    }),

    vscode.commands.registerCommand(
      "lhtc.openLesson",
      (track: TrackId, slug: string) => openLesson(context, track, slug, lessons),
    ),

    vscode.commands.registerCommand("lhtc.startProblem", (arg: unknown) =>
      startProblem(context, arg),
    ),

    vscode.commands.registerCommand("lhtc.runTests", () =>
      runTestsForActiveEditor(context, problems),
    ),

    vscode.commands.registerCommand(
      "lhtc.markComplete",
      async (track: TrackId, slug: string) => {
        const done = new Set(context.globalState.get<string[]>(COMPLETED_KEY, []));
        done.add(`${track}/${slug}`);
        await context.globalState.update(COMPLETED_KEY, [...done]);
        lessons.refresh();
      },
    ),
  );
}

export function deactivate() {}

/* ------------------------------------------------------------------ */
/* Lessons                                                             */
/* ------------------------------------------------------------------ */

type LessonNode =
  | { kind: "track"; track: TrackId }
  | { kind: "module"; track: TrackId; module: string }
  | { kind: "lesson"; track: TrackId; lesson: Lesson };

class LessonTree implements vscode.TreeDataProvider<LessonNode> {
  private emitter = new vscode.EventEmitter<LessonNode | undefined>();
  readonly onDidChangeTreeData = this.emitter.event;

  constructor(private context: vscode.ExtensionContext) {}

  refresh() {
    this.emitter.fire(undefined);
  }

  getTreeItem(node: LessonNode): vscode.TreeItem {
    if (node.kind === "track") {
      const count = lessonsFor(node.track).length;
      const item = new vscode.TreeItem(
        `${TRACK_NAMES[node.track]}  (${count})`,
        count > 0
          ? vscode.TreeItemCollapsibleState.Collapsed
          : vscode.TreeItemCollapsibleState.None,
      );
      item.iconPath = new vscode.ThemeIcon("book");
      return item;
    }

    if (node.kind === "module") {
      const item = new vscode.TreeItem(
        node.module,
        vscode.TreeItemCollapsibleState.Collapsed,
      );
      item.iconPath = new vscode.ThemeIcon("folder");
      return item;
    }

    const done = this.completed().has(`${node.track}/${node.lesson.slug}`);
    const item = new vscode.TreeItem(
      node.lesson.title,
      vscode.TreeItemCollapsibleState.None,
    );
    item.description = `${node.lesson.minutes}m`;
    item.tooltip = node.lesson.description;
    item.iconPath = new vscode.ThemeIcon(done ? "pass-filled" : "circle-large-outline");
    item.command = {
      command: "lhtc.openLesson",
      title: "Open Lesson",
      arguments: [node.track, node.lesson.slug],
    };
    return item;
  }

  getChildren(node?: LessonNode): LessonNode[] {
    if (!node) return TRACK_IDS.map((track) => ({ kind: "track", track }));

    if (node.kind === "track") {
      const modules: string[] = [];
      for (const lesson of lessonsFor(node.track)) {
        if (!modules.includes(lesson.module)) modules.push(lesson.module);
      }
      return modules.map((module) => ({ kind: "module", track: node.track, module }));
    }

    if (node.kind === "module") {
      return lessonsFor(node.track)
        .filter((l) => l.module === node.module)
        .map((lesson) => ({ kind: "lesson", track: node.track, lesson }));
    }

    return [];
  }

  private completed(): Set<string> {
    return new Set(this.context.globalState.get<string[]>(COMPLETED_KEY, []));
  }
}

function openLesson(
  context: vscode.ExtensionContext,
  track: TrackId,
  slug: string,
  tree: LessonTree,
) {
  const lesson = findLesson(track, slug);
  if (!lesson) {
    void vscode.window.showErrorMessage(`Lesson ${track}/${slug} not found.`);
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    "lhtc.lesson",
    lesson.title,
    vscode.ViewColumn.Beside,
    { enableScripts: true, retainContextWhenHidden: true },
  );

  panel.webview.html = renderLesson(lesson, TRACK_NAMES[track]);

  panel.webview.onDidReceiveMessage(async (message: { type: string; text?: string }) => {
    if (message.type === "complete") {
      await vscode.commands.executeCommand("lhtc.markComplete", track, slug);
      tree.refresh();
      void vscode.window.showInformationMessage(`Marked "${lesson.title}" complete.`);
    }
    if (message.type === "copy" && message.text) {
      await vscode.env.clipboard.writeText(message.text);
      void vscode.window.showInformationMessage("Code copied.");
    }
    if (message.type === "scratch" && message.text) {
      const doc = await vscode.workspace.openTextDocument({
        content: message.text,
        language: track === "python" ? "python" : track === "react" ? "javascriptreact" : "cpp",
      });
      await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
    }
  });
}

/* ------------------------------------------------------------------ */
/* Problems                                                            */
/* ------------------------------------------------------------------ */

type ProblemNode =
  | { kind: "tier"; tier: Problem["tier"] }
  | { kind: "problem"; problem: Problem };

class ProblemTree implements vscode.TreeDataProvider<ProblemNode> {
  private emitter = new vscode.EventEmitter<ProblemNode | undefined>();
  readonly onDidChangeTreeData = this.emitter.event;

  constructor(private context: vscode.ExtensionContext) {}

  refresh() {
    this.emitter.fire(undefined);
  }

  getTreeItem(node: ProblemNode): vscode.TreeItem {
    if (node.kind === "tier") {
      const count = allProblems().filter((p) => p.tier === node.tier).length;
      const item = new vscode.TreeItem(
        `${TIER_NAMES[node.tier]}  (${count})`,
        vscode.TreeItemCollapsibleState.Collapsed,
      );
      item.iconPath = new vscode.ThemeIcon("layers");
      return item;
    }

    const solved = new Set(this.context.globalState.get<string[]>(SOLVED_KEY, []));
    const item = new vscode.TreeItem(
      node.problem.title,
      vscode.TreeItemCollapsibleState.None,
    );
    item.contextValue = "problem";
    item.description = node.problem.topics.join(", ");
    item.iconPath = new vscode.ThemeIcon(
      solved.has(node.problem.id) ? "pass-filled" : "circle-large-outline",
    );
    item.command = {
      command: "lhtc.startProblem",
      title: "Start Problem",
      arguments: [node.problem.id],
    };
    return item;
  }

  getChildren(node?: ProblemNode): ProblemNode[] {
    if (!node) {
      return (["warmup", "bronze", "silver", "gold"] as const)
        .filter((tier) => allProblems().some((p) => p.tier === tier))
        .map((tier) => ({ kind: "tier", tier }));
    }
    if (node.kind === "tier") {
      return allProblems()
        .filter((p) => p.tier === node.tier)
        .map((problem) => ({ kind: "problem", problem }));
    }
    return [];
  }
}

/**
 * Scaffolds a problem into a real folder: statement, starter file, and the
 * sample tests as plain files you can pipe in by hand if you want to.
 */
async function startProblem(context: vscode.ExtensionContext, arg: unknown) {
  const id =
    typeof arg === "string"
      ? arg
      : (arg as { problem?: Problem })?.problem?.id;

  const problem = id ? findProblem(id) : undefined;
  if (!problem) {
    void vscode.window.showErrorMessage("Could not resolve that problem.");
    return;
  }

  const folders = vscode.workspace.workspaceFolders;
  if (!folders?.length) {
    void vscode.window.showErrorMessage(
      "Open a folder in VS Code first — problems are scaffolded inside your workspace.",
    );
    return;
  }

  const languages = (Object.keys(problem.starter) as ProblemLang[]).filter(
    (l) => problem.starter[l],
  );
  const language =
    languages.length === 1
      ? languages[0]
      : ((await vscode.window.showQuickPick(
          languages.map((l) => ({ label: l === "cpp" ? "C++" : "Python", id: l })),
          { placeHolder: "Which language?" },
        )) as { id: ProblemLang } | undefined)?.id;

  if (!language) return;

  const config = vscode.workspace.getConfiguration("lhtc");
  const base = config.get<string>("workspaceFolder", "learnhowtocode");
  const dir = vscode.Uri.joinPath(folders[0].uri, base, problem.id);

  await vscode.workspace.fs.createDirectory(dir);

  const encoder = new TextEncoder();
  const extension = language === "cpp" ? "cpp" : "py";
  const solutionUri = vscode.Uri.joinPath(dir, `solution.${extension}`);

  // Never clobber work in progress.
  let exists = true;
  try {
    await vscode.workspace.fs.stat(solutionUri);
  } catch {
    exists = false;
  }

  if (!exists) {
    await vscode.workspace.fs.writeFile(
      solutionUri,
      encoder.encode(problem.starter[language] ?? ""),
    );
  }

  const readme =
    `# ${problem.title}\n\n` +
    `Tier: ${TIER_NAMES[problem.tier]}   |   Time limit: ${problem.timeLimitMs} ms per test\n\n` +
    `${problem.statement.trim()}\n\n` +
    `## Sample tests\n\n` +
    problem.tests
      .filter((t) => t.sample)
      .map(
        (t, i) =>
          `### Sample ${i + 1}\n\nInput:\n\n\`\`\`\n${t.input}\n\`\`\`\n\nExpected output:\n\n\`\`\`\n${t.output}\n\`\`\`\n`,
      )
      .join("\n") +
    `\n---\n\nRun the full hidden test suite with the **Run Tests** button in the editor title bar, ` +
    `or the "learnhowtocode: Run Tests Against the Current File" command.\n`;

  await vscode.workspace.fs.writeFile(
    vscode.Uri.joinPath(dir, "README.md"),
    encoder.encode(readme),
  );

  // A marker so Run Tests knows which problem this folder belongs to.
  await vscode.workspace.fs.writeFile(
    vscode.Uri.joinPath(dir, ".problem.json"),
    encoder.encode(JSON.stringify({ id: problem.id, language }, null, 2)),
  );

  const doc = await vscode.workspace.openTextDocument(solutionUri);
  await vscode.window.showTextDocument(doc);
  void vscode.window.showInformationMessage(
    `${problem.title} is ready. Press Run Tests when you want it judged.`,
  );
}

async function runTestsForActiveEditor(
  context: vscode.ExtensionContext,
  tree: ProblemTree,
) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    void vscode.window.showErrorMessage("Open your solution file first.");
    return;
  }

  await editor.document.save();

  const dir = path.dirname(editor.document.uri.fsPath);
  let marker: { id: string; language: ProblemLang };
  try {
    const raw = await vscode.workspace.fs.readFile(
      vscode.Uri.file(path.join(dir, ".problem.json")),
    );
    marker = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    void vscode.window.showErrorMessage(
      "This file is not inside a scaffolded problem folder. Use \"Start Problem\" from the Problems view.",
    );
    return;
  }

  const problem = findProblem(marker.id);
  if (!problem) {
    void vscode.window.showErrorMessage(`Unknown problem "${marker.id}".`);
    return;
  }

  const cfg = vscode.workspace.getConfiguration("lhtc");
  const runnerConfig: RunnerConfig = {
    cppCompiler: cfg.get("cppCompiler", "g++"),
    cppStandard: cfg.get("cppStandard", "c++17"),
    pythonPath: cfg.get("pythonPath", "python3"),
    timeLimitMultiplier: cfg.get("timeLimitMultiplier", 3),
  };

  const toolchainProblem = await checkToolchain(marker.language, runnerConfig);
  if (toolchainProblem) {
    void vscode.window.showErrorMessage(toolchainProblem);
    return;
  }

  const report = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Judging ${problem.title}`,
      cancellable: false,
    },
    (progress) =>
      runProblem(
        problem,
        editor.document.uri.fsPath,
        marker.language,
        runnerConfig,
        (done, total) =>
          progress.report({
            message: `test ${done} of ${total}`,
            increment: 100 / total,
          }),
      ),
  );

  output.clear();
  output.appendLine(`${problem.title} — ${report.passed}/${report.total} tests passed`);

  if (report.compileError) {
    output.appendLine("\nCompile error:\n");
    output.appendLine(report.compileError);
    output.show(true);
    void vscode.window.showErrorMessage("Compile error — see the output panel.");
    return;
  }

  for (const outcome of report.outcomes) {
    const status = outcome.passed ? "PASS" : outcome.verdict.toUpperCase();
    output.appendLine(
      `  ${status.padEnd(14)} test ${String(outcome.index + 1).padStart(2)}  ${outcome.ms} ms`,
    );
    // Only ever print the contents of a sample test; hidden tests stay hidden
    // so the suite keeps its value.
    if (!outcome.passed && outcome.sample) {
      output.appendLine(`      expected: ${JSON.stringify(outcome.expected)}`);
      output.appendLine(`      actual:   ${JSON.stringify(outcome.actual)}`);
    }
    if (!outcome.passed && outcome.stderr.trim()) {
      output.appendLine(`      stderr:   ${outcome.stderr.trim().split("\n")[0]}`);
    }
  }

  output.show(true);

  if (report.verdict === "accepted") {
    const solved = new Set(context.globalState.get<string[]>(SOLVED_KEY, []));
    solved.add(problem.id);
    await context.globalState.update(SOLVED_KEY, [...solved]);
    tree.refresh();
    void vscode.window.showInformationMessage(
      `Accepted — all ${report.total} tests passed.`,
    );
  } else {
    void vscode.window.showWarningMessage(
      `${report.passed}/${report.total} passed (${report.verdict.replace("_", " ")}).`,
    );
  }
}
