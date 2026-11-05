const crypto = require("crypto");

const rateBuckets = global.__restrorxRateBuckets || new Map();
global.__restrorxRateBuckets = rateBuckets;

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
  return String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
}

function allowRequest(req, scope, limit = 12, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const key = `${scope}:${clientIp(req)}`;
  const recent = (rateBuckets.get(key) || []).filter((timestamp) => now - timestamp < windowMs);
  if (recent.length >= limit) return false;
  recent.push(now);
  rateBuckets.set(key, recent);
  if (rateBuckets.size > 5000) {
    for (const [bucketKey, timestamps] of rateBuckets) {
      if (!timestamps.some((timestamp) => now - timestamp < windowMs)) rateBuckets.delete(bucketKey);
    }
  }
  return true;
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function requireAdmin(req, res) {
  const expectedUser = process.env.ADMIN_USER;
  const expectedHash = process.env.ADMIN_PASSWORD_HASH;
  if (!expectedUser || !expectedHash) {
    sendJson(res, 503, { ok: false, error: "Admin access is not configured." });
    return false;
  }
  const header = String(req.headers.authorization || "");
  let user = "";
  let password = "";
  if (header.startsWith("Basic ")) {
    try {
      const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
      const separator = decoded.indexOf(":");
      if (separator !== -1) {
        user = decoded.slice(0, separator);
        password = decoded.slice(separator + 1);
      }
    } catch (_) {}
  }
  const passwordHash = crypto.createHash("sha256").update(password).digest("hex");
  if (!safeEqual(user, expectedUser) || !safeEqual(passwordHash, expectedHash)) {
    res.statusCode = 401;
    res.setHeader("WWW-Authenticate", 'Basic realm="RestroRx Private Dashboard", charset="UTF-8"');
    res.setHeader("Cache-Control", "no-store");
    res.end("Authentication required");
    return false;
  }
  return true;
}

module.exports = { allowRequest, parseBody, requireAdmin, safeEqual, sendJson };
