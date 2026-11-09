// 3D optical bench scene (Three.js). Units: 1 unit = 1 cm.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';


function woodTexture(base, dark, w, h, vertical) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 90; i++) {
    g.strokeStyle = dark; g.globalAlpha = 0.05 + Math.random() * 0.12; g.lineWidth = 1 + Math.random() * 2;
    g.beginPath();
    const p = Math.random() * (vertical ? w : h);
    if (vertical) { g.moveTo(p, 0); g.bezierCurveTo(p + 12, h * 0.3, p - 12, h * 0.7, p + 4, h); }
    else { g.moveTo(0, p); g.bezierCurveTo(w * 0.3, p + 6, w * 0.7, p - 6, w, p + 2); }
    g.stroke();
  }
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

function labelSprite(text, color) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(8,20,30,.82)'; g.strokeStyle = color; g.lineWidth = 4;
  const r = 18; g.beginPath(); g.moveTo(r, 4); g.arcTo(252, 4, 252, 92, r); g.arcTo(252, 92, 4, 92, r); g.arcTo(4, 92, 4, 4, r); g.arcTo(4, 4, 252, 4, r); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#fff'; g.font = 'bold 44px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 50);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false }));
  s.scale.set(11, 4.1, 1); s.renderOrder = 10; s.userData.text = text;
  return s;
}

import * as PH from './physics.mjs';
const BY = 3;                 // height of the ray above the board
const H = 6;                  // prism height
const V3 = THREE.Vector3;
const RAD = Math.PI / 180;
const LAMP_X = -42, PR = 26;  // lamp position and protractor radius

function paperTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 600; const g = c.getContext('2d');
  g.fillStyle = '#f6f1e2'; g.fillRect(0, 0, 1024, 600);
  g.strokeStyle = 'rgba(80,100,120,.13)'; g.lineWidth = 1;
  for (let x = 0; x <= 1024; x += 1024 / 26) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 600); g.stroke(); }
  for (let y = 0; y <= 600; y += 600 / 15) { g.beginPath(); g.moveTo(0, y); g.lineTo(1024, y); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function protractorTexture() {
  const S = 640, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  const px = S / PR;                                       // pixels per cm; centre at the top-left corner
  g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, PR * px - 2, 0, Math.PI / 2); g.closePath(); g.fill();
  g.strokeStyle = '#17323f'; g.fillStyle = '#17323f'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, PR * px - 2, 0, Math.PI / 2); g.stroke();
  for (let d = 0; d <= 90; d++) {
    const a = d * RAD, len = d % 10 === 0 ? 34 : d % 5 === 0 ? 24 : 13, r0 = PR * px - 2;
    g.lineWidth = d % 10 === 0 ? 3 : 1.5; g.beginPath(); g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); g.lineTo(Math.cos(a) * (r0 - len), Math.sin(a) * (r0 - len)); g.stroke();
    if (d % 10 === 0 && d > 0 && d < 90) { g.font = 'bold 27px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; const rr = r0 - 56; g.fillText(String(d), Math.cos(a) * rr, Math.sin(a) * rr); }
  }
  g.lineWidth = 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(S, 0); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

// thin box between two world points
function makeSeg(thick, material) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(1, thick, thick), material); m.frustumCulled = false;
  const up = new V3(1, 0, 0);
  m.userData.update = (a, b) => {
    const d = new V3().subVectors(b, a), L = d.length(); if (L < 1e-4) { m.visible = false; return; } m.visible = true;
    m.position.copy(a).addScaledVector(d, 0.5); m.scale.set(L, 1, 1); m.quaternion.setFromUnitVectors(up, d.normalize());
  };
  return m;
}
function dashed(color) { const g = new THREE.BufferGeometry().setFromPoints([new V3(), new V3(1, 0, 0)]); const l = new THREE.Line(g, new THREE.LineDashedMaterial({ color, dashSize: 1.4, gapSize: 1, transparent: true, opacity: 0.9 })); l.frustumCulled = false;
  l.userData.update = (a, b) => { const p = g.attributes.position.array; p[0] = a.x; p[1] = a.y; p[2] = a.z; p[3] = b.x; p[4] = b.y; p[5] = b.z; g.attributes.position.needsUpdate = true; l.computeLineDistances(); g.computeBoundingSphere(); }; return l; }

export function createScene(container, hooks) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true }); if (!renderer.getContext()) return null; } catch (e) { return null; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;';

  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0b1d29);
  const camera = new THREE.PerspectiveCamera(36, 1, 1, 900);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.12; controls.maxPolarAngle = Math.PI / 2 - 0.03; controls.minDistance = 20; controls.maxDistance = 320;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x35506a, 0.95));
  const sun = new THREE.DirectionalLight(0xffffff, 1.1); sun.position.set(30, 110, 60); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -80, right: 80, top: 60, bottom: -60, near: 10, far: 320 }); sun.shadow.bias = -0.0004; scene.add(sun);

  // table and drawing board (board top at y = 0)
  const tableTex = woodTexture('#7b5a3a', '#4a3320', 512, 512, false); tableTex.wrapS = tableTex.wrapT = THREE.RepeatWrapping; tableTex.repeat.set(3, 3);
  const table = new THREE.Mesh(new THREE.BoxGeometry(170, 6, 100), new THREE.MeshStandardMaterial({ map: tableTex, roughness: 0.8 })); table.position.set(0, -7, 4); table.receiveShadow = true; scene.add(table);
  const board = new THREE.Mesh(new THREE.BoxGeometry(130, 3, 76), [0, 1, 2, 3, 4, 5].map((k) => new THREE.MeshStandardMaterial(k === 2 ? { map: paperTexture(), roughness: 0.95 } : { color: 0xc9b98f, roughness: 0.9 })));
  board.position.set(3, -1.5, 3); board.receiveShadow = true; scene.add(board);

  const dark = new THREE.MeshStandardMaterial({ color: 0x2c3640, metalness: 0.5, roughness: 0.5 });
  // lamp / pin holder
  const lampG = new THREE.Group(); lampG.position.set(LAMP_X, 0, 0); scene.add(lampG);
  const lb = new THREE.Mesh(new THREE.BoxGeometry(7, 4, 7), dark); lb.position.set(-1.5, 2, 0); lb.castShadow = true; lampG.add(lb);
  const lh = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 5, 16), new THREE.MeshStandardMaterial({ color: 0xfff4c9, emissive: 0xffe08a, emissiveIntensity: 0.9 })); lh.rotation.z = Math.PI / 2; lh.position.set(1.5, BY, 0); lampG.add(lh);
  const lampTag = labelSprite('Light', '#f4a417'); lampTag.scale.set(8, 3.2, 1); lampTag.position.set(LAMP_X, 11, 0); scene.add(lampTag);

  // prism (rotates about the point of incidence M1 at the origin)
  const prismG = new THREE.Group(); scene.add(prismG);
  const [B1, V, B2] = PH.prismVertices(0);
  const shape = new THREE.Shape([new THREE.Vector2(B1.x, B1.y), new THREE.Vector2(B2.x, B2.y), new THREE.Vector2(V.x, V.y)]);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: H, bevelEnabled: false });
  const prism = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: 0x8fd8ff, transparent: true, opacity: 0.42, roughness: 0.05, metalness: 0, side: THREE.DoubleSide, depthWrite: false }));
  prism.rotation.x = -Math.PI / 2; prismG.add(prism);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0xdff6ff })); edges.rotation.x = -Math.PI / 2; prismG.add(edges);
  const m1 = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 12), new THREE.MeshBasicMaterial({ color: 0xff5a36 })); m1.position.set(0, BY, 0); prismG.add(m1);
  prismG.traverse((o) => { o.userData.drag = 'prism'; });
  const prismTag = labelSprite('Prism', '#8fd8ff'); prismTag.scale.set(8, 3.2, 1); prismTag.position.set(1, 15, -13); scene.add(prismTag);

  // protractor at the exit point, plus the highlighted deviation wedge
  const prot = new THREE.Mesh(new THREE.PlaneGeometry(PR, PR), new THREE.MeshBasicMaterial({ map: protractorTexture(), transparent: true, depthWrite: false }));
  prot.rotation.x = -Math.PI / 2; scene.add(prot);
  let wedge = null, wedgeDelta = -1;
  const wedgeMat = new THREE.MeshBasicMaterial({ color: 0xffb21e, transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthWrite: false });

  // rays
  const incMat = new THREE.MeshBasicMaterial({ color: 0xffd24a }), inMat = new THREE.MeshBasicMaterial({ color: 0xffb21e }), outMat = new THREE.MeshBasicMaterial({ color: 0xff7a2f });
  const sInc = makeSeg(0.5, incMat), sIn = makeSeg(0.5, inMat), sOut = makeSeg(0.55, outMat);
  scene.add(sInc, sIn, sOut);
  const dExt = dashed(0xdfe9ee), nrm1 = dashed(0x9fdcff), nrm2 = dashed(0x9fdcff); scene.add(dExt, nrm1, nrm2);
  const outTag = labelSprite('Emergent', '#ff7a2f'); outTag.scale.set(11, 3.6, 1); scene.add(outTag);
  const tirTag = labelSprite('TIR', '#ff5a36'); tirTag.scale.set(7, 3.2, 1); tirTag.visible = false; scene.add(tirTag);

  const S = { i: 50, n: 1.55 };
  let running = true, tween = null; const clock = new THREE.Clock();
  function setState(next) { Object.assign(S, next); }
  const P3 = (x, y, yy) => new V3(x, y, -yy);

  function layout() {
    const tr = PH.trace(S.n, S.i), phi = PH.phiForI(S.i);
    prismG.rotation.y = phi * RAD;
    sInc.userData.update(P3(LAMP_X + 3, BY, 0), P3(0, BY, 0));
    // normal at M1 (outward normal of face 1 is the first column of rotation)
    const [b1, v, b2] = PH.prismVertices(phi); const e = { x: v.x - b1.x, y: v.y - b1.y }, L = Math.hypot(e.x, e.y);
    let nn = { x: e.y / L, y: -e.x / L }; if (nn.x > 0) nn = { x: -nn.x, y: -nn.y };      // pointing out of the prism (to the left)
    nrm1.userData.update(P3(-nn.x * 9, BY, -nn.y * 9), P3(nn.x * 9, BY, nn.y * 9));
    if (!tr || tr.tir && !tr.exit) { return; }
    const ex = tr.exit;
    sIn.userData.update(P3(0, BY, 0), P3(ex.x, BY, ex.y));
    const e2 = { x: b2.x - v.x, y: b2.y - v.y }, L2 = Math.hypot(e2.x, e2.y);
    let n2 = { x: e2.y / L2, y: -e2.x / L2 }; if (n2.x < 0) n2 = { x: -n2.x, y: -n2.y };
    nrm2.userData.update(P3(ex.x - n2.x * 8, BY, ex.y - n2.y * 8), P3(ex.x + n2.x * 9, BY, ex.y + n2.y * 9));
    prot.position.set(ex.x + PR / 2, 0.08, -ex.y + PR / 2);
    if (tr.tir) {
      sOut.visible = false; dExt.visible = false; outTag.visible = false; prot.visible = false; if (wedge) wedge.visible = false;
      tirTag.visible = true; tirTag.position.set(ex.x + 6, 11, -ex.y + 3); return;
    }
    tirTag.visible = false; prot.visible = true; dExt.visible = true; outTag.visible = true;
    const end = P3(ex.x + tr.dirOut.x * 52, BY, ex.y + tr.dirOut.y * 52);
    sOut.userData.update(P3(ex.x, BY, ex.y), end);
    dExt.userData.update(P3(ex.x, BY, ex.y), P3(ex.x + PR + 6, BY, ex.y));
    outTag.position.set(ex.x + tr.dirOut.x * 38, 8.5, -(ex.y + tr.dirOut.y * 38));
    const dd = Math.round(tr.deltaDeg * 20) / 20;
    if (dd !== wedgeDelta) {
      if (wedge) { scene.remove(wedge); wedge.geometry.dispose(); }
      wedge = new THREE.Mesh(new THREE.CircleGeometry(PR - 1, 48, -dd * RAD, dd * RAD), wedgeMat); wedge.rotation.x = -Math.PI / 2; scene.add(wedge); wedgeDelta = dd;
    }
    wedge.visible = true; wedge.position.set(ex.x, 0.12, -ex.y);
  }

  function frame() {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    layout();
    if (tween) { tween.t += dt / tween.d; const k = Math.min(1, tween.t), e = k * k * (3 - 2 * k); camera.position.lerpVectors(tween.p0, tween.p1, e); controls.target.lerpVectors(tween.t0, tween.t1, e); if (k >= 1) tween = null; }
    controls.update(); renderer.render(scene, camera); requestAnimationFrame(frame);
  }
  function fitDistance() { const aspect = camera.aspect || 1.6, vf = (camera.fov * Math.PI) / 180; return Math.max(112 / (2 * Math.tan(vf / 2) * aspect), 66 / (2 * Math.tan(vf / 2)), 85); }
  function setView(name, instant) {
    const d = fitDistance(); let p, tg;
    if (name === 'top') { tg = new V3(1, 0, 8); p = new V3(1, d * 0.97, 8.5); }
    else if (name === 'side') { tg = new V3(3, 4, 4); p = new V3(3, 20, d * 0.62 + 4); }
    else { tg = new V3(3, 0, 6); p = new V3(3 + d * 0.15, d * 0.72, d * 0.62); }
    if (instant) { camera.position.copy(p); controls.target.copy(tg); controls.update(); tween = null; } else tween = { t: 0, d: 0.7, p0: camera.position.clone(), p1: p, t0: controls.target.clone(), t1: tg };
  }
  function resize() { const w = container.clientWidth || 800, h = container.clientHeight || 450; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  const ro = new ResizeObserver(() => resize()); ro.observe(container); resize(); setView('overview', true);

  // drag the prism: rotating it about the point of incidence changes i
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new V3(0, 1, 0), -BY);
  let dragging = false, a0 = 0, i0 = 0, last = null; const el = renderer.domElement;
  function setNdc(ev) { const r = el.getBoundingClientRect(); ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); }
  function hit(ev) { setNdc(ev); return ray.intersectObject(prismG, true).length > 0; }
  function ang(ev) { setNdc(ev); const p = new V3(); return ray.ray.intersectPlane(plane, p) ? Math.atan2(-p.z, p.x) / RAD : null; }
  el.addEventListener('pointerdown', (ev) => { if (hit(ev)) { const a = ang(ev); if (a == null) return; dragging = true; a0 = a; i0 = S.i; controls.enabled = false; el.setPointerCapture(ev.pointerId); el.style.cursor = 'grabbing'; ev.preventDefault(); } });
  el.addEventListener('pointermove', (ev) => {
    if (dragging) { const a = ang(ev); if (a == null) return; let da = a - a0; while (da > 180) da -= 360; while (da < -180) da += 360;
      const v = Math.round(Math.max(PH.I_MIN, Math.min(PH.I_MAX, i0 - da)) * 10) / 10; if (v !== last) { last = v; hooks.onDrag(v); } }
    else el.style.cursor = hit(ev) ? 'grab' : 'default';
  });
  const end = (ev) => { if (dragging) { dragging = false; controls.enabled = true; el.style.cursor = 'default'; try { el.releasePointerCapture(ev.pointerId); } catch (e) {} } };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  document.addEventListener('visibilitychange', () => { const vis = !document.hidden; if (vis && !running) { running = true; clock.getDelta(); requestAnimationFrame(frame); } else if (!vis) running = false; });
  requestAnimationFrame(frame);
  return { setState, setView, canvas: el };
}
