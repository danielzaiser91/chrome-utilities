// Test des PayPal-Zaehlers mit der echten Erweiterung und einer nachgebauten Seite.
// Playwright steht nicht im Repo: NODE_PATH=C:/code/ai/anime-kalender-de/node_modules setzen.
// Kein Abruf bei PayPal: Jede Anfrage wird abgefangen, die Transfer-Adresse bekommt seite.html,
// alles andere wird abgebrochen. Alle Kontakte sind erfunden.
//
//   node tests/paypal/test.mjs
import { createRequire } from "node:module";
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// require statt import: findet auch ein global installiertes Playwright (NODE_PATH)
const { chromium } = createRequire(import.meta.url)("playwright");
const hier = dirname(fileURLToPath(import.meta.url));
const erweiterung = join(hier, "..", "..");
const html = readFileSync(join(hier, "seite.html"), "utf8");
const htmlZwei = readFileSync(join(hier, "seite-zwei.html"), "utf8");
const htmlEcht = readFileSync(join(hier, "seite-echt.html"), "utf8");
const htmlVorschau = readFileSync(join(hier, "seite-vorschau.html"), "utf8");
const htmlEinzeln = readFileSync(join(hier, "seite-einzeln.html"), "utf8");
const htmlStart =readFileSync(join(hier, "seite-start.html"), "utf8");
const BASIS = "https://www.paypal.com/myaccount/transfer/homepage";
const START = "https://www.paypal.com/myaccount/summary";
const ERLAUBT = ["https://www.paypal.com/myaccount/transfer/", START];
const seiteFuer = (url) =>
  url.startsWith(START)
    ? htmlStart
    : url.includes("/preview") || url.includes("/suche/")
      ? htmlVorschau
      : url.includes("/einzeln")
        ? htmlEinzeln
        : url.includes("/zwei")
          ? htmlZwei
          : url.includes("/echt")
            ? htmlEcht
            : html;

const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "cu-pp-")), {
  channel: "chromium",
  headless: true,
  args: [
    `--disable-extensions-except=${erweiterung}`,
    `--load-extension=${erweiterung}`,
    // Nichts darf hinaus, auch kein Vorab-Verbindungsaufbau des Browsers zu paypal.com:
    // ohne Proxy und ohne Namensaufloesung. route() unten bedient die Testseite trotzdem.
    "--no-proxy-server",
    "--host-resolver-rules=MAP * ~NOTFOUND",
  ],
});
const anfragen = [];
await ctx.route("**/*", (route) => {
  const url = route.request().url();
  anfragen.push(url);
  if (ERLAUBT.some((e) => url.startsWith(e)))
    return route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: seiteFuer(url) });
  return route.abort();
});

let fehler = 0;
const pruefe = (name, ist, soll) => {
  const ok = JSON.stringify(ist) === JSON.stringify(soll);
  if (!ok) fehler++;
  console.log(`${ok ? "OK  " : "FEHL"} ${name}: ${JSON.stringify(ist)}${ok ? "" : ` (soll ${JSON.stringify(soll)})`}`);
};
// Zeichen je Eintrag in Reihenfolge der Liste: [Name, Text, Tooltip] oder [Name, null]
const zeichen = (page, sel) =>
  page.$$eval(sel, (els) =>
    els.map((e) => {
      const z = e.querySelector(".cu-pp-zaehler");
      const name = [...e.querySelector(".name, .ziel").childNodes]
        .filter((n) => !n.classList?.contains("cu-pp-zaehler"))
        .map((n) => n.textContent)
        .join("")
        .trim();
      return z ? [name, z.textContent, z.title] : [name, null];
    }),
  );
const warte = (page) => page.waitForTimeout(1200); // Start 500 ms nach DOMContentLoaded + Takt

const page = await ctx.newPage();
const fehlerSeite = [];
page.on("pageerror", (e) => fehlerSeite.push(e.message));
page.on("console", (m) => m.type() === "error" && fehlerSeite.push(m.text()));

// Startseite ohne gespeicherte Namenskarte (frisches Profil): nichts anzeigen
const startZeichen = (p) =>
  p.$$eval(".caption", (cs) =>
    cs.map((c) => [c.textContent.length, c.closest("a").querySelector(".cu-pp-zaehler")?.textContent ?? null]),
  );
await page.goto(START);
await warte(page);
pruefe("Startseite ohne Karte", (await startZeichen(page)).map((z) => z[1]), [null, null, null, null, null, null]);

await page.goto(BASIS);
await page.waitForFunction(() => document.documentElement.dataset.cuInjected, null, { timeout: 5000 });
await warte(page);
pruefe("Liste", await zeichen(page, "#liste .kontakt"), [
  ["Max Muster", "✓ 12", "Du hast schon 12× Geld an Max Muster gesendet"], // ID in data-*
  ["Max Muster", "✓ 3", "Du hast schon 3× Geld an Max Muster gesendet"], // ID im href
  ["Erika Beispiel", "✓ 1", "Du hast schon 1× Geld an Erika Beispiel gesendet"], // nur Name, eindeutig
  ["Lisa Probe", null], // 0 Zahlungen
  ["Jürgen Testmann", "✓ 7", "Du hast schon 7× Geld an Jürgen Testmann gesendet"], // JSON im String, Name geteilt
  ["Otto Fremd", null], // nicht im JSON
]);

// Unsere eigenen Aenderungen duerfen keine neue Pruefung mit neuen Aenderungen ausloesen
pruefe(
  "DOM ruhig nach dem Setzen (Aenderungen in 2 s)",
  await page.evaluate(
    () =>
      new Promise((fertig) => {
        let n = 0;
        const mo = new MutationObserver((l) => (n += l.length));
        mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true });
        setTimeout(() => (mo.disconnect(), fertig(n)), 2000);
      }),
  ),
  0,
);

// Suche: gleichnamige Treffer ohne ID bekommen nichts
await page.click("#suche");
await page.keyboard.type("e");
await warte(page);
pruefe("Suchtreffer", await zeichen(page, "#liste .kontakt"), [
  ["Erika Beispiel", null],
  ["Max Muster", null],
]);
// Suchtreffer anklicken -> Dialog ohne Zeichen, obwohl der Name in der Liste vorkommt
await page.click("#liste .kontakt >> nth=0");
await warte(page);
pruefe("Dialog nach Suchtreffer", await zeichen(page, "#dialog"), [["Erika Beispiel", null]]);
await page.click("#zurueck");
await warte(page);
pruefe("Liste nach Zurueck", (await zeichen(page, "#liste .kontakt")).map((z) => z[1]), [
  "✓ 12", "✓ 3", "✓ 1", null, "✓ 7", null,
]);

// Aus der Liste in den Dialog: Zahl des angeklickten Kontakts, auch bei gleichem Namen
for (const [i, soll] of [[0, "✓ 12"], [1, "✓ 3"], [2, "✓ 1"], [3, null], [5, null]]) {
  await page.click(`#liste .kontakt >> nth=${i}`);
  await warte(page);
  pruefe(`Dialog nach Eintrag ${i}`, (await zeichen(page, "#dialog"))[0][1], soll);
  // Klick im Dialog laesst das Zeichen stehen
  await page.click("#betrag");
  await page.keyboard.type("5");
  await warte(page);
  pruefe(`  nach Eingabe im Dialog`, (await zeichen(page, "#dialog"))[0][1], soll);
  await page.click("#zurueck");
  await warte(page);
}

// Dialog direkt geladen: mit ID in der Adresse Zuordnung ueber die ID, ohne ID kein Zeichen
await page.goto(`${BASIS}/pay?recipient=TESTPAYER2&offen=1`);
await warte(page);
pruefe("Dialog direkt, ID in Adresse", (await zeichen(page, "#dialog"))[0][1], "✓ 3");
await page.goto(`${BASIS}/pay?offen=1`);
await warte(page);
pruefe("Dialog direkt, ohne ID", (await zeichen(page, "#dialog"))[0][1], null);
await page.goto(`${BASIS}/pay?offen=2`);
await warte(page);
pruefe("Dialog direkt, eindeutiger Name ohne Klick", (await zeichen(page, "#dialog"))[0][1], null);

// Grenzfaelle der Zuordnung (seite-zwei.html)
await page.goto(BASIS.replace("homepage", "zwei"));
await warte(page);
pruefe("Grenzfaelle Liste", await zeichen(page, "#liste .kontakt"), [
  ["Dana Gleich", null], // zwei gleichnamige Kontakte, keine ID im DOM
  ["Dana Gleich", null],
  ["Eva Doppel", null], // zwei IDs im Eintrag
  ["Frank Anders", null], // ID passt, Name nicht
  ["Karl Sieben", "✓ 7", "Du hast schon 7× Geld an Karl Sieben gesendet"], // gleiche payerId in zwei Skripten: 7 und 4
  ["Lena Sechs", "✓ 6", "Du hast schon 6× Geld an Lena Sechs gesendet"], // 2 und 6
  ["Gina Klick", "✓ 3", "Du hast schon 3× Geld an Gina Klick gesendet"],
  ["Olga Einfach", null], // JSON in '...' wird nicht gelesen (und Name ist ohnehin nicht bekannt)
  ["Paul Kaputt", null], // ungueltiges String-Literal wird uebergangen
]);
for (const [i, name] of [[2, "Eva Doppel"], [3, "Frank Anders"], [6, "Hans Anders"]]) {
  await page.click(`#liste .kontakt >> nth=${i}`);
  await warte(page);
  // zwei IDs im Dialog / ID mit fremdem Namen / Klick-Eintrag mit anderem Namen als die Kopfzeile
  pruefe(`Grenzfall Dialog ${name}`, await zeichen(page, "#dialog"), [[name, null]]);
  await page.click("#zurueck");
  await warte(page);
}

// Echter Aufbau (seite-echt.html): Kachel = Initialen + Vorname-<p> + Nachname-<p>, keine ID im Eintrag.
// Das war der Fehler vom 13.11.2026: der Name stand nie in einem Element, also kein Zeichen.
const kacheln = (p) =>
  p.$$eval("[data-testid=contact-bubble]", (bs) =>
    bs.map((b) => {
      const z = b.querySelector(".cu-pp-zaehler");
      const teile = [...b.querySelectorAll("p")].flatMap((p) =>
        [...p.childNodes].filter((n) => n !== z).map((n) => n.textContent),
      );
      return [teile.join(" "), z ? z.textContent : null];
    }),
  );
// Zeichen haengt am Kreis, unten rechts (Daniel, 13.11.2026): [Klasse des Ankers, rechts, unten]
// in px relativ zum Kreis; erwartet rechts 6, unten 4 (ragt so weit hinaus)
const kreisLage = (p, sel) =>
  p.$$eval(sel, (zs) =>
    zs.map((z) => {
      const k = z.parentElement.getBoundingClientRect();
      const r = z.getBoundingClientRect();
      return [z.parentElement.className, Math.round(r.right - k.right), Math.round(r.bottom - k.bottom)];
    }),
  );
const dialogZeichen = (p) =>
  p.$eval("[role=dialog]", (d) => [
    d.querySelector("h2 .ppvx_text--xl").firstChild.textContent,
    d.querySelector(".cu-pp-zaehler")?.textContent ?? null,
  ]);
await page.goto(BASIS.replace("homepage", "echt"));
await warte(page);
pruefe("Echter Aufbau: Kacheln", await kacheln(page), [
  ["Anna Beispiel", "✓ 2"], // nicht die 9 von "Anna" allein, nicht die 3 von "Anna Beispiel Junior" (nur exakter Name)
  ["Carlos Doppel", null], // zwei Kontakte, keine ID in der Kachel
  ["Dora Null", null],
  ["Emil Fremd", null],
  ["Jürgen Möller", "✓ 7"],
  ["Anna Maria Beispiel", "✓ 4"], // längste Reihe gewinnt, nicht "Anna Maria" (6) oder "Anna" (9)
]);
pruefe("Echter Aufbau: Zeichen am Kreis", await kreisLage(page, "menu .cu-pp-zaehler"), [
  ["kreis", 6, 4],
  ["kreis", 6, 4],
  ["kreis", 6, 4],
]);
for (const [i, soll] of [[0, "✓ 2"], [1, null], [4, "✓ 7"], [5, "✓ 4"]]) {
  await page.click(`[data-testid=contact-bubble] >> nth=${i}`);
  await warte(page);
  pruefe(`Echter Aufbau: Dialog nach Kachel ${i}`, (await dialogZeichen(page))[1], soll);
  // abschneidender Kreis: Zeichen am eng anliegenden Rahmen; die Kacheln dahinter bekommen nichts
  pruefe(
    `  am Kreis, Liste dahinter ohne Zeichen`,
    [await kreisLage(page, "[role=dialog] .cu-pp-zaehler"), await page.$$eval("menu .cu-pp-zaehler", (z) => z.length)],
    [soll ? [["rahmen48 cu-pp-anker", 6, 4]] : [], 0],
  );
  await page.click("#zurueck");
  await warte(page);
}

// Vorschau vor dem Senden: Name nur im <h3>, keine ID, Betragsfeld mit Text (13.11.2026: kein Zeichen)
const vorschau = (p) =>
  p.$$eval("[data-testid=recipient-title]", (hs) =>
    hs.map((h) => {
      const z = h.closest("form").querySelector(".cu-pp-zaehler");
      return [z?.textContent ?? null, z?.parentElement.className ?? null, z ? Math.round(z.getBoundingClientRect().right - z.parentElement.getBoundingClientRect().right) : null];
    }),
  );
await page.goto(`${BASIS}/preview`);
await warte(page);
pruefe("Vorschau: Zeichen am Kreis", await vorschau(page), [["✓ 4", "kr", 6]]);
await page.goto("https://www.paypal.com/myaccount/transfer/mehrdeutig/preview");
await warte(page);
pruefe("Vorschau: Name mit zwei IDs, kein Zeichen", await vorschau(page), [[null, null, null]]);

// Suchfeld mit Text auf einer anderen Transfer-Seite behaelt die Suchsperre (gleiche Seite, nicht /preview)
await page.goto("https://www.paypal.com/myaccount/transfer/suche/start");
await warte(page);
pruefe("Textfeld ausserhalb der Vorschau: Suchsperre, kein Zeichen", await vorschau(page), [[null, null, null]]);

// Grabstein: der Name hatte zwei IDs (Seite oben); eine spaetere Seite mit nur einer davon macht ihn nicht eindeutig
await page.goto("https://www.paypal.com/myaccount/transfer/einzeln/start");
await warte(page);

// Startseite mit Karte: die echten Transfer-Seiten oben haben sie gefuellt (nur eindeutige Namen mit >= 1)
await page.goto(START);
await warte(page);
pruefe("Startseite mit Karte (Grabstein: letzter Name ohne Zeichen)", (await startZeichen(page)).map((z) => z[1]), ["✓ 2", null, null, null, "✓ 7", null]);
pruefe(
  "Startseite: Zeichen am Kreis",
  await kreisLage(page, ".cu-pp-zaehler"),
  [["aussen", 6, 4], ["aussen", 6, 4]],
);
pruefe(
  "Startseite: Tooltip mit vollem Namen",
  (await page.$$eval(".cu-pp-zaehler", (zs) => zs.map((z) => z.title))).map((t) =>
    t.replace(/ \(Stand: \d{1,2}\.\d{1,2}\.\d{4}\)$/, " (Stand)"),
  ),
  ["Du hast schon 2× Geld an Anna Beispiel gesendet (Stand)", "Du hast schon 7× Geld an Jürgen Möller gesendet (Stand)"],
);

// Karte direkt im Speicher der Erweiterung (Service Worker): Verfall und Obergrenze
const sw = ctx.serviceWorkers()[0] ?? (await ctx.waitForEvent("serviceworker"));
const KARTE = "cu:pp:namen";
const TAG = 24 * 60 * 60 * 1000;
const setzeKarte = (karte) => sw.evaluate(([k, v]) => chrome.storage.local.set({ [k]: v }), [KARTE, karte]);
const leseKarte = () => sw.evaluate((k) => chrome.storage.local.get(k).then((d) => d[k] ?? {}), KARTE);
const eintrag = (name, id, n, vorTagen, vorMs = 0) => ({
  i: id, a: name, n, t: Date.now() - vorTagen * TAG - vorMs,
});
// Verfall beim Lesen: 91 Tage ohne Sichtung zeigt die Startseite nicht, 89 Tage schon
await setzeKarte({
  "anna beispiel": eintrag("Anna Beispiel", "TESTPAYERA1", 2, 91),
  "jürgen möller": eintrag("Jürgen Möller", "TESTPAYERA5", 7, 89),
});
await page.goto(START);
await warte(page);
pruefe("Startseite: 91 Tage alt kein Zeichen, 89 Tage alt Zeichen", (await startZeichen(page)).map((z) => z[1]), [null, null, null, null, "✓ 7", null]);

// Verfall und Obergrenze beim Schreiben: Besuch einer Transfer-Seite beschneidet die Karte
const karte = {
  "alt eintrag": eintrag("Alt Eintrag", "TESTPAYERX0", 1, 91),
  "frisch eintrag": eintrag("Frisch Eintrag", "TESTPAYERX1", 1, 1),
};
for (let i = 0; i < 520; i++) karte[`fueller ${i}`] = eintrag(`Fueller ${i}`, `TESTPAYERF${i}`, 1, 2, i * 1000);
await setzeKarte(karte);
await page.goto(BASIS);
await warte(page);
const nach = await leseKarte();
pruefe(
  "Karte beschnitten: genau 500, Verfallener und Aeltester raus, Frischer drin",
  [Object.keys(nach).length, "alt eintrag" in nach, "fueller 519" in nach, "fueller 0" in nach, "frisch eintrag" in nach],
  [500, false, false, true, true],
);

pruefe("Fehler auf der Seite", fehlerSeite, []);
const fremd = anfragen.filter((u) => !ERLAUBT.some((e) => u.startsWith(e)));
pruefe("Anfragen ausser der Testseite", fremd, []);
await ctx.close();
console.log(fehler ? `\n${fehler} Fehler` : "\nalles gruen");
process.exit(fehler ? 1 : 0);
