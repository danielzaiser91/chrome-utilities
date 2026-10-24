// Player domains of VOE found at runtime (CLAUDE.md, "VOE-Domains"). The static list covers the
// known ones; for a new one the user grants access once, and the content scripts are registered
// here because only an extension page may call chrome.scripting.
const HOSTS_KEY = "cu:voeHosts";
const SCRIPTS = ["voe-dynamic.js", "utility.js", "skip.js"];

const pattern = (host) => `*://*.${host}/*`;
const scriptId = (host) => `voe-${host}`;
const isStatic = (host) =>
  chrome.runtime.getManifest().content_scripts.some((cs) => cs.matches.includes(pattern(host)));

async function register(host) {
  await chrome.scripting.registerContentScripts([
    {
      id: scriptId(host),
      matches: [pattern(host)],
      js: SCRIPTS,
      allFrames: true,
      runAt: "document_start",
      persistAcrossSessions: true,
    },
  ]).catch((e) => {
    // two tabs reporting the same new host at once
    if (!/Duplicate script ID/i.test(e.message)) throw e;
  });
  const hosts = (await chrome.storage.local.get(HOSTS_KEY))[HOSTS_KEY] ?? [];
  if (!hosts.includes(host)) await chrome.storage.local.set({ [HOSTS_KEY]: [...hosts, host] });
}

// "active": runs there already; "activated": registered just now, so the frame needs a reload;
// "need": the user has to grant access first.
async function voeState(host) {
  if (isStatic(host)) return "active";
  if (!(await chrome.permissions.contains({ origins: [pattern(host)] }))) return "need";
  const registered = await chrome.scripting.getRegisteredContentScripts({ ids: [scriptId(host)] });
  if (registered.length) return "active";
  await register(host);
  return "activated";
}

// Drops hosts whose access was revoked and registers the ones a browser update or profile lost.
async function reconcile() {
  const hosts = (await chrome.storage.local.get(HOSTS_KEY))[HOSTS_KEY] ?? [];
  const states = await Promise.all(hosts.map(voeState));
  const kept = hosts.filter((_, i) => states[i] !== "need");
  const dropped = hosts.filter((_, i) => states[i] === "need");
  if (dropped.length) {
    await chrome.scripting.unregisterContentScripts({ ids: dropped.map(scriptId) }).catch(() => {});
    await chrome.storage.local.set({ [HOSTS_KEY]: kept });
  }
}

const tell = (tabId, state, host) =>
  chrome.tabs.sendMessage(tabId, { cu: "voe", state, host }, { frameId: 0 }).catch(() => {});

// Only hosts voe.sx itself redirected to may be granted: voe-ask.html is reachable from any
// aniworld.to page and takes the host from its URL.
const SEEN_KEY = "cu:voeSeen";
async function markSeen(host) {
  const seen = (await chrome.storage.session.get(SEEN_KEY))[SEEN_KEY] ?? [];
  if (!seen.includes(host)) await chrome.storage.session.set({ [SEEN_KEY]: [...seen, host] });
}
const wasSeen = async (host) =>
  ((await chrome.storage.session.get(SEEN_KEY))[SEEN_KEY] ?? []).includes(host);

chrome.runtime.onMessage.addListener((msg, sender) => {
  const tabId = sender.tab?.id;
  if (tabId === undefined) return;
  if (msg.type === "voe-seen" && new URL(sender.url).hostname.endsWith("voe.sx"))
    markSeen(msg.host)
      .then(() => voeState(msg.host))
      .then((state) => tell(tabId, state, msg.host));
  if (msg.type === "voe-granted")
    wasSeen(msg.host).then(
      (seen) =>
        seen &&
        voeState(msg.host).then((state) =>
          tell(tabId, state === "need" ? "need" : "activated", msg.host),
        ),
    );
});

chrome.runtime.onInstalled.addListener(reconcile);
chrome.runtime.onStartup.addListener(reconcile);
