"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderLesson = renderLesson;
/**
 * Renders a lesson's MDX inside a webview.
 *
 * The website renders MDX with React components. A webview has no bundler, so
 * rather than shipping one we translate the handful of components the lessons
 * use into plain HTML and render the remaining Markdown with a small
 * hand-rolled converter. Lesson bodies are first-party content with a known
 * shape, which is what makes that tractable.
 */
function renderLesson(lesson, trackName) {
    const body = mdxToHtml(lesson.body);
    const objectives = lesson.objectives.length
        ? `<div class="box"><p class="label">By the end of this lesson you can</p><ul>${lesson.objectives
            .map((o) => `<li>${escapeHtml(o)}</li>`)
            .join("")}</ul></div>`
        : "";
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
<style>
  :root { color-scheme: light dark; }
  body {
    font-family: var(--vscode-font-family);
    font-size: 14px;
    line-height: 1.65;
    padding: 0 26px 60px;
    max-width: 780px;
    margin: 0 auto;
    color: var(--vscode-foreground);
  }
  h1 { font-size: 1.7em; margin-bottom: .2em; }
  h2 { font-size: 1.25em; margin-top: 1.8em; border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: .25em; }
  h3 { font-size: 1.08em; margin-top: 1.4em; }
  .meta { color: var(--vscode-descriptionForeground); font-size: .88em; margin-bottom: 1.4em; }
  .lede { font-size: 1.05em; color: var(--vscode-descriptionForeground); }
  pre {
    background: var(--vscode-textCodeBlock-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    padding: 12px;
    overflow-x: auto;
    font-family: var(--vscode-editor-font-family);
    font-size: 12.5px;
    position: relative;
  }
  code { font-family: var(--vscode-editor-font-family); font-size: .92em; }
  :not(pre) > code {
    background: var(--vscode-textCodeBlock-background);
    padding: 1px 5px; border-radius: 3px;
  }
  .codewrap { position: relative; margin: 1.1em 0; }
  .codebar {
    display: flex; gap: 8px; align-items: center;
    font-size: 11px; color: var(--vscode-descriptionForeground);
    margin-bottom: -6px;
  }
  button {
    background: var(--vscode-button-secondaryBackground, transparent);
    color: var(--vscode-button-secondaryForeground, var(--vscode-foreground));
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px; padding: 2px 8px; cursor: pointer; font-size: 11px;
  }
  button:hover { background: var(--vscode-button-secondaryHoverBackground); }
  .primary {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none; padding: 6px 14px; font-size: 13px;
  }
  .box, .callout {
    border: 1px solid var(--vscode-panel-border);
    border-left: 3px solid var(--vscode-textLink-foreground);
    border-radius: 6px; padding: 12px 14px; margin: 1.2em 0;
    background: var(--vscode-textBlockQuote-background);
  }
  .callout .title { font-weight: 600; margin-bottom: .3em; }
  .label {
    text-transform: uppercase; letter-spacing: .06em; font-size: 10.5px;
    color: var(--vscode-descriptionForeground); font-weight: 600; margin: 0 0 .4em;
  }
  table { border-collapse: collapse; width: 100%; margin: 1.2em 0; font-size: 13px; }
  th, td { border: 1px solid var(--vscode-panel-border); padding: 6px 10px; text-align: left; }
  th { background: var(--vscode-textCodeBlock-background); }
  .quiz { border: 1px solid var(--vscode-panel-border); border-radius: 6px; padding: 12px 14px; margin: 1.4em 0; }
  .quiz .opt { display: block; width: 100%; text-align: left; margin: 5px 0; padding: 7px 10px; }
  .quiz .why { display: none; font-size: 12px; color: var(--vscode-descriptionForeground); padding: 2px 10px 8px; }
  .quiz.done .why { display: block; }
  .quiz.done .correct { border-color: #3fb950; }
  .quiz.done .wrong { border-color: #f85149; }
  footer { margin-top: 3em; border-top: 1px solid var(--vscode-panel-border); padding-top: 1.4em; }
</style>
</head>
<body>
  <div class="meta">${escapeHtml(trackName)} · ${escapeHtml(lesson.module)} · ${lesson.minutes} min</div>
  <h1>${escapeHtml(lesson.title)}</h1>
  ${lesson.description ? `<p class="lede">${escapeHtml(lesson.description)}</p>` : ""}
  ${objectives}
  ${body}
  <footer>
    <button class="primary" id="complete">Mark this lesson complete</button>
  </footer>
<script>
  const vscode = acquireVsCodeApi();
  document.getElementById('complete').addEventListener('click', () => {
    vscode.postMessage({ type: 'complete' });
  });
  document.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', () => {
      vscode.postMessage({ type: 'copy', text: decodeURIComponent(btn.dataset.copy) });
    });
  });
  document.querySelectorAll('[data-scratch]').forEach((btn) => {
    btn.addEventListener('click', () => {
      vscode.postMessage({ type: 'scratch', text: decodeURIComponent(btn.dataset.scratch) });
    });
  });
  document.querySelectorAll('.quiz').forEach((quiz) => {
    quiz.querySelectorAll('.opt').forEach((opt) => {
      opt.addEventListener('click', () => quiz.classList.add('done'));
    });
  });
</script>
</body>
</html>`;
}
function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
/** Extracts `key="value"` and `key={...}` pairs from a JSX opening tag. */
function parseProps(tag) {
    const props = {};
    const stringProps = /(\w+)="([^"]*)"/g;
    let m;
    while ((m = stringProps.exec(tag)))
        props[m[1]] = m[2];
    const templateProps = /(\w+)=\{`([\s\S]*?)`\}/g;
    while ((m = templateProps.exec(tag))) {
        props[m[1]] = m[2].replace(/\\n/g, "\n").replace(/\\`/g, "`");
    }
    return props;
}
function codeBlock(source, language, label) {
    const encoded = encodeURIComponent(source);
    return `<div class="codewrap">
  <div class="codebar">
    <span>${escapeHtml(label)}</span>
    <button data-copy="${encoded}">copy</button>
    <button data-scratch="${encoded}">open in editor</button>
  </div>
  <pre><code class="language-${escapeHtml(language)}">${escapeHtml(source)}</code></pre>
</div>`;
}
function mdxToHtml(source) {
    const out = [];
    const lines = source.split("\n");
    let i = 0;
    const flushParagraph = (buffer) => {
        if (!buffer.length)
            return;
        out.push(`<p>${inline(buffer.join(" "))}</p>`);
        buffer.length = 0;
    };
    let paragraph = [];
    while (i < lines.length) {
        const line = lines[i];
        // Fenced code
        if (line.startsWith("```")) {
            flushParagraph(paragraph);
            const info = line.slice(3).trim();
            const language = info.split(/\s+/)[0] || "text";
            const runnable = /\brun\b/.test(info);
            const titleMatch = info.match(/title="([^"]*)"/);
            const body = [];
            i++;
            while (i < lines.length && !lines[i].startsWith("```"))
                body.push(lines[i++]);
            i++;
            out.push(codeBlock(body.join("\n"), language, titleMatch?.[1] ?? (runnable ? `${language} · editable` : language)));
            continue;
        }
        // Self-closing or block JSX components
        if (/^<(Callout|KeyPoints|Quiz|Exercise)\b/.test(line)) {
            flushParagraph(paragraph);
            const name = line.match(/^<(\w+)/)[1];
            const chunk = [];
            const selfClosing = /\/>\s*$/.test(line) && !line.includes(">" + name);
            chunk.push(line);
            if (!(selfClosing && line.trim().endsWith("/>"))) {
                // Consume until the matching close tag or a self-closing end.
                while (i + 1 < lines.length) {
                    i++;
                    chunk.push(lines[i]);
                    if (lines[i].trim() === `</${name}>` ||
                        (lines[i].trim().endsWith("/>") && !lines[i].trim().startsWith("<"))) {
                        break;
                    }
                }
            }
            i++;
            out.push(renderComponent(name, chunk.join("\n")));
            continue;
        }
        // Headings
        const heading = line.match(/^(#{2,4})\s+(.*)$/);
        if (heading) {
            flushParagraph(paragraph);
            const level = heading[1].length;
            out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
            i++;
            continue;
        }
        // Tables
        if (line.startsWith("|") && lines[i + 1]?.match(/^\|[\s:|-]+\|$/)) {
            flushParagraph(paragraph);
            const header = splitRow(line);
            i += 2;
            const rows = [];
            while (i < lines.length && lines[i].startsWith("|"))
                rows.push(splitRow(lines[i++]));
            out.push(`<table><thead><tr>${header
                .map((h) => `<th>${inline(h)}</th>`)
                .join("")}</tr></thead><tbody>${rows
                .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`)
                .join("")}</tbody></table>`);
            continue;
        }
        // Lists
        if (/^\s*[-*]\s+/.test(line)) {
            flushParagraph(paragraph);
            const items = [];
            while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
                items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
                i++;
            }
            out.push(`<ul>${items.map((it) => `<li>${inline(it)}</li>`).join("")}</ul>`);
            continue;
        }
        if (/^\s*\d+\.\s+/.test(line)) {
            flushParagraph(paragraph);
            const items = [];
            while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
                items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
                i++;
            }
            out.push(`<ol>${items.map((it) => `<li>${inline(it)}</li>`).join("")}</ol>`);
            continue;
        }
        if (line.startsWith("> ")) {
            flushParagraph(paragraph);
            out.push(`<blockquote>${inline(line.slice(2))}</blockquote>`);
            i++;
            continue;
        }
        if (line.trim() === "") {
            flushParagraph(paragraph);
            i++;
            continue;
        }
        paragraph.push(line);
        i++;
    }
    flushParagraph(paragraph);
    return out.join("\n");
}
function splitRow(line) {
    return line
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((c) => c.trim());
}
function renderComponent(name, chunk) {
    const props = parseProps(chunk);
    if (name === "Callout") {
        const inner = chunk.replace(/^<Callout[^>]*>/, "").replace(/<\/Callout>\s*$/, "");
        return `<div class="callout"><div class="title">${escapeHtml(props.title ?? capitalize(props.type ?? "note"))}</div>${mdxToHtml(inner.trim())}</div>`;
    }
    if (name === "KeyPoints") {
        const inner = chunk.replace(/^<KeyPoints>/, "").replace(/<\/KeyPoints>\s*$/, "");
        return `<div class="box"><p class="label">Worth remembering</p>${mdxToHtml(inner.trim())}</div>`;
    }
    if (name === "Exercise") {
        const inner = chunk
            .replace(/^<Exercise[\s\S]*?>\n?/, "")
            .replace(/<\/Exercise>\s*$/, "");
        const prompt = inner.includes("<") ? "" : mdxToHtml(inner.trim());
        const language = props.lang === "python" ? "python" : props.lang === "jsx" ? "jsx" : "cpp";
        return `<div class="box">
      <p class="label">Exercise</p>
      <h3>${escapeHtml(props.title ?? "Now you try")}</h3>
      ${prompt}
      ${props.starter ? codeBlock(props.starter, language, "starter") : ""}
      ${props.solution ? `<details><summary>Show one possible solution</summary>${codeBlock(props.solution, language, "solution")}</details>` : ""}
    </div>`;
    }
    if (name === "Quiz") {
        // Options are a JS array literal; pull out each { ... } object.
        const optionsBlock = chunk.match(/options=\{\[([\s\S]*?)\]\}/)?.[1] ?? "";
        const options = [...optionsBlock.matchAll(/\{([\s\S]*?)\}/g)].map((m) => {
            const text = m[1].match(/text:\s*"((?:[^"\\]|\\.)*)"/)?.[1] ?? "";
            const explain = m[1].match(/explain:\s*"((?:[^"\\]|\\.)*)"/)?.[1] ?? "";
            const correct = /correct:\s*true/.test(m[1]);
            return { text: unescapeJs(text), explain: unescapeJs(explain), correct };
        });
        return `<div class="quiz">
      <p><strong>${escapeHtml(props.question ?? "Check your understanding")}</strong></p>
      ${options
            .map((o) => `<button class="opt ${o.correct ? "correct" : "wrong"}">${escapeHtml(o.text)}</button><div class="why">${o.correct ? "✓ " : "✗ "}${escapeHtml(o.explain)}</div>`)
            .join("")}
    </div>`;
    }
    return "";
}
function unescapeJs(text) {
    return text.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}
function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}
/** Inline markdown: code spans, bold, italics, links. */
function inline(text) {
    let html = escapeHtml(text);
    html = html.replace(/`([^`]+)`/g, (_, code) => `<code>${code}</code>`);
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => `<a href="${href}">${label}</a>`);
    return html;
}
//# sourceMappingURL=webview.js.map