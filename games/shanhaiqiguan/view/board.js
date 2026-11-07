// 大地图：地形烘焙到一张画布，建筑和棋子是叠在上面的 DOM。镜头可以跟随、拖动、缩放。
(function () {
  const SJ = window.SJ;
  const HW = 48, HH = 24, PAD = 170, PX = 48; // PX：俯视图每格像素
  const B = SJ.board = { HW, HH };
  const load = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });

  // 地形 -> 随机摆的装饰
  const DECO = {
    grass: [['willow', 0.02, 74], ['rock1', 0.012, 44]], forest: [['pine', 0.16, 84], ['bamboo', 0.08, 70], ['mushroom', 0.02, 46]], petal: [['peach', 0.14, 80], ['pagoda', 0.012, 70]],
    sand: [['cactusbone', 0.03, 74], ['rock1', 0.02, 46]], jade: [['crystal', 0.1, 58]], reef: [['coral', 0.06, 48], ['shell', 0.025, 44]], ash: [['deadtree', 0.07, 72], ['tomb', 0.03, 44], ['lantern', 0.02, 46]],
    bone: [['skull', 0.06, 50], ['tomb', 0.05, 46], ['deadtree', 0.04, 70]], rock: [['peak1', 0.17, 120], ['rock1', 0.08, 56], ['pine', 0.03, 60]], snow: [['peak2', 0.13, 120], ['pine', 0.02, 56]],
    water: [['reed', 0.04, 44]], sea: [['shell', 0.004, 40]], swamp: [['reed', 0.06, 46], ['mushroom', 0.05, 46], ['deadtree', 0.04, 66]], lava: [['fire', 0.1, 54], ['rock1', 0.05, 50]], cloud: [['cloudpuff', 0.05, 80]], ink: [['lantern', 0.012, 44]],
  };
  const LABEL = { event: ['吉', '#f2d27a', '#7d2519'], nest: ['兽', '#b08f7c', '#fff6e6'], post: ['驿', '#e7b24e', '#4a2a10'], shop: ['宝', '#8ec5b4', '#123c34'], portal: ['门', '#a593d8', '#fff6e6'] };

  function rng(v) { return () => { v = (v + 0x6D2B79F5) | 0; let t = v; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  B.setup = function (m) {
    B.map = m; B.W = m.size * 2 * HW + PAD * 2; B.H = m.size * 2 * HH + PAD * 2 + 60;
    B.ox = B.W / 2; B.oy = PAD + 30;
  };
  B.at = (x, y) => ({ x: B.ox + (x - y) * HW, y: B.oy + (x + y + 1) * HH });
  B.tile = (i) => { const t = B.map.tiles[i]; return B.at(t.x, t.y); };

  const plate = (c, x, y, a, b, d, fill, stroke) => {
    if (d) {
      c.fillStyle = '#0006'; c.beginPath(); c.moveTo(x - a, y); c.lineTo(x, y + b); c.lineTo(x + a, y); c.lineTo(x + a, y + d); c.lineTo(x, y + b + d); c.lineTo(x - a, y + d); c.closePath(); c.fill();
    }
    c.fillStyle = fill; c.strokeStyle = stroke; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(x, y - b); c.lineTo(x + a, y); c.lineTo(x, y + b); c.lineTo(x - a, y); c.closePath(); c.fill(); c.stroke();
  };

  // 把地图烘焙到 canvas
  B.bake = async function (canvas) {
    const m = B.map, names = Object.keys(SJ.TERRAIN), n = m.size, TS = n * PX;
    const used = [...new Set(m.ground.flat())].map((i) => names[i]);
    const sheets = {};
    await Promise.all([...new Set([...used, m.bg])].map(async (t) => { sheets[t] = await load(`assets/ts_${t}.webp`); }));
    const need = new Set();
    used.forEach((t) => (DECO[t] || []).forEach((d) => need.add(d[0])));
    const decoImg = {}, lmImg = {};
    await Promise.all([...need].map(async (d) => { decoImg[d] = await load(`assets/deco_${d}.webp`); }));
    await Promise.all(m.tiles.filter((t) => t.type === 'corner').map(async (t) => { lmImg[t.corner] = await load(`assets/${SJ.LANDMARKS[t.corner].art}.webp`); }));

    const spot = {};
    await Promise.all(['post', 'shop', 'portal'].map(async (k) => { spot[k] = await load(`assets/lm_${k}.webp`); }));
    canvas.width = B.W; canvas.height = B.H;
    const c = canvas.getContext('2d');
    const pat = (ctx, t) => { if (!sheets[t]) return '#8a9a7a'; const q = ctx.createPattern(sheets[t], 'repeat'); q.setTransform(new DOMMatrix().scale(0.5)); return q; };
    // 背景
    c.fillStyle = pat(c, m.bg); c.fillRect(0, 0, B.W, B.H);
    c.fillStyle = '#0003'; c.fillRect(0, 0, B.W, B.H);
    // 俯视地面，地形之间软过渡
    const top = document.createElement('canvas'); top.width = top.height = TS;
    const tc = top.getContext('2d');
    const mask = document.createElement('canvas'); mask.width = mask.height = n;
    const mc = mask.getContext('2d');
    const layer = document.createElement('canvas'); layer.width = layer.height = TS;
    const lc = layer.getContext('2d');
    for (const t of used) {
      const id = mc.createImageData(n, n), ti = names.indexOf(t);
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) id.data[(y * n + x) * 4 + 3] = m.ground[y][x] === ti ? 255 : 0;
      mc.putImageData(id, 0, 0);
      lc.globalCompositeOperation = 'source-over'; lc.clearRect(0, 0, TS, TS);
      lc.imageSmoothingEnabled = true; lc.imageSmoothingQuality = 'high'; lc.drawImage(mask, 0, 0, TS, TS);
      lc.globalCompositeOperation = 'source-in'; lc.fillStyle = pat(lc, t); lc.fillRect(0, 0, TS, TS);
      tc.drawImage(layer, 0, 0);
    }
    // 外圈淡出到背景
    tc.globalCompositeOperation = 'destination-in';
    for (const [x0, y0, x1, y1] of [[0, 0, PX * 2, 0], [TS, 0, TS - PX * 2, 0], [0, 0, 0, PX * 2], [0, TS, 0, TS - PX * 2]]) {
      const g = tc.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, '#0000'); g.addColorStop(1, '#000f'); tc.fillStyle = g; tc.fillRect(0, 0, TS, TS);
    }
    tc.globalCompositeOperation = 'source-over';
    c.save(); c.setTransform(HW / PX, HH / PX, -HW / PX, HH / PX, B.ox, B.oy); c.imageSmoothingQuality = 'high'; c.drawImage(top, 0, 0); c.restore();

    // 大区名字印在地上
    c.save(); c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '900 46px "Songti SC","Noto Serif SC",serif';
    m.regions.forEach((g) => { const p = B.at(g.c[0], g.c[1]); c.fillStyle = '#0000002e'; c.fillText(g.name, p.x + 2, p.y + 2); c.fillStyle = '#ffffff4a'; c.fillText(g.name, p.x, p.y); });
    c.restore();
    // 路基
    c.lineCap = 'round'; c.lineJoin = 'round';
    for (const [w, col] of [[30, '#2a262088'], [22, '#cdb98f']]) {
      c.strokeStyle = col; c.lineWidth = w; c.beginPath();
      m.tiles.forEach((t, i) => { const a = B.tile(i); t.adj.forEach((j) => { if (j > i) { const b = B.tile(j); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); } }); });
      c.stroke();
    }
    // 格子
    m.tiles.forEach((t, i) => {
      const { x, y } = B.tile(i);
      const L = LABEL[t.type];
      const fill = t.type === 'corner' ? '#e6d9b4' : L ? L[1] : t.type === 'wild' ? '#d7c7a0b0' : '#f4ead0e6';
      plate(c, x, y, HW - 6, HH - 3, 5, fill, '#2a2620aa');
      c.textAlign = 'center'; c.textBaseline = 'middle';
      if (L) { c.font = '700 20px "Songti SC","Noto Serif SC",serif'; c.fillStyle = L[2]; c.fillText(L[0], x, y + 1); }
      else if (t.type === 'land') { c.font = '600 12px "Songti SC","Noto Serif SC",serif'; c.fillStyle = '#5d5446'; c.fillText(m.regions[t.region].price, x, y + 1); }
      else if (t.type === 'wild') { c.font = '600 11px "Songti SC","Noto Serif SC",serif'; c.fillStyle = '#5d5446cc'; c.fillText(SJ.TERRAIN[t.terrain].name, x, y + 1); }
    });
    // 装饰，远处先画
    const r = rng(m.size * 131 + m.tiles.length), near = new Set();
    m.tiles.forEach((t) => { for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) near.add((t.x + dx) * 1000 + t.y + dy); });
    const items = [];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      if (near.has(x * 1000 + y)) continue;
      const list = DECO[names[m.ground[y][x]]] || [];
      for (const [d, p, w] of list) {
        if (r() >= p || !decoImg[d]) continue;
        const size = w * (0.8 + r() * 0.5), im = decoImg[d], tall = size * im.height / im.width;
        let hide = false; // 高的东西不能挡住身后的路
        for (let k = 1; k <= Math.ceil(tall / (HH * 2)) + 1; k++) if (near.has((x - k) * 1000 + y - k) || near.has((x - k) * 1000 + y - k + 1) || near.has((x - k + 1) * 1000 + y - k)) hide = true;
        if (!hide) items.push({ d, w: size, x: x + r() * 0.6 - 0.3, y: y + r() * 0.6 - 0.3 });
        break;
      }
    }
    m.tiles.forEach((t) => { if (t.type === 'corner' && lmImg[t.corner]) items.push({ lm: t.corner, x: t.x, y: t.y }); if (spot[t.type]) items.push({ sp: t.type, x: t.x, y: t.y }); });
    items.sort((a, b) => (a.x + a.y) - (b.x + b.y));
    for (const it of items) {
      const p = B.at(it.x, it.y);
      if (it.sp) { const im = spot[it.sp], w = 62, h2 = w * im.height / im.width; c.drawImage(im, p.x - w / 2, p.y - 6 - h2, w, h2); continue; }
      if (it.lm) {
        const im = lmImg[it.lm], w = 176, h = w * im.height / im.width, hh = Math.min(h, 210), ww = w * hh / h;
        c.drawImage(im, p.x - ww / 2, p.y + 16 - hh, ww, hh);
        const nm = SJ.LANDMARKS[it.lm].name;
        c.font = '700 15px "Songti SC","Noto Serif SC",serif'; const tw = c.measureText(nm).width + 16;
        c.fillStyle = '#2a2620e6'; c.beginPath(); c.roundRect(p.x - tw / 2, p.y + 12, tw, 22, 4); c.fill();
        c.fillStyle = '#f6efdf'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(nm, p.x, p.y + 23);
      } else {
        const im = decoImg[it.d], h = it.w * im.height / im.width;
        c.drawImage(im, p.x - it.w / 2, p.y + 8 - h, it.w, h);
      }
    }
    // 给小地图用的缩略
    const mini = document.createElement('canvas'), k = 150 / B.W;
    mini.width = 150; mini.height = Math.round(B.H * k);
    mini.getContext('2d').drawImage(canvas, 0, 0, mini.width, mini.height);
    B.miniBase = mini; B.miniK = k;
  };

  // 点击和归属的矢量层
  B.tilesSvg = function () {
    const a = HW - 6, b = HH - 3;
    const ps = B.map.tiles.map((t, i) => { const { x, y } = B.tile(i); return `<path class="tile-top" data-t="${i}" id="tt${i}" d="M${x} ${y - b}L${x + a} ${y}L${x} ${y + b}L${x - a} ${y}Z"/>`; }).join('');
    return `<svg class="tiles" viewBox="0 0 ${B.W} ${B.H}" width="${B.W}" height="${B.H}">${ps}</svg>`;
  };

  // ---------- 镜头 ----------
  const cam = B.cam = { x: 0, y: 0, z: 1, el: null, wrap: null, free: 0 };
  B.apply = function (ms) {
    const w = cam.wrap, e = cam.el; if (!w || !e) return;
    e.style.transition = ms ? `transform ${ms}ms linear` : 'none';
    e.style.transform = `translate(${Math.round(w.clientWidth / 2 - cam.x * cam.z)}px, ${Math.round(w.clientHeight / 2 - cam.y * cam.z)}px) scale(${cam.z})`;
  };
  B.look = function (x, y, ms) { if (Date.now() < cam.free) return; cam.x = x; cam.y = y; B.apply(ms); };
  B.fitAll = function () {
    const w = cam.wrap; cam.z = Math.min(w.clientWidth / B.W, w.clientHeight / B.H); cam.x = B.W / 2; cam.y = B.H / 2; cam.free = 0; B.apply(220);
  };
  B.zoomDefault = function () { cam.z = cam.wrap.clientWidth < 600 ? 0.72 : 1; };
  B.bindCamera = function (wrap, el) {
    cam.wrap = wrap; cam.el = el;
    const pts = new Map(); let moved = 0, pinch = 0;
    wrap.addEventListener('pointerdown', (e) => { if (e.target.closest('.panel,.info,.minimap,.hud,button')) return; pts.set(e.pointerId, [e.clientX, e.clientY]); moved = 0; pinch = 0; });
    window.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return;
      const p = pts.get(e.pointerId), dx = e.clientX - p[0], dy = e.clientY - p[1];
      if (pts.size === 2) {
        pts.set(e.pointerId, [e.clientX, e.clientY]);
        const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (pinch) { cam.z = Math.max(0.2, Math.min(1.6, cam.z * d / pinch)); B.apply(0); }
        pinch = d; moved = 99; cam.free = Date.now() + 2500; return;
      }
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      moved += Math.abs(dx) + Math.abs(dy);
      if (moved > 6) { cam.x -= dx / cam.z; cam.y -= dy / cam.z; cam.free = Date.now() + 2500; B.apply(0); }
    });
    const up = (e) => { pts.delete(e.pointerId); };
    window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    B.wasDrag = () => moved > 6;
    wrap.addEventListener('wheel', (e) => { e.preventDefault(); cam.z = Math.max(0.2, Math.min(1.6, cam.z * (e.deltaY > 0 ? 0.9 : 1.1))); cam.free = Date.now() + 2500; B.apply(0); }, { passive: false });
  };

  B.drawMini = function (cv, S, colors) {
    if (!B.miniBase) return;
    cv.width = B.miniBase.width; cv.height = B.miniBase.height;
    const c = cv.getContext('2d'), k = B.miniK;
    c.drawImage(B.miniBase, 0, 0);
    S.tiles.forEach((t, i) => { if (t.chest) { const p = B.tile(i); c.fillStyle = '#ffd76a'; c.fillRect(p.x * k - 3, p.y * k - 3, 6, 6); c.strokeStyle = '#2a2620'; c.strokeRect(p.x * k - 3, p.y * k - 3, 6, 6); } if (t.owner == null) return; const p = B.tile(i); c.fillStyle = colors[t.owner]; c.fillRect(p.x * k - 1.5, p.y * k - 1, 3, 2); });
    S.players.forEach((p) => { if (!p.alive) return; const q = B.tile(p.pos); c.fillStyle = '#fff'; c.beginPath(); c.arc(q.x * k, q.y * k, 4, 0, 7); c.fill(); c.fillStyle = colors[p.id]; c.beginPath(); c.arc(q.x * k, q.y * k, 3, 0, 7); c.fill(); });
  };
})();
