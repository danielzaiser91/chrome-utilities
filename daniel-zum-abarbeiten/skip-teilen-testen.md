# Opening/Ending teilen und importieren testen

Vorher: Erweiterung neu laden (1.12.0.1), in [chrome://extensions](chrome://extensions).

1. Eine Folge einer Serie öffnen, für die du schon ein Opening markiert hast, z. B.
   [Dragon Quest Dai, Folge 8](https://aniworld.to/anime/stream/dragon-quest-the-adventure-of-dai/staffel-1/episode-8).
   Zahnrad im Player → bei „Skip Opening/Ending" auf **Share**.
   - Erwartet: links unten im Player „Copied to clipboard".
   - Falsch, wenn: „Couldn't copy" erscheint oder gar nichts.
2. Mit Strg+V in einen Editor einfügen.
   - Erwartet: eine lange Zeile, die mit `{"cuSkip":1,"segments":[` beginnt.
3. Im Zahnrad **Mark opening / ending** → den Eintrag löschen → **Import** → Strg+V ins Feld → **Import**.
   - Erwartet: Der Eintrag steht wieder in der Liste und wird in der nächsten Folge übersprungen.
   - Falsch, wenn: „That's not a shared opening or ending." erscheint.
4. Noch einmal **Import** mit demselben Text.
   - Erwartet: Es bleibt ein Eintrag, kein doppelter.
