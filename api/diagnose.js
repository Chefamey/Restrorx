const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
const { allowRequest, parseBody, sendJson } = require("../lib/http");
const { validateInput } = require("../lib/validation");

function fallbackDiagnosis(input) {
  const monthlyRevenue = Number(input.monthlyRevenue || 0);
  const foodCost = Number(input.foodCost || 0);
  const grossProfit = Number(input.grossProfit || 0);
  const menuItems = input.menuItems ? Number(input.menuItems) : 35;
  const rating = input.rating ? Number(input.rating) : 4;
  const labourCost = Number(input.labourCost || input.laborCost || 0);
  const rentPercent = Number(input.rentPercent || 0);
  const market = input.market || input.country || "India";
  const currency = market === "USA" ? "$" : "INR ";
  const recipeCostingPenalty = input.recipeCosting === "No" ? 10 : input.recipeCosting === "Only for some dishes" ? 5 : 0;
  const sopPenalty = input.sops === "No" ? 8 : input.sops === "Some informal SOPs" ? 4 : 0;
  const visibleLeakage =
    monthlyRevenue *
    (Math.max(0, foodCost - 30) + Math.max(0, 35 - grossProfit) + Math.max(0, labourCost - 32) * 0.5 + Math.max(0, rentPercent - 12) * 0.5) /
    100;
  const leakageText = visibleLeakage > 0 ? `${currency}${Math.round(visibleLeakage).toLocaleString("en-IN")}/month` : "low visible leakage from the numbers provided";
  const score = Math.max(
    18,
    Math.min(
      88,
      82 -
        Math.max(0, foodCost - 30) * 2 -
        Math.max(0, labourCost - 32) * 0.8 -
        Math.max(0, rentPercent - 12) * 0.8 -
        Math.max(0, 35 - grossProfit) * 1.5 -
        Math.max(0, menuItems - 45) * 0.35 -
        Math.max(0, 4.2 - rating) * 8 -
        recipeCostingPenalty -
        sopPenalty
    )
  );

  const status = score >= 72 ? "Healthy" : score >= 50 ? "Watch Zone" : "Critical";

  return {
    score: Math.round(score),
    status,
    summary:
      `RestroRx estimates ${leakageText} of possible visible leakage before deeper purchase, recipe, and wastage checks. The fastest leverage is to fix standards before spending more on marketing.`,
    findings: [
      foodCost > 32
        ? `Food cost is ${foodCost}%, above the safe range. This usually points to portion drift, purchasing leakage, wastage, or weak recipe cards.`
        : "Food cost is within a manageable range, but it should still be tracked weekly.",
      grossProfit < 30
        ? `Gross profit is ${grossProfit}%, which means margin repair should come before discounting or paid marketing.`
        : "Gross profit has room to support a structured revival plan.",
      menuItems > 50
        ? `The menu appears heavy at ${menuItems} items. Menu bloat increases inventory, prep mistakes, training load, and inconsistency.`
        : "Menu size looks manageable if the top sellers are standardised."
    ],
    actions: [
      "Pull last 90 days of sales and identify the dishes actually carrying revenue and repeat orders.",
      "Create recipe cards for hero dishes with gram weights, yield, plating, and cost per portion.",
      "Track daily wastage for 14 days and compare actual food cost against theoretical recipe cost."
    ],
    plan: [
      "Days 1-14: Menu surgery, food cost check, and recipe standardisation for hero dishes.",
      "Days 15-45: Kitchen workflow, purchasing discipline, staff training, and service SOPs.",
      "Days 46-90: Review recovery, repeat customer strategy, pricing refinement, and monthly scorecard."
    ],
    dimensions: {
      financial: Math.round(Math.max(20, Math.min(90, 80 - Math.max(0, foodCost - 30) * 3 + Math.max(0, grossProfit - 30)))),
      menu: Math.round(Math.max(20, Math.min(90, 90 - Math.max(0, menuItems - 25) * 0.9))),
      customerExperience: Math.round(Math.max(25, Math.min(85, 70 - Math.max(0, 4.1 - rating) * 10))),
      team: Math.round(Math.max(20, Math.min(85, 74 - Math.max(0, labourCost - 30) * 1.2))),
      operations: Math.round(Math.max(20, Math.min(85, 76 - recipeCostingPenalty - sopPenalty))),
      onlineReputation: Math.round(Math.max(20, Math.min(90, rating * 20)))
    },
    profitLeakageScore: Math.round(Math.max(10, Math.min(95, 100 - score))),
    menuComplexityRisk: menuItems > 70 ? "High" : menuItems > 40 ? "Medium" : "Low",
    ownerReadinessScore: input.ownerInvolvement === "Daily" ? 78 : input.ownerInvolvement === "Weekly" ? 58 : 38,
    teamDependenceRisk: input.kitchenRunBy === "One key chef" || input.recipeCosting === "No" ? "High" : "Medium",
    customerReturnRisk: rating < 3.8 ? "High" : rating < 4.2 ? "Medium" : "Low",
    firstIntervention:
      foodCost > 32 || grossProfit < 30
        ? "If Chef Amey walked in today, he would first audit purchasing, recipe cards, portions, and wastage before touching marketing."
        : "If Chef Amey walked in today, he would first tighten the menu, top-seller consistency, and customer return journey.",
    chefNote:
      "Start with standards. A restaurant becomes easier to revive when the menu is smaller, the kitchen knows exactly what good looks like, and the customer feels cared for from hello to goodbye."
  };
}

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    return sendJson(res, 200, {
      ok: true,
      message: "RestroRx API is reachable. Use POST for diagnosis."
    });
  }

  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  if (!allowRequest(req, "diagnose", 10)) {
    return sendJson(res, 429, { ok: false, error: "Too many attempts. Please try again in a few minutes." });
  }

  if (Number(req.headers["content-length"] || 0) > 30000) {
    return sendJson(res, 413, { ok: false, error: "Submission is too large." });
  }

  let rawInput = {};
  try {
    rawInput = parseBody(req);
  } catch (error) {
    return sendJson(res, 400, { ok: false, error: "Invalid JSON body." });
  }

  const { input, errors } = validateInput(rawInput);
  if (errors.length) {
    return sendJson(res, 422, { ok: false, error: errors[0], errors });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return sendJson(res, 200, {
      ok: true,
      source: "restrorx-engine",
      diagnosis: fallbackDiagnosis(input)
    });
  }

  const {
    ownerName: _ownerName,
    phone: _phone,
    email: _email,
    consent: _consent,
    website: _website,
    ...diagnosticInput
  } = input;

  const prompt = `
You are RestroRx, Chef Amey Marathe's restaurant revival diagnostic engine.
Use practical F&B consulting judgement for India and USA restaurants.

Chef Amey's core rules:
- First scan: menu size, kitchen fit, team, upkeep.
- Critical financial flag: food cost above 30-32% and gross profit below 30%.
- Most failures come from long menus, no standard recipes, no SOPs, no automation, weak talent investment.
- First fix: 80/20 menu surgery, top item standardisation, equipment fit.
- Profit leakage usually hides in recipe costing gaps, portion drift, wastage, purchasing discipline, labour scheduling, rent pressure, and delivery commissions.
- Owner mindset matters: owners often blame staff, but weak systems, weak training, and lack of accountability are usually the real disease.
- A serious diagnosis should answer what to fix first, what is leaking money, and whether the concept fits the location/customer.
- CX audit: greeting, cleanliness, washroom, comfort, table upkeep, food timing, aroma, presentation, cutlery, bill speed, goodbye, storytelling.
- Digital is for speed; humans are for emotion.

Output rules:
- Be crisp and commercial. Avoid generic consulting language.
- Use the user's actual numbers in findings where possible.
- Estimate likely leakage direction, but do not pretend certainty without data.
- Prioritise one first intervention that a restaurant owner can understand immediately.
- If the owner blames staff but SOPs/recipe cards are weak, call out systems before people.
- If food cost is high and GP is low, do not recommend marketing first.
- Keep every action practical enough to start in 14 days.

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
  "profitLeakageScore": number,
  "menuComplexityRisk": "Low" | "Medium" | "High",
  "ownerReadinessScore": number,
  "teamDependenceRisk": "Low" | "Medium" | "High",
  "customerReturnRisk": "Low" | "Medium" | "High",
  "firstIntervention": string,
  "chefNote": string
}

Restaurant input:
${JSON.stringify(diagnosticInput, null, 2)}
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
        source: "restrorx-engine",
        diagnosis: fallbackDiagnosis(input)
      });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return sendJson(res, 200, {
        ok: true,
        source: "restrorx-engine",
        diagnosis: fallbackDiagnosis(input)
      });
    }

    const diagnosis = JSON.parse(text);
    if (!diagnosis || !Number.isFinite(Number(diagnosis.score)) || !Array.isArray(diagnosis.actions)) {
      throw new Error("Invalid provider response");
    }
    return sendJson(res, 200, { ok: true, source: "enhanced", diagnosis });
  } catch (error) {
    return sendJson(res, 200, {
      ok: true,
      source: "restrorx-engine",
      diagnosis: fallbackDiagnosis(input)
    });
  }
};
