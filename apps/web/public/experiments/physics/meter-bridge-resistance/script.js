/* Meter bridge: resistance and resistivity of a wire
 * Physics core is kept free of DOM code so it can be tested in Node. */

var MB = (function () {
  'use strict';

  var L = 100;          // bridge wire length, cm
  var EMF = 2.0;        // cell emf across AB, V
  var NULL_TOL = 1.0;   // |deflection| below this counts as a null
  // Damped galvanometer: log-compressed so the needle moves gradually far from balance
  // but is sharp near the null (the null window is about +/-0.2 cm).
  var DEFL_C = 4.7;
  var DEFL_S = 0.015;   // volts
  var MATERIALS = [
    { name: 'Constantan', rho: 49e-8 },
    { name: 'Manganin', rho: 44e-8 },
    { name: 'Nichrome', rho: 110e-8 }
  ];

  function round1(v) { return Math.round(v * 10) / 10; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  /** Cross-section area (m^2) for a diameter in mm. */
  function area(dMm) { var d = dMm * 1e-3; return Math.PI * d * d / 4; }

  /** Random unknown wire: material, length 60-100 cm, diameter chosen so X is 1.5 to 8 ohm. */
  function newWire() {
    var mat, len, target, A, dMm, X;
    do {
      mat = MATERIALS[Math.floor(Math.random() * MATERIALS.length)];
      len = Math.round((60 + Math.random() * 40) * 10) / 10;               // cm
      target = 1.5 + Math.random() * 6.5;                                  // ohm
      A = mat.rho * (len / 100) / target;
      dMm = Math.round(2 * Math.sqrt(A / Math.PI) * 1e3 * 1000) / 1000;    // mm, 3 decimals
    } while (dMm < 0.25 || dMm > 0.8);
    X = mat.rho * (len / 100) / area(dMm);                                 // consistent with the shown d
    return { material: mat.name, rho: mat.rho, length: len, d: dMm, X: X, seed: Math.random() * 1000 };
  }

  /** Exact balance length (cm) with R in the left gap. */
  function balanceLength(R, X) { return L * R / (R + X); }

  /** Small repeatable reading error (about +/-0.15 cm), fixed per wire and per R. */
  function readingOffset(wire, R) {
    var s = Math.sin(R * 12.9898 + wire.seed * 78.233) * 43758.5453;
    return ((s - Math.floor(s)) - 0.5) * 0.3;
  }

  /** Where the galvanometer actually balances, including the reading error. */
  function nullPosition(wire, R) { return balanceLength(R, wire.X) + readingOffset(wire, R); }

  /** Deflection in divisions: positive when the jockey is to the right of the null. */
  function deflection(wire, R, x) {
    var dv = (EMF / L) * (x - nullPosition(wire, R));
    var mag = DEFL_C * Math.log(1 + Math.abs(dv) / DEFL_S);
    return clamp(dv < 0 ? -mag : mag, -40, 40);
  }

  function resistance(R, l) { return R * (L - l) / l; }
  function resistivity(X, dMm, lenCm) { return X * area(dMm) / (lenCm / 100); }

  /** Least-squares line through the origin: y = m x. */
  function slopeThroughOrigin(points) {
    var sxy = 0, sxx = 0, i;
    for (i = 0; i < points.length; i++) { sxy += points[i].x * points[i].y; sxx += points[i].x * points[i].x; }
    return sxx === 0 ? 0 : sxy / sxx;
  }

  return {
    L: L, EMF: EMF, NULL_TOL: NULL_TOL, MATERIALS: MATERIALS,
    round1: round1, clamp: clamp, area: area, newWire: newWire, balanceLength: balanceLength,
    readingOffset: readingOffset, nullPosition: nullPosition, deflection: deflection,
    resistance: resistance, resistivity: resistivity, slopeThroughOrigin: slopeThroughOrigin
  };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = MB; }

/* ------------------------------------------------------------------ */
/* UI                                                                  */
/* ------------------------------------------------------------------ */
if (typeof document !== 'undefined') {
  (function () {
    'use strict';

    var R_OPTIONS = [1, 2, 3, 4, 5, 6, 8, 10, 15, 20];
    var X0 = 60, X1 = 840, SVG_W = 900, SPAN = X1 - X0;
    var GAL = { x: 450, y: 60 };

    var state = { x: 50, R: 5, wire: MB.newWire(), rows: [], msg: null, revealed: false };

    var $ = function (id) { return document.getElementById(id); };
    var svg = $('apparatus');
    var NS = 'http://www.w3.org/2000/svg';

    (function drawStatic() {
      var g = $('ticks'), i, px, len, line, t;
      for (i = 0; i <= 100; i++) {
        px = X0 + (i * SPAN) / 100;
        len = i % 10 === 0 ? 13 : i % 5 === 0 ? 9 : 5;
        line = document.createElementNS(NS, 'line');
        line.setAttribute('x1', px); line.setAttribute('x2', px);
        line.setAttribute('y1', 259); line.setAttribute('y2', 259 + len);
        line.setAttribute('class', 'tick' + (i % 10 === 0 ? '' : ' minor'));
        g.appendChild(line);
        if (i % 10 === 0) {
          t = document.createElementNS(NS, 'text');
          t.setAttribute('x', px); t.setAttribute('y', 288);
          t.setAttribute('class', 'lbl num'); t.setAttribute('text-anchor', 'middle');
          t.textContent = String(i);
          g.appendChild(t);
        }
      }
      var gs = $('galScale'), a;
      [-60, -30, 0, 30, 60].forEach(function (deg) {
        a = (deg * Math.PI) / 180;
        var l = document.createElementNS(NS, 'line');
        l.setAttribute('x1', GAL.x + 25 * Math.sin(a)); l.setAttribute('y1', GAL.y - 25 * Math.cos(a));
        l.setAttribute('x2', GAL.x + 31 * Math.sin(a)); l.setAttribute('y2', GAL.y - 31 * Math.cos(a));
        l.setAttribute('class', 'gtick');
        gs.appendChild(l);
      });
    })();

    var chipBox = $('rChips');
    R_OPTIONS.forEach(function (R) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.textContent = R + ' Ω';
      b.setAttribute('data-r', R); b.setAttribute('aria-pressed', String(R === state.R));
      b.addEventListener('click', function () { state.R = R; state.msg = null; render(); });
      chipBox.appendChild(b);
    });

    function fmt(v, d) { return Number(v).toFixed(d); }
    function say(kind, text) { state.msg = { kind: kind, text: text }; }
    function defl() { return MB.deflection(state.wire, state.R, state.x); }

    function rowsDerived() {
      return state.rows.map(function (r) {
        return { R: r.R, l: r.l, m: MB.L - r.l, X: MB.resistance(r.R, r.l) };
      });
    }
    function meanX() {
      var rows = rowsDerived();
      if (!rows.length) return null;
      return rows.reduce(function (a, r) { return a + r.X; }, 0) / rows.length;
    }
    function rhoOf(X) { return MB.resistivity(X, state.wire.d, state.wire.length); }
    function fmtRho(r) { return fmt(r * 1e7, 2) + ' × 10⁻⁷ Ω m'; }

    function setX(v) { state.x = MB.round1(MB.clamp(v, 0, MB.L)); state.msg = null; render(); }

    function record() {
      var d = defl();
      if (Math.abs(d) >= MB.NULL_TOL) {
        say('err', 'The galvanometer is not at zero (' + fmt(d, 1) + ' div). Fine-tune the jockey and try again.');
        render(); return;
      }
      if (state.x <= 0 || state.x >= MB.L) { say('err', 'The jockey is at the end of the wire. Find the null point between A and B.'); render(); return; }
      var existing = -1;
      state.rows.forEach(function (r, i) { if (r.R === state.R) existing = i; });
      if (existing >= 0) state.rows[existing].l = state.x; else state.rows.push({ R: state.R, l: state.x });
      state.rows.sort(function (a, b) { return a.R - b.R; });
      state.revealed = false;
      var note = (state.x < 20 || state.x > 80)
        ? ' The balance point is near an end of the wire, which makes X less accurate. Choose an R closer to X.'
        : ' Try another R.';
      say(note.indexOf('near an end') >= 0 ? 'warn' : 'good', 'Recorded l = ' + fmt(state.x, 1) + ' cm for R = ' + state.R + ' Ω.' + note);
      render();
    }

    $('jock').addEventListener('input', function (e) { setX(parseFloat(e.target.value)); });
    Array.prototype.forEach.call(document.querySelectorAll('.nudge [data-d]'), function (b) {
      b.addEventListener('click', function () { setX(state.x + parseFloat(b.getAttribute('data-d'))); });
    });
    $('recordBtn').addEventListener('click', record);
    $('delLast').addEventListener('click', function () { state.rows.pop(); state.revealed = false; state.msg = null; render(); });
    $('resetAll').addEventListener('click', function () { state.rows = []; state.revealed = false; say('warn', 'Readings cleared.'); render(); });
    $('newWire').addEventListener('click', function () {
      state.wire = MB.newWire(); state.rows = []; state.revealed = false;
      say('warn', 'A new unknown wire is connected. Start again.'); render();
    });
    $('reveal').addEventListener('click', function () { state.revealed = true; render(); });

    var layer = $('dragLayer'), dragging = false;
    function fromPointer(ev) {
      var rect = svg.getBoundingClientRect();
      var sx = ((ev.clientX - rect.left) * SVG_W) / rect.width;
      setX(((sx - X0) / SPAN) * MB.L);
    }
    layer.addEventListener('pointerdown', function (ev) { dragging = true; layer.setPointerCapture(ev.pointerId); fromPointer(ev); ev.preventDefault(); });
    layer.addEventListener('pointermove', function (ev) { if (dragging) fromPointer(ev); });
    ['pointerup', 'pointercancel'].forEach(function (n) { layer.addEventListener(n, function () { dragging = false; }); });

    function defaultStatus() {
      if (!state.rows.length) return { kind: '', text: 'Step 1: choose R, slide the jockey until the galvanometer shows zero, then press Record l. Repeat for several values of R.' };
      return { kind: '', text: state.rows.length + ' reading' + (state.rows.length > 1 ? 's' : '') + ' recorded. Try another R, or check the mean X and ρ below.' };
    }

    function renderApparatus(d) {
      var px = X0 + (state.x / MB.L) * SPAN;
      $('jockey').setAttribute('transform', 'translate(' + px + ',0)');
      var lead = $('lead2jockey'); lead.setAttribute('x2', px); lead.setAttribute('y2', 206);
      $('needle').setAttribute('transform', 'rotate(' + (d * 1.5) + ' ' + GAL.x + ' ' + GAL.y + ')');
      var atNull = Math.abs(d) < MB.NULL_TOL;
      $('galCircle').setAttribute('class', 'gal' + (atNull ? ' null' : ''));
      var gh = $('galHint');
      gh.setAttribute('class', 'lbl galhint' + (atNull ? ' null' : ''));
      gh.textContent = atNull ? '● null point: record now'
        : (d < 0 ? '→ needle left: move jockey right' : '← needle right: move jockey left');
      $('rLabel').textContent = 'R = ' + state.R + ' Ω';
      $('segA').setAttribute('x2', px); $('segB').setAttribute('x1', px);
      var ta = $('segAtxt'), tb = $('segBtxt');
      ta.setAttribute('x', (X0 + px) / 2); tb.setAttribute('x', (px + X1) / 2);
      ta.textContent = 'l = ' + fmt(state.x, 1) + ' cm'; tb.textContent = '100 − l = ' + fmt(MB.L - state.x, 1) + ' cm';
      ta.style.display = state.x < 6 ? 'none' : ''; tb.style.display = state.x > 94 ? 'none' : '';
    }

    function renderControls(d) {
      $('jock').value = state.x; $('xVal').textContent = fmt(state.x, 1);
      Array.prototype.forEach.call(chipBox.children, function (b) {
        b.setAttribute('aria-pressed', String(parseFloat(b.getAttribute('data-r')) === state.R));
      });
      var w = state.wire;
      $('wireCard').innerHTML = 'Length <b>L = ' + fmt(w.length, 1) + ' cm</b><br>Diameter <b>d = ' + fmt(w.d, 3) + ' mm</b> (screw gauge)';
      $('galDot').style.left = MB.clamp(50 + (d / 40) * 50, 3, 97) + '%';
      $('deflVal').textContent = fmt(d, 1);
      $('deflHint').textContent = Math.abs(d) < MB.NULL_TOL ? 'null point ✓'
        : (d > 0 ? 'move the jockey towards A (left)' : 'move the jockey towards B (right)');
      $('recordBtn').textContent = 'Record l (R = ' + state.R + ' Ω)';
      var st = state.msg || defaultStatus(); var el = $('status');
      el.textContent = st.text; el.className = 'status' + (st.kind ? ' ' + st.kind : '');
    }

    function renderTable() {
      var body = $('obsBody'), rows = rowsDerived();
      body.innerHTML = '';
      if (!rows.length) {
        body.innerHTML = '<tr class="empty"><td colspan="4">No readings yet</td></tr>';
        $('meanX').textContent = '—'; $('resultLine').textContent = '';
      } else {
        rows.forEach(function (r) {
          var tr = document.createElement('tr');
          [String(r.R), fmt(r.l, 1), fmt(r.m, 1), fmt(r.X, 2)].forEach(function (v) {
            var td = document.createElement('td'); td.textContent = v; tr.appendChild(td);
          });
          body.appendChild(tr);
        });
        var m = meanX();
        $('meanX').textContent = fmt(m, 2) + ' Ω';
        $('resultLine').textContent = 'Mean X = ' + fmt(m, 2) + ' Ω (mean of ' + rows.length + ' reading' + (rows.length > 1 ? 's' : '') +
          '). Resistivity ρ = X π d² / 4L = ' + fmtRho(rhoOf(m)) + '.';
      }
      var rv = $('revealBox');
      if (state.revealed) {
        rv.hidden = false;
        var m2 = meanX();
        if (m2 === null) rv.textContent = 'Add at least one reading first, then check your answer.';
        else {
          var w = state.wire, X = w.X, rho = w.rho;
          rv.textContent = 'Actual X = ' + fmt(X, 2) + ' Ω (your mean ' + fmt(m2, 2) + ' Ω, error of ' +
            fmt(Math.abs(m2 - X) / X * 100, 2) + '%). Actual resistivity = ' + fmtRho(rho) + ' (your value ' + fmtRho(rhoOf(m2)) +
            ', error ' + fmt(Math.abs(rhoOf(m2) - rho) / rho * 100, 2) + '%). The wire is ' + w.material + '.';
        }
      } else rv.hidden = true;
    }

    function niceAxis(maxV, n) {
      var raw = maxV / n, mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), f = raw / mag;
      var nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
      var step = parseFloat((nf * mag).toPrecision(6));
      return { step: step, max: parseFloat((Math.ceil(maxV / step - 1e-9) * step).toPrecision(6)) };
    }
    function decimalsOf(s) { var t = String(s), i = t.indexOf('.'); return i < 0 ? 0 : Math.min(4, t.length - i - 1); }

    var canvas = $('graph');
    function renderGraph() {
      var dpr = window.devicePixelRatio || 1, cssW = canvas.clientWidth || 640, cssH = Math.round(cssW * 0.6);
      canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
      var ctx = canvas.getContext('2d'); if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, cssW, cssH);
      var rows = rowsDerived();
      var pts = rows.map(function (r) { return { x: r.R, y: r.l / r.m }; });
      var maxX = pts.length ? Math.max.apply(null, pts.map(function (p) { return p.x; })) * 1.1 : 20;
      var maxY = pts.length ? Math.max.apply(null, pts.map(function (p) { return p.y; })) * 1.1 : 4;
      var ax = niceAxis(maxX, 5), ay = niceAxis(maxY, 5); maxX = ax.max; maxY = ay.max;
      var pad = { l: 58, r: 16, t: 14, b: 44 }, w = cssW - pad.l - pad.r, h = cssH - pad.t - pad.b;
      function sx(v) { return pad.l + (v / maxX) * w; }
      function sy(v) { return pad.t + h - (v / maxY) * h; }
      ctx.font = '12px "Space Mono", monospace'; ctx.strokeStyle = '#d8d0bb'; ctx.fillStyle = '#4b5b63'; ctx.lineWidth = 1;
      var i, v, nx = Math.round(maxX / ax.step), ny = Math.round(maxY / ay.step), dx = decimalsOf(ax.step), dy = decimalsOf(ay.step);
      for (i = 0; i <= nx; i++) { v = i * ax.step; ctx.beginPath(); ctx.moveTo(sx(v), pad.t); ctx.lineTo(sx(v), pad.t + h); ctx.stroke(); ctx.textAlign = 'center'; ctx.fillText(v.toFixed(dx), sx(v), pad.t + h + 16); }
      for (i = 0; i <= ny; i++) { v = i * ay.step; ctx.beginPath(); ctx.moveTo(pad.l, sy(v)); ctx.lineTo(pad.l + w, sy(v)); ctx.stroke(); ctx.textAlign = 'right'; ctx.fillText(v.toFixed(dy), pad.l - 6, sy(v) + 4); }
      ctx.strokeStyle = '#0c1c27'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, pad.t + h); ctx.lineTo(pad.l + w, pad.t + h); ctx.stroke();
      ctx.fillStyle = '#0c1c27'; ctx.textAlign = 'center'; ctx.fillText('R  (Ω)', pad.l + w / 2, cssH - 6);
      ctx.save(); ctx.translate(13, pad.t + h / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('l / (100 − l)', 0, 0); ctx.restore();
      var sl = $('slopeLine');
      if (pts.length >= 2) {
        var m = MB.slopeThroughOrigin(pts), xEnd = Math.min(maxX, maxY / m);
        ctx.strokeStyle = '#e8511d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx(0), sy(0)); ctx.lineTo(sx(xEnd), sy(m * xEnd)); ctx.stroke();
        sl.textContent = 'Best-fit slope = 1/X = ' + fmt(m, 3) + ' Ω⁻¹, so X = ' + fmt(1 / m, 2) + ' Ω';
      } else sl.textContent = 'Add at least 2 readings to see the best-fit line.';
      ctx.fillStyle = '#12a0a0';
      pts.forEach(function (p) { ctx.beginPath(); ctx.arc(sx(p.x), sy(p.y), 5, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); });
    }

    function render() { var d = defl(); renderApparatus(d); renderControls(d); renderTable(); renderGraph(); }
    window.addEventListener('resize', renderGraph);
    render();
  })();
}
