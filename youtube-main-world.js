// Laeuft im Seitenkontext (manifest: world "MAIN"), nur auf youtube.com, nur im obersten Fenster.
//
// Lautstaerke merken. Gemessen 18.10.2026 (Playwright, ohne Erweiterung):
// - video.volume ist NICHT der Regler: YouTube rechnet die Lautheitsnormalisierung hinein
//   (Regler 100, video.volume 0,33). Ein Content-Skript, das video.volume setzt, sieht der Player
//   nicht -- der Regler bleibt stehen, das naechste Video beginnt wieder beim alten Wert.
// - Den Regler stellt nur die Player-API (#movie_player.setVolume/mute/unMute), und die gibt es
//   nur hier, nicht im isolierten Kontext von utility.js.
// - YouTube merkt sich eine Aenderung selbst (localStorage "yt-player-volume"), aber nur 30 Tage
//   ab der letzten Aenderung, und jeder Tab haelt eine eigene Kopie im sessionStorage.
//   setVolume() per API schreibt dort nichts.
//
// Gespeichert wird deshalb nur eine Aenderung, kurz nachdem der Nutzer selbst etwas getan hat
// (Pfeil hoch/runter, M, Maus am Lautstaerkeregler) -- was YouTube beim Laden setzt, gilt nie als
// Nutzerwert. Sonst wird der gemerkte Wert immer wieder auf den Regler gelegt.
// Schalter und Format teilt sich das Skript mit utility.js: localStorage "cu:youtube:volume"
// als { volume: 0..1, muted }, eingeschaltet, solange <html data-cu-yt-volume="on"> steht.
(() => {
  if (window !== window.top) return;
  const KEY = "cu:youtube:volume";
  const NUTZER_FENSTER_MS = 1500;
  let nutzerBis = 0;

  const merkeNutzer = () => (nutzerBis = Date.now() + NUTZER_FENSTER_MS);
  window.addEventListener(
    "keydown",
    (e) => {
      if (e.isTrusted && ["ArrowUp", "ArrowDown", "m", "M"].includes(e.key)) merkeNutzer();
    },
    true,
  );
  for (const typ of ["pointerdown", "pointermove", "wheel"]) {
    window.addEventListener(
      typ,
      (e) => {
        if (typ === "pointermove" && !e.buttons) return; // nur Ziehen, kein Darueberfahren
        if (e.isTrusted && e.target?.closest?.(".ytp-volume-area")) merkeNutzer();
      },
      true,
    );
  }

  const lesen = () => {
    try {
      return JSON.parse(localStorage.getItem(KEY));
    } catch {
      return null;
    }
  };

  setInterval(() => {
    const player = document.getElementById("movie_player");
    if (document.documentElement.dataset.cuYtVolume !== "on" || !player?.getVolume) return;
    const jetzt = { volume: player.getVolume() / 100, muted: player.isMuted() };
    const gemerkt = lesen();
    if (Date.now() < nutzerBis) {
      if (!gemerkt || gemerkt.volume !== jetzt.volume || gemerkt.muted !== jetzt.muted)
        localStorage.setItem(KEY, JSON.stringify(jetzt));
      return;
    }
    if (!gemerkt) return;
    if (Math.abs(jetzt.volume - gemerkt.volume) > 0.005) player.setVolume(gemerkt.volume * 100);
    if (gemerkt.muted && !jetzt.muted) player.mute();
    // ohne Klick auf der Seite pausiert Chrome ein Video, das per Skript laut gestellt wird
    if (!gemerkt.muted && jetzt.muted && navigator.userActivation?.hasBeenActive) player.unMute();
  }, 300);
})();
