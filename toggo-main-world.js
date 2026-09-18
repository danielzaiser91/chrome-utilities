// Laeuft im Seitenkontext (manifest: world "MAIN", document_start), nur auf toggo.de.
//
// TOGGO-Fehler, gemessen 19.09.2026 (Playwright, ohne Erweiterung, 3 von 3 Laeufen): Wird eine
// Folge direkt aufgerufen (Neuladen, Link), ruft TOGGOs main.js
// window.foundation.api.createPlayer(...) auf, bevor das Player-Skript von
// cdn.player.foundation geladen ist -> "Cannot read properties of undefined (reading 'api')",
// kein <video>, endloser Ladekreis. Aus der Uebersicht heraus ist das Skript schon da.
//
// Das Player-Skript haengt sein api an ein vorhandenes Objekt an:
//   var foundation; (foundation ||= {}).api = (() => { ... })();
// Deshalb legen wir window.foundation vorher an. Solange das echte api fehlt, liefert
// foundation.api einen Stellvertreter, dessen Aufrufe warten, bis es da ist, und dann
// weiterreichen. Danach liefert foundation.api direkt das echte.
(() => {
  if (window.foundation) return;
  let echt = null;
  let bereit;
  const geladen = new Promise((r) => (bereit = r));
  const stellvertreter = new Proxy(
    {},
    {
      get: (_, name) =>
        echt
          ? echt[name]
          : (...args) => geladen.then((api) => api[name](...args)),
    },
  );
  window.foundation = Object.defineProperty({}, "api", {
    configurable: true,
    enumerable: true,
    get: () => echt ?? stellvertreter,
    set: (api) => {
      echt = api;
      bereit(api);
    },
  });
})();
