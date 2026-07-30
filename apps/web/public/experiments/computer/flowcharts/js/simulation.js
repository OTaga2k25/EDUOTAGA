const el = id => document.getElementById(id);

/* ---------- ALGORITHM & STATE ---------- */
const NODES = [
  { id: 0, label: 'START', type: 'sequence', desc: 'Initialize the system.', x: -6, y: 16 },
  { id: 1, label: 'READ\nTIMER', type: 'input', desc: 'Read the countdown timer.', x: -6, y: 11.5 },
  { id: 2, label: 'TIMER\n== 0?', type: 'decision', desc: 'Is the timer zero?', x: -6, y: 6.5 },
  { id: 3, label: 'CHANGE\nLIGHT', type: 'process', desc: 'Change the traffic signal.', x: -12, y: 2 },
  { id: 4, label: 'WAIT\n1s', type: 'process', desc: 'Pause and let time pass.', x: 0, y: 2 },
  { id: 5, label: 'CYCLES\n== 3?', type: 'decision', desc: 'Check if we have completed 3 cycles.', x: -6, y: -3 },
  { id: 6, label: 'END', type: 'sequence', desc: 'System shutdown.', x: -6, y: -7.5 }
];

let executionPath = [0];
let pathIdx = 0;

let timerVal = 1;
let lightState = 'RED'; // RED -> GREEN -> YELLOW -> RED
let cycles = 0;

let isRunning = false;
let isAnimating = false;
let speedMultiplier = 1;
let stats = { steps: 0, loops: 0 };

function updateCodeHighlight(nodeId) {
  document.querySelectorAll('#codepanel .cline').forEach(el => el.classList.remove('active'));
  
  if (nodeId === 0) el('code-init')?.classList.add('active');
  else if (nodeId === 1) el('code-read')?.classList.add('active');
  else if (nodeId === 2) el('code-if')?.classList.add('active');
  else if (nodeId === 3) {
    el('code-change')?.classList.add('active');
    el('code-inc')?.classList.add('active');
  }
  else if (nodeId === 4) el('code-wait')?.classList.add('active');
  else if (nodeId === 5) el('code-while')?.classList.add('active');
  else if (nodeId === 6) el('code-end')?.classList.add('active');
}

/* ---------- DOM ELEMENTS ---------- */
const lblStage = el('liveStageLabel');
const descStage = el('liveStageDesc');

const valTimer = el('valTimer');
const valLight = el('valLight');
const valDecision = el('valDecision');

const hudStep = el('hudStep');
const hudStage = el('hudStage');
const hudBar = el('hudBar');
const valve = el('valve');

function getNextLight(current) {
  if (current === 'RED') return 'GREEN';
  if (current === 'GREEN') return 'YELLOW';
  return 'RED';
}

function generateExecutionPath() {
  timerVal = 1;
  lightState = 'RED';
  cycles = 0;
  executionPath = [0];
}

function updateUI() {
  valTimer.textContent = timerVal;
  valLight.textContent = lightState;
  
  if(lightState === 'RED') valLight.style.color = '#ff5f56';
  else if(lightState === 'GREEN') valLight.style.color = '#4f9d7a';
  else valLight.style.color = '#e0a23c';

  hudStep.textContent = stats.steps;
  hudBar.style.width = Math.min((stats.steps / 25) * 100, 100) + '%';

  const node = NODES[executionPath[pathIdx]];
  if(node) {
    updateCodeHighlight(node.id);
    lblStage.textContent = node.label.replace('\n', ' ');
    hudStage.textContent = node.type.toUpperCase();
    
    if (node.type === 'input') lblStage.style.color = '#3f9fc4';
    else if (node.type === 'decision') lblStage.style.color = '#e0a23c';
    else if (node.type === 'process') lblStage.style.color = '#4f9d7a';
    else lblStage.style.color = '#9fb0bd';

    if (node.id === 2) {
      descStage.innerHTML = `Timer = ${timerVal}s<br>${timerVal} == 0 ? <b style="color:${timerVal===0?'#4f9d7a':'#ff5f56'}">${timerVal===0?'TRUE':'FALSE'}</b>`;
      valDecision.textContent = timerVal===0?'TRUE':'FALSE';
      valDecision.style.color = timerVal===0?'#4f9d7a':'#ff5f56';
    } else if (node.id === 5) {
      descStage.innerHTML = `Cycles = ${cycles}<br>${cycles} == 3 ? <b style="color:${cycles>=3?'#4f9d7a':'#ff5f56'}">${cycles>=3?'TRUE':'FALSE'}</b>`;
      valDecision.textContent = cycles>=3?'TRUE':'FALSE';
      valDecision.style.color = cycles>=3?'#4f9d7a':'#ff5f56';
    } else {
      descStage.textContent = node.desc;
    }
  }
}

/* ---------- THREE.JS SCENE ---------- */
const canvas = el('scene');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0e141a);
scene.fog = new THREE.Fog(0x0e141a, 30, 80);

const camera = new THREE.PerspectiveCamera(40, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
camera.position.set(0, 5, 30);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.setSize(canvas.clientWidth, canvas.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);
const dirLight = new THREE.DirectionalLight(0xfffff0, 1.2);
dirLight.position.set(20, 30, 20);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 1024;
dirLight.shadow.mapSize.height = 1024;
scene.add(dirLight);

/* Backdrop Grid */
const gridGeo = new THREE.PlaneGeometry(40, 40, 20, 20);
const gridMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.03 });
const grid = new THREE.Mesh(gridGeo, gridMat);
grid.position.set(-6, 2, -1);
scene.add(grid);

/* Materials */
const matRobot = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x0088ff, emissiveIntensity: 2, roughness: 0.2 });
const matCar = new THREE.MeshStandardMaterial({ color: 0x1133aa, metalness: 0.7, roughness: 0.2 });
const matSeq = new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.2, metalness: 0.1 });
const matInp = new THREE.MeshStandardMaterial({ color: 0x3f9fc4, roughness: 0.2, metalness: 0.1 });
const matDec = new THREE.MeshStandardMaterial({ color: 0xe0a23c, roughness: 0.2, metalness: 0.1 });
const matPro = new THREE.MeshStandardMaterial({ color: 0x4f9d7a, roughness: 0.2, metalness: 0.1 });

/* Traffic Scene */
const road = new THREE.Mesh(new THREE.PlaneGeometry(30, 10), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 }));
road.rotation.x = -Math.PI / 2;
road.position.set(15, -10, -4);
road.receiveShadow = true;
scene.add(road);

for(let i=0; i<5; i++) {
  const line = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.3), new THREE.MeshBasicMaterial({color:0xdddddd}));
  line.rotation.x = -Math.PI / 2;
  line.position.set(5 + i*5, -9.9, -4);
  scene.add(line);
}

const grass = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: 0x0a150a, roughness: 1.0 }));
grass.rotation.x = -Math.PI / 2;
grass.position.set(10, -10.1, -4);
grass.receiveShadow = true;
scene.add(grass);

/* Traffic Light Model */
const tlGroup = new THREE.Group();
tlGroup.position.set(12, -10, -8);
scene.add(tlGroup);

const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 10), new THREE.MeshStandardMaterial({color:0x444444, metalness: 0.8}));
pole.position.y = 5; pole.castShadow = true; tlGroup.add(pole);

const base = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 1.5), new THREE.MeshStandardMaterial({color:0x222222}));
base.position.y = 0.25; tlGroup.add(base);

const housing = new THREE.Mesh(new THREE.BoxGeometry(2.2, 6, 2.2), new THREE.MeshStandardMaterial({color:0x111111, roughness: 0.7}));
housing.position.y = 10; housing.castShadow = true; tlGroup.add(housing);

const visorGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.5, 16, 1, true, 0, Math.PI);
visorGeo.rotateX(Math.PI/2);
const matVisor = new THREE.MeshStandardMaterial({color:0x050505, side: THREE.DoubleSide});
const vRed = new THREE.Mesh(visorGeo, matVisor); vRed.position.set(0, 11.5, 1.2); tlGroup.add(vRed);
const vYel = new THREE.Mesh(visorGeo, matVisor); vYel.position.set(0, 10, 1.2); tlGroup.add(vYel);
const vGrn = new THREE.Mesh(visorGeo, matVisor); vGrn.position.set(0, 8.5, 1.2); tlGroup.add(vGrn);

const matRedOn = new THREE.MeshBasicMaterial({ color: 0xff3333 });
const matRedOff = new THREE.MeshStandardMaterial({ color: 0x440000 });
const matYellowOn = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
const matYellowOff = new THREE.MeshStandardMaterial({ color: 0x443300 });
const matGreenOn = new THREE.MeshBasicMaterial({ color: 0x33ff33 });
const matGreenOff = new THREE.MeshStandardMaterial({ color: 0x004400 });

const lRed = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.2, 16), matRedOn);
lRed.rotation.x = Math.PI / 2; lRed.position.set(0, 11.5, 1.15); tlGroup.add(lRed);

const lYellow = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.2, 16), matYellowOff);
lYellow.rotation.x = Math.PI / 2; lYellow.position.set(0, 10, 1.15); tlGroup.add(lYellow);

const lGreen = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.2, 16), matGreenOff);
lGreen.rotation.x = Math.PI / 2; lGreen.position.set(0, 8.5, 1.15); tlGroup.add(lGreen);

/* Car Model */
const carGrp = new THREE.Group();
carGrp.position.set(2, -9.5, -2.5);
scene.add(carGrp);
const matChassis = new THREE.MeshStandardMaterial({ color: 0x1144cc, metalness: 0.8, roughness: 0.2 });
const chassis = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.9, 2.2), matChassis);
chassis.position.y = 0.65; chassis.castShadow = true; carGrp.add(chassis);
const matGlass = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.1 });
const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.8, 1.9), matGlass);
cabin.position.set(-0.3, 1.5, 0); cabin.castShadow = true; carGrp.add(cabin);

const matTire = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.3, 16);
wheelGeo.rotateX(Math.PI/2);
const w1 = new THREE.Mesh(wheelGeo, matTire); w1.position.set(1.4, 0.45, 1.2); carGrp.add(w1);
const w2 = new THREE.Mesh(wheelGeo, matTire); w2.position.set(-1.4, 0.45, 1.2); carGrp.add(w2);
const w3 = new THREE.Mesh(wheelGeo, matTire); w3.position.set(1.4, 0.45, -1.2); carGrp.add(w3);
const w4 = new THREE.Mesh(wheelGeo, matTire); w4.position.set(-1.4, 0.45, -1.2); carGrp.add(w4);
const hl1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.5), new THREE.MeshBasicMaterial({color: 0xffffff}));
hl1.position.set(2.3, 0.8, 0.7); carGrp.add(hl1);
const hl2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.5), new THREE.MeshBasicMaterial({color: 0xffffff}));
hl2.position.set(2.3, 0.8, -0.7); carGrp.add(hl2);
const hlLight = new THREE.SpotLight(0xffffff, 2, 20, Math.PI/6, 0.5, 1);
hlLight.position.set(2.3, 0.8, 0); hlLight.target.position.set(10, 0, 0);
carGrp.add(hlLight); carGrp.add(hlLight.target);

function updateTrafficLightVisuals() {
  lRed.material = (lightState === 'RED') ? matRedOn : matRedOff;
  lYellow.material = (lightState === 'YELLOW') ? matYellowOn : matYellowOff;
  lGreen.material = (lightState === 'GREEN') ? matGreenOn : matGreenOff;
}

/* 2D Shape Geometries for Flowchart */
function createExtrudedMesh(shape, mat) {
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.4, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.1, bevelThickness: 0.1 });
  geo.center();
  const mesh = new THREE.Mesh(geo, mat.clone());
  mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}

function getOval() {
  const shape = new THREE.Shape();
  shape.absarc(-2, 0, 1, Math.PI/2, Math.PI*1.5, false);
  shape.absarc(2, 0, 1, -Math.PI/2, Math.PI/2, false);
  return createExtrudedMesh(shape, matSeq);
}

function getPara() {
  const shape = new THREE.Shape();
  shape.moveTo(-2, -1); shape.lineTo(3, -1); shape.lineTo(2, 1); shape.lineTo(-3, 1);
  return createExtrudedMesh(shape, matInp);
}

function getDiamond() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 2); shape.lineTo(3, 0); shape.lineTo(0, -2); shape.lineTo(-3, 0);
  return createExtrudedMesh(shape, matDec);
}

function getRect() {
  const shape = new THREE.Shape();
  shape.moveTo(-3, -1); shape.lineTo(3, -1); shape.lineTo(3, 1); shape.lineTo(-3, 1);
  return createExtrudedMesh(shape, matPro);
}

/* Flowchart Nodes */
const nodeMeshes = {};

function makeLabel(text, color, size=48) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const ctx = c.getContext('2d');

  ctx.fillStyle = color;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 8;
  ctx.font = `bold ${size}px 'IBM Plex Mono', monospace, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  const lines = text.split('\n');
  if (lines.length === 1) {
    ctx.strokeText(lines[0], 256, 128);
    ctx.fillText(lines[0], 256, 128);
  } else {
    ctx.strokeText(lines[0], 256, 100);
    ctx.fillText(lines[0], 256, 100);
    ctx.strokeText(lines[1], 256, 156);
    ctx.fillText(lines[1], 256, 156);
  }
  
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(7, 3.5, 1);
  return sprite;
}

NODES.forEach((node) => {
  let mesh;
  if (node.type === 'sequence') mesh = getOval();
  else if (node.type === 'input') mesh = getPara();
  else if (node.type === 'decision') mesh = getDiamond();
  else mesh = getRect();

  mesh.position.set(node.x, node.y, 0);
  scene.add(mesh);

  const glowMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, wireframe: true });
  const glow = new THREE.Mesh(mesh.geometry.clone(), glowMat);
  glow.scale.set(1.1, 1.1, 1.1);
  glow.position.copy(mesh.position);
  scene.add(glow);

  const lbl = makeLabel(node.label, '#ffffff', 58, false);
  lbl.position.set(node.x, node.y, 0.4);
  scene.add(lbl);

  nodeMeshes[node.id] = { mesh, glow, pos: new THREE.Vector3(node.x, node.y, 0), lbl };
});

/* Connecting Lines & Arrows */
function drawLineSegments(pointsArr, color = 0x8899aa) {
  for(let i=0; i<pointsArr.length-1; i++) {
    const p1 = new THREE.Vector3(...pointsArr[i]);
    const p2 = new THREE.Vector3(...pointsArr[i+1]);
    const dist = p1.distanceTo(p2);
    const mid = p1.clone().lerp(p2, 0.5);
    const geo = new THREE.CylinderGeometry(0.1, 0.1, dist, 8);
    const mat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.6 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(mid);
    mesh.lookAt(p2);
    mesh.rotateX(Math.PI/2);
    scene.add(mesh);
    
    const sGeo = new THREE.SphereGeometry(0.11, 8, 8);
    const sMesh = new THREE.Mesh(sGeo, mat);
    sMesh.position.copy(p1);
    scene.add(sMesh);
  }
  const lastP = new THREE.Vector3(...pointsArr[pointsArr.length-1]);
  const prevP = new THREE.Vector3(...pointsArr[pointsArr.length-2]);
  const aGeo = new THREE.ConeGeometry(0.4, 0.8, 16);
  const aMat = new THREE.MeshStandardMaterial({ color: color });
  const arrow = new THREE.Mesh(aGeo, aMat);
  arrow.position.copy(lastP);
  arrow.lookAt(lastP.clone().add(lastP.clone().sub(prevP)));
  arrow.rotateX(Math.PI/2);
  scene.add(arrow);
}

drawLineSegments([[-6, 15, -0.2], [-6, 12.5, -0.2]]);
drawLineSegments([[-6, 10.5, -0.2], [-6, 8.5, -0.2]]);
drawLineSegments([[-9, 6.5, -0.2], [-12, 6.5, -0.2], [-12, 3, -0.2]], 0x4f9d7a);
drawLineSegments([[-3, 6.5, -0.2], [0, 6.5, -0.2], [0, 3, -0.2]], 0xff5f56);
drawLineSegments([[-12, 1, -0.2], [-12, 0, -0.2], [-6, 0, -0.2], [-6, -1, -0.2]]);
drawLineSegments([[0, 1, -0.2], [0, 0, -0.2], [-6, 0, -0.2]]);
drawLineSegments([[-6, -5, -0.2], [-6, -6.5, -0.2]]);
drawLineSegments([[-3, -3, -0.2], [4, -3, -0.2], [4, 13, -0.2], [-4, 13, -0.2], [-4, 12.5, -0.2]], 0xff5f56);

const lblYes1 = makeLabel('YES', '#88ffbb', 46); lblYes1.position.set(-9.5, 7.3, 0.5); scene.add(lblYes1);
const lblNo1 = makeLabel('NO', '#ff8888', 46); lblNo1.position.set(-2.5, 7.3, 0.5); scene.add(lblNo1);
const lblYes2 = makeLabel('YES', '#88ffbb', 46); lblYes2.position.set(-4.5, -5.7, 0.5); scene.add(lblYes2);
const lblNo2 = makeLabel('NO', '#ff8888', 46); lblNo2.position.set(-2, -2.2, 0.5); scene.add(lblNo2);

/* Robot Indicator */
const robotGrp = new THREE.Group();
scene.add(robotGrp);
const botBody = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), matRobot);
botBody.castShadow = true; robotGrp.add(botBody);
const botLight = new THREE.PointLight(0x00ffff, 1.5, 10);
robotGrp.add(botLight);

/* Resize Handler */
window.addEventListener('resize', () => {
  const w = canvas.parentElement.clientWidth;
  const h = canvas.parentElement.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
});

let time = 0;
const camTarget = new THREE.Vector3();

function animateScene() {
  requestAnimationFrame(animateScene);
  time += 0.05;
  
  if(!isAnimating && executionPath.length > 0 && nodeMeshes[executionPath[pathIdx]]) {
    robotGrp.position.copy(nodeMeshes[executionPath[pathIdx]].pos);
    robotGrp.position.z = 1.0 + Math.sin(time) * 0.1;
  }

  // Camera smooth follow - Fixed framing to show entire scene
  if(executionPath.length > 0 && nodeMeshes[executionPath[pathIdx]]) {
      camTarget.x = THREE.MathUtils.lerp(camTarget.x, (robotGrp.position.x * 0.05) + 3, 0.05);
      camTarget.y = THREE.MathUtils.lerp(camTarget.y, (robotGrp.position.y * 0.05) + 4, 0.05);
      camera.position.lerp(new THREE.Vector3(camTarget.x, camTarget.y, 40), 0.05);
      camera.lookAt(camTarget.x, camTarget.y, 0);
  }

  // Car animation logic
  if(lightState === 'GREEN' && carGrp.position.x < 25) {
    carGrp.position.x += 0.35;
  } else if(carGrp.position.x >= 25) {
    carGrp.position.x = -2; 
  } else if(lightState !== 'GREEN' && carGrp.position.x < 9) {
    carGrp.position.x += (9 - carGrp.position.x) * 0.08;
  }

  renderer.render(scene, camera);
}

/* ---------- EXECUTION LOGIC ---------- */
const delay = ms => new Promise(res => setTimeout(res, ms / speedMultiplier));

async function executeCycle() {
  if (isAnimating) return;
  const currentNodeId = executionPath[pathIdx];
  if (currentNodeId === 6) return; 

  isAnimating = true;
  valve.style.opacity = '1';

  // Restore opacities from previous steps
  nodeMeshes[3].mesh.material.opacity = 1; nodeMeshes[3].mesh.material.transparent = false;
  nodeMeshes[4].mesh.material.opacity = 1; nodeMeshes[4].mesh.material.transparent = false;
  lblYes1.material.opacity = 1; lblNo1.material.opacity = 1;
  lblYes2.material.opacity = 1; lblNo2.material.opacity = 1;

  let targetNodeId = 0;
  
  if (currentNodeId === 0) targetNodeId = 1;
  else if (currentNodeId === 1) targetNodeId = 2;
  else if (currentNodeId === 2) {
    if (timerVal === 0) targetNodeId = 3; 
    else targetNodeId = 4; 
  }
  else if (currentNodeId === 3 || currentNodeId === 4) targetNodeId = 5;
  else if (currentNodeId === 5) {
    if (cycles >= 3) {
      targetNodeId = 6;
    } else {
      targetNodeId = 1; 
      stats.loops++;
    }
  }

  executionPath.push(targetNodeId);
  pathIdx++;
  stats.steps++;

  updateUI();

  // Dim unused branch
  if (currentNodeId === 2) {
    if (targetNodeId === 3) {
      nodeMeshes[4].mesh.material.opacity = 0.2; nodeMeshes[4].mesh.material.transparent = true; lblNo1.material.opacity = 0.2;
    } else {
      nodeMeshes[3].mesh.material.opacity = 0.2; nodeMeshes[3].mesh.material.transparent = true; lblYes1.material.opacity = 0.2;
    }
  }
  if (currentNodeId === 5) {
    if (targetNodeId === 6) {
      lblNo2.material.opacity = 0.2;
    } else {
      lblYes2.material.opacity = 0.2;
    }
  }
  
  // Jump animation
  const startPos = nodeMeshes[currentNodeId].pos.clone();
  const endPos = nodeMeshes[targetNodeId].pos.clone();
  nodeMeshes[targetNodeId].glow.material.opacity = 0.8;
  nodeMeshes[targetNodeId].glow.material.color.setHex(0x3f9fc4);
  
  const steps = (targetNodeId === 1 && currentNodeId === 5) ? 60 : 30; 
  for(let i=0; i<=steps; i++) {
    const t = i / steps;
    let arcX = 0;
    if (targetNodeId === 1 && currentNodeId === 5) {
      arcX = Math.sin(t * Math.PI) * 11;
    }
    robotGrp.position.x = THREE.MathUtils.lerp(startPos.x, endPos.x, t) + arcX;
    robotGrp.position.y = THREE.MathUtils.lerp(startPos.y, endPos.y, t);
    robotGrp.position.z = 1.0 + Math.sin(t * Math.PI) * 2; 
    await delay(15);
  }
  robotGrp.position.copy(endPos);
  robotGrp.position.z = 1.0;

  // Process logic
  matRobot.color.setHex(0xe0a23c);
  botLight.color.setHex(0xe0a23c);
  nodeMeshes[targetNodeId].glow.material.color.setHex(0xe0a23c);
  await delay(500);

  if (targetNodeId === 3) { 
    lightState = getNextLight(lightState);
    updateTrafficLightVisuals();
    timerVal = (lightState === 'GREEN' ? 1 : (lightState === 'YELLOW' ? 0 : 1));
    cycles++;
  } else if (targetNodeId === 4) { 
    timerVal = Math.max(0, timerVal - 1);
  }

  updateUI();
  matRobot.color.setHex(0x4f9d7a);
  botLight.color.setHex(0x4f9d7a);
  nodeMeshes[targetNodeId].glow.material.color.setHex(0x4f9d7a);
  await delay(500);

  matRobot.color.setHex(0x00ffff);
  botLight.color.setHex(0x00ffff);
  nodeMeshes[targetNodeId].glow.material.opacity = 0;
  
  isAnimating = false;
  valve.style.opacity = '0';

  if (targetNodeId === 6) {
    showCompletion();
  } else if (isRunning) {
    executeCycle();
  }
}

function showCompletion() {
  isRunning = false;
  el('btnPlay').textContent = 'Play Auto';
  
  setTimeout(() => {
    el('coExec').textContent = stats.steps;
    el('coLoops').textContent = stats.loops;
    
    const overlay = el('completionOverlay');
    overlay.style.display = 'flex';
    void overlay.offsetWidth;
    overlay.style.opacity = '1';
  }, 500);
}

function resetSimulation() {
  generateExecutionPath();
  pathIdx = 0;
  stats = { steps: 0, loops: 0 };
  el('hudStep').innerText = '0';
  el('hudStage').innerText = 'SEQUENCE';
  el('liveStageLabel').innerText = 'START';
  el('liveStageDesc').innerText = 'Initialize the system.';
  updateCodeHighlight(0);
  
  isRunning = false;
  isAnimating = false;
  
  timerVal = 1; updateTrafficLightVisuals();
  
  if (nodeMeshes[0]) robotGrp.position.copy(nodeMeshes[0].pos);
  robotGrp.position.z = 1.0;
  
  camTarget.set(3, 4, 0);
  camera.position.set(3, 4, 40);
  camera.lookAt(3, 4, 0);
  
  carGrp.position.set(2, -9.5, -2.5);
  
  nodeMeshes[3].mesh.material.opacity = 1; nodeMeshes[3].mesh.material.transparent = false;
  nodeMeshes[4].mesh.material.opacity = 1; nodeMeshes[4].mesh.material.transparent = false;
  lblYes1.material.opacity = 1; lblNo1.material.opacity = 1;
  lblYes2.material.opacity = 1; lblNo2.material.opacity = 1;
  lblYes1.material.opacity = 1; lblNo1.material.opacity = 1;
  lblYes2.material.opacity = 1; lblNo2.material.opacity = 1;

  el('completionOverlay').style.opacity = '0';
  setTimeout(() => el('completionOverlay').style.display = 'none', 500);
  
  el('btnPlay').textContent = 'Play Auto';
  lblStage.textContent = 'READY';
  hudStage.textContent = 'READY';
  descStage.textContent = 'Press Step or Play to begin execution.';
  
  updateUI();
}

/* ---------- CONTROLS ---------- */
el('btnStep').onclick = () => {
  if (!isAnimating && executionPath[pathIdx] !== 6) {
    isRunning = false;
    el('btnPlay').textContent = 'Play Auto';
    executeCycle();
  }
};

el('btnPlay').onclick = () => {
  if (executionPath[pathIdx] === 6) return;
  
  isRunning = !isRunning;
  if (isRunning) {
    el('btnPlay').textContent = 'Pause';
    if (!isAnimating) executeCycle();
  } else {
    el('btnPlay').textContent = 'Play Auto';
  }
};

const speeds = [0.75, 1, 1.5, 2];
let speedIdx = 1;
el('btnSpeed').onclick = () => {
  speedIdx = (speedIdx + 1) % speeds.length;
  speedMultiplier = speeds[speedIdx];
  el('btnSpeed').textContent = `Speed ${speedMultiplier}×`;
};

el('btnReset').onclick = resetSimulation;

el('btnRetryExp').onclick = resetSimulation;

/* ---------- QUIZ LOGIC ---------- */
const questions = [
  { text: "IF/ELSE Decision", answer: "Diamond", detail: "A Diamond is always used for evaluating True/False decisions." },
  { text: "Start / End Terminator", answer: "Oval", detail: "An Oval (or pill) is used to mark the start and end of a program." },
  { text: "Process or Action", answer: "Rect", detail: "A Rectangle represents a process, like changing a variable or executing a function." },
  { text: "Input / Output (Data)", answer: "Para", detail: "A Parallelogram is used when reading input (like the timer) or displaying output." }
];
let currentQuestion = null;

const qOval = el('btnQuizOval');
const qDiamond = el('btnQuizDiamond');
const qRect = el('btnQuizRect');
const qPara = el('btnQuizPara');
const qPrompt = el('quizPrompt');
const qContainer = el('quizContainer');
const qResult = el('quizResult');
const qResultMessage = el('quizResultMessage');
const qRetry = el('btnQuizRetry');

function loadRandomQuestion() {
  currentQuestion = questions[Math.floor(Math.random() * questions.length)];
  qPrompt.innerHTML = `To prove your understanding, select the correct flowchart shape to represent an <b>${currentQuestion.text}</b>.`;
  qContainer.style.display = 'block';
  qResult.style.display = 'none';
  [qOval, qDiamond, qRect, qPara].forEach(b => {
    b.style.pointerEvents = 'auto';
    b.style.opacity = '1';
    b.style.borderColor = 'rgba(0,0,0,0.1)';
    b.style.background = 'transparent';
  });
}

function handleQuizClick(btn, type) {
  const isCorrect = (type === currentQuestion.answer);
  qContainer.style.display = 'none';
  qResult.style.display = 'flex';
  
  if (isCorrect) {
    qResultMessage.innerHTML = `<span style="color:#4f9d7a; font-size:16px;"><b>Correct!</b></span><br><br>${currentQuestion.detail}`;
    qRetry.innerText = 'Try Another Question';
  } else {
    qResultMessage.innerHTML = `<span style="color:#ff5f56; font-size:16px;"><b>Incorrect.</b></span><br><br>Think about the geometric rules of flowcharts!`;
    qRetry.innerText = 'Try Again';
  }
}

qOval.onclick = () => handleQuizClick(qOval, 'Oval');
qRect.onclick = () => handleQuizClick(qRect, 'Rect');
qDiamond.onclick = () => handleQuizClick(qDiamond, 'Diamond');
qPara.onclick = () => handleQuizClick(qPara, 'Para');
qRetry.onclick = loadRandomQuestion;

// Init Quiz
loadRandomQuestion();

/* INIT */
resetSimulation();
animateScene();
