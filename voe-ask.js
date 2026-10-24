// The notice's own page: permissions.request needs a click inside an extension document, which the
// content script of aniworld.to cannot provide.
const host = new URLSearchParams(location.search).get("host");

document.getElementById("close").addEventListener("click", () => {
  parent.postMessage({ cu: "voe-ask", type: "close" }, "*");
});

document.getElementById("allow").addEventListener("click", async () => {
  const granted = await chrome.permissions.request({ origins: [`*://*.${host}/*`] });
  if (granted) chrome.runtime.sendMessage({ type: "voe-granted", host });
});
