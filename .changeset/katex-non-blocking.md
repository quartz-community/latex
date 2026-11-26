---
"@quartz-community/latex": patch
---

KaTeX's stylesheet blocks rendering only on pages with maths of their own. On other pages it loads without blocking, still in time for maths shown in popovers, transclusions or after SPA navigation. It was render-blocking on every page, including the many without maths.
