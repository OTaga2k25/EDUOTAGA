import * as P from './physics.mjs';
import { createScene } from './scene.mjs';

const $ = (id) => document.getElementById(id);
const fmt = (v, d) => Number(v).toFixed(d);
const r1 = (v) => Math.round(v * 10) / 10;

const state = { s: P.newSetup((Math.random() * 1e9) | 0), u: 30, wet: false, e: 0, sway: true, dry: [], wetRows: [], msg: null, revealed: false };

let scene = null;
try { scene = createScene($('view'), { onDrag: (v) => setU(v) }); } catch (e) { scene = null; }
if (!scene) $('stage').classList.add('nogl-on');

function say(kind, text) { state.msg = { kind, text }; }
const F = () => P.lensF(state.s, state.wet);
function setU(v) { state.u = r1(Math.max(P.U_MIN, Math.min(P.U_MAX, v))); state.msg = null; render(); }

// what the student sees when moving the eye
function parallaxInfo() {
  const v = P.imageHeight(F(), state.u);
  if (v === null) return { kind: 'virtual', text: 'No inverted image: the needle is too close to the lens (you see only an enlarged, upright image). Raise the needle a lot.' };
  if (Math.abs(v - state.u) <= P.TOL) return { kind: 'none', text: 'No parallax: the image tip stays on the needle tip as you move your eye.' };
  if (v > state.u) return { kind: 'against', text: 'The image moves opposite to your eye, so it is nearer to your eye (above the needle tip). Raise the needle.' };
  return { kind: 'with', text: 'The image moves with your eye, so it is farther from your eye (below the needle tip). Lower the needle.' };
}

function record() {
  const p = parallaxInfo();
  if (p.kind !== 'none') { say('err', 'There is still parallax, so the needle is not at the focus. ' + p.text); return render(); }
  const r = P.scaleReadings(state.u), row = { x1: r.x1, x2: r.x2 }, arr = state.wet ? state.wetRows : state.dry;
  arr.push(row); state.revealed = false;
  const name = state.wet ? 'F' : 'f₁', val = (r.x1 + r.x2) / 2;
  let next;
  if (arr.length < 2) next = 'Move the needle away, find the no-parallax position again and record a second trial.';
  else if (!state.wet) next = 'Now put a few drops of liquid under the lens and repeat.';
  else next = 'Both settings are measured. Look at the spherometer readings and the result below.';
  say('good', 'Recorded x₁ = ' + fmt(r.x1, 1) + ' cm and x₂ = ' + fmt(r.x2, 1) + ' cm, so ' + name + ' = ' + fmt(val, 2) + ' cm. ' + next);
  render();
}

$('uSl').addEventListener('input', (e) => setU(parseFloat(e.target.value)));
Array.prototype.forEach.call(document.querySelectorAll('.nudge [data-d]'), (b) => b.addEventListener('click', () => setU(state.u + parseFloat(b.getAttribute('data-d')))));
$('eyeSl').addEventListener('input', (e) => { state.e = parseFloat(e.target.value); state.sway = false; drawEye(); $('swayBtn').textContent = 'Sway eye automatically'; });
$('swayBtn').addEventListener('click', () => { state.sway = !state.sway; $('swayBtn').textContent = state.sway ? 'Stop swaying' : 'Sway eye automatically'; });
$('recordBtn').addEventListener('click', record);
$('liqBtn').addEventListener('click', () => {
  if (!state.wet && state.dry.length < 1) { say('err', 'First find f₁ for the lens alone (no liquid). Record at least one, preferably two, trials.'); return render(); }
  state.wet = !state.wet; say('', state.wet ? 'A few drops of liquid are now between the lens and the mirror. The focal length of the combination is larger, so the no-parallax position has moved up. Find it again.' : 'The liquid has been wiped off. You are measuring the lens alone again.'); render();
});
$('delLast').addEventListener('click', () => { const arr = state.wet ? state.wetRows : state.dry; arr.pop(); state.revealed = false; state.msg = null; render(); });
$('newSet').addEventListener('click', () => { state.s = P.newSetup((Math.random() * 1e9) | 0); state.dry = []; state.wetRows = []; state.wet = false; state.revealed = false; say('warn', 'A new lens and an unknown liquid are on the table. Start again with the lens alone.'); render(); });
$('reveal').addEventListener('click', () => { state.revealed = true; render(); });
Array.prototype.forEach.call(document.querySelectorAll('.views [data-view]'), (b) => b.addEventListener('click', () => scene && scene.setView(b.getAttribute('data-view'))));

/* ---------- eye view ---------- */
function drawEye() {
  const cv = $('eyeView'), dpr = window.devicePixelRatio || 1, W = 300, H = 220; cv.width = W * dpr; cv.height = H * dpr;
  const ctx = cv.getContext('2d'); if (!ctx) return; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#0e2433'; ctx.fillRect(0, 0, W, H);
  // the lens seen from above
  ctx.fillStyle = 'rgba(159,220,255,.18)'; ctx.beginPath(); ctx.ellipse(W / 2, H / 2 + 8, 120, 96, 0, 0, Math.PI * 2); ctx.fill();
  const cx = W / 2 + state.e * 18, cy = H / 2;   // the needle moves a little in view as the eye moves
  const v = P.imageHeight(F(), state.u);
  ctx.lineCap = 'round';
  if (v !== null) {
    const m = Math.min(3, v / state.u), shift = P.parallaxShift(F(), state.u, state.e);
    ctx.strokeStyle = 'rgba(200,215,225,.75)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx + shift, cy + 3); ctx.lineTo(cx + shift, cy + 3 + 70 * m); ctx.stroke();   // inverted image, tip up
    ctx.fillStyle = 'rgba(200,215,225,.75)'; ctx.beginPath(); ctx.moveTo(cx + shift - 4, cy + 12); ctx.lineTo(cx + shift + 4, cy + 12); ctx.lineTo(cx + shift, cy + 2); ctx.fill();
  } else {
    ctx.strokeStyle = 'rgba(200,215,225,.35)'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(cx, cy + 10); ctx.lineTo(cx, cy - 80); ctx.stroke();   // blurred, enlarged upright image
  }
  ctx.strokeStyle = '#eef3f6'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, cy - 3); ctx.stroke();      // the needle, tip down
  ctx.fillStyle = '#eef3f6'; ctx.beginPath(); ctx.moveTo(cx - 4, cy - 12); ctx.lineTo(cx + 4, cy - 12); ctx.lineTo(cx, cy - 2); ctx.fill();
  ctx.fillStyle = '#9fb3be'; ctx.font = '11px "Space Mono", monospace'; ctx.fillText('needle', 8, 16); ctx.fillText('image (inverted)', 8, H - 10);
}
(function animate() {
  if (state.sway) { state.e = Math.sin(performance.now() / 600); $('eyeSl').value = state.e.toFixed(2); }
  drawEye();
  if (typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(animate);
})();

/* ---------- results ---------- */
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const fOf = (r) => (r.x1 + r.x2) / 2;
function results() {
  const s = state.s, h = P.spherometerH(s.R), R = P.radiusFrom(P.L_SPH, h);
  const f1 = state.dry.length ? mean(state.dry.map(fOf)) : null, FF = state.wetRows.length ? mean(state.wetRows.map(fOf)) : null;
  let fl = null, n = null;
  if (f1 !== null && FF !== null && FF > f1) { fl = P.fLiquidFrom(f1, FF); n = P.indexFrom(R, fl); }
  return { h, R, f1, F: FF, fl, n };
}
function readingChecks(res) {
  const out = [], nd = state.dry.length, nw = state.wetRows.length;
  if (!nd && !nw) return out;
  out.push(nd >= 2 ? { k: 'ok', t: nd + ' trials without liquid.' } : { k: 'warn', t: 'Only ' + nd + ' trial' + (nd === 1 ? '' : 's') + ' without liquid. Take at least 2, moving the needle away and finding the no-parallax point again each time.' });
  if (nd) out.push(nw >= 2 ? { k: 'ok', t: nw + ' trials with liquid.' } : { k: 'warn', t: (nw ? 'Only ' + nw + ' trial' : 'No trials') + ' with liquid yet. Put the liquid under the lens and take at least 2.' });
  [['without liquid', state.dry], ['with liquid', state.wetRows]].forEach(([name, arr]) => {
    if (arr.length >= 2) { const fs = arr.map(fOf), sp = Math.max(...fs) - Math.min(...fs); if (sp > 0.4) out.push({ k: 'warn', t: 'Your trials ' + name + ' differ by ' + fmt(sp, 1) + ' cm. Find the exact point where the image tip stays on the needle tip, and repeat.' }); }
  });
  if (res.f1 !== null && res.F !== null) {
    out.push(res.F > res.f1 ? { k: 'ok', t: 'F (' + fmt(res.F, 2) + ' cm) is larger than f₁ (' + fmt(res.f1, 2) + ' cm), as expected: the liquid lens is diverging.' } : { k: 'warn', t: 'F should be larger than f₁ because the liquid lens is diverging. Check both sets of readings.' });
  }
  if (res.n !== null) {
    const near = P.LIQUIDS.reduce((a, b) => (Math.abs(b.n - res.n) < Math.abs(a.n - res.n) ? b : a));
    out.push({ k: 'tip', t: 'Your n = ' + fmt(res.n, 3) + ' is close to that of ' + near.name + ' (' + near.n + '). Water is about 1.33 and most oils 1.44–1.48.' });
  }
  return out;
}
function renderTables(res) {
  [['dryBody', state.dry], ['wetBody', state.wetRows]].forEach(([id, arr]) => {
    const body = $(id); body.innerHTML = '';
    if (!arr.length) body.innerHTML = '<tr class="empty"><td colspan="4">No readings yet</td></tr>';
    arr.forEach((r, k) => { const tr = document.createElement('tr'); [String(k + 1), fmt(r.x1, 1), fmt(r.x2, 1), fmt(fOf(r), 2)].forEach((v) => { const td = document.createElement('td'); td.textContent = v; tr.appendChild(td); }); body.appendChild(tr); });
  });
  $('sphLine').textContent = 'Distance between the legs l = ' + fmt(P.L_SPH, 2) + ' cm, height h = ' + fmt(res.h, 3) + ' cm. R = l²/(6h) + h/2 = ' + fmt(res.R, 2) + ' cm.';
  const lines = [];
  if (res.f1 !== null) lines.push('Mean f₁ = ' + fmt(res.f1, 2) + ' cm.');
  if (res.F !== null) lines.push('Mean F = ' + fmt(res.F, 2) + ' cm.');
  if (res.n !== null) lines.push('Liquid lens: |f| = f₁F/(F − f₁) = ' + fmt(res.fl, 2) + ' cm. Refractive index n = 1 + R/|f| = ' + fmt(res.n, 3) + '.');
  $('resultLine').textContent = lines.join(' ');
  const list = $('checks'), items = readingChecks(res); list.innerHTML = '';
  items.forEach((c) => { const li = document.createElement('li'); li.className = c.k; li.textContent = c.t; list.appendChild(li); });
  $('checksH').hidden = !items.length;
  const rv = $('revealBox');
  if (state.revealed) {
    rv.hidden = false;
    if (res.n === null) rv.textContent = 'Not yet: record f₁ (no liquid) and F (with liquid) first, then check your answer.';
    else {
      const err = Math.abs(res.n - state.s.liq.n) / state.s.liq.n * 100;
      rv.textContent = 'The liquid is ' + state.s.liq.name + ', n = ' + state.s.liq.n + '. The lens has f₁ = ' + fmt(state.s.f1, 1) + ' cm and R = ' + fmt(state.s.R, 2) + ' cm. Your n = ' + fmt(res.n, 3) + ', an error of ' + fmt(err, 2) + '%.' +
        (state.dry.length < 2 || state.wetRows.length < 2 ? ' Take at least 2 trials of each for a reliable result.' : err > 1.5 ? ' To improve it, remove parallax more carefully with the 0.1 cm buttons; see the checks above.' : ' Well done: that is within normal laboratory accuracy.');
    }
  } else rv.hidden = true;
}
function defaultStatus() {
  const p = parallaxInfo();
  if (!state.dry.length && !state.wet) return { kind: '', text: 'Step 1: watch the image of the needle while your eye moves. ' + p.text };
  if (p.kind === 'none') return { kind: 'good', text: p.text + ' Record x₁ and x₂.' };
  return { kind: '', text: p.text };
}
function render() {
  const res = results(), p = parallaxInfo();
  $('uSl').value = state.u;
  const sr = P.scaleReadings(state.u);
  $('scaleLine').textContent = 'Scale: needle tip to lens top x₁ = ' + fmt(sr.x1, 1) + ' cm · to mirror x₂ = ' + fmt(sr.x2, 1) + ' cm';
  $('parallaxLine').textContent = p.text;
  $('liqBtn').textContent = state.wet ? 'Wipe off the liquid' : 'Put liquid under the lens';
  $('modeTag').textContent = state.wet ? 'With liquid' : 'No liquid';
  const stageNow = state.wet ? 1 : 0;
  Array.prototype.forEach.call(document.querySelectorAll('#steps li'), (li) => {
    const k = +li.getAttribute('data-s'), done = k === 0 ? state.dry.length >= 2 : k === 1 ? state.wetRows.length >= 2 : res.n !== null;
    li.className = done ? 'done' : k === stageNow ? 'now' : '';
  });
  const st = $('status'), m = state.msg || defaultStatus(); st.textContent = m.text; st.className = 'status' + (m.kind ? ' ' + m.kind : '');
  renderTables(res); drawEye();
  if (scene) scene.setState({ u: state.u, wet: state.wet });
}
render();

/* ---------- full screen ---------- */
(function () {
  const btn = $('fsBtn'), stage = $('stage'); if (!btn) return;
  const isFs = () => document.fullscreenElement === stage || document.webkitFullscreenElement === stage;
  const label = () => { btn.textContent = isFs() ? 'Exit full screen' : 'Full screen'; };
  btn.addEventListener('click', () => {
    try {
      if (isFs()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
      const req = stage.requestFullscreen || stage.webkitRequestFullscreen; if (!req) { btn.style.display = 'none'; return; }
      const p = req.call(stage); const lock = () => { try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {}); } catch (e) {} };
      if (p && p.then) p.then(lock).catch(() => {}); else lock();
    } catch (e) {}
  });
  document.addEventListener('fullscreenchange', label); document.addEventListener('webkitfullscreenchange', label);
  if (!(stage.requestFullscreen || stage.webkitRequestFullscreen)) btn.style.display = 'none';
})();
