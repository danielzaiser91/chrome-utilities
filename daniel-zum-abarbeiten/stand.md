# Stand chrome-utilities

## Daniel-Todo

### Jetzt
- (nichts offen)

## In Arbeit
- VOE: Player lädt bei „This video file cannot be played“ (232011) selbst neu und springt an die Stelle (1.15.0.1, bei Daniel zum Testen)
- joyn.de: Geschwindigkeit übers Zahnrad, wirkt auf Folgen und Filme, nicht auf Live-TV und Werbung (1.15.0.2, bei Daniel zum Testen)

## Als Nächstes

- Direkte VOE-Seite (voe.sx im eigenen Tab): Zahnrad zeigt einen Skip-Eintrag ohne Funktion (Nebenfund 23.10.2026)


- ⏸️ Auf Eis (Daniel, 18.10.2026): Skip Opening/Ending für DRM-Seiten (skip.js von VOE lösen: Video, Serie/Folge, Ablageort). Bild-Hashes gehen dort nicht (DRM liefert Schwarz, gemessen 18.10.2026, docs/opening-erkennung.md); nächster Versuch: Erkennung am Ton (Audio-Fingerabdruck über WebAudio, erst messen, ob die Seite den Ton liefert); Ausweichweg Tab-Screenshot (`captureVisibleTab`, braucht breitere Berechtigung). Betrifft:
  - Prime Video: Hat die Serie ein eigenes Opening markiert, klickt die Erweiterung Amazons „Intro überspringen“ dort nicht mehr (Daniel, 18.10.2026)
  - joyn.de (Daniel, 13.11.2026): Video ebenfalls verschlüsselt (Screenshots/Aufnahmen schwarz). joyn hat selbst kein Opening/Ending überspringen und keine „Nächste Folge“, wir könnten also beides liefern (Nächste Folge geht auch ohne Erkennung)
