import {apiFetch} from "./jwtFetch.js";

let products = JSON.parse(localStorage.getItem("cartProducts")) || [];

const baseDeliveryFee = 5.0;
let deliveryFee = baseDeliveryFee;
const promoCodeDiscount = 0.15; // 15% discount example
let promoApplied = false;

const cartItemsDiv = document.getElementById("cartItems");
const deliveryFeeSpan = document.getElementById("deliveryFee");
const totalPriceSpan = document.getElementById("totalPrice");
const clearCartBtn = document.getElementById("clearCartBtn");
const addItemBtn = document.getElementById("addItemBtn");
const backBtn = document.getElementById("backBtn");

const sushiSticksChk = document.getElementById("sushiSticksChk");
const sushiSticksCount = document.getElementById("sushiSticksCount");
const cutleryNapkinsChk = document.getElementById("cutleryNapkinsChk");

const promoInput = document.getElementById("promoCode");
const applyPromoBtn = document.getElementById("applyPromoBtn");
const promoMessage = document.getElementById("promoMessage");

function renderCart() {
    cartItemsDiv.innerHTML = "";
    const cartExtras = document.getElementById("cartExtras");

    if (products.length === 0) {
        cartItemsDiv.innerHTML = `
      <p class="empty-message">
        🛒 Your cart is empty.<br>
        Let’s go browse some delicious options!
      </p>
      <a href="home.html" class="browse-btn" onclick="window.location.href='products.html'">Browse Products</a>
    `;
        cartExtras.style.display = "none";
        return;
    }

    cartExtras.style.display = "block";

    products.forEach((p) => {
        const itemDiv = document.createElement("div");
        itemDiv.className = "cart-item";

        // Build lists
        let addedHTML = "";
        if (p.customizations && p.customizations.added && p.customizations.added.length > 0) {
            addedHTML = `
      <div class="added-options">
        <strong>Added:</strong>
        <ul>
          ${p.customizations.added.map(opt => {
                const qtyText = opt.quantity > 1 ? ` x${opt.quantity}` : "";
                return `<li>${opt.name}${qtyText}</li>`;
            }).join("")}
        </ul>
      </div>
    `;
        }

        let removedHTML = "";
        if (p.customizations && p.customizations.removed && p.customizations.removed.length > 0) {
            removedHTML = `
      <div class="removed-options">
        <strong>Removed:</strong>
        <ul>
          ${p.customizations.removed.map(opt => `<li>${opt.name}</li>`).join("")}
        </ul>
      </div>
    `;
        }


        itemDiv.innerHTML = `
      <img src="${p.image}" alt="${p.name}" />
      <div class="info">
        <h3>${p.name}</h3>
        ${addedHTML}
        ${removedHTML}
        <div class="qty-controls">
          <button class="qty-minus" data-id="${p.id}">−</button>
          <input type="number" min="1" value="${p.quantity}" data-id="${p.id}" />
          <button class="qty-plus" data-id="${p.id}">+</button>
        </div>
      </div>
      <div class="price-remove">
        <span class="item-price">$${p.price.toFixed(2)}</span>
        <button class="remove-btn" data-id="${p.id}">×</button>
      </div>
    `;

        cartItemsDiv.appendChild(itemDiv);
    });

    deliveryFeeSpan.textContent = `$${deliveryFee.toFixed(2)}`;
    updateTotal();
    attachEventListeners();
}


function updateTotal() {
    let sum = products.reduce((acc, p) => acc + p.price * p.quantity, 0);

    // Add fee for cutlery/napkins if checkbox checked (fixed $1.00)
    if (cutleryNapkinsChk.checked) {
        sum += 1.0;
    }

    // Add sushi sticks price based on selected sets (each set adds $0.10)
    if (sushiSticksChk.checked && sushiSticksCount.value && sushiSticksCount.value !== "0") {
        const sets = parseInt(sushiSticksCount.value);
        if (!isNaN(sets)) {
            sum += sets * 0.10;
        }
    }

    sum += deliveryFee;

    // Apply promo discount if applied
    if (promoApplied) {
        sum = sum - sum * promoCodeDiscount;
    }

    totalPriceSpan.textContent = `$${sum.toFixed(2)}`;
}

function attachEventListeners() {
    document.querySelectorAll(".qty-minus").forEach((btn) => {
        btn.onclick = () => {
            const id = btn.dataset.id;
            const prod = products.find((p) => p.id === id);
            if (prod.quantity > 1) {
                prod.quantity--;
                localStorage.setItem("cartProducts", JSON.stringify(products));
                renderCart();
            }
        };
    });

    document.querySelectorAll(".qty-plus").forEach((btn) => {
        btn.onclick = () => {
            const id = btn.dataset.id;
            const prod = products.find((p) => p.id === id);
            prod.quantity++;
            localStorage.setItem("cartProducts", JSON.stringify(products));
            renderCart();
        };
    });

    document.querySelectorAll('.cart-item input[type="number"]').forEach((input) => {
        input.onchange = () => {
            const id = input.dataset.id;
            let val = parseInt(input.value);
            if (isNaN(val) || val < 1) val = 1;
            input.value = val;
            const prod = products.find((p) => p.id === id);
            prod.quantity = val;
            localStorage.setItem("cartProducts", JSON.stringify(products));
            updateTotal();
        };
    });

    document.querySelectorAll(".remove-btn").forEach((btn) => {
        btn.onclick = () => {
            const id = btn.dataset.id;
            const idx = products.findIndex((p) => p.id === id);
            if (idx !== -1) {
                products.splice(idx, 1);
                localStorage.setItem("cartProducts", JSON.stringify(products));
                renderCart();
            }
        };
    });

    // Extra items event listeners
    sushiSticksChk.onchange = () => {
        if (sushiSticksChk.checked) {
            sushiSticksCount.classList.remove("hidden");
            if (sushiSticksCount.value === "0") sushiSticksCount.value = "1";
        } else {
            sushiSticksCount.classList.add("hidden");
            sushiSticksCount.value = "0";
        }
        saveExtras()
        updateTotal();
    };

    sushiSticksCount.onchange = () => {
        saveExtras();
        updateTotal();
    };

    cutleryNapkinsChk.onchange = () => {
        saveExtras()
        updateTotal();
    }
}

// Promo code apply logic - simple demo: valid code "DISCOUNT15"
applyPromoBtn.onclick = () => {
    const code = promoInput.value.trim().toUpperCase();
    if (code === "DISCOUNT15") {
        promoApplied = true;
        promoMessage.textContent = "Promo applied! 15% off.";
        promoMessage.style.color = "#27ae60";
    } else {
        promoApplied = false;
        promoMessage.textContent = "Invalid promo code.";
        promoMessage.style.color = "#bb2f27";
    }
    updateTotal();
};


clearCartBtn.addEventListener("click", resetCart);

addItemBtn.onclick = () => {
    window.location.href = 'home.html'
};

function saveExtras() {
    const extrasState = {
        cutleryNapkins: cutleryNapkinsChk.checked,
        sushiSticks: sushiSticksChk.checked,
        sushiSticksCount: sushiSticksCount.value
    };
    localStorage.setItem("cartExtras", JSON.stringify(extrasState));
}

function loadExtras() {
    const saved = JSON.parse(localStorage.getItem("cartExtras"));
    if (saved) {
        cutleryNapkinsChk.checked = !!saved.cutleryNapkins;
        sushiSticksChk.checked = !!saved.sushiSticks;
        sushiSticksCount.value = saved.sushiSticksCount || "0";

        if (sushiSticksChk.checked) {
            sushiSticksCount.classList.remove("hidden");
        } else {
            sushiSticksCount.classList.add("hidden");
        }
    }
}

loadExtras();
renderCart();
function resetCart() {
    // Empty the cart
    products.length = 0;

    // Clear storage
    if (localStorage.getItem("cartProducts")) {
        localStorage.removeItem("cartProducts");
    }
    if (localStorage.getItem("cartExtras")) {
        localStorage.removeItem("cartExtras");
    }

    // Reset extra states
    promoApplied = false;
    deliveryFee = baseDeliveryFee;

    // Reset UI fields
    promoInput.value = "";
    promoMessage.textContent = "";
    sushiSticksChk.checked = false;
    cutleryNapkinsChk.checked = false;
    sushiSticksCount.value = "0";
    sushiSticksCount.classList.add("hidden");

    // Render updated cart
    renderCart();
}

function buildCartPayload() {
    const cartData = products.map(p => ({
        id: p.id,
        name: p.name,
        quantity: p.quantity,
        price: p.price,
        customizations: p.customizations || {added: [], removed: []}
    }));

    const cutleryNapkins = document.getElementById("cutleryNapkinsChk").checked;
    const sushiSticks = document.getElementById("sushiSticksChk").checked;
    const sushiSticksCount = sushiSticks
        ? document.getElementById("sushiSticksCount").value
        : null;

    // Promo code
    const promoCode = document.getElementById("promoCode").value.trim();

    // Total (already calculated in your updateTotal function)
    const total = parseFloat(
        document.getElementById("totalPrice").textContent.replace("$", "")
    );

    // Combine all into a single JSON object
    const payload = {
        products: cartData,
        extras: {
            cutleryNapkins,
            sushiSticks,
            sushiSticksCount
        },
        promoCode,
        total
    };

    return payload;
}

document.getElementById("checkoutBtn").addEventListener("click", () => {
    const payload = buildCartPayload();
    console.log("Order payload:", payload);

    // Example POST request:
    apiFetch("http://localhost:8083/api/v1/orders/place", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(payload)
    })
        .then(res => {
            if (!res.ok) {
                throw new Error("Failed to place order");
            }
            return res.json();
        })
        .then(data => {
            console.log("Backend response:", data);
            resetCart();
        })
        .catch(err => console.error("Order error:", err));
});
