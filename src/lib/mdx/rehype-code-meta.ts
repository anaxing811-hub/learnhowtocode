import { visit } from "unist-util-visit";

interface HastElement {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  data?: { meta?: string };
  children?: HastElement[];
}

/**
 * MDX parses the text after a fence's language (```cpp run title="x") into
 * `node.data.meta`, which rehype does not forward to component props. This
 * copies it onto the element so the <pre>/<code> components can read it.
 */
export function rehypeCodeMeta() {
  return (tree: HastElement) => {
    visit(tree, "element", (node: HastElement) => {
      if (node.tagName !== "code") return;
      const meta = node.data?.meta;
      if (typeof meta === "string" && meta.length > 0) {
        node.properties = { ...node.properties, meta };
      }
      // Also surface the raw source so a runner can seed its editor without
      // having to walk highlighted spans.
      const first = node.children?.[0] as unknown as
        | { type: string; value?: string }
        | undefined;
      if (first?.type === "text" && typeof first.value === "string") {
        node.properties = { ...node.properties, raw: first.value };
      }
    });
  };
}
