// ===== 猛鬼宿舍（大地图模式）Haunted Dorm =====
// v3.87.0 成长体系重构：
//   浇水 = 每次 +1 阳光（按住空格连浇），且同时催熟身边所有蘑菇（阳光菇/小喷菇一次都浇到）
//   点击植物 = 升级（费用递增）/ 查看浇水进度；配方链唯一、不撞衫
//   阳光菇 →大阳光菇 →向日葵 →双子向日葵（逐级变大，格数不变）
//   小喷菇(200☀) 浇水喂大 →胆小菇(400) →大喷菇(800) →忧郁菇(1600)，产阳光+包子+孢子
//   坚果 →豌豆坚果 →射手坚果 →卷心菜坚果 →高坚果 →南瓜壳
//   豌豆射手 →双发/寒冰/双向（分支三选一）→机枪/冰雪双发/三线
//   孢子高级植物：地刺（站立掉血）/ 眩晕菇（周期冰冻）/ 毁灭菇（超高攻击核弹）
//   包子：蘑菇系产出，走拾取，按 E 扔向最近猛鬼（伤害+眩晕）
// 保留：40×30 大地图随机房间、门板坚果、波次(8波胜利)、小地图、音效、胜负结算。
class HauntedDorm {
    // ===== 植物图鉴（配方唯一，绝不撞衫）=====
    static get DEFS() {
        return {
            // —— 阳光系（点击升级）——
            sunshroom:     { name: '阳光菇',     img: 'Plants/SunShroom/0.gif',     card: 'SunShroom.png',     hp: 300,  cost: 0,   scale: 0.75,
                             produce: { sun: 2, every: 8 },  up: { cost: 10, to: 'sunshroom2' } },
            sunshroom2:    { name: '大阳光菇',   img: 'Plants/SunShroom/0.gif',     hp: 350,  cost: 0,   scale: 1.1,
                             produce: { sun: 3, every: 8 },  up: { cost: 25, to: 'sunflower' } },
            sunflower:     { name: '向日葵',     img: 'Plants/SunFlower/0.gif',     hp: 400,  cost: 0,   scale: 1.1,
                             produce: { sun: 5, every: 7 },  up: { cost: 60, to: 'twinsunflower' } },
            twinsunflower: { name: '双子向日葵', img: 'Plants/TwinSunflower/0.gif', hp: 450,  cost: 0,   scale: 1.2,
                             produce: { sun: 10, every: 7 } },
            // —— 蘑菇系（浇水喂大，产包子+孢子）——
            puffshroom:    { name: '小喷菇', img: 'Plants/PuffShroom/0.gif',     card: 'PuffShroom.png',     hp: 300, cost: 200, scale: 0.9,
                             bao: { n: 1, every: 20 }, spore: { n: 1, every: 12 }, feed: { goal: 400, to: 'scaredyshroom' } },
            scaredyshroom: { name: '胆小菇', img: 'Plants/ScaredyShroom/0.gif',  card: 'ScaredyShroom.png',  hp: 400, cost: 0,   scale: 1.0,
                             bao: { n: 2, every: 20 }, spore: { n: 2, every: 12 }, feed: { goal: 800, to: 'fumeshroom' } },
            fumeshroom:    { name: '大喷菇', img: 'Plants/FumeShroom/0.gif',     card: 'FumeShroom.png',     hp: 500, cost: 0,   scale: 1.15,
                             bao: { n: 2, every: 18 }, spore: { n: 3, every: 12 }, shoot: { dmg: 25, cd: 1.6, n: 1, range: 240, img: 'Plants/ShroomBullet.gif' },
                             feed: { goal: 1600, to: 'gloomshroom' } },
            gloomshroom:   { name: '忧郁菇', img: 'Plants/GloomShroom/0.gif',    card: 'GloomShroom.png',    hp: 600, cost: 0,   scale: 1.25,
                             bao: { n: 4, every: 18 }, spore: { n: 4, every: 10 }, shoot: { dmg: 30, cd: 1.4, n: 3, range: 210, img: 'Plants/ShroomBullet.gif', fan: 0.5 } },
            // —— 豌豆系（攻击，分支三选一，配方唯一）——
            peashooter:    { name: '豌豆射手', img: 'Plants/Peashooter/0.gif',   card: 'Peashooter.png',  hp: 300, cost: 100,
                             shoot: { dmg: 20, cd: 1.5, n: 1, range: 320, img: 'Plants/PB00.gif' }, up: { cost: 250, to: 'repeater' } },
            repeater:      { name: '双发射手', img: 'Plants/Repeater/0.gif',     card: 'Repeater.png',    hp: 350, cost: 0,
                             shoot: { dmg: 20, cd: 1.5, n: 2, range: 320, img: 'Plants/PB00.gif' }, up: { cost: 600, to: 'gatlingpea' } },
            gatlingpea:    { name: '机枪射手', img: 'Plants/GatlingPea/0.gif',   card: 'GatlingPea.png',  hp: 450, cost: 0,   scale: 1.15,
                             shoot: { dmg: 20, cd: 1.5, n: 4, range: 340, img: 'Plants/PB00.gif' } },
            snowpea:       { name: '寒冰射手', img: 'Plants/SnowPea/0.gif',      card: 'SnowPea.png',     hp: 350, cost: 0,
                             shoot: { dmg: 20, cd: 1.5, n: 1, range: 320, img: 'Plants/PB01.gif', slow: true }, up: { cost: 400, to: 'snowrepeater' } },
            snowrepeater:  { name: '冰雪双发', img: 'Plants/SnowRepeater/0.gif',  card: 'SnowRepeater.png', hp: 450, cost: 0,
                             shoot: { dmg: 20, cd: 1.4, n: 2, range: 320, img: 'Plants/PB01.gif', slow: true } },
            splitpea:      { name: '双向射手', img: 'Plants/SplitPea/0.gif',     card: 'SplitPea.png',    hp: 350, cost: 0,
                             shoot: { dmg: 20, cd: 1.5, n: 1, range: 320, img: 'Plants/PB00.gif', back: true }, up: { cost: 500, to: 'threepeater' } },
            threepeater:   { name: '三线射手', img: 'Plants/Threepeater/0.gif',  card: 'Threepeater.png', hp: 450, cost: 0,   scale: 1.15,
                             shoot: { dmg: 20, cd: 1.5, n: 3, range: 320, img: 'Plants/PB00.gif', fan: 0.35 } },
            // —— 坚果系（肉盾→攻防一体）——
            wallnut:       { name: '坚果',       img: 'Plants/WallNut/0.gif',       card: 'WallNut.png',     hp: 4000,  cost: 50,
                             up: { cost: 100, to: 'nutshooter' } },
            nutshooter:    { name: '豌豆坚果',   img: 'Fusions/nutshooter.png',     card: 'nutshooter',      hp: 5000,  cost: 0,
                             shoot: { dmg: 20, cd: 1.6, n: 1, range: 320, img: 'Plants/PB00.gif' }, up: { cost: 250, to: 'nutgunner' } },
            nutgunner:     { name: '射手坚果',   img: 'Fusions/nutshooter.png',     card: 'nutshooter',      hp: 6500,  cost: 0, tint: 'saturate(1.4) brightness(1.12)',
                             shoot: { dmg: 20, cd: 1.3, n: 2, range: 320, img: 'Plants/PB00.gif' }, up: { cost: 400, to: 'cabbagenut' } },
            cabbagenut:    { name: '卷心菜坚果', img: 'Plants/WallNut/0.gif',       card: 'CabbagePult.png', hp: 8000,  cost: 0, hat: 'Plants/CabbagePult/Cabbage.png',
                             lob: { dmg: 45, cd: 2.2, range: 420, aoe: 70, img: 'Plants/CabbagePult/Cabbage.png' }, up: { cost: 500, to: 'tallnut' } },
            tallnut:       { name: '高坚果',     img: 'Plants/TallNut/0.gif',       card: 'TallNut.png',     hp: 10000, cost: 0,
                             up: { cost: 800, to: 'pumpkin' } },
            pumpkin:       { name: '南瓜壳',     img: 'Plants/PumpkinHead/0.gif',   card: 'PumpkinHead.png', hp: 15000, cost: 0 },
            // —— 特殊 ——
            potatomine:    { name: '土豆雷', img: 'Plants/PotatoMine/0.gif', card: 'PotatoMine.png', hp: 300, cost: 25, mine: true },
            spikeweed:     { name: '地刺',   img: 'Plants/Spikeweed/0.gif',  card: 'Spikeweed.png',  hp: 99999, cost: 50, sporeCost: 50, ground: true,
                             spike: { dps: 40, r: 55 } },
            iceshroom:     { name: '眩晕菇', img: 'Plants/IceShroom/0.gif',  card: 'IceShroom.png',  hp: 300,  cost: 100, sporeCost: 100,
                             freeze: { every: 6, r: 170, t: 2 } },
            doomshroom:    { name: '毁灭菇', img: 'Plants/DoomShroom/0.gif', card: 'DoomShroom.png', hp: 300,  cost: 200, sporeCost: 200,
                             nuke: { r: 190, arm: 5 } }
        };
    }

    // 商店可购清单（阳光 / 孢子两种货币）
    static get MENU() {
        return ['puffshroom', 'peashooter', 'wallnut', 'potatomine', 'spikeweed', 'iceshroom', 'doomshroom'];
    }

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
            x: cx, y: cy, sun: 50, spore: 0, bao: 0, hp: 100, maxHp: 100,
            icon: this.role === 'zombie' ? 'assets/images/Zombies/Zombie/0.gif' : 'assets/images/Plants/Peashooter/0.gif',
            camX: 0, camY: 0
        };

        this.keys = {};
        this.walls = new Set();
        this.plants = [];
        this.zombies = [];
        this.peas = [];   // 各类弹道
        this.suns = [];   // 僵尸掉落的阳光袋
        this.baos = [];   // 地上的包子
        this.zombiesSpawned = false;

        // 波次系统：首波 20s，此后每 35s 一波，挺过 8 波（清完第 8 波）= 胜利
        this.wave = 0;
        this.nextWaveAt = 20000;
        this.waveTotal = 8;
        this.kills = 0;
        this.over = false;
        this.lastFlashAt = 0;

        this.lastWaterTime = 0;
        this.lastBaoTime = 0;
        this.menuOpen = false;
        this.menuCol = -1;
        this.menuRow = -1;

        this.initDOM();
        this.generateMap();
        this.bindInput();
        this._updateWaveChip();
        this._refreshHud();

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

        // 商店菜单（数据驱动生成）
        const defs = HauntedDorm.DEFS;
        this.plantMenu.innerHTML = HauntedDorm.MENU.map(t => {
            const d = defs[t];
            const price = d.sporeCost ? `🦠${d.sporeCost}` : (d.cost > 0 ? `☀${d.cost}` : '免费');
            return `<div class="plant-option" data-t="${t}"><img src="assets/images/Card/Plants/${d.card}"><br>${d.name}(${price})</div>`;
        }).join('');
        this.plantMenu.addEventListener('click', e => {
            const opt = e.target.closest('.plant-option');
            if (opt) this.doPlant(opt.dataset.t);
        });
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

        const defs = HauntedDorm.DEFS;
        const def = defs[type];
        if (!def) return;

        const maxHp = def.hp;
        const pl = { r: row, c: col, type: type, def: def, hp: maxHp, maxHp: maxHp, isDoor: isDoor,
                     shootCd: 1.5, prodT: 0, baoT: 0, sporeT: 0, fed: 0, freezeT: 0 };

        const el1 = document.createElement('div');
        el1.className = 'tile';
        el1.style.left = (col * this.gridSize) + 'px';
        el1.style.top = (row * this.gridSize) + 'px';

        const scale = def.scale || 1.0;
        const tint = def.tint ? `filter:${def.tint};` : '';
        let inner = `<img src="assets/images/${def.img}" style="width:100%; height:100%; object-fit:contain; transform: scale(${1.2 * scale}) translateY(-10px); ${tint}">`;
        if (def.hat) {
            inner += `<img src="assets/images/${def.hat}" style="position:absolute; left:22%; top:-34%; width:56%; pointer-events:none;">`;
        }

        // 血条 (只要受伤就会显示)
        const hpBar = `<div class="hp-bar-bg"><div class="hp-bar-fg" style="width:100%;"></div></div>`;

        el1.innerHTML = hpBar + inner;
        this.world1.appendChild(el1);
        pl.el1 = el1;
        this.plants.push(pl);

        // 植物下方提示条：升级费用 / 浇水进度
        this._refreshPrompt(pl);
        return pl;
    }

    _refreshPrompt(pl) {
        const def = pl.def;
        let txt = '';
        if (def.feed) txt = `浇水 ${Math.min(pl.fed, def.feed.goal)}/${def.feed.goal}`;
        else if (def.up) txt = `点击升级 ☀${def.up.cost}`;
        if (!txt) { if (pl.txtEl) { pl.txtEl.remove(); pl.txtEl = null; } return; }
        if (!pl.txtEl) {
            pl.txtEl = document.createElement('div');
            pl.txtEl.className = 'float-text';
            pl.el1.appendChild(pl.txtEl);
        }
        pl.txtEl.innerText = txt;
        pl.txtEl.style.opacity = pl._hint ? 1 : 0;
    }

    _setHint(pl, on) {
        pl._hint = on;
        if (pl.txtEl) pl.txtEl.style.opacity = on ? 1 : 0;
    }

    // 点击植物：可升级则升级（费用递增），蘑菇显示浇水进度
    plantClick(pl) {
        if (this.role === 'zombie') return;
        const def = pl.def;
        if (def.up) {
            if (this.player.sun >= def.up.cost) {
                this.addSun(-def.up.cost);
                this.playSfx('readysetplant.mp3', 0.5);
                this._flyText(pl.c * 80 + 40, pl.r * 80, `${def.name} → ${HauntedDorm.DEFS[def.up.to].name}！`, '#9dff6b');
                this._evolve(pl, def.up.to);
            } else {
                this._flyText(pl.c * 80 + 40, pl.r * 80, `阳光不足（需 ☀${def.up.cost}）`, '#ff8a8a');
                this.playSfx('buttonclick.mp3', 0.35);
            }
            return;
        }
        if (def.feed) {
            this._flyText(pl.c * 80 + 40, pl.r * 80 - 30,
                `浇水 ${pl.fed}/${def.feed.goal}${pl.fed >= def.feed.goal ? ' ✓' : '（站旁边按空格）'}`, '#ffe14a');
            return;
        }
        this._flyText(pl.c * 80 + 40, pl.r * 80, def.name, '#fff');
    }

    _evolve(pl, to) {
        const col = pl.c, row = pl.r;
        pl.el1.remove();
        this.plants = this.plants.filter(p => p !== pl);
        this.spawnPlant(col, row, to);
    }

    spawnZombie(x, y) {
        // 波次成长：血量/速度随波数缓涨（有上限，保证植物火力跟得上）
        const w = Math.max(1, this.wave);
        const hp = 300 + 90 * (w - 1);
        const speed = Math.min(160, 85 + 8 * (w - 1));
        const zb = { x, y, hp: hp, maxHp: hp, speed: speed, side: Math.random() < 0.5 ? 1 : -1, stuck: 0, detourT: 0, stunT: 0, slowT: 0 };
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
            chip.innerText = `第 ${this.wave}/${this.waveTotal} 波 · 场上 ${this.zombies.filter(z=>!z.dead).length} 只 · 击杀 ${this.kills}`;
        }
    }

    addSun(n) {
        this.player.sun = Math.max(0, this.player.sun + n);
        document.getElementById('sun1').innerText = this.player.sun;
    }

    addSpore(n) {
        this.player.spore = Math.max(0, this.player.spore + n);
        const el = document.getElementById('spore1');
        if (el) el.innerText = this.player.spore;
    }

    addBao(n) {
        this.player.bao = Math.max(0, this.player.bao + n);
        const el = document.getElementById('bao1');
        if (el) el.innerText = this.player.bao;
    }

    _refreshHud() {
        document.getElementById('sun1').innerText = this.player.sun;
        document.getElementById('spore1').innerText = this.player.spore;
        document.getElementById('bao1').innerText = this.player.bao;
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

    _flyText(x, y, text, color) {
        const fly = document.createElement('div');
        fly.innerText = text;
        fly.style = `position:absolute; color:${color || 'yellow'}; font-weight:bold; font-size:22px; left:${x}px; top:${y - 30}px; transition:all 1s; pointer-events:none; z-index:500; text-shadow:1px 1px 2px #000; transform:translate(-50%,-50%); white-space:nowrap;`;
        this.world1.appendChild(fly);
        setTimeout(() => { fly.style.top = (y - 90) + 'px'; fly.style.opacity = 0; }, 40);
        setTimeout(() => fly.remove(), 1050);
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

    doPlant(type) {
        this.plantMenu.style.display = 'none';
        this.menuOpen = false;

        const def = HauntedDorm.DEFS[type];
        if (!def) return;
        if (def.sporeCost) {
            if (this.player.spore < def.sporeCost) { this._flyText(this.player.x, this.player.y, '孢子不足', '#ff8a8a'); return; }
            this.addSpore(-def.sporeCost);
        } else if (def.cost > 0) {
            if (this.player.sun < def.cost) { this._flyText(this.player.x, this.player.y, '阳光不足', '#ff8a8a'); return; }
            this.addSun(-def.cost);
        }
        this.playSfx('buttonclick.mp3', 0.5);
        this.spawnPlant(this.menuCol, this.menuRow, type);
    }

    bindInput() {
        window.addEventListener('keydown', e => {
            this.keys[e.key.toLowerCase()] = true;
            if (e.key.toLowerCase() === 'e') this.throwBao();
        });
        window.addEventListener('keyup', e => this.keys[e.key.toLowerCase()] = false);

        this.vp1.addEventListener('mousedown', e => {
            if (e.target.closest('#plant-menu')) return;
            if (this.menuOpen) {
                this.plantMenu.style.display = 'none';
                this.menuOpen = false;
                return;
            }
            // 点在植物上 → 升级/喂食交互；点空地 → 种植菜单
            const rect = this.vp1.getBoundingClientRect();
            const worldX = e.clientX - rect.left + this.player.camX;
            const worldY = e.clientY - rect.top + this.player.camY;
            const pl = this.getPlantAt(worldX, worldY);
            if (pl) { this.plantClick(pl); return; }
            this.openPlantMenu(e.clientX, e.clientY);
        });
    }

    // ===== 浇水：每次 +1 阳光，并催熟身边所有蘑菇（同时浇水）=====
    _water() {
        this.addSun(1);
        this.playSfx('plant_water.mp3', 0.4);
        let fedAny = false;
        for (const pl of this.plants) {
            if (!pl.def.feed) continue;
            const px = pl.c * 80 + 40, py = pl.r * 80 + 40;
            if (Math.hypot(this.player.x - px, this.player.y - py) < 130) {
                fedAny = true;
                pl.fed++;
                if (pl.fed >= pl.def.feed.goal) {
                    this._flyText(px, py, `${pl.def.name} 进化了！`, '#9dff6b');
                    this.playSfx('readysetplant.mp3', 0.5);
                    this._evolve(pl, pl.def.feed.to);
                } else {
                    this._refreshPrompt(pl);
                }
            }
        }
        this._flyText(this.player.x, this.player.y - 20, fedAny ? '+1 ☀·浇水' : '+1 ☀', '#ffe14a');
    }

    // ===== 包子：按 E 扔向最近猛鬼（35 伤 + 眩晕 1.5s）=====
    throwBao() {
        if (this.over || this.role === 'zombie') return;
        const now = performance.now();
        if (now - this.lastBaoTime < 500) return;
        if (this.player.bao <= 0) { this._flyText(this.player.x, this.player.y - 20, '没有包子', '#ff8a8a'); return; }
        let best = null, bestD = 520;
        for (const zb of this.zombies) {
            if (zb.dead) continue;
            const d = Math.hypot(zb.x - this.player.x, zb.y - this.player.y);
            if (d < bestD) { bestD = d; best = zb; }
        }
        this.lastBaoTime = now;
        if (!best) { this._flyText(this.player.x, this.player.y - 20, '附近没有猛鬼', '#ff8a8a'); return; }
        this.addBao(-1);
        best.hp -= 35;
        best.stunT = Math.max(best.stunT, 1.5);
        best.el1.querySelector('img').style.filter = 'grayscale(0.5) brightness(1.4)';
        setTimeout(() => { if (best.el1) best.el1.querySelector('img').style.filter = ''; }, 1200);
        if (best.hpBg) {
            best.hpBg.style.display = 'block';
            best.hpFg.style.width = Math.max(0, best.hp / best.maxHp * 100) + '%';
        }
        this._flyText(best.x, best.y, '🥟 砸中！', '#ffd54a');
        this.playSfx('bowlingimpact2.mp3', 0.45);
        if (best.hp <= 0) this._killZombie(best);
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

    // ===== 通用弹道 =====
    _firePea(px, py, angle, dmg, opts = {}) {
        const el = document.createElement('div');
        el.className = 'entity';
        const size = opts.size || 26;
        el.style.cssText = `width:${size}px;height:${size}px;z-index:90;`;
        el.innerHTML = `<img src="assets/images/${opts.img}" style="width:100%;height:100%;object-fit:contain;">`;
        this.world1.appendChild(el);
        const sp = opts.speed || 500;
        this.peas.push({
            x: px, y: py, vx: Math.cos(angle) * sp, vy: Math.sin(angle) * sp,
            el, life: (opts.range || 320) / sp + 0.3, dmg: dmg,
            slow: !!opts.slow, aoe: opts.aoe || 0
        });
    }

    // 攻击植物：豌豆系/蘑菇系喷射/卷心菜坚果投掷
    _updateShooting(dt) {
        for (const pl of this.plants) {
            const sh = pl.def.shoot, lob = pl.def.lob;
            if (!sh && !lob) continue;
            pl.shootCd -= dt;
            if (pl.shootCd > 0) continue;
            const px = pl.c * 80 + 40, py = pl.r * 80 + 40;
            let best = null, bestD = (sh ? sh.range : lob.range);
            for (const zb of this.zombies) {
                if (zb.dead) continue;
                const d = Math.hypot(zb.x - px, zb.y - py);
                if (d < bestD) { bestD = d; best = zb; }
            }
            if (!best) continue;

            if (lob) {
                pl.shootCd = lob.cd;
                this._firePea(px, py, Math.atan2(best.y - py, best.x - px), lob.dmg,
                    { img: lob.img, range: lob.range, aoe: lob.aoe, speed: 300, size: 34 });
            } else {
                pl.shootCd = sh.cd;
                const base = Math.atan2(best.y - py, best.x - px);
                if (sh.fan) { // 三线/忧郁菇：扇形多向
                    for (let i = 0; i < sh.n; i++) {
                        const a = base + (i - (sh.n - 1) / 2) * sh.fan;
                        this._firePea(px, py, a, sh.dmg, { img: sh.img, range: sh.range, slow: sh.slow });
                    }
                } else { // 连发：同向串行
                    for (let i = 0; i < sh.n; i++) {
                        this._firePea(px - Math.cos(base) * i * 22, py - Math.sin(base) * i * 22, base, sh.dmg,
                            { img: sh.img, range: sh.range, slow: sh.slow });
                    }
                }
                if (sh.back) { // 双向射手：脑后再补一发
                    this._firePea(px, py, base + Math.PI, sh.dmg, { img: sh.img, range: sh.range, slow: sh.slow });
                }
            }
            this.playSfx('ballooninflate.mp3', 0.15);
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
            // 命中检测（34px）
            for (const zb of this.zombies) {
                if (zb.dead) continue;
                if (Math.hypot(zb.x - pea.x, zb.y - pea.y) < 34) {
                    pea.life = 0;
                    const hits = pea.aoe > 0
                        ? this.zombies.filter(z => !z.dead && Math.hypot(z.x - pea.x, z.y - pea.y) < pea.aoe)
                        : [zb];
                    for (const z of hits) {
                        z.hp -= pea.dmg;
                        if (pea.slow) z.slowT = 2.5;
                        if (z.hpBg) {
                            z.hpBg.style.display = 'block';
                            z.hpFg.style.width = Math.max(0, z.hp / z.maxHp * 100) + '%';
                        }
                        z.el1.style.filter = pea.slow ? 'saturate(0.4) brightness(1.5)' : 'brightness(2.2)';
                        setTimeout(() => { if (z.el1) z.el1.style.filter = ''; }, 90);
                        if (z.hp <= 0) this._killZombie(z);
                    }
                    this.playSfx('bowlingimpact2.mp3', 0.22);
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
                this._flyText(s.x, s.y, '+25', 'yellow');
                this.playSfx('points.mp3', 0.4);
                return false;
            }
            return true;
        });
    }

    // ===== 植物产出：阳光 / 包子 / 孢子 =====
    _updateProduce(dt) {
        for (const pl of this.plants) {
            const def = pl.def;
            if (def.produce) {
                pl.prodT += dt;
                if (pl.prodT >= def.produce.every) {
                    pl.prodT = 0;
                    this.addSun(def.produce.sun);
                    this._flyText(pl.c * 80 + 40, pl.r * 80, `+${def.produce.sun} ☀`, 'yellow');
                    this.playSfx('points.mp3', 0.25);
                }
            }
            if (def.bao) {
                pl.baoT += dt;
                if (pl.baoT >= def.bao.every) {
                    pl.baoT = 0;
                    for (let i = 0; i < def.bao.n; i++) {
                        const el = document.createElement('div');
                        el.className = 'entity';
                        el.style.cssText = 'width:40px;height:40px;z-index:80;font-size:34px;text-align:center;line-height:40px;text-shadow:0 2px 3px #000;';
                        el.innerText = '🥟';
                        const bx = pl.c * 80 + 40 + (Math.random() - 0.5) * 50;
                        const by = pl.r * 80 + 40 + (Math.random() - 0.5) * 50;
                        el.style.left = bx + 'px'; el.style.top = by + 'px';
                        this.world1.appendChild(el);
                        this.baos.push({ x: bx, y: by, el });
                    }
                }
            }
            if (def.spore) {
                pl.sporeT += dt;
                if (pl.sporeT >= def.spore.every) {
                    pl.sporeT = 0;
                    this.addSpore(def.spore.n);
                    this._flyText(pl.c * 80 + 40, pl.r * 80 + 10, `+${def.spore.n} 🦠`, '#c79aff');
                }
            }
        }
    }

    _updateBaos() {
        this.baos = this.baos.filter(b => {
            if (Math.hypot(b.x - this.player.x, b.y - this.player.y) < 55) {
                b.el.remove();
                this.addBao(1);
                this._flyText(b.x, b.y, '🥟 +1', '#ffd54a');
                this.playSfx('points.mp3', 0.3);
                return false;
            }
            return true;
        });
    }

    // ===== 高级植物（孢子系）=====
    _updateSpike(dt) {
        for (const pl of this.plants) {
            const sp = pl.def.spike;
            if (!sp) continue;
            const px = pl.c * 80 + 40, py = pl.r * 80 + 40;
            for (const zb of this.zombies) {
                if (zb.dead) continue;
                if (Math.hypot(zb.x - px, zb.y - py) < sp.r) {
                    zb.hp -= sp.dps * dt;
                    if (zb.hpBg) {
                        zb.hpBg.style.display = 'block';
                        zb.hpFg.style.width = Math.max(0, zb.hp / zb.maxHp * 100) + '%';
                    }
                    if (zb.hp <= 0) this._killZombie(zb);
                }
            }
        }
    }

    _updateIceshroom(dt) {
        for (const pl of this.plants) {
            const fz = pl.def.freeze;
            if (!fz) continue;
            pl.freezeT += dt;
            if (pl.freezeT < fz.every) continue;
            const px = pl.c * 80 + 40, py = pl.r * 80 + 40;
            const victims = this.zombies.filter(z => !z.dead && Math.hypot(z.x - px, z.y - py) < fz.r);
            if (!victims.length) continue;
            pl.freezeT = 0;
            for (const z of victims) {
                z.stunT = Math.max(z.stunT, fz.t);
                z.el1.querySelector('img').style.filter = 'saturate(0.35) brightness(1.5) drop-shadow(0 0 8px #7fd8ff)';
            }
            this.playSfx('frozen.mp3', 0.4);
            setTimeout(() => {
                for (const z of victims) { if (z.el1) z.el1.querySelector('img').style.filter = ''; }
            }, fz.t * 1000);
        }
    }

    _updateDoomshroom(dt) {
        for (const pl of [...this.plants]) {
            const nk = pl.def.nuke;
            if (!nk) continue;
            pl._armT = (pl._armT === undefined ? nk.arm : pl._armT);
            if (pl._armT > 0) { pl._armT -= dt; continue; }
            const px = pl.c * 80 + 40, py = pl.r * 80 + 40;
            const victim = this.zombies.find(z => !z.dead && Math.hypot(z.x - px, z.y - py) < 120);
            if (!victim) continue;
            // 超高攻击：一次性核爆
            this.playSfx('explosion.mp3', 0.65);
            const boom = document.createElement('div');
            boom.style.cssText = `position:absolute; left:${px - nk.r}px; top:${py - nk.r}px; width:${nk.r*2}px; height:${nk.r*2}px; border-radius:50%; background:radial-gradient(circle, rgba(190,120,255,0.95) 0%, rgba(90,0,140,0.8) 45%, rgba(255,0,0,0) 72%); z-index:600; pointer-events:none;`;
            this.world1.appendChild(boom);
            setTimeout(() => boom.remove(), 500);
            for (const zb of [...this.zombies]) {
                if (Math.hypot(zb.x - px, zb.y - py) < nk.r) this._killZombie(zb);
            }
            pl.el1.remove();
            this.plants = this.plants.filter(p => p !== pl);
        }
    }

    // 土豆雷：僵尸踩上引爆，炸死 130px 内僵尸
    _updateMines() {
        for (const pl of [...this.plants]) {
            if (pl.def.mine === undefined) continue;
            if (pl._arming === undefined) pl._arming = 3; // 3s 拱土起爆准备
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
        // 阳光袋 / 包子
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

        // 浇水（按住空格连浇，每 0.15s 一次）：+1 阳光 / 催熟身边蘑菇
        if (this.keys[' '] && time - this.lastWaterTime > 150) {
            this.lastWaterTime = time;
            this._water();
        }
        // 身边蘑菇提示条亮起（同时浇水提示）
        for (const pl of this.plants) {
            if (!pl.def.feed && !pl.def.up) continue;
            const px = pl.c * 80 + 40, py = pl.r * 80 + 40;
            const near = Math.hypot(this.player.x - px, this.player.y - py) < 130;
            this._setHint(pl, near);
        }

        this._updateShooting(dt);
        this._updatePeas(dt);
        this._updateSuns();
        this._updateBaos();
        this._updateProduce(dt);
        this._updateSpike(dt);
        this._updateIceshroom(dt);
        this._updateDoomshroom(dt);
        this._updateMines();

        // 僵尸AI：追踪玩家，啃食沿途植物，接触玩家掉血；撞墙自动切向绕行
        let playerHurt = 0;
        for (const zb of [...this.zombies]) {
            if (zb.dead) continue;

            // 眩晕（包子/眩晕菇）：停住不动、不咬人
            if (zb.stunT > 0) {
                zb.stunT -= dt;
                zb.el1.style.left = zb.x + 'px'; zb.el1.style.top = zb.y + 'px';
                continue;
            }
            if (zb.slowT > 0) zb.slowT -= dt;
            const spd = zb.speed * (zb.slowT > 0 ? 0.5 : 1);

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
                const nzx = zb.x + dx * spd * dt;
                const nzy = zb.y + dy * spd * dt;

                // 先看目标格有没有植物（啃食优先；地刺贴地不挡路不被啃）
                const atkPlant = this.getPlantAt(nzx, nzy);
                if (atkPlant && !atkPlant.def.ground) {
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
            // v3.86.1 修复：判定在移动块之外，len=0 时也生效（防"贴脸无敌"）
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
