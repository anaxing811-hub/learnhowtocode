#!/usr/bin/env node
/**
 * Bundles content/ into a single JSON the VS Code extension ships with.
 *
 * The extension and the website are deliberately fed from the same source of
 * truth: one lesson file, one set of test cases. Otherwise the two drift and
 * "the tests pass in VS Code but not on the site" becomes a real bug class.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import matter from "gray-matter";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentRoot = path.join(root, "content");
const outFile = path.join(root, "extension", "src", "content.json");

const TRACKS = ["cpp", "arduino", "python", "react"];

function readLessons() {
  const tracks = {};
  for (const track of TRACKS) {
    const dir = path.join(contentRoot, "lessons", track);
    if (!fs.existsSync(dir)) {
      tracks[track] = [];
      continue;
    }
    tracks[track] = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".mdx"))
      .map((file) => {
        const { data, content } = matter(
          fs.readFileSync(path.join(dir, file), "utf8"),
        );
        return {
          slug: file.replace(/\.mdx$/, "").replace(/^\d+[-.]/, ""),
          title: data.title,
          description: data.description ?? "",
          module: data.module,
          order: data.order,
          minutes: data.minutes ?? 8,
          objectives: data.objectives ?? [],
          body: content,
        };
      })
      .sort((a, b) => a.order - b.order);
  }
  return tracks;
}

function readProblems() {
  const dir = path.join(contentRoot, "problems");
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mdx"))
    .map((file) => {
      const id = file.replace(/\.mdx$/, "");
      const { data, content } = matter(
        fs.readFileSync(path.join(dir, file), "utf8"),
      );
      const testsPath = path.join(dir, `${id}.tests.json`);
      const tests = JSON.parse(fs.readFileSync(testsPath, "utf8"));
      return {
        id,
        title: data.title,
        tier: data.tier,
        order: data.order,
        topics: data.topics ?? [],
        timeLimitMs: data.timeLimitMs ?? 2000,
        statement: content,
        starter: data.starter ?? {},
        hints: data.hints ?? [],
        tests,
      };
    })
    .sort((a, b) => a.order - b.order);
}

const bundle = {
  generatedAt: new Date().toISOString(),
  lessons: readLessons(),
  problems: readProblems(),
};

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(bundle));

const lessonCount = Object.values(bundle.lessons).reduce(
  (n, l) => n + l.length,
  0,
);
console.log(
  `extension/src/content.json — ${lessonCount} lessons, ${bundle.problems.length} problems, ` +
    `${(fs.statSync(outFile).size / 1024).toFixed(0)} KB`,
);
