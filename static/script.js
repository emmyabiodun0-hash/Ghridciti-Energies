/* ═══════════════════════════════════════════════
   GHRIDCITI ENERGY — SHARED SCRIPT (loaded on every page)
   Only handles features common to every page. Every element
   lookup is checked before use so this never throws on pages
   that don't have a particular element.
═══════════════════════════════════════════════ */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  initSplash();
  initSidebar();
  initDonut();
  initReveal();
  initLogoutTimer();
});

/* ═══════════════════════════════════
   SPLASH SCREEN
═══════════════════════════════════ */
function initSplash() {
  const bar    = document.getElementById('progress-bar');
  const splash = document.getElementById('splash-screen');
  const app    = document.getElementById('app');
  if (!bar || !splash || !app) return;

  initParticles();

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
        }, 600);
      }, 400);
    }
    bar.style.width = Math.min(progress, 100) + '%';
  }, 90);
}

function initParticles() {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  let W, H;
  const particles = [];

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
   SIDEBAR (mobile hamburger toggle)
═══════════════════════════════════ */
function initSidebar() {
  const hamburger = document.getElementById('hamburger');
  const sidebar   = document.getElementById('sidebar');
  const overlay   = document.getElementById('sidebar-overlay');
  if (!hamburger || !sidebar || !overlay) return;

  hamburger.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
  });
  overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
  });

  // Close the mobile sidebar automatically once a nav link is tapped
  document.querySelectorAll('.nav-item[href]').forEach(item => {
    item.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('open');
    });
  });
}

/* ═══════════════════════════════════
   DASHBOARD DONUT CHART
   (values come from Flask via data-* attributes on #donut-card
   — only present on dashboard.html, so this is a no-op elsewhere)
═══════════════════════════════════ */
function initDonut() {
  const card = document.getElementById('donut-card');
  if (!card) return;

  const total      = parseInt(card.dataset.total, 10)      || 0;
  const delivered  = parseInt(card.dataset.delivered, 10)  || 0;
  const pending    = parseInt(card.dataset.pending, 10)    || 0;
  const dispatched = parseInt(card.dataset.dispatched, 10) || 0;

  const circumference = 314;
  const deliveredPct  = total ? (delivered  / total) * circumference : 0;
  const pendingPct    = total ? (pending    / total) * circumference : 0;
  const dispatchedPct = total ? (dispatched / total) * circumference : 0;

  const deliveredOffset  = 78.5;
  const pendingOffset    = deliveredOffset - deliveredPct;
  const dispatchedOffset = pendingOffset   - pendingPct;

  setTimeout(() => {
    setDonutSeg('donut-delivered',  deliveredPct,  circumference, deliveredOffset);
    setDonutSeg('donut-pending',    pendingPct,    circumference, pendingOffset);
    setDonutSeg('donut-dispatched', dispatchedPct, circumference, dispatchedOffset);
  }, 300);
}

function setDonutSeg(id, filled, total, offset) {
  const el = document.getElementById(id);
  if (!el) return;
  el.setAttribute('stroke-dasharray', `${filled} ${total - filled}`);
  el.setAttribute('stroke-dashoffset', offset);
}

/* ═══════════════════════════════════
   SUPPORT — FAQ TOGGLE
   (only called from support.html, but defensive anyway)
═══════════════════════════════════ */
function toggleFaq(btn) {
  if (!btn) return;
  const answer = btn.nextElementSibling;
  if (!answer) return;
  const isOpen = btn.classList.contains('open');

  document.querySelectorAll('.faq-q').forEach(q => {
    q.classList.remove('open');
    if (q.nextElementSibling) q.nextElementSibling.classList.remove('open');
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
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}

/* ═══════════════════════════════════
   SCROLL REVEAL (IntersectionObserver)
═══════════════════════════════════ */
function initReveal() {
  const targets = document.querySelectorAll('.stat-card, .meter-card, .faq-card, .glass-card');
  if (!targets.length) return;

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.1 });

  targets.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(16px)';
    el.style.transition = 'opacity 0.45s ease, transform 0.45s ease';
    revealObserver.observe(el);
  });

  // Splash takes ~1.4s; give elements time to be visible before revealing
  setTimeout(() => {
    targets.forEach(el => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });
  }, 1600);
}

/* ═══════════════════════════════════
   AUTO LOGOUT ON INACTIVITY
═══════════════════════════════════ */
function initLogoutTimer() {
  const TIMEOUT = 10 * 60 * 1000;
  let timer;

  function resetTimer() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      window.location.href = (window.ROUTES && window.ROUTES.logout) || '/logout';
    }, TIMEOUT);
  }

  ['mousemove', 'mousedown', 'click', 'scroll', 'keydown', 'touchstart', 'touchmove'].forEach(evt => {
    document.addEventListener(evt, resetTimer, true);
  });

  resetTimer();
}