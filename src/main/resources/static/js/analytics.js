import {apiFetch} from "./jwtFetch.js";

let peakHoursChart, ordersPerWaiterChart, popularCategoriesChart;

async function renderAnalyticsCharts() {
    try {
        const res = await apiFetch("http://localhost:8083/api/v1/analytics/peak-hours");
        if (!res.ok) throw new Error("Failed to fetch orders data");
        const rows = await res.json();
        // Expected format: [{ order_day: "2025-08-15", orders_count: 12 }, ...]

        // Map to labels (Mon, Tue, ...) and counts
        const labels = rows.map(r =>
            new Date(r.orderDay).toLocaleDateString(undefined, { weekday: "short" })
        );
        const data = rows.map(r => r.orderCount);

        peakHoursChart = new Chart(document.getElementById("peakHoursChart"), {
            type: "bar",
            data: {
                labels,
                datasets: [{
                    label: "Orders per Day",
                    data,
                    backgroundColor: "#319795"
                }]
            },
            options: { responsive: true, scales: { y: { beginAtZero: true } } }
        });
    } catch (err) {
        console.error("Error loading peak hours chart:", err);
    }

    try {
        const res = await apiFetch("http://localhost:8083/api/v1/analytics/orders-per-waiter");
        if (!res.ok) throw new Error("Failed to fetch orders per waiter data");

        // Expected format: [{ waiterName: "Jane", ordersCount: 120 }, ...]
        const rows = await res.json();

        // Map to labels (waiter names) and counts
        const labels = rows.map(r => r.name);
        const data = rows.map(r => r.ordersCount);

        ordersPerWaiterChart = new Chart(document.getElementById("ordersPerWaiterChart"), {
            type: "bar",
            data: {
                labels,
                datasets: [{
                    label: "Orders Served",
                    data,
                    backgroundColor: "#319795"
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    } catch (err) {
        console.error("Error loading orders per waiter chart:", err);
    }


    try {
        const res = await apiFetch("http://localhost:8083/api/v1/analytics/popular-categories");
        if (!res.ok) throw new Error("Failed to fetch popular categories data");

        // Expected format: [{ categoryName: "Burgers", ordersCount: 45 }, ...]
        const rows = await res.json();

        // Map to labels (category names) and counts
        const labels = rows.map(r => r.categoryName);
        const data = rows.map(r => r.ordersCount);

        popularCategoriesChart = new Chart(document.getElementById("popularCategoriesChart"), {
            type: "pie",
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: ["#319795", "#81e6d9", "#2a5491", "#275d8a", "#04332a"]
                }]
            },
            options: {
                plugins: {
                    legend: {
                        display: true,
                        position: "bottom",
                        labels: { font: { size: 14 }, boxWidth: 20, padding: 15 }
                    }
                },
                layout: { padding: { bottom: 20 } },
                maintainAspectRatio: false
            }
        });
    } catch (err) {
        console.error("Error loading popular categories chart:", err);
    }


    setTimeout(() => {
        if (peakHoursChart) peakHoursChart.resize();
        ordersPerWaiterChart.resize();
        popularCategoriesChart.resize();
    }, 250);
}

let analyticsChartsRendered = false;
function onAnalyticsTabClick() {
    if (analyticsChartsRendered) return;
    analyticsChartsRendered = true;

    const analyticsSection = document.querySelector("#analytics");
    if (!analyticsSection) return;

    const analyticsCards = analyticsSection.querySelectorAll(".analytics-card");

    function showSpinners() {
        analyticsCards.forEach(card => {
            const canvas = card.querySelector("canvas");
            let spinner = card.querySelector(".loading-spinner");
            if (!spinner) {
                spinner = document.createElement("div");
                spinner.classList.add("loading-spinner");
                spinner.innerHTML = `<div class="spinner"></div>`;
                card.appendChild(spinner);
            }
            if (canvas) canvas.style.display = "none";
        });
    }

    function hideSpinners() {
        analyticsCards.forEach(card => {
            const spinner = card.querySelector(".loading-spinner");
            const canvas = card.querySelector("canvas");
            if (spinner) card.removeChild(spinner);
            if (canvas) canvas.style.display = "block";
        });
    }

    showSpinners();

    // Wait for charts to load, then hide spinners
    setTimeout(async () => {
        hideSpinners();
        await renderAnalyticsCharts();
    }, 800);
}

document.addEventListener("DOMContentLoaded", () => {
    let analyticsChartsLoaded = false;

    const analyticsBtn = document.querySelector('.nav-btn[data-section="analytics"]');
    if (analyticsBtn) {
        analyticsBtn.addEventListener("click", () => {
            if (!analyticsChartsLoaded) {
                onAnalyticsTabClick();
                analyticsChartsLoaded = true; // prevent re-rendering
            }
        });
    }
});
