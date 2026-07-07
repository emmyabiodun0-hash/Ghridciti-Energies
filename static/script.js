/* ═══════════════════════════════════════════════
   GHRIDCITI ENERGY — DASHBOARD SCRIPT
═══════════════════════════════════════════════ */

'use strict';

// ─── STATE ─────────────────────────────────────
const state = {
  orders: [],
  walletBalance: 0,
  selectedMeter: null,
  deliveryData: null,
  currentPage: 'dashboard',
};

// ─── DOM READY ─────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initSplash();
  initSidebar();
  initMeterSelection();
  initDeliveryForm();
  
});

/* ═══════════════════════════════════
   SPLASH SCREEN
═══════════════════════════════════ */
function initSplash() {
  initParticles();

  const bar   = document.getElementById('progress-bar');
  const splash = document.getElementById('splash-screen');
  const app    = document.getElementById('app');

  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 18 + 5;
    if (progress >= 100) {
      progress = 100;
      clearInterval(interval);
      bar.style.width = '100%';

      setTimeout(() => {
        splash.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        splash.style.opacity = '0';
        splash.style.transform = 'scale(1.04)';

        setTimeout(() => {
          splash.style.display = 'none';
          app.classList.remove('hidden');
          app.style.opacity = '0';
          app.style.transition = 'opacity 0.5s ease';
          setTimeout(() => { app.style.opacity = '1'; }, 30);
          updateDashboard();
        }, 600);
      }, 400);
    }
    bar.style.width = Math.min(progress, 100) + '%';
  }, 90);
}

function initParticles() {
  const canvas = document.getElementById('particle-canvas');
  const ctx    = canvas.getContext('2d');
  let W, H, particles = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < 60; i++) {
    particles.push({
      x: Math.random() * 1920,
      y: Math.random() * 1080,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.5 + 0.1,
      color: Math.random() > 0.6 ? '#00FF3C' : '#FFC107',
    });
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color + Math.floor(p.opacity * 255).toString(16).padStart(2, '0');
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
}

/* ═══════════════════════════════════
   NAVIGATION
═══════════════════════════════════ */
function initSidebar() {
  const hamburger = document.getElementById('hamburger');
  const sidebar   = document.getElementById('sidebar');
  const overlay   = document.getElementById('sidebar-overlay');

  hamburger.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
  });
  overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
  });

  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      navigateTo(item.dataset.page);
      sidebar.classList.remove('open');
      overlay.classList.remove('open');
    });
  });
}

function navigateTo(pageId) {
  state.currentPage = pageId;

  // Update nav
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const activeNav = document.querySelector(`.nav-item[data-page="${pageId}"]`);
  if (activeNav) activeNav.classList.add('active');

  // Update pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(`page-${pageId}`);
  if (target) target.classList.add('active');

  // Scroll to top
  document.querySelector('.content').scrollTop = 0;

  // Page-specific init
  if (pageId === 'dashboard') updateDashboard();
  if (pageId === 'my-orders') renderAllOrders();
  if (pageId === 'buy-meter') resetBuyMeterToStep1();
}

/* ═══════════════════════════════════
   DASHBOARD
═══════════════════════════════════ */
function updateDashboard() {
  const total     = state.orders.length;
  const pending   = state.orders.filter(o => o.status === 'Pending').length;
  const completed = state.orders.filter(o => o.status === 'Completed').length;
  const cancelled = state.orders.filter(o => o.status === 'Cancelled').length;
  const spent     = state.orders.reduce((s, o) => s + o.price, 0);

  // Stats
  animateNumber('stat-total', total);
  animateNumber('stat-pending', pending);
  animateNumber('stat-completed', completed);
  document.getElementById('stat-spent').textContent = '₦' + spent.toLocaleString();

  // Wallet
  document.getElementById('wallet-balance').textContent  = '₦' + state.walletBalance.toLocaleString();
  document.getElementById('topbar-wallet').textContent   = '₦' + state.walletBalance.toLocaleString();

  // Empty state vs hero
  const emptyState = document.getElementById('empty-state');
  const heroBanner = document.getElementById('hero-banner');
  const dashCols   = document.getElementById('dashboard-cols');
  if (total === 0) {
    emptyState.classList.remove('hidden');
    heroBanner.classList.add('hidden');
  } else {
    emptyState.classList.add('hidden');
    heroBanner.classList.remove('hidden');
  }

  // Recent orders
  renderRecentOrders();

  // Donut
  updateDonut(completed, pending, cancelled, total);
}

function animateNumber(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let current = 0;
  const step  = Math.max(1, Math.floor(target / 20));
  const timer = setInterval(() => {
    current += step;
    if (current >= target) { current = target; clearInterval(timer); }
    el.textContent = current;
  }, 40);
}

function renderRecentOrders() {
  const tbody = document.getElementById('recent-orders-body');
  const recent = state.orders.slice(-5).reverse();

  if (recent.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="5">
      <div class="table-empty"><i class="fas fa-inbox"></i><p>No orders yet.</p>
      <small>Purchase your first prepaid meter to get started.</small></div></td></tr>`;
    return;
  }

  tbody.innerHTML = recent.map(o => `
    <tr>
      <td style="color:var(--green);font-weight:600">${o.id}</td>
      <td>${o.meter}</td>
      <td style="font-weight:700">₦${o.price.toLocaleString()}</td>
      <td><span class="badge badge-${o.status.toLowerCase()}">${o.status}</span></td>
      <td style="color:var(--text-muted)">${o.date}</td>
    </tr>`).join('');
}

function renderAllOrders() {
  const tbody = document.getElementById('all-orders-body');
  if (state.orders.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="5">
      <div class="table-empty"><i class="fas fa-inbox"></i><p>No orders yet.</p>
      <small>Purchase your first prepaid meter to get started.</small>
      <button class="btn-primary mt-sm" onclick="navigateTo('buy-meter')">Buy Meter</button></div></td></tr>`;
    return;
  }
  tbody.innerHTML = [...state.orders].reverse().map(o => `
    <tr>
      <td style="color:var(--green);font-weight:600">${o.id}</td>
      <td>${o.meter}</td>
      <td style="font-weight:700">₦${o.price.toLocaleString()}</td>
      <td><span class="badge badge-${o.status.toLowerCase()}">${o.status}</span></td>
      <td style="color:var(--text-muted)">${o.date}</td>
    </tr>`).join('');
}

function updateDonut(completed, pending, cancelled, total) {
  const circumference = 314;
  const completedPct  = total ? (completed / total) * circumference : 0;
  const pendingPct    = total ? (pending   / total) * circumference : 0;
  const cancelledPct  = total ? (cancelled / total) * circumference : 0;

  const completedOffset = 78.5;
  const pendingOffset   = completedOffset - completedPct;
  const cancelledOffset = pendingOffset   - pendingPct;

  setTimeout(() => {
    setDonutSeg('donut-completed', completedPct, circumference, completedOffset);
    setDonutSeg('donut-pending',   pendingPct,   circumference, pendingOffset);
    setDonutSeg('donut-cancelled', cancelledPct, circumference, cancelledOffset);
  }, 300);

  const pct = n => total ? Math.round((n / total) * 100) : 0;
  document.getElementById('leg-completed').textContent = `${pct(completed)}% (${completed})`;
  document.getElementById('leg-pending').textContent   = `${pct(pending)}% (${pending})`;
  document.getElementById('leg-cancelled').textContent = `${pct(cancelled)}% (${cancelled})`;
}

function setDonutSeg(id, filled, total, offset) {
  const el = document.getElementById(id);
  if (!el) return;
  el.setAttribute('stroke-dasharray', `${filled} ${total - filled}`);
  el.setAttribute('stroke-dashoffset', offset);
}

/* ═══════════════════════════════════
   BUY METER — STEP 1: SELECT
═══════════════════════════════════ */
function initMeterSelection() {
  document.querySelectorAll('.meter-select-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.meter-card');
      state.selectedMeter = {
        name:  card.dataset.meter,
        price: parseInt(card.dataset.price),
      };
      document.querySelectorAll('.meter-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      showDeliveryForm();
    });
  });
}

function resetBuyMeterToStep1() {
  showEl('meter-selection');
  hideEl('delivery-form-wrap');
  hideEl('payment-wrap');
  hideEl('success-wrap');
  setStep(1);
}

/* ─── STEP HELPERS ─── */
function setStep(n) {
  for (let i = 1; i <= 4; i++) {
    const s = document.getElementById(`step-${i}`);
    if (!s) continue;
    s.classList.remove('active', 'done');
    if (i < n) s.classList.add('done');
    if (i === n) s.classList.add('active');
  }
}
function showEl(id) { document.getElementById(id)?.classList.remove('hidden'); }
function hideEl(id) { document.getElementById(id)?.classList.add('hidden'); }

/* ─── SHOW SECTIONS ─── */
function showDeliveryForm() {
  hideEl('meter-selection');
  hideEl('payment-wrap');
  hideEl('success-wrap');
  showEl('delivery-form-wrap');
  setStep(2);

  if (state.selectedMeter) {
    const total = state.selectedMeter.price + 5000;
    document.getElementById('sum-meter').textContent = state.selectedMeter.name;
    document.getElementById('sum-total').textContent = '₦' + total.toLocaleString();
  }
}

function showMeterSelection() {
  hideEl('delivery-form-wrap');
  hideEl('payment-wrap');
  hideEl('success-wrap');
  showEl('meter-selection');
  setStep(1);
}

function showPayment() {
  hideEl('delivery-form-wrap');
  hideEl('meter-selection');
  hideEl('success-wrap');
  showEl('payment-wrap');
  setStep(3);

  const d = state.deliveryData;
  document.getElementById('pay-name').textContent   = d.name;
  document.getElementById('pay-email').textContent  = d.email;
  document.getElementById('pay-meter').textContent  = state.selectedMeter.name;
  const total = state.selectedMeter.price + 5000;
  document.getElementById('pay-amount').textContent = '₦' + total.toLocaleString();
}

function showSuccess() {
  hideEl('payment-wrap');
  showEl('success-wrap');
  setStep(4);
  addOrder();
}

/* ═══════════════════════════════════
   BUY METER — STEP 2: DELIVERY FORM
═══════════════════════════════════ */
function initDeliveryForm() {
  const form = document.getElementById('delivery-form');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!validateDeliveryForm()) return;

    state.deliveryData = {
      name:     document.getElementById('f-name').value.trim(),
      phone:    document.getElementById('f-phone').value.trim(),
      email:    document.getElementById('f-email').value.trim(),
      addr1:    document.getElementById('f-addr1').value.trim(),
      addr2:    document.getElementById('f-addr2').value.trim(),
      city:     document.getElementById('f-city').value.trim(),
      state_:   document.getElementById('f-state').value.trim(),
      zip:      document.getElementById('f-zip').value.trim(),
      landmark: document.getElementById('f-landmark').value.trim(),
      date:     new Date().toLocaleDateString('en-NG', { year:'numeric', month:'long', day:'numeric' }),
    };

    prepareEmailSubmission(state.deliveryData);
    showPayment();
  });
}

function validateDeliveryForm() {
  const required = ['f-name','f-phone','f-email','f-addr1','f-city','f-state','f-zip'];
  let valid = true;
  required.forEach(id => {
    const el = document.getElementById(id);
    if (!el.value.trim()) {
      el.classList.add('error');
      el.addEventListener('input', () => el.classList.remove('error'), { once: true });
      valid = false;
    }
  });
  if (!valid) showToast('Please fill in all required fields.');
  return valid;
}

/* ─── EMAIL PLACEHOLDER (for EmailJS / Flask integration) ─── */
function prepareEmailSubmission(data) {
  const emailPayload = {
    to:      'emmyabiodun0@gmail.com',
    subject: 'New Prepaid Meter Delivery Request',
    body: `
Customer Name:   ${data.name}
Phone Number:    ${data.phone}
Email:           ${data.email}
Selected Meter:  ${state.selectedMeter?.name}
Address Line 1:  ${data.addr1}
Address Line 2:  ${data.addr2 || 'N/A'}
City:            ${data.city}
State:           ${data.state_}
ZIP Code:        ${data.zip}
Landmark:        ${data.landmark || 'N/A'}
Order Date:      ${data.date}
Order Status:    Pending Review
    `.trim(),
  };

  console.log('[Ghridciti Energy] Email Payload Ready:', emailPayload);

  // ── EMAILJS INTEGRATION PLACEHOLDER ──────────────────────
  // Uncomment and configure when ready:
  //
  // emailjs.send('YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID', {
  //   to_email:      emailPayload.to,
  //   subject:       emailPayload.subject,
  //   customer_name: data.name,
  //   phone:         data.phone,
  //   email:         data.email,
  //   meter:         state.selectedMeter?.name,
  //   addr1:         data.addr1,
  //   addr2:         data.addr2,
  //   city:          data.city,
  //   state:         data.state_,
  //   zip:           data.zip,
  //   landmark:      data.landmark,
  //   date:          data.date,
  // }).then(() => console.log('Email sent successfully'))
  //   .catch(err => console.error('Email error:', err));
  //
  // ── FLASK INTEGRATION PLACEHOLDER ────────────────────────
  // fetch('/api/send-delivery-email', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(emailPayload),
  // });

  return emailPayload;
}

/* ═══════════════════════════════════
   PAYMENT — STEP 3 (REAL PAYSTACK)
═══════════════════════════════════ */
function processPayment() {

    const total = (state.selectedMeter?.price || 0) + 5000;
    const d = state.deliveryData;

    if (!d) {
        showToast("Missing delivery information.");
        return;
    }

    fetch("/save-order", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: d.name,
            phone: d.phone,
            email: d.email,

            addr1: d.addr1,
            addr2: d.addr2,

            city: d.city,
            state: d.state_,
            zip: d.zip,

            landmark: d.landmark,

            meter: state.selectedMeter?.name,

            amount: total
        })
    })

    .then(response => response.json())

    .then(data => {

        if (!data.success) {

            showToast(data.message || "Unable to start payment.");

            return;

        }

        // Redirect customer to Paystack Checkout
        window.location.href = data.authorization_url;

    })

    .catch(error => {

        console.error(error);

        showToast("Something went wrong.");

    });

}


/* ═══════════════════════════════════
   ORDER MANAGEMENT
═══════════════════════════════════ */
function addOrder() {
  const id = '#ORD-' + new Date().getFullYear() + '-' + String(state.orders.length + 1).padStart(3, '0');
  state.orders.push({
    id,
    meter:  state.selectedMeter.name,
    price:  state.selectedMeter.price + 5000,
    status: 'Pending',
    date:   new Date().toLocaleDateString('en-NG', { year:'numeric', month:'short', day:'numeric' }),
  });

  // Reset selection
  state.selectedMeter  = null;
  state.deliveryData   = null;

  showToast('Order placed successfully! 🎉');
  document.querySelectorAll('.meter-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('delivery-form')?.reset();

  updateDashboard();
}

/* ═══════════════════════════════════
   SUPPORT — FAQ TOGGLE
═══════════════════════════════════ */
function toggleFaq(btn) {
  const answer = btn.nextElementSibling;
  const isOpen = btn.classList.contains('open');

  // Close all
  document.querySelectorAll('.faq-q').forEach(q => {
    q.classList.remove('open');
    q.nextElementSibling.classList.remove('open');
  });

  if (!isOpen) {
    btn.classList.add('open');
    answer.classList.add('open');
  }
}


/* ═══════════════════════════════════
   TOAST NOTIFICATION
═══════════════════════════════════ */
let toastTimer = null;
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}

/* ═══════════════════════════════════
   SCROLL REVEAL (IntersectionObserver)
═══════════════════════════════════ */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.1 });

function initReveal() {
  document.querySelectorAll('.stat-card, .meter-card, .faq-card, .glass-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(16px)';
    el.style.transition = 'opacity 0.45s ease, transform 0.45s ease';
    revealObserver.observe(el);
  });
}

// Init reveal after splash clears
setTimeout(initReveal, 3200);




const TIMEOUT = 10 * 60 * 1000;

let timer;

function logout() {
    window.location.href = "/logout";
}

function resetTimer() {
    clearTimeout(timer);
    timer = setTimeout(logout, TIMEOUT);
}

[
    "mousemove",
    "mousedown",
    "click",
    "scroll",
    "keydown",
    "touchstart",
    "touchmove"
].forEach(event => {
    document.addEventListener(event, resetTimer, true);
});

resetTimer();
