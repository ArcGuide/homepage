// 素材清单：把图片放进 assets/ 文件夹，再在这里填上文件名即可替换占位图。
// 留空（null）就用内置的印章式占位立绘 / 渐变背景。
//
// 立绘：每个角色可以有多个表情，没填的表情会退回 default。
//   表情名：default 默认 · smile 笑 · shy 害羞 · sad 难过 · angry 生气 · surprise 惊讶
// 背景：键名对应游戏里的场景。
window.ASSETS = {
  portraits: {
    wk: { default: null, smile: null, shy: null, sad: null, angry: null, surprise: null }, // 孙悟空
    dy: { default: null, smile: null, shy: null, sad: null, angry: null, surprise: null }, // 林黛玉
    by: { default: null },  // 贾宝玉
    zj: { default: null },  // 紫鹃
    bj: { default: null },  // 猪八戒
    ts: { default: null },  // 唐僧
    bc: { default: null },  // 薛宝钗
  },
  // 每个场景都可以另配一张夜景：键名加 _night（例如 park_night），晚上会自动换上；没配就把白天的图压暗
  backgrounds: {
    sky: null,      // 序章·天界
    city: null,     // 金陵城街景
    park: null,     // 玄武湖·公园
    shop: null,     // 潇湘书屋
    tea: null,      // 茶馆
    cinema: null,   // 电影院
    street: null,   // 街市 / 夜市
    lake: null,     // 湖心亭·月夜
    mountain: null, // 山顶星空
    livingRoom: null, // 两人的小家·客厅（夜景用 livingRoom_night）
    work: null,     // 打工场所
    heaven: null,   // 灵山
    hospital: null, // 医院
  },
  // 糖图鉴配图：键名是 cg.js 里每颗糖的 id，例：park_shake: 'assets/cg_park_shake.jpg'
  cg: {},
  // 例：portraits.dy.default = 'assets/daiyu.png'; backgrounds.park = 'assets/park.jpg';
};
