"use strict";

const CACHE_VERSION = "taka-has-v1.1.1";
const RUNTIME_CACHE = "taka-has-runtime-v1.1.1";
const OFFLINE_URL = "./offline.html";
const APP_SHELL = [
  "./app.js",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/maskable-192.png",
  "./assets/icons/maskable-512.png",
  "./assets/taka-assistant.png",
  "./assets/taka-thinking.png",
  "./data/fluid-families.json",
  "./data/fluids.json",
  "./data/fluoropolymer-hoses.json",
  "./data/hybrid-hoses.json",
  "./data/material-compatibility.json",
  "./data/materials.json",
  "./data/metal-flexible-tubes.json",
  "./data/metal-hoses.json",
  "./data/nylon-hoses.json",
  "./data/polyethylene-hoses.json",
  "./data/rubber-hoses.json",
  "./engine/bendradius.js",
  "./engine/compatibility.js",
  "./engine/electrical.js",
  "./engine/geometry.js",
  "./engine/loader.js",
  "./engine/permeability.js",
  "./engine/pressure-temperature.js",
  "./engine/pressure.js",
  "./engine/scoring.js",
  "./engine/temperature.js",
  "./engine/validator.js",
  "./engine/vibration.js",
  "./index.html",
  "./manifest.webmanifest",
  "./offline.html",
  "./styles.css",
  "./ui/alerts.js",
  "./ui/cards.js",
  "./ui/forms.js",
  "./ui/render.js",
  "./utils/helpers.js",
  "./utils/numbers.js",
  "./utils/temperature.js",
  "./utils/units.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => ![CACHE_VERSION, RUNTIME_CACHE].includes(key)).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then((response) => {
      const copy = response.clone();
      caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
      return response;
    }).catch(async () => (await caches.match(request)) || (await caches.match("./index.html")) || caches.match(OFFLINE_URL)));
    return;
  }

  const isTechnicalData = url.pathname.includes("/data/") || url.pathname.endsWith(".json");
  if (isTechnicalData) {
    event.respondWith(caches.match(request).then((cached) => {
      const network = fetch(request).then((response) => {
        if (response.ok) caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, response.clone()));
        return response;
      }).catch(() => cached);
      return cached || network;
    }));
    return;
  }

  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
    if (response.ok) caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, response.clone()));
    return response;
  })));
});

self.addEventListener("message", (event) => { if (event.data?.type === "SKIP_WAITING") self.skipWaiting(); });
