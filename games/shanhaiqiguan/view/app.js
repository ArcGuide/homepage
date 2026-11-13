// 画面层：只读 state，把引擎事件播成动画，把玩家的决定交回引擎。
(function () {
  const SJ = window.SJ, sfx = SJ.sfx, icon = SJ.icon;
  const app = document.getElementById('app');
  const SAVE = 'sijing.save.v4', ENDINGS = 'sijing.endings';
  const ids = () => Object.keys(SJ.HEROES);
  const GAME = '山海棋观'; // 游戏名只改这里
  const OPC_URL = 'https://starc.institute/cn/opc.html';
  document.title = GAME;
  const B = SJ.board;
  const PCOLOR = ['#d9a21f', '#c8452f', '#2a8f96', '#5f9e47'];
    let S = null, speed = 1, spectate = false;
  let pieces = {}, sprites = {}, tileKey = {};

  const $ = (q, e) => (e || document).querySelector(q);
  const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms / speed));
  const IMG = (name) => `assets/${name}.webp`;
  const img = (name, alt) => `<img src="${IMG(name)}" alt="${alt || ''}" draggable="false" onerror="this.style.visibility='hidden'">`;
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* 无痕模式 */ } }, del(k) { try { localStorage.removeItem(k); } catch (e) { /* 无痕模式 */ } } };

  // ---------- 棋盘几何 ----------
  const iso = (i) => B.tile(i);
  const shade = (c, k) => { const n = parseInt(c.slice(1), 16); const f = (v) => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; };

  // ---------- 计数（Abacus，免注册）----------
  // 只记次数：打开 open、开局 start、点了解星弧 starc、问卷选项 steam-*。不记任何个人信息。
  // 只在 starc.institute 上计数，本地可用 ?counttest=<地址> 测试。明确失败的那次存在本地，下次打开补发。
  const Q = new URLSearchParams(location.search);
  const LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const COUNTER = (LOCAL && Q.get('counttest')) || 'https://abacus.jasoncameron.dev/hit/starc-shanhaiqiguan/';
  const COUNTING = LOCAL ? Q.has('counttest') : /(^|\.)starc\.institute$/.test(location.hostname);
  const PENDING = 'sijing.pending';
  const hit = (key) => fetch(COUNTER + key, { mode: 'cors', keepalive: true, cache: 'no-store' }).then((r) => { if (!r.ok) throw new Error(r.status); });
  const pending = () => { try { return JSON.parse(store.get(PENDING)) || {}; } catch (e) { return {}; } };
  function count(key) {
    if (!COUNTING) return;
    hit(key).catch(() => { const p = pending(); p[key] = Math.min(20, (p[key] || 0) + 1); store.set(PENDING, JSON.stringify(p)); });
  }
  async function flushHits() {
    if (!COUNTING) return;
    const p = pending();
    for (const key of Object.keys(p)) {
      while (p[key] > 0) {
        try { await hit(key); } catch (e) { store.set(PENDING, JSON.stringify(p)); return; }
        p[key]--; if (!p[key]) delete p[key];
        store.set(PENDING, JSON.stringify(p));
      }
    }
  }

  // ---------- 主菜单 ----------
  function title() {
    S = null; sfx.stopAmbient(); document.querySelector('.layer')?.remove();
    const has = !!store.get(SAVE);
    app.innerHTML = `<div class="title"><video class="cover" src="assets/cover.mp4" poster="assets/cover.jpg" autoplay muted playsinline preload="auto" aria-hidden="true"></video>
      <h1>${GAME}</h1>
      <div class="sub">踏遍山海，掷骰圈地，英雄单挑建筑，活到最后的赢</div><div class="title-gap"></div>
      <div class="btn-row">
        ${has ? '<button class="btn primary" id="cont">继续游戏</button>' : ''}
        <button class="btn ${has ? '' : 'primary'}" id="new">新开一局</button>
        <button class="btn" id="how">怎么玩</button>
      </div>
      <div class="opc-row">
        <span class="opc-tag">星弧 OPC 示例项目</span>
        <a class="btn ghost" href="${OPC_URL}" target="_blank" rel="noopener">了解星弧 OPC</a>
        <button class="btn ghost" id="poll">完善后上 Steam，你会买吗？</button>
      </div></div>`;
    const cv = $('.cover'); cv.muted = true; cv.play().catch(() => {}); // 自动播放被拦时停在 poster
    cv.addEventListener('ended', () => setTimeout(() => { if (cv.isConnected) { cv.currentTime = 0; cv.play().catch(() => {}); } }, 2000)); // 最后一帧停 2 秒再重播
    $('#new').onclick = () => { sfx.click(); setup(); };
    $('#how').onclick = () => { sfx.click(); help(); };
    $('#poll').onclick = () => { sfx.click(); poll(); };
    $('.opc-row a').onclick = () => count('starc');
    if (has) $('#cont').onclick = () => { sfx.click(); try { S = JSON.parse(store.get(SAVE)); SJ.useMap(S.map); startGame(); } catch (e) { store.del(SAVE); title(); } };
  }

  // 付费意愿小调查：每个选项一个匿名计数，不记个人信息。一个浏览器只算一票，只有线上正式域名才计数。
  const POLL = [['no', '不会买'], ['free', '免费才玩'], ['18', '¥18 以内'], ['38', '¥38 以内'], ['68', '¥68 以内'], ['98', '¥68 以上也行']];
  function poll() {
    const voted = store.get('sijing.poll');
    const l = h(`<div class="layer dim"><div class="help poll">
      <h3>如果《${GAME}》继续完善后上架 Steam，你愿意花多少钱买？</h3>
      <p>问的是完善之后的版本，不是现在这一版。现在还只是问问，匿名计数，不收集任何个人信息。</p>
      <div class="poll-opts">${POLL.map(([k, t]) => `<button class="btn ${voted === k ? 'primary' : ''}" data-k="${k}" ${voted ? 'disabled' : ''}>${t}</button>`).join('')}</div>
      <p class="poll-msg">${voted ? '你已经答过了，谢谢！' : ''}</p>
      <div class="btn-row"><button class="btn primary" id="poll-close">关闭</button></div></div></div>`);
    $('#poll-close', l).onclick = () => { sfx.click(); l.remove(); };
    l.querySelectorAll('[data-k]').forEach((b) => { b.onclick = async () => {
      sfx.click();
      const all = l.querySelectorAll('[data-k]'), msg = $('.poll-msg', l);
      all.forEach((x) => { x.disabled = true; });
      b.classList.add('primary');
      try {
        if (COUNTING) await hit(`steam-${b.dataset.k}`);
        store.set('sijing.poll', b.dataset.k);
        msg.textContent = '记下了，谢谢！';
      } catch (e) {
        all.forEach((x) => { x.disabled = false; }); b.classList.remove('primary');
        msg.textContent = '没发出去，再点一次试试。';
      }
    }; });
    document.body.append(l);
  }

  function help() {
    const l = h(`<div class="layer dim"><div class="help">
      <h2>怎么玩</h2>
      <p>这是一局大富翁。选一位上古英雄，在山海大地图上走，买地、盖建筑、收过路费。起点和朝向是随机的，到岔路随机选方向（可以在「玩法设置」里改成自己选）。英雄阵亡就出局，活到最后的人赢。</p>
      <h3>踩到别人的地</h3>
      <ul><li>交过路费，或者开打。</li><li>所有战斗都是双方各出手 3 下就收手。打塔的血量都记下来，下回接着打；异兽没被打死就回满血，绕开也要挨它一下。</li></ul>
      <h3>碰到别的英雄</h3>
      <ul><li>路过或停在别的英雄那一格，一定会比试一场。各出手 3 下，没人倒下就按剩余血量比例分胜负。打完谁都不掉血，也没有经验。同一对英雄比完，3 轮内再碰上不比。</li><li>在「玩法设置」里关掉英雄比试，就变成真打：掉的血带回棋盘，打死就出局。</li><li>赢家拿走一部分金币，按两人中钱少的那位来算比例，从输家身上拿。比例按等级差算：同级拿 50%，以下克上拿得多（低 9 级赢了拿 90%），以大欺小拿得少（高 9 级赢了只拿 10%）。</li><li>当场拆掉：地归你。没拆掉：只付半价过路费。</li><li>钱不够时必须开打，付不起的部分用血抵，破产也会死。</li></ul>
      <h3>五种建筑</h3>
      <ul><li><b>驻军</b>：低攻高防，很难打穿。</li><li><b>射手</b>：高攻低防，高等级会杀人。</li><li><b>巫术</b>：给英雄挂负面状态，带回棋盘。</li><li><b>城邑</b>：每回合产金，但没什么战斗力。</li><li><b>学宫</b>：强化自家英雄，被拆就失效。</li></ul>
      <p>英雄 5 级前走路就涨经验，5 级起只能靠打塔和打异兽，比试没有经验。别人来打你的塔，你也有经验：守住、被拆、把对方打死，都有。塔的等级、对手的等级越高，经验越多。</p>
      <p>买下的地免费建一座 Lv1 建筑，分支自己选；打下来、抽卡得到的地免费随机建一座。停在自家地上才能升级，同时把建筑修满。建筑平时每回合回一点血。Lv2 升 Lv3 时二选一，每个种族都不一样。塔会随轮数越来越猛。</p>
      <h3>英雄成长</h3>
      <ul><li>满级 10 级，每升一级得一个技能点。普通技能在 1、3、5 级可以升一级，大招 6 级才能学。</li><li>掷骰前点「英雄」：学技能、放技能、换宝物。主动技能都是一键释放，用完要冷却几回合。</li><li>消耗品：路过宝铺送 1 个，停下送 2 个，最多带 4 个，满了再拿到就没了。掷骰前点一下马上用掉。</li><li>最多装备 4 件宝物。二阶打异兽得，三阶在自家满级城邑买，四阶只有天降宝箱和地标大事件才有。</li><li>高阶宝物按轮数解锁：大型地图 30 轮前只出二阶，60 轮后才有四阶；中型地图是 20 / 40 轮，小型地图是 12 / 25 轮。没解锁时，宝箱和地标给的宝物会降成已解锁的最高阶。</li><li>神器只在大型地图后期的宝箱里出现，每个英雄一局最多拿到一次。</li></ul>
      <h3>地形和地标</h3>
      <ul><li>山地、灵河、毒沼、云海、大海、黑水……每种地形都有自己的脾气，有的难走，有的危险，也藏着好处。难走的地方常有驿站和宝铺。停在抽卡、异兽、驿站这些功能格上，只结算功能，地形不起作用。</li><li>驿站发钱，宝铺送消耗品，门是传送门。</li><li>每个地标都有夸张的效果，停上去才知道是什么。点地图上任意一格能看到一点提示，拖动看地图，滚轮或双指缩放。</li></ul>
      <div class="btn-row" style="margin-top:12px"><button class="btn primary">知道了</button></div></div></div>`);
    $('button', l).onclick = () => l.remove();
    document.body.append(l);
  }

  // ---------- 选人 ----------
  function heroInfo(k) {
    const H = SJ.HEROES[k], L = SJ.LORE[k];
    return `<aside class="hero-info">${img('hero_' + k)}<div><h3>${H.name}</h3><small>${SJ.RACES[H.race].name}</small>
      <p>${L.story}</p><p>如今，${H.name}来到战场，作为${L.role}，可以学习${SJ.SKILLS[k].map((x) => `「${x.name}」`).join('')}等技能。${L.goal}</p></div></aside>`;
  }

  const OPTS = 'sijing.opts';
  const loadOpts = () => { let o = {}; try { o = JSON.parse(store.get(OPTS)) || {}; } catch (e) { o = {}; } return { autoPath: o.autoPath !== false, spar: o.spar !== false }; };
  function settings(onClose) {
    const o = loadOpts();
    const row = (k, title, on, off, tip) => `<label class="opt-row"><input type="checkbox" data-o="${k}" ${o[k] ? 'checked' : ''}><div><b>${title}</b><span>开：${on}</span><span>关：${off}</span><em>${tip}</em></div></label>`;
    const l = h(`<div class="layer dim"><div class="help settings"><h2>玩法设置</h2>
      ${row('autoPath', '自动选路', '到岔路随机选方向，一路走到底。', '每到岔路都停下来，由你点地图选方向。', '为了游戏流畅、好玩，建议开启。喜欢自己谋划路线、精打细算的玩家可以关掉。')}
      ${row('spar', '英雄比试', '英雄相遇只是比试，打完血量不变，只按胜负拿钱。', '英雄相遇真刀真枪地打，掉的血带回棋盘，打死就出局。', '为了对局能持续下去、更有娱乐性，建议开启。关掉后，游戏可能在早期就结束。')}
      <div class="btn-row" style="margin-top:12px"><button class="btn primary">好了</button></div></div></div>`);
    $('button', l).onclick = () => {
      const n = {}; l.querySelectorAll('[data-o]').forEach((e) => { n[e.dataset.o] = e.checked; });
      store.set(OPTS, JSON.stringify(n)); sfx.click(); l.remove(); if (onClose) onClose();
    };
    document.body.append(l);
  }

  function setup() {
    sfx.stopAmbient();
    const ids = Object.keys(SJ.HEROES);
    const shuffle = ids.slice().sort(() => Math.random() - 0.5);
    const seats = [{ kind: 'human', hero: shuffle[0] }, { kind: 'ai', hero: null }, { kind: 'ai', hero: null }, { kind: 'off', hero: null }];
    const SCALES = [['small', '小型地图', '约 30–60 分钟一局'], ['medium', '中型地图', '约 1–1.5 小时一局'], ['large', '大型地图', '约 1–3 小时一局']];
    let picking = false, on = 0, mapId = 'random';
    const KIND = { human: '真人', ai: '电脑', off: '空位' };
    const mapName = () => mapId === 'random' ? '随机' : SJ.MAPS[mapId].name;
    const optNote = () => { const o = loadOpts(); return [o.autoPath ? '' : '手动选路', o.spar ? '' : '英雄真打'].filter(Boolean).join('、'); };
    function draw() {
      const used = seats.filter((x) => x.kind === 'human').map((x) => x.hero);
      // 选英雄是主页面；地图可选，不选就随机
      app.innerHTML = picking ? `<div class="setup"><h2>选择地图</h2>
        <div class="maps"><button class="mapcard ${mapId === 'random' ? 'sel' : ''}" data-m="random"><div class="rand-map">?</div><b>随机地图</b><span>开局时从全部地图里随机抽一张。</span></button></div>
        ${SCALES.map(([sc, label, time]) => { const ms = Object.values(SJ.MAPS).filter((m) => (m.scale || 'large') === sc); return ms.length ? `<h3 class="scale-h">${label}<small>${time}</small></h3><div class="maps">${ms.map((m) => `<button class="mapcard ${m.id === mapId ? 'sel' : ''}" data-m="${m.id}"><img src="assets/map_${m.id}.webp" alt="" onerror="this.remove()"><b>${m.name}</b><span>${m.tiles.length} 格 · ${(SJ.MAP_SAY || {})[m.id] || m.desc}</span></button>`).join('')}</div>` : ''; }).join('')}
        <div class="setup-foot"><button class="btn primary" id="done">选好了</button></div></div>` : `<div class="setup">
        <div class="pick-head"><h2>选择英雄</h2><button class="btn" id="rand">随机英雄</button></div>
        <div class="seats">${seats.map((x, i) => `<div class="seat ${i === on ? 'on' : ''} ${x.kind === 'off' ? 'off' : ''}" data-i="${i}">
          ${x.kind === 'human' ? img('hero_' + x.hero) : `<div class="qmark">${x.kind === 'ai' ? '?' : ''}</div>`}<b>${x.kind === 'human' ? SJ.HEROES[x.hero].name : x.kind === 'ai' ? '等你选完' : '—'}</b><small>玩家 ${i + 1}</small>
          ${i ? `<button class="kind" data-k="${i}">${KIND[x.kind]}</button>` : `<button class="kind" disabled>${KIND[x.kind]}</button>`}</div>`).join('')}</div>
        <div class="pick"><div class="pick-list">${Object.entries(SJ.RACES).map(([rid, r]) => `<div class="race-block"><h3 style="color:${shade(r.color, 0.72)}">${r.name}<small>${r.trait}</small></h3><div class="hero-grid">
          ${ids.filter((k) => SJ.HEROES[k].race === rid).map((k) => `<button class="hero-card ${seats[on].hero === k ? 'sel' : ''} ${used.includes(k) && seats[on].hero !== k ? 'taken' : ''}" data-h="${k}">${img('hero_' + k)}<b>${SJ.HEROES[k].name}</b></button>`).join('')}
        </div></div>`).join('')}</div>${heroInfo(seats[on].hero)}</div>
        <div class="setup-foot"><button class="btn" id="back">返回</button><button class="btn" id="pickmap">地图：${mapName()}</button><button class="btn" id="opts">玩法设置${optNote() ? `<small>${optNote()}</small>` : ''}</button><button class="btn primary" id="go">开始</button></div></div>`;
      if (picking) {
        app.querySelectorAll('[data-m]').forEach((e) => { e.onclick = () => { mapId = e.dataset.m; sfx.click(); keep(); }; });
        $('#done').onclick = () => { sfx.click(); picking = false; draw(); };
        return;
      }
      app.querySelectorAll('.seat').forEach((e) => { e.onclick = () => { const i = +e.dataset.i; if (seats[i].kind === 'human') { on = i; keep(); } }; });
      app.querySelectorAll('[data-k]').forEach((e) => { e.onclick = (ev) => {
        ev.stopPropagation(); const i = +e.dataset.k, order = ['ai', 'human', 'off'];
        const nx = order[(order.indexOf(seats[i].kind) + 1) % 3];
        seats[i].kind = nx === 'off' && seats.filter((x) => x.kind !== 'off').length <= 2 ? 'ai' : nx;
        if (seats[i].kind === 'human') { const t = seats.filter((x) => x.kind === 'human' && x !== seats[i]).map((x) => x.hero); seats[i].hero = ids.find((k) => !t.includes(k)); on = i; } else { seats[i].hero = null; if (on === i) on = 0; }
        keep();
      }; });
      app.querySelectorAll('[data-h]').forEach((e) => { e.onclick = () => {
        const k = e.dataset.h, other = seats.findIndex((x, i) => x.hero === k && i !== on);
        if (other >= 0) seats[other].hero = seats[on].hero; // 两个真人互换
        seats[on].hero = k; sfx.click(); keep(); $('.hero-info').scrollIntoView({ block: 'nearest' });
      }; });
      $('#rand').onclick = () => {
        const t = seats.filter((x, i) => x.kind === 'human' && i !== on).map((x) => x.hero);
        const left = ids.filter((k) => !t.includes(k) && k !== seats[on].hero);
        seats[on].hero = left[Math.floor(Math.random() * left.length)]; sfx.click(); keep(); $('.hero-info').scrollIntoView({ block: 'nearest' });
      };
      $('#back').onclick = title;
      $('#pickmap').onclick = () => { sfx.click(); picking = true; draw(); app.querySelector('.setup').scrollTop = 0; };
      $('#opts').onclick = () => { sfx.click(); settings(keep); };
      $('#go').onclick = go;
    }
    function go() {
        sfx.click();
        // 真人选完，电脑才从剩下的英雄里挑
        const taken = seats.filter((x) => x.kind === 'human').map((x) => x.hero);
        const pool = ids.filter((k) => !taken.includes(k)).sort(() => Math.random() - 0.5);
        const players = seats.filter((x) => x.kind !== 'off').map((x) => ({ hero: x.kind === 'human' ? x.hero : pool.pop(), human: x.kind === 'human' }));
        const all = Object.keys(SJ.MAPS).filter((k) => SJ.MAPS[k].tiles && SJ.MAPS[k].name && k !== 'ring');
        const map = mapId === 'random' ? all[Math.floor(Math.random() * all.length)] : mapId;
        count('start'); S = SJ.newGame(Object.assign({ players, map }, loadOpts())); store.del(SAVE); spectate = false; speed = 1; startGame(); if (!store.get('sijing.seen2')) { store.set('sijing.seen2', '1'); help(); }
    }
    function keep() { const y = $('.setup')?.scrollTop || 0; draw(); $('.setup').scrollTop = y; }
    draw();
  }

  // ---------- 对局画面 ----------
  async function startGame() {
    app.innerHTML = `<div class="top" id="top"></div><div class="boardwrap" id="wrap"><div class="world" id="stage"><canvas id="ground"></canvas></div>
      <div class="hud" id="hud"><div class="round" id="round"></div><div class="dice" id="dice"></div><div class="dice-note" id="dnote"></div><div class="log" id="log"></div></div>
      <canvas class="minimap" id="mini"></canvas><button class="iconbtn mapbtn" id="b-all">全图</button><div class="loading" id="loading">正在铺开山海…</div><div class="dock" id="dock"></div></div>`;
    pieces = {}; sprites = {}; tileKey = {}; beastEls = [];
    B.setup(SJ.MAP);
    const st = $('#stage');
    st.style.width = `${B.W}px`; st.style.height = `${B.H}px`;
    B.bindCamera($('#wrap'), st);
    B.zoomDefault();
    const me = S;
    await B.bake($('#ground'));
    if (S !== me) return;
    $('#loading')?.remove();
    buildBoard(); renderPlayers(); renderBeasts();
    let all = false;
    $('#b-all').onclick = () => { all = !all; if (all) B.fitAll(); else { B.zoomDefault(); B.cam.free = 0; focusCur(0); } };
    $('#mini').onclick = (e) => { const r = e.target.getBoundingClientRect(); B.cam.x = (e.clientX - r.left) / r.width * B.W; B.cam.y = (e.clientY - r.top) / r.height * B.H; B.cam.free = Date.now() + 3000; B.apply(200); };
    focusCur(0);
    sfx.ambient((SJ.MAPS[S.map] && SJ.MAPS[S.map].amb) || S.map);
    runLoop();
  }

  function focusCur(ms) { const p = S.players[S.cur], q = iso(p.pos); B.look(q.x, q.y - 40, ms); }
  window.addEventListener('resize', () => { if ($('#stage') && S) B.apply(0); });

  function buildBoard() {
    const st = $('#stage');
    setTimeout(preloadFx, 1500);
    st.insertAdjacentHTML('beforeend', B.tilesSvg());
    SJ.BOARD.forEach((_, i) => renderTile(i));
    S.players.forEach((p) => {
      const e = h(`<div class="piece" style="--pc:${PCOLOR[p.id]}"><div class="aura"><b class="wl"></b><b class="wr"></b><i></i><i></i><i></i><i></i><i></i></div><div class="px" style="background-image:url(assets/px_${p.hero}.png)"></div></div>`);
      pieces[p.id] = e; st.append(e);
    });
    placePieces();
    st.addEventListener('click', (ev) => { if (B.wasDrag()) return; const t = ev.target.closest('[data-t]'); if (t) showInfo(+t.dataset.t); else closeInfo(); });
  }

  // 玄虎和九尾狐虚影：不是玩家，单独画
  let beastEls = [];
  function renderBeasts() {
    const st = $('#stage'); if (!st) return;
    const want = [...(S.beasts || []).map((b, k) => ['tiger' + k, b.pos, 'tiger']), ...(S.phantoms || []).map((ph, k) => ['ph' + (ph.id || ph.o), ph.pos, 'phantom', ph.o])];
    beastEls = beastEls.filter((e) => { if (want.some((w) => w[0] === e.dataset.k)) return true; e.remove(); return false; });
    for (const [k, pos, kind, o] of want) {
      let e = beastEls.find((x) => x.dataset.k === k);
      if (!e) {
        e = kind === 'tiger' ? h(`<div class="beast tiger" data-k="${k}">${img('monster_xuanhu', '玄虎')}</div>`) : h(`<div class="beast phantom" data-k="${k}"><div class="px" style="background-image:url(assets/px_${S.players[o].hero}.png)"></div></div>`);
        st.append(e); beastEls.push(e);
      }
      const { x, y } = iso(pos); e.style.left = `${x}px`; e.style.top = `${y + 6}px`; e.style.zIndex = Math.round(y) + 18;
    }
  }

  function renderTile(i, pop) {
    const st = $('#stage'); if (!st) return;
    const t = S.tiles[i], { x, y } = iso(i);
    const rally = t.b && t.owner != null && S.players[t.owner].buffs.some((b) => b.k === 'towerAtk');
    const key = `${rally}|${t.owner}|${t.b}|${t.hp == null ? '' : Math.round(t.hp)}|${t.m ? `${t.m.k}:${Math.round(t.m.hp || 0)}` : ''}|${t.s ? t.s.k : ''}|${t.chest}`;
    if (tileKey[i] === key && !pop) return;
    tileKey[i] = key;
    (sprites[i] || []).forEach((e) => e.remove());
    const list = [], top = $(`#tt${i}`);
    if (top) { top.style.fill = t.owner != null ? PCOLOR[t.owner] + '66' : ''; top.style.stroke = t.owner != null ? PCOLOR[t.owner] : ''; top.style.strokeWidth = t.owner != null ? '3.5' : ''; }
    if (t.b) {
      const b = SJ.BUILDINGS[t.b];
      list.push(h(`<div class="sprite bld ${pop ? 'pop' : ''} ${rally ? 'rally' : ''}" style="left:${x}px;top:${y + 15}px;width:${[0, 74, 88, 104][b.level]}px;height:${[0, 68, 82, 98][b.level]}px;z-index:${Math.round(y)}">${img('b_' + b.id, b.name)}</div>`));
      list.push(h(`<div class="lv" style="left:${x - 27}px;top:${y + 8}px;z-index:${Math.round(y) + 1};background:${PCOLOR[t.owner]}">${b.level}</div>`));
      if (t.hp != null) list.push(h(`<div class="bhp" style="left:${x}px;top:${y + 19}px;z-index:${Math.round(y) + 1}"><i style="width:${Math.max(4, t.hp / SJ.tileMaxHp(t) * 100)}%"></i></div>`));
    }
    if (t.m) {
      const mo = SJ.MONSTERS[t.m.k];
      list.push(h(`<div class="sprite bld" style="left:${x}px;top:${y + 8}px;width:64px;height:60px;z-index:${Math.round(y)}">${img('monster_' + mo.id, mo.name)}</div>`));
      if (t.m.hp != null) list.push(h(`<div class="bhp" style="left:${x}px;top:${y + 12}px;z-index:${Math.round(y) + 1}"><i style="width:${Math.max(4, t.m.hp / (mo.hp * t.m.sc) * 100)}%"></i></div>`));
    }
    if (t.s) list.push(h(`<div class="sprite bld" style="left:${x + 16}px;top:${y + 14}px;width:60px;height:56px;z-index:${Math.round(y) + 2}">${img('sm_' + t.s.k)}</div>`));
    if (t.chest) list.push(h(`<div class="sprite bld glow" style="left:${x}px;top:${y + 8}px;width:58px;height:54px;z-index:${Math.round(y) + 2}">${img('chest')}</div>`));
    list.forEach((e) => st.append(e));
    sprites[i] = list;
  }

  // 精卫展翅的造型：放技能时状态还没加上，所以掷骰、走路时也要再刷一次
  // 加持期间人物换造型：翼覆千里金龙之气，兵主降世血焰，形夭战魂，与日逐走背日
  const has = (p, k) => p.buffs.some((b) => b.k === k);
  const FORMS = {
    soar: (p) => has(p, 'soar'),
    yifu: (p) => has(p, 'fly'),
    berserk: (p) => has(p, 'avatar'),
    spirit: (p) => has(p, 'pool'),
    sunrun: (p) => p.bonusTurns > 0,
    hydra: (p) => has(p, 'nine'),
    buqu: (p) => p.hero === 'jingwei' && p.sk[3] > 0,
  };
  function soarSync() {
    if (S) S.players.forEach((p) => {
      const e = pieces[p.id]; if (!e) return;
      for (const [c, f] of Object.entries(FORMS)) e.classList.toggle(c, p.alive && !!f(p));
    });
  }

  function placePieces() {
    if (!$('#stage')) return;
    soarSync();
    const groups = {};
    S.players.forEach((p) => { if (p.alive) (groups[p.pos] = groups[p.pos] || []).push(p.id); });
    S.players.forEach((p) => {
      const e = pieces[p.id]; if (!e) return;
      if (!p.alive) { e.style.display = 'none'; return; }
      e.style.display = '';
      const g = groups[p.pos], k = g.indexOf(p.id), { x, y } = iso(p.pos);
      setPiece(e, x + (k - (g.length - 1) / 2) * 26, y + 6);
      e.classList.toggle('active', p.id === S.cur);
    });
    const m = $('#mini'); if (m) B.drawMini(m, S, PCOLOR);
  }
  function setPiece(e, x, y) {
    const old = parseFloat(e.style.left);
    if (!Number.isNaN(old) && Math.abs(x - old) > 1) e.classList.toggle('flip', x < old);
    e.style.left = `${x}px`; e.style.top = `${y}px`; e.style.zIndex = Math.round(y) + 20;
  }

  function renderPlayers() {
    const top = $('#top'); if (!top) return;
    top.innerHTML = S.players.map((p) => {
      const H = SJ.HEROES[p.hero];
      const stt = Object.keys(p.status).map((k) => `<span title="${SJ.STATUS[k]?.[0] || k}">${icon(k, 13)}</span>`).join('') + (p.buffs.length ? `<span class="bf">${icon('star', 13)}${p.buffs.length}</span>` : '');
      return `<div class="pcard ${p.id === S.cur ? 'cur' : ''} ${p.alive ? '' : 'dead'}" style="--pc:${PCOLOR[p.id]}">${img('hero_' + p.hero)}
        <div class="body"><div class="nm" style="color:${shade(PCOLOR[p.id], 0.72)}">${H.name} <small>Lv${p.level}${p.human ? ' · 你' : ''}${p.human && p.pts ? ' · 有技能点' : ''}</small></div>
        <div class="hpbar"><i style="width:${Math.max(0, p.hp / p.maxhp * 100)}%"></i></div>
        <div class="row"><span>${icon('heart', 12)} ${Math.max(0, p.hp)}</span><span class="g">${icon('gold', 12)} ${p.gold}</span><span class="stt">${stt}</span></div></div></div>`;
    }).join('') + `<div class="tools"><button class="iconbtn" id="b-snd" aria-label="声音">${icon(sfx.muted ? 'mute' : 'sound', 16)}</button><button class="iconbtn ${speed > 1 ? 'on' : ''}" id="b-fast" aria-label="加速">${icon('fast', 16)}</button><button class="iconbtn" id="b-help" aria-label="帮助">${icon('help', 16)}</button></div>`;
    top.querySelectorAll('.pcard').forEach((c, i) => { c.onclick = () => showPlayer(i); });
    $('#b-snd').onclick = () => { sfx.toggle(); renderPlayers(); };
    $('#b-fast').onclick = () => { speed = speed > 1 ? 1 : 2.5; renderPlayers(); };
    $('#b-help').onclick = help;
    const r = $('#round'); if (r) r.textContent = `${SJ.MAP.name} · 第 ${S.round} 轮`;
  }

  function closeInfo() { $('.info')?.remove(); }
  function showInfo(i) {
    closeInfo(); sfx.click();
    const b = SJ.BOARD[i], t = S.tiles[i];
    let pic = '', name = '', txt = '';
    const T = SJ.TERRAIN[b.terrain];
    if (b.type === 'corner') { const c = SJ.LANDMARKS[b.corner]; pic = c.art; name = c.name; txt = c.say || c.desc; }
    else if (b.type === 'event') { name = '吉凶'; txt = '抽一张吉凶卡，立刻生效。'; }
    else if (b.type === 'nest') { name = '异兽巢穴'; txt = '可以打异兽，赢了得金币、经验，可能得宝物。'; if (t.m) { const m = SJ.MONSTERS[t.m.k]; pic = 'monster_' + m.id; txt += `<br>${m.name} 还在，血 ${Math.round(t.m.hp != null ? t.m.hp : m.hp * t.m.sc)}。`; } }
    else if (b.type === 'post') { name = '驿站'; txt = `路过得 ${SJ.TUNE.salary} 金，停下再回 15 血。`; pic = 'lm_post'; }
    else if (b.type === 'shop') { name = '宝铺'; txt = '路过送 1 个消耗品，停下送 2 个。消耗品最多带 4 个。'; pic = 'lm_shop'; }
    else if (b.type === 'portal') { name = '传送门'; txt = '停下传到另一扇门。'; pic = 'lm_portal'; }
    else if (b.type === 'wild') { name = T.name; txt = T.desc; }
    else {
      const R = SJ.REGIONS[b.region];
      if (t.b) { const d = SJ.BUILDINGS[t.b], br = SJ.BRANCHES[d.branch], mx = SJ.tileMaxHp(t); pic = 'b_' + d.id; name = `${d.name} Lv${d.level}`; txt = `${SJ.RACES[d.race].name} · ${br.name}（${br.hint}）<br>${d.desc}<br>血 ${Math.round(t.hp != null ? t.hp : mx)} / ${Math.round(mx)} · 过路费 ${SJ.toll(S, i)}`; }
      else { name = b.name; txt = t.owner == null ? `无主领地，价格 ${R.price}。` : `空地基，过路费 ${SJ.toll(S, i)}。`; }
      if (t.owner != null) txt += `<br>主人：${S.players[t.owner].name}`;
      txt += `<br>${T.name}：${T.desc}`;
    }
    if (t.s) { const sm = SJ.SUMMONS[t.s.k]; txt += `<br>${S.players[t.s.o].name} 的${sm.name}，${t.s.perm ? '一直都在' : `还有 ${t.s.n} 轮`}。`; }
    if (t.chest) txt += '<br>这里有天降宝箱，走过就能捡。';
    for (const bt of S.beasts || []) if (bt.pos === i) { pic = 'monster_xuanhu'; txt += `<br>玄虎在这里，血 ${Math.round(bt.hp)} / ${bt.maxhp}，攻击 ${bt.atk}。每轮走一格，停在建筑上就打。`; }
    for (const ph of S.phantoms || []) if (ph.pos === i) txt += `<br>${S.players[ph.o].name}的虚影在这里，身上还有 ${ph.gold} 金。`;
    $('#wrap').append(h(`<div class="info">${pic ? img(pic) : ''}<div><b>${name}</b><p>${txt}</p></div></div>`));
  }

  function showPlayer(i) { sfx.click(); heroPanel(S.players[i]); }

  const BUFF = { atkPct: '攻击', wingAtk: '振翼加攻', def: '防御', dodge: '闪避', crit: '暴击', thorn: '反伤', lifesteal: '吸血', tollCut: '过路费减免', buildCut: '建造减免', fly: '飞行', stepMul: '步数翻倍', towerAtk: '塔攻击', undying: '打不死', revive: '还魂', twin: '连打两下', absorb: '吸收伤害', pool: '形夭', scorch: '焚身', trail: '赤足', autoUp: '路过升级', regen: '每回合回血', venom: '攻击带毒', soar: '展翅', vault: '蓄水', avatar: '兵主降世', fear: '无首之惧', qianli: '赤地千里', deathRite: '向死而生', holdUp: '守城升级', steps: '步数' };
  const TIER = ['', '消耗品', '二阶', '三阶', '四阶', '神器'];

  // 英雄面板。act 存在时是自己回合，可以操作；否则只看
  function heroPanel(p, act) {
    document.querySelector('.hero-layer')?.remove();
    if (!p.human && !act) return foePanel(p);
    const H = SJ.HEROES[p.hero], st = SJ.heroStats(S, p), race = SJ.RACES[p.race], list = SJ.SKILLS[p.hero];
    const need = SJ.xpNeed(p.level), maxed = p.level >= SJ.TUNE.maxLevel;
    const dots = (k, l) => (k.ult ? `<i class="on-${l > 0}"></i>` : [1, 2, 3].map((n) => `<i class="on-${l >= n}"></i>`).join(''));
    const skill = (k, i) => {
      const l = p.sk[i], learn = act && SJ.canLearn(p, i), cast = act && SJ.canCast(p, i, S), cd = p.cd[i];
      const gate = !act || l >= (k.ult ? 1 : 3) ? '' : k.ult ? (p.level < 6 ? '6 级可学' : '') : (p.level < l * 2 + 1 ? `${l * 2 + 1} 级可升` : '');
      return `<div class="sk ${l ? '' : 'dim'}">${img('sk_' + k.id)}<div class="sk-b"><b>${k.name}</b> <em>${k.ult ? '大招 · ' : ''}${SJ.SKILL_KIND[k.kind]}${k.cd ? ` · 冷却 ${[].concat(k.cd).join('/')}` : ''}</em><span class="dots">${dots(k, l)}</span><p>${k.say || k.desc}</p></div>
        <div class="sk-a">${learn ? `<button class="btn small" data-a='{"a":"learn","i":${i}}'>${l ? '升级' : '学习'}</button>` : ''}${cast ? `<button class="btn small primary" data-a='{"a":"cast","i":${i}}'>释放</button>` : ''}${l && cd > 0 ? `<small>冷却 ${cd}</small>` : ''}${gate ? `<small>${gate}</small>` : ''}</div></div>`;
    };
    const item = (id, v) => (id ? `<button class="slot t${SJ.itemOf(id).tier}" ${act ? `data-a='${v}'` : ''} title="${SJ.itemOf(id).name}">${img('it_' + id)}<b>${SJ.itemOf(id).name}</b><small>${TIER[SJ.itemOf(id).tier]} · ${SJ.itemOf(id).desc}</small></button>` : '<div class="slot empty">空</div>');
    const l = h(`<div class="layer dim hero-layer"><div class="hp">
      <div class="hp-top">${img('hero_' + p.hero)}<div><h3>${H.name} <small>Lv${p.level}${p.pts ? ` · ${p.pts} 个技能点` : ''}</small></h3>
        <div class="xpbar"><i style="width:${maxed ? 100 : p.xp / need * 100}%"></i></div><small>${maxed ? '满级' : `经验 ${Math.floor(p.xp)} / ${need}`}</small>
        <p>血 ${p.hp} / ${p.maxhp} · 攻 ${st.atk.toFixed(1)} · 防 ${Math.round(st.def * 100)}% · 闪避 ${Math.round(st.dodge * 100)}% · 领地 ${SJ.lands(S, p)}</p>
        <p class="race" style="color:${shade(race.color, 0.72)}">${race.name}（种族）：${race.trait}</p>
        ${p.buffs.length ? `<p>加持：${p.buffs.map((b) => `${BUFF[b.k] || b.k} ${b.n - 1 > 0 ? `${b.n - 1} 回合` : '本回合'}`).join('、')}</p>` : ''}
        ${Object.keys(p.status).length ? `<p>状态：${Object.entries(p.status).map(([k, n]) => `${SJ.STATUS[k]?.[0] || k} ${n}`).join('、')}</p>` : ''}</div></div>
      <h4>技能</h4><div class="sks">${list.map(skill).join('')}</div>
      <h4>消耗品 <small>最多 4 个${act ? '，点一下马上用掉' : ''}</small></h4><div class="slots">${[0, 1, 2, 3].map((i) => { const id = (p.cons || [])[i], c = id && SJ.consOf(id); return c ? `<button class="slot t1" ${act ? `data-a='{"a":"use","i":${i}}'` : ''}>${img('it_' + id)}<b>${c.name}</b><small>${c.desc}</small></button>` : '<div class="slot empty">空</div>'; }).join('')}</div>
      ${p.art ? (() => { const a = SJ.artOf(p.art.id); return `<h4>神器</h4><div class="slots"><div class="slot t5">${img('it_' + a.id)}<b>${a.name}</b><small>${a.desc}${p.art.n != null ? `（还剩 ${p.art.n} 轮）` : ''}</small></div></div>`; })() : ''}
      <h4>宝物 <small>最多装备 4 件${act ? '，点一下卸下' : ''}</small></h4><div class="slots">${p.items.map((id, i) => item(id, `{"a":"unequip","i":${i}}`)).join('')}</div>
      ${p.bag.length ? `<h4>包袱 <small>${act ? '点一下装备' : ''}</small></h4><div class="slots">${p.bag.map((id, i) => item(id, p.items.includes(null) ? `{"a":"equip","i":${i}}` : `{"a":"sell","i":${i}}`)).join('')}</div>${act && !p.items.includes(null) ? '<p class="note">宝物栏满了：先卸下一件，或者点包袱里的宝物卖掉。</p>' : ''}` : ''}
      <div class="btn-row"><button class="btn primary" id="hp-close">${act ? '返回' : '关闭'}</button></div></div></div>`);
    $('#hp-close', l).onclick = () => { sfx.click(); l.remove(); };
    l.querySelectorAll('[data-a]').forEach((b) => { b.onclick = () => { sfx.click(); const a = JSON.parse(b.dataset.a); l.remove(); act(a); }; });
    document.body.append(l);
  }

  // 别人的英雄只看得到基础信息：血、钱、装备的宝物名字。技能和宝物效果要自己摸索
  function foePanel(p) {
    const H = SJ.HEROES[p.hero], race = SJ.RACES[p.race];
    const items = p.items.filter(Boolean);
    const l = h(`<div class="layer dim hero-layer"><div class="hp">
      <div class="hp-top">${img('hero_' + p.hero)}<div><h3>${H.name} <small>Lv${p.level}</small></h3>
        <p>血 ${p.hp} / ${p.maxhp} · 金币 ${p.gold} · 领地 ${SJ.lands(S, p)}</p>
        <p class="race" style="color:${shade(race.color, 0.72)}">${race.name}</p></div></div>
      <h4>装备的宝物</h4><div class="slots">${items.length ? items.map((id) => `<div class="slot t${SJ.itemOf(id).tier}">${img('it_' + id)}<b>${SJ.itemOf(id).name}</b></div>`).join('') : '<div class="slot empty">没有</div>'}</div>
      <p class="note">别人的技能和宝物效果看不到，得在交手里自己摸清。</p>
      <div class="btn-row"><button class="btn primary" id="hp-close">关闭</button></div></div></div>`);
    $('#hp-close', l).onclick = () => { sfx.click(); l.remove(); };
    document.body.append(l);
  }

  function logLine(text) {
    const l = $('#log'); if (!l) return;
    l.append(h(`<div>${text}</div>`));
    while (l.children.length > 3) l.firstChild.remove();
  }

  let toastTimer = null;
  function toast(text, kind) {
    const w = $('#wrap'); if (!w) return;
    w.querySelector('.toast')?.remove();
    const e = h(`<div class="toast ${kind || ''}">${text}</div>`);
    w.append(e); clearTimeout(toastTimer); toastTimer = setTimeout(() => e.remove(), 1800);
  }

  function floaty(pid, text, color) {
    const p = S.players[pid], st = $('#stage'); if (!st) return;
    const { x, y } = iso(p.pos);
    const e = h(`<div class="floaty" style="left:${x}px;top:${y - 60}px;color:${color};z-index:800">${text}</div>`);
    st.append(e); setTimeout(() => e.remove(), 1000);
  }

  // ---------- 引擎接口 ----------
  const IO = {
    async ask(kind, c) {
      if (!c.p.human) { await wait(kind === 'roll' ? 420 : 260); return SJ.aiDecide(S, kind, c); }
      closeInfo();
      return askHuman(kind, c);
    },
    async ev(e) { return play(e); },
  };

  function panel(html) {
    const d = $('#dock'); d.innerHTML = '';
    const p = h(`<div class="panel">${html}</div>`); d.append(p); return p;
  }
  function choose(html, bind) {
    return new Promise((res) => {
      const p = panel(html);
      p.querySelectorAll('[data-v]').forEach((b) => { b.onclick = () => { sfx.click(); $('#dock').innerHTML = ''; res(JSON.parse(b.dataset.v)); }; });
      if (bind) bind(p);
    });
  }
  const V = (v) => `data-v='${JSON.stringify(v)}'`;

  let reopen = false;
  function askHuman(kind, c) {
    const p = c.p;
    const bOpt = (id, v, extra) => { const d = SJ.BUILDINGS[id]; return `<button class="opt" ${V(v)} ${extra || ''}>${img('b_' + id)}<div><b>${d.name}</b><span>${d.desc}</span></div></button>`; };
    switch (kind) {
      case 'roll': return new Promise((res) => {
        soarSync(); // 刚放完的飞行技能，回到掷骰时就该看到造型
        const can = SJ.SKILLS[p.hero].some((_, i) => SJ.canLearn(p, i));
        const ready = SJ.SKILLS[p.hero].filter((_, i) => SJ.canCast(p, i, S)).length;
        const cons = (p.cons || []).map((id, i) => { const c = SJ.consOf(id); return `<button class="consbtn" data-u="${i}" title="${c.name}：${c.desc}">${img('it_' + id)}<small>${c.name}</small></button>`; }).join('');
        const pnl = panel(`${cons ? `<div class="consbar">${cons}</div>` : ''}<div class="btn-row"><button class="btn primary bigbtn herobtn ${can ? 'hot' : ''}" id="b-hero">英雄${can ? `<i class="badge">${p.pts}</i>` : ready ? `<i class="badge g">${ready}</i>` : ''}</button><button class="btn primary bigbtn" id="b-roll">掷骰</button></div>`);
        const act = (a) => { const again = a.a !== 'cast' && a.a !== 'use'; reopen = again; $('#dock').innerHTML = ''; res(a); };
        pnl.querySelectorAll('[data-u]').forEach((b) => { b.onclick = () => { sfx.click(); act({ a: 'use', i: +b.dataset.u }); }; });
        $('#b-roll', pnl).onclick = () => { sfx.click(); $('#dock').innerHTML = ''; res(true); };
        $('#b-hero', pnl).onclick = () => { sfx.click(); heroPanel(p, act); };
        if (reopen) { reopen = false; heroPanel(p, act); }
      });
      case 'buy': return choose(`<h4>${SJ.BOARD[c.tile].name}</h4><p>无主领地，价格 ${c.price} 金，买下后免费建一座 1 级建筑，分支自己选。你有 ${p.gold} 金。</p><div class="btn-row"><button class="btn primary" ${V(true)}>买下</button><button class="btn" ${V(false)}>不买</button></div>`);
      case 'build': return choose(`<h4>在这里建什么</h4><p>买下的地免费建一座 1 级建筑，选一个分支。</p><div class="opts">${SJ.BUILD_BRANCHES.map((k) => { const id = `${p.race}_${k}_1`, d = SJ.BUILDINGS[id], B = SJ.BRANCHES[k]; return `<button class="opt" ${V(k)}>${img('b_' + id)}<div><b>${d.name}</b><span>${B.name}：${B.hint}</span><span>${d.desc}</span></div></button>`; }).join('')}</div>`);
      case 'upgrade': return choose(`<h4>升级建筑</h4><p>花费 ${c.cost} 金，你有 ${p.gold} 金。</p><div class="opts">${bOpt(c.options[0], true)}</div><div class="btn-row"><button class="btn" ${V(false)}>不升级</button></div>`);
      case 'fork': return choose(`<h4>升到 Lv3，二选一</h4><p>花费 ${c.cost} 金，你有 ${p.gold} 金。</p><div class="opts">${c.options.map((id) => bOpt(id, id)).join('')}</div><div class="btn-row"><button class="btn" ${V(null)}>先不升</button></div>`);
      case 'tollOrFight': {
        const o = S.players[S.tiles[c.tile].owner], d = SJ.bdef(S.tiles[c.tile]);
        return choose(`<h4>${c.D.name}${d ? ` Lv${d.level}` : ''}（${o.name}）</h4><p>没拆掉就付半价过路费。</p><div class="btn-row"><button class="btn" ${V(false)}>交过路费 ${c.toll}</button><button class="btn primary" ${V(true)}>开打</button></div>`);
      }
      case 'way': return new Promise((res) => {
        // 岔路：底部给方向按钮，棋盘上也标出能走的格子，点哪个都行
        const st = $('#stage'), here = iso(p.pos), marks = [];
        const ARROW = (i) => { const q = iso(i), a = Math.atan2(q.y - here.y, q.x - here.x) * 180 / Math.PI; return ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'][((Math.round(a / 45) % 8) + 8) % 8]; };
        const done = (i) => { sfx.click(); marks.forEach((e) => e.remove()); $('#dock').innerHTML = ''; res(i); };
        B.cam.free = 0; B.look(here.x, here.y - 40, 260);
        for (const i of c.options) {
          const q = iso(i), e = h(`<button class="waymark" style="left:${q.x}px;top:${q.y}px">${ARROW(i)}</button>`);
          e.onclick = (ev) => { ev.stopPropagation(); done(i); }; st.append(e); marks.push(e);
        }
        const pnl = panel(`<h4>岔路口</h4><p>还要走 ${c.left} 步，选一个方向（也可以直接点地图上闪光的格子）。</p><div class="btn-row">${c.options.map((i) => `<button class="btn" data-w="${i}">${ARROW(i)} ${SJ.BOARD[i].name}</button>`).join('')}</div>`);
        pnl.querySelectorAll('[data-w]').forEach((b) => { b.onclick = () => done(+b.dataset.w); });
      });
      case 'nest': return choose(`<h4>${c.m.name} Lv${c.m.xp - 1}</h4><p>双方各出手 3 下。打死得金币和经验，可能得到宝物；打不死，它会回满血。绕开也要挨它一下。</p><div class="btn-row"><button class="btn primary" ${V(true)}>开打</button><button class="btn" ${V(false)}>绕开</button></div>`);
      case 'kunlun': return choose(`<h4>昆仑</h4><p>选一种恩赐。</p><div class="btn-row"><button class="btn primary" ${V('heal')}>回 40 血</button><button class="btn" ${V('bless')}>下一战攻击 +50%</button></div>`);
      case 'shop': return choose(`<h4>${c.city ? `${c.city}的三阶宝物` : '宝铺'}</h4><div class="opt" style="margin-bottom:8px">${img('it_' + c.item.id)}<div><b>${c.item.name}</b><span>${TIER[c.item.tier]} · ${c.item.desc}</span></div></div><p>价格 ${c.price} 金，你有 ${p.gold} 金。</p><div class="btn-row"><button class="btn primary" ${V(true)}>买下</button><button class="btn" ${V(false)}>不买</button></div>`);
      case 'card': return new Promise((res) => {
        const pnl = panel(`<h4>两张吉凶卡，选一张</h4><div class="opts">${c.cards.map((k, i) => `<button class="opt" data-c="${i}">${img('card_' + k.id)}<div><b>${k.name}（${k.kind === 'good' ? '吉' : '凶'}）</b><span>${k.desc}</span></div></button>`).join('')}</div>`);
        pnl.querySelectorAll('[data-c]').forEach((b) => { b.onclick = () => { sfx.click(); $('#dock').innerHTML = ''; res(c.cards[+b.dataset.c]); }; });
      });
    }
    return Promise.resolve(false);
  }

  async function play(e) {
    switch (e.t) {
      case 'turn': { B.cam.free = 0; placePieces(); renderPlayers(); focusCur(350); const p = S.players[e.pid]; if (p.human) sfx.turn(); if (p.human && S.players.filter((q) => q.human).length > 1) toast(`轮到 ${p.name}`); await wait(420); break; }
      case 'gold': renderPlayers(); floaty(e.pid, `+${e.n}`, '#ffd76a'); if (e.why) logLine(`${S.players[e.pid].name} ${e.why} +${e.n} 金`); if (S.players[e.pid].human) sfx.coin(); await wait(300); break;
      case 'heal': renderPlayers(); floaty(e.pid, `+${e.n}`, '#8ee09a'); sfx.heal(); await wait(240); break;
      case 'hurt': renderPlayers(); floaty(e.pid, `-${e.n}`, '#ff7a66'); sfx.hurt(); await wait(320); break;
      case 'roll': soarSync(); await showDice(e); break;
      case 'move': {
        const pc = pieces[e.pid], p = S.players[e.pid], end = p.pos;
        soarSync();
        const D = DASH[e.dash], yf = pc.classList.contains('yifu');
        if (D && D.blink) { await blink(pc, e.path); p.pos = end; placePieces(); break; }
        const ms = D ? D.ms : yf ? 190 : 230, cls = D ? ['dash', `dash-${e.dash}`] : [];
        pc.classList.add('walk', ...cls);
        pc.style.setProperty('--step', `${ms / speed}ms`);
        if (D) sfx.whoosh();
        let k = 0;
        for (const pos of e.path) {
          const { x, y } = iso(pos);
          if (D || yf) { ghost(pc, D ? D.trail : 'feather'); trail(parseFloat(pc.style.left), parseFloat(pc.style.top), D ? D.trail : 'feather'); }
          setPiece(pc, x, y + 6);
          B.look(x, y - 40, ms / speed);
          if ((D && D.fly) || yf) { if (k % 2 === 0) sfx.flap(); } else if (D) { if (k % 2 === 0) sfx.step(SJ.BOARD[pos].terrain); } else sfx.step(SJ.BOARD[pos].terrain);
          k++; await wait(ms);
        }
        pc.classList.remove('walk', ...cls);
        if (D) { const { x, y } = iso(end); trail(x, y + 6, 'land'); if (D.fly) sfx.land(); }
        p.pos = end; placePieces(); break;
      }
      case 'jump': { sfx.portal(); const pc = pieces[e.pid]; pc.style.setProperty('--step', '0ms'); placePieces(); const q = iso(e.pos); B.look(q.x, q.y - 40, 300); await wait(620); break; }
      case 'msg': logLine(e.text); toast(e.text, e.kind); if (/拦下/.test(e.text)) sfx.block(); renderPlayers(); placePieces(); if (e.kind === 'skill') sfx.skill(); await wait(800); break;
      case 'tile': if (e.look) await lookTile(e.tile, e.look); renderTile(e.tile, e.built || e.buy); renderPlayers(); if (e.built || e.buy) sfx.build(); if (e.fire) sfx.fire(); if (e.built) logLine(`${S.players[e.pid].name} 建造了 ${SJ.BUILDINGS[S.tiles[e.tile].b].name}`); await wait(e.fire ? 450 : 240); break;
      case 'toll': { renderPlayers(); const q = S.players[e.to], p = S.players[e.pid]; logLine(`${p.name} 付给 ${q.name} ${e.n} 金`); floaty(e.pid, `-${e.n}`, '#ffd76a'); sfx.pay(); await wait(560); break; }
      case 'card': await showCard(e); renderPlayers(); S.tiles.forEach((_, i) => renderTile(i)); break;
      case 'battle': S.tiles.forEach((_, i) => renderTile(i)); await playBattle(e); renderPlayers(); S.tiles.forEach((_, i) => renderTile(i)); placePieces(); break;
      case 'levelup': toast(`${S.players[e.pid].name} 升到 ${e.level} 级${S.players[e.pid].human ? '，得到技能点' : ''}`, 'skill'); sfx.level(); renderPlayers(); await wait(620); break;
      case 'cast': {
        const q = iso(S.players[e.pid].pos), st = $('#stage');
        const m = h(`<div class="castfx" style="left:${q.x}px;top:${q.y - 70}px">${img('sk_' + e.sk)}<b>${e.name}</b></div>`);
        st.append(m); setTimeout(() => m.remove(), 1300 / speed);
        if (ULT[e.sk]) { await ultShow(e); renderPlayers(); break; }
        sfx.cast(SJ.SKILLS[S.players[e.pid].hero].find((k) => k.id === e.sk).kind); logLine(`${S.players[e.pid].name} 释放 ${e.name}`); B.look(q.x, q.y - 40, 200); renderPlayers(); await wait(900); break;
      }
      case 'casted': {
        soarSync(); S.tiles.forEach((_, i) => renderTile(i)); renderPlayers();
        const u = ULT[e.sk]; if (!u) break;
        if (u.form) await morph(e.pid);
        if (u.board) await mapReveal(u.board(S.players[e.pid]).filter((i) => i >= 0), u.bad ? 'bad' : 'good', u.c1);
        break;
      }
      case 'cons': { const c = SJ.consOf(e.id); toast(`${S.players[e.pid].name} 得到消耗品 ${c.name}`); if (S.players[e.pid].human) sfx.coin(); renderPlayers(); await wait(500); break; }
      case 'artifact': { const a = SJ.artOf(e.id); toast(`${S.players[e.pid].name} 得到神器 ${a.name}`, 'skill'); sfx.treasure(); renderPlayers(); await wait(1400); break; }
      case 'beasts': renderBeasts(); if (e.move) { sfx.step('grass'); await wait(360); } break;
      case 'treasure': { const t = SJ.TREASURES.find((x) => x.id === e.id); toast(`${S.players[e.pid].name} 得到${TIER[t.tier]}宝物 ${t.name}`, 'skill'); sfx.treasure(); renderPlayers(); await wait(1000); break; }
      case 'death': { const p = S.players[e.pid]; logLine(`${p.name} 阵亡`); toast(`${p.name} 阵亡了（${e.why || ''}）`, 'skill'); sfx.death(); S.tiles.forEach((_, i) => renderTile(i)); renderPlayers(); placePieces(); await wait(1100); break; }
    }
  }

  // ---------- 技能动画 ----------
  // 位移技能：ms 每格多快，trail 留下的痕迹，fly 腾空，blink 闪现
  const DASH = {
    zhenyi: { ms: 140, trail: 'gust', fly: true },
    benpao: { ms: 105, trail: 'dust' },
    jizou: { ms: 115, trail: 'blood' },
    xianzhu: { ms: 165, trail: 'candle' },
    huanxing: { blink: true, trail: 'foxfire' },
  };
  function fxAt(x, y, cls, life, z) {
    const st = $('#stage'); if (!st) return null;
    const e = h(`<div class="${cls}" style="left:${x}px;top:${y}px;z-index:${z || Math.round(y) + 19}"></div>`);
    st.append(e); setTimeout(() => e.remove(), life / Math.min(speed, 2)); return e;
  }
  // 地上留下的痕迹，几颗粒子错开一点
  function trail(x, y, kind) {
    if (Number.isNaN(x)) return;
    const n = kind === 'land' ? 1 : 3;
    for (let i = 0; i < n; i++) {
      const e = fxAt(x + (Math.random() - 0.5) * 34, y - Math.random() * (kind === 'gust' || kind === 'feather' ? 70 : 24), `trail t-${kind}`, 1100);
      if (e) { e.style.setProperty('--dx', `${(Math.random() - 0.5) * 50}px`); e.style.setProperty('--r', `${Math.random() * 360}deg`); e.style.animationDelay = `${i * 50}ms`; }
    }
  }
  // 残影：把棋子复制一份留在原地慢慢淡掉
  function ghost(pc, kind) {
    const g = pc.cloneNode(true); g.classList.remove('active', 'walk'); g.classList.add('ghost', `g-${kind}`);
    g.style.transition = 'none'; pc.parentNode.append(g); setTimeout(() => g.remove(), 520 / Math.min(speed, 2));
  }
  // 九尾狐幻形：原地化作狐火消失，沿路一串狐火，在终点现身
  async function blink(pc, path) {
    sfx.blink();
    trail(parseFloat(pc.style.left), parseFloat(pc.style.top), 'puff');
    pc.classList.add('vanish'); await wait(260);
    for (const pos of path) { const { x, y } = iso(pos); trail(x, y + 6, 'foxfire'); B.look(x, y - 40, 90 / speed); await wait(90); }
    const { x, y } = iso(path[path.length - 1]);
    pc.style.setProperty('--step', '0ms'); setPiece(pc, x, y + 6);
    trail(x, y + 6, 'puff'); sfx.blink();
    pc.classList.remove('vanish'); pc.classList.add('appear'); await wait(380); pc.classList.remove('appear');
  }
  // 地图上某格出了事（抽卡拆楼、送地、发水），镜头先跟过去再改
  async function lookTile(i, kind) {
    const { x, y } = iso(i);
    B.cam.free = 0; B.look(x, y - 30, 320 / speed); await wait(340);
    fxAt(x, y + 14, `ping p-${kind}`, 1300, 9000); sfx.ping(kind);
    await wait(520);
  }

  // 大招：叠在地图上的特效。镜头推近英雄，地图染色，发光素材用 screen 混合叠上去。
  // fx 选特效，tint 是地图染色（multiply），c1 是光色，parts 是粒子
  const ULT = {
    zhuolu: { fx: 'drum', c1: '#ffd35a', tint: '#ffcf7a', parts: 'spark', board: (p) => S.tiles.map((t, i) => (t.owner === p.id && t.b ? i : -1)) },
    yifu: { fx: 'wings', c1: '#ffe08a', tint: '#ffe2a0', parts: 'feather', form: true },
    qianli: { fx: 'drought', c1: '#ff8a3a', tint: '#ff7a3a', parts: 'ember', board: (p) => S.tiles.map((t, i) => (t.owner != null && t.owner !== p.id && t.b ? i : -1)), bad: true },
    bingzhu: { fx: 'wargod', c1: '#ff4a3a', tint: '#c8503c', parts: 'ember', form: true },
    xingyao: { fx: 'spirit', c1: '#ffa040', tint: '#c87a4a', parts: 'ember', form: true },
    yuri: { fx: 'sunrise', c1: '#ffd25a', tint: '#ffc070', parts: 'mote', form: true },
    chiling: { fx: 'ghost', c1: '#3ad0c0', tint: '#2a5a5a', parts: 'mote' },
    busi: { fx: 'spirit', c1: '#8af0b0', tint: '#5a8a6a', parts: 'mote', board: (p) => S.tiles.map((t, i) => (t.owner === p.id && t.b ? i : -1)) },
    tunshan: { fx: 'hydra', c1: '#5af0b0', tint: '#3a8a6a', parts: 'mote', form: true },
    tianhu: { fx: 'tails', c1: '#ff9ad2', tint: '#e8a0c8', parts: 'mote' },
    zhuyin: { fx: 'eye', c1: '#ffb04a', tint: '#8a5a3a', parts: 'none', board: (p) => S.tiles.map((t, i) => (t.s && t.s.k === 'candle' && t.s.o === p.id ? i : -1)) },
  };
  // 特效素材是亮度转成透明度的 PNG，正常叠加就像发光；不用混合模式，大地图在高清屏上混合会整张丢掉
  const fxImg = (n, cls) => `<img class="fxi ${n} ${cls || ''}" src="assets/fx_${n}.png" alt="">`;
  let fxLoaded = false;
  function preloadFx() { if (fxLoaded) return; fxLoaded = true; ['wings', 'eye', 'sun', 'tails', 'ghost', 'wargod', 'jade', 'shock', 'slash', 'spirit', 'hydra'].forEach((n) => { const i = new Image(); i.src = `assets/fx_${n}.png`; }); }
  // 跟着英雄的特效放进地图里、压在英雄身后；铺满全屏的放在地图上面
  const ULT_STAGE = {
    drum: fxImg('shock', 'a') + fxImg('shock', 'b') + fxImg('shock', 'c'),
    wings: fxImg('wings'), wargod: fxImg('wargod') + fxImg('wargod'), spirit: fxImg('spirit'), sunrise: fxImg('sun'), jade: fxImg('jade'), tails: fxImg('tails'), hydra: fxImg('hydra'),
  };
  const ULT_BG = {
    drought: fxImg('sun') + '<i class="heat"></i>',
    wargod: fxImg('slash'), spirit: fxImg('slash'),
    ghost: fxImg('ghost', 'l') + fxImg('ghost', 'r'),
    eye: fxImg('eye'),
  };
  const ULT_TOP = { eye: '<i class="lid top"></i><i class="lid bot"></i>' };
  // 世界坐标换成屏幕坐标（镜头已经停在 cam 上时）
  function toScreen(wx, wy) {
    const r = B.cam.wrap.getBoundingClientRect(), z = B.cam.z;
    return [r.left + r.width / 2 + (wx - B.cam.x) * z, r.top + r.height / 2 + (wy - B.cam.y) * z];
  }
  async function ultShow(e) {
    const p = S.players[e.pid], u = ULT[e.sk];
    logLine(`${p.name} 释放大招 ${e.name}`);
    sfx.ult(u.fx === 'eye' ? 'lids' : u.fx === 'wargod' || u.fx === 'spirit' ? 'blades' : u.fx === 'drought' || u.fx === 'sunrise' ? 'sun' : u.fx === 'jade' ? 'heal' : u.fx === 'hydra' ? 'blades' : u.fx);
    const c0 = { x: B.cam.x, y: B.cam.y, z: B.cam.z }, { x, y } = iso(p.pos);
    B.cam.free = 0; B.cam.x = x; B.cam.y = y - 40; B.cam.z = Math.min(1.6, c0.z * 1.3); B.apply(450 / speed);
    const [hx, hy] = toScreen(x, y - 10);
    // 三层：地图染色、发光素材和粒子、最上层的眼睑和烛光
    const vars = `--c1:${u.c1};--tint:${u.tint};--hx:${hx}px;--hy:${hy}px;--z:${B.cam.z}`;
    const tint = h(`<div class="ult-layer ult-tint u-${u.fx}" style="${vars}"><i class="u-tint"></i><i class="u-vig"></i></div>`);
    const glow = h(`<div class="ult-layer ult-glow u-${u.fx}" style="${vars}"><div class="u-bg">${ULT_BG[u.fx] || ''}</div><canvas></canvas></div>`);
    const l = h(`<div class="ult-layer ult u-${u.fx}" style="${vars}">${ULT_TOP[u.fx] || ''}</div>`);
    if (u.fx === 'eye') { // 烛阴闭目：眼睛合上以后，天下只剩自己的烛光
      (u.board(p).filter((i) => i >= 0)).forEach((i, n) => { const q = iso(i), [sx, sy] = toScreen(q.x, q.y); l.append(h(`<i class="candle" style="left:${sx}px;top:${sy - 20}px;animation-delay:${1200 + n * 40}ms"></i>`)); });
      if (pieces[p.id]) { const [sx, sy] = toScreen(x, y - 40); l.append(h(`<i class="candle me" style="left:${sx}px;top:${sy}px"></i>`)); }
    }
    const layers = [tint, glow, l];
    document.body.append(...layers);
    if (ULT_STAGE[u.fx]) { const sf = h(`<div class="ult-stage u-${u.fx}" style="left:${x}px;top:${y + 6}px;z-index:${Math.round(y + 6) + 19}">${ULT_STAGE[u.fx]}</div>`); $('#stage').append(sf); layers.push(sf); }
    const stop = u.parts === 'none' ? () => {} : ultParticles($('canvas', glow), u, hx, hy);
    // 鼓声震屏：抖镜头，不给大地图加动画（会整张重画成空白）
    const shake = () => { const bx = B.cam.x, by = B.cam.y; [[-9, 5], [8, -6], [-6, -3], [4, 4], [0, 0]].forEach(([dx, dy], n) => setTimeout(() => { B.cam.x = bx + dx; B.cam.y = by + dy; B.apply(0); }, n * 50)); };
    if (u.fx === 'drum') [300, 800, 1300].forEach((t) => setTimeout(shake, t / speed));
    let done = false; const end = new Promise((r) => { l.onclick = () => { done = true; r(); }; setTimeout(r, (u.fx === 'eye' ? 3000 : 2300) / speed); });
    await end; void done;
    layers.forEach((x) => x.classList.add('out')); setTimeout(() => { stop(); layers.forEach((x) => x.remove()); }, 450);
    Object.assign(B.cam, c0); B.apply(450 / speed);
    await wait(300);
  }
  // 加持类大招放完：镜头回到英雄身上，看他变身
  async function morph(pid) {
    const pc = pieces[pid], p = S.players[pid]; if (!pc || !p.alive) return;
    const { x, y } = iso(p.pos); B.cam.free = 0; B.look(x, y - 40, 260 / speed); await wait(280);
    pc.classList.remove('morph'); void pc.offsetWidth; pc.classList.add('morph');
    trail(x, y + 6, 'land'); sfx.land(); await wait(900); pc.classList.remove('morph');
  }
  // 大招影响全图时，拉远看一眼哪些格子被波及，再回来
  async function mapReveal(list, kind, color) {
    if (!list.length || !$('#stage')) return;
    const c = { x: B.cam.x, y: B.cam.y, z: B.cam.z };
    B.fitAll(); await wait(260);
    list.forEach((i, n) => { const { x, y } = iso(i); setTimeout(() => { const e = fxAt(x, y + 14, `ping big p-${kind}`, 1400, 9000); if (e) e.style.setProperty('--pc', color); }, n * 25 / speed); });
    sfx.ping(kind); await wait(1200);
    Object.assign(B.cam, c); B.cam.free = 0; B.apply(320); await wait(340);
  }
  // 特效粒子：火星往上飘，羽毛往下落，光点慢慢浮，火花从英雄身上炸开
  function ultParticles(cv, u, hx, hy) {
    const ctx = cv.getContext('2d'); cv.width = innerWidth; cv.height = innerHeight;
    const W = cv.width, H = cv.height, ps = []; let on = true; const t0 = performance.now();
    const add = () => {
      const x = Math.random() * W;
      if (u.parts === 'ember') ps.push({ x: hx + (Math.random() - 0.5) * W * 0.6, y: hy + Math.random() * 40, vx: (Math.random() - 0.5) * 1.5, vy: -2 - Math.random() * 4, s: 1.5 + Math.random() * 2.5, l: 1, c: Math.random() < 0.5 ? u.c1 : '#ffe2a0', glow: true });
      else if (u.parts === 'feather') ps.push({ x, y: -20, vx: (Math.random() - 0.5) * 2, vy: 1.5 + Math.random() * 2.5, s: 4 + Math.random() * 5, l: 1.3, c: Math.random() < 0.6 ? u.c1 : '#fff6d8', rot: Math.random() * 6, f: true });
      else if (u.parts === 'spark') { const a = Math.random() * 6.28, v = 3 + Math.random() * 7; ps.push({ x: hx, y: hy, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.5, s: 1.5 + Math.random() * 2.5, l: 1, c: Math.random() < 0.6 ? u.c1 : '#fff', glow: true }); }
      else ps.push({ x: hx + (Math.random() - 0.5) * W * 0.8, y: hy + (Math.random() - 0.3) * H * 0.5, vx: (Math.random() - 0.5) * 0.5, vy: -0.5 - Math.random() * 1.3, s: 1.5 + Math.random() * 3, l: 1.2, c: Math.random() < 0.7 ? u.c1 : '#ffffff', glow: true });
    };
    const tick = (now) => {
      if (!on) return;
      const age = now - t0;
      const n = u.parts === 'spark' ? ([300, 800, 1300].some((t) => age > t && age < t + 70) ? 30 : 0) : 3;
      for (let i = 0; i < n; i++) add();
      ctx.clearRect(0, 0, W, H);
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i]; p.x += p.vx; p.y += p.vy; p.l -= 0.013;
        if (p.f) { p.rot += 0.08; p.vx += Math.sin(p.rot) * 0.15; }
        if (p.l <= 0) { ps.splice(i, 1); continue; }
        ctx.globalAlpha = Math.min(1, p.l); ctx.fillStyle = p.c;
        ctx.shadowBlur = p.glow ? 8 : 0; ctx.shadowColor = p.c;
        if (p.f) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s * 0.35, 0, 0, 6.28); ctx.fill(); ctx.restore(); }
        else { ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 6.28); ctx.fill(); }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return () => { on = false; };
  }

  async function showDice(e) {
    const d = $('#dice'), n = $('#dnote');
    sfx.dice();
    d.innerHTML = `<div class="die roll">${SJ.dieFace(e.d1)}</div><div class="die roll">${SJ.dieFace(e.d2)}</div>`;
    const t = e.d1 + e.d2 + (e.bonus || 0);
    n.textContent = `${S.players[e.pid].name} 走 ${Math.max(1, t)} 步${e.bonus ? `（${e.bonus > 0 ? '+' : ''}${e.bonus}）` : ''}${e.d1 === e.d2 ? ' · 对子' : ''}${e.back ? ' · 混乱倒退' : ''}`;
    await wait(760);
  }

  function showCard(e) {
    return new Promise((res) => {
      const k = e.card, good = k.kind === 'good';
      sfx.card(); setTimeout(() => (good ? sfx.good() : sfx.bad()), 180 / speed);
      const l = h(`<div class="layer dim"><div class="card-show ${k.kind}"><div class="tag">${good ? '吉' : '凶'}</div>${img('card_' + k.id, k.name)}<h3>${k.name}</h3><p>${k.desc}</p></div></div>`);
      document.body.append(l);
      logLine(`${S.players[e.pid].name} 抽到 ${k.name}：${k.desc}`);
      let done = false;
      const end = () => { if (done) return; done = true; l.remove(); res(); };
      l.onclick = end; setTimeout(end, 2100 / speed);
    });
  }

  // ---------- 战斗 ----------
  const fighterImg = (c) => {
    if (c.kind === 'hero') return 'hero_' + c.heroId;
    if (c.kind === 'monster') return 'monster_' + c.id;
    return c.id ? 'b_' + c.id : 'corner_jianmu';
  };

  function playBattle(e) {
    return new Promise((res) => {
      const { a, d, res: R } = e;
      const head = (e.kind === 'duel' ? '比试' : e.kind === 'nest' ? '打异兽' : e.kind === 'beast' ? '玄虎来袭' : e.forced ? '被迫开打！' : '开打') + (e.kind === 'duel' ? (e.real ? ' · 真打，掉血算数' : ' · 点到为止，不掉血') : ' · 各出手 3 下');
      const human = (e.pid != null && S.players[e.pid].human) || (e.qid != null && S.players[e.qid].human);
      const b = h(`<div class="battle"><canvas class="fx"></canvas><div class="bt-head">${head}</div>
        <div class="bt-field">
          <div class="fighter" id="fa"><div class="pic">${img(fighterImg(a), a.name)}</div><h3>${a.name}</h3><div class="bigbar"><i id="ha"></i></div><small id="na"></small></div>
          <div class="fighter" id="fd"><div class="pic">${img(fighterImg(d), d.name)}</div><h3>${d.name}</h3><div class="bigbar"><i id="hd"></i></div><small id="nd"></small></div>
        </div><div class="bt-foot"><button class="btn" id="skip">跳过</button></div></div>`);
      document.body.append(b);
      const fa = $('#fa', b), fd = $('#fd', b), cv = $('canvas', b);
      const fx = particles(cv);
      const setHp = (ah, dh) => {
        $('#ha', b).style.width = `${Math.max(0, ah / a.maxhp * 100)}%`; $('#hd', b).style.width = `${Math.max(0, dh / d.maxhp * 100)}%`;
        $('#na', b).textContent = `${Math.round(Math.max(0, ah))} / ${Math.round(a.maxhp)}`; $('#nd', b).textContent = `${Math.round(Math.max(0, dh))} / ${Math.round(d.maxhp)}`;
      };
      setHp(a.hp, d.hp);
      let skip = false, finished = false;
      $('#skip', b).onclick = () => { skip = true; };
      const pause = (ms) => new Promise((r) => { const t0 = performance.now(); const f = () => { if (skip || performance.now() - t0 > ms / (speed * (human ? 1 : 1.8))) r(); else setTimeout(f, 16); }; f(); });
      const num = (f, text, cls) => { const n = h(`<div class="dmg ${cls || ''}">${text}</div>`); f.append(n); setTimeout(() => n.remove(), 700); };
      const center = (f) => { const r = $('.pic', f).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
      const finish = async () => {
        if (finished) return; finished = true;
        setHp(R.aHp, R.dHp);
        const v = e.verdict || R.winner, win = v === 'a', draw = v === 'draw', ko = R.winner !== 'draw';
        if (ko) (win ? fd : fa).classList.add('down');
        const mine = draw || (e.kind === 'duel' ? (S.players[e.pid].human ? win : !win) : e.kind === 'beast' ? !win : win);
        const txt = R.charmed ? '归降' : draw ? '收手' : e.kind === 'duel' ? `${(win ? a : d).name} 胜${ko ? '' : '（剩血多）'}` : e.kind === 'beast' ? (win ? '拆掉' : '守住') : e.kind === 'nest' && win ? '打死' : win ? '拆掉' : '败';
        b.append(h(`<div class="bt-result" style="color:${mine ? '#ffdf8a' : '#e38a7a'}">${txt}</div>`));
        if (!draw) (mine ? sfx.win : sfx.lose)();
        await new Promise((r) => setTimeout(r, skip ? 480 : 820 / speed));
        fx.stop(); b.remove(); res();
      };
      (async () => {
        await pause(350);
        for (const ev of R.log) {
          if (skip) break;
          const me = ev.who === 'a' ? fa : fd, foe = ev.who === 'a' ? fd : fa;
          const lunge = ev.who === 'a' ? 'lunge-r' : 'lunge-l';
          setHp(ev.aHp, ev.dHp);
          if (ev.t === 'hit') {
            me.classList.remove('lunge-r', 'lunge-l'); void me.offsetWidth; me.classList.add(lunge);
            foe.classList.add('hurt'); setTimeout(() => foe.classList.remove('hurt'), 90);
            num(foe, ev.dmg, ev.crit ? 'crit' : '');
            const [x, y] = center(foe); fx.burst(x, y, ev.crit ? 34 : 14, ev.crit ? '#ffcf4d' : '#f0e2c0');
            if (ev.crit) { b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); sfx.crit(); } else if ((ev.who === 'a' ? a : d).kind === 'hero') sfx.slash(); else sfx.hit();
            await pause(ev.crit ? 300 : 210);
          } else if (ev.t === 'miss') { num(foe, '落空', 'miss'); sfx.miss(); await pause(170); }
          else if (ev.t === 'self') { num(me, `${ev.dmg} 打到自己`, 'crit'); sfx.hurt(); await pause(240); }
          else if (ev.t === 'thorn') { num(foe, ev.dmg, ''); sfx.hurt(); await pause(120); }
          else if (ev.t === 'heal') { num(me, `+${ev.amt}`, 'heal'); sfx.heal(); await pause(90); }
          else if (ev.t === 'dot') { num(me, ev.dmg, ''); await pause(90); }
          else if (ev.t === 'stunned') { num(me, '眩晕', 'miss'); sfx.stun(); await pause(160); }
          else if (ev.t === 'skill') {
            const s = h(`<div class="skillname">${ev.name}</div>`); b.append(s); setTimeout(() => s.remove(), 850);
            const [x, y] = center(foe); fx.burst(x, y, 44, '#ff9a4d'); sfx.skill(); await pause(560);
          }
        }
        finish();
      })();
    });
  }

  function particles(cv) {
    const ctx = cv.getContext('2d'); let ps = [], on = true;
    const size = () => { cv.width = window.innerWidth; cv.height = window.innerHeight; }; size();
    const tick = () => {
      if (!on) return;
      ctx.clearRect(0, 0, cv.width, cv.height);
      ps = ps.filter((p) => p.l > 0);
      for (const p of ps) { p.x += p.vx; p.y += p.vy; p.vy += 0.22; p.l -= 0.03; ctx.globalAlpha = Math.max(0, p.l); ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, p.s, p.s); }
      requestAnimationFrame(tick);
    };
    tick();
    return { burst(x, y, n, c) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = 2 + Math.random() * 6; ps.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, l: 1, s: 2 + Math.random() * 4, c }); } }, stop() { on = false; } };
  }

  // ---------- 主循环 ----------
  async function runLoop() {
    const me = S;
    while (S === me && !S.over) {
      store.set(SAVE, JSON.stringify(S));
      renderPlayers(); placePieces();
      await SJ.takeTurn(S, IO);
      if (S !== me) return;
      if (!S.over && !spectate && S.players.some((p) => p.human) && !S.players.some((p) => p.human && p.alive)) {
        const go = await gameOverAsk();
        if (!go) return;
        spectate = true; speed = 4;
      }
    }
    if (S === me) { store.del(SAVE); finalScreen(); }
  }

  function ranks() { return S.players.slice().sort((a, b) => (a.rank || 99) - (b.rank || 99)); }

  function gameOverAsk() {
    return new Promise((res) => {
      const p = S.players.find((q) => q.human);
      const l = h(`<div class="layer dim"><div class="result"><h2>Game Over</h2>${img('hero_' + p.hero)}<p>你的英雄阵亡了，撑到第 ${S.round} 轮。</p><div class="btn-row"><button class="btn primary" id="again">再来一局</button><button class="btn" id="watch">看电脑打完</button></div></div></div>`);
      $('img', l).className = 'big';
      document.body.append(l);
      $('#again', l).onclick = () => { l.remove(); store.del(SAVE); res(false); setup(); };
      $('#watch', l).onclick = () => { l.remove(); res(true); };
    });
  }

  // 结局图只给赢了的真人看，每位英雄一张，让玩家想用每个英雄都赢一次
  function endings(add) {
    let seen = []; try { seen = JSON.parse(store.get(ENDINGS) || '[]'); } catch (e) { seen = []; }
    if (add && !seen.includes(add)) { seen.push(add); store.set(ENDINGS, JSON.stringify(seen)); }
    return seen.length;
  }

  function finalScreen() {
    const w = S.players[S.winner], mine = w && w.human;
    if (mine) sfx.win();
    const me = S.players.find((p) => p.human);
    const top = mine
      ? `<img class="ending" src="assets/end_${w.hero}.jpg" alt="" onerror="this.className='big';this.onerror=null;this.src='assets/hero_${w.hero}.webp'"><p class="ending-text">${SJ.ENDINGS[w.hero]}</p><p class="ending-note">已解锁结局 ${endings(w.hero)} / ${ids().length}</p>`
      : `${w ? img('hero_' + w.hero) : ''}${me ? `<p class="ending-note">用${SJ.HEROES[me.hero].name}赢一局，才能看到${SJ.HEROES[me.hero].name}的结局</p>` : ''}`;
    const l = h(`<div class="layer dim"><div class="result ${mine ? 'won' : ''}"><h2>${w ? `${w.name} 称霸四境` : '同归于尽'}</h2>${top}<p>一共打了 ${S.round} 轮</p>
      ${ranks().map((p, i) => `<div class="rank"><span>第 ${i + 1} 名 ${p.name}${p.human ? '（你）' : ''}</span><span>Lv${p.level}</span></div>`).join('')}
      <div class="btn-row" style="margin-top:14px"><button class="btn primary" id="again">再来一局</button></div></div></div>`);
    const im = $('.result > img:not(.ending)', l); if (im) im.className = 'big';
    document.body.append(l);
    $('#again', l).onclick = () => { l.remove(); setup(); };
  }

  window.__sj = { get S() { return S; }, setSpeed(v) { speed = v; }, final: finalScreen, play };
  title();
  count('open'); flushHits();
})();
