# Findings: Crunchyroll two-speaker dash format — currently left as-is

Surfaced 2026-08-02 while fixing empty/orphaned dash markers in Crunchyroll subtitles (see
`cr_fixSubtitleEmptyDash()` in utility.js). When a cue genuinely has 2 real speakers, Crunchyroll
formats it inline on one line, both segments separated by " - ", e.g.:

```
- Oh. - Hm.
```

The current fix explicitly detects this shape (2+ non-empty dash-delimited segments) and leaves it
completely untouched — confirmed correct/acceptable by the user for two separate real-world cues
(no specific timestamp, and Clevatess S2E1 ~11:39).

**Open idea, not yet wanted:** the user noted this inline format is acceptable as-is for now, but
flagged a possible future improvement: reformat two-speaker cues to put each speaker on their own
line (`<br>` between them) AND drop the leading dashes entirely, e.g. render as:

```
Oh.
Hm.
```

instead of `- Oh. - Hm.`. This would be a deliberate stylistic change, not a bug fix — only pursue
if explicitly requested. If picked up later: `cr_fixSubtitleEmptyDash()` already has the segment
list computed for the 2+-segment case, so producing `segments.join("\n")` (mapped through
`cr_extractCueText`'s inverse — i.e. writing back as multiple text nodes/`<br>` rather than plain
`textContent`) would need `cr_fixSubtitleCues()`'s write-back path adjusted, since it currently
always writes `li.textContent = fixed` (a single flattened string, `<br>` gets lost the same way
already documented for multi-line cues elsewhere in this fix).
