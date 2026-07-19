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
| ✅ Done, confirmed working, then hardened (2026-07-19) | Chess.com | `moveDailyPuzzleUp` | ~2138 | Converted: `MutationObserver` on the puzzle container's parent (`childList`+`subtree`+`style` attribute). Initially attached via one-shot `repeatUntilCondition`; upgraded to the same identity-check backstop poll as `watchListColors` after finding the one-shot pattern can orphan the observer if React ever replaces the container (see below) |
| ✅ Done, confirmed working (2026-07-19) | Chess.com | `removeNewTag` | ~2175 | Converted: `MutationObserver` on `document.body` (`childList`+`subtree`), one-time setup via `repeatUntilCondition` |
| ✅ Done, confirmed working (2026-07-19) | Crunchyroll | `watchListColors` | ~4517 | Hybrid: `MutationObserver` on the list container does the real-time work; outer poll slowed from 500ms to 1000ms, now only a backstop to (re-)attach the observer on navigation/SPA remount (compared by container identity) |
| ✅ Done, confirmed working (2026-07-19) | YouTube | `noInterestButton` | ~3866 | Converted: `MutationObserver` on `document.body` (`childList`+`subtree`), calls the existing self-guarding `_addNoInterestIcon()` on every mutation instead of every 300ms |

All 4 manual tests confirmed working by the user on 2026-07-19 (Daily Puzzle position, "new" nav badge, watchlist status bubbles, YouTube hover icon).

**Follow-up finding (still 2026-07-19):** a real-world bug in the unrelated Crunchyroll subtitle-cue `MutationObserver` (also one-shot-attached, from the original fix that predates this refactor) showed that attaching the observer via a one-shot `repeatUntilCondition` is unsafe whenever the host page can *replace* the observed container node, not just mutate within it — the observer gets orphaned on a dead node with no recovery, and the symptom looks like "broken and stays broken until reload." `moveDailyPuzzleUp` used the exact same one-shot-attach shape (parent element that a React re-render could plausibly replace), so it was proactively upgraded to the identity-check backstop poll pattern too, even though its own manual test hadn't (yet) surfaced the bug. `removeNewTag` and `noInterestButton` observe `document.body`, which the DOM spec guarantees is never replaced for the life of a document — those two are exempt and were left as one-shot attaches. See [[feedback_mutationobserver_over_polling]] for the generalized rule.

## Not a good fit (37 of 43 sites) — left as polling, no action needed

- One-shot button clicks on skip/login/next flows (Disney+, Amazon, Netflix, WowTV, Twitch, Crunchyroll autoLogin)
- Marker-gated one-time UI injections (playback-rate buttons, x-ray toggle, settings-menu rows)
- `video.playbackRate` / JS-property corrections — not DOM-observable, MutationObserver structurally can't see them (WowTV, Filemoon, Luluvdo, generic helper, Amazon, Netflix)
- Genuine state/existence polling (streetview toggle, Prime panel open/close, SPA URL-change detection, countdown timers)

A dead-code side-finding surfaced during this audit (unrelated to MutationObserver) — tracked separately in [findings-dead-code.md](findings-dead-code.md), not here, since it's an independent topic.
