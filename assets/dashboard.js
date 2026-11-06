let leads = [];

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}

function filteredLeads() {
  const country = document.getElementById("countryFilter").value;
  const status = document.getElementById("statusFilter").value;
  return leads.filter((lead) => (!country || lead.country === country) && (!status || lead.status === status));
}

async function loadLeads() {
  const notice = document.getElementById("notice");
  notice.textContent = "Loading secure lead data…";
  try {
    const response = await fetch("/api/admin-leads", { headers: { Accept: "application/json" }, cache: "no-store" });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || "Unable to load leads.");
    leads = data.leads || [];
    notice.textContent = leads.length === 200 ? "Showing the latest 200 enquiries." : `${leads.length} enquir${leads.length === 1 ? "y" : "ies"} loaded.`;
    document.getElementById("exportBtn").disabled = !leads.length;
    renderRows();
  } catch (error) {
    leads = [];
    renderRows();
    document.getElementById("detail").classList.add("hidden");
    document.getElementById("exportBtn").disabled = true;
    notice.textContent = error.message;
  }
}

function renderRows() {
  const tbody = document.getElementById("rows");
  tbody.innerHTML = "";
  filteredLeads().forEach((lead) => {
    const msg = encodeURIComponent(`Hi, this is Chef Amey. I reviewed your RestroRx diagnosis for ${lead.restaurant_name}. Your score is ${lead.score}. Let's discuss your revival plan.`);
    const phone = String(lead.phone || "").replace(/\D/g, "");
    const email = String(lead.email || "");
    const links = [
      phone && `<a target="_blank" rel="noreferrer" href="https://wa.me/${phone}?text=${msg}">WhatsApp</a>`,
      email && `<a href="mailto:${encodeURIComponent(email).replace("%40", "@")}">Email</a>`
    ].filter(Boolean);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${esc(new Date(lead.created_at).toLocaleString())}</td>
      <td><strong>${esc(lead.owner_name)}</strong><br><span class="muted">${esc(lead.phone)}<br>${esc(lead.email)}</span></td>
      <td><strong>${esc(lead.restaurant_name)}</strong><br><span class="muted">${esc(lead.location)} | ${esc(lead.country)}</span></td>
      <td><span class="pill">${esc(lead.score)} / ${esc(lead.status)}</span></td>
      <td>Revenue: ${esc(lead.monthly_revenue)}<br>FC: ${esc(lead.food_cost)}%<br>GP: ${esc(lead.gross_profit)}%</td>
      <td><button class="viewBtn" data-id="${esc(lead.id)}">View</button>${links.length ? "<br><br>" + links.join(" · ") : ""}</td>`;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll(".viewBtn").forEach((button) => button.addEventListener("click", () => showDetail(leads.find((lead) => lead.id === button.dataset.id))));
}

function showDetail(lead) {
  if (!lead) return;
  const detail = document.getElementById("detail");
  detail.classList.remove("hidden");
  detail.innerHTML = `<h2>${esc(lead.restaurant_name)}</h2><p class="muted">${esc(lead.owner_name)} | ${esc(lead.location)} | Score ${esc(lead.score)}</p><h3>Diagnosis</h3><pre>${esc(JSON.stringify(lead.diagnosis, null, 2))}</pre><h3>Input Data</h3><pre>${esc(JSON.stringify(lead.input_data, null, 2))}</pre><h3>CX Data</h3><pre>${esc(JSON.stringify(lead.cx_data || {}, null, 2))}</pre>`;
  detail.scrollIntoView({ behavior:"smooth" });
}

function exportCsv() {
  const headers = ["created_at","owner_name","phone","email","restaurant_name","location","country","score","status","monthly_revenue","food_cost","gross_profit"];
  const lines = [headers.join(",")].concat(filteredLeads().map((lead) => headers.map((header) => {
    const value = lead[header] ?? "";
    const cell = typeof value === "string" && /^[\s]*[=+@-]/.test(value) ? "'" + value : String(value);
    return `"${cell.replace(/"/g, '""')}"`;
  }).join(",")));
  const url = URL.createObjectURL(new Blob([lines.join("\n")], { type:"text/csv" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "restrorx-leads.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

document.getElementById("refreshBtn").addEventListener("click", loadLeads);
document.getElementById("countryFilter").addEventListener("change", renderRows);
document.getElementById("statusFilter").addEventListener("change", renderRows);
document.getElementById("exportBtn").addEventListener("click", exportCsv);
loadLeads();
