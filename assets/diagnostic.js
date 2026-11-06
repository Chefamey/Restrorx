const byId = (id) => document.getElementById(id);
const diagnosisButton = byId("submitBtn");
const enquiryForm = byId("enquiryForm");
const openEnquiry = byId("openEnquiry");
const cxPanel = byId("cxPanel");
const unlockCx = byId("unlockCx");
let currentResult = null;
let savedEnquiry = null;

const countrySelect = document.getElementById("country");
const marketBadge = document.getElementById("marketBadge");
function detectMarket() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  const market = countrySelect.value !== "auto" ? countrySelect.value : tz.includes("Asia/Calcutta") || tz.includes("Asia/Kolkata") ? "India" : "USA";
  marketBadge.textContent = market === "India" ? "India | INR | Zomato + Google" : "USA | USD | Yelp + Google";
  return market;
}
countrySelect.addEventListener("change", detectMarket);
detectMarket();

function formToObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function list(el, items) {
  el.replaceChildren();
  (items || []).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    el.appendChild(li);
  });
}

function renderBars(dimensions) {
  const labels = {
    financial: "Financial",
    menu: "Menu",
    customerExperience: "CX",
    team: "Team",
    operations: "Operations",
    onlineReputation: "Online"
  };
  const bars = document.getElementById("bars");
  bars.replaceChildren();
  Object.entries(labels).forEach(([key, label]) => {
    const value = dimensions[key];
    const row = document.createElement("div");
    row.className = "barLine";
    const name = document.createElement("span");
    const track = document.createElement("div");
    const fill = document.createElement("div");
    const number = document.createElement("strong");
    name.textContent = label;
    track.className = "track";
    fill.className = "fill";
    fill.style.width = `${value ?? 0}%`;
    number.textContent = value ?? "—";
    track.appendChild(fill);
    row.append(name, track, number);
    bars.appendChild(row);
  });
}

function renderRisks(diagnosis) {
  const risks = [
    ["Menu Complexity", diagnosis.menuComplexityRisk ?? "Needs input"],
    ["Team Dependence", diagnosis.teamDependenceRisk],
    ["Screening Status", diagnosis.status]
  ];
  const grid = byId("riskGrid");
  grid.replaceChildren();
  for (const [label, value] of risks) {
    const box = document.createElement("div");
    const name = document.createElement("span");
    const result = document.createElement("strong");
    box.className = "riskBox";
    name.textContent = label;
    result.textContent = value;
    box.append(name, result);
    grid.appendChild(box);
  }
}

function renderDiagnosis(diagnosis) {
  document.getElementById("emptyState").classList.add("hidden");
  document.getElementById("result").classList.remove("hidden");
  document.getElementById("score").textContent = diagnosis.score || "--";
  document.getElementById("status").textContent = diagnosis.status || "Watch Zone";
  document.getElementById("summary").textContent = diagnosis.summary || "";
  document.getElementById("chefNote").textContent = diagnosis.chefNote || "";
  document.getElementById("firstIntervention").textContent = diagnosis.firstIntervention || "";
  list(document.getElementById("findings"), diagnosis.findings);
  list(document.getElementById("actions"), diagnosis.actions);
  list(document.getElementById("plan"), diagnosis.plan);
  renderBars(diagnosis.dimensions);
  renderRisks(diagnosis);
}

function showMessage(id, message) {
  const element = byId(id);
  element.textContent = message;
  element.classList.toggle("hidden", !message);
}

async function submitJson(url, method, payload, errorMessage) {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(data.error || errorMessage);
  return data;
}

byId("diagnosisForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  currentResult = null;
  savedEnquiry = null;
  enquiryForm.reset();
  byId("cxForm").reset();
  for (const id of ["result", "enquiryForm", "saveStatus", "cxPanel", "unlockCx"]) byId(id).classList.add("hidden");
  for (const id of ["diagnosisError", "enquiryError", "cxStatus"]) showMessage(id, "");
  byId("emptyState").classList.remove("hidden");
  openEnquiry.classList.remove("hidden");
  const { country, ...input } = formToObject(event.currentTarget);
  input.market = detectMarket();
  diagnosisButton.disabled = true;
  diagnosisButton.textContent = "Diagnosing…";
  try {
    const data = await submitJson("/api/diagnose", "POST", input, "The diagnostic could not run.");
    if (!data.diagnosis) throw new Error("The diagnostic could not run.");
    currentResult = { input, submissionKey: crypto.randomUUID() };
    renderDiagnosis(data.diagnosis);
    byId("result").focus({ preventScroll: true });
    byId("result").scrollIntoView({ block: "start" });
  } catch (error) {
    showMessage("diagnosisError", error instanceof TypeError ? "Connection interrupted. Please try again." : error.message);
  } finally {
    diagnosisButton.disabled = false;
    diagnosisButton.textContent = "Run Restaurant MRI";
  }
});

openEnquiry.addEventListener("click", () => {
  enquiryForm.classList.remove("hidden");
  byId("ownerName").focus();
});

enquiryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentResult || savedEnquiry) return;
  const button = byId("enquiryBtn");
  const contact = formToObject(enquiryForm);
  button.disabled = true;
  diagnosisButton.disabled = true;
  showMessage("enquiryError", "");
  button.textContent = "Sending…";
  try {
    const data = await submitJson("/api/leads", "POST", { ...currentResult, contact }, "The enquiry could not be saved.");
    if (!data.id || !data.updateToken) throw new Error("The enquiry could not be confirmed. Please retry.");
    savedEnquiry = { id: data.id, updateToken: data.updateToken };
    enquiryForm.classList.add("hidden");
    openEnquiry.classList.add("hidden");
    byId("saveStatus").classList.remove("hidden");
    unlockCx.classList.remove("hidden");
  } catch (error) {
    showMessage("enquiryError", error instanceof TypeError ? "Connection interrupted. Please retry to confirm your enquiry." : error.message);
  } finally {
    button.disabled = false;
    diagnosisButton.disabled = false;
    button.textContent = "Send Enquiry";
  }
});

unlockCx.addEventListener("click", () => {
  cxPanel.classList.remove("hidden");
  cxPanel.scrollIntoView({ behavior: "smooth" });
});

byId("cxForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!savedEnquiry) return;
  const button = byId("cxBtn");
  const cx = formToObject(event.currentTarget);
  button.disabled = true;
  diagnosisButton.disabled = true;
  showMessage("cxStatus", "");
  button.textContent = "Saving…";
  try {
    await submitJson("/api/leads", "PATCH", { ...savedEnquiry, cx }, "The audit could not be saved.");
    showMessage("cxStatus", "Customer journey audit saved.");
  } catch (error) {
    showMessage("cxStatus", error instanceof TypeError ? "Connection interrupted. Please retry to confirm your audit." : error.message);
  } finally {
    button.disabled = false;
    diagnosisButton.disabled = false;
    button.textContent = "Save CX Audit";
  }
});
