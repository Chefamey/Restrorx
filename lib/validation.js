const FIELD_LIMITS = {
  ownerName: 100,
  phone: 32,
  email: 254,
  restaurantName: 140,
  location: 140,
  country: 32,
  market: 32,
  format: 80,
  businessAge: 80,
  revenueTrend: 80,
  cuisine: 160,
  biggestFear: 120,
  monthlyRevenue: 16,
  foodCost: 8,
  grossProfit: 8,
  labourCost: 8,
  rentPercent: 8,
  deliveryCommission: 8,
  wastageEstimate: 16,
  menuItems: 8,
  topTenSalesPercent: 8,
  recipeCosting: 100,
  standardRecipes: 120,
  topSellingItems: 300,
  slowMovingItems: 300,
  kitchenRunBy: 80,
  ownerInvolvement: 40,
  sops: 100,
  consistencyIssue: 100,
  rating: 8,
  blamePattern: 100,
  mainComplaint: 140,
  reviewLink: 500,
  problem: 1500,
  website: 200,
  consent: 10
};

const REQUIRED_TEXT = [
  "ownerName",
  "phone",
  "email",
  "restaurantName",
  "location",
  "format",
  "revenueTrend",
  "biggestFear",
  "recipeCosting",
  "standardRecipes",
  "kitchenRunBy",
  "ownerInvolvement",
  "sops",
  "consistencyIssue",
  "blamePattern",
  "mainComplaint",
  "problem"
];

function cleanText(value, limit) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, limit);
}

function cleanInput(raw) {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const clean = {};
  for (const [field, limit] of Object.entries(FIELD_LIMITS)) {
    clean[field] = cleanText(source[field], limit);
  }
  clean.market = clean.market || (clean.country === "USA" ? "USA" : "India");
  return clean;
}

function numberInRange(value, min, max) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max;
}

function validateInput(raw, { requireConsent = false } = {}) {
  const input = cleanInput(raw);
  const errors = [];

  if (input.website) errors.push("Submission rejected.");
  for (const field of REQUIRED_TEXT) {
    if (!input[field]) errors.push(`${field} is required.`);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) errors.push("Enter a valid email address.");
  if (input.phone.replace(/\D/g, "").length < 7) errors.push("Enter a valid phone number.");
  if (!numberInRange(input.monthlyRevenue, 1, 1000000000000)) errors.push("Monthly revenue must be greater than zero.");
  if (!numberInRange(input.foodCost, 0, 100)) errors.push("Food cost must be between 0 and 100.");
  if (!numberInRange(input.grossProfit, 0, 100)) errors.push("Gross profit must be between 0 and 100.");
  if (input.rating && !numberInRange(input.rating, 0, 5)) errors.push("Rating must be between 0 and 5.");
  for (const field of ["labourCost", "rentPercent", "deliveryCommission"]) {
    if (input[field] && !numberInRange(input[field], 0, 100)) errors.push(`${field} must be between 0 and 100.`);
  }
  if (input.reviewLink) {
    try {
      const url = new URL(input.reviewLink);
      if (!/^https?:$/.test(url.protocol)) throw new Error("invalid protocol");
    } catch (_) {
      errors.push("Review link must be a valid web address.");
    }
  }
  if (requireConsent && !["on", "true", "yes", "1"].includes(input.consent.toLowerCase())) {
    errors.push("Consent is required to save and review your diagnosis.");
  }

  return { input, errors: [...new Set(errors)] };
}

module.exports = { cleanText, validateInput };
