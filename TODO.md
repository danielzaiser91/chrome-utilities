# TODO

- Crunchyroll two-speaker subtitle cues ("- Oh. - Hm.") are currently left inline as-is (confirmed acceptable). Possible future idea: line-break + drop dashes instead. Not wanted right now — see [docs/findings-crunchyroll-two-speaker-dash-format.md](docs/findings-crunchyroll-two-speaker-dash-format.md) if this changes.

<!-- Done: Amazon "up next" carousel ("Jetzt folgt") Show-button fix, 2026-08-08, confirmed working
     by user -- Amazon's own bug (reproduces with the extension disabled): the carousel has a working
     "Hide" button while visible, but once hidden renders no button to show it again.
     fixAmazonCarouselShowButton() clones Amazon's real Hide button (style/language parity -- Amazon's
     own button is oddly English, "Hide", even on amazon.de) into a "Show" button in the same slot,
     event-driven (capture-phase click listener + setTimeout(0), not polling) so it appears immediately
     after Hide is clicked; removes itself synchronously on click before triggering Amazon's real
     toggle. -->
<!-- Done: Amazon backdrop fix, 2026-08-09, confirmed working -- opacityOverlayEl now targets
     .atvwebplayersdk-player-container .fpqiyer > .f8hspre.f1makowq (via queryVisible) instead of the
     dead .atvwebplayersdk-overlays-container > div. Found via DevTools "Copy selector" on the element
     that visibly removes both top+bottom backdrop gradients when given display:none; deliberately
     dropped the ID prefix (#dv-web-player-2 -- the numeric suffix is unstable, tied to the duplicate-
     player-instance issue below) and the unlabeled intermediate divs from the copied selector, keeping
     only the two classed anchors (fpqiyer, stable across every capture taken that day; f8hspre.f1makowq,
     the specific first-child). This was the last open piece of the toggleUIVisible() saga below. -->
<!-- Done: debug harness removed, 2026-08-09 -- AMAZON_DEBUG_BUILD badge + cuAmazonDebugLog() (gated
     behind localStorage.cu_amazon_debug) fully deleted from utility.js once the Amazon SPA saga below
     was confirmed resolved end to end. -->

<!-- Done: MutationObserver refactor (4 conversions, confirmed working 2026-07-19) — see docs/findings-mutationobserver-refactor.md for the record -->
<!-- Done: dead code cleanup (Amazon addPlayBackRateButton cluster, Crunchyhook chain, 5 YouTube ad-hiders) 2026-07-19 — see docs/findings-dead-code.md for the record -->
<!-- Done: Amazon xrayToggle() fix, 2026-08-08 — added addPlaybackRateButton_amazon() anchored to
     .atvwebplayersdk-hideabletopbuttons-container. 3 follow-up bugs fixed in the same round:
     (1) playback-rate button duplicated on Amazon's own React re-renders wiping a classList marker
     — fixed by checking the button's own live presence instead; (2) a duplicate-polling-loop bug —
     repeatIfCondition's internal handler is always named "repeatIf", so Interval.exists() can't
     dedupe multiple starts, fixed with a one-time-start guard; (3) addPlaybackRateButton__generic()
     read subFeatures.playBackSpeed (whole object) instead of .value for the input default, fixed.
     Confirmed working by user 2026-08-08. -->
<!-- Done: Amazon toggleUIVisible() (instant-hide-on-mouseleave/enter) fix, 2026-08-08/09 — full saga,
     confirmed working (hide AND show, backdrop included) on the 2-hop SPA path (card -> overview ->
     episode) — see the backdrop item above for the last piece. Selector fixes: topActionBarEl -> .atvwebplayersdk-
     hideabletopbuttons-container, centerActionsEl -> .cu-moved-lower, closeButtonEl -> its own
     .atvwebplayersdk-closebutton-wrapper (turned out to be a sibling of hideabletopbuttons-container,
     not a child). Root cause of the SPA-specific failure turned out to be TWO stacked, independent
     bugs, found via a purpose-built debug harness (AMAZON_DEBUG_BUILD badge + cuAmazonDebugLog(),
     gated behind localStorage.cu_amazon_debug, all TEMP -- remove once this is fully closed out):
     (1) this content script was running 3-4 independent times simultaneously in the exact same top
     frame after SPA navigation (confirmed via identical location.href across every DevTools execution
     context) -- a long-known, never-fixed issue already documented at the top of utility.js ("BIG
     TODO #1", originally observed on Twitch, previously wrongly blamed on all_frames -- tested
     all_frames:false, made it WORSE (4 instead of 3), ruled out). Fixed with a DOM-based dedup guard
     (document.documentElement.dataset.cuInjected, set right before websiteSelector() runs) -- a JS
     variable can't work here since each re-injection gets its own fresh isolated JS world, but all
     share the same document. (2) Independently, Amazon leaves stale/duplicate copies of several
     player-chrome elements in the DOM after SPA navigation (querySelectorAll found 2 matches for
     topActionBarEl/bottomActionBarEl/closeButtonEl/titleEl, with the querySelector-picked one
     confirmed NOT currently rendered/visible via offsetParent) -- the same class of bug already found
     once for the playback-rate-button duplication. Fixed with a new queryVisible() helper (picks the
     match with offsetParent !== null instead of blindly the first) for the toggleUIVisible() lookups
     and moveVideoActionsLower()'s button lookup. queryVisible() broke instant-SHOW as an immediate
     side effect (can't tell "intentionally just hidden" from "dead duplicate", both have
     offsetParent===null) -- fixed by having toggleUIVisible() remember exactly which elements its own
     last "remove" call hid and restoring precisely those on "add", no re-querying needed for showing. -->
