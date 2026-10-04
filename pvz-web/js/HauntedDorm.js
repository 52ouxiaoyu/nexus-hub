// ===== 猛鬼宿舍（大地图模式）Haunted Dorm =====
// v3.86.0 战斗闭环重构：豌豆自动射击 / 僵尸可击杀+掉落阳光 / 玩家可受伤死亡 /
//          波次递进(8波胜利) / 撞墙绕行 / 土豆雷可引爆 / 音效+受击反馈 / 小地图 / 胜负结算。
// 保留 v3.84 核心趣味：40×30 大地图随机房间、门板坚果、床(阳光菇)空格浇水攒阳光。
class HauntedDorm {
    constructor() {
        this.cols = 40;
        this.rows = 30;
        this.gridSize = 80;
        this.worldWidth = this.cols * this.gridSize;
        this.worldHeight = this.rows * this.gridSize;

        const cx = this.worldWidth / 2;
        const cy = this.worldHeight / 2;

        const urlParams = new URLSearchParams(window.location.search);
        this.role = urlParams.get('role') || 'plant';

        this.player = {
            x: cx, y: cy, sun: 50, hp: 100, maxHp: 100,
            icon: this.role === 'zombie' ? 'assets/images/Zombies/Zombie/0.gif' : 'assets/images/Plants/Peashooter/0.gif',
            camX: 0, camY: 0
        };

        this.keys = {};
        this.walls = new Set();
        this.plants = [];
        this.zombies = [];
        this.peas = [];   // 豌豆弹
        this.suns = [];   // 僵尸掉落的阳光袋
        this.zombiesSpawned = false;

        // 波次系统：首波 20s，此后每 35s 一波，挺过 8 波（清完第 8 波）= 胜利
        this.wave = 0;
        this.nextWaveAt = 20000;
        this.waveTotal = 8;
        this.kills = 0;
        this.over = false;
        this.lastFlashAt = 0;

        this.lastWaterTime = 0;
        this.menuOpen = false;
        this.menuCol = -1;
        this.menuRow = -1;

        this.initDOM();
        this.generateMap();
        this.bindInput();
        this._updateWaveChip();

        this.startTime = performance.now();
        this.lastTime = this.startTime;
        requestAnimationFrame(t => this.loop(t));
    }

    initDOM() {
        this.world1 = document.getElementById('world1');
        this.vp1 = document.getElementById('vp1');

        this.world1.style.width = this.worldWidth + 'px';
        this.world1.style.height = this.worldHeight + 'px';

        this.player.el1 = document.createElement('div');
        this.player.el1.className = 'entity avatar';
        this.player.el1.innerHTML = `<img src="${this.player.icon}">`;
        this.world1.appendChild(this.player.el1);

        this.plantMenu = document.getElementById('plant-menu');
        this.minimap = document.getElementById('minimap').getContext('2d');
    }

    // 简易音效（独立页面不引 AudioManager，直接用主素材库音频）
    playSfx(name, vol = 0.5) {
        try {
            const a = new Audio('assets/audio/' + name);
            a.volume = vol;
            a.play().catch(() => {});
        } catch (e) {}
    }

    generateMap() {
        const center1 = document.createElement('div');
        center1.className = 'tile center';
        center1.style.left = (this.worldWidth / 2 - 120) + 'px';
        center1.style.top = (this.worldHeight / 2 - 120) + 'px';
        center1.style.width = '240px'; center1.style.height = '240px';
        this.world1.appendChild(center1);

        this.rooms = [];

        // 房间形状模板 (1=地面)
        const templates = [
            { // 4x4 矩形
                grid: [[1,1,1,1],[1,1,1,1],[1,1,1,1],[1,1,1,1]],
                door: {r: 4, c: 2}, bed: {r: 1, c: 2}
            },
            { // L型
                grid: [[1,1,0,0],[1,1,0,0],[1,1,1,1],[1,1,1,1]],
                door: {r: 4, c: 1}, bed: {r: 1, c: 0}
            },
            { // 凹型
                grid: [[1,1,0,1,1],[1,1,0,1,1],[1,1,1,1,1],[1,1,1,1,1]],
                door: {r: 4, c: 2}, bed: {r: 2, c: 2}
            },
            { // 长条型
                grid: [[1,1,1],[1,1,1],[1,1,1],[1,1,1],[1,1,1]],
                door: {r: 5, c: 1}, bed: {r: 1, c: 1}
            }
        ];

        for (let i = 0; i < 10; i++) {
            let tpl, rx, ry, valid = false;
            let attempts = 0;
            while (!valid && attempts < 1000) {
                attempts++;
                tpl = templates[Math.floor(Math.random() * templates.length)];
                const rw = tpl.grid[0].length;
                const rh = tpl.grid.length;

                rx = Math.floor(Math.random() * (this.cols - rw - 4)) + 2;
                ry = Math.floor(Math.random() * (this.rows - rh - 4)) + 2;

                if (Math.abs(rx - this.cols/2) < 6 && Math.abs(ry - this.rows/2) < 6) continue;

                valid = true;
                for (const rm of this.rooms) {
                    if (!(rx + rw + 2 < rm.x || rx - 2 > rm.x + rm.w ||
                          ry + rh + 2 < rm.y || ry - 2 > rm.y + rm.h)) {
                        valid = false;
                        break;
                    }
                }
            }
            if (valid) {
                this.rooms.push({ x: rx, y: ry, w: tpl.grid[0].length, h: tpl.grid.length, tpl: tpl });
            }
        }

        // 渲染墙体
        for (const rm of this.rooms) {
            const isInside = (r, c) => r>=0 && r<rm.h && c>=0 && c<rm.w && rm.tpl.grid[r][c] === 1;
            for (let r = -1; r <= rm.h; r++) {
                for (let c = -1; c <= rm.w; c++) {
                    if (isInside(r, c)) continue;

                    if (isInside(r-1, c) || isInside(r+1, c) || isInside(r, c-1) || isInside(r, c+1) ||
                        isInside(r-1, c-1) || isInside(r-1, c+1) || isInside(r+1, c-1) || isInside(r+1, c+1)) {

                        // 生成门（门板=坚果墙，被啃掉即门户洞开）
                        if (r === rm.tpl.door.r && c === rm.tpl.door.c) {
                            this.spawnPlant(rm.x + c, rm.y + r, 'wallnut', true);
                            rm.doorCol = rm.x + c;
                            rm.doorRow = rm.y + r;
                            continue;
                        }

                        const key = `${rm.x + c},${rm.y + r}`;
                        this.walls.add(key);

                        const wall1 = document.createElement('div');
                        wall1.className = 'tile wall';
                        wall1.style.left = ((rm.x + c) * this.gridSize) + 'px';
                        wall1.style.top = ((rm.y + r) * this.gridSize) + 'px';
                        this.world1.appendChild(wall1);
                    }
                }
            }

            // 生成床(阳光菇)
            this.spawnPlant(rm.x + rm.tpl.bed.c, rm.y + rm.tpl.bed.r, 'sunshroom');
        }
    }

    spawnPlant(col, row, type, isDoor = false) {
        if (this.plants.some(pl => pl.c === col && pl.r === row)) return;

        const pTypes = {
            'sunshroom': { src: 'assets/images/Plants/SunShroom/0.gif', hp: 300 },
            'wallnut': { src: 'assets/images/Plants/WallNut/0.gif', hp: 4000 },
            'puffshroom': { src: 'assets/images/Plants/PuffShroom/0.gif', hp: 300 },
            'peashooter': { src: 'assets/images/Plants/Peashooter/0.gif', hp: 300 },
            'potatomine': { src: 'assets/images/Plants/PotatoMine/0.gif', hp: 300 }
        };

        const maxHp = pTypes[type].hp;
        const pt = { r: row, c: col, type: type, hp: maxHp, maxHp: maxHp, isDoor: isDoor, shootCd: 1.5 };

        const el1 = document.createElement('div');
        el1.className = 'tile';
        el1.style.left = (col * this.gridSize) + 'px';
        el1.style.top = (row * this.gridSize) + 'px';

        const img = `<img src="${pTypes[type].src}" style="width:100%; height:100%; object-fit:contain; transform: scale(1.2) translateY(-10px);">`;

        // 血条 (只要受伤就会显示)
        const hpBar = `<div class="hp-bar-bg"><div class="hp-bar-fg" style="width:100%;"></div></div>`;

        el1.innerHTML = hpBar + img;
        this.world1.appendChild(el1);
        pt.el1 = el1;
        this.plants.push(pt);

        if (type === 'sunshroom') {
            const txt = document.createElement('div');
            txt.className = 'float-text';
            txt.innerText = '浇水 (空格)';
            el1.appendChild(txt);
            pt.txtEl = txt;
        }
    }

    spawnZombie(x, y) {
        // 波次成长：血量/速度随波数缓涨（有上限，保证豌豆火力跟得上）
        const w = Math.max(1, this.wave);
        const hp = 300 + 70 * (w - 1);
        const speed = Math.min(150, 80 + 8 * (w - 1));
        const zb = { x, y, hp: hp, maxHp: hp, speed: speed, side: Math.random() < 0.5 ? 1 : -1, stuck: 0, detourT: 0 };
        this.zombies.push(zb);

        const zEl1 = document.createElement('div');
        zEl1.className = 'entity avatar';
        zEl1.innerHTML = `<img src="assets/images/Zombies/Zombie/Zombie.gif" style="width:150%; height:150%; transform:translate(-20%, -30%);">` +
            `<div class="hp-bar-bg" style="top:-14px;"><div class="hp-bar-fg" style="width:100%; background:#ff5252;"></div></div>`;
        this.world1.appendChild(zEl1);
        zb.el1 = zEl1;
        zb.hpBg = zEl1.querySelector('.hp-bar-bg');
        zb.hpFg = zEl1.querySelector('.hp-bar-fg');
    }

    // 从某个房间的门外 2 格刷僵尸（优先），落点撞墙则换房间，兜底玩家远处随机点
    _waveSpawnPoint() {
        for (let tries = 0; tries < 30; tries++) {
            const rm = this.rooms[Math.floor(Math.random() * this.rooms.length)];
            const d = rm.tpl.door;
            let dx = 0, dy = 0;
            if (d.r >= rm.h) dy = 1; else if (d.r < 0) dy = -1;
            else if (d.c >= rm.w) dx = 1; else dx = -1;
            const c = rm.x + d.c + dx * 2, r = rm.y + d.r + dy * 2;
            if (!this.walls.has(`${c},${r}`)) return { x: c * this.gridSize + 40, y: r * this.gridSize + 40 };
        }
        // 兜底：玩家 700px 外随机空地
        for (let tries = 0; tries < 60; tries++) {
            const x = 100 + Math.random() * (this.worldWidth - 200);
            const y = 100 + Math.random() * (this.worldHeight - 200);
            if (Math.hypot(x - this.player.x, y - this.player.y) < 700) continue;
            if (!this.checkCollision(x, y)) return { x, y };
        }
        return { x: 100, y: 100 };
    }

    startWave() {
        this.wave++;
        const count = 2 + this.wave; // 首波3只，逐波+1
        for (let i = 0; i < count; i++) {
            const p = this._waveSpawnPoint();
            this.spawnZombie(p.x + (Math.random()-0.5)*60, p.y + (Math.random()-0.5)*60);
        }
        const msg = document.createElement('div');
        msg.id = 'wave-announce';
        msg.style = "position:absolute; top:38%; left:50%; transform:translate(-50%,-50%); color:#ff4b4b; font-size:44px; font-weight:bold; text-shadow:3px 3px 0 #000; z-index:9999; font-family:'Kaiti SC',serif; letter-spacing:6px;";
        msg.innerText = this.wave === 1 ? '👻 猛鬼出笼！' : `第 ${this.wave} 波来袭！`;
        document.body.appendChild(msg);
        setTimeout(() => msg.remove(), 2600);
        this.playSfx(this.wave === 1 ? 'evillaugh.mp3' : 'finalwave.mp3', 0.55);
        this._updateWaveChip();
    }

    _updateWaveChip() {
        const chip = document.getElementById('wave-chip');
        if (!chip) return;
        if (this.wave === 0) {
            const s = Math.ceil((this.nextWaveAt) / 1000);
            chip.innerText = `准备中 · 第一波还有 ${s}s`;
        } else {
            chip.innerText = `第 ${this.wave}/${this.waveTotal} 波 · 场上 ${this.zombies.length} 只 · 击杀 ${this.kills}`;
        }
    }

    addSun(n) {
        this.player.sun = Math.max(0, this.player.sun + n);
        document.getElementById('sun1').innerText = this.player.sun;
    }

    setHp() {
        const p = this.player;
        const pct = Math.max(0, p.hp / p.maxHp * 100);
        document.getElementById('hp-fill').style.width = pct + '%';
        document.getElementById('hp-num').innerText = Math.max(0, Math.ceil(p.hp));
    }

    // 受击红闪（节流）
    flashDamage() {
        const now = performance.now();
        if (now - this.lastFlashAt < 300) return;
        this.lastFlashAt = now;
        const f = document.getElementById('dmg-flash');
        f.style.opacity = 1;
        setTimeout(() => f.style.opacity = 0, 180);
        this.playSfx('chompsoft.mp3', 0.6);
    }

    gameOver(win) {
        if (this.over) return;
        this.over = true;
        document.getElementById('wave-announce')?.remove(); // 结算时移除残留的波次播报字
        this.playSfx(win ? 'winmusic.mp3' : 'losemusic.mp3', 0.6);
        const secs = Math.floor((performance.now() - this.startTime) / 1000);
        document.getElementById('ov-title').innerText = win ? '🏆 你活下来了！' : '💀 被猛鬼抓住了…';
        document.getElementById('ov-title').style.color = win ? '#ffd54a' : '#ff6b6b';
        document.getElementById('ov-time').innerText = `${Math.floor(secs/60)}:${String(secs%60).padStart(2,'0')}`;
        document.getElementById('ov-kills').innerText = this.kills;
        document.getElementById('ov-waves').innerText = win ? this.waveTotal : Math.max(0, this.wave - 1);
        document.getElementById('dorm-over').style.display = 'flex';
    }

    openPlantMenu(mouseX, mouseY) {
        if (this.role === 'zombie') return;

        const rect = this.vp1.getBoundingClientRect();
        const worldX = mouseX - rect.left + this.player.camX;
        const worldY = mouseY - rect.top + this.player.camY;

        const col = Math.floor(worldX / this.gridSize);
        const row = Math.floor(worldY / this.gridSize);

        if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return;
        if (this.walls.has(`${col},${row}`)) return;
        if (this.plants.some(pl => pl.c === col && pl.r === row)) return;

        this.menuCol = col;
        this.menuRow = row;
        this.menuOpen = true;

        this.plantMenu.style.display = 'flex';
        this.plantMenu.style.left = (mouseX + 20) + 'px';
        this.plantMenu.style.top = (mouseY - 20) + 'px';
    }

    doPlant(type, cost) {
        this.plantMenu.style.display = 'none';
        this.menuOpen = false;

        if (this.player.sun >= cost) {
            this.addSun(-cost);
            this.playSfx('buttonclick.mp3', 0.5);
            this.spawnPlant(this.menuCol, this.menuRow, type);
        }
    }

    bindInput() {
        window.addEventListener('keydown', e => this.keys[e.key.toLowerCase()] = true);
        window.addEventListener('keyup', e => this.keys[e.key.toLowerCase()] = false);

        this.vp1.addEventListener('mousedown', e => {
            if (e.target.closest('#plant-menu')) return;
            if (this.menuOpen) {
                this.plantMenu.style.display = 'none';
                this.menuOpen = false;
                return;
            }
            this.openPlantMenu(e.clientX, e.clientY);
        });
    }

    checkCollision(x, y) {
        const r = 25;
        const corners = [
            { c: Math.floor((x-r)/this.gridSize), r: Math.floor((y-r)/this.gridSize) },
            { c: Math.floor((x+r)/this.gridSize), r: Math.floor((y-r)/this.gridSize) },
            { c: Math.floor((x-r)/this.gridSize), r: Math.floor((y+r)/this.gridSize) },
            { c: Math.floor((x+r)/this.gridSize), r: Math.floor((y+r)/this.gridSize) }
        ];
        return corners.some(p => this.walls.has(`${p.c},${p.r}`));
    }

    getPlantAt(x, y) {
        const c = Math.floor(x / this.gridSize);
        const r = Math.floor(y / this.gridSize);
        return this.plants.find(pl => pl.c === c && pl.r === r);
    }

    // 豌豆射手：向 320px 内最近僵尸发射直线弹（1.5s/发，20 伤）
    _updateShooting(dt) {
        for (const pl of this.plants) {
            if (pl.type !== 'peashooter') continue;
            pl.shootCd -= dt;
            if (pl.shootCd > 0) continue;
            const px = pl.c * this.gridSize + 40, py = pl.r * this.gridSize + 40;
            let best = null, bestD = 320;
            for (const zb of this.zombies) {
                const d = Math.hypot(zb.x - px, zb.y - py);
                if (d < bestD) { bestD = d; best = zb; }
            }
            if (!best) continue;
            pl.shootCd = 1.5;
            const dx = (best.x - px) / bestD, dy = (best.y - py) / bestD;
            const el = document.createElement('div');
            el.className = 'entity';
            el.style.cssText = 'width:26px;height:26px;z-index:90;';
            el.innerHTML = `<img src="assets/images/Plants/PB00.gif" style="width:100%;height:100%;object-fit:contain;">`;
            this.world1.appendChild(el);
            this.peas.push({ x: px, y: py, vx: dx * 500, vy: dy * 500, el, life: 1.2 });
        }
    }

    _updatePeas(dt) {
        for (const pea of this.peas) {
            pea.x += pea.vx * dt;
            pea.y += pea.vy * dt;
            pea.life -= dt;
            // 撞墙消失
            const c = Math.floor(pea.x / this.gridSize), r = Math.floor(pea.y / this.gridSize);
            if (this.walls.has(`${c},${r}`)) pea.life = 0;
            // 命中检测（25px）
            for (const zb of this.zombies) {
                if (Math.hypot(zb.x - pea.x, zb.y - pea.y) < 34) {
                    pea.life = 0;
                    zb.hp -= 20;
                    if (zb.hpBg) {
                        zb.hpBg.style.display = 'block';
                        zb.hpFg.style.width = Math.max(0, zb.hp / zb.maxHp * 100) + '%';
                    }
                    zb.el1.style.filter = 'brightness(2.2)';
                    setTimeout(() => { if (zb.el1) zb.el1.style.filter = ''; }, 90);
                    this.playSfx('bowlingimpact2.mp3', 0.25);
                    if (zb.hp <= 0) this._killZombie(zb);
                    break;
                }
            }
            pea.el.style.left = pea.x + 'px';
            pea.el.style.top = pea.y + 'px';
        }
        this.peas = this.peas.filter(p => {
            if (p.life > 0) return true;
            p.el.remove();
            return false;
        });
    }

    _killZombie(zb) {
        if (zb.dead) return;
        zb.dead = true;
        this.kills++;
        // 死亡动画：放大淡出
        zb.el1.style.transition = 'all 0.45s ease-in';
        zb.el1.style.transform = 'translate(-50%, -50%) scale(1.25) rotate(12deg)';
        zb.el1.style.opacity = '0';
        setTimeout(() => zb.el1.remove(), 480);
        this.playSfx('scream.mp3', 0.35);
        // 掉落阳光袋
        const el = document.createElement('div');
        el.className = 'entity';
        el.style.cssText = 'width:44px;height:44px;z-index:80;';
        el.innerHTML = `<img src="assets/images/Sun/Sun.gif" style="width:100%;height:100%;object-fit:contain;">`;
        el.style.left = zb.x + 'px';
        el.style.top = zb.y + 'px';
        this.world1.appendChild(el);
        this.suns.push({ x: zb.x, y: zb.y, el });
        this._updateWaveChip();
    }

    _updateSuns() {
        this.suns = this.suns.filter(s => {
            if (Math.hypot(s.x - this.player.x, s.y - this.player.y) < 55) {
                s.el.remove();
                this.addSun(25);
                const fly = document.createElement('div');
                fly.innerText = '+25';
                fly.style = `position:absolute; color:yellow; font-weight:bold; font-size:24px; left:${s.x}px; top:${s.y - 30}px; transition:all 0.9s; pointer-events:none; z-index:500; text-shadow:1px 1px 2px #000; transform:translate(-50%,-50%);`;
                this.world1.appendChild(fly);
                setTimeout(() => { fly.style.top = (s.y - 90) + 'px'; fly.style.opacity = 0; }, 40);
                setTimeout(() => fly.remove(), 950);
                this.playSfx('points.mp3', 0.4);
                return false;
            }
            return true;
        });
    }

    // 土豆雷：僵尸踩上引爆，炸死 130px 内僵尸
    _updateMines() {
        for (const pl of [...this.plants]) {
            if (pl.type !== 'potatomine' || pl._arming === undefined) pl._arming = 3; // 3s 拱土起爆准备
            if (pl._arming > 0) { pl._arming -= 1 / 60; continue; }
            const px = pl.c * this.gridSize + 40, py = pl.r * this.gridSize + 40;
            const victim = this.zombies.find(zb => !zb.dead && Math.hypot(zb.x - px, zb.y - py) < 55);
            if (!victim) continue;
            // 引爆
            this.playSfx('explosion.mp3', 0.55);
            const boom = document.createElement('div');
            boom.style.cssText = `position:absolute; left:${px - 130}px; top:${py - 130}px; width:260px; height:260px; border-radius:50%; background:radial-gradient(circle, rgba(255,230,120,0.95) 0%, rgba(255,110,30,0.7) 45%, rgba(255,0,0,0) 72%); z-index:600; pointer-events:none;`;
            this.world1.appendChild(boom);
            setTimeout(() => boom.remove(), 500);
            for (const zb of [...this.zombies]) {
                if (Math.hypot(zb.x - px, zb.y - py) < 130) this._killZombie(zb);
            }
            pl.el1.remove();
            this.plants = this.plants.filter(p => p !== pl);
        }
    }

    _updateMinimap() {
        const ctx = this.minimap;
        const W = 176, H = 132;
        const sx = W / this.worldWidth, sy = H / this.worldHeight;
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = 'rgba(10,25,10,0.5)';
        ctx.fillRect(0, 0, W, H);
        // 房间外框
        ctx.strokeStyle = 'rgba(140,106,77,0.9)';
        ctx.lineWidth = 1.5;
        for (const rm of this.rooms) {
            ctx.strokeRect(rm.x * this.gridSize * sx, rm.y * this.gridSize * sy, rm.w * this.gridSize * sx, rm.h * this.gridSize * sy);
        }
        // 阳光袋
        ctx.fillStyle = '#ffe14a';
        for (const s of this.suns) ctx.fillRect(s.x * sx - 1.5, s.y * sy - 1.5, 3, 3);
        // 僵尸
        ctx.fillStyle = '#ff5252';
        for (const zb of this.zombies) ctx.fillRect(zb.x * sx - 2, zb.y * sy - 2, 4, 4);
        // 玩家
        ctx.fillStyle = '#4da6ff';
        ctx.beginPath();
        ctx.arc(this.player.x * sx, this.player.y * sy, 3.5, 0, Math.PI * 2);
        ctx.fill();
    }

    loop(time) {
        if (this.over) return; // 结算后冻结
        const dt = Math.min((time - this.lastTime) / 1000, 0.1);
        this.lastTime = time;

        // 波次推进
        if (time - this.startTime > this.nextWaveAt) {
            this.startWave();
            this.nextWaveAt += 35000;
        }
        // 胜利判定：挺满 8 波且场上清空
        if (this.wave >= this.waveTotal && this.zombies.length === 0) {
            this.gameOver(true);
            return;
        }
        if (Math.floor(time / 500) !== Math.floor((time - dt * 1000) / 500)) this._updateWaveChip(); // 0.5s 刷一次波次牌

        const speed = 400;

        let vx1 = 0, vy1 = 0;
        if (this.keys['a'] || this.keys['arrowleft']) vx1 -= speed;
        if (this.keys['d'] || this.keys['arrowright']) vx1 += speed;
        if (this.keys['w'] || this.keys['arrowup']) vy1 -= speed;
        if (this.keys['s'] || this.keys['arrowdown']) vy1 += speed;

        let nx = this.player.x + vx1 * dt;
        let ny = this.player.y;
        if (nx > 20 && nx < this.worldWidth - 20 && !this.checkCollision(nx, ny)) this.player.x = nx;

        nx = this.player.x;
        ny = this.player.y + vy1 * dt;
        if (ny > 30 && ny < this.worldHeight - 10 && !this.checkCollision(nx, ny)) this.player.y = ny;

        // 浇水逻辑
        let nearShroom = null;
        for (const pl of this.plants) {
            if (pl.type === 'sunshroom') {
                pl.txtEl.style.opacity = 0;
                const px = pl.c * this.gridSize + 40;
                const py = pl.r * this.gridSize + 40;
                if (Math.hypot(this.player.x - px, this.player.y - py) < 120) {
                    nearShroom = pl;
                }
            }
        }
        if (nearShroom) {
            nearShroom.txtEl.style.opacity = 1;
            if (this.keys[' '] && time - this.lastWaterTime > 1000) {
                this.lastWaterTime = time;
                this.addSun(25);
                this.playSfx('plant_water.mp3', 0.45);
                // 飘字特效
                const fly = document.createElement('div');
                fly.innerText = '+25';
                fly.style = `position:absolute; color:yellow; font-weight:bold; font-size:24px; left:${nearShroom.c * this.gridSize + 40}px; top:${nearShroom.r * this.gridSize}px; transition:all 1s; pointer-events:none; z-index:500; text-shadow:1px 1px 2px #000;`;
                this.world1.appendChild(fly);
                setTimeout(() => { fly.style.top = (nearShroom.r * this.gridSize - 50) + 'px'; fly.style.opacity = 0; }, 50);
                setTimeout(() => fly.remove(), 1050);
            }
        }

        this._updateShooting(dt);
        this._updatePeas(dt);
        this._updateSuns();
        this._updateMines();

        // 僵尸AI：追踪玩家，啃食沿途植物，接触玩家掉血；撞墙自动切向绕行
        let playerHurt = 0;
        for (const zb of [...this.zombies]) {
            if (zb.dead) continue;
            const targetX = this.player.x;
            const targetY = this.player.y;
            let dx = targetX - zb.x;
            let dy = targetY - zb.y;
            const len = Math.hypot(dx, dy);

            if (len > 1) {
                // 绕行状态：卡住超过 0.4s → 沿切向走 1s
                if (zb.detourT > 0) {
                    zb.detourT -= dt;
                    const px = -dy / len * zb.side, py = dx / len * zb.side;
                    dx = dx / len * 0.35 + px; dy = dy / len * 0.35 + py;
                    const l2 = Math.hypot(dx, dy) || 1;
                    dx /= l2; dy /= l2;
                } else {
                    dx /= len; dy /= len;
                }

                let moved = false;
                const nzx = zb.x + dx * zb.speed * dt;
                const nzy = zb.y + dy * zb.speed * dt;

                // 先看目标格有没有植物（啃食优先）
                const atkPlant = this.getPlantAt(nzx, nzy);
                if (atkPlant) {
                    atkPlant.hp -= 30 * dt; // 攻击植物
                    const bg = atkPlant.el1.querySelector('.hp-bar-bg');
                    const fg = atkPlant.el1.querySelector('.hp-bar-fg');
                    if (bg) {
                        bg.style.display = 'block';
                        fg.style.width = Math.max(0, (atkPlant.hp / atkPlant.maxHp) * 100) + '%';
                    }
                    if (Math.random() < dt * 2) this.playSfx('chomp.mp3', 0.18); // 啃食声随机轻放
                    if (atkPlant.hp <= 0) {
                        atkPlant.el1.remove();
                        this.plants = this.plants.filter(p => p !== atkPlant);
                    }
                    moved = true;
                } else {
                    const bx = !this.checkCollision(nzx, zb.y);
                    const by = !this.checkCollision(zb.x, nzy);
                    if (bx) { zb.x = nzx; moved = true; }
                    if (by) { zb.y = nzy; moved = true; }
                    if (!moved) {
                        zb.stuck += dt;
                        if (zb.stuck > 0.4) { zb.detourT = 1; zb.stuck = 0; if (Math.random() < 0.3) zb.side *= -1; }
                    } else {
                        zb.stuck = 0;
                    }
                }
            }

            // 接触玩家 → 持续掉血（多只叠加）。
            // v3.86.1 修复：原写在 len>1 块内——僵尸与玩家坐标完全重合(len=0)时整块跳过，
            // 出现"贴脸无敌"bug（血量冻结不再下降），判定移到移动块之外
            if (len < 48) {
                playerHurt += 12 * dt;
            }
            zb.el1.style.left = zb.x + 'px'; zb.el1.style.top = zb.y + 'px';
        }
        this.zombies = this.zombies.filter(z => !z.dead || z.el1.parentNode); // 清理已完成动画的死尸

        if (playerHurt > 0) {
            this.player.hp -= playerHurt;
            this.setHp();
            this.flashDamage();
            if (this.player.hp <= 0) { this.gameOver(false); return; }
        }

        this.player.el1.style.left = this.player.x + 'px';
        this.player.el1.style.top = this.player.y + 'px';

        const vpw = this.vp1.clientWidth;
        const vph = this.vp1.clientHeight;

        const cx = Math.max(0, Math.min(this.worldWidth - vpw, this.player.x - vpw / 2));
        const cy = Math.max(0, Math.min(this.worldHeight - vph, this.player.y - vph / 2));
        this.player.camX = cx; this.player.camY = cy;
        this.world1.style.transform = `translate(${-cx}px, ${-cy}px)`;

        this._updateMinimap();

        requestAnimationFrame(t => this.loop(t));
    }
}

window.onload = () => {
    window.game = new HauntedDorm();
};
