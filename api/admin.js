const fs = require("fs");
const path = require("path");
const { requireAdmin } = require("../lib/http");

module.exports = function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  if (req.method !== "GET") {
    res.statusCode = 405;
    return res.end("Method not allowed");
  }
  const html = fs.readFileSync(path.join(process.cwd(), "dashboard.html"), "utf8");
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, private");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.end(html);
};
