// 英雄技能和宝物。每个英雄 3 个普通技能（各 3 级）+ 1 个大招。
// v: 每级数值；pr: 战斗触发率；pv: 被动属性；go: 主动效果，g 是引擎给的工具，k 是技能等级下标。
(function (g0) {
  const SJ = g0.SJ = g0.SJ || {};
  const P = (x) => `${Math.round(x * 100)}%`;
  const L = (a, f) => a.map(f || String).join(' / ');
  const pct = (a) => L(a, P);
  const S = (id, name, kind, cd, desc, more, ic) => Object.assign({ id, name, kind, cd, desc, ic }, more);

  SJ.SKILL_KIND = { passive: '被动', buff: '加持', move: '位移', econ: '经济', summon: '召唤', heal: '回复' };
  SJ.SUMMONS = {
    chariot: { name: '指南车阵', stop: true, warp: true, art: 'a bronze ancient chariot with a pointing figure on top, barricade of spears' },
    fire: { name: '赤地火焰', trail: true, art: 'a ring of fire on scorched cracked earth' },
    beast: { name: '镇墓兽', stop: true, hit: true, art: 'a fierce antlered tomb guardian beast statue of dark lacquered wood' },
    poison: { name: '毒泽', status: 'leech', turns: 3, art: 'a bubbling pool of green poison with bones' },
    stones: { name: '填海石', stop: true, art: 'a heap of round grey pebbles and stones' },
    candle: { name: '烛', candle: true, art: 'a single tall red candle with a bright flame on a coiled bronze serpent candlestick' },
    grove: { name: '邓林', stop: true, grove: true, art: 'a small dense peach grove growing around a planted wooden staff' },
  };

  SJ.SKILLS = {
    huangdi: [
      S('zhinan', '指南车', 'passive', 0, `每次打中时 ${pct([0.33, 0.66, 1])} 再削掉对手当前血量的 50%`, { pr: [0.33, 0.66, 1] }, 'a bronze south-pointing chariot figurine'),
      S('zhucheng', '筑城令', 'econ', 6, `下一次建造或升级减免 ${pct([0.4, 0.7, 1])}`, { go: (g, k) => g.buff('buildCut', [0.4, 0.7, 1][k], 4) }, 'a bamboo decree scroll with a red seal over a rammed earth wall'),
      S('chezhen', '车阵', 'summon', 6, `在脚下摆车阵，持续 ${L([5, 9, 13])} 轮。敌人走到这里被拦下，结算完这一格后传送到随机位置`, { go: (g, k) => g.summon('chariot', [5, 9, 13][k]) }, 'a circle of bronze war chariots'),
      S('zhuolu', '涿鹿号令', 'buff', 12, '7 回合内全部自家建筑攻击 +100%', { ult: true, go: (g) => g.buff('towerAtk', 1, 7) }, 'a great war drum and golden imperial banner'),
    ],
    yinglong: [
      S('baoyu', '暴雨', 'passive', 0, `每下 ${pct([0.15, 0.22, 0.3])} 让对手停手两拍并受伤`, { pr: [0.15, 0.22, 0.3] }, 'a grey storm cloud with many bright blue rain streaks and a lightning bolt'),
      S('xushui', '蓄水', 'econ', 5, `存起全部金币，3 回合后取出，并多得 ${pct([0.15, 0.3, 0.45])}`, { go: (g, k) => g.vault([0.15, 0.3, 0.45][k], 3) }, 'a swirling orb of gathered water held by a dragon claw'),
      S('zhenyi', '振翼', 'move', 5, `向前飞 ${L([6, 9, 12])} 格，无视地形和路障；每飞一格，落地这一格的结算中攻击 +5%`, { go: (g, k) => g.dash([6, 9, 12][k], true, { atk: 0.05 }) }, 'a golden feathered wing beating'),
      S('yifu', '翼覆千里', 'move', 12, '6 回合内飞行，步数翻倍，路过的自家建筑免费升一级', { ult: true, go: (g) => { g.buff('fly', 1, 6); g.buff('stepMul', 1, 6); g.buff('autoUp', 1, 6); } }, 'huge golden wings spread across the sky'),
    ],
    nuba: [
      S('dahan', '大旱', 'passive', 0, `敌方攻击有 ${pct([0.1, 0.15, 0.2])} 落空`, { pv: { dodge: [0.1, 0.15, 0.2] } }, 'a blazing sun over cracked dry earth'),
      S('fenshen', '焚身', 'buff', 5, `${L([2, 3, 4])} 回合内，路过的敌方建筑每座掉 ${L([10, 15, 20])} 血`, { go: (g, k) => g.buff('scorch', [10, 15, 20][k], [2, 3, 4][k]) }, 'a woman silhouette wrapped in flames'),
      S('chidi', '赤地', 'buff', 6, `${L([3, 4, 5])} 回合内走过的格子留下火焰，敌人踩到掉 2 血，火焰留 3 轮`, { go: (g, k) => g.buff('trail', 1, [3, 4, 5][k]) }, 'a ring of fire on red earth'),
      S('qianli', '赤地千里', 'econ', 12, '所有敌方城邑停产 2 轮，你得 300 金', { ult: true, go: (g) => { g.stopEnemyCities(2); g.gold(300); } }, 'a parched red landscape with withered crops under a huge sun'),
    ],
    chiyou: [
      S('bingqi', '浸血兵器', 'buff', 5, `献出 15% 最大血，${L([2, 3, 4])} 回合内每次出手 50% 概率连打两下；血祭生效时只献 10%`, { go: (g, k) => { g.bleed(g.has('xueji') ? 0.1 : 0.15); g.buff('twin', 1, [2, 3, 4][k]); } }, 'a whirlwind of bronze weapons'),
      S('xueji', '血祭', 'buff', 5, `献出 15% 最大血，${L([2, 3, 4])} 回合内攻击 +${pct([0.3, 0.45, 0.6])}；浸血兵器生效时只献 10%`, { go: (g, k) => { g.bleed(g.has('twin') ? 0.1 : 0.15); g.buff('atkPct', [0.3, 0.45, 0.6][k], [2, 3, 4][k]); g.buff('xueji', 1, [2, 3, 4][k]); } }, 'a blood-filled bronze ritual cauldron'),
      S('tietou', '铜头铁额', 'buff', 6, `${L([2, 3, 4])} 回合内防御 +${pct([0.2, 0.3, 0.4])}，每回合回 15 血`, { go: (g, k) => { g.buff('def', [0.2, 0.3, 0.4][k], [2, 3, 4][k]); g.buff('regen', 15, [2, 3, 4][k]); } }, 'a horned bronze helmet'),
      S('bingzhu', '兵主降世', 'buff', 12, '献出 15% 最大血，3 回合内暴击 +55%；浸血兵器或血祭生效时只献 10%，两个都生效时不用献血', { ult: true, go: (g) => { g.bleed([0.15, 0.1, 0][(g.has('twin') ? 1 : 0) + (g.has('xueji') ? 1 : 0)]); g.buff('crit', 0.55, 3); } }, 'a giant demon war god silhouette with many weapons, red glow'),
    ],
    xingtian: [
      S('duanshou', '断首再战', 'passive', 0, `致命一击时 ${pct([0.25, 0.4, 0.55])} 留 1 点血；血越少攻击越高，最多 +${pct([0.5, 0.8, 1.2])}`, { pr: [0.25, 0.4, 0.55], pv: { lowHp: [0.5, 0.8, 1.2] } }, 'a headless torso with a roaring face on the chest'),
      S('ganqi', '干戚舞', 'buff', 5, `3 回合内反弹 ${pct([0.2, 0.3, 0.4])} 伤害，攻击 +10%`, { go: (g, k) => { g.buff('thorn', [0.2, 0.3, 0.4][k], 3); g.buff('atkPct', 0.1, 3); } }, 'a crossed battle axe and round shield'),
      S('mengzhi', '猛志', 'buff', 6, `3 回合内吸收全部伤害，结束时一次受到吸收总量的 ${pct([1, 0.75, 0.5])}`, { go: (g, k) => g.buff('absorb', [1, 0.75, 0.5][k], 3) }, 'a charging warrior silhouette with dust'),
      S('xingyao', '形夭', 'buff', 12, '血量高于 20% 才能用：血量降到 20%，多出的血存起来。12 回合内，每回合结束时血量低于 20% 就从存量补到 20%，到期存量清零', { ult: true, can: (p) => p.hp > p.maxhp * 0.2, go: (g) => g.pool(12) }, 'a headless giant rising with blazing spirit'),
    ],
    kuafu: [
      S('zhuiri', '大步', 'passive', 0, `每次步数 +${L([1, 2, 3])}，走完 ${pct([0.1, 0.15, 0.2])} 再掷一次`, { pr: [0.1, 0.15, 0.2], pv: { steps: [1, 2, 3] } }, 'a giant bare foot in a long running stride kicking up golden dust, side view'),
      S('denglin', '弃杖成林', 'summon', 8, `回 ${L([30, 40, 50])} 血，在脚下种邓林：敌人被拦下，自己路过回 30 血，持续 ${L([4, 6, 8])} 轮`, { go: (g, k) => { g.heal([30, 40, 50][k]); g.summon('grove', [4, 6, 8][k]); } }, 'a wooden staff sprouting into a peach grove'),
      S('benpao', '逐日', 'move', 5, `向前跑 ${L([12, 24, 36])} 格，每格回 1% 最大血，跑完转身`, { go: (g, k) => g.dash([12, 24, 36][k], false, { heal: 0.01, turn: true }) }, 'a running giant toward a red sun'),
      S('yuri', '与日逐走', 'buff', 12, '这回合结束后再连走 2 个完整回合', { ult: true, go: (g) => g.turns(2) }, 'a giant running hard beneath three blazing suns in the sky, long shadow'),
    ],
    tubo: [
      S('fanzhen', '地府反震', 'passive', 0, `攻击时 20% 概率献出 5% 最大血，再对敌人造成献血量 ${pct([1, 1.5, 2])} 的伤害`, { pr: [0.2, 0.2, 0.2], pv: { hitBack: [1, 1.5, 2] } }, 'a shockwave cracking dark stone ground'),
      S('tufu', '土府', 'buff', 5, `${L([2, 3, 4])} 回合内防御 -${pct([0.4, 0.3, 0.2])}，攻击 +50%`, { go: (g, k) => { g.buff('def', -[0.4, 0.3, 0.2][k], [2, 3, 4][k]); g.buff('atkPct', 0.5, [2, 3, 4][k]); } }, 'a dark stone underground gate'),
      S('zhenmu', '镇墓兽', 'summon', 6, `在脚下放镇墓兽，拦下敌人并吸走 ${L([15, 25, 35])} 血给自己。永久存在，被碰到才消失，最多一只`, { go: (g, k) => g.summon('beast', 0, [15, 25, 35][k], { perm: true, one: true }) }, 'an antlered tomb guardian beast'),
      S('chiling', '幽都敕令', 'buff', 12, '修满全部自家建筑，每修满一座献出 2% 最大血；所有敌人诅咒 3 回合', { ult: true, go: (g) => { g.repairAll(0.02); g.foes('curse', 3); } }, 'a pale bone tablet with teal ghost flames rising around it'),
    ],
    xiangliu: [
      S('jiutou', '九首连噬', 'passive', 0, `一场战斗里越打越狠：第 1 下额外 +${L([1, 2, 3])} 伤害，第 2 下 +${L([3, 6, 9])}，第 3 下 +${L([6, 12, 18])}，依次累加`, { pv: { stackHit: [1, 2, 3] } }, 'nine snake heads striking together'),
      S('duxue', '噬血', 'buff', 5, `3 回合内吸血 ${pct([0.15, 0.25, 0.35])}，攻击带毒，毒伤也能吸血`, { go: (g, k) => { g.buff('lifesteal', [0.15, 0.25, 0.35][k], 3); g.buff('venom', 1, 3); } }, 'fangs dripping green and red venom'),
      S('duze', '毒泽', 'summon', 6, `在脚下吐出毒泽，地面持续 ${L([3, 4, 5])} 轮。敌人走过后，接下来 2 回合的收入全归相柳，不掉血`, { go: (g, k) => g.summon('poison', [3, 4, 5][k]) }, 'a bubbling green poison swamp'),
      S('tunshan', '九首吞山', 'passive', 0, '每次出手 85% 概率连打 9 段，每段攻击力 15%；不触发时正常打', { ult: true, pv: { nine: [1] } }, 'a nine-headed serpent devouring a mountain'),
    ],
    yayu: [
      S('fusheng', '死而复生', 'passive', 0, `自家建筑被拆时 ${pct([0.2, 0.3, 0.4])} 原地重生；打赢回 ${L([15, 25, 35])} 血`, { pr: [0.2, 0.3, 0.4], pv: { winHeal: [15, 25, 35] } }, 'a bone rising from red earth with a green sprout'),
      S('huanhun', '还魂', 'buff', 9, `接下来 ${L([1, 2, 3])} 回合内阵亡时以 25% 血复活`, { go: (g, k) => g.buff('revive', 0.25, [1, 2, 3][k]) }, 'a glowing soul returning to a beast skeleton'),
      S('jizou', '疾走', 'move', 6, `向前奔 ${L([6, 9, 12])} 格，每格献出 5% 最大血，得 100 金`, { go: (g, k) => g.dash([6, 9, 12][k], false, { bloodGold: [0.05, 100] }) }, 'running beast legs with dust'),
      S('busi', '不死药', 'heal', 12, '全地图所有英雄和建筑，不分敌友，回 25% 血', { ult: true, go: (g) => g.healAll(0.25) }, 'a glowing jade medicine bottle'),
    ],
    jiuweihu: [
      S('meihuo', '魅惑', 'passive', 0, `开战时 ${pct([0.08, 0.12, 0.16])} 让塔直接归降；学会后吉凶卡看两张选一张`, { pr: [0.08, 0.12, 0.16] }, 'a fox eye with a pink glowing charm'),
      S('humei', '狐媚', 'econ', 5, `2 回合内过路费减 ${pct([0.5, 0.7, 1])}`, { go: (g, k) => g.buff('tollCut', [0.5, 0.7, 1][k], 2) }, 'a white fox tail wrapping gold coins'),
      S('huanxing', '幻形', 'move', [5, 4, 3], '向前闪 3 格并转身，升级缩短冷却', { go: (g) => g.dash(3, true, { turn: true }) }, 'a fox silhouette dissolving into pale mist'),
      S('tianhu', '九尾天狐', 'econ', 12, '抽两张吉卡', { ult: true, go: (g) => g.goodCards(2) }, 'nine glowing fox tails fanned around a moon'),
    ],
    jingwei: [
      S('xianshi', '衔石', 'passive', 0, `战斗中每下 ${pct([0.1, 0.15, 0.2])} 对敌人造成其最大血 7% 的伤害`, { pr: [0.1, 0.15, 0.2] }, 'a small bird carrying a pebble'),
      S('tianhai', '填海', 'summon', 5, `在身后 ${L([3, 4, 5])} 格连放石头，敌人被拦下，持续 5 轮`, { go: (g, k) => g.behind('stones', [3, 4, 5][k], 5) }, 'a pile of round pebbles in waves'),
      S('zhanchi', '展翅', 'buff', 5, `${L([1, 2, 3])} 回合内飞在空中，停下时什么都不触发：不战斗、不交过路费，也不买地、不遇异兽`, { go: (g, k) => g.buff('soar', 1, [1, 2, 3][k]) }, 'small bird wings in flight over sea'),
      S('buqu', '志不可夺', 'passive', 0, '强化其他三个技能：衔石伤害变为最大血 15%；填海的石头永久存在，被碰到才消失；展翅时自家和中立的格子照常结算', { ult: true }, 'a tiny bird defiantly facing a huge ocean wave'),
    ],
    zhulong: [
      S('zhengyan', '睁眼一击', 'passive', 0, `攻击 +${pct([0.12, 0.18, 0.24])}，防御 +${pct([0.06, 0.12, 0.18])}；在【烛】前后 5 格内再加攻击 12%、防御 6%；每场战斗后在脚下放一个【烛】`, { pv: { atkPct: [0.12, 0.18, 0.24], def: [0.06, 0.12, 0.18], candleNear: [1, 1, 1] } }, 'a huge glowing eye opening'),
      S('zhuzhao', '烛照', 'summon', 5, `在脚下放一个【烛】；烛龙在【烛】前后 5 格内付的过路费减 ${pct([0.15, 0.3, 0.45])}`, { pv: { candleToll: [0.15, 0.3, 0.45] }, go: (g) => g.candle() }, 'a burning candle held in a serpent mouth'),
      S('xianzhu', '衔烛夜行', 'move', 5, `向前游 ${L([6, 9, 12])} 格，在起点和终点各留一个【烛】。其他英雄停在【烛】上，传送到随机另一个【烛】，这两个【烛】随后消失`, { go: (g, k) => { g.candle(); g.dash([6, 9, 12][k], false, { candle: true }); } }, 'a red serpent gliding through night with a candle'),
      S('zhuyin', '烛阴闭目', 'buff', 12, '回收地图上所有【烛】，每个让最大血永久 +5、攻击永久 +1', { ult: true, go: (g) => g.reclaim() }, 'a giant closed serpent eye in a dark sky'),
    ],
  };

  // tier 1 宝铺和异兽；tier 2 满级城邑；tier 3 只在宝箱、地标、大事件里出现
  const T = (tier, id, name, desc, fx, ic) => Object.assign({ tier, id, name, desc, ic }, fx);
  SJ.TREASURES = [
    T(1, 'tongjian', '青铜剑', '攻击 +3', { atk: 3 }, 'a short bronze sword'),
    T(1, 'xijia', '犀甲', '防御 +6%', { def: 0.06 }, 'an ancient brown leather lamellar cuirass made of overlapping laced plates'),
    T(1, 'yupei', '玉佩', '闪避 +6%', { dodge: 0.06 }, 'a round pale green jade bi disc with a hole in the center and a red silk tassel'),
    T(1, 'chiyu', '赤玉', '血量上限 +25', { hp: 25 }, 'a red jade stone'),
    T(1, 'sinan', '司南', '技能触发 +5%', { proc: 0.05 }, 'an ancient spoon compass on a bronze plate'),
    T(1, 'chanbi', '蟾蜍钱', '每回合 +15 金', { income: 15 }, 'a small toad sitting on old coins'),
    T(1, 'caolv', '芒鞋', '步数 +1', { steps: 1 }, 'a pair of straw sandals'),
    T(1, 'zhuyu', '祝余草', '每回合回 3 血', { regen: 3 }, 'a healing herb sprig'),
    T(2, 'kunwu', '昆吾剑', '攻击 +7', { atk: 7 }, 'a red-glowing sword that cuts jade'),
    T(2, 'xuanjia', '玄甲', '防御 +14%', { def: 0.14 }, 'an ancient black iron lamellar cuirass made of overlapping small plates with gold lacing'),
    T(2, 'miguzhi', '迷榖枝', '闪避 +12%，步数 +1', { dodge: 0.12, steps: 1 }, 'a glowing tree branch with radiant flowers'),
    T(2, 'busiyao', '不死草', '血量上限 +50', { hp: 50 }, 'a luminous immortal herb'),
    T(2, 'leigu', '雷兽鼓', '暴击 +15%', { crit: 0.15 }, 'a drum of thunder beast hide with lightning'),
    T(2, 'jinchan', '金蟾', '每回合 +40 金', { income: 40 }, 'a three-legged golden toad'),
    T(2, 'qinggengyu', '青耕羽', '每回合回 8 血', { regen: 8 }, 'a blue-green feather glowing softly'),
    T(2, 'yuchan', '玉蝉', '技能触发 +10%，经验 +50%', { proc: 0.1, xpMul: 0.5 }, 'a jade cicada carving'),
    T(3, 'xuanyuanjian', '轩辕剑', '攻击 +15，暴击 +10%', { atk: 15, crit: 0.1 }, 'a legendary golden sword with sun and moon on the blade'),
    T(3, 'xirang', '息壤', '自家过路费 +50%，建筑每回合多回血', { tollUp: 0.5, repair: 0.1 }, 'a glowing lump of self-growing magic soil'),
    T(3, 'hetu', '河图', '技能触发 +15%，冷却每回合多减 1', { proc: 0.15, cdFast: 1 }, 'an ancient diagram scroll of dots carried on a dragon horse'),
    T(3, 'luoshu', '洛书', '建造升级便宜 40%', { buildCut: 0.4 }, 'a turtle shell with a magic square of dots'),
    T(3, 'dengzhang', '夸父杖', '步数 +3，每回合回 6 血', { steps: 3, regen: 6 }, 'a giant wooden staff with leaves sprouting'),
    T(3, 'shenshu', '神荼索', '吸血 25%', { lifesteal: 0.25 }, 'a glowing reed rope binding a ghost'),
    T(3, 'jiuding', '九州鼎', '每回合 +100 金，防御 +10%', { income: 100, def: 0.1 }, 'a great bronze tripod cauldron'),
    T(3, 'wangmuyao', '西王母药', '血量上限 +100，每回合回 10 血', { hp: 100, regen: 10 }, 'a jade bottle of the queen mother elixir with a peach'),
  ];
})(typeof window !== 'undefined' ? window : globalThis);
