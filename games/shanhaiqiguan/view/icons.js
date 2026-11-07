// 手绘 SVG 图标，24 格。所有图标用 currentColor，可以随处换色。
(function () {
  const P = {
    gold: '<circle cx="12" cy="12" r="9"/><rect x="9.5" y="9.5" width="5" height="5"/>',
    leech: '<circle cx="12" cy="12" r="9"/><path d="M8 8l8 8M16 8l-8 8"/>',
    heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10C19.5 15.4 12 20 12 20z"/>',
    sword: '<path d="M19 3l-9.5 9.5M19 3h-3.5M19 3v3.5M6 12l6 6M8 16l-4 4"/>',
    shield: '<path d="M12 3l7 3v6c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6z"/>',
    garrison: '<path d="M12 3l7 3v6c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6z"/><path d="M12 7v10M8 11h8"/>',
    archer: '<path d="M6 3c8 2 13 7 15 15"/><path d="M6 3L21 18"/><path d="M3 21l9-9M3 21v-4M3 21h4"/>',
    magic: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 1-3-1-5 1-9z"/><path d="M12 21v-3"/>',
    city: '<path d="M3 20h18M5 20V9l7-5 7 5v11"/><path d="M10 20v-6h4v6"/>',
    academy: '<path d="M4 5h11a3 3 0 0 1 3 3v12H7a3 3 0 0 1-3-3z"/><path d="M8 9h6M8 13h6"/>',
    poison: '<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/><path d="M9.5 14a2.5 2.5 0 0 0 2.5 2.5"/>',
    burn: '<path d="M12 3c1 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-4 3-6 0 2 1 3 2 3 1-3 0-5 1-8z"/>',
    weak: '<path d="M19 3l-6 6M9 13l-3 3M4 20l2-4 2 2z"/><path d="M6 6l12 12"/>',
    blind: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><path d="M4 4l16 16"/>',
    slow: '<path d="M12 4v14M6 12l6 6 6-6"/>',
    seal: '<rect x="5" y="11" width="14" height="9" rx="1"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    noheal: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10C19.5 15.4 12 20 12 20z"/><path d="M4 4l16 16"/>',
    confuse: '<path d="M12 12a2 2 0 1 1 2 2 4 4 0 1 1 4-4 6 6 0 1 1-6-6"/>',
    dream: '<path d="M19 14A8 8 0 1 1 10 5a6.5 6.5 0 0 0 9 9z"/>',
    curse: '<path d="M12 3a8 8 0 0 0-5 14v3h10v-3a8 8 0 0 0-5-14z"/><circle cx="9" cy="11" r="1.4"/><circle cx="15" cy="11" r="1.4"/>',
    skip: '<path d="M8 5v14M16 5v14"/>',
    immune: '<path d="M12 3l2.7 5.8 6.3.8-4.6 4.3 1.2 6.2L12 17l-5.6 3.1 1.2-6.2L3 9.6l6.3-.8z"/>',
    sound: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6"/>',
    mute: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9l5 6M21 9l-5 6"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.8.4-1.1 1-1.1 1.8M12 17h.01"/>',
    fast: '<path d="M4 5l8 7-8 7zM12 5l8 7-8 7z"/>',
    star: '<path d="M12 3l2.7 5.8 6.3.8-4.6 4.3 1.2 6.2L12 17l-5.6 3.1 1.2-6.2L3 9.6l6.3-.8z"/>',
  };
  window.SJ.icon = (name, size) => `<svg class="ic" viewBox="0 0 24 24" width="${size || 18}" height="${size || 18}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;
  window.SJ.dieFace = (n) => {
    const pos = { 1: [[12, 12]], 2: [[7, 7], [17, 17]], 3: [[7, 7], [12, 12], [17, 17]], 4: [[7, 7], [17, 7], [7, 17], [17, 17]], 5: [[7, 7], [17, 7], [12, 12], [7, 17], [17, 17]], 6: [[7, 6], [17, 6], [7, 12], [17, 12], [7, 18], [17, 18]] }[n];
    const col = n === 1 || n === 4 ? '#b33a2b' : '#2a2620';
    return `<svg viewBox="0 0 24 24" width="100%" height="100%"><rect x="1" y="1" width="22" height="22" rx="4.5" fill="#f6efdf" stroke="#2a2620" stroke-width="1.4"/>${pos.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${n === 1 ? 3.4 : 2.1}" fill="${col}"/>`).join('')}</svg>`;
  };
  window.SJ.STATUS = {
    leech: ['被吸财', '收入归相柳'], poison: ['中毒', '每回合掉血'], burn: ['灼烧', '每回合掉血'], curse: ['诅咒', '每回合掉血'], weak: ['虚弱', '攻击下降'], blind: ['致盲', '攻击可能落空'],
    slow: ['减速', '步数 -2'], seal: ['封印', '技能不触发'], noheal: ['枯竭', '无法回血'], confuse: ['混乱', '可能倒着走'], dream: ['入梦', '骰子取低'], skip: ['停留', '下回合不能动'], immune: ['青耕', '免疫负面'],
  };
})();
