/*!
 * MiniGames.js — pvz-web 小游戏厅（v4.0.134）
 * 10 个独立玩法，全部运行在同一个 900×600 canvas 上：
 *   豌豆方块(俄罗斯方块) / 僵尸地鼠(打地鼠) / 花园2048 / 猫尾草泡泡龙(泡泡射击)
 *   豌豆弹球(打砖块) / 植物消消乐(三消) / 寒冰推箱(推箱子) / 豌豆射击场(打飞靶)
 *   花园连连看(记忆配对) / 僵尸贪吃蛇(贪吃蛇)
 * ESC 逐层返回（游戏 → 大厅 → 主菜单）。
 */
(function () {
    'use strict';

    const W = 900, H = 600;
    const PL = 'assets/images/Plants/';
    const ZB = 'assets/images/Zombies/';
    const SPR = {
        peashooter: PL + 'Peashooter/0.gif',
        sunflower: PL + 'SunFlower/0.gif',
        wallnut: PL + 'WallNut/0.gif',
        tallnut: PL + 'TallNut/0.gif',
        snowpea: PL + 'SnowPea/0.gif',
        repeater: PL + 'Repeater/0.gif',
        threepeater: PL + 'Threepeater/0.gif',
        gatling: PL + 'GatlingPea/0.gif',
        melon: PL + 'MelonPult/MelonPult.png',
        wintermelon: PL + 'WinterMelon/WinterMelon.png',
        cobcannon: PL + 'CobCannon/CobCannon.png',
        pot: PL + 'FlowerPot/0.gif',
        lilypad: PL + 'LilyPad/0.gif',
        spikeweed: PL + 'Spikeweed/0.gif',
        cherry: PL + 'CherryBomb/0.gif',
        torchwood: PL + 'Torchwood/0.gif',
        kernel: PL + 'KernelPult/KernelPult.png',
        puffshroom: PL + 'PuffShroom/0.gif',
        cattail: PL + 'Cattail/Cattail.gif',
        zombie: ZB + 'Zombie/0.gif',
        cone: ZB + 'ConeheadZombie/0.gif',
        bucket: ZB + 'BucketheadZombie/0.gif',
        balloon: ZB + 'BalloonZombie/0.gif',
        sun: 'assets/images/interface/Sun.gif'
    };
    const _im = Object.create(null);

    /* ================= 基础绘制工具 ================= */
    let ctx = null;
    function txt(s, x, y, size, color, align, weight) {
        ctx.font = (weight || 700) + ' ' + size + 'px "PingFang SC","Microsoft YaHei",sans-serif';
        ctx.fillStyle = color || '#fff';
        ctx.textAlign = align || 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(s, x, y);
    }
    function rr(x, y, w, h, r) {
        r = Math.max(0, Math.min(r, w / 2, h / 2));
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }
    function spr(k, x, y, w, h, alpha) {
        const im = _im[k];
        if (!im || !im.complete || !im.naturalWidth) return false;
        ctx.globalAlpha = alpha == null ? 1 : alpha;
        ctx.drawImage(im, x, y, w, h);
        ctx.globalAlpha = 1;
        return true;
    }
    function sprH(k, x, y, h, alpha) {           // 按高度等比
        const im = _im[k];
        if (!im || !im.complete || !im.naturalWidth) return false;
        return spr(k, x, y, h * im.naturalWidth / im.naturalHeight, h, alpha);
    }
    function bgGrass() {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#2f5a20'); g.addColorStop(0.45, '#3f6f26'); g.addColorStop(1, '#274a19');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        ctx.save(); ctx.globalAlpha = 0.10; ctx.strokeStyle = '#c9ee8f'; ctx.lineWidth = 1;
        for (let y = 90; y < H; y += 46) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
        ctx.restore();
    }
    function panel(x, y, w, h, a) {
        ctx.save();
        ctx.fillStyle = 'rgba(10,22,8,' + (a == null ? 0.55 : a) + ')';
        rr(x, y, w, h, 16); ctx.fill();
        ctx.strokeStyle = 'rgba(190,225,140,0.28)'; ctx.lineWidth = 2; ctx.stroke();
        ctx.restore();
    }

    let GAME_SCALE = 1;

    /* ================= 基类 ================= */
    class Base {
        constructor() { this.over = false; this.win = false; this.overT = 0; this.t = 0; this.score = 0; }
        reset() { this.over = false; this.win = false; this.overT = 0; this.t = 0; this.score = 0; this.setup(); }
        setup() {}
        update(dt) { }
        draw() { }
        onKey(down, k, e) { }
        onDown(x, y) { }
        onMove(x, y) { }
        onUp() { }
        end(win) {
            if (this.over) return;
            this.over = true; this.win = !!win; this.overT = 0;
        }
        overlay(title, sub, color) {
            ctx.fillStyle = 'rgba(6,14,5,0.74)'; ctx.fillRect(0, 0, W, H);
            txt(title, W / 2, H / 2 - 34, 46, color || '#ffe066', 'center', 900);
            if (sub) txt(sub, W / 2, H / 2 + 22, 21, '#e8f5cf', 'center', 600);
            txt('点击任意处 · 或按 R 重开', W / 2, H / 2 + 76, 17, 'rgba(255,255,255,0.72)', 'center', 600);
        }
    }

    /* ================================================================
     * 1. 豌豆方块（俄罗斯方块）
     * ============================================================== */
    const TET_SHAPES = {
        I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
        O: [[1, 1], [1, 1]],
        T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
        L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
        J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
        S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
        Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]]
    };
    const TET_SKIN = {
        I: { p: 'peashooter', c: '#8ecb3a', n: '豌豆' },
        O: { p: 'wallnut', c: '#c79a58', n: '坚果' },
        T: { p: 'pot', c: '#c2703c', n: '花盆' },
        L: { p: 'lilypad', c: '#4fa77c', n: '睡莲' },
        J: { p: 'spikeweed', c: '#8d9440', n: '地刺' },
        S: { p: 'cherry', c: '#cf4130', n: '樱桃' },
        Z: { p: 'kernel', c: '#dfb13c', n: '玉米' }
    };
    class Tetris extends Base {
        setup() {
            this.CO = 10; this.RO = 18; this.CELL = 28;
            this.bx = 168; this.by = 62;
            this.board = Array.from({ length: this.RO }, () => new Array(this.CO).fill(null));
            this.bag = []; this.cur = null; this.next = this.pick();
            this.dropT = 0; this.dropIv = 620; this.lines = 0; this.score = 0; this.clearing = 0;
            this.spawn();
        }
        pick() {
            if (!this.bag.length) {
                this.bag = Object.keys(TET_SHAPES).slice();
                for (let i = this.bag.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = this.bag[i]; this.bag[i] = this.bag[j]; this.bag[j] = t; }
            }
            return this.bag.pop();
        }
        spawn() {
            const k = this.next; this.next = this.pick();
            const m = TET_SHAPES[k].map(r => r.slice());
            this.cur = { k, m, x: 3, y: k === 'I' ? -1 : 0 };
            if (this.hit(this.cur.m, this.cur.x, this.cur.y)) this.end(false);
        }
        hit(m, px, py) {
            for (let r = 0; r < m.length; r++) for (let c = 0; c < m[r].length; c++) {
                if (!m[r][c]) continue;
                const x = px + c, y = py + r;
                if (x < 0 || x >= this.CO || y >= this.RO) return true;
                if (y >= 0 && this.board[y][x]) return true;
            }
            return false;
        }
        rotate(m) {
            const n = m.length, out = Array.from({ length: n }, () => new Array(n).fill(0));
            for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) out[c][n - 1 - r] = m[r][c];
            return out;
        }
        tryMove(dx, dy) {
            if (!this.cur || this.over) return false;
            if (!this.hit(this.cur.m, this.cur.x + dx, this.cur.y + dy)) { this.cur.x += dx; this.cur.y += dy; return true; }
            return false;
        }
        lock() {
            const { m, x, y, k } = this.cur;
            for (let r = 0; r < m.length; r++) for (let c = 0; c < m[r].length; c++) {
                if (m[r][c] && y + r >= 0) this.board[y + r][x + c] = k;
            }
            let n = 0;
            for (let r = this.RO - 1; r >= 0; r--) {
                if (this.board[r].every(v => v)) { this.board.splice(r, 1); this.board.unshift(new Array(this.CO).fill(null)); n++; r++; }
            }
            if (n) {
                this.score += [0, 100, 300, 600, 1000][n];
                this.lines += n;
                this.dropIv = Math.max(150, 620 - Math.floor(this.lines / 10) * 55);
            }
            this.spawn();
        }
        update(dt) {
            if (this.over) return;
            this.dropT += dt * 1000;
            if (this.dropT >= this.dropIv) {
                this.dropT = 0;
                if (!this.tryMove(0, 1)) this.lock();
            }
        }
        onKey(down, k) {
            if (!down || this.over) return;
            if (k === 'left') this.tryMove(-1, 0);
            else if (k === 'right') this.tryMove(1, 0);
            else if (k === 'down') { if (this.tryMove(0, 1)) this.score += 1; }
            else if (k === 'up') {
                const m = this.rotate(this.cur.m);
                for (const dx of [0, -1, 1, -2, 2]) if (!this.hit(m, this.cur.x + dx, this.cur.y)) { this.cur.m = m; this.cur.x += dx; break; }
            } else if (k === 'space') {
                let g = 0; while (this.tryMove(0, 1)) g++;
                this.score += g * 2; this.lock();
            }
        }
        draw() {
            bgGrass();
            const { CELL, CO, RO, bx, by } = this;
            panel(bx - 12, by - 12, CO * CELL + 24, RO * CELL + 24, 0.62);
            ctx.save();
            ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
            for (let c = 1; c < CO; c++) { ctx.beginPath(); ctx.moveTo(bx + c * CELL, by); ctx.lineTo(bx + c * CELL, by + RO * CELL); ctx.stroke(); }
            for (let r = 1; r < RO; r++) { ctx.beginPath(); ctx.moveTo(bx, by + r * CELL); ctx.lineTo(bx + CO * CELL, by + r * CELL); ctx.stroke(); }
            ctx.restore();
            const cell = (k, x, y, a) => {
                const s = TET_SKIN[k];
                ctx.globalAlpha = a == null ? 1 : a;
                ctx.fillStyle = s.c; rr(x + 1, y + 1, CELL - 2, CELL - 2, 6); ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.22)'; rr(x + 3, y + 3, CELL - 6, 7, 3); ctx.fill();
                ctx.globalAlpha = 1;
                spr(s.p, x + 4, y + 4, CELL - 8, CELL - 8, a == null ? 1 : a);
            };
            for (let r = 0; r < RO; r++) for (let c = 0; c < CO; c++) {
                if (this.board[r][c]) cell(this.board[r][c], bx + c * CELL, by + r * CELL);
            }
            if (this.cur && !this.over) {
                let gy = this.cur.y; while (!this.hit(this.cur.m, this.cur.x, gy + 1)) gy++;
                for (let r = 0; r < this.cur.m.length; r++) for (let c = 0; c < this.cur.m[r].length; c++) {
                    if (!this.cur.m[r][c]) continue;
                    if (gy !== this.cur.y) cell(this.cur.k, bx + (this.cur.x + c) * CELL, by + (gy + r) * CELL, 0.22);
                }
                for (let r = 0; r < this.cur.m.length; r++) for (let c = 0; c < this.cur.m[r].length; c++) {
                    if (!this.cur.m[r][c]) continue;
                    if (this.cur.y + r >= 0) cell(this.cur.k, bx + (this.cur.x + c) * CELL, by + (this.cur.y + r) * CELL);
                }
            }
            // 右侧 HUD
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
            if (this.over) this.overlay('被啃穿了！', '分数 ' + this.score + ' · 消行 ' + this.lines, '#ff8f6b');
        }
    }

    /* ================================================================
     * 2. 僵尸地鼠（打地鼠）
     * ============================================================== */
    class Whack extends Base {
        setup() {
            this.holes = [];
            const cx = [300, 450, 600], cy = [215, 335, 455];
            for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
                this.holes.push({ x: cx[c], y: cy[r], st: 'idle', t: 0, type: 'normal', hits: 1, up: 0 });
            }
            this.time = 60; this.spawnT = 0.35; this.combo = 0; this.hits = 0; this.miss = 0;
            this.floats = [];
        }
        spawnOne() {
            const free = this.holes.filter(h => h.st === 'idle');
            if (!free.length) return;
            const h = free[(Math.random() * free.length) | 0];
            const roll = Math.random();
            let type = 'normal', hits = 1, val = 10;
            if (roll < 0.16) { type = 'cone'; val = 20; }
            else if (roll < 0.27) { type = 'bucket'; hits = 3; val = 45; }
            else if (roll < 0.37) { type = 'sun'; val = -15; }
            h.st = 'up'; h.type = type; h.hits = hits; h.maxHits = hits; h.val = val;
            h.t = type === 'bucket' ? 1.7 : (type === 'sun' ? 1.1 : 0.95);
            h.up = 0;
        }
        update(dt) {
            if (this.over) return;
            this.time -= dt;
            if (this.time <= 0) { this.time = 0; this.end(this.score > 0); return; }
            const prog = 1 - this.time / 60;
            this.spawnT -= dt;
            if (this.spawnT <= 0) {
                this.spawnOne();
                this.spawnT = Math.max(0.34, 0.95 - prog * 0.55) * (0.7 + Math.random() * 0.6);
                if (Math.random() < 0.22 + prog * 0.25) this.spawnOne();
            }
            for (const h of this.holes) {
                if (h.st === 'up' || h.st === 'hit') {
                    h.up = Math.min(1, h.up + dt * 7);
                    h.t -= dt;
                    if (h.t <= 0) { h.st = 'idle'; h.up = 0; if (h.type !== 'sun') this.miss++; }
                }
            }
            this.floats = this.floats.filter(f => (f.t -= dt) > 0);
        }
        onDown(x, y) {
            if (this.over) return;
            for (const h of this.holes) {
                if (h.st !== 'up') continue;
                const top = this.riseTop(h);
                if (Math.abs(x - h.x) > 78 || y < top || y > h.y - 20) continue;
                if (h.type === 'sun') {
                    this.score = Math.max(0, this.score - 15); this.combo = 0;
                    this.floats.push({ x: h.x, y: top + 20, s: '-15 打错植物', t: 0.9, c: '#ff8f6b' });
                    h.st = 'idle'; h.up = 0;
                } else {
                    h.hits--;
                    if (h.hits > 0) {
                        this.floats.push({ x: h.x, y: top + 10, s: '铛！', t: 0.5, c: '#ffe066' });
                        h.t = Math.max(h.t, 0.7);
                    } else {
                        this.combo++; this.hits++;
                        const gain = h.val * (1 + Math.min(4, this.combo - 1) * 0.25);
                        this.score += Math.round(gain);
                        this.floats.push({ x: h.x, y: top + 6, s: '+' + Math.round(gain), t: 0.8, c: '#b7f06a' });
                        h.st = 'idle'; h.up = 0;
                    }
                }
                return;
            }
            this.combo = 0;
        }
        riseTop(h) {
            const hh = h.type === 'sun' ? 74 : 86;
            return (h.y - 34) - hh * (0.3 + 0.7 * h.up);
        }
        draw() {
            bgGrass();
            // 顶部计时条
            const t = Math.max(0, this.time) / 60;
            ctx.fillStyle = 'rgba(0,0,0,0.42)'; rr(60, 62, 780, 16, 8); ctx.fill();
            const g = ctx.createLinearGradient(60, 0, 840, 0);
            g.addColorStop(0, '#ff6b4a'); g.addColorStop(1, '#ffd24a');
            ctx.fillStyle = t < 0.25 ? '#ff5a3c' : g; rr(60, 62, Math.max(6, 780 * t), 16, 8); ctx.fill();
            txt('剩余 ' + Math.ceil(this.time) + 's', 450, 96, 16, '#ffe9a8', 'center', 700);
            txt('分数 ' + this.score, 120, 96, 18, '#fff', 'center', 700);
            txt('敲 ' + this.hits + ' · 漏 ' + this.miss, 780, 96, 16, 'rgba(255,255,255,0.7)', 'center', 700);

            for (const h of this.holes) {
                // 阴影
                ctx.fillStyle = 'rgba(0,0,0,0.28)';
                ctx.beginPath(); ctx.ellipse(h.x, h.y + 12, 78, 18, 0, 0, Math.PI * 2); ctx.fill();
                if (h.st === 'up') {
                    const key = h.type === 'cone' ? 'cone' : h.type === 'bucket' ? 'bucket' : h.type === 'sun' ? 'sunflower' : 'zombie';
                    const hh = h.type === 'sun' ? 74 : 86;
                    const im = _im[key];
                    const w = im && im.naturalWidth ? hh * im.naturalWidth / im.naturalHeight : hh * 0.82;
                    const baseY = h.y - 34;
                    ctx.save();
                    ctx.beginPath(); ctx.rect(h.x - 92, baseY - 210, 184, 210); ctx.clip();
                    spr(key, h.x - w / 2, this.riseTop(h), w, hh);
                    ctx.restore();
                }
                // 墓碑
                const gw = 132, gh = 84, gx = h.x - gw / 2, gy = h.y - 54;
                ctx.fillStyle = '#5e5f52'; rr(gx, gy, gw, gh, 16); ctx.fill();
                ctx.fillStyle = '#767869'; rr(gx + 5, gy + 5, gw - 10, gh - 14, 12); ctx.fill();
                ctx.fillStyle = 'rgba(30,32,24,0.5)';
                txt('R.I.P', h.x, gy + 34, 20, 'rgba(30,32,24,0.55)', 'center', 900);
                ctx.fillStyle = '#3a3120';
                ctx.beginPath(); ctx.ellipse(h.x, gy + gh - 6, gw / 2 + 9, 13, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = 'rgba(116,150,68,0.45)';
                ctx.beginPath(); ctx.ellipse(h.x, gy + gh - 2, gw / 2 + 16, 9, 0, 0, Math.PI * 2); ctx.fill();
            }
            for (const f of this.floats) {
                ctx.globalAlpha = Math.min(1, f.t * 2.2);
                txt(f.s, f.x, f.y - (0.9 - f.t) * 46, 22, f.c, 'center', 900);
                ctx.globalAlpha = 1;
            }
            if (this.over) this.overlay('时间到！', '分数 ' + this.score + ' · 敲中 ' + this.hits + ' · 漏 ' + this.miss, '#ffe066');
        }
    }

    /* ================================================================
     * 3. 花园 2048
     * ============================================================== */
    const G2048 = [
        null,
        { p: 'peashooter', n: '豌豆', c: '#8fc93a' },
        { p: 'repeater', n: '双发', c: '#74b52c' },
        { p: 'threepeater', n: '三线', c: '#5da227' },
        { p: 'gatling', n: '机枪', c: '#4a8c22' },
        { p: 'melon', n: '西瓜', c: '#3a7a44' },
        { p: 'wintermelon', n: '冰西瓜', c: '#2f6f9c' },
        { p: 'cobcannon', n: '玉米炮', c: '#b8872c' }
    ];
    class Garden2048 extends Base {
        setup() {
            this.N = 4; this.CELL = 104; this.GAP = 12;
            this.bx = 96; this.by = 118;
            this.g = Array.from({ length: 4 }, () => new Array(4).fill(0));
            this.pop = {};
            this.add(); this.add();
            this.best = this.best || 0;
        }
        add() {
            const empty = [];
            for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (!this.g[r][c]) empty.push([r, c]);
            if (!empty.length) return;
            const [r, c] = empty[(Math.random() * empty.length) | 0];
            this.g[r][c] = Math.random() < 0.88 ? 1 : 2;
            this.pop[r + ',' + c] = 0.18;
        }
        slide(dir) {
            if (this.over) return;
            const before = JSON.stringify(this.g);
            const N = 4;
            const line = (arr) => {
                let a = arr.filter(v => v);
                for (let i = 0; i < a.length - 1; i++) {
                    if (a[i] === a[i + 1] && a[i] < 7) {
                        a[i]++; this.score += Math.pow(2, a[i]) * 2;
                        a.splice(i + 1, 1);
                    }
                }
                while (a.length < N) a.push(0);
                return a;
            };
            if (dir === 'left' || dir === 'right') {
                for (let r = 0; r < 4; r++) {
                    let row = this.g[r].slice();
                    if (dir === 'right') row.reverse();
                    row = line(row);
                    if (dir === 'right') row.reverse();
                    this.g[r] = row;
                }
            } else {
                for (let c = 0; c < 4; c++) {
                    let col = [0, 1, 2, 3].map(r => this.g[r][c]);
                    if (dir === 'down') col.reverse();
                    col = line(col);
                    if (dir === 'down') col.reverse();
                    for (let r = 0; r < 4; r++) this.g[r][c] = col[r];
                }
            }
            if (JSON.stringify(this.g) !== before) {
                this.add();
                this.extra = (this.extra || 0) + (Math.random() < 0.3 ? 1 : 0);
                if (this.extra >= 3) { this.extra = 0; this.add(); }
                this.checkEnd();
            }
        }
        checkEnd() {
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
        }
        update(dt) {
            for (const k in this.pop) { this.pop[k] -= dt; if (this.pop[k] <= 0) delete this.pop[k]; }
        }
        onKey(down, k) {
            if (!down) return;
            if (this.over && !this.win) return;
            if (this.win) { this.win = false; this.over = false; }
            if (k === 'left' || k === 'a') this.slide('left');
            else if (k === 'right' || k === 'd') this.slide('right');
            else if (k === 'up' || k === 'w') this.slide('up');
            else if (k === 'down' || k === 's') this.slide('down');
        }
        draw() {
            bgGrass();
            const { CELL, GAP } = this;
            panel(this.bx - 16, this.by - 16, 4 * CELL + 3 * GAP + 32, 4 * CELL + 3 * GAP + 32, 0.55);
            for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
                const x = this.bx + c * (CELL + GAP), y = this.by + r * (CELL + GAP);
                ctx.fillStyle = 'rgba(255,255,255,0.07)'; rr(x, y, CELL, CELL, 12); ctx.fill();
                const v = this.g[r][c];
                if (!v) continue;
                const d = G2048[v];
                const p = this.pop[r + ',' + c] || 0;
                const sc = 1 + Math.max(0, p) * 1.6;
                ctx.save();
                ctx.translate(x + CELL / 2, y + CELL / 2); ctx.scale(sc, sc); ctx.translate(-(x + CELL / 2), -(y + CELL / 2));
                ctx.fillStyle = d.c; rr(x, y, CELL, CELL, 12); ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.18)'; rr(x + 6, y + 6, CELL - 12, 16, 6); ctx.fill();
                spr(d.p, x + 18, y + 8, CELL - 36, CELL - 36);
                txt(d.n, x + CELL / 2, y + CELL - 15, 14, 'rgba(255,255,255,0.95)', 'center', 700);
                ctx.restore();
            }
            const hx = 600;
            txt('花园 2048', hx, 132, 30, '#ffe9a8', 'left', 900);
            txt('GARDEN 2048', hx, 162, 12, 'rgba(255,255,255,0.5)', 'left', 700);
            panel(hx - 10, 186, 250, 96, 0.5);
            txt('分数', hx, 210, 14, 'rgba(255,255,255,0.65)');
            txt(String(this.score), hx, 246, 34, '#ffe066', 'left', 900);
            panel(hx - 10, 296, 250, 210, 0.45);
            txt('合成路线', hx, 320, 14, 'rgba(255,255,255,0.65)');
            for (let i = 1; i <= 7; i++) {
                const d = G2048[i];
                sprH(d.p, hx + 2 + (i - 1) * 34, 338, 26);
                if (i < 7) txt('›', hx + (i - 1) * 34 + 30, 352, 12, 'rgba(255,255,255,0.3)', 'center');
            }
            txt('方向键 / WASD 滑动', hx, 396, 14, '#dff0c4');
            txt('合出「玉米炮」即通关', hx, 424, 14, '#dff0c4');
            txt('同种相邻会融合升级', hx, 452, 14, 'rgba(255,255,255,0.55)');
            if (this.win && this.over) this.overlay('通关！玉米加农炮到手', '分数 ' + this.score + '（可继续刷分）', '#b7f06a');
            else if (this.over) this.overlay('花园塞满了', '分数 ' + this.score, '#ff8f6b');
        }
    }

    /* ================================================================
     * 4. 猫尾草泡泡龙（泡泡射击）
     * ============================================================== */
    const BUB_COLORS = [
        { c: '#5fbf35', p: 'peashooter', n: '豌豆' },
        { c: '#4aa8e0', p: 'snowpea', n: '寒冰' },
        { c: '#9b6ad6', p: 'puffshroom', n: '小喷菇' },
        { c: '#e8c53a', p: 'kernel', n: '玉米' }
    ];
    class Bubble extends Base {
        setup() {
            this.R = 22; this.COLS = 12; this.ROWH = 38; this.TOP = 92;
            this.LEFT = 96;
            this.rows = 13;
            this.g = Array.from({ length: this.rows }, () => new Array(this.COLS).fill(-1));
            for (let r = 0; r < 4; r++) for (let c = 0; c < this.COLS; c++) {
                if (r === 3 && c % 3 === 0) continue;
                this.g[r][c] = (Math.random() * 4) | 0;
            }
            this.shooter = { x: this.LEFT + this.COLS * this.R, y: 556, ang: -Math.PI / 2 };
            this.ball = null; this.next = (Math.random() * 4) | 0; this.cur = (Math.random() * 4) | 0;
            this.pops = []; this.drops = [];
            this.deadline = this.yOf(this.rows - 2);
        }
        cx(r, c) { return this.LEFT + this.R + c * this.R * 2 + (r % 2 ? this.R : 0); }
        yOf(r) { return this.TOP + r * this.ROWH + this.R; }
        neighbors(r, c) {
            const odd = r % 2 === 1;
            return odd
                ? [[r, c - 1], [r, c + 1], [r - 1, c], [r - 1, c + 1], [r + 1, c], [r + 1, c + 1]]
                : [[r, c - 1], [r, c + 1], [r - 1, c - 1], [r - 1, c], [r + 1, c - 1], [r + 1, c]];
        }
        update(dt) {
            if (this.over) return;
            this.pops = this.pops.filter(p => (p.t -= dt) > 0);
            this.drops = this.drops.filter(d => { d.v += 700 * dt; d.y += d.v * dt; return d.y < H + 40; });
            if (!this.ball) return;
            const b = this.ball;
            const steps = Math.ceil((Math.abs(b.vx) + Math.abs(b.vy)) * dt / 6);
            for (let i = 0; i < steps; i++) {
                b.x += b.vx * dt / steps; b.y += b.vy * dt / steps;
                if (b.x < this.LEFT + this.R) { b.x = this.LEFT + this.R; b.vx = Math.abs(b.vx); }
                const right = this.LEFT + this.COLS * this.R * 2;
                if (b.x > right - this.R) { b.x = right - this.R; b.vx = -Math.abs(b.vx); }
                if (b.y < this.TOP + this.R * 0.55) { this.attach(b); return; }
                // 命中已有泡泡
                for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.COLS; c++) {
                    if (this.g[r][c] < 0) continue;
                    const dx = b.x - this.cx(r, c), dy = b.y - this.yOf(r);
                    if (dx * dx + dy * dy < (this.R * 1.82) * (this.R * 1.82)) { this.attach(b); return; }
                }
                if (b.y > H + 40) { this.ball = null; this.nextBall(); return; }
            }
        }
        attach(b) {
            let best = null, bd = 1e9;
            for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.COLS; c++) {
                if (this.g[r][c] >= 0) continue;
                let touchTop = r === 0;
                let touchSib = false;
                for (const [nr, nc] of this.neighbors(r, c)) {
                    if (nr < 0) touchTop = true;
                    else if (this.g[nr] && this.g[nr][nc] >= 0) touchSib = true;
                }
                if (!touchTop && !touchSib) continue;
                const dx = b.x - this.cx(r, c), dy = b.y - this.yOf(r);
                const d = dx * dx + dy * dy;
                if (d < bd) { bd = d; best = [r, c]; }
            }
            if (!best) { this.ball = null; this.nextBall(); return; }
            this.g[best[0]][best[1]] = b.col;
            this.ball = null;
            this.resolve(best[0], best[1]);
            this.nextBall();
        }
        resolve(r0, c0) {
            const col = this.g[r0][c0];
            const seen = new Set([r0 + ',' + c0]);
            const stack = [[r0, c0]];
            while (stack.length) {
                const [r, c] = stack.pop();
                for (const [nr, nc] of this.neighbors(r, c)) {
                    if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.COLS) continue;
                    if (this.g[nr][nc] !== col) continue;
                    const key = nr + ',' + nc;
                    if (seen.has(key)) continue;
                    seen.add(key); stack.push([nr, nc]);
                }
            }
            if (seen.size >= 3) {
                seen.forEach(k => {
                    const [r, c] = k.split(',').map(Number);
                    this.pops.push({ x: this.cx(r, c), y: this.yOf(r), t: 0.32, c: col });
                    this.g[r][c] = -1;
                });
                this.score += seen.size * 10;
                // 掉落悬空
                const keep = new Set();
                const q = [];
                for (let c = 0; c < this.COLS; c++) if (this.g[0][c] >= 0) { keep.add('0,' + c); q.push([0, c]); }
                while (q.length) {
                    const [r, c] = q.pop();
                    for (const [nr, nc] of this.neighbors(r, c)) {
                        if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.COLS) continue;
                        if (this.g[nr][nc] < 0) continue;
                        const k = nr + ',' + nc;
                        if (keep.has(k)) continue;
                        keep.add(k); q.push([nr, nc]);
                    }
                }
                for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.COLS; c++) {
                    if (this.g[r][c] >= 0 && !keep.has(r + ',' + c)) {
                        this.drops.push({ x: this.cx(r, c), y: this.yOf(r), v: 60, c: this.g[r][c] });
                        this.score += 15;
                        this.g[r][c] = -1;
                    }
                }
            }
            // 判负
            for (let r = this.rows - 1; r >= 0; r--) {
                if (this.g[r].some(v => v >= 0)) {
                    if (this.yOf(r) + this.R >= this.shooter.y - 24) this.end(false);
                    break;
                }
            }
        }
        nextBall() {
            this.cur = this.next;
            this.next = (Math.random() * 4) | 0;
        }
        shoot() {
            if (this.ball || this.over) return;
            const a = this.shooter.ang, sp = 760;
            this.ball = { x: this.shooter.x, y: this.shooter.y - 34, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, col: this.cur };
            this.score -= 0;
        }
        onDown(x, y) {
            if (this.over) return;
            this.shooter.ang = Math.atan2(y - this.shooter.y, x - this.shooter.x);
            const lim = 1.32;
            this.shooter.ang = Math.max(-Math.PI + lim, Math.min(-lim, this.shooter.ang));
            this.shoot();
        }
        onMove(x, y) {
            if (this.over) return;
            this.shooter.ang = Math.atan2(y - this.shooter.y, x - this.shooter.x);
            const lim = 1.32;
            this.shooter.ang = Math.max(-Math.PI + lim, Math.min(-lim, this.shooter.ang));
        }
        onKey(down, k) {
            if (!down || this.over) return;
            const step = 0.09;
            if (k === 'left' || k === 'a') this.shooter.ang = Math.max(-Math.PI + 1.32, this.shooter.ang - step);
            if (k === 'right' || k === 'd') this.shooter.ang = Math.min(-1.32, this.shooter.ang + step);
            if (k === 'space' || k === 'up') this.shoot();
        }
        draw() {
            const g = ctx.createLinearGradient(0, 0, 0, H);
            g.addColorStop(0, '#1d3557'); g.addColorStop(1, '#0d1b2a');
            ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
            const rx = this.LEFT, rw = this.COLS * this.R * 2;
            ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fillRect(rx, this.TOP, rw, H - this.TOP - 40);
            ctx.strokeStyle = 'rgba(255,120,120,0.5)'; ctx.setLineDash([8, 8]); ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(rx, this.shooter.y - 24); ctx.lineTo(rx + rw, this.shooter.y - 24); ctx.stroke();
            ctx.setLineDash([]);
            for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.COLS; c++) {
                const v = this.g[r][c]; if (v < 0) continue;
                this.bub(this.cx(r, c), this.yOf(r), v);
            }
            for (const p of this.pops) {
                ctx.globalAlpha = Math.max(0, p.t / 0.32);
                ctx.fillStyle = BUB_COLORS[p.c].c;
                ctx.beginPath(); ctx.arc(p.x, p.y, this.R * (1.6 - p.t), 0, Math.PI * 2); ctx.fill();
                ctx.globalAlpha = 1;
            }
            for (const d of this.drops) this.bub(d.x, d.y, d.c);
            if (this.ball) this.bub(this.ball.x, this.ball.y, this.ball.col);
            // 猫尾草炮台
            sprH('cattail', this.shooter.x - 34, this.shooter.y - 26, 62);
            ctx.save();
            ctx.translate(this.shooter.x, this.shooter.y - 20); ctx.rotate(this.shooter.ang + Math.PI / 2);
            ctx.fillStyle = '#c9e08a'; rr(-7, -64, 14, 60, 7); ctx.fill();
            ctx.restore();
            this.bub(this.shooter.x + Math.cos(this.shooter.ang) * 70, this.shooter.y - 20 + Math.sin(this.shooter.ang) * 70, this.cur, 0.75);
            // HUD
            const hx = 690;
            txt('猫尾草泡泡龙', hx, 132, 27, '#ffe9a8', 'left', 900);
            txt('CATTAIL BUBBLE', hx, 160, 11, 'rgba(255,255,255,0.45)', 'left', 700);
            panel(hx - 10, 180, 190, 92, 0.6);
            txt('分数', hx, 202, 13, 'rgba(255,255,255,0.6)');
            txt(String(this.score), hx, 240, 32, '#ffe066', 'left', 900);
            panel(hx - 10, 286, 190, 110, 0.5);
            txt('下一颗', hx, 306, 13, 'rgba(255,255,255,0.6)');
            this.bub(hx + 30, 348, this.next);
            txt(BUB_COLORS[this.next].n, hx + 66, 348, 15, '#dfe9f5');
            txt('鼠标瞄准 · 点击发射', hx, 428, 12.5, 'rgba(255,255,255,0.6)');
            txt('同色 ≥3 爆破', hx, 452, 12.5, 'rgba(255,255,255,0.6)');
            txt('顶到红线就输', hx, 476, 12.5, 'rgba(255,255,255,0.6)');
            if (this.over) this.overlay('泡泡堆到炮口了', '分数 ' + this.score, '#ff8f6b');
        }
        bub(x, y, col, a) {
            const c = BUB_COLORS[col];
            ctx.globalAlpha = a == null ? 1 : a;
            const g = ctx.createRadialGradient(x - 7, y - 9, 2, x, y, this.R);
            g.addColorStop(0, 'rgba(255,255,255,0.95)');
            g.addColorStop(0.34, c.c);
            g.addColorStop(1, 'rgba(20,26,34,0.55)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(x, y, this.R, 0, Math.PI * 2); ctx.fill();
            spr(c.p, x - this.R * 0.52, y - this.R * 0.52, this.R * 1.04, this.R * 1.04, 0.92);
            ctx.strokeStyle = 'rgba(255,255,255,0.32)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(x, y, this.R - 1, 0, Math.PI * 2); ctx.stroke();
            ctx.globalAlpha = 1;
        }
    }

    /* ================================================================
     * 5. 豌豆弹球（打砖块）
     * ============================================================== */
    class Breakout extends Base {
        setup() {
            this.px = 450; this.pw = 118; this.ph = 16; this.py = 546;
            this.ball = { x: 450, y: 470, vx: 250, vy: -330, r: 9, stuck: true };
            this.lives = 3; this.slow = 0; this.extra = 1;
            this.bricks = [];
            const cols = 8, bw = 84, bh = 26, gx = 4, gy = 6, x0 = 112, y0 = 118;
            for (let r = 0; r < 5; r++) for (let c = 0; c < cols; c++) {
                const type = r === 4 ? 'nut' : (r <= 1 ? 'bucket' : 'grave');
                this.bricks.push({
                    x: x0 + c * (bw + gx), y: y0 + r * (bh + gy), w: bw, h: bh,
                    type, hp: type === 'bucket' ? 3 : type === 'grave' ? 1 : Infinity
                });
            }
            this.drops = [];
            this.msg = '';
        }
        update(dt) {
            if (this.over) return;
            if (this.slow > 0) this.slow -= dt;
            if (this.msgT > 0) this.msgT -= dt;
            const b = this.ball;
            b.y -= 0;
            const sp = this.slow > 0 ? 0.55 : 1;
            if (b.stuck) { b.x = this.px; b.y = this.py - 20; }
            else {
                const steps = Math.ceil(Math.hypot(b.vx, b.vy) * dt * sp / 5) || 1;
                for (let i = 0; i < steps; i++) {
                    b.x += b.vx * dt * sp / steps; b.y += b.vy * dt * sp / steps;
                    if (b.x < 60 + b.r) { b.x = 60 + b.r; b.vx = Math.abs(b.vx); }
                    if (b.x > 840 - b.r) { b.x = 840 - b.r; b.vx = -Math.abs(b.vx); }
                    if (b.y < 86 + b.r) { b.y = 86 + b.r; b.vy = Math.abs(b.vy); }
                    // 挡板
                    if (b.y > this.py - b.r && b.y < this.py + this.ph && b.x > this.px - this.pw / 2 - 6 && b.x < this.px + this.pw / 2 + 6 && b.vy > 0) {
                        const off = (b.x - this.px) / (this.pw / 2);
                        const ang = off * 1.05;
                        const speed = Math.min(620, Math.hypot(b.vx, b.vy) * 1.015);
                        b.vx = Math.sin(ang) * speed; b.vy = -Math.abs(Math.cos(ang) * speed);
                        b.y = this.py - b.r - 1;
                    }
                    // 砖块
                    for (const k of this.bricks) {
                        if (k.hp <= 0 || k.type === 'nut') {
                            if (k.type === 'nut' && b.x > k.x - b.r && b.x < k.x + k.w + b.r && b.y > k.y - b.r && b.y < k.y + k.h + b.r) {
                                if (b.vx > 0 && b.x < k.x) b.vx = -Math.abs(b.vx);
                                else if (b.vx < 0 && b.x > k.x + k.w) b.vx = Math.abs(b.vx);
                                else b.vy = -b.vy;
                            }
                            continue;
                        }
                        if (b.x > k.x - b.r && b.x < k.x + k.w + b.r && b.y > k.y - b.r && b.y < k.y + k.h + b.r) {
                            // 判定从哪边撞
                            const ox = Math.min(Math.abs(b.x - (k.x - b.r)), Math.abs(b.x - (k.x + k.w + b.r)));
                            const oy = Math.min(Math.abs(b.y - (k.y - b.r)), Math.abs(b.y - (k.y + k.h + b.r)));
                            if (ox < oy) b.vx = -b.vx; else b.vy = -b.vy;
                            k.hp--;
                            this.score += k.type === 'bucket' ? 30 : 10;
                            if (k.hp <= 0 && Math.random() < 0.22) {
                                const t = ['chili', 'ice', 'tri'][(Math.random() * 3) | 0];
                                this.drops.push({ x: k.x + k.w / 2, y: k.y + k.h / 2, t, v: 120 });
                            }
                            break;
                        }
                    }
                    if (b.y > H + 30) { this.loseLife(); return; }
                }
            }
            // 道具
            this.drops = this.drops.filter(d => {
                d.v += 180 * dt; d.y += d.v * dt;
                if (d.y > this.py - 16 && d.y < this.py + 18 && Math.abs(d.x - this.px) < this.pw / 2 + 14) {
                    this.grab(d.t); return false;
                }
                return d.y < H + 30;
            });
            if (this.bricks.filter(k => k.hp > 0 && k.type !== 'nut').length === 0) this.end(true);
        }
        grab(t) {
            if (t === 'chili') {
                let n = 0;
                this.bricks.forEach(k => { if (k.hp > 0 && k.hp < 99) { k.hp = 0; n++; } });
                this.score += n * 8; this.msg = '辣椒清屏 · +' + n * 8;
            } else if (t === 'ice') { this.slow = 6; this.msg = '寒冰减速 6 秒'; }
            else {
                this.extra = Math.min(4, this.extra + 1);
                this.msg = '三线射手 · 球数 +1';
            }
            this.msgT = 1.4;
        }
        loseLife() {
            this.lives--;
            if (this.lives <= 0) { this.end(false); return; }
            this.ball = { x: this.px, y: 470, vx: 250, vy: -330, r: 9, stuck: true };
        }
        onDown() { if (this.ball.stuck && !this.over) this.ball.stuck = false; }
        onMove(x) { this.px = Math.max(60 + this.pw / 2, Math.min(840 - this.pw / 2, x)); }
        onKey(down, k) {
            if (!down || this.over) return;
            if (k === 'left' || k === 'a') this.px = Math.max(60 + this.pw / 2, this.px - 46);
            if (k === 'right' || k === 'd') this.px = Math.min(840 - this.pw / 2, this.px + 46);
            if (k === 'space' && this.ball.stuck) this.ball.stuck = false;
        }
        draw() {
            const g = ctx.createLinearGradient(0, 0, 0, H);
            g.addColorStop(0, '#10233a'); g.addColorStop(1, '#1d3f2a');
            ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
            txt('豌豆弹球', 450, 62, 24, '#ffe9a8', 'center', 900);
            for (const k of this.bricks) {
                if (k.hp <= 0 && k.type !== 'nut') continue;
                if (k.type === 'nut') {
                    ctx.fillStyle = '#7a5a2e'; rr(k.x, k.y, k.w, k.h, 8); ctx.fill();
                    ctx.strokeStyle = 'rgba(255,230,180,0.35)'; ctx.lineWidth = 2; ctx.stroke();
                    spr('wallnut', k.x + k.w / 2 - 13, k.y + 1, 26, 24);
                } else if (k.type === 'bucket') {
                    ctx.fillStyle = k.hp === 3 ? '#7d8a94' : k.hp === 2 ? '#99a3aa' : '#b9c1c6';
                    rr(k.x, k.y, k.w, k.h, 6); ctx.fill();
                    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.stroke();
                } else {
                    ctx.fillStyle = '#5d6152'; rr(k.x, k.y, k.w, k.h, 6); ctx.fill();
                    ctx.fillStyle = 'rgba(255,255,255,0.12)'; rr(k.x + 4, k.y + 4, k.w - 8, 8, 4); ctx.fill();
                }
            }
            // 挡板：睡莲叶
            spr('lilypad', this.px - this.pw / 2 - 10, this.py - 12, this.pw + 20, 40);
            // 球
            const b = this.ball;
            ctx.fillStyle = '#9ce34a';
            ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.beginPath(); ctx.arc(b.x - 3, b.y - 3, 3, 0, Math.PI * 2); ctx.fill();
            for (const d of this.drops) {
                const col = d.t === 'chili' ? '#e04a2a' : d.t === 'ice' ? '#5ac8f0' : '#e8d24a';
                ctx.fillStyle = col; ctx.beginPath(); ctx.arc(d.x, d.y, 11, 0, Math.PI * 2); ctx.fill();
                txt(d.t === 'chili' ? '辣' : d.t === 'ice' ? '冰' : '三', d.x, d.y + 1, 12, '#fff', 'center', 900);
            }
            txt('生命 ' + Math.max(0, this.lives), 78, 574, 17, '#ff8f6b', 'left', 800);
            txt('分数 ' + this.score, 450, 574, 17, '#ffe9a8', 'center', 700);
            txt(this.slow > 0 ? '寒冰减速 ' + this.slow.toFixed(1) + 's' : '', 820, 574, 14, '#7fd8ff', 'right', 700);
            if (this.msgT > 0) txt(this.msg, 450, 500, 18, '#ffe066', 'center', 800);
            if (this.ball.stuck && !this.over) txt('点击 / 空格 发球', 450, 500, 17, 'rgba(255,255,255,0.75)', 'center', 700);
            if (this.over) this.overlay(this.lives <= 0 ? '防线被突破了' : '全部清空！', '分数 ' + this.score, this.lives <= 0 ? '#ff8f6b' : '#b7f06a');
        }
    }

    /* ================================================================
     * 6. 植物消消乐（三消）
     * ============================================================== */
    const M3 = [
        { p: 'peashooter', c: '#79c23a' },
        { p: 'sunflower', c: '#e8c53a' },
        { p: 'wallnut', c: '#c79a58' },
        { p: 'snowpea', c: '#4aa8e0' },
        { p: 'cherry', c: '#cf4130' }
    ];
    class Match3 extends Base {
        setup() {
            this.N = 7; this.CELL = 58; this.GAP = 4;
            this.bx = 176; this.by = 128;
            this.g = Array.from({ length: 7 }, () => new Array(7).fill(0));
            for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) {
                let v; let guard = 0;
                do { v = (Math.random() * 5) | 0; guard++; } while (guard < 30 && this.badAt(r, c, v));
                this.g[r][c] = v;
            }
            this.sel = null; this.time = 90; this.moves = 0; this.flash = [];
            this.busy = 0;
        }
        badAt(r, c, v) {
            if (c >= 2 && this.g[r][c - 1] === v && this.g[r][c - 2] === v) return true;
            if (r >= 2 && this.g[r - 1][c] === v && this.g[r - 2][c] === v) return true;
            return false;
        }
        cellAt(x, y) {
            const dc = Math.floor((x - this.bx) / (this.CELL + this.GAP));
            const dr = Math.floor((y - this.by) / (this.CELL + this.GAP));
            if (dc < 0 || dc > 6 || dr < 0 || dr > 6) return null;
            return [dr, dc];
        }
        update(dt) {
            if (this.over) return;
            this.time -= dt;
            if (this.time <= 0) { this.time = 0; this.end(true); }
            this.flash = this.flash.filter(f => (f.t -= dt) > 0);
            if (this.busy > 0) this.busy -= dt;
        }
        onDown(x, y) {
            if (this.over || this.busy > 0) return;
            const p = this.cellAt(x, y);
            if (!p) return;
            if (!this.sel) { this.sel = p; return; }
            const [r0, c0] = this.sel, [r1, c1] = p;
            if (r0 === r1 && c0 === c1) { this.sel = null; return; }
            if (Math.abs(r0 - r1) + Math.abs(c0 - c1) !== 1) { this.sel = p; return; }
            this.sel = null;
            this.swap(r0, c0, r1, c1);
        }
        swap(r0, c0, r1, c1) {
            const t = this.g[r0][c0]; this.g[r0][c0] = this.g[r1][c1]; this.g[r1][c1] = t;
            const runs = this.findRuns();          // 返回 Set，判空必须用 size（length 恒 undefined → 每次交换都被还原）
            if (!runs.size) { const q = this.g[r0][c0]; this.g[r0][c0] = this.g[r1][c1]; this.g[r1][c1] = q; return; }
            this.moves++;
            this.busy = 0.16;
            this.resolve();
        }
        findRuns() {
            const marks = new Set();
            for (let r = 0; r < 7; r++) {
                let run = 1;
                for (let c = 1; c <= 7; c++) {
                    if (c < 7 && this.g[r][c] === this.g[r][c - 1] && this.g[r][c] >= 0) run++;
                    else {
                        if (run >= 3) for (let i = 1; i <= run; i++) marks.add(r + ',' + (c - i));
                        run = 1;
                    }
                }
            }
            for (let c = 0; c < 7; c++) {
                let run = 1;
                for (let r = 1; r <= 7; r++) {
                    if (r < 7 && this.g[r][c] === this.g[r - 1][c] && this.g[r][c] >= 0) run++;
                    else {
                        if (run >= 3) for (let i = 1; i <= run; i++) marks.add((r - i) + ',' + c);
                        run = 1;
                    }
                }
            }
            return marks;
        }
        resolve() {
            let chain = 0;
            while (true) {
                const marks = this.findRuns();
                if (!marks.size) break;
                chain++;
                const gain = marks.size * 10 * chain;
                this.score += gain;
                marks.forEach(k => {
                    const [r, c] = k.split(',').map(Number);
                    this.flash.push({ r, c, t: 0.3, p: M3[this.g[r][c]].p });
                    this.g[r][c] = -1;
                });
                // 重力
                for (let c = 0; c < 7; c++) {
                    const col = [];
                    for (let r = 6; r >= 0; r--) if (this.g[r][c] >= 0) col.push(this.g[r][c]);
                    for (let r = 6; r >= 0; r--) this.g[r][c] = col[6 - r] != null ? col[6 - r] : (Math.random() * 5) | 0;
                }
            }
        }
        draw() {
            bgGrass();
            panel(this.bx - 14, this.by - 14, 7 * (this.CELL + this.GAP) + 14, 7 * (this.CELL + this.GAP) + 14, 0.45);
            for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) {
                const x = this.bx + c * (this.CELL + this.GAP), y = this.by + r * (this.CELL + this.GAP);
                ctx.fillStyle = 'rgba(255,255,255,0.06)'; rr(x, y, this.CELL, this.CELL, 10); ctx.fill();
                const v = this.g[r][c]; if (v < 0) continue;
                ctx.fillStyle = M3[v].c; rr(x + 1, y + 1, this.CELL - 2, this.CELL - 2, 10); ctx.fill();
                spr(M3[v].p, x + 6, y + 6, this.CELL - 12, this.CELL - 12);
                if (this.sel && this.sel[0] === r && this.sel[1] === c) {
                    ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 3; rr(x + 1, y + 1, this.CELL - 2, this.CELL - 2, 10); ctx.stroke();
                }
            }
            for (const f of this.flash) {
                const x = this.bx + f.c * (this.CELL + this.GAP), y = this.by + f.r * (this.CELL + this.GAP);
                ctx.globalAlpha = Math.max(0, f.t / 0.3);
                ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + this.CELL / 2, y + this.CELL / 2, this.CELL * 0.6 * (1 - f.t / 0.3), 0, Math.PI * 2); ctx.fill();
                ctx.globalAlpha = 1;
            }
            const hx = 620;
            txt('植物消消乐', hx, 140, 28, '#ffe9a8', 'left', 900);
            txt('PLANT MATCH', hx, 168, 11, 'rgba(255,255,255,0.45)', 'left', 700);
            panel(hx - 10, 190, 220, 92, 0.5);
            txt('分数', hx, 214, 13, 'rgba(255,255,255,0.6)');
            txt(String(this.score), hx, 250, 32, '#ffe066', 'left', 900);
            panel(hx - 10, 294, 220, 76, 0.5);
            txt('时间', hx, 318, 13, 'rgba(255,255,255,0.6)');
            txt(Math.ceil(this.time) + 's', hx, 348, 26, this.time < 15 ? '#ff7a5a' : '#b7f06a', 'left', 900);
            panel(hx - 10, 382, 220, 130, 0.42);
            txt('点两个相邻植物交换', hx, 406, 13, '#dff0c4');
            txt('三连即消 · 连锁加倍', hx, 432, 13, '#dff0c4');
            txt('4 连会清更多', hx, 458, 13, 'rgba(255,255,255,0.55)');
            if (this.over) this.overlay('时间到！', '分数 ' + this.score + ' · 步数 ' + this.moves, '#ffe066');
        }
    }

    /* ================================================================
     * 7. 寒冰推箱（推箱子）
     * ============================================================== */
    const LEVELS = [
        ['#######', '#     #', '# @$ .#', '#     #', '#######'],
        ['#########', '#       #', '# @$ .  #', '#       #', '#  $ .  #', '#       #', '#########'],
        ['##########', '#        #', '# @$ .$ .#', '#   ##   #', '#  $  .  #', '#        #', '##########'],
        ['##########', '#        #', '#  .  $  #', '#  #  #  #', '#  $  .  #', '#        #', '##########'],
        ['##########', '#        #', '# $  . . #', '#  ##    #', '#  $  $  #', '#   @    #', '##########'],
        ['###########', '#         #', '#  $ . .  #', '#  # # #  #', '#  $ . $  #', '#    @    #', '###########']
    ];
    class Sokoban extends Base {
        setup() {
            this.idx = 0;
            this.load(0);
        }
        load(i) {
            this.idx = i;
            const raw = LEVELS[i];
            this.h = raw.length; this.w = Math.max.apply(null, raw.map(r => r.length));
            this.wall = []; this.target = []; this.box = [];
            this.px = 0; this.py = 0; this.steps = 0;
            for (let r = 0; r < this.h; r++) {
                this.wall.push([]); this.target.push([]); this.box.push([]);
                for (let c = 0; c < this.w; c++) {
                    const ch = raw[r][c] || ' ';
                    this.wall[r][c] = ch === '#';
                    this.target[r][c] = ch === '.' || ch === '*' || ch === '+';
                    this.box[r][c] = ch === '$' || ch === '*';
                    if (ch === '@' || ch === '+') { this.px = c; this.py = r; }
                }
            }
            this.tile = Math.min(52, Math.floor(520 / this.w), Math.floor(440 / this.h));
        }
        done() {
            for (let r = 0; r < this.h; r++) for (let c = 0; c < this.w; c++) if (this.target[r][c] && !this.box[r][c]) return false;
            return true;
        }
        move(dx, dy) {
            if (this.over) return;
            const nx = this.px + dx, ny = this.py + dy;
            if (nx < 0 || ny < 0 || nx >= this.w || ny >= this.h) return;
            if (this.wall[ny][nx]) return;
            if (this.box[ny][nx]) {
                const bx = nx + dx, by = ny + dy;
                if (bx < 0 || by < 0 || bx >= this.w || by >= this.h) return;
                if (this.wall[by][bx] || this.box[by][bx]) return;
                this.box[ny][nx] = false; this.box[by][bx] = true;
            }
            this.px = nx; this.py = ny; this.steps++;
            if (this.done()) {
                this.score += Math.max(50, 400 - this.steps * 4);
                this.winLevel = true;
                this.over = true; this.win = true; this.overT = 0;
            }
        }
        onKey(down, k) {
            if (!down) return;
            if (this.over) return;
            if (k === 'left' || k === 'a') this.move(-1, 0);
            else if (k === 'right' || k === 'd') this.move(1, 0);
            else if (k === 'up' || k === 'w') this.move(0, -1);
            else if (k === 'down' || k === 's') this.move(0, 1);
        }
        draw() {
            const g = ctx.createLinearGradient(0, 0, 0, H);
            g.addColorStop(0, '#16324a'); g.addColorStop(1, '#0d1f2e');
            ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
            const t = this.tile;
            const ox = (W - this.w * t) / 2 + 60, oy = (H - this.h * t) / 2 + 18;
            for (let r = 0; r < this.h; r++) for (let c = 0; c < this.w; c++) {
                const x = ox + c * t, y = oy + r * t;
                if (this.wall[r][c]) {
                    ctx.fillStyle = '#4a3a22'; rr(x + 1, y + 1, t - 2, t - 2, 6); ctx.fill();
                    ctx.fillStyle = 'rgba(160,130,70,0.35)'; rr(x + 4, y + 4, t - 8, t * 0.3, 4); ctx.fill();
                } else {
                    ctx.fillStyle = 'rgba(255,255,255,0.05)'; rr(x + 1, y + 1, t - 2, t - 2, 6); ctx.fill();
                    if (this.target[r][c]) {
                        ctx.strokeStyle = this.box[r][c] ? '#7dffb0' : 'rgba(120,255,180,0.55)';
                        ctx.lineWidth = 2.5; ctx.setLineDash([5, 4]);
                        ctx.strokeRect(x + t * 0.2, y + t * 0.2, t * 0.6, t * 0.6); ctx.setLineDash([]);
                    }
                }
                if (this.box[r][c]) {
                    const cx = x + t / 2, cy = y + t / 2, s = t * 0.72;
                    ctx.fillStyle = 'rgba(140,225,255,0.9)'; rr(cx - s / 2, cy - s / 2, s, s, 8); ctx.fill();
                    ctx.fillStyle = 'rgba(255,255,255,0.75)'; rr(cx - s / 2 + 5, cy - s / 2 + 5, s * 0.36, s * 0.22, 4); ctx.fill();
                    ctx.strokeStyle = 'rgba(70,150,190,0.8)'; ctx.lineWidth = 2; rr(cx - s / 2, cy - s / 2, s, s, 8); ctx.stroke();
                }
            }
            // 豌豆射手当主角
            sprH('peashooter', ox + this.px * t + t * 0.1, oy + this.py * t + t * 0.08, t * 0.84);
            // HUD
            txt('寒冰推箱', 60, 62, 24, '#ffe9a8', 'left', 900);
            txt('第 ' + (this.idx + 1) + ' / ' + LEVELS.length + ' 关', 60, 90, 14, 'rgba(255,255,255,0.6)');
            txt('步数 ' + this.steps, 60, 114, 14, 'rgba(255,255,255,0.6)');
            txt('分数 ' + this.score, 60, 138, 14, 'rgba(255,255,255,0.6)');
            txt('方向键 / WASD 推冰块', 60, 512, 13, 'rgba(255,255,255,0.55)');
            txt('把每块冰推上绿圈', 60, 536, 13, 'rgba(255,255,255,0.55)');
            txt('R 重来本关 · ESC 回大厅', 60, 560, 13, 'rgba(255,255,255,0.4)');
            if (this.over && this.win) {
                ctx.fillStyle = 'rgba(6,14,5,0.7)'; ctx.fillRect(0, 0, W, H);
                txt('过关！用了 ' + this.steps + ' 步', W / 2, H / 2 - 30, 40, '#b7f06a', 'center', 900);
                txt(this.idx + 1 < LEVELS.length ? '按 N 或点击进入下一关' : '全部关卡完成！点击从第 1 关重来', W / 2, H / 2 + 26, 20, '#e8f5cf', 'center', 600);
            }
        }
    }

    /* ================================================================
     * 8. 豌豆射击场（打飞靶）
     * ============================================================== */
    class DuckHunt extends Base {
        setup() {
            this.round = 1; this.maxRound = 3; this.shots = 10; this.roundScore = 0;
            this.targets = []; this.sx = 450; this.sy = 300; this.wave = 0; this.spawnT = 0.4;
            this.hits = 0; this.fired = 0; this.msg = ''; this.msgT = 0;
        }
        spawn() {
            const high = Math.random() < 0.45;
            const dir = Math.random() < 0.5 ? 1 : -1;
            const sp = 95 + Math.random() * 55 + this.round * 18;
            this.targets.push({
                x: dir > 0 ? -70 : W + 70,
                y: high ? 130 + Math.random() * 60 : 250 + Math.random() * 120,
                vx: dir * sp, life: 9, high,
                bob: Math.random() * 6.28
            });
        }
        update(dt) {
            if (this.over) return;
            if (this.msgT > 0) this.msgT -= dt;
            if (this.shots <= 0) {
                if (this.targets.length === 0) {
                    if (this.round >= this.maxRound) { this.end(this.score > 0); return; }
                    this.round++; this.shots = 10; this.score += 0;
                }
                return;
            }
            this.spawnT -= dt;
            if (this.spawnT <= 0 && this.targets.length < 3) { this.spawn(); this.spawnT = 0.8 + Math.random() * 0.7; }
            this.targets = this.targets.filter(t => {
                t.x += t.vx * dt; t.bob += dt * 3; t.life -= dt;
                return t.life > 0 && t.x > -120 && t.x < W + 120;
            });
        }
        onDown(x, y) {
            if (this.over) return;
            this.sx = x; this.sy = y;
            if (this.shots <= 0) return;
            this.shots--; this.fired++;
            let hit = null;
            for (const t of this.targets) {
                if (Math.abs(t.x - x) < 52 && Math.abs(t.y - y) < 72) { hit = t; break; }
            }
            if (hit) {
                this.targets = this.targets.filter(t => t !== hit);
                const pts = Math.round((hit.high ? 120 : 70) + (this.round - 1) * 10);
                this.score += pts; this.hits++;
                this.msg = '+' + pts + (hit.high ? ' 高空气球！' : ''); this.msgT = 0.9;
            } else {
                this.msg = '打偏了'; this.msgT = 0.7;
            }
        }
        onMove(x, y) { this.sx = x; this.sy = y; }
        onKey(down, k) {
            if (!down || this.over) return;
            if (k === 'space') this.onDown(this.sx, this.sy);
            if (k === 'left') this.sx = Math.max(20, this.sx - 30);
            if (k === 'right') this.sx = Math.min(W - 20, this.sx + 30);
            if (k === 'up') this.sy = Math.max(20, this.sy - 26);
            if (k === 'down') this.sy = Math.min(H - 20, this.sy + 26);
        }
        draw() {
            const g = ctx.createLinearGradient(0, 0, 0, H);
            g.addColorStop(0, '#1c3b63'); g.addColorStop(0.6, '#2f5f7a'); g.addColorStop(1, '#152b1c');
            ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = 'rgba(255,255,255,0.05)';
            for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(120 + i * 180, 90 + (i % 2) * 26, 58, 0, Math.PI * 2); ctx.fill(); }
            for (const t of this.targets) {
                const y = t.y + Math.sin(t.bob) * 7;
                const im = _im.balloon;
                const h = 112, w = im && im.naturalWidth ? h * im.naturalWidth / im.naturalHeight : h * 0.8;
                spr('balloon', t.x - w / 2, y - h / 2, w, h, Math.min(1, t.life));
            }
            txt('豌豆射击场', 450, 54, 22, '#ffe9a8', 'center', 900);
            txt('第 ' + this.round + ' / ' + this.maxRound + ' 轮', 78, 54, 15, 'rgba(255,255,255,0.75)', 'left', 700);
            txt('分数 ' + this.score, 822, 54, 17, '#ffe066', 'right', 800);
            txt('子弹 ' + this.shots, 822, 80, 13, this.shots > 0 ? 'rgba(255,255,255,0.6)' : '#ff8f6b', 'right', 700);
            // 准星
            ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.arc(this.sx, this.sy, 22, 0, Math.PI * 2); ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(this.sx - 32, this.sy); ctx.lineTo(this.sx - 10, this.sy);
            ctx.moveTo(this.sx + 10, this.sy); ctx.lineTo(this.sx + 32, this.sy);
            ctx.moveTo(this.sx, this.sy - 32); ctx.lineTo(this.sx, this.sy - 10);
            ctx.moveTo(this.sx, this.sy + 10); ctx.lineTo(this.sx, this.sy + 32);
            ctx.stroke();
            ctx.fillStyle = 'rgba(255,224,102,0.9)';
            ctx.beginPath(); ctx.arc(this.sx, this.sy, 2.5, 0, Math.PI * 2); ctx.fill();
            if (this.msgT > 0) txt(this.msg, 450, 500, 22, this.msg[0] === '+' ? '#b7f06a' : '#ff9a7a', 'center', 900);
            if (this.shots <= 0) txt('本轮结束…', 450, 540, 18, 'rgba(255,255,255,0.7)', 'center', 700);
            if (this.over) this.overlay('射击结束', '命中 ' + this.hits + ' / ' + this.fired + ' · 分数 ' + this.score, '#ffe066');
        }
    }

    /* ================================================================
     * 9. 花园连连看（记忆配对）
     * ============================================================== */
    const MEM_PAIRS = ['peashooter', 'sunflower', 'wallnut', 'snowpea', 'cherry', 'tallnut', 'melon', 'torchwood'];
    class Memory extends Base {
        setup() {
            const pool = MEM_PAIRS.slice(0, 8).concat(MEM_PAIRS.slice(0, 8));
            for (let i = pool.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
            this.cards = pool.map(k => ({ k, up: false, done: false }));
            this.sel = []; this.lock = 0; this.moves = 0; this.time = 0; this.matched = 0;
        }
        pos(i) {
            const r = Math.floor(i / 4), c = i % 4;
            return { x: 258 + c * 100, y: 130 + r * 100, s: 88 };
        }
        update(dt) {
            if (this.over) return;
            this.time += dt;
            if (this.lock > 0) {
                this.lock -= dt;
                if (this.lock <= 0) {
                    this.sel.forEach(i => { if (!this.cards[i].done) this.cards[i].up = false; });
                    this.sel = [];
                }
            }
        }
        onDown(x, y) {
            if (this.over || this.lock > 0) return;
            for (let i = 0; i < this.cards.length; i++) {
                const p = this.pos(i);
                if (x < p.x || x > p.x + p.s || y < p.y || y > p.y + p.s) continue;
                const cd = this.cards[i];
                if (cd.up || cd.done) return;
                cd.up = true; this.sel.push(i);
                if (this.sel.length === 2) {
                    this.moves++;
                    const [a, b] = this.sel;
                    if (this.cards[a].k === this.cards[b].k) {
                        this.cards[a].done = this.cards[b].done = true;
                        this.matched++; this.score += 100; this.sel = [];
                        if (this.matched === 8) { this.end(true); }
                    } else {
                        this.score = Math.max(0, this.score - 10);
                        this.lock = 0.75;
                    }
                }
                return;
            }
        }
        draw() {
            bgGrass();
            const g = ctx.createLinearGradient(0, 100, 0, 560);
            g.addColorStop(0, 'rgba(20,40,14,0.2)'); g.addColorStop(1, 'rgba(20,40,14,0.45)');
            ctx.fillStyle = g; ctx.fillRect(248, 120, 404, 404);
            for (let i = 0; i < this.cards.length; i++) {
                const p = this.pos(i), cd = this.cards[i];
                ctx.save();
                ctx.translate(p.x + p.s / 2, p.y + p.s / 2);
                if (cd.done) ctx.globalAlpha = 0.42;
                if (cd.up || cd.done) {
                    ctx.fillStyle = '#f3e6c0'; rr(-p.s / 2, -p.s / 2, p.s, p.s, 12); ctx.fill();
                    ctx.strokeStyle = '#8a6a2f'; ctx.lineWidth = 3; rr(-p.s / 2, -p.s / 2, p.s, p.s, 12); ctx.stroke();
                    spr(cd.k, -p.s / 2 + 10, -p.s / 2 + 8, p.s - 20, p.s - 20);
                } else {
                    ctx.fillStyle = '#6b4a22'; rr(-p.s / 2, -p.s / 2, p.s, p.s, 12); ctx.fill();
                    ctx.fillStyle = '#8a6230'; rr(-p.s / 2 + 6, -p.s / 2 + 6, p.s - 12, p.s - 12, 9); ctx.fill();
                    txt('?', 0, 2, 34, 'rgba(255,235,190,0.8)', 'center', 900);
                }
                ctx.restore();
            }
            txt('花园连连看', 450, 62, 24, '#ffe9a8', 'center', 900);
            txt('配对 ' + this.matched + '/8 · 步数 ' + this.moves + ' · ' + this.time.toFixed(1) + 's', 450, 96, 15, 'rgba(255,255,255,0.7)', 'center', 700);
            if (this.over) this.overlay('全部配对完成！', '用时 ' + this.time.toFixed(1) + ' 秒 · 步数 ' + this.moves, '#b7f06a');
        }
    }

    /* ================================================================
     * 10. 僵尸贪吃蛇
     * ============================================================== */
    class Snake extends Base {
        setup() {
            this.C = 30; this.cols = 24; this.rows = 15;
            this.ox = (W - this.cols * this.C) / 2; this.oy = 92;
            this.snake = [{ x: 8, y: 7 }, { x: 7, y: 7 }, { x: 6, y: 7 }];
            this.dir = { x: 1, y: 0 }; this.queue = [];
            this.step = 0; this.iv = 0.19;
            this.food = this.place();
            this.walls = [];
            for (let i = 0; i < 7; i++) {
                const p = this.place();
                if (p) this.walls.push(p);
            }
            this.grow = 0;
        }
        place() {
            for (let k = 0; k < 80; k++) {
                const p = { x: (Math.random() * this.cols) | 0, y: (Math.random() * this.rows) | 0 };
                if (this.snake && this.snake.some(s => s.x === p.x && s.y === p.y)) continue;
                if (this.food && this.food.x === p.x && this.food.y === p.y) continue;
                if (this.walls && this.walls.some(w => w.x === p.x && w.y === p.y)) continue;
                if (p.x < 3 && p.y > 5) continue;
                return p;
            }
            return null;
        }
        update(dt) {
            if (this.over) return;
            this.step += dt;
            if (this.step < this.iv) return;
            this.step = 0;
            if (this.queue.length) this.dir = this.queue.shift();
            const h = this.snake[0];
            const nx = h.x + this.dir.x, ny = h.y + this.dir.y;
            if (nx < 0 || ny < 0 || nx >= this.cols || ny >= this.rows) return this.end(false);
            if (this.snake.some((s, i) => i > 0 && s.x === nx && s.y === ny)) return this.end(false);
            if (this.walls.some(w => w.x === nx && w.y === ny)) return this.end(false);
            this.snake.unshift({ x: nx, y: ny });
            if (this.food && nx === this.food.x && ny === this.food.y) {
                this.score += 10; this.grow += 1;
                this.iv = Math.max(0.085, this.iv - 0.006);
                this.food = this.place();
            } else if (this.grow > 0) { this.grow--; }
            else this.snake.pop();
        }
        onKey(down, k) {
            if (!down || this.over) return;
            const map = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1], a: [-1, 0], d: [1, 0], w: [0, -1], s: [0, 1] };
            const m = map[k];
            if (!m) return;
            const last = this.queue.length ? this.queue[this.queue.length - 1] : this.dir;
            if (last.x === -m[0] && last.y === -m[1]) return;
            if (last.x === m[0] && last.y === m[1]) return;
            if (this.queue.length < 3) this.queue.push({ x: m[0], y: m[1] });
        }
        draw() {
            bgGrass();
            ctx.fillStyle = 'rgba(8,18,6,0.55)';
            rr(this.ox - 8, this.oy - 8, this.cols * this.C + 16, this.rows * this.C + 16, 14); ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
            for (let c = 1; c < this.cols; c++) { ctx.beginPath(); ctx.moveTo(this.ox + c * this.C, this.oy); ctx.lineTo(this.ox + c * this.C, this.oy + this.rows * this.C); ctx.stroke(); }
            for (let r = 1; r < this.rows; r++) { ctx.beginPath(); ctx.moveTo(this.ox, this.oy + r * this.C); ctx.lineTo(this.ox + this.cols * this.C, this.oy + r * this.C); ctx.stroke(); }
            for (const w of this.walls) spr('wallnut', this.ox + w.x * this.C + 2, this.oy + w.y * this.C + 2, this.C - 4, this.C - 4);
            if (this.food) spr('sun', this.ox + this.food.x * this.C + (this.C - 36) / 2, this.oy + this.food.y * this.C + (this.C - 36) / 2, 36, 36);
            this.snake.forEach((s, i) => {
                const x = this.ox + s.x * this.C, y = this.oy + s.y * this.C;
                if (i === 0) {
                    ctx.fillStyle = '#7fc23a'; rr(x + 1, y + 1, this.C - 2, this.C - 2, 9); ctx.fill();
                    spr('peashooter', x + 2, y + 2, this.C - 4, this.C - 4);
                } else {
                    ctx.fillStyle = i % 2 ? '#5aa02a' : '#4c8c24';
                    rr(x + 3, y + 3, this.C - 6, this.C - 6, 8); ctx.fill();
                }
            });
            txt('僵尸贪吃蛇', 450, 56, 24, '#ffe9a8', 'center', 900);
            txt('分数 ' + this.score + ' · 长度 ' + this.snake.length, 450, 552, 16, 'rgba(255,255,255,0.8)', 'center', 700);
            txt('吃阳光变长 · 撞坚果墙 / 自己 / 边界就结束', 450, 578, 13, 'rgba(255,255,255,0.5)', 'center', 600);
            if (this.over) this.overlay('蛇撞没了', '分数 ' + this.score + ' · 长度 ' + this.snake.length, '#ff8f6b');
        }
    }

    /* ================= 游戏注册表 ================= */
    const GAMES = [
        { id: 'tetris', name: '豌豆方块', tag: 'TETRIS', icon: 'peashooter', tip: '落植物块，消一行就齐射一轮', cls: Tetris },
        { id: 'whack', name: '僵尸地鼠', tag: 'WHACK', icon: 'zombie', tip: '僵尸探头就敲，别敲到向日葵', cls: Whack },
        { id: 'g2048', name: '花园 2048', tag: '2048', icon: 'melon', tip: '同种植物滑到一起就升级融合', cls: Garden2048 },
        { id: 'bubble', name: '猫尾草泡泡龙', tag: 'BUBBLE', icon: 'cattail', tip: '同色三个爆破，别让泡泡压线', cls: Bubble },
        { id: 'breakout', name: '豌豆弹球', tag: 'BRICK', icon: 'lilypad', tip: '豌豆弹球砸砖，接住就继续', cls: Breakout },
        { id: 'match3', name: '植物消消乐', tag: 'MATCH3', icon: 'sunflower', tip: '交换相邻植物，三连即消', cls: Match3 },
        { id: 'sokoban', name: '寒冰推箱', tag: 'PUSH', icon: 'snowpea', tip: '把每块冰推到绿圈里', cls: Sokoban },
        { id: 'duck', name: '豌豆射击场', tag: 'SHOOT', icon: 'cherry', tip: '打飞气球僵尸，越高分越多', cls: DuckHunt },
        { id: 'memory', name: '花园连连看', tag: 'MEMORY', icon: 'cobcannon', tip: '翻牌配对同种植物', cls: Memory },
        { id: 'snake', name: '僵尸贪吃蛇', tag: 'SNAKE', icon: 'wallnut', tip: '吃阳光变长，别撞坚果墙', cls: Snake }
    ];

    /* ================= 管理器 ================= */
    let screen = null, lobbyEl = null, gridEl = null, stageEl = null, nameEl = null, canvas = null;
    let active = null, activeMeta = null, raf = 0, last = 0, running = false;

    const CSS = [
        '#mini-screen{position:absolute;inset:0;z-index:2100;display:none;overflow:hidden;',
        'font-family:"PingFang SC","Microsoft YaHei",sans-serif;}',
        '#mini-screen *{box-sizing:border-box;}',
        '.mini-lobby{position:absolute;inset:0;padding:14px 16px 10px;display:flex;flex-direction:column;',
        'background:radial-gradient(circle at 50% 0%,#3f7a2a 0%,#25491a 55%,#152b0f 100%);}',
        '.mini-lobby::before{content:"";position:absolute;inset:0;pointer-events:none;',
        'background:repeating-linear-gradient(90deg,rgba(255,255,255,0.03) 0 2px,transparent 2px 68px);}',
        '.mini-head{position:relative;display:flex;align-items:center;gap:14px;height:56px;flex:0 0 56px;}',
        '.mini-head .mb{background:linear-gradient(180deg,#7a5a2a,#5a3f18);color:#ffe9b8;border:2px solid #c9a45c;',
        'border-radius:10px;padding:7px 16px;font-size:15px;font-weight:800;cursor:pointer;letter-spacing:1px;}',
        '.mini-head .mb:hover{filter:brightness(1.12);}',
        '.mini-head h2{font-family:"Kaiti SC","STKaiti","KaiTi",serif;font-size:30px;color:#fff3c4;letter-spacing:5px;',
        'text-shadow:2px 2px 0 #2c1a08,0 0 18px rgba(160,230,90,0.35);font-weight:900;}',
        '.mini-head .sub{color:rgba(255,255,255,0.55);font-size:13px;letter-spacing:1px;}',
        '.mini-grid{position:relative;flex:1;display:grid;grid-template-columns:repeat(5,1fr);grid-template-rows:repeat(2,1fr);',
        'gap:11px;margin-top:8px;padding-bottom:2px;}',
        '.mini-card{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;',
        'padding:9px 8px 8px;border-radius:14px;cursor:pointer;overflow:hidden;text-align:center;justify-content:center;',
        'background:linear-gradient(180deg,#f6e7bd 0%,#e8d49b 100%);border:3px solid #6b4a22;',
        'box-shadow:inset 0 0 0 2px rgba(255,255,255,0.4),0 6px 14px rgba(0,0,0,0.35);',
        'transition:transform .12s ease,box-shadow .12s ease;}',
        '.mini-card:hover{transform:translateY(-4px);box-shadow:inset 0 0 0 2px rgba(255,255,255,0.5),0 12px 20px rgba(0,0,0,0.5);}',
        '.mini-card:active{transform:translateY(-1px) scale(0.99);}',
        '.mini-card .ico{height:70px;width:100%;display:flex;align-items:center;justify-content:center;',
        'background:linear-gradient(180deg,#c7ea9d,#a6d377);border:2px solid #55703a;border-radius:10px;overflow:hidden;}',
        '.mini-card .ico img{height:60px;width:auto;image-rendering:pixelated;filter:drop-shadow(0 2px 2px rgba(20,50,10,0.45));}',
        '.mini-card h3{font-family:"Kaiti SC","STKaiti","KaiTi",serif;font-size:17px;color:#4a3414;margin-top:6px;',
        'letter-spacing:2px;font-weight:900;white-space:nowrap;}',
        '.mini-card .tg{font-size:9.5px;letter-spacing:1.5px;color:#7a5c22;background:rgba(255,255,255,0.5);',
        'border-radius:8px;padding:1px 7px;margin-top:2px;font-family:monospace;font-weight:700;}',
        '.mini-card .tp{font-size:10.5px;line-height:1.35;color:#6d5626;margin-top:5px;padding:0 2px;}',
        '.mini-card .no{position:absolute;left:7px;top:6px;font-size:10px;font-weight:800;color:#8a6a2f;opacity:.7;}',
        '.mini-foot{height:22px;flex:0 0 22px;display:flex;align-items:center;justify-content:center;',
        'color:rgba(255,255,255,0.45);font-size:12px;letter-spacing:1px;}',
        '.mini-stage{position:absolute;inset:0;display:none;background:#0b1508;}',
        '.mini-stage canvas{position:absolute;inset:0;width:900px;height:600px;display:block;}',
        '.mini-top{position:absolute;left:0;top:0;right:0;height:46px;display:flex;align-items:center;',
        'justify-content:space-between;padding:0 12px;pointer-events:none;}',
        '.mini-top .q{pointer-events:auto;background:rgba(20,12,4,0.62);border:2px solid rgba(255,225,150,0.45);',
        'color:#ffe9b8;border-radius:9px;padding:5px 13px;font-size:13.5px;font-weight:800;cursor:pointer;}',
        '.mini-top .q:hover{background:rgba(60,40,10,0.8);}',
        '.mini-top .nm{color:rgba(255,255,255,0.72);font-size:13px;letter-spacing:2px;}'
    ].join('');

    function ensureDom() {
        if (screen) return;
        const host = document.getElementById('game-container') || document.body;
        const st = document.createElement('style');
        st.id = 'mini-style';
        st.textContent = CSS;
        document.head.appendChild(st);

        screen = document.createElement('div');
        screen.id = 'mini-screen';
        screen.innerHTML =
            '<div class="mini-lobby" id="mini-lobby">' +
            '<div class="mini-head"><button class="mb" id="mini-close">← 返回主菜单</button>' +
            '<h2>小游戏厅</h2><span class="sub">10 个玩法 · 随时进来玩一局</span></div>' +
            '<div class="mini-grid" id="mini-grid"></div>' +
            '<div class="mini-foot">点卡片直接开玩 · ESC 回主菜单</div>' +
            '</div>' +
            '<div class="mini-stage" id="mini-stage">' +
            '<canvas id="mini-canvas" width="900" height="600"></canvas>' +
            '<div class="mini-top"><button class="q" id="mini-quit">← 回大厅 (ESC)</button><div class="nm" id="mini-name"></div></div>' +
            '</div>';
        host.appendChild(screen);

        lobbyEl = screen.querySelector('#mini-lobby');
        gridEl = screen.querySelector('#mini-grid');
        stageEl = screen.querySelector('#mini-stage');
        canvas = screen.querySelector('#mini-canvas');
        nameEl = screen.querySelector('#mini-name');
        ctx = canvas.getContext('2d');

        gridEl.innerHTML = GAMES.map((g, i) =>
            '<div class="mini-card" data-id="' + g.id + '">' +
            '<span class="no">' + (i + 1 < 10 ? '0' + (i + 1) : i + 1) + '</span>' +
            '<div class="ico"><img src="' + SPR[g.icon] + '" alt="' + g.name + '"></div>' +
            '<h3>' + g.name + '</h3><div class="tg">' + g.tag + '</div>' +
            '<div class="tp">' + g.tip + '</div></div>'
        ).join('');

        gridEl.addEventListener('click', e => {
            const card = e.target.closest('.mini-card');
            if (card) openGame(card.dataset.id);
        });
        screen.querySelector('#mini-close').addEventListener('click', quit);
        screen.querySelector('#mini-quit').addEventListener('click', backToLobby);

        canvas.addEventListener('mousedown', e => {
            if (!active) return;
            const p = pos(e);
            if (active.onDown) active.onDown(p.x, p.y);
        });
        canvas.addEventListener('mousemove', e => {
            if (!active) return;
            const p = pos(e);
            if (active.onMove) active.onMove(p.x, p.y);
        });
        canvas.addEventListener('mouseup', () => { if (active && active.onUp) active.onUp(); });
        canvas.addEventListener('contextmenu', e => e.preventDefault());
    }

    function pos(e) {
        const r = canvas.getBoundingClientRect();
        return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
    }

    function normKey(e) {
        const m = {
            ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
            Space: 'space', Escape: 'esc', KeyA: 'a', KeyD: 'd', KeyW: 'w', KeyS: 's',
            KeyR: 'r', KeyN: 'n', KeyP: 'p', Enter: 'enter'
        };
        if (m[e.code]) return m[e.code];
        const k = (e.key || '').toLowerCase();
        if (k === ' ') return 'space';
        if (k === 'arrowleft') return 'left';
        if (k === 'arrowright') return 'right';
        if (k === 'arrowup') return 'up';
        if (k === 'arrowdown') return 'down';
        return k;
    }

    window.addEventListener('keydown', function (e) {
        if (!screen || screen.style.display === 'none') return;
        const k = normKey(e);
        if (['left', 'right', 'up', 'down', 'space'].indexOf(k) >= 0) e.preventDefault();
        e.stopPropagation();
        if (k === 'esc') {
            if (active) backToLobby(); else quit();
            return;
        }
        if (!active) return;
        if (active.over) {
            if (active.overT > 0.45 && (k === 'r' || k === 'space' || k === 'enter')) { active.reset(); return; }
            if (activeMeta && activeMeta.id === 'sokoban' && active.win && k === 'n') {
                const next = (active.idx + 1) % LEVELS.length;
                active.over = false; active.win = false; active.load(next); return;
            }
        }
        if (active.onKey) active.onKey(true, k, e);
    }, true);
    window.addEventListener('keyup', function (e) {
        if (!active) return;
        e.stopPropagation();
        if (active.onKey) active.onKey(false, normKey(e), e);
    }, true);

    function tick(ts) {
        if (!running) return;
        const dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
        last = ts;
        if (active) {
            active.t += dt;
            if (active.over) active.overT += dt;
            try { active.update(dt); } catch (err) { console.error('[mini]', err); active.end(false); }
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, W, H);
            try { active.draw(); } catch (err) { console.error('[mini draw]', err); }
        }
        raf = requestAnimationFrame(tick);
    }

    function startLoop() {
        if (running) return;
        running = true; last = performance.now();
        raf = requestAnimationFrame(tick);
    }
    function stopLoop() {
        running = false;
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
    }

    function openLobby() {
        ensureDom();
        screen.style.display = 'block';
        lobbyEl.style.display = 'flex';
        stageEl.style.display = 'none';
        active = null; activeMeta = null;
        startLoop();
    }

    function openGame(id) {
        ensureDom();
        const meta = GAMES.filter(g => g.id === id)[0];
        if (!meta) return;
        screen.style.display = 'block';
        lobbyEl.style.display = 'none';
        stageEl.style.display = 'block';
        nameEl.textContent = meta.name + ' · ESC 回大厅';
        if (!active || activeMeta !== meta) {
            active = new meta.cls();
            activeMeta = meta;
            active.reset();
        } else {
            active.reset();
        }
        startLoop();
    }

    function backToLobby() {
        active = null; activeMeta = null;
        if (stageEl) stageEl.style.display = 'none';
        if (lobbyEl) lobbyEl.style.display = 'flex';
        stopLoop();
    }

    function quit() {
        active = null; activeMeta = null;
        stopLoop();
        if (screen) screen.style.display = 'none';
    }

    function preload() {
        Object.keys(SPR).forEach(k => {
            const im = new Image();
            im.src = SPR[k];
            _im[k] = im;
        });
    }
    preload();

    window.addEventListener('resize', function () {
        const c = document.getElementById('game-container');
        GAME_SCALE = c ? (c.getBoundingClientRect().width / 900) : 1;
    });

    window.MiniGames = {
        openLobby: openLobby,
        openGame: openGame,
        backToLobby: backToLobby,
        quit: quit,
        games: GAMES.map(g => ({ id: g.id, name: g.name })),
        get active() { return active; },
        get isOpen() { return !!(screen && screen.style.display === 'block'); }
    };
})();
