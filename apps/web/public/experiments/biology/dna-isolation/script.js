/* DNA isolation from plant material (Plus Two botany/zoology, biotechnology). */
(function (root) {
  'use strict';
  var MATERIALS = { spinach: { name: 'Spinach leaves', col: '#4f9a3a' }, pea: { name: 'Green peas', col: '#9cc84a' }, papaya: { name: 'Ripe papaya', col: '#f29a3a' } };
  // each step: options [id, label, effect, note]; the first option is the right one
  var STEPS = [
    { id: 'grind', t: 'Grind the material', opts: [
      ['salt', 'Grind with a little water and a pinch of salt', null, 'Grinding breaks the cell walls. Salt (Na⁺) neutralises the negative charges on DNA so that the strands can clump together later.'],
      ['nosalt', 'Grind with water only', 'nosalt', 'Without salt the negatively charged DNA strands repel each other and clump poorly.']] },
    { id: 'det', t: 'Break the membranes', opts: [
      ['gentle', 'Add a little detergent and stir gently', null, 'Detergent dissolves the lipids of the cell membrane and nuclear envelope, releasing DNA. Stirring gently keeps the long DNA molecules from breaking.'],
      ['hard', 'Add detergent and stir fast (or blend)', 'sheared', 'Vigorous mixing breaks (shears) the long DNA molecules into short pieces.'],
      ['none', 'Skip the detergent', 'nodet', 'Without detergent the membranes stay intact and DNA is not released.']] },
    { id: 'filter', t: 'Filter', opts: [
      ['muslin', 'Filter through muslin cloth into a test tube', null, 'Filtering removes cell debris; the DNA stays in the liquid (the filtrate).'],
      ['nofilter', 'Pour everything into the test tube unfiltered', 'debris', 'Pieces of cell wall and tissue are carried over and get mixed with the DNA.']] },
    { id: 'enz', t: 'Remove proteins', opts: [
      ['prot', 'Add a pinch of meat tenderiser (protease) and wait 5 minutes', null, 'DNA in the nucleus is wound around proteins (histones). The protease digests them, freeing the DNA. (RNase may also be added to remove RNA.)'],
      ['noprot', 'Skip this step', 'protein', 'Proteins stay attached to the DNA and precipitate with it as a cloudy, less stringy mass.']] },
    { id: 'eth', t: 'Precipitate the DNA', opts: [
      ['cold', 'Pour ice-cold ethanol slowly down the side of the tube', null, 'Ethanol forms a layer on top. DNA is insoluble in alcohol and precipitates at the boundary; cold ethanol makes it come out faster and more completely.'],
      ['warm', 'Pour room-temperature ethanol slowly down the side', 'warm', 'Warm ethanol precipitates less DNA.'],
      ['mix', 'Pour cold ethanol in quickly and shake', 'mixed', 'If the ethanol mixes with the filtrate there is no clear boundary, and the DNA forms a faint haze instead of threads.']] },
    { id: 'spool', t: 'Collect the DNA', opts: [
      ['spool', 'Wait a few minutes, then wind the threads onto a glass rod', null, 'White, thread-like DNA collects at the boundary and can be wound (spooled) onto a glass rod.']] }];
  function outcome(ch) {
    var f = {}; Object.keys(ch).forEach(function (k) { var st = STEPS.filter(function (s) { return s.id === k; })[0], o = st.opts.filter(function (x) { return x[0] === ch[k]; })[0]; if (o && o[2]) f[o[2]] = true; });
    if (f.nodet) return { amt: 0, kind: 'none', text: 'No DNA: the membranes were not broken, so the DNA stayed inside the nuclei.' };
    var amt = 1; if (f.nosalt) amt *= 0.45; if (f.warm) amt *= 0.45; if (f.mixed) amt *= 0.3;
    var kind = f.mixed ? 'haze' : f.sheared ? 'fluff' : f.protein ? 'cloudy' : 'threads';
    var text = { threads: 'Long white threads of DNA wound onto the rod.', fluff: 'Only short, fluffy white bits: the DNA was broken into pieces.', cloudy: 'A cloudy, sticky white mass: DNA mixed with protein.', haze: 'Just a faint white haze: no layer formed, so the DNA could not be collected.' }[kind];
    if (f.debris) text += ' Green bits of tissue are mixed in.';
    return { amt: amt, kind: kind, debris: !!f.debris, text: (amt < 0.6 && kind !== 'haze' ? 'Not much DNA. ' : '') + text, flags: f };
  }
  var exp = { MATERIALS: MATERIALS, STEPS: STEPS, outcome: outcome };
  if (typeof module !== 'undefined' && module.exports) module.exports = exp; else root.Dna = exp;
})(this);
if (typeof document !== 'undefined') (function () {
  'use strict';
  var D = Dna, $ = function (id) { return document.getElementById(id); }, NS = 'http://www.w3.org/2000/svg';
  var st = { mat: 'spinach', i: 0, ch: {}, trials: [], msg: null, res: null, order: [] };
  function say(k, t) { st.msg = { kind: k, text: t }; }
  function shuffleOpts() { st.order = D.STEPS.map(function (s) { return s.opts.map(function (o, k) { return k; }).sort(function () { return Math.random() - 0.5; }); }); }
  function restart() { st.i = 0; st.ch = {}; st.res = null; shuffleOpts(); }
  function el(tag, at, txt) { var e = document.createElementNS(NS, tag); for (var k in at) e.setAttribute(k, at[k]); if (txt != null) e.textContent = txt; return e; }
  $('matChips').addEventListener('click', function (e) { var b = e.target.closest('[data-m]'); if (!b) return; st.mat = b.getAttribute('data-m'); restart(); say('', 'New start with ' + D.MATERIALS[st.mat].name.toLowerCase() + '.'); render(); });
  $('optBtns').addEventListener('click', function (e) {
    var b = e.target.closest('[data-o]'); if (!b || st.res) return; var s = D.STEPS[st.i], o = s.opts[+b.getAttribute('data-o')];
    st.ch[s.id] = o[0]; st.i++;
    if (st.i >= D.STEPS.length) { st.res = D.outcome(st.ch); var good = Object.keys(st.ch).filter(function (k) { var x = D.STEPS.filter(function (q) { return q.id === k; })[0]; return x.opts[0][0] !== st.ch[k]; }).length === 0;
      st.trials.push({ mat: st.mat, ch: JSON.parse(JSON.stringify(st.ch)), res: st.res, good: good });
      say(st.res.kind === 'threads' && st.res.amt === 1 && !st.res.debris ? 'good' : 'warn', 'Result: ' + st.res.text + (good ? ' Well done: every step was done the right way.' : ' Look at "What went wrong" below, then try again.')); }
    else say(o[2] ? 'warn' : 'good', o[3]);
    render();
  });
  $('againBtn').addEventListener('click', function () { restart(); say('', 'Start again: try to get long, clean threads of DNA.'); render(); });

  function readingChecks() {
    var out = []; if (!st.trials.length) return out; var last = st.trials[st.trials.length - 1];
    D.STEPS.forEach(function (s) { var c = last.ch[s.id], o = s.opts.filter(function (x) { return x[0] === c; })[0]; if (o && o[2]) out.push({ k: 'warn', t: s.t + ': you chose “' + o[1].toLowerCase() + '”. ' + o[3] + ' Better: ' + s.opts[0][1].toLowerCase() + '.' }); });
    if (!out.length) out.push({ k: 'ok', t: 'Every step was done the right way, so the DNA came out as long, clean threads.' });
    out.push({ k: 'tip', t: 'The white threads are millions of DNA molecules clumped together: a single DNA molecule is far too thin to see.' });
    return out;
  }
  /* ---------- drawing ---------- */
  function draw() {
    var g = $('app'); while (g.firstChild) g.removeChild(g.firstChild);
    var col = D.MATERIALS[st.mat].col, i = st.i, ch = st.ch, res = st.res;
    g.appendChild(el('text', { x: 20, y: 26, class: 'lbl' }, i < D.STEPS.length ? 'Step ' + (i + 1) + ' of ' + D.STEPS.length + ': ' + D.STEPS[i].t : 'Finished'));
    var cx = 150;
    if (i <= 1) { // mortar
      g.appendChild(el('path', { d: 'M' + (cx - 90) + ' 250 Q' + cx + ' 380 ' + (cx + 90) + ' 250 Z', fill: '#e9e4da', stroke: '#9d958a', 'stroke-width': 3 }));
      if (i === 0) for (var k = 0; k < 14; k++) g.appendChild(el('ellipse', { cx: cx - 60 + (k * 23) % 120, cy: 262 + (k * 11) % 30, rx: 14, ry: 7, fill: col, transform: 'rotate(' + k * 31 + ' ' + (cx - 60 + (k * 23) % 120) + ' ' + (262 + (k * 11) % 30) + ')' }));
      else { g.appendChild(el('path', { d: 'M' + (cx - 76) + ' 268 Q' + cx + ' 360 ' + (cx + 76) + ' 268 Z', fill: col, opacity: 0.85 })); }
      g.appendChild(el('rect', { x: cx + 30, y: 150, width: 18, height: 120, rx: 8, fill: '#cfc8bb', transform: 'rotate(25 ' + (cx + 39) + ' 210)' }));
      g.appendChild(el('text', { x: cx, y: 400, 'text-anchor': 'middle', class: 'lblm' }, i === 0 ? D.MATERIALS[st.mat].name + ' in a mortar' : 'ground to a paste' + (ch.grind === 'salt' ? ' with salt' : '')));
    } else if (i === 2) { // beaker after detergent
      g.appendChild(el('path', { d: 'M' + (cx - 70) + ' 150 v200 q0 16 16 16 h108 q16 0 16 -16 v-200', fill: 'none', stroke: '#d6e7ef', 'stroke-width': 3 }));
      g.appendChild(el('rect', { x: cx - 68, y: 230, width: 136, height: 134, rx: 12, fill: col, opacity: 0.7 }));
      if (ch.det === 'hard' || ch.det === 'gentle') for (var b = 0; b < (ch.det === 'hard' ? 30 : 6); b++) g.appendChild(el('circle', { cx: cx - 60 + (b * 37) % 120, cy: 224 - (b % 4) * 7, r: 4 + b % 3, fill: 'rgba(255,255,255,.7)' }));
      g.appendChild(el('text', { x: cx, y: 400, 'text-anchor': 'middle', class: 'lblm' }, ch.det === 'none' ? 'no detergent added' : ch.det === 'hard' ? 'stirred hard: lots of foam' : 'detergent stirred in gently'));
    } else { // test tube
      var tx = cx, top = 70, bot = 370, r = 26, fil = ch.filter === 'nofilter' ? col : 'rgba(170,210,140,.75)';
      var ly = 250, ey = 170;
      g.appendChild(el('rect', { x: tx - r, y: ly, width: 2 * r, height: bot - ly - r, fill: fil })); g.appendChild(el('path', { d: 'M' + (tx - r) + ' ' + (bot - r) + ' a' + r + ' ' + r + ' 0 0 0 ' + (2 * r) + ' 0 z', fill: fil }));
      if (ch.filter === 'nofilter') for (var q = 0; q < 10; q++) g.appendChild(el('rect', { x: tx - 20 + (q * 13) % 40, y: ly + 20 + (q * 29) % 90, width: 8, height: 5, fill: '#2f5f22' }));
      if (i === 3 && ch.filter === 'muslin') { g.appendChild(el('path', { d: 'M' + (tx - 70) + ' 40 L' + (tx + 70) + ' 40 L' + (tx + 8) + ' 100 L' + (tx - 8) + ' 100 Z', fill: 'rgba(220,236,245,.15)', stroke: '#d6e7ef', 'stroke-width': 2 })); g.appendChild(el('path', { d: 'M' + (tx - 56) + ' 50 L' + (tx + 56) + ' 50 L' + tx + ' 92 Z', fill: col, opacity: 0.9 })); }
      if (i >= 5 && ch.eth) {
        if (ch.eth === 'mix') g.appendChild(el('rect', { x: tx - r, y: ey, width: 2 * r, height: ly - ey, fill: 'rgba(190,220,170,.45)' }));
        else g.appendChild(el('rect', { x: tx - r, y: ey, width: 2 * r, height: ly - ey, fill: 'rgba(235,245,255,.35)' }));
        if (res && i >= 6) {
          var n = Math.round(14 * res.amt);
          if (res.kind === 'threads') for (var t = 0; t < n; t++) g.appendChild(el('path', { d: 'M' + (tx - 18 + (t * 7) % 36) + ' ' + ly + ' q' + (t % 2 ? 6 : -6) + ' -20 0 -' + (34 + (t * 13) % 30), stroke: '#fff', 'stroke-width': 2, fill: 'none', opacity: 0.95 }));
          if (res.kind === 'fluff') for (var f = 0; f < n; f++) g.appendChild(el('circle', { cx: tx - 18 + (f * 11) % 36, cy: ly - 6 - (f * 7) % 22, r: 2.5, fill: '#fff' }));
          if (res.kind === 'cloudy') g.appendChild(el('ellipse', { cx: tx, cy: ly - 10, rx: 20 * Math.max(0.4, res.amt), ry: 10, fill: 'rgba(255,255,255,.85)' }));
          if (res.kind === 'haze') g.appendChild(el('rect', { x: tx - r, y: ey, width: 2 * r, height: ly - ey, fill: 'rgba(255,255,255,.18)' }));
          // glass rod with spooled DNA
          if (res.kind !== 'none' && res.kind !== 'haze') { g.appendChild(el('line', { x1: tx + 10, y1: 30, x2: tx - 4, y2: ly - 8, stroke: '#d6e7ef', 'stroke-width': 4 })); for (var w = 0; w < Math.round(8 * res.amt); w++) g.appendChild(el('ellipse', { cx: tx + 2 - w * 0.4, cy: ly - 40 - w * 4, rx: res.kind === 'threads' ? 8 : 5, ry: 2.5, fill: 'none', stroke: '#fff', 'stroke-width': 1.6 })); }
        }
      }
      g.appendChild(el('path', { d: 'M' + (tx - r) + ' ' + top + ' L' + (tx - r) + ' ' + (bot - r) + ' a' + r + ' ' + r + ' 0 0 0 ' + (2 * r) + ' 0 L' + (tx + r) + ' ' + top, fill: 'none', stroke: '#d6e7ef', 'stroke-width': 3 }));
      g.appendChild(el('text', { x: tx, y: 404, 'text-anchor': 'middle', class: 'lblm' }, i === 3 ? 'filtrate' : i === 4 ? 'filtrate' + (ch.enz === 'prot' ? ' + protease' : '') : i === 5 ? 'ethanol layer on top' : res ? res.kind === 'threads' ? 'DNA threads spooled' : res.kind === 'none' ? 'nothing at the boundary' : 'at the boundary' : ''));
    }
    // what is happening inside: a cell diagram
    var px = 420, py = 70; g.appendChild(el('text', { x: px - 50, y: 50, class: 'lbl' }, 'Inside the cells'));
    var wall = i < 1, mem = i < 2 || ch.det === 'none', hist = (i < 4 || ch.enz === 'noprot') && ch.det !== 'none';
    var cxc = px + 60, cyc = py + 110;
    if (wall) g.appendChild(el('rect', { x: cxc - 100, y: cyc - 90, width: 200, height: 180, rx: 14, fill: 'none', stroke: '#7cbf5a', 'stroke-width': 6 }));
    else if (i >= 1) for (var bw = 0; bw < 6; bw++) g.appendChild(el('path', { d: 'M' + (cxc - 100 + bw * 36) + ' ' + (cyc - 92 + (bw % 2) * 180) + ' l24 ' + (bw % 2 ? -6 : 6), stroke: '#7cbf5a', 'stroke-width': 5 }));
    if (mem) { g.appendChild(el('rect', { x: cxc - 88, y: cyc - 78, width: 176, height: 156, rx: 12, fill: 'rgba(120,180,100,.15)', stroke: '#cfe0e8', 'stroke-width': 2, 'stroke-dasharray': i >= 2 ? '0' : '0' })); g.appendChild(el('circle', { cx: cxc, cy: cyc, r: 44, fill: 'rgba(200,170,220,.25)', stroke: '#d6c6e8', 'stroke-width': 2 })); }
    var strands = 3; for (var sdx = 0; sdx < strands; sdx++) { var yy = cyc - 20 + sdx * 20; g.appendChild(el('path', { d: 'M' + (cxc - 34) + ' ' + yy + ' q8 -10 17 0 t17 0 t17 0 t17 0', stroke: '#ffde59', 'stroke-width': 2.4, fill: 'none' })); if (hist) for (var hb = 0; hb < 4; hb++) g.appendChild(el('circle', { cx: cxc - 26 + hb * 17, cy: yy, r: 4.5, fill: '#e87a7a' })); }
    var lines = i === 0 ? ['Intact cells: wall, membranes', 'and nucleus enclose the DNA.'] : i === 1 ? ['Grinding has broken', 'the cell walls.'] : i === 2 ? (ch.det === 'none' ? ['Membranes still intact:', 'DNA trapped in the nucleus.'] : ['Detergent dissolved the', 'membranes; DNA released.']) : i <= 3 ? ['DNA (yellow) still wound', 'round proteins (red).'] : hist ? ['Proteins (red) still', 'attached to the DNA.'] : ['Protease removed the proteins:', 'free DNA strands.'];
    lines.forEach(function (l, k) { g.appendChild(el('text', { x: px - 50, y: cyc + 120 + k * 18, class: 'lblm' }, l)); });
    g.appendChild(el('text', { x: px - 50, y: 410, class: 'leg' }, '— DNA   ● protein (histone)'));
  }
  function render() {
    Array.prototype.forEach.call(document.querySelectorAll('#matChips [data-m]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-m') === st.mat)); });
    var s = D.STEPS[st.i];
    $('stepTitle').textContent = s ? 'Step ' + (st.i + 1) + ' of ' + D.STEPS.length + ': ' + s.t + '. Tap what you will do:' : 'Finished. Press "Start again" to improve your result, or change the material.';
    $('optBtns').innerHTML = s ? st.order[st.i].map(function (k) { return '<button type="button" class="btn" data-o="' + k + '">' + s.opts[k][1] + '</button>'; }).join('') : '';
    $('steps').innerHTML = D.STEPS.map(function (x, k) { var c = st.ch[x.id], o = c && x.opts.filter(function (y) { return y[0] === c; })[0]; return '<li class="' + (k < st.i ? 'done' : k === st.i ? 'now' : '') + '"><b>' + (k + 1) + '</b> ' + x.t + '</li>'; }).join('');
    var body = $('obsBody'); body.innerHTML = ''; if (!st.trials.length) body.innerHTML = '<tr class="empty"><td colspan="4">No attempts yet</td></tr>';
    st.trials.forEach(function (t, k) { var tr = document.createElement('tr'); [String(k + 1), D.MATERIALS[t.mat].name, t.good ? 'all steps right' : D.STEPS.filter(function (s2) { return s2.opts[0][0] !== t.ch[s2.id]; }).map(function (s2) { return s2.t.toLowerCase(); }).join(', ') + ' done differently', t.res.text].forEach(function (v) { var td = document.createElement('td'); td.textContent = v; tr.appendChild(td); }); body.appendChild(tr); });
    var list = $('checks'), items = readingChecks(); list.innerHTML = '';
    items.forEach(function (c) { var li = document.createElement('li'); li.className = c.k; li.textContent = c.t; list.appendChild(li); }); $('checksH').hidden = !items.length;
    var stt = $('status'), m = st.msg || { kind: '', text: 'Choose how to do each step. Every choice has a reason: think before you click.' }; stt.textContent = m.text; stt.className = 'status' + (m.kind ? ' ' + m.kind : '');
    draw();
  }
  restart(); render();
  if (typeof window !== 'undefined') window.__dna = st;
})();
