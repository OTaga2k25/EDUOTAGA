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


import * as PH from './physics.mjs';
const AX = 12;
const ZO = 3.2, ZS = -3.6;     // object and screen stand side by side so they never collide
const OFF = -60;               // world x = bench x + OFF
const wx = (x) => x + OFF;

function benchScale() {
  const W = 4096, H = 80, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#f3ecd8'; g.fillRect(0, 0, W, H);
  const px = W / PH.BENCH;
  g.strokeStyle = '#111'; g.fillStyle = '#111'; g.textAlign = 'center';
  for (let cm = 0; cm <= PH.BENCH; cm++) {
    const x = cm * px, len = cm % 10 === 0 ? 34 : cm % 5 === 0 ? 24 : 15;
    g.lineWidth = cm % 10 === 0 ? 3 : 2; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, len); g.stroke();
    if (cm % 10 === 0) { g.font = 'bold 26px monospace'; g.fillText(String(cm), Math.min(Math.max(x, 16), W - 16), 64); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

export function createScene(container, hooks, screenCanvas) {
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
  const camera = new THREE.PerspectiveCamera(36, 1, 1, 900);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.12;
  controls.maxPolarAngle = Math.PI / 2 - 0.03; controls.minDistance = 20; controls.maxDistance = 320;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x35506a, 0.9));
  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(40, 110, 80); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -90, right: 90, top: 60, bottom: -60, near: 10, far: 320 }); sun.shadow.bias = -0.0004;
  scene.add(sun);

  // ---- table & bench ----
  const tableTex = woodTexture('#7b5a3a', '#4a3320', 512, 512, false); tableTex.wrapS = tableTex.wrapT = THREE.RepeatWrapping; tableTex.repeat.set(3, 3);
  const table = new THREE.Mesh(new THREE.BoxGeometry(180, 6, 80), new THREE.MeshStandardMaterial({ map: tableTex, roughness: 0.8 }));
  table.position.set(0, -7, 6); table.receiveShadow = true; scene.add(table);          // top at y = -4
  const benchMat = new THREE.MeshStandardMaterial({ color: 0x4a5560, metalness: 0.5, roughness: 0.5 });
  const bench = new THREE.Mesh(new THREE.BoxGeometry(PH.BENCH + 6, 4, 9), benchMat); bench.position.set(0, -2, 0); bench.castShadow = true; bench.receiveShadow = true; scene.add(bench);
  const scale = new THREE.Mesh(new THREE.PlaneGeometry(PH.BENCH, 3), new THREE.MeshBasicMaterial({ map: benchScale() }));
  scale.rotation.x = -Math.PI / 2; scale.position.set(0, 0.05, 2.2); scene.add(scale);
  const axisLine = new THREE.Mesh(new THREE.BoxGeometry(PH.BENCH, 0.08, 0.08), new THREE.MeshBasicMaterial({ color: 0x3a5a70, transparent: true, opacity: 0.8 }));
  axisLine.position.set(0, AX, 0); scene.add(axisLine);

  const metal = new THREE.MeshStandardMaterial({ color: 0xcfd6db, metalness: 0.3, roughness: 0.4, emissive: 0x2a3238 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2c3640, metalness: 0.5, roughness: 0.5 });

  function carriage(h) {   // base on the bench + vertical post up to height h
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(6, 1.6, 8), dark); base.position.y = 0.8; base.castShadow = true; g.add(base);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, h, 12), metal); post.position.y = h / 2; post.castShadow = true; g.add(post);
    return g;
  }
  const marks = [];

  // ---- concave mirror (fixed at 110 cm, facing the object) ----
  const lensG = carriage(AX - 5.6); lensG.position.set(wx(PH.LENS_X), 0, 0); scene.add(lensG);
  const RC = 30, TH = Math.asin(5.2 / RC);
  const mirFront = new THREE.Mesh(new THREE.SphereGeometry(RC, 48, 12, 0, Math.PI * 2, 0, TH), new THREE.MeshStandardMaterial({ color: 0xdfeaf0, metalness: 0.55, roughness: 0.18, side: THREE.BackSide, emissive: 0x6d8796 }));
  const mirBack = new THREE.Mesh(new THREE.SphereGeometry(RC + 0.35, 48, 12, 0, Math.PI * 2, 0, TH), new THREE.MeshStandardMaterial({ color: 0x3a4650, metalness: 0.4, roughness: 0.6, side: THREE.FrontSide }));
  [mirFront, mirBack].forEach((m) => { m.rotation.z = -Math.PI / 2; m.position.set(-RC, AX, 0); lensG.add(m); });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(5.3, 0.32, 10, 48), dark); ring.rotation.y = Math.PI / 2; ring.position.set(-RC + RC * Math.cos(TH), AX, 0); lensG.add(ring);
  const lensTag = labelSprite('Mirror', '#cfe6f2'); lensTag.scale.set(9, 3.4, 1); lensTag.position.set(0, AX + 9.5, 0); lensG.add(lensTag);
  // principal focus marks (hidden to the student: the lens is unknown), so no markers.

  // ---- object (arrow + lamp) ----
  const objG = carriage(AX - 0.5); scene.add(objG);
  const arrowMat = new THREE.MeshStandardMaterial({ color: 0xffb21e, emissive: 0xff9a00, emissiveIntensity: 0.9 });
  const stem = new THREE.Mesh(new THREE.BoxGeometry(0.5, PH.OBJ_H - 1.2, 0.5), arrowMat); stem.position.set(0, AX + (PH.OBJ_H - 1.2) / 2, 0); objG.add(stem);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.4, 14), arrowMat); head.position.set(0, AX + PH.OBJ_H - 0.7, 0); objG.add(head);
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(2.4, 8, 8), new THREE.MeshStandardMaterial({ color: 0xfff4c9, emissive: 0xffe9a0, emissiveIntensity: 0.8 })); lamp.position.set(-3, AX, 0); objG.add(lamp);
  const objTag = labelSprite('Object', '#f4a417'); objTag.scale.set(9, 3.4, 1); objTag.position.set(0, AX + 9.5, 0); objG.add(objTag);
  objG.traverse((o) => { o.userData.drag = 'object'; });

  // ---- screen ----
  const scrG = carriage(AX - 5.6); scene.add(scrG);
  const tex = new THREE.CanvasTexture(screenCanvas); tex.colorSpace = THREE.SRGBColorSpace;
  // half screen: it hangs below the axis, where the inverted real image forms, and stands beside the object
  const SW = 6, ST = 1, SB = -7.5, SH = ST - SB;
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.6, SH + 0.8, SW + 0.8), new THREE.MeshStandardMaterial({ color: 0xf4f4ef, roughness: 0.9 })); board.position.set(0, AX + (ST + SB) / 2, 0); board.castShadow = true; scrG.add(board);
  function faceGeo() {
    const g = new THREE.PlaneGeometry(SW, SH), uv = g.attributes.uv;
    for (let k = 0; k < uv.count; k++) { uv.setX(k, (7.5 - SW / 2 + uv.getX(k) * SW) / 15); uv.setY(k, (7.5 + SB + uv.getY(k) * SH) / 15); }
    return g;
  }
  const face = new THREE.Mesh(faceGeo(), new THREE.MeshBasicMaterial({ map: tex })); face.rotation.y = Math.PI / 2; face.position.set(0.33, AX + (ST + SB) / 2, 0); scrG.add(face);
  const face2 = new THREE.Mesh(faceGeo(), new THREE.MeshBasicMaterial({ map: tex })); face2.rotation.y = -Math.PI / 2; face2.position.set(-0.33, AX + (ST + SB) / 2, 0); scrG.add(face2);
  const scrTag = labelSprite('Screen', '#6fd1d1'); scrTag.scale.set(9, 3.4, 1); scrTag.position.set(0, AX + 3.6, -3); scrG.add(scrTag);
  scrG.traverse((o) => { o.userData.drag = 'screen'; });

  // ---- rays ----
  const rayMat = new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.85 });
  const rays = [];
  for (let i = 0; i < 3; i++) { const a = makeTube(2, 0.1, rayMat), b = makeTube(2, 0.1, rayMat); scene.add(a, b); rays.push([a, b]); }
  const V3 = THREE.Vector3;

  const S = { u: 25, vs: 40, f: 15, show: true };
  let t = 0, running = true, tween = null; const clock = new THREE.Clock();

  function setState(next) { Object.assign(S, next); }

  function layout() {
    const xo = PH.LENS_X - S.u, xs = PH.LENS_X - S.vs;
    objG.position.set(wx(xo), 0, ZO); scrG.position.set(wx(xs), 0, ZS);
    // rays: from the object tip to three points on the mirror, reflected towards the (true) image point
    const tipY = AX + PH.OBJ_H, v = PH.imageDistance(S.f, S.u);
    const lx = wx(PH.LENS_X), ox = wx(xo), sx = wx(xs);
    const heights = [4, 0, -4];
    let ix, iy, real = true;
    if (v !== null) { ix = lx - v; iy = AX - PH.OBJ_H * v / S.u; }
    else { const vv = (S.u * S.f) / (S.f - S.u); ix = lx + vv; iy = AX + PH.OBJ_H * vv / S.u; real = false; }   // virtual image behind the mirror
    rays.forEach((pair, i) => {
      const a = pair[0], b = pair[1], ly = AX + heights[i];
      a.userData.update([new V3(ox, tipY, ZO), new V3(lx, ly, 0)]);
      // reflected ray: along (I - L) for a real image, along (L - I) for a virtual one; continue to the screen plane
      let dx = ix - lx, dy = iy - ly; if (!real) { dx = -dx; dy = -dy; }
      const k = (sx - lx) / dx, end = new V3(sx, ly + dy * k, ZS);
      b.userData.update([new V3(lx, ly, 0), k > 0 ? end : new V3(lx - 40, ly + dy * (-40 / dx), ZS)]);
      a.visible = b.visible = S.show;
    });
  }

  function frame() {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05); t += dt;
    layout();
    if (tween) {
      tween.t += dt / tween.d; const k = Math.min(1, tween.t), e = k * k * (3 - 2 * k);
      camera.position.lerpVectors(tween.p0, tween.p1, e); controls.target.lerpVectors(tween.t0, tween.t1, e);
      if (k >= 1) tween = null;
    }
    tex.needsUpdate = true;
    controls.update(); renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  function fitDistance() {
    const aspect = camera.aspect || 1.6, vf = (camera.fov * Math.PI) / 180;
    return Math.max(112 / (2 * Math.tan(vf / 2) * aspect), 64 / (2 * Math.tan(vf / 2)), 85);
  }
  function setView(name, instant) {
    const d = fitDistance(); let p, tg;
    if (name === 'top') { tg = new V3(8, 0, 0); p = new V3(8, d * 0.95, 0.5); }
    else if (name === 'side') { tg = new V3(8, 8, 0); p = new V3(8, 16, d * 0.95); }
    else { tg = new V3(10, 6, 0); p = new V3(10 - d * 0.32, d * 0.42, d * 0.8); }
    if (instant) { camera.position.copy(p); controls.target.copy(tg); controls.update(); tween = null; }
    else tween = { t: 0, d: 0.7, p0: camera.position.clone(), p1: p, t0: controls.target.clone(), t1: tg };
  }
  function resize() { const w = container.clientWidth || 800, h = container.clientHeight || 450; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  const ro = new ResizeObserver(() => { resize(); }); ro.observe(container); resize(); setView('overview', true);

  // ---- dragging the object or the screen along the bench ----
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new V3(0, 1, 0), -AX);
  let dragging = null, last = null; const el = renderer.domElement;
  function setNdc(ev) { const r = el.getBoundingClientRect(); ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); }
  function hit(ev) { setNdc(ev); const hs = ray.intersectObjects([objG, scrG], true); for (const h of hs) { if (h.object.userData.drag) return h.object.userData.drag; } return null; }
  function planeX(ev) { setNdc(ev); const p = new V3(); return ray.ray.intersectPlane(plane, p) ? p.x - OFF : null; }
  el.addEventListener('pointerdown', (ev) => { const h = hit(ev); if (h) { dragging = h; controls.enabled = false; el.setPointerCapture(ev.pointerId); el.style.cursor = 'grabbing'; ev.preventDefault(); } });
  el.addEventListener('pointermove', (ev) => {
    if (dragging) {
      const x = planeX(ev); if (x == null) return;
      const v = dragging === 'object' ? Math.round(Math.max(PH.U_MIN, Math.min(PH.U_MAX, PH.LENS_X - x)) * 10) / 10 : Math.round(Math.max(0, Math.min(PH.V_MAX, PH.LENS_X - x)) * 10) / 10;
      const key = dragging + v; if (key !== last) { last = key; hooks.onDrag(dragging, v); }
    } else el.style.cursor = hit(ev) ? 'grab' : 'default';
  });
  const end = (ev) => { if (dragging) { dragging = null; controls.enabled = true; el.style.cursor = 'default'; try { el.releasePointerCapture(ev.pointerId); } catch (e) {} } };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  document.addEventListener('visibilitychange', () => { const vis = !document.hidden; if (vis && !running) { running = true; clock.getDelta(); requestAnimationFrame(frame); } else if (!vis) running = false; });
  requestAnimationFrame(frame);
  return { setState, setView, canvas: el };
}
