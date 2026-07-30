const el = id => document.getElementById(id);

/* ---------- PROGRAM & STATE ---------- */
const PROGRAM = [
  { label: 'LOAD A', op: 'LOAD', arg: 'A', desc: 'Loads data into Register A.' },
  { label: 'ADD 5', op: 'ADD', arg: 5, desc: 'Adds 5 to Register A.' },
  { label: 'STORE B', op: 'STORE', arg: 'B', desc: 'Stores result into Register B.' },
  { label: 'PRINT', op: 'PRINT', arg: null, desc: 'Outputs the result.' },
  { label: 'END', op: 'END', arg: null, desc: 'Halts the program.' }
];

let pc = 0;
let ir = null;
let regA = 0;
let regB = 0;
let currentStage = -1; // 0: Fetch, 1: Decode, 2: Execute, 3: Update PC
let isRunning = false;
let isAnimating = false;
let playTimer = null;
let speedMultiplier = 1;
let stats = { fetch: 0, decode: 0, execute: 0, instr: 0 };
let isAdvanced = false;

/* ---------- DOM ELEMENTS ---------- */
const memQueue = el('memoryQueue');
const cycleBox = el('cycleBox');
const sFetch = el('stageFetch');
const sDecode = el('stageDecode');
const sExecute = el('stageExecute');
const sUpdate = el('stageUpdate');

const lblStage = el('liveStageLabel');
const descStage = el('liveStageDesc');

const valPC = el('valPC');
const valIR = el('valIR');
const valA = el('valA');
const valB = el('valB');
const hudPC = el('hudPC');
const hudStage = el('hudStage');
const hudBar = el('hudBar');

function initMemoryUI() {
  memQueue.innerHTML = PROGRAM.map((instr, idx) => `
    <div class="mem-item" id="mem-${idx}">
      <span class="mem-addr">0x0${idx}</span>
      <span class="mem-cmd">${instr.label}</span>
    </div>
  `).join('');
}

function updateUI() {
  // Update Registers
  valPC.textContent = pc;
  hudPC.textContent = pc;
  valIR.textContent = ir ? ir.label : '—';
  valA.textContent = regA;
  valB.textContent = regB;
  hudBar.style.width = ((pc / PROGRAM.length) * 100) + '%';

  // Highlight Memory
  for (let i = 0; i < PROGRAM.length; i++) {
    const m = el(`mem-${i}`);
    if (m) {
      if (i === pc) m.classList.add('active');
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
    lblStage.textContent = 'FETCH';
    hudStage.textContent = 'FETCH';
    lblStage.style.color = '#3f9fc4';
    descStage.textContent = 'The CPU reads the next instruction from memory.';
  } else if (currentStage === 1) {
    lblStage.textContent = 'DECODE';
    hudStage.textContent = 'DECODE';
    lblStage.style.color = '#e0a23c';
    descStage.textContent = 'The Control Unit interprets the instruction.';
  } else if (currentStage === 2) {
    lblStage.textContent = 'EXECUTE';
    hudStage.textContent = 'EXECUTE';
    lblStage.style.color = '#4f9d7a';
    descStage.textContent = 'The CPU performs the requested task.';
  } else if (currentStage === 3) {
    lblStage.textContent = 'UPDATE PC';
    hudStage.textContent = 'UPDATE PC';
    lblStage.style.color = '#fff';
    descStage.textContent = 'The Program Counter moves to the next instruction.';
  } else {
    hudStage.textContent = 'READY';
  }
}

/* ---------- THREE.JS SCENE ---------- */
const canvas = el('scene');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x021118);

const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
camera.position.set(0, 15, 20);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.setSize(canvas.clientWidth, canvas.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);
const spot = new THREE.SpotLight(0xffffff, 1.5);
spot.position.set(10, 20, 10);
spot.castShadow = true;
scene.add(spot);

/* Materials */
const matBoard = new THREE.MeshStandardMaterial({ color: 0x1a2e29, roughness: 0.9, metalness: 0.1 });
const matSocket = new THREE.MeshStandardMaterial({ color: 0x3d4342, roughness: 0.6 });
const matGold = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.3, metalness: 1.0 });
const matSilicon = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2, metalness: 0.8 });
const matMetal = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.4, metalness: 0.9 });
const matRamGreen = new THREE.MeshStandardMaterial({ color: 0x0a4a2b, roughness: 0.8 });
const matRamChip = new THREE.MeshStandardMaterial({ color: 0x1a1c1d, roughness: 0.5 });
const matSlot = new THREE.MeshStandardMaterial({ color: 0x111518, roughness: 0.7 });

const matGlowBlue = new THREE.MeshBasicMaterial({ color: 0x3f9fc4 });
const matGlowYellow = new THREE.MeshBasicMaterial({ color: 0xe0a23c });
const matGlowGreen = new THREE.MeshBasicMaterial({ color: 0x4f9d7a });

/* Create Motherboard */
const boardGrp = new THREE.Group();
scene.add(boardGrp);

const board = new THREE.Mesh(new THREE.BoxGeometry(22, 0.4, 16), matBoard);
board.position.y = -0.2;
board.receiveShadow = true;
boardGrp.add(board);

// Decorative traces
const traceMat = new THREE.MeshBasicMaterial({ color: 0x24423a });
for(let i=0; i<8; i++) {
  const trace = new THREE.Mesh(new THREE.BoxGeometry(7, 0.02, 0.1), traceMat);
  trace.position.set(-3.5, 0.01, -3 + i*0.8);
  boardGrp.add(trace);
}

/* CPU Core */
const cpuGrp = new THREE.Group();
cpuGrp.position.set(2, 0, 0);
scene.add(cpuGrp);

// Socket
const cpuSocket = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.3, 6.4), matSocket);
cpuSocket.position.y = 0.15;
cpuSocket.receiveShadow = true;
cpuGrp.add(cpuSocket);

// Substrate
const cpuSubstrate = new THREE.Mesh(new THREE.BoxGeometry(6, 0.1, 6), matRamGreen);
cpuSubstrate.position.y = 0.35;
cpuSubstrate.castShadow = true;
cpuGrp.add(cpuSubstrate);

// Internal Components on Substrate
const matComponent = new THREE.MeshStandardMaterial({ color: 0x2a2f33, roughness: 0.5, metalness: 0.5 });
const matHighlight = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.8 });

// Instruction Register (IR)
const irGrp = new THREE.Group(); irGrp.position.set(-1.5, 0.45, 1.5); cpuGrp.add(irGrp);
const irBlock = new THREE.Mesh(new THREE.BoxGeometry(2, 0.2, 2), matComponent);
irBlock.castShadow = true; irGrp.add(irBlock);
const irGlow = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 2.2), matHighlight.clone());
irGrp.add(irGlow);
const irLbl = makeLabel('IR', '#ffffff', 20); irLbl.position.y = 0.5; irGrp.add(irLbl);

// Control Unit (CU)
const cuGrp = new THREE.Group(); cuGrp.position.set(-1.5, 0.45, -1.5); cpuGrp.add(cuGrp);
const cuBlock = new THREE.Mesh(new THREE.BoxGeometry(2, 0.2, 2), matComponent);
cuBlock.castShadow = true; cuGrp.add(cuBlock);
const cuGlow = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 2.2), matHighlight.clone());
cuGrp.add(cuGlow);
const cuLbl = makeLabel('CU', '#ffffff', 20); cuLbl.position.y = 0.5; cuGrp.add(cuLbl);

// ALU
const aluGrp = new THREE.Group(); aluGrp.position.set(1.5, 0.45, -1.5); cpuGrp.add(aluGrp);
const aluBlock = new THREE.Mesh(new THREE.BoxGeometry(2, 0.2, 2), matComponent);
aluBlock.castShadow = true; aluGrp.add(aluBlock);
const aluGlow = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 2.2), matHighlight.clone());
aluGrp.add(aluGlow);
const aluLbl = makeLabel('ALU', '#ffffff', 20); aluLbl.position.y = 0.5; aluGrp.add(aluLbl);

// Registers
const regBlockGrp = new THREE.Group(); regBlockGrp.position.set(1.5, 0.45, 1.5); cpuGrp.add(regBlockGrp);
const regBox = new THREE.Mesh(new THREE.BoxGeometry(2, 0.2, 2), matComponent);
regBox.castShadow = true; regBlockGrp.add(regBox);
const regGlow = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 2.2), matHighlight.clone());
regBlockGrp.add(regGlow);
const regLbl = makeLabel('REG', '#ffffff', 20); regLbl.position.y = 0.5; regBlockGrp.add(regLbl);

/* RAM Block */
const ramGrp = new THREE.Group();
ramGrp.position.set(-7, 0, 0);
scene.add(ramGrp);

// RAM Slots
for(let i=0; i<2; i++) {
  const slot = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 9), matSlot);
  slot.position.set(i*2 - 1, 0.3, 0);
  slot.castShadow = true;
  slot.receiveShadow = true;
  ramGrp.add(slot);
}

// RAM Stick
const stickGrp = new THREE.Group();
stickGrp.position.set(1, 0.8, 0); // Put in second slot
ramGrp.add(stickGrp);

const pcb = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.5, 8.6), matRamGreen);
pcb.castShadow = true;
stickGrp.add(pcb);

// RAM Chips
for(let i=0; i<4; i++) {
  const chip1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.2, 1.5), matRamChip);
  chip1.position.set(0, 0.2, -3 + i*2);
  stickGrp.add(chip1);
}

// Gold contacts
const contacts = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 8.4), matGold);
contacts.position.y = -1.1;
stickGrp.add(contacts);

/* Labels */
function makeLabel(text, color, size=24) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = color;
  ctx.font = `bold ${size}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(text, 128, 40);
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(4, 1, 1);
  return sprite;
}

const cpuLbl = makeLabel('CPU', '#000000', 36);
cpuLbl.position.set(0, 1.2, 3.5);
cpuGrp.add(cpuLbl);

const ramLbl = makeLabel('MEMORY', '#ffffff', 28);
ramLbl.position.set(-1, 2.5, 0);
ramGrp.add(ramLbl);

/* Data Lines (Glowing Particles) */
const particles = [];
function createParticle(color, start, end) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshBasicMaterial({ color }));
  mesh.position.copy(start);
  scene.add(mesh);
  
  return {
    mesh,
    start: start.clone(),
    end: end.clone(),
    progress: 0,
    active: true
  };
}

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
  
  // Pulse active particle
  particles.forEach((p, idx) => {
    if (p.active) {
      p.progress += 0.02 * speedMultiplier;
      if (p.progress >= 1) {
        scene.remove(p.mesh);
        p.active = false;
      } else {
        p.mesh.position.lerpVectors(p.start, p.end, p.progress);
        p.mesh.scale.setScalar(1 + Math.sin(p.progress * Math.PI) * 0.5);
      }
    }
  });

  renderer.render(scene, camera);
}
animateScene();

/* ---------- EXECUTION LOGIC ---------- */
const delay = ms => new Promise(res => setTimeout(res, ms / speedMultiplier));

async function executeCycle() {
  if (isAnimating || pc >= PROGRAM.length) return;
  isAnimating = true;
  el('valve').style.opacity = '1';

  // FETCH
  currentStage = 0;
  stats.fetch++;
  updateUI();
  // Animation: Memory -> IR
  const fetchParticle = createParticle(0x3f9fc4, ramGrp.position, new THREE.Vector3().addVectors(cpuGrp.position, irGrp.position));
  particles.push(fetchParticle);
  await delay(600);
  irGlow.material.color.setHex(0x3f9fc4);
  await delay(400);
  
  // DECODE
  ir = PROGRAM[pc];
  currentStage = 1;
  stats.decode++;
  updateUI();
  // Animation: IR -> CU
  const decodeParticle = createParticle(0x3f9fc4, new THREE.Vector3().addVectors(cpuGrp.position, irGrp.position), new THREE.Vector3().addVectors(cpuGrp.position, cuGrp.position));
  particles.push(decodeParticle);
  await delay(500);
  irGlow.material.color.setHex(0x000000);
  cuGlow.material.color.setHex(0xe0a23c); // Orange Processing
  await delay(500);

  // EXECUTE
  currentStage = 2;
  stats.execute++;
  updateUI();
  // Animation: CU -> ALU
  const execParticle = createParticle(0xe0a23c, new THREE.Vector3().addVectors(cpuGrp.position, cuGrp.position), new THREE.Vector3().addVectors(cpuGrp.position, aluGrp.position));
  particles.push(execParticle);
  await delay(400);
  cuGlow.material.color.setHex(0x000000);
  aluGlow.material.color.setHex(0x4f9d7a); // Green Execution
  await delay(400);

  // ALU -> Registers (if data operation)
  const dataParticle = createParticle(0x4f9d7a, new THREE.Vector3().addVectors(cpuGrp.position, aluGrp.position), new THREE.Vector3().addVectors(cpuGrp.position, regBlockGrp.position));
  particles.push(dataParticle);
  await delay(400);
  aluGlow.material.color.setHex(0x000000);
  regGlow.material.color.setHex(0x4f9d7a);
  await delay(400);
  regGlow.material.color.setHex(0x000000);

  // Perform logic
  if (ir.op === 'LOAD') {
    regA = 10; // Dummy data
  } else if (ir.op === 'ADD') {
    regA += ir.arg;
  } else if (ir.op === 'STORE') {
    regB = regA;
  }

  // UPDATE PC
  currentStage = 3;
  stats.instr++;
  updateUI();
  await delay(600);
  
  pc++;
  currentStage = -1;
  ir = null;
  updateUI();
  
  isAnimating = false;
  el('valve').style.opacity = '0';

  if (pc >= PROGRAM.length) {
    showCompletion();
  } else if (isRunning) {
    executeCycle(); // Continue if auto playing
  }
}

function showCompletion() {
  isRunning = false;
  el('btnPlay').textContent = 'Play Auto';
  
  setTimeout(() => {
    el('coExec').textContent = stats.instr;
    el('coFetch').textContent = stats.fetch;
    el('coDecode').textContent = stats.decode;
    el('coExecute').textContent = stats.execute;
    
    el('coFinalPC').textContent = pc;
    el('coFinalA').textContent = regA;
    el('coFinalB').textContent = regB;
    
    const overlay = el('completionOverlay');
    overlay.style.display = 'flex';
    void overlay.offsetWidth;
    overlay.style.opacity = '1';
  }, 500);
}

function resetCPU() {
  pc = 0;
  ir = null;
  regA = 0;
  regB = 0;
  currentStage = -1;
  stats = { fetch: 0, decode: 0, execute: 0, instr: 0 };
  isRunning = false;
  isAnimating = false;

  el('completionOverlay').style.opacity = '0';
  setTimeout(() => el('completionOverlay').style.display = 'none', 500);
  
  el('btnPlay').textContent = 'Play Auto';
  lblStage.textContent = 'READY';
  hudStage.textContent = 'READY';
  descStage.textContent = 'Press Start to begin execution.';
  
  updateUI();
}

/* ---------- CONTROLS ---------- */
el('btnStep').onclick = () => {
  if (!isAnimating && pc < PROGRAM.length) {
    isRunning = false;
    el('btnPlay').textContent = 'Play Auto';
    executeCycle();
  }
};

el('btnPlay').onclick = () => {
  if (pc >= PROGRAM.length) return;
  
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

el('btnReset').onclick = resetCPU;

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

el('btnRetryExp').onclick = resetCPU;

/* INIT */
initMemoryUI();
updateUI();
