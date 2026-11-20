# -*- coding: utf-8 -*-
"""v4.0.139：豌豆弹球去掉卡顿 + 寒冰推箱换寒冰射手 + 第 4 关人物嵌墙

三处根因：
1) 弹球卡顿 = 两个原因叠加
   a. 位移直接用 rAF 的 dt 推 → 某一帧 dt 抖到 33ms，球一次走两倍距离，肉眼就是一顿一顿；
      改成固定步长 1/180 秒的累加器，刷新率 60/120/144 下轨迹完全一致。
   b. 撞砖只翻速度、不做位置分离 → 球陷进砖里每步翻一次方向，在砖面上抖 20~40 帧；
      坚果砖又是整排铺满 700px、把球关在下面来回弹。改成圆-矩形最近点碰撞 + 沿穿透最小方向推出，
      坚果砖从整排改成散落 3 块障碍。
2) 寒冰推箱主角用的 peashooter → snowpea。
3) 第 4 关地图里根本没有 '@'，px/py 停在 (0,0)=左上角墙壁，人物嵌在墙里一步都动不了。
   补上 @，同时给 load() 加兜底：找不到 @（或 @ 落在墙里）就在最下面一行挑中心空地放人。
"""
import io

P = 'js/MiniGames.js'
s = io.open(P, encoding='utf-8').read()
orig = s

# ============ 一、整段替换 Breakout ============
START = "    class Breakout extends Base {"
END = "    /* ================================================================\n     * 6. 植物消消乐（三消）"
i0 = s.index(START)
i1 = s.index(END)
assert i1 > i0

NEW = r"""    class Breakout extends Base {
        setup() {
            this.px = 450; this.pw = 118; this.ph = 16; this.py = 546;
            this.baseSpeed = 415;
            this.balls = [];
            this.lives = 3; this.slow = 0; this.triPending = false;
            this.spawnBall(450, this.py - 26, 250, -330, true);
            this.bricks = [];
            const cols = 8, bw = 84, bh = 26, gx = 4, gy = 6, x0 = 112, y0 = 118;
            // v4.0.139：坚果砖原来是整排 8 块铺满 700px，球被关在下面来回弹（就是卡顿感的主要来源）。
            // 改成散落的 3 块障碍，左右留出行车道，球能上去打上面的砖。
            const NUT_AT = '1,4,6';
            for (let r = 0; r < 5; r++) for (let c = 0; c < cols; c++) {
                const nut = r === 4 && NUT_AT.split(',').indexOf(String(c)) >= 0;
                const type = nut ? 'nut' : (r <= 1 ? 'bucket' : 'grave');
                this.bricks.push({
                    x: x0 + c * (bw + gx), y: y0 + r * (bh + gy), w: bw, h: bh,
                    type, hp: type === 'bucket' ? 3 : type === 'grave' ? 1 : Infinity
                });
            }
            this.drops = [];
            this.msg = ''; this.msgT = 0;
            this.acc = 0;
        }
        get ball() { return this.balls[0] || null; }      // 兼容旧脚本里 active.ball.stuck
        spawnBall(x, y, vx, vy, stuck) {
            const b = { x: x, y: y, vx: vx, vy: vy, r: 9, stuck: !!stuck };
            this.balls.push(b);
            return b;
        }
        splitBalls() {
            const b = this.balls[0];
            if (!b) return;
            const sp = Math.hypot(b.vx, b.vy) || this.baseSpeed;
            const a0 = Math.atan2(b.vy, b.vx);
            [-0.32, 0.32].forEach(off => {
                if (this.balls.length >= 4) return;
                this.spawnBall(b.x, b.y, Math.cos(a0 + off) * sp, Math.sin(a0 + off) * sp, false);
            });
        }
        launch() {
            let any = false;
            for (const b of this.balls) if (b.stuck) { b.stuck = false; any = true; }
            if (any && this.triPending) { this.triPending = false; this.splitBalls(); }
            return any;
        }
        update(dt) {
            if (this.over) return;
            if (this.slow > 0) this.slow -= dt;
            if (this.msgT > 0) this.msgT -= dt;
            // v4.0.139：固定步长推进。原来 isyon 直接用 dt 推位移，掉一帧球就跳两倍距离 → 一顿一顿。
            this.acc = Math.min(this.acc + dt, 0.12);
            const STEP = 1 / 180;
            while (this.acc >= STEP && !this.over) {
                this.physics(STEP);
                this.acc -= STEP;
            }
            if (this.over) return;
            // 掉落道具
            const keep = [];
            for (const d of this.drops) {
                d.v += 180 * dt; d.y += d.v * dt;
                if (d.y > this.py - 16 && d.y < this.py + 18 && Math.abs(d.x - this.px) < this.pw / 2 + 14) { this.grab(d.t); continue; }
                if (d.y < H + 30) keep.push(d);
            }
            this.drops = keep;
            // 通关：可打破的砖清空
            let alive = 0;
            for (const k of this.bricks) if (k.hp > 0 && k.type !== 'nut') { alive++; break; }
            if (!alive) this.end(true);
        }
        physics(h) {
            const sp = this.slow > 0 ? 0.55 : 1;
            const gone = [];
            for (const b of this.balls) {
                if (b.stuck) { b.x = this.px; b.y = this.py - 26; continue; }
                b.x += b.vx * h * sp;
                b.y += b.vy * h * sp;
                this.wallHit(b);
                this.paddleHit(b);
                for (const k of this.bricks) {
                    if (k.hp <= 0 && k.type !== 'nut') continue;
                    if (this.brickHit(b, k)) break;        // 一步只处理一块，角落里不会来回反
                }
                if (b.y - b.r > H + 6) gone.push(b);
            }
            if (gone.length) {
                this.balls = this.balls.filter(b => gone.indexOf(b) < 0);
                if (!this.balls.length) this.loseLife();
            }
        }
        wallHit(b) {
            if (b.x < 60 + b.r) { b.x = 60 + b.r; b.vx = Math.abs(b.vx); }
            if (b.x > 840 - b.r) { b.x = 840 - b.r; b.vx = -Math.abs(b.vx); }
            if (b.y < 86 + b.r) { b.y = 86 + b.r; b.vy = Math.abs(b.vy); }
        }
        paddleHit(b) {
            if (b.vy <= 0) return;
            if (b.y + b.r < this.py || b.y - b.r > this.py + this.ph) return;
            if (Math.abs(b.x - this.px) > this.pw / 2 + b.r) return;
            const off = Math.max(-1, Math.min(1, (b.x - this.px) / (this.pw / 2)));
            const ang = off * 1.05;
            const speed = Math.min(660, Math.hypot(b.vx, b.vy) * 1.02);
            b.vx = Math.sin(ang) * speed;
            b.vy = -Math.abs(Math.cos(ang) * speed);
            // 正中间回弹会变成纯垂直、在一列里反复弹 → 给一个最小的横向分量
            if (Math.abs(b.vx) < speed * 0.26) {
                const dir = off === 0 ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(off);
                b.vx = dir * speed * 0.26;
                b.vy = -Math.sqrt(Math.max(0, speed * speed - b.vx * b.vx));
            }
            b.y = this.py - b.r - 0.5;          // 必须推出去，否则下一步还判命中
        }
        brickHit(b, k) {
            const cx = Math.min(Math.max(b.x, k.x), k.x + k.w);
            const cy = Math.min(Math.max(b.y, k.y), k.y + k.h);
            const dx = b.x - cx, dy = b.y - cy;
            const d2 = dx * dx + dy * dy;
            if (d2 > b.r * b.r) return false;
            if (d2 < 12) {
                // 圆心已经陷进矩形：按最近的一条边推出去
                const dl = b.x - k.x, dr = k.x + k.w - b.x;
                const dtp = b.y - k.y, dbt = k.y + k.h - b.y;
                const m = Math.min(dl, dr, dtp, dbt);
                if (m === dl) { b.x = k.x - b.r; b.vx = -Math.abs(b.vx); }
                else if (m === dr) { b.x = k.x + k.w + b.r; b.vx = Math.abs(b.vx); }
                else if (m === dtp) { b.y = k.y - b.r; b.vy = -Math.abs(b.vy); }
                else { b.y = k.y + k.h + b.r; b.vy = Math.abs(b.vy); }
            } else {
                const d = Math.sqrt(d2);
                const nx = dx / d, ny = dy / d;
                b.x = cx + nx * (b.r + 0.4);
                b.y = cy + ny * (b.r + 0.4);
                const dot = b.vx * nx + b.vy * ny;
                if (dot < 0) { b.vx -= 2 * dot * nx; b.vy -= 2 * dot * ny; }
            }
            if (k.type !== 'nut') {
                k.hp--;
                this.score += k.type === 'bucket' ? 30 : 10;
                if (k.hp <= 0 && Math.random() < 0.22) {
                    const t = ['chili', 'ice', 'tri'][(Math.random() * 3) | 0];
                    this.drops.push({ x: k.x + k.w / 2, y: k.y + k.h / 2, t: t, v: 120 });
                }
            }
            return true;
        }
        grab(t) {
            if (t === 'chili') {
                let n = 0;
                this.bricks.forEach(k => { if (k.hp > 0 && k.hp < 99) { k.hp = 0; n++; } });
                this.score += n * 8; this.msg = '辣椒清屏 · +' + n * 8;
            } else if (t === 'ice') { this.slow = 6; this.msg = '寒冰减速 6 秒'; }
            else {
                // v4.0.139：原来只把 this.extra++ 就完事，根本没有第二颗球（假功能）
                if (this.balls.length >= 4) { this.score += 60; this.msg = '三线射手 · 球已满 +60'; }
                else if (this.balls.some(b => b.stuck)) { this.triPending = true; this.msg = '三线射手 · 发球后分三路'; }
                else { this.splitBalls(); this.msg = '三线射手 · 球数 +2'; }
            }
            this.msgT = 1.4;
        }
        loseLife() {
            this.lives--;
            if (this.lives <= 0) { this.end(false); return; }
            this.balls = [];
            this.triPending = false;
            this.spawnBall(this.px, this.py - 26, 250, -330, true);
            this.acc = 0;
            this.msg = '还剩 ' + this.lives + ' 条命'; this.msgT = 1.3;
        }
        onDown() { if (!this.over) this.launch(); }
        onMove(x) { this.px = Math.max(60 + this.pw / 2, Math.min(840 - this.pw / 2, x)); }
        onKey(down, k) {
            if (!down || this.over) return;
            if (k === 'left' || k === 'a') this.px = Math.max(60 + this.pw / 2, this.px - 46);
            if (k === 'right' || k === 'd') this.px = Math.min(840 - this.pw / 2, this.px + 46);
            if (k === 'space') this.launch();
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
            spr('lilypad', this.px - this.pw / 2 - 10, this.py - 12, this.pw + 20, 40);
            for (const b of this.balls) {
                ctx.fillStyle = '#9ce34a';
                ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.7)';
                ctx.beginPath(); ctx.arc(b.x - 3, b.y - 3, 3, 0, Math.PI * 2); ctx.fill();
            }
            for (const d of this.drops) {
                const col = d.t === 'chili' ? '#e04a2a' : d.t === 'ice' ? '#5ac8f0' : '#e8d24a';
                ctx.fillStyle = col; ctx.beginPath(); ctx.arc(d.x, d.y, 11, 0, Math.PI * 2); ctx.fill();
                txt(d.t === 'chili' ? '辣' : d.t === 'ice' ? '冰' : '三', d.x, d.y + 1, 12, '#fff', 'center', 900);
            }
            txt('生命 ' + Math.max(0, this.lives), 78, 574, 17, '#ff8f6b', 'left', 800);
            txt('分数 ' + this.score, 450, 574, 17, '#ffe9a8', 'center', 700);
            txt('球 ' + this.balls.length, 340, 574, 15, '#9ce34a', 'center', 800);
            txt(this.slow > 0 ? '寒冰减速 ' + this.slow.toFixed(1) + 's' : '', 820, 574, 14, '#7fd8ff', 'right', 700);
            if (this.msgT > 0) txt(this.msg, 450, 500, 18, '#ffe066', 'center', 800);
            if (this.balls.some(b => b.stuck) && !this.over) txt('点击 / 空格 发球', 450, 500, 17, 'rgba(255,255,255,0.75)', 'center', 700);
            if (this.over) this.overlay(this.lives <= 0 ? '防线被突破了' : '全部清空！', '分数 ' + this.score, this.lives <= 0 ? '#ff8f6b' : '#b7f06a');
        }
    }

"""
s = s[:i0] + NEW + s[i1:]

# 上面是模板里带了错字的说明，改回来
s = s.replace('// v4.0.139：固定步长推进。原来 isyon 直接用 dt 推位移，掉一帧球就跳两倍距离 → 一顿一顿。',
              '// v4.0.139：固定步长推进。原来直接用 dt 推位移，掉一帧球就跳两倍距离 → 一顿一顿。')

# ============ 二、推箱子：第 4 关补上 @ ============
OLD_L4 = "        ['##########', '#        #', '#  .  $  #', '#  #  #  #', '#  $  .  #', '#        #', '##########'],"
NEW_L4 = "        ['##########', '#        #', '#  .  $  #', '#  #  #  #', '#  $  .  #', '#   @    #', '##########'],"
assert s.count(OLD_L4) == 1, s.count(OLD_L4)
s = s.replace(OLD_L4, NEW_L4)

# ============ 三、推箱子：load() 兜底放人 ============
OLD_LOAD = """            this.px = 0; this.py = 0; this.steps = 0;
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
            this.tile = Math.min(52, Math.floor(520 / this.w), Math.floor(440 / this.h));"""

NEW_LOAD = """            this.px = 0; this.py = 0; this.steps = 0;
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
            // v4.0.139：地图里没有 @（或者 @ 画在墙里）时，旧代码把 px/py 留在 (0,0) ——
            // 那是左上角墙格，人物直接嵌在墙里一步都走不了（第 4 关就是这个毛病）。
            // 兜底：从最下面一行往上找，挑最靠中间的空地放人。
            if (this.wall[this.py][this.px]) {
                for (let r = this.h - 2; r >= 1; r--) {
                    const cand = [];
                    for (let c = 1; c < this.w - 1; c++) {
                        if (!this.wall[r][c] && !this.box[r][c]) cand.push(c);
                    }
                    if (cand.length) {
                        const mid = this.w / 2;
                        cand.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid));
                        this.px = cand[0]; this.py = r;
                        break;
                    }
                }
            }
            this.tile = Math.min(52, Math.floor(520 / this.w), Math.floor(440 / this.h));"""
assert s.count(OLD_LOAD) == 1, 'load 段没匹配'
s = s.replace(OLD_LOAD, NEW_LOAD)

# ============ 四、推箱子主角：豌豆射手 → 寒冰射手 ============
OLD_HERO = "            // 豌豆射手当主角\n            sprH('peashooter', ox + this.px * t + t * 0.1, oy + this.py * t + t * 0.08, t * 0.84);"
NEW_HERO = "            // v4.0.139：寒冰推箱的主角是寒冰射手（原来错用了普通豌豆射手）\n            sprH('snowpea', ox + this.px * t + t * 0.1, oy + this.py * t + t * 0.08, t * 0.84);"
assert s.count(OLD_HERO) == 1, '主角绘制段没匹配'
s = s.replace(OLD_HERO, NEW_HERO)

# 顺带在关卡提示上写明主角身份
OLD_TIP = "            txt('方向键 / WASD 推冰块', 60, 512, 13, 'rgba(255,255,255,0.55)');"
NEW_TIP = "            txt('方向键 / WASD 控制寒冰射手推冰块', 60, 512, 13, 'rgba(255,255,255,0.55)');"
assert s.count(OLD_TIP) == 1
s = s.replace(OLD_TIP, NEW_TIP)

assert s != orig
io.open(P, 'w', encoding='utf-8').write(s)
print('MiniGames.js 已更新')
