  // ===================== DOM =====================
  const view = document.getElementById("view");
  const ctx  = view.getContext("2d", {alpha:false});

  const mini = document.getElementById("minimap");
  const mctx = mini.getContext("2d", {alpha:false});

  const seedInput = document.getElementById("seedInput");
  const regenBtn  = document.getElementById("regenBtn");

  const posLabel     = document.getElementById("posLabel");
  const timeLabel    = document.getElementById("timeLabel");
  const weatherLabel = document.getElementById("weatherLabel");
  const animalCountLabel = document.getElementById("animalCountLabel");
  const scenePill    = document.getElementById("scenePill");
  const miniName     = document.getElementById("miniName");

  const hpFill = document.getElementById("hpFill");
  const hungerFill = document.getElementById("hungerFill");
  const sleepFill = document.getElementById("sleepFill");
  const hpText = document.getElementById("hpText");
  const hungerText = document.getElementById("hungerText");
  const sleepText = document.getElementById("sleepText");

  const ab1 = document.getElementById("ab1");
  const ab2 = document.getElementById("ab2");
  const ab3 = document.getElementById("ab3");
  const ab4 = document.getElementById("ab4");
  const stateLabel = document.getElementById("stateLabel");

  const toast = document.getElementById("toast");
  const errBox = document.getElementById("err");
  const hint = document.getElementById("hint");

  // Story + Quest UI
  const questBox  = document.getElementById("questBox");
  const questText = document.getElementById("questText");
  const storyBar  = document.getElementById("storyBar");
  const storyName = document.getElementById("storyName");
  const storyText = document.getElementById("storyText");
  const storyHint = document.getElementById("storyHint");

  function setQuest(text){
    if (!questBox || !questText) return;
    if (!text){
      questBox.style.display = "none";
      questBox.setAttribute("aria-hidden","true");
      questText.textContent = "";
      return;
    }
    questText.textContent = text;
    questBox.style.display = "block";
    questBox.setAttribute("aria-hidden","false");
  }

  function showStoryLine(name, text){
    if (!storyBar || !storyName || !storyText) return;
    storyName.textContent = name || "";
    storyText.textContent = text || "";
    storyBar.style.display = "block";
    storyBar.setAttribute("aria-hidden","false");
    if (storyHint){
      storyHint.textContent = ("ontouchstart" in window) ? "Chạm để tiếp tục" : "Nhấp để tiếp tục";
    }
  }
  function hideStory(){
    if (!storyBar) return;
    storyBar.style.display = "none";
    storyBar.setAttribute("aria-hidden","true");
  }

  // allow tap/click to advance story
  if (storyBar){
    storyBar.addEventListener("click", ()=>{
      if (window.Story && typeof Story.advance === "function"){
        Story.advance();
      }
    });
  }
  window.addEventListener("keydown", (e)=>{
    if (e.key === "Enter" || e.key === " "){
      if (window.Story && typeof Story.advance === "function"){
        Story.advance();
      }
    }
  });

  // expose helpers for story.js
  window.setQuest = setQuest;
  window.showStoryLine = showStoryLine;
  window.hideStory = hideStory;

  // bind UI to story module (if present)
  if (window.Story && typeof Story.bindUI === "function"){
    Story.bindUI({ setQuest, showStoryLine, hideStory });
  }


  let toastTimer = 0;
  function showToast(text, sec=1.1){
    toast.textContent = text;
    toast.classList.add("show");
    toastTimer = sec;
  }
  function showError(e){
    errBox.style.display = "block";
    errBox.textContent = "LỖI JS:\n" + (e && (e.stack || e.message) ? (e.stack || e.message) : String(e));
  }
  window.addEventListener("error", (e)=>showError(e.error || e.message));

  function resize(){
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    // iOS/Android: dùng visualViewport nếu có để hạn chế lỗi thanh URL làm thay đổi kích thước.
    const vv = window.visualViewport;
    const w = (vv && vv.width)  ? vv.width  : window.innerWidth;
    const h = (vv && vv.height) ? vv.height : window.innerHeight;
    view.width  = Math.floor(w * dpr);
    view.height = Math.floor(h * dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  window.addEventListener("resize", resize);
  if (window.visualViewport){
    window.visualViewport.addEventListener("resize", resize);
    window.visualViewport.addEventListener("scroll", resize);
  }
  resize();

  // ===================== roundRect fallback =====================
  function roundRectPath(c, x, y, w, h, r){
    r = Math.max(0, Math.min(r, Math.min(w,h)/2));
    c.beginPath();
    c.moveTo(x+r, y);
    c.lineTo(x+w-r, y);
    c.quadraticCurveTo(x+w, y, x+w, y+r);
    c.lineTo(x+w, y+h-r);
    c.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
    c.lineTo(x+r, y+h);
    c.quadraticCurveTo(x, y+h, x, y+h-r);
    c.lineTo(x, y+r);
    c.quadraticCurveTo(x, y, x+r, y);
    c.closePath();
  }

