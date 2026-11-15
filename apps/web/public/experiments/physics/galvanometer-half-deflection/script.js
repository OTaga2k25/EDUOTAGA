/* Galvanometer: resistance by the half-deflection method and figure of merit
 * Physics core is kept free of DOM code so it can be tested in Node. */

var Galvo = (function () {
  'use strict';

  var E = 2.0;          // accumulator emf, V (given to the student)
  var R_INT = 0.2;      // its internal resistance, ohm
  var FS = 30;          // full scale, divisions on each side of zero
  var RES = 0.1;        // the scale (with mirror) is read to 0.1 division
  var R_MAX = 10000, S_MAX = 400;

  function mulberry32(a) {
    return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function round(v, d) { var p = Math.pow(10, d); return Math.round(v * p) / p; }

  /** A hidden galvanometer: resistance G (ohm) and figure of merit k (A per division). */
  function newGalvo(seed) {
    var r = mulberry32(seed);
    return { seed: seed, G: Math.round(40 + r() * 110), k: round((1.2 + r() * 1.6) * 1e-5, 8) };
  }
  /** Current through the galvanometer (A). k1: main key, k2: shunt key, R: series box, S: shunt box. */
  function galvoCurrent(g, R, S, k1, k2) {
    if (!k1) return 0;
    if (k2) {
      if (S <= 0) return 0;                                     // the shunt shorts the galvanometer
      var rp = (g.G * S) / (g.G + S), I = E / (R + rp + R_INT);
      return I * S / (g.G + S);
    }
    return E / (R + g.G + R_INT);
  }
  function deflection(g, R, S, k1, k2) { return galvoCurrent(g, R, S, k1, k2) / g.k; }
  /** The reading the student sees, to 0.1 division; null when the needle is off the scale. */
  function reading(g, R, S, k1, k2) {
    var t = deflection(g, R, S, k1, k2);
    if (t > FS) return null;
    return round(t, 1);
  }
  var Gfrom = function (R, S) { return R > S ? (R * S) / (R - S) : null; };
  var kFrom = function (R, G, theta) { return E / ((R + G) * theta); };
  /** Shunt that exactly halves the deflection for a given R (for the reveal and tests). */
  function exactS(g, R) { return (R * g.G) / (R + g.G); }   // from G = RS/(R - S); the battery resistance is negligible

  return { E: E, R_INT: R_INT, FS: FS, RES: RES, R_MAX: R_MAX, S_MAX: S_MAX, round: round, mulberry32: mulberry32,
    newGalvo: newGalvo, galvoCurrent: galvoCurrent, deflection: deflection, reading: reading, Gfrom: Gfrom, kFrom: kFrom, exactS: exactS };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = Galvo; }

/* ------------------------------------------------------------------ */
/* UI                                                                  */
/* ------------------------------------------------------------------ */
if (typeof document !== 'undefined') {
  (function () {
    'use strict';
    var NS = 'http://www.w3.org/2000/svg';
    var $ = function (id) { return document.getElementById(id); };
    function fmt(v, d) { return Number(v).toFixed(d); }
    var state = { g: Galvo.newGalvo((Math.random() * 1e9) | 0), k1: false, k2: false, R: 5000, S: 100, pending: null, rows: [], msg: null, revealed: false };
    function say(kind, text) { state.msg = { kind: kind, text: text }; }
    function theta() { return Galvo.reading(state.g, state.R, state.S, state.k1, state.k2); }

    (function scale() {
      var g = $('gScale'), cx = 650, cy = 180, r0 = 62, d, a, l, t;
      for (d = -30; d <= 30; d++) {
        a = (d / 30) * (Math.PI / 3);
        var len = d % 10 === 0 ? 12 : d % 5 === 0 ? 8 : 4;
        l = document.createElementNS(NS, 'line');
        l.setAttribute('x1', cx + r0 * Math.sin(a)); l.setAttribute('y1', cy - r0 * Math.cos(a));
        l.setAttribute('x2', cx + (r0 - len) * Math.sin(a)); l.setAttribute('y2', cy - (r0 - len) * Math.cos(a));
        l.setAttribute('class', 'gscale' + (d % 5 === 0 ? ' five' : '')); g.appendChild(l);
        if (d % 10 === 0) { t = document.createElementNS(NS, 'text'); t.setAttribute('x', cx + (r0 + 9) * Math.sin(a)); t.setAttribute('y', cy - (r0 + 9) * Math.cos(a) + 4); t.setAttribute('text-anchor', 'middle'); t.setAttribute('class', 'gnum'); t.textContent = String(Math.abs(d)); g.appendChild(t); }
      }
    })();

    function setR(v) {
      var nv = Math.max(0, Math.min(Galvo.R_MAX, Math.round(v / 10) * 10));
      if (state.pending && nv !== state.pending.R) { state.pending = null; say('warn', 'R was changed, so the recorded θ no longer applies. Open K₂, and record θ again for this R.'); }
      else state.msg = null;
      state.R = nv; render();
    }
    function setS(v) { state.S = Math.max(0, Math.min(Galvo.S_MAX, Math.round(v))); state.msg = null; render(); }
    $('rSl').addEventListener('input', function (e) { setR(parseFloat(e.target.value)); });
    $('sSl').addEventListener('input', function (e) { setS(parseFloat(e.target.value)); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-r]'), function (b) { b.addEventListener('click', function () { setR(state.R + parseFloat(b.getAttribute('data-r'))); }); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-s]'), function (b) { b.addEventListener('click', function () { setS(state.S + parseFloat(b.getAttribute('data-s'))); }); });
    $('k1Btn').addEventListener('click', function () {
      if (!state.k1 && state.R < 1000) { say('err', 'R is only ' + state.R + ' Ω. With so little resistance the current would be large enough to damage the galvanometer. Set R to a few thousand ohms before closing K₁.'); return render(); }
      state.k1 = !state.k1; state.msg = null; render();
    });
    $('k2Btn').addEventListener('click', function () {
      if (!state.k2 && !state.pending) { say('err', 'First record the full deflection θ with K₂ open. Only then close K₂ to find the half deflection.'); return render(); }
      state.k2 = !state.k2; state.msg = null; render();
    });

    $('recordBtn').addEventListener('click', function () {
      var th = theta();
      if (!state.k1) { say('err', 'Close the main key K₁ first, so that current flows through the galvanometer.'); return render(); }
      if (th === null) { say('err', 'The pointer is off the scale. Increase R to reduce the current.'); return render(); }
      if (!state.k2) {
        if (th < 10) { say('err', 'θ = ' + fmt(th, 1) + ' div is too small to measure accurately. Reduce R until the deflection is large (20 to 30 div).'); return render(); }
        state.pending = { R: state.R, th: th }; state.revealed = false;
        say('good', 'Recorded θ = ' + fmt(th, 1) + ' div for R = ' + state.R + ' Ω. Now close K₂ and adjust S until the deflection is θ/2 = ' + fmt(th / 2, 2) + ' div. Do not change R.');
        return render();
      }
      if (!state.pending) { say('err', 'Record the full deflection with K₂ open first.'); return render(); }
      var half = state.pending.th / 2, diff = th - half;
      if (Math.abs(diff) > 0.1 + 1e-9) {
        say('err', 'The deflection is ' + fmt(th, 1) + ' div, but half of θ is ' + fmt(half, 2) + ' div. ' + (diff > 0 ? 'Decrease S: a smaller shunt takes more current away from the galvanometer.' : 'Increase S: a larger shunt takes less current away from the galvanometer.'));
        return render();
      }
      var row = { R: state.pending.R, th: state.pending.th, S: state.S };
      state.rows.push(row); state.pending = null; state.k2 = false; state.revealed = false;
      var G = Galvo.Gfrom(row.R, row.S);
      say('good', 'Recorded S = ' + row.S + ' Ω, so G = RS/(R − S) = ' + fmt(G, 1) + ' Ω. K₂ is now open again. Change R and repeat (take at least 4 sets).');
      render();
    });
    $('delLast').addEventListener('click', function () { state.rows.pop(); state.revealed = false; state.msg = null; render(); });
    $('newG').addEventListener('click', function () { state.g = Galvo.newGalvo((Math.random() * 1e9) | 0); state.rows = []; state.pending = null; state.k2 = false; state.revealed = false; say('warn', 'A new unknown galvanometer is connected. Start again.'); render(); });
    $('reveal').addEventListener('click', function () { state.revealed = true; render(); });

    function defaultStatus(th) {
      if (!state.k1) return { kind: '', text: 'Step 1: make sure R is a few thousand ohms, then close K₁ (main key).' };
      if (th === null) return { kind: 'warn', text: 'The pointer is off the scale. Increase R.' };
      if (!state.k2) {
        if (state.pending) return { kind: '', text: 'θ is recorded. Close K₂ to connect the shunt S.' };
        if (th < 20) return { kind: '', text: 'Deflection ' + fmt(th, 1) + ' div. Reduce R a little for a larger deflection (20 to 30 div), then record θ.' };
        return { kind: '', text: 'Deflection ' + fmt(th, 1) + ' div: a good, large deflection. Record θ.' };
      }
      var half = state.pending ? state.pending.th / 2 : null;
      if (half === null) return { kind: '', text: 'Open K₂ and record the full deflection first.' };
      if (Math.abs(th - half) <= 0.1 + 1e-9) return { kind: 'good', text: 'The deflection is now half of θ. Record S.' };
      return { kind: '', text: 'Adjust S until the deflection is ' + fmt(half, 2) + ' div (now ' + fmt(th, 1) + ' div).' };
    }
    function render() {
      var th = theta();
      $('k1Btn').setAttribute('aria-pressed', String(state.k1)); $('k2Btn').setAttribute('aria-pressed', String(state.k2));
      $('k1lever').setAttribute('transform', state.k1 ? '' : 'rotate(-28 110 60)');
      $('k2lever').setAttribute('transform', state.k2 ? '' : 'rotate(-28 720 290)');
      $('rSl').value = state.R; $('sSl').value = state.S;
      $('rVal').textContent = state.R + ' Ω'; $('sVal').textContent = state.S + ' Ω';
      $('rLabel').textContent = 'R = ' + state.R + ' Ω'; $('sLabel').textContent = 'S = ' + state.S + ' Ω';
      var shown = th === null ? Galvo.FS + 2 : th;
      $('gNeedle').setAttribute('transform', 'rotate(' + (shown / Galvo.FS) * 60 + ' 650 180)');
      $('gBody').setAttribute('class', 'meter' + (th === null ? ' off' : ''));
      $('gDigi').textContent = th === null ? 'off scale!' : 'θ = ' + fmt(th, 1) + ' div';
      $('thetaBig').textContent = th === null ? 'off scale' : fmt(th, 1) + ' div';
      $('targetLine').textContent = state.pending ? 'Recorded θ = ' + fmt(state.pending.th, 1) + ' div · half = ' + fmt(state.pending.th / 2, 2) + ' div' : '';
      $('recordBtn').textContent = state.k2 ? 'Record S (half deflection)' : 'Record θ';
      $('keyHint').textContent = state.k2 ? 'K₂ closed: the shunt S is across the galvanometer.' : state.k1 ? 'K₁ closed: current flows through R and G.' : 'Both keys open.';
      Array.prototype.forEach.call(document.querySelectorAll('#steps li'), function (li) { li.className = (+li.getAttribute('data-s') === (state.pending ? 1 : 0)) ? 'now' : ''; });
      var st = state.msg || defaultStatus(th); $('status').textContent = st.text; $('status').className = 'status' + (st.kind ? ' ' + st.kind : '');
      renderTable();
    }

    function derived() { return state.rows.map(function (r) { var G = Galvo.Gfrom(r.R, r.S); return { R: r.R, th: r.th, S: r.S, G: G, k: Galvo.kFrom(r.R, G, r.th) }; }); }
    function mean(a) { return a.reduce(function (x, y) { return x + y; }, 0) / a.length; }
    function readingChecks() {
      var d = derived(), n = d.length, out = [];
      if (!n) return out;
      out.push(n >= 4 ? { k: 'ok', t: n + ' sets with different R.' } : { k: 'warn', t: 'Only ' + n + ' set' + (n > 1 ? 's' : '') + '. Take at least 4 with different values of R and use the mean of G and k.' });
      var small = d.filter(function (r) { return r.th < 20; });
      if (small.length) out.push({ k: 'warn', t: 'θ was below 20 div for R = ' + small.map(function (r) { return r.R + ' Ω'; }).join(', ') + '. A small deflection makes the 0.1 div reading error a larger fraction. Use R values that give 20–30 div.' });
      else out.push({ k: 'ok', t: 'All deflections are large (20 div or more).' });
      if (n >= 3) {
        var gs = d.map(function (r) { return r.G; }), worst = -1, dev = 0;
        gs.forEach(function (x, k) { var o = gs.filter(function (_, j) { return j !== k; }).sort(function (a, b) { return a - b; }), med = o[Math.floor(o.length / 2)], e = Math.abs(x - med) / med; if (e > dev) { dev = e; worst = k; } });
        if (dev > 0.05) out.push({ k: 'warn', t: 'The set with R = ' + d[worst].R + ' Ω gives G = ' + fmt(gs[worst], 1) + ' Ω, ' + fmt(dev * 100, 0) + '% away from the others. Repeat it, adjusting S carefully to the exact half deflection.' });
        else out.push({ k: 'ok', t: 'Your values of G agree within ' + fmt((Math.max.apply(null, gs) - Math.min.apply(null, gs)) / mean(gs) * 100, 1) + '%.' });
      }
      var last = d[n - 1];
      out.push({ k: 'tip', t: 'For R = ' + last.R + ' Ω, G = ' + fmt(last.G, 1) + ' Ω while S = ' + last.S + ' Ω: because R is much larger than S, G ≈ S (they differ by only ' + fmt((last.G - last.S) / last.G * 100, 1) + '%).' });
      return out;
    }
    function renderTable() {
      var body = $('obsBody'), d = derived(); body.innerHTML = '';
      if (!d.length) body.innerHTML = '<tr class="empty"><td colspan="6">No readings yet</td></tr>';
      d.forEach(function (r) {
        var tr = document.createElement('tr');
        [String(r.R), fmt(r.th, 1), fmt(r.th / 2, 2), String(r.S), fmt(r.G, 1), fmt(r.k * 1e6, 2)].forEach(function (v) { var td = document.createElement('td'); td.textContent = v; tr.appendChild(td); });
        body.appendChild(tr);
      });
      var mG = d.length ? mean(d.map(function (r) { return r.G; })) : null, mk = d.length ? mean(d.map(function (r) { return r.k; })) : null;
      $('resultLine').textContent = mG === null ? '' : 'Resistance of the galvanometer G = ' + fmt(mG, 1) + ' Ω; figure of merit k = ' + fmt(mk * 1e6, 2) + ' × 10⁻⁶ A/div (mean of ' + d.length + ' set' + (d.length > 1 ? 's' : '') + ').';
      var list = $('checks'), items = readingChecks(); list.innerHTML = '';
      items.forEach(function (c) { var li = document.createElement('li'); li.className = c.k; li.textContent = c.t; list.appendChild(li); });
      $('checksH').hidden = !items.length;
      var rv = $('revealBox');
      if (state.revealed) {
        rv.hidden = false;
        if (mG === null) rv.textContent = 'Not yet: record θ and then the half-deflection S for at least one value of R, then check your answer.';
        else {
          var eG = Math.abs(mG - state.g.G) / state.g.G * 100, ek = Math.abs(mk - state.g.k) / state.g.k * 100;
          rv.textContent = 'Actual G = ' + state.g.G + ' Ω (yours ' + fmt(mG, 1) + ' Ω, error ' + fmt(eG, 1) + '%). Actual figure of merit k = ' + fmt(state.g.k * 1e6, 2) + ' × 10⁻⁶ A/div (yours ' + fmt(mk * 1e6, 2) + ', error ' + fmt(ek, 1) + '%).' +
            (d.length < 4 ? ' With fewer than 4 sets the result is not yet reliable.' : eG > 3 ? ' To improve G, adjust S more carefully so the deflection is exactly θ/2.' : ' Well done: that is within normal laboratory accuracy.');
        }
      } else rv.hidden = true;
    }
    render();
  })();
}
