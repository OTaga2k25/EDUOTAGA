/* Acid–base titration model (Plus Two chemistry, volumetric analysis). */
(function (root) {
  'use strict';
  function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  var DROP = 0.05, PIPETTE = 20, BUR_MAX = 50;
  var BASES = { NaOH: 40, KOH: 56 };
  var r2 = function (v) { return Math.round(v * 20) / 20; };   // nearest 0.05 mL

  /* mode 'single': unknown base (NaOH/KOH) in the burette, standard oxalic acid in the flask.
     mode 'link'  : NaOH link solution in the burette; titration I with standard oxalic acid, titration II with unknown HCl. */
  function newSetup(seed, mode) {
    var rnd = mulberry32(seed >>> 0), s = { seed: seed, mode: mode };
    s.Mox = rnd() < 0.5 ? 0.05 : 0.1;
    s.base = mode === 'link' ? 'NaOH' : (rnd() < 0.6 ? 'NaOH' : 'KOH');
    var lo = s.Mox === 0.05 ? 0.075 : 0.15, hi = s.Mox === 0.05 ? 0.125 : 0.24;
    s.Mbase = Math.round((lo + (hi - lo) * rnd()) * 10000) / 10000;
    s.Mhcl = Math.round(s.Mbase * (0.62 + 0.5 * rnd()) * 10000) / 10000;
    return s;
  }
  // moles of H+ that must be neutralised in the flask (aliquot of 20 mL)
  function acidEq(s, flask) { return flask === 'ox' ? 2 * s.Mox * PIPETTE / 1000 : s.Mhcl * PIPETTE / 1000; }
  // true end-point volume of base for one aliquot, with the student's rinsing choices
  function eqVolume(s, flask, opt) {
    opt = opt || {};
    var Mb = s.Mbase * (opt.buretteWater ? 0.985 : 1);                       // burette not rinsed with the base: diluted
    var aliquot = opt.pipetteWater ? 0.985 : 1;                               // pipette not rinsed with the acid: diluted aliquot
    var extra = opt.flaskAcid ? 1.02 : 1;                                     // flask rinsed with the acid: extra acid
    return acidEq(s, flask) * aliquot * extra / Mb * 1000;
  }
  // colour of phenolphthalein: 0 colourless .. 1 deep pink, from the volume added
  function pinkness(veq, vadd, Mb, indicator) {
    if (!indicator) return 0;
    var excessMol = (vadd - veq) * Mb / 1000; if (excessMol <= 1e-9) return 0;
    var c = excessMol / ((PIPETTE + vadd) / 1000), pH = 14 + Math.log10(c);
    return Math.max(0.2, Math.min(1, (pH - 9.4) / 2.4));
  }
  // the student's burette reading check; returns {ok, why}
  function judgeReading(typed, truth) {
    if (!isFinite(typed)) return { ok: false, why: 'empty' };
    var d = typed - truth;
    if (Math.abs(d) <= 0.051) return { ok: true };
    if (Math.abs(typed - (BUR_MAX - truth)) <= 0.06) return { ok: false, why: 'upside' };
    if (d < 0 && Math.abs(d + 0.1) <= 0.06) return { ok: false, why: 'upper' };
    if (Math.abs(d) <= 0.21) return { ok: false, why: 'close' };
    return { ok: false, why: 'far' };
  }
  // concordant value: closest pair of good titres within 0.1 mL
  function concordant(vols) {
    var best = null;
    for (var i = 0; i < vols.length; i++) for (var j = i + 1; j < vols.length; j++) {
      var d = Math.abs(vols[i] - vols[j]); if (d <= 0.1 + 1e-9 && (!best || d < best.d)) best = { d: d, v: (vols[i] + vols[j]) / 2, i: i, j: j };
    }
    return best;
  }
  // expected results from a titre (what the student's calculation should give)
  function baseFromOx(s, V) { return 2 * s.Mox * PIPETTE / V; }          // H2C2O4 + 2 OH-  -> M2 = 2 M1 V1 / V2
  function hclFromBase(Mb, V) { return Mb * V / PIPETTE; }                // HCl + NaOH 1:1
  var exp = { mulberry32: mulberry32, DROP: DROP, PIPETTE: PIPETTE, BUR_MAX: BUR_MAX, BASES: BASES, HCL: 36.5, OX: 126, r2: r2,
    newSetup: newSetup, acidEq: acidEq, eqVolume: eqVolume, pinkness: pinkness, judgeReading: judgeReading, concordant: concordant, baseFromOx: baseFromOx, hclFromBase: hclFromBase };
  if (typeof module !== 'undefined' && module.exports) module.exports = exp; else root.Titr = exp;
})(this);
if (typeof document !== 'undefined') (function () {
  'use strict';
  var T = Titr, $ = function (id) { return document.getElementById(id); }, f2 = function (v) { return Number(v).toFixed(2); };
  var NS = 'http://www.w3.org/2000/svg';
  var st = { mode: 'single', s: null, tit: 'ox', rinse: {}, bur: { filled: false, r: 0, bubble: false, fills: 0 }, flask: null, rows: [], msg: null, revealed: false, calcOk: false, anim: null };
  function fresh(mode) {
    st.mode = mode || st.mode; st.s = T.newSetup((Math.random() * 1e9) >>> 0, st.mode); st.tit = 'ox';
    st.rinse = {}; st.bur = { filled: false, r: 0, bubble: false, fills: 0 }; st.flask = null; st.rows = []; st.revealed = false; st.calcOk = false;
    $('calcFb').textContent = ''; buildCalc();
  }
  function say(k, t) { st.msg = { kind: k, text: t }; }
  var baseName = function () { return st.s.base; }, Mb = function () { return st.s.Mbase * (st.rinse.burette === 'water' ? 0.985 : 1); };
  var acidName = function (k) { return (k || st.tit) === 'ox' ? 'oxalic acid' : 'HCl'; };

  /* ---------- controls ---------- */
  var RINSE = [
    ['burette', 'Burette', [['water', 'distilled water only'], ['sol', function () { return 'water, then the ' + baseName() + ' solution'; }]]],
    ['pipette', 'Pipette', [['water', 'distilled water only'], ['sol', 'water, then the acid it measures']]],
    ['flask', 'Conical flask', [['water', 'distilled water only'], ['sol', 'the acid solution']]]];
  function buildRinse() {
    $('rinse').innerHTML = RINSE.map(function (g) {
      return '<div class="row"><span>' + g[1] + ' rinsed with</span>' + g[2].map(function (o) { var t = typeof o[1] === 'function' ? o[1]() : o[1]; return '<button type="button" class="chip" data-g="' + g[0] + '" data-v="' + o[0] + '" aria-pressed="' + (st.rinse[g[0]] === o[0]) + '">' + t + '</button>'; }).join('') + '</div>';
    }).join('');
  }
  $('rinse').addEventListener('click', function (e) {
    var b = e.target.closest('[data-g]'); if (!b) return; var g = b.getAttribute('data-g'), v = b.getAttribute('data-v');
    if (g === 'burette' && st.bur.filled && st.rinse.burette !== v) { say('warn', 'The burette is already filled. Rinsing applies before filling: empty it and fill it again to change this.'); st.bur.filled = false; st.bur.r = 0; }
    else if ((g === 'flask' || g === 'pipette') && st.flask) { st.flask = null; say('warn', 'The flask was emptied. Pipette a fresh 20 mL sample after rinsing.'); }
    else st.msg = null;
    st.rinse[g] = v; render();
  });
  $('modeChips').addEventListener('click', function (e) { var b = e.target.closest('[data-m]'); if (!b) return; fresh(b.getAttribute('data-m')); st.msg = null; render(); });
  $('titChips').addEventListener('click', function (e) {
    var b = e.target.closest('[data-t]'); if (!b) return; var t = b.getAttribute('data-t'); if (t === st.tit) return;
    st.tit = t; if (st.flask) { st.flask = null; say('warn', 'Switched to titration ' + (t === 'ox' ? 'I' : 'II') + '. The flask was emptied and washed; pipette 20 mL of ' + acidName(t) + '.'); } else st.msg = null; render();
  });
  $('fillBtn').addEventListener('click', function () {
    if (!st.rinse.burette) { say('err', 'First choose how you rinse the burette.'); return render(); }
    if (st.flask && st.flask.init != null && st.flask.vadd > 0) { say('err', 'Finish (record) the titration in progress before refilling, or pipette a fresh sample.'); return render(); }
    st.bur.filled = true; st.bur.r = T.r2(0.1 + Math.random() * 1.4); st.bur.bubble = st.bur.fills === 0; st.bur.bubbleLeft = 0.3; st.bur.fills++;
    if (st.flask) st.flask.init = null;
    say('', 'The burette is filled with ' + baseName() + ' solution and the funnel removed.' + (st.bur.bubble ? ' Look at the nozzle: there is an air bubble below the tap.' : ''));
    render();
  });
  $('bubbleBtn').addEventListener('click', function () {
    if (!st.bur.filled) { say('err', 'Fill the burette first.'); return render(); }
    if (!st.bur.bubble) { say('', 'There is no air bubble in the nozzle.'); return render(); }
    st.bur.bubble = false; st.bur.r = T.r2(st.bur.r + 0.35); if (st.flask) st.flask.init = null;
    say('good', 'You opened the tap fully for a moment and the bubble ran out with a little solution (into a beaker, not the flask). Now note the initial reading.'); render();
  });
  $('pipBtn').addEventListener('click', function () {
    if (!st.rinse.pipette || !st.rinse.flask) { say('err', 'First choose how you rinse the pipette and the conical flask.'); return render(); }
    if (st.flask) { say('err', 'The flask already holds the sample. Titrate it, or record it first.'); return render(); }
    st.flask = { kind: st.tit, ind: false, vadd: 0, veq: T.eqVolume(st.s, st.tit, { buretteWater: st.rinse.burette === 'water', pipetteWater: st.rinse.pipette === 'water', flaskAcid: st.rinse.flask === 'sol' }), init: null, initTyped: null, bubbleUsed: false };
    say('', '20.0 mL of ' + acidName() + ' pipetted into the conical flask. Add the indicator.'); render();
  });
  $('indBtn').addEventListener('click', function () {
    if (!st.flask) { say('err', 'Pipette the acid into the flask first.'); return render(); }
    st.flask.ind = true; say('', 'Two drops of phenolphthalein added: the acid stays colourless. Now note the initial burette reading.'); render();
  });
  $('initBtn').addEventListener('click', function () {
    if (!st.bur.filled) { say('err', 'Fill the burette first.'); return render(); }
    if (!st.flask) { say('err', 'Pipette the acid into the flask first.'); return render(); }
    if (st.flask.vadd > 0) { say('err', 'The initial reading must be noted before you run in any base.'); return render(); }
    var typed = parseFloat($('inInit').value), j = T.judgeReading(typed, st.bur.r);
    if (!j.ok) { say('err', readMsg(j.why, 'initial')); return render(); }
    st.flask.init = st.bur.r; st.flask.initTyped = typed; st.flask.bubbleUsed = st.bur.bubble;
    say('good', 'Initial reading ' + f2(typed) + ' mL noted. Now run in the base' + (st.rows.length ? '' : ' (for the first, rough titration, 1 mL at a time is fine)') + ', swirling the flask.'); render();
  });
  function readMsg(why, which) {
    if (why === 'empty') return 'Type the ' + which + ' reading you see in the close-up.';
    if (why === 'upside') return 'The burette scale starts at 0 at the top and increases downwards. Read the number at the meniscus, not the volume left.';
    if (why === 'upper') return 'You read the top edge of the meniscus. For a colourless solution read the bottom of the curved surface, with your eye level with it.';
    if (why === 'close') return 'Close, but not right. Each small division is 0.1 mL; if the meniscus is halfway between two lines, add 0.05. Read the bottom of the meniscus.';
    return 'That is not the ' + which + ' reading. Look at the close-up: numbers mark whole mL, each small division is 0.1 mL.';
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-add]'), function (b) { b.addEventListener('click', function () { add(parseFloat(b.getAttribute('data-add'))); }); });
  function add(a) {
    if (!st.flask) { say('err', 'Pipette 20 mL of acid into the flask first.'); return render(); }
    if (st.flask.init == null) { say('err', 'Note the initial burette reading before running in any base.'); return render(); }
    if (st.bur.r + a > T.BUR_MAX + 1e-9) { say('err', 'The burette would go past 50 mL, where it is not graduated. Refill the burette and repeat this trial with a fresh sample.'); st.flask = null; return render(); }
    var deliver = a; if (st.bur.bubble) { var b = Math.min(a, st.bur.bubbleLeft); deliver -= b; st.bur.bubbleLeft -= b; if (st.bur.bubbleLeft <= 1e-9) st.bur.bubble = false; }
    st.bur.r = T.r2(st.bur.r + a); st.flask.vadd += deliver;
    var p = T.pinkness(st.flask.veq, st.flask.vadd, Mb(), st.flask.ind), left = st.flask.veq - st.flask.vadd;
    st.anim = { drop: true, flash: st.flask.ind && p === 0 && left < 1.2 ? Math.max(0.25, 1 - left) : 0 };
    if (!st.flask.ind) say('', st.flask.vadd > st.flask.veq + 2 ? 'Still colourless after a lot of base… did you add the indicator?' : 'Base added. Swirl and watch the colour.');
    else if (p === 0) say('', left < 1.2 ? 'A pink colour appears where the base falls but disappears on swirling: you are close. Add drop by drop.' : 'Colourless. Keep adding the base, swirling the flask.');
    else if (st.flask.vadd - st.flask.veq <= 0.051) say('good', 'A permanent pale pink: this is the end point. Read the burette and record the final reading.');
    else if (st.flask.vadd - st.flask.veq <= 0.101) say('warn', 'Pink, a little darker than the faintest pink: one drop past the end point. Record it, but try to stop one drop earlier next time.');
    else say('err', 'Dark pink: you have gone past the end point. This trial will be inaccurate; record it and repeat, adding drop by drop near the end.');
    render();
  }
  $('recordBtn').addEventListener('click', function () {
    var fl = st.flask;
    if (!fl || fl.init == null) { say('err', 'Pipette the acid, note the initial reading, then titrate.'); return render(); }
    if (!fl.ind) { say('err', 'You did not add the indicator, so the end point cannot be seen. Throw this sample away: pipette a fresh one and add phenolphthalein.'); st.flask = null; return render(); }
    var p = T.pinkness(fl.veq, fl.vadd, Mb(), true);
    if (p === 0) { say('err', 'The solution is still colourless: the end point is not reached yet. Keep adding base drop by drop.'); return render(); }
    var typed = parseFloat($('inFinal').value), j = T.judgeReading(typed, st.bur.r);
    if (!j.ok) { say('err', readMsg(j.why, 'final')); return render(); }
    var ex = fl.vadd - fl.veq, v = Math.round((typed - fl.initTyped) * 100) / 100;
    var row = { tit: fl.kind, i: fl.initTyped, f: typed, v: v, over: ex > 0.101, bubble: fl.bubbleUsed, rough: false };
    var same = st.rows.filter(function (r) { return r.tit === row.tit; });
    if (!same.length && ex > 0.3) row.rough = true;
    st.rows.push(row); st.flask = null; $('inInit').value = ''; $('inFinal').value = '';
    st.revealed = false; st.calcOk = false;
    var after = st.rows.filter(function (r) { return r.tit === row.tit && !r.over && !r.rough && !r.bubble; }).map(function (r) { return r.v; }), c = T.concordant(after);
    var need = st.bur.r + v + 1 > T.BUR_MAX;
    say(row.over ? 'warn' : 'good', 'Titre = ' + f2(typed) + ' − ' + f2(row.i) + ' = ' + f2(v) + ' mL.' + (row.rough ? ' This was a rough titration: now you know the end point is near ' + Math.floor(v) + ' mL.' : '') + (c ? ' Concordant value: ' + f2(c.v) + ' mL.' : ' Repeat until two titres agree within 0.1 mL.') + ' The flask was emptied and washed with water.' + (need ? ' The burette does not hold enough for another titration: refill it.' : ''));
    render();
  });
  $('delLast').addEventListener('click', function () { st.rows.pop(); st.revealed = false; st.calcOk = false; st.msg = null; render(); });
  $('newSet').addEventListener('click', function () { fresh(); say('warn', 'New sample of unknown strength. Rinse, fill and start again.'); render(); });
  $('reveal').addEventListener('click', function () { st.revealed = true; render(); });

  /* ---------- results and calculation ---------- */
  function good(tit) { return st.rows.filter(function (r) { return r.tit === tit && !r.over && !r.rough && !r.bubble; }).map(function (r) { return r.v; }); }
  function conc(tit) { return T.concordant(good(tit)); }
  function expected() {
    var s = st.s, c1 = conc('ox'); if (!c1) return null;
    var Mbase = T.baseFromOx(s, c1.v);
    if (st.mode === 'single') return { Mbase: Mbase, str: Mbase * T.BASES[s.base] };
    var c2 = conc('hcl'); if (!c2) return { Mbase: Mbase };
    var Mh = T.hclFromBase(Mbase, c2.v); return { Mbase: Mbase, Mhcl: Mh, str: Mh * T.HCL };
  }
  function buildCalc() {
    var single = st.mode === 'single', b = st.s ? st.s.base : 'NaOH';
    $('calcInputs').innerHTML = single
      ? '<label>Molarity of ' + b + ' (M)<input id="cM" inputmode="decimal"></label><label>Strength of ' + b + ' (g/L)<input id="cS" inputmode="decimal"></label>'
      : '<label>Molarity of NaOH, from titration I (M)<input id="cM" inputmode="decimal"></label><label>Molarity of HCl, from titration II (M)<input id="cH" inputmode="decimal"></label><label>Strength of HCl (g/L)<input id="cS" inputmode="decimal"></label>';
  }
  var near = function (a, b, tol) { return isFinite(a) && Math.abs(a - b) <= Math.abs(b) * tol; };
  $('checkCalc').addEventListener('click', function () {
    var e = expected(), fb = $('calcFb'), s = st.s, single = st.mode === 'single';
    if (!e) { fb.textContent = 'First get a concordant titre for ' + (single ? 'your titration' : 'titration I') + '.'; return; }
    if (!single && e.Mhcl === undefined) { fb.textContent = 'Now get a concordant titre for titration II (HCl).'; return; }
    var M = parseFloat($('cM').value), S = parseFloat($('cS').value), H = single ? NaN : parseFloat($('cH').value), Vc = conc('ox').v;
    var mm = single ? T.BASES[s.base] : T.HCL;
    if (!near(M, e.Mbase, 0.006)) {
      if (near(M, e.Mbase / 2, 0.01)) fb.textContent = 'Your molarity is half the right value. Oxalic acid has n₁ = 1 and the alkali n₂ = 2 (H₂C₂O₄ + 2NaOH). So M₂ = 2 × M₁V₁ / V₂.';
      else if (near(M, s.Mox * Vc / 20 * 2, 0.01) || near(M, s.Mox * Vc / 20, 0.01)) fb.textContent = 'Check which volume goes where: V₁ = 20 mL of oxalic acid (pipette), V₂ = ' + f2(Vc) + ' mL of base (concordant burette reading).';
      else fb.textContent = 'Molarity of ' + (single ? s.base : 'NaOH') + ' is not right. Use M₁V₁/n₁ = M₂V₂/n₂ with M₁ = ' + s.Mox + ' M, V₁ = 20 mL, n₁ = 1, V₂ = ' + f2(Vc) + ' mL, n₂ = 2.';
      st.calcOk = false; return render();
    }
    if (!single && !near(H, e.Mhcl, 0.006)) {
      var Vh = conc('hcl').v;
      fb.textContent = near(H, M * 20 / Vh, 0.01) ? 'Volumes swapped: V(HCl) = 20 mL (pipette), V(NaOH) = ' + f2(Vh) + ' mL (burette). M(HCl) = M(NaOH) × V(NaOH) / 20.' : 'Molarity of HCl is not right. HCl + NaOH react 1 : 1, so M(HCl) × 20 = M(NaOH) × ' + f2(Vh) + '.';
      st.calcOk = false; return render();
    }
    var Mused = single ? M : H;
    if (!near(S, Mused * mm, 0.006)) {
      fb.textContent = near(S, Mused, 0.01) ? 'Strength is in grams per litre: multiply the molarity by the molar mass (' + mm + ' g/mol).' : 'Strength = molarity × molar mass = ' + Mused.toFixed(4) + ' × ' + mm + '.';
      st.calcOk = false; return render();
    }
    fb.textContent = 'Correct. Strength of ' + (single ? s.base : 'HCl') + ' = ' + S.toFixed(2) + ' g/L.'; st.calcOk = true; render();
  });
  function readingChecks() {
    var out = [], titles = st.mode === 'single' ? [['ox', '']] : [['ox', 'Titration I: '], ['hcl', 'Titration II: ']];
    if (!st.rows.length) return out;
    titles.forEach(function (t) {
      var rows = st.rows.filter(function (r) { return r.tit === t[0]; }); if (!rows.length) { out.push({ k: 'warn', t: t[1] + 'no readings yet.' }); return; }
      var c = conc(t[0]);
      out.push(c ? { k: 'ok', t: t[1] + 'concordant titre ' + f2(c.v) + ' mL (two titres within 0.1 mL).' } : { k: 'warn', t: t[1] + 'no two accurate titres agree within 0.1 mL yet. Repeat the titration, adding the base drop by drop near the end point.' });
    });
    st.rows.forEach(function (r, i) {
      if (r.rough) out.push({ k: 'tip', t: 'Trial ' + (i + 1) + ' was a rough titration (you went past the end point). That is fine for finding the approximate end point, but it is not used in the calculation.' });
      else if (r.over) out.push({ k: 'warn', t: 'Trial ' + (i + 1) + ': the solution turned dark pink, so you overshot the end point and the titre is too large. It is not used.' });
      if (r.bubble) out.push({ k: 'warn', t: 'Trial ' + (i + 1) + ' was done with an air bubble in the nozzle. The bubble filled with liquid, so the burette shows more volume than went into the flask: that titre is too high and is not used. Always remove the bubble before the initial reading.' });
    });
    if (st.rinse.burette === 'water') out.push({ k: 'warn', t: 'You rinsed the burette with water only. The water left inside dilutes the ' + baseName() + ', so more of it is needed: every titre is a little too high and your molarity of the base comes out too low. Rinse the burette with the solution it will hold.' });
    if (st.rinse.pipette === 'water') out.push({ k: 'warn', t: 'You rinsed the pipette with water only. The water left inside dilutes the acid you measure, so the titre is a little too low. Rinse the pipette with the solution it will measure.' });
    if (st.rinse.flask === 'sol') out.push({ k: 'warn', t: 'You rinsed the conical flask with the acid. The acid left on its walls is extra acid, so the titre is too high. Rinse the flask with distilled water only (water does not change the amount of acid pipetted).' });
    return out;
  }
  function trueAnswer() { var s = st.s; return st.mode === 'single' ? { M: s.Mbase, str: s.Mbase * T.BASES[s.base], what: s.base } : { M: s.Mhcl, str: s.Mhcl * T.HCL, what: 'HCl' }; }

  /* ---------- drawing ---------- */
  function el(tag, at, txt) { var e = document.createElementNS(NS, tag); for (var k in at) e.setAttribute(k, at[k]); if (txt != null) e.textContent = txt; return e; }
  var Y0 = 30, PX = 4.6;   // burette: 0 mL at y=30, 4.6 px per mL -> 50 mL at y=260
  function draw() {
    var g = $('app'); while (g.firstChild) g.removeChild(g.firstChild);
    var bx = 120, bw = 14, liquid = 'rgba(190,225,245,.55)', B = st.bur;
    // stand
    g.appendChild(el('rect', { x: 20, y: 396, width: 200, height: 10, rx: 3, fill: '#5b4a39' }));
    g.appendChild(el('rect', { x: 34, y: 14, width: 7, height: 384, fill: '#8a97a0' }));
    g.appendChild(el('rect', { x: 36, y: 120, width: bx - 36 - bw / 2, height: 7, fill: '#8a97a0' }));
    g.appendChild(el('rect', { x: bx - bw / 2 - 4, y: 116, width: 8, height: 15, rx: 2, fill: '#c9a14a' }));
    // white tile and flask
    g.appendChild(el('rect', { x: 60, y: 388, width: 120, height: 8, rx: 2, fill: '#f2f2ee' }));
    var fx = bx, fl = st.flask;
    var flaskPath = 'M' + (fx - 11) + ' 318 L' + (fx - 11) + ' 340 L' + (fx - 48) + ' 386 Q' + fx + ' 392 ' + (fx + 48) + ' 386 L' + (fx + 11) + ' 340 L' + (fx + 11) + ' 318';
    if (fl) {
      var vol = 20 + fl.vadd, h = Math.min(40, 16 + vol * 0.32), yTop = 386 - h, p = T.pinkness(fl.veq, fl.vadd, Mb(), fl.ind);
      var halfAt = function (y) { return y >= 340 ? 11 + (y - 340) / 46 * 37 : 11; };
      g.appendChild(el('path', { d: 'M' + (fx - halfAt(yTop)) + ' ' + yTop + ' L' + (fx + halfAt(yTop)) + ' ' + yTop + ' L' + (fx + 48) + ' 386 Q' + fx + ' 391 ' + (fx - 48) + ' 386 Z', fill: (function () { var q = p > 0 ? 0.25 + 0.75 * p : 0, c = [Math.round(226 + (236 - 226) * q), Math.round(238 + (72 - 238) * q), Math.round(244 + (153 - 244) * q)]; return 'rgba(' + c.join(',') + ',' + (p > 0 ? 0.92 : 0.5) + ')'; })() }));
      if (st.anim && st.anim.flash) g.appendChild(el('ellipse', { class: 'flash', cx: fx, cy: yTop + 6, rx: 10 + 16 * st.anim.flash, ry: 4 + 3 * st.anim.flash, fill: 'rgba(236,72,153,.75)' }));
    }
    g.appendChild(el('path', { d: flaskPath, class: 'glass' }));
    // burette tube
    var top = 14, bot = Y0 + 50 * PX + 12;
    if (B.filled) { var ly = Y0 + B.r * PX; g.appendChild(el('rect', { x: bx - bw / 2 + 2, y: ly, width: bw - 4, height: bot - ly, fill: liquid })); g.appendChild(el('path', { d: 'M' + (bx - bw / 2 + 2) + ' ' + (ly - 1.2) + ' Q' + bx + ' ' + (ly + 2) + ' ' + (bx + bw / 2 - 2) + ' ' + (ly - 1.2), stroke: '#e9f6ff', 'stroke-width': 1.4, fill: 'none' })); }
    g.appendChild(el('rect', { x: bx - bw / 2, y: top, width: bw, height: bot - top, class: 'glass', rx: 2 }));
    for (var m = 0; m <= 50; m += 5) { var yy = Y0 + m * PX; g.appendChild(el('line', { x1: bx - bw / 2, x2: bx - bw / 2 + (m % 10 ? 5 : 9), y1: yy, y2: yy, stroke: '#cfe3ee', 'stroke-width': 1 })); if (m % 10 === 0) g.appendChild(el('text', { x: bx + bw / 2 + 4, y: yy + 4, class: 'lblm' }, String(m))); }
    // tap and nozzle
    g.appendChild(el('path', { d: 'M' + (bx - bw / 2) + ' ' + bot + ' L' + (bx - 3) + ' ' + (bot + 14) + ' L' + (bx + 3) + ' ' + (bot + 14) + ' L' + (bx + bw / 2) + ' ' + bot, class: 'glass' }));
    g.appendChild(el('rect', { x: bx - 13, y: bot + 14, width: 26, height: 8, rx: 3, fill: '#2f3b44', stroke: '#9fb3be' }));
    g.appendChild(el('rect', { x: bx - 2.5, y: bot + 22, width: 5, height: 42, class: 'glass' }));
    if (B.filled) g.appendChild(el('rect', { x: bx - 1.5, y: bot + 22, width: 3, height: 41, fill: liquid }));
    if (B.filled && B.bubble) g.appendChild(el('ellipse', { cx: bx, cy: bot + 40, rx: 2.2, ry: 6, fill: '#0b1d29', stroke: '#e9f6ff', 'stroke-width': 1 }));
    if (st.anim && st.anim.drop) g.appendChild(el('circle', { class: 'drop', cx: bx, cy: bot + 66, r: 2.6, fill: liquid }));
    // labels
    g.appendChild(el('text', { x: bx + 30, y: 120, class: 'lbl' }, 'Burette'));
    g.appendChild(el('text', { x: bx + 30, y: 136, class: 'lblm' }, B.filled ? baseName() + ' solution' : 'empty'));
    g.appendChild(el('text', { x: bx + 54, y: 340, class: 'lbl' }, 'Flask'));
    g.appendChild(el('text', { x: bx + 54, y: 356, class: 'lblm' }, fl ? '20 mL ' + (fl.kind === 'ox' ? 'oxalic' : 'HCl') : 'empty'));
    if (fl && fl.ind) g.appendChild(el('text', { x: bx + 54, y: 371, class: 'lblm' }, '+ indicator'));
    // close-up of the burette scale
    var zx = 300, zy = 16, zw = 320, zh = 390, zc = zx + zw / 2;
    g.appendChild(el('rect', { x: zx, y: zy, width: zw, height: zh, rx: 12, fill: '#0e2433', stroke: 'rgba(255,255,255,.14)' }));
    g.appendChild(el('text', { x: zx + 14, y: zy + 22, class: 'lbl' }, 'Close-up of the burette (eye level)'));
    var tx = zc - 85, tw = 150, ty = zy + 48, th = zh - 58;
    var clip = el('clipPath', { id: 'zc' }); clip.appendChild(el('rect', { x: tx, y: ty, width: tw, height: th, rx: 6 })); g.appendChild(clip);
    var zg = el('g', { 'clip-path': 'url(#zc)' }); g.appendChild(zg);
    zg.appendChild(el('rect', { x: tx, y: ty, width: tw, height: th, fill: '#eaf3f6' }));
    var centre = B.filled ? B.r : 0, K = 180, mid = ty + th / 2, yOf = function (v) { return mid + (v - centre) * K; };
    if (B.filled) {
      var my = yOf(B.r), edge = 0.1 * K;
      zg.appendChild(el('path', { d: 'M' + tx + ' ' + (my - edge) + ' Q' + (tx + 6) + ' ' + (my - 2) + ' ' + (tx + 30) + ' ' + my + ' L' + (tx + tw - 30) + ' ' + my + ' Q' + (tx + tw - 6) + ' ' + (my - 2) + ' ' + (tx + tw) + ' ' + (my - edge) + ' L' + (tx + tw) + ' ' + (ty + th) + ' L' + tx + ' ' + (ty + th) + ' Z', fill: 'rgba(120,180,215,.55)' }));
      zg.appendChild(el('path', { d: 'M' + tx + ' ' + (my - edge) + ' Q' + (tx + 6) + ' ' + (my - 2) + ' ' + (tx + 30) + ' ' + my + ' L' + (tx + tw - 30) + ' ' + my + ' Q' + (tx + tw - 6) + ' ' + (my - 2) + ' ' + (tx + tw) + ' ' + (my - edge), stroke: '#1a5d82', 'stroke-width': 2.4, fill: 'none' }));
    }
    var lo = Math.max(0, Math.floor((centre - 1.3) * 10)), hi = Math.min(500, Math.ceil((centre + 1.3) * 10));
    for (var k = lo; k <= hi; k++) {
      var yk = yOf(k / 10), whole = k % 10 === 0, half = k % 5 === 0, len = whole ? tw : half ? 70 : 46;
      zg.appendChild(el('line', { x1: tx, x2: tx + len, y1: yk, y2: yk, class: 'tick', 'stroke-width': whole ? 2 : 1.2 }));
      if (whole) zg.appendChild(el('text', { x: tx + 78, y: yk - 6, class: 'num' }, String(k / 10)));
    }
    g.appendChild(el('rect', { x: tx, y: ty, width: tw, height: th, rx: 6, fill: 'none', stroke: '#cfe3ee', 'stroke-width': 2 }));
    if (B.filled) {
      var ey = yOf(B.r);
      g.appendChild(el('line', { x1: tx + tw + 6, x2: zx + zw - 12, y1: ey, y2: ey, stroke: '#ffde59', 'stroke-dasharray': '5 4', 'stroke-width': 1.4 }));
      g.appendChild(el('text', { x: tx + tw + 8, y: ey - 7, class: 'lblm', fill: '#ffde59' }, 'eye'));
    } else g.appendChild(el('text', { x: zc, y: mid, 'text-anchor': 'middle', class: 'lblm' }, 'Fill the burette'));
    g.appendChild(el('text', { x: zx + 14, y: zy + 38, class: 'lblm' }, 'small division = 0.1 mL'));
    st.anim = null;
  }

  /* ---------- render ---------- */
  function render() {
    var s = st.s, single = st.mode === 'single';
    Array.prototype.forEach.call(document.querySelectorAll('#modeChips [data-m]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-m') === st.mode)); });
    $('titChips').hidden = single; $('titChips').style.display = single ? 'none' : '';
    Array.prototype.forEach.call(document.querySelectorAll('#titChips [data-t]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-t') === st.tit)); });
    $('given').innerHTML = single
      ? 'Standard oxalic acid: <b>' + s.Mox + ' M</b> (in the flask, 20 mL by pipette)<br>Burette: <b>' + s.base + '</b> solution of unknown strength<br>Indicator: phenolphthalein (colourless → pale pink)'
      : 'Standard oxalic acid: <b>' + s.Mox + ' M</b> · HCl of unknown strength<br>Link solution in the burette: <b>NaOH</b> (strength not known)<br>Titration I gives the NaOH molarity; titration II then gives the HCl molarity.';
    buildRinse();
    $('bubbleBtn').disabled = !(st.bur.filled && st.bur.bubble);
    $('initNoted').textContent = st.flask && st.flask.init != null ? 'Initial reading noted: ' + f2(st.flask.initTyped) + ' mL' : '';
    var stp = [!!(st.bur.filled && st.rinse.burette), !!(st.flask && st.flask.ind), !!(st.flask && st.flask.init != null)];
    Array.prototype.forEach.call(document.querySelectorAll('#steps li'), function (li) { var k = +li.getAttribute('data-s'); li.className = k < 3 && stp[k] ? 'done' : (k === stp.indexOf(false) || (k === 3 && stp.indexOf(false) < 0)) ? 'now' : ''; });
    var body = $('obsBody'); body.innerHTML = '';
    if (!st.rows.length) body.innerHTML = '<tr class="empty"><td colspan="6">No readings yet</td></tr>';
    var count = {};
    st.rows.forEach(function (r) {
      count[r.tit] = (count[r.tit] || 0) + 1; var tr = document.createElement('tr');
      [r.tit === 'ox' ? (single ? 'Oxalic acid' : 'I (oxalic acid)') : 'II (HCl)', String(count[r.tit]), f2(r.i), f2(r.f), f2(r.v), r.rough ? 'rough' : r.over ? 'overshot' : r.bubble ? 'air bubble' : ''].forEach(function (v) { var td = document.createElement('td'); td.textContent = v; tr.appendChild(td); }); body.appendChild(tr);
    });
    var c1 = conc('ox'), c2 = single ? null : conc('hcl');
    $('resultLine').textContent = c1 ? (single ? 'Concordant titre V₂ = ' + f2(c1.v) + ' mL of ' + s.base + ' for V₁ = 20 mL of ' + s.Mox + ' M oxalic acid.' : 'Titration I: ' + f2(c1.v) + ' mL NaOH for 20 mL of ' + s.Mox + ' M oxalic acid.' + (c2 ? ' Titration II: ' + f2(c2.v) + ' mL NaOH for 20 mL HCl.' : '')) : '';
    var list = $('checks'), items = readingChecks(); list.innerHTML = '';
    items.forEach(function (c) { var li = document.createElement('li'); li.className = c.k; li.textContent = c.t; list.appendChild(li); }); $('checksH').hidden = !items.length;
    var rv = $('revealBox');
    if (st.revealed) {
      rv.hidden = false; var e = expected(), t = trueAnswer();
      var got = e ? (single ? e.str : e.str) : undefined;
      if (got === undefined) rv.textContent = 'Not yet: get concordant titres ' + (single ? '' : 'for both titrations ') + 'first, then check your answer.';
      else { var err = Math.abs(got - t.str) / t.str * 100; rv.textContent = 'Actual strength of the ' + t.what + ': ' + t.str.toFixed(2) + ' g/L (' + t.M.toFixed(4) + ' M). From your titres: ' + got.toFixed(2) + ' g/L, an error of ' + err.toFixed(1) + '%.' + (err <= 1 ? ' Well done: that is within normal laboratory accuracy.' : ' Look at the checks above: rinsing, air bubbles and overshooting all cause errors.') + (st.calcOk ? '' : ' Also complete "Your calculation" and check it.'); }
    } else rv.hidden = true;
    var stt = $('status'), m = st.msg || defaultStatus(); stt.textContent = m.text; stt.className = 'status' + (m.kind ? ' ' + m.kind : '');
    draw();
  }
  function defaultStatus() {
    if (!st.rinse.burette || !st.bur.filled) return { kind: '', text: 'Step 1: choose how to rinse the burette, pipette and flask, then fill the burette with the ' + baseName() + ' solution.' };
    if (st.bur.bubble) return { kind: '', text: 'There is an air bubble in the burette nozzle. Remove it before taking the initial reading.' };
    if (!st.flask) return { kind: '', text: 'Pipette 20 mL of ' + acidName() + ' into the conical flask on the white tile.' };
    if (!st.flask.ind) return { kind: '', text: 'Add two drops of phenolphthalein to the flask.' };
    if (st.flask.init == null) return { kind: '', text: 'Read the burette in the close-up (bottom of the meniscus) and note the initial reading.' };
    return { kind: '', text: 'Run in the base, swirling the flask, until the first permanent pale pink.' };
  }
  fresh('single'); render();
  if (typeof window !== 'undefined') window.__titr = st;
})();
