import { describe, expect, it } from "vitest";
import { KATEX_CSS, Latex, katexStylesheet } from "../src/transformer";
import { createCtx } from "./helpers";

describe("Latex", () => {
  it("returns remarkMath as markdown plugin", () => {
    const ctx = createCtx();
    const transformer = Latex();
    const plugins = transformer.markdownPlugins?.(ctx) ?? [];
    expect(plugins).toHaveLength(1);
  });

  it("defaults to katex render engine", () => {
    const ctx = createCtx();
    const transformer = Latex();
    const plugins = transformer.htmlPlugins?.(ctx) ?? [];
    // The renderer between the steps for Obsidian's maths elements.
    expect(plugins).toHaveLength(3);
  });

  it("uses mathjax when configured", () => {
    const ctx = createCtx();
    const transformer = Latex({ renderEngine: "mathjax" });
    const plugins = transformer.htmlPlugins?.(ctx) ?? [];
    // The renderer between the steps for Obsidian's maths elements.
    expect(plugins).toHaveLength(3);
  });

  it("provides katex external resources", () => {
    const ctx = createCtx();
    const transformer = Latex({ renderEngine: "katex" });
    const resources = transformer.externalResources?.(ctx);
    expect(resources?.css).toHaveLength(0);
    expect(resources?.js).toHaveLength(2);
    expect(resources?.additionalHead).toHaveLength(1);
  });

  it("blocks rendering on KaTeX's stylesheet only on pages with maths", () => {
    type VNode = { type: unknown; props: Record<string, unknown> & { children?: unknown } };
    const flatten = (node: unknown): Array<{ tag: unknown; props: Record<string, unknown> }> => {
      if (!node || typeof node !== "object") return [];
      if (Array.isArray(node)) return node.flatMap(flatten);
      const { type, props } = node as VNode;
      const { children, ...rest } = props;
      const self = typeof type === "string" ? [{ tag: type, props: rest }] : [];
      return [...self, ...flatten(children)];
    };
    // Pages with maths: an ordinary stylesheet, kept through SPA navigation.
    expect(flatten(katexStylesheet({ hasMath: true }))).toEqual([
      { tag: "link", props: { rel: "stylesheet", href: KATEX_CSS, "data-persist": true } },
    ]);
    // Elsewhere: preloaded, applied by a script, with a link for when scripts are off.
    // No `media="print"`: without its `onload` (Preact drops it) it would never apply.
    expect(flatten(katexStylesheet({}))).toEqual([
      {
        tag: "link",
        props: { rel: "preload", as: "style", href: KATEX_CSS, "data-persist": true },
      },
      { tag: "noscript", props: { "data-persist": true } },
      { tag: "link", props: { rel: "stylesheet", href: KATEX_CSS, "data-persist": true } },
    ]);
  });

  it("applies KaTeX's stylesheet on pages without maths of their own, once", () => {
    const resources = Latex({ renderEngine: "katex" }).externalResources?.(createCtx());
    const script = resources?.js?.find((r) => r.contentType === "inline");
    expect(script?.loadTime).toBe("afterDOMReady");
    const appended: Array<Record<string, unknown>> = [];
    const head = {
      links: [] as Array<{ getAttribute: (name: string) => string | undefined }>,
      querySelectorAll: () => head.links,
      appendChild: (el: Record<string, unknown>) => {
        appended.push(el);
        head.links.push({
          getAttribute: (name) => (name === "href" ? String(el.href) : undefined),
        });
      },
    };
    const document = {
      head,
      createElement: () => {
        const attrs: Record<string, string> = {};
        return { attrs, setAttribute: (k: string, v: string) => (attrs[k] = v) };
      },
    };
    const run = new Function("document", script && "script" in script ? script.script : "");
    run(document);
    run(document);
    expect(appended).toHaveLength(1);
    expect(appended[0]).toMatchObject({ rel: "stylesheet", href: KATEX_CSS });
    expect(appended[0]?.attrs).toEqual({ "data-persist": "" });
  });

  it("has name Latex", () => {
    const transformer = Latex();
    expect(transformer.name).toBe("Latex");
  });
});
