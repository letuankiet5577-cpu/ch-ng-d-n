  // ===================== Drawing: world tiles + objects =====================
  function grassColor(v){
    const baseG = 68 + (v % 55);
    const baseR = 14 + (v % 16);
    const baseB = 16 + (v % 14);
    return `rgb(${baseR},${baseG},${baseB})`;
  }
  function drawWorldTile(tx,ty,t,v,time){
    const px = tx*TILE, py = ty*TILE;

    if (t === WT.GRASS){
      ctx.fillStyle = grassColor(v);
      ctx.fillRect(px,py,TILE,TILE);

      const n = 4 + (v % 5);
      ctx.globalAlpha = 0.12;
      for (let i=0;i<n;i++){
        const sx = px + ((v + i*37) % TILE);
        const sy = py + ((v*3 + i*29) % TILE);
        ctx.fillStyle = (i%2===0) ? "#08110b" : "#143a1f";
        ctx.fillRect(sx, sy, 2, 2);
      }
      ctx.globalAlpha = 1;

      ctx.globalAlpha = 0.08;
      ctx.fillStyle = "#000";
      ctx.fillRect(px, py, TILE, 1);
      ctx.fillRect(px, py, 1, TILE);
      ctx.globalAlpha = 1;
      return;
    }

    if (t === WT.RIVER){
      const g = ctx.createLinearGradient(px, py, px, py+TILE);
      g.addColorStop(0, "#0b2d42");
      g.addColorStop(1, "#0f5077");
      ctx.fillStyle = g;
      ctx.fillRect(px,py,TILE,TILE);

      const phase = (time*0.9 + (tx*0.12) + (ty*0.08)) % 1;
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = "#bfefff";
      ctx.fillRect(px + TILE*(0.15 + 0.20*phase), py + TILE*0.15, TILE*0.08, TILE*0.70);
      ctx.globalAlpha = 1;
      return;
    }

    if (t === WT.CAVE_FLOOR){
      ctx.fillStyle = "#1c1c1c";
      ctx.fillRect(px,py,TILE,TILE);
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = "#3a3a3a";
      ctx.fillRect(px + (v%24), py + ((v*7)%24), 2, 2);
      ctx.globalAlpha = 1;
      return;
    }

    if (t === WT.MOUNTAIN || t === WT.MOUNTAIN_EDGE){
      const isEdge = (t === WT.MOUNTAIN_EDGE);
      const base = isEdge ? 42 : 32;
      const vv = (v % 40);
      const r = base + vv*0.25, g2 = base + vv*0.25, b = base + vv*0.28;

      const gr = ctx.createLinearGradient(px, py, px+TILE, py+TILE);
      gr.addColorStop(0, `rgb(${r+8},${g2+8},${b+8})`);
      gr.addColorStop(1, `rgb(${r-10},${g2-10},${b-10})`);
      ctx.fillStyle = gr;
      ctx.fillRect(px,py,TILE,TILE);

      ctx.globalAlpha = isEdge ? 0.22 : 0.14;
      ctx.strokeStyle = "#0a0a0a";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px + (v%TILE), py);
      ctx.lineTo(px + TILE, py + ((v*5)%TILE));
      ctx.stroke();
      ctx.globalAlpha = 1;
      return;
    }
  }

  function drawTree(px, py, s, v){
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(px + s*0.52, py + s*0.80, s*0.34, s*0.16, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();

    const trunkG = ctx.createLinearGradient(px, py, px, py+s);
    trunkG.addColorStop(0, "#5a3b21");
    trunkG.addColorStop(1, "#3c2716");
    ctx.fillStyle = trunkG;
    ctx.fillRect(px + s*0.46, py + s*0.44, s*0.12, s*0.42);

    const shade = (v%16)-8;
    const c1 = `rgb(${18+shade},${92+shade},${34+shade})`;
    const c2 = `rgb(${14+shade},${72+shade},${28+shade})`;

    ctx.fillStyle = c1;
    ctx.beginPath(); ctx.arc(px+s*0.50, py+s*0.44, s*0.34, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(px+s*0.34, py+s*0.54, s*0.26, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(px+s*0.66, py+s*0.56, s*0.25, 0, Math.PI*2); ctx.fill();

    ctx.globalAlpha = 0.10;
    ctx.fillStyle = "#c8ffd9";
    ctx.beginPath(); ctx.arc(px+s*0.42, py+s*0.38, s*0.16, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // "Bóng cây" dùng cho phần ngoài rìa bản đồ (chỉ nhìn thấy, không tương tác)
  function drawTreeSilhouette(x, y, scale=1, alpha=0.25){
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    // tán cây (3 cụm)
    ctx.fillStyle = "rgba(0,0,0,.55)";
    ctx.beginPath();
    ctx.arc(0, -18, 16, 0, Math.PI*2);
    ctx.arc(-10, -12, 12, 0, Math.PI*2);
    ctx.arc(10, -10, 12, 0, Math.PI*2);
    ctx.fill();

    // thân cây
    ctx.fillStyle = "rgba(0,0,0,.45)";
    ctx.fillRect(-3, -6, 6, 18);

    ctx.restore();
  }

  function drawRock(px, py, s, v){
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(px + s*0.55, py + s*0.75, s*0.28, s*0.15, -0.2, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();

    const shade = (v%20)-10;
    const rg = ctx.createLinearGradient(px, py, px+s, py+s);
    rg.addColorStop(0, `rgb(${110+shade},${115+shade},${120+shade})`);
    rg.addColorStop(1, `rgb(${70+shade},${75+shade},${80+shade})`);
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.ellipse(px + s*0.54, py + s*0.66, s*0.27, s*0.19, -0.25, 0, Math.PI*2);
    ctx.fill();
  }

  function drawBush(px, py, s, v){
    const shade = (v%14)-7;
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(px + s*0.55, py + s*0.86, s*0.22, s*0.10, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = `rgb(${14+shade},${76+shade},${30+shade})`;
    ctx.beginPath(); ctx.arc(px+s*0.40, py+s*0.74, s*0.17, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(px+s*0.55, py+s*0.72, s*0.19, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(px+s*0.70, py+s*0.77, s*0.15, 0, Math.PI*2); ctx.fill();
  }

  function drawCaveMouthAt(tx, ty, style=0, dir=0){
  const mx = tx*TILE + TILE/2;
  const my = ty*TILE + TILE/2;

  ctx.save();
  ctx.translate(mx, my);
  ctx.rotate(dir || 0);

  // kiểu dáng khác nhau theo style (giữ phong cách đồ họa cũ)
  let ew = 3.2, eh = 2.0;
  if (style === 1){ ew = 3.8; eh = 1.8; }        // hang rộng
  else if (style === 2){ ew = 2.8; eh = 2.6; }   // hang dọc
  else if (style === 3){ ew = 3.3; eh = 2.2; }   // hang "đá chắn"

  ctx.globalAlpha = 0.92;
  ctx.fillStyle = "rgba(0,0,0,.72)";
  ctx.beginPath();
  ctx.ellipse(0, 0, TILE*ew, TILE*eh, 0, 0, Math.PI*2);
  ctx.fill();

  const g = ctx.createRadialGradient(0, 8, 6, 0, 0, TILE*(ew+0.25));
  g.addColorStop(0, "rgba(0,0,0,.85)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, TILE*(ew+0.25), TILE*(eh+0.2), 0, 0, Math.PI*2);
  ctx.fill();

  // đá/viền miệng hang để nhìn khác nhau
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = "rgba(20,20,20,.9)";
  if (style === 0){
    ctx.beginPath(); ctx.ellipse(-TILE*1.8, -TILE*0.8, TILE*0.9, TILE*0.7, 0.2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(TILE*1.7, -TILE*0.6, TILE*0.8, TILE*0.6, -0.1, 0, Math.PI*2); ctx.fill();
  } else if (style === 1){
    ctx.beginPath(); ctx.ellipse(-TILE*2.2, 0, TILE*0.8, TILE*0.9, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(TILE*2.2, 0, TILE*0.8, TILE*0.9, 0, 0, Math.PI*2); ctx.fill();
  } else if (style === 2){
    ctx.beginPath(); ctx.ellipse(0, -TILE*1.9, TILE*1.0, TILE*0.7, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, TILE*1.8, TILE*0.9, TILE*0.6, 0, 0, Math.PI*2); ctx.fill();
  } else {
    // style 3: hai "trụ đá" trước miệng hang
    ctx.beginPath(); ctx.ellipse(-TILE*1.9, TILE*0.5, TILE*0.7, TILE*1.2, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(TILE*1.9, TILE*0.5, TILE*0.7, TILE*1.2, 0, 0, Math.PI*2); ctx.fill();
  }

  ctx.restore();
}


  function drawCaveMouthWorld(){
    drawCaveMouthAt(world.caveMouth.x, world.caveMouth.y, world.caveMouth.style||0, world.caveMouth.dir||0);
  }

  // ===================== Drawing: Cave =====================
  function drawCaveTile(tx,ty,t,v){
    const px = tx*TILE, py = ty*TILE;
    if (t === CT.WALL){
      const base = 18 + (v%18);
      const g = ctx.createLinearGradient(px, py, px+TILE, py+TILE);
      g.addColorStop(0, `rgb(${base+10},${base+9},${base+10})`);
      g.addColorStop(1, `rgb(${base-6},${base-6},${base-5})`);
      ctx.fillStyle = g;
      ctx.fillRect(px,py,TILE,TILE);
      return;
    }

    const base = 42 + (v%20);
    ctx.fillStyle = `rgb(${base},${base-2},${base-6})`;
    ctx.fillRect(px,py,TILE,TILE);

    ctx.globalAlpha = 0.14;
    ctx.fillStyle = "#2b2b2b";
    ctx.fillRect(px + (v%26), py + ((v*7)%26), 2, 2);
    ctx.globalAlpha = 1;
  }

  function drawCampfire(x,y, t){
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = "#4a2d1a";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x-12, y+10); ctx.lineTo(x+12, y-2);
    ctx.moveTo(x-12, y-2);  ctx.lineTo(x+12, y+10);
    ctx.stroke();

    const glow = ctx.createRadialGradient(x,y,6,x,y,70);
    glow.addColorStop(0,"rgba(255,160,40,.62)");
    glow.addColorStop(0.4,"rgba(255,120,40,.26)");
    glow.addColorStop(1,"rgba(255,90,30,0)");
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(x,y,70,0,Math.PI*2); ctx.fill();

    const flick = 0.7 + 0.3*Math.sin(t*9.0);
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = "rgba(255,170,60,.95)";
    ctx.beginPath(); ctx.ellipse(x, y-6, 9*flick, 16*flick, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "rgba(255,90,30,.95)";
    ctx.beginPath(); ctx.ellipse(x, y-2, 7*flick, 12*flick, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  // BED BIGGER
  function drawStrawBed(x,y){
    ctx.save();
    // shadow
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(x+8, y+12, 72, 40, 0.1, 0, Math.PI*2);
    ctx.fill();

    // bed body
    ctx.globalAlpha = 0.98;
    ctx.fillStyle = "#b78b3b";
    ctx.beginPath();
    ctx.ellipse(x, y, 70, 40, 0.12, 0, Math.PI*2);
    ctx.fill();

    // straw lines
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = "#6c4f1f";
    ctx.lineWidth = 1;
    for (let i=0;i<22;i++){
      const a = -1.0 + i*0.10;
      ctx.beginPath();
      ctx.moveTo(x-64, y + Math.sin(a)*18);
      ctx.lineTo(x+64, y + Math.cos(a)*16);
      ctx.stroke();
    }

    // highlight
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = "#fff3c9";
    ctx.beginPath();
    ctx.ellipse(x-16, y-12, 34, 18, 0.05, 0, Math.PI*2);
    ctx.fill();

    ctx.restore();
  }

  function drawBone(x,y){
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = "#d9d0c0";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x-10, y); ctx.lineTo(x+10, y);
    ctx.stroke();

    ctx.fillStyle = "#e9e0cf";
    ctx.beginPath(); ctx.arc(x-12, y-3, 4, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x-12, y+3, 4, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+12, y-3, 4, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+12, y+3, 4, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  function drawPelt(x,y){
    ctx.save();
    ctx.globalAlpha = 0.9;
    const g = ctx.createLinearGradient(x-18,y-16,x+18,y+16);
    g.addColorStop(0, "#6b4a2f");
    g.addColorStop(1, "#3a2617");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, y-18);
    ctx.bezierCurveTo(x+18, y-12, x+22, y+10, x+10, y+18);
    ctx.bezierCurveTo(x+2, y+22, x-2, y+22, x-10, y+18);
    ctx.bezierCurveTo(x-22, y+10, x-18, y-12, x, y-18);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  
function drawLockIndicator(){
  const tgt = getLockedTarget();
  if (!tgt) return;

  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.strokeStyle = "rgba(255,235,160,.95)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(tgt.obj.x, tgt.obj.y, (tgt.obj.r||16) + 10, 0, Math.PI*2);
  ctx.stroke();

  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(tgt.obj.x, tgt.obj.y);
  ctx.stroke();
  ctx.restore();
}

// ===================== Tiger =====================
  function drawTiger(x,y, angle){
  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(angle);

  // hiệu ứng vòng đỏ khi hổ bị trúng đòn
  if (player.hitFlashT > 0){
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = "rgba(255,80,80,.95)";
    ctx.lineWidth   = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI*2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.globalAlpha = 0.25;

    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(0, 16, 16, 7, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#f08a1b";
    roundRectPath(ctx, -14, -6, 28, 22, 10);
    ctx.fill();

    ctx.globalAlpha = 0.85;
    ctx.fillStyle = "#ffd6a8";
    roundRectPath(ctx, -10, 2, 20, 12, 8);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#f08a1b";
    roundRectPath(ctx, -16, -26, 32, 24, 10);
    ctx.fill();

    ctx.fillStyle = "#d97412";
    ctx.beginPath(); ctx.arc(-10, -26, 6, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc( 10, -26, 6, 0, Math.PI*2); ctx.fill();

    ctx.fillStyle = "#ffd6a8";
    roundRectPath(ctx, -12, -18, 24, 14, 8);
    ctx.fill();

    ctx.fillStyle = "#151515";
    ctx.beginPath(); ctx.arc(-6, -14, 2.3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc( 6, -14, 2.3, 0, Math.PI*2); ctx.fill();

    ctx.fillStyle = "#3a2a24";
    ctx.beginPath(); ctx.arc(0, -10, 2.2, 0, Math.PI*2); ctx.fill();

    ctx.strokeStyle = "rgba(40,25,18,.9)";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-8, -22); ctx.lineTo(-3, -18);
    ctx.moveTo( 8, -22); ctx.lineTo( 3, -18);
    ctx.moveTo(-7, -4);  ctx.lineTo(-2, 2);
    ctx.moveTo( 7, -4);  ctx.lineTo( 2, 2);
    ctx.stroke();

    ctx.strokeStyle = "#d97412";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(14, 8);
    ctx.quadraticCurveTo(24, 2, 20, -10);
    ctx.stroke();

    ctx.restore();
  }

  // ===================== Animals draw =====================
  function drawDeer(a){
    ctx.save(); ctx.translate(a.x,a.y); ctx.rotate(a.face);
    ctx.globalAlpha = 0.20;
    ctx.fillStyle = "#000";
    ctx.beginPath(); ctx.ellipse(0, 10, 14, 6, 0, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#b88a52";
    ctx.beginPath(); ctx.ellipse(0, 0, 12, 8, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#caa06a";
    ctx.beginPath(); ctx.ellipse(10, -2, 7, 5, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }
  function drawRabbit(a){
    ctx.save(); ctx.translate(a.x,a.y); ctx.rotate(a.face);
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#000";
    ctx.beginPath(); ctx.ellipse(0, 9, 11, 5, 0, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#cfcfd4";
    ctx.beginPath(); ctx.ellipse(0, 0, 9, 7, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(8, -2, 6, 5, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }
  function drawBoar(a){
    ctx.save(); ctx.translate(a.x,a.y); ctx.rotate(a.face);
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "#000";
    ctx.beginPath(); ctx.ellipse(0, 11, 15, 6.5, 0, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#5a4a3a";
    ctx.beginPath(); ctx.ellipse(0, 0, 13, 9, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }
  function drawBear(a){
  ctx.save(); ctx.translate(a.x,a.y); ctx.rotate(a.face);
  ctx.globalAlpha = 0.24;
  ctx.fillStyle = "#000";
  ctx.beginPath(); ctx.ellipse(0, 12, 18, 7, 0, 0, Math.PI*2); ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = "#4b3624";
  ctx.beginPath(); ctx.ellipse(0, 0, 15, 11, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(11, -3, 9, 7, 0, 0, Math.PI*2); ctx.fill();

  ctx.fillStyle = "#2a1a12";
  ctx.beginPath(); ctx.arc(6, -4, 3, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}
function drawWolf(a){
  ctx.save(); ctx.translate(a.x,a.y); ctx.rotate(a.face);
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "#000";
  ctx.beginPath(); ctx.ellipse(0, 10, 13, 5.5, 0, 0, Math.PI*2); ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = "#c0c4cf";
  ctx.beginPath(); ctx.ellipse(0, 0, 11, 7.5, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(10, -2, 7, 5.5, 0, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

  function drawSquirrel(a){
    ctx.save(); ctx.translate(a.x,a.y); ctx.rotate(a.face);
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#000";
    ctx.beginPath(); ctx.ellipse(0, 8, 10, 4.8, 0, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#a06b3b";
    ctx.beginPath(); ctx.ellipse(0, 0, 8, 6, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  function drawAnimals(){
    // offscreen cull để map lớn vẫn mượt
    const w = window.innerWidth, h = window.innerHeight;
    const halfW = (w/2)/cam.zoom;
    const halfH = (h/2)/cam.zoom;
    const left = cam.x - halfW - 160, right = cam.x + halfW + 160;
    const top  = cam.y - halfH - 160, bottom = cam.y + halfH + 160;

    for (const a of animals){
      if (a.x < left || a.x > right || a.y < top || a.y > bottom) continue;
      if (a.type === AnimalType.DEER)      drawDeer(a);
else if (a.type === AnimalType.RABBIT) drawRabbit(a);
else if (a.type === AnimalType.BOAR)   drawBoar(a);
else if (a.type === AnimalType.BEAR)   drawBear(a);
else if (a.type === AnimalType.WOLF)   drawWolf(a);
else drawSquirrel(a);


      // little HP bar (only if damaged)
      if (a.hp < a.hpMax){
        const w = 22, h = 4;
        const pct = clamp(a.hp / a.hpMax, 0, 1);
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = "rgba(0,0,0,.5)";
        ctx.fillRect(a.x - w/2, a.y - 22, w, h);
        ctx.fillStyle = "rgba(255,80,80,.85)";
        ctx.fillRect(a.x - w/2, a.y - 22, w*pct, h);
        ctx.restore();
      }

      // stun stars
      if (a.stunnedT > 0){
        ctx.save();
        ctx.globalAlpha = 0.65;
        ctx.fillStyle = "rgba(255,255,255,.85)";
        const t = performance.now()/1000;
        for (let i=0;i<3;i++){
          const ang = t*3 + i*2.2;
          const rx = a.x + Math.cos(ang)*14;
          const ry = a.y - 18 + Math.sin(ang)*4;
          ctx.fillRect(rx, ry, 2, 2);
        }
        ctx.restore();
      }
    }
  }

  function drawCarcasses(){
    for (const c of carcasses){
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.ellipse(c.x+4, c.y+10, 18, 7, 0, 0, Math.PI*2);
      ctx.fill();

      ctx.globalAlpha = 0.95;
      ctx.fillStyle = "rgba(120,70,40,.95)";
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, 16, 10, -0.2, 0, Math.PI*2);
      ctx.fill();

      ctx.globalAlpha = 0.9;
      ctx.fillStyle = "rgba(200,120,90,.8)";
      ctx.beginPath();
      ctx.arc(c.x+6, c.y-2, 3, 0, Math.PI*2);
      ctx.fill();

      // meat indicator
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = "rgba(255,220,160,.9)";
      ctx.font = "12px system-ui";
      ctx.fillText(`🍖x${c.meat}`, c.x-14, c.y-16);

      ctx.restore();
    }
  }

  // ===================== Minimap =====================
  function drawMinimapOverlay(currentMap, viewport){
    const W = mini.width, H = mini.height;
    const mapW = currentMap.w*TILE, mapH = currentMap.h*TILE;

    mctx.putImageData(currentMap.miniBase, 0, 0);

    // markers helper
    const dot = (x,y,r,fill)=>{
      mctx.fillStyle = fill;
      mctx.beginPath(); mctx.arc(x,y,r,0,Math.PI*2); mctx.fill();
    };


    const caveMark = (x,y,r,style,fill)=>{
      mctx.fillStyle = fill;
      mctx.beginPath();
      style = style|0;
      if (style === 1){
        // square
        mctx.rect(x-r, y-r, r*2, r*2);
      } else if (style === 2){
        // triangle
        mctx.moveTo(x, y-r);
        mctx.lineTo(x+r, y+r);
        mctx.lineTo(x-r, y+r);
        mctx.closePath();
      } else if (style === 3){
        // diamond
        mctx.moveTo(x, y-r);
        mctx.lineTo(x+r, y);
        mctx.lineTo(x, y+r);
        mctx.lineTo(x-r, y);
        mctx.closePath();
      } else {
        // circle
        mctx.arc(x,y,r,0,Math.PI*2);
      }
      mctx.fill();
    };

    // camera viewport rectangle (fill + outline giống bản gốc)
    const vx = (viewport.left/mapW)*W;
    const vy = (viewport.top/mapH)*H;
    const vw = ((viewport.right-viewport.left)/mapW)*W;
    const vh = ((viewport.bottom-viewport.top)/mapH)*H;

    mctx.save();
    mctx.fillStyle = "rgba(255,255,255,.06)";
    mctx.fillRect(vx, vy, vw, vh);
    mctx.strokeStyle = "rgba(255,255,255,.18)";
    mctx.lineWidth = 1;
    mctx.strokeRect(vx, vy, vw, vh);

    if (currentMap === world){
      // territory grid
      mctx.strokeStyle = "rgba(255,255,255,.10)";
      for (let g=1; g<TERR.GRID; g++){
        const gx = (g*(TERR.SIZE*TILE)/mapW)*W;
        const gy = (g*(TERR.SIZE*TILE)/mapH)*H;
        mctx.beginPath(); mctx.moveTo(gx,0); mctx.lineTo(gx,H); mctx.stroke();
        mctx.beginPath(); mctx.moveTo(0,gy); mctx.lineTo(W,gy); mctx.stroke();
      }

      // player's cave mouth marker
      const cx = ((world.caveMouth.x*TILE + TILE/2)/mapW)*W;
      const cy = ((world.caveMouth.y*TILE + TILE/2)/mapH)*H;
      caveMark(cx, cy, 3.1, world.caveMouth.style||0, "rgba(120,220,255,.95)");

      // other cave mouths
      for (const oc of (world.otherCaves || [])){
        const ox = ((oc.caveMouth.x*TILE + TILE/2)/mapW)*W;
        const oy = ((oc.caveMouth.y*TILE + TILE/2)/mapH)*H;
        caveMark(ox, oy, 2.5, oc.caveMouth.style||0, "rgba(210,160,255,.85)");
      }

      // carcasses
      for (const c of carcasses){
        const x = (c.x/mapW)*W;
        const y = (c.y/mapH)*H;
        dot(x, y, 1.8, "rgba(255,120,120,.70)");
      }

      // predators (bear/wolf)
      for (const a of animals){
        if (a.type !== AnimalType.BEAR && a.type !== AnimalType.WOLF) continue;
        const x = (a.x/mapW)*W;
        const y = (a.y/mapH)*H;
        dot(x, y, 2.0, "rgba(255,80,80,.78)");
      }

      // rival tigers
      for (const t of rivalTigers){
        if (t.deadT > 0) continue;
        const x = (t.x/mapW)*W;
        const y = (t.y/mapH)*H;
        dot(x, y, 2.2, t.palette?.main || "rgba(255,170,80,.85)");
      }
    } else if (currentMap === cave){
      // bed marker (for orientation)
      const bx = (cave.bed.x/mapW)*W;
      const by = (cave.bed.y/mapH)*H;
      dot(bx, by, 2.6, "rgba(255,200,120,.75)");
    }

    // player marker
    const px = (player.x/mapW)*W;
    const py = (player.y/mapH)*H;
    dot(px, py, 3.2, "rgba(255,180,80,.95)");

    // facing line
    mctx.strokeStyle = "rgba(255,180,80,.85)";
    mctx.lineWidth = 2;
    mctx.beginPath();
    mctx.moveTo(px, py);
    mctx.lineTo(px + Math.cos(player.face)*9, py + Math.sin(player.face)*9);
    mctx.stroke();

    mctx.restore();
  }
  function drawMinimapFor(currentMap, camHalfW, camHalfH){
    const mapW = currentMap.w*TILE, mapH = currentMap.h*TILE;
    const viewport = {
      left: clamp(cam.x - camHalfW, 0, mapW),
      top:  clamp(cam.y - camHalfH, 0, mapH),
      right:clamp(cam.x + camHalfW, 0, mapW),
      bottom:clamp(cam.y + camHalfH, 0, mapH),
    };
    drawMinimapOverlay(currentMap, viewport);
  }

  // ===================== Sky / Weather overlays =====================
  function ensureStars(){
    if (env.stars.length) return;
    for (let i=0;i<120;i++){
      env.stars.push({ x: Math.random(), y: Math.random(), s: 0.5 + Math.random()*1.8, a: 0.35 + Math.random()*0.55 });
    }
  }

  function drawSkyOverlay(){
    const w = window.innerWidth, h = window.innerHeight;
    ensureStars();

    const df = dayFactor(env.time);
    const night = 1 - df;

    const sky = ctx.createLinearGradient(0,0,0,h);
    const isDawnDusk = (env.time >= 5 && env.time < 7.5) || (env.time >= 17 && env.time < 20);
    if (df > 0.05){
      sky.addColorStop(0, isDawnDusk ? "rgba(255,140,70,.14)" : "rgba(120,200,255,.10)");
      sky.addColorStop(1, "rgba(0,0,0,0)");
    } else {
      sky.addColorStop(0, "rgba(20,40,70,.18)");
      sky.addColorStop(1, "rgba(0,0,0,0)");
    }

    ctx.save();
    ctx.fillStyle = sky;
    ctx.fillRect(0,0,w,h);

    if (night > 0.35){
      for (const s of env.stars){
        const sx = s.x*w;
        const sy = s.y*h*0.55;
        ctx.globalAlpha = ((night - 0.35)/0.65) * s.a;
        ctx.fillStyle = "rgba(230,240,255,.95)";
        ctx.fillRect(sx, sy, s.s, s.s);
      }
      ctx.globalAlpha = 1;
    }

    // vignette stronger at night
    const vg = ctx.createRadialGradient(w*0.5, h*0.5, Math.min(w,h)*0.18, w*0.5, h*0.5, Math.max(w,h)*0.75);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, `rgba(0,0,0,${0.18 + night*0.55})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0,0,w,h);

    ctx.restore();
  }

  const rain = Array.from({length: 150}, ()=>({ x: Math.random(), y: Math.random(), s: 0.6 + Math.random()*1.6, v: 0.7 + Math.random()*1.4 }));
  function drawWeatherOverlay(dt){
    const w = window.innerWidth, h = window.innerHeight;

    if (env.weatherType === "fog"){
      ctx.save();
      const fog = ctx.createLinearGradient(0,0,0,h);
      fog.addColorStop(0, "rgba(200,220,210,.05)");
      fog.addColorStop(1, "rgba(200,220,210,.12)");
      ctx.fillStyle = fog;
      ctx.fillRect(0,0,w,h);
      ctx.restore();
    }

    if (env.weatherType === "rain"){
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = "rgba(200,230,255,.65)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (const drop of rain){
        drop.x += 0.25*dt*drop.v;
        drop.y += 1.5*dt*drop.v;
        if (drop.y > 1.1){ drop.y = -0.1; drop.x = Math.random(); }
        if (drop.x > 1.1){ drop.x = -0.1; }
        const x = drop.x*w;
        const y = drop.y*h;
        ctx.moveTo(x, y);
        ctx.lineTo(x-6*drop.s, y+14*drop.s);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  // Sương mù tối ở rìa bản đồ: khi người chơi tiến gần biên, màn hình sẽ tối dần ở phía đó.
  // (Vừa cho cảm giác "còn rừng sâu", vừa giúp người chơi biết hướng chưa mở.)
  function drawWorldEdgeFogOverlay(){
    if (scene !== "world") return;

    const w = window.innerWidth, h = window.innerHeight;
    const worldW = world.w*TILE;
    const worldH = world.h*TILE;

    const edgeDist = 18*TILE; // khoảng bắt đầu tối dần (px)
    const maxA = 0.78;        // độ tối tối đa

    const dL = player.x;
    const dR = worldW - player.x;
    const dT = player.y;
    const dB = worldH - player.y;

    // intensity 0..1
    const iL = clamp(1 - dL/edgeDist, 0, 1);
    const iR = clamp(1 - dR/edgeDist, 0, 1);
    const iT = clamp(1 - dT/edgeDist, 0, 1);
    const iB = clamp(1 - dB/edgeDist, 0, 1);

    // ease
    const ease = (x)=>x*x;

    ctx.save();

    // trái
    if (iL > 0){
      const a = maxA * ease(iL);
      const g = ctx.createLinearGradient(0,0, w*0.55, 0);
      g.addColorStop(0, `rgba(0,0,0,${a})`);
      g.addColorStop(1, `rgba(0,0,0,0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0,0, w*0.55, h);
    }

    // phải
    if (iR > 0){
      const a = maxA * ease(iR);
      const g = ctx.createLinearGradient(w,0, w*0.45, 0);
      g.addColorStop(0, `rgba(0,0,0,${a})`);
      g.addColorStop(1, `rgba(0,0,0,0)`);
      ctx.fillStyle = g;
      ctx.fillRect(w*0.45,0, w*0.55, h);
    }

    // trên
    if (iT > 0){
      const a = maxA * ease(iT);
      const g = ctx.createLinearGradient(0,0, 0, h*0.55);
      g.addColorStop(0, `rgba(0,0,0,${a})`);
      g.addColorStop(1, `rgba(0,0,0,0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0,0, w, h*0.55);
    }

    // dưới
    if (iB > 0){
      const a = maxA * ease(iB);
      const g = ctx.createLinearGradient(0,h, 0, h*0.45);
      g.addColorStop(0, `rgba(0,0,0,${a})`);
      g.addColorStop(1, `rgba(0,0,0,0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0,h*0.45, w, h*0.55);
    }

    ctx.restore();
  }

  // ===================== Night vision (harder to hunt at night) =====================
  function nightVisionStrength(){
  // CHỈ bật ngoài rừng + CHỈ trong "Đêm" (21:00 -> 05:00)
  if (scene !== "world") return 0;

  const t = env.time; // 0..24

  // ramp up từ 20:30 -> 21:00
  if (t >= 20.5 && t < 21.0) return (t - 20.5) / 0.5;

  // full từ 21:00 -> 04:45
  if (t >= 21.0 || t < 4.75) return 1;

  // ramp down từ 04:45 -> 05:15
  if (t >= 4.75 && t < 5.25) return 1 - (t - 4.75) / 0.5;

  return 0;
}

function drawNightVisionMask(){
  const a = nightVisionStrength();
  if (a <= 0) return 0;

  const w = window.innerWidth, h = window.innerHeight;

  // vị trí hổ trên màn hình (screen space)
  const sx = (player.x - cam.x) * cam.zoom + w/2;
  const sy = (player.y - cam.y) * cam.zoom + h/2;

  const baseR = Math.min(w, h);
  const radius = lerp(baseR * 0.60, baseR * 0.36, a); // đêm càng sâu nhìn càng hẹp

  ctx.save();

  // gradient: tâm trong suốt (thấy), ra ngoài tối dần
  const g = ctx.createRadialGradient(sx, sy, radius * 0.10, sx, sy, radius);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, `rgba(0,0,0,${0.82 * a})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // thêm tối góc màn hình cho “đêm” cảm giác rõ hơn
  ctx.globalAlpha = 0.30 * a;
  const vg = ctx.createRadialGradient(w*0.5, h*0.5, baseR*0.18, w*0.5, h*0.5, baseR*0.85);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,1)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);

  ctx.restore();
  return a;
}
  // ===================== FX draw (world space) =====================
  function drawFx(dt){
    for (let i=fx.length-1;i>=0;i--){
      const f = fx[i];
      f.t += dt;
      const p = clamp(f.t / f.life, 0, 1);

      if (f.type === "ring"){
        ctx.save();
        ctx.globalAlpha = (1 - p) * 0.65;
        ctx.strokeStyle = "rgba(255,220,160,.9)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r*(0.3 + 0.8*p), 0, Math.PI*2);
        ctx.stroke();
        ctx.restore();
      }

      if (f.type === "slash"){
        ctx.save();
        ctx.globalAlpha = (1 - p) * 0.85;
        ctx.strokeStyle = "rgba(255,230,200,.9)";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        const len = 36;
        const ax = Math.cos(f.a);
        const ay = Math.sin(f.a);
        ctx.beginPath();
        ctx.moveTo(f.x - ay*10, f.y + ax*10);
        ctx.lineTo(f.x + ax*len, f.y + ay*len);
        ctx.stroke();
        ctx.restore();
      }

      
      if (f.type === "spark"){
        const px = f.x + (f.vx||0) * f.t;
        const py = f.y + (f.vy||0) * f.t;
        const vv = Math.hypot(f.vx||0, f.vy||0) || 1;
        const dx = (f.vx||0)/vv;
        const dy = (f.vy||0)/vv;

        ctx.save();
        ctx.globalAlpha = (1 - p) * 0.95;
        ctx.strokeStyle = "rgba(255,245,220,.95)";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(px - dx*10, py - dy*10);
        ctx.lineTo(px + dx*2,  py + dy*2);
        ctx.stroke();
        ctx.restore();
      }

      if (f.type === "blood"){
        const px = f.x + (f.vx||0) * f.t;
        const py = f.y + (f.vy||0) * f.t;

        ctx.save();
        ctx.globalAlpha = (1 - p) * 0.55;
        ctx.fillStyle = "rgba(150,30,25,.95)";
        ctx.beginPath();
        ctx.arc(px, py, (f.r||3) * (1 - 0.35*p), 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
      }

if (f.type === "text"){
        ctx.save();
        ctx.globalAlpha = (1 - p) * 0.95;
        ctx.fillStyle = "rgba(255,235,210,.95)";
        ctx.font = "12px system-ui";
        ctx.fillText(f.text, f.x-14, f.y - p*18);
        ctx.restore();
      }

      if (f.t >= f.life) fx.splice(i,1);
    }
  }

  // ===================== Cave/World rendering =====================
  function renderWorld(timeSec, dt){
    const w = window.innerWidth, h = window.innerHeight;

    cam.dragX = lerp(cam.dragX, cam.dragTargetX, 0.10);
    cam.dragY = lerp(cam.dragY, cam.dragTargetY, 0.10);
    if (!dragging){
      cam.dragTargetX = lerp(cam.dragTargetX, 0, 0.03);
      cam.dragTargetY = lerp(cam.dragTargetY, 0, 0.03);
    }

    const targetX = player.x + cam.dragX;
    const targetY = player.y + cam.dragY;
    cam.x = lerp(cam.x, targetX, 0.12);
    cam.y = lerp(cam.y, targetY, 0.12);

    const worldW = world.w*TILE, worldH = world.h*TILE;
    cam.x = clamp(cam.x, 0, worldW);
    cam.y = clamp(cam.y, 0, worldH);

    ctx.fillStyle = "#070b08";
    ctx.fillRect(0,0, w, h);

    ctx.save();
    ctx.translate(w/2, h/2);
    ctx.scale(cam.zoom, cam.zoom);
    // camera shake
    if (cam.shakeT > 0){
      cam.shakeT = Math.max(0, cam.shakeT - dt);
      const k = (cam.shakeDur > 0) ? (cam.shakeT / cam.shakeDur) : 0;
      cam.shakeX = (Math.random()*2-1) * (cam.shakeMag||0) * k;
      cam.shakeY = (Math.random()*2-1) * (cam.shakeMag||0) * k;
      if (cam.shakeT <= 0){
        cam.shakeMag = 0; cam.shakeDur = 0; cam.shakeX = 0; cam.shakeY = 0;
      }
    }
    ctx.translate(-cam.x + (cam.shakeX||0), -cam.y + (cam.shakeY||0));

    const halfW = (w/2)/cam.zoom;
    const halfH = (h/2)/cam.zoom;

    const minX = clamp(Math.floor((cam.x-halfW)/TILE)-2, 0, world.w-1);
    const maxX = clamp(Math.floor((cam.x+halfW)/TILE)+2, 0, world.w-1);
    const minY = clamp(Math.floor((cam.y-halfH)/TILE)-2, 0, world.h-1);
    const maxY = clamp(Math.floor((cam.y+halfH)/TILE)+2, 0, world.h-1);

    for (let ty=minY; ty<=maxY; ty++){
      for (let tx=minX; tx<=maxX; tx++){
        const i = ty*world.w + tx;
        drawWorldTile(tx,ty, world.tiles[i], world.groundVar[i], timeSec);
      }
    }

    // "Ngoài rìa bản đồ" (bóng cây) – giúp người chơi thấy còn rừng sâu nhưng hiện chưa đi qua được
    if (world.edgeDeco && world.edgeDeco.length){
      const left = cam.x - halfW - 300;
      const right = cam.x + halfW + 300;
      const top = cam.y - halfH - 300;
      const bottom = cam.y + halfH + 300;
      for (const e of world.edgeDeco){
        if (e.x < left || e.x > right || e.y < top || e.y > bottom) continue;
        if (e.kind === "tree") drawTreeSilhouette(e.x, e.y, e.s, e.a);
      }
    }

    // cave mouths (của bạn + các hổ đực)
    const cavesToDraw = [world.caveMouth, ...(world.otherCaves||[]).map(o=>o.caveMouth)];
    for (const m of cavesToDraw){
      const mouthWX = m.x*TILE + TILE/2;
      const mouthWY = m.y*TILE + TILE/2;
      if (Math.abs(mouthWX - cam.x) < halfW + TILE*8 && Math.abs(mouthWY - cam.y) < halfH + TILE*8){
        drawCaveMouthAt(m.x, m.y, m.style||0, m.dir||0);
      }
    }

    // objects
    for (let ty=minY; ty<=maxY; ty++){
      for (let tx=minX; tx<=maxX; tx++){
        const i = ty*world.w + tx;
        const o = world.objects[i];
        if (o === WO.NONE) continue;
        if (world.tiles[i] !== WT.GRASS) continue;
        const px = tx*TILE, py = ty*TILE;
        const v = world.groundVar[i];
        if (o === WO.TREE) drawTree(px,py,TILE,v);
        else if (o === WO.ROCK) drawRock(px,py,TILE,v);
        else if (o === WO.BUSH) drawBush(px,py,TILE,v);
      }
    }

    // carcasses + animals + tiger + fx
    drawCarcasses();
drawAnimals();
drawRivalTigers();
// tắt vòng tròn khóa mục tiêu cho giao diện gọn hơn
// drawLockIndicator();
drawTiger(player.x, player.y, player.face);
    drawFx(dt);

    ctx.restore();

    drawSkyOverlay();
drawWeatherOverlay(dt);

    // sương mù tối ở rìa bản đồ (hiện khi người chơi tiến sát biên)
    drawWorldEdgeFogOverlay();

// mask đêm: chỉ ngoài rừng + chỉ đêm
const nv = drawNightVisionMask();

// nếu đang có mask đêm, vẽ lại hổ lên trên để hổ luôn thấy rõ
if (nv > 0) {
  const w = window.innerWidth, h = window.innerHeight;
  const sx = (player.x - cam.x) * cam.zoom + w/2;
  const sy = (player.y - cam.y) * cam.zoom + h/2;

  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(cam.zoom, cam.zoom);
  drawTiger(0, 0, player.face);
  ctx.restore();
}

    drawMinimapFor(world, halfW, halfH);
    posLabel.textContent = `${Math.floor(player.x/TILE)},${Math.floor(player.y/TILE)}`;
  }

  function renderCave(timeSec, dt){
  const w = window.innerWidth, h = window.innerHeight;

  // kéo camera trong hang mượt như ngoài trời
  cam.dragX = lerp(cam.dragX, cam.dragTargetX, 0.10);
  cam.dragY = lerp(cam.dragY, cam.dragTargetY, 0.10);
  if (!dragging){
    cam.dragTargetX = lerp(cam.dragTargetX, 0, 0.03);
    cam.dragTargetY = lerp(cam.dragTargetY, 0, 0.03);
  }

  const targetX = player.x + cam.dragX;
  const targetY = player.y + cam.dragY;
  cam.x = lerp(cam.x, targetX, 0.14);
  cam.y = lerp(cam.y, targetY, 0.14);

  const caveW = cave.w*TILE, caveH = cave.h*TILE;
  cam.x = clamp(cam.x, 0, caveW);
  cam.y = clamp(cam.y, 0, caveH);

  // nền tối trong hang
  ctx.fillStyle = "#060606";
  ctx.fillRect(0,0, w, h);

  // thiết lập camera
  ctx.save();
  ctx.translate(w/2, h/2);
  ctx.scale(cam.zoom, cam.zoom);
      // camera shake
      if (cam.shakeT > 0){
        cam.shakeT = Math.max(0, cam.shakeT - dt);
        const k = (cam.shakeDur > 0) ? (cam.shakeT / cam.shakeDur) : 0;
        cam.shakeX = (Math.random()*2-1) * (cam.shakeMag||0) * k;
        cam.shakeY = (Math.random()*2-1) * (cam.shakeMag||0) * k;
        if (cam.shakeT <= 0){
          cam.shakeMag = 0; cam.shakeDur = 0; cam.shakeX = 0; cam.shakeY = 0;
        }
      }
      ctx.translate(-cam.x + (cam.shakeX||0), -cam.y + (cam.shakeY||0));

  const halfW = (w/2)/cam.zoom;
  const halfH = (h/2)/cam.zoom;

  const minX = clamp(Math.floor((cam.x-halfW)/TILE)-2, 0, cave.w-1);
  const maxX = clamp(Math.floor((cam.x+halfW)/TILE)+2, 0, cave.w-1);
  const minY = clamp(Math.floor((cam.y-halfH)/TILE)-2, 0, cave.h-1);
  const maxY = clamp(Math.floor((cam.y+halfH)/TILE)+2, 0, cave.h-1);

  // vẽ tile hang
  for (let ty=minY; ty<=maxY; ty++){
    for (let tx=minX; tx<=maxX; tx++){
      const i = ty*cave.w + tx;
      drawCaveTile(tx,ty, cave.tiles[i], cave.var[i]);
    }
  }

  // vẽ props trong hang (lửa, ổ rơm, xương, da thú…)
  for (const p of cave.props){
    if (p.type === P.FIRE)      drawCampfire(p.x,p.y,timeSec);
    else if (p.type === P.BED)  drawStrawBed(p.x,p.y);
    else if (p.type === P.BONE) drawBone(p.x,p.y);
    else if (p.type === P.PELT) drawPelt(p.x,p.y);
  }

  // vẽ người chơi trong hang
  drawTiger(player.x, player.y, player.face);
  drawFx(dt);

  // ánh sáng đống lửa
  const fire = cave.props.find(p=>p.type===P.FIRE);
  if (fire){
    const flick = 0.7 + 0.3*Math.sin(timeSec*8.5);
    const g = ctx.createRadialGradient(
      fire.x, fire.y, 20,
      fire.x, fire.y, 300*flick
    );
    g.addColorStop(0,   "rgba(255,170,70,.22)");
    g.addColorStop(0.5, "rgba(255,120,50,.10)");
    g.addColorStop(1,   "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(fire.x, fire.y, 300*flick, 0, Math.PI*2);
    ctx.fill();
  }

  ctx.restore();

  // vignette tối xung quanh
  const vg = ctx.createRadialGradient(
    w*0.5, h*0.52,
    Math.min(w,h)*0.12,
    w*0.5, h*0.52,
    Math.max(w,h)*0.70
  );
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,.58)");
  ctx.fillStyle = vg;
  ctx.fillRect(0,0,w,h);

  // minimap và tọa độ khi ở trong hang
  drawMinimapFor(cave, halfW, halfH);
  posLabel.textContent = `${Math.floor(player.x/TILE)},${Math.floor(player.y/TILE)}`;
}

