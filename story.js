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
      wolfIntroAt: 0,

      // for flavor lines
      killsSinceHome: 0,
      lastHomeVisitAt: 0,
      lastWifeTalkAt: 0,
      lastLateWarnAt: 0,

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
      state.questId = "freeplay";
      state.needReturn = false;
      state.killsSinceHome = 0;
      saveLocal();
      setQuest("• Sống sót & bảo vệ lãnh thổ\n  (Săn mồi, nghỉ ngơi, đuổi hổ lạ)");
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
    state.wolfTotal = 28; // "mấy chục con" nhưng vẫn tránh lag
    state.wolfIntroAt = nowSec();

    // spawn đàn sói ngoài cửa hang (ở world)
    try{
      if (typeof spawnQuestWolfRaid === "function"){
        spawnQuestWolfRaid(state.wolfTotal);
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
      state.questId = "freeplay";
      state.wolfStage = "";
      state.wolfTotal = 0;
      state.wolfHoldDawn = false;

      setQuest("• Sống sót & bảo vệ lãnh thổ\n  (Săn mồi, nghỉ ngơi, đuổi hổ lạ)");
      if (toast) toast("Hoàn thành nhiệm vụ: Đêm sói", 1.1);
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


  function wifeRandomLine(){
    // ưu tiên cutscene nhiệm vụ "Đêm sói"
    if (state.questId === "wolf_night") return;
    if (shouldTriggerWolfNight() && (!queue || queue.length===0)){
      wolfNightIntroScene();
      return;
    }
    const t = env ? env.time : 12;
    const late = (t >= 22 || t < 5);

    // tránh nói quá dày
    const ts = nowSec();
    if (ts - (state.lastWifeTalkAt||0) < 12) return;
    state.lastWifeTalkAt = ts;

    if (!window.wifeNPC) return;

    if (late && (ts - (state.lastLateWarnAt||0) > 40)){
      state.lastLateWarnAt = ts;
      const lines = [
        "Chàng về trễ... thiếp sợ lắm. Lỡ bọn hổ đực lạ rình ngoài kia thì sao?",
        "Đêm nay lạnh... chàng về rồi, thiếp mới yên tâm.",
        "Chàng ơi... lần sau chàng đừng đi lâu quá, thiếp lo đến muốn khóc."
      ];
      speakWifeBubble(lines[(Math.random()*lines.length)|0]);
      saveLocal();
      return;
    }

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

    const lines = [
      "Chàng có mệt không? Thiếp sẽ ở đây chờ chàng.",
      "Chàng uống chút nước rồi hãy đi. Thiếp lo cho chàng lắm.",
      "Chàng... thiếp ở trong hang, chàng đừng giận thiếp nữa nhé..."
    ];
    speakWifeBubble(lines[(Math.random()*lines.length)|0]);
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

    // nhiệm vụ săn 3
    if (state.questId === "hunt_3" && !state.huntDone){
      state.huntKills = Math.min(state.huntGoal, (state.huntKills||0) + 1);
      if (state.huntKills >= state.huntGoal){
        state.needReturn = true;
        setQuest("• Quay về hang gặp Tiểu Bạch\n  (Bấm \"Hang\" khi đến cửa hang)");
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
          const d2 = Math.hypot(player.x - window.wifeNPC.x, player.y - window.wifeNPC.y);
          if (d2 < 220){
            finishWolfReturnScene();
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