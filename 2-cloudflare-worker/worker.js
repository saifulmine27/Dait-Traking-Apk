// Cloudflare Worker: diet-tracker-ai
// কাজ: সাইন ইন করা ব্যবহারকারীর AI অনুরোধ নিয়ে Claude (বা Gemini) কে ডাকা। API key এখানেই লুকানো থাকে।
//
// প্রয়োজনীয় সেটিংস (Settings → Variables and Secrets):
//   ANTHROPIC_API_KEY   (Secret)  Claude ব্যবহার করলে
//   GEMINI_API_KEY      (Secret)  Gemini ব্যবহার করলে (Claude key না থাকলে এটা চলে)
//   FIREBASE_PROJECT_ID (Text)    amar-dokhan-b738a
//   ALLOWED_ORIGIN      (Text)    https://saifulmine27.github.io
// ঐচ্ছিক:
//   MODEL / GEMINI_MODEL (Text)   মডেলের নাম বদলাতে (আরও দ্রুত: gemini-3.5-flash-lite)
//   GEMINI_THINKING     (Text)    minimal / low / medium / high (ডিফল্ট low)
//   DAILY_LIMIT         (Text)    প্রতি ব্যবহারকারীর দৈনিক সীমা (ডিফল্ট ৩০)
//   RL                  (KV binding) দৈনিক সীমা গুনতে চাইলে

const JWKS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
let jwksCache = null, jwksAt = 0;

function b64u(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const b = atob(s), a = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i);
  return a;
}
const jparse = (s) => JSON.parse(new TextDecoder().decode(b64u(s)));

async function getKeys() {
  if (jwksCache && Date.now() - jwksAt < 3600e3) return jwksCache;
  const r = await fetch(JWKS_URL);
  if (!r.ok) throw new Error("jwks");
  jwksCache = (await r.json()).keys;
  jwksAt = Date.now();
  return jwksCache;
}

// Firebase ID token যাচাই (সই, প্রজেক্ট, মেয়াদ)
async function verify(token, pid) {
  const p = token.split(".");
  if (p.length !== 3 || !pid) throw new Error("bad token");
  const h = jparse(p[0]), c = jparse(p[1]);
  if (h.alg !== "RS256") throw new Error("alg");
  const k = (await getKeys()).find((x) => x.kid === h.kid);
  if (!k) throw new Error("kid");
  const key = await crypto.subtle.importKey("jwk", k, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64u(p[2]), new TextEncoder().encode(p[0] + "." + p[1]));
  if (!ok) throw new Error("sig");
  const now = Math.floor(Date.now() / 1000);
  if (c.aud !== pid || c.iss !== "https://securetoken.google.com/" + pid || !c.sub || c.exp < now || c.iat > now + 300) throw new Error("claims");
  return c;
}

export default {
  async fetch(req, env) {
    const origin = env.ALLOWED_ORIGIN || "";
    const cors = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    };
    const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json; charset=utf-8" } });

    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (req.method !== "POST") return J({ error: "শুধু POST চলে" }, 405);
    if (!origin || req.headers.get("Origin") !== origin) return J({ error: "এই সাইট থেকে অনুমতি নেই" }, 403);

    let user;
    try {
      const a = req.headers.get("Authorization") || "";
      user = await verify(a.replace(/^Bearer\s+/i, ""), env.FIREBASE_PROJECT_ID);
    } catch (e) {
      return J({ error: "সাইন ইন প্রমাণ হয়নি। আবার সাইন ইন করুন।" }, 401);
    }

    let body;
    try { body = await req.json(); } catch { return J({ error: "ভুল অনুরোধ" }, 400); }
    const prompt = String(body.prompt || "").slice(0, 6000);
    const image = body.image ? String(body.image) : null;
    if (!prompt) return J({ error: "লেখা নেই" }, 400);
    if (image && image.length > 2.5e6) return J({ error: "ছবি অনেক বড়" }, 413);

    if (env.RL) {
      const lim = +env.DAILY_LIMIT || 30;
      const k = user.sub + ":" + new Date().toISOString().slice(0, 10);
      const n = +(await env.RL.get(k)) || 0;
      if (n >= lim) return J({ error: "আজকের AI ব্যবহারের সীমা (" + lim + " বার) শেষ। কাল আবার চেষ্টা করুন।" }, 429);
      await env.RL.put(k, String(n + 1), { expirationTtl: 172800 });
    }

    try {
      let text;
      if (env.ANTHROPIC_API_KEY) {
        const c = [];
        if (image) c.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } });
        c.push({ type: "text", text: prompt });
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({ model: env.MODEL || "claude-haiku-5-5", max_tokens: 1500, messages: [{ role: "user", content: c }] }),
        });
        const j = await r.json();
        if (!r.ok) throw new Error("Claude " + r.status + ": " + ((j.error && j.error.message) || "অজানা ত্রুটি"));
        text = (j.content || []).map((p) => p.text || "").join("");
      } else if (env.GEMINI_API_KEY) {
        const ps = [];
        ps.push({ text: prompt });
        if (image) ps.push({ inline_data: { mime_type: "image/jpeg", data: image } });
        const call = async (model, think) => {
          const gc = { responseMimeType: "application/json", maxOutputTokens: 1500 };
          // দ্রুত উত্তরের জন্য "চিন্তা" কমানো (Gemini 3.x এ thinkingLevel, 2.5 Flash এ thinkingBudget)
          if (think && model.startsWith("gemini-3")) gc.thinkingConfig = { thinkingLevel: env.GEMINI_THINKING || "low" };
          else if (think && /gemini-2\.5-flash(?!-lite)/.test(model)) gc.thinkingConfig = { thinkingBudget: 0 };
          const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
            body: JSON.stringify({ contents: [{ parts: ps }], generationConfig: gc }),
          });
          const j = await r.json().catch(() => ({}));
          return { r, j };
        };
        const model = env.GEMINI_MODEL || "gemini-3.6-flash";
        let { r, j } = await call(model, true);
        // চিন্তার সেটিং মডেল না মানলে (400), সেটিং ছাড়া আবার চেষ্টা
        if (r.status === 400) ({ r, j } = await call(model, false));
        // মডেল খুঁজে না পেলে (404), নিরাপদ মডেলে আবার চেষ্টা
        if (r.status === 404 && model !== "gemini-2.5-flash") ({ r, j } = await call("gemini-2.5-flash", true));
        if (!r.ok) throw new Error("Gemini " + r.status + ": " + ((j.error && j.error.message) || "অজানা ত্রুটি"));
        text = (((j.candidates || [])[0] || { content: { parts: [] } }).content.parts || []).map((p) => p.text || "").join("");
      } else {
        return J({ error: "সার্ভারে AI key বসানো নেই" }, 500);
      }
      return J({ text });
    } catch (e) {
      return J({ error: "AI সার্ভার ব্যর্থ: " + String(e.message || e).slice(0, 240) }, 502);
    }
  },
};
