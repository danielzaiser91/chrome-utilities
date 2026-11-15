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
import { execFileSync } from "node:child_process";

const quelle = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "..", "utility.js"), "utf8");
const schneide = (anfang) => {
  const i = quelle.indexOf(anfang);
  assert.ok(i >= 0, `${anfang} fehlt in utility.js`);
  // Einzeiler enden mit ";" am Zeilenende, mehrzeilige Pfeilfunktionen mit "\n};"
  const zeile = quelle.slice(i, quelle.indexOf("\n", i));
  const ende = zeile.endsWith(";") ? i + zeile.length : quelle.indexOf("\n};", i) + 3;
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
// 5. Verdrahtung als Verhalten: die echte _netflix_speed_custom_control mit Attrappen fahren.
{
  const ereignisse = {};
  const klicks = [];
  let blurs = 0;
  const eingabe = { max: "5", min: "0.2", value: "1", addEventListener: (n, f) => (ereignisse[n] = f) };
  const video = { playbackRate: 1 };
  const wiederholt = [];
  const ctx = vm.createContext({
    query: (q) => (q === "video" ? video : { classList: { contains: () => false, add() {} }, appendChild() {} }),
    queryAll: () => [0, 1, 2, 3, 4].map(() => ({ addEventListener: (n, f) => klicks.push(f) })),
    create: () => eingabe,
    insertCSS() {},
    setTimeout: (f) => f(),
    repeatIfCondition: (fn) => wiederholt.push(fn),
    clamp: (v, { max, min }) => Math.min(+max, Math.max(+min, v)),
    userOptions: { netflix: { featurePlayBackSpeed: { isEnabled: { subFeatures: { playBackSpeed: { value: 1 } } } } } },
    document: { activeElement: { blur: () => blurs++ } },
  });
  const i = quelle.indexOf("function _netflix_speed_custom_control");
  const funktion = quelle.slice(i, quelle.indexOf("\n}\n", i) + 3);
  vm.runInContext(
    [
      schneide("const _netflix_setPlayerValue"),
      schneide("const _netflix_releaseFocus"),
      schneide("const _netflix_adjustVal"),
      schneide("const _netflix_commitSpeed"),
      funktion,
      "_netflix_speed_custom_control();",
    ].join("\n"),
    ctx,
  );
  wiederholt[1](); // _add_custom_speed_control: haengt Knoepfe und Feld an
  const ev = (v) => ({ stopPropagation() {}, srcElement: { value: v } });
  ereignisse.input(ev("1.5"));
  assert.equal(video.playbackRate, 1.5, "Tippen setzt das Tempo");
  assert.equal(blurs, 0, "Fokus beim Tippen abgegeben");
  ereignisse.change(ev("1.5"));
  assert.equal(blurs, 1, "Fokus nach Uebernehmen nicht abgegeben");
  assert.equal(video.playbackRate, 1.5);
  klicks[1](); // Tempo-Knopf 0.75
  assert.equal(video.playbackRate, 0.75);
  assert.equal(blurs, 2, "Fokus nach Tempo-Knopf nicht abgegeben");
  // Auto-Skip-Knopf: Klickhandler gibt den Fokus nach dem Umschalten ab (Handler selbst braucht Netflix-DOM)
  const k = quelle.indexOf("copyChild.onclick");
  assert.ok(/toggleAutoSkipIntro\(copyChild\);\s*_netflix_releaseFocus\(\);/.test(quelle.slice(k, k + 140)), "Toggle-Klick ohne Fokus-Abgabe");
}
// 6. Versionen sind ueberall gleich und nicht die veroeffentlichte (CLAUDE.md "Versioning").
{
  const hier = dirname(fileURLToPath(import.meta.url));
  const m = JSON.parse(readFileSync(join(hier, "..", "..", "manifest.json"), "utf8"));
  const uo = /\n  version: "([^"]+)",/.exec(quelle)?.[1];
  assert.equal(m.version, m.version_name, "version != version_name");
  assert.equal(m.version, uo, "manifest != userOptions.version");
  assert.match(m.version, /^\d+\.\d+\.\d+\.\d+$/, "Arbeitsstand braucht vier Stellen");
  const tags = execFileSync("git", ["tag"], { encoding: "utf8", timeout: 20000, cwd: hier }).split("\n").map((t) => t.replace(/^v/, ""));
  assert.ok(!tags.includes(m.version), "Version entspricht einem veroeffentlichten Tag");
}
console.log("Netflix-Leiste: 6 Faelle gruen (kein Schreiben ohne Aenderung, Tempo, Grenzen, Fokus, Verdrahtung als Verhalten, Version)");
