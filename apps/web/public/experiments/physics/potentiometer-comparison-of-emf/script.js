/* Potentiometer: comparing the emfs of two cells
 * Physics core is kept free of DOM code so it can be tested in Node. */

var Pot = (function () {
  'use strict';

  var L = 1000;        // wire length, cm
  var RW = 10;         // wire resistance, ohm
  var ED = 2.0;        // driver cell emf, V
  var RD = 0.2;        // driver cell internal resistance, ohm
  var NULL_TOL = 1.0;  // |deflection| below this counts as a null
  // Damped galvanometer: log-compressed so the needle moves gradually while the
  // jockey is far from balance, but is still sharp near the null (about 1 division
  // per 0.2 mV, i.e. roughly 8 divisions per cm).
  var DEFL_C = 4.7;
  var DEFL_S = 0.00094; // volts

  function round1(v) { return Math.round(v * 10) / 10; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  /** Potential gradient along the wire, V per cm, for a given rheostat setting. */
  function gradient(rh) {
    var current = ED / (RW + rh + RD);
    return (current * RW) / L;
  }

  /** Two unknown cells: E1 1.30-1.55 V, E2 0.90-1.25 V, always at least 0.1 V apart. */
  function newCells() {
    var e1, e2;
    do {
      e1 = Math.round((1.3 + Math.random() * 0.25) * 100) / 100;
      e2 = Math.round((0.9 + Math.random() * 0.35) * 100) / 100;
    } while (Math.abs(e1 - e2) < 0.1);
    return { E1: e1, E2: e2, seed: Math.random() * 1000 };
  }

  function emf(cells, which) { return which === 2 ? cells.E2 : cells.E1; }

  /**
   * Small, repeatable reading error (up to about +/-0.6 cm of balance length) for each
   * measurement. It is fixed per cell and per rheostat setting, so the needle never
   * jitters, but real-looking scatter appears in the readings.
   */
  function readingOffset(cells, which, rh) {
    var s = Math.sin((which * 7.31 + rh * 3.17 + 1) * 12.9898 + cells.seed * 78.233) * 43758.5453;
    var frac = s - Math.floor(s);
    return (frac - 0.5) * 0.002; // volts
  }

  /** The voltage the potentiometer actually balances against, including reading error. */
  function effectiveEmf(cells, which, rh) {
    return emf(cells, which) + readingOffset(cells, which, rh);
  }

  /** Galvanometer deflection in divisions: positive when the wire potential exceeds the cell. */
  function deflection(k, x, v) {
    var dv = k * x - v;
    var mag = DEFL_C * Math.log(1 + Math.abs(dv) / DEFL_S);
    return clamp(dv < 0 ? -mag : mag, -40, 40);
  }

  /** Where a careful student would find the null point, to 0.1 cm. */
  function nullPoint(k, v) { return round1(v / k); }

  /** Least-squares line through the origin: y = m x. */
  function slopeThroughOrigin(points) {
    var sxy = 0, sxx = 0, i;
    for (i = 0; i < points.length; i++) {
      sxy += points[i].x * points[i].y;
      sxx += points[i].x * points[i].x;
    }
    return sxx === 0 ? 0 : sxy / sxx;
  }

  return {
    L: L, RW: RW, ED: ED, NULL_TOL: NULL_TOL,
    round1: round1, clamp: clamp, gradient: gradient, newCells: newCells, emf: emf,
    effectiveEmf: effectiveEmf, deflection: deflection, nullPoint: nullPoint,
    slopeThroughOrigin: slopeThroughOrigin
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Pot;
}

/* ------------------------------------------------------------------ */
/* UI                                                                  */
/* ------------------------------------------------------------------ */
if (typeof document !== 'undefined') {
  (function () {
    'use strict';

    var X0 = 60, X1 = 840, SVG_W = 900;     // wire end points in SVG units
    var SPAN = X1 - X0;
    var GAL = { x: 430, y: 80 };
    var PIVOT = { x: 310, y: 80 };
    var CONTACT = { 1: { x: 240, y: 45 }, 2: { x: 240, y: 115 } };

    var state = {
      rh: 2,
      x: 450,
      which: 1,          // which cell the two-way key connects
      cells: Pot.newCells(),
      rows: [],          // { rh, l1, l2 } sorted by rh
      msg: null,         // transient message { kind, text }
      revealed: false
    };

    var $ = function (id) { return document.getElementById(id); };
    var svg = $('apparatus');
    var NS = 'http://www.w3.org/2000/svg';

    /* ---------- static drawing: scale ticks and galvanometer scale ---------- */
    (function drawStatic() {
      var g = $('ticks'), i, px, len, line, t;
      for (i = 0; i <= 100; i++) {
        px = X0 + (i * SPAN) / 100;
        len = i % 10 === 0 ? 13 : i % 5 === 0 ? 9 : 5;
        line = document.createElementNS(NS, 'line');
        line.setAttribute('x1', px); line.setAttribute('x2', px);
        line.setAttribute('y1', 224); line.setAttribute('y2', 224 + len);
        line.setAttribute('class', 'tick' + (i % 10 === 0 ? '' : ' minor'));
        g.appendChild(line);
        if (i % 10 === 0) {
          t = document.createElementNS(NS, 'text');
          t.setAttribute('x', px); t.setAttribute('y', 253);
          t.setAttribute('class', 'lbl num'); t.setAttribute('text-anchor', 'middle');
          t.textContent = String(i * 10);
          g.appendChild(t);
        }
      }
      var gs = $('galScale'), a;
      [-60, -30, 0, 30, 60].forEach(function (deg) {
        a = (deg * Math.PI) / 180;
        var l = document.createElementNS(NS, 'line');
        l.setAttribute('x1', GAL.x + 27 * Math.sin(a)); l.setAttribute('y1', GAL.y - 27 * Math.cos(a));
        l.setAttribute('x2', GAL.x + 32 * Math.sin(a)); l.setAttribute('y2', GAL.y - 32 * Math.cos(a));
        l.setAttribute('class', 'gtick');
        gs.appendChild(l);
      });
    })();

    /* ---------- helpers ---------- */
    function fmt(v, d) { return Number(v).toFixed(d); }
    function say(kind, text) { state.msg = { kind: kind, text: text }; }
    function sub(n) { return n === 1 ? '₁' : '₂'; }

    function current() {
      var k = Pot.gradient(state.rh);
      var v = Pot.effectiveEmf(state.cells, state.which, state.rh);
      return { k: k, v: v, vw: k * Pot.L, defl: Pot.deflection(k, state.x, v) };
    }

    function findRow(rh) {
      for (var i = 0; i < state.rows.length; i++) if (state.rows[i].rh === rh) return state.rows[i];
      return null;
    }

    function completeRows() {
      return state.rows.filter(function (r) { return r.l1 !== null && r.l2 !== null; })
        .map(function (r) { return { rh: r.rh, l1: r.l1, l2: r.l2, ratio: r.l1 / r.l2 }; });
    }

    function meanRatio() {
      var rows = completeRows();
      if (!rows.length) return null;
      return rows.reduce(function (a, r) { return a + r.ratio; }, 0) / rows.length;
    }

    /* ---------- actions ---------- */
    function setX(v) {
      state.x = Pot.round1(Pot.clamp(v, 0, Pot.L)); state.msg = null; render();
    }

    function setWhich(n) { state.which = n; state.msg = null; render(); }

    function record() {
      var c = current();
      if (Math.abs(c.defl) >= Pot.NULL_TOL) {
        say('err', 'The galvanometer is not at zero (' + fmt(c.defl, 1) + ' div). Fine-tune the jockey and try again.');
        render(); return;
      }
      var row = findRow(state.rh);
      if (!row) {
        row = { rh: state.rh, l1: null, l2: null };
        state.rows.push(row);
        state.rows.sort(function (a, b) { return a.rh - b.rh; });
      }
      if (state.which === 1) row.l1 = state.x; else row.l2 = state.x;
      state.revealed = false;
      var other = state.which === 1 ? 2 : 1;
      if (row.l1 !== null && row.l2 !== null) {
        say('good', 'Set complete at Rh = ' + fmt(state.rh, 1) + ' Ω: E₁/E₂ = l₁/l₂ = ' +
          fmt(row.l1 / row.l2, 3) + '. Change the rheostat and repeat (take at least 3 sets).');
      } else {
        say('good', 'Recorded l' + sub(state.which) + ' = ' + fmt(state.x, 1) + ' cm. Now switch the two-way key to E' +
          sub(other) + ' and find l' + sub(other) + ' at the same rheostat setting.');
      }
      render();
    }

    /* ---------- events ---------- */
    $('rh').addEventListener('input', function (e) {
      state.rh = parseFloat(e.target.value); state.msg = null; render();
    });
    $('jock').addEventListener('input', function (e) { setX(parseFloat(e.target.value)); });
    Array.prototype.forEach.call(document.querySelectorAll('.nudge [data-d]'), function (b) {
      b.addEventListener('click', function () { setX(state.x + parseFloat(b.getAttribute('data-d'))); });
    });
    $('keyE1').addEventListener('click', function () { setWhich(1); });
    $('keyE2').addEventListener('click', function () { setWhich(2); });
    $('recordBtn').addEventListener('click', record);

    $('delLast').addEventListener('click', function () { state.rows.pop(); state.revealed = false; state.msg = null; render(); });
    $('resetAll').addEventListener('click', function () {
      state.rows = []; state.revealed = false; say('warn', 'Readings cleared.'); render();
    });
    $('newCells').addEventListener('click', function () {
      state.cells = Pot.newCells(); state.rows = []; state.revealed = false; state.which = 1;
      say('warn', 'Two new unknown cells are connected. Start again with E₁.'); render();
    });
    $('reveal').addEventListener('click', function () { state.revealed = true; render(); });

    /* drag the jockey along the wire */
    var layer = $('dragLayer'), dragging = false;
    function fromPointer(ev) {
      var rect = svg.getBoundingClientRect();
      var sx = ((ev.clientX - rect.left) * SVG_W) / rect.width;
      setX(((sx - X0) / SPAN) * Pot.L);
    }
    layer.addEventListener('pointerdown', function (ev) {
      dragging = true; layer.setPointerCapture(ev.pointerId); fromPointer(ev); ev.preventDefault();
    });
    layer.addEventListener('pointermove', function (ev) { if (dragging) fromPointer(ev); });
    ['pointerup', 'pointercancel'].forEach(function (n) {
      layer.addEventListener(n, function () { dragging = false; });
    });

    /* ---------- rendering ---------- */
    function defaultStatus(c) {
      var n = state.which, other = n === 1 ? 2 : 1;
      if (c.vw < c.v + 0.01) {
        return { kind: 'warn', text: 'The potential drop across the wire (' + fmt(c.vw, 2) +
          ' V) is not larger than the emf of E' + sub(n) + ', so no balance point exists. Reduce the rheostat resistance.' };
      }
      var row = findRow(state.rh);
      var have = row ? (n === 1 ? row.l1 : row.l2) : null;
      var haveOther = row ? (other === 1 ? row.l1 : row.l2) : null;
      if (have === null) {
        if (!row && !state.rows.length) {
          return { kind: '', text: 'Step 1: with E₁ connected, slide the jockey until the galvanometer shows zero, then press Record l₁. Then switch the key to E₂ for l₂.' };
        }
        return { kind: '', text: 'Rh = ' + fmt(state.rh, 1) + ' Ω, E' + sub(n) +
          ' connected: slide the jockey to the null point and press Record l' + sub(n) + '.' };
      }
      if (haveOther === null) {
        return { kind: '', text: 'l' + sub(n) + ' = ' + fmt(have, 1) + ' cm recorded. Switch the two-way key to E' + sub(other) +
          ' and record l' + sub(other) + ' at this same rheostat setting.' };
      }
      return { kind: '', text: 'This set is complete. Change the rheostat for another set (take at least 3).' };
    }

    function renderApparatus(c) {
      var px = X0 + (state.x / Pot.L) * SPAN;
      $('jockey').setAttribute('transform', 'translate(' + px + ',0)');
      var lead = $('lead2jockey');
      lead.setAttribute('x2', px); lead.setAttribute('y2', 172);
      var tag = $('lengthTag');
      tag.setAttribute('x', Pot.clamp(px, 90, 810));
      tag.textContent = fmt(state.x, 1) + ' cm';
      $('needle').setAttribute('transform', 'rotate(' + (c.defl * 1.5) + ' ' + GAL.x + ' ' + GAL.y + ')');
      var atNull = Math.abs(c.defl) < Pot.NULL_TOL;
      var galHint = $('galHint');
      $('galCircle').setAttribute('class', 'gal' + (atNull ? ' null' : ''));
      galHint.setAttribute('class', 'lbl galhint' + (atNull ? ' null' : ''));
      galHint.textContent = atNull ? '● null point: record now'
        : (c.defl < 0 ? '→ needle left: move jockey right' : '← needle right: move jockey left');
      var ct = CONTACT[state.which], lever = $('keyLever');
      lever.setAttribute('x1', PIVOT.x); lever.setAttribute('y1', PIVOT.y);
      lever.setAttribute('x2', ct.x); lever.setAttribute('y2', ct.y);
      $('keyLabel').textContent = 'E' + sub(state.which) + ' connected';
      $('rhLabel').textContent = 'Rheostat Rh = ' + fmt(state.rh, 1) + ' Ω';
    }

    function renderControls(c) {
      $('rhVal').textContent = fmt(state.rh, 1) + ' Ω';
      $('kVal').textContent = fmt(c.k * 1000, 3) + ' mV/cm';
      $('vwVal').textContent = fmt(c.vw, 2) + ' V';
      $('jock').value = state.x;
      $('xVal').textContent = fmt(state.x, 1);
      $('keyE1').setAttribute('aria-pressed', String(state.which === 1));
      $('keyE2').setAttribute('aria-pressed', String(state.which === 2));
      $('galDot').style.left = Pot.clamp(50 + (c.defl / 40) * 50, 3, 97) + '%';
      $('deflVal').textContent = fmt(c.defl, 1);
      var hint;
      if (Math.abs(c.defl) < Pot.NULL_TOL) hint = 'null point ✓';
      else if (c.defl > 0) hint = 'move the jockey towards A (left)';
      else hint = 'move the jockey towards B (right)';
      $('deflHint').textContent = hint;
      $('recordBtn').textContent = 'Record l' + sub(state.which) + ' (E' + sub(state.which) + ' connected)';

      var st = state.msg || defaultStatus(c);
      var el = $('status');
      el.textContent = st.text;
      el.className = 'status' + (st.kind ? ' ' + st.kind : '');
    }

    function renderChecks(items) {
      var list = $('checks'); list.innerHTML = '';
      items.forEach(function (c) { var li = document.createElement('li'); li.className = c.k; li.textContent = c.t; list.appendChild(li); });
      $('checksH').hidden = !items.length;
    }
    // Checks on the recorded readings, so the student knows what to improve
    function readingChecks() {
      var out = [], done = completeRows(), n = done.length;
      if (!state.rows.length) return out;
      var half = state.rows.filter(function (r) { return r.l1 === null || r.l2 === null; });
      if (half.length) out.push({ k: 'warn', t: 'Incomplete set' + (half.length > 1 ? 's' : '') + ' at Rh = ' + half.map(function (r) { return fmt(r.rh, 1) + ' Ω'; }).join(', ') + ': ' +
        half.map(function (r) { return r.l1 === null ? 'l₁ missing' : 'l₂ missing'; }).join(', ') + '. Keep the rheostat at the same value, switch the key to the other cell and find its balance length. Both lengths must use the same potential gradient.' });
      out.push(n >= 3 ? { k: 'ok', t: n + ' complete sets, each at a different rheostat setting.' } : { k: 'warn', t: (n ? 'Only ' + n + ' complete set' + (n > 1 ? 's' : '') : 'No complete set yet') + '. Take at least 3 sets at different rheostat settings; the ratio should come out the same each time.' });
      var short = state.rows.filter(function (r) { return (r.l1 !== null && r.l1 < Pot.L * 0.4) || (r.l2 !== null && r.l2 < Pot.L * 0.4); });
      if (short.length) out.push({ k: 'warn', t: 'Some balance lengths are shorter than ' + fmt(Pot.L * 0.4, 0) + ' cm, less than 40% of the wire (at Rh = ' + short.map(function (r) { return fmt(r.rh, 1) + ' Ω'; }).join(', ') + '). Short lengths have a larger percentage error. Use a larger rheostat resistance so the balance points move further along the wire.' });
      if (n >= 3) {
        var rs = done.map(function (r) { return r.l1 / r.l2; }), worst = -1, dev = 0, m = meanRatio();
        rs.forEach(function (x, k) { var o = rs.filter(function (_, j) { return j !== k; }).sort(function (a, b) { return a - b; }), med = o[Math.floor(o.length / 2)], d = Math.abs(x - med) / med; if (d > dev) { dev = d; worst = k; } });
        if (dev > 0.015) out.push({ k: 'warn', t: 'The set at Rh = ' + fmt(done[worst].rh, 1) + ' Ω gives E₁/E₂ = ' + fmt(rs[worst], 3) + ', ' + fmt(dev * 100, 1) + '% away from the others. Repeat that set carefully (same rheostat value, both cells).' });
        else out.push({ k: 'ok', t: 'Your ratios agree within ' + fmt((Math.max.apply(null, rs) - Math.min.apply(null, rs)) / m * 100, 1) + '%: the ratio does not depend on the potential gradient, as expected.' });
      }
      return out;
    }
    function renderTable() {
      var body = $('obsBody');
      body.innerHTML = '';
      if (!state.rows.length) {
        body.innerHTML = '<tr class="empty"><td colspan="4">No readings yet</td></tr>';
      } else {
        state.rows.forEach(function (r) {
          var tr = document.createElement('tr');
          var ratio = (r.l1 !== null && r.l2 !== null) ? fmt(r.l1 / r.l2, 3) : '—';
          tr.innerHTML = '<td>' + fmt(r.rh, 1) + '</td><td>' + (r.l1 === null ? '—' : fmt(r.l1, 1)) +
            '</td><td>' + (r.l2 === null ? '—' : fmt(r.l2, 1)) + '</td><td>' + ratio + '</td>';
          body.appendChild(tr);
        });
      }
      var mean = meanRatio(), n = completeRows().length;
      $('meanRatio').textContent = mean === null ? '—' : fmt(mean, 3);
      $('resultLine').innerHTML = mean === null ? '' :
        'Result: the ratio of the emfs of the two cells, E₁/E₂ = <b>' + fmt(mean, 3) +
        '</b> (mean of ' + n + ' set' + (n > 1 ? 's' : '') + ').';

      renderChecks(readingChecks());
      var box = $('revealBox');
      if (state.revealed) {
        if (mean === null) {
          box.innerHTML = 'Not yet: complete at least one set (l₁ with E₁ and l₂ with E₂ at the same rheostat setting) first, then check your answer.';
        } else {
          var tE1 = state.cells.E1, tE2 = state.cells.E2, truth = tE1 / tE2;
          var err = (Math.abs(mean - truth) / truth) * 100;
          box.innerHTML = 'Actual emfs: E₁ = <b>' + fmt(tE1, 2) + ' V</b>, E₂ = <b>' + fmt(tE2, 2) +
            ' V</b>, so E₁/E₂ = <b>' + fmt(truth, 3) + '</b>. Your mean = <b>' + fmt(mean, 3) +
            '</b>, an error of ' + fmt(err, 2) + '%.' + (n < 3 ? ' With only ' + n + ' set' + (n > 1 ? 's' : '') + ' this is not yet reliable: take at least 3.' : err > 1 ? ' To improve it, follow the checks above.' : ' Well done: that is within normal laboratory accuracy.');
        }
        box.hidden = false;
      } else { box.hidden = true; }
    }

    /** Round-number axis: returns the tick step and an axis maximum that is a multiple of it. */
    function niceAxis(maxV, n) {
      var raw = maxV / n;
      var mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
      var f = raw / mag;
      var nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
      var step = parseFloat((nf * mag).toPrecision(6));
      return { step: step, max: parseFloat((Math.ceil(maxV / step - 1e-9) * step).toPrecision(6)) };
    }
    function decimalsOf(step) {
      var s = String(step), i = s.indexOf('.');
      return i < 0 ? 0 : Math.min(4, s.length - i - 1);
    }

    var canvas = $('graph');
    function renderGraph() {
      var dpr = window.devicePixelRatio || 1;
      var cssW = canvas.clientWidth || 640;
      var cssH = Math.round(cssW * 0.6);
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      var ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);

      var rows = completeRows();
      var pts = rows.map(function (r) { return { x: r.l2, y: r.l1 }; });
      var maxX = pts.length ? Math.max.apply(null, pts.map(function (p) { return p.x; })) * 1.1 : 1000;
      var maxY = pts.length ? Math.max.apply(null, pts.map(function (p) { return p.y; })) * 1.1 : 1000;
      var ax = niceAxis(maxX, 5), ay = niceAxis(maxY, 5);
      maxX = ax.max; maxY = ay.max;

      var pad = { l: 58, r: 16, t: 14, b: 44 };
      var w = cssW - pad.l - pad.r, h = cssH - pad.t - pad.b;
      function sx(v) { return pad.l + (v / maxX) * w; }
      function sy(v) { return pad.t + h - (v / maxY) * h; }

      ctx.font = '12px "Space Mono", monospace';
      ctx.strokeStyle = '#d8d0bb'; ctx.fillStyle = '#4b5b63'; ctx.lineWidth = 1;
      var i, v;
      var nx = Math.round(maxX / ax.step), ny = Math.round(maxY / ay.step);
      var dx = decimalsOf(ax.step), dy = decimalsOf(ay.step);
      for (i = 0; i <= nx; i++) {
        v = i * ax.step;
        ctx.beginPath(); ctx.moveTo(sx(v), pad.t); ctx.lineTo(sx(v), pad.t + h); ctx.stroke();
        ctx.textAlign = 'center'; ctx.fillText(v.toFixed(dx), sx(v), pad.t + h + 16);
      }
      for (i = 0; i <= ny; i++) {
        v = i * ay.step;
        ctx.beginPath(); ctx.moveTo(pad.l, sy(v)); ctx.lineTo(pad.l + w, sy(v)); ctx.stroke();
        ctx.textAlign = 'right'; ctx.fillText(v.toFixed(dy), pad.l - 6, sy(v) + 4);
      }
      ctx.strokeStyle = '#0c1c27'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, pad.t + h); ctx.lineTo(pad.l + w, pad.t + h); ctx.stroke();

      ctx.fillStyle = '#0c1c27'; ctx.textAlign = 'center';
      ctx.fillText('l₂  (cm)', pad.l + w / 2, cssH - 6);
      ctx.save(); ctx.translate(13, pad.t + h / 2); ctx.rotate(-Math.PI / 2);
      ctx.fillText('l₁  (cm)', 0, 0); ctx.restore();

      var slopeLine = $('slopeLine');
      if (pts.length >= 2) {
        var m = Pot.slopeThroughOrigin(pts);
        var xEnd = Math.min(maxX, maxY / m);
        ctx.strokeStyle = '#e8511d'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(sx(0), sy(0)); ctx.lineTo(sx(xEnd), sy(m * xEnd)); ctx.stroke();
        slopeLine.textContent = 'Best-fit slope = E₁/E₂ = ' + fmt(m, 3);
      } else {
        slopeLine.textContent = 'Complete at least 2 sets to see the best-fit line.';
      }
      ctx.fillStyle = '#12a0a0';
      pts.forEach(function (p) {
        ctx.beginPath(); ctx.arc(sx(p.x), sy(p.y), 5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
      });
    }

    function render() {
      var c = current();
      renderApparatus(c);
      renderControls(c);
      renderTable();
      renderGraph();
    }

    window.addEventListener('resize', renderGraph);
    render();
  })();
}
