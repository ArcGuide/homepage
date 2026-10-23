'use strict';
// 圣黛故事 · 剧情：序章、节日、纪念日、吵架与和好、随机小事、日记。

// ================= 序章 =================
async function PROLOGUE() {
  bg('sky');
  await narr('女娲补天，剩下一块石头没用上。后来它在花果山崩裂，生出一只石猴。');
  await narr('灵河岸边，有一株绛珠仙草，在等一块石头。她等来的，是一块通灵宝玉。');
  await narr('——可有人说，她认错了石头。');
  bg('city'); weatherFx();
  await narr('五百年后，金陵城。这一回，她没有认错。');
  bg('livingRoom'); couple();
  await say('wk', '黛玉！今天干点什么？俺有的是力气！', 'smile');
  await say('dy', '你小声些……书屋的账还没算完呢。', 'smile');
  await narr('他们已经在一起了。他们的日常，由你来安排。');
  await narr('「一起」做的事最甜；一个人去打工、看店，能赚钱、能成长。分开久了，下次在一起会更甜。');
  await narr('体力用完了就歇一会儿，每 5 分钟恢复 1 点。现实里的今天，就是他们的今天——下雨就下雨，过节就过节。');
  await narr('图鉴会一直更新。先带他们出门走走吧。');
}

const REFILL_LINES = [
  [null, '两个人都累得趴下了。忽然，窗台上多了两颗桃子，桃子上贴着一张字条。'],
  [null, '「第一天，送你们的。——如来」'],
  ['wk', '老头还挺够意思！', 'smile'],
  ['dy', '这桃子……好香。', 'surprise'],
  [null, '（体力全满。以后体力用完了，过一阵再来，每 5 分钟恢复 1 点。）'],
];

// ================= 节日（按现实日期） =================
const HOLIDAYS = {
  '10-23': { id: 'shuangjiang', name: '霜降', bg: 'livingRoom', async story() {
    await narr('霜降到了。窗玻璃上起了一层薄雾。');
    await say('dy', '霜降了。该吃柿子了。');
    await say('wk', '柿子？俺只吃桃。', 'default');
    await say('dy', '不吃柿子，冬天要流鼻涕的。', 'smile');
    await narr('（霜降前后这一周，「一起」里有「霜降吃柿子」。）');
  } },
  '10-31': { id: 'halloween', name: '万圣节', bg: 'livingRoom', async story() {
    await say('bj', '猴哥！万圣节到了！满大街都是扮妖怪的，你出门都不用化妆！');
    await say('wk', '呆子！挂了！', 'angry');
    await say('dy', '万圣节……是什么节？', 'surprise');
    await say('wk', '就是……妖怪的节日。俺们的节日！', 'smile');
    await say('dy', '那我呢？我又不是妖怪。');
    await say('wk', '你跟着俺，俺护着你。今晚谁也不敢吓你。', 'smile');
    await narr('（万圣节前后这一周，「一起」里有扮装、讨糖、刻南瓜灯，各有一张限定的图鉴。不用急，慢慢玩。）');
  } },
  '11-07': { id: 'lidong', name: '立冬', bg: 'livingRoom', async story() {
    await narr('立冬了。北风一吹，黛玉咳了两声。');
    await say('wk', '立冬要吃饺子！俺来包！', 'smile');
    await say('dy', '你会包么？');
    await say('wk', '……俺会吃。', 'smile');
    await narr('（立冬前后这一周，「一起」里有「立冬包饺子」。冬天来了，记得给黛玉添个暖手炉。）');
  } },
  '11-11': { id: 'd11', name: '双十一', bg: 'livingRoom', async story() {
    await say('wk', '黛玉！购物车里这个满三百减五十，俺们再凑一点！', 'smile');
    await say('dy', '……你买了二十斤桃干。', 'surprise');
    await narr('（限定：「一起」里有「双十一凑单」。）');
  } },
  '12-24': { id: 'pinganye', name: '平安夜', bg: 'livingRoom', async story() {
    await say('dy', '听说平安夜要送苹果，取个「平安」的意思。', 'smile');
    await say('wk', '那俺送你一筐！保你平平安安一百年！', 'smile');
  } },
  '12-25': { id: 'xmas', name: '圣诞节', bg: 'livingRoom', async story() {
    await say('wk', '圣诞老人是什么来头？能有俺老孙跑得快？', 'default');
    await say('dy', '人家是坐着驯鹿飞的。', 'smile');
    await say('wk', '驯鹿？俺一个跟斗十万八千里！', 'angry');
  } },
  '01-01': { id: 'newyear', name: '元旦', bg: 'livingRoom', async story() {
    await narr('新年到了。窗外有人在放烟花。');
    await say('dy', '新的一年了。你有什么愿望？');
    await say('wk', '俺的愿望，去年就实现了。', 'smile');
  } },
  '02-14': { id: 'valentine', name: '情人节', bg: 'livingRoom', async story() {
    await say('wk', '黛玉，今天……俺给你买了花！', 'shy');
    await say('dy', '……又是桃花？', 'smile');
  } },
};

// ================= 纪念日（在一起第 N 天） =================
const MILESTONES = [
  { day: 7, async run() {
    await say('dy', '今天是我们在一起第七天。', 'shy');
    await say('wk', '才七天？', 'surprise');
    await say('wk', '俺觉得像五百年。', 'smile');
  } },
  { day: 30, async run() {
    await narr('黛玉在日历上，画了一个小小的圈。');
    await say('dy', '一个月了。', 'smile');
    await say('wk', '下个月，俺们还在一起。下下个月也是。', 'smile');
  } },
  { day: 100, async run() {
    await say('wk', '给。', 'shy');
    await narr('是一串手链。一百颗桃核，每一颗都磨得很光滑。');
    await say('wk', '在一起一天，俺就吃一个桃，留一个核。', 'shy');
    await say('dy', '……那你以后，要吃好多好多桃。', 'smile');
  } },
];

// ================= 吵架与和好 =================
// start：吵起来；resolve：和好的尝试，返回 true 表示和好成功。选项 who 标出这句替谁说。
const QUARRELS = [
  {
    id: 'poem', title: '撕掉的诗稿', bg: 'livingRoom',
    async start() {
      await narr('悟空嫌桌子晃，随手抽了几张纸垫在桌脚下。');
      await say('dy', '那是……那是我改了半个月的诗稿！', 'angry');
      await say('wk', '几张纸嘛，俺不知道……', 'surprise');
      await say('dy', '你从来不知道。', 'sad');
      await narr('黛玉回了房间，关上了门。');
      eff({ dy_mood: -25, wk_mood: -10 });
    },
    async resolve() {
      let ok = false;
      await narr('门还关着。');
      await choose([
        { who: 'wk', t: '把诗稿捋平，一片一片粘回去，从门缝塞进去', req: { nai: 6 }, then: async () => {
          await narr('过了很久，门开了一条缝。');
          await say('dy', '……粘歪了。', 'sad');
          await say('wk', '俺再粘一遍。粘到你满意为止。');
          await say('dy', '傻子。', 'smile'); ok = true;
        } },
        { who: 'dy', t: '（开门）「你知道那首诗写的是谁吗？」', req: { yong: 5 }, then: async () => {
          await say('dy', '写的是你。你拿去垫桌脚了。', 'sad');
          await say('wk', '……俺错了。俺能看看吗？', 'shy');
          await say('dy', '你粘好了，就给你看。', 'smile'); ok = true;
        } },
        { who: 'wk', t: '「不就几张纸，俺再给你买一沓！」', eff: { dy_mood: -5 }, then: () => say('dy', '……你走。', 'angry') },
      ]);
      return ok;
    },
  },
  {
    id: 'jinyu', title: '金玉良缘', bg: 'shop', when: () => G.sweet >= 30,
    async start() {
      await narr('宝玉来书屋坐了一下午。走的时候，留下一句：「金玉良缘，木石前盟——妹妹还记得么？」');
      await say('wk', '他什么意思？！', 'angry');
      await say('dy', '你冲我凶什么？', 'angry');
      eff({ dy_mood: -20, wk_mood: -20 });
    },
    async resolve() {
      let ok = false;
      await choose([
        { who: 'dy', t: '「我等的，从来不是那块玉。」', req: { yong: 12 }, then: async () => {
          await say('dy', '从你在树上摇花那天起，我就知道了。', 'shy');
          await say('wk', '……真的？', 'surprise'); ok = true;
        } },
        { who: 'wk', t: '「俺信你。俺就是……怕。」', req: { nai: 15 }, then: async () => {
          await say('dy', '怕什么？', 'surprise');
          await say('wk', '怕你哪天发现，认错了石头。', 'sad');
          await say('dy', '这一回，没认错。', 'smile'); ok = true;
        } },
        { who: 'wk', t: '「俺去把那块玉砸了！」', eff: { dy_mood: -5 }, then: () => say('dy', '你敢！……你怎么什么都要打打杀杀。', 'angry') },
      ]);
      return ok;
    },
  },
  {
    id: 'work', title: '你只顾打工', bg: 'livingRoom', when: () => (G.counts.waimai || 0) + (G.counts.banzhuan || 0) >= 5,
    async start() {
      await narr('悟空又接了一晚上的单。回来时，饭菜已经凉了。');
      await say('dy', '你天天在外头跑。我一个人守着书屋，跟守着空屋子有什么两样？', 'sad');
      await say('wk', '俺这不是为了多攒点钱……', 'default');
      eff({ dy_mood: -20, wk_mood: -8 });
    },
    async resolve() {
      let ok = false;
      await choose([
        { who: 'wk', t: '「今晚不接单了。俺陪你。」', req: { rou: 8 }, then: async () => {
          await say('dy', '……我又没让你推。', 'shy');
          await say('wk', '是俺自己想陪你。'); ok = true;
        } },
        { who: 'dy', t: '「你下次接单前，跟我说一声就好。」', req: { kai: 10 }, then: async () => {
          await say('wk', '好！俺每单都报告！', 'smile');
          await say('dy', '……那倒也不必。', 'smile'); ok = true;
        } },
        { who: 'wk', t: '「俺赚钱还不是为了你！」', eff: { dy_mood: -5 }, then: () => say('dy', '我要的不是钱。', 'sad') },
      ]);
      return ok;
    },
  },
  {
    id: 'medicine', title: '不肯吃药', bg: 'livingRoom', when: () => G.health < 45,
    async start() {
      await say('dy', '不喝。太苦了。', 'angry');
      await say('wk', '不喝病怎么好？你给俺喝了！', 'angry');
      await narr('药碗打翻在地上。两个人都不说话了。');
      eff({ dy_mood: -20, wk_mood: -15 });
    },
    async resolve() {
      let ok = false;
      await choose([
        { who: 'wk', t: '重新熬一碗：「药苦，俺陪你喝一半。」', req: { rou: 12 }, then: async () => {
          await narr('悟空先喝了一大口，苦得整张脸皱成一团。');
          await say('dy', '噗——你这样子……好吧，我喝。', 'smile'); ok = true;
        } },
        { who: 'dy', t: '「……我喝。但你要给我讲个故事。」', req: { kai: 12 }, then: async () => {
          await say('wk', '那俺讲大闹天宫！从头讲！', 'smile');
          await say('dy', '讲短一点。药要凉了。', 'smile'); ok = true;
        } },
        { who: 'wk', t: '「不喝俺就灌了！」', eff: { dy_mood: -5 }, then: () => say('dy', '你出去。', 'angry') },
      ]);
      if (ok) eff({ health: 5 });
      return ok;
    },
  },
];

// ================= 随机小事（行动后小概率） =================
const RANDOM_EVENTS = [
  { id: 'bajie', async run() {
    bg('livingRoom'); couple();
    await say('bj', '猴哥！嫂子！老猪路过，顺便……蹭顿饭？');
    await choose([
      { who: 'dy', t: '「八戒来了？紫鹃，添副碗筷。」', eff: { money: -30, yan: 1, kai: 1 }, then: () => say('bj', '还是嫂子好！比猴哥强多了！') },
      { who: 'wk', t: '「呆子！又来蹭！」', eff: { wk_mood: 2 }, then: () => say('bj', '猴哥变了……有了媳妇忘了兄弟。') },
    ]);
  } },
  { id: 'tangseng', when: () => G.sweet >= 30, async run() {
    bg('livingRoom'); show('wk');
    await say('ts', '悟空。西天那边，又有新的经要取……');
    await choose([
      { who: 'wk', t: '「师父，这一回，俺想留下。」', eff: { rou: 2, nai: 1 }, then: () => say('ts', '阿弥陀佛……情之一字，为师也不懂。') },
      { who: 'wk', t: '「师父您先去，俺过几年追上来。」', eff: { wk_mood: 2 }, then: () => say('ts', '……为师怎么觉得，你不会来了。') },
    ]);
  } },
  { id: 'zijuan', async run() {
    bg('shop');
    await say('zj', rand(['姑娘这几日常对着窗外笑。我问她笑什么，她不说。', '姑娘说，你做的川贝炖梨，比药铺的好喝。', '姑娘把你送的东西都收在一个匣子里，谁也不让碰。']));
    eff({ sweet: 2 });
  } },
  { id: 'fans', async run() {
    bg('city'); show('wk');
    await narr('悟空在街上被一群小学生认了出来：「是猴山那个哥哥！」签了二十个名，收了五十块红包。');
    eff({ money: 50, wk_mood: 3 });
  } },
  { id: 'umbrella', when: () => today().weather === '雨', async run() {
    bg('city'); weatherFx(); show('wk');
    await narr('雨下大了。紫鹃发来消息：姑娘在书屋，没带伞。');
    await choose([
      { who: 'wk', t: '立刻送伞过去', eff: { wk_hp: -5, sweet: 3, rou: 1 }, then: () => say('dy', '你怎么……全身都湿了。', 'shy') },
      { who: 'wk', t: '「让她等雨停吧。」', eff: { dy_mood: -3 } },
    ]);
  } },
  { id: 'jingu', async run() {
    bg('livingRoom'); couple();
    await narr('悟空头上的紧箍忽然一紧，疼得他蹲在地上。');
    await say('dy', '你怎么了？！……来，靠着我。', 'surprise');
    eff({ wk_hp: -8, sweet: 3, rou: 1 });
  } },
  { id: 'cough', when: () => G.health < 45, async run() {
    bg('livingRoom'); couple();
    await narr('夜里，黛玉咳了半宿。');
    await choose([
      { who: 'wk', t: '起来熬一碗川贝炖梨', req: { rou: 10 }, eff: { health: 6, sweet: 3 }, then: () => say('dy', '……甜的。', 'smile') },
      { who: 'wk', t: '给她倒杯热水，拍拍背', eff: { health: 2, sweet: 1 } },
    ]);
  } },
  { id: 'baochai', async run() {
    bg('shop');
    await say('bc', '林妹妹，我送了些燕窝来。每日一两，冰糖熬了，比吃药强。');
    eff({ health: 6 });
  } },
  { id: 'kid', async run() {
    bg('park'); show('wk');
    await narr('楼下的小孩哭着说风筝挂树上了。悟空三两下爬上去摘了下来。黛玉在窗口看着，笑了。');
    eff({ yan: 2, sweet: 1 });
  } },
  { id: 'poemnote', when: () => G.shi >= 15, async run() {
    bg('livingRoom'); couple();
    await narr('悟空在枕头底下发现一张纸条，上面是一句诗：「石上原无根，偏向草边开。」');
    await say('wk', '这是写谁的？', 'smile');
    await say('dy', '……写一块石头。', 'shy');
    eff({ sweet: 3, shi: 1 });
  } },
];

// ================= 日记：你不在的时候 =================
const DIARY = [
  '悟空送了一天外卖，回来带了一袋糖炒栗子。黛玉剥了一晚上，给他留了一半。',
  '黛玉在书屋看了一天店，卖出去三本诗集。晚上她念了一首给悟空听，悟空睡着了。',
  '两个人去菜市场买了条鱼。悟空杀鱼，黛玉不敢看。',
  '黛玉教悟空写字。他写了一整页「黛」，写得像一群蚂蚁。',
  '悟空在阳台上翻了一百个跟斗，被楼下邻居投诉了。',
  '下了一整天雨。两个人哪儿也没去，窝在家里看了三部老电影。',
  '黛玉的诗被茶馆的先生抄去挂在了墙上。悟空每天路过都要看一眼。',
  '八戒来蹭了顿饭，走的时候还顺走了两个桃。',
  '悟空偷偷学了一道菜。端上桌的时候，黛玉问：这是什么？悟空说：俺也不知道。',
  '黛玉咳了一夜。悟空坐在床边，给她讲了一夜花果山的故事。',
  { when: () => G.home.parrot, t: '鹦哥学会了一句新词：「大圣，吃饭啦！」' },
  { when: () => G.home.peach, t: '阳台上的桃树冒了个新芽。悟空蹲在那儿看了半个钟头。' },
].map(x => typeof x === 'string' ? { t: x } : x);
