// 3D scene: convex lens on a plane mirror with a needle above it (Three.js). Units: 1 unit = 1 cm.
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
const V3 = THREE.Vector3;
const MIR = 0.4, YC = MIR + PH.TH / 2;    // mirror top, lens centre height
const RX = -14;                            // stand rod position

function rulerTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 4096; const g = c.getContext('2d');
  g.fillStyle = '#f2e3b3'; g.fillRect(0, 0, 128, 4096); g.fillStyle = '#2a1d00'; g.strokeStyle = '#2a1d00'; g.font = 'bold 34px monospace'; g.textBaseline = 'middle';
  const H = 64, pc = 4096 / H;
  for (let mm = 0; mm <= H * 10; mm++) { const y = 4096 - (mm / 10) * pc, big = mm % 10 === 0, mid = mm % 5 === 0; g.lineWidth = big ? 3 : 1.5; g.beginPath(); g.moveTo(0, y); g.lineTo(big ? 56 : mid ? 40 : 24, y); g.stroke(); if (big && mm % 50 === 0) g.fillText(String(mm / 10), 62, y); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

export function createScene(container, hooks) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true }); if (!renderer.getContext()) return null; } catch (e) { return null; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;';
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0b1d29);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.5, 800);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.12; controls.maxPolarAngle = Math.PI / 2 - 0.03; controls.minDistance = 10; controls.maxDistance = 220;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x35506a, 0.95));
  const sun = new THREE.DirectionalLight(0xffffff, 1.1); sun.position.set(25, 80, 40); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 5, far: 200 }); sun.shadow.bias = -0.0004; scene.add(sun);

  const tableTex = woodTexture('#7b5a3a', '#4a3320', 512, 512, false); tableTex.wrapS = tableTex.wrapT = THREE.RepeatWrapping; tableTex.repeat.set(2, 2);
  const table = new THREE.Mesh(new THREE.BoxGeometry(70, 3, 40), new THREE.MeshStandardMaterial({ map: tableTex, roughness: 0.8 })); table.position.set(-4, -1.5, 0); table.receiveShadow = true; scene.add(table);
  const mirror = new THREE.Mesh(new THREE.BoxGeometry(12, MIR, 12), [0, 1, 2, 3, 4, 5].map((k) => k === 2 ? new THREE.MeshStandardMaterial({ color: 0xdbe8ee, metalness: 0.9, roughness: 0.08 }) : new THREE.MeshStandardMaterial({ color: 0x55636c, roughness: 0.6 })));
  mirror.position.y = MIR / 2; mirror.receiveShadow = true; scene.add(mirror);
  const mirTag = labelSprite('Mirror', '#cfe6f2'); mirTag.scale.set(6, 2.4, 1); mirTag.position.set(9, 2.5, 6); scene.add(mirTag);

  // equiconvex lens resting on the mirror
  const prof = [], LR = 3.2, HT = PH.TH / 2;
  for (let i = 0; i <= 20; i++) { const r = (i / 20) * LR; prof.push(new THREE.Vector2(r, -(HT * (1 - (r / LR) ** 2) + 0.03))); }
  for (let i = 20; i >= 0; i--) { const r = (i / 20) * LR; prof.push(new THREE.Vector2(r, HT * (1 - (r / LR) ** 2) + 0.03)); }
  const lens = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), new THREE.MeshPhysicalMaterial({ color: 0xa8e4ff, transparent: true, opacity: 0.6, roughness: 0.03, side: THREE.DoubleSide }));
  lens.position.y = YC; scene.add(lens);
  const liquid = new THREE.Mesh(new THREE.CylinderGeometry(LR * 0.85, LR * 0.85, 0.1, 40), new THREE.MeshStandardMaterial({ color: 0x3aa0ff, transparent: true, opacity: 0.75, roughness: 0.1 }));
  liquid.position.y = MIR + 0.06; scene.add(liquid);
  const lensTag = labelSprite('Lens', '#9fdcff'); lensTag.scale.set(5, 2.2, 1); lensTag.position.set(-5, 3.5, 6); scene.add(lensTag);

  // retort stand with clamp and needle
  const metal = new THREE.MeshStandardMaterial({ color: 0x3a4650, metalness: 0.6, roughness: 0.4 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(10, 1, 14), metal); base.position.set(RX - 2, 0.5, 0); base.castShadow = true; scene.add(base);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 70, 16), metal); rod.position.set(RX, 35, 0); rod.castShadow = true; scene.add(rod);
  const mov = new THREE.Group(); scene.add(mov);
  const boss = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), metal); boss.position.set(RX, 0, 0); mov.add(boss);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, -RX, 12), metal); arm.rotation.z = Math.PI / 2; arm.position.set(RX / 2, 0, 0); mov.add(arm);
  const holder = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 1.2), new THREE.MeshStandardMaterial({ color: 0xc9a14a, metalness: 0.7, roughness: 0.3 })); holder.position.set(0, 0, 0); mov.add(holder);
  const NL = 6;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, NL - 0.8, 10), new THREE.MeshStandardMaterial({ color: 0xe8eef2, metalness: 0.9, roughness: 0.2 })); shaft.position.set(0, -(NL - 0.8) / 2, 0); mov.add(shaft);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.8, 10), shaft.material); tip.rotation.x = Math.PI; tip.position.set(0, -NL + 0.4, 0); mov.add(tip);
  [boss, arm, holder, shaft, tip].forEach((m) => { m.castShadow = true; m.userData.drag = 'needle'; });
  const needleTag = labelSprite('Needle', '#f4a417'); needleTag.scale.set(7, 2.6, 1); needleTag.position.set(4, -2, 0); mov.add(needleTag);
  const tipRing = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.4, 24), new THREE.MeshBasicMaterial({ color: 0x3ddc84, side: THREE.DoubleSide, depthTest: false, transparent: true })); tipRing.renderOrder = 4; scene.add(tipRing);
  // metre scale standing on the mirror's edge (zero at the mirror surface)
  const ruler = new THREE.Mesh(new THREE.BoxGeometry(1.4, 64, 0.3), [0, 1, 2, 3, 4, 5].map((k) => k === 4 ? new THREE.MeshStandardMaterial({ map: rulerTexture(), roughness: 0.7 }) : new THREE.MeshStandardMaterial({ color: 0xd9c48a })));
  ruler.position.set(5, MIR + 32, -5.5); ruler.castShadow = true; scene.add(ruler);

  const S = { u: 30, wet: false };
  let fitted = false;
  function setState(n) { Object.assign(S, n); if (!fitted) { fitted = true; setView('overview', true); } }
  function layout() {
    const ty = YC + S.u; mov.position.y = ty + NL; tipRing.position.set(0, ty, 0); tipRing.lookAt(camera.position);
    liquid.visible = S.wet;
  }
  let running = true, tween = null; const clock = new THREE.Clock();
  function frame() {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05); layout();
    if (tween) { tween.t += dt / tween.d; const k = Math.min(1, tween.t), e = k * k * (3 - 2 * k); camera.position.lerpVectors(tween.p0, tween.p1, e); controls.target.lerpVectors(tween.t0, tween.t1, e); if (k >= 1) tween = null; }
    controls.update(); renderer.render(scene, camera); requestAnimationFrame(frame);
  }
  function setView(name, instant) {
    const aspect = camera.aspect || 1.5, vf = (camera.fov * Math.PI) / 180;
    const top = YC + S.u + NL + 3, hgt = Math.max(top, 22), cy = hgt / 2;
    const d = Math.max(hgt / (2 * Math.tan(vf / 2)), 34 / (2 * Math.tan(vf / 2) * aspect)) * 1.12; let p, tg;
    if (name === 'close') { const span = YC + S.u + 3, y = span / 2, dd = Math.max(24, span * 1.9); tg = new V3(0, y, 0); p = new V3(dd * 0.3, y + dd * 0.3, dd); }
    else if (name === 'side') { tg = new V3(-3, cy, 0); p = new V3(-3, cy + 2, d); }
    else { tg = new V3(-3, cy, 0); p = new V3(d * 0.3, cy + d * 0.25, d * 0.95); }
    if (instant) { camera.position.copy(p); controls.target.copy(tg); controls.update(); tween = null; } else tween = { t: 0, d: 0.7, p0: camera.position.clone(), p1: p, t0: controls.target.clone(), t1: tg };
  }
  function resize() { const w = container.clientWidth || 800, h = container.clientHeight || 450; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  const ro = new ResizeObserver(() => resize()); ro.observe(container); resize(); setView('overview', true);

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), el = renderer.domElement;
  let dragging = false, y0 = 0, u0 = 0, plane = new THREE.Plane(), last = null;
  function setNdc(ev) { const r = el.getBoundingClientRect(); ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); }
  const hit = (ev) => { setNdc(ev); return ray.intersectObject(mov, true).length > 0; };
  const yOn = (ev) => { setNdc(ev); const p = new V3(); return ray.ray.intersectPlane(plane, p) ? p.y : null; };
  el.addEventListener('pointerdown', (ev) => {
    if (!hit(ev)) return;
    const n = new V3(); camera.getWorldDirection(n); n.y = 0; if (n.lengthSq() < 1e-6) n.set(0, 0, -1); n.normalize();
    plane.setFromNormalAndCoplanarPoint(n, new V3(0, mov.position.y, 0));
    const y = yOn(ev); if (y == null) return; dragging = true; y0 = y; u0 = S.u; controls.enabled = false; el.setPointerCapture(ev.pointerId); el.style.cursor = 'grabbing'; ev.preventDefault();
  });
  el.addEventListener('pointermove', (ev) => {
    if (dragging) { const y = yOn(ev); if (y == null) return; const v = Math.round(Math.max(PH.U_MIN, Math.min(PH.U_MAX, u0 + (y - y0))) * 10) / 10; if (v !== last) { last = v; hooks.onDrag(v); } }
    else el.style.cursor = hit(ev) ? 'grab' : 'default';
  });
  const end = (ev) => { if (dragging) { dragging = false; controls.enabled = true; el.style.cursor = 'default'; try { el.releasePointerCapture(ev.pointerId); } catch (e) {} } };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  document.addEventListener('visibilitychange', () => { const vis = !document.hidden; if (vis && !running) { running = true; clock.getDelta(); requestAnimationFrame(frame); } else if (!vis) running = false; });
  requestAnimationFrame(frame);
  return { setState, setView, canvas: el };
}
