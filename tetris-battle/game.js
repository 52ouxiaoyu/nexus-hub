'use strict';
/* ============================================================
 * 方块大作战 Tetris Battle  v1.0.0
 * 双人对战俄罗斯方块 · 道具攻防系统
 * ============================================================ */

const VERSION = 'v1.1.2';
const COLS = 10, ROWS = 20, CELL = 30;
const MAX_CHARGE = 10;          // 必杀充能
const ITEM_SLOTS = 3;           // 道具栏格数
const GARBAGE_DELAY = 1500;     // 垃圾行预警时间 ms
const DAS_DELAY = 160;          // 按住方向键后触发连移的延迟 ms
const DAS_ARR = 40;             // 连移间隔 ms

// ---------- 方块定义 ----------
const PIECES = {
    I: { color: '#00e5ff', m: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]] },
    J: { color: '#2962ff', m: [[1,0,0],[1,1,1],[0,0,0]] },
    L: { color: '#ff9100', m: [[0,0,1],[1,1,1],[0,0,0]] },
    O: { color: '#ffd600', m: [[1,1],[1,1]] },
    S: { color: '#00c853', m: [[0,1,1],[1,1,0],[0,0,0]] },
    T: { color: '#aa00ff', m: [[0,1,0],[1,1,1],[0,0,0]] },
    Z: { color: '#ff1744', m: [[1,1,0],[0,1,1],[0,0,0]] },
};
const TYPES = Object.keys(PIECES);
const GARBAGE_COLOR = '#787f8f';

// ---------- 道具定义 ----------
const ITEMS = {
    garbage: { name: '垃圾行',   icon: '🧱', atk: true,  desc: '对方 +2 行垃圾' },
    haste:   { name: '加速诅咒', icon: '⚡', atk: true,  desc: '对方加速 15 秒' },
    fog:     { name: '迷雾',     icon: '🌫️', atk: true,  desc: '遮蔽对方 8 秒' },
    shield:  { name: '护盾',     icon: '🛡️', atk: false, desc: '抵挡一次垃圾攻击' },
    sweep:   { name: '清底',     icon: '🧹', atk: false, desc: '清除自己最底一行' },
    slow:    { name: '减速',     icon: '🐢', atk: false, desc: '自己减速 20 秒' },
};
const ITEM_KEYS = Object.keys(ITEMS);

// ---------- 工具 ----------
function rotateMat(m, dir) {
    const n = m.length;
    const r = Array.from({ length: n }, () => Array(n).fill(0));
    for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++)
            r[x][y] = dir > 0 ? m[n - 1 - y][x] : m[y][n - 1 - x];
    return r;
}
function emptyBoard() { return Array.from({ length: ROWS }, () => Array(COLS).fill(0)); }

// ---------- 简易音效 ----------
const AudioSys = (() => {
    let ctx = null;
    function ensure() {
        if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
        if (ctx && ctx.state === 'suspended') ctx.resume();
        return ctx;
    }
    function beep(freq, dur, type, vol, delay) {
        const c = ensure(); if (!c) return;
        const t0 = c.currentTime + (delay || 0);
        const o = c.createOscillator(), g = c.createGain();
        o.type = type || 'square'; o.frequency.value = freq;
        g.gain.setValueAtTime(vol || 0.06, t0);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(g); g.connect(c.destination);
        o.start(t0); o.stop(t0 + dur + 0.02);
    }
    return {
        move:   () => beep(190, 0.04, 'square', 0.03),
        rotate: () => beep(320, 0.05, 'square', 0.04),
        drop:   () => beep(110, 0.08, 'triangle', 0.08),
        lock:   () => beep(160, 0.05, 'square', 0.04),
        clear:  (n) => { for (let i = 0; i < n; i++) beep(440 + i * 130, 0.09, 'square', 0.06, i * 0.06); },
        item:   () => { beep(660, 0.07, 'sine', 0.07); beep(990, 0.09, 'sine', 0.07, 0.07); },
        attack: () => { beep(150, 0.16, 'sawtooth', 0.09); beep(100, 0.2, 'sawtooth', 0.08, 0.1); },
        shield: () => beep(600, 0.12, 'sine', 0.08),
        ult:    () => { for (let i = 0; i < 5; i++) beep(220 - i * 25, 0.12, 'sawtooth', 0.1, i * 0.07); },
        win:    () => { [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.15, 'square', 0.07, i * 0.12)); },
        lose:   () => { [400, 300, 220, 150].forEach((f, i) => beep(f, 0.18, 'sawtooth', 0.07, i * 0.13)); },
    };
})();

// ---------- 玩家 ----------
class Player {
    constructor(idx, isAI) {
        this.idx = idx;            // 0 = 左 P1, 1 = 右 P2
        this.isAI = !!isAI;
        this.wins = 0;
        this.reset();
    }
    reset() {
        this.board = emptyBoard();
        this.bag = [];
        this.cur = null; this.next = null;
        this.spawnId = 0;
        this.dropTimer = 0;
        this.softDropping = false;
        this.held = { left: false, right: false };   // 方向键按住状态
        this.das = { dir: 0, timer: 0, arr: 0 };     // DAS 连移状态
        this.items = [null, null, null];
        this.charge = 0;
        this.shields = 0;
        this.incoming = [];        // { lines, due }
        this.effects = { hasteUntil: 0, slowUntil: 0, fogUntil: 0 };
        this.combo = 0;
        this.score = 0;
        this.lines = 0;
        this.clearAnim = null;     // { rows:[], until }
        this.dead = false;
        this.spawn();
        this.spawn();
    }

    // ----- 方块生成（7-bag）-----
    drawFromBag() {
        if (this.bag.length === 0) {
            this.bag = TYPES.slice();
            for (let i = this.bag.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
            }
        }
        return this.bag.pop();
    }
    spawn() {
        const t = this.next || this.drawFromBag();
        this.next = this.drawFromBag();
        const m = PIECES[t].m.map(r => r.slice());
        this.cur = { type: t, m, x: Math.floor((COLS - m.length) / 2), y: -1 };
        this.spawnId++;
        if (this.collide(this.cur.m, this.cur.x, this.cur.y)) {
            this.dead = true;
        }
    }

    collide(m, px, py) {
        for (let y = 0; y < m.length; y++)
            for (let x = 0; x < m[y].length; x++) {
                if (!m[y][x]) continue;
                const bx = px + x, by = py + y;
                if (bx < 0 || bx >= COLS || by >= ROWS) return true;
                if (by >= 0 && this.board[by][bx]) return true;
            }
        return false;
    }

    // ----- 操作 -----
    move(dx) {
        if (!this.cur || this.dead) return false;
        if (!this.collide(this.cur.m, this.cur.x + dx, this.cur.y)) {
            this.cur.x += dx; AudioSys.move(); return true;
        }
        return false;
    }
    rotate() {
        if (!this.cur || this.dead) return;
        const r = rotateMat(this.cur.m, 1);
        for (const k of [0, -1, 1, -2, 2]) {   // 简易 wall kick
            if (!this.collide(r, this.cur.x + k, this.cur.y)) {
                this.cur.m = r; this.cur.x += k;
                AudioSys.rotate(); return;
            }
        }
    }
    softDrop() {
        if (!this.cur || this.dead) return;
        if (!this.collide(this.cur.m, this.cur.x, this.cur.y + 1)) { this.cur.y++; this.score += 1; }
    }
    hardDrop() {
        if (!this.cur || this.dead) return;
        let d = 0;
        while (!this.collide(this.cur.m, this.cur.x, this.cur.y + 1)) { this.cur.y++; d++; }
        this.score += d * 2;
        AudioSys.drop();
        this.lock();
    }
    ghostY() {
        if (!this.cur) return 0;
        let y = this.cur.y;
        while (!this.collide(this.cur.m, this.cur.x, y + 1)) y++;
        return y;
    }

    lock() {
        const { m, x, y, type } = this.cur;
        for (let r = 0; r < m.length; r++)
            for (let c = 0; c < m[r].length; c++)
                if (m[r][c] && y + r >= 0) this.board[y + r][x + c] = PIECES[type].color;
        this.cur = null;
        AudioSys.lock();

        // 找满行
        const full = [];
        for (let r = 0; r < ROWS; r++)
            if (this.board[r].every(v => v)) full.push(r);

        if (full.length > 0) {
            this.clearAnim = { rows: full.slice(), until: performance.now() + 220 };
            this.pendingClear = full;
        } else {
            this.combo = 0;
            this.spawn();
        }
    }

    finishClear(now) {
        const rows = this.pendingClear;
        this.pendingClear = null;
        if (!rows) return;
        // 消行（从下往上删）
        for (const r of rows.sort((a, b) => b - a)) {
            this.board.splice(r, 1);
            this.board.unshift(Array(COLS).fill(0));
        }
        const n = rows.length;
        this.lines += n;
        this.combo++;
        const baseScore = [0, 100, 300, 500, 800][n] || 0;
        this.score += baseScore * (1 + (this.combo - 1) * 0.25) | 0;
        AudioSys.clear(n);

        // ---- 道具获得 ----
        let gained = 0;
        if (n >= 2) gained = n - 1;            // 2行=1个 3行=2个 4行=3个
        if (n === 4) this.addCharge(1);
        if (this.combo >= 2) this.addCharge(1); // 连击充能
        for (let i = 0; i < gained; i++) this.grantItem();

        this.spawn();
    }

    grantItem() {
        const slot = this.items.indexOf(null);
        if (slot >= 0) {
            this.items[slot] = ITEM_KEYS[Math.floor(Math.random() * ITEM_KEYS.length)];
            AudioSys.item();
        } else {
            this.addCharge(1);
        }
    }
    addCharge(n) {
        if (this.charge < MAX_CHARGE) {
            this.charge = Math.min(MAX_CHARGE, this.charge + n);
            if (this.charge === MAX_CHARGE) AudioSys.item();
        }
    }

    // ----- 道具使用 -----
    useSlot(i) {
        if (this.dead || !this.items[i]) return;
        const key = this.items[i];
        this.items[i] = null;
        this.applyItem(key);
    }
    applyItem(key) {
        const opp = game.players[1 - this.idx];
        const now = performance.now();
        switch (key) {
            case 'garbage':
                game.log(this, '🧱 垃圾行!');
                game.sendAttack(this, opp, 2);
                break;
            case 'haste':
                game.log(this, '⚡ 对方加速!');
                opp.effects.hasteUntil = now + 15000;
                AudioSys.attack();
                break;
            case 'fog':
                game.log(this, '🌫️ 迷雾笼罩对方!');
                opp.effects.fogUntil = now + 8000;
                AudioSys.attack();
                break;
            case 'shield':
                this.shields++;
                game.log(this, '🛡️ 护盾展开');
                AudioSys.shield();
                break;
            case 'sweep': {
                game.log(this, '🧹 清除底部一行');
                this.removeBottomRow();
                break;
            }
            case 'slow':
                game.log(this, '🐢 减速护体');
                this.effects.slowUntil = now + 20000;
                AudioSys.shield();
                break;
        }
    }
    removeBottomRow() {
        this.board.splice(ROWS - 1, 1);
        this.board.unshift(Array(COLS).fill(0));
        // 若当前块被抬动的格子重叠，上移
        while (this.cur && this.collide(this.cur.m, this.cur.x, this.cur.y)) this.cur.y--;
    }
    fireUltimate() {
        if (this.charge < MAX_CHARGE || this.dead) return;
        this.charge = 0;
        const opp = game.players[1 - this.idx];
        const now = performance.now();
        game.log(this, '💥 末日洪水!!');
        AudioSys.ult();
        game.shake = 14;
        game.sendAttack(this, opp, 6);
        opp.effects.fogUntil = now + 10000;
        opp.effects.hasteUntil = now + 10000;
    }

    // ----- 重力 -----
    getDropInterval(now) {
        const elapsed = now - game.startTime;
        let base = Math.max(320, 800 - Math.floor(elapsed / 10000) * 60); // 每 10 秒加快
        if (this.effects.hasteUntil > now) base *= 0.5;
        if (this.effects.slowUntil > now) base = Math.min(1200, base * 1.8);
        return base;
    }
    tick(now, dt) {
        if (this.dead) return;
        if (this.clearAnim && now > this.clearAnim.until) {
            this.clearAnim = null;
            this.finishClear(now);
        }
        if (!this.cur) return; // 消行动画中
        this.dropTimer += dt * (this.softDropping ? 20 : 1);
        const interval = this.getDropInterval(now);
        while (this.dropTimer >= interval) {
            this.dropTimer -= interval;
            if (!this.collide(this.cur.m, this.cur.x, this.cur.y + 1)) {
                this.cur.y++;
            } else {
                this.lock();
                break;
            }
        }
    }

    // ----- 垃圾行 -----
    receiveGarbage(n) {
        // 抬升
        for (let i = 0; i < n; i++) {
            this.board.shift();
            const row = Array(COLS).fill(GARBAGE_COLOR);
            row[Math.floor(Math.random() * COLS)] = 0;
            this.board.push(row);
        }
        if (this.cur) {
            while (this.collide(this.cur.m, this.cur.x, this.cur.y)) {
                this.cur.y--;
                if (this.cur.y < -4) { this.dead = true; break; }
            }
        }
        game.shake = Math.max(game.shake || 0, 8);
    }
    stackHeight() {
        for (let r = 0; r < ROWS; r++)
            if (this.board[r].some(v => v)) return ROWS - r;
        return 0;
    }
}

// ---------- AI 难度 ----------
// actInterval: 每步操作间隔（越小越快）; itemChance: 主动用攻击道具概率; planNoise: 落点评分噪声（越大越菜）
const AI_LEVELS = {
    1: { name: '初级',   actInterval: 420, itemChance: 0.10, planNoise: 300 },
    2: { name: '中级',   actInterval: 220, itemChance: 0.22, planNoise: 110 },
    3: { name: '高级',   actInterval: 110, itemChance: 0.35, planNoise: 30 },
    4: { name: '地狱级', actInterval: 60,  itemChance: 0.50, planNoise: 0 },
};

// ---------- 简单 AI ----------
const AI = {
    actTimer: 0,
    reset() { this.actTimer = 0; },
    evalBoard(board) {
        let holes = 0, agg = 0, bump = 0;
        const heights = [];
        for (let c = 0; c < COLS; c++) {
            let h = 0, seen = false;
            for (let r = 0; r < ROWS; r++) {
                if (board[r][c]) { if (!seen) { h = ROWS - r; seen = true; } }
                else if (seen) holes++;
            }
            heights.push(h); agg += h;
        }
        for (let c = 0; c < COLS - 1; c++) bump += Math.abs(heights[c] - heights[c + 1]);
        return { agg, holes, bump };
    },
    countClears(board) {
        let n = 0;
        for (let r = 0; r < ROWS; r++) if (board[r].every(v => v)) n++;
        return n;
    },
    plan(p, noise) {
        // 枚举旋转与落点，评分选最优（noise 越大越容易选到差位置）
        noise = noise || 0;
        let best = null;
        let m = p.cur.m.map(r => r.slice());
        for (let rot = 0; rot < 4; rot++) {
            for (let x = -2; x < COLS; x++) {
                if (p.collide(m, x, p.cur.y)) continue;
                let y = p.cur.y;
                while (!p.collide(m, x, y + 1)) y++;
                // 模拟
                const b = p.board.map(r => r.slice());
                let ok = true;
                for (let r = 0; r < m.length && ok; r++)
                    for (let c = 0; c < m[r].length; c++)
                        if (m[r][c]) {
                            const by = y + r, bx = x + c;
                            if (by < 0) { ok = false; break; }
                            b[by][bx] = 1;
                        }
                if (!ok) continue;
                const ev = this.evalBoard(b);
                const clears = this.countClears(b);
                const score = clears * 320 - ev.holes * 380 - ev.bump * 18 - ev.agg * 9
                    + (Math.random() - 0.5) * 2 * noise;
                if (!best || score > best.score) best = { score, rot, x };
            }
            m = rotateMat(m, 1);
        }
        if (!best) return null;
        return { rot: best.rot, x: best.x, done: false };
    },
    update(p, now, dt) {
        if (p.dead || !p.cur) return;
        const cfg = AI_LEVELS[p.aiLevel] || AI_LEVELS[4];
        // 道具决策
        this.itemTimer = (this.itemTimer || 0) + dt;
        if (this.itemTimer > 900) {
            this.itemTimer = 0;
            const opp = game.players[1 - p.idx];
            const incoming = p.incoming.reduce((s, a) => s + a.lines, 0);
            for (let i = 0; i < ITEM_SLOTS; i++) {
                const it = p.items[i]; if (!it) continue;
                if (it === 'shield' && incoming > 0) { p.useSlot(i); break; }
                if (it === 'sweep' && p.stackHeight() >= 13) { p.useSlot(i); break; }
                if (it === 'slow' && p.stackHeight() >= 14) { p.useSlot(i); break; }
                if (ITEMS[it].atk && Math.random() < cfg.itemChance) { p.useSlot(i); break; }
            }
            if (p.charge >= MAX_CHARGE) p.fireUltimate();
        }
        // 移动决策
        this.actTimer += dt;
        if (this.actTimer < cfg.actInterval) return;
        this.actTimer = 0;
        if (!p.plan || p.planSpawn !== p.spawnId) {
            p.plan = this.plan(p, cfg.planNoise);
            p.planSpawn = p.spawnId;
            if (!p.plan) { p.hardDrop(); return; }
        }
        const pl = p.plan;
        if (pl.rot > 0) { p.rotate(); pl.rot--; return; }
        if (p.cur.x < pl.x) { if (!p.move(1)) p.hardDrop(); return; }
        if (p.cur.x > pl.x) { if (!p.move(-1)) p.hardDrop(); return; }
        p.hardDrop();
    }
};

// ---------- 键位 ----------
// 分区原则：P1 = 键盘左半区（WASD 区），P2 = 键盘右半区（方向键 + 小键盘区）
// 旋转为独立键：P1 = 空格，P2 = 小键盘回车
const KEYMAP = {
    P1: {
        left: ['KeyA'], right: ['KeyD'], down: ['KeyS'],
        rotate: ['Space'], hard: ['ShiftLeft', 'KeyQ'],
        item1: ['KeyF', 'KeyZ'], item2: ['KeyG', 'KeyX'], item3: ['KeyH', 'KeyC'],
        ult: ['KeyR', 'KeyE'],
    },
    P2: {
        left: ['ArrowLeft'], right: ['ArrowRight'], down: ['ArrowDown'],
        rotate: ['NumpadEnter'], hard: ['Numpad0', 'ShiftRight'],
        item1: ['Numpad1', 'Comma'], item2: ['Numpad2', 'Period'], item3: ['Numpad3', 'Slash'],
        ult: ['NumpadAdd', 'ControlRight'],
    }
};
function matchKey(map, code) {
    for (const action in map)
        if (map[action].includes(code)) return action;
    return null;
}

// ---------- 主游戏 ----------
const game = {
    canvas: null, ctx: null,
    state: 'menu',           // menu | playing | over
    mode: 'duo',             // duo | ai
    players: [],
    startTime: 0,
    lastTime: 0,
    shake: 0,
    logs: [],                // { text, until, color }

    init() {
        this.canvas = document.getElementById('game');
        this.ctx = this.canvas.getContext('2d');
        this.players = [new Player(0, false), new Player(1, false)];
        this.bindUI();
        this.bindKeys();
        requestAnimationFrame(t => this.loop(t));
    },

    bindUI() {
        document.getElementById('btn-duo').onclick = () => this.start('duo');
        document.getElementById('btn-ai').onclick = () => {
            document.getElementById('menu-main').style.display = 'none';
            document.getElementById('ai-levels').style.display = 'flex';
        };
        document.getElementById('btn-ai-back').onclick = () => {
            document.getElementById('ai-levels').style.display = 'none';
            document.getElementById('menu-main').style.display = 'block';
        };
        document.querySelectorAll('#ai-levels .lvl-btn').forEach(b => {
            b.onclick = () => this.start('ai', parseInt(b.dataset.lvl));
        });
        document.getElementById('btn-help').onclick = () => {
            document.getElementById('menu').classList.add('hidden');
            document.getElementById('help').classList.remove('hidden');
        };
        document.getElementById('btn-help-back').onclick = () => {
            document.getElementById('help').classList.add('hidden');
            document.getElementById('menu').classList.remove('hidden');
        };
        document.getElementById('btn-rematch').onclick = () => this.start(this.mode);
        document.getElementById('btn-back-menu').onclick = () => this.toMenu();
    },

    bindKeys() {
        window.addEventListener('keydown', e => {
            if (this.state !== 'playing') return;
            const code = e.code;
            const gameCodes = ['Space','NumpadEnter','ShiftLeft','ShiftRight','ControlRight',
                'KeyA','KeyS','KeyD','KeyF','KeyG','KeyH','KeyR','KeyQ','KeyE','KeyZ','KeyX','KeyC',
                'Numpad0','Numpad1','Numpad2','Numpad3','NumpadAdd','Comma','Period','Slash'];
            if (code === 'Space' || code.startsWith('Arrow') || gameCodes.includes(code)) {
                e.preventDefault();
            }
            for (const pidx of [0, 1]) {
                const p = this.players[pidx];
                if (p.isAI) continue;
                const action = matchKey(KEYMAP['P' + (pidx + 1)], code);
                if (!action || e.repeat) continue;
                switch (action) {
                    case 'left':
                        p.held.left = true;
                        p.das = { dir: -1, timer: 0, arr: 0 };
                        p.move(-1);
                        break;
                    case 'right':
                        p.held.right = true;
                        p.das = { dir: 1, timer: 0, arr: 0 };
                        p.move(1);
                        break;
                    case 'rotate': p.rotate(); break;
                    case 'hard':  p.hardDrop(); break;
                    case 'item1': p.useSlot(0); break;
                    case 'item2': p.useSlot(1); break;
                    case 'item3': p.useSlot(2); break;
                    case 'ult':   p.fireUltimate(); break;
                    case 'down':  p.softDropping = true; break;
                }
            }
        });
        window.addEventListener('keyup', e => {
            for (const p of this.players) {
                if (p.isAI) continue;
                const map = KEYMAP['P' + (p.idx + 1)];
                if (map.down.includes(e.code)) p.softDropping = false;
                // 松开方向键：结束 DAS；若反向键仍按住则切换方向
                if (map.left.includes(e.code)) {
                    p.held.left = false;
                    if (p.das.dir === -1) {
                        p.das = p.held.right ? { dir: 1, timer: 0, arr: 0 } : { dir: 0, timer: 0, arr: 0 };
                    }
                }
                if (map.right.includes(e.code)) {
                    p.held.right = false;
                    if (p.das.dir === 1) {
                        p.das = p.held.left ? { dir: -1, timer: 0, arr: 0 } : { dir: 0, timer: 0, arr: 0 };
                    }
                }
            }
        });
    },

    // DAS：按住方向键，先立即移动一格，DAS_DELAY 后以 DAS_ARR 间隔连移
    updateDAS(p, dt) {
        if (!p.das.dir || p.dead || !p.cur) return;
        p.das.timer += dt;
        if (p.das.timer >= DAS_DELAY) {
            p.das.arr += dt;
            while (p.das.arr >= DAS_ARR) {
                p.das.arr -= DAS_ARR;
                if (!p.move(p.das.dir)) { p.das.arr = 0; break; }  // 撞墙停住
            }
        }
    },

    start(mode, aiLevel) {
        this.mode = mode;
        // 未显式传难度时（如「再来一局」）保留上局选择的难度
        if (aiLevel) this.aiLevel = aiLevel;
        else if (this.aiLevel == null) this.aiLevel = 4;
        this.players[0].reset(); this.players[0].isAI = false;
        this.players[1].reset(); this.players[1].isAI = (mode === 'ai');
        this.players[1].aiLevel = this.aiLevel;
        AI.reset();
        this.startTime = performance.now();
        this.lastTime = this.startTime;
        this.logs = []; this.shake = 0;
        this.state = 'playing';
        document.getElementById('menu').classList.add('hidden');
        document.getElementById('help').classList.add('hidden');
        document.getElementById('result').classList.add('hidden');
        AudioSys.rotate();
    },
    toMenu() {
        this.state = 'menu';
        document.getElementById('result').classList.add('hidden');
        document.getElementById('menu').classList.remove('hidden');
    },

    log(p, text) {
        this.logs.push({ text, until: performance.now() + 2200, color: p.idx === 0 ? '#00e5ff' : '#ff4081' });
        if (this.logs.length > 5) this.logs.shift();
    },

    sendAttack(from, to, lines) {
        if (to.shields > 0) {
            to.shields--;
            this.log(to, '🛡️ 抵挡了攻击!');
            AudioSys.shield();
            return;
        }
        to.incoming.push({ lines, due: performance.now() + GARBAGE_DELAY });
        AudioSys.attack();
    },

    checkIncoming(now) {
        for (const p of this.players) {
            for (let i = p.incoming.length - 1; i >= 0; i--) {
                if (now >= p.incoming[i].due) {
                    const n = p.incoming[i].lines;
                    p.incoming.splice(i, 1);
                    p.receiveGarbage(n);
                }
            }
        }
    },

    checkGameOver() {
        if (this.state !== 'playing') return;
        for (const p of this.players) {
            if (p.dead) {
                this.state = 'over';
                const winner = this.players[1 - p.idx];
                winner.wins++;
                AudioSys.lose(); setTimeout(() => AudioSys.win(), 500);
                const t = document.getElementById('result-title');
                t.textContent = winner.idx === 0 ? '🎉 玩家 1 获胜!' : (this.mode === 'ai' ? '🤖 电脑获胜…' : '🎉 玩家 2 获胜!');
                t.style.color = winner.idx === 0 ? '#00e5ff' : '#ff4081';
                document.getElementById('result-sub').textContent =
                    `比分 ${this.players[0].wins} : ${this.players[1].wins}   |   P1 得分 ${this.players[0].score} · P2 得分 ${this.players[1].score}`;
                document.getElementById('result').classList.remove('hidden');
            }
        }
    },

    loop(t) {
        const dt = Math.min(50, t - this.lastTime);
        this.lastTime = t;
        if (this.state === 'playing') {
            const now = performance.now();
            for (const p of this.players) p.tick(now, dt);
            for (const p of this.players) if (!p.isAI) this.updateDAS(p, dt);
            this.checkIncoming(now);
            for (const p of this.players) if (p.isAI) AI.update(p, now, dt);
            this.checkGameOver();
            if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 0.04);
        }
        this.draw(t);
        requestAnimationFrame(tt => this.loop(tt));
    },

    // ================= 渲染 =================
    draw(t) {
        const ctx = this.ctx;
        ctx.save();
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        // 背景
        const bg = ctx.createLinearGradient(0, 0, 0, 720);
        bg.addColorStop(0, '#0a0c18'); bg.addColorStop(1, '#07080f');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, 1240, 720);

        if (this.shake > 0) {
            ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
        }

        if (this.state === 'menu') { this.drawMenuBg(t); ctx.restore(); return; }

        const now = performance.now();
        const layouts = [
            { bx: 170, info: 'left' },   // P1: 信息在棋盘左侧
            { bx: 760, info: 'right' },  // P2: 信息在棋盘右侧
        ];
        for (const p of this.players) {
            const L = layouts[p.idx];
            this.drawPlayer(p, L, now, t);
        }
        this.drawCenter(now, t);
        this.drawLogs();
        ctx.restore();
    },

    drawMenuBg(t) {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(255,255,255,0.02)';
        for (let i = 0; i < 30; i++) {
            const x = (i * 137 + t * 0.01 * (1 + i % 3)) % 1240;
            const y = (i * 211 + t * 0.015 * (1 + i % 2)) % 720;
            ctx.fillRect(x, y, 24, 24);
        }
    },

    drawPlayer(p, L, now, t) {
        const ctx = this.ctx;
        const bx = L.bx, by = 60;
        const accent = p.idx === 0 ? '#00e5ff' : '#ff4081';
        const inDanger = p.stackHeight() >= 16;

        // ---- 棋盘外框 ----
        ctx.save();
        ctx.strokeStyle = inDanger
            ? (Math.floor(t / 200) % 2 ? '#ff1744' : 'rgba(255,23,68,0.35)')
            : accent;
        ctx.lineWidth = inDanger ? 3 : 2;
        ctx.shadowColor = accent; ctx.shadowBlur = 12;
        ctx.strokeRect(bx - 4, by - 4, COLS * CELL + 8, ROWS * CELL + 8);
        ctx.restore();

        // ---- 棋盘底 ----
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(bx, by, COLS * CELL, ROWS * CELL);
        // 网格
        ctx.strokeStyle = 'rgba(255,255,255,0.045)';
        ctx.lineWidth = 1;
        for (let c = 1; c < COLS; c++) { ctx.beginPath(); ctx.moveTo(bx + c * CELL, by); ctx.lineTo(bx + c * CELL, by + ROWS * CELL); ctx.stroke(); }
        for (let r = 1; r < ROWS; r++) { ctx.beginPath(); ctx.moveTo(bx, by + r * CELL); ctx.lineTo(bx + COLS * CELL, by + r * CELL); ctx.stroke(); }

        // ---- 已落格子 ----
        for (let r = 0; r < ROWS; r++)
            for (let c = 0; c < COLS; c++) {
                const v = p.board[r][c];
                if (v) {
                    const isClearing = p.clearAnim && p.clearAnim.rows.includes(r);
                    this.drawCell(bx + c * CELL, by + r * CELL, isClearing ? '#ffffff' : v);
                }
            }

        // ---- 幽灵块 + 当前块 ----
        if (p.cur) {
            const gy = p.ghostY();
            const m = p.cur.m;
            for (let r = 0; r < m.length; r++)
                for (let c = 0; c < m[r].length; c++)
                    if (m[r][c] && gy + r >= 0) {
                        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
                        ctx.strokeRect(bx + (p.cur.x + c) * CELL + 2, by + (gy + r) * CELL + 2, CELL - 4, CELL - 4);
                    }
            for (let r = 0; r < m.length; r++)
                for (let c = 0; c < m[r].length; c++)
                    if (m[r][c] && p.cur.y + r >= 0)
                        this.drawCell(bx + (p.cur.x + c) * CELL, by + (p.cur.y + r) * CELL, PIECES[p.cur.type].color);
        }

        // ---- 迷雾 ----
        if (p.effects.fogUntil > now) {
            const alpha = p.effects.fogUntil - now < 1500
                ? 0.85 * (p.effects.fogUntil - now) / 1500 : 0.85;
            const holeCx = p.cur ? p.cur.x : 5;
            for (let r = 0; r < ROWS - 3; r++)
                for (let c = 0; c < COLS; c++) {
                    if (p.cur && r >= p.cur.y - 1 && Math.abs(c - holeCx) <= 1) continue;
                    ctx.fillStyle = `rgba(30,32,48,${alpha})`;
                    ctx.fillRect(bx + c * CELL, by + r * CELL, CELL, CELL);
                }
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('🌫️ 迷雾中…', bx + COLS * CELL / 2, by + 30);
        }

        // ---- 信息面板 ----
        const ix = L.info === 'left' ? bx - 150 : bx + COLS * CELL + 24;
        this.drawInfo(p, ix, by, now);

        // ---- 名牌 ----
        ctx.fillStyle = accent;
        ctx.font = 'bold 17px sans-serif';
        ctx.textAlign = 'center';
        const nameX = L.info === 'left' ? bx - 75 : bx + COLS * CELL + 99;
        ctx.fillText(p.idx === 0
            ? 'P1 玩家'
            : (p.isAI ? '🤖 电脑 · ' + (AI_LEVELS[p.aiLevel] || AI_LEVELS[4]).name : 'P2 玩家'),
            nameX, by - 18);
    },

    drawCell(x, y, color) {
        const ctx = this.ctx;
        ctx.fillStyle = color;
        ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.fillRect(x + 1, y + 1, CELL - 2, 4);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(x + 1, y + CELL - 5, CELL - 2, 4);
    },

    drawInfo(p, ix, iy, now) {
        const ctx = this.ctx;
        ctx.textAlign = 'left';

        // 下一个
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(ix, iy, 120, 86);
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.strokeRect(ix, iy, 120, 86);
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.font = '11px sans-serif';
        ctx.fillText('NEXT', ix + 8, iy + 16);
        if (p.next) {
            const pm = PIECES[p.next].m;
            const color = PIECES[p.next].color;
            let minX = 9, maxX = -1, minY = 9, maxY = -1;
            for (let r = 0; r < pm.length; r++) for (let c = 0; c < pm[r].length; c++)
                if (pm[r][c]) { minX = Math.min(minX, c); maxX = Math.max(maxX, c); minY = Math.min(minY, r); maxY = Math.max(maxY, r); }
            const w = maxX - minX + 1, h = maxY - minY + 1;
            const offX = ix + (120 - w * 20) / 2, offY = iy + (86 - h * 20) / 2;
            for (let r = 0; r < pm.length; r++) for (let c = 0; c < pm[r].length; c++)
                if (pm[r][c]) {
                    ctx.fillStyle = color;
                    ctx.fillRect(offX + (c - minX) * 20 + 1, offY + (r - minY) * 20 + 1, 18, 18);
                }
        }

        // 道具栏
        const sy = iy + 104;
        const keyHints = p.idx === 0 ? ['F', 'G', 'H'] : ['小1', '小2', '小3'];
        for (let i = 0; i < ITEM_SLOTS; i++) {
            const y = sy + i * 52;
            ctx.fillStyle = p.items[i] ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.03)';
            ctx.fillRect(ix, y, 120, 44);
            ctx.strokeStyle = p.items[i] ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)';
            ctx.strokeRect(ix, y, 120, 44);
            if (p.items[i]) {
                ctx.font = '22px sans-serif';
                ctx.fillText(ITEMS[p.items[i]].icon, ix + 10, y + 30);
                ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif';
                ctx.fillText(ITEMS[p.items[i]].name, ix + 42, y + 19);
                ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.font = '10px sans-serif';
                ctx.fillText(ITEMS[p.items[i]].desc, ix + 42, y + 34);
            }
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.font = '10px sans-serif';
            ctx.fillText(keyHints[i], ix + 104, y + 12);
        }

        // 必杀充能
        const cy = sy + ITEM_SLOTS * 52 + 10;
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(ix, cy, 120, 14);
        const ratio = p.charge / MAX_CHARGE;
        const grad = ctx.createLinearGradient(ix, 0, ix + 120, 0);
        grad.addColorStop(0, '#ffd600'); grad.addColorStop(1, '#ff1744');
        ctx.fillStyle = grad;
        ctx.fillRect(ix, cy, 120 * ratio, 14);
        if (ratio >= 1 && Math.floor(now / 300) % 2) {
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
            ctx.strokeRect(ix - 1, cy - 1, 122, 16);
        }
        ctx.fillStyle = ratio >= 1 ? '#ffd600' : 'rgba(255,255,255,0.55)';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(ratio >= 1 ? '💥 必杀就绪!' : `必杀充能 ${p.charge}/${MAX_CHARGE}`, ix, cy + 28);
        const ultKey = p.idx === 0 ? 'R' : (p.isAI ? '' : '小+');
        if (ultKey) {
            ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '10px sans-serif';
            ctx.fillText(`按 ${ultKey} 发动`, ix, cy + 42);
        }

        // 护盾 & 状态
        const ey = cy + 56;
        ctx.font = '15px sans-serif';
        if (p.shields > 0) {
            ctx.fillStyle = '#69f0ae';
            ctx.fillText('🛡️ × ' + p.shields, ix, ey);
        }
        let fx = ix;
        ctx.font = '13px sans-serif';
        if (p.effects.hasteUntil > now) {
            ctx.fillStyle = '#ff5252';
            ctx.fillText('⚡', fx, ey + 20);
            fx += 24;
        }
        if (p.effects.slowUntil > now) {
            ctx.fillStyle = '#69f0ae';
            ctx.fillText('🐢', fx, ey + 20);
            fx += 24;
        }

        // 分数
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '12px sans-serif';
        ctx.fillText(`分数 ${p.score}   消行 ${p.lines}`, ix, ey + 48);
        if (p.combo >= 2) {
            ctx.fillStyle = '#ffd600';
            ctx.font = 'bold 15px sans-serif';
            ctx.fillText(`${p.combo} COMBO!`, ix, ey + 70);
        }
    },

    drawCenter(now, t) {
        const ctx = this.ctx;
        const cx = 620;
        // VS
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = 'bold 30px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('VS', cx, 90);

        // 时间
        const elapsed = Math.floor((now - this.startTime) / 1000);
        const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const ss = String(elapsed % 60).padStart(2, '0');
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '15px monospace';
        ctx.fillText(`${mm}:${ss}`, cx, 116);

        // 垃圾预警箭头
        for (const p of this.players) {
            const total = p.incoming.reduce((s, a) => s + a.lines, 0);
            if (total <= 0) continue;
            const target = p.idx === 0 ? cx - 120 : cx + 120;
            const dir = p.idx === 0 ? -1 : 1; // 箭头指向受害方
            const urgent = p.incoming.some(a => a.due - now < 600);
            const blink = urgent && Math.floor(now / 120) % 2;
            ctx.save();
            ctx.globalAlpha = blink ? 1 : 0.6;
            ctx.fillStyle = '#ff1744';
            ctx.font = 'bold 15px sans-serif';
            ctx.fillText(`⚠ 垃圾 ×${total}`, target, 170);
            // 箭头
            const ay = 190;
            ctx.strokeStyle = '#ff1744'; ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(target - dir * 18, ay); ctx.lineTo(target + dir * 10, ay);
            ctx.moveTo(target + dir * 10, ay);
            ctx.lineTo(target + dir * 2, ay - 7);
            ctx.moveTo(target + dir * 10, ay);
            ctx.lineTo(target + dir * 2, ay + 7);
            ctx.stroke();
            ctx.restore();
        }
    },

    drawLogs() {
        const ctx = this.ctx;
        const now = performance.now();
        ctx.textAlign = 'center';
        ctx.font = 'bold 16px sans-serif';
        let y = 260;
        for (const l of this.logs) {
            if (now > l.until) continue;
            ctx.globalAlpha = Math.min(1, (l.until - now) / 500);
            ctx.fillStyle = l.color;
            ctx.fillText(l.text, 620, y);
            y += 26;
        }
        ctx.globalAlpha = 1;
    },
};

// ---------- 启动 ----------
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('badge').textContent = VERSION;
    document.getElementById('badge-tip').textContent = VERSION;
    game.init();
});
window._tetrisGame = game;   // 测试钩子
