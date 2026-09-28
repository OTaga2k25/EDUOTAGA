/* ESP32 Prototype Bench: FreeRTOS scheduler timeline for the tasks this bench's firmware would run */
(() => {
"use strict";
const B = window.Bench;
const $ = (s, r = document) => r.querySelector(s);
const { esc } = B;

const rt = { rate: 200, baud: 921600, win: 20e-3, blocking: false, printInSensor: false, displayInSensor: false, result: null, dirty: true };
const COLORS = { wifi: "#72aeea", web: "#b78ce8", mqtt: "#5fc9d1", safety: "#f2766b", sensor: "#e48b48", comms: "#44aa8e", user: "#e6b546", display: "#e874b3" };

$("#dp-rtos").innerHTML = `
  <div class="inst" style="grid-template-columns:minmax(0,1fr) 270px">
    <div style="display:flex;flex-direction:column;gap:8px;min-width:0">
      <div class="screen" style="flex:1;background:var(--panel-2);box-shadow:inset 0 0 0 1px var(--line)"><canvas id="rtCanvas"></canvas></div>
      <div class="rt-legend" id="rtLegend"></div>
    </div>
    <div class="inst-side">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
        <label class="field"><span>Sample rate</span><select id="rtRate">${[50, 100, 200, 500, 1000].map(v => `<option value="${v}" ${v === 200 ? "selected" : ""}>${v} Hz</option>`).join("")}</select></label>
        <label class="field"><span>Serial baud</span><select id="rtBaud"><option value="115200">115 200</option><option value="921600" selected>921 600</option></select></label>
        <label class="field" style="grid-column:1/-1"><span>Window</span><select id="rtWin"><option value="0.01">10 ms</option><option value="0.02" selected>20 ms</option><option value="0.05">50 ms</option><option value="0.2">200 ms</option></select></label>
      </div>
      <label class="check"><input type="checkbox" id="rtBlock"><span>Mistake: read the DS18B20 inside sensorTask (blocks 750 ms)</span></label>
      <label class="check"><input type="checkbox" id="rtPrint"><span>Mistake: Serial.print inside sensorTask instead of the queue</span></label>
      <label class="check" id="rtDispF"><input type="checkbox" id="rtDisp"><span>Mistake: redraw the display inside sensorTask on every sample</span></label>
      <div class="rt-stats" id="rtStats"></div>
      <p class="note" id="rtNote"></p>
    </div>
  </div>`;
$("#rtRate").addEventListener("change", e => { rt.rate = +e.target.value; rt.dirty = true; });
$("#rtBaud").addEventListener("change", e => { rt.baud = +e.target.value; rt.dirty = true; });
$("#rtWin").addEventListener("change", e => { rt.win = +e.target.value; rt.dirty = true; });
$("#rtBlock").addEventListener("change", e => { rt.blocking = e.target.checked; rt.dirty = true; });
$("#rtPrint").addEventListener("change", e => { rt.printInSensor = e.target.checked; rt.dirty = true; });
$("#rtDisp").addEventListener("change", e => { rt.displayInSensor = e.target.checked; rt.dirty = true; });

// ─── task set derived from the bench ───
function taskSet() {
  const S = B.state, comps = S.comps;
  const has = t => comps.some(c => c.type === t && Object.keys(c.pins).some(p => B.nets && B.nets.of(c.id + ":" + p).keys.length > 1));
  const period = 1 / rt.rate;
  let sensorRun = 30e-6, i2cRun = 0;
  const parts = [];
  const I2C_COST = { mpu: 1, bme: 1, ina: 1 };
  comps.forEach(c => {
    if (!B.isSensor(c)) return;
    const cost = { pot: 100e-6, ldr: 100e-6, turb: 100e-6, button: 3e-6, mpu: 380e-6, bme: 260e-6, sonar: ((B.distanceFor(c) ?? 655) * 58e-6) + 460e-6,
      jsn: (Math.max(20, B.state.env.distance) * 58e-6) + 460e-6, pir: 3e-6, leak: 100e-6, mq2: 100e-6, ina: 300e-6 }[c.type];
    if (cost) { if (I2C_COST[c.type]) i2cRun += cost; else sensorRun += cost; parts.push(`${c.name} ${(cost * 1e6).toFixed(0)} µs`); }
  });
  const channels = comps.filter(c => B.isSensor(c) || c.type === "motor" || c.type === "servo").length || 1;
  const lineBytes = 16 + 9 * channels;
  const txTime = lineBytes * 10 / rt.baud;
  const tasks = [];
  if (S.wifi) {
    tasks.push({ id: "wifi", name: "wifi (IDF)", core: 0, prio: 23, period: 2.5e-3, offset: 0.4e-3, phases: [["run", 160e-6]] });
    tasks.push({ id: "web", name: "webTask", core: 0, prio: 1, period: 20e-3, offset: 3e-3, phases: [["run", 300e-6]] });
    tasks.push({ id: "mqtt", name: "mqtt_task", core: 0, prio: 5, period: 50e-3, offset: 7e-3, phases: [["run", 450e-6]] });
  }
  tasks.push({ id: "safety", name: "safetyTask", core: 1, prio: 5, period: 250e-3, offset: 1e-3, phases: [["run", 15e-6]] });
  const dispXfer = (has("lcd") ? 35e-3 : 0) + (has("oled") ? 23e-3 : 0);
  const sensorPhases = [["run", sensorRun]];
  if (i2cRun) sensorPhases.push(["lock"], ["run", i2cRun], ["unlock"]);
  if (dispXfer && rt.displayInSensor) sensorPhases.push(["lock"], ["block", dispXfer], ["unlock"]);
  if (rt.printInSensor) sensorPhases.push(["run", 40e-6], ["block", txTime]);
  if (rt.blocking) sensorPhases.push(["run", 20e-6], ["block", 0.75]);
  tasks.push({ id: "sensor", name: "sensorTask", core: 1, prio: 4, period, offset: 0.2e-3, phases: sensorPhases, producer: !rt.printInSensor });
  if (!rt.printInSensor) tasks.push({ id: "comms", name: "commsTask", core: 1, prio: 3, consumer: true, phases: [["run", 40e-6], ["block", txTime]] });
  if (dispXfer && !rt.displayInSensor) tasks.push({ id: "display", name: "displayTask", core: 1, prio: 1, period: 0.25, offset: 6e-3, phases: [["lock"], ["block", dispXfer], ["unlock"]] });
  if (has("dht") || has("ds18")) tasks.push({ id: "user", name: "userSensorTask", core: 1, prio: 2, period: 0.5, offset: 5e-3, phases: has("dht") ? [["run", 5e-3]] : [["run", 20e-6], ["block", 0.75]] });
  return { tasks, period, sensorRun: sensorRun + i2cRun + (rt.displayInSensor ? dispXfer : 0), lineBytes, txTime, parts, channels, dispXfer, i2cRun };
}

// ─── discrete-time scheduler: fixed priority, preemptive, per core ───
function simulate() {
  const ts = taskSet(), { tasks } = ts;
  const win = rt.win, dt = Math.max(2e-6, win / 6000), steps = Math.ceil(win / dt);
  const QMAX = 64;
  let queue = 0, drops = 0, misses = 0, produced = 0;
  const st = tasks.map(t => ({ t, job: null, nextRel: t.offset || 0, segs: [], cur: null, curStart: 0, busy: 0 }));
  const mark = (s, state, time) => { if (s.cur !== state) { if (s.cur !== null && s.cur !== "idle") s.segs.push([s.curStart, time, s.cur]); s.cur = state; s.curStart = time; } };
  const qSeries = [];
  let owner = null, mutexWaits = 0;
  // run through zero-time phases: take / give the I2C mutex
  const settle = s => {
    while (s.job && s.job.ph < s.t.phases.length) {
      const k = s.t.phases[s.job.ph][0];
      if (k === "lock") { if (owner && owner !== s) { s.job.waiting = true; return; } owner = s; s.job.waiting = false; s.job.ph++; }
      else if (k === "unlock") { if (owner === s) owner = null; s.job.ph++; }
      else { s.job.left = s.job.left ?? s.t.phases[s.job.ph][1]; return; }
    }
    if (s.job && s.job.ph >= s.t.phases.length) { s.job = null; if (s.t.producer) { if (queue < QMAX) queue++; else drops++; } }
  };
  const start = s => { s.job = { ph: 0, left: null }; settle(s); };
  for (let i = 0; i < steps; i++) {
    const time = i * dt;
    // releases
    for (const s of st) {
      if (s.t.consumer) { if (!s.job && queue > 0) { queue--; start(s); } continue; }
      if (time >= s.nextRel) {
        if (s.job) { if (s.t.id === "sensor") misses++; }
        else start(s);
        s.nextRel += s.t.period;
      }
      if (s.job && s.job.waiting) { settle(s); if (s.job && s.job.waiting && s.t.id === "sensor") mutexWaits += dt; }
    }
    // blocked phases count down in wall time
    for (const s of st) if (s.job && !s.job.waiting && s.t.phases[s.job.ph][0] === "block") { s.job.left -= dt; }
    // pick highest-priority runnable job per core
    for (const core of [0, 1]) {
      const ready = st.filter(s => s.t.core === core).filter(s => s.job && !s.job.waiting && s.t.phases[s.job.ph][0] === "run");
      ready.sort((a, b) => b.t.prio - a.t.prio);
      ready.forEach((s, k) => { if (k === 0) { s.job.left -= dt; s.busy += dt; mark(s, "run", time); } else mark(s, "ready", time); });
    }
    // advance finished phases
    for (const s of st) {
      if (!s.job) { mark(s, "idle", time); continue; }
      const ph = s.t.phases[s.job.ph];
      if (s.job.waiting || ph[0] === "block") mark(s, "block", time);
      if (!s.job.waiting && s.job.left <= 0) { s.job.ph++; s.job.left = null; settle(s); if (!s.job) produced++; }
    }
    if (i % Math.max(1, Math.floor(steps / 300)) === 0) qSeries.push([time, queue]);
  }
  st.forEach(s => mark(s, "end", win));
  const cpu = [0, 1].map(core => st.filter(s => s.t.core === core).reduce((a, s) => a + s.busy, 0) / win);
  const consumeRate = 1 / (40e-6 + ts.txTime);
  const fillPerSec = rt.printInSensor ? 0 : Math.max(0, rt.rate - consumeRate);
  return { ts, st, cpu, misses, drops, queue, qSeries, win, consumeRate, fillPerSec, mutexWaits };
}

// ─── drawing ───
function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
function draw() {
  const r = rt.result;
  const cv = $("#rtCanvas"), box = cv.parentElement.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = Math.max(10, Math.round(box.width * dpr)); cv.height = Math.max(10, Math.round(box.height * dpr));
  const ctx = cv.getContext("2d"), w = cv.width, h = cv.height;
  const ink = css("--ink"), muted = css("--muted"), line = css("--line");
  ctx.clearRect(0, 0, w, h);
  const labW = 118 * dpr, top = 8 * dpr, axisH = 18 * dpr, qH = 34 * dpr;
  const rows = r.st.length, rowH = Math.max(14 * dpr, Math.min(26 * dpr, (h - top - axisH - qH - 12 * dpr) / rows));
  const X = t => labW + t / r.win * (w - labW - 10 * dpr);
  ctx.font = `600 ${11 * dpr}px "IBM Plex Mono", monospace`;
  r.st.forEach((s, i) => {
    const y = top + i * rowH;
    const col = COLORS[s.t.id] || "#999";
    ctx.fillStyle = ink; ctx.fillText(s.t.name, 6 * dpr, y + rowH * 0.62);
    ctx.fillStyle = muted; ctx.font = `500 ${9.5 * dpr}px "IBM Plex Mono", monospace`;
    ctx.fillText(`c${s.t.consumer ? 1 : s.t.core} p${s.t.prio}`, labW - 40 * dpr, y + rowH * 0.62);
    ctx.font = `600 ${11 * dpr}px "IBM Plex Mono", monospace`;
    ctx.strokeStyle = line; ctx.beginPath(); ctx.moveTo(labW, y + rowH - 0.5); ctx.lineTo(w, y + rowH - 0.5); ctx.stroke();
    for (const [a, b, state] of s.segs) {
      const x0 = X(a), x1 = Math.max(X(b), x0 + 1);
      if (state === "run") { ctx.fillStyle = col; ctx.fillRect(x0, y + 3 * dpr, x1 - x0, rowH - 6 * dpr); }
      else if (state === "ready") { ctx.fillStyle = col; ctx.globalAlpha = 0.25; ctx.fillRect(x0, y + 3 * dpr, x1 - x0, rowH - 6 * dpr); ctx.globalAlpha = 1; }
      else if (state === "block") { ctx.strokeStyle = col; ctx.setLineDash([3 * dpr, 3 * dpr]); ctx.beginPath(); ctx.moveTo(x0, y + rowH / 2); ctx.lineTo(x1, y + rowH / 2); ctx.stroke(); ctx.setLineDash([]); }
    }
  });
  // core divider
  const firstCore1 = r.st.findIndex(s => s.t.core === 1);
  if (firstCore1 > 0) { ctx.strokeStyle = muted; ctx.lineWidth = 1.5 * dpr; ctx.beginPath(); ctx.moveTo(0, top + firstCore1 * rowH); ctx.lineTo(w, top + firstCore1 * rowH); ctx.stroke(); ctx.lineWidth = 1; }
  // queue depth
  const qy = top + rows * rowH + 8 * dpr;
  ctx.fillStyle = muted; ctx.fillText("queue", 6 * dpr, qy + qH * 0.6);
  ctx.strokeStyle = line; ctx.strokeRect(labW, qy, w - labW - 10 * dpr, qH);
  ctx.strokeStyle = COLORS.comms; ctx.lineWidth = 1.5 * dpr; ctx.beginPath();
  r.qSeries.forEach(([t, q], i) => { const x = X(t), y = qy + qH - q / 64 * qH; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
  ctx.stroke(); ctx.lineWidth = 1;
  // axis
  const ay = h - 4 * dpr;
  ctx.fillStyle = muted; ctx.font = `500 ${10 * dpr}px "IBM Plex Mono", monospace`;
  for (let k = 0; k <= 4; k++) { const t = r.win * k / 4, x = X(t); ctx.fillText((t * 1e3).toFixed(t < 0.01 ? 1 : 0) + " ms", Math.min(x, w - 48 * dpr), ay); }
}
function renderSide() {
  const r = rt.result, ts = r.ts;
  $("#rtLegend").innerHTML = `<span><i style="background:${COLORS.sensor}"></i>running</span><span><i style="background:${COLORS.sensor};opacity:.3"></i>ready, waiting for the CPU</span><span><i style="border-top:2px dashed ${COLORS.sensor};background:none;height:0;width:12px"></i> blocked (delay, UART, sensor)</span><span>core 0 above the line, core 1 below</span>`;
  const secDrops = r.fillPerSec, fillTime = secDrops > 0 ? 64 / secDrops : null;
  $("#rtStats").innerHTML = `
    <div>CPU0 load<br><b>${(r.cpu[0] * 100).toFixed(0)} %</b></div><div>CPU1 load<br><b>${(r.cpu[1] * 100).toFixed(0)} %</b></div>
    <div>sensorTask<br><b>${(ts.sensorRun * 1e3).toFixed(2)} ms</b> / ${(ts.period * 1e3).toFixed(1)} ms</div>
    <div>serial line<br><b>${ts.lineBytes} B</b> = ${(ts.txTime * 1e3).toFixed(2)} ms</div>
    <div>missed samples<br><b style="color:${r.misses ? "var(--err)" : "inherit"}">${r.misses}</b> in window</div>
    <div>queue drops<br><b style="color:${secDrops ? "var(--err)" : "inherit"}">${secDrops ? secDrops.toFixed(0) + "/s" : "0"}</b></div>`;
  let note;
  $("#rtDispF").hidden = !ts.dispXfer;
  if (rt.displayInSensor && ts.dispXfer) note = `<b>The display is killing the sample rate.</b> A redraw keeps the I²C bus busy for ${(ts.dispXfer * 1e3).toFixed(0)} ms, but a sample is due every ${(ts.period * 1e3).toFixed(1)} ms. Give the display its own low-priority task at 4 Hz.`;
  else if (ts.dispXfer && r.mutexWaits > 0) note = `<b>Mutex contention.</b> displayTask holds the I²C mutex for ${(ts.dispXfer * 1e3).toFixed(0)} ms per redraw, so sensorTask waits (dashed) and misses ${r.misses} sample${r.misses === 1 ? "" : "s"} in this window. Fixes: shorter redraws (update only changed text), a second I²C bus, or read the sensors first and draw after.`;
  else if (rt.blocking) note = `<b>sensorTask is stuck.</b> A 750 ms blocking read inside a ${rt.rate} Hz loop misses ~${Math.round(0.75 * rt.rate)} samples every time. Slow sensors belong in their own task (userSensorTask).`;
  else if (ts.sensorRun > ts.period) note = `<b>Overrun.</b> Reading the sensors takes ${(ts.sensorRun * 1e3).toFixed(2)} ms but a sample is due every ${(ts.period * 1e3).toFixed(2)} ms. Lower the rate, or move the slow part (${esc(ts.parts.join(", "))}) out.`;
  else if (rt.printInSensor) note = `<b>Printing inside the sampler</b> makes every sample wait for the UART (${(ts.txTime * 1e3).toFixed(2)} ms). With the queue, commsTask absorbs that and the sampler stays on time.`;
  else if (secDrops) note = `<b>The queue fills in ${fillTime.toFixed(2)} s.</b> commsTask can send ${r.consumeRate.toFixed(0)} lines/s at ${rt.baud} baud, but ${rt.rate} arrive. Raise the baud, lower the rate or send fewer bytes.`;
  else note = `<b>Healthy.</b> sensorTask (priority 4) always preempts commsTask (3), so sampling stays on time. Wi-Fi runs on core 0 and never touches core 1. Try 1000 Hz at 115 200 baud, or tick a mistake.`;
  $("#rtNote").innerHTML = note;
}
function refresh() {
  if (!B.nets) return;
  rt.result = simulate();
  rt.dirty = false;
  draw();
  renderSide();
}
B.on("change", () => { rt.dirty = true; });
B.on("wifi", () => { rt.dirty = true; });
B.on("dock", name => { if (name === "rtos") refresh(); });
B.on("tick", () => { if (B.dockVisible("rtos") && rt.dirty) refresh(); });
let rto;
new ResizeObserver(() => { clearTimeout(rto); rto = setTimeout(() => { if (B.dockVisible("rtos") && rt.result) draw(); }, 120); }).observe($("#dp-rtos"));
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { if (rt.result) draw(); });
})();
