// 3D travelling microscope scene (Three.js). Units: 1 unit = 1 cm.
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
const WD = 3, CLAMP = 4, TUBE = 9;          // working distance, clamp height above objective, tube length
const PX = -10, PZ = -1.5;                   // pillar position

function paperTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  g.fillStyle = '#fbfaf4'; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = '#141414'; g.lineWidth = 5; g.lineCap = 'round';
  g.beginPath(); g.moveTo(206, 206); g.lineTo(306, 306); g.moveTo(306, 206); g.lineTo(206, 306); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
// main scale on the pillar: label value v sits at height v + yoff
function scaleTexture(yoff, H) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 4096; const g = c.getContext('2d');
  g.fillStyle = '#d9dde0'; g.fillRect(0, 0, 128, 4096);
  const pc = 4096 / H; g.fillStyle = '#16232b'; g.strokeStyle = '#16232b'; g.font = 'bold 30px monospace'; g.textBaseline = 'middle';
  for (let k = 0; k <= 14 / PH.MSD; k++) {
    const v = k * PH.MSD, y = 4096 - (v + yoff) * pc; if (y < 0 || y > 4096) continue;
    const big = k % 20 === 0, mid = k % 10 === 0;
    g.lineWidth = big ? 3 : 1.6; g.beginPath(); g.moveTo(0, y); g.lineTo(big ? 64 : mid ? 46 : 30, y); g.stroke();
    if (big) g.fillText(String(Math.round(v)), 72, y);
  }
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
  const camera = new THREE.PerspectiveCamera(34, 1, 0.5, 600);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.12; controls.maxPolarAngle = Math.PI / 2 - 0.03; controls.minDistance = 12; controls.maxDistance = 160;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x35506a, 0.95));
  const sun = new THREE.DirectionalLight(0xffffff, 1.15); sun.position.set(20, 50, 30); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 5, far: 150 }); sun.shadow.bias = -0.0004; scene.add(sun);

  const tableTex = woodTexture('#7b5a3a', '#4a3320', 512, 512, false); tableTex.wrapS = tableTex.wrapT = THREE.RepeatWrapping; tableTex.repeat.set(2, 2);
  const table = new THREE.Mesh(new THREE.BoxGeometry(60, 3, 36), new THREE.MeshStandardMaterial({ map: tableTex, roughness: 0.8 })); table.position.set(-2, -1.5, 0); table.receiveShadow = true; scene.add(table);
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.MeshStandardMaterial({ map: paperTexture(), roughness: 0.95 })); paper.rotation.x = -Math.PI / 2; paper.position.y = 0.02; paper.receiveShadow = true; scene.add(paper);

  // glass slab and powder
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xb8ecff, transparent: true, opacity: 0.35, roughness: 0.03, side: THREE.DoubleSide, depthWrite: false });
  let slab = new THREE.Mesh(new THREE.BoxGeometry(7, 1, 4.5), glassMat); scene.add(slab);
  const slabEdges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(7, 1, 4.5)), new THREE.LineBasicMaterial({ color: 0xd8f6ff })); scene.add(slabEdges);
  const pg = new THREE.BufferGeometry(), pts = [], rr = PH.mulberry32(7);
  for (let i = 0; i < 260; i++) pts.push((rr() - 0.5) * 3.2, 0, (rr() - 0.5) * 2.4);
  pg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const powder = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.09 })); scene.add(powder);

  // travelling microscope: base, pillar with main scale, carriage with vernier, arm and tube
  const metal = new THREE.MeshStandardMaterial({ color: 0x2f3b45, metalness: 0.6, roughness: 0.4 });
  const black = new THREE.MeshStandardMaterial({ color: 0x15191d, metalness: 0.4, roughness: 0.5 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xc9a14a, metalness: 0.8, roughness: 0.3 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(8, 1.2, 8), metal); base.position.set(PX, 0.6, PZ); base.castShadow = true; scene.add(base);
  const PH_H = 18;
  const pillarMats = [metal, metal, metal, metal, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }), metal];
  const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.6, PH_H, 1.2), pillarMats); pillar.position.set(PX, PH_H / 2, PZ); pillar.castShadow = true; scene.add(pillar);
  const mov = new THREE.Group(); scene.add(mov);              // everything that moves with the reading
  const carriage = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.2, 2.2), metal); carriage.position.set(PX, 0, PZ + 0.2); mov.add(carriage);
  const vplate = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.5, 0.08), brass); vplate.position.set(PX + 1.25, 0, PZ + 0.64); mov.add(vplate);
  const index = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.1), new THREE.MeshBasicMaterial({ color: 0xff3b1f })); index.position.set(PX + 1.15, 0, PZ + 0.7); mov.add(index);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(-PX, 1, 1.2), metal); arm.position.set(PX / 2, 0, 0); mov.add(arm);
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, TUBE, 28), black); tube.position.set(0, TUBE / 2 - CLAMP, 0); mov.add(tube);
  const obj = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.75, 1.2, 24), brass); obj.position.set(0, -CLAMP - 0.6 + 0.6, 0); mov.add(obj);
  const eye = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 1.4, 24), black); eye.position.set(0, TUBE - CLAMP + 0.6, 0); mov.add(eye);
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.6, 24), brass); knob.rotation.x = Math.PI / 2; knob.position.set(PX, 0, PZ + 1.6); mov.add(knob);
  [carriage, vplate, arm, tube, obj, eye, knob].forEach((m) => { m.castShadow = true; m.userData.drag = 'mic'; });
  const focusRing = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.5, 32), new THREE.MeshBasicMaterial({ color: 0x3ddc84, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthTest: false }));
  focusRing.rotation.x = -Math.PI / 2; focusRing.renderOrder = 5; scene.add(focusRing);
  const scaleTag = labelSprite('Scale', '#e7c66a'); scaleTag.scale.set(5, 2, 1); scaleTag.position.set(PX - 3, PH_H - 2, PZ); scene.add(scaleTag);

  const S = { R: 3, scene: 'none', k: 0, g: null, yoff: null };
  function setState(next) {
    const prevK = S.k, prevG = S.g; Object.assign(S, next);
    if (S.g && (S.g !== prevG || S.k !== prevK || !slab.userData.t)) {
      const t = S.g.t[S.k];
      slab.geometry.dispose(); slab.geometry = new THREE.BoxGeometry(7, t, 4.5); slab.position.set(0, t / 2 + 0.02, 0);
      slabEdges.geometry.dispose(); slabEdges.geometry = new THREE.EdgesGeometry(slab.geometry); slabEdges.position.copy(slab.position);
      powder.position.set(0, t + 0.06, 0); slab.userData.t = t;
    }
    if (S.g) { const yoff = WD + CLAMP - S.g.r0; if (yoff !== S.yoff) { S.yoff = yoff; pillarMats[4].map && pillarMats[4].map.dispose(); pillarMats[4].map = scaleTexture(yoff, PH_H); pillarMats[4].needsUpdate = true; } }
  }
  function layout() {
    if (!S.g) return;
    const yf = S.R - S.g.r0;                       // focal plane height above the table
    mov.position.y = yf + WD + CLAMP;              // clamp (and vernier index) height
    const on = S.scene !== 'none'; slab.visible = slabEdges.visible = on; powder.visible = S.scene === 'powder';
    focusRing.position.set(0, Math.max(0.05, yf), 0);
  }

  let running = true, tween = null; const clock = new THREE.Clock();
  function frame() {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05); layout();
    if (tween) { tween.t += dt / tween.d; const k = Math.min(1, tween.t), e = k * k * (3 - 2 * k); camera.position.lerpVectors(tween.p0, tween.p1, e); controls.target.lerpVectors(tween.t0, tween.t1, e); if (k >= 1) tween = null; }
    controls.update(); renderer.render(scene, camera); requestAnimationFrame(frame);
  }
  function setView(name, instant) {
    const aspect = camera.aspect || 1.5, d = Math.max(30, 26 / aspect * 1.6); let p, tg;
    if (name === 'side') { tg = new V3(-4, 7, 0); p = new V3(-4, 8, d * 1.15); }
    else if (name === 'close') { tg = new V3(0, 3, 0); p = new V3(9, 9, 13); }
    else { tg = new V3(-4, 7, 0); p = new V3(12, 17, d * 1.25); }
    if (instant) { camera.position.copy(p); controls.target.copy(tg); controls.update(); tween = null; } else tween = { t: 0, d: 0.7, p0: camera.position.clone(), p1: p, t0: controls.target.clone(), t1: tg };
  }
  function resize() { const w = container.clientWidth || 800, h = container.clientHeight || 450; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  const ro = new ResizeObserver(() => resize()); ro.observe(container); resize(); setView('overview', true);

  // drag the microscope up or down (coarse movement)
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), el = renderer.domElement;
  let dragging = false, y0 = 0, R0 = 0, plane = new THREE.Plane(), last = null;
  function setNdc(ev) { const r = el.getBoundingClientRect(); ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); }
  function hitMic(ev) { setNdc(ev); return ray.intersectObject(mov, true).length > 0; }
  function yOn(ev) { setNdc(ev); const p = new V3(); return ray.ray.intersectPlane(plane, p) ? p.y : null; }
  el.addEventListener('pointerdown', (ev) => {
    if (!hitMic(ev)) return;
    const n = new V3(); camera.getWorldDirection(n); n.y = 0; if (n.lengthSq() < 1e-6) n.set(0, 0, -1); n.normalize();
    plane.setFromNormalAndCoplanarPoint(n, new V3(0, mov.position.y, 0));
    const y = yOn(ev); if (y == null) return; dragging = true; y0 = y; R0 = S.R; controls.enabled = false; el.setPointerCapture(ev.pointerId); el.style.cursor = 'grabbing'; ev.preventDefault();
  });
  el.addEventListener('pointermove', (ev) => {
    if (dragging) { const y = yOn(ev); if (y == null) return; const v = Math.round(Math.max(PH.R_MIN, Math.min(PH.R_MAX, R0 + (y - y0))) * 100) / 100; if (v !== last) { last = v; hooks.onDrag(v); } }
    else el.style.cursor = hitMic(ev) ? 'grab' : 'default';
  });
  const end = (ev) => { if (dragging) { dragging = false; controls.enabled = true; el.style.cursor = 'default'; try { el.releasePointerCapture(ev.pointerId); } catch (e) {} } };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  document.addEventListener('visibilitychange', () => { const vis = !document.hidden; if (vis && !running) { running = true; clock.getDelta(); requestAnimationFrame(frame); } else if (!vis) running = false; });
  requestAnimationFrame(frame);
  return { setState, setView, canvas: el };
}
