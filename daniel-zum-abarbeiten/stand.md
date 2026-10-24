# Stand chrome-utilities

## Daniel-Todo

### Jetzt
- 🔴 E1 Erweiterung neu laden, AniWorld-Folge mit VOE neu laden: oben erscheint „Player controls are off on this video server. Allow“ → Allow, Chrome-Dialog bestätigen → Zahnrad im Player da? Falsch, wenn kein Hinweis kommt oder das Zahnrad danach fehlt (1.14.0.3; Chromes Dialog ließ sich nicht automatisiert testen)

## In Arbeit
- (nichts)

## Als Nächstes

- Direkte VOE-Seite (voe.sx im eigenen Tab): Zahnrad zeigt einen Skip-Eintrag ohne Funktion (Nebenfund 23.10.2026)


- ⏸️ Auf Eis (Daniel, 18.10.2026): Skip Opening/Ending für Prime Video (skip.js von VOE lösen: Video, Serie/Folge, Ablageort); hat die Serie ein eigenes Opening markiert, klickt die Erweiterung Amazons „Intro überspringen“ dort nicht mehr (Daniel, 18.10.2026) – Bild-Hashes gehen dort nicht (DRM liefert Schwarz, gemessen 18.10.2026, docs/opening-erkennung.md); nächster Versuch: Erkennung am Ton (Audio-Fingerabdruck über WebAudio, erst messen, ob Prime den Ton liefert); Ausweichweg Tab-Screenshot (`captureVisibleTab`, braucht breitere Berechtigung)
