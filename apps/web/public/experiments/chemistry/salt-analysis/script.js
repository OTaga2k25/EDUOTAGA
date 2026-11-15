/* Salt analysis (Plus Two chemistry): systematic identification of one anion and one cation. */
(function (root) {
  'use strict';
  var ANIONS = {
    CO3: { name: 'carbonate', f: 'CO₃²⁻' }, Cl: { name: 'chloride', f: 'Cl⁻' }, NO3: { name: 'nitrate', f: 'NO₃⁻' },
    SO4: { name: 'sulphate', f: 'SO₄²⁻' }, AC: { name: 'acetate', f: 'CH₃COO⁻' } };
  var CATIONS = {
    NH4: { name: 'ammonium', f: 'NH₄⁺' }, Pb: { name: 'lead', f: 'Pb²⁺' }, Al: { name: 'aluminium', f: 'Al³⁺' },
    Zn: { name: 'zinc', f: 'Zn²⁺' }, Ba: { name: 'barium', f: 'Ba²⁺' }, Ca: { name: 'calcium', f: 'Ca²⁺' }, Mg: { name: 'magnesium', f: 'Mg²⁺' } };
  var SALTS = [
    ['NH4', 'CO3'], ['NH4', 'Cl'], ['NH4', 'NO3'], ['NH4', 'SO4'], ['NH4', 'AC'],
    ['Pb', 'NO3'], ['Pb', 'AC'], ['Al', 'NO3'], ['Al', 'SO4'], ['Al', 'Cl'],
    ['Zn', 'SO4'], ['Zn', 'NO3'], ['Zn', 'Cl'], ['Zn', 'AC'], ['Ba', 'Cl'], ['Ba', 'NO3'], ['Ba', 'AC'],
    ['Ca', 'Cl'], ['Ca', 'NO3'], ['Ca', 'AC'], ['Mg', 'SO4'], ['Mg', 'Cl'], ['Mg', 'NO3'], ['Mg', 'AC']];
  function saltName(c, a) { return CATIONS[c].name + ' ' + ANIONS[a].name; }

  var W = '#f4f4f0', NONE = 'No characteristic change';
  /* each test: id, group, title (what you do), run(salt) -> {obs, vis}, inf: [options], ans(salt) -> index of the right inference,
     confirms: radical it confirms when positive */
  var TESTS = [
    { id: 'col', g: 'Preliminary', t: 'Note the colour and appearance of the salt',
      run: function () { return { obs: 'White crystalline solid', vis: { solid: true } }; },
      inf: ['Cu²⁺, Fe²⁺, Fe³⁺, Ni²⁺, Co²⁺ and Mn²⁺ are absent', 'Cu²⁺ is present', 'Fe³⁺ is present'], ans: function () { return 0; } },
    { id: 'sol', g: 'Preliminary', t: 'Shake a little salt with distilled water',
      run: function () { return { obs: 'The salt dissolves: a clear, colourless solution. This is the original solution (OS).', vis: { liq: '#eef5f8' } }; },
      inf: ['The salt is soluble in water; use this solution as OS', 'The salt is insoluble in water'], ans: function () { return 0; } },
    { id: 'naoh', g: 'Preliminary', t: 'Warm the salt with NaOH solution; hold moist red litmus and a glass rod dipped in dil. HCl at the mouth',
      run: function (s) { return s.c === 'NH4' ? { obs: 'Pungent smell of ammonia; moist red litmus turns blue; dense white fumes with the HCl rod', vis: { liq: '#eef5f8', gas: 'clear', litmus: 'blue', rod: true, smell: 'ammonia' } } : { obs: 'No smell of ammonia; red litmus stays red', vis: { liq: '#eef5f8', litmus: 'red' } }; },
      inf: ['NH₄⁺ may be present', 'NH₄⁺ absent'], ans: function (s) { return s.c === 'NH4' ? 0 : 1; } },
    { id: 'dil', g: 'Anion: preliminary', t: 'Add dil. H₂SO₄ to the salt',
      run: function (s) {
        if (s.a === 'CO3') return { obs: 'Brisk effervescence of a colourless, odourless gas', vis: { liq: '#eef5f8', bubbles: 3 } };
        if (s.a === 'AC') return { obs: 'Smell of vinegar', vis: { liq: '#eef5f8', smell: 'vinegar' } };
        return { obs: NONE, vis: { liq: '#eef5f8' } }; },
      inf: ['CO₃²⁻ may be present', 'CH₃COO⁻ may be present', 'CO₃²⁻ and CH₃COO⁻ absent'], ans: function (s) { return s.a === 'CO3' ? 0 : s.a === 'AC' ? 1 : 2; } },
    { id: 'lime', g: 'Anion: confirmatory', t: 'Pass the gas from dil. acid and the salt into lime water',
      run: function (s) { return s.a === 'CO3' ? { obs: 'Lime water turns milky', vis: { liq: '#f2f2ee', milky: true, bubbles: 1 } } : { obs: 'No gas; lime water stays clear', vis: { liq: '#eef5f8' } }; },
      inf: ['CO₃²⁻ confirmed', 'CO₃²⁻ absent'], ans: function (s) { return s.a === 'CO3' ? 0 : 1; }, confirms: 'CO3' },
    { id: 'conc', g: 'Anion: preliminary', t: 'Warm the salt with conc. H₂SO₄; hold a glass rod dipped in NH₄OH at the mouth',
      run: function (s) {
        if (s.a === 'Cl') return { obs: 'Colourless pungent gas; dense white fumes with the NH₄OH rod', vis: { liq: '#eef5f8', gas: 'clear', rod: true, smell: 'pungent' } };
        if (s.a === 'NO3') return { obs: 'Light brown fumes', vis: { liq: '#eef5f8', fumes: 'rgba(160,82,30,.45)' } };
        if (s.a === 'AC') return { obs: 'Smell of vinegar', vis: { liq: '#eef5f8', smell: 'vinegar' } };
        if (s.a === 'CO3') return { obs: 'Effervescence of a colourless gas', vis: { liq: '#eef5f8', bubbles: 2 } };
        return { obs: NONE, vis: { liq: '#eef5f8' } }; },
      inf: ['Cl⁻ may be present', 'NO₃⁻ may be present', 'CH₃COO⁻ may be present', 'Cl⁻, NO₃⁻ and CH₃COO⁻ absent'],
      ans: function (s) { return s.a === 'Cl' ? 0 : s.a === 'NO3' ? 1 : s.a === 'AC' ? 2 : 3; } },
    { id: 'cu', g: 'Anion: preliminary', t: 'Warm the salt with conc. H₂SO₄ and copper turnings',
      run: function (s) { return s.a === 'NO3' ? { obs: 'Dense reddish-brown fumes; the solution turns bluish', vis: { liq: '#9fd3e6', fumes: 'rgba(150,62,20,.8)' } } : { obs: 'No brown fumes', vis: { liq: '#eef5f8' } }; },
      inf: ['NO₃⁻ may be present', 'NO₃⁻ absent'], ans: function (s) { return s.a === 'NO3' ? 0 : 1; } },
    { id: 'ag', g: 'Anion: confirmatory', t: 'OS + dil. HNO₃ + AgNO₃ solution; then add NH₄OH to the precipitate',
      run: function (s) { return s.a === 'Cl' ? { obs: 'Curdy white precipitate, soluble in NH₄OH', vis: { liq: '#eef5f8', ppt: { col: W, kind: 'curdy' } } } : { obs: 'No precipitate', vis: { liq: '#eef5f8' } }; },
      inf: ['Cl⁻ confirmed', 'Cl⁻ absent'], ans: function (s) { return s.a === 'Cl' ? 0 : 1; }, confirms: 'Cl' },
    { id: 'ring', g: 'Anion: confirmatory', t: 'Brown ring test: OS + freshly prepared FeSO₄; add conc. H₂SO₄ slowly along the side',
      run: function (s) { return s.a === 'NO3' ? { obs: 'A brown ring at the junction of the two layers', vis: { liq: '#eef5f8', ring: true } } : { obs: 'No brown ring', vis: { liq: '#eef5f8', layers: true } }; },
      inf: ['NO₃⁻ confirmed', 'NO₃⁻ absent'], ans: function (s) { return s.a === 'NO3' ? 0 : 1; }, confirms: 'NO3' },
    { id: 'ba', g: 'Anion: confirmatory', t: 'OS + dil. HCl + BaCl₂ solution; then add conc. HCl',
      run: function (s) { return s.a === 'SO4' ? { obs: 'White precipitate, insoluble in conc. HCl', vis: { liq: '#eef5f8', ppt: { col: W, kind: 'fine' } } } : s.c === 'Pb' ? { obs: 'A white precipitate with dil. HCl itself, which dissolves on boiling (it is PbCl₂); no other precipitate', vis: { liq: '#eef5f8' } } : { obs: 'No precipitate', vis: { liq: '#eef5f8' } }; },
      inf: ['SO₄²⁻ confirmed', 'SO₄²⁻ absent'], ans: function (s) { return s.a === 'SO4' ? 0 : 1; }, confirms: 'SO4' },
    { id: 'fecl3', g: 'Anion: confirmatory', t: 'Neutral OS + neutral FeCl₃ solution; then boil',
      run: function (s) { return s.a === 'AC' ? { obs: 'Deep red colour; on boiling, a reddish-brown precipitate', vis: { liq: '#a8321e', ppt: { col: '#8a3a1c', kind: 'fine' } } } : { obs: 'No red colour (only the yellow of FeCl₃)', vis: { liq: '#f3e3a0' } }; },
      inf: ['CH₃COO⁻ confirmed', 'CH₃COO⁻ absent'], ans: function (s) { return s.a === 'AC' ? 0 : 1; }, confirms: 'AC' },
    { id: 'ester', g: 'Anion: confirmatory', t: 'Warm the salt with ethanol and conc. H₂SO₄; pour into water',
      run: function (s) { return s.a === 'AC' ? { obs: 'Pleasant fruity smell (ethyl acetate)', vis: { liq: '#eef5f8', smell: 'fruity' } } : { obs: 'No fruity smell', vis: { liq: '#eef5f8' } }; },
      inf: ['CH₃COO⁻ confirmed', 'CH₃COO⁻ absent'], ans: function (s) { return s.a === 'AC' ? 0 : 1; }, confirms: 'AC' },
    { id: 'ness', g: 'Cation: confirmatory', t: 'OS + NaOH + Nessler’s reagent',
      run: function (s) { return s.c === 'NH4' ? { obs: 'Brown precipitate', vis: { liq: '#e8d2a0', ppt: { col: '#8b4a1c', kind: 'fine' } } } : s.c === 'Mg' || s.c === 'Zn' || s.c === 'Al' || s.c === 'Pb' ? { obs: 'A white precipitate of the hydroxide; no brown colour', vis: { liq: '#eef5f8', ppt: { col: W, kind: 'fine' } } } : { obs: 'No brown precipitate', vis: { liq: '#eef5f8' } }; },
      inf: ['NH₄⁺ confirmed', 'NH₄⁺ absent'], ans: function (s) { return s.c === 'NH4' ? 0 : 1; }, confirms: 'NH4' },
    { id: 'g1', g: 'Cation: group tests', t: 'Group I: OS + dil. HCl',
      run: function (s) { return s.c === 'Pb' ? { obs: 'White precipitate', vis: { liq: '#eef5f8', ppt: { col: W, kind: 'crystalline' } } } : { obs: 'No precipitate', vis: { liq: '#eef5f8' } }; },
      inf: ['Group I (Pb²⁺) present', 'Group I absent'], ans: function (s) { return s.c === 'Pb' ? 0 : 1; } },
    { id: 'ki', g: 'Cation: confirmatory', t: 'Dissolve the group I precipitate in hot water; add KI solution',
      run: function (s) { return s.c === 'Pb' ? { obs: 'Yellow precipitate', vis: { liq: '#eef5f8', ppt: { col: '#f4d21c', kind: 'crystalline' } } } : { obs: 'No precipitate (there was no group I precipitate)', vis: { liq: '#eef5f8' } }; },
      inf: ['Pb²⁺ confirmed', 'Pb²⁺ absent'], ans: function (s) { return s.c === 'Pb' ? 0 : 1; }, confirms: 'Pb' },
    { id: 'g3', g: 'Cation: group tests', t: 'Group III: OS + solid NH₄Cl + NH₄OH in excess',
      run: function (s) { return s.c === 'Al' ? { obs: 'White gelatinous precipitate', vis: { liq: '#eef5f8', ppt: { col: '#f7f7f2', kind: 'gelatinous' } } } : s.c === 'Pb' ? { obs: 'White precipitate (lead should have been removed in group I)', vis: { liq: '#eef5f8', ppt: { col: W, kind: 'fine' } } } : { obs: 'No precipitate', vis: { liq: '#eef5f8' } }; },
      inf: ['Group III (Al³⁺) present', 'Group III absent'], ans: function (s) { return s.c === 'Al' ? 0 : 1; } },
    { id: 'lake', g: 'Cation: confirmatory', t: 'Blue lake test: dissolve the group III precipitate in dil. HCl, add blue litmus, then NH₄OH',
      run: function (s) { return s.c === 'Al' ? { obs: 'A blue precipitate floating in a colourless solution (blue lake)', vis: { liq: '#eef5f8', ppt: { col: '#3c66c4', kind: 'gelatinous', float: true } } } : { obs: 'No blue lake (there was no group III precipitate)', vis: { liq: '#8fb2e8' } }; },
      inf: ['Al³⁺ confirmed', 'Al³⁺ absent'], ans: function (s) { return s.c === 'Al' ? 0 : 1; }, confirms: 'Al' },
    { id: 'g4', g: 'Cation: group tests', t: 'Group IV: to the group III solution, pass H₂S gas',
      run: function (s) { return s.c === 'Zn' ? { obs: 'Dirty white precipitate', vis: { liq: '#eef5f8', ppt: { col: '#e8e6dc', kind: 'fine' } } } : s.c === 'Pb' ? { obs: 'Black precipitate (lead should have been removed in group I)', vis: { liq: '#eef5f8', ppt: { col: '#222', kind: 'fine' } } } : { obs: 'No precipitate', vis: { liq: '#eef5f8' } }; },
      inf: ['Group IV (Zn²⁺) present', 'Group IV absent'], ans: function (s) { return s.c === 'Zn' ? 0 : 1; } },
    { id: 'zn', g: 'Cation: confirmatory', t: 'OS + NaOH drop by drop, then in excess',
      run: function (s) {
        if (s.c === 'Zn' || s.c === 'Al' || s.c === 'Pb') return { obs: 'White precipitate, which dissolves in excess NaOH', vis: { liq: '#eef5f8', ppt: { col: W, kind: 'fine', fading: true } } };
        if (s.c === 'Mg') return { obs: 'White precipitate, insoluble in excess NaOH', vis: { liq: '#eef5f8', ppt: { col: W, kind: 'fine' } } };
        if (s.c === 'NH4') return { obs: 'No precipitate; smell of ammonia on warming', vis: { liq: '#eef5f8', smell: 'ammonia' } };
        return { obs: 'No precipitate (or a faint turbidity)', vis: { liq: '#f0f2f0' } }; },
      inf: ['Zn²⁺, Al³⁺ or Pb²⁺ may be present (amphoteric hydroxide)', 'Mg²⁺ may be present', 'None of these'], ans: function (s) { return s.c === 'Zn' || s.c === 'Al' || s.c === 'Pb' ? 0 : s.c === 'Mg' ? 1 : 2; } },
    { id: 'ferro', g: 'Cation: confirmatory', t: 'OS + potassium ferrocyanide solution',
      run: function (s) { return s.c === 'Zn' ? { obs: 'Bluish-white precipitate', vis: { liq: '#eef5f8', ppt: { col: '#dde8f2', kind: 'fine' } } } : { obs: 'No bluish-white precipitate', vis: { liq: '#f6efc8' } }; },
      inf: ['Zn²⁺ confirmed', 'Zn²⁺ absent'], ans: function (s) { return s.c === 'Zn' ? 0 : 1; }, confirms: 'Zn' },
    { id: 'g5', g: 'Cation: group tests', t: 'Group V: OS + NH₄Cl + NH₄OH + (NH₄)₂CO₃ solution',
      run: function (s) { return s.c === 'Ba' || s.c === 'Ca' ? { obs: 'White precipitate', vis: { liq: '#eef5f8', ppt: { col: W, kind: 'fine' } } } : s.c === 'Pb' || s.c === 'Al' ? { obs: 'White precipitate (this ion belongs to an earlier group)', vis: { liq: '#eef5f8', ppt: { col: W, kind: 'fine' } } } : { obs: 'No precipitate', vis: { liq: '#eef5f8' } }; },
      inf: ['Group V (Ba²⁺ or Ca²⁺) present', 'Group V absent'], ans: function (s) { return s.c === 'Ba' || s.c === 'Ca' ? 0 : 1; } },
    { id: 'flame', g: 'Cation: confirmatory', t: 'Flame test: a paste of the salt with conc. HCl on a platinum wire',
      run: function (s) { return s.c === 'Ba' ? { obs: 'Apple-green flame', vis: { flame: '#7ed957' } } : s.c === 'Ca' ? { obs: 'Brick-red flame', vis: { flame: '#e2572b' } } : { obs: 'No characteristic flame colour', vis: { flame: '#8fb6ff' } }; },
      inf: ['Ba²⁺ confirmed', 'Ca²⁺ confirmed', 'Neither Ba²⁺ nor Ca²⁺'], ans: function (s) { return s.c === 'Ba' ? 0 : s.c === 'Ca' ? 1 : 2; }, confirms: function (s) { return s.c === 'Ba' || s.c === 'Ca' ? s.c : null; } },
    { id: 'chrom', g: 'Cation: confirmatory', t: 'OS + acetic acid + potassium chromate solution',
      run: function (s) { return s.c === 'Ba' || s.c === 'Pb' ? { obs: 'Yellow precipitate', vis: { liq: '#f5e27a', ppt: { col: '#f2cb18', kind: 'fine' } } } : { obs: 'No precipitate (yellow solution of the reagent)', vis: { liq: '#f5e27a' } }; },
      inf: ['Ba²⁺ (or Pb²⁺) present', 'Ba²⁺ and Pb²⁺ absent'], ans: function (s) { return s.c === 'Ba' || s.c === 'Pb' ? 0 : 1; } },
    { id: 'oxal', g: 'Cation: confirmatory', t: 'OS + NH₄OH + ammonium oxalate solution',
      run: function (s) { return s.c === 'Ca' ? { obs: 'White crystalline precipitate', vis: { liq: '#eef5f8', ppt: { col: W, kind: 'crystalline' } } } : s.c === 'Ba' ? { obs: 'A slight white precipitate only after long standing', vis: { liq: '#f0f1ee' } } : { obs: 'No precipitate', vis: { liq: '#eef5f8' } }; },
      inf: ['Ca²⁺ confirmed', 'Ca²⁺ absent'], ans: function (s) { return s.c === 'Ca' ? 0 : 1; }, confirms: 'Ca' },
    { id: 'g6', g: 'Cation: group tests', t: 'Group VI: OS + NH₄Cl + NH₄OH + disodium hydrogen phosphate; scratch the sides',
      run: function (s) { return s.c === 'Mg' ? { obs: 'White crystalline precipitate', vis: { liq: '#eef5f8', ppt: { col: W, kind: 'crystalline' } } } : (s.c === 'Ba' || s.c === 'Ca' || s.c === 'Al' || s.c === 'Pb') ? { obs: 'White precipitate (this ion belongs to an earlier group: remove earlier groups first)', vis: { liq: '#eef5f8', ppt: { col: W, kind: 'fine' } } } : { obs: 'No precipitate', vis: { liq: '#eef5f8' } }; },
      inf: ['Mg²⁺ confirmed', 'Mg²⁺ absent'], ans: function (s) { return s.c === 'Mg' ? 0 : 1; }, confirms: 'Mg' }
  ];
  var byId = {}; TESTS.forEach(function (t) { byId[t.id] = t; });
  function newSalt(seed) { var x = SALTS[(seed >>> 0) % SALTS.length]; return { c: x[0], a: x[1] }; }
  function confirmsOf(t, s) { var c = typeof t.confirms === 'function' ? t.confirms(s) : t.confirms; if (!c) return null; return t.ans(s) === 0 || (t.id === 'flame' && t.ans(s) < 2) ? c : null; }
  // which radical a test can confirm (for the checks), whatever the salt
  function canConfirm(t) { return t.id === 'flame' ? ['Ba', 'Ca'] : t.confirms ? [t.confirms] : []; }
  var exp = { ANIONS: ANIONS, CATIONS: CATIONS, SALTS: SALTS, TESTS: TESTS, byId: byId, saltName: saltName, newSalt: newSalt, confirmsOf: confirmsOf, canConfirm: canConfirm };
  if (typeof module !== 'undefined' && module.exports) module.exports = exp; else root.Salt = exp;
})(this);
if (typeof document !== 'undefined') (function () {
  'use strict';
  var S = Salt, $ = function (id) { return document.getElementById(id); }, NS = 'http://www.w3.org/2000/svg';
  var st = { salt: null, no: 0, cur: null, tries: 0, rows: [], done: {}, msg: null, result: null, anim: 0 };
  function fresh() { st.salt = S.newSalt((Math.random() * 1e9) >>> 0); st.no = 100 + ((Math.random() * 900) | 0); st.cur = null; st.rows = []; st.done = {}; st.result = null; st.tries = 0; $('anSel').value = ''; $('caSel').value = ''; }
  function say(k, t) { st.msg = { kind: k, text: t }; }

  /* test picker */
  (function () {
    var groups = {}, order = [];
    S.TESTS.forEach(function (t) { if (!groups[t.g]) { groups[t.g] = []; order.push(t.g); } groups[t.g].push(t); });
    $('testSel').innerHTML = '<option value="">Choose a test…</option>' + order.map(function (g) { return '<optgroup label="' + g + '">' + groups[g].map(function (t) { return '<option value="' + t.id + '">' + t.t + '</option>'; }).join('') + '</optgroup>'; }).join('');
    $('anSel').innerHTML = '<option value="">Anion…</option>' + Object.keys(S.ANIONS).map(function (k) { return '<option value="' + k + '">' + S.ANIONS[k].f + ' (' + S.ANIONS[k].name + ')</option>'; }).join('');
    $('caSel').innerHTML = '<option value="">Cation…</option>' + Object.keys(S.CATIONS).map(function (k) { return '<option value="' + k + '">' + S.CATIONS[k].f + ' (' + S.CATIONS[k].name + ')</option>'; }).join('');
  })();
  $('doTest').addEventListener('click', function () {
    var id = $('testSel').value; if (!id) { say('err', 'Choose a test from the list first.'); return render(); }
    if (st.cur && st.cur.pending) { say('err', 'First write the inference for the test you just did.'); return render(); }
    if (!st.done.sol && /\bOS\b/.test(S.byId[id].t)) { say('warn', 'This test uses the original solution (OS). Prepare it first: shake a little salt with distilled water.'); return render(); }
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
    var a = $('anSel').value, c = $('caSel').value, s = st.salt;
    if (!a || !c) { say('err', 'Choose both the anion and the cation.'); return render(); }
    var conf = confirmed(), msgs = [];
    if (a !== s.a) msgs.push('The anion is not ' + S.ANIONS[a].f + '.' + (conf[a] === false ? '' : ' Which anion tests gave a positive result?'));
    if (c !== s.c) msgs.push('The cation is not ' + S.CATIONS[c].f + '. Go through the group tests in order (I to VI) and see where the first precipitate appears' + (s.c === 'NH4' ? ', and remember the test with NaOH.' : '.'));
    if (msgs.length) { st.result = { ok: false }; say('err', msgs.join(' ')); return render(); }
    var miss = [];
    if (!conf[a]) miss.push(S.ANIONS[a].f); if (!conf[c]) miss.push(S.CATIONS[c].f);
    st.result = { ok: true, full: !miss.length };
    say(miss.length ? 'warn' : 'good', miss.length ? 'Right ions, but not yet confirmed: do a confirmatory test for ' + miss.join(' and ') + '. In the exam an ion is reported only after a confirmatory test.' : 'Correct! The salt is ' + S.saltName(s.c, s.a) + ' (' + S.CATIONS[s.c].f + ', ' + S.ANIONS[s.a].f + '), confirmed by tests.');
    render();
  });
  $('newSalt').addEventListener('click', function () { fresh(); say('', 'New salt (no. ' + st.no + '). Start with the preliminary tests.'); render(); });
  function confirmed() { var out = {}; st.rows.forEach(function (r) { var t = S.byId[r.id], k = S.confirmsOf(t, st.salt); if (k) out[k] = true; }); return out; }

  /* checks */
  function readingChecks() {
    var out = [], rows = st.rows; if (!rows.length) return out;
    var wrong = rows.filter(function (r) { return !r.firstTry; }).length;
    out.push(wrong ? { k: 'warn', t: wrong + ' of your ' + rows.length + ' inferences needed a second try. Revise those observations: in the exam each inference carries marks.' } : { k: 'ok', t: 'All ' + rows.length + ' inferences right first time.' });
    if (!st.done.col || !st.done.sol) out.push({ k: 'tip', t: 'Start with the preliminary tests: colour and appearance, and solubility in water (to make the original solution).' });
    if (!st.done.naoh) out.push({ k: 'tip', t: 'Always test for NH₄⁺ with NaOH first: ammonium salts are not detected in the group tests.' });
    var gi = ['g1', 'g3', 'g4', 'g5', 'g6'], doneG = gi.filter(function (g) { return st.done[g]; });
    var firstPos = gi.filter(function (g) { return st.done[g] && S.byId[g].ans(st.salt) === 0; })[0];
    var seq = rows.map(function (r) { return r.id; }).filter(function (id) { return gi.indexOf(id) >= 0; });
    var inOrder = seq.every(function (id, k) { return k === 0 || gi.indexOf(id) > gi.indexOf(seq[k - 1]); });
    if (doneG.length && !inOrder) out.push({ k: 'warn', t: 'Do the group tests in order: I (dil. HCl), III (NH₄Cl + NH₄OH), IV (H₂S), V ((NH₄)₂CO₃), VI (phosphate). An ion from an earlier group also precipitates with later group reagents.' });
    if (firstPos) out.push({ k: 'ok', t: 'Group test positive: ' + S.byId[firstPos].inf[0].replace(' present', '') + '. Now do its confirmatory test.' });
    var c = confirmed();
    out.push(c[st.salt.a] ? { k: 'ok', t: 'Anion confirmed by a confirmatory test.' } : { k: 'tip', t: 'Anion not confirmed yet. Use the preliminary tests (dil. H₂SO₄, conc. H₂SO₄, copper turnings) to decide which confirmatory test to do.' });
    out.push(c[st.salt.c] ? { k: 'ok', t: 'Cation confirmed by a confirmatory test.' } : { k: 'tip', t: 'Cation not confirmed yet. Find its group first, then do the confirmatory test for that group.' });
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
    g.appendChild(el('path', { d: path, fill: 'none', stroke: '#d6e7ef', 'stroke-width': big ? 3 : 1.6 }));
    g.appendChild(el('ellipse', { cx: x, cy: y, rx: r, ry: big ? 5 : 2, fill: 'none', stroke: '#d6e7ef', 'stroke-width': big ? 2 : 1 }));
  }
  function draw() {
    var g = $('app'); while (g.firstChild) g.removeChild(g.firstChild);
    var cur = st.cur, vis = cur ? cur.r.vis : null, cx = 150;
    g.appendChild(el('text', { x: 616, y: 28, 'text-anchor': 'end', class: 'lbl' }, 'Salt no. ' + st.no + (cur ? '' : ' · choose a test')));
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
    var rv = $('revealBox'); if (st.result && st.result.ok) { rv.hidden = false; rv.textContent = 'Result: the salt is ' + S.saltName(st.salt.c, st.salt.a) + '. Anion ' + S.ANIONS[st.salt.a].f + ', cation ' + S.CATIONS[st.salt.c].f + '.' + (st.result.full ? ' Both confirmed by tests. Well done.' : ''); } else rv.hidden = true;
    var stt = $('status'), m = st.msg || { kind: '', text: 'Choose a test from the list and press "Do the test". Begin with the preliminary tests.' }; stt.textContent = m.text; stt.className = 'status' + (m.kind ? ' ' + m.kind : '');
    draw();
  }
  fresh(); render();
  if (typeof window !== 'undefined') window.__salt = st;
})();
