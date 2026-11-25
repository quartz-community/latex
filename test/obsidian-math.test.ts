import { describe, expect, it } from "vitest";
import type { Element, Root } from "hast";
import rehypeKatex from "rehype-katex";
import rehypeMathjax from "rehype-mathjax/svg";
import { VFile } from "vfile";
import { markMath, obsidianMathClasses } from "../src/obsidian-math";

const code = (classes: string[], value: string): Element => ({
  type: "element",
  tagName: "code",
  properties: { className: ["language-math", ...classes] },
  children: [{ type: "text", value }],
});

/** remark-math's hast: `$x$` in a paragraph, `$$y$$` in a pre. */
const tree = (): Root => ({
  type: "root",
  children: [
    {
      type: "element",
      tagName: "p",
      properties: {},
      children: [{ type: "text", value: "a " }, code(["math-inline"], "x^2")],
    },
    {
      type: "element",
      tagName: "div",
      properties: { className: ["el-div"] },
      children: [
        {
          type: "element",
          tagName: "pre",
          properties: {},
          children: [code(["math-display"], "y = 1")],
        },
      ],
    },
  ],
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const run = async (renderer: any, options: object) => {
  const t = tree();
  markMath()(t);
  await renderer(options)(t, new VFile());
  obsidianMathClasses()(t);
  const inline = (t.children[0] as Element).children[1] as Element;
  const block = (t.children[1] as Element).children[0] as Element;
  return { inline, block };
};

describe("Obsidian's maths elements", () => {
  it("wraps KaTeX's output in span.math.math-inline and div.math.math-block", async () => {
    const { inline, block } = await run(rehypeKatex, { output: "html" });
    expect(inline.tagName).toBe("span");
    expect(inline.properties.className).toEqual(["math", "math-inline", "is-loaded"]);
    expect((inline.children[0] as Element).properties.className).toEqual(["katex"]);
    expect(block.tagName).toBe("div");
    expect(block.properties.className).toEqual(["math", "math-block", "is-loaded"]);
    expect((block.children[0] as Element).properties.className).toEqual(["katex-display"]);
    expect(block.properties.dataObsidianMath).toBeUndefined();
  });

  it("wraps MathJax's output too", async () => {
    const { inline, block } = await run(rehypeMathjax, {});
    expect(inline.properties.className).toEqual(["math", "math-inline", "is-loaded"]);
    expect((inline.children[0] as Element).tagName).toBe("mjx-container");
    expect(block.properties.className).toEqual(["math", "math-block", "is-loaded"]);
    expect((block.children[0] as Element).tagName).toBe("mjx-container");
  });

  it("marks a formula once", () => {
    const t = tree();
    markMath()(t);
    markMath()(t);
    const inline = (t.children[0] as Element).children[1] as Element;
    expect((inline.children[0] as Element).tagName).toBe("code");
  });
});
