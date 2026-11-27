import { describe, expect, it } from "vitest";
import type { Element, Root } from "hast";
import { unified } from "unified";
import { VFile } from "vfile";
import { Latex, type LatexOptions } from "../src/transformer";
import { classes, createCtx, elements, markdownToHast } from "./helpers";

/** Markdown through the plugin as Quartz runs it: remark-math, mdast -> hast, its htmlPlugins. */
const render = async (markdown: string, opts?: Partial<LatexOptions>) => {
  const ctx = createCtx();
  const plugin = Latex(opts);
  const tree = markdownToHast(markdown, plugin.markdownPlugins!(ctx));
  const before = structuredClone(tree);
  const file = new VFile(markdown);
  const after = (await unified().use(plugin.htmlPlugins!(ctx)).run(tree, file)) as Root;
  return { before, tree: after, file, all: elements(after) };
};

const withClass = (all: Element[], c: string) => all.filter((el) => classes(el).includes(c));

describe("the Latex plugin on a page", () => {
  it("leaves inline code and fenced code alone", async () => {
    const { before, tree, file, all } = await render("`x`\n\n```js\nlet a\n```");
    expect(withClass(all, "math")).toEqual([]);
    expect(tree).toEqual(before);
    expect(file.data.hasMath).toBeUndefined();
  });

  it("renders a ```math fence in div.math.math-block.is-loaded", async () => {
    const { tree, file } = await render("```math\ny=1\n```");
    expect(tree.children).toHaveLength(1);
    const block = tree.children[0] as Element;
    expect(block.tagName).toBe("div");
    expect(block.properties).toEqual({ className: ["math", "math-block", "is-loaded"] });
    expect(block.children).toHaveLength(1);
    expect(classes(block.children[0] as Element)).toEqual(["katex-display"]);
    expect(file.data.hasMath).toBe(true);
  });

  it("marks a page with inline maths as having maths", async () => {
    const { file, all } = await render("a $x$ b");
    expect(file.data.hasMath).toBe(true);
    const inline = withClass(all, "math");
    expect(inline.map((el) => [el.tagName, classes(el)])).toEqual([
      ["span", ["math", "math-inline", "is-loaded"]],
    ]);
  });

  it("passes a raw <pre> without a code element through", async () => {
    const plugin = Latex();
    const tree: Root = {
      type: "root",
      children: [
        {
          type: "element",
          tagName: "pre",
          properties: {},
          children: [{ type: "text", value: "plain" }],
        },
      ],
    };
    const before = structuredClone(tree);
    const after = await unified().use(plugin.htmlPlugins!(createCtx())).run(tree, new VFile());
    expect(after).toEqual(before);
  });
});

describe("render engines", () => {
  const engineOf = (all: Element[]) => ({
    katex: withClass(all, "katex").length,
    mathjax: all.filter((el) => el.tagName === "mjx-container").length,
    // rehype-typst renders each formula as a typst-doc SVG
    typst: all.filter((el) => el.tagName === "svg" && classes(el).includes("typst-doc")).length,
  });

  it("renders with KaTeX by default, as HTML only", async () => {
    const { all } = await render("$x$");
    expect(engineOf(all)).toEqual({ katex: 1, mathjax: 0, typst: 0 });
    expect(withClass(all, "katex-mathml")).toEqual([]);
    expect(withClass(all, "katex-html")).toHaveLength(1);
  });

  it("renders with MathJax when configured", async () => {
    const { all } = await render("$x$", { renderEngine: "mathjax" });
    expect(engineOf(all)).toEqual({ katex: 0, mathjax: 1, typst: 0 });
  });

  it("renders with Typst when configured", async () => {
    const { all } = await render("$x$", { renderEngine: "typst" });
    expect(engineOf(all)).toEqual({ katex: 0, mathjax: 0, typst: 1 });
  });

  it("passes the custom macros to KaTeX", async () => {
    const { all } = await render("$\\RR$", { customMacros: { "\\RR": "\\mathbb{R}" } });
    expect(withClass(all, "katex-error")).toEqual([]);
    expect(withClass(all, "mathbb").map((el) => el.children)).toEqual([
      [{ type: "text", value: "R" }],
    ]);
  });

  it("passes katexOptions to KaTeX", async () => {
    const styles = async (opts: Partial<LatexOptions>) =>
      elements((await render("$\\nosuchmacro$", opts)).tree)
        .map((el) => el.properties.style)
        .filter((style) => String(style).startsWith("color:"));
    expect(await styles({})).toEqual(["color:#cc0000;", "color:#cc0000;"]);
    expect(await styles({ katexOptions: { errorColor: "#123456" } })).toEqual([
      "color:#123456;",
      "color:#123456;",
    ]);
  });

  // MathJax shows an undefined macro as red text, or, without its noundefined package, as an
  // error
  const undefinedMacros = (all: Element[]) =>
    all.filter((el) => el.properties.dataMmlNode === "mtext" && el.properties.fill === "red");
  const mathJaxErrors = (all: Element[]) =>
    all.map((el) => el.properties.dataMjxError).filter((e) => e !== undefined);

  it("passes the custom macros to MathJax", async () => {
    // (MathJax's macro names have no backslash; see the next test)
    const withMacro = await render("$\\RR$", {
      renderEngine: "mathjax",
      customMacros: { RR: "\\mathbb{R}" },
    });
    const without = await render("$\\RR$", { renderEngine: "mathjax" });
    expect(undefinedMacros(withMacro.all)).toEqual([]);
    expect(mathJaxErrors(withMacro.all)).toEqual([]);
    expect(undefinedMacros(without.all)).toHaveLength(1);
  });

  // BUG: customMacros are documented in KaTeX's form, `{"\\R": "\\mathbb{R}"}`, "used by KaTeX
  // and MathJax", but they go to MathJax as they are, and MathJax's `tex.macros` names have no
  // backslash: `\R` stays undefined (red) with MathJax
  it.fails("passes KaTeX-style custom macros (with a backslash) to MathJax", async () => {
    const { all } = await render("$\\RR$", {
      renderEngine: "mathjax",
      customMacros: { "\\RR": "\\mathbb{R}" },
    });
    expect(undefinedMacros(all)).toEqual([]);
  });

  it("passes mathJaxOptions and mathJaxOptions.tex to MathJax", async () => {
    // the glyphs of `$x$`: <use> of a shared path, or (fontCache "none") the path in place
    const glyphs = (all: Element[]) =>
      all.filter((el) => el.tagName === "use" || el.tagName === "path").map((el) => el.tagName);
    const md = "$x$ $\\cancel{y}$";
    const plain = await render(md, { renderEngine: "mathjax" });
    expect(mathJaxErrors(plain.all)).toEqual([]);
    expect(undefinedMacros(plain.all)).toEqual([]);

    // `svg.fontCache: "none"` draws each glyph in place instead of <use>-ing a shared one;
    // `tex.packages` without "cancel" makes \cancel unknown
    const configured = await render(md, {
      renderEngine: "mathjax",
      mathJaxOptions: { svg: { fontCache: "none" }, tex: { packages: ["base", "configmacros"] } },
    });
    const [x, y] = configured.all.filter((el) => el.tagName === "mjx-container");
    expect(glyphs(elements(plain.all.find((el) => el.tagName === "mjx-container")!))).toEqual([
      "path", // the cached glyph, in <defs>
      "use",
    ]);
    expect(glyphs(elements(x!))).toEqual(["path"]);
    expect(mathJaxErrors(elements(y!))).toEqual(["Undefined control sequence \\cancel"]);
  });
});
