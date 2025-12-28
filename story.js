// ===================== Story / Dialogue System (Dần Ca & Tiểu Bạch) =====================
// Tối giản, dễ mở rộng. UI được bind qua game_dom.js: setQuest(), showStoryLine(), hideStory().

(function(){
  const STORY_KEY = "territory_split_story_v1";

  // UI hooks (được bind bởi game_dom.js)
  let UI = null;
  let toast = null;

  // Dialogue queue
  let queue = [];
  let onQueueDone = null;
  let blocking = false;

  // NPC: Tiểu Bạch (hổ cái trắng) - xuất hiện trong hang của bạn
  const WIFE_STYLE = {
    tag: "Hổ Trắng - Tiểu Bạch",
    main: "#f2f5ff",
    dark: "#cbd4dc",
    light:"#ffffff",
    stripe:"#aeb7bf",
    eye: "#b7f1ff"
  };

  const WIFE_CHAT_HOME = [
    "Chàng về rồi... thiếp mừng quá.",
    "Thiếp chỉ cần chàng bình an là đủ.",
    "Hôm nay rừng yên ắng... nhưng thiếp vẫn lo.",
    "Chàng đừng gồng mình nữa... thiếp ở đây.",
  ];
  const WIFE_CHAT_DAY = [
    "Nắng đẹp quá... thiếp muốn ra ngoài một chút.",
    "Thiếp sẽ đi quanh đây thôi, không xa đâu.",
    "Chàng nhìn kìa, gió mang mùi cỏ mới.",
    "Thiếp nhớ chàng... nhưng cũng muốn hít thở ngoài rừng.",
  ];
  const WIFE_CHAT_NIGHT = [
    "Đêm xuống rồi... thiếp hơi sợ.",
    "Chàng ở đây, thiếp yên tâm hơn.",
    "Nghe như có tiếng bước chân ngoài kia...",
  ];
  const WIFE_GREET = [
    "Chàng! Chàng ở đây à?",
    "A... chàng về rồi!",
    "Thiếp tìm chàng nãy giờ...",
  ];
  const WIFE_PET = [
    "Ơ... chàng làm thiếp ngại quá...",
    "Hừm... đừng nhìn thiếp như vậy...",
    "Thiếp... thiếp thích chứ.",
    "Chàng vuốt nhẹ thôi... thiếp nhột!",
    "Thiếp nũng nịu một chút thôi nha...",
  ];

  function defaultState(){
    return {
      ver: 1,
      started: false,
      metWife: false,

      // quest
      questId: "",
      questText: "",
      huntGoal: 3,
      huntKills: 0,
      needReturn: false,
      huntDone: false,


      // wolf night quest
      wolfNightDone: false,
      wolfStage: "", // "", "fight", "return"
      wolfTotal: 0,
      wolfHoldDawn: false,
      
      // morning after wolf night
      wolfMorningDone: false,
      wolfMorningStage: "", // "", "hunt", "return"
      wolfMorningFoodGoal: 2,
      wolfMorningFood: 0,

wolfIntroAt: 0,

      // mark day when wolf night ends
      wolfNightDayMark: 0,

      // day tracking (để mở nhiệm vụ theo "qua nhiều ngày")
      dayCount: 0,
      lastEnvTime: 7,
      wolfMorningDayMark: 0,

      // intruder tiger quest
      intruderDone: false,
      intruderStage: "", // "", "fight", "return"

      // for flavor lines
      killsSinceHome: 0,
      lastHomeVisitAt: 0,
      lastWifeTalkAt: 0,
      lastLateWarnAt: 0,

      // petting / affection
      petCD: 0,
      affection: 0,

      // resume quest after intruder (if intruder interrupts)
      resumeQuest: null,

      // remember if intro was played
      introDone: false
    };
  }

  let state = defaultState();

  function saveLocal(){
    // NOTE: không tự lưu cốt truyện vào localStorage.
    return;
  }
  function loadLocal(){
    // NOTE: không tự lưu cốt truyện vào localStorage.
    // Cốt truyện sẽ reset khi tạo map mới; chỉ giữ khi nằm trong Save Game.
    return;
  }
  function resetAll(){
    // reset tiến trình cốt truyện để chơi lại từ đầu
    state = defaultState();
    queue = [];
    blocking = false;
    onQueueDone = null;
    try{ localStorage.removeItem(STORY_KEY); }catch(_){}
    if (UI && UI.hideStory) UI.hideStory();
    refreshUI();
  }


  function nowSec(){
    return (performance && performance.now) ? performance.now()/1000 : Date.now()/1000;
  }

  function setQuest(text){
    state.questText = text || "";
    if (UI && UI.setQuest) UI.setQuest(state.questText);
  }

  function play(lines, opts={}){
    queue = lines.slice();
    onQueueDone = (opts && opts.onDone) ? opts.onDone : null;
    blocking = !!opts.blocking;

    // show first
    advance(true);
  }

  function speakWifeBubble(text){
    // renderCave sẽ vẽ bubble nếu wifeNPC.bubbleT > 0
    if (window.wifeNPC){
      window.wifeNPC.bubbleText = text;
      window.wifeNPC.bubbleT = 2.6;
    }
  }

  function showLine(name, text){
    if (UI && UI.showStoryLine) UI.showStoryLine(name, text);

    // bubble trên đầu NPC (chỉ khi Tiểu Bạch nói)
    if (name && name.toLowerCase().includes("tiểu bạch")){
      speakWifeBubble(text);
    }
  }

  function hide(){
    if (UI && UI.hideStory) UI.hideStory();
  }

  function advance(forceFirst=false){
    if (!forceFirst){
      // if no active lines, do nothing
      if (!queue || queue.length === 0) return;
      queue.shift();
    }
    if (!queue || queue.length === 0){
      hide();
      blocking = false;
      if (onQueueDone){
        const fn = onQueueDone;
        onQueueDone = null;
        fn();
      }
      return;
    }
    const line = queue[0];
    showLine(line.name, line.text);
  }

  function isBlocking(){
    return blocking && queue && queue.length > 0;
  }

  function ensureWifeNPC(){
    // chỉ trong hang của bạn
    if (!(scene === "cave" && activeCaveRef && activeCaveRef.ownerName === "Bạn")) return;

    if (!window.wifeNPC){
      window.wifeNPC = {
        name: "Tiểu Bạch",
        x: (cave && cave.bed) ? cave.bed.x + 84 : player.x + 60,
        y: (cave && cave.bed) ? cave.bed.y - 26 : player.y,
        r: 12,
        face: 0,
        style: WIFE_STYLE,
        bubbleText: "",
        bubbleT: 0
      };
    }

    // giữ vị trí tương đối ổn trong hang (tránh chui vào tường)
    if (cave && typeof window.collideResolveCircle === "function"){
      const rr = collideResolveCircle(window.wifeNPC.x, window.wifeNPC.y, 12, cave);
      window.wifeNPC.x = rr.x;
      window.wifeNPC.y = rr.y;
    }
  }
  // ====== Wife AI ======
  // Tiểu Bạch đi lại trong hang khi rảnh. Buổi sáng hay ra gần cửa hang "phơi nắng".
  function updateWifeAI(dt){
    const w = window.wifeNPC;
    if (!w || !cave) return;

    // init ai fields
    if (typeof w.aiT !== "number"){ w.aiT = 0; w.tx = w.x; w.ty = w.y; w.mode = "idle"; w.modeT = 0; w.pauseT = 0; }

    const t = (env && typeof env.time === "number") ? env.time : 12;
    const morning = (t >= 6 && t < 10);
    const inDialogue = (blocking || (queue && queue.length>0));

    // Nếu Dần Ca đang ngủ/ngất: Tiểu Bạch thường đứng gần ổ rơm
    const playerSleeping = (player && (player.bedSleep || (player.forcedSleepT||0) > 0));

    // chọn mode
    if (!inDialogue){
      w.aiT -= dt;
      if (w.modeT > 0) w.modeT -= dt;
      if (w.pauseT > 0) w.pauseT -= dt;

      if (playerSleeping){
        w.mode = "bed";
        w.modeT = 2.0;
      } else if (morning && w.mode !== "sun" && w.modeT <= 0 && Math.random() < dt*0.05){
        w.mode = "sun";
        w.modeT = 10 + Math.random()*10;
        w.pauseT = 0;
      } else if (!morning && w.mode === "sun" && w.modeT <= 0){
        w.mode = "idle";
        w.modeT = 0;
      } else if (w.mode === "bed" && !playerSleeping){
        w.mode = "idle";
      }

      // pick new target occasionally
      if (w.aiT <= 0 && w.pauseT <= 0){
        const p = pickWifeTarget(w.mode);
        if (p){
          w.tx = p.x; w.ty = p.y;
        }
        w.aiT = 1.8 + Math.random()*2.2;
        if (w.mode === "sun") w.pauseT = 0.6 + Math.random()*0.8;
      }
    }

    // move toward target
    const speed = inDialogue ? 0 : 52; // đứng yên khi đang thoại
    const dx = w.tx - w.x;
    const dy = w.ty - w.y;
    const d = Math.hypot(dx, dy);

    if (d > 2 && speed > 0){
      const vx = (dx/d)*speed;
      const vy = (dy/d)*speed;
      const nx = w.x + vx*dt;
      const ny = w.y + vy*dt;

      // tránh tường hang
      const res = collideResolveCircle(nx, ny, w.r, cave);
      w.x = res.x; w.y = res.y;

      // hướng nhìn theo hướng di chuyển (hoặc nhìn Dần Ca nếu gần)
      w.face = Math.atan2(vy, vx);
      const dp = Math.hypot(player.x - w.x, player.y - w.y);
      if (dp < 160) faceToPlayer(w);
    } else {
      // khi đứng yên: nhìn Dần Ca nếu ở gần
      const dp = Math.hypot(player.x - w.x, player.y - w.y);
      if (dp < 220) faceToPlayer(w);
    }
  }

  function pickWifeTarget(mode){
    if (!cave) return null;
    const bed = cave.bed || {x: player.x, y: player.y};
    const P_REF = window.P || {};
    const fireType = (typeof P_REF.FIRE === 'number') ? P_REF.FIRE : -999;
    const fire = (cave.props || []).find(p=>p.type === fireType) || null;

    function jitter(px, py, r){
      const a = Math.random()*Math.PI*2;
      const rr = Math.random()*r;
      return {x: px + Math.cos(a)*rr, y: py + Math.sin(a)*rr};
    }

    if (mode === "bed"){
      return jitter(bed.x, bed.y, 70);
    }
    if (mode === "sun"){
      // gần cửa hang (phơi nắng / ngó ra ngoài)
      const ex = (cave.entrance.x + 6)*TILE + TILE/2;
      const ey = (cave.entrance.y)*TILE + TILE/2;
      return jitter(ex, ey, 90);
    }

    // idle: đi quanh ổ rơm và lửa
    if (fire && Math.random() < 0.4){
      return jitter(fire.x, fire.y, 120);
    }
    return jitter(bed.x, bed.y, 140);
  }


  function faceToPlayer(npc){
    const dx = player.x - npc.x;
    const dy = player.y - npc.y;
    npc.face = Math.atan2(dy, dx);
  }


  // ====== Wife in World (ban ngày ra khỏi hang đi dạo) ======
  function shouldWifeBeOutside(){
    if (!state.metWife) return false;
    if (state.questId === "wolf_night") return false;
    if (scene !== "world") return false;
        const t = env ? env.time : 12;
    const day = (t >= 6.8 && t <= 17.8);
    if (!day) return false;

    // chỉ quanh hang của bạn, và chỉ khi người chơi ở gần (đỡ tốn CPU + đỡ "lạc")
    if (!world || !world.caveMouth) return false;
    const mx = world.caveMouth.x*TILE + TILE/2;
    const my = world.caveMouth.y*TILE + TILE/2;
    const dp = Math.hypot(player.x - mx, player.y - my);
    return dp < 1200;
  }

  function ensureWifeWorldNPC(){
    if (!shouldWifeBeOutside()){
      if (window.wifeWorldNPC){
        try{ delete window.wifeWorldNPC; }catch(_){ window.wifeWorldNPC = null; }
      }
      return;
    }
    if (scene === "cave") return;

    if (!window.wifeWorldNPC){
      const mx = world.caveMouth.x*TILE + TILE/2;
      const my = world.caveMouth.y*TILE + TILE/2;
      window.wifeWorldNPC = {
        name: "Tiểu Bạch",
        x: mx + 120,
        y: my + 30,
        r: 12,
        face: 0,
        style: WIFE_STYLE,
        bubbleText: "",
        bubbleT: 0,
        // ai
        tx: mx + 80,
        ty: my + 40,
        aiT: 0,
        greetCD: 0,
        followT: 0
      };
    }
  }

  function pickWorldWifeTarget(){
    const mx = world.caveMouth.x*TILE + TILE/2;
    const my = world.caveMouth.y*TILE + TILE/2;
    const a = Math.random()*Math.PI*2;
    const rr = 160 + Math.random()*220;
    return { x: mx + Math.cos(a)*rr, y: my + Math.sin(a)*rr };
  }

  function updateWifeWorldAI(dt){
    const w = window.wifeWorldNPC;
    if (!w || !world || scene !== "world") return;

    if (w.bubbleT > 0){
      w.bubbleT = Math.max(0, w.bubbleT - dt);
      if (w.bubbleT <= 0) w.bubbleText = "";
    }
    if (w.greetCD > 0) w.greetCD = Math.max(0, w.greetCD - dt);
    if (w.followT > 0) w.followT = Math.max(0, w.followT - dt);

    // gặp chồng ngoài rừng: vui vẻ
    const dP = Math.hypot(player.x - w.x, player.y - w.y);
    if (dP < 180 && w.greetCD <= 0 && (!queue || queue.length===0)){
      const line = WIFE_GREET[(Math.random()*WIFE_GREET.length)|0];
      w.bubbleText = line;
      w.bubbleT = 2.2;
      if (toast) toast(`🤍 Tiểu Bạch: ${line}`, 1.0);
      w.greetCD = 10.0;
      w.followT = 6.0; // đi theo chồng một lúc
    }

    // chọn mục tiêu đi dạo / theo chồng
    w.aiT -= dt;
    if (w.aiT <= 0){
      if (w.followT > 0){
        // theo người chơi nhưng giữ khoảng cách
        const back = 82;
        const tx = player.x - Math.cos(player.face)*back;
        const ty = player.y - Math.sin(player.face)*back;
        w.tx = tx; w.ty = ty;
        w.aiT = 0.22;
      } else {
        const p = pickWorldWifeTarget();
        w.tx = p.x; w.ty = p.y;
        w.aiT = 1.6 + Math.random()*1.6;
      }
    }

    // move with world collision (chặn bởi gốc cây/đá)
    const dx = w.tx - w.x;
    const dy = w.ty - w.y;
    const d = Math.hypot(dx,dy) || 0.0001;
    const sp = (w.followT > 0) ? 92 : 72;

    const nx = w.x + (dx/d)*sp*dt;
    const ny = w.y + (dy/d)*sp*dt;

    const res = collideResolveCircle(nx, ny, w.r, world, {wade:true});
    w.x = res.x; w.y = res.y;
    if (Math.abs(dx)+Math.abs(dy) > 1e-2) w.face = Math.atan2(dy, dx);
  }

  function isHomeCave(){
    return (scene === "cave" && activeCaveRef && activeCaveRef.ownerName === "Bạn");
  }

  function placePlayerAtHomeMouth(){
    if (!world || !player) return;
    if (!world.caveMouth) return;

    // dùng helper có sẵn nếu có
    if (typeof window.findSafeExitWorldTileFromMouth === "function"){
      const safe = findSafeExitWorldTileFromMouth(world.caveMouth);
      player.x = safe.tx*TILE + TILE/2;
      player.y = safe.ty*TILE + TILE/2;
    } else {
      player.x = world.caveMouth.x*TILE + TILE/2 + 64;
      player.y = world.caveMouth.y*TILE + TILE/2;
    }
    if (window.cam){
      cam.x = player.x;
      cam.y = player.y;
    }
  }

  // ====== Quest helpers ======
  function beginIntroIfNeeded(){
    if (state.started) return;

    state.started = true;
    saveLocal();

    // đặt người chơi gần cửa hang để đúng cốt truyện mở đầu
    placePlayerAtHomeMouth();

    play([
      {name:"Dần Ca", text:"...Gì thế này? Mình đang ở đâu vậy?"},
      {name:"Dần Ca", text:"Khoan đã—tay chân đâu? ...Mình thành... một con hổ?!" },
      {name:"Dần Ca", text:"Đầu óc quay cuồng. Bản năng thì có, nhưng kỹ năng sinh tồn... mình chẳng biết gì."},
      {name:"Dần Ca", text:"Trước mắt phải tìm nơi trú đã... hình như có một cái hang gần đây."},
    ], {blocking:true, onDone: ()=>{
      state.introDone = true;
      saveLocal();
      setQuest("• Tiến vào hang của bạn\n  (Đến cửa hang để vào)");
      if (toast) toast("Mở đầu cốt truyện bắt đầu!", 1.0);
    }});
  }

  function meetWifeScene(){
    // gặp Tiểu Bạch lần đầu trong hang
    play([
      {name:"Tiểu Bạch", text:"Chàng... chàng về rồi! Thiếp lo quá. Chàng săn được gì chưa?"},
      {name:"Dần Ca", text:"(Giọng mình... sao cộc cằn vậy?) ...Ta... ta chưa săn được gì."},
      {name:"Tiểu Bạch", text:"Chàng đừng doạ thiếp. Thiếp đói lắm... Trong hang chẳng còn gì cả."},
      {name:"Dần Ca", text:"Được. Nàng chờ đây. ...Đừng hỏi nhiều, ta sẽ ra ngoài săn mồi."},
      {name:"Tiểu Bạch", text:"Thiếp chờ. Chàng nhớ cẩn thận... bọn hổ đực lạ hay lẻn vào lãnh thổ lắm."},
    ], {blocking:true, onDone: ()=>{
      state.metWife = true;
      // bắt đầu nhiệm vụ săn 3 con
      state.questId = "hunt_3";
      state.huntKills = 0;
      state.needReturn = false;
      state.huntDone = false;
      state.killsSinceHome = 0;
      saveLocal();
      setQuest(`• Săn 3 con thú cho Tiểu Bạch
  Tiến độ: ${state.huntKills}/${state.huntGoal}
  (Hạ gục thú ngoài rừng rồi quay về hang)`);
    }});
  }

  function finishHuntQuestScene(){
    // hoàn thành nhiệm vụ
    play([
      {name:"Tiểu Bạch", text:"Chàng... chàng thật giỏi! Mang nhiều thịt thế này về cho thiếp..." },
      {name:"Dần Ca", text:"Ừ. Ăn đi. (Ít nhất... mình đã học được cách săn.)"},
      {name:"Tiểu Bạch", text:"Thiếp cảm ơn chàng. Chàng ăn cùng thiếp nhé... chàng mệt rồi."},
      {name:"Dần Ca", text:"Được. Ta ở đây."},
    ], {blocking:true, onDone: ()=>{
      state.huntDone = true;
      state.questId = "wolf_morning";
      state.wolfMorningStage = "hunt";
      state.wolfMorningFood = 0;
      state.needReturn = false;
      state.killsSinceHome = 0;
      saveLocal();
      setQuest(`• BÌNH MINH: Mang thức ăn về hang\n  Tiến độ: ${state.wolfMorningFood||0}/${state.wolfMorningFoodGoal||2}\n  (Săn ${state.wolfMorningFoodGoal||2} con mồi rồi quay về hang)`);
      updateMorningQuestText();
      if (toast) toast("Hoàn thành nhiệm vụ mở đầu!", 1.0);
    }});
  }
  // ===================== Wolf Night Quest =====================
  function countRaidWolves(){
    if (typeof animals === "undefined" || !animals) return 0;
    let c = 0;
    for (const a of animals){
      if (a && a.type === AnimalType.WOLF && a.questTag === "wolf_night") c++;
    }
    return c;
  }

  function updateWolfQuestText(){
    const alive = countRaidWolves();
    const total = state.wolfTotal || 0;
    // tránh setQuest quá dày
    const ts = nowSec();
    if (ts - (state.__wolfHudAt||0) < 0.45) return;
    state.__wolfHudAt = ts;

    if (state.wolfStage === "fight"){
      setQuest(`• ĐÊM SÓI: Tiêu diệt bầy sói\n  Tiến độ: ${Math.max(0, total - alive)}/${total}\n  (Phải diệt hết mới trời sáng)`);
    } else if (state.wolfStage === "return"){
      setQuest("• Trời đã sắp sáng...\n  Hãy quay về hang với Tiểu Bạch");
    }
  }

  function startWolfNightQuest(){
    state.questId = "wolf_night";
    state.wolfStage = "fight";
    state.wolfHoldDawn = true;
    try{ window.__wolfNightActive = true; }catch(_){ }
    // Giảm số lượng để đỡ "spam" và tránh kẹt: 3 bầy x 2 con
    state.wolfPacks = 3;
    state.wolfTotal = 6;
    state.wolfIntroAt = nowSec();

    // spawn đàn sói ngoài cửa hang (ở world)
    try{
      if (typeof spawnQuestWolfRaid === "function"){
        spawnQuestWolfRaid(state.wolfPacks, 2);
      }
    }catch(_){}

    updateWolfQuestText();
    if (toast) toast("🐺 Bầy sói đã xâm nhập! Ra ngoài chiến đấu!", 1.2);
    saveLocal();
  }

  function wolfNightIntroScene(){
    play([
      {name:"Tiểu Bạch", text:"Đêm nay... chàng ngồi đây với thiếp lâu hơn mọi khi."},
      {name:"Tiểu Bạch", text:"Lạ thật... dạo này chàng không còn tức giận hay la mắng thiếp nữa."},
      {name:"Dần Ca", text:"...Ta chỉ... không muốn làm nàng sợ."},
      {name:"Tiểu Bạch", text:"Thiếp biết chàng đã khác rồi. Thiếp... mừng lắm."},
      {name:"(Bên ngoài)", text:"Awoooo...!!"},
      {name:"Tiểu Bạch", text:"Tiếng tru...! Chàng ơi, bầy sói! Chúng vào lãnh thổ rồi!"},
      {name:"Dần Ca", text:"Nàng ở lại trong hang. Ta ra ngoài."},
      {name:"Tiểu Bạch", text:"Chàng cẩn thận! Thiếp sẽ chờ... xin chàng trở về bình an!"},
    ], {blocking:true, onDone: ()=>{
      startWolfNightQuest();
    }});
  }

  function completeWolfFight(){
    // thả trời sáng + yêu cầu quay về hang
    state.wolfStage = "return";
    state.wolfHoldDawn = false;

    // đẩy thời gian qua rạng sáng ngay khi dọn sạch bầy sói
    if (env && typeof env.time === "number"){
      if (env.time < 5.15) env.time = 5.18;
    }

    updateWolfQuestText();
    if (toast) toast("🌅 Yên rồi... bầy sói đã bị tiêu diệt.", 1.25);
    saveLocal();
  }

  function finishWolfReturnScene(){
    play([
      {name:"Tiểu Bạch", text:"Chàng... chàng về rồi!! Thiếp nghe tiếng tru mà tim muốn ngừng đập..."},
      {name:"Tiểu Bạch", text:"Chàng có bị thương không? Lại đây... để thiếp xem."},
      {name:"Dần Ca", text:"Ta ổn. Bầy sói... đã hết rồi. Trời sắp sáng."},
      {name:"Tiểu Bạch", text:"Thiếp tự hào về chàng... Cảm ơn chàng đã bảo vệ hang của chúng ta."},
      {name:"Tiểu Bạch", text:"Chàng nghỉ đi. Thiếp sẽ ở đây chăm sóc chàng."},
    ], {blocking:true, onDone: ()=>{
      state.wolfNightDone = true;
      state.wolfNightDayMark = state.dayCount || 0;
      state.questId = "wolf_morning";
      state.wolfMorningStage = "hunt";
      state.wolfMorningFood = 0;
      state.wolfStage = "";
      state.wolfTotal = 0;
      state.wolfHoldDawn = false;
      try{ window.__wolfNightActive = false; }catch(_){ }

      setQuest(`• BÌNH MINH: Mang thức ăn về hang\n  Tiến độ: ${state.wolfMorningFood||0}/${state.wolfMorningFoodGoal||2}\n  (Săn ${state.wolfMorningFoodGoal||2} con mồi rồi quay về hang)`);
      updateMorningQuestText();
      if (toast) toast("Hoàn thành nhiệm vụ: Đêm sói", 1.1);
      saveLocal();
    }});
  }

  
  function updateMorningQuestText(){
    const goal = state.wolfMorningFoodGoal || 2;
    const got  = state.wolfMorningFood || 0;
    const ts = nowSec();
    if (ts - (state.__morningHudAt||0) < 0.55) return;
    state.__morningHudAt = ts;

    if (state.wolfMorningStage === "hunt"){
      setQuest(`• BÌNH MINH: Mang thức ăn về hang\n  Tiến độ: ${got}/${goal}\n  (Săn ${goal} con mồi rồi quay về hang)`);
    } else if (state.wolfMorningStage === "return"){
      setQuest("• BÌNH MINH: Quay về hang\n  Tiểu Bạch đang đợi bạn");
    }
  }

  function finishMorningQuest(){
    play([
      {name:"Tiểu Bạch", text:"Chàng về rồi... Thiếp lo quá. Chàng còn đau chỗ nào không?"},
      {name:"Dần Ca", text:"Không sao. Ta mang chút mồi về đây."},
      {name:"Tiểu Bạch", text:"Tốt quá... Chàng nghỉ đi. Để thiếp chăm sóc và chuẩn bị thức ăn."},
    ], {blocking:true, onDone: ()=>{
      state.wolfMorningDone = true;
      state.wolfMorningDayMark = state.dayCount || 0;
      state.questId = "freeplay";
      state.wolfMorningStage = "";
      setQuest(`• BÌNH MINH: Mang thức ăn về hang\n  Tiến độ: ${state.wolfMorningFood||0}/${state.wolfMorningFoodGoal||2}\n  (Săn ${state.wolfMorningFoodGoal||2} con mồi rồi quay về hang)`);
      updateMorningQuestText();
      if (toast) toast("Hoàn thành nhiệm vụ: Bình Minh", 1.1);
      saveLocal();
    }});
  }

  // ===================== Quest: Hổ lạ xâm nhập (sau vài ngày) =====================
  
  function shouldTriggerIntruder(){
    if (!state.wolfNightDone) return false;
    if (state.intruderDone) return false;
    if (scene !== "world") return false;

    // cho phép xen giữa quest buổi sáng (nếu người chơi chưa làm xong), tránh "kẹt vì điều kiện"
    if (state.questId && !["freeplay","wolf_morning"].includes(state.questId)) return false;

    // ngày hôm sau sau khi kết thúc nhiệm vụ ĐÊM SÓI
    const dd = (state.dayCount||0) - (state.wolfNightDayMark||0);
    if (dd < 1) return false;

    // thời gian tương đối rộng để dễ gặp sự kiện (sáng->đêm)
    const t = env ? env.time : 12;
    if (t < 9.0 || t > 23.3) return false;

    // phải ở trong lãnh thổ của chính mình
    try{
      if (typeof territoryIdAt === "function"){
        const here = territoryIdAt(player.x, player.y);
        let homeId = 4;
        if (typeof territories !== "undefined" && Array.isArray(territories)){
          const home = territories.find(tt=>tt && tt.isPlayer);
          if (home) homeId = home.id;
        }
        if (here !== homeId) return false;
      }
    }catch(_){ }

    // tránh kích hoạt liên tục
    const ts = nowSec();
    if (ts - (state.__intruderTryAt||0) < 8) return false;
    state.__intruderTryAt = ts;

    return true;
  }

  function startIntruderQuestScene(){
    // chuyển cảnh + rung nhẹ
    try{
      window.cinematicOverlay = { t:0, dur:2.2, text:"HỔ LẠ XÂM NHẬP!" };
      if (typeof addCameraShake === "function") addCameraShake(18, 0.35);
    }catch(_){ }

    play([
      {name:"Tiểu Bạch", text:"Chàng... thiếp cảm thấy có gì đó bất an. Dạo này chàng khác lạ, không còn giận dữ với thiếp nữa..."},
      {name:"Tiểu Bạch", text:"Nhưng ngoài kia... có tiếng gầm lạ. Một hổ đực khác đang tiến vào lãnh thổ!"},
      {name:"Hổ Lạ", text:"Hahaha... hổ trắng muốt kia, theo ta! Ta muốn cả đất này!"},
      {name:"Dần Ca", text:"Ngươi dám! Đây là đất của ta và nàng là vợ ta."},
      {name:"Hổ Lạ", text:"Dù ta đã có vợ... ta vẫn muốn nàng. Thử cản ta xem!"},
    ], {blocking:true, onDone: ()=>{
      // nếu đang làm quest buổi sáng, lưu lại để tiếp tục sau khi đánh lui hổ lạ
      if (state.questId === "wolf_morning"){
        state.resumeQuest = {
          questId: "wolf_morning",
          wolfMorningStage: state.wolfMorningStage,
          wolfMorningFood: state.wolfMorningFood,
          needReturn: state.needReturn
        };
      }

      state.questId = "intruder";
      state.intruderStage = "fight";
      setQuest("• Hổ lạ xâm nhập lãnh thổ!\n  - Đánh bại Hổ Lạ (Hắc Phong)\n  Tiến độ: 0/1");
      try{ if (typeof spawnIntruderTiger === "function") spawnIntruderTiger(); }catch(_){ }
      if (toast) toast("Hổ lạ đã bước vào! Hãy bảo vệ Tiểu Bạch.", 1.15);
      saveLocal();
    }});
  }

  function finishIntruderReturnScene(){
    play([
      {name:"Tiểu Bạch", text:"Chàng về rồi! Trời ơi... thiếp sợ lắm. Hắn nhìn thiếp như muốn nuốt chửng..."},
      {name:"Dần Ca", text:"Không sao. Ta đã đánh lui hắn."},
      {name:"Tiểu Bạch", text:"Chàng có bị thương không? Để thiếp liếm vết thương cho chàng..."},
      {name:"Dần Ca", text:"Ở đây với ta. Từ nay ai bước vào lãnh thổ này đều phải trả giá."},
    ], {blocking:true, onDone: ()=>{
      state.intruderDone = true;
      state.intruderStage = "";

      if (state.resumeQuest && state.resumeQuest.questId === "wolf_morning"){
        // quay lại quest buổi sáng nếu đang dang dở
        state.questId = "wolf_morning";
        state.wolfMorningStage = state.resumeQuest.wolfMorningStage || "hunt";
        state.wolfMorningFood = state.resumeQuest.wolfMorningFood || 0;
        state.needReturn = !!state.resumeQuest.needReturn;
        state.resumeQuest = null;
        updateMorningQuestText();
      } else {
        state.questId = "freeplay";
        setQuest("• Tự do sinh tồn & bảo vệ lãnh thổ");
      }
      // thưởng nhẹ
      if (stats){
        stats.hp = clamp(stats.hp + 10, 0, stats.hpMax);
        stats.hunger = clamp(stats.hunger + 10, 0, stats.hungerMax);
      }
      if (toast) toast("Hoàn thành: Đuổi hổ lạ", 1.1);
      saveLocal();
    }});
  }

function shouldTriggerWolfNight(){
    if (!state.huntDone) return false;              // phải qua quest mở đầu
    if (state.wolfNightDone) return false;          // chỉ 1 lần
    if (!isHomeCave()) return false;
    if (!window.wifeNPC) return false;
    if (state.questId && state.questId !== "freeplay") return false;

    // chỉ kích hoạt vào ban đêm
    const t = env ? env.time : 12;
    const night = (t >= 21.0 || t < 3.5);
    if (!night) return false;

    // người chơi phải ở gần vợ để "đang trò chuyện"
    const d = Math.hypot(player.x - window.wifeNPC.x, player.y - window.wifeNPC.y);
    if (d > 210) return false;

    // tránh kích hoạt quá sớm liên tục
    const ts = nowSec();
    if (ts - (state.__wolfTryAt||0) < 6) return false;
    state.__wolfTryAt = ts;
    return true;
  }

  function getNearWifeForPet(){
    // ưu tiên trong hang của bạn
    if (window.wifeNPC){
      const d = Math.hypot(player.x - window.wifeNPC.x, player.y - window.wifeNPC.y);
      if (d < 140) return { w: window.wifeNPC, d, where: "cave" };
    }
    if (window.wifeWorldNPC){
      const d = Math.hypot(player.x - window.wifeWorldNPC.x, player.y - window.wifeWorldNPC.y);
      if (d < 140) return { w: window.wifeWorldNPC, d, where: "world" };
    }
    return null;
  }

  function tryPetWife(){
    if (isBlocking()) return false;
    if (state.petCD > 0) return false;
    const near = getNearWifeForPet();
    if (!near) return false;

    const line = WIFE_PET[(Math.random()*WIFE_PET.length)|0];
    if (near.w){
      near.w.bubbleText = line;
      near.w.bubbleT = 2.2;
      if (toast) toast(`🤍 Tiểu Bạch: ${line}`, 1.0);
    }
    state.petCD = 6.0;
    state.affection = (state.affection||0) + 1;

    // buff nhẹ
    if (stats){
      stats.hp = clamp(stats.hp + 3, 0, stats.hpMax);
      stats.hunger = clamp(stats.hunger + 2, 0, stats.hungerMax);
    }
    return true;
  }

  
  function wifeRandomLine(){
    // ưu tiên cutscene nhiệm vụ "Đêm sói"
    if (state.questId === "wolf_night") return;
    if (shouldTriggerWolfNight() && (!queue || queue.length===0)){
      wolfNightIntroScene();
      return;
    }

    const t = env ? env.time : 12;
    const day = (t >= 7 && t <= 18);
    const late = (t >= 22 || t < 5);
    const pool = day ? WIFE_CHAT_DAY : (late ? WIFE_CHAT_NIGHT : WIFE_CHAT_HOME);

    // tránh nói quá dày
    const ts = nowSec();
    if (ts - (state.lastWifeTalkAt||0) < 12) return;
    state.lastWifeTalkAt = ts;

    if (!window.wifeNPC) return;

    // đêm khuya: nhắc nhẹ
    if (late && (ts - (state.lastLateWarnAt||0) > 40)){
      state.lastLateWarnAt = ts;
      speakWifeBubble(WIFE_CHAT_NIGHT[(Math.random()*WIFE_CHAT_NIGHT.length)|0]);
      saveLocal();
      return;
    }

    // khen khi chồng vừa săn nhiều
    if ((state.killsSinceHome||0) >= 2){
      const lines = [
        "Nhiều thịt quá... chàng thật mạnh mẽ! Thiếp tự hào về chàng.",
        "Thịt ngon quá chàng... thiếp ăn no rồi. Chàng cũng phải ăn nữa nhé.",
        "Chàng săn giỏi thật. Thiếp chỉ mong chàng bình an trở về."
      ];
      speakWifeBubble(lines[(Math.random()*lines.length)|0]);
      state.killsSinceHome = 0;
      saveLocal();
      return;
    }

    // bình thường: chọn trong pool
    speakWifeBubble(pool[(Math.random()*pool.length)|0]);
    saveLocal();
  }


  function onKill(kind, obj){
    // đếm thịt để vợ khen
    state.killsSinceHome = (state.killsSinceHome||0) + 1;


    // nhiệm vụ "Đêm sói"
    if (state.questId === "wolf_night" && state.wolfStage === "fight" && kind === "animal" && obj && obj.type === AnimalType.WOLF && obj.questTag === "wolf_night"){
      updateWolfQuestText();
      if (countRaidWolves() <= 0){
        completeWolfFight();
      }
      saveLocal();
      return;
    }


    // nhiệm vụ "Bình Minh" (săn mồi mang về hang)
    if (state.questId === "wolf_morning" && state.wolfMorningStage === "hunt" && kind === "animal" && obj){
      const t = obj.type;
      const ok = (t === AnimalType.DEER || t === AnimalType.RABBIT || t === AnimalType.BOAR || t === AnimalType.SQUIRREL);
      if (ok){
        state.wolfMorningFood = Math.min(state.wolfMorningFoodGoal||2, (state.wolfMorningFood||0) + 1);
        updateMorningQuestText();
        if ((state.wolfMorningFood||0) >= (state.wolfMorningFoodGoal||2)){
          state.wolfMorningStage = "return";
          if (toast) toast("Đủ thức ăn! Hãy quay về hang.", 1.0);
          updateMorningQuestText();
        }
        saveLocal();
        return;
      }
    }

    // nhiệm vụ "Hổ lạ xâm nhập"
    if (state.questId === "intruder" && state.intruderStage === "fight" && kind === "rival" && obj && obj.isIntruder){
      state.intruderStage = "return";
      setQuest("• Đã đuổi hổ lạ!\n  - Quay về hang gặp Tiểu Bạch");
      try{ obj.__despawnT = 6.5; }catch(_){ }
      if (toast) toast("Hổ lạ bị đánh lui! Về hang thôi.", 1.05);
      saveLocal();
      return;
    }

    // nhiệm vụ săn 3
    if (state.questId === "hunt_3" && !state.huntDone){
      state.huntKills = Math.min(state.huntGoal, (state.huntKills||0) + 1);
      if (state.huntKills >= state.huntGoal){
        state.needReturn = true;
        setQuest('• Quay về hang gặp Tiểu Bạch\n  (Bấm "Hang" khi đến cửa hang)');
        if (toast) toast("Đủ thịt rồi! Về hang thôi.", 1.0);
      } else {
        setQuest(`• Săn 3 con thú cho Tiểu Bạch
  Tiến độ: ${state.huntKills}/${state.huntGoal}
  (Hạ gục thú ngoài rừng rồi quay về hang)`);
      }
      saveLocal();
    } else {
      saveLocal();
    }
  }

  function onRespawnInHome(){
    if (!state.metWife) return;
    // Tiểu Bạch chăm sóc khi tỉnh dậy
    play([
      {name:"Tiểu Bạch", text:"Chàng tỉnh rồi! Thiếp tưởng chàng... chàng đừng làm thiếp sợ nữa."},
      {name:"Tiểu Bạch", text:"Thiếp để chút thịt đây. Chàng ăn đi rồi hãy ra ngoài."},
      {name:"Dần Ca", text:"...Ừ. Ta ổn. (May mà còn có nàng.)"},
    ], {blocking:true, onDone: ()=>{
      // “đưa thịt”: hồi đói/HP nhẹ
      if (stats){
        stats.hunger = clamp(stats.hunger + 22, 0, stats.hungerMax);
        stats.hp = clamp(stats.hp + 6, 0, stats.hpMax);
      }
      saveLocal();
    }});
  }

  function refreshUI(){
    if (UI && UI.setQuest) UI.setQuest(state.questText || "");
    // hide story if no queue
    if ((!queue || queue.length===0) && UI && UI.hideStory) UI.hideStory();
  }

  // ======= Public API =======
  window.Story = {
    bindUI(ui){
      UI = ui || null;
      refreshUI();
    },
    onInit(showToast){
      // đánh dấu đã init UI/story
      window.Story.__initDone = true;
      toast = showToast || null;
      loadLocal();
      refreshUI();

      // nếu là game mới => mở đầu cốt truyện
      beginIntroIfNeeded();
    },
    onUpdate(dt, context){
      // update wife bubble timer
      if (window.wifeNPC && window.wifeNPC.bubbleT > 0){
        window.wifeNPC.bubbleT = Math.max(0, window.wifeNPC.bubbleT - dt);
        if (window.wifeNPC.bubbleT <= 0) window.wifeNPC.bubbleText = "";
      }

      // pet cooldown
      if (state.petCD > 0) state.petCD = Math.max(0, state.petCD - dt);

      // wife world npc timers
      if (window.wifeWorldNPC && window.wifeWorldNPC.bubbleT > 0){
        window.wifeWorldNPC.bubbleT = Math.max(0, window.wifeWorldNPC.bubbleT - dt);
        if (window.wifeWorldNPC.bubbleT <= 0) window.wifeWorldNPC.bubbleText = "";
      }

      // đếm số ngày trôi qua dựa vào env.time (0..24)
      try{
        const ct = (context && context.env && typeof context.env.time === "number") ? context.env.time : (env ? env.time : null);
        if (ct != null){
          if (typeof state.lastEnvTime !== "number") state.lastEnvTime = ct;
          if (ct < (state.lastEnvTime - 12)){
            state.dayCount = (state.dayCount||0) + 1;
          }
          state.lastEnvTime = ct;
        }
      }catch(_){ }

      // kích hoạt nhiệm vụ hổ lạ ngoài rừng (sau vài ngày)
      if (shouldTriggerIntruder() && (!queue || queue.length===0)){
        startIntruderQuestScene();
      }

      // nếu đang ở giai đoạn đánh hổ lạ mà chưa spawn (ví dụ vừa regen/load), spawn lại
      if (state.questId === "intruder" && state.intruderStage === "fight" && scene === "world"){
        try{
          const has = (typeof rivalTigers !== "undefined" && Array.isArray(rivalTigers)) ? rivalTigers.some(t=>t && t.isIntruder && t.deadT <= 0) : false;
          if (!has && typeof spawnIntruderTiger === "function") spawnIntruderTiger();
        }catch(_){ }
      }



      // wolf quest runtime (đếm sói / giữ trời tối)
      if (state.questId === "wolf_night"){
        // cập nhật text nhiệm vụ
        updateWolfQuestText();
        if (state.wolfStage === "fight"){
          const alive = countRaidWolves();
          if (alive <= 0){
            completeWolfFight();
          }
        }
      }

      // morning quest after wolf night
      if (state.questId === "wolf_morning"){
        updateMorningQuestText();
        if (state.wolfMorningStage === "return" && (!queue || queue.length===0)){
          if (window.wifeNPC){
            const d3 = Math.hypot(player.x - window.wifeNPC.x, player.y - window.wifeNPC.y);
            if (d3 < 220){
              finishMorningQuest();
            }
          }
        }
      }
      // Tiểu Bạch ra khỏi hang ban ngày (world)
      if (scene === "world"){
        ensureWifeWorldNPC();
        if (window.wifeWorldNPC) updateWifeWorldAI(dt);
      } else {
        if (window.wifeWorldNPC){
          try{ delete window.wifeWorldNPC; }catch(_){ window.wifeWorldNPC = null; }
        }
      }




      // ensure wife exists ONLY in home cave.
      // Fix bug: Tiểu Bạch bị "kẹt" lại và xuất hiện trong hang hổ khác nếu không xoá.
      if (isHomeCave()){
        ensureWifeNPC();
        if (window.wifeNPC) updateWifeAI(dt);

        // lần đầu gặp vợ
        if (state.introDone && !state.metWife && (!queue || queue.length===0)){
          meetWifeScene();
        }

        // hoàn thành nhiệm vụ săn
        if (state.metWife && state.questId==="hunt_3" && state.needReturn && (!queue || queue.length===0)){
          finishHuntQuestScene();
        }


        // kết thúc nhiệm vụ "Đêm sói" khi đã dọn sạch và quay về hang
        if (state.questId === "wolf_night" && state.wolfStage === "return" && (!queue || queue.length===0)){
          if (window.wifeNPC){
            const d2 = Math.hypot(player.x - window.wifeNPC.x, player.y - window.wifeNPC.y);
            if (d2 < 220){
              finishWolfReturnScene();
            }
          }
        }

        // kết thúc nhiệm vụ "Hổ lạ" khi quay về hang
        if (state.questId === "intruder" && state.intruderStage === "return" && (!queue || queue.length===0)){
          if (window.wifeNPC){
            const d4 = Math.hypot(player.x - window.wifeNPC.x, player.y - window.wifeNPC.y);
            if (d4 < 220){
              finishIntruderReturnScene();
            }
          }
        }

        // hoàn thành nhiệm vụ hổ lạ khi quay về hang
        if (state.questId === "intruder" && state.intruderStage === "return" && (!queue || queue.length===0)){
          if (window.wifeNPC){
            const d4 = Math.hypot(player.x - window.wifeNPC.x, player.y - window.wifeNPC.y);
            if (d4 < 220){
              finishIntruderReturnScene();
            }
          }
        }

        // hội thoại ngẫu nhiên khi về hang
        // chỉ nói khi người chơi không ở quá xa
        if (window.wifeNPC){
          const d = Math.hypot(player.x - window.wifeNPC.x, player.y - window.wifeNPC.y);
          if (d < 220 && (!queue || queue.length===0)){
            wifeRandomLine();
          }
        }
      } else {
        // rời hang của bạn / vào hang NPC khác => xoá Tiểu Bạch khỏi scene
        if (window.wifeNPC){
          try{ delete window.wifeNPC; }catch(_){ window.wifeNPC = null; }
        }
      }
    },
    onKill(kind, obj){ onKill(kind, obj); },
        holdDawn(){ return !!state.wolfHoldDawn; },
onRespawn(){ onRespawnInHome(); },
    reset(){ resetAll(); },
    onNewMap(seedStr){
      // gọi khi người chơi 'Tạo map' (regen). Reset lại toàn bộ tiến trình cốt truyện.
      // Chỉ khi Load Save thì tiến trình mới được khôi phục qua applySaveState.
      resetAll();
      // clear wife npc so it will respawn fresh in home cave
      if (window.wifeNPC) { try{ delete window.wifeNPC; }catch(_){ window.wifeNPC=null; } }
      beginIntroIfNeeded();
    },
    advance(){ advance(false); },
    isBlocking(){ return isBlocking(); },

    tryPetWife(){ return tryPetWife(); },

    getSaveState(){
      // lưu tiến trình cốt truyện trong save game
      return JSON.parse(JSON.stringify(state));
    },
    applySaveState(s){
      if (!s || typeof s !== "object") return;
      // khi load game: đóng hội thoại đang mở để tránh kẹt
      queue = [];
      blocking = false;
      if (UI && UI.hideStory) UI.hideStory();

      state = Object.assign(defaultState(), s);
      saveLocal();
      refreshUI();
    }
  };
})();