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
    view.width  = Math.floor(window.innerWidth * dpr);
    view.height = Math.floor(window.innerHeight * dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  window.addEventListener("resize", resize);
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

