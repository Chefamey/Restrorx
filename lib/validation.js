const FIELD_LIMITS = {
  format: 80, businessAge: 80, revenueTrend: 80, cuisine: 160, biggestFear: 120,
  monthlyRevenue: 24, foodCost: 16, grossProfit: 16, labourCost: 16, rentPercent: 16,
  deliveryCommission: 16, wastageEstimate: 24, menuItems: 16, topTenSalesPercent: 16,
  recipeCosting: 100, standardRecipes: 120, topSellingItems: 300, slowMovingItems: 300,
  kitchenRunBy: 80, ownerInvolvement: 40, sops: 100, consistencyIssue: 100, rating: 16,
  blamePattern: 100, mainComplaint: 140, reviewLink: 500, problem: 1500
};

const REQUIRED_TEXT = {
  format: "Restaurant format", revenueTrend: "Revenue trend", biggestFear: "Main concern",
  recipeCosting: "Recipe costing", standardRecipes: "Recipe cards", kitchenRunBy: "Kitchen lead",
  ownerInvolvement: "Owner involvement", sops: "Written procedures", consistencyIssue: "Consistency",
  blamePattern: "First suspected cause", mainComplaint: "Customer complaint", problem: "Biggest problem"
};

const SCORED_OPTIONS = {
  recipeCosting: ["Yes, for all key dishes", "Only for some dishes", "No"],
  kitchenRunBy: ["Owner", "Head chef", "One key chef", "Cook team", "Manager"],
  sops: ["Yes, documented and used", "Some informal SOPs", "No"]
};

function cleanText(value, limit) {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, limit);
}

function numberInRange(value, min, max) {
  const number = Number(value);
  return /^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value) && Number.isFinite(number) && number >= min && number <= max;
}

function validateInput(raw) {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const input = Object.fromEntries(Object.entries(FIELD_LIMITS).map(([field, limit]) => [field, cleanText(source[field], limit)]));
  input.market = cleanText(source.market ?? source.country, 32);
  const errors = [];
  if (!["India", "USA"].includes(input.market)) errors.push("Choose India or USA.");
  for (const [field, label] of Object.entries(REQUIRED_TEXT)) {
    if (!input[field]) errors.push(`${label} is required.`);
  }
  for (const [field, options] of Object.entries(SCORED_OPTIONS)) {
    if (input[field] && !options.includes(input[field])) errors.push(`Choose an option for ${REQUIRED_TEXT[field].toLowerCase()}.`);
  }
  if (!numberInRange(input.monthlyRevenue, 0.01, 1000000000000)) errors.push("Enter monthly revenue greater than zero.");
  if (!numberInRange(input.foodCost, 0, 100)) errors.push("Food cost must be between 0% and 100%.");
  if (!numberInRange(input.grossProfit, -100, 100)) errors.push("Gross margin must be between −100% and 100%.");
  if (Number(input.foodCost) + Number(input.grossProfit) > 100.01) {
    errors.push("Check that food cost and gross margin use the same month's sales. Together they cannot exceed 100%.");
  }
  const optional = {
    labourCost: ["Labour cost", 0, 100], rentPercent: ["Rent", 0, 100],
    deliveryCommission: ["Delivery commission", 0, 100], rating: ["Rating", 0, 5],
    wastageEstimate: ["Wastage", 0, 1000000000000], topTenSalesPercent: ["Top-ten sales share", 0, 100]
  };
  for (const [field, [label, min, max]] of Object.entries(optional)) {
    if (input[field] && !numberInRange(input[field], min, max)) errors.push(`${label} must be between ${min} and ${max}.`);
  }
  if (input.menuItems && (!numberInRange(input.menuItems, 1, 10000) || !Number.isInteger(Number(input.menuItems)))) {
    errors.push("Enter a whole number of menu items between 1 and 10,000.");
  }
  if (input.reviewLink) {
    try {
      const url = new URL(input.reviewLink);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error("Invalid protocol");
    } catch {
      errors.push("Enter a public review link starting with http:// or https://.");
    }
  }
  return { input, errors };
}

function validateContact(raw) {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const limits = { ownerName: 100, restaurantName: 140, location: 140, phone: 32, email: 254 };
  const contact = Object.fromEntries(Object.entries(limits).map(([field, limit]) => [field, cleanText(source[field], limit)]));
  const errors = [];
  if (!contact.ownerName || !contact.restaurantName || !contact.location) {
    errors.push("Enter your name, restaurant name and city.");
  }
  if (!contact.phone && !contact.email) errors.push("Enter an email address or a WhatsApp number.");
  if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) errors.push("Enter a valid email address.");
  if (contact.phone && !/^\+[1-9]\d{6,14}$/.test(contact.phone.replace(/[\s().-]/g, ""))) {
    errors.push("Enter a WhatsApp number with its country code, such as +91 or +1.");
  }
  if (source.consent !== "on") errors.push("Confirm that Chef Amey may review your answers and contact you about this enquiry.");
  if (source.website) errors.push("Submission rejected.");
  return { contact, errors };
}

module.exports = { cleanText, validateInput, validateContact };
