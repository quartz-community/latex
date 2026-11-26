---
"@quartz-community/latex": patch
---

KaTeX's stylesheet applies again on pages without maths of their own. Since 1.1.1 such pages linked it with `media="print"` and an `onload` handler that Quartz's renderer drops, so maths in transclusions, popovers and pages opened with SPA navigation was unstyled. The stylesheet is now preloaded there and applied by a small script (with a `<noscript>` link when scripts are off), and still blocks rendering only on pages with maths.
