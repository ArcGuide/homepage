'use strict';
// 圣黛故事 · 危险场面：小概率撞上坏人、意外，悟空露一手。
// { id, after 在哪些活动之后可能发生, req 条件, cg 第一次撞见解锁的糖, run }
// 选项标 who：替悟空出手，或者让黛玉自己勇敢一回（看勇气）。

const DANGERS = [
  {
    id: 'robber', after: ['movie', 'qinhuai', 'stars', 'yeshi'], cg: 'danger_robber',
    async run() {
      bg('street'); couple();
      await narr('散场回家，抄了条近路。巷子里忽然窜出两个人，手里亮着刀。');
      await narr('「把手机、钱包都交出来！」');
      await say('dy', '（攥紧了悟空的袖子）', 'surprise');
      await choose([
        { who: 'wk', t: '「定！」——使个定身法', eff: { sweet: 6, yan: 2 }, then: async () => {
          await narr('两个劫匪保持着举刀的姿势，一动不动，像两尊雕像。');
          await say('wk', '黛玉，报警。俺数到一百再解开。', 'smile');
          await narr('警察来的时候，两人还定在原地，脸上全是惊恐。');
        } },
        { who: 'wk', t: '从耳朵里掏出金箍棒', eff: { sweet: 5, wk_mood: 5 }, then: async () => {
          await narr('一根绣花针迎风变成了碗口粗的棍子，「咚」地一声杵在地上，青石板裂了一道缝。');
          await narr('劫匪扔下刀就跑，跑得比悟空送外卖还快。');
          await say('dy', '你……你下次轻一点，地砖要赔的。', 'smile');
        } },
        { who: 'dy', t: '挡在悟空前面：「你们走开！」', req: { yong: 15 }, eff: { yong: 4, sweet: 8, mo: 3 }, then: async () => {
          await narr('黛玉的声音在发抖，人却一步没退。');
          await narr('悟空愣了一下，随即笑了，轻轻把她拉到身后，一挥手——两个劫匪被一阵风刮到了巷子口。');
          await say('wk', '俺媳妇护着俺。俺这辈子没被人护过。', 'shy');
        } },
      ]);
    },
  },
  {
    id: 'drunk', after: ['dyshop', 'tea', 'dyshishe'], cg: 'danger_drunk',
    async run() {
      bg('shop'); show('dy');
      await narr('一个醉汉闯进书屋，赖着不走，还伸手去拉黛玉。');
      await say('dy', '你……你放手！', 'angry');
      await narr('门口的风铃响了。');
      await choose([
        { who: 'wk', t: '一根手指按住他的肩膀', eff: { sweet: 5, rou: 1 }, then: async () => {
          show('wk');
          await narr('悟空只用了一根手指。醉汉整个人被按得跪在地上，酒一下子醒了。');
          await say('wk', '道歉。', 'angry');
          await narr('醉汉对着黛玉磕了三个头，连滚带爬地跑了。');
        } },
        { who: 'dy', t: '抄起砚台：「出去！」', req: { yong: 12 }, eff: { yong: 5, sweet: 6 }, then: async () => {
          await narr('醉汉被黛玉的气势吓得退了一步——正好撞在刚进门的悟空身上。');
          show('wk');
          await say('wk', '听见没有？俺媳妇让你出去。', 'smile');
          await say('dy', '（手还在抖，但眼睛亮亮的）', 'smile');
        } },
      ]);
    },
  },
  {
    id: 'rock', after: ['hike'], cg: 'danger_rock',
    async run() {
      bg('park'); couple();
      await narr('山道上方传来一阵闷响。一块磨盘大的石头，滚着朝黛玉砸了下来。');
      await choose([
        { who: 'wk', t: '单手接住', eff: { sweet: 7, mo: 2 }, then: async () => {
          await narr('悟空一步跨过去，单手托住了那块石头，像托着一个西瓜。');
          await say('wk', '同是石头，你怎么不长眼睛？', 'angry');
          await narr('他把石头轻轻放在路边。黛玉扑进他怀里，半天没说话。');
        } },
        { who: 'wk', t: '一拳把石头打成粉', eff: { sweet: 5, wk_mood: 4 }, then: async () => {
          await narr('「砰」地一声，石头碎成了一阵灰。');
          await say('dy', '咳、咳……你……下次能不能打得干净点……', 'sad');
          await say('wk', '……对不住对不住。', 'shy');
        } },
      ]);
    },
  },
  {
    id: 'coaster', after: ['amuse'], cg: 'danger_coaster',
    async run() {
      bg('city'); couple();
      await narr('过山车爬到最高处，「咔」地一声，停住了。满车的人都在尖叫。');
      await say('dy', '悟、悟空……', 'surprise');
      await choose([
        { who: 'wk', t: '翻出车厢，把整列车推回站台', eff: { sweet: 7, yan: 3 }, then: async () => {
          await narr('悟空解开安全带，一个跟斗翻到轨道上，扛着整列过山车，一步一步走回了站台。');
          await narr('第二天的新闻标题：《游乐园惊现神秘大侠，疑似猴山讲解员》。');
        } },
        { who: 'wk', t: '握住她的手：「别怕，俺在。」然后悄悄捏个诀', eff: { sweet: 8, rou: 2 }, then: async () => {
          await narr('悟空一只手握着黛玉，另一只手在身后捏了个诀。过山车「咔哒」一声，又动了起来。');
          await say('dy', '刚才……是你？', 'surprise');
          await say('wk', '俺什么也没干。俺就握着你。', 'smile');
        } },
      ]);
    },
  },
  {
    id: 'fire', after: ['dyshop', 'read', 'dypoem'], cg: 'danger_fire',
    async run() {
      bg('shop'); couple();
      await narr('隔壁的电线短路，火苗一下子窜进了书屋的后窗。一排书架烧了起来。');
      await say('dy', '我的书……！', 'sad');
      await choose([
        { who: 'wk', t: '「龙王！下雨！」', eff: { sweet: 6, yan: 2 }, then: async () => {
          await narr('一朵乌云正正好好停在书屋上空，下了一场只有三丈宽的大雨。');
          await narr('火灭了。隔壁的大爷站在雨外面，身上一滴没湿，目瞪口呆。');
        } },
        { who: 'wk', t: '一口气把火吹灭', eff: { sweet: 5 }, then: async () => {
          await narr('悟空深吸一口气，一吹——火灭了，书也全被吹到了街上。');
          await narr('两个人在街上捡了一下午的书。黛玉一边捡一边笑。');
        } },
        { who: 'dy', t: '冲进去，先抢出那本《西游记》', req: { yong: 20 }, eff: { yong: 5, sweet: 9, mo: 3 }, then: async () => {
          await narr('黛玉冲进了烟里。悟空吓坏了，一把把她捞出来，顺手灭了火。');
          await narr('她怀里紧紧抱着的，是书架最高一格那本《西游记》。');
          await say('wk', '你疯了？！一本书而已！', 'angry');
          await say('dy', '不是一本书而已。', 'shy');
        } },
      ]);
    },
  },
  {
    id: 'river', after: ['waimai', 'park'], cg: 'danger_river',
    async run() {
      bg('park'); show('wk');
      await narr('湖边有人喊救命——一个小孩掉进了水里。');
      await choose([
        { who: 'wk', t: '跳下去', eff: { sweet: 4, yan: 4, money: 200 }, then: async () => {
          await narr('悟空一个猛子扎下去，把小孩托出了水面。');
          await narr('第二天，「外卖小哥湖中救人」上了本地新闻。街道送来一面锦旗和两百块奖金。');
          await say('dy', '（把那面锦旗挂在了书屋最显眼的地方）', 'smile');
        } },
        { who: 'wk', t: '把金箍棒伸长，让孩子抓住', eff: { sweet: 4, yan: 3, money: 200 }, then: async () => {
          await narr('一根棍子从岸边伸了十丈远，正好停在孩子手边。');
          await narr('围观的人都以为自己看错了。只有孩子说：「是孙悟空救了我。」没人信。');
        } },
      ]);
    },
  },
  {
    id: 'baigujing', p: 0.02, after: ['park', 'zanghua', 'dywalk'], req: { sweet: 200 }, cg: 'danger_baigujing',
    async run() {
      bg('park'); couple();
      await narr('悟空回到湖边，看见两个黛玉站在桂花树下。一模一样的衣裳，一模一样的脸。');
      await narr('两个黛玉同时开口：「悟空，她是假的！」');
      await choose([
        { who: 'wk', t: '火眼金睛', eff: { sweet: 6 }, then: async () => {
          await narr('悟空眼里金光一闪。左边那个黛玉的影子，是一具白骨。');
          await narr('一棒下去，白骨精化作一阵青烟。');
          await say('dy', '你……这回认出来了。', 'smile');
          await say('wk', '五百年前认错过一次妖怪，被师父赶回了花果山。这回，俺不会再认错了。', 'shy');
        } },
        { who: 'wk', t: '「对诗：花谢花飞花满天——」', req: { shi: 20 }, eff: { sweet: 9, mo: 4 }, then: async () => {
          await narr('右边的黛玉立刻接上：「红消香断有谁怜。」左边那个张了张嘴，答不上来。');
          await narr('悟空一棒打散了白骨精，回头对黛玉说：');
          await say('wk', '你的诗，俺都会背了。', 'smile');
          await say('dy', '……什么时候背的？', 'surprise');
        } },
      ]);
    },
  },
];

CGS.push(
  { id: 'danger_robber', cat: '大圣出手', rarity: 'SR', icon: '🌃', title: '定！', hint: '晚上出门时小概率', caption: '两个劫匪定在原地，像两尊雕像。', art: '夜晚昏暗的小巷，两个蒙面劫匪举着刀僵在原地一动不动；男生把女生护在身后，伸出两指指向他们，指尖有金光' },
  { id: 'danger_drunk', cat: '大圣出手', rarity: 'R', icon: '🍺', title: '道歉', hint: '书屋、茶馆时小概率', caption: '醉汉对着她磕了三个头。', art: '书屋里，男生只用一根手指按着一个醉汉的肩膀，醉汉跪在地上；女生站在书架前，惊魂未定' },
  { id: 'danger_rock', cat: '大圣出手', rarity: 'SR', icon: '🪨', title: '同是石头', hint: '爬山时小概率', caption: '「同是石头，你怎么不长眼睛？」', art: '山间石阶上，男生单手托起一块磨盘大的巨石，另一只手护着身后的女生，碎石从山坡上滚落' },
  { id: 'danger_coaster', cat: '大圣出手', rarity: 'SSR', icon: '🎢', title: '扛着过山车', hint: '游乐园时小概率', caption: '《游乐园惊现神秘大侠，疑似猴山讲解员》', art: '游乐园的过山车轨道上，男生站在轨道上，双手扛着整列过山车往站台走，车里的游客张大嘴，女生在第一排望着他' },
  { id: 'danger_fire', cat: '大圣出手', rarity: 'SR', icon: '🔥', title: '三丈宽的雨', hint: '书屋时小概率', caption: '一场只有三丈宽的大雨。', art: '老街上，一朵乌云只罩着一间书屋，屋顶下着大雨浇灭了窗口的火，旁边街道阳光明媚，男生仰头指着云，女生抱着一摞书' },
  { id: 'danger_river', cat: '大圣出手', rarity: 'R', icon: '🏅', title: '锦旗', hint: '湖边、送外卖时小概率', caption: '「外卖小哥湖中救人」上了本地新闻。', art: '书屋墙上挂着一面红色锦旗，写着“见义勇为”；男生浑身还湿着，挠着头不好意思，女生站在锦旗下看着他笑' },
  { id: 'danger_baigujing', cat: '大圣出手', rarity: 'SSR', icon: '💀', title: '这回认出来了', hint: '甜度 200 以后·湖边极小概率', caption: '「这回，俺不会再认错了。」', art: '桂花树下站着两个一模一样的女生，其中一个身后的影子是一具白骨；男生站在对面，双眼泛着金光，手握金箍棒' },
);
