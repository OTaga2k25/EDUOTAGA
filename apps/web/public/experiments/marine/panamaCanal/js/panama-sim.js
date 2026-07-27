/* =========================================================
   PANAMA CANAL — LOCK PHYSICS SIMULATOR
   Elevations (sim metres):
     Ocean 0 · Chamber1 idle 0 · Chamber2 idle 9 · Chamber3 idle 18 · Lake 27
   Gates: G0 x=-60 · G1 x=-20 · G2 x=+20 · G3 x=+60
   ========================================================= */
const LAKE = 27, STEP_H = 9;
const CHW = 16;              // chamber width (z)
const GX = [-60,-20,20,60];  // gate x positions
const FLOORS = [-8, 1, 10];  // chamber floor heights
const WALL_TOP = 31;

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x9fc8e8, 800, 3000);

const camera = new THREE.PerspectiveCamera(50, 1, 1, 10000);

/* ------- lights ------- */
scene.add(new THREE.HemisphereLight(0xe8faff, 0x1d3020, 1.0));
const sun = new THREE.DirectionalLight(0xfff7e6, 1.8);
sun.position.set(-80, 120, 60);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -170; sun.shadow.camera.right = 170;
sun.shadow.camera.top = 90;    sun.shadow.camera.bottom = -70;
sun.shadow.camera.near = 20;   sun.shadow.camera.far = 420;
sun.shadow.bias = -0.0015;
scene.add(sun);
const rim = new THREE.DirectionalLight(0x7FD1C9, .35);
rim.position.set(100, 40, -80);
scene.add(rim);

/* ------- sky ------- */
{
  const g = new THREE.SphereGeometry(3000, 32, 24);
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms:{},
    vertexShader:`varying vec3 vP; void main(){vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec3 vP;
      void main(){
        float h = normalize(vP).y*.5+.5;
        vec3 top = vec3(0.10, 0.35, 0.70);
        vec3 hor = vec3(0.75, 0.88, 0.95);
        vec3 mid = vec3(0.25, 0.55, 0.85);
        vec3 c = mix(mix(hor, mid, smoothstep(.0,.25,h)), top, smoothstep(.2,.7,h));
        gl_FragColor = vec4(c,1.);
      }`
  });
  scene.add(new THREE.Mesh(g,m));
}

/* ------- materials ------- */
const M = {
  concrete: new THREE.MeshStandardMaterial({color:0x9aa3a3, roughness:.9}),
  concreteDark: new THREE.MeshStandardMaterial({color:0x6f7a7c, roughness:.95}),
  concreteGlass: new THREE.MeshStandardMaterial({color:0x9aa3a3, roughness:.9, transparent:true, opacity:.28, depthWrite:false}),
  gate: new THREE.MeshStandardMaterial({color:0x222a2e, roughness:.75, metalness:.4}),
  gateTrim: new THREE.MeshStandardMaterial({color:0x99561E, roughness:.8, metalness:.3}),
  hull: new THREE.MeshStandardMaterial({color:0xb43b2e, roughness:.65}),
  hullDark: new THREE.MeshStandardMaterial({color:0x5c1f18, roughness:.7}),
  deck: new THREE.MeshStandardMaterial({color:0x33424b, roughness:.8}),
  white: new THREE.MeshStandardMaterial({color:0xE9E4D6, roughness:.6}),
  land: new THREE.MeshStandardMaterial({color:0x1E412D, roughness:.95}),
  landDark: new THREE.MeshStandardMaterial({color:0x14301D, roughness:.95}),
  culvert: new THREE.MeshStandardMaterial({color:0x1c2a30, roughness:.8}),
  bubble: new THREE.MeshBasicMaterial({color:0x9fe8ff, transparent:true, opacity:.7})
};
const _waterTex = (function(){
  const c = document.createElement('canvas'); c.width = 512; c.height = 512;
  const x = c.getContext('2d');
  const img = x.createImageData(512, 512);
  for(let i=0; i<512; i++){
    for(let j=0; j<512; j++){
      let v = Math.sin(i*0.03 + Math.sin(j*0.02)*2) + Math.sin(j*0.03 + Math.sin(i*0.015)*3);
      v = (v / 2 + 0.5) * 255;
      let idx = (i + j*512) * 4;
      img.data[idx] = img.data[idx+1] = img.data[idx+2] = v;
      img.data[idx+3] = 255;
    }
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(8, 8);
  return t;
})();
function waterMat(){
  return new THREE.MeshStandardMaterial({color:0x1a4538, roughness:.15, metalness:.8,
    transparent:true, opacity:.88, bumpMap: _waterTex, bumpScale: 0.15});
}
function box(w,h,d,mat){ return new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat); }

/* procedural weathering — stained concrete + welded hull plate */
function concreteTex(){
  const c=document.createElement('canvas'); c.width=c.height=256;
  const x=c.getContext('2d');
  x.fillStyle='#7C8C85'; x.fillRect(0,0,256,256);
  for(let i=0;i<6000;i++){ x.fillStyle=`rgba(${30+Math.random()*30|0},${40+Math.random()*30|0},${35+Math.random()*20|0},${Math.random()*.15})`;
    x.fillRect(Math.random()*256, Math.random()*256, 2, 2); }
  x.strokeStyle='rgba(40,50,45,.5)'; x.lineWidth=2;
  for(let i=0;i<=256;i+=64){ x.beginPath(); x.moveTo(i,0); x.lineTo(i,256); x.stroke(); }
  x.beginPath(); x.moveTo(0,128); x.lineTo(256,128); x.stroke();
  for(let i=0;i<40;i++){
    const sx=Math.random()*256, sl=40+Math.random()*150;
    const gr=x.createLinearGradient(0,0,0,sl);
    gr.addColorStop(0,'rgba(35,50,40,.45)');
    gr.addColorStop(1,'rgba(35,50,40,0)');
    x.fillStyle=gr; x.save(); x.translate(sx, Math.random()*30); x.fillRect(-2,0,4,sl); x.restore();
  }
  const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(5,2);
  return t;
}
function plateTex(base){
  const c=document.createElement('canvas'); c.width=256; c.height=128;
  const x=c.getContext('2d');
  x.fillStyle=base; x.fillRect(0,0,256,128);
  for(let i=0;i<2200;i++){ x.fillStyle=`rgba(0,0,0,${Math.random()*.07})`;
    x.fillRect(Math.random()*256, Math.random()*128, 2, 1); }
  x.strokeStyle='rgba(0,0,0,.22)'; x.lineWidth=1;                   // weld seams
  for(let i=0;i<=256;i+=42){ x.beginPath(); x.moveTo(i,0); x.lineTo(i,128); x.stroke(); }
  for(let i=0;i<10;i++){                                            // rust streaks
    const gr=x.createLinearGradient(0,0,0,60);
    gr.addColorStop(0,'rgba(120,55,25,.30)'); gr.addColorStop(1,'rgba(120,55,25,0)');
    x.fillStyle=gr; x.save(); x.translate(Math.random()*256, Math.random()*70);
    x.fillRect(-1.5,0,3,60); x.restore();
  }
  const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping;
  return t;
}
const _ct = concreteTex();
M.concrete.map = _ct;      M.concrete.needsUpdate = true;
M.concreteDark.map = _ct;  M.concreteDark.needsUpdate = true;

/* ------- procedural organic terrain ------- */
{
  const tg = new THREE.PlaneGeometry(800, 500, 150, 100);
  tg.rotateX(-Math.PI/2);
  const pos = tg.attributes.position;
  for(let i=0; i<pos.count; i++){
    let x = pos.getX(i), z = pos.getZ(i);
    let bx = Math.max(-100, Math.min(100, x));
    
    // Base slope
    let slope = 3 + ((bx + 100) / 200) * 21;
    if (x > 100) slope = 30; // Lake shore higher than water
    if (x < -100) slope = 6;  // Ocean shore higher than water
    
    let hillBase = Math.sin(x*0.02 + Math.sin(z*0.01)*2) * Math.sin(z*0.02 + Math.sin(x*0.01)*2);
    let hill = Math.max(0, hillBase * 45);
    let hill2 = Math.max(0, Math.sin(x*0.05) * Math.cos(z*0.06) * 12);
    
    // Suppress hills on the camera side (z > 20) so they don't block the view!
    if (z > 20) {
      let fade = Math.max(0, 1 - (z - 20)/30);
      hill *= fade;
      hill2 *= fade;
    }
    let y = slope + hill + hill2;

    // Carve the canal, ocean bay, and lake basin
    let isOceanBay = x <= -80 && Math.abs(z) < 40 + Math.abs(x+80)*0.5;
    let isCanal = x > -80 && x < 80 && Math.abs(z) < 22;
    let isLakeBasin = x >= 80 && Math.abs(z) < 50 + Math.abs(x-80)*0.8;
    
    if(isCanal) {
      y = -10; 
    } else if (isOceanBay) {
      y = -4; 
    } else if (isLakeBasin) {
      y = LAKE - 6; 
    } else {
      // Smoothly blend the shores down into the basins
      if (x <= -80) {
        let dist = Math.abs(z) - (40 + Math.abs(x+80)*0.5);
        if (dist < 30) y = -4 + (y - -4) * (dist/30);
      } else if (x >= 80) {
        let dist = Math.abs(z) - (50 + Math.abs(x-80)*0.8);
        if (dist < 40) y = (LAKE - 6) + (y - (LAKE - 6)) * (dist/40);
      } else {
        let dist = Math.abs(z) - 22;
        if (dist < 28) y = -10 + (y - -10) * (dist/28);
      }
    }
    pos.setY(i, y);
  }
  tg.computeVertexNormals();
  const cols = [];
  const cGrass = new THREE.Color(0x325e40); // vibrant tropical green
  const cDirt = new THREE.Color(0x4a3b2b);  // warm dirt
  const tmp = new THREE.Color();
  for(let i=0; i<pos.count; i++){
    let ny = tg.attributes.normal.getY(i);
    // Smooth transition from dirt (steep) to grass (flat)
    let t = Math.max(0, Math.min(1, (ny - 0.70) / 0.25)); 
    tmp.copy(cDirt).lerp(cGrass, t);
    cols.push(tmp.r, tmp.g, tmp.b);
  }
  tg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  // flatShading gives a really nice low-poly realistic diorama look
  const tMat = new THREE.MeshStandardMaterial({vertexColors: true, roughness: 1.0, metalness: 0.0, flatShading: true});
  scene.add(new THREE.Mesh(tg, tMat));
}

/* ------- lock walls ------- */
function wall(x0,x1,z,depth,mat){
  const w = box(x1-x0, WALL_TOP+14, depth, mat);
  w.position.set((x0+x1)/2, (WALL_TOP-14)/2, z);
  scene.add(w); return w;
}
// back wall (opaque), front wall (see-through cutaway toward camera)
wall(GX[0]-4, GX[3]+4, -(CHW/2+5), 10, M.concrete);
const frontWall = wall(GX[0]-4, GX[3]+4, (CHW/2+5), 10, M.concreteGlass);
frontWall.renderOrder = 3;
// wall coping stripes
for(const z of [-(CHW/2+5), (CHW/2+5)]){
  const cap = box(GX[3]-GX[0]+8, .8, 10.4, M.concreteDark);
  cap.position.set(0, WALL_TOP+.4, z); scene.add(cap);
}
// chamber floors (stepped)
for(let i=0;i<3;i++){
  const f = box(40, 2, CHW, M.concreteDark);
  f.position.set(GX[i]+20, FLOORS[i]-1, 0);
  scene.add(f);
}
// culvert pipe along the back wall base (pedagogy: gravity conduit)
{
  const c = new THREE.Mesh(new THREE.CylinderGeometry(1.6,1.6, GX[3]-GX[0], 10), M.culvert);
  c.rotation.z = Math.PI/2;
  c.position.set(0, FLOORS[0]+1.5, -(CHW/2+1.2));
  scene.add(c);
}

/* ------- water bodies ------- */
const oceanGeo = new THREE.PlaneGeometry(300, 300);
oceanGeo.rotateX(-Math.PI/2);
const oceanMat = waterMat(); oceanMat.color.set(0x155866);
const ocean = new THREE.Mesh(oceanGeo, oceanMat);
ocean.position.set(GX[0]-150, 0, 0); 
scene.add(ocean);

const lakeGeo = new THREE.PlaneGeometry(400, 300);
lakeGeo.rotateX(-Math.PI/2);
const lakeMat = waterMat(); lakeMat.color.set(0x1a402d);
const lake = new THREE.Mesh(lakeGeo, lakeMat);
lake.position.set(GX[3]+200, LAKE, 0); 
scene.add(lake);

const chamberWater = [];
for(let i=0;i<3;i++){
  const wm = waterMat(); wm.opacity = .7;   // see the hull through the cutaway
  const w = box(39.2, 1, CHW-0.4, wm);
  w.renderOrder = 2;
  scene.add(w);
  chamberWater.push(w);
}
function setChamberLevel(i, level){
  const floor = FLOORS[i];
  const h = Math.max(level - floor, .5);
  const w = chamberWater[i];
  w.scale.y = h;
  w.position.set(GX[i]+20, floor + h/2, 0);
}

/* ------- miter gates ------- */
// each gate = two leaves hinged at the walls; closed leaves form a shallow V
// pointing toward the HIGHER water (upstream, +x) so pressure seals them.
const gates = [];
function makeGate(gx, floorY){
  const H = WALL_TOP - floorY + 1;
  const leafLen = CHW/2 / Math.cos(0.18) + .4;
  const g = {leaves:[], open:0, gx};
  for(const s of [1,-1]){
    const pivot = new THREE.Group();
    pivot.position.set(gx, floorY + H/2, s*CHW/2);
    const leaf = box(1.4, H, leafLen, M.gate);
    leaf.position.z = -s*leafLen/2;
    const trim = box(1.6, .7, leafLen, M.gateTrim);
    trim.position.set(0, H/2-.6, -s*leafLen/2);
    pivot.add(leaf); pivot.add(trim);
    for(let ri=1; ri<=4; ri++){                        // horizontal rib girders
      const rib = box(1.7, .45, leafLen, M.gate);
      rib.position.set(0, -H/2 + ri*H/5, -s*leafLen/2);
      pivot.add(rib);
    }
    scene.add(pivot);
    g.leaves.push({pivot, s});
  }
  gates.push(g);
  return g;
}
makeGate(GX[0], FLOORS[0]);
makeGate(GX[1], FLOORS[0]);
makeGate(GX[2], FLOORS[1]);
makeGate(GX[3], FLOORS[2]);
function setGate(i, open){ // open: 0 closed → 1 open
  const g = gates[i]; g.open = open;
  for(const l of g.leaves){
    // closed: slight V toward +x (upstream). open: swung flush upstream against wall.
    const closedA = l.s * 0.18;
    const openA  = l.s * (Math.PI/2 - 0.06);
    l.pivot.rotation.y = -(closedA + (openA-closedA)*open);
  }
}
gates.forEach((_,i)=>setGate(i,0));

/* ------- ship: realistic Panamax container vessel ------- */
const ship = new THREE.Group();
let radarBar;   // spins in the loop
{
  const hullPlateRed  = new THREE.MeshStandardMaterial({map:plateTex('#8e2f22'), roughness:.62});
  const hullPlateDark = new THREE.MeshStandardMaterial({map:plateTex('#232e35'), roughness:.55, metalness:.35});
  const white  = new THREE.MeshStandardMaterial({color:0xE9E8E2, roughness:.5});
  const glass  = new THREE.MeshStandardMaterial({color:0x1a2b33, roughness:.15, metalness:.6});
  const deckG  = new THREE.MeshStandardMaterial({color:0x3d4a45, roughness:.85});
  const funnelR= new THREE.MeshStandardMaterial({color:0xB5432A, roughness:.5});
  const blackM = new THREE.MeshStandardMaterial({color:0x14181a, roughness:.6});
  const orange = new THREE.MeshStandardMaterial({color:0xE8722A, roughness:.5});

  // --- hull: real deck-plan shape (rounded stern, fine bow), extruded
  const sh = new THREE.Shape();
  sh.moveTo(-13.5,-3.4);
  sh.quadraticCurveTo(-15.6, 0, -13.5, 3.4);            // rounded stern
  sh.lineTo(5.5, 4.0);                                   // parallel body
  sh.quadraticCurveTo(12.5, 3.5, 15.8, 0);               // bow entrance
  sh.quadraticCurveTo(12.5,-3.5,  5.5,-4.0);
  sh.lineTo(-13.5,-3.4);
  function hullLayer(mat, y, depth, s2){
    const g2 = new THREE.ExtrudeGeometry(sh, {depth, bevelEnabled:false, curveSegments:14});
    const m2 = new THREE.Mesh(g2, mat);
    m2.rotation.x = -Math.PI/2; m2.position.y = y + depth;  // extrude down after flip
    if(s2) m2.scale.set(s2,1,s2);
    ship.add(m2); return m2;
  }
  hullLayer(hullPlateRed, 0, 2.4);                       // antifouling red below waterline
  hullLayer(white, 2.35, .30, 1.012);                    // boot-top stripe
  hullLayer(hullPlateDark, 2.6, 2.3);                    // topsides
  // bulbous bow
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(1.15, 12, 10), hullPlateRed);
  bulb.scale.set(2.2, .95, .95); bulb.position.set(15.6, 1.0, 0); ship.add(bulb);
  // main deck
  const deckGeo = new THREE.ShapeGeometry(sh);
  const deck = new THREE.Mesh(deckGeo, deckG);
  deck.rotation.x = -Math.PI/2; deck.position.y = 4.92; deck.scale.set(.985,1,.985);
  ship.add(deck);
  // hatch coamings
  for(let hx=-4.6; hx<=10.5; hx+=2.7){
    const h = box(2.5, .35, 7.2, blackM); h.position.set(hx, 5.05, 0); ship.add(h);
  }
  // deck railings
  for(const rz of [3.85,-3.85]){
    const rail = box(23, .07, .07, white); rail.position.set(-1, 5.85, rz); ship.add(rail);
    const rail2= box(23, .07, .07, white); rail2.position.set(-1, 5.45, rz); ship.add(rail2);
  }
  // forecastle + flag mast
  const fc = box(4.2, .9, 5.4, hullPlateDark); fc.position.set(12.6, 5.35, 0); ship.add(fc);
  const fmast = new THREE.Mesh(new THREE.CylinderGeometry(.08,.1,3.4,6), white);
  fmast.position.set(13.6, 7.6, 0); ship.add(fmast);
  const cross = box(2.2,.08,.08, white); cross.position.set(13.6, 8.6, 0); cross.rotation.y=Math.PI/2; ship.add(cross);

  // --- container stacks, real liner colours, varied tiers
  const boxCols = [0x2E5F8A, 0xD8A013, 0x2F7D4F, 0xC8551B, 0x8A2E2E, 0xD9D2C8, 0x24586e];
  const tiers = [2,3,3,2,3,2];
  let bi = 0;
  for(let hx=-4.6; hx<=10.5; hx+=2.7){
    for(const rz of [-2.55, 0, 2.55]){
      const n = Math.max(1, tiers[bi%6] + (Math.random()>.6?1:0) - (rz===0?0:Math.random()>.7?1:0));
      for(let l=0; l<n; l++){
        const cm = new THREE.MeshStandardMaterial({color:boxCols[(Math.random()*boxCols.length)|0], roughness:.62});
        cm.color.offsetHSL(0, 0, (Math.random()-.5)*.06);   // weathering variance
        const k = new THREE.Mesh(new THREE.BoxGeometry(2.45, 1.55, 2.4), cm);
        k.position.set(hx, 5.95 + l*1.6, rz);
        ship.add(k);
      }
    }
    bi++;
  }

  // --- accommodation block: stepped decks + bridge with overhanging wings
  const hx = -10.2;
  const t0 = box(5.2, 2.3, 7.2, white); t0.position.set(hx, 6.1, 0);  ship.add(t0);
  const t1 = box(5.0, 2.0, 6.8, white); t1.position.set(hx, 8.2, 0);  ship.add(t1);
  const t2 = box(4.8, 2.0, 6.2, white); t2.position.set(hx, 10.2, 0); ship.add(t2);
  // window rows on each deck
  for(const [wy,wd] of [[6.4,7.24],[8.5,6.84],[10.5,6.24]]){
    const w = box(5.25, .5, wd, glass); w.position.set(hx, wy, 0); ship.add(w);
  }
  // bridge deck — wings overhang the full beam (real Panamax detail)
  const bridge = box(3.7, 2.0, 11.4, white); bridge.position.set(hx, 12.2, 0); ship.add(bridge);
  const bwin  = box(3.75, .85, 11.44, glass); bwin.position.set(hx, 12.65, 0); ship.add(bwin);
  const broof = box(3.9, .25, 11.6, white); broof.position.set(hx, 13.3, 0); ship.add(broof);
  for(const wz of [5.6,-5.6]){                                    // wing end bulwarks
    const we = box(3.7, .8, .2, white); we.position.set(hx, 11.6, wz); ship.add(we);
  }
  // radar mast
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(.1,.14,3.6,6), white);
  mast.position.set(hx, 15.2, 0); ship.add(mast);
  radarBar = box(2.8, .16, .4, blackM); radarBar.position.set(hx, 16.9, 0); ship.add(radarBar);
  const yard = box(.08, .08, 4.4, white); yard.position.set(hx, 15.8, 0); ship.add(yard);
  // funnel: line colours + black cap + exhaust pipes
  const fun = box(2.3, 3.4, 2.9, funnelR); fun.position.set(hx-3.4, 8.4, 0); ship.add(fun);
  const cap = box(2.4, .7, 3.0, blackM);  cap.position.set(hx-3.4, 10.3, 0); ship.add(cap);
  for(const pz of [.7,-.7]){
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(.28,.28,1.2,8), blackM);
    pipe.position.set(hx-3.4, 11.1, pz); ship.add(pipe);
  }
  // lifeboats on davits, both sides
  for(const lz of [3.9,-3.9]){
    const lb = new THREE.Mesh(new THREE.SphereGeometry(1,10,8), orange);
    lb.scale.set(1.9,.62,.72); lb.position.set(hx+3.4, 6.6, lz); ship.add(lb);
    const dv = box(.12,1.3,.12, blackM); dv.position.set(hx+3.4, 7.3, lz); ship.add(dv);
  }

  // --- ship's name painted on both bows + stern
  function nameTex(txt,fs){
    const c=document.createElement('canvas'); c.width=512; c.height=96;
    const x=c.getContext('2d');
    x.fillStyle='#E9E8E2'; x.font=`700 ${fs}px Georgia, serif`;
    x.textAlign='center'; x.textBaseline='middle'; x.letterSpacing='6px';
    x.fillText(txt,256,50);
    return new THREE.CanvasTexture(c);
  }
  for(const nz of [4.02,-4.02]){
    const nm = new THREE.Mesh(new THREE.PlaneGeometry(8,1.5),
      new THREE.MeshBasicMaterial({map:nameTex('PANAMAX  STAR',54), transparent:true}));
    nm.position.set(7.2, 3.7, nz*0.93); nm.rotation.y = nz>0 ? 0 : Math.PI;
    ship.add(nm);
  }
  const stn = new THREE.Mesh(new THREE.PlaneGeometry(6,1.2),
    new THREE.MeshBasicMaterial({map:nameTex('PANAMAX STAR · PANAMÁ',40), transparent:true}));
  stn.position.set(-15.15, 3.6, 0); stn.rotation.y = -Math.PI/2; ship.add(stn);
}
scene.add(ship);

/* wake + bow-wave foam (opacity follows ship speed) */
const wakeMat = new THREE.MeshBasicMaterial({color:0xE8F4F2, transparent:true, opacity:0, depthWrite:false});
const wake = new THREE.Mesh(new THREE.PlaneGeometry(12,5), wakeMat);
wake.rotation.x = -Math.PI/2; scene.add(wake);
const bowMat = new THREE.MeshBasicMaterial({color:0xF2FAF8, transparent:true, opacity:0, depthWrite:false});
const bowFoam = new THREE.Mesh(new THREE.PlaneGeometry(4.5,2.6), bowMat);
bowFoam.rotation.x = -Math.PI/2; scene.add(bowFoam);
let prevShipX = -125;

/* =========================================================
   ENGINEERING LAYER — mules, tracks, tugs, tower, labels
   ========================================================= */
const M2 = {
  steel:     new THREE.MeshStandardMaterial({color:0xC9CFD4, roughness:.35, metalness:.75}),
  steelDark: new THREE.MeshStandardMaterial({color:0x46525A, roughness:.5,  metalness:.6}),
};

/* ------- mule tracks (rack rails on both wall copings) ------- */
for(const s of [1,-1]) for(const dz of [-.85,.85]){
  const r = box(GX[3]-GX[0]+10, .25, .3, M2.steelDark);
  r.position.set(0, WALL_TOP+.95, s*9.6+dz);
  scene.add(r);
}
/* ------- bollards along the walls ------- */
for(let x=-56; x<=56; x+=14) for(const s of [1,-1]){
  const bl = new THREE.Mesh(new THREE.CylinderGeometry(.55,.7,1.4,8), M2.steelDark);
  bl.position.set(x, WALL_TOP+1.4, s*13.5);
  scene.add(bl);
}
/* ------- control tower (lockmaster) ------- */
{
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(2.2,2.8,14,10), M.concrete);
  shaft.position.set(0, WALL_TOP+7, -20); scene.add(shaft);
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(3,3,2.6,10),
    new THREE.MeshStandardMaterial({color:0x8FD8E8, roughness:.15, metalness:.4}));
  glass.position.set(0, WALL_TOP+15, -20); scene.add(glass);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.6,1.6,10), M.gateTrim);
  roof.position.set(0, WALL_TOP+17.1, -20); scene.add(roof);
}

/* ------- electric mules (towing locomotives) -------
   Real ships are pulled and braked by "mulas": 50-tonne electric
   locomotives on rack tracks, two ahead + two astern, each holding
   the ship with a steel cable and a winch. */
function makeMule(side){
  const g = new THREE.Group();
  const body = box(5, 1.9, 2.5, M2.steel); body.position.y = 1.4; g.add(body);
  for(const e of [1,-1]){
    const nose = box(1.4, 1.2, 2.5, M2.steel); nose.position.set(e*3.1, 1.0, 0); g.add(nose);
  }
  const stripe = box(5.1, .35, 2.55, M.gateTrim); stripe.position.y = .95; g.add(stripe);
  const cab = box(2.2, 1.1, 2.2, M2.steelDark); cab.position.y = 2.9; g.add(cab);
  const winch = new THREE.Mesh(new THREE.CylinderGeometry(.5,.5,1.6,10), M2.steelDark);
  winch.rotation.x = Math.PI/2; winch.position.set(0, 3.6, 0); g.add(winch);
  for(const wx of [-1.8,1.8]) for(const wz of [-1,1]){
    const wh = new THREE.Mesh(new THREE.CylinderGeometry(.45,.45,.3,10), M2.steelDark);
    wh.rotation.x = Math.PI/2; wh.position.set(wx,.45,wz); g.add(wh);
  }
  g.position.set(-62, WALL_TOP+1.05, side*9.6);
  scene.add(g); return g;
}
const mules = [];
for(const side of [1,-1]) for(const end of [1,-1])
  mules.push({g:makeMule(side), side, end});

/* towing cables (with a little sag) */
const cableMat = new THREE.LineBasicMaterial({color:0x10181c});
const cables = mules.map(()=>{
  const geo = new THREE.BufferGeometry().setFromPoints(
    [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]);
  const l = new THREE.Line(geo, cableMat);
  l.frustumCulled = false; scene.add(l); return l;
});

/* ------- tugboats (open-water escort) ------- */
function makeTug(){
  const g = new THREE.Group();
  const hull = box(8, 2.2, 3.6, M.hullDark); hull.position.y = 1.1; g.add(hull);
  const bow = new THREE.Mesh(new THREE.CylinderGeometry(1.8,1.8,2.2,3), M.hullDark);
  bow.rotation.z = Math.PI/2; bow.rotation.x = Math.PI/2;
  bow.position.set(4.3, 1.1, 0); bow.scale.set(1,1,1.7); g.add(bow);
  const bumper = box(8.2, .5, 3.8, new THREE.MeshStandardMaterial({color:0x14181a, roughness:.9}));
  bumper.position.y = 2.1; g.add(bumper);
  const cabin = box(2.8, 2.4, 2.8, M.white); cabin.position.set(-.4, 3.6, 0); g.add(cabin);
  const funnel = box(1, 1.6, 1.4, M.gateTrim); funnel.position.set(-2.4, 3.6, 0); g.add(funnel);
  scene.add(g); return g;
}
const tug1 = makeTug();   // Pacific side
const tug2 = makeTug();   // lake side

/* ------- part labels (canvas sprites) ------- */
function makeLabel(text){
  const c = document.createElement('canvas'); c.width = 512; c.height = 96;
  const x = c.getContext('2d');
  x.fillStyle = 'rgba(11,29,38,.82)'; x.fillRect(6,6,500,84);
  x.strokeStyle = '#E8B44A'; x.lineWidth = 4; x.strokeRect(6,6,500,84);
  x.fillStyle = '#F2EAD9'; x.font = '600 40px "IBM Plex Mono", monospace';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, 256, 50);
  const s = new THREE.Sprite(new THREE.SpriteMaterial(
    {map:new THREE.CanvasTexture(c), transparent:true, depthTest:false}));
  s.scale.set(20, 3.8, 1); s.renderOrder = 6;
  return s;
}
const labels = [];
function addLabel(text, pos, parent){
  const s = makeLabel(text); s.position.copy(pos);
  (parent||scene).add(s); labels.push(s);
}
addLabel('MITER GATES',        new THREE.Vector3(GX[1], 39, 0));
addLabel('GRAVITY CULVERT',    new THREE.Vector3(0, FLOORS[0]+6.5, -(CHW/2+1)));
addLabel('ELECTRIC MULE',      new THREE.Vector3(0, 7.2, 0), mules[0].g);
addLabel('TUG ESCORT',         new THREE.Vector3(0, 7.5, 0), tug1);
addLabel('CONTROL TOWER',      new THREE.Vector3(0, WALL_TOP+21, -20));
addLabel('PACIFIC · 0 m',      new THREE.Vector3(-108, 12, 0));
addLabel('GATÚN LAKE · +27 m', new THREE.Vector3(112, 39, 0));
let labelsOn = true;
function setLabels(v){ labelsOn = v; for(const s of labels) s.visible = v; }

/* per-frame engineering updates */
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _m = new THREE.Vector3();
function updateEngineering(now){
  const bob = Math.sin(now/650)*.1;
  // --- mules track the ship along the walls, cables only inside the locks
  const inLocks = S.shipX > -80 && S.shipX < 68;
  mules.forEach((mu,i)=>{
    const tx = Math.max(-62, Math.min(62, S.shipX + mu.end*11));
    mu.g.position.x += (tx - mu.g.position.x)*0.08;
    cables[i].visible = inLocks && labelsAlwaysCables;
    if(cables[i].visible){
      _a.set(mu.g.position.x, mu.g.position.y+3.6, mu.g.position.z);
      _b.set(S.shipX + mu.end*10, ship.position.y+5, mu.side*3.6);
      _m.lerpVectors(_a,_b,.5); _m.y -= 1.3;
      cables[i].geometry.setFromPoints([_a,_m,_b]);
    }
  });
  // --- tug 1 leads the ship in, then holds station off the first gate
  tug1.position.set(Math.min(S.shipX + 22, -74), -0.9 + bob, 5);
  tug1.rotation.z = Math.sin(now/800)*.02;
  // --- tug 2 waits on the lake and escorts the ship out
  tug2.position.set(Math.max(S.shipX + 24, 74), LAKE - 0.9 - bob, -5);
  tug2.rotation.z = Math.sin(now/900)*.02;
}
const labelsAlwaysCables = true; // cables shown whenever mules are working
scene.add(new THREE.Group());

/* ------- fill bubbles (culvert inflow through floor ports) ------- */
const bubbles = [];
for(let i=0;i<70;i++){
  const b = new THREE.Mesh(new THREE.SphereGeometry(.28, 6, 6), M.bubble);
  b.visible = false; scene.add(b);
  bubbles.push({m:b, t:Math.random(), x:0, z:0});
}
let bubbleChamber = -1;
function updateBubbles(dt, level, floor){
  for(const b of bubbles){
    if(bubbleChamber<0){ b.m.visible=false; continue; }
    b.t += dt*.9;
    if(b.t>1){ b.t=0;
      b.x = GX[bubbleChamber]+3+Math.random()*34;
      b.z = -CHW/2+1+Math.random()*(CHW-2);
    }
    const y = floor + (level-floor)*b.t;
    b.m.visible = true;
    b.m.position.set(b.x, y, b.z);
    b.m.material.opacity = .9*(1-b.t);
    b.m.scale.setScalar(.6+b.t*1.4);
  }
}

/* =========================================================
   STATE + SEQUENCE ENGINE
   ========================================================= */
const S = {
  shipX: -125,
  levels: [0, 9, 18],       // chamber water levels
  gateOpen: [0,0,0,0],
  time: 0, step: 0, playing: false, speed: 1,
};
function lerp(a,b,t){ return a+(b-a)*t; }
function ease(t){ return t<0?0:t>1?1:t*t*(3-2*t); }

function regionLevel(x){
  if(x < GX[0]) return 0;
  if(x < GX[1]) return S.levels[0];
  if(x < GX[2]) return S.levels[1];
  if(x < GX[3]) return S.levels[2];
  return LAKE;
}

const SEQ = [
 {dur:5, label:'Approach',
  desc:'A Panamax freighter arrives from the Pacific at 0 m, led by a tug escort. Ahead, Gatún Lake sits 26 m higher — so the canal climbs in steps: a staircase of locks worked by gravity, cables and concrete.',
  fact:'<b>Hand-off:</b> tugs handle the ship in open water; inside the locks, electric mule locomotives on the walls take over with steel cables.',
  fn:t=>{ S.shipX = lerp(-125,-82,ease(t)); }},

 {dur:2.5, label:'Gate 1 opens',
  desc:'The lower miter gates swing open. Water on both sides is at the same level, so the gates move easily — you never open a gate against a height difference.',
  fact:'<b>Miter gates</b> meet in a shallow V pointing toward the higher water. Water pressure pushes the V together, sealing the gates shut for free.',
  fn:t=>{ S.gateOpen[0]=ease(t); }},

 {dur:4, label:'Enter chamber 1 — mules take over',
  desc:'Four electric mule locomotives — two ahead, two astern on the wall tracks — hold the ship on steel cables. They don\'t tow it; the ship moves on its own engine while the mules centre it and brake it. Wall clearance can be under a metre.',
  fact:'<b>Mulas:</b> ~50-tonne rack-railway locomotives with cable winches. Tension on four cables keeps 50,000 t perfectly centred.',
  fn:t=>{ S.shipX = lerp(-82,-40,ease(t)); }},

 {dur:2.5, label:'Seal the chamber',
  desc:'The gates close behind the stern. The chamber is now a sealed concrete bathtub holding the ship.',
  fact:'<b>Scale:</b> a real chamber is 320 m long — the simulation is compressed so you can see the whole staircase.',
  fn:t=>{ S.gateOpen[0]=1-ease(t); }},

 {dur:6, label:'Fill — gravity only', valve:true, bubble:0,
  desc:'Valves open in culverts under the floor. Water from the higher pool upstream pours in through ports in the chamber floor — driven purely by gravity. The ship rises with the water: buoyancy does the lifting.',
  fact:'<b>No pumps anywhere.</b> Each lockage moves ~100 million litres. Potential energy of lake water (m·g·h) does all the work.',
  fn:t=>{ S.levels[0] = lerp(0, 9, ease(t)); }},

 {dur:2.2, label:'Gate 2 opens',
  desc:'Chamber 1 now matches chamber 2 exactly — 9 m. Levels equal, pressure balanced, the gates open effortlessly.',
  fact:'<b>Communicating vessels:</b> connect two water bodies and they equalise. The lock just controls when they connect.',
  fn:t=>{ S.gateOpen[1]=ease(t); }},

 {dur:4, label:'Into chamber 2',
  desc:'The ship glides forward on to the next step of the staircase, already 9 m above the Pacific.',
  fact:'<b>Archimedes:</b> the ship displaces exactly its own weight in water — so 50,000+ tonnes float upward with zero lifting machinery.',
  fn:t=>{ S.shipX = lerp(-40,0,ease(t)); }},

 {dur:2, label:'Seal again',
  desc:'Gates shut astern. Same trick, one storey higher.',
  fact:'<b>Fresh water:</b> everything flowing downhill here is rain-fed lake water — the canal spends fresh water to move salt-water ships.',
  fn:t=>{ S.gateOpen[1]=1-ease(t); }},

 {dur:6, label:'Fill chamber 2', valve:true, bubble:1,
  desc:'Culvert valves open again; water falls from the pool above into this chamber until both stand at 18 m. Height difference → pressure difference → flow. When levels match, flow stops by itself.',
  fact:'<b>Newer Neopanamax locks</b> reuse ~60% of each lockage by draining into side water-saving basins instead of the sea.',
  fn:t=>{ S.levels[1] = lerp(9, 18, ease(t)); }},

 {dur:2.2, label:'Gate 3 opens',
  desc:'18 m up. One flight left.',
  fact:'<b>Transit time:</b> a full ocean-to-ocean passage takes 8–10 hours; the locks themselves take about 3.',
  fn:t=>{ S.gateOpen[2]=ease(t); }},

 {dur:4, label:'Into chamber 3',
  desc:'The last chamber. Beyond the top gates lies the open lake.',
  fact:'<b>Energy check:</b> lifting 50,000 t by 26 m stores ~13 GJ of potential energy — delivered entirely by falling water.',
  fn:t=>{ S.shipX = lerp(0,40,ease(t)); }},

 {dur:7.5, label:'Final lift', valve:true, bubble:2,
  desc:'Gates seal, valves open, and the lake itself feeds the final fill. The ship rises the last 9 m to lake level — 26 m (27 in this model) above the ocean it left an hour ago.',
  fact:'<b>Descending</b> is the same movie in reverse: each chamber drains downhill to the next, and finally to the sea.',
  fn:t=>{
    S.gateOpen[2] = 1-ease(Math.min(t*4,1));
    S.levels[2] = lerp(18, LAKE, ease(Math.max((t-0.25)/0.75,0)));
  }},

 {dur:6, label:'Sail the summit',
  desc:'The top gates open and the ship steams out across Gatún Lake — a freighter cruising 26 m above sea level, over what used to be a river valley. On the Atlantic side, three more locks will lower it back down.',
  fact:'<b>The whole machine</b> is gravity, buoyancy and good concrete: water flows down, ships float up. Restarting…',
  fn:t=>{
    S.gateOpen[3] = ease(Math.min(t*3,1));
    if(t>0.25) S.shipX = lerp(40, 130, ease((t-0.25)/0.75));
  }},
];

function resetState(){
  S.shipX=-125; S.levels=[0,9,18]; S.gateOpen=[0,0,0,0];
  S.time=0; S.step=0; S.playing=false;
  if(typeof refreshStepUI === 'function') refreshStepUI();
}

/* ------- UI ------- */
const el = id=>document.getElementById(id);
const stepnum=el('stepnum'), stepdesc=el('stepdesc'), fact=el('fact'),
      pbar=el('pbar'), valve=el('valve'), elevNum=el('elevNum'),
      steplabel=el('steplabel'),
      cElev=el('cElev'), cLevels=el('cLevels'),
      cStatus=el('cStatus'), cWater=el('cWater'),
      hudBar=el('hudBar'), hudWater=el('hudWater');
let uiStep=-1;
function refreshStepUI(){
  const st = SEQ[S.step] || SEQ[0];
  stepnum.textContent = `Experiment Step ${S.step+1} / ${SEQ.length}`;
  steplabel.textContent = st.label;
  stepdesc.textContent = st.desc;
  fact.innerHTML = st.fact;
  valve.style.opacity = st.valve?1:0;
  bubbleChamber = (st.valve && st.bubble!==undefined)? st.bubble : -1;

  const btn = el('btnPlay');
  if(S.playing){
    btn.textContent = 'Executing...';
    btn.style.opacity = '0.5';
    btn.style.pointerEvents = 'none';
  } else {
    btn.textContent = `Execute Action: ${st.label}`;
    btn.style.opacity = '1';
    btn.style.pointerEvents = 'auto';
  }
}

el('btnPlay').onclick = ()=>{ 
  if(S.playing) return;
  S.playing = true; 
  refreshStepUI(); 
};
el('btnReset').onclick = ()=>{ resetState(); uiStep=-1; };
const speeds=[1,2,4];
el('btnSpeed').onclick = ()=>{ const i=(speeds.indexOf(S.speed)+1)%3;
  S.speed=speeds[i]; el('btnSpeed').textContent=`Speed ${S.speed}×`; };
el('btnLabels').onclick = ()=>{
  setLabels(!labelsOn);
  el('btnLabels').textContent = labelsOn ? 'Labels ✓' : 'Labels';
};
el('btnView').onclick = ()=>{ setMode(cam.mode==='auto' ? 'all' : 'auto'); };

/* =========================================================
   CAMERA — three modes:
   AUTO : director cam — an authored shot per step, ship always framed
   ALL  : overview looking down the whole staircase
   FREE : user orbit (any drag / pinch / scroll switches to this)
   ========================================================= */
const cam = {mode:'auto', theta:.5, phi:1.1, r:100, tx:-95, ty:6, tz:0,
             target:new THREE.Vector3()};
const vpEl = document.getElementById('viewport');
function portrait(){ return vpEl.clientWidth < vpEl.clientHeight; }
/* one shot per sequence step: angle (th), tilt (ph), distance (r) */
const SHOTS = [
  {th:.55, ph:1.10, r:95},   // 0  approach — ship with the locks ahead
  {th:.15, ph:1.05, r:62},   // 1  gate 1 opens — close on the gate
  {th:.34, ph:1.06, r:70},   // 2  enter ch1 — mules + cables
  {th:.10, ph:1.05, r:62},   // 3  seal
  {th:.03, ph:1.18, r:76},   // 4  fill 1 — low front, watch the water rise
  {th:.20, ph:1.05, r:62},   // 5  gate 2
  {th:.36, ph:1.02, r:72},   // 6  into ch2
  {th:.10, ph:1.05, r:62},   // 7  seal
  {th:.03, ph:1.18, r:76},   // 8  fill 2
  {th:.20, ph:1.05, r:62},   // 9  gate 3
  {th:.36, ph:1.02, r:72},   // 10 into ch3
  {th:.06, ph:1.15, r:80},   // 11 final lift
  {th:.65, ph:0.95, r:170},  // 12 sail the summit — pull wide
];
function desiredShot(){
  const P = portrait();
  if(cam.mode==='all'){
    // stand off the lake end so the staircase recedes in depth — fits any screen
    return {th:1.25, ph:.95, r:P?360:280, tx:15, ty:14};
  }
  const c = SHOTS[Math.min(S.step, SHOTS.length-1)];
  return {th:c.th, ph:c.ph, r:c.r*(P?1.6:1.15),
          tx:Math.max(-95, Math.min(82, S.shipX+3)),
          ty:regionLevel(S.shipX)+6};
}
function applyCam(dt){
  cam.phi = Math.max(.2, Math.min(1.5, cam.phi));
  cam.r = Math.max(25, Math.min(560, cam.r));
  const k = Math.min(1, dt*2.4);
  if(cam.mode!=='free'){
    const d = desiredShot();
    cam.theta += (d.th-cam.theta)*k;
    cam.phi   += (d.ph-cam.phi)*k;
    cam.r     += (d.r -cam.r)*k;
    cam.tx    += (d.tx-cam.tx)*k;
    cam.ty    += (d.ty-cam.ty)*k;
    cam.tz    += (0   -cam.tz)*k;
  }
  /* Free mode: nothing is lerped — rotate, zoom and pan are fully yours */
  cam.target.set(cam.tx, cam.ty, cam.tz);
  camera.position.set(
    cam.tx + cam.r*Math.sin(cam.phi)*Math.sin(cam.theta),
    cam.ty + cam.r*Math.cos(cam.phi),
    cam.tz + cam.r*Math.sin(cam.phi)*Math.cos(cam.theta));
  camera.lookAt(cam.target);
}
function setMode(m){
  cam.mode = m;
  const b = document.getElementById('btnView');
  if(b) b.textContent = {auto:'View · Auto', all:'View · All', free:'View · Free'}[m];
}
let drag=null, pinch=null, lastTap=0;
const _pr = new THREE.Vector3(), _pu = new THREE.Vector3();
/* pan the orbit target in screen space (distance-scaled) */
function panView(dx,dy){
  const s = cam.r*0.0017;
  _pr.setFromMatrixColumn(camera.matrix,0);   // camera right
  _pu.setFromMatrixColumn(camera.matrix,1);   // camera up
  cam.tx += (-dx*_pr.x + dy*_pu.x)*s;
  cam.ty += (-dx*_pr.y + dy*_pu.y)*s;
  cam.tz += (-dx*_pr.z + dy*_pu.z)*s;
  cam.tx = Math.max(-170, Math.min(190, cam.tx));   // stay near the canal
  cam.ty = Math.max(-15,  Math.min(70,  cam.ty));
  cam.tz = Math.max(-70,  Math.min(90,  cam.tz));
}
canvas.addEventListener('contextmenu', e=>e.preventDefault());
canvas.addEventListener('pointerdown', e=>{
  drag={x:e.clientX, y:e.clientY, b:e.buttons, sh:e.shiftKey, mode:null};
  el('hint').style.opacity=0;
});
addEventListener('pointermove', e=>{
  if(!drag || pinch) return;
  const dx=e.clientX-drag.x, dy=e.clientY-drag.y;
  
  if(!drag.mode && (Math.abs(dx)>5 || Math.abs(dy)>5)){
    drag.mode = 'orbit';
    setMode('free');
  }

  
  if(drag.b===2 || drag.sh) panView(dx,dy);
  else { cam.theta -= dx*0.006; cam.phi -= dy*0.005; }
  drag.x=e.clientX; drag.y=e.clientY;
});
addEventListener('pointerup', ()=>drag=null);
addEventListener('pointercancel', ()=>drag=null);
canvas.addEventListener('wheel', e=>{ setMode('free');
  cam.r *= (1+Math.sign(e.deltaY)*0.08); e.preventDefault(); },{passive:false});
canvas.addEventListener('touchstart', e=>{
  if(e.touches.length===2){
    drag=null; setMode('free');
    pinch={ d:Math.hypot(e.touches[0].clientX-e.touches[1].clientX,
                         e.touches[0].clientY-e.touches[1].clientY),
            cx:(e.touches[0].clientX+e.touches[1].clientX)/2,
            cy:(e.touches[0].clientY+e.touches[1].clientY)/2 };
  }
},{passive:true});
canvas.addEventListener('touchmove', e=>{
  if(e.touches.length===2 && pinch){
    const d = Math.hypot(e.touches[0].clientX-e.touches[1].clientX,
                         e.touches[0].clientY-e.touches[1].clientY);
    const cx=(e.touches[0].clientX+e.touches[1].clientX)/2;
    const cy=(e.touches[0].clientY+e.touches[1].clientY)/2;
    cam.r *= pinch.d/d;                    // pinch apart/together = zoom
    panView(cx-pinch.cx, cy-pinch.cy);     // move both fingers = pan
    pinch={d,cx,cy};
  }
},{passive:true});
canvas.addEventListener('touchend', e=>{
  if(e.touches.length<2) pinch=null;
  // double-tap = hand the camera back to the Auto director
  if(e.changedTouches.length===1 && e.touches.length===0){
    const t=performance.now();
    if(t-lastTap<320) setMode('auto');
    lastTap=t;
  }
});

/* ------- resize ------- */
function resize(){
  const w = vpEl.clientWidth, h = vpEl.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w/h;
  camera.fov = portrait() ? 62 : 50;
  camera.updateProjectionMatrix();
  if(cam.mode==='free') setMode('auto');   // re-frame sanely after rotating the phone
}
addEventListener('resize', resize);
if(window.visualViewport) visualViewport.addEventListener('resize', resize);
addEventListener('orientationchange', ()=>setTimeout(resize,300));
resize();

/* shadow flags: solid geometry casts + receives; water / sky / foam excluded */
scene.traverse(o=>{
  if(o.isMesh && o.material && !o.material.isShaderMaterial && !o.material.transparent){
    o.castShadow = true; o.receiveShadow = true;
  }
});

/* ------- main loop ------- */
let last = performance.now();
function loop(now){
  requestAnimationFrame(loop);
  const dt = Math.min((now-last)/1000, .05); last=now;

  if(S.playing){
    S.time += dt*S.speed;
    let st = SEQ[S.step];
    if(S.time >= st.dur){
      st.fn(1);
      S.time = 0; S.step++;
      S.playing = false; // Pause at the end of each step for VLab interactivity
      if(S.step >= SEQ.length){ resetState(); uiStep=-1; }
      if(typeof refreshStepUI === 'function') refreshStepUI();
    }
  }
  const st = SEQ[S.step] || SEQ[0];
  if(uiStep!==S.step){ uiStep=S.step; refreshStepUI(); }
  st.fn(Math.min(S.time/st.dur,1));
  pbar.style.width = (S.time/st.dur*100)+'%';

  // apply state → scene
  for(let i=0;i<3;i++) setChamberLevel(i, S.levels[i]);
  for(let i=0;i<4;i++) setGate(i, S.gateOpen[i]);

  const lvl = regionLevel(S.shipX);
  const bobT = now/1000;
  ship.position.set(S.shipX, lvl - 1.9 + Math.sin(bobT*1.3)*.06, 0);
  ship.rotation.z = Math.sin(bobT*.9)*.008;
  ship.rotation.x = Math.sin(bobT*1.1)*.006;
  if(radarBar) radarBar.rotation.y = now/900;            // radar sweep
  // wake foam follows speed
  const vel = Math.abs(S.shipX - prevShipX)/Math.max(dt,.001); prevShipX = S.shipX;
  const foam = Math.min(.5, vel*.06);
  wake.position.set(S.shipX-17, lvl+.06, 0);
  wake.scale.set(1+foam*2, 1+foam, 1);
  wakeMat.opacity += (foam - wakeMat.opacity)*.1;
  bowFoam.position.set(S.shipX+16.5, lvl+.06, 0);
  bowMat.opacity += (foam*.9 - bowMat.opacity)*.1;

  // bubbles during fill
  if(bubbleChamber>=0) updateBubbles(dt*S.speed, S.levels[bubbleChamber], FLOORS[bubbleChamber]);
  else updateBubbles(dt,0,0);

  // mules, cables, tugs
  updateEngineering(now);

  // subtle water shimmer
  const sh = Math.sin(now/700)*.02;
  ocean.material.opacity = .86+sh; lake.material.opacity = .86-sh;
  _waterTex.offset.x -= dt * 0.015;
  _waterTex.offset.y += dt * 0.01;

  // live readouts
  const shipElev = Math.max(lvl, 0);
  elevNum.textContent = shipElev.toFixed(1)+' m';
  cElev.textContent = shipElev.toFixed(1)+' m';
  cLevels.textContent = S.levels.map(v=>v.toFixed(0)).join(' / ')+' m';
  const stNow = SEQ[S.step];
  cStatus.textContent = stNow.valve ? 'FILLING' :
    (/gate|seal/i.test(stNow.label) ? 'GATES' : 'TRANSIT');
  const moved = Math.max(0,
    (S.levels[0]+S.levels[1]+S.levels[2]-27)/27*303).toFixed(0)+' ML';
  cWater.textContent = moved;
  hudWater.textContent = moved;
  hudBar.style.width = (shipElev/LAKE*100)+'%';

  applyCam(dt);
  renderer.render(scene, camera);
}
requestAnimationFrame(loop);
resetState();