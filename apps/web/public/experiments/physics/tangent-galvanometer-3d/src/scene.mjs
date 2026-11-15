// 3D tangent galvanometer (Three.js). Units: 1 unit = 1 cm. North is -z, east is +x.
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
const V3 = THREE.Vector3, RAD = Math.PI / 180;
const H = 14;   // height of the coil centre (and the needle) above the table

function scaleTexture() {
  const S = 1024, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), cx = S / 2, R = S / 2 - 8;
  g.fillStyle = '#f5f1e4'; g.beginPath(); g.arc(cx, cx, R, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#1c2a33'; g.fillStyle = '#1c2a33'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cx, R, 0, Math.PI * 2); g.stroke();
  g.font = 'bold 34px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let d = 0; d < 360; d++) {
    const a = d * RAD, big = d % 10 === 0, mid = d % 5 === 0, len = big ? 46 : mid ? 32 : 18;
    g.lineWidth = big ? 3 : 1.6; g.beginPath(); g.moveTo(cx + R * Math.cos(a), cx - R * Math.sin(a)); g.lineTo(cx + (R - len) * Math.cos(a), cx - (R - len) * Math.sin(a)); g.stroke();
    if (big) { let v = d % 180; if (v > 90) v = 180 - v; const rr = R - 80; g.fillText(String(v), cx + rr * Math.cos(a), cx - rr * Math.sin(a)); }
  }
  g.lineWidth = 2; g.setLineDash([10, 8]); g.beginPath(); g.moveTo(cx - R + 50, cx); g.lineTo(cx + R - 50, cx); g.moveTo(cx, cx - R + 50); g.lineTo(cx, cx + R - 50); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

export function createScene(container) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true }); if (!renderer.getContext()) return null; } catch (e) { return null; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement); renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;';
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0b1d29);
  const camera = new THREE.PerspectiveCamera(36, 1, 0.5, 600);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.12; controls.maxPolarAngle = Math.PI / 2 - 0.02; controls.minDistance = 10; controls.maxDistance = 150;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x35506a, 0.95));
  const sun = new THREE.DirectionalLight(0xffffff, 1.1); sun.position.set(20, 60, 30); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 5, far: 150 }); scene.add(sun);
  const tableTex = woodTexture('#7b5a3a', '#4a3320', 512, 512, false); tableTex.wrapS = tableTex.wrapT = THREE.RepeatWrapping; tableTex.repeat.set(2, 2);
  const table = new THREE.Mesh(new THREE.BoxGeometry(80, 3, 60), new THREE.MeshStandardMaterial({ map: tableTex, roughness: 0.8 })); table.position.y = -1.5; table.receiveShadow = true; scene.add(table);
  // magnetic meridian line drawn on the table
  const mg = new THREE.BufferGeometry().setFromPoints([new V3(0, 0.03, 26), new V3(0, 0.03, -26)]);
  const mer = new THREE.Line(mg, new THREE.LineDashedMaterial({ color: 0xffde59, dashSize: 1.5, gapSize: 1 })); mer.computeLineDistances(); scene.add(mer);
  const nTag = labelSprite('N', '#ffde59'); nTag.scale.set(3, 2.2, 1); nTag.position.set(0, 1.5, -28); scene.add(nTag);
  const sTag = labelSprite('S', '#ffde59'); sTag.scale.set(3, 2.2, 1); sTag.position.set(0, 1.5, 28); scene.add(sTag);

  // the instrument (turns as a whole)
  const inst = new THREE.Group(); scene.add(inst);
  const woodM = new THREE.MeshStandardMaterial({ map: woodTexture('#a8794c', '#6d4a2b', 256, 256, false), roughness: 0.7 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(34, 2, 22), woodM); base.position.y = 1; base.castShadow = true; base.receiveShadow = true; inst.add(base);
  [[-14, 8], [14, 8], [0, -9]].forEach(([x, z]) => { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 1.6, 12), new THREE.MeshStandardMaterial({ color: 0xc9a14a, metalness: 0.7, roughness: 0.3 })); s.position.set(x, -0.2, z); inst.add(s); });
  const stand = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 6), woodM); stand.position.set(0, 3.5, 0); inst.add(stand);
  const copper = new THREE.MeshStandardMaterial({ color: 0xb8733a, metalness: 0.75, roughness: 0.35 });
  let coil = new THREE.Mesh(new THREE.TorusGeometry(9, 0.7, 14, 80), copper); coil.rotation.y = Math.PI / 2; coil.position.y = H; coil.castShadow = true; inst.add(coil);
  const frame = new THREE.Mesh(new THREE.TorusGeometry(9, 0.95, 8, 80, Math.PI * 2), new THREE.MeshStandardMaterial({ color: 0x5c3d22, roughness: 0.8, transparent: true, opacity: 0.35 })); frame.rotation.y = Math.PI / 2; frame.position.y = H; inst.add(frame);
  // horizontal platform through the coil, compass box at the centre
  const plat = new THREE.Mesh(new THREE.BoxGeometry(16, 0.6, 7), woodM); plat.position.set(0, H - 1.2, 0); inst.add(plat);
  const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.2, H - 4, 1.2), woodM); pillar.position.set(6, (H - 1.5) / 2 + 1, 0); inst.add(pillar);
  const pillar2 = pillar.clone(); pillar2.position.x = -6; inst.add(pillar2);
  const box = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.2, 1.4, 48, 1, true), new THREE.MeshStandardMaterial({ color: 0x2b3640, metalness: 0.5, roughness: 0.4, side: THREE.DoubleSide })); box.position.set(0, H - 0.3, 0); inst.add(box);
  const dial = new THREE.Mesh(new THREE.CircleGeometry(5.1, 64), new THREE.MeshStandardMaterial({ map: scaleTexture(), roughness: 0.8 })); dial.rotation.x = -Math.PI / 2; dial.position.set(0, H - 0.85, 0); inst.add(dial);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(5.2, 48), new THREE.MeshPhysicalMaterial({ color: 0xddf3ff, transparent: true, opacity: 0.15, roughness: 0.02 })); glass.rotation.x = -Math.PI / 2; glass.position.set(0, H + 0.4, 0); inst.add(glass);
  const terms = [-10, -7].map((x) => { const tm = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.4, 12), new THREE.MeshStandardMaterial({ color: 0xc9a14a, metalness: 0.8, roughness: 0.3 })); tm.position.set(x, 2.7, 8); inst.add(tm); return tm; });
  const tgTag = labelSprite('Coil', '#cfe6f2'); tgTag.scale.set(7, 2.6, 1); tgTag.position.set(0, H + 12, 0); inst.add(tgTag);

  // needle and pointer: they keep their own direction (set by the fields), not the instrument's
  const needleG = new THREE.Group(); needleG.position.set(0, H - 0.55, 0); scene.add(needleG);
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.25, 3), new THREE.MeshStandardMaterial({ color: 0x2c2c2c, metalness: 0.6, roughness: 0.4 })); needleG.add(mag);
  const nEnd = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.27, 1.2), new THREE.MeshStandardMaterial({ color: 0xd8342a })); nEnd.position.z = -0.9; needleG.add(nEnd);
  const ptr = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.08, 0.14), new THREE.MeshStandardMaterial({ color: 0xe9eef2, metalness: 0.8, roughness: 0.25 })); ptr.position.y = 0.2; needleG.add(ptr);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.5, 12), new THREE.MeshStandardMaterial({ color: 0xc9a14a })); needleG.add(hub);

  // commutator, rheostat and ammeter as simple blocks on the table
  const comm = new THREE.Mesh(new THREE.BoxGeometry(5, 1.2, 5), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5 })); comm.position.set(-24, 0.6, 14); scene.add(comm);
  const commTag = labelSprite('Commutator', '#f4a417'); commTag.scale.set(10, 2.4, 1); commTag.position.set(-24, 4, 14); scene.add(commTag);
  const amm = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 1.5, 32), new THREE.MeshStandardMaterial({ color: 0x2b3640 })); amm.position.set(24, 0.75, 14); scene.add(amm);
  const ammTag = labelSprite('Ammeter', '#9fdcff'); ammTag.scale.set(8, 2.4, 1); ammTag.position.set(24, 4, 14); scene.add(ammTag);
  const flowMat = new THREE.MeshBasicMaterial({ color: 0x3ddc84, transparent: true, opacity: 0.0 });
  const glow = new THREE.Mesh(new THREE.TorusGeometry(9, 0.9, 8, 80), flowMat); glow.rotation.y = Math.PI / 2; glow.position.y = H; inst.add(glow);

  const S = { alpha: 0, phi: 0, rCm: 9, on: false };
  let lastR = 9;
  function setState(n) {
    Object.assign(S, n);
    if (Math.abs(S.rCm - lastR) > 1e-6) { [coil, frame, glow].forEach((m) => { m.geometry.dispose(); }); coil.geometry = new THREE.TorusGeometry(S.rCm, 0.7, 14, 80); frame.geometry = new THREE.TorusGeometry(S.rCm, 0.95, 8, 80); glow.geometry = new THREE.TorusGeometry(S.rCm, 0.9, 8, 80); lastR = S.rCm; }
  }
  let running = true, tween = null, shown = 0; const clock = new THREE.Clock();
  function frame_() {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    inst.rotation.y = -S.alpha * RAD;
    shown += (S.phi - shown) * Math.min(1, dt * 6);       // the needle swings smoothly to its new position
    needleG.rotation.y = -shown * RAD;
    flowMat.opacity = S.on ? 0.25 : 0;
    if (tween) { tween.t += dt / tween.d; const k = Math.min(1, tween.t), e = k * k * (3 - 2 * k); camera.position.lerpVectors(tween.p0, tween.p1, e); controls.target.lerpVectors(tween.t0, tween.t1, e); if (k >= 1) tween = null; }
    controls.update(); renderer.render(scene, camera); requestAnimationFrame(frame_);
  }
  function setView(name, instant) {
    tgTag.visible = false;
    let p, tg;
    if (name === 'top') { tg = new V3(0, H, 0); p = new V3(9, H + 24, 7); }
    else if (name === 'side') { tg = new V3(0, H - 2, 0); p = new V3(55, H + 4, 0); }
    else { tg = new V3(0, H - 3, 2); p = new V3(30, 38, 46); }
    if (instant) { camera.position.copy(p); controls.target.copy(tg); controls.update(); tween = null; } else tween = { t: 0, d: 0.7, p0: camera.position.clone(), p1: p, t0: controls.target.clone(), t1: tg };
  }
  function resize() { const w = container.clientWidth || 800, h = container.clientHeight || 450; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  const ro = new ResizeObserver(() => resize()); ro.observe(container); resize(); setView('overview', true);
  document.addEventListener('visibilitychange', () => { const vis = !document.hidden; if (vis && !running) { running = true; clock.getDelta(); requestAnimationFrame(frame_); } else if (!vis) running = false; });
  requestAnimationFrame(frame_);
  return { setState, setView, canvas: renderer.domElement };
}
