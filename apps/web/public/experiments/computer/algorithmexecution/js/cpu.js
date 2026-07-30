const el = id => document.getElementById(id);

/* ---------- ALGORITHM & STATE ---------- */
const NODES = [
  { id: 0, label: 'START', type: 'sequence', desc: 'Initialize the algorithm.', x: 0, z: 0 },
  { id: 1, label: 'INPUT', type: 'input', desc: 'Input: The algorithm receives temperature data.', x: 4.5, z: 0 },
  { id: 2, label: 'TEMP > 30?', type: 'decision', desc: 'Decision: Check if temperature is hot.', x: 9, z: 0 },
  { id: 3, label: 'PROCESS', type: 'process', desc: 'Action based on YES decision (Fan ON).', x: 13.5, z: -3 },
  { id: 4, label: 'PROCESS', type: 'process', desc: 'Action based on NO decision (Fan OFF).', x: 13.5, z: 3 },
  { id: 5, label: 'OUTPUT', type: 'output', desc: 'Results are sent back to the system.', x: 18, z: 0 },
  { id: 6, label: 'END', type: 'sequence', desc: 'Algorithm terminates successfully.', x: 22.5, z: 0 }
];

let executionPath = [];
let pathIdx = 0;

let tempVal = 32;
let fanState = 'OFF';
let currentStage = -1;
let isRunning = false;
let isAnimating = false;
let speedMultiplier = 1;

let stats = { steps: 0, decisions: 0 };
let isAdvanced = false;

/* ---------- DOM ELEMENTS ---------- */
const executionQueue = el('executionQueue');
const sFetch = el('stageFetch');
const sDecode = el('stageDecode');
const sExecute = el('stageExecute');
const sUpdate = el('stageUpdate');

const lblStage = el('liveStageLabel');
const descStage = el('liveStageDesc');

const valTemp = el('valTemp');
const valFan = el('valFan');
const valStep = el('valStep');

const hudPC = el('hudPC');
const hudStage = el('hudStage');
const hudBar = el('hudBar');
const valve = el('valve');

function generateExecutionPath() {
  tempVal = (Math.random() > 0.5) ? 32 : 25;
  fanState = 'OFF'; // Initial state
  executionPath = [0, 1, 2];
  if (tempVal > 30) {
    executionPath.push(3);
  } else {
    executionPath.push(4);
  }
  executionPath.push(5, 6);
  
  executionQueue.innerHTML = executionPath.map((nodeId, idx) => `
    <div class="mem-item" id="mem-${idx}">
      <span class="mem-addr">${idx + 1}</span>
      <span class="mem-cmd">${NODES[nodeId].label}</span>
    </div>
  `).join('');
}

function updateUI() {
  // Update Variables
  valTemp.textContent = tempVal;
  valFan.textContent = fanState;
  valStep.textContent = pathIdx;
  
  hudPC.textContent = pathIdx + 1;
  hudBar.style.width = ((pathIdx / (executionPath.length - 1)) * 100) + '%';

  // Highlight Memory
  for (let i = 0; i < executionPath.length; i++) {
    const m = el(`mem-${i}`);
    if (m) {
      if (i === pathIdx) m.classList.add('active');
      else m.classList.remove('active');
    }
  }

  // Highlight Execution Stages
  sFetch.className = 'stage' + (currentStage === 0 ? ' active' : '');
  sDecode.className = 'stage' + (currentStage === 1 ? ' active decode' : '');
  sExecute.className = 'stage' + (currentStage === 2 ? ' active execute' : '');
  sUpdate.className = 'stage' + (currentStage === 3 ? ' active' : '');

  // Update Explanation
  if (currentStage === 0) {
    lblStage.textContent = 'INPUT';
    hudStage.textContent = 'INPUT';
    lblStage.style.color = '#3f9fc4';
    descStage.textContent = 'The algorithm receives an input.';
  } else if (currentStage === 1) {
    lblStage.textContent = 'DECISION';
    hudStage.textContent = 'DECISION';
    lblStage.style.color = '#e0a23c';
    descStage.innerHTML = `Temperature = ${tempVal}°C<br>${tempVal} > 30 ? <b style="color:${tempVal>30?'#4f9d7a':'#e0a23c'}">${tempVal>30?'TRUE':'FALSE'}</b> (Taking ${tempVal>30?'YES':'NO'})`;
  } else if (currentStage === 2) {
    lblStage.textContent = 'PROCESS';
    hudStage.textContent = 'PROCESS';
    lblStage.style.color = '#4f9d7a';
    descStage.textContent = 'The algorithm performs the required action.';
  } else if (currentStage === 3) {
    lblStage.textContent = 'OUTPUT';
    hudStage.textContent = 'OUTPUT';
    lblStage.style.color = '#fff';
    descStage.textContent = 'The algorithm presents the final result.';
  } else {
    lblStage.textContent = 'SEQUENCE';
    hudStage.textContent = 'SEQUENCE';
    lblStage.style.color = '#9fb0bd';
    if(pathIdx < executionPath.length) descStage.textContent = NODES[executionPath[pathIdx]].desc;
  }
}

/* ---------- THREE.JS SCENE ---------- */
const canvas = el('scene');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x021118);

const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
camera.position.set(-5, 12, 18);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.setSize(canvas.clientWidth, canvas.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const ambient = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambient);
const spot = new THREE.SpotLight(0xffffff, 1.2);
spot.position.set(10, 20, 10);
spot.castShadow = true;
scene.add(spot);

/* Materials */
const matFloor = new THREE.MeshStandardMaterial({ color: 0x09141c, roughness: 0.9, metalness: 0.1 });
const matPath = new THREE.MeshStandardMaterial({ color: 0x182a36, roughness: 0.7 });
const matRobot = new THREE.MeshStandardMaterial({ color: 0x4f9d7a, roughness: 0.3, metalness: 0.5 });
const matActive = new THREE.MeshBasicMaterial({ color: 0x4f9d7a });

/* Create Environment */
const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), matFloor);
floor.rotation.x = -Math.PI / 2;
floor.position.x = 10;
floor.receiveShadow = true;
scene.add(floor);

const nodeMeshes = {};

const matSeq = new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.5 });
const matInp = new THREE.MeshStandardMaterial({ color: 0x3f9fc4, roughness: 0.5 });
const matDec = new THREE.MeshStandardMaterial({ color: 0xe0a23c, roughness: 0.5 });
const matPro = new THREE.MeshStandardMaterial({ color: 0x4f9d7a, roughness: 0.5 });
const matOut = new THREE.MeshStandardMaterial({ color: 0xa575cc, roughness: 0.5 });

function makeLabel(text, color, size=24) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = color;
  ctx.font = `bold ${size}px sans-serif`;
  ctx.textAlign = 'center';
  
  const lines = text.split('\\n');
  lines.forEach((line, index) => {
    ctx.fillText(line, 128, 64 + (index * 30));
  });

  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(4, 2, 1);
  return sprite;
}

// Build 3D Flowchart
NODES.forEach((node) => {
  // Node Shape
  let geo;
  let mat;
  if (node.type === 'sequence') { geo = new THREE.BoxGeometry(2.5, 0.3, 1.5); mat = matSeq; }
  else if (node.type === 'input') { geo = new THREE.BoxGeometry(2.5, 0.3, 2); mat = matInp; }
  else if (node.type === 'decision') { geo = new THREE.OctahedronGeometry(1.5, 0); mat = matDec; }
  else if (node.type === 'process') { geo = new THREE.BoxGeometry(2.5, 0.3, 2.5); mat = matPro; }
  else { geo = new THREE.BoxGeometry(2.5, 0.3, 2); mat = matOut; }

  const mesh = new THREE.Mesh(geo, mat.clone());
  mesh.position.set(node.x, (node.type === 'decision') ? 0.8 : 0.2, node.z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  // Outline / Glow helper
  const glowGeo = geo.clone();
  glowGeo.scale(1.1, 1.1, 1.1);
  const glow = new THREE.Mesh(glowGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, wireframe: true }));
  glow.position.copy(mesh.position);
  scene.add(glow);

  const lbl = makeLabel(node.label, '#ffffff', 28);
  lbl.position.set(node.x, 2, node.z);
  scene.add(lbl);

  nodeMeshes[node.id] = { mesh, glow, pos: new THREE.Vector3(node.x, 1, node.z) };
});

function createTrack(p1, p2) {
  const dist = p1.distanceTo(p2);
  const track = new THREE.Mesh(new THREE.PlaneGeometry(dist, 1), matPath);
  track.rotation.x = -Math.PI / 2;
  
  const mid = p1.clone().lerp(p2, 0.5);
  track.position.set(mid.x, 0.01, mid.z);
  
  track.lookAt(p2.x, 0.01, p2.z);
  track.receiveShadow = true;
  scene.add(track);
}

// Add tracks physically
createTrack(new THREE.Vector3(0,0,0), new THREE.Vector3(4.5,0,0));
createTrack(new THREE.Vector3(4.5,0,0), new THREE.Vector3(9,0,0));
createTrack(new THREE.Vector3(9,0,0), new THREE.Vector3(13.5,0,-3));
createTrack(new THREE.Vector3(9,0,0), new THREE.Vector3(13.5,0,3));
createTrack(new THREE.Vector3(13.5,0,-3), new THREE.Vector3(18,0,0));
createTrack(new THREE.Vector3(13.5,0,3), new THREE.Vector3(18,0,0));
createTrack(new THREE.Vector3(18,0,0), new THREE.Vector3(22.5,0,0));

const lblYes = makeLabel('YES', '#4f9d7a', 28);
lblYes.position.set(11.25, 1.2, -1.8);
scene.add(lblYes);

const lblNo = makeLabel('NO', '#e0a23c', 28);
lblNo.position.set(11.25, 1.2, 1.8);
scene.add(lblNo);

/* Robot */
const robotGrp = new THREE.Group();
scene.add(robotGrp);

const botBase = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 0.4, 16), matRobot);
botBase.position.y = 0.2;
botBase.castShadow = true;
robotGrp.add(botBase);

const botBody = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 16), matRobot);
botBody.position.y = 0.9;
botBody.castShadow = true;
robotGrp.add(botBody);

const botEye = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.5), new THREE.MeshBasicMaterial({ color: 0xffffff }));
botEye.position.set(0, 1, 0.4);
robotGrp.add(botEye);

/* Camera follow target */
const camTarget = new THREE.Vector3();

/* Resize Handler */
window.addEventListener('resize', () => {
  const w = canvas.parentElement.clientWidth;
  const h = canvas.parentElement.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
});

/* Render Loop */
let time = 0;
function animateScene() {
  requestAnimationFrame(animateScene);
  time += 0.05;
  
  // Hover robot
  if(!isAnimating && nodeMeshes[executionPath[pathIdx]]) {
    robotGrp.position.y = nodeMeshes[executionPath[pathIdx]].pos.y + Math.sin(time) * 0.1;
  }

  // Camera smooth follow
  camTarget.copy(robotGrp.position);
  camera.position.lerp(new THREE.Vector3(camTarget.x - 5, 12, 12), 0.05);
  camera.lookAt(camTarget.x + 3, 0, 0);

  renderer.render(scene, camera);
}
animateScene();

/* ---------- EXECUTION LOGIC ---------- */
const delay = ms => new Promise(res => setTimeout(res, ms / speedMultiplier));

async function executeCycle() {
  if (isAnimating || pathIdx >= executionPath.length - 1) return;
  isAnimating = true;
  valve.style.opacity = '1';

  // Move robot to next node
  const startPos = nodeMeshes[executionPath[pathIdx]].pos.clone();
  pathIdx++;
  const targetNodeId = executionPath[pathIdx];
  const endPos = nodeMeshes[targetNodeId].pos.clone();
  
  stats.steps++;
  
  // Map phase based on instruction type
  const node = NODES[targetNodeId];
  if (node.type === 'input') currentStage = 0;
  else if (node.type === 'decision') { currentStage = 1; stats.decisions++; }
  else if (node.type === 'process') {
    currentStage = 2;
    if (targetNodeId === 3) {
      nodeMeshes[4].mesh.material.opacity = 0.2;
      nodeMeshes[4].mesh.material.transparent = true;
      lblNo.material.opacity = 0.2;
    } else {
      nodeMeshes[3].mesh.material.opacity = 0.2;
      nodeMeshes[3].mesh.material.transparent = true;
      lblYes.material.opacity = 0.2;
    }
  }
  else if (node.type === 'output') currentStage = 3;
  else currentStage = -1;

  updateUI();

  // Highlight target node
  nodeMeshes[targetNodeId].glow.material.opacity = 0.8;
  nodeMeshes[targetNodeId].glow.material.color.setHex(0x3f9fc4);

  // Jump animation
  const steps = 40;
  // Rotate robot to face target
  robotGrp.lookAt(endPos.x, robotGrp.position.y, endPos.z);
  
  for(let i=0; i<=steps; i++) {
    const t = i / steps;
    robotGrp.position.lerpVectors(startPos, endPos, t);
    // Add arc
    robotGrp.position.y += Math.sin(t * Math.PI) * 1.5;
    await delay(15);
  }
  robotGrp.position.copy(endPos);
  robotGrp.rotation.set(0,0,0);

  // Processing animation
  botEye.material.color.setHex(0xe0a23c);
  nodeMeshes[targetNodeId].glow.material.color.setHex(0xe0a23c);
  await delay(600);
  
  // Apply Logic
  if (node.type === 'process') {
    fanState = (targetNodeId === 3) ? 'ON' : 'OFF';
  }
  
  // Execution flash
  botEye.material.color.setHex(0x4f9d7a);
  nodeMeshes[targetNodeId].glow.material.color.setHex(0x4f9d7a);
  updateUI();
  await delay(600);

  botEye.material.color.setHex(0xffffff);
  nodeMeshes[targetNodeId].glow.material.opacity = 0;
  
  isAnimating = false;
  valve.style.opacity = '0';
  currentStage = -1;
  updateUI();

  if (pathIdx >= executionPath.length - 1) {
    isRunning = false;
    el('btnPlay').textContent = 'Play Auto';
    showCompletion();
  } else if (isRunning) {
    executeCycle(); // Continue if auto playing
  }
}

function showCompletion() {
  isRunning = false;
  el('btnPlay').textContent = 'Play Auto';
  
  setTimeout(() => {
    el('coExec').textContent = stats.steps;
    
    el('coTemp').textContent = tempVal;
    el('coResult').textContent = tempVal > 30 ? 'TRUE' : 'FALSE';
    el('coResult').style.color = tempVal > 30 ? '#4f9d7a' : '#e0a23c';
    el('coPath').textContent = tempVal > 30 ? 'YES' : 'NO';
    el('coPath').style.color = tempVal > 30 ? '#4f9d7a' : '#e0a23c';
    
    el('coFinalFan').textContent = fanState;
    el('coFinalFan').style.color = fanState === 'ON' ? '#4f9d7a' : '#e0a23c';
    
    const overlay = el('completionOverlay');
    overlay.style.display = 'flex';
    void overlay.offsetWidth;
    overlay.style.opacity = '1';
  }, 500);
}

function resetSimulation() {
  generateExecutionPath();
  pathIdx = 0;
  currentStage = -1;
  stats = { steps: 0, decisions: 0 };
  isRunning = false;
  isAnimating = false;
  
  robotGrp.position.copy(nodeMeshes[0].pos);
  camera.position.set(-5, 12, 18);
  
  nodeMeshes[3].mesh.material.opacity = 1;
  nodeMeshes[3].mesh.material.transparent = false;
  nodeMeshes[4].mesh.material.opacity = 1;
  nodeMeshes[4].mesh.material.transparent = false;
  lblYes.material.opacity = 1;
  lblNo.material.opacity = 1;

  el('completionOverlay').style.opacity = '0';
  setTimeout(() => el('completionOverlay').style.display = 'none', 500);
  
  el('btnPlay').textContent = 'Play Auto';
  lblStage.textContent = 'READY';
  hudStage.textContent = 'READY';
  descStage.textContent = 'Press Start to begin the algorithm.';
  
  updateUI();
}

/* ---------- CONTROLS ---------- */
el('btnStep').onclick = () => {
  if (!isAnimating && pathIdx < executionPath.length - 1) {
    isRunning = false;
    el('btnPlay').textContent = 'Play Auto';
    executeCycle();
  }
};

el('btnPlay').onclick = () => {
  if (pathIdx >= executionPath.length - 1) return;
  
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

/* Mode Toggles */
el('btnModeBeginner').onclick = () => {
  isAdvanced = false;
  el('btnModeBeginner').classList.add('active');
  el('btnModeAdvanced').classList.remove('active');
  el('advancedArea').style.display = 'none';
};

el('btnModeAdvanced').onclick = () => {
  isAdvanced = true;
  el('btnModeAdvanced').classList.add('active');
  el('btnModeBeginner').classList.remove('active');
  el('advancedArea').style.display = 'block';
};

el('btnRetryExp').onclick = resetSimulation;

/* INIT */
resetSimulation();
