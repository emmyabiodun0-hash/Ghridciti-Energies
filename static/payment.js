/* ═══════════════════════════════════════════════
   REVIEW & PAY — STEP 3
   Reads the meter + delivery data collected in steps 1-2,
   displays them for review, and on "Pay with Paystack"
   posts the order to the existing /save-order endpoint
   (unchanged backend) and redirects to Paystack checkout.
   After a successful payment, Paystack's callback_url takes
   the customer to the existing /payment-success route —
   sessionStorage is never used again after this point.
═══════════════════════════════════════════════ */

'use strict';

let ghridcitiSelectedMeter = null;
let ghridcitiDeliveryData  = null;

document.addEventListener('DOMContentLoaded', () => {
  const payBtn = document.getElementById('pay-btn');
  if (!payBtn) return; // not on the payment page

  try {
    ghridcitiSelectedMeter = JSON.parse(sessionStorage.getItem('ghridciti_selectedMeter'));
  } catch {
    ghridcitiSelectedMeter = null;
  }
  try {
    ghridcitiDeliveryData = JSON.parse(sessionStorage.getItem('ghridciti_deliveryData'));
  } catch {
    ghridcitiDeliveryData = null;
  }

  // If either step was skipped, send the customer back to the start
  if (!ghridcitiSelectedMeter || !ghridcitiDeliveryData) {
    if (window.ROUTES && window.ROUTES.applyMeter) {
      window.location.href = window.ROUTES.applyMeter;
    }
    return;
  }

  const total = (ghridcitiSelectedMeter.price || 0) + 5000;
  setText('pay-name',   ghridcitiDeliveryData.name);
  setText('pay-email',  ghridcitiDeliveryData.email);
  setText('pay-meter',  ghridcitiSelectedMeter.name);
  setText('pay-amount', '₦' + total.toLocaleString());
});

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value || '—';
}

function processPayment() {
  const payBtn = document.getElementById('pay-btn');
  if (payBtn) {
    payBtn.disabled = true;
    payBtn.innerHTML = 'Please wait...';
  }

  const d = ghridcitiDeliveryData;
  const meter = ghridcitiSelectedMeter;

  if (!d || !meter) {
    if (typeof showToast === 'function') showToast('Missing delivery information.');
    if (payBtn) {
      payBtn.disabled = false;
      payBtn.innerHTML = '<i class="fas fa-bolt"></i> Pay with Paystack';
    }
    return;
  }

  const total = (meter.price || 0) + 5000;

  fetch('/save-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
      meter: meter.name,
      amount: total,
    }),
  })
    .then(response => response.json())
    .then(data => {
      if (!data.success) {
        if (typeof showToast === 'function') {
          showToast(data.message || 'Unable to start payment.');
        }
        if (payBtn) {
          payBtn.disabled = false;
          payBtn.innerHTML = '<i class="fas fa-bolt"></i> Pay with Paystack';
        }
        return;
      }

      // Order saved — clear the pre-payment handoff data.
      // Paystack's callback_url (set server-side) will land the
      // customer on /payment-success, which reads the confirmed
      // order straight from the database instead of sessionStorage.
      sessionStorage.removeItem('ghridciti_selectedMeter');
      sessionStorage.removeItem('ghridciti_deliveryData');
      window.location.href = data.authorization_url;
    })
    .catch(error => {
      console.error(error);
      if (typeof showToast === 'function') showToast('Something went wrong.');
      if (payBtn) {
        payBtn.disabled = false;
        payBtn.innerHTML = '<i class="fas fa-bolt"></i> Pay with Paystack';
      }
    });
}