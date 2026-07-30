$f = "c:\Otagaworks\edUOtaga\apps\web\public\experiments\computer\whatisanalgorithm\js\algorithm.js"
$c = [System.IO.File]::ReadAllText($f)

$old = "/* ---------- THREE.JS SCENE ---------- */"
$end = "/* Labels */"

$newBlock = @"
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

/* Lights — clean industrial lighting */
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

/* Floor — glossy grid */
const floorTex=createFloorTex();
const floorGeo=new THREE.PlaneGeometry(GRID*CELL+4,GRID*CELL+4);
const floorMat=new THREE.MeshStandardMaterial({
  map:floorTex, roughness:0.2, metalness:0.3
});
const floorMesh=new THREE.Mesh(floorGeo,floorMat);
floorMesh.rotation.x=-Math.PI/2;floorMesh.position.set(GRID*CELL/2-1,-.01,GRID*CELL/2-1);
floorMesh.receiveShadow=true;scene.add(floorMesh);

/* Walls — high-tech glass barriers */
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

/* Warehouse props — heavy duty shelves */
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

/* ---------- ROBOT — sleek AGV ---------- */
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

/* ---------- PACKAGE — shipping crate ---------- */
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

/* ---------- DROP ZONE — holographic pad ---------- */
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

"@

$idx = $c.IndexOf($old)
$endIdx = $c.IndexOf($end, $idx)

if($idx -ge 0 -and $endIdx -ge 0){
    $before = $c.Substring(0, $idx)
    $after = $c.Substring($endIdx)
    [System.IO.File]::WriteAllText($f, $before + $newBlock + $after)
    Write-Host "SUCCESS"
} else {
    Write-Host "MARKERS NOT FOUND: old=$idx end=$endIdx"
}
