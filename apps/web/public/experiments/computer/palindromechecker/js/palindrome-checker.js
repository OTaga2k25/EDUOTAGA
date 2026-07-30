/* =========================================================
   PALINDROME CHECKER — TWO-POINTER ENGINE
   built on the Panama Canal simulator UI template
========================================================= */
const el = id => document.getElementById(id);
const vpEl = el('viewport'), canvas = el('scene');

/* ---------- algorithm model ---------- */
let word = "racecar";
const n = 11; // fixed track length
if (word.length < n) {
  const pad = Math.floor((n - word.length) / 2);
  word = ' '.repeat(pad) + word + ' '.repeat(n - word.length - pad);
}
let baseChars = word.split('');

function buildSteps(){
  const steps = [];
  let l = 0, r = n - 1;
  while(l <= r && baseChars[l] === ' ') l++;
  while(r >= l && baseChars[r] === ' ') r--;
  if(l > r) { l = 0; r = n - 1; }
  
  let origL = l, origR = r;
  let arr = baseChars.slice();
  
  steps.push({type:'init', l, r, origL, origR, arr: arr.slice(), line:2});
  let isPal = true;
  while(l < r){
    steps.push({type:'check', l, r, origL, origR, arr: arr.slice(), line:3});
    steps.push({type:'compare', l, r, origL, origR, arr: arr.slice(), line:4});
    if(arr[l] !== arr[r]){
      isPal = false;
      steps.push({type:'mismatch', l, r, origL, origR, arr: arr.slice(), line:5});
      break;
    }
    l++;
    steps.push({type:'incr_l', l, r, origL, origR, arr: arr.slice(), line:6});
    r--;
    steps.push({type:'incr_r', l, r, origL, origR, arr: arr.slice(), line:7});
  }
  if(isPal){
    steps.push({type:'check_end', l, r, origL, origR, arr: arr.slice(), line:3});
    steps.push({type:'done', l, r, origL, origR, arr: arr.slice(), line:8});
  }
  return steps;
}
let STEPS = buildSteps();

function getCodeLines() {
  const rawWord = word.trim();
  return [
    {n:1, html:`<span class="kw">def</span> <span class="fn">is_palindrome</span><span class="pl">(s):</span>`},
    {n:2, html:`<span class="pl">&nbsp;&nbsp;l, r = </span><span class="num">0</span><span class="pl">, </span><span class="fn">len</span><span class="pl">(s) - </span><span class="num">1</span>`},
    {n:3, html:`<span class="pl">&nbsp;&nbsp;</span><span class="kw">while</span><span class="pl"> l &lt; r:</span>`},
    {n:4, html:`<span class="pl">&nbsp;&nbsp;&nbsp;&nbsp;</span><span class="kw">if</span><span class="pl"> s[l] </span><span class="op">!=</span><span class="pl"> s[r]:</span>`},
    {n:5, html:`<span class="pl">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span><span class="kw">return</span><span class="pl"> </span><span class="kw">False</span>`},
    {n:6, html:`<span class="pl">&nbsp;&nbsp;&nbsp;&nbsp;l </span><span class="op">+=</span><span class="pl"> </span><span class="num">1</span>`},
    {n:7, html:`<span class="pl">&nbsp;&nbsp;&nbsp;&nbsp;r </span><span class="op">-=</span><span class="pl"> </span><span class="num">1</span>`},
    {n:8, html:`<span class="pl">&nbsp;&nbsp;</span><span class="kw">return</span><span class="pl"> </span><span class="kw">True</span>`},
    {n:'&nbsp;', html:``},
    {n:'&nbsp;', html:`<span class="pl">my_word = </span><span class="str">"${rawWord}"</span>`},
    {n:'&nbsp;', html:`<span class="fn">is_palindrome</span><span class="pl">(my_word)</span>`}
  ];
}
function renderCode(activeLine, stepType, sObj){
  const lines = getCodeLines();
  el('codeLines').innerHTML = lines.map(l=>
    `<div class="cline ${l.n===activeLine?'active':''}"><span class="cln">${l.n}</span><span class="ccode">${l.html}</span></div>`
  ).join('');
  
  const pt = el('plainText');
  if(!pt) return;

  if(stepType === 'check_end') {
     pt.textContent = "The markers have met (L is not less than R), so the loop ends.";
     return;
  }

  let lChar = '', rChar = '';
  if (sObj && sObj.arr && sObj.l !== undefined && sObj.r !== undefined) {
     lChar = sObj.arr[sObj.l];
     rChar = sObj.arr[sObj.r];
     if (lChar === ' ') lChar = 'space';
     if (rChar === ' ') rChar = 'space';
  }

  let text = '';
  switch(activeLine) {
    case 1: 
      text = 'Start the function with the string we want to check.'; 
      break;
    case 2:
      if (lChar && rChar) text = `Drop two markers: L at '${lChar}' (first) and R at '${rChar}' (last).`;
      else text = 'Drop two markers: L at the first block, R at the last block.';
      break;
    case 3:
      text = 'Keep checking pairs as long as L hasn’t crossed over R yet.';
      break;
    case 4:
      if (lChar && rChar) text = `Compare the letter '${lChar}' with the letter '${rChar}'.`;
      else text = 'Compare the block at L with the block at R.';
      break;
    case 5:
      text = 'They don\'t match! Return False immediately.';
      break;
    case 6:
      text = 'They matched. Slide marker L one step to the right, toward the middle.';
      break;
    case 7:
      text = 'Slide marker R one step to the left, toward the middle.';
      break;
    case 8:
      text = 'All pairs matched. Return True, it is a palindrome!';
      break;
  }
  pt.textContent = text;
}
const CONTENT = {
  init:  {title:'Initialize Pointers', desc:'Two markers (L and R) point to the first and last blocks of the sequence.', fact:'<b>Why:</b> We check the outermost characters first.'},
  check: {title:'Check Positions', desc:'As long as Left is still to the left of Right, there are more pairs to check.', fact:'<b>The Rule:</b> The loop continues until the pointers meet in the middle.'},
  compare: {title:'Compare Characters', desc:'Do the characters at L and R match?', fact:'<b>Key Idea:</b> Symmetry means the left side must mirror the right side perfectly.'},
  mismatch: {title:'Mismatch Found!', desc:'The characters do NOT match. It is not a palindrome!', fact:'<b>Result:</b> We return False immediately. No need to check the rest!'},
  incr_l:{title:'Move L Inward', desc:'The Left marker moves one step toward the middle.', fact:'<b>Progress:</b> The left side matched.'},
  incr_r:{title:'Move R Inward', desc:'The Right marker moves one step toward the middle.', fact:'<b>Progress:</b> The right side matched.'},
  check_end:{title:'Markers Meet!', desc:'The pointers have met in the middle. Every pair matched!', fact:'<b>Math Fact:</b> For an N-letter palindrome, we only need N/2 comparisons!'},
  done:  {title:'Valid Palindrome!', desc:'The entire string has been verified. It is a palindrome.', fact:'<b>Result:</b> We used O(1) extra space and O(N) time.'},
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
  if(s.origL !== undefined && (i < s.origL || i > s.origR)) return 'idle'; // Ignore padding
  if(s.type === 'done') return 'done';
  if(i < s.l || i > s.r) return 'done';
  if(i === s.l) return 'l';
  if(i === s.r) return 'r';
  if(s.l >= s.r) return 'done';
  return 'idle';
}
const STATE_COLORS = {
  idle:{bg:0x3a4a52, fg:'#d7dee1'}, l:{bg:0x3f9fc4, fg:'#052330'},
  r:{bg:0xe0a23c, fg:'#3a2600'}, done:{bg:0x4f9d7a, fg:'#052318'},
};
function checksUpTo(i){ let c=0; for(let k=0;k<=i;k++) if(STEPS[k].type==='compare' || STEPS[k].type==='mismatch') c++; return c; }

/* ---------- state ---------- */
const S = { step:0, time:0, playing:false, speed:1 };
let stepsToPlay = 0;
const STEP_DUR = 2.6; // seconds — slow enough to actually read each step
let uiStep = -1;

function portrait(){ return vpEl.clientHeight > vpEl.clientWidth*0.8; }

/* ---------- three.js scene ---------- */
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
if('outputEncoding' in renderer) renderer.outputEncoding = THREE.sRGBEncoding;
if('ACESFilmicToneMapping' in THREE){ renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.92; }

/* generous near/far: an orthographic camera pulled well back still has to keep
   the foreground of a 90-unit floor inside its slab */
let camera = new THREE.OrthographicCamera(-1,1,1,-1,-80,220);

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
/* horizon colour — sky bottom, fog and the far edge of the floor all share it
   so the ground dissolves into the sky instead of ending on a hard rim */
const HORIZON = 0x24555f;
function makeSkyTexture(){
  const c=document.createElement('canvas'); c.width=2; c.height=256;
  const ctx=c.getContext('2d');
  const g=ctx.createLinearGradient(0,0,0,256);
  g.addColorStop(0,'#091a24'); g.addColorStop(0.34,'#123745');
  g.addColorStop(0.66,'#24555f'); g.addColorStop(1,'#24555f');
  ctx.fillStyle=g; ctx.fillRect(0,0,2,256);
  const tex=new THREE.CanvasTexture(c); tex.needsUpdate=true; return tex;
}
function makeGroundTexture(){
  const c=document.createElement('canvas'); c.width=512; c.height=512;
  const ctx=c.getContext('2d');
  ctx.fillStyle='#245762'; ctx.fillRect(0,0,512,512);
  for(let i=0;i<4500;i++){
    const x=Math.random()*512, y=Math.random()*512, sSize=1+Math.random()*2.6;
    ctx.fillStyle=`rgba(${20+Math.random()*50},${85+Math.random()*60},${90+Math.random()*50},${0.10+Math.random()*0.22})`;
    ctx.fillRect(x,y,sSize,sSize);
  }
  const tex=new THREE.CanvasTexture(c);
  tex.wrapS=tex.wrapT=THREE.RepeatWrapping; tex.repeat.set(12,12); tex.needsUpdate=true;
  return tex;
}
scene.background = makeSkyTexture();

scene.add(new THREE.HemisphereLight(0xcdeaf5,0x152a30,0.62));
const dirLight = new THREE.DirectionalLight(0xfff2da,1.05);
dirLight.position.set(8,12,7); dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048,2048);
dirLight.shadow.camera.left=-12; dirLight.shadow.camera.right=12;
dirLight.shadow.camera.top=12; dirLight.shadow.camera.bottom=-12;
dirLight.shadow.camera.near=1; dirLight.shadow.camera.far=40;
dirLight.shadow.bias=-0.0012; dirLight.shadow.normalBias=0.02;
dirLight.shadow.radius=2.5;
scene.add(dirLight);
const fillLight = new THREE.DirectionalLight(0x93cfe0,0.3);
fillLight.position.set(-7,5,-4); scene.add(fillLight);
const rimLight = new THREE.DirectionalLight(0xffffff,0.22);
rimLight.position.set(-2,3,-9); scene.add(rimLight);

const floor = new THREE.Mesh(new THREE.PlaneGeometry(90,90),
  new THREE.MeshStandardMaterial({map:makeGroundTexture(), roughness:0.96, metalness:0}));
floor.rotation.x=-Math.PI/2; floor.receiveShadow=true; scene.add(floor);
const grid = new THREE.GridHelper(90,90,0x3f8b95,0x2b6570);
grid.material.transparent=true; grid.material.opacity=0.42;
grid.position.y=0.006; scene.add(grid);

const BOX=0.82, GAP=0.28, SPACING=BOX+GAP;
const xPositions = []; for(let i=0;i<n;i++) xPositions.push((i-(n-1)/2)*SPACING);
const trackWidth = xPositions[n-1]-xPositions[0]+SPACING;

const railY = 1.85;
const rail = new THREE.Mesh(new THREE.BoxGeometry(trackWidth+0.6,0.08,0.08),
  new THREE.MeshStandardMaterial({color:0xe8e1d1, roughness:0.4, metalness:0.15}));
rail.position.y=railY; rail.castShadow=true; scene.add(rail);
[-1,1].forEach(dir=>{
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.055,railY,12),
    new THREE.MeshStandardMaterial({color:0xcac2ac, roughness:0.55, metalness:0.1}));
  post.position.set(dir*(trackWidth/2+0.3), railY/2, 0); post.castShadow=true; scene.add(post);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.075,0.075,0.09,12),
    new THREE.MeshStandardMaterial({color:0xe8e1d1, roughness:0.45, metalness:0.15}));
  cap.position.set(dir*(trackWidth/2+0.3), railY+0.02, 0); cap.castShadow=true; scene.add(cap);
});
/* deck the letters stand on, with a wider plinth under it for weight */
const platform = new THREE.Mesh(new THREE.BoxGeometry(trackWidth+0.5,0.2,BOX+0.7),
  new THREE.MeshStandardMaterial({color:0xdad2bd, roughness:0.72}));
platform.position.y=-0.1; platform.receiveShadow=true; platform.castShadow=true; scene.add(platform);
const plinth = new THREE.Mesh(new THREE.BoxGeometry(trackWidth+1.1,0.12,BOX+1.3),
  new THREE.MeshStandardMaterial({color:0xa79e88, roughness:0.85}));
plinth.position.y=-0.26; plinth.receiveShadow=true; plinth.castShadow=true; scene.add(plinth);
/* thin index rule running down the front lip of the deck */
const lip = new THREE.Mesh(new THREE.BoxGeometry(trackWidth+0.52,0.035,0.035),
  new THREE.MeshStandardMaterial({color:0x8f9aa0, roughness:0.5, metalness:0.3}));
lip.position.set(0,-0.02,(BOX+0.7)/2); scene.add(lip);

/* `flip` renders the glyph upside-down: BoxGeometry maps the top face so its
   texture "up" points at +Z, which would otherwise show every letter inverted
   to a camera sitting in front of the row. */
function makeFaceTexture(letter,bgHex,fgHex,flip){
  const c=document.createElement('canvas'); c.width=256;c.height=256;
  const ctx=c.getContext('2d');
  const baseColor='#'+bgHex.toString(16).padStart(6,'0');
  if(flip){ ctx.translate(128,128); ctx.rotate(Math.PI); ctx.translate(-128,-128); }
  const g=ctx.createLinearGradient(0,0,90,256);
  g.addColorStop(0, shade(baseColor,18)); g.addColorStop(0.55, shade(baseColor,2));
  g.addColorStop(1, shade(baseColor,-16));
  ctx.fillStyle=g; roundRect(ctx,3,3,250,250,26); ctx.fill();
  /* inner bevel: bright along the top edge, dark along the bottom */
  ctx.strokeStyle='rgba(255,255,255,0.30)'; ctx.lineWidth=7; roundRect(ctx,6,6,244,244,24); ctx.stroke();
  ctx.strokeStyle='rgba(0,0,0,0.16)'; ctx.lineWidth=5; roundRect(ctx,14,16,228,226,20); ctx.stroke();
  ctx.fillStyle=fgHex; ctx.font='700 132px "IBM Plex Mono", monospace';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.shadowColor='rgba(0,0,0,0.30)'; ctx.shadowBlur=8; ctx.shadowOffsetY=4;
  ctx.fillText(letter===' '?'·':letter,128,136);
  const tex=new THREE.CanvasTexture(c);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.needsUpdate=true; return tex;
}
/* only 8 distinct letters x 4 states x 2 orientations — cache them instead of
   minting 11 fresh 256px canvases on every step */
const faceTexCache = new Map();
function faceTexture(letter,state,flip){
  const key = letter+'|'+state+'|'+(flip?1:0);
  let tex = faceTexCache.get(key);
  if(!tex){
    const c = STATE_COLORS[state];
    tex = makeFaceTexture(letter,c.bg,c.fg,flip);
    faceTexCache.set(key,tex);
  }
  return tex;
}
const blocks=[]; const blockCurState=new Array(n).fill(null);
const blockCurLetter=new Array(n).fill(null);
const boxGeo = new THREE.BoxGeometry(BOX,BOX,BOX);
const edgeGeo = new THREE.EdgesGeometry(boxGeo);
for(let i=0;i<n;i++){
  const sideMat=new THREE.MeshPhysicalMaterial({color:0x3a4a52, roughness:0.38, clearcoat:0.5, clearcoatRoughness:0.28});
  const faceMat=sideMat.clone();          // +Z and -Z share one lettered material
  const topMat=sideMat.clone();
  const mats=[sideMat,sideMat,topMat,sideMat,faceMat,faceMat];
  const mesh=new THREE.Mesh(boxGeo, mats);
  mesh.position.set(xPositions[i], BOX/2, 0);
  mesh.castShadow=true; mesh.receiveShadow=true;
  mesh.add(new THREE.LineSegments(edgeGeo,
    new THREE.LineBasicMaterial({color:0xffffff, transparent:true, opacity:0.18})));
  scene.add(mesh);
  blocks.push({mesh, baseY:BOX/2, baseX:xPositions[i]});
}
function paintBlock(i,state,letter){
  const c=STATE_COLORS[state]; const mesh=blocks[i].mesh;
  [0,1,3].forEach(f=>mesh.material[f].color.setHex(c.bg));
  [[2,true],[4,false]].forEach(([f,flip])=>{
    const m=mesh.material[f];
    m.map=faceTexture(letter,state,flip); m.color.setHex(0xffffff); m.needsUpdate=true;
  });
  blockCurState[i]=state; blockCurLetter[i]=letter;
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
/* soft halo ring painted on the deck under whichever letter a pointer holds */
function makeHaloTexture(colorHex){
  const c=document.createElement('canvas'); c.width=c.height=128;
  const ctx=c.getContext('2d');
  const r=(colorHex>>16)&255, gg=(colorHex>>8)&255, b=colorHex&255;
  const grad=ctx.createRadialGradient(64,64,10,64,64,64);
  grad.addColorStop(0.00,`rgba(${r},${gg},${b},0)`);
  grad.addColorStop(0.52,`rgba(${r},${gg},${b},0)`);
  grad.addColorStop(0.63,`rgba(${r},${gg},${b},0.80)`);
  grad.addColorStop(0.80,`rgba(${r},${gg},${b},0.16)`);
  grad.addColorStop(1.00,`rgba(${r},${gg},${b},0)`);
  ctx.fillStyle=grad; ctx.fillRect(0,0,128,128);
  const tex=new THREE.CanvasTexture(c); tex.needsUpdate=true; return tex;
}
function makePointer(colorHex,letter){
  const g=new THREE.Group();
  const poleH=railY-BOX;
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.032,0.032,poleH,10),
    new THREE.MeshStandardMaterial({color:0xb2bcc1, roughness:0.3, metalness:0.75}));
  pole.position.y=BOX+poleH/2; pole.castShadow=true; g.add(pole);
  const flagTex=makeFlagTexture(letter,colorHex);
  const flag=new THREE.Mesh(new THREE.PlaneGeometry(0.62,0.4),
    new THREE.MeshStandardMaterial({map:flagTex, transparent:true, side:THREE.DoubleSide,
      roughness:0.55, emissive:colorHex, emissiveIntensity:0.26}));
  flag.position.set(0.31, BOX+poleH-0.13, 0); g.add(flag);
  const clip=new THREE.Mesh(new THREE.BoxGeometry(0.44,0.11,0.16),
    new THREE.MeshStandardMaterial({color:colorHex, emissive:colorHex, emissiveIntensity:0.55, roughness:0.4}));
  clip.position.y=railY-0.08; clip.castShadow=true; g.add(clip);
  const halo=new THREE.Mesh(new THREE.PlaneGeometry(BOX+1.0,BOX+1.0),
    new THREE.MeshBasicMaterial({map:makeHaloTexture(colorHex), transparent:true,
      depthWrite:false, opacity:0.9}));
  halo.rotation.x=-Math.PI/2; halo.position.y=0.02; g.add(halo);
  scene.add(g); return g;
}
const pointerL = makePointer(0x3f9fc4,'L');
const pointerR = makePointer(0xe0a23c,'R');

/* ---------- camera (manual orbit only — no auto-rotate) ----------
   A shallow 24° yaw keeps the 11-letter row reading left-to-right instead of
   running off two corners of the screen, while still showing the cube sides.
   tx/ty/tz are a pan *offset* from FOCUS, so the framing maths below stays
   independent of how far the user has dragged. */
const CAM_DIST = 17;
const FOCUS = new THREE.Vector3(0, railY*0.5, 0);
const cam = { theta:0.42, phi:1.04, zoom:1, tx:0, ty:0, tz:0 };
scene.fog = new THREE.Fog(HORIZON, CAM_DIST+1, CAM_DIST+30);

/* the whole apparatus, corner by corner — the frustum is fitted to these
   every frame so nothing is ever clipped, at any angle or window shape */
const BOUND_CORNERS = [];
(function(){
  const hx = trackWidth/2 + 0.62, hz = BOX/2 + 1.25, y0 = -0.42, y1 = railY + 0.42;
  [-hx,hx].forEach(x=>[y0,y1].forEach(y=>[-hz,hz].forEach(z=>BOUND_CORNERS.push(new THREE.Vector3(x,y,z)))));
})();
const _inv = new THREE.Matrix4(), _v = new THREE.Vector3(), _f = new THREE.Vector3();
function fitFrustum(){
  _inv.copy(camera.matrixWorld).invert();
  _f.copy(FOCUS).applyMatrix4(_inv);
  let hw=0, hh=0;
  for(let i=0;i<BOUND_CORNERS.length;i++){
    _v.copy(BOUND_CORNERS[i]).applyMatrix4(_inv);
    hw = Math.max(hw, Math.abs(_v.x-_f.x));
    hh = Math.max(hh, Math.abs(_v.y-_f.y));
  }
  /* breathing room — more of it vertically, where the HUD card and the
     caption chip sit over the scene */
  hw *= 1.10; hh *= portrait() ? 1.34 : 1.24;
  const aspect = Math.max(vpEl.clientWidth,1)/Math.max(vpEl.clientHeight,1);
  if(hw/hh < aspect) hw = hh*aspect; else hh = hw/aspect;
  camera.left=-hw; camera.right=hw; camera.top=hh; camera.bottom=-hh;
}
function applyCam(){
  cam.phi = Math.max(0.55, Math.min(1.35, cam.phi));
  cam.zoom = Math.max(0.65, Math.min(3, cam.zoom));
  const tx=FOCUS.x+cam.tx, ty=FOCUS.y+cam.ty, tz=FOCUS.z+cam.tz;
  camera.position.set(
    tx + CAM_DIST*Math.sin(cam.phi)*Math.sin(cam.theta),
    ty + CAM_DIST*Math.cos(cam.phi),
    tz + CAM_DIST*Math.sin(cam.phi)*Math.cos(cam.theta));
  camera.lookAt(tx,ty,tz);
  camera.updateMatrixWorld();
  fitFrustum();
  camera.zoom = cam.zoom;
  camera.updateProjectionMatrix();
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
/* framing itself is handled by fitFrustum(), which runs every frame against
   the real bounding corners — resize only has to keep the buffer in step */
function resize(){
  renderer.setSize(vpEl.clientWidth, vpEl.clientHeight, false);
  applyCam();
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

  const paintArr = s.arr;
  for(let i=0;i<n;i++){
    const st = blockState(i,s);
    if(blockCurState[i] !== st || blockCurLetter[i] !== paintArr[i]){
      paintBlock(i, st, paintArr[i]);
    }
  }
  animL = { from:xPositions[S.step===0?s.l:prev.l], to:xPositions[s.l] };
  animR = { from:xPositions[S.step===0?s.r:prev.r], to:xPositions[s.r] };
  if(S.step===0){ pointerL.position.x = animL.to; pointerR.position.x = animR.to; }

  renderStrip(s);

  pointerL.visible = s.type !== 'done';
  pointerR.visible = s.type !== 'done';
  valve.style.opacity = (s.type==='compare' || s.type==='mismatch') ? 1 : 0;

  const c = CONTENT[s.type];
  steplabel.textContent = c.title;
  if(s.type === 'done') {
     stepdesc.textContent = `The string is perfectly symmetrical. True!`;
  } else if (s.type === 'mismatch') {
     stepdesc.textContent = `Mismatch found at L and R. Not a palindrome. False!`;
  } else {
     stepdesc.textContent = c.desc;
  }
  fact.innerHTML = c.fact;
  renderCode(s.line, s.type, s);
  stepnum.textContent = `Step ${S.step+1} / ${STEPS.length}`;
  const pct = (S.step / (STEPS.length-1)) * 100;
  el('pbar').style.width = pct + '%';

  const checks = checksUpTo(S.step);
  hudL.textContent = s.type==='done' ? '✓' : (s.type === 'mismatch' ? '✗' : s.l);
  hudBar.style.width = (100*Math.min(s.l,n-1)/(n-1))+'%';
  hudSwaps.textContent = checks;
}
function resetState(){
  S.step=0; S.time=0; uiStep=-1; stepsToPlay=0; S.playing=false;
  if(el('btnPlay')) { el('btnPlay').textContent = 'Play Auto'; el('btnPlay').classList.remove('active'); }
  blockCurState.fill(null); blockCurLetter.fill(null);
  blocks.forEach(b=>{ b.mesh.position.set(b.baseX, b.baseY, 0); b.mesh.rotation.y=0; });
}

/* ---------- controls ---------- */
el('btnPlay').addEventListener('click', ()=>{
  S.playing = !S.playing;
  stepsToPlay = 0;
  el('btnPlay').textContent = S.playing ? 'Pause' : 'Play Auto';
  el('btnPlay').classList.toggle('active', S.playing);
});
const btnStep = el('btnStep');
if (btnStep) {
  btnStep.addEventListener('click', ()=>{
    S.playing = false;
    el('btnPlay').textContent = 'Play Auto';
    el('btnPlay').classList.remove('active');
    stepsToPlay = 1;
  });
}
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

  if(S.playing || stepsToPlay > 0){
    const currentSpeed = (stepsToPlay > 0 && !S.playing) ? S.speed * 2.5 : S.speed;
    S.time += dt*currentSpeed;
    if(S.time >= STEP_DUR){
      S.time = 0; S.step++;
      if (!S.playing && stepsToPlay > 0) stepsToPlay--;
      if(S.step >= STEPS.length){ resetState(); }
    }
  }
  if(uiStep !== S.step){ uiStep = S.step; refreshStepUI(); }
  const t = Math.min(S.time/STEP_DUR, 1);
  pbar.style.width = (t*100)+'%';

  const s = STEPS[S.step];
  pointerL.position.x = animL.from + (animL.to-animL.from)*t;
  pointerR.position.x = animR.from + (animR.to-animR.from)*t;
  if(s.type==='compare' || s.type==='mismatch'){
    const e = t*t*(3-2*t);                 // ease in/out
    
    // small jump up and down to indicate comparison
    let jump = Math.sin(e * Math.PI) * 0.4;
    
    const bl = blocks[s.l], br = blocks[s.r];
    bl.mesh.position.y = bl.baseY + jump;
    br.mesh.position.y = br.baseY + jump;
    
    if (s.type === 'mismatch' && e > 0.5) {
        // slight shake
        let shake = Math.sin(e * Math.PI * 10) * 0.1;
        bl.mesh.position.x = bl.baseX + shake;
        br.mesh.position.x = br.baseX - shake;
    }
  } else {
    blocks.forEach(b=>{
      b.mesh.position.set(b.baseX, b.baseY, 0); b.mesh.rotation.y = 0;
    });
  }

  updateFloatLabels();
  applyCam();
  renderer.render(scene, camera);
}
resize();
resetState();
refreshStepUI();
requestAnimationFrame(loop);

/* ---------- knowledge check quiz ---------- */
const btnQuiz1 = el('btnQuiz1');
const quizInput1 = el('quizInput1');
const quizFeedback1 = el('quizFeedback1');
if(btnQuiz1 && quizInput1 && quizFeedback1) {
  btnQuiz1.addEventListener('click', () => {
    const ans = quizInput1.value.toUpperCase().trim();
    if(ans === 'R AND R' || ans === 'R, R' || ans === 'R,R' || ans === 'R') {
      quizFeedback1.style.color = '#4f9d7a';
      quizFeedback1.innerHTML = 'Correct! L points to the first <b>R</b> and right points to the last <b>R</b>.';
    } else {
      quizFeedback1.style.color = '#e0a23c';
      quizFeedback1.innerHTML = 'Not quite! Remember, the L pointer is at the first letter and R is at the last letter.';
    }
  });
  quizInput1.addEventListener('keypress', (e) => {
    if(e.key === 'Enter') btnQuiz1.click();
  });
}

const quizSelect2 = el('quizSelect2');
const quizFeedback2 = el('quizFeedback2');
if(quizSelect2 && quizFeedback2) {
  quizSelect2.addEventListener('change', () => {
    if(quizSelect2.value === 'B') {
      quizFeedback2.style.color = '#4f9d7a';
      quizFeedback2.innerHTML = 'Correct! H != O, so it returns False immediately on the very first pair.';
    } else if(quizSelect2.value !== '') {
      quizFeedback2.style.color = '#e0a23c';
      quizFeedback2.innerHTML = 'Incorrect. Think about what the code does when a mismatch is found.';
    } else {
      quizFeedback2.innerHTML = '';
    }
  });
}

const quizSelect3 = el('quizSelect3');
const quizFeedback3 = el('quizFeedback3');
if(quizSelect3 && quizFeedback3) {
  quizSelect3.addEventListener('change', () => {
    if(quizSelect3.value === 'A') {
      quizFeedback3.style.color = '#4f9d7a';
      quizFeedback3.innerHTML = 'Correct! We only need memory for two variables (L and R). It takes O(1) extra space.';
    } else if(quizSelect3.value !== '') {
      quizFeedback3.style.color = '#e0a23c';
      quizFeedback3.innerHTML = 'Incorrect. Do we create a whole new string in memory, or just use variables?';
    } else {
      quizFeedback3.innerHTML = '';
    }
  });
}

/* ---------- custom word sandbox ---------- */
const btnLoadCustom = el('btnLoadCustom');
const customWordInput = el('customWordInput');
if(btnLoadCustom && customWordInput) {
  btnLoadCustom.addEventListener('click', () => {
    let newWord = customWordInput.value.toLowerCase();
    if(newWord.length === 0) newWord = "hello world";
    
    // Center it on the 11-block track
    if(newWord.length < n) {
      const pad = Math.floor((n - newWord.length) / 2);
      newWord = ' '.repeat(pad) + newWord + ' '.repeat(n - newWord.length - pad);
    } else if(newWord.length > n) {
      newWord = newWord.substring(0, n);
    }
    
    word = newWord;
    baseChars = word.split('');
    STEPS = buildSteps();
    
    const rawWord = word.trim();
    const subtitle = el('subtitleText');
    if (subtitle) {
      subtitle.innerHTML = `"${rawWord}" &rarr; ${STEPS[STEPS.length-1].type === 'done' ? 'true' : 'false'} &middot; two markers converge inward checking symmetry`;
    }
    
    // Re-paint all blocks immediately for the new word
    for(let i=0; i<n; i++) {
       paintBlock(i, 'idle', baseChars[i]);
    }
    
    // Pause any playing simulation and reset to step 0
    if(S.playing) {
      el('btnPlay').click(); // toggle playing off
    }
    resetState();
    refreshStepUI();
  });
  customWordInput.addEventListener('keypress', (e) => {
    if(e.key === 'Enter') btnLoadCustom.click();
  });
}
