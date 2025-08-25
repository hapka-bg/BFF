import {apiFetch} from "./jwtFetch.js";

(function () {
    const NS = (window.__dashboardNS = window.__dashboardNS || {
        initialized: false,
        charts: {sales: null, productSparks: []},
    });
    if (NS.initialized) return;
    NS.initialized = true;

    const HOURS = ['8 AM', '9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM', '7 PM'];

    const $ = (sel) => document.querySelector(sel);

    // ---- KPI cards ----
    function updateCards(sales, orders, staff, reviews) {
        const map = {
            sales: '.card.sales strong',
            orders: '.card.orders strong',
            staff: '.card.staff strong',
            reviews: '.card.reviews strong',
        };
        Object.entries({sales, orders, staff, reviews}).forEach(([key, val]) => {
            const el = $(map[key]);
            if (!el) return;
            el.textContent = val;
            const card = el.closest('.card');
            if (card) {
                card.classList.add('updated');
                setTimeout(() => card.classList.remove('updated'), 700);
            }
        });
    }

    async function fetchDashboardKpis() {
        const [salesRes, ordersRes, staffRes, reviewsRes] = await Promise.all([
            apiFetch('http://localhost:8083/api/v1/order_service/revenue'),
            apiFetch('http://localhost:8083/api/v1/order_service/orders'),
            apiFetch('http://localhost:8082/api/v1/staff/active'),
            apiFetch('http://localhost:8083/api/v1/order_service/reviews'),
        ]);
        const [sales, orders, staff, reviews] = await Promise.all([
            salesRes.json(),
            ordersRes.json(),
            staffRes.json(),
            reviewsRes.json(),
        ]);
        return {
            sales: `$${(sales ?? 0).toLocaleString()}`,
            orders: String(orders  ?? 0),
            staff: String(staff ?? 0),
            reviews: String(reviews ?? 0),
        };
    }

    // ---- Sales chart ----
    function renderSalesChart(todayArr, yesterdayArr) {
        const canvas = document.getElementById('salesSparkline');
        if (!canvas || !window.Chart) return;
        if (!canvas.style.height) canvas.style.height = '200px';
        if (NS.charts.sales) try {
            NS.charts.sales.destroy();
        } catch (_) {
        }

        const ctx = canvas.getContext('2d');
        NS.charts.sales = new Chart(ctx, {
            type: 'line',
            data: {
                labels: HOURS,
                datasets: [
                    {
                        label: 'Today',
                        data: todayArr,
                        borderColor: '#2f80ed',
                        backgroundColor: 'rgba(47,128,237,0.1)',
                        tension: 0.3
                    },
                    {
                        label: 'Yesterday',
                        data: yesterdayArr,
                        borderColor: '#999',
                        backgroundColor: 'rgba(153,153,153,0.1)',
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {mode: 'index', intersect: false},
                plugins: {legend: {display: false}},
                scales: {x: {grid: {display: false}}, y: {display: false, beginAtZero: true}},
                elements: {point: {radius: 0}}
            }
        });
    }

    async function fetchSalesHistory() {
        const res = await apiFetch('http://localhost:8083/api/v1/order_service/salesChart');
        return res.json(); // { today: [...], yesterday: [...] }
    }

    // ---- Top products ----
    function renderTopProducts(products) {
        const ul = document.getElementById('topProducts');
        if (!ul) return;

        // Destroy old charts
        if (Array.isArray(NS.charts.productSparks)) {
            NS.charts.productSparks.forEach(ch => {
                if (ch instanceof Chart) ch.destroy();
            });
        }
        NS.charts.productSparks = [];

        // Render HTML
        ul.innerHTML = products.map((p, i) => `
        <li class="product-item">
            <img src="${p.imageURL}" alt="${p.name}">
            <div class="product-meta">
                <h4>${p.name}</h4>
                <small>${p.units} units</small>
            </div>
            <canvas id="spark-${i}" style="height:40px"></canvas>
        </li>
    `).join('');

        // Render charts
        products.forEach((p, i) => {
            const ctx = document.getElementById(`spark-${i}`).getContext('2d');

            // Force labels to be strings so Chart.js uses category scale
            const labels = p.spark.map((_, idx) => `${idx + 1}`);

            const chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels,
                    datasets: [{
                        data: p.spark,
                        borderColor: '#27ae60',
                        backgroundColor: 'rgba(39,174,96,0.1)',
                        tension: 0.3,
                        spanGaps: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: {
                            type: 'category',
                            display: false,
                            offset: false,       // no extra space left/right
                            min: 0,
                            max: labels.length - 1
                        },
                        y: { display: false }
                    },
                    elements: { point: { radius: 0 } }
                }
            });

            NS.charts.productSparks.push(chart);
        });


    }




    async function fetchTopProducts() {
        const res = await apiFetch('http://localhost:8083/api/v1/order_service/top5');
        return res.json(); // [{ image, name, units, spark: [...] }]
    }

    // ---- Heatmap ----
    function renderInventoryHeatmap(rows) {
        const tbody = document.querySelector('#inventoryHeatmap tbody');
        if (!tbody) return;

        const heatColor = (n) =>
            n <= 10 ? '#eb5757' :
                n <= 50 ? '#f2994a' :
                    n <= 100 ? '#f2c94c' :
                        '#27ae60';

        tbody.innerHTML = rows.map(r => {
            const cells = r.counts
                .map(v => `<td style="background:${heatColor(v)};color:#000">${v}</td>`)
                .join('');
            return `<tr><th>${r.category}</th>${cells}</tr>`;
        }).join('');
    }


    async function fetchInventoryHeatmap() {
        const res = await apiFetch('http://localhost:8083/api/v1/order_service/heatmap');
        return res.json(); // [{ category, counts: [...] }]
    }

    // ---- Init ----
    let dashboardRunning = false;
    async function initDashboard() {
        if (dashboardRunning) return;
        dashboardRunning = true;
        try {
            const [kpis, salesData, topProducts, heatmapData] = await Promise.all([
                fetchDashboardKpis(),
                fetchSalesHistory(),
                fetchTopProducts(),
                fetchInventoryHeatmap()
            ]);

            updateCards(kpis.sales, kpis.orders, kpis.staff, kpis.reviews);

            renderSalesChart(salesData.todayCounts, salesData.yesterdayCounts);

            renderTopProducts(topProducts);

            renderInventoryHeatmap(heatmapData);

        } catch (err) {
            console.error('Dashboard init error:', err);
        }
        finally {
            dashboardRunning = false;
        }
    }


    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDashboard, {once: true});
    } else {
        initDashboard();
    }
})();
