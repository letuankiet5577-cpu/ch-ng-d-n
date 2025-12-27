  // ===================== Skills =====================
  function locked(){
    return player.forcedSleepT > 0 || player.bedSleep;
  }

  // ===== Target lock & combo (chuột trái) =====
function isTargetAlive(tgt){
  if (!tgt || !tgt.obj) return false;
  if (tgt.kind === "animal") return animals.includes(tgt.obj) && tgt.obj.hp > 0;
  if (tgt.kind === "rival")  return rivalTigers.includes(tgt.obj) && tgt.obj.deadT <= 0;
  return false;
}

function getLockedTarget(){
  if (!player.lock) return null;
  if (!isTargetAlive(player.lock)){
    player.lock = null;
    return null;
  }
  return player.lock;
}

function setLockedTarget(obj, kind){
  if (!obj) return;
  player.lock = { kind, obj };
}

function clearLockedTarget(){
  player.lock = null;
  showToast("Bỏ khoá mục tiêu", 0.6);
}

// click vào mục tiêu để khoá
function pickTargetAt(x,y){
  let best=null, bestD=1e9;

  for (const a of animals){
    const d = Math.hypot(a.x - x, a.y - y);
    if (d < (a.r||12) + 20 && d < bestD){
      bestD = d;
      best = {kind:"animal", obj:a};
    }
  }
  for (const t of rivalTigers){
    if (t.deadT > 0) continue;
    const d = Math.hypot(t.x - x, t.y - y);
    if (d < (t.r||18) + 22 && d < bestD){
      bestD = d;
      best = {kind:"rival", obj:t};
    }
  }
  return best;
}

function pickNearestEnemyToPoint(px,py, maxD){
  let best=null, bestD=maxD;

  for (const a of animals){
    const d = Math.hypot(a.x - px, a.y - py);
    if (d < bestD){
      bestD = d;
      best = {kind:"animal", obj:a};
    }
  }
  for (const t of rivalTigers){
    if (t.deadT > 0) continue;
    const d = Math.hypot(t.x - px, t.y - py);
    if (d < bestD){
      bestD = d;
      best = {kind:"rival", obj:t};
    }
  }
  return best;
}

function lockNearestTarget(){
  if (scene !== "world") return;
  const cand = pickNearestEnemyToPoint(player.x, player.y, 260);
  if (!cand){
    showToast("Không có mục tiêu gần để khoá", 0.7);
    return;
  }
  setLockedTarget(cand.obj, cand.kind);
  showToast("Đã khoá mục tiêu", 0.6);
}

function damageTarget(tgt, dmg, label){
  if (!tgt || !tgt.obj) return false;

  // hướng đòn đánh (để tạo hiệu ứng hit đúng hướng)
  const dir = Math.atan2(tgt.obj.y - player.y, tgt.obj.x - player.x);

  if (tgt.kind === "animal"){
    const killed = damageAnimal(tgt.obj, dmg);
    addFxHitBurst(tgt.obj.x, tgt.obj.y, dir, dmg >= 18 ? 1.55 : 1.0);
    if (label) addFxText(tgt.obj.x, tgt.obj.y-36, label, 0.55);
    return killed;
  }
  if (tgt.kind === "rival"){
    const down = damageRivalTiger(tgt.obj, dmg);
    addFxHitBurst(tgt.obj.x, tgt.obj.y, dir, dmg >= 16 ? 1.35 : 1.0);
    if (label) addFxText(tgt.obj.x, tgt.obj.y-36, label, 0.55);
    return down;
  }
  return false;
}

function advanceClawCombo(){
  player.clawCombo = clamp(player.clawCombo + 1, 0, 4);
  if (player.clawCombo >= 4){
    player.clawCombo = 0;
    player.pounceReady = true;
    showToast("Vồ sẵn sàng! (Chuột trái)", 0.9);
  }
}
  // phát hiện thiết bị chạm (để không spam thông báo TAB trên điện thoại)
function isTouchDevice(){
  try{
    if (navigator && typeof navigator.maxTouchPoints === "number" && navigator.maxTouchPoints > 0) return true;
    if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) return true;
  }catch(_){}
  return ("ontouchstart" in window);
}

function ensureAutoLock(maxD){
  let tgt = getLockedTarget();
  if (tgt) return tgt;
  const cand = pickNearestEnemyToPoint(player.x, player.y, maxD);
  if (!cand) return null;
  setLockedTarget(cand.obj, cand.kind);
  return getLockedTarget();
}

// chuột trái (tap) => cào chính xác / (đủ combo) => vồ
function primaryAttackTap(){
  if (locked()) return;

  // trong hang: cho phép tấn công hổ chủ hang (không yêu cầu TAB)
  if (scene === "cave"){
    useClaw({wide:false});
    return;
  }

  if (scene !== "world") return;

  if (player.pounceReady){
    let tgt = getLockedTarget();
    if (!tgt){
      // điện thoại: tự khoá mục tiêu gần nhất, không spam TAB
      if (isTouchDevice()){
        tgt = ensureAutoLock(220);
        if (!tgt) return;
      } else {
        showToast("Vồ cần khoá mục tiêu (TAB)", 0.9);
        return;
      }
    }
    player.pounceReady = false;
    player.clawCombo = 0;
    usePounce(true);
    return;
  }

  useClaw({wide:false});
}


// giữ chuột trái => cào rộng (bắn 1 lần / lần giữ)
function updateMouseHoldAttack(nowMs){
  if (!mouse.leftDown) return;
  if (mouse.leftHoldFired) return;
  if (scene !== "world") return;
  if (locked()) return;
  if (nowMs - mouse.leftDownAtMs < 220) return;

  useClaw({wide:true});
  mouse.leftHoldFired = true;
}

function useClaw(opts={}){
  if (scene !== "world") return false;
  if (locked()) return false;
  if (cd.claw > 0) return false;

  const wide = !!opts.wide;

  // nếu đang khoá mục tiêu thì tự xoay mặt theo nó
  const tgt = getLockedTarget();
  if (tgt){
    player.face = Math.atan2(tgt.obj.y - player.y, tgt.obj.x - player.x);
  }

  if (!wide){
    // cào chính xác: chỉ đánh 1 mục tiêu đã khoá
    if (!tgt){
  if (isTouchDevice()){
    tgt = ensureAutoLock(170);
    if (!tgt){
      cd.claw = 0.12;
      return false; // im lặng, không toast
    }
  } else {
    showToast("Chưa khoá mục tiêu (TAB)", 0.75);
    cd.claw = 0.25;
    return false;
  }
}


    const d = Math.hypot(tgt.obj.x - player.x, tgt.obj.y - player.y);
    const range = 62 + (tgt.obj.r||12);
    if (d > range){
      showToast("Mục tiêu quá xa", 0.6);
      cd.claw = 0.25;
      return false;
    }

    damageTarget(tgt, 12, null);
    addFxSlash(player.x + Math.cos(player.face)*22, player.y + Math.sin(player.face)*22, player.face, 0.22);
    cd.claw = 0.55;
    showToast("Cào!", 0.55);
    advanceClawCombo();
    return true;
  } else {
    // cào diện rộng: quét hình nón, trúng nhiều mục tiêu
    const range = 80;
    const cone = Math.PI * 1.15; // ~207deg
    const ax = Math.cos(player.face), ay = Math.sin(player.face);

    let hits = 0;
    const tryHit = (kind, obj)=>{
      const dx = obj.x - player.x;
      const dy = obj.y - player.y;
      const d = Math.hypot(dx,dy);
      if (d > range + (obj.r||12)) return;

      const nx = dx/(d||1), ny = dy/(d||1);
      const dot = nx*ax + ny*ay;
      const ang = Math.acos(clamp(dot,-1,1));
      if (ang <= cone*0.5){
        hits++;
        damageTarget({kind, obj}, 9, null);
      }
    };

    for (const a of animals) tryHit("animal", a);
    for (const t of rivalTigers){
      if (t.deadT > 0) continue;
      tryHit("rival", t);
    }

    addFxSlash(player.x + ax*24, player.y + ay*24, player.face, 0.22);
    cd.claw = 0.95;
    showToast(hits>0 ? `Cào rộng! (${hits})` : "Cào rộng trượt!", 0.65);
    advanceClawCombo();
    return true;
  }
}

  function useBite(){
    if (scene !== "world") return;
    if (locked()) return;
    if (cd.bite > 0) return;

    const range = 56;
    const cone = Math.PI * 0.55; // 99 deg
    const ax = Math.cos(player.face), ay = Math.sin(player.face);

    let hit = false;
    for (const a of animals){
      const dx = a.x - player.x;
      const dy = a.y - player.y;
      const d = Math.hypot(dx,dy);
      if (d > range + a.r) continue;

      const nx = dx/(d||1), ny = dy/(d||1);
      const dot = nx*ax + ny*ay;
      const ang = Math.acos(clamp(dot,-1,1));
      if (ang <= cone*0.5){
        damageAnimal(a, 22);
        hit = true;
      }
    }
    // đánh hổ đực xâm lấn lãnh thổ
    for (const t of rivalTigers){
      if (t.deadT > 0) continue;
      const dx = t.x - player.x;
      const dy = t.y - player.y;
      const d = Math.hypot(dx,dy);
      if (d > range + t.r) continue;

      const nx = dx/(d||1), ny = dy/(d||1);
      const dot = nx*ax + ny*ay;
      const ang = Math.acos(clamp(dot,-1,1));
      if (ang <= cone*0.5){
        damageRivalTiger(t, 18);
        hit = true;
      }
    }

    addFxSlash(player.x + ax*24, player.y + ay*24, player.face, 0.22);
    cd.bite = 1.25;
    showToast(hit ? "Cắn!" : "Cắn trượt!", 0.6);
  }

  function useRoar(){
    if (scene !== "world") return;
    if (locked()) return;
    if (cd.roar > 0) return;

    const radius = 170;
    let count = 0;
    for (const a of animals){
      const d = Math.hypot(a.x - player.x, a.y - player.y);
      if (d <= radius){
        a.stunnedT = Math.max(a.stunnedT, 2.2);
        a.fleeT = Math.max(a.fleeT, 0.6);
        count++;
      }
    }
    
    // hổ đực cũng bị "khựng" nhẹ khi bạn gầm (không bỏ chạy, chỉ chậm lại)
    for (const t of rivalTigers){
      const d = Math.hypot(t.x - player.x, t.y - player.y);
      if (d <= radius){
        t.stunnedT = Math.max(t.stunnedT, 0.8);
        // nếu bạn đang ở trong lãnh thổ của nó, nó sẽ càng tức
        const terr = getTerritoryById(t.territoryId);
        if (terr && inTerritoryPx(player.x, player.y, terr)){
          t.aggroT = Math.max(t.aggroT, 4.0);
        }
      }
    }
addFxRing(player.x, player.y, 0.55, radius);
    cd.roar = 6.5;
    showToast(count>0 ? `Gầm! Choáng ${count} con` : "Gầm!", 0.9);
  }

  function usePounce(fromCombo=false){
  if (scene !== "world") return;
  if (locked()) return;
  if (cd.pounce > 0) return;

  const tgt = getLockedTarget();
  if (fromCombo && !tgt){
    showToast("Vồ cần khoá mục tiêu (TAB)", 0.9);
    return;
  }

  player.pounceT = 0.26;
  player.pounceHit = false;

  if (tgt){
    player.pounceDir = Math.atan2(tgt.obj.y - player.y, tgt.obj.x - player.x);
    player.pounceTarget = tgt;
  } else {
    player.pounceDir = player.face;
    player.pounceTarget = null;
  }

  cd.pounce = fromCombo ? 2.9 : 3.6;
  showToast("Vồ!", 0.6);
}

  function tryEat(){
    if (locked()) return;
    // only if near carcass
    let best = null, bestD = 1e9;
    for (const c of carcasses){
      const d = Math.hypot(c.x - player.x, c.y - player.y);
      if (d < bestD){ bestD = d; best = c; }
    }
    if (!best || bestD > 56){
      showToast("Không có thịt gần đây", 0.7);
      return;
    }
    if (best.meat <= 0) return;

    best.meat -= 1;
    stats.hunger = clamp(stats.hunger + 28, 0, stats.hungerMax);
    stats.hp = clamp(stats.hp + 6, 0, stats.hpMax);
    showToast("Ăn thịt 🍖 (+Đói, +Máu)", 0.85);
  }

  // ===================== Sleep on bed =====================
  function nearBed(){
    if (scene !== "cave") return false;
    const d = Math.hypot(player.x - cave.bed.x, player.y - cave.bed.y);
    return d <= cave.bed.r;
  }
  function toggleBedSleep(){
    if (scene !== "cave") return;
    if (player.forcedSleepT > 0) return;

    if (!nearBed()){
      showToast("Đứng lên ổ rơm để ngủ", 0.9);
      return;
    }
    player.bedSleep = !player.bedSleep;
    if (player.bedSleep){
      showToast("Ngủ trên ổ rơm…", 0.9);
    } else {
      showToast("Dậy!", 0.6);
    }
  }

