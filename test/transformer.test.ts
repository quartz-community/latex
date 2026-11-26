import { describe, expect, it } from "vitest";
import { Latex } from "../src/transformer";
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
    expect(resources?.js).toHaveLength(1);
    expect(resources?.additionalHead).toHaveLength(1);
  });

  it("blocks rendering on KaTeX's stylesheet only on pages with maths", () => {
    const resources = Latex({ renderEngine: "katex" }).externalResources?.(createCtx());
    const link = resources?.additionalHead?.[0] as (data: { hasMath?: boolean }) => {
      props: Record<string, unknown>;
    };
    expect(link({ hasMath: true }).props.media).toBeUndefined();
    expect(link({}).props.media).toBe("print");
    expect(link({}).props.onLoad).toBe("this.media='all'");
  });

  it("has name Latex", () => {
    const transformer = Latex();
    expect(transformer.name).toBe("Latex");
  });
});
