import * as P from './physics.mjs';
import { createScene } from './scene.mjs';

const $ = (id) => document.getElementById(id);
const fmt = (v, d) => Number(v).toFixed(d);
const round1 = (v) => Math.round(v * 10) / 10;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const txt = (s) => s;

const state = { lens: P.newLens((Math.random() * 1e9) | 0), u: 25, vs: 40, rows: [], msg: null, revealed: false };

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
  const blurCm = (AP * Math.abs(state.vs - vTrue)) / vTrue, bpx = Math.min(70, blurCm * pxcm * 0.5);
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
try { scene = createScene($('view'), { onDrag: (which, v) => (which === 'object' ? setU(v) : setV(v)) }, sv); } catch (e) { scene = null; }
if (!scene) $('stage').classList.add('nogl-on');

/* ---------- derived ---------- */
const sharp = () => P.sharpness(state.lens, state.u, state.vs);
const rowF = (r) => P.focalLength(r.u, r.v);
const meanF = () => (state.rows.length ? state.rows.reduce((a, r) => a + rowF(r), 0) / state.rows.length : null);
function say(kind, text) { state.msg = { kind, text }; }

/* ---------- actions ---------- */
function setU(v) { state.u = round1(clamp(v, P.U_MIN, P.U_MAX)); state.msg = null; render(); }
function setV(v) { state.vs = round1(clamp(v, 0, P.V_MAX)); state.msg = null; render(); }

function record() {
  const f = state.lens.f;
  if (P.imageDistance(f, state.u) === null) { say('err', 'The object is inside the focal length, so no real image forms on the screen. Move the object further from the lens.'); return render(); }
  if (P.bestScreen(state.lens, state.u) === null) { say('err', 'The image falls beyond the end of the bench. Move the object further from the lens.'); return render(); }
  if (sharp() < P.SHARP_OK) {
    const further = state.vs < P.bestScreen(state.lens, state.u);
    say('err', 'The image is still blurred, so this v would give a wrong f. Move the screen ' + (further ? 'further from' : 'closer to') + ' the lens in small steps until the arrow’s edges look sharpest, then record.');
    return render();
  }
  const row = { u: state.u, v: state.vs }, ex = state.rows.findIndex((r) => r.u === state.u);
  if (ex >= 0) state.rows[ex] = row; else state.rows.push(row);
  state.rows.sort((a, b) => a.u - b.u); state.revealed = false;
  say('good', 'Recorded u = ' + fmt(row.u, 1) + ' cm, v = ' + fmt(row.v, 1) + ' cm, giving f = ' + fmt(rowF(row), 2) + ' cm. Move the object to a new position.');
  render();
}

$('uSl').addEventListener('input', (e) => setU(parseFloat(e.target.value)));
$('vSl').addEventListener('input', (e) => setV(parseFloat(e.target.value)));
Array.prototype.forEach.call(document.querySelectorAll('.nudge [data-d]'), (b) => {
  b.addEventListener('click', () => { const d = parseFloat(b.getAttribute('data-d')); b.getAttribute('data-t') === 'u' ? setU(state.u + d) : setV(state.vs + d); });
});
$('recordBtn').addEventListener('click', record);
$('delLast').addEventListener('click', () => { state.rows.pop(); state.revealed = false; state.msg = null; render(); });
$('resetAll').addEventListener('click', () => { state.rows = []; state.revealed = false; say('warn', 'Readings cleared.'); render(); });
$('newLens').addEventListener('click', () => { state.lens = P.newLens((Math.random() * 1e9) | 0); state.rows = []; state.revealed = false; say('warn', 'A new unknown lens is on the bench. Start again.'); render(); });
$('reveal').addEventListener('click', () => { state.revealed = true; render(); });
Array.prototype.forEach.call(document.querySelectorAll('.views [data-view]'), (b) => b.addEventListener('click', () => scene && scene.setView(b.getAttribute('data-view'))));

/* ---------- render ---------- */
function defaultStatus() {
  const f = state.lens.f, v = P.imageDistance(f, state.u);
  if (v === null) return { kind: 'warn', text: 'The object is close to the lens (inside its focal length): the rays spread out and no image forms on the screen. Move the object further away.' };
  if (P.bestScreen(state.lens, state.u) === null) return { kind: 'warn', text: 'The image would fall beyond the end of the bench. Move the object further from the lens.' };
  const s = sharp();
  if (s >= P.SHARP_OK) return { kind: 'good', text: 'The image is sharp. Read v and press Record. Moving the screen a little each side confirms the best focus.' };
  if (s > 0.35) return { kind: 'warn', text: 'The image is nearly in focus. Make small adjustments with the 0.1 cm buttons.' };
  if (!state.rows.length) return { kind: '', text: 'Step 1: set u (try 1.5 f to 3 f), then slide the screen until the image of the arrow is sharp and press “Record u and v”. Repeat for at least five values of u.' };
  return { kind: '', text: state.rows.length + ' reading' + (state.rows.length > 1 ? 's' : '') + ' recorded. Choose a new u and find the sharp image again.' };
}

function renderControls() {
  $('uSl').value = state.u; $('uVal').textContent = fmt(state.u, 1); $('vSl').value = state.vs; $('vVal').textContent = fmt(state.vs, 1);
  $('uTag').textContent = 'u = ' + fmt(state.u, 1) + ' cm'; $('vTag').textContent = 'v = ' + fmt(state.vs, 1) + ' cm';
  const s = sharp(); $('ampFill').style.width = Math.round(s * 100) + '%'; $('ampVal').textContent = Math.round(s * 100) + ' %';
  $('ampHint').textContent = s >= P.SHARP_OK ? 'sharp image' : s > 0.35 ? 'nearly in focus' : P.imageDistance(state.lens.f, state.u) === null ? 'no real image' : 'blurred';
  const v = P.imageDistance(state.lens.f, state.u);
  $('magVal').textContent = v === null || s < 0.35 ? '—' : 'about ' + fmt(P.magnification(state.u, v), 2) + ' × the object (inverted)';
  const st = $('status'), m = state.msg || defaultStatus(); st.textContent = m.text; st.className = 'status' + (m.kind ? ' ' + m.kind : '');
}

// Checks on the recorded readings, so the student knows what to improve
function readingChecks() {
  const n = state.rows.length, out = []; if (!n) return out;
  const fs = state.rows.map(rowF), m = meanF();
  out.push(n >= 5 ? { k: 'ok', t: n + ' readings recorded.' } : { k: 'warn', t: 'Only ' + n + ' reading' + (n > 1 ? 's' : '') + ' so far. Take at least 5, each with a different u, so that one careless reading cannot spoil the mean.' });
  if (n >= 2) {
    const us = state.rows.map((r) => r.u), lo = Math.min.apply(null, us), hi = Math.max.apply(null, us);
    const want = Math.min(P.U_MAX, 3 * m) - 1.5 * m;
    if (hi - lo < 0.6 * want) out.push({ k: 'warn', t: 'Your object distances are bunched together (' + fmt(lo, 1) + '–' + fmt(hi, 1) + ' cm). Spread u from about 1.5f to 3f, that is roughly ' + fmt(1.5 * m, 0) + ' to ' + fmt(Math.min(P.U_MAX, 3 * m), 0) + ' cm, so the graphs show the full curve.' });
    else out.push({ k: 'ok', t: 'Object distances are well spread (' + fmt(lo, 1) + '–' + fmt(hi, 1) + ' cm).' });
  }
  if (n >= 3) {
    let worst = -1, dev = 0;
    fs.forEach((f, k) => { const others = fs.filter((_, j) => j !== k).sort((a, b) => a - b), med = others[Math.floor(others.length / 2)], d = Math.abs(f - med) / med; if (d > dev) { dev = d; worst = k; } });
    if (dev > 0.04) out.push({ k: 'warn', t: 'Reading ' + (worst + 1) + ' (u = ' + fmt(state.rows[worst].u, 1) + ' cm) gives f = ' + fmt(fs[worst], 2) + ' cm, ' + fmt(dev * 100, 0) + '% away from the others. The screen was probably not at the sharpest position: set the same u and repeat it (the new reading replaces the old one).' });
    else { const sp = (Math.max.apply(null, fs) - Math.min.apply(null, fs)) / m * 100; out.push({ k: 'ok', t: 'Your values of f agree with each other within ' + fmt(sp, 1) + '%.' }); }
  }
  if (n >= 2 && !state.rows.some((r) => Math.abs(r.u - r.v) / r.u < 0.12)) out.push({ k: 'tip', t: 'Tip: try one reading with the object near u = 2f (about ' + fmt(2 * m, 0) + ' cm). There the image is the same size as the object and u ≈ v, a quick check that f = u/2.' });
  return out;
}
function renderChecks() {
  const list = $('checks'), items = readingChecks(); list.innerHTML = '';
  items.forEach((c) => { const li = document.createElement('li'); li.className = c.k; li.textContent = c.t; list.appendChild(li); });
  $('checksH').hidden = !items.length;
}
function renderTable() {
  const body = $('obsBody'); body.innerHTML = '';
  if (!state.rows.length) body.innerHTML = '<tr class="empty"><td colspan="5">No readings yet</td></tr>';
  state.rows.forEach((r) => {
    const tr = document.createElement('tr');
    [fmt(r.u, 1), fmt(r.v, 1), fmt(rowF(r), 2), fmt(1 / r.u, 4), fmt(1 / r.v, 4)].forEach((x) => { const td = document.createElement('td'); td.textContent = x; tr.appendChild(td); });
    body.appendChild(tr);
  });
  const m = meanF();
  $('meanF').textContent = m === null ? '—' : fmt(m, 2) + ' cm';
  $('resultLine').textContent = m === null ? '' : 'Mean f = ' + fmt(m, 2) + ' cm (' + state.rows.length + ' reading' + (state.rows.length > 1 ? 's' : '') + '), so the power of the lens is P = 100 / f = ' + fmt(100 / m, 2) + ' D.';
  renderChecks();
  const rv = $('revealBox');
  if (state.revealed) {
    rv.hidden = false;
    if (m === null) rv.textContent = 'Not yet: record at least one sharp-image reading first, then check your answer.';
    else rv.textContent = 'Actual focal length: ' + fmt(state.lens.f, 1) + ' cm (power ' + fmt(100 / state.lens.f, 2) + ' D). Your mean f = ' + fmt(m, 2) + ' cm, an error of ' + fmt(Math.abs(m - state.lens.f) / state.lens.f * 100, 2) + '%.' + (state.rows.length < 5 ? ' With only ' + state.rows.length + ' reading' + (state.rows.length > 1 ? 's' : '') + ' this is not yet a reliable result: take at least 5.' : Math.abs(m - state.lens.f) / state.lens.f > 0.02 ? ' An error above 2% usually means some screen positions were not at the sharpest image; repeat the readings flagged above.' : ' Well done: that is within normal laboratory accuracy.');
  } else rv.hidden = true;
}

function niceAxis(maxV, n) {
  const raw = maxV / n, mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), f = raw / mag;
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  const step = parseFloat((nf * mag).toPrecision(6));
  return { step, max: parseFloat((Math.ceil(maxV / step - 1e-9) * step).toPrecision(6)) };
}
const decimalsOf = (s) => { const t = String(s), i = t.indexOf('.'); return i < 0 ? 0 : Math.min(5, t.length - i - 1); };

function drawGraph(canvas, pts, opts) {
  const dpr = window.devicePixelRatio || 1, cssW = canvas.clientWidth || 320, cssH = Math.round(cssW * 0.75);
  canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
  const ctx = canvas.getContext('2d'); if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, cssW, cssH);
  let maxX = pts.length ? Math.max(...pts.map((p) => p.x)) * 1.12 : opts.defX, maxY = pts.length ? Math.max(...pts.map((p) => p.y)) * 1.12 : opts.defY;
  if (opts.square) { const m = Math.max(maxX, maxY, opts.fit && opts.fit.a > 0 ? opts.fit.a * 1.05 : 0); maxX = maxY = m; }
  const ax = niceAxis(maxX, 5), ay = niceAxis(maxY, 5); maxX = ax.max; maxY = ay.max;
  const pad = { l: 62, r: 14, t: 12, b: 42 }, w = cssW - pad.l - pad.r, h = cssH - pad.t - pad.b;
  const sx = (v) => pad.l + (v / maxX) * w, sy = (v) => pad.t + h - (v / maxY) * h;
  ctx.font = '11px "Space Mono", monospace'; ctx.strokeStyle = '#d8d0bb'; ctx.fillStyle = '#4b5b63'; ctx.lineWidth = 1;
  const nx = Math.round(maxX / ax.step), ny = Math.round(maxY / ay.step), dx = decimalsOf(ax.step), dy = decimalsOf(ay.step);
  for (let i = 0; i <= nx; i++) { const v = i * ax.step; ctx.beginPath(); ctx.moveTo(sx(v), pad.t); ctx.lineTo(sx(v), pad.t + h); ctx.stroke(); ctx.textAlign = 'center'; ctx.fillText(v.toFixed(dx), sx(v), pad.t + h + 14); }
  for (let i = 0; i <= ny; i++) { const v = i * ay.step; ctx.beginPath(); ctx.moveTo(pad.l, sy(v)); ctx.lineTo(pad.l + w, sy(v)); ctx.stroke(); ctx.textAlign = 'right'; ctx.fillText(v.toFixed(dy), pad.l - 5, sy(v) + 4); }
  ctx.strokeStyle = '#0c1c27'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, pad.t + h); ctx.lineTo(pad.l + w, pad.t + h); ctx.stroke();
  ctx.fillStyle = '#0c1c27'; ctx.textAlign = 'center'; ctx.fillText(opts.xl, pad.l + w / 2, cssH - 5);
  ctx.save(); ctx.translate(12, pad.t + h / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(opts.yl, 0, 0); ctx.restore();
  if (opts.fit) {
    const { a, b } = opts.fit; ctx.strokeStyle = '#e8511d'; ctx.lineWidth = 2; ctx.beginPath();
    ctx.moveTo(sx(0), sy(a)); const xe = b < 0 ? Math.min(maxX, -a / b) : maxX; ctx.lineTo(sx(xe), sy(a + b * xe)); ctx.stroke();
  } else if (opts.join && pts.length > 1) {
    ctx.strokeStyle = '#e8511d'; ctx.lineWidth = 2; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(sx(p.x), sy(p.y)) : ctx.moveTo(sx(p.x), sy(p.y)))); ctx.stroke();
  }
  ctx.fillStyle = '#12a0a0';
  pts.forEach((p) => { ctx.beginPath(); ctx.arc(sx(p.x), sy(p.y), 4.5, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); });
}

function renderGraphs() {
  const p1 = state.rows.map((r) => ({ x: r.u, y: r.v })), p2 = state.rows.map((r) => ({ x: 1 / r.u, y: 1 / r.v }));
  const fit = state.rows.length >= 2 ? P.linearFit(p2) : null;
  drawGraph($('graph1'), p1, { xl: 'u (cm)', yl: 'v (cm)', defX: 40, defY: 80, join: true });
  drawGraph($('graph2'), p2, { xl: '1/u (cm⁻¹)', yl: '1/v (cm⁻¹)', defX: 0.1, defY: 0.1, fit, square: true });
  $('slopeLine').textContent = fit ? 'Best-fit line of 1/v against 1/u: intercept on the 1/v axis = ' + fmt(fit.a, 4) + ' cm⁻¹, so f = 1/intercept = ' + fmt(1 / fit.a, 2) + ' cm (slope ' + fmt(fit.b, 2) + ', close to −1)'
    : 'Record at least 2 readings to see the best-fit line.';
}

function render() {
  drawScreen(); renderControls(); renderTable(); renderGraphs();
  if (scene) scene.setState({ u: state.u, vs: state.vs, f: state.lens.f });
}
window.addEventListener('resize', renderGraphs);
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
