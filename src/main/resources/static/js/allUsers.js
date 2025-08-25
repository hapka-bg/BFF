import {apiFetch} from "./jwtFetch.js";


const SELECTORS = {
    section: '#users-staff',
    table: '#staffTable',
    tbody: '#staffTable tbody',
    search: '#staffSearch',
    navBtn: '.nav-btn[data-section="users-staff"]',
};

const PATHS = {
    edit: 'edit-user.html',
};

const state = {
    users: [],
    initialized: false,
};

function $(sel, root = document) {
    const el = root.querySelector(sel);
    if (!el) console.error(`Element not found: ${sel}`);
    return el;
}

function escapeHTML(str = '') {
    return String(str)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function formatMoney(amount, currency = 'USD') {
    if (amount == null || amount === '') return '';
    try {
        return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency,
            maximumFractionDigits: 0,
        }).format(Number(amount));
    } catch {
        return `$${Number(amount).toLocaleString()}`;
    }
}

async function fetchUsers() {
    const res = await apiFetch('http://localhost:8082/api/v1/staff/all', { method: 'GET' });
    if (!res.ok) throw new Error(`Failed to load users (${res.status})`);
    const json = await res.json();
    return Array.isArray(json) ? json : json.data || [];
}

function renderLoading() {
    const tbody = $(SELECTORS.tbody);
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="5">Loading staff...</td></tr>`;
}

function renderError(message = 'Failed to load staff.') {
    const tbody = $(SELECTORS.tbody);
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="5">${escapeHTML(message)}</td></tr>`;
}

function normalizeUser(u) {
    const id = u.id ?? u.userId ?? u._id ?? '';
    const first = u.firstName ?? u.firstname ?? '';
    const last = u.lastName ?? u.lastname ?? '';
    const name = u.name ?? [first, last].filter(Boolean).join(' ') ?? '';
    const role = u.role ?? u.title ?? '';
    const email = u.email ?? u.mail ?? '';
    const salary =
        u.salary ??
        u.baseSalary ??
        (u.compensation && (u.compensation.amount ?? u.compensation.value));
    const currency =
        u.currency ??
        (u.compensation && (u.compensation.currency ?? u.compensation.code)) ??
        'USD';

    return { id, name: name.trim(), role: role.trim(), email: email.trim(), salary, currency };
}

function renderRows(usersRaw) {
    const tbody = $(SELECTORS.tbody);
    if (!tbody) return;

    const users = (usersRaw || []).map(normalizeUser);

    if (users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5">No staff found.</td></tr>`;
        return;
    }

    tbody.innerHTML = users.map(u => `
      <tr data-user-id="${escapeHTML(String(u.id ?? ''))}">
        <td>${escapeHTML(u.name)}</td>
        <td>${escapeHTML(u.role)}</td>
        <td>${escapeHTML(u.email)}</td>
        <td>${formatMoney(u.salary, u.currency)}</td>
        <td><button class="btn small edit-btn" type="button" data-user-id="${escapeHTML(String(u.id ?? ''))}">Edit</button></td>
      </tr>
    `).join('');
}

function bindEvents() {
    const table = $(SELECTORS.table);
    if (!table) return;
    table.addEventListener('click', e => {
        const btn = e.target.closest('.edit-btn');
        if (!btn) return;
        const userId = btn.dataset.userId;
        if (userId) {
            window.location.href = `${PATHS.edit}?userId=${encodeURIComponent(userId)}`;
        }
    });
}

async function init() {
    if (state.initialized) return;
    state.initialized = true;

    renderLoading();
    try {
        const users = await fetchUsers();
        state.users = users;
        renderRows(users);
    } catch (err) {
        console.error(err);
        renderError('Could not load staff. Please try again.');
    }
    bindEvents();
}

// Wait for DOM, then bind nav button click
document.addEventListener('DOMContentLoaded', () => {
    const navBtn = $(SELECTORS.navBtn);
    if (navBtn) {
        navBtn.addEventListener('click', () => {
            const section = $(SELECTORS.section);
            if (section) init();
        });
    }
});

// Optional refresh hook
window.StaffModule = {
    refresh: async () => {
        renderLoading();
        try {
            const users = await fetchUsers();
            state.users = users;
            renderRows(users);
        } catch (err) {
            console.error(err);
            renderError('Could not refresh staff.');
        }
    },
};
