const crypto = require("crypto");
const { allowRequest, parseBody, safeEqual, sendJson } = require("../lib/http");
const { request } = require("../lib/supabase");
const { cleanText, validateInput } = require("../lib/validation");

function updateSecret() {
  const secret = process.env.LEAD_UPDATE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Lead updates are not configured.");
  return secret;
}

function signLead(id) {
  return crypto.createHmac("sha256", updateSecret()).update(id).digest("hex");
}

function safeDiagnosis(raw) {
  const diagnosis = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const textList = (value) => (Array.isArray(value) ? value.slice(0, 10).map((item) => cleanText(item, 800)) : []);
  const dimensions = diagnosis.dimensions && typeof diagnosis.dimensions === "object" ? diagnosis.dimensions : {};
  const number = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Number(value) || 0));
  return {
    score: Math.round(number(diagnosis.score)),
    status: ["Healthy", "Watch Zone", "Critical"].includes(diagnosis.status) ? diagnosis.status : "Watch Zone",
    summary: cleanText(diagnosis.summary, 1500),
    findings: textList(diagnosis.findings),
    actions: textList(diagnosis.actions),
    plan: textList(diagnosis.plan),
    dimensions: {
      financial: Math.round(number(dimensions.financial)),
      menu: Math.round(number(dimensions.menu)),
      customerExperience: Math.round(number(dimensions.customerExperience)),
      team: Math.round(number(dimensions.team)),
      operations: Math.round(number(dimensions.operations)),
      onlineReputation: Math.round(number(dimensions.onlineReputation))
    },
    profitLeakageScore: Math.round(number(diagnosis.profitLeakageScore)),
    menuComplexityRisk: cleanText(diagnosis.menuComplexityRisk, 20),
    ownerReadinessScore: Math.round(number(diagnosis.ownerReadinessScore)),
    teamDependenceRisk: cleanText(diagnosis.teamDependenceRisk, 20),
    customerReturnRisk: cleanText(diagnosis.customerReturnRisk, 20),
    firstIntervention: cleanText(diagnosis.firstIntervention, 1500),
    chefNote: cleanText(diagnosis.chefNote, 1500)
  };
}

function cleanCx(raw) {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const fields = ["greeting", "washroom", "comfort", "foodTiming", "cutlery", "checkBack", "billSpeed", "goodbye", "digitalBalance", "cirBalance", "cxProblem"];
  return Object.fromEntries(fields.map((field) => [field, cleanText(source[field], field === "cxProblem" ? 1200 : 180)]));
}

module.exports = async function handler(req, res) {
  if (!["POST", "PATCH"].includes(req.method)) return sendJson(res, 405, { ok: false, error: "Method not allowed." });
  if (!allowRequest(req, "leads", 14)) return sendJson(res, 429, { ok: false, error: "Too many attempts. Please try again later." });

  let body;
  try {
    body = parseBody(req);
  } catch (_) {
    return sendJson(res, 400, { ok: false, error: "Invalid JSON body." });
  }

  try {
    if (req.method === "POST") {
      const { input, errors } = validateInput(body.input, { requireConsent: true });
      if (errors.length) return sendJson(res, 422, { ok: false, error: errors[0], errors });
      const diagnosis = safeDiagnosis(body.diagnosis);
      if (!diagnosis.summary || !diagnosis.actions.length) return sendJson(res, 422, { ok: false, error: "A valid diagnosis is required." });

      const record = {
        owner_name: input.ownerName,
        phone: input.phone,
        email: input.email,
        restaurant_name: input.restaurantName,
        location: input.location,
        country: input.market,
        monthly_revenue: Number(input.monthlyRevenue),
        food_cost: Number(input.foodCost),
        gross_profit: Number(input.grossProfit),
        rating: Number(input.rating || 0),
        input_data: input,
        diagnosis,
        score: diagnosis.score,
        status: diagnosis.status
      };
      const rows = await request("leads", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(record)
      });
      const id = rows?.[0]?.id;
      if (!id) throw new Error("Lead storage returned no record.");
      return sendJson(res, 201, { ok: true, id, updateToken: signLead(id) });
    }

    const id = cleanText(body.id, 80);
    const token = cleanText(body.updateToken, 128);
    if (!/^[0-9a-f-]{36}$/i.test(id) || !safeEqual(token, signLead(id))) {
      return sendJson(res, 403, { ok: false, error: "This audit link is no longer valid." });
    }
    const cxData = cleanCx(body.cx);
    await request(`leads?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ cx_data: cxData })
    });
    return sendJson(res, 200, { ok: true });
  } catch (error) {
    console.error("RestroRx lead storage error", error);
    return sendJson(res, 503, { ok: false, error: "Your diagnosis is ready, but secure saving is temporarily unavailable. Please use the WhatsApp button so Chef Amey can follow up." });
  }
};
