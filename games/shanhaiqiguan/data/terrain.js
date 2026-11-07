// 地形和地标。效果刻意不讲平衡，好玩就行。
(function (g) {
  const SJ = g.SJ = g.SJ || {};
  // build: 能不能造建筑；cost: 走过一格消耗几步；price: 地价倍率
  SJ.TERRAIN = {
    grass: { name: '草原', build: true, desc: '普通地块' },
    forest: { name: '密林', build: true, desc: '建筑有 15% 闪避' },
    petal: { name: '桃林', build: true, desc: '停下回 10 血' },
    sand: { name: '流沙', build: true, price: 0.7, desc: '地价便宜，停下有四分之一概率陷住一回合' },
    jade: { name: '玉田', build: true, price: 1.5, desc: '地价贵，城邑产金翻倍，停下捡 30 金' },
    reef: { name: '浅滩', build: true, desc: '停下捡到 20 到 60 金' },
    ash: { name: '灰原', build: true, desc: '这里的建筑攻击 +30%' },
    bone: { name: '白骨地', build: true, desc: '停下时小鬼或偷你 40 金，或送你 60 金' },
    rock: { name: '山地', build: false, cost: 2, desc: '不能建造。走一格要两步，停下五分之一概率挖到金矿' },
    snow: { name: '冰原', build: false, desc: '不能建造。停下继续滑 1 到 3 格' },
    water: { name: '灵河', build: false, desc: '不能建造。路过回 4 血，停下回 20 血' },
    sea: { name: '大海', build: false, desc: '不能建造。停下被浪卷走 3 到 8 格' },
    swamp: { name: '毒沼', build: false, desc: '不能建造。路过就中毒' },
    lava: { name: '熔岩', build: false, desc: '不能建造。路过掉 3 血，停下灼烧但得 80 金' },
    cloud: { name: '云海', build: false, desc: '不能建造。停下被风吹出 8 到 20 格' },
    ink: { name: '黑水', build: false, desc: '不能建造。路过得 15 金掉 2 血，停下和随机一人换位' },
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
    zhongshan: { name: '钟山', art: 'lm_zhongshan', desc: '烛龙闭眼：其他人下回合减速' },
  };
})(typeof window !== 'undefined' ? window : globalThis);
