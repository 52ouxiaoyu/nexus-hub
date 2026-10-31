# -*- coding: utf-8 -*-
"""v4.0.138-e：玉米方块自绘（低分辨率贴图放大必糊）+ 泡泡龙连空加压"""
import io

P = 'js/MiniGames.js'
s = io.open(P, encoding='utf-8').read()
reps = []

# ---------- 1. 玉米方块：自绘圆角块 + 玉米粒阵，任何尺寸都清晰 ----------
reps.append((
"""            const cell = (k, x, y, a) => {
                const s = TET_SKIN[k];
                ctx.globalAlpha = a == null ? 1 : a;
                ctx.fillStyle = s.c; rr(x + 1, y + 1, CELL - 2, CELL - 2, 7); ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.20)'; rr(x + 3, y + 3, CELL - 6, 8, 4); ctx.fill();
                ctx.globalAlpha = 1;
                const ca = a == null ? 1 : a;
                if (s.p === 'cob') sprFitW(s.p, x + CELL / 2, y + CELL / 2 + 1, CELL - 6, ca);
                else spr(s.p, x + 5, y + 5, CELL - 10, CELL - 10, ca);
            };""",
"""            // v4.0.138：玉米块改成自绘——161x76 的玉米棒缩到 12px 高必然糊，
            // 自绘圆角底 + 玉米粒阵在任何尺寸都是锐的
            const cornCell = (x, y, a) => {
                ctx.globalAlpha = a == null ? 1 : a;
                const g0 = ctx.createLinearGradient(0, y, 0, y + CELL);
                g0.addColorStop(0, '#f5d75a'); g0.addColorStop(1, '#d3a520');
                ctx.fillStyle = g0; rr(x + 1, y + 1, CELL - 2, CELL - 2, 7); ctx.fill();
                ctx.strokeStyle = 'rgba(120,80,10,0.55)'; ctx.lineWidth = 1.5;
                rr(x + 1.5, y + 1.5, CELL - 3, CELL - 3, 7); ctx.stroke();
                // 玉米粒：3x3 圆点，留边
                const pad = CELL * 0.20, step = (CELL - pad * 2) / 2.6;
                ctx.fillStyle = 'rgba(255,246,180,0.95)';
                for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
                    const cx = x + pad + c * step, cy = y + pad + r * step;
                    ctx.beginPath(); ctx.ellipse(cx, cy, CELL * 0.088, CELL * 0.076, 0, 0, Math.PI * 2); ctx.fill();
                }
                ctx.fillStyle = 'rgba(120,80,10,0.18)';
                for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
                    const cx = x + pad + c * step, cy = y + pad + r * step;
                    ctx.beginPath(); ctx.ellipse(cx, cy + CELL * 0.072, CELL * 0.082, CELL * 0.028, 0, 0, Math.PI * 2); ctx.fill();
                }
                ctx.globalAlpha = 1;
            };
            const cell = (k, x, y, a) => {
                if (k === 'Z') { cornCell(x, y, a); return; }
                const s = TET_SKIN[k];
                ctx.globalAlpha = a == null ? 1 : a;
                ctx.fillStyle = s.c; rr(x + 1, y + 1, CELL - 2, CELL - 2, 7); ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.20)'; rr(x + 3, y + 3, CELL - 6, 8, 4); ctx.fill();
                ctx.globalAlpha = 1;
                const ca = a == null ? 1 : a;
                spr(s.p, x + 5, y + 5, CELL - 10, CELL - 10, ca);
            };"""))

# 「下一个」预览也走同一套（Z 型自绘）
reps.append((
"""            for (let r = 0; r < nm.length; r++) for (let c = 0; c < nm[r].length; c++) {
                if (!nm[r][c]) continue;
                const x = hx + 210 + c * ncell, y = 300 + r * ncell;
                ctx.fillStyle = ns.c; rr(x, y, ncell - 2, ncell - 2, 5); ctx.fill();
                if (ns.p === 'cob') sprFitW(ns.p, x + (ncell - 2) / 2, y + (ncell - 2) / 2, ncell - 5);
                else spr(ns.p, x + 2, y + 2, ncell - 6, ncell - 6);
            }""",
"""            for (let r = 0; r < nm.length; r++) for (let c = 0; c < nm[r].length; c++) {
                if (!nm[r][c]) continue;
                const x = hx + 210 + c * ncell, y = 300 + r * ncell;
                if (this.next === 'Z') {
                    const g2 = ctx.createLinearGradient(0, y, 0, y + ncell);
                    g2.addColorStop(0, '#f5d75a'); g2.addColorStop(1, '#d3a520');
                    ctx.fillStyle = g2; rr(x, y, ncell - 2, ncell - 2, 5); ctx.fill();
                    ctx.fillStyle = 'rgba(255,246,180,0.95)';
                    for (let i = 0; i < 4; i++) {
                        ctx.beginPath(); ctx.arc(x + 5 + (i % 2) * 8, y + 6 + Math.floor(i / 2) * 8, 2.2, 0, Math.PI * 2); ctx.fill();
                    }
                } else {
                    ctx.fillStyle = ns.c; rr(x, y, ncell - 2, ncell - 2, 5); ctx.fill();
                    spr(ns.p, x + 2, y + 2, ncell - 6, ncell - 6);
                }
            }"""))

# ---------- 2. 泡泡龙：连续打空加压（不破坏「清空即赢」）----------
reps.append((
"""            this.pops = []; this.drops = [];
            this.deadline = this.yOf(this.rows - 2);""",
"""            this.pops = []; this.drops = [];
            this.missStreak = 0;      // v4.0.138：连续几发没消掉任何东西
            this.deadline = this.yOf(this.rows - 2);"""))

reps.append((
"""            this.g[best[0]][best[1]] = b.col;
            this.ball = null;
            this.resolve(best[0], best[1]);
            this.nextBall();""",
"""            this.g[best[0]][best[1]] = b.col;
            this.ball = null;
            const popBefore = this.pops.length;
            this.resolve(best[0], best[1]);
            // 连续 8 发颗粒无收 → 顶部压一行下来（打得好的人永远压不到）
            if (!this.over) {
                if (this.pops.length > popBefore) this.missStreak = 0;
                else if (++this.missStreak >= 8) { this.missStreak = 0; this.pushRow(); }
            }
            this.nextBall();"""))

reps.append((
"""        leftCount() {""",
"""        // 整体下移一行、顶部补一行新球；超出该行列数的球滚落
        pushRow() {
            for (let r = this.rows - 1; r >= 1; r--) {
                this.g[r] = this.g[r - 1].slice();
                for (let c = this.colsIn(r); c < this.COLS; c++) {
                    if (this.g[r][c] >= 0) {
                        this.drops.push({ x: this.cx(r, c), y: this.yOf(r), v: 60, c: this.g[r][c] });
                        this.g[r][c] = -1;
                    }
                }
            }
            this.g[0] = new Array(this.COLS).fill(-1);
            for (let c = 0; c < this.colsIn(0); c++) this.g[0][c] = (Math.random() * 4) | 0;
            this.downRows = (this.downRows || 0) + 1;
            // 压到底直接判负
            for (let r = this.rows - 1; r >= 0; r--) {
                if (this.g[r].some(v => v >= 0)) {
                    if (this.yOf(r) + this.R >= this.shooter.y - 24) this.end(false);
                    break;
                }
            }
        }
        leftCount() {"""))

# 提示文案补一句增压规则
reps.append((
"""            txt('剩 ' + this.leftCount() + ' 颗 · 顶到红线就输', hx, 500, 12.5, 'rgba(255,255,255,0.6)');""",
"""            txt('剩 ' + this.leftCount() + ' 颗 · 顶到红线就输', hx, 500, 12.5, 'rgba(255,255,255,0.6)');
            txt('连续 8 发打空会压下一行', hx, 522, 12, 'rgba(255,255,255,0.38)');"""))

for i, (old, new) in enumerate(reps):
    n = s.count(old)
    assert n == 1, 'reps[%d] count=%d :: %s' % (i, n, old[:60])
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8').write(s)
print('e 补丁完成：%d 处' % len(reps))
