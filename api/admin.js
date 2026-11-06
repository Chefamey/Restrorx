const fs = require("fs");
const path = require("path");
const { requireAdmin } = require("../lib/http");

module.exports = async function handler(req, res) {
  if (!(await requireAdmin(req, res))) return;
  if (req.method !== "GET") {
    res.statusCode = 405;
    return res.end("Method not allowed");
  }
  const html = fs.readFileSync(path.join(__dirname, "../lib/dashboard.html"), "utf8");
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(html);
};
