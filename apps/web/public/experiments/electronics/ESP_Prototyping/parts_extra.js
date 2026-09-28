/* ESP32 Prototype Bench: extra parts
   Sensors:   PIR (HC-SR501), waterproof ultrasonic (JSN-SR04T), water/leak strip, MQ-2 gas, INA219 current
   Displays:  LCD 16×2 with I²C backpack, SSD1306 0.96" OLED
   Actuators: solid-state relay, 5 V relay module, WS2812 NeoPixel ring, 28BYJ-48 stepper + ULN2003
   Every part plugs into the Bench extension hooks (see window.Bench.ext in app.js). */
(() => {
"use strict";
const B = window.Bench;
const { T, BUILD, ext, U, M, std, mesh, boxM, cylM, topBox, silk, addPin, GLOW_TEX, clamp, esc } = B;

// ───────── helpers ─────────
const netOf = (c, pin) => B.nets && B.nets.of(c.id + ":" + pin);
const wiredPin = (c, pin) => { const n = netOf(c, pin); return !!n && n.keys.length > 1; };
function supply(c, pin = "VCC") {
  const n = netOf(c, pin);
  if (!n || n.keys.length < 2) return null;
  return n.hasVin ? "5V" : n.has3v3 ? "3V3" : n.hasBatP ? "BAT" : n.gpios.length ? "GPIO" : "none";
}
const vccVolts = (c, pin = "VCC") => ({ "5V": 5, "3V3": 3.3, BAT: 6 }[supply(c, pin)] || 0);
const viaShifter = (c, pin) => { const t = B.trace(c.id + ":" + pin); return !!(t && t.via && t.via.type === "shifter"); };
const sensorsOn = () => B.state.comps.filter(B.isSensor);
const sensorOptions = (c, key, none) => [none ? [`${none[0]}`, none[1]] : null].filter(Boolean)
  .concat(sensorsOn().map(s => [s.id, `${s.name} (${T[s.type].name})`]))
  .map(([v, l]) => `<option value="${v}" ${c.props[key] === v ? "selected" : ""}>${esc(l)}</option>`).join("");
const selectField = (c, key, label, opts) => `<label class="field"><span>${label}</span><select id="p-${key}" data-prop="${key}">${opts}</select></label>`;
const textField = (c, key, label) => `<label class="field"><span>${label}</span><input type="text" id="p-${key}" data-prop="${key}" maxlength="16" value="${esc(c.props[key] || "")}" style="height:32px;border:1px solid var(--line);border-radius:8px;padding:0 8px;background:var(--panel);font-family:var(--mono)"></label>`;
function glow(color, size) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW_TEX, color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.set(size, size, size);
  return s;
}
function tube(points, r, color) {
  return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 24, r, 6), std(color));
}
// a mains lamp on a socket, wired to a screw terminal at (tx, tz)
function addBulb(c, g, x, z, tx, tz) {
  g.add(cylM(0.55, 0.65, 0.5, std(0x3a3a3a), x, 0.25, z));
  g.add(cylM(0.35, 0.42, 0.4, M.metal, x, 0.7, z));
  const glass = mesh(new THREE.SphereGeometry(0.75, 24, 16), std(0xfff4d6, { transparent: true, opacity: 0.55, roughness: 0.1, emissive: 0xffc861, emissiveIntensity: 0 }), x, 1.5, z);
  const fil = boxM(0.3, 0.05, 0.05, std(0x552200, { emissive: 0xff9a2a, emissiveIntensity: 0 }), x, 1.45, z);
  const halo = glow(0xffc46a, 5.5); halo.position.set(x, 1.5, z);
  g.add(glass, fil, halo);
  for (const [dx, col] of [[-0.15, 0x6b4a2b], [0.15, 0x3060c0]]) g.add(tube([[tx + dx, 0.45, tz], [(tx + x) / 2, 0.25, (tz + z) / 2 + 0.6], [x + dx, 0.3, z + 0.4]], 0.06, col));
  g.add(topBox(2.4, 0.02, 0.5, 0x2a1a0a, (gx, S, X, Z) => silk(gx, S, "LOAD · MAINS", X(0), Z(0), 0.2, "center", "#ffb35a"), x, 0.01, z + 1.3));
  c.anim.bulb = { glass, fil, halo };
}
function setBulb(c, on) {
  const b = c.anim.bulb;
  b.glass.material.emissiveIntensity = on ? 1.1 : 0;
  b.fil.material.emissiveIntensity = on ? 2 : 0;
  b.halo.material.opacity = on ? 0.75 : 0;
}
let audioCtx = null;
function click() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), gn = audioCtx.createGain();
    o.type = "square"; o.frequency.value = 1800;
    gn.gain.setValueAtTime(0.08, audioCtx.currentTime); gn.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.03);
    o.connect(gn).connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + 0.035);
  } catch (e) { /* no audio */ }
}

// ═════════════════════════ catalogue ═════════════════════════
B.CATS.splice(1, 0, "Displays");
Object.assign(T, {
  pir:      { name: "PIR motion (HC-SR501)", short: "pir", cat: "Sensors", blurb: "Body heat moving past. 3.3 V output, needs 5 V power.", w: 4.4, d: 3.4, color: 0x2d6a4f, label: "HC-SR501", titleX: -1.25,
              pins: [["VCC", "pwr", "4.5–20 V: use VIN"], ["OUT", "dout", "HIGH (3.3 V) while motion is held"], ["GND", "gnd", "Ground"]] },
  jsn:      { name: "Waterproof ultrasonic (JSN-SR04T)", short: "jsn", cat: "Sensors", blurb: "Sealed probe, 20–600 cm. The ROV altimeter. 5 V part.", w: 4.2, d: 2.4, color: 0x1b1b1b, label: "JSN-SR04T", titleX: -0.55, needs5v: true,
              pins: [["VCC", "pwr", "5 V: use VIN"], ["TRIG", "din", "10 µs pulse from the ESP32"], ["ECHO", "dout", "Pulse back at 5 V: divide it"], ["GND", "gnd", "Ground"]], props: { divider: false } },
  leak:     { name: "Water / leak strip", short: "leak", cat: "Sensors", blurb: "Exposed traces: wetter = higher voltage. A real leak detector.", w: 2.2, d: 6.0, color: 0xb3261e, label: "WATER", out5v: true,
              pins: [["S", "analog", "Analog: more water, higher voltage"], ["VCC", "pwr", "3.3–5 V (3V3 keeps S safe)"], ["GND", "gnd", "Ground"]], props: { leak: true } },
  mq2:      { name: "MQ-2 gas / smoke", short: "mq", cat: "Sensors", blurb: "Heated sensor: 150 mA and a warm-up. 5 V analog out.", w: 3.4, d: 2.6, color: 0x1f4f9e, label: "MQ-2", titleX: -1.1, needs5v: true, out5v: true,
              pins: [["VCC", "pwr", "5 V: the heater draws ~150 mA"], ["GND", "gnd", "Ground"], ["AO", "analog", "0–5 V analog: divide it"]], props: { divider: false } },
  ina:      { name: "INA219 current sensor", short: "ina", cat: "Sensors", blurb: "Volts, amps and watts over I²C (0x40). Reads the battery rail.", w: 2.6, d: 2.3, color: 0x5a2d82, label: "INA219", titleX: -0.55, i2c: 0x40,
              pins: [["VCC", "pwr", "3V3"], ["GND", "gnd", "Ground"], ["SCL", "scl", "I²C clock"], ["SDA", "sda", "I²C data"]] },
  lcd:      { name: "LCD 16×2 (I²C backpack)", short: "lcd", cat: "Displays", blurb: "PCF8574 backpack at 0x27. Needs 5 V for contrast.", w: 14, d: 6.2, color: 0x2c6e3a, board: false, act: true, noDrive: true, i2c: 0x27,
              pins: [["GND", "gnd", "Ground"], ["VCC", "pwr", "5 V for full contrast and backlight"], ["SDA", "sda", "I²C data (pulled up to VCC on the backpack!)"], ["SCL", "scl", "I²C clock (pulled up to VCC on the backpack!)"]],
              props: { mode: "auto", text1: "Hello bench", text2: "ESP32 + I2C LCD" } },
  oled:     { name: "OLED 0.96\" (SSD1306)", short: "oled", cat: "Displays", blurb: "128×64 pixels over I²C (0x3C). Text and a live graph.", w: 5.4, d: 5.6, color: 0x1c2a4a, label: "SSD1306 OLED", act: true, noDrive: true, i2c: 0x3c,
              pins: [["GND", "gnd", "Ground"], ["VCC", "pwr", "3.3–5 V"], ["SCL", "scl", "I²C clock"], ["SDA", "sda", "I²C data"]], props: { graph: "" } },
  ssr:      { name: "Solid-state relay", short: "ssr", cat: "Actuators", blurb: "Silent, no contacts. Switches AC loads only.", w: 3.6, d: 3.0, color: 0x1b1b1b, label: "SSR 2A", titleX: -0.95, act: true,
              pins: [["DC+", "pwr", "5 V module supply"], ["DC-", "gnd", "Ground"], ["CH1", "din", "Control input"]], props: { src: "manual", manual: 0, invert: false, threshold: 0.5, trigger: "low" } },
  relay:    { name: "Relay module 5 V", short: "rly", cat: "Actuators", blurb: "Mechanical contacts: clicks, switches AC or DC. Coil needs 5 V.", w: 3.8, d: 2.6, color: 0x1f4f9e, label: "RELAY", titleX: -1.15, act: true,
              pins: [["VCC", "pwr", "5 V: the coil draws ~72 mA"], ["GND", "gnd", "Ground"], ["IN", "din", "Control input"]], props: { src: "manual", manual: 0, invert: false, threshold: 0.5, trigger: "low", sound: false } },
  neopixel: { name: "NeoPixel ring (8× WS2812)", short: "px", cat: "Actuators", blurb: "Addressable RGB LEDs on one data pin. Up to 60 mA each.", w: 5.2, d: 6.6, color: 0x1b1b1b, board: false, act: true,
              pins: [["VCC", "pwr", "5 V: up to 60 mA per LED"], ["GND", "gnd", "Ground"], ["DIN", "din", "800 kHz data from a GPIO"]], props: { src: "manual", manual: 0.5, invert: false, mode: "bar", brightness: 0.3 } },
  stepper:  { name: "Stepper 28BYJ-48 + ULN2003", short: "stp", cat: "Actuators", blurb: "Exact angles, slow and strong. 4 GPIOs, 5 V.", w: 9, d: 3.6, color: 0x2d6a4f, board: false, act: true,
              pins: [["IN1", "din", "Coil A"], ["IN2", "din", "Coil B"], ["IN3", "din", "Coil C"], ["IN4", "din", "Coil D"], ["VCC", "pwr", "5 V motor supply"], ["GND", "gnd", "Ground"]], props: { src: "manual", manual: 0.25, invert: false } },
});

// World sliders + defaults
B.WORLD.find(w => w[0] === "distance")[6].push("jsn");
B.WORLD.find(w => w[0] === "distance")[1] = "Distance to obstacle / seabed";
B.WORLD.push(["motion", "Someone moving in front of the PIR", 0, 1, 1, "toggle", ["pir"]],
             ["water", "Water on the leak strip", 0, 100, 1, "%", ["leak"]],
             ["gas", "Gas / smoke", 200, 10000, 50, " ppm", ["mq2"]]);
Object.assign(B.DEFAULT_ENV, { motion: 0, water: 0, gas: 350 });
Object.assign(B.state.env, { motion: 0, water: 0, gas: 350 }, B.state.env);
Object.assign(B.IDLE_MA || {}, { pir: 0.07, jsn: 8, leak: 2, ina: 1 });

// ═════════════════════════ PIR ═════════════════════════
BUILD.pir = (c, g) => {
  const dome = mesh(new THREE.SphereGeometry(1.2, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), std(0xf2f2ee, { flatShading: true, transparent: true, opacity: 0.96, roughness: 0.35 }), 0.7, 0.16, -0.35);
  g.add(cylM(1.25, 1.25, 0.12, std(0xf2f2ee), 0.7, 0.22, -0.35), dome);
  g.add(cylM(0.22, 0.22, 0.2, std(0xe07a1f), -1.75, 0.26, 0.2), cylM(0.22, 0.22, 0.2, std(0xe07a1f), -1.15, 0.26, 0.2));
  c.anim.dome = dome;
};
ext.read.pir = (c, t, e) => {
  const a = c.anim;
  if (t < 3) return { norm: 0, text: "warming up (a real one needs ~60 s)", csv: "0" };
  if (e.motion) a.hold = t + 2.5;
  const on = !!a.hold && t < a.hold;
  return { norm: on ? 1 : 0, text: on ? `MOTION · stays HIGH ${(a.hold - t).toFixed(1)} s more` : "no motion", csv: on ? "1" : "0" };
};
ext.tick.pir = (c, a, live) => { if (!B.state.running) a.hold = 0; a.dome.material.emissive = new THREE.Color(live && (B.readings.get(c.id) || {}).norm ? 0x3a1a00 : 0x000000); };
ext.part.pir = (c, m, run) => m.pin === "OUT" ? { k: "dc", v: run && (B.readings.get(c.id) || {}).norm ? 3.3 : 0, what: "PIR output: 3.3 V while motion is held" } : null;
ext.check.pir = (c, add) => { if (supply(c) === "3V3") add("warn", c, `${c.name} gets 3.3 V`, "HC-SR501 needs 4.5–20 V. At 3.3 V it false-triggers or stays silent. Use VIN; its OUT is already 3.3 V."); };
ext.codeSensor.pir = x => {
  if (!x.pinDef(x.c, "OUT", "PIR output (3.3 V logic)")) return;
  x.setup.push(`  pinMode(${x.PN(x.c, "OUT")}, INPUT);`);
  x.loop.push(`  bool ${x.n} = digitalRead(${x.PN(x.c, "OUT")}) == HIGH;   // motion`);
  x.prints.push([`${x.n}=%d`, x.n]);
};
B.NORM.pir = n => `(${n} ? 1.0f : 0.0f)`;

// ═════════════════════════ JSN-SR04T ═════════════════════════
BUILD.jsn = (c, g) => {
  g.add(boxM(0.85, 0.7, 0.85, std(0x2b2b2b), 1.3, 0.51, -0.35), boxM(0.5, 0.2, 0.25, M.metal, 0.4, 0.26, -0.5));
  g.add(tube([[-1.3, 0.35, -1.1], [-1.6, 0.3, -2.5], [-2.2, 0.35, -3.6], [-2.4, 0.5, -4.4]], 0.13, 0x151515));
  g.add(cylM(0.95, 0.95, 1.2, std(0x1a1a1a, { roughness: 0.4 }), -2.4, 0.6, -5.2, 32), cylM(0.72, 0.72, 0.03, std(0x3a3a3a, { roughness: 0.9 }), -2.4, 1.22, -5.2, 32));
};
ext.read.jsn = (c, t, e, nz) => {
  const d = e.distance + nz(1.4);
  if (e.distance < 20) return { norm: 0, text: `blind zone: under 20 cm (real distance ${e.distance} cm)`, csv: "0cm" };
  return { norm: clamp((d - 20) / 180), text: `${d.toFixed(1)} cm (to the seabed)`, csv: `${d.toFixed(1)}cm` };
};
ext.part.jsn = (c, m, run, partVcc) => {
  if (m.pin !== "ECHO") return null;
  if (!run || B.state.env.distance < 20) return { k: "dc", v: 0, what: "no echo inside the 20 cm blind zone" };
  return { k: "pulse", period: 0.06, width: B.state.env.distance * 58e-6, delay: 0.6e-3, v: partVcc(c) * (c.props.divider ? 2 / 3 : 1), what: "ECHO: width = distance × 58 µs" };
};
ext.controls.jsn = (c, h) => h.check("divider", "1 kΩ / 2 kΩ divider on ECHO (5 V → 3.3 V)");
ext.codeSensor.jsn = x => {
  if (!x.pinDef(x.c, "TRIG", "JSN-SR04T trigger") | !x.pinDef(x.c, "ECHO", "echo (5 V: divide it)")) return;
  x.setup.push(`  pinMode(${x.PN(x.c, "TRIG")}, OUTPUT);`, `  pinMode(${x.PN(x.c, "ECHO")}, INPUT);`);
  x.loop.push(`  digitalWrite(${x.PN(x.c, "TRIG")}, HIGH); delayMicroseconds(10); digitalWrite(${x.PN(x.c, "TRIG")}, LOW);`,
              `  float ${x.n}_cm = pulseIn(${x.PN(x.c, "ECHO")}, HIGH, 40000) / 58.0f;  // 0 = blind zone / no echo`);
  x.prints.push([`${x.n}=%.1fcm`, `${x.n}_cm`]);
};
B.NORM.jsn = n => `(${n}_cm - 20.0f) / 180.0f`;

// ═════════════════════════ water / leak strip ═════════════════════════
BUILD.leak = (c, g) => {
  g.add(topBox(1.8, 0.01, 4.0, 0xb3261e, (gx, S, X, Z) => {
    gx.fillStyle = "#d9b04f";
    gx.fillRect(X(-0.82), Z(-2), S * 0.12, S * 4); gx.fillRect(X(0.7), Z(-2), S * 0.12, S * 4);
    for (let i = 0; i < 10; i++) { const z = -1.85 + i * 0.4; if (i % 2) gx.fillRect(X(-0.82), Z(z), S * 1.4, S * 0.1); else gx.fillRect(X(-0.6), Z(z), S * 1.4, S * 0.1); }
  }, 0, 0.165, -0.45));
  const drops = [[-0.3, -1.2, 0.26], [0.35, -0.2, 0.2], [-0.2, 0.6, 0.3], [0.3, 1.1, 0.18], [0, -1.8, 0.22]].map(([x, z, r]) => {
    const d = mesh(new THREE.SphereGeometry(r, 16, 10), std(0x4aa3ff, { transparent: true, opacity: 0.55, roughness: 0.05 }), x, 0.2, z);
    d.scale.y = 0.45; d.visible = false; g.add(d); return d;
  });
  c.anim.drops = drops;
};
ext.read.leak = (c, t, e, nz) => {
  const vcc = vccVolts(c) || 3.3, mv = Math.round(clamp(e.water / 100 * 0.9 * vcc * 1000 + nz(15), 0, vcc * 1000));
  return { norm: e.water / 100, text: `${mv} mV · ${e.water}% wet${c.props.leak && e.water >= 30 ? " · LEAK" : ""}`, csv: `${mv}mV` };
};
ext.tick.leak = (c, a) => { const w = B.state.env.water; a.drops.forEach((d, i) => { d.visible = w > i * 18; }); };
ext.part.leak = (c, m) => m.pin === "S" ? { k: "analog", v: B.state.env.water / 100 * 0.9 * (vccVolts(c) || 0), what: "leak strip analog output" } : null;
ext.leak.leak = c => c.props.leak && !B.hasErr(c) && B.state.running && B.state.env.water >= 30;
ext.controls.leak = (c, h) => h.check("leak", "Wet (30 % or more) counts as a leak: stops every thruster");
ext.codeSensor.leak = x => {
  if (!x.pinDef(x.c, "S", "water strip (analog)")) return;
  x.loop.push(`  float ${x.n}_mV = analogReadMilliVolts(${x.PN(x.c, "S")});`);
  if (x.c.props.leak) x.loop.push(`  bool ${x.n}_wet = ${x.n}_mV > ${Math.round(0.3 * 0.9 * (vccVolts(x.c) || 3.3) * 1000)};   // 30 % wet`);
  x.prints.push([`${x.n}=%.0fmV`, `${x.n}_mV`]);
};
B.NORM.leak = n => `${n}_mV / 3000.0f`;

// ═════════════════════════ MQ-2 ═════════════════════════
BUILD.mq2 = (c, g) => {
  g.add(cylM(1.0, 1.0, 0.25, std(0x2b2b2b), 0.65, 0.29, -0.35, 32));
  const can = cylM(0.92, 0.92, 1.1, std(0xb9bec2, { metalness: 0.7, roughness: 0.45, transparent: true, opacity: 0.93 }), 0.65, 0.95, -0.35, 32);
  const heat = cylM(0.35, 0.35, 0.6, std(0x331100, { emissive: 0xff5a1a, emissiveIntensity: 0 }), 0.65, 0.8, -0.35, 16);
  g.add(heat, can, cylM(0.8, 0.8, 0.03, std(0x555a5e, { roughness: 0.95 }), 0.65, 1.51, -0.35, 32));
  c.anim.heat = heat;
};
function mqVolts(c, t) {
  const e = B.state.env, warm = clamp(t / 8), ppm = e.gas * (1 + (1 - warm) * 3);
  return { warm, ppm, v: clamp(0.35 + Math.log10(ppm / 200) * 1.1, 0.2, 4.6) * (vccVolts(c) || 5) / 5 * (c.props.divider ? 2 / 3 : 1) };
}
ext.read.mq2 = (c, t, e) => {
  const q = mqVolts(c, t), mv = Math.round(q.v * 1000);
  return { norm: clamp(Math.log10(q.ppm / 200) / 1.7), text: q.warm < 1 ? `heating up… reads high (${mv} mV)` : `${e.gas} ppm · ${mv} mV`, csv: `${mv}mV` };
};
ext.tick.mq2 = (c, a, live, dt, t) => { a.heat.material.emissiveIntensity = B.state.running && supply(c) ? 0.6 + 0.2 * Math.sin(t * 3) : 0; };
ext.part.mq2 = (c, m, run) => m.pin === "AO" && run ? { k: "analog", v: mqVolts(c, B.simT).v, what: "MQ-2 analog output (log of gas concentration)" } : null;
ext.controls.mq2 = (c, h) => h.check("divider", "Voltage divider on AO (5 V → 3.3 V)");
ext.power.mq2 = (c, add, railOf) => { const r = railOf(c); if (r && B.state.running) add(r === "gpio" ? "r33" : r, c.name + " heater", r === "r33" ? 100 : 150); };
ext.codeSensor.mq2 = x => {
  if (!x.pinDef(x.c, "AO", "MQ-2 analog (divided)")) return;
  x.loop.push(`  float ${x.n}_mV = analogReadMilliVolts(${x.PN(x.c, "AO")});   // let the heater warm up first`);
  x.prints.push([`${x.n}=%.0fmV`, `${x.n}_mV`]);
};
B.NORM.mq = n => `${n}_mV / 3100.0f`;

// ═════════════════════════ INA219 ═════════════════════════
BUILD.ina = (c, g) => {
  g.add(boxM(1.3, 0.6, 0.6, std(0x2a6fc0), 0.55, 0.46, -0.65), boxM(0.55, 0.12, 0.3, std(0x1b1b1b), 0.6, 0.22, 0.05));
};
function inaRead() {
  const b = B.instruments && B.instruments.budget ? B.instruments.budget() : null;
  return { mA: b ? b.bat || 0 : 0, V: b ? b.batV : 6.2 };
}
ext.read.ina = (c, t, e, nz) => {
  const r = inaRead(), mA = Math.max(0, r.mA + nz(2));
  return { norm: clamp(mA / 1000), text: `${mA.toFixed(0)} mA · ${r.V.toFixed(2)} V · ${(mA * r.V / 1000).toFixed(2)} W on the battery rail`, csv: `${mA.toFixed(0)}mA` };
};
ext.i2c.ina = c => { const raw = Math.round(inaRead().mA * 10) & 0xffff; return { reg: 0x04, bytes: [raw >> 8, raw & 0xff], meaning: `current register 0x${raw.toString(16)} × 0.1 mA = ${(raw / 10).toFixed(1)} mA` }; };
ext.codeSensor.ina = x => {
  x.startI2C(x.c); x.inc.add("#include <Adafruit_INA219.h>   // Library Manager: Adafruit INA219");
  x.glob.push(`Adafruit_INA219 ${x.n};                     // address 0x40`);
  x.setup.push(`  if (!${x.n}.begin()) Serial.println("# ${x.n} not found at 0x40");`);
  x.loop.push(`  float ${x.n}_mA = ${x.n}.getCurrent_mA();`);
  x.prints.push([`${x.n}=%.0fmA`, `${x.n}_mA`]);
};
B.NORM.ina = n => `${n}_mA / 1000.0f`;

// ═════════════════════════ displays: shared text ═════════════════════════
function autoLines(count, width) {
  return sensorsOn().map(s => { const r = B.readings.get(s.id); return `${s.name}:${r ? r.csv : "--"}`.slice(0, width); }).slice(0, count);
}
const displayState = c => !B.state.running || !supply(c) ? "off" : B.hasErr(c) ? "fail" : "on";

// ═════════════════════════ LCD 16×2 ═════════════════════════
const LCD_W = 14, LCD_D = 6.2;
function drawLCD(c, lines, st) {
  const cv = c.anim.lcdCanvas, g = cv.getContext("2d"), W = cv.width, H = cv.height;
  const back = st === "off" ? "#3b4a1f" : supply(c) === "3V3" ? "#8ea832" : "#b8d63e";
  g.fillStyle = back; g.fillRect(0, 0, W, H);
  const cw = W / 16, ch = H / 2;
  for (let r = 0; r < 2; r++) for (let i = 0; i < 16; i++) {
    const x = i * cw, y = r * ch;
    if (st === "fail" && r === 0) { g.fillStyle = "rgba(20,30,8,.85)"; g.fillRect(x + 3, y + 6, cw - 6, ch - 12); continue; }
    g.fillStyle = "rgba(0,0,0,.07)"; g.fillRect(x + 3, y + 6, cw - 6, ch - 12);
  }
  if (st === "on") {
    g.fillStyle = supply(c) === "3V3" ? "rgba(20,30,8,.45)" : "#1c2808";
    g.font = `600 ${ch * 0.72}px "IBM Plex Mono", monospace`; g.textBaseline = "middle"; g.textAlign = "center";
    lines.forEach((ln, r) => { for (let i = 0; i < 16; i++) g.fillText(ln[i] || " ", i * cw + cw / 2, r * ch + ch / 2 + 1); });
  }
  c.anim.lcdTex.needsUpdate = true;
}
BUILD.lcd = (c, g) => {
  const pinX = i => -6.15 + i * U, pz = LCD_D / 2 - 0.45;
  g.add(topBox(LCD_W, 0.16, LCD_D, 0x2c6e3a, (gx, S, X, Z) => {
    gx.strokeStyle = "rgba(255,255,255,.4)"; gx.lineWidth = S * 0.03; gx.strokeRect(S * .12, S * .12, LCD_W * S - S * .24, LCD_D * S - S * .24);
    for (const [hx, hz] of [[-6.5, -2.6], [6.5, -2.6], [-6.5, 2.6], [6.5, 2.6]]) { gx.fillStyle = "#c9a54a"; gx.beginPath(); gx.arc(X(hx), Z(hz), S * .3, 0, 7); gx.fill(); gx.fillStyle = "#0c0c0c"; gx.beginPath(); gx.arc(X(hx), Z(hz), S * .18, 0, 7); gx.fill(); }
    T.lcd.pins.forEach(([n], i) => silk(gx, S, n, X(pinX(i)), Z(pz - 0.5), 0.2));
    silk(gx, S, "LCD1602 · I²C 0x27", X(2.5), Z(2.5), 0.28);
    silk(gx, S, c.name, X(-2.4), Z(2.5), 0.24, "center", "rgba(255,210,150,.95)");
  }, 0, 0.08, 0));
  g.add(boxM(12.6, 0.42, 4.2, std(0x151515, { roughness: 0.5 }), 0, 0.37, -0.45));
  const cv = document.createElement("canvas"); cv.width = 640; cv.height = 160;
  const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding;
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(11.2, 2.8), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  scr.rotation.x = -Math.PI / 2; scr.position.set(0, 0.59, -0.45); g.add(scr);
  g.add(boxM(4 * U, 0.25, 0.5, M.header, -5.4, 0.285, pz));
  T.lcd.pins.forEach(([n, k, d], i) => addPin(c, g, n, k, d, pinX(i), pz, 0.41));
  c.anim.lcdCanvas = cv; c.anim.lcdTex = tex; c.anim.lcdKey = "";
  drawLCD(c, ["", ""], "off");
};
function lcdLines(c) {
  if (c.props.mode === "custom") return [(c.props.text1 || "").padEnd(16).slice(0, 16), (c.props.text2 || "").padEnd(16).slice(0, 16)];
  const l = autoLines(2, 16);
  return [(l[0] || "no sensor wired").padEnd(16).slice(0, 16), (l[1] || "").padEnd(16).slice(0, 16)];
}
ext.tick.lcd = (c, a, live, dt, t) => {
  a.lcdAcc = (a.lcdAcc || 0) + dt;
  if (a.lcdAcc < 0.25) return;
  a.lcdAcc = 0;
  const st = displayState(c), lines = st === "on" ? lcdLines(c) : ["", ""], key = st + lines.join("|") + supply(c);
  if (key !== a.lcdKey) { a.lcdKey = key; drawLCD(c, lines, st); }
  B.outputs.set(c.id, { lines, st });
};
ext.live.lcd = (c, o) => o.st === "fail" ? "Top row of black boxes: power is fine but init/I²C failed. Check SDA/SCL." : o.st === "off" ? "Dark: no power." : `"${(o.lines || []).map(l => l.trimEnd()).join(" / ")}"`;
ext.controls.lcd = (c, h) => selectField(c, "mode", "Shows", [["auto", "First two sensors, live"], ["custom", "My own text"]].map(([v, l]) => `<option value="${v}" ${c.props.mode === v ? "selected" : ""}>${l}</option>`).join("")) +
  (c.props.mode === "custom" ? textField(c, "text1", "Line 1 (16 chars)") + textField(c, "text2", "Line 2 (16 chars)") : "");
ext.check.lcd = (c, add) => {
  const s = supply(c);
  if (s === "3V3") add("warn", c, `${c.name} runs from 3.3 V`, "A 5 V LCD at 3.3 V shows faint characters with a dim backlight. Use VIN plus a level shifter on SDA/SCL.");
  if (s === "5V" && !viaShifter(c, "SDA")) add("warn", c, `${c.name}'s backpack pulls SDA/SCL up to 5 V`, "That's above the ESP32's 3.6 V limit. It often survives, but put a level shifter between them (or remove the backpack's pull-ups).");
};
ext.i2c.lcd = c => {
  const ch = (lcdLines(c)[0] || "  ").charCodeAt(0), hi = ch & 0xf0, lo = (ch << 4) & 0xf0;
  return { write: true, bytes: [hi | 0x0d, hi | 0x09, lo | 0x0d, lo | 0x09], meaning: `PCF8574 4-bit mode: one character ('${String.fromCharCode(ch)}') takes 4 writes (a nibble with EN high, then low). A full 16×2 refresh is ~130 writes, which is why LCD updates are slow.` };
};
ext.power.lcd = (c, add, railOf) => { const r = railOf(c); if (r && B.state.running) add(r === "gpio" ? "r33" : r, c.name + " backlight", r === "r33" ? 14 : 24); };
ext.codeAct.lcd = x => {
  x.startI2C(x.c); x.inc.add("#include <LiquidCrystal_I2C.h>  // Library Manager: LiquidCrystal I2C");
  x.glob.push(`LiquidCrystal_I2C ${x.n}(0x27, 16, 2);`);
  x.setup.push(`  ${x.n}.init();`, `  ${x.n}.backlight();`);
  if (x.c.props.mode === "custom") { x.setup.push(`  ${x.n}.setCursor(0, 0); ${x.n}.print("${(x.c.props.text1 || "").slice(0, 16).replace(/"/g, "'")}");`, `  ${x.n}.setCursor(0, 1); ${x.n}.print("${(x.c.props.text2 || "").slice(0, 16).replace(/"/g, "'")}");`); return; }
  const p = x.prints.slice(0, 2);
  if (!p.length) { x.outs.push(`  // ${x.n}: wire a sensor to show it here`); return; }
  x.outs.push(`  static uint32_t ${x.n}_t = 0;                 // LCD writes are slow: refresh 2× per second`, `  if (millis() - ${x.n}_t > 500) {`, `    ${x.n}_t = millis();`);
  p.forEach(([fmt, v], i) => x.outs.push(`    ${x.n}.setCursor(0, ${i}); ${x.n}.printf("%-16s", String(${v}).c_str());   // ${fmt.split("=")[0]}`));
  x.outs.push("  }");
};

// ═════════════════════════ OLED SSD1306 ═════════════════════════
BUILD.oled = (c, g) => {
  g.add(boxM(5.0, 0.12, 3.3, std(0x0a0a0a, { roughness: 0.2 }), 0, 0.22, -0.45));
  const cv = document.createElement("canvas"); cv.width = 256; cv.height = 128;
  const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding; tex.magFilter = THREE.NearestFilter;
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.3), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  scr.rotation.x = -Math.PI / 2; scr.position.set(0, 0.285, -0.45); g.add(scr);
  c.anim.oledCanvas = cv; c.anim.oledTex = tex; c.anim.hist = [];
  const x = cv.getContext("2d"); x.fillStyle = "#000"; x.fillRect(0, 0, 256, 128); tex.needsUpdate = true;
};
function drawOLED(c, st) {
  const cv = c.anim.oledCanvas, g = cv.getContext("2d");
  g.fillStyle = "#000"; g.fillRect(0, 0, 256, 128);
  if (st === "on") {
    g.textBaseline = "top"; g.font = `600 22px "IBM Plex Mono", monospace`;
    g.fillStyle = "#ffd94a"; g.fillText(`${c.name}  ${B.simT.toFixed(0)}s`, 4, 4);                      // yellow band: top 16 px on cheap two-colour OLEDs
    g.fillStyle = "#6fe3ff"; g.font = `500 18px "IBM Plex Mono", monospace`;
    autoLines(3, 20).forEach((l, i) => g.fillText(l, 4, 34 + i * 20));
    const h = c.anim.hist;
    if (h.length > 1) {
      g.strokeStyle = "#6fe3ff"; g.lineWidth = 2; g.beginPath();
      h.forEach((v, i) => { const px = 4 + i / 59 * 248, py = 124 - v * 26; if (i) g.lineTo(px, py); else g.moveTo(px, py); });
      g.stroke();
    }
  }
  c.anim.oledTex.needsUpdate = true;
}
ext.tick.oled = (c, a, live, dt) => {
  a.oAcc = (a.oAcc || 0) + dt;
  if (a.oAcc < 0.2) return;
  a.oAcc = 0;
  const st = displayState(c);
  const src = c.props.graph || (sensorsOn()[0] || {}).id, r = src && B.readings.get(src);
  if (st === "on") { a.hist.push(r ? r.norm : 0); if (a.hist.length > 60) a.hist.shift(); } else a.hist.length = 0;
  drawOLED(c, st);
  B.outputs.set(c.id, { st, graph: src });
};
ext.live.oled = (c, o) => o.st === "fail" ? "Blank: display.begin() failed. Check SDA/SCL and the 0x3C address." : o.st === "off" ? "Blank: no power." : `Showing readings, graphing ${(B.byId(o.graph) || {}).name || "nothing"}.`;
ext.controls.oled = c => selectField(c, "graph", "Graph at the bottom", sensorOptions(c, "graph", ["", "First sensor"]));
ext.i2c.oled = () => ({ write: true, bytes: [0x40, 0x00, 0x3c, 0x42, 0x42, 0x3c, 0x00], meaning: "Control byte 0x40 = 'pixel data follows', then one byte per 8-pixel column. A full frame is 1024 bytes: ~23 ms at 400 kHz." });
ext.power.oled = (c, add, railOf) => { const r = railOf(c); if (r && B.state.running) add(r === "gpio" ? "r33" : r, c.name, 12); };
ext.codeAct.oled = x => {
  x.startI2C(x.c);
  x.inc.add("#include <Adafruit_SSD1306.h>   // Library Manager: Adafruit SSD1306 (+ GFX)");
  x.glob.push(`Adafruit_SSD1306 ${x.n}(128, 64, &Wire, -1);`);
  x.setup.push(`  if (!${x.n}.begin(SSD1306_SWITCHCAPVCC, 0x3C)) Serial.println("# ${x.n} not found at 0x3C");`, `  ${x.n}.setTextColor(SSD1306_WHITE);`);
  const p = x.prints.slice(0, 3);
  x.outs.push(`  static uint32_t ${x.n}_t = 0;`, `  if (millis() - ${x.n}_t > 200) {                  // a full frame is 1 KB: ~23 ms`, `    ${x.n}_t = millis();`, `    ${x.n}.clearDisplay();`, `    ${x.n}.setCursor(0, 0); ${x.n}.printf("${x.n} %lus", millis() / 1000);`);
  p.forEach(([fmt, v], i) => x.outs.push(`    ${x.n}.setCursor(0, ${16 + i * 12}); ${x.n}.printf("${fmt}", ${v});`));
  x.outs.push(`    ${x.n}.display();`, "  }");
};

// ═════════════════════════ relays (solid-state + mechanical) ═════════════════════════
function relayDrive(c) { return B.srcLevel(c) > c.props.threshold; }
const pinFor = c => c.type === "ssr" ? "CH1" : "IN";
const supplyFor = c => supply(c, c.type === "ssr" ? "DC+" : "VCC");
BUILD.ssr = (c, g) => {
  g.add(topBox(2.0, 1.25, 0.65, 0x111111, (gx, S, X, Z) => { silk(gx, S, "G3MB", X(0), Z(0), 0.2, "center", "rgba(255,255,255,.8)"); }, 0.55, 0.78, -0.4));
  g.add(boxM(1.6, 0.6, 0.6, std(0x1f7a3a), 0.6, 0.46, -1.1));
  const led = boxM(0.22, 0.1, 0.16, std(0x551010, { emissive: 0xff2a1a, emissiveIntensity: 0 }), -1.2, 0.21, -0.25);
  g.add(led); c.anim.led = led;
  addBulb(c, g, 4.3, -1.0, 0.6, -1.1);
};
BUILD.relay = (c, g) => {
  const cube = topBox(1.6, 1.5, 1.9, 0x2a5db0, (gx, S, X, Z) => { silk(gx, S, "SONGLE", X(0), Z(-0.45), 0.2, "center", "rgba(255,255,255,.9)"); silk(gx, S, "SRD-05VDC", X(0), Z(-0.1), 0.17, "center", "rgba(255,255,255,.9)"); silk(gx, S, "10A 250VAC", X(0), Z(0.25), 0.15, "center", "rgba(255,255,255,.8)"); }, 0.75, 0.91, -0.2);
  g.add(cube, boxM(0.6, 0.6, 1.6, std(0x2a6fc0), 1.75, 0.46, -0.3));
  const led = boxM(0.22, 0.1, 0.16, std(0x551010, { emissive: 0xff2a1a, emissiveIntensity: 0 }), -1.35, 0.21, -0.25);
  g.add(led); c.anim.led = led; c.anim.cube = cube;
  addBulb(c, g, 4.6, -0.6, 1.75, -0.3);
};
function tickRelay(c, a, live, dt) {
  const want = live && relayDrive(c);
  const coilOK = c.type === "ssr" || supplyFor(c) === "5V";
  const closed = want && coilOK;
  a.led.material.emissiveIntensity = want ? 1.4 : 0;
  setBulb(c, closed);
  if (c.type === "relay") {
    if (closed !== a.wasClosed && a.wasClosed !== undefined) { a.jolt = 0.12; if (c.props.sound && B.state.running) click(); }
    a.wasClosed = closed;
    a.jolt = Math.max(0, (a.jolt || 0) - dt);
    a.cube.position.y = 0.91 + (a.jolt > 0 ? 0.04 * Math.sin(a.jolt * 160) : 0);
  }
  B.outputs.set(c.id, { on: want, closed, coilOK });
}
ext.tick.ssr = tickRelay;
ext.tick.relay = tickRelay;
const relayLive = (c, o) => !o.on ? "OFF: lamp dark" : !o.closed ? "Input LED on, but the coil can't pull in at 3.3 V: contacts stay open" : `ON: lamp lit${c.props.trigger === "low" ? " (pin driven LOW: low-level trigger)" : ""}`;
ext.live.ssr = relayLive; ext.live.relay = relayLive;
ext.serial.ssr = (c, o) => o.closed ? 1 : 0; ext.serial.relay = (c, o) => o.closed ? 1 : 0;
const relayControls = (c, h) => h.slider("threshold", "Switch on above", 0, 1, 0.01, h.pct) +
  selectField(c, "trigger", "Module trigger", [["low", "Low-level trigger (LOW = on)"], ["high", "High-level trigger (HIGH = on)"]].map(([v, l]) => `<option value="${v}" ${c.props.trigger === v ? "selected" : ""}>${l}</option>`).join("")) +
  (c.type === "relay" ? h.check("sound", "Click sound") : "");
ext.controls.ssr = relayControls; ext.controls.relay = relayControls;
const relayCheck = (c, add) => {
  const s = supplyFor(c);
  if (s === "3V3") add("warn", c, `${c.name} runs from 3.3 V`, c.type === "relay" ? "The 5 V coil (~72 mA) won't pull in at 3.3 V: the LED lights but nothing switches. Use VIN." : "The 5 V input stage may not switch reliably at 3.3 V. Use VIN.");
  if (s === "5V" && c.props.trigger === "low" && !viaShifter(c, pinFor(c))) add("info", c, `${c.name}: low-level trigger on 5 V`, "A 3.3 V HIGH may not fully switch a 5 V low-trigger input off. Test it; if it won't release, drive it through a transistor or level shifter.");
};
ext.check.ssr = relayCheck; ext.check.relay = relayCheck;
const relayOut = (c, pin, o) => pin === pinFor(c) ? { k: "dc", v: (o.on ? c.props.trigger === "high" : c.props.trigger === "low") ? 3.3 : 0, what: `${c.props.trigger === "low" ? "low" : "high"}-level trigger: ${o.on ? "ON" : "OFF"}` } : null;
ext.espOut.ssr = relayOut; ext.espOut.relay = relayOut;
const relayPower = (c, add, railOf, gpioLoad) => {
  const o = B.outputs.get(c.id) || {}, r = railOf(c, c.type === "ssr" ? "DC+" : "VCC");
  if (r && o.on) add(r === "gpio" ? "r33" : r, `${c.name} ${c.type === "relay" ? "coil" : "input"}`, c.type === "relay" ? (o.closed ? 72 : 45) : 10);
};
ext.power.ssr = relayPower; ext.power.relay = relayPower;
const relayCode = x => {
  const pin = pinFor(x.c);
  if (!x.pinDef(x.c, pin, `${T[x.c.type].name} (${x.c.props.trigger}-level trigger)`)) return;
  const on = x.c.props.trigger === "low" ? "LOW" : "HIGH", off = on === "LOW" ? "HIGH" : "LOW";
  x.setup.push(`  digitalWrite(${x.PN(x.c, pin)}, ${off});                // start OFF before enabling the output`, `  pinMode(${x.PN(x.c, pin)}, OUTPUT);`);
  x.outs.push(`  digitalWrite(${x.PN(x.c, pin)}, ${x.lvlOf(x.c)} > ${x.c.props.threshold.toFixed(2)}f ? ${on} : ${off});`);
};
ext.codeAct.ssr = relayCode; ext.codeAct.relay = relayCode;

// ═════════════════════════ NeoPixel ring ═════════════════════════
BUILD.neopixel = (c, g) => {
  const ring = mesh(new THREE.RingGeometry(1.45, 2.55, 48), std(0x141414, { side: THREE.DoubleSide, roughness: 0.6 }), 0, 0.16, -0.8);
  ring.rotation.x = -Math.PI / 2; g.add(ring);
  g.add(mesh(new THREE.CylinderGeometry(2.55, 2.55, 0.14, 48, 1, true), std(0x141414, { side: THREE.DoubleSide }), 0, 0.08, -0.8));
  c.anim.px = [];
  for (let i = 0; i < 8; i++) {
    const ang = i / 8 * Math.PI * 2 - Math.PI / 2, x = Math.cos(ang) * 2.0, z = -0.8 + Math.sin(ang) * 2.0;
    const m = std(0xeeeeee, { emissive: 0x000000, emissiveIntensity: 1.5, roughness: 0.3 });
    const led = boxM(0.5, 0.18, 0.5, m, x, 0.25, z); led.rotation.y = -ang;
    const gl = glow(0xffffff, 2.2); gl.position.set(x, 0.5, z);
    g.add(led, gl); c.anim.px.push({ m, gl });
  }
  g.add(topBox(1.9, 0.12, 0.9, 0x141414, (gx, S, X, Z) => T.neopixel.pins.forEach(([n], i) => silk(gx, S, n, X((i - 1) * U), Z(-0.25), 0.15)), 0, 0.06, 2.35));
  g.add(boxM(3 * U, 0.25, 0.5, M.header, 0, 0.245, 2.55));
  T.neopixel.pins.forEach(([n, k, d], i) => addPin(c, g, n, k, d, (i - 1) * U, 2.55, 0.37));
  g.add(topBox(2.4, 0.02, 0.45, 0x26483d, (gx, S, X, Z) => silk(gx, S, `${c.name} · WS2812 ×8`, X(0), Z(0), 0.18, "center", "rgba(255,210,150,.95)"), 0, 0.01, 1.55));
};
function pxColors(c, level) {
  const n = Math.round(level * 8), out = [];
  for (let i = 0; i < 8; i++) {
    let col;
    if (c.props.mode === "colour") col = new THREE.Color().setHSL((1 - level) * 0.33, 1, 0.5);
    else col = i < n ? new THREE.Color().setHSL((1 - i / 7) * 0.33, 1, 0.5) : null;
    out.push(col);
  }
  return out;
}
ext.tick.neopixel = (c, a, live) => {
  const lvl = live ? B.srcLevel(c) : 0, cols = live ? pxColors(c, lvl) : new Array(8).fill(null);
  const bright = c.props.brightness * (supply(c) === "3V3" ? 0.55 : 1);
  let mA = 8 * 0.6;
  cols.forEach((col, i) => {
    const p = a.px[i];
    if (col) { p.m.emissive = col.clone(); p.m.emissiveIntensity = 0.4 + bright * 2.4; p.gl.material.color = col; p.gl.material.opacity = 0.25 + bright * 0.6; mA += (col.r + col.g + col.b) * 20 * c.props.brightness; }
    else { p.m.emissive.set(0x000000); p.gl.material.opacity = 0; }
  });
  B.outputs.set(c.id, { level: lvl, lit: cols.filter(Boolean).length, mA: live ? mA : 0 });
};
ext.live.neopixel = (c, o) => `${o.lit || 0} of 8 lit · about ${(o.mA || 0).toFixed(0)} mA at brightness ${Math.round(c.props.brightness * 100)} %`;
ext.serial.neopixel = (c, o) => o.lit || 0;
ext.controls.neopixel = (c, h) =>
  selectField(c, "mode", "Pattern", [["bar", "Bar graph (green → red)"], ["colour", "All one colour (green → red)"]].map(([v, l]) => `<option value="${v}" ${c.props.mode === v ? "selected" : ""}>${l}</option>`).join("")) +
  h.slider("brightness", "Brightness (setBrightness)", 0.05, 1, 0.05, h.pct);
ext.check.neopixel = (c, add) => {
  const s = supply(c);
  if (s === "3V3") add("info", c, `${c.name} runs from 3.3 V`, "WS2812s work but look dim and colours shift. VIN gives full brightness.");
  if (s === "5V" && !viaShifter(c, "DIN")) add("info", c, `${c.name} gets 3.3 V data at 5 V power`, "The spec wants 0.7 × 5 V = 3.5 V for a HIGH. Short wires usually work; a level shifter makes it reliable.");
};
ext.espOut.neopixel = (c, pin, o) => pin === "DIN" ? { k: "burst", period: 0.02, len: 8 * 24 * 1.25e-6, v: 3.3, what: "WS2812 data: 24 bits per LED at 800 kHz, then a reset gap" } : null;
ext.power.neopixel = (c, add, railOf) => { const r = railOf(c), o = B.outputs.get(c.id) || {}; if (r && B.state.running) add(r === "gpio" ? "r33" : r, `${c.name} (${o.lit || 0} lit)`, o.mA || 4.8); };
ext.codeAct.neopixel = x => {
  if (!x.pinDef(x.c, "DIN", "NeoPixel data")) return;
  x.inc.add("#include <Adafruit_NeoPixel.h>  // Library Manager: Adafruit NeoPixel");
  x.glob.push(`Adafruit_NeoPixel ${x.n}(8, ${x.PN(x.c, "DIN")}, NEO_GRB + NEO_KHZ800);`);
  x.setup.push(`  ${x.n}.begin();`, `  ${x.n}.setBrightness(${Math.round(x.c.props.brightness * 255)});        // current: up to 60 mA per LED at 255`);
  x.outs.push(`  float ${x.n}_lvl = ${x.lvlOf(x.c)};`);
  if (x.c.props.mode === "colour") x.outs.push(`  ${x.n}.fill(${x.n}.ColorHSV((uint16_t)((1.0f - ${x.n}_lvl) * 21845)));`);
  else x.outs.push(`  for (int i = 0; i < 8; i++)`, `    ${x.n}.setPixelColor(i, i < ${x.n}_lvl * 8 ? ${x.n}.ColorHSV((uint16_t)((1.0f - i / 7.0f) * 21845)) : 0);`);
  x.outs.push(`  ${x.n}.show();`);
};

// ═════════════════════════ stepper 28BYJ-48 + ULN2003 ═════════════════════════
const HALF = [[1, 0, 0, 0], [1, 1, 0, 0], [0, 1, 0, 0], [0, 1, 1, 0], [0, 0, 1, 0], [0, 0, 1, 1], [0, 0, 0, 1], [1, 0, 0, 1]];
BUILD.stepper = (c, g) => {
  // driver board on the right, motor on the left
  const bx = 2.6;
  g.add(topBox(3.6, 0.16, 3.6, 0x2d6a4f, (gx, S, X, Z) => {
    gx.strokeStyle = "rgba(255,255,255,.45)"; gx.lineWidth = S * .03; gx.strokeRect(S * .12, S * .12, 3.6 * S - S * .24, 3.6 * S - S * .24);
    T.stepper.pins.forEach(([n], i) => silk(gx, S, n, X((i - 2.5) * U), Z(1.02), 0.17));
    silk(gx, S, "ULN2003", X(-0.75), Z(-1.3), 0.26); silk(gx, S, c.name, X(-0.75), Z(-0.95), 0.2, "center", "rgba(255,210,150,.95)");
    ["A", "B", "C", "D"].forEach((l, i) => silk(gx, S, l, X(-1.4 + i * 0.4), Z(-0.05), 0.16));
  }, bx, 0.08, 0));
  g.add(boxM(0.8, 0.3, 1.9, M.dark, bx + 1.1, 0.31, -0.55));
  g.add(boxM(1.4, 0.45, 0.5, std(0xf2f2ee), bx + 0.9, 0.39, -1.45));
  c.anim.coilLeds = [0, 1, 2, 3].map(i => { const l = boxM(0.2, 0.1, 0.2, std(0x551010, { emissive: 0xff2a1a, emissiveIntensity: 0 }), bx - 1.4 + i * 0.4, 0.21, -0.35); g.add(l); return l.material; });
  g.add(boxM(6 * U, 0.25, 0.5, M.header, bx, 0.285, 1.45));
  T.stepper.pins.forEach(([n, k, d], i) => addPin(c, g, n, k, d, bx + (i - 2.5) * U, 1.45, 0.41));
  // motor
  const mx = -2.4, mz = -0.2;
  g.add(cylM(1.4, 1.4, 1.9, std(0xc2c7cc, { metalness: 0.75, roughness: 0.3 }), mx, 0.95, mz, 40));
  g.add(cylM(1.2, 1.2, 0.3, std(0x2a5db0), mx, 0.15, mz + 0.35, 32), boxM(4.2, 0.12, 0.7, std(0xc2c7cc, { metalness: 0.7, roughness: 0.35 }), mx, 1.85, mz));
  g.add(cylM(0.45, 0.45, 0.3, std(0xc2c7cc, { metalness: 0.7 }), mx, 2.05, mz - 0.55));
  const arm = new THREE.Group(); arm.position.set(mx, 2.25, mz - 0.55);
  arm.add(cylM(0.12, 0.12, 0.35, std(0xd9b04f, { metalness: 0.6 }), 0, 0, 0), boxM(0.28, 0.14, 1.8, std(0xff7a21), 0, 0.12, -0.8));
  g.add(arm); c.anim.arm = arm;
  [0x2f6fd6, 0xe874b3, 0xe9c21c, 0xef7d22, 0xd8342c].forEach((col, i) => g.add(tube([[mx + 1.1, 0.35, mz + 0.9 + i * 0.05], [0.4, 0.3, -1.9 + i * 0.05], [bx + 0.4 + i * 0.2, 0.55, -1.55]], 0.045, col)));
};
ext.tick.stepper = (c, a, live, dt) => {
  const target = live ? B.srcLevel(c) * 360 : (a.angle || 0);
  const cur = a.angle || 0, step = 60 * dt, next = cur + clamp(target - cur, -step, step);
  const moving = live && Math.abs(target - cur) > 0.05;
  a.angle = next;
  a.arm.rotation.y = -next * Math.PI / 180;
  const phase = ((Math.round(next * 4096 / 360) % 8) + 8) % 8;
  a.coilLeds.forEach((m, i) => { m.emissiveIntensity = live ? HALF[phase][i] * 1.4 : 0; });
  B.outputs.set(c.id, { angle: next, moving, phase, powered: live });
};
ext.live.stepper = (c, o) => `${(o.angle || 0).toFixed(1)}° · ${o.moving ? "stepping (~60°/s, half steps)" : "holding"} · step ${Math.round((o.angle || 0) * 4096 / 360)} of 4096`;
ext.serial.stepper = (c, o) => `${Math.round(o.angle || 0)}deg`;
ext.check.stepper = (c, add) => { if (supply(c) === "3V3") add("warn", c, `${c.name} runs from 3.3 V`, "28BYJ-48 is a 5 V motor. At 3.3 V it stalls or skips steps. Use VIN."); };
ext.espOut.stepper = (c, pin, o) => {
  const idx = ["IN1", "IN2", "IN3", "IN4"].indexOf(pin);
  if (idx < 0) return null;
  if (o.moving) { const f = 60 / 360 * 4096, period = 8 / f; return { k: "pulse", period, width: period * 3 / 8, delay: idx * period / 4, v: 3.3, what: `coil ${"ABCD"[idx]}: half-step sequence, ${f.toFixed(0)} steps/s` }; }
  return { k: "dc", v: o.powered && HALF[o.phase || 0][idx] ? 3.3 : 0, what: `coil ${"ABCD"[idx]} holding` };
};
ext.power.stepper = (c, add, railOf) => { const r = railOf(c), o = B.outputs.get(c.id) || {}; if (r && B.state.running && o.powered) add(r === "gpio" ? "r33" : r, `${c.name} coils (${o.moving ? "stepping" : "holding"})`, o.moving ? 240 : 160); };
ext.codeAct.stepper = x => {
  const ok = ["IN1", "IN2", "IN3", "IN4"].map(p => x.pinDef(x.c, p, `ULN2003 ${p}`)).every(Boolean);
  if (!ok) { x.outs.push(`  // ${x.n}: wire IN1–IN4 to GPIOs`); return; }
  x.inc.add("#include <Stepper.h>");
  x.glob.push(`Stepper ${x.n}(2048, ${x.PN(x.c, "IN1")}, ${x.PN(x.c, "IN3")}, ${x.PN(x.c, "IN2")}, ${x.PN(x.c, "IN4")});   // note the 1-3-2-4 order`, `long ${x.n}_pos = 0;`);
  x.setup.push(`  ${x.n}.setSpeed(10);                              // rpm; 28BYJ-48 tops out near 15`);
  x.outs.push(`  long ${x.n}_target = (long)(${x.lvlOf(x.c)} * 2048);`, `  if (${x.n}_pos != ${x.n}_target) { int s = ${x.n}_target > ${x.n}_pos ? 1 : -1; ${x.n}.step(s); ${x.n}_pos += s; }`);
};

// ═════════════════════════ presets ═════════════════════════
Object.assign(B.PRESETS, {
  home: {
    note: "PIR switches a lamp through a solid-state relay, a relay runs a fan when it's hot, the MQ-2 drives a NeoPixel gauge and a buzzer, the OLED shows it all.",
    comps: [["rail", "rail1", -8, 13], ["pir", "pir1", -12.5, -8], ["ssr", "ssr1", -14, -1.5, { src: "pir1" }], ["relay", "rly1", -14, 4.5, { src: "dht1", threshold: 0.56 }],
      ["mq2", "mq1", -22, -4, { divider: true }], ["neopixel", "px1", -22, 7, { src: "mq1", mode: "bar" }],
      ["oled", "oled1", 11, -7, { graph: "mq1" }], ["dht", "dht1", 11, 1], ["buzzer", "buz1", 11, 7, { src: "mq1", threshold: 0.6 }]],
    wires: [["rail1:+1", "esp:VIN"], ["rail1:-1", "esp:GND"],
      ["pir1:VCC", "rail1:+2"], ["pir1:GND", "rail1:-2"], ["pir1:OUT", "esp:27"],
      ["ssr1:DC+", "rail1:+3"], ["ssr1:DC-", "rail1:-3"], ["ssr1:CH1", "esp:26"],
      ["rly1:VCC", "rail1:+4"], ["rly1:GND", "rail1:-4"], ["rly1:IN", "esp:32"],
      ["mq1:VCC", "rail1:+5"], ["mq1:GND", "rail1:-5"], ["mq1:AO", "esp:34"],
      ["px1:VCC", "rail1:+6"], ["px1:GND", "rail1:-6"], ["px1:DIN", "esp:25"],
      ["oled1:GND", "esp:GND2"], ["oled1:VCC", "esp:3V3"], ["oled1:SCL", "esp:22"], ["oled1:SDA", "esp:21"],
      ["dht1:VCC", "esp:3V3"], ["dht1:DATA", "esp:4"], ["dht1:GND", "esp:GND2"],
      ["buz1:SIG", "esp:23"], ["buz1:GND", "esp:GND2"]],
    env: { motion: 1, gas: 900, airTemp: 29 },
  },
  seabed: {
    note: "Hover-vehicle seabed station: JSN-SR04T altimeter through a divider, a leak strip, an LCD behind a level shifter, a NeoPixel leak gauge and a stepper sampling arm.",
    comps: [["rail", "rail1", 9, 13], ["jsn", "jsn1", 11.5, -3.5], ["divider", "div1", 11, 4], ["shifter", "ls1", 9, -11], ["lcd", "lcd1", 2, -17.5],
      ["leak", "leak1", -11, -5], ["neopixel", "px1", -12, 5, { src: "leak1", mode: "bar" }], ["stepper", "stp1", -15, 13.5, { src: "jsn1", invert: true }]],
    wires: [["rail1:+1", "esp:VIN"], ["rail1:-1", "esp:GND2"],
      ["jsn1:VCC", "rail1:+2"], ["jsn1:GND", "rail1:-2"], ["jsn1:TRIG", "esp:19"], ["jsn1:ECHO", "div1:IN"], ["div1:OUT", "esp:18"], ["div1:GND", "rail1:-3"],
      ["ls1:LV", "esp:3V3"], ["ls1:HV", "rail1:+4"], ["ls1:GND", "rail1:-4"], ["ls1:LV1", "esp:21"], ["ls1:LV2", "esp:22"],
      ["lcd1:VCC", "rail1:+5"], ["lcd1:GND", "rail1:-5"], ["lcd1:SDA", "ls1:HV1"], ["lcd1:SCL", "ls1:HV2"],
      ["leak1:VCC", "esp:3V3"], ["leak1:GND", "esp:GND"], ["leak1:S", "esp:35"],
      ["px1:VCC", "esp:VIN"], ["px1:GND", "esp:GND"], ["px1:DIN", "esp:27"],
      ["stp1:IN1", "esp:32"], ["stp1:IN2", "esp:33"], ["stp1:IN3", "esp:25"], ["stp1:IN4", "esp:26"], ["stp1:VCC", "esp:VIN"], ["stp1:GND", "esp:GND"]],
    env: { distance: 80, water: 0 },
  },
});
})();
