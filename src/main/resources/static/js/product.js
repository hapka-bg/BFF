import { apiFetch } from "./jwtFetch.js";

// --- Get product ID from URL ---
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');
if (!productId) {
    console.error("No product ID found in URL");
    throw new Error("Missing product ID");
}

// --- Globals ---
let basePrice    = 0;
let productName  = '';
let productImage = '';

const quantityInput  = document.getElementById('quantity');
const decreaseBtn    = document.getElementById('decrease-qty');
const increaseBtn    = document.getElementById('increase-qty');
const addToCartBtn   = document.getElementById('add-to-cart');
const priceEl        = document.querySelector('.product-price-end strong');

const withoutOptionsContainer = document.getElementById('without-options');
const furtherOptionsContainer = document.getElementById('further-options');

async function loadProduct() {
    try {
        const res = await apiFetch(`http://localhost:8083/api/v1/products/${productId}`);
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);

        const product = await res.json();

        // Store base product data
        productName  = product.name;
        basePrice    = parseFloat(product.price) || 0;
        productImage = product.image;

        // Fill in UI
        document.querySelector('.product-name').textContent = productName;
        document.querySelector('.product-image').src = productImage;
        document.querySelector('.product-image').alt = productName;

        if (product.weight) {
            const weightEl = document.querySelector('.product-weight');
            if (weightEl) weightEl.textContent = `${product.weight}g`;
        }
        if (product.description) {
            const descEl = document.querySelector('.product-description');
            if (descEl) descEl.textContent = product.description;
        }

        renderCustomizations(product.customizations);
        renderRecommendedProducts(product.recommended);

    } catch (err) {
        console.error('Failed to load product', err);
    }
}

function renderCustomizations(customizations = []) {
    withoutOptionsContainer.innerHTML = '';
    furtherOptionsContainer.innerHTML = '';

    customizations.forEach(cust => {
        const { id: customizationId, ingredient, extraCost, removable, addable, maxQuantity } = cust;

        if (removable) {
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            // Display name in text, not as the authoritative value
            checkbox.value = ingredient.name;
            // Correct IDs
            checkbox.dataset.ingredientId = ingredient.id;
            checkbox.dataset.customizationId = customizationId;
            checkbox.dataset.extraCost = extraCost || 0;
            checkbox.classList.add('option-remove');

            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(' ' + ingredient.name));
            withoutOptionsContainer.appendChild(label);

            checkbox.addEventListener('change', updatePrice);
        }

        if (addable) {
            const label = document.createElement('label');

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = ingredient.name;
            checkbox.dataset.ingredientId = ingredient.id;
            checkbox.dataset.customizationId = customizationId;
            checkbox.dataset.extraCost = extraCost || 0;
            checkbox.classList.add('option-add');

            const spanText = document.createElement('span');
            const ec = extraCost ? ` (+$${Number(extraCost).toFixed(2)})` : '';
            spanText.textContent = ` ${ingredient.name}${ec}`;

            const select = document.createElement('select');
            for (let i = 1; i <= (maxQuantity || 1); i++) {
                const opt = document.createElement('option');
                opt.value = i;
                opt.textContent = i;
                select.appendChild(opt);
            }
            select.hidden = true;

            label.appendChild(checkbox);
            label.appendChild(spanText);
            label.appendChild(select);
            furtherOptionsContainer.appendChild(label);

            checkbox.addEventListener('change', () => {
                select.hidden = !checkbox.checked;
                updatePrice();
            });
            select.addEventListener('change', updatePrice);
        }
    });
}


function renderRecommendedProducts(recommended) {
    const container = document.querySelector('.recommended-products-list');
    container.innerHTML = '';

    if (!recommended || !recommended.length) {
        container.textContent = 'No related products at the moment.';
        return;
    }

    recommended.forEach(item => {
        const label = document.createElement('label');
        label.className = 'recommended-product';
        label.innerHTML = `
            <img src="${item.image}" alt="${item.name}" />
            <span class="recommended-name">${item.name}</span>
            <span class="recommended-price">$${parseFloat(item.price).toFixed(2)}</span>
            <input type="checkbox" name="recommended" value="${item.id}" 
                   data-image="${item.image}" data-price="${parseFloat(item.price)}" />
        `;
        container.appendChild(label);
    });
}

function updatePrice() {
    let addedPrice = 0;

    document.querySelectorAll('#further-options label').forEach(label => {
        const checkbox = label.querySelector('input[type="checkbox"]');
        const select   = label.querySelector('select');

        if (checkbox && checkbox.checked) {
            const addonQty   = select ? (parseInt(select.value, 10) || 1) : 1;
            const addonPrice = parseFloat(checkbox.dataset.extraCost) || 0;
            addedPrice      += addonQty * addonPrice;
        }
    });

    const qty = parseInt(quantityInput.value, 10) || 1;
    const totalPrice = ((basePrice + addedPrice) * qty).toFixed(2);
    priceEl.textContent = '$' + totalPrice;
}

function attachEventListeners() {
    // Quantity controls
    decreaseBtn.addEventListener('click', () => {
        let val = parseInt(quantityInput.value, 10) || 1;
        if (val > 1) quantityInput.value = val - 1;
        updatePrice();
    });

    increaseBtn.addEventListener('click', () => {
        let val = parseInt(quantityInput.value, 10) || 1;
        quantityInput.value = val + 1;
        updatePrice();
    });

    quantityInput.addEventListener('input', () => {
        let val = parseInt(quantityInput.value, 10);
        if (isNaN(val) || val < 1) quantityInput.value = 1;
        updatePrice();
    });

    // Main unified add-to-cart
    addToCartBtn.addEventListener("click", () => {
        let cart = JSON.parse(localStorage.getItem("cartProducts")) || [];

        const quantity = parseInt(quantityInput.value, 10) || 1;
        const price = parseFloat(priceEl.textContent.replace('$', '')) || 0;

        const addedOptions = Array.from(document.querySelectorAll(".option-add:checked")).map(opt => {
            const select = opt.parentElement.querySelector("select");
            const count = select ? parseInt(select.value, 10) : 1;
            return {
                id: opt.dataset.ingredientId,       // ingredient ID (string/UUID)
                name: opt.value,                     // display only
                quantity: count
            };
        });

        const removedOptions = Array.from(document.querySelectorAll(".option-remove:checked")).map(opt => ({
            id: opt.dataset.ingredientId,          // ingredient ID (string/UUID)
            name: opt.value,                        // display only
            quantity: 1
        }));

        const mainItem = {
            id: productId,
            name: productName,
            image: productImage,
            price,
            quantity,
            customizations: {
                added: addedOptions,
                removed: removedOptions
            }
        };

        cart.push(mainItem);

        // Recommended remains the same, but keep empty customizations:
        document.querySelectorAll('.recommended-products-list input[type="checkbox"]:checked').forEach(cb => {
            const recItem = {
                id: cb.value,
                name: cb.parentElement.querySelector('.recommended-name').textContent,
                image: cb.dataset.image,
                price: parseFloat(cb.dataset.price) || 0,
                quantity: 1,
                customizations: { added: [], removed: [] }
            };
            cart.push(recItem);
        });

        localStorage.setItem("cartProducts", JSON.stringify(cart));
    });

}

async function init() {
    document.querySelectorAll('details').forEach(details => details.removeAttribute('open'));
    await loadProduct();
    attachEventListeners();
    updatePrice();
}

init();
