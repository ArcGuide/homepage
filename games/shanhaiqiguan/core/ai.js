// 启发式 AI。有点莽才好玩。估算战斗用独立的随机流，不影响游戏本身的种子。
(function (g) {
  const SJ = g.SJ = g.SJ || {};
  SJ.AI_RASH = { accept: 0.3, invite: 0.2 }; // 决斗冲动：打不过也应战 30%；不是谁都打得过，每回合也有 20% 下战书

  function estimate(A, D, seed, n) {
    const st = { v: seed };
    let win = 0, die = 0, left = 0;
    for (let k = 0; k < n; k++) {
      const r = SJ.fight(A, D, st);
      if (r.winner === 'a') win++;
      if (r.aHp <= 0) die++;
      left += r.aHp;
    }
    return { win: win / n, die: die / n, left: left / n };
  }
  SJ.estimate = estimate;
  // 电脑学技能的顺序：大招优先，再按各英雄的核心技能
  const AI_ORDER = { yayu: [3, 1, 0, 2], tubo: [3, 1, 2, 0], jiuweihu: [3, 0, 2, 1] };

  SJ.aiDecide = function (s, kind, c) {
    const p = c.p;
    const roll = () => SJ.rand(s.aiRng || (s.aiRng = { v: s.seed ^ 0x5bd1e995 }));
    switch (kind) {
      case 'roll': {
        // 学技能：大招优先，其余优先核心被动，再平均
        if (p.pts > 0) {
          const order = (AI_ORDER[p.hero] || [3, 0, 2, 1]).filter((i) => SJ.canLearn(p, i));
          if (order.length) return { a: 'learn', i: order[0] };
        }
        if (p.bag.length) {
          if (p.items.includes(null)) return { a: 'equip', i: 0 };
          const tier = (id) => SJ.itemOf(id).tier;
          const worst = p.items.reduce((m, id, i) => (tier(id) < tier(p.items[m]) ? i : m), 0);
          const best = p.bag.reduce((m, id, i) => (tier(id) > tier(p.bag[m]) ? i : m), 0);
          if (tier(p.bag[best]) > tier(p.items[worst])) { if (p.bag.length < SJ.TUNE.bagSize) return { a: 'unequip', i: worst }; return { a: 'sell', i: 0 }; }
        }
        // 消耗品：看情况用
        for (let i = 0; i < (p.cons || []).length; i++) {
          const id = p.cons[i];
          if (id === 'huichun' && p.hp < p.maxhp * 0.5) return { a: 'use', i };
          if (id === 'jiedu' && Object.keys(p.status).some((k) => k !== 'immune')) return { a: 'use', i };
          if (id === 'shisha' && p.cd.some((c, j) => c > 2 && p.sk[j] && !SJ.SKILLS[p.hero][j].ult)) return { a: 'use', i };
          if (id === 'shisha' && !SJ.SKILLS[p.hero].some((k) => !k.ult && k.kind !== 'passive')) return { a: 'use', i }; // 没有主动技能的英雄，时砂直接丢
          if (id === 'shenxing' && roll() < 0.3) return { a: 'use', i };
          if (id === 'zhuanxiang' && roll() < 0.1) return { a: 'use', i };
          if (id === 'wangchuan' && p.cons.filter((x) => x !== 'yingzhan').length >= 4) return { a: 'use', i }; // 电脑不洗点，栏满了就随手用掉
          // 决斗不全按把握来：觉得打得过就上，打不过也有一定概率一冲动就上
          if (id === 'yingzhan' && s.duel && (SJ.duelOdds(s, p, s.players[s.duel.from]) > 0.5 || roll() < SJ.AI_RASH.accept)) return { a: 'use', i };
          if (id === 'juedou' && !s.duel && (s.players.every((q) => !q.alive || q === p || SJ.duelOdds(s, p, q) >= 0.6) || roll() < SJ.AI_RASH.invite)) return { a: 'use', i };
        }
        for (let i = 3; i >= 0; i--) {
          if (!SJ.canCast(p, i, s)) continue;
          const k = SJ.SKILLS[p.hero][i];
          if (k.kind === 'heal' && p.hp > p.maxhp * 0.6) continue;
          if ((k.id === 'xingyao' || k.id === 'jizou') && p.hp < p.maxhp * 0.6) continue; // 献血的技能血少时不放
          if (k.id === 'busi' && (p.hp < p.maxhp * 0.7 || s.tiles.filter((t) => t.owner === p.id && t.b).length < 4)) continue;
          if (k.id === 'tufu') return { a: 'cast', i }; // 能改建就改
          if (k.kind === 'summon' && ['zhenmu', 'chezhen', 'denglin'].includes(k.id) && s.tiles[p.pos].s) continue;
          if (k.id === 'xushui' && p.gold < 300) continue;
          if (roll() < 0.6) return { a: 'cast', i };
        }
        return true;
      }
      case 'buy': return p.gold - c.price >= 40 || roll() < 0.3;
      case 'build': {
        const n = s.tiles.filter((t) => t.owner === p.id && t.b && SJ.BUILDINGS[t.b].branch === 'city').length;
        const w = { city: n < 2 ? 4 : 1.5, garrison: 1.6, archer: 2.4, magic: 1.6, academy: 1.4 };
        let sum = 0; for (const k in w) sum += w[k];
        let x = roll() * sum;
        for (const k in w) { x -= w[k]; if (x <= 0) return k; }
        return 'archer';
      }
      case 'way': return c.options[Math.floor(roll() * c.options.length)];
      case 'upgrade': return p.gold - c.cost >= 30;
      case 'fork': return p.gold - c.cost >= 30 ? c.options[Math.floor(roll() * c.options.length)] : null;
      case 'tollOrFight': {
        const e = estimate(c.A, c.D, (s.seed + s.stats.turns) | 0, 12);
        if (e.die > 0.1 || e.left / p.maxhp < 0.35) return false;
        if (e.win > 0.5) return true;
        return c.toll > 40 ? roll() < 0.5 : roll() < 0.2; // 打不穿也要蹭点血，省一半过路费
      }
      case 'nest': {
        const A = Object.assign({}, SJ.heroStats(s, p), { kind: 'hero', heroId: p.hero, fx: {}, crit: 0.1 });
        const e = estimate(A, c.foe, (s.seed + s.stats.turns) | 0, 10);
        return e.die < 0.05 && e.left / p.maxhp > 0.4;
      }
      case 'shop': return p.gold - c.price >= 120;
      case 'kunlun': return p.hp < p.maxhp * 0.8 ? 'heal' : 'bless';
      case 'card': { const good = c.cards.find((x) => x.kind === 'good'); return good || c.cards[0]; }
    }
    return false;
  };
})(typeof window !== 'undefined' ? window : globalThis);
