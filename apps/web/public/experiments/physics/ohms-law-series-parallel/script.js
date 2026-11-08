/* Ohm's law: V-I graph, series and parallel resistances
 * Physics core is kept free of DOM code so it can be tested in Node. */

var Ohm = (function () {
  'use strict';

  var E = 4.5;        // cell emf, V
  var R_INT = 0.3;    // cell internal resistance, ohm
  var R_A = 0.1;      // ammeter resistance, ohm
  var R_V = 2000;     // voltmeter resistance, ohm
  var LC_V = 0.01;    // voltmeter least count, V
  var LC_I = 0.001;   // ammeter least count, A
  var FS_V = 5, FS_I = 3;
  var MODES = ['r1', 'r2', 'series', 'parallel'];

  function round(v, d) { var p = Math.pow(10, d); return Math.round(v * p) / p; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  /** Two unknown resistors, 3.0-12.0 ohm, at least 1.5 ohm apart. */
  function newSet() {
    var a, b;
    do {
      a = round(3 + Math.random() * 9, 1);
      b = round(3 + Math.random() * 9, 1);
    } while (Math.abs(a - b) < 1.5);
    return { R1: a, R2: b, seed: Math.random() * 1000 };
  }

  function network(set, mode) {
    if (mode === 'r1') return set.R1;
    if (mode === 'r2') return set.R2;
    if (mode === 'series') return set.R1 + set.R2;
    return (set.R1 * set.R2) / (set.R1 + set.R2);
  }

  /** True circuit values for rheostat setting rh: I through the ammeter, V across the network. */
  function circuit(set, mode, rh) {
    var rn = network(set, mode);
    var rp = (rn * R_V) / (rn + R_V);                 // network in parallel with the voltmeter
    var I = E / (R_INT + rh + R_A + rp);
    return { I: I, V: I * rp, Rnet: rn };
  }

  /** Small repeatable reading error of up to half a least count, fixed per set, mode and setting. */
  function noise(set, mode, rh, which) {
    var m = MODES.indexOf(mode) + 1;
    var s = Math.sin((rh + 1) * 12.9898 + m * 4.1414 + which * 7.7 + set.seed * 78.233) * 43758.5453;
    return (s - Math.floor(s)) - 0.5;
  }

  /** What the meters display (rounded to their least counts). */
  function reading(set, mode, rh) {
    var c = circuit(set, mode, rh);
    var I = round(c.I + noise(set, mode, rh, 1) * LC_I, 3);
    var V = round(c.V + noise(set, mode, rh, 2) * LC_V, 2);
    return { I: I, V: V };
  }

  function slopeThroughOrigin(points) {
    var sxy = 0, sxx = 0, i;
    for (i = 0; i < points.length; i++) { sxy += points[i].x * points[i].y; sxx += points[i].x * points[i].x; }
    return sxx === 0 ? 0 : sxy / sxx;
  }

  return {
    E: E, FS_V: FS_V, FS_I: FS_I, MODES: MODES, round: round, clamp: clamp,
    newSet: newSet, network: network, circuit: circuit, reading: reading, slopeThroughOrigin: slopeThroughOrigin
  };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = Ohm; }

/* ------------------------------------------------------------------ */
/* UI                                                                  */
/* ------------------------------------------------------------------ */
if (typeof document !== 'undefined') {
  (function () {
    'use strict';

    var MODE_NAME = { r1: 'R₁ alone', r2: 'R₂ alone', series: 'R₁ and R₂ in series', parallel: 'R₁ and R₂ in parallel' };
    var NS = 'http://www.w3.org/2000/svg';
    var state = { set: Ohm.newSet(), mode: 'r1', rh: 5, data: { r1: [], r2: [], series: [], parallel: [] }, msg: null, revealed: false };
    var $ = function (id) { return document.getElementById(id); };
    function fmt(v, d) { return Number(v).toFixed(d); }
    function say(kind, text) { state.msg = { kind: kind, text: text }; }

    (function dials() {
      [['aScale', 500, 60, 34], ['vScale', 620, 200, 38]].forEach(function (d) {
        var g = $(d[0]), deg, a, l;
        for (deg = -60; deg <= 60; deg += 15) {
          a = (deg * Math.PI) / 180;
          l = document.createElementNS(NS, 'line');
          l.setAttribute('x1', d[1] + (d[3] - 9) * Math.sin(a)); l.setAttribute('y1', d[2] - (d[3] - 9) * Math.cos(a));
          l.setAttribute('x2', d[1] + (d[3] - 3) * Math.sin(a)); l.setAttribute('y2', d[2] - (d[3] - 3) * Math.cos(a));
          l.setAttribute('class', 'gtick'); g.appendChild(l);
        }
      });
    })();

    var chips = $('modeChips');
    Ohm.MODES.forEach(function (m) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.setAttribute('data-m', m);
      b.textContent = m === 'r1' ? 'R₁' : m === 'r2' ? 'R₂' : m === 'series' ? 'Series' : 'Parallel';
      b.addEventListener('click', function () { state.mode = m; state.msg = null; render(); });
      chips.appendChild(b);
    });

    function box(x, y, w, h, label, lx, ly) {
      return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="3" class="res"/>' +
        '<text x="' + lx + '" y="' + ly + '" class="lbl rname" text-anchor="start">' + label + '</text>';
    }
    function drawNet(mode) {
      var s;
      if (mode === 'r1' || mode === 'r2') {
        s = '<polyline points="760,110 760,160" class="lead"/><polyline points="760,220 760,270" class="lead"/>' +
          box(748, 160, 24, 60, mode === 'r1' ? 'R₁' : 'R₂', 782, 196);
      } else if (mode === 'series') {
        s = '<polyline points="760,110 760,128" class="lead"/><polyline points="760,172 760,208" class="lead"/><polyline points="760,252 760,270" class="lead"/>' +
          box(748, 128, 24, 44, 'R₁', 782, 155) + box(748, 208, 24, 44, 'R₂', 782, 235);
      } else {
        s = '<polyline points="715,110 805,110" class="lead"/><polyline points="715,270 805,270" class="lead"/>' +
          '<polyline points="715,110 715,150" class="lead"/><polyline points="715,230 715,270" class="lead"/>' +
          '<polyline points="805,110 805,150" class="lead"/><polyline points="805,230 805,270" class="lead"/>' +
          box(703, 150, 24, 80, 'R₁', 686, 196).replace('text-anchor="start"', 'text-anchor="end"') + box(793, 150, 24, 80, 'R₂', 827, 196);
      }
      $('net').innerHTML = s;
    }

    function rows() { return state.data[state.mode]; }
    function mean(arr) { return arr.length ? arr.reduce(function (a, b) { return a + b; }, 0) / arr.length : null; }
    function measuredR(m) { return mean(state.data[m].map(function (r) { return r.V / r.I; })); }
    function expectedR(m) { return Ohm.network(state.set, m); }

    $('rh').addEventListener('input', function (e) { state.rh = parseFloat(e.target.value); state.msg = null; render(); });
    $('recordBtn').addEventListener('click', function () {
      var rd = Ohm.reading(state.set, state.mode, state.rh), arr = rows(), ex = -1;
      arr.forEach(function (r, i) { if (r.rh === state.rh) ex = i; });
      var row = { rh: state.rh, I: rd.I, V: rd.V };
      if (ex >= 0) arr[ex] = row; else arr.push(row);
      arr.sort(function (a, b) { return a.I - b.I; });
      state.revealed = false;
      say(rd.I > 2 ? 'warn' : 'good', 'Recorded I = ' + fmt(rd.I, 3) + ' A, V = ' + fmt(rd.V, 2) + ' V for ' + MODE_NAME[state.mode] + '.' +
        (rd.I > 2 ? ' The current is high and the resistor would heat up; use more rheostat resistance.' : ' Change the rheostat and take another reading.'));
      render();
    });
    $('delLast').addEventListener('click', function () { rows().pop(); state.revealed = false; state.msg = null; render(); });
    $('resetAll').addEventListener('click', function () { state.data[state.mode] = []; state.revealed = false; say('warn', 'Table cleared for ' + MODE_NAME[state.mode] + '.'); render(); });
    $('newSet').addEventListener('click', function () {
      state.set = Ohm.newSet(); state.data = { r1: [], r2: [], series: [], parallel: [] }; state.revealed = false;
      say('warn', 'New unknown resistors R₁ and R₂ are connected. All tables were cleared.'); render();
    });
    $('reveal').addEventListener('click', function () { state.revealed = true; render(); });

    function defaultStatus(c) {
      if (c.I > 2) return { kind: 'warn', text: 'The current is above 2 A, so the resistor would heat up. Increase the rheostat resistance.' };
      if (!rows().length) return { kind: '', text: 'Step 1: with ' + MODE_NAME[state.mode] + ' connected, set the rheostat and press “Take reading”. Take at least five readings, then try the other arrangements.' };
      return { kind: '', text: rows().length + ' reading' + (rows().length > 1 ? 's' : '') + ' for ' + MODE_NAME[state.mode] + '. Change the rheostat for another one.' };
    }

    function render() {
      var c = Ohm.circuit(state.set, state.mode, state.rh), live = Ohm.reading(state.set, state.mode, state.rh);
      drawNet(state.mode);
      // meters (live)
      $('aDigi').textContent = fmt(live.I, 3) + ' A'; $('vDigi').textContent = fmt(live.V, 2) + ' V';
      $('aNeedle').setAttribute('transform', 'rotate(' + (-60 + 120 * Ohm.clamp(live.I / Ohm.FS_I, 0, 1)) + ' 500 60)');
      $('vNeedle').setAttribute('transform', 'rotate(' + (-60 + 120 * Ohm.clamp(live.V / Ohm.FS_V, 0, 1)) + ' 620 200)');
      var sx = 250 + (state.rh / 10) * 130;
      $('slide').setAttribute('x1', sx); $('slide').setAttribute('x2', sx);
      $('rhLabel').textContent = 'Rheostat Rh = ' + fmt(state.rh, 1) + ' Ω';
      $('rhVal').textContent = fmt(state.rh, 1) + ' Ω'; $('iNow').textContent = fmt(live.I, 3) + ' A'; $('vNow').textContent = fmt(live.V, 2) + ' V';
      Array.prototype.forEach.call(chips.children, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-m') === state.mode)); });
      $('modeHint').textContent = 'Now connected: ' + MODE_NAME[state.mode] + '.';
      var st = state.msg || defaultStatus(c); $('status').textContent = st.text; $('status').className = 'status' + (st.kind ? ' ' + st.kind : '');
      $('rh').value = state.rh;
      renderTables(); renderGraph();
    }

    function renderTables() {
      $('obsTitle').textContent = 'Readings for ' + MODE_NAME[state.mode] + '.';
      var body = $('obsBody'), arr = rows(); body.innerHTML = '';
      if (!arr.length) body.innerHTML = '<tr class="empty"><td colspan="4">No readings yet</td></tr>';
      arr.forEach(function (r) {
        var tr = document.createElement('tr');
        [fmt(r.rh, 1), fmt(r.I, 3), fmt(r.V, 2), fmt(r.V / r.I, 2)].forEach(function (v) { var td = document.createElement('td'); td.textContent = v; tr.appendChild(td); });
        body.appendChild(tr);
      });
      var m = measuredR(state.mode);
      $('meanR').textContent = m === null ? '—' : fmt(m, 2) + ' Ω';
      $('resultLine').textContent = m === null ? '' : 'Mean R = ' + fmt(m, 2) + ' Ω for ' + MODE_NAME[state.mode] + ' (' + arr.length + ' readings).';
      // summary
      var sb = $('sumBody'); sb.innerHTML = '';
      var r1 = measuredR('r1'), r2 = measuredR('r2');
      Ohm.MODES.forEach(function (md) {
        var mr = measuredR(md), exp = '—';
        if (md === 'series' && r1 !== null && r2 !== null) exp = fmt(r1 + r2, 2) + ' (R₁ + R₂)';
        if (md === 'parallel' && r1 !== null && r2 !== null) exp = fmt((r1 * r2) / (r1 + r2), 2) + ' (R₁R₂/(R₁+R₂))';
        var tr = document.createElement('tr');
        [MODE_NAME[md], String(state.data[md].length), mr === null ? '—' : fmt(mr, 2), exp].forEach(function (v) { var td = document.createElement('td'); td.textContent = v; tr.appendChild(td); });
        sb.appendChild(tr);
      });
      var rv = $('revealBox');
      if (state.revealed) {
        rv.hidden = false;
        var any = Ohm.MODES.filter(function (md) { return state.data[md].length; });
        if (!any.length) rv.textContent = 'Take at least one reading first, then check your answer.';
        else rv.textContent = any.map(function (md) {
          var t = expectedR(md), mr = measuredR(md);
          return MODE_NAME[md] + ': actual ' + fmt(t, 2) + ' Ω, yours ' + fmt(mr, 2) + ' Ω (error ' + fmt(Math.abs(mr - t) / t * 100, 2) + '%)';
        }).join('. ') + '. The values are R₁ = ' + fmt(state.set.R1, 1) + ' Ω and R₂ = ' + fmt(state.set.R2, 1) + ' Ω.';
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
      var pts = rows().map(function (r) { return { x: r.I, y: r.V }; });
      var maxX = pts.length ? Math.max.apply(null, pts.map(function (p) { return p.x; })) * 1.1 : 1;
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
      ctx.fillStyle = '#0c1c27'; ctx.textAlign = 'center'; ctx.fillText('I  (A)', pad.l + w / 2, cssH - 6);
      ctx.save(); ctx.translate(13, pad.t + h / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('V  (V)', 0, 0); ctx.restore();
      var sl = $('slopeLine');
      if (pts.length >= 2) {
        var m = Ohm.slopeThroughOrigin(pts), xEnd = Math.min(maxX, maxY / m);
        ctx.strokeStyle = '#e8511d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx(0), sy(0)); ctx.lineTo(sx(xEnd), sy(m * xEnd)); ctx.stroke();
        sl.textContent = 'Best-fit slope = R = ' + fmt(m, 2) + ' Ω (' + MODE_NAME[state.mode] + ')';
      } else sl.textContent = 'Take at least 2 readings to see the best-fit line.';
      ctx.fillStyle = '#12a0a0';
      pts.forEach(function (p) { ctx.beginPath(); ctx.arc(sx(p.x), sy(p.y), 5, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); });
    }

    window.addEventListener('resize', renderGraph);
    render();
  })();
}
