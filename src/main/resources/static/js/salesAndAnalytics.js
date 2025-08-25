// chart-controller.js
import { apiFetch } from "./jwtFetch.js";

let salesChartInstance = null;
let rawDailyValues = [];
let rawDailyLabels = [];   // extracted date strings
let rawDailyNumbers = [];  // extracted numeric values


// ---------------------- Config: endpoints ----------------------
const ENDPOINTS = {
    salesDaily: "http://localhost:8083/api/v1/sales_analytics/sales-chart",
    revenue: "http://localhost:8083/api/v1/sales_analytics/revenue",
    mostLeast: "http://localhost:8083/api/v1/sales_analytics/most_least",
    avgOrderValue: "http://localhost:8083/api/v1/sales_analytics/avg"
};

// ---------------------- Date helpers ----------------------
function getLastWeekRange() {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 7);
    return { start: formatDate(start), end: formatDate(end) };
}

function formatDate(d) {
    // ISO without timezone, to seconds precision: yyyy-MM-ddTHH:mm:ss
    return d.toISOString().slice(0, 19);
}

function withRange(url, { start, end }) {
    const qs = new URLSearchParams({ start, end }).toString();
    return `${url}?${qs}`;
}

// Helper just for sales chart to keep withRange generic elsewhere
function withRangeAndGrouping(url, rangeObj) {
    const urlWithRange = withRange(url, rangeObj);
    const grouping = decideGrouping(rangeObj);
    return `${urlWithRange}&grouping=${encodeURIComponent(grouping)}`;
}

function parseDateInput(id) {
    const val = document.getElementById(id)?.value;
    if (!val) return null;
    return new Date(val);
}

function getSelectedRangeOrDefault() {
    const startDate = parseDateInput("salesStartDate");
    const endDate = parseDateInput("salesEndDate");

    if (!startDate || !endDate) {
        return { ...getLastWeekRange(), picked: false };
    }
    return { start: formatDate(startDate), end: formatDate(endDate), picked: true };
}

function daysBetween(start, end) {
    const ms = new Date(end) - new Date(start);
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

// ---------------------- Chart rendering ----------------------
async function initSalesChart(rangeObj) {
    const salesSpinner = document.querySelector("#salesSpinner");
    const salesChartCanvas = document.querySelector("#salesChart");
    if (!salesChartCanvas) return;

    salesSpinner?.classList.remove("hidden");
    salesChartCanvas.style.display = "none";

    try {
        // Append grouping only for this endpoint (keep withRange generic)
        const res = await apiFetch(withRangeAndGrouping(ENDPOINTS.salesDaily, rangeObj));
        if (!res.ok) throw new Error(`Backend error: ${res.status}`);
        rawDailyValues = await res.json();
        const periods = rawDailyValues.map(item => item.period);
        const values = rawDailyValues.map(item => item.value);
        rawDailyLabels = periods;
        rawDailyNumbers = values;
        const grouping = decideGrouping(rangeObj);
        updateChartGranularity(grouping);
    } catch (err) {
        console.error("Error loading sales chart:", err);
    } finally {
        salesSpinner?.classList.add("hidden");
        salesChartCanvas.style.display = "block";
    }
}

function decideGrouping(rangeObj) {
    if (!rangeObj.picked) return "daily";
    const diffDays = daysBetween(rangeObj.start, rangeObj.end);
    if (diffDays <= 7) return "daily";
    if (diffDays <= 31) return "weekly";
    return "monthly";
}

function renderSalesChart(values, labels) {
    const ctx = document.querySelector("#salesChart")?.getContext("2d");
    if (!ctx) return;

    if (salesChartInstance) {
        try { salesChartInstance.destroy(); } catch {}
    }

    salesChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Revenue ($)",
                data: values,
                backgroundColor: "#319795"
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } }
        }
    });
}

// ---------------------- Grouping helpers ----------------------
function groupData(values, size) {
    if (size <= 1) return values.slice();
    const result = [];
    for (let i = 0; i < values.length; i += size) {
        const chunk = values.slice(i, i + size);
        result.push(chunk.reduce((sum, v) => sum + v, 0));
    }
    return result;
}


function generateWeeklyLabels(totalDays) {
    const weeks = Math.ceil(totalDays / 7);
    return Array.from({ length: weeks }, (_, i) => `Week ${i + 1}`);
}

function generateMonthlyLabels(totalDays) {
    const months = Math.ceil(totalDays / 30);
    return Array.from({ length: months }, (_, i) => `Month ${i + 1}`);
}

// ---------------------- Update chart granularity ----------------------
function updateChartGranularity(type) {
    let labels, grouped;

    switch (type) {
        case "daily":
            grouped = groupData(rawDailyNumbers, 1);
            labels = rawDailyLabels; // use actual dates
            break;
        case "weekly":
            grouped = groupData(rawDailyNumbers, 7);
            labels = generateWeeklyLabels(rawDailyNumbers.length);
            break;
        case "monthly":
            grouped = groupData(rawDailyNumbers, 30);
            labels = generateMonthlyLabels(rawDailyNumbers.length);
            break;
        default:
            grouped = groupData(rawDailyNumbers, 1);
            labels = rawDailyLabels;
    }
    renderSalesChart(grouped, labels);
}

// ---------------------- Summary cards ----------------------
function setCardValue(metric, value) {
    let strongEl = document.querySelector(`#orders-sales #sales .card[data-metric="${metric}"] strong`);
    if (!strongEl) {
        const cards = document.querySelectorAll('#orders-sales #sales .card-grid .card strong');
        const indexByMetric = { revenue: 0, most: 1, least: 2, aov: 3 };
        strongEl = cards[indexByMetric[metric]];
    }
    if (strongEl) strongEl.textContent = value;
}

function formatCurrency(n) {
    const num = Number(n ?? 0);
    return num.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

async function loadSummaryCards(rangeObj) {
    try {
        const [revenueRes, mostLeastRes, aovRes] = await Promise.all([
            apiFetch(withRange(ENDPOINTS.revenue, rangeObj)),
            apiFetch(withRange(ENDPOINTS.mostLeast, rangeObj)),
            apiFetch(withRange(ENDPOINTS.avgOrderValue, rangeObj))
        ]);

        if (!revenueRes.ok) throw new Error(`Revenue error: ${revenueRes.status}`);
        if (!mostLeastRes.ok) throw new Error(`Most/Least error: ${mostLeastRes.status}`);
        if (!aovRes.ok) throw new Error(`AOV error: ${aovRes.status}`);

        const [revenue, mostLeast, avgOrderValue] = await Promise.all([
            revenueRes.json(),
            mostLeastRes.json(),
            aovRes.json()
        ]);

        setCardValue("revenue", formatCurrency(revenue));
        setCardValue("most", mostLeast?.mostOrdered ?? "—");
        setCardValue("least", mostLeast?.leastOrdered ?? "—");
        setCardValue("aov", formatCurrency(avgOrderValue));
    } catch (err) {
        console.error("Error loading summary cards:", err);
    }
}

// ---------------------- Init ----------------------
document.addEventListener("DOMContentLoaded", () => {
    let salesDataLoaded = false;

    const salesTabBtn = document.querySelector('#orders-sales .tab-btn[data-tab="sales"]');
    if (salesTabBtn) {
        salesTabBtn.addEventListener("click", () => {
            if (!salesDataLoaded) {
                const rangeObj = getSelectedRangeOrDefault();
                loadSummaryCards(rangeObj);
                initSalesChart(rangeObj);
                salesDataLoaded = true;
            }
        });
    }

    document.getElementById("applySalesFilter")?.addEventListener("click", () => {
        const rangeObj = getSelectedRangeOrDefault();
        loadSummaryCards(rangeObj);
        initSalesChart(rangeObj);
    });
});


