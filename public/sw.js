// Minimal service worker — installability only.
// Network-first passthrough. No caching of API/auth-gated responses (data is live).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  // intentionally no-op: let the network handle everything
});
