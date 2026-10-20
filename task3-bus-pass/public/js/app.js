/**
 * Task 3 — Cloud-Based Bus Pass System
 * Frontend Application Logic
 */
const API = '';

// ── State ────────────────────────────────
let token = localStorage.getItem('buspass_token');
let currentUser = null;
let passTypes = [];
let routes = [];

// ── Init ─────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (token) {
    showDashboard();
  }
  setupAuthTabs();
  setupLoginForm();
  setupRegisterForm();
  setupSidebar();
  setupLogout();
  setupApplyForm();
});

// ── Auth Tabs ────────────────────────────
function setupAuthTabs() {
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`${tab.dataset.tab}-form`).classList.add('active');
    });
  });
}

// ── Login ────────────────────────────────
function setupLoginForm() {
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('login-btn');
    const errEl = document.getElementById('login-error');
    setLoading(btn, true);
    errEl.textContent = '';

    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: document.getElementById('login-email').value,
          password: document.getElementById('login-password').value
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      token = data.token;
      localStorage.setItem('buspass_token', token);
      currentUser = data.user;
      showDashboard();
    } catch (err) {
      errEl.textContent = err.message;
    } finally {
      setLoading(btn, false);
    }
  });
}

// ── Register ─────────────────────────────
function setupRegisterForm() {
  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('reg-btn');
    const errEl = document.getElementById('register-error');
    setLoading(btn, true);
    errEl.textContent = '';

    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: document.getElementById('reg-name').value,
          email: document.getElementById('reg-email').value,
          password: document.getElementById('reg-password').value,
          phone: document.getElementById('reg-phone').value,
          address: document.getElementById('reg-address').value
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      token = data.token;
      localStorage.setItem('buspass_token', token);
      currentUser = data.user;
      showDashboard();
    } catch (err) {
      errEl.textContent = err.message;
    } finally {
      setLoading(btn, false);
    }
  });
}

// ── Show Dashboard ───────────────────────
async function showDashboard() {
  document.getElementById('auth-screen').classList.remove('active');
  document.getElementById('dashboard-screen').classList.add('active');

  try {
    const res = await authFetch('/api/auth/me');
    if (!res.ok) throw new Error('Session expired');
    currentUser = await res.json();
    document.getElementById('nav-user-name').textContent = currentUser.full_name;
  } catch (err) {
    logout();
    return;
  }

  loadOverview();
  loadPassTypes();
  loadRoutes();
}

// ── Sidebar ──────────────────────────────
function setupSidebar() {
  document.querySelectorAll('.sidebar-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`section-${btn.dataset.section}`).classList.add('active');

      // Load data for section
      switch (btn.dataset.section) {
        case 'overview': loadOverview(); break;
        case 'passes': loadPasses(); break;
        case 'transactions': loadTransactions(); break;
        case 'routes': loadRouteCards(); break;
      }
    });
  });
}

// ── Logout ───────────────────────────────
function setupLogout() {
  document.getElementById('logout-btn').addEventListener('click', logout);
}

function logout() {
  token = null;
  currentUser = null;
  localStorage.removeItem('buspass_token');
  document.getElementById('dashboard-screen').classList.remove('active');
  document.getElementById('auth-screen').classList.add('active');
}

// ── Overview ─────────────────────────────
async function loadOverview() {
  try {
    const [passesRes, txnsRes] = await Promise.all([
      authFetch('/api/passes/my-passes'),
      authFetch('/api/passes/my-transactions')
    ]);
    const passes = await passesRes.json();
    const txns = await txnsRes.json();

    const activePasses = passes.filter(p => p.status === 'active');
    const totalSpent = txns.reduce((sum, t) => sum + t.amount, 0);

    document.getElementById('ov-active').textContent = activePasses.length;
    document.getElementById('ov-apps').textContent = passes.length;
    document.getElementById('ov-spent').textContent = `$${totalSpent.toFixed(2)}`;

    // Recent passes
    const recentEl = document.getElementById('recent-passes');
    if (passes.length === 0) {
      recentEl.innerHTML = '<div class="empty-state"><div class="empty-icon">🎫</div><p>No passes yet. Apply for your first pass!</p></div>';
    } else {
      recentEl.innerHTML = passes.slice(0, 3).map(renderPassCard).join('');
    }
  } catch (err) {
    console.error('Overview load error:', err);
  }
}

// ── Pass Types ───────────────────────────
async function loadPassTypes() {
  try {
    const res = await authFetch('/api/passes/types');
    passTypes = await res.json();

    const container = document.getElementById('pass-type-list');
    container.innerHTML = passTypes.map(pt => `
      <div class="pass-type-card" data-id="${pt.id}" data-price="${pt.price}" data-name="${esc(pt.name)}">
        <div class="pt-name">${esc(pt.name)}</div>
        <div class="pt-desc">${esc(pt.description)}</div>
        <div class="pt-meta">
          <span class="pt-price">$${pt.price.toFixed(2)}</span>
          <span class="pt-duration">${pt.duration_days} days</span>
        </div>
      </div>
    `).join('');

    // Click to select
    container.querySelectorAll('.pass-type-card').forEach(card => {
      card.addEventListener('click', () => {
        container.querySelectorAll('.pass-type-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        document.getElementById('selected-pass-id').value = card.dataset.id;
        document.getElementById('selected-pass-display').value = card.dataset.name;
        document.getElementById('price-value').textContent = `$${parseFloat(card.dataset.price).toFixed(2)}`;
        document.getElementById('price-display').style.display = 'block';
        document.getElementById('apply-btn').disabled = false;
      });
    });
  } catch (err) {
    console.error('Pass types load error:', err);
  }
}

// ── Routes ───────────────────────────────
async function loadRoutes() {
  try {
    const res = await authFetch('/api/passes/routes');
    routes = await res.json();

    const select = document.getElementById('select-route');
    select.innerHTML = '<option value="">All Routes (Unrestricted)</option>' +
      routes.map(r => `<option value="${r.id}">${r.route_number}: ${esc(r.origin)} → ${esc(r.destination)}</option>`).join('');

    loadRouteCards();
  } catch (err) {
    console.error('Routes load error:', err);
  }
}

function loadRouteCards() {
  const container = document.getElementById('routes-list');
  if (routes.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">🗺️</div><p>No routes available.</p></div>';
    return;
  }
  container.innerHTML = routes.map(r => `
    <div class="route-card">
      <div class="route-number">${esc(r.route_number)}</div>
      <div class="route-path">
        <span class="from">${esc(r.origin)}</span>
        <span class="arrow">→</span>
        <span class="to">${esc(r.destination)}</span>
      </div>
      <div class="route-stops">🚏 ${esc(r.stops || 'Direct route')}</div>
    </div>
  `).join('');
}

// ── Apply Form ───────────────────────────
function setupApplyForm() {
  document.getElementById('apply-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('apply-btn');
    const resultEl = document.getElementById('apply-result');
    setLoading(btn, true);
    resultEl.innerHTML = '';

    const passTypeId = document.getElementById('selected-pass-id').value;
    if (!passTypeId) {
      resultEl.innerHTML = '<div class="result-box danger"><div class="result-title">Select a pass type first</div></div>';
      setLoading(btn, false);
      return;
    }

    try {
      const idempotencyKey = `apply-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const res = await authFetch('/api/passes/apply', {
        method: 'POST',
        body: JSON.stringify({
          pass_type_id: parseInt(passTypeId),
          route_id: document.getElementById('select-route').value ? parseInt(document.getElementById('select-route').value) : null,
          payment_method: document.getElementById('payment-method').value,
          idempotency_key: idempotencyKey
        })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Application failed');

      resultEl.innerHTML = `
        <div class="result-box success">
          <div class="result-title">✅ Pass Issued Successfully!</div>
          <div class="result-detail">
            Pass Number: <strong>${esc(data.pass_number)}</strong><br>
            Transaction: ${esc(data.transaction_id)}<br>
            Valid: ${data.start_date} → ${data.end_date}<br>
            Amount: $${data.amount.toFixed(2)}
          </div>
        </div>
      `;

      loadOverview();
    } catch (err) {
      resultEl.innerHTML = `<div class="result-box danger"><div class="result-title">❌ ${esc(err.message)}</div></div>`;
    } finally {
      setLoading(btn, false);
    }
  });
}

// ── My Passes ────────────────────────────
async function loadPasses() {
  const container = document.getElementById('passes-list');
  container.innerHTML = '<div class="loading-state"><span class="spinner"></span> Loading passes...</div>';

  try {
    const res = await authFetch('/api/passes/my-passes');
    const passes = await res.json();

    if (passes.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">💳</div><p>No passes found. Apply for one!</p></div>';
      return;
    }
    container.innerHTML = passes.map(renderPassCard).join('');
  } catch (err) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><p>Failed to load passes.</p></div>';
  }
}

function renderPassCard(p) {
  const statusClass = p.status === 'active' ? 'status-active' : p.status === 'expired' ? 'status-expired' : 'status-pending';
  return `
    <div class="pass-card ${p.status === 'expired' ? 'expired' : ''}">
      <div class="pass-header">
        <span class="pass-number">${esc(p.pass_number)}</span>
        <span class="pass-status ${statusClass}">${p.status}</span>
      </div>
      <div class="pass-type-name">${esc(p.pass_type_name)}</div>
      ${p.route_number ? `<div class="pass-route">🚌 ${esc(p.route_number)}: ${esc(p.origin)} → ${esc(p.destination)}</div>` : '<div class="pass-route">🚌 All Routes</div>'}
      <div class="pass-dates">
        <span>📅 ${p.start_date}</span>
        <span>→ ${p.end_date}</span>
      </div>
      <div class="pass-actions">
        ${p.status === 'active' || p.status === 'expired' ? `<button class="btn btn-sm btn-outline" onclick="renewPass(${p.id})">🔄 Renew</button>` : ''}
      </div>
    </div>
  `;
}

// ── Renew Pass ───────────────────────────
async function renewPass(passId) {
  if (!confirm('Renew this pass?')) return;

  try {
    const idempotencyKey = `renew-${passId}-${Date.now()}`;
    const res = await authFetch(`/api/passes/renew/${passId}`, {
      method: 'POST',
      body: JSON.stringify({
        idempotency_key: idempotencyKey,
        payment_method: 'card'
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Renewal failed');

    alert(`Pass renewed! New end date: ${data.new_end_date}\nAmount: $${data.amount.toFixed(2)}`);
    loadPasses();
    loadOverview();
  } catch (err) {
    alert('Renewal failed: ' + err.message);
  }
}

// ── Transactions ─────────────────────────
async function loadTransactions() {
  const tbody = document.getElementById('transactions-body');
  tbody.innerHTML = '<tr><td colspan="6"><div class="loading-state"><span class="spinner"></span> Loading...</div></td></tr>';

  try {
    const res = await authFetch('/api/passes/my-transactions');
    const txns = await res.json();

    if (txns.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">📜</div><p>No transactions yet.</p></div></td></tr>';
      return;
    }

    tbody.innerHTML = txns.map(t => `
      <tr>
        <td><code>${esc(t.transaction_id)}</code></td>
        <td>${esc(t.pass_type_name)}</td>
        <td><strong>$${t.amount.toFixed(2)}</strong></td>
        <td>${esc(t.payment_method)}</td>
        <td><span class="tag tag-${t.status}">${t.status}</span></td>
        <td>${new Date(t.created_at).toLocaleDateString()}</td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="6">Failed to load transactions.</td></tr>';
  }
}

// ── Helpers ──────────────────────────────
function authFetch(url, options = {}) {
  return fetch(`${API}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    }
  });
}

function setLoading(btn, loading) {
  const text = btn.querySelector('.btn-text');
  const spinner = btn.querySelector('.spinner');
  btn.disabled = loading;
  if (text) text.style.display = loading ? 'none' : 'inline';
  if (spinner) spinner.style.display = loading ? 'inline-block' : 'none';
}

function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
