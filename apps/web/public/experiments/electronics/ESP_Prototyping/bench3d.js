// ESP32 Prototype Bench: obstacle blocks, real ultrasonic ranging, and the 3D oscilloscope + multimeter behind the mat with probes on the pins.
(() => {
"use strict";
const B = window.Bench;
const { T, ext, M, std, mesh, boxM, cylM, clamp, esc, scene } = B;
const CM_PER_UNIT = 0.508;                   // 0.1" pin pitch = 0.5 units
const MAX_CM = 400, CEILING_CM = 150;        // HC-SR04 range; the room ceiling above the desk
const HALF_CONE = 7.5 * Math.PI / 180;       // 15° beam
const TABLE_Y = -0.125;

function labelTex(text, bg, fg, w = 256, h = 96) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d");
  g.fillStyle = bg; g.beginPath(); g.roundRect ? g.roundRect(4, 4, w - 8, h - 8, 18) : g.rect(4, 4, w - 8, h - 8); g.fill();
  g.strokeStyle = "rgba(255,255,255,.85)"; g.lineWidth = 5; g.stroke();
  g.fillStyle = fg; g.font = `700 ${h * 0.46}px "IBM Plex Mono", monospace`; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(text, w / 2, h / 2 + 2);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
  return t;
}
function sprite(tex, sx, sy) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  s.scale.set(sx, sy, 1); s.renderOrder = 12;
  return s;
}

// ═════════════════════════ obstacle block ═════════════════════════
B.CATS.push("Objects");
const SIZES = {
  box:   { dim: [7, 6, 6],     label: "Cardboard box · 14 × 12 × 12 cm", color: 0xb88a54 },
  tall:  { dim: [5, 12, 5],    label: "Tall box · 10 × 24 × 10 cm",      color: 0xa9793f },
  wall:  { dim: [18, 10, 1.6], label: "Wall panel · 36 × 20 cm",        color: 0xe8e4da },
  small: { dim: [3, 3, 3],     label: "Small block · 6 cm cube",         color: 0x4f7fbf },
};
T.obstacle = { name: "Obstacle block", short: "box", cat: "Objects", blurb: "Something for the ultrasonic to see. Drag it anywhere, even off the mat.", w: 7, d: 6, color: 0xb88a54,
  board: false, passive: true, object: true, pins: [], props: { size: "box" } };
B.BUILD.obstacle = (c, g) => {
  const sz = SIZES[c.props.size] || SIZES.box, [w, h, d] = sz.dim;
  const kraft = new THREE.Color(sz.color);
  const side = std(kraft, { roughness: 0.92 });
  const top = new THREE.MeshStandardMaterial({ roughness: 0.9, map: B.canvasTex(w, d, B.hex6(sz.color), (gx, S, X, Z) => {
    if (c.props.size === "box" || c.props.size === "tall") {
      gx.fillStyle = "rgba(214,190,140,.85)"; gx.fillRect(X(-0.6), 0, S * 1.2, d * S);                    // packing tape
      gx.strokeStyle = "rgba(90,60,30,.35)"; gx.lineWidth = S * 0.04; gx.beginPath(); gx.moveTo(X(0), 0); gx.lineTo(X(0), d * S); gx.stroke();
    }
    B.silk(gx, S, c.name.toUpperCase(), X(0), Z(d / 2 - 0.6), 0.45, "center", "rgba(40,30,20,.75)", 700);
  }, 36) });
  const body = mesh(new THREE.BoxGeometry(w, h, d), [side, side, top, side, side, side], 0, h / 2, 0);
  body.userData.solid = true;
  g.add(body);
};
ext.controls.obstacle = c => `<label class="field"><span>Size</span><select id="p-size" data-prop="size">${Object.entries(SIZES).map(([k, v]) => `<option value="${k}" ${c.props.size === k ? "selected" : ""}>${esc(v.label)}</option>`).join("")}</select></label>
  <p class="muted" style="margin:4px 0 0">Drag the block into an ultrasonic beam. It can leave the mat: the sensor reaches 4 m.</p>`;
ext.live.obstacle = c => {
  const seen = sonars().filter(s => s.props.range === "obstacle").map(s => ({ s, r: ranges.get(s.id) })).filter(x => x.r && x.r.by === c.id);
  return seen.length ? seen.map(x => `${x.s.name} sees it at ${x.r.cm.toFixed(1)} cm`).join(" · ") : "No ultrasonic beam hits it. Drag it in front of an upright HC-SR04.";
};
// drop a new block straight in front of the first sensor
ext.place.obstacle = () => {
  const s = sonars().find(x => x.props.range === "obstacle");
  if (!s) return null;
  const { o, d } = beamOf(s);
  if (Math.abs(d.y) > 0.7) return null;
  const p = o.clone().addScaledVector(d, 12 / CM_PER_UNIT);
  return [Math.round(p.x * 2) / 2, Math.round(p.z * 2) / 2];
};

// ═════════════════════════ HC-SR04 upright mount ═════════════════════════
// Board stands in a socket, transducers face away from the pins: the beam runs parallel to the mat.
ext.postBuild.sonar = (c, g) => {
  if (c.props.mount !== "upright") return;
  const sub = new THREE.Group();
  g.children.slice().forEach(o => { if (!o.userData.pinKey && o.material !== M.header) sub.add(o); });
  sub.rotation.x = -Math.PI / 2;               // (x, y, z) → (x, z + 1.55, 0.55 − y)
  sub.position.set(0, 1.55, 0.55);
  g.add(sub);
  g.add(boxM(4.9, 0.3, 0.95, M.header, 0, 0.15, 0.78));   // right-angle socket the board stands in
  for (const x of [-2.1, 2.1]) g.add(boxM(0.25, 1.1, 0.5, std(0x2b2b2b), x, 0.55, 0.62)); // side brackets
};
const sonars = () => B.state.comps.filter(c => c.type === "sonar");
function beamOf(c) {
  const up = c.props.mount === "upright";
  c.group.updateMatrixWorld(true);
  const o = new THREE.Vector3(0, up ? 1.3 : 1.1, up ? -0.55 : -0.25).applyMatrix4(c.group.matrixWorld);
  const d = new THREE.Vector3(0, up ? 0 : 1, up ? -1 : 0).transformDirection(c.group.matrixWorld);
  return { o, d };
}

// ═════════════════════════ ranging ═════════════════════════
const ray = new THREE.Raycaster();
const ranges = new Map();                    // sonar id → { cm, by, point, o, d, len }
const CONE = [[0, 0]];
for (const [ang, n] of [[HALF_CONE / 2, 6], [HALF_CONE, 10]]) for (let i = 0; i < n; i++) CONE.push([ang, i / n * Math.PI * 2]);
function measure(c) {
  const { o, d } = beamOf(c);
  const solids = [], owner = new Map();
  B.state.comps.forEach(x => { if (T[x.type] && T[x.type].object && x.group) x.group.traverse(m => { if (m.userData.solid) { solids.push(m); owner.set(m, x.id); } }); });
  const a = new THREE.Vector3(Math.abs(d.y) > 0.9 ? 1 : 0, Math.abs(d.y) > 0.9 ? 0 : 1, 0).cross(d).normalize();
  const b = new THREE.Vector3().crossVectors(d, a);
  let best = Infinity, by = null, point = null;
  const dir = new THREE.Vector3();
  for (const [ang, phi] of CONE) {
    dir.copy(d).multiplyScalar(Math.cos(ang)).addScaledVector(a, Math.sin(ang) * Math.cos(phi)).addScaledVector(b, Math.sin(ang) * Math.sin(phi)).normalize();
    ray.set(o, dir); ray.far = MAX_CM / CM_PER_UNIT;
    const h = solids.length ? ray.intersectObjects(solids, false)[0] : null;
    if (h && h.distance < best) { best = h.distance; by = owner.get(h.object); point = h.point.clone(); }
  }
  let ceiling = false;
  if (!point && d.y > 0.5) {                 // pointing up: the ceiling answers
    const dist = (CEILING_CM / CM_PER_UNIT - o.y) / d.y;
    if (dist * CM_PER_UNIT <= MAX_CM) { best = dist; ceiling = true; point = o.clone().addScaledVector(d, dist); }
  }
  const cm = point ? best * CM_PER_UNIT : null;
  return { cm, by, point, o, d, ceiling, len: point ? best : 60 };
}
B.rangeFor = c => { let r = ranges.get(c.id); if (!r) { r = measure(c); ranges.set(c.id, r); } return r.cm; };

// beam cones + hit markers
const coneGeo = new THREE.ConeGeometry(1, 1, 36, 1, true);
coneGeo.translate(0, -0.5, 0); coneGeo.rotateX(-Math.PI / 2);   // apex at the origin, opening along +z
const beams = new Map();
function beamFor(c) {
  let v = beams.get(c.id);
  if (v) return v;
  const cone = new THREE.Mesh(coneGeo, new THREE.MeshBasicMaterial({ color: 0x5fc8ff, transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide }));
  cone.renderOrder = 3;
  const axis = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, 1)]), new THREE.LineDashedMaterial({ color: 0x5fc8ff, dashSize: 0.5, gapSize: 0.35, transparent: true, opacity: 0.8 }));
  axis.computeLineDistances();
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.6, 32), new THREE.MeshBasicMaterial({ color: 0xff8a3c, side: THREE.DoubleSide, transparent: true, opacity: 0.95, depthWrite: false }));
  ring.renderOrder = 4;
  const tag = sprite(labelTex("", "#1d3a57", "#fff"), 3.2, 1.2);
  v = { cone, axis, ring, tag, text: null };
  scene.add(cone, axis, ring, tag);
  beams.set(c.id, v);
  return v;
}
function dropBeam(id) { const v = beams.get(id); if (!v) return; scene.remove(v.cone, v.axis, v.ring, v.tag); v.tag.material.map.dispose(); beams.delete(id); }
function updateBeams(t) {
  const live = new Set();
  for (const c of sonars()) {
    if (c.props.range !== "obstacle" || !c.group) continue;
    const r = measure(c);
    ranges.set(c.id, r);
    live.add(c.id);
    const v = beamFor(c), len = r.len;
    const run = B.state.running;
    v.cone.position.copy(r.o); v.cone.lookAt(r.o.clone().add(r.d));
    const rad = Math.tan(HALF_CONE) * len;
    v.cone.scale.set(rad, rad, len);
    v.cone.material.opacity = (run ? 0.12 + 0.07 * (0.5 + 0.5 * Math.sin(t * 16.7)) : 0.08) * (r.point ? 1 : 0.55);
    v.axis.position.copy(r.o); v.axis.lookAt(r.o.clone().add(r.d)); v.axis.scale.set(1, 1, len);
    v.axis.material.dashSize = 0.5 / len; v.axis.material.gapSize = 0.35 / len;
    v.ring.visible = v.tag.visible = !!r.point && !r.ceiling;
    if (r.point) {
      v.ring.position.copy(r.point).addScaledVector(r.d, -0.05);
      v.ring.lookAt(r.o);
      v.ring.material.opacity = run ? 0.6 + 0.35 * Math.sin(t * 16.7) : 0.7;
      v.tag.position.copy(r.point).addScaledVector(r.d, -1.2); v.tag.position.y += 2.4;
    }
    const text = r.ceiling ? "" : r.point ? `${r.cm.toFixed(1)} cm` : "";
    if (text !== v.text) {
      v.text = text;
      v.tag.material.map.dispose();
      v.tag.material.map = labelTex(text, r.cm != null && r.cm < 2 ? "#a3261b" : "#1d3a57", "#fff");
    }
  }
  for (const id of [...beams.keys()]) if (!live.has(id)) { dropBeam(id); }
  for (const id of [...ranges.keys()]) if (!B.byId(id)) ranges.delete(id);
}

// ═════════════════════════ 3D instruments behind the mat ═════════════════════════
const BACK_Z = -B.MAT_D / 2;
const inst = new THREE.Group();
scene.add(inst);
const jacks = {};                             // what → local object whose world position is the jack

function faceTex(w, h, draw, S = 48) {
  const c = document.createElement("canvas"); c.width = Math.round(w * S); c.height = Math.round(h * S);
  const g = c.getContext("2d");
  draw(g, S, c.width, c.height);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
  return t;
}
const txt = (g, s, x, y, size, color = "#d8dde0", align = "center", weight = 600) => { g.fillStyle = color; g.font = `${weight} ${size}px "IBM Plex Mono", monospace`; g.textAlign = align; g.textBaseline = "middle"; g.fillText(s, x, y); };

// ── bench oscilloscope ──
const knobs3d = {};
let runBtn = null;
const SC = { W: 24, H: 12.5, D: 11 };
const scopeG = new THREE.Group();
scopeG.position.set(13, TABLE_Y, BACK_Z - SC.D / 2 - 2.5);
scopeG.rotation.set(0, -0.12, 0);
inst.add(scopeG);
const scopeBody = new THREE.Group();
scopeBody.position.y = 1.0; scopeBody.rotation.x = -0.14;     // flip-out feet tilt the screen up
scopeG.add(scopeBody);
{
  const shell = std(0x3a3f44, { roughness: 0.55 });
  scopeBody.add(boxM(SC.W, SC.H, SC.D, shell, 0, SC.H / 2, 0));
  scopeBody.add(boxM(SC.W - 1.2, SC.H - 1.2, 1.2, std(0x2c3034, { roughness: 0.5 }), 0, SC.H / 2, -SC.D / 2 - 0.5)); // rear hump
  // front panel artwork
  const front = new THREE.Mesh(new THREE.PlaneGeometry(SC.W - 0.2, SC.H - 0.2), new THREE.MeshStandardMaterial({ roughness: 0.6, map: faceTex(SC.W, SC.H, (g, S, w, h) => {
    g.fillStyle = "#23272b"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#1a1d20"; g.fillRect(0.6 * S, 0.6 * S, 15.4 * S, 10.3 * S);
    txt(g, "DSO-2C  ·  2 CH  ·  50 MHz  ·  1 GSa/s", 1 * S, 11.5 * S, 0.5 * S, "#aab4ba", "left");
    txt(g, "VERTICAL", 19.5 * S, 0.9 * S, 0.42 * S, "#8fa0a8");
    txt(g, "V/DIV", 17.7 * S, 3.35 * S, 0.38 * S); txt(g, "V-POS", 21.3 * S, 3.35 * S, 0.38 * S);
    txt(g, "HORIZONTAL", 19.5 * S, 4.45 * S, 0.42 * S, "#8fa0a8");
    txt(g, "TIME/DIV", 17.7 * S, 6.9 * S, 0.38 * S); txt(g, "H-POS", 21.3 * S, 6.9 * S, 0.38 * S);
    txt(g, "CH1", 17.3 * S, 8.2 * S, 0.42 * S, "#f3d23c"); txt(g, "CH2", 20.0 * S, 8.2 * S, 0.42 * S, "#4fd3e8"); txt(g, "⏚", 22.4 * S, 8.2 * S, 0.5 * S);
    txt(g, "AUTO", 17.5 * S, 11.55 * S, 0.34 * S); txt(g, "RUN/STOP", 20.4 * S, 11.55 * S, 0.34 * S);
  }) }));
  front.position.set(0, SC.H / 2, SC.D / 2 + 0.01);
  scopeBody.add(front);
  for (const [name, x, y, r, col] of [["vdiv", 17.7, 2.3, 0.75, 0xd0d4d6], ["vpos", 21.3, 2.3, 0.6, 0xd0d4d6], ["tb", 17.7, 5.85, 0.75, 0xd0d4d6], ["hpos", 21.3, 5.85, 0.6, 0xff8a3c]]) {
    const kg = new THREE.Group(); kg.position.set(x - SC.W / 2, SC.H - y, SC.D / 2);
    const k = cylM(r, r, 0.6, std(col, { roughness: 0.4 }), 0, 0, 0.3, 32); k.rotation.x = Math.PI / 2;
    const m = boxM(0.12, r * 0.8, 0.05, M.dark, 0, r * 0.45, 0.62);
    kg.add(k, m); scopeBody.add(kg);
    k.userData.ctl = m.userData.ctl = name;
    knobs3d[name] = kg;
  }
  for (const [name, x, col] of [["auto", 17.5, 0x5b6268], ["run", 20.4, 0x3aa35c]]) {
    const b = boxM(1.8, 0.7, 0.3, std(col), x - SC.W / 2, SC.H - 10.9, SC.D / 2 + 0.15);
    b.userData.ctl = name; scopeBody.add(b);
    if (name === "run") runBtn = b;
  }
  for (const [what, x, col] of [["ch1", 17.3, 0xf3d23c], ["ch2", 20.0, 0x4fd3e8], ["gnd", 22.4, 0x1c1c1c]]) {
    const y = SC.H - 9.35;
    const bnc = cylM(0.5, 0.5, 0.7, M.metal, x - SC.W / 2, y, SC.D / 2 + 0.35, 24); bnc.rotation.x = Math.PI / 2; scopeBody.add(bnc);
    const ring = cylM(0.62, 0.62, 0.12, std(col), x - SC.W / 2, y, SC.D / 2 + 0.06, 24); ring.rotation.x = Math.PI / 2; scopeBody.add(ring);
    if (what !== "gnd") bnc.userData.ctl = ring.userData.ctl = "place:" + what;
    const j = new THREE.Object3D(); j.position.set(x - SC.W / 2, y, SC.D / 2 + 0.75); scopeBody.add(j); jacks[what] = j;
  }
  for (const x of [-SC.W / 2 + 1.5, SC.W / 2 - 1.5]) { scopeG.add(boxM(1.6, 1.7, 1.2, M.dark, x, 0.85, SC.D / 2 - 0.9)); scopeG.add(boxM(1.6, 0.6, 1.6, M.dark, x, 0.3, -SC.D / 2 + 1)); }
}
const scopeCanvas = document.createElement("canvas");
scopeCanvas.width = 640; scopeCanvas.height = 430;
const scopeTex = new THREE.CanvasTexture(scopeCanvas); scopeTex.encoding = THREE.sRGBEncoding; scopeTex.anisotropy = 4;
const scopeScreen = new THREE.Mesh(new THREE.PlaneGeometry(15.4 - 0.4, 10.3 - 0.4), new THREE.MeshBasicMaterial({ map: scopeTex, toneMapped: false }));
scopeScreen.position.set(-SC.W / 2 + 0.6 + 7.7, SC.H - 0.6 - 5.15, SC.D / 2 + 0.03);
scopeBody.add(scopeScreen);
scopeBody.traverse(o => { o.userData.instrument = "scope"; });

// ── handheld multimeter on its kickstand ──
const DM = { W: 9, H: 17, T: 2.6 };
const dmmG = new THREE.Group();
dmmG.position.set(-15, TABLE_Y, BACK_Z - 3.2);
dmmG.rotation.set(0, 0.16, 0);
inst.add(dmmG);
const dmmBody = new THREE.Group();
dmmBody.rotation.x = -0.62;                   // leaning back on the stand
dmmBody.position.set(0, 0, 0.6);
dmmG.add(dmmBody);
const dmmCanvas = document.createElement("canvas");
dmmCanvas.width = 360; dmmCanvas.height = 170;
const dmmTex = new THREE.CanvasTexture(dmmCanvas); dmmTex.encoding = THREE.sRGBEncoding; dmmTex.anisotropy = 4;
let dial, holdBtn;
{
  const rubber = std(0xf2c230, { roughness: 0.75 });
  dmmBody.add(boxM(DM.W, DM.H, DM.T, rubber, 0, DM.H / 2, 0));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(DM.W - 1.2, DM.H - 1.2), new THREE.MeshStandardMaterial({ roughness: 0.6, map: faceTex(DM.W - 1.2, DM.H - 1.2, (g, S, w, h) => {
    g.fillStyle = "#2a2d30"; g.fillRect(0, 0, w, h);
    txt(g, "DMM-17  AUTO RANGE", w / 2, 0.45 * S, 0.42 * S, "#f2c230");
    // dial legend around the rotary switch (centre at 8.3 from the top)
    const cx = w / 2, cy = 8.6 * S, R = 2.75 * S;
    const marks = [["OFF", -150], ["V⎓", -95], ["V~", -60], ["Hz%", -20], ["Ω·)))", 25], ["mA", 65], ["A", 100]];
    for (const [l, a] of marks) { const r = a * Math.PI / 180; txt(g, l, cx + Math.sin(r) * R, cy - Math.cos(r) * R, 0.46 * S, l === "V⎓" || l === "Hz%" || l === "Ω·)))" ? "#ffffff" : "#9aa3a8"); }
    txt(g, "HOLD", 1.2 * S, 5.95 * S, 0.36 * S, "#d8dde0");
    txt(g, "COM", w * 0.3, h - 0.6 * S, 0.42 * S); txt(g, "VΩHz", w * 0.7, h - 0.6 * S, 0.42 * S, "#ff8f84"); txt(g, "10A", w * 0.5, h - 0.6 * S, 0.36 * S, "#9aa3a8");
  }) }));
  face.position.set(0, DM.H / 2, DM.T / 2 + 0.01);
  dmmBody.add(face);
  const lcd = new THREE.Mesh(new THREE.PlaneGeometry(DM.W - 2, (DM.W - 2) * 170 / 360), new THREE.MeshBasicMaterial({ map: dmmTex, toneMapped: false }));
  lcd.position.set(0, DM.H - 0.6 - 1.2 - (DM.W - 2) * 85 / 360, DM.T / 2 + 0.03);
  dmmBody.add(lcd);
  dial = new THREE.Group(); dial.position.set(0, DM.H - 0.6 - 8.6, DM.T / 2 + 0.05);
  const knob = cylM(2.0, 2.1, 0.6, std(0x1c1c1c, { roughness: 0.5 }), 0, 0, 0.3, 40); knob.rotation.x = Math.PI / 2;
  const grip = boxM(0.7, 3.8, 0.5, std(0x333333), 0, 0, 0.75);
  const ptr = boxM(0.22, 1.3, 0.1, M.white, 0, 1.2, 1.02);
  dial.add(knob, grip, ptr);
  dial.children.forEach(o => { o.userData.ctl = "dial"; });
  dmmBody.add(dial);
  holdBtn = boxM(1.5, 0.55, 0.25, std(0x3a3f44), -2.7, DM.H - 0.6 - 5.25, DM.T / 2 + 0.12);
  holdBtn.userData.ctl = "hold"; dmmBody.add(holdBtn);
  for (const [what, x, col] of [["dmm-", -0.3, 0x1c1c1c], ["mA", 0, 0x1c1c1c], ["dmm+", 0.3, 0xd8342c]]) {
    const y = DM.H - 0.6 - (DM.H - 1.2) + 1.5;
    const jk = cylM(0.45, 0.45, 0.2, std(col), x / 0.3 * 0.2 * (DM.W - 1.2), y, DM.T / 2 + 0.1, 24); jk.rotation.x = Math.PI / 2; dmmBody.add(jk);
    if (what !== "mA") jk.userData.ctl = "place:" + what;
    const hole = cylM(0.2, 0.2, 0.21, M.dark, jk.position.x, y, DM.T / 2 + 0.11, 16); hole.rotation.x = Math.PI / 2; dmmBody.add(hole);
    if (what !== "mA") { const j = new THREE.Object3D(); j.position.set(jk.position.x, y, DM.T / 2 + 0.3); dmmBody.add(j); jacks[what] = j; }
  }
  dmmG.add(boxM(DM.W - 2, 0.5, 7.5, std(0xd9ab22), 0, 0.25, -3.4));      // kickstand
}
dmmBody.traverse(o => { o.userData.instrument = "meter"; });
scopeG.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

const DIAL_ANGLE = Object.fromEntries((B.DIAL || []).map(d => [d[0], d[2]]));
const MODE_TXT = { off: "", dcv: "DC  AUTO", acv: "AC  AUTO", hz: "Hz  AUTO", ohm: "Ω  ·)))", ma: "DC mA", a: "DC  A" };
let dmmKey = "";
function paintDmm() {
  const st = B.dmmState ? B.dmmState() : { val: "– – –", unit: "V" };
  const mode = B.instruments ? B.instruments.dmm.mode : "dcv";
  const key = st.val + st.unit + (st.sub || "") + mode + (st.warn ? 1 : 0) + (st.off ? 1 : 0);
  holdBtn.material.color.set(B.instruments && B.instruments.dmm.hold ? 0xd8342c : 0x3a3f44);
  dial.rotation.z += ((-(DIAL_ANGLE[mode] || -95) * Math.PI / 180) - dial.rotation.z) * 0.2;
  if (key === dmmKey) return;
  dmmKey = key;
  const g = dmmCanvas.getContext("2d"), w = dmmCanvas.width, h = dmmCanvas.height;
  g.fillStyle = st.off ? "#6f7a66" : "#9fb08c"; g.fillRect(0, 0, w, h);
  const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, "rgba(255,255,255,.18)"); grd.addColorStop(1, "rgba(0,0,0,.12)");
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  g.fillStyle = "#1d2a1a"; g.font = `700 22px "IBM Plex Mono", monospace`; g.textBaseline = "top"; g.textAlign = "left";
  if (st.off) { dmmTex.needsUpdate = true; return; }
  g.fillText(MODE_TXT[mode] || "", 14, 10);
  if (st.sub) { g.textAlign = "right"; g.fillText(st.sub, w - 14, 10); }
  g.textAlign = "right"; g.textBaseline = "alphabetic";
  g.font = `600 96px "IBM Plex Mono", monospace`;
  g.fillText(st.val, w - 70, h - 22);
  g.font = `700 32px "IBM Plex Mono", monospace`; g.textAlign = "left";
  g.fillText(st.unit || "", w - 64, h - 24);
  if (st.warn) { g.fillStyle = "#8a1508"; g.font = `700 20px "IBM Plex Mono", monospace`; g.fillText("⚠", 16, h - 24); }
  dmmTex.needsUpdate = true;
}
let scopeAcc = 0;
function syncScope3d() {
  const I = B.instruments;
  if (!I || !I.knobAngle) return;
  for (const [k, g] of Object.entries(knobs3d)) g.rotation.z += (-I.knobAngle(k) * Math.PI / 180 - g.rotation.z) * 0.3;
  runBtn.material.color.set(I.scope.hold ? 0xd8342c : 0x3aa35c);
}
function paintScope3d(dt) {
  scopeAcc += dt;
  if (scopeAcc < 1 / 20 || !B.paintScope) return;
  scopeAcc = 0;
  B.paintScope(scopeCanvas.getContext("2d"), scopeCanvas.width, scopeCanvas.height, 1, true);
  scopeTex.needsUpdate = true;
}

B.jackPos = what => { const j = jacks[what]; if (!j) return null; j.updateMatrixWorld(true); return j.getWorldPosition(new THREE.Vector3()); };

// ═════════════════════════ probes on pins ═════════════════════════
const probes = new Map();                    // what → { key, color, group, cable, sig }
const needleMat = std(0xdfe3e6, { metalness: 0.9, roughness: 0.2 });
function probeModel(p) {
  const g = new THREE.Group();
  const col = new THREE.Color(p.color);
  const body = std(p.what.startsWith("ch") ? 0x2b2f33 : col, { roughness: 0.45 });
  const band = std(col, { roughness: 0.4, emissive: col, emissiveIntensity: 0.25 });
  if (p.clip) {                               // scope ground lead: a little crocodile clip
    g.add(boxM(0.5, 0.16, 1.1, M.dark, 0, 0.3, 0.35), boxM(0.5, 0.16, 1.1, M.dark, 0, 0.62, 0.35));
    g.add(boxM(0.08, 0.5, 0.08, needleMat, 0, 0.25, -0.05));
    g.add(cylM(0.2, 0.2, 1.2, std(0x1c1c1c), 0, 0.5, 1.4));
    g.children[g.children.length - 1].rotation.x = Math.PI / 2;
    return g;
  }
  g.add(cylM(0.035, 0.012, 1.1, needleMat, 0, 0.55, 0, 10));             // needle, tip at the origin
  g.add(cylM(0.1, 0.1, 0.25, M.dark, 0, 1.2, 0, 14));
  g.add(cylM(0.27, 0.27, 0.12, body, 0, 1.38, 0, 20));                   // finger guard
  g.add(cylM(0.16, 0.14, 2.4, body, 0, 2.6, 0, 18));                     // handle
  g.add(cylM(0.17, 0.17, 0.3, band, 0, 1.75, 0, 18));                    // colour band
  g.add(cylM(0.11, 0.09, 0.7, body, 0, 4.1, 0, 14));                     // strain relief
  return g;
}
function pinMarker(color) {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).lerp(new THREE.Color(0xffffff), color === "#2a2a2a" ? 0.35 : 0), transparent: true, opacity: 0.95, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.07, 10, 28), mat); ring.rotation.x = Math.PI / 2;
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: B.GLOW_TEX, color, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.scale.set(1.6, 1.6, 1);
  g.add(ring, glow);
  return g;
}
const UP = new THREE.Vector3(0, 1, 0);
function buildProbe(p) {
  const old = probes.get(p.what);
  if (old) dropProbe(p.what);
  const top = B.pinTop(p.key), jack = B.jackPos(p.what);
  if (!top || !jack) return;
  const wired = B.state.wires.some(w => w.a === p.key || w.b === p.key);
  const tip = top.clone(); tip.y += wired ? 0.28 : 0.02;
  const horiz = jack.clone().sub(tip).setY(0).normalize();
  const tilt = p.clip ? 0 : 0.6;
  const axis = UP.clone().multiplyScalar(Math.cos(tilt)).addScaledVector(horiz, Math.sin(tilt)).normalize();
  const g = new THREE.Group();
  const model = probeModel(p);
  model.quaternion.setFromUnitVectors(UP, axis);
  if (p.clip) model.quaternion.setFromAxisAngle(UP, Math.atan2(horiz.x, horiz.z));
  model.position.copy(tip);
  const marker = pinMarker(p.color);
  marker.position.copy(top).setY(top.y - (wired ? -0.3 : 0.12));
  const tag = sprite(labelTex(p.tag, p.color, p.color === "#e9c21c" || p.color === "#35c2d8" ? "#111" : "#fff", 200, 90), 1.5, 0.68);
  tag.position.copy(tip).addScaledVector(axis, p.clip ? 1.5 : 5.1); tag.position.y += 0.55;
  // cable from the handle to the instrument jack
  const start = p.clip ? tip.clone().add(new THREE.Vector3(horiz.x * 2, 0.5, horiz.z * 2)) : tip.clone().addScaledVector(axis, 4.45);
  const d = start.distanceTo(jack);
  const lift = 2.2 + Math.min(d * 0.08, 4);
  const pts = [start, p.clip ? start.clone().setY(start.y + 0.4) : start.clone().addScaledVector(axis, 1.6),
    start.clone().lerp(jack, 0.45).setY(Math.max(start.y, 0) + lift), jack.clone().add(new THREE.Vector3(0, 0.6 - jack.y * 0.4, 3.2)).setY(Math.max(1.2, jack.y * 0.55)),
    jack.clone().add(new THREE.Vector3(0, 0, 1.2)), jack];
  const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
  const cableCol = p.what === "dmm+" ? 0xc8322a : p.what.startsWith("ch") ? new THREE.Color(p.color).multiplyScalar(0.8) : 0x1e1e1e;
  const cable = mesh(new THREE.TubeGeometry(curve, 90, p.what.startsWith("ch") ? 0.1 : 0.085, 8), std(cableCol, { roughness: 0.55 }));
  const plug = cylM(0.26, 0.26, 1.0, std(cableCol, { roughness: 0.5 }), jack.x, jack.y, jack.z + 0.45, 16); plug.rotation.x = Math.PI / 2;
  g.add(model, marker, tag, cable, plug);
  [model, tag, cable, plug].forEach(x => x.traverse(o => { o.userData.probe = p.what; }));   // not the pin marker: the pin stays clickable
  scene.add(g);
  probes.set(p.what, { key: p.key, color: p.color, group: g, sig: sigOf(p), cable, marker });
  highlight();
}
// probes are picked and selected like jumpers
B.extraPick = () => [...probes.values()].map(o => o.group);
let selected = null;
function highlight() {
  for (const [w, o] of probes) {
    const on = w === selected;
    o.cable.material.emissive.set(on ? 0xff8a3c : 0x000000);
    o.cable.material.emissiveIntensity = on ? 0.7 : 0;
    o.marker.scale.setScalar(on ? 1.6 : 1);
  }
}
B.on("select", sel => { selected = sel && sel.kind === "probe" ? sel.id : null; highlight(); });
function dropProbe(what) {
  const o = probes.get(what);
  if (!o) return;
  scene.remove(o.group);
  o.group.traverse(x => { if (x.geometry) x.geometry.dispose(); if (x.isSprite) x.material.map.dispose(); });
  probes.delete(what);
}
function sigOf(p) {
  const t = B.pinTop(p.key), j = B.jackPos(p.what);
  const wired = B.state.wires.some(w => w.a === p.key || w.b === p.key);
  return t && j ? [t.x, t.y, t.z, j.x, j.z, wired].map(v => typeof v === "number" ? v.toFixed(2) : v).join(",") : "";
}
function updateProbes() {
  const list = B.probes ? B.probes() : [];
  const want = new Set(list.map(p => p.what));
  for (const w of [...probes.keys()]) if (!want.has(w)) dropProbe(w);
  for (const p of list) {
    const cur = probes.get(p.what);
    if (!cur || cur.key !== p.key || cur.sig !== sigOf(p)) buildProbe(p);
  }
}

// click an instrument → open its panel
{
  const cv = $view(), rc = new THREE.Raycaster(), v2 = new THREE.Vector2();
  let downAt = null;
  cv.addEventListener("pointerdown", e => { downAt = [e.clientX, e.clientY]; });
  cv.addEventListener("pointerup", e => {
    if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5 || B.state.placing || B.state.pending) return;
    const r = cv.getBoundingClientRect();
    v2.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    rc.setFromCamera(v2, B.camera);
    const h = rc.intersectObject(inst, true)[0];
    if (h && h.object.userData.instrument) {
      const first = rc.intersectObjects(B.state.comps.map(c => c.group).filter(Boolean), true)[0];
      if (first && first.distance < h.distance) return;
      const ctl = h.object.userData.ctl;
      if (ctl) {
        B.instCtl(ctl, e.shiftKey ? -1 : 1);
        const I = B.instruments, K = I.KNOBS[ctl];
        if (K) B.flashHint(`${K.label}: ${K.fmt(K.get())}  (click turns right, Shift+click turns left)`);
        else if (ctl === "dial") B.flashHint(`Dial: ${(B.DIAL.find(d => d[0] === I.dmm.mode) || [])[1]}  (Shift+click turns back)`);
        return;
      }
      B.showDock(h.object.userData.instrument);
      B.flashHint(h.object.userData.instrument === "scope" ? "Oscilloscope: click a knob to turn it, or a CH1 / CH2 jack to place a probe." : "Multimeter: click the dial to turn it, or a jack to place a probe.");
    }
  });
  cv.addEventListener("pointermove", e => {
    if (B.state.pending || B.state.placing || e.buttons) return;
    const r = cv.getBoundingClientRect();
    v2.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    rc.setFromCamera(v2, B.camera);
    const h = rc.intersectObject(inst, true)[0];
    if (h && h.object.userData.instrument && cv.style.cursor !== "grab") cv.style.cursor = "pointer";
  });
}
function $view() { return document.getElementById("view"); }

// ═════════════════════════ frame loop ═════════════════════════
let clockT = 0;
B.on("tick", dt => {
  clockT += dt;
  updateBeams(clockT);
  updateProbes();
  paintDmm();
  paintScope3d(dt);
  syncScope3d();
});
B.on("change", () => { for (const w of [...probes.keys()]) { const o = probes.get(w); o.sig = ""; } });
})();
