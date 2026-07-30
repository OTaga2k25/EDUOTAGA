/* =========================================================
   WHAT IS AN ALGORITHM — WAREHOUSE ROBOT SIMULATOR
========================================================= */
const el=id=>document.getElementById(id);
const canvas=el('scene'),vpEl=el('viewport');

/* ---------- GRID & ALGORITHMS ---------- */
const GRID=5,CELL=2;
const ALGOS={
  correct:[
    {cmd:'FORWARD',label:'Move Forward'},
    {cmd:'FORWARD',label:'Move Forward'},
    {cmd:'PICK',label:'Pick Package'},
    {cmd:'FORWARD',label:'Move Forward'},
    {cmd:'FORWARD',label:'Move Forward'},
    {cmd:'DROP',label:'Drop Package'}
  ],
  wrong:[
    {cmd:'RIGHT',label:'Turn Right'},
    {cmd:'FORWARD',label:'Move Forward'},
    {cmd:'FORWARD',label:'Move Forward'},
    {cmd:'FORWARD',label:'Move Forward'},
    {cmd:'PICK',label:'Pick Package'},
    {cmd:'DROP',label:'Drop Package'}
  ]
};
let currentAlgo='correct',instructions=ALGOS.correct.slice();
let robot={x:0,z:2,dir:1,hasPackage:false};// dir: 0=N,1=E,2=S,3=W — starts facing EAST
const START_POS={x:0,z:2};
const PKG_POS={x:2,z:2},DROP_POS={x:4,z:2};
const DIRS=[[0,-1],[1,0],[0,1],[-1,0]];
const DIR_NAMES=['NORTH','EAST','SOUTH','WEST'];
let stepIdx=-1,playing=false,speed=0.75,showLabels=true;
let playTimer=null,animating=false;
let execCount=0,distCount=0,turnCount=0;
let failed=false,completed=false;

/* ---------- THREE.JS SCENE ---------- */
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x0c1219);
scene.fog=new THREE.Fog(0x0c1219, 15, 40);
const camera=new THREE.PerspectiveCamera(50,1,.1,100);
camera.position.set(8,12,12);camera.lookAt(4,0,4);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;

/* Texture Generation */
function createFloorTex(){
  const c=document.createElement('canvas');c.width=512;c.height=512;
  const ctx=c.getContext('2d');
  ctx.fillStyle='#1c232a';ctx.fillRect(0,0,512,512);
  ctx.fillStyle='#232b35';ctx.fillRect(0,0,256,256);ctx.fillRect(256,256,256,256);
  // Grid lines
  ctx.fillStyle='#3498db';ctx.fillRect(0,0,512,2);ctx.fillRect(0,0,2,512);
  const tex=new THREE.CanvasTexture(c);
  tex.wrapS=THREE.RepeatWrapping;tex.wrapT=THREE.RepeatWrapping;
  tex.repeat.set(GRID,GRID);
  tex.anisotropy=renderer.capabilities.getMaxAnisotropy();
  return tex;
}

/* Lights â€” clean industrial lighting */
scene.add(new THREE.HemisphereLight(0xffffff,0x444455, 0.4));
const sunLight=new THREE.DirectionalLight(0xffffff, 0.8);
sunLight.position.set(8,18,10);sunLight.castShadow=true;
sunLight.shadow.mapSize.set(2048,2048);
sunLight.shadow.camera.near=1;sunLight.shadow.camera.far=40;
sunLight.shadow.camera.left=-12;sunLight.shadow.camera.right=12;
sunLight.shadow.camera.top=12;sunLight.shadow.camera.bottom=-12;
sunLight.shadow.bias=-0.0005;
scene.add(sunLight);

// Overhead spotlights
for(let i=0;i<2;i++){for(let j=0;j<2;j++){
  const sl=new THREE.SpotLight(0xddeeff, 0.5, 25, Math.PI/6, 0.5, 1);
  sl.position.set(i*6, 12, j*6); sl.target.position.set(i*6, 0, j*6);
  scene.add(sl); scene.add(sl.target);
}}

/* Floor â€” glossy grid */
const floorTex=createFloorTex();
const floorGeo=new THREE.PlaneGeometry(GRID*CELL+4,GRID*CELL+4);
const floorMat=new THREE.MeshStandardMaterial({
  map:floorTex, roughness:0.2, metalness:0.3
});
const floorMesh=new THREE.Mesh(floorGeo,floorMat);
floorMesh.rotation.x=-Math.PI/2;floorMesh.position.set(GRID*CELL/2-1,-.01,GRID*CELL/2-1);
floorMesh.receiveShadow=true;scene.add(floorMesh);

/* Walls â€” high-tech glass barriers */
function addGlassWall(x,z,w,d,h){
  const glassMat=new THREE.MeshPhysicalMaterial({
    color:0x88bbcc, metalness:0.1, roughness:0.1, transmission:0.9, transparent:true, opacity:0.4
  });
  const frameMat=new THREE.MeshStandardMaterial({color:0x222222, metalness:0.8, roughness:0.2});
  const wallGroup=new THREE.Group();
  
  const glass=new THREE.Mesh(new THREE.BoxGeometry(w,h,d), glassMat);
  glass.position.y=h/2; wallGroup.add(glass);
  
  // Top/bottom frames
  const tFrame=new THREE.Mesh(new THREE.BoxGeometry(w+0.1, 0.1, d+0.1), frameMat);
  tFrame.position.y=h; wallGroup.add(tFrame);
  const bFrame=new THREE.Mesh(new THREE.BoxGeometry(w+0.1, 0.1, d+0.1), frameMat);
  bFrame.position.y=0.05; wallGroup.add(bFrame);
  
  wallGroup.position.set(x,0,z);
  scene.add(wallGroup);
}
const wOff=GRID*CELL/2-1;
addGlassWall(wOff,-1.5,GRID*CELL+4,0.1, 3);
addGlassWall(wOff,GRID*CELL-.5,GRID*CELL+4,0.1, 3);
addGlassWall(-1.5,wOff,0.1,GRID*CELL+4, 3);
addGlassWall(GRID*CELL-.5,wOff,0.1,GRID*CELL+4, 3);

/* Warehouse props â€” heavy duty shelves */
function addModernShelf(x,z){
  const frame=new THREE.MeshStandardMaterial({color:0x1a1a1a,roughness:0.5,metalness:0.8});
  const shelfGroup=new THREE.Group();
  for(let dx of [-.5,.5]){
    for(let dz of [-.3,.3]){
      const post=new THREE.Mesh(new THREE.BoxGeometry(.08,3,.08),frame);
      post.position.set(dx,1.5,dz);post.castShadow=true;shelfGroup.add(post);
    }
  }
  for(let y of [.5,1.3,2.1]){
    const shelf=new THREE.Mesh(new THREE.BoxGeometry(1.2,.05,.7),frame);
    shelf.position.y=y;shelf.castShadow=true;shelf.receiveShadow=true;shelfGroup.add(shelf);
    // Add cargo boxes
    if(Math.random()>0.2){
      const bMat=new THREE.MeshStandardMaterial({color:new THREE.Color().setHSL(Math.random(), 0.5, 0.5), roughness:0.6});
      const box=new THREE.Mesh(new THREE.BoxGeometry(0.4,0.4,0.4), bMat);
      box.position.set((Math.random()-0.5)*0.5, y+0.22, 0); box.castShadow=true; shelfGroup.add(box);
    }
  }
  shelfGroup.position.set(x,0,z); scene.add(shelfGroup);
}
addModernShelf(-0.5,1);addModernShelf(-0.5,3.5);addModernShelf(-0.5,6);

/* ---------- ROBOT â€” sleek AGV ---------- */
const robotGroup=new THREE.Group();
// Base chassis
const agvMat=new THREE.MeshStandardMaterial({color:0xe67e22, roughness:0.2, metalness:0.3});
const chassis=new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 1.2), agvMat);
chassis.position.y=0.25; chassis.castShadow=true; robotGroup.add(chassis);
// Lift plate
const plateMat=new THREE.MeshStandardMaterial({color:0x333333, roughness:0.8});
const plate=new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.05, 32), plateMat);
plate.position.y=0.48; robotGroup.add(plate);
// LED Status strip (front is -Z)
const visorMat=new THREE.MeshStandardMaterial({color:0x3498db, emissive:0x3498db, emissiveIntensity:1});
const led=new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.02), visorMat);
led.position.set(0, 0.35, -0.61); robotGroup.add(led);
// Wheels
const wheelMat=new THREE.MeshStandardMaterial({color:0x111111, roughness:0.9});
for(let wx of [-.6,.6]){for(let wz of [-.4,.4]){
  const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.15,.15,.1,16), wheelMat);
  wheel.rotation.z=Math.PI/2; wheel.position.set(wx, .15, wz); robotGroup.add(wheel);
}}
scene.add(robotGroup);

/* ---------- PACKAGE â€” shipping crate ---------- */
const pkgGroup=new THREE.Group();
const crateMat=new THREE.MeshStandardMaterial({color:0xdba35a, roughness:0.9});
const pkgBox=new THREE.Mesh(new THREE.BoxGeometry(.7,.6,.7), crateMat);
pkgBox.position.y=.3;pkgBox.castShadow=true;pkgGroup.add(pkgBox);
// Decals/Bands
const bandMat=new THREE.MeshStandardMaterial({color:0x222222, roughness:0.5});
const band1=new THREE.Mesh(new THREE.BoxGeometry(.72, .05, .72), bandMat);
band1.position.y=0.2; pkgGroup.add(band1);
const band2=band1.clone(); band2.position.y=0.4; pkgGroup.add(band2);
pkgGroup.position.set(PKG_POS.x*CELL,0,PKG_POS.z*CELL);
scene.add(pkgGroup);
const pkgMesh=pkgGroup;

/* ---------- DROP ZONE â€” holographic pad ---------- */
const dropGroup=new THREE.Group();
const dropBase=new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.05, 32), 
  new THREE.MeshStandardMaterial({color:0x222222, roughness:0.8, metalness:0.5}));
dropBase.position.y=0.025; dropGroup.add(dropBase);
const dropRing=new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.03, 16, 64), 
  new THREE.MeshStandardMaterial({color:0x2ecc71, emissive:0x2ecc71, emissiveIntensity:0.5, transparent:true, opacity:0.8}));
dropRing.rotation.x = Math.PI/2; dropRing.position.y=0.06; dropGroup.add(dropRing);
dropGroup.position.set(DROP_POS.x*CELL,0,DROP_POS.z*CELL);
scene.add(dropGroup);
const dropMat=dropRing.material;
/* Labels */
function makeLabel(text,color){
  const c=document.createElement('canvas');c.width=256;c.height=64;
  const ctx=c.getContext('2d');
  ctx.fillStyle='rgba(0,0,0,0.5)';ctx.roundRect(4,4,248,56,8);ctx.fill();
  ctx.fillStyle=color;ctx.font='bold 24px monospace';
  ctx.textAlign='center';ctx.fillText(text,128,42);
  const tex=new THREE.CanvasTexture(c);
  const sp=new THREE.SpriteMaterial({map:tex,transparent:true});
  const s=new THREE.Sprite(sp);s.scale.set(2,.5,1);return s;
}
const pkgLabel=makeLabel('PACKAGE','#e0a23c');pkgLabel.position.set(PKG_POS.x*CELL,1.8,PKG_POS.z*CELL);scene.add(pkgLabel);
const dropLabel=makeLabel('DROP ZONE','#4f9d7a');dropLabel.position.set(DROP_POS.x*CELL,1.8,DROP_POS.z*CELL);scene.add(dropLabel);
const robotLabel=makeLabel('ROBOT','#3f9fc4');robotLabel.position.y=3;robotGroup.add(robotLabel);
const startLabel=makeLabel('START','#ffffff');startLabel.position.set(START_POS.x*CELL,1.8,START_POS.z*CELL);scene.add(startLabel);

/* Camera controls (simple orbit) */
let isDrag=false,prevMouse={x:0,y:0};
let camTheta=Math.PI/4,camPhi=Math.PI/4,camDist=16;
const camTarget=new THREE.Vector3(GRID*CELL/2-1,.5,GRID*CELL/2-1);
function updateCam(){
  camera.position.x=camTarget.x+camDist*Math.sin(camPhi)*Math.sin(camTheta);
  camera.position.y=camTarget.y+camDist*Math.cos(camPhi);
  camera.position.z=camTarget.z+camDist*Math.sin(camPhi)*Math.cos(camTheta);
  camera.lookAt(camTarget);
}
updateCam();
canvas.addEventListener('pointerdown',e=>{isDrag=true;prevMouse={x:e.clientX,y:e.clientY};});
window.addEventListener('pointermove',e=>{if(!isDrag)return;
  camTheta+=(e.clientX-prevMouse.x)*.005;
  camPhi=Math.max(.2,Math.min(1.5,camPhi-(e.clientY-prevMouse.y)*.005));
  prevMouse={x:e.clientX,y:e.clientY};updateCam();});
window.addEventListener('pointerup',()=>isDrag=false);
canvas.addEventListener('wheel',e=>{camDist=Math.max(6,Math.min(30,camDist+e.deltaY*.01));updateCam();},{passive:true});

/* ---------- RESIZE ---------- */
function resize(){
  const w=vpEl.clientWidth,h=vpEl.clientHeight;
  renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();
}
window.addEventListener('resize',resize);resize();

/* ---------- ROBOT STATE ---------- */
function resetRobot(){
  robot={x:START_POS.x,z:START_POS.z,dir:1,hasPackage:false};
  robotGroup.position.set(gx(START_POS.x),.0,gz(START_POS.z));
  robotGroup.rotation.y=dirToAngle(1);
  scene.add(pkgMesh);
  pkgMesh.position.set(PKG_POS.x*CELL,0,PKG_POS.z*CELL);pkgMesh.visible=true;
  pkgLabel.visible=showLabels;
  stepIdx=-1;execCount=0;distCount=0;turnCount=0;failed=false;completed=false;
  animating=false;
  el('statusBadge').style.opacity='0';el('statusBadge').className='status-badge';
  el('valve').style.opacity='0';
  updateUI();renderInstrQueue();renderCode(-1);
}

function gx(x){return x*CELL;}
function gz(z){return z*CELL;}

/* ---------- ANIMATION HELPERS ---------- */
function animateMove(from,to,dur){
  return new Promise(r=>{
    const sx=gx(from.x),sz=gz(from.z),ex=gx(to.x),ez=gz(to.z);
    const start=performance.now();
    function tick(t){
      const p=Math.min(1,(t-start)/dur);
      const ep=1-(1-p)*(1-p);// easeOutQuad
      robotGroup.position.x=sx+(ex-sx)*ep;robotGroup.position.z=sz+(ez-sz)*ep;
      if(p<1)requestAnimationFrame(tick);else r();
    }
    requestAnimationFrame(tick);
  });
}
function animateRotate(fromY,toY,dur){
  return new Promise(r=>{
    const start=performance.now();
    function tick(t){
      const p=Math.min(1,(t-start)/dur);
      robotGroup.rotation.y=fromY+(toY-fromY)*p;
      if(p<1)requestAnimationFrame(tick);else r();
    }
    requestAnimationFrame(tick);
  });
}
function dirToAngle(d){return[Math.PI,Math.PI/2,0,-Math.PI/2][d];}

/* ---------- EXECUTE ONE STEP ---------- */
async function executeStep(){
  if(animating||failed||completed)return;
  stepIdx++;
  if(stepIdx>=instructions.length){completed=true;showStatus('DELIVERED!','success');
    el('obsOutcome').textContent='SUCCESS';updateUI();showCompletionOverlay(true);return;}
  animating=true;
  const instr=instructions[stepIdx];
  el('valve').style.opacity='1';execCount++;
  updateUI();renderInstrQueue();
  // Brief pause so the student can observe the highlighted instruction
  await new Promise(r=>setTimeout(r, 400));
  const dur=800/speed;
  switch(instr.cmd){
    case'FORWARD':{
      const dx=DIRS[robot.dir][0],dz=DIRS[robot.dir][1];
      const nx=robot.x+dx,nz=robot.z+dz;
      if(nx<0||nx>=GRID||nz<0||nz>=GRID){failed=true;
        showStatus('CRASH! Wall collision','fail');
        el('obsOutcome').textContent='FAILED';animating=false;updateUI();renderInstrQueue();showCompletionOverlay(false);return;}
      const from={x:robot.x,z:robot.z};robot.x=nx;robot.z=nz;distCount++;
      await animateMove(from,robot,dur);
      break;}
    case'LEFT':{
      const old=dirToAngle(robot.dir);robot.dir=(robot.dir+3)%4;turnCount++;
      await animateRotate(old,dirToAngle(robot.dir),dur);break;}
    case'RIGHT':{
      const old=dirToAngle(robot.dir);robot.dir=(robot.dir+1)%4;turnCount++;
      await animateRotate(old,dirToAngle(robot.dir),dur);break;}
    case'PICK':
      if(robot.x===PKG_POS.x&&robot.z===PKG_POS.z){robot.hasPackage=true;
        robotGroup.add(pkgMesh);
        pkgMesh.position.set(0, 0.5, 0); // Top of the AGV plate
        pkgLabel.visible=false;}break;
    case'DROP':
      if(robot.hasPackage){robot.hasPackage=false;
        scene.add(pkgMesh);
        pkgMesh.position.set(gx(robot.x),0,gz(robot.z));
        if(robot.x===DROP_POS.x&&robot.z===DROP_POS.z){completed=true;
          showStatus('DELIVERED!','success');el('obsOutcome').textContent='SUCCESS';showCompletionOverlay(true);}
      }break;
  }
  el('valve').style.opacity='0';animating=false;
  updateUI();renderInstrQueue();renderCode(stepIdx);
  if(stepIdx>=instructions.length-1&&!failed&&!completed){completed=true;
    showStatus('COMPLETE','success');el('obsOutcome').textContent='DONE';showCompletionOverlay(true);}
}

function showStatus(txt,cls){
  const b=el('statusBadge');b.textContent=txt;b.className='status-badge '+cls;b.style.opacity='1';
  setTimeout(()=>b.style.opacity='0',2500);
}

/* ---------- UI UPDATES ---------- */
function updateUI(){
  el('hudPC').textContent=stepIdx+1;
  el('hudBar').style.width=(instructions.length?(stepIdx+1)/instructions.length*100:0)+'%';
  el('hudPos').textContent=`(${robot.x}, ${robot.z})`;
  el('varPos').textContent=`(${robot.x}, ${robot.z})`;
  el('varDir').textContent=DIR_NAMES[robot.dir];
  el('varPkg').textContent=robot.hasPackage?'CARRYING':'—';
  el('varStatus').textContent=failed?'FAILED':completed?'COMPLETE':animating?'RUNNING':'IDLE';
  el('stepnum').textContent=`Step ${Math.max(0,stepIdx+1)} / ${instructions.length}`;
  el('pbar').style.width=(instructions.length?(stepIdx+1)/instructions.length*100:0)+'%';
  el('obsExec').textContent=execCount;el('obsDist').textContent=distCount;el('obsTurns').textContent=turnCount;
  
  // Update IPO Visualization Output
  const wfOut = el('wfOutput');
  if(failed) wfOut.innerHTML = '<span style="color:#B5432A">Crash! Wall Collision</span>';
  else if(completed) wfOut.innerHTML = '<span style="color:#4f9d7a">Package Delivered</span>';
  else if(stepIdx >= 0) wfOut.innerHTML = '<span style="color:#e0a23c">Executing...</span>';
  else wfOut.innerHTML = '<span style="color:#8f9aa0">Awaiting Execution...</span>';
  // Step description
  if(failed){
    el('steplabel').textContent='Execution Failed';
    el('stepdesc').innerHTML='<span style="color:#B5432A"><b>CRASH!</b> The robot turned before reaching the package. Because the instruction order was incorrect, it collided with the wall. This shows why the sequence of instructions is important.</span>';
    el('fact').innerHTML='';
  }
  else if(stepIdx>=0&&stepIdx<instructions.length){
    const s=instructions[stepIdx];
    el('steplabel').textContent=s.label;
    const descs={FORWARD:'The robot moves one cell in the direction it is facing.',
      RIGHT:'The robot rotates 90° clockwise.',LEFT:'The robot rotates 90° counter-clockwise.',
      PICK:'The robot picks up the package at its current position.',
      DROP:'The robot drops the package at its current position.'};
    el('stepdesc').textContent=descs[s.cmd]||'';
    const facts=['An algorithm must have a clear, finite sequence of steps.',
      'Each instruction must be unambiguous — the executor (robot) needs no interpretation.',
      'The order of instructions determines the outcome. Swapping even one step can cause failure.',
      'Algorithms have inputs (warehouse layout) and outputs (package delivered or not).',
      'Termination is key — every valid algorithm must eventually stop.',
      'This is the foundation of all programming: precise, ordered instructions.'];
    el('fact').innerHTML='<b>Did you know?</b> '+facts[stepIdx%facts.length];
  }else{
    el('steplabel').textContent='Ready';el('stepdesc').textContent='Click Step Forward to begin executing the algorithm.';el('fact').innerHTML='';
  }
}

function renderInstrQueue(){
  const wrap=el('instrQueue');
  wrap.innerHTML=instructions.map((ins,i)=>{
    let cls='instr-item';
    if(failed&&i===stepIdx)cls+=' fail';else if(i<stepIdx||(i===stepIdx&&completed))cls+=' done';else if(i===stepIdx)cls+=' active';
    return`<div class="${cls}"><span class="instr-num">#${i+1}</span><span class="instr-cmd">${ins.label}</span></div>`;
  }).join('');
}

/* ---------- CODE PANEL ---------- */
function getCodeLines(){
  return[
    {n:1,html:'<span class="cmt"># Define the algorithm</span>'},
    {n:2,html:'<span class="kw">def</span> <span class="fn">deliver_package</span><span class="pl">(robot, warehouse):</span>'},
    {n:3,html:'<span class="pl">  instructions = [</span>'},
    ...instructions.map((ins,i)=>({n:4+i,html:`<span class="pl">    </span><span class="str">"${ins.label}"</span><span class="pl">,</span>`})),
    {n:4+instructions.length,html:'<span class="pl">  ]</span>'},
    {n:5+instructions.length,html:'<span class="pl">  </span><span class="kw">for</span><span class="pl"> step </span><span class="kw">in</span><span class="pl"> instructions:</span>'},
    {n:6+instructions.length,html:'<span class="pl">    robot.</span><span class="fn">execute</span><span class="pl">(step)</span>'},
    {n:7+instructions.length,html:'<span class="pl">  </span><span class="kw">return</span><span class="pl"> robot.status</span>'},
  ];
}
function renderCode(activeStep){
  const lines=getCodeLines();
  const activeLine=activeStep>=0?4+activeStep:-1;
  el('codeLines').innerHTML=lines.map(l=>
    `<div class="cline ${l.n===activeLine?'active':''}"><span class="cln">${l.n}</span><span class="ccode">${l.html}</span></div>`
  ).join('');
  const pt=el('plainText');
  if(activeStep<0){pt.textContent='Click Step Forward to start executing.';return;}
  if(activeStep>=instructions.length){pt.textContent='All instructions executed. Algorithm complete.';return;}
  const ins=instructions[activeStep];
  const explains={FORWARD:`Execute "${ins.label}" — move robot one cell in the ${DIR_NAMES[robot.dir]} direction.`,
    RIGHT:`Execute "${ins.label}" — rotate the robot 90° clockwise.`,
    LEFT:`Execute "${ins.label}" — rotate the robot 90° counter-clockwise.`,
    PICK:`Execute "${ins.label}" — if the robot is on the package, pick it up.`,
    DROP:`Execute "${ins.label}" — if carrying a package, drop it here.`};
  pt.textContent=explains[ins.cmd]||`Executing: ${ins.label}`;
}

/* ---------- CONTROLS ---------- */
el('btnStep').onclick=()=>{if(!playing)executeStep();};
el('btnPlay').onclick=()=>{
  if(playing){playing=false;clearInterval(playTimer);el('btnPlay').textContent='Play Auto';return;}
  playing=true;el('btnPlay').textContent='⏸ Pause';
  playTimer=setInterval(()=>{if(failed||completed||stepIdx>=instructions.length-1){
    playing=false;clearInterval(playTimer);el('btnPlay').textContent='Play Auto';return;}
    if(!animating)executeStep();},1200/speed);
};

const btnSpeed=el('btnSpeed');
btnSpeed.onclick=()=>{
  speed=speed===1?1.5:speed===1.5?2:speed===2?0.75:1;
  btnSpeed.textContent=`Speed ${speed}×`;
};
el('btnLabels').onclick=()=>{showLabels=!showLabels;
  pkgLabel.visible=showLabels&&!robot.hasPackage;dropLabel.visible=showLabels;robotLabel.visible=showLabels;
  el('btnLabels').textContent=showLabels?'Labels ✓':'Labels';};
el('btnReset').onclick=()=>{playing=false;clearInterval(playTimer);el('btnPlay').textContent='Play Auto';resetRobot();};
el('btnLoadAlgo').onclick=()=>{
  currentAlgo=el('algoSelect').value;instructions=ALGOS[currentAlgo].slice();
  playing=false;clearInterval(playTimer);el('btnPlay').textContent='Play Auto';resetRobot();};

/* Mode Toggles */
el('btnModeBeginner').onclick=()=>{
  el('btnModeBeginner').classList.add('active');el('btnModeAdvanced').classList.remove('active');
  el('codepanel').style.display='none';
};
el('btnModeAdvanced').onclick=()=>{
  el('btnModeAdvanced').classList.add('active');el('btnModeBeginner').classList.remove('active');
  el('codepanel').style.display='block';
};

/* Prediction */
el('btnPredYes').onclick=()=>{
  el('btnPredYes').classList.add('selected');el('btnPredNo').classList.remove('selected');
  const correct=currentAlgo==='correct';
  el('predResult').textContent=correct?'✅ Correct!':'❌ Wrong — this algorithm crashes!';
  el('predResult').style.color=correct?'#4f9d7a':'#B5432A';};
el('btnPredNo').onclick=()=>{
  el('btnPredNo').classList.add('selected');el('btnPredYes').classList.remove('selected');
  const correct=currentAlgo==='wrong';
  el('predResult').textContent=correct?'Correct!':'Wrong — this algorithm succeeds!';
  el('predResult').style.color=correct?'#4f9d7a':'#B5432A';};


/* ---------- QUIZ ---------- */
el('btnQuiz1').onclick=()=>{const v=el('quizInput1').value.toLowerCase();
  const ok=v.includes('sequence')||v.includes('step')||v.includes('instruction')||v.includes('finite')||v.includes('procedure')||v.length>15;
  el('quizFeedback1').textContent=ok?'Good answer! An algorithm is a finite sequence of well-defined instructions.':'Try including words like "sequence", "steps", or "instructions".';
  el('quizFeedback1').style.color=ok?'#4f9d7a':'#e0a23c';};
el('quizSelect2').onchange=()=>{const v=el('quizSelect2').value;
  el('quizFeedback2').textContent=v==='B'?'Correct! Wrong instruction order caused a wall collision.':'Not quite. Think about what happens when the robot turns too early.';
  el('quizFeedback2').style.color=v==='B'?'#4f9d7a':'#e0a23c';};
el('quizSelect3').onchange=()=>{const v=el('quizSelect3').value;
  el('quizFeedback3').textContent=v==='B'?'Correct! A valid algorithm must always terminate.':'Remember: finiteness is a required property of algorithms.';
  el('quizFeedback3').style.color=v==='B'?'#4f9d7a':'#e0a23c';};
el('btnQuiz4').onclick=()=>{const v=el('quizInput4').value.toLowerCase();
  const ok=v.includes('deliver')||v.includes('package')||v.includes('drop');
  el('quizFeedback4').textContent=ok?'Correct! The output is the package delivered to the drop zone.':'Hint: what did the robot accomplish at the end?';
  el('quizFeedback4').style.color=ok?'#4f9d7a':'#e0a23c';};
el('quizSelect5').onchange=()=>{const v=el('quizSelect5').value;
  el('quizFeedback5').textContent=v==='B'?'Correct! Randomness is NOT a required property of an algorithm.':'Hint: algorithms must be deterministic, not random.';
  el('quizFeedback5').style.color=v==='B'?'#4f9d7a':'#e0a23c';};

/* ---------- OVERLAYS ---------- */
el('btnRetryExp').onclick=()=>{
  el('completionOverlay').style.opacity='0';
  setTimeout(()=>el('completionOverlay').style.display='none',500);
  playing=false;clearInterval(playTimer);el('btnPlay').textContent='Play Auto';resetRobot();
};
function showCompletionOverlay(success) {
  setTimeout(()=>{
    const cOverlay = el('completionOverlay');
    cOverlay.style.display='flex';
    void cOverlay.offsetWidth;
    cOverlay.style.opacity='1';
    
    el('coExec').textContent = execCount;
    if (success) {
      el('coTitle').textContent = 'Experiment Completed';
      el('coTitle').style.color = '#4f9d7a';
      el('coStatus').textContent = 'Robot reached the destination.';
      el('coPkg').textContent = 'Package delivered successfully.';
      el('coAlg').textContent = 'Algorithm terminated successfully.';
      el('coConclusion').innerHTML = 'An algorithm is a finite sequence of well-defined instructions that solves a problem. Correct instruction order produces the expected result.';
    } else {
      el('coTitle').textContent = 'Algorithm Failed';
      el('coTitle').style.color = '#B5432A';
      el('coStatus').textContent = 'Robot deviated from the safe path.';
      el('coPkg').textContent = 'Package was not delivered.';
      el('coAlg').textContent = 'Algorithm terminated with an error state (collision).';
      el('coConclusion').innerHTML = 'An algorithm must be precise and correctly ordered. Even if the individual steps are valid, executing them in the wrong sequence will fail to solve the problem.';
    }
  }, 1000);
}

/* ---------- RENDER LOOP ---------- */
let time=0;
function animate(){
  requestAnimationFrame(animate);time+=.01;
  // Floating animation for package when on ground
  if(!robot.hasPackage&&pkgMesh.visible)pkgMesh.position.y=Math.sin(time*2)*.06;
  // Drop zone glow pulse
  dropMat.emissiveIntensity=.2+Math.sin(time*3)*.15;
  dropMat.opacity=.5+Math.sin(time*3)*.2;
  // Visor glow pulse
  if (typeof visorMat !== 'undefined') visorMat.emissiveIntensity=.4+Math.sin(time*4)*.25;
  renderer.render(scene,camera);
}

/* ---------- INIT ---------- */
resetRobot();renderCode(-1);animate();
