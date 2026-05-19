const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS,GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.end(JSON.stringify(body));
}

function fallbackDiagnosis(input) {
  const foodCost = Number(input.foodCost || 0);
  const grossProfit = Number(input.grossProfit || 0);
  const menuItems = Number(input.menuItems || 0);
  const rating = Number(input.rating || 0);
  const score = Math.max(
    18,
    Math.min(
      88,
      82 -
        Math.max(0, foodCost - 30) * 2 -
        Math.max(0, 35 - grossProfit) * 1.5 -
        Math.max(0, menuItems - 45) * 0.35 -
        Math.max(0, 4.2 - rating) * 8
    )
  );

  const status = score >= 72 ? "Healthy" : score >= 50 ? "Watch Zone" : "Critical";

  return {
    score: Math.round(score),
    status,
    summary:
      "RestroRx sees the biggest leverage in tightening menu complexity, standardising recipes, and improving the dining journey before spending more on marketing.",
    findings: [
      foodCost > 32
        ? "Food cost is above the safe range, which usually points to portion drift, purchasing leakage, wastage, or weak recipe cards."
        : "Food cost is within a manageable range, but it should still be tracked weekly.",
      grossProfit < 30
        ? "Gross profit is under pressure. This restaurant needs margin repair before growth campaigns."
        : "Gross profit has room to support a structured revival plan.",
      menuItems > 50
        ? "The menu looks too long. A bloated menu increases inventory, training load, prep mistakes, and inconsistency."
        : "Menu size looks manageable if the top sellers are standardised."
    ],
    actions: [
      "Rank the last 90 days of sales and protect the top 20% items that drive most revenue.",
      "Create standard recipe cards for the top sellers: exact gram weights, process, plating, and cost per portion.",
      "Run a customer journey audit covering greeting, washroom, table setup, food timing, bill speed, and goodbye."
    ],
    plan: [
      "Days 1-14: Menu surgery, food cost check, and recipe standardisation for hero dishes.",
      "Days 15-45: Kitchen workflow, purchasing discipline, staff training, and service SOPs.",
      "Days 46-90: Review recovery, repeat customer strategy, pricing refinement, and monthly scorecard."
    ],
    dimensions: {
      financial: Math.round(Math.max(20, Math.min(90, 80 - Math.max(0, foodCost - 30) * 3 + Math.max(0, grossProfit - 30)))),
      menu: Math.round(Math.max(20, Math.min(90, 90 - Math.max(0, menuItems - 25) * 0.9))),
      customerExperience: 60,
      team: 58,
      operations: 55,
      onlineReputation: Math.round(Math.max(20, Math.min(90, rating * 20)))
    },
    chefNote:
      "Start with standards. A restaurant becomes easier to revive when the menu is smaller, the kitchen knows exactly what good looks like, and the customer feels cared for from hello to goodbye."
  };
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "GET") {
    return sendJson(res, 200, {
      ok: true,
      message: "RestroRx API is reachable. Use POST for diagnosis."
    });
  }

  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  let input = {};
  try {
    input = req.body || {};
    if (typeof input === "string") input = JSON.parse(input);
  } catch (error) {
    return sendJson(res, 400, { error: "Invalid JSON body" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return sendJson(res, 200, {
      ok: true,
      source: "fallback",
      diagnosis: fallbackDiagnosis(input)
    });
  }

  const prompt = `
You are RestroRx, Chef Amey Marathe's restaurant revival diagnostic engine.
Use practical F&B consulting judgement for India and USA restaurants.

Chef Amey's core rules:
- First scan: menu size, kitchen fit, team, upkeep.
- Critical financial flag: food cost above 30-32% and gross profit below 30%.
- Most failures come from long menus, no standard recipes, no SOPs, no automation, weak talent investment.
- First fix: 80/20 menu surgery, top item standardisation, equipment fit.
- CX audit: greeting, cleanliness, washroom, comfort, table upkeep, food timing, aroma, presentation, cutlery, bill speed, goodbye, storytelling.
- Digital is for speed; humans are for emotion.

Return only valid JSON with this exact shape:
{
  "score": number,
  "status": "Healthy" | "Watch Zone" | "Critical",
  "summary": string,
  "findings": string[],
  "actions": string[],
  "plan": string[],
  "dimensions": {
    "financial": number,
    "menu": number,
    "customerExperience": number,
    "team": number,
    "operations": number,
    "onlineReputation": number
  },
  "chefNote": string
}

Restaurant input:
${JSON.stringify(input, null, 2)}
`;

  try {
    const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.35,
          responseMimeType: "application/json"
        }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return sendJson(res, 200, {
        ok: true,
        source: "fallback-after-gemini-error",
        geminiError: data.error?.message || "Gemini request failed",
        diagnosis: fallbackDiagnosis(input)
      });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return sendJson(res, 200, {
        ok: true,
        source: "fallback-empty-gemini",
        diagnosis: fallbackDiagnosis(input)
      });
    }

    const diagnosis = JSON.parse(text);
    return sendJson(res, 200, { ok: true, source: "gemini", diagnosis });
  } catch (error) {
    return sendJson(res, 200, {
      ok: true,
      source: "fallback-exception",
      error: error.message,
      diagnosis: fallbackDiagnosis(input)
    });
  }
};
