# Opening/Ending überspringen testen (1.11.0.8)

Vorher: Erweiterung in `chrome://extensions` neu laden.

1. [Dai, Folge 4](https://aniworld.to/anime/stream/dragon-quest-the-adventure-of-dai/staffel-1/episode-4)
   öffnen, Zahnrad im Player → „Skip Opening/Ending“ → **Mark opening / ending** → **Add skip**.
   Typ „Opening“, Start 0:00, Ende 1:30 → „Read frames“ → Save. Danach Ending 21:40,2 bis 23:13,1.
   Erwartet: Vorschaubilder erscheinen, die Liste zeigt „Opening 1“ und „Ending 1“.
   Falsch, wenn: das Einlesen hängen bleibt oder das Video danach woanders steht als vorher.
2. [Folge 5](https://aniworld.to/anime/stream/dragon-quest-the-adventure-of-dai/staffel-1/episode-5)
   von vorn abspielen.
   Erwartet: nach wenigen Sekunden „Opening skipped · Undo“, das Video steht bei etwa 1:31.
   Falsch, wenn: kein Sprung, oder er landet mitten in der Handlung.
3. In Folge 5 auf 21:50 spulen.
   Erwartet: nach ein, zwei Sekunden Sprung ans Ending-Ende, nach dem Rest der Folge kommt Folge 6.
   Falsch, wenn: das Ending durchläuft.
4. Zahnrad → „Next Episode“ → „Next episode starts“ auf **when the ending starts**, dann Schritt 3
   in Folge 6 wiederholen (etwa 2 min vor Schluss spulen).
   Erwartet: Folge 7 kommt, sobald das Ending erkannt ist.
5. Außerhalb des Players (auf der AniWorld-Seite) **F** drücken, dann noch einmal.
   Erwartet: Vollbild an, Vollbild aus.
