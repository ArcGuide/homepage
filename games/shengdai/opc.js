'use strict';
// 圣黛故事 · 星弧 OPC 支线：悟空参加星弧一人公司计划，用 AI 给潇湘书屋做一个小程序。
// 内容只用星弧网站上公开写着的规则（8 周、AI、上线、真实用户、build log、集体点评、Demo Day）。
// 不写任何费用、名额、资格、地区。改这里之前，先对照 starc.institute/cn/opc.html。

ACTS.push({
  id: 'opc_build', who: 'wk', icon: '💻', name: '星弧 OPC：做产品', desc: '用 AI 给书屋做小程序 · 推进支线', hp: 15, bg: 'livingRoom', indoor: true,
  req: { flag: 'opcJoined' }, hideUntil: { flag: 'opcJoined', noflag: 'opcDone' }, opc: true,
  lines: [
    '悟空对着屏幕，跟 AI 助手吵了一下午。最后发现，是自己少打了一个括号。',
    '他把今天卡住的地方，一条一条记进了 build log。',
    '黛玉端了杯茶进来。屏幕上的小程序，又多了一个按钮。',
    '「AI 说这样写更好。」悟空想了想：「俺先试试，不行再说。」',
  ],
  eff: { yan: 1, nai: 1 },
});

async function OPC_INVITE() {
  await say('dy', '悟空，你看这个。', 'surprise');
  await narr('黛玉的手机上，是星弧的一条招募：「一人公司计划：8 周，用 AI 做一个真实的小产品，上线，找到真实用户，再如实写下过程。」');
  await say('wk', '俺？做产品？俺连字都写不好。', 'surprise');
  await say('dy', '上面写了：不要求会写代码，但要愿意边做边学。', 'smile');
  await say('dy', '你总说书屋客人少。给书屋做个小程序吧——每天推一首诗，告诉大家新到了什么书。');
  await choose([
    { who: 'wk', t: '「行！俺老孙学七十二变都没怕过，还怕这个？」', eff: { flag: 'opcJoined', yan: 2 } },
    { who: 'dy', t: '「你做，我当你第一个用户。」', eff: { flag: 'opcJoined', sweet: 3 } },
  ]);
  await unlockCG(CGS.find(c => c.id === 'opc_join'));
  modal(`<div class="card">${aboutHTML()}<div style="margin-top:12px"><button class="btn primary" id="card-ok">继续</button></div></div>`);
  await new Promise(r => { cardResolve = r; $('#card-ok').onclick = () => closeModal(); });
  toast('解锁：悟空「星弧 OPC：做产品」', 'big');
}

// 做产品累计到第 at 次，触发一段剧情
const OPC_BEATS = [
  { at: 1, async run() {
    await narr('第 0 周：准备。装好 AI 编程助手、git 和部署平台，跑通「写一行代码 → 上线」。');
    await say('wk', '黛玉！你看！俺写的「你好」，在网上了！', 'smile');
    await say('dy', '……就两个字？', 'smile');
    await say('wk', '两个字也是上线了！', 'smile');
  } },
  { at: 3, async run() {
    await narr('第 1 周：找到问题。和至少 10 个潜在用户聊过。');
    await narr('悟空问了书屋的老顾客、菜市场的大妈、猴山的游客，甚至问了八戒。');
    await say('wk', '他们都说想知道书屋新到了什么书。还有人说，想每天读一首短诗，在地铁上看。', 'default');
    await say('dy', '那就做这个。', 'smile');
  } },
  { at: 6, cg: 'opc_v0', async run() {
    await narr('第 2 周：最小版本上线，有一个公开网址。');
    await narr('小程序叫「潇湘诗笺」。第一天，用户数：1。');
    await say('dy', '这个 1，是我。', 'shy');
    await say('wk', '最重要的那个用户。', 'smile');
  } },
  { at: 9, async run() {
    await narr('第 3 周：至少 5 个真实用户用过，记下他们怎么用、卡在哪里。');
    await narr('有个大爷说字太小看不清。有个学生说想收藏喜欢的诗。悟空一条条记了下来。');
    await say('wk', '原来做东西，就是听人家说哪里不好用。', 'default');
  } },
  { at: 12, cg: 'opc_review', async run() {
    await narr('第 4 周：迭代，加上周三晚上的集体点评。每个人讲 5 分钟。');
    await say('wk', '俺……俺上过凌霄宝殿，都没这么紧张过。', 'sad');
    await say('dy', '你就讲你自己做了什么，做得不好的地方也讲。', 'smile');
    await narr('讲完，有人问：字号的问题怎么解决的？悟空答得很认真。');
  } },
  { at: 15, async run() {
    await narr('第 5 周：分发实验。选一个渠道试一次，记下数据。');
    await narr('黛玉在小红书上发了一首诗，附上小程序的链接。当天来了 23 个新用户。');
    await say('wk', '二十三个！俺要写进 build log！', 'smile');
  } },
  { at: 18, cg: 'opc_1yuan', async run() {
    await narr('第 6 周：衡量用户会不会回来，或者试着收费——哪怕 1 元。');
    await narr('悟空加了个按钮：「请黛玉写一首诗给你，1 元。」');
    await narr('第二天，收到了第一笔钱：1 元。备注：「给奶奶的生日诗。」');
    await say('dy', '……我会好好写的。', 'shy');
  } },
  { at: 21, cg: 'opc_honest', async run() {
    await narr('第 7 周：打磨，写结业案例。');
    await narr('悟空看着后台：有一半用户，用了一次就再没回来。');
    await choose([
      { who: 'wk', t: '如实写进 build log：「一半人没回来，原因还没找到。」', eff: { nai: 3, sweet: 4 }, then: async () => {
        await say('dy', '写「没人用」，好过编一个数字。', 'smile');
        await say('wk', '这句话俺记住了。', 'default');
      } },
      { who: 'wk', t: '「要不……把数字写好看一点？」', eff: { nai: 1 }, then: async () => {
        await say('dy', '那你做的，就是一个假的东西了。', 'sad');
        await say('wk', '……你说得对。俺改回来。', 'shy');
      } },
    ]);
  } },
  { at: 24, cg: 'opc_demo', async run() {
    await narr('第 8 周：Demo Day。公开展示在线的产品、真实的数据、完整的 build log。');
    await narr('悟空站在屏幕前，讲「潇湘诗笺」怎么从 1 个用户做起来。讲到第一笔 1 块钱的时候，台下笑了，他也笑了。');
    await say('dy', '（在台下，举着手机录了全程）', 'smile');
    await say('wk', '俺以前是齐天大圣。现在，俺是做出过一个真东西的人。', 'smile');
    eff({ flag: 'opcDone', yan: 10, money: 500 });
    toast('结业！以后小程序每天都有一点收入', 'big');
  } },
];

CGS.push(
  { id: 'opc_join', cat: '星弧 OPC', rarity: 'R', icon: '📮', title: '报名', hint: '甜度和烟火气够了以后', caption: '「不要求会写代码，但要愿意边做边学。」', art: '书屋柜台后，女生举着手机给男生看屏幕，男生凑过去看，一脸跃跃欲试；柜台上摆着一叠诗稿和一盏台灯' },
  { id: 'opc_v0', cat: '星弧 OPC', rarity: 'SR', icon: '1️⃣', title: '第一个用户', hint: '星弧 OPC · 第 2 周', caption: '「这个 1，是我。」', art: '夜晚的书桌前，笔记本电脑屏幕上显示一个古风诗词小程序，后台写着“用户数 1”；女生坐在男生身边，举着自己的手机，屏幕上是同一个小程序' },
  { id: 'opc_review', cat: '星弧 OPC', rarity: 'R', icon: '🎙', title: '五分钟', hint: '星弧 OPC · 第 4 周', caption: '「上过凌霄宝殿，都没这么紧张过。」', art: '客厅里，男生坐在电脑前参加线上会议，屏幕里是一格格的视频小窗口，他紧张得挺直了背；女生在镜头外，对他比了个加油的手势' },
  { id: 'opc_1yuan', cat: '星弧 OPC', rarity: 'SR', icon: '🪙', title: '第一块钱', hint: '星弧 OPC · 第 6 周', caption: '备注：「给奶奶的生日诗。」', art: '书桌上，手机屏幕显示收到 1 元，备注“给奶奶的生日诗”；女生提着毛笔，认真地在红色诗笺上写字，男生在旁边研墨' },
  { id: 'opc_honest', cat: '星弧 OPC', rarity: 'R', icon: '📝', title: '如实写下', hint: '星弧 OPC · 第 7 周', caption: '「写『没人用』，好过编一个数字。」', art: '深夜的书桌，电脑屏幕上是一篇写了一半的周记，男生托着腮想事情，女生靠在他肩上看屏幕，台灯暖光' },
  { id: 'opc_demo', cat: '星弧 OPC', rarity: 'SSR', icon: '🎓', title: 'Demo Day', hint: '星弧 OPC · 结业', caption: '「现在，俺是做出过一个真东西的人。」', art: '小型分享会现场，男生站在投影屏幕前讲解，屏幕上是古风小程序和一条上升的用户曲线；台下第一排的女生举着手机录像，眼里有光' },
);
