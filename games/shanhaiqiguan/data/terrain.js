// 地形和地标。效果刻意不讲平衡，好玩就行。
(function (g) {
  const SJ = g.SJ = g.SJ || {};
  // build: 能不能造建筑；cost: 走过一格消耗几步；price: 地价倍率
  SJ.TERRAIN = {
    grass: { name: '草原', build: true, desc: '普通地块' },
    forest: { name: '密林', build: true, desc: '建筑有 15% 闪避' },
    petal: { name: '桃林', build: true, desc: '停下回 10 血' },
    sand: { name: '流沙', build: true, price: 0.7, desc: '地价便宜三成' },
    jade: { name: '玉田', build: true, price: 1.5, desc: '地价贵，城邑产金翻倍，停下捡 30 金' },
    reef: { name: '浅滩', build: true, desc: '停下捡到 20 到 60 金' },
    ash: { name: '灰原', build: true, desc: '这里的建筑攻击 +30%' },
    bone: { name: '白骨地', build: true, desc: '停下时小鬼或偷你 40 金，或送你 60 金' },
    rock: { name: '山地', build: false, cost: 2, desc: '不能建造。走一格要两步，停下五分之一概率挖到金矿' },
    snow: { name: '冰原', build: false, desc: '不能建造。停下继续滑 1 到 3 格' },
    water: { name: '灵河', build: false, desc: '不能建造。路过回 4 血，停下回 20 血' },
    sea: { name: '大海', build: false, desc: '不能建造。停下被浪卷走 3 到 8 格' },
    swamp: { name: '毒沼', build: false, desc: '不能建造。停下中毒 3 回合，但能在泥里摸到一个消耗品' },
    lava: { name: '熔岩', build: false, desc: '不能建造。路过掉 1 血，停下灼烧 1 回合但得 80 金' },
    cloud: { name: '云海', build: false, desc: '不能建造。停下被风吹出 8 到 20 格' },
    ink: { name: '黑水', build: false, desc: '不能建造。路过得 15 金掉 2 血，停下和随机一人换位' },
    // 新地形只能加在最后：地图按下标存地形
    study: { name: '书斋', build: true, desc: '停下读书，经验 +50' },
    venture: { name: '创业园', build: true, desc: '城邑产金 +50%；停下路演，一半概率融到 80 金，一半概率烧掉 40 金' },
    star: { name: '星海', build: false, desc: '不能建造。停下被星流带走 4 到 12 格' },
  };

  SJ.LANDMARKS = {
    jianmu: { name: '建木', art: 'corner_jianmu', desc: '停下回 30 血' },
    guixu: { name: '归墟', art: 'corner_guixu', desc: '掉进去停一回合' },
    kunlun: { name: '昆仑', art: 'corner_kunlun', desc: '回 40 血，或者获得下一战祝福' },
    buzhou: { name: '不周山', art: 'corner_buzhou', desc: '随机传送到地图任意一格' },
    taishan: { name: '泰山', art: 'lm_taishan', desc: '封禅：英雄升一级' },
    huashan: { name: '太华山', art: 'lm_huashan', desc: '掷骰：7 以上攻击永久 +3，否则摔下山掉 25 血' },
    heyuan: { name: '河源', art: 'lm_heyuan', desc: '回满血' },
    ruoshui: { name: '弱水', art: 'lm_ruoshui', desc: '金币沉掉三成，但清除全部负面状态' },
    fusang: { name: '扶桑', art: 'lm_fusang', desc: '十日并出：其他人全部灼烧，你得 200 金' },
    penglai: { name: '蓬莱', art: 'lm_penglai', desc: '不死药：血量上限 +20' },
    fangzhang: { name: '方丈', art: 'lm_fangzhang', desc: '免费升级一座自家建筑' },
    yingzhou: { name: '瀛洲', art: 'lm_yingzhou', desc: '巨龟驮你到另一座地标' },
    longgong: { name: '龙宫', art: 'lm_longgong', desc: '得一件宝物' },
    guimen: { name: '鬼门', art: 'lm_guimen', desc: '穿门闪现到随机对手身边' },
    dushuo: { name: '度朔山', art: 'lm_dushuo', desc: '神荼郁垒：清除负面状态，回 30 血' },
    youdu: { name: '幽都', art: 'lm_youdu', desc: '土伯借贷：得 300 金，但中诅咒 3 回合' },
    xinghu: { name: '星弧', art: 'lm_xinghu', desc: '入学：英雄升一级' },
    dabian: { name: '答辩厅', art: 'lm_dabian', desc: '答辩：掷骰 7 以上通过，经验 +200；11 以上再得一件宝物；6 以下被问倒，掉 25 血' },
    luyan: { name: '路演台', art: 'lm_luyan', desc: '路演：掷两颗骰，得点数 × 30 金' },
    tushuguan: { name: '图书馆', art: 'lm_tushuguan', desc: '借到一件宝物' },
    zhongshan: { name: '钟山', art: 'lm_zhongshan', desc: '烛龙闭眼：其他人下回合减速' },
  };
  // 给玩家看的说明：只给提示，具体效果停上去才知道。desc 是精确规则
  const LM_SAY = {
    jianmu: '通天的神树，树下好乘凉。',
    guixu: '万水归处，深不见底。掉进去，一时半会儿可出不来。',
    kunlun: '西王母的山。在这里歇脚，可能得到照料，也可能得到祝福。',
    buzhou: '撑天的柱子早就歪了，站上去不知会被甩到哪里。',
    taishan: '帝王封禅的地方，登顶的人都会更上一层。',
    huashan: '华山险峻。敢爬就有回报，失手可就摔得不轻。',
    heyuan: '大河发源的地方，泉水清冽，什么伤都能洗好。',
    ruoshui: '鸿毛不浮的弱水。身上沉的东西会掉下去，脏东西也一起冲走。',
    fusang: '十个太阳栖息的神树。它们要是一起出来……',
    penglai: '仙山上的不死药，吃了身子骨更结实。',
    fangzhang: '方丈山的仙人，会顺手帮你修缮家业。',
    yingzhou: '巨龟驮着仙山四处游荡，愿意的话也能捎你一程。',
    longgong: '龙王的宝库，来了总不会空手走。',
    guimen: '穿过这扇门，你会出现在某个人身边。',
    dushuo: '神荼、郁垒守着这里，邪祟近不了身。',
    youdu: '土伯愿意借钱给你，只是幽都的钱不太干净。',
    xinghu: '星弧学院的大门。进了门的人，都会有长进。',
    dabian: '答辩委员会在等你。准备得好有大收获，被问倒可不好受。',
    luyan: '讲讲你的项目，投资人看心情给钱。',
    tushuguan: '书架深处，总能翻到点好东西。',
    zhongshan: '烛龙在这里闭上眼，天下就黑了，别人都走不快。',
  };
  for (const k in SJ.LANDMARKS) SJ.LANDMARKS[k].say = LM_SAY[k] || SJ.LANDMARKS[k].desc;
  // 选地图时的介绍，只讲气氛
  SJ.MAP_SAY = {
    kunlun: '五岳连绵，大河奔流。山路难走，河边或许能歇口气。',
    penglai: '东海之上，仙山若隐若现。浪大的时候，最好离海远一点。',
    youdu: '地下深处的三重幽冥。小心脚下的黑水和白骨，鬼门不知通向哪里。',
    starc: '悬在星海里的学院。有人埋头读书，有人忙着创业，一不留神就漂进星海。',
    zhuolu: '黄帝与蚩尤大战过的古战场，焦土未冷，大雾还没散。',
    tanggu: '太阳升起的地方，三座岛隔水相望。',
    taodu: '桃都山弯弯绕绕，一条鬼路斜穿而过。',
    kunqiu: '昆仑山顶和山脚的桃林，被一道弱水连在一起。',
    xiandao: '两座仙岛隔海相望，海路上风浪不定。',
  };
})(typeof window !== 'undefined' ? window : globalThis);
