# Findings: dead code

Surfaced 2026-07-19 as a side-finding while auditing `repeatIfCondition` call sites for
[MutationObserver refactor candidates](findings-mutationobserver-refactor.md) — unrelated topic,
tracked separately since it can be decided/actioned independently.

## Amazon: `addPlayBackRateButton` cluster — ✅ deleted (2026-07-19)

Was a bespoke in-player playback-speed button injected directly into Amazon Prime Video's
control bar (icon + popover with a numeric input), tied to a very brittle deeply-nested
`nth-child` CSS selector chain against Amazon's own DOM. Superseded by the generic
settings-overlay playback-rate system (`enable_playback_option__generic` / `_adjustVal__generic`)
that `userOptions.amazon.featurePlayBackSpeed` already uses — evidenced by an old, commented-out
`featurePlayBackSpeed` config block using the Amazon-specific functions sitting directly above the
active generic-based one. Amazon's playback-speed feature was unaffected by this being dead — it
already worked via the settings panel, not the abandoned in-page button.

Removed: `addPlayBackRateButton`, `enable_amazon_playback_option`, `_amazon_setPlayerValue`,
`_amazon_adjustVal`, `updateAmznVideoPlayrate`, the commented-out old `userOptions` block, and the
commented-out call site.

**Side-finding surfaced during removal:** `xrayToggle()` (Amazon, still live/called) depends
entirely on the `.cu-playback-rate` CSS class, which was only ever created by the now-removed
`addPlayBackRateButton()`. This means the X-ray toggle feature was already non-functional before
this cleanup (removing the dead code doesn't change that — it was already broken). Tracked as a
new, separate open item below.

## Crunchyroll: `crunchyhook` / `crunchyrolliFrameHook` chain — ✅ deleted (2026-07-19)

Targeted Crunchyroll's old `static.crunchyroll.com` iframe-based video playback, since replaced by
direct in-page streaming. Note: this had an existing code comment explicitly saying it was kept
deliberately ("kept in case they revert to that") from an earlier session's decision — user
confirmed deleting anyway despite that prior rationale.

Removed: `crunchyrolliFrameHook`, `initKeyBindListener`, `addCrunchySkipOptionListener`,
`_crunchyhook_setPlayerValue`, `_crunchyhook_adjustVal`, `lastVideoUrl`, `incorrectPlaybackRate`,
`initPlaybackOptionListener`, `initSkip`, `_crunchySkipInterval`, `startCrunchySkipInterval`, the
`userOptions.crunchyhook` config block, and the commented-out Matcher entry. `addHotkeysForNextAndPrevious`
(a live, still-used function) was interleaved in the middle of this block and was carefully preserved.

## YouTube: 5 ad-hiding/autoskip helpers — ✅ deleted (2026-07-19)

`hideYoutubeAdsReels`, `hideYoutubeAds`, `ytAutoskipAdd`, `noYTAdBlockBanner`, `noYTBanner` — all
commented out in `fixYoutube()`, never called. Confirmed `noYTBanner()`'s job (removing
`#big-yoodle`) is already covered by `initYTCSS()`'s CSS rule (`#big-yoodle:has(ytd-statement-banner-renderer)
{ display: none !important; }`), added in a separate later fix — validates that re-enabling
instead of deleting would have been redundant.

Removed the 5 functions, their commented-out call sites in `fixYoutube()`, and `ytPlay()` (a small
helper that only existed to serve the now-removed `noYTAdBlockBanner`). Left `initListenerForAdEnforcer()`
and `initShortsControl()` alone — commented out too, but NOT part of this finding/decision, still
present in the file, still callable if wanted later.

## New open item: Amazon `xrayToggle()` is non-functional

Not part of this cleanup's scope (only found because it depended on since-deleted-anyway dead code
— it was already broken beforehand). The "make X-ray toggleable" feature's entire logic is gated
on a CSS class (`.cu-playback-rate`) that hasn't existed since the Amazon playback-rate button was
abandoned. `xrayToggle()` is still called live from `fixAmazon()`, so this is a genuinely broken
user-facing feature, not dead code. Needs its own investigation/fix — not addressed here since it's
an unrelated topic from the dead-code question that produced this file.
