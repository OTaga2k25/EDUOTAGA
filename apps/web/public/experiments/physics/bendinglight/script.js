/* ============ shared helpers ============ */
function pos(cv,e){const r=cv.getBoundingClientRect();
  return {x:(e.clientX-r.left)*(cv.width/r.width), y:(e.clientY-r.top)*(cv.height/r.height)};}
function arrow(ctx,x,y,ang,col,s){s=s||6;ctx.save();ctx.translate(x,y);ctx.rotate(ang);
  ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-s,-s*.55);ctx.lineTo(-s,s*.55);
  ctx.closePath();ctx.fill();ctx.restore();}
function dist(ax,ay,bx,by){return Math.hypot(ax-bx,ay-by);}
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Draw a biconvex lens whose bulge encodes focal length. Returns bulge px. */
function drawLens(ctx,cx,axisY,halfH,f,color,fill,grabbed){
  const bulge=Math.max(8,Math.min(46,4200/f));
  ctx.beginPath();
  ctx.moveTo(cx,axisY-halfH);
  ctx.quadraticCurveTo(cx+bulge*1.9,axisY,cx,axisY+halfH);
  ctx.quadraticCurveTo(cx-bulge*1.9,axisY,cx,axisY-halfH);
  ctx.closePath();
  ctx.fillStyle=fill;ctx.strokeStyle=color;ctx.lineWidth=grabbed?3.5:2.5;
  ctx.fill();ctx.stroke();
  return bulge;
}
/* unified refracted ray: real ray always leaves the lens rightward along the
   line joining (lensPoint) and (imageTip). If image is virtual (left of lens),
   the solid ray goes the OPPOSITE way and a dashed back-extension reaches the tip. */
function refractedRay(ctx,lp,tip,color,W){
  let dx=tip.x-lp.x, dy=tip.y-lp.y;
  const L=Math.hypot(dx,dy)||1; dx/=L; dy/=L;
  const virtual = dx<0;
  const ux=virtual?-dx:dx, uy=virtual?-dy:dy;
  ctx.strokeStyle=color;ctx.lineWidth=1.8;ctx.setLineDash([]);
  ctx.beginPath();ctx.moveTo(lp.x,lp.y);ctx.lineTo(lp.x+ux*W,lp.y+uy*W);ctx.stroke();
  arrow(ctx,lp.x+ux*70,lp.y+uy*70,Math.atan2(uy,ux),color);
  if(virtual){
    ctx.setLineDash([6,4]);ctx.globalAlpha=.7;
    ctx.beginPath();ctx.moveTo(lp.x,lp.y);ctx.lineTo(tip.x,tip.y);ctx.stroke();
    ctx.setLineDash([]);ctx.globalAlpha=1;
  }
}

/* ============ HERO PRISM ============ */
(function(){
  const cv=document.getElementById('prism'),ctx=cv.getContext('2d');
  const W=cv.width,H=cv.height;
  const spectrum=['#e8511d','#f4a417','#ffe14d','#7ec850','#12a0a0','#3d7de0','#8e4ec6'];
  let t=0;
  function frame(){
    ctx.clearRect(0,0,W,H);
    const midY=H*.52,px=W*.46,apex=42;
    const g=ctx.createLinearGradient(0,0,px,0);
    g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(1,'rgba(255,255,255,.9)');
    ctx.strokeStyle=g;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,midY);ctx.lineTo(px,midY);ctx.stroke();
    ctx.beginPath();ctx.moveTo(px,midY-apex);ctx.lineTo(px+64,midY+apex);ctx.lineTo(px-8,midY+apex);ctx.closePath();
    ctx.fillStyle='rgba(180,220,240,.10)';ctx.strokeStyle='rgba(200,230,245,.55)';ctx.lineWidth=1.4;ctx.fill();ctx.stroke();
    const s={x:px+34,y:midY};
    spectrum.forEach((c,i)=>{
      const spread=i-(spectrum.length-1)/2;
      const wob=reduced?0:Math.sin(t/40+i)*.5;
      const ang=spread*.052+.02+wob*.006;
      ctx.strokeStyle=c;ctx.lineWidth=2.4;ctx.globalAlpha=.92;
      ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(W-8,s.y+Math.tan(ang)*(W-s.x-8));ctx.stroke();
    });
    ctx.globalAlpha=1;t++;if(!reduced)requestAnimationFrame(frame);
  }
  frame();
})();

/* ============ SIM 1 · BENDABLE BURNING MIRROR ============ */
(function(){
  const cv=document.getElementById('simBurn'),ctx=cv.getContext('2d');
  const W=cv.width,H=cv.height,axisY=H/2;
  const read=document.getElementById('burnRead');
  const inBtn=document.getElementById('beamIn'),outBtn=document.getElementById('beamOut');
  let mode='in';
  inBtn.onclick=()=>{mode='in';inBtn.classList.add('on');outBtn.classList.remove('on');};
  outBtn.onclick=()=>{mode='out';outBtn.classList.add('on');inBtn.classList.remove('on');};

  const poleX=W-70, apHalf=120;
  let sag=52;                       // mirror depth — draggable
  let screenX=300;                  // paper — draggable
  let bulbX=poleX-160;              // bulb — draggable (out mode)
  let grab=null;                    // 'rim' | 'paper' | 'bulb'
  let hot=null;

  function fpx(){ const R=(apHalf*apHalf+sag*sag)/(2*sag); return R/2; } // sagitta → f
  function Fx(){ return poleX - fpx(); }
  function surfX(y){ return poleX - sag*(y*y)/(apHalf*apHalf); }        // pole=deepest, rim bulges toward the light
  function handlePos(){ return {x: surfX(apHalf)-2, y: axisY-apHalf-16}; } // grab the rim itself

  cv.addEventListener('pointerdown',e=>{
    const p=pos(cv,e); const h=handlePos();
    if(dist(p.x,p.y,h.x,h.y)<26) grab='rim';
    else if(mode==='in' && Math.abs(p.x-screenX)<28 && Math.abs(p.y-axisY)<90) grab='paper';
    else if(mode==='out' && dist(p.x,p.y,bulbX,axisY)<30) grab='bulb';
    if(grab) cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener('pointermove',e=>{
    const p=pos(cv,e); const h=handlePos();
    hot = dist(p.x,p.y,h.x,h.y)<26?'rim'
        : (mode==='in'&&Math.abs(p.x-screenX)<28&&Math.abs(p.y-axisY)<90)?'paper'
        : (mode==='out'&&dist(p.x,p.y,bulbX,axisY)<30)?'bulb':null;
    if(!grab)return;
    if(grab==='rim'){ sag=Math.max(18,Math.min(92, poleX-p.x )); }
    else if(grab==='paper'){ screenX=Math.max(40,Math.min(poleX-40,p.x)); }
    else if(grab==='bulb'){ bulbX=Math.max(60,Math.min(poleX-40,p.x)); }
  });
  cv.addEventListener('pointerup',()=>grab=null);
  cv.addEventListener('pointerleave',()=>hot=null);

  let t=0;
  function frame(){
    ctx.clearRect(0,0,W,H);
    const f=fpx(), F=Fx();
    // axis
    ctx.strokeStyle='#2b4657';ctx.lineWidth=1;ctx.setLineDash([5,4]);
    ctx.beginPath();ctx.moveTo(10,axisY);ctx.lineTo(W-10,axisY);ctx.stroke();ctx.setLineDash([]);
    // mirror
    ctx.beginPath();ctx.lineWidth=4;ctx.strokeStyle='#dfe9ef';
    for(let y=-apHalf;y<=apHalf;y+=2){const x=surfX(y);y===-apHalf?ctx.moveTo(x,axisY+y):ctx.lineTo(x,axisY+y);}
    ctx.stroke();
    // bend handle (glowing ring on rim)
    const h=handlePos();
    ctx.beginPath();ctx.arc(h.x,h.y,(hot==='rim'||grab==='rim')?12:9,0,7);
    ctx.strokeStyle='#f4a417';ctx.lineWidth=3;ctx.stroke();
    ctx.fillStyle='rgba(244,164,23,.25)';ctx.fill();
    ctx.fillStyle='#9db6c4';ctx.font="11px 'Space Mono',monospace";
    ctx.fillText('bend ⇔',h.x-24,h.y-16);

    const rayYs=[-96,-64,-32,32,64,96];
    const dash=reduced?0:-((t*.9)%14);

    if(mode==='in'){
      rayYs.forEach(ry=>{
        const y=axisY+ry,hit=surfX(ry);
        ctx.strokeStyle='#f4a417';ctx.lineWidth=1.6;ctx.setLineDash([7,5]);ctx.lineDashOffset=dash;
        ctx.beginPath();ctx.moveTo(10,y);ctx.lineTo(hit,y);ctx.stroke();ctx.setLineDash([]);
        arrow(ctx,(10+hit)*.5,y,0,'#f4a417');
        const dx=F-hit,dy=axisY-y,L=Math.hypot(dx,dy),ux=dx/L,uy=dy/L;
        ctx.strokeStyle='#e8511d';ctx.lineWidth=1.6;
        ctx.beginPath();ctx.moveTo(hit,y);ctx.lineTo(F+ux*40,axisY+uy*40);ctx.stroke();
        arrow(ctx,hit+ux*L*.6,y+uy*L*.6,Math.atan2(uy,ux),'#e8511d');
      });
      ctx.fillStyle='#9db6c4';ctx.font="12px 'Space Mono',monospace";
      ctx.fillText('parallel rays from the Sun',14,axisY-apHalf-16);
      // paper
      const atF=Math.abs(screenX-F)<12;
      if(atF&&!reduced){
        const pulse=6+Math.sin(t*.25)*4;
        const g=ctx.createRadialGradient(screenX,axisY,0,screenX,axisY,30+pulse);
        g.addColorStop(0,'rgba(255,150,40,.95)');g.addColorStop(1,'rgba(255,90,20,0)');
        ctx.fillStyle=g;ctx.beginPath();ctx.arc(screenX,axisY,30+pulse,0,7);ctx.fill();
      }
      ctx.fillStyle=atF?'#3a2418':'#efe7d8';
      ctx.fillRect(screenX-7,axisY-70,14,140);
      ctx.strokeStyle=atF?'#e8511d':(hot==='paper'?'#f4a417':'#b9ad97');
      ctx.lineWidth=2;ctx.strokeRect(screenX-7,axisY-70,14,140);
      ctx.fillStyle='#9db6c4';ctx.font="12px 'Space Mono',monospace";
      ctx.fillText('paper ⇔',screenX-24,axisY+92);
      read.innerHTML = atF
        ? '🔥 <b>Ignition!</b> Paper at the focus. Mirror sag = '+sag.toFixed(0)+'px → f = <b>'+f.toFixed(0)+'</b>. Bend the mirror and the fire point chases you.'
        : 'f = <b>'+f.toFixed(0)+'</b> (from bend). Paper is '+(Math.abs(screenX-F)).toFixed(0)+'px '+(screenX<F?'in front of':'behind')+' F — warm, no fire. <b>Bend the mirror</b> or <b>slide the paper</b>.';
    } else {
      // bulb mode
      rayYs.forEach(ry=>{
        const y=axisY+ry,hit=surfX(ry);
        // incoming from bulb
        ctx.strokeStyle='#e8511d';ctx.lineWidth=1.6;
        ctx.beginPath();ctx.moveTo(bulbX,axisY);ctx.lineTo(hit,y);ctx.stroke();
        const a1=Math.atan2(y-axisY,hit-bulbX);
        arrow(ctx,(bulbX+hit)/2,(axisY+y)/2,a1,'#e8511d');
        // reflected: mirror equation with point source at u
        const u=poleX-bulbX;                 // object distance (px, +)
        let out;
        if(Math.abs(u-f)<3){ out={ux:-1,uy:0}; }                 // at F → parallel
        else{
          const v=(f*u)/(u-f);               // image distance in front (+) or behind (−)
          const imgX=poleX-v;
          const ddx=imgX-hit, ddy=axisY-y;   // toward image point (real) — for virtual this flips naturally
          const L=Math.hypot(ddx,ddy)||1;
          out={ux:ddx/L,uy:ddy/L};
          if(out.ux>0){out.ux*=-1;out.uy*=-1;} // reflected light must travel leftwards
        }
        ctx.strokeStyle='#f4a417';ctx.lineWidth=1.6;ctx.setLineDash([7,5]);ctx.lineDashOffset=dash;
        ctx.beginPath();ctx.moveTo(hit,y);ctx.lineTo(hit+out.ux*760,y+out.uy*760);ctx.stroke();ctx.setLineDash([]);
        arrow(ctx,hit+out.ux*90,y+out.uy*90,Math.atan2(out.uy,out.ux),'#f4a417');
      });
      // bulb
      const g=ctx.createRadialGradient(bulbX,axisY,0,bulbX,axisY,26);
      g.addColorStop(0,'rgba(255,230,120,.95)');g.addColorStop(1,'rgba(255,230,120,0)');
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(bulbX,axisY,26,0,7);ctx.fill();
      ctx.fillStyle='#ffe887';ctx.beginPath();ctx.arc(bulbX,axisY,8,0,7);ctx.fill();
      ctx.strokeStyle=hot==='bulb'?'#fff':'#c9a94a';ctx.lineWidth=2;ctx.stroke();
      ctx.fillStyle='#9db6c4';ctx.font="12px 'Space Mono',monospace";ctx.fillText('bulb ⇔',bulbX-22,axisY+42);
      const atF=Math.abs((poleX-bulbX)-f)<6;
      read.innerHTML = atF
        ? '<span class="win">◎ Perfect beam!</span> Bulb exactly at F → all rays leave <b>parallel</b>. You built a searchlight / headlight.'
        : 'Bulb at u = <b>'+(poleX-bulbX).toFixed(0)+'</b>, f = <b>'+f.toFixed(0)+'</b>. Beam '+((poleX-bulbX)<f?'<b>spreads</b> (bulb inside F)':'<b>converges</b> (bulb outside F)')+'. Slide the bulb to F for a parallel beam.';
    }
    // F & P markers
    ctx.fillStyle='#27b0c4';ctx.beginPath();ctx.arc(F,axisY,4,0,7);ctx.fill();
    ctx.font="13px 'Space Grotesk'";ctx.fillText('F',F-4,axisY-12);
    ctx.fillStyle='#e8511d';ctx.beginPath();ctx.arc(poleX,axisY,3.5,0,7);ctx.fill();
    ctx.fillText('P',poleX+8,axisY+18);
    t++;requestAnimationFrame(frame);
  }
  frame();
})();

/* ============ SIM 2 · FULLY DRAGGABLE LENS ============ */
(function(){
  const cv=document.getElementById('simLens'),ctx=cv.getContext('2d');
  const W=cv.width,H=cv.height,axisY=H/2+12;
  const read=document.getElementById('lensRead');
  let lensX=W*.55, f=120, objX=W*.55-260, objH=72;
  let grab=null, hot=null;

  function bulgeOf(fv){return Math.max(8,Math.min(46,4200/fv));}
  function bulgeHandle(){return {x:lensX+bulgeOf(f)*1.9-2, y:axisY};}

  cv.addEventListener('pointerdown',e=>{
    const p=pos(cv,e);const bh=bulgeHandle();
    if(dist(p.x,p.y,bh.x,bh.y)<20) grab='bulge';
    else if(Math.abs(p.x-objX)<34 && p.y>axisY-objH-30 && p.y<axisY+16) grab='obj';
    else if(Math.abs(p.x-lensX)<30 && Math.abs(p.y-axisY)<126) grab='lens';
    if(grab)cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener('pointermove',e=>{
    const p=pos(cv,e);const bh=bulgeHandle();
    hot = dist(p.x,p.y,bh.x,bh.y)<20?'bulge'
        : (Math.abs(p.x-objX)<34&&p.y>axisY-objH-30&&p.y<axisY+16)?'obj'
        : (Math.abs(p.x-lensX)<30&&Math.abs(p.y-axisY)<126)?'lens':null;
    if(!grab)return;
    if(grab==='bulge'){
      const b=Math.max(8,Math.min(46,(p.x-lensX)/1.9));
      f=Math.max(70,Math.min(300,4200/b));
    } else if(grab==='obj'){
      objX=Math.max(36,Math.min(lensX-28,p.x));
      objH=Math.max(30,Math.min(110,axisY-p.y>20?axisY-p.y:objH));
    } else if(grab==='lens'){
      lensX=Math.max(objX+28,Math.min(W-120,p.x));
    }
  });
  cv.addEventListener('pointerup',()=>grab=null);
  cv.addEventListener('pointerleave',()=>hot=null);

  function frame(){
    ctx.clearRect(0,0,W,H);
    const d=lensX-objX;
    const atF=Math.abs(d-f)<3;
    const v=atF?Infinity:(f*d)/(d-f);
    const m=atF?Infinity:-v/d;
    const tipObj={x:objX,y:axisY-objH};
    const tipImg=atF?null:{x:lensX+v,y:axisY-m*objH};

    // axis
    ctx.strokeStyle='#2b4657';ctx.lineWidth=1;ctx.setLineDash([5,4]);
    ctx.beginPath();ctx.moveTo(10,axisY);ctx.lineTo(W-10,axisY);ctx.stroke();ctx.setLineDash([]);
    // F & 2F ticks
    ctx.fillStyle='#7fbfbf';ctx.font="12px 'Space Grotesk'";
    [[lensX-f,'F'],[lensX+f,'F'],[lensX-2*f,'2F'],[lensX+2*f,'2F']].forEach(([x,l])=>{
      if(x>6&&x<W-6){ctx.beginPath();ctx.arc(x,axisY,3,0,7);ctx.fill();ctx.fillText(l,x-6,axisY+20);}
    });
    // lens + f label
    const bulge=drawLens(ctx,lensX,axisY,118,f,'#12a0a0','rgba(18,160,160,.16)',hot==='lens'||grab==='lens');
    ctx.fillStyle='#8fd8d8';ctx.font="12px 'Space Mono',monospace";
    ctx.fillText('f = '+f.toFixed(0),lensX-22,axisY-128);
    // bulge handle
    const bh=bulgeHandle();
    ctx.beginPath();ctx.arc(bh.x,bh.y,(hot==='bulge'||grab==='bulge')?9:6.5,0,7);
    ctx.fillStyle='#12a0a0';ctx.fill();ctx.strokeStyle='#bff2f2';ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle='#7fbfbf';ctx.fillText('squash ⇔',bh.x+10,bh.y+4);

    // candle object
    ctx.strokeStyle=(hot==='obj'||grab==='obj')?'#ffe14d':'#f4c025';
    ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=3.5;
    ctx.beginPath();ctx.moveTo(objX,axisY);ctx.lineTo(objX,tipObj.y);ctx.stroke();
    arrow(ctx,objX,tipObj.y,-Math.PI/2,ctx.fillStyle,10);
    // little flame
    ctx.beginPath();ctx.arc(objX,tipObj.y-8,4,0,7);ctx.fillStyle='#ff9d3c';ctx.fill();
    ctx.fillStyle='#c9b25a';ctx.font="12px 'Space Mono',monospace";
    ctx.fillText('candle ⇕⇔',objX-30,axisY+22);

    // rays (2 principal rays, unified real/virtual handling)
    if(atF){
      // parallel out — no image
      const lp1={x:lensX,y:tipObj.y};
      ctx.strokeStyle='#ffe14d';ctx.lineWidth=1.8;
      ctx.beginPath();ctx.moveTo(tipObj.x,tipObj.y);ctx.lineTo(lp1.x,lp1.y);ctx.stroke();
      // through centre gives the outgoing direction for all rays
      const dx=lensX-tipObj.x,dy=axisY-tipObj.y,L=Math.hypot(dx,dy),ux=dx/L,uy=dy/L;
      [[lp1,'#ffe14d'],[{x:lensX,y:axisY},'#7ec850']].forEach(([pnt,c])=>{
        ctx.strokeStyle=c;ctx.beginPath();ctx.moveTo(pnt.x,pnt.y);
        ctx.lineTo(pnt.x+ux*600,pnt.y+uy*600);ctx.stroke();
        arrow(ctx,pnt.x+ux*90,pnt.y+uy*90,Math.atan2(uy,ux),c);
      });
    } else {
      // Ray 1: parallel in → through image tip
      const lp1={x:lensX,y:tipObj.y};
      ctx.strokeStyle='#ffe14d';ctx.lineWidth=1.8;
      ctx.beginPath();ctx.moveTo(tipObj.x,tipObj.y);ctx.lineTo(lp1.x,lp1.y);ctx.stroke();
      refractedRay(ctx,lp1,tipImg,'#ffe14d',W);
      // Ray 2: through optical centre (undeviated) — also passes through tip
      // Ray 2: through the optical centre (lensX, axisY) — undeviated
      ctx.strokeStyle='#7ec850';
      ctx.beginPath();ctx.moveTo(tipObj.x,tipObj.y);ctx.lineTo(lensX,axisY);ctx.stroke();
      refractedRay(ctx,{x:lensX,y:axisY},tipImg,'#7ec850',W);
    }

    // image arrow
    if(tipImg && tipImg.x>8 && tipImg.x<W-8 && Math.abs(v)<3000){
      const virt=v<0;
      ctx.strokeStyle=virt?'#e07be0':'#e0533a';ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=3.5;
      if(virt)ctx.setLineDash([6,4]);
      ctx.beginPath();ctx.moveTo(tipImg.x,axisY);ctx.lineTo(tipImg.x,tipImg.y);ctx.stroke();
      arrow(ctx,tipImg.x,tipImg.y,tipImg.y>axisY?Math.PI/2:-Math.PI/2,ctx.strokeStyle,10);
      ctx.setLineDash([]);
      ctx.font="12px 'Space Mono',monospace";
      ctx.fillText(virt?'virtual image':'real image',tipImg.x-34,tipImg.y>axisY?tipImg.y+22:tipImg.y-12);
    }
    ctx.fillStyle='#12a0a0';ctx.beginPath();ctx.arc(lensX,axisY,3.5,0,7);ctx.fill();

    // readout
    let nature;
    if(atF) nature='Candle <b>exactly at F</b> → rays leave parallel, <b>no image forms</b>. Nudge it either way.';
    else if(v<0) nature='<b>Virtual, upright, '+Math.abs(m).toFixed(1)+'× magnified</b> — candle inside F. You\'re holding a magnifying glass.';
    else{
      const size=Math.abs(m)>1.08?'enlarged':(Math.abs(m)<0.92?'diminished':'same size');
      nature='<b>Real &amp; inverted</b>, '+size+' ('+Math.abs(m).toFixed(2)+'×). Put a screen at the red arrow and the image appears on it.';
    }
    read.innerHTML='u = <b>'+d.toFixed(0)+'</b> · f = <b>'+f.toFixed(0)+'</b> (squash the lens!) · v = <b>'+(atF?'∞':v.toFixed(0))+'</b><br>'+nature;
    requestAnimationFrame(frame);
  }
  frame();
})();

/* ============ SIM 3 · TIR with draggable torch ============ */
(function(){
  const cv=document.getElementById('simTir'),ctx=cv.getContext('2d');
  const W=cv.width,H=cv.height;
  const surfaceY=H*.40, hitX=W*.52;
  const read=document.getElementById('tirRead');
  let n2=1.50;
  let torch={x:hitX-170,y:surfaceY+190};
  let grab=false, hot=false;

  document.querySelectorAll('#tirMedium button').forEach(b=>{
    b.onclick=()=>{n2=+b.dataset.n;
      document.querySelectorAll('#tirMedium button').forEach(x=>x.classList.remove('on'));
      b.classList.add('on');};
  });

  cv.addEventListener('pointerdown',e=>{
    const p=pos(cv,e);
    if(p.y>surfaceY+8){grab=true;cv.setPointerCapture(e.pointerId);setTorch(p);}
  });
  cv.addEventListener('pointermove',e=>{
    const p=pos(cv,e);
    hot=dist(p.x,p.y,torch.x,torch.y)<34;
    if(grab)setTorch(p);
  });
  cv.addEventListener('pointerup',()=>grab=false);
  function setTorch(p){
    torch.x=Math.max(30,Math.min(hitX-20,p.x));
    torch.y=Math.max(surfaceY+40,Math.min(H-24,p.y));
  }

  function frame(){
    ctx.clearRect(0,0,W,H);
    // media
    ctx.fillStyle='#0a1620';ctx.fillRect(0,0,W,surfaceY);
    const denseCol=n2>2?'30,45,70':(n2>1.4?'16,60,74':'14,54,60');
    const g=ctx.createLinearGradient(0,surfaceY,0,H);
    g.addColorStop(0,'rgba('+denseCol+',.9)');g.addColorStop(1,'rgba('+denseCol+',.55)');
    ctx.fillStyle=g;ctx.fillRect(0,surfaceY,W,H-surfaceY);
    ctx.strokeStyle='#5f8aa2';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(0,surfaceY);ctx.lineTo(W,surfaceY);ctx.stroke();
    ctx.fillStyle='#8fa9b8';ctx.font="12px 'Space Mono',monospace";
    ctx.fillText('AIR  n = 1.00',16,surfaceY-14);
    ctx.fillText((n2>2?'DIAMOND':n2>1.4?'GLASS':'WATER')+'  n = '+n2.toFixed(2),16,surfaceY+22);
    // normal
    ctx.strokeStyle='#3a5568';ctx.setLineDash([5,4]);
    ctx.beginPath();ctx.moveTo(hitX,20);ctx.lineTo(hitX,H-16);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='#6f8ea0';ctx.fillText('normal',hitX+6,32);

    // angle from torch geometry
    const dx=hitX-torch.x, dy=torch.y-surfaceY;
    let th1=Math.atan2(Math.abs(dx),dy); th1=Math.max(.05,Math.min(1.53,th1));
    const th1deg=th1*180/Math.PI;
    const critical=Math.asin(1/n2), critDeg=critical*180/Math.PI;

    // incident beam torch→hit
    ctx.strokeStyle='#f4a417';ctx.lineWidth=2.6;
    ctx.beginPath();ctx.moveTo(torch.x,torch.y);ctx.lineTo(hitX,surfaceY);ctx.stroke();
    arrow(ctx,(torch.x+hitX)/2,(torch.y+surfaceY)/2,Math.atan2(surfaceY-torch.y,hitX-torch.x),'#f4a417',7);
    // torch body
    ctx.save();ctx.translate(torch.x,torch.y);
    ctx.rotate(Math.atan2(surfaceY-torch.y,hitX-torch.x));
    ctx.fillStyle=hot||grab?'#ffd35c':'#c9c2ae';
    ctx.fillRect(-30,-8,30,16);
    ctx.fillStyle='#ffe887';ctx.fillRect(0,-10,8,20);
    ctx.restore();
    ctx.fillStyle='#9db6c4';ctx.font="11px 'Space Mono',monospace";
    ctx.fillText('drag me',torch.x-20,torch.y+28);

    // incidence arc + critical arc
    ctx.strokeStyle='#f4a417';ctx.lineWidth=1;
    ctx.beginPath();ctx.arc(hitX,surfaceY,36,Math.PI/2,Math.PI/2+th1);ctx.stroke();
    ctx.strokeStyle='rgba(91,224,138,.6)';ctx.setLineDash([3,3]);
    ctx.beginPath();ctx.arc(hitX,surfaceY,52,Math.PI/2,Math.PI/2+critical);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='#5be08a';ctx.fillText('critical '+critDeg.toFixed(0)+'°',hitX-Math.sin(critical)*70-30,surfaceY+Math.cos(critical)*70+12);

    const TIR=th1>=critical;
    if(!TIR){
      const th2=Math.asin(n2*Math.sin(th1)); // dense→air
      const Lr=240,rx=hitX+Math.sin(th2)*Lr,ry=surfaceY-Math.cos(th2)*Lr;
      ctx.strokeStyle='#5cd6e6';ctx.lineWidth=2.6;
      ctx.beginPath();ctx.moveTo(hitX,surfaceY);ctx.lineTo(rx,ry);ctx.stroke();
      arrow(ctx,(hitX+rx)/2,(surfaceY+ry)/2,Math.atan2(ry-surfaceY,rx-hitX),'#5cd6e6',7);
      // faint partial reflection
      ctx.strokeStyle='rgba(244,164,23,.32)';ctx.lineWidth=1.4;
      ctx.beginPath();ctx.moveTo(hitX,surfaceY);
      ctx.lineTo(hitX+Math.sin(th1)*170,surfaceY+Math.cos(th1)*170);ctx.stroke();
      read.innerHTML='θᵢ = <b>'+th1deg.toFixed(0)+'°</b> &lt; critical <b>'+critDeg.toFixed(1)+'°</b><br>Light <b>escapes</b>, bending away from the normal (refraction ≈ '+(th2*180/Math.PI).toFixed(1)+'°). A little reflects back too.';
    }else{
      const Lr=260,rx=hitX+Math.sin(th1)*Lr,ry=surfaceY+Math.cos(th1)*Lr;
      ctx.strokeStyle='#e8511d';ctx.lineWidth=3;
      ctx.beginPath();ctx.moveTo(hitX,surfaceY);ctx.lineTo(rx,ry);ctx.stroke();
      arrow(ctx,(hitX+rx)/2,(surfaceY+ry)/2,Math.atan2(ry-surfaceY,rx-hitX),'#e8511d',8);
      ctx.fillStyle='#e8511d';ctx.font="700 18px 'Space Grotesk'";
      ctx.fillText('TOTAL INTERNAL REFLECTION',Math.min(hitX+14,W-330),Math.max(46,surfaceY-46));
      read.innerHTML='θᵢ = <b>'+th1deg.toFixed(0)+'°</b> ≥ critical <b>'+critDeg.toFixed(1)+'°</b><br>🚫 Nothing escapes — the surface is now a <b>perfect mirror</b>. This is the light trapped inside an optical fibre.';
    }
    requestAnimationFrame(frame);
  }
  frame();
})();

/* ============ SIM 4 · CAPSTONE OPTICIAN'S BENCH ============ */
(function(){
  const cv=document.getElementById('simBench'),ctx=cv.getContext('2d');
  const W=cv.width,H=cv.height,axisY=H/2+14;
  const read=document.getElementById('benchRead');
  const hintEl=document.getElementById('benchHint');
  const missionsEl=document.getElementById('missions');
  let mission='telescope';
  const done={telescope:false,microscope:false,projector:false};

  const HINTS={
    telescope:'<span class="h">🎯 Goal:</span> distant moon → magnified view for the eye. <span class="h">Recipe:</span> make lens 1 weak (long f, thin) and lens 2 strong (short f, fat), then slide them apart until the gap ≈ f₁ + f₂. Drag lenses ⇔, drag their ● bulge handles to squash/stretch.',
    microscope:'<span class="h">🎯 Goal:</span> a tiny bug → huge virtual image. <span class="h">Recipe:</span> make lens 1 strong (fat, short f) and put the bug just OUTSIDE its focus; then place lens 2 so the first image lands just INSIDE lens 2\'s focus. Aim for total magnification ≥ 8×.',
    projector:'<span class="h">🎯 Goal:</span> throw a big REAL image onto the wall (right edge). <span class="h">Recipe:</span> one lens is enough — park lens 2 far right out of the way. Put the slide just outside lens 1\'s focus: real, inverted, ≥ 3× and landing on the wall.'
  };
  missionsEl.querySelectorAll('button').forEach(b=>{
    b.onclick=()=>{mission=b.dataset.m;
      missionsEl.querySelectorAll('button').forEach(x=>x.classList.remove('on'));
      b.classList.add('on');
      hintEl.innerHTML=HINTS[mission];};
  });
  hintEl.innerHTML=HINTS[mission];

  // state
  let L1={x:W*.34,f:150}, L2={x:W*.72,f:90};
  let objX=W*.12, objH=40;
  let grab=null,hot=null;

  function bulgeOf(f){return Math.max(8,Math.min(46,4200/f));}
  function bh(L){return {x:L.x+bulgeOf(L.f)*1.9-2,y:axisY};}

  cv.addEventListener('pointerdown',e=>{
    const p=pos(cv,e);
    if(dist(p.x,p.y,bh(L1).x,bh(L1).y)<18)grab='b1';
    else if(dist(p.x,p.y,bh(L2).x,bh(L2).y)<18)grab='b2';
    else if(Math.abs(p.x-objX)<28&&p.y>axisY-objH-26&&p.y<axisY+14)grab='obj';
    else if(Math.abs(p.x-L1.x)<26&&Math.abs(p.y-axisY)<110)grab='l1';
    else if(Math.abs(p.x-L2.x)<26&&Math.abs(p.y-axisY)<110)grab='l2';
    if(grab)cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener('pointermove',e=>{
    const p=pos(cv,e);
    hot = dist(p.x,p.y,bh(L1).x,bh(L1).y)<18?'b1'
        : dist(p.x,p.y,bh(L2).x,bh(L2).y)<18?'b2'
        : (Math.abs(p.x-objX)<28&&p.y>axisY-objH-26&&p.y<axisY+14)?'obj'
        : (Math.abs(p.x-L1.x)<26&&Math.abs(p.y-axisY)<110)?'l1'
        : (Math.abs(p.x-L2.x)<26&&Math.abs(p.y-axisY)<110)?'l2':null;
    if(!grab)return;
    if(grab==='b1'){const b=Math.max(8,Math.min(46,(p.x-L1.x)/1.9));L1.f=Math.max(55,Math.min(320,4200/b));}
    else if(grab==='b2'){const b=Math.max(8,Math.min(46,(p.x-L2.x)/1.9));L2.f=Math.max(45,Math.min(320,4200/b));}
    else if(grab==='obj'){objX=Math.max(24,Math.min(L1.x-24,p.x));}
    else if(grab==='l1'){L1.x=Math.max(objX+24,Math.min(L2.x-40,p.x));}
    else if(grab==='l2'){L2.x=Math.max(L1.x+40,Math.min(W-30,p.x));}
  });
  cv.addEventListener('pointerup',()=>grab=null);

  let t=0, winPulse=0;
  function frame(){
    ctx.clearRect(0,0,W,H);
    const moonMode = mission==='telescope';
    // bench rail
    ctx.fillStyle='#13293a';ctx.fillRect(14,axisY+96,W-28,10);
    ctx.strokeStyle='#2b4657';ctx.lineWidth=1;ctx.setLineDash([5,4]);
    ctx.beginPath();ctx.moveTo(10,axisY);ctx.lineTo(W-10,axisY);ctx.stroke();ctx.setLineDash([]);
    // wall (projector)
    if(mission==='projector'){
      ctx.fillStyle='rgba(230,230,220,.10)';ctx.fillRect(W-26,30,14,H-70);
      ctx.strokeStyle='#8fa9b8';ctx.strokeRect(W-26,30,14,H-70);
      ctx.fillStyle='#8fa9b8';ctx.font="11px 'Space Mono',monospace";ctx.fillText('wall',W-46,24);
    }

    /* ---- draw lenses ---- */
    [ [L1,'#f4c025','rgba(244,192,37,.14)','l1','b1','L1'],
      [L2,'#5cd6e6','rgba(92,214,230,.14)','l2','b2','L2'] ].forEach(([L,c,fc,gk,bk,name])=>{
      drawLens(ctx,L.x,axisY,104,L.f,c,fc,hot===gk||grab===gk);
      const h=bh(L);
      ctx.beginPath();ctx.arc(h.x,h.y,(hot===bk||grab===bk)?9:6,0,7);
      ctx.fillStyle=c;ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1.6;ctx.stroke();
      ctx.fillStyle=c;ctx.font="12px 'Space Mono',monospace";
      ctx.fillText(name+'  f='+L.f.toFixed(0),L.x-28,axisY-116);
    });

    /* ---- optics chain ---- */
    let img1x, m1, htmlExtra='';
    if(moonMode){
      // moon at infinity → image1 at f1 right of L1
      img1x=L1.x+L1.f; m1=0;
      // draw moon + incoming parallel rays at small angle 0 (axis-parallel bundle)
      ctx.fillStyle='#e8e4d8';ctx.beginPath();ctx.arc(46,54,17,0,7);ctx.fill();
      ctx.fillStyle='#0a1620';ctx.beginPath();ctx.arc(52,50,13,0,7);ctx.fill();
      ctx.fillStyle='#8fa9b8';ctx.font="11px 'Space Mono',monospace";ctx.fillText('moon · at infinity',24,86);
      [-56,-28,0,28,56].forEach(ry=>{
        const y=axisY+ry;
        ctx.strokeStyle='rgba(244,192,37,.85)';ctx.lineWidth=1.5;
        ctx.setLineDash([7,5]);ctx.lineDashOffset=reduced?0:-((t*.9)%14);
        ctx.beginPath();ctx.moveTo(14,y);ctx.lineTo(L1.x,y);ctx.stroke();ctx.setLineDash([]);
        // converge to img1
        const dx=img1x-L1.x, dy=axisY-y, Lh=Math.hypot(dx,dy),ux=dx/Lh,uy=dy/Lh;
        ctx.strokeStyle='#f4c025';ctx.beginPath();ctx.moveTo(L1.x,y);
        // stop at L2 if beyond
        const stopX=Math.min(img1x+ (L2.x-img1x>0? (L2.x-img1x):40), L2.x);
        const tEnd=(L2.x-L1.x)/ux;
        const ex=L1.x+ux*Math.max(0,Math.min(tEnd,(img1x-L1.x)/ux+120));
        ctx.lineTo(ex, y+uy*((ex-L1.x)/ux));ctx.stroke();
      });
    } else {
      // near object (bug/slide)
      const d1=L1.x-objX;
      const at=Math.abs(d1-L1.f)<3;
      const v1=at?1e6:(L1.f*d1)/(d1-L1.f);
      img1x=L1.x+v1; m1=at?1e6:-v1/d1;
      // object sprite
      const isBug=mission==='microscope';
      ctx.strokeStyle=(hot==='obj'||grab==='obj')?'#ffe14d':'#f4c025';
      ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=3;
      ctx.beginPath();ctx.moveTo(objX,axisY);ctx.lineTo(objX,axisY-objH);ctx.stroke();
      arrow(ctx,objX,axisY-objH,-Math.PI/2,ctx.fillStyle,9);
      ctx.font="15px serif";ctx.fillText(isBug?'🐜':'🖼',objX-9,axisY-objH-8);
      ctx.fillStyle='#c9b25a';ctx.font="11px 'Space Mono',monospace";
      ctx.fillText((isBug?'bug':'slide')+' ⇔',objX-18,axisY+22);
      // rays through L1 (2 principal rays)
      if(!at&&Math.abs(v1)<4000){
        const tip1={x:img1x,y:axisY-m1*objH};
        const lpA={x:L1.x,y:axisY-objH};
        ctx.strokeStyle='#ffe14d';ctx.lineWidth=1.6;
        ctx.beginPath();ctx.moveTo(objX,axisY-objH);ctx.lineTo(lpA.x,lpA.y);ctx.stroke();
        refractedRay(ctx,lpA,tip1,'rgba(255,225,77,.85)',W*.6);
        ctx.strokeStyle='#7ec850';
        ctx.beginPath();ctx.moveTo(objX,axisY-objH);ctx.lineTo(L1.x,axisY);ctx.stroke();
        refractedRay(ctx,{x:L1.x,y:axisY},tip1,'rgba(126,200,80,.85)',W*.6);
      }
    }

    // image 1 marker
    const h1 = moonMode? 26 : -m1*objH;
    if(Math.abs(img1x)<4000 && img1x>8 && img1x<W-8 && Math.abs(h1)<4000){
      ctx.strokeStyle='rgba(224,83,58,.9)';ctx.lineWidth=2.5;
      ctx.setLineDash(img1x<L1.x?[6,4]:[]);
      ctx.beginPath();ctx.moveTo(img1x,axisY);ctx.lineTo(img1x,axisY-(moonMode?-26:h1*-1));ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle='#e0836a';ctx.font="11px 'Space Mono',monospace";
      ctx.fillText('image₁',img1x-20,axisY+34);
    }

    // stage 2: image1 is object for L2
    const u2 = img1x - L2.x;          // signed: negative if left of L2 (normal)
    let v2=null,m2=null,finalX=null,finalH=null,totalM=null,virtualFinal=false;
    if(Math.abs(u2)>0.5){
      const inv = 1/L2.f + 1/u2;      // 1/v = 1/f + 1/u  (u signed, left = negative)
      if(Math.abs(inv)>1e-6){
        v2=1/inv; m2=v2/u2;
        finalX=L2.x+v2;
        const h1v = moonMode? 26 : -m1*objH;
        finalH = m2*h1v;
        totalM = moonMode? null : m1*m2;
        virtualFinal = v2<0;
        if(finalX>8&&finalX<W-8&&Math.abs(finalH)<160){
          ctx.strokeStyle=virtualFinal?'#e07be0':'#ff6b4d';ctx.lineWidth=3;
          if(virtualFinal)ctx.setLineDash([6,4]);
          ctx.beginPath();ctx.moveTo(finalX,axisY);ctx.lineTo(finalX,axisY-finalH);ctx.stroke();
          arrow(ctx,finalX,axisY-finalH,finalH>0?-Math.PI/2:Math.PI/2,ctx.strokeStyle,9);
          ctx.setLineDash([]);
          ctx.fillStyle=ctx.strokeStyle;ctx.font="11px 'Space Mono',monospace";
          ctx.fillText('final image',finalX-30,axisY-finalH+(finalH>0?-10:20));
        }
      }
    }

    /* ---- mission detection ---- */
    let msg='';
    const gap=L2.x-L1.x;
    if(mission==='telescope'){
      const afocal=Math.abs(gap-(L1.f+L2.f))<14;
      const ratio=L1.f/L2.f;
      const good=afocal&&ratio>1.6;
      if(good){done.telescope=true;winPulse=1;
        msg='<span class="win">🔭 TELESCOPE BUILT!</span> Gap ≈ f₁+f₂ ('+gap.toFixed(0)+' ≈ '+(L1.f+L2.f).toFixed(0)+'). Angular magnification = f₁/f₂ = <b>'+ratio.toFixed(1)+'×</b>. This is exactly Kepler\'s design — Galileo saw Jupiter\'s moons with ~20×.';
      } else {
        msg='Gap = <b>'+gap.toFixed(0)+'</b>, f₁+f₂ = <b>'+(L1.f+L2.f).toFixed(0)+'</b> · f₁/f₂ = <b>'+ratio.toFixed(1)+'</b><br>'+
          (Math.abs(gap-(L1.f+L2.f))>=14?'Slide the lenses until the gap matches f₁+f₂ (image₁ must land at L2\'s focus). ':'')+
          (ratio<=1.6?'Make L1 thinner (longer f) and L2 fatter (shorter f) for real magnification.':'');
      }
    } else if(mission==='microscope'){
      const enlargedVirtual = virtualFinal && totalM!==null && Math.abs(totalM)>=8;
      if(enlargedVirtual){done.microscope=true;winPulse=1;
        msg='<span class="win">🔬 MICROSCOPE BUILT!</span> Total magnification = m₁ × m₂ = '+m1.toFixed(1)+' × '+m2.toFixed(1)+' = <b>'+Math.abs(totalM).toFixed(1)+'×</b>, virtual &amp; enlarged — just like van Leeuwenhoek peering at pond water.';
      } else {
        msg='m₁ = <b>'+(Math.abs(m1)>999?'∞':m1.toFixed(1))+'</b> · m₂ = <b>'+(m2===null?'—':m2.toFixed(1))+'</b> · total = <b>'+(totalM===null?'—':Math.abs(totalM).toFixed(1)+'×')+'</b> '+(virtualFinal?'(virtual ✓)':'(need virtual final image)')+'<br>Fatten L1, keep the bug just outside its F, and slide L2 so image₁ falls just inside L2\'s focus.';
      }
    } else { // projector
      // want final REAL image on wall zone (x > W-90), inverted, ≥3×
      const onWall = finalX!==null && !virtualFinal && finalX>W-95 && totalM!==null && Math.abs(totalM)>=3;
      if(onWall){done.projector=true;winPulse=1;
        msg='<span class="win">📽 PROJECTOR BUILT!</span> A real, inverted, <b>'+Math.abs(totalM).toFixed(1)+'×</b> image lands on the wall. (That\'s why cinema film is loaded upside-down!)';
      } else {
        msg='Final image: '+(finalX===null?'—':(virtualFinal?'virtual (need real)':'real at x='+finalX.toFixed(0)))+' · size '+(totalM===null?'—':Math.abs(totalM).toFixed(1)+'×')+'<br>Slide the slide just outside L1\'s focus; push L2 far right (or make it very thin) so it doesn\'t interfere; the image must hit the wall ≥3×.';
      }
    }
    // trophy row
    const trophies=(done.telescope?'🔭':'▢')+' '+(done.microscope?'🔬':'▢')+' '+(done.projector?'📽':'▢');
    read.innerHTML=msg+'<br><span style="opacity:.7">built: '+trophies+'</span>';
    // win pulse glow
    if(winPulse>0){
      ctx.fillStyle='rgba(91,224,138,'+(winPulse*.16)+')';
      ctx.fillRect(0,0,W,H);
      winPulse=Math.max(0,winPulse-0.02);
    }
    // mission button states
    missionsEl.querySelectorAll('button').forEach(b=>{
      b.classList.toggle('done',done[b.dataset.m]);
    });
    t++;requestAnimationFrame(frame);
  }
  frame();
})();
