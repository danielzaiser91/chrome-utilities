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

**Drei Stellen sind veröffentlicht, eine vierte ist intern.** `1.5.2.0` ist ein Arbeitsstand auf
dem Weg zu `1.5.2`; die vierte Stelle zählt hoch, solange nichts veröffentlicht ist. Beim
Release fällt sie weg, und die Nummer lautet `1.5.2`.

Damit ist an der Nummer selbst ablesbar, woran man ist: **vier Stellen = nur im Repo, drei
Stellen = draußen bei den Nutzern.**

**Prüffrage vor jedem Anfassen der Nummer:** *Lege ich in dieser Antwort ein GitHub-Release an?*

- **Nein** → die vierte Stelle zählt hoch (`1.6.0.0` → `1.6.0.1`).
- **Ja** → vierte Stelle streichen, den Rest als Release-Nummer verwenden.

Welche der drei veröffentlichten Stellen sich bewegt, entscheidet die **Wirkung auf den Nutzer**
— nicht, was für eine Art Arbeit dahintersteckt und nicht, wie viele Posten es waren.

**Prüffrage:** *Merkt ein Nutzer den Unterschied sofort — und lohnt es, ihm davon zu erzählen?*

- **Ja** → zweite Stelle (`1.5.x` → `1.6.0`). Der Wow-Effekt zählt, nicht die Bauweise. Eine
  winzige Änderung mit großer Wirkung hebt sie genauso wie ein Umbau über hundert Zeilen.
- **Nein** → dritte Stelle (`1.5.1` → `1.5.2`). Auch dann, wenn viel Arbeit drinsteckt: Was
  niemand bemerkt, ist kein neuer Anstrich.

Eine neue Funktion ist **kein** eigener Grund. Eine, die keiner merkt, bewegt die zweite Stelle
nicht; eine Fehlerbehebung, die etwas endlich benutzbar macht, sehr wohl.

Beim Anheben der zweiten oder dritten Stelle wird die vierte auf `0` zurückgesetzt. Die vierte
zählt die Arbeitsstände der Erweiterung selbst — reine Doku-Änderungen bewegen sie nicht.

Anlass (14.08.2026): Die erste Fassung dieser Regel zählte Arten von Arbeit auf („neue Seite,
neue Funktion, Umbau der Oberfläche"). Danach wurde nach Kategorie entschieden — „ist ein
Feature, also zweite Stelle" — statt nach dem, was beim Nutzer ankommt.

Angefasst wird die Nummer immer **gleichzeitig** in `manifest.json` (`version` **und**
`version_name`) und in `userOptions.version` in `utility.js`. Vier Stellen sind in einem
MV3-Manifest zulässig.

Ablauf eines Releases: Nummer setzen → Commit → Push → GitHub Release anlegen → der Workflow
postet nach Discord.

Anlass (14.08.2026): Zwischen v1.5.1 und dem nächsten Release wurde viermal hochgezählt, ohne
etwas zu veröffentlichen — 1.5.2, 1.6.0 und 1.6.1 hat nie jemand bekommen. Die Nummer im
Manifest war danach weder der veröffentlichte Stand noch eine Angabe, auf die sich jemand
beziehen kann. Die vierte Stelle löst genau das: Arbeitsstände sind zählbar, ohne dass eine
Release-Nummer verbraucht wird.

### User-facing Texte in den Settings (`disabledReason`, `description`, `label` etc.)
- Immer sehr einfach, kurz, unternehmerisch/technikfrei formulieren — die Nutzer wollen nichts von
  AI, Implementierungsdetails oder Ursachenanalyse lesen (z. B. "Currently broken, we're working
  on a fix!" statt "disabled: isTrusted-event check blocks programmatic clicks...")
- Technische Begründung (Root Cause, betroffene Mechanismen, Debugging-Hinweise für später)
  gehört stattdessen in einen Code-Kommentar direkt über dem Feature-Objekt, nicht in den String,
  der im UI angezeigt wird
