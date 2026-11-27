import type {
  BuildCtx,
  QuartzConfig,
  ProcessedContent,
  QuartzPluginData,
} from "@quartz-community/types";
import type { Element, ElementContent, Properties, Root as HastRoot } from "hast";
import type { Nodes as MdastNodes } from "mdast";
import { fromMarkdown, type Options as FromMarkdownOptions } from "mdast-util-from-markdown";
import { unified, type PluggableList } from "unified";
import { VFile } from "vfile";

type BuildCtxOverrides = Omit<Partial<BuildCtx>, "argv"> & {
  argv?: Partial<BuildCtx["argv"]>;
};

export const createCtx = (overrides: BuildCtxOverrides = {}): BuildCtx => {
  const { argv: argvOverrides, ...rest } = overrides;
  const argv: BuildCtx["argv"] = {
    directory: "content",
    verbose: false,
    output: "dist",
    serve: false,
    watch: false,
    port: 0,
    wsPort: 0,
    ...argvOverrides,
  };

  return {
    buildId: "test-build",
    argv,
    cfg: {} as QuartzConfig,
    allSlugs: [],
    allFiles: [],
    incremental: false,
    ...rest,
  };
};

export const createProcessedContent = (data: Partial<QuartzPluginData> = {}): ProcessedContent => {
  const vfile = new VFile("");
  vfile.data = data;
  return [{ type: "root", children: [] }, vfile];
};

/**
 * Markdown through the plugin's markdown plugins (remark-math) into mdast, then into hast the
 * way mdast-util-to-hast does it for the nodes these tests use: text, paragraphs, inline code,
 * fenced code (`pre > code.language-<lang>`) and the nodes that carry `data.hName` (remark-math's
 * `inlineMath` and `math`). mdast-util-to-hast isn't a dependency of this package.
 */
export const markdownToHast = (markdown: string, plugins: PluggableList): HastRoot => {
  // the attachers (remark-math adding its syntax extensions) run when the processor freezes
  const data = unified().use(plugins).freeze().data() as {
    micromarkExtensions?: FromMarkdownOptions["extensions"];
    fromMarkdownExtensions?: FromMarkdownOptions["mdastExtensions"];
  };
  const mdast = fromMarkdown(markdown, {
    extensions: data.micromarkExtensions ?? [],
    mdastExtensions: data.fromMarkdownExtensions ?? [],
  });
  return { type: "root", children: mdastChildrenToHast(mdast) };
};

type MdastWithData = MdastNodes & {
  data?: { hName?: string; hProperties?: Properties; hChildren?: ElementContent[] };
};

const mdastChildrenToHast = (node: MdastNodes): ElementContent[] =>
  "children" in node ? node.children.flatMap((c) => mdastToHast(c)) : [];

const mdastToHast = (node: MdastWithData): ElementContent[] => {
  const text = (value: string): ElementContent => ({ type: "text", value });
  const el = (tagName: string, properties: Properties, children: ElementContent[]): Element => ({
    type: "element",
    tagName,
    properties,
    children,
  });
  if (node.data?.hName) {
    return [
      el(
        node.data.hName,
        structuredClone(node.data.hProperties ?? {}),
        structuredClone(node.data.hChildren ?? mdastChildrenToHast(node)),
      ),
    ];
  }
  switch (node.type) {
    case "text":
      return [text(node.value)];
    case "paragraph":
      return [el("p", {}, mdastChildrenToHast(node))];
    case "inlineCode":
      return [el("code", {}, [text(node.value)])];
    case "code":
      return [
        el("pre", {}, [
          el("code", node.lang ? { className: ["language-" + node.lang] } : {}, [
            text(node.value + "\n"),
          ]),
        ]),
      ];
    default:
      throw new Error(`markdownToHast: no handler for ${node.type}`);
  }
};

/** Every element of a hast tree, in document order. */
export const elements = (node: HastRoot | Element): Element[] =>
  node.children.flatMap((c) => (c.type === "element" ? [c, ...elements(c)] : []));

export const classes = (el: Element): string[] => {
  const c = el.properties.className;
  return Array.isArray(c) ? c.map(String) : c ? String(c).split(" ") : [];
};
