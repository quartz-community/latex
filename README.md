# @quartz-community/latex

Renders LaTeX math equations using KaTeX, MathJax, or Typst rendering engines.

## Installation

```bash
npx quartz plugin add @quartz-community/latex
```

## Usage

This plugin is already enabled in the default `quartz.config.yaml`:

```yaml title="quartz.config.yaml"
plugins:
  - source: "@quartz-community/latex"
    enabled: true
    options:
      renderEngine: katex
      customMacros:
        "\\R": "\\mathbb{R}"
    order: 80
```

## Configuration

| Option           | Type                               | Default     | Description                                                                                                                                        |
| ---------------- | ---------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `renderEngine`   | `"katex" \| "mathjax" \| "typst"`  | `"katex"`   | The engine to render equations with: [KaTeX](https://katex.org/), [MathJax](https://www.mathjax.org/) (SVG output) or [Typst](https://typst.app/). |
| `customMacros`   | `Record<string, string \| Args[]>` | `{}`        | Custom macros for all LaTeX blocks, e.g. `{"\\R": "\\mathbb{R}"}`. Used by KaTeX and MathJax; Typst ignores it.                                    |
| `katexOptions`   | `KatexOptions`                     | `undefined` | Options passed to KaTeX ([KaTeX docs](https://katex.org/docs/options)).                                                                            |
| `mathJaxOptions` | `MathjaxOptions`                   | `undefined` | Options passed to MathJax ([MathJax docs](https://docs.mathjax.org/en/latest/options/)).                                                           |
| `typstOptions`   | `TypstOptions`                     | `undefined` | Options passed to the Typst renderer.                                                                                                              |

With KaTeX, the KaTeX stylesheet and its copy-tex script are loaded from jsDelivr.

## Documentation

See the [Quartz documentation](https://quartz.jzhao.xyz/plugins/Latex) for more information.

## License

MIT
