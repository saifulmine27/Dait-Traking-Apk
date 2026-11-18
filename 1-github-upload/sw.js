// ডায়েট ট্র্যাকার: Service Worker
// কাজ: অ্যাপের মূল ফাইল ফোনে জমিয়ে রাখা, যাতে ইন্টারনেট ছাড়াও অ্যাপ খোলে এবং আগের চেয়ে দ্রুত চলে।
// নতুন আপডেট দিলে নিচের V-এর সংখ্যা বাড়িয়ে দিন (diet-v2, diet-v3 ...)।
const V = "diet-v1";
const CORE = ["./", "index.html", "manifest.json", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];
const CDN = ["cdnjs.cloudflare.com", "fonts.googleapis.com", "fonts.gstatic.com", "www.gstatic.com"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// জমানো কপি আগে দেখায়, পেছনে নতুন কপি এনে জমায়
function swr(r) {
  return caches.open(V).then((c) =>
    c.match(r).then((hit) => {
      const net = fetch(r)
        .then((res) => {
          if (res && (res.ok || res.type === "opaque")) c.put(r, res.clone());
          return res;
        })
        .catch(() => hit);
      return hit || net;
    })
  );
}

self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET") return; // AI অনুরোধ (POST) কখনো জমানো হয় না
  const u = new URL(r.url);

  // পেজ খোলা: আগে ইন্টারনেট (নতুন সংস্করণ পেতে), ধীর বা না থাকলে জমানো কপি
  if (r.mode === "navigate") {
    const net = fetch(r);
    const timeout = new Promise((_, rej) => setTimeout(rej, 4000));
    e.respondWith(
      Promise.race([net, timeout])
        .then((res) => {
          const cp = res.clone();
          caches.open(V).then((c) => c.put("index.html", cp));
          return res;
        })
        .catch(() => caches.match("index.html").then((h) => h || net))
    );
    return;
  }

  if (u.origin === location.origin) { e.respondWith(swr(r)); return; }
  if (CDN.indexOf(u.hostname) >= 0) { e.respondWith(swr(r)); return; }
  // Firebase লগইন, Firestore, AI Worker: সরাসরি ইন্টারনেটে যায়, কিছু জমানো হয় না
});
