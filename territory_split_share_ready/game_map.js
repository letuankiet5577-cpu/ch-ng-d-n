  // ===================== Territories (Lãnh thổ) =====================
  const TERR = { SIZE: 180, GRID: 3 }; // 3x3 = 9 lãnh thổ, ở giữa là của người chơi
  const territories = []; // {id, tx,ty, x0,y0,x1,y1, px0,py0,px1,py1, isPlayer, name, ownerName, caveMouth}
  const rivalTigers = []; // NPC hổ đực ở các lãnh thổ xung quanh

  let currentTerritoryId = -1;

  function territoryIdAt(px, py){
    const tx = clamp(Math.floor(px / (TERR.SIZE*TILE)), 0, TERR.GRID-1);
    const ty = clamp(Math.floor(py / (TERR.SIZE*TILE)), 0, TERR.GRID-1);
    return ty*TERR.GRID + tx;
  }
  function getTerritoryById(id){
    return territories.find(t=>t.id===id) || null;
  }
  function inTerritoryPx(px,py, terr){
    return px>=terr.px0 && px<terr.px1 && py>=terr.py0 && py<terr.py1;
  }
  function dirNameFor(tx,ty){
    const dx = tx-1, dy = ty-1;
    if (dx===0 && dy===0) return "Lãnh thổ của bạn";
    const y = (dy<0) ? "Bắc" : (dy>0) ? "Nam" : "";
    const x = (dx<0) ? "Tây" : (dx>0) ? "Đông" : "";
    return `Lãnh thổ ${x}${x&&y?" ":""}${y}`.trim();
  }

  // Bảng màu hổ đực để phân biệt (giữ phong cách đồ họa hiện tại)
  const RIVAL_PALETTES = [
    {tag:"Hổ Đực Cam Cháy", main:"#e26a1b", dark:"#b64a10"},
    {tag:"Hổ Đực Vàng Sậm", main:"#eaa42a", dark:"#c57a13"},
    {tag:"Hổ Đực Nâu",      main:"#d47a2a", dark:"#a85a12"},
    {tag:"Hổ Đực Nhạt",     main:"#f2b266", dark:"#d58b2b"},
    {tag:"Hổ Đực Mật Ong",  main:"#f0b23a", dark:"#d08a22"},
    {tag:"Hổ Đực Đỏ Nâu",   main:"#d8622a", dark:"#a9461c"},
    {tag:"Hổ Đực Cam Vàng", main:"#f1a23a", dark:"#c87820"},
    {tag:"Hổ Đực Sẫm",      main:"#cc6f22", dark:"#8a3f14"},
  ];

  function scheduleTigerMode(time24){
    // 20:00-05:00 nghỉ; sáng tuần tra; trưa săn; chiều tuần tra
    if (time24 >= 20 || time24 < 5) return "rest";
    if (time24 < 9)  return "patrol";
    if (time24 < 17) return "hunt";
    return "patrol";
  }

  function buildPatrolWaypoints(terr){
    // 1 vòng tuần tra quanh rìa lãnh thổ (để hổ "có việc để làm")
    const pad = 3*TILE;
    const x0 = terr.px0 + pad, y0 = terr.py0 + pad;
    const x1 = terr.px1 - pad, y1 = terr.py1 - pad;
    return [
      {x:x0, y:y0}, {x:x1, y:y0}, {x:x1, y:y1}, {x:x0, y:y1}
    ];
  }

  function updateTerritoryCrossing(){
    if (scene !== "world") return;
    const tid = territoryIdAt(player.x, player.y);
    if (tid !== currentTerritoryId){
      currentTerritoryId = tid;
      const terr = getTerritoryById(tid);
      if (terr){
        if (terr.isPlayer){
          showToast("🏠 Bạn đang ở lãnh thổ của mình", 0.95);
        } else {
          const owner = terr.ownerName ? ` (${terr.ownerName})` : "";
          showToast(`⚠️ Xâm nhập ${terr.name}${owner}`, 1.15);
        }
      }
    }
  }

  // ===================== Map Generation: World =====================
  function generateWorld(seedStr){
    // World lớn = 3x3 lãnh thổ. Ở giữa là của người chơi (giữ phong cách cũ),
    // 8 lãnh thổ xung quanh thuộc về các hổ đực khác, có hang + lịch trình tuần tra/săn/nghỉ.
    const seedFn = xmur3(seedStr);
    const baseRand = mulberry32(seedFn());
    world.rand = baseRand;

    const size = world.w * world.h;
    world.tiles     = new Uint8Array(size);
    world.objects   = new Uint8Array(size);
    world.groundVar = new Uint8Array(size);
    world.solid     = new Uint8Array(size);

    world.tiles.fill(WT.GRASS);
    world.objects.fill(WO.NONE);
    world.solid.fill(0);
    for (let i=0;i<size;i++) world.groundVar[i] = (baseRand()*255)|0;

    // reset
    territories.length = 0;
    rivalTigers.length = 0;
    world.otherCaves = [];

    // helper: tạo 1 lãnh thổ rồi "dán" vào world lớn
    function generateTerritoryInto(seed, ox, oy, isPlayer){
      const seedFn2 = xmur3(seed);
      const rand = mulberry32(seedFn2());

      const w = TERR.SIZE, h = TERR.SIZE;
      const size = w*h;
      const tiles = new Uint8Array(size);
      const objects = new Uint8Array(size);
      const groundVar = new Uint8Array(size);
      const solid = new Uint8Array(size);
      const reserved = new Uint8Array(size); // vùng cấm đặt object (lối vào hang, v.v.)

      tiles.fill(WT.GRASS);
      objects.fill(WO.NONE);
      solid.fill(0);
      for (let i=0;i<size;i++) groundVar[i] = (rand()*255)|0;

      // ===== River (mỗi lãnh thổ có thể có đoạn suối/river nhỏ để tạo cảm giác khác nhau)
      const hasRiver = (isPlayer || rand() < 0.72);
      if (hasRiver){
        let rx = Math.floor(lerp(8, w*0.35, rand()));
        let ry = Math.floor(lerp(8, h*0.35, rand()));
        const tx = w - 8;
        const ty = Math.floor(lerp(h*0.58, h-12, rand()));

        const carveRiver = (x,y,ww)=>{
          for (let oy=-ww; oy<=ww; oy++){
            for (let ox=-ww; ox<=ww; ox++){
              const nx=x+ox, ny=y+oy;
              if (nx<0||ny<0||nx>=w||ny>=h) continue;
              if (Math.hypot(ox,oy) <= ww+0.25) tiles[ny*w + nx] = WT.RIVER;
            }
          }
        };

        for (let it=0; it<5200; it++){
          carveRiver(rx, ry, 1 + ((rand()*2)|0));
          const dx = tx - rx;
          const dy = ty - ry;
          if (Math.hypot(dx,dy) < 3) break;

          const bx = Math.sign(dx);
          const by = Math.sign(dy);
          const r = rand();
          if (r < 0.55)      rx += bx;
          else if (r < 0.77) ry += by;
          else ry += (rand()<0.5 ? -1 : 1);

          rx = clamp(rx, 2, w-3);
          ry = clamp(ry, 2, h-3);
        }
      }
// ===================== Rival tiger (NPC) =====================
  function damageRivalTiger(t, dmg){
    t.hp -= dmg;
    t.hitFlashT = Math.max(t.hitFlashT, 0.25);
    addFxText(t.x, t.y-18, `-${dmg}`, 0.55);

    // bị đánh => sẽ bảo vệ lãnh thổ quyết liệt hơn
    t.aggroT = Math.max(t.aggroT, 7.5);
    
    // máu thấp => chạy về hang
    if (t.hp < t.hpMax * 0.3 && !t.fleeing){
      t.fleeing = true;
      t.mode = "flee_to_cave";
      showToast(`🐯 ${t.name} bị thương nặng, chạy về hang!`, 1.1);
    }
    
    if (t.hp <= 0){
      // không "chết hẳn" để tránh phá vòng lặp: rút về hang, hồi phục
      addFxText(t.x, t.y-26, "Bị hạ gục!", 0.9);
      t.deadT = 12.0; // thời gian nghỉ ngơi trong hang
      t.hp = t.hpMax * 0.5; // hồi một nửa máu
      t.mode = "rest";
      t.target = null;
      t.fleeing = false;
      // teleport về hang
      t.x = t.homeX;
      t.y = t.homeY;
      showToast(`🐯 ${t.name} rút lui về hang nghỉ ngơi!`, 1.1);
      return true;
    }
    return false;
  }
      // ===== Mountain + cave mouth (hang) — varied per territory
// Mỗi lãnh thổ có vị trí + kiểu hang khác nhau để dễ nhận diện,
// và có "đường hầm" mở ra ngoài để NPC không bị kẹt trong tường đá.
const caveStyle = isPlayer ? 0 : ((rand()*4)|0);
const baseR = isPlayer ? 16 : (13 + ((rand()*11)|0)); // player giữ r=16, NPC 13..23
const margin = baseR + 20;

// Chọn vị trí hang (tránh river để không "đè" lên sông)
let lcX = 0, lcY = 0, foundC = false;
for (let tries=0; tries<90 && !foundC; tries++){
  lcX = (margin + rand()*(w - margin*2))|0;
  lcY = (margin + rand()*(h - margin*2))|0;

  foundC = true;
  for (let yy=-4; yy<=4 && foundC; yy++){
    for (let xx=-4; xx<=4; xx++){
      const nx = lcX + xx, ny = lcY + yy;
      if (nx<2 || ny<2 || nx>=w-2 || ny>=h-2) { foundC = false; break; }
      if (tiles[ny*w + nx] === WT.RIVER) { foundC = false; break; }
    }
  }
}
if (isPlayer){
  // giữ vị trí hang gần bản cũ cho lãnh thổ của bạn
  lcX = clamp(Math.floor(w*0.73 + lerp(-10,10, rand())), margin, w-margin);
  lcY = clamp(Math.floor(h*0.58 + lerp(-10,10, rand())), margin, h-margin);
} else if (!foundC){
  lcX = clamp(Math.floor(w*0.73 + lerp(-12,12, rand())), margin, w-margin);
  lcY = clamp(Math.floor(h*0.58 + lerp(-12,12, rand())), margin, h-margin);
}

// Hang (tọa độ theo WORLD tile)
const cave = { cx: ox + lcX, cy: oy + lcY, r: baseR, style: caveStyle };

// Chọn hướng miệng hang (W/E/N/S) sao cho đường hầm không vượt biên
const sideOrder = [0,1,2,3];
for (let i=sideOrder.length-1;i>0;i--){
  const j = (rand()*(i+1))|0;
  const tmp = sideOrder[i]; sideOrder[i] = sideOrder[j]; sideOrder[j] = tmp;
}
const sideDir = (s)=> (s===0?Math.PI : s===1?0 : s===2? -Math.PI/2 : Math.PI/2);

let mouthSide = 0;
let mouthLocal = {x: lcX - baseR + 2, y: lcY};
const corridorLen = 22 + ((rand()*8)|0); // đủ xuyên qua vòng núi + ra ngoài
for (let k=0;k<sideOrder.length;k++){
  const s = sideOrder[k];
  const jitter = isPlayer ? 0 : (((rand()*11)|0) - 5); // -5..+5
  let mx, my;
  if (s === 0){ mx = lcX - baseR + 2; my = clamp(lcY + jitter, 3, h-4); }
  else if (s === 1){ mx = lcX + baseR - 2; my = clamp(lcY + jitter, 3, h-4); }
  else if (s === 2){ mx = clamp(lcX + jitter, 3, w-4); my = lcY - baseR + 2; }
  else { mx = clamp(lcX + jitter, 3, w-4); my = lcY + baseR - 2; }

  const dx = (s===0?-1:(s===1?1:0));
  const dy = (s===2?-1:(s===3?1:0));
  const ex = mx + dx*corridorLen;
  const ey = my + dy*corridorLen;
  if (ex>2 && ey>2 && ex<w-3 && ey<h-3){
    mouthSide = s;
    mouthLocal = {x: mx, y: my};
    break;
  }
}

const caveMouth = { x: ox + mouthLocal.x, y: oy + mouthLocal.y, style: caveStyle, dir: sideDir(mouthSide) };

// ===== vẽ khối núi (mountain) bao quanh hang — hình dáng khác nhau theo style
const localCave = { cx: lcX, cy: lcY, r: baseR, style: caveStyle };
const rx = (localCave.r + 12) + (caveStyle===1 ? 8 : 0) + (caveStyle===2 ? -2 : 0);
const ry = (localCave.r + 12) + (caveStyle===1 ? -2 : 0) + (caveStyle===2 ? 8 : 0);
const amp = 0.10 + caveStyle*0.04;

for (let y=0;y<h;y++){
  for (let x=0;x<w;x++){
    const i = y*w + x;
    const nx = (x - localCave.cx) / rx;
    const ny = (y - localCave.cy) / ry;
    const d  = Math.hypot(nx, ny);
    const n  = (groundVar[i] / 255 - 0.5) * 2; // -1..1
    if (d < 1 + n*amp){
      tiles[i] = WT.MOUNTAIN;
    }
  }
}

// ===== inner cave floor (tunnel)
const irx = Math.max(6, localCave.r * (caveStyle===3 ? 0.85 : 0.95));
const iry = Math.max(6, localCave.r * (caveStyle===3 ? 1.05 : 0.92));
const iamp = 0.06 + caveStyle*0.02;
for (let y=0;y<h;y++){
  for (let x=0;x<w;x++){
    const i = y*w + x;
    const nx = (x - localCave.cx) / irx;
    const ny = (y - localCave.cy) / iry;
    const d  = Math.hypot(nx, ny);
    const n  = (groundVar[i] / 255 - 0.5) * 2;
    if (d < 1 + n*iamp){
      tiles[i] = WT.CAVE_FLOOR;
    }
  }
}

// ===== edge ring (vệt núi)
for (let y=1;y<h-1;y++){
  for (let x=1;x<w-1;x++){
    const i = y*w+x;
    if (tiles[i] !== WT.MOUNTAIN) continue;
    const n =
      (tiles[i+1] !== WT.MOUNTAIN) ||
      (tiles[i-1] !== WT.MOUNTAIN) ||
      (tiles[i+w] !== WT.MOUNTAIN) ||
      (tiles[i-w] !== WT.MOUNTAIN);
    if (n) tiles[i] = WT.MOUNTAIN_EDGE;
  }
}

// ===== carve tunnel từ miệng hang ra ngoài (đảm bảo không bị kẹt)
const mdx = (mouthSide===0?-1:(mouthSide===1?1:0));
const mdy = (mouthSide===2?-1:(mouthSide===3?1:0));
const pdx = -mdy;
const pdy =  mdx;

const carve = (tx,ty,tt)=>{
  if (tx<1||ty<1||tx>=w-1||ty>=h-1) return;
  const ii = ty*w + tx;
  tiles[ii] = tt;
  objects[ii] = WO.NONE;
  reserved[ii] = 1;
};

for (let s=0; s<=corridorLen; s++){
  const bx = mouthLocal.x + mdx*s;
  const by = mouthLocal.y + mdy*s;
  const tt = (s < 10) ? WT.CAVE_FLOOR : WT.GRASS;
  for (let off=-2; off<=2; off++){
    carve(bx + pdx*off, by + pdy*off, tt);
  }
}
// clearing outside
const ex = mouthLocal.x + mdx*corridorLen;
const ey = mouthLocal.y + mdy*corridorLen;
for (let yy=-4; yy<=4; yy++){
  for (let xx=-4; xx<=4; xx++){
    if (Math.hypot(xx,yy) > 4.2) continue;
    carve(ex + xx, ey + yy, WT.GRASS);
  }
}
// ===== Objects placement (density khác nhau theo lãnh thổ)
      const canPlace = (x,y)=>{
        const i = y*w + x;
        if (tiles[i] !== WT.GRASS) return false;
        if (objects[i] !== WO.NONE) return false;
        if (reserved[i]) return false;
        // tránh đặt sát river
        for (let oy=-1; oy<=1; oy++){
          for (let ox=-1; ox<=1; ox++){
            const nx=x+ox, ny=y+oy;
            if (nx<0||ny<0||nx>=w||ny>=h) continue;
            if (tiles[ny*w + nx] === WT.RIVER) return false;
          }
        }
        return true;
      };

      const density = isPlayer ? 1.00 : lerp(0.82, 1.18, rand());
      const placeN = (n, type, padding)=>{
        let placed = 0;
        const triesMax = 1400 + (n*3);
        for (let it=0; it<triesMax && placed<n; it++){
          const x = (rand()*w)|0;
          const y = (rand()*h)|0;
          if (!canPlace(x,y)) continue;
          const dM = Math.hypot(x - localCave.cx, y - localCave.cy);
          if (type === WO.TREE && dM < localCave.r + 14 && rand() < 0.88) continue;
          if ((type === WO.ROCK || type === WO.BUSH) && dM < localCave.r + 8 && rand() < 0.60) continue;

          objects[y*w + x] = type;
          placed++;
        }
      };

      placeN(Math.floor(2100*density), WO.TREE, 4);
      placeN(Math.floor(520*density),  WO.BUSH, 5);
      placeN(Math.floor(340*density),  WO.ROCK, 10);

      // solid calc
      for (let y=0;y<h;y++){
        for (let x=0;x<w;x++){
          const i=y*w+x;
          let s=0;
          const t = tiles[i];
          const o = objects[i];
          if (t === WT.MOUNTAIN || t === WT.MOUNTAIN_EDGE) s = 1;
          if (o === WO.TREE || o === WO.ROCK) s = 1;
          solid[i] = s;
        }
      }

      // dán vào world lớn
      for (let y=0;y<h;y++){
        const wy = oy + y;
        const rowBase = wy*world.w + ox;
        const liBase = y*w;
        for (let x=0;x<w;x++){
          const bi = rowBase + x;
          const li = liBase + x;
          world.tiles[bi]     = tiles[li];
          world.objects[bi]   = objects[li];
          // groundVar: giữ noise lớn + thêm noise local
          world.groundVar[bi] = (world.groundVar[bi] + groundVar[li]) & 255;
          world.solid[bi]     = solid[li];
        }
      }

      return { cave, caveMouth, rand };
    }

    // ===== tạo 9 lãnh thổ
    const T = TERR.SIZE;
    for (let ty=0; ty<TERR.GRID; ty++){
      for (let tx=0; tx<TERR.GRID; tx++){
        const ox = tx*T;
        const oy = ty*T;
        const id = ty*TERR.GRID + tx;
        const isPlayer = (tx===1 && ty===1);

        const seed = isPlayer ? seedStr : `${seedStr}::rival:${tx},${ty}`;
        const res = generateTerritoryInto(seed, ox, oy, isPlayer);

        const terr = {
          id, tx, ty,
          x0: ox, y0: oy, x1: ox+T-1, y1: oy+T-1,
          px0: ox*TILE, py0: oy*TILE, px1: (ox+T)*TILE, py1: (oy+T)*TILE,
          isPlayer,
          name: dirNameFor(tx,ty),
          ownerName: "",
          caveMouth: { x: res.caveMouth.x, y: res.caveMouth.y, style: res.caveMouth.style||0, dir: res.caveMouth.dir||0 },
        };
        territories.push(terr);

        if (isPlayer){
          world.cave = { cx: res.cave.cx, cy: res.cave.cy, r: res.cave.r };
          world.caveMouth = { x: res.caveMouth.x, y: res.caveMouth.y, style: res.caveMouth.style||0, dir: res.caveMouth.dir||0 };
        } else {
          world.otherCaves.push({ cave: res.cave, caveMouth: res.caveMouth, territoryId: id });
        }
      }
    }

    // ===== spawn player trong lãnh thổ giữa (map cũ)
    const center = territories.find(t=>t.isPlayer);
    if (center){
      for (let tries=0; tries<6000; tries++){
        const x = (center.x0 + (baseRand()*T)|0);
        const y = (center.y0 + (baseRand()*T)|0);
        const i = y*world.w + x;
        if (!world.solid[i] && world.tiles[i] === WT.GRASS){
          player.x = x*TILE + TILE/2;
          player.y = y*TILE + TILE/2;
          break;
        }
      }
    }

    // ===== spawn animals + rival tigers
    spawnAnimals(baseRand);

    // create 8 rival tigers (1 mỗi lãnh thổ xung quanh)
    let palI = 0;
    for (const terr of territories){
      if (terr.isPlayer) continue;

      const pal = RIVAL_PALETTES[palI++ % RIVAL_PALETTES.length];

      // tìm hang tương ứng
      const homeTx = terr.caveMouth.x;
const homeTy = terr.caveMouth.y;
// spawn gần miệng hang nhưng đảm bảo nằm trên ô không-solid (tránh bị kẹt trong tường núi)
const jitterTX = homeTx + (((baseRand()*9)|0) - 4);
const jitterTY = homeTy + (((baseRand()*9)|0) - 4);
const safeHome = findSafeExitWorldTile(jitterTX, jitterTY) || {tx:homeTx, ty:homeTy};
const homeX = safeHome.tx*TILE + TILE/2;
const homeY = safeHome.ty*TILE + TILE/2;


      const t = {
        territoryId: terr.id,
        name: pal.tag,
        palette: pal,
        x: homeX + (baseRand()-0.5)*12,
        y: homeY + (baseRand()-0.5)*12,
        homeX, homeY,
        r: 18,
        face: baseRand()*Math.PI*2,
        vx: 0, vy: 0,
        hp: 120, hpMax: 120,
        hunger: 100, hungerMax: 100,
        sleep: 0, sleepMax: 100,
        mode: "rest",
        wpI: 0,
        waypoints: buildPatrolWaypoints(terr),
        target: null,
        thinkT: baseRand()*1.2,
        roarCD: 1.2 + baseRand()*1.4,
        attackCD: 0,
        aggroT: 0,
        stunnedT: 0,
        hitFlashT: 0,
        deadT: 0
      };

      rivalTigers.push(t);
      terr.ownerName = pal.tag;
      terr.name = dirNameFor(terr.tx, terr.ty); // base
    }

    // minimap base
    world.miniBase = buildMinimapBaseWorld();
  }

  function buildMinimapBaseWorld(){
    const W = mini.width, H = mini.height;
    const img = mctx.createImageData(W,H);
    const data = img.data;

    for (let py=0; py<H; py++){
      const ty = Math.floor(py * (world.h / H));
      for (let px=0; px<W; px++){
        const tx = Math.floor(px * (world.w / W));
        const i = ty*world.w + tx;

        const t = world.tiles[i];
        const o = world.objects[i];

        let r=20,g=70,b=30;
        if (t === WT.RIVER) { r=18; g=85; b=140; }
        if (t === WT.CAVE_FLOOR) { r=30; g=30; b=30; }
        if (t === WT.MOUNTAIN) { r=52; g=52; b=56; }
        if (t === WT.MOUNTAIN_EDGE) { r=72; g=72; b=78; }

        if (t === WT.GRASS && o === WO.TREE) { r=16; g=112; b=34; }
        if (t === WT.GRASS && o === WO.BUSH) { r=14; g=92; b=28; }
        if (t === WT.GRASS && o === WO.ROCK) { r=110; g=112; b=118; }

        const di=(py*W+px)*4;
        data[di+0]=r; data[di+1]=g; data[di+2]=b; data[di+3]=255;
      }
    }
    return img;
  }

  // ===================== Map Generation: Cave (corridor after smoothing) =====================
  function generateCave(seedStr, caveStyle=0){
    const seedFn = xmur3(seedStr + "::cave");
    const rand = mulberry32(seedFn());

    const size = cave.w * cave.h;
    cave.tiles = new Uint8Array(size);
    cave.var   = new Uint8Array(size);
    cave.solid = new Uint8Array(size);
    for (let i=0;i<size;i++) cave.var[i] = (rand()*255)|0;

    cave.tiles.fill(CT.WALL);

    
const style = (caveStyle|0) % 3;

// khác kiểu dáng hang theo style (nhưng vẫn cùng phong cách đồ hoạ)
const cx = Math.floor(cave.w*(style===2 ? 0.52 : 0.55));
const cy = Math.floor(cave.h*(style===1 ? 0.46 : 0.50));
const R  = (style===1 ? 30 : style===2 ? 26 : 28);

    for (let y=0;y<cave.h;y++){
      for (let x=0;x<cave.w;x++){
        const dx = x - cx;
        const dy = y - cy;
        const d  = Math.hypot(dx,dy);
        const wobble = (
          Math.sin(x*0.18) * 2.1 +
          Math.cos(y*0.16) * 2.0 +
          Math.sin((x+y)*0.09) * 1.6
        );
        if (d < R + wobble) cave.tiles[y*cave.w + x] = CT.FLOOR;
      }
    }

    function countFloorN(x,y){
      let c=0;
      for (let oy=-1; oy<=1; oy++){
        for (let ox=-1; ox<=1; ox++){
          if (!ox && !oy) continue;
          const nx=x+ox, ny=y+oy;
          if (!inBounds2(nx,ny,cave.w,cave.h)) continue;
          if (cave.tiles[ny*cave.w + nx] === CT.FLOOR) c++;
        }
      }
      return c;
    }
    for (let pass=0; pass<2; pass++){
      const copy = cave.tiles.slice();
      for (let y=1; y<cave.h-1; y++){
        for (let x=1; x<cave.w-1; x++){
          const i = y*cave.w + x;
          const n = countFloorN(x,y);
          if (copy[i] === CT.FLOOR && n < 2) cave.tiles[i] = CT.WALL;
          if (copy[i] === CT.WALL  && n > 5) cave.tiles[i] = CT.FLOOR;
        }
      }
    }

    cave.entrance = { x: 8, y: Math.floor(cave.h*(style===1 ? 0.56 : style===2 ? 0.44 : 0.50)) };

    const joinX = Math.max(cave.entrance.x + 14, (cx - R + 10));
    for (let x=0; x<=joinX; x++){
      for (let y=cave.entrance.y-4; y<=cave.entrance.y+4; y++){
        if (!inBounds2(x,y, cave.w, cave.h)) continue;
        cave.tiles[y*cave.w + x] = CT.FLOOR;
      }
    }
    for (let x=joinX-6; x<=joinX+4; x++){
      for (let y=cave.entrance.y-6; y<=cave.entrance.y+6; y++){
        if (!inBounds2(x,y, cave.w, cave.h)) continue;
        cave.tiles[y*cave.w + x] = CT.FLOOR;
      }
    }

    for (let i=0;i<size;i++) cave.solid[i] = (cave.tiles[i] === CT.WALL) ? 1 : 0;

    cave.props = [];
    cave.props.push({ type: P.FIRE, x: cx*TILE + TILE/2, y: cy*TILE + TILE/2 });

    // BED bigger + set bed interact
    const bedOffX = (style===1 ? 12 : style===2 ? 18 : 16);
    const bedOffY = (style===1 ? 18 : style===2 ? 12 : 14);
    const bedX = (cx+bedOffX)*TILE + TILE/2;
    const bedY = (cy+bedOffY)*TILE + TILE/2;
    cave.props.push({ type: P.BED, x: bedX, y: bedY });
    cave.bed.x = bedX; cave.bed.y = bedY; cave.bed.r = 72;

    for (let k=0; k<14; k++){
      const px = Math.floor(rand()*cave.w);
      const py = Math.floor(rand()*cave.h);
      const i = py*cave.w + px;
      if (cave.tiles[i] !== CT.FLOOR) continue;

      let nearWall = false;
      for (let oy=-2; oy<=2 && !nearWall; oy++){
        for (let ox=-2; ox<=2 && !nearWall; ox++){
          const nx=px+ox, ny=py+oy;
          if (!inBounds2(nx,ny,cave.w,cave.h)) continue;
          if (cave.tiles[ny*cave.w + nx] === CT.WALL) nearWall = true;
        }
      }
      if (!nearWall) continue;

      cave.props.push({
        type: rand()<0.6 ? P.BONE : P.PELT,
        x: px*TILE + TILE/2,
        y: py*TILE + TILE/2
      });
    }

    cave.miniBase = buildMinimapBaseCave();
  }

  function buildMinimapBaseCave(){
    const W = mini.width, H = mini.height;
    const img = mctx.createImageData(W,H);
    const data = img.data;

    for (let py=0; py<H; py++){
      const ty = Math.floor(py * (cave.h / H));
      for (let px=0; px<W; px++){
        const tx = Math.floor(px * (cave.w / W));
        const i = ty*cave.w + tx;

        const t = cave.tiles[i];
        let r=24,g=24,b=24;
        if (t === CT.FLOOR) { r=48; g=44; b=40; }
        if (t === CT.WALL)  { r=18; g=18; b=18; }

        const di=(py*W+px)*4;
        data[di+0]=r; data[di+1]=g; data[di+2]=b; data[di+3]=255;
      }
    }
    return img;
  }

