# TODO

- Amazon `xrayToggle()` (X-ray feature) is non-functional — it depends on a CSS class that only the now-removed dead `addPlayBackRateButton` ever created, so its condition can never become true. Needs its own fix (new UI hook to attach the toggle button to). See [docs/findings-dead-code.md](docs/findings-dead-code.md) "New open item" section.

<!-- Done: MutationObserver refactor (4 conversions, confirmed working 2026-07-19) — see docs/findings-mutationobserver-refactor.md for the record -->
<!-- Done: dead code cleanup (Amazon addPlayBackRateButton cluster, Crunchyhook chain, 5 YouTube ad-hiders) 2026-07-19 — see docs/findings-dead-code.md for the record -->
