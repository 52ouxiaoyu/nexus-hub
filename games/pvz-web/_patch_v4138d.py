# -*- coding: utf-8 -*-
"""v4.0.138-d：玉米方块可读性 / 泡泡龙版面 / 2048 合成路线换行"""
import io

P = 'js/MiniGames.js'
s = io.open(P, encoding='utf-8').read()
reps = []

# ---------- 1. 新增「宽优先」等比绘制 ----------
reps.append((
"""    function sprH(k, x, y, h, alpha) {           // 按高度等比""",
"""    // v4.0.138：宽优先等比——玉米棒 161x76 是横条，塞进方框会小得看不见，改成撑满可用宽度
    function sprFitW(k, cx, cy, w, alpha) {
        const im = _im[k];
        if (!im || !im.complete || !im.naturalWidth) return false;
        const h = w * im.naturalHeight / im.naturalWidth;
        return spr(k, cx - w / 2, cy - h / 2, w, h, alpha);
    }
    function sprH(k, x, y, h, alpha) {           // 按高度等比"""))

# ---------- 2. 方块格：玉米棒横铺、其它植物居中 ----------
reps.append((
"""                ctx.globalAlpha = 1;
                sprFit(s.p, x + CELL / 2, y + CELL / 2 + 1, CELL - 9, a == null ? 1 : a);
            };""",
"""                ctx.globalAlpha = 1;
                const ca = a == null ? 1 : a;
                if (s.p === 'cob') sprFitW(s.p, x + CELL / 2, y + CELL / 2 + 1, CELL - 6, ca);
                else spr(s.p, x + 5, y + 5, CELL - 10, CELL - 10, ca);
            };"""))

# ---------- 3. 幽灵落点更淡，别和实体混淆 ----------
reps.append((
"""                    if (gy !== this.cur.y) cell(this.cur.k, bx + (this.cur.x + c) * CELL, by + (gy + r) * CELL, 0.22);""",
"""                    if (gy !== this.cur.y) cell(this.cur.k, bx + (this.cur.x + c) * CELL, by + (gy + r) * CELL, 0.13);"""))

# ---------- 4. 「下一个」预览放大到 24px 一格、横排靠右 ----------
reps.append((
"""            panel(hx - 10, 270, 176, 106, 0.5);
            txt('下一个', hx, 288, 12.5, 'rgba(255,255,255,0.6)');
            const nm = TET_SHAPES[this.next];
            const ns = TET_SKIN[this.next];
            const ncell = 20;
            for (let r = 0; r < nm.length; r++) for (let c = 0; c < nm[r].length; c++) {
                if (!nm[r][c]) continue;
                const x = hx + 4 + c * ncell, y = 304 + r * ncell;
                ctx.fillStyle = ns.c; rr(x, y, ncell - 2, ncell - 2, 4); ctx.fill();
                sprFit(ns.p, x + (ncell - 2) / 2, y + (ncell - 2) / 2, ncell - 6);
            }""",
"""            panel(hx - 10, 270, 372, 106, 0.5);
            txt('下一个', hx, 292, 13, 'rgba(255,255,255,0.6)');
            txt(TET_SKIN[this.next].n, hx, 314, 15, '#dfe9c4');
            const nm = TET_SHAPES[this.next];
            const ns = TET_SKIN[this.next];
            const ncell = 24;
            for (let r = 0; r < nm.length; r++) for (let c = 0; c < nm[r].length; c++) {
                if (!nm[r][c]) continue;
                const x = hx + 210 + c * ncell, y = 300 + r * ncell;
                ctx.fillStyle = ns.c; rr(x, y, ncell - 2, ncell - 2, 5); ctx.fill();
                if (ns.p === 'cob') sprFitW(ns.p, x + (ncell - 2) / 2, y + (ncell - 2) / 2, ncell - 5);
                else spr(ns.p, x + 2, y + 2, ncell - 6, ncell - 6);
            }"""))

# ---------- 5. 2048 合成路线：7 个挤一行 → 两行各 4 个 ----------
reps.append((
"""            panel(hx - 10, 296, 250, 210, 0.45);
            txt('合成路线', hx, 320, 14, 'rgba(255,255,255,0.65)');
            for (let i = 1; i <= 7; i++) {
                const d = G2048[i];
                sprH(d.p, hx + 2 + (i - 1) * 34, 338, 26);
                if (i < 7) txt('›', hx + (i - 1) * 34 + 30, 352, 12, 'rgba(255,255,255,0.3)', 'center');
            }""",
"""            panel(hx - 10, 296, 250, 240, 0.45);
            txt('合成路线', hx, 318, 14, 'rgba(255,255,255,0.65)');
            for (let i = 1; i <= G2048_MAX; i++) {
                const d = G2048[i];
                const row = i <= 4 ? 0 : 1;
                const col = row === 0 ? i - 1 : i - 5;
                const gx2 = hx + 4 + col * 58, gy2 = 334 + row * 52;
                sprH(d.p, gx2, gy2, 26);
                txt(d.n, gx2 + 13, gy2 + 36, 10.5, 'rgba(255,255,255,0.55)', 'center', 600);
                if (col < 3) txt('›', gx2 + 40, gy2 + 13, 12, 'rgba(255,255,255,0.28)', 'center');
            }"""))

reps.append((
"""            txt('方向键 / WASD 滑动', hx, 396, 14, '#dff0c4');
            txt('合出「毁灭菇」即通关', hx, 424, 14, '#dff0c4');
            txt('同种相邻会融合升级', hx, 452, 14, 'rgba(255,255,255,0.55)');
            txt('通关后可以继续冲分', hx, 476, 13, 'rgba(255,255,255,0.42)');""",
"""            txt('方向键 / WASD 滑动', hx, 448, 14, '#dff0c4');
            txt('合出「毁灭菇」即通关', hx, 474, 14, '#dff0c4');
            txt('同种相邻会融合升级', hx, 500, 13, 'rgba(255,255,255,0.55)');
            txt('通关后可以继续冲分', hx, 522, 12.5, 'rgba(255,255,255,0.42)');"""))

# ---------- 6. 泡泡龙：起始 8 行 + 炮管缩短 ----------
reps.append((
"""            // v4.0.138：起始 5 行（原 4 行），清空全场才算赢，够玩但不至于打不完
            for (let r = 0; r < 5; r++) for (let c = 0; c < this.colsIn(r); c++) {
                if (r === 4 && c % 3 === 0) continue;
                this.g[r][c] = (Math.random() * 4) | 0;
            }""",
"""            // v4.0.138：起始 8 行（原 4 行）——原版开局只铺 4 行，下半屏全空，看着像没开始；
            // 清空全场才算赢，行数够了才有推进感
            for (let r = 0; r < 8; r++) for (let c = 0; c < this.colsIn(r); c++) {
                if (r === 7 && c % 3 === 0) continue;
                this.g[r][c] = (Math.random() * 4) | 0;
            }"""))

reps.append((
"""            ctx.fillStyle = '#c9e08a'; rr(-7, -64, 14, 60, 7); ctx.fill();""",
"""            ctx.fillStyle = '#c9e08a'; rr(-6, -46, 12, 42, 6); ctx.fill();"""))

for i, (old, new) in enumerate(reps):
    n = s.count(old)
    assert n == 1, 'reps[%d] count=%d :: %s' % (i, n, old[:60])
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8').write(s)
print('版面补丁完成：%d 处' % len(reps))
