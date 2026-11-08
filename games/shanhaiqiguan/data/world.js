// 种族、英雄、异兽、宝物、吉凶卡、棋盘。纯数据。
(function (g) {
  const SJ = g.SJ = g.SJ || {};

  SJ.RACES = {
    xuanyuan: { name: '轩辕部', color: '#c8972f', trait: '建造和升级便宜 20%', look: 'earth-yellow rammed earth and red-gold lacquered timber, Bronze Age Chinese architecture' },
    jiuli: { name: '九黎部', color: '#b4492f', trait: '开打获胜时额外抢 50 金', look: 'bronze and black iron, tribal horned totems, red war paint' },
    youdu: { name: '幽都', color: '#2f7f83', trait: '建筑被毁时，给攻击者挂诅咒', look: 'dark teal stone and bone white, ghostly underworld' },
    qingqiu: { name: '青丘', color: '#6aa86b', trait: '掷骰后 25% 概率多走 1 到 2 步', look: 'pale green and moon white, misty forest spirit architecture' },
  };

  SJ.HEROES = {
    huangdi: { race: 'xuanyuan', name: '黄帝', type: '均衡', hp: 95, atk: 9, def: 0,
      art: 'an ancient Chinese emperor in earth-yellow and gold robes and tall crown, holding a bronze sword' },
    yinglong: { race: 'xuanyuan', name: '应龙', type: '输出', hp: 86, atk: 9, def: 0,
      art: 'a winged golden dragon with large feathered wings, long body, standing proudly' },
    nuba: { race: 'xuanyuan', name: '女魃', type: '经济', hp: 115, atk: 12, def: 0,
      art: 'a fierce drought goddess in a dark blue robe with long wild hair, heat waves and small flames around her hands' },
    chiyou: { race: 'jiuli', name: '蚩尤', type: '战士', hp: 80, atk: 10, def: 0,
      art: 'a huge war chief with bronze head and iron forehead, bull horns, six arms holding bronze weapons' },
    xingtian: { race: 'jiuli', name: '刑天', type: '不死', hp: 115, atk: 12, def: 0,
      art: 'a decapitated giant warrior with no head and no neck, his shoulders end in a flat stump, a huge angry face is on his torso with two large eyes on the chest and a wide roaring mouth on the belly, holding a battle axe and a round shield' },
    kuafu: { race: 'jiuli', name: '夸父', type: '机动', hp: 104, atk: 11, def: 0,
      art: 'a towering giant running with huge strides, holding a wooden staff, snakes in his ears, red setting sun behind him' },
    tubo: { race: 'youdu', name: '土伯', type: '坦克', hp: 150, atk: 9, def: 0,
      art: 'a massive underworld guardian with a tiger head, three eyes, bull horns, thick dark armor, heavy body' },
    xiangliu: { race: 'youdu', name: '相柳', type: '毒', hp: 105, atk: 10, def: 0,
      art: 'a dark teal snake body that splits into nine long necks, each neck ends in a human head with a human face and long black hair' },
    yayu: { race: 'youdu', name: '窫窳', type: '重生', hp: 98, atk: 11, def: 0,
      art: 'a monstrous beast with an ox body, red fur, human face and horse legs, undead bone-white markings' },
    jiuweihu: { race: 'qingqiu', name: '九尾狐', type: '运气', hp: 126, atk: 12, def: 0,
      art: 'a nine-tailed fox spirit, white and pale green fur, nine large distinct tails fanned out' },
    jingwei: { race: 'qingqiu', name: '精卫', type: '破坏', hp: 118, atk: 12, def: 0,
      art: 'a small fierce bird with a patterned head, white beak and red feet, carrying a pebble in its beak over waves' },
    zhulong: { race: 'qingqiu', name: '烛龙', type: '爆发', hp: 90, atk: 9, def: 0,
      art: 'a very long red snake with the head of a bearded old man, a human face on a snake body, no horns, no dragon snout' },
  };

  SJ.MONSTERS = [
    { id: 'tiangou', name: '天狗', hp: 40, atk: 3, gold: 60, xp: 2, art: 'a white-headed wild cat-like hound, snarling, four legs' },
    { id: 'qinyuan', name: '钦原', hp: 55, atk: 4, gold: 90, xp: 3, art: 'a huge fierce hornet monster with a black and amber striped abdomen, a long venomous stinger, four translucent wings, six spiky legs' },
    { id: 'fei', name: '蜚', hp: 75, atk: 5, gold: 130, xp: 4, art: 'an ox with a white head, one single eye and a snake tail, sickly green aura' },
    { id: 'qiongqi', name: '穷奇', hp: 100, atk: 7, gold: 190, xp: 5, art: 'a huge winged tiger with spiked fur, roaring' },
  ];

  // kind: good 吉 / bad 凶
  SJ.CARDS = [
    { id: 'dangkang', name: '当康', kind: 'good', desc: '大丰收，全场城邑下回合产出翻倍', art: 'a small tusked boar dancing in a golden grain field' },
    { id: 'fenghuang', name: '凤皇', kind: 'good', desc: '天下安宁，全员回 30 血，这一轮禁战', art: 'a magnificent five-colored phoenix with spread wings' },
    { id: 'luanniao', name: '鸾鸟', kind: 'good', desc: '获得 200 金', art: 'a long-tailed teal phoenix bird dropping gold coins' },
    { id: 'wenyao', name: '文鳐', kind: 'good', desc: '所有人获得 100 金', art: 'a flying fish with bird wings and white head leaping from water' },
    { id: 'chenghuang', name: '乘黄', kind: 'good', desc: '血量上限 +20，并回满 20 血', art: 'a white fox-like horse with horns on its back, galloping' },
    { id: 'ershu', name: '耳鼠', kind: 'good', desc: '清除所有负面状态，回 25 血', art: 'a flying mouse with a rabbit head and huge ears gliding on its tail' },
    { id: 'starc', name: '星弧', kind: 'good', desc: '直升一级', art: 'the STARC Institute logo' },
    { id: 'xingxing', name: '狌狌', kind: 'good', desc: '再掷一次', art: 'a white-eared ape-like creature running very fast' },
    { id: 'dijiang', name: '帝江', kind: 'good', desc: '免费升级一座自家建筑', art: 'a round red sack-like creature with six legs and four wings and no face, dancing' },
    { id: 'lushu', name: '鹿蜀', kind: 'good', desc: '免费获得一块无主领地', art: 'a horse with a white head, tiger stripes and a red tail' },
    { id: 'qinggeng', name: '青耕', kind: 'good', desc: '三回合内免疫负面状态', art: 'a small blue-green bird with white beak and white tail perched on a branch' },
    { id: 'bifang', name: '毕方', kind: 'bad', desc: '大火，随机烧毁两座建筑，烧掉的地变回无主', art: 'a crane balancing on one single leg, only one leg visible, blue body with red spots, white beak, small flames around it' },
    { id: 'feiyi', name: '肥遗', kind: 'bad', desc: '大旱，全场下回合没有收入', art: 'a six-legged snake with four wings over cracked dry earth' },
    { id: 'zhuyan', name: '朱厌', kind: 'bad', desc: '大兵，所有人下一次踩到别人的地必须开打', art: 'a white-headed red-footed ape holding a spear' },
    { id: 'taotie', name: '饕餮', kind: 'bad', desc: '吞掉你一半金币', art: 'a monstrous gaping beast with a huge mouth swallowing gold coins, no lower body visible' },
    { id: 'kui', name: '夔', kind: 'bad', desc: '雷击，你掉 20 血', art: 'a one-legged grey ox-like creature with no horns, lightning storm around it' },
    { id: 'huashe', name: '化蛇', kind: 'bad', desc: '大水，随机一个区域的建筑全部降一级，1 级的冲没，地变回无主', art: 'a snake with a woman face and wings over a flood wave' },
    { id: 'qiongqi', name: '穷奇', kind: 'bad', desc: '被抢走 100 金，交给最有钱的人', art: 'a huge winged tiger with spiked fur carrying a bag of gold' },
    { id: 'zhu', name: '鴸', kind: 'bad', desc: '被放逐到归墟，停一回合', art: 'a bird with human hands instead of feet, hooting mournfully' },
    { id: 'qizhong', name: '跂踵', kind: 'bad', desc: '大疫，所有人掉 15 血', art: 'a one-legged owl with a pig tail, sickly fog' },
    { id: 'mingshe', name: '鸣蛇', kind: 'bad', desc: '中毒 3 回合', art: 'a four-winged snake hissing with green venom' },
  ];

  SJ.CORNERS = {
    jianmu: { name: '建木', desc: '经过领 100 金，停下回 30 血', art: 'a colossal sacred world tree with a straight trunk rising up, golden leaves, no branches near the base' },
    guixu: { name: '归墟', desc: '掉进去停一回合', art: 'a bottomless whirlpool in a circular sea, dark teal water spiralling down' },
    kunlun: { name: '昆仑', desc: '回 40 血，或者获得下一战祝福', art: 'a jade mountain peak with a golden palace on the summit and clouds' },
    buzhou: { name: '不周山', desc: '随机传送到任意一格', art: 'a broken colossal mountain pillar leaning and cracked, with a rift of stars' },
  };

})(typeof window !== 'undefined' ? window : globalThis);
