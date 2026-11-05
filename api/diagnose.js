const { allowRequest, parseBody, sendJson } = require("../lib/http");
const { validateInput } = require("../lib/validation");
const { diagnose } = require("../lib/diagnosis");

module.exports = function handler(req, res) {
  if (req.method === "GET") {
    return sendJson(res, 200, { ok: true, message: "RestroRx API is reachable. Use POST for diagnosis." });
  }
  if (req.method !== "POST") return sendJson(res, 405, { ok: false, error: "Method not allowed." });
  if (!allowRequest(req, "diagnose", 10)) {
    return sendJson(res, 429, { ok: false, error: "Too many attempts. Please try again in a few minutes." });
  }

  let body;
  try {
    body = parseBody(req);
  } catch {
    return sendJson(res, 400, { ok: false, error: "Invalid or oversized submission." });
  }
  const { input, errors } = validateInput(body);
  if (errors.length) return sendJson(res, 422, { ok: false, error: errors[0], errors });
  return sendJson(res, 200, { ok: true, source: "restrorx-engine", diagnosis: diagnose(input) });
};
