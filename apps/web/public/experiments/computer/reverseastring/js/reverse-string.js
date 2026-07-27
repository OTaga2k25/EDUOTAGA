/* =========================================================
   REVERSE STRING — TWO-POINTER ENGINE
   built on the Panama Canal simulator UI template
========================================================= */
const el = id => document.getElementById(id);
const vpEl = el('viewport'), canvas = el('scene');

/* ---------- algorithm model ---------- */
const word = "hello world";
const baseChars = word.split('');
const n = baseChars.length;

function buildSteps(){
  const steps = [];
  let l = 0, r = n - 1;
  let arr = baseChars.slice();
  steps.push({type:'init', l, r, arr: arr.slice(), line:2});
  while(l < r){
    steps.push({type:'check', l, r, arr: arr.slice(), line:3});
    [arr[l], arr[r]] = [arr[r], arr[l]];
    steps.push({type:'swap', l, r, arr: arr.slice(), line:4});
    l++;
    steps.push({type:'incr_l', l, r, arr: arr.slice(), line:5});
    r--;
    steps.push({type:'incr_r', l, r, arr: arr.slice(), line:6});
  }
  steps.push({type:'check_end', l, r, arr: arr.slice(), line:3});
  steps.push({type:'done', l, r, arr: arr.slice(), line:7});
  return steps;
}
const STEPS = buildSteps();

const CODE_LINES = [
  {n:1, html:`<span class="kw">def</span> <span class="fn">reverse_string</span><span class="pl">(s):</span>`},
  {n:2, html:`<span class="pl">&nbsp;&nbsp;l, r = </span><span class="num">0</span><span class="pl">, </span><span class="fn">len</span><span class="pl">(s) - </span><span class="num">1</span>`},
  {n:3, html:`<span class="pl">&nbsp;&nbsp;</span><span class="kw">while</span><span class="pl"> l &lt; r:</span>`},
  {n:4, html:`<span class="pl">&nbsp;&nbsp;&nbsp;&nbsp;s[l], s[r] = s[r], s[l]</span>`},
  {n:5, html:`<span class="pl">&nbsp;&nbsp;&nbsp;&nbsp;l </span><span class="op">+=</span><span class="pl"> </span><span class="num">1</span>`},
  {n:6, html:`<span class="pl">&nbsp;&nbsp;&nbsp;&nbsp;r </span><span class="op">-=</span><span class="pl"> </span><span class="num">1</span>`},
  {n:7, html:`<span class="pl">&nbsp;&nbsp;</span><span class="kw">return</span><span class="pl"> s</span>`},
];
const PLAIN_BY_LINE = {
  1: 'Start the function with the word we want to reverse.',
  2: 'Drop two markers on it: l at the very first letter, r at the very last letter.',
  3: 'Keep going as long as l hasn’t crossed over r yet.',
  4: 'Swap whatever letter is at l with whatever letter is at r.',
  5: 'Slide l one step to the right, toward the middle.',
  6: 'Slide r one step to the left, toward the middle.',
  7: 'Hand back the word — it’s reversed now.',
};
function renderCode(activeLine){
  el('codeLines').innerHTML = CODE_LINES.map(l=>
    `<div class="cline ${l.n===activeLine?'active':''}"><span class="cln">${l.n}</span><span class="ccode">${l.html}</span></div>`
  ).join('');
  const pt = el('plainText');
  if(pt) pt.textContent = PLAIN_BY_LINE[activeLine] || '';
}
const CONTENT = {
  init:  {title:'Line Up At Both Ends', desc:'Two markers, L and R, start at the very first and very last letters — like two hands about to reach across the word.', fact:'<b>Why:</b> L and R work inside the original word the whole time. Nothing is copied anywhere else.'},
  check: {title:'Are We Still Apart?', desc:'As long as L is still to the left of R, there’s at least one more pair of letters that hasn’t swapped yet.', fact:'<b>The rule:</b> keep looping only while L is left of R.'},
  swap:  {title:'Swap the Two Letters', desc:'The letters sitting at L and R trade places, right inside the same word — nothing extra is built.', fact:'<b>Key idea:</b> this is called swapping in place, like trading seats without ever leaving the room.'},
  incr_l:{title:'Move L Inward', desc:'L steps one letter to the right. Everything behind it is already flipped into its final spot.', fact:'<b>Progress:</b> the finished part of the word grows inward from the left.'},
  incr_r:{title:'Move R Inward', desc:'R steps one letter to the left, shrinking the part of the word that still needs swapping.', fact:'<b>Progress:</b> the finished part of the word grows inward from the right too.'},
  check_end:{title:'L and R Meet', desc:'L is no longer left of R — every letter has already swapped exactly once, so the loop stops.', fact:'<b>Stopping point:</b> for an 11-letter word, that’s only 5 swaps total.'},
  done:  {title:'Reversed!', desc:'“hello world” has become “dlrow olleh” — flipped in place, without ever building a second word.', fact:'<b>Result:</b> same word, same memory, just rearranged.'},
};
function renderStrip(s){
  const wrap = el('stripwrap');
  if(!wrap) return;
  let html = '<div class="tiles">';
  for(let i=0;i<n;i++){
    const st = blockState(i,s);
    const ch = s.arr[i]===' ' ? '␣' : s.arr[i];
    html += `<div class="tile ${st}"><span class="ch">${ch}</span><span class="idx">${i}</span></div>`;
  }
  html += '</div>';
  wrap.innerHTML = html;
}
function blockState(i, s){
  if(s.type === 'done') return 'done';
  if(i < s.l) return 'done';
  if(i === s.l) return 'l';
  if(i === s.r) return 'r';
  if(s.l >= s.r) return 'done';
  return 'idle';
}
const STATE_COLORS = {
  idle:{bg:0x3a4a52, fg:'#d7dee1'}, l:{bg:0x3f9fc4, fg:'#052330'},
  r:{bg:0xe0a23c, fg:'#3a2600'}, done:{bg:0x4f9d7a, fg:'#052318'},
};
function swapsUpTo(i){ let c=0; for(let k=0;k<=i;k++) if(STEPS[k].type==='swap') c++; return c; }

/* ---------- state ---------- */
const S = { step:0, time:0, playing:true, speed:1 };
const STEP_DUR = 2.6; // seconds — slow enough to actually read each step
let uiStep = -1;

function portrait(){ return vpEl.clientHeight > vpEl.clientWidth*0.8; }

/* ---------- three.js scene ---------- */
const scene = new THREE.Scene();
let FRUSTUM = 6.4;
const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
if('outputEncoding' in renderer) renderer.outputEncoding = THREE.sRGBEncoding;
if('ACESFilmicToneMapping' in THREE){ renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.92; }

let camera = new THREE.OrthographicCamera(-1,1,1,-1,0.1,100);

/* ---------- small canvas-texture helpers for a warmer, less "flat" look ---------- */
function shade(hexStr, percent){
  const num = parseInt(hexStr.replace('#',''),16);
  let r=(num>>16)+Math.round(2.55*percent), g=((num>>8)&0x00FF)+Math.round(2.55*percent), b=(num&0x0000FF)+Math.round(2.55*percent);
  r=Math.max(0,Math.min(255,r)); g=Math.max(0,Math.min(255,g)); b=Math.max(0,Math.min(255,b));
  return '#'+(0x1000000+r*0x10000+g*0x100+b).toString(16).slice(1);
}
function roundRect(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}
function makeSkyTexture(){
  const c=document.createElement('canvas'); c.width=2; c.height=256;
  const ctx=c.getContext('2d');
  const g=ctx.createLinearGradient(0,0,0,256);
  g.addColorStop(0,'#0f2a36'); g.addColorStop(0.55,'#1c4b57'); g.addColorStop(1,'#0a1922');
  ctx.fillStyle=g; ctx.fillRect(0,0,2,256);
  const tex=new THREE.CanvasTexture(c); tex.needsUpdate=true; return tex;
}
function makeGroundTexture(){
  const c=document.createElement('canvas'); c.width=512; c.height=512;
  const ctx=c.getContext('2d');
  ctx.fillStyle='#2c6570'; ctx.fillRect(0,0,512,512);
  for(let i=0;i<4500;i++){
    const x=Math.random()*512, y=Math.random()*512, sSize=1+Math.random()*2.6;
    ctx.fillStyle=`rgba(${20+Math.random()*50},${95+Math.random()*70},${95+Math.random()*55},${0.12+Math.random()*0.28})`;
    ctx.fillRect(x,y,sSize,sSize);
  }
  const tex=new THREE.CanvasTexture(c);
  tex.wrapS=tex.wrapT=THREE.RepeatWrapping; tex.repeat.set(6,6); tex.needsUpdate=true;
  return tex;
}
scene.background = makeSkyTexture();
scene.fog = new THREE.Fog(0x123244, 13, 32);

scene.add(new THREE.HemisphereLight(0xbfe3f0,0x16262b,0.5));
const dirLight = new THREE.DirectionalLight(0xfff0d2,0.95);
dirLight.position.set(6,9,5); dirLight.castShadow = true;
dirLight.shadow.mapSize.set(1024,1024);
dirLight.shadow.camera.left=-8; dirLight.shadow.camera.right=8;
dirLight.shadow.camera.top=8; dirLight.shadow.camera.bottom=-8;
dirLight.shadow.bias=-0.0015;
scene.add(dirLight);
const fillLight = new THREE.DirectionalLight(0x8ec9d8,0.24);
fillLight.position.set(-6,4,-3); scene.add(fillLight);
const rimLight = new THREE.DirectionalLight(0xffffff,0.16);
rimLight.position.set(0,3,-8); scene.add(rimLight);

const floor = new THREE.Mesh(new THREE.PlaneGeometry(30,30),
  new THREE.MeshStandardMaterial({map:makeGroundTexture(), roughness:0.95, metalness:0}));
floor.rotation.x=-Math.PI/2; floor.receiveShadow=true; scene.add(floor);
const grid = new THREE.GridHelper(30,30,0x3a7a83,0x2c6570); grid.position.y=0.006; scene.add(grid);

const BOX=0.82, GAP=0.28, SPACING=BOX+GAP;
const xPositions = []; for(let i=0;i<n;i++) xPositions.push((i-(n-1)/2)*SPACING);
const trackWidth = xPositions[n-1]-xPositions[0]+SPACING;

const railY = 1.85;
const rail = new THREE.Mesh(new THREE.BoxGeometry(trackWidth+0.6,0.05,0.05),
  new THREE.MeshStandardMaterial({color:0xe8e1d1, roughness:0.5, flatShading:true}));
rail.position.y=railY; rail.castShadow=true; scene.add(rail);
[-1,1].forEach(dir=>{
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.032,0.032,railY,6),
    new THREE.MeshStandardMaterial({color:0xcac2ac, roughness:0.6, flatShading:true}));
  post.position.set(dir*(trackWidth/2+0.3), railY/2, 0); post.castShadow=true; scene.add(post);
});
const platform = new THREE.Mesh(new THREE.BoxGeometry(trackWidth+0.5,0.14,BOX+0.5),
  new THREE.MeshStandardMaterial({color:0xdad2bd, roughness:0.7, flatShading:true}));
platform.position.y=-0.07; platform.receiveShadow=true; platform.castShadow=true; scene.add(platform);

function makeFaceTexture(letter,bgHex,fgHex){
  const c=document.createElement('canvas'); c.width=256;c.height=256;
  const ctx=c.getContext('2d');
  const baseColor='#'+bgHex.toString(16).padStart(6,'0');
  const g=ctx.createLinearGradient(0,0,0,256);
  g.addColorStop(0, shade(baseColor,14)); g.addColorStop(1, shade(baseColor,-12));
  ctx.fillStyle=g; roundRect(ctx,4,4,248,248,24); ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,0.22)'; ctx.lineWidth=6; roundRect(ctx,4,4,248,248,24); ctx.stroke();
  ctx.fillStyle=fgHex; ctx.font='700 126px "IBM Plex Mono", monospace';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.shadowColor='rgba(0,0,0,0.28)'; ctx.shadowBlur=7; ctx.shadowOffsetY=4;
  ctx.fillText(letter===' '?'·':letter,128,140);
  const tex=new THREE.CanvasTexture(c); tex.needsUpdate=true; return tex;
}
const blocks=[]; const blockCurState=new Array(n).fill(null);
for(let i=0;i<n;i++){
  const sideMat=new THREE.MeshPhysicalMaterial({color:0x3a4a52, roughness:0.4, clearcoat:0.45, clearcoatRoughness:0.3});
  const mats=[sideMat,sideMat,sideMat.clone(),sideMat,sideMat.clone(),sideMat];
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(BOX,BOX,BOX), mats);
  mesh.position.set(xPositions[i], BOX/2, 0);
  mesh.castShadow=true; mesh.receiveShadow=true; scene.add(mesh);
  blocks.push({mesh, baseY:BOX/2});
}
function paintBlock(i,state,letter){
  const c=STATE_COLORS[state]; const mesh=blocks[i].mesh;
  const tex=makeFaceTexture(letter,c.bg,c.fg);
  [0,1,3,5].forEach(f=>mesh.material[f].color.setHex(c.bg));
  [2,4].forEach(f=>{mesh.material[f].map=tex; mesh.material[f].color.setHex(0xffffff); mesh.material[f].needsUpdate=true;});
  blockCurState[i]=state;
}
function makeFlagTexture(letter,colorHex){
  const c=document.createElement('canvas'); c.width=160;c.height=104;
  const ctx=c.getContext('2d');
  const col='#'+colorHex.toString(16).padStart(6,'0');
  ctx.fillStyle=col;
  ctx.beginPath(); ctx.moveTo(4,6); ctx.lineTo(150,30); ctx.lineTo(4,54); ctx.closePath(); ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,0.35)'; ctx.lineWidth=3; ctx.stroke();
  ctx.fillStyle='#ffffff'; ctx.font='700 40px "IBM Plex Mono", monospace';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(letter,52,30);
  const tex=new THREE.CanvasTexture(c); tex.needsUpdate=true; return tex;
}
function makePointer(colorHex,letter){
  const g=new THREE.Group();
  const poleH=railY-BOX;
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.028,0.028,poleH,8),
    new THREE.MeshStandardMaterial({color:0x9aa3a8, roughness:0.35, metalness:0.7}));
  pole.position.y=BOX+poleH/2; pole.castShadow=true; g.add(pole);
  const flagTex=makeFlagTexture(letter,colorHex);
  const flag=new THREE.Mesh(new THREE.PlaneGeometry(0.56,0.36),
    new THREE.MeshStandardMaterial({map:flagTex, transparent:true, side:THREE.DoubleSide,
      roughness:0.55, emissive:colorHex, emissiveIntensity:0.18}));
  flag.position.set(0.28, BOX+poleH-0.12, 0); g.add(flag);
  const clip=new THREE.Mesh(new THREE.BoxGeometry(0.4,0.09,0.09),
    new THREE.MeshStandardMaterial({color:colorHex, emissive:colorHex, emissiveIntensity:0.5, flatShading:true}));
  clip.position.y=railY-0.07; g.add(clip);
  scene.add(g); return g;
}
const pointerL = makePointer(0x3f9fc4,'L');
const pointerR = makePointer(0xe0a23c,'R');

/* ---------- camera (manual orbit only — no auto-rotate) ---------- */
const CAM_DIST = 10;
const cam = { theta:Math.PI/4, phi:Math.acos(1/Math.sqrt(3)), zoom:1, tx:0, ty:0.55, tz:0.2 };
function applyCam(){
  cam.phi = Math.max(0.68, Math.min(1.28, cam.phi));
  cam.zoom = Math.max(0.55, Math.min(2.4, cam.zoom));
  camera.zoom = cam.zoom;
  camera.updateProjectionMatrix();
  const target = new THREE.Vector3(cam.tx, cam.ty, cam.tz);
  camera.position.set(
    cam.tx + CAM_DIST*Math.sin(cam.phi)*Math.sin(cam.theta),
    cam.ty + CAM_DIST*Math.cos(cam.phi),
    cam.tz + CAM_DIST*Math.sin(cam.phi)*Math.cos(cam.theta));
  camera.lookAt(target);
}

let drag=null, pinch=null;
function panView(dx,dy){
  const s = 0.0026/cam.zoom;
  const _pr=new THREE.Vector3().setFromMatrixColumn(camera.matrix,0);
  const _pu=new THREE.Vector3().setFromMatrixColumn(camera.matrix,1);
  cam.tx += (-dx*_pr.x + dy*_pu.x)*s;
  cam.ty += (-dx*_pr.y + dy*_pu.y)*s;
  cam.tz += (-dx*_pr.z + dy*_pu.z)*s;
}
canvas.addEventListener('contextmenu', e=>e.preventDefault());
canvas.addEventListener('pointerdown', e=>{ drag={x:e.clientX,y:e.clientY,b:e.buttons,sh:e.shiftKey}; el('hint').style.opacity=0; });
addEventListener('pointermove', e=>{
  if(!drag || pinch) return;
  const dx=e.clientX-drag.x, dy=e.clientY-drag.y;
  if(drag.b===2 || drag.sh) panView(dx,dy);
  else { cam.theta -= dx*0.007; cam.phi -= dy*0.006; }
  drag.x=e.clientX; drag.y=e.clientY;
});
addEventListener('pointerup', ()=>drag=null);
canvas.addEventListener('wheel', e=>{ cam.zoom *= (1-Math.sign(e.deltaY)*0.08); e.preventDefault(); }, {passive:false});
canvas.addEventListener('touchstart', e=>{
  if(e.touches.length===2){
    drag=null;
    pinch={ d:Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY),
            cx:(e.touches[0].clientX+e.touches[1].clientX)/2, cy:(e.touches[0].clientY+e.touches[1].clientY)/2 };
  }
},{passive:true});
canvas.addEventListener('touchmove', e=>{
  if(e.touches.length===2 && pinch){
    const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY);
    const cx=(e.touches[0].clientX+e.touches[1].clientX)/2, cy=(e.touches[0].clientY+e.touches[1].clientY)/2;
    cam.zoom *= d/pinch.d;
    panView(cx-pinch.cx, cy-pinch.cy);
    pinch={d,cx,cy};
  }
},{passive:true});
canvas.addEventListener('touchend', e=>{
  if(e.touches.length<2) pinch=null;
});

/* ---------- resize ---------- */
/* the block row must stay fully visible on any screen shape, so the
   horizontal half-extent is guaranteed to cover trackWidth no matter
   how narrow/wide the viewport is — not just a fixed constant. */
const NEEDED_HALF_WIDTH = trackWidth/2 + 1.1;
function resize(){
  const w=vpEl.clientWidth, h=vpEl.clientHeight;
  renderer.setSize(w,h,false);
  const aspect = w/h;
  FRUSTUM = portrait() ? 8.6 : 6.4;
  const halfH = FRUSTUM/2;
  const halfW = Math.max(FRUSTUM*aspect/2, NEEDED_HALF_WIDTH);
  camera.left=-halfW; camera.right=halfW;
  camera.top=halfH; camera.bottom=-halfH;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
if(window.visualViewport) visualViewport.addEventListener('resize', resize);
addEventListener('orientationchange', ()=>setTimeout(resize,300));

/* ---------- floating L/R labels ---------- */
function toScreen(obj3D){
  const v=new THREE.Vector3(); obj3D.getWorldPosition(v); v.project(camera);
  const w=vpEl.clientWidth, h=vpEl.clientHeight;
  return { x:(v.x*0.5+0.5)*w, y:(-v.y*0.5+0.5)*h };
}
let labelsOn = true;
function updateFloatLabels(){
  const fl=el('flabL'), fr=el('flabR');
  if(!labelsOn){ fl.style.opacity=0; fr.style.opacity=0; return; }
  const pl=toScreen(pointerL), pr=toScreen(pointerR);
  fl.style.left=pl.x+'px'; fl.style.top=pl.y+'px'; fl.style.opacity=pointerL.visible?1:0;
  fr.style.left=pr.x+'px'; fr.style.top=pr.y+'px'; fr.style.opacity=pointerR.visible?1:0;
}

/* ---------- step UI ---------- */
const hudL=el('hudL'), hudBar=el('hudBar'), hudSwaps=el('hudSwaps');
const stepnum=el('stepnum'), pbar=el('pbar'), steplabel=el('steplabel'), stepdesc=el('stepdesc'), fact=el('fact');
const valve=el('valve');

let animL = {from:0,to:0}, animR = {from:0,to:0};

function refreshStepUI(){
  const s = STEPS[S.step];
  const prev = STEPS[Math.max(0,S.step-1)];

  for(let i=0;i<n;i++){
    const st = blockState(i,s);
    if(blockCurState[i] !== st || s.arr[i] !== undefined){
      paintBlock(i, st, s.arr[i]);
    }
  }
  animL = { from:xPositions[S.step===0?s.l:prev.l], to:xPositions[s.l] };
  animR = { from:xPositions[S.step===0?s.r:prev.r], to:xPositions[s.r] };
  if(S.step===0){ pointerL.position.x = animL.to; pointerR.position.x = animR.to; }

  renderStrip(s);

  pointerL.visible = s.type !== 'done';
  pointerR.visible = s.type !== 'done';
  valve.style.opacity = s.type==='swap' ? 1 : 0;

  const c = CONTENT[s.type];
  steplabel.textContent = c.title;
  stepdesc.textContent = c.desc;
  fact.innerHTML = c.fact;
  renderCode(s.line);
  stepnum.textContent = `Step ${S.step+1} / ${STEPS.length}`;

  const swaps = swapsUpTo(S.step);
  hudL.textContent = s.type==='done' ? n-1 : s.l;
  hudBar.style.width = (100*Math.min(s.l,n-1)/(n-1))+'%';
  hudSwaps.textContent = swaps;
}
function resetState(){
  S.step=0; S.time=0; uiStep=-1;
  blockCurState.fill(null);
}

/* ---------- controls ---------- */
el('btnPlay').addEventListener('click', ()=>{
  S.playing = !S.playing;
  el('btnPlay').textContent = S.playing ? 'Pause' : 'Play';
  el('btnPlay').classList.toggle('active', S.playing);
});
const SPEEDS=[0.6,1,2]; let speedIdx=1;
el('btnSpeed').addEventListener('click', ()=>{
  speedIdx=(speedIdx+1)%SPEEDS.length; S.speed=SPEEDS[speedIdx];
  el('btnSpeed').textContent = 'Speed '+SPEEDS[speedIdx]+'×';
});
el('btnLabels').addEventListener('click', ()=>{
  labelsOn=!labelsOn;
  el('btnLabels').textContent = labelsOn ? 'Labels ✓' : 'Labels ✗';
  el('btnLabels').classList.toggle('active', labelsOn);
});
el('btnReset').addEventListener('click', ()=>{ resetState(); });

/* ---------- main loop ---------- */
let last = performance.now();
function loop(now){
  requestAnimationFrame(loop);
  const dt = Math.min((now-last)/1000,.05); last=now;

  if(S.playing){
    S.time += dt*S.speed;
    if(S.time >= STEP_DUR){
      S.time = 0; S.step++;
      if(S.step >= STEPS.length){ resetState(); }
    }
  }
  if(uiStep !== S.step){ uiStep = S.step; refreshStepUI(); }
  const t = Math.min(S.time/STEP_DUR, 1);
  pbar.style.width = (t*100)+'%';

  const s = STEPS[S.step];
  pointerL.position.x = animL.from + (animL.to-animL.from)*t;
  pointerR.position.x = animR.from + (animR.to-animR.from)*t;
  if(s.type==='swap'){
    [s.l, s.r].forEach(i=>{
      blocks[i].mesh.position.y = blocks[i].baseY + Math.sin(t*Math.PI)*0.6;
      blocks[i].mesh.rotation.y = t*Math.PI*2;
    });
  } else {
    blocks.forEach(b=>{ b.mesh.position.y = b.baseY; b.mesh.rotation.y = 0; });
  }

  updateFloatLabels();
  applyCam();
  renderer.render(scene, camera);
}
resize();
resetState();
refreshStepUI();
requestAnimationFrame(loop);
