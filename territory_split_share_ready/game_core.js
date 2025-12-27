  // ===================== RNG =====================
  function xmur3(str){
    let h = 1779033703 ^ str.length;
    for (let i=0;i<str.length;i++){
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h<<13) | (h>>>19);
    }
    return function(){
      h = Math.imul(h ^ (h>>>16), 2246822507);
      h = Math.imul(h ^ (h>>>13), 3266489909);
      h ^= (h>>>16);
      return h>>>0;
    };
  }
  function mulberry32(seed){
    return function(){
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ (t>>>15), t | 1);
      t ^= t + Math.imul(t ^ (t>>>7), t | 61);
      return ((t ^ (t>>>14))>>>0) / 4294967296;
    };
  }
  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  const lerp  = (a,b,t)=>a+(b-a)*t;

  // ===================== Constants =====================
  const TILE = 32;

  const WT = { GRASS:0, RIVER:1, CAVE_FLOOR:2, MOUNTAIN:3, MOUNTAIN_EDGE:4 };
  const WO = { NONE:0, TREE:1, ROCK:2, BUSH:3 };
  const CT = { FLOOR:0, WALL:1 };
  const P  = { FIRE:"fire", BED:"bed", BONE:"bone", PELT:"pelt" };

  // ===================== Maps =====================
  const world = {
    w: 540, h: 540, // 3x3 territories (mỗi lãnh thổ 180x180)

    tiles:null, objects:null, groundVar:null, solid:null,
    cave:{cx:0,cy:0,r:16},
    caveMouth:{x:0,y:0},
    miniBase:null,
    rand:null
  };
  const cave = {
    w: 92, h: 92,
    tiles:null, var:null, solid:null,
    entrance:{x:8,y:46},
    props:[],
    bed:{x:0,y:0,r:60}, // interact radius
    miniBase:null
  };

  // ===================== Camera =====================
  const cam = { x:0,y:0, zoom:1.05, dragX:0, dragY:0, dragTargetX:0, dragTargetY:0 };

  // ===================== Day/Night + Weather =====================
  const env = {
    time: 7.0,
    speed: 0.25,
    weather: "Quang đãng",
    weatherType: "clear",
    weatherTimer: 30,
    stars: []
  };
  function phaseName(t){
    if (t >= 5 && t < 10) return "Sáng";
    if (t >= 10 && t < 14) return "Trưa";
    if (t >= 14 && t < 18) return "Chiều";
    if (t >= 18 && t < 21) return "Tối";
    return "Đêm";
  }
  function weatherPick(rand){
    const r = rand();
    if (r < 0.60) return {type:"clear", label:"Quang đãng"};
    if (r < 0.85) return {type:"rain",  label:"Mưa nhẹ"};
    return {type:"fog",   label:"Sương mù"};
  }
  function dayFactor(t){
    const a = (t/24)*Math.PI*2;
    const v = (Math.sin(a - Math.PI/2) + 1) / 2;
    return clamp(v, 0, 1);
  }

  // ===================== Effects =====================
  const fx = []; // {type,x,y,t,life,r}
  function addFxRing(x,y, life, r){
    fx.push({type:"ring", x,y, t:0, life, r});
  }
  function addFxSlash(x,y, angle, life){
    fx.push({type:"slash", x,y, a:angle, t:0, life});
  }
  function addFxText(x,y, text, life){
    fx.push({type:"text", x,y, text, t:0, life});
  }

  // ===================== Collision =====================
  function collideResolveCircle(px, py, r, map){
    const mw = map.w, mh = map.h;
    const solid = map.solid;

    const minTX = clamp(Math.floor((px - r)/TILE) - 1, 0, mw-1);
    const maxTX = clamp(Math.floor((px + r)/TILE) + 1, 0, mw-1);
    const minTY = clamp(Math.floor((py - r)/TILE) - 1, 0, mh-1);
    const maxTY = clamp(Math.floor((py + r)/TILE) + 1, 0, mh-1);

    let outX = px, outY = py;

    for (let ty=minTY; ty<=maxTY; ty++){
      for (let tx=minTX; tx<=maxTX; tx++){
        const i = ty*mw + tx;
        if (!solid[i]) continue;

        let or = TILE*0.50;
        if (map === world && map.objects){
          const o = map.objects[i];
          const t = map.tiles[i];
          if (o === WO.TREE) or = 15;
          else if (o === WO.ROCK) or = 14;
          else if (t === WT.RIVER) or = TILE*0.52;
          else if (t === WT.MOUNTAIN || t === WT.MOUNTAIN_EDGE) or = TILE*0.54;
        } else {
          or = TILE*0.54;
        }

        const ox = tx*TILE + TILE/2;
        const oy = ty*TILE + TILE/2;
        const dx = outX - ox;
        const dy = outY - oy;
        const d  = Math.hypot(dx, dy) || 0.0001;
        const minD = r + or;

        if (d < minD){
          const push = (minD - d);
          outX += (dx/d) * push;
          outY += (dy/d) * push;
        }
      }
    }

    const W = mw*TILE, H = mh*TILE;
    outX = clamp(outX, r, W - r);
    outY = clamp(outY, r, H - r);
    return {x: outX, y: outY};
  }

