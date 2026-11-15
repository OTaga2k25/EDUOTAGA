/* n-p-n transistor, common-emitter characteristics
 * Physics core is kept free of DOM code so it can be tested in Node. Currents: I_B in µA, I_C in mA. */

var CE = (function () {
  'use strict';
  var VT = 0.02585, RB = 10000;            // thermal voltage (V), base resistor (ohm)
  var VBB_MAX = 2, VCE_MAX = 12;
  var LC = { vbe: 0.001, ib: 0.1, vce: 0.01, ic: 0.01 };
  var FS = { vbe: 1, ib: 150, vce: 15, ic: 50 };
  var IB_SET = [20, 40, 60], VCE_SET = [1, 5];
  var IB_TOL = 1.0, VCE_TOL = 0.05;

  function round(v, d) { var p = Math.pow(10, d); return Math.round(v * p) / p; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function mulberry32(a) {
    return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  /** Hidden transistor: current gain beta, Early voltage VA, base-emitter diode (IB = 10 µA at v10). */
  function newTransistor(seed) {
    var r = mulberry32(seed), t = { seed: seed, beta: Math.round(100 + r() * 120), VA: Math.round(50 + r() * 100), n: 1.8 + r() * 0.15, v10: 0.62 + r() * 0.05 };
    t.I0 = 10 / (Math.exp(t.v10 / (t.n * VT)) - 1);   // µA
    return t;
  }
  // base current (µA) for a given VBE and VCE; a larger VCE slightly reduces IB (base-width modulation)
  function ibOf(t, vbe, vce) { return t.I0 * (Math.exp(vbe / (t.n * VT)) - 1) * (1 - 0.012 * Math.min(vce, 10) / 5); }
  /** Base circuit: supply vbb through RB. Returns VBE (V) and IB (µA). */
  function base(t, vbb, vce) {
    if (vbb <= 0) return { VBE: 0, IB: 0 };
    var lo = 0, hi = vbb, k, mid;
    for (k = 0; k < 80; k++) { mid = (lo + hi) / 2; if (mid + ibOf(t, mid, vce) * 1e-6 * RB > vbb) hi = mid; else lo = mid; }
    return { VBE: lo, IB: ibOf(t, lo, vce) };
  }
  /** Collector current (mA) for base current ib (µA) and VCE (V). */
  function icOf(t, ib, vce) { if (vce <= 0 || ib <= 0) return 0; return t.beta * ib * 1e-3 * (1 + vce / t.VA) * (1 - Math.exp(-vce / 0.08)); }
  function noise(t, x, w) { var s = Math.sin((x + 1) * 12.9898 + w * 7.7 + t.seed * 0.0078233) * 43758.5453; return (s - Math.floor(s)) - 0.5; }
  /** Meter readings for the knob settings. */
  function reading(t, vbb, vce) {
    var b = base(t, vbb, vce), ic = icOf(t, b.IB, vce), k = vbb * 31 + vce * 7;
    return { VBE: Math.max(0, round(b.VBE + noise(t, k, 1) * LC.vbe, 3)), IB: Math.max(0, round(b.IB + noise(t, k, 2) * LC.ib, 1)),
      VCE: Math.max(0, round(vce + noise(t, k, 3) * LC.vce, 2)), IC: Math.max(0, round(ic + noise(t, k, 4) * LC.ic, 2)) };
  }

  function lineFit(pts) {
    var n = pts.length, sx = 0, sy = 0, sxx = 0, sxy = 0, i; if (n < 2) return null;
    for (i = 0; i < n; i++) { sx += pts[i].x; sy += pts[i].y; sxx += pts[i].x * pts[i].x; sxy += pts[i].x * pts[i].y; }
    var den = n * sxx - sx * sx; if (Math.abs(den) < 1e-15) return null;
    var b = (n * sxy - sx * sy) / den; return { a: (sy - b * sx) / n, b: b };
  }
  /** Input resistance from the steep part of an input curve: rows [{VBE, IB}]. Returns ohm and the cut-in voltage. */
  function inputAnalysis(rows) {
    if (!rows || rows.length < 3) return null;
    var imax = Math.max.apply(null, rows.map(function (r) { return r.IB; }));
    var top = rows.filter(function (r) { return r.IB >= Math.max(10, 0.4 * imax); });
    if (top.length < 3) return null;
    var f = lineFit(top.map(function (r) { return { x: r.VBE, y: r.IB }; }));
    if (!f || f.b <= 0) return null;
    return { ri: 1e6 / f.b, knee: -f.a / f.b, fit: f, used: top.length };
  }
  /** Output resistance from the active region of an output curve: rows [{VCE, IC}] with VCE >= 1 V. Also IC at VCE = 5 V. */
  function outputAnalysis(rows) {
    var act = (rows || []).filter(function (r) { return r.VCE >= 1; });
    if (act.length < 3) return null;
    var f = lineFit(act.map(function (r) { return { x: r.VCE, y: r.IC }; }));
    if (!f || f.b <= 0) return null;
    return { ro: 1000 / f.b, ic5: f.a + 5 * f.b, fit: f, used: act.length };
  }
  /** Current gain from output curves: [{ib, ic5}] (µA, mA). Least-squares slope of IC against IB. */
  function betaFrom(curves) {
    if (curves.length < 2) return null;
    var f = lineFit(curves.map(function (c) { return { x: c.ib, y: c.ic5 }; }));
    return f ? f.b * 1000 : null;
  }
  return { VT: VT, RB: RB, VBB_MAX: VBB_MAX, VCE_MAX: VCE_MAX, LC: LC, FS: FS, IB_SET: IB_SET, VCE_SET: VCE_SET, IB_TOL: IB_TOL, VCE_TOL: VCE_TOL,
    round: round, clamp: clamp, mulberry32: mulberry32, newTransistor: newTransistor, base: base, icOf: icOf, reading: reading, lineFit: lineFit,
    inputAnalysis: inputAnalysis, outputAnalysis: outputAnalysis, betaFrom: betaFrom };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = CE; }

/* ------------------------------------------------------------------ */
/* UI                                                                  */
/* ------------------------------------------------------------------ */
if (typeof document !== 'undefined') {
  (function () {
    'use strict';
    var $ = function (id) { return document.getElementById(id); };
    function fmt(v, d) { return Number(v).toFixed(d); }
    var COL = ['#12a0a0', '#e8511d', '#5763e6', '#b07d00'];
    var state = { t: CE.newTransistor((Math.random() * 1e9) | 0), mode: 'in', curveIn: 1, curveOut: 20, vbb: 0, vce: 0,
      inRows: [], outRows: [], stamp: 0, msg: null, revealed: false };
    function say(k, t) { state.msg = { kind: k, text: t }; }
    function rd() { return CE.reading(state.t, state.vbb, state.vce); }

    function setVbb(v) { state.vbb = CE.round(CE.clamp(Math.round(v / 0.005) * 0.005, 0, CE.VBB_MAX), 3); state.msg = null; render(); }
    function setVce(v) { state.vce = CE.round(CE.clamp(Math.round(v / 0.05) * 0.05, 0, CE.VCE_MAX), 2); state.msg = null; render(); }
    $('vbbSl').addEventListener('input', function (e) { setVbb(parseFloat(e.target.value)); });
    $('vceSl').addEventListener('input', function (e) { setVce(parseFloat(e.target.value)); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-b]'), function (b) { b.addEventListener('click', function () { setVbb(state.vbb + parseFloat(b.getAttribute('data-b'))); }); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-c]'), function (b) { b.addEventListener('click', function () { setVce(state.vce + parseFloat(b.getAttribute('data-c'))); }); });
    Array.prototype.forEach.call(document.querySelectorAll('#modeChips [data-m]'), function (b) { b.addEventListener('click', function () { state.mode = b.getAttribute('data-m'); state.msg = null; render(); }); });
    $('curveChips').addEventListener('click', function (e) {
      var b = e.target.closest('[data-v]'); if (!b) return; var v = parseFloat(b.getAttribute('data-v'));
      if (state.mode === 'in') state.curveIn = v; else state.curveOut = v; state.msg = null; render();
    });

    $('recordBtn').addEventListener('click', function () {
      var r = rd();
      if (state.mode === 'in') {
        var target = state.curveIn;
        if (Math.abs(r.VCE - target) > CE.VCE_TOL) { say('err', 'For this input curve V_CE must be kept at ' + fmt(target, 1) + ' V, but it reads ' + fmt(r.VCE, 2) + ' V. Adjust the collector rheostat first.'); return render(); }
        if (state.vbb <= 0) { say('err', 'The base rheostat is at zero. Increase V_BB a little and take readings as I_B starts to flow.'); return render(); }
        var ex = -1; state.inRows.forEach(function (x, i) { if (x.curve === target && x.vbb === state.vbb) ex = i; });
        var row = { curve: target, vbb: state.vbb, vce: state.vce, VBE: r.VBE, IB: r.IB, t: ++state.stamp };
        if (ex >= 0) state.inRows[ex] = row; else state.inRows.push(row);
        say('good', 'Recorded V_BE = ' + fmt(r.VBE, 3) + ' V, I_B = ' + fmt(r.IB, 1) + ' µA (V_CE = ' + fmt(target, 1) + ' V). Change the base rheostat and take another reading.');
      } else {
        var ib = state.curveOut;
        if (Math.abs(r.IB - ib) > CE.IB_TOL) { say('err', 'For this output curve I_B must stay at ' + ib + ' µA, but it reads ' + fmt(r.IB, 1) + ' µA. ' + (r.IB < ib ? 'Increase' : 'Decrease') + ' the base rheostat slightly (I_B changes a little whenever V_CE changes).'); return render(); }
        var ex2 = -1; state.outRows.forEach(function (x, i) { if (x.curve === ib && x.vce === state.vce) ex2 = i; });
        var row2 = { curve: ib, vbb: state.vbb, vce: state.vce, VCE: r.VCE, IC: r.IC, IB: r.IB, t: ++state.stamp };
        if (ex2 >= 0) state.outRows[ex2] = row2; else state.outRows.push(row2);
        say('good', 'Recorded V_CE = ' + fmt(r.VCE, 2) + ' V, I_C = ' + fmt(r.IC, 2) + ' mA at I_B = ' + fmt(r.IB, 1) + ' µA. Change V_CE, bring I_B back to ' + ib + ' µA if needed, and record again.');
      }
      state.revealed = false; render();
    });
    $('delLast').addEventListener('click', function () {
      var arr = state.mode === 'in' ? state.inRows : state.outRows, k = -1, i;
      for (i = 0; i < arr.length; i++) if (k < 0 || arr[i].t > arr[k].t) k = i;
      if (k >= 0) arr.splice(k, 1); state.revealed = false; state.msg = null; render();
    });
    $('newT').addEventListener('click', function () { state.t = CE.newTransistor((Math.random() * 1e9) | 0); state.inRows = []; state.outRows = []; state.revealed = false; say('warn', 'A new unknown transistor is connected. Start again.'); render(); });
    $('reveal').addEventListener('click', function () { state.revealed = true; render(); });

    function curves(rows, key) { var g = {}; rows.forEach(function (r) { (g[r.curve] = g[r.curve] || []).push(r); }); Object.keys(g).forEach(function (k) { g[k].sort(function (a, b) { return a[key] - b[key]; }); }); return g; }
    function results() {
      var gi = curves(state.inRows, 'VBE'), go = curves(state.outRows, 'VCE'), ins = [], outs = [];
      Object.keys(gi).forEach(function (k) { var a = CE.inputAnalysis(gi[k]); if (a) ins.push({ curve: +k, a: a }); });
      Object.keys(go).forEach(function (k) { var a = CE.outputAnalysis(go[k]); if (a) outs.push({ curve: +k, a: a, ib: go[k].reduce(function (s, r) { return s + r.IB; }, 0) / go[k].length }); });
      var beta = CE.betaFrom(outs.map(function (o) { return { ib: o.ib, ic5: o.a.ic5 }; }));
      return { gi: gi, go: go, ins: ins, outs: outs, beta: beta };
    }
    function exactFor(rows, kind) {   // the same analysis on noise-free values at the student's knob settings
      return rows.map(function (r) { var b = CE.base(state.t, r.vbb, r.vce); return kind === 'in' ? { VBE: b.VBE, IB: b.IB } : { VCE: r.vce, IC: CE.icOf(state.t, b.IB, r.vce), IB: b.IB }; });
    }
    function fmtR(o) { return o >= 1000 ? fmt(o / 1000, 2) + ' kΩ' : fmt(o, 0) + ' Ω'; }
    function readingChecks(R) {
      var out = [];
      Object.keys(R.gi).forEach(function (k) {
        var rows = R.gi[k], steep = rows.filter(function (r) { return r.IB >= 10; }).length, off = rows.filter(function (r) { return r.IB < 2; }).length;
        if (rows.length < 6) out.push({ k: 'warn', t: 'Input curve at V_CE = ' + k + ' V: only ' + rows.length + ' readings. Take about 8–10, closer together near the knee.' });
        if (!off) out.push({ k: 'warn', t: 'Input curve at V_CE = ' + k + ' V: add a reading or two below the knee (I_B nearly zero), so the curve starts from zero.' });
        if (steep < 3) out.push({ k: 'warn', t: 'Input curve at V_CE = ' + k + ' V: take at least 3 readings with I_B above 10 µA (the steep part) to find r_i.' });
      });
      Object.keys(R.go).forEach(function (k) {
        var rows = R.go[k], sat = rows.filter(function (r) { return r.VCE < 0.6; }).length, act = rows.filter(function (r) { return r.VCE >= 1; }).length;
        if (!sat) out.push({ k: 'warn', t: 'Output curve at I_B = ' + k + ' µA: add 2–3 readings with V_CE below 0.6 V to show the steep rise (saturation region).' });
        if (act < 3) out.push({ k: 'warn', t: 'Output curve at I_B = ' + k + ' µA: take at least 3 readings with V_CE between 1 V and 10 V (active region) to find r_o and I_C.' });
      });
      var nOut = R.outs.length;
      if (state.outRows.length) out.push(nOut >= 2 ? { k: 'ok', t: nOut + ' complete output curves: enough to find β.' } : { k: 'warn', t: 'For β you need at least two output curves (different I_B). Choose another I_B above and repeat.' });
      if (R.ins.length && !state.outRows.length) out.push({ k: 'tip', t: 'Next: switch to the output characteristic.' });
      if (R.beta) out.push({ k: 'tip', t: 'β = ' + fmt(R.beta, 0) + ': a base current of 1 µA controls about ' + fmt(R.beta / 1000, 2) + ' mA of collector current. This is current amplification.' });
      return out;
    }

    function renderCurveChips() {
      var list = state.mode === 'in' ? CE.VCE_SET : CE.IB_SET, cur = state.mode === 'in' ? state.curveIn : state.curveOut, unit = state.mode === 'in' ? ' V' : ' µA', name = state.mode === 'in' ? 'V_CE = ' : 'I_B = ';
      $('curveChips').innerHTML = list.map(function (v) { return '<button type="button" class="chip" data-v="' + v + '" aria-pressed="' + (v === cur) + '">' + name + v + unit + '</button>'; }).join('');
      $('curveHint').textContent = state.mode === 'in' ? 'Keep V_CE at ' + cur + ' V (collector rheostat) and vary the base rheostat.' : 'Keep I_B at ' + cur + ' µA (base rheostat) and vary V_CE with the collector rheostat.';
    }
    function defaultStatus(r) {
      if (state.mode === 'in') {
        if (Math.abs(r.VCE - state.curveIn) > CE.VCE_TOL) return { kind: '', text: 'Input characteristic: first set V_CE to ' + state.curveIn + ' V with the collector rheostat. Then raise the base rheostat in small steps and take readings of V_BE and I_B.' };
        if (r.IB < 1) return { kind: '', text: 'I_B is still almost zero: the base–emitter junction has not reached its knee. Keep raising the base rheostat.' };
        return { kind: '', text: 'I_B is rising steeply with V_BE, as for a diode. Take readings here in small steps.' };
      }
      if (Math.abs(r.IB - state.curveOut) > CE.IB_TOL) return { kind: '', text: 'Output characteristic: adjust the base rheostat until I_B reads ' + state.curveOut + ' µA (now ' + fmt(r.IB, 1) + ' µA).' };
      if (r.VCE < 0.6) return { kind: 'good', text: 'I_B is set. At small V_CE the collector current rises steeply (saturation region). Take readings here, then increase V_CE.' };
      return { kind: 'good', text: 'Active region: I_C hardly changes as V_CE increases, because it is controlled by I_B. Record, then change V_CE.' };
    }
    function render() {
      var r = rd();
      Array.prototype.forEach.call(document.querySelectorAll('#modeChips [data-m]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-m') === state.mode)); });
      renderCurveChips();
      $('vbbSl').value = state.vbb; $('vceSl').value = state.vce; $('vbbVal').textContent = fmt(state.vbb, 3) + ' V';
      $('ibDigi').textContent = fmt(r.IB, 1) + ' µA'; $('vbeDigi').textContent = fmt(r.VBE, 3) + ' V'; $('icDigi').textContent = fmt(r.IC, 2) + ' mA'; $('vceDigi').textContent = fmt(r.VCE, 2) + ' V';
      $('meters').innerHTML = '<div><b>V_BE</b><span>' + fmt(r.VBE, 3) + ' V</span></div><div><b>I_B</b><span>' + fmt(r.IB, 1) + ' µA</span></div><div><b>V_CE</b><span>' + fmt(r.VCE, 2) + ' V</span></div><div><b>I_C</b><span>' + fmt(r.IC, 2) + ' mA</span></div>';
      [['ibNeedle', r.IB / CE.FS.ib, 300, 196], ['vbeNeedle', r.VBE / CE.FS.vbe, 408, 276], ['icNeedle', r.IC / 25, 666, 96], ['vceNeedle', r.VCE / CE.FS.vce, 560, 216]].forEach(function (n) { $(n[0]).setAttribute('transform', 'rotate(' + (-60 + 120 * CE.clamp(n[1], 0, 1)) + ' ' + n[2] + ' ' + n[3] + ')'); });
      $('bSlide').setAttribute('x1', 110 + state.vbb / CE.VBB_MAX * 100); $('bSlide').setAttribute('x2', 110 + state.vbb / CE.VBB_MAX * 100);
      $('cSlide').setAttribute('x1', 730 + state.vce / CE.VCE_MAX * 80); $('cSlide').setAttribute('x2', 730 + state.vce / CE.VCE_MAX * 80);
      var st = state.msg || defaultStatus(r); $('status').textContent = st.text; $('status').className = 'status' + (st.kind ? ' ' + st.kind : '');
      var R = results(); renderTables(R); renderGraphs(R);
    }
    function renderTables(R) {
      [['inBody', R.gi, ['VBE', 3], ['IB', 1]], ['outBody', R.go, ['VCE', 2], ['IC', 2]]].forEach(function (c) {
        var body = $(c[0]), keys = Object.keys(c[1]).sort(function (a, b) { return a - b; }); body.innerHTML = '';
        if (!keys.length) body.innerHTML = '<tr class="empty"><td colspan="3">No readings yet</td></tr>';
        keys.forEach(function (k) { c[1][k].forEach(function (r) { var tr = document.createElement('tr'); [k, fmt(r[c[2][0]], c[2][1]), fmt(r[c[3][0]], c[3][1])].forEach(function (v) { var td = document.createElement('td'); td.textContent = v; tr.appendChild(td); }); body.appendChild(tr); }); });
      });
      var ri = R.ins.length ? R.ins[R.ins.length - 1].a.ri : null, ro = R.outs.length ? R.outs.reduce(function (s, o) { return s + o.a.ro; }, 0) / R.outs.length : null;
      $('riOut').textContent = ri ? fmtR(ri) : '—'; $('roOut').textContent = ro ? fmtR(ro) : '—'; $('betaOut').textContent = R.beta ? fmt(R.beta, 0) : '—';
      var lines = [];
      R.ins.forEach(function (o) { lines.push('Input curve (V_CE = ' + o.curve + ' V): cut-in V_BE ≈ ' + fmt(o.a.knee, 2) + ' V, r_i = ΔV_BE/ΔI_B = ' + fmtR(o.a.ri) + '.'); });
      R.outs.forEach(function (o) { lines.push('Output curve (I_B = ' + o.curve + ' µA): I_C at V_CE = 5 V is ' + fmt(o.a.ic5, 2) + ' mA, r_o = ΔV_CE/ΔI_C = ' + fmtR(o.a.ro) + '.'); });
      if (R.beta) lines.push('Current gain β = ΔI_C/ΔI_B (at V_CE = 5 V) = ' + fmt(R.beta, 0) + '.');
      $('resultLine').textContent = lines.join(' ');
      var list = $('checks'), items = readingChecks(R); list.innerHTML = '';
      items.forEach(function (c) { var li = document.createElement('li'); li.className = c.k; li.textContent = c.t; list.appendChild(li); });
      $('checksH').hidden = !items.length;
      var rv = $('revealBox');
      if (state.revealed) {
        rv.hidden = false;
        if (!R.ins.length && !R.beta) { rv.textContent = 'Not yet: complete an input curve and at least two output curves first, then check your answer.'; return; }
        var out = ['This transistor has β = ' + state.t.beta + ' (at V_CE = 5 V the small-signal gain is ' + fmt(state.t.beta * (1 + 5 / state.t.VA), 0) + ').'];
        if (R.beta) { var bt = state.t.beta * (1 + 5 / state.t.VA), e = Math.abs(R.beta - bt) / bt * 100; out.push('Your β = ' + fmt(R.beta, 0) + ', an error of ' + fmt(e, 1) + '%.'); }
        if (R.ins.length) { var o = R.ins[R.ins.length - 1], ex = CE.inputAnalysis(exactFor(R.gi[o.curve], 'in')); if (ex) out.push('Input resistance from exact meters: ' + fmtR(ex.ri) + ' (yours ' + fmtR(o.a.ri) + ').'); }
        if (R.outs.length) { var o2 = R.outs[0], ex2 = CE.outputAnalysis(exactFor(R.go[o2.curve], 'out')); if (ex2) out.push('Output resistance at I_B = ' + o2.curve + ' µA from exact meters: ' + fmtR(ex2.ro) + ' (yours ' + fmtR(o2.a.ro) + '). r_o is found from a very small change in I_C, so it is the least precise result.'); }
        rv.textContent = out.join(' ');
      } else rv.hidden = true;
    }

    function nice(maxV) { var raw = maxV / 5, mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), f = raw / mag, s = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag; s = parseFloat(s.toPrecision(6)); return { step: s, max: parseFloat((Math.ceil(maxV / s - 1e-9) * s).toPrecision(6)) }; }
    function dec(s) { var t = String(s), i = t.indexOf('.'); return i < 0 ? 0 : Math.min(4, t.length - i - 1); }
    function plot(canvas, groups, xk, yk, xl, yl, defX, defY, unit) {
      var dpr = window.devicePixelRatio || 1, W = canvas.clientWidth || 320, H = Math.round(W * 0.72);
      canvas.width = W * dpr; canvas.height = H * dpr; var ctx = canvas.getContext('2d'); if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      var all = []; Object.keys(groups).forEach(function (k) { all = all.concat(groups[k]); });
      var ax = nice(all.length ? Math.max.apply(null, all.map(function (r) { return r[xk]; })) * 1.08 || defX : defX), ay = nice(all.length ? Math.max.apply(null, all.map(function (r) { return r[yk]; })) * 1.12 || defY : defY);
      var pad = { l: 46, r: 12, t: 12, b: 38 }, w = W - pad.l - pad.r, h = H - pad.t - pad.b;
      var X = function (v) { return pad.l + v / ax.max * w; }, Y = function (v) { return pad.t + h - v / ay.max * h; }, i;
      ctx.font = '11px "Space Mono", monospace'; ctx.strokeStyle = '#d8d0bb'; ctx.fillStyle = '#4b5b63'; ctx.lineWidth = 1;
      for (i = 0; i <= Math.round(ax.max / ax.step); i++) { var v = i * ax.step; ctx.beginPath(); ctx.moveTo(X(v), pad.t); ctx.lineTo(X(v), pad.t + h); ctx.stroke(); ctx.textAlign = 'center'; ctx.fillText(v.toFixed(dec(ax.step)), X(v), pad.t + h + 14); }
      for (i = 0; i <= Math.round(ay.max / ay.step); i++) { var u = i * ay.step; ctx.beginPath(); ctx.moveTo(pad.l, Y(u)); ctx.lineTo(pad.l + w, Y(u)); ctx.stroke(); ctx.textAlign = 'right'; ctx.fillText(u.toFixed(dec(ay.step)), pad.l - 5, Y(u) + 4); }
      ctx.strokeStyle = '#0c1c27'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, pad.t + h); ctx.lineTo(pad.l + w, pad.t + h); ctx.stroke();
      ctx.fillStyle = '#0c1c27'; ctx.textAlign = 'center'; ctx.fillText(xl, pad.l + w / 2, H - 5);
      ctx.save(); ctx.translate(11, pad.t + h / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(yl, 0, 0); ctx.restore();
      Object.keys(groups).sort(function (a, b) { return a - b; }).forEach(function (k, gi) {
        var rows = groups[k], c = COL[gi % COL.length];
        ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(0), Y(0)); rows.forEach(function (r) { ctx.lineTo(X(r[xk]), Y(r[yk])); }); ctx.stroke();
        ctx.fillStyle = c; rows.forEach(function (r) { ctx.beginPath(); ctx.arc(X(r[xk]), Y(r[yk]), 3.8, 0, Math.PI * 2); ctx.fill(); });
        var last = rows[rows.length - 1]; if (last) { ctx.textAlign = 'right'; ctx.fillText(k + unit, Math.min(X(last[xk]) - 4, pad.l + w - 2), Y(last[yk]) - 7); }
      });
    }
    function renderGraphs(R) {
      plot($('gIn'), R.gi, 'VBE', 'IB', 'V_BE (V)', 'I_B (µA)', 1, 100, ' V');
      plot($('gOut'), R.go, 'VCE', 'IC', 'V_CE (V)', 'I_C (mA)', 12, 12, ' µA');
      $('slopeLine').textContent = R.beta ? 'At V_CE = 5 V the output curves give β = ΔI_C/ΔI_B = ' + fmt(R.beta, 0) + '.' : 'Input curves are labelled by V_CE, output curves by I_B.';
    }
    window.addEventListener('resize', function () { renderGraphs(results()); });
    render();
  })();
}
