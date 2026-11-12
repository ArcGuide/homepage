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
    stones: { name: '填海石', stone: true, art: 'a heap of round grey pebbles and stones' },
    candle: { name: '烛', candle: true, art: 'a single tall red candle with a bright flame on a coiled bronze serpent candlestick' },
    grove: { name: '邓林', stop: true, grove: true, art: 'a small dense peach grove growing around a planted wooden staff' },
    ghost: { name: '幽魂', ghost: true, art: 'a small pale teal ghost wisp with a sad face and a long trailing tail floating above an old copper coin' },
  };

  SJ.SKILLS = {
    huangdi: [
      S('zhinan', '指南车', 'passive', 0, `每次打中时 ${pct([0.25, 0.5, 0.75])} 再削掉对手当前血量的 50%`, { pr: [0.25, 0.5, 0.75] }, 'a bronze south-pointing chariot figurine'),
      S('zhucheng', '筑城令', 'passive', 0, `自家建筑守住一次进攻后，有 ${pct([0.1, 0.15, 0.2])} 概率升一级`, { pv: { holdUp: [0.1, 0.15, 0.2] } }, 'a bamboo decree scroll with a red seal over a rammed earth wall'),
      S('chezhen', '车阵', 'summon', 6, `在脚下摆车阵，持续 ${L([5, 7, 9])} 轮。敌人走到这里被拦下，结算完这一格后传送到随机位置`, { go: (g, k) => g.summon('chariot', [5, 7, 9][k]) }, 'a circle of bronze war chariots'),
      S('zhuolu', '涿鹿号令', 'buff', 12, '5 回合内全部自家建筑攻击 +100%，守住后升级的概率再 +20%', { ult: true, go: (g) => { g.buff('towerAtk', 1, 5); g.buff('holdUp', 0.2, 5); } }, 'a great war drum and golden imperial banner'),
    ],
    yinglong: [
      S('baoyu', '暴雨', 'passive', 0, `每下 ${pct([0.15, 0.22, 0.3])} 让对手停手两拍并受伤`, { pr: [0.15, 0.22, 0.3] }, 'a grey storm cloud with many bright blue rain streaks and a lightning bolt'),
      S('xushui', '蓄水', 'econ', 5, `存起全部金币，3 回合后取出，并多得 ${pct([0.15, 0.3, 0.45])}`, { go: (g, k) => g.vault([0.15, 0.3, 0.45][k], 3) }, 'a swirling orb of gathered water held by a dragon claw'),
      S('zhenyi', '振翼', 'move', 5, `向前飞 ${L([6, 9, 12])} 格，无视地形和路障；每飞一格，接下来 3 回合攻击 +2%（飞 ${L([6, 9, 12])} 格就是 +${pct([0.12, 0.18, 0.24])}）`, { go: (g, k) => g.dash([6, 9, 12][k], true, { atk: 0.02 }) }, 'a golden feathered wing beating'),
      S('yifu', '翼覆千里', 'move', 12, '6 回合内飞行，步数翻倍，路过的自家 1 级建筑免费升到 2 级', { ult: true, go: (g) => { g.buff('fly', 1, 6); g.buff('stepMul', 1, 6); g.buff('autoUp', 1, 6); } }, 'huge golden wings spread across the sky'),
    ],
    nuba: [
      S('dahan', '大旱', 'passive', 0, `敌方攻击有 ${pct([0.06, 0.09, 0.12])} 落空`, { pv: { dodge: [0.06, 0.09, 0.12] } }, 'a blazing sun over cracked dry earth'),
      S('fenshen', '焚身', 'buff', 5, `${L([2, 3, 4])} 回合内，路过的敌方建筑每座掉 ${L([10, 15, 20])} 血`, { go: (g, k) => g.buff('scorch', [10, 15, 20][k], [2, 3, 4][k]) }, 'a woman silhouette wrapped in flames'),
      S('chidi', '赤足', 'buff', 6, `${L([3, 4, 5])} 回合内走过的格子留下火焰，敌人踩到掉 2 血，火焰留 3 轮`, { go: (g, k) => g.buff('trail', 1, [3, 4, 5][k]) }, 'a ring of fire on red earth'),
      S('qianli', '赤地千里', 'econ', 12, '3 轮内，其他所有玩家每回合的收入全归你', { ult: true, go: (g) => g.buff('qianli', 1, 3) }, 'a parched red landscape with withered crops under a huge sun'),
    ],
    chiyou: [
      S('bingqi', '饮血兵锋', 'passive', 0, `每次出手献出当前血量的 10%，对敌人多造成献血量 ${pct([1.25, 1.5, 1.75])} 的伤害`, { pv: { bloodEdge: [1.25, 1.5, 1.75] } }, 'a whirlwind of bronze weapons'),
      S('xueji', '血祭', 'passive', 0, `每次出手有 20% 概率献出 5% 最大血，连打 ${L([2, 3, 4])} 下`, { pv: { rage: [2, 3, 4] } }, 'a blood-filled bronze ritual cauldron'),
      S('tietou', '吞天噬地', 'passive', 0, `打死对手后把它吞下，回复对手最大血 ${pct([0.1, 0.2, 0.3])} 的血`, { pv: { devour: [0.1, 0.2, 0.3] } }, 'a huge horned bronze demon mouth swallowing a mountain'),
      S('bingzhu', '兵主降世', 'buff', 12, '6 回合内攻击 +25%、暴击 +25%；这期间免疫一切负面状态，自己的技能也不再伤到自己，走路不会被别人的技能和物品拦下', { ult: true, go: (g) => { g.cleanse(); g.buff('avatar', 0.25, 6); } }, 'a giant demon war god silhouette with many weapons, red glow'),
    ],
    xingtian: [
      S('duanshou', '断首再战', 'buff', 5, `被动：血越少攻击越高，最多 +${pct([0.5, 0.8, 1.2])}。主动：3 回合内，交战的对手因无首的恐惧，攻击和防御各降 ${pct([0.2, 0.3, 0.4])}`, { pv: { lowHp: [0.5, 0.8, 1.2] }, go: (g, k) => g.buff('fear', [0.2, 0.3, 0.4][k], 3) }, 'a headless torso with a roaring face on the chest'),
      S('ganqi', '干戚舞', 'buff', 5, `被动：反弹伤害，血越少反弹越多，最多 ${pct([0.35, 0.55, 0.75])}。主动：3 回合内攻击和闪避各 +${pct([0.05, 0.1, 0.15])}`, { pv: { thornLow: [0.35, 0.55, 0.75] }, go: (g, k) => { g.buff('atkPct', [0.05, 0.1, 0.15][k], 3); g.buff('dodge', [0.05, 0.1, 0.15][k], 3); } }, 'a crossed battle axe and round shield'),
      S('mengzhi', '猛志', 'buff', 6, `被动：血越少暴击越高，最多 +${pct([0.15, 0.3, 0.45])}。主动：3 回合内吸收全部伤害，结束时一次受到吸收总量的 ${pct([1, 0.75, 0.5])}`, { pv: { critLow: [0.15, 0.3, 0.45] }, go: (g, k) => g.buff('absorb', [1, 0.75, 0.5][k], 3) }, 'a charging warrior silhouette with dust'),
      S('xingyao', '形夭', 'buff', 12, '血量高于 20% 才能用：血量降到 20%，多出的血存起来。12 回合内，每回合结束时血量低于 20% 就从存量补到 20%，到期存量清零', { ult: true, can: (p) => p.hp > p.maxhp * 0.2, go: (g) => g.pool(12) }, 'a headless giant rising with blazing spirit'),
    ],
    kuafu: [
      S('zhuiri', '大步', 'passive', 0, `每次步数 +${L([1, 2, 3])}`, { pv: { steps: [1, 2, 3] } }, 'a giant bare foot in a long running stride kicking up golden dust, side view'),
      S('denglin', '弃杖成林', 'summon', 8, `在脚下种邓林：敌人被拦下，自己路过回 30 血，持续 ${L([4, 6, 8])} 轮`, { go: (g, k) => { g.summon('grove', [4, 6, 8][k]); } }, 'a wooden staff sprouting into a peach grove'),
      S('benpao', '逐日', 'move', 8, `向前跑 ${L([12, 24, 36])} 格，每格回 1% 最大血，跑完转身。路上碰到的宝箱、英雄、召唤物、驿站和地形照常生效`, { go: (g, k) => g.dash([12, 24, 36][k], false, { heal: 0.01, turn: true }) }, 'a running giant toward a red sun'),
      S('yuri', '与日逐走', 'buff', 12, '这回合结束后再连走 2 个完整回合', { ult: true, go: (g) => g.turns(2) }, 'a giant running hard beneath three blazing suns in the sky, long shadow'),
    ],
    tubo: [
      S('fanzhen', '幽魂劫财', 'summon', 8, `从地府放出 ${L([3, 5, 7])} 个幽魂，散在地图各处，留 7 轮。幽魂前后 2 格内，其他玩家付钱（过路费、买地、升级）时，这笔钱被幽魂劫给土伯，幽魂随后消失`, { go: (g, k) => g.ghosts([3, 5, 7][k], 7) }, 'a pale teal ghost clutching an old copper coin'),
      S('tufu', '土府', 'summon', [7, 5, 3], '只能站在自家建筑上用：把它改建成同等级的【土府】。土府是驻军、射手、城邑的结合：防御比驻军弱、比射手和城邑强，攻击比射手弱、比驻军和城邑强，还能产城邑一半的金', { can: (p, s) => s && SJ.canTufu(s, p), go: (g) => g.tufu() }, 'a dark stone underground gate'),
      S('zhenmu', '镇墓兽', 'summon', 6, `在脚下放镇墓兽，拦下敌人并吸走 ${L([20, 30, 40])} 血给自己。持续 9 轮，被碰到就消失`, { go: (g, k) => g.summon('beast', 9, [20, 30, 40][k]) }, 'an antlered tomb guardian beast'),
      S('chiling', '打开幽都之门', 'summon', 12, `在身后放出一头双头生翼的玄虎：${SJ.TIGER.hp} 血、${SJ.TIGER.atk} 攻击，每轮只走一格。停在任何人的建筑上（包括土伯自己的）就和它打 3 下，拆掉的地变回无主。玄虎不归土伯管，一直走到死为止`, { ult: true, go: (g) => g.tiger() }, 'a huge black tiger with glowing teal eyes leaping out of a dark stone underworld gate'),
    ],
    xiangliu: [
      S('jiutou', '九首连噬', 'passive', 0, `一场战斗里越打越狠：第 1 下额外 +${L([0.2, 0.4, 0.6])} 伤害，第 2 下 +${L([0.6, 1.2, 1.8])}，第 3 下 +${L([1.2, 2.4, 3.6])}，依次累加`, { pv: { stackHit: [0.2, 0.4, 0.6] } }, 'nine snake heads striking together'),
      S('duxue', '噬血', 'buff', 5, `3 回合内吸血 ${pct([0.2, 0.3, 0.4])}`, { go: (g, k) => { g.buff('lifesteal', [0.2, 0.3, 0.4][k], 3); } }, 'fangs dripping green and red venom'),
      S('duze', '毒泽', 'summon', 6, `在脚下和前后各一格吐出毒泽，共 3 格，持续 ${L([3, 4, 5])} 轮。敌人走过后，接下来 3 回合的收入全归相柳，不掉血`, { go: (g, k) => g.spread('poison', [3, 4, 5][k]) }, 'a bubbling green poison swamp'),
      S('tunshan', '九首吞山', 'buff', 12, '4 回合内每次出手都连打 9 段，每段攻击力 12%', { ult: true, go: (g) => g.buff('nine', 1, 4) }, 'a nine-headed serpent devouring a mountain'),
    ],
    yayu: [
      S('fusheng', '不死灵药', 'heal', 8, `花掉 10% 金币，回 ${pct([0.25, 0.3, 0.35])} 最大血。其他玩家都要付同样的钱给你，付得起的回你这次回血量的一半；付不起的交出全部金币，不回血`, { go: (g, k) => g.elixir(0.1, [0.25, 0.3, 0.35][k]) }, 'a glowing jade medicine bottle'),
      S('huanhun', '死而复生', 'passive', 0, `阵亡时以 25% 血复活，代价是随机毁掉自家建筑：第一次 3 座，之后每复活一次永久多 ${L([6, 5, 4])} 座，毁掉的地变回无主；建筑不够这个数就复活不了。每复活一次攻击永久 +2。毁掉的建筑会触发【向死而生】`, { sacUp: [6, 5, 4] }, 'a glowing soul returning to a beast skeleton'),
      S('jizou', '还魂疾走', 'move', 6, `向前奔 ${L([6, 9, 12])} 格，每格献出 5% 最大血，得 100 金`, { go: (g, k) => { g.dash([6, 9, 12][k], false, { bloodGold: [0.05, 100] }); } }, 'running beast legs with dust'),
      S('busi', '向死而生', 'buff', 12, '被动：自家建筑被毁时 30% 概率原地重生成 1 级建筑；因【死而复生】毁掉的建筑重生时保留原等级，再升一级。主动：5 回合内每回合献出 10% 最大血和 10% 金币，重生概率每回合再 +10%；结束后扣掉的血和钱不回来，概率回到 30%', { ult: true, pv: { reborn: [0.3] }, go: (g) => g.buff('deathRite', 0, 5) }, 'a bone rising from red earth with a green sprout'),
    ],
    jiuweihu: [
      S('meihuo', '魅惑', 'passive', 0, `开战时 ${pct([0.08, 0.12, 0.16])} 让塔直接归降`, { pr: [0.08, 0.12, 0.16] }, 'a fox eye with a pink glowing charm'),
      S('humei', '狐媚', 'summon', 5, `在地图随机位置变出一个九尾狐虚影，带着你此刻金币 ${pct([1, 2, 3])} 的钱（凭空变出）。虚影每轮自己掷骰走路，路过敌方建筑就从身上交过路费（对手拿不到），钱花完就消散。虚影和九尾狐相遇时，剩下的钱全归九尾狐。同时只能有一个虚影`, { go: (g, k) => g.phantom([1, 2, 3][k]) }, 'a white fox tail wrapping gold coins'),
      S('huanxing', '幻形', 'move', [5, 3, 1], '向前闪 3 格并转身，升级缩短冷却', { go: (g) => g.dash(3, true, { turn: true }) }, 'a fox silhouette dissolving into pale mist'),
      S('tianhu', '九尾天狐', 'econ', 15, '随机获得 3 块无主领地，各自动建一座 1 级建筑；无主领地不够时，每少一块就免费升级一座自家建筑', { ult: true, go: (g) => g.claimLand(3) }, 'nine glowing fox tails fanned around a moon'),
    ],
    jingwei: [
      S('xianshi', '衔石', 'passive', 0, `战斗中每下 ${pct([0.1, 0.15, 0.2])} 对敌人造成其最大血 9% 的伤害`, { pr: [0.1, 0.15, 0.2] }, 'a small bird carrying a pebble'),
      S('tianhai', '填海', 'summon', 5, `在身后连放 3 块石头，${L([9, 7, 5])} 轮后自然消失。敌方英雄停在石头上（路过不算），石头碎掉，他掉 ${pct([0.03, 0.06, 0.09])} 最大血、交 ${pct([0.03, 0.06, 0.09])} 金币给你。石头自然消失时看脚下：无主领地归你；你的地建筑升一级；敌人的地建筑掉 25% 血；其他格子什么都不发生`, { go: (g, k) => g.behind('stones', 3, [9, 7, 5][k] - (g.lv(3) ? 1 : 0), [0.03, 0.06, 0.09][k]) }, 'a pile of round pebbles in waves'),
      S('zhanchi', '展翅', 'buff', 5, `${L([1, 2, 3])} 回合内飞在空中，停下时什么都不触发：不战斗、不交过路费，也不买地、不遇异兽`, { go: (g, k) => g.buff('soar', 1, [1, 2, 3][k]) }, 'small bird wings in flight over sea'),
      S('buqu', '志不可夺', 'passive', 0, '强化其他三个技能：衔石伤害变为最大血 17%；填海的石头少等 1 轮；展翅时自家和中立的格子照常结算', { ult: true }, 'a tiny bird defiantly facing a huge ocean wave'),
    ],
    zhulong: [
      S('zhengyan', '睁眼一击', 'buff', 5, `在脚下放一个【烛】；3 回合内攻击和防御各 +${pct([0.08, 0.12, 0.16])}。学会后所有【烛】都有这个特点：烛龙在【烛】前后 2 格内攻击和防御各 +${pct([0.04, 0.08, 0.12])}`, { pv: { candleNear: [0.04, 0.08, 0.12] }, go: (g, k) => { g.candle(); g.buff('atkPct', [0.08, 0.12, 0.16][k], 3); g.buff('def', [0.08, 0.12, 0.16][k], 3); } }, 'a huge glowing eye opening'),
      S('zhuzhao', '烛照', 'buff', 5, `在脚下放一个【烛】；3 回合内暴击率 +${pct([0.05, 0.1, 0.15])}。学会后所有【烛】都有这个特点：烛龙在【烛】前后 2 格内付的过路费减 ${pct([0.15, 0.3, 0.45])}`, { pv: { candleToll: [0.15, 0.3, 0.45] }, go: (g, k) => { g.candle(); g.buff('crit', [0.05, 0.1, 0.15][k], 3); } }, 'a burning candle held in a serpent mouth'),
      S('xianzhu', '衔烛夜行', 'move', 5, `向前游 ${L([6, 9, 12])} 格，在起点和终点各留一个【烛】。学会后所有【烛】都有这个特点：其他英雄停在【烛】上，传送到随机另一个【烛】并掉 ${L([5, 10, 15])} 血，这两个【烛】随后消失`, { pv: { candleHurt: [5, 10, 15] }, go: (g, k) => { g.candle(); g.dash([6, 9, 12][k], false, { candle: true }); } }, 'a red serpent gliding through night with a candle'),
      S('zhuyin', '烛阴闭目', 'buff', 12, '回收地图上所有【烛】，每个让最大血永久 +2、攻击永久 +0.2', { ult: true, go: (g) => g.reclaim() }, 'a giant closed serpent eye in a dark sky'),
    ],
  };

  // 宝物分阶：1 阶是消耗品（宝铺送，见 CONSUMABLES）；2 阶打异兽；3 阶满级城邑；4 阶只在宝箱、地标、大事件里出现；5 阶神器只在大型地图的宝箱里
  const T = (tier, id, name, desc, fx, ic) => Object.assign({ tier, id, name, desc, ic }, fx);
  SJ.TREASURES = [
    T(2, 'tongjian', '青铜剑', '攻击 +3', { atk: 3 }, 'a short bronze sword'),
    T(2, 'xijia', '犀甲', '防御 +6%', { def: 0.06 }, 'an ancient brown leather lamellar cuirass made of overlapping laced plates'),
    T(2, 'yupei', '玉佩', '闪避 +6%', { dodge: 0.06 }, 'a round pale green jade bi disc with a hole in the center and a red silk tassel'),
    T(2, 'chiyu', '赤玉', '血量上限 +25', { hp: 25 }, 'a red jade stone'),
    T(2, 'sinan', '司南', '技能触发 +5%', { proc: 0.05 }, 'an ancient spoon compass on a bronze plate'),
    T(2, 'chanbi', '蟾蜍钱', '每回合 +15 金', { income: 15 }, 'a small toad sitting on old coins'),
    T(2, 'caolv', '芒鞋', '步数 +1', { steps: 1 }, 'a pair of straw sandals'),
    T(2, 'zhuyu', '祝余草', '每回合回 3 血', { regen: 3 }, 'a healing herb sprig'),
    T(3, 'kunwu', '昆吾剑', '攻击 +7', { atk: 7 }, 'a red-glowing sword that cuts jade'),
    T(3, 'xuanjia', '玄甲', '防御 +14%', { def: 0.14 }, 'an ancient black iron lamellar cuirass made of overlapping small plates with gold lacing'),
    T(3, 'miguzhi', '迷榖枝', '闪避 +12%，步数 +1', { dodge: 0.12, steps: 1 }, 'a glowing tree branch with radiant flowers'),
    T(3, 'busiyao', '不死草', '血量上限 +50', { hp: 50 }, 'a luminous immortal herb'),
    T(3, 'leigu', '雷兽鼓', '暴击 +15%', { crit: 0.15 }, 'a drum of thunder beast hide with lightning'),
    T(3, 'jinchan', '金蟾', '每回合 +40 金', { income: 40 }, 'a three-legged golden toad'),
    T(3, 'qinggengyu', '青耕羽', '每回合回 8 血', { regen: 8 }, 'a blue-green feather glowing softly'),
    T(3, 'yuchan', '玉蝉', '技能触发 +10%，经验 +50%', { proc: 0.1, xpMul: 0.5 }, 'a jade cicada carving'),
    T(4, 'xuanyuanjian', '轩辕剑', '攻击 +15，暴击 +10%', { atk: 15, crit: 0.1 }, 'a legendary golden sword with sun and moon on the blade'),
    T(4, 'xirang', '息壤', '自家过路费 +50%，建筑每回合多回血', { tollUp: 0.5, repair: 0.1 }, 'a glowing lump of self-growing magic soil'),
    T(4, 'hetu', '河图', '技能触发 +15%，冷却每回合多减 1', { proc: 0.15, cdFast: 1 }, 'an ancient diagram scroll of dots carried on a dragon horse'),
    T(4, 'luoshu', '洛书', '建造升级便宜 40%', { buildCut: 0.4 }, 'a turtle shell with a magic square of dots'),
    T(4, 'dengzhang', '夸父杖', '步数 +3，每回合回 6 血', { steps: 3, regen: 6 }, 'a giant wooden staff with leaves sprouting'),
    T(4, 'shenshu', '神荼索', '吸血 25%', { lifesteal: 0.25 }, 'a glowing reed rope binding a ghost'),
    T(4, 'jiuding', '九州鼎', '每回合 +100 金，防御 +10%', { income: 100, def: 0.1 }, 'a great bronze tripod cauldron'),
    T(4, 'wangmuyao', '西王母药', '血量上限 +100，每回合回 10 血', { hp: 100, regen: 10 }, 'a jade bottle of the queen mother elixir with a peach'),
    T(4, 'xinghuhui', '星弧徽章', '所有经验 +100%，技能触发 +10%', { xpMul: 1, proc: 0.1 }, 'a round silver academy badge with a glowing star arc emblem'),
  ];

  // 1 阶：消耗品。路过宝铺得 1 个，停下得 2 个；最多带 4 个，满了再拿到就没了。点一下马上用掉
  const C = (id, name, desc, ic) => ({ id, name, desc, ic, tier: 1 });
  SJ.CONSUMABLES = [
    C('huichun', '回春丹', '回 15% 最大血', 'a small round red pill glowing softly on a jade dish'),
    C('zhuanxiang', '转向符', '马上掉头，往反方向走', 'a yellow paper talisman with a red curved arrow painted on it'),
    C('shenxing', '神行符', '3 回合内每次步数 +3', 'a yellow paper talisman with a running horse painted in red ink'),
    C('shisha', '时砂', '随机一个正在冷却的技能马上清零（大招除外）；没有能清的就散掉', 'a small bronze hourglass with glowing golden sand'),
    C('wangchuan', '忘川水', '洗点：收回全部技能点，重新学', 'a small black clay bottle of misty river water'),
    C('jiedu', '解毒草', '清除所有负面状态', 'a sprig of green herb with white flowers'),
  ];

  // 5 阶：神器。只在大型地图的后期宝箱里出现，每个英雄一局最多拿到一次，不占宝物栏
  const AR = (id, name, desc, n, ic) => ({ id, name, desc, n, ic, tier: 5 });
  SJ.ARTIFACTS = [
    AR('xinghuzhui', '星弧吊坠', '12 轮内，路过的自家 1 级建筑自动升到 2 级，然后消失', 12, 'a glowing pendant shaped like a silver star arc on a fine chain'),
    AR('busishu', '不死树果', '阵亡时以满血和 1000 金复活，用后消失', null, 'a glowing golden fruit from the immortal tree of Kunlun with jade leaves'),
    AR('xinghupan', '星弧星盘', '12 轮内，技能冷却每回合多减 2，然后消失', 12, 'a bronze astrolabe plate engraved with a star arc and constellations, glowing'),
  ];
  // 给玩家看的技能说明：有点故事味。上面的 desc 是精确规则，留给设计文档和批注表
  SJ.SAY = {
    zhinan: '黄帝造指南车，大雾里也认得准要害。每次打中，有 25% / 50% / 75% 的机会再削掉对手眼下一半的血。',
    zhucheng: '黄帝下令筑城。自家建筑每守住一次进攻，有 10% / 15% / 20% 的机会再加高一级。',
    chezhen: '战车围成一圈，在脚下摆 5 / 7 / 9 轮。闯进来的敌人被拦住，办完这一格的事，就被冲散到地图上随便哪里。',
    zhuolu: '涿鹿战鼓一响，5 回合内自家所有建筑攻击翻倍，守住进攻后加高一级的机会再多 20%。',
    baoyu: '应龙一甩尾，暴雨倾盆。每次出手有 15% / 22% / 30% 的机会把对手淋得停手两拍，还要受伤。',
    xushui: '应龙把全部金币像水一样蓄起来，3 回合后开闸放出，多出 15% / 30% / 45%。',
    zhenyi: '应龙振翼高飞，向前飞 6 / 9 / 12 格，地形和路障都拦不住。飞过的每一格，都让接下来 3 回合的攻击 +2%。',
    yifu: '应龙双翼遮天，6 回合内飞行、步数翻倍，掠过的自家 1 级建筑都长成 2 级。',
    dahan: '女魃所到之处一片大旱，敌人热得眼花，出手有 6% / 9% / 12% 打空。',
    fenshen: '女魃浑身燃起旱火，2 / 3 / 4 回合内路过的敌方建筑，每座被烤掉 10 / 15 / 20 血。',
    chidi: '女魃赤足走过的地方会烧起来。3 / 4 / 5 回合内留下的火能烧 3 轮，敌人踩上去掉 2 血。',
    qianli: '赤地千里，颗粒无收。3 轮内，其他所有玩家每回合的收入，都流进女魃的口袋。',
    bingqi: '蚩尤以血饲刃。每次出手先割下自己眼下一成的血，再把它化成 125% / 150% / 175% 的伤害砍向对手。',
    xueji: '杀到兴起，蚩尤有 20% 的机会献上 5% 最大血，一口气连砍 2 / 3 / 4 下。',
    tietou: '蚩尤铜头铁额，连对手也吞得下。打死对手后一口吞掉，回复对手最大血 10% / 20% / 30% 的血。',
    bingzhu: '兵主真身降世。6 回合内攻击和暴击各 +25%，什么负面状态都沾不上身，自己的技能不再伤到自己，别人的技能和物品也拦不住他的路。',
    duanshou: '没了头照样打。被动：血越少攻击越高，最多 +50% / 80% / 120%。主动：3 回合内，和他交手的对手被无头巨人吓破了胆，攻击和防御各降 20% / 30% / 40%。',
    ganqi: '刑天舞干戚，伤得越重越不好惹。被动：把伤害弹回去，血越少弹得越多，最多 35% / 55% / 75%。主动：3 回合内攻击和闪避各 +5% / 10% / 15%。',
    mengzhi: '猛志固常在。被动：血越少越容易暴击，最多 +15% / 30% / 45%。主动：3 回合内硬扛下所有伤害，到时候再一次吃下其中的 100% / 75% / 50%。',
    xingyao: '刑天把血气压到两成，多出来的藏进胸腹。12 回合内，每回合结束时血量低于两成，就从藏着的血里补回两成；到期没用完的就散了。血量高于两成才能用。',
    zhuiri: '夸父一步顶别人几步，每次掷骰多走 1 / 2 / 3 步。',
    denglin: '夸父扔下手杖，脚下长出一片邓林，留 4 / 6 / 8 轮。敌人走到这里被林子拦住，夸父自己路过能歇脚回 30 血。',
    benpao: '夸父追着太阳狂奔，向前跑 12 / 24 / 36 格，每跑一格回 1% 最大血，跑完转身。路上碰到什么，照样发生什么。',
    yuri: '夸父与日竞走，这回合结束后，再连走 2 个完整回合。',
    fanzhen: '土伯放出 3 / 5 / 7 个幽魂，散落四方 7 轮。谁在幽魂附近掏钱，过路费、买地、升级都算，这笔钱就被幽魂劫去献给土伯。',
    tufu: '土伯站在自家建筑上，把它改成同等级的幽都土府：守得住，打得疼，还能产一点金。',
    zhenmu: '土伯在脚下立起镇墓兽，守 9 轮。第一个撞上来的敌人被拦下，被吸走 20 / 30 / 40 血给土伯，镇墓兽随后离去。',
    chiling: '土伯打开幽都的大门，在身后放出一只连自己都无法控制的猛兽玄虎。玄虎一次只走一格，和遇到的建筑战斗，不管是谁家的。',
    jiutou: '相柳九个头轮番咬上来，一场仗里越咬越狠：第 1 下多咬 0.2 / 0.4 / 0.6 伤害，第 2 下多 0.6 / 1.2 / 1.8，第 3 下多 1.2 / 2.4 / 3.6，一直往上叠。',
    duxue: '相柳毒牙见血，3 回合内吸血 20% / 30% / 40%。',
    duze: '相柳吐出一片毒泽，盖住脚下和前后各一格，留 3 / 4 / 5 轮。敌人蹚过毒泽不掉血，但接下来 3 回合的收入都归相柳。',
    tunshan: '九个头一齐张口吞山。4 回合内每次出手都连咬 9 口，每口是 12% 的攻击力。',
    fusheng: '窫窳花一成金币熬一炉不死药，回 25% / 30% / 35% 最大血。别的玩家都得掏同样多的钱来讨一口：掏得起的回窫窳这次回血量的一半，掏不起的交出全部金币，一口也喝不上。',
    huanhun: '窫窳死了还能活过来，带着 25% 的血复活，代价是自家建筑随机塌掉：第一次 3 座，之后每复活一次多塌 6 / 5 / 4 座，建筑不够就活不过来。每活一次，攻击永久 +2。',
    jizou: '窫窳一路狂奔 6 / 9 / 12 格，每格献出 5% 最大血，换 100 金。',
    busi: '窫窳的地盘也不肯轻易死去。被动：自家建筑被毁时，有 30% 的机会原地重生；因【死而复生】塌掉的建筑，重生时还会再升一级。主动：5 回合内每回合献出一成血和一成金币，重生的机会每回合再多 10%。',
    meihuo: '九尾狐一个眼神，塔就心软了。开战时有 8% / 12% / 16% 的机会让塔直接归降。',
    humei: '九尾狐在地图某处变出一个虚影，身上凭空带着九尾狐此刻金币 1 / 2 / 3 倍的钱。虚影自己掷骰乱走，路过敌方建筑就从身上掏过路费，钱花完就散了；要是和九尾狐撞上，剩下的钱全归九尾狐。同时只能有一个虚影。',
    huanxing: '九尾狐身形一晃，已经在 3 格之外，还转过了身。技能越高，冷却越短。',
    tianhu: '九尾全开，天下归心。随机得到 3 块无主领地，各建一座 1 级建筑；无主的地不够，每少一块就免费升级一座自家建筑。',
    xianshi: '精卫衔石掷下，每次出手有 10% / 15% / 20% 的机会砸掉对手 9% 的最大血。',
    tianhai: '精卫在身后连放 3 块石头。敌人停在石头上，石头碎掉，他掉 3% / 6% / 9% 最大血，还要交 3% / 6% / 9% 金币给精卫。石头 9 / 7 / 5 轮后自己沉下去：沉在无主的地上，地归精卫；沉在精卫的地上，建筑升一级；沉在敌人的地上，建筑掉 25% 血。',
    zhanchi: '精卫振翅高飞，1 / 2 / 3 回合内落在哪里都不沾地：不打架、不交过路费，也不买地、不遇异兽。',
    buqu: '精卫填海，志不可夺。衔石砸掉的血变成 17%，填海的石头早 1 轮沉下，展翅时落在自家和中立的格子照常结算。',
    zhengyan: '烛龙一睁眼，天就亮了。在脚下放一支【烛】，3 回合内攻击和防御各 +8% / 12% / 16%。学会后，烛龙在任何【烛】前后 2 格内，攻击和防御各 +4% / 8% / 12%。',
    zhuzhao: '在脚下放一支【烛】，3 回合内暴击 +5% / 10% / 15%。学会后，烛龙在任何【烛】前后 2 格内，付的过路费少 15% / 30% / 45%。',
    xianzhu: '烛龙衔烛夜行，向前游 6 / 9 / 12 格，在起点和终点各留一支【烛】。学会后，别的英雄停在【烛】上，会被烛光卷到另一支【烛】，掉 5 / 10 / 15 血，两支【烛】随后熄灭。',
    zhuyin: '烛龙闭眼，天就黑了。收回地图上所有的【烛】，每支让最大血永久 +2、攻击永久 +0.2。',
  };
  for (const h in SJ.SKILLS) for (const k of SJ.SKILLS[h]) k.say = SJ.SAY[k.id] || k.desc;
})(typeof window !== 'undefined' ? window : globalThis);
