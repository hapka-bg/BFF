// review.js
import {apiFetch} from "./jwtFetch.js";


document.addEventListener('DOMContentLoaded', () => {
    // —————— 1) Reviews Tab Navigation ——————
    const reviewTabs = document.querySelectorAll('#reviews .tab-btn');
    const reviewPanes = document.querySelectorAll('#reviews .tab-content');
    reviewTabs.forEach(btn => {
        btn.addEventListener('click', () => {
            reviewTabs.forEach(b => b.classList.remove('active'));
            reviewPanes.forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
        });
    });

    async function loadSummaryData() {
        try {
            const res = await apiFetch('http://localhost:8083/api/v1/reviews/summary');
            if (!res.ok) throw new Error('Failed to fetch summary');
            const data = await res.json();
            Object.entries(data).forEach(([roleKey, roleData]) => {
                const card = document.querySelector(
                    `.analytics-card[onclick*="${capitalize(roleKey.slice(0, -1))}"]`
                );
                if (card) {
                    const avgEl = card.querySelector('p strong');
                    const countEl = card.querySelectorAll('p')[1];
                    avgEl.textContent = roleData.avg.toFixed(1);
                    countEl.textContent = `Based on ${roleData.count} reviews`;
                }
            })
        } catch (err) {
            console.error('Error loading summary data:', err);
        }

    }

    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // —————— 3) Role-Detail Panel Logic ——————
    let currentRoleKey = null;
    window.openRoleDetail = async function (role) {
        currentRoleKey = role.toLowerCase() + 's';
        document.getElementById('roleDetailTitle')
            .textContent = role + ' Review Breakdown';

        await loadRoleDetails(currentRoleKey)

        document.getElementById('roleDetailPanel')
            .classList.remove('hidden');
    };
    window.closeRoleDetail = function () {
        document.getElementById('roleDetailPanel')
            .classList.add('hidden');
    };

    let currentRoleData = null;

    async function loadRoleDetails(roleKey) {
        try {
            const res = await apiFetch(`http://localhost:8083/api/v1/reviews/${roleKey}`);
            if (!res.ok) throw new Error('Failed to fetch role details');
            currentRoleData = await res.json(); // save for sorting later
            renderRoleTable(document.querySelector('#sortReviews').value);
        } catch (err) {
            console.error(`Error loading details for ${roleKey}:`, err);
        }
    }
    function renderRoleTable(sortOrder) {
        if (!currentRoleData) return;

        const tbody = document.querySelector('#roleReviewTable tbody');
        tbody.innerHTML = '';

        if (sortOrder === 'desc') {
            // Highest rated → only top 3 best
            (currentRoleData.best || []).slice(0, 3).forEach(u => appendRow(tbody, u));
        } else {
            // Lowest rated → only bottom 3 worst
            (currentRoleData.worst || []).slice(0, 3).forEach(u => appendRow(tbody, u));
        }
    }

    function appendRow(tbody, u) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
        <td>${u.name}</td>
        <td>${u.avgRating != null ? u.avgRating.toFixed(1) : '—'}</td>
        <td>${u.reviewCount}</td>
    `;
        tbody.appendChild(tr);
    }


    window.sortRoleReviews = function () {
        const order = document.getElementById('sortReviews').value;
        renderRoleTable(order);
    };

    // —————— 4) Time-Based Reviews ——————
    window.filterTimeReviews = async function () {
        const period = document.getElementById('timeFilter').value;
        const sortOrder = document.getElementById('sortReviews')?.value || 'desc'; // optional: tie into your dropdown
        const container = document.getElementById('timeReviewsList');
        container.innerHTML = '';

        try {
            const res = await apiFetch(`http://localhost:8083/api/v1/reviews?period=${period}`);
            if (!res.ok) throw new Error('Failed to fetch time-based reviews');

            let reviews = await res.json();

            // Map to consistent keys
            reviews = reviews.map(r => ({
                date: r.createdAt.split('T')[0], // just YYYY-MM-DD
                rating: r.overallRating,
                comment: r.comment
            }));

            // Sort by rating
            reviews.sort((a, b) => sortOrder === 'asc'
                ? a.rating - b.rating
                : b.rating - a.rating
            );

            // Render
            reviews.forEach(r => {
                const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
                const div = document.createElement('div');
                div.className = 'review-card';
                div.innerHTML = `
                <small>${r.date}</small>
                <div class="stars">${stars}</div>
                <p>${r.comment}</p>
            `;
                container.appendChild(div);
            });

        } catch (err) {
            console.error('Error loading time-based reviews:', err);
            container.innerHTML = '<p class="error">Could not load reviews.</p>';
        }
    };


    // —————— 5) Product-Based Reviews ——————
    window.filterProductReviews = async function () {
        const type = document.getElementById('sentimentFilter').value; // "good" or "bad"
        const container = document.getElementById('productReviewList');
        container.innerHTML = '';

        try {
            // Call your backend endpoint
            const res = await apiFetch(`http://localhost:8083/api/v1/reviews/product?sentiment=${type}`);
            if (!res.ok) throw new Error('Failed to fetch product reviews');

            const reviews = await res.json();
            // Expecting: [{ name: "Product A", rating: 5, comment: "..." }, ...]

            reviews.forEach(r => {
                const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
                const div = document.createElement('div');
                div.className = 'review-card';
                div.innerHTML = `
                <strong>${r.productName}</strong>
                <div class="stars">${stars}</div>
                <p>${r.comment}</p>
            `;
                container.appendChild(div);
            });

        } catch (err) {
            console.error('Error loading product reviews:', err);
            container.innerHTML = '<p class="error">Could not load product reviews.</p>';
        }
    };
    function initReviews() {
        // Set default tab
        const defaultTab = document.querySelector('#reviews .tab-btn.active');
        if (defaultTab) defaultTab.click();

        // Force time filter to 7 days when time-reviews tab clicked
        document.querySelector('#reviews .tab-btn[data-tab="time-reviews"]')
            .addEventListener('click', () => {
                document.getElementById('timeFilter').value = '7days';
                filterTimeReviews();
            });
        document.querySelector('#reviews .tab-btn[data-tab="product-reviews"]')
            .addEventListener('click', () => {
                // Set a default sentiment if none selected
                const sentimentSelect = document.getElementById('sentimentFilter');
                if (sentimentSelect && !sentimentSelect.value) {
                    sentimentSelect.value = 'good';
                }
                filterProductReviews();
            });

        loadSummaryData();
    }

    // 2) Whenever the sidebar “Reviews” button is clicked, re‐fire that default tab + preload
    const sidebarBtn = document.querySelector('.nav-btn[data-section="reviews"]');
    if (sidebarBtn) {
        sidebarBtn.addEventListener('click', () => {
            setTimeout(() => {
                const firstReviewTab = document.querySelector('#reviews .tab-btn');
                if (firstReviewTab) firstReviewTab.click();
                initReviews();
            }, 0);
        });
    }
});


