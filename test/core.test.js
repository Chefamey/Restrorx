const assert = require("node:assert/strict");
const { createHash, randomUUID } = require("node:crypto");
const { test } = require("node:test");
const diagnose = require("../api/diagnose");
const leads = require("../api/leads");
const admin = require("../api/admin");
const adminLeads = require("../api/admin-leads");

const input = {
  market: "India", format: "Casual dining", revenueTrend: "Flat", biggestFear: "High food cost",
  monthlyRevenue: "100000.25", foodCost: "37.5", grossProfit: "24.5",
  recipeCosting: "No", standardRecipes: "No proper recipe cards", kitchenRunBy: "One key chef",
  ownerInvolvement: "Daily", sops: "No", consistencyIssue: "Taste changes",
  blamePattern: "Staff", mainComplaint: "Taste inconsistency", problem: "Portions vary by shift"
};
const contact = {
  ownerName: "Test Owner", restaurantName: "Test Kitchen", location: "Hyderabad",
  email: "owner@example.test", consent: "on"
};
const secret = "synthetic-admin-password";
process.env.ADMIN_USER = "synthetic-admin";
process.env.ADMIN_PASSWORD_HASH = createHash("sha256").update(secret).digest("hex");
process.env.LEAD_UPDATE_SECRET = "synthetic-signing-secret";
process.env.SUPABASE_URL = "https://supabase.example.test";
process.env.SUPABASE_SERVICE_ROLE_KEY = "synthetic-service-key";

let ipIndex = 1;

async function call(handler, method, body, authorization, requestHeaders = {}, ip = `192.0.2.${ipIndex++}`) {
  const headers = {};
  const req = {
    method, body,
    socket: { remoteAddress: ip },
    headers: { authorization, "content-type": "application/json", ...requestHeaders }
  };
  let result;
  const res = {
    setHeader: (name, value) => { headers[name.toLowerCase()] = value; },
    end(value) { result = { status: this.statusCode, headers, value }; }
  };
  await handler(req, res);
  if (headers["content-type"]?.startsWith("application/json")) result.body = JSON.parse(result.value);
  return result;
}

function storage(t) {
  const rows = new Map();
  let unavailable = false;
  let patchWithoutRecord = false;
  t.mock.method(globalThis, "fetch", async (address, options) => {
    const url = new URL(address);
    assert.equal(url.origin, "https://supabase.example.test");
    assert.equal(options.headers.Authorization, "Bearer synthetic-service-key");
    if (unavailable) return Response.json({}, { status: 503 });
    const id = url.searchParams.get("id")?.slice(3);
    if (options.method === "POST") {
      assert.equal(url.searchParams.get("on_conflict"), "id");
      assert.match(options.headers.Prefer, /ignore-duplicates/);
      const row = JSON.parse(options.body);
      if (rows.has(row.id)) return Response.json([]);
      rows.set(row.id, row);
      return Response.json([{ id: row.id }], { status: 201 });
    }
    if (options.method === "PATCH") {
      if (patchWithoutRecord || !rows.has(id)) return Response.json([]);
      Object.assign(rows.get(id), JSON.parse(options.body));
      return Response.json([{ id }]);
    }
    return Response.json(id ? (rows.has(id) ? [{ id }] : []) : [...rows.values()]);
  });
  return {
    rows,
    fail() { unavailable = true; },
    dropPatchMatch() { patchWithoutRecord = true; }
  };
}

test("diagnostic validates inputs and produces consistent results with no provider calls", async (t) => {
  t.mock.method(globalThis, "fetch", () => { assert.fail("diagnostic should never call a provider"); });
  for (const body of [{ ...input, foodCost: "" }, { ...input, grossProfit: "80" }, { ...input, menuItems: "1.5" }, { ...input, rating: "6" }]) {
    assert.equal((await call(diagnose, "POST", body)).status, 422);
  }
  assert.equal((await call(diagnose, "POST", "[]")).status, 400);
  assert.equal((await call(diagnose, "POST", "{")).status, 400);
  const first = await call(diagnose, "POST", input);
  const second = await call(diagnose, "POST", { ...input, ownerName: "Test Owner", phone: "+12025550123" });
  assert.equal(first.status, 200);
  assert.deepEqual(first.body, second.body);
  assert.match(first.body.diagnosis.firstIntervention, /top five sellers/);
  assert.equal(first.body.diagnosis.dimensions.onlineReputation, null);
  assert.equal(first.body.diagnosis.dimensions.menu, null);
  assert.doesNotMatch(first.value, /\/month|\bINR\b|Test Owner/);
  const zeroRating = await call(diagnose, "POST", { ...input, rating: "0", grossProfit: "-1" });
  assert.equal(zeroRating.status, 200);
  assert.equal(zeroRating.body.diagnosis.dimensions.onlineReputation, 0);
});

test("only an explicit enquiry is stored, repeated requests deduplicate and CX confirms a matched record", async (t) => {
  const db = storage(t);
  const body = { input, contact, submissionKey: randomUUID(), diagnosis: { score: 100 } };
  assert.equal((await call(leads, "POST", { ...body, contact: { ...contact, consent: "" } })).status, 422);
  assert.equal(db.rows.size, 0);
  const [first, retry] = await Promise.all([call(leads, "POST", body), call(leads, "POST", body)]);
  assert.deepEqual([first.status, retry.status].sort(), [200, 201]);
  assert.deepEqual(first.body, retry.body);
  assert.equal(db.rows.size, 1);
  const row = db.rows.get(first.body.id);
  assert.equal(row.email, contact.email);
  assert.equal(row.input_data.email, undefined);
  assert.notEqual(row.score, 100);
  assert.equal(row.rating, null);
  const cx = { id: row.id, updateToken: first.body.updateToken, cx: { greeting: "Warm" } };
  assert.equal((await call(leads, "PATCH", { ...cx, updateToken: "wrong" })).status, 403);
  assert.equal((await call(leads, "PATCH", cx)).status, 200);
  assert.equal(row.cx_data.greeting, "Warm");
  db.dropPatchMatch();
  assert.equal((await call(leads, "PATCH", cx)).status, 404);
  db.fail();
  assert.equal((await call(leads, "POST", body)).status, 503);
  assert.equal((await call(leads, "PATCH", cx)).status, 503);
});

test("both admin endpoints deny unauthenticated requests before storage access", async (t) => {
  const db = storage(t);
  const authorization = "Basic " + Buffer.from("synthetic-admin:" + secret).toString("base64");
  for (const handler of [admin, adminLeads]) {
    const denied = await call(handler, "GET");
    assert.equal(denied.status, 401);
    assert.match(denied.headers["cache-control"], /no-store/);
  }
  const stored = await call(leads, "POST", { input, contact, submissionKey: randomUUID() });
  assert.equal(db.rows.size, 1);
  assert.equal((await call(adminLeads, "GET", null, "Basic " + Buffer.from("invalid").toString("base64"))).status, 401);
  const html = await call(admin, "GET", null, authorization);
  assert.equal(html.status, 200);
  assert.match(html.value, /\/assets\/dashboard\.js/);
  assert.doesNotMatch(html.value, /supabase\.co|synthetic-admin-password/);
  const data = await call(adminLeads, "GET", null, authorization);
  assert.equal(data.status, 200);
  assert.equal(data.body.leads[0].id, stored.body.id);
});

test("browser cross-site writes are denied and admin requests are rate limited", async (t) => {
  t.mock.method(globalThis, "fetch", () => { assert.fail("denied requests must never reach storage"); });
  const foreignSite = { "sec-fetch-site": "cross-site" };
  assert.equal((await call(diagnose, "POST", input, null, foreignSite)).status, 403);
  assert.equal((await call(leads, "POST", { input, contact }, null, foreignSite)).status, 403);
  assert.equal((await call(leads, "PATCH", {}, null, foreignSite)).status, 403);

  const ip = "198.51.100.25";
  for (let attempt = 0; attempt < 20; attempt++) {
    const spoofed = { "x-forwarded-for": `192.0.2.${attempt + 1}` };
    assert.equal((await call(admin, "GET", null, null, spoofed, ip)).status, 401);
  }
  const limited = await call(adminLeads, "GET", null, null, {}, ip);
  assert.equal(limited.status, 429);
  assert.equal(limited.headers["retry-after"], "60");
});

test("Supabase server credentials stay in the supported headers and are never forwarded on redirects", async (t) => {
  const { request } = require("../lib/supabase");
  process.env.SUPABASE_SECRET_KEY = "sb_secret_synthetic";
  t.after(() => { delete process.env.SUPABASE_SECRET_KEY; });
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    assert.equal(options.headers.apikey, "sb_secret_synthetic");
    assert.equal(options.headers.Authorization, undefined);
    assert.equal(options.redirect, "error");
    return Response.json([]);
  });
  assert.deepEqual(await request("leads?select=id"), []);
});
