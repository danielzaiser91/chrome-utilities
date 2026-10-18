# YouTube: Fortsetzen ohne Verzögerung prüfen

Stand 1.12.1.2 (18.10.2026).

1. [chrome://extensions](chrome://extensions) → Web Utility Plugin → Neu laden.
2. Ein YouTube-Video ein paar Minuten anschauen, dann die Seite neu laden.

- **Vorher:** Das Video lief kurz ab 0 und sprang dann an die gemerkte Stelle.
- **Erwartet:** Es beginnt gleich an der gemerkten Stelle.
- **Falsch, wenn:** Es wieder kurz ab 0 läuft, gar nicht springt, oder ein Link mit `&t=` nicht
  mehr an seiner eigenen Stelle beginnt.
