// Test des PayPal-Zaehlers mit der echten Erweiterung und einer nachgebauten Seite.
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
const BASIS = "https://www.paypal.com/myaccount/transfer/homepage";

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
  if (url.startsWith("https://www.paypal.com/myaccount/transfer/"))
    return route.fulfill({
      status: 200,
      contentType: "text/html; charset=utf-8",
      body: url.includes("/zwei") ? htmlZwei : url.includes("/echt") ? htmlEcht : html,
    });
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
pruefe("Dialog nach Suchtreffer", await zeichen(page, "#dialog h2"), [["Erika Beispiel", null]]);
await page.click("#zurueck");
await warte(page);
pruefe("Liste nach Zurueck", (await zeichen(page, "#liste .kontakt")).map((z) => z[1]), [
  "✓ 12", "✓ 3", "✓ 1", null, "✓ 7", null,
]);

// Aus der Liste in den Dialog: Zahl des angeklickten Kontakts, auch bei gleichem Namen
for (const [i, soll] of [[0, "✓ 12"], [1, "✓ 3"], [2, "✓ 1"], [3, null], [5, null]]) {
  await page.click(`#liste .kontakt >> nth=${i}`);
  await warte(page);
  pruefe(`Dialog nach Eintrag ${i}`, (await zeichen(page, "#dialog h2"))[0][1], soll);
  // Klick im Dialog laesst das Zeichen stehen
  await page.click("#betrag");
  await page.keyboard.type("5");
  await warte(page);
  pruefe(`  nach Eingabe im Dialog`, (await zeichen(page, "#dialog h2"))[0][1], soll);
  await page.click("#zurueck");
  await warte(page);
}

// Dialog direkt geladen: mit ID in der Adresse Zuordnung ueber die ID, ohne ID kein Zeichen
await page.goto(`${BASIS}/pay?recipient=TESTPAYER2&offen=1`);
await warte(page);
pruefe("Dialog direkt, ID in Adresse", (await zeichen(page, "#dialog h2"))[0][1], "✓ 3");
await page.goto(`${BASIS}/pay?offen=1`);
await warte(page);
pruefe("Dialog direkt, ohne ID", (await zeichen(page, "#dialog h2"))[0][1], null);
await page.goto(`${BASIS}/pay?offen=2`);
await warte(page);
pruefe("Dialog direkt, eindeutiger Name ohne Klick", (await zeichen(page, "#dialog h2"))[0][1], null);

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
  pruefe(`Grenzfall Dialog ${name}`, await zeichen(page, "#dialog h2"), [[name, null]]);
  await page.click("#zurueck");
  await warte(page);
}

// Echter Aufbau (seite-echt.html): Kachel = Initialen + Vorname-<p> + Nachname-<p>, keine ID im Eintrag.
// Das war der Fehler vom 13.11.2026: der Name stand nie in einem Element, also kein Zeichen.
const kacheln = (p) =>
  p.$$eval("[data-testid=contact-bubble]", (bs) =>
    bs.map((b) => {
      const [, vor, nach] = b.children;
      const z = b.querySelector(".cu-pp-zaehler");
      const nachname = [...nach.childNodes].filter((n) => n !== z).map((n) => n.textContent);
      return [[vor.textContent, ...nachname].join(" "), z ? z.textContent : null];
    }),
  );
const dialogZeichen = (p) =>
  p.$eval("[role=dialog] h2", (h) => [
    h.querySelector(".ppvx_text--xl").firstChild.textContent,
    h.querySelector(".cu-pp-zaehler")?.textContent ?? null,
  ]);
await page.goto(BASIS.replace("homepage", "echt"));
await warte(page);
pruefe("Echter Aufbau: Kacheln", await kacheln(page), [
  ["Anna Beispiel", "✓ 2"], // nicht die 9 von "Anna" allein
  ["Carlos Doppel", null], // zwei Kontakte, keine ID in der Kachel
  ["Dora Null", null],
  ["Emil Fremd", null],
  ["Jürgen Möller", "✓ 7"],
]);
for (const [i, soll] of [[0, "✓ 2"], [1, null], [4, "✓ 7"]]) {
  await page.click(`[data-testid=contact-bubble] >> nth=${i}`);
  await warte(page);
  pruefe(`Echter Aufbau: Dialog nach Kachel ${i}`, (await dialogZeichen(page))[1], soll);
  await page.click("#zurueck");
  await warte(page);
}

pruefe("Fehler auf der Seite", fehlerSeite, []);
const fremd = anfragen.filter((u) => !u.startsWith("https://www.paypal.com/myaccount/transfer/"));
pruefe("Anfragen ausser der Testseite", fremd, []);
await ctx.close();
console.log(fehler ? `\n${fehler} Fehler` : "\nalles gruen");
process.exit(fehler ? 1 : 0);
