const STORAGE_KEY = "work-hours-simple-v1";
let entries = [];

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  entries = raw ? JSON.parse(raw) : [];
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function toMinutes(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

function formatHours(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}:${m.toString().padStart(2, "0")}`;
}

function diffWithOvernight(startTime, endTime) {
  const startMins = toMinutes(startTime);
  const endMins = toMinutes(endTime);
  return endMins < startMins ? (24 * 60 - startMins) + endMins : endMins - startMins;
}

function renderEntries() {
  const tbody = document.getElementById("entries-body");
  tbody.innerHTML = "";
  document.getElementById("entries-count").textContent = entries.length;

  entries
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((e, index) => {
      const workMinutes = diffWithOvernight(e.start, e.end) - (e.breakMinutes || 0);
      const totalMinutes = Math.max(workMinutes, 0);

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${new Date(e.date).toLocaleDateString('pl-PL')}</td>
        <td>${e.start}</td>
        <td>${e.end}</td>
        <td>${e.breakTime || '00:00'}</td>
        <td>${formatHours(totalMinutes)}</td>
        <td><button class="delete-btn" data-index="${index}">Usuń</button></td>
      `;
      tbody.appendChild(tr);
    });

  tbody.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const idx = Number(e.target.dataset.index);
      entries.splice(idx, 1);
      saveData();
      updateUI();
    });
  });
}

function computeTotals() {
  const today = new Date();
  let todayMins = 0, weekMins = 0, allMins = 0;

  entries.forEach((e) => {
    const workMinutes = diffWithOvernight(e.start, e.end) - (e.breakMinutes || 0);
    const mins = Math.max(workMinutes, 0);

    allMins += mins;

    const entryDate = new Date(e.date);
    if (entryDate.toDateString() === today.toDateString()) {
      todayMins += mins;
    }
    if (getWeekNumber(entryDate) === getWeekNumber(today)) {
      weekMins += mins;
    }
  });

  return { todayMins, weekMins, allMins };
}

function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
}

function renderTotals() {
  const { todayMins, weekMins, allMins } = computeTotals();
  
  document.getElementById("today-total").textContent = formatHours(todayMins);
  document.getElementById("week-total").textContent = formatHours(weekMins);
  document.getElementById("all-total").textContent = formatHours(allMins);
}

function updateUI() {
  renderEntries();
  renderTotals();
}

function initForm() {
  const form = document.getElementById("work-form");
  
  const todayStr = new Date().toISOString().slice(0, 10);
  document.getElementById("date").value = todayStr;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    
    const date = document.getElementById("date").value;
    const start = document.getElementById("start").value || "00:00";
    const end = document.getElementById("end").value || "00:00";
    const breakValue = document.getElementById("break").value || "00:00";
    const breakMinutes = toMinutes(breakValue);
    
    if (!date || !start || !end) return;

    entries.push({
      date,
      start,
      end,
      breakMinutes,
      breakTime: breakValue
    });
    
    saveData();
    updateUI();
    form.reset();
    document.getElementById("date").value = todayStr;
    document.getElementById("start").value = "00:00";
    document.getElementById("end").value = "00:00";
    document.getElementById("break").value = "00:00";
  });
}

document.getElementById("export-btn").addEventListener("click", () => {
  if (entries.length === 0) {
    alert("Brak wpisów do eksportowania!");
    return;
  }

  const script = document.createElement("script");
  script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
  
  script.onload = () => {
    const element = document.createElement("div");
    element.style.padding = "20px";
    element.style.fontFamily = "Arial, sans-serif";
    element.style.fontSize = "12px";
    
    const header = document.createElement("h1");
    header.textContent = "Raport godzin pracy";
    header.style.marginBottom = "10px";
    header.style.fontSize = "18px";
    header.style.borderBottom = "2px solid #1e40af";
    header.style.paddingBottom = "10px";
    element.appendChild(header);

    const dateInfo = document.createElement("p");
    dateInfo.textContent = `Data wygenerowania: ${new Date().toLocaleDateString('pl-PL')}`;
    dateInfo.style.marginBottom = "20px";
    dateInfo.style.color = "#666";
    element.appendChild(dateInfo);

    const summary = document.createElement("div");
    summary.style.marginBottom = "20px";
    summary.style.padding = "15px";
    summary.style.backgroundColor = "#f0f4f8";
    summary.style.borderRadius = "8px";
    
    const { todayMins, weekMins, allMins } = computeTotals();
    const summaryHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; text-align: center;">
        <div><strong>Dzisiaj:</strong><br>${formatHours(todayMins)}</div>
        <div><strong>Ten tydzień:</strong><br>${formatHours(weekMins)}</div>
        <div><strong>Łącznie:</strong><br>${formatHours(allMins)}</div>
      </div>
    `;
    summary.innerHTML = summaryHTML;
    element.appendChild(summary);

    const table = document.createElement("table");
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";
    table.style.marginTop = "20px";

    const thead = document.createElement("thead");
    thead.innerHTML = `
      <tr style="background
