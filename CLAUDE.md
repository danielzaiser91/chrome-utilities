## Projektinfo: chrome-utilities

Chrome Extension (MV3), kein Build-System, einzelne `utility.js` + `manifest.json`.

### Releases & Discord
- Bei neuem Release: GitHub Release erstellen mit Release-Notes nach dem Format unten
- GitHub Actions Workflow (`.github/workflows/discord-release.yml`) postet automatisch beim Publishen eines Releases auf Discord (#news)
- Release-Notes kommen aus dem GitHub Release-Body — nicht aus Commit-Messages
- Discord Webhook Secret: `DISCORD_WEBHOOK` (als GitHub Actions Secret gesetzt)

#### Format der Release-Notes — zwei Dokumente in einem Body

Der Release-Body trägt beides: **oberhalb** der Marke `<!-- discord-cut -->` die kurze
Ankündigung, die nach Discord geht, **unterhalb** die ausführlichen Notizen, die auf der
Release-Seite bleiben. Der Workflow schneidet an der Marke und hängt automatisch einen Link
auf die Release-Seite an. Fehlt die Marke, wird der ganze Body angekündigt — kurze Releases
brauchen also keine.

So wird an einer Stelle geschrieben, und trotzdem bekommt Discord eine Nachricht, die man
liest, während jedes Detail nachlesbar bleibt.

```
**🆕 <Seite> — neu unterstützt**
• Kürzester Satz, der den Nutzen nennt
• Weiteres · mit Mittelpunkt gebündelt, wenn es zusammengehört

**<Seite>**
• Ein Punkt, eine Zeile

<!-- discord-cut -->

## Ausführlich

### <Überschrift>
Fließtext, Ursachen, Messwerte, Einschränkungen — alles, was oben nichts zu suchen hat.

**Alle Commits:** https://github.com/danielzaiser91/chrome-utilities/compare/vALT...vNEU
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
- **Details stehen unter der Marke, nicht darüber.** Den Link auf die Release-Seite hängt der
  Workflow selbst an — er gehört nicht in den oberen Teil geschrieben, sonst steht er zweimal.
- **Ein Patch-Release ist kurz.** Zwei, drei Zeilen. Wer mehr wissen will, klickt.

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
