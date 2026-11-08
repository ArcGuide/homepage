// 建筑数据：4 种族 × 5 分支 × (Lv1, Lv2, Lv3 二选一) = 80 种，另有各族学宫都能选的星弧学院。纯数据，调平衡改这里。
(function (g) {
  const SJ = g.SJ = g.SJ || {};

  SJ.BRANCHES = {
    garrison: { name: '驻军', hint: '低攻高防，难打穿', hp: 90, atk: 1 },
    archer: { name: '射手', hint: '高攻低防，会杀人', hp: 50, atk: 5 },
    magic: { name: '巫术', hint: '挂 debuff，带回棋盘', hp: 70, atk: 2 },
    city: { name: '城邑', hint: '每回合产金，容易被拆', hp: 60, atk: 0.5 },
    academy: { name: '学宫', hint: '强化英雄，被拆失效', hp: 60, atk: 0.5 },
  };
  SJ.LEVEL_MUL = [0, 1, 1.6, 2.5];
  SJ.BUILD_COST = [0, 0, 120, 200]; // 1 级拿到地就免费随机建
  SJ.CITY_INCOME = [0, 30, 60, 100];
  SJ.TOLL = [15, 30, 70, 140]; // 下标 0 是空地基

  // [分支, Lv1 名, Lv2 名, 种族特色说明, Lv1 效果, Lv2 效果, Lv1 外观, Lv2 外观, Lv3a, Lv3b]
  const T = {
    xuanyuan: [
      ['garrison', '持戈营', '甲士营', '相邻有自家建筑时防御提高', { adjDef: 0.08 }, { adjDef: 0.12 },
        'a small rammed-earth camp with a low wall and bronze halberds in a rack',
        'a walled barracks of rammed earth with a tiled gatehouse and bronze armor stands',
        { name: '九宫阵', desc: '相邻每有一座自家建筑，防御大幅提高', fx: { adjDef: 0.2 }, art: 'a square fortress laid out as a three by three grid of walled courtyards with yellow battle flags' },
        { name: '夯土城', desc: '英雄打不穿时，额外停一回合', fx: { adjDef: 0.12, failSkip: 1 }, art: 'a massive thick rammed-earth city wall with a heavy timber gate and a watchtower' }],
      ['archer', '弓手哨', '弩兵楼', '相邻有自家驻军时攻击提高', { adjAtk: 0.25 }, { adjAtk: 0.35 },
        'a simple timber lookout platform with bows and quivers',
        'a two-storey timber tower with crossbow slits and a tiled roof',
        { name: '连弩楼', desc: '攻速极快，每回合射两次', fx: { adjAtk: 0.35, multi: 2 }, art: 'a tall tower bristling with mounted repeating crossbows on every side' },
        { name: '夔鼓台', desc: '鼓声每 3 秒震晕英雄一次', fx: { adjAtk: 0.35, stunEvery: 3 }, art: 'a raised platform with one gigantic war drum made of beast hide, lightning sparks around it' }],
      ['magic', '卜祝棚', '太卜祠', '虚弱：英雄攻击下降', { status: 'weak', turns: 1 }, { status: 'weak', turns: 2 },
        'a small thatched diviner hut with oracle bones and a tripod',
        'a small lacquered shrine with a large bronze ding cauldron and incense smoke',
        { name: '祝由坛', desc: '战斗中英雄攻击大幅下降，虚弱 3 回合', fx: { status: 'weak', turns: 3, atkDown: 0.35 }, art: 'a round stone altar with talisman poles and glowing golden sigils' },
        { name: '河图台', desc: '封印英雄的概率技能', fx: { status: 'seal', turns: 2, seal: 1 }, art: 'a stone terrace with a huge round stone tablet carved with dots and a dragon-horse statue' }],
      ['city', '农邑', '邦邑', '相邻每有一座自家建筑，多产 5 金', { adjIncome: 5 }, { adjIncome: 8 },
        'a small farming village of thatched houses and a millet field',
        'a walled town with tiled houses and a granary',
        { name: '铜山', desc: '产金最高', fx: { adjIncome: 8, incomeMul: 1.6 }, art: 'a small mountain with a copper mine entrance, furnaces and piles of shining bronze ingots' },
        { name: '大市', desc: '过路费翻倍', fx: { adjIncome: 8, tollMul: 4 }, art: 'a busy market town square with red awnings, stalls and stacks of cowrie shell money' }],
      ['academy', '结绳堂', '造字台', '英雄攻防小幅提高', { heroAtk: 0.06, heroDef: 0.04 }, { heroAtk: 0.1, heroDef: 0.06 },
        'a small hall with knotted ropes hanging from its eaves',
        'a terrace with stone tablets carved with ancient pictographs',
        { name: '兵法堂', desc: '英雄攻防提高', fx: { heroAtk: 0.2, heroDef: 0.12 }, art: 'a grand war-council hall with bamboo scrolls and a sand table of mountains' },
        { name: '观星台', desc: '英雄技能触发率提高', fx: { heroAtk: 0.1, heroDef: 0.06, heroProc: 0.12 }, art: 'a tall stone observatory platform with a bronze armillary sphere' }],
    ],
    jiuli: [
      ['garrison', '蛮牙寨', '铁额哨', '受击时反伤', { thorns: 0.15 }, { thorns: 0.25 },
        'a small stockade of sharpened logs with boar tusks',
        'a squat iron-plated outpost with a giant horned iron helmet on its roof',
        { name: '铜额营', desc: '受击时大幅反伤', fx: { thorns: 0.5 }, art: 'a fortress shaped like a huge bronze horned head with spikes everywhere' },
        { name: '血旗寨', desc: '英雄打输时抢走双倍金币', fx: { thorns: 0.25, loseMul: 3 }, art: 'a war camp with towering blood-red banners and a skull drum' }],
      ['archer', '投石哨', '飞矛楼', '暴击率提高', { crit: 0.15 }, { crit: 0.25 },
        'a rough wooden sling platform with piles of round stones',
        'a spiked tower with racks of bronze javelins and a large throwing arm',
        { name: '飞石台', desc: '暴击率极高', fx: { crit: 0.55 }, art: 'a huge bronze and timber catapult on a stone platform' },
        { name: '火油台', desc: '灼烧：英雄之后 3 回合掉血', fx: { crit: 0.25, status: 'burn', turns: 3 }, art: 'a dark iron tower with burning oil cauldrons and flaming pots' }],
      ['magic', '蛊巫棚', '烟瘴台', '致盲：英雄攻击有概率落空', { status: 'blind', turns: 1 }, { status: 'blind', turns: 2 },
        'a crooked hut with hanging clay jars and insects',
        'a blackened stone platform pouring thick purple smoke from clay vents',
        { name: '大雾阵', desc: '英雄攻击经常落空', fx: { status: 'blind', turns: 2, missNow: 0.4 }, art: 'a ring of black totem poles exhaling a thick fog' },
        { name: '风雨坛', desc: '英雄之后两回合步数 -2', fx: { status: 'slow', turns: 2 }, art: 'an altar under a small dark storm cloud with spinning wind and rain' }],
      ['city', '矿洞', '铜坑', '自家英雄打赢时多得金币', { winBonus: 15 }, { winBonus: 30 },
        'a small mine entrance with wooden supports and a cart of ore',
        'a deep open-pit copper mine with ladders and glowing ore',
        { name: '冶铁炉', desc: '产金，同时提高自家英雄攻击', fx: { winBonus: 30, heroAtk: 0.14 }, art: 'a giant roaring forge with molten metal and black iron anvils' },
        { name: '掠市', desc: '自家英雄每次打赢，多抢一大笔', fx: { winBonus: 90 }, art: 'a plunder bazaar of tents heaped with stolen gold and weapons' }],
      ['academy', '磨兵石', '五兵坊', '英雄攻击提高', { heroAtk: 0.08 }, { heroAtk: 0.14 },
        'a huge whetstone under a rough shelter with blades leaning on it',
        'a weapon workshop with five kinds of bronze weapons on display',
        { name: '战鼓堂', desc: '英雄打赢后回血', fx: { heroAtk: 0.14, winHeal: 20 }, art: 'a hall of giant red war drums and bronze horns' },
        { name: '血祭台', desc: '英雄血越少攻击越高', fx: { heroAtk: 0.14, lowHpAtk: 0.8 }, art: 'a dark sacrificial stone altar with red glowing grooves and horned idols' }],
    ],
    youdu: [
      ['garrison', '魍魉窟', '白骨墙', '战斗中缓慢回血', { regen: 2 }, { regen: 3 },
        'a small dark cave mouth with tiny glowing eyes and stones',
        'a defensive wall built of stacked giant white bones and dark stone',
        { name: '白骨门', desc: '被摧毁后下回合降一级重生', fx: { regen: 3, respawn: 1 }, art: 'a fortified gate made of giant white bones and dark stone with dark teal banners' },
        { name: '尸山', desc: '战斗中持续大量回血', fx: { regen: 9 }, art: 'a mound of ancient skulls and bones with a dark teal mist' }],
      ['archer', '骨哨', '蛇牙楼', '攻击附带轻度中毒', { status: 'poison', turns: 1 }, { status: 'poison', turns: 2 },
        'a small watch post of bones with a bone bow',
        'a dark stone tower shaped like a coiled snake with open fangs',
        { name: '玄蛇穴', desc: '剧毒，持续 4 回合', fx: { status: 'poison', turns: 4 }, art: 'a pit of black stone with many dark serpents rising from it' },
        { name: '骨箭楼', desc: '自身血越少攻击越高', fx: { status: 'poison', turns: 2, lowHpAtk: 1.2 }, art: 'a tall spire of ribs firing bone arrows, ghostly green glow' }],
      ['magic', '鬼火坟', '阴符冢', '枯竭：英雄下回合无法回血', { status: 'noheal', turns: 1 }, { status: 'noheal', turns: 2 },
        'a small grave mound with floating blue ghost flames close to the mound',
        'a burial mound covered in dark paper talismans and a stone stele',
        { name: '招魂幡', desc: '吸取英雄的血', fx: { status: 'noheal', turns: 2, lifesteal: 0.9 }, art: 'a tall black soul-calling banner on a stone base with pale spirits wrapped around it' },
        { name: '黄泉雾', desc: '英雄之后 4 回合无法回血', fx: { status: 'noheal', turns: 4 }, art: 'a dark spring of yellow-green water with heavy mist rising from a stone well' }],
      ['city', '阴坟', '冥窟', '场上有建筑被毁时收金', { deathGold: 15 }, { deathGold: 30 },
        'a small cemetery with leaning stones and a coin jar',
        'a dark vault entrance piled with funerary coins',
        { name: '阴矿', desc: '产金极高，但自家英雄每回合掉 2 血', fx: { deathGold: 30, incomeMul: 2.2, heroBleed: 2 }, art: 'a sinister mine glowing dark teal with bone carts of gold' },
        { name: '冥市', desc: '场上有建筑被毁或英雄阵亡时大量收金', fx: { deathGold: 120 }, art: 'a ghost market with pale lanterns attached to dark stalls under a stone arch' }],
      ['academy', '幽碑', '冥灯龛', '英雄打赢后回少量血', { winHeal: 4 }, { winHeal: 8 },
        'a dark stone stele carved with spirits',
        'a stone niche holding a pale blue flame lamp',
        { name: '魂灯', desc: '自家英雄致死时保命一次，灯灭', fx: { winHeal: 8, soulLamp: 1 }, art: 'a tall bronze lamp with a large teal soul flame in a stone pavilion' },
        { name: '鬼录', desc: '英雄打赢后大量回血', fx: { winHeal: 28 }, art: 'a dark stone archive with a giant open ledger of names' }],
    ],
    qingqiu: [
      ['garrison', '灵狐穴', '夫诸林', '有概率闪避攻击', { dodge: 0.12 }, { dodge: 0.2 },
        'a mossy fox den under tree roots with pale green moss',
        'a small sacred grove with a white four-antlered deer statue',
        { name: '迷雾林', desc: '英雄攻击经常打空', fx: { dodge: 0.42 }, art: 'a dense clump of pale trees wrapped in thick swirling white mist' },
        { name: '幻境', desc: '英雄打输时被传送到随机一格', fx: { dodge: 0.2, loseTeleport: 1 }, art: 'a moon gate floating over a pool with a shimmering portal' }],
      ['archer', '鸾羽哨', '青鸾巢', '有概率连射', { double: 0.15 }, { double: 0.25 },
        'a slender perch of woven branches with long feathers',
        'a large nest on a tall white tree with a teal phoenix-like bird',
        { name: '鸾鸣台', desc: '每次攻击有概率再射一次', fx: { double: 0.55 }, art: 'a slender jade tower topped with singing birds and feathers' },
        { name: '月弓台', desc: '低概率打出巨额伤害', fx: { double: 0.25, bigHit: 0.12 }, art: 'a pale stone terrace with a giant silver crescent bow aimed at the sky' }],
      ['magic', '狐火龛', '迷魂祠', '混乱：英雄下回合可能倒着走', { status: 'confuse', turns: 1 }, { status: 'confuse', turns: 2 },
        'a tiny stone fox shrine with a blue flame on top of it',
        'a small pale green shrine with a blue fox-fire lantern hanging from the eaves',
        { name: '魅影祠', desc: '英雄有概率打自己', fx: { status: 'confuse', turns: 2, selfHit: 0.28 }, art: 'a shrine with many hanging fox masks and a shadowy mirror' },
        { name: '梦泽', desc: '英雄之后 2 回合骰子掷两次取低', fx: { status: 'dream', turns: 2 }, art: 'a lotus marsh with a sleeping stone fox and drifting dream bubbles close to it' }],
      ['city', '果林', '玉田', '产金随机浮动', { randIncome: [0.5, 1.7] }, { randIncome: [0.5, 1.8] },
        'a small orchard of pale fruit trees',
        'a terraced field with jade stones growing from the soil',
        { name: '灵泉', desc: '每回合随机产出 0 到 3 倍', fx: { randIncome: [0, 3] }, art: 'a glowing spring pouring from jade rocks with coins in the water' },
        { name: '吉兆树', desc: '每回合有 25% 概率抽一张吉卡', fx: { randIncome: [0.5, 1.8], luckyCard: 0.25 }, art: 'a huge sacred tree hung with auspicious red and jade charms' }],
      ['academy', '月影台', '灵草园', '英雄闪避和技能触发小幅提高', { heroDodge: 0.04, heroProc: 0.03 }, { heroDodge: 0.06, heroProc: 0.05 },
        'a round moon-viewing terrace of white stone',
        'a walled herb garden of glowing spirit plants',
        { name: '星图', desc: '抽吉凶卡时可以从两张里选', fx: { heroDodge: 0.06, heroProc: 0.05, cardPeek: 1 }, art: 'a pavilion with a giant star map on its floor and hanging silver stars' },
        { name: '灵脉', desc: '英雄闪避率提高', fx: { heroDodge: 0.18, heroProc: 0.05 }, art: 'a cracked rock with bright jade energy veins rising like a fountain' }],
    ],
  };

  SJ.BUILDINGS = {};
  for (const race of Object.keys(T)) {
    for (const row of T[race]) {
      const [branch, n1, n2, trait, f1, f2, a1, a2, b3a, b3b] = row;
      const add = (id, level, name, desc, fx, art) => {
        SJ.BUILDINGS[id] = { id, race, branch, level, name, desc, fx, art };
      };
      add(`${race}_${branch}_1`, 1, n1, trait, f1, a1);
      add(`${race}_${branch}_2`, 2, n2, trait, f2, a2);
      add(`${race}_${branch}_3a`, 3, b3a.name, b3a.desc, b3a.fx, b3a.art);
      add(`${race}_${branch}_3b`, 3, b3b.name, b3b.desc, b3b.fx, b3b.art);
      if (branch === 'academy') add(`${race}_academy_3c`, 3, '星弧学院', '英雄攻防提高，所有经验 +50%', { heroAtk: 0.12, heroDef: 0.06, xpMul: 0.5 }, 'a grand academy hall with the STARC logo');
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);
