const { requireAdmin, sendJson } = require("../lib/http");
const { request } = require("../lib/supabase");

module.exports = async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  if (req.method !== "GET") return sendJson(res, 405, { ok: false, error: "Method not allowed." });
  try {
    const params = new URLSearchParams({
      select: "id,created_at,owner_name,phone,email,restaurant_name,location,country,monthly_revenue,food_cost,gross_profit,rating,score,status,input_data,diagnosis,cx_data",
      order: "created_at.desc",
      limit: "200"
    });
    const leads = await request(`leads?${params.toString()}`);
    return sendJson(res, 200, { ok: true, leads: leads || [] });
  } catch (error) {
    console.error("RestroRx admin read error", error);
    return sendJson(res, 503, { ok: false, error: "Lead data is temporarily unavailable." });
  }
};
