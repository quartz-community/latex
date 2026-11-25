---
"@quartz-community/latex": minor
---

Rendered maths is in Obsidian's elements, which Obsidian themes style: `span.math.math-inline.is-loaded` around an inline formula and `div.math.math-block.is-loaded` around a display formula, with KaTeX, MathJax and Typst alike. Each formula is wrapped in a marker before rendering (the renderers replace only the formula itself), which gets Obsidian's classes after rendering.
