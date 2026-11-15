/* Conversion of a galvanometer into a voltmeter and an ammeter. DOM-free core for Node tests. */
var Conv = (function () {
  'use strict';
  var N = 30;                      // full-scale divisions
  var RW = 0.004;                  // shunt wire resistance per cm (ohm/cm)
  var R_MAX = 20000, L_MAX = 40;
  function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function round(v, d) { var p = Math.pow(10, d); return Math.round(v * p) / p; }
  /** Hidden-but-given galvanometer (G ohm, k A/div) and the ranges to convert to. */
  function newSetup(seed) {
    var r = mulberry32(seed);
    var G = Math.round(50 + r() * 100), k = round((1.5 + r() * 1.5) * 1e-5, 7);
    var s = { seed: seed, G: G, k: k, V0: [3, 5][Math.floor(r() * 2)] };
    // choose the ammeter range for which the shunt wire is a convenient length (about 20 cm)
    s.I0 = [0.2, 0.3, 0.5, 1].reduce(function (best, I) { var L = (N * k * G) / (I - N * k) / RW; return Math.abs(L - 20) < Math.abs(best.L - 20) ? { I: I, L: L } : best; }, { I: 0.5, L: 1e9 }).I;
    return s;
  }
  var Ig = function (s) { return N * s.k; };                          // full-scale current, A
  var Rneeded = function (s) { return s.V0 / Ig(s) - s.G; };          // series resistance for a voltmeter of range V0
  var Sneeded = function (s) { return (Ig(s) * s.G) / (s.I0 - Ig(s)); };  // shunt for an ammeter of range I0
  var Lneeded = function (s) { return Sneeded(s) / RW; };             // shunt wire length, cm
  /** Galvanometer deflection (div) when used as a voltmeter with series R across a voltage V. */
  function thetaV(s, R, V) { return V / (R + s.G) / s.k; }
  /** Deflection when used as an ammeter with a shunt wire of length L (cm) carrying total current I. */
  function thetaA(s, L, I) { var S = L * RW; if (S <= 0) return 0; return (I * S / (s.G + S)) / s.k; }
  // the converted meter's scale reads theta/N of full range; the scale is read to 0.1 division
  function readTheta(t) { return t > N * 1.03 ? null : round(t, 1); }   // the needle can go a little past the last mark
  return { N: N, RW: RW, R_MAX: R_MAX, L_MAX: L_MAX, round: round, mulberry32: mulberry32, newSetup: newSetup,
    Ig: Ig, Rneeded: Rneeded, Sneeded: Sneeded, Lneeded: Lneeded, thetaV: thetaV, thetaA: thetaA, readTheta: readTheta };
})();
if (typeof module !== 'undefined' && module.exports) { module.exports = Conv; }

/* ------------------------------------------------------------------ */
/* UI                                                                  */
/* ------------------------------------------------------------------ */
if (typeof document !== 'undefined') {
  (function () {
    'use strict';
    var $ = function (id) { return document.getElementById(id); };
    function fmt(v, d) { return Number(v).toFixed(d); }
    var state = { s: Conv.newSetup((Math.random() * 1e9) | 0), mode: 'V', set: { V: 0, A: 0 }, app: { V: 0, A: 0 }, ok: { V: false, A: false }, rows: { V: [], A: [] }, msg: null, revealed: false };
    function say(k, t) { state.msg = { kind: k, text: t }; }
    var M = function () { return state.mode; };
    function range() { return M() === 'V' ? state.s.V0 : state.s.I0; }
    function unit() { return M() === 'V' ? 'V' : 'A'; }
    function theta() { var s = state.s, a = state.app[M()]; return M() === 'V' ? Conv.thetaV(s, state.set.V, a) : Conv.thetaA(s, state.set.A, a); }
    function conv(th) { return th / Conv.N * range(); }

    function given() {
      var s = state.s;
      $('given').innerHTML = 'Galvanometer (from the half-deflection experiment): G = <b>' + s.G + ' Ω</b>, figure of merit k = <b>' + fmt(s.k * 1e6, 1) + ' µA/div</b>, N = <b>' + Conv.N + '</b> divisions on each side.<br>' +
        (M() === 'V' ? 'Task: convert it into a voltmeter of range <b>0–' + s.V0 + ' V</b>.' : 'Task: convert it into an ammeter of range <b>0–' + s.I0 + ' A</b>. The shunt wire has a resistance of <b>' + Conv.RW + ' Ω per cm</b>.');
      $('calcInputs').innerHTML = M() === 'V'
        ? '<label><span>I<sub>g</sub> = N k (mA)</span><input type="number" id="inIg" step="0.001" inputmode="decimal"></label><label><span>R = V₀/I<sub>g</sub> − G (Ω)</span><input type="number" id="inR" step="1" inputmode="decimal"></label>'
        : '<label><span>I<sub>g</sub> = N k (mA)</span><input type="number" id="inIg" step="0.001" inputmode="decimal"></label><label><span>S = I<sub>g</sub>G/(I₀ − I<sub>g</sub>) (Ω)</span><input type="number" id="inS" step="0.0001" inputmode="decimal"></label><label><span>Wire length l = S/ρ (cm)</span><input type="number" id="inL" step="0.1" inputmode="decimal"></label>';
    }
    function close(a, b, tol) { return isFinite(a) && Math.abs(a - b) / Math.abs(b) <= tol; }
    $('checkCalc').addEventListener('click', function () {
      var s = state.s, ig = Conv.Ig(s) * 1000, msgs = [], allOk = true, uIg = parseFloat(($('inIg') || {}).value);
      if (!close(uIg, ig, 0.01)) { allOk = false; msgs.push(isFinite(uIg) ? 'I_g is not right: I_g = N × k = ' + Conv.N + ' × ' + fmt(s.k * 1e6, 1) + ' µA. Convert µA to mA (divide by 1000).' : 'Enter I_g first.'); }
      if (M() === 'V') {
        var R = Conv.Rneeded(s), uR = parseFloat($('inR').value);
        if (!close(uR, R, 0.003)) { allOk = false; msgs.push(isFinite(uR) ? 'R is not right. Use R = V₀/I_g − G with I_g in ampere: ' + s.V0 + ' / ' + fmt(ig / 1000, 6) + ' − ' + s.G + '.' + (close(uR, R + s.G, 0.002) ? ' You forgot to subtract G.' : '') : 'Enter R.'); }
      } else {
        var S = Conv.Sneeded(s), L = Conv.Lneeded(s), uS = parseFloat($('inS').value), uL = parseFloat($('inL').value);
        if (!close(uS, S, 0.01)) { allOk = false; msgs.push(isFinite(uS) ? 'S is not right. Use S = I_g G / (I₀ − I_g) with I_g in ampere. It should be a small fraction of an ohm.' : 'Enter S.'); }
        if (!close(uL, L, 0.02)) { allOk = false; msgs.push(isFinite(uL) ? 'The length is not right: l = S / ρ = S / ' + Conv.RW + ' Ω per cm.' : 'Enter the wire length.'); }
      }
      state.ok[M()] = allOk;
      $('calcFb').textContent = allOk ? 'Correct. Now set the ' + (M() === 'V' ? 'resistance box to R' : 'shunt wire to this length') + ' (step 2).' : msgs.join(' ');
      $('calcFb').className = 'mini ' + (allOk ? 'okc' : 'errc');
      say(allOk ? 'good' : 'err', allOk ? 'Calculation correct.' : 'Check your calculation: see the notes under the button.');
      render();
    });

    function setVal(v) { state.set[M()] = M() === 'V' ? Math.max(0, Math.min(Conv.R_MAX, Math.round(v))) : Conv.round(Math.max(0, Math.min(Conv.L_MAX, v)), 1); state.msg = null; render(); }
    function setApp(v) { state.app[M()] = Conv.round(Math.max(0, Math.min(range(), v)), M() === 'V' ? 2 : 3); state.msg = null; render(); }
    $('setSl').addEventListener('input', function (e) { setVal(parseFloat(e.target.value)); });
    $('appSl').addEventListener('input', function (e) { setApp(parseFloat(e.target.value)); });
    $('setNudge').addEventListener('click', function (e) { var b = e.target.closest('[data-n]'); if (b) setVal(state.set[M()] + parseFloat(b.getAttribute('data-n'))); });
    Array.prototype.forEach.call(document.querySelectorAll('#modeChips [data-m]'), function (b) { b.addEventListener('click', function () { state.mode = b.getAttribute('data-m'); state.msg = null; given(); $('calcFb').textContent = ''; render(); }); });

    $('recordBtn').addEventListener('click', function () {
      if (!state.ok[M()]) { say('err', 'First complete step 1: calculate ' + (M() === 'V' ? 'R' : 'S and the wire length') + ' and check it.'); return render(); }
      var th = Conv.readTheta(theta()), a = state.app[M()];
      if (th === null) { say('err', 'The galvanometer is off the scale! ' + (M() === 'V' ? 'The series resistance is too small.' : 'The shunt is too long or too small in resistance... check it: a shorter wire means a smaller S, which takes more current away from the galvanometer.')); return render(); }
      if (a <= 0) { say('err', 'Apply some ' + (M() === 'V' ? 'voltage' : 'current') + ' with the rheostat first.'); return render(); }
      var arr = state.rows[M()], row = { std: a, th: th }, ex = -1; arr.forEach(function (r, i) { if (r.std === a) ex = i; });
      if (ex >= 0) arr[ex] = row; else arr.push(row); arr.sort(function (p, q) { return p.std - q.std; }); state.revealed = false;
      var c = conv(th);
      say('good', 'Standard meter ' + fmt(a, M() === 'V' ? 2 : 3) + ' ' + unit() + '; galvanometer ' + fmt(th, 1) + ' div, which on the new scale is ' + fmt(c, M() === 'V' ? 2 : 3) + ' ' + unit() + '. Change the rheostat and record again.');
      render();
    });
    $('delLast').addEventListener('click', function () { state.rows[M()].pop(); state.revealed = false; state.msg = null; render(); });
    $('newG').addEventListener('click', function () { state.s = Conv.newSetup((Math.random() * 1e9) | 0); state.ok = { V: false, A: false }; state.rows = { V: [], A: [] }; state.set = { V: 0, A: 0 }; state.app = { V: 0, A: 0 }; state.revealed = false; given(); $('calcFb').textContent = ''; say('warn', 'A new galvanometer: new G and k. Start with the calculation.'); render(); });
    $('reveal').addEventListener('click', function () { state.revealed = true; render(); });

    /* ---------- circuit drawing ---------- */
    function gMeter(cx, cy, th, labelMax) {
      var s = '<circle cx="' + cx + '" cy="' + cy + '" r="46" class="meter' + (th === null ? ' off' : '') + '"/>', d, a, r0 = 38, u = labelMax;
      for (d = 0; d <= Conv.N; d++) { a = (-60 + 120 * d / Conv.N) * Math.PI / 180; var len = d % 5 === 0 ? 7 : 3; s += '<line x1="' + (cx + r0 * Math.sin(a)) + '" y1="' + (cy + 14 - r0 * Math.cos(a)) + '" x2="' + (cx + (r0 - len) * Math.sin(a)) + '" y2="' + (cy + 14 - (r0 - len) * Math.cos(a)) + '" class="gscale"/>'; }
      [0, 15, 30].forEach(function (d) { a = (-60 + 120 * d / Conv.N) * Math.PI / 180; s += '<text x="' + (cx + 27 * Math.sin(a)) + '" y="' + (cy + 18 - 27 * Math.cos(a)) + '" text-anchor="middle" class="gnum">' + fmt(d / Conv.N * u, 1) + '</text>'; });
      var ang = -60 + 120 * Math.min(1.05, (th === null ? 32 : th) / Conv.N);
      s += '<line x1="' + cx + '" y1="' + (cy + 14) + '" x2="' + cx + '" y2="' + (cy - 26) + '" class="needle" transform="rotate(' + ang + ' ' + cx + ' ' + (cy + 14) + ')"/><circle cx="' + cx + '" cy="' + (cy + 14) + '" r="3.5" class="pivot"/>';
      return s;
    }
    function stdMeter(cx, cy, val, full, lbl) {
      var ang = -60 + 120 * Math.min(1, val / full);
      return '<circle cx="' + cx + '" cy="' + cy + '" r="34" class="meter"/><text x="' + cx + '" y="' + (cy - 42) + '" text-anchor="middle" class="lbl small">' + lbl + '</text>' +
        '<line x1="' + cx + '" y1="' + (cy + 8) + '" x2="' + cx + '" y2="' + (cy - 22) + '" class="needle" transform="rotate(' + ang + ' ' + cx + ' ' + (cy + 8) + ')"/><circle cx="' + cx + '" cy="' + (cy + 8) + '" r="3" class="pivot"/>';
    }
    function drawCirc() {
      var s = '', th = Conv.readTheta(theta()), a = state.app[M()], full = range();
      s += '<polyline points="60,185 60,60 120,60" class="lead"/><polyline points="60,200 60,330 120,330" class="lead"/>';
      s += '<line x1="46" y1="185" x2="74" y2="185" class="plate long"/><line x1="52" y1="200" x2="68" y2="200" class="plate short"/><text x="80" y="214" class="lbl small">battery</text>';
      s += '<rect x="120" y="48" width="140" height="24" rx="3" class="box"/><line x1="' + (130 + 120 * a / full) + '" y1="46" x2="' + (130 + 120 * a / full) + '" y2="30" class="slide"/><text x="190" y="96" class="lbl small" text-anchor="middle">rheostat</text>';
      if (M() === 'V') {
        // potential divider output across the standard voltmeter and the converted voltmeter (G + R) in parallel
        s += '<polyline points="260,60 360,60 360,330 120,330" class="lead"/>';
        s += '<polyline points="360,110 470,110" class="lead"/><polyline points="360,300 470,300" class="lead"/>';
        s += '<polyline points="470,110 470,166" class="lead"/><polyline points="470,234 470,300" class="lead"/>' + stdMeter(470, 200, a, full, 'standard V') ;
        s += '<polyline points="470,110 620,110" class="lead"/><rect x="620" y="96" width="120" height="28" rx="4" class="res"/><text x="680" y="90" class="lbl small" text-anchor="middle">R = ' + state.set.V + ' Ω</text>';
        s += '<polyline points="740,110 800,110 800,154" class="lead"/><polyline points="800,246 800,300 470,300" class="lead"/>' + gMeter(800, 200, th, full);
        s += '<text x="800" y="270" class="digi" text-anchor="middle">' + (th === null ? 'off scale!' : fmt(th, 1) + ' div') + '</text><text x="700" y="160" class="lbl small" text-anchor="middle">G</text>';
      } else {
        // series circuit: rheostat, standard ammeter, galvanometer with the shunt wire in parallel
        s += '<polyline points="260,60 330,60" class="lead"/>' + stdMeter(370, 60, a, full, 'standard A') + '<polyline points="404,60 520,60 520,200 570,200" class="lead"/>';
        s += gMeter(620, 200, th, full) + '<polyline points="666,200 760,200 760,330 120,330" class="lead"/>';
        s += '<polyline points="520,200 520,290 560,290" class="lead"/><rect x="560" y="280" width="' + Math.max(8, state.set.A / Conv.L_MAX * 160) + '" height="20" rx="3" class="wirebox"/>';
        s += '<polyline points="' + (560 + Math.max(8, state.set.A / Conv.L_MAX * 160)) + ',290 760,290" class="lead"/><text x="640" y="320" class="lbl small" text-anchor="middle">shunt wire l = ' + fmt(state.set.A, 1) + ' cm</text>';
        s += '<text x="700" y="160" class="lbl small">G</text><text x="620" y="268" class="digi" text-anchor="middle">' + (th === null ? 'off scale!' : fmt(th, 1) + ' div') + '</text>';
      }
      $('circ').innerHTML = s;
      $('benchHint').textContent = M() === 'V' ? 'The converted voltmeter (galvanometer + series R) and a standard voltmeter are connected in parallel across the potential divider.' : 'The converted ammeter (galvanometer with the shunt wire across it) is in series with a standard ammeter and the rheostat.';
    }

    function readingChecks() {
      var rows = state.rows[M()], n = rows.length, out = []; if (!n) return out;
      out.push(n >= 5 ? { k: 'ok', t: n + ' readings.' } : { k: 'warn', t: 'Only ' + n + ' reading' + (n > 1 ? 's' : '') + '. Take at least 5, spread over the whole range up to ' + range() + ' ' + unit() + '.' });
      var errs = rows.map(function (r) { return (conv(r.th) - r.std) / range() * 100; }), me = errs.reduce(function (a, b) { return a + b; }, 0) / n;
      if (Math.abs(me) > 2) out.push({ k: 'warn', t: 'The converted meter reads ' + (me > 0 ? 'too high' : 'too low') + ' by about ' + fmt(Math.abs(me), 1) + '% of full scale. ' + (M() === 'V' ? (me > 0 ? 'The series resistance is too small: increase R.' : 'The series resistance is too large: decrease R.') : (me > 0 ? 'Too much current goes through the galvanometer: the shunt resistance is too large, so shorten the wire.' : 'Too little current goes through the galvanometer: make the shunt wire longer.')) });
      else out.push({ k: 'ok', t: 'The converted meter agrees with the standard meter within ' + fmt(Math.max.apply(null, errs.map(Math.abs)), 1) + '% of full scale.' });
      if (rows[n - 1].std < 0.7 * range()) out.push({ k: 'tip', t: 'Include readings near full scale (' + range() + ' ' + unit() + '), where the needle should reach ' + Conv.N + ' divisions.' });
      return out;
    }
    function renderTable() {
      var rows = state.rows[M()], u = unit(), d = M() === 'V' ? 2 : 3;
      $('obsHead').innerHTML = '<tr><th>Standard ' + (M() === 'V' ? 'voltmeter' : 'ammeter') + ' (' + u + ')</th><th>Galvanometer θ (div)</th><th>Converted reading (θ/N) × ' + range() + ' (' + u + ')</th><th>Difference (' + u + ')</th></tr>';
      var body = $('obsBody'); body.innerHTML = '';
      if (!rows.length) body.innerHTML = '<tr class="empty"><td colspan="4">No readings yet</td></tr>';
      rows.forEach(function (r) { var tr = document.createElement('tr'), c = conv(r.th); [fmt(r.std, d), fmt(r.th, 1), fmt(c, d), (c - r.std >= 0 ? '+' : '') + fmt(c - r.std, d)].forEach(function (v) { var td = document.createElement('td'); td.textContent = v; tr.appendChild(td); }); body.appendChild(tr); });
      $('resultLine').textContent = rows.length ? 'Converted ' + (M() === 'V' ? 'voltmeter (range 0–' + state.s.V0 + ' V, R = ' + state.set.V + ' Ω)' : 'ammeter (range 0–' + state.s.I0 + ' A, shunt wire ' + fmt(state.set.A, 1) + ' cm)') + ' compared with the standard meter.' : '';
      var list = $('checks'), items = readingChecks(); list.innerHTML = '';
      items.forEach(function (c) { var li = document.createElement('li'); li.className = c.k; li.textContent = c.t; list.appendChild(li); }); $('checksH').hidden = !items.length;
      var rv = $('revealBox');
      if (state.revealed) {
        rv.hidden = false;
        var s = state.s;
        rv.textContent = M() === 'V' ? 'Exact values: I_g = ' + fmt(Conv.Ig(s) * 1000, 3) + ' mA, R = ' + fmt(Conv.Rneeded(s), 0) + ' Ω. Your box is set to ' + state.set.V + ' Ω (' + fmt(Math.abs(state.set.V - Conv.Rneeded(s)) / Conv.Rneeded(s) * 100, 2) + '% off).'
          : 'Exact values: I_g = ' + fmt(Conv.Ig(s) * 1000, 3) + ' mA, S = ' + fmt(Conv.Sneeded(s), 4) + ' Ω, wire length ' + fmt(Conv.Lneeded(s), 2) + ' cm. Your wire is ' + fmt(state.set.A, 1) + ' cm (' + fmt(Math.abs(state.set.A - Conv.Lneeded(s)) / Conv.Lneeded(s) * 100, 2) + '% off).';
      } else rv.hidden = true;
    }
    function renderGraph() {
      var cv = $('graph'), dpr = window.devicePixelRatio || 1, W = cv.clientWidth || 320, H = Math.round(W * 0.62); cv.width = W * dpr; cv.height = H * dpr;
      var ctx = cv.getContext('2d'); if (!ctx) return; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      var full = range(), pad = { l: 50, r: 14, t: 12, b: 40 }, w = W - pad.l - pad.r, h = H - pad.t - pad.b, X = function (v) { return pad.l + v / full * w; }, Y = function (v) { return pad.t + h - v / full * h; }, i, d = M() === 'V' ? 1 : 2;
      ctx.font = '11px "Space Mono", monospace'; ctx.strokeStyle = '#d8d0bb'; ctx.fillStyle = '#4b5b63'; ctx.lineWidth = 1;
      for (i = 0; i <= 5; i++) { var v = full * i / 5; ctx.beginPath(); ctx.moveTo(X(v), pad.t); ctx.lineTo(X(v), pad.t + h); ctx.stroke(); ctx.beginPath(); ctx.moveTo(pad.l, Y(v)); ctx.lineTo(pad.l + w, Y(v)); ctx.stroke(); ctx.textAlign = 'center'; ctx.fillText(fmt(v, d), X(v), pad.t + h + 14); ctx.textAlign = 'right'; ctx.fillText(fmt(v, d), pad.l - 5, Y(v) + 4); }
      ctx.strokeStyle = '#0c1c27'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, pad.t + h); ctx.lineTo(pad.l + w, pad.t + h); ctx.stroke();
      ctx.setLineDash([5, 4]); ctx.strokeStyle = '#9aa7ad'; ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(full), Y(full)); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#0c1c27'; ctx.textAlign = 'center'; ctx.fillText('standard meter (' + unit() + ')', pad.l + w / 2, H - 5);
      ctx.save(); ctx.translate(12, pad.t + h / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('converted meter (' + unit() + ')', 0, 0); ctx.restore();
      ctx.fillStyle = '#e8511d'; state.rows[M()].forEach(function (r) { ctx.beginPath(); ctx.arc(X(r.std), Y(conv(r.th)), 4.5, 0, Math.PI * 2); ctx.fill(); });
    }
    function defaultStatus() {
      if (!state.ok[M()]) return { kind: '', text: 'Step 1: work out I_g and ' + (M() === 'V' ? 'the series resistance R' : 'the shunt S and the wire length') + ' from the given data, type them in and press “Check my calculation”.' };
      var th = Conv.readTheta(theta());
      if (th === null) return { kind: 'warn', text: 'Off scale: the galvanometer is overloaded. ' + (M() === 'V' ? 'Set R to your calculated value (step 2).' : 'Set the shunt wire to your calculated length (step 2).') };
      if (!state.rows[M()].length) return { kind: '', text: 'Step 2: set ' + (M() === 'V' ? 'the resistance box to R' : 'the shunt wire to the calculated length') + '. Step 3: move the rheostat and record the standard meter and the galvanometer together.' };
      return { kind: '', text: state.rows[M()].length + ' readings. Spread them over the whole range.' };
    }
    function render() {
      var V = M() === 'V';
      Array.prototype.forEach.call(document.querySelectorAll('#modeChips [data-m]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-m') === M())); });
      $('setH').textContent = V ? 'Step 2: set the resistance box R (series)' : 'Step 2: set the shunt wire length l (parallel)';
      $('setSl').max = V ? Conv.R_MAX : Conv.L_MAX; $('setSl').step = V ? 1 : 0.1; $('setSl').value = state.set[M()];
      $('setNudge').innerHTML = (V ? [-1000, -100, -10, -1, 1, 10, 100, 1000] : [-1, -0.1, 0.1, 1]).map(function (n) { return '<button type="button" class="btn sm" data-n="' + n + '">' + (n > 0 ? '+' : '−') + Math.abs(n) + '</button>'; }).join('');
      $('setVal').textContent = V ? state.set.V + ' Ω' : fmt(state.set.A, 1) + ' cm  (S = ' + fmt(state.set.A * Conv.RW, 4) + ' Ω)';
      $('appH').textContent = V ? 'Step 3: applied voltage (rheostat)' : 'Step 3: circuit current (rheostat)';
      $('appSl').max = range(); $('appSl').step = V ? 0.01 : 0.001; $('appSl').value = state.app[M()];
      var th = Conv.readTheta(theta());
      $('meters').innerHTML = '<div><b>standard</b><span>' + fmt(state.app[M()], V ? 2 : 3) + ' ' + unit() + '</span></div><div><b>galvanometer</b><span>' + (th === null ? 'off' : fmt(th, 1) + ' div') + '</span></div><div><b>converted</b><span>' + (th === null ? '—' : fmt(conv(th), V ? 2 : 3) + ' ' + unit()) + '</span></div>';
      Array.prototype.forEach.call(document.querySelectorAll('#steps li'), function (li) { var k = +li.getAttribute('data-s'); var has = state.rows[M()].length > 0; li.className = k === 0 ? (state.ok[M()] ? 'done' : 'now') : k === 1 ? (has ? 'done' : state.ok[M()] ? 'now' : '') : (state.ok[M()] && has ? 'now' : ''); });
      var st = state.msg || defaultStatus(); $('status').textContent = st.text; $('status').className = 'status' + (st.kind ? ' ' + st.kind : '');
      drawCirc(); renderTable(); renderGraph();
    }
    window.addEventListener('resize', renderGraph);
    given(); render();
  })();
}
