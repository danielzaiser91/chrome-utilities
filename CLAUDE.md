Lies vor deiner ersten Antwort: c:\code\ai\ai helper files\timestamp_prompt.md — und befolge die Regel ab sofort für jede Antwort.

## Projektinfo: chrome-utilities

Chrome Extension (MV3), kein Build-System, einzelne `utility.js` + `manifest.json`.

### Releases & Discord
- Bei neuem Release: GitHub Release erstellen mit frei formulierten Release-Notes
- GitHub Actions Workflow (`.github/workflows/discord-release.yml`) postet automatisch beim Publishen eines Releases auf Discord (#news)
- Release-Notes kommen aus dem GitHub Release-Body — nicht aus Commit-Messages
- Discord Webhook Secret: `DISCORD_WEBHOOK` (als GitHub Actions Secret gesetzt)

### Versioning
- Version steht in `manifest.json` (Felder `version` + `version_name`) und in `userOptions.version` in `utility.js`
- Beide bei Version-Bump gleichzeitig anpassen
- Commit → Push → GitHub Release erstellen → Discord postet automatisch

### User-facing Texte in den Settings (`disabledReason`, `description`, `label` etc.)
- Immer sehr einfach, kurz, unternehmerisch/technikfrei formulieren — die Nutzer wollen nichts von
  AI, Implementierungsdetails oder Ursachenanalyse lesen (z. B. "Currently broken, we're working
  on a fix!" statt "disabled: isTrusted-event check blocks programmatic clicks...")
- Technische Begründung (Root Cause, betroffene Mechanismen, Debugging-Hinweise für später)
  gehört stattdessen in einen Code-Kommentar direkt über dem Feature-Objekt, nicht in den String,
  der im UI angezeigt wird
