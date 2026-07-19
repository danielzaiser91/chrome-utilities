# Findings: MutationObserver refactor candidates

Produced 2026-07-19 while fixing a Crunchyroll subtitle-cue bug where a fixed-interval poll
(`repeatIfCondition`, even at 50ms) intermittently lost the race against the page re-rendering
content on its own schedule. Switching that fix to a `MutationObserver` eliminated the race
entirely. This raised the question: where else in `utility.js` does the same risk pattern exist?

An audit of all 43 live `repeatIfCondition` call sites in `utility.js` found the following.

## Good candidates (same race-condition risk as the Crunchyroll bug)

Repeatedly correcting DOM text/attribute/position that a third-party page/player plausibly
rewrites on its own unpredictable schedule — a MutationObserver would close the "briefly visible
wrong state" gap a poll can't.

| Status | Site | Function | Line (at time of writing) | Why |
|---|---|---|---|---|
| ✅ Done | Crunchyroll | `cr_fixSubtitleCues` | ~4155 | Original case — already converted, see `cr_initSubtitleUmlautFix` |
| ✅ Done (2026-07-19) | Chess.com | `moveDailyPuzzleUp` | ~2149 | Converted: `MutationObserver` on the puzzle container's parent (`childList`+`subtree`+`style` attribute), one-time setup via `repeatUntilCondition`. **Needs manual test.** |
| ✅ Done (2026-07-19) | Chess.com | `removeNewTag` | ~2175 | Converted: `MutationObserver` on `document.body` (`childList`+`subtree`), one-time setup via `repeatUntilCondition`. **Needs manual test.** |
| ✅ Done (2026-07-19) | Crunchyroll | `watchListColors` | ~4517 | Hybrid: `MutationObserver` on the list container does the real-time work; outer poll slowed from 500ms to 1000ms, now only a backstop to (re-)attach the observer on navigation/SPA remount (compared by container identity). **Needs manual test.** |
| ✅ Done (2026-07-19) | YouTube | `noInterestButton` | ~3866 | Converted: `MutationObserver` on `document.body` (`childList`+`subtree`), calls the existing self-guarding `_addNoInterestIcon()` on every mutation instead of every 300ms. **Needs manual test.** |

## Not a good fit (37 of 43 sites) — left as polling, no action needed

- One-shot button clicks on skip/login/next flows (Disney+, Amazon, Netflix, WowTV, Twitch, Crunchyroll autoLogin)
- Marker-gated one-time UI injections (playback-rate buttons, x-ray toggle, settings-menu rows)
- `video.playbackRate` / JS-property corrections — not DOM-observable, MutationObserver structurally can't see them (WowTV, Filemoon, Luluvdo, generic helper, Amazon, Netflix)
- Genuine state/existence polling (streetview toggle, Prime panel open/close, SPA URL-change detection, countdown timers)

## Side-finding: dead code discovered during the audit

Not related to MutationObserver, but surfaced while reading through call sites:

- `addPlayBackRateButton` (Amazon, ~line 3172/3208) — function is never called anywhere
- The entire `crunchyhook` / `crunchyrolliFrameHook` chain (~lines 4671, 4721, 4765, 4809) — the matcher that would activate this site is commented out, so none of it is reachable
- Five YouTube ad-hiding/autoskip helpers — `hideYoutubeAdsReels` (~3664), `hideYoutubeAds` (~3675), `ytAutoskipAdd` (~3735), `noYTAdBlockBanner` (~3747), `noYTBanner` (~3759) — all commented out in `fixYoutube`, never called

Decision needed: delete, or re-enable if still wanted (especially the two YouTube ad-hiders — `initYTCSS()`'s existing CSS-based ad hiding may already cover the same ground, worth checking before deleting vs. re-enabling).
