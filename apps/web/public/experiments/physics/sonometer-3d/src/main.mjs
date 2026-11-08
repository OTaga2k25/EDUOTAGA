import * as P from './physics.mjs';
import { createScene } from './scene.mjs';

const $ = (id) => document.getElementById(id);
const fmt = (v, d) => Number(v).toFixed(d);
const round1 = (v) => Math.round(v * 10) / 10;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const state = {
  sess: P.newSession((Math.random() * 1e9) | 0),
  n: 4,
  fork: 256,            // number, or 'X'
  sounding: false,
  L: 60,
  riderOn: true,
  known: {},            // { f: L }
  Lx: null,
  msg: null,
  revealed: false,
};

/* ---------- derived ---------- */
const forkFreq = () => (state.fork === 'X' ? state.sess.fx : state.fork);
const forkLabel = () => (state.fork === 'X' ? 'Fork X' : state.fork + ' Hz');
const Lres = () => P.resonanceL(state.sess, forkFreq(), state.n);
function amp() {
  if (!state.sounding) return 0;
  const lr = Lres();
  if (!P.inRange(lr)) return 0;
  return P.amplitude(state.L, lr);
}
function knownRows() {
  return Object.keys(state.known).map((k) => ({ f: +k, L: state.known[k] })).sort((a, b) => a.f - b.f);
}
const meanFL = () => P.meanProduct(knownRows());
const fxEstimate = () => (state.Lx != null && knownRows().length ? P.fxFrom(knownRows(), state.Lx) : null);

/* ---------- scene (optional) ---------- */
let scene = null;
try {
  scene = createScene($('view'), { onDrag: (L) => setL(L) });
} catch (e) { scene = null; }
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
  const lr = Lres();
  if (!P.inRange(lr)) { state.riderOn = true; return; }
  if (state.riderOn) {      // did we pass through the jump window since the last position?
    const a = Math.min(prevL, state.L), b = Math.max(prevL, state.L);
    for (let x = a; x <= b + 1e-9; x = round1(x + 0.1)) { if (P.riderJumps(x, lr)) { state.riderOn = false; break; } }
  } else if (P.amplitude(state.L, lr) < 0.45) state.riderOn = true;   // rider is put back once we move away
}

function setL(v) {
  const prev = state.L;
  state.L = round1(clamp(v, 0, 100));
  state.msg = null; state.revealed = false;
  updateRider(prev);
  render();
}

function setSounding(on) {
  state.sounding = on; state.riderOn = true; state.msg = null;
  if (on) updateRider(state.L);
  render(); updateSound();
}

function record() {
  if (!state.sounding) { say('err', 'Strike the tuning fork and press it on the box first.'); return render(); }
  const lr = Lres();
  if (!P.inRange(lr)) { say('warn', 'This fork has no resonance on the wire at this tension. Change the number of weights.'); return render(); }
  if (P.amplitude(state.L, lr) < P.JUMP_AMP) { say('err', 'The rider has not jumped off at this length. Move the bridge slowly until it is thrown off, then record.'); return render(); }
  if (state.fork === 'X') {
    state.Lx = state.L;
    say('good', 'Recorded L for the unknown fork X = ' + fmt(state.L, 1) + ' cm. ' + (knownRows().length ? 'Its frequency is now in the result line.' : 'Now record at least one known fork to find its frequency.'));
  } else {
    state.known[state.fork] = state.L;
    say('good', 'Recorded L = ' + fmt(state.L, 1) + ' cm for the ' + state.fork + ' Hz fork.');
  }
  state.revealed = false;
  render();
}

function clearReadings(kind, text) { state.known = {}; state.Lx = null; state.revealed = false; if (kind) say(kind, text); }

/* ---------- wiring ---------- */
$('wts').addEventListener('input', (e) => {
  const had = Object.keys(state.known).length || state.Lx != null;
  state.n = parseInt(e.target.value, 10);
  state.riderOn = true; state.sounding = false;
  clearReadings(had ? 'warn' : null, 'Tension changed, so the earlier readings were cleared. Strike the fork again.');
  if (!had) state.msg = null;
  render(); updateSound();
});
$('bridge').addEventListener('input', (e) => setL(parseFloat(e.target.value)));
Array.prototype.forEach.call(document.querySelectorAll('.nudge [data-d]'), (b) => {
  b.addEventListener('click', () => setL(state.L + parseFloat(b.getAttribute('data-d'))));
});
$('strikeBtn').addEventListener('click', () => setSounding(!state.sounding));
$('soundChk').addEventListener('change', updateSound);
$('recordBtn').addEventListener('click', record);
$('delLast').addEventListener('click', () => {
  if (state.fork === 'X' && state.Lx != null) state.Lx = null;
  else { const rows = knownRows(); if (rows.length) delete state.known[rows[rows.length - 1].f]; else state.Lx = null; }
  state.revealed = false; state.msg = null; render();
});
$('resetAll').addEventListener('click', () => { clearReadings(); state.msg = null; render(); });
$('newFork').addEventListener('click', () => {
  state.sess = P.newSession((Math.random() * 1e9) | 0); state.Lx = null; state.revealed = false;
  if (state.fork === 'X') state.sounding = false;
  state.riderOn = true; say('warn', 'A new unknown fork X is ready. Select Fork X to find its resonant length.');
  render(); updateSound();
});
$('reveal').addEventListener('click', () => { state.revealed = true; render(); });
Array.prototype.forEach.call(document.querySelectorAll('.views [data-view]'), (b) => {
  b.addEventListener('click', () => scene && scene.setView(b.getAttribute('data-view')));
});

(function buildChips() {
  const box = $('forkChips');
  P.KNOWN_FORKS.concat(['X']).forEach((f) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip' + (f === 'X' ? ' x' : ''); b.textContent = f === 'X' ? 'Fork X' : f + ' Hz';
    b.setAttribute('data-f', f); b.setAttribute('aria-pressed', f === state.fork ? 'true' : 'false');
    b.addEventListener('click', () => {
      state.fork = f; state.sounding = false; state.riderOn = true; state.msg = null; render(); updateSound();
    });
    box.appendChild(b);
  });
})();

/* ---------- rendering ---------- */
function defaultStatus() {
  const a = amp();
  if (!state.sounding) return { kind: '', text: 'Step 1: pick a tuning fork, press “Strike fork”, then slide bridge B₂ slowly until the paper rider is thrown off the wire. Record L, repeat for the other forks, then find the unknown fork X.' };
  if (!P.inRange(Lres())) return { kind: 'warn', text: 'No resonance for this fork on the wire at this tension (the length would be outside the wire). Change the number of slotted weights.' };
  if (!state.riderOn && a >= P.JUMP_AMP) return { kind: 'good', text: 'The rider has been thrown off: resonance. L = ' + fmt(state.L, 1) + ' cm. Press Record L.' };
  if (a > 0.45) return { kind: 'warn', text: 'The rider is jumping about. You are very close, so use the 0.1 cm buttons.' };
  if (a > 0.12) return { kind: 'warn', text: 'The rider is trembling. Resonance is close; keep moving slowly.' };
  return { kind: '', text: 'The fork is sounding. Slide B₂ slowly along the wire and watch the rider.' };
}

function renderControls() {
  $('wtsVal').textContent = state.n;
  const M = P.massKg(state.n), T = P.tension(state.n);
  $('wtsInfo').textContent = 'Hanger + ' + state.n + ' × 0.5 kg = ' + fmt(M, 1) + ' kg, so T = ' + fmt(T, 1) + ' N';
  $('tNote').textContent = 'M = ' + fmt(M, 1) + ' kg, T = ' + fmt(T, 1) + ' N';
  $('bridge').value = state.L; $('xVal').textContent = fmt(state.L, 1); $('lTag').textContent = 'L = ' + fmt(state.L, 1) + ' cm';
  Array.prototype.forEach.call($('forkChips').children, (b) => b.setAttribute('aria-pressed', String(b.getAttribute('data-f') === String(state.fork))));
  const sb = $('strikeBtn'); sb.setAttribute('aria-pressed', String(state.sounding));
  sb.textContent = state.sounding ? 'Fork is sounding — click to remove it' : 'Strike ' + forkLabel() + ' and press it on the box';
  const a = amp();
  $('ampFill').style.width = Math.round(a * 100) + '%'; $('ampVal').textContent = Math.round(a * 100) + ' %';
  $('ampHint').textContent = !state.sounding ? 'strike the fork first' : (a >= P.JUMP_AMP ? 'rider thrown off' : a > 0.45 ? 'very close' : a > 0.12 ? 'trembling' : 'no response yet');
  const rb = $('recordBtn'); rb.textContent = 'Record L for ' + forkLabel();
  const st = $('status'); const m = state.msg || defaultStatus(); st.textContent = m.text; st.className = 'status' + (m.kind ? ' ' + m.kind : '');
}

function renderTable() {
  const body = $('obsBody'); body.innerHTML = '';
  const rows = knownRows();
  if (!rows.length && state.Lx == null) {
    const tr = document.createElement('tr'); tr.className = 'empty';
    tr.innerHTML = '<td colspan="4">No readings yet. Record L for each known fork.</td>'; body.appendChild(tr);
  }
  rows.forEach((r) => {
    const tr = document.createElement('tr');
    [String(r.f), fmt(r.L, 1), fmt(r.f * r.L, 0), fmt(100 / r.L, 2)].forEach((v) => { const td = document.createElement('td'); td.textContent = v; tr.appendChild(td); });
    body.appendChild(tr);
  });
  if (state.Lx != null) {
    const fx = fxEstimate();
    const tr = document.createElement('tr'); tr.className = 'unk';
    [fx == null ? 'X (?)' : 'X = ' + fmt(fx, 1), fmt(state.Lx, 1), fx == null ? '—' : fmt(fx * state.Lx, 0), fmt(100 / state.Lx, 2)].forEach((v) => { const td = document.createElement('td'); td.textContent = v; tr.appendChild(td); });
    body.appendChild(tr);
  }
  const m = meanFL();
  $('meanFL').textContent = m == null ? '—' : fmt(m, 1) + ' Hz·cm';
  const rl = $('resultLine');
  if (m == null) rl.textContent = '';
  else {
    const v = (2 * m) / 100;
    let t = 'Mean f × L = ' + fmt(m, 1) + ' Hz·cm (' + rows.length + ' fork' + (rows.length > 1 ? 's' : '') + '), so v = 2 f L = ' + fmt(v, 1) + ' m/s';
    const mu = P.tension(state.n) / (v * v);
    t += ', and μ = T / v² = ' + (mu * 1e4).toFixed(2) + ' × 10⁻⁴ kg/m.';
    const fx = fxEstimate();
    if (fx != null) t += ' Unknown fork: f = (f × L) / L_x = ' + fmt(fx, 1) + ' Hz.';
    rl.textContent = t;
  }
  const rv = $('revealBox');
  if (state.revealed) {
    rv.hidden = false;
    const trueV = P.waveSpeed(state.n);
    if (m == null && state.Lx == null) rv.textContent = 'Record at least one reading first, then check.';
    else {
      let t = 'Actual wave speed at this tension: ' + fmt(trueV, 1) + ' m/s' + (m != null ? ' (yours ' + fmt((2 * m) / 100, 1) + ' m/s, error ' + fmt(Math.abs((2 * m) / 100 - trueV) / trueV * 100, 2) + '%).' : '.');
      const fx = fxEstimate();
      if (fx != null) t += ' The unknown fork X is actually ' + state.sess.fx + ' Hz (yours ' + fmt(fx, 1) + ' Hz, error of ' + fmt(Math.abs(fx - state.sess.fx) / state.sess.fx * 100, 2) + '%).';
      else t += ' Record the unknown fork X and at least one known fork to see its frequency checked.';
      rv.textContent = t;
    }
  } else rv.hidden = true;
}

function niceAxis(maxV, n) {
  const raw = maxV / n, mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), f = raw / mag;
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  const step = parseFloat((nf * mag).toPrecision(6));
  return { step, max: parseFloat((Math.ceil(maxV / step - 1e-9) * step).toPrecision(6)) };
}
const decimalsOf = (s) => { const t = String(s), i = t.indexOf('.'); return i < 0 ? 0 : Math.min(4, t.length - i - 1); };

function renderGraph() {
  const canvas = $('graph'); const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth || 640, cssH = Math.round(cssW * 0.6);
  canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
  const ctx = canvas.getContext('2d'); if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, cssW, cssH);
  const rows = knownRows(); const pts = rows.map((r) => ({ x: 100 / r.L, y: r.f }));
  const fx = fxEstimate();
  const extra = fx != null ? { x: 100 / state.Lx, y: fx } : null;
  const all = pts.concat(extra ? [extra] : []);
  let maxX = all.length ? Math.max(...all.map((p) => p.x)) * 1.12 : 6;
  let maxY = all.length ? Math.max(...all.map((p) => p.y)) * 1.12 : 600;
  const ax = niceAxis(maxX, 5), ay = niceAxis(maxY, 5); maxX = ax.max; maxY = ay.max;
  const pad = { l: 58, r: 16, t: 14, b: 44 }, w = cssW - pad.l - pad.r, h = cssH - pad.t - pad.b;
  const sx = (v) => pad.l + (v / maxX) * w, sy = (v) => pad.t + h - (v / maxY) * h;
  ctx.font = '12px "Space Mono", monospace'; ctx.strokeStyle = '#d8d0bb'; ctx.fillStyle = '#4b5b63'; ctx.lineWidth = 1;
  const nx = Math.round(maxX / ax.step), ny = Math.round(maxY / ay.step), dx = decimalsOf(ax.step), dy = decimalsOf(ay.step);
  for (let i = 0; i <= nx; i++) { const v = i * ax.step; ctx.beginPath(); ctx.moveTo(sx(v), pad.t); ctx.lineTo(sx(v), pad.t + h); ctx.stroke(); ctx.textAlign = 'center'; ctx.fillText(v.toFixed(dx), sx(v), pad.t + h + 16); }
  for (let i = 0; i <= ny; i++) { const v = i * ay.step; ctx.beginPath(); ctx.moveTo(pad.l, sy(v)); ctx.lineTo(pad.l + w, sy(v)); ctx.stroke(); ctx.textAlign = 'right'; ctx.fillText(v.toFixed(dy), pad.l - 6, sy(v) + 4); }
  ctx.strokeStyle = '#0c1c27'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, pad.t + h); ctx.lineTo(pad.l + w, pad.t + h); ctx.stroke();
  ctx.fillStyle = '#0c1c27'; ctx.textAlign = 'center'; ctx.fillText('1/L  (m⁻¹)', pad.l + w / 2, cssH - 6);
  ctx.save(); ctx.translate(13, pad.t + h / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('f  (Hz)', 0, 0); ctx.restore();
  const sl = $('slopeLine');
  if (pts.length >= 2) {
    const m = P.slopeFvsInvL(rows); const xEnd = Math.min(maxX, maxY / m);
    ctx.strokeStyle = '#e8511d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx(0), sy(0)); ctx.lineTo(sx(xEnd), sy(m * xEnd)); ctx.stroke();
    sl.textContent = 'Best-fit slope = f × L = ' + fmt(m, 1) + ' Hz·m, so v = 2 × slope = ' + fmt(2 * m, 1) + ' m/s';
  } else sl.textContent = 'Record at least 2 known forks to see the best-fit line.';
  ctx.fillStyle = '#12a0a0';
  pts.forEach((p) => { ctx.beginPath(); ctx.arc(sx(p.x), sy(p.y), 5, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); });
  if (extra) { // unknown fork read off the line
    ctx.strokeStyle = '#5763e6'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(sx(extra.x), sy(0)); ctx.lineTo(sx(extra.x), sy(extra.y)); ctx.lineTo(sx(0), sy(extra.y)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#5763e6'; ctx.beginPath(); ctx.arc(sx(extra.x), sy(extra.y), 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5763e6'; ctx.textAlign = 'left'; ctx.fillText('X', sx(extra.x) + 9, sy(extra.y) - 7);
  }
}

function render() {
  renderControls(); renderTable(); renderGraph();
  if (scene) scene.setState({ L: state.L, n: state.n, fork: forkLabel(), sounding: state.sounding, amp: amp(), riderOn: state.riderOn });
}
window.addEventListener('resize', renderGraph);
render();
