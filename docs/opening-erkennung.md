# Opening und Ending überspringen (18.10.2026)

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

## Ablauf A (Vorschlag)

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

## Umsetzung (18.10.2026, `skip.js`)

Gebaut wie Ablauf A, mit diesen Änderungen gegenüber dem Vorschlag:

- **Generisch:** Liste je Serie mit beliebig vielen Abschnitten, jeder als Opening oder Ending
  deklariert (Pflicht-Dropdown im Dialog). Je Folge höchstens ein Opening und ein Ending.
- **Hash 17×16 (256 Bit)** statt 9×8, Treffer bei Abstand ≤ 40. 9×8 trennte nicht sauber
  (Handlung ab 9, Abschnitt bis 17); 256 Bit: Abschnitt fast immer ≤ 40, Handlung ≥ 61.
- **Referenz beim Abspielen statt Seek:** Der Dialog spielt den Abschnitt mit Rate 4 stumm ab und
  hasht jedes Bild (`requestVideoFrameCallback`). Seeks in 0,2-s-Schritten verpassten schnelle
  Schnitte, daher die 3 Fehlstellen im ersten Messlauf.
- **Standbilder:** Ist eine Probe der vorigen fast gleich (≤ 6), zählt die späteste passende
  Referenzzeit. So landet der Sprung höchstens zu früh, nie hinter dem Abschnittsende.
- **Nach der Erkennung** wird die Lage je Folge gespeichert (`cu:skip:<serie>`, Schlüssel Folge +
  Video-ID); danach wird in dieser Folge nicht mehr gesucht.
- **Suchfenster** Opening 0–45 %, Ending ab 55 % der Laufzeit; kein Scan bei Pause, verstecktem
  Tab, offenem Dialog oder Videos ≤ 10 min. Ab 90 % gesehener Fenstersekunden ohne Treffer gilt
  der Abschnitt für die Folge als „nicht vorhanden“.

**PoC mit der gebauten Einstellung** (Folge 4 als Referenz, Folge 5 als Probe, 4 Proben/s, k = 3):
Opening 349/349 Einstiege erkannt, Wartezeit Median 0,5 s, max 2 s, 0 von 34 Handlungsfenstern
als Fehlalarm. Ending 357/360 (die drei Fehlstellen in der ersten Sekunde des Abschnitts),
0 von 71 Fehlalarmen. Mit 2 Proben/s fielen Einstiege kurz vor Abschnittsende durch.

**Am echten Player (Playwright, echte Erweiterung, 18.10.2026):** Opening und Ending in je rund
24 s eingelesen. Folge 5 ab 0: Opening sofort übersprungen; ab 1310 s Ending nach 2 s erkannt.
Mit „Next episode starts: when the ending starts“ kam nach 2 s Folge 6.

### Nächste Folge beim Ending

Unter „Next Episode“ wählt ein Dropdown, wann es weitergeht: am Videoende (Ending wird übersprungen,
der Rest danach läuft noch) oder sobald das Ending erkannt ist. Der Sprung setzt dann ans
Videoende, das vorhandene `ended` → nächste Folge übernimmt.

**Idee für einen dritten Eintrag:** Manche Folgen haben nach dem Ending noch eine Szene. Erkennen,
ob nach dem Abschnittsende noch Inhalt kommt (Länge Restvideo, oder Bilder nach dem Ending, die
keiner Vorschau gleichen), und nur dann bis zum Ende spielen; sonst gleich weiter.

## Offen

- Kosten im echten Chrome während der Wiedergabe auf einem schwachen Laptop.
- Andere Player (filemoon, vidmoly, Crunchyroll): Ist die Quelle dort auch `blob:`? Sonst ist der
  Canvas gesperrt und die Erkennung geht dort nicht.
- Eine neue Staffel mit geändertem Opening: wird als eigener Abschnitt markiert (Liste), ungetestet.
