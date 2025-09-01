import {apiFetch} from "./jwtFetch.js";

const API_URL = "http://localhost:8082/api/auth";

// ---- Helpers ----
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

const els = {
    street: $("street"),
    city: $("city"),
    changePassBtn: $("change-password-btn"),
    passwordFields: $("password-fields"),
    passwordSaveBtn: $("password-save-btn"),
    passwordCancelBtn: $("password-cancel-btn"),
    logoutBtn: $("logout-btn")
};

async function fetchJSON(path, options = {}) {
    const res = await apiFetch(`${API_URL}${path}`, options);
    if (!res.ok) throw new Error(await res.text() || `Request failed: ${res.status}`);
    return res.json();
}

function toggle(el, show) {
    el.style.display = show ? "block" : "none";
}

function clearChangePassFields() {
    els.passwordFields.querySelectorAll("input").forEach(i => (i.value = ""));
}

function replaceWithSpan(input, value) {
    const span = document.createElement("span");
    span.textContent = value;
    styleSpan(span);
    input.replaceWith(span);
    return span;
}

function styleSpan(span) {
    Object.assign(span.style, {
        padding: "8px",
        background: "#f4faff",
        borderRadius: "8px",
        border: "1px solid #d0e4f1",
        color: "#1a3c6e",
        flexGrow: "1",
        marginRight: "10px"
    });
}

// ---- Profile Editing ----
const fieldMap = {
    "First Name": "firstName",
    "Last Name": "lastName",
    "Email": "email",
    "Phone": "phone",
    "Address": "address",
    "City": "city"
};

function initProfileEditing() {
    $$(".profile-field").forEach(field => {
        if (field.id === "change-password-container") return;

        const [editBtn, saveBtn, cancelBtn] = ["edit-btn", "save-btn", "cancel-btn"]
            .map(c => field.querySelector(`.${c}`));

        let currentSpan = field.querySelector("span");
        let originalValue = currentSpan?.textContent || "";

        editBtn.addEventListener("click", () => {
            if (field.querySelector("input")) return; // already editing

            const input = document.createElement("input");
            input.type = "text";
            input.value = originalValue;
            input.classList.add("edit-input");

            currentSpan.replaceWith(input);
            currentSpan = input;

            editBtn.style.display = "none";
            saveBtn.style.display = cancelBtn.style.display = "inline-block";
        });

        saveBtn.addEventListener("click", async () => {
            const input = field.querySelector("input");
            if (!input) return;

            let newValue = input.value.trim();
            if (!newValue) {
                alert("Value cannot be empty");
                return;
            }

            const label = field.querySelector("label")?.textContent.trim();
            const payloadKey = fieldMap[label];
            if (payloadKey) {
                try {
                    const data = await fetchJSON("/user-details", {
                        method: "PUT",
                        headers: {"Content-Type": "application/json"},
                        body: JSON.stringify({[payloadKey]: newValue})
                    });
                    if (data.token) localStorage.setItem("jwt_token", data.token);
                    if (data.user?.[payloadKey] !== undefined) {
                        newValue = data.user[payloadKey] ?? "";
                    }
                } catch (err) {
                    console.error("Update failed:", err);
                    return;
                }
            }

            originalValue = newValue;
            currentSpan = replaceWithSpan(input, newValue);

            saveBtn.style.display = cancelBtn.style.display = "none";
            editBtn.style.display = "inline-block";
        });

        cancelBtn.addEventListener("click", () => {
            const input = field.querySelector("input");
            if (!input) return;

            currentSpan = replaceWithSpan(input, originalValue);

            saveBtn.style.display = cancelBtn.style.display = "none";
            editBtn.style.display = "inline-block";
        });
    });
}


// ---- Password Change ----
async function savePassword() {
    const [oldPass, newPass, repeatPass] = ["old-password", "new-password", "repeat-password"].map(id => $(id).value.trim());
    if (!oldPass || !newPass || !repeatPass) return alert("All password fields must be filled.");
    if (newPass !== repeatPass) return alert("New password and repeat password do not match.");

    try {
        await fetchJSON("/change-password", {
            method: "PUT",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({oldPassword: oldPass, newPassword: newPass, confirmNewPassword: repeatPass})
        });
        toggle(els.passwordFields, false);
        clearChangePassFields();
    } catch (err) {
        console.error("Password change failed:", err);
    }
}

let promoCodesCache = null;
let promoCodesCacheTime = null;
const PROMO_CODES_CACHE_TTL = 5 * 60 * 1000;

async function loadPromoCodes() {
    const now = Date.now();
    if (promoCodesCache && promoCodesCacheTime && (now - promoCodesCacheTime) < PROMO_CODES_CACHE_TTL) {
        renderPromoCodes(promoCodesCache);
        return;
    }

    try {
        const res = await apiFetch("http://localhost:8083/api/v1/promo_codes/all");
        if (!res.ok) throw new Error(await res.text() || `Request failed: ${res.status}`);
        const promoCodes = await res.json();

        // Update cache
        promoCodesCache = promoCodes;
        promoCodesCacheTime = now;

        renderPromoCodes(promoCodes);
    } catch (err) {
        console.error("Failed to load promo codes:", err);
    }
}

function renderPromoCodes(promoCodes) {
    const container = document.getElementById("promo-codes-list");
    container.innerHTML = "";

    if (!promoCodes.length) {
        container.innerHTML = "<p>No promo codes available.</p>";
        return;
    }

    promoCodes.forEach(promo => {
        const item = document.createElement("div");
        item.classList.add("promo-code-item");
        item.innerHTML = `
            <div><strong>Code:</strong> ${promo.code}</div>
            <div><strong>Discount:</strong> ${promo.discount}</div>
            <div><strong>Min Purchase:</strong> ${promo.minPurchase}</div>
            <div><strong>Deadline:</strong> ${new Date(promo.deadline).toLocaleString()}</div>
        `;
        container.appendChild(item);
    });
}
let ordersCache = null;
let ordersCacheTime = null;
const ORDERS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function loadOrders() {
    const now = Date.now();
    if (ordersCache && ordersCacheTime && (now - ordersCacheTime) < ORDERS_CACHE_TTL) {
        renderOrders(ordersCache);
        return;
    }

    try {
        const res = await apiFetch("http://localhost:8083/api/v1/orders/my");
        if (!res.ok) throw new Error(await res.text() || `Request failed: ${res.status}`);
        const orders = await res.json();

        ordersCache = orders;
        ordersCacheTime = now;

        renderOrders(orders);
    } catch (err) {
        console.error("Failed to load orders:", err);
    }

}
function renderOrders(orders) {
    const tbody = document.querySelector("#orders-tab tbody");
    tbody.innerHTML = "";

    if (!orders.length) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No orders found.</td></tr>`;
        return;
    }

    orders.forEach(order => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${order.orderId}</td>
            <td>${new Date(order.createdAt).toLocaleString()}</td>
            <td>${order.total}</td>
            <td>${order.status}</td>
            <td>${order.itemsCount}</td>
            <td><button class="view-items-btn" data-order-id="${order.orderId}">View Items</button></td>
        `;
        tbody.appendChild(tr);
    });

    // Attach click listeners for the new buttons
    tbody.querySelectorAll(".view-items-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const orderId = btn.getAttribute("data-order-id");
            loadOrderItems(orderId);
        });
    });
}
async function loadOrderItems(orderId) {
    try {
        const res = await apiFetch(`http://localhost:8083/api/v1/orders/${orderId}/items`);
        if (!res.ok) throw new Error(await res.text() || `Request failed: ${res.status}`);
        const items = await res.json();

        renderOrderItemsModal(items);
    } catch (err) {
        console.error("Failed to load order items:", err);
    }
}

function renderOrderItemsModal(items) {
    const list = document.getElementById("items-list");
    list.innerHTML = "";

    if (!items.length) {
        list.innerHTML = "<li>No items found for this order.</li>";
    } else {
        items.forEach(item => {
            const li = document.createElement("li");
            li.textContent = typeof item === "string" ? item : item.name || JSON.stringify(item);
            list.appendChild(li);
        });
    }

    document.getElementById("items-modal").style.display = "flex";
}


    // ---- Init ----
document.addEventListener("DOMContentLoaded", async () => {
    try {
        const profile = await fetchJSON("/user-details");

        // Loop over each profile field and set its span based on the label
        $$("#details-tab .profile-field").forEach(field => {
            const label = field.querySelector("label")?.textContent.trim();
            const key = fieldMap[label];
            if (key && profile[key] !== undefined) {
                const span = field.querySelector("span");
                if (span) span.textContent = profile[key] || "";
            }
        });

    } catch (err) {
        console.error("Profile fetch failed:", err);
    }

    // Password change toggle
    els.changePassBtn.addEventListener("click", () =>
        toggle(els.passwordFields, els.passwordFields.style.display !== "block")
    );
    els.passwordCancelBtn.addEventListener("click", () => {
        toggle(els.passwordFields, false);
        clearChangePassFields();
    });
    els.passwordSaveBtn.addEventListener("click", savePassword);

    const modal = document.getElementById("items-modal");
    const closeBtn = document.getElementById("close-items-modal");
    closeBtn.addEventListener("click", () => {
        modal.style.display = "none";
    });
    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.style.display = "none";
        }
    });
    // Show/hide password buttons
    $$(".toggle-password-btn").forEach(btn =>
        btn.addEventListener("click", () => {
            const input = btn.parentElement.querySelector("input");
            const isPass = input.type === "password";
            input.type = isPass ? "text" : "password";
            btn.textContent = isPass ? "🙈" : "👁️";
        })
    );

    // Logout
    els.logoutBtn.addEventListener("click", () => {
        localStorage.clear();
        location.href = "login.html";
    });


    // Tab switching logic
    $$(".tab-button").forEach(button => {
        button.addEventListener("click", () => {
            const targetId = button.getAttribute("data-tab") + "-tab"; // append -tab

            // Remove active class from all buttons
            $$(".tab-button").forEach(btn => btn.classList.remove("active"));

            // Hide all tab contents
            $$(".tab-content").forEach(tab => {
                tab.classList.remove("active", "fade-in");
                tab.style.display = "none";
            });

            // Activate clicked button
            button.classList.add("active");

            // Show the corresponding tab content
            const targetTab = document.getElementById(targetId);
            if (targetTab) {
                targetTab.style.display = "block";
                targetTab.classList.add("active", "fade-in");

                if (targetId === "promos-tab") {
                    loadPromoCodes();
                }
                else if (targetId === "orders-tab") {
                    loadOrders();
                }
            }
        });
    });
    initProfileEditing();
});