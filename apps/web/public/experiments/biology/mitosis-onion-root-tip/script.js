/* Mitosis in onion root tip (Plus Two botany): stages and mitotic index. */
(function (root) {
  'use strict';
  function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  var STAGES = {
    I: { name: 'Interphase', hint: 'a round nucleus with a nucleolus; chromosomes are not visible as threads' },
    P: { name: 'Prophase', hint: 'chromosomes visible as coiled threads inside the nucleus; the nucleus is still round' },
    M: { name: 'Metaphase', hint: 'no nucleus; chromosomes lie in a line across the middle of the cell (the equatorial plate)' },
    A: { name: 'Anaphase', hint: 'two groups of V-shaped chromosomes moving apart towards opposite ends of the cell' },
    T: { name: 'Telophase', hint: 'two nuclei, one at each end of the cell, often with a cell plate forming in between' } };
  var ORDER = ['I', 'P', 'M', 'A', 'T'];
  var PREP = [
    { id: 'cut', t: 'Cut 1–2 cm long root tips from an onion grown on water', why: 'The dividing cells are in the meristem, just behind the root tip.' },
    { id: 'fix', t: 'Fix the root tips in Farmer’s fluid (acetic acid : alcohol = 1 : 3)', why: 'Fixing kills the cells instantly and preserves them at whatever stage they were in.' },
    { id: 'hcl', t: 'Hydrolyse in 1N HCl at about 60 °C for a few minutes, then wash', why: 'HCl dissolves the middle lamella so the cells separate when squashed, and helps the stain to enter.' },
    { id: 'stain', t: 'Stain with acetocarmine for about 10 minutes', why: 'Acetocarmine stains the chromosomes (and nuclei) dark red so that they can be seen.' },
    { id: 'mount', t: 'Place the tip on a slide in a drop of glycerine and put on a coverslip', why: 'The tip must be mounted under a coverslip before it can be squashed.' },
    { id: 'squash', t: 'Squash gently by tapping the coverslip with the blunt end of a needle', why: 'Squashing spreads the cells into a single layer so that each cell can be seen clearly.' }];
  function newField(seed) {
    var rnd = mulberry32(seed >>> 0), cells = [], R = 186, cx = 206, cy = 212, cw = 54, ch = 36, gap = 3;
    for (var row = -6; row <= 6; row++) {
      var off = (row % 2 ? cw / 2 : 0) + (rnd() - 0.5) * 8;
      for (var col = -5; col <= 5; col++) {
        var x = cx + col * (cw + gap) + off - cw / 2, y = cy + row * (ch + gap) - ch / 2;
        var corners = [[x, y], [x + cw, y], [x, y + ch], [x + cw, y + ch]];
        if (!corners.every(function (p) { return Math.pow(p[0] - cx, 2) + Math.pow(p[1] - cy, 2) < R * R; })) continue;
        var u = rnd(), s = u < 0.8 ? 'I' : u < 0.89 ? 'P' : u < 0.93 ? 'M' : u < 0.955 ? 'A' : 'T';
        cells.push({ x: x, y: y, w: cw, h: ch, s: s, r: rnd() });
      }
    }
    // make sure every field shows some division, but keep interphase the majority
    var div = cells.filter(function (c) { return c.s !== 'I'; }).length;
    for (var k = 0; div < 4 && k < cells.length; k++) { var c = cells[Math.floor(rnd() * cells.length)]; if (c.s === 'I') { c.s = ORDER[1 + Math.floor(rnd() * 4)]; div++; } }
    return { seed: seed, cells: cells, cx: cx, cy: cy, R: R };
  }
  function mitoticIndex(counts) { var tot = 0, d = 0; ORDER.forEach(function (k) { tot += counts[k] || 0; if (k !== 'I') d += counts[k] || 0; }); return tot ? d / tot * 100 : 0; }
  var exp = { mulberry32: mulberry32, STAGES: STAGES, ORDER: ORDER, PREP: PREP, newField: newField, mitoticIndex: mitoticIndex };
  if (typeof module !== 'undefined' && module.exports) module.exports = exp; else root.Mito = exp;
})(this);
if (typeof document !== 'undefined') (function () {
  'use strict';
  var M = Mito, $ = function (id) { return document.getElementById(id); }, NS = 'http://www.w3.org/2000/svg';
  var st = { phase: 'prep', prepDone: [], prepErr: 0, field: null, fno: 1, lab: {}, tries: {}, sel: -1, rows: [], idErr: 0, missTries: 0, showMiss: false, msg: null, miOk: false };
  function say(k, t) { st.msg = { kind: k, text: t }; }
  function newField() { st.field = M.newField((Math.random() * 1e9) >>> 0); st.lab = {}; st.tries = {}; st.sel = -1; st.missTries = 0; st.showMiss = false; }
  function el(tag, at, txt) { var e = document.createElementNS(NS, tag); for (var k in at) e.setAttribute(k, at[k]); if (txt != null) e.textContent = txt; return e; }

  /* ---------- slide preparation ---------- */
  var shuffled = M.PREP.slice().sort(function () { return Math.random() - 0.5; });
  $('prepBtns').addEventListener('click', function (e) {
    var b = e.target.closest('[data-p]'); if (!b || st.phase !== 'prep') return; var id = b.getAttribute('data-p');
    var next = M.PREP[st.prepDone.length];
    if (id === next.id) {
      st.prepDone.push(id); say('good', 'Step ' + st.prepDone.length + ': ' + next.t + '. ' + next.why);
      if (st.prepDone.length === M.PREP.length) { st.phase = 'view'; newField(); say('good', 'The slide is ready. Under the high-power objective you see the squashed meristem cells. Tap a cell to examine it and name its stage.'); }
    } else { st.prepErr++; var p = M.PREP.filter(function (x) { return x.id === id; })[0]; say('err', 'Not yet. "' + p.t + '" comes later. The next step is the one that ' + hintFor(next.id)); }
    render();
  });
  function hintFor(id) { return { cut: 'gives you the material: the actively dividing part of the root.', fix: 'kills and preserves the cells at their stage of division.', hcl: 'softens the tissue so that the cells separate.', stain: 'makes the chromosomes visible.', mount: 'puts the tip on a slide under a coverslip.', squash: 'spreads the cells into a single layer.' }[id]; }

  /* ---------- identifying cells ---------- */
  $('apparatus').addEventListener('click', function (e) {
    if (st.phase !== 'view') return; var svg = $('apparatus'); if (!svg.createSVGPoint || !svg.getScreenCTM) return;
    var pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; var m = svg.getScreenCTM(); if (!m) return; var p = pt.matrixTransform(m.inverse());
    selectAt(p.x, p.y);
  });
  function selectAt(x, y) { var i = st.field.cells.findIndex(function (c) { return x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h; }); if (i < 0) return; st.sel = i; st.msg = null; render(); }
  $('stageBtns').addEventListener('click', function (e) {
    var b = e.target.closest('[data-s]'); if (!b) return; var s = b.getAttribute('data-s');
    if (st.phase !== 'view') return;
    if (st.sel < 0) { say('err', 'First tap a cell in the field of view.'); return render(); }
    var c = st.field.cells[st.sel]; if (st.lab[st.sel]) { say('', 'This cell is already identified as ' + M.STAGES[st.lab[st.sel]].name + '.'); return render(); }
    if (s === c.s) { st.lab[st.sel] = s; say('good', M.STAGES[s].name + ': ' + M.STAGES[s].hint + '.'); }
    else {
      st.tries[st.sel] = (st.tries[st.sel] || 0) + 1; st.idErr++;
      if (st.tries[st.sel] >= 2) { st.lab[st.sel] = c.s; say('warn', 'This cell is in ' + M.STAGES[c.s].name + ': ' + M.STAGES[c.s].hint + '.'); }
      else say('err', 'Not ' + M.STAGES[s].name + ': that stage shows ' + M.STAGES[s].hint + '. Look again at this cell in the magnified view.');
    }
    render();
  });
  $('countBtn').addEventListener('click', function () {
    if (st.phase !== 'view') return;
    var miss = st.field.cells.map(function (c, i) { return c.s !== 'I' && !st.lab[i] ? i : -1; }).filter(function (i) { return i >= 0; });
    if (miss.length) { st.missTries++; if (st.missTries >= 2) st.showMiss = true; say('err', miss.length + ' dividing cell' + (miss.length > 1 ? 's are' : ' is') + ' not identified yet. Look for cells whose nucleus is not a plain round body: threads, a line of chromosomes, two groups, or two nuclei.' + (st.showMiss ? ' They are now outlined with dashes.' : '')); return render(); }
    var counts = { I: 0, P: 0, M: 0, A: 0, T: 0 }; st.field.cells.forEach(function (c) { counts[c.s]++; });
    st.rows.push(counts); st.miOk = false; var n = st.rows.length;
    say('good', 'Field ' + n + ' counted: ' + st.field.cells.length + ' cells, ' + (st.field.cells.length - counts.I) + ' dividing. ' + (n < 3 ? 'Move to a new field: count at least 3 fields (about 100 cells).' : 'Now calculate the mitotic index.'));
    st.phase = 'counted'; render();
  });
  $('moveBtn').addEventListener('click', function () {
    if (st.phase === 'prep') { say('err', 'Prepare the slide first.'); return render(); }
    if (st.phase === 'view' && Object.keys(st.lab).length) { say('warn', 'You moved before counting this field; its identifications are lost.'); }
    else st.msg = null;
    newField(); st.phase = 'view'; st.fno = st.rows.length + 1; render();
  });
  $('checkMI').addEventListener('click', function () {
    var fb = $('miFb'), v = parseFloat($('miIn').value);
    if (!st.rows.length) { fb.textContent = 'Count at least one field first.'; return; }
    var tot = { I: 0, P: 0, M: 0, A: 0, T: 0 }; st.rows.forEach(function (r) { for (var k in tot) tot[k] += r[k]; });
    var N = tot.I + tot.P + tot.M + tot.A + tot.T, D = N - tot.I, mi = M.mitoticIndex(tot);
    if (isFinite(v) && Math.abs(v - mi) <= 0.15) { st.miOk = true; fb.textContent = 'Correct: mitotic index = ' + D + ' ÷ ' + N + ' × 100 = ' + mi.toFixed(1) + '%.'; }
    else if (isFinite(v) && Math.abs(v - D / tot.I * 100) <= 0.15) { st.miOk = false; fb.textContent = 'Divide by the TOTAL number of cells counted (' + N + '), not by the interphase cells.'; }
    else if (isFinite(v) && Math.abs(v - mi / 100) <= 0.002) { st.miOk = false; fb.textContent = 'Express it as a percentage: multiply by 100.'; }
    else { st.miOk = false; fb.textContent = 'Mitotic index = (number of dividing cells: prophase + metaphase + anaphase + telophase) ÷ (total cells counted) × 100.'; }
    render();
  });
  $('newSet').addEventListener('click', function () { st.phase = 'prep'; st.prepDone = []; st.prepErr = 0; st.rows = []; st.idErr = 0; st.miOk = false; st.field = null; $('miIn').value = ''; $('miFb').textContent = ''; shuffled = M.PREP.slice().sort(function () { return Math.random() - 0.5; }); say('', 'A new onion root tip. Prepare the slide step by step.'); render(); });

  function readingChecks() {
    var out = []; if (!st.rows.length && st.phase === 'prep') return out;
    if (st.prepDone.length === M.PREP.length) out.push(st.prepErr ? { k: 'warn', t: 'Slide preparation: ' + st.prepErr + ' step' + (st.prepErr > 1 ? 's' : '') + ' chosen out of order. Remember: cut → fix → hydrolyse → stain → mount → squash.' } : { k: 'ok', t: 'Slide prepared in the right order.' });
    if (!st.rows.length) return out;
    var tot = { I: 0, P: 0, M: 0, A: 0, T: 0 }; st.rows.forEach(function (r) { for (var k in tot) tot[k] += r[k]; }); var N = tot.I + tot.P + tot.M + tot.A + tot.T;
    out.push(st.rows.length >= 3 ? { k: 'ok', t: st.rows.length + ' fields, ' + N + ' cells counted.' } : { k: 'warn', t: 'Only ' + N + ' cells counted. Count at least 3 fields (about 100 cells) for a reliable mitotic index.' });
    out.push(st.idErr ? { k: 'warn', t: st.idErr + ' identification' + (st.idErr > 1 ? 's' : '') + ' needed a second look. Compare with the descriptions under "The stages".' } : { k: 'ok', t: 'Every stage identified correctly first time.' });
    out.push({ k: 'tip', t: 'Most cells (' + Math.round(tot.I / N * 100) + '%) are in interphase: it is by far the longest part of the cell cycle. Among the dividing cells, prophase is commonest (' + tot.P + ') because it is the longest stage of mitosis; anaphase is rarest (' + tot.A + ') because it is the shortest.' });
    return out;
  }

  /* ---------- drawing ---------- */
  function drawCell(g, c, ox, oy, k, idx) {
    var x = ox + (c.x - (ox ? c.x : 0)) , w = c.w * k, h = c.h * k, X = ox ? ox : c.x, Y = oy ? oy : c.y, cx = X + w / 2, cy = Y + h / 2, lw = Math.max(1, k * 0.9);
    g.appendChild(el('rect', { x: X, y: Y, width: w, height: h, rx: 3 * k, fill: '#f6dfe4', stroke: '#8d6a72', 'stroke-width': lw * 1.2 }));
    var red = '#9c1f45', dark = '#5a0f28';
    if (c.s === 'I') { g.appendChild(el('ellipse', { cx: cx + (c.r - 0.5) * 6 * k, cy: cy, rx: 8.5 * k, ry: 8 * k, fill: '#c2557a' })); g.appendChild(el('circle', { cx: cx + (c.r - 0.5) * 6 * k + 2 * k, cy: cy - 1.5 * k, r: 2.2 * k, fill: dark })); for (var i = 0; i < 6; i++) g.appendChild(el('circle', { cx: cx + (c.r - 0.5) * 6 * k + (((i * 37) % 11) - 5) * k, cy: cy + (((i * 23) % 9) - 4) * k, r: 0.7 * k, fill: dark })); }
    else if (c.s === 'P') { g.appendChild(el('ellipse', { cx: cx, cy: cy, rx: 10 * k, ry: 9.5 * k, fill: '#efc3cf', stroke: '#d38aa0', 'stroke-width': lw * 0.6 })); for (var j = 0; j < 5; j++) { var a = j * 1.26 + c.r * 2, ox2 = cx + Math.cos(a) * 3.5 * k, oy2 = cy + Math.sin(a) * 3.5 * k, dx = Math.cos(a + 1.2) * 3.2 * k, dy = Math.sin(a + 1.2) * 3.2 * k, nx = -dy * 0.5, ny = dx * 0.5; g.appendChild(el('path', { d: 'M' + (ox2 - dx) + ' ' + (oy2 - dy) + ' Q' + (ox2 - dx / 2 + nx) + ' ' + (oy2 - dy / 2 + ny) + ' ' + ox2 + ' ' + oy2 + ' T' + (ox2 + dx) + ' ' + (oy2 + dy), stroke: red, 'stroke-width': lw * 1.1, fill: 'none', 'stroke-linecap': 'round' })); } }
    else if (c.s === 'M') { for (var m = -3; m <= 3; m++) g.appendChild(el('line', { x1: cx - 2.5 * k, x2: cx + 2.5 * k, y1: cy + m * 3.2 * k, y2: cy + m * 3.2 * k + (m % 2 ? 0.8 : -0.8) * k, stroke: red, 'stroke-width': lw * 2, 'stroke-linecap': 'round' })); }
    else if (c.s === 'A') { [-1, 1].forEach(function (sd) { var px = cx + sd * (10 + c.r * 3) * k; for (var n = -2; n <= 2; n++) { var yy = cy + n * 6 * k, tip = px + sd * 3.5 * k, tail = px - sd * 2.5 * k; g.appendChild(el('path', { d: 'M' + tail + ' ' + (yy - 2 * k) + ' L' + tip + ' ' + yy + ' L' + tail + ' ' + (yy + 2 * k), stroke: red, 'stroke-width': lw * 1.5, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })); } g.appendChild(el('path', { d: 'M' + (cx + sd * 26 * k) + ' ' + cy + ' L' + (cx + sd * 4 * k) + ' ' + (cy - 12 * k) + ' M' + (cx + sd * 26 * k) + ' ' + cy + ' L' + (cx + sd * 4 * k) + ' ' + (cy + 12 * k), stroke: 'rgba(156,31,69,.18)', 'stroke-width': lw * 0.6, fill: 'none' })); }); }
    else { [-1, 1].forEach(function (sd) { g.appendChild(el('ellipse', { cx: cx + sd * 16 * k, cy: cy, rx: 6 * k, ry: 8 * k, fill: '#b23a63' })); }); g.appendChild(el('line', { x1: cx, x2: cx, y1: Y + 3 * k, y2: Y + h - 3 * k, stroke: '#b08a92', 'stroke-width': lw, 'stroke-dasharray': (2 * k) + ' ' + (2 * k) })); }
  }
  function draw() {
    var g = $('app'); while (g.firstChild) g.removeChild(g.firstChild);
    var f = st.field, cx = 206, cy = 212, R = 190;
    g.appendChild(el('rect', { x: 0, y: 0, width: 640, height: 420, fill: '#0b1d29' }));
    g.appendChild(el('circle', { cx: cx, cy: cy, r: R + 6, fill: '#1c2c36' }));
    var clip = el('clipPath', { id: 'fov' }); clip.appendChild(el('circle', { cx: cx, cy: cy, r: R })); g.appendChild(clip);
    var fg = el('g', { 'clip-path': 'url(#fov)' }); g.appendChild(fg); fg.appendChild(el('circle', { cx: cx, cy: cy, r: R, fill: '#fbf1ee' }));
    if (st.phase === 'prep') {
      var n = st.prepDone.length;
      fg.appendChild(el('text', { x: cx, y: cy - 10, 'text-anchor': 'middle', class: 'pv' }, n === 0 ? 'No slide yet' : 'Preparing the slide…'));
      fg.appendChild(el('text', { x: cx, y: cy + 14, 'text-anchor': 'middle', class: 'pvm' }, n + ' of ' + M.PREP.length + ' steps done'));
      if (n >= 1) { fg.appendChild(el('rect', { x: cx - 70, y: cy + 40, width: 140, height: 18, rx: 9, fill: n >= 4 ? '#b23a63' : '#efe5d0' })); fg.appendChild(el('path', { d: 'M' + (cx + 70) + ' ' + (cy + 40) + ' q18 9 0 18', fill: n >= 4 ? '#7d1838' : '#e2d3b2' })); }
    } else if (f) {
      f.cells.forEach(function (c, i) {
        drawCell(fg, c, 0, 0, 1, i);
        if (st.lab[i]) fg.appendChild(el('text', { x: c.x + 3, y: c.y + 10, class: 'tag' }, st.lab[i]));
        if (st.showMiss && c.s !== 'I' && !st.lab[i]) fg.appendChild(el('rect', { x: c.x - 1, y: c.y - 1, width: c.w + 2, height: c.h + 2, fill: 'none', stroke: '#1f6fd6', 'stroke-width': 2, 'stroke-dasharray': '4 3' }));
      });
      if (st.sel >= 0) { var s = f.cells[st.sel]; fg.appendChild(el('rect', { x: s.x - 2, y: s.y - 2, width: s.w + 4, height: s.h + 4, fill: 'none', stroke: '#ffb800', 'stroke-width': 3 })); }
    }
    g.appendChild(el('circle', { cx: cx, cy: cy, r: R, fill: 'none', stroke: '#2b3e4a', 'stroke-width': 6 }));
    // magnified view
    var mx = 428, my = 40, mw = 196, mh = 150;
    g.appendChild(el('text', { x: mx, y: my - 12, class: 'lbl' }, st.phase === 'prep' ? 'Slide preparation' : 'Selected cell (magnified)'));
    g.appendChild(el('rect', { x: mx, y: my, width: mw, height: mh, rx: 10, fill: '#fbf1ee' }));
    if (f && st.sel >= 0) { var c = f.cells[st.sel], k = 3.3; drawCell(g, c, mx + (mw - c.w * k) / 2, my + (mh - c.h * k) / 2, k); g.appendChild(el('text', { x: mx + mw / 2, y: my + mh + 22, 'text-anchor': 'middle', class: 'lblb' }, st.lab[st.sel] ? M.STAGES[st.lab[st.sel]].name : 'Which stage?')); }
    else g.appendChild(el('text', { x: mx + mw / 2, y: my + mh / 2 + 4, 'text-anchor': 'middle', class: 'pvm' }, st.phase === 'prep' ? 'Choose the steps in order' : 'Tap a cell in the field'));
    if (f && st.phase !== 'prep') {
      var tally = { I: 0, P: 0, M: 0, A: 0, T: 0 }; Object.keys(st.lab).forEach(function (i) { tally[st.lab[i]]++; });
      M.ORDER.forEach(function (s, i) { g.appendChild(el('text', { x: mx, y: my + mh + 52 + i * 21, class: 'lblm' }, s + ' ' + M.STAGES[s].name + ': ' + tally[s])); });
      g.appendChild(el('text', { x: mx, y: 412, class: 'lblm' }, 'Field ' + (st.rows.length + (st.phase === 'counted' ? 0 : 1)) + ' · ' + f.cells.length + ' cells'));
    }
  }
  function render() {
    var prep = st.phase === 'prep';
    $('prepBox').hidden = !prep; $('idBox').hidden = prep;
    $('prepBtns').innerHTML = shuffled.map(function (p) { var done = st.prepDone.indexOf(p.id) >= 0; return '<button type="button" class="btn sm' + (done ? ' done' : '') + '" data-p="' + p.id + '"' + (done ? ' disabled' : '') + '>' + (done ? (st.prepDone.indexOf(p.id) + 1) + '. ' : '') + p.t + '</button>'; }).join('');
    $('countBtn').disabled = st.phase !== 'view';
    var body = $('obsBody'); body.innerHTML = '';
    if (!st.rows.length) body.innerHTML = '<tr class="empty"><td colspan="8">No fields counted yet</td></tr>';
    var tot = { I: 0, P: 0, M: 0, A: 0, T: 0 };
    st.rows.forEach(function (r, i) { var tr = document.createElement('tr'), N = r.I + r.P + r.M + r.A + r.T; for (var k in tot) tot[k] += r[k];
      [String(i + 1), r.I, r.P, r.M, r.A, r.T, N, N - r.I].forEach(function (v) { var td = document.createElement('td'); td.textContent = String(v); tr.appendChild(td); }); body.appendChild(tr); });
    if (st.rows.length) { var tr = document.createElement('tr'), N = tot.I + tot.P + tot.M + tot.A + tot.T; tr.className = 'tot'; ['Total', tot.I, tot.P, tot.M, tot.A, tot.T, N, N - tot.I].forEach(function (v) { var td = document.createElement('td'); td.textContent = String(v); tr.appendChild(td); }); body.appendChild(tr); }
    var list = $('checks'), items = readingChecks(); list.innerHTML = '';
    items.forEach(function (c) { var li = document.createElement('li'); li.className = c.k; li.textContent = c.t; list.appendChild(li); }); $('checksH').hidden = !items.length;
    var stt = $('status'), m = st.msg || { kind: '', text: prep ? 'Prepare the squash slide: choose the steps in the right order.' : st.phase === 'counted' ? 'Field counted. Move to a new field, or calculate the mitotic index.' : 'Tap a cell, look at it in the magnified view, and name its stage. When every dividing cell is named, count the field.' };
    stt.textContent = m.text; stt.className = 'status' + (m.kind ? ' ' + m.kind : '');
    draw();
  }
  render();
  if (typeof window !== 'undefined') { window.__mito = st; window.__mitoSelect = selectAt; }
})();
