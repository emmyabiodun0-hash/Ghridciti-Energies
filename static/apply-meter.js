/* ═══════════════════════════════════════════════
   APPLY FOR A PREPAID METER — STEP 1 (meter selection)
   Stores the chosen meter in sessionStorage (temporary,
   pre-payment only), then sends the customer to the
   delivery address page via a real Flask route.
═══════════════════════════════════════════════ */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const buttons = document.querySelectorAll('.meter-select-btn');
  if (!buttons.length) return;

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.meter-card');
      if (!card) return;

      const selectedMeter = {
        name:  card.dataset.meter || '',
        price: parseInt(card.dataset.price, 10) || 0,
      };
      sessionStorage.setItem('ghridciti_selectedMeter', JSON.stringify(selectedMeter));

      document.querySelectorAll('.meter-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');

      if (window.ROUTES && window.ROUTES.addressForm) {
        window.location.href = window.ROUTES.addressForm;
      }
    });
  });
});