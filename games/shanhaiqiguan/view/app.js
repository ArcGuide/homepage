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
    app.innerHTML = `<div class="title"><video class="cover" src="assets/cover.mp4" poster="assets/cover.jpg" autoplay muted loop playsinline preload="auto" aria-hidden="true"></video>
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
      <p>这是一局大富翁。选一位上古英雄，在山海大地图上走，买地、盖建筑、收过路费。起点和朝向是随机的，到岔路随机选方向。英雄阵亡就出局，活到最后的人赢。</p>
      <h3>踩到别人的地</h3>
      <ul><li>交过路费，或者开打。</li><li>打塔和决斗双方各出手 3 下就收手，血量都记下来，下回接着打。打异兽要打到一方倒下。</li><li>当场拆掉：地归你。没拆掉：只付半价过路费。</li><li>钱不够时必须开打，付不起的部分用血抵，破产也会死。</li></ul>
      <h3>五种建筑</h3>
      <ul><li><b>驻军</b>：低攻高防，很难打穿。</li><li><b>射手</b>：高攻低防，高等级会杀人。</li><li><b>巫术</b>：给英雄挂负面状态，带回棋盘。</li><li><b>城邑</b>：每回合产金，但没什么战斗力。</li><li><b>学宫</b>：强化自家英雄，被拆就失效。</li></ul>
      <p>英雄 5 级前走路就涨经验，5 级起只能靠打塔、打异兽和决斗。塔的等级、对手的等级越高，经验越多。</p>
      <p>停在自家地上才能升级，同时把建筑修满。建筑平时每回合回一点血。Lv2 升 Lv3 时二选一，每个种族都不一样。塔会随轮数越来越猛。</p>
      <h3>英雄成长</h3>
      <ul><li>满级 10 级，每升一级得一个技能点。普通技能在 1、3、5 级可以升一级，大招 6 级才能学。</li><li>掷骰前点「英雄」：学技能、放技能、换宝物。主动技能都是一键释放，用完要冷却几回合。</li><li>最多装备 4 件宝物。1 阶在宝铺买或打异兽，2 阶在自家满级城邑买，3 阶只有天降宝箱和地标大事件才有。</li></ul>
      <h3>地形和地标</h3>
      <ul><li>山地不能造房，走得慢，还可能挖到金矿；灵河一路回血；毒沼路过中毒；云海把你吹飞；大海把你卷走；黑水和别人换位。</li><li>驿站发钱，宝铺卖宝物，门是传送门，兽窝的异兽血量也会记住。</li><li>每个地标都有夸张效果。点地图上任意一格可以看详情，拖动看地图，滚轮或双指缩放。</li></ul>
      <div class="btn-row" style="margin-top:12px"><button class="btn primary">知道了</button></div></div></div>`);
    $('button', l).onclick = () => l.remove();
    document.body.append(l);
  }

  // ---------- 选人 ----------
  function heroInfo(k) {
    const H = SJ.HEROES[k], L = SJ.LORE[k];
    return `<aside class="hero-info">${img('hero_' + k)}<div><h3>${H.name}</h3><small>${SJ.RACES[H.race].name}</small>
      <p>${L.story}</p><p>如今，${H.name}来到战场，作为${L.role}，可以学习${SJ.SKILLS[k].map((x) => `「${x.name}」`).join('')}等技能，争取一统华夏江山。</p></div></aside>`;
  }

  function setup() {
    sfx.stopAmbient();
    const ids = Object.keys(SJ.HEROES);
    const shuffle = ids.slice().sort(() => Math.random() - 0.5);
    const seats = [{ kind: 'human', hero: shuffle[0] }, { kind: 'ai', hero: null }, { kind: 'ai', hero: null }, { kind: 'off', hero: null }];
    let on = 0, mapId = Object.keys(SJ.MAPS)[0];
    const KIND = { human: '真人', ai: '电脑', off: '空位' };
    function draw() {
      const used = seats.filter((x) => x.kind === 'human').map((x) => x.hero);
      app.innerHTML = `<div class="setup"><h2>选择地图</h2>
        <div class="maps">${Object.values(SJ.MAPS).map((m) => `<button class="mapcard ${m.id === mapId ? 'sel' : ''}" data-m="${m.id}"><img src="assets/map_${m.id}.webp" alt="" onerror="this.remove()"><b>${m.name}</b><span>${m.tiles.length} 格 · ${m.desc}</span></button>`).join('')}</div>
        <div class="pick-head"><h2>选择英雄</h2><button class="btn" id="rand">随机英雄</button></div>
        <div class="seats">${seats.map((x, i) => `<div class="seat ${i === on ? 'on' : ''} ${x.kind === 'off' ? 'off' : ''}" data-i="${i}">
          ${x.kind === 'human' ? img('hero_' + x.hero) : `<div class="qmark">${x.kind === 'ai' ? '?' : ''}</div>`}<b>${x.kind === 'human' ? SJ.HEROES[x.hero].name : x.kind === 'ai' ? '等你选完' : '—'}</b><small>玩家 ${i + 1}</small>
          ${i ? `<button class="kind" data-k="${i}">${KIND[x.kind]}</button>` : `<button class="kind" disabled>${KIND[x.kind]}</button>`}</div>`).join('')}</div>
        <div class="pick"><div class="pick-list">${Object.entries(SJ.RACES).map(([rid, r]) => `<div class="race-block"><h3 style="color:${shade(r.color, 0.72)}">${r.name}<small>${r.trait}</small></h3><div class="hero-grid">
          ${ids.filter((k) => SJ.HEROES[k].race === rid).map((k) => `<button class="hero-card ${seats[on].hero === k ? 'sel' : ''} ${used.includes(k) && seats[on].hero !== k ? 'taken' : ''}" data-h="${k}">${img('hero_' + k)}<b>${SJ.HEROES[k].name}</b></button>`).join('')}
        </div></div>`).join('')}</div>${heroInfo(seats[on].hero)}</div>
        <div class="setup-foot"><button class="btn" id="back">返回</button><button class="btn primary" id="go">开始</button></div></div>`;
      app.querySelectorAll('[data-m]').forEach((e) => { e.onclick = () => { mapId = e.dataset.m; sfx.click(); keep(); }; });
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
      $('#go').onclick = () => {
        sfx.click();
        // 真人选完，电脑才从剩下的英雄里挑
        const taken = seats.filter((x) => x.kind === 'human').map((x) => x.hero);
        const pool = ids.filter((k) => !taken.includes(k)).sort(() => Math.random() - 0.5);
        const players = seats.filter((x) => x.kind !== 'off').map((x) => ({ hero: x.kind === 'human' ? x.hero : pool.pop(), human: x.kind === 'human' }));
        count('start'); S = SJ.newGame({ players, map: mapId }); store.del(SAVE); spectate = false; speed = 1; startGame(); if (!store.get('sijing.seen2')) { store.set('sijing.seen2', '1'); help(); }
      };
    }
    function keep() { const y = $('.setup')?.scrollTop || 0; draw(); $('.setup').scrollTop = y; }
    draw();
  }

  // ---------- 对局画面 ----------
  async function startGame() {
    app.innerHTML = `<div class="top" id="top"></div><div class="boardwrap" id="wrap"><div class="world" id="stage"><canvas id="ground"></canvas></div>
      <div class="hud" id="hud"><div class="round" id="round"></div><div class="dice" id="dice"></div><div class="dice-note" id="dnote"></div><div class="log" id="log"></div></div>
      <canvas class="minimap" id="mini"></canvas><button class="iconbtn mapbtn" id="b-all">全图</button><div class="loading" id="loading">正在铺开山海…</div><div class="dock" id="dock"></div></div>`;
    pieces = {}; sprites = {}; tileKey = {};
    B.setup(SJ.MAP);
    const st = $('#stage');
    st.style.width = `${B.W}px`; st.style.height = `${B.H}px`;
    B.bindCamera($('#wrap'), st);
    B.zoomDefault();
    const me = S;
    await B.bake($('#ground'));
    if (S !== me) return;
    $('#loading')?.remove();
    buildBoard(); renderPlayers();
    let all = false;
    $('#b-all').onclick = () => { all = !all; if (all) B.fitAll(); else { B.zoomDefault(); B.cam.free = 0; focusCur(0); } };
    $('#mini').onclick = (e) => { const r = e.target.getBoundingClientRect(); B.cam.x = (e.clientX - r.left) / r.width * B.W; B.cam.y = (e.clientY - r.top) / r.height * B.H; B.cam.free = Date.now() + 3000; B.apply(200); };
    focusCur(0);
    sfx.ambient(S.map);
    runLoop();
  }

  function focusCur(ms) { const p = S.players[S.cur], q = iso(p.pos); B.look(q.x, q.y - 40, ms); }
  window.addEventListener('resize', () => { if ($('#stage') && S) B.apply(0); });

  function buildBoard() {
    const st = $('#stage');
    st.insertAdjacentHTML('beforeend', B.tilesSvg());
    SJ.BOARD.forEach((_, i) => renderTile(i));
    S.players.forEach((p) => {
      const e = h(`<div class="piece" style="--pc:${PCOLOR[p.id]}"><div class="px" style="background-image:url(assets/px_${p.hero}.png)"></div></div>`);
      pieces[p.id] = e; st.append(e);
    });
    placePieces();
    st.addEventListener('click', (ev) => { if (B.wasDrag()) return; const t = ev.target.closest('[data-t]'); if (t) showInfo(+t.dataset.t); else closeInfo(); });
  }

  function renderTile(i, pop) {
    const st = $('#stage'); if (!st) return;
    const t = S.tiles[i], { x, y } = iso(i);
    const key = `${t.owner}|${t.b}|${t.hp == null ? '' : Math.round(t.hp)}|${t.m ? `${t.m.k}:${Math.round(t.m.hp || 0)}` : ''}|${t.s ? t.s.k : ''}|${t.chest}`;
    if (tileKey[i] === key && !pop) return;
    tileKey[i] = key;
    (sprites[i] || []).forEach((e) => e.remove());
    const list = [], top = $(`#tt${i}`);
    if (top) { top.style.fill = t.owner != null ? PCOLOR[t.owner] + '66' : ''; top.style.stroke = t.owner != null ? PCOLOR[t.owner] : ''; top.style.strokeWidth = t.owner != null ? '3.5' : ''; }
    if (t.b) {
      const b = SJ.BUILDINGS[t.b];
      list.push(h(`<div class="sprite bld ${pop ? 'pop' : ''}" style="left:${x}px;top:${y + 15}px;width:${[0, 74, 88, 104][b.level]}px;height:${[0, 68, 82, 98][b.level]}px;z-index:${Math.round(y)}">${img('b_' + b.id, b.name)}</div>`));
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

  function placePieces() {
    if (!$('#stage')) return;
    const groups = {};
    S.players.forEach((p) => { if (p.alive) (groups[p.pos] = groups[p.pos] || []).push(p.id); });
    S.players.forEach((p) => {
      const e = pieces[p.id]; if (!e) return;
      if (!p.alive) { e.style.display = 'none'; return; }
      e.style.display = '';
      const g = groups[p.pos], k = g.indexOf(p.id), { x, y } = iso(p.pos);
      setPiece(e, x + (k - (g.length - 1) / 2) * 26, y + 6);
      e.classList.toggle('active', p.id === S.cur);
      e.classList.toggle('soar', p.buffs.some((b) => b.k === 'soar'));
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
    if (b.type === 'corner') { const c = SJ.LANDMARKS[b.corner]; pic = c.art; name = c.name; txt = c.desc; }
    else if (b.type === 'event') { name = '吉凶'; txt = '抽一张吉凶卡，立刻生效。'; }
    else if (b.type === 'nest') { name = '异兽巢穴'; txt = '可以打异兽，赢了得金币、经验，可能得宝物。'; if (t.m) { const m = SJ.MONSTERS[t.m.k]; pic = 'monster_' + m.id; txt += `<br>${m.name} 还在，血 ${Math.round(t.m.hp != null ? t.m.hp : m.hp * t.m.sc)}。`; } }
    else if (b.type === 'post') { name = '驿站'; txt = `路过得 ${SJ.TUNE.salary} 金，停下再回 15 血。`; pic = 'lm_post'; }
    else if (b.type === 'shop') { name = '宝铺'; txt = `停下可以花 ${SJ.TUNE.shopPrice} 金买一件宝物。`; pic = 'lm_shop'; }
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
    $('#wrap').append(h(`<div class="info">${pic ? img(pic) : ''}<div><b>${name}</b><p>${txt}</p></div></div>`));
  }

  function showPlayer(i) { sfx.click(); heroPanel(S.players[i]); }

  const BUFF = { atkPct: '攻击', def: '防御', dodge: '闪避', crit: '暴击', thorn: '反伤', lifesteal: '吸血', tollCut: '过路费减免', buildCut: '建造减免', fly: '飞行', stepMul: '步数翻倍', towerAtk: '塔攻击', undying: '打不死', revive: '还魂', twin: '连打两下', absorb: '吸收伤害', pool: '形夭', scorch: '焚身', trail: '赤地', autoUp: '路过升级', regen: '每回合回血', venom: '攻击带毒', soar: '展翅', vault: '蓄水' };
  const TIER = ['', '一阶', '二阶', '三阶'];

  // 英雄面板。act 存在时是自己回合，可以操作；否则只看
  function heroPanel(p, act) {
    document.querySelector('.hero-layer')?.remove();
    const H = SJ.HEROES[p.hero], st = SJ.heroStats(S, p), race = SJ.RACES[p.race], list = SJ.SKILLS[p.hero];
    const need = SJ.xpNeed(p.level), maxed = p.level >= SJ.TUNE.maxLevel;
    const dots = (k, l) => (k.ult ? `<i class="on-${l > 0}"></i>` : [1, 2, 3].map((n) => `<i class="on-${l >= n}"></i>`).join(''));
    const skill = (k, i) => {
      const l = p.sk[i], learn = act && SJ.canLearn(p, i), cast = act && SJ.canCast(p, i), cd = p.cd[i];
      const gate = !act || l >= (k.ult ? 1 : 3) ? '' : k.ult ? (p.level < 6 ? '6 级可学' : '') : (p.level < l * 2 + 1 ? `${l * 2 + 1} 级可升` : '');
      return `<div class="sk ${l ? '' : 'dim'}">${img('sk_' + k.id)}<div class="sk-b"><b>${k.name}</b> <em>${k.ult ? '大招 · ' : ''}${SJ.SKILL_KIND[k.kind]}${k.cd ? ` · 冷却 ${[].concat(k.cd).join('/')}` : ''}</em><span class="dots">${dots(k, l)}</span><p>${k.desc}</p></div>
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
      <h4>宝物 <small>最多装备 4 件${act ? '，点一下卸下' : ''}</small></h4><div class="slots">${p.items.map((id, i) => item(id, `{"a":"unequip","i":${i}}`)).join('')}</div>
      ${p.bag.length ? `<h4>包袱 <small>${act ? '点一下装备' : ''}</small></h4><div class="slots">${p.bag.map((id, i) => item(id, p.items.includes(null) ? `{"a":"equip","i":${i}}` : `{"a":"sell","i":${i}}`)).join('')}</div>${act && !p.items.includes(null) ? '<p class="note">宝物栏满了：先卸下一件，或者点包袱里的宝物卖掉。</p>' : ''}` : ''}
      <div class="btn-row"><button class="btn primary" id="hp-close">${act ? '返回' : '关闭'}</button></div></div></div>`);
    $('#hp-close', l).onclick = () => { sfx.click(); l.remove(); };
    l.querySelectorAll('[data-a]').forEach((b) => { b.onclick = () => { sfx.click(); const a = JSON.parse(b.dataset.a); l.remove(); act(a); }; });
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
        const can = SJ.SKILLS[p.hero].some((_, i) => SJ.canLearn(p, i));
        const ready = SJ.SKILLS[p.hero].filter((_, i) => SJ.canCast(p, i)).length;
        const pnl = panel(`<div class="btn-row"><button class="btn primary bigbtn herobtn ${can ? 'hot' : ''}" id="b-hero">英雄${can ? `<i class="badge">${p.pts}</i>` : ready ? `<i class="badge g">${ready}</i>` : ''}</button><button class="btn primary bigbtn" id="b-roll">掷骰</button></div>`);
        const act = (a) => { const again = a.a !== 'cast'; reopen = again; $('#dock').innerHTML = ''; res(a); };
        $('#b-roll', pnl).onclick = () => { sfx.click(); $('#dock').innerHTML = ''; res(true); };
        $('#b-hero', pnl).onclick = () => { sfx.click(); heroPanel(p, act); };
        if (reopen) { reopen = false; heroPanel(p, act); }
      });
      case 'buy': return choose(`<h4>${SJ.BOARD[c.tile].name}</h4><p>无主领地，价格 ${c.price} 金。你有 ${p.gold} 金。</p><div class="btn-row"><button class="btn primary" ${V(true)}>买下</button><button class="btn" ${V(false)}>不买</button></div>`);
      case 'build': return choose(`<h4>在这里建什么</h4><p>花费 ${c.cost} 金，你有 ${p.gold} 金。</p><div class="opts">${Object.keys(SJ.BRANCHES).map((k) => { const id = `${p.race}_${k}_1`, d = SJ.BUILDINGS[id], B = SJ.BRANCHES[k]; return `<button class="opt" ${V(k)}>${img('b_' + id)}<div><b>${d.name}</b><span>${B.name}：${B.hint}</span><span>${d.desc}</span></div></button>`; }).join('')}</div><div class="btn-row"><button class="btn" ${V(null)}>先不建</button></div>`);
      case 'upgrade': return choose(`<h4>升级建筑</h4><p>花费 ${c.cost} 金，你有 ${p.gold} 金。</p><div class="opts">${bOpt(c.options[0], true)}</div><div class="btn-row"><button class="btn" ${V(false)}>不升级</button></div>`);
      case 'fork': return choose(`<h4>升到 Lv3，二选一</h4><p>花费 ${c.cost} 金，你有 ${p.gold} 金。</p><div class="opts">${c.options.map((id) => bOpt(id, id)).join('')}</div><div class="btn-row"><button class="btn" ${V(null)}>先不升</button></div>`);
      case 'tollOrFight': {
        const o = S.players[S.tiles[c.tile].owner], d = SJ.bdef(S.tiles[c.tile]);
        return choose(`<h4>${c.D.name}${d ? ` Lv${d.level}` : ''}（${o.name}）</h4><p>没拆掉就付半价过路费。</p><div class="btn-row"><button class="btn" ${V(false)}>交过路费 ${c.toll}</button><button class="btn primary" ${V(true)}>开打</button></div>`);
      }
      case 'duel': return choose(`<h4>遇到 ${c.q.name} Lv${c.q.level}</h4><p>赢家抢走 30% 金币。</p><div class="btn-row"><button class="btn primary" ${V(true)}>决斗</button><button class="btn" ${V(false)}>走开</button></div>`);
      case 'nest': return choose(`<h4>${c.m.name} Lv${c.m.xp - 1}</h4><p>打到一方倒下，中途不能收手。打死得金币和经验，可能得到宝物。</p><div class="btn-row"><button class="btn primary" ${V(true)}>开打</button><button class="btn" ${V(false)}>绕开</button></div>`);
      case 'kunlun': return choose(`<h4>昆仑</h4><p>选一种恩赐。</p><div class="btn-row"><button class="btn primary" ${V('heal')}>回 40 血</button><button class="btn" ${V('bless')}>下一战攻击 +50%</button></div>`);
      case 'shop': return choose(`<h4>${c.city ? `${c.city}的二阶宝物` : '宝铺'}</h4><div class="opt" style="margin-bottom:8px">${img('it_' + c.item.id)}<div><b>${c.item.name}</b><span>${TIER[c.item.tier]} · ${c.item.desc}</span></div></div><p>价格 ${c.price} 金，你有 ${p.gold} 金。</p><div class="btn-row"><button class="btn primary" ${V(true)}>买下</button><button class="btn" ${V(false)}>不买</button></div>`);
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
      case 'roll': await showDice(e); break;
      case 'move': {
        const pc = pieces[e.pid], p = S.players[e.pid], end = p.pos, ms = 230;
        pc.classList.add('walk');
        pc.style.setProperty('--step', `${ms / speed}ms`);
        for (const pos of e.path) {
          const { x, y } = iso(pos);
          setPiece(pc, x, y + 6);
          B.look(x, y - 40, ms / speed);
          sfx.step(SJ.BOARD[pos].terrain); await wait(ms);
        }
        pc.classList.remove('walk');
        p.pos = end; placePieces(); break;
      }
      case 'jump': { sfx.portal(); const pc = pieces[e.pid]; pc.style.setProperty('--step', '0ms'); placePieces(); const q = iso(e.pos); B.look(q.x, q.y - 40, 300); await wait(620); break; }
      case 'msg': logLine(e.text); toast(e.text, e.kind); if (/拦下/.test(e.text)) sfx.block(); renderPlayers(); placePieces(); if (e.kind === 'skill') sfx.skill(); await wait(800); break;
      case 'tile': renderTile(e.tile, e.built || e.buy); renderPlayers(); if (e.built || e.buy) sfx.build(); if (e.fire) sfx.fire(); if (e.built) logLine(`${S.players[e.pid].name} 建造了 ${SJ.BUILDINGS[S.tiles[e.tile].b].name}`); await wait(e.fire ? 450 : 240); break;
      case 'toll': { renderPlayers(); const q = S.players[e.to], p = S.players[e.pid]; logLine(`${p.name} 付给 ${q.name} ${e.n} 金`); floaty(e.pid, `-${e.n}`, '#ffd76a'); sfx.pay(); await wait(560); break; }
      case 'card': await showCard(e); renderPlayers(); S.tiles.forEach((_, i) => renderTile(i)); break;
      case 'battle': S.tiles.forEach((_, i) => renderTile(i)); await playBattle(e); renderPlayers(); S.tiles.forEach((_, i) => renderTile(i)); placePieces(); break;
      case 'levelup': toast(`${S.players[e.pid].name} 升到 ${e.level} 级${S.players[e.pid].human ? '，得到技能点' : ''}`, 'skill'); sfx.level(); renderPlayers(); await wait(620); break;
      case 'cast': {
        const q = iso(S.players[e.pid].pos), st = $('#stage');
        const m = h(`<div class="castfx" style="left:${q.x}px;top:${q.y - 70}px">${img('sk_' + e.sk)}<b>${e.name}</b></div>`);
        st.append(m); setTimeout(() => m.remove(), 1300 / speed);
        sfx.cast(SJ.SKILLS[S.players[e.pid].hero].find((k) => k.id === e.sk).kind); logLine(`${S.players[e.pid].name} 释放 ${e.name}`); B.look(q.x, q.y - 40, 200); renderPlayers(); await wait(900); break;
      }
      case 'treasure': { const t = SJ.TREASURES.find((x) => x.id === e.id); toast(`${S.players[e.pid].name} 得到${TIER[t.tier]}宝物 ${t.name}：${t.desc}`, 'skill'); sfx.treasure(); renderPlayers(); await wait(1000); break; }
      case 'death': { const p = S.players[e.pid]; logLine(`${p.name} 阵亡`); toast(`${p.name} 阵亡了（${e.why || ''}）`, 'skill'); sfx.death(); S.tiles.forEach((_, i) => renderTile(i)); renderPlayers(); placePieces(); await wait(1100); break; }
    }
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
      const head = (e.kind === 'duel' ? '决斗' : e.kind === 'nest' ? '打异兽' : e.forced ? '被迫开打！' : '开打') + (e.kind === 'nest' ? ' · 打到一方倒下' : ' · 各出手 3 下');
      const human = S.players[e.pid].human || (e.qid != null && S.players[e.qid].human);
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
        const win = R.winner === 'a', draw = R.winner === 'draw';
        if (!draw) (win ? fd : fa).classList.add('down');
        const mine = draw || (e.kind === 'duel' ? (S.players[e.pid].human ? win : !win) : win);
        const txt = R.charmed ? '归降' : draw ? '收手' : e.kind === 'duel' ? `${(win ? a : d).name} 胜` : e.kind === 'nest' && win ? '打死' : win ? '拆掉' : '败';
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

  window.__sj = { get S() { return S; }, setSpeed(v) { speed = v; }, final: finalScreen };
  title();
  count('open'); flushHits();
})();
