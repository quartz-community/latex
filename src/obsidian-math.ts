import type { Element, ElementContent, Root } from "hast";

/**
 * Obsidian renders maths in `span.math.math-inline` and `div.math.math-block`
 * (`is-loaded` once MathJax has run), and themes style those. KaTeX, MathJax
 * and Typst replace the formula's own element, and they read `math-inline` /
 * `math-display` as "a formula to render": the classes can't go on an element
 * around the formula before rendering. So the formula is wrapped in a marker
 * first (`data-obsidian-math`), which the renderers leave alone; after
 * rendering, the marker gets Obsidian's classes.
 */
const MARKER = "dataObsidianMath";

const classesOf = (el: Element): string[] => {
  const c = el.properties.className;
  return Array.isArray(c) ? c.map(String) : c ? String(c).split(/\s+/) : [];
};

/** `code.math-inline` (`$x$`), and `pre > code.math-display` (`$$x$$`, ```math). */
const mathKind = (el: Element): "inline" | "block" | undefined => {
  if (el.tagName === "pre") {
    const code = el.children.find(
      (c): c is Element => c.type === "element" && c.tagName === "code",
    );
    if (!code) return undefined;
    const classes = classesOf(code);
    return classes.includes("math-display") ||
      (classes.includes("language-math") && !classes.includes("math-inline"))
      ? "block"
      : undefined;
  }
  if (el.tagName !== "code") return undefined;
  const classes = classesOf(el);
  if (classes.includes("math-inline")) return "inline";
  if (classes.includes("math-display")) return "block";
  return undefined;
};

const marker = (kind: "inline" | "block", child: ElementContent): Element => ({
  type: "element",
  tagName: kind === "inline" ? "span" : "div",
  properties: { [MARKER]: kind },
  children: [child],
});

const walk = (
  node: Root | Element,
  visit: (el: Element, parent: Root | Element, index: number) => void,
) => {
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i]!;
    if (child.type !== "element") continue;
    visit(child, node, i);
    walk(node.children[i] as Element, visit);
  }
};

/** Before rendering: each formula in a marker. */
export const markMath = () => (tree: Root) => {
  walk(tree, (el, parent, i) => {
    if (el.properties[MARKER] !== undefined) return;
    if (parent.type === "element" && parent.properties[MARKER] !== undefined) return;
    // A display formula's code: its pre is marked.
    if (parent.type === "element" && parent.tagName === "pre") return;
    const kind = mathKind(el);
    if (!kind) return;
    parent.children[i] = marker(kind, el);
  });
};

/** After rendering: the markers as Obsidian's maths elements. */
export const obsidianMathClasses = () => (tree: Root, file?: { data: Record<string, unknown> }) => {
  walk(tree, (el) => {
    const kind = el.properties[MARKER];
    if (kind !== "inline" && kind !== "block") return;
    // The page has maths of its own: its stylesheet must not wait (see transformer.ts).
    if (file) file.data.hasMath = true;
    delete el.properties[MARKER];
    el.properties.className = [
      "math",
      kind === "inline" ? "math-inline" : "math-block",
      "is-loaded",
    ];
  });
};
