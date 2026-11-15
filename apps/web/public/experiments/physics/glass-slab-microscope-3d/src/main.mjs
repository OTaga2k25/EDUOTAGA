import * as P from './physics.mjs';
import { createScene } from './scene.mjs';

const $ = (id) => document.getElementById(id);
const fmt = (v, d) => Number(v).toFixed(d);
const r3 = (v) => Math.round(v * 1000) / 1000;
const SUB = ['₁', '₂', '₃'];
const STAGE = { none: 0, slab: 1, powder: 2 };

const state = { g: P.newGlass((Math.random() * 1e9) | 0), k: 0, scene: 'none', R: 6, rows: [{}, {}, {}], msg: null, revealed: false, fails: 0, lastPos: null, mag: 10 };

let scene = null;
try { scene = createScene($('view'), { onDrag: (v) => setR(v) }); } catch (e) { scene = null; }
if (!scene) $('stage').classList.add('nogl-on');

function say(kind, text) { state.msg = { kind, text }; }
const row = () => state.rows[state.k];
const stage = () => STAGE[state.scene];
const key = () => 'R' + (stage() + 1);

function setR(v) { state.R = r3(Math.max(P.R_MIN, Math.min(P.R_MAX, v))); state.msg = null; render(); }

function record() {
  const s = stage(), name = 'R' + SUB[s];
  if (!P.isSharp(state.g, state.k, state.scene, state.R)) {
    const tgt = P.view(state.g, state.k, state.scene, state.R).find((p) => p.what === P.target(state.scene));
    const what = state.scene === 'powder' ? 'the powder on top of the slab' : state.scene === 'slab' ? 'the image of the mark (seen through the slab)' : 'the mark';
    say('err', 'The microscope is not focused sharply on ' + what + ', so this would not be ' + name + '. ' +
      (Math.abs(state.R - tgt.at) > 0.05 ? 'Use the coarse buttons to get it roughly in focus, then the fine buttons.' : 'Move it ' + (state.R < tgt.at ? 'up' : 'down') + ' with the fine buttons until the edges look sharpest.'));
    return render();
  }
  const msr = parseFloat($('msr').value), vsc = parseFloat($('vsc').value);
  if (!isFinite(msr) || !isFinite(vsc)) { say('err', 'Read the vernier scale first: type the main scale reading (cm) and the vernier coincidence (division), then record.'); return render(); }
  if (vsc < 0 || vsc > 49 || Math.round(vsc) !== vsc) { say('err', 'The vernier coincidence is a whole number from 0 to 49: the number of the vernier line that lines up exactly with a main scale line.'); return render(); }
  if (Math.abs(msr / P.MSD - Math.round(msr / P.MSD)) > 1e-6) { say('err', 'The main scale reading must be a main scale mark, a multiple of 0.05 cm (for example 3.20 or 3.25).'); return render(); }
  const c = P.checkReading(state.R, msr, vsc);
  const pos = r3(state.R); if (state.lastPos !== pos) { state.fails = 0; state.lastPos = pos; }
  if (!c.ok) {
    state.fails++;
    if (state.fails >= 2) {
      $('msr').value = fmt(c.v.msr, 2); $('vsc').value = String(c.v.vsc);
      say('err', 'Let us read it together. The vernier zero is just past the main scale mark ' + fmt(c.v.msr, 2) + ' cm, so MSR = ' + fmt(c.v.msr, 2) + ' cm. Vernier line ' + c.v.vsc + ' lines up exactly with a main scale line, so VSC = ' + c.v.vsc +
        '. Reading = ' + fmt(c.v.msr, 2) + ' + ' + c.v.vsc + ' × 0.001 = ' + fmt(c.v.total, 3) + ' cm. The values are filled in; press Record.');
    } else if (c.why === 'msr-high') say('err', 'Your main scale reading is one division too high. Take the last main scale mark at or before the vernier zero, not the next one after it. Try again.');
    else if (c.why === 'msr-low') say('err', 'Your main scale reading is one division too low. Take the main scale mark just before the vernier zero (each division is 0.05 cm). Try again.');
    else if (c.why === 'msr') say('err', 'Your main scale reading does not match. Look at where the vernier zero (the red line) falls on the main scale and take the mark just before it. Try again.');
    else say('err', 'Your main scale reading is right, but the vernier coincidence is not. Look along the vernier for the one line that meets a main scale line exactly in a straight line, and use its number. Try again.');
    return render();
  }
  state.fails = 0;
  row()[key()] = c.tot;
  state.revealed = false;
  const next = s === 0 ? 'Now place the slab on the mark.' : s === 1 ? 'Now sprinkle a little powder on the top of the slab.' : state.k < 2 ? 'This slab is complete. Press Next slab.' : 'All three slabs are done. Check the table and the graph.';
  say('good', 'Correct: ' + name + ' = ' + fmt(c.tot, 3) + ' cm for slab ' + (state.k + 1) + '. ' + next);
  $('msr').value = ''; $('vsc').value = '';
  render();
}

$('rSl').addEventListener('input', (e) => setR(parseFloat(e.target.value)));
Array.prototype.forEach.call(document.querySelectorAll('.nudge [data-d]'), (b) => b.addEventListener('click', () => setR(state.R + parseFloat(b.getAttribute('data-d')))));
$('recordBtn').addEventListener('click', record);
$('slabBtn').addEventListener('click', () => { if (row().R1 == null) { say('err', 'Record R₁ on the bare mark first. Once the slab is on, you can no longer see the mark directly.'); return render(); } state.scene = 'slab'; say('', 'The slab is on the mark. Look: the mark is now out of focus because its image is raised. Raise the microscope until it is sharp again, and record R₂.'); render(); });
$('powderBtn').addEventListener('click', () => { if (row().R2 == null) { say('err', 'Record R₂ (the image of the mark through the slab) before sprinkling the powder.'); return render(); } state.scene = 'powder'; say('', 'Powder is on the top surface. Raise the microscope until the powder particles are sharp, and record R₃.'); render(); });
$('nextBtn').addEventListener('click', () => {
  if (row().R3 == null) { say('err', 'Finish this slab first: record R₁, R₂ and R₃.'); return render(); }
  if (state.k >= 2) { say('warn', 'All three slabs are done. Press “New unknown glass” to start again with a different glass.'); return render(); }
  state.k++; state.scene = 'none'; say('', 'Slab ' + (state.k + 1) + ': the slab and powder are removed. Focus on the bare mark again and record R₁ (it may have changed slightly if the paper moved, so always re-read it).'); render();
});
$('undoBtn').addEventListener('click', () => {
  const r = row();
  if (r.R3 != null) { delete r.R3; state.scene = 'powder'; }
  else if (r.R2 != null) { delete r.R2; state.scene = 'slab'; }
  else if (r.R1 != null) { delete r.R1; state.scene = 'none'; }
  else if (state.k > 0) { state.k--; delete state.rows[state.k].R3; state.scene = 'powder'; }
  state.revealed = false; say('warn', 'Last reading removed.'); render();
});
$('newGlass').addEventListener('click', () => { state.g = P.newGlass((Math.random() * 1e9) | 0); state.k = 0; state.scene = 'none'; state.rows = [{}, {}, {}]; state.revealed = false; say('warn', 'A new unknown glass is on the table. Start again with R₁ on the bare mark.'); render(); });
$('reveal').addEventListener('click', () => { state.revealed = true; render(); });
Array.prototype.forEach.call(document.querySelectorAll('.views [data-view]'), (b) => b.addEventListener('click', () => scene && scene.setView(b.getAttribute('data-view'))));
['msr', 'vsc'].forEach((id) => $(id).addEventListener('input', () => { const m = parseFloat($('msr').value), v = parseFloat($('vsc').value); $('totalLine').textContent = isFinite(m) && isFinite(v) ? 'Total reading = ' + fmt(m, 2) + ' + ' + v + ' × 0.001 = ' + fmt(P.total(m, v), 3) + ' cm' : 'Total reading = MSR + VSC × 0.001 cm'; }));

/* ---------- drawing: eyepiece ---------- */
const DOTS = (() => { const r = P.mulberry32(11), a = []; for (let i = 0; i < 70; i++) a.push([r() * 2 - 1, r() * 2 - 1, 0.6 + r() * 1.6]); return a.filter((d) => d[0] * d[0] + d[1] * d[1] < 1); })();
function blurPx(b) { return b <= 1 ? b * 0.5 : Math.min(16, 0.5 + (b - 1) * 1.1); }
function drawEye() {
  const cv = $('eyeView'), dpr = window.devicePixelRatio || 1, S = 260; cv.width = S * dpr; cv.height = S * dpr;
  const ctx = cv.getContext('2d'); if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.save(); ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); ctx.clip();
  const planes = P.view(state.g, state.k, state.scene, state.R);
  const near = Math.min.apply(null, planes.map((p) => p.blur));
  ctx.fillStyle = state.scene === 'none' ? '#f4f1e6' : '#e6f2f2'; ctx.fillRect(0, 0, S, S);
  planes.forEach((p) => {
    const px = blurPx(p.blur), fade = Math.max(0.15, 1 - Math.max(0, p.blur - 1) / 40);
    ctx.save(); if ('filter' in ctx) ctx.filter = 'blur(' + px.toFixed(1) + 'px)'; ctx.globalAlpha = fade;
    if (p.what === 'mark') { ctx.strokeStyle = '#141414'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(60, 60); ctx.lineTo(200, 200); ctx.moveTo(200, 60); ctx.lineTo(60, 200); ctx.stroke(); }
    else { ctx.fillStyle = '#ffffff'; ctx.strokeStyle = 'rgba(90,90,90,.7)'; ctx.lineWidth = 1; DOTS.forEach((d) => { ctx.beginPath(); ctx.arc(S / 2 + d[0] * 115, S / 2 + d[1] * 115, d[2] * 2.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }); }
    ctx.restore();
  });
  // cross-wires of the eyepiece
  ctx.strokeStyle = 'rgba(200,30,20,.75)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(S / 2, 0); ctx.lineTo(S / 2, S); ctx.moveTo(0, S / 2); ctx.lineTo(S, S / 2); ctx.stroke();
  ctx.restore();
  return near;
}

/* ---------- drawing: vernier (overview + magnifier) ---------- */
// geometry of the overview: returns pixel position of a scale value, and of vernier line j
function vGeom(W) {
  const pxd = Math.max(4.5, (W - 40) / 53), R = state.R, start = R - 2 * P.MSD;
  return { pxd, R, start, x: (v) => 16 + ((v - start) / P.MSD) * pxd, vx: (j) => 16 + ((R - start) / P.MSD + j * 0.98) * pxd };
}
function ticks(ctx, x, from, to, mid, H, pxd, labels) {
  ctx.strokeStyle = '#16232b'; ctx.fillStyle = '#16232b'; ctx.textAlign = 'center';
  for (let u = Math.ceil(from / P.MSD); u * P.MSD <= to + 1e-9; u++) {
    const v = u * P.MSD, X = x(v), big = u % 20 === 0, half = u % 10 === 0;
    ctx.lineWidth = Math.max(1, pxd / 30) * (big ? 1.6 : 1); ctx.beginPath(); ctx.moveTo(X, mid); ctx.lineTo(X, mid - H * (big ? 1 : half ? 0.78 : 0.5)); ctx.stroke();
    if (labels && (big || half)) ctx.fillText(big ? String(Math.round(v)) : fmt(v, 1), X, mid - H - 5);
  }
}
function vticks(ctx, vx, j0, j1, mid, H, pxd, labels) {
  ctx.fillStyle = '#3d2b00'; ctx.textAlign = 'center';
  for (let j = Math.max(0, j0); j <= Math.min(50, j1); j++) {
    const X = vx(j), big = j % 10 === 0, five = j % 5 === 0;
    ctx.strokeStyle = j === 0 ? '#e0281a' : '#3d2b00'; ctx.lineWidth = Math.max(1, pxd / 30) * (j === 0 ? 1.8 : big ? 1.4 : 1);
    ctx.beginPath(); ctx.moveTo(X, mid); ctx.lineTo(X, mid + H * (big ? 1 : five ? 0.75 : 0.5)); ctx.stroke();
    if (labels === 'all' || (labels && big)) ctx.fillText(String(j), X, mid + H + 13);
  }
}
function prep(cv, H) {
  const dpr = window.devicePixelRatio || 1, W = Math.round(cv.clientWidth || 560); cv.width = W * dpr; cv.height = H * dpr; cv.style.height = H + 'px';
  const ctx = cv.getContext('2d'); if (!ctx) return null; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H); ctx.font = '12px "Space Mono", monospace'; return { ctx, W };
}
function drawVernier() {
  const p = prep($('vernier'), 120); if (!p) return; const { ctx, W } = p, G = vGeom(W), mid = 64;
  ctx.fillStyle = '#e6e2d4'; ctx.fillRect(0, 8, W, mid - 8);
  ticks(ctx, G.x, G.start, G.start + (W - 16) / G.pxd * P.MSD, mid, 30, G.pxd, true);
  ctx.fillStyle = '#efe2b8'; ctx.fillRect(G.vx(0) - 6, mid, G.vx(50) - G.vx(0) + 12, 44);
  vticks(ctx, G.vx, 0, 50, mid, 24, G.pxd, true);
  // magnifier window
  const j = state.mag, a = G.vx(j - 3.5), b = G.vx(j + 3.5);
  ctx.strokeStyle = '#b07d00'; ctx.lineWidth = 2; ctx.strokeRect(a, 10, b - a, 106);
}
function drawMag() {
  const p = prep($('vmag'), 120); if (!p) return; const { ctx, W } = p;
  const j = state.mag, pxd = W / 8, mid = 62;
  // magnified frame centred on vernier line j: X = W/2 + (value - vernierLineValue(j)) / MSD * pxd
  const vj = state.R + j * 0.98 * P.MSD, x = (v) => W / 2 + ((v - vj) / P.MSD) * pxd, vx = (k) => W / 2 + (k - j) * 0.98 * pxd;
  ctx.fillStyle = '#e6e2d4'; ctx.fillRect(0, 6, W, mid - 6);
  ticks(ctx, x, vj - 4.5 * P.MSD, vj + 4.5 * P.MSD, mid, 40, pxd, false);
  ctx.fillStyle = '#efe2b8'; ctx.fillRect(0, mid, W, 44);
  vticks(ctx, vx, j - 5, j + 5, mid, 34, pxd, 'all');
  ctx.fillStyle = '#6b5a2a'; ctx.textAlign = 'left'; ctx.fillText('main scale ↑   vernier ↓   (×' + Math.round(pxd / 9) + ')', 8, 18);
}
function moveMag(j) { state.mag = Math.max(3, Math.min(47, Math.round(j))); drawVernier(); drawMag(); }
$('vernier').addEventListener('pointerdown', (ev) => {
  const cv = $('vernier'), r = cv.getBoundingClientRect(), G = vGeom(Math.round(cv.clientWidth || 560));
  const xx = ev.clientX - r.left; moveMag((xx - G.vx(0)) / (G.vx(1) - G.vx(0)));
});
$('magL').addEventListener('click', () => moveMag(state.mag - 3));
$('magR').addEventListener('click', () => moveMag(state.mag + 3));

/* ---------- render ---------- */
function defaultStatus() {
  const s = stage(), planes = P.view(state.g, state.k, state.scene, state.R), sharp = P.isSharp(state.g, state.k, state.scene, state.R);
  if (row().R1 == null && s === 0) return { kind: '', text: sharp ? 'The mark is in sharp focus. Now read the vernier scale: type the main scale reading and the vernier coincidence, then press Record R₁.' : 'Step 1: lower the microscope (coarse buttons or drag it) until the cross mark appears, then use the fine buttons until it is sharp.' };
  const name = 'R' + SUB[s];
  if (row()[key()] != null) return { kind: 'good', text: name + ' is recorded for this slab.' };
  if (sharp) return { kind: '', text: 'In sharp focus. Read the vernier and press Record ' + name + '.' };
  return { kind: '', text: s === 1 ? 'Find the image of the mark through the slab: move the microscope until it is sharp again.' : 'Focus on the powder on top of the slab.' };
}
function renderControls() {
  const s = stage();
  $('rSl').value = state.R;
  $('recordBtn').textContent = 'Record R' + SUB[s];
  $('stepTag').textContent = 'Step ' + (s + 1) + ' · ' + ['mark', 'image through slab', 'powder on top'][s];
  $('slabTag').textContent = 'Slab ' + (state.k + 1) + ' of 3';
  Array.prototype.forEach.call(document.querySelectorAll('#steps li'), (li) => {
    const k = +li.getAttribute('data-s'), done = row()['R' + (k + 1)] != null;
    li.className = done ? 'done' : k === s ? 'now' : '';
  });
  $('slabBtn').disabled = state.scene !== 'none'; $('powderBtn').disabled = state.scene !== 'slab'; $('nextBtn').disabled = row().R3 == null || state.k >= 2;
  const st = $('status'), m = state.msg || defaultStatus(); st.textContent = m.text; st.className = 'status' + (m.kind ? ' ' + m.kind : '');
}
const complete = () => state.rows.map((r, k) => ({ ...r, k })).filter((r) => r.R1 != null && r.R2 != null && r.R3 != null);
const nOf = (r) => P.indexFrom(r.R1, r.R2, r.R3);
const meanN = () => { const c = complete(); return c.length ? c.reduce((a, r) => a + nOf(r), 0) / c.length : null; };

function readingChecks() {
  const c = complete(), out = [];
  if (!c.length) return out;
  out.push(c.length >= 3 ? { k: 'ok', t: 'All three slabs measured.' } : { k: 'warn', t: c.length + ' slab' + (c.length > 1 ? 's' : '') + ' measured. Measure all three (different thicknesses) and take the mean n.' });
  c.forEach((r) => { if (!(r.R2 > r.R1 && r.R3 > r.R2)) out.push({ k: 'warn', t: 'Slab ' + (r.k + 1) + ': the readings should increase R₁ < R₂ < R₃ (the image is raised, and the top surface is higher still). Undo and re-take them.' }); });
  if (c.length >= 2) {
    const ns = c.map(nOf), m = meanN(), sp = (Math.max(...ns) - Math.min(...ns)) / m * 100;
    if (sp > 3) { let w = 0; ns.forEach((x, k) => { if (Math.abs(x - m) > Math.abs(ns[w] - m)) w = k; }); out.push({ k: 'warn', t: 'Slab ' + (c[w].k + 1) + ' gives n = ' + fmt(ns[w], 3) + ', far from the others. Each focus must be exactly sharp, since a 0.004 cm error changes the apparent thickness noticeably. Use “Undo” and repeat that slab.' }); }
    else out.push({ k: 'ok', t: 'Your values of n agree within ' + fmt(sp, 1) + '%.' });
  }
  const r = c[c.length - 1];
  out.push({ k: 'tip', t: 'For slab ' + (r.k + 1) + ' the mark looked raised by R₂ − R₁ = ' + fmt(r.R2 - r.R1, 3) + ' cm, about ' + fmt((r.R2 - r.R1) / (r.R3 - r.R1) * 100, 0) + '% of its thickness. That is why a pool of water looks shallower than it really is.' });
  return out;
}
function renderTable() {
  const body = $('obsBody'); body.innerHTML = '';
  state.rows.forEach((r, k) => {
    if (r.R1 == null && k !== state.k) return;
    const tr = document.createElement('tr'), ok = r.R1 != null && r.R2 != null && r.R3 != null;
    [String(k + 1), r.R1, r.R2, r.R3].map((v, j) => (j === 0 ? v : v == null ? '—' : fmt(v, 3)))
      .concat(ok ? [fmt(r.R3 - r.R1, 3), fmt(r.R3 - r.R2, 3), fmt(nOf(r), 3)] : ['—', '—', '—'])
      .forEach((v) => { const td = document.createElement('td'); td.textContent = v; tr.appendChild(td); });
    body.appendChild(tr);
  });
  const m = meanN(), c = complete();
  $('resultLine').textContent = m == null ? '' : 'Mean refractive index of the glass: n = ' + fmt(m, 3) + ' (from ' + c.length + ' slab' + (c.length > 1 ? 's' : '') + ').';
  const list = $('checks'), items = readingChecks(); list.innerHTML = '';
  items.forEach((x) => { const li = document.createElement('li'); li.className = x.k; li.textContent = x.t; list.appendChild(li); });
  $('checksH').hidden = !items.length;
  const rv = $('revealBox');
  if (state.revealed) {
    rv.hidden = false;
    if (m == null) rv.textContent = 'Not yet: complete R₁, R₂ and R₃ for at least one slab first, then check your answer.';
    else {
      const err = Math.abs(m - state.g.n) / state.g.n * 100;
      rv.textContent = 'Actual refractive index: ' + fmt(state.g.n, 3) + '. Slab thicknesses: ' + state.g.t.map((t) => fmt(t, 3) + ' cm').join(', ') + '. Your mean n = ' + fmt(m, 3) + ', an error of ' + fmt(err, 2) + '%.' +
        (c.length < 3 ? ' Measure all three slabs for a reliable mean.' : err > 2 ? ' To improve it, focus more carefully with the fine buttons; see the checks above.' : ' Well done: that is within normal laboratory accuracy.');
    }
  } else rv.hidden = true;
}
function drawGraph() {
  const cv = $('graph1'), dpr = window.devicePixelRatio || 1, W = cv.clientWidth || 320, H = Math.round(W * 0.62);
  cv.width = W * dpr; cv.height = H * dpr; const ctx = cv.getContext('2d'); if (!ctx) return; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
  const c = complete(), pts = c.map((r) => ({ x: r.R3 - r.R2, y: r.R3 - r.R1 }));
  const xm = 1.6, ym = 2.4, pad = { l: 50, r: 14, t: 12, b: 40 }, w = W - pad.l - pad.r, h = H - pad.t - pad.b;
  const X = (v) => pad.l + (v / xm) * w, Y = (v) => pad.t + h - (v / ym) * h;
  ctx.font = '11px "Space Mono", monospace'; ctx.strokeStyle = '#d8d0bb'; ctx.fillStyle = '#4b5b63'; ctx.lineWidth = 1;
  for (let v = 0; v <= xm + 1e-9; v += 0.2) { ctx.beginPath(); ctx.moveTo(X(v), pad.t); ctx.lineTo(X(v), pad.t + h); ctx.stroke(); ctx.textAlign = 'center'; ctx.fillText(fmt(v, 1), X(v), pad.t + h + 14); }
  for (let v = 0; v <= ym + 1e-9; v += 0.4) { ctx.beginPath(); ctx.moveTo(pad.l, Y(v)); ctx.lineTo(pad.l + w, Y(v)); ctx.stroke(); ctx.textAlign = 'right'; ctx.fillText(fmt(v, 1), pad.l - 5, Y(v) + 4); }
  ctx.strokeStyle = '#0c1c27'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, pad.t + h); ctx.lineTo(pad.l + w, pad.t + h); ctx.stroke();
  ctx.fillStyle = '#0c1c27'; ctx.textAlign = 'center'; ctx.fillText('apparent thickness R₃ − R₂ (cm)', pad.l + w / 2, H - 5);
  ctx.save(); ctx.translate(12, pad.t + h / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('real thickness R₃ − R₁ (cm)', 0, 0); ctx.restore();
  let slope = null;
  if (pts.length) {
    slope = pts.reduce((a, p) => a + p.x * p.y, 0) / pts.reduce((a, p) => a + p.x * p.x, 0);   // best line through the origin
    ctx.strokeStyle = '#e8511d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(0), Y(0)); const xe = Math.min(xm, ym / slope); ctx.lineTo(X(xe), Y(slope * xe)); ctx.stroke();
  }
  ctx.fillStyle = '#12a0a0'; pts.forEach((p) => { ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), 5, 0, Math.PI * 2); ctx.fill(); });
  $('slopeLine').textContent = slope == null ? 'Complete the readings for the slabs to plot the graph. Its slope is n.' : 'Best straight line through the origin: slope = real / apparent = n = ' + fmt(slope, 3) + '.';
}
function render() {
  renderControls(); drawEye(); drawVernier(); drawMag(); renderTable(); drawGraph();
  if (scene) scene.setState({ R: state.R, scene: state.scene, k: state.k, g: state.g });
}
window.addEventListener('resize', () => { drawGraph(); drawVernier(); drawMag(); });
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
