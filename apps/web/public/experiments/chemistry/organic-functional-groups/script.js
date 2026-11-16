/* Organic analysis (Plus Two chemistry): identify the functional group in an organic compound. */
(function (root) {
  'use strict';
  var GROUPS = {
    alc: { name: 'alcohol', f: '–OH (alcoholic)' }, phe: { name: 'phenol', f: '–OH (phenolic)' }, ald: { name: 'aldehyde', f: '–CHO' },
    ket: { name: 'ketone', f: '>C=O' }, acid: { name: 'carboxylic acid', f: '–COOH' }, amine: { name: 'primary aromatic amine', f: '–NH₂ (aromatic)' } };
  var COMPOUNDS = [
    { k: 'ethanol', name: 'ethanol', g: 'alc', state: 'Colourless liquid', smell: 'pleasant, spirit-like', ali: true, iodo: true },
    { k: 'phenol', name: 'phenol', g: 'phe', state: 'Colourless (slightly pink) crystalline solid', smell: 'characteristic carbolic (phenolic)' },
    { k: 'acetaldehyde', name: 'acetaldehyde', g: 'ald', state: 'Colourless liquid', smell: 'pungent, fruity', ali: true, iodo: true },
    { k: 'benzaldehyde', name: 'benzaldehyde', g: 'ald', state: 'Colourless to pale yellow liquid', smell: 'bitter almonds', aro: true },
    { k: 'acetone', name: 'acetone', g: 'ket', state: 'Colourless liquid', smell: 'sweet, pleasant', iodo: true },
    { k: 'acetic', name: 'acetic acid', g: 'acid', state: 'Colourless liquid', smell: 'vinegar' },
    { k: 'benzoic', name: 'benzoic acid', g: 'acid', state: 'White crystalline solid', smell: 'faint or none', aro: true },
    { k: 'aniline', name: 'aniline', g: 'amine', state: 'Colourless to brownish oily liquid', smell: 'unpleasant, fishy', aro: true }];
  var CLR = '#eef5f8', NONE = 'No characteristic change';
  var TESTS = [
    { id: 'phys', g: 'Preliminary', t: 'Note the physical state, colour and smell',
      run: function (c) { return { obs: c.state + '; smell ' + c.smell, vis: { liq: c.state.indexOf('solid') >= 0 ? null : (c.g === 'amine' ? '#e8d6b0' : CLR), solid: c.state.indexOf('solid') >= 0, smell: c.smell.split(',')[0] } }; },
      inf: ['Preliminary: note it; the tests decide the functional group'], ans: function () { return 0; } },
    { id: 'litmus', g: 'Preliminary', t: 'Test the compound (or its aqueous solution) with blue litmus',
      run: function (c) { return c.g === 'acid' ? { obs: 'Blue litmus turns red', vis: { liq: CLR, litmus: 'red' } } : { obs: 'No change in colour of blue litmus', vis: { liq: CLR, litmus: 'blue' } }; },
      inf: ['Carboxylic acid may be present', 'Carboxylic acid absent'], ans: function (c) { return c.g === 'acid' ? 0 : 1; } },
    { id: 'bicarb', g: 'Confirmatory', t: 'Add sodium bicarbonate solution',
      run: function (c) { return c.g === 'acid' ? { obs: 'Brisk effervescence of a colourless gas (CO₂)', vis: { liq: CLR, bubbles: 3 } } : { obs: 'No effervescence', vis: { liq: CLR } }; },
      inf: ['–COOH confirmed', '–COOH absent'], ans: function (c) { return c.g === 'acid' ? 0 : 1; }, confirms: 'acid' },
    { id: 'fecl3', g: 'Confirmatory', t: 'Add a few drops of neutral FeCl₃ solution',
      run: function (c) { return c.g === 'phe' ? { obs: 'Violet colour', vis: { liq: '#7a3fa8' } } : { obs: 'No violet colour', vis: { liq: '#f3e3a0' } }; },
      inf: ['Phenolic –OH confirmed', 'Phenol absent'], ans: function (c) { return c.g === 'phe' ? 0 : 1; }, confirms: 'phe' },
    { id: 'br2', g: 'Preliminary', t: 'Add bromine water drop by drop',
      run: function (c) { return c.g === 'phe' || c.g === 'amine' ? { obs: 'Bromine water is decolourised and a white precipitate forms', vis: { liq: CLR, ppt: { col: '#f6f6f0', kind: 'fine' } } } : { obs: 'The orange colour of bromine water remains', vis: { liq: '#f0a640' } }; },
      inf: ['Phenol or aromatic amine may be present', 'Phenol and aromatic amine absent'], ans: function (c) { return c.g === 'phe' || c.g === 'amine' ? 0 : 1; } },
    { id: 'dnp', g: 'Preliminary', t: 'Add 2,4-dinitrophenylhydrazine (2,4-DNP) reagent',
      run: function (c) { return c.g === 'ald' || c.g === 'ket' ? { obs: 'Yellow-orange precipitate', vis: { liq: '#f4c86a', ppt: { col: '#f08a1c', kind: 'crystalline' } } } : { obs: 'No precipitate', vis: { liq: '#f4c86a' } }; },
      inf: ['Carbonyl group (aldehyde or ketone) present', 'Carbonyl group absent'], ans: function (c) { return c.g === 'ald' || c.g === 'ket' ? 0 : 1; } },
    { id: 'tollens', g: 'Confirmatory', t: 'Warm with Tollens’ reagent in a water bath',
      run: function (c) { return c.g === 'ald' ? { obs: 'A shining silver mirror on the inner wall of the test tube', vis: { liq: '#d9dde0', mirror: true } } : { obs: 'No silver mirror', vis: { liq: CLR } }; },
      inf: ['Aldehyde confirmed', 'Aldehyde absent'], ans: function (c) { return c.g === 'ald' ? 0 : 1; }, confirms: 'ald' },
    { id: 'fehling', g: 'Confirmatory', t: 'Boil with Fehling’s solution (A + B)',
      run: function (c) { return c.g === 'ald' && c.ali ? { obs: 'Brick-red precipitate', vis: { liq: '#5b8fd6', ppt: { col: '#b5401e', kind: 'fine' } } } : { obs: 'No red precipitate (the deep blue colour remains)', vis: { liq: '#2f66c4' } }; },
      inf: ['Aliphatic aldehyde present', 'No aliphatic aldehyde (aromatic aldehydes do not reduce Fehling’s)'], ans: function (c) { return c.g === 'ald' && c.ali ? 0 : 1; } },
    { id: 'schiff', g: 'Confirmatory', t: 'Add Schiff’s reagent and shake',
      run: function (c) { return c.g === 'ald' ? { obs: 'Pink (magenta) colour', vis: { liq: '#d9409a' } } : { obs: 'No pink colour', vis: { liq: CLR } }; },
      inf: ['Aldehyde confirmed', 'Aldehyde absent'], ans: function (c) { return c.g === 'ald' ? 0 : 1; }, confirms: 'ald' },
    { id: 'nitro', g: 'Confirmatory', t: 'Sodium nitroprusside test: add sodium nitroprusside, then NaOH',
      run: function (c) { return c.g === 'ket' ? { obs: 'Red colour', vis: { liq: '#c0283a' } } : c.g === 'ald' && c.ali ? { obs: 'A red colour that fades quickly', vis: { liq: '#e9a0a6' } } : { obs: 'No red colour', vis: { liq: '#f6d9a0' } }; },
      inf: ['Ketone (methyl ketone) confirmed', 'Ketone absent'], ans: function (c) { return c.g === 'ket' ? 0 : 1; }, confirms: 'ket' },
    { id: 'iodo', g: 'Preliminary', t: 'Iodoform test: warm with iodine solution and NaOH',
      run: function (c) { return c.iodo ? { obs: 'Yellow precipitate with an antiseptic smell (iodoform)', vis: { liq: '#f7ecc0', ppt: { col: '#f2d23c', kind: 'crystalline' }, smell: 'antiseptic' } } : { obs: 'No yellow precipitate', vis: { liq: '#f3e6b8' } }; },
      inf: ['CH₃CO– or CH₃CH(OH)– group present', 'No iodoform: these groups are absent'], ans: function (c) { return c.iodo ? 0 : 1; } },
    { id: 'can', g: 'Confirmatory', t: 'Add ceric ammonium nitrate solution',
      run: function (c) { return c.g === 'alc' ? { obs: 'The yellow solution turns red', vis: { liq: '#c4392a' } } : c.g === 'phe' ? { obs: 'A dark brown/green precipitate', vis: { liq: '#6b5a2a', ppt: { col: '#3e4a26', kind: 'fine' } } } : { obs: 'The yellow colour remains', vis: { liq: '#f2d36a' } }; },
      inf: ['Alcoholic –OH confirmed', 'Alcohol absent'], ans: function (c) { return c.g === 'alc' ? 0 : 1; }, confirms: 'alc' },
    { id: 'na', g: 'Preliminary', t: 'Add a small piece of dry sodium metal',
      run: function (c) { return c.g === 'alc' || c.g === 'acid' || c.g === 'phe' ? { obs: 'Effervescence of a colourless gas that burns with a pop (H₂)', vis: { liq: CLR, bubbles: 2 } } : { obs: 'No effervescence', vis: { liq: CLR } }; },
      inf: ['An –OH group (alcohol, phenol or acid) may be present', 'No –OH group'], ans: function (c) { return c.g === 'alc' || c.g === 'acid' || c.g === 'phe' ? 0 : 1; } },
    { id: 'ester', g: 'Confirmatory', t: 'Warm with ethanol and conc. H₂SO₄; pour into water',
      run: function (c) { return c.g === 'acid' ? { obs: 'Pleasant fruity smell (ester)', vis: { liq: CLR, smell: 'fruity' } } : { obs: 'No fruity smell', vis: { liq: CLR } }; },
      inf: ['–COOH confirmed', '–COOH absent'], ans: function (c) { return c.g === 'acid' ? 0 : 1; }, confirms: 'acid' },
    { id: 'hcl', g: 'Preliminary', t: 'Shake with dilute HCl',
      run: function (c) { return c.g === 'amine' ? { obs: 'The compound dissolves', vis: { liq: CLR } } : { obs: c.state.indexOf('solid') >= 0 || c.aro ? 'Does not dissolve' : 'No characteristic change', vis: { liq: CLR, oily: c.aro && c.g !== 'acid' } }; },
      inf: ['A basic group (amine) may be present', 'Amine absent'], ans: function (c) { return c.g === 'amine' ? 0 : 1; } },
    { id: 'azo', g: 'Confirmatory', t: 'Azo dye test: dissolve in dil. HCl, cool in ice, add NaNO₂, then pour into alkaline β-naphthol',
      run: function (c) { return c.g === 'amine' ? { obs: 'Orange-red dye (precipitate)', vis: { liq: '#e8601c', ppt: { col: '#c8401a', kind: 'fine' } } } : { obs: 'No orange-red dye', vis: { liq: CLR } }; },
      inf: ['Primary aromatic amine confirmed', 'Aromatic amine absent'], ans: function (c) { return c.g === 'amine' ? 0 : 1; }, confirms: 'amine' },
    { id: 'carbyl', g: 'Confirmatory', t: 'Carbylamine test: warm with chloroform and alcoholic KOH (in a fume cupboard)',
      run: function (c) { return c.g === 'amine' ? { obs: 'Offensive, unpleasant smell (isocyanide)', vis: { liq: CLR, smell: 'offensive' } } : { obs: 'No offensive smell', vis: { liq: CLR } }; },
      inf: ['Primary amine confirmed', 'Primary amine absent'], ans: function (c) { return c.g === 'amine' ? 0 : 1; }, confirms: 'amine' }
  ];
  var byId = {}; TESTS.forEach(function (t) { byId[t.id] = t; });
  function newCompound(seed) { return COMPOUNDS[(seed >>> 0) % COMPOUNDS.length]; }
  function confirmsOf(t, c) { return t.confirms && t.ans(c) === 0 ? t.confirms : null; }
  var exp = { GROUPS: GROUPS, COMPOUNDS: COMPOUNDS, TESTS: TESTS, byId: byId, newCompound: newCompound, confirmsOf: confirmsOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = exp; else root.Org = exp;
})(this);
if (typeof document !== 'undefined') (function () {
  'use strict';
  var S = Org, $ = function (id) { return document.getElementById(id); }, NS = 'http://www.w3.org/2000/svg';
  var st = { salt: null,  no: 0, cur: null, tries: 0, rows: [], done: {}, msg: null, result: null, anim: 0 };
  function fresh() { st.salt = S.newCompound((Math.random() * 1e9) >>> 0); st.no = 100 + ((Math.random() * 900) | 0); st.cur = null; st.rows = []; st.done = {}; st.result = null; st.tries = 0; $('fgSel').value = ''; }
  function say(k, t) { st.msg = { kind: k, text: t }; }

  /* test picker */
  (function () {
    var groups = {}, order = [];
    S.TESTS.forEach(function (t) { if (!groups[t.g]) { groups[t.g] = []; order.push(t.g); } groups[t.g].push(t); });
    $('testSel').innerHTML = '<option value="">Choose a test…</option>' + order.map(function (g) { return '<optgroup label="' + g + '">' + groups[g].map(function (t) { return '<option value="' + t.id + '">' + t.t + '</option>'; }).join('') + '</optgroup>'; }).join('');
    $('fgSel').innerHTML = '<option value="">Functional group…</option>' + Object.keys(S.GROUPS).map(function (k) { return '<option value="' + k + '">' + S.GROUPS[k].name + ' (' + S.GROUPS[k].f + ')</option>'; }).join('');
  })();
  $('doTest').addEventListener('click', function () {
    var id = $('testSel').value; if (!id) { say('err', 'Choose a test from the list first.'); return render(); }
    if (st.cur && st.cur.pending) { say('err', 'First write the inference for the test you just did.'); return render(); }
    var t = S.byId[id], r = t.run(st.salt);
    st.cur = { t: t, r: r, pending: true }; st.tries = 0; st.anim++;
    say('', 'Observation: ' + r.obs + '. Now choose the inference.'); render();
  });
  $('infChips').addEventListener('click', function (e) {
    var b = e.target.closest('[data-i]'); if (!b || !st.cur || !st.cur.pending) return;
    var i = +b.getAttribute('data-i'), t = st.cur.t, right = t.ans(st.salt);
    if (i === right || st.tries >= 1) {
      var corrected = i !== right;
      st.rows.push({ id: t.id, exp: t.t, obs: st.cur.r.obs, inf: t.inf[right], corrected: corrected, firstTry: !corrected && st.tries === 0 });
      st.done[t.id] = true; st.cur.pending = false;
      say(corrected ? 'warn' : 'good', corrected ? 'Not right again. The correct inference is: ' + t.inf[right] + '. (' + why(t, right) + ')' : 'Correct: ' + t.inf[right] + '. Choose the next test.');
    } else { st.tries++; say('err', 'Not quite. Read the observation again: "' + st.cur.r.obs + '". ' + hint(t) + ' Try once more.'); }
    render();
  });
  function hint(t) {
    if (/confirmed/.test(t.inf[0])) return 'A confirmatory test is positive only if you see the characteristic result.';
    if (/Group/.test(t.inf[0])) return 'A precipitate with the group reagent means that group is present.';
    return 'Match the observation to the ion it indicates.';
  }
  function why(t, right) { return right === t.inf.length - 1 && /absent|None|Neither/.test(t.inf[right]) ? 'there was no characteristic result' : 'that is the characteristic result for it'; }
  $('submit').addEventListener('click', function () {
    var gsel = $('fgSel').value, c = st.salt;
    if (!gsel) { say('err', 'Choose the functional group.'); return render(); }
    if (gsel !== c.g) { st.result = { ok: false }; say('err', 'The functional group is not ' + S.GROUPS[gsel].name + '. ' + steer()); return render(); }
    var conf = confirmed();
    st.result = { ok: true, full: !!conf[c.g] };
    say(conf[c.g] ? 'good' : 'warn', conf[c.g] ? 'Correct! The functional group is ' + S.GROUPS[c.g].name + ' (' + S.GROUPS[c.g].f + '), confirmed by a test.' : 'Right group, but not yet confirmed: do the confirmatory test for ' + S.GROUPS[c.g].name + '. In the exam the group is reported only after a confirmatory test.');
    render();
  });
  function steer() {
    if (!st.done.litmus && !st.done.bicarb) return 'Start with litmus and sodium bicarbonate (acids), neutral FeCl₃ (phenols) and 2,4-DNP (carbonyl compounds).';
    if (!st.done.dnp) return 'Have you tried 2,4-DNP? It shows whether a carbonyl group (aldehyde or ketone) is present.';
    return 'Look again at which tests gave a positive result.';
  }
  $('newSalt').addEventListener('click', function () { fresh(); say('', 'New compound (no. ' + st.no + '). Start with the preliminary tests.'); render(); });
  function confirmed() { var out = {}; st.rows.forEach(function (r) { var t = S.byId[r.id], k = S.confirmsOf(t, st.salt); if (k) out[k] = true; }); return out; }

  /* checks */
  function readingChecks() {
    var out = [], rows = st.rows, c = st.salt; if (!rows.length) return out;
    var wrong = rows.filter(function (r) { return !r.firstTry; }).length;
    out.push(wrong ? { k: 'warn', t: wrong + ' of your ' + rows.length + ' inferences needed a second try. Revise those observations: in the exam each inference carries marks.' } : { k: 'ok', t: 'All ' + rows.length + ' inferences right first time.' });
    if (!st.done.phys) out.push({ k: 'tip', t: 'Begin by noting the physical state, colour and smell. They are part of the record and often give a clue.' });
    if (st.done.tollens && !st.done.dnp) out.push({ k: 'tip', t: 'Do the 2,4-DNP test first: it shows whether a carbonyl group is present. Then Tollens’ (or Schiff’s) tells an aldehyde from a ketone.' });
    if (st.done.br2 && (c.g === 'phe' || c.g === 'amine') && !st.done.fecl3 && !st.done.azo) out.push({ k: 'tip', t: 'A white precipitate with bromine water is given by both phenol and aniline. Neutral FeCl₃ (violet) or the azo dye test tells them apart.' });
    if (st.done.iodo && c.iodo) out.push({ k: 'tip', t: 'The iodoform test is positive for ethanol, acetaldehyde and acetone alike (CH₃CO– or CH₃CH(OH)– groups), so it does not decide the group by itself.' });
    if (st.done.fehling && c.g === 'ald' && !c.ali) out.push({ k: 'tip', t: 'Aromatic aldehydes such as benzaldehyde do not reduce Fehling’s solution, but they do give the silver mirror with Tollens’ reagent.' });
    var conf = confirmed();
    out.push(conf[c.g] ? { k: 'ok', t: 'Functional group confirmed by a confirmatory test.' } : { k: 'tip', t: 'Not confirmed yet: once the preliminary tests point to a group, do its confirmatory test.' });
    return out;
  }

  /* drawing */
  function el(tag, at, txt) { var e = document.createElementNS(NS, tag); for (var k in at) e.setAttribute(k, at[k]); if (txt != null) e.textContent = txt; return e; }
  function tube(g, x, y, w, h, vis, big) {
    var r = w / 2, inner = el('g', {});
    var path = 'M' + (x - r) + ' ' + y + ' L' + (x - r) + ' ' + (y + h - r) + ' A' + r + ' ' + r + ' 0 0 0 ' + (x + r) + ' ' + (y + h - r) + ' L' + (x + r) + ' ' + y;
    var id = 'tc' + Math.round(x) + '_' + Math.round(y), clip = el('clipPath', { id: id }); clip.appendChild(el('path', { d: path + ' Z' })); g.appendChild(clip);
    var cg = el('g', { 'clip-path': 'url(#' + id + ')' }); g.appendChild(cg);
    if (vis && vis.liq) {
      var ly = y + h * 0.42; cg.appendChild(el('rect', { x: x - r, y: ly, width: w, height: h, fill: vis.liq, opacity: vis.milky ? 0.95 : 0.8 }));
      if (vis.layers || vis.ring) { cg.appendChild(el('rect', { x: x - r, y: y + h * 0.72, width: w, height: h, fill: '#dfe8ea', opacity: 0.9 })); }
      if (vis.ring) cg.appendChild(el('rect', { x: x - r, y: y + h * 0.70, width: w, height: big ? 10 : 4, fill: '#6b3a16' }));
      if (vis.ppt) {
        var pp = vis.ppt, py = pp.float ? ly + 6 : y + h - (big ? 64 : 18), ph = big ? 64 : 18;
        if (pp.kind === 'gelatinous') cg.appendChild(el('path', { d: 'M' + (x - r) + ' ' + (py + ph * 0.3) + ' Q' + (x - r / 2) + ' ' + py + ' ' + x + ' ' + (py + ph * 0.25) + ' T' + (x + r) + ' ' + (py + ph * 0.2) + ' L' + (x + r) + ' ' + (py + ph) + ' L' + (x - r) + ' ' + (py + ph) + ' Z', fill: pp.col, opacity: pp.fading ? 0.5 : 0.92 }));
        else { cg.appendChild(el('rect', { x: x - r, y: py + (pp.float ? 0 : ph * 0.15), width: w, height: ph, fill: pp.col, opacity: pp.fading ? 0.45 : 0.95 }));
          if (big) for (var k = 0; k < (pp.kind === 'crystalline' ? 26 : pp.kind === 'curdy' ? 14 : 0); k++) cg.appendChild(el(pp.kind === 'curdy' ? 'circle' : 'rect', pp.kind === 'curdy' ? { cx: x - r + 6 + ((k * 37) % (w - 12)), cy: py + 8 + ((k * 23) % (ph - 10)), r: 5, fill: '#fff', stroke: '#d8d8d0' } : { x: x - r + 4 + ((k * 29) % (w - 10)), y: py + 6 + ((k * 17) % (ph - 8)), width: 4, height: 4, fill: '#fff', stroke: '#cfcfc6', transform: 'rotate(' + (k * 23) + ' ' + (x - r + 6 + ((k * 29) % (w - 10))) + ' ' + (py + 8 + ((k * 17) % (ph - 8))) + ')' })); }
      }
      if (vis.bubbles && big) for (var b = 0; b < 6 * vis.bubbles; b++) cg.appendChild(el('circle', { class: 'bub', cx: x - r + 8 + ((b * 31) % (w - 16)), cy: y + h - 20 - ((b * 47) % (h * 0.5)), r: 2 + (b % 3), fill: 'none', stroke: '#ffffff', 'stroke-width': 1.3, style: 'animation-delay:' + (b * 0.13).toFixed(2) + 's' }));
    }
    if (vis && vis.mirror) { cg.appendChild(el('rect', { x: x - r, y: y + h * 0.35, width: w, height: h, fill: 'url(#silver)', opacity: 0.95 })); }
    if (vis && vis.oily && vis.liq) { var oy = y + h * 0.42; for (var q = 0; q < (big ? 7 : 3); q++) cg.appendChild(el('ellipse', { cx: x - r + 8 + ((q * 19) % (w - 14)), cy: oy + 6 + (q % 2) * 4, rx: big ? 7 : 3, ry: big ? 4 : 2, fill: 'rgba(214,170,90,.85)' })); }
    g.appendChild(el('path', { d: path, fill: 'none', stroke: '#d6e7ef', 'stroke-width': big ? 3 : 1.6 }));
    g.appendChild(el('ellipse', { cx: x, cy: y, rx: r, ry: big ? 5 : 2, fill: 'none', stroke: '#d6e7ef', 'stroke-width': big ? 2 : 1 }));
  }
  function draw() {
    var g = $('app'); while (g.firstChild) g.removeChild(g.firstChild);
    var cur = st.cur, vis = cur ? cur.r.vis : null, cx = 150;
    var defs = el('defs', {}), lg = el('linearGradient', { id: 'silver', x1: '0', x2: '1', y1: '0', y2: '0' });
    [['0', '#8a9299'], ['.35', '#f4f7f9'], ['.55', '#b9c1c7'], ['.8', '#ffffff'], ['1', '#7d858c']].forEach(function (p) { lg.appendChild(el('stop', { offset: p[0], 'stop-color': p[1] })); }); defs.appendChild(lg); g.appendChild(defs);
    g.appendChild(el('text', { x: 616, y: 28, 'text-anchor': 'end', class: 'lbl' }, 'Compound no. ' + st.no + (cur ? '' : ' · choose a test')));
    if (vis && vis.flame) {
      g.appendChild(el('rect', { x: cx - 18, y: 300, width: 36, height: 90, fill: '#6f7b84', rx: 4 })); g.appendChild(el('rect', { x: cx - 50, y: 386, width: 100, height: 12, fill: '#4b555c', rx: 3 }));
      g.appendChild(el('path', { class: 'flicker', d: 'M' + cx + ' 150 C' + (cx + 40) + ' 210 ' + (cx + 34) + ' 280 ' + cx + ' 300 C' + (cx - 34) + ' 280 ' + (cx - 40) + ' 210 ' + cx + ' 150 Z', fill: vis.flame, opacity: 0.85 }));
      g.appendChild(el('path', { d: 'M' + cx + ' 230 C' + (cx + 14) + ' 255 ' + (cx + 12) + ' 290 ' + cx + ' 298 C' + (cx - 12) + ' 290 ' + (cx - 14) + ' 255 ' + cx + ' 230 Z', fill: '#bcd6ff', opacity: 0.8 }));
      g.appendChild(el('line', { x1: cx + 120, y1: 120, x2: cx + 6, y2: 222, stroke: '#cfd8dc', 'stroke-width': 2 }));
      g.appendChild(el('circle', { cx: cx + 6, cy: 222, r: 4, fill: '#cfd8dc' }));
      g.appendChild(el('text', { x: cx + 70, y: 112, class: 'lblm' }, 'platinum wire'));
    } else {
      tube(g, cx, 90, 74, 290, vis || {}, true);
      if (vis && vis.fumes) g.appendChild(el('ellipse', { class: 'fume', cx: cx, cy: 70, rx: 44, ry: 30, fill: vis.fumes }));
      if (vis && vis.gas) g.appendChild(el('text', { x: cx - 60, y: 60, class: 'lblm' }, 'gas ↑'));
      if (vis && vis.litmus) { g.appendChild(el('rect', { x: cx + 26, y: 30, width: 12, height: 52, fill: vis.litmus === 'blue' ? '#3a6fd8' : '#d94a4a', transform: 'rotate(18 ' + (cx + 32) + ' 56)' })); g.appendChild(el('text', { x: cx + 48, y: 44, class: 'lblm' }, 'litmus')); }
      if (vis && vis.rod) { g.appendChild(el('line', { x1: cx - 26, y1: 20, x2: cx - 10, y2: 84, stroke: '#d6e7ef', 'stroke-width': 4 })); g.appendChild(el('ellipse', { class: 'fume', cx: cx - 12, cy: 78, rx: 26, ry: 14, fill: 'rgba(255,255,255,.75)' })); g.appendChild(el('text', { x: cx - 120, y: 36, class: 'lblm' }, 'glass rod')); }
      if (vis && vis.smell) { g.appendChild(el('rect', { x: cx + 50, y: 120, width: 130, height: 30, rx: 15, fill: '#ffde59' })); g.appendChild(el('text', { x: cx + 115, y: 140, 'text-anchor': 'middle', class: 'smell' }, 'smell: ' + vis.smell)); }
      if (vis && vis.solid) { for (var k = 0; k < 18; k++) g.appendChild(el('rect', { x: cx - 30 + (k * 13) % 60, y: 356 + (k * 7) % 14, width: 5, height: 5, fill: '#fafaf6', transform: 'rotate(' + k * 20 + ' ' + (cx - 28 + (k * 13) % 60) + ' ' + (358 + (k * 7) % 14) + ')' })); }
    }
    if (cur) {
      var words = cur.r.obs.split(' '), line = '', ys = 200, lines = [];
      words.forEach(function (w) { if ((line + ' ' + w).length > 34) { lines.push(line); line = w; } else line = line ? line + ' ' + w : w; }); lines.push(line);
      g.appendChild(el('rect', { x: 270, y: ys - 26, width: 350, height: 22 + 19 * lines.length, rx: 10, fill: 'rgba(255,255,255,.06)', stroke: 'rgba(255,255,255,.14)' }));
      g.appendChild(el('text', { x: 284, y: ys - 8, class: 'lbl' }, 'Observation'));
      lines.forEach(function (l, i) { g.appendChild(el('text', { x: 284, y: ys + 14 + 19 * i, class: 'obs' }, l)); });
    }
    // rack of previous tests
    g.appendChild(el('text', { x: 284, y: 300, class: 'lbl' }, 'Test-tube rack'));
    g.appendChild(el('rect', { x: 276, y: 384, width: 344, height: 12, rx: 3, fill: '#5b4a39' }));
    var last = st.rows.slice(-8);
    last.forEach(function (r, i) { var tv = S.byId[r.id].run(st.salt).vis, x = 300 + i * 42; if (tv.flame) { g.appendChild(el('circle', { cx: x, cy: 362, r: 9, fill: tv.flame })); } else tube(g, x, 318, 18, 64, tv, false); g.appendChild(el('text', { x: x, y: 410, 'text-anchor': 'middle', class: 'lblm' }, String(st.rows.length - last.length + i + 1))); });
  }

  function render() {
    var cur = st.cur;
    $('curTest').textContent = cur ? cur.t.t : 'No test yet';
    $('infChips').innerHTML = cur && cur.pending ? cur.t.inf.map(function (t, i) { return '<button type="button" class="chip" data-i="' + i + '">' + t + '</button>'; }).join('') : '<span class="mini">' + (cur ? 'Inference recorded. Choose the next test.' : 'Do a test first.') + '</span>';
    var body = $('obsBody'); body.innerHTML = '';
    if (!st.rows.length) body.innerHTML = '<tr class="empty"><td colspan="4">No tests yet</td></tr>';
    st.rows.forEach(function (r, i) { var tr = document.createElement('tr'); [String(i + 1), r.exp, r.obs, r.inf + (r.corrected ? ' ✱' : '')].forEach(function (v) { var td = document.createElement('td'); td.textContent = v; tr.appendChild(td); }); body.appendChild(tr); });
    var list = $('checks'), items = readingChecks(); list.innerHTML = '';
    items.forEach(function (c) { var li = document.createElement('li'); li.className = c.k; li.textContent = c.t; list.appendChild(li); }); $('checksH').hidden = !items.length;
    var rv = $('revealBox'); if (st.result && st.result.ok) { rv.hidden = false; rv.textContent = 'Result: functional group ' + S.GROUPS[st.salt.g].name + ' (' + S.GROUPS[st.salt.g].f + '). The compound was ' + st.salt.name + '.' + (st.result.full ? ' Confirmed by a test. Well done.' : ''); } else rv.hidden = true;
    var stt = $('status'), m = st.msg || { kind: '', text: 'Choose a test from the list and press "Do the test". Begin with the preliminary tests.' }; stt.textContent = m.text; stt.className = 'status' + (m.kind ? ' ' + m.kind : '');
    draw();
  }
  fresh(); render();
  if (typeof window !== 'undefined') window.__org = st;
})();
