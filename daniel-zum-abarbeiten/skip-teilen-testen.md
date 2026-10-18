# Opening/Ending teilen und importieren testen

Vorher: Erweiterung neu laden (1.12.0.2), in [chrome://extensions](chrome://extensions).

1. Eine Folge einer Serie öffnen, für die du schon ein Opening markiert hast, z. B.
   [Dragon Quest Dai, Folge 8](https://aniworld.to/anime/stream/dragon-quest-the-adventure-of-dai/staffel-1/episode-8).
   Zahnrad im Player → bei „Skip Opening/Ending" auf **Share**.
   - Erwartet: Download „Dragon Quest The Adventure of Dai - skip-share-file -- chrome-utilities.txt", im Player „File downloaded".
   - Falsch, wenn: kein Download startet oder der Dateiname nicht die Serie nennt.
2. Im Zahnrad **Mark opening / ending** → den Eintrag löschen → **Import** → die heruntergeladene Datei wählen.
   - Erwartet: „Imported", der Eintrag steht wieder in der Liste und wird in der nächsten Folge übersprungen.
   - Falsch, wenn: „That's not a shared opening or ending." erscheint.
3. Noch einmal **Import** mit derselben Datei.
   - Erwartet: Es bleibt ein Eintrag, kein doppelter.
4. Im selben Zahnrad die Zeile unter **AutoPlay** lesen.
   - Erwartet: ✅, oder ❌ mit „Start one episode yourself, the next ones start by themselves." Nach Play und N: in der nächsten Folge ✅.
   - Falsch, wenn: ❌ in einer Folge, die ohne deinen Klick von selbst losgelaufen ist.
