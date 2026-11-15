/* Logic gates on an IC trainer: truth tables. Logic core is DOM-free for Node tests. */
var Gates = (function () {
  'use strict';
  // pins: inputs and output of the first gate in each IC (standard 74-series pin-outs)
  var G = {
    AND: { ic: '7408', name: 'AND', expr: 'Y = A · B', two: true, f: function (a, b) { return a & b; }, pins: { a: 1, b: 2, y: 3 } },
    OR: { ic: '7432', name: 'OR', expr: 'Y = A + B', two: true, f: function (a, b) { return a | b; }, pins: { a: 1, b: 2, y: 3 } },
    NOT: { ic: '7404', name: 'NOT', expr: 'Y = Ā', two: false, f: function (a) { return 1 - a; }, pins: { a: 1, y: 2 } },
    NAND: { ic: '7400', name: 'NAND', expr: 'Y = (A · B)‾', two: true, f: function (a, b) { return 1 - (a & b); }, pins: { a: 1, b: 2, y: 3 } },
    NOR: { ic: '7402', name: 'NOR', expr: 'Y = (A + B)‾', two: true, f: function (a, b) { return 1 - (a | b); }, pins: { y: 1, a: 2, b: 3 } },
    XOR: { ic: '7486', name: 'XOR', expr: 'Y = A ⊕ B', two: true, f: function (a, b) { return a ^ b; }, pins: { a: 1, b: 2, y: 3 } },
    BUF: { ic: '—', name: 'buffer', expr: 'Y = A', two: false, f: function (a) { return a; }, pins: { a: 1, y: 2 } }   // only a wrong choice in the quiz
  };
  var ORDER = ['AND', 'OR', 'NOT', 'NAND', 'NOR', 'XOR'];
  function combos(g) { return G[g].two ? ['00', '01', '10', '11'] : ['0', '1']; }
  function out(g, a, b) { return G[g].f(a, b); }
  /** Which gates are consistent with a (partial) recorded table {combo: y}? (only two-input combos compared for two-input gates) */
  function consistent(table, two) {
    return ORDER.filter(function (k) {
      if (G[k].two !== two) return false;
      return Object.keys(table).every(function (c) { var a = +c[0], b = two ? +c[1] : 0; return out(k, a, b) === table[c]; });
    });
  }
  function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  return { G: G, ORDER: ORDER, combos: combos, out: out, consistent: consistent, mulberry32: mulberry32 };
})();
if (typeof module !== 'undefined' && module.exports) { module.exports = Gates; }

/* ------------------------------------------------------------------ */
/* UI                                                                  */
/* ------------------------------------------------------------------ */
if (typeof document !== 'undefined') {
  (function () {
    'use strict';
    var $ = function (id) { return document.getElementById(id); };
    var G = Gates.G;
    var state = { mode: 'learn', gate: 'AND', mystery: null, a: 0, b: 0, power: true, tables: {}, mysteryTable: {}, quizDone: {}, mysteryGuess: null, msg: null, solved: 0 };
    function newMystery() { var r = Math.random(), keys = Gates.ORDER.filter(function (k) { return G[k].two; }); state.mystery = keys[Math.floor(r * keys.length)]; state.mysteryTable = {}; state.mysteryGuess = null; }
    newMystery();
    function say(k, t) { state.msg = { kind: k, text: t }; }
    function gate() { return state.mode === 'learn' ? state.gate : state.mystery; }
    function table() { if (state.mode === 'mystery') return state.mysteryTable; return (state.tables[state.gate] = state.tables[state.gate] || {}); }
    function two() { return G[gate()].two; }
    function combo() { return two() ? '' + state.a + state.b : '' + state.a; }
    function y() { return state.power ? Gates.out(gate(), state.a, state.b) : 0; }

    /* ---------- board drawing ---------- */
    function pinX(p) { return p <= 7 ? 375 + (p - 1) * 25 : 375 + (14 - p) * 25; }
    function drawBoard() {
      var g = gate(), pins = G[g].pins, s = '', hiA = state.power && state.a, hiB = state.power && state.b, hiY = y() === 1;
      // IC body and pins
      for (var p = 1; p <= 14; p++) {
        var x = pinX(p), top = p > 7;
        s += '<rect x="' + (x - 4) + '" y="' + (top ? 94 : 270) + '" width="8" height="16" class="pin"/>';
        s += '<text x="' + x + '" y="' + (top ? 126 : 262) + '" text-anchor="middle" class="pinno">' + p + '</text>';
      }
      s += '<rect x="360" y="110" width="180" height="160" rx="6" class="chipbody"/><path d="M360,175 a14,14 0 0 1 0,30" fill="#0e2433" stroke="#3a434c" stroke-width="2"/>';
      s += '<text x="450" y="195" text-anchor="middle" class="icl">' + (state.mode === 'mystery' ? 'IC ?' : G[g].ic) + '</text>';
      s += '<text x="450" y="218" text-anchor="middle" class="pinno">' + (state.mode === 'mystery' ? 'unknown gate' : G[g].name + ' gate') + '</text>';
      // supply: pin 14 to +5 V, pin 7 to ground
      s += '<polyline points="' + pinX(14) + ',94 ' + pinX(14) + ',40" class="wire hi"/><polyline points="' + pinX(7) + ',286 ' + pinX(7) + ',355" class="wire"/>';
      // switches
      function sw(yc, on, label) {
        return '<rect x="80" y="' + (yc - 26) + '" width="44" height="52" rx="8" class="swbase"/>' +
          '<line x1="102" y1="' + yc + '" x2="' + (on ? 102 : 102) + '" y2="' + (on ? yc - 22 : yc + 22) + '" class="swlever"/>' +
          '<text x="70" y="' + (yc + 5) + '" text-anchor="end" class="lbl">' + label + '</text>' +
          '<circle cx="150" cy="' + (yc - 32) + '" r="7" class="ledin' + (on && state.power ? ' on' : '') + '"/>' +
          '<text x="150" y="' + (yc - 45) + '" text-anchor="middle" class="pinno">' + (on ? '1' : '0') + '</text>';
      }
      s += sw(150, state.a, 'A');
      if (two()) s += sw(250, state.b, 'B');
      // input wiring routed under the chip
      s += '<polyline points="124,150 230,150 230,325 ' + pinX(pins.a) + ',325 ' + pinX(pins.a) + ',286" class="wire' + (hiA ? ' hi' : '') + '"/>';
      if (two()) s += '<polyline points="124,250 262,250 262,310 ' + pinX(pins.b) + ',310 ' + pinX(pins.b) + ',286" class="wire' + (hiB ? ' hi' : '') + '"/>';
      // output to the LED
      s += '<polyline points="' + pinX(pins.y) + ',286 ' + pinX(pins.y) + ',338 700,338 700,190 745,190" class="wire' + (hiY ? ' hi' : '') + '"/>';
      s += '<circle cx="770" cy="190" r="22" class="led' + (hiY ? ' on' : '') + '"/><text x="770" y="236" text-anchor="middle" class="lbl">Y</text>';
      s += '<polyline points="792,190 830,190 830,355" class="wire"/>';
      s += '<text x="770" y="150" text-anchor="middle" class="lbl small">' + (state.power ? (hiY ? 'LED on: Y = 1' : 'LED off: Y = 0') : 'power off') + '</text>';
      $('board').innerHTML = s;
    }
    /* ---------- symbol ---------- */
    var SYM = {
      AND: '<line x1="0" y1="22" x2="20" y2="22"/><line x1="0" y1="48" x2="20" y2="48"/><path d="M20,10 H55 A25,25 0 0 1 55,60 H20 Z"/><line x1="80" y1="35" x2="118" y2="35"/>',
      OR: '<line x1="0" y1="22" x2="26" y2="22"/><line x1="0" y1="48" x2="26" y2="48"/><path d="M18,10 Q48,8 64,18 Q78,26 85,35 Q78,44 64,52 Q48,62 18,60 Q32,35 18,10 Z"/><line x1="85" y1="35" x2="118" y2="35"/>',
      NOT: '<line x1="0" y1="35" x2="25" y2="35"/><path d="M25,12 L25,58 L72,35 Z"/><circle cx="78" cy="35" r="6"/><line x1="84" y1="35" x2="118" y2="35"/>',
      NAND: '<line x1="0" y1="22" x2="20" y2="22"/><line x1="0" y1="48" x2="20" y2="48"/><path d="M20,10 H55 A25,25 0 0 1 55,60 H20 Z"/><circle cx="86" cy="35" r="6"/><line x1="92" y1="35" x2="118" y2="35"/>',
      NOR: '<line x1="0" y1="22" x2="26" y2="22"/><line x1="0" y1="48" x2="26" y2="48"/><path d="M18,10 Q48,8 64,18 Q78,26 85,35 Q78,44 64,52 Q48,62 18,60 Q32,35 18,10 Z"/><circle cx="91" cy="35" r="6"/><line x1="97" y1="35" x2="118" y2="35"/>',
      XOR: '<line x1="0" y1="22" x2="26" y2="22"/><line x1="0" y1="48" x2="26" y2="48"/><path d="M10,10 Q24,35 10,60"/><path d="M18,10 Q48,8 64,18 Q78,26 85,35 Q78,44 64,52 Q48,62 18,60 Q32,35 18,10 Z"/><line x1="85" y1="35" x2="118" y2="35"/>'
    };
    function drawSym() {
      var show = state.mode === 'learn' || state.mysteryGuess === state.mystery, g = gate();
      $('sym').innerHTML = show ? SYM[g] : '<text x="60" y="42" text-anchor="middle" style="font:700 26px Space Mono,monospace;fill:#0c1c27">?</text>';
      $('symH').textContent = show ? G[g].name + ' gate symbol' : 'Gate symbol (find it out!)';
      $('exprLine').textContent = show && (state.mode === 'mystery' || state.quizDone[g]) ? G[g].expr : '';
    }

    /* ---------- actions ---------- */
    $('aBtn').addEventListener('click', function () { state.a = 1 - state.a; state.msg = null; render(); });
    $('bBtn').addEventListener('click', function () { if (!two()) return; state.b = 1 - state.b; state.msg = null; render(); });
    $('pBtn').addEventListener('click', function () { state.power = !state.power; state.msg = null; render(); });
    function record(v) {
      if (!state.power) { say('err', 'Switch the power on first. Without the +5 V supply the IC does not work and the LED stays off whatever the inputs.'); return render(); }
      var yy = y(), c = combo(), tab = table();
      if (v !== yy) { say('err', 'Look at the LED again: it is ' + (yy ? 'ON, so Y = 1' : 'OFF, so Y = 0') + '. Record what you actually see.'); return render(); }
      tab[c] = yy;
      var left = Gates.combos(gate()).filter(function (k) { return tab[k] === undefined; });
      if (left.length) say('good', 'Recorded: ' + (two() ? 'A = ' + c[0] + ', B = ' + c[1] : 'A = ' + c) + ' gives Y = ' + yy + '. Now set the switches to ' + left.map(function (k) { return two() ? 'A=' + k[0] + ' B=' + k[1] : 'A=' + k; }).join(', ') + '.');
      else say('good', 'The truth table is complete. ' + (state.mode === 'learn' ? 'Now choose the Boolean expression that matches it.' : 'Now decide which gate is inside the mystery IC.'));
      render();
    }
    $('rec0').addEventListener('click', function () { record(0); });
    $('rec1').addEventListener('click', function () { record(1); });
    $('clearT').addEventListener('click', function () { if (state.mode === 'learn') { state.tables[state.gate] = {}; state.quizDone[state.gate] = false; } else { state.mysteryTable = {}; state.mysteryGuess = null; } say('warn', 'Table cleared.'); render(); });
    $('newMystery').addEventListener('click', function () { newMystery(); say('warn', 'A new unlabelled IC is on the board. Find its truth table.'); render(); });
    Array.prototype.forEach.call(document.querySelectorAll('#modeChips [data-m]'), function (b) { b.addEventListener('click', function () { state.mode = b.getAttribute('data-m'); state.a = state.b = 0; state.msg = null; render(); }); });
    $('gateChips').addEventListener('click', function (e) { var b = e.target.closest('[data-g]'); if (!b) return; state.gate = b.getAttribute('data-g'); state.a = state.b = 0; state.msg = null; render(); });
    $('quizOpts').addEventListener('click', function (e) {
      var b = e.target.closest('[data-q]'); if (!b) return; var pick = b.getAttribute('data-q'), g = gate();
      if (state.mode === 'learn') {
        if (pick === g) { state.quizDone[g] = true; $('quizFb').textContent = 'Correct: ' + G[g].expr + '. Your table matches the ' + G[g].name + ' gate.'; say('good', G[g].name + ' gate verified. Choose another gate above.'); }
        else { $('quizFb').textContent = 'Not quite: ' + G[pick].expr + ' would give Y = ' + Gates.combos(g).map(function (c) { return Gates.out(pick, +c[0], +(c[1] || 0)); }).join(', ') + ' for the rows in order, but your table shows ' + Gates.combos(g).map(function (c) { return table()[c]; }).join(', ') + '. Try again.'; }
      } else {
        state.mysteryGuess = pick;
        if (pick === state.mystery) { state.solved++; $('quizFb').textContent = 'Correct! It is a ' + G[pick].name + ' gate (IC ' + G[pick].ic + '). Its truth table matches only that gate.'; say('good', 'Solved. Press “New mystery IC” to try another.'); }
        else $('quizFb').textContent = 'No: a ' + G[pick].name + ' gate would give ' + Gates.combos(state.mystery).map(function (c) { return Gates.out(pick, +c[0], +c[1]); }).join(', ') + ', but the IC gave ' + Gates.combos(state.mystery).map(function (c) { return state.mysteryTable[c]; }).join(', ') + '. Compare row by row and try again.';
      }
      render(true);
    });

    /* ---------- render ---------- */
    function defaultStatus() {
      if (!state.power) return { kind: 'warn', text: 'Power is off: the IC has no supply.' };
      var tab = table(), c = combo();
      if (tab[c] !== undefined) return { kind: '', text: 'This combination is already recorded (Y = ' + tab[c] + '). Change the switches to another combination.' };
      return { kind: '', text: (state.mode === 'mystery' ? 'Mystery IC: ' : G[gate()].name + ' gate (' + G[gate()].ic + '): ') + 'set the switches, look at the LED and record Y.' };
    }
    function render(keepFb) {
      var g = gate(), tw = two(), tab = table();
      Array.prototype.forEach.call(document.querySelectorAll('#modeChips [data-m]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-m') === state.mode)); });
      $('gateChips').hidden = state.mode !== 'learn'; $('newMystery').hidden = state.mode !== 'mystery';
      $('gateChips').innerHTML = Gates.ORDER.map(function (k) { return '<button type="button" class="chip" data-g="' + k + '" aria-pressed="' + (k === state.gate) + '">' + k + ' ' + G[k].ic + (state.quizDone[k] ? ' ✓' : '') + '</button>'; }).join('');
      $('aBtn').textContent = 'A = ' + state.a; $('aBtn').setAttribute('aria-pressed', String(!!state.a));
      $('bBtn').textContent = 'B = ' + state.b; $('bBtn').setAttribute('aria-pressed', String(!!state.b)); $('bBtn').hidden = !tw;
      $('pBtn').textContent = state.power ? 'Power ON' : 'Power OFF'; $('pBtn').setAttribute('aria-pressed', String(state.power));
      $('benchHint').textContent = state.mode === 'mystery' ? 'An unlabelled 2-input gate IC (standard pin-out: inputs on pins 1 and 2, output on pin 3). Pin 14: +5 V, pin 7: ground.' :
        G[g].ic + ': ' + (tw ? 'inputs on pins ' + G[g].pins.a + ' and ' + G[g].pins.b + ', output on pin ' + G[g].pins.y : 'input on pin 1, output on pin 2') + '. Pin 14: +5 V, pin 7: ground.' + (g === 'NOR' ? ' Note: on the 7402 the output comes first (pin 1).' : '');
      drawBoard(); drawSym();
      $('ttTitle').textContent = 'Truth table: ' + (state.mode === 'mystery' ? 'mystery IC' : G[g].name + ' gate (' + G[g].ic + ')');
      $('ttHead').innerHTML = '<tr><th>A</th>' + (tw ? '<th>B</th>' : '') + '<th>Y (LED)</th></tr>';
      $('ttBody').innerHTML = Gates.combos(g).map(function (c) { var v = tab[c]; return '<tr' + (c === combo() ? ' class="now"' : '') + '><td>' + c[0] + '</td>' + (tw ? '<td>' + c[1] + '</td>' : '') + '<td class="' + (v === 1 ? 'y1' : '') + '">' + (v === undefined ? '?' : v) + '</td></tr>'; }).join('');
      var complete = Gates.combos(g).every(function (c) { return tab[c] !== undefined; });
      $('quizBox').hidden = !complete;
      if (complete) {
        var opts = state.mode === 'learn' ? (tw ? Gates.ORDER.filter(function (k) { return G[k].two; }) : ['BUF', 'NOT']) : Gates.ORDER.filter(function (k) { return G[k].two; });
        $('quizQ').textContent = state.mode === 'learn' ? 'Which Boolean expression does your table show?' : 'Which gate is inside the mystery IC?';
        $('quizOpts').innerHTML = opts.map(function (k) { return '<button type="button" class="chip" data-q="' + k + '">' + (state.mode === 'learn' ? G[k].expr : k) + '</button>'; }).join('');
        if (!keepFb) $('quizFb').textContent = state.mode === 'learn' && state.quizDone[g] ? 'Correct: ' + G[g].expr + '.' : state.mode === 'mystery' && state.mysteryGuess === state.mystery ? 'Solved: ' + G[g].name + ' gate.' : '';
      }
      var items = [], done = Gates.ORDER.filter(function (k) { return state.quizDone[k]; });
      if (state.mode === 'learn') {
        items.push(done.length === Gates.ORDER.length ? { k: 'ok', t: 'All six gates verified. Try the mystery IC.' } : { k: done.length ? 'ok' : 'tip', t: done.length + ' of 6 gates verified' + (done.length ? ' (' + done.join(', ') + ').' : '. Start with AND.') });
        if (state.quizDone.AND && state.quizDone.NAND) items.push({ k: 'tip', t: 'Compare AND and NAND: every output of NAND is the opposite of AND. NAND = NOT(AND), and the same holds for NOR = NOT(OR).' });
        if (state.quizDone.XOR) items.push({ k: 'tip', t: 'XOR gives 1 only when A and B differ, so it can be used to check whether two bits are equal.' });
      } else {
        var cons = Gates.consistent(state.mysteryTable, true), n = Object.keys(state.mysteryTable).length;
        if (n && n < 4) items.push({ k: 'tip', t: 'After ' + n + ' row' + (n > 1 ? 's' : '') + ', the IC could still be: ' + cons.join(', ') + '. Each new row rules some gates out.' });
        if (state.solved) items.push({ k: 'ok', t: state.solved + ' mystery IC' + (state.solved > 1 ? 's' : '') + ' identified.' });
      }
      var list = $('checks'); list.innerHTML = ''; items.forEach(function (c) { var li = document.createElement('li'); li.className = c.k; li.textContent = c.t; list.appendChild(li); }); $('checksH').hidden = !items.length;
      var st = state.msg || defaultStatus(); $('status').textContent = st.text; $('status').className = 'status' + (st.kind ? ' ' + st.kind : '');
    }
    render();
  })();
}
