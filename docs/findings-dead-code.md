# Findings: dead code

Surfaced 2026-07-19 as a side-finding while auditing `repeatIfCondition` call sites for
[MutationObserver refactor candidates](findings-mutationobserver-refactor.md) — unrelated topic,
tracked separately since it can be decided/actioned independently.

- `addPlayBackRateButton` (Amazon, ~line 3172/3208) — function is never called anywhere
- The entire `crunchyhook` / `crunchyrolliFrameHook` chain (~lines 4671, 4721, 4765, 4809) — the matcher that would activate this site is commented out, so none of it is reachable
- Five YouTube ad-hiding/autoskip helpers — `hideYoutubeAdsReels` (~3664), `hideYoutubeAds` (~3675), `ytAutoskipAdd` (~3735), `noYTAdBlockBanner` (~3747), `noYTBanner` (~3759) — all commented out in `fixYoutube`, never called

**Decision needed:** delete, or re-enable if still wanted (especially the two YouTube ad-hiders — `initYTCSS()`'s existing CSS-based ad hiding may already cover the same ground, worth checking before deleting vs. re-enabling).
