# NutriScan UI sources

The redesign adapts free component sources to React 18, NutriScan's plain CSS tokens, and its saved full/reduced motion preference. It does not install the paid template collections or migrate the application to a new framework.

- Magic UI Number Ticker: https://magicui.design/r/number-ticker.json — spring-driven numeric updates. Source repository: https://github.com/magicuidesign/magicui (MIT).
- Unlumen UI Shimmer Skeleton: https://ui.unlumen.com/r/shimmer-skeleton.json — accessible skeleton with a lightweight sweeping highlight. License: https://unlumen-ui-docs.vercel.app/docs/license (free component).
- SmoothUI SmoothButton: https://smoothui.dev/r/smooth-button.json — stable-width loading label and Motion spinner overlay. Source repository: https://github.com/educlopez/smoothui (MIT).
- SmoothUI Tabs design: https://smoothui.dev/docs/primitives/tabs — pill indicators and short panel transitions inform the navigation and alert filters. NutriScan retains navigation links and toggle buttons, rather than assigning tab semantics to routes or filters.

All data, authentication, photo analysis, and health profile behavior remains in NutriScan's existing application. The preview server uses synthetic data and never connects to production accounts.
