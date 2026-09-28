/* ESP32 Prototype Bench: simulated MQTT broker (QoS 0/1, retained, Last Will, wildcards, commands) */
(() => {
"use strict";
const B = window.Bench;
const $ = (s, r = document) => r.querySelector(s);
const { esc } = B;
const now = () => performance.now() / 1000;
const T0 = now();

const mq = {
  conn: "off",            // off | connecting | on | lost
  qos: 1, interval: 2, keepalive: 5, loss: 0, retainStatus: true, lwt: true,
  base: "site/bottle1", client: "bottle1",
  cut: false, cleanOff: false, connectAt: 0, lwtAt: 0, lastPub: 0, seq: 0, pid: 1,
  log: [], dirty: true, retained: new Map(), queued: [], inflight: [],
  sub: { name: "python_service", filter: "site/+/telemetry", got: [] },
};
const match = (filter, topic) => {
  const f = filter.split("/"), t = topic.split("/");
  for (let i = 0; i < f.length; i++) {
    if (f[i] === "#") return true;
    if (i >= t.length) return false;
    if (f[i] !== "+" && f[i] !== t[i]) return false;
  }
  return f.length === t.length;
};

// ─── UI ───
$("#dp-mqtt").innerHTML = `
  <div class="mq">
    <div class="mq-col cfg">
      <div><span class="pill off" id="mqState">offline</span></div>
      <p class="note" id="mqWhy"></p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
        <label class="field"><span>QoS</span><select id="mqQos"><option value="0">0 · at most once</option><option value="1" selected>1 · at least once</option></select></label>
        <label class="field"><span>Publish every</span><select id="mqInt"><option value="1">1 s</option><option value="2" selected>2 s</option><option value="5">5 s</option></select></label>
        <label class="field"><span>Keepalive</span><select id="mqKa"><option value="5" selected>5 s</option><option value="10">10 s</option><option value="30">30 s</option></select></label>
        <label class="field"><span>Packet loss <output id="mqLossO">0%</output></span><input type="range" id="mqLoss" min="0" max="0.6" step="0.05" value="0"></label>
      </div>
      <label class="check"><input type="checkbox" id="mqLwt" checked><span>Last Will: broker publishes "offline" if the node vanishes</span></label>
      <label class="check"><input type="checkbox" id="mqRet" checked><span>Retain the status message</span></label>
      <div class="btnrow">
        <button class="btn small" id="mqCut">Pull the plug</button>
        <button class="btn small" id="mqClean">Disconnect cleanly</button>
      </div>
    </div>
    <div class="mq-col">
      <div class="mq-diagram" id="mqDia">
        <svg preserveAspectRatio="none" viewBox="0 0 100 100"><line x1="14" y1="50" x2="50" y2="50" stroke="var(--line)" stroke-width="0.8" vector-effect="non-scaling-stroke"/><line x1="50" y1="50" x2="86" y2="26" stroke="var(--line)" vector-effect="non-scaling-stroke"/><line x1="50" y1="50" x2="86" y2="74" stroke="var(--line)" vector-effect="non-scaling-stroke"/></svg>
        <div class="mq-node" id="nDev" style="left:14%;top:50%">bottle1</div>
        <div class="mq-node" style="left:50%;top:50%" title="lab.local:1883">broker</div>
        <div class="mq-node" id="nPy" style="left:86%;top:26%" title="python_service">python</div>
        <div class="mq-node" id="nUi" style="left:86%;top:74%" title="the publish box">you</div>
      </div>
      <div class="mq-log" id="mqLog" aria-label="Broker log"></div>
    </div>
    <div class="mq-col">
      <div class="eyebrow">Subscriber: python_service</div>
      <label class="field"><span>Topic filter (+ one level, # the rest)</span><input type="text" id="mqFilter" value="site/+/telemetry" spellcheck="false"></label>
      <div class="mq-log" id="mqGot" style="min-height:70px"></div>
      <div class="eyebrow" style="margin-top:4px">Publish</div>
      <input type="text" id="mqTopic" value="site/bottle1/cmd" spellcheck="false" aria-label="Topic">
      <textarea id="mqPayload" spellcheck="false" aria-label="Payload">{"thruster": 40}</textarea>
      <div class="btnrow"><button class="btn small" id="mqSend">Publish</button>
        <select id="mqEx" style="width:auto;flex:1"><option value="">Examples…</option>
          <option value='{"thruster": 40}'>thruster 40 %</option><option value='{"thruster": 0}'>thruster stop</option>
          <option value='{"servo": 0}'>drop the weight</option><option value='{"led": 100}'>strobe on</option><option value='{"leak_reset": true}'>clear the leak</option></select></div>
    </div>
  </div>`;
$("#mqQos").addEventListener("change", e => { mq.qos = +e.target.value; });
$("#mqInt").addEventListener("change", e => { mq.interval = +e.target.value; });
$("#mqKa").addEventListener("change", e => { mq.keepalive = +e.target.value; });
$("#mqLoss").addEventListener("input", e => { mq.loss = +e.target.value; $("#mqLossO").textContent = Math.round(mq.loss * 100) + "%"; });
$("#mqLwt").addEventListener("change", e => { mq.lwt = e.target.checked; });
$("#mqRet").addEventListener("change", e => { mq.retainStatus = e.target.checked; });
$("#mqCut").addEventListener("click", () => { mq.cut = !mq.cut; mq.cleanOff = false; $("#mqCut").textContent = mq.cut ? "Plug back in" : "Pull the plug"; });
$("#mqClean").addEventListener("click", () => {
  if (mq.conn === "on") { log("dev", "sys", "DISCONNECT", "", "clean: no Last Will"); mq.cleanOff = true; mq.conn = "off"; fly("dev", "brk"); }
  else { mq.cleanOff = false; }
  $("#mqClean").textContent = mq.cleanOff ? "Reconnect" : "Disconnect cleanly";
});
$("#mqFilter").addEventListener("change", e => {
  mq.sub.filter = e.target.value.trim() || "#";
  log("py", "sys", "SUBSCRIBE", mq.sub.filter, "");
  for (const [topic, payload] of mq.retained) if (match(mq.sub.filter, topic)) deliverSub(topic, payload, true);
});
$("#mqEx").addEventListener("change", e => { if (e.target.value) $("#mqPayload").value = e.target.value; e.target.value = ""; });
$("#mqSend").addEventListener("click", () => {
  const topic = $("#mqTopic").value.trim(), payload = $("#mqPayload").value.trim();
  if (!topic) return;
  log("ui", "pub", "PUBLISH", topic, payload, `QoS ${mq.qos}`);
  fly("ui", "brk");
  route(topic, payload, "ui");
});

// ─── log ───
function log(from, cls, type, topic, payload, extra = "") {
  mq.log.push({ t: now() - T0, from, cls, type, topic, payload: String(payload), extra });
  if (mq.log.length > 300) mq.log.splice(0, mq.log.length - 300);
  mq.dirty = true;
}
const WHO = { dev: "bottle1", brk: "broker", py: "python", ui: "you" };
function renderLog() {
  if (!mq.dirty) return;
  mq.dirty = false;
  const el = $("#mqLog");
  const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
  el.innerHTML = mq.log.slice(-160).map(e => `<div class="row ${e.cls === "drop" ? "drop" : ""}"><span class="t">${e.t.toFixed(1).padStart(6)}s</span> <span class="${e.cls === "lwt" ? "lwt" : e.cls === "sys" ? "sys" : "dim"}">${WHO[e.from] || e.from} ${esc(e.type)}</span> ${e.topic ? `<span class="tp">${esc(e.topic)}</span> ` : ""}${esc(e.payload.length > 90 ? e.payload.slice(0, 90) + "…" : e.payload)} <span class="dim">${esc(e.extra)}</span></div>`).join("");
  if (atBottom) el.scrollTop = el.scrollHeight;
  const got = $("#mqGot");
  got.innerHTML = mq.sub.got.slice(-40).map(g => `<div class="row"><span class="t">${g.t.toFixed(1).padStart(6)}s</span> <span class="tp">${esc(g.topic)}</span> ${esc(g.payload.length > 60 ? g.payload.slice(0, 60) + "…" : g.payload)}${g.retained ? ' <span class="dim">(retained)</span>' : ""}</div>`).join("") || `<div class="dim">Nothing matches "${esc(mq.sub.filter)}" yet.</div>`;
  got.scrollTop = got.scrollHeight;
}

// ─── message flow animation ───
const POS = { dev: [14, 50], brk: [50, 50], py: [86, 26], ui: [86, 74] };
function fly(a, b, color) {
  if (!B.dockVisible("mqtt")) return;
  const dia = $("#mqDia"), dot = document.createElement("div");
  dot.className = "mq-dot";
  if (color) dot.style.background = color;
  dia.appendChild(dot);
  const [x1, y1] = POS[a], [x2, y2] = POS[b];
  const anim = dot.animate([{ left: x1 + "%", top: y1 + "%" }, { left: x2 + "%", top: y2 + "%" }], { duration: matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : 520, easing: "ease-in-out" });
  anim.onfinish = () => dot.remove();
}

// ─── broker ───
function deliverSub(topic, payload, retained) {
  mq.sub.got.push({ t: now() - T0, topic, payload, retained });
  if (mq.sub.got.length > 120) mq.sub.got.splice(0, mq.sub.got.length - 120);
  mq.dirty = true;
}
function route(topic, payload, from, retain) {
  if (retain) mq.retained.set(topic, payload);
  if (match(mq.sub.filter, topic)) { log("brk", "pub", "→ python", topic, payload); fly("brk", "py"); deliverSub(topic, payload, false); }
  if (from !== "dev" && topic === mq.base + "/cmd") {
    if (mq.conn === "on") { log("brk", "pub", "→ bottle1", topic, payload); setTimeout(() => fly("brk", "dev"), 260); applyCmd(payload); }
    else if (mq.qos === 1) { mq.queued.push(payload); log("brk", "sys", "QUEUED", topic, payload, "bottle1 is offline: QoS 1 keeps it for the session"); }
    else log("brk", "drop", "DROPPED", topic, payload, "bottle1 offline and QoS 0: nobody gets it");
  }
}
function applyCmd(payload) {
  let cmd;
  try { cmd = JSON.parse(payload); } catch (e) { log("dev", "sys", "IGNORED", mq.base + "/cmd", payload, "not valid JSON"); return; }
  const applied = {};
  const first = t => B.state.comps.find(c => c.type === t);
  const setManual = (c, v) => { c.props.src = "manual"; c.props.manual = Math.max(0, Math.min(1, v)); };
  if ("thruster" in cmd && first("motor")) { setManual(first("motor"), cmd.thruster / 100); applied.thruster = cmd.thruster; }
  if ("servo" in cmd && first("servo")) { setManual(first("servo"), cmd.servo / 180); applied.servo = cmd.servo; }
  if ("led" in cmd && first("led")) { setManual(first("led"), cmd.led / 100); applied.led = cmd.led; }
  if (cmd.leak_reset) B.state.comps.filter(c => c.type === "button").forEach(c => { c.props.pressed = false; applied.leak_reset = true; });
  B.serialPrint(`# MQTT cmd: ${JSON.stringify(applied)}`);
  B.changed({ inspector: true });
  setTimeout(() => publish(mq.base + "/cmd/ack", JSON.stringify({ ok: Object.keys(applied).length > 0, applied }), 1), 350);
}
function publish(topic, payload, qos = mq.qos, retain = false, retry = 0) {
  const lost = Math.random() < mq.loss;
  const id = mq.pid++;
  fly("dev", "brk", lost ? "var(--err)" : undefined);
  if (lost) {
    log("dev", "drop", `PUBLISH${retry ? " (DUP)" : ""}`, topic, payload, qos ? `QoS 1 id=${id}: lost on Wi-Fi, will retry` : "QoS 0: lost for good");
    if (qos === 1 && retry < 4) mq.inflight.push({ at: now() + 1.0, topic, payload, retain, retry: retry + 1 });
    return;
  }
  log("dev", "pub", `PUBLISH${retry ? " (DUP)" : ""}`, topic, payload, `QoS ${qos}${retain ? " retain" : ""}${qos ? ` id=${id}` : ""}`);
  if (qos === 1) setTimeout(() => { log("brk", "sys", "PUBACK", "", "", `id=${id}`); fly("brk", "dev", "var(--ok)"); }, 180);
  route(topic, payload, "dev", retain);
}
function telemetry() {
  const p = { seq: ++mq.seq, ts: +B.simT.toFixed(2) };
  for (const c of B.state.comps) {
    if (B.isSensor(c)) { const r = B.readings.get(c.id); if (r) p[c.name] = isNaN(parseFloat(r.csv)) ? r.csv : parseFloat(r.csv); }
    else if (c.type === "motor") p[c.name] = Math.round(((B.outputs.get(c.id) || {}).speed || 0) * 100);
    else if (c.type === "servo") p[c.name] = Math.round((B.outputs.get(c.id) || {}).angle ?? 90);
  }
  if (B.leakActive()) p.leak = true;
  return JSON.stringify(p);
}

// ─── connection state machine ───
function tick() {
  const t = now(), S = B.state;
  const online = S.running && S.wifi && !mq.cut && !mq.cleanOff;
  if (mq.conn === "off" && online) {
    mq.conn = "connecting"; mq.connectAt = t + 0.9;
    log("dev", "sys", "CONNECT", "", "", `client=${mq.client} keepalive=${mq.keepalive}s${mq.lwt ? ` will=${mq.base}/status "offline"` : ""}`);
    fly("dev", "brk");
  }
  if (mq.conn === "connecting" && !online) mq.conn = "off";
  if (mq.conn === "connecting" && t >= mq.connectAt) {
    mq.conn = "on"; mq.lastPub = t;
    log("brk", "sys", "CONNACK", "", "", "accepted");
    fly("brk", "dev", "var(--ok)");
    log("dev", "sys", "SUBSCRIBE", mq.base + "/cmd", "", "QoS 1");
    publish(mq.base + "/status", "online", 1, mq.retainStatus);
    while (mq.queued.length) { const p = mq.queued.shift(); log("brk", "pub", "→ bottle1", mq.base + "/cmd", p, "delivered from the queue"); applyCmd(p); }
  }
  if (mq.conn === "on" && !online) {
    mq.conn = "lost"; mq.lwtAt = t + mq.keepalive * 1.5;
    log("brk", "sys", "…", "", "", `no packets from bottle1. Broker waits 1.5 × keepalive = ${(mq.keepalive * 1.5).toFixed(1)} s`);
  }
  if (mq.conn === "lost") {
    if (online) { mq.conn = "on"; log("brk", "sys", "…", "", "", "bottle1 is back before the timeout"); }
    else if (t >= mq.lwtAt) {
      mq.conn = "off";
      if (mq.lwt) { log("brk", "lwt", "LAST WILL", mq.base + "/status", "offline", "published by the broker on bottle1's behalf"); route(mq.base + "/status", "offline", "brk", mq.retainStatus); }
      else log("brk", "sys", "TIMEOUT", "", "", "bottle1 gone. No Last Will, so subscribers never find out");
    }
  }
  if (mq.conn === "on" && t - mq.lastPub >= mq.interval) { mq.lastPub = t; publish(mq.base + "/telemetry", telemetry()); }
  for (let i = mq.inflight.length - 1; i >= 0; i--) {
    const m = mq.inflight[i];
    if (t >= m.at) { mq.inflight.splice(i, 1); if (mq.conn === "on") publish(m.topic, m.payload, 1, m.retain, m.retry); }
  }
  if (B.dockVisible("mqtt")) render();
}
let lastState = "";
function render() {
  const S = B.state;
  const st = mq.conn === "on" ? ["on", "connected"] : mq.conn === "connecting" ? ["wait", "connecting…"] : mq.conn === "lost" ? ["wait", "silent: broker waiting"] : ["off", "offline"];
  const why = !S.running ? "Press <b>Run</b> to power the node." : !S.wifi ? "Wi-Fi is off (top bar)." : mq.cut ? "Unplugged: the broker hasn't noticed yet. Watch for the Last Will." : mq.cleanOff ? "Disconnected cleanly: no Last Will is sent." :
    mq.conn === "on" ? `Publishing <b>${mq.base}/telemetry</b> every ${mq.interval} s. Try packet loss with QoS 0 and then QoS 1.` : "";
  const key = st.join() + why;
  if (key !== lastState) {
    lastState = key;
    $("#mqState").className = "pill " + st[0]; $("#mqState").textContent = st[1];
    $("#mqWhy").innerHTML = why;
    $("#nDev").className = "mq-node " + (mq.conn === "on" ? "on" : mq.conn === "off" ? "off" : "");
    $("#nPy").className = "mq-node on";
  }
  renderLog();
}
B.on("tick", tick);
B.on("dock", name => { if (name === "mqtt") { mq.dirty = true; lastState = ""; render(); } });
B.on("run", on => { if (!on) { $("#mqCut").textContent = "Pull the plug"; mq.cut = false; } });
})();
