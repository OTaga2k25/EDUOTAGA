import * as P from './physics.mjs';
import { createScene } from './scene.mjs';

const $ = (id) => document.getElementById(id);
const fmt = (v, d) => Number(v).toFixed(d);
const round1 = (v) => Math.round(v * 10) / 10;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// p: lens distance from the object; D: screen distance from the object. u = p, v (screen from lens) = D - p
const state = { lens: P.newLens((Math.random() * 1e9) | 0), D: 80, p: 20, pending: null, rows: [], msg: null, revealed: false,
  get u() { return this.p; }, get vs() { return this.D - this.p; } };

/* ---------- screen image (also used as the 3D screen texture) ---------- */
const sv = $('screenView');
const AP = 10;  // lens aperture, cm
function drawScreen() {
  const ctx = sv.getContext('2d'); if (!ctx) return;
  const W = sv.width, H = sv.height, pxcm = W / 15, cx = W / 2, cy = H / 2;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#f4f4ef'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(0,0,0,.05)'; ctx.fillRect(0, cy - 1, W, 2); ctx.fillRect(cx - 1, 0, 2, H);   // faint axis cross
  const vTrue = P.imageDistance(state.lens.f, state.u);
  if (vTrue === null || vTrue > P.V_MAX + 15) {                 // no real image on the bench: only a faint glow
    const g = ctx.createRadialGradient(cx, cy, 5, cx, cy, W * 0.55); g.addColorStop(0, 'rgba(255,200,80,.30)'); g.addColorStop(1, 'rgba(255,200,80,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); return;
  }
  const m = vTrue / state.u, hImg = P.OBJ_H * m * pxcm;
  const dfc = P.lensDefocus(state.lens, state.D, state.p), blurCm = dfc === null ? 6 : Math.min(6, Math.abs(dfc) * 2.2), bpx = Math.min(70, blurCm * pxcm * 0.5);
  const n = bpx < 1.2 ? 1 : 14, alpha = clamp(1 / (1 + blurCm * 0.5), 0.12, 1);
  function arrow(dx, dy, a) {
    ctx.globalAlpha = a; ctx.fillStyle = '#e8511d'; ctx.strokeStyle = '#e8511d';
    const top = cy + dy, bot = cy + dy + hImg, x = cx + dx, w = Math.max(3, 0.5 * pxcm * clamp(m, 0.5, 2));
    ctx.fillRect(x - w / 2, top, w, Math.max(2, hImg - 0.9 * pxcm * clamp(m, 0.5, 2)));
    ctx.beginPath(); const hw = 0.9 * pxcm * clamp(m, 0.5, 2), hh = 1.4 * pxcm * clamp(m, 0.5, 2);
    ctx.moveTo(x - hw, bot - hh); ctx.lineTo(x + hw, bot - hh); ctx.lineTo(x, bot); ctx.closePath(); ctx.fill();   // inverted: arrow head points down
  }
  if (n === 1) arrow(0, 0, 1);
  else for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; arrow(Math.cos(a) * bpx, Math.sin(a) * bpx * 0.8, alpha / 3.2); }
  ctx.globalAlpha = 1;
}

/* ---------- scene (optional) ---------- */
let scene = null;
try { scene = createScene($('view'), { onDrag: (which, v) => (which === 'lens' ? setP(v) : setD(v)) }, sv); } catch (e) { scene = null; }
if (!scene) $('stage').classList.add('nogl-on');

const sharp = () => P.lensSharpness(state.lens, state.D, state.p);
const rowF = (r) => P.fDisplacement(r.D, r.p2 - r.p1);
const meanF = () => (state.rows.length ? state.rows.reduce((a, r) => a + rowF(r), 0) / state.rows.length : null);
function say(kind, text) { state.msg = { kind, text }; }

function setP(v) { state.p = round1(clamp(v, 1, state.D - 1)); state.msg = null; render(); }
function setD(v) {
  const nd = round1(clamp(v, P.D_MIN, P.D_MAX));
  if (state.pending && nd !== state.pending.D) { state.pending = null; say('warn', 'The screen was moved, so lens position 1 no longer applies. For each D, find both lens positions without moving the screen.'); }
  else state.msg = null;
  state.D = nd; state.p = clamp(state.p, 1, nd - 1); render();
}
// the nearest lens position where the image is sharp (for direction hints)
function nearestSharp() {
  const c = P.conjugates(state.lens.f, state.D); if (!c.length) return null;
  return c.reduce((a, b) => (Math.abs(b - state.p) < Math.abs(a - state.p) ? b : a));
}

function record() {
  const c = P.conjugates(state.lens.f, state.D);
  if (!c.length) { say('err', 'With the screen this close, there is no lens position that gives a sharp image: D must be more than 4f. Move the screen further from the object.'); return render(); }
  if (sharp() < P.SHARP_OK) {
    const n = nearestSharp();
    say('err', 'The image is not sharp at this lens position. Move the lens ' + (n > state.p ? 'towards the screen' : 'towards the object') + ' in small steps until the arrow’s edges look sharpest.');
    return render();
  }
  if (!state.pending) {
    state.pending = { D: state.D, p1: state.p }; state.revealed = false;
    say('good', 'Lens position 1 recorded: ' + fmt(state.p, 1) + ' cm from the object (' + (state.u < state.vs ? 'large, magnified image' : 'small, diminished image') + '). Without moving the screen, slide the lens to find the second position of sharp focus.');
    return render();
  }
  if (Math.abs(state.p - state.pending.p1) < 2) { say('err', 'This is the same position as before. Slide the lens ' + (state.pending.p1 < state.D / 2 ? 'towards the screen' : 'towards the object') + ' to find the other position where the image is sharp again.'); return render(); }
  const p1 = Math.min(state.pending.p1, state.p), p2 = Math.max(state.pending.p1, state.p), row = { D: state.D, p1, p2 };
  state.rows.push(row); state.pending = null; state.revealed = false;
  say('good', 'Both positions recorded: d = ' + fmt(p2 - p1, 1) + ' cm, so f = (D² − d²)/4D = ' + fmt(rowF(row), 2) + ' cm. Now move the screen to a new D and repeat.');
  render();
}

$('dSl').addEventListener('input', (e) => setD(parseFloat(e.target.value)));
$('pSl').addEventListener('input', (e) => setP(parseFloat(e.target.value)));
Array.prototype.forEach.call(document.querySelectorAll('.nudge [data-d]'), (b) => {
  b.addEventListener('click', () => { const d = parseFloat(b.getAttribute('data-d')); b.getAttribute('data-t') === 'p' ? setP(state.p + d) : setD(state.D + d); });
});
$('recordBtn').addEventListener('click', record);
$('delLast').addEventListener('click', () => { if (state.pending) state.pending = null; else state.rows.pop(); state.revealed = false; state.msg = null; render(); });
$('resetAll').addEventListener('click', () => { state.rows = []; state.pending = null; state.revealed = false; say('warn', 'Readings cleared.'); render(); });
$('newLens').addEventListener('click', () => { state.lens = P.newLens((Math.random() * 1e9) | 0); state.rows = []; state.pending = null; state.revealed = false; say('warn', 'A new unknown lens is on the bench. Start again.'); render(); });
$('reveal').addEventListener('click', () => { state.revealed = true; render(); });
Array.prototype.forEach.call(document.querySelectorAll('.views [data-view]'), (b) => b.addEventListener('click', () => scene && scene.setView(b.getAttribute('data-view'))));

function defaultStatus() {
  const c = P.conjugates(state.lens.f, state.D), s = sharp();
  if (s >= P.SHARP_OK) return { kind: 'good', text: 'The image is sharp. Record this lens position.' };
  if (!c.length && !state.rows.length && !state.pending) return { kind: '', text: 'Step 1: move the screen far from the object (D more than 4f; try about 80 cm), then slide the lens from near the object towards the screen until the image is sharp.' };
  if (!c.length) return { kind: 'warn', text: 'No sharp image anywhere: the screen is too close (D must be more than 4f).' };
  if (s > 0.35) return { kind: 'warn', text: 'The image is nearly in focus. Make small adjustments with the 0.1 cm buttons.' };
  if (state.pending) return { kind: '', text: 'Lens position 1 is recorded. Slide the lens to find the second sharp position (keep the screen where it is).' };
  return { kind: '', text: state.rows.length ? state.rows.length + ' set' + (state.rows.length > 1 ? 's' : '') + ' done. Slide the lens to find the first sharp position for this D.' : 'Slide the lens between the object and the screen until the image is sharp.' };
}
function renderControls() {
  $('dSl').value = state.D; $('dVal').textContent = fmt(state.D, 1); $('pSl').max = state.D - 1; $('pSl').value = state.p; $('pVal').textContent = fmt(state.p, 1);
  $('uTag').textContent = 'D = ' + fmt(state.D, 1) + ' cm'; $('vTag').textContent = 'lens at ' + fmt(state.p, 1) + ' cm';
  const s = sharp(); $('ampFill').style.width = Math.round(s * 100) + '%'; $('ampVal').textContent = Math.round(s * 100) + ' %';
  $('ampHint').textContent = s >= P.SHARP_OK ? 'sharp image' : s > 0.35 ? 'nearly in focus' : 'blurred';
  const v = P.imageDistance(state.lens.f, state.u);
  $('magVal').textContent = v && s > 0.35 ? (v / state.u > 1 ? 'magnified, ×' : 'diminished, ×') + fmt(v / state.u, 2) : '—';
  $('recordBtn').textContent = state.pending ? 'Record lens position 2' : 'Record lens position 1';
  const st = $('status'), m = state.msg || defaultStatus(); st.textContent = m.text; st.className = 'status' + (m.kind ? ' ' + m.kind : '');
}
function readingChecks() {
  const n = state.rows.length, out = []; if (!n) return out;
  const fs = state.rows.map(rowF), m = meanF();
  out.push(n >= 3 ? { k: 'ok', t: n + ' values of D measured.' } : { k: 'warn', t: 'Only ' + n + ' value' + (n > 1 ? 's' : '') + ' of D. Repeat for at least 3 different screen distances and take the mean f.' });
  const close = state.rows.filter((r) => r.D < 4.6 * m);
  if (close.length) out.push({ k: 'warn', t: 'For D = ' + close.map((r) => fmt(r.D, 1)).join(', ') + ' cm the screen is close to 4f, so d is small and the two sharp regions overlap. Results are more reliable with D well above 4f (over about ' + fmt(5 * m, 0) + ' cm).' });
  if (n >= 2) {
    let worst = -1, dev = 0;
    fs.forEach((f, k) => { const o = fs.filter((_, j) => j !== k), med = o.sort((a, b) => a - b)[Math.floor(o.length / 2)], d = Math.abs(f - med) / med; if (d > dev) { dev = d; worst = k; } });
    if (n >= 3 && dev > 0.03) out.push({ k: 'warn', t: 'The set with D = ' + fmt(state.rows[worst].D, 1) + ' cm gives f = ' + fmt(fs[worst], 2) + ' cm, ' + fmt(dev * 100, 0) + '% away from the others. Repeat it, finding each sharp position carefully.' });
    else out.push({ k: 'ok', t: 'Your values of f agree within ' + fmt((Math.max(...fs) - Math.min(...fs)) / m * 100, 1) + '%.' });
  }
  const r = state.rows[n - 1];
  out.push({ k: 'tip', t: 'For D = ' + fmt(r.D, 1) + ' cm the two positions are ' + fmt(r.p1, 1) + ' cm and ' + fmt(r.p2, 1) + ' cm from the object: ' + fmt(r.p1, 1) + ' + ' + fmt(r.p2, 1) + ' = ' + fmt(r.p1 + r.p2, 1) + ' cm ≈ D. The object and image distances simply swap places.' });
  return out;
}
function renderTable() {
  const body = $('obsBody'); body.innerHTML = '';
  const all = state.rows.concat(state.pending ? [{ D: state.pending.D, p1: state.pending.p1, p2: null }] : []);
  if (!all.length) body.innerHTML = '<tr class="empty"><td colspan="5">No readings yet</td></tr>';
  all.forEach((r) => {
    const tr = document.createElement('tr'), done = r.p2 != null;
    [fmt(r.D, 1), fmt(r.p1, 1), done ? fmt(r.p2, 1) : '…', done ? fmt(r.p2 - r.p1, 1) : '—', done ? fmt(rowF(r), 2) : '—'].forEach((v) => { const td = document.createElement('td'); td.textContent = v; tr.appendChild(td); });
    body.appendChild(tr);
  });
  const m = meanF();
  $('meanF').textContent = m === null ? '—' : fmt(m, 2) + ' cm';
  $('resultLine').textContent = m === null ? '' : 'Mean focal length f = ' + fmt(m, 2) + ' cm (' + state.rows.length + ' value' + (state.rows.length > 1 ? 's' : '') + ' of D). Power P = 100/f = ' + fmt(100 / m, 2) + ' D.';
  const list = $('checks'), items = readingChecks(); list.innerHTML = '';
  items.forEach((c) => { const li = document.createElement('li'); li.className = c.k; li.textContent = c.t; list.appendChild(li); });
  $('checksH').hidden = !items.length;
  const rv = $('revealBox');
  if (state.revealed) {
    rv.hidden = false;
    if (m === null) rv.textContent = 'Not yet: record both sharp lens positions for at least one value of D first.';
    else { const e = Math.abs(m - state.lens.f) / state.lens.f * 100; rv.textContent = 'Actual focal length: ' + fmt(state.lens.f, 1) + ' cm. Your mean f = ' + fmt(m, 2) + ' cm, an error of ' + fmt(e, 2) + '%.' + (state.rows.length < 3 ? ' Take at least 3 values of D for a reliable result.' : e > 2 ? ' To improve it, find each sharp position more carefully; see the checks above.' : ' Well done: that is within normal laboratory accuracy.'); }
  } else rv.hidden = true;
}
function render() {
  drawScreen(); renderControls(); renderTable();
  if (scene) scene.setState({ u: state.u, vs: state.vs, f: state.lens.f, lx: P.OBJ_X + state.p });
}
render();

/* ---------- full screen (with landscape lock where the browser allows it) ---------- */
(function () {
  const btn = $('fsBtn'), stage = $('stage'); if (!btn) return;
  const isFs = () => document.fullscreenElement === stage || document.webkitFullscreenElement === stage;
  const label = () => { btn.textContent = isFs() ? 'Exit full screen' : 'Full screen'; };
  btn.addEventListener('click', () => {
    try {
      if (isFs()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
      const req = stage.requestFullscreen || stage.webkitRequestFullscreen; if (!req) { btn.style.display = 'none'; return; }
      const p = req.call(stage);
      const lock = () => { try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {}); } catch (e) {} };
      if (p && p.then) p.then(lock).catch(() => {}); else lock();
    } catch (e) {}
  });
  document.addEventListener('fullscreenchange', label); document.addEventListener('webkitfullscreenchange', label);
  if (!(stage.requestFullscreen || stage.webkitRequestFullscreen)) btn.style.display = 'none';
})();
