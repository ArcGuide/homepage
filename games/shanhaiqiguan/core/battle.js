// 自动战斗：打塔和决斗每方最多出手 3 次，分不出胜负就收手，血量带回棋盘；打异兽打到一方倒下。只产生事件日志，不碰画面。
(function (g) {
  const SJ = g.SJ = g.SJ || {};

  // 种子随机。state 是一个带 v 字段的对象，这样可以存档。
  SJ.rand = function (st) {
    st.v = (st.v + 0x6D2B79F5) | 0;
    let t = st.v;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const ROUNDS = 3, DEATH_ROUNDS = 200; // 后者只是防止谁都打不死时卡住

  SJ.fight = function (A, D, st) {
    const r = () => SJ.rand(st);
    const a = Object.assign({}, A), d = Object.assign({}, D);
    for (const c of [a, d]) { c.stun = 0; c.dot = 0; c.fx = c.fx || {}; c.saved = false; }
    const log = [];
    const snap = (e) => { e.aHp = Math.max(0, Math.round(a.hp)); e.dHp = Math.max(0, Math.round(d.hp)); log.push(e); };
    const side = (c) => (c === a ? 'a' : 'd');
    const procOf = (c, foe) => (foe.fx.seal || c.sealed ? 0 : c.proc || 0);

    // 开战时触发
    for (const [c, foe] of [[a, d], [d, a]]) {
      if (c.heroId === 'jiuweihu' && foe.kind === 'building' && r() < procOf(c, foe)) {
        snap({ t: 'skill', who: side(c), name: '魅惑' });
        return { winner: side(c), log, aHp: a.hp, dHp: d.hp, charmed: true, lampUsed: false };
      }
    }

    const dead = (c) => c.hp <= 0;
    const hurt = (c, dmg, foe) => { // 处理吸收和保命
      if (c.absorb) { c.absorbed = (c.absorbed || 0) + dmg; return; }
      c.hp -= dmg;
      if (c.hp <= 0 && c.heroId === 'xingtian' && !c.saved && r() < procOf(c, foe)) {
        c.hp = 1; c.saved = true; snap({ t: 'skill', who: side(c), name: '断首再战' });
      }
      if (c.hp <= 0 && c.undying) { c.hp = 1; snap({ t: 'skill', who: side(c), name: '打不死' }); }
      if (c.hp <= 0 && c.lamp != null && !c.lampUsed) {
        c.hp = c.maxhp * 0.3; c.lampUsed = true; snap({ t: 'skill', who: side(c), name: '魂灯' });
      }
    };

    const strike = (x, y, mul, label) => {
      const miss = (y.dodge || 0) + (x.blind || 0) + (y.fx.missNow || 0);
      if (r() < miss) { snap({ t: 'miss', who: side(x) }); return; }
      if (y.fx.selfHit && x.kind === 'hero' && r() < y.fx.selfHit) {
        const self = curAtk(x) * 0.8; hurt(x, self, y); snap({ t: 'self', who: side(x), dmg: Math.round(self) }); return;
      }
      let dmg = curAtk(x) * mul * (0.85 + r() * 0.3);
      let crit = false, big = false;
      if (r() < (x.crit || 0)) { dmg *= 2; crit = true; }
      if (x.fx.bigHit && r() < x.fx.bigHit) { dmg *= 8; big = true; }
      dmg *= 1 - Math.min(0.8, y.def || 0);
      if (x.stack) { x.hits = (x.hits || 0) + 1; dmg += x.stack * x.hits * (x.hits + 1) / 2; } // 第 N 下额外 stack×(1+…+N)
      hurt(y, dmg, x);
      snap({ t: 'hit', who: side(x), dmg: Math.max(1, Math.round(dmg)), crit: crit || big, label });
      if (y.fx.thorns) { hurt(x, dmg * y.fx.thorns, y); snap({ t: 'thorn', who: side(y), dmg: Math.round(dmg * y.fx.thorns) }); }
      if (x.heroId === 'huangdi' && !dead(y) && r() < procOf(x, y)) { const v = y.hp * 0.5; hurt(y, v, x); snap({ t: 'skill', who: side(x), name: '指南车', dmg: Math.round(v) }); }
      if (x.heroId === 'tubo' && !dead(y) && r() < procOf(x, y)) {
        const cost = Math.min(x.hp - 1, x.maxhp * 0.05);
        if (cost > 0) { x.hp -= cost; const v = cost * x.hitBack; hurt(y, v, x); snap({ t: 'skill', who: side(x), name: '地府反震', dmg: Math.round(v) }); }
      }
      if (x.pctHit && !dead(y) && r() < procOf(x, y)) { const v = y.maxhp * x.pctHit; hurt(y, v, x); snap({ t: 'skill', who: side(x), name: '衔石', dmg: Math.round(v) }); }
      if (x.fx.lifesteal) { x.hp = Math.min(x.maxhp, x.hp + dmg * x.fx.lifesteal); snap({ t: 'heal', who: side(x), amt: Math.round(dmg * x.fx.lifesteal) }); }
      if (x.poisonHit) y.dot += 0.8;
    };

    const curAtk = (c) => {
      let v = c.atk;
      const lost = 1 - Math.max(0, c.hp) / c.maxhp;
      if (c.xtLow) v *= 1 + lost * c.xtLow;
      if (c.lowHpAtk) v *= 1 + lost * c.lowHpAtk;
      if (c.fx.lowHpAtk) v *= 1 + lost * c.fx.lowHpAtk;
      return v;
    };

    const act = (x, y, round) => {
      if (x.stun > 0) { x.stun--; snap({ t: 'stunned', who: side(x) }); return; }
      if (x.heroId === 'yinglong' && r() < procOf(x, y)) {
        y.stun = 2; hurt(y, 12, x); snap({ t: 'skill', who: side(x), name: '暴雨', dmg: 12 });
      }
      if (x.fx.stunEvery && round % x.fx.stunEvery === 0) { y.stun = 1; snap({ t: 'skill', who: side(x), name: '震晕' }); }
      const nine = x.nine && r() < 0.7; // 九首吞山
      if (nine) snap({ t: 'skill', who: side(x), name: '九首吞山' });
      const twin = x.twin && r() < 0.4; // 浸血兵器
      const n = nine ? 9 : twin ? 2 : x.fx.multi || 1;
      const mul = nine ? 0.1 : twin ? 1 : n > 1 ? 0.75 : 1;
      for (let i = 0; i < n && !dead(y) && !dead(x); i++) {
        strike(x, y, mul);
        if (x.fx.double && !dead(y) && !dead(x) && r() < x.fx.double) strike(x, y, 1, '连射');
      }
    };

    let round = 1;
    const limit = D.toDeath ? DEATH_ROUNDS : ROUNDS;
    for (; round <= limit && !dead(a) && !dead(d); round++) {
      act(a, d, round);
      if (dead(a) || dead(d)) break;
      act(d, a, round);
      if (dead(a) || dead(d)) break;
      for (const c of [a, d]) {
        if (c.dot) {
          const o = c === a ? d : a;
          hurt(c, c.dot, o); snap({ t: 'dot', who: side(c), dmg: c.dot });
          if (o.fx.lifesteal && o.hp > 0) { const v = c.dot * o.fx.lifesteal; o.hp = Math.min(o.maxhp, o.hp + v); snap({ t: 'heal', who: side(o), amt: Math.round(v) }); }
        }
        if (c.fx.regen && c.hp > 0) { c.hp = Math.min(c.maxhp, c.hp + c.fx.regen); snap({ t: 'heal', who: side(c), amt: c.fx.regen }); }
      }
    }
    let winner;
    let timeout = false;
    if (dead(d) && !dead(a)) winner = 'a';
    else if (dead(a)) winner = 'd';
    else { timeout = true; winner = 'draw'; }
    return { winner, log, aHp: Math.max(0, a.hp), dHp: Math.max(0, d.hp), aAbs: a.absorbed || 0, dAbs: d.absorbed || 0, timeout, charmed: false, lampUsed: !!a.lampUsed, dLampUsed: !!d.lampUsed };
  };
})(typeof window !== 'undefined' ? window : globalThis);
