import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeMathjax from "rehype-mathjax/svg";
import rehypeTypst from "@myriaddreamin/rehype-typst";
import type { QuartzTransformerPlugin } from "@quartz-community/types";
import type { KatexOptions } from "katex";
import { Fragment, h } from "preact";
import { markMath, obsidianMathClasses } from "./obsidian-math";

export const KATEX_CSS = "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css";

/** The `<head>` link(s) for KaTeX's stylesheet; see `externalResources` below. */
export const katexStylesheet = (fileData: { hasMath?: boolean }) =>
  fileData?.hasMath
    ? h("link", { rel: "stylesheet", href: KATEX_CSS, "data-persist": true })
    : h(
        Fragment,
        null,
        h("link", { rel: "preload", as: "style", href: KATEX_CSS, "data-persist": true }),
        h(
          "noscript",
          { "data-persist": true },
          h("link", { rel: "stylesheet", href: KATEX_CSS, "data-persist": true }),
        ),
      );

/**
 * Applies KaTeX's stylesheet on pages without maths of their own, once per full page load.
 * A stylesheet added by a script does not block rendering; `data-persist` keeps it through
 * SPA navigation.
 */
export const applyKatexStylesheet = `(() => {
  const href = ${JSON.stringify(KATEX_CSS)};
  const linked = [...document.head.querySelectorAll('link[rel="stylesheet"]')].some(
    (link) => link.getAttribute("href") === href,
  );
  if (linked) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.setAttribute("data-persist", "");
  document.head.appendChild(link);
})();`;

interface MathjaxTexOptions {
  macros?: Record<string, string | unknown[]>;
  [key: string]: unknown;
}

interface MathjaxOptions {
  tex?: MathjaxTexOptions;
  [key: string]: unknown;
}

interface TypstOptions {
  [key: string]: unknown;
}

export type Args = boolean | number | string | null;

interface MacroType {
  [key: string]: string | Args[];
}

export interface LatexOptions {
  renderEngine: "katex" | "mathjax" | "typst";
  customMacros: MacroType;
  katexOptions: Omit<KatexOptions, "macros" | "output">;
  mathJaxOptions: Omit<MathjaxOptions, "macros">;
  typstOptions: TypstOptions;
}

export const Latex: QuartzTransformerPlugin<Partial<LatexOptions>> = (opts) => {
  const engine = opts?.renderEngine ?? "katex";
  const macros = opts?.customMacros ?? {};
  const renderer = (): ReturnType<
    NonNullable<ReturnType<QuartzTransformerPlugin>["htmlPlugins"]>
  > => {
    switch (engine) {
      case "katex": {
        return [[rehypeKatex, { output: "html", macros, ...(opts?.katexOptions ?? {}) }]];
      }
      case "typst": {
        return [[rehypeTypst, opts?.typstOptions ?? {}]];
      }
      default:
      case "mathjax": {
        return [
          [
            rehypeMathjax,
            {
              ...(opts?.mathJaxOptions ?? {}),
              tex: {
                ...(opts?.mathJaxOptions?.tex ?? {}),
                macros,
              },
            },
          ],
        ];
      }
    }
  };
  return {
    name: "Latex",
    markdownPlugins() {
      return [remarkMath];
    },
    htmlPlugins() {
      // Obsidian's maths elements around each rendered formula (obsidian-math.ts).
      return [markMath, ...renderer(), obsidianMathClasses];
    },
    externalResources() {
      switch (engine) {
        case "katex":
          return {
            // KaTeX's stylesheet blocks rendering only on pages with maths of their own.
            // Elsewhere it is preloaded and applied by a small script (Preact drops `on*`
            // attributes, so the `media="print"` + `onload` trick cannot be used), with a
            // `<noscript>` link for transclusions when scripts are off. Both stylesheets
            // are `data-persist`, so they survive SPA navigation and also style maths that
            // arrives later: in popovers, transclusions, or pages opened with SPA navigation.
            css: [],
            additionalHead: [katexStylesheet],
            js: [
              {
                script: applyKatexStylesheet,
                loadTime: "afterDOMReady",
                contentType: "inline",
              },
              {
                src: "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/copy-tex.min.js",
                loadTime: "afterDOMReady",
                contentType: "external",
              },
            ],
          };
      }
    },
  };
};
