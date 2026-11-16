/* Water analysis (Plus Two botany/zoology, ecology): pH, clarity (transparency) and living organisms. */
(function (root) {
  'use strict';
  function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  var ORG = {
    para: { name: 'Paramecium', hint: 'a slipper-shaped protozoan covered with fine cilia' },
    eug: { name: 'Euglena', hint: 'a green, spindle-shaped cell with a red eyespot and one flagellum' },
    spi: { name: 'Spirogyra', hint: 'a green filament of cells with a spiral, ribbon-like chloroplast' },
    vol: { name: 'Volvox', hint: 'a green, hollow ball made of many small cells' },
    daph: { name: 'Daphnia', hint: 'a small transparent crustacean (water flea) with a dark eye and branched antennae' },
    diat: { name: 'Diatom', hint: 'a golden-brown, boat-shaped cell with fine lines on its silica wall' },
    bact: { name: 'Bacteria', hint: 'very many tiny rods and dots, much smaller than any other organism' } };
  var SAMPLES = [
    { k: 'A', name: 'Tap water', pH: [7, 7.5], tdepth: [40, 40], org: [] },
    { k: 'B', name: 'Pond water', pH: [6.5, 7.5], tdepth: [14, 20], org: ['para', 'eug', 'spi', 'vol', 'daph', 'diat'] },
    { k: 'C', name: 'Drain water', pH: [5.5, 6.5], tdepth: [4, 7], org: ['para', 'bact'] }];
  var CYL = 30;   // cylinder height in cm
  function newSet(seed) {
    var rnd = mulberry32(seed >>> 0), half = function (v) { return Math.round(v * 2) / 2; };
    return SAMPLES.map(function (s, si) {
      var vis = s.tdepth[0] + (s.tdepth[1] - s.tdepth[0]) * rnd();          // depth (cm) at which the mark just disappears
      var items = [], kinds = s.org.slice();
      if (s.k === 'B') kinds = kinds.filter(function () { return rnd() < 0.85; }); if (s.k === 'B' && kinds.length < 4) kinds = s.org.slice(0, 4);
      kinds.forEach(function (k) { var n = k === 'bact' ? 1 : 1 + Math.floor(rnd() * (s.k === 'C' && k === 'para' ? 4 : 2)); for (var i = 0; i < n; i++) items.push({ k: k }); });
      var cx = 206, cy = 212, R = 170, placed = [];
      items.forEach(function (it) { for (var t = 0; t < 300; t++) { var a = rnd() * 2 * Math.PI, r = Math.sqrt(rnd()) * (R - 40), x = cx + r * Math.cos(a), y = cy + r * Math.sin(a); if (placed.every(function (p) { return Math.hypot(p.x - x, p.y - y) > 64; })) { it.x = x; it.y = y; it.rot = rnd() * 180; placed.push(it); break; } } });
      return { k: s.k, name: s.name, pH: half(s.pH[0] + (s.pH[1] - s.pH[0]) * rnd()), vis: vis, items: placed, kinds: kinds };
    });
  }
  // contrast of the mark seen through a column of depth d (0..1); it "disappears" below 0.1
  function contrast(s, d) { return s.vis >= CYL ? Math.max(0.35, 1 - d / 60) : Math.exp(-2.303 * d / s.vis); }
  function visible(s, d) { return contrast(s, d) >= 0.1; }
  var PHCOL = { 4: '#e8452c', 4.5: '#ee6a2a', 5: '#f2902a', 5.5: '#f5b72b', 6: '#f0d330', 6.5: '#c9d935', 7: '#8cc63f', 7.5: '#4fb34f', 8: '#2fa07a', 8.5: '#2d84a8', 9: '#3b5fb5' };
  var exp = { mulberry32: mulberry32, ORG: ORG, SAMPLES: SAMPLES, CYL: CYL, newSet: newSet, contrast: contrast, visible: visible, PHCOL: PHCOL };
  if (typeof module !== 'undefined' && module.exports) module.exports = exp; else root.Wat = exp;
})(this);
if (typeof document !== 'undefined') (function () {
  'use strict';
  var W = Wat, $ = function (id) { return document.getElementById(id); }, NS = 'http://www.w3.org/2000/svg';
  var st = { set: null, cur: 0, test: 'ph', res: {}, depth: 0, lab: {}, tries: {}, sel: -1, errs: 0, q: {}, msg: null };
  function fresh() { st.set = W.newSet((Math.random() * 1e9) >>> 0); st.res = { A: {}, B: {}, C: {} }; st.depth = 0; st.lab = {}; st.tries = {}; st.sel = -1; st.errs = 0; st.q = {}; }
  function say(k, t) { st.msg = { kind: k, text: t }; }
  function el(tag, at, txt) { var e = document.createElementNS(NS, tag); for (var k in at) e.setAttribute(k, at[k]); if (txt != null) e.textContent = txt; return e; }
  var smp = function () { return st.set[st.cur]; };
  function resetView() { st.depth = 0; st.lab = {}; st.tries = {}; st.sel = -1; }
  $('sampleChips').addEventListener('click', function (e) { var b = e.target.closest('[data-i]'); if (!b) return; st.cur = +b.getAttribute('data-i'); resetView(); st.msg = null; buildPanel(); render(); });
  $('testChips').addEventListener('click', function (e) { var b = e.target.closest('[data-t]'); if (!b) return; st.test = b.getAttribute('data-t'); resetView(); st.msg = null; buildPanel(); render(); });
  function buildPanel() {
    var h = '';
    if (st.test === 'ph') h = '<p class="mini">A strip of universal pH paper dipped in the sample. Match its colour with the chart.</p><div class="chips" id="phChips">' + Object.keys(W.PHCOL).sort(function (a, b) { return a - b; }).map(function (p) { return '<button type="button" class="chip" data-ph="' + p + '">' + p + '</button>'; }).join('') + '</div>';
    if (st.test === 'clr') h = '<p class="mini">A tall tube stands on a white card marked with a black cross. Pour the sample in slowly while looking down through it. Stop when the cross just disappears and read the depth of water.</p><label class="slider">Depth of water: <b id="dVal">0 cm</b><input type="range" id="dSl" min="0" max="' + W.CYL + '" step="0.5" value="0"></label><div class="nudges"><button type="button" class="btn sm" data-d="-1">−1 cm</button><button type="button" class="btn sm" data-d="-0.5">−0.5</button><button type="button" class="btn sm" data-d="0.5">+0.5</button><button type="button" class="btn sm" data-d="1">+1 cm</button></div><div class="actrow"><button type="button" class="btn primary" id="goneBtn">The cross has just disappeared</button><button type="button" class="btn" id="fullBtn">Still visible with the tube full</button></div>';
    if (st.test === 'org') h = '<p class="mini">A drop of the sample under the microscope. Tap each organism, then name it.</p><div id="orgBtns">' + Object.keys(W.ORG).map(function (k) { return '<button type="button" class="btn sm" data-o="' + k + '">' + W.ORG[k].name + '</button>'; }).join('') + '</div><div class="actrow"><button type="button" class="btn primary" id="recOrg">Record the organisms in this drop</button></div>';
    $('testPanel').innerHTML = h;
    var pc = $('phChips'); if (pc) pc.addEventListener('click', function (e) { var x = e.target.closest('[data-ph]'); if (!x) return; var v = parseFloat(x.getAttribute('data-ph')), t = smp().pH;
      if (v === t) { st.res[smp().k].ph = t; say('good', 'pH ' + t + (t < 6.5 ? ': acidic. Decaying organic matter in polluted water produces acids.' : t <= 7.5 ? ': close to neutral.' : ': alkaline.')); } else { st.errs++; say('err', 'Compare again: the strip is ' + (v < t ? 'greener' : 'redder') + ' than the colour for pH ' + v + '.'); } render(); });
    var sl = $('dSl'); if (sl) { sl.addEventListener('input', function () { st.depth = parseFloat(sl.value); st.msg = null; render(); });
      Array.prototype.forEach.call(document.querySelectorAll('[data-d]'), function (b) { b.addEventListener('click', function () { st.depth = Math.max(0, Math.min(W.CYL, st.depth + parseFloat(b.getAttribute('data-d')))); sl.value = st.depth; st.msg = null; render(); }); });
      $('goneBtn').addEventListener('click', function () { var s = smp(); if (W.visible(s, st.depth)) { st.errs++; say('err', 'Look again: the cross is still faintly visible at ' + st.depth + ' cm. Pour a little more.'); }
        else if (st.depth - s.vis > 1.5) { st.errs++; say('err', 'The cross had already disappeared at a smaller depth. Pour some out and add water slowly, half a centimetre at a time.'); }
        else { st.res[s.k].clr = st.depth; say('good', 'Transparency: the cross disappears at ' + st.depth + ' cm. The smaller this depth, the more turbid the water.'); } render(); });
      $('fullBtn').addEventListener('click', function () { var s = smp(); if (!W.visible(s, W.CYL)) { st.errs++; say('err', 'With the tube full the cross cannot be seen. Find the depth at which it disappears.'); } else if (st.depth < W.CYL) { say('err', 'Fill the tube to the top (' + W.CYL + ' cm) first.'); } else { st.res[s.k].clr = '> ' + W.CYL; say('good', 'The cross is still clear through ' + W.CYL + ' cm of water: very clear water.'); } render(); }); }
    var ob = $('orgBtns'); if (ob) ob.addEventListener('click', function (e) { var b = e.target.closest('[data-o]'); if (!b) return; var s = smp();
      if (st.sel < 0) { say('err', 'First tap an organism in the field.'); return render(); }
      var it = s.items[st.sel], k = b.getAttribute('data-o'); if (st.lab[st.sel]) return;
      if (k === it.k) { st.lab[st.sel] = k; say('good', W.ORG[k].name + ': ' + W.ORG[k].hint + '.'); }
      else { st.tries[st.sel] = (st.tries[st.sel] || 0) + 1; st.errs++; if (st.tries[st.sel] >= 2) { st.lab[st.sel] = it.k; say('warn', 'This is ' + W.ORG[it.k].name + ': ' + W.ORG[it.k].hint + '.'); } else say('err', 'Not ' + W.ORG[k].name + ' (' + W.ORG[k].hint + '). Look again.'); }
      render(); });
    var ro = $('recOrg'); if (ro) ro.addEventListener('click', function () { var s = smp(), left = s.items.filter(function (it, i) { return !st.lab[i]; }).length;
      if (left) { say('err', left + ' organism' + (left > 1 ? 's are' : ' is') + ' not named yet. Tap each one.'); return render(); }
      var kinds = []; s.items.forEach(function (it) { if (kinds.indexOf(it.k) < 0) kinds.push(it.k); }); st.res[s.k].org = kinds;
      say('good', kinds.length ? kinds.length + ' kind' + (kinds.length > 1 ? 's' : '') + ' of organism recorded: ' + kinds.map(function (k) { return W.ORG[k].name; }).join(', ') + '.' : 'No living organisms seen: treated water is free of visible life.'); render(); });
  }
  $('apparatus').addEventListener('click', function (e) {
    if (st.test !== 'org') return; var svg = $('apparatus'); if (!svg.createSVGPoint || !svg.getScreenCTM) return;
    var pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; var m = svg.getScreenCTM(); if (!m) return; var p = pt.matrixTransform(m.inverse()); tapAt(p.x, p.y);
  });
  function tapAt(x, y) { var s = smp(), best = -1, bd = 40; s.items.forEach(function (it, i) { var d = Math.hypot(it.x - x, it.y - y); if (d < bd) { bd = d; best = i; } }); if (best < 0) return; st.sel = best; st.msg = null; render(); }
  $('qBox').addEventListener('change', function (e) { var s = e.target; if (!s.getAttribute('data-q')) return; st.q[s.getAttribute('data-q')] = s.value; render(); });
  $('newSet').addEventListener('click', function () { fresh(); $('qBox').innerHTML = ''; buildPanel(); say('', 'Fresh samples collected.'); render(); });
  var QS = [['dirty', 'Which sample is the most polluted?', 'C'], ['life', 'Which sample has the greatest variety of life?', 'B'], ['drink', 'Which sample is safest to drink?', 'A']];

  function readingChecks() {
    var out = [], done = 0; st.set.forEach(function (s) { ['ph', 'clr', 'org'].forEach(function (t) { if (st.res[s.k][t] != null) done++; }); });
    if (!done) return out;
    out.push(done === 9 ? { k: 'ok', t: 'All three tests done on all three samples.' } : { k: 'warn', t: done + ' of 9 results so far. Test every sample so that you can compare them.' });
    if (st.errs) out.push({ k: 'warn', t: st.errs + ' reading' + (st.errs > 1 ? 's' : '') + ' or identification' + (st.errs > 1 ? 's' : '') + ' needed correcting.' });
    var C = st.res.C, B = st.res.B;
    if (C.org && B.org) out.push({ k: 'tip', t: 'The drain water is turbid and has few kinds of organisms (mostly bacteria and Paramecium) that tolerate low oxygen. Organic waste is decomposed by bacteria, which use up dissolved oxygen: a high BOD.' });
    if (B.org) out.push({ k: 'tip', t: 'Green algae such as Spirogyra, Volvox and Euglena are producers in the pond; Paramecium and Daphnia are consumers.' });
    return out;
  }
  /* ---------- organisms ---------- */
  function drawOrg(g, it, sel, lab) {
    var x = it.x, y = it.y, gr = el('g', { transform: 'rotate(' + it.rot + ' ' + x + ' ' + y + ')' }); g.appendChild(gr);
    if (it.k === 'para') { gr.appendChild(el('path', { d: 'M' + (x - 26) + ' ' + y + ' C' + (x - 24) + ' ' + (y - 14) + ' ' + (x + 20) + ' ' + (y - 16) + ' ' + (x + 26) + ' ' + (y - 2) + ' C' + (x + 22) + ' ' + (y + 12) + ' ' + (x - 2) + ' ' + (y + 4) + ' ' + (x - 6) + ' ' + (y + 10) + ' C' + (x - 14) + ' ' + (y + 14) + ' ' + (x - 26) + ' ' + (y + 10) + ' ' + (x - 26) + ' ' + y + ' Z', fill: '#cfd9c8', stroke: '#6e7f64', 'stroke-width': 1.4 })); for (var i = 0; i < 22; i++) { var a = i / 22 * 2 * Math.PI; gr.appendChild(el('line', { x1: x + 26 * Math.cos(a), y1: y + 13 * Math.sin(a), x2: x + 30 * Math.cos(a), y2: y + 16 * Math.sin(a), stroke: '#8a9a80', 'stroke-width': 0.8 })); } gr.appendChild(el('ellipse', { cx: x, cy: y - 2, rx: 6, ry: 4, fill: '#9aa88e' })); }
    if (it.k === 'eug') { gr.appendChild(el('path', { d: 'M' + (x - 24) + ' ' + y + ' Q' + x + ' ' + (y - 12) + ' ' + (x + 20) + ' ' + y + ' Q' + x + ' ' + (y + 12) + ' ' + (x - 24) + ' ' + y, fill: '#5fae4a', stroke: '#2f6b24' })); gr.appendChild(el('circle', { cx: x + 14, cy: y - 2, r: 2.4, fill: '#d93a2a' })); gr.appendChild(el('path', { d: 'M' + (x + 20) + ' ' + y + ' q12 -8 22 2', stroke: '#2f6b24', fill: 'none' })); }
    if (it.k === 'spi') { gr.appendChild(el('rect', { x: x - 44, y: y - 7, width: 88, height: 14, rx: 6, fill: '#d9efc9', stroke: '#3f7a2a' })); for (var c = -2; c <= 2; c++) gr.appendChild(el('line', { x1: x + c * 17.6 + 8.8, y1: y - 7, x2: x + c * 17.6 + 8.8, y2: y + 7, stroke: '#3f7a2a' })); var d = 'M' + (x - 44) + ' ' + y; for (var s = 0; s < 8; s++) d += ' q5.5 ' + (s % 2 ? 9 : -9) + ' 11 0'; gr.appendChild(el('path', { d: d, stroke: '#2f8a2a', 'stroke-width': 2.4, fill: 'none' })); }
    if (it.k === 'vol') { gr.appendChild(el('circle', { cx: x, cy: y, r: 20, fill: 'rgba(120,190,90,.35)', stroke: '#3f7a2a' })); for (var v = 0; v < 26; v++) { var a2 = v * 2.4, rr = 17 * Math.sqrt((v % 13 + 1) / 13); gr.appendChild(el('circle', { cx: x + rr * Math.cos(a2), cy: y + rr * Math.sin(a2), r: 1.6, fill: '#2f8a2a' })); } gr.appendChild(el('circle', { cx: x - 6, cy: y + 4, r: 5, fill: 'rgba(60,140,40,.6)' })); }
    if (it.k === 'daph') { gr.appendChild(el('ellipse', { cx: x, cy: y + 4, rx: 16, ry: 22, fill: 'rgba(220,210,170,.6)', stroke: '#8a7a48' })); gr.appendChild(el('circle', { cx: x - 2, cy: y - 14, r: 4, fill: '#222' })); gr.appendChild(el('path', { d: 'M' + (x - 6) + ' ' + (y - 12) + ' l-18 -12 m18 12 l-20 -2 M' + (x + 4) + ' ' + (y - 12) + ' l16 -14 m-16 14 l20 -4', stroke: '#8a7a48', 'stroke-width': 1.6 })); gr.appendChild(el('path', { d: 'M' + x + ' ' + (y + 26) + ' l2 10', stroke: '#8a7a48', 'stroke-width': 1.6 })); }
    if (it.k === 'diat') { gr.appendChild(el('path', { d: 'M' + (x - 26) + ' ' + y + ' Q' + x + ' ' + (y - 11) + ' ' + (x + 26) + ' ' + y + ' Q' + x + ' ' + (y + 11) + ' ' + (x - 26) + ' ' + y, fill: '#c9a04a', stroke: '#7a5a1c' })); for (var l = -4; l <= 4; l++) gr.appendChild(el('line', { x1: x + l * 5, y1: y - 6, x2: x + l * 5, y2: y + 6, stroke: '#8a6a2a', 'stroke-width': 0.7 })); gr.appendChild(el('line', { x1: x - 20, y1: y, x2: x + 20, y2: y, stroke: '#7a5a1c', 'stroke-width': 0.8 })); }
    if (it.k === 'bact') { for (var b = 0; b < 40; b++) { var bx = x + ((b * 37) % 70) - 35, by = y + ((b * 53) % 56) - 28; gr.appendChild(b % 3 ? el('rect', { x: bx, y: by, width: 4, height: 1.6, rx: 0.8, fill: '#6b5a50', transform: 'rotate(' + (b * 41) + ' ' + bx + ' ' + by + ')' }) : el('circle', { cx: bx, cy: by, r: 1, fill: '#6b5a50' })); } }
    if (sel) g.appendChild(el('circle', { cx: x, cy: y, r: 38, fill: 'none', stroke: '#ffb800', 'stroke-width': 2.6 }));
    if (lab) g.appendChild(el('text', { x: x, y: y + 48, 'text-anchor': 'middle', class: 'olab' }, W.ORG[lab].name));
  }
  function draw() {
    var g = $('app'); while (g.firstChild) g.removeChild(g.firstChild); var s = smp();
    g.appendChild(el('text', { x: 20, y: 26, class: 'lbl' }, 'Sample ' + s.k + ': ' + s.name));
    var tint = s.k === 'A' ? 'rgba(200,230,245,.35)' : s.k === 'B' ? 'rgba(110,150,80,.55)' : 'rgba(110,90,60,.75)';
    if (st.test === 'ph') {
      g.appendChild(el('path', { d: 'M60 120 h90 v220 q0 14 -14 14 h-62 q-14 0 -14 -14 z', fill: tint, stroke: '#d6e7ef', 'stroke-width': 2 }));
      g.appendChild(el('rect', { x: 200, y: 110, width: 40, height: 220, rx: 4, fill: '#f5f1e6' })); g.appendChild(el('rect', { x: 200, y: 220, width: 40, height: 110, rx: 4, fill: W.PHCOL[s.pH] }));
      g.appendChild(el('text', { x: 220, y: 352, 'text-anchor': 'middle', class: 'lbl' }, 'pH paper'));
      Object.keys(W.PHCOL).sort(function (a, b) { return a - b; }).forEach(function (p, i) { var yy = 64 + i * 30; g.appendChild(el('rect', { x: 330, y: yy, width: 70, height: 24, rx: 4, fill: W.PHCOL[p] })); g.appendChild(el('text', { x: 412, y: yy + 17, class: 'lbl' }, 'pH ' + p)); });
    }
    if (st.test === 'clr') {
      var tx = 70, tw = 80, base = 380, K = 10, top = base - W.CYL * K, wl = base - st.depth * K;
      g.appendChild(el('rect', { x: tx, y: wl, width: tw, height: base - wl, fill: tint }));
      g.appendChild(el('rect', { x: tx, y: top, width: tw, height: base - top, fill: 'none', stroke: '#d6e7ef', 'stroke-width': 2.5 }));
      for (var c = 0; c <= W.CYL; c += 1) { var yy2 = base - c * K; g.appendChild(el('line', { x1: tx + tw, x2: tx + tw + (c % 5 ? 6 : 12), y1: yy2, y2: yy2, stroke: '#cfe0e8' })); if (c % 5 === 0) g.appendChild(el('text', { x: tx + tw + 16, y: yy2 + 4, class: 'lblm' }, c + ' cm')); }
      g.appendChild(el('rect', { x: tx - 10, y: base, width: tw + 20, height: 8, fill: '#fff' }));
      // view down the tube
      var vx = 420, vy = 210, R = 120, ct = W.contrast(s, st.depth);
      g.appendChild(el('text', { x: vx, y: 64, 'text-anchor': 'middle', class: 'lbl' }, 'Looking down the tube'));
      g.appendChild(el('circle', { cx: vx, cy: vy, r: R, fill: '#f8f8f2' }));
      g.appendChild(el('path', { d: 'M' + (vx - 60) + ' ' + vy + ' h120 M' + vx + ' ' + (vy - 60) + ' v120', stroke: '#111', 'stroke-width': 14, opacity: st.depth ? Math.max(0, (ct - 0.1) / 0.9).toFixed(3) : 1 }));
      if (st.depth) g.appendChild(el('circle', { cx: vx, cy: vy, r: R, fill: s.k === 'A' ? 'rgba(200,230,245,1)' : s.k === 'B' ? 'rgb(150,175,120)' : 'rgb(140,120,90)', opacity: (1 - ct).toFixed(3) }));
      g.appendChild(el('circle', { cx: vx, cy: vy, r: R, fill: 'none', stroke: '#2b3e4a', 'stroke-width': 6 }));
    }
    if (st.test === 'org') {
      var cx = 206, cy = 212, R2 = 190;
      g.appendChild(el('circle', { cx: cx, cy: cy, r: R2 + 6, fill: '#1c2c36' }));
      var clip = el('clipPath', { id: 'wfov' }); clip.appendChild(el('circle', { cx: cx, cy: cy, r: R2 })); g.appendChild(clip);
      var fg = el('g', { 'clip-path': 'url(#wfov)' }); g.appendChild(fg); fg.appendChild(el('circle', { cx: cx, cy: cy, r: R2, fill: s.k === 'C' ? '#ece6da' : '#f2f6ee' }));
      if (s.k === 'C') for (var p = 0; p < 40; p++) fg.appendChild(el('circle', { cx: 40 + (p * 89) % 330, cy: 40 + (p * 53) % 340, r: 2 + p % 3, fill: 'rgba(120,100,70,.35)' }));
      s.items.forEach(function (it, i) { drawOrg(fg, it, i === st.sel, st.lab[i]); });
      if (!s.items.length) fg.appendChild(el('text', { x: cx, y: cy, 'text-anchor': 'middle', class: 'pv' }, 'Nothing living in view'));
      g.appendChild(el('circle', { cx: cx, cy: cy, r: R2, fill: 'none', stroke: '#2b3e4a', 'stroke-width': 6 }));
      var named = Object.keys(st.lab).length; g.appendChild(el('text', { x: 430, y: 60, class: 'lbl' }, 'Named: ' + named + ' of ' + s.items.length));
      if (st.sel >= 0) { g.appendChild(el('text', { x: 430, y: 90, class: 'lblm' }, 'Selected: ' + (st.lab[st.sel] ? W.ORG[st.lab[st.sel]].name : 'which organism?'))); }
    }
  }
  function render() {
    Array.prototype.forEach.call(document.querySelectorAll('#sampleChips [data-i]'), function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-i') === st.cur)); });
    Array.prototype.forEach.call(document.querySelectorAll('#testChips [data-t]'), function (b) { var t = b.getAttribute('data-t'); b.setAttribute('aria-pressed', String(t === st.test)); b.classList.toggle('done', st.res[smp().k][t] != null); });
    if ($('dVal')) $('dVal').textContent = st.depth + ' cm';
    var body = $('obsBody'); body.innerHTML = '';
    st.set.forEach(function (s) { var r = st.res[s.k], tr = document.createElement('tr');
      [s.k + ': ' + s.name, r.ph != null ? String(r.ph) : '…', r.clr != null ? String(r.clr) : '…', r.org ? (r.org.length ? r.org.map(function (k) { return W.ORG[k].name; }).join(', ') : 'none seen') : '…'].forEach(function (v) { var td = document.createElement('td'); td.textContent = v; tr.appendChild(td); }); body.appendChild(tr); });
    var qb = $('qBox'); if (!qb.firstChild) qb.innerHTML = QS.map(function (q) { return '<label>' + q[1] + '<select data-q="' + q[0] + '"><option value="">Choose…</option>' + st.set.map(function (s) { return '<option value="' + s.k + '">' + s.k + ': ' + s.name + '</option>'; }).join('') + '</select></label>'; }).join('');
    var all = st.set.every(function (s) { var r = st.res[s.k]; return r.ph != null && r.clr != null && r.org; });
    $('qFb').textContent = !Object.keys(st.q).length ? '' : !all ? 'Finish all the tests first, then answer from your table.' : QS.map(function (q) { return st.q[q[0]] ? (st.q[q[0]] === q[2] ? '✓ ' : '✗ ') + q[1] : ''; }).filter(Boolean).join(' ');
    var list = $('checks'), items = readingChecks(); list.innerHTML = '';
    items.forEach(function (c) { var li = document.createElement('li'); li.className = c.k; li.textContent = c.t; list.appendChild(li); }); $('checksH').hidden = !items.length;
    var stt = $('status'), m = st.msg || { kind: '', text: 'Choose a water sample and a test.' }; stt.textContent = m.text; stt.className = 'status' + (m.kind ? ' ' + m.kind : '');
    draw();
  }
  fresh(); buildPanel(); render();
  if (typeof window !== 'undefined') { window.__wat = st; window.__watTap = tapAt; }
})();
