'use strict';
// 圣黛故事 · 日常内容：一起做的事、各自做的事、吃的、小家、旅行。
// 活动字段：who 'both'|'wk'|'dy'|'eat' · hp 体力（数字或 {wk, dy}，负数为恢复）· cost 花费 · pay 收入
//           eff 效果 · req 解锁条件 · hours 现实时间段 · holiday 节日限定 · limit 每日次数 · lines 或 run

const ACTS = [
  // ================= 一起 =================
  {
    id: 'park', who: 'both', icon: '🌳', name: '逛玄武湖', desc: '晴天最舒服', hp: 8, bg: 'park',
    async run() {
      const w = today().weather;
      if (w === '雨') { await narr('雨丝落在湖面上。两个人挤在一把伞下，走得很慢。'); eff({ dy_mood: 2, wk_mood: 1 }); }
      else if (w === '雪') { await narr('湖边一片白。悟空在雪地上踩出一行猴爪印，黛玉跟在后面，一脚一脚踩进去。'); eff({ dy_mood: 5, wk_mood: 5 }); }
      else { await narr(rand(['湖边柳色正好。黛玉走得慢，悟空走两步就回头等她。', '有人在湖边拉二胡。黛玉站着听完了一整首。'])); eff({ dy_mood: 4, wk_mood: 3, health: 2 }); }
    },
    eff: { sweet: 4 },
  },
  {
    id: 'yoga', who: 'both', icon: '🧘', name: '一起做瑜伽', desc: '黛玉带着做 · 悟空嫌闷', hp: 10, bg: 'livingRoom', indoor: true,
    lines: ['黛玉跟着视频做猫式。悟空做着做着，变成了猴式。', '「吸气——呼气——」悟空呼气的时候睡着了。', '黛玉的树式站得稳稳的。悟空的树式，是真的爬到了柜子上。'],
    eff: { sweet: 4, wk_mood: -3, dy_mood: 5, health: 3, nai: 2 },
  },
  {
    id: 'cook', who: 'both', icon: '🍲', name: '一起做饭', desc: '悟空掌勺，黛玉尝咸淡', hp: 10, cost: 40, bg: 'livingRoom', indoor: true,
    lines: ['悟空切菜像耍棒，案板都在抖。黛玉在旁边一片一片地择葱。', '今天做的是川贝炖梨。黛玉说：「甜了。」悟空说：「甜才好。」', '锅里的油溅起来，悟空第一反应是挡在黛玉前面。'],
    eff: { sweet: 6, rou: 2, yan: 1, health: 2, wk_mood: 2, dy_mood: 2 },
  },
  {
    id: 'market', who: 'both', icon: '🥬', name: '逛菜市场', desc: '烟火气 · 悟空很会讲价', hp: 8, cost: 20, bg: 'street',
    lines: ['悟空跟卖菜的大妈讲价，讲到最后大妈多送了一把香菜。黛玉笑得直不起腰。', '黛玉第一次知道，原来藕要挑九个孔的。', '卖鱼的大哥问：「小两口刚结婚吧？」黛玉的脸红到了耳根。'],
    eff: { sweet: 3, yan: 2, wk_mood: 2, dy_mood: 1, kai: 1 },
  },
  {
    id: 'movie', who: 'both', icon: '🎬', name: '看电影', desc: '挑什么片子，你说了算', hp: 5, cost: 80, bg: 'cinema', indoor: true,
    async run() {
      await narr('排片表上有三部电影。');
      await choose([
        { who: 'wk', t: '「看《天兵十万》！打得热闹！」', eff: { wk_mood: 6, dy_mood: -2 }, then: () => say('dy', '……吵得我头疼。不过，看你看得那么高兴。', 'smile') },
        { who: 'dy', t: '「看《秋窗》吧，讲一个写诗的女孩。」', eff: { dy_mood: 6, wk_mood: -2 }, then: () => say('wk', '（打哈欠）……她最后写完了吗？', 'default') },
        { t: '喜剧片《八戒减肥记》，两个人都爱看', eff: { wk_mood: 4, dy_mood: 4 }, then: () => say('dy', '那胖子……怎么像真的一样。', 'smile') },
      ]);
    },
    eff: { sweet: 5 },
  },
  {
    id: 'tea', who: 'both', icon: '🍵', name: '茶馆听雨', desc: '黛玉最爱 · 雨天加倍', hp: 4, cost: 50, bg: 'tea', indoor: true,
    async run() {
      if (today().weather === '雨') { await narr('檐下雨声淅沥。黛玉捧着茶，靠在悟空肩上，难得地一句话也不说。'); eff({ dy_mood: 8, sweet: 3 }); }
      else await narr(rand(['茶馆里说书人在讲三打白骨精。悟空听得直拍桌子：「不对不对，当时不是这样的！」', '黛玉点了一壶六安瓜片，悟空点了一盘瓜子。']));
    },
    eff: { sweet: 4, dy_mood: 4, wk_mood: -1, nai: 1 },
  },
  {
    id: 'read', who: 'both', icon: '📖', name: '一起看书', desc: '黛玉看诗，悟空看……', hp: 4, bg: 'livingRoom', indoor: true,
    lines: ['黛玉在看《李义山诗集》。悟空在看《西游记》，看到自己被压五行山那段，愤愤地翻了过去。', '悟空看了三页就枕在黛玉腿上睡着了。黛玉没有叫醒他。', '黛玉念了一句诗。悟空说：「再念一遍。」她又念了一遍。'],
    eff: { sweet: 3, wk_mood: -3, dy_mood: 4, shi: 1, nai: 1 },
  },
  {
    id: 'zanghua', who: 'both', icon: '🌸', name: '一起葬花', desc: '只在春秋', hp: 8, bg: 'park', req: { season: ['春', '秋'] },
    lines: ['黛玉把落花一捧一捧扫进锦囊。悟空蹲在旁边，用金箍棒刨了个小坑。', '「花谢花飞花满天……」黛玉念到一半，悟空接：「明年还开，俺年年陪你扫。」'],
    eff: { sweet: 5, dy_mood: 4, wk_mood: -1, shi: 1, rou: 1 },
  },
  {
    id: 'kite', who: 'both', icon: '🪁', name: '放风筝', desc: '有风的日子才飞得高', hp: 12, cost: 20, bg: 'park',
    async run() {
      if (today().weather === '风') { await narr('风正好。美人风筝越飞越高。黛玉剪断了线——老辈人说，这样就把病根儿放走了。'); eff({ health: 5, dy_mood: 6 }); }
      else await narr('风太小，风筝飞了两丈就往下栽。悟空举着风筝满草坪跑，比风筝飞得还高。');
    },
    eff: { sweet: 5, kai: 2, wk_mood: 4, dy_mood: 2 },
  },
  {
    id: 'hike', who: 'both', icon: '⛰', name: '爬紫金山', desc: '悟空最爱 · 黛玉会累', hp: { wk: 12, dy: 20 }, bg: 'park', req: { sweet: 20 },
    lines: ['爬到一半黛玉就走不动了。剩下的路，是悟空背上去的。', '山顶上，悟空指着远处说：「从前俺一个跟斗，能翻到那边去。」黛玉说：「现在呢？」「现在，俺陪你慢慢走。」'],
    eff: { sweet: 5, wk_mood: 6, dy_mood: -3, health: 3, kai: 1, yong: 2 },
  },
  {
    id: 'amuse', who: 'both', icon: '🎡', name: '游乐园', desc: '悟空玩疯了 · 黛玉怕吵', hp: 20, cost: 200, bg: 'city', req: { sweet: 40 },
    async run() {
      await narr('悟空坐了三遍过山车。黛玉在下面拿着两个人的外套。');
      await choose([
        { who: 'wk', t: '「最后坐一次摩天轮吧，就我们俩。」', eff: { dy_mood: 6 }, then: () => say('dy', '从这么高看金陵城……你从前，飞得比这还高吧？', 'shy') },
        { who: 'dy', t: '「我……也想坐一次过山车。」', req: { yong: 15 }, eff: { yong: 3, kai: 2, wk_mood: 4 }, then: () => say('dy', '啊——！……再、再来一次！', 'surprise') },
      ]);
    },
    eff: { sweet: 8, wk_mood: 8, dy_mood: -2, kai: 3 },
  },
  {
    id: 'nap', who: 'both', icon: '😴', name: '一起午睡', desc: '回体力 · 每天两次', hp: { wk: -25, dy: -25 }, limit: 2, bg: 'livingRoom', indoor: true,
    async run() {
      if (G.home.sofa) { eff({ wk_hp: 10, dy_hp: 10 }, true); await narr('懒人沙发陷下去一大块。两个人挤在里面，睡得很沉。'); }
      else await narr(rand(['窗外有鸟叫。两个人头靠着头睡着了。', '黛玉睡觉很轻。悟空一动不动，怕吵醒她。']));
    },
    eff: { sweet: 1 },
  },
  {
    id: 'homemovie', who: 'both', icon: '📽', name: '在家看电影', desc: '有投影仪就不用出门', hp: 3, bg: 'livingRoom', indoor: true, req: { home: 'projector' }, hideUntil: { home: 'projector' },
    lines: ['关了灯，投影打在白墙上。黛玉裹着毯子，悟空抱着一盆爆米花。', '放的是一部老电影。黛玉看哭了，悟空假装没看见，递了张纸巾。'],
    eff: { sweet: 4, wk_mood: 3, dy_mood: 4 },
  },
  {
    id: 'qinhuai', who: 'both', icon: '🏮', name: '夜游秦淮', desc: '晚上才去得了', hp: 8, cost: 150, bg: 'lake', hours: [18, 24], req: { sweet: 60 },
    lines: ['画舫在河上慢慢走，两岸灯火碎在水里。黛玉放了一盏河灯，不肯说许了什么愿。', '桨声灯影里，悟空第一次念了一句诗。念错了两个字，黛玉没有纠正他。'],
    eff: { sweet: 8, wk_mood: 5, dy_mood: 7 },
  },
  {
    id: 'stars', who: 'both', icon: '✨', name: '山顶看星星', desc: '晚上才去得了 · 很累', hp: 18, bg: 'mountain', hours: [19, 24], req: { sweet: 250 },
    lines: ['黛玉问：「天上真有神仙么？」悟空说：「有，而且挺无聊的。」', '流星划过去。黛玉闭眼许愿。悟空看着她，忘了许。'],
    eff: { sweet: 9, mo: 2, wk_mood: 4, dy_mood: 6 },
  },

  // ================= 悟空一个人 =================
  { id: 'waimai', who: 'wk', icon: '🛵', name: '送外卖', desc: '来钱快 · 烟火气↑', hp: 20, pay: 120, bg: 'city',
    lines: ['悟空骑着电驴穿过半座城。若是筋斗云还在，十单只要一眨眼。', '一位大爷给了五星好评：「小伙子跑得跟猴似的。」', '订单备注：多放辣，别放香菜。悟空研究了半天什么是香菜。'],
    eff: { yan: 2, wk_mood: -2 } },
  { id: 'banzhuan', who: 'wk', icon: '🧱', name: '工地搬砖', desc: '最累，钱也最多', hp: 30, pay: 180, bg: 'work',
    lines: ['一百斤的水泥，悟空一只手拎两袋。工头看他的眼神像看妖怪。', '收工时满身灰。路过的小孩说：「妈妈，泥猴子。」'],
    eff: { yan: 1, wk_mood: -3 } },
  { id: 'zoo', who: 'wk', icon: '🐒', name: '猴山讲解员', desc: '轻松 · 耐心↑', hp: 15, pay: 100, bg: 'park',
    lines: ['「这只猴子为什么一直盯着你看？」游客问。悟空说：「因为它认得俺。」', '猴山的猴王对悟空毕恭毕敬，把最大的桃子递了过来。'],
    eff: { nai: 1 } },
  { id: 'wuguan', who: 'wk', icon: '🥋', name: '武馆代课', desc: '教小朋友打拳', hp: 20, pay: 200, bg: 'work', req: { yan: 15 },
    lines: ['悟空只用了七十二变里最基础的一招，全场小朋友就疯了。', '馆主问他师承何派。悟空想了想：「菩提祖师……的远房。」'],
    eff: { wk_mood: 2, nai: 1 } },
  { id: 'yeshi', who: 'wk', icon: '🍑', name: '夜市卖桃', desc: '傍晚以后 · 烟火气↑↑', hp: 15, pay: 90, bg: 'street', hours: [17, 24],
    lines: ['悟空吆喝：「蟠桃园同款！」城管来了，他跑得比谁都快。', '卖到最后剩三个。他吃了一个，留了两个带回家给黛玉。'],
    eff: { yan: 3 } },
  { id: 'dazuo', who: 'wk', icon: '🪷', name: '打坐静心', desc: '压一压猴性 · 耐心↑', hp: 5, bg: 'livingRoom', indoor: true,
    lines: ['悟空闭眼打坐。紧箍好像松了一点点。', '菩提祖师说过：心猿不定，意马难收。'],
    eff: { nai: 3, wk_mood: 2 } },
  { id: 'xuecai', who: 'wk', icon: '👨‍🍳', name: '偷偷学药膳', desc: '为她学 · 温柔↑', hp: 10, cost: 20, bg: 'livingRoom', indoor: true,
    lines: ['菜谱上写：川贝雪梨，润肺止咳。悟空把这一页折了个角。', '第一锅糊了。第二锅也糊了。第三锅，能吃。'],
    eff: { rou: 3 } },

  // ================= 黛玉一个人 =================
  { id: 'dyshop', who: 'dy', icon: '📚', name: '看书屋', desc: '潇湘书屋 · 诗名↑', hp: 10, pay: 60, bg: 'shop', indoor: true,
    lines: ['今天来了个小姑娘，买走了一本《漱玉词》。黛玉多送了她一枚书签。', '雨天没什么客人。黛玉在柜台后面抄了一下午的诗。'],
    eff: { shi: 1, dy_mood: 1 } },
  { id: 'dypoem', who: 'dy', icon: '✍️', name: '写诗投稿', desc: '诗名越高，越容易登报', hp: 15, bg: 'livingRoom', indoor: true,
    async run() {
      const p = Math.min(0.85, 0.2 + G.shi / 100);
      if (chance(p)) { const fee = 80 + G.shi * 3; await narr(`《金陵晚报》登了黛玉的诗，稿费 ${fee} 元。悟空把报纸买了二十份。`); eff({ money: fee, dy_mood: 5, yong: 1 }); }
      else { await narr('退稿信来了。黛玉把信折好，夹进了书里。'); eff({ dy_mood: -2 }); }
    },
    eff: { shi: 2 } },
  { id: 'dydoctor', who: 'dy', icon: '🌿', name: '看中医', desc: '养身子 · 药很苦', hp: 5, cost: 80, bg: 'hospital', indoor: true,
    lines: ['老中医号了脉：「思虑太重。少想些，多笑笑。」', '药苦得黛玉皱眉。回家发现药包旁边多了一颗糖——悟空塞的。'],
    eff: { health: 8, dy_mood: -2 } },
  { id: 'dywalk', who: 'dy', icon: '🌅', name: '晨练打太极', desc: '公园里跟大爷大妈 · 身体↑', hp: 10, bg: 'park',
    lines: ['公园的大妈们拉着黛玉跳广场舞。她跳得很僵，但笑了。', '打太极的大爷夸她：「姑娘，你这一招白鹤亮翅，有灵气。」'],
    eff: { health: 3, kai: 2 } },
  { id: 'dyshishe', who: 'dy', icon: '🪭', name: '去诗社', desc: '认识新朋友 · 勇气↑', hp: 10, bg: 'tea', indoor: true, req: { shi: 15 },
    lines: ['诗社以「菊」为题。黛玉写了三首，夺了魁。', '第一次当众念自己的诗，黛玉的声音有点抖。念完，满座掌声。'],
    eff: { yong: 2, kai: 1, shi: 1, dy_mood: 3 } },

  // ================= 节日限定 =================
  { id: 'sj_shizi', who: 'both', holiday: 'shuangjiang', icon: '🟠', name: '霜降吃柿子', desc: '节气限定', hp: 3, bg: 'livingRoom', indoor: true,
    lines: ['老话说：霜降吃柿子，不会流鼻涕。黛玉剥了一个，分给悟空一半。'], eff: { sweet: 4, health: 3 } },
  { id: 'hw_dress', who: 'both', holiday: 'halloween', icon: '🎃', name: '一起扮装', desc: '万圣节限定', hp: 8, cost: 60, bg: 'livingRoom', indoor: true,
    lines: ['悟空说他不用扮，本来就是妖怪。黛玉说那我扮什么？悟空说：扮仙女，你本来就是。'], eff: { sweet: 6, kai: 2, wk_mood: 4, dy_mood: 4 } },
  { id: 'hw_candy', who: 'both', holiday: 'halloween', icon: '🍬', name: '去讨糖', desc: '万圣节限定 · 晚上', hp: 10, bg: 'street', hours: [17, 24],
    lines: ['「不给糖就捣蛋！」邻居小孩被悟空的造型吓哭了，又被黛玉的糖哄好了。'], eff: { sweet: 6, yan: 2, yong: 2 } },
  { id: 'hw_lamp', who: 'both', holiday: 'halloween', icon: '🕯', name: '刻南瓜灯', desc: '万圣节限定', hp: 6, cost: 30, bg: 'livingRoom', indoor: true,
    lines: ['悟空刻的南瓜，是个猴脸。黛玉刻的，是一株草。'], eff: { sweet: 6, rou: 1, shi: 1 } },
  { id: 'ld_jiaozi', who: 'both', holiday: 'lidong', icon: '🥟', name: '立冬包饺子', desc: '节气限定', hp: 8, cost: 30, bg: 'livingRoom', indoor: true,
    lines: ['悟空包的饺子，个个像桃子。黛玉包的，每个褶子都一样多。'], eff: { sweet: 5, yan: 2, health: 2 } },
  { id: 'd11_cart', who: 'both', holiday: 'd11', icon: '🛒', name: '双十一凑单', desc: '限定 · 省钱还是花钱？', hp: 3, bg: 'livingRoom', indoor: true,
    lines: ['两人对着购物车算了一晚上满减。最后省了 17 块。悟空说：「够买一斤桃了。」'], eff: { sweet: 4, money: 17, yan: 1 } },
];

// ================= 吃点东西：回一点体力（每天最多三次） =================
const SNACKS = [
  { id: 'naicha', who: 'eat', free: true, icon: '🧋', name: '两杯奶茶', desc: '一人一杯', hp: { wk: -6, dy: -6 }, cost: 30, bg: 'street', lines: ['黛玉要三分糖。悟空要全糖加三份珍珠。'], eff: { wk_mood: 3, dy_mood: 3 } },
  { id: 'taozi', who: 'eat', free: true, icon: '🍑', name: '一盘桃', desc: '悟空的最爱', hp: { wk: -10 }, cost: 15, bg: 'livingRoom', lines: ['悟空一口一个。黛玉只吃了一小块，剩下的都推给了他。'], eff: { wk_mood: 4 } },
  { id: 'guihuagao', who: 'eat', free: true, icon: '🍡', name: '桂花糕', desc: '黛玉的最爱', hp: { dy: -10 }, cost: 25, bg: 'livingRoom', lines: ['「小时候在扬州，娘常做这个。」'], eff: { dy_mood: 4 } },
  { id: 'fensi', who: 'eat', free: true, icon: '🍜', name: '鸭血粉丝汤', desc: '金陵的味道', hp: { wk: -8, dy: -8 }, cost: 40, bg: 'street', lines: ['巷尾的老店，一碗汤热到心里。'], eff: { yan: 1, health: 1 } },
];

// ================= 小家：买一次，永久有效 =================
const HOME = [
  { id: 'luzi', icon: '🔥', name: '暖手炉', cost: 300, desc: '冬天黛玉身体不再变差' },
  { id: 'pajama', icon: '👘', name: '情侣睡衣', cost: 400, desc: '一只猴，一株草' },
  { id: 'peach', icon: '🪴', name: '桃树盆栽', cost: 500, desc: '阳台上的一点花果山' },
  { id: 'shelf', icon: '🗄', name: '大书架', cost: 600, desc: '黛玉的书终于放得下了' },
  { id: 'sofa', icon: '🛋', name: '懒人沙发', cost: 900, desc: '午睡多回 10 点体力' },
  { id: 'parrot', icon: '🦜', name: '鹦哥', cost: 1200, desc: '每天黛玉心情 +5' },
  { id: 'projector', icon: '📽', name: '投影仪', cost: 1500, desc: '解锁「在家看电影」' },
  { id: 'guqin', icon: '🪕', name: '古琴', cost: 2000, desc: '黛玉弹琴，悟空听' },
];
const HOME_BY_ID = Object.fromEntries(HOME.map(h => [h.id, h]));

// ================= 出门旅行 =================
const TRIPS = [
  { id: 'trip_yz', who: 'both', icon: '🚄', name: '烟花三月下扬州', desc: '回黛玉的家乡', hp: 40, cost: 3000, bg: 'lake', req: { sweet: 300 },
    lines: ['瘦西湖的水很软。黛玉指着一座老宅说：「我小时候，就住在那里。」'], eff: { sweet: 12, kai: 5, yong: 3, dy_mood: 10 } },
  { id: 'trip_hgs', who: 'both', icon: '⛰', name: '回花果山', desc: '带她回家', hp: 50, cost: 5000, bg: 'mountain', req: { sweet: 600 },
    lines: ['水帘洞还在。悟空拉着黛玉穿过瀑布：「这是俺家。以后，也是你家。」'], eff: { sweet: 15, rou: 5, mo: 5, wk_mood: 10 } },
];
