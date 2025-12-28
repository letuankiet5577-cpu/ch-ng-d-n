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

  
// ===== helper: wander movement for cave family =====
function pickWanderPointAround(cx, cy, rad){
  const a = Math.random()*Math.PI*2;
  const r = Math.random()*rad;
  return { x: cx + Math.cos(a)*r, y: cy + Math.sin(a)*r };
}
function wanderEnt(map, ent, dt, cx, cy, rad, baseSp){
  if (typeof ent.wanderT !== "number") ent.wanderT = 0;
  if (!isFinite(ent.wanderX) || !isFinite(ent.wanderY)) ent.wanderT = 0;

  const near = (Math.hypot((ent.wanderX||cx) - ent.x, (ent.wanderY||cy) - ent.y) < 18);
  if (ent.wanderT <= 0 || near){
    const p = pickWanderPointAround(cx, cy, rad);
    ent.wanderX = p.x; ent.wanderY = p.y;
    ent.wanderT = 1.6 + Math.random()*2.6;
  } else {
    ent.wanderT = Math.max(0, ent.wanderT - dt);
  }

  const dx = (ent.wanderX||cx) - ent.x;
  const dy = (ent.wanderY||cy) - ent.y;
  const d  = Math.hypot(dx,dy) || 0.0001;

  const sp = baseSp;
  ent.vx = lerp(ent.vx||0, (dx/d)*sp, 0.10);
  ent.vy = lerp(ent.vy||0, (dy/d)*sp, 0.10);

  moveWithObstacleAvoid(map, ent, dt);
  if (Math.abs(ent.vx)+Math.abs(ent.vy) > 1e-2) ent.face = Math.atan2(ent.vy, ent.vx);
}

// vợ / con trong hang của hổ NPC
  function updateCaveFamily(dt){
    if (scene !== "cave") return;
    if (!caveMateNPC && (!Array.isArray(caveCubNPCs) || caveCubNPCs.length===0)) return;

    // update mate bubble
    if (caveMateNPC && caveMateNPC.bubbleT > 0){
      caveMateNPC.bubbleT = Math.max(0, caveMateNPC.bubbleT - dt);
      if (caveMateNPC.bubbleT <= 0) caveMateNPC.bubbleText = "";
    }
    if (caveMateNPC && caveMateNPC.worryCD > 0) caveMateNPC.worryCD = Math.max(0, caveMateNPC.worryCD - dt);
    for (const c of (caveCubNPCs||[])){
      if (c.whineCD > 0) c.whineCD = Math.max(0, c.whineCD - dt);
    }

    const mate = caveMateNPC;

    if (mate){
      const dP = Math.hypot(player.x - mate.x, player.y - mate.y);

      // khi người chơi xâm nhập hang: vợ sợ chạy và kêu cứu
      if (dP < 260 && !mate.callDone){
        mate.callDone = true;
        mate.scared = true;

        const lines = (caveTigerHost && caveTigerHost.voice && Array.isArray(caveTigerHost.voice.mateCall) && caveTigerHost.voice.mateCall.length)
          ? caveTigerHost.voice.mateCall
          : ["Có kẻ lạ!", "Cứu em với!"];
        const line = lines[(Math.random()*lines.length)|0];
        mate.bubbleText = line;
        mate.bubbleT = 2.6;
        showToast(`🐯♀ ${mate.name}: ${line}`, 1.25);

        if (caveTigerHost){
          caveTigerHost.aggroT = Math.max(caveTigerHost.aggroT, 12.0);
          caveTigerHost.enrageT = Math.max(caveTigerHost.enrageT, 18.0); // tức giận đánh mạnh hơn
        }
      }

      // vợ lo cho chồng khi chồng bị yếu máu
      if (caveTigerHost && mate.callDone && caveTigerHost.hp < caveTigerHost.hpMax*0.60 && mate.worryCD <= 0){
        const lines = (caveTigerHost.voice && Array.isArray(caveTigerHost.voice.worry) && caveTigerHost.voice.worry.length)
          ? caveTigerHost.voice.worry
          : ["Mình ơi cẩn thận!","Đánh đuổi hắn đi!"];
        mate.bubbleText = lines[(Math.random()*lines.length)|0];
        mate.bubbleT = 2.2;
        mate.worryCD = 8.0;
      }
// movement:
// - bình thường: đi lại quanh ổ (không đứng im)
// - khi sợ (có kẻ lạ): chạy về ổ và núp gần đó
const homeX = mate.homeX;
const homeY = mate.homeY;

if (mate.scared){
  const mdx = homeX - mate.x;
  const mdy = homeY - mate.y;
  const md = Math.hypot(mdx, mdy) || 0.0001;

  if (md > 10){
    const sp = 190;
    mate.vx = lerp(mate.vx||0, (mdx/md)*sp, 0.18);
    mate.vy = lerp(mate.vy||0, (mdy/md)*sp, 0.18);
    moveWithObstacleAvoid(cave, mate, dt);
    if (Math.abs(mate.vx)+Math.abs(mate.vy) > 1e-2) mate.face = Math.atan2(mate.vy, mate.vx);
  } else {
    // đã về ổ: đi nhẹ quanh ổ (đỡ cảm giác bị kẹt)
    wanderEnt(cave, mate, dt, homeX, homeY, 46, 62);
  }
} else {
  // đi tự do quanh ổ khi chưa có kẻ lạ
  wanderEnt(cave, mate, dt, homeX, homeY, 88, 78);
}
  // con đi theo mẹ (khi bình thường: quanh mẹ; khi sợ: bám sát và chạy về ổ)
  for (let i=0; i<(caveCubNPCs||[]).length; i++){
    const c = caveCubNPCs[i];

    // hành vi:
    // - khi mẹ sợ: chạy theo mẹ về ổ
    // - bình thường: con đi quanh mẹ (random) nhưng không đi quá xa ổ
    if (mate.scared){
      const ox = (i%2? -12: 12);
      const oy = (i<2? 10: -10);
      const tx = mate.x + ox;
      const ty = mate.y + oy;
      const dx = tx - c.x;
      const dy = ty - c.y;
      const d = Math.hypot(dx,dy) || 0.0001;
      const sp = 175;
      c.vx = lerp(c.vx||0, (dx/d)*sp, 0.18);
      c.vy = lerp(c.vy||0, (dy/d)*sp, 0.18);
      moveWithObstacleAvoid(cave, c, dt);
      if (Math.abs(c.vx)+Math.abs(c.vy) > 1e-2) c.face = Math.atan2(c.vy, c.vx);
    } else {
      // đi quanh mẹ
      wanderEnt(cave, c, dt, mate.x, mate.y, 58, 92);

      // không cho đi quá xa ổ
      const dd = Math.hypot(c.x - mate.homeX, c.y - mate.homeY);
      if (dd > 170){
        const dx = mate.homeX - c.x;
        const dy = mate.homeY - c.y;
        const d = Math.hypot(dx,dy) || 0.0001;
        c.vx = lerp(c.vx||0, (dx/d)*110, 0.12);
        c.vy = lerp(c.vy||0, (dy/d)*110, 0.12);
        moveWithObstacleAvoid(cave, c, dt);
      }
    }

    const dp = Math.hypot(player.x - c.x, player.y - c.y);
    if (dp < 220 && c.whineCD <= 0){
      c.whineCD = 8.0;
      if (Math.random() < 0.22){
        showToast("🐯 con: ư... ư...", 0.9);
      }
    }
  }
} else {

      // Không có vợ nhưng có con (single dad): con sợ chạy về ổ và hổ đực tức giận hơn
      const host = caveTigerHost;

      if (host && typeof host.cubAlarmDone !== "boolean") host.cubAlarmDone = false;

      let anyNear = false;

      for (let i=0; i<(caveCubNPCs||[]).length; i++){
        const c = caveCubNPCs[i];

        const homeX = (typeof c.homeX === "number") ? c.homeX : ((cave && cave.bed) ? (cave.bed.x + 48) : c.x);
        const homeY = (typeof c.homeY === "number") ? c.homeY : ((cave && cave.bed) ? (cave.bed.y - 18) : c.y);

        const dp = Math.hypot(player.x - c.x, player.y - c.y);
        if (dp < 240) anyNear = true;

        // con kêu nhỏ khi có người lạ
        if (dp < 220 && c.whineCD <= 0){
          c.whineCD = 8.0;
          if (Math.random() < 0.35){
            showToast("🐯 con: ư... ư...", 0.9);
          }
        }
// di chuyển:
// - khi có người lạ: chạy về ổ
// - bình thường: đi quanh ổ (đỡ cảm giác "kẹt")
if (dp < 240){
  const dx = homeX - c.x;
  const dy = homeY - c.y;
  const d = Math.hypot(dx,dy) || 0.0001;
  const sp = 175;
  c.vx = lerp(c.vx||0, (dx/d)*sp, 0.18);
  c.vy = lerp(c.vy||0, (dy/d)*sp, 0.18);
  moveWithObstacleAvoid(cave, c, dt);
  if (Math.abs(c.vx)+Math.abs(c.vy) > 1e-2) c.face = Math.atan2(c.vy, c.vx);
} else {
  wanderEnt(cave, c, dt, homeX, homeY, 78, 88);
}
      }

      if (host && anyNear && !host.cubAlarmDone){
        host.cubAlarmDone = true;
        host.aggroT = Math.max(host.aggroT, 12.0);
        host.enrageT = Math.max(host.enrageT, 18.0);

        // thoại hổ đực khi có kẻ lạ tới gần con
        const line = "Tránh xa con ta!";
        showToast(`🐯 ${host.name}: ${line}`, 1.15);
      }
    }
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

  // ===================== NPC obstacle-avoid movement =====================
  function stepCircle(map, x, y, r, dx, dy, opt){
    let nx = x + dx, ny = y;
    let r1 = collideResolveCircle(nx, ny, r, map, opt);
    nx = r1.x; ny = r1.y;
    let nx2 = nx, ny2 = ny + dy;
    let r2 = collideResolveCircle(nx2, ny2, r, map, opt);
    return {x:r2.x, y:r2.y};
  }

  // tránh vật cản kiểu "steering": thử nhiều hướng quanh hướng mong muốn
  function moveWithObstacleAvoid(map, ent, dt){
    const sp = Math.hypot(ent.vx, ent.vy);
    if (sp < 1e-3) return;

    const baseDir = Math.atan2(ent.vy, ent.vx);
    const angs = [0, 0.28, -0.28, 0.56, -0.56, 0.92, -0.92, 1.22, -1.22, Math.PI];

    let best = null;
    for (const off of angs){
      const dir = baseDir + off;
      const dx = Math.cos(dir) * sp * dt;
      const dy = Math.sin(dir) * sp * dt;
      const p = stepCircle(map, ent.x, ent.y, ent.r, dx, dy, (ent.canWade && map===world)?{wade:true}:null);
      const moved = Math.hypot(p.x - ent.x, p.y - ent.y);
      if (moved < 0.35) continue;

      // score: ưu tiên đi được xa + ít lệch hướng
      const score = moved - Math.abs(off) * 0.18;
      if (!best || score > best.score){
        best = {x:p.x, y:p.y, dir, score};
      }
    }

    if (!best){
      // kẹt hoàn toàn => giảm tốc để đỡ "đâm tường"
      ent.vx = lerp(ent.vx, 0, 0.25);
      ent.vy = lerp(ent.vy, 0, 0.25);
      return;
    }

    ent.x = best.x;
    ent.y = best.y;

    // nếu phải rẽ nhiều để né, chỉnh lại hướng chạy
    const turn = Math.abs(best.dir - baseDir);
    if (turn > 0.25){
      ent.vx = Math.cos(best.dir) * sp;
      ent.vy = Math.sin(best.dir) * sp;
    }
  }

  function updateRivalTigers(dt){
    if (scene !== "world") return;

    // culling nhẹ để tối ưu: chỉ update đầy đủ nếu ở gần người chơi
    const farSkip = 1300;

    for (const t of rivalTigers){
      // đảm bảo field mới luôn tồn tại (khi load save cũ)
      if (typeof t.speakCD !== "number") t.speakCD = 0;
      if (typeof t.enrageT !== "number") t.enrageT = 0;
      if (typeof t.bubbleT !== "number") t.bubbleT = 0;
      if (typeof t.bubbleText !== "string") t.bubbleText = "";

      // Intruder tiger: auto roar + despawn timer support
      if (t.isIntruder){
        if (typeof t.__spawnRoarDone !== "boolean") t.__spawnRoarDone = false;
        if (typeof t.__despawnT !== "number") t.__despawnT = 0;
        if (t.__despawnT > 0){
          t.__despawnT = Math.max(0, t.__despawnT - dt);
          if (t.__despawnT <= 0){
            // remove from list
            const idx = rivalTigers.indexOf(t);
            if (idx >= 0) { rivalTigers.splice(idx, 1); }
            continue;
          }
        }
        if (!t.__spawnRoarDone){
          t.__spawnRoarDone = true;
          const lines = (t.voice && Array.isArray(t.voice.territory) && t.voice.territory.length)
            ? t.voice.territory
            : ["Grrr!"];
          const line = lines[(Math.random()*lines.length)|0];
          t.bubbleText = line;
          t.bubbleT = 2.8;
          showToast(`🐯 ${t.name}: ${line}`, 1.25);
          if (typeof addCameraShake === "function") addCameraShake(16, 0.35);
        }
      }

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
      if (t.speakCD > 0) t.speakCD = Math.max(0, t.speakCD - dt);
      if (t.bubbleT > 0){ t.bubbleT = Math.max(0, t.bubbleT - dt); if (t.bubbleT<=0) t.bubbleText = ""; }
      if (t.enrageT > 0) t.enrageT = Math.max(0, t.enrageT - dt);
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

      // Nếu có bầy sói xâm nhập lãnh thổ: hổ đực NPC sẽ đánh sói, và sói cũng có thể tấn công lại.
      // (Điều này hoạt động cho cả sói nhiệm vụ và sói spawn tự nhiên ban đêm.)
      let wolfThreat = null;
      try{
        const nw = nearestWolfInTerritory(terr, t.x, t.y, 560);
        if (nw && nw.w){
          wolfThreat = nw.w;
          // bị sói quấy phá => tăng aggro để nó quay sang phòng thủ
          t.aggroT = Math.max(t.aggroT, 6.5);
        }
      }catch(_){}

      // nói chuyện đuổi đánh (mỗi NPC có câu khác nhau)
      if (playerInside && dToPlayer < 360 && t.speakCD <= 0){
        const lines = (t.voice && Array.isArray(t.voice.territory) && t.voice.territory.length)
          ? t.voice.territory
          : ["Cút khỏi đây!","Lãnh thổ của ta!","Đừng tới gần!"];
        const line = lines[(Math.random()*lines.length)|0];
        t.bubbleText = line;
        t.bubbleT = 2.6;
        showToast(`🐯 ${t.name}: ${line}`, 1.15);
        t.speakCD = 6.5 + Math.random()*4.0;

        // nếu nó có vợ/con, nó sẽ dễ "tức" hơn khi bị xâm nhập
        if (t.family && t.family.hasMate){
          t.enrageT = Math.max(t.enrageT, 6.0);
        }
      }

      let desired = scheduleTigerMode(env.time);
if (playerInside) desired = "defend";
if (wolfThreat && !playerInside) desired = "defend";
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
        // gầm cảnh cáo nếu người chơi mới vào hoặc đang tới gần (hoặc khi có sói xâm nhập)
        if ((playerInside && dToPlayer < 340) || (wolfThreat && !playerInside && Math.hypot(wolfThreat.x - t.x, wolfThreat.y - t.y) < 360)) tigerRoar(t);

        const target = (wolfThreat && !playerInside) ? wolfThreat : player;

        const dx = target.x - t.x;
        const dy = target.y - t.y;
        const d = Math.hypot(dx,dy);

        // giữ trong lãnh thổ: nếu player đứng sát rìa, vẫn không đuổi "ra ngoài" quá nhiều
        let sp = 175;
        if (t.enrageT > 0) sp *= 1.15; // tức giận => chạy nhanh hơn
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
  // tức giận => đánh mạnh hơn
  const mul = (t.enrageT > 0) ? 1.35 : 1.0;
  // boss intruder: mạnh hơn, máu nhiều
  const bossMul = t.isIntruder ? 1.75 : 1.0;
  dmg = Math.max(1, Math.round(dmg * mul * bossMul));
  if (mul > 1) label = label.replace(/!+$/, "!!");
  if (bossMul > 1) label = label.replace(/!+$/, "!!!");

  const adir = Math.atan2(target.y - t.y, target.x - t.x);
  addFxSlash(t.x + Math.cos(adir)*22, t.y + Math.sin(adir)*22, adir, 0.24);
  addFxSlash(t.x + Math.cos(adir)*18, t.y + Math.sin(adir)*18, adir + (Math.random()-0.5)*0.28, 0.18);
  if (target && target.type === AnimalType.WOLF){
    // hổ đực NPC tấn công sói
    damageAnimal(target, Math.max(10, Math.round(dmg*1.2)));
  } else {
    damagePlayer(dmg, label);
  }
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

            // apply movement với va chạm + né vật cản (đỡ kẹt tường)
      moveWithObstacleAvoid(world, t, dt);

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

    if (typeof t.speakCD !== "number") t.speakCD = 0;
    if (typeof t.bubbleT !== "number") t.bubbleT = 0;
    if (typeof t.bubbleText !== "string") t.bubbleText = "";
    if (t.speakCD > 0) t.speakCD = Math.max(0, t.speakCD - dt);
    if (t.bubbleT > 0){ t.bubbleT = Math.max(0, t.bubbleT - dt); if (t.bubbleT<=0) t.bubbleText = ""; }

    if (typeof t.enrageT === "number" && t.enrageT > 0) t.enrageT = Math.max(0, t.enrageT - dt);

    // đuổi theo người chơi trong hang
    const dx = player.x - t.x;
    const dy = player.y - t.y;
    const d  = Math.hypot(dx,dy) || 0.0001;


// thoại đuổi người chơi trong hang (hiện bubble + toast)
if (d < 360 && t.speakCD <= 0){
  const lines = (t.voice && Array.isArray(t.voice.cave) && t.voice.cave.length)
    ? t.voice.cave
    : ["Ra khỏi đây!","Vào hang là chết!"];
  const line = lines[(Math.random()*lines.length)|0];
  t.bubbleText = line;
  t.bubbleT = 2.6;
  showToast(`🐯 ${t.name}: ${line}`, 1.05);
  t.speakCD = 7.0 + Math.random()*4.0;
}

    let sp = 170;
    if (t.enrageT > 0) sp *= 1.15;
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
      // tức giận => đánh mạnh hơn
      const mul = (t.enrageT > 0) ? 1.35 : 1.0;
      dmg = Math.max(1, Math.round(dmg * mul));
      if (mul > 1) label = label.replace(/!+$/, "!!");

      const adir = Math.atan2(player.y - t.y, player.x - t.x);
      addFxSlash(t.x + Math.cos(adir)*22, t.y + Math.sin(adir)*22, adir, 0.24);
      addFxSlash(t.x + Math.cos(adir)*18, t.y + Math.sin(adir)*18, adir + (Math.random()-0.5)*0.28, 0.18);
      damagePlayer(dmg, label);
    }

    if (t.attackCD > 0) t.attackCD = Math.max(0, t.attackCD - dt);

        // va chạm tường hang + né vật cản (đỡ kẹt tường)
    moveWithObstacleAvoid(cave, t, dt);

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
      if (t.bubbleT > 0 && t.bubbleText && typeof drawSpeechBubble === "function"){
        drawSpeechBubble(t.x, t.y - 60, t.bubbleText);
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
    dom: {t0: Math.random()},
    hitFlashT: 0,
    // pack
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


// Spawn đàn sói "raid" cho nhiệm vụ cốt truyện (ngoài cửa hang của bạn)

// Spawn đàn sói "raid" cho nhiệm vụ cốt truyện (rải rác trong lãnh thổ người chơi)
function spawnQuestWolfRaid(packs=10, perPack=3){
  try{
    if (!world || !world.caveMouth || typeof animals === "undefined") return;

    // tương thích ngược: nếu chỉ truyền 1 số, coi như tổng sói và tự chia bầy
    if (perPack == null){
      const total = Math.max(6, packs|0);
      packs = 10;
      perPack = Math.max(2, Math.round(total / packs));
    }

    packs = Math.max(3, packs|0);
    perPack = Math.max(2, perPack|0);

    // xoá sói quest cũ (nếu có)
    for (let i = animals.length-1; i >= 0; i--){
      const a = animals[i];
      if (a && a.type === AnimalType.WOLF && a.questTag === "wolf_night"){
        animals.splice(i, 1);
      }
    }

    const mouth = world.caveMouth;
    // NOTE: mouth lưu theo TILE (tx,ty). Chuyển sang pixel để tính đúng khoảng cách & lãnh thổ.
    const mouthPx = { x: mouth.x*TILE + TILE/2, y: mouth.y*TILE + TILE/2 };

    // giới hạn spawn trong lãnh thổ chứa hang của bạn
    let rect = { x0: 0, y0: 0, x1: world.w*TILE, y1: world.h*TILE };
    // ưu tiên lãnh thổ của người chơi (tránh lỗi spawn nhầm)
    try{
      if (typeof territories !== "undefined" && Array.isArray(territories)){
        const pt = territories.find(tt => tt && tt.isPlayer);
        if (pt && pt.px0 != null){
          rect = { x0: pt.px0, y0: pt.py0, x1: pt.px1, y1: pt.py1 };
        }
      }
    }catch(_){}
    try{
      if (typeof territoryIdAt === "function" && typeof getTerritoryById === "function"){
        const tid = territoryIdAt(mouthPx.x, mouthPx.y);
        const terr = getTerritoryById(tid);
        if (terr && terr.px0 != null){
          rect = { x0: terr.px0, y0: terr.py0, x1: terr.px1, y1: terr.py1 };
        }
      }
    }catch(_){}

    // spawn quanh hang của người chơi (không sát cửa hang để tránh kẹt)
    const minFromCave = 170;   // tối thiểu cách cửa hang (px)
    const ringMinR    = 240;   // bán kính tối thiểu để "rải quanh" (px)
    const ringMaxR    = 900;   // bán kính tối đa (px)
    const minBetween  = 260;   // các bầy cách nhau
    const margin      = 120;   // tránh rìa lãnh thổ
    const worldW = world.w*TILE;
    const worldH = world.h*TILE;

    function goodTile(tx, ty){
      if (tx < 2 || ty < 2 || tx >= world.w-2 || ty >= world.h-2) return false;
      const idx = ty*world.w + tx;
      if (world.tiles[idx] !== WT.GRASS || world.solid[idx]) return false;
      // clearance để tránh kẹt vào tường/đá
      for (let dy=-2; dy<=2; dy++){
        for (let dx=-2; dx<=2; dx++){
          const ii = (ty+dy)*world.w + (tx+dx);
          if (world.solid[ii]) return false;
        }
      }
      return true;
    }

    function pickCenter(tries=260){
      const x0 = rect.x0 + margin, y0 = rect.y0 + margin;
      const x1 = rect.x1 - margin, y1 = rect.y1 - margin;

      // ưu tiên rải quanh hang theo vòng tròn để người chơi đi tuần cũng gặp bầy sói
      for (let i=0; i<tries; i++){
        const ang = Math.random()*Math.PI*2;
        const rr  = ringMinR + Math.random()*(ringMaxR - ringMinR);
        const x   = mouthPx.x + Math.cos(ang)*rr + (Math.random()-0.5)*90;
        const y   = mouthPx.y + Math.sin(ang)*rr + (Math.random()-0.5)*90;

        if (x < x0 || x > x1 || y < y0 || y > y1) continue;
        if (Math.hypot(x - mouthPx.x, y - mouthPx.y) < minFromCave) continue;

        const tx = (x / TILE) | 0;
        const ty = (y / TILE) | 0;
        if (!goodTile(tx,ty)) continue;
        return {x,y};
      }

      // fallback: random trong lãnh thổ nhưng vẫn giữ khoảng cách với hang
      for (let i=0; i<tries; i++){
        const x = x0 + Math.random()*(x1-x0);
        const y = y0 + Math.random()*(y1-y0);
        if (Math.hypot(x - mouthPx.x, y - mouthPx.y) < ringMinR) continue;
        const tx = (x / TILE) | 0;
        const ty = (y / TILE) | 0;
        if (!goodTile(tx,ty)) continue;
        return {x,y};
      }

      return null;
    }

    const centers = [];
    for (let p=0; p<packs; p++){
      let c = null;

      // thử nhiều lần để tránh quá gần các center khác
      for (let t=0; t<6; t++){
        c = pickCenter(300);
        if (!c) break;
        let ok = true;
        for (const o of centers){
          if (Math.hypot(c.x-o.x, c.y-o.y) < minBetween){ ok = false; break; }
        }
        if (ok) break;
        c = null;
      }

      if (!c){
        // fallback: vẫn trong lãnh thổ, nới lỏng khoảng cách giữa các bầy
        for (let i=0; i<520; i++){
          const x = (rect.x0 + margin) + Math.random()*((rect.x1 - margin) - (rect.x0 + margin));
          const y = (rect.y0 + margin) + Math.random()*((rect.y1 - margin) - (rect.y0 + margin));
          if (Math.hypot(x - mouthPx.x, y - mouthPx.y) < ringMinR) continue;

          const tx = (x / TILE) | 0;
          const ty = (y / TILE) | 0;
          if (!goodTile(tx,ty)) continue;

          let ok = true;
          for (const o of centers){
            if (Math.hypot(x-o.x, y-o.y) < 420){ ok = false; break; }
          }
          if (!ok) continue;

          c = {x,y};
          break;
        }
      }
      if (c) centers.push(c);
    }

    for (let p=0; p<centers.length; p++){
      const center = centers[p];
      const pid = (wolfPackSeq++ + 7000);

      for (let i=0; i<perPack; i++){
        let x = center.x, y = center.y;
        let placed = false;

        for (let t=0; t<55; t++){
          const ang = Math.random()*Math.PI*2;
          const rr  = 60 + Math.random()*220;
          const xx  = clamp(center.x + Math.cos(ang)*rr, 8, worldW-8);
          const yy  = clamp(center.y + Math.sin(ang)*rr, 8, worldH-8);
          const tx  = (xx / TILE) | 0;
          const ty  = (yy / TILE) | 0;
          if (!goodTile(tx,ty)) continue;
          x = xx; y = yy;
          placed = true;
          break;
        }

        // nếu không tìm được vị trí tốt quanh center, đặt luôn tại center (đã là tile tốt)
        if (!placed){
          x = clamp(center.x, 8, worldW-8);
          y = clamp(center.y, 8, worldH-8);
        }

        const a = spawnWolfAt(x, y, pid, i===0);
        a.questTag = "wolf_night";
        a.aggroT   = Math.max(a.aggroT || 0, 10.0);
        a.hp       = Math.round(a.hp * 0.92);
        a.hpMax    = a.hp;
      }
    }

    try{ animalCountLabel.textContent = String(animals.length); }catch(_){}
  }catch(_){}
}

// ===================== Story boss: Intruder tiger =====================
// Tạo 1 hổ đực lạ xâm nhập lãnh thổ người chơi. Được đẩy vào mảng rivalTigers
// để hệ thống khoá mục tiêu/combat hiện có hoạt động luôn.
function spawnIntruderTiger(){
  try{
    if (typeof rivalTigers === "undefined" || !Array.isArray(rivalTigers)) return null;
    if (!world) return null;

    // nếu đã tồn tại thì tái sử dụng
    const ex = rivalTigers.find(t => t && t.isIntruder);
    if (ex){
      ex.deadT = 0;
      ex.hp = ex.hpMax;
      ex.__despawnT = 0;
      ex.aggroT = Math.max(ex.aggroT||0, 18.0);
      return ex;
    }

    const mouth = world.caveMouth;
    const mouthPx = mouth ? { x: mouth.x*TILE + TILE/2, y: mouth.y*TILE + TILE/2 } : { x: world.w*TILE*0.5, y: world.h*TILE*0.5 };

    // territory của người chơi
    let terrId = null;
    let rect = { x0: 0, y0: 0, x1: world.w*TILE, y1: world.h*TILE };
    try{
      const playerTerr = (typeof territories !== "undefined" && Array.isArray(territories))
        ? territories.find(t=>t && t.isPlayer)
        : null;
      if (playerTerr){
        terrId = playerTerr.id;
        rect = { x0: playerTerr.px0, y0: playerTerr.py0, x1: playerTerr.px1, y1: playerTerr.py1 };
      } else if (typeof territoryIdAt === "function" && typeof getTerritoryById === "function"){
        terrId = territoryIdAt(mouthPx.x, mouthPx.y);
        const terr = getTerritoryById(terrId);
        if (terr && terr.px0 != null) rect = { x0: terr.px0, y0: terr.py0, x1: terr.px1, y1: terr.py1 };
      }
    }catch(_){ }
    if (terrId == null) terrId = 4;

    // spawn tại rìa lãnh thổ, rồi sẽ tiến vào (đỡ kẹt sát hang)
    let sx = rect.x1 - 140;
    let sy = rect.y0 + 240 + Math.random()*Math.max(120, (rect.y1-rect.y0) - 480);
    try{
      if (typeof findSafeExitWorldTile === "function"){
        const st = findSafeExitWorldTile((sx/TILE)|0, (sy/TILE)|0, 80);
        if (st){ sx = st.x*TILE + TILE/2; sy = st.y*TILE + TILE/2; }
      }
    }catch(_){ }

    const intruderName = "Hổ Lạ (Hắc Phong)";

    const t = {
      isIntruder: true,
      territoryId: terrId,
      name: intruderName,
      ownerName: intruderName,

      // lông tối, khác hẳn các hổ NPC khác
      palette: { main: "#3a3a3a", dark: "#1b1b1b" },

      x: sx,
      y: sy,
      homeX: sx,
      homeY: sy,
      r: 18,
      face: Math.atan2(mouthPx.y - sy, mouthPx.x - sx),
      vx: 0,
      vy: 0,

      hpMax: 460,
      hp: 460,
      hitFlashT: 0,

      // AI timers
      mode: "defend",
      aggroT: 99999,
      enrageT: 22,
      attackCD: 0,
      speakCD: 0,
      bubbleText: "",
      bubbleT: 0,
      deadT: 0,

      voice: {
        territory: [
          "Cút khỏi đường ta!",
          "Đây là đất của ta từ giờ.",
          "Hổ trắng kia... ta sẽ lấy nàng.",
          "Đừng hòng giữ nổi lãnh thổ!"
        ],
        cave: [
          "Ra đây! Ta muốn con hổ trắng!",
          "Ta sẽ phá nát hang của ngươi!"
        ],
        mateCall: ["Cứu em!"],
        worry: ["Cẩn thận!"],
      },

      __spawnRoarDone: false,
      __despawnT: 0,
      __spawnAt: (performance && performance.now) ? performance.now()/1000 : Date.now()/1000,
    };

    rivalTigers.push(t);
    return t;
  }catch(_){
    return null;
  }
}

function despawnIntruderTiger(){
  try{
    if (typeof rivalTigers === "undefined" || !Array.isArray(rivalTigers)) return;
    for (let i=rivalTigers.length-1; i>=0; i--){
      const t = rivalTigers[i];
      if (t && t.isIntruder) rivalTigers.splice(i,1);
    }
  }catch(_){ }
}


function updateNightWolfSpawns(dt){
  // Trong nhiệm vụ cốt truyện ĐÊM SÓI, chỉ spawn đúng số sói nhiệm vụ để tránh quá nhiều.
  try{ if (window && window.__wolfNightActive) return; }catch(_){ }
  if (!isNightTime()){
    // reset nhẹ để lúc vừa vào đêm có chance spawn sớm
    nightWolfSpawnT = Math.min(nightWolfSpawnT, 6);
    return;
  }
  if (scene !== "world") return;

  nightWolfSpawnT -= dt;
  if (nightWolfSpawnT <= 0){
    spawnWolfPackNearPlayer();
    // spawn thưa hơn để không overwhelm
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

  // hiệu ứng trúng đòn (mặc định: hướng theo mặt hổ)
  addFxHitBurst(player.x, player.y, player.face + Math.PI, dmg >= 9 ? 1.55 : 1.15);

  addFxText(player.x, player.y - 26, `-${dmg}`, 0.7);
  if (label){
    addFxText(player.x, player.y - 40, label, 0.9);
  }

  // rung camera nhẹ
  cam.dragTargetX += (Math.random()-0.5)*6;
  cam.dragTargetY += (Math.random()-0.5)*6;

  return true;
}


  // ===================== Animal update =====================

// ===== Cross-faction combat: wolves <-> rival tigers =====
function nearestRivalTigerInTerritory(terrId, x, y, maxDist){
  if (typeof rivalTigers === "undefined" || !Array.isArray(rivalTigers)) return null;
  let best = null, bestD = maxDist;
  for (const t of rivalTigers){
    if (!t || t.deadT > 0) continue;
    if (terrId != null && t.territoryId !== terrId) continue;
    const d = Math.hypot(t.x - x, t.y - y);
    if (d < bestD){
      bestD = d; best = t;
    }
  }
  return best ? { t: best, d: bestD } : null;
}

function nearestWolfInTerritory(terr, x, y, maxDist){
  if (!terr || typeof animals === "undefined" || !animals) return null;
  let best = null, bestD = maxDist;
  for (const a of animals){
    if (!a || a.type !== AnimalType.WOLF) continue;
    if (a.deadT > 0) continue;
    if (!inTerritoryPx(a.x, a.y, terr)) continue;
    const d = Math.hypot(a.x - x, a.y - y);
    if (d < bestD){
      bestD = d; best = a;
    }
  }
  return best ? { w: best, d: bestD } : null;
}
  function updateAnimals(dt){
  // ban đêm: thỉnh thoảng spawn bầy sói
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
    const isWolf     = (type === AnimalType.WOLF);

    // Sói: nếu đi 1 mình thì sợ hổ; chỉ "liều" khi có bầy (và chủ yếu ban đêm)
    const wolfPackSz = isWolf ? packSizeNear(a, 260) : 1;
    const wolfQuest  = isWolf && a.questTag === "wolf_night";
    // Sói "liều" khi có bầy (và chủ yếu ban đêm) hoặc khi là sói nhiệm vụ cốt truyện
    const wolfBrave  = isWolf && (wolfQuest || (isNightTime() && wolfPackSz >= 2));

    const isPredator = isBear || wolfBrave;

    // bán kính phát hiện riêng cho sói
    const detectP = isWolf ? (wolfBrave ? 330 : 240) : detect;

    // Sói (khi đã "liều") có thể tấn công hổ đực NPC trong cùng lãnh thổ
    let wolfTiger = null;
    let wolfTigerD = 1e9;
    let wolfChaseTiger = false;

    if (isWolf && wolfBrave){
      const terrIdHere = (typeof territoryIdAt === "function") ? territoryIdAt(a.x, a.y) : null;

      // giữ mục tiêu cũ nếu còn hợp lệ
      if (a.tigerTarget && a.tigerTarget.deadT <= 0 && (terrIdHere == null || a.tigerTarget.territoryId === terrIdHere)){
        wolfTiger = a.tigerTarget;
        wolfTigerD = Math.hypot(wolfTiger.x - a.x, wolfTiger.y - a.y);
      } else {
        a.tigerTarget = null;
        const nt = nearestRivalTigerInTerritory(terrIdHere, a.x, a.y, 420);
        if (nt && nt.t){
          wolfTiger = nt.t;
          wolfTigerD = nt.d;
        }
      }

      // nếu hổ ở gần => cả bầy sẽ chuyển sang hăng và lao tới
      if (wolfTiger && wolfTigerD < 340){
        a.aggroT = Math.max(a.aggroT, 5.0);
        a.tigerTarget = wolfTiger;

        if (a.packId){
          for (const o of animals){
            if (!o || o.type !== AnimalType.WOLF) continue;
            if (o.packId !== a.packId) continue;
            o.aggroT = Math.max(o.aggroT, 4.0);
            o.tigerTarget = wolfTiger;
          }
        }
      }

      // chọn mục tiêu đuổi: ưu tiên thứ gần hơn (thiên về người chơi một chút nếu cả hai đều gần)
      if (wolfTiger && wolfTigerD < 520){
        if (wolfQuest){
          wolfChaseTiger = true;
        } else if (wolfTigerD < distP*0.92 && distP > 70){
          wolfChaseTiger = true;
        }
      }
    }

    // phát hiện hổ
    if (isPredator){
      if (d < detectP){
        a.aggroT = Math.max(a.aggroT, 5.0); // thấy là đuổi
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
        a.aggroT = Math.max(a.aggroT, 7.0); // bị đánh càng hăng
      }
    } else {
      // nai / thỏ / sóc / heo sợ hổ
      // sói đi một mình cũng sợ hổ
      if (d < detectP) a.fleeT = Math.max(a.fleeT, isWolf ? 2.0 : 1.2);
    }

    // heo rừng / gấu / sói tấn công cận chiến khi rất gần
    const closeRange =
      isBoar ? 42 :
      isBear ? 46 :
      isWolf ? 36 : 0;

        // Sói cắn hổ đực NPC (nếu đang nhắm đuổi hổ)
    if (isWolf && wolfChaseTiger && wolfTiger && wolfTigerD < closeRange && a.attackCD <= 0){
      const dmg = 8;
      damageRivalTiger(wolfTiger, dmg);
      a.attackCD = 1.9;
      a.aggroT = Math.max(a.aggroT || 0, 3.5);
    } else if (closeRange > 0 && d < closeRange && a.attackCD <= 0 && !locked()){
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

        // sói đi một mình cắn xong sẽ bỏ chạy ngay
        if (isWolf && !wolfBrave){
          a.fleeT = Math.max(a.fleeT, 2.4);
          a.aggroT = 0;
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
      const boost = isBear ? 1.05 : (isWolf ? 1.35 : 1.3); // bầy sói đuổi nhanh

      // nếu là sói và đang nhắm đuổi hổ đực NPC thì đổi hướng theo hổ, thay vì theo người chơi
      let tx = player.x, ty = player.y;
      if (isWolf && wolfChaseTiger && wolfTiger){
        tx = wolfTiger.x; ty = wolfTiger.y;
      }
      const cdx = tx - a.x;
      const cdy = ty - a.y;
      const cd  = Math.hypot(cdx, cdy) || 0.0001;
      const cx  = cdx / cd, cy = cdy / cd;

      a.vx = lerp(a.vx, cx * baseSpeed * boost, 0.20);
      a.vy = lerp(a.vy, cy * baseSpeed * boost, 0.20);
    } else if (mode === "flee"){
      const awayX = -dirPX;
      const awayY = -dirPY;
      const boost =
        (type === AnimalType.RABBIT)   ? 1.35 :
        (type === AnimalType.DEER)     ? 1.25 :
        (type === AnimalType.SQUIRREL) ? 1.45 :
        (type === AnimalType.BOAR)     ? 1.15 :
        (type === AnimalType.WOLF)     ? 1.30 :
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


