/* Potentiometer: internal resistance of a cell
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
  // per 0.2 mV, i.e. roughly 8 divisions per cm). The compression stands in for the
  // protective series resistance a student uses while searching for the balance point.
  var DEFL_C = 4.7;
  var DEFL_S = 0.00094; // volts

  function round1(v) { return Math.round(v * 10) / 10; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  /** Potential gradient along the wire, V per cm, for a given rheostat setting. */
  function gradient(rh) {
    var current = ED / (RW + rh + RD);
    return (current * RW) / L;
  }

  /** Random unknown cell: emf 1.30-1.60 V, internal resistance 0.5-3.0 ohm. */
  function newCell() {
    return {
      E: Math.round((1.3 + Math.random() * 0.3) * 100) / 100,
      r: Math.round((0.5 + Math.random() * 2.5) * 10) / 10,
      seed: Math.random() * 1000 // fixes this cell's small reading errors
    };
  }

  /** Terminal voltage the potentiometer is compared against. */
  function cellVoltage(cell, k2Closed, R) {
    return k2Closed ? (cell.E * R) / (R + cell.r) : cell.E;
  }

  /**
   * Small, repeatable reading error (up to about +/-0.6 cm of balance length) for each
   * measurement, standing in for contact resistance, wire non-uniformity and the
   * difficulty of judging an exact null. It is fixed per cell and per resistance, so the
   * needle never jitters, but real-looking scatter appears in the readings.
   */
  function readingOffset(cell, k2Closed, R) {
    var s = Math.sin((k2Closed ? R + 1 : 0.5) * 12.9898 + cell.seed * 78.233) * 43758.5453;
    var frac = s - Math.floor(s);
    return (frac - 0.5) * 0.002; // volts (about +/-0.6 cm of balance length)
  }

  /** The voltage the potentiometer actually balances against, including reading error. */
  function effectiveVoltage(cell, k2Closed, R) {
    return cellVoltage(cell, k2Closed, R) + readingOffset(cell, k2Closed, R);
  }

  /** Galvanometer deflection in divisions: positive when the wire potential exceeds the cell. */
  function deflection(k, x, vc) {
    var dv = k * x - vc;
    var mag = DEFL_C * Math.log(1 + Math.abs(dv) / DEFL_S);
    return clamp(dv < 0 ? -mag : mag, -40, 40);
  }

  /** Where a careful student would find the null point, to 0.1 cm. */
  function nullPoint(k, vc) {
    return round1(vc / k);
  }

  function internalResistance(R, l1, l2) {
    return (R * (l1 - l2)) / l2;
  }

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
    round1: round1, clamp: clamp, gradient: gradient, newCell: newCell,
    cellVoltage: cellVoltage, effectiveVoltage: effectiveVoltage, deflection: deflection, nullPoint: nullPoint,
    internalResistance: internalResistance, slopeThroughOrigin: slopeThroughOrigin
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

    var R_OPTIONS = [1, 2, 3, 4, 5, 6, 8, 10, 15, 20];
    var X0 = 60, X1 = 840, SVG_W = 900;     // wire end points in SVG units
    var SPAN = X1 - X0;
    var HINGE = { x: 185, y: 40 };

    var state = {
      rh: 2,
      x: 450,
      k2: false,
      R: 5,
      cell: Pot.newCell(),
      l1: null,
      rows: [],        // { R, l2 }
      msg: null,       // transient message { kind, text }
      revealed: false
    };

    var $ = function (id) { return document.getElementById(id); };
    var svg = $('apparatus');
    var NS = 'http://www.w3.org/2000/svg';

    /* ---------- static drawing: scale ticks ---------- */
    (function drawTicks() {
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
      var gs = $('galScale'), a, rad, c = { x: 290, y: 95 };
      [-60, -30, 0, 30, 60].forEach(function (deg) {
        a = (deg * Math.PI) / 180;
        var l = document.createElementNS(NS, 'line');
        l.setAttribute('x1', c.x + 25 * Math.sin(a)); l.setAttribute('y1', c.y - 25 * Math.cos(a));
        l.setAttribute('x2', c.x + 31 * Math.sin(a)); l.setAttribute('y2', c.y - 31 * Math.cos(a));
        l.setAttribute('class', 'gtick');
        gs.appendChild(l);
      });
    })();

    /* ---------- resistance chips ---------- */
    var chipBox = $('rChips');
    R_OPTIONS.forEach(function (R) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.textContent = R + ' Ω';
      b.setAttribute('data-r', R);
      b.setAttribute('aria-pressed', String(R === state.R));
      b.addEventListener('click', function () {
        state.R = R; state.msg = null; render();
      });
      chipBox.appendChild(b);
    });

    /* ---------- helpers ---------- */
    function fmt(v, d) { return Number(v).toFixed(d); }
    function say(kind, text) { state.msg = { kind: kind, text: text }; }

    function current() {
      var k = Pot.gradient(state.rh);
      var vc = Pot.effectiveVoltage(state.cell, state.k2, state.R);
      return { k: k, vc: vc, vw: k * Pot.L, defl: Pot.deflection(k, state.x, vc) };
    }

    function rowsDerived() {
      return state.rows.map(function (row) {
        var ratio = (state.l1 - row.l2) / row.l2;
        return { R: row.R, l2: row.l2, ratio: ratio, r: row.R * ratio, inv: 1 / row.R };
      });
    }

    function clearReadings() { state.l1 = null; state.rows = []; state.revealed = false; }

    /* ---------- actions ---------- */
    function setX(v) {
      state.x = Pot.round1(Pot.clamp(v, 0, Pot.L)); state.msg = null; render();
    }

    function record() {
      var c = current();
      if (Math.abs(c.defl) >= Pot.NULL_TOL) {
        say('err', 'The galvanometer is not at zero (' + fmt(c.defl, 1) + ' div). Fine-tune the jockey and try again.');
        render(); return;
      }
      if (!state.k2) {
        var hadRows = state.rows.length > 0;
        state.l1 = state.x; state.rows = []; state.revealed = false;
        say('good', 'l₁ = ' + fmt(state.l1, 1) + ' cm recorded.' +
          (hadRows ? ' Earlier l₂ readings were cleared because l₁ changed.' : '') +
          ' Now choose R, close K₂ and find l₂.');
      } else {
        if (state.l1 === null) { say('warn', 'Record l₁ first, with K₂ open.'); render(); return; }
        if (state.x >= state.l1) {
          say('err', 'l₂ must be shorter than l₁. Check that K₂ is closed and find the null point again.');
          render(); return;
        }
        var existing = -1;
        state.rows.forEach(function (r, i) { if (r.R === state.R) existing = i; });
        if (existing >= 0) state.rows[existing].l2 = state.x; else state.rows.push({ R: state.R, l2: state.x });
        state.rows.sort(function (a, b) { return a.R - b.R; });
        state.revealed = false;
        say('good', 'Recorded l₂ = ' + fmt(state.x, 1) + ' cm for R = ' + state.R + ' Ω. Try another R.');
      }
      render();
    }

    /* ---------- events ---------- */
    $('rh').addEventListener('input', function (e) {
      var had = state.l1 !== null || state.rows.length > 0;
      state.rh = parseFloat(e.target.value);
      if (had) {
        clearReadings();
        say('warn', 'Rheostat changed, so the potential gradient changed. Earlier readings were cleared; start again from l₁.');
      } else { state.msg = null; }
      render();
    });
    $('jock').addEventListener('input', function (e) { setX(parseFloat(e.target.value)); });
    Array.prototype.forEach.call(document.querySelectorAll('.nudge [data-d]'), function (b) {
      b.addEventListener('click', function () { setX(state.x + parseFloat(b.getAttribute('data-d'))); });
    });
    $('k2Btn').addEventListener('click', function () { state.k2 = !state.k2; state.msg = null; render(); });
    $('recordBtn').addEventListener('click', record);

    $('delLast').addEventListener('click', function () { state.rows.pop(); state.revealed = false; state.msg = null; render(); });
    $('resetAll').addEventListener('click', function () { clearReadings(); say('warn', 'Readings cleared.'); render(); });
    $('newCell').addEventListener('click', function () {
      state.cell = Pot.newCell(); clearReadings(); state.k2 = false;
      say('warn', 'A new unknown cell is connected. Start again from l₁.'); render();
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
      var E = state.cell.E;
      if (c.vw < E + 0.01) {
        return { kind: 'warn', text: 'The potential drop across the wire (' + fmt(c.vw, 2) +
          ' V) is not larger than the cell’s emf, so no balance point exists. Reduce the rheostat resistance.' };
      }
      if (state.l1 === null) {
        return state.k2
          ? { kind: 'warn', text: 'Open key K₂ first, so the cell is on open circuit, to measure l₁.' }
          : { kind: '', text: 'Step 1: with K₂ open, slide the jockey until the galvanometer shows zero, then press Record l₁.' };
      }
      if (!state.k2) {
        return { kind: '', text: 'l₁ = ' + fmt(state.l1, 1) + ' cm. Step 2: choose R, close K₂ and find the new balance point l₂.' };
      }
      return { kind: '', text: 'Step 2: K₂ is closed with R = ' + state.R + ' Ω. Slide the jockey to the null point and press Record l₂.' };
    }

    function renderApparatus(c) {
      var px = X0 + (state.x / Pot.L) * SPAN;
      $('jockey').setAttribute('transform', 'translate(' + px + ',0)');
      var lead = $('lead2jockey');
      lead.setAttribute('x2', px); lead.setAttribute('y2', 172);
      var tag = $('lengthTag');
      tag.setAttribute('x', Pot.clamp(px, 90, 810));
      tag.textContent = fmt(state.x, 1) + ' cm';
      $('needle').setAttribute('transform', 'rotate(' + (c.defl * 1.5) + ' 290 95)');
      var atNull = Math.abs(c.defl) < Pot.NULL_TOL;
      var galHint = $('galHint');
      $('galCircle').setAttribute('class', 'gal' + (atNull ? ' null' : ''));
      galHint.setAttribute('class', 'lbl galhint' + (atNull ? ' null' : ''));
      galHint.textContent = atNull ? '● null point: record now'
        : (c.defl < 0 ? '→ needle left: move jockey right' : '← needle right: move jockey left');
      $('k2lever').setAttribute('transform', state.k2 ? '' : 'rotate(-38 ' + HINGE.x + ' ' + HINGE.y + ')');
      $('k2Label').textContent = state.k2 ? 'K₂ closed' : 'K₂ open';
      $('rLabel').textContent = 'R = ' + state.R + ' Ω';
      $('rhLabel').textContent = 'Rheostat Rh = ' + fmt(state.rh, 1) + ' Ω';
    }

    function renderControls(c) {
      $('rhVal').textContent = fmt(state.rh, 1) + ' Ω';
      $('kVal').textContent = fmt(c.k * 1000, 3) + ' mV/cm';
      $('vwVal').textContent = fmt(c.vw, 2) + ' V';
      $('jock').value = state.x;
      $('xVal').textContent = fmt(state.x, 1);
      var btn = $('k2Btn');
      btn.setAttribute('aria-pressed', String(state.k2));
      btn.textContent = state.k2 ? 'K₂ is closed — click to open' : 'K₂ is open — click to close';
      $('k2Hint').textContent = state.k2
        ? 'Closed: R is connected across the cell → measure l₂.'
        : 'Open: cell on open circuit → measure l₁.';
      Array.prototype.forEach.call(chipBox.children, function (b) {
        b.setAttribute('aria-pressed', String(parseFloat(b.getAttribute('data-r')) === state.R));
      });
      $('galDot').style.left = Pot.clamp(50 + (c.defl / 40) * 50, 3, 97) + '%';
      $('deflVal').textContent = fmt(c.defl, 1);
      var hint;
      if (Math.abs(c.defl) < Pot.NULL_TOL) hint = 'null point ✓';
      else if (c.defl > 0) hint = 'move the jockey towards A (left)';
      else hint = 'move the jockey towards B (right)';
      $('deflHint').textContent = hint;

      var rb = $('recordBtn');
      if (state.k2) {
        rb.textContent = 'Record l₂ (R = ' + state.R + ' Ω)';
        rb.disabled = state.l1 === null;
      } else {
        rb.textContent = 'Record l₁';
        rb.disabled = false;
      }

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
      var out = [], rows = rowsDerived(), n = rows.length;
      if (state.l1 === null) return out;
      if (state.l1 < Pot.L / 2) out.push({ k: 'warn', t: 'l₁ = ' + fmt(state.l1, 1) + ' cm is less than half the wire, so each length has a larger percentage error. Increase the rheostat resistance a little (smaller potential gradient) so the balance point moves further along the wire, but stays on it, then start again.' });
      else out.push({ k: 'ok', t: 'l₁ = ' + fmt(state.l1, 1) + ' cm uses most of the wire, which keeps the percentage errors small.' });
      if (!n) { out.push({ k: 'tip', t: 'Next: choose a shunt resistance R, close K₂ and find the new balance length l₂.' }); return out; }
      out.push(n >= 4 ? { k: 'ok', t: n + ' readings with different R.' } : { k: 'warn', t: 'Only ' + n + ' reading' + (n > 1 ? 's' : '') + ' of l₂. Take at least 4, each with a different R, and use the mean r.' });
      var close = rows.filter(function (r) { return (state.l1 - r.l2) / state.l1 < 0.1; });
      if (close.length) out.push({ k: 'warn', t: 'With R = ' + close.map(function (r) { return r.R + ' Ω'; }).join(', ') + ', l₂ is within 10% of l₁. Then l₁ − l₂ is small and a 0.1 cm error changes r a lot. Use smaller values of R as well.' });
      if (n >= 3) {
        var rs = rows.map(function (r) { return r.r; }), worst = -1, dev = 0, m = rs.reduce(function (a, b) { return a + b; }, 0) / n;
        rs.forEach(function (x, k) { var o = rs.filter(function (_, j) { return j !== k; }).sort(function (a, b) { return a - b; }), med = o[Math.floor(o.length / 2)], d = Math.abs(x - med) / med; if (d > dev) { dev = d; worst = k; } });
        if (dev > 0.1) out.push({ k: 'warn', t: 'The reading with R = ' + rows[worst].R + ' Ω gives r = ' + fmt(rs[worst], 2) + ' Ω, ' + fmt(dev * 100, 0) + '% away from the others. Select that R again, find l₂ carefully and re-record it.' });
        else out.push({ k: 'ok', t: 'Your values of r agree with each other within ' + fmt((Math.max.apply(null, rs) - Math.min.apply(null, rs)) / m * 100, 0) + '%.' });
      }
      return out;
    }
    function renderTable() {
      $('l1Val').textContent = state.l1 === null ? '—' : fmt(state.l1, 1) + ' cm';
      var body = $('obsBody');
      var rows = rowsDerived();
      body.innerHTML = '';
      if (!rows.length) {
        body.innerHTML = '<tr class="empty"><td colspan="4">No readings yet</td></tr>';
        $('meanR').textContent = '—';
        $('resultLine').textContent = '';
      } else {
        var sum = 0;
        rows.forEach(function (r) {
          sum += r.r;
          var tr = document.createElement('tr');
          tr.innerHTML = '<td>' + r.R + '</td><td>' + fmt(r.l2, 1) + '</td><td>' + fmt(r.ratio, 3) +
            '</td><td>' + fmt(r.r, 2) + '</td>';
          body.appendChild(tr);
        });
        $('meanR').textContent = fmt(sum / rows.length, 2) + ' Ω';
        $('resultLine').innerHTML = 'Result: the internal resistance of the given cell, r = <b>' +
          fmt(sum / rows.length, 2) + ' Ω</b> (mean of ' + rows.length + ' reading' + (rows.length > 1 ? 's' : '') + ').';
      }
      renderChecks(readingChecks());
      var box = $('revealBox');
      if (state.revealed) {
        if (!rows.length) {
          box.innerHTML = state.l1 === null ? 'Not yet: first find the balance length l₁ with K₂ open, then l₂ with K₂ closed for some R.' : 'Not yet: now close K₂, choose R and record at least one l₂.';
        } else {
          var mean = rows.reduce(function (a, r) { return a + r.r; }, 0) / rows.length;
          var err = (Math.abs(mean - state.cell.r) / state.cell.r) * 100;
          box.innerHTML = 'Actual internal resistance: <b>' + fmt(state.cell.r, 1) + ' Ω</b> (emf ' +
            fmt(state.cell.E, 2) + ' V). Your mean r = <b>' + fmt(mean, 2) + ' Ω</b>, an error of ' +
            fmt(err, 1) + '%.' + (rows.length < 4 ? ' With only ' + rows.length + ' reading' + (rows.length > 1 ? 's' : '') + ' this is not yet reliable: take at least 4.' : err > 5 ? ' To improve it, follow the checks above (a longer l₁ and R values that make l₂ clearly shorter than l₁).' : ' Well done: that is within normal laboratory accuracy.');
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

      var rows = rowsDerived();
      var pts = rows.map(function (r) { return { x: r.inv, y: r.ratio }; });
      var maxX = pts.length ? Math.max.apply(null, pts.map(function (p) { return p.x; })) * 1.15 : 1.1;
      var maxY = pts.length ? Math.max.apply(null, pts.map(function (p) { return p.y; })) * 1.2 : 1;
      maxX = Math.max(maxX, 0.2); maxY = Math.max(maxY, 0.2);
      var ax = niceAxis(maxX, 5), ay = niceAxis(maxY, 5);
      maxX = ax.max; maxY = ay.max;

      var pad = { l: 54, r: 16, t: 14, b: 44 };
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
      ctx.fillText('1/R  (Ω⁻¹)', pad.l + w / 2, cssH - 6);
      ctx.save(); ctx.translate(13, pad.t + h / 2); ctx.rotate(-Math.PI / 2);
      ctx.fillText('(l₁ − l₂) / l₂', 0, 0); ctx.restore();

      var slopeLine = $('slopeLine');
      if (pts.length >= 2) {
        var m = Pot.slopeThroughOrigin(pts);
        var xEnd = Math.min(maxX, maxY / m);
        ctx.strokeStyle = '#e8511d'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(sx(0), sy(0)); ctx.lineTo(sx(xEnd), sy(m * xEnd)); ctx.stroke();
        slopeLine.textContent = 'Best-fit slope = r = ' + fmt(m, 2) + ' Ω';
      } else {
        slopeLine.textContent = 'Add at least 2 readings to see the best-fit line.';
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
