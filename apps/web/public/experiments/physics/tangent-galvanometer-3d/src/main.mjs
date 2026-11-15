import * as P from './physics.mjs';
import { createScene } from './scene.mjs';

const $ = (id) => document.getElementById(id);
const fmt = (v, d) => Number(v).toFixed(d);
const RAD = Math.PI / 180;

const state = { s: null, alpha: 0, n: 50, I: 0, key: false, dir: 1, pending: null, rows: [], msg: null, revealed: false, aligned: false };
function fresh() { state.s = P.newSetup((Math.random() * 1e9) | 0); state.alpha = state.s.alpha0; state.rows = []; state.pending = null; state.revealed = false; state.aligned = false; state.key = false; state.I = 0; state.dir = 1; }
fresh();
let scene = null;
try { scene = createScene($('view')); } catch (e) { scene = null; }
if (!scene) $('stage').classList.add('nogl-on');
function say(k, t) { state.msg = { kind: k, text: t }; }
const curI = () => (state.key ? state.I : 0);
const reading = () => P.pointerReadings(state.s, state.n, curI(), state.alpha, state.dir);
const C = () => Math.round(P.circumference(state.s) * 10) / 10;   // cm, as measured
const rStudent = () => C() / (2 * Math.PI) / 100;                   // m

function setAlpha(v) { state.alpha = Math.round(Math.max(-P.ALPHA_MAX, Math.min(P.ALPHA_MAX, v)) * 2) / 2; if (state.pending) { state.pending = null; say('warn', 'The instrument was turned, so the direct reading no longer matches. Take it again.'); } else state.msg = null; render(); }
function setI(v) { const nv = Math.round(Math.max(0, Math.min(P.I_MAX, v)) * 100) / 100; if (state.pending && nv !== state.pending.I) { state.pending = null; say('warn', 'The current was changed, so the direct reading no longer matches. Take both directions at the same current.'); } else state.msg = null; state.I = nv; render(); }
$('aSl').addEventListener('input', (e) => setAlpha(parseFloat(e.target.value)));
$('iSl').addEventListener('input', (e) => setI(parseFloat(e.target.value)));
Array.prototype.forEach.call(document.querySelectorAll('[data-a]'), (b) => b.addEventListener('click', () => setAlpha(state.alpha + parseFloat(b.getAttribute('data-a')))));
Array.prototype.forEach.call(document.querySelectorAll('[data-i]'), (b) => b.addEventListener('click', () => setI(state.I + parseFloat(b.getAttribute('data-i')))));
$('nChips').addEventListener('click', (e) => { const b = e.target.closest('[data-n]'); if (!b) return; state.n = +b.getAttribute('data-n'); state.pending = null; state.msg = null; render(); });
$('keyBtn').addEventListener('click', () => {
  if (!state.key && !state.aligned) { say('err', 'Before passing any current, set the coil in the magnetic meridian: with the key open, turn the instrument until the pointer reads 0–0.'); return render(); }
  state.key = !state.key; state.msg = null; render();
});
$('commBtn').addEventListener('click', () => { state.dir = -state.dir; state.msg = null; render(); });

$('recordBtn').addEventListener('click', () => {
  if (!state.key || state.I <= 0) { say('err', 'Close the key and set a current with the rheostat first.'); return render(); }
  const r = reading(), th = (r.t1 + r.t2) / 2;
  if (th < 10) { say('err', 'θ ≈ ' + fmt(th, 1) + '° is too small to read accurately. Increase the current' + (state.n < 50 ? ', or use more turns' : '') + '. Aim for 30°–60°.'); return render(); }
  if (th > 75) { say('err', 'θ ≈ ' + fmt(th, 1) + '° is too large: near 90° a small reading error gives a big error in tan θ. Reduce the current' + (state.n > 2 ? ' or use fewer turns' : '') + '.'); return render(); }
  if (!state.pending) {
    state.pending = { n: state.n, I: state.I, t1: r.t1, t2: r.t2, dir: state.dir };
    say('good', 'Recorded θ₁ = ' + fmt(r.t1, 1) + '°, θ₂ = ' + fmt(r.t2, 1) + '°. Now reverse the current with the commutator (keep the same current) and read both ends again.');
    return render();
  }
  if (state.dir === state.pending.dir) { say('err', 'Reverse the current with the commutator first. The needle must deflect to the other side.'); return render(); }
  const p = state.pending, row = { n: p.n, I: p.I, t1: p.t1, t2: p.t2, t3: r.t1, t4: r.t2, alpha: state.alpha };
  state.rows.push(row); state.pending = null; state.revealed = false;
  const m = (row.t1 + row.t2 + row.t3 + row.t4) / 4;
  say('good', 'Mean θ = ' + fmt(m, 2) + '°, so K = I/tan θ = ' + fmt(row.I / Math.tan(m * RAD), 4) + ' A. Change the current and repeat (aim for 3–4 currents between 30° and 60°).');
  render();
});
$('delLast').addEventListener('click', () => { if (state.pending) state.pending = null; else state.rows.pop(); state.revealed = false; state.msg = null; render(); });
$('newSet').addEventListener('click', () => { fresh(); say('warn', 'New location: the instrument is set down at a random angle again. Start by setting the coil in the magnetic meridian.'); render(); });
$('reveal').addEventListener('click', () => { state.revealed = true; render(); });
Array.prototype.forEach.call(document.querySelectorAll('.views [data-view]'), (b) => b.addEventListener('click', () => scene && scene.setView(b.getAttribute('data-view'))));

/* ---------- dial drawing (looking down into the box) ---------- */
function drawDial() {
  const cv = $('dialView'), dpr = window.devicePixelRatio || 1, S = 260; cv.width = S * dpr; cv.height = S * dpr;
  const ctx = cv.getContext('2d'); if (!ctx) return; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, S, S);
  const c = S / 2, R = 118;
  ctx.fillStyle = '#f5f1e4'; ctx.beginPath(); ctx.arc(c, c, R, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#1c2a33'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#1c2a33'; ctx.font = 'bold 11px "Space Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let d = 0; d < 360; d += 2) { const a = d * RAD, big = d % 10 === 0, len = big ? 12 : 6; ctx.lineWidth = big ? 1.6 : 0.8; ctx.beginPath(); ctx.moveTo(c + R * Math.cos(a), c - R * Math.sin(a)); ctx.lineTo(c + (R - len) * Math.cos(a), c - (R - len) * Math.sin(a)); ctx.stroke(); if (d % 30 === 0) { let v = d % 180; if (v > 90) v = 180 - v; ctx.fillText(String(v), c + (R - 24) * Math.cos(a), c - (R - 24) * Math.sin(a)); } }
  ctx.fillStyle = '#7a6a4a'; ctx.fillText('coil plane', c, c - R + 40);
  // needle and pointer, relative to the scale (which turns with the coil)
  const d = P.deflection(state.s, state.n, curI(), state.alpha, state.dir), na = (90 + d) * RAD;   // needle direction on the dial: up = along the coil plane
  ctx.strokeStyle = '#2c2c2c'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(c - 26 * Math.cos(na), c + 26 * Math.sin(na)); ctx.lineTo(c + 26 * Math.cos(na), c - 26 * Math.sin(na)); ctx.stroke();
  ctx.strokeStyle = '#d8342a'; ctx.beginPath(); ctx.moveTo(c + 10 * Math.cos(na), c - 10 * Math.sin(na)); ctx.lineTo(c + 26 * Math.cos(na), c - 26 * Math.sin(na)); ctx.stroke();
  const pa = d * RAD; ctx.strokeStyle = '#0c6fae'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(c - (R - 4) * Math.cos(pa), c + (R - 4) * Math.sin(pa)); ctx.lineTo(c + (R - 4) * Math.cos(pa), c - (R - 4) * Math.sin(pa)); ctx.stroke();
  ctx.fillStyle = '#c9a14a'; ctx.beginPath(); ctx.arc(c, c, 4, 0, Math.PI * 2); ctx.fill();
}

/* ---------- results ---------- */
const meanTh = (r) => (r.t1 + r.t2 + r.t3 + r.t4) / 4;
const Kof = (r) => r.I / Math.tan(meanTh(r) * RAD);
function byN() { const g = {}; state.rows.forEach((r) => { (g[r.n] = g[r.n] || []).push(r); }); return g; }
function readingChecks() {
  const out = [], rows = state.rows; if (!rows.length) return out;
  const g = byN();
  Object.keys(g).forEach((n) => { const k = g[n].length; out.push(k >= 3 ? { k: 'ok', t: 'n = ' + n + ': ' + k + ' currents.' } : { k: 'warn', t: 'n = ' + n + ': only ' + k + ' current' + (k > 1 ? 's' : '') + '. Take 3–4 different currents giving θ between 30° and 60°.' }); });
  const bad = rows.filter((r) => Math.abs((r.t1 + r.t2) / 2 - (r.t3 + r.t4) / 2) > 2);
  if (bad.length) out.push({ k: 'warn', t: 'For ' + bad.length + ' reading' + (bad.length > 1 ? 's' : '') + ' the direct and reversed deflections differ by more than 2°. The coil is not exactly in the magnetic meridian. Switch the current off and turn the instrument until the pointer reads exactly 0–0. (The mean of both directions still largely cancels this error.)' });
  else out.push({ k: 'ok', t: 'Direct and reversed deflections agree, so the coil is in the magnetic meridian.' });
  const out45 = rows.filter((r) => meanTh(r) < 30 || meanTh(r) > 60);
  if (out45.length) out.push({ k: 'warn', t: out45.length + ' reading' + (out45.length > 1 ? 's are' : ' is') + ' outside 30°–60°. The error in K is smallest near 45°.' });
  Object.keys(g).forEach((n) => { const ks = g[n].map(Kof); if (ks.length >= 2) { const m = ks.reduce((a, b) => a + b) / ks.length, sp = (Math.max(...ks) - Math.min(...ks)) / m * 100; out.push(sp > 4 ? { k: 'warn', t: 'n = ' + n + ': your K values differ by ' + fmt(sp, 1) + '%. Repeat the readings that stand out.' } : { k: 'ok', t: 'n = ' + n + ': K is constant within ' + fmt(sp, 1) + '%, as the tangent law predicts.' }); } });
  out.push({ k: 'tip', t: 'Read both ends of the pointer: if the pivot is slightly off-centre, one end reads high and the other low, and their mean is correct (here they differ by about ' + fmt(2 * state.s.ecc, 1) + '°).' });
  return out;
}
function render() {
  const r = reading(), noI = curI() === 0;
  if (noI && Math.abs(r.raw) < 0.25) { if (!state.aligned) { state.aligned = true; if (!state.msg) say('good', 'The pointer reads 0–0: the coil is in the magnetic meridian. Now choose the number of turns, close the key and set a current.'); } }
  $('aSl').value = state.alpha; $('iSl').value = state.I;
  $('nChips').innerHTML = P.TURNS.map((n) => '<button type="button" class="chip" data-n="' + n + '" aria-pressed="' + (n === state.n) + '">' + n + ' turns</button>').join('');
  $('keyBtn').textContent = state.key ? 'Key closed' : 'Key open'; $('keyBtn').setAttribute('aria-pressed', String(state.key));
  $('commBtn').textContent = 'Commutator: ' + (state.dir > 0 ? 'direct' : 'reversed'); $('commBtn').setAttribute('aria-pressed', String(state.dir < 0));
  $('recordBtn').textContent = state.pending ? 'Record both ends (reversed)' : 'Record both pointer ends (direct)';
  $('meters').innerHTML = '<div><b>pointer end 1</b><span>' + fmt(r.t1, 1) + '°</span></div><div><b>pointer end 2</b><span>' + fmt(Math.max(0, r.t2), 1) + '°</span></div><div><b>ammeter</b><span>' + fmt(curI(), 2) + ' A</span></div>';
  $('tTag').textContent = 'θ ≈ ' + fmt(Math.abs(r.raw), 1) + '° ' + (Math.abs(r.raw) < 0.25 ? '' : r.side); $('iTag').textContent = 'I = ' + fmt(curI(), 2) + ' A';
  Array.prototype.forEach.call(document.querySelectorAll('#steps li'), (li) => { const k = +li.getAttribute('data-s'); li.className = k === 0 ? (state.aligned ? 'done' : 'now') : k === 1 ? (state.aligned && !state.pending ? 'now' : state.pending ? 'done' : '') : state.pending ? 'now' : ''; });
  $('circLine').textContent = 'Circumference of the coil (measured with a thread): C = ' + fmt(C(), 1) + ' cm, so r = C/2π = ' + fmt(C() / (2 * Math.PI), 2) + ' cm. μ₀ = 4π × 10⁻⁷ T m/A.';
  const body = $('obsBody'); body.innerHTML = '';
  if (!state.rows.length) body.innerHTML = '<tr class="empty"><td colspan="9">No readings yet</td></tr>';
  state.rows.forEach((x) => { const tr = document.createElement('tr'), m = meanTh(x); [String(x.n), fmt(x.I, 2), fmt(x.t1, 1), fmt(x.t2, 1), fmt(x.t3, 1), fmt(x.t4, 1), fmt(m, 2), fmt(Math.tan(m * RAD), 3), fmt(Kof(x), 4)].forEach((v) => { const td = document.createElement('td'); td.textContent = v; tr.appendChild(td); }); body.appendChild(tr); });
  const g = byN(), lines = [], bhs = [];
  Object.keys(g).forEach((n) => { const K = g[n].map(Kof).reduce((a, b) => a + b) / g[n].length, bh = P.BHfrom(+n, K, rStudent()); bhs.push(bh); lines.push('n = ' + n + ': mean K = ' + fmt(K, 4) + ' A, so B_H = μ₀nK/2r = ' + fmt(bh * 1e5, 2) + ' × 10⁻⁵ T.'); });
  $('resultLine').textContent = lines.join(' ');
  const list = $('checks'), items = readingChecks(); list.innerHTML = '';
  items.forEach((c) => { const li = document.createElement('li'); li.className = c.k; li.textContent = c.t; list.appendChild(li); }); $('checksH').hidden = !items.length;
  const rv = $('revealBox');
  if (state.revealed) {
    rv.hidden = false;
    if (!bhs.length) rv.textContent = 'Not yet: record at least one complete set (direct and reversed) first, then check your answer.';
    else { const bh = bhs.reduce((a, b) => a + b) / bhs.length, e = Math.abs(bh - state.s.BH) / state.s.BH * 100; rv.textContent = 'Actual B_H here: ' + fmt(state.s.BH * 1e5, 2) + ' × 10⁻⁵ T. Your B_H = ' + fmt(bh * 1e5, 2) + ' × 10⁻⁵ T, an error of ' + fmt(e, 1) + '%.' + (state.rows.length < 3 ? ' Take at least 3 sets for a reliable value.' : e > 3 ? ' To improve it, check the setting in the meridian and keep θ near 45°.' : ' Well done: that is within normal laboratory accuracy.'); }
  } else rv.hidden = true;
  const st = $('status'), m = state.msg || defaultStatus(r); st.textContent = m.text; st.className = 'status' + (m.kind ? ' ' + m.kind : '');
  drawDial();
  if (scene) scene.setState({ alpha: state.alpha, phi: P.needleAzimuth(state.s, state.n, curI(), state.alpha, state.dir), rCm: rStudent() * 100, on: curI() > 0 });
}
function defaultStatus(r) {
  if (!state.aligned) return { kind: '', text: 'Step 1: the instrument was put down at a random angle (the pointer reads ' + fmt(Math.abs(r.raw), 1) + '°, not 0–0). With no current, turn the instrument until the pointer reads 0–0. The coil is then in the magnetic meridian.' };
  if (!state.key) return { kind: '', text: 'Close the key and set a current with the rheostat.' };
  const th = (r.t1 + r.t2) / 2;
  if (th < 30) return { kind: '', text: 'θ ≈ ' + fmt(th, 1) + '°: increase the current' + (state.n < 50 ? ' or use more turns' : '') + ' to bring θ between 30° and 60°.' };
  if (th > 60) return { kind: '', text: 'θ ≈ ' + fmt(th, 1) + '°: a little large. Values between 30° and 60° give the best accuracy.' };
  return { kind: 'good', text: state.pending ? 'Now reverse the current with the commutator and record again.' : 'θ ≈ ' + fmt(th, 1) + '°: a good deflection. Record both pointer ends.' };
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
