import * as P from './physics.mjs';
import { createScene } from './scene.mjs';

const $ = (id) => document.getElementById(id);
const fmt = (v, d) => Number(v).toFixed(d);
const round1 = (v) => Math.round(v * 10) / 10;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const state = { prism: P.newPrism((Math.random() * 1e9) | 0), i: 50, rows: [], msg: null, revealed: false };

let scene = null;
try { scene = createScene($('view'), { onDrag: (v) => setI(v) }); } catch (e) { scene = null; }
if (!scene) $('stage').classList.add('nogl-on');

const curDelta = () => P.deltaReading(state.prism, state.i);
const pts = () => state.rows.map((r) => ({ x: r.i, y: r.d }));
const fit = () => P.fitMinimum(pts());
function say(kind, text) { state.msg = { kind, text }; }

function setI(v) { state.i = round1(clamp(v, P.I_MIN, P.I_MAX)); state.msg = null; render(); }

function record() {
  const d = curDelta();
  if (d === null) { say('err', 'At this angle the ray cannot leave the second face (total internal reflection), so there is no deviation to read. Increase the angle of incidence.'); return render(); }
  const row = { i: state.i, d }, ex = state.rows.findIndex((r) => r.i === state.i);
  if (ex >= 0) state.rows[ex] = row; else state.rows.push(row);
  state.rows.sort((a, b) => a.i - b.i); state.revealed = false;
  say('good', 'Recorded i = ' + fmt(row.i, 1) + '°, δ = ' + fmt(row.d, 1) + '°. Choose another angle of incidence.');
  render();
}

$('iSl').addEventListener('input', (e) => setI(parseFloat(e.target.value)));
Array.prototype.forEach.call(document.querySelectorAll('.nudge [data-d]'), (b) => b.addEventListener('click', () => setI(state.i + parseFloat(b.getAttribute('data-d')))));
$('recordBtn').addEventListener('click', record);
$('delLast').addEventListener('click', () => { state.rows.pop(); state.revealed = false; state.msg = null; render(); });
$('resetAll').addEventListener('click', () => { state.rows = []; state.revealed = false; say('warn', 'Readings cleared.'); render(); });
$('newPrism').addEventListener('click', () => { state.prism = P.newPrism((Math.random() * 1e9) | 0); state.rows = []; state.revealed = false; say('warn', 'A new unknown prism is on the board. Start again.'); render(); });
$('reveal').addEventListener('click', () => { state.revealed = true; render(); });
Array.prototype.forEach.call(document.querySelectorAll('.views [data-view]'), (b) => b.addEventListener('click', () => scene && scene.setView(b.getAttribute('data-view'))));

/* ---------- render ---------- */
function trendText() {
  const s = P.slope(state.prism.n, state.i);
  if (s === null) return { k: 'warn', t: 'No emergent ray: total internal reflection at the second face.' };
  if (s < -0.12) return { k: '', t: 'δ is still falling as i increases.' };
  if (s > 0.12) return { k: '', t: 'δ is now rising as i increases: the minimum is behind you.' };
  return { k: 'good', t: 'δ is almost steady here: you are close to the minimum.' };
}
function defaultStatus() {
  const d = curDelta();
  if (d === null) return { kind: 'warn', text: 'Total internal reflection: the ray inside strikes the second face at more than the critical angle and cannot get out. Increase the angle of incidence.' };
  if (!state.rows.length) return { kind: '', text: 'Step 1: turn the prism (slider or drag) and read the deviation δ on the protractor. Record about ten values of i from 35° to 70°, taking more points near the lowest δ.' };
  const n = state.rows.length;
  if (n < 5) return { kind: '', text: n + ' reading' + (n > 1 ? 's' : '') + ' recorded. Take at least five, with some on each side of the minimum.' };
  return { kind: '', text: n + ' readings recorded. Check the graph: the curve should fall, turn and rise. Add points near the lowest part if it looks uncertain.' };
}
function renderControls() {
  $('iSl').value = state.i; $('iVal').textContent = fmt(state.i, 1);
  const d = curDelta(); $('dVal').textContent = d === null ? '—' : fmt(d, 1);
  $('iTag').textContent = 'i = ' + fmt(state.i, 1) + '°'; $('dTag').textContent = d === null ? 'δ: no emergent ray' : 'δ = ' + fmt(d, 1) + '°';
  const t = trendText(); $('trend').textContent = t.t;
  const st = $('status'), m = state.msg || defaultStatus(); st.textContent = m.text; st.className = 'status' + (m.kind ? ' ' + m.kind : '');
}

function result() {
  if (state.rows.length < 5) return null;
  const f = fit(); if (!f) return null;
  return { dm: f.ymin, im: f.xmin, n: P.indexFrom(f.ymin), f };
}
function renderTable() {
  const body = $('obsBody'); body.innerHTML = '';
  if (!state.rows.length) body.innerHTML = '<tr class="empty"><td colspan="3">No readings yet</td></tr>';
  state.rows.forEach((r, k) => {
    const tr = document.createElement('tr');
    [String(k + 1), fmt(r.i, 1), fmt(r.d, 1)].forEach((x) => { const td = document.createElement('td'); td.textContent = x; tr.appendChild(td); });
    body.appendChild(tr);
  });
  const res = result();
  $('resultLine').textContent = res ? 'Minimum deviation from the graph: D = ' + fmt(res.dm, 1) + '° (at i ≈ ' + fmt(res.im, 1) + '°). So n = sin((60° + ' + fmt(res.dm, 1) + '°)/2) / sin 30° = ' + fmt(res.n, 3) + '.'
    : state.rows.length ? 'Record at least five readings, with some on both sides of the lowest δ, to find D from the graph.' : '';
  const rv = $('revealBox');
  if (state.revealed) {
    rv.hidden = false;
    if (!res) rv.textContent = 'Record at least five readings around the minimum first, then check your answer.';
    else { const dm = P.minDeviation(state.prism.n); rv.textContent = 'Actual refractive index: ' + fmt(state.prism.n, 3) + ' (minimum deviation ' + fmt(dm, 1) + '°). Your n = ' + fmt(res.n, 3) + ', an error of ' + fmt(Math.abs(res.n - state.prism.n) / state.prism.n * 100, 2) + '%.'; }
  } else rv.hidden = true;
}

function niceStep(range, n) { const raw = range / n, mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), f = raw / mag; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * mag; }
function drawGraph() {
  const canvas = $('graph1'), dpr = window.devicePixelRatio || 1, cssW = canvas.clientWidth || 320, cssH = Math.round(cssW * 0.68);
  canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
  const ctx = canvas.getContext('2d'); if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, cssW, cssH);
  const p = pts(), res = result();
  let xlo = 30, xhi = 75, ylo = 40, yhi = 60;
  if (p.length) { const xs = p.map((q) => q.x), ys = p.map((q) => q.y); xlo = Math.floor((Math.min(...xs) - 2) / 5) * 5; xhi = Math.ceil((Math.max(...xs) + 2) / 5) * 5; ylo = Math.floor(Math.min(...ys) - 2); yhi = Math.ceil(Math.max(...ys) + 2); if (xhi - xlo < 20) xhi = xlo + 20; if (yhi - ylo < 6) yhi = ylo + 6; }
  const sxs = niceStep(xhi - xlo, 6), sys = niceStep(yhi - ylo, 6);
  xlo = Math.floor(xlo / sxs) * sxs; xhi = Math.ceil(xhi / sxs) * sxs; ylo = Math.floor(ylo / sys) * sys; yhi = Math.ceil(yhi / sys) * sys;
  const pad = { l: 52, r: 14, t: 12, b: 42 }, w = cssW - pad.l - pad.r, h = cssH - pad.t - pad.b;
  const sx = (v) => pad.l + ((v - xlo) / (xhi - xlo)) * w, sy = (v) => pad.t + h - ((v - ylo) / (yhi - ylo)) * h;
  ctx.font = '11px "Space Mono", monospace'; ctx.strokeStyle = '#d8d0bb'; ctx.fillStyle = '#4b5b63'; ctx.lineWidth = 1;
  for (let v = xlo; v <= xhi + 1e-9; v += sxs) { ctx.beginPath(); ctx.moveTo(sx(v), pad.t); ctx.lineTo(sx(v), pad.t + h); ctx.stroke(); ctx.textAlign = 'center'; ctx.fillText(String(Math.round(v * 100) / 100), sx(v), pad.t + h + 14); }
  for (let v = ylo; v <= yhi + 1e-9; v += sys) { ctx.beginPath(); ctx.moveTo(pad.l, sy(v)); ctx.lineTo(pad.l + w, sy(v)); ctx.stroke(); ctx.textAlign = 'right'; ctx.fillText(String(Math.round(v * 100) / 100), pad.l - 5, sy(v) + 4); }
  ctx.strokeStyle = '#0c1c27'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, pad.t + h); ctx.lineTo(pad.l + w, pad.t + h); ctx.stroke();
  ctx.fillStyle = '#0c1c27'; ctx.textAlign = 'center'; ctx.fillText('angle of incidence i (°)', pad.l + w / 2, cssH - 5);
  ctx.save(); ctx.translate(12, pad.t + h / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('deviation δ (°)', 0, 0); ctx.restore();
  if (res) {
    const { a, b, c } = res.f, x0 = Math.max(xlo, res.im - 16), x1 = Math.min(xhi, res.im + 16);
    ctx.strokeStyle = '#e8511d'; ctx.lineWidth = 2; ctx.beginPath();
    for (let k = 0; k <= 60; k++) { const x = x0 + ((x1 - x0) * k) / 60, y = a * x * x + b * x + c; (k ? ctx.lineTo : ctx.moveTo).call(ctx, sx(x), sy(clamp(y, ylo, yhi))); }
    ctx.stroke();
    ctx.setLineDash([5, 4]); ctx.strokeStyle = '#4b5b63'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(pad.l, sy(res.dm)); ctx.lineTo(sx(res.im), sy(res.dm)); ctx.lineTo(sx(res.im), pad.t + h); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#e8511d'; ctx.beginPath(); ctx.arc(sx(res.im), sy(res.dm), 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0c1c27'; ctx.textAlign = 'left'; ctx.fillText('D = ' + fmt(res.dm, 1) + '°', Math.min(sx(res.im) + 8, pad.l + w - 70), sy(res.dm) - 9);
  } else if (p.length > 1) {
    ctx.strokeStyle = '#e8511d'; ctx.lineWidth = 2; ctx.beginPath(); p.forEach((q, k) => (k ? ctx.lineTo(sx(q.x), sy(q.y)) : ctx.moveTo(sx(q.x), sy(q.y)))); ctx.stroke();
  }
  ctx.fillStyle = '#12a0a0';
  p.forEach((q) => { ctx.beginPath(); ctx.arc(sx(q.x), sy(q.y), 4.5, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); });
  const res2 = res;
  $('slopeLine').textContent = res2 ? 'The curve has its lowest point at i ≈ ' + fmt(res2.im, 1) + '° where δ = D = ' + fmt(res2.dm, 1) + '°. At this point i = e.' : 'Record at least 5 readings on both sides of the minimum to see the curve.';
}

function render() {
  renderControls(); renderTable(); drawGraph();
  if (scene) scene.setState({ i: state.i, n: state.prism.n });
}
window.addEventListener('resize', drawGraph);
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
