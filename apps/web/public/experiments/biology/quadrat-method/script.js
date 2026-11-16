/* Quadrat method (Plus Two botany, ecology): density, frequency and abundance of plant species. */
(function (root) {
  'use strict';
  function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  var FW = 20, FH = 15, Q = 1;   // field 20 m x 15 m, quadrat 1 m x 1 m
  var SPECIES = [
    { k: 'A', name: 'Grass', col: '#3f9a3a' }, { k: 'B', name: 'Clover', col: '#2c6fd6' },
    { k: 'C', name: 'Daisy', col: '#e8b51c' }, { k: 'D', name: 'Thistle', col: '#b0389c' }];
  function poisson(rnd, lam) { var u = Math.max(1e-12, rnd()), v = rnd(), z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); return Math.max(0, Math.round(lam + Math.sqrt(lam) * z)); }
  function newField(seed) {
    var rnd = mulberry32(seed >>> 0), plants = [];
    var dA = 3.5 + 2 * rnd(), dC = 0.6 + 0.5 * rnd(), dD = 0.12 + 0.12 * rnd();
    function scatter(k, d) { var n = poisson(rnd, d * FW * FH); for (var i = 0; i < n; i++) plants.push({ s: k, x: rnd() * FW, y: rnd() * FH }); }
    scatter('A', dA); scatter('C', dC); scatter('D', dD);
    var nc = 5 + Math.floor(rnd() * 3);                                   // clover grows in patches
    for (var c = 0; c < nc; c++) { var cx = 1 + rnd() * (FW - 2), cy = 1 + rnd() * (FH - 2), m = 25 + Math.floor(rnd() * 30), rad = 0.8 + rnd() * 1.2;
      for (var j = 0; j < m; j++) { var a = rnd() * 2 * Math.PI, r = rad * Math.sqrt(rnd()), x = cx + r * Math.cos(a), y = cy + r * Math.sin(a); if (x > 0 && y > 0 && x < FW && y < FH) plants.push({ s: 'B', x: x, y: y }); } }
    return { seed: seed, plants: plants };
  }
  // plants counted in a quadrat whose top-left corner is (x, y): count a plant if its base is inside the frame
  function countIn(field, x, y) {
    var out = { A: 0, B: 0, C: 0, D: 0 };
    field.plants.forEach(function (p) { if (p.x >= x && p.x < x + Q && p.y >= y && p.y < y + Q) out[p.s]++; });
    return out;
  }
  function trueDensity(field) { var out = { A: 0, B: 0, C: 0, D: 0 }; field.plants.forEach(function (p) { out[p.s]++; }); for (var k in out) out[k] /= FW * FH; return out; }
  // results from recorded quadrats (rows: [{A,B,C,D}])
  function analyse(rows) {
    var n = rows.length, out = {};
    SPECIES.forEach(function (sp) {
      var tot = 0, occ = 0; rows.forEach(function (r) { tot += r[sp.k]; if (r[sp.k] > 0) occ++; });
      out[sp.k] = { total: tot, occ: occ, density: n ? tot / n : 0, freq: n ? occ / n * 100 : 0, abundance: occ ? tot / occ : 0 };
    });
    return out;
  }
  var exp = { mulberry32: mulberry32, FW: FW, FH: FH, Q: Q, SPECIES: SPECIES, newField: newField, countIn: countIn, trueDensity: trueDensity, analyse: analyse };
  if (typeof module !== 'undefined' && module.exports) module.exports = exp; else root.Quad = exp;
})(this);
if (typeof document !== 'undefined') (function () {
  'use strict';
  var Q = Quad, $ = function (id) { return document.getElementById(id); }, NS = 'http://www.w3.org/2000/svg';
  var FX = 10, FY = 46, PX = 20, ZX = 428, ZY = 46, ZS = 200, MARG = 0.12;   // field origin, px per m; zoom box
  var st = { f: null, cur: null, tries: 0, rows: [], quads: [], msg: null, calc: {}, sel: 'A', revealed: false, help: false };
  function fresh() { st.f = Q.newField((Math.random() * 1e9) >>> 0); st.cur = null; st.rows = []; st.quads = []; st.calc = {}; st.revealed = false; st.tries = 0; st.help = false; drawField(); clearInputs(); }
  function say(k, t) { st.msg = { kind: k, text: t }; }
  function clearInputs() { Q.SPECIES.forEach(function (sp) { $('n' + sp.k).value = ''; }); }
  function el(tag, at, txt) { var e = document.createElementNS(NS, tag); for (var k in at) e.setAttribute(k, at[k]); if (txt != null) e.textContent = txt; return e; }
  function glyph(g, k, x, y, sz) {
    if (k === 'A') { g.appendChild(el('path', { d: 'M' + x + ' ' + y + ' l' + (-0.5 * sz) + ' ' + (-1.4 * sz) + ' M' + x + ' ' + y + ' l0 ' + (-1.7 * sz) + ' M' + x + ' ' + y + ' l' + (0.5 * sz) + ' ' + (-1.4 * sz), stroke: '#3f9a3a', 'stroke-width': Math.max(1, sz * 0.35), 'stroke-linecap': 'round', fill: 'none' })); return; }
    if (k === 'B') { [[-0.5, -0.3], [0.5, -0.3], [0, 0.45]].forEach(function (o) { g.appendChild(el('circle', { cx: x + o[0] * sz, cy: y + o[1] * sz, r: sz * 0.55, fill: '#2c6fd6' })); }); return; }
    if (k === 'C') { g.appendChild(el('circle', { cx: x, cy: y, r: sz * 0.9, fill: '#ffffff' })); g.appendChild(el('circle', { cx: x, cy: y, r: sz * 0.5, fill: '#e8b51c' })); return; }
    var pts = []; for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4, r = i % 2 ? sz * 0.45 : sz * 1.1; pts.push((x + r * Math.cos(a)).toFixed(1) + ',' + (y + r * Math.sin(a)).toFixed(1)); }
    g.appendChild(el('polygon', { points: pts.join(' '), fill: '#b0389c' }));
  }
  function drawField() {
    var g = $('field'); while (g.firstChild) g.removeChild(g.firstChild);
    g.appendChild(el('rect', { x: FX, y: FY, width: Q.FW * PX, height: Q.FH * PX, rx: 6, fill: '#7fb86a' }));
    st.f.plants.forEach(function (p) { glyph(g, p.s, FX + p.x * PX, FY + p.y * PX, p.s === 'A' ? 1.6 : 1.5); });
    g.appendChild(el('text', { x: FX, y: FY - 10, class: 'lbl' }, 'Field: 20 m × 15 m (tap to place a quadrat)'));
    var sy = FY + Q.FH * PX + 22; g.appendChild(el('path', { d: 'M' + FX + ' ' + (sy - 5) + ' v5 h' + (5 * PX) + ' v-5', stroke: '#cfe0e8', fill: 'none', 'stroke-width': 1.5 })); g.appendChild(el('text', { x: FX + 5 * PX + 8, y: sy + 2, class: 'lblm' }, '5 m  ·  each quadrat is 1 m × 1 m'));
    Q.SPECIES.forEach(function (sp, i) { var ly = ZY + ZS + 34 + i * 26; glyph(g, sp.k, ZX + 14, ly, 7); g.appendChild(el('text', { x: ZX + 34, y: ly + 5, class: 'leg' }, sp.name + ' (' + sp.k + ')')); });
  }
  function overlaps(a, b) { return Math.abs(a.x - b.x) < Q.Q && Math.abs(a.y - b.y) < Q.Q; }
  function place(x, y, how) {
    if (st.cur && st.cur.placed && st.cur.recorded === false && st.tries > 0 && how !== 'move') {}
    x = Math.max(0, Math.min(Q.FW - Q.Q, x)); y = Math.max(0, Math.min(Q.FH - Q.Q, y));
    var q = { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
    if (st.quads.some(function (o) { return overlaps(o, q); })) { say('err', 'That quadrat would overlap one you have already studied. Place it somewhere else.'); return render(); }
    st.cur = q; st.tries = 0; st.help = false; clearInputs();
    say('', 'Quadrat ' + (st.rows.length + 1) + ' placed. Count each species in the close-up and type the numbers.'); render();
  }
  $('apparatus').addEventListener('click', function (e) {
    var svg = $('apparatus'), pt = svg.createSVGPoint ? svg.createSVGPoint() : null; if (!pt || !svg.getScreenCTM) return;
    pt.x = e.clientX; pt.y = e.clientY; var m = svg.getScreenCTM(); if (!m) return; var p = pt.matrixTransform(m.inverse());
    var mx = (p.x - FX) / PX, my = (p.y - FY) / PX; if (mx < 0 || my < 0 || mx > Q.FW || my > Q.FH) return;
    place(mx - Q.Q / 2, my - Q.Q / 2);
  });
  $('throwBtn').addEventListener('click', function () {
    for (var i = 0; i < 200; i++) { var q = { x: Math.random() * (Q.FW - Q.Q), y: Math.random() * (Q.FH - Q.Q) }; if (!st.quads.some(function (o) { return overlaps(o, q); })) return place(q.x, q.y); }
    say('err', 'No free space left for another quadrat.'); render();
  });
  $('recBtn').addEventListener('click', function () {
    if (!st.cur) { say('err', 'Place a quadrat first: tap the field, or throw one at random.'); return render(); }
    var truth = Q.countIn(st.f, st.cur.x, st.cur.y), typed = {}, wrong = [];
    for (var i = 0; i < Q.SPECIES.length; i++) { var sp = Q.SPECIES[i], v = $('n' + sp.k).value.trim(); if (v === '' || !/^\d+$/.test(v)) { say('err', 'Type a whole number for every species (0 if there is none).'); return render(); } typed[sp.k] = +v; if (+v !== truth[sp.k]) wrong.push(sp.name); }
    if (wrong.length) {
      st.tries++; if (st.tries >= 2) st.help = true;
      say('err', 'Count again: ' + wrong.join(', ') + (wrong.length > 1 ? ' are' : ' is') + ' not right. Count a plant only if its base is inside the frame.' + (st.help ? ' The plants inside the frame are now numbered to help you.' : ''));
      return render();
    }
    st.rows.push(truth); st.quads.push(st.cur); st.cur = null; st.revealed = false; clearInputs();
    var n = st.rows.length;
    say('good', 'Quadrat ' + n + ' recorded.' + (n < 10 ? ' Study at least 10 quadrats, spread at random over the whole field.' : ' You have ' + n + ' quadrats: now calculate density, frequency and abundance.'));
    render();
  });
  $('delLast').addEventListener('click', function () { st.rows.pop(); st.quads.pop(); st.calc = {}; st.revealed = false; st.msg = null; render(); });
  $('newSet').addEventListener('click', function () { fresh(); say('', 'A new field. Place quadrats at random and count.'); render(); });
  $('reveal').addEventListener('click', function () { st.revealed = true; render(); });
  $('spChips').addEventListener('click', function (e) { var b = e.target.closest('[data-k]'); if (!b) return; st.sel = b.getAttribute('data-k'); $('cD').value = ''; $('cF').value = ''; $('cA').value = ''; $('calcFb').textContent = ''; render(); });
  var near = function (a, b) { return isFinite(a) && Math.abs(a - b) <= Math.max(0.011, Math.abs(b) * 0.01); };
  $('checkCalc').addEventListener('click', function () {
    var fb = $('calcFb'), n = st.rows.length; if (n < 1) { fb.textContent = 'Record some quadrats first.'; return; }
    var r = Q.analyse(st.rows)[st.sel], sp = Q.SPECIES.filter(function (s) { return s.k === st.sel; })[0];
    var D = parseFloat($('cD').value), F = parseFloat($('cF').value), A = parseFloat($('cA').value), msgs = [];
    if (!near(D, r.density)) msgs.push(near(D, r.abundance) && r.abundance !== r.density ? 'Density divides the total by ALL quadrats studied (' + n + '), not only those where ' + sp.name + ' occurs.' : 'Density = total number of ' + sp.name + ' plants (' + r.total + ') ÷ number of quadrats studied (' + n + ').');
    if (!near(F, r.freq)) msgs.push(near(F, r.freq / 100) ? 'Frequency is a percentage: multiply by 100.' : 'Frequency = (quadrats in which ' + sp.name + ' occurs, ' + r.occ + ') ÷ (quadrats studied, ' + n + ') × 100.');
    if (r.occ === 0) { if (!(A === 0 || isNaN(A))) msgs.push('Abundance cannot be found when the species did not occur in any quadrat: enter 0.'); }
    else if (!near(A, r.abundance)) msgs.push(near(A, r.density) ? 'Abundance divides the total by the number of quadrats in which ' + sp.name + ' occurs (' + r.occ + '), not by all quadrats.' : 'Abundance = total number (' + r.total + ') ÷ quadrats of occurrence (' + r.occ + ').');
    if (msgs.length) { fb.textContent = msgs.join(' '); delete st.calc[st.sel]; }
    else { st.calc[st.sel] = n; fb.textContent = 'Correct for ' + sp.name + '.' + (Object.keys(st.calc).length < 4 ? ' Now choose another species.' : ' All four species done.'); }
    render();
  });

  function readingChecks() {
    var out = [], n = st.rows.length; if (!n) return out;
    out.push(n >= 10 ? { k: 'ok', t: n + ' quadrats studied.' } : { k: 'warn', t: 'Only ' + n + ' quadrat' + (n > 1 ? 's' : '') + '. Study at least 10: with few quadrats the estimate depends heavily on where they happened to fall.' });
    if (n >= 6) {
      var zones = {}; st.quads.forEach(function (q) { zones[(q.x + 0.5 < Q.FW / 2 ? 'L' : 'R') + (q.y + 0.5 < Q.FH / 2 ? 'T' : 'B')] = 1; });
      out.push(Object.keys(zones).length === 4 ? { k: 'ok', t: 'Your quadrats are spread over all parts of the field.' } : { k: 'warn', t: 'All your quadrats are in one part of the field. Place them at random over the whole field, or the sample may not represent it.' });
    }
    var a = Q.analyse(st.rows);
    if (n >= 5 && a.D.occ === 0) out.push({ k: 'tip', t: 'No thistle was found in any quadrat, yet there are thistles in the field. Rare species are easily missed: more quadrats give a better estimate.' });
    if (n >= 8 && a.B.occ > 0 && a.B.abundance > 2.5 * a.B.density) out.push({ k: 'tip', t: 'Clover: frequency is low but abundance is high. It grows in patches (a clumped distribution): where it occurs it is plentiful.' });
    if (n >= 8 && a.A.freq >= 90) out.push({ k: 'tip', t: 'Grass occurs in almost every quadrat (high frequency): it is spread evenly over the field.' });
    var done = Object.keys(st.calc).length; out.push(done === 4 ? { k: 'ok', t: 'Density, frequency and abundance calculated for all four species.' } : { k: 'tip', t: 'Calculated for ' + done + ' of 4 species. Use "Your calculation" for each.' });
    return out;
  }
  function f2(v) { return Number(v).toFixed(2); }
  function render() {
    var g = $('marks'); while (g.firstChild) g.removeChild(g.firstChild);
    st.quads.forEach(function (q, i) { g.appendChild(el('rect', { x: FX + q.x * PX, y: FY + q.y * PX, width: PX, height: PX, fill: 'rgba(255,255,255,.18)', stroke: '#fff', 'stroke-width': 1.6 })); g.appendChild(el('text', { x: FX + q.x * PX + 2, y: FY + q.y * PX - 2, class: 'qn' }, String(i + 1))); });
    if (st.cur) g.appendChild(el('rect', { x: FX + st.cur.x * PX, y: FY + st.cur.y * PX, width: PX, height: PX, fill: 'none', stroke: '#ffde59', 'stroke-width': 2.6 }));
    var z = $('zoom'); while (z.firstChild) z.removeChild(z.firstChild);
    var span = Q.Q + 2 * MARG, k = ZS / span;
    z.appendChild(el('rect', { x: ZX, y: ZY, width: ZS, height: ZS, rx: 8, fill: '#7fb86a' }));
    if (st.cur) {
      var x0 = st.cur.x - MARG, y0 = st.cur.y - MARG, num = 0;
      var clip = el('clipPath', { id: 'zclip' }); clip.appendChild(el('rect', { x: ZX, y: ZY, width: ZS, height: ZS, rx: 8 })); z.appendChild(clip);
      var cg = el('g', { 'clip-path': 'url(#zclip)' }); z.appendChild(cg);
      st.f.plants.forEach(function (p) {
        if (p.x < x0 - 0.1 || p.y < y0 - 0.1 || p.x > x0 + span + 0.1 || p.y > y0 + span + 0.1) return;
        var px = ZX + (p.x - x0) * k, py = ZY + (p.y - y0) * k; glyph(cg, p.s, px, py, 7);
        cg.appendChild(el('circle', { cx: px, cy: py, r: 1.6, fill: '#3b2a18' }));
        if (st.help && p.x >= st.cur.x && p.x < st.cur.x + Q.Q && p.y >= st.cur.y && p.y < st.cur.y + Q.Q) cg.appendChild(el('text', { x: px + 7, y: py - 6, class: 'hn' }, String(++num)));
      });
      z.appendChild(el('rect', { x: ZX + MARG * k, y: ZY + MARG * k, width: Q.Q * k, height: Q.Q * k, fill: 'none', stroke: '#fff', 'stroke-width': 4 }));
      z.appendChild(el('text', { x: ZX, y: ZY - 8, class: 'lbl' }, 'Quadrat ' + (st.rows.length + 1) + ' (1 m × 1 m) close-up'));
    } else {
      z.appendChild(el('text', { x: ZX + ZS / 2, y: ZY + ZS / 2, 'text-anchor': 'middle', class: 'lblm' }, 'Tap the field to place'));
      z.appendChild(el('text', { x: ZX + ZS / 2, y: ZY + ZS / 2 + 16, 'text-anchor': 'middle', class: 'lblm' }, 'a quadrat'));
      z.appendChild(el('text', { x: ZX, y: ZY - 8, class: 'lbl' }, 'Quadrat close-up'));
    }
    var body = $('obsBody'); body.innerHTML = '';
    if (!st.rows.length) body.innerHTML = '<tr class="empty"><td colspan="5">No quadrats yet</td></tr>';
    st.rows.forEach(function (r, i) { var tr = document.createElement('tr'); [String(i + 1), r.A, r.B, r.C, r.D].forEach(function (v) { var td = document.createElement('td'); td.textContent = String(v); tr.appendChild(td); }); body.appendChild(tr); });
    var a = Q.analyse(st.rows), rb = $('resBody'); rb.innerHTML = '';
    Q.SPECIES.forEach(function (sp) { var r = a[sp.k], ok = st.calc[sp.k] === st.rows.length && st.rows.length > 0, tr = document.createElement('tr');
      [sp.name, String(r.total), String(r.occ), ok ? f2(r.density) : '?', ok ? r.freq.toFixed(1) : '?', ok ? (r.occ ? f2(r.abundance) : '–') : '?'].forEach(function (v) { var td = document.createElement('td'); td.textContent = v; tr.appendChild(td); }); rb.appendChild(tr); });
    Array.prototype.forEach.call(document.querySelectorAll('#spChips [data-k]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-k') === st.sel)); b.classList.toggle('done', st.calc[b.getAttribute('data-k')] === st.rows.length && st.rows.length > 0); });
    var list = $('checks'), items = readingChecks(); list.innerHTML = '';
    items.forEach(function (c) { var li = document.createElement('li'); li.className = c.k; li.textContent = c.t; list.appendChild(li); }); $('checksH').hidden = !items.length;
    var rv = $('revealBox');
    if (st.revealed) { rv.hidden = false; if (st.rows.length < 3) rv.textContent = 'Not yet: study at least a few quadrats (10 or more is best), then compare.'; else { var t = Q.trueDensity(st.f); rv.textContent = 'Actual density over the whole field, by counting every plant: ' + Q.SPECIES.map(function (sp) { return sp.name + ' ' + f2(t[sp.k]) + ' (yours ' + f2(a[sp.k].density) + ')'; }).join(', ') + ' per m². ' + (st.rows.length < 10 ? 'With more quadrats your estimates will come closer.' : 'A sample of quadrats gives a good estimate without counting the whole field: that is the point of the method.'); } }
    else rv.hidden = true;
    var stt = $('status'), m = st.msg || { kind: '', text: 'Tap anywhere on the field to place a 1 m × 1 m quadrat (or throw one at random). Then count each species inside it.' }; stt.textContent = m.text; stt.className = 'status' + (m.kind ? ' ' + m.kind : '');
  }
  fresh(); render();
  if (typeof window !== 'undefined') window.__quad = st;
})();
