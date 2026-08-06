#!/usr/bin/env node
/**
 * Compiles every MDX file and validates its frontmatter.
 *
 * Content bugs otherwise surface as a failed production build several minutes
 * in, with a message that names the route rather than the file. This names the
 * file and the line in about a second.
 *
 * Run:  npm run check:content
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import matter from "gray-matter";
import { compile } from "@mdx-js/mdx";
import remarkGfm from "remark-gfm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentRoot = path.join(root, "content");

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.name.endsWith(".mdx") ? [full] : [];
  });
}

const files = walk(contentRoot);
let failures = 0;

for (const file of files) {
  const rel = path.relative(root, file);
  const raw = fs.readFileSync(file, "utf8");
  const { data, content } = matter(raw);

  const isLesson = rel.includes(`lessons${path.sep}`);
  const isProblem = rel.includes(`problems${path.sep}`);

  const problems = [];

  if (isLesson) {
    if (!data.title) problems.push('missing "title"');
    if (!data.module) problems.push('missing "module"');
    if (typeof data.order !== "number") problems.push('missing numeric "order"');
  }

  if (isProblem) {
    if (!data.title) problems.push('missing "title"');
    if (!data.tier) problems.push('missing "tier"');
    if (typeof data.order !== "number") problems.push('missing numeric "order"');
    const tests = file.replace(/\.mdx$/, ".tests.json");
    if (!fs.existsSync(tests)) problems.push("no matching .tests.json");
  }

  try {
    await compile(content, {
      remarkPlugins: [remarkGfm],
      outputFormat: "function-body",
    });
  } catch (err) {
    const line = err.line ?? err.place?.start?.line;
    problems.push(
      `MDX: ${err.message.split("\n")[0]}${line ? ` (line ${line})` : ""}`,
    );
    if (line) {
      const lines = content.split("\n");
      problems.push(`      ${line}| ${lines[line - 1] ?? ""}`);
    }
  }

  if (problems.length) {
    failures++;
    console.log(`FAIL  ${rel}`);
    for (const p of problems) console.log(`        ${p}`);
  }
}

console.log(
  `\n${files.length - failures}/${files.length} content files OK` +
    (failures ? ` — ${failures} need attention` : ""),
);
process.exit(failures ? 1 : 0);
