# F3: Lässt Prime Video die Erweiterung das Bild lesen?

Skip Opening/Ending erkennt Openings am Bild. Prime Video ist kopiergeschützt (DRM). Gut möglich,
dass Chrome der Erweiterung dort nur ein schwarzes Bild gibt – dann geht die Erkennung auf Prime
gar nicht. Ich kann es selbst nicht messen: Mein Test-Browser spielt Prime nicht ab.

**So misst du es (1 Minute):**

1. In Chrome eine beliebige Folge auf Prime Video starten, mitten in der Handlung laufen lassen.
2. `F12` → Reiter „Console“ → folgende Zeile einfügen, Enter:

```
(() => { const v = [...document.querySelectorAll("video")].find((v) => v.videoWidth); if (!v) return "kein Video"; const c = document.createElement("canvas"); c.width = 17; c.height = 16; const g = c.getContext("2d"); g.drawImage(v, 0, 0, 17, 16); let d; try { d = g.getImageData(0, 0, 17, 16).data; } catch (e) { return "gesperrt: " + e.message; } let s = 0, q = 0; for (let i = 0; i < d.length; i += 4) { const x = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11; s += x; q += x * x; } const n = d.length / 4, m = s / n; return `Mittel ${m.toFixed(1)}, Streuung ${Math.sqrt(q / n - m * m).toFixed(1)}`; })()
```

3. Die ausgegebene Zeile hierher oder in den Chat kopieren.

**Erwartet, wenn es geht:** Streuung deutlich über 8 (bei einem normalen Bild meist 30–60).
**Geht nicht, wenn:** „Mittel 0.0, Streuung 0.0“ oder „gesperrt: …“ – dann baue ich es für
Prime nicht, und es bleibt beim Klick auf Amazons „Intro überspringen“.

Geplant, wenn es geht: Wer für eine Serie ein Opening markiert, bekommt dort unsere Erkennung statt
Amazons Knopf (der nicht überall erscheint und unzuverlässig ist).

Antwort: die ausgegebene Zeile
