# Skip, F und nächste Folge testen (1.11.0.9)

Vorher: Erweiterung in `chrome://extensions` neu laden, Fehler mit „Clear all“ leeren.

1. [Dai, Folge 8](https://aniworld.to/anime/stream/dragon-quest-the-adventure-of-dai/staffel-1/episode-8)
   öffnen, Zahnrad → „Skip Opening/Ending“ → **Mark opening / ending**, auf die Zeile „Opening 1“ klicken.
   Erwartet: Der Editor öffnet sich mit Typ, Name und beiden Zeiten. Name ändern → Save → die Liste zeigt
   den neuen Namen, das Opening wird in der nächsten Folge weiter übersprungen.
2. Ins Video klicken, dann **F**, dann noch einmal **F**.
   Erwartet: Vollbild an, Vollbild aus.
3. Etwas nach unten scrollen, **F** für Vollbild, dann **N**.
   Erwartet: Folge 9 läuft, Vollbild bleibt an. Nach F (aus) steht die Seite an derselben Scrollposition.
   Falsch, wenn: die Seite neu lädt und oben steht.
4. In Folge 9 über JWs eigenen Vollbild-Knopf (unten rechts) ins Vollbild, dann **N**.
   Erwartet: Folge 10 läuft weiter im Vollbild.
5. Die Zurück-Taste des Browsers.
   Erwartet: Folge 9, Player und Seite passen zusammen.
   Falsch, wenn: die Seite Folge 10 zeigt, der Player aber Folge 9.
6. In einer Folge auf 21:50 spulen.
   Erwartet: Sprung ans Ending-Ende, danach kommt die nächste Folge.
7. Zahnrad → „Next Episode“ → „Next episode starts“ auf **when the ending starts**, Schritt 6 wiederholen.
   Erwartet: Die nächste Folge kommt, sobald das Ending erkannt ist.
8. `chrome://extensions` → Fehler.
   Erwartet: leer, auch keine Warnung „Allow attribute will take precedence over 'allowfullscreen'“.
