# Opening überspringen: Vorschlag (18.10.2026)

Ziel: Das Opening einer Serie wird in jeder Folge erkannt und übersprungen, auch wenn es nicht
bei 00:00 beginnt (Recap davor). Die Nutzerin oder der Nutzer markiert es einmal; danach erkennt
die Erweiterung es an den Bildern.

## Messung vorab (Dragon Quest Dai, AniWorld/VOE, Folge 4 → 5)

- **Bilder lesbar:** VOE spielt über MSE (`blob:`-Quelle). Der Canvas ist deshalb nicht „tainted“,
  `drawImage` + `getImageData` gehen im Player-Frame. Ein 9×8-dHash kostet 3–30 ms (headless,
  ohne GPU).
- **Folgenübergreifend:** Referenz aus Folge 4 (0–100 s, alle 0,2 s), Stichproben aus Folge 5.
  Im Opening fanden 8 von 11 ihren Partner mit Abstand 0–12 (von 64 Bit) und stimmigem Versatz
  (±0,3 s). 3 fanden keinen, vermutlich schnelle Schnitte zwischen zwei Rasterpunkten.
- **Gegenprobe Handlung:** 8 Stichproben aus der Folge selbst: bester Abstand 11–23, Versatz
  jedes Mal ein anderer. Ein einzelnes Bild reicht also nicht als Beweis (11 liegt im
  Trefferbereich); **mehrere Treffer hintereinander mit gleichem Versatz** schon.

Skript: Scratchpad `opening-match-poc.mjs` (Playwright, ohne Erweiterung).

## Ansätze

| | Ansatz | Erkennt späten Start | Aufwand | Risiko |
|---|---|---|---|---|
| 0 | **Untergrenze:** Knopf „+90 s“ bzw. Länge je Serie, Nutzer klickt | nein, Klick nötig | sehr klein | keins |
| A | **Bild-Fingerabdruck** (Daniels Idee) | ja | mittel | Openings mit folgeneigenen Szenen |
| B | Audio-Fingerabdruck (Song ist in jeder Folge gleich) | ja | groß | WebAudio greift in die Tonausgabe ein |
| C | Vorab-Scan mit zweitem, verstecktem Video | ja, schon vor dem Abspielen | groß | doppelter Datenverkehr |

**Empfehlung: A**, mit 0 als Rückfall (der Knopf kommt ohnehin ins Markieren-Menü).

## Ablauf A

1. **Markieren:** Im Zahnrad „Opening markieren“: zur Startstelle spulen, „Anfang“; zum Ende,
   „Ende“. Die Erweiterung spult danach selbst durch den Bereich und nimmt alle 0,2 s einen Hash
   (90 s ≈ 450 Hashes ≈ 4 KB). Die Reihenfolge ist egal, man muss das Opening nicht ansehen.
2. **Speichern** je Serie in `chrome.storage.local` (`cu:opening:<serie>`): Hashes mit ihrer
   Position im Opening, dazu die Länge. Die Serie kennt nur die Seite drumherum. Sie kommt über die
   bestehende Brücke (`nav`-Nachricht um den Serien-Slug erweitern).
3. **Erkennen:** Während der Wiedergabe 4× pro Sekunde hashen. Jeder Treffer (Abstand ≤ 12) hat
   eine Position p im Opening, daraus folgt der Start: `jetzt − p`. **Drei Treffer mit demselben
   Start (±0,5 s) innerhalb von 3 s** = Opening erkannt.
4. **Springen** auf `Start + Länge`. Weil jeder Referenz-Hash seine Position kennt, klappt das
   auch, wenn man mitten ins Opening einsteigt. Ein Hinweis „Opening übersprungen · Zurück“ für
   ein paar Sekunden erlaubt das Rückgängigmachen.

Ein Ending lässt sich mit demselben Baustein erkennen (dann: nächste Folge statt Sprung).

## Offen, vor dem Bau zu messen

- Größerer Hash (16×16, 256 Bit) gegen 9×8: trennt er Opening und Handlung deutlicher?
- 5 Folgen statt 2, darunter eine mit Recap vor dem Opening und eine mit geändertem Opening (neue
  Staffel): Trefferquote, Fehlalarme.
- Kosten im echten Chrome während der Wiedergabe (4 Hashes/s), auch auf schwachem Laptop.
- Andere Player (filemoon, vidmoly, Crunchyroll): Ist die Quelle dort auch `blob:`? Sonst ist der
  Canvas gesperrt und A geht dort nicht.
- Vor dem Bau: Gegenentwurf eines Agenten, der nur das Ziel kennt.
