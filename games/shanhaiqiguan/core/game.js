// 规则引擎。state 是纯 JSON，可以存档。io.ask 取决定，io.ev 播放事件（模拟时都是空操作）。
(function (g) {
  const SJ = g.SJ = g.SJ || {};
  const N = () => SJ.BOARD.length;

  // 切换当前地图。BOARD、REGIONS 都指向这张图。
  SJ.useMap = function (id) {
    const m = SJ.MAPS[id];
    SJ.MAP = m; SJ.BOARD = m.tiles; SJ.REGIONS = m.regions;
    m._adj = m._adj || {};
  };

  // 相邻：沿路走，碰到的最近的领地
  SJ.adjacent = function (i) {
    const c = SJ.MAP._adj; if (c[i]) return c[i];
    const out = [], seen = new Set([i]); let q = [i];
    for (let d = 0; d < 3 && q.length; d++) {
      const nx = [];
      for (const k of q) for (const j of SJ.BOARD[k].adj) { if (seen.has(j)) continue; seen.add(j); if (SJ.BOARD[j].type === 'land') out.push(j); else nx.push(j); }
      q = nx;
    }
    return (c[i] = out);
  };

  SJ.newGame = function (opts) {
    const seed = opts.seed != null ? opts.seed : (Date.now() & 0x7fffffff);
    const map = opts.map || 'kunlun';
    SJ.useMap(map);
    const s = {
      v: 2, map, rng: { v: seed }, seed, round: 1, cur: 0, extra: 0, over: false, winner: null,
      peace: 0, harvest: 0, drought: 0, forced: [], stats: { fights: 0, turns: 0, fightsWon: 0, cards: 0, duels: 0, tolls: 0 },
      tiles: SJ.BOARD.map(() => ({ owner: null, b: null, stop: 0, hp: null, m: null, s: null, chest: 0 })),
      players: opts.players.map((o, id) => {
        const h = SJ.HEROES[o.hero];
        return { id, hero: o.hero, race: h.race, human: !!o.human, name: o.name || h.name, pos: 0, from: 0, atkBonus: 0, hp: h.hp, maxhp: h.hp, gold: SJ.TUNE.startGold, level: 1, xp: 0, items: [null, null, null, null], bag: [], sk: [0, 0, 0, 0], pts: 1, cd: [0, 0, 0, 0], buffs: [], status: {}, alive: true, bless: 0, rank: 0 };
      }),
    };
    // 随机起点和朝向，彼此隔开
    const ok = SJ.BOARD.map((t, i) => i).filter((i) => SJ.BOARD[i].adj.length === 2 && ['land', 'wild'].includes(SJ.BOARD[i].type) && SJ.BOARD[i].terrain !== 'lava');
    const used = [];
    for (const p of s.players) {
      let best = ok[0], bd = -1;
      for (let k = 0; k < 24; k++) {
        const i = ok[ri(s, ok.length)], t = SJ.BOARD[i];
        const d = used.length ? Math.min(...used.map((j) => Math.abs(SJ.BOARD[j].x - t.x) + Math.abs(SJ.BOARD[j].y - t.y))) : 99;
        if (d > bd) { bd = d; best = i; }
      }
      used.push(best); p.pos = best; p.from = SJ.BOARD[best].adj[ri(s, 2)];
    }
    return s;
  };

  SJ.TUNE = { startGold: 500, salary: 100, baseIncome: 40, maxLevel: 10, walkXpLevel: 5, walkXp: 10, fightXp: 50, shop2Price: 480, chestEvery: 7, bagSize: 6, repair: 0.1, shopPrice: 180, towerHp: 1.8, towerAtk: 1.8, towerGrow: 0.2, debtHp: 0.25, poison: 4, burn: 6, curse: 3, tollGrow: 0.15, procPerLevel: 0.015 };

  const rnd = (s) => SJ.rand(s.rng);
  const ri = (s, n) => Math.floor(rnd(s) * n);
  const alive = (s) => s.players.filter((p) => p.alive);

  SJ.bdef = (t) => (t.b ? SJ.BUILDINGS[t.b] : null);
  SJ.tileLevel = (t) => (t.b ? SJ.BUILDINGS[t.b].level : 0);

  function ownFx(s, p, key) { // 累加这位玩家所有建筑的某个效果
    let v = 0;
    s.tiles.forEach((t) => { if (t.owner === p.id && t.b) { const f = SJ.BUILDINGS[t.b].fx[key]; if (f) v += f; } });
    return v;
  }
  SJ.ownFx = ownFx;

  const itemOf = (id) => SJ.TREASURES.find((x) => x.id === id);
  SJ.itemOf = itemOf;
  function treasure(p, key) { return p.items.reduce((v, id) => v + (id ? itemOf(id)[key] || 0 : 0), 0); }
  // 被动 + 加持 + 装备 的合计
  function pv(p, key) {
    let v = 0;
    SJ.SKILLS[p.hero].forEach((k, i) => { const l = p.sk[i]; if (l && k.pv && k.pv[key]) v += k.pv[key][l - 1]; });
    for (const b of p.buffs) if (b.k === key) v += b.v;
    return v;
  }
  SJ.pv = pv;
  const stat = (p, key) => pv(p, key) + treasure(p, key);
  const hasBuff = (p, k) => p.buffs.some((b) => b.k === k);

  // 这一格前后 5 格内有没有这位玩家的【烛】
  function nearCandle(s, i, o) {
    const seen = new Set([i]); let q = [i];
    for (let d = 0; d <= 5 && q.length; d++) {
      const nx = [];
      for (const k of q) {
        const m = s.tiles[k].s; if (m && m.k === 'candle' && m.o === o) return true;
        for (const j of SJ.BOARD[k].adj) if (!seen.has(j)) { seen.add(j); nx.push(j); }
      }
      q = nx;
    }
    return false;
  }

  SJ.lands = (s, p) => s.tiles.filter((t) => t.owner === p.id).length;

  SJ.heroStats = function (s, p) {
    const h = SJ.HEROES[p.hero];
    let atk = h.atk + (p.level - 1) * 1 + treasure(p, 'atk') + (p.atkBonus || 0);
    atk *= 1 + ownFx(s, p, 'heroAtk');
    const lit = pv(p, 'candleNear') && nearCandle(s, p.pos, p.id);
    atk *= 1 + pv(p, 'landAtk') * SJ.lands(s, p) + pv(p, 'atkPct') + (p.dashAtk || 0) + (lit ? 0.08 : 0);
    const def = (h.def || 0) + ownFx(s, p, 'heroDef') + stat(p, 'def') + (lit ? 0.08 : 0);
    if (p.status.weak) atk *= 0.7;
    if (p.bless) atk *= 1.5;
    const dodge = ownFx(s, p, 'heroDodge') + stat(p, 'dodge');
    const k0 = SJ.SKILLS[p.hero][0], base = p.sk[0] && k0.pr ? k0.pr[p.sk[0] - 1] : 0;
    const proc = base ? base + ownFx(s, p, 'heroProc') + treasure(p, 'proc') : 0;
    return { atk, def, dodge, proc, hp: p.hp, maxhp: p.maxhp };
  };

  function heroC(s, p) {
    const st = SJ.heroStats(s, p);
    const lampTile = s.tiles.findIndex((t) => t.owner === p.id && t.b && SJ.BUILDINGS[t.b].fx.soulLamp);
    return {
      kind: 'hero', pid: p.id, heroId: p.hero, name: SJ.HEROES[p.hero].name, hp: p.hp, maxhp: p.maxhp, atk: st.atk, def: st.def, dodge: st.dodge, proc: st.proc, crit: 0.1 + stat(p, 'crit'),
      fx: { thorns: stat(p, 'thorn') || undefined, lifesteal: stat(p, 'lifesteal') || undefined }, undying: hasBuff(p, 'undying'), poisonHit: hasBuff(p, 'venom'), twin: hasBuff(p, 'twin'), absorb: hasBuff(p, 'absorb'), stack: pv(p, 'stackHit'), hitBack: pv(p, 'hitBack'), nine: hasBuff(p, 'nine'), pctHit: p.hero === 'jingwei' && p.sk[0] ? (p.sk[3] ? 0.17 : 0.09) : 0, xtLow: p.hero === 'xingtian' ? pv(p, 'lowHp') : 0, xtRev: p.hero === 'xingtian' && p.sk[0] && p.cd[0] <= 0 ? 0.05 : 0,
      blind: p.status.blind ? 0.25 : 0, sealed: !!p.status.seal, lowHpAtk: ownFx(s, p, 'lowHpAtk'), lamp: lampTile >= 0 ? lampTile : null,
    };
  }

  SJ.tileMaxHp = (t) => { const b = SJ.bdef(t); return b ? SJ.BRANCHES[b.branch].hp * SJ.LEVEL_MUL[b.level] * SJ.TUNE.towerHp : 30; };

  function buildingC(s, i, foe) {
    const t = s.tiles[i], b = SJ.bdef(t);
    if (!b) return { kind: 'building', name: '空地基', hp: t.hp != null ? t.hp : 30, maxhp: 30, atk: 1, def: 0, fx: {}, tile: i };
    const base = SJ.BRANCHES[b.branch], mul = SJ.LEVEL_MUL[b.level];
    const fx = b.fx;
    let atk = base.atk * mul * SJ.TUNE.towerAtk * (1 + s.round * SJ.TUNE.towerGrow * (SJ.MAP.grow || 1)), def = 0;
    const adj = SJ.adjacent(i).filter((j) => s.tiles[j].owner === t.owner && s.tiles[j].b);
    if (fx.adjDef) def += fx.adjDef * adj.length;
    const op = s.players[t.owner]; if (op) atk *= 1 + pv(op, 'towerAtk');
    if (fx.adjAtk && adj.some((j) => SJ.BUILDINGS[s.tiles[j].b].branch === 'garrison')) atk *= 1 + fx.adjAtk;
    if (fx.atkDown && foe) foe.atk *= 1 - fx.atkDown;
    const maxhp = SJ.tileMaxHp(t), terr = SJ.BOARD[i].terrain;
    if (terr === 'ash') atk *= 1.3;
    return { kind: 'building', name: b.name, id: b.id, hp: t.hp != null ? t.hp : maxhp, maxhp, atk, def, dodge: (fx.dodge || 0) + (terr === 'forest' ? 0.15 : 0), crit: fx.crit || 0, fx, tile: i };
  }

  SJ.toll = function (s, i) {
    const t = s.tiles[i], b = SJ.bdef(t);
    let v = SJ.TOLL[SJ.tileLevel(t)];
    if (b && (b.branch === 'city' || b.branch === 'academy')) v *= 0.5;
    if (b && b.fx.tollMul) v *= b.fx.tollMul;
    const reg = SJ.BOARD[i].region;
    const all = s.tiles.every((x, j) => SJ.BOARD[j].type !== 'land' || SJ.BOARD[j].region !== reg || x.owner === t.owner);
    if (all) v *= 2;
    v *= 1 + s.round * SJ.TUNE.tollGrow * (SJ.MAP.grow || 1);
    const op = s.players[t.owner]; if (op) v *= 1 + treasure(op, 'tollUp');
    return Math.round(v);
  };

  SJ.price = (i) => SJ.REGIONS[SJ.BOARD[i].region].price;
  SJ.buildCost = (p, level) => Math.round(SJ.BUILD_COST[level] * (p.race === 'xuanyuan' ? 0.8 : 1) * Math.max(0, 1 - stat(p, 'buildCut')));

  SJ.cityIncome = function (s, i) {
    const t = s.tiles[i], b = SJ.bdef(t);
    if (!b || b.branch !== 'city' || t.stop > 0) return 0;
    let v = SJ.CITY_INCOME[b.level];
    if (b.fx.adjIncome) v += b.fx.adjIncome * SJ.adjacent(i).filter((j) => s.tiles[j].owner === t.owner && s.tiles[j].b).length;
    if (b.fx.incomeMul) v *= b.fx.incomeMul;
    if (SJ.BOARD[i].terrain === 'jade') v *= 2;
    if (SJ.BOARD[i].terrain === 'venture') v = Math.round(v * 1.5);
    return v;
  };

  function addStatus(s, p, k, n) {
    if (p.status.immune) return;
    p.status[k] = Math.max(p.status[k] || 0, n);
  }
  function heal(p, n) {
    if (p.status.noheal || !p.alive) return 0;
    const v = Math.min(n, p.maxhp - p.hp);
    p.hp += v;
    return v;
  }
  function gain(s, p, n) { p.gold += Math.round(n); }

  // 魔兽争霸的英雄经验表：升 2 级要 200，之后每级多 100，到 10 级共 5400
  SJ.xpNeed = (l) => (l + 1) * 100;
  function gainXp(s, p, n) {
    if (p.level >= SJ.TUNE.maxLevel) return false;
    p.xp += n * (1 + treasure(p, 'xpMul') + ownFx(s, p, 'xpMul'));
    let up = false;
    while (p.level < SJ.TUNE.maxLevel && p.xp >= SJ.xpNeed(p.level)) { p.xp -= SJ.xpNeed(p.level); p.level++; p.pts++; p.maxhp += 10; p.hp += 10; up = true; }
    if (p.level >= SJ.TUNE.maxLevel) p.xp = 0;
    return up;
  }

  // 技能：普通技能在英雄 1/3/5 级可升到 1/2/3 级，大招 6 级
  SJ.canLearn = (p, i) => {
    if (p.pts <= 0) return false;
    if (i === 3) return p.sk[3] === 0 && p.level >= 6;
    return p.sk[i] < 3 && p.level >= p.sk[i] * 2 + 1;
  };
  SJ.canCast = (p, i) => { const k = SJ.SKILLS[p.hero][i]; return k.kind !== 'passive' && p.sk[i] > 0 && p.cd[i] <= 0 && (!k.can || k.can(p)); };

  function addBuff(p, k, v, n) { p.buffs = p.buffs.filter((b) => b.k !== k); p.buffs.push({ k, v, n }); }

  function learn(p, i) {
    if (!SJ.canLearn(p, i)) return;
    const k = SJ.SKILLS[p.hero][i];
    const up = k.pv && k.pv.hpMax ? k.pv.hpMax[p.sk[i]] - (p.sk[i] ? k.pv.hpMax[p.sk[i] - 1] : 0) : 0;
    p.sk[i]++; p.pts--;
    if (up) { p.maxhp += up; p.hp += up; }
  }

  function equip(p, bagIdx) {
    const id = p.bag[bagIdx]; if (!id) return;
    const slot = p.items.indexOf(null); if (slot < 0) return;
    p.bag.splice(bagIdx, 1); p.items[slot] = id;
    const tr = itemOf(id); if (tr.hp) { p.maxhp += tr.hp; p.hp += tr.hp; }
  }
  function unequip(p, slot) {
    const id = p.items[slot]; if (!id || p.bag.length >= SJ.TUNE.bagSize) return;
    p.items[slot] = null; p.bag.push(id);
    const tr = itemOf(id); if (tr.hp) { p.maxhp -= tr.hp; p.hp = Math.max(1, Math.min(p.hp, p.maxhp)); }
  }

  async function cast(s, io, p, i) {
    if (!SJ.canCast(p, i)) return;
    const k = SJ.SKILLS[p.hero][i], lv = p.sk[i] - 1;
    p.cd[i] = Array.isArray(k.cd) ? k.cd[lv] : k.cd;
    await io.ev({ t: 'cast', pid: p.id, sk: k.id, name: k.name });
    const g = {
      buff: (key, v, n) => addBuff(p, key, v, n + 1), // 本回合也算，回合末减一
      heal: async (n) => { const v = heal(p, n); if (v) await io.ev({ t: 'heal', pid: p.id, n: v }); },
      gold: async (n) => { gain(s, p, n); await io.ev({ t: 'gold', pid: p.id, n, why: k.name }); },
      has: (key) => hasBuff(p, key),
      bleed: (f) => { p.hp = Math.max(1, Math.round(p.hp - p.maxhp * f)); }, // 献血按最大血算，不会献死
      vault: (v, n) => { p.vault = p.gold; p.gold = 0; addBuff(p, 'vault', v, n + 1); },
      turns: (n) => { p.bonusTurns = (p.bonusTurns || 0) + n; },
      pool: (n) => { const keep = Math.max(1, Math.round(p.maxhp * 0.2)); p.pool = Math.max(0, p.hp - keep); p.hp = keep; addBuff(p, 'pool', 1, n + 1); },
      cleanse: () => { for (const q of Object.keys(p.status)) if (q !== 'immune') delete p.status[q]; },
      dash: async (n, fly, o) => {
        o = o || {};
        const c = { n: 0 };
        p._dash = k.id; // 画面按技能放位移动画
        try { await move(s, io, p, n, false, fly, c); } finally { delete p._dash; }
        if (!p.alive || s.over) return;
        if (o.heal) { const v = heal(p, Math.round(p.maxhp * o.heal * c.n)); if (v) await io.ev({ t: 'heal', pid: p.id, n: v }); }
        if (o.bloodGold) {
          const lost = Math.min(p.hp - 1, Math.round(p.maxhp * o.bloodGold[0] * c.n)), money = o.bloodGold[1] * c.n;
          if (lost > 0) { p.hp -= lost; await io.ev({ t: 'hurt', pid: p.id, n: lost, why: k.name }); }
          if (money) { gain(s, p, money); await io.ev({ t: 'gold', pid: p.id, n: money, why: k.name }); }
        }
        if (o.turn) turnAround(s, p);
        if (o.candle) await placeCandle(s, io, p);
        if (o.atk) p.dashAtk = o.atk * c.n;
        await arrive(s, io, p); // 主动位移落地后和掷骰走到一样结算
        delete p.dashAtk;
      },
      summon: async (kind, n, v, o) => {
        o = o || {};
        if (o.one) for (let j = 0; j < s.tiles.length; j++) { const m = s.tiles[j].s; if (m && m.k === kind && m.o === p.id) { s.tiles[j].s = null; await io.ev({ t: 'tile', tile: j }); } }
        s.tiles[p.pos].s = { k: kind, o: p.id, n, v: v || 0, perm: !!o.perm };
        await io.ev({ t: 'tile', tile: p.pos });
      },
      behind: async (kind, n, turns) => { // 沿来路往回数 n 格，已有东西的格子不覆盖
        const perm = p.sk[3] > 0;
        let prev = p.pos, cur = p.from;
        for (let c = 0; c < n; c++) {
          if (!s.tiles[cur].s) { s.tiles[cur].s = { k: kind, o: p.id, n: turns, v: 0, perm }; await io.ev({ t: 'tile', tile: cur }); }
          const nx = SJ.BOARD[cur].adj.filter((x) => x !== prev);
          if (!nx.length) break;
          prev = cur; cur = nx[ri(s, nx.length)];
        }
      },
      candle: async () => { await placeCandle(s, io, p); },
      atkUp: (v) => { p.atkBonus = Math.round(((p.atkBonus || 0) + v) * 10) / 10; },
      reclaim: async () => {
        let n = 0;
        for (let j = 0; j < s.tiles.length; j++) { const m = s.tiles[j].s; if (m && m.k === 'candle' && m.o === p.id) { s.tiles[j].s = null; n++; await io.ev({ t: 'tile', tile: j }); } }
        const atk = Math.round(n * 2) / 10; p.maxhp += n * 2; p.hp += n * 2; p.atkBonus = (p.atkBonus || 0) + atk;
        await io.ev({ t: 'msg', kind: 'skill', text: `烛龙收回 ${n} 个【烛】，最大血 +${n * 2}${atk ? `，攻击 +${atk}` : ''}` });
      },
      elixir: async () => { // 不死药：花一半钱自己回血，别人付同样的钱给窫窳才能回血，付得起就必须付
        const fee = Math.floor(p.gold * 0.5); p.gold -= fee;
        await io.ev({ t: 'msg', kind: 'skill', text: `${p.name} 花 ${fee} 金炼成不死药` });
        const cure = async (q) => {
          const v = heal(q, Math.round(q.maxhp * 0.5)); if (v) await io.ev({ t: 'heal', pid: q.id, n: v });
          for (let j = 0; j < s.tiles.length; j++) { const t = s.tiles[j]; if (t.owner !== q.id || t.hp == null) continue; const m = SJ.tileMaxHp(t); t.hp += m * 0.5; if (t.hp >= m) t.hp = null; await io.ev({ t: 'tile', tile: j }); }
        };
        await cure(p);
        for (const q of alive(s)) { // 付不起的交出自己一半的钱，但不回血
          if (q === p) continue;
          const can = q.gold >= fee, v = can ? fee : Math.floor(q.gold * 0.5);
          q.gold -= v; gain(s, p, v); if (v) await io.ev({ t: 'toll', pid: q.id, to: p.id, n: v });
          if (can) await cure(q);
        }
      },
      healAll: async (f, own) => {
        for (const q of alive(s)) { const v = heal(q, Math.round(q.maxhp * (q === p ? own : f))); if (v) await io.ev({ t: 'heal', pid: q.id, n: v }); }
        for (let j = 0; j < s.tiles.length; j++) { const t = s.tiles[j]; if (t.hp == null) continue; const m = SJ.tileMaxHp(t); t.hp += m * (t.owner === p.id ? own : f); if (t.hp >= m) t.hp = null; await io.ev({ t: 'tile', tile: j }); }
      },
      repairAll: async (cost) => {
        for (let j = 0; j < s.tiles.length; j++) {
          const t = s.tiles[j];
          if (t.owner !== p.id || t.hp == null) continue;
          const c = cost ? Math.max(1, Math.round(p.maxhp * cost)) : 0;
          if (c && p.hp <= c) break; // 血不够就停
          t.hp = null; p.hp -= c;
          await io.ev({ t: 'tile', tile: j });
        }
      },
      stopEnemyCities: (n, take) => { s.tiles.forEach((t) => { if (t.owner != null && t.owner !== p.id && t.b && SJ.BUILDINGS[t.b].branch === 'city') { t.stop = n; t.stopTo = take ? p.id : null; } }); },
      foes: (st, n) => { alive(s).forEach((q) => { if (q !== p) addStatus(s, q, st, n); }); },
      claimLand: async (n) => { // 九尾天狐：随机拿 n 块无主领地，各自动建一座 1 级建筑；没有无主地了就升级自家建筑
        const c = s.tiles.map((t, i) => i).filter((i) => SJ.BOARD[i].type === 'land' && s.tiles[i].owner == null);
        for (let k = 0; k < n; k++) {
          if (c.length) { const i = c.splice(ri(s, c.length), 1)[0]; s.tiles[i].owner = p.id; await io.ev({ t: 'tile', tile: i }); await autoBuild(s, io, p, i); } else await freeUpgrade(s, io, p);
        }
      },
      goodCards: async (n) => { for (let c = 0; c < n && p.alive && !s.over; c++) await playCard(s, io, p, drawCard(s, 'good')); },
    };
    // 效果按写的顺序一个个跑完
    const queue = [];
    for (const name of ['heal', 'gold', 'dash', 'summon', 'behind', 'candle', 'reclaim', 'healAll', 'elixir', 'repairAll', 'goodCards', 'claimLand']) { const f = g[name]; g[name] = (...x) => { queue.push(() => f(...x)); }; }
    k.go(g, lv);
    for (const f of queue) { if (p.alive && !s.over) await f(); }
    if (p.alive && !s.over) await io.ev({ t: 'casted', pid: p.id, sk: k.id }); // 效果已经生效，画面可以换造型了
  }

  // 掷骰前的英雄操作
  async function heroAction(s, io, p, a) {
    if (a.a === 'learn') learn(p, a.i);
    else if (a.a === 'cast') await cast(s, io, p, a.i);
    else if (a.a === 'equip') equip(p, a.i);
    else if (a.a === 'unequip') unequip(p, a.i);
    else if (a.a === 'sell') { const id = p.bag.splice(a.i, 1)[0]; if (id) gain(s, p, [0, 60, 150, 300][itemOf(id).tier]); }
  }

  async function eliminate(s, io, p, killer, why) {
    if (!p.alive) return;
    if (hasBuff(p, 'revive')) {
      const rv = p.buffs.find((b) => b.k === 'revive'); p.buffs = p.buffs.filter((b) => b !== rv); p.hp = Math.max(1, Math.round(p.maxhp * rv.v));
      await io.ev({ t: 'msg', kind: 'skill', text: `${p.name} 还魂了` });
      return;
    }
    if (p.hero === 'yayu' && p.sk[1]) { // 窫窳还魂：第一次拿 1 座自家建筑换命，之后每复活一次永久多 5/4/3 座，不够数就死；被毁的建筑还能死而复生
      const own = s.tiles.map((t, i) => i).filter((i) => s.tiles[i].owner === p.id && s.tiles[i].b);
      const n = p.revCost || 1;
      if (own.length >= n) {
        const proc = SJ.heroStats(s, p).proc;
        let lost = 0, back = 0;
        for (let k = 0; k < n; k++) {
          const i = own.splice(ri(s, own.length), 1)[0], t = s.tiles[i];
          if (p.sk[0] && rnd(s) < proc) { t.hp = null; back++; } else { Object.assign(t, { owner: null, b: null, hp: null, stop: 0 }); lost++; }
          await io.ev({ t: 'tile', tile: i, fire: true });
        }
        p.hp = Math.max(1, Math.round(p.maxhp * 0.25)); p.atkBonus = (p.atkBonus || 0) + 5; p.revCost = n + SJ.SKILLS.yayu[1].sacUp[p.sk[1] - 1];
        await io.ev({ t: 'msg', kind: 'skill', text: `${p.name} 还魂了，攻击永久 +5，毁掉 ${lost} 座自家建筑${back ? `，${back} 座死而复生` : ''}；下次要 ${p.revCost} 座` });
        return;
      }
    }
    p.alive = false; p.hp = 0;
    p.rank = alive(s).length + 1;
    s.tiles.forEach((t) => { if (t.owner === p.id) { t.owner = null; t.b = null; t.stop = 0; t.hp = null; } if (t.s && t.s.o === p.id) t.s = null; });
    if (killer && killer.alive) { const v = Math.floor(p.gold / 2); gain(s, killer, v); }
    p.gold = 0;
    for (const q of alive(s)) { const v = ownFx(s, q, 'deathGold'); if (v) gain(s, q, v); }
    await io.ev({ t: 'death', pid: p.id, why });
    const left = alive(s);
    if (left.length <= 1) { s.over = true; s.winner = left.length ? left[0].id : null; if (left[0]) left[0].rank = 1; }
  }

  SJ._eliminate = eliminate; SJ._playCard = playCard; // 测试用

  async function hurtPlain(s, io, p, n, why) {
    if (hasBuff(p, 'absorb')) { p.store = (p.store || 0) + n; return; }
    p.hp -= n;
    await io.ev({ t: 'hurt', pid: p.id, n, why });
    if (p.hp <= 0) await eliminate(s, io, p, null, why);
  }

  // 建筑被毁的连带效果。返回 true 表示建筑重生，地不易手
  async function onDestroyed(s, io, i, by) {
    const t = s.tiles[i], b = SJ.bdef(t), owner = s.players[t.owner];
    if (!b) return false;
    for (const q of alive(s)) { const v = ownFx(s, q, 'deathGold'); if (v) gain(s, q, v); }
    if (owner.race === 'youdu') { addStatus(s, by, 'curse', 2); await io.ev({ t: 'msg', text: `${by.name} 被幽都诅咒了` }); }
    if (owner.alive && owner.hero === 'yayu' && owner.sk[0] && rnd(s) < SJ.heroStats(s, owner).proc) {
      t.hp = null;
      await io.ev({ t: 'msg', kind: 'skill', text: `窫窳：${b.name} 死而复生！` });
      return true;
    }
    if (b.fx.respawn) {
      t.b = `${b.race}_${b.branch}_2`; t.hp = null;
      await io.ev({ t: 'msg', kind: 'skill', text: `${b.name} 倒下后又站了起来` });
      return true;
    }
    return false;
  }

  function applyFxStatus(s, p, fx) { if (fx.status) addStatus(s, p, fx.status, fx.turns || 1); }

  async function winRewards(s, io, p, xp) {
    let bonus = ownFx(s, p, 'winBonus') + (p.race === 'jiuli' ? 50 : 0);
    if (bonus) gain(s, p, bonus);
    const h = ownFx(s, p, 'winHeal') + pv(p, 'winHeal');
    if (h) heal(p, h);
    if (gainXp(s, p, xp)) await io.ev({ t: 'levelup', pid: p.id, level: p.level });
    if (bonus) await io.ev({ t: 'gold', pid: p.id, n: bonus });
  }

  async function placeCandle(s, io, p) {
    const t = s.tiles[p.pos];
    if (t.s) return;
    t.s = { k: 'candle', o: p.id, n: 0, v: 0, perm: true };
    await io.ev({ t: 'tile', tile: p.pos });
  }

  // 每场战斗之后：记下猛志吸收的伤害
  async function afterFight(s, io, p, absorbed) {
    if (absorbed) p.store = (p.store || 0) + absorbed;
  }

  function turnAround(s, p) {
    const f = SJ.BOARD[p.pos].adj.filter((x) => x !== p.from);
    if (f.length) p.from = f[ri(s, f.length)];
  }

  async function useLamp(s, io, p, tile) {
    const t = s.tiles[tile];
    Object.assign(t, { owner: null, b: null, hp: null, stop: 0 });
    await io.ev({ t: 'tile', tile });
    await io.ev({ t: 'msg', kind: 'skill', text: `${p.name} 的魂灯灭了` });
  }

  // 刑天断首再战复活后进冷却，冷却每用一次永久加长
  function headCd(p, saved) {
    if (!saved || p.hero !== 'xingtian') return;
    const k = SJ.SKILLS.xingtian[0], len = p.xtCd || k.cd;
    p.cd[0] = len; p.xtCd = len + k.cdUp[p.sk[0] - 1];
  }

  async function attackTile(s, io, p, i, toll, forced) {
    const t = s.tiles[i], owner = s.players[t.owner], lv = Math.max(1, SJ.tileLevel(t));
    const A = heroC(s, p), D = buildingC(s, i, A);
    p.bless = 0;
    s.stats.fights++;
    if (D.fx.status) applyFxStatus(s, p, D.fx);
    const res = SJ.fight(A, D, s.rng);
    p.hp = Math.min(p.maxhp, Math.round(res.aHp));
    await io.ev({ t: 'battle', kind: 'tile', a: A, d: D, res, tile: i, forced, pid: p.id });
    await afterFight(s, io, p, res.aAbs);
    if (res.lampUsed) await useLamp(s, io, p, A.lamp);
    headCd(p, res.aSaved);
    // 塔主人也拿经验，后期靠收租的英雄才升得动级：守住 2×，被拆 1×（按塔等级），打死来犯的英雄 6×（按对方等级）
    const guard = async (n) => { if (owner.alive && gainXp(s, owner, n)) await io.ev({ t: 'levelup', pid: owner.id, level: owner.level }); };
    if (p.hp <= 0) { await guard(6 * SJ.TUNE.fightXp * p.level); await eliminate(s, io, p, owner, `死在${D.name}前`); if (!p.alive) return; }
    t.hp = Math.max(0, Math.round(res.dHp));
    await guard((res.winner === 'a' ? 1 : 2) * SJ.TUNE.fightXp * lv);
    if (res.winner === 'a') {
      s.stats.fightsWon++;
      let stay = false;
      if (res.charmed) {
        t.owner = p.id; t.hp = null;
        await io.ev({ t: 'msg', kind: 'skill', text: `${D.name} 归降了 ${p.name}` });
      } else {
        stay = await onDestroyed(s, io, i, p);
        if (!stay) { t.owner = p.id; t.b = null; t.stop = 0; t.hp = null; await io.ev({ t: 'msg', text: `${p.name} 拆掉了 ${D.name}，夺下这块地` }); }
      }
      await io.ev({ t: 'tile', tile: i });
      await autoBuild(s, io, p, i);
      await winRewards(s, io, p, 5 * SJ.TUNE.fightXp * lv);
    } else {
      // 三下打完没拆掉：双方血量留着，半价过路
      if (gainXp(s, p, 2 * SJ.TUNE.fightXp * lv)) await io.ev({ t: 'levelup', pid: p.id, level: p.level });
      const fx = D.fx;
      await io.ev({ t: 'tile', tile: i });
      await payOrBleed(s, io, p, owner, Math.round(toll * 0.5 * (fx.loseMul || 1)), true);
      if (!p.alive) return;
      if (fx.failSkip) { addStatus(s, p, 'skip', fx.failSkip); }
      if (fx.loseTeleport) { await teleport(s, io, p, ri(s, N())); }
    }
  }

  // 英雄比试：打到一方倒下，但血量不结算，不算战斗、没有经验。赢家拿走输家一部分金币，按等级差：
  // 同级 50%，低 9 级的赢了拿 90%，高 9 级的赢了只拿 10%
  SJ.sparCut = (wLv, lLv) => Math.max(0.1, Math.min(0.9, 0.5 + (lLv - wLv) * 0.4 / 9));
  const sparC = (s, p) => Object.assign(heroC(s, p), { lamp: null, xtRev: 0, absorb: false, toDeath: true });
  async function spar(s, io, p, q) {
    s.stats.duels++; // 碰上就必须比，不再询问
    await io.ev({ t: 'msg', text: `${p.name} 撞上 ${q.name}，比试一场` });
    const A = sparC(s, p), D = sparC(s, q);
    const res = SJ.fight(A, D, s.rng);
    await io.ev({ t: 'battle', kind: 'duel', a: A, d: D, res, pid: p.id, qid: q.id });
    if (res.winner === 'draw') return;
    const w = res.winner === 'a' ? p : q, l = res.winner === 'a' ? q : p;
    const v = Math.floor(l.gold * SJ.sparCut(w.level, l.level));
    if (v > 0) { l.gold -= v; gain(s, w, v); await io.ev({ t: 'toll', pid: l.id, to: w.id, n: v }); }
  }

  async function nest(s, io, p) {
    const t = s.tiles[p.pos];
    if (!t.m) { // 这窝没人打过，新刷一只；血量记在格子上，谁都能接着打
      const k = Math.min(3, Math.floor((p.level - 1) / 2 + rnd(s) * 2));
      t.m = { k, sc: 1 + s.round * 0.03, hp: null };
    }
    const m = SJ.MONSTERS[t.m.k], sc = t.m.sc, maxhp = m.hp * sc;
    const foe = () => ({ kind: 'monster', name: m.name, id: m.id, hp: t.m.hp != null ? t.m.hp : maxhp, maxhp, atk: m.atk * sc, def: 0, fx: {}, toDeath: true });
    const go = await io.ask('nest', { p, m, scale: sc, foe: foe() });
    if (!go) { // 绕开也要挨一下
      const v = Math.max(1, Math.round(m.atk * sc * (1 - Math.min(0.8, SJ.heroStats(s, p).def || 0))));
      await io.ev({ t: 'msg', text: `${p.name} 绕开时被${m.name}咬了一口` });
      await hurtPlain(s, io, p, v, `被${m.name}吃了`);
      return;
    }
    const A = heroC(s, p), D = foe();
    p.bless = 0;
    const res = SJ.fight(A, D, s.rng);
    p.hp = Math.min(p.maxhp, Math.round(res.aHp));
    await io.ev({ t: 'battle', kind: 'nest', a: A, d: D, res, pid: p.id });
    await afterFight(s, io, p, res.aAbs);
    if (res.lampUsed) await useLamp(s, io, p, A.lamp);
    headCd(p, res.aSaved);
    if (p.hp <= 0) { await eliminate(s, io, p, null, `被${m.name}吃了`); if (!p.alive) return; }
    if (res.winner === 'a') {
      const t0k = t.m.k; t.m = null;
      gain(s, p, m.gold);
      await io.ev({ t: 'gold', pid: p.id, n: m.gold });
      if (rnd(s) < 0.35 + t0k * 0.1) await giveTreasure(s, io, p, t0k >= 3 && rnd(s) < 0.35 ? 3 : t0k >= 2 ? 2 : 1);
      await winRewards(s, io, p, m.xp * 2 * SJ.TUNE.fightXp);
    } else { t.m.hp = Math.max(1, Math.round(res.dHp)); if (gainXp(s, p, 2 * SJ.TUNE.fightXp)) await io.ev({ t: 'levelup', pid: p.id, level: p.level }); }
  }

  // 付钱。付不起的部分按比例扣血，破产也能死人
  async function payOrBleed(s, io, p, to, n, lost) {
    const pay = Math.min(p.gold, n), debt = n - pay;
    p.gold -= pay; gain(s, to, pay);
    await io.ev({ t: 'toll', pid: p.id, to: to.id, n: pay, lost });
    if (debt > 0) await hurtPlain(s, io, p, Math.max(1, Math.round(debt * SJ.TUNE.debtHp)), '欠债被追杀');
  }

  // 得到一件指定阶的宝物。有空栏直接装上，否则进包袱，包袱满了换成钱
  // 宝物按轮数解锁：大图 30 轮前只出 1 阶，60 轮前最多 2 阶；中小图按地图的 tierAt 提前
  SJ.maxTier = (s) => { const at = SJ.MAP.tierAt || [30, 60]; return s.round < at[0] ? 1 : s.round < at[1] ? 2 : 3; };
  async function giveTreasure(s, io, p, tier, id) {
    if (!id) tier = Math.min(tier, SJ.maxTier(s));
    const own = (x) => p.items.includes(x.id) || p.bag.includes(x.id);
    const pool = SJ.TREASURES.filter((x) => x.tier === tier && !own(x));
    if (!pool.length && !id) { gain(s, p, [0, 60, 150, 300][tier]); await io.ev({ t: 'gold', pid: p.id, n: [0, 60, 150, 300][tier], why: '宝物换钱' }); return false; }
    const tr = id ? itemOf(id) : pool[ri(s, pool.length)];
    if (p.bag.length >= SJ.TUNE.bagSize && !p.items.includes(null)) { gain(s, p, [0, 60, 150, 300][tr.tier]); await io.ev({ t: 'gold', pid: p.id, n: [0, 60, 150, 300][tr.tier], why: '包袱满了' }); return false; }
    p.bag.push(tr.id);
    if (p.items.includes(null)) equip(p, p.bag.length - 1);
    await io.ev({ t: 'treasure', pid: p.id, id: tr.id });
    return true;
  }

  async function teleport(s, io, p, i) {
    p.pos = i; p.from = SJ.BOARD[i].adj[ri(s, SJ.BOARD[i].adj.length)];
    await io.ev({ t: 'jump', pid: p.id, pos: i });
  }

  async function freeUpgrade(s, io, p) {
    const c = s.tiles.map((t, i) => i).filter((i) => s.tiles[i].owner === p.id && s.tiles[i].b && SJ.tileLevel(s.tiles[i]) < 3);
    if (!c.length) return;
    await upgradeTile(s, io, p, c[ri(s, c.length)]);
  }

  const lv3 = (b) => ['a', 'b', 'c'].map((x) => `${b.race}_${b.branch}_3${x}`).filter((id) => SJ.BUILDINGS[id]);

  async function upgradeTile(s, io, p, i) {
    const b = SJ.bdef(s.tiles[i]);
    const ids = lv3(b);
    s.tiles[i].b = b.level === 1 ? `${b.race}_${b.branch}_2` : ids[ri(s, ids.length)];
    s.tiles[i].hp = null;
    await io.ev({ t: 'tile', tile: i, built: true, pid: p.id });
  }

  async function downgrade(s, i) {
    const t = s.tiles[i], b = SJ.bdef(t);
    if (!b) return;
    if (b.level === 1) Object.assign(t, { owner: null, b: null, stop: 0 }); // 建筑没了，地变回无主
    else t.b = `${b.race}_${b.branch}_${b.level - 1 === 1 ? 1 : 2}`;
    t.hp = null;
  }

  async function playCard(s, io0, p, card) {
    s.stats.cards++;
    await io0.ev({ t: 'card', card, pid: p.id });
    const io = { ask: io0.ask, ev: (e) => io0.ev(e.t === 'tile' ? Object.assign({ look: card.kind }, e) : e) }; // 卡改到的格子，镜头要跟过去
    const A = alive(s);
    switch (card.id) {
      case 'dangkang': s.harvest = A.length; break;
      case 'fenghuang': A.forEach((q) => heal(q, 30)); s.peace = A.length; break;
      case 'luanniao': gain(s, p, 200); break;
      case 'wenyao': A.forEach((q) => gain(s, q, 100)); break;
      case 'chenghuang': p.maxhp += 20; heal(p, 20); break;
      case 'ershu': for (const k of Object.keys(p.status)) if (k !== 'immune') delete p.status[k]; heal(p, 25); break;
      case 'starc': if (gainXp(s, p, SJ.xpNeed(p.level))) await io.ev({ t: 'levelup', pid: p.id, level: p.level }); break;
      case 'xingxing': s.extra++; break;
      case 'dijiang': await freeUpgrade(s, io, p); break;
      case 'lushu': {
        const c = s.tiles.map((t, i) => i).filter((i) => SJ.BOARD[i].type === 'land' && s.tiles[i].owner == null);
        if (c.length) { const i = c[ri(s, c.length)]; s.tiles[i].owner = p.id; await io.ev({ t: 'tile', tile: i }); await autoBuild(s, io, p, i); }
        break;
      }
      case 'qinggeng': p.status.immune = 3; break;
      case 'bifang': {
        const c = s.tiles.map((t, i) => i).filter((i) => s.tiles[i].b);
        for (let k = 0; k < 2 && c.length; k++) { const i = c.splice(ri(s, c.length), 1)[0]; Object.assign(s.tiles[i], { owner: null, b: null, hp: null, stop: 0 }); await io.ev({ t: 'tile', tile: i, fire: true }); }
        break;
      }
      case 'feiyi': s.drought = A.length; break;
      case 'zhuyan': s.forced = A.map((q) => q.id); break;
      case 'taotie': p.gold = Math.floor(p.gold / 2); break;
      case 'kui': await hurtPlain(s, io, p, 20, '被雷劈死'); break;
      case 'huashe': {
        const r = ri(s, SJ.REGIONS.length);
        for (let i = 0; i < N(); i++) if (SJ.BOARD[i].region === r && s.tiles[i].b) { await downgrade(s, i); await io.ev({ t: 'tile', tile: i }); }
        await io.ev({ t: 'msg', text: `大水淹了${SJ.REGIONS[r].name}` });
        break;
      }
      case 'qiongqi': {
        const v = Math.min(100, p.gold); p.gold -= v;
        const rich = A.filter((q) => q !== p).sort((x, y) => y.gold - x.gold)[0];
        if (rich) gain(s, rich, v);
        break;
      }
      case 'zhu': await teleport(s, io, p, SJ.MAP.exile); addStatus(s, p, 'skip', 1); break;
      case 'qizhong': for (const q of A) await hurtPlain(s, io, q, 15, '死于大疫'); break;
      case 'mingshe': addStatus(s, p, 'poison', 3); break;
    }
  }

  function drawCard(s, kind) {
    const pool = kind ? SJ.CARDS.filter((c) => c.kind === kind) : SJ.CARDS;
    return pool[ri(s, pool.length)];
  }

  async function landOn(s, io, p, depth) {
    const i = p.pos, tile = SJ.BOARD[i], t = s.tiles[i];
    if (hasBuff(p, 'soar')) { // 展翅：学了大招后只略过敌方的格子
      if (!p.sk[3] || (t.owner != null && t.owner !== p.id)) return;
    }
    if (tile.type === 'corner') { await landmark(s, io, p, tile.corner, depth); return; }
    // 地形的停下效果只在普通地块上触发；抽卡、异兽、驿站、宝铺、传送门这些功能格只结算功能，不会先被浪卷走
    if ((tile.type === 'land' || tile.type === 'wild') && await stopTerrain(s, io, p, tile, depth)) return;
    if (tile.type === 'wild') return;
    if (tile.type === 'post') { gain(s, p, SJ.TUNE.salary); heal(p, 15); await io.ev({ t: 'gold', pid: p.id, n: SJ.TUNE.salary, why: '驿站' }); return; }
    if (tile.type === 'portal') { await io.ev({ t: 'msg', text: `${p.name} 钻进了传送门` }); await teleport(s, io, p, tile.to); return; }
    if (tile.type === 'shop') {
      if (p.gold < SJ.TUNE.shopPrice) return;
      const pool = SJ.TREASURES.filter((x) => x.tier === 1 && !p.items.includes(x.id) && !p.bag.includes(x.id));
      if (!pool.length) return;
      const item = pool[ri(s, pool.length)];
      if (await io.ask('shop', { p, item, price: SJ.TUNE.shopPrice })) { p.gold -= SJ.TUNE.shopPrice; await giveTreasure(s, io, p, 1, item.id); }
      return;
    }
    if (tile.type === 'event') {
      const n = ownFx(s, p, 'cardPeek') ? 2 : 1;
      let card = drawCard(s);
      if (n === 2) { let c2 = drawCard(s); while (c2.id === card.id) c2 = drawCard(s); card = await io.ask('card', { p, cards: [card, c2] }); }
      await playCard(s, io, p, card);
      return;
    }
    if (tile.type === 'nest') { await nest(s, io, p); return; }
    // 领地
    if (t.owner == null) {
      const price = SJ.price(i);
      if (p.gold >= price && await io.ask('buy', { p, tile: i, price })) {
        p.gold -= price; t.owner = p.id;
        await io.ev({ t: 'tile', tile: i, buy: true, pid: p.id });
        await autoBuild(s, io, p, i, true);
      }
      return;
    }
    if (t.owner === p.id) {
      if (t.hp != null) { t.hp = null; await io.ev({ t: 'tile', tile: i }); await io.ev({ t: 'msg', text: `${p.name} 修好了这里的建筑` }); }
      await buildHere(s, io, p, i);
      const bd = SJ.bdef(t);
      if (bd && bd.level === 3 && bd.branch === 'city' && p.gold >= SJ.TUNE.shop2Price && SJ.maxTier(s) >= 2) {
        const pool = SJ.TREASURES.filter((x) => x.tier === 2 && !p.items.includes(x.id) && !p.bag.includes(x.id));
        if (pool.length) { const item = pool[ri(s, pool.length)]; if (await io.ask('shop', { p, item, price: SJ.TUNE.shop2Price, city: bd.name })) { p.gold -= SJ.TUNE.shop2Price; await giveTreasure(s, io, p, 2, item.id); } }
      }
      return;
    }
    const owner = s.players[t.owner];
    const lit = pv(p, 'candleToll') && nearCandle(s, i, p.id) ? pv(p, 'candleToll') : 0;
    const toll = Math.round(SJ.toll(s, i) * Math.max(0, 1 - pv(p, 'tollCut') - lit));
    if (s.peace > 0) {
      await payOrBleed(s, io, p, owner, toll);
      return;
    }
    const mustFight = p.gold < toll || s.forced.includes(p.id);
    s.forced = s.forced.filter((x) => x !== p.id);
    let fight = mustFight;
    if (!mustFight) fight = await io.ask('tollOrFight', { p, tile: i, toll, A: heroC(s, p), D: buildingC(s, i, null) });
    if (fight) await attackTile(s, io, p, i, toll, mustFight);
    else { p.gold -= toll; gain(s, owner, toll); s.stats.tolls++; await io.ev({ t: 'toll', pid: p.id, to: owner.id, n: toll }); }
  }

  const useBuild = (p) => { p.buffs = p.buffs.filter((b) => b.k !== 'buildCut'); };

  // 拿到地就免费随机建一座 1 级建筑
  // 买下的地自己挑分支，打下来、抽卡得到、地基重建的随机
  async function autoBuild(s, io, p, i, pick) {
    const t = s.tiles[i]; if (t.b || t.owner !== p.id) return;
    const br = Object.keys(SJ.BRANCHES);
    let k = pick ? await io.ask('build', { p, tile: i, cost: 0 }) : null;
    if (!br.includes(k)) k = br[ri(s, br.length)];
    t.b = `${p.race}_${k}_1`; t.hp = null;
    await io.ev({ t: 'tile', tile: i, built: true, pid: p.id });
  }
  SJ._autoBuild = autoBuild; // 测试用

  async function buildHere(s, io, p, i) {
    const t = s.tiles[i], b = SJ.bdef(t);
    if (!b) { await autoBuild(s, io, p, i); return; }
    if (b.level === 1) {
      const cost = SJ.buildCost(p, 2);
      if (p.gold < cost) return;
      const id = `${b.race}_${b.branch}_2`;
      if (!await io.ask('upgrade', { p, tile: i, cost, options: [id] })) return;
      p.gold -= cost; t.b = id; t.hp = null; useBuild(p);
    } else if (b.level === 2) {
      const cost = SJ.buildCost(p, 3);
      if (p.gold < cost) return;
      const ids = lv3(b);
      const id = await io.ask('fork', { p, tile: i, cost, options: ids });
      if (!id) return;
      p.gold -= cost; t.b = id; t.hp = null; useBuild(p);
    } else return;
    await io.ev({ t: 'tile', tile: i, built: true, pid: p.id });
  }

  // 路过的效果。last 为 true 时最后一格算停下，不算路过
  async function passOver(s, io, p, path) {
    let hp = 0, dmg = 0, money = 0, poison = false;
    for (const i of path) {
      const t = SJ.BOARD[i];
      if (t.type === 'post') money += SJ.TUNE.salary;
      if (t.terrain === 'water') hp += 4;
      if (t.terrain === 'swamp') poison = true;
      if (t.terrain === 'lava') dmg += 1;
      if (t.terrain === 'ink') { money += 15; dmg += 2; }
    }
    if (money) { gain(s, p, money); await io.ev({ t: 'gold', pid: p.id, n: money, why: '路上' }); }
    if (hp) { const v = heal(p, hp); if (v) await io.ev({ t: 'heal', pid: p.id, n: v }); }
    if (poison) addStatus(s, p, 'poison', 2);
    if (dmg) await hurtPlain(s, io, p, dmg, '死在半路');
    const scorch = pv(p, 'scorch');
    for (const i of path) {
      if (!p.alive || s.over) break;
      const t = s.tiles[i];
      if (scorch && t.owner != null && t.owner !== p.id && t.b) { const m = SJ.tileMaxHp(t); t.hp = Math.max(1, (t.hp != null ? t.hp : m) - scorch); await io.ev({ t: 'tile', tile: i }); }
      if (hasBuff(p, 'autoUp') && t.owner === p.id && t.b && SJ.tileLevel(t) === 1) await upgradeTile(s, io, p, i);
    }
  }

  // 沿路走。岔路随机选方向。c.n 记走了多少格
  async function move(s, io, p, steps, back, fly, c) {
    fly = fly || hasBuff(p, 'fly') || hasBuff(p, 'soar');
    const dry = p._dash === 'benpao'; // 逐日只管跑：路上的宝箱、英雄、召唤物、驿站和地形都不生效
    delete p._met;
    if (back) turnAround(s, p);
    let left = steps, seg = [];
    const flush = async (last) => {
      if (!seg.length) return;
      const path = seg; seg = [];
      await io.ev({ t: 'move', pid: p.id, path, dash: p._dash, fly: !!fly });
      if (!dry) await passOver(s, io, p, last ? path.slice(0, -1) : path);
      if (p.alive && p.level < SJ.TUNE.walkXpLevel && gainXp(s, p, path.length * SJ.TUNE.walkXp)) await io.ev({ t: 'levelup', pid: p.id, level: p.level }); // 5 级前走一格 1 经验
      if (p.alive && hasBuff(p, 'trail')) for (const i of path) if (!s.tiles[i].s) { s.tiles[i].s = { k: 'fire', o: p.id, n: 3, v: 2 }; await io.ev({ t: 'tile', tile: i }); }
      if (p.alive && p._burn) { const v = p._burn; delete p._burn; await hurtPlain(s, io, p, v, '死在火焰里'); }
    };
    while (left > 0 && p.alive && !s.over) {
      let opts = SJ.BOARD[p.pos].adj.filter((x) => x !== p.from);
      if (!opts.length) opts = [p.from]; // 死路掉头
      const nx = opts[ri(s, opts.length)];
      p.from = p.pos; p.pos = nx; seg.push(nx);
      if (c) c.n++;
      left -= fly ? 1 : SJ.TERRAIN[SJ.BOARD[nx].terrain].cost || 1;
      const tt = s.tiles[nx];
      if (tt.chest && !dry) { tt.chest = 0; await flush(false); if (!p.alive || s.over) return; await io.ev({ t: 'tile', tile: nx }); await io.ev({ t: 'msg', kind: 'skill', text: `${p.name} 捡到天降宝箱！` }); await giveTreasure(s, io, p, rnd(s) < 0.6 ? 3 : 2); }
      if (left > 0 && !fly && !dry && s.peace <= 0 && SJ.BOARD[nx].type !== 'corner') { // 路过别的英雄也可以比试，一次移动里同一个人只比一次
        const q = s.players.find((x) => x.alive && x !== p && x.pos === nx && !(p._met || []).includes(x.id));
        if (q) { await flush(false); if (!p.alive || s.over) return; (p._met = p._met || []).push(q.id); await spar(s, io, p, q); if (!p.alive || s.over) return; }
      }
      if (!tt.s || fly || dry) continue;
      const sm = SJ.SUMMONS[tt.s.k], mine = tt.s.o === p.id;
      if (mine) { if (sm.grove) { const v = heal(p, 30); if (v) await io.ev({ t: 'heal', pid: p.id, n: v }); } continue; }
      if (sm.trail) p._burn = (p._burn || 0) + tt.s.v;
      if (sm.status) { addStatus(s, p, sm.status, sm.turns || 2); if (sm.status === 'leech') p.leechBy = tt.s.o; }
      if (sm.candle) {
        if (left > 0) continue; // 路过不算，停在上面才传送
        const ow = s.players[tt.s.o]; if (!ow || !ow.sk[2]) continue; // 传送是衔烛夜行给【烛】的特点
        const others = s.tiles.map((t, i) => i).filter((i) => i !== nx && s.tiles[i].s && s.tiles[i].s.k === 'candle' && s.tiles[i].s.o === tt.s.o);
        if (!others.length) continue;
        await flush(true);
        if (!p.alive || s.over) return;
        const j = others[ri(s, others.length)];
        tt.s = null; s.tiles[j].s = null;
        await io.ev({ t: 'tile', tile: nx }); await io.ev({ t: 'tile', tile: j });
        await io.ev({ t: 'msg', text: `${p.name} 被【烛】传走了` });
        await teleport(s, io, p, j);
        const hv = pv(ow, 'candleHurt'); if (hv) await hurtPlain(s, io, p, hv, '烛火');
        return;
      }
      if (sm.stop) {
        await flush(true);
        if (!p.alive || s.over) return;
        await io.ev({ t: 'msg', text: `${p.name} 被${sm.name}拦下了` });
        if (sm.hit && tt.s.v) {
          const own = s.players[tt.s.o], v = tt.s.v;
          await hurtPlain(s, io, p, v, `死在${sm.name}前`);
          if (own.alive) { const h = heal(own, v); if (h) await io.ev({ t: 'heal', pid: own.id, n: h }); }
        }
        if (sm.warp) p._warp = 1;
        if (sm.hit || tt.s.k === 'stones') { tt.s = null; await io.ev({ t: 'tile', tile: nx }); }
        return;
      }
    }
    if (p.alive && !s.over) await flush(true);
  }

  // 停在特殊地形上。返回 true 表示这一步已经结束
  async function stopTerrain(s, io, p, tile, depth) {
    const say = (text) => io.ev({ t: 'msg', text });
    switch (tile.terrain) {
      case 'petal': { const v = heal(p, 10); if (v) await io.ev({ t: 'heal', pid: p.id, n: v }); break; }
      case 'sand': if (rnd(s) < 0.25) { addStatus(s, p, 'skip', 1); await say(`${p.name} 陷进流沙`); } break;
      case 'jade': gain(s, p, 30); await io.ev({ t: 'gold', pid: p.id, n: 30, why: '玉田' }); break;
      case 'reef': { const v = 20 + ri(s, 41); gain(s, p, v); await io.ev({ t: 'gold', pid: p.id, n: v, why: '浅滩' }); break; }
      case 'bone':
        if (rnd(s) < 0.5) { const v = Math.min(40, p.gold); p.gold -= v; await say(`小鬼偷走 ${p.name} ${v} 金`); }
        else { gain(s, p, 60); await io.ev({ t: 'gold', pid: p.id, n: 60, why: '小鬼送礼' }); }
        break;
      case 'rock': if (rnd(s) < 0.2) { const v = 80 + ri(s, 121); gain(s, p, v); await io.ev({ t: 'gold', pid: p.id, n: v, why: '金矿' }); } break;
      case 'water': { const v = heal(p, 20); if (v) await io.ev({ t: 'heal', pid: p.id, n: v }); break; }
      case 'swamp': addStatus(s, p, 'poison', 3); break;
      case 'study': if (gainXp(s, p, 50)) await io.ev({ t: 'levelup', pid: p.id, level: p.level }); await say(`${p.name} 在书斋读书，经验 +50`); break;
      case 'venture':
        if (rnd(s) < 0.5) { gain(s, p, 80); await say(`${p.name} 路演成功，融到 80 金`); await io.ev({ t: 'gold', pid: p.id, n: 80, why: '路演融资' }); }
        else { const v = Math.min(40, p.gold); p.gold -= v; await say(`${p.name} 路演没人投，烧掉 ${v} 金`); }
        break;
      case 'star':
        if (depth < 2) { await say(`${p.name} 被星流带走`); await move(s, io, p, 4 + ri(s, 9)); if (p.alive && !s.over) await landOn(s, io, p, depth + 1); return true; }
        break;
      case 'lava': addStatus(s, p, 'burn', 1); gain(s, p, 80); await io.ev({ t: 'gold', pid: p.id, n: 80, why: '火中取金' }); break;
      case 'snow':
        if (depth < 2) { await say(`${p.name} 在冰上滑了出去`); await move(s, io, p, 1 + ri(s, 3)); if (p.alive && !s.over) await landOn(s, io, p, depth + 1); return true; }
        break;
      case 'sea':
        if (depth < 2) { await say(`${p.name} 被海浪卷走`); await move(s, io, p, 3 + ri(s, 6)); if (p.alive && !s.over) await landOn(s, io, p, depth + 1); return true; }
        break;
      case 'cloud':
        if (depth < 2) { await say(`一阵大风把 ${p.name} 吹跑了`); await move(s, io, p, 8 + ri(s, 13)); if (p.alive && !s.over) await landOn(s, io, p, depth + 1); return true; }
        break;
      case 'ink': {
        const o = alive(s).filter((q) => q !== p);
        if (o.length) { const q = o[ri(s, o.length)]; [p.pos, q.pos] = [q.pos, p.pos]; [p.from, q.from] = [q.from, p.from]; await io.ev({ t: 'jump', pid: p.id, pos: p.pos }); await io.ev({ t: 'jump', pid: q.id, pos: q.pos }); await say(`黑水翻涌，${p.name} 和 ${q.name} 换了位置`); return true; }
        break;
      }
    }
    return false;
  }

  async function landmark(s, io, p, c, depth) {
    const say = (text) => io.ev({ t: 'msg', text });
    const others = alive(s).filter((q) => q !== p);
    switch (c) {
      case 'jianmu': { const h = heal(p, 30); await say(`${p.name} 在建木下回了 ${h} 血`); break; }
      case 'guixu': addStatus(s, p, 'skip', 1); await say(`${p.name} 掉进归墟，停一回合`); break;
      case 'kunlun': {
        const ch = await io.ask('kunlun', { p });
        if (ch === 'heal') heal(p, 40); else p.bless = 1;
        await say(ch === 'heal' ? `${p.name} 在昆仑回血` : `${p.name} 获得昆仑祝福，下一战攻击 +50%`);
        break;
      }
      case 'buzhou': if (depth < 2) { await teleport(s, io, p, ri(s, N())); await landOn(s, io, p, depth + 1); } break;
      case 'taishan': if (gainXp(s, p, SJ.xpNeed(p.level))) await io.ev({ t: 'levelup', pid: p.id, level: p.level }); break;
      case 'huashan': {
        const d = 2 + ri(s, 6) + ri(s, 6);
        if (d >= 11) { await say(`太华论剑掷出 ${d}，山顶得到神兵`); await giveTreasure(s, io, p, 3); }
        else if (d >= 7) { p.atkBonus = (p.atkBonus || 0) + 3; await say(`太华论剑掷出 ${d}，${p.name} 攻击永久 +3`); }
        else { await say(`太华论剑掷出 ${d}，${p.name} 摔下山崖`); await hurtPlain(s, io, p, 25, '摔死在太华山'); }
        break;
      }
      case 'heyuan': heal(p, p.maxhp); await say(`${p.name} 饮河源之水，回满血`); break;
      case 'ruoshui': p.gold = Math.floor(p.gold * 0.7); for (const k of Object.keys(p.status)) if (k !== 'immune') delete p.status[k]; await say(`${p.name} 渡弱水，金币沉了三成，负面全消`); break;
      case 'fusang': others.forEach((q) => addStatus(s, q, 'burn', 2)); gain(s, p, 200); await io.ev({ t: 'gold', pid: p.id, n: 200, why: '十日并出' }); await say('十日并出，其他人全部灼烧'); break;
      case 'penglai': p.maxhp += 20; heal(p, 20); await say(`${p.name} 服下不死药，血量上限 +20`); if (rnd(s) < 0.15) await giveTreasure(s, io, p, 3); break;
      case 'fangzhang': await freeUpgrade(s, io, p); await say('方丈仙人替你修了建筑'); break;
      case 'yingzhou': {
        const c2 = SJ.BOARD.map((t, i) => i).filter((i) => SJ.BOARD[i].type === 'corner' && i !== p.pos && SJ.BOARD[i].corner !== 'guixu');
        await say(`巨龟驮着 ${p.name} 出海`); await teleport(s, io, p, c2[ri(s, c2.length)]);
        break;
      }
      case 'longgong': await giveTreasure(s, io, p, rnd(s) < 0.4 ? 3 : 2); break;
      case 'guimen': if (others.length) { await say(`${p.name} 穿过鬼门`); await teleport(s, io, p, others[ri(s, others.length)].pos); } break;
      case 'dushuo': for (const k of Object.keys(p.status)) if (k !== 'immune') delete p.status[k]; heal(p, 30); await say('神荼郁垒替你驱鬼'); break;
      case 'youdu': gain(s, p, 300); addStatus(s, p, 'curse', 3); await io.ev({ t: 'gold', pid: p.id, n: 300, why: '土伯借贷' }); break;
      case 'xinghu': if (gainXp(s, p, SJ.xpNeed(p.level))) await io.ev({ t: 'levelup', pid: p.id, level: p.level }); await say(`${p.name} 进了星弧，英雄升一级`); break;
      case 'dabian': {
        const d = 2 + ri(s, 6) + ri(s, 6);
        if (d >= 7) { await say(`答辩掷出 ${d}，${p.name} 通过了，经验 +200`); if (gainXp(s, p, 200)) await io.ev({ t: 'levelup', pid: p.id, level: p.level }); if (d >= 11) await giveTreasure(s, io, p, 2); }
        else { await say(`答辩掷出 ${d}，${p.name} 被问倒了`); await hurtPlain(s, io, p, 25, '倒在答辩厅'); }
        break;
      }
      case 'luyan': { const d = 2 + ri(s, 6) + ri(s, 6), v = d * 30; gain(s, p, v); await io.ev({ t: 'gold', pid: p.id, n: v, why: `路演掷出 ${d}` }); break; }
      case 'tushuguan': await say(`${p.name} 在图书馆借到一件宝物`); await giveTreasure(s, io, p, rnd(s) < 0.3 ? 3 : 2); break;
      case 'zhongshan': others.forEach((q) => addStatus(s, q, 'slow', 2)); await say('烛龙闭眼，天下昏暗，其他人减速'); break;
    }
  }

  // 到达一格：结算格子，碰到人可以比试，车阵的传送排在最后
  async function arrive(s, io, p) {
    await landOn(s, io, p, 0);
    if (!p.alive || s.over) return;
    const other = s.players.find((q) => q.alive && q !== p && q.pos === p.pos);
    if (other && s.peace <= 0 && SJ.BOARD[p.pos].type !== 'corner' && !hasBuff(p, 'soar') && !(p._met || []).includes(other.id)) {
      await spar(s, io, p, other);
      if (!p.alive || s.over) return;
    }
    delete p._met;
    if (p._warp) { delete p._warp; await teleport(s, io, p, ri(s, N())); }
  }

  async function rollAndGo(s, io, p) {
    // 掷骰前可以学技能、放技能、换装备，都放在这里
    for (let n = 0; n < 40; n++) {
      const a = await io.ask('roll', { p });
      if (!a || a === true) break;
      await heroAction(s, io, p, a);
      if (!p.alive || s.over) return false;
    }
    let d1 = 1 + ri(s, 6), d2 = 1 + ri(s, 6);
    if (p.status.dream) { const e1 = 1 + ri(s, 6), e2 = 1 + ri(s, 6); if (e1 + e2 < d1 + d2) { d1 = e1; d2 = e2; } }
    let steps = d1 + d2, bonus = 0;
    if (p.race === 'qingqiu' && rnd(s) < 0.25) bonus += 1 + ri(s, 2);
    bonus += stat(p, 'steps');
    if (p.status.slow) bonus -= 2;
    if (hasBuff(p, 'stepMul')) { bonus += steps; }
    steps = Math.max(1, steps + bonus);
    const back = p.status.confuse && rnd(s) < 0.5;
    await io.ev({ t: 'roll', pid: p.id, d1, d2, bonus, back });
    await move(s, io, p, steps, back);
    if (!p.alive || s.over) return false;
    return d1 === d2;
  }

  SJ.takeTurn = async function (s, io) {
    const p = s.players[s.cur];
    s.stats.turns++;
    if (p.alive) {
      await io.ev({ t: 'turn', pid: p.id });
      p.cd = p.cd.map((c) => Math.max(0, c - 1 - treasure(p, 'cdFast')));
      { const rg = stat(p, 'regen'); if (rg) { const v = heal(p, rg); if (v) await io.ev({ t: 'heal', pid: p.id, n: v }); } }
      // 收入
      let inc = 0, taken = 0, taken2 = null;
      if (s.drought <= 0) {
        inc = SJ.TUNE.baseIncome + treasure(p, 'income');
        s.tiles.forEach((t, i) => {
          if (t.owner !== p.id) return;
          const to = t.stop > 0 && t.stopTo != null ? s.players[t.stopTo] : null; // 赤地千里：停产期间的产出归女魃
          if (to) { const st = t.stop; t.stop = 0; var vt = SJ.cityIncome(s, i); t.stop = st; } else vt = SJ.cityIncome(s, i);
          let v = vt;
          const b = SJ.bdef(t);
          if (b && b.fx.randIncome && v) v *= b.fx.randIncome[0] + rnd(s) * (b.fx.randIncome[1] - b.fx.randIncome[0]);
          if (s.harvest > 0) v *= 2;
          if (to) { if (to.alive && to !== p) { gain(s, to, v); taken += v; taken2 = to; } return; }
          inc += v;
        });
      }
      s.tiles.forEach((t) => {
        if (t.owner !== p.id) return;
        if (t.stop > 0 && --t.stop === 0) t.stopTo = null;
        if (t.hp != null) { const m = SJ.tileMaxHp(t); t.hp += m * (SJ.TUNE.repair + treasure(p, 'repair')); if (t.hp >= m) t.hp = null; }
      });
      for (let i = 0; i < s.tiles.length; i++) { const t = s.tiles[i]; if (t.s && t.s.o === p.id && !t.s.perm && --t.s.n <= 0) { t.s = null; await io.ev({ t: 'tile', tile: i }); } }
      if (p.id === 0 && s.round % SJ.TUNE.chestEvery === 0) { // 天降宝箱
        const c = SJ.BOARD.map((b, i) => i).filter((i) => ['land', 'wild'].includes(SJ.BOARD[i].type) && !s.tiles[i].b && !s.players.some((q) => q.pos === i));
        const i = c[ri(s, c.length)]; if (i != null) { s.tiles[i].chest = 1; await io.ev({ t: 'tile', tile: i }); await io.ev({ t: 'msg', text: '远方有宝光落下，看看小地图' }); }
      }
      if (taken) await io.ev({ t: 'toll', pid: p.id, to: taken2.id, n: Math.round(taken) });
      const thief = p.status.leech ? s.players[p.leechBy] : null;
      if (thief && thief.alive) { gain(s, thief, inc); if (inc) await io.ev({ t: 'toll', pid: p.id, to: thief.id, n: Math.round(inc) }); }
      else { gain(s, p, inc); if (inc) await io.ev({ t: 'gold', pid: p.id, n: Math.round(inc), why: '收入' }); }
      // 状态结算
      const st = p.status;
      let dot = (st.poison ? SJ.TUNE.poison : 0) + (st.burn ? SJ.TUNE.burn : 0) + (st.curse ? SJ.TUNE.curse : 0);
      const bleed = ownFx(s, p, 'heroBleed');
      if (bleed) dot += Math.min(bleed, Math.max(0, p.hp - 1));
      if (dot) await hurtPlain(s, io, p, dot, '毒发身亡');
      if (p.alive && !s.over) {
        const lucky = s.tiles.filter((t) => t.owner === p.id && t.b && SJ.BUILDINGS[t.b].fx.luckyCard);
        for (const _ of lucky) if (rnd(s) < 0.25 && !s.over) await playCard(s, io, p, drawCard(s, 'good'));
      }
      if (p.alive && !s.over) {
        if (st.skip) {
          await io.ev({ t: 'msg', text: `${p.name} 这回合动不了` });
        } else {
          let again = true, doubles = 0;
          s.extra = 0;
          while (again && p.alive && !s.over) {
            const dbl = await rollAndGo(s, io, p);
            if (!p.alive || s.over) break;
            await arrive(s, io, p);
            if (!p.alive || s.over) break;
            again = false;
            if (dbl) {
              doubles++;
              if (doubles >= 3) { await teleport(s, io, p, SJ.MAP.exile); addStatus(s, p, 'skip', 1); await io.ev({ t: 'msg', text: '连掷三次对子，掉进归墟！' }); break; }
              again = true;
              await io.ev({ t: 'msg', text: `${p.name} 掷出对子，再走一次` });
            }
            if (!again && s.extra > 0) { s.extra--; again = true; }
          }
        }
      }
      // 形夭：每回合结束时从存量补到 20%
      if (p.alive && p.pool > 0 && p.hp < p.maxhp * 0.2) {
        const v = Math.min(p.pool, Math.round(p.maxhp * 0.2) - p.hp);
        if (v > 0) { p.hp += v; p.pool -= v; await io.ev({ t: 'heal', pid: p.id, n: v }); }
      }
      // 状态递减
      for (const k of Object.keys(st)) { st[k]--; if (st[k] <= 0) delete st[k]; }
      const ended = p.buffs.filter((b) => b.n <= 1);
      p.buffs = p.buffs.filter((b) => --b.n > 0);
      for (const b of ended) {
        if (b.k === 'pool') p.pool = 0;
        if (b.k === 'vault' && p.alive) { const v = Math.round(p.vault * (1 + b.v)); p.vault = 0; if (v) { gain(s, p, v); await io.ev({ t: 'gold', pid: p.id, n: v, why: '蓄水' }); } }
        if (b.k === 'absorb' && p.store && p.alive) { const v = Math.round(p.store * b.v); p.store = 0; if (v) { await io.ev({ t: 'msg', kind: 'skill', text: `${p.name} 吸收的伤害一起爆发` }); await hurtPlain(s, io, p, v, '被自己吸收的伤害压垮'); } }
      }
    }
    if (s.over) return;
    if (p.alive && p.bonusTurns > 0) { // 与日逐走：同一个人再走一回合
      p.bonusTurns--;
      await io.ev({ t: 'msg', kind: 'skill', text: `${p.name} 还在追日，再走一回合` });
      return;
    }
    if (s.peace > 0) s.peace--;
    if (s.harvest > 0) s.harvest--;
    if (s.drought > 0) s.drought--;
    do {
      s.cur = (s.cur + 1) % s.players.length;
      if (s.cur === 0) s.round++;
    } while (!s.players[s.cur].alive);
  };
})(typeof window !== 'undefined' ? window : globalThis);
