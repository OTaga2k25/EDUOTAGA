/* Mendelian inheritance with gamete beads: monohybrid and dihybrid crosses (Plus Two botany, genetics). */
(function (root) {
  'use strict';
  // a gamete is a string: mono 'R' or 'r'; di 'RY', 'Ry', 'rY', 'ry'
  var GAMETES = { mono: ['R', 'r'], di: ['RY', 'Ry', 'rY', 'ry'] };
  function genotype(m, f) {   // e.g. 'Rr' or 'RrYy' with dominant allele first in each pair
    var out = '';
    for (var i = 0; i < m.length; i++) { var a = m[i], b = f[i]; out += a === a.toUpperCase() ? a + b : b + a; }
    return out;
  }
  function phenotype(g) {
    var shape = g.indexOf('R') >= 0 ? 'Round' : 'Wrinkled';
    if (g.length === 2) return shape;
    return shape + ' ' + (g.indexOf('Y') >= 0 ? 'yellow' : 'green');
  }
  var PHENO = { mono: ['Round', 'Wrinkled'], di: ['Round yellow', 'Round green', 'Wrinkled yellow', 'Wrinkled green'] };
  var EXPECT = { mono: [3, 1], di: [9, 3, 3, 1] };
  function draw(mode, rnd) { var G = GAMETES[mode]; return { m: G[Math.floor(rnd() * G.length)], f: G[Math.floor(rnd() * G.length)] }; }
  function tally(mode, draws) {
    var ph = {}, gt = {}; PHENO[mode].forEach(function (p) { ph[p] = 0; });
    draws.forEach(function (d) { var g = genotype(d.m, d.f); gt[g] = (gt[g] || 0) + 1; ph[phenotype(g)]++; });
    return { ph: ph, gt: gt, n: draws.length };
  }
  var exp = { GAMETES: GAMETES, PHENO: PHENO, EXPECT: EXPECT, genotype: genotype, phenotype: phenotype, draw: draw, tally: tally };
  if (typeof module !== 'undefined' && module.exports) module.exports = exp; else root.Mend = exp;
})(this);
if (typeof document !== 'undefined') (function () {
  'use strict';
  var M = Mend, $ = function (id) { return document.getElementById(id); }, NS = 'http://www.w3.org/2000/svg', MANUAL = 8;
  var st = { mode: 'mono', draws: [], pending: null, tries: 0, idErr: 0, msg: null, calcOk: false, last: null };
  function fresh(mode) { st.mode = mode || st.mode; $('calcBox').innerHTML = st.mode === 'mono' ? '<label>Observed ratio round : wrinkled = x : 1. Enter x<input id="cR" inputmode="decimal"></label>' : '<label>Expected number of round yellow seeds<input id="cE" inputmode="decimal"></label>'; st.draws = []; st.pending = null; st.tries = 0; st.idErr = 0; st.calcOk = false; st.last = null; $('calcFb').textContent = ''; Array.prototype.forEach.call(document.querySelectorAll('#calcBox input'), function (i) { i.value = ''; }); }
  function say(k, t) { st.msg = { kind: k, text: t }; }
  var rnd = Math.random;
  $('modeChips').addEventListener('click', function (e) { var b = e.target.closest('[data-m]'); if (!b) return; fresh(b.getAttribute('data-m')); st.msg = null; render(); });
  $('drawBtn').addEventListener('click', function () {
    if (st.pending) { say('err', 'First decide the seed type for the pair you just drew.'); return render(); }
    var d = M.draw(st.mode, rnd); st.last = d;
    if (st.draws.length < MANUAL) { st.pending = d; st.tries = 0; say('', 'You drew ' + d.m + ' (male gamete) and ' + d.f + ' (female gamete): genotype ' + M.genotype(d.m, d.f) + '. What kind of seed does this zygote give?'); }
    else { st.draws.push(d); say('', 'Drew ' + d.m + ' × ' + d.f + ' → ' + M.genotype(d.m, d.f) + ' (' + M.phenotype(M.genotype(d.m, d.f)).toLowerCase() + '). Beads returned to the bags.'); }
    render();
  });
  function bulk(n) {
    if (st.draws.length < MANUAL) { say('err', 'Draw and identify the first ' + MANUAL + ' pairs one at a time, so that you see how the genotype decides the seed.'); return render(); }
    if (st.pending) { say('err', 'First decide the seed type for the pair you just drew.'); return render(); }
    for (var i = 0; i < n; i++) { st.last = M.draw(st.mode, rnd); st.draws.push(st.last); }
    st.calcOk = false; say('', n + ' more pairs drawn (each bead returned after drawing). Total: ' + st.draws.length + '.'); render();
  }
  $('draw10').addEventListener('click', function () { bulk(10); });
  $('draw50').addEventListener('click', function () { bulk(50); });
  $('phenoBtns').addEventListener('click', function (e) {
    var b = e.target.closest('[data-p]'); if (!b || !st.pending) return; var p = b.getAttribute('data-p'), g = M.genotype(st.pending.m, st.pending.f), right = M.phenotype(g);
    if (p === right || st.tries >= 1) {
      if (p !== right) { st.idErr++; say('warn', g + ' gives ' + right.toLowerCase() + ' seeds. ' + rule(g)); }
      else say('good', 'Right: ' + g + ' → ' + right.toLowerCase() + '. ' + (st.draws.length + 1 < MANUAL ? 'Return both beads to their bags and draw again.' : 'Now you can draw many pairs at once.'));
      st.draws.push(st.pending); st.pending = null; st.calcOk = false;
    } else { st.tries++; st.idErr++; say('err', 'Not quite. ' + rule(g) + ' Try again.'); }
    render();
  });
  function rule(g) { return 'R (round) is dominant over r (wrinkled)' + (g.length > 2 ? ', and Y (yellow) over y (green)' : '') + ': one dominant allele is enough to show the dominant character.'; }
  $('newSet').addEventListener('click', function () { fresh(); say('', 'Start again: empty table, beads back in the bags.'); render(); });
  var near = function (a, b, tol) { return isFinite(a) && Math.abs(a - b) <= tol; };
  $('checkCalc').addEventListener('click', function () {
    var t = M.tally(st.mode, st.draws), fb = $('calcFb');
    if (t.n < 16) { fb.textContent = 'Draw more pairs first (at least 50 is good).'; return; }
    if (st.mode === 'mono') {
      var R = t.ph.Round, W = t.ph.Wrinkled, v = parseFloat($('cR').value);
      if (!W) { fb.textContent = 'No wrinkled seeds yet: draw more.'; return; }
      var r = R / W;
      if (near(v, r, 0.02)) { st.calcOk = true; fb.textContent = 'Correct: ' + R + ' : ' + W + ' = ' + r.toFixed(2) + ' : 1, close to the expected 3 : 1.'; }
      else if (near(v, W / R, 0.02)) fb.textContent = 'Divide the round count by the wrinkled count (dominant : recessive), not the other way round.';
      else fb.textContent = 'Ratio = number of round seeds (' + R + ') ÷ number of wrinkled seeds (' + W + '), written as x : 1.';
    } else {
      var v2 = parseFloat($('cE').value), e = 9 / 16 * t.n;
      if (near(v2, e, 0.06)) { st.calcOk = true; fb.textContent = 'Correct: expected round yellow = 9/16 × ' + t.n + ' = ' + e.toFixed(1) + '. You observed ' + t.ph['Round yellow'] + '.'; }
      else fb.textContent = 'Of every 16 zygotes, 9 are expected to be round yellow. Expected number = 9 ÷ 16 × total (' + t.n + ').';
    }
    render();
  });

  function readingChecks() {
    var out = [], t = M.tally(st.mode, st.draws); if (!t.n) return out;
    out.push(t.n >= (st.mode === 'mono' ? 50 : 100) ? { k: 'ok', t: t.n + ' zygotes recorded.' } : { k: 'warn', t: 'Only ' + t.n + ' zygotes. Chance plays a big part in small samples: draw at least ' + (st.mode === 'mono' ? 50 : 100) + ' to see the ratio clearly.' });
    if (st.idErr) out.push({ k: 'warn', t: st.idErr + ' seed type' + (st.idErr > 1 ? 's' : '') + ' needed a second try. Remember: a heterozygote (Rr) looks like the dominant homozygote (RR).' });
    var exp = M.EXPECT[st.mode], sum = exp.reduce(function (a, b) { return a + b; }), dev = 0;
    M.PHENO[st.mode].forEach(function (p, i) { dev = Math.max(dev, Math.abs(t.ph[p] - exp[i] / sum * t.n) / (t.n || 1)); });
    if (t.n >= 30) out.push(dev < 0.06 ? { k: 'ok', t: 'Your observed numbers are close to the expected ' + exp.join(' : ') + ' ratio.' } : { k: 'tip', t: 'Your numbers differ from ' + exp.join(' : ') + ' by chance. The more zygotes you count, the closer the ratio comes to the expected one.' });
    if (st.mode === 'mono' && t.n >= 30) { var g = t.gt; out.push({ k: 'tip', t: 'Genotypes: RR ' + (g.RR || 0) + ', Rr ' + (g.Rr || 0) + ', rr ' + (g.rr || 0) + ', close to 1 : 2 : 1. The phenotype ratio is 3 : 1 because RR and Rr both give round seeds.' }); }
    if (st.mode === 'di' && t.n >= 30) out.push({ k: 'tip', t: 'Shape alone: round ' + (t.ph['Round yellow'] + t.ph['Round green']) + ' : wrinkled ' + (t.ph['Wrinkled yellow'] + t.ph['Wrinkled green']) + ', again about 3 : 1. The two characters are inherited independently (law of independent assortment).' });
    return out;
  }

  /* ---------- drawing ---------- */
  function el(tag, at, txt) { var e = document.createElementNS(NS, tag); for (var k in at) e.setAttribute(k, at[k]); if (txt != null) e.textContent = txt; return e; }
  var BEAD = { R: '#b8323c', r: '#f2ede2', RY: '#b8323c', Ry: '#2f6fb7', rY: '#e8a21c', ry: '#f2ede2' };
  function bead(g, x, y, gam, r) { g.appendChild(el('circle', { cx: x, cy: y, r: r, fill: BEAD[gam], stroke: '#2a2a2a', 'stroke-width': 1 })); g.appendChild(el('text', { x: x, y: y + r * 0.35, 'text-anchor': 'middle', class: 'bt', 'font-size': r * (gam.length > 1 ? 0.8 : 1.05), fill: gam[0] === 'r' && (gam === 'r' || gam === 'ry') ? '#2a2a2a' : '#fff' }, gam)); }
  function seed(g, x, y, ph, s) {
    var col = ph.indexOf('green') >= 0 ? '#8cbf4a' : '#f0cc3a', wr = ph.indexOf('Wrinkled') === 0;
    if (!wr) g.appendChild(el('circle', { cx: x, cy: y, r: s, fill: col, stroke: '#6b5a20', 'stroke-width': 1.5 }));
    else { var d = ''; for (var i = 0; i <= 16; i++) { var a = i / 16 * 2 * Math.PI, rr = s * (0.82 + 0.14 * Math.cos(a * 5)); d += (i ? 'L' : 'M') + (x + rr * Math.cos(a)).toFixed(1) + ' ' + (y + rr * Math.sin(a)).toFixed(1); }
      g.appendChild(el('path', { d: d + 'Z', fill: col, stroke: '#6b5a20', 'stroke-width': 1.5 })); for (var j = 0; j < 3; j++) g.appendChild(el('path', { d: 'M' + (x - s * 0.5) + ' ' + (y - s * 0.3 + j * s * 0.3) + ' q' + s * 0.5 + ' ' + (-s * 0.15) + ' ' + s + ' 0', stroke: 'rgba(80,60,20,.5)', fill: 'none' })); }
  }
  function draw() {
    var g = $('app'); while (g.firstChild) g.removeChild(g.firstChild);
    var G = M.GAMETES[st.mode];
    [['♂ gametes (pollen)', 24], ['♀ gametes (egg cells)', 222]].forEach(function (b, k) {
      var y0 = b[1]; g.appendChild(el('text', { x: 24, y: y0 + 4, class: 'lbl' }, b[0]));
      g.appendChild(el('path', { d: 'M24 ' + (y0 + 14) + ' h150 v140 q0 18 -18 18 h-114 q-18 0 -18 -18 z', fill: 'rgba(255,255,255,.08)', stroke: '#cfe0e8', 'stroke-width': 2 }));
      for (var i = 0; i < 20; i++) { var gam = G[(i + Math.floor(i / 5)) % G.length]; bead(g, 42 + (i % 5) * 28 + (Math.floor(i / 5) % 2) * 8, y0 + 34 + Math.floor(i / 5) * 30, gam, 11); }
    });
    var d = st.pending || st.last, mx = 290;
    g.appendChild(el('text', { x: mx, y: 28, 'text-anchor': 'middle', class: 'lbl' }, 'Fertilisation'));
    if (d) {
      bead(g, mx - 40, 82, d.m, 18); bead(g, mx + 40, 82, d.f, 18);
      g.appendChild(el('text', { x: mx, y: 88, 'text-anchor': 'middle', class: 'big' }, '×'));
      g.appendChild(el('path', { d: 'M' + mx + ' 112 v34', stroke: '#cfe0e8', 'stroke-width': 2, 'marker-end': 'url(#arr)' }));
      var gt = M.genotype(d.m, d.f); g.appendChild(el('text', { x: mx, y: 176, 'text-anchor': 'middle', class: 'geno' }, gt));
      if (!st.pending) { seed(g, mx, 240, M.phenotype(gt), 34); g.appendChild(el('text', { x: mx, y: 300, 'text-anchor': 'middle', class: 'lblm' }, M.phenotype(gt).toLowerCase() + ' seed')); }
      else { g.appendChild(el('circle', { cx: mx, cy: 240, r: 34, fill: 'none', stroke: '#9fb3be', 'stroke-dasharray': '5 4', 'stroke-width': 2 })); g.appendChild(el('text', { x: mx, y: 246, 'text-anchor': 'middle', class: 'big' }, '?')); }
    } else g.appendChild(el('text', { x: mx, y: 120, 'text-anchor': 'middle', class: 'lblm' }, 'Draw one bead from each bag'));
    var defs = el('defs', {}), mk = el('marker', { id: 'arr', markerWidth: 8, markerHeight: 8, refX: 4, refY: 4, orient: 'auto' }); mk.appendChild(el('path', { d: 'M0 0 L8 4 L0 8 z', fill: '#cfe0e8' })); defs.appendChild(mk); g.appendChild(defs);
    // Punnett square with counts
    var n = G.length, px = 392, py = 46, cs = n === 2 ? 104 : 54, cnt = {};
    st.draws.forEach(function (x) { var k = x.m + '|' + x.f; cnt[k] = (cnt[k] || 0) + 1; });
    g.appendChild(el('text', { x: px + 30 + n * cs / 2, y: 28, 'text-anchor': 'middle', class: 'lbl' }, 'Punnett square (your counts)'));
    G.forEach(function (gm, i) { bead(g, px + 30 + i * cs + cs / 2, py + 2, gm, n === 2 ? 13 : 11); bead(g, px + 12, py + 26 + i * cs + cs / 2, gm, n === 2 ? 13 : 11); });
    G.forEach(function (gf, r) { G.forEach(function (gm, c) {
      var x = px + 30 + c * cs, y = py + 26 + r * cs, gt = M.genotype(gm, gf), ph = M.phenotype(gt), hl = st.last && st.last.m === gm && st.last.f === gf && !st.pending;
      g.appendChild(el('rect', { x: x, y: y, width: cs, height: cs, fill: ph.indexOf('Round') === 0 ? (ph.indexOf('green') > 0 ? '#dfeecb' : '#fbf0c4') : (ph.indexOf('green') > 0 ? '#cfe3b4' : '#efe2b0'), stroke: hl ? '#ff7a00' : '#7d8a90', 'stroke-width': hl ? 3 : 1 }));
      g.appendChild(el('text', { x: x + cs / 2, y: y + cs * 0.42, 'text-anchor': 'middle', class: n === 2 ? 'pg' : 'pgs' }, gt));
      g.appendChild(el('text', { x: x + cs / 2, y: y + cs * 0.78, 'text-anchor': 'middle', class: n === 2 ? 'pc' : 'pcs' }, String(cnt[gm + '|' + gf] || 0)));
    }); });
    g.appendChild(el('text', { x: px + 30, y: 412, class: 'lblm' }, 'Zygotes: ' + st.draws.length));
  }
  function render() {
    Array.prototype.forEach.call(document.querySelectorAll('#modeChips [data-m]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-m') === st.mode)); });
    $('given').innerHTML = st.mode === 'mono' ? 'Cross: Rr (round) × Rr (round), pea seed shape.<br>Each bag holds equal numbers of R and r beads: the gametes of a heterozygous parent.' : 'Cross: RrYy × RrYy (round yellow × round yellow).<br>Each bag holds equal numbers of RY, Ry, rY and ry beads: the four kinds of gametes.';
    $('phenoBtns').innerHTML = M.PHENO[st.mode].map(function (p) { return '<button type="button" class="btn" data-p="' + p + '"' + (st.pending ? '' : ' disabled') + '>' + p + '</button>'; }).join('');
    $('draw10').disabled = $('draw50').disabled = st.draws.length < MANUAL || !!st.pending;
    var t = M.tally(st.mode, st.draws), exp = M.EXPECT[st.mode], sum = exp.reduce(function (a, b) { return a + b; });
    var body = $('obsBody'); body.innerHTML = '';
    M.PHENO[st.mode].forEach(function (p, i) { var tr = document.createElement('tr'); [p, String(t.ph[p]), exp[i] + '/' + sum, (exp[i] / sum * t.n).toFixed(1)].forEach(function (v) { var td = document.createElement('td'); td.textContent = v; tr.appendChild(td); }); body.appendChild(tr); });
    var list = $('checks'), items = readingChecks(); list.innerHTML = '';
    items.forEach(function (c) { var li = document.createElement('li'); li.className = c.k; li.textContent = c.t; list.appendChild(li); }); $('checksH').hidden = !items.length;
    var stt = $('status'), m = st.msg || { kind: '', text: 'Draw one bead from each bag without looking: one male and one female gamete. Together they form a zygote.' }; stt.textContent = m.text; stt.className = 'status' + (m.kind ? ' ' + m.kind : '');
    draw();
  }
  fresh('mono'); render();
  if (typeof window !== 'undefined') window.__mend = st;
})();
