/* ESP32 Prototype Bench: instrument dock, signal model, oscilloscope, logic analyzer, multimeter, power budget */
(() => {
"use strict";
const B = window.Bench;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const { clamp, esc } = B;
const V33 = 3.3;

// ═════════════════════════ dock ═════════════════════════
let dockTab = "scope";
let dockOpen = true;
try { const d = JSON.parse(localStorage.getItem("esp32bench.dock") || "null"); if (d) { dockTab = d.tab || dockTab; dockOpen = d.open !== false; } } catch (e) { /* no storage */ }
function saveDock() { try { localStorage.setItem("esp32bench.dock", JSON.stringify({ tab: dockTab, open: dockOpen })); } catch (e) { /* ignore */ } }
function showDock(name) {
  dockTab = name;
  $$(".dtab").forEach(b => b.setAttribute("aria-selected", String(b.dataset.dtab === name)));
  $$(".dpane").forEach(p => { p.hidden = p.id !== "dp-" + name; });
  saveDock();
  B.emit("dock", name);
}
function setDockOpen(open) {
  dockOpen = open;
  $("#dock").classList.toggle("collapsed", !open);
  $("#dockToggle").textContent = open ? "Hide instruments" : "Show instruments";
  $("#dockToggle").setAttribute("aria-expanded", String(open));
  saveDock();
  B.emit("dock", dockTab);
}
$$(".dtab").forEach(b => b.addEventListener("click", () => { if (!dockOpen) setDockOpen(true); showDock(b.dataset.dtab); }));
$("#dockToggle").addEventListener("click", () => setDockOpen(!dockOpen));
B.dockVisible = name => dockOpen && dockTab === name;
B.showDock = name => { setDockOpen(true); showDock(name); };

// ═════════════════════════ signal model ═════════════════════════
// Every net gets a descriptor: dc, analog, pwm, pulse, burst, i2c, uart or float.
const noise = t => { const x = Math.sin(t * 12.9898e3 + 78.233) * 43758.5453; return x - Math.floor(x) - 0.5; };
const DRIVING = new Set(["dout", "analog", "drvout", "motor", "io", "sda", "scl"]);
const partVcc = c => { const n = B.nets.of(c.id + ":VCC"); return n ? (n.hasVin ? usbV() : n.has3v3 ? V33 : n.hasBatP ? batV() : 0) : V33; };
const motorOfDriver = d => B.state.comps.find(m => m.type === "motor" && B.driverOfMotor(m) === d);
const motorSpeed = m => { const o = m && B.outputs.get(m.id); return o ? o.speed : 0; };
function usbV() { return power.last ? power.last.usbV : 5.0; }
function batV() { return power.last ? power.last.batV : 6.2; }
const running = () => B.state.running;

function partSource(m) {
  const c = m.c, run = running();
  const x = B.ext.part[c.type];
  if (x) { const r = x(c, m, run, partVcc); if (r) return r; }
  switch (m.kind) {
    case "dout":
      if (c.type === "button") return run ? { k: "dc", v: c.props.pressed ? 0 : V33, what: c.props.pressed ? "pressed: pulled to GND" : "released: held high by the pull-up" } : { k: "dc", v: 0, what: "board off: no pull-up" };
      if (c.type === "sonar") {
        const d = run ? B.distanceFor(c) : 0;
        if (!run) return { k: "dc", v: 0 };
        if (d == null) return { k: "pulse", period: 0.06, width: 38e-3, delay: 0.45e-3, v: partVcc(c), what: "ECHO: no echo, the sensor gives up after 38 ms" };
        return { k: "pulse", period: 0.06, width: Math.max(2, d) * 58e-6, delay: 0.45e-3, v: partVcc(c), what: "ECHO: width = distance × 58 µs" };
      }
      break;
    case "analog": {
      const vcc = partVcc(c);
      let v = 0;
      if (c.type === "pot") v = c.props.value * vcc;
      if (c.type === "ldr") v = B.state.env.light / 100 * vcc;
      if (c.type === "turb") v = clamp(4.2 - B.state.env.turbidity / 3000 * 2.7, 0, 4.5) * vcc / 5;
      if (c.props && c.props.divider) v *= 2 / 3;
      return { k: "analog", v, what: `${c.name} analog output` };
    }
    case "drvout": case "motor": {
      const d = m.kind === "drvout" ? c : B.driverOfMotor(c);
      const mot = m.kind === "motor" ? c : motorOfDriver(c);
      if (m.kind === "motor" && !d) {
        const n = B.nets.of(c.id + ":" + m.pin);
        if (n.gpios.length) return { k: "dc", v: run && B.srcLevel(c) > 0.05 ? 0.35 : 0, what: "GPIO collapsed under the motor's load" };
        return { k: "dc", v: 0 };
      }
      const sp = motorSpeed(mot);
      const rev = mot && mot.props.reverse;
      const pin = m.kind === "drvout" ? m.pin : (m.pin === "M+" ? "AO1" : "AO2");
      const vm = d ? (B.nets.of(d.id + ":VM").hasBatP ? batV() : B.nets.of(d.id + ":VM").hasVin ? usbV() : 0) : 0;
      const high = (pin === "AO1") !== !!rev;
      if (!run || sp <= 0) return { k: "dc", v: 0, what: "driver output off" };
      return high ? { k: "pwm", f: 20000, duty: sp, v: vm, what: "motor PWM at VM level" } : { k: "dc", v: 0, what: "low side" };
    }
    case "io":
      if (!run) return { k: "dc", v: 0 };
      return c.type === "dht" ? { k: "burst", period: 2, len: 5e-3, v: V33, what: "DHT22 answers once every 2 s" } : { k: "burst", period: 0.8, len: 2.8e-3, v: V33, what: "1-Wire reset + read every 0.8 s" };
    case "sda": case "scl":
      if (!run) return { k: "dc", v: 0 };
      return { k: "i2c", line: m.kind, g: B.gpioOf(c, "SDA"), v: V33, what: "I²C: idles high, bursts every 5 ms" };
  }
  return null;
}

// what the ESP32 is driving on GPIO g (found through the part it feeds)
function espOut(g) {
  if (!running()) return { k: "dc", v: 0, what: "board off" };
  if (g === 1) return { k: "uart", v: V33, what: "UART0 TX: the serial monitor" };
  for (const c of B.state.comps) {
    if (c.type === "esp32") continue;
    for (const [pin, kind] of B.T[c.type].pins) {
      if (kind !== "din") continue;
      if (B.gpioOf(c, pin) !== g) continue;
      const o = B.outputs.get(c.id) || {};
      const x = B.ext.espOut[c.type];
      if (x) { const r = x(c, pin, o); if (r) return r; }
      if (c.type === "led") return { k: "pwm", f: 5000, duty: o.level || 0, v: V33, what: "LEDC PWM 5 kHz: duty = brightness" };
      if (c.type === "buzzer") return { k: "dc", v: o.on ? V33 : 0, what: o.on ? "HIGH: buzzer on" : "LOW: buzzer off" };
      if (c.type === "servo") return { k: "pulse", period: 0.02, width: (500 + (o.angle ?? 90) / 180 * 2000) * 1e-6, delay: 0, v: V33, what: "50 Hz servo frame: width sets angle" };
      if (c.type === "sonar" || c.type === "jsn") return { k: "pulse", period: 0.06, width: 10e-6, delay: 0, v: V33, what: "10 µs trigger every 60 ms" };
      if (c.type === "driver") {
        const mot = motorOfDriver(c), sp = motorSpeed(mot), rev = mot && mot.props.reverse;
        if (pin === "PWMA") return { k: "pwm", f: 20000, duty: sp, v: V33, what: "20 kHz PWM: above human hearing" };
        if (pin === "AIN1") return { k: "dc", v: sp > 0 && !rev ? V33 : 0, what: "direction bit 1" };
        if (pin === "AIN2") return { k: "dc", v: sp > 0 && rev ? V33 : 0, what: "direction bit 2" };
      }
    }
  }
  return null;
}
const scaled = (s, f, what) => s ? Object.assign({}, s, { v: s.v * f, what: what || s.what }) : s;
const releveled = (s, v, what) => s ? Object.assign({}, s, { v: s.k === "dc" || s.k === "analog" ? (s.v > 1.6 ? v : 0) : v, what: what || s.what }) : s;
const hasDriver = n => n.gpios.length > 0 || n.metas.some(m => m.c.type !== "esp32" && DRIVING.has(m.kind));

function sigOfNet(n, depth = 0) {
  if (!n) return { k: "float" };
  const run = running();
  if (n.hasGnd || n.hasBatN) return { k: "dc", v: 0, what: "ground" };
  if (n.has3v3) return { k: "dc", v: run ? V33 : 0, what: run ? "3.3 V regulator output" : "board unplugged" };
  if (n.hasVin) return { k: "dc", v: run ? usbV() : 0, what: run ? "USB 5 V (VIN)" : "board unplugged" };
  if (n.hasBatP) return { k: "dc", v: batV(), what: "battery pack +" };
  for (const m of n.metas) if (m.c.type !== "esp32" && DRIVING.has(m.kind)) { const s = partSource(m); if (s) return s; }
  if (depth < 2) for (const m of n.metas) {
    if (m.kind === "divout") return scaled(sigOfNet(B.nets.of(m.c.id + ":IN"), depth + 1), 2 / 3, `${m.c.name} OUT = IN × 2/3`);
    if ((m.kind === "lvx" || m.kind === "hvx") && !hasDriver(n)) {
      const partner = B.nets.of(m.c.id + ":" + (m.kind === "lvx" ? "HV" : "LV") + m.pin.slice(2));
      if (partner && hasDriver(partner)) return releveled(sigOfNet(partner, depth + 1), m.kind === "lvx" ? V33 : usbV(), `${m.c.name} ${m.pin}: shifted copy`);
    }
  }
  if (n.gpios.length) { const s = espOut(n.gpios[0]); if (s) return s; }
  if (depth < 2) for (const m of n.metas) {
    if (m.kind === "lvx" || m.kind === "hvx") {
      const partner = B.nets.of(m.c.id + ":" + (m.kind === "lvx" ? "HV" : "LV") + m.pin.slice(2));
      if (partner && partner.gpios.length) { const s = espOut(partner.gpios[0]); if (s) return releveled(s, m.kind === "lvx" ? V33 : usbV(), `${m.c.name} ${m.pin}: shifted copy`); }
    }
  }
  return { k: "float", what: n.gpios.length ? "GPIO input with nothing driving it" : "nothing drives this net" };
}
const sigOfKey = key => sigOfNet(B.nets && B.nets.of(key));

// ─── I²C bit timeline (cached per bus) ───
const I2C_BIT = 2.5e-6, I2C_PERIOD = 5e-3, I2C_START = 0.2e-3;
function i2cDevices(sdaG) {
  return B.state.comps.filter(c => B.T[c.type] && B.T[c.type].i2c && B.gpioOf(c, "SDA") === sdaG);
}
function i2cPayload(c) {
  const r = B.readings.get(c.id);
  if (B.ext.i2c[c.type]) return B.ext.i2c[c.type](c, r);
  if (c.type === "mpu") {
    const e = B.state.env, p = (e.tilt || 0) * Math.PI / 180;
    const ax = Math.round(-Math.sin(p) * 8192), az = Math.round(Math.cos(p) * 8192), ay = Math.round(noise(B.simT) * 60);
    const w = v => [(v >> 8) & 0xff, v & 0xff];
    return { reg: 0x3b, bytes: [...w(ax), ...w(ay), ...w(az)], meaning: `ax ${ax} → ${(ax / 8192).toFixed(3)} g · ay ${ay} · az ${az} → ${(az / 8192).toFixed(3)} g`, ok: !!r };
  }
  const t = B.state.env.airTemp, raw = Math.round((t + 45) * 7000) & 0xfffff;
  return { reg: 0xfa, bytes: [(raw >> 12) & 0xff, (raw >> 4) & 0xff, (raw << 4) & 0xf0], meaning: `raw temperature 0x${raw.toString(16)} → ${t.toFixed(1)} °C after compensation`, ok: !!r };
}
function buildI2C(sdaG) {
  const ev = [], ann = [], T = I2C_BIT, q = T / 4;
  let t = 0, scl = 1, sda = 1;
  const set = (a, b) => { scl = a; sda = b; ev.push([t, scl, sda]); };
  set(1, 1); t += 2 * T;
  const start = label => { set(1, 1); t += q; set(1, 0); ann.push([t - q, t + q, label, "cond"]); t += q; set(0, 0); t += q; };
  const stop = () => { set(0, 0); t += q; set(1, 0); t += q; set(1, 1); ann.push([t - 2 * q, t, "P", "cond"]); t += T; };
  const byte = (b, label, type, ack, ackBy) => {
    const t0 = t;
    for (let i = 7; i >= 0; i--) { set(0, (b >> i) & 1); t += q; set(1, sda); t += 2 * q; set(0, sda); t += q; }
    ann.push([t0, t, label, type]);
    const a0 = t;
    set(0, ack ? 0 : 1); t += q; set(1, sda); t += 2 * q; set(0, sda); t += q;
    ann.push([a0, t, ack ? "A" : "N", ack ? "ack" : "nack", ackBy]);
  };
  const devs = i2cDevices(sdaG).map(c => ({ c, addr: B.T[c.type].i2c, p: i2cPayload(c), ok: !B.hasErr(c) }));
  for (const d of devs) {
    start("S");
    byte(d.addr << 1, `0x${d.addr.toString(16)} W`, "addr", d.ok, "dev");
    if (d.ok && d.p.write) {
      d.p.bytes.forEach(b => byte(b, "0x" + b.toString(16).padStart(2, "0").toUpperCase(), "data", true, "dev"));
    } else if (d.ok) {
      byte(d.p.reg, `0x${d.p.reg.toString(16).toUpperCase()}`, "reg", true, "dev");
      start("Sr");
      byte((d.addr << 1) | 1, `0x${d.addr.toString(16)} R`, "addr", true, "dev");
      d.p.bytes.forEach((b, i) => byte(b, "0x" + b.toString(16).padStart(2, "0").toUpperCase(), "data", i < d.p.bytes.length - 1, "host"));
    }
    stop();
    t += 8 * T;
  }
  set(1, 1);
  return { ev, ann, dur: t, devs };
}
let i2cCache = { key: "", data: null, at: -1 };
function i2cData(sdaG) {
  const key = sdaG + "|" + B.state.comps.map(c => c.id).join(",");
  if (i2cCache.key !== key || Math.abs(B.simT - i2cCache.at) > 0.25) i2cCache = { key, data: buildI2C(sdaG), at: B.simT };
  return i2cCache.data;
}
function lookup(ev, t, idx) {
  let lo = 0, hi = ev.length - 1;
  if (t < ev[0][0]) return ev[0][idx];
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (ev[mid][0] <= t) lo = mid; else hi = mid - 1; }
  return ev[lo][idx];
}

// ─── UART TX0 ───
const UART_BIT = 1 / 115200;
function uartText() {
  const lines = B.serialLines;
  for (let i = lines.length - 1; i >= 0; i--) if (lines[i] && !lines[i].startsWith("#")) return lines[i].trim();
  return "ready";
}
function uartLevel(t) {
  const ph = ((t % 0.5) + 0.5) % 0.5 - 0.1e-3;
  if (ph < 0) return 1;
  const txt = uartText() + "\n", frame = Math.floor(ph / (10 * UART_BIT));
  if (frame >= txt.length) return 1;
  const bit = Math.floor((ph - frame * 10 * UART_BIT) / UART_BIT);
  if (bit === 0) return 0;
  if (bit === 9) return 1;
  return (txt.charCodeAt(frame) >> (bit - 1)) & 1;
}

function evalSig(s, t) {
  switch (s.k) {
    case "dc": return s.v;
    case "analog": return s.v + noise(t) * 0.025;
    case "pwm": return ((t * s.f) % 1 + 1) % 1 < s.duty ? s.v : 0;
    case "pulse": { const ph = (((t - s.delay) % s.period) + s.period) % s.period; return ph < s.width ? s.v : 0; }
    case "burst": { const ph = ((t % s.period) + s.period) % s.period; if (ph > s.len) return s.v; return noise(Math.floor(ph / 80e-6)) > 0 ? s.v : 0.05; }
    case "i2c": {
      const d = i2cData(s.g), ph = (((t - I2C_START) % I2C_PERIOD) + I2C_PERIOD) % I2C_PERIOD;
      if (ph > d.dur) return s.v;
      return lookup(d.ev, ph, s.line === "scl" ? 1 : 2) ? s.v : 0.06;
    }
    case "uart": return uartLevel(t) ? s.v : 0.04;
    case "float": return 0.9 + 0.35 * Math.sin(2 * Math.PI * 50 * t) + noise(t) * 0.25;
  }
  return 0;
}
function avgOf(s) {
  switch (s.k) {
    case "dc": case "analog": return s.v;
    case "pwm": return s.duty * s.v;
    case "pulse": return s.width / s.period * s.v;
    case "burst": return s.v * 0.99;
    case "i2c": return s.v * 0.97;
    case "uart": return s.v * 0.98;
    default: return null;
  }
}
function nextRise(s, t) {
  switch (s.k) {
    case "pwm": return s.duty > 0 && s.duty < 1 ? Math.ceil(t * s.f) / s.f : null;
    case "pulse": return s.delay + Math.ceil((t - s.delay) / s.period) * s.period;
    case "burst": return Math.ceil(t / s.period) * s.period;
    case "i2c": return I2C_START + Math.ceil((t - I2C_START) / I2C_PERIOD) * I2C_PERIOD;
    case "uart": return 0.1e-3 + Math.ceil(t / 0.5) * 0.5;
  }
  return null;
}
const fmtT = s => s >= 1 ? s.toFixed(2) + " s" : s >= 1e-3 ? +(s * 1e3).toFixed(2) + " ms" : +(s * 1e6).toFixed(1) + " µs";
const fmtF = f => f >= 1000 ? +(f / 1000).toFixed(2) + " kHz" : +f.toFixed(2) + " Hz";
const fmtV = v => v == null ? "—" : v.toFixed(2) + " V";

// ─── net labels for channel pickers ───
function netLabel(n) {
  const esp = n.metas.filter(m => m.c.type === "esp32").map(m => B.pinTitle(m.c.id + ":" + m.pin));
  const parts = n.metas.filter(m => m.c.type !== "esp32").map(m => m.c.name + " " + m.pin);
  const head = esp.length ? esp.join("/") : parts.shift();
  const rest = parts.length > 3 ? parts.slice(0, 3).join(", ") + ` +${parts.length - 3}` : parts.join(", ");
  return rest ? `${head} · ${rest}` : head;
}
function channelList() {
  if (!B.nets) return [];
  const out = [];
  for (const n of B.nets.info.values()) {
    const connected = n.keys.length > 1;
    const isTx = n.gpios.includes(1);
    if (!connected && !isTx) continue;
    const key = n.keys.find(k => k.startsWith("esp:")) || n.keys[0];
    out.push({ key, label: isTx && !connected ? "GPIO 1 · TX0 (USB serial)" : netLabel(n), n });
  }
  const rank = o => (o.n.has3v3 || o.n.hasVin || o.n.hasGnd || o.n.hasBatP || o.n.hasBatN) ? 2 : o.n.gpios.length ? 0 : 1;
  return out.sort((a, b) => rank(a) - rank(b) || a.label.localeCompare(b.label));
}
function fillSelect(sel, list, cur, allowNone, keep) {
  // a probe placed on any pin of a net shows as that net; a probe on a lone pin gets its own entry
  const hit = cur ? list.find(o => o.key === cur || o.n.keys.includes(cur)) : null;
  const extra = keep && cur && !hit && B.pinMeta(cur) ? [`<option value="${esc(cur)}">${esc(B.pinTitle(cur))} (not wired)</option>`] : [];
  const opts = (allowNone ? [`<option value="">— off —</option>`] : []).concat(list.map(o => `<option value="${esc(o.key)}">${esc(o.label)}</option>`), extra);
  const html = opts.join("");
  if (sel.dataset.html !== html) { sel.innerHTML = html; sel.dataset.html = html; }
  if (hit) { sel.value = hit.key; return cur; }
  if (extra.length) { sel.value = cur; return cur; }
  sel.value = allowNone ? "" : (list[0] ? list[0].key : "");
  return sel.value;
}
function sizeCanvas(cv) {
  const r = cv.parentElement.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(10, Math.round(r.width * dpr)), h = Math.max(10, Math.round(r.height * dpr));
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  return { w, h, dpr };
}

// ═════════════════════════ oscilloscope ═════════════════════════
const TB = [10e-6, 20e-6, 50e-6, 100e-6, 200e-6, 500e-6, 1e-3, 2e-3, 5e-3, 10e-3, 20e-3, 50e-3];
const scope = { ch1: "", ch2: "", ch1Auto: true, gnd: "esp:GND2", tb: 5e-3, vdiv: 1, pos: 0, hpos: 0.1, hold: false, t0: 0 };
const VDIVS = [0.2, 0.5, 1, 2, 5];
const range = (a, b, st) => { const o = []; for (let v = a; v <= b + 1e-9; v += st) o.push(+v.toFixed(3)); return o; };
// every knob on both front panels (dock and 3D) is one of these
const KNOBS = {
  vdiv: { label: "V/DIV", list: VDIVS, get: () => scope.vdiv, set: v => { scope.vdiv = v; }, fmt: v => `${v} V` },
  vpos: { label: "V-POS", list: range(-3, 3, 0.5), get: () => scope.pos, set: v => { scope.pos = v; }, fmt: v => `${v > 0 ? "+" : ""}${v} div` },
  tb:   { label: "TIME/DIV", list: TB, get: () => scope.tb, set: v => { scope.tb = v; }, fmt: v => fmtT(v) },
  hpos: { label: "H-POS", list: range(0.1, 0.9, 0.1), get: () => scope.hpos, set: v => { scope.hpos = v; }, fmt: v => `trig ${Math.round(v * 100)} %`, orange: true },
};
const knobIndex = k => { const K = KNOBS[k], v = K.get(); let bi = 0; K.list.forEach((x, i) => { if (Math.abs(x - v) < Math.abs(K.list[bi] - v)) bi = i; }); return bi; };
const knobAngle = k => -135 + 270 * knobIndex(k) / (KNOBS[k].list.length - 1);
function knobStep(k, dir) {
  const K = KNOBS[k], i = clamp(knobIndex(k) + dir, 0, K.list.length - 1);
  K.set(K.list[i]); syncKnobs();
}
const knobHTML = k => `<div class="knobw"><div class="knob${KNOBS[k].orange ? " orange" : ""}" data-knob="${k}" role="slider" tabindex="0" aria-label="${KNOBS[k].label}"><i></i></div><span class="kl">${KNOBS[k].label}</span><span class="kv" data-kv="${k}"></span></div>`;
$("#dp-scope").innerHTML = `
  <div class="inst scope-inst">
    <div class="bezel">
      <div class="screen"><canvas id="scCanvas"></canvas><div class="overlay" id="scOverlay"></div><div class="empty" id="scEmpty" hidden></div></div>
      <div class="fpanel">
        <div class="fsec"><span class="fsec-t">VERTICAL</span><div class="knobs">${knobHTML("vdiv")}${knobHTML("vpos")}</div></div>
        <div class="fsec"><span class="fsec-t">HORIZONTAL</span><div class="knobs">${knobHTML("tb")}${knobHTML("hpos")}</div></div>
        <div class="fbtns"><button class="fbtn" id="scAuto" title="Pick time/div and volts/div for CH1">AUTO</button><button class="fbtn runstop" id="scHold" aria-pressed="false" title="Freeze the screen">RUN/STOP</button></div>
        <div class="bncs">
          <button class="bnc" data-place="ch1" title="Click, then click a pin on the bench"><i style="--c:#f3d23c"></i><span class="ch1">CH1</span></button>
          <button class="bnc" data-place="ch2" title="Click, then click a pin on the bench"><i style="--c:#4fd3e8"></i><span class="ch2">CH2</span></button>
          <button class="bnc gnd" data-place="gnd" title="Ground clip: click, then click a GND pin"><i style="--c:#1c1c1c"></i><span>⏚</span></button>
        </div>
      </div>
      <div class="brandline">DSO-2C · 2 CH · 50 MHz · 1 GSa/s</div>
    </div>
    <div class="inst-side">
      <label class="field"><span><b class="ch1">CH1</b> probe on <span class="muted">(or click the CH1 jack)</span></span><select id="scCh1"></select></label>
      <label class="field"><span><b class="ch2">CH2</b> probe on</span><select id="scCh2"></select></label>
      <div class="meas" id="scMeas"></div>
      <p class="note" id="scNote"></p>
    </div>
  </div>`;
$("#scCh1").addEventListener("change", e => { scope.ch1 = e.target.value; scope.ch1Auto = false; autoSet(); });
$("#scCh2").addEventListener("change", e => { scope.ch2 = e.target.value; });
$("#scAuto").addEventListener("click", autoSet);
$("#scHold").addEventListener("click", toggleHold);
function toggleHold() { scope.hold = !scope.hold; syncKnobs(); }
function syncKnobs() {
  $$("[data-knob]").forEach(el => {
    const k = el.dataset.knob;
    el.style.setProperty("--a", knobAngle(k) + "deg");
    el.setAttribute("aria-valuetext", KNOBS[k].fmt(KNOBS[k].get()));
  });
  $$("[data-kv]").forEach(el => { el.textContent = KNOBS[el.dataset.kv].fmt(KNOBS[el.dataset.kv].get()); });
  const h = $("#scHold");
  h.setAttribute("aria-pressed", String(scope.hold));
  h.classList.toggle("stopped", scope.hold);
}
// knobs: drag up/down, scroll, click the left/right half, or arrow keys
function wireKnob(el, step) {
  let drag = null;
  const doStep = dir => {
    step(dir);
    if (el.id === "dmDial") B.sound?.playDialClick();
    else B.sound?.playKnobTick();
  };
  el.addEventListener("pointerdown", e => { drag = { y: e.clientY, acc: 0, moved: false }; el.setPointerCapture(e.pointerId); e.preventDefault(); el.focus(); });
  el.addEventListener("pointermove", e => {
    if (!drag) return;
    const dy = drag.y - e.clientY; drag.y = e.clientY; drag.acc += dy;
    while (Math.abs(drag.acc) >= 14) { doStep(Math.sign(drag.acc)); drag.acc -= Math.sign(drag.acc) * 14; drag.moved = true; }
  });
  el.addEventListener("pointerup", e => {
    if (drag && !drag.moved) { const r = el.getBoundingClientRect(); doStep(e.clientX < r.left + r.width / 2 ? -1 : 1); }
    drag = null;
  });
  el.addEventListener("wheel", e => { e.preventDefault(); doStep(e.deltaY < 0 ? 1 : -1); }, { passive: false });
  el.addEventListener("keydown", e => {
    if (e.key === "ArrowUp" || e.key === "ArrowRight") { doStep(1); e.preventDefault(); }
    if (e.key === "ArrowDown" || e.key === "ArrowLeft") { doStep(-1); e.preventDefault(); }
  });
}
$$("[data-knob]").forEach(el => wireKnob(el, d => knobStep(el.dataset.knob, d)));
syncKnobs();

function autoSet() {
  const k = scope.ch1 || scope.ch2, s = k && sigOfKey(k);
  if (!s) return;
  let want = 5e-3;
  if (s.k === "pwm") want = 2.5 / s.f / 10;
  if (s.k === "pulse") want = s.width / s.period < 0.02 ? s.width * 3 / 10 : s.period * 1.5 / 10;
  if (s.k === "i2c") want = 20e-6;
  if (s.k === "uart") want = 100e-6;
  if (s.k === "burst") want = 1e-3;
  if (s.k === "float") want = 10e-3;
  scope.tb = TB.reduce((a, b) => Math.abs(Math.log(b / want)) < Math.abs(Math.log(a / want)) ? b : a);
  const vmax = Math.max(s.v || 0, 0.5);
  scope.vdiv = vmax > 5.5 ? 2 : vmax < 1.8 ? 0.5 : 1;
  syncKnobs();
}
function pickDefaults(list) {
  if (scope.ch1 && !B.pinMeta(scope.ch1)) scope.ch1 = "";
  if (scope.ch2 && !B.pinMeta(scope.ch2)) scope.ch2 = "";
  if (scope.gnd && !B.pinMeta(scope.gnd)) scope.gnd = null;
  if (!scope.ch1 && scope.ch1Auto) {
    const rank = o => { const t = o.n.metas.map(m => m.c.type + ":" + m.pin); return t.includes("servo:SIG") ? 0 : t.includes("driver:PWMA") ? 1 : t.includes("led:SIG") ? 2 : t.includes("sonar:TRIG") ? 3 : o.n.metas.some(m => m.kind === "divout") ? 4 : o.n.gpios.length && o.n.keys.length > 1 ? 5 : 9; };
    const pref = list.slice().sort((a, b) => rank(a) - rank(b))[0];
    scope.ch1 = pref ? pref.key : "";
    autoSet();
  }
}
function measHTML(s, label, cls) {
  if (!s) return "";
  let f = "—", duty = "—", width = "—";
  if (s.k === "pwm") { f = fmtF(s.f); duty = (s.duty * 100).toFixed(1) + " %"; width = fmtT(s.duty / s.f); }
  if (s.k === "pulse") { f = fmtF(1 / s.period); duty = (s.width / s.period * 100).toFixed(2) + " %"; width = fmtT(s.width); }
  if (s.k === "i2c") { f = "400 kHz clock"; }
  if (s.k === "uart") { f = "115 200 baud"; width = fmtT(UART_BIT) + "/bit"; }
  if (s.k === "float") f = "≈50 Hz hum";
  const vmax = s.k === "float" ? 1.4 : s.v;
  return `<span class="h"></span><span class="h ${cls}">${label}</span><span></span>
    <span class="h">Freq</span><span>${f}</span><span></span>
    <span class="h">Duty</span><span>${duty}</span><span></span>
    <span class="h">+Width</span><span>${width}</span><span></span>
    <span class="h">Vmax</span><span>${fmtV(vmax)}</span><span></span>
    <span class="h">Vavg</span><span>${s.k === "float" ? "unstable" : fmtV(avgOf(s))}</span><span></span>`;
}
const NOTES = {
  pwm: s => s.f >= 20000 ? "<b>20 kHz PWM.</b> The motor sees the average. Above ~18 kHz you can't hear the switching." : "<b>LEDC PWM.</b> The LED is fully on or off; the duty cycle sets how bright it looks.",
  pulse: s => s.period === 0.02 ? "<b>Servo frame, 50 Hz.</b> Only the pulse width matters: 0.5 ms = 0°, 2.5 ms = 180°. Change the angle and watch it." : s.width > 50e-6 ? "<b>ECHO.</b> The width is the round trip of the sound: distance = width ÷ 58 µs." : "<b>TRIG.</b> A 10 µs pulse starts one ultrasonic ping every 60 ms.",
  i2c: () => "<b>I²C bus.</b> Pull-ups hold it high; devices only pull it low. Open the <b>Logic analyzer</b> to decode the bytes.",
  uart: () => "<b>UART TX.</b> Idles high. Each character: a start bit (low), 8 data bits, a stop bit (high).",
  burst: () => "<b>Single-wire sensor.</b> Short bursts, long quiet gaps. That's why it can't be read at 200 Hz.",
  analog: () => "<b>Analog level.</b> The small ripple is noise. Averaging and the IIR filter from Hour 4 smooth it out.",
  dc: s => s.v > 4 ? "<b>5 V net.</b> Never connect this directly to a GPIO." : s.v > 3 ? "<b>Logic high / 3.3 V.</b>" : "<b>0 V.</b>",
  float: () => "<b>Floating input.</b> Nothing drives it, so it picks up 50 Hz mains hum. This is why inputs need a pull-up or pull-down.",
};
function drawGrid(ctx, w, h, dpr) {
  ctx.fillStyle = "#0b1410"; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(120,170,145,.16)"; ctx.lineWidth = 1;
  for (let i = 0; i <= 10; i++) { const x = Math.round(i * w / 10) + 0.5; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let j = 0; j <= 8; j++) { const y = Math.round(j * h / 8) + 0.5; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  ctx.strokeStyle = "rgba(120,170,145,.32)";
  ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
}
function drawTrace(ctx, s, t0, win, w, h, color, vdiv, dpr) {
  const vToY = v => h - (v / vdiv + 1 + scope.pos) * h / 8;
  ctx.strokeStyle = color; ctx.lineWidth = 1.6 * dpr; ctx.shadowColor = color; ctx.shadowBlur = 4 * dpr;
  ctx.beginPath();
  const cols = Math.min(w, 900), sub = 6;
  for (let i = 0; i < cols; i++) {
    let mn = Infinity, mx = -Infinity;
    for (let j = 0; j < sub; j++) {
      const tt = t0 + (i + j / sub) / cols * win;
      const v = evalSig(s, tt) + (scope.gnd ? 0 : 0.45 * Math.sin(2 * Math.PI * 50 * tt) + 0.12 * Math.sin(2 * Math.PI * 150 * tt));
      if (v < mn) mn = v; if (v > mx) mx = v;
    }
    const x = i / cols * w;
    if (i === 0) ctx.moveTo(x, vToY(mx)); else ctx.lineTo(x, vToY(mx));
    if (mn !== mx) ctx.lineTo(x, vToY(mn));
  }
  ctx.stroke(); ctx.shadowBlur = 0;
  ctx.fillStyle = color; ctx.font = `600 ${11 * dpr}px monospace`;
  ctx.fillText("▶", 2 * dpr, vToY(0) + 4 * dpr);
}
// one acquisition per frame, shared by the dock screen and the 3D scope
let frameNo = 0, scopeFrameN = -1, scopeSig = { s1: null, s2: null, list: [] };
function scopeFrame() {
  if (scopeFrameN === frameNo) return scopeSig;
  scopeFrameN = frameNo;
  const list = channelList();
  pickDefaults(list);
  const s1 = scope.ch1 ? sigOfKey(scope.ch1) : null, s2 = scope.ch2 ? sigOfKey(scope.ch2) : null;
  const win = scope.tb * 10;
  if (!scope.hold) {
    const trig = s1 && nextRise(s1, B.simT) != null ? s1 : s2 && nextRise(s2, B.simT) != null ? s2 : null;
    scope.t0 = trig ? nextRise(trig, B.simT) - win * scope.hpos : B.simT;
  }
  scopeSig = { s1, s2, list };
  return scopeSig;
}
function paintScope(ctx, w, h, dpr, labels) {
  const { s1, s2 } = scopeFrame(), win = scope.tb * 10;
  drawGrid(ctx, w, h, dpr);
  if (s2) drawTrace(ctx, s2, scope.t0, win, w, h, "#4fd3e8", scope.vdiv, dpr);
  if (s1) drawTrace(ctx, s1, scope.t0, win, w, h, "#f3d23c", scope.vdiv, dpr);
  ctx.strokeStyle = "rgba(255,138,60,.7)"; ctx.setLineDash([4 * dpr, 4 * dpr]);
  ctx.beginPath(); ctx.moveTo(w * scope.hpos, 0); ctx.lineTo(w * scope.hpos, h); ctx.stroke(); ctx.setLineDash([]);
  if (labels) {
    ctx.font = `600 ${13 * dpr}px monospace`; ctx.textBaseline = "top";
    const items = [[`CH1 ${scope.vdiv}V`, "#f3d23c", !!s1], [`CH2 ${scope.vdiv}V`, "#4fd3e8", !!s2], [`${fmtT(scope.tb)}/div`, "#dfe9e3", true], [scope.hold ? "HOLD" : running() ? "RUN" : "STOP", scope.hold ? "#ff8a3c" : running() ? "#58d68d" : "#ff6b5a", true]];
    let x = 6 * dpr;
    for (const [t, col, on] of items) { if (!on) continue; ctx.fillStyle = col; ctx.fillText(t, x, 5 * dpr); x += ctx.measureText(t).width + 14 * dpr; }
    const m = s1 && (s1.k === "pwm" ? fmtF(s1.f) : s1.k === "pulse" ? fmtF(1 / s1.period) + "  +W " + fmtT(s1.width) : "");
    if (m) { ctx.fillStyle = "#f3d23c"; ctx.textBaseline = "bottom"; ctx.fillText(m, 6 * dpr, h - 4 * dpr); }
  }
}
B.paintScope = paintScope;
function renderScope() {
  const { s1, s2, list } = scopeFrame();
  scope.ch1 = fillSelect($("#scCh1"), list, scope.ch1, true, true);
  scope.ch2 = fillSelect($("#scCh2"), list, scope.ch2, true, true);
  const cv = $("#scCanvas"), { w, h, dpr } = sizeCanvas(cv), ctx = cv.getContext("2d");
  paintScope(ctx, w, h, dpr, false);
  $("#scOverlay").innerHTML = `<span><b class="ch1">CH1</b> ${scope.vdiv} V/div</span>${s2 ? `<span><b class="ch2">CH2</b> ${scope.vdiv} V/div</span>` : ""}<span>${fmtT(scope.tb)}/div</span><span>Trig ↑ ${s1 ? "CH1" : "CH2"}</span>${scope.hold ? "<span><b>HOLD</b></span>" : ""}${running() ? "" : "<span><b>board off: press Run</b></span>"}`;
  $("#scEmpty").hidden = list.length > 0;
  $("#scEmpty").textContent = "Wire something first. Every connected net shows up in the probe lists.";
  const m = measHTML(s1, "CH1", "ch1") + measHTML(s2, "CH2", "ch2");
  if ($("#scMeas").dataset.m !== m) { $("#scMeas").innerHTML = m; $("#scMeas").dataset.m = m; }
  const note = s1 ? (NOTES[s1.k] ? NOTES[s1.k](s1) : "") + (s1.what ? `<br><span>${esc(s1.what)}</span>` : "") : "";
  if ($("#scNote").dataset.n !== note) { $("#scNote").innerHTML = note; $("#scNote").dataset.n = note; }
}

// ═════════════════════════ logic analyzer ═════════════════════════
const logic = { mode: "i2c", zoom: 1, pos: 0, d1: "", d2: "", d3: "", win: 1e-3 };
$("#dp-logic").innerHTML = `
  <div class="inst">
    <div class="screen"><canvas id="laCanvas"></canvas><div class="empty" id="laEmpty" hidden></div></div>
    <div class="inst-side">
      <label class="field"><span>Decode</span><select id="laMode"><option value="i2c">I²C bus (SDA / SCL)</option><option value="uart">UART0 TX (Serial)</option><option value="dig">Digital channels</option></select></label>
      <div id="laI2c">
        <label class="field"><span>Zoom</span><input type="range" id="laZoom" min="1" max="8" step="1" value="1"></label>
        <label class="field"><span>Scroll</span><input type="range" id="laPos" min="0" max="1" step="0.01" value="0"></label>
      </div>
      <div id="laDig" hidden>
        <label class="field"><span>D0</span><select id="laD1"></select></label>
        <label class="field"><span>D1</span><select id="laD2"></select></label>
        <label class="field"><span>D2</span><select id="laD3"></select></label>
        <label class="field"><span>Window</span><select id="laWin">${[100e-6, 1e-3, 5e-3, 20e-3, 50e-3, 200e-3].map(v => `<option value="${v}" ${v === 1e-3 ? "selected" : ""}>${fmtT(v)}</option>`).join("")}</select></label>
      </div>
      <div class="note" id="laNote"></div>
    </div>
  </div>`;
$("#laMode").addEventListener("change", e => { logic.mode = e.target.value; $("#laI2c").hidden = logic.mode === "dig"; $("#laDig").hidden = logic.mode !== "dig"; logic.pos = 0; $("#laPos").value = 0; });
$("#laZoom").addEventListener("input", e => { logic.zoom = +e.target.value; });
$("#laPos").addEventListener("input", e => { logic.pos = +e.target.value; });
["laD1", "laD2", "laD3"].forEach((id, i) => $("#" + id).addEventListener("change", e => { logic["d" + (i + 1)] = e.target.value; }));
$("#laWin").addEventListener("change", e => { logic.win = +e.target.value; });

const ANN_COL = { cond: "#52c38d", addr: "#f0a868", reg: "#4fd3e8", data: "#9fc4ff", ack: "#52c38d", nack: "#ff8f84" };
function drawRows(ctx, w, h, dpr, rows, t0, t1, anns) {
  ctx.fillStyle = "#0b1410"; ctx.fillRect(0, 0, w, h);
  const labW = 46 * dpr, rowH = Math.min(58 * dpr, (h - 70 * dpr) / rows.length), X = t => labW + (t - t0) / (t1 - t0) * (w - labW - 8 * dpr);
  ctx.font = `600 ${11 * dpr}px monospace`;
  rows.forEach((r, i) => {
    const yTop = 16 * dpr + i * (rowH + 8 * dpr), yHi = yTop + 6 * dpr, yLo = yTop + rowH - 6 * dpr;
    ctx.fillStyle = "#9fb8ad"; ctx.fillText(r.name, 6 * dpr, (yHi + yLo) / 2 + 4 * dpr);
    ctx.strokeStyle = "rgba(120,170,145,.12)"; ctx.beginPath(); ctx.moveTo(labW, yLo + 3 * dpr); ctx.lineTo(w, yLo + 3 * dpr); ctx.stroke();
    ctx.strokeStyle = r.color; ctx.lineWidth = 1.6 * dpr; ctx.beginPath();
    const cols = Math.round(w - labW), sub = 4;
    let prev = null;
    for (let x = 0; x <= cols; x++) {
      let hi = false, lo = false;
      for (let j = 0; j < sub; j++) { const t = t0 + (x + j / sub) / cols * (t1 - t0); if (r.level(t)) hi = true; else lo = true; }
      const px = labW + x * (w - labW - 8 * dpr) / cols;
      if (hi && lo) { ctx.moveTo(px, yHi); ctx.lineTo(px, yLo); prev = null; continue; }
      const y = hi ? yHi : yLo;
      if (prev == null) ctx.moveTo(px, y); else { if (prev !== y) ctx.lineTo(px, prev); ctx.lineTo(px, y); }
      prev = y;
    }
    ctx.stroke();
  });
  if (anns) {
    const y = 16 * dpr + rows.length * (rowH + 8 * dpr) + 4 * dpr, bh = 20 * dpr;
    anns.forEach(([a, b, label, type]) => {
      const x0 = X(a), x1 = X(b);
      if (x1 < labW || x0 > w) return;
      ctx.fillStyle = ANN_COL[type] || "#9fb8ad";
      ctx.globalAlpha = 0.22; ctx.fillRect(x0 + 1, y, Math.max(2, x1 - x0 - 2), bh); ctx.globalAlpha = 1;
      ctx.fillRect(x0 + 1, y, Math.max(2, x1 - x0 - 2), 2 * dpr);
      const tw = ctx.measureText(label).width;
      if (tw < x1 - x0 - 4) { ctx.fillStyle = "#e8f3ee"; ctx.fillText(label, (x0 + x1) / 2 - tw / 2, y + 14 * dpr); }
    });
  }
  ctx.fillStyle = "#6f8a7f"; ctx.font = `500 ${10 * dpr}px monospace`;
  ctx.fillText(fmtT(t1 - t0) + " shown", w - 90 * dpr, h - 6 * dpr);
}
function renderLogic() {
  const cv = $("#laCanvas"), { w, h, dpr } = sizeCanvas(cv), ctx = cv.getContext("2d");
  const empty = $("#laEmpty"), note = $("#laNote");
  empty.hidden = true;
  if (logic.mode === "i2c") {
    const dev = B.state.comps.find(c => B.T[c.type] && B.T[c.type].i2c && B.gpioOf(c, "SDA") != null && B.gpioOf(c, "SCL") != null);
    if (!dev) { ctx.fillStyle = "#0b1410"; ctx.fillRect(0, 0, w, h); empty.hidden = false; empty.textContent = "No I²C device is wired to the ESP32. Add an MPU6050 or BME280 and wire SDA and SCL."; note.innerHTML = ""; return; }
    if (!running()) { ctx.fillStyle = "#0b1410"; ctx.fillRect(0, 0, w, h); empty.hidden = false; empty.textContent = "Press Run. The bus is silent while the board is off."; return; }
    const sdaG = B.gpioOf(dev, "SDA"), d = i2cData(sdaG);
    const span = d.dur / logic.zoom, t0 = logic.pos * (d.dur - span);
    drawRows(ctx, w, h, dpr, [
      { name: "SCL", color: "#f3d23c", level: t => lookup(d.ev, t, 1) },
      { name: "SDA", color: "#4fd3e8", level: t => lookup(d.ev, t, 2) },
    ], t0, t0 + span, d.ann);
    const html = d.devs.map(x => `<p><b>${esc(x.c.name)} @ 0x${x.addr.toString(16)}</b> ${x.ok ? "" : `<span style="color:var(--err)">NACK: device didn't answer (check its wiring)</span>`}</p>` +
      (x.ok && x.p.write ? `<p class="mono" style="font-size:11.5px">S · 0x${x.addr.toString(16)} W · A · ${x.p.bytes.map(b => b.toString(16).padStart(2, "0").toUpperCase()).join(" A ")} A · P</p><p>${esc(x.p.meaning)}</p>` : "") +
    (x.ok && !x.p.write ? `<p class="mono" style="font-size:11.5px">S · 0x${x.addr.toString(16)} W · A · 0x${x.p.reg.toString(16).toUpperCase()} · A · Sr · 0x${x.addr.toString(16)} R · A · ${x.p.bytes.map(b => b.toString(16).padStart(2, "0").toUpperCase()).join(" ")} · N · P</p><p>${esc(x.p.meaning)}</p>` : "")).join("");
    const text = html + `<p><b>Read it:</b> S = start, A = ACK (receiver pulls SDA low), N = NACK, Sr = repeated start, P = stop. Data changes while SCL is low and is read on the rising edge. 400 kHz = 2.5 µs per bit.</p>`;
    if (note.dataset.h !== text) { note.innerHTML = text; note.dataset.h = text; }
  } else if (logic.mode === "uart") {
    if (!running()) { ctx.fillStyle = "#0b1410"; ctx.fillRect(0, 0, w, h); empty.hidden = false; empty.textContent = "Press Run. TX0 idles high until the sketch prints."; return; }
    const txt = uartText() + "\n", n = Math.min(txt.length, Math.max(4, Math.round(28 / logic.zoom * 2)));
    const span = n * 10 * UART_BIT, total = txt.length * 10 * UART_BIT, t0 = logic.pos * Math.max(0, total - span);
    const anns = [];
    for (let i = 0; i < txt.length; i++) {
      const a = i * 10 * UART_BIT, ch = txt[i];
      anns.push([a, a + UART_BIT, "st", "cond"]);
      anns.push([a + UART_BIT, a + 9 * UART_BIT, ch === "\n" ? "\\n" : `'${ch}' 0x${ch.charCodeAt(0).toString(16)}`, "data"]);
      anns.push([a + 9 * UART_BIT, a + 10 * UART_BIT, "sp", "ack"]);
    }
    const level = t => { const f = Math.floor(t / (10 * UART_BIT)); if (f < 0 || f >= txt.length) return 1; const b = Math.floor((t - f * 10 * UART_BIT) / UART_BIT); return b === 0 ? 0 : b === 9 ? 1 : (txt.charCodeAt(f) >> (b - 1)) & 1; };
    drawRows(ctx, w, h, dpr, [{ name: "TX0", color: "#f3d23c", level }], t0, t0 + span, anns);
    const text = `<p><b>Line on the wire:</b> <span class="mono">${esc(txt.trim().slice(0, 60))}</span></p><p>115 200 baud = ${(UART_BIT * 1e6).toFixed(2)} µs per bit. Each byte costs 10 bits, so this ${txt.length}-byte line takes ${fmtT(total)}. Bits go out least-significant first.</p>`;
    if (note.dataset.h !== text) { note.innerHTML = text; note.dataset.h = text; }
  } else {
    const list = channelList().filter(o => o.n.gpios.length);
    ["d1", "d2", "d3"].forEach((k, i) => { logic[k] = fillSelect($("#laD" + (i + 1)), list, logic[k] || (list[i] ? list[i].key : ""), true); });
    const rows = [];
    const cols = ["#f3d23c", "#4fd3e8", "#ff9fd1"];
    ["d1", "d2", "d3"].forEach((k, i) => {
      if (!logic[k]) return;
      const s = sigOfKey(logic[k]);
      rows.push({ name: "D" + i, color: cols[i], level: t => evalSig(s, t) > 1.65, s });
    });
    if (!rows.length) { ctx.fillStyle = "#0b1410"; ctx.fillRect(0, 0, w, h); empty.hidden = false; empty.textContent = "Pick a GPIO for D0–D2."; return; }
    const t0 = B.simT;
    drawRows(ctx, w, h, dpr, rows, t0, t0 + logic.win, null);
    const text = rows.map(r => `<p><b>${r.name}</b>: ${r.s.k === "pwm" ? `${fmtF(r.s.f)}, duty ${(r.s.duty * 100).toFixed(1)} %` : r.s.k === "pulse" ? `${fmtF(1 / r.s.period)}, high ${fmtT(r.s.width)}` : r.s.k === "dc" ? (r.s.v > 1.65 ? "steady HIGH" : "steady LOW") : r.s.k}</p>`).join("") + `<p>A logic analyzer only sees HIGH or LOW (threshold 1.65 V). Use the oscilloscope when the voltage itself matters.</p>`;
    if (note.dataset.h !== text) { note.innerHTML = text; note.dataset.h = text; }
  }
}

// ═════════════════════════ power budget ═════════════════════════
const power = { last: null, prevAngle: new Map(), battery: 2000, mode: "always", wake: 60, awake: 5, gpioSensors: false, lastRender: 0 };
const PALETTE = ["#e48b48", "#44aa8e", "#72aeea", "#e6b546", "#b78ce8", "#f2766b", "#8fd16f", "#e874b3", "#5fc9d1", "#c7a27a"];
function railOf(c, pin = "VCC") {
  const n = B.nets.of(c.id + ":" + pin);
  if (!n || n.keys.length < 2) return null;
  return n.has3v3 ? "r33" : n.hasVin ? "usb" : n.hasBatP ? "bat" : n.gpios.length ? "gpio" : null;
}
const IDLE_MA = { mpu: 3.9, bme: 0.7, dht: 1.5, ds18: 1.5, pot: 0.33, ldr: 0.33, sonar: 15, turb: 30, driver: 1.5, shifter: 0.1 };
function budget() {
  const S = B.state, run = S.running;
  const rails = {
    usb: { name: "USB 5 V", sub: "laptop port · VIN", limit: 500, items: [] },
    r33: { name: "3V3 regulator", sub: "AMS1117 on the DevKit", limit: 600, items: [] },
    bat: { name: "Battery pack", sub: "4×AA · motor side", limit: 1500, items: [] },
  };
  const warns = [];
  const gpioLoad = new Map();
  if (!run || !B.nets) return { rails, warns, run, usbV: 5, batV: 6.2, total: 0 };
  const add = (rail, label, mA) => { if (rails[rail] && mA > 0.01) rails[rail].items.push({ label, mA }); };
  add("r33", "esp1 CPU" + (S.wifi ? " + Wi-Fi" : ""), S.wifi ? 118 : 42);
  for (const c of S.comps) {
    if (c.type === "esp32") continue;
    const vr = railOf(c);
    if (IDLE_MA[c.type] && vr) add(vr === "gpio" ? "r33" : vr, c.name, IDLE_MA[c.type] * (c.type === "turb" && vr === "r33" ? 0.6 : 1));
    if (c.type === "led") {
      const o = B.outputs.get(c.id), g = B.gpioOf(c, "SIG");
      const mA = o && g != null && !B.hasErr(c) ? (o.level || 0) * 6 : 0;
      add("r33", `${c.name} (GPIO ${g})`, mA);
      if (g != null) gpioLoad.set(g, (gpioLoad.get(g) || 0) + mA);
    }
    if (c.type === "buzzer") {
      const o = B.outputs.get(c.id), g = B.gpioOf(c, "SIG");
      const mA = o && o.on ? 28 : 0;
      add("r33", `${c.name} (GPIO ${g})`, mA);
      if (g != null) gpioLoad.set(g, (gpioLoad.get(g) || 0) + mA);
    }
    if (c.type === "servo" && vr) {
      const a = (B.outputs.get(c.id) || {}).angle, prev = power.prevAngle.get(c.id);
      power.prevAngle.set(c.id, a);
      const moving = a != null && prev != null && Math.abs(a - prev) > 0.05;
      add(vr === "gpio" ? "r33" : vr, c.name + (moving ? " (moving)" : " (holding)"), moving ? 240 : 9);
    }
    if (B.ext.power[c.type]) B.ext.power[c.type](c, add, railOf, gpioLoad);
    if (c.type === "motor") {
      const o = B.outputs.get(c.id) || { speed: 0 };
      const d = B.driverOfMotor(c);
      if (d) {
        const vm = railOf(d, "VM");
        const mA = o.speed > 0 ? 70 + o.speed * 330 + (c.props.blob ? 60 : 0) : 0;
        if (vm) add(vm, c.name + " via " + d.name, mA);
      } else if (B.nets.of(c.id + ":M+").gpios.length && B.srcLevel(c) > 0.05) {
        const g = B.nets.of(c.id + ":M+").gpios[0];
        add("r33", `${c.name} straight from GPIO ${g}!`, 300);
        gpioLoad.set(g, (gpioLoad.get(g) || 0) + 300);
      }
    }
  }
  const sum = r => r.items.reduce((a, b) => a + b.mA, 0);
  const r33 = sum(rails.r33);
  rails.usb.items.unshift({ label: "3V3 regulator input", mA: r33 });
  const usb = sum(rails.usb), bat = sum(rails.bat);
  for (const [g, mA] of gpioLoad) if (mA > 20) warns.push(`GPIO ${g} sources ${mA.toFixed(0)} mA. An ESP32 pin is good for about 20 mA (40 mA absolute max). Switch the load with a transistor or a driver.`);
  if (usb > rails.usb.limit) warns.push(`USB draw ${usb.toFixed(0)} mA is over the 500 mA a laptop port supplies. The voltage sags and the ESP32 browns out.`);
  if (r33 > rails.r33.limit) warns.push(`The 3.3 V regulator is asked for ${r33.toFixed(0)} mA. It overheats and drops out above ~600 mA.`);
  const usbV = usb > 500 ? 4.3 : 5.05 - usb * 0.0006;
  const batV = 6.2 - bat * 0.0009;
  return { rails, warns, run, usb, r33, bat, usbV, batV, total: usb, usbOver: usb > 500 || r33 > 600 };
}
B.IDLE_MA = IDLE_MA;
B.usbOverload = () => !!(power.last && power.last.usbOver);

$("#dp-power").innerHTML = `
  <div class="inst" style="grid-template-columns:minmax(0,1.5fr) minmax(250px,1fr)">
    <div class="inst-side" style="overflow:visible">
      <div class="eyebrow">Current budget · live</div>
      <div class="rails" id="pwRails"></div>
      <div id="pwWarn"></div>
    </div>
    <div class="inst-side">
      <div class="eyebrow">Battery life</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <label class="field"><span>Battery</span><select id="pwBat"><option value="2000">4×AA NiMH · 2000 mAh</option><option value="3000">18650 Li-ion · 3000 mAh</option><option value="1000">LiPo · 1000 mAh</option><option value="10000">Power bank · 10 000 mAh</option></select></label>
        <label class="field"><span>Mode</span><select id="pwMode"><option value="always">Always on</option><option value="sleep">Deep-sleep cycle</option></select></label>
        <label class="field" id="pwWakeF"><span>Wake every</span><select id="pwWake"><option value="10">10 s</option><option value="60" selected>1 min</option><option value="300">5 min</option><option value="900">15 min</option><option value="3600">1 hour</option></select></label>
        <label class="field" id="pwAwakeF"><span>Awake for</span><select id="pwAwake"><option value="0.5">0.5 s (no Wi-Fi)</option><option value="2">2 s</option><option value="5" selected>5 s (Wi-Fi + MQTT)</option><option value="10">10 s</option></select></label>
      </div>
      <label class="check" id="pwGpioF"><input type="checkbox" id="pwGpio"><span>Power the sensors from a GPIO so they switch off while asleep</span></label>
      <div class="life" id="pwLife"></div>
      <svg id="pwChart" viewBox="0 0 300 70" style="width:100%;height:70px"></svg>
    </div>
  </div>`;
$("#pwBat").addEventListener("change", e => { power.battery = +e.target.value; renderPower(true); });
$("#pwMode").addEventListener("change", e => { power.mode = e.target.value; renderPower(true); });
$("#pwWake").addEventListener("change", e => { power.wake = +e.target.value; renderPower(true); });
$("#pwAwake").addEventListener("change", e => { power.awake = +e.target.value; renderPower(true); });
$("#pwGpio").addEventListener("change", e => { power.gpioSensors = e.target.checked; renderPower(true); });

function renderPower(force) {
  const now = performance.now();
  if (!force && now - power.lastRender < 250) return;
  power.lastRender = now;
  const b = power.last || budget();
  const rows = ["usb", "r33", "bat"].map(k => {
    const r = b.rails[k], total = r.items.reduce((a, x) => a + x.mA, 0), scale = Math.max(r.limit * 1.2, total);
    const segs = r.items.map((it, i) => `<span class="seg" title="${esc(it.label)}: ${it.mA.toFixed(1)} mA" style="width:${it.mA / scale * 100}%;background:${PALETTE[i % PALETTE.length]}"></span>`).join("");
    const chips = r.items.filter(it => it.mA > 0.05).map((it, i) => `<span><i style="background:${PALETTE[r.items.indexOf(it) % PALETTE.length]}"></i>${esc(it.label)} ${it.mA < 10 ? it.mA.toFixed(1) : it.mA.toFixed(0)} mA</span>`).join("");
    return `<div class="rail-row"><div class="rail-name"><b>${r.name}</b><span>${r.sub}</span></div>
      <div class="bar">${segs}<span class="limit" style="left:${r.limit / scale * 100}%" title="limit ${r.limit} mA"></span></div>
      <div class="rail-total ${total > r.limit ? "over" : ""}">${total.toFixed(0)} / ${r.limit} mA</div>
      <div class="consumers">${chips || (b.run ? "nothing on this rail" : "board off: press Run")}</div></div>`;
  }).join("");
  if ($("#pwRails").dataset.h !== rows) { $("#pwRails").innerHTML = rows; $("#pwRails").dataset.h = rows; }
  const warn = b.warns.length ? b.warns.map(w => `<div class="warnbox" style="margin-top:6px">${esc(w)}</div>`).join("") : b.run ? `<div class="okbox">Every rail and pin is inside its limit.</div>` : "";
  if ($("#pwWarn").dataset.h !== warn) { $("#pwWarn").innerHTML = warn; $("#pwWarn").dataset.h = warn; }
  // battery life
  $("#pwWakeF").hidden = $("#pwAwakeF").hidden = $("#pwGpioF").hidden = power.mode !== "sleep";
  const active = b.run ? b.usb : 160;
  const sensorIdle = B.state.comps.reduce((a, c) => a + (IDLE_MA[c.type] && c.type !== "driver" ? IDLE_MA[c.type] : 0), 0);
  const sleep = 0.01 + (power.gpioSensors ? 0 : sensorIdle);
  const avg = power.mode === "always" ? active : (active * power.awake + sleep * (power.wake - power.awake)) / power.wake;
  const hours = power.battery * 0.85 / avg;
  const life = hours > 48 ? (hours / 24).toFixed(hours > 240 ? 0 : 1) + " days" : hours.toFixed(1) + " h";
  const lifeHTML = `<div><div class="big">${avg < 1 ? (avg * 1000).toFixed(0) + " µA" : avg.toFixed(avg < 10 ? 2 : 0) + " mA"}</div><small class="muted">average draw${b.run ? "" : " (estimate: press Run for live)"}</small></div>
    <div><div class="big">${life}</div><small class="muted">on ${power.battery} mAh (85 % usable)</small></div>` +
    (power.mode === "sleep" ? `<p class="note" style="grid-column:1/-1">Asleep the board draws <b>${sleep < 1 ? (sleep * 1000).toFixed(0) + " µA" : sleep.toFixed(1) + " mA"}</b>${power.gpioSensors ? "" : ", mostly the sensors that stay powered"}. Awake it draws <b>${active.toFixed(0)} mA</b>, and Wi-Fi is most of that. Waking less often, or for less time, is what saves the battery.</p>` :
      `<p class="note" style="grid-column:1/-1">Always on, Wi-Fi dominates. Try <b>Deep-sleep cycle</b> to see why field nodes sleep between readings.</p>`);
  if ($("#pwLife").dataset.h !== lifeHTML) { $("#pwLife").innerHTML = lifeHTML; $("#pwLife").dataset.h = lifeHTML; }
  // current-vs-time chart: two cycles
  const svg = $("#pwChart");
  let path;
  if (power.mode === "always") path = `M0 ${70 - 55} H300`;
  else {
    const cyc = 150, on = Math.max(3, power.awake / power.wake * cyc), yA = 15, yS = 66;
    path = `M0 ${yA} H${on} V${yS} H${cyc} V${yA} H${cyc + on} V${yS} H300`;
  }
  const chart = `<path d="${path}" fill="none" stroke="var(--accent)" stroke-width="2"/><text x="2" y="10" font-size="9" fill="var(--muted)" font-family="monospace">${active.toFixed(0)} mA awake</text>${power.mode === "sleep" ? `<text x="298" y="62" text-anchor="end" font-size="9" fill="var(--muted)" font-family="monospace">${(sleep * 1000).toFixed(0)} µA asleep</text>` : ""}`;
  if (svg.dataset.h !== chart) { svg.innerHTML = chart; svg.dataset.h = chart; }
}

// ═════════════════════════ multimeter ═════════════════════════
const dmm = { mode: "dcv", red: null, black: "esp:GND", hold: false };
// dial positions, clockwise from OFF; angles match the legend printed on the 3D meter
const DIAL = [["off", "OFF", -150], ["dcv", "V⎓", -95], ["acv", "V~", -60], ["hz", "Hz%", -20], ["ohm", "Ω·)))", 25], ["ma", "mA", 65], ["a", "A", 100]];
B.DIAL = DIAL;
function meterReading(key) {
  const s = sigOfKey(key), n = B.nets.of(key);
  if (!n || n.keys.length < 2) { if (!key.startsWith("esp:")) return "open: not connected"; }
  if (s.k === "float") return "unstable ~0.9 V (floating)";
  const v = avgOf(s);
  return v == null ? "—" : `${v.toFixed(2)} V DC${s.k === "pwm" || s.k === "pulse" ? " (average)" : ""}`;
}
B.meterReading = meterReading;
B.meterText = c => {
  if (!B.state.running) return "Press Run to measure.";
  const pins = B.T[c.type].pins.map(p => p[0]).filter(p => !/^[+-]\d$/.test(p) || p === "+1" || p === "-1");
  return pins.map(p => `${p} ${meterReading(c.id + ":" + p).replace(" DC", "")}`).join(" · ");
};
const PROBES = {
  "dmm+": { label: "red probe (V Ω)", color: "#d8342c" },
  "dmm-": { label: "black probe (COM)", color: "#2a2a2a" },
  ch1: { label: "CH1 probe", color: "#e9c21c" },
  ch2: { label: "CH2 probe", color: "#35c2d8" },
  gnd: { label: "scope ground clip", color: "#2a2a2a" },
};
function place(what) {
  if (what === "dmm+" || what === "dmm-") B.showDock("meter");
  B.startPlacing(Object.assign({ what }, PROBES[what]));
}
document.addEventListener("click", ev => { const b = ev.target.closest("[data-place]"); if (b) place(b.dataset.place); });
$("#probeBtn").title = "Place the multimeter probes on the bench";
$("#probeBtn").addEventListener("click", () => place("dmm+"));
B.on("placing", p => { $("#probeBtn").setAttribute("aria-pressed", String(!!p && p.what.startsWith("dmm"))); $$("[data-place]").forEach(b => b.setAttribute("aria-pressed", String(!!p && p.what === b.dataset.place))); });
B.on("place", (what, key) => {
  B.sound?.playProbeContact();
  if (what === "dmm+") dmm.red = key;
  if (what === "dmm-") dmm.black = key;
  if (what === "ch1") { scope.ch1 = key; autoSet(); B.showDock("scope"); }
  if (what === "ch2") { scope.ch2 = key; B.showDock("scope"); }
  if (what === "gnd") { scope.gnd = key; B.showDock("scope"); }
  B.flashHint(`${PROBES[what].label[0].toUpperCase() + PROBES[what].label.slice(1)} on ${B.pinTitle(key)}`);
  if (what === "dmm+" && dmm.black === "esp:GND" && !B.state.placing) setTimeout(() => B.flashHint("Black probe stays on GND. Click Place black to move it."), 1900);
  renderDmm(true);
});
B.on("preset", () => { dmm.red = null; dmm.black = "esp:GND"; scope.ch1 = ""; scope.ch2 = ""; scope.ch1Auto = true; scope.gnd = "esp:GND2"; renderDmm(true); });
// remove one probe (from the bench: click it, then Del or "Remove probe")
function removeProbe(what) {
  if (what === "dmm+") dmm.red = null;
  if (what === "dmm-") dmm.black = null;
  if (what === "ch1") { scope.ch1 = ""; scope.ch1Auto = false; }
  if (what === "ch2") scope.ch2 = "";
  if (what === "gnd") scope.gnd = null;
  renderDmm(true);
  B.flashHint(`${PROBES[what].label[0].toUpperCase() + PROBES[what].label.slice(1)} removed.` + (what === "gnd" && (scope.ch1 || scope.ch2) ? " Without ground the traces pick up 50 Hz hum." : ""));
}
B.on("removeProbe", removeProbe);
const PROBE_INFO = {
  "dmm+": "Multimeter red lead (VΩHz jack). It reads this pin against the black lead.",
  "dmm-": "Multimeter black lead (COM jack). Usually on GND: every reading is relative to it.",
  ch1: "Oscilloscope channel 1 (yellow trace). The trigger follows this channel.",
  ch2: "Oscilloscope channel 2 (cyan trace).",
  gnd: "Scope ground clip. Both channels measure against it. Without it the traces pick up mains hum.",
};
B.probeInspector = what => {
  const p = B.probes().find(x => x.what === what);
  if (!p) return "";
  const reading = B.state.running ? meterReading(p.key) : "Press Run to see the voltage.";
  return `
    <div class="eyebrow">${what.startsWith("dmm") ? "Multimeter" : "Oscilloscope"} probe</div>
    <h3>${esc(PROBES[what].label[0].toUpperCase() + PROBES[what].label.slice(1))}</h3>
    <p class="muted">${esc(PROBE_INFO[what])}</p>
    <h4>Clipped on</h4>
    <table class="pins"><tbody><tr><td><span class="dot" style="background:${p.color};display:inline-block;width:10px;height:10px;border-radius:50%"></span></td><td><div>${esc(B.pinTitle(p.key))}</div><div class="to">${esc(reading)}</div></td></tr></tbody></table>
    <div class="actions"><button class="btn small" data-place="${what}">Move probe</button><button class="btn small danger" data-act="delete">Remove probe</button></div>`;
};

$("#dp-meter").innerHTML = `
  <div class="inst dmm-inst">
    <div class="dmm">
      <div class="dmm-head"><span>DMM-17 · AUTO RANGE</span><button class="fbtn hold" id="dmHold" aria-pressed="false" title="Freeze the reading">HOLD</button></div>
      <div class="dmm-lcd"><span class="dmm-sub" id="dmSub"></span><span id="dmVal">– – –</span><small id="dmUnit"></small></div>
      <div class="dial-wrap">
        <div class="dial" id="dmDial" role="slider" tabindex="0" aria-label="Function dial" title="Drag, scroll or click to turn"><i class="dial-grip"></i><i class="dial-ptr"></i></div>
        ${DIAL.map(([k, l, a]) => `<button class="dpos" data-dmode="${k}" style="--a:${a}deg" aria-pressed="false">${l}</button>`).join("")}
      </div>
      <div class="dmm-jacks">
        <button class="jack" data-place="dmm-" title="Black lead: click, then click a pin"><i class="jk blk"></i>COM</button>
        <button class="jack" id="dm10a" title="10 A jack: for current in series"><i class="jk blk"></i>10A</button>
        <button class="jack" data-place="dmm+" title="Red lead: click, then click a pin"><i class="jk red"></i>VΩHz</button>
      </div>
    </div>
    <div class="inst-side">
      <div class="probe-row"><i class="pdot" style="background:#d8342c"></i><span><b>Red</b> · VΩHz jack<br><span class="pwhere" id="dmRed">not placed</span></span><button class="btn small" data-place="dmm+">Place red</button></div>
      <div class="probe-row"><i class="pdot" style="background:#2a2a2a"></i><span><b>Black</b> · COM jack<br><span class="pwhere" id="dmBlack"></span></span><button class="btn small" data-place="dmm-">Place black</button></div>
      <div class="btnrow"><button class="btn small" id="dmSwap">Swap leads</button><button class="btn small" id="dmClear">Remove probes</button></div>
      <p class="note" id="dmNote"></p>
    </div>
  </div>`;
function setMode(m) {
  if (dmm.mode !== m) B.sound?.playDialClick();
  dmm.mode = m;
  dmm.hold = false;
  syncDial();
  renderDmm(true);
}
function dialStep(dir) { const i = DIAL.findIndex(d => d[0] === dmm.mode); setMode(DIAL[clamp(i + dir, 0, DIAL.length - 1)][0]); }
function syncDial() {
  const d = DIAL.find(x => x[0] === dmm.mode);
  $("#dmDial").style.setProperty("--a", d[2] + "deg");
  $("#dmDial").setAttribute("aria-valuetext", d[1]);
  $$("[data-dmode]").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.dmode === dmm.mode)));
  $("#dmHold").setAttribute("aria-pressed", String(dmm.hold));
}
function toggleDmmHold() { dmm.hold = !dmm.hold; held = null; syncDial(); renderDmm(true); }
$$("[data-dmode]").forEach(b => b.addEventListener("click", () => setMode(b.dataset.dmode)));
wireKnob($("#dmDial"), dialStep);
$("#dmHold").addEventListener("click", toggleDmmHold);
$("#dm10a").addEventListener("click", () => { if (dmm.mode !== "a") setMode("a"); B.flashHint("10 A jack: current is measured in series. Break the circuit and route it through the meter."); });
$("#dmSwap").addEventListener("click", () => { if (!dmm.red) return; [dmm.red, dmm.black] = [dmm.black, dmm.red]; renderDmm(true); });
$("#dmClear").addEventListener("click", () => { dmm.red = null; dmm.black = "esp:GND"; renderDmm(true); });
syncDial();

const sameNet = (a, b) => B.nets && B.nets.find(a) === B.nets.find(b);
function resistanceBetween(a, b) {
  if (sameNet(a, b)) return 0.2;
  for (const c of B.state.comps) {
    if (c.type !== "resistor") continue;
    const A = c.id + ":A", Bk = c.id + ":B";
    if ((sameNet(A, a) && sameNet(Bk, b)) || (sameNet(A, b) && sameNet(Bk, a))) return +c.props.ohms;
  }
  return null;
}
let beepOsc = null, beepGain = null;
function beep(on) {
  try {
    const ctx = (B.sound && B.sound.ctx) || (beep.ctx = new (window.AudioContext || window.webkitAudioContext)());
    if (!ctx) return;
    if (on && !beepOsc) {
      beepOsc = ctx.createOscillator();
      beepGain = ctx.createGain();
      beepOsc.type = "sine";
      beepOsc.frequency.setValueAtTime(2700, ctx.currentTime);
      beepGain.gain.setValueAtTime(0.04, ctx.currentTime);
      beepOsc.connect(beepGain).connect(ctx.destination);
      beepOsc.start();
    } else if (!on && beepOsc) {
      beepGain.gain.setValueAtTime(beepGain.gain.value, ctx.currentTime);
      beepGain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.01);
      const o = beepOsc, g = beepGain;
      setTimeout(() => {
        try { o.stop(); o.disconnect(); g.disconnect(); } catch (e) {}
      }, 15);
      beepOsc = null;
      beepGain = null;
    }
  } catch (e) { beepOsc = null; beepGain = null; }
}
// what the meter shows right now: { val, unit, sub, note, warn, beep }
let held = null;
function dmmState() {
  if (dmm.mode === "off") return { val: "", unit: "", off: true, note: "The meter is off. Turn the dial to <b>V⎓</b> to measure a voltage." };
  if (dmm.hold) { held = held || Object.assign(dmmLive(), {}); return Object.assign({}, held, { sub: "HOLD" + (held.sub ? " · " + held.sub : "") }); }
  return dmmLive();
}
const acRms = s => {
  const V = s.v || 0;
  if (s.k === "pwm") return V * Math.sqrt(s.duty * (1 - s.duty));
  if (s.k === "pulse") { const d = s.width / s.period; return V * Math.sqrt(d * (1 - d)); }
  if (s.k === "uart" || s.k === "i2c") return V * 0.3;
  if (s.k === "burst") return V * 0.12;
  if (s.k === "float") return 0.35;
  return 0.002;
};
function dmmLive() {
  const r = dmm.red, k = dmm.black;
  if (r && !k) return { val: "– – –", unit: "", note: "The black lead (COM) isn't on anything, so there's no reference. Click <b>Place black</b> and put it on GND." };
  if (dmm.mode === "ma" || dmm.mode === "a") {
    const unit = dmm.mode === "ma" ? "mA" : "A";
    if (!r) return { val: dmm.mode === "ma" ? "0.00" : "0.000", unit, note: "Current flows <b>through</b> the meter: it has to be in series, like a link in the wire. Unplug a jumper and put the probes where it was. On this bench, the <b>Power</b> tab shows every current." };
    const vr = running() ? avgOf(sigOfKey(r)) || 0 : 0, vb = running() ? avgOf(sigOfKey(k)) || 0 : 0;
    if (Math.abs(vr - vb) > 0.3) return { val: "FUSE", unit: "", warn: "In current mode the meter is almost a short circuit. Across a voltage, it blows its fuse (or burns the part).", note: `You put an ammeter <b>across</b> ${esc(B.pinTitle(r))} and ${esc(B.pinTitle(k))}. Current is measured in series; voltage in parallel.` };
    return { val: dmm.mode === "ma" ? "0.00" : "0.000", unit, note: "No current path through the meter here. Current is measured in series: break the circuit and route it through the probes. Or read it in the <b>Power</b> tab." };
  }
  if (!r) return { val: dmm.mode === "ohm" ? "O.L" : "– – –", unit: { dcv: "V", hz: "Hz", ohm: "Ω" }[dmm.mode], note: "Click <b>Place red</b>, then click a pin on the bench. The probe needle lands on that pin." };
  const sr = sigOfKey(r), sb = sigOfKey(k);
  if (dmm.mode === "ohm") {
    const R = resistanceBetween(r, k);
    const live = running() && B.nets.of(r) && (B.nets.of(r).has3v3 || B.nets.of(r).hasVin || B.nets.of(r).gpios.length);
    const note = (live ? "<b>Circuit is powered.</b> Real meters give nonsense (or blow a fuse) measuring Ω on a live circuit: press Stop first. " : "") +
      (R === 0.2 ? "<b>Continuity.</b> Both probes are on the same net: the jumpers conduct." : R != null ? "Measuring the resistor between the two probes." : "<b>O.L</b> = open loop: no path between the probes.");
    return { val: R == null ? "O.L" : R >= 1000 ? (R / 1000).toFixed(2) : R.toFixed(1), unit: R != null && R >= 1000 ? "kΩ" : "Ω", sub: "·)))", note, beep: R != null && R < 50 };
  }
  if (!running()) return { val: "0.00", unit: dmm.mode === "hz" ? "Hz" : "V", sub: dmm.mode === "acv" ? "AC" : "", note: "Board is off: press <b>Run</b>. Every net reads 0 V." };
  if (dmm.mode === "acv") {
    const sr = sigOfKey(r), v = acRms(sr);
    return { val: v.toFixed(v < 1 ? 3 : 2), unit: "V", sub: "AC RMS", note: `AC volts ignore the DC level and measure only the part that swings. ${sr.k === "pwm" || sr.k === "pulse" ? ((d => d > 0.01 && d < 0.99 ? `This signal switches at ${(d * 100).toFixed(d < 0.1 ? 1 : 0)} % duty, so it swings: V × √(d(1−d)).` : `At ${Math.round(d * 100)} % duty it's really flat DC, so almost no AC.`)(sr.k === "pwm" ? sr.duty : sr.width / sr.period)) : sr.k === "float" ? "A floating pin picks up mains hum: that's what you see." : "A steady DC net reads almost 0 V AC."}` };
  }
  if (dmm.mode === "hz") {
    const f = sr.k === "pwm" ? sr.f : sr.k === "pulse" ? 1 / sr.period : sr.k === "i2c" ? 400e3 : sr.k === "float" ? 50 : 0;
    const duty = sr.k === "pwm" ? sr.duty * 100 : sr.k === "pulse" ? sr.width / sr.period * 100 : null;
    const [val, unit] = f >= 1e3 ? [(f / 1e3).toFixed(2), "kHz"] : [f.toFixed(f < 100 ? 2 : 1), "Hz"];
    return { val, unit, sub: duty != null ? `${duty.toFixed(duty < 1 ? 3 : 1)} %` : "", note: f ? `Frequency of ${esc(B.pinTitle(r))}${duty != null ? ", plus the duty cycle" : ""}.` + (sr.k === "float" ? " That's mains hum on a floating pin." : "") : "Steady DC: no frequency to count." };
  }
  const vr = sr.k === "float" ? 0.9 + noise(performance.now() * 0.0003) * 0.7 : avgOf(sr), vb = sb.k === "float" ? 0.9 : avgOf(sb);
  if (vr == null || vb == null) return { val: "– – –", unit: "V" };
  const v = vr - vb, n = B.nets.of(r);
  const onGpio = n && (n.gpios.length || n.metas.some(m => m.kind === "divout" || m.kind === "lvx"));
  const warn = onGpio && vr > 3.6 ? "Over 3.6 V on a GPIO net! This damages the ESP32." : sr.k === "float" ? "Reading wanders: the pin is floating." : "";
  const note = `<b>${esc(B.pinTitle(r))}</b> relative to <b>${esc(B.pinTitle(k))}</b>. ${sr.what ? esc(sr.what.replace(/\.?$/, ".")) : ""}` +
    (sr.k === "pwm" || sr.k === "pulse" ? " A meter can't follow PWM: it shows the <b>average</b>. Use the oscilloscope to see the pulses." : "") +
    (v < -0.05 ? " Negative: the leads are swapped." : "");
  return { val: (v < 0 ? "-" : "") + Math.abs(v).toFixed(2), unit: "V", sub: sr.k === "pwm" || sr.k === "pulse" ? "AVG" : "", note, warn };
}
B.dmmState = dmmState;
let dmmLast = "";
function renderDmm(force) {
  const st = dmmState();
  $("#dp-meter .dmm-lcd").classList.toggle("off", !!st.off);
  beep(!!st.beep && !dmm.hold);
  if (!force && !B.dockVisible("meter")) return;
  const key = JSON.stringify(st) + dmm.red + dmm.black + dmm.mode + dmm.hold;
  if (!force && key === dmmLast) return;
  dmmLast = key;
  $("#dmVal").textContent = st.val; $("#dmUnit").textContent = st.unit || ""; $("#dmSub").textContent = st.sub || "";
  $("#dmRed").innerHTML = dmm.red ? esc(B.pinTitle(dmm.red)) : `<span class="none">not placed</span>`;
  $("#dmBlack").innerHTML = dmm.black ? esc(B.pinTitle(dmm.black)) : `<span class="none">not placed</span>`;
  $("#dmNote").innerHTML = (st.warn ? `<span class="warnline">${esc(st.warn)}</span><br>` : "") + (st.note || "");
}
// probes the 3D bench draws: needle + marker on each probed pin
B.probes = () => {
  const out = [];
  if (dmm.red && B.pinMeta(dmm.red)) out.push({ what: "dmm+", key: dmm.red, color: PROBES["dmm+"].color, tag: "V Ω" });
  if (dmm.black && (dmm.red || dmm.black !== "esp:GND") && B.pinMeta(dmm.black)) out.push({ what: "dmm-", key: dmm.black, color: PROBES["dmm-"].color, tag: "COM" });
  if (scope.ch1 && B.pinMeta(scope.ch1)) out.push({ what: "ch1", key: scope.ch1, color: PROBES.ch1.color, tag: "CH1" });
  if (scope.ch2 && B.pinMeta(scope.ch2)) out.push({ what: "ch2", key: scope.ch2, color: PROBES.ch2.color, tag: "CH2" });
  if ((scope.ch1 || scope.ch2) && scope.gnd && B.pinMeta(scope.gnd)) out.push({ what: "gnd", key: scope.gnd, color: "#2a2a2a", tag: "⏚", clip: true });
  return out;
};

// ═════════════════════════ frame loop ═════════════════════════
B.on("tick", () => {
  frameNo++;
  power.last = budget();
  renderDmm(false);
  if (!dockOpen) return;
  if (dockTab === "scope") renderScope();
  else if (dockTab === "logic") renderLogic();
  else if (dockTab === "power") renderPower(false);
});
B.on("dock", () => renderDmm(true));
B.on("change", () => { i2cCache.key = ""; });
B.on("run", on => { if (on) setTimeout(autoSet, 300); });

showDock(dockTab);
setDockOpen(dockOpen);
B.instruments = { sigOfKey, evalSig, avgOf, budget, i2cData, channelList, scope, dmm, KNOBS, knobAngle };
B.instCtl = (name, dir = 1) => {
  if (KNOBS[name]) { knobStep(name, dir); B.showDock("scope"); }
  else if (name === "auto") { autoSet(); B.showDock("scope"); }
  else if (name === "run") { toggleHold(); B.showDock("scope"); }
  else if (name === "dial") { dialStep(dir); B.showDock("meter"); }
  else if (name === "hold") { toggleDmmHold(); B.showDock("meter"); }
  else if (name.startsWith("place:")) place(name.slice(6));
};
})();
