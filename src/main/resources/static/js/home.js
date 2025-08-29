import { apiFetch } from "./jwtFetch.js";

const productsListEl = document.querySelector('.products-list');
const categoryButtons = document.querySelectorAll('.category-btn');
let products = [];
let productsLoaded = false; // cache flag

async function fetchProducts(forceRefresh = false) {
    if (productsLoaded && !forceRefresh) {
        renderProducts('ALL');
        return;
    }

    try {
        const res = await apiFetch('http://localhost:8083/api/v1/products');
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

        products = await res.json();
        productsLoaded = true;
        renderProducts('ALL');
    } catch (err) {
        console.error('Failed to fetch products:', err);
        productsListEl.innerHTML = `<p class="error">Unable to load products at the moment.</p>`;
    }
}

categoryButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        categoryButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (btn.dataset.category === 'ALL') {
            renderProducts('ALL');
        } else {
            renderProducts(btn.dataset.category);
        }
    });
});
function renderProducts(category) {
    productsListEl.innerHTML = '';

    const filteredProducts =
        category === 'ALL'
            ? products
            : products.filter(p => p.category === category);

    if (filteredProducts.length === 0) {
        productsListEl.innerHTML = `<p class="empty">No products found in this category.</p>`;
        return;
    }

    filteredProducts.forEach(product => {
        const productEl = document.createElement('article');
        productEl.className = 'product-card';
        productEl.dataset.id = product.id;
        productEl.setAttribute('data-category', product.category);

        productEl.innerHTML = `
            <img src="${product.image}" alt="${product.name}" class="product-image" loading="lazy" />
            <div class="product-info">
                <h2 class="product-name">${product.name}</h2>
                <p class="product-price-weight">
                    <span class="price">$${product.price.toFixed(2)}</span> &bull;
                    <span class="weight">${product.weight || ''}</span>
                </p>
                <div class="product-actions">
                    <button class="btn add-cart-btn" type="button" aria-label="Add ${product.name} to cart">Add to Cart</button>
                    <a href="/product.html?id=${product.id}" 
                       class="btn options-btn" 
                       aria-label="Options for ${product.name}">Options</a>
                </div>
            </div>`;

        productsListEl.appendChild(productEl);
    });

    // Handle Add to Cart clicks
    document.querySelectorAll('.add-cart-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const card = e.target.closest('.product-card');
            const prodId = card.dataset.id;
            const prod = products.find(p => p.id === prodId);

            if (!prod) return;

            // Build a simple cart item object
            const cartItem = {
                id: prod.id,         // UUID from backend
                name: prod.name,
                image: prod.image,
                price: prod.price,
                quantity: 1,
                customizations: {
                    added: [],
                    removed: []
                }
            };

            let cart = JSON.parse(localStorage.getItem('cartProducts')) || [];

            // If product already exists in cart, increment quantity
            const existing = cart.find(p => p.id === prod.id);
            if (existing) {
                existing.quantity += 1;
            } else {
                cart.push(cartItem);
            }

            // Save back to localStorage
            localStorage.setItem('cartProducts', JSON.stringify(cart));

            // Optional: simple confirmation
         //   alert(`${prod.name} added to cart`);
        });
    });

    // Handle Options clicks
    document.querySelectorAll('.options-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const id = e.target.closest('.product-card').dataset.id;
            console.log("Selected product ID:", id);
            // You already have the link going to /product.html?id=...
        });
    });
}
document.addEventListener("DOMContentLoaded", () => {
    const profileBtn = document.querySelector(".profile-btn");

    if (profileBtn) {
        profileBtn.setAttribute("href", "/profile");
    }
});

fetchProducts();
