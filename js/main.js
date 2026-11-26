/* WHIZTY landing page – behaviour.
   No form, no database, no cookies, nothing saved in the browser, no tracking. */
(() => {
  'use strict';

  // Anti-clickjacking: GitHub Pages can't send X-Frame-Options, so if another
  // site loads this page inside a frame, hide it and break out of the frame.
  if (window.top !== window.self) {
    document.documentElement.hidden = true;
    try { window.top.location.replace(window.location.href); } catch (e) { /* blocked: stays hidden */ }
    return;
  }

  const C = window.WHIZTY_CONFIG || {};
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PLAY_LIVE = C.CTA_MODE === 'playstore' && /^https:\/\/play\.google\.com\//.test(C.PLAY_STORE_URL || '');

  $$('[data-year]').forEach(el => { el.textContent = String(new Date().getFullYear()); });

  /* ---------- 1. Main button: an email to WHIZTY now, Google Play after launch ----------
     Until launch the buttons are ordinary email links written in index.html (they work without scripts). */
  if (PLAY_LIVE) {
    $$('[data-cta]').forEach(el => {
      el.href = C.PLAY_STORE_URL;
      el.target = '_blank';
      el.rel = 'noopener';
      el.textContent = 'Start Level 1 Free';
    });
    $$('[data-email-hint]').forEach(el => { el.hidden = true; });
  }

  const waNumber = String(C.WHATSAPP_NUMBER || '').replace(/\D/g, '');
  $$('[data-wa-contact]').forEach(el => {
    if (waNumber.length < 11) return;
    el.href = 'https://wa.me/' + waNumber + '?text=' + encodeURIComponent('Hi WHIZTY! I have a question about early access.');
    el.target = '_blank';
    el.rel = 'noopener';
    el.hidden = false;
  });

  /* ---------- 2. Magnetic buttons (pull gently toward the cursor) ---------- */
  if (!reduceMotion && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const mags = $$('.magnetic');
    let px = -9999, py = -9999, queued = false;
    const MAX = 12;
    const update = () => {
      queued = false;
      mags.forEach(el => {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const dx = px - cx, dy = py - cy;
        const reach = Math.max(r.width, r.height) / 2 + 70;
        const dist = Math.hypot(dx, dy);
        if (dist < reach) {
          const pull = 1 - dist / reach;
          const tx = Math.max(-MAX, Math.min(MAX, dx * 0.35 * pull));
          const ty = Math.max(-MAX, Math.min(MAX, dy * 0.45 * pull));
          el.style.translate = tx.toFixed(1) + 'px ' + ty.toFixed(1) + 'px';
        } else if (el.style.translate) {
          el.style.translate = '';
        }
      });
    };
    document.addEventListener('pointermove', e => {
      px = e.clientX; py = e.clientY;
      if (!queued) { queued = true; requestAnimationFrame(update); }
    }, { passive: true });
    document.addEventListener('pointerleave', () => { px = py = -9999; update(); });
  }
})();
