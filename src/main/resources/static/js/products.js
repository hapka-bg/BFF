// products.js
 import { apiFetch } from "./jwtFetch.js";

const PRODUCTS_ENDPOINT = 'http://localhost:8083/api/v1/products/all';
let productsCache = null;

// --- Utilities ---
function formatPrice(price, currencySymbol = '$') {
    if (price == null) return '';
    if (typeof price === 'number') return `${currencySymbol}${price.toFixed(2)}`;
    return String(price);
}

function showSnackbar(message) {
    const snackbar = document.getElementById('snackbar');
    if (!snackbar) return;
    snackbar.textContent = message;
    snackbar.classList.add('show');
    setTimeout(() => snackbar.classList.remove('show'), 3000);
}

function renderProducts(products) {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    grid.innerHTML = '';

    if (!products || products.length === 0) {
        grid.innerHTML = `<div class="empty-state">No products found.</div>`;
        return;
    }

    const DEFAULT_CURRENCY = '$';

    products.forEach(product => {
        const { id, name, description, imageUrl, price } = product;

        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <img src="${imageUrl || ''}" alt="${name || ''}" />
            <h3>${name || ''}</h3>
            <p>${description || ''}</p>
            <div class="price">${formatPrice(price, DEFAULT_CURRENCY)}</div>
            <div class="btn-group">
                <button class="btn small edit-btn" ${id == null ? 'disabled' : ''}>Edit</button>
                <button class="btn small danger delete-btn" ${id == null ? 'disabled' : ''}>Delete</button>
            </div>
        `;

        const editBtn = card.querySelector('.edit-btn');
        editBtn.addEventListener('click', () => editProduct(id));

        const deleteBtn = card.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => deleteProduct(id));

        grid.appendChild(card);
    });
}

// --- Data fetching ---
async function fetchProducts() {
    const res = await apiFetch(PRODUCTS_ENDPOINT, { method: 'GET', headers: { 'Accept': 'application/json' } });

    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Failed to fetch products: ${res.status} ${text}`);
    }

    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Products payload is not an array.');
    return data;
}

// --- Public API ---
async function loadProducts({ force = false } = {}) {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    grid.innerHTML = `<div class="loading">Loading products…</div>`;

    try {
        if (!productsCache || force) {
            productsCache = await fetchProducts();
        }
        renderProducts(productsCache);
    } catch (err) {
        console.error(err);
        grid.innerHTML = `
            <div class="error-state">
                <p>Could not load products.</p>
                <button class="btn small" onclick="loadProducts({ force: true })">Retry</button>
            </div>
        `;
        showSnackbar('Failed to load products');
    }
}

// --- Actions ---
function editProduct(productId) {
    if (!productId) return;
    window.location.href = `edit-product.html?productId=${encodeURIComponent(productId)}`;
}

async function deleteProduct(productId) {
    if (!productId) {
        showSnackbar('Missing product id');
        return;
    }

    try {
        const res = await fetch(`${PRODUCTS_ENDPOINT}/${encodeURIComponent(productId)}`, {
            method: 'DELETE',
            headers: { 'Accept': 'application/json' }
        });

        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(`Delete failed: ${res.status} ${text}`);
        }

        if (Array.isArray(productsCache)) {
            productsCache = productsCache.filter(p => p.id !== productId);
            renderProducts(productsCache);
        } else {
            await loadProducts({ force: true });
        }

        showSnackbar('Product deleted');
    } catch (err) {
        console.error(err);
        showSnackbar('Failed to delete product');
    }
}

// --- Search/filter ---
function filterProducts() {
    const query = (document.getElementById('searchInput')?.value || '').toLowerCase();
    document.querySelectorAll('.product-card').forEach(card => {
        const title = card.querySelector('h3')?.textContent.toLowerCase() || '';
        card.style.display = title.includes(query) ? 'flex' : 'none';
    });
}

// --- Auto-load ---
document.addEventListener('DOMContentLoaded', () => {
    const productsSection = document.getElementById('products');
    if (!productsSection) return;

    if (!productsSection.classList.contains('hidden')) loadProducts();

    new MutationObserver(mutations => {
        for (const m of mutations) {
            if (m.attributeName === "class" && !productsSection.classList.contains('hidden')) {
                loadProducts();
            }
        }
    }).observe(productsSection, { attributes: true });
});

// --- Expose globally ---
window.loadProducts = loadProducts;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.filterProducts = filterProducts;
