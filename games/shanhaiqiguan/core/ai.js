// 启发式 AI。有点莽才好玩。估算战斗用独立的随机流，不影响游戏本身的种子。
(function (g) {
  const SJ = g.SJ = g.SJ || {};

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

  SJ.aiDecide = function (s, kind, c) {
    const p = c.p;
    const roll = () => SJ.rand(s.aiRng || (s.aiRng = { v: s.seed ^ 0x5bd1e995 }));
    switch (kind) {
      case 'roll': {
        // 学技能：大招优先，其余优先核心被动，再平均
        if (p.pts > 0) {
          const order = [3, 0, 2, 1].filter((i) => SJ.canLearn(p, i));
          if (order.length) return { a: 'learn', i: order[0] };
        }
        if (p.bag.length) {
          if (p.items.includes(null)) return { a: 'equip', i: 0 };
          const tier = (id) => SJ.itemOf(id).tier;
          const worst = p.items.reduce((m, id, i) => (tier(id) < tier(p.items[m]) ? i : m), 0);
          const best = p.bag.reduce((m, id, i) => (tier(id) > tier(p.bag[m]) ? i : m), 0);
          if (tier(p.bag[best]) > tier(p.items[worst])) { if (p.bag.length < SJ.TUNE.bagSize) return { a: 'unequip', i: worst }; return { a: 'sell', i: 0 }; }
        }
        for (let i = 3; i >= 0; i--) {
          if (!SJ.canCast(p, i)) continue;
          const k = SJ.SKILLS[p.hero][i];
          if (k.kind === 'heal' && p.hp > p.maxhp * 0.6) continue;
          if ((k.id === 'xingyao' || k.id === 'jizou') && p.hp < p.maxhp * 0.6) continue;
          if (k.kind === 'summon' && s.tiles[p.pos].s) continue;
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
      case 'upgrade': return p.gold - c.cost >= 30;
      case 'fork': return p.gold - c.cost >= 30 ? c.options[Math.floor(roll() * c.options.length)] : null;
      case 'tollOrFight': {
        const e = estimate(c.A, c.D, (s.seed + s.stats.turns) | 0, 12);
        if (e.die > 0.1 || e.left / p.maxhp < 0.35) return false;
        if (e.win > 0.5) return true;
        return c.toll > 40 ? roll() < 0.5 : roll() < 0.2; // 打不穿也要蹭点血，省一半过路费
      }
      case 'duel': {
        const e = estimate(c.A, c.D, (s.seed + s.stats.turns) | 0, 10);
        return e.die < 0.1 && e.left / p.maxhp > 0.5 && roll() < 0.5;
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
