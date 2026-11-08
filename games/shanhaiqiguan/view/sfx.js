// 全部音效都用 WebAudio 现场合成，不需要音频文件。
// 所有声音都走 out()：主音量 -> 压缩器；一部分送进混响。
(function () {
  const S = window.SJ.sfx = { muted: false, volume: 0.9 };
  try { S.muted = localStorage.getItem('sijing.mute') === '1'; } catch (e) { /* 无痕模式 */ }
  let offline = false, ctx = null, bus = null, wet = null, master = null, noiseBuf = null, amb = null, ambWant = null;

  function wire(c) { // 给一个 AudioContext 搭好总线。离线检查也走这里
    const m = c.createGain(), comp = c.createDynamicsCompressor(), b = c.createGain(), w = c.createGain(), rev = c.createConvolver();
    comp.threshold.value = -6; comp.knee.value = 4; comp.ratio.value = 6; comp.attack.value = 0.002; comp.release.value = 0.15;
    b.gain.value = 2; // 总增益，单个声音的 vol 按小值写
    const len = Math.floor(c.sampleRate * 1.3), ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    rev.buffer = ir; w.gain.value = 0.16;
    b.connect(comp); w.connect(rev); rev.connect(comp); comp.connect(m); m.connect(c.destination);
    const n = Math.floor(c.sampleRate * 2), nb = c.createBuffer(1, n, c.sampleRate), a = nb.getChannelData(0);
    for (let i = 0; i < n; i++) a[i] = Math.random() * 2 - 1;
    return { m, b, w, nb };
  }
  function use(c) { const x = wire(c); ctx = c; master = x.m; bus = x.b; wet = x.w; noiseBuf = x.nb; master.gain.value = S.muted ? 0 : S.volume; }
  function ac() {
    if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; use(new C()); }
    if (ctx.state === 'suspended' && !offline) ctx.resume();
    return ctx;
  }
  const out = (node, send) => { node.connect(bus); if (send) node.connect(wet); };

  let boost = 1;
  // 音量包络：快起，指数衰减到 -40dB，再收干净
  function env(g, t, d, v, a) {
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + Math.min(a, d * 0.4));
    g.gain.exponentialRampToValueAtTime(v * 0.01, t + d); g.gain.linearRampToValueAtTime(0, t + d + 0.02);
  }
  // 一个音：f 起始频率，d 时长，to 滑到的频率，at 延迟，send 是否带混响
  function tone(f, d, o) {
    o = o || {};
    if (!ac()) return;
    const t = ctx.currentTime + (o.at || 0), os = ctx.createOscillator(), g = ctx.createGain();
    os.type = o.type || 'sine'; os.frequency.setValueAtTime(f, t);
    if (o.to) os.frequency.exponentialRampToValueAtTime(o.to, t + d);
    if (o.detune) os.detune.value = o.detune;
    env(g, t, d, (o.vol || 0.12) * boost, o.attack || 0.004);
    os.connect(g); out(g, o.wet); os.start(t); os.stop(t + d + 0.03);
  }
  // 一段滤过的噪声
  function hiss(d, o) {
    o = o || {};
    if (!ac()) return;
    const t = ctx.currentTime + (o.at || 0), s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true; f.type = o.filter || 'bandpass'; f.Q.value = o.q || 1;
    f.frequency.setValueAtTime(o.f || 1200, t);
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + d);
    env(g, t, d, (o.vol || 0.15) * boost * 1.8, o.attack || 0.003); // 噪声滤过后能量小，补一点
    s.connect(f); f.connect(g); out(g, o.wet); s.start(t, Math.random()); s.stop(t + d + 0.03);
  }
  // 金属敲击：几个不成倍数的泛音
  function metal(f, d, o) { o = o || {}; [1, 2.76, 5.4, 8.9].forEach((k, i) => tone(f * k, d / (1 + i * 0.7), { type: 'sine', vol: (o.vol || 0.07) / (1 + i), at: o.at, wet: true })); }
  // 钟鼓乐器的音阶：宫商角徵羽
  const PENTA = [262, 294, 330, 392, 440, 523, 587, 659, 784, 880];
  const pluck = (i, at, vol) => { tone(PENTA[i], 0.55, { type: 'triangle', vol: vol || 0.09, at, wet: true }); tone(PENTA[i] * 2, 0.22, { type: 'sine', vol: (vol || 0.09) * 0.35, at }); };

  const STEP = {
    grass: () => hiss(0.07, { f: 2400, q: 0.8, vol: 0.05 }), forest: () => { hiss(0.08, { f: 1700, q: 1, vol: 0.06 }); hiss(0.03, { f: 3800, q: 4, vol: 0.03, at: 0.02 }); }, petal: () => hiss(0.09, { f: 3000, q: 0.7, vol: 0.035 }),
    sand: () => hiss(0.11, { f: 4200, q: 0.6, vol: 0.04, to: 2400 }), snow: () => { hiss(0.1, { f: 900, q: 2, vol: 0.07 }); hiss(0.05, { f: 5000, q: 1, vol: 0.02 }); },
    rock: () => { tone(190, 0.05, { type: 'triangle', vol: 0.08, to: 110 }); hiss(0.03, { f: 2600, q: 2, vol: 0.04 }); }, jade: () => tone(1500, 0.08, { vol: 0.035, wet: true }), ash: () => hiss(0.08, { f: 600, q: 0.8, vol: 0.05 }),
    bone: () => { tone(900, 0.03, { type: 'square', vol: 0.02 }); tone(620, 0.03, { type: 'square', vol: 0.02, at: 0.03 }); },
    water: () => { tone(420, 0.09, { to: 820, vol: 0.05 }); hiss(0.08, { f: 1700, q: 1, vol: 0.03 }); }, reef: () => tone(520, 0.08, { to: 900, vol: 0.04 }), sea: () => { hiss(0.16, { f: 700, q: 0.7, vol: 0.05, attack: 0.04, to: 1400 }); }, ink: () => tone(150, 0.13, { to: 260, vol: 0.06 }),
    swamp: () => { tone(120, 0.11, { to: 300, vol: 0.08 }); tone(240, 0.06, { to: 460, vol: 0.03, at: 0.07 }); }, lava: () => { hiss(0.06, { f: 3200, q: 3, vol: 0.05 }); tone(80, 0.07, { vol: 0.06 }); }, cloud: () => hiss(0.13, { f: 900, q: 0.5, vol: 0.03, attack: 0.04 }),
  };

  const CAST = {
    buff() { [2, 4, 5, 7].forEach((n, i) => pluck(n, i * 0.07)); hiss(0.45, { f: 900, to: 4000, q: 1.5, vol: 0.05, attack: 0.1, wet: true }); },
    move() { hiss(0.42, { f: 500, to: 3600, q: 1.2, vol: 0.16, attack: 0.08, wet: true }); tone(200, 0.32, { to: 700, type: 'triangle', vol: 0.06 }); },
    econ() { [0, 0.07, 0.14, 0.21].forEach((at, i) => { tone(1500 + i * 180, 0.1, { type: 'square', vol: 0.05, at }); tone(2300 + i * 180, 0.18, { vol: 0.07, at: at + 0.03, wet: true }); }); },
    summon() { tone(70, 0.5, { to: 42, vol: 0.2 }); hiss(0.34, { f: 260, q: 0.7, vol: 0.18 }); metal(320, 0.8, { at: 0.12, vol: 0.06 }); },
    heal() { [5, 7, 8].forEach((n, i) => pluck(n, i * 0.1, 0.07)); tone(1320, 0.75, { vol: 0.03, at: 0.08, wet: true, attack: 0.2 }); },
  };

  Object.assign(S, {
    click() { tone(880, 0.06, { type: 'triangle', vol: 0.09 }); tone(1320, 0.04, { vol: 0.05, at: 0.015 }); },
    turn() { pluck(3, 0, 0.08); pluck(5, 0.1, 0.08); },
    dice() { for (let i = 0; i < 7; i++) { const at = i * 0.055 + i * i * 0.004; tone(700 + Math.random() * 900, 0.03, { type: 'square', vol: 0.03, at }); hiss(0.02, { f: 3000, q: 3, vol: 0.05, at }); } tone(240, 0.07, { type: 'triangle', vol: 0.09, at: 0.52 }); },
    step(terrain) { boost = 1.5; (STEP[terrain] || STEP.grass)(); boost = 1; },
    coin() { tone(1760, 0.08, { type: 'square', vol: 0.03 }); tone(2640, 0.2, { vol: 0.05, at: 0.06, wet: true }); },
    pay() { [0, 0.05, 0.1].forEach((at, i) => tone(1500 - i * 240, 0.06, { type: 'square', vol: 0.025, at })); tone(180, 0.1, { type: 'triangle', vol: 0.05, at: 0.12 }); },
    hit() { hiss(0.1, { f: 1400, q: 0.8, vol: 0.32 }); tone(170, 0.13, { type: 'triangle', to: 70, vol: 0.3 }); },
    slash() { hiss(0.11, { f: 2600, to: 900, q: 1.5, vol: 0.26 }); metal(1400, 0.2, { at: 0.03, vol: 0.1 }); },
    crit() { hiss(0.16, { f: 800, q: 0.6, vol: 0.32 }); tone(110, 0.24, { type: 'sawtooth', to: 40, vol: 0.16 }); metal(900, 0.3, { vol: 0.08 }); },
    miss() { hiss(0.17, { f: 1600, to: 500, q: 2, vol: 0.17 }); },
    stun() { [0, 0.09, 0.18].forEach((at) => tone(1800, 0.07, { vol: 0.04, at, to: 1200 })); },
    skill() { tone(392, 0.16, { type: 'sawtooth', vol: 0.05 }); tone(587, 0.2, { type: 'triangle', vol: 0.09, at: 0.07, wet: true }); tone(880, 0.34, { type: 'triangle', vol: 0.09, at: 0.15, wet: true }); hiss(0.3, { f: 2200, q: 1, vol: 0.06, at: 0.05 }); },
    cast(kind) { (CAST[kind] || CAST.buff)(); },
    build() { [0, 0.11, 0.22].forEach((at, i) => { tone(150 + i * 20, 0.07, { type: 'triangle', vol: 0.14, at }); hiss(0.04, { f: 1800, q: 1, vol: 0.09, at }); }); pluck(4, 0.3, 0.07); },
    fire() { hiss(0.6, { f: 500, to: 2200, q: 0.6, vol: 0.18, attack: 0.05 }); for (let i = 0; i < 6; i++) tone(2000 + Math.random() * 2000, 0.02, { vol: 0.025, at: 0.05 + Math.random() * 0.45 }); },
    block() { tone(95, 0.2, { type: 'triangle', to: 55, vol: 0.2 }); metal(420, 0.26, { vol: 0.06 }); },
    portal() { tone(180, 0.55, { to: 1400, vol: 0.07, wet: true }); tone(270, 0.55, { to: 2100, vol: 0.05, at: 0.05, wet: true }); hiss(0.5, { f: 800, to: 3000, q: 4, vol: 0.05, wet: true, attack: 0.1 }); },
    heal() { pluck(7, 0, 0.05); pluck(9, 0.07, 0.04); },
    hurt() { tone(240, 0.16, { type: 'sawtooth', to: 120, vol: 0.11 }); hiss(0.09, { f: 800, q: 1, vol: 0.16 }); },
    good() { [0, 2, 4, 7].forEach((n, i) => pluck(n, i * 0.08)); },
    bad() { tone(196, 0.4, { type: 'sawtooth', vol: 0.05, to: 150 }); tone(207, 0.4, { type: 'sawtooth', vol: 0.05, to: 155, at: 0.02 }); metal(180, 0.55, { vol: 0.06, at: 0.05 }); },
    card() { hiss(0.16, { f: 2800, to: 1300, q: 1.2, vol: 0.16 }); },
    level() { [0, 2, 4, 5, 7].forEach((n, i) => pluck(n, i * 0.075, 0.1)); metal(1040, 0.9, { at: 0.38, vol: 0.05 }); },
    treasure() { metal(1320, 0.8, { vol: 0.06 }); [4, 5, 7, 9].forEach((n, i) => pluck(n, 0.06 + i * 0.07, 0.07)); },
    win() { [0, 2, 4, 7, 9].forEach((n, i) => pluck(n, i * 0.1, 0.11)); tone(131, 0.7, { type: 'triangle', vol: 0.12, at: 0.42 }); },
    lose() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, { type: 'triangle', vol: 0.09, at: i * 0.15, wet: true })); },
    // 位移技能：一阵风、拍翅、残影
    whoosh() { hiss(0.32, { f: 600, to: 3400, q: 1.4, vol: 0.12, attack: 0.06, wet: true }); },
    flap() { hiss(0.12, { f: 900, to: 380, q: 0.9, vol: 0.09, attack: 0.02 }); tone(150, 0.1, { to: 90, type: 'triangle', vol: 0.05 }); },
    blink() { tone(1200, 0.25, { to: 300, vol: 0.05, wet: true }); hiss(0.25, { f: 4000, to: 900, q: 3, vol: 0.05, wet: true }); },
    land() { tone(90, 0.3, { to: 45, type: 'triangle', vol: 0.18 }); hiss(0.25, { f: 500, q: 0.7, vol: 0.12 }); },
    ping(kind) { if (kind === 'bad') { tone(300, 0.3, { to: 180, type: 'triangle', vol: 0.08 }); } else { pluck(5, 0, 0.07); pluck(8, 0.08, 0.06); } },
    // 大招全屏动画的配乐
    ult(fx) {
      tone(55, 1.6, { to: 40, type: 'triangle', vol: 0.22, attack: 0.02 }); hiss(1.2, { f: 300, to: 2400, q: 0.8, vol: 0.08, attack: 0.3, wet: true });
      if (fx === 'drum') [0.25, 0.75, 1.25].forEach((at) => { tone(70, 0.45, { to: 38, type: 'sine', vol: 0.32, at }); hiss(0.18, { f: 200, q: 0.6, vol: 0.2, at }); metal(240, 0.6, { vol: 0.05, at }); });
      else if (fx === 'sun') { hiss(1.6, { f: 400, to: 1800, q: 0.5, vol: 0.14, attack: 0.4 }); tone(98, 1.4, { type: 'sawtooth', vol: 0.04, attack: 0.3 }); }
      else if (fx === 'wings') [0.15, 0.55, 0.95, 1.35].forEach((at) => hiss(0.3, { f: 1000, to: 300, q: 0.8, vol: 0.14, at, attack: 0.05 }));
      else if (fx === 'lids') { tone(220, 1.2, { to: 110, vol: 0.06, wet: true, attack: 0.3 }); metal(330, 1.5, { vol: 0.05, at: 0.6 }); }
      else if (fx === 'blades') [0.2, 0.45, 0.7].forEach((at) => { hiss(0.14, { f: 3000, to: 800, q: 1.5, vol: 0.2, at }); metal(1200, 0.4, { vol: 0.06, at }); });
      else if (fx === 'ghost') { tone(110, 1.5, { to: 82, vol: 0.08, wet: true, attack: 0.4 }); tone(117, 1.5, { to: 87, vol: 0.06, wet: true, attack: 0.4 }); metal(150, 0.9, { vol: 0.1, at: 0.9 }); }
      else if (fx === 'tails') [0, 2, 4, 7, 9, 7, 4, 2, 0].forEach((n, i) => pluck(n, 0.1 + i * 0.09, 0.06));
      else [4, 5, 7, 9].forEach((n, i) => pluck(n, 0.2 + i * 0.12, 0.08));
    },
    death() { tone(82, 1.1, { to: 40, type: 'triangle', vol: 0.2 }); metal(160, 1.3, { vol: 0.08, at: 0.05 }); hiss(0.8, { f: 400, to: 120, q: 0.7, vol: 0.1 }); },
    toggle() { S.muted = !S.muted; try { localStorage.setItem('sijing.mute', S.muted ? '1' : '0'); } catch (e) { /* 忽略 */ } if (master) master.gain.value = S.muted ? 0 : S.volume; return S.muted; },
  });

  // ---------- 地图环境音 ----------
  function loopNoise(filter, f, q, vol) {
    const s = ctx.createBufferSource(), b = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true; b.type = filter; b.frequency.value = f; b.Q.value = q; g.gain.value = vol;
    s.connect(b); b.connect(g); g.connect(amb.gain); s.start(); amb.nodes.push(s);
    return { b, g };
  }
  function lfo(param, rate, depth) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = rate; g.gain.value = depth; o.connect(g); g.connect(param); o.start(); amb.nodes.push(o); }
  function drone(f, vol) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f; g.gain.value = vol; o.connect(g); g.connect(amb.gain); o.start(); amb.nodes.push(o); return g; }
  const EXTRA = {
    kunlun() { const r = Math.random(); if (r < 0.6) { const f = 2600 + Math.random() * 1200; [0, 0.13, 0.24].forEach((at) => tone(f, 0.09, { to: f * 1.25, vol: 0.012, at, wet: true })); } else metal(520, 1.8, { vol: 0.012 }); },
    penglai() { const f = 1500 + Math.random() * 500; tone(f, 0.28, { to: f * 0.72, vol: 0.012, wet: true }); tone(f, 0.22, { to: f * 0.75, vol: 0.01, at: 0.34, wet: true }); },
    youdu() { if (Math.random() < 0.5) metal(210, 2.4, { vol: 0.016 }); else tone(330, 1.5, { to: 240, vol: 0.008, wet: true, attack: 0.5 }); },
    starc() { const f = [1568, 1760, 2093, 2349, 2637][Math.floor(Math.random() * 5)]; tone(f, 0.6, { vol: 0.01, wet: true }); tone(f * 1.5, 0.5, { vol: 0.006, at: 0.18, wet: true }); },
  };
  const MAKE = {
    kunlun() { const w = loopNoise('bandpass', 520, 0.7, 0.05); lfo(w.b.frequency, 0.11, 220); lfo(w.g.gain, 0.07, 0.02); },
    penglai() { const w = loopNoise('lowpass', 620, 0.4, 0.06); lfo(w.g.gain, 0.13, 0.04); const h = loopNoise('highpass', 3000, 0.5, 0.008); lfo(h.g.gain, 0.13, 0.006); },
    starc() { drone(110, 0.006); drone(164.8, 0.004); drone(220.6, 0.003); const w = loopNoise('highpass', 4200, 0.5, 0.006); lfo(w.g.gain, 0.09, 0.004); },
    youdu() { drone(55, 0.011); drone(55.7, 0.009); drone(82.4, 0.004); const w = loopNoise('bandpass', 340, 2.2, 0.02); lfo(w.b.frequency, 0.05, 130); },
  };
  S.ambient = function (id) {
    ambWant = id;
    if (!ac()) return;
    S.stopAmbient(true); ambWant = id;
    if (!MAKE[id]) return;
    amb = { gain: ctx.createGain(), nodes: [], timer: 0 };
    amb.gain.gain.value = 0.0001; amb.gain.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 1.6);
    amb.gain.connect(bus);
    MAKE[id]();
    const me = amb, again = () => { if (amb !== me) return; EXTRA[id](); me.timer = setTimeout(again, 5000 + Math.random() * 9000); };
    me.timer = setTimeout(again, 3000);
  };
  S.stopAmbient = function (keep) {
    if (!keep) ambWant = null;
    if (!amb) return;
    const a = amb; amb = null; clearTimeout(a.timer);
    const t = ctx.currentTime; a.gain.gain.cancelScheduledValues(t); a.gain.gain.setValueAtTime(Math.max(a.gain.gain.value, 0.0001), t); a.gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    setTimeout(() => { a.nodes.forEach((n) => { try { n.stop(); } catch (e) { /* 已停 */ } }); a.gain.disconnect(); }, 650);
  };

  // 离线渲染一个声音，返回峰值和响度，用来查削波和没声音
  S.check = async function (fn, seconds) {
    const save = [ctx, master, bus, wet, noiseBuf], C = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const c = new C(1, Math.floor(44100 * (seconds || 2)), 44100);
    offline = true; use(c); master.gain.value = S.volume;
    fn();
    if (amb) { clearTimeout(amb.timer); amb = null; }
    [ctx, master, bus, wet, noiseBuf] = save; offline = false;
    const d = (await c.startRendering()).getChannelData(0);
    let peak = 0, sum = 0, last = 0;
    for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (v > peak) peak = v; sum += v * v; if (v > 0.003) last = i; }
    return { peak: +peak.toFixed(3), rms: +Math.sqrt(sum / d.length).toFixed(4), tail: +(last / 44100).toFixed(2) };
  };
  S.names = () => ({ step: Object.keys(STEP), cast: Object.keys(CAST), maps: Object.keys(MAKE) });
})();
