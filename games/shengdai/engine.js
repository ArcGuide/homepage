'use strict';
// 圣黛故事 · 引擎
// 一对已经在一起的情侣，跟着现实日历过日子：没有结局，体力随现实时间恢复，靠糖图鉴和节日剧情持续更新。
// 内容在 data.js（活动/零食/小家）、cg.js（糖图鉴）、events.js（剧情/节日/吵架/随机事件）。

const $ = s => document.querySelector(s);
const rand = arr => arr[Math.floor(Math.random() * arr.length)];
const chance = p => Math.random() < p;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const CHARS = {
  wk: { name: '孙悟空', short: '悟', glyph: '悟', color: '#b88a2e', side: 'left' },
  dy: { name: '林黛玉', short: '黛', glyph: '黛', color: '#3d5a6c', side: 'right' },
  by: { name: '贾宝玉', glyph: '玉', color: '#b5402f', side: 'right' },
  zj: { name: '紫鹃', glyph: '鹃', color: '#7a5c8a', side: 'right' },
  bj: { name: '猪八戒', glyph: '戒', color: '#c0707f', side: 'right' },
  ts: { name: '唐僧', glyph: '僧', color: '#9a8048', side: 'right' },
  bc: { name: '薛宝钗', glyph: '钗', color: '#c29a2a', side: 'right' },
};
const FACE_MARK = { smile: '◡', shy: '///', sad: '︶', angry: '！', surprise: '？', default: '' };

const STAT = {
  money: '金钱', sweet: '甜度', mo: '默契',
  wk_hp: '悟空体力', dy_hp: '黛玉体力', wk_mood: '悟空心情', dy_mood: '黛玉心情',
  nai: '耐心', rou: '温柔', yan: '烟火气', health: '黛玉身体', kai: '开朗', yong: '勇气', shi: '诗名',
};
const BOUNDED = { wk_hp: 100, dy_hp: 100, wk_mood: 100, dy_mood: 100, health: 100 }; // 其余成长都没有上限
const SAVE_KEY = 'shengdai_v2';
const REGEN_MS = 5 * 60 * 1000; // 每 5 分钟恢复 1 点体力
const RARITY_COLOR = { N: '#8a8f8c', R: '#3d5a6c', SR: '#b88a2e', SSR: '#b5402f' };

// ================= 时间：跟着现实走 =================
// 调试：?date=2026-10-31&hour=21
const Q = new URLSearchParams(location.search);
// 调试版：网址加 ?debug=1，显示设计用的小字、图鉴提示、概率提示，并允许 ?date= / ?hour= 改时间
const DEBUG = Q.has('debug');
document.documentElement.classList.toggle('debug', DEBUG);
function now() {
  const d = new Date();
  if (!DEBUG) return d;
  if (Q.get('date')) { const [y, m, dd] = Q.get('date').split('-').map(Number); d.setFullYear(y, m - 1, dd); }
  if (Q.get('hour')) d.setHours(Number(Q.get('hour')));
  return d;
}
const pad = n => String(n).padStart(2, '0');
const dayKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysBetween = (a, b) => Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }

const WEATHER_ICON = { 晴: '☀️', 阴: '☁️', 雨: '🌧', 风: '🍃', 桂香: '🌼', 雪: '❄️' };
function weatherOf(key) { // 同一天天气固定，刷新也不会变
  const m = Number(key.slice(5, 7)), r = hash(key + '天气');
  if ([12, 1, 2].includes(m)) return r < .35 ? '晴' : r < .6 ? '阴' : r < .78 ? '雪' : r < .9 ? '雨' : '风';
  if ([9, 10].includes(m)) return r < .4 ? '晴' : r < .6 ? '阴' : r < .8 ? '雨' : r < .9 ? '风' : '桂香';
  return r < .42 ? '晴' : r < .64 ? '阴' : r < .86 ? '雨' : '风';
}
const periodOf = h => h < 5 ? '深夜' : h < 11 ? '上午' : h < 14 ? '中午' : h < 18 ? '下午' : h < 23 ? '晚上' : '深夜';
const seasonOf = m => [3, 4, 5].includes(m) ? '春' : [6, 7, 8].includes(m) ? '夏' : [9, 10, 11].includes(m) ? '秋' : '冬';

// 节日不卡死在那一天：前后各 3 天（共一周）都算节日期间，错过了明年还有
const HOLIDAY_SPAN = 3;
function activeHolidays(d) {
  const out = [];
  for (let off = -HOLIDAY_SPAN; off <= HOLIDAY_SPAN; off++) {
    const x = new Date(d); x.setDate(x.getDate() - off); // 节日是 off 天之前（off<0 表示还没到）
    const h = HOLIDAYS[dayKey(x).slice(5)];
    if (h) { const end = new Date(x); end.setDate(end.getDate() + HOLIDAY_SPAN); out.push({ ...h, dist: Math.abs(off), end }); }
  }
  return out.sort((a, b) => a.dist - b.dist);
}
// 白天/夜晚可以手动切换，不必跟着现实时间：auto 跟现实，day 当下午，night 当晚上
const TIME_MODES = { auto: '跟随现实', day: '白天', night: '夜晚' };
function effectiveHour(real) {
  const mode = G?.timeMode || 'auto';
  if (mode === 'day') return (real >= 8 && real < 18) ? real : 14;
  if (mode === 'night') return (real >= 18 && real < 24) ? real : 21;
  return real;
}
function today() {
  const d = now(), key = dayKey(d), md = key.slice(5);
  const hour = effectiveHour(d.getHours());
  const hs = activeHolidays(d);
  return {
    key, md, year: d.getFullYear(), month: d.getMonth() + 1, hour,
    weather: weatherOf(key), period: periodOf(hour), season: seasonOf(d.getMonth() + 1),
    holiday: hs[0] || null, holidays: hs.map(h => h.id), holidayList: hs,
  };
}
const WEEK = '日一二三四五六';
const dateLabel = () => { const d = now(); return `${d.getMonth() + 1}月${d.getDate()}日 周${WEEK[d.getDay()]}`; };

// ================= 存档 =================
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};
let G = null;
function newState() {
  const t = today();
  return {
    v: 2, created: t.key, day: t.key, lastTs: Date.now(),
    money: 300, sweet: 0, mo: 0,
    wk_hp: 100, dy_hp: 100, wk_mood: 70, dy_mood: 70,
    nai: 5, rou: 5, yan: 0, health: 55, kai: 5, yong: 5, shi: 5,
    cg: {}, flags: {}, home: {}, counts: {}, daily: { counts: {}, snack: 0, quarrels: 0, events: {} },
    miss: 0, acts: 0, refillUsed: false, quarrel: null, diary: [], seen: {},
  };
}
const save = () => { if (G) store.set(SAVE_KEY, G); };

// ================= 数值 =================
// 甜度等级：没有上限，越往后每级要的越多
const SWEET_TITLES = ['刚在一起', '如胶似漆', '形影不离', '心有灵犀', '蜜里调油', '举案齐眉', '老夫老妻', '神仙眷侣', '天作之合', '木石前盟'];
function sweetLevel(s) {
  let lv = 0, need = 30, acc = 0;
  while (s >= acc + need) { acc += need; lv += 1; need = 30 + lv * 15; }
  return { lv, into: s - acc, need, title: SWEET_TITLES[Math.min(lv, SWEET_TITLES.length - 1)] + (lv >= SWEET_TITLES.length ? ` · ${lv - SWEET_TITLES.length + 2}重` : '') };
}
const WK_TITLES = [[0, '泼猴'], [20, '凡间新手'], [50, '外卖骑士'], [90, '暖男猴'], [150, '烟火大圣'], [240, '人间大圣']];
const DY_TITLES = [[0, '病西施'], [20, '书屋掌柜'], [50, '小有诗名'], [90, '开朗黛玉'], [150, '潇湘诗人'], [240, '金陵才女']];
const titleOf = (tbl, v) => { let t = tbl[0][1]; for (const [n, s] of tbl) if (v >= n) t = s; return t; };
const wkTitle = () => titleOf(WK_TITLES, G.nai + G.rou + G.yan);
const dyTitle = () => titleOf(DY_TITLES, G.kai + G.yong + G.shi);
const togetherDays = () => daysBetween(G.created, today().key) + 1;

function meets(req) {
  if (!req) return true;
  const t = today();
  for (const k in req) {
    const v = req[k];
    if (k === 'flag') { if (![].concat(v).every(f => G.flags[f])) return false; }
    else if (k === 'noflag') { if ([].concat(v).some(f => G.flags[f])) return false; }
    else if (k === 'home') { if (!G.home[v]) return false; }
    else if (k === 'cg') { if (!G.cg[v]) return false; }
    else if (k === 'weather') { if (![].concat(v).includes(t.weather)) return false; }
    else if (k === 'season') { if (![].concat(v).includes(t.season)) return false; }
    else if (k === 'holiday') { if (!t.holidays.includes(v)) return false; }
    else if (k === 'maxhealth') { if (G.health > v) return false; }
    else if ((G[k] ?? 0) < v) return false;
  }
  return true;
}
function reqText(req) {
  if (!req) return '';
  const out = [];
  for (const k in req) {
    if (['flag', 'noflag', 'cg', 'holiday', 'maxhealth'].includes(k)) continue;
    if (k === 'home') { out.push('需' + (HOME_BY_ID[req.home]?.name || req.home)); continue; }
    if (k === 'weather') { out.push([].concat(req.weather).join('/') + '天'); continue; }
    if (k === 'season') { out.push([].concat(req.season).join('/') + '季'); continue; }
    if (k === 'money') { out.push('¥' + req.money); continue; }
    if (k === 'sweet') { out.push('甜度' + req.sweet); continue; }
    out.push((STAT[k] || k) + '≥' + req[k]);
  }
  return out.join(' ');
}

function eff(d, quiet) {
  if (!d) return;
  const before = sweetLevel(G.sweet).lv;
  for (const k in d) {
    let v = d[k];
    if (k === 'flag') { [].concat(v).forEach(f => G.flags[f] = true); continue; }
    if (k === 'unflag') { [].concat(v).forEach(f => delete G.flags[f]); continue; }
    if (k === 'sweet' && v > 0) v = Math.round(v * (0.6 + (G.wk_mood + G.dy_mood) / 250)); // 两人心情好，糖更甜
    const old = G[k] ?? 0;
    let nv = old + v;
    nv = BOUNDED[k] ? clamp(nv, 0, BOUNDED[k]) : Math.max(0, nv);
    if (k === 'wk_hp' || k === 'dy_hp') { if (old >= 100 && nv < 100) G.lastTs = Date.now(); }
    G[k] = nv;
    const real = nv - old;
    if (!quiet && real !== 0) toast(k === 'money' ? `¥ ${real > 0 ? '+' : ''}${real}` : `${STAT[k]} ${real > 0 ? '+' : ''}${real}`, real < 0 ? 'down' : 'up');
  }
  const after = sweetLevel(G.sweet);
  if (after.lv > before) toast(`甜度升级：${after.title}`, 'big');
  renderHud();
}

// 体力随现实时间恢复
function regen() {
  if (!G) return;
  const n = Math.floor((Date.now() - G.lastTs) / REGEN_MS);
  if (n > 0) {
    G.wk_hp = Math.min(100, G.wk_hp + n);
    G.dy_hp = Math.min(100, G.dy_hp + n);
    G.lastTs += n * REGEN_MS;
    if (G.wk_hp >= 100 && G.dy_hp >= 100) G.lastTs = Date.now();
  }
}
const nextRegenMin = () => Math.max(1, Math.ceil((G.lastTs + REGEN_MS - Date.now()) / 60000));

// ================= 浮字 =================
function toast(msg, cls = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + cls;
  el.textContent = msg;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

// ================= 舞台 =================
// 背景跟着现实时间：晚上（18 点到第二天 5 点）优先用 <场景>_night，没有夜景图就把白天的图压暗
const isNightNow = () => { const h = today().hour; return h >= 18 || h < 5; }; // 已按白天/夜晚开关换算
function bg(key) {
  const el = $('#bg'), A = window.ASSETS?.backgrounds || {};
  const night = isNightNow();
  const nightSrc = night ? A[key + '_night'] : null;
  const src = nightSrc || A[key];
  el.className = 'bg-' + key;
  el.style.backgroundImage = src ? `url("${src}")` : '';
  el.classList.toggle('has-img', !!src);
  el.classList.toggle('is-night', night && !nightSrc);
  hide();
}
function weatherFx(on = true) {
  const fx = $('#weather-fx'), w = today().weather;
  fx.className = '';
  if (!on) return;
  if (w === '雨') fx.className = 'rain';
  else if (w === '雪') fx.className = 'snow';
  else if (w === '桂香' || w === '风') fx.className = 'petal';
}
function portraitHTML(who, face) {
  const c = CHARS[who];
  const set = window.ASSETS?.portraits?.[who] || {};
  const src = set[face] || set.default;
  if (src) return `<img src="${src}" alt="${c.name}">`;
  return `<div class="ph" style="--c:${c.color}"><div class="g">${c.glyph}</div><div class="n">${c.name}</div><div class="f">${FACE_MARK[face] || ''}</div></div>`;
}
const onStage = { left: null, right: null };
function show(who, face = 'default') {
  const side = CHARS[who].side;
  const el = side === 'left' ? $('#pt-left') : $('#pt-right');
  const key = who + ':' + face;
  if (onStage[side] !== key) { el.innerHTML = portraitHTML(who, face); onStage[side] = key; el.classList.toggle('img', !!el.querySelector('img')); }
  el.classList.add('on');
}
function hide(who) {
  for (const side of ['left', 'right']) {
    if (who && CHARS[who].side !== side) continue;
    const el = side === 'left' ? $('#pt-left') : $('#pt-right');
    el.classList.remove('on', 'dim');
    onStage[side] = null;
  }
}
function focus(who) {
  $('#pt-left').classList.toggle('dim', !!who && CHARS[who]?.side !== 'left');
  $('#pt-right').classList.toggle('dim', !!who && CHARS[who]?.side !== 'right');
}
const couple = () => { show('wk'); show('dy'); focus(null); };

// ================= 对话 =================
let clickResolve = null, typing = null;
function openDialog() { $('#menu').hidden = true; $('#dialog').hidden = false; }
function closeDialog() { $('#dialog').hidden = true; }
function typeText(el, text) {
  return new Promise(res => {
    let i = 0;
    el.textContent = '';
    const tick = () => {
      i += 1;
      el.textContent = text.slice(0, i);
      if (i >= text.length) { typing = null; res(); } else typing.t = setTimeout(tick, 24);
    };
    typing = { finish: () => { clearTimeout(typing.t); el.textContent = text; typing = null; res(); } };
    typing.t = setTimeout(tick, 24);
  });
}
async function say(who, text, face = 'default') {
  openDialog();
  const sp = $('#speaker'), tx = $('#text');
  $('#choices').innerHTML = '';
  $('#next').hidden = false;
  if (who) { show(who, face); focus(who); sp.textContent = CHARS[who].name; sp.className = who; tx.className = ''; }
  else { focus(null); sp.textContent = ''; sp.className = ''; tx.className = 'narr'; }
  await typeText(tx, text);
  await new Promise(r => { clickResolve = r; });
}
const narr = t => say(null, t);
// 台词数组：[['wk','台词','smile'], [null,'旁白'], ...]
async function play(lines) { for (const [who, text, face] of lines) await say(who, text, face); }

// choose([{t, req, eff, then, who}]) → 所选选项文字。who 标注这句是替谁说的。
function choose(opts, prompt) {
  openDialog();
  $('#next').hidden = true;
  if (prompt !== undefined) { $('#speaker').textContent = ''; $('#text').className = 'narr'; $('#text').textContent = prompt; focus(null); }
  const box = $('#choices');
  box.innerHTML = '';
  return new Promise(res => {
    opts.forEach(o => {
      const b = document.createElement('button');
      b.className = 'choice';
      const rt = reqText(o.req);
      const tag = o.who ? `<span class="who ${o.who}">${CHARS[o.who].short}</span>` : '';
      b.innerHTML = tag + (rt ? `<span class="req">${rt}</span>` : '') + o.t;
      b.disabled = !meets(o.req);
      b.onclick = async e => {
        e.stopPropagation();
        box.innerHTML = '';
        $('#next').hidden = false;
        eff(o.eff);
        if (o.then) await o.then();
        res(o.t); // 不能 resolve 选项对象本身：它有 then 方法，会被当成 thenable
      };
      box.appendChild(b);
    });
  });
}
$('#dialog').addEventListener('click', () => {
  if (typing) { typing.finish(); return; }
  if (clickResolve) { const r = clickResolve; clickResolve = null; r(); }
});

// ================= HUD =================
const moodFace = m => m >= 75 ? '😊' : m >= 50 ? '🙂' : m >= 30 ? '😐' : '😣';
function renderHud() {
  if (!G) return;
  const t = today();
  $('#hud-date').textContent = dateLabel();
  $('#hud-weather').textContent = `${WEATHER_ICON[t.weather]} ${t.weather}`;
  $('#hud-slot').textContent = t.holiday ? t.holiday.name : t.period;
  const mode = G.timeMode || 'auto';
  $('#btn-time').textContent = mode === 'auto' ? (isNightNow() ? '🌙 自动' : '☀️ 自动') : mode === 'day' ? '☀️ 白天' : '🌙 夜晚';
  $('#hud-slot').classList.toggle('fest', !!t.holiday);
  $('#hud-money').textContent = `¥ ${G.money}`;
  $('#hud-wk-bar').style.width = G.wk_hp + '%';
  $('#hud-dy-bar').style.width = G.dy_hp + '%';
  $('#hud-wk').textContent = `${G.wk_hp} ${moodFace(G.wk_mood)}`;
  $('#hud-dy').textContent = `${G.dy_hp} ${moodFace(G.dy_mood)}`;
  const sl = sweetLevel(G.sweet);
  $('#hud-sweet-bar').style.width = (sl.into / sl.need * 100) + '%';
  $('#hud-sweet').textContent = `${sl.title} · 在一起第${togetherDays()}天`;
}

// ================= 行动 =================
function hpCost(a) {
  const base = typeof a.hp === 'object' ? { ...a.hp } : a.who === 'both' ? { wk: a.hp || 0, dy: a.hp || 0 } : { [a.who]: a.hp || 0 };
  if (base.dy > 0 && G.health < 30) base.dy += 5; // 身子弱，做什么都累
  return base;
}
function costHTML(a) {
  const c = hpCost(a), parts = [];
  if (a.cost) parts.push(`<span class="m">¥${a.cost}</span>`);
  if (a.pay) parts.push(`<span class="m">+¥${typeof a.pay === 'function' ? '?' : a.pay}</span>`);
  const hp = [];
  if (c.wk) hp.push(`悟${c.wk > 0 ? '-' : '+'}${Math.abs(c.wk)}`);
  if (c.dy) hp.push(`黛${c.dy > 0 ? '-' : '+'}${Math.abs(c.dy)}`);
  if (hp.length) parts.push(hp.join(' '));
  return parts.join('<br>');
}
function lockOf(a) {
  const t = today(), c = hpCost(a);
  if (a.hours && !(t.hour >= a.hours[0] && t.hour < a.hours[1])) return '晚上才能去 · 点右上角 ☀️ 切到夜晚';
  if (a.req && !meets(a.req)) return '解锁：' + reqText(a.req);
  if (G.quarrel && a.who === 'both' && !a.makeup) return '冷战中……先去和好吧';
  if (a.limit && (G.daily.counts[a.id] || 0) >= a.limit) return '今天做够了';
  if (c.wk > 0 && G.wk_hp < c.wk) return '悟空累了，歇会儿再来';
  if (c.dy > 0 && G.dy_hp < c.dy) return '黛玉累了，歇会儿再来';
  if (a.cost && G.money < a.cost) return '钱不够';
  return '';
}
const visible = a => (!a.holiday || today().holidays.includes(a.holiday)) && (!a.hideUntil || meets(a.hideUntil));

let busy = false;
async function doAct(a) {
  if (busy || lockOf(a)) return;
  busy = true;
  $('#menu').hidden = true;
  const c = hpCost(a);
  if (a.cost) G.money -= a.cost;
  eff({ wk_hp: -(c.wk || 0), dy_hp: -(c.dy || 0) }, true);
  G.counts[a.id] = (G.counts[a.id] || 0) + 1;
  G.daily.counts[a.id] = (G.daily.counts[a.id] || 0) + 1;
  if (!a.makeup && !a.free) G.acts += 1;
  bg(a.bg || 'city');
  weatherFx(!a.indoor);
  if (a.who === 'both' || a.who === 'eat') couple(); else if (CHARS[a.who]) show(a.who);
  if (a.who === 'eat') G.daily.snack += 1;

  // 分支：大概率走平常剧情，小概率出意外（多半是悟空用了法术）
  const out = pickOutcome(a);
  if (out) {
    toast(DEBUG ? (out.p >= 0.08 ? '✦ 小概率事件' : '✦✦ 极小概率事件') : '✦ 意外！', 'big');
    if (out.lines) await play(out.lines);
    if (out.run) await out.run();
    eff(out.eff);
  } else if (a.run) await a.run(a);
  else { await narr(rand(a.lines)); }
  eff(a.eff);
  if (a.pay) eff({ money: typeof a.pay === 'function' ? a.pay() : a.pay });

  // 思念：分开做事越久，下次在一起越甜
  if (a.who === 'wk' || a.who === 'dy') {
    G.miss += 1;
    if (G.miss >= 3) eff({ [a.who === 'wk' ? 'dy_mood' : 'wk_mood']: -2 }, true);
  } else if (a.who === 'both' && !a.makeup) {
    if (G.miss >= 2) { toast(DEBUG ? '小别胜新婚 · 甜度加成' : '小别胜新婚', 'big'); eff({ sweet: Math.min(G.miss, 6) }, true); }
    G.miss = 0;
  }

  if (out?.cg) { const c = CGS.find(x => x.id === out.cg); if (c && !G.cg[c.id]) await unlockCG(c); }
  else await tryCG(a);
  if (a.opc) await opcProgress();
  if (!(await tryDanger(a))) await afterAct(a);
  await storyChecks();
  closeDialog();
  busy = false;
  save();
  showMenu();
}

// ================= 分支与危险 =================
function pickOutcome(a) {
  const ok = (a.rare || []).filter(o => !o.req || meets(o.req));
  if (!ok.length) return null;
  // 第一天做到第 5 件事以后，保证撞见一次意外，让玩家知道“会有惊喜”
  if (!G.flags.firstRare && G.acts >= 5) { G.flags.firstRare = true; return ok[0]; }
  // 第一次做这件事，先看平常的样子
  if ((G.counts[a.id] || 0) <= 1) return null;
  for (const o of ok) if (chance(o.p)) return o;
  return null;
}
async function tryDanger(a) {
  if (a.makeup || a.who === 'eat') return false;
  const pool = DANGERS.filter(d => d.after.includes(a.id) && !G.daily.events[d.id] && (!d.req || meets(d.req)) && (!d.hours || (today().hour >= d.hours[0] && today().hour < d.hours[1])));
  if (!pool.length) return false;
  // 第一天第 15 件事左右，安排一次危险，让大圣露一手
  const first = !G.flags.firstDanger && G.acts >= 15;
  const d = first ? rand(pool) : pool.find(x => chance(x.p ?? 0.06));
  if (!d) return false;
  G.flags.firstDanger = true;
  G.daily.events[d.id] = true;
  toast('⚡ 危险！', 'down');
  await d.run();
  const c = CGS.find(x => x.id === d.cg);
  if (c && !G.cg[c.id]) await unlockCG(c);
  closeDialog();
  return true;
}

// ================= 星弧 OPC 支线 =================
const OPC_URL = 'https://starc.institute/cn/opc.html';
async function opcProgress() {
  G.opc = (G.opc || 0) + 1;
  const beat = OPC_BEATS.find(b => b.at === G.opc);
  if (!beat) { toast(`星弧 OPC 进度 ${G.opc}/${OPC_BEATS[OPC_BEATS.length - 1].at}`, 'up'); return; }
  bg(beat.bg || 'livingRoom'); couple();
  await beat.run();
  const c = CGS.find(x => x.id === beat.cg);
  if (c && !G.cg[c.id]) await unlockCG(c);
  closeDialog();
}
function aboutHTML() {
  return `<h3>关于这个游戏</h3>
    <p>《圣黛故事》是星弧 STARC 一人公司计划（OPC）的演示作品：一个人，用 AI，几天做出来、上线，然后每周更新。</p>
    <p>星弧 OPC：8 周，用 AI 做一个真实的小产品，上线，找到真实用户，再如实写下过程。不要求会写代码。</p>
    <p><a class="btn" href="${OPC_URL}" target="_blank" rel="noopener">了解星弧 OPC →</a></p>`;
}

// ================= 糖图鉴 =================
function cgMatches(c, a) {
  if (G.cg[c.id] || !c.act) return false;
  const acts = [].concat(c.act);
  const ok = acts.includes(a.id) || (acts.includes('*solo') && (a.who === 'wk' || a.who === 'dy'));
  return ok && meets(c.req);
}
async function tryCG(a) {
  const cands = CGS.filter(c => cgMatches(c, a));
  if (!cands.length) return;
  const newbie = G.acts <= 12; // 第一天前十几次必出糖
  const pool = newbie ? cands : cands.filter(c => chance(c.chance ?? 0.35));
  if (!pool.length) return;
  await unlockCG(rand(pool));
}
async function unlockCG(c) {
  if (G.cg[c.id]) return;
  if (c.lines) await play(c.lines);
  if (c.run) await c.run();
  G.cg[c.id] = today().key;
  eff(c.eff || { sweet: { N: 3, R: 5, SR: 8, SSR: 12 }[c.rarity] });
  closeDialog();
  await showCard(c, true);
  save();
}
function cgArt(c) {
  const ph = `<div class="cg-ph" style="--c:${RARITY_COLOR[c.rarity]}"><span>${c.icon || '✿'}</span></div>`;
  // 没在 assets.js 里登记的，按命名规则找 assets/cg_<id>.jpg，找不到就用占位卡面
  const src = window.ASSETS?.cg?.[c.id];
  if (!src) return ph;
  return `<img src="${src}" alt="${c.title}" onerror="this.outerHTML=this.dataset.ph" data-ph='${ph}'>`;
}
let cardResolve = null;
function showCard(c, isNew) {
  modal(`<div class="card">
    ${isNew ? '<div class="new">✦ 收进图鉴 ✦</div>' : ''}
    <div class="art">${cgArt(c)}</div>
    <span class="rar" style="--c:${RARITY_COLOR[c.rarity]}">${c.rarity}</span>
    <h2>${c.title}</h2>
    <p>${c.caption}</p>
    <small>${G.cg[c.id] ? '收进图鉴：' + G.cg[c.id] : ''}</small>
    <div><button class="btn primary" id="card-ok">${isNew ? '收下' : '关闭'}</button></div>
  </div>`);
  // 点图全屏看
  const art = $('#modal-body .card .art img');
  if (art) $('#modal-body .card .art').onclick = () => openViewer(art.getAttribute('src'), c.title);
  return new Promise(r => {
    cardResolve = r;
    $('#card-ok').onclick = () => { closeModal(); };
  });
}
function openViewer(src, alt) {
  const v = $('#viewer'), img = v.querySelector('img');
  img.src = src; img.alt = alt || '';
  v.hidden = false;
}
$('#viewer').addEventListener('click', () => { $('#viewer').hidden = true; });

// ================= 行动之后：吵架、随机事件、新手福利 =================
async function afterAct(a) {
  if (a.makeup) return;
  // 第一天第 7 件事，安排一场小吵架，让人尝到和好的甜
  if (!G.flags.firstQuarrel && G.acts === 7) { G.flags.firstQuarrel = true; return startQuarrel(QUARRELS.find(q => q.id === 'poem')); }
  const low = Math.min(G.wk_mood, G.dy_mood);
  if (!G.quarrel && G.acts > 8 && G.daily.quarrels < 1 && (low < 25 || (low < 40 && chance(0.15)))) {
    const pool = QUARRELS.filter(q => !q.when || q.when());
    if (pool.length) return startQuarrel(rand(pool));
  }
  if (G.acts > 3 && chance(0.12)) {
    const pool = RANDOM_EVENTS.filter(e => !G.daily.events[e.id] && (!e.when || e.when()));
    if (pool.length) { const e = rand(pool); G.daily.events[e.id] = true; await e.run(); closeDialog(); }
  }
}
async function startQuarrel(q) {
  G.quarrel = q.id;
  G.daily.quarrels += 1;
  bg(q.bg || 'livingRoom'); couple();
  await q.start();
  closeDialog();
  toast('冷战中 · 一起的活动暂停', 'down');
  save();
}
function makeupAct() {
  const q = QUARRELS.find(x => x.id === G.quarrel);
  return {
    id: 'makeup', who: 'both', icon: '🤝', name: '去和好', desc: q.title, hp: 5, makeup: true, bg: q.bg || 'livingRoom', indoor: true,
    async run() {
      const ok = await q.resolve();
      if (ok) {
        G.quarrel = null;
        eff({ sweet: 8, mo: 3, wk_mood: 20, dy_mood: 20 });
        const c = CGS.find(x => x.id === 'make_' + q.id);
        if (c && !G.cg[c.id]) await unlockCG(c);
      } else {
        await narr('还在气头上。过一会儿再试试吧。');
      }
    },
  };
}

// ================= 菜单 =================
let curTab = 'both';
const TABS = [
  { id: 'both', name: '一起' }, { id: 'wk', name: '悟空' }, { id: 'dy', name: '黛玉' },
  { id: 'eat', name: '吃点东西' }, { id: 'home', name: '小家' }, { id: 'diary', name: '日记' },
];
function hintText() {
  const t = today();
  if (G.quarrel) return '😤 两人在冷战。「一起」里先去和好吧。';
  const nx = nextHoliday();
  if (G.wk_hp < 10 && G.dy_hp < 10) return `😴 两人都累了，体力每 5 分钟恢复 1 点。` + (nx ? `${nx.days} 天后是${nx.name}，有限定的图鉴。` : '晚点再来看看。');
  if (t.holiday) { const e = t.holiday.end; return `🎉 ${t.holiday.name}期间（到 ${e.getMonth() + 1}月${e.getDate()}日）！「一起」里有节日限定。`; }
  const left = CGS.filter(c => !G.cg[c.id]).length;
  return nx ? `距离${nx.name}还有 ${nx.days} 天 · 图鉴还差 ${left} 张` : `图鉴还差 ${left} 张`;
}
function nextHoliday() {
  const base = now();
  const active = today().holidays;
  for (let i = 1; i <= 60; i++) {
    const d = new Date(base); d.setDate(d.getDate() + i);
    const h = HOLIDAYS[dayKey(d).slice(5)];
    if (h && !active.includes(h.id)) return { name: h.name, days: Math.max(1, i - HOLIDAY_SPAN) };
  }
  return null;
}
function actButton(a, onClick, lock) {
  const b = document.createElement('button');
  b.className = 'act' + (a.makeup ? ' hot' : '') + (a.holiday ? ' fest' : '') + (lock ? ' locked' : '');
  b.innerHTML = `<div class="ic">${a.icon || '·'}</div><div class="tx"><div class="nm">${a.name}</div><div class="ds">${lock || a.desc || ''}</div></div><div class="cost">${costHTML(a)}</div>`;
  b.setAttribute('aria-disabled', lock ? 'true' : 'false');
  // 正式版不显示小字，所以锁住的卡片点一下，用浮字告诉玩家原因
  b.onclick = lock ? () => toast(lock.replace(/^解锁：/, '需要 '), 'down') : onClick;
  return b;
}
function showMenu() {
  regen();
  closeDialog();
  renderHud();
  const t = today();
  bg('livingRoom');
  weatherFx();
  couple();
  const menu = $('#menu');
  menu.hidden = false;
  $('#menu-hint').textContent = hintText();
  const tbar = $('#menu-tabs');
  tbar.innerHTML = '';
  TABS.forEach(x => {
    const b = document.createElement('button');
    b.className = 'tab' + (x.id === curTab ? ' on' : '');
    const dot = (x.id === 'both' && (G.quarrel || t.holiday)) ? '<span class="dot"></span>' : '';
    b.innerHTML = x.name + dot;
    b.onclick = () => { curTab = x.id; showMenu(); };
    tbar.appendChild(b);
  });
  const list = $('#menu-list');
  list.innerHTML = '';
  const add = (a, fn, lock) => list.appendChild(actButton(a, fn, lock));

  if (['both', 'wk', 'dy'].includes(curTab)) {
    if (curTab === 'both' && G.quarrel) { const m = makeupAct(); add(m, () => doAct(m), lockOf(m)); }
    ACTS.filter(a => a.who === curTab && visible(a))
      .sort((x, y) => (y.holiday ? 1 : 0) - (x.holiday ? 1 : 0))
      .forEach(a => add(a, () => doAct(a), lockOf(a)));
  }
  if (curTab === 'eat') {
    SNACKS.forEach(s => add(s, () => doAct(s), G.daily.snack >= 3 ? '今天吃得够多了' : lockOf(s)));
  }
  if (curTab === 'home') {
    list.insertAdjacentHTML('beforeend', '<p class="sec">添置小家（买一次，永久有效）</p>');
    HOME.forEach(h => {
      const owned = G.home[h.id];
      add({ ...h, desc: owned ? '✓ 已经有了 · ' + h.desc : h.desc }, () => buyHome(h), owned ? '✓ 已经有了' : (G.money < h.cost ? `还差 ¥${h.cost - G.money}` : (h.req && !meets(h.req) ? '解锁：' + reqText(h.req) : '')));
    });
    list.insertAdjacentHTML('beforeend', '<p class="sec">出门旅行</p>');
    TRIPS.filter(visible).forEach(a => add(a, () => doAct(a), lockOf(a)));
  }
  if (curTab === 'diary') renderDiary(list);
}

async function buyHome(h) {
  if (G.home[h.id] || G.money < h.cost || busy) return;
  busy = true;
  G.money -= h.cost;
  G.home[h.id] = today().key;
  $('#menu').hidden = true;
  bg('livingRoom'); couple();
  toast(`添置了 ${h.name}`, 'big');
  const c = CGS.find(x => x.id === 'home_' + h.id);
  if (c) await unlockCG(c);
  busy = false;
  save(); showMenu();
}

// ================= 日记 / 状态 / 备份 =================
function bar(label, v, max, cls = '') {
  return `<div class="stat-row ${cls}"><span>${label}</span><b><em style="width:${clamp(v / max * 100, 0, 100)}%"></em></b><span>${v}</span></div>`;
}
function renderDiary(list) {
  const sl = sweetLevel(G.sweet);
  const box = document.createElement('div');
  box.className = 'diary';
  box.innerHTML = `
    <h3>两个人</h3>
    <p>在一起第 <b>${togetherDays()}</b> 天 · ${sl.title}（甜度 ${G.sweet}）· 默契 ${G.mo} · 图鉴 ${Object.keys(G.cg).length}/${CGS.length}</p>
    <h3>悟空 · ${wkTitle()}</h3>
    ${bar('耐心', G.nai, 100)}${bar('温柔', G.rou, 100)}${bar('烟火气', G.yan, 100)}
    <h3>黛玉 · ${dyTitle()}</h3>
    ${bar('身体', G.health, 100, 'r')}${bar('开朗', G.kai, 100)}${bar('勇气', G.yong, 100)}${bar('诗名', G.shi, 100)}
    <p class="tiny dev">成长没有上限，条满了也会继续涨。</p>
    <h3>日记</h3>
    ${G.diary.length ? G.diary.slice(-12).reverse().map(d => `<p class="entry"><small>${d.d}</small>${d.t}</p>`).join('') : '<p class="tiny">还没有日记。过几天再来看看。</p>'}
    ${aboutHTML()}
    <h3>存档</h3>
    <p class="tiny">存档保存在这个浏览器里。清缓存会丢，换手机前先备份。</p>
    <div class="row"><button class="btn" id="bk-out">复制备份码</button><button class="btn" id="bk-in">导入备份码</button></div>`;
  list.appendChild(box);
  $('#bk-out').onclick = async () => {
    const code = btoa(unescape(encodeURIComponent(JSON.stringify(G))));
    try { await navigator.clipboard.writeText(code); toast('备份码已复制', 'up'); }
    catch (e) { window.prompt('复制这段备份码：', code); }
  };
  $('#bk-in').onclick = () => {
    const code = window.prompt('粘贴备份码：');
    if (!code) return;
    try {
      const s = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
      if (s.v !== 2) throw 0;
      G = Object.assign(newState(), s); save(); toast('导入成功', 'big'); showMenu();
    } catch (e) { toast('备份码不对', 'down'); }
  };
}

// ================= 图鉴 =================
function gallery() {
  if (!G) G = store.get(SAVE_KEY) ? Object.assign(newState(), store.get(SAVE_KEY)) : null;
  const got = G ? G.cg : {};
  const cats = [...new Set(CGS.map(c => c.cat))];
  modal(`<h2>图鉴 ${Object.keys(got).length}/${CGS.length}</h2>
    ${cats.map(cat => `<h3>${cat}</h3><div class="gal">${CGS.filter(c => c.cat === cat).map(c => got[c.id]
      ? `<button class="cell" data-id="${c.id}"><i style="--c:${RARITY_COLOR[c.rarity]}">${c.rarity}</i>${c.icon || '✿'} ${c.title}</button>`
      : `<div class="cell lock"><i>${c.rarity}</i>？？？<small class="dev">${c.hint}</small></div>`).join('')}</div>`).join('')}
    <p class="tiny">图鉴会一直更新。节日限定的图鉴，节日前后一周都能收集；错过了，明年还有。</p>`);
  document.querySelectorAll('.cell[data-id]').forEach(el => el.onclick = () => {
    const c = CGS.find(x => x.id === el.dataset.id);
    showCard(c, false).then(() => gallery());
  });
}

// ================= 弹窗 =================
function modal(html) { $('#modal-body').innerHTML = html; $('#modal').hidden = false; }
function closeModal() {
  $('#modal').hidden = true;
  if (cardResolve) { const r = cardResolve; cardResolve = null; r(); }
}
$('#modal-close').onclick = closeModal;
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });

function help() {
  modal(`<h2>玩法说明</h2>
    <p>五百年后的金陵城，孙悟空和林黛玉已经在一起了。<b>他们的日常，由你来安排。</b></p>
    <p>· <b>一起</b>：瑜伽、看电影、逛湖、做饭……两人都花体力，最甜<br>· <b>悟空 / 黛玉</b>：一个人去打工、看店、写诗，赚钱和成长。分开久了，下次在一起会更甜<br>· <b>吃点东西</b>回一点体力，<b>小家</b>里添置家具、出门旅行</p>
    <p>两人口味不同：悟空好动，黛玉好静。总让一方迁就，会吵架。<b>吵架了就去和好</b>——和好的时候最甜。</p>
    <p>游戏跟着现实日历走：天气每天不同，节日前后一周都有限定剧情和图鉴，错过了明年还有。想要白天或夜晚，点右上角的 ☀️/🌙 随时切换。体力每 5 分钟恢复 1 点，玩累了，过会儿再来。</p>
    <p>没有结局。剧情和图鉴会一直更新。</p>${aboutHTML()}`);
}

// ================= 进入游戏 =================
async function rollover() {
  const t = today();
  if (G.day === t.key) return;
  const gap = Math.max(0, daysBetween(G.day, t.key));
  G.day = t.key;
  G.daily = { counts: {}, snack: 0, quarrels: 0, events: {} };
  if (!gap) return;
  const n = Math.min(gap, 3);
  // 你不在的日子，他俩照样过
  const lines = [];
  const pool = DIARY.filter(x => !x.when || x.when()).sort(() => Math.random() - 0.5);
  for (let i = 0; i < n; i++) {
    const d = new Date(now()); d.setDate(d.getDate() - (n - i));
    const entry = pool[i % pool.length].t;
    G.diary.push({ d: dayKey(d), t: entry });
    lines.push(entry);
  }
  G.diary = G.diary.slice(-60);
  const winter = t.season === '冬' && !G.home.luzi;
  eff({ money: 40 * n, sweet: 2 * n, health: winter ? -2 * n : 0, wk_mood: 10, dy_mood: 10 }, true);
  if (G.home.parrot) eff({ dy_mood: 5 }, true);
  if (G.flags.opcDone) eff({ money: 30 * n }, true); // 结业后，小程序每天有一点收入
  bg('livingRoom'); couple();
  await narr(gap === 1 ? '新的一天。昨天的日记：' : `你有 ${gap} 天没来了。他俩的日记：`);
  for (const l of lines) await narr('📔 ' + l);
  closeDialog();
}

async function storyChecks() {
  const t = today();
  // 节日剧情：每年一次
  for (const h of t.holidayList) {
    if (!h.story) continue;
    const k = h.end.getFullYear() + ':' + h.id;
    if (!G.seen[k]) { G.seen[k] = true; bg(h.bg || 'livingRoom'); couple(); await h.story(); closeDialog(); save(); }
  }
  // 纪念日
  for (const m of MILESTONES) {
    if (togetherDays() >= m.day && !G.seen['ms' + m.day]) {
      G.seen['ms' + m.day] = true;
      bg('livingRoom'); couple();
      await m.run();
      const c = CGS.find(x => x.id === 'ms_' + m.day);
      if (c) await unlockCG(c);
      closeDialog(); save();
    }
  }
  // 星弧 OPC 支线：甜度和烟火气够了，黛玉看到招募
  if (!G.flags.opcInvite && G.sweet >= 100 && G.yan >= 12 && G.acts >= 20) {
    G.flags.opcInvite = true;
    bg('shop'); couple();
    await OPC_INVITE();
    closeDialog(); save();
  }
  // 第一次体力耗尽：如来送桃
  if (!G.refillUsed && G.wk_hp < 10 && G.dy_hp < 10) {
    G.refillUsed = true;
    bg('heaven'); couple();
    await play(REFILL_LINES);
    eff({ wk_hp: 100, dy_hp: 100 });
    closeDialog(); save();
  }
}

async function enter(fresh) {
  const saved = store.get(SAVE_KEY);
  G = (!fresh && saved) ? Object.assign(newState(), saved) : newState();
  $('#title').hidden = true; $('#game').hidden = false; $('#modal').hidden = true;
  regen(); renderHud();
  if (!G.seen.prologue) { G.seen.prologue = true; await PROLOGUE(); closeDialog(); save(); }
  await rollover();
  await storyChecks();
  save();
  showMenu();
}

// 每 30 秒：恢复体力、检查跨天
setInterval(async () => {
  if (!G || busy || $('#game').hidden || !$('#dialog').hidden) return;
  regen();
  if (G.day !== today().key) { busy = true; await rollover(); await storyChecks(); busy = false; save(); showMenu(); return; }
  if (!$('#menu').hidden) { renderHud(); $('#menu-hint').textContent = hintText(); }
  save();
}, 30000);

// 按命名规则找素材：assets/bg_<场景>.jpg、assets/<角色>_<表情>.png、assets/cg_<id>.jpg。
// 只认 assets/manifest.js 里列出的文件（tools/build_manifest.js 生成），图片显示时才下载。
function probeAssets() {
  const A = window.ASSETS || (window.ASSETS = {});
  A.backgrounds ||= {}; A.portraits ||= {}; A.cg ||= {};
  for (const f of window.ASSET_FILES || []) {
    const src = 'assets/' + f, base = f.replace(/\.(png|jpe?g|webp)$/i, '');
    let m;
    if ((m = base.match(/^bg_(.+)$/))) { if (!A.backgrounds[m[1]]) A.backgrounds[m[1]] = src; }
    else if ((m = base.match(/^cg_(.+)$/))) { if (!A.cg[m[1]]) A.cg[m[1]] = src; }
    else if ((m = base.match(/^([a-z]{2})_(default|smile|shy|sad|angry|surprise)$/))) {
      (A.portraits[m[1]] ||= {});
      if (!A.portraits[m[1]][m[2]]) A.portraits[m[1]][m[2]] = src;
    }
  }
}

const Game = {
  boot() {
    probeAssets();
    const has = !!store.get(SAVE_KEY);
    $('#btn-new').textContent = has ? '回到金陵城' : '开始';
    $('#btn-new').onclick = () => enter(false);
    $('#btn-gallery').onclick = gallery;
    $('#btn-help').onclick = help;
    $('#btn-gallery2').onclick = gallery;
    $('#btn-time').onclick = () => {
      if (!G || busy || !$('#dialog').hidden) return;
      const order = ['auto', 'day', 'night'];
      G.timeMode = order[(order.indexOf(G.timeMode || 'auto') + 1) % 3];
      toast(`时间：${TIME_MODES[G.timeMode]}`, 'up');
      save(); showMenu();
    };
    $('#title').hidden = false; $('#game').hidden = true;
  },
  debug: () => G,
  reset() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} location.reload(); },
};
window.Game = Game;
