/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

// Injected at build time by Workbox / VitePWA
// This file is loaded as extra SW code alongside the generated sw.js

const NGROK_DOMAIN = "ngrok-free.dev";

self.addEventListener("fetch", (event: FetchEvent) => {
  const url = new URL(event.request.url);

  // Only intercept requests to ngrok backend
  if (!url.hostname.endsWith(NGROK_DOMAIN)) return;

  const modifiedHeaders = new Headers(event.request.headers);
  modifiedHeaders.set("ngrok-skip-browser-warning", "true");

  const modifiedRequest = new Request(event.request, {
    headers: modifiedHeaders,
  });

  event.respondWith(fetch(modifiedRequest));
});
