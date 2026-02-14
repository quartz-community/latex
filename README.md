# @quartz-community/latex

Renders LaTeX math equations using KaTeX, MathJax, or Typst rendering engines.

## Installation

```bash
npx quartz plugin add github:quartz-community/latex
```

## Usage

```ts
// quartz.config.ts
import * as ExternalPlugin from "./.quartz/plugins";

const config: QuartzConfig = {
  plugins: {
    transformers: [ExternalPlugin.Latex()],
  },
};
```

## Configuration

| Option         | Type                               | Default     | Description                            |
| -------------- | ---------------------------------- | ----------- | -------------------------------------- |
| `renderEngine` | `"katex" \| "mathjax" \| "typst"`  | `"katex"`   | The rendering engine to use for LaTeX. |
| `customMacros` | `Record<string, string \| Args[]>` | `{}`        | Custom LaTeX macros.                   |
| katexOptions   | `KatexOptions`                     | `undefined` | Options for the KaTeX engine.          |
| mathJaxOptions | `MathjaxOptions`                   | `undefined` | Options for the MathJax engine.        |
| typstOptions   | `TypstOptions`                     | `undefined` | Options for the Typst engine.          |

## Documentation

See the [Quartz documentation](https://quartz.jzhao.xyz/) for more information.

## License

MIT
