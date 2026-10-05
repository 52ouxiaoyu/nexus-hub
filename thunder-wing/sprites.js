/* 雷霆之翼 Thunder Wing — 程序化矢量精灵
   所有图形均由代码绘制并预渲染到离屏 canvas，运行时只做 drawImage，保证性能。
   配色约定：我方=冷色（青/蓝/白），敌方=暖色（红/橙/紫/品红），保证弹幕可读性。 */
(function () {
  const TW = window.TW || (window.TW = {});

  function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function sp(w, h, fn) { const c = mk(w, h); const g = c.getContext('2d'); fn(g, w, h); return c; }
  function poly(g, pts, fill, stroke, lw) {
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.closePath();
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 2; g.lineJoin = 'round'; g.stroke(); }
  }
  function glowDot(g, x, y, r, c1, c2) {
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, c1); grd.addColorStop(1, c2);
    g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  TW.poly = poly; TW.sp = sp; TW.glowDot = glowDot;

  /* ---------------- 我方战机 ---------------- */
  TW.SPR = {};

  TW.SPR.player = sp(40, 44, (g, w, h) => {
    g.translate(w / 2, h / 2);
    // 尾焰底座
    poly(g, [[-5, 14], [5, 14], [3, 21], [-3, 21]], '#1a4d63', '#5fe6ff', 1.5);
    // 主机身（机头朝上）
    poly(g, [[0, -20], [4, -8], [8, 0], [17, 12], [15, 18], [7, 11], [4, 17], [0, 19],
    [-4, 17], [-7, 11], [-15, 18], [-17, 12], [-8, 0], [-4, -8]],
      '#0e2a3d', '#8cf0ff', 2);
    // 机翼条纹
    g.strokeStyle = '#39b6e0'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(-11, 6); g.lineTo(-4, 2); g.moveTo(11, 6); g.lineTo(4, 2); g.stroke();
    // 座舱
    poly(g, [[0, -10], [3, -3], [0, 2], [-3, -3]], '#cdf7ff', '#ffffff', 1);
    // 引擎光
    glowDot(g, 0, 15, 5, 'rgba(120,235,255,0.9)', 'rgba(120,235,255,0)');
  });

  TW.SPR.wing = sp(18, 20, (g, w, h) => {
    g.translate(w / 2, h / 2);
    poly(g, [[0, -9], [4, 0], [7, 8], [0, 6], [-7, 8], [-4, 0]], '#123044', '#7fe0ff', 1.6);
    glowDot(g, 0, 4, 3.5, 'rgba(120,235,255,0.85)', 'rgba(120,235,255,0)');
  });

  /* ---------------- 敌方杂兵 ---------------- */
  TW.SPR.drone = sp(30, 30, (g, w, h) => {
    g.translate(w / 2, h / 2); g.scale(1, -1); // 机头朝下
    poly(g, [[0, 13], [5, 3], [13, -6], [11, -12], [4, -5], [0, -9], [-4, -5], [-11, -12], [-13, -6], [-5, 3]],
      '#3a0f16', '#ff6274', 1.8);
    glowDot(g, 0, -2, 4, 'rgba(255,90,110,0.95)', 'rgba(255,90,110,0)');
  });

  TW.SPR.fighter = sp(34, 34, (g, w, h) => {
    g.translate(w / 2, h / 2); g.scale(1, -1);
    poly(g, [[0, 15], [4, 5], [15, -2], [16, -9], [6, -6], [3, -12], [0, -8], [-3, -12], [-6, -6], [-16, -9], [-15, -2], [-4, 5]],
      '#3d2510', '#ffab4a', 1.8);
    glowDot(g, 0, 0, 4.5, 'rgba(255,170,60,0.95)', 'rgba(255,170,60,0)');
  });

  TW.SPR.gunship = sp(48, 44, (g, w, h) => {
    g.translate(w / 2, h / 2); g.scale(1, -1);
    poly(g, [[0, 19], [10, 12], [21, 4], [20, -6], [10, -14], [0, -18], [-10, -14], [-20, -6], [-21, 4], [-10, 12]],
      '#2b1440', '#c987ff', 2);
    poly(g, [[0, 8], [6, 2], [0, -4], [-6, 2]], '#e6ccff', '#ffffff', 1);
    g.strokeStyle = '#a25cf0'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(-14, 6); g.lineTo(-6, 10); g.moveTo(14, 6); g.lineTo(6, 10); g.stroke();
    glowDot(g, 0, 12, 5, 'rgba(190,120,255,0.9)', 'rgba(190,120,255,0)');
  });

  TW.SPR.bomber = sp(60, 50, (g, w, h) => {
    g.translate(w / 2, h / 2); g.scale(1, -1);
    poly(g, [[0, 22], [14, 16], [27, 6], [26, -6], [14, -16], [0, -22], [-14, -16], [-26, -6], [-27, 6], [-14, 16]],
      '#123024', '#54e08a', 2);
    poly(g, [[0, 6], [10, 0], [0, -8], [-10, 0]], '#c9ffe0', '#ffffff', 1);
    g.strokeStyle = '#2f9d63'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(-18, 10); g.lineTo(-7, 14); g.moveTo(18, 10); g.lineTo(7, 14); g.stroke();
    glowDot(g, 0, 14, 6, 'rgba(90,230,140,0.85)', 'rgba(90,230,140,0)');
  });

  TW.SPR.tank = sp(42, 34, (g, w, h) => {
    g.translate(w / 2, h / 2);
    // 履带（左右两侧，纵向条纹）
    [[-17, '#8a7a48'], [17, '#8a7a48']].forEach((t) => {
      poly(g, [[t[0] - 5, -13], [t[0] + 5, -13], [t[0] + 5, 13], [t[0] - 5, 13]], '#241d10', '#a89454', 1.5);
    });
    g.strokeStyle = '#5c5028'; g.lineWidth = 1;
    for (let i = -10; i <= 10; i += 5) {
      g.beginPath(); g.moveTo(-22, i); g.lineTo(-12, i); g.moveTo(12, i); g.lineTo(22, i); g.stroke();
    }
    // 车体
    poly(g, [[-11, -12], [11, -12], [9, 8], [-9, 8]], '#3d3520', '#e8d79a', 1.8);
    // 警示条纹
    poly(g, [[-11, -12], [11, -12], [10, -6], [-10, -6]], '#6b5a20', '#ffd24a', 1);
    // 炮塔 + 炮管（朝下）
    g.fillStyle = '#4a4026'; g.strokeStyle = '#ffe9a8'; g.lineWidth = 1.6;
    g.beginPath(); g.arc(0, -2, 6.5, 0, Math.PI * 2); g.fill(); g.stroke();
    poly(g, [[-3, 2], [3, 2], [3, 15], [-3, 15]], '#4a4026', '#ffe9a8', 1.4);
    glowDot(g, 0, -2, 5, 'rgba(255,220,120,0.75)', 'rgba(255,220,120,0)');
  });

  TW.SPR.turret = sp(36, 32, (g, w, h) => {
    g.translate(w / 2, h / 2);
    poly(g, [[-15, 10], [15, 10], [12, -2], [-12, -2]], '#301a2a', '#ff7ac2', 1.6);
    g.fillStyle = '#4a2a3c'; g.strokeStyle = '#ff9ad6'; g.lineWidth = 1.5;
    g.beginPath(); g.arc(0, -2, 8, 0, Math.PI * 2); g.fill(); g.stroke();
    poly(g, [[-3, 2], [3, 2], [3, 14], [-3, 14]], '#5a3348', '#ffc2e6', 1.2);
    glowDot(g, 0, -2, 5, 'rgba(255,120,190,0.9)', 'rgba(255,120,190,0)');
  });

  /* ---------------- Boss（5 关各异） ---------------- */
  function bossBase(g, hull, edge, accent, variant) {
    g.translate(90, 65);
    if (variant === 0) {          // 重型战舰
      poly(g, [[0, 52], [26, 40], [62, 18], [70, -14], [40, -34], [0, -44], [-40, -34], [-70, -14], [-62, 18], [-26, 40]], hull, edge, 3);
      poly(g, [[-52, 10], [-34, 16], [-34, 30], [-52, 24]], accent, edge, 2);
      poly(g, [[52, 10], [34, 16], [34, 30], [52, 24]], accent, edge, 2);
    } else if (variant === 1) {   // 母舰
      poly(g, [[0, 50], [18, 44], [74, 20], [74, -20], [30, -38], [0, -46], [-30, -38], [-74, -20], [-74, 20], [-18, 44]], hull, edge, 3);
      poly(g, [[-60, 6], [-20, 14], [-20, 34], [-60, 26]], accent, edge, 2);
      poly(g, [[60, 6], [20, 14], [20, 34], [60, 26]], accent, edge, 2);
    } else if (variant === 2) {   // 空中要塞
      poly(g, [[-72, 12], [-46, -22], [0, -40], [46, -22], [72, 12], [50, 44], [0, 54], [-50, 44]], hull, edge, 3);
      poly(g, [[-30, 22], [-8, 30], [-8, 48], [-30, 40]], accent, edge, 2);
      poly(g, [[30, 22], [8, 30], [8, 48], [30, 40]], accent, edge, 2);
    } else if (variant === 3) {   // 机械蠕虫
      poly(g, [[0, 54], [22, 40], [34, 8], [30, -30], [12, -46], [0, -50], [-12, -46], [-30, -30], [-34, 8], [-22, 40]], hull, edge, 3);
      poly(g, [[-26, -8], [-8, -2], [-8, 16], [-26, 10]], accent, edge, 2);
      poly(g, [[26, -8], [8, -2], [8, 16], [26, 10]], accent, edge, 2);
    } else {                      // 最终旗舰
      poly(g, [[0, 56], [20, 42], [80, 22], [82, -18], [36, -40], [0, -50], [-36, -40], [-82, -18], [-80, 22], [-20, 42]], hull, edge, 3);
      poly(g, [[-64, 8], [-24, 18], [-24, 38], [-64, 28]], accent, edge, 2);
      poly(g, [[64, 8], [24, 18], [24, 38], [64, 28]], accent, edge, 2);
    }
    // 核心
    poly(g, [[0, -14], [14, -4], [10, 14], [-10, 14], [-14, -4]], '#fff8e6', edge, 2);
    glowDot(g, 0, 0, 16, 'rgba(255,220,140,0.55)', 'rgba(255,220,140,0)');
    // 装甲纹路
    g.strokeStyle = edge; g.globalAlpha = 0.5; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(-40, -20); g.lineTo(40, -20); g.moveTo(-30, 26); g.lineTo(30, 26); g.stroke();
    g.globalAlpha = 1;
  }

  const BOSS_SKIN = [
    ['#2a1016', '#ff6b7d', '#5c1b26'],
    ['#101c33', '#5fb0ff', '#1b3560'],
    ['#241038', '#c07bff', '#3d1c5c'],
    ['#12301f', '#54e08a', '#1c4a30'],
    ['#331f08', '#ffc44d', '#5c3a0d'],
  ];
  TW.SPR.boss = BOSS_SKIN.map((s, i) => sp(180, 130, (g) => bossBase(g, s[0], s[1], s[2], i)));

  // Boss 可拆解部件（侧炮塔）
  TW.SPR.part = sp(30, 30, (g, w, h) => {
    g.translate(w / 2, h / 2);
    poly(g, [[-11, -8], [11, -8], [13, 8], [-13, 8]], '#3a1620', '#ff8a5c', 2);
    poly(g, [[-3, 4], [3, 4], [3, 15], [-3, 15]], '#4d2430', '#ffc9a0', 1.4);
    glowDot(g, 0, 0, 6, 'rgba(255,140,80,0.9)', 'rgba(255,140,80,0)');
  });

  /* ---------------- 弹丸 ---------------- */
  /* 弹丸：细长光矢，核心色占主体，白色只做针尖，避免满屏白球 */
  function bullet(w, h, core, ring) {
    return sp(w, h, (g) => {
      const cx = w / 2, cy = h / 2;
      glowDot(g, cx, cy, Math.max(w, h) * 0.46, ring, 'rgba(0,0,0,0)');
      g.fillStyle = core;
      g.beginPath(); g.ellipse(cx, cy, w * 0.27, h * 0.34, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.92)';
      g.beginPath(); g.ellipse(cx, cy, w * 0.13, h * 0.19, 0, 0, Math.PI * 2); g.fill();
    });
  }
  TW.BULLET = {
    vulcan: bullet(8, 16, '#63dcff', 'rgba(70,200,255,0.42)'),
    laser: bullet(10, 30, '#5fb0ff', 'rgba(80,170,255,0.45)'),
    missile: bullet(10, 16, '#b98cff', 'rgba(150,110,255,0.42)'),
    wing: bullet(7, 13, '#8ceaff', 'rgba(110,220,255,0.38)'),
    charge: bullet(16, 28, '#bff6ff', 'rgba(140,235,255,0.6)'),
    // 敌方：暖色系
    red: bullet(12, 12, '#ff5a6e', 'rgba(255,90,110,0.42)'),
    amber: bullet(12, 12, '#ffb03a', 'rgba(255,176,58,0.42)'),
    magenta: bullet(12, 12, '#ff5ec8', 'rgba(255,94,200,0.42)'),
    purple: bullet(14, 14, '#c07bff', 'rgba(192,123,255,0.42)'),
    green: bullet(12, 12, '#7cf07c', 'rgba(124,240,124,0.42)'),
    big: bullet(18, 18, '#ff7a3a', 'rgba(255,122,58,0.5)'),
  };

  /* ---------------- 受击白闪剪影 ---------------- */
  function whiten(src) {
    const c = mk(src.width, src.height), g = c.getContext('2d');
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, c.width, c.height);
    return c;
  }
  TW.SPRW = {};
  Object.keys(TW.SPR).forEach((k) => {
    TW.SPRW[k] = Array.isArray(TW.SPR[k]) ? TW.SPR[k].map(whiten) : whiten(TW.SPR[k]);
  });

  /* ---------------- 背景星云层（滚动的两倍高度贴图） ---------------- */
  TW.SPR.nebula = sp(480, 1200, (g, w, h) => {
    const blobs = [[80, 120, 190, 'rgba(70,140,255,0.30)'], [360, 320, 230, 'rgba(140,90,255,0.22)'],
    [200, 560, 210, 'rgba(60,190,220,0.20)'], [420, 740, 170, 'rgba(120,80,200,0.18)'],
    [150, 900, 240, 'rgba(70,150,255,0.20)'], [330, 1100, 200, 'rgba(160,90,220,0.16)']];
    g.globalCompositeOperation = 'lighter';
    blobs.forEach((b) => {
      const grd = g.createRadialGradient(b[0], b[1], 0, b[0], b[1], b[2]);
      grd.addColorStop(0, b[3]);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd;
      g.beginPath(); g.arc(b[0], b[1], b[2], 0, Math.PI * 2); g.fill();
    });
    g.globalCompositeOperation = 'source-over';
  });
})();
