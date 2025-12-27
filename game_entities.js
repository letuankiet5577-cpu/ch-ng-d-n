  // ===================== Rival tiger (NPC) =====================
  function damageRivalTiger(t, dmg){
    t.hp -= dmg;
    t.hitFlashT = Math.max(t.hitFlashT, 0.25);
    addFxText(t.x, t.y-18, `-${dmg}`, 0.55);

    // bị đánh => sẽ bảo vệ lãnh thổ quyết liệt hơn
    t.aggroT = Math.max(t.aggroT, 7.5);
    if (t.hp <= 0){
      // không "chết hẳn" để tránh phá vòng lặp: rút về hang, hồi phục
      addFxText(t.x, t.y-26, "Bị hạ gục!", 0.9);
      t.deadT = 8.0;
      t.hp = t.hpMax;
      t.mode = "rest";
      t.target = null;
      showToast(`🐯 ${t.name} rút lui về hang!`, 1.1);
      return true;
    }
    return false;
  }

  function tigerEat(t, c){
    if (!c || c.meat <= 0) return false;
    c.meat -= 1;
    t.hunger = clamp(t.hunger + 24, 0, t.hungerMax);
    t.hp = clamp(t.hp + 4, 0, t.hpMax);
    return true;
  }

  function nearestCarcassToTiger(t){
    let best=null, bestD=1e9;
    for (const c of carcasses){
      const d = Math.hypot(c.x - t.x, c.y - t.y);
      if (d < bestD){ bestD=d; best=c; }
    }
    return {c:best, d:bestD};
  }

  function pickHuntTarget(t){
    // tìm con mồi gần nhất trong lãnh thổ
    const terr = getTerritoryById(t.territoryId);
    if (!terr) return null;

    let best=null, bestD=1e9;
    for (const a of animals){
      // chỉ săn mồi hiền: nai / thỏ / lợn rừng / sóc
      if (a.type === AnimalType.BEAR || a.type === AnimalType.WOLF) continue;
      if (!inTerritoryPx(a.x, a.y, terr)) continue;
      const d = Math.hypot(a.x - t.x, a.y - t.y);
      if (d < bestD){ bestD = d; best = a; }
    }
    return best;
  }

  function tigerRoar(t){
    if (t.roarCD > 0) return;
    t.roarCD = 4.5;
    addFxRing(t.x, t.y, 0.55, 150);
    // hiển thị vừa đủ - không spam: chỉ khi người chơi đang trong lãnh thổ đó
    const terr = getTerritoryById(t.territoryId);
    if (terr && inTerritoryPx(player.x, player.y, terr)){
      showToast(`🐯 ${t.name} gầm lên bảo vệ lãnh thổ!`, 1.0);
    }
  }

  function updateRivalTigers(dt){
    if (scene !== "world") return;

    // culling nhẹ để tối ưu: chỉ update đầy đủ nếu ở gần người chơi
    const farSkip = 1300;

    for (const t of rivalTigers){
      // timers
      if (t.deadT > 0){
        t.deadT = Math.max(0, t.deadT - dt);
        // teleport về hang trong lúc "rút lui"
        t.x = t.homeX; t.y = t.homeY;
        continue;
      }
      if (t.roarCD > 0) t.roarCD = Math.max(0, t.roarCD - dt);
      if (t.attackCD > 0) t.attackCD = Math.max(0, t.attackCD - dt);
      if (t.aggroT > 0) t.aggroT = Math.max(0, t.aggroT - dt);
      if (t.stunnedT > 0) t.stunnedT = Math.max(0, t.stunnedT - dt);
      if (t.hitFlashT > 0) t.hitFlashT = Math.max(0, t.hitFlashT - dt);
      if (t.thinkT > 0) t.thinkT = Math.max(0, t.thinkT - dt);

      // metabolism
      t.hunger = clamp(t.hunger - dt*0.55, 0, t.hungerMax);
      t.sleep  = clamp(t.sleep  + dt*0.60, 0, t.sleepMax); // buồn ngủ tăng dần

      const terr = getTerritoryById(t.territoryId);
      if (!terr) continue;

      // nếu người chơi xâm nhập => DEFEND override
      const playerInside = inTerritoryPx(player.x, player.y, terr);
      const dToPlayer = Math.hypot(player.x - t.x, player.y - t.y);

      let desired = scheduleTigerMode(env.time);
if (playerInside) desired = "defend";
if (t.aggroT > 0) desired = "defend";
if (t.hunger < 25 && desired !== "defend") desired = "hunt";
if (t.sleep > 80 && desired !== "defend") desired = "rest";
// máu thấp => ưu tiên rút về hang (trừ khi đang phải bảo vệ lãnh thổ)
if (t.hp < t.hpMax*0.25 && desired !== "defend") desired = "rest";


      // nếu rất xa người chơi & không bị xâm nhập => update đơn giản
      if (!playerInside && dToPlayer > farSkip){
        t.mode = desired;
        // chỉ kéo nhẹ về lãnh thổ/home để không "trôi" khỏi map
        const dx = t.homeX - t.x, dy = t.homeY - t.y;
        if (Math.hypot(dx,dy) > 140){
          t.x += clamp(dx, -120, 120)*dt*0.8;
          t.y += clamp(dy, -120, 120)*dt*0.8;
        }
        continue;
      }

      // action
      t.mode = desired;

      if (t.stunnedT > 0){
        // đứng khựng khi bị gầm/đánh
        t.vx = lerp(t.vx, 0, 0.25);
        t.vy = lerp(t.vy, 0, 0.25);
      } else if (t.mode === "rest"){
        // về hang nghỉ
        const dx = t.homeX - t.x;
        const dy = t.homeY - t.y;
        const d = Math.hypot(dx,dy);

        if (d < 30){
          // nằm nghỉ: hồi buồn ngủ & đói chậm (giả lập ngủ/ăn trong hang)
          t.sleep  = clamp(t.sleep - dt*2.2, 0, t.sleepMax);
          t.hunger = clamp(t.hunger + dt*2.0, 0, t.hungerMax);
          t.hp     = clamp(t.hp + dt*1.2, 0, t.hpMax);
          // đôi khi gầm nhẹ nếu người chơi đứng sát hang
          if (playerInside && Math.hypot(player.x - t.homeX, player.y - t.homeY) < 120) tigerRoar(t);
          t.vx = lerp(t.vx, 0, 0.35);
          t.vy = lerp(t.vy, 0, 0.35);
        } else {
          // đi về hang
          const sp = 105;
          const nx = dx/(d||1), ny = dy/(d||1);
          t.vx = lerp(t.vx, nx*sp, 0.12);
          t.vy = lerp(t.vy, ny*sp, 0.12);
        }
      } else if (t.mode === "patrol"){
        const wp = t.waypoints[t.wpI % t.waypoints.length];
        const dx = wp.x - t.x;
        const dy = wp.y - t.y;
        const d = Math.hypot(dx,dy);
        if (d < 26){
          t.wpI = (t.wpI + 1) % t.waypoints.length;
        }
        const sp = 110;
        const nx = dx/(d||1), ny = dy/(d||1);
        t.vx = lerp(t.vx, nx*sp, 0.10);
        t.vy = lerp(t.vy, ny*sp, 0.10);

        // nếu người chơi lạc vào lãnh thổ khi nó đang tuần tra => gầm cảnh cáo
        if (playerInside && dToPlayer < 320){
          tigerRoar(t);
        }
      } else if (t.mode === "hunt"){
        // ưu tiên ăn xác nếu đói và có xác gần
        if (t.hunger < 60){
          const nc = nearestCarcassToTiger(t);
          if (nc.c && nc.d < 60 && nc.c.meat > 0){
            tigerEat(t, nc.c);
            t.vx = lerp(t.vx, 0, 0.3);
            t.vy = lerp(t.vy, 0, 0.3);
          } else if (nc.c && nc.c.meat > 0 && inTerritoryPx(nc.c.x, nc.c.y, terr)){
            // đi tới xác để ăn
            const dx = nc.c.x - t.x;
            const dy = nc.c.y - t.y;
            const d = Math.hypot(dx,dy);
            const sp = 125;
            const nx = dx/(d||1), ny = dy/(d||1);
            t.vx = lerp(t.vx, nx*sp, 0.10);
            t.vy = lerp(t.vy, ny*sp, 0.10);
          } else {
            // tìm con mồi
            if (t.thinkT <= 0){
              t.target = pickHuntTarget(t);
              t.thinkT = 0.9 + Math.random()*0.8;
            }
            if (t.target){
              const dx = t.target.x - t.x;
              const dy = t.target.y - t.y;
              const d = Math.hypot(dx,dy);
              const sp = 150;
              const nx = dx/(d||1), ny = dy/(d||1);
              t.vx = lerp(t.vx, nx*sp, 0.11);
              t.vy = lerp(t.vy, ny*sp, 0.11);

              // tấn công con mồi
              if (d < 42 && t.attackCD <= 0){
                t.attackCD = 0.85;
                damageAnimal(t.target, 10);
              }

              // nếu con mồi chạy ra khỏi lãnh thổ => bỏ
              if (!inTerritoryPx(t.target.x, t.target.y, terr)) t.target = null;
            } else {
              // không có mục tiêu => đi lang thang
              t.vx = lerp(t.vx, (Math.random()-0.5)*80, 0.04);
              t.vy = lerp(t.vy, (Math.random()-0.5)*80, 0.04);
            }
          }
        } else {
          // không quá đói => tuần tra nhẹ
          t.vx = lerp(t.vx, (Math.random()-0.5)*60, 0.03);
          t.vy = lerp(t.vy, (Math.random()-0.5)*60, 0.03);
        }

        // nếu người chơi xâm nhập trong lúc nó đang săn => vẫn ưu tiên bảo vệ
        if (playerInside && dToPlayer < 340){
          tigerRoar(t);
          t.aggroT = Math.max(t.aggroT, 5.5);
        }
      } else if (t.mode === "defend"){
        // gầm cảnh cáo nếu người chơi mới vào hoặc đang tới gần
        if (playerInside && dToPlayer < 340) tigerRoar(t);

        const dx = player.x - t.x;
        const dy = player.y - t.y;
        const d = Math.hypot(dx,dy);

        // giữ trong lãnh thổ: nếu player đứng sát rìa, vẫn không đuổi "ra ngoài" quá nhiều
        const sp = 175;
        const nx = dx/(d||1), ny = dy/(d||1);
        t.vx = lerp(t.vx, nx*sp, 0.12);
        t.vy = lerp(t.vy, ny*sp, 0.12);

        // cận chiến
        if (d < 44 && t.attackCD <= 0){
  t.attackCD = 1.0;
  // gây sát thương người chơi (cào / cắn / vồ)
  let dmg = 7;
  let label = "Cắn!";
  const roll = Math.random();
  if (roll < 0.4){
    dmg = 5;
    label = "Cào!";
  } else if (roll > 0.85){
    dmg = 10;
    label = "Vồ!";
  }
  damagePlayer(dmg, label);

  // rung camera nhẹ
  cam.dragTargetX += (Math.random()-0.5)*14;
  cam.dragTargetY += (Math.random()-0.5)*14;
}

        // nếu người chơi rời lãnh thổ => bình tĩnh dần
        if (!playerInside && t.aggroT <= 0){
          // kéo về tuyến tuần tra để không lạc
          const back = t.waypoints[t.wpI % t.waypoints.length];
          const bdx = back.x - t.x;
          const bdy = back.y - t.y;
          const bd = Math.hypot(bdx,bdy);
          if (bd > 40){
            t.vx = lerp(t.vx, (bdx/(bd||1))*120, 0.10);
            t.vy = lerp(t.vy, (bdy/(bd||1))*120, 0.10);
          }
        }
      }

      // apply movement với va chạm & tránh bị kẹt
const oldX = t.x, oldY = t.y;
let nx = t.x + t.vx*dt;
let ny = t.y;
let r1 = collideResolveCircle(nx, ny, t.r, world);
nx = r1.x; ny = r1.y;
let nx2 = nx;
let ny2 = ny + t.vy*dt;
let r2 = collideResolveCircle(nx2, ny2, t.r, world);
const newX = r2.x, newY = r2.y;
const moved = Math.hypot(newX - oldX, newY - oldY);
const speedLen = Math.hypot(t.vx, t.vy);

t.x = newX;
t.y = newY;

// nếu bị tường chặn & hầu như không di chuyển => đổi hướng vòng qua chướng ngại
if (moved < 0.5 && speedLen > 20){
  const toPlayerDir = Math.atan2(player.y - t.y, player.x - t.x);
  const side = (Math.random() < 0.5 ? 1 : -1) * Math.PI/2;
  const ndir = toPlayerDir + side;
  const sp = speedLen;
  t.vx = Math.cos(ndir)*sp*0.9;
  t.vy = Math.sin(ndir)*sp*0.9;
}

if (Math.abs(t.vx)+Math.abs(t.vy) > 1e-2){
  t.face = Math.atan2(t.vy, t.vx);
}

    }
  }
  // hổ chủ hang đuổi người chơi bên trong hang
  function updateCaveTiger(dt){
    if (scene !== "cave") return;
    if (!caveTigerHost) return;

    const t = caveTigerHost;
    if (t.deadT > 0) return;

    // đuổi theo người chơi trong hang
    const dx = player.x - t.x;
    const dy = player.y - t.y;
    const d  = Math.hypot(dx,dy) || 0.0001;

    const sp = 170;
    const nx = dx/d, ny = dy/d;
    t.vx = lerp(t.vx, nx*sp, 0.20);
    t.vy = lerp(t.vy, ny*sp, 0.20);

    // tấn công cận chiến trong hang
    if (d < 44 && t.attackCD <= 0){
      t.attackCD = 1.0;

      // dùng style sát thương nhẹ hơn: cào 5, cắn 7, vồ 10
      let dmg = 7;
      let label = "Cắn!";
      const roll = Math.random();
      if (roll < 0.4){
        dmg = 5;
        label = "Cào!";
      } else if (roll > 0.85){
        dmg = 10;
        label = "Vồ!";
      }
      damagePlayer(dmg, label);

      // rung camera
      cam.dragTargetX += (Math.random()-0.5)*14;
      cam.dragTargetY += (Math.random()-0.5)*14;
    }

    if (t.attackCD > 0) t.attackCD = Math.max(0, t.attackCD - dt);

    // va chạm tường hang
    let nx2 = t.x + t.vx*dt;
    let ny2 = t.y;
    let r1 = collideResolveCircle(nx2, ny2, t.r, cave);
    nx2 = r1.x; ny2 = r1.y;
    let nx3 = nx2;
    let ny3 = ny2 + t.vy*dt;
    let r2 = collideResolveCircle(nx3, ny3, t.r, cave);
    t.x = r2.x; t.y = r2.y;

    if (Math.abs(t.vx)+Math.abs(t.vy) > 1e-2){
      t.face = Math.atan2(t.vy, t.vx);
    }
  }

  function drawTigerStyled(x,y, angle, style, hitFlashT=0){
    // dùng cùng phong cách của hổ người chơi, chỉ đổi màu lông
    const main = style?.main || "#f08a1b";
    const dark = style?.dark || "#d97412";
    const belly = "#ffd6a8";

    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(angle);

    if (hitFlashT > 0){
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

    // shadow
    ctx.fillStyle = "#000";
    ctx.beginPath(); ctx.ellipse(0, 14, 18, 10, 0, 0, Math.PI*2); ctx.fill();

    // body
    ctx.globalAlpha = 1;
    ctx.fillStyle = main;
    ctx.beginPath();
    ctx.ellipse(0, 5, 20, 13, 0.1, 0, Math.PI*2);
    ctx.fill();

    // belly
    ctx.fillStyle = belly;
    ctx.beginPath();
    ctx.ellipse(2, 8, 12, 7, 0.1, 0, Math.PI*2);
    ctx.fill();

    // head
    ctx.fillStyle = main;
    ctx.beginPath();
    ctx.ellipse(0, -12, 14, 12, 0, 0, Math.PI*2);
    ctx.fill();

    // muzzle
    ctx.fillStyle = belly;
    ctx.beginPath();
    ctx.ellipse(0, -8, 9, 6, 0, 0, Math.PI*2);
    ctx.fill();

    // nose + eyes
    ctx.fillStyle = "#151515";
    ctx.beginPath(); ctx.arc(0, -10, 2.0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#3a2a24";
    ctx.beginPath(); ctx.arc(-4, -13, 1.8, 0, Math.PI*2); ctx.arc(4, -13, 1.8, 0, Math.PI*2); ctx.fill();

    // stripes
    ctx.save();
    ctx.strokeStyle = "rgba(40,25,18,.9)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-8, -22); ctx.lineTo(-3, -18);
    ctx.moveTo( 8, -22); ctx.lineTo( 3, -18);
    ctx.moveTo(-7, -4);  ctx.lineTo(-2, 2);
    ctx.moveTo( 7, -4);  ctx.lineTo( 2, 2);
    ctx.stroke();

    // tail
    ctx.strokeStyle = dark;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(14, 8);
    ctx.quadraticCurveTo(24, 2, 20, -10);
    ctx.stroke();
    ctx.restore();

    // small outline
    ctx.strokeStyle = "rgba(0,0,0,.25)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 5, 20, 13, 0.1, 0, Math.PI*2);
    ctx.stroke();

    // name tag if near
    ctx.restore();
  }

  function drawRivalTigers(){
    const w = window.innerWidth, h = window.innerHeight;
    const halfW = (w/2)/cam.zoom;
    const halfH = (h/2)/cam.zoom;
    const left = cam.x - halfW - 140, right = cam.x + halfW + 140;
    const top  = cam.y - halfH - 140, bottom = cam.y + halfH + 140;

    for (const t of rivalTigers){
      if (t.deadT > 0) continue;
      if (t.x < left || t.x > right || t.y < top || t.y > bottom) continue;
      drawTigerStyled(t.x, t.y, t.face, t.palette, t.hitFlashT);

      // name label when close
      const d = Math.hypot(player.x - t.x, player.y - t.y);
      if (d < 260){
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,.55)";
        ctx.fillRect(t.x-60, t.y-52, 120, 18);
        ctx.fillStyle = "rgba(255,255,255,.92)";
        ctx.font = "12px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(t.name, t.x, t.y-39);
        ctx.restore();
      }
    }
  }


  function inBounds2(x,y,w,h){ return x>=0 && y>=0 && x<w && y<h; }
  function worldTileAtPx(px, py){
  const tx = Math.floor(px / TILE) | 0;
  const ty = Math.floor(py / TILE) | 0;
  if (!inBounds2(tx, ty, world.w, world.h)) return WT.GRASS;
  return world.tiles[ty*world.w + tx];
}
// tìm ô ngoài rừng an toàn gần một vị trí (dùng cho spawn/ra khỏi hang)
function findSafeExitWorldTile(preferTX, preferTY, radius=44){
  for (let r=0; r<=radius; r++){
    for (let oy=-r; oy<=r; oy++){
      for (let ox=-r; ox<=r; ox++){
        const tx = preferTX + ox;
        const ty = preferTY + oy;
        if (!inBounds2(tx,ty, world.w, world.h)) continue;
        const i = ty*world.w + tx;
        if (world.solid[i]) continue;

        const t = world.tiles[i];
        if (t === WT.MOUNTAIN || t === WT.MOUNTAIN_EDGE || t === WT.RIVER) continue;

        // ưu tiên cỏ, cho phép nền đường hầm nếu cần
        if (t === WT.GRASS || t === WT.CAVE_FLOOR){
          return {tx,ty};
        }
      }
    }
  }
  return null;
}


  // ===================== Player =====================
const player = {
  x: 0, y: 0, r: 12,
  speed: 210, face: 0,

  // combat
  lock: null,          // {kind:"animal"|"rival", obj}
  clawCombo: 0,        // đếm số lần cào để mở VỒ
  pounceReady: false,
  pounceT: 0, pounceDir: 0, pounceHit: false,
  pounceTarget: null,  // mục tiêu của cú vồ (nếu khoá)

  forcedSleepT: 0,
  bedSleep: false,
  sprint: false,    // giữ chuột phải để chạy nhanh
  invulnT: 0,       // thời gian bất tử ngắn sau khi bị đánh
  hitFlashT: 0,     // hiệu ứng chớp khi bị đánh
};


  // ===================== Stats =====================
  const stats = {
    hp:100, hpMax:100,
    hunger:100, hungerMax:100,
    sleep:0, sleepMax:100 // sleep = buồn ngủ (0 tốt, 100 đầy là ngất)
  };
const body = {
  wet: 0, wetMax: 100,
  cold: 0, coldMax: 100
};
  // cooldowns
  const cd = { claw:0, bite:0, pounce:0, roar:0 };

  // ===================== Animals + Carcasses =====================
const animals = [];
const carcasses = []; // {x,y,meat,ttl}
const AnimalType = {
  DEER: "deer",
  RABBIT: "rabbit",
  BOAR: "boar",
  SQUIRREL: "squirrel",
  BEAR: "bear",
  WOLF: "wolf",
};
const ANIMAL_COUNT = 320;
// ===================== Night wolves (pack spawn) =====================
// Ban đêm sẽ thỉnh thoảng sinh ra 1 bầy sói đi theo nhau để săn hổ.
// Sói đi một mình thì sẽ sợ hổ và thường bỏ chạy.
let wolfPackSeq = 1;
let nightWolfSpawnT = 6; // giây còn lại đến lần spawn tiếp
const WOLF_NIGHT_MAX = 18; // tổng số sói tối đa (tránh lag + quá khó)

function isNightTime(){
  const t = env.time;
  return (t >= 21.0 || t < 5.0);
}

function countWolves(){
  let c=0;
  for (const a of animals) if (a.type === AnimalType.WOLF) c++;
  return c;
}

function packSizeNear(wolf, radius=260){
  if (!wolf.packId) return 1;
  let c=1;
  for (const o of animals){
    if (o === wolf) continue;
    if (o.type !== AnimalType.WOLF) continue;
    if (o.packId !== wolf.packId) continue;
    if (Math.hypot(o.x-wolf.x, o.y-wolf.y) <= radius) c++;
  }
  return c;
}

function findGrassNear(px, py, minR, maxR, tries=60){
  const worldW = world.w*TILE;
  const worldH = world.h*TILE;
  for (let i=0;i<tries;i++){
    const ang = Math.random()*Math.PI*2;
    const rr = minR + Math.random()*(maxR-minR);
    const x = clamp(px + Math.cos(ang)*rr, 8, worldW-8);
    const y = clamp(py + Math.sin(ang)*rr, 8, worldH-8);
    const tx = Math.floor(x/TILE);
    const ty = Math.floor(y/TILE);
    const idx = ty*world.w + tx;
    if (world.tiles[idx] === WT.GRASS && !world.solid[idx]) return {x, y};
  }
  return null;
}

function spawnWolfAt(x, y, packId=0, isLeader=false){
  const a = {
    type: AnimalType.WOLF,
    x, y,
    r: 10,
    speed: 185,
    face: Math.random()*Math.PI*2,
    vx: 0, vy: 0,
    wanderT: 0,
    fleeT: 0,
    stunnedT: 0,
    aggroT: 0,
    attackCD: 0,
    hp: animalBaseHP(AnimalType.WOLF),
    hpMax: animalBaseHP(AnimalType.WOLF),
    hitFlashT: 0,
    packId: packId|0,
    isLeader: !!isLeader,
  };
  animals.push(a);
  return a;
}

function spawnWolfPackNearPlayer(){
  if (scene !== "world") return;
  const totalWolves = countWolves();
  if (totalWolves >= WOLF_NIGHT_MAX) return;

  const packN = 3 + ((Math.random()*3)|0); // 3..5
  const center = findGrassNear(player.x, player.y, 650, 980, 80);
  if (!center) return;

  const pid = wolfPackSeq++;
  for (let i=0;i<packN;i++){
    const jx = (Math.random()-0.5)*120;
    const jy = (Math.random()-0.5)*120;
    spawnWolfAt(center.x + jx, center.y + jy, pid, i===0);
  }
}

function updateNightWolfSpawns(dt){
  if (!isNightTime()){
    nightWolfSpawnT = Math.min(nightWolfSpawnT, 6);
    return;
  }
  if (scene !== "world") return;

  nightWolfSpawnT -= dt;
  if (nightWolfSpawnT <= 0){
    spawnWolfPackNearPlayer();
    nightWolfSpawnT = 22 + Math.random()*18; // 22..40s
  }
}

function animalBaseHP(type){
  if (type === AnimalType.DEER)      return 42;
  if (type === AnimalType.RABBIT)    return 22;
  if (type === AnimalType.BOAR)      return 68;
  if (type === AnimalType.SQUIRREL)  return 18;
  if (type === AnimalType.BEAR)      return 160;
  if (type === AnimalType.WOLF)      return 80;
  return 40;
}
function meatPortions(type){
  if (type === AnimalType.BEAR)      return 6;
  if (type === AnimalType.BOAR)      return 4;
  if (type === AnimalType.DEER)      return 3;
  if (type === AnimalType.WOLF)      return 3;
  if (type === AnimalType.RABBIT)    return 2;
  return 1;
}

function spawnAnimals(rand){
  animals.length = 0;
  carcasses.length = 0;

  for (let i = 0; i < ANIMAL_COUNT; i++){
    const typeRoll = rand();
    const type =
      (typeRoll < 0.38)  ? AnimalType.DEER :
      (typeRoll < 0.66)  ? AnimalType.RABBIT :
      (typeRoll < 0.84)  ? AnimalType.BOAR :
      (typeRoll < 0.96)  ? AnimalType.SQUIRREL :
      (typeRoll < 0.985) ? AnimalType.BEAR :
                           AnimalType.WOLF; // rất hiếm

    const a = {
      type,
      x: 0, y: 0,
      r:
        type === AnimalType.DEER     ? 10 :
        type === AnimalType.BOAR     ? 11 :
        type === AnimalType.SQUIRREL ? 7  :
        type === AnimalType.BEAR     ? 14 :
        type === AnimalType.WOLF     ? 10 : 8,
      speed:
        type === AnimalType.RABBIT   ? 155 :
        type === AnimalType.DEER     ? 130 :
        type === AnimalType.BOAR     ? 115 :
        type === AnimalType.SQUIRREL ? 175 :
        type === AnimalType.BEAR     ? 120 :
        type === AnimalType.WOLF     ? 185 : 140,
      face: rand()*Math.PI*2,
      vx: 0, vy: 0,
      wanderT: 0,
      fleeT: 0,
      stunnedT: 0,
      aggroT: 0,      // thời gian còn đuổi hổ (gấu / sói)
      attackCD: 0,    // hồi chiêu tấn công cận chiến
      hp: animalBaseHP(type),
      hpMax: animalBaseHP(type),
    };

    // random vị trí ngoài rừng (tránh hang)
    for (let tries = 0; tries < 1400; tries++){
      const tx = (rand()*world.w)|0;
      const ty = (rand()*world.h)|0;
      const ti = ty*world.w + tx;
      if (world.solid[ti]) continue;
      if (world.tiles[ti] !== WT.GRASS) continue;
      const dx = tx - world.cave.cx;
      const dy = ty - world.cave.cy;
      if (Math.hypot(dx,dy) < world.cave.r + 18) continue;

      a.x = tx*TILE + TILE/2;
      a.y = ty*TILE + TILE/2;
      break;
    }
    animals.push(a);
  }
  animalCountLabel.textContent = String(animals.length);
}


function damageAnimal(a, dmg){
  a.hp -= dmg;
  addFxText(a.x, a.y-18, `-${dmg}`, 0.55);

  const isPredator = (a.type === AnimalType.BEAR || a.type === AnimalType.WOLF);

  if (a.hp <= 0){
    // tạo xác
    carcasses.push({ x:a.x, y:a.y, meat: meatPortions(a.type), ttl: 70 });
    addFxText(a.x, a.y-26, "Hạ gục!", 0.9);
    const idx = animals.indexOf(a);
    if (idx >= 0) animals.splice(idx, 1);
    animalCountLabel.textContent = String(animals.length);
    return true;
  } else {
    if (isPredator){
      a.aggroT = Math.max(a.aggroT || 0, 6.0); // gấu / sói càng bị đánh càng hăng
      a.fleeT  = Math.max(a.fleeT, 0.3);
    } else {
      a.fleeT = Math.max(a.fleeT, 2.0);
    }
    return false;
  }
}

// hổ bị mất máu
function damagePlayer(dmg, label){
  if (stats.hp <= 0.01) return false;
  if (player.invulnT > 0) return false;

  stats.hp = clamp(stats.hp - dmg, 0, stats.hpMax);
  player.invulnT   = 0.7;   // 0.7s miễn sát thương
  player.hitFlashT = 0.25;  // vòng đỏ chớp 1 chút

  addFxText(player.x, player.y - 26, `-${dmg}`, 0.7);
  if (label){
    addFxText(player.x, player.y - 40, label, 0.9);
  }

  // rung camera nhẹ
  cam.dragTargetX += (Math.random()-0.5)*10;
  cam.dragTargetY += (Math.random()-0.5)*10;

  return true;
}


  // ===================== Animal update =====================
  function updateAnimals(dt){
  updateNightWolfSpawns(dt);
  const detect = 210;
  const farSkip = 1200; // map lớn: thú ở xa không cần AI đầy đủ

  for (const a of animals){
    if (a.stunnedT > 0){
      a.stunnedT = Math.max(0, a.stunnedT - dt);
      a.vx = lerp(a.vx, 0, 0.25);
      a.vy = lerp(a.vy, 0, 0.25);
      continue;
    }

    if (a.attackCD > 0) a.attackCD = Math.max(0, a.attackCD - dt);
    if (a.aggroT   > 0) a.aggroT   = Math.max(0, a.aggroT   - dt);

    const toPx = player.x - a.x;
    const toPy = player.y - a.y;
    const distP = Math.hypot(toPx, toPy);
    if (distP > farSkip){
      // chỉ trôi chậm theo quán tính
      a.wanderT = (a.wanderT||0) - dt;
      a.vx = lerp(a.vx, 0, 0.04);
      a.vy = lerp(a.vy, 0, 0.04);
      continue;
    }
    const d    = Math.hypot(toPx, toPy) || 0.0001;
    const dirPX = toPx / d;
    const dirPY = toPy / d;

    const type       = a.type;
    const isBoar     = (type === AnimalType.BOAR);
    const isBear     = (type === AnimalType.BEAR);
    const isWolf = (type === AnimalType.WOLF);

// Sói: nếu đi 1 mình thì sợ hổ; chỉ "liều" khi có bầy (và chủ yếu ban đêm)
const wolfPackSz = isWolf ? packSizeNear(a, 260) : 1;
const wolfBrave  = isWolf && isNightTime() && wolfPackSz >= 2;

const isPredator = isBear || wolfBrave;

// bán kính phát hiện riêng cho sói
const detectP = isWolf ? (wolfBrave ? 330 : 240) : detect;
if (isPredator){
  if (d < detectP){
    a.aggroT = Math.max(a.aggroT, 5.0);

    // bầy sói chia sẻ aggro: 1 con thấy -> cả bầy lao tới
    if (isWolf && a.packId){
      for (const o of animals){
        if (o.type !== AnimalType.WOLF) continue;
        if (o.packId !== a.packId) continue;
        o.aggroT = Math.max(o.aggroT, 4.0);
      }
    }
  }
  if (a.hp < a.hpMax){
    a.aggroT = Math.max(a.aggroT, 7.0);
  }
} else {
  if (d < detectP) a.fleeT = Math.max(a.fleeT, isWolf ? 2.0 : 1.2);
}

    // phát hiện hổ
    if (isPredator){
      if (d < detect){
        a.aggroT = Math.max(a.aggroT, 5.0); // thấy là đuổi
      }
      if (a.hp < a.hpMax){
        a.aggroT = Math.max(a.aggroT, 7.0); // bị đánh càng hăng
      }
    } else {
      if (d < detect) a.fleeT = Math.max(a.fleeT, 1.2); // nai / thỏ / sóc / heo sợ hổ
    }

    // heo rừng / gấu / sói tấn công cận chiến khi rất gần
    const closeRange =
      isBoar ? 42 :
      isBear ? 46 :
      isWolf ? 36 : 0;

    if (closeRange > 0 && d < closeRange && a.attackCD <= 0 && !locked()){
      let label = "";
      let dmg   = 0;
      if (isBoar){
        dmg   = 5;
        label = "Heo rừng húc!";
      } else if (isBear){
        dmg   = 15;
        label = "Gấu tấn công!";
      } else if (isWolf){
        dmg   = 10;
        label = "Sói cắn!";
      }
      if (dmg > 0 && damagePlayer(dmg, label)){
        a.attackCD = isBoar ? 3.5 : 2.2;
        if (!isPredator){
          // heo húc xong chạy
          a.fleeT = Math.max(a.fleeT, 2.0);
        } else {
          // gấu / sói hăng máu tiếp tục đuổi
          a.aggroT = Math.max(a.aggroT, 3.0);
        }
      }
    }

    let mode = "wander";

    if (isPredator && a.aggroT > 0){
      mode = "chase";
    } else if (!isPredator && a.fleeT > 0){
      a.fleeT = Math.max(a.fleeT - dt, 0);
      mode = "flee";
    } else {
      a.fleeT = Math.max(a.fleeT - dt, 0);
    }

    if (mode === "chase"){
      const baseSpeed = a.speed;
      const boost = isBear ? 1.05 : 1.3; // sói chạy nhanh hơn
      a.vx = lerp(a.vx, dirPX * baseSpeed * boost, 0.20);
      a.vy = lerp(a.vy, dirPY * baseSpeed * boost, 0.20);
    } else if (mode === "flee"){
      const awayX = -dirPX;
      const awayY = -dirPY;
      const boost =
        (type === AnimalType.RABBIT)   ? 1.35 :
        (type === AnimalType.DEER)     ? 1.25 :
        (type === AnimalType.SQUIRREL) ? 1.45 :
        (type === AnimalType.BOAR)     ? 1.15 :
                                         1.0;

      a.vx = lerp(a.vx, awayX * a.speed * boost, 0.22);
      a.vy = lerp(a.vy, awayY * a.speed * boost, 0.22);
    } else {
      // đi lang thang
      a.wanderT -= dt;
      if (a.wanderT <= 0){
        a.wanderT = 0.6 + Math.random()*1.4;
        a.face += (Math.random()-0.5)*0.9;
      }
      const ax = Math.cos(a.face);
      const ay = Math.sin(a.face);
      const wanderSpeed = (isBear || isWolf) ? 0.55 : 0.45;
      a.vx = lerp(a.vx, ax * a.speed * wanderSpeed, 0.08);
      a.vy = lerp(a.vy, ay * a.speed * wanderSpeed, 0.08);
    }

    // di chuyển có va chạm
    let nx = a.x + a.vx*dt;
    let ny = a.y;
    let r1 = collideResolveCircle(nx, ny, a.r, world);
    nx = r1.x; ny = r1.y;

    let nx2 = nx;
    let ny2 = ny + a.vy*dt;
    let r2 = collideResolveCircle(nx2, ny2, a.r, world);
    a.x = r2.x; a.y = r2.y;

    if (Math.abs(a.vx)+Math.abs(a.vy) > 1e-2){
      a.face = Math.atan2(a.vy, a.vx);
    }
  }

  // thời gian tồn tại xác
  for (let i = carcasses.length-1; i >= 0; i--){
    carcasses[i].ttl -= dt;
    if (carcasses[i].ttl <= 0 || carcasses[i].meat <= 0) carcasses.splice(i,1);
  }
}


