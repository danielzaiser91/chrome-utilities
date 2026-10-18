# AniWorld: Autoplay, nächste Folge, N/P testen (Version 1.11.0.5)

Vorher die Erweiterung unter `chrome://extensions` neu laden.

1. [Dragon Quest Dai, Folge 4](https://aniworld.to/anime/stream/dragon-quest-the-adventure-of-dai/staffel-1/episode-4) öffnen.
   - Erwartet: Die Folge startet von selbst, mit Ton.
   - Falsch, wenn: Sie steht still, bis du Play drückst.
2. Maus über den Player bewegen: Unten links in der Leiste erscheint der Knopf „nächste Folge“ (⏭).
   - Erwartet: Ein Klick darauf öffnet Folge 5.
3. In Folge 5 die Taste **P** drücken, einmal im Player und einmal daneben auf der Seite.
   - Erwartet: Beide Male geht es zurück zu Folge 4. **N** geht entsprechend vorwärts.
   - Falsch, wenn: Ein Buchstabe im Suchfeld der Seite die Folge wechselt.
4. Ans Ende einer Folge spulen und auslaufen lassen.
   - Erwartet: Die nächste Folge öffnet sich von selbst.
5. Zahnrad im Player: Dort gibt es jetzt AutoPlay, Next Episode und Hotkeys (N/P erklärt), alle drei
   an. Schaltest du einen davon aus, darf er nicht mehr greifen.

Schritte 1 und 4 ließen sich headless nicht prüfen. Dort startet der Player im AniWorld-Frame
auch ohne Erweiterung nicht.
