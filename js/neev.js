/* Agent Neev scroll storytelling.
   - Draws Neev on a <canvas>; which picture shows is tied to scroll position.
   - Starts big inside the hero circle, then shrinks into a round clay
     medallion that travels down the right side as the parent scrolls.
   - Few pictures: each one belongs to a page section (NEEV_ANCHORS) and
     cross-fades into the next. Many frames (video): scrubbed by scroll.
   - With no images configured, a simple drawn stand-in is shown. */
(() => {
  'use strict';
  const canvas = document.getElementById('neev');
  const slot = document.getElementById('neev-slot');
  if (!canvas || !slot || !canvas.getContext) return;

  const C = window.WHIZTY_CONFIG || {};
  const ctx = canvas.getContext('2d');
  const BOX = 360;                                   // canvas CSS size (px)
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const RES = Math.round(BOX * DPR);
  canvas.width = RES;
  canvas.height = RES;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const BG = C.NEEV_BG || '#EFEDE2';                 // background colour inside the pictures

  /* ---- frame list ---- */
  const srcs = Array.isArray(C.NEEV_FRAMES) ? C.NEEV_FRAMES.filter(Boolean) : [];
  const seq = C.NEEV_SEQUENCE || {};
  if (!srcs.length && seq.pattern && seq.count > 0) {
    for (let n = 1; n <= seq.count; n++) srcs.push(seq.pattern.replace('{n}', String(n).padStart(seq.pad || 1, '0')));
  }
  const frames = new Array(srcs.length);
  srcs.forEach((src, i) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => { frames[i] = img; dirty = true; kick(); };
    img.src = src;
  });
  const anchors = (Array.isArray(C.NEEV_ANCHORS) ? C.NEEV_ANCHORS : [])
    .map(id => document.getElementById(id)).filter(Boolean);
  const useAnchors = srcs.length > 1 && anchors.length === srcs.length;

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => t * t * (3 - 2 * t);

  let target = 0, shown = 0, dirty = true, running = false, lastKey = '';

  function scrollProgress() {
    const max = document.documentElement.scrollHeight - innerHeight;
    return max > 0 ? clamp(scrollY / max, 0, 1) : 0;
  }

  /* 0..1 frame position. Anchored: hold each pose through its section and
     cross-fade during the last 30% before the next section begins. */
  function frameProgress() {
    if (!useAnchors) return scrollProgress();
    const y = scrollY + innerHeight * 0.45;
    const tops = anchors.map(el => el.getBoundingClientRect().top + scrollY);
    let i = 0;
    while (i < tops.length - 1 && y >= tops[i + 1]) i++;
    if (i >= tops.length - 1) return 1;
    const frac = (y - tops[i]) / Math.max(1, tops[i + 1] - tops[i]);
    return (i + smooth(clamp((frac - 0.7) / 0.3, 0, 1))) / (tops.length - 1);
  }

  function frameAt(i) {
    if (frames[i]) return frames[i];
    for (let d = 1; d < frames.length; d++) {
      if (frames[i - d]) return frames[i - d];
      if (frames[i + d]) return frames[i + d];
    }
    return null;
  }

  /* ---- clay medallion ---- */
  const R = RES * 0.45, CX = RES / 2, CY = RES * 0.48;
  function circle() { ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI * 2); }

  function drawPicture(img, alpha) {
    if (!img) return;
    const box = R * 2 * 0.9;                        // keep hands/feet inside the circle
    const s = Math.min(box / img.naturalWidth, box / img.naturalHeight);
    const w = img.naturalWidth * s, h = img.naturalHeight * s;
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, CX - w / 2, CY - h / 2 + R * 0.03, w, h);
    ctx.globalAlpha = 1;
  }

  function drawMedallion(paint) {
    ctx.clearRect(0, 0, RES, RES);
    // soft outer shadow
    ctx.save();
    ctx.shadowColor = 'rgba(120,124,104,.40)';
    ctx.shadowBlur = RES * 0.05;
    ctx.shadowOffsetX = RES * 0.018;
    ctx.shadowOffsetY = RES * 0.026;
    ctx.fillStyle = BG; circle(); ctx.fill();
    ctx.restore();
    // picture
    ctx.save(); circle(); ctx.clip();
    ctx.fillStyle = BG; ctx.fillRect(0, 0, RES, RES);
    paint();
    // inner clay shading
    const g = ctx.createRadialGradient(CX - R * 0.3, CY - R * 0.35, R * 0.2, CX, CY, R);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.8, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(120,124,104,.30)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, RES, RES);
    ctx.restore();
    // puffy rim highlight
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineWidth = RES * 0.016;
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.beginPath(); ctx.arc(CX, CY, R - RES * 0.012, Math.PI * 0.95, Math.PI * 1.55); ctx.stroke();
    ctx.lineWidth = RES * 0.012;
    ctx.strokeStyle = 'rgba(255,138,0,.85)';
    ctx.beginPath(); ctx.arc(CX, CY, R - RES * 0.006, Math.PI * 0.05, Math.PI * 0.55); ctx.stroke();
    ctx.restore();
  }

  function draw(p) {
    if (!srcs.length) { drawStandIn(p); return; }
    const f = p * (srcs.length - 1);
    const i = Math.floor(f);
    const t = f - i;
    const crossfade = srcs.length <= 12;
    const key = crossfade ? i + ':' + t.toFixed(3) : String(Math.round(f));
    if (key === lastKey && !dirty) return;
    lastKey = key;
    drawMedallion(() => {
      if (crossfade && t > 0.001 && i + 1 < srcs.length) {
        drawPicture(frameAt(i), 1);
        drawPicture(frameAt(i + 1), t);
      } else {
        drawPicture(frameAt(Math.round(f)), 1);
      }
    });
  }

  /* ---- drawn stand-in (only when no images are configured) ---- */
  function drawStandIn(p) {
    const k = RES / 360;
    const wave = Math.sin(p * Math.PI * 16) * 0.5;
    drawMedallion(() => {
      ctx.save(); ctx.scale(k, k);
      ctx.fillStyle = '#2EC4D6'; ctx.beginPath(); ctx.arc(180, 140, 66, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FF8A00'; ctx.beginPath(); ctx.ellipse(180, 270, 74, 64, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1F2B3A'; ctx.beginPath(); ctx.ellipse(180, 136, 48, 20, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FFD23F';
      ctx.beginPath(); ctx.arc(162, 136, 8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(198, 136, 8, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.translate(244, 238); ctx.rotate(-0.9 + wave);
      ctx.fillStyle = '#FF8A00'; ctx.fillRect(-11, -60, 22, 62);
      ctx.fillStyle = '#2EC4D6'; ctx.beginPath(); ctx.arc(0, -62, 14, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.restore();
    });
  }

  /* ---- placement: hero circle -> travelling companion ---- */
  // Neev follows the reader only when the empty space beside the page can hold all of him, so he never
  // covers text. On narrower screens (and with reduced motion) he stays in the circle at the top.
  const ROOM = 100; // pixels of empty space needed on one side
  const sideSpace = () => {
    const vw = document.documentElement.clientWidth;
    return (vw - Math.min(1140, vw - 32)) / 2; // the same width as .wrap in style.css
  };
  const staysAtTop = () => reduce || sideSpace() < ROOM;

  function place(sp) {
    const vw = document.documentElement.clientWidth;
    const vh = innerHeight;
    const r = slot.getBoundingClientRect();
    const pinned = staysAtTop();
    // When he stays, he is part of the page (absolute), so he scrolls away smoothly with the top section.
    canvas.style.position = pinned ? 'absolute' : '';
    if (pinned) {
      canvas.style.transform = 'translate3d(' + (r.left + scrollX) + 'px,' + (r.top + scrollY) + 'px,0) scale(' + (r.width / BOX) + ')';
      return;
    }
    const gutter = sideSpace();
    const size = Math.min(176, gutter - 16);
    const topY = 100;
    const bottomY = vh - size - 22;
    const spare = Math.max(0, Math.min(30, gutter - size - 12));
    const sway = (Math.sin(sp * Math.PI * 6) * 0.5 + 0.5) * spare;
    const cx = vw - gutter + (gutter - size) / 2 - sway / 2;
    const cy = lerp(topY, bottomY, sp);
    const e = smooth(clamp(scrollY / (vh * 0.55), 0, 1));
    const x = lerp(r.left, cx, e);
    const y = lerp(r.top, cy, e);
    const s = lerp(r.width, size, e) / BOX;
    canvas.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) scale(' + s.toFixed(4) + ')';
  }

  function tick() {
    target = staysAtTop() ? 0 : frameProgress();
    shown = lerp(shown, target, 0.16);
    if (Math.abs(target - shown) < 0.0005) shown = target;
    place(scrollProgress());
    draw(shown);
    dirty = false;
    if (shown !== target) requestAnimationFrame(tick);
    else running = false;
  }
  function kick() {
    if (running) return;
    running = true;
    requestAnimationFrame(tick);
  }

  addEventListener('scroll', kick, { passive: true });
  // fonts and pictures can move the top section after the first drawing: put him back in his circle
  addEventListener('load', kick);
  if (document.fonts) document.fonts.ready.then(kick);
  addEventListener('resize', () => { dirty = true; kick(); });
  kick();
})();
