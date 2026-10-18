// Skip Opening/Ending im VOE-Player (auf AniWorld). Der Nutzer markiert einen Abschnitt einmal je
// Serie im Dialog; die Erweiterung spielt ihn dort stumm vierfach ab und merkt sich je Bild einen
// 256-Bit-dHash. In jeder Folge vergleicht sie danach viermal pro Sekunde das laufende Bild mit
// diesen Hashes. PoC 18.10.2026 an Dragon Quest (Referenz Folge 4, Proben Folge 5): Opening
// 349/349 Einstiege erkannt, Ending 357/360 (Rest landet hoechstens 4,3 s zu frueh), 0 Fehlalarme
// in der Handlung, Wartezeit hoechstens 2 s. Zahlen und Verfahren: docs/opening-erkennung.md.
// Laeuft in derselben isolierten Welt wie utility.js (gleicher content_scripts-Eintrag) und nutzt
// deren Helfer.

const SKIP_THR = 40; // Hamming-Abstand: Abschnitt fast immer <= 40, Handlung >= 61 (PoC)
const SKIP_STATIC = 6; // Probe kaum anders als die vorige: Standbild, traegt keine Zeit
const SKIP_HITS = 3; // so viele Treffer mit gleicher Lage binnen 3 s
const SKIP_PROBE_MS = 250; // 2 Proben/s verpassten Einstiege in den letzten Sekunden eines Openings
const SKIP_KINDS = { op: "Opening", ed: "Ending" };

let skip_video = { series: undefined, episode: undefined };

function voe_initSkip() {
  if (window === top) return;
  skip_insertCSS();
  window.addEventListener("message", (e) => {
    if (e.source !== window.parent || e.data?.cu !== "episode") return;
    if (e.data.type === "copied") skip_toast(e.data.ok ? "Copied to clipboard" : "Couldn't copy, please try again.");
    if (e.data.type !== "nav") return;
    skip_video = { series: e.data.series, episode: e.data.episode };
    skip_scanner.reset();
  });
  skip_scanner.start();
}

// ---- Speicher: cu:skip:<serie> = { segments: [...], episodes: { <folge>: { op, ed } } }
// Ein Abschnitt traegt seine Hashes als base64 (je Bild 32 Byte) und die Zeiten der Referenzfolge.
// Je Folge steht je Art entweder { seg, from, to } oder "none" (Suchfenster ohne Treffer).

function skip_key() {
  return skip_video.series && "cu:skip:" + skip_video.series;
}

function skip_episodeKey() {
  // dieselbe Folge kann bei AniWorld mehrere Videos haben (Synchro, Untertitel), jedes mit eigener Lage
  return skip_video.episode + " " + location.pathname.split("/").pop();
}

function skip_load() {
  return new Promise((resolve) => {
    const store = _gemeinsamerSpeicher();
    if (!store || !skip_key()) return resolve({ segments: [], episodes: {} });
    store.get(skip_key(), (r) => resolve(r?.[skip_key()] ?? { segments: [], episodes: {} }));
  });
}

async function skip_update(change) {
  const data = await skip_load();
  change(data);
  _gemeinsamerSpeicher()?.set({ [skip_key()]: data });
  return data;
}

// ---- Bild -> Hash

const skip_canvas = Object.assign(document.createElement("canvas"), { width: 17, height: 16 });
const skip_ctx = skip_canvas.getContext("2d", { willReadFrequently: true });

// 17x16 grau, Bit = links dunkler als rechts. Flache Bilder (Schwarzblende) tragen nichts: null.
function skip_hash(video) {
  skip_ctx.drawImage(video, 0, 0, 17, 16);
  const d = skip_ctx.getImageData(0, 0, 17, 16).data;
  const gray = new Float32Array(272);
  let sum = 0;
  for (let i = 0; i < 272; i++) sum += gray[i] = d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11;
  const mean = sum / 272;
  let sq = 0;
  for (const g of gray) sq += (g - mean) ** 2;
  if (Math.sqrt(sq / 272) < 8) return null;
  const h = new Uint32Array(8);
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) if (gray[y * 17 + x] < gray[y * 17 + x + 1]) h[(y * 16 + x) >> 5] |= 1 << ((y * 16 + x) & 31);
  return h;
}

function skip_ham(hashes, i, h) {
  let n = 0;
  for (let w = 0; w < 8; w++) {
    let v = hashes[i * 8 + w] ^ h[w];
    v -= (v >>> 1) & 0x55555555;
    v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
    n += (((v + (v >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
  }
  return n;
}

function skip_toBase64(u32) {
  let s = "";
  for (const b of new Uint8Array(u32.buffer)) s += String.fromCharCode(b);
  return btoa(s);
}

function skip_fromBase64(s) {
  const bytes = Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  return new Uint32Array(bytes.buffer);
}

// ---- Laufzeit: gespeicherte Lage nutzen, sonst suchen

const skip_scanner = {
  segs: [], // { seg, hashes, times }
  data: null,
  seen: { op: new Set(), ed: new Set() }, // je Art die Sekunden, in denen gesucht wurde
  prev: null,
  skipped: {}, // je Art: in diesem Aufruf schon gesprungen oder rueckgaengig gemacht

  start() {
    document.addEventListener("seeking", () => this.clearHits(), true);
    document.addEventListener("loadstart", () => this.reset(), true);
    setInterval(() => this.tick(), SKIP_PROBE_MS);
  },

  async reset() {
    this.data = null;
    this.seen = { op: new Set(), ed: new Set() };
    this.skipped = {};
    this.prev = null;
    if (!skip_key()) return;
    this.data = await skip_load();
    this.segs = this.data.segments.map((seg) => ({ seg, hashes: skip_fromBase64(seg.hashes), times: seg.times, hits: [] }));
  },

  clearHits() {
    for (const s of this.segs) s.hits = [];
    this.prev = null;
    // zurueckgespult vor einen schon uebersprungenen Abschnitt: dort wieder springen
    const t = query(".jwplayer video")?.currentTime;
    for (const kind of Object.keys(SKIP_KINDS)) {
      const known = this.data?.episodes[skip_episodeKey()]?.[kind];
      if (known?.from !== undefined && t < known.from && this.skipped[kind] !== "undone") delete this.skipped[kind];
    }
  },

  tick() {
    const video = query(".jwplayer video");
    if (!this.data || !video || video.paused || document.hidden || skip_dialog.open) return;
    if (!isAllowed(getSiteOptions().featureSkip.isEnabled) || !(video.duration > 600)) return;
    const t = video.currentTime;
    const known = this.data.episodes[skip_episodeKey()] ?? {};
    const open = [];
    for (const kind of Object.keys(SKIP_KINDS)) {
      const k = known[kind];
      if (k === "none" || this.skipped[kind]) continue;
      if (k) {
        if (t >= k.from && t < k.to - 1) this.jump(video, kind, k.to);
        continue;
      }
      const [lo, hi] = kind === "op" ? [0, video.duration * 0.45] : [video.duration * 0.55, video.duration];
      if (t >= lo && t < hi && this.segs.some((s) => s.seg.type === kind)) open.push(kind);
      else if (t >= hi - 2) this.giveUp(kind, lo, hi);
    }
    if (!open.length) return;
    for (const kind of open) this.seen[kind].add(Math.floor(t));
    const h = skip_hash(video);
    const isStatic = h && this.prev && skip_ham(this.prev, 0, h) <= SKIP_STATIC;
    this.prev = h;
    if (!h) return;
    for (const kind of open) {
      for (const s of this.segs.filter((s) => s.seg.type === kind)) {
        const off = this.probe(s, t, h, isStatic);
        if (off === undefined) continue;
        const from = s.seg.from + off, to = s.seg.to + off;
        skip_update((d) => ((d.episodes[skip_episodeKey()] ??= {})[kind] = { seg: s.seg.id, from, to }));
        (this.data.episodes[skip_episodeKey()] ??= {})[kind] = { seg: s.seg.id, from, to };
        this.jump(video, kind, to);
        break;
      }
    }
  },

  // Lage = Probenzeit - Referenzzeit. Bei einem Standbild die spaeteste passende Referenzzeit:
  // der Sprung landet dann hoechstens zu frueh, nie hinter dem Abschnittsende.
  probe(s, t, h, isStatic) {
    let best = SKIP_THR + 1, bestT, last;
    for (let i = 0; i < s.times.length; i++) {
      const d = skip_ham(s.hashes, i, h);
      if (d < best) [best, bestT] = [d, s.times[i]];
      if (d <= SKIP_THR) last = s.times[i];
    }
    if (bestT === undefined) return;
    const hits = (s.hits = s.hits.filter((x) => t - x.t <= 3));
    const off = t - (isStatic ? last : bestT);
    hits.push({ t, off, h });
    if (hits.filter((x) => Math.abs(x.off - off) <= 0.5).length < SKIP_HITS) return;
    return this.refine(s, hits, off);
  },

  // Feinlage: das off, bei dem alle Treffer der letzten 3 s zusammen am besten passen; bei
  // Gleichstand das kleinere (frueher landen). Holte im PoC das Ending von 351 auf 357/360.
  refine(s, hits, off0) {
    let best = Infinity, bestOff = off0;
    for (let o = off0 - 2; o <= off0 + 2 + 1e-9; o += 0.04) {
      let sum = 0;
      for (const x of hits) {
        let m = 256;
        const want = x.t - o;
        for (let i = 0; i < s.times.length; i++) if (Math.abs(s.times[i] - want) <= 0.08) m = Math.min(m, skip_ham(s.hashes, i, x.h));
        sum += m;
      }
      if (sum < best - 1e-9) [best, bestOff] = [sum, o];
    }
    return bestOff;
  },

  // Suchfenster durchgesehen, nichts gefunden: fuer diese Folge nicht mehr suchen. Nur wenn es
  // wirklich gesehen wurde -- wer mitten in der Folge einsteigt, hat das Opening nie geprueft.
  giveUp(kind, lo, hi) {
    if (this.seen[kind].size < (hi - lo) * 0.9) return;
    this.skipped[kind] = "none";
    skip_update((d) => ((d.episodes[skip_episodeKey()] ??= {})[kind] ??= "none"));
  },

  jump(video, kind, to) {
    const from = video.currentTime;
    this.skipped[kind] = "jumped";
    // "Next episode starts when the ending starts": ganz ans Ende, dort uebernimmt "Next Episode"
    const autoNext = getSiteOptions().featureAutoNext.isEnabled;
    const toNext = kind === "ed" && isAllowed(autoNext) && autoNext.subFeatures.afterEnding.value === "start";
    // sonst kurz vor dem Ende statt darauf: so endet die Folge normal und "naechste Folge" greift
    video.currentTime = toNext ? video.duration : Math.min(to, video.duration - 0.1);
    skip_toast(`${SKIP_KINDS[kind]} skipped`, () => {
      this.skipped[kind] = "undone";
      video.currentTime = from;
      // falsch erkannt oder doch sehen wollen: die Lage nicht behalten, beim naechsten Mal neu suchen
      skip_update((d) => delete d.episodes[skip_episodeKey()]?.[kind]);
      delete this.data.episodes[skip_episodeKey()]?.[kind];
    });
  },
};

function skip_toast(text, onUndo) {
  query(".cu-skip-toast")?.remove();
  const toast = create("div", { className: "cu-skip-toast" });
  toast.append(create("span", { textContent: text }));
  if (onUndo) {
    const undo = create("button", { type: "button", textContent: "Undo" });
    toast.append(undo);
    undo.addEventListener("click", () => {
      toast.remove();
      onUndo();
    });
  }
  query(".jwplayer")?.append(toast);
  setTimeout(() => toast.remove(), 6000);
}

// ---- Settings: eine Zeile Zustand, ein Knopf fuer den Dialog

function skip_describe() {
  if (!skip_video.series) return "Works when the episode is opened on AniWorld.";
  const n = skip_scanner.segs.length;
  return n ? `${n} marked for this series.` : "Nothing marked for this series yet.";
}

function skip_button() {
  if (!skip_video.series || !query(".jwplayer video")) return null;
  return [
    { label: "Mark opening / ending", onClick: () => skip_dialog.show() },
    skip_scanner.segs.length && { label: "Share", onClick: skip_share },
  ];
}

// ---- Teilen: nur die Abschnitte (Bilder und Zeiten), nicht was in den eigenen Folgen gefunden wurde

// Kopiert die AniWorld-Seite: Im Frame verbraucht VOEs Werbe-Popup die Nutzeraktivierung des Klicks,
// ohne sie verlangt writeText dort eine Berechtigung. Die Seite meldet "copied" zurueck (voe_initSkip).
async function skip_share() {
  const { segments } = await skip_load();
  window.parent.postMessage({ cu: "episode", type: "copy", text: JSON.stringify({ cuSkip: 1, segments }) }, "*");
}

// gleiche id ersetzt (zweimal importiert), sonst angehaengt; null, wenn der Text nichts Brauchbares traegt
async function skip_import(text) {
  let segs;
  try {
    segs = JSON.parse(text).segments;
  } catch {
    return null;
  }
  const valid = (s) => {
    try {
      return SKIP_KINDS[s.type] && s.from < s.to && skip_fromBase64(s.hashes).length === s.times.length * 8;
    } catch {
      return false;
    }
  };
  segs = Array.isArray(segs) ? segs.filter(valid) : [];
  if (!segs.length) return null;
  return skip_update((d) => {
    for (const { id, type, name, from, to, hashes, times } of segs) {
      const seg = { id: String(id), type, name: String(name || SKIP_KINDS[type]), from, to, hashes, times };
      const i = d.segments.findIndex((s) => s.id === seg.id);
      d.segments.splice(i < 0 ? d.segments.length : i, 1, seg);
      skip_forgetFinds(d, seg.id);
    }
  });
}

// ---- Dialog: Liste der Abschnitte, Markieren mit Vorschau und Bildauslese

const skip_fmt = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0")}`;
const skip_parse = (s) => {
  const m = /^\s*(?:(\d+):)?(\d+(?:[.,]\d+)?)\s*$/.exec(s);
  return m ? (+m[1] || 0) * 60 + +m[2].replace(",", ".") : NaN;
};

// was ein Abschnitt in den Folgen gefunden hat (und wo nichts gefunden wurde), gilt nicht mehr
function skip_forgetFinds(d, id) {
  for (const ep of Object.values(d.episodes))
    for (const kind of Object.keys(SKIP_KINDS)) if (ep[kind]?.seg === id || ep[kind] === "none") delete ep[kind];
}

const skip_dialog = {
  open: false,
  el: null,

  async show() {
    query(".cu-settings.cu-slide-in") && query(".cu-actions-container button")?.click();
    skip_insertCSS();
    this.video = query(".jwplayer video");
    this.video.pause();
    this.el?.remove();
    this.el = create("div", { className: "cu-skip-dialog" });
    this.el.innerHTML = `
      <div class="cu-skip-head"><b>Skip opening / ending</b><button type="button" class="cu-skip-close" title="Close">✕</button></div>
      <div class="cu-skip-body">
        <div class="cu-skip-player">
          <canvas class="cu-skip-preview" width="640" height="360"></canvas>
          <input type="range" class="cu-skip-seek" min="0" step="0.04">
          <div class="cu-skip-controls">
            <button type="button" data-step="-5">−5 s</button><button type="button" data-step="-1">−1 s</button>
            <button type="button" data-step="-0.04">−1 frame</button>
            <button type="button" class="cu-skip-play">▶</button>
            <button type="button" data-step="0.04">+1 frame</button><button type="button" data-step="1">+1 s</button>
            <button type="button" data-step="5">+5 s</button>
            <span class="cu-skip-time"></span>
          </div>
        </div>
        <div class="cu-skip-side">
          <div class="cu-skip-list"></div>
          <div class="cu-skip-add"><button type="button" class="cu-skip-new">+ Add skip</button>
            <button type="button" class="cu-skip-import">Import</button></div>
          <div class="cu-skip-editor cu-hide"></div>
        </div>
      </div>`;
    query(".jwplayer").append(this.el);
    this.open = true;
    this.abort = new AbortController();
    // Tasten (Leertaste, Pfeile) und Klicks gehoeren dem Dialog, nicht dem Player darunter
    for (const type of ["keydown", "pointerdown", "pointerup", "mousedown", "mouseup", "click", "dblclick", "touchstart", "touchend"])
      this.el.addEventListener(type, (e) => e.stopPropagation());
    this.el.querySelector(".cu-skip-close").addEventListener("click", () => this.close());
    this.el.querySelector(".cu-skip-new").addEventListener("click", () => this.edit());
    this.el.querySelector(".cu-skip-import").addEventListener("click", () => this.importer());
    this.wirePlayer();
    this.renderList(await skip_load());
  },

  close() {
    this.capturing = false;
    this.open = false;
    this.abort.abort();
    this.el.remove();
    skip_scanner.reset();
  },

  wirePlayer() {
    const v = this.video, el = this.el;
    const g = el.querySelector(".cu-skip-preview").getContext("2d");
    const seek = el.querySelector(".cu-skip-seek");
    const play = el.querySelector(".cu-skip-play");
    seek.max = v.duration;
    const draw = () => {
      if (!this.open) return;
      g.drawImage(v, 0, 0, 640, 360);
      seek.value = v.currentTime;
      el.querySelector(".cu-skip-time").textContent = `${skip_fmt(v.currentTime)} / ${skip_fmt(v.duration)}`;
      play.textContent = v.paused ? "▶" : "❚❚";
    };
    const loop = () => this.open && (draw(), v.requestVideoFrameCallback(loop));
    v.requestVideoFrameCallback(loop);
    for (const type of ["seeked", "pause", "play"]) v.addEventListener(type, draw, { signal: this.abort.signal });
    draw();
    seek.addEventListener("input", () => (v.currentTime = +seek.value));
    play.addEventListener("click", () => (v.paused ? v.play() : v.pause()));
    for (const b of el.querySelectorAll("[data-step]"))
      b.addEventListener("click", () => (v.currentTime = clamp(v.currentTime + +b.dataset.step, { min: 0, max: v.duration })));
  },

  renderList(data) {
    const list = this.el.querySelector(".cu-skip-list");
    list.innerHTML = data.segments.length ? "" : `<p class="cu-skip-empty">Nothing marked yet.</p>`;
    for (const seg of data.segments) {
      const row = create("div", { className: "cu-skip-row", title: "Edit" });
      row.addEventListener("click", (e) => !e.target.closest("button") && !this.capturing && this.edit(seg));
      row.append(
        create("span", { className: "cu-skip-kind", textContent: SKIP_KINDS[seg.type] }),
        create("span", { textContent: seg.name }),
        create("span", { className: "cu-skip-range", textContent: `${skip_fmt(seg.from)} – ${skip_fmt(seg.to)}` }),
        cu_confirmingDeleteButton("Delete", async () => {
          const d = await skip_update((d) => {
            d.segments = d.segments.filter((s) => s.id !== seg.id);
            skip_forgetFinds(d, seg.id);
          });
          this.renderList(d);
        }),
      );
      list.append(row);
    }
  },

  // old: ein vorhandener Abschnitt; ohne neu eingelesene Bilder bleiben seine alten
  edit(old) {
    const v = this.video;
    const ed = this.el.querySelector(".cu-skip-editor");
    this.el.querySelector(".cu-skip-add").classList.add("cu-hide");
    ed.classList.remove("cu-hide");
    ed.innerHTML = `
      <select class="cu-skip-type"><option value="" selected disabled>Opening or ending?</option>
        <option value="op">Opening</option><option value="ed">Ending</option></select>
      <input class="cu-skip-name" placeholder="Name">
      <p class="cu-skip-hint">Go to the first frame, then press “Set”. Same for the last frame.
        “Read frames” learns the part, so it's found in other episodes.</p>
      ${["from", "to"]
        .map(
          (f) => `<div class="cu-skip-mark" data-f="${f}">
            <span>${f === "from" ? "Start" : "End"}</span><input class="cu-skip-at" placeholder="0:00.0">
            <button type="button" class="cu-skip-set">Set</button><button type="button" class="cu-skip-go">Show</button>
            <canvas width="160" height="90"></canvas></div>`,
        )
        .join("")}
      <button type="button" class="cu-skip-read" disabled>Read frames</button>
      <div class="cu-skip-progress cu-hide"><div></div></div>
      <div class="cu-skip-strip"></div>
      <div class="cu-skip-actions"><button type="button" class="cu-skip-cancel">Cancel</button>
        <button type="button" class="cu-skip-save" disabled>Save</button></div>`;
    const type = ed.querySelector(".cu-skip-type"), name = ed.querySelector(".cu-skip-name");
    const read = ed.querySelector(".cu-skip-read"), save = ed.querySelector(".cu-skip-save");
    let frames = null, readHere = false;
    const at = (f) => skip_parse(ed.querySelector(`[data-f=${f}] .cu-skip-at`).value);
    const check = () => {
      const ok = type.value && at("from") < at("to");
      read.disabled = !ok || this.capturing;
      save.disabled = !ok || !frames;
    };
    // neue Zeiten = alte Bilder passen nicht mehr
    const changed = () => {
      frames = null;
      ed.querySelector(".cu-skip-strip").innerHTML = "";
      check();
    };
    let autoName = "";
    type.addEventListener("change", async () => {
      if (!name.value || name.value === autoName) {
        const n = (await skip_load()).segments.filter((s) => s.type === type.value).length + 1;
        name.value = autoName = `${SKIP_KINDS[type.value]} ${n}`;
      }
      check();
    });
    for (const row of ed.querySelectorAll(".cu-skip-mark")) {
      const input = row.querySelector(".cu-skip-at"), thumb = row.querySelector("canvas").getContext("2d");
      const shot = () => thumb.drawImage(v, 0, 0, 160, 90);
      row.querySelector(".cu-skip-set").addEventListener("click", () => {
        input.value = skip_fmt(v.currentTime);
        shot();
        changed();
      });
      row.querySelector(".cu-skip-go").addEventListener("click", () => {
        if (Number.isNaN(skip_parse(input.value))) return;
        v.addEventListener("seeked", shot, { once: true });
        v.currentTime = skip_parse(input.value);
      });
      input.addEventListener("input", changed);
    }
    read.addEventListener("click", async () => {
      frames = await this.capture(at("from"), Math.min(at("to"), v.duration - 0.5), ed);
      readHere = !!frames;
      check();
    });
    if (old) {
      type.value = old.type;
      name.value = old.name;
      ed.querySelector("[data-f=from] .cu-skip-at").value = skip_fmt(old.from);
      ed.querySelector("[data-f=to] .cu-skip-at").value = skip_fmt(old.to);
      frames = { hashes: old.hashes, times: old.times };
      check();
    }
    ed.querySelector(".cu-skip-cancel").addEventListener("click", () => {
      this.capturing = false;
      this.hideEditor();
    });
    save.addEventListener("click", async () => {
      const seg = { id: old?.id ?? Date.now().toString(36), type: type.value, name: name.value || SKIP_KINDS[type.value], from: at("from"), to: at("to"), ...frames };
      // nur umbenannt: was in den Folgen gefunden wurde, gilt weiter
      const relearned = !old || readHere || seg.type !== old.type;
      const d = await skip_update((d) => {
        const i = d.segments.findIndex((s) => s.id === seg.id);
        d.segments.splice(i < 0 ? d.segments.length : i, 1, seg);
        if (old && relearned) skip_forgetFinds(d, seg.id);
        // ein neuer Abschnitt kann in Folgen passen, in denen bisher nichts gefunden wurde
        if (relearned) for (const ep of Object.values(d.episodes)) if (ep[seg.type] === "none") delete ep[seg.type];
        // je Folge ein Opening und ein Ending: die Folge, in der eingelesen wurde, ist damit geloest
        if (readHere) (d.episodes[skip_episodeKey()] ??= {})[seg.type] = { seg: seg.id, from: seg.from, to: seg.to };
      });
      ed.querySelector(".cu-skip-cancel").click();
      this.renderList(d);
    });
  },

  hideEditor() {
    this.el.querySelector(".cu-skip-editor").classList.add("cu-hide");
    this.el.querySelector(".cu-skip-add").classList.remove("cu-hide");
  },

  // Einfuegen per Strg+V ins Feld: navigator.clipboard.readText fragt erst nach einer Berechtigung
  importer() {
    const ed = this.el.querySelector(".cu-skip-editor");
    this.el.querySelector(".cu-skip-add").classList.add("cu-hide");
    ed.classList.remove("cu-hide");
    ed.innerHTML = `
      <textarea class="cu-skip-paste" rows="6" placeholder="Paste a shared opening / ending here"></textarea>
      <p class="cu-skip-hint cu-hide">That's not a shared opening or ending.</p>
      <div class="cu-skip-actions"><button type="button" class="cu-skip-cancel">Cancel</button>
        <button type="button" class="cu-skip-save" disabled>Import</button></div>`;
    const paste = ed.querySelector(".cu-skip-paste"), save = ed.querySelector(".cu-skip-save");
    const hint = ed.querySelector(".cu-skip-hint");
    paste.addEventListener("input", () => {
      save.disabled = !paste.value.trim();
      hint.classList.add("cu-hide");
    });
    ed.querySelector(".cu-skip-cancel").addEventListener("click", () => this.hideEditor());
    save.addEventListener("click", async () => {
      const d = await skip_import(paste.value);
      if (!d) return hint.classList.remove("cu-hide");
      this.hideEditor();
      this.renderList(d);
    });
    paste.focus();
  },

  // Abschnitt stumm mit Rate 4 abspielen, je Videobild ein Hash (requestVideoFrameCallback liefert
  // die genaue Bildzeit). 90 s dauern so gut 22 s; gemessen 1263 Bilder, also eines je 0,08 s.
  async capture(from, to, ed) {
    const v = this.video;
    const before = { t: v.currentTime, muted: v.muted, paused: v.paused, rate: v.playbackRate };
    const bar = ed.querySelector(".cu-skip-progress"), strip = ed.querySelector(".cu-skip-strip");
    bar.classList.remove("cu-hide");
    strip.innerHTML = "";
    this.capturing = true;
    ed.querySelector(".cu-skip-read").disabled = true;
    globalThis.cu_rateHold = true; // sonst stellt der Geschwindigkeits-Repeater nach einer Sekunde zurueck
    const hashes = [], times = [];
    let nextThumb = from;
    v.muted = true;
    v.pause();
    await new Promise((r) => {
      v.addEventListener("seeked", r, { once: true });
      v.currentTime = from;
    });
    await new Promise((done) => {
      const onFrame = (_, meta) => {
        const t = meta.mediaTime;
        if (!this.capturing || t >= to) return done();
        const h = skip_hash(v);
        // auch gleiche Bilder behalten: ein Standbild braucht seine spaeteste Zeit (skip_scanner.probe)
        if (h) {
          hashes.push(h);
          times.push(Math.round(t * 100) / 100);
        }
        if (t >= nextThumb) {
          const c = create("canvas", { width: 96, height: 54 });
          c.getContext("2d").drawImage(v, 0, 0, 96, 54);
          c.title = skip_fmt(t);
          strip.append(c);
          nextThumb += (to - from) / 15;
        }
        bar.firstElementChild.style.width = `${((t - from) / (to - from)) * 100}%`;
        v.requestVideoFrameCallback(onFrame);
      };
      v.requestVideoFrameCallback(onFrame);
      v.playbackRate = 4;
      v.play();
    });
    v.pause();
    globalThis.cu_rateHold = false;
    v.playbackRate = before.rate;
    v.muted = before.muted;
    v.currentTime = before.t;
    if (!before.paused) v.play();
    bar.classList.add("cu-hide");
    const ok = this.capturing && hashes.length > 10;
    this.capturing = false;
    if (!ok) return null;
    const all = new Uint32Array(hashes.length * 8);
    hashes.forEach((h, i) => all.set(h, i * 8));
    return { hashes: skip_toBase64(all), times };
  },
};

function skip_insertCSS() {
  insertCSS(
    `
    .cu-skip-dialog { position: absolute; inset: 0; z-index: 2147483000; display: flex; flex-direction: column;
      background: #111; color: #eee; font: 13px/1.4 system-ui, sans-serif; }
    .cu-skip-dialog button, .cu-skip-dialog input, .cu-skip-dialog select, .cu-skip-dialog textarea { font: inherit; color: #eee;
      background: #2a2a2a; border: 1px solid #555; border-radius: 4px; padding: 3px 8px; color-scheme: dark; }
    .cu-skip-dialog button:disabled { opacity: 0.4; }
    .cu-skip-head { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px;
      border-bottom: 1px solid #333; }
    .cu-skip-body { flex: 1; display: flex; gap: 12px; padding: 12px; min-height: 0; }
    .cu-skip-player { flex: 3; display: flex; flex-direction: column; gap: 6px; min-width: 0; }
    .cu-skip-preview { width: 100%; height: auto; max-height: calc(100% - 70px); object-fit: contain; background: #000; }
    /* the thumb centre runs from edge to edge of the preview: the input sticks out by half a thumb
       on each side, the track is drawn inset by the same amount (padding and border of the dialog inputs would shift it) */
    .cu-skip-dialog .cu-skip-seek { -webkit-appearance: none; appearance: none; width: calc(100% + 14px); height: 14px;
      margin: 4px -7px; padding: 0; border: 0; background: linear-gradient(#666, #666) 7px 50% / calc(100% - 14px) 4px no-repeat;
      cursor: pointer; }
    .cu-skip-seek::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px;
      border-radius: 50%; background: #4a90ff; }
    .cu-skip-controls { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
    .cu-skip-time { margin-left: auto; font-variant-numeric: tabular-nums; }
    .cu-skip-side { flex: 2; display: flex; flex-direction: column; gap: 8px; overflow: auto; min-width: 260px; }
    .cu-skip-add { display: flex; gap: 6px; }
    .cu-skip-add button { flex: 1; }
    .cu-skip-paste { resize: vertical; word-break: break-all; }
    .cu-skip-row { display: flex; gap: 8px; align-items: center; padding: 4px 0; border-bottom: 1px solid #333; cursor: pointer; }
    .cu-skip-row:hover { background: #1c1c1c; }
    .cu-skip-kind { font-weight: bold; min-width: 5.5em; }
    .cu-skip-range { margin-left: auto; font-variant-numeric: tabular-nums; opacity: 0.8; }
    .cu-skip-empty, .cu-skip-hint { opacity: 0.7; margin: 0; }
    .cu-skip-editor { display: flex; flex-direction: column; gap: 6px; }
    .cu-skip-mark { display: grid; grid-template-columns: 3em 6em auto auto; gap: 4px; align-items: center; }
    .cu-skip-mark canvas { grid-column: 1 / -1; width: 160px; background: #000; }
    .cu-skip-progress { height: 4px; background: #333; }
    .cu-skip-progress > div { height: 100%; width: 0; background: #4caf50; }
    .cu-skip-strip { display: flex; flex-wrap: wrap; gap: 2px; }
    .cu-skip-strip canvas { width: 64px; height: 36px; }
    .cu-skip-actions { display: flex; gap: 6px; justify-content: flex-end; }
    .cu-skip-toast { position: absolute; left: 16px; bottom: 70px; z-index: 2147483000; display: flex; gap: 10px;
      align-items: center; padding: 6px 10px; background: rgba(0,0,0,0.8); color: #fff; border-radius: 4px;
      font: 14px system-ui, sans-serif; }
    .cu-skip-toast button { font: inherit; color: #fff; background: none; border: 1px solid #fff; border-radius: 4px; cursor: pointer; }
    `,
    "cu-skip",
  );
}
