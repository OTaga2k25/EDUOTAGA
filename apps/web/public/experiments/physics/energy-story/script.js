/* ============ shared helpers ============ */
function pos(cv,e){const r=cv.getBoundingClientRect();
  return {x:(e.clientX-r.left)*(cv.width/r.width), y:(e.clientY-r.top)*(cv.height/r.height)};}
function dist(ax,ay,bx,by){return Math.hypot(ax-bx,ay-by);}
function bars(ctx,x,y,w,items,total){
  /* stacked energy bar */
  const T=Math.max(1,total);
  let cx=x;
  ctx.fillStyle='rgba(255,255,255,.07)';ctx.fillRect(x,y,w,16);
  items.forEach(it=>{
    const ww=w*Math.max(0,it.v)/T;
    ctx.fillStyle=it.c;ctx.fillRect(cx,y,ww,16);cx+=ww;
  });
  ctx.strokeStyle='rgba(255,255,255,.18)';ctx.lineWidth=1;ctx.strokeRect(x,y,w,16);
}
function legend(ctx,x,y,items){
  let cx=x;
  ctx.font="10px 'Space Mono',monospace";
  items.forEach(it=>{
    ctx.fillStyle=it.c;ctx.fillRect(cx,y-8,10,10);
    ctx.fillStyle='#c0b09c';ctx.fillText(it.n+' '+Math.round(it.v),cx+14,y+1);
    cx+=ctx.measureText(it.n+' '+Math.round(it.v)).width+34;
  });
}
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ============ HERO · coaster car ============ */
(function(){
  const cv=document.getElementById('heroCoaster'),ctx=cv.getContext('2d');
  const W=cv.width,H=cv.height;
  const track=x=>H*0.80-110*Math.exp(-Math.pow((x-140)/110,2))
                    -74*Math.exp(-Math.pow((x-430)/110,2))
                    -44*Math.exp(-Math.pow((x-700)/100,2));
  let t=0;
  function frame(){
    ctx.clearRect(0,0,W,H);
    ctx.strokeStyle='rgba(58,168,216,.55)';ctx.lineWidth=3;ctx.beginPath();
    for(let x=0;x<=W;x+=4){const y=track(x);x?ctx.lineTo(x,y):ctx.moveTo(x,y);}
    ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,.07)';ctx.lineWidth=1;
    for(let x=20;x<W;x+=34){ctx.beginPath();ctx.moveTo(x,track(x));ctx.lineTo(x,H);ctx.stroke();}
    const p=reduced?0.35:((t/3)%(W+60))/(W+60);
    const cxp=p*W, cyp=track(cxp);
    const sl=(track(cxp+2)-track(cxp-2))/4;
    ctx.save();ctx.translate(cxp,cyp-9);ctx.rotate(Math.atan(sl));
    ctx.fillStyle='#f5a623';ctx.fillRect(-16,-11,32,16);
    ctx.fillStyle='#241b14';ctx.beginPath();ctx.arc(-9,6,4.5,0,7);ctx.fill();
    ctx.beginPath();ctx.arc(9,6,4.5,0,7);ctx.fill();
    ctx.restore();
    t++;if(!reduced)requestAnimationFrame(frame);
  }
  frame();
})();

/* ============ SIM 1 · ROLLER COASTER ============ */
(function(){
  const cv=document.getElementById('simCoaster'),ctx=cv.getContext('2d');
  const W=cv.width,H=cv.height,ground=H-96;
  const read=document.getElementById('coasterRead');
  /* track: lift hill, tall middle hill, small hill */
  const track=x=>ground-150*Math.exp(-Math.pow((x-110)/95,2))
                       -118*Math.exp(-Math.pow((x-400)/85,2))
                       -62*Math.exp(-Math.pow((x-640)/80,2));
  const g=1.0, m=1;
  let carX=110, v=0, running=false, startH=0, dragging=false, hot=false;
  document.getElementById('coasterGo').onclick=()=>{running=true;v=0;startH=ground-track(carX);};

  cv.addEventListener('pointerdown',e=>{const p=pos(cv,e);
    if(dist(p.x,p.y,carX,track(carX)-10)<38){dragging=true;running=false;v=0;cv.setPointerCapture(e.pointerId);}});
  cv.addEventListener('pointermove',e=>{const p=pos(cv,e);
    hot=dist(p.x,p.y,carX,track(carX)-10)<38;
    if(dragging)carX=Math.max(28,Math.min(210,p.x));});
  cv.addEventListener('pointerup',()=>dragging=false);
  cv.addEventListener('pointerleave',()=>hot=false);

  function frame(){
    ctx.clearRect(0,0,W,H);
    const h=ground-track(carX);
    if(running){
      /* energy conservation: v² = 2g(h0 - h) */
      const v2=2*g*(startH-h)*9;
      if(v2<=0){v=-v*0.999;              // turn around at the same height
        carX+=Math.sign(v||1)*0.6;}
      else{
        const sp=Math.sqrt(v2);
        const slope=(track(carX+2)-track(carX-2))/4;
        const dirx=1/Math.sqrt(1+slope*slope);
        v=(v>=0?1:-1)*sp;
        carX+=v*dirx/34;
      }
      if(carX>W-24){carX=W-24;v=-Math.abs(v);}
      if(carX<24){carX=24;v=Math.abs(v);}
    }
    /* ground + track */
    ctx.fillStyle='#1c150e';ctx.fillRect(0,ground,W,H-ground);
    ctx.strokeStyle='#3aa8d8';ctx.lineWidth=4;ctx.beginPath();
    for(let x=0;x<=W;x+=3){const y=track(x);x?ctx.lineTo(x,y):ctx.moveTo(x,y);}
    ctx.stroke();
    ctx.strokeStyle='rgba(58,168,216,.18)';ctx.lineWidth=1.4;
    for(let x=14;x<W;x+=26){ctx.beginPath();ctx.moveTo(x,track(x));ctx.lineTo(x,ground);ctx.stroke();}

    /* starting-energy line */
    const lineY=running?track(0)*0+ (ground-startH):(track(carX));
    const hLine=running?ground-startH:track(carX);
    ctx.strokeStyle='rgba(232,195,58,.6)';ctx.setLineDash([6,6]);ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(0,hLine);ctx.lineTo(W,hLine);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='#e8c33a';ctx.font="11px 'Space Mono',monospace";
    ctx.fillText('starting energy — the car can never rise above this',12,hLine-8);

    /* car */
    const cy=track(carX), sl=(track(carX+2)-track(carX-2))/4;
    ctx.save();ctx.translate(carX,cy-10);ctx.rotate(Math.atan(sl));
    ctx.fillStyle=(hot||dragging)?'#ffd08a':'#f5a623';ctx.fillRect(-19,-13,38,19);
    ctx.fillStyle='#241b14';ctx.beginPath();ctx.arc(-11,7,5.5,0,7);ctx.fill();
    ctx.beginPath();ctx.arc(11,7,5.5,0,7);ctx.fill();
    ctx.restore();
    if(!running){ctx.fillStyle='#c0b09c';ctx.font="10px 'Space Mono',monospace";
      ctx.fillText('drag me up the hill',carX-46,cy-32);}

    /* energy bars */
    const PE=m*g*h*9, KE=running?Math.max(0,2*g*(startH-h)*9/2*m):0;
    const TOT=running?m*g*startH*9:PE;
    bars(ctx,30,H-52,W-60,[{v:KE,c:'#f5a623'},{v:PE,c:'#3aa8d8'}],Math.max(TOT,1));
    legend(ctx,30,H-62,[{n:'KE',v:KE,c:'#f5a623'},{n:'PE',v:PE,c:'#3aa8d8'},{n:'TOTAL',v:TOT,c:'#e8c33a'}]);

    const peakH=ground-track(400);
    read.innerHTML= !running
      ? `Start height <b>${Math.round(h)}</b> → stored PE = mgh = <b>${Math.round(PE)}</b>. The big middle hill needs <b>${Math.round(peakH)}</b>. ${h>peakH?'<span class="win">You have enough — release and clear it.</span>':'Not enough yet — drag higher, or release and watch it fail.'}`
      : `PE = <b>${Math.round(PE)}</b> · KE = <b>${Math.round(KE)}</b> · <b>total ${Math.round(TOT)}</b> (unchanging). `+
        (KE<2?`<span class="win">Turning point — all energy back in height, speed zero.</span>`
             :`Height is being traded for speed and back again, but the sum never moves.`);
    requestAnimationFrame(frame);
  }
  frame();
})();

/* ============ SIM 2 · SPRING LAUNCHER ============ */
(function(){
  const cv=document.getElementById('simSpring'),ctx=cv.getContext('2d');
  const W=cv.width,H=cv.height,floor=H-100;
  const read=document.getElementById('springRead');
  /* layout: wall → spring + pad → mass → smooth ramp → bell shelf */
  const wallX=58, restX=200;
  const blockHalf=18, padW=14;
  /* pad right face sits against block left face; pad rest = natural spring end */
  const padRest=restX-blockHalf; /* right edge of pad when spring is free */
  const rampStart=360, rampEnd=700, topY=H*0.20;
  const bellX=rampEnd+36;

  /* Smooth S-curve ramp: flat → gentle rise → flatten at top (no kink). */
  function trackY(x){
    if(x<=rampStart) return floor;
    if(x>=rampEnd) return topY;
    const t=(x-rampStart)/(rampEnd-rampStart);
    const s=0.5-0.5*Math.cos(Math.PI*t);
    return floor+(topY-floor)*s;
  }
  function trackSlope(x){ return (trackY(x+1.5)-trackY(x-1.5))/3; }
  function heightAt(x){ return floor-trackY(x); }

  /* padRight = right face of the pusher pad; bx = block center */
  let k=1, bx=restX, padRight=padRest, v=0, dir=1;
  let state='idle', hot=false, drag=false;
  let maxH=0, rang=false, E0=0;
  /* PE = m g h with m=1, g absorbed into units: PE = height_px (same units as ½kx²) */
  const gEff=1;

  const seg=document.getElementById('kSeg');
  seg.querySelectorAll('button').forEach(b=>b.onclick=()=>{
    seg.querySelectorAll('button').forEach(x=>x.classList.remove('on'));
    b.classList.add('on');k=+b.dataset.k;reset();
  });
  function reset(){
    bx=restX;padRight=padRest;v=0;dir=1;state='idle';
    maxH=0;rang=false;E0=0;drag=false;
  }
  /* Energy units chosen so max height (px) = E / gEff  with gEff=1 → height = E */
  function springEnergy(xComp){ return 0.5*k*xComp*xComp*0.055; }
  function compression(){ return Math.max(0, padRest-padRight); }
  function stickPadToBlock(){ padRight=bx-blockHalf; }
  function maxHeightPx(E){ return E/gEff; }

  function tryLaunch(){
    if(!drag) return;
    if(bx<restX-4){
      stickPadToBlock();
      /* Lock total mechanical energy once — never degrade it later */
      E0=springEnergy(compression());
      v=0;dir=1;maxH=0;rang=false;
      state='push';
    }
    drag=false;
  }

  cv.addEventListener('pointerdown',e=>{
    const p=pos(cv,e), by=trackY(bx);
    if((state==='idle'||state==='push')&&
       (dist(p.x,p.y,bx,by-16)<48||dist(p.x,p.y,padRight-padW/2,floor-22)<36)){
      drag=true;state='idle';v=0;E0=0;
      stickPadToBlock();
      cv.setPointerCapture(e.pointerId);
    }
  });
  cv.addEventListener('pointermove',e=>{
    const p=pos(cv,e), by=trackY(bx);
    hot=dist(p.x,p.y,bx,by-16)<48||dist(p.x,p.y,padRight-padW/2,floor-22)<36;
    if(drag){
      bx=Math.max(wallX+padW+blockHalf+8,Math.min(restX,p.x));
      stickPadToBlock();
    }
  });
  cv.addEventListener('pointerup',tryLaunch);
  cv.addEventListener('pointercancel',tryLaunch);
  cv.addEventListener('lostpointercapture',()=>{ if(drag) tryLaunch(); });
  cv.addEventListener('pointerleave',()=>hot=false);

  function frame(){
    ctx.clearRect(0,0,W,H);

    /* --- physics: strict energy conservation E0 = SP + KE + PE --- */
    if(state==='push'){
      /*
        Pad expands while spring still contacts the mass.
        KE is taken from remaining spring energy (not Euler integration),
        so the launch always carries the full stored ½kx² into free flight.
      */
      const x=compression();
      if(x>0.5){
        const SP=springEnergy(x);
        const KE=Math.max(0,E0-SP);
        v=Math.sqrt(2*KE);
        /* step along the rail; larger when faster, but never rewrite E0 */
        padRight+=Math.max(1.5,v*0.7);
        bx=padRight+blockHalf;
        if(padRight>=padRest){
          padRight=padRest;
          bx=padRight+blockHalf;
          state='fly';dir=1; /* E0 unchanged — full spring store is now KE */
        }
      } else {
        padRight=padRest;
        bx=padRight+blockHalf;
        state='fly';dir=1;
      }
    } else if(state==='fly'){
      /* Free motion: PE = gEff·h, KE = E0 − PE  (exact) */
      const h=heightAt(bx);
      const PE=gEff*h;
      const keLeft=E0-PE;
      const slope=trackSlope(bx);
      const cosT=1/Math.sqrt(1+slope*slope);
      const hMax=maxHeightPx(E0);

      if(keLeft<=0&&dir>0){
        /* Snap to the energy-limited height on the track, then reverse */
        dir=-1;
        /* nudge back down so we don't stick at the apex */
        bx-=2*cosT;
      } else {
        const speed=Math.sqrt(2*Math.max(0,keLeft));
        /* no minimum step — that used to overshoot / undershoot the apex */
        const step=speed*dir*0.65;
        const next=bx+step*cosT;
        /* if next step would climb above energy limit, stop at the limit height */
        if(dir>0&&heightAt(next)>hMax){
          /* binary-search along track for the exact turnaround x */
          let lo=bx, hi=Math.min(next,W-28);
          for(let i=0;i<12;i++){
            const mid=(lo+hi)/2;
            if(heightAt(mid)>hMax) hi=mid; else lo=mid;
          }
          bx=lo;
          dir=-1;
        } else {
          bx=next;
        }
      }
      padRight=padRest;

      if(bx<=restX+2&&dir<0){ bx=restX; v=0; dir=1; state='idle'; E0=0; padRight=padRest; }
      if(bx>W-28){ bx=W-28; dir=-1; }
    } else if(state==='idle'&&!drag){
      padRight=Math.min(padRest, bx-blockHalf);
      if(bx>=restX-0.5){ bx=restX; padRight=padRest; }
    }

    const xComp=compression();
    const SP=(state==='idle'||state==='push')?springEnergy(xComp):0;
    const by=trackY(bx);
    const hNow=heightAt(bx);
    maxH=Math.max(maxH,hNow);
    if(hNow>=heightAt(bellX)-8) rang=true;

    /* ========== DRAW ========== */
    const sky=ctx.createLinearGradient(0,0,0,floor);
    sky.addColorStop(0,'#1a2214');sky.addColorStop(1,'#0e0a06');
    ctx.fillStyle=sky;ctx.fillRect(0,0,W,floor);

    ctx.beginPath();
    ctx.moveTo(0,floor);
    for(let x=0;x<=W;x+=4) ctx.lineTo(x,trackY(x));
    ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.closePath();
    ctx.fillStyle='#1c150e';ctx.fill();

    ctx.beginPath();
    ctx.moveTo(rampStart,floor);
    for(let x=rampStart;x<=rampEnd+80;x+=3) ctx.lineTo(x,trackY(x));
    ctx.lineTo(rampEnd+80,floor);ctx.closePath();
    ctx.fillStyle='rgba(123,192,67,.06)';ctx.fill();

    ctx.strokeStyle='rgba(90,70,48,.55)';ctx.lineWidth=2;
    for(let x=rampStart+40;x<rampEnd+20;x+=48){
      const y=trackY(x);
      if(floor-y<12) continue;
      ctx.beginPath();ctx.moveTo(x,y+2);ctx.lineTo(x,floor);ctx.stroke();
      ctx.beginPath();ctx.moveTo(x-10,floor);ctx.lineTo(x+10,floor);ctx.stroke();
    }

    function strokeTrack(offset,color,lw){
      ctx.strokeStyle=color;ctx.lineWidth=lw;ctx.lineJoin='round';ctx.lineCap='round';
      ctx.beginPath();
      for(let x=0;x<=W;x+=2){
        const y=trackY(x)+offset;
        x?ctx.lineTo(x,y):ctx.moveTo(x,y);
      }
      ctx.stroke();
    }
    strokeTrack(5,'#2a3d1a',6);
    strokeTrack(0,'#7bc043',3.5);
    strokeTrack(-3,'rgba(155,224,90,.35)',1.5);

    ctx.fillStyle='rgba(192,176,156,.45)';ctx.font="10px 'Space Mono',monospace";
    ctx.fillText('launch run', wallX+48, floor+18);
    ctx.fillText('smooth rise', (rampStart+rampEnd)/2-28, floor+18);
    ctx.fillText('top shelf', rampEnd+8, topY+28);

    ctx.strokeStyle='rgba(58,168,216,.35)';ctx.lineWidth=1;ctx.setLineDash([3,4]);
    ctx.beginPath();ctx.moveTo(rampEnd+70,floor);ctx.lineTo(rampEnd+70,topY);ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle='rgba(58,168,216,.7)';ctx.font="10px 'Space Mono',monospace";
    ctx.fillText('h', rampEnd+76, (floor+topY)/2);

    /* Max-height line from the same E used by physics (reaches this line exactly). */
    const peakE=state==='idle'&&xComp>2?springEnergy(xComp):E0;
    if(peakE>1){
      const peakHpx=maxHeightPx(peakE);
      const trackTopH=floor-topY;
      const lineY=floor-peakHpx;
      if(lineY>18&&lineY<floor-4){
        ctx.strokeStyle='rgba(232,195,58,.55)';ctx.setLineDash([5,5]);ctx.lineWidth=1.5;
        ctx.beginPath();ctx.moveTo(restX,lineY);ctx.lineTo(W-20,lineY);ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle='#e8c33a';ctx.font="10px 'Space Mono',monospace";
        const label=peakHpx>trackTopH+2
          ? 'max height from ½kx² (above track — will clear the top)'
          : 'max height from stored ½kx² — mass reaches this line';
        ctx.fillText(label, restX+8, lineY-6);
      }
    }

    /* top platform + bell */
    ctx.fillStyle='#2a2218';ctx.fillRect(rampEnd-8,topY-2,92,8);
    ctx.fillStyle='#46372a';ctx.fillRect(bellX-3,topY-52,6,52);
    ctx.fillStyle=rang?'#e8c33a':'rgba(232,195,58,.4)';
    ctx.beginPath();ctx.arc(bellX,topY-52,15,Math.PI,0);ctx.fill();
    ctx.fillRect(bellX-15,topY-52,30,5);
    ctx.fillStyle=rang?'#e8c33a':'#8a7c66';ctx.font="11px 'Space Mono',monospace";
    ctx.fillText(rang?'DING!':'bell',bellX-16,topY-72);
    if(rang){
      ctx.strokeStyle='rgba(232,195,58,.35)';ctx.lineWidth=2;
      for(let r=20;r<=36;r+=8){ctx.beginPath();ctx.arc(bellX,topY-48,r,1.1,2.1);ctx.stroke();}
    }

    /* launcher wall */
    ctx.fillStyle='#3a2e22';ctx.fillRect(wallX-18,floor-88,18,88);
    ctx.fillStyle='#564536';ctx.fillRect(wallX-18,floor-88,18,10);
    ctx.fillStyle='#7a6a55';
    ctx.beginPath();ctx.arc(wallX-9,floor-70,3,0,7);ctx.fill();
    ctx.beginPath();ctx.arc(wallX-9,floor-40,3,0,7);ctx.fill();

    /* spring coils: wall → left face of pad */
    const springEnd=padRight-padW;
    const span=Math.max(8,springEnd-wallX);
    const coils=Math.max(6,Math.round(10*(span/140)));
    const amp=xComp>4?7+Math.min(7,xComp*0.07):12;
    const springLit=xComp>3||state==='push';
    ctx.strokeStyle=springLit?'#9be05a':'#7bc043';
    ctx.lineWidth=3.2;ctx.lineJoin='round';
    ctx.beginPath();ctx.moveTo(wallX,floor-20);
    for(let i=0;i<=coils;i++){
      const t=i/coils;
      const yOff=(i===0||i===coils)?0:(i%2?-amp:amp);
      ctx.lineTo(wallX+span*t, floor-20+yOff);
    }
    ctx.lineTo(springEnd,floor-20);ctx.stroke();
    ctx.fillStyle='#5a4a38';ctx.fillRect(wallX,floor-28,5,16);

    /* ===== PUSHER PAD (the plate that shoves the mass) ===== */
    const padX=padRight-padW;
    const padY=floor-40;
    /* contact glow while pushing */
    if(state==='push'){
      ctx.fillStyle='rgba(155,224,90,.2)';
      ctx.fillRect(padRight-2,padY-4,10,44);
    }
    /* pad body */
    const padGrad=ctx.createLinearGradient(padX,0,padRight,0);
    padGrad.addColorStop(0,'#5a8f2e');
    padGrad.addColorStop(0.5,'#9be05a');
    padGrad.addColorStop(1,'#6fad38');
    ctx.fillStyle=padGrad;
    ctx.fillRect(padX,padY,padW,36);
    ctx.strokeStyle='#2a3d1a';ctx.lineWidth=2;
    ctx.strokeRect(padX,padY,padW,36);
    /* face plate (rubber bumper against the mass) */
    ctx.fillStyle=state==='push'?'#c8f09a':'#7bc043';
    ctx.fillRect(padRight-4,padY+2,4,32);
    /* pad label */
    ctx.fillStyle='rgba(14,10,6,.55)';ctx.font="8px 'Space Mono',monospace";
    ctx.save();
    ctx.translate(padX+padW/2,padY+18);
    ctx.rotate(-Math.PI/2);
    ctx.fillText('pad',-8,3);
    ctx.restore();

    /* cart / block */
    const slope=trackSlope(bx);
    const ang=Math.atan(slope);
    ctx.save();
    ctx.translate(bx,by);
    ctx.rotate(ang);
    ctx.fillStyle='rgba(0,0,0,.28)';
    ctx.beginPath();ctx.ellipse(0,4,20,5,0,0,7);ctx.fill();
    ctx.fillStyle=(hot||drag)?'#ffd08a':'#f5a623';
    ctx.fillRect(-blockHalf,-30,blockHalf*2,28);
    ctx.strokeStyle='#241b14';ctx.lineWidth=2;ctx.strokeRect(-blockHalf,-30,blockHalf*2,28);
    ctx.fillStyle='rgba(36,27,20,.25)';ctx.fillRect(-blockHalf,-30,blockHalf*2,7);
    ctx.fillStyle='#241b14';
    ctx.beginPath();ctx.arc(-10,2,5,0,7);ctx.fill();
    ctx.beginPath();ctx.arc(10,2,5,0,7);ctx.fill();
    ctx.fillStyle='#c0b09c';
    ctx.beginPath();ctx.arc(-10,2,2,0,7);ctx.fill();
    ctx.beginPath();ctx.arc(10,2,2,0,7);ctx.fill();
    ctx.restore();

    if(state==='idle'&&xComp<3){
      ctx.fillStyle='#c0b09c';ctx.font="10px 'Space Mono',monospace";
      ctx.fillText('drag me left to load',bx-54,by-42);
      ctx.strokeStyle='rgba(192,176,156,.55)';ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(bx-22,by-22);ctx.lineTo(bx-48,by-22);ctx.stroke();
      ctx.beginPath();ctx.moveTo(bx-48,by-22);ctx.lineTo(bx-42,by-27);ctx.lineTo(bx-42,by-17);ctx.closePath();
      ctx.fillStyle='rgba(192,176,156,.55)';ctx.fill();
    }
    if(state==='push'){
      ctx.fillStyle='#9be05a';ctx.font="10px 'Space Mono',monospace";
      ctx.fillText('pad pushing →', padRight+6, floor-48);
    }

    /* compression bracket while loading */
    if(state==='idle'&&xComp>4){
      ctx.strokeStyle='rgba(155,224,90,.7)';ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(bx,floor+8);ctx.lineTo(bx,floor+22);
      ctx.moveTo(restX,floor+8);ctx.lineTo(restX,floor+22);
      ctx.moveTo(bx,floor+15);ctx.lineTo(restX,floor+15);ctx.stroke();
      ctx.fillStyle='#9be05a';ctx.font="10px 'Space Mono',monospace";
      ctx.fillText('x = '+Math.round(xComp), (bx+restX)/2-16, floor+36);
    }

    /* energies: SP + KE + PE = E0 (or SP while idle) */
    const PE=gEff*hNow;
    let KE=0;
    if(state==='push') KE=Math.max(0,E0-SP);
    else if(state==='fly') KE=Math.max(0,E0-PE);
    const TOT=Math.max(SP+KE+PE, E0, 1);
    bars(ctx,30,H-52,W-60,[{v:SP,c:'#7bc043'},{v:KE,c:'#f5a623'},{v:PE,c:'#3aa8d8'}],TOT);
    legend(ctx,30,H-62,[{n:'spring',v:SP,c:'#7bc043'},{n:'KE',v:KE,c:'#f5a623'},{n:'PE',v:PE,c:'#3aa8d8'}]);

    read.innerHTML= state==='idle'&&xComp>2
      ? `Compressed x = <b>${Math.round(xComp)}</b> with k = <b>${k}</b> → stored E = ½kx² = <b>${Math.round(SP)}</b> → max height <b>${Math.round(maxHeightPx(SP))}</b>. `+
        `<span class="win">Let go — the pad will shove the mass as the spring expands.</span>`
      : state==='idle'
      ? `Drag the block left to compress the spring. The green <b>pad</b> stays against the mass and will push it on release.`
      : state==='push'
      ? `Pad pushing · spring E = <b>${Math.round(SP)}</b> → KE = <b>${Math.round(KE)}</b> · total <b>${Math.round(E0)}</b> conserved.`
      : `Launch · KE = <b>${Math.round(KE)}</b> · PE = <b>${Math.round(PE)}</b> · peak height <b>${Math.round(maxH)}</b> / max <b>${Math.round(maxHeightPx(E0))}</b>. `+
        (rang?`<span class="win">Bell rung — the spring's store became speed, then height.</span>`
             :(Math.abs(maxH-maxHeightPx(E0))<6?`<span class="win">Reached the energy limit — all KE is PE at the turn.</span>`
               :`Pad finished its push; mass coasts on conserved energy.`));
    requestAnimationFrame(frame);
  }
  frame();
})();

/* ============ SIM 3 · ENERGY SKATEPARK ============ */
(function(){
  const cv=document.getElementById('simSkate'),ctx=cv.getContext('2d');
  const W=cv.width,H=cv.height;
  const read=document.getElementById('skateRead');
  const cx=W/2, floorY=H-104;
  /* half-pipe: rises at both edges */
  const yy=x=>floorY-0.0024*Math.pow(x-cx,2);
  let sx=cx-230, v=0, mu=0, run=false, hot=false, drag=false, thermal=0, startH=0;
  const seg=document.getElementById('fricSeg');
  seg.querySelectorAll('button').forEach(b=>b.onclick=()=>{seg.querySelectorAll('button').forEach(x=>x.classList.remove('on'));b.classList.add('on');mu=+b.dataset.f;thermal=0;});

  cv.addEventListener('pointerdown',e=>{const p=pos(cv,e);
    if(dist(p.x,p.y,sx,yy(sx)-16)<42){drag=true;run=false;v=0;cv.setPointerCapture(e.pointerId);}});
  cv.addEventListener('pointermove',e=>{const p=pos(cv,e);
    hot=dist(p.x,p.y,sx,yy(sx)-16)<42;
    if(drag)sx=Math.max(cx-260,Math.min(cx+260,p.x));});
  cv.addEventListener('pointerup',()=>{if(drag){run=true;thermal=0;startH=floorY-yy(sx);}drag=false;});
  cv.addEventListener('pointerleave',()=>hot=false);

  const g=0.5;
  function frame(){
    ctx.clearRect(0,0,W,H);
    const h=floorY-yy(sx);
    if(run){
      const slope=(yy(sx+2)-yy(sx-2))/4;
      const a=g*slope/(1+slope*slope);      /* screen y is down: downhill = +g·dy/dx */
      v+=a;
      if(mu>0&&Math.abs(v)>0.05){
        const fr=mu*g*0.9*Math.sign(v);
        v-=fr;
        thermal+=Math.abs(fr)*Math.abs(v)*2.2;
      }
      sx+=v;
      if(sx<cx-262){sx=cx-262;v=Math.abs(v)*0.6;}
      if(sx>cx+262){sx=cx+262;v=-Math.abs(v)*0.6;}
      if(Math.abs(v)<0.04&&Math.abs(h)<6)v=0;
    }
    /* pipe */
    ctx.strokeStyle='#8a7c66';ctx.lineWidth=5;ctx.beginPath();
    for(let x=cx-280;x<=cx+280;x+=4){const y=yy(x);x===cx-280?ctx.moveTo(x,y):ctx.lineTo(x,y);}
    ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,.03)';ctx.beginPath();
    ctx.moveTo(cx-280,yy(cx-280));
    for(let x=cx-280;x<=cx+280;x+=4)ctx.lineTo(x,yy(x));
    ctx.lineTo(cx+280,H);ctx.lineTo(cx-280,H);ctx.closePath();ctx.fill();

    /* start-height line */
    if(run){
      ctx.strokeStyle='rgba(232,195,58,.45)';ctx.setLineDash([6,6]);ctx.lineWidth=2;
      const yl=floorY-startH;
      ctx.beginPath();ctx.moveTo(cx-290,yl);ctx.lineTo(cx+290,yl);ctx.stroke();ctx.setLineDash([]);
      ctx.fillStyle='rgba(232,195,58,.8)';ctx.font="10px 'Space Mono',monospace";
      ctx.fillText('release height',cx+200,yl-6);
    }
    /* skater */
    const y=yy(sx), slope=(yy(sx+2)-yy(sx-2))/4;
    ctx.save();ctx.translate(sx,y);ctx.rotate(Math.atan(slope));
    ctx.strokeStyle=(hot||drag)?'#ffd08a':'#e8e0d4';ctx.lineWidth=3;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(0,-10);ctx.lineTo(0,-30);ctx.stroke();      // body
    ctx.beginPath();ctx.arc(0,-38,8,0,7);ctx.strokeStyle=(hot||drag)?'#ffd08a':'#e8e0d4';ctx.stroke();
    ctx.beginPath();ctx.moveTo(-9,-2);ctx.lineTo(0,-10);ctx.lineTo(9,-2);ctx.stroke();
    ctx.lineCap='butt';
    ctx.fillStyle='#f5a623';ctx.fillRect(-15,-2,30,4);
    ctx.fillStyle='#241b14';ctx.beginPath();ctx.arc(-9,4,3.5,0,7);ctx.fill();
    ctx.beginPath();ctx.arc(9,4,3.5,0,7);ctx.fill();
    ctx.restore();
    if(!run){ctx.fillStyle='#c0b09c';ctx.font="10px 'Space Mono',monospace";
      ctx.fillText('drag up the wall & release',sx-64,y-58);}

    /* energies */
    const PE=h*1.4, KE=0.5*Math.pow(v*6,2)*0.5;
    const TOT=Math.max(PE+KE+thermal,1);
    bars(ctx,30,H-52,W-60,[{v:KE,c:'#f5a623'},{v:PE,c:'#3aa8d8'},{v:thermal,c:'#e04f3d'}],TOT);
    legend(ctx,30,H-62,[{n:'KE',v:KE,c:'#f5a623'},{n:'PE',v:PE,c:'#3aa8d8'},{n:'thermal',v:thermal,c:'#e04f3d'},{n:'TOTAL',v:TOT,c:'#e8c33a'}]);

    read.innerHTML= mu===0
      ? (run?`Frictionless: mechanical energy is perfectly conserved — <span class="win">she returns to exactly the release height, forever.</span> KE=<b>${Math.round(KE)}</b> ⇄ PE=<b>${Math.round(PE)}</b>.`
            :`Frictionless track. Drag the skater up a wall and release — she will return to precisely that height on the far side.`)
      : `μ = <b>${mu}</b> · KE=<b>${Math.round(KE)}</b> · PE=<b>${Math.round(PE)}</b> · <span style="color:#ff9b8b">thermal=<b>${Math.round(thermal)}</b></span>. `+
        `<span class="win">Each pass falls short — but the total bar doesn't shrink.</span> The ride is being converted into warmth in the track, exactly joule for joule.`;
    requestAnimationFrame(frame);
  }
  frame();
})();

/* ============ SIM 4 · CAPSTONE · POWER CHALLENGE ============ */
(function(){
  const cv=document.getElementById('simPower'),ctx=cv.getContext('2d');
  const W=cv.width,H=cv.height;
  const read=document.getElementById('powerRead'),hintEl=document.getElementById('powerHint');
  const floorY=H-70, pulleyY=64, ropeX=W*0.30;
  let m=20, crateY=floorY-40, work=0, power=0, peakPower=0, sustain=0;
  let grab=false,hot=false,lastY=0,lastT=0;
  const g=9.81, PXM=0.02;                      // 1 px = 0.02 m
  let mission='work';
  const done={work:false,power:false,horse:false};
  const MIS={
    work:'① Haul the crate upward until you have done 500 J of work. W = mgh — a heavier crate banks joules faster per metre, but is harder to move.',
    power:'② Now do it FAST. Keep your power output above 200 W for a full second — same joules, less time.',
    horse:'③ Out-power a horse: hit a peak above 746 W, even for an instant. Try the heavy crate and a sharp, fast pull.'
  };
  const missBtns=document.getElementById('missions');
  missBtns.querySelectorAll('button').forEach(b=>b.onclick=()=>{missBtns.querySelectorAll('button').forEach(x=>x.classList.remove('on'));b.classList.add('on');
    mission=b.dataset.m;hintEl.innerHTML=`<span class="h">${MIS[mission]}</span>`;});
  hintEl.innerHTML=`<span class="h">${MIS.work}</span>`;
  const mSeg=document.getElementById('massSeg');
  mSeg.querySelectorAll('button').forEach(b=>b.onclick=()=>{mSeg.querySelectorAll('button').forEach(x=>x.classList.remove('on'));b.classList.add('on');m=+b.dataset.m;});
  document.getElementById('powerReset').onclick=()=>{work=0;power=0;peakPower=0;sustain=0;crateY=floorY-40;
    done[mission]=false;const b=missBtns.querySelector(`[data-m="${mission}"]`);if(b)b.classList.remove('done');};

  function handleY(){return crateY-4;}
  cv.addEventListener('pointerdown',e=>{const p=pos(cv,e);
    if(dist(p.x,p.y,ropeX,handleY())<48){grab=true;lastY=p.y;lastT=performance.now();cv.setPointerCapture(e.pointerId);}});
  cv.addEventListener('pointermove',e=>{const p=pos(cv,e);hot=dist(p.x,p.y,handleY&&handleY(),0)<0||dist(p.x,p.y,ropeX,handleY())<48;
    if(grab){
      const ny=Math.max(pulleyY+50,Math.min(floorY-40,p.y));
      const dy=crateY-ny;                       // upward positive (px)
      if(dy>0){
        const dW=m*g*dy*PXM;
        work+=dW;
        const now=performance.now(),dt=Math.max(0.008,(now-lastT)/1000);
        power=dW/dt;
        peakPower=Math.max(peakPower,power);
      }
      crateY=ny;lastT=performance.now();lastY=p.y;
    }});
  cv.addEventListener('pointerup',()=>{grab=false;power=0;});
  cv.addEventListener('pointerleave',()=>hot=false);

  const ptrace=[];
  function frame(){
    ctx.clearRect(0,0,W,H);
    if(!grab)power*=0.90;
    ptrace.push(power);if(ptrace.length>280)ptrace.shift();
    if(power>200)sustain+=1/60;else sustain=Math.max(0,sustain-1/40);

    /* floor + beam */
    ctx.fillStyle='#1c150e';ctx.fillRect(0,floorY,W,H-floorY);
    ctx.fillStyle='#46372a';ctx.fillRect(0,pulleyY-22,W*0.52,14);
    /* pulley */
    ctx.fillStyle='#8a7c66';ctx.beginPath();ctx.arc(ropeX,pulleyY,18,0,7);ctx.fill();
    ctx.fillStyle='#241b14';ctx.beginPath();ctx.arc(ropeX,pulleyY,6,0,7);ctx.fill();
    /* rope */
    ctx.strokeStyle='#c9a06a';ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(ropeX-18,pulleyY);ctx.lineTo(ropeX-18,crateY);ctx.stroke();
    ctx.beginPath();ctx.moveTo(ropeX+18,pulleyY);ctx.lineTo(ropeX+18,handleY()+26);ctx.stroke();
    /* handle */
    ctx.fillStyle=(hot||grab)?'#ffd08a':'#e8c33a';
    ctx.fillRect(ropeX+6,handleY()+26,24,10);
    ctx.fillStyle='#c0b09c';ctx.font="10px 'Space Mono',monospace";
    ctx.fillText('drag ⇕ haul',ropeX+36,handleY()+34);
    /* crate */
    const size=m===20?46:60;
    ctx.fillStyle='#a5762f';ctx.fillRect(ropeX-18-size/2,crateY,size,size*0.78);
    ctx.strokeStyle='#5c3f14';ctx.lineWidth=2;ctx.strokeRect(ropeX-18-size/2,crateY,size,size*0.78);
    ctx.fillStyle='#e8dcc8';ctx.font="12px 'Space Mono',monospace";
    ctx.fillText(m+' kg',ropeX-18-16,crateY+size*0.48);
    /* height marker */
    const h=(floorY-40-crateY)*PXM;
    ctx.strokeStyle='rgba(58,168,216,.4)';ctx.setLineDash([4,5]);ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(ropeX-90,crateY);ctx.lineTo(ropeX-90,floorY-40);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='#3aa8d8';ctx.font="11px 'Space Mono',monospace";
    ctx.fillText('h = '+h.toFixed(2)+' m',ropeX-146,(crateY+floorY-40)/2);

    /* power graph */
    const gx=W*0.58,gy=90,gw=W*0.36,gh=140;
    ctx.fillStyle='rgba(255,255,255,.04)';ctx.fillRect(gx,gy,gw,gh);
    ctx.strokeStyle='rgba(255,255,255,.14)';ctx.lineWidth=1;ctx.strokeRect(gx,gy,gw,gh);
    [[746,'#e04f3d','1 horsepower'],[200,'#f5a623','200 W']].forEach(([v,c,lab])=>{
      const y=gy+gh-Math.min(gh,v/1100*gh);
      ctx.strokeStyle=c;ctx.setLineDash([3,4]);ctx.lineWidth=1.4;
      ctx.beginPath();ctx.moveTo(gx,y);ctx.lineTo(gx+gw,y);ctx.stroke();ctx.setLineDash([]);
      ctx.fillStyle=c;ctx.font="9px 'Space Mono',monospace";ctx.fillText(lab,gx+4,y-4);
    });
    ctx.strokeStyle='#5be08a';ctx.lineWidth=2;ctx.beginPath();
    ptrace.forEach((p,i)=>{const x=gx+gw*i/280, y=gy+gh-Math.min(gh-2,p/1100*gh);
      i?ctx.lineTo(x,y):ctx.moveTo(x,y);});
    ctx.stroke();
    ctx.fillStyle='#b8a692';ctx.font="10px 'Space Mono',monospace";ctx.fillText('power output (W)',gx,gy-6);

    /* work bar */
    ctx.fillStyle='rgba(255,255,255,.08)';ctx.fillRect(gx,gy+gh+26,gw,14);
    ctx.fillStyle='#3aa8d8';ctx.fillRect(gx,gy+gh+26,Math.min(gw,work/500*gw),14);
    ctx.fillStyle='#b8a692';ctx.font="10px 'Space Mono',monospace";
    ctx.fillText('work done: '+work.toFixed(0)+' J  / 500 J',gx,gy+gh+20);

    /* detection */
    if(mission==='work'&&work>=500)done.work=true;
    if(mission==='power'&&sustain>=1)done.power=true;
    if(mission==='horse'&&peakPower>746)done.horse=true;
    Object.keys(done).forEach(k=>{if(done[k]){const b=missBtns.querySelector(`[data-m="${k}"]`);if(b)b.classList.add('done');}});
    const all=done.work&&done.power&&done.horse;

    let msg;
    if(all)msg=`<span class="win">🏆 All three met — you understand the difference between work and power!</span> Same joules, different seconds. P = W/t is what every engine is actually sold on.`;
    else if(mission==='work')msg=done.work?`<span class="win">500 J done.</span> W = mgh = ${m}×9.81×${h.toFixed(2)} per lift — it doesn't matter how long you took.`
      :`Work so far <b>${work.toFixed(0)} J</b> of 500. Current power <b>${power.toFixed(0)} W</b>. Keep hauling — speed is irrelevant for this one.`;
    else if(mission==='power')msg=done.power?`<span class="win">Held above 200 W for a full second.</span> Same work as before, but delivered far faster.`
      :`Power now <b>${power.toFixed(0)} W</b> (need >200 W held for 1 s — currently ${sustain.toFixed(1)} s). Haul in fast, smooth pulls.`;
    else msg=done.horse?`<span class="win">Peak ${peakPower.toFixed(0)} W — you beat a horse!</span> Briefly. Watt's horse could sustain it all day.`
      :`Peak so far <b>${peakPower.toFixed(0)} W</b> (need 746 W). Switch to the 40 kg crate and pull as fast as you possibly can.`;
    read.innerHTML=msg;
    requestAnimationFrame(frame);
  }
  frame();
})();

/* ============ SIM 5 · HYDROELECTRIC PLANT + BULB LOAD ============ */
(function(){
  const cv=document.getElementById('simHydro'),ctx=cv.getContext('2d');
  const W=cv.width,H=cv.height;
  const read=document.getElementById('hydroRead');
  const gateBtn=document.getElementById('hydroGate');

  /* layout */
  const damX=280, floorY=H-70, resLeft=24, resRight=damX;
  const waterMinY=floorY-40, waterMaxY=80;
  let headFrac=0.70;                          // 0..1 → water surface height
  let gateOpen=false, gateAnim=0;             // gateAnim 0 closed → 1 open
  let loadW=100;                              // bulb rating watts
  let spin=0, genGlow=0;
  const drops=[];                             // penstock particles
  const eta=0.78, rho=1000, g=9.81;
  /* scale: headFrac maps to head metres 10–80 m; gate flow to m³/s */
  function headM(){return 10+headFrac*70;}
  function waterY(){return waterMaxY+(1-headFrac)*(waterMinY-waterMaxY);}
  function maxQ(){return 0.35+headFrac*1.1;}  // m³/s at full open (toy scale)
  function flowQ(){return gateAnim*maxQ();}
  function powerW(){
    /* P = η ρ g h Q  — toy-scaled so medium head + open gate ≈ 80–140 W */
    const raw=eta*rho*g*headM()*flowQ();
    return raw*0.00018;                       // display watts for bulb
  }

  gateBtn.onclick=()=>{
    gateOpen=!gateOpen;
    gateBtn.textContent=gateOpen?'Close gate':'Open gate';
    gateBtn.classList.toggle('off',gateOpen);
  };
  document.getElementById('headSeg').querySelectorAll('button').forEach(b=>{
    b.onclick=()=>{
      document.getElementById('headSeg').querySelectorAll('button').forEach(x=>x.classList.remove('on'));
      b.classList.add('on');headFrac=+b.dataset.h;
    };
  });
  document.getElementById('loadSeg').querySelectorAll('button').forEach(b=>{
    b.onclick=()=>{
      document.getElementById('loadSeg').querySelectorAll('button').forEach(x=>x.classList.remove('on'));
      b.classList.add('on');loadW=+b.dataset.l;
    };
  });

  /* drag water surface */
  let dragWater=false, hotWater=false;
  cv.addEventListener('pointerdown',e=>{
    const p=pos(cv,e), wy=waterY();
    if(p.x>resLeft&&p.x<damX-8&&Math.abs(p.y-wy)<28){
      dragWater=true;cv.setPointerCapture(e.pointerId);
    }
  });
  cv.addEventListener('pointermove',e=>{
    const p=pos(cv,e), wy=waterY();
    hotWater=p.x>resLeft&&p.x<damX-8&&Math.abs(p.y-wy)<28;
    if(dragWater){
      headFrac=1-Math.max(0,Math.min(1,(p.y-waterMaxY)/(waterMinY-waterMaxY)));
      document.getElementById('headSeg').querySelectorAll('button').forEach(b=>{
        b.classList.toggle('on',Math.abs(+b.dataset.h-headFrac)<0.12);
      });
    }
  });
  cv.addEventListener('pointerup',()=>dragWater=false);
  cv.addEventListener('pointerleave',()=>hotWater=false);

  function frame(){
    ctx.clearRect(0,0,W,H);
    gateAnim+=((gateOpen?1:0)-gateAnim)*0.08;
    if(Math.abs(gateAnim-(gateOpen?1:0))<0.002)gateAnim=gateOpen?1:0;

    const P=powerW();
    const lit=P>=loadW*0.92;                  // needs ~rating to light fully
    const bright=Math.max(0,Math.min(1,P/loadW));
    spin+=gateAnim*(0.08+headFrac*0.14);
    genGlow+=(bright-genGlow)*0.12;

    const wy=waterY();
    const turbX=damX+150, turbY=floorY-52;
    const genX=turbX+110, genY=turbY;
    const bulbX=genX+150, bulbY=floorY-120;

    /* sky wash */
    const sky=ctx.createLinearGradient(0,0,0,floorY);
    sky.addColorStop(0,'#1a2838');sky.addColorStop(1,'#0e0a06');
    ctx.fillStyle=sky;ctx.fillRect(0,0,W,floorY);

    /* distant hills */
    ctx.fillStyle='#1a2218';
    ctx.beginPath();ctx.moveTo(0,floorY);ctx.lineTo(0,floorY-40);
    ctx.quadraticCurveTo(W*0.35,floorY-90,W,floorY-30);ctx.lineTo(W,floorY);ctx.fill();

    /* reservoir water body */
    ctx.fillStyle='#1a5f8a';
    ctx.fillRect(resLeft,wy,damX-resLeft,floorY-wy);
    /* water surface shimmer */
    ctx.strokeStyle=hotWater||dragWater?'#7ec8f0':'#3aa8d8';ctx.lineWidth=2.5;
    ctx.beginPath();
    for(let x=resLeft;x<=damX;x+=6){
      const y=wy+Math.sin(x*0.08+spin*3)*1.6*(0.4+gateAnim*0.6);
      x===resLeft?ctx.moveTo(x,y):ctx.lineTo(x,y);
    }
    ctx.stroke();
    /* surface label */
    ctx.fillStyle='#7ec8f0';ctx.font="11px 'Space Mono',monospace";
    ctx.fillText('drag water · head h = '+headM().toFixed(0)+' m',resLeft+8,wy-10);

    /* dam wall */
    ctx.fillStyle='#4a4036';
    ctx.beginPath();
    ctx.moveTo(damX-18,60);ctx.lineTo(damX+28,floorY);ctx.lineTo(damX-40,floorY);ctx.lineTo(damX-18,60);
    ctx.fill();
    ctx.fillStyle='#5c5248';
    ctx.fillRect(damX-22,60,14,floorY-60);
    /* dam crest */
    ctx.fillStyle='#6a6054';ctx.fillRect(damX-30,54,40,12);

    /* gate on dam face */
    const gateTop=floorY-95, gateH=48, gateOpenPx=gateAnim*36;
    ctx.fillStyle='#2a2420';ctx.fillRect(damX-8,gateTop,18,gateH);
    ctx.fillStyle='#8a7c66';ctx.fillRect(damX-6,gateTop+gateH-gateOpenPx-6,14,6);
    ctx.fillStyle='#e8c33a';ctx.font="10px 'Space Mono',monospace";
    ctx.fillText(gateOpen?'GATE OPEN':'GATE SHUT',damX-52,gateTop-8);

    /* penstock pipe */
    ctx.strokeStyle='#6a6054';ctx.lineWidth=16;ctx.lineCap='round';
    ctx.beginPath();
    ctx.moveTo(damX+6,gateTop+gateH*0.55);
    ctx.quadraticCurveTo(damX+70,gateTop+gateH*0.55,turbX-40,turbY);
    ctx.lineTo(turbX-8,turbY);
    ctx.stroke();
    ctx.strokeStyle='#3d3830';ctx.lineWidth=10;
    ctx.beginPath();
    ctx.moveTo(damX+6,gateTop+gateH*0.55);
    ctx.quadraticCurveTo(damX+70,gateTop+gateH*0.55,turbX-40,turbY);
    ctx.lineTo(turbX-8,turbY);
    ctx.stroke();
    ctx.lineCap='butt';

    /* water drops in penstock */
    if(gateAnim>0.05){
      for(let i=0;i<2;i++){
        if(Math.random()<gateAnim*0.7)drops.push({t:0});
      }
    }
    for(let i=drops.length-1;i>=0;i--){
      const d=drops[i];d.t+=0.025+gateAnim*0.02;
      if(d.t>1){drops.splice(i,1);continue;}
      const t=d.t;
      /* sample quadratic path */
      const x0=damX+6,y0=gateTop+gateH*0.55,x1=damX+70,y1=y0,x2=turbX-8,y2=turbY;
      const u=1-t;
      const x=u*u*x0+2*u*t*x1+t*t*x2;
      const y=u*u*y0+2*u*t*y1+t*t*y2;
      ctx.fillStyle='rgba(58,168,216,'+(0.4+0.5*gateAnim)+')';
      ctx.beginPath();ctx.arc(x,y,3.2,0,7);ctx.fill();
    }

    /* turbine housing */
    ctx.fillStyle='#3a342c';
    ctx.beginPath();ctx.arc(turbX,turbY,42,0,7);ctx.fill();
    ctx.strokeStyle='#6a6054';ctx.lineWidth=3;ctx.stroke();
    ctx.fillStyle='#241b14';
    ctx.beginPath();ctx.arc(turbX,turbY,28,0,7);ctx.fill();
    /* blades */
    ctx.save();ctx.translate(turbX,turbY);ctx.rotate(spin);
    for(let i=0;i<6;i++){
      ctx.rotate(Math.PI/3);
      ctx.fillStyle=i%2?'#3aa8d8':'#5bc0eb';
      ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(8,-6);ctx.lineTo(26,0);ctx.lineTo(8,6);ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle='#e8c33a';ctx.beginPath();ctx.arc(turbX,turbY,6,0,7);ctx.fill();
    ctx.fillStyle='#b8a692';ctx.font="11px 'Space Mono',monospace";
    ctx.fillText('turbine',turbX-24,turbY+58);

    /* tailrace splash */
    if(gateAnim>0.1){
      ctx.fillStyle='rgba(58,168,216,0.35)';
      for(let i=0;i<5;i++){
        const sx=turbX-10+i*8+Math.sin(spin*4+i)*3;
        const sy=floorY-8-Math.abs(Math.sin(spin*3+i*0.7))*10*gateAnim;
        ctx.beginPath();ctx.arc(sx,sy,2.5,0,7);ctx.fill();
      }
    }

    /* shaft to generator */
    ctx.strokeStyle='#8a7c66';ctx.lineWidth=5;
    ctx.beginPath();ctx.moveTo(turbX+42,turbY);ctx.lineTo(genX-36,genY);ctx.stroke();

    /* generator */
    ctx.fillStyle='#2a3830';
    ctx.fillRect(genX-36,genY-32,72,64);
    ctx.strokeStyle='#5be08a';ctx.lineWidth=2;ctx.strokeRect(genX-36,genY-32,72,64);
    /* coils glow */
    const gAlpha=0.15+genGlow*0.55;
    ctx.fillStyle=`rgba(91,224,138,${gAlpha})`;
    for(let i=0;i<4;i++){
      ctx.fillRect(genX-26+i*16,genY-22,10,44);
    }
    ctx.fillStyle='#5be08a';ctx.font="11px 'Space Mono',monospace";
    ctx.fillText('generator',genX-30,genY+48);
    ctx.fillStyle='#c0b09c';ctx.font="10px 'Space Mono',monospace";
    ctx.fillText(P.toFixed(0)+' W',genX-14,genY+4);

    /* power line to bulb */
    ctx.strokeStyle=lit?`rgba(232,195,58,${0.4+bright*0.6})`:'#46372a';
    ctx.lineWidth=2.5;ctx.setLineDash([4,4]);
    ctx.beginPath();ctx.moveTo(genX+36,genY-10);ctx.lineTo(bulbX-28,bulbY+20);ctx.stroke();
    ctx.setLineDash([]);

    /* bulb load */
    /* glow halo */
    if(bright>0.05){
      const grd=ctx.createRadialGradient(bulbX,bulbY,4,bulbX,bulbY,50+bright*40);
      grd.addColorStop(0,`rgba(255,230,120,${0.55*bright})`);
      grd.addColorStop(0.4,`rgba(232,195,58,${0.22*bright})`);
      grd.addColorStop(1,'rgba(232,195,58,0)');
      ctx.fillStyle=grd;ctx.beginPath();ctx.arc(bulbX,bulbY,55+bright*40,0,7);ctx.fill();
    }
    /* glass */
    const glass=bright>0.15
      ? `rgb(${200+55*bright|0},${180+50*bright|0},${80+40*bright|0})`
      : '#4a4036';
    ctx.fillStyle=glass;
    ctx.beginPath();ctx.ellipse(bulbX,bulbY,22,28,0,0,7);ctx.fill();
    ctx.strokeStyle=bright>0.3?'#ffe88a':'#6a6054';ctx.lineWidth=2;ctx.stroke();
    /* filament */
    ctx.strokeStyle=bright>0.2?`rgba(255,${120+100*bright|0},40,${0.5+bright*0.5})`:'#3a3028';
    ctx.lineWidth=1.8;
    ctx.beginPath();
    ctx.moveTo(bulbX-8,bulbY+6);ctx.lineTo(bulbX-4,bulbY-8);
    ctx.lineTo(bulbX,bulbY+4);ctx.lineTo(bulbX+4,bulbY-8);ctx.lineTo(bulbX+8,bulbY+6);
    ctx.stroke();
    /* base */
    ctx.fillStyle='#3a342c';ctx.fillRect(bulbX-12,bulbY+26,24,14);
    ctx.fillStyle='#6a6054';ctx.fillRect(bulbX-10,bulbY+40,20,8);
    ctx.fillStyle='#e8c33a';ctx.font="12px 'Space Mono',monospace";
    ctx.fillText(loadW+' W load',bulbX-28,bulbY+68);
    ctx.fillStyle=lit?'#5be08a':'#9a8a76';ctx.font="11px 'Space Mono',monospace";
    ctx.fillText(lit?'● LIT':'○ dark',bulbX-16,bulbY+84);

    /* floor / river downstream */
    ctx.fillStyle='#1c150e';ctx.fillRect(0,floorY,W,H-floorY);
    ctx.fillStyle='#1a4a62';ctx.fillRect(damX-40,floorY,W-damX+40,14);
    /* small waves */
    ctx.strokeStyle='rgba(58,168,216,.35)';ctx.lineWidth=1.2;
    for(let x=damX;x<W;x+=28){
      ctx.beginPath();
      ctx.moveTo(x,floorY+6);ctx.quadraticCurveTo(x+10,floorY+2+Math.sin(spin+x)*2,x+20,floorY+6);
      ctx.stroke();
    }

    /* energy flow bars: PE store → flow KE → electrical → light */
    const peBar=headFrac*100;
    const keBar=gateAnim*headFrac*100;
    const elBar=Math.min(100,P);
    const lightBar=Math.min(100,bright*100);
    const items=[
      {v:peBar,c:'#3aa8d8',n:'PE (head)'},
      {v:keBar,c:'#7bc043',n:'flow'},
      {v:elBar,c:'#5be08a',n:'electrical'},
      {v:lightBar,c:'#e8c33a',n:'light'}
    ];
    bars(ctx,24,H-48,W-48,items,Math.max(100,peBar));
    legend(ctx,24,H-58,items);

    /* equation chip */
    ctx.fillStyle='rgba(0,0,0,.35)';
    ctx.fillRect(W-250,16,230,52);
    ctx.strokeStyle='rgba(232,195,58,.35)';ctx.strokeRect(W-250,16,230,52);
    ctx.fillStyle='#e8c33a';ctx.font="12px 'Space Mono',monospace";
    ctx.fillText('P = η ρ g h Q',W-238,36);
    ctx.fillStyle='#c0b09c';ctx.font="11px 'Space Mono',monospace";
    ctx.fillText('h='+headM().toFixed(0)+' m  Q='+flowQ().toFixed(2)+' m³/s',W-238,54);

    /* readout */
    let msg;
    if(!gateOpen&&gateAnim<0.05){
      msg=`Reservoir head <b>${headM().toFixed(0)} m</b> · PE banked, waiting. Open the gate to trade height for flow. Bulb needs <b>${loadW} W</b>.`;
    }else if(lit){
      msg=`<span class="win">Bulb lit — ${P.toFixed(0)} W generated ≥ ${loadW} W load.</span> `+
        `PE → KE (penstock) → turbine → generator → light. ηρghQ = <b>${P.toFixed(0)} W</b>. `+
        (P>loadW*1.4?'Plenty of head and flow — try a heavier bulb.':'Just enough power for this filament.');
    }else{
      msg=`Generating <b>${P.toFixed(0)} W</b> but the <b>${loadW} W</b> bulb stays dark (need ~${loadW} W). `+
        `Raise the head, keep the gate open, or switch to a smaller load. Flow Q = <b>${flowQ().toFixed(2)}</b> m³/s.`;
    }
    read.innerHTML=msg;
    requestAnimationFrame(frame);
  }
  frame();
})();
