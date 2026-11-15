// Wächter Netflix-Leiste: Die Erweiterung darf Netflix nicht dauernd "Aktivität" melden.
// Der Tempo-Takt (jede Sekunde _netflix_setPlayerValue) schrieb playbackRate und das Eingabefeld
// auch bei gleichem Wert; Schreiben ohne Änderung ist so ein Anstoß, der die Leiste hält.
// Kein Browser nötig: die echten Funktionen werden aus utility.js geschnitten und in vm gefahren.
//
//   node tests/netflix/test.mjs
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import assert from "node:assert/strict";

const quelle = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "..", "utility.js"), "utf8");
const schneide = (anfang) => {
  const i = quelle.indexOf(anfang);
  assert.ok(i >= 0, `${anfang} fehlt in utility.js`);
  const ende = quelle.indexOf("\n};", i) + 3;
  return quelle.slice(i, ende);
};

function welt(rate, aktiv) {
  let schreibzugriffe = 0;
  const video = {
    _r: rate,
    get playbackRate() { return this._r; },
    set playbackRate(v) { schreibzugriffe++; this._r = v; },
  };
  const eingabe = { max: "5", min: "0.2", _v: String(rate), _w: 0,
    get value() { return this._v; }, set value(v) { this._w++; this._v = String(v); } };
  let blurs = 0;
  const ctx = vm.createContext({
    query: () => video,
    clamp: (v, { max, min }) => Math.min(+max, Math.max(+min, v)),
    userOptions: { netflix: { featurePlayBackSpeed: { isEnabled: { subFeatures: { playBackSpeed: { value: 1 } } } } } },
    document: { activeElement: aktiv ? { blur: () => blurs++ } : null },
  });
  vm.runInContext(`${schneide("const _netflix_setPlayerValue")}\n${schneide("const _netflix_releaseFocus")}
this.set = _netflix_setPlayerValue; this.rel = _netflix_releaseFocus;`, ctx);
  return { ctx, video, eingabe, schreib: () => schreibzugriffe, felder: () => eingabe._w, blurs: () => blurs };
}

// 1. Gleicher Wert, zehn Takte: kein einziger Schreibzugriff (der Fehler: zehn).
{
  const w = welt(1.25, false);
  for (let i = 0; i < 10; i++) w.ctx.set(1.25, w.eingabe);
  assert.equal(w.schreib(), 0, "playbackRate bei gleichem Wert geschrieben");
  assert.equal(w.felder(), 0, "Eingabefeld bei gleichem Wert geschrieben");
}
// 2. Anderer Wert: genau ein Schreibzugriff, danach Ruhe (Tempo funktioniert weiter).
{
  const w = welt(1, false);
  for (let i = 0; i < 5; i++) w.ctx.set(1.5, w.eingabe);
  assert.equal(w.video.playbackRate, 1.5);
  assert.equal(w.schreib(), 1);
  assert.equal(w.eingabe.value, "1.5");
}
// 3. Grenzen gelten weiter (Klemmen auf max 5).
{
  const w = welt(1, false);
  w.ctx.set(9, w.eingabe);
  assert.equal(w.video.playbackRate, 5);
}
// 4. Fokus wird nach eigenem Klick abgegeben; ohne aktives Element kein Fehler.
{
  const w = welt(1, true);
  w.ctx.rel();
  assert.equal(w.blurs(), 1);
  welt(1, false).ctx.rel();
}
// 5. Verdrahtung: beide eigenen Klick-Wege im Netflix-Teil geben den Fokus ab.
{
  const teil = quelle.slice(quelle.indexOf("function _netflix_speed_custom_control"), quelle.indexOf("// YouTube\nconst initDateVisibilityListener"));
  assert.equal((teil.match(/_netflix_releaseFocus\(\)/g) ?? []).length, 2, "Klick-Wege ohne Fokus-Abgabe");
}
console.log("Netflix-Leiste: 5 Fälle grün (kein Schreiben ohne Änderung, Tempo, Grenzen, Fokus, Verdrahtung)");
