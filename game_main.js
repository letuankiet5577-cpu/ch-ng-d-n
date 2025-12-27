  // ===================== Input =====================
  const keys = new Set();

  // trạng thái chuột (tọa độ thế giới + nút đang giữ)
  const mouse = {
  x: 0,
  y: 0,
  leftDown: false,
  rightDown: false,

  leftDownAtMs: 0,
  leftHoldFired: false
};

  // ===================== Mobile / Touch =====================
  const mobileCtl = {
    joyX: 0,
    joyY: 0,
    sprint: false,
    pointers: new Map(),
    pinch: { active:false, startDist:0, startZoom:1 }
  };

  // DOM (mobile)
  const mobileControls = document.getElementById("mobileControls");
  const joyBase  = document.getElementById("joyBase");
  const joyStick = document.getElementById("joyStick");
  const btnAttack = document.getElementById("btnAttack");
  const btnSprint = document.getElementById("btnSprint");
  const btnLock   = document.getElementById("btnLock");
  const btnEnter  = document.getElementById("btnEnter");
  const btnHint   = document.getElementById("btnHint");

  // ===================== Settings / UI =====================
  const settingsOverlay = document.getElementById("settingsOverlay");
  const settingsClose   = document.getElementById("settingsClose");
  const hudToggleBtn    = document.getElementById("hudToggle");
  const hudSettingsBtn  = document.getElementById("hudSettings");

  const setHudMini      = document.getElementById("setHudMini");
  const setShowHint     = document.getElementById("setShowHint");
  const setShowMinimap  = document.getElementById("setShowMinimap");

  const miniPanel = document.getElementById("miniPanel");

  function isTouchDevice(){
    try{ return window.matchMedia && window.matchMedia("(pointer: coarse)").matches; }
    catch(_){ return false; }
  }
  const defaultHudMini = isTouchDevice() || window.innerWidth < 760;

  function loadBool(key, fallback){
    try{
      const v = localStorage.getItem(key);
      if (v === null) return fallback;
      if (v === "1") return true;
      if (v === "0") return false;
      return !!JSON.parse(v);
    }catch(_){ return fallback; }
  }
  function saveBool(key, val){
    try{ localStorage.setItem(key, val ? "1" : "0"); }catch(_){}
  }

  const uiState = {
    hudMini: loadBool("ui_hudMini", defaultHudMini),
    showHint: loadBool("ui_showHint", !defaultHudMini), // desktop bật, mobile tắt
    showMinimap: loadBool("ui_showMinimap", true),
  };

  function applyUI(){
    document.body.classList.toggle("hud-mini", !!uiState.hudMini);

    if (hint) hint.style.display = uiState.showHint ? "block" : "none";
    if (miniPanel) miniPanel.style.display = uiState.showMinimap ? "block" : "none";

    if (hudToggleBtn) hudToggleBtn.textContent = uiState.hudMini ? "▴" : "▾";

    if (setHudMini) setHudMini.checked = !!uiState.hudMini;
    if (setShowHint) setShowHint.checked = !!uiState.showHint;
    if (setShowMinimap) setShowMinimap.checked = !!uiState.showMinimap;
  }

  function openSettings(){
    if (!settingsOverlay) return;
    settingsOverlay.classList.add("show");
    settingsOverlay.setAttribute("aria-hidden", "false");
  }
  function closeSettings(){
    if (!settingsOverlay) return;
    settingsOverlay.classList.remove("show");
    settingsOverlay.setAttribute("aria-hidden", "true");
  }

  if (hudToggleBtn){
    hudToggleBtn.addEventListener("click", ()=>{
      uiState.hudMini = !uiState.hudMini;
      saveBool("ui_hudMini", uiState.hudMini);
      applyUI();
      showToast(uiState.hudMini ? "HUD: GỌN" : "HUD: ĐẦY ĐỦ", 0.9);
    });
  }
  if (hudSettingsBtn){
    hudSettingsBtn.addEventListener("click", openSettings);
  }

  if (settingsClose){
    settingsClose.addEventListener("click", closeSettings);
  }
  if (settingsOverlay){
    settingsOverlay.addEventListener("click", (e)=>{
      if (e.target === settingsOverlay) closeSettings();
    });
  }
  window.addEventListener("keydown", (e)=>{
    if (e.key === "Escape") closeSettings();
  });

  if (setHudMini){
    setHudMini.addEventListener("change", ()=>{
      uiState.hudMini = setHudMini.checked;
      saveBool("ui_hudMini", uiState.hudMini);
      applyUI();
    });
  }
  if (setShowHint){
    setShowHint.addEventListener("change", ()=>{
      uiState.showHint = setShowHint.checked;
      saveBool("ui_showHint", uiState.showHint);
      applyUI();
    });
  }
  if (setShowMinimap){
    setShowMinimap.addEventListener("change", ()=>{
      uiState.showMinimap = setShowMinimap.checked;
      saveBool("ui_showMinimap", uiState.showMinimap);
      applyUI();
    });
  }

  applyUI();

  function setJoy(nx, ny){
    mobileCtl.joyX = clamp(nx, -1, 1);
    mobileCtl.joyY = clamp(ny, -1, 1);
  }

  // Joystick (pointer events)
  (function initJoystick(){
    if (!joyBase || !joyStick) return;
    let activePid = null;
    let cx=0, cy=0, maxR=40;

    function recalc(){
      const r = joyBase.getBoundingClientRect();
      cx = r.left + r.width/2;
      cy = r.top + r.height/2;
      maxR = Math.max(28, r.width * 0.32);
    }
    recalc();
    window.addEventListener("resize", recalc);

    function renderStick(){
      const dx = mobileCtl.joyX * maxR;
      const dy = mobileCtl.joyY * maxR;
      joyStick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    }

    function onMove(e){
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const d = Math.hypot(dx,dy);
      const t = (d > 1e-6) ? Math.min(1, d / maxR) : 0;
      const nx = (d > 1e-6) ? (dx / d) * t : 0;
      const ny = (d > 1e-6) ? (dy / d) * t : 0;
      setJoy(nx, ny);
      renderStick();
    }

    function reset(){
      activePid = null;
      setJoy(0,0);
      renderStick();
    }

    joyBase.addEventListener("pointerdown", (e)=>{
      e.preventDefault();
      recalc();
      activePid = e.pointerId;
      joyBase.setPointerCapture(activePid);
      onMove(e);
    }, {passive:false});

    joyBase.addEventListener("pointermove", (e)=>{
      if (e.pointerId !== activePid) return;
      e.preventDefault();
      onMove(e);
    }, {passive:false});

    joyBase.addEventListener("pointerup", (e)=>{
      if (e.pointerId !== activePid) return;
      e.preventDefault();
      reset();
    }, {passive:false});
    joyBase.addEventListener("pointercancel", reset, {passive:true});
  })();

  // Mobile action buttons
  function mobileAttackDown(){
    if (scene !== "world") return;
    mouse.leftDown = true;
    mouse.leftDownAtMs = performance.now();
    mouse.leftHoldFired = false;
  }
  function mobileAttackUp(){
    if (!mouse.leftDown) return;
    mouse.leftDown = false;
    if (!mouse.leftHoldFired) primaryAttackTap();
  }

  if (btnAttack){
    btnAttack.addEventListener("pointerdown", (e)=>{ e.preventDefault(); mobileAttackDown(); }, {passive:false});
    btnAttack.addEventListener("pointerup", (e)=>{ e.preventDefault(); mobileAttackUp(); }, {passive:false});
    btnAttack.addEventListener("pointercancel", (e)=>{ mobileAttackUp(); }, {passive:true});
  }

  if (btnSprint){
    const setSprint = (on)=>{
      mobileCtl.sprint = !!on;
      btnSprint.classList.toggle("on", mobileCtl.sprint);
    };
    btnSprint.addEventListener("pointerdown", (e)=>{ e.preventDefault(); setSprint(true); }, {passive:false});
    btnSprint.addEventListener("pointerup",   (e)=>{ e.preventDefault(); setSprint(false); }, {passive:false});
    btnSprint.addEventListener("pointercancel", ()=>setSprint(false), {passive:true});
  }
  if (btnLock){
    btnLock.addEventListener("click", ()=>lockNearestTarget());
  }
  if (btnEnter){
    btnEnter.addEventListener("click", ()=>{
      if (scene === "world") tryEnterNearbyCave();
      else exitCave();
    });
  }
  // Nút '?' (mobile): mở Cài đặt + Hướng dẫn
  if (btnHint){
    btnHint.addEventListener("click", openSettings);
  }

  // Touch on canvas: tap/hold giống chuột trái + pinch zoom
  view.addEventListener("pointerdown", (e)=>{
    if (e.pointerType === "mouse") return;
    e.preventDefault();

    // track pointers for pinch
    mobileCtl.pointers.set(e.pointerId, {x:e.clientX, y:e.clientY});
    if (mobileCtl.pointers.size === 2){
      const pts = [...mobileCtl.pointers.values()];
      mobileCtl.pinch.active = true;
      mobileCtl.pinch.startDist = Math.hypot(pts[0].x-pts[1].x, pts[0].y-pts[1].y);
      mobileCtl.pinch.startZoom = cam.zoom;
      mouse.leftDown = false;
      return;
    }

    view.setPointerCapture(e.pointerId);
    updateMouseWorld(e);
    mouse.leftDown = true;
    mouse.leftDownAtMs = performance.now();
    mouse.leftHoldFired = false;

    // tap vào mục tiêu để khoá
    const picked = pickTargetAt(mouse.x, mouse.y);
    if (picked){
      setLockedTarget(picked.obj, picked.kind);
    }

    // xoay mặt về hướng tap / mục tiêu
    const aim = getLockedTarget();
    const dx = (aim ? aim.obj.x : mouse.x) - player.x;
    const dy = (aim ? aim.obj.y : mouse.y) - player.y;
    if (Math.abs(dx) + Math.abs(dy) > 1e-3) player.face = Math.atan2(dy, dx);
  }, {passive:false});

  view.addEventListener("pointermove", (e)=>{
    if (e.pointerType === "mouse") return;
    if (!mobileCtl.pointers.has(e.pointerId)) return;
    e.preventDefault();
    mobileCtl.pointers.set(e.pointerId, {x:e.clientX, y:e.clientY});

    if (mobileCtl.pinch.active && mobileCtl.pointers.size >= 2){
      const pts = [...mobileCtl.pointers.values()];
      const d = Math.hypot(pts[0].x-pts[1].x, pts[0].y-pts[1].y);
      const ratio = (mobileCtl.pinch.startDist > 1e-6) ? (d / mobileCtl.pinch.startDist) : 1;
      cam.zoom = clamp(mobileCtl.pinch.startZoom * ratio, 0.70, 1.90);
      return;
    }
    updateMouseWorld(e);
  }, {passive:false});

  function onTouchEnd(e){
    if (e.pointerType === "mouse") return;
    mobileCtl.pointers.delete(e.pointerId);
    if (mobileCtl.pinch.active){
      if (mobileCtl.pointers.size < 2) mobileCtl.pinch.active = false;
      return;
    }
    if (!mouse.leftDown) return;
    updateMouseWorld(e);
    mouse.leftDown = false;
    if (!mouse.leftHoldFired) primaryAttackTap();
  }
  view.addEventListener("pointerup", (e)=>{ e.preventDefault(); onTouchEnd(e); }, {passive:false});
  view.addEventListener("pointercancel", onTouchEnd, {passive:true});

  window.addEventListener("keydown", (e)=>{
    const k = e.key.toLowerCase();
    if (e.repeat) return;

    // skills cũ vẫn dùng được (tùy bạn, có thể bỏ sau này)
    if (k === "1") useClaw();
    if (k === "2") useBite();      // phím 2 = cắn (phụ)
    if (k === "3") usePounce();
    if (k === "4") useRoar();

    // vào hang gần nhất
    if (k === "g") {
      if (tryEnterNearbyCave()) { e.preventDefault(); return; }
    }

    // khoá mục tiêu
    if (k === "tab") { lockNearestTarget(); e.preventDefault(); }
    if (k === "x")   { clearLockedTarget(); }

    // ăn / ngủ
    if (k === "f") tryEat();
    if (k === " ") toggleBedSleep();
    if (k === "h"){
      uiState.showHint = !uiState.showHint;
      saveBool("ui_showHint", uiState.showHint);
      applyUI();
      showToast(uiState.showHint ? "Gợi ý nổi: BẬT (H để tắt)" : "Gợi ý nổi: TẮT (H để bật)", 0.9);
    }

    keys.add(k);

    if (["arrowup","arrowdown","arrowleft","arrowright"," "].includes(k)) e.preventDefault();
  }, {passive:false});
  window.addEventListener("keyup", (e)=>keys.delete(e.key.toLowerCase()));

  // --- CHUỘT & KÉO CAMERA ---

  // không cho hiện menu chuột phải
  view.addEventListener("contextmenu", (e)=>e.preventDefault());

  let dragging=false, lastMX=0, lastMY=0;

  // cập nhật vị trí chuột sang tọa độ thế giới
  function updateMouseWorld(e){
    const screenX = e.clientX;
    const screenY = e.clientY;
    const w = window.innerWidth;
    const h = window.innerHeight;
    mouse.x = cam.x + (screenX - w/2) / cam.zoom;
    mouse.y = cam.y + (screenY - h/2) / cam.zoom;
  }

  view.addEventListener("mousedown",(e)=>{
    updateMouseWorld(e);

    if (e.button === 0){ // chuột trái = CÀO (tap) / CÀO DIỆN RỘNG (giữ)
  mouse.leftDown = true;
  mouse.leftDownAtMs = performance.now();
  mouse.leftHoldFired = false;

  // click vào mục tiêu để khoá
  const picked = pickTargetAt(mouse.x, mouse.y);
  if (picked){
    setLockedTarget(picked.obj, picked.kind);
  }

  // xoay mặt về hướng chuột (hoặc mục tiêu vừa khoá)
  const aim = getLockedTarget();
  const dx = (aim ? aim.obj.x : mouse.x) - player.x;
  const dy = (aim ? aim.obj.y : mouse.y) - player.y;
  if (Math.abs(dx) + Math.abs(dy) > 1e-3){
    player.face = Math.atan2(dy, dx);
  }
} else if (e.button === 2){ // chuột phải = CHẠY NHANH (giữ)
      mouse.rightDown = true;
      player.sprint = true;
    }

    // kéo camera: dùng nút giữa
    if (e.button === 1){
      dragging=true; lastMX=e.clientX; lastMY=e.clientY;
    }
  });

  window.addEventListener("mouseup",(e)=>{
    if (e.button === 1){
      dragging=false;
    }
    if (e.button === 2){
      mouse.rightDown = false;
      player.sprint = false;
    }
      if (e.button === 0){
    updateMouseWorld(e);
    mouse.leftDown = false;

    // tap => cào chính xác / nếu đã đủ combo thì vồ
    if (!mouse.leftHoldFired){
      primaryAttackTap();
    }
  }
});

  window.addEventListener("mousemove",(e)=>{
    updateMouseWorld(e);

    if (!dragging) return;
    const dx = e.clientX - lastMX;
    const dy = e.clientY - lastMY;
    lastMX = e.clientX; lastMY = e.clientY;
    cam.dragTargetX += -dx / cam.zoom;
    cam.dragTargetY += -dy / cam.zoom;
    cam.dragTargetX = clamp(cam.dragTargetX, -900, 900);
    cam.dragTargetY = clamp(cam.dragTargetY, -900, 900);
  });

  function anyMoveKeyDown(){
    return keys.has("w")||keys.has("a")||keys.has("s")||keys.has("d")||
           keys.has("arrowup")||keys.has("arrowleft")||keys.has("arrowdown")||keys.has("arrowright");
  }

  // ===================== Scene switching =====================
let scene = "world";
let sceneCooldown = 0;

// currently entered cave (world mouth + territory id)
let activeCaveRef = null; // {mouth:{x,y,style,dir}, territoryId:number, ownerName:string}
// hổ chủ hang đang hoạt động bên trong hang (nếu có)
// trỏ trực tiếp tới 1 con trong mảng rivalTigers
let caveTigerHost = null;

function caveRefs(){
  const out = [];
  // cave của người chơi
  if (world.caveMouth){
    const terr = territories.find(t=>t.isPlayer);
    out.push({
      mouth: world.caveMouth,
      territoryId: terr ? terr.id : territoryIdAt(world.caveMouth.x*TILE + TILE/2, world.caveMouth.y*TILE + TILE/2),
      ownerName: "Bạn"
    });
  }
  // caves của các hổ đực NPC
  if (world.otherCaves){
    for (const oc of world.otherCaves){
      const terr = getTerritoryById(oc.territoryId);
      out.push({
        mouth: oc.caveMouth,
        territoryId: oc.territoryId,
        ownerName: (terr && terr.ownerName) ? terr.ownerName : "Hổ đực"
      });
    }
  }
  return out;
}

function onTunnelNearMouth(mouth){
  const tx = Math.floor(player.x / TILE);
  const ty = Math.floor(player.y / TILE);
  if (!inBounds2(tx,ty, world.w, world.h)) return false;
  const i = ty*world.w + tx;
  if (world.tiles[i] !== WT.CAVE_FLOOR) return false;
  return Math.hypot(tx - mouth.x, ty - mouth.y) < 18;
}

function nearestCaveRef(){
  let best=null, bestD=1e9;
  for (const ref of caveRefs()){
    const mx = ref.mouth.x*TILE + TILE/2;
    const my = ref.mouth.y*TILE + TILE/2;
    const d = Math.hypot(player.x - mx, player.y - my);
    if (d < bestD){ bestD=d; best=ref; }
  }
  return {ref:best, d:bestD};
}

function enterCave(ref){
  if (!ref || !ref.mouth) return;
  activeCaveRef = ref;

  // tạo interior khác nhau cho từng hang
  const style = ref.mouth.style || 0;
  const seedStr = (seedInput.value || "seed") + `::cave:${ref.territoryId}`;
  generateCave(seedStr, style);

  // reset hổ trong hang
  caveTigerHost = null;
  // nếu đây là hang của hổ NPC (không phải hang của bạn)
  if (ref.ownerName !== "Bạn"){
    const host = rivalTigers.find(t => t.territoryId === ref.territoryId);
    if (host){
      caveTigerHost = host;

      // đặt vị trí hổ chủ hang ở ngay gần cửa hang bên trong
      host.x = (cave.entrance.x + 4)*TILE + TILE/2;
      host.y = (cave.entrance.y)*TILE + TILE/2;
      host.vx = 0;
      host.vy = 0;
      host.mode = "defend";
      host.aggroT = Math.max(host.aggroT, 10.0); // rất tức giận trong hang
    }
  }

  scene = "cave";
  sceneCooldown = 0.9;

  player.x = (cave.entrance.x + 10)*TILE + TILE/2;
  player.y = (cave.entrance.y)*TILE + TILE/2;
  player.bedSleep = false;

  cam.dragTargetX = cam.dragTargetY = 0;
  showToast(ref.ownerName === "Bạn" ? "Vào hang của bạn…" : `Vào hang của ${ref.ownerName}…`, 1.0);
  scenePill.textContent = ref.ownerName === "Bạn" ? "Trong hang (Bạn)" : `Trong hang (${ref.ownerName})`;
  miniName.textContent = "Mini Map (Hang)";
}

function findSafeExitWorldTileFromMouth(mouth){
  const ax = Math.round(Math.cos(mouth.dir||0));
  const ay = Math.round(Math.sin(mouth.dir||0));
  const preferTX = mouth.x + ax*14;
  const preferTY = mouth.y + ay*14;

  for (let r=0; r<=34; r++){
    for (let oy=-r; oy<=r; oy++){
      for (let ox=-r; ox<=r; ox++){
        const tx = preferTX + ox;
        const ty = preferTY + oy;
        if (!inBounds2(tx,ty, world.w, world.h)) continue;
        const i = ty*world.w + tx;
        if (world.solid[i]) continue;
        const t = world.tiles[i];
        if (t === WT.MOUNTAIN || t === WT.MOUNTAIN_EDGE || t === WT.RIVER) continue;
        if (t === WT.GRASS || t === WT.CAVE_FLOOR){
          return {tx,ty};
        }
      }
    }
  }
  return {tx: clamp(preferTX,0,world.w-1), ty: clamp(preferTY,0,world.h-1)};
}

function exitCave(){
  // nếu có hổ chủ hang bên trong, đưa nó về chỗ trú trong rừng
  if (caveTigerHost){
    caveTigerHost.vx = 0;
    caveTigerHost.vy = 0;
    caveTigerHost.mode = "rest";
    caveTigerHost.x = caveTigerHost.homeX;
    caveTigerHost.y = caveTigerHost.homeY;
    caveTigerHost = null;
  }

  scene = "world";
  sceneCooldown = 0.9;

  const mouth = (activeCaveRef && activeCaveRef.mouth) ? activeCaveRef.mouth : world.caveMouth;
  const safe = findSafeExitWorldTileFromMouth(mouth);
  player.x = safe.tx*TILE + TILE/2;
  player.y = safe.ty*TILE + TILE/2;

  // đẩy ra khỏi mép núi nếu spawn sát tường
  const rr = collideResolveCircle(player.x, player.y, player.r, world);
  player.x = rr.x; player.y = rr.y;

  player.bedSleep = false;

  cam.dragTargetX = cam.dragTargetY = 0;
  showToast("Ra khỏi hang…", 1.0);
  scenePill.textContent = "Ngoài rừng";
  miniName.textContent = "Mini Map (Rừng)";
}

function tryEnterNearbyCave(){
  if (scene !== "world") return false;
  if (sceneCooldown > 0) return false;

  const nc = nearestCaveRef();
  if (!nc.ref) return false;

  const near = nc.d < 58;
  const onTunnel = onTunnelNearMouth(nc.ref.mouth);
  if (near || onTunnel){
    enterCave(nc.ref);
    return true;
  }
  return false;
}

function checkTransitions(){
  if (sceneCooldown > 0) return;

  if (scene === "world"){
    // chỉ tự động vào hang khi đã bước sâu vào đường hầm
    const nc = nearestCaveRef();
    if (nc.ref && onTunnelNearMouth(nc.ref.mouth)){
      enterCave(nc.ref);
    }
  } else {
    const ey = (cave.entrance.y)*TILE + TILE/2;
    const exitZoneX = (cave.entrance.x + 1.5) * TILE;
    const exitZoneY = 34;

    if (player.x < exitZoneX && Math.abs(player.y - ey) < exitZoneY){
      exitCave();
    }
  }
}

  // ===================== Movement =====================

  function movePlayer(dt){
    // stop bed sleep if player tries to move
    if (player.bedSleep && anyMoveKeyDown()){
      player.bedSleep = false;
      showToast("Dậy!", 0.6);
    }

    // forced sleep or bed sleep => can't move
    if (player.forcedSleepT > 0 || player.bedSleep){
      player.sprint = false;
      return;
    }


// pounce dash overrides movement
if (player.pounceT > 0){
  const sp = 640;

  // nếu có mục tiêu (và còn sống), tự canh hướng để vồ chính xác
  let dir = player.pounceDir;
  const tgt = player.pounceTarget || getLockedTarget();
  if (tgt && isTargetAlive(tgt)){
    dir = Math.atan2(tgt.obj.y - player.y, tgt.obj.x - player.x);
    player.pounceDir = dir;
  } else {
    player.pounceTarget = null;
  }

  const ax = Math.cos(dir);
  const ay = Math.sin(dir);

  const dx = ax * sp * dt;
  const dy = ay * sp * dt;

  let nx = player.x + dx, ny = player.y;
  let r1 = collideResolveCircle(nx, ny, player.r, world);
  nx = r1.x; ny = r1.y;

  let nx2 = nx, ny2 = ny + dy;
  let r2 = collideResolveCircle(nx2, ny2, player.r, world);
  player.x = r2.x; player.y = r2.y;

  // gây sát thương khi chạm mục tiêu (ưu tiên mục tiêu đã khoá)
  if (!player.pounceHit){
    if (tgt && isTargetAlive(tgt)){
      const d = Math.hypot(tgt.obj.x - player.x, tgt.obj.y - player.y);
      if (d < (tgt.obj.r||12) + player.r + 14){
        damageTarget(tgt, 28, "Vồ!");
        if (tgt.kind === "animal") tgt.obj.stunnedT = Math.max(tgt.obj.stunnedT, 1.2);
        if (tgt.kind === "rival")  tgt.obj.stunnedT = Math.max(tgt.obj.stunnedT, 0.9);
        player.pounceHit = true;
        player.pounceT = 0;
      }
    } else {
      // fallback: chạm bất kỳ con mồi gần
      const cand = pickNearestEnemyToPoint(player.x, player.y, 28 + player.r);
      if (cand){
        damageTarget(cand, 24, "Vồ!");
        if (cand.kind === "animal") cand.obj.stunnedT = Math.max(cand.obj.stunnedT, 1.0);
        if (cand.kind === "rival")  cand.obj.stunnedT = Math.max(cand.obj.stunnedT, 0.8);
        player.pounceHit = true;
        player.pounceT = 0;
      }
    }
  }

  player.pounceT -= dt;
  return;
}

    let ax=0, ay=0;
    if (keys.has("w") || keys.has("arrowup")) ay -= 1;
    if (keys.has("s") || keys.has("arrowdown")) ay += 1;
    if (keys.has("a") || keys.has("arrowleft")) ax -= 1;
    if (keys.has("d") || keys.has("arrowright")) ax += 1;

    // mobile joystick (giữ nguyên gameplay, chỉ thêm input)
    ax += mobileCtl.joyX;
    ay += mobileCtl.joyY;

    if (keys.has("q")) cam.zoom = clamp(cam.zoom - 0.02, 0.70, 1.90);
    if (keys.has("e")) cam.zoom = clamp(cam.zoom + 0.02, 0.70, 1.90);

    if (ax!==0 || ay!==0){
      const len = Math.hypot(ax,ay);
      ax/=len; ay/=len;
      player.face = Math.atan2(ay, ax);
    }

    const map = (scene === "world") ? world : cave;
let sp = player.speed;

// sprint: giữ chuột phải HOẶC Shift
player.sprint = (mouse.rightDown || keys.has("shift") || mobileCtl.sprint) && !locked();
if (player.sprint){
  sp *= 1.8; // chạy nhanh
}

// giảm tốc khi lội suối / bờ sông
if (scene === "world"){
  const t = worldTileAtPx(player.x, player.y);
  if (t === WT.RIVER){
    sp *= 0.6; // đi chậm hơn trong nước
  }
}

const dx = ax * sp * dt;
const dy = ay * sp * dt;


    let nx = player.x + dx, ny = player.y;
    let r1 = collideResolveCircle(nx, ny, player.r, map);
    nx = r1.x; ny = r1.y;

    let nx2 = nx, ny2 = ny + dy;
    let r2 = collideResolveCircle(nx2, ny2, player.r, map);
    player.x = r2.x; player.y = r2.y;
  }

  // ===================== UI update =====================
  function setBar(fillEl, textEl, value, max, mode){
    const pct = clamp(value / max, 0, 1);
    fillEl.style.width = `${pct*100}%`;

    // simple color logic (no CSS var dependency)
    if (mode === "hp"){
      fillEl.style.background = `rgba(${Math.round(255*(1-pct))},${Math.round(180*pct)},${Math.round(80*pct)},.85)`;
    } else if (mode === "hunger"){
      fillEl.style.background = `rgba(${Math.round(255*(1-pct))},${Math.round(220*pct)},${Math.round(120*pct)},.75)`;
    } else {
      // sleep (buồn ngủ) càng cao càng đỏ
      const r = Math.round(220*pct + 50*(1-pct));
      const g = Math.round(220*(1-pct));
      const b = Math.round(130*(1-pct));
      fillEl.style.background = `rgba(${r},${g},${b},.75)`;
    }

    textEl.textContent = `${Math.round(value)}/${Math.round(max)}`;
  }

  function setSkillPill(el, name, cooldown){
    if (cooldown <= 0){
      el.classList.add("ready");
      el.classList.remove("cd");
      el.textContent = name + " ✓";
    } else {
      el.classList.remove("ready");
      el.classList.add("cd");
      el.textContent = `${name} ${cooldown.toFixed(1)}s`;
    }
  }

  // ===================== Env + Stats update =====================
  function updateEnv(dt){
    env.time += (env.speed * dt) * 0.25;
    if (env.time >= 24) env.time -= 24;

    env.weatherTimer -= dt;
    if (env.weatherTimer <= 0){
      env.weatherTimer = 25 + Math.random()*35;
      const pick = weatherPick(world.rand || Math.random);
      env.weatherType = pick.type;
      env.weather = pick.label;
    }

    const hh = Math.floor(env.time);
    const mm = Math.floor((env.time - hh) * 60);
    const pad = (n)=>String(n).padStart(2,"0");
    timeLabel.textContent = `${phaseName(env.time)} ${pad(hh)}:${pad(mm)}`;
    weatherLabel.textContent = env.weather;
  }

function respawn(){
  // Hổ ngất đi… rồi tỉnh lại trên ổ rơm trong hang của BẠN
  const lowHp = Math.max(1, Math.round(stats.hpMax * 0.28));
  stats.hp     = lowHp;                    // máu thấp, phải ăn & nghỉ
  stats.hunger = clamp(stats.hunger, 30, 55); // hơi đói, nên đi săn
  stats.sleep  = Math.max(stats.sleep, 60);   // khá mệt, ngủ sẽ hồi tốt hơn

  player.forcedSleepT = 0;
  player.bedSleep     = false;

  // reset hiệu ứng ướt/lạnh
  body.wet  = 0;
  body.cold = 0;

  // luôn quay về hang của người chơi, không phải hang hổ khác
  let homeRef = null;
  const refs = caveRefs();
  for (const ref of refs){
    if (ref.ownerName === "Bạn"){
      homeRef = ref;
      break;
    }
  }
  if (!homeRef && refs.length) homeRef = refs[0];

  if (homeRef){
    enterCave(homeRef);
  } else {
    scene = "cave";
    sceneCooldown = 1.0;
  }

  // đặt hổ ngay chỗ ổ rơm bên trong hang
  if (cave && cave.bed){
    player.x = cave.bed.x;
    player.y = cave.bed.y;
  }

  // chỉnh camera nhìn đúng chỗ
  cam.x = player.x;
  cam.y = player.y;
  cam.dragTargetX = 0;
  cam.dragTargetY = 0;

  showToast("Hổ ngất đi… tỉnh lại trên ổ rơm, thương tích đầy mình. Hãy ăn và ngủ để hồi phục.", 2.5);
}

  function nearestCarcassInfo(){
    let best = null, bestD = 1e9;
    for (const c of carcasses){
      const d = Math.hypot(c.x - player.x, c.y - player.y);
      if (d < bestD){ bestD = d; best = c; }
    }
    return { c: best, d: bestD };
  }

  // gợi ý tương tác ngữ cảnh để người chơi đỡ bị "lạc"
  function getInteractionHint(){
    if (locked()) return "";
    const parts = [];

    if (scene === "world"){
      const terr = getTerritoryById(territoryIdAt(player.x, player.y));
      if (terr){
        if (terr.isPlayer) parts.push("🏠 Lãnh thổ của bạn");
        else parts.push(`⚠️ ${terr.name}${terr.ownerName?" ("+terr.ownerName+")":""}`);
      }
    }

// hang gần nhất (của bạn / NPC)
if (scene === "world"){
  const cc = nearestCaveRef();
  if (cc.ref && cc.d < 82){
    parts.push(`G: Vào hang (${cc.ref.ownerName})`);
  }
}

const nc = nearestCarcassInfo();
    if (nc.c && nc.d <= 60 && nc.c.meat > 0){
      parts.push(`F: Ăn 🍖 x${nc.c.meat}`);
    }

    if (scene === "cave" && nearBed()){
      parts.push(player.bedSleep ? "SPACE: Dậy" : "SPACE: Ngủ (ổ rơm)");
    }

    if (player.pounceReady){
      parts.push("✨ Vồ sẵn sàng (Chuột trái)");
    }

    if (parts.length === 0){
      parts.push(scene === "world" ? "Chuột trái: cào • Giữ chuột trái: cào rộng • TAB: khoá mục tiêu • 1-4: kỹ năng" : "Đi về cửa hang để ra ngoài");
    }

    if (mouse.rightDown || keys.has("shift")){
      parts.push("Chạy nhanh: tốn Đói + Buồn ngủ");
    } else {
      parts.push("Shift/Chuột phải: chạy nhanh");
    }

    return parts.join(" • ");
  }

  function updateStats(dt){
  // giảm thời gian bất tử / hiệu ứng trúng đòn
  if (player.invulnT > 0) player.invulnT = Math.max(0, player.invulnT - dt);
  if (player.hitFlashT > 0) player.hitFlashT = Math.max(0, player.hitFlashT - dt);

    // cooldowns
    cd.claw = Math.max(0, cd.claw - dt);
    cd.bite = Math.max(0, cd.bite - dt);
    cd.pounce = Math.max(0, cd.pounce - dt);
    cd.roar = Math.max(0, cd.roar - dt);

    // hunger & sleep change
    // sprint làm tốn Đói + Buồn ngủ nhanh hơn (chỉ tính khi đang di chuyển)
    const sprinting = (!player.bedSleep && player.forcedSleepT <= 0 && player.sprint && anyMoveKeyDown());
    const hungerDrainBase = player.bedSleep ? 0.06 : 0.18;  // per second
    const sleepGainBase   = player.bedSleep ? -22.0 : 0.12; // bed sleep reduces quickly

    const hungerDrain = hungerDrainBase + (sprinting ? 0.22 : 0);
    const sleepGain   = sleepGainBase   + (sprinting ? 0.45 : 0);

    stats.hunger = clamp(stats.hunger - hungerDrain*dt, 0, stats.hungerMax);

    if (player.bedSleep){
      // reduce "buồn ngủ"
      stats.sleep = clamp(stats.sleep + sleepGain*dt, 0, stats.sleepMax);
      // slight heal when sleeping
      stats.hp = clamp(stats.hp + 2.2*dt, 0, stats.hpMax);

      if (!nearBed()){
        player.bedSleep = false;
        showToast("Rời ổ rơm!", 0.7);
      }
      if (stats.sleep <= 0.01){
        stats.sleep = 0;
        player.bedSleep = false;
        showToast("Ngủ đủ rồi!", 0.9);
      }
    } else {
      stats.sleep = clamp(stats.sleep + sleepGain*dt, 0, stats.sleepMax);
    }
    // ướt lông & lạnh (mưa, suối) + sưởi ấm bên lửa
if (scene === "world"){
  const tile = worldTileAtPx(player.x, player.y);
  const inWater = (tile === WT.RIVER);
  const raining = (env.weatherType === "rain");

  if (inWater || raining){
    // lội nước làm ướt nhanh hơn đứng dưới mưa
    const gain = inWater ? 26*dt : 12*dt;
    body.wet = clamp(body.wet + gain, 0, body.wetMax);
  } else {
    // khô rất chậm ngoài trời khi không mưa
    body.wet = clamp(body.wet - 4*dt, 0, body.wetMax);
  }

  // ban đêm hoặc mưa khi đang ướt => dễ bị lạnh hơn
  const isNight = (env.time < 5 || env.time >= 19);
  if (body.wet > 25 && (raining || isNight)){
    body.cold = clamp(body.cold + 8*dt, 0, body.coldMax);
  } else {
    body.cold = clamp(body.cold - 6*dt, 0, body.coldMax);
  }
} else if (scene === "cave"){
  // trong hang: gần đống lửa sẽ làm khô & ấm lên
  let nearFire = false;
  if (cave && cave.props){
    for (const p of cave.props){
      if (p.type === P.FIRE){
        const d = Math.hypot(player.x - p.x, player.y - p.y);
        if (d < 220){
          nearFire = true;
          break;
        }
      }
    }
  }
  if (nearFire){
    body.wet  = clamp(body.wet  - 30*dt, 0, body.wetMax);
    body.cold = clamp(body.cold - 30*dt, 0, body.coldMax);
  } else {
    body.wet  = clamp(body.wet  - 6*dt, 0, body.wetMax);
    body.cold = clamp(body.cold - 4*dt, 0, body.coldMax);
  }
}

    // starvation => HP down
    if (stats.hunger <= 0.01){
      stats.hp = clamp(stats.hp - 1.2*dt, 0, stats.hpMax);
    } else {
      // tiny regen if well fed & not too sleepy
      if (stats.hunger > 55 && stats.sleep < 55 && stats.hp < stats.hpMax){
        stats.hp = clamp(stats.hp + 0.18*dt, 0, stats.hpMax);
      }
    }
    // lạnh làm bạn mau mệt & có thể mất máu nhẹ
if (body.cold > 50){
  const extraSleep = ((body.cold - 50) / 50) * 0.4;
  stats.sleep = clamp(stats.sleep + extraSleep*dt, 0, stats.sleepMax);
}
if (body.cold > 85){
  stats.hp = clamp(stats.hp - 0.4*dt, 0, stats.hpMax);
}

    // forced sleep if too sleepy
    if (!player.bedSleep && player.forcedSleepT <= 0 && stats.sleep >= stats.sleepMax - 0.001){
      player.forcedSleepT = 6.0;
      showToast("Buồn ngủ quá… hổ ngất ngủ!", 1.4);
    }

    if (player.forcedSleepT > 0){
      player.forcedSleepT = Math.max(0, player.forcedSleepT - dt);
      // during forced sleep, reduce sleepiness faster
      stats.sleep = clamp(stats.sleep - 14*dt, 0, stats.sleepMax);
      if (player.forcedSleepT <= 0){
        // wake up still a bit sleepy
        stats.sleep = clamp(Math.max(stats.sleep, 55), 0, stats.sleepMax);
        showToast("Hổ tỉnh dậy…", 0.9);
      }
    }

    // death
    if (stats.hp <= 0.01){
      respawn();
    }

    // UI
    setBar(hpFill, hpText, stats.hp, stats.hpMax, "hp");
    setBar(hungerFill, hungerText, stats.hunger, stats.hungerMax, "hunger");
    setBar(sleepFill, sleepText, stats.sleep, stats.sleepMax, "sleep");

    setSkillPill(ab1, "1 Cào", cd.claw);
    setSkillPill(ab2, "2 Cắn", cd.bite);
    setSkillPill(ab3, "3 Vồ", cd.pounce);
    setSkillPill(ab4, "4 Gầm", cd.roar);

    const states = [];
    if (player.forcedSleepT > 0) states.push("Ngất ngủ…");
    if (player.bedSleep) states.push("Đang ngủ trên ổ rơm");
    if (stats.hunger <= 0.01) states.push("Đói kiệt! (-Máu)");
    if (body.wet > 30)  states.push("Lông ướt, di chuyển nặng nề");
    if (body.cold > 45) states.push("Lạnh, lại gần lửa để sưởi");
    let msg = states.join(" • ");
    if (!msg) msg = getInteractionHint();
    stateLabel.textContent = msg;
  }

  // ===================== Loop =====================
  let last = performance.now();

  function tick(now){
    try{
      const dt = Math.min((now - last)/1000, 1/20);
      last = now;

      if (sceneCooldown > 0) sceneCooldown -= dt;

      updateEnv(dt);
      updateStats(dt);

      // move & gameplay
      movePlayer(dt);

      // giữ chuột trái => cào diện rộng (chỉ bắn 1 lần mỗi lần giữ)
      updateMouseHoldAttack(now);

      // update animals only outside
      if (scene === "world"){
        updateAnimals(dt);
        updateRivalTigers(dt);
        updateTerritoryCrossing();
        renderWorld(now/1000, dt);
      } else {
        // trong hang: cho hổ chủ hang đuổi người chơi
        updateCaveTiger(dt);
        renderCave(now/1000, dt);
      }

      // transitions
      checkTransitions();

      // toast
      if (toastTimer > 0){
        toastTimer -= dt;
        if (toastTimer <= 0) toast.classList.remove("show");
      }

      // GỌI STORY UPDATE MỖI FRAME (nếu có)
      if (window.Story && typeof Story.onUpdate === "function") {
        // sau này mình có thể truyền context: player, stats, scene...
        const context = {
          scene,
          player,
          stats,
          env
        };
        Story.onUpdate(dt, context);
      }

      requestAnimationFrame(tick);
    } catch(e){
      showError(e);
    }
  }

  // ===================== Regen =====================
  function regen(){
    errBox.style.display = "none";

    const s = seedInput.value.trim() || "jungle-01";
    generateWorld(s);
    generateCave(s);

    scene = "world";
    sceneCooldown = 0.7;
    scenePill.textContent = "Ngoài rừng";
    miniName.textContent = "Mini Map (Rừng)";

    cam.zoom = 1.05;
    cam.dragX = cam.dragY = cam.dragTargetX = cam.dragTargetY = 0;
    cam.x = player.x; cam.y = player.y;

    // reset stats
    stats.hp = stats.hpMax;
    stats.hunger = 85;
    stats.sleep = 15;
    player.forcedSleepT = 0;
    player.bedSleep = false;
    player.pounceT = 0;

    // reset cooldown
    cd.claw = cd.bite = cd.pounce = cd.roar = 0;

    env.time = 7.0;
    env.weatherTimer = 10;
    env.weatherType = "clear";
    env.weather = "Quang đãng";

    showToast("Đã tạo map!", 0.9);
  }

   regenBtn.addEventListener("click", regen);
  seedInput.addEventListener("keydown", (e)=>{ if (e.key === "Enter") regen(); });

  seedInput.value = "jungle-01";
  regen();

  // GỌI STORY INIT (nếu file story.js tồn tại)
  if (window.Story && typeof Story.onInit === "function") {
    // truyền hàm showToast vào để story có thể bật thông báo
    Story.onInit(showToast);
  }

  requestAnimationFrame(tick);
