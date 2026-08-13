## Projektinfo: chrome-utilities

Chrome Extension (MV3), kein Build-System, einzelne `utility.js` + `manifest.json`.

### Releases & Discord
- Bei neuem Release: GitHub Release erstellen mit Release-Notes nach dem Format unten
- GitHub Actions Workflow (`.github/workflows/discord-release.yml`) postet automatisch beim Publishen eines Releases auf Discord (#news)
- Release-Notes kommen aus dem GitHub Release-Body — nicht aus Commit-Messages
- Discord Webhook Secret: `DISCORD_WEBHOOK` (als GitHub Actions Secret gesetzt)

#### Format der Release-Notes (= die Discord-Nachricht)

Der Release-Body landet **unverändert** in der Discord-Einbettung. Er ist keine Dokumentation,
sondern eine Ankündigung: Wer sie überfliegt, soll in fünf Sekunden wissen, ob ihn dieses
Update betrifft.

```
**🆕 <Seite> — neu unterstützt**
• Kürzester Satz, der den Nutzen nennt
• Weiteres · mit Mittelpunkt gebündelt, wenn es zusammengehört

**<Seite>**
• Ein Punkt, eine Zeile

Alle Änderungen: <https://github.com/danielzaiser91/chrome-utilities/compare/vALT...vNEU>
```

Verbindlich:

- **Stichpunktartig und wortkarg.** Ein Punkt ist eine Zeile, kein Absatz. Kein Fließtext,
  keine Erklärung, wie etwas funktioniert.
- **Nach Seite gruppiert**, wichtigste zuerst. Eine neu unterstützte Seite steht immer oben
  und trägt 🆕; danach das, was bestehende Nutzer merken; Kleinkram zuletzt oder gar nicht.
- **Nur was der Nutzer merkt.** Kein Selektor, kein Dateiname, keine Ursachenanalyse, keine
  Commit-Titel. Interne Umbauten ohne sichtbare Wirkung tauchen nicht auf.
- **Keine Installationsanleitung.** Die steht im README und ist bei jedem Release dieselbe —
  im Release-Text ist sie der längste und wertloseste Absatz.
- **Details gehören nicht hinein, sondern hinter den Link.** Abschluss immer mit
  `Alle Änderungen: <compare-Link vom vorigen auf den neuen Tag>`. Die spitzen Klammern
  unterdrücken Discords Link-Vorschau.
- **Ein Patch-Release ist kurz.** Zwei, drei Zeilen plus Link. Wer mehr wissen will, klickt.

Anlass (13.08.2026): Die Notes zu v1.5.0 hatten Überschriften, Fließtext-Absätze und eine
vollständige Installationsanleitung — in Discord eine Textwand, die niemand liest.

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
