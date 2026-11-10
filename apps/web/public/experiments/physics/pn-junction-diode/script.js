/* p-n junction diode: forward and reverse characteristics
 * Physics core is kept free of DOM code so it can be tested in Node. */

var Diode = (function () {
  'use strict';

  var VT = 0.02585;          // thermal voltage at about 27 °C, V
  var R_PROT = 100;          // protective resistor in the forward circuit, ohm
  var R_MA = 2;              // milliammeter resistance, ohm
  var VS_F = 3, VS_R = 20;   // supply ranges, V
  var LC = { vf: 0.001, imA: 0.1, vr: 0.1, iuA: 0.01 };
  var FS = { vf: 1, imA: 30, vr: 20, iuA: 50 };

  function round(v, d) { var p = Math.pow(10, d); return Math.round(v * p) / p; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function rnd(r, a, b) { return a + r() * (b - a); }
  function mulberry32(a) {
    return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  /** A hidden diode: silicon or germanium, with slightly different parameters each time. Currents in mA. */
  function newDiode(seed, forceType) {
    var r = mulberry32(seed), type = forceType || (r() < 0.5 ? 'Si' : 'Ge'), d;
    if (type === 'Si') d = { type: 'Si', n: rnd(r, 1.75, 1.95), v1: rnd(r, 0.60, 0.66), rs: rnd(r, 1.5, 3), rleak: rnd(r, 20, 60) * 1e6 };
    else d = { type: 'Ge', n: rnd(r, 1.3, 1.5), v1: rnd(r, 0.17, 0.23), rs: rnd(r, 2, 4), rleak: rnd(r, 0.6, 1.6) * 1e6 };
    d.Is = 1 / (Math.exp(d.v1 / (d.n * VT)) - 1);    // mA, so that I = 1 mA at the junction voltage v1
    d.seed = seed;
    return d;
  }

  /** Junction current (mA) for junction voltage vj (V); negative vj is reverse bias. */
  function junction(d, vj) {
    var i = d.Is * (Math.exp(vj / (d.n * VT)) - 1);
    if (vj < 0) i += (vj / d.rleak) * 1000;          // leakage, mA
    return i;
  }

  /** Forward circuit: supply vs (V) through R_PROT and the milliammeter. Returns diode voltage (V) and current (mA). */
  function forward(d, vs) {
    var rTot = R_PROT + R_MA, lo = 0, hi = Math.max(vs, 0), k, mid;
    if (vs <= 0) return { V: 0, I: 0 };
    for (k = 0; k < 80; k++) { mid = (lo + hi) / 2; if (mid + (junction(d, mid) / 1000) * (rTot + d.rs) > vs) hi = mid; else lo = mid; }
    var I = junction(d, lo);
    return { V: lo + (I / 1000) * d.rs, I: I };
  }
  /** Reverse circuit: supply vs (V) straight across the diode and microammeter. Current in µA (positive number). */
  function reverse(d, vs) {
    if (vs <= 0) return { V: 0, I: 0 };
    var I = -junction(d, -vs) * 1000;                  // µA
    return { V: vs, I: I };
  }

  function noise(d, x, which) {
    var s = Math.sin((x + 1) * 12.9898 + which * 7.7 + d.seed * 0.0078233) * 43758.5453;
    return (s - Math.floor(s)) - 0.5;
  }
  /** Meter readings, rounded to the least counts with a small repeatable error. */
  function reading(d, mode, vs) {
    if (mode === 'f') {
      var f = forward(d, vs);
      return { V: Math.max(0, round(f.V + noise(d, vs, 1) * LC.vf, 3)), I: Math.max(0, round(f.I + noise(d, vs, 2) * LC.imA, 1)) };
    }
    var r = reverse(d, vs);
    return { V: Math.max(0, round(r.V + noise(d, vs, 3) * LC.vr, 1)), I: Math.max(0, round(r.I + noise(d, vs, 4) * LC.iuA, 2)) };
  }

  function lineFit(pts) {   // least squares y = a + b x
    var n = pts.length, sx = 0, sy = 0, sxx = 0, sxy = 0, i;
    if (n < 2) return null;
    for (i = 0; i < n; i++) { sx += pts[i].x; sy += pts[i].y; sxx += pts[i].x * pts[i].x; sxy += pts[i].x * pts[i].y; }
    var den = n * sxx - sx * sx; if (Math.abs(den) < 1e-15) return null;
    var b = (n * sxy - sx * sy) / den; return { a: (sy - b * sx) / n, b: b };
  }

  /** Knee voltage: extend the straight, steep part of the forward curve (I at least 40% of the largest current, and at least 3 mA)
   *  down to the voltage axis. Forward resistance r = ΔV/ΔI on that part. rows: [{V, I(mA)}]. */
  function forwardAnalysis(rows) {
    if (!rows || rows.length < 3) return null;
    var imax = Math.max.apply(null, rows.map(function (r) { return r.I; }));
    var top = rows.filter(function (r) { return r.I >= Math.max(3, 0.4 * imax); });
    if (top.length < 3) return null;
    var f = lineFit(top.map(function (r) { return { x: r.V, y: r.I }; }));   // I = a + b V
    if (!f || f.b <= 0) return null;
    return { knee: -f.a / f.b, rf: 1000 / f.b, fit: f, used: top.length };
  }
  /** Reverse resistance from the slope of the reverse curve for V >= 2 V. rows: [{V, I(µA)}]. Result in ohm. */
  function reverseAnalysis(rows) {
    var pts = (rows || []).filter(function (r) { return r.V >= 2; });
    if (pts.length < 3) return null;
    var f = lineFit(pts.map(function (r) { return { x: r.V, y: r.I }; }));
    if (!f || f.b <= 0) return null;
    return { rr: 1e6 / f.b, fit: f, used: pts.length };
  }
  /** The "true" values found the same way from the exact curve. */
  function truth(d) {
    var fr = [], rr = [], v;
    for (v = 0.5; v <= VS_F + 1e-9; v += 0.05) fr.push(forward(d, v));
    for (v = 2; v <= VS_R + 1e-9; v += 1) rr.push(reverse(d, v));
    var fa = forwardAnalysis(fr), ra = reverseAnalysis(rr);
    return { knee: fa.knee, rf: fa.rf, rr: ra.rr };
  }
  /** Exact values found from the student's own supply settings (no reading errors). */
  function truthFor(d, fVs, rVs) {
    var fa = forwardAnalysis(fVs.map(function (v) { return forward(d, v); }));
    var ra = reverseAnalysis(rVs.map(function (v) { return reverse(d, v); }));
    return { knee: fa ? fa.knee : null, rf: fa ? fa.rf : null, rr: ra ? ra.rr : null };
  }

  return { VT: VT, R_PROT: R_PROT, VS_F: VS_F, VS_R: VS_R, LC: LC, FS: FS, round: round, clamp: clamp, mulberry32: mulberry32,
    newDiode: newDiode, junction: junction, forward: forward, reverse: reverse, reading: reading, lineFit: lineFit,
    forwardAnalysis: forwardAnalysis, reverseAnalysis: reverseAnalysis, truth: truth, truthFor: truthFor };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = Diode; }

/* ------------------------------------------------------------------ */
/* UI                                                                  */
/* ------------------------------------------------------------------ */
if (typeof document !== 'undefined') {
  (function () {
    'use strict';

    var NS = 'http://www.w3.org/2000/svg';
    var STEP = { f: 0.05, r: 0.5 }, MAXV = { f: Diode.VS_F, r: Diode.VS_R };
    var stamp = 0;
    var state = { d: Diode.newDiode((Math.random() * 1e9) | 0), mode: 'f', vs: { f: 0, r: 0 }, data: { f: [], r: [] }, msg: null, revealed: false };
    var $ = function (id) { return document.getElementById(id); };
    function fmt(v, d) { return Number(v).toFixed(d); }
    function say(kind, text) { state.msg = { kind: kind, text: text }; }
    function vsNow() { return state.vs[state.mode]; }
    function live() { return Diode.reading(state.d, state.mode, vsNow()); }

    (function dials() {
      [['aScale', 530, 60, 34], ['vScale', 620, 200, 38]].forEach(function (d) {
        var g = $(d[0]), deg, a, l;
        for (deg = -60; deg <= 60; deg += 15) {
          a = (deg * Math.PI) / 180; l = document.createElementNS(NS, 'line');
          l.setAttribute('x1', d[1] + (d[3] - 9) * Math.sin(a)); l.setAttribute('y1', d[2] - (d[3] - 9) * Math.cos(a));
          l.setAttribute('x2', d[1] + (d[3] - 3) * Math.sin(a)); l.setAttribute('y2', d[2] - (d[3] - 3) * Math.cos(a));
          l.setAttribute('class', 'gtick'); g.appendChild(l);
        }
      });
    })();

    function drawDiode(mode) {
      var s = '<polyline points="760,160 760,230" class="lead"/>';
      if (mode === 'f') s += '<polygon points="742,170 778,170 760,212" class="diode"/><line x1="740" y1="214" x2="780" y2="214" class="dbar"/>' +
        '<text x="792" y="180" class="lbl pn">p</text><text x="792" y="222" class="lbl pn">n</text>';
      else s += '<polygon points="742,220 778,220 760,178" class="diode"/><line x1="740" y1="176" x2="780" y2="176" class="dbar"/>' +
        '<text x="792" y="180" class="lbl pn">n</text><text x="792" y="222" class="lbl pn">p</text>';
      s += '<text x="792" y="202" class="lbl small">Diode</text>';
      $('diode').innerHTML = s;
    }

    Array.prototype.forEach.call(document.querySelectorAll('#modeChips [data-m]'), function (b) {
      b.addEventListener('click', function () { state.mode = b.getAttribute('data-m'); state.msg = null; render(); });
    });
    function setVs(v) {
      var m = state.mode, st = STEP[m];
      state.vs[m] = Diode.round(Diode.clamp(Math.round(v / st) * st, 0, MAXV[m]), 2); state.msg = null; render();
    }
    $('vs').addEventListener('input', function (e) { setVs(parseFloat(e.target.value)); });
    Array.prototype.forEach.call(document.querySelectorAll('.nudge [data-d]'), function (b) {
      b.addEventListener('click', function () { setVs(vsNow() + parseFloat(b.getAttribute('data-d')) * STEP[state.mode]); });
    });

    $('recordBtn').addEventListener('click', function () {
      var m = state.mode, v = vsNow(), rd = live(), arr = state.data[m], ex = -1;
      if (v <= 0) { say('err', 'The supply is at zero. Increase the supply voltage with the rheostat, then take a reading.'); return render(); }
      arr.forEach(function (r, i) { if (r.vs === v) ex = i; });
      var row = { vs: v, V: rd.V, I: rd.I, t: ++stamp };
      if (ex >= 0) arr[ex] = row; else arr.push(row);
      arr.sort(function (a, b) { return a.vs - b.vs; }); state.revealed = false;
      say('good', 'Recorded V = ' + (m === 'f' ? fmt(rd.V, 3) : fmt(rd.V, 1)) + ' V, I = ' + (m === 'f' ? fmt(rd.I, 1) + ' mA' : fmt(rd.I, 2) + ' µA') + '. Change the supply and take another reading.');
      render();
    });
    $('delLast').addEventListener('click', function () {
      var arr = state.data[state.mode], last = -1, i;   // remove the most recently added row of this table
      for (i = 0; i < arr.length; i++) if (last < 0 || arr[i].t > arr[last].t) last = i;
      if (last >= 0) arr.splice(last, 1); state.revealed = false; state.msg = null; render();
    });
    $('resetAll').addEventListener('click', function () { state.data[state.mode] = []; state.revealed = false; say('warn', (state.mode === 'f' ? 'Forward' : 'Reverse') + ' bias table cleared.'); render(); });
    $('newDiode').addEventListener('click', function () {
      state.d = Diode.newDiode((Math.random() * 1e9) | 0); state.data = { f: [], r: [] }; state.vs = { f: 0, r: 0 }; state.revealed = false;
      say('warn', 'A new unknown diode is connected. Both tables were cleared.'); render();
    });
    $('reveal').addEventListener('click', function () { state.revealed = true; render(); });

    function defaultStatus(rd) {
      var m = state.mode, n = state.data[m].length;
      if (m === 'f') {
        if (vsNow() === 0) return { kind: '', text: 'Step 1 (forward bias): raise the supply in small steps. Note the voltmeter V across the diode and the current I, and press “Take reading” each time. Take about 12 readings up to 3 V.' };
        if (rd.I < 0.5) return { kind: '', text: 'The current is still almost zero: the applied voltage has not yet overcome the barrier potential. Keep increasing the supply.' };
        if (n >= 8 && !state.data.r.length) return { kind: '', text: n + ' forward readings. Now switch to reverse bias and take readings up to 20 V.' };
        return { kind: '', text: 'The current is rising steeply: you are past the knee. Take several readings here; the voltage across the diode changes only a little.' };
      }
      if (vsNow() === 0) return { kind: '', text: 'Reverse bias: the battery now drives the n side positive. The milliammeter is replaced by a microammeter. Raise the supply in steps of 2 V and take readings up to 20 V.' };
      return { kind: '', text: n + ' reverse reading' + (n === 1 ? '' : 's') + '. The current is only a few microamperes or less, and grows slowly with the reverse voltage.' };
    }

    function render() {
      var m = state.mode, rd = live(), v = vsNow();
      drawDiode(m);
      Array.prototype.forEach.call(document.querySelectorAll('#modeChips [data-m]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-m') === m)); });
      $('modeHint').textContent = m === 'f' ? 'p side to the + terminal, through a 100 Ω protective resistor and a milliammeter (0–30 mA).' : 'n side to the + terminal, with a microammeter (0–50 µA). Battery up to 20 V.';
      $('rprot').style.display = m === 'f' ? '' : 'none'; $('rprotWire').style.display = m === 'f' ? 'none' : '';
      $('batLabel').textContent = m === 'f' ? 'Battery 3 V' : 'Battery 20 V';
      $('aName').textContent = m === 'f' ? 'Milliammeter (mA)' : 'Microammeter (µA)';
      $('benchHint').textContent = m === 'f' ? 'Forward bias: the p side of the diode is connected to the positive terminal. The protective resistor limits the current.'
        : 'Reverse bias: the n side of the diode is connected to the positive terminal. Only a very small reverse current flows.';
      var sl = $('vs'); sl.max = MAXV[m]; sl.step = STEP[m]; sl.value = v;
      $('vsVal').textContent = fmt(v, m === 'f' ? 2 : 1) + ' V';
      $('vsLabel').textContent = 'Supply ' + fmt(v, m === 'f' ? 2 : 1) + ' V';
      var sx = 190 + (v / MAXV[m]) * 120; $('slide').setAttribute('x1', sx); $('slide').setAttribute('x2', sx);
      Array.prototype.forEach.call(document.querySelectorAll('.nudge [data-d]'), function (b) {
        var k = parseFloat(b.getAttribute('data-d')) * STEP[m]; b.textContent = (k > 0 ? '+' : '−') + fmt(Math.abs(k), m === 'f' && Math.abs(k) < 0.1 ? 2 : 1);
      });
      var vtxt = m === 'f' ? fmt(rd.V, 3) + ' V' : fmt(rd.V, 1) + ' V', itxt = m === 'f' ? fmt(rd.I, 1) + ' mA' : fmt(rd.I, 2) + ' µA';
      $('vDigi').textContent = vtxt; $('aDigi').textContent = itxt; $('liveRead').textContent = vtxt + ' · ' + itxt;
      var fsI = m === 'f' ? Diode.FS.imA : Diode.FS.iuA, fsV = m === 'f' ? Diode.FS.vf : Diode.FS.vr;
      $('aNeedle').setAttribute('transform', 'rotate(' + (-60 + 120 * Diode.clamp(rd.I / fsI, 0, 1)) + ' 530 60)');
      $('vNeedle').setAttribute('transform', 'rotate(' + (-60 + 120 * Diode.clamp(rd.V / fsV, 0, 1)) + ' 620 200)');
      $('flow').style.display = m === 'f' && rd.I >= 0.5 ? '' : 'none';
      var st = state.msg || defaultStatus(rd); $('status').textContent = st.text; $('status').className = 'status' + (st.kind ? ' ' + st.kind : '');
      renderTables(); renderGraph();
    }

    function renderChecks(items) {
      var list = $('checks'); list.innerHTML = '';
      items.forEach(function (c) { var li = document.createElement('li'); li.className = c.k; li.textContent = c.t; list.appendChild(li); });
      $('checksH').hidden = !items.length;
    }
    // Checks on the recorded readings, so the student knows what to improve
    function readingChecks() {
      var out = [], f = state.data.f, nf = f.length;
      if (nf) {
        var imax = Math.max.apply(null, f.map(function (x) { return x.I; }));
        var off = f.filter(function (x) { return x.I < 0.5; }).length, knee = f.filter(function (x) { return x.I >= 0.5 && x.I < 5; }).length, steep = f.filter(function (x) { return x.I >= Math.max(3, 0.4 * imax); }).length;
        out.push(nf >= 8 ? { k: 'ok', t: 'Forward bias: ' + nf + ' readings.' } : { k: 'warn', t: 'Forward bias: only ' + nf + ' reading' + (nf > 1 ? 's' : '') + '. Take about 10, so the curve is clear before, at and after the knee.' });
        if (imax < 10) out.push({ k: 'warn', t: 'Forward bias: the largest current is only ' + fmt(imax, 1) + ' mA. Raise the supply further (to about 15–20 mA) so the straight steep part is long enough to extend.' });
        if (off < 2) out.push({ k: 'warn', t: 'Forward bias: take at least 2 readings below the knee, where the current is almost zero, so the graph shows the diode not conducting yet.' });
        if (imax >= 5 && !knee) out.push({ k: 'warn', t: 'Forward bias: no reading lies on the bend of the curve (0.5–5 mA). Near the knee, raise the supply in small steps (0.05 V) to see where the current starts to rise.' });
        if (steep >= 3) out.push({ k: 'ok', t: 'Forward bias: ' + steep + ' readings on the steep part, enough to find the knee voltage.' });
        else if (imax >= 3) out.push({ k: 'warn', t: 'Forward bias: only ' + steep + ' reading' + (steep === 1 ? '' : 's') + ' on the steep part (current above ' + fmt(Math.max(3, 0.4 * imax), 1) + ' mA). Take at least 3 there, in small steps, so the straight part can be extended to find the knee voltage.' });
      }
      var r = state.data.r, nr = r.length;
      if (nr) {
        var top = Math.max.apply(null, r.map(function (x) { return x.V; }));
        out.push(nr >= 5 ? { k: 'ok', t: 'Reverse bias: ' + nr + ' readings.' } : { k: 'warn', t: 'Reverse bias: only ' + nr + ' reading' + (nr > 1 ? 's' : '') + '. Take at least 5, in steps of about 2 V.' });
        if (top < 15) out.push({ k: 'warn', t: 'Reverse bias: your highest voltage is ' + fmt(top, 1) + ' V. Go up to about 20 V so the slow rise of the reverse current is clear.' });
        if (r.filter(function (x) { return x.V >= 2; }).length < 3) out.push({ k: 'warn', t: 'Reverse bias: take at least 3 readings above 2 V to find the reverse resistance.' });
      } else if (state.data.f.length >= 8) out.push({ k: 'tip', t: 'Next: switch to reverse bias and take readings up to 20 V.' });
      return out;
    }
    function results() {
      return { fa: Diode.forwardAnalysis(state.data.f), ra: Diode.reverseAnalysis(state.data.r) };
    }
    function fmtOhm(r) { return r >= 1e6 ? fmt(r / 1e6, 2) + ' MΩ' : r >= 1e3 ? fmt(r / 1e3, 1) + ' kΩ' : fmt(r, 1) + ' Ω'; }

    function renderTables() {
      [['f', 'fBody', 3, 1], ['r', 'rBody', 1, 2]].forEach(function (c) {
        var body = $(c[1]), arr = state.data[c[0]]; body.innerHTML = '';
        if (!arr.length) body.innerHTML = '<tr class="empty"><td colspan="3">No readings yet</td></tr>';
        arr.forEach(function (r, i) {
          var tr = document.createElement('tr');
          [String(i + 1), fmt(r.V, c[2]), fmt(r.I, c[3])].forEach(function (v) { var td = document.createElement('td'); td.textContent = v; tr.appendChild(td); });
          body.appendChild(tr);
        });
      });
      var R = results();
      $('kneeOut').textContent = R.fa ? fmt(R.fa.knee, 2) + ' V' : '—';
      $('rfOut').textContent = R.fa ? fmtOhm(R.fa.rf) : '—';
      $('rrOut').textContent = R.ra ? fmtOhm(R.ra.rr) : '—';
      var lines = [];
      if (R.fa) lines.push('Knee voltage ' + fmt(R.fa.knee, 2) + ' V, so the diode is most likely made of ' + (R.fa.knee < 0.45 ? 'germanium (about 0.3 V)' : 'silicon (about 0.7 V)') + '.');
      else if (state.data.f.length) lines.push('Take at least three forward readings on the steep part of the curve (above a few mA) to find the knee voltage.');
      if (R.ra) lines.push('Reverse resistance is about ' + fmtOhm(R.ra.rr) + ', far larger than the forward resistance: the diode conducts well in one direction only.');
      else if (state.data.r.length) lines.push('Take at least three reverse readings above 2 V to find the reverse resistance.');
      $('resultLine').textContent = lines.join(' ');
      renderChecks(readingChecks());
      var rv = $('revealBox');
      if (state.revealed) {
        rv.hidden = false;
        if (!R.fa && !R.ra) { rv.textContent = 'Not yet: ' + (state.data.f.length || state.data.r.length ? 'the curve is not complete enough to find the results. Follow the checks above, then check again.' : 'take readings in forward and reverse bias first, then check your answer.'); return; }
        var T = Diode.truthFor(state.d, state.data.f.map(function (r) { return r.vs; }), state.data.r.map(function (r) { return r.vs; }));
        var out = ['This is a ' + (state.d.type === 'Si' ? 'silicon' : 'germanium') + ' diode.'];
        if (R.fa) {
          out.push('Knee voltage from exact meters: ' + fmt(T.knee, 2) + ' V (yours ' + fmt(R.fa.knee, 2) + ' V).');
          out.push('Forward resistance: ' + fmtOhm(T.rf) + ' (yours ' + fmtOhm(R.fa.rf) + ', error ' + fmt(Math.abs(R.fa.rf - T.rf) / T.rf * 100, 1) + '%).');
          if ((R.fa.knee < 0.45 ? 'Ge' : 'Si') === state.d.type) out.push('You identified the material correctly.');
          else out.push('Your knee voltage points to the wrong material; check the readings on the steep part.');
        }
        if (R.ra) out.push('Reverse resistance: ' + fmtOhm(T.rr) + ' (yours ' + fmtOhm(R.ra.rr) + ', error ' + fmt(Math.abs(R.ra.rr - T.rr) / T.rr * 100, 1) + '%).');
        var warns = readingChecks().filter(function (c) { return c.k === 'warn'; }).length;
        out.push(warns ? 'Some checks above still need attention; fixing them makes your graph and results more reliable.' : 'All the checks on your readings are met. Well done.');
        rv.textContent = out.join(' ');
      } else rv.hidden = true;
    }

    function nice(maxV) {
      var raw = maxV / 4, mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), f = raw / mag;
      var step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
      step = parseFloat(step.toPrecision(6));
      return { step: step, max: parseFloat((Math.ceil(maxV / step - 1e-9) * step).toPrecision(6)) };
    }
    function dec(s) { var t = String(s), i = t.indexOf('.'); return i < 0 ? 0 : Math.min(4, t.length - i - 1); }

    var canvas = $('graph');
    function renderGraph() {
      var dpr = window.devicePixelRatio || 1, cssW = canvas.clientWidth || 640, cssH = Math.round(cssW * (cssW < 500 ? 0.9 : 0.66));
      canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
      var ctx = canvas.getContext('2d'); if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, cssW, cssH);
      var F = state.data.f, Rv = state.data.r, R = results();
      var fx = nice(Math.max(0.2, F.length ? Math.max.apply(null, F.map(function (r) { return r.V; })) * 1.1 : 1));
      var fy = nice(Math.max(1, F.length ? Math.max.apply(null, F.map(function (r) { return r.I; })) * 1.1 : 30));
      var rx = nice(Math.max(2, Rv.length ? Math.max.apply(null, Rv.map(function (r) { return r.V; })) : 20));
      var ry = nice(Math.max(0.1, Rv.length ? Math.max.apply(null, Rv.map(function (r) { return r.I; })) * 1.15 : 50));
      var pad = { l: 10, r: 14, t: 18, b: 22 }, w = cssW - pad.l - pad.r, h = cssH - pad.t - pad.b;
      var ox = pad.l + w * 0.44, oy = pad.t + h * 0.6;
      var wR = ox - pad.l - 4, wF = pad.l + w - ox, hF = oy - pad.t, hR = pad.t + h - oy;
      function X(v, fwd) { return fwd ? ox + (v / fx.max) * wF : ox - (v / rx.max) * wR; }
      function Y(i, fwd) { return fwd ? oy - (i / fy.max) * hF : oy + (i / ry.max) * hR; }
      ctx.font = '11px "Space Mono", monospace'; ctx.lineWidth = 1;
      var k, v;
      ctx.strokeStyle = '#ddd5c0'; ctx.fillStyle = '#4b5b63';
      for (k = 1; k <= Math.round(fx.max / fx.step); k++) { v = k * fx.step; ctx.beginPath(); ctx.moveTo(X(v, 1), pad.t); ctx.lineTo(X(v, 1), oy); ctx.stroke(); ctx.textAlign = 'center'; ctx.fillText(v.toFixed(dec(fx.step)), X(v, 1), oy + 13); }
      for (k = 1; k <= Math.round(rx.max / rx.step); k++) { v = k * rx.step; ctx.beginPath(); ctx.moveTo(X(v, 0), oy); ctx.lineTo(X(v, 0), pad.t + h); ctx.stroke(); ctx.textAlign = 'center'; ctx.fillText('−' + v.toFixed(dec(rx.step)), X(v, 0), oy - 5); }
      for (k = 1; k <= Math.round(fy.max / fy.step); k++) { v = k * fy.step; ctx.beginPath(); ctx.moveTo(ox, Y(v, 1)); ctx.lineTo(pad.l + w, Y(v, 1)); ctx.stroke(); ctx.textAlign = 'right'; ctx.fillText(v.toFixed(dec(fy.step)), ox - 4, Y(v, 1) + 4); }
      for (k = 1; k <= Math.round(ry.max / ry.step); k++) { v = k * ry.step; ctx.beginPath(); ctx.moveTo(pad.l, Y(v, 0)); ctx.lineTo(ox, Y(v, 0)); ctx.stroke(); ctx.textAlign = 'left'; ctx.fillText('−' + v.toFixed(dec(ry.step)), ox + 4, Y(v, 0) + 4); }
      ctx.strokeStyle = '#0c1c27'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(pad.l, oy); ctx.lineTo(pad.l + w, oy); ctx.moveTo(ox, pad.t); ctx.lineTo(ox, pad.t + h); ctx.stroke();
      ctx.fillStyle = '#0c1c27'; ctx.font = 'bold 11.5px "Space Mono", monospace';
      ctx.textAlign = 'right'; ctx.fillText('V (V) →', pad.l + w, oy - 6);
      ctx.textAlign = 'left'; ctx.fillText('← reverse V (V)', pad.l, oy + 14);
      ctx.fillText('I (mA)', ox + 6, pad.t - 5); ctx.fillText('I (µA)', ox - 54, pad.t + h + 16);
      // fitted lines
      if (R.fa) {
        var f = R.fa.fit, iTop = fy.max, vTop = (iTop - f.a) / f.b;
        ctx.strokeStyle = '#e8511d'; ctx.lineWidth = 1.6; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(X(R.fa.knee, 1), oy); ctx.lineTo(X(Math.min(vTop, fx.max), 1), Y(Math.min(iTop, f.a + f.b * fx.max), 1)); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = '#e8511d'; ctx.beginPath(); ctx.arc(X(R.fa.knee, 1), oy, 4.5, 0, Math.PI * 2); ctx.fill();
        ctx.textAlign = 'center'; ctx.fillText('knee ' + fmt(R.fa.knee, 2) + ' V', X(R.fa.knee, 1), oy + 27);
      }
      function curve(arr, fwd) {
        if (arr.length < 2) return; ctx.strokeStyle = fwd ? '#12a0a0' : '#5763e6'; ctx.lineWidth = 2; ctx.beginPath();
        ctx.moveTo(X(0, fwd), Y(0, fwd)); arr.forEach(function (r) { ctx.lineTo(X(r.V, fwd), Y(r.I, fwd)); }); ctx.stroke();
      }
      curve(F, 1); curve(Rv, 0);
      function dots(arr, fwd) { ctx.fillStyle = fwd ? '#12a0a0' : '#5763e6'; arr.forEach(function (r) { ctx.beginPath(); ctx.arc(X(r.V, fwd), Y(r.I, fwd), 4, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.3; ctx.stroke(); }); }
      dots(F, 1); dots(Rv, 0);
      var s = [];
      if (R.fa) s.push('Forward: the straight steep part meets the V axis at ' + fmt(R.fa.knee, 2) + ' V; slope gives r_f = ΔV/ΔI = ' + fmtOhm(R.fa.rf) + '.');
      if (R.ra) s.push('Reverse: r_r = ΔV/ΔI = ' + fmtOhm(R.ra.rr) + '.');
      $('slopeLine').textContent = s.length ? s.join(' ') : 'Take readings in forward and reverse bias to draw the curve.';
    }

    window.addEventListener('resize', renderGraph);
    render();
  })();
}
