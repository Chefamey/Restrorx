const crypto = require("node:crypto");
const { allowRequest, parseBody, safeEqual, sendJson } = require("../lib/http");
const { request } = require("../lib/supabase");
const { cleanText, validateInput, validateContact } = require("../lib/validation");
const { diagnose } = require("../lib/diagnosis");

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

function sign(value) {
  const secret = process.env.LEAD_UPDATE_SECRET;
  if (!secret) throw new Error("Lead access is not configured.");
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

function leadId(submissionKey) {
  const digest = sign(`submission:${submissionKey.toLowerCase()}`);
  return [digest.slice(0, 8), digest.slice(8, 12), digest.slice(12, 16), digest.slice(16, 20), digest.slice(20, 32)].join("-");
}

function cleanCx(raw) {
  const fields = ["greeting", "washroom", "comfort", "foodTiming", "cutlery", "checkBack", "billSpeed", "goodbye", "digitalBalance", "cirBalance", "cxProblem"];
  return Object.fromEntries(fields.map((field) => [field, cleanText(raw[field], field === "cxProblem" ? 1200 : 180)]));
}

module.exports = async function handler(req, res) {
  if (!["POST", "PATCH"].includes(req.method)) return sendJson(res, 405, { ok: false, error: "Method not allowed." });
  if (!allowRequest(req, "leads", 14)) return sendJson(res, 429, { ok: false, error: "Too many attempts. Please try again later." });

  let body;
  try {
    body = parseBody(req);
  } catch {
    return sendJson(res, 400, { ok: false, error: "Invalid or oversized submission." });
  }

  try {
    if (req.method === "POST") {
      const { input, errors } = validateInput(body.input);
      const contactResult = validateContact(body.contact);
      const error = errors[0] || contactResult.errors[0];
      if (error) return sendJson(res, 422, { ok: false, error });
      if (typeof body.submissionKey !== "string" || !UUID.test(body.submissionKey)) {
        return sendJson(res, 422, { ok: false, error: "Your enquiry could not be identified. Run the diagnostic again." });
      }

      const id = leadId(body.submissionKey);
      const updateToken = sign(`cx:${id}`);
      const { contact } = contactResult;
      const diagnosis = diagnose(input);
      const record = {
        id,
        owner_name: contact.ownerName,
        phone: contact.phone || null,
        email: contact.email || null,
        restaurant_name: contact.restaurantName,
        location: contact.location,
        country: input.market,
        monthly_revenue: Number(input.monthlyRevenue),
        food_cost: Number(input.foodCost),
        gross_profit: Number(input.grossProfit),
        rating: input.rating ? Number(input.rating) : null,
        input_data: input,
        diagnosis,
        score: diagnosis.score,
        status: diagnosis.status,
        menu_complexity_risk: diagnosis.menuComplexityRisk,
        team_dependence_risk: diagnosis.teamDependenceRisk,
        first_intervention: diagnosis.firstIntervention
      };
      const rows = await request("leads?on_conflict=id&select=id", {
        method: "POST",
        headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
        body: JSON.stringify(record)
      });
      if (rows?.[0]?.id === id) return sendJson(res, 201, { ok: true, id, updateToken });

      const existing = await request(`leads?id=eq.${id}&select=id`);
      if (existing?.[0]?.id !== id) throw new Error("Lead storage returned no record.");
      return sendJson(res, 200, { ok: true, id, updateToken });
    }

    const { id, updateToken, cx } = body;
    if (typeof id !== "string" || !UUID.test(id) || typeof updateToken !== "string" || !safeEqual(updateToken, sign(`cx:${id}`))) {
      return sendJson(res, 403, { ok: false, error: "This audit link is no longer valid." });
    }
    if (!cx || typeof cx !== "object" || Array.isArray(cx)) {
      return sendJson(res, 422, { ok: false, error: "Enter your customer journey answers." });
    }
    const rows = await request(`leads?id=eq.${id}&select=id`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ cx_data: cleanCx(cx) })
    });
    if (rows?.[0]?.id !== id) return sendJson(res, 404, { ok: false, error: "The enquiry could not be found." });
    return sendJson(res, 200, { ok: true });
  } catch {
    console.error("RestroRX lead storage unavailable", { method: req.method });
    return sendJson(res, 503, { ok: false, error: "Saving is temporarily unavailable. Please retry or use WhatsApp." });
  }
};
