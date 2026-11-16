import * as P from './physics.mjs';
import { createScene } from './scene.mjs';

const $ = (id) => document.getElementById(id);
const fmt = (v, d) => Number(v).toFixed(d);
const round1 = (v) => Math.round(v * 10) / 10;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const FORKS = [256, 320, 384];

const state = { sess: P.newSession((Math.random() * 1e9) | 0), n: 2, fork: 256, sounding: false, L: 40, riderOn: true, rows: {}, msg: null, revealed: false, calc: null };
const forkFreq = () => state.fork;
const forkLabel = () => state.fork + ' Hz';
const Lres = () => P.resonanceL(state.sess, forkFreq(), state.n);
function amp() { if (!state.sounding) return 0; const lr = Lres(); if (!P.inRange(lr)) return 0; return P.amplitude(state.L, lr); }
function rowsArr() { return Object.keys(state.rows).map((k) => ({ n: +k, T: P.tension(+k), M: P.massKg(+k), L: state.rows[k] })).sort((a, b) => a.n - b.n); }
const muOf = (r) => r.T / (4 * state.fork * state.fork * Math.pow(r.L / 100, 2));
const meanMu = () => { const r = rowsArr(); return r.length ? r.reduce((s, x) => s + muOf(x), 0) / r.length : null; };

let scene = null;
try { scene = createScene($('view'), { onDrag: (L) => setL(L) }); } catch (e) { scene = null; }
if (!scene) $('stage').classList.add('nogl-on');
/* ---------- sound ---------- */
let audio = null;
function updateSound() {
  const want = $('soundChk').checked && state.sounding;
  try {
    if (want) {
      if (!audio) {
        const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
        const ctx = new AC(), osc = ctx.createOscillator(), g = ctx.createGain();
        osc.type = 'sine'; g.gain.value = 0.0; osc.connect(g); g.connect(ctx.destination); osc.start();
        audio = { ctx, osc, g };
      }
      audio.osc.frequency.value = forkFreq(); audio.g.gain.setTargetAtTime(0.05, audio.ctx.currentTime, 0.05);
      if (audio.ctx.state === 'suspended') audio.ctx.resume();
    } else if (audio) audio.g.gain.setTargetAtTime(0, audio.ctx.currentTime, 0.05);
  } catch (e) {}
}

/* ---------- actions ---------- */
function say(kind, text) { state.msg = { kind, text }; }
function updateRider(prevL) {
  if (!state.sounding) { state.riderOn = true; return; }
  const lr = Lres(); if (!P.inRange(lr)) { state.riderOn = true; return; }
  if (state.riderOn) { const a = Math.min(prevL, state.L), b = Math.max(prevL, state.L); for (let x = a; x <= b + 1e-9; x = round1(x + 0.1)) { if (P.riderJumps(x, lr)) { state.riderOn = false; break; } }  if (!state.riderOn && P.amplitude(state.L, lr) < 0.45) { state.riderOn = true; state.passed = true; } }
  else if (P.amplitude(state.L, lr) < 0.45) state.riderOn = true;
}
function setL(v) { const prev = state.L; state.L = round1(clamp(v, 0, 100)); state.msg = null; state.revealed = false; state.passed = false; updateRider(prev); if (state.passed) state.msg = { kind: 'warn', text: 'The rider jumped as the bridge went past resonance, and you put it back. The resonant length is somewhere you just passed: go back slowly with the 0.1 cm buttons.' }; render(); }
function setSounding(on) { state.sounding = on; state.riderOn = true; state.msg = null; if (on) updateRider(state.L); render(); updateSound(); }
function record() {
  if (!state.sounding) { say('err', 'Strike the tuning fork and press it on the box first.'); return render(); }
  const lr = Lres(); if (!P.inRange(lr)) { say('warn', 'No resonance on the wire at this tension. Change the weights.'); return render(); }
  if (P.amplitude(state.L, lr) < P.JUMP_AMP) { say('err', 'The rider has not been thrown off at this length, so it is not the resonant length. Move the bridge slowly and record when the rider jumps off.'); return render(); }
  const again = state.rows[state.n] != null; state.rows[state.n] = state.L; state.revealed = false; state.calc = null;
  say('good', (again ? 'Replaced: ' : 'Recorded: ') + 'T = ' + fmt(P.tension(state.n), 1) + ' N, L = ' + fmt(state.L, 1) + ' cm. ' + (rowsArr().length < 5 ? 'Change the weights and find the new resonant length (aim for 5 or more tensions).' : 'Now check that L² ∝ T and find μ.'));
  render();
}
$('wts').addEventListener('input', (e) => { state.n = parseInt(e.target.value, 10); state.sounding = false; state.riderOn = true; say('', 'Tension is now ' + fmt(P.tension(state.n), 1) + ' N. Strike the fork again and find the new resonant length.'); render(); updateSound(); });
$('bridge').addEventListener('input', (e) => setL(parseFloat(e.target.value)));
Array.prototype.forEach.call(document.querySelectorAll('.nudge [data-d]'), (b) => b.addEventListener('click', () => setL(state.L + parseFloat(b.getAttribute('data-d')))));
$('strikeBtn').addEventListener('click', () => setSounding(!state.sounding));
$('soundChk').addEventListener('change', updateSound);
$('recordBtn').addEventListener('click', record);
$('delLast').addEventListener('click', () => { const r = rowsArr(); if (r.length) delete state.rows[state.n in state.rows ? state.n : r[r.length - 1].n]; state.revealed = false; state.msg = null; render(); });
$('resetAll').addEventListener('click', () => { state.rows = {}; state.revealed = false; state.msg = null; render(); });
$('reveal').addEventListener('click', () => { state.revealed = true; render(); });
$('checkCalc').addEventListener('click', () => {
  const r = rowsArr(), fb = $('calcFb'); if (!r.length) { fb.textContent = 'Record a reading first.'; return; }
  const x = r[r.length - 1], v = parseFloat($('muIn').value) * 1e-4, t = muOf(x);
  if (isFinite(v) && Math.abs(v - t) / t <= 0.01) { state.calc = true; fb.textContent = 'Correct: μ = T / (4f²L²) = ' + fmt(x.T, 2) + ' / (4 × ' + state.fork + '² × ' + fmt(x.L / 100, 3) + '²) = ' + (t * 1e4).toFixed(2) + ' × 10⁻⁴ kg/m.'; }
  else if (isFinite(v) && Math.abs(v - t * 1e4) / (t * 1e4) <= 0.01) fb.textContent = 'Convert L to metres first (' + fmt(x.L, 1) + ' cm = ' + fmt(x.L / 100, 3) + ' m).';
  else if (isFinite(v) && Math.abs(v - t * 4) / (t * 4) <= 0.01) fb.textContent = 'Remember the 4 in the denominator: f = (1/2L)√(T/μ) gives μ = T / (4f²L²).';
  else fb.textContent = 'From f = (1/2L)√(T/μ): μ = T / (4 f² L²), with T = ' + fmt(x.T, 2) + ' N, f = ' + state.fork + ' Hz and L = ' + fmt(x.L / 100, 3) + ' m (your last row).';
  render();
});
Array.prototype.forEach.call(document.querySelectorAll('.views [data-view]'), (b) => b.addEventListener('click', () => scene && scene.setView(b.getAttribute('data-view'))));
(function buildChips() {
  const box = $('forkChips');
  FORKS.forEach((f) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = f + ' Hz'; b.setAttribute('data-f', f);
    b.addEventListener('click', () => { if (f === state.fork) return; const had = rowsArr().length; state.fork = f; state.rows = {}; state.sounding = false; state.riderOn = true; state.revealed = false; state.calc = null; say(had ? 'warn' : '', had ? 'Fork changed, so the readings were cleared: the whole set must use one fork.' : 'Using the ' + f + ' Hz fork.'); render(); updateSound(); });
    box.appendChild(b); });
})();

/* ---------- rendering ---------- */
function defaultStatus() {
  const a = amp();
  if (!state.sounding) return { kind: '', text: 'Keep one fork for the whole set. Choose the weights, strike the fork and slide bridge B₂ until the paper rider is thrown off. Record L, then change the weights and repeat.' };
  if (!P.inRange(Lres())) return { kind: 'warn', text: 'No resonance on the wire at this tension. Change the number of weights.' };
  if (!state.riderOn && a >= P.JUMP_AMP) return { kind: 'good', text: 'The rider has been thrown off: resonance. L = ' + fmt(state.L, 1) + ' cm. Press Record.' };
  if (a > 0.45) return { kind: 'warn', text: 'The rider is jumping about: very close. Use the 0.1 cm buttons.' };
  if (a > 0.12) return { kind: 'warn', text: 'The rider is trembling. Keep moving slowly.' };
  return { kind: '', text: 'The fork is sounding. Slide B₂ slowly along the wire and watch the rider.' };
}
function renderControls() {
  $('wtsVal').textContent = state.n; const M = P.massKg(state.n), T = P.tension(state.n);
  $('wtsInfo').textContent = 'Hanger + ' + state.n + ' × 0.5 kg = ' + fmt(M, 1) + ' kg, so T = Mg = ' + fmt(T, 1) + ' N';
  $('bridge').value = state.L; $('xVal').textContent = fmt(state.L, 1); $('lTag').textContent = 'L = ' + fmt(state.L, 1) + ' cm · T = ' + fmt(T, 1) + ' N';
  Array.prototype.forEach.call($('forkChips').children, (b) => b.setAttribute('aria-pressed', String(+b.getAttribute('data-f') === state.fork)));
  const sb = $('strikeBtn'); sb.setAttribute('aria-pressed', String(state.sounding)); sb.textContent = state.sounding ? 'Fork is sounding — click to remove it' : 'Strike the ' + forkLabel() + ' fork and press it on the box';
  const a = amp(); $('ampFill').style.width = Math.round(a * 100) + '%'; $('ampVal').textContent = Math.round(a * 100) + ' %';
  $('ampHint').textContent = !state.sounding ? 'strike the fork first' : (a >= P.JUMP_AMP ? 'rider thrown off' : a > 0.45 ? 'very close' : a > 0.12 ? 'trembling' : 'no response yet');
  $('recordBtn').textContent = 'Record L for T = ' + fmt(T, 1) + ' N';
  const st = $('status'); const m = state.msg || defaultStatus(); st.textContent = m.text; st.className = 'status' + (m.kind ? ' ' + m.kind : '');
}
function readingChecks() {
  const r = rowsArr(), out = []; if (!r.length) return out;
  out.push(r.length >= 5 ? { k: 'ok', t: r.length + ' tensions recorded with the ' + state.fork + ' Hz fork.' } : { k: 'warn', t: 'Only ' + r.length + ' tension' + (r.length > 1 ? 's' : '') + '. Record at least 5 different tensions, spread over the range of weights.' });
  const short = r.filter((x) => x.L < 20); if (short.length) out.push({ k: 'warn', t: 'Some resonant lengths are below 20 cm, where a small error matters more. Use more weight or a lower-frequency fork.' });
  if (r.length >= 3) { const q = r.map((x) => x.T / (x.L * x.L)), m = q.reduce((a, b) => a + b) / q.length, sp = (Math.max(...q) - Math.min(...q)) / m * 100;
    let worst = 0; q.forEach((v, i) => { if (Math.abs(v - m) > Math.abs(q[worst] - m)) worst = i; });
    out.push(sp > 4 ? { k: 'warn', t: 'T/L² varies by ' + fmt(sp, 1) + '%. The reading at T = ' + fmt(r[worst].T, 1) + ' N stands out: set those weights again and find where the rider jumps.' } : { k: 'ok', t: 'T/L² is constant within ' + fmt(sp, 1) + '%, so L ∝ √T at a fixed frequency (second law of vibrating strings).' }); }
  out.push({ k: 'tip', t: 'Doubling the tension does not double L: L grows only as √T. To double L you need four times the tension.' });
  return out;
}
function renderTable() {
  const body = $('obsBody'); body.innerHTML = ''; const r = rowsArr();
  if (!r.length) body.innerHTML = '<tr class="empty"><td colspan="6">No readings yet</td></tr>';
  r.forEach((x) => { const tr = document.createElement('tr'); [fmt(x.M, 1), fmt(x.T, 1), fmt(x.L, 1), fmt(Math.sqrt(x.T) / x.L * 100, 2), fmt(x.T / Math.pow(x.L / 100, 2), 1), (muOf(x) * 1e4).toFixed(2)].forEach((v) => { const td = document.createElement('td'); td.textContent = v; tr.appendChild(td); }); body.appendChild(tr); });
  const m = meanMu(); $('resultLine').textContent = m == null ? '' : 'Mean μ = ' + (m * 1e4).toFixed(2) + ' × 10⁻⁴ kg/m from ' + r.length + ' reading' + (r.length > 1 ? 's' : '') + ' with the ' + state.fork + ' Hz fork.';
  const list = $('checks'), items = readingChecks(); list.innerHTML = ''; items.forEach((c) => { const li = document.createElement('li'); li.className = c.k; li.textContent = c.t; list.appendChild(li); }); $('checksH').hidden = !items.length;
  const rv = $('revealBox');
  if (state.revealed) { rv.hidden = false; if (m == null) rv.textContent = 'Not yet: record some resonant lengths first.'; else { const e = Math.abs(m - P.MU) / P.MU * 100; rv.textContent = 'Actual linear density of the wire: ' + (P.MU * 1e4).toFixed(2) + ' × 10⁻⁴ kg/m. Yours: ' + (m * 1e4).toFixed(2) + ' × 10⁻⁴ kg/m, an error of ' + fmt(e, 1) + '%.' + (r.length < 5 ? ' Record at least 5 tensions for a reliable value.' : e > 3 ? ' Follow the checks above to improve it.' : ' Well done: that is within normal laboratory accuracy.'); } }
  else rv.hidden = true;
}
function renderGraph() {
  const canvas = $('graph'); const dpr = window.devicePixelRatio || 1; const cssW = canvas.clientWidth || 640, cssH = Math.round(cssW * 0.6);
  canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr); const ctx = canvas.getContext && canvas.getContext('2d'); if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, cssW, cssH);
  const r = rowsArr(), pts = r.map((x) => ({ x: x.T, y: x.L * x.L }));
  const maxX = Math.ceil((pts.length ? Math.max(...pts.map((p) => p.x)) : 60) * 1.1 / 10) * 10, maxY = Math.ceil((pts.length ? Math.max(...pts.map((p) => p.y)) : 6000) * 1.1 / 1000) * 1000;
  const pad = { l: 64, r: 16, t: 14, b: 44 }, w = cssW - pad.l - pad.r, h = cssH - pad.t - pad.b, sx = (v) => pad.l + v / maxX * w, sy = (v) => pad.t + h - v / maxY * h;
  ctx.font = '12px "Space Mono", monospace'; ctx.strokeStyle = '#d8d0bb'; ctx.fillStyle = '#4b5b63';
  for (let i = 0; i <= 5; i++) { const vx = maxX * i / 5, vy = maxY * i / 5; ctx.beginPath(); ctx.moveTo(sx(vx), pad.t); ctx.lineTo(sx(vx), pad.t + h); ctx.stroke(); ctx.textAlign = 'center'; ctx.fillText(vx.toFixed(0), sx(vx), pad.t + h + 16); ctx.beginPath(); ctx.moveTo(pad.l, sy(vy)); ctx.lineTo(pad.l + w, sy(vy)); ctx.stroke(); ctx.textAlign = 'right'; ctx.fillText(vy.toFixed(0), pad.l - 6, sy(vy) + 4); }
  ctx.strokeStyle = '#0c1c27'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, pad.t + h); ctx.lineTo(pad.l + w, pad.t + h); ctx.stroke();
  ctx.fillStyle = '#0c1c27'; ctx.textAlign = 'center'; ctx.fillText('T  (N)', pad.l + w / 2, cssH - 6); ctx.save(); ctx.translate(13, pad.t + h / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('L²  (cm²)', 0, 0); ctx.restore();
  const sl = $('slopeLine');
  if (pts.length >= 2) { let sxy = 0, sxx = 0; pts.forEach((p) => { sxy += p.x * p.y; sxx += p.x * p.x; }); const m = sxy / sxx; ctx.strokeStyle = '#e8511d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx(0), sy(0)); const xe = Math.min(maxX, maxY / m); ctx.lineTo(sx(xe), sy(m * xe)); ctx.stroke();
    const mu = 1 / (4 * state.fork * state.fork * m * 1e-4); sl.textContent = 'Best-fit slope = L²/T = ' + fmt(m, 1) + ' cm²/N, so μ = 1 / (4f² × slope) = ' + (mu * 1e4).toFixed(2) + ' × 10⁻⁴ kg/m'; }
  else sl.textContent = 'Record at least 2 tensions to see the best-fit line.';
  ctx.fillStyle = '#12a0a0'; pts.forEach((p) => { ctx.beginPath(); ctx.arc(sx(p.x), sy(p.y), 5, 0, Math.PI * 2); ctx.fill(); });
}
function render() { renderControls(); renderTable(); renderGraph(); if (scene) scene.setState({ L: state.L, n: state.n, fork: forkLabel(), sounding: state.sounding, amp: amp(), riderOn: state.riderOn }); }
window.addEventListener('resize', renderGraph);
render();
if (typeof window !== 'undefined') window.__son = state;

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
