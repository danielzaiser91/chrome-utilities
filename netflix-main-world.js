// Laeuft im Seitenkontext (manifest: world "MAIN", document_start), nur auf netflix.com.
//
// Netflix haengt beim Klick auf "Abspielen" trackId und tctx an die Adresse (Herkunft des Klicks
// fuer die eigene Auswertung), zum Abspielen braucht es sie nicht. Der Klick laedt keine neue Seite,
// Netflix schreibt die Adresse per pushState um -- deshalb wird history hier im Seitenkontext
// umhuellt; aus utility.js heraus waere der Aufruf nicht zu sehen.
(() => {
  if (window !== window.top) return;
  const PARAMS = ["trackId", "tctx"];

  const kuerzen = () => {
    const url = new URL(location.href);
    if (!PARAMS.some((p) => url.searchParams.has(p))) return;
    for (const p of PARAMS) url.searchParams.delete(p);
    history.replaceState(history.state, "", url);
  };

  for (const name of ["pushState", "replaceState"]) {
    const original = history[name];
    history[name] = function (...args) {
      const r = original.apply(this, args);
      kuerzen();
      return r;
    };
  }
  kuerzen();
})();
