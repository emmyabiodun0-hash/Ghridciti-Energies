/* ═══════════════════════════════════════════════
   DELIVERY ADDRESS — STEP 2
   Reads the meter chosen on step 1, fills in the order
   summary, validates the form, stores the delivery data,
   then sends the customer to the Review & Pay page.
═══════════════════════════════════════════════ */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('delivery-form');
  if (!form) return;

  const selectedMeter = getSelectedMeter();

  // If nobody picked a meter yet, send them back to step 1
  if (!selectedMeter) {
    if (window.ROUTES && window.ROUTES.applyMeter) {
      window.location.href = window.ROUTES.applyMeter;
    }
    return;
  }

  const sumMeter = document.getElementById('sum-meter');
  const sumTotal = document.getElementById('sum-total');
  const total = (selectedMeter.price || 0) + 5000;
  if (sumMeter) sumMeter.textContent = selectedMeter.name || '—';
  if (sumTotal) sumTotal.textContent = '₦' + total.toLocaleString();

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!validateDeliveryForm()) return;

    const deliveryData = {
      name:     getValue('f-name'),
      phone:    getValue('f-phone'),
      email:    getValue('f-email'),
      addr1:    getValue('f-addr1'),
      addr2:    getValue('f-addr2'),
      city:     getValue('f-city'),
      state_:   getValue('f-state'),
      zip:      getValue('f-zip'),
      landmark: getValue('f-landmark'),
      date:     new Date().toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' }),
    };

    sessionStorage.setItem('ghridciti_deliveryData', JSON.stringify(deliveryData));

    if (window.ROUTES && window.ROUTES.payment) {
      window.location.href = window.ROUTES.payment;
    }
  });
});

function getValue(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function getSelectedMeter() {
  try {
    return JSON.parse(sessionStorage.getItem('ghridciti_selectedMeter'));
  } catch {
    return null;
  }
}

function validateDeliveryForm() {
  const required = ['f-name', 'f-phone', 'f-email', 'f-addr1', 'f-city', 'f-state', 'f-zip'];
  let valid = true;
  required.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (!el.value.trim()) {
      el.classList.add('error');
      el.addEventListener('input', () => el.classList.remove('error'), { once: true });
      valid = false;
    }
  });
  if (!valid && typeof showToast === 'function') {
    showToast('Please fill in all required fields.');
  }
  return valid;
}