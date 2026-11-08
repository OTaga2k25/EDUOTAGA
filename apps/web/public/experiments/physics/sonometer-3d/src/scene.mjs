// 3D sonometer scene (Three.js). Units: 1 unit = 1 cm.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const B1X = -50;          // fixed bridge; L is measured from here
const WY = 4.2;           // wire height above the box top
const PULLEY_X = 62, HANG_X = 65.2;

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

function scaleTexture() {
  const W = 4096, H = 80, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#f3ecd8'; g.fillRect(0, 0, W, H);
  const px = W / 104;                    // 104 cm strip: -2 .. 102
  g.strokeStyle = '#111'; g.fillStyle = '#111'; g.textAlign = 'center';
  for (let cm = 0; cm <= 100; cm++) {
    const x = (cm + 2) * px;
    const len = cm % 10 === 0 ? 34 : cm % 5 === 0 ? 24 : 15;
    g.lineWidth = cm % 10 === 0 ? 3 : 2;
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x, len); g.stroke();
    if (cm % 10 === 0) { g.font = 'bold 28px monospace'; g.fillText(String(cm), x, 66); }
  }
  g.font = '20px monospace'; g.fillText('cm', 2 * px - 26, 70);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
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

// ribbon tube that follows a list of points; rebuilt cheaply each frame
function makeTube(nPts, radius, material) {
  const sides = 6;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(nPts * sides * 3);
  const idx = [];
  for (let i = 0; i < nPts - 1; i++) for (let s = 0; s < sides; s++) {
    const a = i * sides + s, b = i * sides + (s + 1) % sides, c = (i + 1) * sides + s, d = (i + 1) * sides + (s + 1) % sides;
    idx.push(a, c, b, b, c, d);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex(idx);
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  mesh.userData.update = (pts) => {
    const p = geo.attributes.position.array;
    for (let i = 0; i < nPts; i++) for (let s = 0; s < sides; s++) {
      const a = (s / sides) * Math.PI * 2, o = (i * sides + s) * 3;
      p[o] = pts[i].x; p[o + 1] = pts[i].y + Math.cos(a) * radius; p[o + 2] = pts[i].z + Math.sin(a) * radius;
    }
    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();
  };
  return mesh;
}

export function createScene(container, hooks) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    if (!renderer.getContext()) return null;
  } catch (e) { return null; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;';

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1d29);
  scene.fog = new THREE.Fog(0x0b1d29, 260, 520);
  const camera = new THREE.PerspectiveCamera(36, 1, 1, 900);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.12;
  controls.maxPolarAngle = Math.PI / 2 - 0.03; controls.minDistance = 22; controls.maxDistance = 320;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x35506a, 0.85));
  const sun = new THREE.DirectionalLight(0xffffff, 1.35);
  sun.position.set(50, 110, 70); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -95, right: 95, top: 70, bottom: -70, near: 10, far: 320 });
  sun.shadow.bias = -0.0004;
  scene.add(sun);

  // ---- table ----
  const tableTex = woodTexture('#7b5a3a', '#4a3320', 512, 512, false); tableTex.wrapS = tableTex.wrapT = THREE.RepeatWrapping; tableTex.repeat.set(3, 3);
  const table = new THREE.Mesh(new THREE.BoxGeometry(170, 6, 80), new THREE.MeshStandardMaterial({ map: tableTex, roughness: 0.8 }));
  table.position.set(-25, -12, 8); table.receiveShadow = true; scene.add(table);   // top surface at y = -9

  // ---- sonometer box ----
  const boxTex = woodTexture('#d2ad74', '#7a5a2b', 1024, 256, false);
  const boxMat = new THREE.MeshStandardMaterial({ map: boxTex, roughness: 0.65 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(116, 9, 16), boxMat);
  box.position.set(0, -4.5, 0); box.castShadow = true; box.receiveShadow = true; scene.add(box);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(2.4, 32), new THREE.MeshBasicMaterial({ color: 0x1b1008 }));
  hole.rotation.x = -Math.PI / 2; hole.position.set(8, 0.02, -3.2); scene.add(hole);
  const frontSprite = labelSprite('SONOMETER', '#f4a417');
  const front = new THREE.Mesh(new THREE.PlaneGeometry(26, 6.2), new THREE.MeshBasicMaterial({ map: frontSprite.material.map, transparent: true })); front.position.set(14, -4.4, 8.03); scene.add(front);

  // scale strip along the front of the top: 0 cm at the fixed bridge
  const scale = new THREE.Mesh(new THREE.PlaneGeometry(104, 3.4), new THREE.MeshBasicMaterial({ map: scaleTexture() }));
  scale.rotation.x = -Math.PI / 2; scale.position.set(B1X + 52 - 2, 0.03, 5.8); scale.receiveShadow = false; scene.add(scale);

  // ---- metal & wood parts ----
  const metal = new THREE.MeshStandardMaterial({ color: 0xcfd6db, metalness: 0.9, roughness: 0.32 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x5b666e, metalness: 0.8, roughness: 0.45 });
  const wireMat = new THREE.MeshStandardMaterial({ color: 0xf2f5f7, metalness: 0.3, roughness: 0.4, emissive: 0x7a8791 });

  function makeBridge(color) {
    const g = new THREE.Group();
    const wedge = new THREE.Mesh(new THREE.BoxGeometry(1.8, 4, 10), new THREE.MeshStandardMaterial({ color, roughness: 0.55 }));
    wedge.position.set(0, 2, -1); wedge.castShadow = true; g.add(wedge);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 10), metal); cap.position.set(0, 4.1, -1); g.add(cap);
    return g;
  }
  const b1 = makeBridge(0x8a5a2b); b1.position.x = B1X; scene.add(b1);
  const b2 = makeBridge(0xc9702a); scene.add(b2);
  b2.traverse((o) => { o.userData.bridge = true; });
  const b1Tag = labelSprite('B₁', '#9fb4c0'); b1Tag.scale.set(6.5, 2.7, 1); b1Tag.position.set(B1X, 9.2, 1); scene.add(b1Tag);
  const b2Tag = labelSprite('B₂', '#f4a417'); b2Tag.scale.set(6.5, 2.7, 1); scene.add(b2Tag);
  // red reading mark on the scale for B2
  const mark = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 4.2), new THREE.MeshBasicMaterial({ color: 0xe8511d }));
  mark.position.y = 0.09; mark.position.z = 5.8; mark.userData.bridge = true; scene.add(mark);

  // peg (left) and pulley clamp (right)
  const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 6, 16), darkMetal); peg.position.set(-56, 3, 0); peg.castShadow = true; scene.add(peg);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(5, 1.6, 5), darkMetal); arm.position.set(60.4, -1.2, 0); scene.add(arm);
  const clamp = new THREE.Mesh(new THREE.BoxGeometry(2, 8, 5), darkMetal); clamp.position.set(PULLEY_X, -1.8, 0); clamp.castShadow = true; scene.add(clamp);
  const pulley = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 1.4, 32), metal); pulley.rotation.x = Math.PI / 2; pulley.position.set(PULLEY_X, 1.2, 0); pulley.castShadow = true; scene.add(pulley);

  // ---- wire ----
  const SEG = 72;
  const vib = makeTube(SEG + 1, 0.26, wireMat); vib.castShadow = false; scene.add(vib);
  const left = makeTube(2, 0.26, wireMat); scene.add(left);
  const right = makeTube(2, 0.26, wireMat); scene.add(right);
  const hangWire = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 1, 8), wireMat); scene.add(hangWire);
  const tmp = []; for (let i = 0; i <= SEG; i++) tmp.push(new THREE.Vector3());

  // ---- hanger + slotted weights ----
  const weights = new THREE.Group(); scene.add(weights);
  let builtN = -1;
  function buildWeights(n) {
    while (weights.children.length) { const c = weights.children.pop(); c.geometry && c.geometry.dispose(); }
    const hy = -12;
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.22, 8, 16), metal); hook.position.set(HANG_X, hy + 1.4, 0); weights.add(hook);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 3 + n * 0.9 + 1.5, 10), metal); rod.position.set(HANG_X, hy - (3 + n * 0.9 + 1.5) / 2 + 0.5, 0); weights.add(rod);
    const hanger = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 0.8, 28), darkMetal); hanger.position.set(HANG_X, hy - 1.2, 0); hanger.castShadow = true; weights.add(hanger);
    for (let i = 0; i < n; i++) {
      const d = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.6, 0.8, 32), new THREE.MeshStandardMaterial({ color: i % 2 ? 0x8f9aa2 : 0xa5afb6, metalness: 0.75, roughness: 0.4 }));
      d.position.set(HANG_X, hy - 2.1 - i * 0.9, 0); d.castShadow = true; weights.add(d);
    }
    builtN = n;
  }

  // ---- tuning fork ----
  const fork = new THREE.Group(); scene.add(fork);
  const prongs = [];
  const forkMat = new THREE.MeshStandardMaterial({ color: 0xe6ecef, metalness: 0.35, roughness: 0.35, emissive: 0x2a3238 });
  { const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 3.2, 14), forkMat); stem.position.y = 1.6; stem.castShadow = true; fork.add(stem);
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.5, 0.9), forkMat); base.position.y = 3.35; fork.add(base);
    [-1, 1].forEach((sx) => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.75, 9, 0.9), forkMat); p.position.set(sx * 1.0, 8, 0); p.castShadow = true; p.userData.sx = sx; fork.add(p); prongs.push(p); });
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.25, 16), darkMetal); foot.position.y = 0.12; fork.add(foot); }
  let forkTag = labelSprite('256 Hz', '#3ddc84'); forkTag.position.set(0, 16, 0); fork.add(forkTag);
  const FORK_REST = new THREE.Vector3(-22, -9, 27), FORK_ON = new THREE.Vector3(-36, 0, 4.2);
  fork.position.copy(FORK_REST);
  // spreading sound rings
  const rings = [];
  for (let i = 0; i < 3; i++) {
    const r = new THREE.Mesh(new THREE.RingGeometry(0.97, 1, 48), new THREE.MeshBasicMaterial({ color: 0x3ddc84, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    r.position.set(0, 12, 0); fork.add(r); rings.push(r);
  }

  // ---- paper rider ----
  const rider = new THREE.Group(); scene.add(rider);
  const paperMat = new THREE.MeshStandardMaterial({ color: 0xff5a36, roughness: 0.9, side: THREE.DoubleSide });
  [-1, 1].forEach((s) => {   // two paper halves folded into an inverted V that sits astride the wire
    const q = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.0), paperMat);
    q.position.set(0, 0.95, s * 0.5); q.rotation.x = -s * 0.45; q.castShadow = true; rider.add(q);
  });
  const riderSprite = labelSprite('paper rider', '#ff9a7e'); riderSprite.scale.set(9, 3.2, 1); riderSprite.position.set(0, 4.3, 0); rider.add(riderSprite); riderSprite.visible = false;

  // ---- state & loop ----
  const S = { L: 60, n: 4, fork: '256 Hz', sounding: false, amp: 0, riderOn: true, forkF: 256 };
  const flight = { active: false, t: 0, v: new THREE.Vector3(), spin: new THREE.Vector3(), pos: new THREE.Vector3() };
  let prevRiderOn = true, clock = new THREE.Clock(), t = 0, running = true, tween = null;

  function wireYAt(s) { // s in [0,1] along vibrating segment
    return WY + (S.sounding ? Math.sin(Math.PI * s) * Math.min(1.7, S.amp * 1.7 + 0.04 * S.amp) * Math.cos(t * 2 * Math.PI * 7.5) : 0);
  }

  function setState(next) {
    Object.assign(S, next);
    if (S.n !== builtN) buildWeights(S.n);
    if (forkTag.userData.text !== S.fork) { fork.remove(forkTag); forkTag.material.map.dispose(); forkTag = labelSprite(S.fork, '#3ddc84'); forkTag.position.set(0, 16, 0); fork.add(forkTag); }
    if (prevRiderOn && !S.riderOn) { // rider jumps off
      flight.active = true; flight.t = 0; flight.pos.set(B1X + S.L / 2, WY + 1, 0);
      flight.v.set((Math.random() - 0.3) * 14, 38, (Math.random() < 0.5 ? -1 : 1) * (10 + Math.random() * 8)); flight.spin.set(Math.random() * 14, Math.random() * 14, Math.random() * 14);
    }
    if (!prevRiderOn && S.riderOn) flight.active = false;
    prevRiderOn = S.riderOn;
  }

  function frame() {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05); t += dt;
    const bx = B1X + S.L;
    b2.position.x = bx; mark.position.x = bx; b2Tag.position.set(bx, 9.2, 1);
    b2Tag.visible = true;

    // wire
    const segN = SEG;
    for (let i = 0; i <= segN; i++) { const s = i / segN; tmp[i].set(B1X + s * S.L, wireYAt(s), 0); }
    vib.userData.update(tmp);
    left.userData.update([new THREE.Vector3(-56, WY, 0), new THREE.Vector3(B1X, WY, 0)]);
    right.userData.update([new THREE.Vector3(bx, WY, 0), new THREE.Vector3(PULLEY_X, WY + 0.0, 0)]);
    // wire from pulley top over to the hanging weights
    const hy = -12 + 1.4;
    hangWire.position.set(HANG_X, (hy + WY - 3) / 2, 0); hangWire.scale.set(1, (WY - 3) - hy, 1);
    hangWire.visible = true;

    // rider
    if (flight.active) {
      flight.t += dt; flight.v.y -= 120 * dt; flight.pos.addScaledVector(flight.v, dt);
      if (flight.pos.y < -8.6) { flight.pos.y = -8.6; flight.v.multiplyScalar(0); flight.spin.multiplyScalar(0); }
      rider.position.copy(flight.pos); rider.rotation.x += flight.spin.x * dt; rider.rotation.y += flight.spin.y * dt; rider.rotation.z += flight.spin.z * dt;
      rider.visible = true;
    } else {
      const mid = 0.5;
      rider.scale.setScalar(1.5); rider.position.set(B1X + S.L * mid, wireYAt(mid) + 0.1 + (S.sounding ? Math.abs(Math.sin(t * 40)) * S.amp * 0.6 : 0), 0);
      rider.rotation.set(0, 0, 0); rider.visible = true;
    }

    // fork
    const target = S.sounding ? FORK_ON : FORK_REST;
    fork.position.lerp(target, Math.min(1, dt * 7));
    prongs.forEach((p) => { p.position.x = p.userData.sx * (1.0 + (S.sounding ? Math.sin(t * 2 * Math.PI * 16) * 0.22 : 0)); });
    rings.forEach((r, i) => {
      if (!S.sounding) { r.material.opacity = 0; return; }
      const ph = ((t * 0.9 + i / 3) % 1); r.scale.setScalar(2 + ph * 22); r.material.opacity = 0.55 * (1 - ph); r.rotation.x = Math.PI / 2;
    });

    // camera tween
    if (tween) {
      tween.t += dt / tween.d; const k = Math.min(1, tween.t), e = k * k * (3 - 2 * k);
      camera.position.lerpVectors(tween.p0, tween.p1, e); controls.target.lerpVectors(tween.t0, tween.t1, e);
      if (k >= 1) tween = null;
    }
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  // ---- views ----
  function fitDistance() {
    const aspect = camera.aspect || 1.6, vf = (camera.fov * Math.PI) / 180;
    const needW = 134, dW = needW / (2 * Math.tan(vf / 2) * aspect), dH = 78 / (2 * Math.tan(vf / 2));
    return Math.max(dW, dH, 95);
  }
  function setView(name, instant) {
    const d = fitDistance(), bx = B1X + S.L;
    let p, tg;
    if (name === 'top') { tg = new THREE.Vector3(6, 0, 3); p = new THREE.Vector3(6, d * 0.92, 3.2); }
    else if (name === 'close') { tg = new THREE.Vector3(bx, 1.5, 3); p = new THREE.Vector3(bx + 1, 24, 30); }
    else { tg = new THREE.Vector3(12, -10, 4); p = new THREE.Vector3(d * 0.42, d * 0.5, d * 0.82); }
    if (instant) { camera.position.copy(p); controls.target.copy(tg); controls.update(); tween = null; }
    else tween = { t: 0, d: 0.7, p0: camera.position.clone(), p1: p, t0: controls.target.clone(), t1: tg };
  }

  // ---- resize ----
  function resize() {
    const w = container.clientWidth || 800, h = container.clientHeight || 450;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  let first = true;
  const ro = new ResizeObserver(() => { resize(); if (first) { setView('overview', true); first = false; } });
  ro.observe(container); resize(); setView('overview', true); first = false;

  // ---- dragging B2 ----
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -WY);
  let dragging = false, lastX = 0;
  const el = renderer.domElement;
  function setNdc(ev) { const r = el.getBoundingClientRect(); ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); }
  function overBridge(ev) { setNdc(ev); const hits = ray.intersectObjects([b2, mark], true); return hits.length > 0; }
  function planeX(ev) { setNdc(ev); const p = new THREE.Vector3(); return ray.ray.intersectPlane(plane, p) ? p.x : null; }
  el.addEventListener('pointerdown', (ev) => {
    if (overBridge(ev)) { dragging = true; controls.enabled = false; el.setPointerCapture(ev.pointerId); el.style.cursor = 'grabbing'; ev.preventDefault(); }
  });
  el.addEventListener('pointermove', (ev) => {
    if (dragging) { const x = planeX(ev); if (x != null) { const L = Math.round(Math.max(0, Math.min(100, x - B1X)) * 10) / 10; if (L !== lastX) { lastX = L; hooks.onDrag(L); } } }
    else el.style.cursor = overBridge(ev) ? 'grab' : 'default';
  });
  const end = (ev) => { if (dragging) { dragging = false; controls.enabled = true; el.style.cursor = 'default'; try { el.releasePointerCapture(ev.pointerId); } catch (e) {} } };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);

  document.addEventListener('visibilitychange', () => { const vis = !document.hidden; if (vis && !running) { running = true; clock.getDelta(); requestAnimationFrame(frame); } else if (!vis) running = false; });
  buildWeights(S.n);
  requestAnimationFrame(frame);
  return { setState, setView, canvas: el, renderOnce: () => renderer.render(scene, camera) };
}
