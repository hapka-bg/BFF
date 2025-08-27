// ------------------------- Utilities -------------------------
import {apiFetch} from "./jwtFetch.js";

function $(sel, root = document) {
    return root.querySelector(sel);
}

function $all(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
}

function safe(fn) {
    try {
        fn();
    } catch (e) {
        console.error(e);
    }
}

// ------------------------- Orders -------------------------
let ordersCache = null;

async function fetchOrders() {
    const ordersTableBody = $("#ordersTableBody");
    const loadingSpinner = $("#loading-spinner");
    const noOrders = $("#no-orders");

    if (!ordersTableBody || !loadingSpinner || !noOrders) return;

    // If we already have cached orders, render them and skip fetch
    if (ordersCache) {
        renderOrders(ordersCache, ordersTableBody, noOrders, loadingSpinner);
        return;
    }

    loadingSpinner.classList.remove("hidden");
    noOrders.classList.add("hidden");
    ordersTableBody.innerHTML = "";

    try {
        const response = await apiFetch("http://localhost:8083/api/v1/orders/all", {
            method: "GET",
            headers: {"Content-Type": "application/json"}
        });

        if (!response.ok) {
            throw new Error(`Failed to load orders: ${response.status}`);
        }

        const orders = await response.json();
        ordersCache = orders; // ✅ store in cache

        renderOrders(orders, ordersTableBody, noOrders, loadingSpinner);

    } catch (error) {
        console.error(error);
        loadingSpinner.classList.add("hidden");
        noOrders.classList.remove("hidden");
        noOrders.textContent = "Failed to load orders.";
    }
}


function renderOrders(orders, ordersTableBody, noOrders, loadingSpinner) {
    loadingSpinner.classList.add("hidden");
    ordersTableBody.innerHTML = "";

    if (!orders || orders.length === 0) {
        noOrders.classList.remove("hidden");
        return;
    }

    orders.forEach(order => {
        const tr = document.createElement("tr");
        const statusClass = getStatusClass(order.orderStatus);
        tr.innerHTML = `
            <td>${order.orderId}</td>
            <td>${order.name}</td>
            <td>${formatDate(order.orderDate)}</td>
            <td>${order.total}</td>
            <td>
            <span class="status-badge ${statusClass}">
                ${order.orderStatus}
            </span>
        </td>
        `;
        ordersTableBody.appendChild(tr);
    });
}

function getStatusClass(status) {
    switch (status) {
        case "ORDERED":
        case "PREPARING":
            return "in-progress";
        case "SERVED":
            return "completed";
        case "CANCELLED":
            return "cancelled";
        default:
            return "";
    }
}
function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}
function filterOrders() {
    if (!ordersCache) {
        fetchOrders().then(filterOrders);
        return;
    }

    const startDateVal = document.getElementById("dateFrom")?.value;
    const endDateVal = document.getElementById("dateTo")?.value;

    let start = startDateVal ? new Date(startDateVal) : null;
    let end = endDateVal ? new Date(endDateVal) : null;

    if (start && isNaN(start)) start = null;
    if (end && isNaN(end)) end = null;

    if (start && end && start > end) {
        alert("Invalid date range");
        return;
    }

    const toDateOnly = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (start) start = toDateOnly(start);
    if (end) end = toDateOnly(end);

    const filtered = ordersCache.filter(o => {
        const orderDate = toDateOnly(new Date(o.orderDate));
        if (start && orderDate < start) return false;
        if (end && orderDate > end) return false;
        return true;
    });

    console.log("Filtered orders:", filtered);
    renderOrders(filtered, $("#ordersTableBody"), $("#no-orders"), $("#loading-spinner"));
}


// ------------------------- Flatpickr -------------------------
function initDatePickers() {
    if (typeof flatpickr !== "function") return;
    safe(() => flatpickr("#salesStartDate", {dateFormat: "Y-m-d", altInput: true, altFormat: "d/m/Y"}));
    safe(() => flatpickr("#salesEndDate", {dateFormat: "Y-m-d", altInput: true, altFormat: "d/m/Y"}));
    safe(() => flatpickr("#dateFrom", {dateFormat: "Y-m-d", allowInput: true}));
    safe(() => flatpickr("#dateTo", {dateFormat: "Y-m-d", allowInput: true}));
}
window.goToAddProduct = function() {
    window.location.href = 'add-product.html';
};
// ------------------------- Orders & Sales tabs -------------------------
function initOrdersSalesTabs() {
    const section = $("#orders-sales");
    if (!section) return;

    const tabButtons = $all(".tab-btn", section);
    const tabContents = $all(".tab-content", section);

    function activateTab(targetId) {
        tabButtons.forEach(b => b.classList.remove("active"));
        $(`.tab-btn[data-tab="${targetId}"]`, section)?.classList.add("active");

        tabContents.forEach(p => p.classList.remove("active"));
        document.getElementById(targetId)?.classList.add("active");

        if (targetId === "orders") {
            $("#salesSpinner")?.classList.add("hidden");
            $("#salesChart") && ($("#salesChart").style.display = "none");
            fetchOrders();
        }
    }

    section.addEventListener("click", (e) => {
        const btn = e.target.closest(".tab-btn");
        if (!btn || !section.contains(btn)) return;
        const targetId = btn.getAttribute("data-tab");
        if (targetId) {
            activateTab(targetId);
        }
    });
}

// ------------------------- Sidebar nav (buttons) -------------------------
function initSidebarNav() {
    const sidebarNav = document.querySelector(".sidebar-nav");
    if (!sidebarNav) {
        console.warn("Sidebar nav not found in DOM");
        return;
    }

    // Event delegation for all .nav-btn clicks
    sidebarNav.addEventListener("click", (e) => {
        const btn = e.target.closest(".nav-btn");
        if (!btn || !sidebarNav.contains(btn)) return;

        const sectionId = btn.getAttribute("data-section");
        if (!sectionId) return;

        // Update active state for buttons
        sidebarNav.querySelectorAll(".nav-btn").forEach(b =>
            b.classList.remove("active")
        );
        btn.classList.add("active");

        // Hide all <main> sections
        document.querySelectorAll("main section").forEach(sec =>
            sec.classList.add("hidden")
        );

        // Show the chosen section
        document.getElementById(sectionId)?.classList.remove("hidden");

        // Section-specific logic
        if (sectionId === "orders-sales") {
            const ordersTabBtn = document.querySelector('#orders-sales .tab-btn[data-tab="orders"]');
            ordersTabBtn?.click();
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    safe(initSidebarNav);
    safe(initOrdersSalesTabs);
    safe(initDatePickers);

    const applyFiltersBtn = document.getElementById("applyFiltersBtn");
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener("click", filterOrders);
    }
});
