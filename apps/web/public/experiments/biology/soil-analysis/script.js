/* Soil analysis (Plus Two botany, ecology): texture, moisture, pH and water holding capacity. */
(function (root) {
  'use strict';
  function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  var SITES = [
    { k: 'A', site: 'River bank', kind: 'sandy', comp: [80, 12, 8], mo: [6, 9], pH: [6.5, 7.5], whc: [24, 34], plants: 'scattered grasses and Casuarina' },
    { k: 'B', site: 'Kitchen garden', kind: 'loamy', comp: [42, 38, 20], mo: [15, 20], pH: [6.0, 7.0], whc: [44, 54], plants: 'vegetables and herbs growing well' },
    { k: 'C', site: 'Paddy field', kind: 'clayey', comp: [18, 30, 52], mo: [26, 33], pH: [5.0, 6.0], whc: [64, 78], plants: 'rice and water-loving weeds' }];
  var r1 = function (v) { return Math.round(v * 10) / 10; }, half = function (v) { return Math.round(v * 2) / 2; };
  function newSet(seed) {
    var rnd = mulberry32(seed >>> 0), U = function (a) { return a[0] + (a[1] - a[0]) * rnd(); };
    return SITES.map(function (s) {
      var sand = s.comp[0] + (rnd() - 0.5) * 8, clay = s.comp[2] + (rnd() - 0.5) * 6, silt = 100 - sand - clay, col = r1(9 + rnd() * 3);   // total settled height, cm
      var hs = r1(col * sand / 100), hc = r1(col * clay / 100), hm = r1(col - hs - hc);
      var W1 = 50, mo = U(s.mo), W2 = Math.round(W1 * (1 - mo / 100) * 100) / 100;
      var Wd = 50, whc = U(s.whc), V1 = 100, V2 = half(V1 - Wd * whc / 100);
      return { k: s.k, site: s.site, kind: s.kind, plants: s.plants, h: { sand: hs, silt: hm, clay: hc }, W1: W1, W2: W2, pH: half(U(s.pH)), Wd: Wd, V1: V1, V2: V2 };
    });
  }
  function textureOf(pc) { return pc.sand >= 70 ? 'sandy' : pc.clay >= 40 ? 'clayey' : 'loamy'; }
  function moisture(s) { return (s.W1 - s.W2) / s.W1 * 100; }
  function whc(s) { return (s.V1 - s.V2) / s.Wd * 100; }
  function percents(h) { var t = h.sand + h.silt + h.clay; return { sand: h.sand / t * 100, silt: h.silt / t * 100, clay: h.clay / t * 100 }; }
  // pH paper colours (universal indicator)
  var PHCOL = { 4: '#e8452c', 4.5: '#ee6a2a', 5: '#f2902a', 5.5: '#f5b72b', 6: '#f0d330', 6.5: '#c9d935', 7: '#8cc63f', 7.5: '#4fb34f', 8: '#2fa07a', 8.5: '#2d84a8', 9: '#3b5fb5' };
  var exp = { mulberry32: mulberry32, SITES: SITES, newSet: newSet, textureOf: textureOf, moisture: moisture, whc: whc, percents: percents, PHCOL: PHCOL };
  if (typeof module !== 'undefined' && module.exports) module.exports = exp; else root.Soil = exp;
})(this);
if (typeof document !== 'undefined') (function () {
  'use strict';
  var S = Soil, $ = function (id) { return document.getElementById(id); }, NS = 'http://www.w3.org/2000/svg';
  var TESTS = [['tex', 'Texture'], ['mo', 'Moisture'], ['ph', 'pH'], ['whc', 'Water holding']];
  var st = { set: null, cur: 0, test: 'tex', res: {}, step: {}, errs: 0, msg: null, q: {} };
  function fresh() { st.set = S.newSet((Math.random() * 1e9) >>> 0); st.res = { A: {}, B: {}, C: {} }; st.step = {}; st.errs = 0; st.q = {}; }
  function say(k, t) { st.msg = { kind: k, text: t }; }
  function el(tag, at, txt) { var e = document.createElementNS(NS, tag); for (var k in at) e.setAttribute(k, at[k]); if (txt != null) e.textContent = txt; return e; }
  var smp = function () { return st.set[st.cur]; }, num = function (id) { return parseFloat(($(id) || {}).value); };
  $('sampleChips').addEventListener('click', function (e) { var b = e.target.closest('[data-i]'); if (!b) return; st.cur = +b.getAttribute('data-i'); st.msg = null; buildPanel(); render(); });
  $('testChips').addEventListener('click', function (e) { var b = e.target.closest('[data-t]'); if (!b) return; st.test = b.getAttribute('data-t'); st.msg = null; buildPanel(); render(); });
  function key() { return smp().k + st.test; }
  function buildPanel() {
    var s = smp(), r = st.res[s.k], h = '';
    if (st.test === 'tex') h = '<p class="mini">Soil shaken with water in a measuring cylinder and left to settle for a day. Sand settles first (bottom), then silt, then clay (top). Read the thickness of each layer on the ruler.</p><div class="readin three"><label>Sand layer (cm)<input id="iSand" inputmode="decimal"></label><label>Silt layer (cm)<input id="iSilt" inputmode="decimal"></label><label>Clay layer (cm)<input id="iClay" inputmode="decimal"></label></div><button type="button" class="btn" id="go1">Check readings</button><div id="texStep2"></div>';
    if (st.test === 'mo') h = '<p class="mini">50.00 g of fresh soil was weighed (W₁), dried in an oven at 105 °C for 24 hours, cooled and weighed again (W₂). Read W₂ on the balance.</p><div class="readin"><label>Moisture (%) = (W₁ − W₂) ÷ W₁ × 100<input id="iMo" inputmode="decimal"></label></div><button type="button" class="btn" id="go1">Check</button>';
    if (st.test === 'ph') h = '<p class="mini">Soil shaken with distilled water (1 : 2.5), allowed to settle and filtered. A strip of universal pH paper was dipped in the filtrate. Match its colour with the chart.</p><div class="chips" id="phChips">' + Object.keys(S.PHCOL).sort(function (a, b) { return a - b; }).map(function (p) { return '<button type="button" class="chip" data-ph="' + p + '">' + p + '</button>'; }).join('') + '</div>';
    if (st.test === 'whc') h = '<p class="mini">50 g of oven-dry soil on a filter paper in a funnel; 100 mL of water poured over it. The water that drains through is collected in the measuring cylinder. Read the volume collected (use the close-up).</p><div class="readin"><label>Water collected (mL)<input id="iV2" inputmode="decimal"></label><label>Water holding capacity (%) = (100 − collected) ÷ 50 × 100<input id="iW" inputmode="decimal"></label></div><button type="button" class="btn" id="go1">Check</button>';
    $('testPanel').innerHTML = h;
    var b = $('go1'); if (b) b.addEventListener('click', check);
    var pc = $('phChips'); if (pc) pc.addEventListener('click', function (e) { var x = e.target.closest('[data-ph]'); if (!x) return; var v = parseFloat(x.getAttribute('data-ph')), t = smp().pH;
      if (v === t) { r.ph = t; say('good', 'pH ' + t + ': ' + (t < 6.5 ? 'acidic soil.' : t <= 7.5 ? 'nearly neutral soil.' : 'alkaline soil.')); } else { st.errs++; say('err', 'Compare again: the strip is ' + (v < t ? 'less red / more green' : 'redder') + ' than the colour for pH ' + v + '.'); } render(); });
    if (st.test === 'tex' && r.texH) showTex2();
  }
  function showTex2() {
    var s = smp(), pc = S.percents(s.h);
    $('texStep2').innerHTML = '<p class="mini">Total = ' + (s.h.sand + s.h.silt + s.h.clay).toFixed(1) + ' cm. Sand ' + pc.sand.toFixed(0) + '%, silt ' + pc.silt.toFixed(0) + '%, clay ' + pc.clay.toFixed(0) + '%. Which texture class?</p><div class="chips" id="texChips"><button type="button" class="chip" data-x="sandy">Sandy</button><button type="button" class="chip" data-x="loamy">Loamy</button><button type="button" class="chip" data-x="clayey">Clayey</button></div>';
    $('texChips').addEventListener('click', function (e) { var x = e.target.closest('[data-x]'); if (!x) return; var v = x.getAttribute('data-x'), t = S.textureOf(pc), r = st.res[s.k];
      if (v === t) { r.tex = t; say('good', 'Right: ' + t + ' soil. ' + (t === 'sandy' ? 'Mostly sand (70% or more).' : t === 'clayey' ? 'Much clay (40% or more).' : 'A good mixture of sand, silt and clay.')); }
      else { st.errs++; say('err', 'Not quite. Use the rule: sand 70% or more → sandy; clay 40% or more → clayey; otherwise (a mixture) → loamy.'); } render(); });
  }
  function check() {
    var s = smp(), r = st.res[s.k];
    if (st.test === 'tex') {
      var a = num('iSand'), b = num('iSilt'), c = num('iClay'), wrong = [];
      if (!(Math.abs(a - s.h.sand) <= 0.11)) wrong.push('sand'); if (!(Math.abs(b - s.h.silt) <= 0.11)) wrong.push('silt'); if (!(Math.abs(c - s.h.clay) <= 0.11)) wrong.push('clay');
      if (wrong.length) { st.errs++; say('err', 'Read again: ' + wrong.join(', ') + '. Each layer’s thickness is the difference between the ruler readings at its top and bottom edges (small divisions are 1 mm = 0.1 cm).'); return render(); }
      r.texH = true; say('good', 'Readings correct. Now decide the texture class.'); showTex2(); return render();
    }
    if (st.test === 'mo') {
      var v = num('iMo'), t = S.moisture(s);
      if (Math.abs(v - t) <= 0.06) { r.mo = t; say('good', 'Moisture = (' + s.W1.toFixed(2) + ' − ' + s.W2.toFixed(2) + ') ÷ ' + s.W1.toFixed(2) + ' × 100 = ' + t.toFixed(2) + '%.'); }
      else { st.errs++; say('err', Math.abs(v - (s.W1 - s.W2)) < 0.02 ? 'That is the loss in mass in grams. Divide by W₁ and multiply by 100.' : 'Moisture % = (W₁ − W₂) ÷ W₁ × 100, with W₁ = ' + s.W1.toFixed(2) + ' g and W₂ read on the balance after drying.'); }
      return render();
    }
    if (st.test === 'whc') {
      var v2 = num('iV2'), w = num('iW'), tw = S.whc(s);
      if (!(Math.abs(v2 - s.V2) <= 0.5)) { st.errs++; say('err', 'Read the cylinder again at the bottom of the meniscus. Small divisions are 1 mL; read to the nearest half.'); return render(); }
      if (Math.abs(w - (100 - v2) / s.Wd * 100) <= 0.3) { r.whc = tw; say('good', 'Water held = 100 − ' + v2 + ' = ' + (100 - v2) + ' mL by 50 g of soil, so water holding capacity = ' + ((100 - v2) / 50 * 100).toFixed(0) + '%.'); }
      else { st.errs++; say('err', 'Water held by the soil = 100 − ' + v2 + ' mL. Water holding capacity = water held ÷ 50 g × 100.'); }
      return render();
    }
  }
  $('qBox').addEventListener('change', function (e) { var s = e.target; if (!s.getAttribute('data-q')) return; st.q[s.getAttribute('data-q')] = s.value; render(); });
  $('newSet').addEventListener('click', function () { fresh(); $('qBox').innerHTML = ''; buildPanel(); say('', 'New soil samples collected from the three sites.'); render(); });

  var QS = [['most', 'Which soil holds the most water?', 'C'], ['crop', 'Which soil is best for most garden crops?', 'B'], ['dry', 'Plants of which site must cope with dry soil?', 'A']];
  function readingChecks() {
    var out = [], done = 0; st.set.forEach(function (s) { var r = st.res[s.k]; ['tex', 'mo', 'ph', 'whc'].forEach(function (t) { if (r[t] != null) done++; }); });
    if (!done) return out;
    out.push(done === 12 ? { k: 'ok', t: 'All four tests done on all three soils.' } : { k: 'warn', t: done + ' of 12 results so far. Do every test on every sample so that you can compare them.' });
    if (st.errs) out.push({ k: 'warn', t: st.errs + ' reading' + (st.errs > 1 ? 's' : '') + ' or calculation' + (st.errs > 1 ? 's' : '') + ' needed correcting.' });
    var A = st.res.A, C = st.res.C;
    if (A.whc != null && C.whc != null) out.push({ k: 'tip', t: 'Clayey soil holds about ' + Math.round(C.whc / A.whc) + ' times as much water as sandy soil: its tiny particles leave very small pores that hold water by capillarity, while water drains quickly through the large pores between sand grains.' });
    if (A.mo != null && C.mo != null) out.push({ k: 'tip', t: 'Moisture content follows water holding capacity: the paddy-field clay was wettest and the river-bank sand driest.' });
    if (C.ph != null) out.push({ k: 'tip', t: 'Many Kerala soils (laterite, paddy fields) are acidic. Farmers add lime to raise the pH.' });
    return out;
  }
  /* ---------- drawing ---------- */
  function draw() {
    var g = $('app'); while (g.firstChild) g.removeChild(g.firstChild); var s = smp();
    g.appendChild(el('text', { x: 20, y: 26, class: 'lbl' }, 'Sample ' + s.k + ': ' + s.site));
    g.appendChild(el('text', { x: 20, y: 44, class: 'lblm' }, 'Plants seen: ' + s.plants));
    if (st.test === 'tex') {
      var x = 170, w = 110, base = 380, K = 26, hs = s.h.sand * K, hm = s.h.silt * K, hc = s.h.clay * K, top = base - hs - hm - hc;
      g.appendChild(el('rect', { x: x, y: 70, width: w, height: base - 70, fill: 'rgba(196,170,120,.25)' }));
      g.appendChild(el('rect', { x: x, y: base - hs, width: w, height: hs, fill: '#d8bd85' })); for (var i = 0; i < hs * 1.4; i++) g.appendChild(el('circle', { cx: x + 5 + (i * 37) % (w - 10), cy: base - 3 - (i * 13) % Math.max(4, hs - 5), r: 1.8, fill: '#a98a4f' }));
      g.appendChild(el('rect', { x: x, y: base - hs - hm, width: w, height: hm, fill: '#9c8467' }));
      g.appendChild(el('rect', { x: x, y: top, width: w, height: hc, fill: '#6b4a32' }));
      g.appendChild(el('rect', { x: x, y: 70, width: w, height: base - 70, fill: 'none', stroke: '#d6e7ef', 'stroke-width': 2.5 }));
      var rx = x + w + 6; g.appendChild(el('rect', { x: rx, y: top - 30, width: 46, height: base - top + 34, fill: '#f4ecd6', rx: 3 }));
      for (var mm = 0; mm <= (base - top + 26) / K * 10; mm++) { var yy = base - mm * K / 10, big = mm % 10 === 0; g.appendChild(el('line', { x1: rx, x2: rx + (big ? 18 : mm % 5 === 0 ? 12 : 7), y1: yy, y2: yy, stroke: '#3b2d14', 'stroke-width': big ? 1.6 : 0.9 })); if (big) g.appendChild(el('text', { x: rx + 22, y: yy + 4, class: 'rul' }, String(mm / 10))); }
      g.appendChild(el('text', { x: rx, y: top - 36, class: 'lblm' }, 'cm'));
      [['clay', top + hc / 2], ['silt', base - hs - hm / 2], ['sand', base - hs / 2]].forEach(function (l) { g.appendChild(el('text', { x: x - 10, y: l[1] + 4, 'text-anchor': 'end', class: 'lbl' }, l[0])); });
      g.appendChild(el('text', { x: 420, y: 120, class: 'lblm' }, 'Settled for 24 hours.'));
      g.appendChild(el('text', { x: 420, y: 140, class: 'lblm' }, 'Ruler zero is at the'));
      g.appendChild(el('text', { x: 420, y: 156, class: 'lblm' }, 'bottom of the soil.'));
    }
    if (st.test === 'mo') {
      function bal(x, label, val, dry) { g.appendChild(el('rect', { x: x, y: 300, width: 170, height: 60, rx: 8, fill: '#d9dee2' })); g.appendChild(el('rect', { x: x + 30, y: 318, width: 110, height: 28, rx: 4, fill: '#1c2a20' })); g.appendChild(el('text', { x: x + 85, y: 338, 'text-anchor': 'middle', class: 'lcd' }, val)); g.appendChild(el('ellipse', { cx: x + 85, cy: 292, rx: 60, ry: 10, fill: '#c9ced2' })); g.appendChild(el('path', { d: 'M' + (x + 45) + ' 290 q40 -' + (dry ? 22 : 30) + ' 80 0 z', fill: dry ? '#b49270' : '#5e4330' })); g.appendChild(el('text', { x: x + 85, y: 386, 'text-anchor': 'middle', class: 'lbl' }, label)); }
      bal(40, 'W₁: fresh soil', s.W1.toFixed(2) + ' g', false); bal(420, 'W₂: after drying', s.W2.toFixed(2) + ' g', true);
      g.appendChild(el('rect', { x: 262, y: 200, width: 110, height: 90, rx: 8, fill: '#5a6670' })); g.appendChild(el('rect', { x: 276, y: 214, width: 82, height: 54, rx: 4, fill: '#ff8a3c', opacity: 0.7 })); g.appendChild(el('text', { x: 317, y: 248, 'text-anchor': 'middle', class: 'lcd2' }, '105 °C'));
      g.appendChild(el('text', { x: 317, y: 188, 'text-anchor': 'middle', class: 'lblm' }, 'oven, 24 hours'));
      g.appendChild(el('path', { d: 'M214 250 h44 M376 250 h40', stroke: '#cfe0e8', 'stroke-width': 2, 'marker-end': 'url(#ar)' }));
    }
    if (st.test === 'ph') {
      var col = S.PHCOL[s.pH]; g.appendChild(el('rect', { x: 120, y: 90, width: 46, height: 230, rx: 4, fill: '#f5f1e6' })); g.appendChild(el('rect', { x: 120, y: 200, width: 46, height: 120, rx: 4, fill: col }));
      g.appendChild(el('text', { x: 143, y: 340, 'text-anchor': 'middle', class: 'lbl' }, 'pH paper'));
      var ks = Object.keys(S.PHCOL).sort(function (a, b) { return a - b; });
      ks.forEach(function (p, i) { var yy = 70 + i * 30; g.appendChild(el('rect', { x: 300, y: yy, width: 70, height: 24, rx: 4, fill: S.PHCOL[p] })); g.appendChild(el('text', { x: 382, y: yy + 17, class: 'lbl' }, 'pH ' + p)); });
      g.appendChild(el('text', { x: 300, y: 60, class: 'lblm' }, 'Colour chart'));
    }
    if (st.test === 'whc') {
      var cx = 150; g.appendChild(el('path', { d: 'M' + (cx - 70) + ' 70 L' + (cx + 70) + ' 70 L' + (cx + 8) + ' 140 L' + (cx + 8) + ' 170 L' + (cx - 8) + ' 170 L' + (cx - 8) + ' 140 Z', fill: 'rgba(220,236,245,.15)', stroke: '#d6e7ef', 'stroke-width': 2 }));
      g.appendChild(el('path', { d: 'M' + (cx - 58) + ' 80 L' + (cx + 58) + ' 80 L' + cx + ' 134 Z', fill: '#6b4a32' }));
      var cy0 = 180, cy1 = 396, Kp = (cy1 - cy0) / 110, yl = cy1 - s.V2 * Kp;
      g.appendChild(el('rect', { x: cx - 22, y: yl, width: 44, height: cy1 - yl, fill: 'rgba(170,140,90,.45)' }));
      g.appendChild(el('rect', { x: cx - 22, y: cy0, width: 44, height: cy1 - cy0, fill: 'none', stroke: '#d6e7ef', 'stroke-width': 2 }));
      for (var v = 0; v <= 100; v += 10) { var y2 = cy1 - v * Kp; g.appendChild(el('line', { x1: cx - 22, x2: cx - 8, y1: y2, y2: y2, stroke: '#d6e7ef' })); g.appendChild(el('text', { x: cx + 26, y: y2 + 4, class: 'lblm' }, String(v))); }
      // close-up
      var zx = 330, zy = 70, zw = 150, zh = 300, kk = 28, mid = zy + zh / 2, yOf = function (val) { return mid - (val - s.V2) * kk; };
      var clip = el('clipPath', { id: 'zcl' }); clip.appendChild(el('rect', { x: zx, y: zy, width: zw, height: zh, rx: 6 })); g.appendChild(clip); var zg = el('g', { 'clip-path': 'url(#zcl)' }); g.appendChild(zg);
      zg.appendChild(el('rect', { x: zx, y: zy, width: zw, height: zh, fill: '#eaf3f6' }));
      zg.appendChild(el('path', { d: 'M' + zx + ' ' + (mid - 4) + ' Q' + (zx + 20) + ' ' + mid + ' ' + (zx + 40) + ' ' + mid + ' L' + (zx + zw - 40) + ' ' + mid + ' Q' + (zx + zw - 20) + ' ' + mid + ' ' + (zx + zw) + ' ' + (mid - 4) + ' L' + (zx + zw) + ' ' + (zy + zh) + ' L' + zx + ' ' + (zy + zh) + ' Z', fill: 'rgba(170,140,90,.5)' }));
      zg.appendChild(el('path', { d: 'M' + zx + ' ' + (mid - 4) + ' Q' + (zx + 20) + ' ' + mid + ' ' + (zx + 40) + ' ' + mid + ' L' + (zx + zw - 40) + ' ' + mid + ' Q' + (zx + zw - 20) + ' ' + mid + ' ' + (zx + zw) + ' ' + (mid - 4), stroke: '#6b4a32', 'stroke-width': 2, fill: 'none' }));
      for (var q = Math.floor(s.V2) - 6; q <= Math.ceil(s.V2) + 6; q++) { var yq = yOf(q), big2 = q % 5 === 0; zg.appendChild(el('line', { x1: zx, x2: zx + (big2 ? 70 : 40), y1: yq, y2: yq, stroke: '#16313f', 'stroke-width': big2 ? 2 : 1.2 })); if (big2) zg.appendChild(el('text', { x: zx + 76, y: yq + 5, class: 'num' }, String(q))); }
      g.appendChild(el('rect', { x: zx, y: zy, width: zw, height: zh, rx: 6, fill: 'none', stroke: '#cfe3ee', 'stroke-width': 2 }));
      g.appendChild(el('text', { x: zx, y: zy - 10, class: 'lbl' }, 'Cylinder close-up (mL)'));
    }
    var defs = el('defs', {}), mk = el('marker', { id: 'ar', markerWidth: 8, markerHeight: 8, refX: 4, refY: 4, orient: 'auto' }); mk.appendChild(el('path', { d: 'M0 0 L8 4 L0 8 z', fill: '#cfe0e8' })); defs.appendChild(mk); g.appendChild(defs);
  }
  function render() {
    Array.prototype.forEach.call(document.querySelectorAll('#sampleChips [data-i]'), function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-i') === st.cur)); });
    Array.prototype.forEach.call(document.querySelectorAll('#testChips [data-t]'), function (b) { var t = b.getAttribute('data-t'), map = { tex: 'tex', mo: 'mo', ph: 'ph', whc: 'whc' }; b.setAttribute('aria-pressed', String(t === st.test)); b.classList.toggle('done', st.res[smp().k][map[t]] != null); });
    var body = $('obsBody'); body.innerHTML = '';
    st.set.forEach(function (s) { var r = st.res[s.k], tr = document.createElement('tr'), pc = S.percents(s.h);
      [s.k + ': ' + s.site, r.tex ? r.tex + ' (sand ' + pc.sand.toFixed(0) + '%, clay ' + pc.clay.toFixed(0) + '%)' : '…', r.mo != null ? r.mo.toFixed(2) : '…', r.ph != null ? String(r.ph) : '…', r.whc != null ? r.whc.toFixed(0) : '…', s.plants].forEach(function (v) { var td = document.createElement('td'); td.textContent = v; tr.appendChild(td); }); body.appendChild(tr); });
    var qb = $('qBox'); if (!qb.firstChild) qb.innerHTML = QS.map(function (q) { return '<label>' + q[1] + '<select data-q="' + q[0] + '"><option value="">Choose…</option>' + st.set.map(function (s) { return '<option value="' + s.k + '">' + s.k + ': ' + s.site + '</option>'; }).join('') + '</select></label>'; }).join('');
    var all = st.set.every(function (s) { var r = st.res[s.k]; return r.tex && r.mo != null && r.ph != null && r.whc != null; });
    $('qFb').textContent = !Object.keys(st.q).length ? '' : !all ? 'Finish all the tests first, then answer from your table.' : QS.map(function (q) { return st.q[q[0]] ? (st.q[q[0]] === q[2] ? '✓ ' : '✗ ') + q[1] + (st.q[q[0]] === q[2] ? '' : ' Look at the ' + (q[0] === 'crop' ? 'texture' : 'water holding capacity') + ' column.') : ''; }).filter(Boolean).join(' ');
    var list = $('checks'), items = readingChecks(); list.innerHTML = '';
    items.forEach(function (c) { var li = document.createElement('li'); li.className = c.k; li.textContent = c.t; list.appendChild(li); }); $('checksH').hidden = !items.length;
    var stt = $('status'), m = st.msg || { kind: '', text: 'Choose a soil sample and a test. Take the reading from the picture and work out the result.' }; stt.textContent = m.text; stt.className = 'status' + (m.kind ? ' ' + m.kind : '');
    draw();
  }
  fresh(); buildPanel(); render();
  if (typeof window !== 'undefined') window.__soil = st;
})();
