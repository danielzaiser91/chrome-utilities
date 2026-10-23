# Stand chrome-utilities

## Daniel-Todo

### Jetzt
- 🟠 Netflix ohne `trackId`/`tctx` in der Adresse (1.13.1.0, Branch `netflix-url-kuerzen`): Erweiterung und Netflix-Übersicht neu laden, Folge anklicken. Erwartet: Adresse nur `netflix.com/watch/<id>`; falsch, wenn die Parameter bleiben oder der Player nicht startet.

## In Arbeit


## Als Nächstes

- ⏸️ Auf Eis (Daniel, 18.10.2026): Skip Opening/Ending für Prime Video (skip.js von VOE lösen: Video, Serie/Folge, Ablageort); hat die Serie ein eigenes Opening markiert, klickt die Erweiterung Amazons „Intro überspringen“ dort nicht mehr (Daniel, 18.10.2026) – Bild-Hashes gehen dort nicht (DRM liefert Schwarz, gemessen 18.10.2026, docs/opening-erkennung.md); nächster Versuch: Erkennung am Ton (Audio-Fingerabdruck über WebAudio, erst messen, ob Prime den Ton liefert); Ausweichweg Tab-Screenshot (`captureVisibleTab`, braucht breitere Berechtigung)
