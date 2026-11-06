const crypto = require("node:crypto");
const { isIP } = require("node:net");
const { promisify } = require("node:util");

const derivePassword = promisify(crypto.pbkdf2);
const PASSWORD_ITERATIONS = 600000;

const rateBuckets = new Map();
let nextSweep = 0;

function sendJson(res, status, body, extraHeaders = {}) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  for (const [name, value] of Object.entries(extraHeaders)) res.setHeader(name, value);
  res.end(JSON.stringify(body));
}

function parseBody(req) {
  if (Number(req.headers["content-length"] || 0) > 30000) throw new Error("Oversized body");
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers["content-type"] || "")) {
    throw new Error("Expected JSON");
  }
  const raw = req.body;
  if (typeof raw === "string" && Buffer.byteLength(raw) > 30000) throw new Error("Oversized body");
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid JSON body");
  return parsed;
}

function clientIp(req) {
  // Vercel overwrites the forwarded header with the public client address.
  const forwarded = process.env.VERCEL === "1"
    ? String(req.headers["x-forwarded-for"] || "").split(",")[0].trim()
    : "";
  return isIP(forwarded) ? forwarded : req.socket?.remoteAddress || "unknown";
}

function allowRequest(req, scope, limit = 12, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  if (now >= nextSweep) {
    for (const [key, bucket] of rateBuckets) {
      if (bucket.expires <= now) rateBuckets.delete(key);
    }
    nextSweep = now + 60000;
  }

  const key = `${scope}:${clientIp(req)}`;
  const bucket = rateBuckets.get(key);
  if (bucket && bucket.expires > now) {
    if (bucket.count >= limit) return false;
    bucket.count++;
    return true;
  }
  if (!bucket && rateBuckets.size >= 5000) return false;
  rateBuckets.set(key, { count: 1, expires: now + windowMs });
  return true;
}

function rejectCrossSite(req, res) {
  if (req.headers["sec-fetch-site"] !== "cross-site") return false;
  sendJson(res, 403, { ok: false, error: "Submit this request from RestroRX." });
  return true;
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

async function requireAdmin(req, res) {
  res.setHeader("Cache-Control", "no-store, private");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Referrer-Policy", "no-referrer");
  if (!allowRequest(req, "admin", 20, 60000)) {
    sendJson(res, 429, { ok: false, error: "Too many admin requests. Try again in a minute." }, { "Retry-After": "60" });
    return false;
  }

  const expectedUser = process.env.ADMIN_USER;
  const verifier = /^pbkdf2-sha256\$600000\$([a-f0-9]{32})\$([a-f0-9]{64})$/.exec(process.env.ADMIN_PASSWORD_HASH || "");
  if (!expectedUser || !verifier) {
    sendJson(res, 503, { ok: false, error: "Admin access is not configured." });
    return false;
  }
  const header = String(req.headers.authorization || "");
  let user = "";
  let password = "";
  if (header.startsWith("Basic ") && header.length <= 2048) {
    try {
      const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
      const separator = decoded.indexOf(":");
      if (separator !== -1) {
        user = decoded.slice(0, separator);
        password = decoded.slice(separator + 1);
      }
    } catch (_) {}
  }
  if (password && safeEqual(user, expectedUser)) {
    const salt = Buffer.from(verifier[1], "hex");
    const expectedHash = Buffer.from(verifier[2], "hex");
    const passwordHash = await derivePassword(password, salt, PASSWORD_ITERATIONS, expectedHash.length, "sha256");
    if (crypto.timingSafeEqual(passwordHash, expectedHash)) return true;
  }

  res.statusCode = 401;
  res.setHeader("WWW-Authenticate", 'Basic realm="RestroRx Private Dashboard", charset="UTF-8"');
  res.end("Authentication required");
  return false;
}

module.exports = { allowRequest, parseBody, rejectCrossSite, requireAdmin, safeEqual, sendJson };
