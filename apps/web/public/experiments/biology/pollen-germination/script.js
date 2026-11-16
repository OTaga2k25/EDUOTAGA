/* Pollen germination on a slide (Plus Two botany): effect of sucrose concentration and boric acid. */
(function (root) {
  'use strict';
  function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  var CONC = [0, 5, 10, 15, 20], TIMES = [10, 20, 30], D = 14;   // grain diameter in px
  var PMAX = { 0: 0.06, 5: 0.5, 10: 0.78, 15: 0.56, 20: 0.22 }, BURST = { 0: 0.45, 5: 0.08, 10: 0, 15: 0, 20: 0 };
  function newSlide(seed, conc, boric) {
    var rnd = mulberry32(seed >>> 0), grains = [], cx = 206, cy = 212, R = 176, n = 26 + Math.floor(rnd() * 8);
    var P = PMAX[conc]; if (boric) P = 1 - (1 - P) * 0.72; P = Math.min(0.92, P);
    var tries = 0;
    while (grains.length < n && tries++ < 4000) {
      var a = rnd() * 2 * Math.PI, r = Math.sqrt(rnd()) * (R - 22), x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
      if (grains.some(function (g) { return Math.hypot(g.x - x, g.y - y) < 36; })) continue;
      var u = rnd(), burst = u < BURST[conc], germ = !burst && rnd() < P;
      grains.push({ x: x, y: y, dir: rnd() * 2 * Math.PI, bend: (rnd() - 0.5) * 1.2, burst: burst,
        ts: germ ? 3 + rnd() * (boric ? 9 : 14) : 1e9, rate: (boric ? 0.16 : 0.12) + rnd() * 0.1 });   // tube length in grain diameters per minute
    }
    return { seed: seed, conc: conc, boric: !!boric, grains: grains, cx: cx, cy: cy, R: R };
  }
  function tubeLen(g, t) { return Math.max(0, (t - g.ts) * g.rate); }            // in grain diameters
  function isGerminated(g, t) { return !g.burst && tubeLen(g, t) >= 1; }         // rule: tube at least as long as the grain's diameter
  function count(slide, t) { var n = 0; slide.grains.forEach(function (g) { if (isGerminated(g, t)) n++; }); return { total: slide.grains.length, germ: n }; }
  var exp = { mulberry32: mulberry32, CONC: CONC, TIMES: TIMES, D: D, newSlide: newSlide, tubeLen: tubeLen, isGerminated: isGerminated, count: count };
  if (typeof module !== 'undefined' && module.exports) module.exports = exp; else root.Pol = exp;
})(this);
if (typeof document !== 'undefined') (function () {
  'use strict';
  var P = Pol, $ = function (id) { return document.getElementById(id); }, NS = 'http://www.w3.org/2000/svg';
  var st = { conc: 10, boric: false, slide: null, t: 0, marks: {}, tries: 0, show: false, rows: [], msg: null, errs: 0, optOk: null };
  function say(k, t) { st.msg = { kind: k, text: t }; }
  function el(tag, at, txt) { var e = document.createElementNS(NS, tag); for (var k in at) e.setAttribute(k, at[k]); if (txt != null) e.textContent = txt; return e; }
  $('concChips').addEventListener('click', function (e) { var b = e.target.closest('[data-c]'); if (!b) return; st.conc = +b.getAttribute('data-c'); if (st.slide) { st.slide = null; say('', 'Medium changed to ' + st.conc + '% sucrose. Prepare a new slide.'); } else st.msg = null; render(); });
  $('boricBtn').addEventListener('click', function () { st.boric = !st.boric; if (st.slide) { st.slide = null; say('', 'Medium changed. Prepare a new slide.'); } else st.msg = null; render(); });
  $('prepBtn').addEventListener('click', function () {
    st.slide = P.newSlide((Math.random() * 1e9) >>> 0, st.conc, st.boric); st.t = 0; st.marks = {}; st.tries = 0; st.show = false;
    say('', 'A drop of ' + st.conc + '% sucrose' + (st.boric ? ' + boric acid' : '') + ' on a cavity slide, pollen dusted on from a fresh flower, coverslip placed. Wait, then look under the microscope.'); render();
  });
  $('waitBtn').addEventListener('click', function () {
    if (!st.slide) { say('err', 'Prepare a slide first.'); return render(); }
    if (st.t >= 30) { say('warn', '30 minutes are up for this slide. Record it, or prepare a slide with another medium.'); return render(); }
    st.t += 10; st.marks = {}; st.tries = 0; st.show = false;
    say('', st.t + ' minutes. Tap every pollen grain that has germinated: its pollen tube is at least as long as the grain is wide.'); render();
  });
  $('apparatus').addEventListener('click', function (e) {
    if (!st.slide || !st.t) return; var svg = $('apparatus'); if (!svg.createSVGPoint || !svg.getScreenCTM) return;
    var pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; var m = svg.getScreenCTM(); if (!m) return; var p = pt.matrixTransform(m.inverse()); tapAt(p.x, p.y);
  });
  function tapAt(x, y) { var best = -1, bd = 22; st.slide.grains.forEach(function (g, i) { var d = Math.hypot(g.x - x, g.y - y); if (d < bd) { bd = d; best = i; } }); if (best < 0) return; if (st.marks[best]) delete st.marks[best]; else st.marks[best] = true; st.msg = null; render(); }
  $('recBtn').addEventListener('click', function () {
    if (!st.slide || !st.t) { say('err', 'Prepare a slide and wait at least 10 minutes first.'); return render(); }
    var g = st.slide.grains, fp = [], burst = [], miss = [];
    g.forEach(function (gr, i) { var truth = P.isGerminated(gr, st.t); if (st.marks[i] && !truth) (gr.burst ? burst : fp).push(i); if (!st.marks[i] && truth) miss.push(i); });
    if (fp.length || burst.length || miss.length) {
      st.tries++; st.errs++; if (st.tries >= 2) st.show = true; var m = [];
      if (fp.length) m.push(fp.length + ' marked grain' + (fp.length > 1 ? 's have' : ' has') + ' a tube shorter than the grain’s width (or no tube): not counted as germinated yet.');
      if (burst.length) m.push(burst.length + ' marked grain' + (burst.length > 1 ? 's are' : ' is') + ' burst, not germinated.');
      if (miss.length) m.push(miss.length + ' germinated grain' + (miss.length > 1 ? 's are' : ' is') + ' not marked.');
      say('err', m.join(' ') + (st.show ? ' The germinated grains are now outlined in green.' : ' Look again.')); return render();
    }
    var c = P.count(st.slide, st.t); st.rows.push({ conc: st.conc, boric: st.boric, t: st.t, total: c.total, germ: c.germ }); st.optOk = null;
    say('good', 'Recorded: ' + c.germ + ' of ' + c.total + ' grains germinated at ' + st.t + ' min. ' + (st.t < 30 ? 'Wait and look again, or' : 'Now') + ' try another sucrose concentration.'); render();
  });
  $('pcBtn').addEventListener('click', function () {
    var r = st.rows[st.rows.length - 1], v = parseFloat($('pcIn').value), fb = $('pcFb'); if (!r) { fb.textContent = 'Record a field first.'; return; }
    var pc = r.germ / r.total * 100;
    fb.textContent = isFinite(v) && Math.abs(v - pc) <= 0.15 ? 'Correct: ' + r.germ + ' ÷ ' + r.total + ' × 100 = ' + pc.toFixed(1) + '%.' : isFinite(v) && Math.abs(v - r.germ / (r.total - r.germ) * 100) <= 0.15 ? 'Divide by the TOTAL number of grains (' + r.total + '), not by the ungerminated ones.' : '% germination = germinated grains (' + r.germ + ') ÷ total grains in the field (' + r.total + ') × 100.';
  });
  $('optBtn').addEventListener('click', function () {
    var fb = $('optFb'), v = $('optSel').value, best = bestConc(); if (!v) { fb.textContent = 'Choose a concentration.'; return; }
    if (best == null) { fb.textContent = 'Record 30-minute fields for at least 3 concentrations (without boric acid) first.'; return; }
    st.optOk = +v === best; fb.textContent = st.optOk ? 'Correct: in your results germination is highest at ' + best + '% sucrose. Too little sugar and the grains take in water and burst; too much and water is drawn out of them.' : 'Look at your graph: which concentration gives the highest % germination at 30 minutes?';
    render();
  });
  function at30(boric) { var m = {}; st.rows.forEach(function (r) { if (r.t === 30 && r.boric === boric) m[r.conc] = r.germ / r.total * 100; }); return m; }
  function bestConc() { var m = at30(false), ks = Object.keys(m); if (ks.length < 3) return null; return +ks.reduce(function (a, b) { return m[a] >= m[b] ? a : b; }); }
  $('newSet').addEventListener('click', function () { st.rows = []; st.slide = null; st.t = 0; st.errs = 0; st.optOk = null; $('pcFb').textContent = ''; $('optFb').textContent = ''; say('', 'Table cleared. Choose a medium and prepare a slide.'); render(); });

  function readingChecks() {
    var out = []; if (!st.rows.length) return out;
    var m = at30(false), n = Object.keys(m).length;
    out.push(n >= 3 ? { k: 'ok', t: '30-minute counts for ' + n + ' sucrose concentrations.' } : { k: 'warn', t: '30-minute counts for ' + n + ' concentration' + (n === 1 ? '' : 's') + '. Compare at least 3 (for example 5, 10 and 15%) at the same time.' });
    if (st.errs) out.push({ k: 'warn', t: st.errs + ' count' + (st.errs > 1 ? 's' : '') + ' needed correcting. Use one rule every time: a grain has germinated when its tube is at least as long as the grain is wide.' });
    if (st.rows.some(function (r) { return r.conc === 0; })) out.push({ k: 'tip', t: 'In plain water many grains burst: water enters them by osmosis. Sucrose keeps the medium close to the grain’s own concentration and also feeds the growing tube.' });
    if (st.rows.some(function (r) { return r.conc === 20; })) out.push({ k: 'tip', t: 'At 20% sucrose few grains germinate: the strong solution draws water out of the grain.' });
    var b = at30(true); if (Object.keys(b).length && Object.keys(m).length) out.push({ k: 'tip', t: 'Boric acid improves germination and tube growth: boron helps the pollen tube wall to form.' });
    var times = st.rows.filter(function (r) { return r.conc === st.conc && r.boric === st.boric; }); if (times.length >= 2) out.push({ k: 'ok', t: 'At ' + st.conc + '%: ' + times.map(function (r) { return r.t + ' min ' + (r.germ / r.total * 100).toFixed(0) + '%'; }).join(', ') + '. More grains germinate, and tubes grow longer, with time.' });
    return out;
  }
  function draw() {
    var g = $('app'); while (g.firstChild) g.removeChild(g.firstChild);
    var cx = 206, cy = 212, R = 190;
    g.appendChild(el('rect', { x: 0, y: 0, width: 640, height: 420, fill: '#0b1d29' }));
    g.appendChild(el('circle', { cx: cx, cy: cy, r: R + 6, fill: '#1c2c36' }));
    g.appendChild(el('circle', { cx: cx, cy: cy, r: R, fill: st.slide ? '#eef3e6' : '#e9eef0' }));
    var s = st.slide;
    if (!s) g.appendChild(el('text', { x: cx, y: cy, 'text-anchor': 'middle', class: 'pv' }, 'No slide yet'));
    else if (!st.t) g.appendChild(el('text', { x: cx, y: cy, 'text-anchor': 'middle', class: 'pv' }, 'Pollen just sown: wait'));
    var clip = el('clipPath', { id: 'pfov' }); clip.appendChild(el('circle', { cx: cx, cy: cy, r: R })); g.appendChild(clip); var outer = g; g = el('g', { 'clip-path': 'url(#pfov)' }); outer.appendChild(g);
    if (s) s.grains.forEach(function (gr, i) {
      var L = st.t ? P.tubeLen(gr, st.t) * P.D : 0, x = gr.x, y = gr.y, r = P.D / 2;
      if (L > 0) { var ex = x + Math.cos(gr.dir) * (r + L), ey = y + Math.sin(gr.dir) * (r + L), mx = x + Math.cos(gr.dir + gr.bend) * (r + L / 2), my = y + Math.sin(gr.dir + gr.bend) * (r + L / 2);
        g.appendChild(el('path', { d: 'M' + (x + Math.cos(gr.dir) * r) + ' ' + (y + Math.sin(gr.dir) * r) + ' Q' + mx + ' ' + my + ' ' + ex + ' ' + ey, stroke: '#c9b26a', 'stroke-width': 3.2, fill: 'none', 'stroke-linecap': 'round' })); }
      if (gr.burst && st.t) { g.appendChild(el('path', { d: 'M' + (x - r) + ' ' + y + ' a' + r + ' ' + r + ' 0 1 1 ' + (2 * r) + ' 0 l-3 4 l-3 -5 l-3 5 l-3 -4 z', fill: '#e6c45a', stroke: '#8a6d1d' })); for (var k = 0; k < 6; k++) g.appendChild(el('circle', { cx: x + Math.cos(gr.dir + k) * (r + 4 + k * 2), cy: y + Math.sin(gr.dir + k) * (r + 4 + k * 2), r: 1.4, fill: '#c8a23c' })); }
      else { g.appendChild(el('circle', { cx: x, cy: y, r: r, fill: '#f0c84a', stroke: '#8a6d1d', 'stroke-width': 1.2 })); for (var q = 0; q < 8; q++) { var a = q * Math.PI / 4; g.appendChild(el('circle', { cx: x + Math.cos(a) * (r - 2.5), cy: y + Math.sin(a) * (r - 2.5), r: 1, fill: '#b08a2a' })); } }
      if (st.marks[i]) g.appendChild(el('circle', { cx: x, cy: y, r: r + 5, fill: 'none', stroke: '#1f6fd6', 'stroke-width': 2.6 }));
      if (st.show && P.isGerminated(gr, st.t)) g.appendChild(el('circle', { cx: x, cy: y, r: r + 9, fill: 'none', stroke: '#1f9d55', 'stroke-width': 2, 'stroke-dasharray': '4 3' }));
    });
    g = outer;
    g.appendChild(el('circle', { cx: cx, cy: cy, r: R, fill: 'none', stroke: '#2b3e4a', 'stroke-width': 6 }));
    var px = 430; g.appendChild(el('text', { x: px, y: 40, class: 'lbl' }, 'Medium'));
    g.appendChild(el('text', { x: px, y: 64, class: 'big' }, st.conc + '% sucrose'));
    g.appendChild(el('text', { x: px, y: 86, class: 'lblm' }, st.boric ? '+ boric acid' : 'no boric acid'));
    g.appendChild(el('text', { x: px, y: 128, class: 'lbl' }, 'Time since sowing'));
    g.appendChild(el('text', { x: px, y: 156, class: 'big' }, s ? st.t + ' min' : '–'));
    var marked = Object.keys(st.marks).length;
    g.appendChild(el('text', { x: px, y: 200, class: 'lbl' }, 'Marked as germinated'));
    g.appendChild(el('text', { x: px, y: 228, class: 'big' }, s && st.t ? marked + ' of ' + s.grains.length : '–'));
    // rule picture
    g.appendChild(el('text', { x: px, y: 290, class: 'lbl' }, 'Counts as germinated:'));
    g.appendChild(el('circle', { cx: px + 14, cy: 318, r: 7, fill: '#f0c84a', stroke: '#8a6d1d' })); g.appendChild(el('path', { d: 'M' + (px + 21) + ' 318 h22', stroke: '#c9b26a', 'stroke-width': 3.2, 'stroke-linecap': 'round' }));
    g.appendChild(el('text', { x: px + 52, y: 322, class: 'lblm' }, 'tube ≥ grain width ✓'));
    g.appendChild(el('circle', { cx: px + 14, cy: 350, r: 7, fill: '#f0c84a', stroke: '#8a6d1d' })); g.appendChild(el('path', { d: 'M' + (px + 21) + ' 350 h6', stroke: '#c9b26a', 'stroke-width': 3.2, 'stroke-linecap': 'round' }));
    g.appendChild(el('text', { x: px + 52, y: 354, class: 'lblm' }, 'shorter: not yet ✗'));
  }
  function drawGraph() {
    var cv = $('graph'), dpr = window.devicePixelRatio || 1, W = cv.clientWidth || 600, H = 220; cv.width = W * dpr; cv.height = H * dpr; cv.style.height = H + 'px';
    var c = cv.getContext && cv.getContext('2d'); if (!c) return; c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
    var L = 46, B = H - 40, X = function (k) { return L + 20 + k * (W - L - 50) / 4; }, Y = function (v) { return B - v / 100 * (B - 14); };
    c.strokeStyle = '#8a9aa2'; c.beginPath(); c.moveTo(L, 10); c.lineTo(L, B); c.lineTo(W - 6, B); c.stroke(); c.fillStyle = '#304855'; c.font = '11px "Space Mono", monospace'; c.textAlign = 'right';
    for (var v = 0; v <= 100; v += 25) c.fillText(v + '%', L - 4, Y(v) + 4);
    c.textAlign = 'center'; P.CONC.forEach(function (cc, k) { c.fillText(cc + '%', X(k), B + 16); }); c.fillText('sucrose concentration (30-minute counts)', (L + W) / 2, B + 32);
    [[false, '#2c8f6a'], [true, '#c06a1f']].forEach(function (pair) { var m = at30(pair[0]), pts = P.CONC.map(function (cc, k) { return m[cc] != null ? [X(k), Y(m[cc])] : null; }).filter(Boolean); c.strokeStyle = c.fillStyle = pair[1]; c.lineWidth = 2; c.beginPath(); pts.forEach(function (p, i) { if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }); c.stroke(); pts.forEach(function (p) { c.beginPath(); c.arc(p[0], p[1], 4, 0, 7); c.fill(); }); });
    c.fillStyle = '#2c8f6a'; c.textAlign = 'left'; c.fillText('● sucrose', L + 8, 20); c.fillStyle = '#c06a1f'; c.fillText('● + boric acid', L + 90, 20);
  }
  function render() {
    Array.prototype.forEach.call(document.querySelectorAll('#concChips [data-c]'), function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-c') === st.conc)); });
    $('boricBtn').setAttribute('aria-pressed', String(st.boric)); $('boricBtn').textContent = st.boric ? 'Boric acid: added' : 'Boric acid: none';
    var body = $('obsBody'); body.innerHTML = ''; if (!st.rows.length) body.innerHTML = '<tr class="empty"><td colspan="6">No fields recorded yet</td></tr>';
    st.rows.forEach(function (r, i) { var tr = document.createElement('tr'); [String(i + 1), r.conc + '%' + (r.boric ? ' + boric' : ''), r.t + ' min', String(r.total), String(r.germ), (r.germ / r.total * 100).toFixed(1)].forEach(function (v) { var td = document.createElement('td'); td.textContent = v; tr.appendChild(td); }); body.appendChild(tr); });
    var list = $('checks'), items = readingChecks(); list.innerHTML = '';
    items.forEach(function (c) { var li = document.createElement('li'); li.className = c.k; li.textContent = c.t; list.appendChild(li); }); $('checksH').hidden = !items.length;
    var stt = $('status'), m = st.msg || { kind: '', text: 'Choose a sucrose concentration, prepare a slide, and wait 10 minutes before looking.' }; stt.textContent = m.text; stt.className = 'status' + (m.kind ? ' ' + m.kind : '');
    draw(); drawGraph();
  }
  render();
  if (typeof window !== 'undefined') { window.__pol = st; window.__polTap = tapAt; window.addEventListener('resize', drawGraph); }
})();
