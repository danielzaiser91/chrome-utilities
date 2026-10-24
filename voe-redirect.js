// voe.sx only forwards a frame to the current player domain (CLAUDE.md, "VOE-Domains"). This
// script reads that target before the redirect lands and hands it to the background worker, which
// knows whether the extension already runs there.
// Not DOMContentLoaded: the page navigates away while it is still being parsed.
function voe_reportTarget() {
  const host = document.documentElement.innerHTML.match(
    /location\.href\s*=\s*'https:\/\/([a-z0-9.-]+)\/e\//i,
  )?.[1];
  if (!host || host === location.hostname) return false;
  chrome.runtime.sendMessage({ type: "voe-seen", host });
  return true;
}

if (self !== top) {
  const observer = new MutationObserver(() => voe_reportTarget() && observer.disconnect());
  observer.observe(document, { childList: true, subtree: true });
}
