# -*- coding: utf-8 -*-
"""v4.0.138-b：小游戏厅——玉米方块（改名/换图/棋盘放大/时间积分）"""
import io

P = 'js/MiniGames.js'
s = io.open(P, encoding='utf-8').read()
reps = []

# ---------- 1. 新增玉米棒贴图 + 等比 contain 绘制 ----------
reps.append((
"""        kernel: PL + 'KernelPult/KernelPult.png',""",
"""        kernel: PL + 'KernelPult/KernelPult.png',
        cob: PL + 'CobCannon/Cob.png',            // v4.0.138：161x76 的玉米棒（原版玉米炮弹），比 96px 投石车清楚得多
        doom: PL + 'DoomShroom/0.gif',"""))

reps.append((
"""    function bgGrass() {""",
"""    // 等比 contain 居中：宽扁的素材（如玉米棒 161x76）放进方格/方框不拉伸
    function sprFit(k, cx, cy, box, alpha) {
        const im = _im[k];
        if (!im || !im.complete || !im.naturalWidth) return false;
        const r = im.naturalWidth / im.naturalHeight;
        let w = box, h = box;
        if (r > 1) h = box / r; else w = box * r;
        return spr(k, cx - w / 2, cy - h / 2, w, h, alpha);
    }
    function bgGrass() {"""))

# ---------- 2. 方块皮肤：玉米改用玉米棒 ----------
reps.append((
"""    const TET_SKIN = {
        I: { p: 'peashooter', c: '#8ecb3a', n: '豌豆' },
        O: { p: 'wallnut', c: '#c79a58', n: '坚果' },
        T: { p: 'pot', c: '#c2703c', n: '花盆' },
        L: { p: 'lilypad', c: '#4fa77c', n: '睡莲' },
        J: { p: 'spikeweed', c: '#8d9440', n: '地刺' },
        S: { p: 'cherry', c: '#cf4130', n: '樱桃' },
        Z: { p: 'kernel', c: '#dfb13c', n: '玉米' }
    };""",
"""    const TET_SKIN = {
        I: { p: 'peashooter', c: '#8ecb3a', n: '豌豆' },
        O: { p: 'wallnut', c: '#c79a58', n: '坚果' },
        T: { p: 'pot', c: '#c2703c', n: '花盆' },
        L: { p: 'lilypad', c: '#4fa77c', n: '睡莲' },
        J: { p: 'spikeweed', c: '#8d9440', n: '地刺' },
        S: { p: 'cherry', c: '#cf4130', n: '樱桃' },
        Z: { p: 'cob', c: '#e0b83c', n: '玉米' }      // v4.0.138：换成 161x76 的玉米棒，比 96px 投石车清楚
    };"""))

# ---------- 3. 棋盘尺寸与初始状态 ----------
reps.append((
"""        setup() {
            this.CO = 10; this.RO = 18; this.CELL = 28;
            this.bx = 168; this.by = 62;
            this.board = Array.from({ length: this.RO }, () => new Array(this.CO).fill(null));
            this.bag = []; this.cur = null; this.next = this.pick();
            this.dropT = 0; this.dropIv = 620; this.lines = 0; this.score = 0; this.clearing = 0;
            this.spawn();
        }""",
"""        setup() {
            // v4.0.138：棋盘撑大（280x504 → 320x544），侧栏字号整体收小，主视觉交给棋盘
            this.CO = 10; this.RO = 17; this.CELL = 32;
            this.bx = 116; this.by = 30;
            this.board = Array.from({ length: this.RO }, () => new Array(this.CO).fill(null));
            this.bag = []; this.cur = null; this.next = this.pick();
            this.dropT = 0; this.dropIv = 620; this.lines = 0; this.score = 0; this.clearing = 0;
            this.survT = 0;        // 存活秒数（时间积分来源）
            this.boostT = 0;       // 加速窗口剩余秒数（期间时间积分翻倍）
            this.timeScore = 0;    // 光是"活下来"赚到的分，和消行分分开显示
            this.spawn();
        }"""))

# ---------- 4. 消行分不变，但更新速度档 ----------
reps.append((
"""            if (n) {
                this.score += [0, 100, 300, 600, 1000][n];
                this.lines += n;
                this.dropIv = Math.max(150, 620 - Math.floor(this.lines / 10) * 55);
            }""",
"""            if (n) {
                this.score += [0, 100, 300, 600, 1000][n];
                this.lines += n;
                this.dropIv = Math.max(150, 620 - Math.floor(this.lines / 10) * 55);
            }"""))

# ---------- 5. update：时间积分 + 加速双倍 ----------
reps.append((
"""        update(dt) {
            if (this.over) return;
            this.dropT += dt * 1000;
            if (this.dropT >= this.dropIv) {
                this.dropT = 0;
                if (!this.tryMove(0, 1)) this.lock();
            }
        }""",
"""        update(dt) {
            if (this.over) return;
            // v4.0.138：积分不只看消行——活着的每一秒都在涨；处于加速状态时按双倍结算
            this.survT += dt;
            if (this.boostT > 0) this.boostT -= dt;
            const rate = this.boostT > 0 ? 6 : 3;        // 基础 3 分/秒（180/分），加速 6 分/秒（360/分）
            const gain = dt * rate;
            this.timeScore += gain;
            this.score += gain;
            this.dropT += dt * 1000;
            if (this.dropT >= this.dropIv) {
                this.dropT = 0;
                if (!this.tryMove(0, 1)) this.lock();
            }
        }"""))

# ---------- 6. 按键：软降/硬降都触发加速窗口 ----------
reps.append((
"""            else if (k === 'down') { if (this.tryMove(0, 1)) this.score += 1; }""",
"""            else if (k === 'down') { this.boostT = Math.max(this.boostT, 0.5); if (this.tryMove(0, 1)) this.score += 1; }"""))

reps.append((
"""            } else if (k === 'space') {
                let g = 0; while (this.tryMove(0, 1)) g++;
                this.score += g * 2; this.lock();
            }""",
"""            } else if (k === 'space') {
                let g = 0; while (this.tryMove(0, 1)) g++;
                this.boostT = Math.max(this.boostT, 1.2);   // 硬降后 1.2 秒按加速结算
                this.score += g * 2; this.lock();
            }"""))

# ---------- 7. draw：重排 HUD（棋盘放大、侧栏缩小）----------
reps.append((
"""            const cell = (k, x, y, a) => {
                const s = TET_SKIN[k];
                ctx.globalAlpha = a == null ? 1 : a;
                ctx.fillStyle = s.c; rr(x + 1, y + 1, CELL - 2, CELL - 2, 6); ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.22)'; rr(x + 3, y + 3, CELL - 6, 7, 3); ctx.fill();
                ctx.globalAlpha = 1;
                spr(s.p, x + 4, y + 4, CELL - 8, CELL - 8, a == null ? 1 : a);
            };""",
"""            const cell = (k, x, y, a) => {
                const s = TET_SKIN[k];
                ctx.globalAlpha = a == null ? 1 : a;
                ctx.fillStyle = s.c; rr(x + 1, y + 1, CELL - 2, CELL - 2, 7); ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.20)'; rr(x + 3, y + 3, CELL - 6, 8, 4); ctx.fill();
                ctx.globalAlpha = 1;
                sprFit(s.p, x + CELL / 2, y + CELL / 2 + 1, CELL - 9, a == null ? 1 : a);
            };"""))

reps.append((
"""            // 右侧 HUD
            const hx = 480;
            txt('豌豆方块', hx, 86, 30, '#ffe9a8', 'left', 900);
            txt('PLANT BLOCKS', hx, 116, 12, 'rgba(255,255,255,0.5)', 'left', 700);
            panel(hx - 8, 140, 380, 118, 0.5);
            txt('分数', hx + 8, 166, 15, 'rgba(255,255,255,0.65)');
            txt(String(this.score), hx + 8, 200, 38, '#ffe066', 'left', 900);
            txt('消行', hx + 190, 166, 15, 'rgba(255,255,255,0.65)');
            txt(String(this.lines), hx + 190, 200, 38, '#9fe060', 'left', 900);
            panel(hx - 8, 272, 190, 150, 0.5);
            txt('下一个', hx + 8, 296, 15, 'rgba(255,255,255,0.65)');
            const nm = TET_SHAPES[this.next];
            for (let r = 0; r < nm.length; r++) for (let c = 0; c < nm[r].length; c++) {
                if (!nm[r][c]) continue;
                const s = TET_SKIN[this.next];
                ctx.fillStyle = s.c; rr(hx + 14 + c * 26, 318 + r * 26, 24, 24, 5); ctx.fill();
                spr(s.p, hx + 17 + c * 26, 321 + r * 26, 18, 18);
            }
            panel(hx - 8, 436, 380, 116, 0.5);
            txt('← → 移动　↑ 旋转', hx + 8, 462, 15, '#dff0c4');
            txt('↓ 软降　空格 直落', hx + 8, 488, 15, '#dff0c4');
            txt('ESC 回大厅', hx + 8, 518, 14, 'rgba(255,255,255,0.5)');
            if (this.over) this.overlay('被啃穿了！', '分数 ' + this.score + ' · 消行 ' + this.lines, '#ff8f6b');""",
"""            // 右侧 HUD（v4.0.138：数字整体收小，把版面让给棋盘）
            const hx = 500;
            txt('玉米方块', hx, 66, 27, '#ffe9a8', 'left', 900);
            txt('CORN BLOCKS', hx, 92, 11.5, 'rgba(255,255,255,0.5)', 'left', 700);

            panel(hx - 10, 112, 372, 76, 0.5);
            txt('分数', hx, 132, 13, 'rgba(255,255,255,0.62)');
            txt(String(Math.floor(this.score)), hx, 162, 26, '#ffe066', 'left', 900);
            txt('消行', hx + 200, 132, 13, 'rgba(255,255,255,0.62)');
            txt(String(this.lines), hx + 200, 162, 26, '#9fe060', 'left', 900);

            // 时间 / 加速：这两栏解释"分是怎么涨上来的"
            panel(hx - 10, 198, 372, 62, 0.45);
            txt('存活', hx, 218, 12.5, 'rgba(255,255,255,0.6)');
            txt(this.survT.toFixed(0) + 's', hx + 40, 218, 17, '#cfe8b0', 'left', 800);
            txt('时间分', hx + 120, 218, 12.5, 'rgba(255,255,255,0.6)');
            txt('+' + Math.floor(this.timeScore), hx + 178, 218, 17, '#cfe8b0', 'left', 800);
            const boosting = this.boostT > 0;
            txt(boosting ? '加速中 ×2 积分' : '软降/直落触发加速', hx, 246, 13,
                boosting ? '#ffe066' : 'rgba(255,255,255,0.45)', 'left', boosting ? 900 : 600);

            panel(hx - 10, 270, 176, 106, 0.5);
            txt('下一个', hx, 288, 12.5, 'rgba(255,255,255,0.6)');
            const nm = TET_SHAPES[this.next];
            const ns = TET_SKIN[this.next];
            const ncell = 20;
            for (let r = 0; r < nm.length; r++) for (let c = 0; c < nm[r].length; c++) {
                if (!nm[r][c]) continue;
                const x = hx + 4 + c * ncell, y = 304 + r * ncell;
                ctx.fillStyle = ns.c; rr(x, y, ncell - 2, ncell - 2, 4); ctx.fill();
                sprFit(ns.p, x + (ncell - 2) / 2, y + (ncell - 2) / 2, ncell - 6);
            }

            panel(hx - 10, 386, 372, 108, 0.45);
            txt('← → 移动　↑ 旋转', hx, 410, 14, '#dff0c4');
            txt('↓ 软降　空格 直落', hx, 436, 14, '#dff0c4');
            txt('活越久分越高 · 加速双倍', hx, 462, 13, 'rgba(255,255,255,0.55)');
            txt('ESC 回大厅', hx, 482, 12.5, 'rgba(255,255,255,0.4)');
            if (this.over) this.overlay('被啃穿了！', '分数 ' + Math.floor(this.score) + ' · 消行 ' + this.lines + ' · 存活 ' + this.survT.toFixed(0) + 's', '#ff8f6b');"""))

for i, (old, new) in enumerate(reps):
    n = s.count(old)
    assert n == 1, 'reps[%d] count=%d :: %s' % (i, n, old[:60])
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8').write(s)
print('玉米方块补丁完成：%d 处' % len(reps))
