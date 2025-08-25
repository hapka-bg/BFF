// === Mock data for testing ===
import {apiFetch} from "./jwtFetch.js";

// === Utility: Render stars ===
function renderStars(rating) {
    let s = "";
    for (let i = 1; i <= 5; i++) s += i <= rating ? "★" : "☆";
    return `<span class="review-stars">${s}</span>`;
}

// === Render review cards ===
function renderReviewCards(data) {
    const container = document.getElementById('onlineReviewsList');
    container.innerHTML = '';

    if (!data || data.length === 0) {
        container.innerHTML = `<p>No reviews match your filters.</p>`;
        return;
    }

    data.forEach(r => {
        const card = document.createElement('div');
        card.className = 'review-card';
        card.innerHTML = `
            <div class="review-section">
                <span class="review-label">Quality:</span> ${renderStars(r.qualityReview)}
            </div>
            <div class="review-section">
                <span class="review-label">Delivery:</span> ${renderStars(r.deliveryReview)}
            </div>
            <div class="review-section">
                <span class="review-label">Time Period:</span> ${r.timePeriod}
            </div>
            <div class="review-section">
                <span class="review-label">Comment:</span>
                <span class="review-comment">${r.comment || "No comment left."}</span>
            </div>
        `;
        container.appendChild(card);
    });
}

// === Load reviews from API (last month) ===
async function loadOnlineOrderReviews() {
    const container = document.getElementById("onlineReviewsList");
    container.innerHTML = `<p>Loading reviews...</p>`;

    const today = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(today.getMonth() - 1);

    const fromDate = `${lastMonth.toISOString().split('T')[0]}T00:00:00`;
    const toDate = `${today.toISOString().split('T')[0]}T23:59:59`;


    try {
        const res = await apiFetch(
            `http://localhost:8083/api/v1/orders/reviews?from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

        const data = await res.json();
        renderReviewCards(data);
    } catch (err) {
        console.error("Failed to fetch reviews:", err);
        container.innerHTML = `<p>Failed to load reviews. Please try again later.</p>`;
    }
}

// === Apply review filters ===
function applyReviewFilters() {
    const startInput = document.getElementById('reviewStartDate').value;
    const endInput = document.getElementById('reviewEndDate').value;
    const minQ = parseInt(document.getElementById('minQuality').value);
    const minD = parseInt(document.getElementById('minDelivery').value);

    if ((startInput && endInput) && new Date(startInput) > new Date(endInput)) {
        alert('Please select a valid date range.');
        return;
    }

    let filtered = mockOnlineReviews.slice();

    if (startInput) {
        filtered = filtered.filter(r => new Date(r.reviewDate) >= new Date(startInput));
    }
    if (endInput) {
        const end = new Date(endInput);
        end.setHours(23, 59, 59, 999);
        filtered = filtered.filter(r => new Date(r.reviewDate) <= end);
    }
    if (!isNaN(minQ)) {
        filtered = filtered.filter(r => r.quality >= minQ);
    }
    if (!isNaN(minD)) {
        filtered = filtered.filter(r => r.delivery >= minD);
    }

    renderReviewCards(filtered);
}

// === Load ongoing orders ===
async function loadOngoingOrders() {
    const tbody = document.getElementById('ongoingOrdersTableBody');
    const msg = document.getElementById('noOngoingOrdersMessage');
    const table = document.querySelector('#ongoing-orders .table-container');

    tbody.innerHTML = '';
    msg.style.display = 'none';
    table.style.display = '';

    tbody.innerHTML = `<tr><td colspan="6">Loading ongoing orders...</td></tr>`;

    try {
        const res = await apiFetch('http://localhost:8083/api/v1/orders/ongoing');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const orders = await res.json();

        const ongoing = orders.filter(o =>
            ['PLACED', 'SHIPPED', 'PREPARING'].includes(o.status?.toUpperCase())
        );


        tbody.innerHTML = '';

        if (ongoing.length === 0) {
            table.style.display = 'none';
            msg.style.display = 'block';
            msg.innerHTML = `<p>No ongoing orders right now.</p><p>👍 All caught up!</p>`;
            return;
        }

        ongoing.forEach(o => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="order-id">${o.orderId}</td>
                <td>${o.name}</td>
                <td>${o.timePlaced}</td>
                <td>${o.total}</td>
                <td>${o.status}</td>
                <td>
                    <button class="btn small view-btn" 
                            data-id="${o.orderId}" 
                            data-user-id="${o.userId}">
                        View
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error('Failed to load ongoing orders:', err);
        tbody.innerHTML = `<tr><td colspan="6">Error loading orders. Please try again later.</td></tr>`;
    }
}

function formatDeliveredAt(order) {
    // If there's a delivery timestamp, format and return it
    if (order.deliveredAt) {
        const date = new Date(order.deliveredAt);
        return date.toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    // Otherwise, fall back to status-based messages
    if (order.status === "CANCELED") {
        return "Not delivered (Canceled)";
    }
    if (order.status === "SHIPPED" || order.status === "PLACED") {
        return "Pending delivery";
    }
    return "—";
}

// === Filter orders by period ===
async function filterOnlineOrdersByPeriod() {
    const startDate = document.getElementById("orderStartDate").value;
    const endDate = document.getElementById("orderEndDate").value;
    const tbody = document.getElementById("ordersPeriodTableBody");
    tbody.innerHTML = "";

    if (!startDate || !endDate || new Date(startDate) > new Date(endDate)) {
        tbody.innerHTML = `<tr><td colspan="5">Please select a valid start and end date.</td></tr>`;
        return;
    }

    tbody.innerHTML = `<tr><td colspan="5">Loading orders...</td></tr>`;

    const start = `${startDate}T00:00:00`;
    const end = `${endDate}T23:59:59`;
    try {
        const res = await apiFetch(`http://localhost:8083/api/v1/orders/period?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const orders = await res.json();
        tbody.innerHTML = "";

        if (orders.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5">No orders found in this period.</td></tr>`;
            return;
        }

        orders.forEach(o => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${o.orderId}</td>
                <td>${o.name}</td>
                <td>${formatDeliveredAt(o)}</td>
                <td>${o.total}</td>
                <td>${o.status}</td>
            `;
            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error("Error fetching orders by period:", err);
        tbody.innerHTML = `<tr><td colspan="5">Error loading orders. Please try again later.</td></tr>`;
    }
}

// === Analytics loader ===
async function loadOnlineOrdersAnalytics() {
    // === 1) Delivery Time vs. Satisfaction ===
    const ctx1 = document
        .getElementById('deliveryTimeVsSatisfactionChart')
        .getContext('2d');
    if (window.deliveryTimeChart) window.deliveryTimeChart.destroy();

    try {
        const res1 = await apiFetch('http://localhost:8083/api/v1/orders/delivery-vs-satisfaction');
        if (!res1.ok) throw new Error(`HTTP ${res1.status}`);
        const scatterData = await res1.json(); // [{x: minutes, y: rating}, ...]

        window.deliveryTimeChart = new Chart(ctx1, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Delivery Time vs. Satisfaction',
                    data: scatterData,
                    borderColor: '#319795',
                    backgroundColor: '#319795',
                    fill: false,
                    tension: 0.3,
                    pointRadius: 6
                }]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        title: {display: true, text: 'Delivery Time (minutes)'}
                    },
                    y: {
                        title: {display: true, text: 'Satisfaction Rating'},
                        min: 1,
                        max: 5,
                        ticks: {stepSize: 1}
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label(ctx) {
                                return `Time: ${ctx.parsed.x}m, Rating: ${ctx.parsed.y}`;
                            }
                        }
                    }
                }
            }
        });
    } catch (err) {
        console.error('Failed to load Delivery vs Satisfaction chart:', err);
    }

    // === 2) Orders Per Day ===
    const ctx2 = document
        .getElementById('onlineOrdersPerDayChart')
        .getContext('2d');
    if (window.ordersPerDayChart) window.ordersPerDayChart.destroy();

    // Fixed labels
    const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    try {
        const res2 = await apiFetch('http://localhost:8083/api/v1/orders/orders-per-day');
        if (!res2.ok) throw new Error(`HTTP ${res2.status}`);
        const ordersData = await res2.json(); // Expected: [12, 19, 7, 23, 18, 29, 14]

        window.ordersPerDayChart = new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: dayLabels,
                datasets: [{
                    label: 'Online Orders',
                    data: ordersData,
                    backgroundColor: '#81e6d9'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {display: true, text: 'Number of Orders'}
                    }
                }
            }
        });
    } catch (err) {
        console.error('Failed to load Orders Per Day chart:', err);
    }
}


// === Order modal loader ===
async function openOrderModal(orderId, userId) {
    const modal = document.getElementById("orderModal");

    modal.querySelector("h3").textContent = `Order Details (${orderId})`;
    document.getElementById("modalAddress").textContent = "Loading...";
    document.getElementById("modalPhone").textContent = "";
    document.getElementById("modalItemsList").innerHTML = "<li>Loading items...</li>";
    modal.classList.remove("hidden");

    try {
        const res = await apiFetch(`http://localhost:8083/api/v1/orders/${orderId}?userId=${userId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const order = await res.json();

        document.getElementById("modalAddress").textContent = order.address || "N/A";
        document.getElementById("modalPhone").textContent = order.phoneNumber || "N/A";

        const itemsList = document.getElementById("modalItemsList");
        itemsList.innerHTML = "";
        if (order.map) {
            Object.entries(order.map).forEach(([name, quantity]) => {
                const li = document.createElement("li");
                li.textContent = `${name} x${quantity}`;
                itemsList.appendChild(li);
            });
        } else {
            itemsList.innerHTML = "<li>No items</li>";
        }
    } catch (err) {
        console.error("Failed to load order details:", err);
        document.getElementById("modalAddress").textContent = "Error loading details.";
        document.getElementById("modalItemsList").innerHTML = "";
    }
}

// === Event delegation for ongoing orders table ===
document
    .getElementById('ongoingOrdersTableBody')
    .addEventListener('click', e => {
        if (e.target.matches('button.view-btn')) {
            const orderId = e.target.dataset.id;
            const userId = e.target.dataset.userId;
            openOrderModal(orderId, userId);
        }
    });

// === Tabs & sidebar wiring ===
document.addEventListener("DOMContentLoaded", () => {
    const sidebarBtn = document.querySelector('.nav-btn[data-section="online-orders"]');
    const allSections = document.querySelectorAll(".content-area");
    const sec = document.getElementById("online-orders");
    const tabs = sec.querySelectorAll(".tab-btn");
    const panes = sec.querySelectorAll(".tab-content");

    function openSection() {
        allSections.forEach(s => s.classList.toggle("hidden", s !== sec));
        const activeTab = sec.querySelector(".tab-btn.active").dataset.tab;
        switchTab(activeTab);
    }

    document.querySelector(".close-btn").addEventListener("click", () => {
        document.getElementById("orderModal").classList.add("hidden");
    });
    document
        .getElementById('filterOrdersBtn')
        .addEventListener('click', filterOnlineOrdersByPeriod);

    function switchTab(tabId) {
        tabs.forEach(t => t.classList.toggle("active", t.dataset.tab === tabId));
        panes.forEach(p => {
            const show = p.id === tabId;
            p.classList.toggle("active", show);
            if (!show) return;
            if (tabId === "ongoing-orders") loadOngoingOrders();
            if (tabId === "online-reviews") loadOnlineOrderReviews(); // swap to loadOnlineOrderReviews() for API
            if (tabId === "online-analytics") loadOnlineOrdersAnalytics();
        });
    }

    sidebarBtn.addEventListener("click", openSection);

    tabs.forEach(btn => {
        btn.addEventListener("click", () => switchTab(btn.dataset.tab));
    });


    flatpickr('#orderStartDate, #orderEndDate, #reviewStartDate, #reviewEndDate', {
        dateFormat: 'Y-m-d',
        altInput: true,
        altFormat: 'd/m/Y'
    });


    document
        .getElementById('applyReviewFilters')
        .addEventListener('click', applyReviewFilters);
});
