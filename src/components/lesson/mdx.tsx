import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import Link from "next/link";

import { rehypeCodeMeta } from "@/lib/mdx/rehype-code-meta";
import { MdxPre } from "@/components/lesson/code-block";
import { Callout, KeyPoints } from "@/components/lesson/callout";
import { Quiz } from "@/components/lesson/quiz";
import { Exercise } from "@/components/lesson/exercise";
import { CodeRunner } from "@/components/runners/code-runner";

const components = {
  pre: MdxPre,
  Callout,
  KeyPoints,
  Quiz,
  Exercise,
  Runner: CodeRunner,
  a: ({ href = "", ...props }: React.ComponentProps<"a">) => {
    const external = /^https?:/.test(href);
    if (external) {
      return (
        <a href={href} target="_blank" rel="noreferrer noopener" {...props} />
      );
    }
    return <Link href={href} {...props} />;
  },
};

export function Mdx({ source }: { source: string }) {
  return (
    <MDXRemote
      source={source}
      components={components}
      options={{
        // next-mdx-remote v6 strips JSX *expression* attributes by default —
        // it assumes MDX may come from untrusted authors, and an expression is
        // an execution vector. Ours is first-party content in this repo, and
        // components like <Quiz options={[…]} /> are entirely expression
        // props, so blocking them silently deletes the data.
        //
        // blockDangerousJS stays on: expressions may not reference eval,
        // Function, require, process and friends. Lesson props are plain
        // string/array/object literals, so that costs us nothing and keeps a
        // guard in place if content ever arrives from somewhere else.
        blockJS: false,
        blockDangerousJS: true,
        mdxOptions: {
          remarkPlugins: [remarkGfm],
          // rehypeCodeMeta must run before anything that rewrites <code>.
          rehypePlugins: [rehypeCodeMeta, rehypeSlug],
        },
      }}
    />
  );
}
