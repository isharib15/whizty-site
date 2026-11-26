/* WHIZTY landing page – behaviour (no tracking, no third-party analytics) */
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
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked: fine */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
  };
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  const API = isLocal ? '/api/early-access' : C.API_URL;
  const SITE = (C.SITE_URL || location.origin).replace(/\/+$/, '');
  const PLAY_LIVE = C.CTA_MODE === 'playstore' && /^https:\/\/play\.google\.com\//.test(C.PLAY_STORE_URL || '');
  const SHARE_TEXT = 'Hey! I just joined early access for WHIZTY — a 10-minute daily life-skills app for kids aged 7–12 that builds speaking confidence and smart money habits. Level 1 is completely free. Thought you might like it for your child too: [REFERRAL_LINK]';
  const GMAIL = /^[a-z0-9](?:[a-z0-9.+_-]{0,62})@(?:gmail|googlemail)\.com$/;

  $$('[data-year]').forEach(el => { el.textContent = String(new Date().getFullYear()); });

  /* ---------- 1. Capture ?ref=CODE silently ---------- */
  (function captureRef() {
    const params = new URLSearchParams(location.search);
    if (!params.has('ref')) return;
    const ref = (params.get('ref') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
    if (ref) store.set('whizty_ref', ref);
    params.delete('ref');
    const q = params.toString();
    history.replaceState(null, '', location.pathname + (q ? '?' + q : '') + location.hash);
  })();

  /* ---------- 2. Main CTA: waitlist now, Play Store after launch ---------- */
  $$('[data-cta]').forEach(el => {
    if (PLAY_LIVE) {
      el.href = C.PLAY_STORE_URL;
      el.target = '_blank';
      el.rel = 'noopener';
      el.textContent = 'Start Level 1 Free';
    } else {
      el.setAttribute('aria-haspopup', 'dialog');
      el.addEventListener('click', e => { e.preventDefault(); openJoin(el); });
    }
  });

  const waNumber = String(C.WHATSAPP_NUMBER || '').replace(/\D/g, '');
  $$('[data-wa-contact]').forEach(el => {
    if (waNumber.length < 11) return;
    el.href = 'https://wa.me/' + waNumber + '?text=' + encodeURIComponent('Hi WHIZTY! I have a question about early access.');
    el.target = '_blank';
    el.rel = 'noopener';
    el.hidden = false;
  });

  /* ---------- 3. Early Access dialog ---------- */
  const dialog = $('#join-dialog');
  const form = $('#join-form');
  const viewForm = $('#view-form');
  const viewDone = $('#view-done');
  const errBox = $('#form-error');
  const submitBtn = $('#join-submit');
  let lastTrigger = null;
  let formShownAt = Date.now();   // used by the "too fast to be a person" spam check

  function openJoin(trigger) {
    lastTrigger = trigger || null;
    const saved = readSaved();
    if (saved) {
      showDone(saved, true);
      refreshStatus(saved.referral_code);
    } else {
      showForm();
    }
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    document.body.classList.add('modal-open');
  }

  function closeJoin() { if (dialog.open) dialog.close(); }
  dialog.addEventListener('close', () => {
    document.body.classList.remove('modal-open');
    if (lastTrigger) lastTrigger.focus();
  });
  $$('[data-close]', dialog).forEach(b => b.addEventListener('click', closeJoin));
  dialog.addEventListener('click', e => { if (e.target === dialog) closeJoin(); });

  function showForm() {
    viewDone.hidden = true;
    viewForm.hidden = false;
    setError('');
    formShownAt = Date.now();
    setTimeout(() => { const f = $('#f-wa'); if (f) f.focus(); }, 50);
  }

  function setError(msg) { errBox.textContent = msg; }

  function normPhone(v) {
    let d = String(v || '').replace(/\D/g, '');
    if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
    else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
    return /^[6-9]\d{9}$/.test(d) ? d : '';
  }

  const ERRORS = {
    invalid_phone: 'Please enter a valid 10-digit Indian mobile number.',
    invalid_email: 'Please enter the Gmail ID you use on Google Play (it ends in @gmail.com).',
    consent_required: 'Please tick the box to agree to the Privacy Policy.',
    rate_limited: 'That was a bit quick, or there were too many tries. Please wait a minute and try again.'
  };

  form.addEventListener('submit', async e => {
    e.preventDefault();
    setError('');
    const phone = normPhone(form.whatsapp.value);
    const email = form.email.value.trim().toLowerCase();
    if (!phone) { setError(ERRORS.invalid_phone); form.whatsapp.focus(); return; }
    if (!GMAIL.test(email)) { setError(ERRORS.invalid_email); form.email.focus(); return; }
    if (!form.consent.checked) { setError(ERRORS.consent_required); form.consent.focus(); return; }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Joining…';
    try {
      const data = await callApi({
        action: 'join',
        whatsapp: phone,
        email: email,
        consent: true,
        ref: store.get('whizty_ref') || '',
        hp: form.website.value,                  // hidden trap field: real people leave it empty
        ms: Date.now() - formShownAt             // how long the form was open
      });
      saveResult(data);
      form.reset();
      showDone(data, false);
    } catch (err) {
      setError(ERRORS[err.message] || 'Something went wrong on our side. Please try again in a minute, or email support@whizty.com.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Join Early Access';
    }
  });

  async function callApi(payload) {
    if (!API || /YOUR-PROJECT-REF/.test(API)) throw new Error('not_configured');
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'omit'
    });
    let data = {};
    try { data = await res.json(); } catch (e) { /* non-JSON */ }
    if (!res.ok || !data || !data.referral_code) throw new Error((data && data.error) || 'server_error');
    return data;
  }

  function saveResult(d) {
    store.set('whizty_me', JSON.stringify({
      referral_code: d.referral_code,
      position: d.position,
      referral_count: d.referral_count
    }));
  }
  function readSaved() {
    try {
      const d = JSON.parse(store.get('whizty_me') || 'null');
      return d && /^[A-Z0-9]{4,12}$/.test(d.referral_code) ? d : null;
    } catch (e) { return null; }
  }
  async function refreshStatus(code) {
    try {
      const d = await callApi({ action: 'status', code: code });
      saveResult(d);
      showDone(d, true);
    } catch (e) {
      if (e.message === 'not_found') { store.del('whizty_me'); showForm(); }
      /* otherwise keep showing the saved numbers */
    }
  }

  function showDone(d, returning) {
    const count = Math.max(0, Number(d.referral_count) || 0);
    const position = Math.max(1, Number(d.position) || 1);
    const link = SITE + '/?ref=' + encodeURIComponent(d.referral_code);

    $('#done-eyebrow').textContent = (d.already || returning) ? 'Welcome back! 👋' : "You're in! 🎉";
    $('#done-rank').textContent = 'You are #' + position + ' on the Early Access list';
    const shown = Math.min(count, 3);
    $('#ref-fill').style.width = (shown / 3 * 100) + '%';
    $('#ref-bar').setAttribute('aria-valuenow', String(shown));
    $('#ref-count').textContent = count >= 3
      ? count + ' parents joined with your link. Reward unlocked! 🎁'
      : count + ' of 3 parents joined with your link';
    $('#share-wa').href = 'https://wa.me/?text=' + encodeURIComponent(SHARE_TEXT.replace('[REFERRAL_LINK]', link));
    $('#ref-link').textContent = link;
    $('#copy-link').dataset.link = link;
    $('#copy-link').textContent = 'Copy Referral Link';

    viewForm.hidden = true;
    viewDone.hidden = false;
    setTimeout(() => $('#done-rank').focus(), 50);
  }

  $('#copy-link').addEventListener('click', async e => {
    const btn = e.currentTarget;
    const link = btn.dataset.link || '';
    let ok = false;
    try { await navigator.clipboard.writeText(link); ok = true; } catch (err) {
      const t = document.createElement('textarea');
      t.value = link; t.setAttribute('readonly', ''); t.className = 'skip';
      document.body.appendChild(t); t.select();
      try { ok = document.execCommand('copy'); } catch (x) { ok = false; }
      t.remove();
    }
    btn.textContent = ok ? 'Link copied ✓' : 'Copy failed – long-press the link below';
  });

  $('#not-me').addEventListener('click', () => { store.del('whizty_me'); showForm(); });

  /* ---------- 4. Magnetic buttons (pull gently toward the cursor) ---------- */
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

  /* ---------- 5. Cookie notice ---------- */
  const cookie = $('#cookie');
  if (cookie && !store.get('whizty_cookie_ok')) {
    cookie.hidden = false;
    $('#cookie-ok').addEventListener('click', () => {
      store.set('whizty_cookie_ok', '1');
      cookie.hidden = true;
    });
  }
})();
