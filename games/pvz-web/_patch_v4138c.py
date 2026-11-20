# -*- coding: utf-8 -*-
"""v4.0.138-c：大厅改名 / 2048 通关可继续+输得掉 / 泡泡龙边界与胜利条件"""
import io

P = 'js/MiniGames.js'
s = io.open(P, encoding='utf-8').read()
reps = []

# ============ 一、大厅：改名「后院游乐场」+ 首卡换玉米 ============
reps.append((
"""        { id: 'tetris', name: '豌豆方块', tag: 'TETRIS', icon: 'peashooter', tip: '落植物块，消一行就齐射一轮', cls: Tetris },""",
"""        { id: 'tetris', name: '玉米方块', tag: 'TETRIS', icon: 'cob', tip: '落玉米块消一行齐射一轮，撑越久分越高', cls: Tetris },"""))

reps.append((
"""            '<h2>小游戏厅</h2><span class="sub">10 个玩法 · 随时进来玩一局</span></div>' +""",
"""            '<h2>后院游乐场</h2><span class="sub">10 个玩法 · 随时进来玩一局</span></div>' +"""))

reps.append((
""".mini-card .ico img{height:60px;width:auto;image-rendering:pixelated;filter:drop-shadow(0 2px 2px rgba(20,50,10,0.45));}""",
""".mini-card .ico img{height:60px;width:auto;max-width:100%;object-fit:contain;image-rendering:auto;filter:drop-shadow(0 2px 2px rgba(20,50,10,0.45));}"""))

# ============ 二、2048：加第 8 级 + 通关只弹一次 + 塞满真的输 ============
reps.append((
"""            this.pop = {};
            this.add(); this.add();""",
"""            this.pop = {};
            this.won = false; this.winBanner = 0;   // v4.0.138：通关只提示一次，之后继续玩
            this.add(); this.add();"""))

reps.append((
"""        { p: 'cobcannon', n: '玉米炮', c: '#b8872c' }
    ];""",
"""        { p: 'cobcannon', n: '玉米炮', c: '#b8872c' },
        { p: 'doom', n: '毁灭菇', c: '#6a4090' }     // v4.0.138：目标抬到第 8 级，通关难度翻倍
    ];
    const G2048_MAX = 8;"""))

reps.append((
"""                    if (a[i] === a[i + 1] && a[i] < 7) {
                        a[i]++; this.score += Math.pow(2, a[i]) * 2;""",
"""                    if (a[i] === a[i + 1] && a[i] < G2048_MAX) {
                        a[i]++; this.score += Math.pow(2, a[i]) * 2;"""))

reps.append((
"""        checkEnd() {
            let max = 0;
            for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) max = Math.max(max, this.g[r][c]);
            if (max >= 7 && !this.win) { this.win = true; this.over = true; this.overT = 0; this.winShown = true; return; }
            let can = false;
            for (let r = 0; r < 4 && !can; r++) for (let c = 0; c < 4; c++) {
                if (!this.g[r][c]) { can = true; break; }
                if (c < 3 && this.g[r][c] === this.g[r][c + 1]) { can = true; break; }
                if (r < 3 && this.g[r][c] === this.g[r + 1][c]) { can = true; break; }
            }
            if (!can) this.end(false);
        }""",
"""        checkEnd() {
            // v4.0.138：通关只弹一次横幅，不锁操作；之后继续玩，塞满照样判负。
            // 原实现 win 时直接 over=true，玩家一按键又把 win 清掉，导致此后永远卡在通关分支、输了没界面。
            let max = 0;
            for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) max = Math.max(max, this.g[r][c]);
            if (max >= G2048_MAX && !this.won) { this.won = true; this.winBanner = 3.2; }
            let can = false;
            for (let r = 0; r < 4 && !can; r++) for (let c = 0; c < 4; c++) {
                if (!this.g[r][c]) { can = true; break; }
                if (c < 3 && this.g[r][c] === this.g[r][c + 1]) { can = true; break; }
                if (r < 3 && this.g[r][c] === this.g[r + 1][c]) { can = true; break; }
            }
            if (!can) this.end(false);
        }"""))

reps.append((
"""        update(dt) {
            for (const k in this.pop) { this.pop[k] -= dt; if (this.pop[k] <= 0) delete this.pop[k]; }
        }
        onKey(down, k) {
            if (!down) return;
            if (this.over && !this.win) return;
            if (this.win) { this.win = false; this.over = false; }""",
"""        update(dt) {
            for (const k in this.pop) { this.pop[k] -= dt; if (this.pop[k] <= 0) delete this.pop[k]; }
            if (this.winBanner > 0) this.winBanner -= dt;
        }
        onKey(down, k) {
            if (!down) return;
            if (this.over) return;"""))

reps.append((
"""            txt('方向键 / WASD 滑动', hx, 396, 14, '#dff0c4');
            txt('合出「玉米炮」即通关', hx, 424, 14, '#dff0c4');
            txt('同种相邻会融合升级', hx, 452, 14, 'rgba(255,255,255,0.55)');
            if (this.win && this.over) this.overlay('通关！玉米加农炮到手', '分数 ' + this.score + '（可继续刷分）', '#b7f06a');
            else if (this.over) this.overlay('花园塞满了', '分数 ' + this.score, '#ff8f6b');""",
"""            txt('方向键 / WASD 滑动', hx, 396, 14, '#dff0c4');
            txt('合出「毁灭菇」即通关', hx, 424, 14, '#dff0c4');
            txt('同种相邻会融合升级', hx, 452, 14, 'rgba(255,255,255,0.55)');
            txt('通关后可以继续冲分', hx, 476, 13, 'rgba(255,255,255,0.42)');
            // 通关横幅（不锁操作，只提示一次）
            if (this.winBanner > 0) {
                const a = Math.min(1, this.winBanner / 0.6);
                ctx.save(); ctx.globalAlpha = a;
                ctx.fillStyle = 'rgba(20,50,10,0.86)';
                rr(this.bx - 6, this.by - 62, 4 * CELL + 3 * GAP + 12, 46, 12); ctx.fill();
                txt('🌱 通关！毁灭菇到手 —— 还能继续冲分', this.bx + (4 * CELL + 3 * GAP) / 2, this.by - 39, 17, '#b7f06a', 'center', 900);
                ctx.restore();
            }
            if (this.over) {
                this.overlay('花园塞满了', '分数 ' + Math.floor(this.score) + (this.won ? ' · 已通关' : ''), '#ff8f6b');
            }"""))

# ============ 三、泡泡龙：奇数行越界 + 胜利条件 ============
reps.append((
"""        cx(r, c) { return this.LEFT + this.R + c * this.R * 2 + (r % 2 ? this.R : 0); }""",
"""        // v4.0.138：奇数行整体右移半个球，最后一列会顶出右侧边框（中心 624 + R 22 > 右界 624），
        // 球在墙上反弹永远够不到那一列 → 场上永远清不空，这就是「泡泡龙根本赢不了」的根因。
        // 修法：奇数行少一列。
        colsIn(r) { return r % 2 ? this.COLS - 1 : this.COLS; }
        cx(r, c) { return this.LEFT + this.R + c * this.R * 2 + (r % 2 ? this.R : 0); }"""))

reps.append((
"""            for (let r = 0; r < 4; r++) for (let c = 0; c < this.COLS; c++) {
                if (r === 3 && c % 3 === 0) continue;
                this.g[r][c] = (Math.random() * 4) | 0;
            }""",
"""            for (let r = 0; r < 4; r++) for (let c = 0; c < this.colsIn(r); c++) {
                if (r === 3 && c % 3 === 0) continue;
                this.g[r][c] = (Math.random() * 4) | 0;
            }"""))

# attach：跳过非法列
reps.append((
"""            let best = null, bd = 1e9;
            for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.COLS; c++) {
                if (this.g[r][c] >= 0) continue;""",
"""            let best = null, bd = 1e9;
            for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.colsIn(r); c++) {
                if (this.g[r][c] >= 0) continue;"""))

# neighbors：越界判定按实际列数
reps.append((
"""                for (const [nr, nc] of this.neighbors(r, c)) {
                    if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.COLS) continue;
                    if (this.g[nr][nc] !== col) continue;""",
"""                for (const [nr, nc] of this.neighbors(r, c)) {
                    if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.colsIn(nr)) continue;
                    if (this.g[nr][nc] !== col) continue;"""))

reps.append((
"""                for (let c = 0; c < this.COLS; c++) if (this.g[0][c] >= 0) { keep.add('0,' + c); q.push([0, c]); }
                while (q.length) {
                    const [r, c] = q.pop();
                    for (const [nr, nc] of this.neighbors(r, c)) {
                        if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.COLS) continue;""",
"""                for (let c = 0; c < this.colsIn(0); c++) if (this.g[0][c] >= 0) { keep.add('0,' + c); q.push([0, c]); }
                while (q.length) {
                    const [r, c] = q.pop();
                    for (const [nr, nc] of this.neighbors(r, c)) {
                        if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.colsIn(nr)) continue;"""))

reps.append((
"""                for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.COLS; c++) {
                    if (this.g[r][c] >= 0 && !keep.has(r + ',' + c)) {""",
"""                for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.colsIn(r); c++) {
                    if (this.g[r][c] >= 0 && !keep.has(r + ',' + c)) {"""))

# 判负 + 胜利判定
reps.append((
"""            // 判负
            for (let r = this.rows - 1; r >= 0; r--) {
                if (this.g[r].some(v => v >= 0)) {
                    if (this.yOf(r) + this.R >= this.shooter.y - 24) this.end(false);
                    break;
                }
            }""",
"""            // v4.0.138：清空全场 = 通关（原来只有输没有赢）
            let any = 0;
            for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.colsIn(r); c++) if (this.g[r][c] >= 0) any++;
            if (!any) { this.score += 500; this.end(true); return; }
            // 判负
            for (let r = this.rows - 1; r >= 0; r--) {
                if (this.g[r].some(v => v >= 0)) {
                    if (this.yOf(r) + this.R >= this.shooter.y - 24) this.end(false);
                    break;
                }
            }"""))

# 绘制循环按列数
reps.append((
"""            for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.COLS; c++) {
                const v = this.g[r][c]; if (v < 0) continue;
                this.bub(this.cx(r, c), this.yOf(r), v);
            }""",
"""            for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.colsIn(r); c++) {
                const v = this.g[r][c]; if (v < 0) continue;
                this.bub(this.cx(r, c), this.yOf(r), v);
            }"""))

# 命中检测：跳过不存在的列（否则奇数行第 11 列是空地却被当成球）
reps.append((
"""                for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.COLS; c++) {
                    if (this.g[r][c] < 0) continue;
                    const dx = b.x - this.cx(r, c), dy = b.y - this.yOf(r);""",
"""                for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.colsIn(r); c++) {
                    if (this.g[r][c] < 0) continue;
                    const dx = b.x - this.cx(r, c), dy = b.y - this.yOf(r);"""))

# 结算遮罩：区分胜负
reps.append((
"""            if (this.over) this.overlay('泡泡堆到炮口了', '分数 ' + this.score, '#ff8f6b');""",
"""            if (this.over) {
                if (this.win) this.overlay('全场清空！', '分数 ' + this.score + ' · 泡泡一个不剩', '#b7f06a');
                else this.overlay('泡泡堆到炮口了', '分数 ' + this.score + ' · 剩 ' + this.leftCount() + ' 颗', '#ff8f6b');
            }"""))

# 新增 leftCount
reps.append((
"""        bub(x, y, col, a) {
            const c = BUB_COLORS[col];""",
"""        leftCount() {
            let n = 0;
            for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.colsIn(r); c++) if (this.g[r][c] >= 0) n++;
            return n;
        }
        bub(x, y, col, a) {
            const c = BUB_COLORS[col];"""))

# 右侧说明：补一句通关条件
reps.append((
"""            txt('同色 ≥3 爆破', hx, 452, 12.5, 'rgba(255,255,255,0.6)');
            txt('顶到红线就输', hx, 476, 12.5, 'rgba(255,255,255,0.6)');""",
"""            txt('同色 ≥3 爆破', hx, 452, 12.5, 'rgba(255,255,255,0.6)');
            txt('清空全场即通关', hx, 476, 12.5, '#b7f06a');
            txt('剩 ' + this.leftCount() + ' 颗 · 顶到红线就输', hx, 500, 12.5, 'rgba(255,255,255,0.6)');"""))

for i, (old, new) in enumerate(reps):
    n = s.count(old)
    assert n == 1, 'reps[%d] count=%d :: %s' % (i, n, old[:60])
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8').write(s)
print('大厅/2048/泡泡龙补丁完成：%d 处' % len(reps))
