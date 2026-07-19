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
| ⚠️ Done, needs manual test | Chess.com | `moveDailyPuzzleUp` | ~2149 | Converted: `MutationObserver` on the puzzle container's parent (`childList`+`subtree`+`style` attribute), one-time setup via `repeatUntilCondition` |
| ⚠️ Done, needs manual test | Chess.com | `removeNewTag` | ~2175 | Converted: `MutationObserver` on `document.body` (`childList`+`subtree`), one-time setup via `repeatUntilCondition` |
| ⚠️ Done, needs manual test | Crunchyroll | `watchListColors` | ~4517 | Hybrid: `MutationObserver` on the list container does the real-time work; outer poll slowed from 500ms to 1000ms, now only a backstop to (re-)attach the observer on navigation/SPA remount (compared by container identity) |
| ⚠️ Done, needs manual test | YouTube | `noInterestButton` | ~3866 | Converted: `MutationObserver` on `document.body` (`childList`+`subtree`), calls the existing self-guarding `_addNoInterestIcon()` on every mutation instead of every 300ms |

### Manual test checklist (2026-07-19 refactor, not yet confirmed working)

Reload the extension + reload each page before testing.

- [ ] **Chess.com — Daily Puzzle widget:** confirm it stays moved to the top and doesn't snap back to its old position, especially after navigating around the site (chess.com's own React re-renders were the original suspect for resetting it).
- [ ] **Chess.com — "new" nav badge:** confirm no `.nav-tag` reading "new" is visible in the nav bar. Hard to force-trigger on demand (depends on chess.com actually shipping a "new" feature badge) — a quiet pass (nothing to see) doesn't confirm the fix, only an actual appearing-then-hidden badge does.
- [ ] **Crunchyroll — watchlist page:** confirm the 🟢/🟡 status bubbles still show up on watchlist cards, especially after scrolling or the list re-rendering.
- [ ] **YouTube — "not interested" hover icon:** confirm it still appears immediately when hovering a video card that just scrolled into view via infinite scroll (same behavior as before, just should react faster now).

## Not a good fit (37 of 43 sites) — left as polling, no action needed

- One-shot button clicks on skip/login/next flows (Disney+, Amazon, Netflix, WowTV, Twitch, Crunchyroll autoLogin)
- Marker-gated one-time UI injections (playback-rate buttons, x-ray toggle, settings-menu rows)
- `video.playbackRate` / JS-property corrections — not DOM-observable, MutationObserver structurally can't see them (WowTV, Filemoon, Luluvdo, generic helper, Amazon, Netflix)
- Genuine state/existence polling (streetview toggle, Prime panel open/close, SPA URL-change detection, countdown timers)

A dead-code side-finding surfaced during this audit (unrelated to MutationObserver) — tracked separately in [findings-dead-code.md](findings-dead-code.md), not here, since it's an independent topic.
