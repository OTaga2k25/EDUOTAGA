/* Salivary amylase: effect of temperature and pH on the digestion of starch (starch–iodine test). */
(function (root) {
  'use strict';
  function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  var KMAX = 0.6, ACHRO = 0.05, TMAX = 25;
  var SETS = {
    temp: [{ id: 'ice', label: '0–4 °C (ice)', T: 2, pH: 6.8 }, { id: 't20', label: '20 °C', T: 20, pH: 6.8 }, { id: 't37', label: '37 °C', T: 37, pH: 6.8 },
      { id: 't45', label: '45 °C', T: 45, pH: 6.8 }, { id: 't60', label: '60 °C', T: 60, pH: 6.8 }, { id: 'boil', label: 'Boiled saliva, 37 °C', T: 37, pH: 6.8, boiled: true }],
    pH: [{ id: 'p4', label: 'pH 4', T: 37, pH: 4 }, { id: 'p5', label: 'pH 5', T: 37, pH: 5 }, { id: 'p6', label: 'pH 6', T: 37, pH: 6 },
      { id: 'p68', label: 'pH 6.8', T: 37, pH: 6.8 }, { id: 'p8', label: 'pH 8', T: 37, pH: 8 }, { id: 'p9', label: 'pH 9', T: 37, pH: 9 }] };
  function fT(T) { return T <= 37 ? Math.exp(-Math.pow((37 - T) / 16, 2)) : Math.exp(-Math.pow((T - 37) / 10, 2)); }
  function fpH(p) { return Math.exp(-Math.pow((p - 6.8) / 1.1, 2)); }
  function activity(tube) { return tube.boiled ? 0 : fT(tube.T) * fpH(tube.pH); }
  function newSetup(seed) { var r = mulberry32(seed >>> 0); return { seed: seed, sal: 0.75 + 0.55 * r() }; }
  // starch remaining after one minute at the tube's current conditions
  function step(S, tube, setup) { return S * Math.exp(-KMAX * setup.sal * activity(tube)); }
  function achromic(S) { return S < ACHRO; }
  // iodine spot colour from the fraction of starch left
  var STOPS = [[0, [233, 207, 106]], [0.05, [214, 160, 64]], [0.12, [176, 96, 40]], [0.3, [120, 50, 70]], [0.55, [60, 36, 96]], [1, [24, 26, 64]]];
  function spotColour(S) {
    for (var i = 1; i < STOPS.length; i++) if (S <= STOPS[i][0]) { var a = STOPS[i - 1], b = STOPS[i], t = (S - a[0]) / (b[0] - a[0]); return 'rgb(' + a[1].map(function (v, k) { return Math.round(v + (b[1][k] - v) * t); }).join(',') + ')'; }
    return 'rgb(24,26,64)';
  }
  function colourName(S) { return S < ACHRO ? 'yellowish (iodine colour): no starch' : S < 0.12 ? 'reddish brown' : S < 0.3 ? 'reddish violet' : S < 0.55 ? 'violet-blue' : 'blue-black'; }
  // first whole minute at which the tube shows the achromic point (null if not within TMAX)
  function trueTime(tube, setup) { var S = 1; for (var m = 1; m <= TMAX; m++) { S = step(S, tube, setup); if (achromic(S)) return m; } return null; }
  var exp = { mulberry32: mulberry32, SETS: SETS, TMAX: TMAX, ACHRO: ACHRO, fT: fT, fpH: fpH, activity: activity, newSetup: newSetup, step: step, achromic: achromic, spotColour: spotColour, colourName: colourName, trueTime: trueTime };
  if (typeof module !== 'undefined' && module.exports) module.exports = exp; else root.Amy = exp;
})(this);
if (typeof document !== 'undefined') (function () {
  'use strict';
  var A = Amy, $ = function (id) { return document.getElementById(id); }, NS = 'http://www.w3.org/2000/svg';
  var st = { mode: 'temp', setup: null, tubes: [], m: 0, started: false, hist: [], msg: null, warmed: null, ans: null };
  function fresh(mode) {
    st.mode = mode || st.mode; st.setup = A.newSetup((Math.random() * 1e9) >>> 0);
    st.tubes = A.SETS[st.mode].map(function (t) { return { id: t.id, label: t.label, T: t.T, pH: t.pH, boiled: !!t.boiled, S: 1, mark: null, first: null }; });
    st.m = 0; st.started = false; st.hist = []; st.warmed = null; st.ans = null; $('optSel').value = ''; $('optFb').textContent = '';
    $('optSel').innerHTML = '<option value="">Choose…</option>' + st.tubes.filter(function (t) { return !t.boiled; }).map(function (t) { return '<option value="' + t.id + '">' + t.label + '</option>'; }).join('');
  }
  function say(k, t) { st.msg = { kind: k, text: t }; }
  $('modeChips').addEventListener('click', function (e) { var b = e.target.closest('[data-m]'); if (!b) return; fresh(b.getAttribute('data-m')); st.msg = null; render(); });
  $('startBtn').addEventListener('click', function () {
    if (st.started) { say('err', 'The clock is already running. To start again, press "New experiment".'); return render(); }
    st.started = true; st.m = 0; say('good', '1 mL of diluted saliva added to each tube at the same moment, and the stopwatch started. Each tube already holds 2 mL of 1% starch' + (st.mode === 'pH' ? ' in a buffer of its pH, at 37 °C.' : ' at pH 6.8, kept at its temperature.') + ' Now wait a minute and test a drop from each tube.'); render();
  });
  $('stepBtn').addEventListener('click', function () {
    if (!st.started) { say('err', 'First add saliva to all the tubes and start the stopwatch.'); return render(); }
    if (st.m >= A.TMAX) { say('warn', A.TMAX + ' minutes are up. Tubes that never reached the achromic point show (almost) no digestion: rate ≈ 0.'); return render(); }
    st.m++; var row = [];
    st.tubes.forEach(function (t) { t.S = A.step(t.S, t, st.setup); if (t.first == null && A.achromic(t.S)) t.first = st.m; row.push(t.S); });
    st.hist.push(row);
    say('', 'Minute ' + st.m + ': a drop from each tube was put into a cavity of the spot tile with a drop of iodine. Look at the colours. When a tube’s drop stays the yellowish iodine colour (no blue at all), mark its achromic point.');
    render();
  });
  $('markBtns').addEventListener('click', function (e) {
    var b = e.target.closest('[data-t]'); if (!b) return; var t = st.tubes[+b.getAttribute('data-t')];
    if (!st.m) { say('err', 'Test a drop with iodine first.'); return render(); }
    if (t.mark != null) { say('', t.label + ' is already marked at ' + t.mark + ' min.'); return render(); }
    if (!A.achromic(t.S)) { say('err', t.label + ': the spot is ' + A.colourName(t.S) + ', so starch is still present. The achromic point is when iodine gives no blue colour at all.'); return render(); }
    t.mark = st.m; var late = t.mark - t.first;
    say(late ? 'warn' : 'good', t.label + ': achromic point at ' + t.mark + ' min.' + (late ? ' (It was already reached at ' + t.first + ' min: watch every spot each minute.)' : ''));
    render();
  });
  $('warmBtn').addEventListener('click', function () {
    var t = st.tubes[0]; if (st.mode !== 'temp' || !st.started) return;
    if (st.warmed != null) { say('', 'The ice tube is already at 37 °C.'); return render(); }
    if (A.achromic(t.S)) return; st.warmed = st.m; t.T = 37; t.label = '0 °C → 37 °C';
    say('', 'The tube from the ice was moved into the 37 °C water bath. Keep testing: does the enzyme start working?'); render();
  });
  $('newSet').addEventListener('click', function () { fresh(); say('', 'New experiment: fresh starch and a new saliva sample.'); render(); });
  $('optBtn').addEventListener('click', function () {
    var id = $('optSel').value, fb = $('optFb'); if (!id) { fb.textContent = 'Choose a condition.'; return; }
    var rates = st.tubes.map(function (t) { return t.mark ? 1 / t.mark : 0; }), best = st.tubes[rates.indexOf(Math.max.apply(null, rates))];
    if (!st.tubes.some(function (t) { return t.mark; })) { fb.textContent = 'First find the achromic points.'; return; }
    var pick = st.tubes.filter(function (t) { return t.id === id; })[0];
    if (pick.id === best.id) { st.ans = true; fb.textContent = 'Correct: the shortest time (highest rate) is at ' + best.label + '. ' + (st.mode === 'temp' ? 'This is the optimum temperature of salivary amylase, close to body temperature (37 °C).' : 'Salivary amylase works best near neutral pH (about 6.8, the pH of saliva).'); }
    else { st.ans = false; fb.textContent = 'Not that one. The optimum is where the enzyme is fastest: the shortest time to the achromic point, i.e. the highest rate 1/t in your table.'; }
    render();
  });

  function readingChecks() {
    var out = []; if (!st.m) return out;
    var marked = st.tubes.filter(function (t) { return t.mark; }), late = st.tubes.filter(function (t) { return t.mark && t.mark > t.first; });
    var missed = st.tubes.filter(function (t) { return !t.mark && t.first != null && st.m - t.first >= 2; });
    if (late.length) out.push({ k: 'warn', t: late.map(function (t) { return t.label; }).join(', ') + ': marked later than the achromic point was reached. Test and look at every tube each minute.' });
    if (missed.length) out.push({ k: 'warn', t: missed.map(function (t) { return t.label; }).join(', ') + ': the spot has been yellowish for a while but is not marked yet.' });
    if (marked.length && !late.length && !missed.length) out.push({ k: 'ok', t: 'Achromic points marked on time.' });
    if (st.m >= A.TMAX) { var none = st.tubes.filter(function (t) { return t.first == null; }); if (none.length) out.push({ k: 'ok', t: 'No achromic point in ' + A.TMAX + ' min for: ' + none.map(function (t) { return t.label; }).join(', ') + '. Rate taken as 0.' }); }
    var boil = st.tubes.filter(function (t) { return t.boiled; })[0];
    if (boil && st.m >= 6) out.push({ k: 'tip', t: 'Boiled saliva: the spots stay blue-black. Boiling denatures the enzyme (a protein) permanently, so no starch is digested.' });
    if (st.mode === 'temp' && st.m >= 6 && st.warmed == null) out.push({ k: 'tip', t: 'The ice tube shows hardly any digestion. Try moving it to 37 °C: is the enzyme destroyed, or only inactive?' });
    if (st.warmed != null && st.tubes[0].first != null) out.push({ k: 'ok', t: 'After warming, the ice tube digested its starch: low temperature only inactivates the enzyme, it does not destroy it.' });
    if (st.mode === 'pH' && st.m >= 6) out.push({ k: 'tip', t: 'At pH 4 and 9 the spots stay dark: strong acid or alkali changes the shape of the enzyme’s active site. In the stomach (pH about 2) salivary amylase stops working.' });
    return out;
  }
  function el(tag, at, txt) { var e = document.createElementNS(NS, tag); for (var k in at) e.setAttribute(k, at[k]); if (txt != null) e.textContent = txt; return e; }
  var COLX = function (i) { return 132 + i * 88; };
  function draw() {
    var g = $('app'); while (g.firstChild) g.removeChild(g.firstChild);
    st.tubes.forEach(function (t, i) {
      var x = COLX(i), y = 18, w = 26, h = 84, r = w / 2, hot = t.T >= 45 || t.boiled, cold = t.T < 10;
      g.appendChild(el('rect', { x: x - 38, y: y + 34, width: 76, height: 58, rx: 8, fill: cold ? 'rgba(150,200,255,.25)' : hot ? 'rgba(255,120,80,.22)' : 'rgba(255,255,255,.07)' }));
      g.appendChild(el('path', { d: 'M' + (x - r) + ' ' + (y + 30) + ' L' + (x - r) + ' ' + (y + h - r) + ' A' + r + ' ' + r + ' 0 0 0 ' + (x + r) + ' ' + (y + h - r) + ' L' + (x + r) + ' ' + (y + 30) + ' Z', fill: 'rgba(240,240,232,' + (0.35 + 0.4 * t.S).toFixed(2) + ')' }));
      g.appendChild(el('path', { d: 'M' + (x - r) + ' ' + y + ' L' + (x - r) + ' ' + (y + h - r) + ' A' + r + ' ' + r + ' 0 0 0 ' + (x + r) + ' ' + (y + h - r) + ' L' + (x + r) + ' ' + y, fill: 'none', stroke: '#d6e7ef', 'stroke-width': 2 }));
      if (cold) for (var c = 0; c < 3; c++) g.appendChild(el('rect', { x: x - 34 + c * 22, y: y + 76, width: 12, height: 12, rx: 2, fill: 'rgba(210,235,255,.8)' }));
      if (hot) for (var s = 0; s < 2; s++) g.appendChild(el('path', { d: 'M' + (x - 26 + s * 46) + ' ' + (y + 30) + ' q5 -8 0 -16 q-5 -8 0 -16', stroke: 'rgba(255,255,255,.5)', fill: 'none', 'stroke-width': 1.5 }));
      var lab = t.boiled ? ['Boiled saliva', '37 °C'] : st.warmed != null && i === 0 ? ['0 °C → 37 °C', 'from ' + st.warmed + ' min'] : [t.label.replace(' (ice)', ''), st.mode === 'temp' ? 'pH 6.8' : '37 °C'];
      g.appendChild(el('text', { x: x, y: 122, 'text-anchor': 'middle', class: 'lbl' }, (i + 1) + '. ' + lab[0]));
      g.appendChild(el('text', { x: x, y: 137, 'text-anchor': 'middle', class: 'lblm' }, lab[1]));
    });
    g.appendChild(el('rect', { x: 14, y: 150, width: 612, height: 262, rx: 12, fill: '#f6f4ee' }));
    g.appendChild(el('text', { x: 26, y: 170, class: 'tile' }, 'Spot tile: a drop from each tube + iodine'));
    g.appendChild(el('text', { x: 614, y: 170, 'text-anchor': 'end', class: 'tilem' }, st.started ? 't = ' + st.m + ' min' : 'stopwatch not started'));
    var rows = st.hist.slice(-7), first = st.hist.length - rows.length;
    for (var k = 0; k < 7; k++) {
      var y0 = 196 + k * 31, row = rows[k], mm = first + k + 1;
      g.appendChild(el('text', { x: 78, y: y0 + 5, 'text-anchor': 'end', class: 'tilem' }, row ? mm + ' min' : ''));
      st.tubes.forEach(function (t, i) {
        var x = COLX(i); g.appendChild(el('circle', { cx: x, cy: y0, r: 13, fill: row ? A.spotColour(row[i]) : '#e4e0d6', stroke: '#cfc9bb', 'stroke-width': 1.5 }));
        if (row && t.mark === mm) g.appendChild(el('circle', { cx: x, cy: y0, r: 16.5, fill: 'none', stroke: '#1f9d55', 'stroke-width': 3 }));
      });
    }
  }
  function drawGraph() {
    var cv = $('graph'), dpr = window.devicePixelRatio || 1, W = cv.clientWidth || 600, H = 220; cv.width = W * dpr; cv.height = H * dpr; cv.style.height = H + 'px';
    var c = cv.getContext && cv.getContext('2d'); if (!c) return; c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
    var rates = st.tubes.map(function (t) { return t.mark ? 1 / t.mark : 0; }), max = Math.max(0.25, Math.max.apply(null, rates)) * 1.15;
    var L = 46, B = H - 44, bw = (W - L - 10) / st.tubes.length;
    c.strokeStyle = '#8a9aa2'; c.lineWidth = 1; c.beginPath(); c.moveTo(L, 10); c.lineTo(L, B); c.lineTo(W - 6, B); c.stroke();
    c.fillStyle = '#304855'; c.font = '11px "Space Mono", monospace'; c.textAlign = 'right';
    for (var v = 0; v <= max; v += 0.05) { var yy = B - v / max * (B - 14); c.fillText(v.toFixed(2), L - 4, yy + 4); }
    c.save(); c.translate(12, B / 2 + 10); c.rotate(-Math.PI / 2); c.textAlign = 'center'; c.fillText('rate 1/t (per min)', 0, 0); c.restore();
    st.tubes.forEach(function (t, i) { var x = L + i * bw + bw * 0.18, h = rates[i] / max * (B - 14); c.fillStyle = t.mark ? '#2c8f6a' : '#c9d3d8'; c.fillRect(x, B - h, bw * 0.64, h); c.fillStyle = '#304855'; c.textAlign = 'center'; c.fillText(t.boiled ? 'boiled' : t.label.replace(' (ice)', '').replace('0 °C → 37 °C', 'ice→37'), x + bw * 0.32, B + 16); });
  }
  function render() {
    Array.prototype.forEach.call(document.querySelectorAll('#modeChips [data-m]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-m') === st.mode)); });
    $('warmBtn').style.display = st.mode === 'temp' ? '' : 'none';
    $('given').innerHTML = st.mode === 'temp' ? 'Each tube: 2 mL of 1% starch at pH 6.8, kept in a water bath at its temperature.<br>Tube 6 gets saliva that was boiled and cooled.' : 'Each tube: 2 mL of 1% starch in a buffer of the stated pH, all at 37 °C.';
    $('markBtns').innerHTML = st.tubes.map(function (t, i) { return '<button type="button" class="btn sm' + (t.mark ? ' done' : '') + '" data-t="' + i + '"' + (t.mark ? ' aria-pressed="true"' : '') + '>' + (i + 1) + '. ' + (t.boiled ? 'Boiled' : t.label.replace(' (ice)', '')) + (t.mark ? ' ✓ ' + t.mark + ' min' : '') + '</button>'; }).join('');
    var body = $('obsBody'); body.innerHTML = '';
    st.tubes.forEach(function (t, i) { var tr = document.createElement('tr'), done = st.m >= A.TMAX;
      var time = t.mark ? String(t.mark) : done && t.first == null ? '> ' + A.TMAX + ' (none)' : '…', rate = t.mark ? (1 / t.mark).toFixed(3) : done && t.first == null ? '≈ 0' : '…';
      [String(i + 1), t.boiled ? 'Boiled saliva, 37 °C' : t.label + (st.warmed != null && i === 0 ? ' (from ' + st.warmed + ' min)' : '') + (st.mode === 'temp' ? '' : ', 37 °C'), time, rate].forEach(function (v) { var td = document.createElement('td'); td.textContent = v; tr.appendChild(td); }); body.appendChild(tr); });
    var list = $('checks'), items = readingChecks(); list.innerHTML = '';
    items.forEach(function (c) { var li = document.createElement('li'); li.className = c.k; li.textContent = c.t; list.appendChild(li); }); $('checksH').hidden = !items.length;
    $('optLabel').textContent = st.mode === 'temp' ? 'Optimum temperature from your results' : 'Optimum pH from your results';
    var stt = $('status'), m = st.msg || { kind: '', text: 'Add saliva to all six tubes and start the stopwatch.' }; stt.textContent = m.text; stt.className = 'status' + (m.kind ? ' ' + m.kind : '');
    draw(); drawGraph();
  }
  fresh('temp'); render();
  if (typeof window !== 'undefined') { window.__amy = st; window.addEventListener('resize', drawGraph); }
})();
