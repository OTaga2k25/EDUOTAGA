/* ESP32 Prototype Bench: app (three.js r147, global THREE) */
(() => {
"use strict";
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// ═════════════════════════ ESP32 DevKit V1 (30-pin) ═════════════════════════
const U = 0.5;                                   // 0.1" header pitch in scene units
const ESP_LEFT  = ["EN", "36", "39", "34", "35", "32", "33", "25", "26", "27", "14", "12", "13", "GND", "VIN"];
const ESP_RIGHT = ["23", "22", "1", "3", "21", "19", "18", "5", "17", "16", "4", "2", "15", "GND2", "3V3"];
const INPUT_ONLY = new Set([34, 35, 36, 39]);
const STRAP = new Set([0, 2, 5, 12, 15]);
const ADC1 = { 36: 0, 39: 3, 32: 4, 33: 5, 34: 6, 35: 7 };
const ADC2 = { 4: 0, 0: 1, 2: 2, 15: 3, 13: 4, 12: 5, 14: 6, 27: 7, 25: 8, 26: 9 };

function espKind(n) {
  if (n === "GND" || n === "GND2") return "gnd";
  if (n === "3V3") return "3v3";
  if (n === "VIN") return "vin";
  if (n === "EN") return "en";
  return "gpio";
}
function espLabel(n) {
  return { "36": "VP", "39": "VN", "1": "TX0", "3": "RX0", "17": "TX2", "16": "RX2", GND2: "GND" }[n] || (/^\d+$/.test(n) ? "D" + n : n);
}
function gpioTags(g) {
  const t = [];
  if (g in ADC1) t.push(["ADC1_CH" + ADC1[g], "good"]);
  if (g in ADC2) t.push(["ADC2_CH" + ADC2[g] + " (off with Wi-Fi)", "careful"]);
  if (INPUT_ONLY.has(g)) t.push(["input only, no pull-up", "careful"]);
  if (STRAP.has(g)) t.push(["strapping pin", "careful"]);
  if (g === 1 || g === 3) t.push(["UART0 = USB serial", "bad"]);
  if (g === 21) t.push(["I²C SDA default", "good"]);
  if (g === 22) t.push(["I²C SCL default", "good"]);
  if (g === 25 || g === 26) t.push(["DAC" + (g - 24), ""]);
  if (g === 2) t.push(["on-board blue LED", ""]);
  if (!(g in ADC1) && !(g in ADC2)) t.push(["no ADC", ""]);
  return t;
}

// ═════════════════════════ part catalogue ═════════════════════════
// pin kinds: pwr gnd analog din(ESP drives) dout(part drives) io sda scl motor drvout vm stby bat+ bat-
const T = {
  pot:    { name: "Potentiometer", short: "pot", cat: "Sensors", blurb: "10 kΩ knob. Analog 0–3.3 V.", w: 3.6, d: 3, label: "POT 10K", titleX: -1.0, color: 0x1f4f9e,
            pins: [["VCC", "pwr", "Supply. Use 3V3 so OUT stays under 3.3 V"], ["OUT", "analog", "Wiper voltage: analog input"], ["GND", "gnd", "Ground"]],
            props: { value: 0.5 } },
  button: { name: "Push button", short: "btn", cat: "Sensors", blurb: "Momentary switch. Here: the leak detector.", w: 2.6, d: 2.6, label: "BUTTON", titleX: -0.7, color: 0x1f3a30,
            pins: [["SIG", "dout", "Reads LOW when pressed (INPUT_PULLUP)"], ["GND", "gnd", "Ground"]],
            props: { pressed: false, leak: true } },
  ldr:    { name: "Light sensor (LDR)", short: "ldr", cat: "Sensors", blurb: "Photoresistor divider. Analog out.", w: 3, d: 1.9, label: "LDR", color: 0x1f4f9e,
            pins: [["VCC", "pwr", "Supply, 3V3"], ["GND", "gnd", "Ground"], ["AO", "analog", "Analog light level"]] },
  mpu:    { name: "MPU6050 IMU", short: "mpu", cat: "Sensors", blurb: "Accel + gyro on I²C, address 0x68.", w: 3.2, d: 2.4, label: "MPU6050", titleX: -0.6, color: 0x1f4f9e, i2c: 0x68,
            pins: [["VCC", "pwr", "Module has a regulator: 3V3 or 5 V"], ["GND", "gnd", "Ground"], ["SCL", "scl", "I²C clock"], ["SDA", "sda", "I²C data"]] },
  bme:    { name: "BME280", short: "bme", cat: "Sensors", blurb: "Temperature, humidity, pressure. I²C 0x76.", w: 2.6, d: 2.2, label: "BME280", titleX: -0.4, color: 0x5a2d82, i2c: 0x76,
            pins: [["VCC", "pwr", "3V3"], ["GND", "gnd", "Ground"], ["SCL", "scl", "I²C clock"], ["SDA", "sda", "I²C data"]] },
  dht:    { name: "DHT22", short: "dht", cat: "Sensors", blurb: "Temperature + humidity. One read per 2 s.", w: 2.6, d: 3.4, color: 0x1f4f9e,
            pins: [["VCC", "pwr", "3.3–5 V"], ["DATA", "io", "Single-wire protocol, bidirectional"], ["GND", "gnd", "Ground"]] },
  ds18:   { name: "DS18B20 probe", short: "ds", cat: "Sensors", blurb: "Waterproof temperature probe, 1-Wire.", w: 2.4, d: 1.8, label: "DS18B20", titleX: -0.55, color: 0x2d6a4f,
            pins: [["VCC", "pwr", "3V3"], ["DATA", "io", "1-Wire bus. 4.7 kΩ pull-up is on this board"], ["GND", "gnd", "Ground"]] },
  sonar:  { name: "HC-SR04 ultrasonic", short: "sonar", cat: "Sensors", blurb: "Distance 2–400 cm. 5 V part.", w: 4.6, d: 2.6, label: "HC-SR04", color: 0x1f4f9e, needs5v: true,
            pins: [["VCC", "pwr", "Needs 5 V: use VIN"], ["TRIG", "din", "10 µs pulse from the ESP32"], ["ECHO", "dout", "Pulse back at VCC level: 5 V!"], ["GND", "gnd", "Ground"]],
            props: { divider: false } },
  turb:   { name: "Turbidity sensor", short: "turb", cat: "Sensors", blurb: "Water clarity, analog. 5 V part.", w: 2.6, d: 2.0, label: "TURBIDITY", color: 0x1b1b1b, needs5v: true, out5v: true,
            pins: [["VCC", "pwr", "Needs 5 V: use VIN"], ["GND", "gnd", "Ground"], ["AO", "analog", "0–4.5 V at 5 V supply"]],
            props: { divider: false } },
  led:    { name: "LED + 220 Ω", short: "led", cat: "Actuators", blurb: "Indicator or strobe. PWM brightness.", w: 2.0, d: 1.8, label: "LED", titleX: -0.45, color: 0x1b1b1b, act: true,
            pins: [["SIG", "din", "PWM from a GPIO (LEDC)"], ["GND", "gnd", "Ground"]],
            props: { color: "#ff4b3a", src: "manual", manual: 0.8, invert: false, blink: false } },
  buzzer: { name: "Active buzzer", short: "buz", cat: "Actuators", blurb: "Beeps when its pin is HIGH.", w: 2.2, d: 2.0, label: "BUZZER", titleX: -0.5, color: 0x1b1b1b, act: true,
            pins: [["SIG", "din", "HIGH = beep"], ["GND", "gnd", "Ground"]],
            props: { src: "manual", manual: 0, invert: false, threshold: 0.5 } },
  servo:  { name: "SG90 servo", short: "servo", cat: "Actuators", blurb: "0–180°, 50 Hz pulse. Drop-weight release.", w: 3.2, d: 3.4, board: false, act: true,
            pins: [["GND", "gnd", "Brown lead: ground"], ["VCC", "pwr", "Red lead: 4.8–6 V, use VIN"], ["SIG", "din", "Orange lead: 50 Hz PWM"]],
            props: { src: "manual", manual: 0.5, invert: false } },
  motor:  { name: "DC motor + propeller", short: "thr", cat: "Actuators", blurb: "The thruster. Needs a driver.", w: 5, d: 3, board: false, act: true,
            pins: [["M+", "motor", "Motor lead"], ["M-", "motor", "Motor lead"]],
            props: { src: "manual", manual: 0.6, invert: false, reverse: false, blob: false } },
  driver: { name: "TB6612FNG driver", short: "drv", cat: "Power & drivers", blurb: "H-bridge: ESP32 signals in, motor amps out.", w: 5, d: 2.4, label: "TB6612FNG", titleX: -0.9, color: 0xb0261c,
            pins: [["VM", "vm", "Motor supply: battery +"], ["VCC", "pwr", "Logic supply: 3V3"], ["GND", "gnd", "Common ground"], ["AO1", "drvout", "Motor output"],
                   ["AO2", "drvout", "Motor output"], ["PWMA", "din", "Speed PWM (20 kHz)"], ["AIN1", "din", "Direction"], ["AIN2", "din", "Direction"], ["STBY", "stby", "HIGH = enabled. Tie to 3V3"]] },
  battery:{ name: "Battery pack 4×AA", short: "bat", cat: "Power & drivers", blurb: "6 V for motors. Share its ground.", w: 4.6, d: 4, board: false,
            pins: [["BAT+", "bat+", "6 V: motor power only"], ["BAT-", "bat-", "Must join ESP32 GND"]] },
};
const CATS = ["Sensors", "Actuators", "Power & drivers"];
const WIRE_COLORS = { red: "#d8342c", black: "#262626", blue: "#2f6fd6", yellow: "#e9c21c", green: "#2fa34f", orange: "#ef7d22", white: "#e9e9e9", purple: "#8a4fd1", brown: "#8b5a2b" };
const SIGNAL_CYCLE = ["green", "orange", "white", "purple", "brown", "blue", "yellow"];

// ═════════════════════════ state ═════════════════════════
const state = { comps: [], wires: [], wifi: true, running: false, sel: null, pending: null, showChecks: true,
  env: { light: 55, tilt: 0, airTemp: 24, humidity: 48, waterTemp: 6, distance: 60, turbidity: 350 } };
let issues = [], compSev = new Map(), nets = null;
let simT = 0, serialAcc = 0, serialLines = [], serialPaused = false, brownoutUntil = 0, brownoutAcc = 0;
const readings = new Map(), outputs = new Map();

const byId = id => state.comps.find(c => c.id === id);
const nameOf = c => c.name;
function pinMeta(key) {
  const [id, pin] = key.split(":");
  const c = byId(id);
  if (!c) return null;
  if (c.type === "esp32") return { c, pin, kind: espKind(pin), gpio: /^\d+$/.test(pin) ? +pin : null, desc: "" };
  const def = T[c.type].pins.find(p => p[0] === pin);
  return def ? { c, pin, kind: def[1], desc: def[2], gpio: null } : null;
}
function pinTitle(key) {
  const m = pinMeta(key);
  if (!m) return key;
  if (m.c.type === "esp32") return m.gpio != null ? "GPIO " + m.gpio : espLabel(m.pin);
  return m.c.name + " " + m.pin;
}

// ═════════════════════════ three.js scene ═════════════════════════
const canvas = $("#view");
const stage = $("#stage");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 400);
const controls = new THREE.OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.12;
controls.maxPolarAngle = 1.42;
controls.minDistance = 6;
controls.maxDistance = 80;
controls.enableZoom = false;                     // wheel handled below
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

// Trackpad: pinch (ctrlKey wheel) zooms, two-finger drag pans. Mouse wheel zooms.
const _off = new THREE.Vector3(), _right = new THREE.Vector3(), _fwd = new THREE.Vector3();
function dolly(delta) {
  _off.copy(camera.position).sub(controls.target);
  const d = clamp(_off.length() * Math.exp(delta), controls.minDistance, controls.maxDistance);
  camera.position.copy(controls.target).add(_off.setLength(d));
}
function panBy(dx, dy) {
  const k = camera.position.distanceTo(controls.target) * 0.0014;
  camera.getWorldDirection(_fwd); _fwd.y = 0;
  if (_fwd.lengthSq() < 1e-6) _fwd.set(0, 0, -1).applyQuaternion(camera.quaternion).setY(0);
  _fwd.normalize();
  _right.set(-_fwd.z, 0, _fwd.x);
  const move = _right.multiplyScalar(dx * k).addScaledVector(_fwd, -dy * k);
  camera.position.add(move);
  controls.target.add(move);
  controls.target.x = clamp(controls.target.x, -MAT_W / 2, MAT_W / 2);
  controls.target.z = clamp(controls.target.z, -MAT_D / 2, MAT_D / 2);
}
function isMouseWheel(ev) {
  if (ev.deltaMode !== 0) return true;                         // line/page units: a wheel
  return ev.deltaX === 0 && Math.abs(ev.deltaY) >= 50 && Number.isInteger(ev.deltaY);
}
canvas.addEventListener("wheel", ev => {
  ev.preventDefault();
  if (ev.ctrlKey) dolly(ev.deltaY * 0.012);                    // pinch
  else if (isMouseWheel(ev)) dolly(Math.sign(ev.deltaY) * Math.min(Math.abs(ev.deltaY), 150) * 0.0015);
  else panBy(ev.deltaX, ev.deltaY);                            // two-finger drag
}, { passive: false });
const MAXANISO = renderer.capabilities.getMaxAnisotropy();

function resetView(top) {
  if (top) { camera.position.set(0, 46, 0.01); controls.target.set(0, 0, 0); }
  else { camera.position.set(-5, 40, 38); controls.target.set(-5.5, 0, 3); }
  controls.update();
}

scene.add(new THREE.HemisphereLight(0xf4f7ff, 0x3a4a42, 0.75));
const sun = new THREE.DirectionalLight(0xffffff, 0.85);
sun.position.set(-14, 30, 16);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -34, right: 34, top: 26, bottom: -26, near: 1, far: 90 });
sun.shadow.bias = -0.0006;
scene.add(sun);
const fill = new THREE.DirectionalLight(0xcfe3ff, 0.25);
fill.position.set(18, 12, -10);
scene.add(fill);

// cutting mat: 30 × 22 cm with a centimetre grid (1 cm = 1.9685 units)
const MAT_W = 60, MAT_D = 44, CM = 1 / 0.508;
{
  const S = 34, c = document.createElement("canvas");
  c.width = MAT_W * S; c.height = MAT_D * S;
  const g = c.getContext("2d");
  g.fillStyle = "#26483d"; g.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i * CM <= MAT_W; i++) {
    const x = i * CM * S;
    g.strokeStyle = i % 5 ? "rgba(214,236,226,.16)" : "rgba(214,236,226,.34)";
    g.lineWidth = i % 5 ? 1.5 : 2.5;
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x, c.height); g.stroke();
    if (i % 5 === 0 && i) { g.fillStyle = "rgba(230,244,236,.55)"; g.font = "600 22px monospace"; g.fillText(i, x + 5, 26); }
  }
  for (let j = 0; j * CM <= MAT_D; j++) {
    const y = j * CM * S;
    g.strokeStyle = j % 5 ? "rgba(214,236,226,.16)" : "rgba(214,236,226,.34)";
    g.lineWidth = j % 5 ? 1.5 : 2.5;
    g.beginPath(); g.moveTo(0, y); g.lineTo(c.width, y); g.stroke();
    if (j % 5 === 0 && j) { g.fillStyle = "rgba(230,244,236,.55)"; g.font = "600 22px monospace"; g.fillText(j, 6, y - 6); }
  }
  g.strokeStyle = "rgba(214,236,226,.22)"; g.lineWidth = 2;
  for (let k = -c.height; k < c.width; k += 15 * CM * S) { g.beginPath(); g.moveTo(k, c.height); g.lineTo(k + c.height, 0); g.stroke(); }
  g.fillStyle = "rgba(230,244,236,.5)"; g.font = "600 26px monospace";
  g.fillText("SELF-HEALING CUTTING MAT · cm", c.width - 480, c.height - 20);
  const tex = new THREE.CanvasTexture(c);
  tex.encoding = THREE.sRGBEncoding; tex.anisotropy = MAXANISO;
  const mat = new THREE.Mesh(new THREE.BoxGeometry(MAT_W, 0.12, MAT_D),
    [0, 0, 0, 0, 0, 0].map((_, i) => new THREE.MeshStandardMaterial(i === 2 ? { map: tex, roughness: 0.95 } : { color: 0x1d3831, roughness: 0.9 })));
  mat.position.y = -0.06; mat.receiveShadow = true;
  scene.add(mat);
  const table = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0x8a8f8c, roughness: 1 }));
  table.rotation.x = -Math.PI / 2; table.position.y = -0.125; table.receiveShadow = true;
  scene.add(table);
  scene.userData.table = table;
}
const benchPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

function applyTheme() {
  const cs = getComputedStyle(document.documentElement);
  const bg = cs.getPropertyValue("--scene").trim() || "#D9E0DC";
  const col = new THREE.Color(bg);
  scene.background = col;
  scene.fog = new THREE.Fog(col, 70, 160);
  scene.userData.table.material.color = col.clone().multiplyScalar(0.92);
}
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);
new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

// ─── mesh helpers ───
function std(color, o = {}) { return new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.55, metalness: 0 }, o)); }
const M = {
  gold: std(0xd9b04f, { metalness: 0.85, roughness: 0.3 }),
  header: std(0x151515, { roughness: 0.7 }),
  metal: std(0xc9ced2, { metalness: 0.8, roughness: 0.32 }),
  dark: std(0x1c1c1c, { roughness: 0.6 }),
  white: std(0xf1f1ee, { roughness: 0.7 }),
  hit: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
};
function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  return m;
}
const boxM = (w, h, d, mat, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z);
const cylM = (r1, r2, h, mat, x, y, z, seg = 28) => mesh(new THREE.CylinderGeometry(r1, r2, h, seg), mat, x, y, z);
const hex6 = n => "#" + n.toString(16).padStart(6, "0");

function canvasTex(w, d, bg, draw, S = 72) {
  const c = document.createElement("canvas");
  c.width = Math.max(8, Math.round(w * S)); c.height = Math.max(8, Math.round(d * S));
  const g = c.getContext("2d");
  g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height);
  const X = x => (x + w / 2) * S, Z = z => (z + d / 2) * S;
  if (draw) draw(g, S, X, Z);
  const t = new THREE.CanvasTexture(c);
  t.encoding = THREE.sRGBEncoding; t.anisotropy = MAXANISO;
  return t;
}
function topBox(w, h, d, color, draw, x = 0, y = 0, z = 0) {
  const side = std(new THREE.Color(color).multiplyScalar(0.75));
  const top = new THREE.MeshStandardMaterial({ map: canvasTex(w, d, hex6(color), draw), roughness: 0.5 });
  return mesh(new THREE.BoxGeometry(w, h, d), [side, side, top, side, side, side], x, y, z);
}
function silk(g, S, text, x, y, size, align = "center", color = "rgba(255,255,255,.92)", weight = 600, rot = 0) {
  g.save();
  g.translate(x, y); g.rotate(rot);
  g.fillStyle = color; g.textAlign = align; g.textBaseline = "middle";
  g.font = `${weight} ${size * S}px "IBM Plex Mono", monospace`;
  g.fillText(text, 0, 0);
  g.restore();
}
function spriteTex(draw, size = 128) {
  const c = document.createElement("canvas"); c.width = c.height = size;
  draw(c.getContext("2d"), size);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
  return t;
}
const GLOW_TEX = spriteTex((g, s) => {
  const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(255,255,255,.55)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
});
function badgeTex(color) {
  return spriteTex((g, s) => {
    g.fillStyle = color; g.beginPath(); g.arc(s / 2, s / 2, s * 0.42, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#fff"; g.lineWidth = s * 0.06; g.stroke();
    g.fillStyle = "#fff"; g.font = `700 ${s * 0.58}px sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText("!", s / 2, s / 2 + s * 0.03);
  });
}
const BADGE = { error: badgeTex("#d0392b"), warn: badgeTex("#c98f0a") };

// ─── pin rows ───
function addPin(c, g, name, kind, desc, x, z, y0) {
  const pin = boxM(0.1, 0.8, 0.1, M.gold, x, y0 + 0.4, z);
  const hit = mesh(new THREE.BoxGeometry(0.4, 0.62, 0.4), M.hit, x, y0 + 0.62, z);
  hit.castShadow = hit.receiveShadow = false;
  hit.userData.pinKey = c.id + ":" + name;
  pin.userData.pinKey = c.id + ":" + name;
  pin.material = M.gold.clone();
  g.add(pin, hit);
  c.pins[name] = { pin, hit, kind, desc };
}
function addPinRow(c, g, pins, cx, cz, y0) {
  const n = pins.length;
  g.add(boxM(n * U, 0.25, 0.5, M.header, cx, y0 + 0.125, cz));
  pins.forEach(([name, kind, desc], i) => addPin(c, g, name, kind, desc, cx + (i - (n - 1) / 2) * U, cz, y0 + 0.25));
}

function moduleDraw(c, t) {
  return (g, S, X, Z) => {
    const w = t.w, d = t.d;
    g.strokeStyle = "rgba(255,255,255,.45)"; g.lineWidth = S * 0.03;
    g.strokeRect(S * 0.12, S * 0.12, w * S - S * 0.24, d * S - S * 0.24);
    if (w >= 2.4 && d >= 2.2) {
      for (const [hx, hz] of [[-w / 2 + 0.38, -d / 2 + 0.38], [w / 2 - 0.38, -d / 2 + 0.38]]) {
        g.fillStyle = "#c9a54a"; g.beginPath(); g.arc(X(hx), Z(hz), S * 0.2, 0, 7); g.fill();
        g.fillStyle = "#0c0c0c"; g.beginPath(); g.arc(X(hx), Z(hz), S * 0.12, 0, 7); g.fill();
      }
    }
    const n = t.pins.length;
    const rotate = t.pins.some(p => p[0].length > 3) && n > 4;
    t.pins.forEach(([nm], i) => {
      const x = (i - (n - 1) / 2) * U;
      if (rotate) silk(g, S, nm, X(x), Z(d / 2 - 0.9), 0.2, "center", undefined, 600, -Math.PI / 2);
      else silk(g, S, nm, X(x), Z(d / 2 - 0.78), 0.2);
    });
    const ty = t.titleZ != null ? t.titleZ : -d / 2 + 0.5;
    silk(g, S, (t.label || t.name).toUpperCase(), X(t.titleX || 0), Z(ty), Math.min(0.26, (w - 0.5) / ((t.label || t.name).length * 0.62)));
    silk(g, S, c.name, X(t.titleX || 0), Z(ty + 0.34), 0.2, "center", "rgba(255,210,150,.95)");
  };
}

// ═════════════════════════ part builders ═════════════════════════
const BUILD = {
  esp32(c, g) {
    const W = 6.4, D = 11.4, X0 = 2.8;
    g.add(topBox(W, 0.16, D, 0x14191c, (gx, S, X, Z) => {
      gx.strokeStyle = "rgba(255,255,255,.3)"; gx.lineWidth = S * 0.03; gx.strokeRect(S * .1, S * .1, W * S - S * .2, D * S - S * .2);
      ESP_LEFT.forEach((n, i) => silk(gx, S, espLabel(n), X(-X0 + 0.42), Z(-3.5 + i * U), 0.21, "left"));
      ESP_RIGHT.forEach((n, i) => silk(gx, S, espLabel(n), X(X0 - 0.42), Z(-3.5 + i * U), 0.21, "right"));
      silk(gx, S, "ESP32 DEVKIT V1", X(0), Z(0.55), 0.3);
      silk(gx, S, c.name + " · 30 PIN", X(0), Z(0.95), 0.18, "center", "rgba(255,210,150,.9)");
      silk(gx, S, "EN", X(-1.9), Z(5.25), 0.18); silk(gx, S, "BOOT", X(1.9), Z(5.25), 0.18);
      gx.strokeStyle = "rgba(201,165,74,.55)"; gx.lineWidth = S * 0.04;
      for (let i = 0; i < 5; i++) { gx.beginPath(); gx.moveTo(X(-1.2 + i * 0.6), Z(1.6)); gx.lineTo(X(-1.2 + i * 0.6), Z(2.3)); gx.lineTo(X(-0.4 + i * 0.2), Z(2.6)); gx.stroke(); }
    }, 0, 0.08, 0));
    // WROOM module: antenna + shield
    g.add(topBox(3.6, 0.1, 5.3, 0x1c2b3c, (gx, S, X, Z) => {
      gx.strokeStyle = "#c9a54a"; gx.lineWidth = S * 0.06; gx.beginPath();
      let x = -1.4; gx.moveTo(X(x), Z(-2.35));
      for (let k = 0; k < 7; k++) { gx.lineTo(X(x), Z(-1.75)); x += 0.2; gx.lineTo(X(x), Z(-1.75)); gx.lineTo(X(x), Z(-2.35)); x += 0.2; gx.lineTo(X(x), Z(-2.35)); }
      gx.stroke();
    }, 0, 0.21, -2.95));
    g.add(topBox(3.3, 0.36, 4.0, 0xbfc4c8, (gx, S, X, Z) => {
      silk(gx, S, "ESP-WROOM-32", X(0), Z(-0.9), 0.3, "center", "#2b2f33", 700);
      silk(gx, S, "Wi-Fi · BT · BLE", X(0), Z(-0.45), 0.2, "center", "#3d4247", 500);
      silk(gx, S, "240 MHz dual core", X(0), Z(0.2), 0.18, "center", "#4c5257", 500);
      silk(gx, S, "4 MB flash", X(0), Z(0.55), 0.18, "center", "#4c5257", 500);
    }, 0, 0.44, -2.3));
    g.children[g.children.length - 1].material.forEach(m => { m.metalness = 0.6; m.roughness = 0.35; });
    g.add(boxM(1.5, 0.55, 1.0, M.metal, 0, 0.44, 5.45));                       // micro-USB
    g.add(boxM(1.1, 0.18, 1.1, M.dark, 0, 0.25, 1.6), boxM(0.9, 0.3, 0.6, M.dark, 0, 0.31, 3.05)); // CP2102 + AMS1117
    for (const x of [-1.9, 1.9]) { g.add(boxM(0.62, 0.3, 0.62, M.metal, x, 0.31, 4.7), cylM(0.18, 0.18, 0.18, M.dark, x, 0.55, 4.7)); }
    c.anim.pwrLed = boxM(0.26, 0.12, 0.18, std(0x551010, { emissive: 0xff2a1a, emissiveIntensity: 0 }), -0.9, 0.22, 4.05);
    c.anim.gpioLed = boxM(0.26, 0.12, 0.18, std(0x0e1f55, { emissive: 0x3d7bff, emissiveIntensity: 0 }), 0.9, 0.22, 4.05);
    g.add(c.anim.pwrLed, c.anim.gpioLed);
    for (const [side, list] of [[-1, ESP_LEFT], [1, ESP_RIGHT]]) {
      g.add(boxM(0.5, 0.25, list.length * U, M.header, side * X0, 0.285, 0));
      list.forEach((n, i) => addPin(c, g, n, espKind(n), "", side * X0, -3.5 + i * U, 0.41));
    }
  },
  pot(c, g, t) {
    const k = new THREE.Group(); k.position.set(0.8, 0.66, -0.35);
    k.add(cylM(0.78, 0.78, 0.7, std(0x2b2b2b, { roughness: 0.45 }), 0, 0.35, 0, 36));
    k.add(boxM(0.12, 0.04, 0.6, M.white, 0, 0.72, -0.3));
    g.add(boxM(1.7, 0.5, 1.7, M.metal, 0.8, 0.41, -0.35), k);
    c.anim.knob = k;
  },
  button(c, g) {
    g.add(boxM(1.25, 0.35, 1.25, M.metal, 0.55, 0.335, -0.35));
    const cap = cylM(0.4, 0.4, 0.34, std(0xd0342a, { roughness: 0.4 }), 0.55, 0.68, -0.35);
    cap.userData.press = c.id;
    g.add(cap); c.anim.cap = cap;
  },
  ldr(c, g) {
    g.add(cylM(0.36, 0.36, 0.12, std(0xd98a3a, { roughness: 0.4 }), 1.0, 0.62, -0.3));
    g.add(boxM(0.04, 0.4, 0.04, M.metal, 0.9, 0.38, -0.3), boxM(0.04, 0.4, 0.04, M.metal, 1.1, 0.38, -0.3));
    g.add(boxM(0.6, 0.35, 0.6, std(0x2956b8), -1.0, 0.33, -0.3), cylM(0.15, 0.15, 0.1, M.white, -1.0, 0.55, -0.3));
  },
  mpu(c, g) {
    const chip = boxM(0.8, 0.14, 0.8, M.dark, 0.95, 0.23, -0.35); chip.rotation.y = Math.PI / 4; g.add(chip);
  },
  bme(c, g) { g.add(boxM(0.55, 0.22, 0.55, M.metal, 0.75, 0.27, -0.3)); },
  dht(c, g) {
    g.add(topBox(2.0, 0.95, 2.3, 0xf2f1ec, (gx, S, X, Z) => {
      gx.fillStyle = "#b9bcb6";
      for (let r = 0; r < 4; r++) for (let q = 0; q < 4; q++) gx.fillRect(X(-0.75 + q * 0.4), Z(-0.95 + r * 0.36), S * 0.26, S * 0.2);
      silk(gx, S, "DHT22", X(0), Z(0.62), 0.26, "center", "#2b3a33", 700);
      silk(gx, S, c.name, X(0), Z(0.92), 0.2, "center", "#b45f1e");
    }, 0, 0.64, -0.35));
  },
  ds18(c, g) {
    g.add(boxM(1.0, 0.6, 0.65, std(0x2a6fc0), 0.6, 0.46, -0.35));
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0.6, 0.5, -0.65), new THREE.Vector3(0.5, 0.3, -1.6), new THREE.Vector3(-0.2, 0.2, -3.0), new THREE.Vector3(-0.8, 0.28, -4.2)]);
    g.add(mesh(new THREE.TubeGeometry(curve, 30, 0.12, 8), std(0x1b1b1b)));
    const probe = cylM(0.26, 0.26, 2.0, std(0xc0c6ca, { metalness: 0.85, roughness: 0.25 }), -1.05, 0.28, -5.1);
    probe.rotation.x = Math.PI / 2; probe.rotation.z = 0.25; g.add(probe);
  },
  sonar(c, g) {
    for (const x of [-1.4, 1.4]) {
      g.add(cylM(0.78, 0.78, 0.9, M.metal, x, 0.61, -0.25, 36));
      g.add(cylM(0.64, 0.64, 0.04, std(0x2d2d2d, { roughness: 0.9 }), x, 1.07, -0.25, 36));
    }
  },
  turb(c, g) {
    g.add(cylM(0.55, 0.55, 2.4, std(0x9aa3a8, { roughness: 0.35 }), 2.1, 1.2, -0.2, 32));
    g.add(cylM(0.57, 0.57, 0.3, std(0x33393c), 2.1, 0.5, -0.2, 32));
  },
  led(c, g) {
    const m = std(new THREE.Color(c.props.color).multiplyScalar(0.55), { emissive: new THREE.Color(c.props.color), emissiveIntensity: 0.05, transparent: true, opacity: 0.92, roughness: 0.2 });
    g.add(mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.45, 24), m, 0.5, 0.4, -0.3));
    g.add(mesh(new THREE.SphereGeometry(0.28, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), m, 0.5, 0.62, -0.3));
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW_TEX, color: c.props.color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.position.set(0.5, 0.7, -0.3); glow.scale.set(3, 3, 3);
    g.add(glow);
    c.anim.ledMat = m; c.anim.glow = glow;
  },
  buzzer(c, g) {
    g.add(cylM(0.55, 0.55, 0.8, std(0x161616, { roughness: 0.5 }), 0.5, 0.56, -0.3, 32));
    g.add(cylM(0.12, 0.12, 0.02, M.white, 0.5, 0.97, -0.3));
    const ring = mesh(new THREE.TorusGeometry(0.8, 0.05, 8, 40), new THREE.MeshBasicMaterial({ color: 0xffb35a, transparent: true, opacity: 0 }), 0.5, 1.0, -0.3);
    ring.rotation.x = Math.PI / 2; ring.castShadow = false;
    g.add(ring); c.anim.ring = ring;
  },
  servo(c, g) {
    const blue = std(0x2a5db0, { transparent: true, opacity: 0.9, roughness: 0.35 });
    g.add(boxM(2.3, 2.2, 1.2, blue, 0, 1.1, -0.7));
    g.add(boxM(3.2, 0.15, 1.2, blue, 0, 1.6, -0.7));
    g.add(cylM(0.5, 0.5, 0.25, blue, -0.55, 2.32, -0.7));
    const horn = new THREE.Group(); horn.position.set(-0.55, 2.5, -0.7);
    horn.add(cylM(0.28, 0.28, 0.18, M.white, 0, 0, 0));
    horn.add(boxM(1.9, 0.12, 0.34, M.white, 0.7, 0, 0));
    g.add(horn); c.anim.horn = horn;
    [0x7a4a25, 0xd43a2a, 0xef8b22].forEach((col, i) => {
      const x = -0.14 + i * 0.14;
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0.9, 0.5, -0.1), new THREE.Vector3(0.6 + x, 0.25, 0.5), new THREE.Vector3((i - 1) * U, 0.3, 1.1)]);
      g.add(mesh(new THREE.TubeGeometry(curve, 20, 0.05, 6), std(col)));
    });
    addPinRow(c, g, T.servo.pins, 0, 1.3, 0);
    g.add(topBox(1.6, 0.02, 0.5, 0x151515, (gx, S, X, Z) => T.servo.pins.forEach(([n], i) => silk(gx, S, n, X((i - 1) * U), Z(0), 0.14)), 0, 0.26, 1.72));
  },
  motor(c, g) {
    const body = new THREE.Group(); body.position.set(-0.4, 0, -0.5);
    const can = cylM(0.95, 0.95, 2.6, std(0xbfc5ca, { metalness: 0.75, roughness: 0.3 }), 0, 1.05, 0, 36);
    can.rotation.z = Math.PI / 2; body.add(can);
    const cap = cylM(0.95, 0.95, 0.4, std(0x1f1f1f), -1.5, 1.05, 0, 36); cap.rotation.z = Math.PI / 2; body.add(cap);
    const shaft = cylM(0.08, 0.08, 1.0, M.metal, 1.75, 1.05, 0); shaft.rotation.z = Math.PI / 2; body.add(shaft);
    for (const x of [-0.8, 0.8]) body.add(boxM(0.5, 0.35, 1.7, M.dark, x, 0.17, 0));
    const prop = new THREE.Group(); prop.position.set(2.2, 1.05, 0);
    const orange = std(0xff7a21, { roughness: 0.45 });
    const hub = cylM(0.25, 0.25, 0.4, orange, 0, 0, 0); hub.rotation.z = Math.PI / 2; prop.add(hub);
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Group(); b.rotation.x = (i * Math.PI * 2) / 3;
      const blade = boxM(0.08, 1.15, 0.5, orange, 0, 0.72, 0); blade.rotation.y = 0.35;
      b.add(blade);
      if (i === 0) { const blob = mesh(new THREE.SphereGeometry(0.2, 14, 10), std(0x6fb4e6, { roughness: 0.8 }), 0.05, 1.1, 0); b.add(blob); c.anim.blob = blob; }
      prop.add(b);
    }
    body.add(prop);
    g.add(body);
    c.anim.prop = prop; c.anim.body = body;
    for (const [col, dx] of [[0xd43a2a, -0.25], [0x222222, 0.25]]) {
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-2.0, 1.05, -0.5 + dx), new THREE.Vector3(-2.4, 0.5, 0.2), new THREE.Vector3(-1.6 + dx * 2, 0.3, 1.0)]);
      g.add(mesh(new THREE.TubeGeometry(curve, 20, 0.06, 6), std(col)));
    }
    g.add(boxM(1.3, 0.25, 0.7, M.header, -1.6, 0.125, 1.3));
    T.motor.pins.forEach(([n, k, d], i) => addPin(c, g, n, k, d, -1.6 + (i - 0.5) * U, 1.3, 0.25));
    g.add(topBox(1.3, 0.02, 0.45, 0x151515, (gx, S, X, Z) => T.motor.pins.forEach(([n], i) => silk(gx, S, n, X((i - 0.5) * U), Z(0), 0.16)), -1.6, 0.26, 1.78));
    g.add(topBox(2.2, 0.02, 0.5, 0x26483d, (gx, S, X, Z) => silk(gx, S, c.name + " · THRUSTER", X(0), Z(0), 0.2, "center", "rgba(255,210,150,.95)"), 0.6, 0.01, 1.3));
  },
  driver(c, g) { g.add(boxM(1.3, 0.2, 0.8, M.dark, 1.5, 0.26, -0.5)); },
  battery(c, g) {
    g.add(boxM(4.4, 0.7, 3.0, std(0x1b1b1b, { roughness: 0.7 }), 0, 0.35, -0.4));
    [-1.5, -0.5, 0.5, 1.5].forEach((x, i) => {
      const cell = cylM(0.34, 0.34, 2.5, std(i % 2 ? 0x2e3a8c : 0x1f1f1f, { roughness: 0.4 }), x, 0.72, -0.4, 24);
      cell.rotation.x = Math.PI / 2; g.add(cell);
      const tip = cylM(0.12, 0.12, 0.12, M.metal, x, 0.72, i % 2 ? 0.92 : -1.72); tip.rotation.x = Math.PI / 2; g.add(tip);
    });
    for (const [col, dx] of [[0xd43a2a, -0.25], [0x222222, 0.25]]) {
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(1.9 + dx, 0.6, 1.1), new THREE.Vector3(1.5 + dx, 0.3, 1.6), new THREE.Vector3(dx, 0.3, 1.9)]);
      g.add(mesh(new THREE.TubeGeometry(curve, 16, 0.06, 6), std(col)));
    }
    g.add(boxM(1.3, 0.25, 0.7, M.header, 0, 0.125, 1.9));
    T.battery.pins.forEach(([n, k, d], i) => addPin(c, g, n, k, d, (i - 0.5) * U, 1.9, 0.25));
    g.add(topBox(1.4, 0.02, 0.45, 0x151515, (gx, S, X, Z) => T.battery.pins.forEach(([n], i) => silk(gx, S, n, X((i - 0.5) * U), Z(0), 0.13)), 0, 0.26, 2.38));
    g.add(topBox(3.0, 0.02, 0.6, 0x1b1b1b, (gx, S, X, Z) => silk(gx, S, "4×AA · 6 V · " + c.name, X(0), Z(0), 0.2, "center", "rgba(255,210,150,.95)"), 0, 0.71, 0.75));
  },
};

function buildComp(c) {
  const g = new THREE.Group();
  c.pins = {}; c.anim = {};
  const t = T[c.type];
  if (c.type === "esp32") BUILD.esp32(c, g);
  else {
    if (t.board !== false) {
      g.add(topBox(t.w, 0.16, t.d, t.color, moduleDraw(c, t), 0, 0.08, 0));
      addPinRow(c, g, t.pins, 0, t.d / 2 - 0.35, 0.16);
    }
    BUILD[c.type] && BUILD[c.type](c, g, t);
  }
  g.traverse(o => { if (o.isMesh && !o.userData.pinKey) o.userData.compId = c.id; if (o.userData.press) o.userData.compId = c.id; });
  const badge = new THREE.Sprite(new THREE.SpriteMaterial({ map: BADGE.error, depthTest: false, transparent: true }));
  badge.scale.set(1.1, 1.1, 1.1); badge.visible = false; badge.renderOrder = 10;
  g.add(badge); c.anim.badge = badge;
  const bb = new THREE.Box3().setFromObject(g);
  badge.position.set(0, bb.max.y + 0.9, 0);
  g.position.set(c.x, 0, c.z);
  g.rotation.y = (c.rot || 0) * Math.PI / 2;
  c.group = g;
  scene.add(g);
}
function destroyComp(c) {
  scene.remove(c.group);
  c.group.traverse(o => { if (o.geometry) o.geometry.dispose(); });
}

// ═════════════════════════ wires ═════════════════════════
const tmpV = new THREE.Vector3();
function pinTop(key) {
  const [id, pin] = key.split(":");
  const c = byId(id);
  if (!c || !c.pins[pin]) return null;
  c.pins[pin].pin.getWorldPosition(tmpV);
  return tmpV.clone().setY(tmpV.y + 0.4);
}
function wireColorFor(a, b) {
  const ka = pinMeta(a).kind, kb = pinMeta(b).kind;
  const ks = [ka, kb];
  if (ks.some(k => ["pwr", "3v3", "vin", "vm", "bat+"].includes(k))) return "red";
  if (ks.some(k => ["gnd", "bat-"].includes(k))) return "black";
  if (ks.includes("sda")) return "blue";
  if (ks.includes("scl")) return "yellow";
  const used = state.wires.length;
  return SIGNAL_CYCLE[used % SIGNAL_CYCLE.length];
}
function buildWire(w) {
  if (w.group) { scene.remove(w.group); w.group.traverse(o => o.geometry && o.geometry.dispose()); }
  const a = pinTop(w.a), b = pinTop(w.b);
  if (!a || !b) return;
  const g = new THREE.Group();
  const col = new THREE.Color(WIRE_COLORS[w.color] || w.color);
  const mat = std(col, { roughness: 0.5 });
  const dist = a.distanceTo(b);
  const lift = 0.9 + Math.min(dist * 0.14, 3.2);
  const a1 = a.clone().setY(a.y + 0.28), b1 = b.clone().setY(b.y + 0.28);
  const mid = a1.clone().lerp(b1, 0.5); mid.y += lift;
  const curve = new THREE.CatmullRomCurve3([a1, a1.clone().setY(a1.y + lift * 0.55).lerp(mid, 0.15), mid, b1.clone().setY(b1.y + lift * 0.55).lerp(mid, 0.15), b1], false, "centripetal");
  const tube = mesh(new THREE.TubeGeometry(curve, Math.max(24, Math.round(dist * 3)), 0.07, 8), mat);
  tube.userData.wireId = w.id;
  g.add(tube);
  for (const p of [a, b]) {
    const h = boxM(0.24, 0.55, 0.24, std(0x121212, { roughness: 0.6 }), p.x, p.y - 0.02, p.z);
    h.userData.wireId = w.id;
    g.add(h);
  }
  w.group = g; w.mat = mat;
  scene.add(g);
  if (state.sel && state.sel.kind === "wire" && state.sel.id === w.id) mat.emissive = col.clone().multiplyScalar(0.45);
}
function rebuildWiresFor(compId) { state.wires.forEach(w => { if (w.a.startsWith(compId + ":") || w.b.startsWith(compId + ":")) buildWire(w); }); }

// ═════════════════════════ nets + checks ═════════════════════════
function computeNets() {
  const parent = new Map();
  const find = k => { while (parent.get(k) !== k) { parent.set(k, parent.get(parent.get(k))); k = parent.get(k); } return k; };
  const add = k => { if (!parent.has(k)) parent.set(k, k); };
  state.comps.forEach(c => Object.keys(c.pins).forEach(p => add(c.id + ":" + p)));
  state.wires.forEach(w => { add(w.a); add(w.b); const ra = find(w.a), rb = find(w.b); if (ra !== rb) parent.set(ra, rb); });
  const members = new Map();
  for (const k of parent.keys()) { const r = find(k); if (!members.has(r)) members.set(r, []); members.get(r).push(k); }
  const info = new Map();
  for (const [r, keys] of members) {
    const metas = keys.map(pinMeta).filter(Boolean);
    const esp = metas.filter(m => m.c.type === "esp32");
    info.set(r, {
      keys, metas,
      gpios: esp.filter(m => m.gpio != null).map(m => m.gpio),
      has3v3: esp.some(m => m.kind === "3v3"),
      hasVin: esp.some(m => m.kind === "vin"),
      hasGnd: esp.some(m => m.kind === "gnd"),
      hasEn: esp.some(m => m.kind === "en"),
      hasBatP: metas.some(m => m.kind === "bat+"),
      hasBatN: metas.some(m => m.kind === "bat-"),
      kinds: metas.filter(m => m.c.type !== "esp32").map(m => m.kind),
    });
  }
  return { find, info, of: k => info.get(find(k)) };
}

function validate() {
  nets = computeNets();
  const out = [];
  const add = (sev, c, what, fix) => out.push({ sev, id: c ? c.id : null, what, fix });
  const wifi = state.wifi;
  const i2cBus = new Map();

  // net-level shorts
  for (const n of nets.info.values()) {
    const pw = n.has3v3 || n.hasVin || n.hasBatP;
    const nm = n.metas.map(m => pinTitle(m.c.id + ":" + m.pin)).join(", ");
    if (pw && (n.hasGnd || n.hasBatN)) add("error", null, "Short circuit: power is wired to ground", "One net joins " + nm + ". Remove the jumper that bridges them.");
    if ((n.has3v3 && n.hasVin) || (n.hasBatP && (n.has3v3 || n.hasVin))) add("error", null, "Two different supplies are tied together", nm + ". Keep 3V3, VIN and the battery on separate nets.");
    if (n.gpios.length > 1) add("error", null, `GPIO ${n.gpios.join(" and GPIO ")} are shorted together`, "Each signal needs its own GPIO.");
    if (n.gpios.length && (pw || n.hasGnd)) add("error", null, `GPIO ${n.gpios[0]} is wired straight to ${n.hasGnd ? "GND" : "a supply"}`, "A pin driven HIGH into GND (or LOW into 3V3) can burn out. Wire it to a part instead.");
    if (n.hasEn && n.keys.length > 1) add("warn", null, "Something is wired to EN", "EN is the reset line. Pulling it low resets the chip.");
    const sig = n.metas.filter(m => m.c.type !== "esp32" && ["din", "dout", "analog", "io"].includes(m.kind));
    if (n.gpios.length === 1 && sig.length > 1) add("warn", null, `GPIO ${n.gpios[0]} is shared by ${sig.map(m => m.c.name + " " + m.pin).join(" and ")}`, "Give each part its own pin unless you know they can share it.");
  }

  for (const c of state.comps) {
    if (c.type === "esp32") continue;
    const t = T[c.type];
    const connected = Object.keys(c.pins).filter(p => nets.of(c.id + ":" + p).keys.length > 1);
    if (!connected.length) { add("info", c, `${c.name} isn't wired yet`, "Click one of its pins, then a pin on the ESP32."); continue; }
    c.vcc = 3.3;
    for (const [pin, kind] of t.pins) {
      const key = c.id + ":" + pin, n = nets.of(key), lone = n.keys.length === 1, g = n.gpios[0];
      const label = `${c.name} ${pin}`;
      switch (kind) {
        case "pwr":
          if (lone) { add("error", c, `${label} isn't connected`, "Power it from 3V3" + (t.needs5v || c.type === "servo" ? " or, for this part, VIN (5 V)." : ".")); break; }
          if (n.gpios.length) add("warn", c, `${label} is powered from a GPIO`, "A GPIO supplies ~20 mA. Use the 3V3 or VIN pin.");
          else if (!(n.has3v3 || n.hasVin || n.hasBatP)) add("error", c, `${label} has no supply`, "Wire it to 3V3 or VIN.");
          if (n.hasVin || n.hasBatP) c.vcc = n.hasBatP ? 6 : 5;
          if (t.needs5v && n.has3v3 && !n.hasVin) add("warn", c, `${c.name} needs 5 V but gets 3.3 V`, "Move VCC to VIN. Then protect the output pin with a divider.");
          if (c.type === "servo" && n.has3v3) add("warn", c, `${c.name} runs from 3V3`, "A stalling servo pulls ~500 mA and browns out the 3.3 V regulator. Use VIN.");
          if (c.type === "bme" && (n.hasVin || n.hasBatP)) add("warn", c, `${c.name} gets 5 V`, "Many BME280 breakouts have no regulator. Use 3V3.");
          break;
        case "gnd":
          if (lone) add("error", c, `${label} isn't connected`, "Every part needs a ground wire to the ESP32 GND.");
          else if (!n.hasGnd) add("error", c, `${label} doesn't reach the ESP32 GND`, "Signals need a shared ground reference.");
          break;
        case "analog":
          if (lone) { add("error", c, `${label} isn't connected`, "Wire it to an ADC1 pin: GPIO 32–39."); break; }
          if (g == null) { add("error", c, `${label} isn't on a GPIO`, "Wire it to an ADC1 pin: GPIO 32–39."); break; }
          if (!(g in ADC1) && !(g in ADC2)) add("error", c, `GPIO ${g} has no ADC`, `${label} is analog. Use GPIO 32–39.`);
          else if (g in ADC2 && wifi) add("error", c, `${label} is on ADC2 (GPIO ${g}) while Wi-Fi is on`, "ADC2 is shared with the radio and returns nothing. Move it to GPIO 32–39.");
          else if (g in ADC2) add("info", c, `${label} uses ADC2 (GPIO ${g})`, "Works now, fails the day you turn Wi-Fi on. GPIO 32–39 is safer.");
          if ((t.out5v || c.type === "pot" || c.type === "ldr") && c.vcc >= 5 && !c.props.divider)
            add("error", c, `${label} can output ${c.type === "turb" ? "4.5" : "5"} V into a 3.3 V pin`, t.out5v ? "Turn on the voltage divider for this part (inspector)." : "Power it from 3V3 instead of VIN.");
          break;
        case "din":
          if (lone) { add("error", c, `${label} isn't connected`, "Wire it to an output-capable GPIO."); break; }
          if (g == null) { if (!n.has3v3) add("error", c, `${label} isn't on a GPIO`, "The ESP32 has to drive this pin."); break; }
          if (INPUT_ONLY.has(g)) add("error", c, `GPIO ${g} is input-only`, `It can't drive ${label}. Pick an output pin such as 4, 13, 16–19, 21–23, 25–27, 32, 33.`);
          else if (g === 1 || g === 3) add("warn", c, `${label} is on GPIO ${g} (USB serial)`, "It will fight the serial monitor and uploads.");
          else if (STRAP.has(g)) add("warn", c, `${label} is on strapping pin GPIO ${g}`, "It can twitch or block boot at reset. Prefer 4, 13, 16–19, 21–23, 25–27, 32, 33.");
          break;
        case "dout":
          if (lone) { add("error", c, `${label} isn't connected`, "Wire it to a GPIO input."); break; }
          if (g == null) { add("error", c, `${label} isn't on a GPIO`, "The ESP32 needs to read this pin."); break; }
          if (c.type === "sonar" && c.vcc >= 5 && !c.props.divider) add("error", c, `${label} sends 5 V into GPIO ${g}`, "Turn on the 1 kΩ / 2 kΩ divider in the inspector.");
          if (c.type === "button" && INPUT_ONLY.has(g)) add("warn", c, `GPIO ${g} has no internal pull-up`, "Add a 10 kΩ pull-up to 3V3, or use another pin.");
          if (g === 12) add("warn", c, `${label} is on GPIO 12`, "If it pulls GPIO 12 high at reset, the flash voltage is wrong and the board won't boot.");
          if (g === 1 || g === 3) add("warn", c, `${label} is on GPIO ${g} (USB serial)`, "It will garble the serial monitor.");
          break;
        case "io":
          if (lone || g == null) { add("error", c, `${label} isn't on a GPIO`, "Wire it to a bidirectional GPIO."); break; }
          if (INPUT_ONLY.has(g)) add("error", c, `GPIO ${g} is input-only`, `${label} is bidirectional. Use 4, 13, 16–19, 21–23, 25–27, 32 or 33.`);
          else if (STRAP.has(g)) add("warn", c, `${label} is on strapping pin GPIO ${g}`, "Usually fine, but a sensor holding the line at boot can stop it.");
          break;
        case "sda": case "scl": {
          if (lone || g == null) { add("error", c, `${label} isn't on a GPIO`, `Default I²C pins: SDA 21, SCL 22.`); break; }
          if (INPUT_ONLY.has(g)) add("error", c, `GPIO ${g} is input-only`, "I²C lines are driven both ways. Use 21/22.");
          else if ((kind === "sda" && g !== 21) || (kind === "scl" && g !== 22)) add("info", c, `${label} is on GPIO ${g}`, `Works with Wire.begin(SDA, SCL). The defaults are SDA 21, SCL 22.`);
          if (kind === "sda") { const bus = i2cBus.get(g) || []; bus.push(c); i2cBus.set(g, bus); }
          break;
        }
        case "motor":
          if (lone) { add("error", c, `${label} isn't connected`, "Wire M+ and M- to the driver's AO1 and AO2."); break; }
          if (n.gpios.length || n.has3v3 || n.hasVin) add("error", c, `${c.name} is wired straight to the ESP32`, "A GPIO gives ~20 mA; a motor wants 200–800 mA and kicks back voltage. Put the TB6612 driver in between.");
          else if (!n.kinds.includes("drvout")) add("error", c, `${label} isn't on a driver output`, "Wire it to AO1 or AO2 on the TB6612.");
          break;
        case "vm":
          if (lone) add("error", c, `${label} has no motor supply`, "Wire VM to the battery pack +.");
          else if (n.hasBatP) { /* good */ }
          else if (n.hasVin) add("warn", c, `${label} takes motor power from VIN`, "The motor shares USB 5 V with the ESP32. Expect brownout resets. Use the battery pack.");
          else if (n.has3v3) add("error", c, `${label} is on 3V3`, "The 3.3 V regulator can't feed a motor. Use the battery pack.");
          break;
        case "stby":
          if (lone) add("error", c, `${label} is floating`, "Tie STBY to 3V3 or the driver stays asleep.");
          else if (n.hasGnd) add("error", c, `${label} is tied to GND`, "LOW = standby. Tie it to 3V3.");
          break;
        case "bat+":
          if (lone) add("warn", c, `${label} isn't connected`, "Wire it to the driver's VM.");
          else if (n.gpios.length || n.has3v3) add("error", c, `6 V from ${c.name} reaches a 3.3 V pin`, "Battery + goes to VM on the driver only.");
          break;
        case "bat-":
          if (lone || !n.hasGnd) add("error", c, `${c.name} ground isn't shared with the ESP32`, "Wire BAT- to GND. Without a common ground the driver can't read the PWM signal.");
          break;
        case "drvout": break;
      }
    }
  }
  for (const [g, list] of i2cBus) {
    const seen = new Map();
    list.forEach(c => { const a = T[c.type].i2c; if (seen.has(a)) add("error", c, `Two devices at address 0x${a.toString(16)} on SDA ${g}`, `${seen.get(a).name} and ${c.name} collide. Change one address pin or use a second bus.`); else seen.set(a, c); });
  }
  const rank = { error: 0, warn: 1, info: 2 };
  out.sort((a, b) => rank[a.sev] - rank[b.sev]);
  issues = out;
  compSev = new Map();
  out.forEach(i => { if (!i.id) return; const cur = compSev.get(i.id); if (!cur || rank[i.sev] < rank[cur]) compSev.set(i.id, i.sev); });
  // net errors mark every part on the net
  out.filter(i => !i.id && i.sev === "error").forEach(() => {});
  state.comps.forEach(c => {
    const s = compSev.get(c.id);
    c.anim.badge.visible = state.showChecks && (s === "error" || s === "warn");
    if (c.anim.badge.visible) c.anim.badge.material.map = BADGE[s];
  });
}
const hasErr = c => compSev.get(c.id) === "error";

// ═════════════════════════ simulation ═════════════════════════
function gpioOf(c, pin) { const n = nets.of(c.id + ":" + pin); return n ? (n.gpios[0] ?? null) : null; }
function driverOfMotor(m) {
  const n = nets.of(m.id + ":M+");
  const d = n && n.metas.find(x => x.kind === "drvout");
  return d ? d.c : null;
}
function batteryOfDriver(d) {
  const n = nets.of(d.id + ":VM");
  const b = n && n.metas.find(x => x.kind === "bat+");
  return b ? b.c : null;
}
function motorChainOk(m) {
  if (hasErr(m)) return false;
  const d = driverOfMotor(m);
  if (!d || hasErr(d)) return false;
  const b = batteryOfDriver(d);
  if (b && hasErr(b)) return false;
  const vm = nets.of(d.id + ":VM");
  return !!(b || vm.hasVin);
}
function motorDirect(m) { const n = nets.of(m.id + ":M+"), k = nets.of(m.id + ":M-"); return [n, k].some(x => x.gpios.length || x.has3v3 || x.hasVin); }

let vibration = 0;
function readSensor(c, t) {
  if (hasErr(c)) return null;
  const e = state.env, nz = (a) => (Math.random() - 0.5) * a;
  switch (c.type) {
    case "pot": { const mv = Math.round(c.props.value * 3300 + nz(14)); return { norm: c.props.value, text: `${clamp(mv, 0, 3300)} mV`, csv: `${clamp(mv, 0, 3300)}mV` }; }
    case "ldr": { const mv = Math.round(e.light / 100 * 3300 + nz(20)); return { norm: e.light / 100, text: `${mv} mV (${e.light}% light)`, csv: `${mv}mV` }; }
    case "button": return { norm: c.props.pressed ? 1 : 0, text: c.props.pressed ? "pressed (LOW)" : "released (HIGH)", csv: c.props.pressed ? "1" : "0" };
    case "mpu": {
      const wob = vibration * Math.sin(t * 90) * 0.9 + nz(vibration * 0.4);
      const p = e.tilt + wob * 6 + nz(0.3);
      const vib = Math.abs(wob) * 0.4 + 0.01;
      return { norm: clamp((p + 90) / 180), text: `pitch ${p.toFixed(1)}° · vib ${vib.toFixed(2)} g`, csv: `${p.toFixed(1)}deg/${vib.toFixed(2)}g` };
    }
    case "bme": { const tt = e.airTemp + nz(0.1); return { norm: clamp(tt / 50), text: `${tt.toFixed(1)} °C · ${e.humidity}% · ${(1013.2 + nz(0.3)).toFixed(1)} hPa`, csv: `${tt.toFixed(1)}C` }; }
    case "dht": { const tt = Math.round((e.airTemp + 0.4) * 10) / 10; return { norm: clamp(tt / 50), text: `${tt.toFixed(1)} °C · ${e.humidity}% RH`, csv: `${tt.toFixed(1)}C/${e.humidity}%` }; }
    case "ds18": { const tt = Math.round((e.waterTemp + nz(0.05)) * 16) / 16; return { norm: clamp(tt / 40), text: `${tt.toFixed(2)} °C water`, csv: `${tt.toFixed(2)}C` }; }
    case "sonar": { const d = e.distance + nz(0.6); return { norm: clamp((d - 2) / 198), text: `${d.toFixed(1)} cm`, csv: `${d.toFixed(1)}cm` }; }
    case "turb": { const mv = Math.round(clamp(4.2 - e.turbidity / 3000 * 2.7, 0, 4.5) * (c.props.divider ? 2 / 3 : 1) * 1000); return { norm: clamp(e.turbidity / 3000), text: `${e.turbidity} NTU (${mv} mV)`, csv: `${e.turbidity}NTU` }; }
  }
  return null;
}
function srcLevel(c) {
  let n;
  if (!c.props.src || c.props.src === "manual") n = c.props.manual;
  else { const r = readings.get(c.props.src); n = r ? r.norm : 0; }
  return clamp(c.props.invert ? 1 - n : n);
}
function leakActive() { return state.comps.some(c => c.type === "button" && c.props.leak && c.props.pressed && !hasErr(c)); }

function serialPrint(line) {
  serialLines.push(line);
  if (serialLines.length > 400) serialLines.splice(0, serialLines.length - 400);
  if (!serialPaused) renderSerial();
}
function renderSerial() {
  const el = $("#serialOut");
  if ($("#pane-serial").hidden) return;
  el.textContent = serialLines.join("\n") || "Press Run to boot the board.";
  el.scrollTop = el.scrollHeight;
}
function bootLog(reason = "0x1 (POWERON_RESET)") {
  serialPrint("ets Jun  8 2016 00:22:57");
  serialPrint(`rst:${reason},boot:0x13 (SPI_FAST_FLASH_BOOT)`);
  serialPrint("load:0x3fff0030,len:1344 · entry 0x400805f0");
  serialPrint("# ESP32-D0WD-V3 · 240 MHz · free heap 298 KB · sketch from Sketch tab");
  serialPrint(state.wifi ? "# Wi-Fi: STA started (ADC2 now unavailable)" : "# Wi-Fi: off");
  state.comps.filter(c => T[c.type] && T[c.type].i2c).forEach(c => {
    const a = "0x" + T[c.type].i2c.toString(16);
    if (hasErr(c)) serialPrint(`E (${240 + Math.round(Math.random() * 40)}) i2c: ${c.name} no ACK at ${a}. Check SDA/SCL/power`);
    else serialPrint(`# I2C: ${c.name} found at ${a} (SDA ${gpioOf(c, "SDA")}, SCL ${gpioOf(c, "SCL")})`);
  });
  const errs = issues.filter(i => i.sev === "error").length;
  if (errs) serialPrint(`# ${errs} wiring error${errs > 1 ? "s" : ""}: parts with errors stay silent. See Checks.`);
  serialPrint("# ready");
}

function tickSim(dt) {
  const e = state.env;
  outputs.clear();
  const booting = simT < brownoutUntil;
  // motors first so the IMU can feel them
  vibration = 0;
  let brownRisk = false;
  const abort = leakActive();
  state.comps.filter(c => c.type === "motor").forEach(m => {
    let speed = 0;
    const ok = nets && motorChainOk(m);
    const direct = nets && motorDirect(m);
    const lvl = srcLevel(m);
    if (state.running && !booting) {
      if (ok && !abort) speed = lvl;
      else if (direct && lvl > 0.05) { brownRisk = true; speed = Math.random() * 0.08; }
      const d = driverOfMotor(m);
      if (ok && d && !batteryOfDriver(d) && lvl > 0.6) brownRisk = true;
    }
    outputs.set(m.id, { speed, abort: abort && ok });
    vibration += speed * (0.04 + (m.props.blob ? 0.3 : 0));
  });
  readings.clear();
  if (state.running && !booting) state.comps.forEach(c => { if (!T[c.type] || T[c.type].act || c.type === "esp32" || c.type === "driver" || c.type === "battery") return; const r = readSensor(c, simT); if (r) readings.set(c.id, r); });
  if (state.running) {
    simT += dt;
    if (brownRisk) {
      brownoutAcc += dt;
      if (brownoutAcc > 2.2) {
        brownoutAcc = 0;
        serialPrint(""); serialPrint("Brownout detector was triggered"); serialPrint("");
        brownoutUntil = simT + 1.2;
        setTimeout(() => state.running && bootLog("0xf (BROWNOUT_RST)"), 400);
      }
    } else brownoutAcc = Math.max(0, brownoutAcc - dt);
    serialAcc += dt;
    if (serialAcc >= 0.5 && !booting) {
      serialAcc = 0;
      const parts = [];
      state.comps.forEach(c => {
        if (c.type === "esp32" || c.type === "driver" || c.type === "battery") return;
        if (T[c.type].act) {
          const o = outputs.get(c.id);
          if (!o) return;
          if (c.type === "motor") parts.push(`${c.name}=${o.abort ? "ABORT" : Math.round(o.speed * 100) + "%"}`);
          if (c.type === "servo") parts.push(`${c.name}=${Math.round(o.angle)}deg`);
          if (c.type === "led") parts.push(`${c.name}=${Math.round(o.level * 255)}`);
          if (c.type === "buzzer") parts.push(`${c.name}=${o.on ? 1 : 0}`);
        } else {
          const r = readings.get(c.id);
          parts.push(`${c.name}=${r ? r.csv : "--"}`);
        }
      });
      if (abort) parts.push("LEAK");
      serialPrint(`${simT.toFixed(2).padStart(7)}s  ${parts.join("  ")}`);
    }
  }
  // actuators
  state.comps.forEach(c => {
    const a = c.anim;
    const live = state.running && !booting && !hasErr(c);
    switch (c.type) {
      case "esp32":
        a.pwrLed.material.emissiveIntensity = state.running ? (booting ? (Math.sin(simT * 40) > 0 ? 1.4 : 0.1) : 1.4) : 0;
        break;
      case "pot": a.knob.rotation.y = -(c.props.value * 270 - 135) * Math.PI / 180; break;
      case "button": a.cap.position.y = c.props.pressed ? 0.58 : 0.68; break;
      case "led": {
        let lv = live ? srcLevel(c) : 0;
        if (live && c.props.blink) lv = lv > 0.5 && Math.floor(simT * 6) % 2 ? 1 : 0;
        if (live && abort && c.props.src && byId(c.props.src) && byId(c.props.src).type === "button") lv = Math.floor(simT * 6) % 2;
        a.ledMat.emissiveIntensity = 0.05 + lv * 2.2;
        a.glow.material.opacity = lv * 0.85;
        outputs.set(c.id, { level: lv });
        break;
      }
      case "buzzer": {
        const on = live && srcLevel(c) > c.props.threshold;
        const ph = (simT * 3) % 1;
        a.ring.material.opacity = on ? 0.9 * (1 - ph) : 0;
        a.ring.scale.setScalar(on ? 0.7 + ph * 1.2 : 1);
        outputs.set(c.id, { on });
        break;
      }
      case "servo": {
        const target = live ? srcLevel(c) * 180 : (c.anim.angle ?? 90);
        const cur = c.anim.angle ?? 90;
        const step = 320 * dt;
        c.anim.angle = cur + clamp(target - cur, -step, step);
        a.horn.rotation.y = (c.anim.angle - 90) * Math.PI / 180;
        if (live) outputs.set(c.id, { angle: c.anim.angle });
        break;
      }
      case "motor": {
        const o = outputs.get(c.id) || { speed: 0 };
        const dir = c.props.reverse ? -1 : 1;
        c.anim.spin = (c.anim.spin || 0) + o.speed * 30 * dt * dir;
        a.prop.rotation.x = c.anim.spin;
        a.blob.visible = !!c.props.blob;
        const wob = c.props.blob ? o.speed * 0.06 : o.speed * 0.008;
        a.body.position.y = Math.sin(c.anim.spin) * wob;
        a.body.position.z = -0.5 + Math.cos(c.anim.spin) * wob;
        break;
      }
    }
  });
  const esp = byId("esp");
  if (esp) {
    const blue = state.comps.find(c => c.type === "led" && gpioOf(c, "SIG") === 2 && !hasErr(c));
    esp.anim.gpioLed.material.emissiveIntensity = blue && outputs.get(blue.id) ? outputs.get(blue.id).level * 1.5 : 0;
  }
  updateLive();
}

// ═════════════════════════ code generation ═════════════════════════
const NORM = {
  pot: n => `${n}_mV / 3300.0f`, ldr: n => `${n}_mV / 3300.0f`, turb: n => `1.0f - ${n}_mV / 4500.0f`,
  btn: n => `(${n} ? 1.0f : 0.0f)`, mpu: n => `(${n}_pitch + 90.0f) / 180.0f`, bme: n => `${n}_C / 50.0f`,
  dht: n => `${n}_C / 50.0f`, ds: n => `${n}_C / 40.0f`, sonar: n => `(${n}_cm - 2.0f) / 198.0f`,
};
function generateCode() {
  if (!nets) validate();
  const inc = new Set(), glob = [], setup = [], loop = [], outs = [], prints = [], defs = [];
  const fnBlocks = new Set();
  const wired = c => Object.keys(c.pins).some(p => nets.of(c.id + ":" + p).keys.length > 1);
  const errs = state.showChecks ? issues.filter(i => i.sev === "error") : [];
  const PN = (c, pin) => (c.name + "_" + pin).toUpperCase().replace(/[^A-Z0-9_]/g, "") + "_PIN";
  const pinDef = (c, pin, note) => { const g = gpioOf(c, pin); if (g == null) return false; defs.push(`const int ${PN(c, pin)} = ${g};${" ".repeat(Math.max(1, 26 - PN(c, pin).length - String(g).length))}// ${note}`); return true; };
  let i2cStarted = false;
  const startI2C = c => { if (i2cStarted) return; i2cStarted = true; inc.add("#include <Wire.h>"); setup.push(`  Wire.begin(${gpioOf(c, "SDA") ?? 21}, ${gpioOf(c, "SCL") ?? 22});   // SDA, SCL`); };
  const normOf = c => {
    if (!c.props.src || c.props.src === "manual") return `${c.props.manual.toFixed(2)}f`;
    const s = byId(c.props.src);
    if (!s || !wired(s)) return `${c.props.manual.toFixed(2)}f /* source not wired */`;
    return `constrain(${NORM[T[s.type].short](s.name)}, 0.0f, 1.0f)`;
  };
  const lvlOf = c => c.props.invert ? `(1.0f - ${normOf(c)})` : normOf(c);
  const sensors = state.comps.filter(c => c.type !== "esp32" && !T[c.type].act && !["driver", "battery"].includes(c.type) && wired(c));
  const acts = state.comps.filter(c => T[c.type] && T[c.type].act && wired(c));

  for (const c of sensors) {
    const n = c.name;
    switch (c.type) {
      case "pot": case "ldr": case "turb":
        if (!pinDef(c, c.type === "pot" ? "OUT" : "AO", T[c.type].name)) break;
        loop.push(`  float ${n}_mV = analogReadMilliVolts(${PN(c, c.type === "pot" ? "OUT" : "AO")});`);
        prints.push([`${n}=%.0fmV`, `${n}_mV`]); break;
      case "button":
        if (!pinDef(c, "SIG", c.props.leak ? "leak switch" : "button")) break;
        setup.push(`  pinMode(${PN(c, "SIG")}, INPUT_PULLUP);`);
        loop.push(`  bool ${n} = digitalRead(${PN(c, "SIG")}) == LOW;   // pressed`);
        prints.push([`${n}=%d`, n]); break;
      case "mpu":
        startI2C(c);
        fnBlocks.add(`// MPU6050 on raw registers: no library needed
void mpuBegin() {
  Wire.beginTransmission(0x68); Wire.write(0x6B); Wire.write(0); Wire.endTransmission();  // wake
  Wire.beginTransmission(0x68); Wire.write(0x1C); Wire.write(0x08); Wire.endTransmission(); // ±4 g
}
float mpuPitch() {
  Wire.beginTransmission(0x68); Wire.write(0x3B); Wire.endTransmission(false);
  Wire.requestFrom(0x68, 6);
  int16_t ax = Wire.read() << 8 | Wire.read();
  int16_t ay = Wire.read() << 8 | Wire.read();
  int16_t az = Wire.read() << 8 | Wire.read();
  return atan2(-ax, sqrt((float)ay * ay + (float)az * az)) * 57.2958f;
}`);
        setup.push(`  mpuBegin();`);
        loop.push(`  float ${n}_pitch = mpuPitch();`);
        prints.push([`${n}=%.1fdeg`, `${n}_pitch`]); break;
      case "bme":
        startI2C(c); inc.add("#include <Adafruit_BME280.h>   // Library Manager: Adafruit BME280");
        glob.push(`Adafruit_BME280 ${n};`);
        setup.push(`  if (!${n}.begin(0x76)) Serial.println("# ${n} not found at 0x76");`);
        loop.push(`  float ${n}_C = ${n}.readTemperature();`);
        prints.push([`${n}=%.1fC`, `${n}_C`]); break;
      case "dht":
        if (!pinDef(c, "DATA", "DHT22 data")) break;
        inc.add("#include <DHT.h>                 // Library Manager: DHT sensor library");
        glob.push(`DHT ${n}(${PN(c, "DATA")}, DHT22);`, `float ${n}_C = NAN;`);
        setup.push(`  ${n}.begin();`);
        loop.push(`  static uint32_t ${n}_last = 0;               // DHT22: one read per 2 s`, `  if (millis() - ${n}_last > 2000) { ${n}_last = millis(); ${n}_C = ${n}.readTemperature(); }`);
        prints.push([`${n}=%.1fC`, `${n}_C`]); break;
      case "ds18":
        if (!pinDef(c, "DATA", "DS18B20 1-Wire")) break;
        inc.add("#include <OneWire.h>\n#include <DallasTemperature.h>  // Library Manager: DallasTemperature");
        glob.push(`OneWire ${n}_bus(${PN(c, "DATA")});`, `DallasTemperature ${n}(&${n}_bus);`);
        setup.push(`  ${n}.begin();`, `  ${n}.setWaitForConversion(false);          // don't block the loop 750 ms`, `  ${n}.requestTemperatures();`);
        glob.push(`float ${n}_C = NAN;`);
        loop.push(`  static uint32_t ${n}_last = 0;`, `  if (millis() - ${n}_last > 800) { ${n}_last = millis(); ${n}_C = ${n}.getTempCByIndex(0); ${n}.requestTemperatures(); }`);
        prints.push([`${n}=%.2fC`, `${n}_C`]); break;
      case "sonar":
        if (!pinDef(c, "TRIG", "HC-SR04 trigger") | !pinDef(c, "ECHO", c.props.divider ? "echo via 1k/2k divider" : "echo: 5 V! add a divider")) break;
        setup.push(`  pinMode(${PN(c, "TRIG")}, OUTPUT);`, `  pinMode(${PN(c, "ECHO")}, INPUT);`);
        loop.push(`  digitalWrite(${PN(c, "TRIG")}, HIGH); delayMicroseconds(10); digitalWrite(${PN(c, "TRIG")}, LOW);`,
                  `  float ${n}_cm = pulseIn(${PN(c, "ECHO")}, HIGH, 30000) / 58.0f;  // 0 = no echo`);
        prints.push([`${n}=%.1fcm`, `${n}_cm`]); break;
    }
  }
  const leak = state.comps.find(c => c.type === "button" && c.props.leak && wired(c) && gpioOf(c, "SIG") != null);
  if (leak && acts.some(a => a.type === "motor")) loop.push(`  bool abortNow = ${leak.name};                 // leak: stop thrusters`);
  for (const c of acts) {
    const n = c.name;
    switch (c.type) {
      case "led":
        if (!pinDef(c, "SIG", "LED via 220 Ω")) break;
        setup.push(`  ledcAttach(${PN(c, "SIG")}, 5000, 8);          // pin, Hz, bits (core 3.x)`);
        outs.push(c.props.blink
          ? `  ledcWrite(${PN(c, "SIG")}, (${lvlOf(c)} > 0.5f && (millis() / 160) % 2) ? 255 : 0);   // blink`
          : `  ledcWrite(${PN(c, "SIG")}, (int)(${lvlOf(c)} * 255));`); break;
      case "buzzer":
        if (!pinDef(c, "SIG", "active buzzer")) break;
        setup.push(`  pinMode(${PN(c, "SIG")}, OUTPUT);`);
        outs.push(`  digitalWrite(${PN(c, "SIG")}, ${lvlOf(c)} > ${c.props.threshold.toFixed(2)}f);`); break;
      case "servo":
        if (!pinDef(c, "SIG", "SG90 signal")) break;
        setup.push(`  ledcAttach(${PN(c, "SIG")}, 50, 14);             // 50 Hz servo frame`);
        outs.push(`  float ${n}_deg = ${lvlOf(c)} * 180.0f;`, `  ledcWrite(${PN(c, "SIG")}, (uint32_t)((500 + ${n}_deg / 180.0f * 2000) * 16383 / 20000));`); break;
      case "motor": {
        const d = driverOfMotor(c);
        if (!d) { outs.push(`  // ${n}: wire M+/M- to a TB6612 driver to generate motor code`); break; }
        const ok = [pinDef(d, "PWMA", `${d.name} speed`), pinDef(d, "AIN1", `${d.name} direction`), pinDef(d, "AIN2", `${d.name} direction`)].every(Boolean);
        if (!ok) { outs.push(`  // ${n}: wire the driver's PWMA, AIN1 and AIN2 to GPIOs`); break; }
        setup.push(`  ledcAttach(${PN(d, "PWMA")}, 20000, 10);        // 20 kHz: no motor whine`, `  pinMode(${PN(d, "AIN1")}, OUTPUT);`, `  pinMode(${PN(d, "AIN2")}, OUTPUT);`);
        outs.push(`  int ${n}_duty = ${leak ? "abortNow ? 0 : " : ""}(int)(${lvlOf(c)} * 1023);`,
                  `  digitalWrite(${PN(d, "AIN1")}, ${c.props.reverse ? "LOW" : "HIGH"});`, `  digitalWrite(${PN(d, "AIN2")}, ${c.props.reverse ? "HIGH" : "LOW"});`,
                  `  ledcWrite(${PN(d, "PWMA")}, ${n}_duty);`);
        prints.push([`${n}=%d`, `${n}_duty`]);
        break;
      }
    }
  }
  const L = [];
  L.push("// Generated by ESP32 Prototype Bench for a classic ESP32 DevKit (30-pin)");
  L.push("// Arduino IDE · board \"ESP32 Dev Module\" · esp32 core 3.x");
  if (errs.length) { L.push("//"); L.push(`// ${errs.length} wiring error${errs.length > 1 ? "s" : ""} on the bench. Fix before flashing:`); errs.slice(0, 8).forEach(i => L.push("//   - " + i.what)); }
  L.push("");
  inc.forEach(i => L.push(i));
  if (inc.size) L.push("");
  if (defs.length) { L.push("// ── pins ──"); defs.forEach(d => L.push(d)); L.push(""); }
  if (glob.length) { glob.forEach(d => L.push(d)); L.push(""); }
  fnBlocks.forEach(b => { L.push(b); L.push(""); });
  L.push("void setup() {", "  Serial.begin(115200);");
  setup.forEach(s => L.push(s));
  L.push('  Serial.println("# ready");', "}", "", "void loop() {");
  if (loop.length) { L.push("  // ── read sensors ──"); loop.forEach(s => L.push(s)); }
  if (outs.length) { L.push("", "  // ── drive actuators ──"); outs.forEach(s => L.push(s)); }
  if (prints.length) {
    L.push("", `  Serial.printf("${prints.map(p => p[0]).join("  ")}\\n",`, `                ${prints.map(p => p[1]).join(", ")});`);
  }
  if (!loop.length && !outs.length) L.push("  // Wire a sensor or an actuator to generate code here.");
  L.push("  delay(50);                                   // ~20 Hz", "}");
  return L.join("\n");
}
function renderCode() {
  const src = generateCode();
  const html = esc(src).split("\n").map(line => {
    const i = line.indexOf("//");
    let code = i >= 0 ? line.slice(0, i) : line, cm = i >= 0 ? `<span class="cm">${line.slice(i)}</span>` : "";
    code = code.replace(/\b(void|float|int|bool|const|static|return|if|uint32_t|int16_t)\b/g, '<span class="kw">$1</span>').replace(/^(#include)/, '<span class="kw">$1</span>');
    return code + cm;
  }).join("\n");
  $("#codeOut").innerHTML = html;
  $("#codeOut").dataset.src = src;
}

// ═════════════════════════ UI: library ═════════════════════════
function renderLibrary() {
  const el = $("#lib");
  el.innerHTML = CATS.map(cat => `<div class="lib-group eyebrow">${cat}</div>` +
    Object.entries(T).filter(([, t]) => t.cat === cat).map(([k, t]) => {
      const col = t.color != null ? hex6(t.color) : k === "servo" ? "#2a5db0" : k === "motor" ? "#bfc5ca" : "#1b1b1b";
      return `<button class="part" data-add="${k}"><span class="sw" style="background:${col}"></span><span><b>${esc(t.name)}</b><span>${esc(t.blurb)}</span></span></button>`;
    }).join("")).join("");
}

// ═════════════════════════ UI: tabs ═════════════════════════
let activeTab = "inspect";
function showTab(name) {
  activeTab = name;
  $$(".tab").forEach(b => b.setAttribute("aria-selected", String(b.dataset.tab === name)));
  $$(".pane").forEach(p => p.hidden = p.id !== "pane-" + name);
  if (name === "code") renderCode();
  if (name === "serial") renderSerial();
  if (name === "world") renderWorld();
  if (name === "checks") renderChecks();
}

// ═════════════════════════ UI: inspector ═════════════════════════
function srcOptions(c) {
  const opts = [["manual", "Manual slider"]].concat(state.comps.filter(s => s.type !== "esp32" && !T[s.type].act && !["driver", "battery"].includes(s.type)).map(s => [s.id, `${s.name} (${T[s.type].name})`]));
  return opts.map(([v, l]) => `<option value="${v}" ${c.props.src === v ? "selected" : ""}>${esc(l)}</option>`).join("");
}
function connText(key) {
  const n = nets.of(key);
  if (!n || n.keys.length === 1) return `<span class="none">not connected</span>`;
  return n.keys.filter(k => k !== key).map(k => esc(pinTitle(k))).join(", ");
}
function renderInspector() {
  const el = $("#pane-inspect");
  const sel = state.sel;
  if (!sel) {
    el.innerHTML = `
      <div class="eyebrow">How it works</div>
      <h3>Wire it like a real bench</h3>
      <ol class="steps">
        <li>Pick a part from the parts bin. It lands on the mat.</li>
        <li><b>Click a pin</b>, then <b>click another pin</b>. A jumper appears.</li>
        <li>Drag parts to move them. <span class="kbd">R</span> rotates, <span class="kbd">Del</span> removes, <span class="kbd">Esc</span> cancels a jumper.</li>
        <li>Open <b>Checks</b>. Every rule from the pin-map lesson is tested live.</li>
        <li>Press <b>Run</b>. Sensors read the <b>World</b> tab, actuators move, the <b>Serial</b> tab prints.</li>
        <li><b>Sketch</b> is the Arduino code for exactly this wiring.</li>
      </ol>
      <h4>Jumper colours</h4>
      <div class="legend">
        <span class="dot" style="background:${WIRE_COLORS.red}"></span><span>Power: 3V3, VIN, VM, battery +</span>
        <span class="dot" style="background:${WIRE_COLORS.black}"></span><span>Ground</span>
        <span class="dot" style="background:${WIRE_COLORS.blue}"></span><span>I²C SDA</span>
        <span class="dot" style="background:${WIRE_COLORS.yellow}"></span><span>I²C SCL</span>
        <span class="dot" style="background:${WIRE_COLORS.green}"></span><span>Signals (cycle through colours)</span>
      </div>
      <h4>Tip</h4>
      <p class="muted">Hover any ESP32 pin to see what it can do: ADC channel, input-only, strapping, USB serial.</p>`;
    return;
  }
  if (sel.kind === "wire") {
    const w = state.wires.find(x => x.id === sel.id);
    if (!w) { state.sel = null; return renderInspector(); }
    el.innerHTML = `
      <div class="eyebrow">Jumper wire</div>
      <h3>${esc(pinTitle(w.a))} → ${esc(pinTitle(w.b))}</h3>
      <p class="muted">${esc(pinMeta(w.a).desc || "")}${pinMeta(w.b).desc ? " · " + esc(pinMeta(w.b).desc) : ""}</p>
      <h4>Colour</h4>
      <div class="swatches">${Object.entries(WIRE_COLORS).map(([k, v]) => `<button data-wcolor="${k}" aria-label="${k}" aria-pressed="${w.color === k}" style="background:${v}"></button>`).join("")}</div>
      <div class="actions"><button class="btn small danger" data-act="delete">Remove jumper</button></div>`;
    return;
  }
  const c = byId(sel.id);
  if (!c) { state.sel = null; return renderInspector(); }
  if (c.type === "esp32") {
    const rows = [...ESP_LEFT, ...ESP_RIGHT].filter(n => n !== "GND2").map(n => {
      const key = "esp:" + n;
      const k = nets.of(key);
      const used = k && k.keys.length > 1;
      return used ? `<tr><td>${esc(espLabel(n))}</td><td class="to">${connText(key)}</td></tr>` : "";
    }).join("");
    el.innerHTML = `
      <div class="eyebrow">Microcontroller</div>
      <h3>ESP32 DevKit V1 · ${esc(c.name)}</h3>
      <p class="muted">ESP-WROOM-32, dual-core 240 MHz, Wi-Fi + BLE. 30 pins. Powered from USB.</p>
      <h4>Pins in use</h4>
      ${rows ? `<table class="pins"><tbody>${rows}</tbody></table>` : `<p class="muted">Nothing wired yet.</p>`}
      <h4>Pin rules</h4>
      <div class="legend">
        <span class="dot" style="background:var(--ok)"></span><span>Analog: ADC1 only, GPIO 32–39</span>
        <span class="dot" style="background:var(--warn)"></span><span>Input only: 34, 35, 36 (VP), 39 (VN)</span>
        <span class="dot" style="background:var(--warn)"></span><span>Strapping: 0, 2, 5, 12, 15</span>
        <span class="dot" style="background:var(--err)"></span><span>ADC2 (0, 2, 4, 12–15, 25–27) is dead while Wi-Fi is on</span>
        <span class="dot" style="background:var(--err)"></span><span>TX0/RX0 (1, 3) belong to the USB serial link</span>
      </div>
      <div class="actions"><button class="btn small" data-act="rotate">Rotate</button></div>`;
    return;
  }
  const t = T[c.type];
  const mine = issues.filter(i => i.id === c.id);
  const p = c.props || {};
  let controls = "";
  const slider = (key, label, min, max, step, fmt) => `<label class="field"><span>${label}</span><span class="row"><input type="range" id="p-${key}" data-prop="${key}" min="${min}" max="${max}" step="${step}" value="${p[key]}"><output>${fmt(p[key])}</output></span></label>`;
  const check = (key, label) => `<label class="check"><input type="checkbox" id="p-${key}" data-prop="${key}" ${p[key] ? "checked" : ""}><span>${label}</span></label>`;
  const pct = v => Math.round(v * 100) + "%";
  if (c.type === "pot") controls += slider("value", "Knob position", 0, 1, 0.01, v => Math.round(v * 3300) + " mV");
  if (c.type === "button") controls += check("pressed", "Pressed (you can also click the red cap)") + check("leak", "Acts as the leak switch: pressing it stops every thruster");
  if (c.type === "sonar") controls += check("divider", "1 kΩ / 2 kΩ divider on ECHO (5 V → 3.3 V)");
  if (c.type === "turb") controls += check("divider", "Voltage divider on AO (4.5 V → 3 V)");
  if (t.act) {
    controls += `<label class="field"><span>Driven by</span><select id="p-src" data-prop="src">${srcOptions(c)}</select></label>`;
    if (!p.src || p.src === "manual") controls += slider("manual", c.type === "servo" ? "Angle" : c.type === "motor" ? "Throttle" : "Level", 0, 1, 0.01, v => c.type === "servo" ? Math.round(v * 180) + "°" : pct(v));
    controls += check("invert", "Invert (high reading → low output)");
    if (c.type === "led") controls += check("blink", "Blink when above 50% (strobe)") +
      `<label class="field"><span>LED colour</span><select id="p-color" data-prop="color">${[["#ff4b3a", "Red"], ["#ffb020", "Amber"], ["#3ddc6b", "Green"], ["#3d8bff", "Blue"], ["#f4f4ff", "White"]].map(([v, l]) => `<option value="${v}" ${p.color === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>`;
    if (c.type === "buzzer") controls += slider("threshold", "Beep above", 0, 1, 0.01, pct);
    if (c.type === "motor") controls += check("reverse", "Reverse direction") + check("blob", "Blu-Tack blob on one blade (imbalanced propeller)");
  }
  el.innerHTML = `
    <div class="eyebrow">${esc(t.cat)}</div>
    <h3>${esc(t.name)} · ${esc(c.name)}</h3>
    <p class="muted">${esc(t.blurb)}</p>
    ${state.showChecks && mine.length ? `<div class="issues">${mine.map(issueHTML).join("")}</div>` : ""}
    <h4>Pins</h4>
    <table class="pins"><tbody>${t.pins.map(([nm, , desc]) => `<tr><td>${esc(nm)}</td><td><div>${esc(desc)}</div><div class="to">→ ${connText(c.id + ":" + nm)}</div></td></tr>`).join("")}</tbody></table>
    ${controls ? `<h4>Settings</h4>${controls}` : ""}
    <h4>Live</h4>
    <div class="live" id="liveVal">${state.running ? "…" : "Press Run to see live values."}</div>
    <div class="actions"><button class="btn small" data-act="rotate">Rotate <span class="kbd">R</span></button><button class="btn small danger" data-act="delete">Remove part</button></div>`;
}
function updateLive() {
  const el = $("#liveVal");
  if (!el || !state.sel || state.sel.kind !== "comp") return;
  const c = byId(state.sel.id);
  if (!c || c.type === "esp32") return;
  let s;
  if (!state.running) s = "Press Run to see live values.";
  else if (hasErr(c)) s = "No signal: fix the wiring errors above.";
  else if (T[c.type].act) {
    const o = outputs.get(c.id) || {};
    if (c.type === "led") s = `PWM ${Math.round((o.level || 0) * 255)} / 255`;
    if (c.type === "buzzer") s = o.on ? "BEEPING" : "quiet";
    if (c.type === "servo") s = `${Math.round(o.angle ?? 90)}°`;
    if (c.type === "motor") s = !motorChainOk(c) ? "Driver chain has errors" : o.abort ? "ABORT: leak detected" : `${Math.round((o.speed || 0) * 100)}% throttle`;
  } else if (["driver", "battery"].includes(c.type)) s = "Passes power, no reading.";
  else { const r = readings.get(c.id); s = r ? r.text : "…"; }
  if (el.textContent !== s) el.textContent = s;
}

function issueHTML(i) {
  const tag = { error: "ERROR", warn: "WARN", info: "NOTE" }[i.sev];
  return `<div class="issue ${i.sev}"><span class="sev">${tag}</span><span class="what">${esc(i.what)}</span><span class="fix">${esc(i.fix)}</span>${i.id && (!state.sel || state.sel.id !== i.id) ? `<button data-show="${i.id}">Show ${esc(byId(i.id).name)}</button>` : ""}</div>`;
}
function renderChecks() {
  const el = $("#pane-checks");
  if (!state.showChecks) {
    el.innerHTML = `
      <div class="eyebrow">Design rule check</div>
      <h3>Checks are paused while you build</h3>
      <p class="muted">Half-finished wiring always looks wrong, so the bench stays quiet until you ask. Wire everything first, then check it against the classic ESP32 pin rules.</p>
      <div class="actions"><button class="btn run" data-act="check">Check wiring</button></div>
      <p class="muted" style="margin-top:12px">Pressing <b>Run</b> also checks the wiring.</p>`;
    return;
  }
  const e = issues.filter(i => i.sev === "error").length, w = issues.filter(i => i.sev === "warn").length;
  el.innerHTML = `
    <div class="eyebrow">Design rule check</div>
    <h3>${e ? `${e} error${e > 1 ? "s" : ""} to fix` : w ? "Works, with warnings" : "Wiring looks good"}</h3>
    <p class="muted">Checked against the classic ESP32 pin rules${state.wifi ? " with Wi-Fi on" : " with Wi-Fi off"}. Errors stop that part in the simulation, just like on a real board.</p>
    ${issues.length ? `<div class="issues">${issues.map(issueHTML).join("")}</div>` : `<div class="allgood">No problems found.</div>`}
    <div class="actions"><button class="btn small" data-act="pausechecks">Hide checks while I build</button></div>`;
}
function renderStatus() {
  if (!state.showChecks) {
    $("#status").innerHTML = `<button class="chip info" data-act="check">Check wiring</button>`;
    const n = $("#checkCount");
    n.textContent = "off"; n.className = "n z";
    return;
  }
  const e = issues.filter(i => i.sev === "error").length, w = issues.filter(i => i.sev === "warn").length;
  $("#status").innerHTML = (e ? `<button class="chip err" data-goto="checks">${e} error${e > 1 ? "s" : ""}</button>` : "") +
    (w ? `<button class="chip warn" data-goto="checks">${w} warning${w > 1 ? "s" : ""}</button>` : "") +
    (!e && !w ? `<button class="chip ok" data-goto="checks">wiring OK</button>` : "");
  const n = $("#checkCount");
  n.textContent = e || w || "✓";
  n.className = "n" + (e ? "" : w ? " w" : " z");
  const mb = $("#mobileCheckBadge");
  if (mb) {
    mb.textContent = e || w || "";
    mb.hidden = (!e && !w);
  }
}
const WORLD = [
  ["light", "Ambient light", 0, 100, 1, "%", ["ldr"]],
  ["tilt", "Vehicle tilt (pitch)", -60, 60, 1, "°", ["mpu"]],
  ["airTemp", "Air temperature", -10, 50, 0.5, " °C", ["bme", "dht"]],
  ["humidity", "Humidity", 0, 100, 1, "%", ["bme", "dht"]],
  ["waterTemp", "Water temperature", 0, 30, 0.5, " °C", ["ds18"]],
  ["distance", "Distance to obstacle", 2, 200, 1, " cm", ["sonar"]],
  ["turbidity", "Turbidity", 0, 3000, 10, " NTU", ["turb"]],
];
function renderWorld() {
  $("#pane-world").innerHTML = `
    <div class="eyebrow">The world around the bench</div>
    <h3>Set what the sensors feel</h3>
    <p class="muted">Sliders marked with a part name feed a sensor on the bench. Knobs and buttons live on the parts themselves.</p>
    ${WORLD.map(([k, l, mn, mx, st, u, types]) => {
      const users = state.comps.filter(c => types.includes(c.type)).map(c => c.name);
      return `<label class="field"><span>${l}${users.length ? `<span class="world-used">${esc(users.join(", "))}</span>` : ""}</span><span class="row"><input type="range" id="env-${k}" data-env="${k}" min="${mn}" max="${mx}" step="${st}" value="${state.env[k]}"><output>${state.env[k]}${u}</output></span></label>`;
    }).join("")}`;
}

// ═════════════════════════ editing ═════════════════════════
let uid = 1;
function nextName(type) {
  const short = T[type] ? T[type].short : "esp";
  let i = 1;
  while (state.comps.some(c => c.name === short + i)) i++;
  return short + i;
}
function addComp(type, x, z, props = {}, id, name, rot = 0) {
  const c = { id: id || "c" + (uid++), type, x, z, rot, name: name || nextName(type), props: Object.assign({}, (T[type] && T[type].props) || {}, props) };
  state.comps.push(c);
  buildComp(c);
  return c;
}
function freeSpot() {
  for (let r = 9; r < 24; r += 2.5) for (let a = 0; a < 16; a++) {
    const ang = Math.PI / 2 + (a % 2 ? 1 : -1) * Math.ceil(a / 2) * 0.42;
    const x = Math.round(Math.cos(ang) * r * 1.35 * 2) / 2, z = Math.round(Math.sin(ang) * r * 0.9 * 2) / 2;
    if (Math.abs(x) > MAT_W / 2 - 3 || Math.abs(z) > MAT_D / 2 - 3) continue;
    if (state.comps.every(c => Math.hypot(c.x - x, c.z - z) > 5.5)) return [x, z];
  }
  return [0, 12];
}
function addWire(a, b, color) {
  if (a === b) return null;
  if (state.wires.some(w => (w.a === a && w.b === b) || (w.a === b && w.b === a))) return null;
  const w = { id: "w" + (uid++), a, b, color: color || wireColorFor(a, b) };
  state.wires.push(w);
  buildWire(w);
  return w;
}
function removeWire(id) {
  const i = state.wires.findIndex(w => w.id === id);
  if (i < 0) return;
  const w = state.wires[i];
  scene.remove(w.group); w.group.traverse(o => o.geometry && o.geometry.dispose());
  state.wires.splice(i, 1);
}
function removeComp(id) {
  if (id === "esp") return;
  state.wires.filter(w => w.a.startsWith(id + ":") || w.b.startsWith(id + ":")).forEach(w => removeWire(w.id));
  const c = byId(id);
  if (!c) return;
  destroyComp(c);
  state.comps.splice(state.comps.indexOf(c), 1);
  state.comps.forEach(o => { if (o.props && o.props.src === id) o.props.src = "manual"; });
}
function clearBench() {
  state.wires.slice().forEach(w => removeWire(w.id));
  state.comps.slice().forEach(c => { destroyComp(c); });
  state.comps = [];
  state.sel = null; state.pending = null;
  selRing.visible = false;
}
function changed(opts = {}) {
  validate();
  renderStatus();
  if (opts.inspector !== false) renderInspector();
  if (activeTab === "checks") renderChecks();
  if (activeTab === "code") renderCode();
  if (activeTab === "world" && opts.world) renderWorld();
  updateHint();
  save();
}

// selection ring
const selRing = new THREE.LineLoop(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xe48b48 }));
selRing.visible = false;
scene.add(selRing);
function updateSelRing() {
  const s = state.sel;
  if (!s || s.kind !== "comp") { selRing.visible = false; return; }
  const c = byId(s.id);
  if (!c) { selRing.visible = false; return; }
  c.anim.badge.visible = false;
  const bb = new THREE.Box3().setFromObject(c.group);
  const sev = compSev.get(c.id);
  c.anim.badge.visible = state.showChecks && (sev === "error" || sev === "warn");
  const p = 0.35, y = 0.03;
  selRing.geometry.setFromPoints([
    new THREE.Vector3(bb.min.x - p, y, bb.min.z - p), new THREE.Vector3(bb.max.x + p, y, bb.min.z - p),
    new THREE.Vector3(bb.max.x + p, y, bb.max.z + p), new THREE.Vector3(bb.min.x - p, y, bb.max.z + p)]);
  selRing.visible = true;
}
function select(sel) {
  const prev = state.sel;
  if (prev && prev.kind === "wire") { const w = state.wires.find(x => x.id === prev.id); if (w && w.mat) w.mat.emissive.set(0); }
  state.sel = sel;
  if (sel && sel.kind === "wire") { const w = state.wires.find(x => x.id === sel.id); if (w) w.mat.emissive = new THREE.Color(WIRE_COLORS[w.color]).multiplyScalar(0.45); }
  updateSelRing();
  renderInspector();
  if (sel) showTab("inspect");
  updateHint();
}

// ═════════════════════════ pointer interaction ═════════════════════════
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let down = null, drag = null, hoverPin = null, ghost = null;
function setNdc(ev) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
}
function pick(ev) {
  setNdc(ev);
  const targets = [];
  state.comps.forEach(c => targets.push(c.group));
  state.wires.forEach(w => w.group && targets.push(w.group));
  const hits = ray.intersectObjects(targets, true);
  for (const h of hits) {
    const u = h.object.userData;
    if (u.pinKey) return { kind: "pin", key: u.pinKey, point: h.point };
    if (u.press) return { kind: "press", id: u.press, point: h.point };
    if (u.wireId) return { kind: "wire", id: u.wireId, point: h.point };
    if (u.compId) return { kind: "comp", id: u.compId, point: h.point };
  }
  return null;
}
function benchPoint(ev, y = 0) {
  setNdc(ev);
  const p = new THREE.Vector3();
  benchPlane.constant = -y;
  return ray.ray.intersectPlane(benchPlane, p) ? p : null;
}
canvas.addEventListener("pointerdown", ev => {
  if (ev.button !== 0) return;
  const hit = pick(ev);
  down = { x: ev.clientX, y: ev.clientY, hit };
  if (hit && hit.kind === "comp") {
    controls.enabled = false;
    const c = byId(hit.id), p = benchPoint(ev);
    if (p) down.offset = new THREE.Vector3(c.x - p.x, 0, c.z - p.z);
    canvas.setPointerCapture(ev.pointerId);
  } else if (hit && (hit.kind === "pin" || hit.kind === "press")) controls.enabled = false;
}, { capture: true });
canvas.addEventListener("pointermove", ev => {
  if (down && down.hit && down.hit.kind === "comp" && down.offset) {
    const moved = Math.hypot(ev.clientX - down.x, ev.clientY - down.y);
    if (moved > 4 || drag) {
      const c = byId(down.hit.id), p = benchPoint(ev);
      if (p) {
        drag = c;
        c.x = clamp(Math.round((p.x + down.offset.x) * 2) / 2, -MAT_W / 2 + 1, MAT_W / 2 - 1);
        c.z = clamp(Math.round((p.z + down.offset.z) * 2) / 2, -MAT_D / 2 + 1, MAT_D / 2 - 1);
        c.group.position.set(c.x, 0, c.z);
        rebuildWiresFor(c.id);
        if (state.sel && state.sel.id === c.id) updateSelRing();
        canvas.style.cursor = "grabbing";
      }
      return;
    }
  }
  const hit = down ? null : pick(ev);
  const hp = hit && hit.kind === "pin" ? hit.key : null;
  if (hp !== hoverPin) { setPinHover(hoverPin, false); hoverPin = hp; setPinHover(hoverPin, true); }
  canvas.style.cursor = hit ? (hit.kind === "comp" ? "grab" : "pointer") : (state.pending ? "crosshair" : "default");
  showTip(ev, hit);
  if (state.pending) updateGhost(ev, hit);
});
canvas.addEventListener("pointerup", ev => {
  controls.enabled = true;
  if (!down) return;
  const moved = Math.hypot(ev.clientX - down.x, ev.clientY - down.y);
  const hit = down.hit;
  if (drag) { drag = null; down = null; canvas.style.cursor = "grab"; changed({ inspector: false }); return; }
  down = null;
  if (moved > 5) return;
  if (!hit) { if (state.pending) cancelPending(); else select(null); return; }
  if (hit.kind === "pin") {
    if (!state.pending) { state.pending = hit.key; setPinHover(hit.key, true); updateHint(); return; }
    if (state.pending === hit.key) { cancelPending(); return; }
    const w = addWire(state.pending, hit.key);
    cancelPending();
    if (w) { changed(); flashHint(`Jumper: ${pinTitle(w.a)} → ${pinTitle(w.b)}`); }
    else flashHint("Those two pins are already connected.");
    return;
  }
  if (state.pending) { cancelPending(); return; }
  if (hit.kind === "press") {
    const c = byId(hit.id); c.props.pressed = !c.props.pressed;
    if (state.sel && state.sel.id === c.id) renderInspector();
    save();
    return;
  }
  if (hit.kind === "wire") return select({ kind: "wire", id: hit.id });
  if (hit.kind === "comp") return select({ kind: "comp", id: hit.id });
});
canvas.addEventListener("pointerleave", () => { $("#tip").hidden = true; setPinHover(hoverPin, false); hoverPin = null; });

function setPinHover(key, on) {
  if (!key) return;
  const [id, pin] = key.split(":");
  const c = byId(id);
  if (!c || !c.pins[pin]) return;
  const hot = on || state.pending === key;
  c.pins[pin].pin.material.emissive.set(hot ? 0xff8a3c : 0x000000);
  c.pins[pin].pin.material.emissiveIntensity = hot ? 1.2 : 0;
  c.pins[pin].pin.scale.set(hot ? 1.6 : 1, 1, hot ? 1.6 : 1);
}
function cancelPending() {
  const p = state.pending;
  state.pending = null;
  setPinHover(p, false);
  if (ghost) { scene.remove(ghost); ghost.geometry.dispose(); ghost = null; }
  updateHint();
}
function updateGhost(ev, hit) {
  const a = pinTop(state.pending);
  if (!a) return;
  let b = hit && hit.kind === "pin" ? pinTop(hit.key) : benchPoint(ev, 1.2);
  if (!b) return;
  const mid = a.clone().lerp(b, 0.5); mid.y += 1 + a.distanceTo(b) * 0.12;
  const pts = new THREE.QuadraticBezierCurve3(a, mid, b).getPoints(30);
  if (!ghost) {
    ghost = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: 0xff8a3c, dashSize: 0.3, gapSize: 0.2 }));
    scene.add(ghost);
  }
  ghost.geometry.setFromPoints(pts);
  ghost.computeLineDistances();
}
function showTip(ev, hit) {
  const tip = $("#tip");
  if (!hit || (hit.kind !== "pin" && hit.kind !== "press" && hit.kind !== "wire")) { tip.hidden = true; return; }
  let html = "";
  if (hit.kind === "pin") {
    const m = pinMeta(hit.key);
    const n = nets && nets.of(hit.key);
    const links = n ? n.keys.filter(k => k !== hit.key).map(pinTitle) : [];
    if (m.c.type === "esp32") {
      html = `<b>${esc(m.gpio != null ? "GPIO " + m.gpio : espLabel(m.pin))}</b> · ${esc(espLabel(m.pin))}`;
      if (m.gpio != null) html += `<div class="tags">${gpioTags(m.gpio).map(([t, k]) => `<span class="tag ${k}">${esc(t)}</span>`).join("")}</div>`;
      else html += `<div>${{ "3v3": "3.3 V out from the regulator, ~600 mA total", vin: "5 V from USB (or input 5–12 V)", gnd: "Ground", en: "Reset: LOW = chip held in reset" }[m.kind]}</div>`;
    } else html = `<b>${esc(m.c.name)} · ${esc(m.pin)}</b><div>${esc(m.desc)}</div>`;
    html += `<div style="margin-top:4px;opacity:.8">${links.length ? "→ " + esc(links.join(", ")) : state.pending ? "Click to connect" : "Click to start a jumper"}</div>`;
  } else if (hit.kind === "press") html = "<b>Button cap</b><div>Click to press / release</div>";
  else { const w = state.wires.find(x => x.id === hit.id); html = `<b>Jumper</b><div>${esc(pinTitle(w.a))} → ${esc(pinTitle(w.b))}</div>`; }
  tip.innerHTML = html;
  tip.hidden = false;
  const r = stage.getBoundingClientRect();
  const x = ev.clientX - r.left + 16, y = ev.clientY - r.top + 14;
  tip.style.left = Math.min(x, r.width - tip.offsetWidth - 8) + "px";
  tip.style.top = Math.min(y, r.height - tip.offsetHeight - 8) + "px";
}

let hintTimer = 0;
function updateHint() {
  const h = $("#hint");
  if (hintTimer) return;
  h.classList.toggle("wiring", !!state.pending);
  if (state.pending) h.innerHTML = `Jumper from <b>${esc(pinTitle(state.pending))}</b>. Click another pin to connect, <span class="kbd">Esc</span> to cancel.`;
  else if (state.sel && state.sel.kind === "comp") h.innerHTML = `<b>${esc(byId(state.sel.id)?.name || "")}</b> selected. Drag to move, <span class="kbd">R</span> rotate, <span class="kbd">Del</span> remove.`;
  else if (state.sel && state.sel.kind === "wire") h.innerHTML = `Jumper selected. <span class="kbd">Del</span> removes it.`;
  else h.innerHTML = `Click a <b>pin</b> to start a jumper. Drag a part to move it. Drag the mat to orbit, two fingers to pan, pinch or scroll wheel to zoom.`;
}
function flashHint(text) {
  const h = $("#hint");
  clearTimeout(hintTimer);
  h.textContent = text;
  hintTimer = setTimeout(() => { hintTimer = 0; updateHint(); }, 1800);
}

window.addEventListener("keydown", ev => {
  if (ev.target.closest && ev.target.closest("input, select, textarea")) return;
  if (ev.key === "Escape") { if (state.pending) cancelPending(); else select(null); }
  if ((ev.key === "Delete" || ev.key === "Backspace") && state.sel) { ev.preventDefault(); deleteSelection(); }
  if ((ev.key === "r" || ev.key === "R") && state.sel && state.sel.kind === "comp") rotateSelection();
});
function deleteSelection() {
  const s = state.sel;
  if (!s) return;
  if (s.kind === "wire") removeWire(s.id);
  else if (s.id === "esp") { flashHint("The ESP32 stays. It's the whole point."); return; }
  else removeComp(s.id);
  state.sel = null; selRing.visible = false;
  changed();
}
function rotateSelection() {
  const c = byId(state.sel.id);
  c.rot = ((c.rot || 0) + 1) % 4;
  c.group.rotation.y = c.rot * Math.PI / 2;
  c.group.updateMatrixWorld(true);
  rebuildWiresFor(c.id);
  updateSelRing();
  save();
}

// ═════════════════════════ panel events ═════════════════════════
document.addEventListener("click", ev => {
  const t = ev.target.closest("[data-add],[data-act],[data-show],[data-goto],[data-wcolor],.tab");
  if (!t) return;
  if (t.dataset.add) {
    const [x, z] = freeSpot();
    const c = addComp(t.dataset.add, x, z);
    changed({ world: true });
    select({ kind: "comp", id: c.id });
    flashHint(`${c.name} placed. Click pins to wire it.`);
    if (window.innerWidth <= 900) setMobileView("bench");
  } else if (t.dataset.act === "delete") deleteSelection();
  else if (t.dataset.act === "rotate") rotateSelection();
  else if (t.dataset.act === "check") { setChecks(true); showTab("checks"); if (window.innerWidth <= 900) setMobileView("panel"); }
  else if (t.dataset.act === "pausechecks") setChecks(false);
  else if (t.dataset.show) { select({ kind: "comp", id: t.dataset.show }); if (window.innerWidth <= 900) setMobileView("bench"); }
  else if (t.dataset.goto) {
    showTab(t.dataset.goto);
    if (window.innerWidth <= 900) setMobileView("panel");
  }
  else if (t.dataset.wcolor) {
    const w = state.wires.find(x => x.id === state.sel.id);
    w.color = t.dataset.wcolor; buildWire(w); renderInspector(); save();
  } else if (t.classList.contains("tab")) {
    showTab(t.dataset.tab);
  }
});
document.addEventListener("input", ev => {
  const el = ev.target;
  if (el.dataset.env) {
    const k = el.dataset.env;
    state.env[k] = +el.value;
    const w = WORLD.find(x => x[0] === k);
    el.nextElementSibling.textContent = state.env[k] + w[5];
    save();
    return;
  }
  if (el.dataset.prop && state.sel) {
    const c = byId(state.sel.id);
    const k = el.dataset.prop;
    const v = el.type === "checkbox" ? el.checked : el.type === "range" ? +el.value : el.value;
    c.props[k] = v;
    if (el.type === "range") {
      const out = el.nextElementSibling;
      out.textContent = k === "value" ? Math.round(v * 3300) + " mV" : k === "manual" && c.type === "servo" ? Math.round(v * 180) + "°" : Math.round(v * 100) + "%";
      save();
      if (activeTab === "code") renderCode();
      return;
    }
    if (k === "color") { c.anim.ledMat.color = new THREE.Color(v).multiplyScalar(0.55); c.anim.ledMat.emissive = new THREE.Color(v); c.anim.glow.material.color = new THREE.Color(v); }
    changed({ inspector: k === "src" || k === "divider" || k === "leak" });
  }
});
$("#wifi").addEventListener("change", ev => {
  state.wifi = ev.target.checked;
  ev.target.parentElement.lastChild.textContent = state.wifi ? "Wi-Fi on" : "Wi-Fi off";
  changed();
  if (state.running) serialPrint(state.wifi ? "# Wi-Fi: STA started (ADC2 now unavailable)" : "# Wi-Fi: stopped");
});
$("#run").addEventListener("click", () => {
  state.running = !state.running;
  if (state.running && !state.showChecks) setChecks(true);
  const b = $("#run");
  b.setAttribute("aria-pressed", String(state.running));
  $("#runLabel").textContent = state.running ? "Stop" : "Run";
  $("#runIcon").setAttribute("d", state.running ? "M2 1h8v10H2z" : "M2 1l9 5-9 5z");
  if (state.running) { simT = 0; serialAcc = 0; brownoutUntil = 0; brownoutAcc = 0; serialLines = []; bootLog(); showTab("serial"); }
  else { serialPrint("# stopped"); renderInspector(); }
});
$("#serialClear").addEventListener("click", () => { serialLines = []; renderSerial(); });
$("#serialPause").addEventListener("click", ev => { serialPaused = !serialPaused; ev.target.textContent = serialPaused ? "Resume" : "Pause"; if (!serialPaused) renderSerial(); });
$("#copyCode").addEventListener("click", async ev => {
  const src = $("#codeOut").dataset.src || "";
  try { await navigator.clipboard.writeText(src); ev.target.textContent = "Copied"; }
  catch { const r = document.createRange(); r.selectNodeContents($("#codeOut")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); ev.target.textContent = "Selected: press Ctrl+C"; }
  setTimeout(() => ev.target.textContent = "Copy sketch", 1800);
});
$("#resetView").addEventListener("click", () => resetView(false));
$("#topView").addEventListener("click", () => resetView(true));
$("#jumpToParts")?.addEventListener("click", () => $(".lib")?.scrollIntoView({ behavior: "smooth" }));
$("#jumpToPanel")?.addEventListener("click", () => $(".panel")?.scrollIntoView({ behavior: "smooth" }));
$("#jumpToBench")?.addEventListener("click", () => $("#stage")?.scrollIntoView({ behavior: "smooth" }));
$("#preset").addEventListener("change", ev => { loadPreset(ev.target.value); });

// ═════════════════════════ presets ═════════════════════════
const PRESETS = {
  bottle: {
    note: "The course project: leak switch, strobe, throttle pot, IMU, drop-weight servo and a thruster through a TB6612.",
    comps: [
      ["mpu", "mpu1", 9.5, -5.5], ["servo", "servo1", 10.5, 3.5, { src: "mpu1" }],
      ["pot", "pot1", -10, -8], ["button", "btn1", -10, -2.5], ["led", "led1", -10, 2, { src: "btn1", blink: true, color: "#ffb020" }],
      ["driver", "drv1", -9.5, 8.5], ["motor", "thr1", -20, 8.5, { src: "pot1" }], ["battery", "bat1", -1.5, 13.5],
    ],
    wires: [
      ["mpu1:VCC", "esp:3V3"], ["mpu1:GND", "esp:GND2"], ["mpu1:SCL", "esp:22"], ["mpu1:SDA", "esp:21"],
      ["servo1:GND", "esp:GND2"], ["servo1:VCC", "esp:VIN"], ["servo1:SIG", "esp:18"],
      ["pot1:VCC", "esp:3V3"], ["pot1:OUT", "esp:34"], ["pot1:GND", "esp:GND"],
      ["btn1:SIG", "esp:27"], ["btn1:GND", "esp:GND"], ["led1:SIG", "esp:25"], ["led1:GND", "esp:GND"],
      ["drv1:PWMA", "esp:26"], ["drv1:AIN1", "esp:32"], ["drv1:AIN2", "esp:33"], ["drv1:STBY", "esp:3V3"], ["drv1:VCC", "esp:3V3"],
      ["drv1:GND", "esp:GND"], ["drv1:VM", "bat1:BAT+"], ["bat1:BAT-", "drv1:GND"], ["drv1:AO1", "thr1:M+"], ["drv1:AO2", "thr1:M-"],
    ],
    env: { tilt: 8 },
  },
  weather: {
    note: "BME280 on I²C, LDR on ADC1, DHT22, a night light and a heat alarm.",
    comps: [["bme", "bme1", 9.5, -5], ["dht", "dht1", 9.5, 3], ["ldr", "ldr1", -9.5, -6], ["led", "led1", -9.5, 1, { src: "ldr1", invert: true, color: "#f4f4ff" }], ["buzzer", "buz1", 9.5, 10, { src: "bme1", threshold: 0.6 }]],
    wires: [["bme1:VCC", "esp:3V3"], ["bme1:GND", "esp:GND2"], ["bme1:SCL", "esp:22"], ["bme1:SDA", "esp:21"],
      ["dht1:VCC", "esp:3V3"], ["dht1:DATA", "esp:4"], ["dht1:GND", "esp:GND2"],
      ["ldr1:VCC", "esp:3V3"], ["ldr1:GND", "esp:GND"], ["ldr1:AO", "esp:35"], ["led1:SIG", "esp:32"], ["led1:GND", "esp:GND"],
      ["buz1:SIG", "esp:23"], ["buz1:GND", "esp:GND2"]],
    env: { light: 25, airTemp: 26 },
  },
  parking: {
    note: "HC-SR04 at 5 V with a divider on ECHO. The LED and buzzer get louder as you get closer.",
    comps: [["sonar", "sonar1", 10, -4, { divider: true }], ["buzzer", "buz1", 10, 4, { src: "sonar1", invert: true, threshold: 0.85 }], ["led", "led1", -9.5, -2, { src: "sonar1", invert: true }]],
    wires: [["sonar1:VCC", "esp:VIN"], ["sonar1:TRIG", "esp:19"], ["sonar1:ECHO", "esp:18"], ["sonar1:GND", "esp:GND2"],
      ["buz1:SIG", "esp:23"], ["buz1:GND", "esp:GND2"], ["led1:SIG", "esp:25"], ["led1:GND", "esp:GND"]],
    env: { distance: 40 },
  },
  bugs: {
    note: "Six wiring mistakes students really make. Open Checks and fix them one by one.",
    comps: [["mpu", "mpu1", 9.5, -6], ["sonar", "sonar1", 10, 2], ["servo", "servo1", 10.5, 9.5, { src: "pot1" }],
      ["pot", "pot1", -10, -7], ["led", "led1", -10, -1.5, { src: "pot1" }], ["motor", "thr1", -13, 7.5, { src: "pot1" }]],
    wires: [["mpu1:VCC", "esp:3V3"], ["mpu1:SCL", "esp:22"], ["mpu1:SDA", "esp:21"],
      ["sonar1:VCC", "esp:VIN"], ["sonar1:TRIG", "esp:12"], ["sonar1:ECHO", "esp:19"], ["sonar1:GND", "esp:GND2"],
      ["servo1:GND", "esp:GND2"], ["servo1:VCC", "esp:3V3"], ["servo1:SIG", "esp:18"],
      ["pot1:VCC", "esp:3V3"], ["pot1:OUT", "esp:25"], ["pot1:GND", "esp:GND"],
      ["led1:SIG", "esp:34"], ["led1:GND", "esp:GND"], ["thr1:M+", "esp:26"], ["thr1:M-", "esp:GND"]],
  },
  empty: { note: "Just the DevKit. Checks stay quiet while you wire. Press Check wiring when you're done.", comps: [], wires: [] },
};
const DEFAULT_ENV = { light: 55, tilt: 0, airTemp: 24, humidity: 48, waterTemp: 6, distance: 60, turbidity: 350 };
function setChecks(on) {
  state.showChecks = on;
  changed();
  flashHint(on ? "Checks on: problems show on the parts and in the Checks tab." : "Checks paused. Press Check wiring when you're done.");
}
function loadPreset(name) {
  const p = PRESETS[name];
  clearBench();
  state.showChecks = name !== "empty";
  addComp("esp32", 0, 0, {}, "esp", "esp1");
  p.comps.forEach(([type, nm, x, z, props]) => addComp(type, x, z, props, nm, nm));
  state.env = Object.assign({}, DEFAULT_ENV, p.env || {});
  state.comps.forEach(c => c.group.updateMatrixWorld(true));
  p.wires.forEach(([a, b]) => addWire(a, b));
  $("#preset").value = name;
  changed({ world: true });
  if (activeTab === "world") renderWorld();
  flashHint(p.note);
  resetView(false);
}

// ═════════════════════════ save / restore (this browser only) ═════════════════════════
let saveTimer = 0;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem("esp32bench.v1", JSON.stringify({
        preset: $("#preset").value, wifi: state.wifi, env: state.env, showChecks: state.showChecks,
        comps: state.comps.map(c => ({ id: c.id, type: c.type, name: c.name, x: c.x, z: c.z, rot: c.rot, props: c.props })),
        wires: state.wires.map(w => ({ a: w.a, b: w.b, color: w.color })),
      }));
    } catch (e) { /* storage unavailable: the bench still works */ }
  }, 300);
}
function restore() {
  let data = null;
  try { data = JSON.parse(localStorage.getItem("esp32bench.v1") || "null"); } catch (e) { data = null; }
  if (!data || !Array.isArray(data.comps) || !data.comps.some(c => c.type === "esp32")) return false;
  try {
    clearBench();
    data.comps.forEach(c => { if (c.type === "esp32" || T[c.type]) addComp(c.type, c.x, c.z, c.props, c.id, c.name, c.rot); });
    const maxId = Math.max(0, ...data.comps.map(c => +(/^c(\d+)$/.exec(c.id) || [0, 0])[1]));
    uid = maxId + 1;
    state.comps.forEach(c => c.group.updateMatrixWorld(true));
    data.wires.forEach(w => { if (pinMeta(w.a) && pinMeta(w.b)) addWire(w.a, w.b, w.color); });
    state.wifi = data.wifi !== false;
    $("#wifi").checked = state.wifi;
    $("#wifi").parentElement.lastChild.textContent = state.wifi ? "Wi-Fi on" : "Wi-Fi off";
    state.env = Object.assign({}, DEFAULT_ENV, data.env || {});
    if (data.preset) $("#preset").value = data.preset;
    state.showChecks = data.showChecks != null ? data.showChecks : data.preset !== "empty";
    changed({ world: true });
    return true;
  } catch (e) { return false; }
}

// ═════════════════════════ render loop ═════════════════════════
function resize() {
  const r = stage.getBoundingClientRect();
  renderer.setSize(r.width, r.height, false);
  camera.aspect = r.width / Math.max(1, r.height);
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage);
const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  controls.update();
  tickSim(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

// ═════════════════════════ boot ═════════════════════════
async function start() {
  try { await Promise.race([Promise.all([document.fonts.load('600 16px "IBM Plex Mono"'), document.fonts.load('500 16px "IBM Plex Mono"')]), new Promise(r => setTimeout(r, 1500))]); } catch (e) {}
  applyTheme();
  renderLibrary();
  resize();
  resetView(false);
  const fromHash = location.hash.slice(1);
  if (PRESETS[fromHash]) loadPreset(fromHash);        // e.g. index.html#bugs
  else if (!restore()) loadPreset("bottle");
  renderStatus();
  renderInspector();
  updateHint();
  $("#loading").hidden = true;
  frame();
}
start();
})();
