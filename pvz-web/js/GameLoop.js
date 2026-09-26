class AudioManager {
    constructor() {
        this.sounds = {
            bgm: new Audio('assets/audio/uraniwani.mp3'),
            plant: new Audio('assets/audio/plant_water.mp3'),
            chomp: new Audio('assets/audio/chomp.mp3'),
            sun: new Audio('assets/audio/points.mp3'),
            lose: new Audio('assets/audio/losemusic.mp3'),
            win: new Audio('assets/audio/winmusic.mp3'),       // 胜利音乐(原版官方) — v3.5.2 起胜利画面播放
            btn: new Audio('assets/audio/buttonclick.mp3'),
            splat: new Audio('assets/audio/bowlingimpact.mp3'),
            vasebreak: new Audio('assets/audio/vase_breaking.mp3'), // 砸罐破碎音效(原版官方) — v3.5.2 补注册(v3.5.0 漏加导致从未响起)
            // v3.25.0：补注册原版爆炸系音效 —— v3.23.0 起代码里一直在 play() 这些名字，
            // 但从未注册（play 查不到就静默）→ 樱桃/辣椒/冰冻/毁灭菇爆炸一直没声音
            cherrybomb: new Audio('assets/audio/cherrybomb.mp3'),
            jalapeno: new Audio('assets/audio/jalapeno.mp3'),
            frozen: new Audio('assets/audio/frozen.mp3'),
            doomshroom: new Audio('assets/audio/doomshroom.mp3'),
            explosion: new Audio('assets/audio/explosion.mp3')
        };
        this.sounds.bgm.loop = true;
    }
    
    play(name) {
        if (this.sounds[name]) {
            // Clone node to allow overlapping sounds (bgm/lose/win 是长音乐, 播原对象以便 stop)
            if (name !== 'bgm' && name !== 'lose' && name !== 'win') {
                const s = this.sounds[name].cloneNode();
                // v3.23.0：僵尸啃咬声整体调低（用户反馈太大声）
                if (name === 'chomp') s.volume = 0.35;
                s.play().catch(e => console.log(e));
            } else {
                this.sounds[name].play().catch(e => console.log(e));
            }
        }
    }
    
    stop(name) {
        if (this.sounds[name]) {
            this.sounds[name].pause();
            this.sounds[name].currentTime = 0;
        }
    }

    // v3.23.0：程序合成音效（WebAudio）——每种植物攻击声音不同：
    // 豌豆=短促"噗"声、蘑菇=喷气"噗嘶"、瓜果=碎裂、投掷=风声、星光=高频闪音…
    // 樱桃/辣椒/毁灭菇/寒冰菇爆炸用原版 mp3（cherrybomb/jalapeno/doomshroom/frozen）。
    playFx(kind) {
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            if (!this._ctx) {
                this._ctx = new AC();
                this._fxGain = this._ctx.createGain();
                this._fxGain.gain.value = 0.8;
                this._fxGain.connect(this._ctx.destination);
            }
            const ctx = this._ctx;
            if (ctx.state === 'suspended') ctx.resume();
            const t = ctx.currentTime;
            const osc = (type, f0, f1, dur, vol) => {
                const o = ctx.createOscillator(), g = ctx.createGain();
                o.type = type; o.frequency.setValueAtTime(f0, t);
                o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
                g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
                o.connect(g); g.connect(this._fxGain); o.start(t); o.stop(t + dur + 0.02);
            };
            const noise = (dur, vol, freq, q) => {
                const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
                const buf = ctx.createBuffer(1, len, ctx.sampleRate);
                const d = buf.getChannelData(0);
                for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
                const src = ctx.createBufferSource(); src.buffer = buf;
                const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q || 0.8;
                const g = ctx.createGain(); g.gain.value = vol;
                src.connect(f); f.connect(g); g.connect(this._fxGain); src.start(t);
            };
            switch (kind) {
                case 'pea_pop':    osc('sine', 380, 95, 0.10, 0.5); break;                            // 豌豆发射
                case 'pea_hit':    osc('sine', 200, 60, 0.08, 0.4); noise(0.05, 0.15, 2500); break;   // 豌豆命中
                case 'ice_pop':    osc('sine', 680, 210, 0.11, 0.45); noise(0.08, 0.12, 4200); break; // 寒冰豌豆
                case 'fire_pop':   osc('sawtooth', 220, 60, 0.14, 0.4); noise(0.12, 0.2, 900); break; // 火豌豆
                case 'puff':       noise(0.16, 0.35, 1100, 1.2); break;                               // 蘑菇喷气
                case 'whoosh':     noise(0.18, 0.22, 700, 0.6); break;                                // 投手抛掷风声
                case 'crash':      noise(0.22, 0.5, 850, 0.5); osc('sine', 150, 55, 0.18, 0.5); break;// 瓜果碎裂
                case 'thud':       osc('sine', 190, 70, 0.10, 0.45); noise(0.06, 0.18, 1800); break;  // 卷心菜/玉米砸中
                case 'star_shoot': osc('sine', 950, 1350, 0.07, 0.18); break;                          // 杨桃星光
                case 'box_open':   osc('square', 500, 900, 0.12, 0.2); noise(0.1, 0.15, 3000); break;  // 盲盒开启
                // ===== v3.25.0 个人特色音 =====
                case 'spike_hit':  osc('square', 240, 90, 0.07, 0.35); noise(0.07, 0.3, 3200, 1.4); break; // 地刺扎刺
                case 'gloom_burst': noise(0.3, 0.4, 500, 0.7); osc('sawtooth', 160, 60, 0.25, 0.3); break; // 忧郁菇孢子云
                case 'hammer_hit': osc('square', 140, 70, 0.09, 0.5); noise(0.06, 0.35, 1400, 1.0); break; // 木锤砸击
                case 'ice_shatter': noise(0.24, 0.42, 4800, 1.4); osc('triangle', 2200, 800, 0.14, 0.25); break; // 寒冰菇消散·冰晶碎裂 v3.26.0
                case 'vomit': {                                                                            // 咬大蒜·干呕 v3.28.0（两声由低到闷的湿呕）
                    for (let i = 0; i < 2; i++) {
                        const t0 = t + i * 0.16;
                        const o = ctx.createOscillator(), g = ctx.createGain();
                        o.type = 'sawtooth';
                        o.frequency.setValueAtTime(210 - i * 40, t0);
                        o.frequency.exponentialRampToValueAtTime(55, t0 + 0.14);
                        g.gain.setValueAtTime(0.38, t0);
                        g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.15);
                        o.connect(g); g.connect(this._fxGain); o.start(t0); o.stop(t0 + 0.17);
                        const len2 = Math.max(1, Math.floor(ctx.sampleRate * 0.13));
                        const buf2 = ctx.createBuffer(1, len2, ctx.sampleRate);
                        const d2 = buf2.getChannelData(0);
                        for (let j = 0; j < len2; j++) d2[j] = (Math.random() * 2 - 1) * (1 - j / len2);
                        const s2 = ctx.createBufferSource(); s2.buffer = buf2;
                        const f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 480; f2.Q.value = 0.8;
                        const g2 = ctx.createGain(); g2.gain.value = 0.34;
                        s2.connect(f2); f2.connect(g2); g2.connect(this._fxGain); s2.start(t0);
                    }
                    break;
                }
                case 'star_volley': {                                                                      // 杨桃五星齐射（三连升调星光）
                    for (let i = 0; i < 3; i++) {
                        const o = ctx.createOscillator(), g = ctx.createGain();
                        o.type = 'sine';
                        o.frequency.setValueAtTime(900 + i * 260, t + i * 0.06);
                        o.frequency.exponentialRampToValueAtTime(1500 + i * 300, t + i * 0.06 + 0.09);
                        g.gain.setValueAtTime(0.22, t + i * 0.06);
                        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.12);
                        o.connect(g); g.connect(this._fxGain); o.start(t + i * 0.06); o.stop(t + i * 0.06 + 0.14);
                    }
                    break;
                }
            }
        } catch (e) { console.log(e); }
    }
}

class Game {
    constructor() {
        this.container = document.getElementById('game-container');
        this.entityLayer = document.getElementById('entity-layer');
        
        this.lastTime = 0;
        this.entities = []; 
        
        this.sunCount = 50;
        this.sunCountElement = document.getElementById('sun-count');
        
        this.state = 'MENU'; // MENU, PLAYING, GAMEOVER
        
        this.fusionMode = false;
        this.vaseMode = false; // 砸罐子模式标志（v3.4.1 修复：此前从未被赋值，导致砸罐模式无法启动）
        this.zombieMode = false; // 我是僵尸模式标志（v3.7.0）
        this.zombieDifficulty = null; // 我是僵尸难度: 'easy' | 'hard' | 'hell'
        this.pendingZombie = null;    // 我是僵尸：当前选中的僵尸卡 type（点草坪行释放）
        this.zBrainEls = [];          // 每行左端"脑子" DOM
        this.vaseFreeCards = []; // 砸罐子：植物罐砸出的免费一次性植物卡 {type, element, consumed}
        this.vaseDifficulty = null; // 砸罐子难度: 'easy' 简单 | 'hard' 困难 | 'hell' 地狱（null 时按 hard 配置兜底）
        this._sigEl = null; // 战场左侧"区耀丁"署名 DOM（vase 模式专属）
        
        this.lastTime = 0;
        
        this.board = new Board(this);
        this.inputManager = new InputManager(this);
        this.waveManager = new WaveManager(this);
        this.collisionManager = new CollisionManager(this);
        this.audioManager = new AudioManager();
        
        this.skySunTimer = 0;
        this.skySunInterval = 8; 
        
        this.score = 0;
        this.cooldowns = {}; // Stores cooldown timers for plants
        this.gameSpeed = 1;
        
        this.initUI();
        this.showMenu();
        
        const speedBtn = document.getElementById('btn-speed');
        if (speedBtn) {
            speedBtn.addEventListener('click', () => {
                if (this.gameSpeed === 1) this.gameSpeed = 2;
                else if (this.gameSpeed === 2) this.gameSpeed = 5;
                else this.gameSpeed = 1;
                speedBtn.innerText = `Speed: ${this.gameSpeed}x`;
            });
        }
        
        // 空格键：融合模式下快速切换 手 ↔ 融合手套（与点击 🧤 按钮等价，避免用鼠标点按钮、来回移动的繁琐操作）
        document.addEventListener('keydown', (e) => {
            if (e.code !== 'Space') return;
            // v3.31.0：砸罐子手套同样用空格激活（此前 !this.fusionMode 把 vase 模式拦死）
            if (this.state !== 'PLAYING' || !(this.fusionMode || this.vaseMode)) return;
            // 选卡界面 / 开始菜单 / 融合图鉴弹窗打开时不响应
            const overlayOpen = (id) => {
                const el = document.getElementById(id);
                return !!el && el.style.display !== 'none' && el.style.display !== '';
            };
            if (overlayOpen('seed-chooser') || overlayOpen('start-menu') || overlayOpen('recipe-modal')) return;
            e.preventDefault(); // 阻止空格滚动页面
            if (!e.repeat) this.toggleGlove(); // 按住不放只触发一次
        });

        // ===== v3.24.0 玉米加农炮：M 键发射（瞄准模式中）=====
        document.addEventListener('keydown', (e) => {
            if (e.code !== 'KeyM' || e.repeat) return;
            if (this.state !== 'PLAYING' || !this.aimingCob) return;
            const overlayOpen = (id) => {
                const el = document.getElementById(id);
                return !!el && el.style.display !== 'none' && el.style.display !== '';
            };
            if (overlayOpen('seed-chooser') || overlayOpen('start-menu') || overlayOpen('recipe-modal')) return;
            e.preventDefault();
            this.fireCobCannon();
        });

        // v3.24.0：瞄准模式中准星跟随鼠标（记录草坪坐标系坐标供发射用）
        document.addEventListener('mousemove', (e) => {
            if (!this._cobCrosshair) return;
            const rect = this.container.getBoundingClientRect();
            const scale = window.gameScale || 1;
            const mx = (e.clientX - rect.left) / scale;
            const my = (e.clientY - rect.top) / scale;
            this._cobCrosshair.style.left = mx + 'px';
            this._cobCrosshair.style.top = my + 'px';
            this._cobAimPos = { x: mx, y: my };
        });
    }
    
    updateScore() {
        const scoreEl = document.getElementById('score-count');
        if (scoreEl) {
            scoreEl.innerText = this.score;
        }
        
        // Trigger event on milestone (融合进化/我是僵尸模式关闭全局随机事件)
        if (!this.fusionMode && !this.zombieMode && this.scoreMilestones && this.scoreMilestones.length > 0) {
            if (this.score >= this.scoreMilestones[0]) {
                this.scoreMilestones.shift(); // Remove the reached milestone
                this.eventTimer = 120 + Math.random() * 60; // Reset time-based timer so they don't overlap
                this.triggerRandomEvent();
            }
        }
    }
    
    showMenu() {
        const menu = document.getElementById('start-menu');
        const btnAdv = document.getElementById('btn-adventure');
        const btnFusion = document.getElementById('btn-fusion');
        const btnVase = document.getElementById('btn-vase');
        const btnZombie = document.getElementById('btn-zombie');
        
        btnAdv.onclick = () => {
            this.audioManager.play('btn');
            menu.style.display = 'none';
            this.fusionMode = false;
            this.vaseMode = false;
            this.zombieMode = false;
            this.showSeedChooser();
        };
        
        btnFusion.onclick = () => {
            this.audioManager.play('btn');
            menu.style.display = 'none';
            this.fusionMode = true;
            this.vaseMode = false;
            this.zombieMode = false;
            this.showSeedChooser();
        };
        
        // 砸罐子：先弹难度选择（简单/困难/地狱），选定后免选卡直接开局
        btnVase.onclick = () => {
            this.audioManager.play('btn');
            this._openVaseDifficulty();
        };

        // 我是僵尸（v3.7.0）：同样先弹三档难度，选定后免选卡直接开局
        if (btnZombie) {
            btnZombie.onclick = () => {
                this.audioManager.play('btn');
                this._openZombieDifficulty();
            };
        }

        // 难度选择弹窗按钮绑定（HTML 静态节点，仅绑定一次）
        const dModal = document.getElementById('difficulty-modal');
        const bindDiff = (id, diff) => {
            const b = document.getElementById(id);
            if (b) b.onclick = () => this._chooseVaseDifficulty(diff);
        };
        bindDiff('diff-easy', 'easy');
        bindDiff('diff-hard', 'hard');
        bindDiff('diff-hell', 'hell');
        const dBack = document.getElementById('diff-back');
        if (dBack) {
            dBack.onclick = () => {
                this.audioManager.play('btn');
                if (dModal) dModal.style.display = 'none'; // 返回主菜单
            };
        }

        // 我是僵尸难度弹窗按钮（HTML 静态节点，仅绑定一次）
        const zModal = document.getElementById('zdiff-modal');
        const bindZDiff = (id, diff) => {
            const b = document.getElementById(id);
            if (b) b.onclick = () => this._chooseZombieDifficulty(diff);
        };
        bindZDiff('zdiff-easy', 'easy');
        bindZDiff('zdiff-hard', 'hard');
        bindZDiff('zdiff-hell', 'hell');
        const zBack = document.getElementById('zdiff-back');
        if (zBack) {
            zBack.onclick = () => {
                this.audioManager.play('btn');
                if (zModal) zModal.style.display = 'none'; // 返回主菜单
            };
        }
    }

    // ===== 砸罐子难度选择（v3.5.0）：简单 / 困难 / 地狱 =====
    _openVaseDifficulty() {
        const modal = document.getElementById('difficulty-modal');
        if (!modal) { this._beginVaseGame(); return; } // 兜底：找不到弹窗直接开默认局
        modal.style.display = 'flex';
    }

    _chooseVaseDifficulty(diff) {
        this.vaseDifficulty = diff; // 'easy' | 'hard' | 'hell'
        this._beginVaseGame();
    }

    // 统一开局入口：隐藏菜单/选卡/难度弹窗 → 进入 vase 模式
    _beginVaseGame() {
        this.audioManager.play('btn');
        const menu = document.getElementById('start-menu');
        if (menu) menu.style.display = 'none';
        const chooser = document.getElementById('seed-chooser');
        if (chooser) chooser.style.display = 'none';
        const modal = document.getElementById('difficulty-modal');
        if (modal) modal.style.display = 'none';
        this.fusionMode = false;
        this.vaseMode = true;
        this.zombieMode = false;
        this.selectedSeeds = [];
        this.startGame();
    }

    // ===== 我是僵尸模式（I, ZOMBIE）v3.7.0 =====
    // 玩家扮演僵尸：用阳光购买/释放僵尸从右往左进攻，啃穿植物防线、吃到最左端脑子即通关。
    // 敌阵 = 开局随机种满左 6 列(col0~5)的基础植物（绝无融合植物），右 3 列是僵尸出生推进区。
    // 三档难度：初始阳光(600/400/250) + 僵尸解锁(3/5/7 种) + 敌阵强度(温和/标准/凶悍)。
    _openZombieDifficulty() {
        const modal = document.getElementById('zdiff-modal');
        if (!modal) { this._beginZombieGame(); return; } // 兜底：找不到弹窗直接开默认局
        modal.style.display = 'flex';
    }

    _chooseZombieDifficulty(diff) {
        this.zombieDifficulty = diff; // 'easy' | 'hard' | 'hell'
        this._zDiffCfgCache = null;   // v3.13.3：新一局重新掷骰（舞王低频等按局随机项）
        this._beginZombieGame();
    }

    // 统一开局入口：隐藏各层 → 进入 zombie 模式
    _beginZombieGame() {
        this.audioManager.play('btn');
        const menu = document.getElementById('start-menu');
        if (menu) menu.style.display = 'none';
        const chooser = document.getElementById('seed-chooser');
        if (chooser) chooser.style.display = 'none';
        const modal = document.getElementById('zdiff-modal');
        if (modal) modal.style.display = 'none';
        const dModal = document.getElementById('difficulty-modal');
        if (dModal) dModal.style.display = 'none';
        this.fusionMode = false;
        this.vaseMode = false;
        this.zombieMode = true;
        this.selectedSeeds = [];
        this.startGame();
    }

    // 僵尸阳光价目（用户确认的原版风格价目）
    // v3.8.1 调价：舞王(召唤免费伴舞)与冰车(无视植物直接碾碎)强度显著高于橄榄球，
    // 却比橄榄球便宜 → 按强度重排：橄榄球 225→200，舞王 175→250，冰车 200→250。
    zombiePrice() {
        return { normal: 50, conehead: 75, polevaulting: 75, newspaper: 100, buckethead: 125,
                 screendoor: 200, football: 200, dancing: 250, zomboni: 250 };
    }
    zombieName(type) {
        return { normal: '普通僵尸', conehead: '路障僵尸', polevaulting: '撑杆僵尸', newspaper: '读报僵尸',
                 buckethead: '铁桶僵尸', dancing: '舞王僵尸', screendoor: '铁门僵尸',
                 football: '橄榄球僵尸', zomboni: '冰车僵尸' }[type] || type;
    }
    // 僵尸卡面素材：与 Zombie.js 构造函数使用同一目录（大小写敏感部署环境必须精确）
    zombieImg(type) {
        return {
            normal: 'assets/images/Zombies/Zombie/Zombie.gif',
            conehead: 'assets/images/Zombies/ConeheadZombie/ConeheadZombie.gif',
            polevaulting: 'assets/images/Zombies/PoleVaultingZombie/PoleVaultingZombie.gif',
            newspaper: 'assets/images/Zombies/NewspaperZombie/HeadWalk1.gif',
            buckethead: 'assets/images/Zombies/BucketheadZombie/BucketheadZombie.gif',
            dancing: 'assets/images/Zombies/DancingZombie/DancingZombie.gif',
            screendoor: 'assets/images/Zombies/ScreenDoorZombie/ScreenDoorZombie.gif',
            football: 'assets/images/Zombies/FootballZombie/FootballZombie.gif',
            zomboni: 'assets/images/Zombies/Zomboni/1.gif'
        }[type];
    }

    // 三档难度配置：初始阳光 + 解锁僵尸种类（PVZ1 白昼原版池，无任何融合专属僵尸）
    // v3.8.0 降难度：地狱模式新增两种"破阵型"僵尸（舞王僵尸召唤伴舞、冰车僵尸直接碾碎植物），
    // 让玩家在 250 阳光的紧开局里有更强的破局手段。
    // v3.13.3：困难档 30% 概率解锁舞王僵尸（用户要求"10 局出现 3 局顶天"的低频强力僵尸）；
    // 配置对象每局只生成一次（_zDiffCfgCache，选难度时清空），保证一局内卡带/敌阵/出怪一致。
    _zombieDiffCfg() {
        if (this._zDiffCfgCache) return this._zDiffCfgCache;
        const d = this.zombieDifficulty || 'easy';
        const map = {
            easy: { key: 'easy', label: '简单', sun: 600, plantTier: 0,
                unlock: ['normal', 'conehead', 'polevaulting'] },
            hard: { key: 'hard', label: '困难', sun: 400, plantTier: 1,
                unlock: ['normal', 'conehead', 'polevaulting', 'newspaper', 'buckethead'] },
            hell: { key: 'hell', label: '地狱', sun: 250, plantTier: 2,
                unlock: ['normal', 'conehead', 'polevaulting', 'newspaper', 'buckethead'] }
        };
        const cfg = map[d] || map.easy;
        if (cfg.key === 'hard' && Math.random() < 0.3) {
            cfg.unlock = cfg.unlock.concat(['dancing']); // 困难档低频舞王
        }
        // v3.17.0：特殊僵尸常驻 —— 地狱档 铁门/橄榄球/冰车 每局全在卡带上；
        // 困难档 铁门/橄榄球 常驻（此前 30% 掷骰，玩家反馈"地狱少了冰车和橄榄球"）
        if (cfg.key === 'hard' || cfg.key === 'hell') {
            cfg.unlock = cfg.unlock.concat(['screendoor', 'football']);
            if (cfg.key === 'hell') cfg.unlock = cfg.unlock.concat(['zomboni']);
        }
        this._zDiffCfgCache = cfg;
        return cfg;
    }

    // 顶部僵尸卡带：按难度解锁池生成（点击选中 → 点草坪行释放）
    buildZombieBank() {
        const bank = document.getElementById('zombie-bank');
        if (!bank) return;
        bank.innerHTML = '';
        const cfg = this._zombieDiffCfg();
        const price = this.zombiePrice();
        cfg.unlock.forEach(type => {
            const card = document.createElement('div');
            card.className = 'zcard';
            card.dataset.type = type;
            card.dataset.cost = price[type];
            const img = document.createElement('img');
            img.src = this.zombieImg(type);
            const nm = document.createElement('span'); nm.className = 'z-name'; nm.textContent = this.zombieName(type);
            const cs = document.createElement('span'); cs.className = 'z-cost'; cs.textContent = price[type];
            card.appendChild(img); card.appendChild(nm); card.appendChild(cs);
            bank.appendChild(card);
        });
        this._refreshZombieBank();
    }

    // 阳光变化后刷新僵尸卡可买态 + 选中高亮
    _refreshZombieBank() {
        const cards = document.querySelectorAll('#zombie-bank .zcard');
        const price = this.zombiePrice();
        cards.forEach(c => {
            const affordable = this.sunCount >= price[c.dataset.type];
            c.classList.toggle('disabled', !affordable);
            c.classList.toggle('selected', c.dataset.type === this.pendingZombie);
        });
    }

    // 僵尸被吃植物奖/扣阳光等场景统一刷新（UI 与卡带）
    _syncZombieSunUI() {
        this.sunCountElement.innerText = this.sunCount;
        this._refreshZombieBank();
    }

    // 吃掉经济植物的奖励（僵尸模式）：被僵尸啃死 → 向日葵 +200 / 双子 +500 / 阳光菇 +450
    zombieEatSunflowerReward(plantType) {
        const gain = { sunflower: 200, twinsunflower: 500, sunshroom: 450 }[plantType] || 200;
        this.sunCount += gain;
        this._syncZombieSunUI();
        this.audioManager.play('sun');
        this._zombieFloatText(`+${gain} 阳光`, plantType === 'twinsunflower' ? '#ffd54a' : '#ffe45c');
    }

    // 飘字（奖励/提示），自动上浮消失
    _zombieFloatText(text, color, x, y) {
        const el = document.createElement('div');
        el.className = 'z-float';
        el.textContent = text;
        el.style.color = color || '#ffe45c';
        const cx = (x !== undefined) ? x : (this.board.offsetX + this.board.cols * this.board.cellWidth / 2);
        const cy = (y !== undefined) ? y : 150;
        el.style.left = cx + 'px';
        el.style.top = cy + 'px';
        this.container.appendChild(el);
        requestAnimationFrame(() => {
            el.style.transform = 'translateY(-34px)';
            el.style.opacity = '0';
        });
        setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 1250);
    }

    // 每行左端(房子口)摆一个"脑子"。v3.7.1 起：必须吃光全部 5 行脑子才通关（不再是一路吃脑即胜）
    _spawnBrainEls() {
        this._clearBrainEls();
        this._brainEaten = new Array(this.board.rows).fill(false); // 各行脑子是否已被吃掉
        for (let r = 0; r < this.board.rows; r++) {
            const b = document.createElement('div');
            b.className = 'z-brain';
            b.dataset.row = r;
            b.textContent = '🧠';
            b.style.left = (this.board.offsetX - 10) + 'px';   // col0 左缘（房子口），僵尸啃到 x<40 即吃脑
            b.style.top = (this.board.offsetY + r * this.board.cellHeight + this.board.cellHeight / 2 - 10) + 'px';
            this.entityLayer.appendChild(b);
            this.zBrainEls.push(b);
        }
    }
    _clearBrainEls() {
        this.zBrainEls.forEach(el => { if (el && el.parentNode) el.parentNode.removeChild(el); });
        this.zBrainEls = [];
        this._brainEaten = null;
    }

    // 僵尸到达最左端(x<40) → 吃掉该行脑子。全部 5 行吃光才通关（v3.7.1）
    // 吃脑后的僵尸立即退场（isDead → GameLoop 统一回收 DOM/数组项）
    zombieEatBrain(row, zombie) {
        if (this.state !== 'PLAYING' || !this.zombieMode) return;
        if (!this._brainEaten) this._brainEaten = new Array(this.board.rows).fill(false);
        if (row < 0 || row >= this.board.rows) { if (zombie) zombie.isDead = true; return; }
        // 该行脑子已被吃（同行后续僵尸走到左端）：直接退场，不重复计分
        if (this._brainEaten[row]) { if (zombie) zombie.isDead = true; return; }

        this._brainEaten[row] = true;
        const el = this.zBrainEls[row];
        if (el && el.parentNode) el.parentNode.removeChild(el);
        this.score += 100;
        if (this.updateScore) this.updateScore();
        this.audioManager.play('chomp');
        if (zombie) zombie.isDead = true; // 吃掉脑子后僵尸退场

        const eaten = this._brainEaten.filter(Boolean).length;
        const total = this.board.rows;
        this._zombieFloatText(`🧠 ${eaten}/${total}`, '#ff8fa3');
        if (eaten >= total) {
            this.zombieWin(); // 吃光全部脑子 → 通关
        } else {
            this.showAnnouncement(`吃掉一个脑子！还剩 ${total - eaten} 个（共 ${total} 个）`, '#ff8fa3');
        }
    }

    // ===== 敌阵生成：左 6 列(col0~5) 每格随机一种基础植物（绝无融合植物）=====
    // 按难度 tier 选植物池：tier0 温和 / tier1 标准 / tier2 最凶。
    // v3.7.2 降难度（玩家反馈困难、地狱过难）三道并施：
    //   ① 池子里"机枪射手级"的凶植物大量换成"豌豆射手级"，每档只留少数硬骨头（不全部替换）；
    //   ② 移除 高坚果(8000 HP)：它坐在阵前时僵尸要啃 160s，是"一株都推不动"的头号元凶；
    //   ③ 逐行限流：每行射手 ≤ cap(简单1/困难2/地狱3)、坚果墙 ≤1 ——
    //      把"一行 6 株全是火力"改成"火力 + 经济 + 少量肉盾"的合理配比。
    // 每行保底：至少 1 株攻击类；全局向日葵 ≥3 株(玩家回本来源)。
    // 不含"种下即炸"的樱桃炸弹/火爆辣椒/寒冰菇/毁灭菇（原版 I,Zombie 敌阵本就没有，
    // 且它们会在开局自爆消失 → 空格子）；陷阱类(土豆雷/窝瓜)全局 ≤3。
    setupZombieEnemies() {
        const cfg = this._zombieDiffCfg();
        const pools = [
            { // tier 0 简单：基础射手 + 少量肉盾
                sunflower: 20, peashooter: 22, snowpea: 8, wallnut: 8, chomper: 3,
                potatomine: 4, squash: 2, threepeater: 2, repeater: 3, spikeweed: 6, garlic: 3,
                torchwood: 2, cabbagepult: 3, kernelpult: 3
            },
            { // tier 1 困难：豌豆/坚果为中坚，只留少量西瓜投手与火炬树桩当"硬骨头"
                // v3.12.0：加入 猫尾草/冰西瓜/忧郁菇/小喷菇/胆小菇/阳光菇/南瓜套
                sunflower: 18, peashooter: 28, snowpea: 12, wallnut: 10, chomper: 4,
                potatomine: 4, squash: 2, threepeater: 6, repeater: 8, splitpea: 3, spikeweed: 5,
                torchwood: 2, melonpult: 1, garlic: 3, cabbagepult: 4, kernelpult: 4,
                cattail: 2, wintermelon: 1, gloomshroom: 3, puffshroom: 6,
                scaredyshroom: 4, sunshroom: 5, pumpkinhead: 3, doomshroom: 2,
                fumeshroom: 2, starfruit: 1, gatlingpea: 1, spikerock: 1, tallnut: 1, hypnoshroom: 1
            },
            { // tier 2 地狱：仍是三档里最凶，但不再是"无解"
                // v3.14.0：用户要求"加入全部的植物"——机枪射手/大喷菇/杨桃/钢地刺/高坚果/魅惑菇
                // 以极低权重回归（强植物低频）；种下即爆的 樱桃/辣椒/寒冰 仍不入池（开局自爆白给），
                // 毁灭菇以陷阱形态入池（v3.13.3）；保留 西瓜投手(溅射)/火炬树桩(增伤)/寒冰射手(减速)
                // v3.10.0：加入 卷心菜投手/玉米投手 —— 它们破甲+黄油定身，是对装甲流的克制点
                // v3.12.0：加入 猫尾草/冰西瓜/忧郁菇/小喷菇/胆小菇/阳光菇/南瓜套
                sunflower: 16, twinsunflower: 2, peashooter: 26, snowpea: 12, wallnut: 10,
                chomper: 3, potatomine: 4, squash: 3, threepeater: 6, repeater: 8, splitpea: 3,
                spikeweed: 5, torchwood: 2, melonpult: 2, garlic: 4, cabbagepult: 4, kernelpult: 4,
                cattail: 2, wintermelon: 1, gloomshroom: 3, puffshroom: 6,
                scaredyshroom: 4, sunshroom: 5, pumpkinhead: 3, doomshroom: 2,
                fumeshroom: 2, starfruit: 1, gatlingpea: 1, spikerock: 1, tallnut: 1, hypnoshroom: 1
            }
        ];
        const pool = pools[cfg.plantTier] || pools[0];

        // 全类型射手（含本档池子里没有的，仅用于"是不是射手"的判断）
        const isShooter = t => ['peashooter', 'snowpea', 'threepeater', 'repeater', 'splitpea', 'gatlingpea',
            'melonpult', 'wintermelon', 'starfruit', 'gloomshroom', 'fumeshroom', 'cattail',
            'cabbagepult', 'kernelpult'].includes(t);
        const isWall = t => t === 'wallnut' || t === 'tallnut' || t === 'pumpkinhead';
        const maxShootersPerRow = { 0: 1, 1: 2, 2: 3 }[cfg.plantTier];
        const maxWallsPerRow = 1;

        // 构建加权候选（过滤任何 fusion_ 类型与 plantern；
        // pumpkinhead v3.12.0 入阵；v3.13.0 起落位时改为套在同行植物头上，见落地前转换）
        const types = Object.keys(pool).filter(t =>
            !t.startsWith('fusion_') && t !== 'plantern'
        );
        const pickFrom = (list) => {
            const total = list.reduce((s, t) => s + pool[t], 0);
            let r = Math.random() * total;
            for (const t of list) { r -= pool[t]; if (r <= 0) return t; }
            return list[0] || 'sunflower';
        };

        // 保证每次开局干净
        const zombieEnemies = this.entities.filter(e => e._zombieEnemy);
        zombieEnemies.forEach(e => { if (e.element && e.element.parentNode) e.element.parentNode.removeChild(e.element); });

        // 逐行生成（射手/墙体限流，防止一行 6 株全是火力把僵尸秒在阵前）
        const gridPlan = [];
        for (let r = 0; r < this.board.rows; r++) {
            const row = [];
            let nShooters = 0, nWalls = 0;
            for (let c = 0; c < 6; c++) {
                const allowed = types.filter(t =>
                    !(isShooter(t) && nShooters >= maxShootersPerRow) &&
                    !(isWall(t) && nWalls >= maxWallsPerRow));
                const t = allowed.length ? pickFrom(allowed) : pickFrom(types);
                if (isShooter(t)) nShooters++;
                if (isWall(t)) nWalls++;
                row.push(t);
            }
            gridPlan.push(row);
        }
        // 全局修正：阳光植物（向日葵/阳光菇/双子向日葵）数量按难度定档 ——
        // v3.25.0（用户指定）：简单 ~10 / 困难 7~9 / 地狱 3~5（旧版三档均保底 3，地狱偏低）
        const sunKinds = ['sunflower', 'sunshroom', 'twinsunflower'];
        const countSun = () => gridPlan.flat().filter(x => sunKinds.includes(x)).length;
        const sunRange = { 0: [9, 11], 1: [7, 9], 2: [3, 5] }[cfg.plantTier] || [3, 5];
        const sunTarget = sunRange[0] + Math.floor(Math.random() * (sunRange[1] - sunRange[0] + 1));
        let sunGuard = 0;
        while (countSun() < sunTarget && sunGuard++ < 300) {
            const rr = Math.floor(Math.random() * 5), cc = Math.floor(Math.random() * 6);
            if (!sunKinds.includes(gridPlan[rr][cc])) {
                gridPlan[rr][cc] = (cfg.plantTier === 2 && Math.random() < 0.25) ? 'twinsunflower'
                    : (Math.random() < 0.35 ? 'sunshroom' : 'sunflower');
            }
        }
        sunGuard = 0;
        while (countSun() > sunTarget && sunGuard++ < 300) {
            const rr = Math.floor(Math.random() * 5), cc = Math.floor(Math.random() * 6);
            if (sunKinds.includes(gridPlan[rr][cc])) {
                gridPlan[rr][cc] = pickFrom(types);
            }
        }
        // 向日葵前移：把落在后三列(col0~2)的向日葵与同排前区(col3~5)的非向日葵对调。
        // 僵尸从右侧进攻 → 向日葵靠前 = 玩家啃到就能回本（该模式的核心经济来源），
        // 否则经济植物全埋在阵底，玩家永远攒不出第二个僵尸。
        for (let r = 0; r < this.board.rows; r++) {
            for (let c = 0; c <= 2; c++) {
                if (!gridPlan[r][c].startsWith('sun') && !gridPlan[r][c].startsWith('twin')) continue;
                for (let fc = 5; fc >= 3; fc--) {
                    if (gridPlan[r][fc].startsWith('sun') || gridPlan[r][fc].startsWith('twin')) continue;
                    const tmp = gridPlan[r][fc];
                    gridPlan[r][fc] = gridPlan[r][c];
                    gridPlan[r][c] = tmp;
                    break;
                }
            }
        }
        // 陷阱/自毁类（土豆雷/窝瓜）全局 ≤3，防止整场都是陷阱
        const bombTypes = ['potatomine', 'squash'];
        let overBombs = gridPlan.flat().filter(x => bombTypes.includes(x)).length - 3;
        for (let r = 0; r < 5 && overBombs > 0; r++) {
            for (let c = 0; c < 6 && overBombs > 0; c++) {
                if (bombTypes.includes(gridPlan[r][c])) {
                    gridPlan[r][c] = pickFrom(types);
                    if (!bombTypes.includes(gridPlan[r][c])) overBombs--;
                }
            }
        }
        // 每行保底 1 攻击射手（防整行无输出）
        for (let r = 0; r < 5; r++) {
            if (!gridPlan[r].some(isShooter)) {
                const cc = Math.floor(Math.random() * 6);
                const good = types.filter(t => isShooter(t) && pool[t] >= 2);
                if (good.length) gridPlan[r][cc] = good[Math.floor(Math.random() * good.length)];
            }
        }
        // 最终限流兜底：上面的"向日葵补足 / 炸弹替换 / 射手保底"都可能把某行的射手或墙体
        // 又顶回上限之上，这里统一压回（超出的换成非射手非墙体），确保"一行不会 6 株全是火力"。
        const fillerTypes = types.filter(t => !isShooter(t) && !isWall(t));
        for (let r = 0; r < this.board.rows; r++) {
            let nSh = 0, nW = 0;
            for (let c = 0; c < 6; c++) {
                const t = gridPlan[r][c];
                if (isShooter(t)) { nSh++; if (nSh > maxShootersPerRow) gridPlan[r][c] = null; }
                else if (isWall(t)) { nW++; if (nW > maxWallsPerRow) gridPlan[r][c] = null; }
            }
            for (let c = 0; c < 6; c++) {
                if (gridPlan[r][c] === null) {
                    gridPlan[r][c] = fillerTypes.length ? pickFrom(fillerTypes) : 'sunflower';
                }
            }
        }

        // v3.25.0 行战力均衡：按战力权重把"一行小喷菇、另一行西瓜炮台"的极端分布拉平。
        // 只在同类之间跨行对调（射手↔射手 / 墙↔墙 / 其他↔其他），不破坏每行射手/墙体限额。
        {
            const powerMap = {
                peashooter: 2, snowpea: 3, repeater: 4, threepeater: 5, splitpea: 4, gatlingpea: 8,
                melonpult: 8, wintermelon: 10, cattail: 9, gloomshroom: 7, fumeshroom: 3, puffshroom: 1,
                scaredyshroom: 1, sunshroom: 1, sunflower: 1, twinsunflower: 2, wallnut: 2, tallnut: 5,
                pumpkinhead: 3, chomper: 5, potatomine: 4, squash: 4, spikeweed: 2, spikerock: 4,
                garlic: 2, torchwood: 3, cabbagepult: 4, kernelpult: 4, starfruit: 5, hypnoshroom: 4, doomshroom: 10
            };
            const pw = t => powerMap[t] || 3;
            const cat = t => isShooter(t) ? 's' : (isWall(t) ? 'w' : 'o');
            for (let iter = 0; iter < 80; iter++) {
                const rp = gridPlan.map(row => row.reduce((s, t) => s + pw(t), 0));
                let hi = 0, lo = 0;
                rp.forEach((p, i) => { if (p > rp[hi]) hi = i; if (p < rp[lo]) lo = i; });
                if (rp[hi] - rp[lo] <= 4) break;
                let bigC = -1, bigV = -1, smallC = -1, smallV = 1e9;
                for (let c = 0; c < 6; c++) {
                    const t = gridPlan[hi][c];
                    if (pw(t) > bigV) { bigV = pw(t); bigC = c; }
                }
                for (let c = 0; c < 6; c++) {
                    const t = gridPlan[lo][c];
                    if (pw(t) < smallV && pw(t) < bigV) { smallV = pw(t); smallC = c; }
                }
                if (bigC < 0 || smallC < 0) break;
                const A = gridPlan[hi][bigC], B = gridPlan[lo][smallC];
                if (cat(A) !== cat(B)) break; // 没有同类可换 → 放弃（限额优先于完美均衡）
                gridPlan[hi][bigC] = B;
                gridPlan[lo][smallC] = A;
            }
        }

        // v3.25.0 阳光数量校准：限流兜底/射手保底可能把计数顶偏，这里收敛回目标档
        {
            sunGuard = 0;
            while (countSun() > sunTarget && sunGuard++ < 300) {
                const rr = Math.floor(Math.random() * 5), cc = Math.floor(Math.random() * 6);
                if (sunKinds.includes(gridPlan[rr][cc])) gridPlan[rr][cc] = pickFrom(fillerTypes.length ? fillerTypes : types);
            }
            sunGuard = 0;
            while (countSun() < sunTarget && sunGuard++ < 300) {
                const rr = Math.floor(Math.random() * 5), cc = Math.floor(Math.random() * 6);
                if (!sunKinds.includes(gridPlan[rr][cc]) && !isShooter(gridPlan[rr][cc]) && !isWall(gridPlan[rr][cc])) {
                    gridPlan[rr][cc] = (cfg.plantTier === 2 && Math.random() < 0.25) ? 'twinsunflower'
                        : (Math.random() < 0.35 ? 'sunshroom' : 'sunflower');
                }
            }
        }

        // v3.13.0：南瓜套不再独立成株当"壳墙"（和坚果墙没有区别），
        // 改为套在同行另一株植物头上——南瓜套格转成 filler 植物，
        // 并给选中的宿主格打标，落地时 attachShield() 挂 4000 耐久的壳。
        const shellRows = [];
        for (let r = 0; r < this.board.rows; r++) shellRows.push(new Array(6).fill(false));
        for (let r = 0; r < this.board.rows; r++) {
            for (let c = 0; c < 6; c++) {
                if (gridPlan[r][c] !== 'pumpkinhead') continue;
                const cands = [];
                for (let cc = 0; cc < 6; cc++) {
                    const t = gridPlan[r][cc];
                    if (cc !== c && t && t !== 'pumpkinhead' && !shellRows[r][cc]) cands.push(cc);
                }
                if (cands.length) {
                    const host = cands[Math.floor(Math.random() * cands.length)];
                    shellRows[r][host] = true;
                    // v3.25.0：补格用"非阳光"填充 —— 阳光数量已在上面校准到难度档，
                    // 这里若再随机补进向日葵会突破 3~5 上限
                    const nonsunFiller = fillerTypes.filter(t => !sunKinds.includes(t));
                    gridPlan[r][c] = nonsunFiller.length ? pickFrom(nonsunFiller) : 'peashooter';
                }
                // 极端情况（整行找不到宿主）才保留独立成株兜底
            }
        }

        // 落地：种到 col0~5（注意敌阵植物与玩家无关，直接 addPlant 逻辑实例化）
        for (let r = 0; r < this.board.rows; r++) {
            for (let c = 0; c < 6; c++) {
                const type = gridPlan[r][c];
                let plant = new Plant(this, type);
                // 防御：若该 type 在 getStats 里无素材分支（type 命名漂移），退回豌豆射手，
                // 避免敌阵出现"空格子"（v3.7.1 修复 potatoMine/fume 命名漂移的根因）
                if (!plant.element.getAttribute('src')) {
                    plant = new Plant(this, 'peashooter');
                }
                plant._zombieEnemy = true; // 标记为"敌方植物"（仅统计用）
                // 敌阵植物是"被动防御方"：禁止种下自动引爆（否则樱桃炸弹/毁灭菇等开局自爆消失，
                // 玩家会看到空格子）。保留 土豆雷/窝瓜 的"被接近/被踩才触发"机制（v3.7.1）
                plant.autoExplode = false;
                if (this.board.addPlant(plant, r, c)) {
                    // 种满 6 列(col0-5) = 30 株
                    // v3.13.0：该格被标记为南瓜套宿主 → 套上 4000 耐久的壳
                    if (shellRows[r][c]) plant.attachShield();
                    // v3.13.3：敌阵毁灭菇 = 陷阱 —— 开局 1 秒定时自爆会白白浪费，
                    // 关掉自爆引信，改为僵尸贴近同格时才起爆（见 Plant.update 的 _enemyTrap 分支）
                    if (type === 'doomshroom') {
                        // 重新启用自爆机器（v3.13.3）：_enemyTrap 分支只在僵尸贴脸时走引信倒计时，
                        // 不会出现 v3.7.1 担心的"开局定时自爆"——引信 1.0s 从开局一直冻着
                        plant.autoExplode = true;
                        plant._enemyTrap = true;
                    }
                }
            }
        }
    }

    // 顶栏右下角难度角标（我是僵尸）
    _syncZombieHud() {
        const old = document.getElementById('zombie-diff-chip');
        if (old && old.parentNode) old.parentNode.removeChild(old);
        if (!this.zombieMode) return;
        const cfg = this._zombieDiffCfg();
        const chip = document.createElement('div');
        chip.id = 'zombie-diff-chip';
        chip.className = 'diff-chip diff-' + cfg.key;
        chip.innerHTML = `我是僵尸 · ${cfg.label}<span class="diff-chip-en">${cfg.key.toUpperCase()}</span>`;
        chip.title = `我是僵尸 · ${cfg.label}难度`;
        const top = document.getElementById('top-bar');
        if (top) top.appendChild(chip);
    }

    // 玩家点击草坪行释放僵尸（InputManager 调用）；阳光不足/非行内返回
    deployZombie(type, row) {
        if (this.state !== 'PLAYING' || !this.zombieMode) return;
        if (row < 0 || row >= this.board.rows) return;
        const price = this.zombiePrice();
        if (!price[type]) return;
        if (this.sunCount < price[type]) {
            this.showAnnouncement('阳光不够，先啃向日葵攒阳光吧', '#ff8a5c');
            return;
        }
        this.sunCount -= price[type];
        this._syncZombieSunUI();
        const z = new Zombie(this, row, type);
        z._playerZombie = true; // 标记为我方僵尸（胜负检测用）
        this.entities.push(z);
        this.audioManager.play('plant');
        this.pendingZombie = null;
        this._refreshZombieBank();
    }

    // 胜利：全部 5 行脑子都被吃掉（zombieEatBrain 在吃光最后一行时调用）
    zombieWin() {
        if (this.state !== 'PLAYING') return;
        this.state = 'GAMEOVER';
        this.audioManager.stop('bgm');
        this.audioManager.play('win');
        const diffLabel = this._zombieDiffCfg().label;
        const total = this.board.rows;
        const overlay = document.createElement('div');
        overlay.className = 'vase-win-overlay';
        overlay.innerHTML = `
            <div class="vase-win-panel">
                <div class="vase-win-lv">ALL BRAINS EATEN!</div>
                <div class="vase-win-title">🧠 通关！</div>
                <div class="vase-win-sub">僵尸吃光了全部 ${total} 个脑子！<span class="vase-win-diff">难度 · ${diffLabel}</span></div>
                <div class="vase-win-score">Final Score：<b>${this.score}</b></div>
                <div class="vase-win-btns">
                    <button id="z-win-replay" class="vase-win-btn again">再玩一局</button>
                    <button id="z-win-exit" class="vase-win-btn exit">退出</button>
                </div>
            </div>`;
        this.container.appendChild(overlay);
        overlay.querySelector('#z-win-replay').onclick = () => this.restartZombieLevel();
        overlay.querySelector('#z-win-exit').onclick = () => location.reload();
        this._zombieEndEls = [overlay];
    }

    // 失败：我方僵尸全灭 + 阳光买不起任何僵尸（< 最便宜 50）
    zombieLose() {
        if (this.state !== 'PLAYING') return;
        this.state = 'GAMEOVER';
        this.audioManager.stop('bgm');
        this.audioManager.play('lose');
        const diffLabel = this._zombieDiffCfg().label;
        const overlay = document.createElement('div');
        overlay.className = 'vase-win-overlay';
        overlay.innerHTML = `
            <div class="vase-win-panel">
                <div class="vase-win-lv" style="color:#a04030;">ALL ZOMBIES DOWN</div>
                <div class="vase-win-title" style="color:#7a2a18;">僵尸大军覆没…</div>
                <div class="vase-win-sub">植物守住了脑子<span class="vase-win-diff">难度 · ${diffLabel}</span></div>
                <div class="vase-win-score">Final Score：<b>${this.score}</b></div>
                <div class="vase-win-btns">
                    <button id="z-lose-replay" class="vase-win-btn again">再玩一局</button>
                    <button id="z-lose-exit" class="vase-win-btn exit">退出</button>
                </div>
            </div>`;
        this.container.appendChild(overlay);
        overlay.querySelector('#z-lose-replay').onclick = () => this.restartZombieLevel();
        overlay.querySelector('#z-lose-exit').onclick = () => location.reload();
        this._zombieEndEls = [overlay];
    }

    // 每帧胜负检测（仅 zombieMode）：僵尸全灭 + 阳光 < 50 → 判负（给 2.5s 防抖动）
    _checkZombieEnd(dt) {
        if (this.state !== 'PLAYING') return;
        const hasMyZombie = this.entities.some(e =>
            e instanceof Zombie && !e.isDead && e.state !== 'DYING' && !e.hypnotized && e._playerZombie
        );
        if (hasMyZombie) { this._zLoseTimer = 0; return; }
        if (this.sunCount >= 50) { this._zLoseTimer = 0; return; }
        if (!this._zLoseTimer) this._zLoseTimer = 0;
        this._zLoseTimer += dt || (1 / 60);
        if (this._zLoseTimer >= 2.5) this.zombieLose();
    }

    // 再玩一局：清整场（脑子/敌阵植物/我方僵尸/子弹/阳光实体）后原地按同难度重开
    restartZombieLevel() {
        this.audioManager.play('btn');
        if (this._zombieEndEls) {
            this._zombieEndEls.forEach(el => { if (el.parentNode) el.parentNode.removeChild(el); });
            this._zombieEndEls = null;
        }
        this._clearBrainEls();
        this.entities.forEach(e => this._removeEntityDom(e));
        this.entities = [];
        this._hardSweepEntityLayer(); // v3.18.0：硬清场，孤儿 DOM 一律带走
        for (let r = 0; r < this.board.rows; r++) {
            for (let c = 0; c < this.board.cols; c++) this.board.grid[r][c] = null;
        }
        this.score = 0;
        this.pendingZombie = null;
        this._zLoseTimer = 0;
        this.updateScore();
        this.startGame();
    }

    // 三档难度的完整配置：罐子数量 / 类型抽签桶 / 问号罐出僵尸概率 / 植物罐出植物概率 / 僵尸池 / 僵尸血量倍率
    _vaseDiffCfg() {
        const d = this.vaseDifficulty || 'hard';
        const map = {
            easy: {
                key: 'easy', label: '简单', totalMin: 16, totalMax: 20,
                bag: ['plant','plant','plant','plant','plant','plant','plant','plant',
                      'question','question','question','question','question',
                      'zombie','zombie'], // 植物罐绝对多数 8/15≈53%, 僵尸罐最少
                qZombie: 0.25,   // 简单: 问号罐仅 25% 出僵尸 —— 75% 是植物, 轻松友好
                pCard: 0.75,     // v3.16.0 植物罐 75% 植物 / 25% 阳光
                plantPerm: 0.85, // 植物罐砸出的植物 85% 永久 / 15% 一次性(炸弹)
                qPerm: 0.72,     // 问号罐砸出的植物 72% 永久 / 28% 一次性
                zPool: ['normal','normal','normal','normal','normal','normal','conehead','conehead','flag'],
                hpMul: 1.0
            },
            hard: {
                key: 'hard', label: '困难', totalMin: 22, totalMax: 26,
                bag: ['plant','plant','plant','plant','plant',
                      'question','question','question','question','question',
                      'question','question','question','question','question',
                      'zombie','zombie','zombie','zombie'], // 问号占多数 11/20≈55%
                qZombie: 0.5,    // 困难: 问号罐 50% 僵尸 / 50% 植物 —— 各半, 有随机感但不压人
                pCard: 0.75,   // v3.16.0 植物罐 75% 植物 / 25% 阳光
                plantPerm: 0.8,  // 植物罐砸出的植物 80% 永久 / 20% 一次性
                qPerm: 0.62,     // 问号罐砸出的植物 62% 永久 / 38% 一次性
                zPool: ['normal','normal','normal','normal','conehead','conehead','buckethead','flag','polevaulting','newspaper'],
                hpMul: 1.1 // v3.30.0 困难加难：砸出僵尸血量 +10%（原 1.0）
            },
            hell: {
                key: 'hell', label: '地狱', totalMin: 26, totalMax: 28,
                bag: ['plant','plant','plant',
                      'question','question','question','question','question','question','question','question','question','question','question',
                      'zombie','zombie','zombie','zombie','zombie','zombie'], // 植物罐仅 3/20≈15%, 僵尸罐高达 6/20≈30%
                qZombie: 0.6,    // 地狱: 问号罐 60% 僵尸 —— 僵尸偏多但 40% 保底是植物, 绝不是全僵尸
                pCard: 0.75,     // v3.16.0 植物罐 75% 植物 / 25% 阳光
                plantPerm: 0.9,  // 地狱植物金贵: 植物罐砸出的植物 90% 永久 / 10% 一次性
                qPerm: 0.72,     // 问号罐砸出的植物 72% 永久 / 28% 一次性
                zPool: ['normal','normal','normal','conehead','conehead','buckethead','buckethead','newspaper','polevaulting','flag','screendoor'],
                hpMul: 1.45      // v3.30.0 地狱加难：砸出僵尸血量 +45%（原 1.35）
            }
        };
        return map[d] || map.hard;
    }

    showSeedChooser() {
        const chooser = document.getElementById('seed-chooser');
        const grid = document.getElementById('chooser-grid');
        const countSpan = document.getElementById('chooser-count');
        const btnRock = document.getElementById('btn-lets-rock');
        
        chooser.style.display = 'flex';
        this.selectedSeeds = []; // Will store the selected seed objects
        grid.innerHTML = '';
        
        // 融合进化版：14 张基础牌 + 西瓜投手可选种，其余植物全部通过融合/进化获得
        // v3.10.0：再把 卷心菜投手 / 玉米投手 加入基础牌，作为新一批融合配方的"种子"
        const fusionBasePlants = ['sunflower', 'peashooter', 'wallnut', 'cherrybomb', 'squash',
            'jalapeno', 'potatomine', 'chomper', 'tallnut', 'puffshroom',
            'iceshroom', 'doomshroom', 'spikeweed', 'garlic', 'melonpult',
            'cabbagepult', 'kernelpult', 'plantbox'];
        const seedList = this.fusionMode
            ? this.seeds.filter(s => fusionBasePlants.includes(s.type))
            : this.seeds;
        
        seedList.forEach(s => {
            const card = document.createElement('div');
            card.className = 'chooser-card';
            card.dataset.type = s.type; // 便于模式自检/自动化断言（v3.10.0）
            card.style.backgroundImage = `url('${s.img}')`;
            // Add a tick or dim when selected
            card.onclick = () => {
                const index = this.selectedSeeds.indexOf(s);
                if (index > -1) {
                    this.selectedSeeds.splice(index, 1);
                    card.style.filter = 'none';
                } else {
                    if (this.selectedSeeds.length < 10) {
                        this.selectedSeeds.push(s);
                        card.style.filter = 'brightness(50%)'; // Dim to show selected
                    }
                }
                
                countSpan.innerText = this.selectedSeeds.length;
                if (this.selectedSeeds.length > 0) {
                    btnRock.disabled = false;
                    btnRock.style.opacity = '1';
                } else {
                    btnRock.disabled = true;
                    btnRock.style.opacity = '0.5';
                }
            };
            grid.appendChild(card);
        });
        
        btnRock.onclick = () => {
            this.audioManager.play('btn');
            chooser.style.display = 'none';
            this.startGame();
        };

        const btnBack = document.getElementById('btn-back');
        btnBack.onclick = () => {
            this.audioManager.play('btn');
            chooser.style.display = 'none';
            document.getElementById('start-menu').style.display = 'block';
        };
    }
    
    startGame() {
        const seedBank = document.getElementById('seed-bank');
        seedBank.innerHTML = ''; // clear
        this.cooldowns = {};
        this.vaseFreeCards = []; // 砸罐子：清空上一局残留的免费植物卡
        this.waveManager.reset(); // v3.11.1：原地重开时刷怪节奏归零（全新对局时与构造值相同，无副作用）
        
        if (this.fusionMode || this.vaseMode) {
            const gloveBtn = document.getElementById('glove-bank');
            gloveBtn.style.display = 'flex';
            // v3.31.0：click 监听此前只在 initFusionUI（融合模式专属）里挂 → 砸罐子模式点击无效。
            // 统一挪到这里，dataset 防重复绑定（重复绑定会导致一次点击 toggle 两次=看起来没反应）
            if (!gloveBtn.dataset.gloveBound) {
                gloveBtn.dataset.gloveBound = '1';
                gloveBtn.addEventListener('click', () => this.toggleGlove());
            }
            if (this.fusionMode) {
                document.getElementById('recipe-book-btn').style.display = 'flex';
                this.initFusionUI();
            }
        } else {
            document.getElementById('glove-bank').style.display = 'none';
            document.getElementById('recipe-book-btn').style.display = 'none';
        }
        // v3.30.0 砸罐子手套：每关 2 次 —— 可融合（同融合手套）+ 新增"搬移植物换格"
        this.vaseGloveUses = this.vaseMode ? 2 : 0;
        this._syncVaseGloveHud();

        if (this.vaseMode) {
            // 砸罐子：阳光从 0 起步，只能靠植物罐砸出的阳光积攒（攒到 75 买路灯花），
            // 天降阳光已在 update() 中对 vase 模式关闭
            this.sunCount = 0;
            this.sunCountElement.innerText = '0';
            this.setupVases();           // 按 this.vaseDifficulty 配置摆罐
            this.insertPlanternShop();   // 路灯花商店：常驻种子栏首位
            this._showVaseSignature();   // 战场左侧(罐子区的左边)打出帅气的「区耀丁」署名
            this._syncVaseHud();         // HUD 常驻难度角标
        }

        // 我是僵尸（v3.7.0）：不出植物种子卡 → 顶部切到僵尸卡带；种满敌阵 + 摆脑子
        if (this.zombieMode) {
            seedBank.style.display = 'none';
            const zb = document.getElementById('zombie-bank');
            if (zb) zb.style.display = 'flex';
            const shovel = document.getElementById('shovel-bank');
            if (shovel) shovel.style.display = 'none';
            const cfg = this._zombieDiffCfg();
            this.sunCount = cfg.sun;
            this.sunCountElement.innerText = String(cfg.sun);
            this.selectedSeeds = [];
            this.pendingZombie = null;
            this._zLoseTimer = 0;
            this.buildZombieBank();
            this._spawnBrainEls();
            this.setupZombieEnemies();
            this._syncZombieHud();
        }
        
        // Setup random events (Delay time-based events, favor score-based)
        this.eventTimer = 150 + Math.random() * 60; // First time-based event between 2.5 to 3.5 minutes
        this.scoreMilestones = [100, 300, 500, 800, 1200, 1800, 2500, 3500, 5000]; // Events trigger specifically at these scores
        
        this.selectedSeeds.forEach((s, i) => {
            this.cooldowns[s.type] = 0;
            const card = document.createElement('div');
            card.className = 'seed-card';
            card.dataset.type = s.type;
            card.dataset.cost = s.cost;
            card.dataset.cooldown = s.cooldown;
            card.style.backgroundImage = `url('${s.img}')`;
            card.innerHTML = `
                <div class="cooldown-overlay"></div>
            `;
            seedBank.appendChild(card);
        });
        
        this.updateUI();
        // 重开/开局前先停掉可能仍在播的输赢音乐, 再切回关卡 BGM, 防止叠播
        this.audioManager.stop('lose');
        this.audioManager.stop('win');
        this.audioManager.play('bgm');
        this.lastTime = performance.now();
        // 仅当主循环不在跑时启动 rAF（state 离开 PLAYING 后 loop 已停）；
        // PLAYING 中再调 startGame(如测试重开)则沿用旧循环, 防止双 rAF 导致双倍速
        if (this.state !== 'PLAYING') {
            this.state = 'PLAYING';
            requestAnimationFrame((t) => this.loop(t));
        } else {
            this.state = 'PLAYING';
        }
    }
    
    initUI() {
        // Just define the seeds, don't populate the top bar yet
        this.seeds = [
            { type: 'sunflower', cost: 50, cooldown: 7.5, img: 'assets/images/Card/Plants/SunFlower.png?v=1790416816' },
            { type: 'twinsunflower', cost: 150, cooldown: 50, img: 'assets/images/Card/Plants/TwinSunflower.png?v=1790416816' },
            { type: 'sunshroom', cost: 25, cooldown: 7.5, img: 'assets/images/Card/Plants/SunShroom.png?v=1790416816' },
            { type: 'peashooter', cost: 100, cooldown: 7.5, img: 'assets/images/Card/Plants/Peashooter.png?v=1790416816' },
            { type: 'repeater', cost: 200, cooldown: 7.5, img: 'assets/images/Card/Plants/Repeater.png?v=1790416816' },
            { type: 'threepeater', cost: 300, cooldown: 7.5, img: 'assets/images/Card/Plants/Threepeater.png?v=1790416816' },
            { type: 'gatlingpea', cost: 250, cooldown: 50, img: 'assets/images/Card/Plants/GatlingPea.png?v=1790416816' },
            { type: 'snowpea', cost: 175, cooldown: 7.5, img: 'assets/images/Card/Plants/SnowPea.png?v=1790416816' },
            { type: 'splitpea', cost: 125, cooldown: 7.5, img: 'assets/images/Card/Plants/SplitPea.png?v=1790416816' },
            { type: 'torchwood', cost: 175, cooldown: 7.5, img: 'assets/images/Card/Plants/Torchwood.png?v=1790416816' },
            { type: 'wallnut', cost: 50, cooldown: 30, img: 'assets/images/Card/Plants/WallNut.png?v=1790416816' },
            { type: 'cherrybomb', cost: 150, cooldown: 50, img: 'assets/images/Card/Plants/CherryBomb.png?v=1790416816' },            { type: 'squash', cost: 50, cooldown: 30, img: 'assets/images/Card/Plants/Squash.png?v=1790416816' },
            { type: 'jalapeno', cost: 125, cooldown: 50, img: 'assets/images/Card/Plants/Jalapeno.png?v=1790416816' },
            { type: 'potatomine', cost: 25, cooldown: 30, img: 'assets/images/Card/Plants/PotatoMine.png?v=1790416816' },
            { type: 'chomper', cost: 150, cooldown: 7.5, img: 'assets/images/Card/Plants/Chomper.png?v=1790416816' },
            { type: 'tallnut', cost: 125, cooldown: 30, img: 'assets/images/Card/Plants/TallNut.png?v=1790416816' },
            { type: 'puffshroom', cost: 0, cooldown: 7.5, img: 'assets/images/Card/Plants/PuffShroom.png?v=1790416816' },
            { type: 'fumeshroom', cost: 75, cooldown: 7.5, img: 'assets/images/Card/Plants/FumeShroom.png?v=1790416816' },
            { type: 'scaredyshroom', cost: 25, cooldown: 7.5, img: 'assets/images/Card/Plants/ScaredyShroom.png?v=1790416816' },
            { type: 'gloomshroom', cost: 150, cooldown: 7.5, img: 'assets/images/Card/Plants/GloomShroom.png?v=1790416816' },
            { type: 'spikerock', cost: 125, cooldown: 7.5, img: 'assets/images/Card/Plants/Spikerock.png?v=1790416816' },
            { type: 'cattail', cost: 225, cooldown: 7.5, img: 'assets/images/Card/Plants/Cattail.png?v=1790416816' },
            { type: 'melonpult', cost: 300, cooldown: 7.5, img: 'assets/images/Card/Plants/MelonPult.png?v=1790416816' },{ type: 'iceshroom', cost: 75, cooldown: 50, img: 'assets/images/Card/Plants/IceShroom.png?v=1790416816' },
            { type: 'doomshroom', cost: 125, cooldown: 50, img: 'assets/images/Card/Plants/DoomShroom.png?v=1790416816' },
            { type: 'spikeweed', cost: 100, cooldown: 7.5, img: 'assets/images/Card/Plants/Spikeweed.png?v=1790416816' },
            { type: 'garlic', cost: 50, cooldown: 7.5, img: 'assets/images/Card/Plants/Garlic.png?v=1790416816' },
            // ===== v3.6.0 经典模式新增 4 植物（数值取 PVZ1 原版；融合模式选卡仍过滤为 15 基础牌，不受影响）=====
            { type: 'wintermelon', cost: 200, cooldown: 7.5, img: 'assets/images/Card/Plants/WinterMelon.png?v=1790416816' },
            { type: 'starfruit', cost: 125, cooldown: 7.5, img: 'assets/images/Card/Plants/Starfruit.png?v=1790416816' },
            { type: 'hypnoshroom', cost: 75, cooldown: 30, img: 'assets/images/Card/Plants/HypnoShroom.png?v=1790416816' },
            { type: 'pumpkinhead', cost: 125, cooldown: 30, img: 'assets/images/Card/Plants/PumpkinHead.png?v=1790416816' },
            // ===== v3.10.0 投手两兄弟，v3.11.0 调价（破甲 + 黄油定身很值钱，不再按原版 100 阳光卖）=====
            // 抛射物可破甲：越过路障/铁桶/报纸/铁门直接打僵尸本体，护甲不脱落。
            // 玉米投手另有 20% 概率投出黄油（定身 3 秒）。
            { type: 'cabbagepult', cost: 150, cooldown: 7.5, img: 'assets/images/Card/Plants/CabbagePult.png?v=1790416816' },
            { type: 'kernelpult', cost: 175, cooldown: 7.5, img: 'assets/images/Card/Plants/KernelPult.png?v=1790416816' },
            // ===== v3.24.0 植物盲盒：500 阳光，种下随机开出"经典冒险+融合进化"全植物池中的一株 =====
            { type: 'plantbox', cost: 500, cooldown: 5, img: 'assets/images/Card/Plants/PlantBox.png?v=1790416816' }
        ];
        // The top bar will be populated in startGame() after selection
    }
    
    addSun(amount) {
        this.sunCount += amount;
        this.sunCountElement.innerText = this.sunCount;
        this.updateUI();
    }
    

    initFusionUI() {
        const gloveBtn = document.getElementById('glove-bank');
        this.isGloveActive = false;
        this.gloveSource = null;
        if (this._fusionUIInit) return;
        this._fusionUIInit = true;
        // v3.31.0：手套 click 绑定已上移到 startGame（dataset 防重复），这里不再重复绑
        
        const recipes = [
            { a: 'peashooter', b: 'peashooter', result: '双发豌豆', img: 'assets/images/Plants/Repeater/Repeater.gif', css: false },
            { a: 'peashooter', b: 'repeater', result: '三线射手', img: 'assets/images/Plants/Threepeater/Threepeater.gif', css: false },
            { a: 'repeater', b: 'repeater', result: '机枪射手', img: 'assets/images/Plants/GatlingPea/GatlingPea.gif', css: false },
            { a: 'sunflower', b: 'sunflower', result: '双子向日葵', img: 'assets/images/Plants/TwinSunflower/TwinSunflower1.gif', css: false },
            { a: 'peashooter', b: 'iceshroom', result: '寒冰射手', img: 'assets/images/Plants/SnowPea/SnowPea.gif', css: false },
            { a: 'peashooter', b: 'squash', result: '双向豌豆', img: 'assets/images/Plants/SplitPea/SplitPea.gif', css: false },
            { a: 'puffshroom', b: 'puffshroom', result: '大喷菇', img: 'assets/images/Plants/FumeShroom/FumeShroom.gif', css: false },
            { a: 'puffshroom', b: 'sunflower', result: '阳光菇', img: 'assets/images/Plants/SunShroom/SunShroom.gif', css: false },
            { a: 'puffshroom', b: 'peashooter', result: '胆小菇', img: 'assets/images/Plants/ScaredyShroom/ScaredyShroom.gif', css: false },
            { a: 'wallnut', b: 'jalapeno', result: '火炬树桩', img: 'assets/images/Plants/Torchwood/Torchwood.gif', css: false },
            // v3.11.0：删除「大嘴花+高坚果 = 西瓜投手」——这条配方没有任何逻辑依据，
            // 西瓜投手在融合模式里本来就直接在选卡栏里可选（见 fusionBasePlants）。
            { a: 'peashooter', b: 'sunflower', result: '豌豆向日葵', base: 'assets/images/Plants/SunFlower/SunFlower1.gif', over: 'assets/images/Plants/Peashooter/Peashooter.gif', overClip: 'polygon(0 0, 100% 0, 100% 65%, 0 65%)', overTransform: 'translate(0px, -20px) scale(1.0)' },
            { a: 'peashooter', b: 'wallnut', result: '坚果射手', base: 'assets/images/Plants/WallNut/WallNut.gif', over: 'assets/images/Plants/Peashooter/Peashooter.gif', overClip: 'polygon(0 0, 100% 0, 100% 65%, 0 65%)', overTransform: 'translate(5px, -15px) scale(1.0)' },
            { a: 'snowpea', b: 'cherrybomb', result: '寒冰炸弹', img: 'assets/images/Plants/CherryBomb/CherryBomb.gif', filter: 'hue-rotate(180deg) saturate(1.5)', css: false },
            { a: 'puffshroom', b: 'potatomine', result: '孢子地雷', base: 'assets/images/Plants/PotatoMine/PotatoMine.gif', over: 'assets/images/Plants/PuffShroom/PuffShroom.gif', overClip: 'polygon(0 0, 100% 0, 100% 85%, 0 85%)', overTransform: 'translate(0px, -45px) scale(0.9)' },
            { a: 'chomper', b: 'wallnut', result: '大嘴坚果', base: 'assets/images/Plants/WallNut/WallNut.gif', over: 'assets/images/Plants/Chomper/Chomper.gif', overClip: 'polygon(0 0, 100% 0, 100% 85%, 0 85%)', overTransform: 'translate(20px, -25px) scale(0.9)' },
            { a: 'snowpea', b: 'wallnut', result: '寒冰坚果', img: 'assets/images/Plants/WallNut/WallNut.gif', filter: 'hue-rotate(180deg) saturate(1.5) brightness(1.2)', css: false },
            { a: 'peashooter', b: 'cherrybomb', result: '樱桃射手', img: 'assets/images/Plants/Peashooter/Peashooter.gif', filter: 'hue-rotate(-45deg) saturate(2.0)', css: false },
            { a: 'sunflower', b: 'doomshroom', result: '毁灭向日葵', img: 'assets/images/Plants/SunFlower/SunFlower1.gif', filter: 'grayscale(0.8) brightness(0.6) sepia(1) hue-rotate(240deg) saturate(3)', css: false },
            { a: 'melonpult', b: 'iceshroom', result: '冰西瓜投手', img: 'assets/images/Plants/WinterMelon/WinterMelon.png?v=1790416816', css: false },
            { a: 'repeater', b: 'spikeweed', result: '猫尾草', img: 'assets/images/Plants/Cattail/Cattail.gif', css: false },
            { a: 'fumeshroom', b: 'fumeshroom', result: '忧郁菇', img: 'assets/images/Plants/GloomShroom/GloomShroom.gif', css: false },
            { a: 'spikeweed', b: 'spikeweed', result: '钢地刺', img: 'assets/images/Plants/Spikerock/Spikerock.gif', css: false },
            { a: 'spikeweed', b: 'wallnut', result: '地刺坚果', base: 'assets/images/Plants/WallNut/WallNut.gif', over: 'assets/images/Plants/Spikeweed/Spikeweed.gif', overTransform: 'translate(0px, 24px) scale(1.0)' },
            { a: 'spikerock', b: 'tallnut', result: '钢刺高坚果', base: 'assets/images/Plants/TallNut/TallNut.gif', over: 'assets/images/Plants/Spikerock/Spikerock.gif', overTransform: 'translate(0px, 30px) scale(1.0)' },
            // ===== v3.2.38 新增 =====
            { a: 'splitpea', b: 'sunflower', result: '杨桃', img: 'assets/images/Plants/Starfruit/Starfruit.gif', css: false },
            { a: 'puffshroom', b: 'garlic', result: '魅惑菇', img: 'assets/images/Plants/HypnoShroom/HypnoShroom.gif', css: false },
            { a: 'wallnut', b: 'tallnut', result: '南瓜壳（可套在任意植物上）', img: 'assets/images/Plants/PumpkinHead/PumpkinHead.gif', css: false },
            { a: 'melonpult', b: 'cattail', result: '西瓜猫尾草', base: 'assets/images/Plants/Cattail/Cattail.gif', over: 'assets/images/Plants/MelonPult/MelonPult.png?v=1790416816', overTransform: 'translate(-5px, -30px) scale(0.7)' },
            { a: 'wintermelon', b: 'cattail', result: '冰西瓜猫尾草', base: 'assets/images/Plants/Cattail/Cattail.gif', over: 'assets/images/Plants/WinterMelon/WinterMelon.png?v=1790416816', overTransform: 'translate(-5px, -30px) scale(0.7)' },
            // ===== v3.10.0 以卷心菜投手 / 玉米投手为基础的新融合 =====
            // v3.11.0：下面两条的 overClip / overTransform 与 Plant.js 内的实机分支**完全同步**
            // （此前图鉴写的是旧的"左上角对齐 + 整块上移"版本，与实机不是同一套，图鉴和游戏里长得不一样）
            { a: 'cabbagepult', b: 'kernelpult', result: '双料投手（3/4 投卷心菜、1/4 投黄油定身 3 秒）', base: 'assets/images/Plants/KernelPult/KernelPult.png?v=1790416816', over: 'assets/images/Plants/CabbagePult/CabbagePult.png?v=1790416816', overClip: 'polygon(0 0, 48% 0, 48% 50%, 0 50%)', overTransform: 'translate(37px, 8px)' },
            { a: 'cabbagepult', b: 'wallnut', result: '卷心菜堡垒（坚果肉盾 + 继续投掷，4000 耐久）', base: 'assets/images/Plants/WallNut/WallNut.gif', over: 'assets/images/Plants/CabbagePult/CabbagePult.png?v=1790416816', overClip: 'polygon(0 0, 46% 0, 46% 46%, 0 46%)', overTransform: 'translate(26px, -4px)' },
            { a: 'cabbagepult', b: 'iceshroom', result: '寒冰卷心菜（破甲 + 命中减速 10 秒）', img: 'assets/images/Plants/CabbagePult/CabbagePult.png?v=1790416816', filter: 'brightness(112%) hue-rotate(120deg) saturate(1.7)', css: false },
            { a: 'kernelpult', b: 'jalapeno', result: '爆米花投手（破甲 + 命中 3×3 溅射）', img: 'assets/images/Plants/KernelPult/KernelPult.png?v=1790416816', filter: 'hue-rotate(-18deg) saturate(1.9) brightness(1.18)', css: false },
            { a: 'kernelpult', b: 'kernelpult', result: '玉米加农炮（需两株横向相邻 + 第三株融合；占两格，充能后点击开镜、按 M 发射）', img: 'assets/images/Plants/CobCannon/CobCannon.png?v=1790416816', css: false }
        ];
        
        const list = document.getElementById('recipe-list');
        list.innerHTML = '';
        recipes.forEach(r => {
            let li = document.createElement('li');
            li.style.borderBottom = '1px dashed #ccc';
            li.style.padding = '10px 0';
            li.style.display = 'flex';
            li.style.alignItems = 'center';
            li.style.justifyContent = 'space-between';
            
            const getImg = (t) => {
                const map = {
                    'peashooter': 'assets/images/Plants/Peashooter/Peashooter.gif',
                    'sunflower': 'assets/images/Plants/SunFlower/SunFlower1.gif',
                    'wallnut': 'assets/images/Plants/WallNut/WallNut.gif',
                    'snowpea': 'assets/images/Plants/SnowPea/SnowPea.gif',
                    'cherrybomb': 'assets/images/Plants/CherryBomb/CherryBomb.gif',
                    'puffshroom': 'assets/images/Plants/PuffShroom/PuffShroom.gif',
                    'potatomine': 'assets/images/Plants/PotatoMine/PotatoMine.gif',
                    'chomper': 'assets/images/Plants/Chomper/Chomper.gif',
                    'repeater': 'assets/images/Plants/Repeater/Repeater.gif',
                    'iceshroom': 'assets/images/Plants/IceShroom/IceShroom.gif',
                    'squash': 'assets/images/Plants/Squash/Squash.gif',
                    'doomshroom': 'assets/images/Plants/DoomShroom/DoomShroom.gif',
                    'jalapeno': 'assets/images/Plants/Jalapeno/Jalapeno.gif',
                    'fumeshroom': 'assets/images/Plants/FumeShroom/FumeShroom.gif',
                    'spikeweed': 'assets/images/Plants/Spikeweed/Spikeweed.gif',
                    'tallnut': 'assets/images/Plants/TallNut/TallNut.gif',
                    'melonpult': 'assets/images/Plants/MelonPult/MelonPult.png?v=1790416816',
                    'wintermelon': 'assets/images/Plants/WinterMelon/WinterMelon.png?v=1790416816',
                    'cattail': 'assets/images/Plants/Cattail/Cattail.gif',
                    'gloomshroom': 'assets/images/Plants/GloomShroom/GloomShroom.gif',
                    'spikerock': 'assets/images/Plants/Spikerock/Spikerock.gif',
                    'threepeater': 'assets/images/Plants/Threepeater/Threepeater.gif',
                    'splitpea': 'assets/images/Plants/SplitPea/SplitPea.gif',
                    'garlic': 'assets/images/Plants/Garlic/Garlic.gif',
                    'starfruit': 'assets/images/Plants/Starfruit/Starfruit.gif',
                    'hypnoshroom': 'assets/images/Plants/HypnoShroom/HypnoShroom.gif',
                    'pumpkinhead': 'assets/images/Plants/PumpkinHead/PumpkinHead.gif',
                    'cabbagepult': 'assets/images/Plants/CabbagePult/CabbagePult.png?v=1790416816',
                    'kernelpult': 'assets/images/Plants/KernelPult/KernelPult.png?v=1790416816'
                };
                return map[t] || '';
            };
            
            li.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px; width: 42%;">
                    <div style="width: 70px; height: 100px; display: flex; justify-content: center; align-items: center; overflow: hidden;">
                        <img src="${getImg(r.a)}" style="max-width: 70px; max-height: 100px; object-fit: contain;">
                    </div>
                    <span style="font-weight: bold; font-size: 20px;">+</span>
                    <div style="width: 70px; height: 100px; display: flex; justify-content: center; align-items: center; overflow: hidden;">
                        <img src="${getImg(r.b)}" style="max-width: 70px; max-height: 100px; object-fit: contain;">
                    </div>
                </div>
                <div style="width: 8%; text-align: center; font-size: 24px; font-weight: bold;">=</div>
                <div style="width: 50%; text-align: right; display: flex; align-items: center; justify-content: flex-end; gap: 10px; font-weight: bold; color: #822; font-size: 16px;">
                    <span>${r.result}</span>
                    <div style="position: relative; width: 78px; height: 80px; display: flex; justify-content: center; align-items: center;">
                        ${r.base ? 
                          /* v3.11.0：图鉴预览改为**与游戏内完全相同的叠加约定**——
                             用 0 尺寸锚点表示"植物中心"，两张贴图都按 translate(-50%,-50%) 居中，
                             再整体缩放。旧写法把 over 用 left:0/top:0 对齐 base 左上角，
                             与游戏内的"以中心对齐"不是同一套，图鉴与实机长得不一样。 */
                          `<div style="position: absolute; left: 50%; top: 50%; width: 0; height: 0; transform: scale(0.62);">
                              <img src="${r.base}" style="position: absolute; left: 0; top: 0; transform: translate(-50%, -50%);">
                              <img src="${r.over}" style="position: absolute; left: 0; top: 0; transform: translate(-50%, -50%) ${r.overTransform || ''}; ${r.overClip ? `clip-path: ${r.overClip}; -webkit-clip-path: ${r.overClip};` : ''}">
                           </div>` 
                          : `<img src="${r.img}" style="max-width: 74px; max-height: 76px; filter: ${r.filter || 'none'}; object-fit: contain;">`
                        }
                    </div>
                </div>
            `;
            list.appendChild(li);
        });
        
        document.getElementById('recipe-book-btn').addEventListener('click', () => {
            document.getElementById('recipe-modal').style.display = 'block';
        });
        
        document.getElementById('close-recipe').addEventListener('click', () => {
            document.getElementById('recipe-modal').style.display = 'none';
        });
    }

    // 切换 手 ↔ 融合手套（🧤按钮 与 空格键 共用）。
    // 开启：清掉手里正拿的种子/铲子，光标变为🧤；关闭：把正在拿取的植物放回原格，光标恢复为手。
    toggleGlove() {
        const gloveBtn = document.getElementById('glove-bank');
        if (!gloveBtn || gloveBtn.style.display === 'none') return false;
        // v3.30.0 砸罐子手套：每关 2 次，用完不能再掏出手套
        if (this.vaseMode && !this.isGloveActive && this.vaseGloveUses <= 0) {
            this.showAnnouncement('本关的手套次数已用完（每关 2 次）', '#ff6666');
            if (this.audioManager) this.audioManager.play('btn');
            return false;
        }
        this.isGloveActive = !this.isGloveActive;
        this.isGloveDragging = false;
        if (this.isGloveActive) {
            if (this.inputManager) {
                this.inputManager.selectedSeed = null;
                this.inputManager.isShovelSelected = false;
                this.inputManager.dragGhost.style.display = 'none';
            }
        } else {
            // 若手套正拿着某株植物，先把它放回原格再收起手套
            if (this.gloveSource) {
                this.gloveSource.element.style.display = 'block';
                if (this.gloveSource.fusionOverlay) this.gloveSource.fusionOverlay.style.display = 'block';
            }
            if (this.inputManager) this.inputManager.dragGhost.style.display = 'none';
        }
        this.gloveSource = null;
        this.container.style.cursor = this.isGloveActive
            ? 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\' style=\'font-size:24px\'><text y=\'24\'>🧤</text></svg>"), auto'
            : 'default';
        gloveBtn.style.background = this.isGloveActive ? 'rgba(0, 255, 0, 0.5)' : 'rgba(0,0,0,0.5)';
        if (this.isGloveActive && this.audioManager) this.audioManager.play('btn');
        return this.isGloveActive;
    }

    // v3.30.0：砸罐子手套次数角标（融合模式无次数限制 → 不显示角标）
    _syncVaseGloveHud() {
        const btn = document.getElementById('glove-bank');
        if (!btn) return;
        let badge = document.getElementById('glove-uses-badge');
        if (this.vaseMode && this.vaseGloveUses > 0) {
            btn.title = `融合手套（本关剩余 ${this.vaseGloveUses} 次 · 空格键切换）\n点植物拿起 → 点另一株植物融合 / 点空格把植物搬到那格`;
            if (!badge) {
                badge = document.createElement('span');
                badge.id = 'glove-uses-badge';
                badge.style.cssText = 'position:absolute;top:-7px;right:-7px;background:#c62828;color:#fff;font-size:12px;font-weight:bold;line-height:1;padding:3px 6px;border-radius:9px;border:1px solid #7a1414;pointer-events:none;z-index:10;';
                if (getComputedStyle(btn).position === 'static') btn.style.position = 'relative';
                btn.appendChild(badge);
            }
            badge.style.display = 'block';
            badge.textContent = '×' + this.vaseGloveUses;
        } else if (badge) {
            badge.style.display = 'none';
        }
    }

    // v3.30.0：消耗一次砸罐子手套（仅 vase 模式生效）
    _useVaseGlove() {
        if (!this.vaseMode) return;
        this.vaseGloveUses = Math.max(0, this.vaseGloveUses - 1);
        this._syncVaseGloveHud();
        if (this.vaseGloveUses > 0) this.showAnnouncement(`手套剩余 ${this.vaseGloveUses} 次`, '#ffdd66');
        else this.showAnnouncement('手套次数已用完', '#ff8866');
    }

    tryGloveInteraction(row, col) {
        if (!this.isGloveActive) return false;
        
        const plant = this.board.grid[row][col];
        if (!plant) {
            // v3.30.0 砸罐子手套：拿着植物点空格 = 把植物搬到那格（本关 2 次之一）
            if (this.vaseMode && this.gloveSource) {
                const src = this.gloveSource;
                const vaseThere = this.vases && this.vases.some(v => !v.smashed && v.row === row && v.col === col);
                if (vaseThere || !this.board.canPlant(row, col)) {
                    this.showAnnouncement(vaseThere ? '那个格子上还有罐子，放不下去' : '这个位置放不了植物', '#ffaa00');
                    return true; // 保持拿着，玩家可以换个格子
                }
                // 手工搬家：不动 entities 数组（防重复入列），只改格子和坐标
                this.board.grid[src.row][src.col] = null;
                this.board.grid[row][col] = src;
                src.row = row; src.col = col;
                src.x = this.board.offsetX + col * this.board.cellWidth + this.board.cellWidth / 2;
                src.y = this.board.offsetY + row * this.board.cellHeight + this.board.cellHeight / 2;
                src.element.style.left = src.x + 'px';
                src.element.style.top = src.y + 'px';
                src.element.style.zIndex = Math.floor(src.y);
                src.element.style.display = 'block';
                if (src.fusionOverlay) src.fusionOverlay.style.display = 'block';
                if (this.inputManager) this.inputManager.dragGhost.style.display = 'none';
                this.gloveSource = null;
                this.isGloveDragging = false;
                this.isGloveActive = false;
                document.getElementById('glove-bank').style.background = 'rgba(0,0,0,0.5)';
                this.container.style.cursor = 'default';
                if (this.audioManager) this.audioManager.play('plant');
                this._useVaseGlove();
                return true;
            }
            // Clicked empty space, cancel drag but keep glove active maybe? Or cancel all.
            this.isGloveActive = false;
            this.isGloveDragging = false;
            document.getElementById('glove-bank').style.background = 'rgba(0,0,0,0.5)';
            this.container.style.cursor = 'default';
            if (this.inputManager) this.inputManager.dragGhost.style.display = 'none';
            if (this.gloveSource) {
                this.gloveSource.element.style.display = 'block';
                if (this.gloveSource.fusionOverlay) this.gloveSource.fusionOverlay.style.display = 'block';
            }
            this.gloveSource = null;
            return true;
        }
        
        if (!this.gloveSource) {
            // Pick up the first plant
            this.gloveSource = plant;
            this.isGloveDragging = true;
            plant.element.style.display = 'none';
            if (plant.fusionOverlay) plant.fusionOverlay.style.display = 'none';
            
            // Set drag ghost image to this plant
            if (this.inputManager) {
                this.inputManager.dragGhost.style.display = 'block';
                this.inputManager.dragGhost.style.backgroundImage = `url('${plant.element.src}')`;
                // Manually trigger move to put ghost at cursor immediately
            }
        } else {
            if (this.gloveSource === plant) {
                // Cancel selection
                plant.element.style.display = 'block';
                if (plant.fusionOverlay) plant.fusionOverlay.style.display = 'block';
                this.gloveSource = null;
                this.isGloveDragging = false;
                if (this.inputManager) this.inputManager.dragGhost.style.display = 'none';
                return true;
            }
            
            // ===== v3.24.0 玉米加农炮：两株横向相邻的玉米投手 + 手套里的第三个玉米投手 =====
            if (this.gloveSource.type === 'kernelpult' && plant.type === 'kernelpult') {
                const pair = this._findKernelPair(plant, this.gloveSource);
                if (pair) {
                    const third = this.gloveSource;
                    this.gloveSource.element.style.display = 'block';
                    if (this.gloveSource.fusionOverlay) this.gloveSource.fusionOverlay.style.display = 'block';
                    this._mergeCobCannon(pair.a, pair.b, third);
                    this.isGloveActive = false;
                    this.isGloveDragging = false;
                    document.getElementById('glove-bank').style.background = 'rgba(0,0,0,0.5)';
                    this.container.style.cursor = 'default';
                    if (this.inputManager) this.inputManager.dragGhost.style.display = 'none';
                    this.gloveSource = null;
                    this._useVaseGlove(); // v3.30.0 砸罐子手套：融合成功消耗一次（非 vase 模式空操作）
                    return true;
                }
                this.showAnnouncement('玉米加农炮需要 3 株玉米投手：两株横向相邻，再把第三株融合上去', '#ffaa00');
                this.gloveSource.element.style.display = 'block';
                if (this.gloveSource.fusionOverlay) this.gloveSource.fusionOverlay.style.display = 'block';
                this.gloveSource = null;
                this.isGloveActive = false;
                this.isGloveDragging = false;
                document.getElementById('glove-bank').style.background = 'rgba(0,0,0,0.5)';
                this.container.style.cursor = 'default';
                if (this.inputManager) this.inputManager.dragGhost.style.display = 'none';
                return true;
            }

            // 手套融合（普通）：任何两株植物（含炸弹类）都可直接合成。
            // 注：炸弹种下会自动爆炸并在爆炸时融合周围 3×3，因此炸弹主要靠"种下"触发融合。
            // Try to fuse
            let fusionType = null;
            try { fusionType = this.getFusionResult(this.gloveSource.type, plant.type); } catch(e) { console.error(e); }
            if (fusionType) {
                if (fusionType === 'fusion_pumpkinhead') {
                    // 南瓜壳：PVZ 原版"套壳"玩法——材料植物被消耗，宿主植物保留并套上外壳
                    if (this.applyPumpkinShell(this.gloveSource, plant)) this._useVaseGlove(); // v3.30.0
                } else {
                    this.gloveSource.element.style.display = 'block'; // Reset display before dying to ensure cleanup
                    this.gloveSource.hp = 0; // kill source
                    plant.hp = 0; // kill target

                    this.board.grid[this.gloveSource.row][this.gloveSource.col] = null;
                    this.board.grid[row][col] = null;

                    try {
                        let newPlant = new Plant(this, fusionType);
                        if (this.board.addPlant(newPlant, row, col)) {
                            if (this.audioManager) this.audioManager.play('btn');
                            this.announceFusionOnce(fusionType); // v3.23.0：同配方只提示一次
                        }
                    } catch(e) { console.error(e); }
                    this._useVaseGlove(); // v3.30.0 砸罐子手套：融合成功消耗一次
                }
            } else if (this.gloveSource.type === 'wallnut' || this.gloveSource.type === 'tallnut') {
                // 墙果材料（坚果墙/高坚果）拖到任意植物上 = 给那株植物套上南瓜壳
                // （PVZ 原版：南瓜壳可保护任何常驻植物；材料被消耗、宿主保留）
                if (this.applyPumpkinShell(this.gloveSource, plant)) this._useVaseGlove(); // v3.30.0
            } else {
                this.gloveSource.element.style.display = 'block';
                if (this.gloveSource.fusionOverlay) this.gloveSource.fusionOverlay.style.display = 'block';
                this.showAnnouncement('这两种植物无法融合', '#ff0000');
            }
            
            this.isGloveActive = false;
            this.isGloveDragging = false;
            document.getElementById('glove-bank').style.background = 'rgba(0,0,0,0.5)';
            this.container.style.cursor = 'default';
            if (this.inputManager) this.inputManager.dragGhost.style.display = 'none';
            this.gloveSource = null;
        }
        return true;
    }

    // 南瓜壳套壳（PVZ 原版玩法）：material（坚果墙/高坚果，手套源）作为材料被消耗，
    // host（场上任意常驻植物）保留并套上 +4000 耐久外壳；僵尸须先啃穿外壳才会伤到里面的植物。
    applyPumpkinShell(material, host) {
        const restoreMaterial = () => {
            material.element.style.display = 'block';
            if (material.fusionOverlay) material.fusionOverlay.style.display = 'block';
        };
        // 一次性/爆炸类植物不能套壳（套了也无意义；与 PVZ 原版一致）
        const oneShot = ['cherrybomb', 'jalapeno', 'potatomine', 'squash', 'doomshroom', 'iceshroom', 'crater'];
        if (host.isDead || host.shield || host.shieldEl) {
            restoreMaterial();
            return false;
        }
        if (oneShot.includes(host.type)) {
            restoreMaterial();
            return false;
        }
        restoreMaterial(); // Reset display before dying to ensure cleanup
        material.hp = 0; // 消耗材料植物（坚果墙/高坚果之一）
        this.board.grid[material.row][material.col] = null;
        try {
            if (host.attachShield()) {
                if (this.audioManager) this.audioManager.play('btn');
            }
        } catch(e) { console.error(e); }
        return true;
    }

    // v3.12.0 分层铲除：格子上半部 = 铲掉南瓜壳里的植物（壳以独立壳墙形态留在格内，
    // 耐久=壳当前剩余）；下半部 = 只铲南瓜壳（植物无损）。无壳植物照常整株铲掉。
    shovelPlant(row, col, mouseY) {
        if (row < 0 || row >= this.board.rows || col < 0 || col >= this.board.cols) return;
        const plant = this.board.grid[row][col];
        if (!plant || plant.isDead) return;
        if (plant.shield && plant.shieldEl) {
            const cellTop = this.board.offsetY + row * this.board.cellHeight;
            const upperHalf = (mouseY === undefined) || (mouseY < cellTop + this.board.cellHeight / 2);
            if (upperHalf) {
                // 铲里面的植物：壳留在原地（剩余耐久带走），之后可把新植物种进壳里
                const shellHp = plant.shield.hp;
                plant.shield = null;
                plant.hp = 0;
                this.board.grid[row][col] = null;
                const shell = new Plant(this, 'pumpkinhead');
                shell.hp = Math.max(1, Math.min(4000, Math.round(shellHp)));
                this.board.addPlant(shell, row, col);
            } else {
                plant.removeShield(true); // 只铲壳，植物无损
            }
            if (this.audioManager) this.audioManager.play('plant');
            return;
        }
        this.board.removePlant(row, col);
    }

    // v3.23.0：同一种融合配方只提示一次（第二次合成同样的株不再弹文字）
    announceFusionOnce(fusionType) {
        if (!this._fusionAnnounced) this._fusionAnnounced = new Set();
        if (this._fusionAnnounced.has(fusionType)) return;
        this._fusionAnnounced.add(fusionType);
        this.showAnnouncement(`融合成功：${this.getPlantName(fusionType)}!`, '#ff00ff');
    }

    // v3.23.0：僵尸中文名统一出口（罐子公告/盲盒开箱共用）
    _zombieZhName(type) {
        return { normal: '普通僵尸', conehead: '路障僵尸', buckethead: '铁桶僵尸', flag: '旗手僵尸',
            polevaulting: '撑杆僵尸', newspaper: '读报僵尸', screendoor: '铁门僵尸', football: '橄榄球僵尸',
            zomboni: '冰车僵尸', dancing: '舞王僵尸', pogo: '跳跳僵尸', ladder: '梯子僵尸',
            jackinthebox: '玩偶盒僵尸', imp: '小鬼僵尸', gargantuar: '巨人僵尸', lgboss: '路障巨人',
            peahead: '豌豆头僵尸', nuthead: '坚果头僵尸', sunhead: '向日葵头僵尸', snowpeahead: '寒冰头僵尸',
            jalapenohead: '火爆辣椒僵尸', machinegunhead: '机枪豌豆僵尸', tallnuthead: '高坚果头僵尸',
            mysterybox: '盲盒僵尸', hammerzombie: '锤子僵尸' }[type] || type;
    }

    getPlantName(type) {
        const names = {
            sunflower: '向日葵', peashooter: '豌豆射手', wallnut: '坚果墙', cherrybomb: '樱桃炸弹',
            snowpea: '寒冰射手', repeater: '双发射手', squash: '窝瓜', jalapeno: '火爆辣椒',
            potatomine: '土豆地雷', chomper: '大嘴花', tallnut: '高坚果', puffshroom: '小喷菇',
            fumeshroom: '大喷菇', sunshroom: '阳光菇', scaredyshroom: '胆小菇', iceshroom: '寒冰菇',
            doomshroom: '毁灭菇', spikeweed: '地刺', threepeater: '三线射手', splitpea: '裂荚射手',
            gatlingpea: '机枪射手', twinsunflower: '双子向日葵', torchwood: '火炬树桩', garlic: '大蒜', plantern: '路灯花',
            wintermelon: '冰西瓜', starfruit: '杨桃', hypnoshroom: '魅惑菇', pumpkinhead: '南瓜壳',
            fusion_peaflower: '豌豆向日葵', fusion_nutshooter: '坚果射手', fusion_frostbomb: '寒冰炸弹',
            fusion_sporemine: '孢子地雷', fusion_spikynut: '地刺坚果', fusion_snownut: '寒冰坚果',
            fusion_cherrybomb_peashooter: '樱桃射手', fusion_doomshroom_sunflower: '毁灭向日葵',
            fusion_spikerock_tallnut: '钢地刺高坚果',
            fusion_melon_cattail: '西瓜猫尾草', fusion_wintermelon_cattail: '冰西瓜猫尾草',
            fusion_starfruit: '杨桃', fusion_hypnoshroom: '魅惑菇',
            fusion_pumpkinhead: '南瓜壳', fusion_chomper_wallnut: '大嘴坚果',
            fusion_icecabbage: '寒冰卷心菜', fusion_popcorn: '爆米花投手',
            fusion_cabbagenut: '卷心菜堡垒', fusion_veggiepult: '双料投手',
            cabbagepult: '卷心菜投手', kernelpult: '玉米投手',
            cobcannon: '玉米加农炮', plantbox: '植物盲盒'
        };
        return names[type] || type;
    }

    getFusionResult(plantA, plantB) {
        if (plantA === 'peashooter' && plantB === 'peashooter') return 'repeater';
        if (plantA === 'repeater' && plantB === 'peashooter') return 'threepeater';
        if (plantA === 'peashooter' && plantB === 'repeater') return 'threepeater';
        if (plantA === 'repeater' && plantB === 'repeater') return 'gatlingpea';
        if (plantA === 'sunflower' && plantB === 'sunflower') return 'twinsunflower';
        if (plantA === 'puffshroom' && plantB === 'puffshroom') return 'fumeshroom';
        
        const set = new Set([plantA, plantB]);
        if (set.has('peashooter') && set.has('sunflower')) return 'fusion_peaflower';
        if (set.has('spikeweed') && set.has('wallnut')) return 'fusion_spikynut';
        if (set.has('spikerock') && set.has('tallnut')) return 'fusion_spikerock_tallnut';
        if (set.has('wallnut') && set.has('peashooter')) return 'fusion_nutshooter';
        if (set.has('snowpea') && set.has('cherrybomb')) return 'fusion_frostbomb';
        if (set.has('peashooter') && set.has('cherrybomb')) return 'fusion_cherrybomb_peashooter';
        if (set.has('sunflower') && set.has('doomshroom')) return 'fusion_doomshroom_sunflower';
        if (set.has('puffshroom') && set.has('potatomine')) return 'fusion_sporemine';

        if (set.has('wallnut') && set.has('snowpea')) return 'fusion_snownut';
        if (set.has('peashooter') && set.has('iceshroom')) return 'snowpea';
        if (set.has('peashooter') && set.has('squash')) return 'splitpea';
        if (set.has('melonpult') && set.has('iceshroom')) return 'wintermelon';
        if (set.has('repeater') && set.has('spikeweed')) return 'cattail';
        if (set.has('melonpult') && set.has('cattail')) return 'fusion_melon_cattail';
        if (set.has('wintermelon') && set.has('cattail')) return 'fusion_wintermelon_cattail';
        if (set.has('puffshroom') && set.has('sunflower')) return 'sunshroom';
        if (plantA === 'fumeshroom' && plantB === 'fumeshroom') return 'gloomshroom';
        if (plantA === 'spikeweed' && plantB === 'spikeweed') return 'spikerock';
        if (set.has('puffshroom') && set.has('peashooter')) return 'scaredyshroom';
        if (set.has('wallnut') && set.has('jalapeno')) return 'torchwood';
        // 注意：大嘴花 + 高坚果 不合成西瓜投手（西瓜投手本就直接在选卡栏可选，v3.11.0 起删除此配方）
        
        // ===== v3.10.0 以卷心菜投手 / 玉米投手为基础的新融合 =====
        if (set.has('cabbagepult') && set.has('iceshroom')) return 'fusion_icecabbage'; // 寒冰卷心菜：破甲+减速
        if (set.has('kernelpult') && set.has('jalapeno')) return 'fusion_popcorn';      // 爆米花投手：破甲+3×3溅射
        if (set.has('cabbagepult') && set.has('wallnut')) return 'fusion_cabbagenut';   // 卷心菜堡垒：坚果肉盾+投掷
        if (set.has('cabbagepult') && set.has('kernelpult')) return 'fusion_veggiepult'; // 双料投手：两种弹药交替
        
        // ===== v3.2.38 新增低成本配方 =====
        if (set.has('splitpea') && set.has('sunflower')) return 'fusion_starfruit';   // 杨桃：裂荚射手+向日葵
        if (set.has('puffshroom') && set.has('garlic')) return 'fusion_hypnoshroom'; // 魅惑菇：小喷菇+大蒜
        if (set.has('wallnut') && set.has('tallnut')) return 'fusion_pumpkinhead';    // 南瓜壳：坚果墙+高坚果（手套特殊流程=套壳）
        if (set.has('chomper') && set.has('wallnut')) return 'fusion_chomper_wallnut'; // 大嘴坚果：大嘴花+坚果墙（修复"图鉴有、规则无"）
        return null;
    }

    // ===== v3.24.0 植物盲盒池 =====
    // v3.25.0 改版：①玉米加农炮移出盲盒（开出只占一格，与两格本体冲突）；
    // ②概率分层 —— 越普通权重越高(5)，中坚植物(3)，冰西瓜/猫尾草这类强力植物低频(1)。
    _plantBoxPool() {
        // 基础牌全部都在 seeds（classic）里；融合产物见 fusionOut（不含 cobcannon）
        const classic = this.seeds.map(s => s.type).filter(t => t !== 'plantbox');
        const fusionOut = ['repeater', 'threepeater', 'gatlingpea', 'twinsunflower', 'fumeshroom',
            'snowpea', 'splitpea', 'wintermelon', 'cattail', 'sunshroom', 'gloomshroom',
            'spikerock', 'scaredyshroom', 'torchwood', 'starfruit', 'hypnoshroom', 'pumpkinhead',
            'fusion_peaflower', 'fusion_nutshooter', 'fusion_frostbomb', 'fusion_cherrybomb_peashooter',
            'fusion_doomshroom_sunflower', 'fusion_sporemine', 'fusion_spikynut', 'fusion_snownut',
            'fusion_spikerock_tallnut', 'fusion_melon_cattail', 'fusion_wintermelon_cattail',
            'fusion_icecabbage', 'fusion_popcorn', 'fusion_cabbagenut', 'fusion_veggiepult',
            'fusion_starfruit', 'fusion_hypnoshroom', 'fusion_pumpkinhead', 'fusion_chomper_wallnut'];
        // 权重分层：rare=强力低频(1) / mid=中坚(3) / 其余=普通高频(5)
        const rare = new Set(['gatlingpea', 'wintermelon', 'cattail', 'gloomshroom', 'twinsunflower',
            'doomshroom', 'spikerock',
            'fusion_wintermelon_cattail', 'fusion_melon_cattail', 'fusion_icecabbage',
            'fusion_frostbomb', 'fusion_doomshroom_sunflower', 'fusion_spikerock_tallnut',
            'fusion_veggiepult', 'fusion_chomper_wallnut']);
        const mid = new Set(['repeater', 'threepeater', 'splitpea', 'snowpea', 'torchwood',
            'cabbagepult', 'kernelpult', 'garlic', 'fumeshroom', 'scaredyshroom', 'sunshroom',
            'pumpkinhead', 'hypnoshroom', 'starfruit', 'tallnut', 'iceshroom',
            'fusion_peaflower', 'fusion_nutshooter', 'fusion_cherrybomb_peashooter',
            'fusion_sporemine', 'fusion_spikynut', 'fusion_snownut', 'fusion_popcorn',
            'fusion_cabbagenut', 'fusion_starfruit', 'fusion_hypnoshroom', 'fusion_pumpkinhead']);
        const pool = [...new Set([...classic, ...fusionOut])];
        const weighted = [];
        for (const t of pool) {
            const w = rare.has(t) ? 1 : (mid.has(t) ? 3 : 5);
            for (let i = 0; i < w; i++) weighted.push(t);
        }
        return weighted;
    }

    // ===== v3.24.0 玉米加农炮（PVZ1 原版 Cob Cannon）=====
    // 配方：两个玉米投手横向相邻摆放，手套再拿起任意第三个玉米投手，
    // 放到相邻对的其中一株上 → 三株合体为玉米加农炮，占两格（原相邻对的位置）。
    _findKernelPair(target, exclude) {
        const b = this.board;
        for (const dc of [-1, 1]) {
            const c = target.col + dc;
            if (c < 0 || c >= b.cols) continue;
            const nb = b.grid[target.row] ? b.grid[target.row][c] : null;
            if (nb && nb !== exclude && !nb.isDead && nb.type === 'kernelpult') {
                return (dc === -1) ? { a: nb, b: target } : { a: target, b: nb };
            }
        }
        return null;
    }

    _mergeCobCannon(a, b, third) {
        const bd = this.board;
        const row = a.row;
        const colL = Math.min(a.col, b.col);
        if (colL + 1 >= bd.cols) return;
        // 三株材料全部下场（清掉它们占用的所有格子——cobcannon 之前可能有别的占格状态）
        [a, b, third].forEach(p => {
            p.element.style.display = 'block';
            p.hp = 0;
            for (let r = 0; r < bd.rows; r++) {
                for (let c = 0; c < bd.cols; c++) {
                    if (bd.grid[r][c] === p) bd.grid[r][c] = null;
                }
            }
        });
        const cob = new Plant(this, 'cobcannon');
        cob.row = row;
        cob.col = colL;
        cob._cobCol2 = colL + 1;                       // 占两格：主格 colL + 右格 colL+1
        cob.x = bd.offsetX + colL * bd.cellWidth + bd.cellWidth;   // 两格中点
        cob.y = bd.offsetY + row * bd.cellHeight + bd.cellHeight / 2;
        cob.element.style.top = `${cob.y + cob.yOffset}px`;
        bd.grid[row][colL] = cob;
        bd.grid[row][colL + 1] = cob;
        this.entities.push(cob);
        if (this.audioManager) this.audioManager.play('btn');
        this.announceFusionOnce('cobcannon');
    }

    // 点击充能完毕的玉米加农炮 → 进入瞄准模式（准星跟随鼠标，M 键发射，点击任意处取消）
    enterCobAim(cob) {
        if (this.aimingCob) return;
        this.aimingCob = cob;
        const cross = document.createElement('div');
        cross.style.cssText = [
            'position:absolute', 'width:56px', 'height:56px', 'pointer-events:none',
            'border:3px solid #ff3b30', 'border-radius:50%',
            'transform:translate(-50%,-50%)', 'z-index:9999',
            'box-shadow:0 0 10px rgba(255,0,0,.55), inset 0 0 6px rgba(255,0,0,.35)'
        ].join(';');
        cross.innerHTML = [
            '<div style="position:absolute;left:50%;top:-10px;width:2px;height:14px;background:#ff3b30;transform:translateX(-50%)"></div>',
            '<div style="position:absolute;left:50%;bottom:-10px;width:2px;height:14px;background:#ff3b30;transform:translateX(-50%)"></div>',
            '<div style="position:absolute;top:50%;left:-10px;height:2px;width:14px;background:#ff3b30;transform:translateY(-50%)"></div>',
            '<div style="position:absolute;top:50%;right:-10px;height:2px;width:14px;background:#ff3b30;transform:translateY(-50%)"></div>',
            '<div style="position:absolute;left:50%;top:50%;width:6px;height:6px;background:#ff3b30;border-radius:50%;transform:translate(-50%,-50%)"></div>'
        ].join('');
        this.entityLayer.appendChild(cross);
        this._cobCrosshair = cross;
        this.showAnnouncement('移动鼠标瞄准，按 M 键发射玉米炮！', '#ff7f27');
    }

    exitCobAim() {
        if (this._cobCrosshair && this._cobCrosshair.parentNode) this._cobCrosshair.remove();
        this._cobCrosshair = null;
        this.aimingCob = null;
    }

    fireCobCannon() {
        const cob = this.aimingCob;
        const pos = this._cobAimPos;
        this.exitCobAim();
        if (!cob || cob.isDead || !cob.chargeReady || !pos) return;
        cob.fireCob(pos.x, pos.y);
    }
    
    tryPlanting(type, row, col) {
        if (this.state !== 'PLAYING') return; // v3.11.2：终局面板/回放期间禁止种植
        // 砸罐子模式：植物罐砸出的免费一次性植物卡 —— 无阳光、无冷却，种下即消耗
        if (this.vaseFreeCards && this.vaseFreeCards.length > 0) {
            const fc = this.vaseFreeCards.find(c => !c.consumed && c.type === type);
            if (fc) {
                // 砸罐子：目标格上有未砸的罐子 → 不能种（先砸开再种），卡不消耗
                if (this.vaseMode && this.vases && this.vases.length) {
                    const underVase = this.vases.some(v => !v.smashed && v.row === row && v.col === col);
                    if (underVase) {
                        this.showAnnouncement('这个格子上还有罐子，先砸开它再种吧', '#ffaa00');
                        return;
                    }
                }
                if (this.board.canPlant(row, col)) {
                    const plant = new Plant(this, type);
                    if (this.board.addPlant(plant, row, col)) {
                        fc.consumed = true;
                        if (fc.element && fc.element.parentNode) {
                            fc.element.parentNode.removeChild(fc.element);
                        }
                        this.updateUI();
                        this.audioManager.play('plant');
                        if (type === 'plantern') {
                            // 路灯花种植瞬间照亮周围一圈罐子里的内容
                            this.lightUpNeighbors(row, col);
                        }
                    }
                } else {
                    // v3.12.0：免费的南瓜套也可以直接套在已有植物上
                    const ep = this.board.grid[row] ? this.board.grid[row][col] : null;
                    const oneShotEp = ['cherrybomb', 'jalapeno', 'potatomine', 'squash', 'doomshroom', 'iceshroom', 'crater'];
                    // v3.25.0：空南瓜套（壳墙，如砸罐子砸出的剩余南瓜套）也可以把免费植物种进壳里
                    if (ep && !ep.isDead && ep.type === 'pumpkinhead' && type !== 'pumpkinhead' &&
                        !oneShotEp.includes(type)) {
                        const shellHp = ep.hp;
                        ep.hp = 0;
                        this.board.grid[row][col] = null;
                        const plant = new Plant(this, type);
                        if (this.board.addPlant(plant, row, col)) {
                            plant.shield = { hp: Math.max(1, Math.min(4000, Math.round(shellHp))), maxHp: 4000 };
                            plant._spawnShieldEl();
                            fc.consumed = true;
                            if (fc.element && fc.element.parentNode) fc.element.parentNode.removeChild(fc.element);
                            this.updateUI();
                            this.audioManager.play('plant');
                            if (type === 'plantern') this.lightUpNeighbors(row, col);
                        } else {
                            this.board.grid[row][col] = ep; // 回滚
                            ep.hp = shellHp;
                        }
                    } else if (ep && !ep.isDead && type === 'pumpkinhead' && ep.type !== 'pumpkinhead' &&
                        !ep.shield && !ep.shieldEl &&
                        !oneShotEp.includes(ep.type)) {
                        if (ep.attachShield()) {
                            fc.consumed = true;
                            if (fc.element && fc.element.parentNode) fc.element.parentNode.removeChild(fc.element);
                            this.audioManager.play('plant');
                        }
                    }
                }
                return; // 无论成功与否都走免费卡逻辑（失败不消耗卡）
            }
        }

        if (this.cooldowns[type] > 0) return; // Still cooling down
        
        const seed = this.seeds.find(s => s.type === type);
        if (!seed) return;
        if (this.sunCount < seed.cost) return;

        let existingPlant = this.board.grid[row][col];
        
        // Wallnut First Aid
        if (existingPlant) {
            if ((type === 'wallnut' && existingPlant.hasTrait('wallnut')) ||
                (type === 'tallnut' && existingPlant.hasTrait('tallnut'))) {
                if (existingPlant.hp < existingPlant.maxHp) {
                    existingPlant.hp = existingPlant.maxHp;
                    // Reset appearance if they have visual damage states (cracked nut)
                    if (existingPlant.updateAppearance) {
                        existingPlant.updateAppearance();
                    }
                    // Reset visual filter if applicable (ice blue)
                    // But actually wait, updateAppearance will handle basic images.
                    // Let's just deduct sun and return.
                    this.sunCount -= seed.cost;
                    this.sunCountElement.innerText = this.sunCount;
                    this.cooldowns[type] = seed.cooldown;
                    this.updateUI();
                    this.audioManager.play('plant');
                    return;
                }
            }
        }
        
        // ===== v3.24.0 植物盲盒（500 阳光）=====
        // 种下的不是植物本身：扣 500 阳光后从"经典冒险 + 融合进化"全植物池随机开出一株种下。
        if (type === 'plantbox') {
            if (this.board.canPlant(row, col)) {
                const pool = this._plantBoxPool();
                const got = pool[Math.floor(Math.random() * pool.length)];
                let plant = new Plant(this, got);
                if (this.board.addPlant(plant, row, col)) {
                    this.sunCount -= seed.cost;
                    this.sunCountElement.innerText = this.sunCount;
                    this.cooldowns[type] = seed.cooldown;
                    this.updateUI();
                    this.audioManager.play('plant');
                    // v3.26.0：礼盒开箱演出——礼盒短暂盖在格上，600ms 后裂开成残骸露出植物
                    const cx = this.board.offsetX + col * this.board.cellWidth + this.board.cellWidth / 2;
                    const cy = this.board.offsetY + row * this.board.cellHeight + this.board.cellHeight / 2;
                    const box = document.createElement('img');
                    box.src = `assets/images/Plants/PlantBox/GiftBox.png?v=${this.assetStamp()}`;
                    box.style.cssText = 'position:absolute;width:56px;height:78px;object-fit:contain;pointer-events:none;' +
                        'left:' + cx + 'px;top:' + cy + 'px;transform:translate(-50%,-50%);' +
                        'z-index:' + (Math.floor(cy) + 2) + ';';
                    this.entityLayer.appendChild(box);
                    if (this.audioManager.playFx) this.audioManager.playFx('box_open');
                    setTimeout(() => {
                        box.remove();
                        this._giftShatterFX(cx, cy);
                        this.showAnnouncement(`🎁 植物盲盒开出：${this.getPlantName(got)}！`, '#c8a2ff');
                    }, 600);
                }
            }
            return;
        }

        // ===== 南瓜壳（PVZ 原版玩法）=====
        // v3.12.0 双向套装：南瓜壳可套在已有植物上，也可空地独立成株（壳墙），
        // 之后把任意植物种进壳格 = 植物进壳（壳剩余耐久转为护甲）。
        if (type === 'pumpkinhead') {
            if (!existingPlant || existingPlant.isDead) {
                // 空地：独立壳墙（三阶段裂纹），等待植物入住
                if (this.board.canPlant(row, col)) {
                    let shell = new Plant(this, 'pumpkinhead');
                    if (this.board.addPlant(shell, row, col)) {
                        this.sunCount -= seed.cost;
                        this.sunCountElement.innerText = this.sunCount;
                        this.cooldowns[type] = seed.cooldown;
                        this.updateUI();
                        this.audioManager.play('plant');
                    }
                }
                return;
            }
            if (existingPlant.type === 'pumpkinhead') {
                return;
            }
            if (existingPlant.shield || existingPlant.shieldEl) {
                return;
            }
            const oneShot = ['cherrybomb', 'jalapeno', 'potatomine', 'squash', 'doomshroom', 'iceshroom', 'crater'];
            if (oneShot.includes(existingPlant.type)) {
                return;
            }
            if (existingPlant.attachShield()) {
                this.sunCount -= seed.cost;
                this.sunCountElement.innerText = this.sunCount;
                this.cooldowns[type] = seed.cooldown;
                this.updateUI();
                this.audioManager.play('plant');
            }
            return;
        }

        // ===== v3.12.0：植物放进空南瓜壳（双向套装）=====
        // 壳的剩余耐久转移为新宿主的护甲；宿主占据壳的格位。
        if (existingPlant && !existingPlant.isDead && existingPlant.type === 'pumpkinhead') {
            const shellHp = existingPlant.hp;
            existingPlant.hp = 0;
            this.board.grid[row][col] = null;
            let plant = new Plant(this, type);
            if (this.board.addPlant(plant, row, col)) {
                plant.shield = { hp: Math.max(1, shellHp), maxHp: 4000 };
                plant._spawnShieldEl();
                this.sunCount -= seed.cost;
                this.sunCountElement.innerText = this.sunCount;
                this.cooldowns[type] = seed.cooldown;
                this.updateUI();
                this.audioManager.play('plant');
            }
            return;
        }

        // ===== v3.12.0：炸弹放到已有植物上 → 不移位，原地附着 =====
        // 引爆时以宿主位置为中心，产生与一次性植物完全相同的爆炸效果（宿主保留）。
        // 融合进化模式：若炸弹与宿主有配方，引爆瞬间按配方原地融合。
        const isBomb = ['cherrybomb', 'doomshroom', 'iceshroom', 'jalapeno'].includes(type);
        if (existingPlant && !existingPlant.isDead && isBomb) {
            if (this.fusionMode) {
                const fusionType = this.getFusionResult(type, existingPlant.type);
                if (!fusionType) {
                    this.showAnnouncement('该植物没有与这颗炸弹的融合配方，可种在它旁边的空格上', '#ff0000');
                    return; // 不消耗阳光
                }
            }
            this.sunCount -= seed.cost;
            this.sunCountElement.innerText = this.sunCount;
            this.cooldowns[type] = seed.cooldown;
            this.updateUI();
            const bomb = new Plant(this, type);
            bomb.row = existingPlant.row;
            bomb.col = existingPlant.col;
            bomb.x = existingPlant.x;
            bomb.y = existingPlant.y;
            bomb.yOffset = existingPlant.yOffset || 0;
            bomb._bombHost = existingPlant; // 附着标记（炸点=宿主位置）
            this.entities.push(bomb);
            bomb.update(0);
            this.audioManager.play('plant');
            this.showAnnouncement(`炸弹已附着在${this.getPlantName(existingPlant.type)}身上，即将原地引爆`, '#ffaa00');
            return;
        }

        if (this.board.canPlant(row, col)) {
            let plant = new Plant(this, type);
            if (this.board.addPlant(plant, row, col)) {
                this.sunCount -= seed.cost;
                this.sunCountElement.innerText = this.sunCount;
                this.cooldowns[type] = seed.cooldown; // Start cooldown
                this.updateUI();
                this.audioManager.play('plant');
                if (isBomb && this.fusionMode) {
                    this.showAnnouncement('炸弹已就位：即将自动引爆，并融合周围 3×3 内可融合的植物', '#ffaa00');
                }
            }
        }
    }
    
    updateUI() {
        const cards = document.querySelectorAll('#seed-bank .seed-card');
        cards.forEach(card => {
            const type = card.dataset.type;
            const cost = parseInt(card.dataset.cost);
            const totalCooldown = parseFloat(card.dataset.cooldown);
            const currentCooldown = this.cooldowns[type];
            
            const overlay = card.querySelector('.cooldown-overlay');
            
            // Check if on cooldown
            if (currentCooldown > 0) {
                card.classList.add('disabled');
                const percent = (currentCooldown / totalCooldown) * 100;
                overlay.style.height = `${percent}%`;
            } else {
                overlay.style.height = '0%';
                if (this.sunCount >= cost) {
                    card.classList.remove('disabled');
                } else {
                    card.classList.add('disabled'); // Not enough sun
                }
            }
        });
    }
    
    gameOver() {
        if (this.state === 'GAMEOVER') return;
        this.state = 'GAMEOVER';
        this.audioManager.stop('bgm');
        this.audioManager.play('lose');
        // v3.11.1：失败画面与砸罐子胜利 / 我是僵尸胜负统一为同一套 vase-win 面板
        // （此前是 ZombiesWon.png 大图 + 两个原生浏览器按钮，与其它三个结束画面割裂）
        this._showGameOverPanel();
    }

    // 统一失败面板：经典冒险 / 融合进化 / 砸罐子（我是僵尸走 zombieLose，已是同款）
    _showGameOverPanel() {
        this._removeGameOverEls();
        const modeName = this.fusionMode ? '融合进化' : '经典冒险';
        // 砸罐子失败保留难度角标；经典/融合没有难度，用模式名占同一位置
        const chip = this.vaseMode ? `难度 · ${this._vaseDiffCfg().label}` : `模式 · ${modeName}`;
        const overlay = document.createElement('div');
        overlay.className = 'vase-win-overlay';
        overlay.innerHTML = `
            <div class="vase-win-panel">
                <div class="vase-win-lv" style="color:#a04030;">THE ZOMBIES ATE YOUR BRAINS!</div>
                <div class="vase-win-title" style="color:#7a2a18;">僵尸吃掉了你的脑子！</div>
                <div class="vase-win-sub">植物防线被突破了<span class="vase-win-diff">${chip}</span></div>
                <div class="vase-win-score">Final Score：<b>${this.score}</b></div>
                <div class="vase-win-btns">
                    <button id="go-retry" class="vase-win-btn again">再玩一局</button>
                    <button id="go-exit" class="vase-win-btn exit">退出</button>
                </div>
            </div>`;
        this.container.appendChild(overlay);
        overlay.querySelector('#go-retry').onclick = () => {
            this.audioManager.play('btn');
            if (this.vaseMode) this.restartVaseLevel(); // 砸罐子：原地清场重摆罐子
            else this.retryClassicLevel();              // 经典/融合：清场回选卡界面
        };
        overlay.querySelector('#go-exit').onclick = () => location.reload(); // 回主菜单（干净重载）
        this._gameOverEls = [overlay];
    }

    _removeGameOverEls() {
        if (this._gameOverEls) {
            this._gameOverEls.forEach(el => { if (el.parentNode) el.parentNode.removeChild(el); });
            this._gameOverEls = null;
        }
    }

    // v3.18.0 硬清场：entityLayer 里除署名外全部移除 —— 无论哪条路径泄漏的孤儿 DOM
    // （手套正拿的植物/融合失败的 new Plant/死亡过滤器漏删的叠加件），再玩一局后草坪必须干净
    _hardSweepEntityLayer() {
        [...this.entityLayer.children].forEach(el => {
            if (el === this._sigEl) return; // 署名保留
            if (el.parentNode) el.parentNode.removeChild(el);
        });
        if (this.inputManager) {
            this.inputManager.selectedSeed = null;
            this.inputManager.isShovelSelected = false;
            this.inputManager.dragGhost.style.display = 'none';
        }
        this.gloveSource = null;
        this.isGloveDragging = false;
    }

    // v3.11.2 统一实体 DOM 清理：主元素 + 融合叠加件。
    // fusionOverlay 是挂在 entityLayer 上的独立 <img>（Plant.js 构造末尾 appendChild），
    // 重开只删 e.element 会把融合部件留在场上 —— "半株植物"残影，重开残留类 bug 的同族坑。
    _removeEntityDom(e) {
        if (e.element && e.element.parentNode) e.element.parentNode.removeChild(e.element);
        if (e.fusionOverlay && e.fusionOverlay.parentNode) e.fusionOverlay.parentNode.removeChild(e.fusionOverlay);
        // v3.16.0：南瓜壳的两层叠加件（前壁/背壁）是独立 DOM —— 不清会残留成
        // "再玩一局后场上还挂着没用的壳"（用户实测 bug）
        if (e.shieldEl && e.shieldEl.parentNode) e.shieldEl.parentNode.removeChild(e.shieldEl);
        if (e.shieldBackEl && e.shieldBackEl.parentNode) e.shieldBackEl.parentNode.removeChild(e.shieldBackEl);
    }

    // 经典/融合「再玩一局」：清场 + 重置阳光/分数/刷怪节奏 → 回到选卡界面重新选植物
    retryClassicLevel() {
        this._removeGameOverEls();
        this.entities.forEach(e => this._removeEntityDom(e));
        this.entities = [];
        this._hardSweepEntityLayer(); // v3.18.0：硬清场，孤儿 DOM 一律带走
        for (let r = 0; r < this.board.rows; r++) {
            for (let c = 0; c < this.board.cols; c++) this.board.grid[r][c] = null;
        }
        this.score = 0;
        this.updateScore();
        this.sunCount = 50;
        this.sunCountElement.innerText = String(this.sunCount);
        this.waveManager.reset();
        this.showSeedChooser();
    }
    
    loop(timestamp) {
        // Delta time in seconds
        const deltaTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        
        // Cap deltaTime to prevent huge jumps if tab was inactive
        const dt = Math.min(deltaTime, 0.1); 
        
        if (this.state === 'PLAYING') {
            for (let i = 0; i < this.gameSpeed; i++) {
                this.update(dt);
            }
            requestAnimationFrame((t) => this.loop(t));
        }
    }
    
    update(deltaTime) {
        this.waveManager.update(deltaTime);
        this.collisionManager.update();
        
        // 时间制随机事件（融合进化模式关闭）
        if (!this.fusionMode && this.eventTimer > 0) {
            this.eventTimer -= deltaTime;
            if (this.eventTimer <= 0) {
                this.eventTimer = 120 + Math.random() * 60; // 2 to 3 minutes
                this.triggerRandomEvent();
            }
        }
        
        // Update cooldowns
        let uiNeedsUpdate = false;
        for (let type in this.cooldowns) {
            if (this.cooldowns[type] > 0) {
                this.cooldowns[type] -= deltaTime;
                if (this.cooldowns[type] < 0) this.cooldowns[type] = 0;
                uiNeedsUpdate = true;
            }
        }
        if (uiNeedsUpdate) this.updateUI();
        
        // Sky sun generation（砸罐子/我是僵尸模式关闭天降阳光：我是僵尸的阳光只来自初始给发 + 啃向日葵）
        if (!this.vaseMode && !this.zombieMode) {
            this.skySunTimer += deltaTime;
            if (this.skySunTimer >= this.skySunInterval) {
                this.skySunTimer = 0;
                const randomX = this.board.offsetX + Math.random() * (this.board.cols * this.board.cellWidth);
                this.entities.push(new Sun(this, randomX, -50));
            }
        }
        
        // Update all entities
        for (let i = 0; i < this.entities.length; i++) {
            this.entities[i].update(deltaTime);
        }
        
        // Clean up dead entities (remove from DOM and array)
        this.entities = this.entities.filter(e => {
            if (e.isDead) {
                // v3.18.0：改走统一清理 —— 旧写法只删主元素，南瓜壳两层/融合叠加件/
                // 梯子等独立 DOM 会残留成"看不见的僵尸壳"（重开残留 bug 的同族根源）
                this._removeEntityDom(e);
                if (e.ladderOverlay && e.ladderOverlay.parentNode) e.ladderOverlay.parentNode.removeChild(e.ladderOverlay);
                if (e.cavityEl && e.cavityEl.parentNode) e.cavityEl.parentNode.removeChild(e.cavityEl);
                return false;
            }
            return true;
        });
        
        // Z-Sorting using element zIndex
        this.entities.forEach(e => {
            if (e.element) {
                let z = Math.floor(e.y);
                // v3.14.0：冰车/巨人/Boss 等大型僵尸画在同行植物之上（车身应遮挡被碾的植物）
                if (e instanceof Zombie && (e.type === 'zomboni' || e.type === 'gargantuar' || e.type === 'lgboss')) z += 3;
                if (e instanceof Projectile) z += 1000; // Projectiles always on top of row
                if (e instanceof Sun) z += 2000; // Suns always on top of EVERYTHING
                e.element.style.zIndex = z;
                // v3.27.0：融合叠加层（如地刺坚果的"坚果身+地刺"）跟着本体一起排层级，
                // 且永远压在主体之上 —— 旧写法 zIndex 恒为 1，叠加件被本体和所有实体压在底下
                if (e.fusionOverlay) e.fusionOverlay.style.zIndex = z + 1;
            }
        });

        // 砸罐子：每帧检查胜利条件（罐子全砸完 + 场上僵尸消失）——
        // 这样即使最后一波僵尸是被植物打死而非砸罐砸出来的，胜利画面也会出现
        if (this.vaseMode) this.checkVaseVictory();
        // 我是僵尸：每帧胜负检测（僵尸全灭且阳光不足 → 判负；吃脑胜利在 Zombie.js 触发）
        if (this.zombieMode) this._checkZombieEnd(deltaTime);
    }

    showAnnouncement(text, color) {
        if (!this.announcementUI) {
            this.announcementUI = document.createElement('div');
            this.announcementUI.style.position = 'absolute';
            this.announcementUI.style.bottom = '10%';
            this.announcementUI.style.left = '50%';
            this.announcementUI.style.transform = 'translate(-50%, 0)';
            this.announcementUI.style.fontSize = '24px';
            this.announcementUI.style.fontWeight = 'bold';
            this.announcementUI.style.textShadow = '4px 4px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000';
            this.announcementUI.style.zIndex = '5000';
            this.announcementUI.style.pointerEvents = 'none';
            this.announcementUI.style.opacity = '0';
            this.announcementUI.style.transition = 'opacity 0.5s';
            this.container.appendChild(this.announcementUI);
        }
        this.announcementUI.innerText = text;
        this.announcementUI.style.color = color || 'white';
        this.announcementUI.style.opacity = '1';
        
        if (this.announcementTimeout) clearTimeout(this.announcementTimeout);
        this.announcementTimeout = setTimeout(() => {
            this.announcementUI.style.opacity = '0';
        }, 4000);
    }

    triggerRandomEvent() {
        if (this.fusionMode || this.vaseMode || this.zombieMode) return; // 融合进化 / 砸罐子 / 我是僵尸模式 不触发全局随机事件
        if (!this.eventManager) this.eventManager = new EventManager(this);
        this.eventManager.trigger();
    }

    // ===== 砸罐子模式（Vasebreaker）v3.5.0 难度分级：简单 / 困难 / 地狱 =====
    // 全部难度参数见 _vaseDiffCfg():
    //   罐子总数范围、类型抽签桶(plant/question/zombie 权重)、问号罐内部出僵尸概率、
    //   植物罐内部出植物卡概率、僵尸池强度、僵尸血量倍率(hpMul)。
    // 所有罐子的具体内容(植物种/僵尸种/阳光)都在本阶段预掷生成(v.content),
    //   smash 时直接读取, 这样路灯花揭示出来的就是真正会砸出来的东西。
    setupVases() {
        const cfg = this._vaseDiffCfg();
        const candidates = [];
        for (let r = 1; r < this.board.rows; r++) {
            for (let c = 1; c < this.board.cols; c++) candidates.push([r, c]);
        }
        const total = cfg.totalMin + Math.floor(Math.random() * (cfg.totalMax - cfg.totalMin + 1));
        for (let i = candidates.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
        }
        const chosen = candidates.slice(0, total);

        // v3.15.0 金色罐子（仅地狱）：每局 1 个必出、50% 追加第 2 个（上限 2）。
        // 随机挑选已选罐位升级为金罐 —— 内容改为 50% 融合高阶植物 / 50% 强力僵尸。
        let goldenSlots = new Set();
        if (cfg.key === 'hell' && total >= 1) {
            const goldCount = Math.min(total, 1 + (Math.random() < 0.5 ? 1 : 0));
            // v3.23.0：金罐只落在中间排（col 3~5）——问号罐靠前、僵尸罐靠后、金罐居中
            const idxs = chosen.map((_, i) => i).filter(i => chosen[i][1] >= 3 && chosen[i][1] <= 5);
            for (let i = idxs.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [idxs[i], idxs[j]] = [idxs[j], idxs[i]];
            }
            goldenSlots = new Set(idxs.slice(0, goldCount));
        }

        // 类型分布: 先保证 plant/question/zombie 各至少 1 个, 其余按难度抽签桶加权抽取
        const types = ['plant', 'question', 'zombie'];
        const drawBag = cfg.bag;
        while (types.length < total) {
            types.push(drawBag[Math.floor(Math.random() * drawBag.length)]);
        }
        for (let i = types.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [types[i], types[j]] = [types[j], types[i]];
        }

        // v3.23.0：布局重排 —— 僵尸罐钉到后排（col≥5，远离房子），问号罐尽量放前排
        //（col 升序取最靠前的格子），金罐已占中间；植物罐填剩余格
        {
            const zCount = types.filter(t => t === 'zombie').length;
            const qCount = types.filter(t => t === 'question').length;
            const used = new Set(goldenSlots);
            const backIdx = chosen.map((_, i) => i).filter(i => !used.has(i) && chosen[i][1] >= 5);
            for (let i = backIdx.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [backIdx[i], backIdx[j]] = [backIdx[j], backIdx[i]];
            }
            const zIdxs = backIdx.slice(0, zCount);
            zIdxs.forEach(i => used.add(i));
            if (zIdxs.length < zCount) {
                // 后排不够 → 从剩余格按列降序补足
                const fill = chosen.map((_, i) => i).filter(i => !used.has(i))
                    .sort((a, b) => chosen[b][1] - chosen[a][1]);
                fill.slice(0, zCount - zIdxs.length).forEach(i => { zIdxs.push(i); used.add(i); });
            }
            // 问号罐：剩余格按列升序，取最前面的 qCount 个（"大部分问号罐留到前面"）
            const restQ = chosen.map((_, i) => i).filter(i => !used.has(i))
                .sort((a, b) => chosen[a][1] - chosen[b][1] || chosen[a][0] - chosen[b][0]);
            const qIdxs = restQ.slice(0, qCount);
            qIdxs.forEach(i => used.add(i));
            const pIdxs = chosen.map((_, i) => i).filter(i => !used.has(i));
            const newTypes = new Array(types.length).fill('plant');
            zIdxs.forEach(i => { newTypes[i] = 'zombie'; });
            qIdxs.forEach(i => { newTypes[i] = 'question'; });
            pIdxs.forEach(i => { newTypes[i] = 'plant'; });
            types.length = 0;
            types.push(...newTypes);
        }

        this.vases = [];
        this._vaseEliteCount = 0; // v3.30.0 冰车/舞王/橄榄球每局 ≤3 只（金罐也计入）
        this.vasesTotal = total;
        this.vasesSmashed = 0;
        this.score = 0;
        this.updateScore();

        chosen.forEach((pos, i) => {
            const vType = types[i];
            const isGolden = goldenSlots.has(i); // v3.15.0 金罐
            // 预掷罐内内容（概率全部取自当前难度配置）:
            //   植物罐: pCard 概率出植物卡 / 其余出阳光罐(50 阳光, 供买路灯花)
            //   问号罐: qZombie 概率出僵尸 / 其余出植物卡
            //   僵尸罐: 必出僵尸
            //   任何罐子都不再出 plantern —— 路灯花只能从商店购买
            let content = (vType === 'zombie') // v3.15.0 let：金罐内容需覆盖赋值
                ? { kind: 'zombie', type: this._rollVaseZombieType(pos[1]) }
                : (vType === 'plant')
                    ? (Math.random() < cfg.pCard)
                        ? { kind: 'plant', type: this._rollVasePlantContent(vType) }
                        : { kind: 'sun', value: 50 }
                    : (Math.random() < cfg.qZombie)
                        ? { kind: 'zombie', type: this._rollVaseZombieType(pos[1], true) } // v3.23.0 问号罐禁高级三杰
                        : { kind: 'plant', type: this._rollVasePlantContent(vType) };
            // 金罐覆盖内容（v3.15.0）：与普通抽签完全无关
            if (isGolden) content = this._rollGoldenVaseContent();

            const v = { row: pos[0], col: pos[1], type: vType, golden: isGolden, content, smashed: false, revealed: false, element: null, contentEl: null };
            const sprite = isGolden ? 'Vase_Gold.png'
                          : vType === 'plant' ? 'Vase_Plant.png'
                          : vType === 'zombie' ? 'Vase_Zombie.png'
                          : 'Vase_Question.png';
            const img = document.createElement('img');
            img.src = 'assets/images/Vase/' + sprite + '?v=1790416816'; // v= 占位,bump_version 替换为新 cache-buster
            img.className = 'entity vase-entity';
            img.style.pointerEvents = 'none';
            if (isGolden) img.style.filter = 'drop-shadow(0 0 7px rgba(255, 210, 60, 0.95))'; // 金罐常驻金光
            const cx = this.board.offsetX + v.col * this.board.cellWidth + this.board.cellWidth / 2;
            const cy = this.board.offsetY + v.row * this.board.cellHeight + this.board.cellHeight / 2 + 12;
            img.style.left = cx + 'px';
            img.style.top = cy + 'px';
            img.style.zIndex = Math.floor(cy) - 1;
            this.entityLayer.appendChild(img);
            v.element = img;
            this.vases.push(v);
        });

        // v3.5.1 问号罐保底(先执行): 本局问号罐 ≥2 个时强制至少 1 个出植物 ——
        // 玩家绝不会遇到「场上所有问号罐全是僵尸」的绝望局面
        {
            const qVases = this.vases.filter(v => v.type === 'question' && !v.golden); // v3.15.0 金罐内容不受保底改写
            if (qVases.length >= 2 && qVases.every(v => v.content && v.content.kind === 'zombie')) {
                qVases[0].content = { kind: 'plant', type: this._rollVasePlantContent('question') };
            }
        }

        // v3.5.1 每局保底(最后执行, 覆盖问号罐保底新塞入的植物): 无论随机如何,
        // 本局所有植物内容中「一次性炸弹」占比强制 ≤ 40% (永久植物 ≥ 60%)。
        // 分层抽取只能保证长期期望, 保底杜绝单局极端 ——
        // 玩家不会遇到"整局砸出来的全是樱桃炸弹/窝瓜, 没火力防不住"的情况。
        {
            const plantContents = this.vases.filter(v => v.content && v.content.kind === 'plant' && !v.golden); // v3.15.0 金罐不参与一次性置换
            if (plantContents.length > 0) {
                const needPerm = Math.ceil(plantContents.length * 0.6);
                let perm = 0;
                for (const v of plantContents) if (!this._isVaseOncePlant(v.content.type)) perm++;
                for (const v of plantContents) {
                    if (perm >= needPerm) break;
                    if (this._isVaseOncePlant(v.content.type)) {
                        v.content.type = this._pickVasePermPlant(); // 换成随机永久植物
                        perm++;
                    }
                }
            }
        }

        // v3.12.0：南瓜套罐 —— 部分植物/问号罐被南瓜壳裹住（难度越高越常见，每局最多 3 个）。
        // 僵尸走到罐格必须先啃穿壳（相当于一个不占种植格的坚果），玩家仍可照常点砸。
        // v3.13.1：罐子和植物一样"被放进"南瓜套里 —— 壳用与植物套壳同款 97×67，
        // 底部锚在罐子底缘，罐子上半截从壳顶洞口探出（罐画布 90×100，内容底缘=中心+45px）。
        // 被套的罐子外观一致 —— 套壳不代表里面一定是僵尸（问号罐照样可能套出僵尸）。
        {
            // v3.16.0：南瓜套改固定名额 —— 困难 1~2 个、地狱 1~3 个、简单 0。
            // 旧版按 20%/罐 概率在 26 罐的地狱里期望 5 个，玩家反馈太多。
            const wrapRange = { easy: [0, 0], hard: [1, 2], hell: [1, 3] }[cfg.key] ?? [0, 0];
            const wrapTarget = wrapRange[0] + Math.floor(Math.random() * (wrapRange[1] - wrapRange[0] + 1));
            const wrapCands = this.vases.filter(v => !v.golden);
            for (let i = wrapCands.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [wrapCands[i], wrapCands[j]] = [wrapCands[j], wrapCands[i]];
            }
            let wrapped = 0;
            for (const v of wrapCands) {
                // v3.13.3：僵尸罐同样可能被套 —— 套壳外观与罐内容无关，
                // 砸开套壳罐弹出的僵尸会被留场的壳墙挡在壳里（壳的"实际作用"）
                // v3.15.0：金罐不套壳 —— 金光外观是玩家的关键信息，不能被南瓜套盖住
                if (wrapped >= wrapTarget) break;
                    v.pumpkinHp = 4000;
                    v.pumpkinMaxHp = 4000;
                    const ov = document.createElement('img');
                    ov.src = 'assets/images/Plants/PumpkinHead/shield_full.png?v=1790416816'; // v= 占位,bump_version 替换
                    ov.className = 'entity vase-pumpkin';
                    ov.style.pointerEvents = 'none';
                    ov.style.width = '97px';
                    ov.style.height = '67px';
                    ov.style.objectFit = 'contain';
                    const cx = this.board.offsetX + v.col * this.board.cellWidth + this.board.cellWidth / 2;
                    const cy = this.board.offsetY + v.row * this.board.cellHeight + this.board.cellHeight / 2 + 12;
                    // 罐内容底缘 = cy+45；壳底=罐底-2，壳中心 = 底缘-67/2
                    ov.style.left = cx + 'px';
                    ov.style.top = (cy + 9.5) + 'px';
                    ov.style.transform = 'translate(-50%, -50%)';
                    ov.style.zIndex = String(Math.floor(cy + 9.5) + 1); // 压在罐子(z=floor(cy)-1)之上
                    this.entityLayer.appendChild(ov);
                    v.pumpkinEl = ov;
                    // v3.13.2：背壁层画在罐子身后，壳顶洞口里看到的是南瓜内壁而非草地
                    const back = document.createElement('img');
                    back.src = 'assets/images/Plants/PumpkinHead/Pumpkin_back.gif?v=1790416816'; // v= 占位,bump_version 替换
                    back.className = 'entity vase-pumpkin-back';
                    back.style.pointerEvents = 'none';
                    back.style.width = '97px';
                    back.style.height = '67px';
                    back.style.objectFit = 'contain';
                    back.style.left = cx + 'px';
                    back.style.top = (cy + 9.5) + 'px';
                    back.style.transform = 'translate(-50%, -50%)';
                    back.style.zIndex = String(Math.floor(cy) - 2); // 罐子身后
                    this.entityLayer.appendChild(back);
                    v.pumpkinBackEl = back;
                    wrapped++;
            }
        }

        const warn = cfg.key === 'hell'
            ? '僵尸血厚 +35% · 场上暗藏金罐（金光闪烁）：内藏融合高阶植物或强力僵尸，祝你好运！'
            : (cfg.key === 'easy' ? '绿罐很多，放心砸～' : '路灯花=75阳光，在种子栏首位购买');
        this.showAnnouncement(`【${cfg.label}】砸罐子：场上有 ${total} 个罐子（绿罐=植物/阳光，紫罐=僵尸，问号罐=？）。${warn}`, '#ffdd66');
    }

    // ===== 砸罐子植物卡池 v3.5.1: 严格分层控制「永久 / 一次性」比例 =====
    // 玩家反馈: 以前植物池把一次性炸弹和永久植物混在一个池子平权抽取,
    //   连续抽到樱桃炸弹/土豆雷/窝瓜就"整局全是炸弹、没有火力、根本防不住"。
    // 现在改为「先按难度掷类目, 再在类目内加权抽取」:
    //   永久池(可持续作战): 豌豆射手家族/坚果/向日葵/大嘴花/地刺等 —— 占大头
    //   一次性池(炸弹类):   樱桃炸弹/土豆地雷/窝瓜/火爆辣椒/寒冰菇 —— 只做稀有惊喜/解围
    // 植物罐(绿)与问号罐砸出的植物都受控; 任何罐子都不出 plantern(只能商店买)。
    _vasePermPool() {
        // 永久植物加权: 前期实用射手与坚果权重最高, 高阶(西瓜/猫尾草/机枪)低权重作惊喜
        return [
            'peashooter','peashooter','peashooter','peashooter', // 豌豆射手: 最可靠的基础火力
            'snowpea','snowpea','snowpea',                       // 寒冰射手: 减速控场
            'repeater','repeater','repeater',                     // 双发: 中期火力
            'wallnut','wallnut','wallnut',                        // 坚果墙: 顶线必备
            'sunflower','sunflower',                              // 向日葵
            'tallnut','tallnut',                                  // 高坚果
            'spikeweed','spikeweed',                              // 地刺: 免费防近战
            'chomper',                                            // 大嘴花
            'threepeater',                                        // 三线
            'splitpea',                                           // 裂荚
            // v3.16.0：机枪/西瓜/冰西瓜/猫尾草 移入 25% 高级专池（_vaseHighPool）
            'cabbagepult',                                        // 卷心菜投手(v3.10.0 新增：破甲)
            'kernelpult',                                         // 玉米投手(v3.10.0 新增：破甲+黄油定身)
            'garlic',                                             // 大蒜(v3.14.0)
            'fumeshroom',                                         // 大喷菇(v3.14.0：穿门)
            'starfruit',                                          // 杨桃(v3.14.0)
            // v3.16.0：钢地刺/忧郁菇 移入 25% 高级专池（_vaseHighPool）
            'pumpkinhead',                                        // 南瓜套(v3.14.0)
            'puffshroom','scaredyshroom','sunshroom',             // 蘑菇三兄弟(v3.14.0)
            'hypnoshroom'                                         // 魅惑菇(v3.14.0)
        ];
    }
    _vaseOncePool() {
        // 一次性炸弹: 全是解围手段, 权重刻意压低 —— 不承担"防线"职责
        return [
            'cherrybomb','cherrybomb',   // 樱桃炸弹: 相对常见的一键清场
            'potatomine','potatomine',   // 土豆地雷: 免费陷阱, 前中期友好
            'squash','squash',           // 窝瓜: 单点秒杀
            'jalapeno',                  // 火爆辣椒: 全行清除(稀有)
            'iceshroom'                  // 寒冰菇: 全屏冻结(稀有)
        ];
    }
    _pickVasePermPlant() {
        const p = this._vasePermPool();
        return p[Math.floor(Math.random() * p.length)];
    }
    _isVaseOncePlant(type) {
        return type === 'cherrybomb' || type === 'potatomine' || type === 'squash'
            || type === 'jalapeno' || type === 'iceshroom';
    }
    // v3.16.0：高级植物专池（低频惊喜）：机枪/西瓜/冰西瓜/猫尾草/忧郁菇/双子/毁灭菇/钢地刺
    _vaseHighPool() {
        return ['gatlingpea', 'melonpult', 'wintermelon', 'cattail', 'gloomshroom', 'twinsunflower', 'doomshroom', 'spikerock'];
    }
    _rollVasePlantContent(vaseType) {
        // v3.16.0：植物内容先分档 —— 25% 高级池 / 75% 低级池；低级内部再按原比例分 永久/一次性
        if (Math.random() < 0.25) {
            const hp = this._vaseHighPool();
            return hp[Math.floor(Math.random() * hp.length)];
        }
        const cfg = this._vaseDiffCfg();
        // 植物罐(绿)是玩家主要植物来源, 偏永久; 问号罐赌性略高但永久仍占多数
        const permRatio = vaseType === 'plant'
            ? (cfg.plantPerm ?? 0.85)
            : (cfg.qPerm ?? 0.65);
        const pool = Math.random() < permRatio ? this._vasePermPool() : this._vaseOncePool();
        return pool[Math.floor(Math.random() * pool.length)];
    }

    // 砸罐子僵尸池（v3.16.0 重构）：75% 低级 / 25% 高级
    // col 传罐子所在列 —— 前两排(col≤2，快进家的格子)绝不给撑杆跳与高级僵尸
    _rollVaseZombieType(col, noElite) {
        const low = [
            'normal','normal','normal','normal',
            'conehead','conehead',
            'buckethead',
            'flag',
            'polevaulting',
            'newspaper',
            'hammerzombie'   // v3.25.0 锤子僵尸：血量=路障，走过罐格就挥锤砸碎
        ];
        const d = this.vaseDifficulty || 'hell';
        let high = [];
        if (d === 'hard') high = ['screendoor', 'football'];
        else if (d === 'hell') high = ['screendoor', 'football', 'zomboni', 'dancing'];
        // v3.23.0：问号罐不出冰车/橄榄球/舞王（用户指定；铁门保留）
        if (noElite) high = high.filter(t => t !== 'football' && t !== 'zomboni' && t !== 'dancing');
        // v3.30.0：冰车/舞王/橄榄球每局合计最多 3 只（用户指定"更难但别难太多"）
        // 达到上限后高级池只剩铁门（hard/hell 都有），不再出这三种
        this._vaseEliteCount = this._vaseEliteCount || 0;
        if (this._vaseEliteCount >= 3) {
            high = high.filter(t => t !== 'football' && t !== 'zomboni' && t !== 'dancing');
        }
        // 前两排：去掉撑杆跳、禁用高级僵尸
        if (col !== undefined && col <= 2) {
            const p = low.filter(t => t !== 'polevaulting');
            return p[Math.floor(Math.random() * p.length)];
        }
        // v3.30.0 高级概率 0.25 → 0.35（配合"每局强僵尸 ≤3"封顶：前期出得更快，总量可控）
        if (high.length > 0 && Math.random() < 0.35) {
            const t = high[Math.floor(Math.random() * high.length)];
            if (t === 'football' || t === 'zomboni' || t === 'dancing') this._vaseEliteCount++;
            return t;
        }
        return low[Math.floor(Math.random() * low.length)];
    }

    // ===== v3.15.0 金色罐子（地狱限定）内容抽签 =====
    // 金罐绝不出现普通僵尸与基础植物：50% 融合进化高阶植物 / 50% 强力僵尸。
    _rollGoldenVaseContent() {
        if (Math.random() < 0.5) return { kind: 'plant', type: this._pickGoldenPlant() };
        return { kind: 'zombie', type: this._pickGoldenZombie() };
    }
    _pickGoldenPlant() {
        // v3.16.0：金罐"融合植物"= 只出经典冒险选卡栏里没有的融合株（fusion_*）。
        // 旧池（机枪/冰西瓜/猫尾草等）经典模式本就可选，不符合"不存在于经典冒险模式"的定义。
        const pool = [
            'fusion_wintermelon_cattail', 'fusion_melon_cattail', 'fusion_veggiepult', 'fusion_popcorn',
            'fusion_icecabbage', 'fusion_cabbagenut', 'fusion_doomshroom_sunflower', 'fusion_spikerock_tallnut',
            'fusion_chomper_wallnut', 'fusion_frostbomb', 'fusion_nutshooter', 'fusion_peaflower',
            'fusion_snownut', 'fusion_spikynut', 'fusion_sporemine', 'fusion_cherrybomb_peashooter',
            'fusion_starfruit', 'fusion_hypnoshroom'
        ];
        return pool[Math.floor(Math.random() * pool.length)];
    }
    // v3.16.0：融合株没有独立卡面 —— 返回两个基础部件
    // v3.27.0：改为 [主体, 副体] —— parts[0] 是"主要的那株"铺底、parts[1] 叠放在上层。
    // 判定标准与 Plant.js 场上渲染一致：谁的身体当"底座"谁是主体
    //（如地刺坚果 = 坚果身铺底 + 地刺叠上面；高坚果钢地刺 = 高坚果铺底 + 钢地刺叠上面）。
    _fusionCardParts(type) {
        const map = {
            fusion_peaflower: ['sunflower', 'peashooter'],
            fusion_nutshooter: ['wallnut', 'peashooter'],
            fusion_frostbomb: ['cherrybomb', 'snowpea'],
            fusion_sporemine: ['potatomine', 'puffshroom'],
            fusion_spikynut: ['wallnut', 'spikeweed'],
            fusion_snownut: ['wallnut', 'snowpea'],
            fusion_melon_cattail: ['cattail', 'melonpult'],
            fusion_wintermelon_cattail: ['cattail', 'wintermelon'],
            fusion_chomper_wallnut: ['wallnut', 'chomper'],
            fusion_icecabbage: ['cabbagepult', 'iceshroom'],
            fusion_popcorn: ['kernelpult', 'jalapeno'],
            fusion_cabbagenut: ['wallnut', 'cabbagepult'],
            fusion_veggiepult: ['kernelpult', 'cabbagepult'],
            fusion_starfruit: ['splitpea', 'sunflower'],
            fusion_hypnoshroom: ['puffshroom', 'garlic'],
            fusion_pumpkinhead: ['wallnut', 'tallnut'],
            fusion_spikerock_tallnut: ['tallnut', 'spikerock']
        };
        if (map[type]) return map[type];
        const parts = type.split('_');
        return parts.length >= 3 ? [parts[1], parts[2]] : null;
    }
    // v3.16.0：融合株卡面 = 主部件卡面铺底 + 副部件卡面右下角叠放
    //（卡图 100×120 上下双段：上层彩色 60px —— 用 100% 200% + top 只露彩色段）
    _fusionCardOverlay(type, stamp, widthPct) {
        const parts = this._fusionCardParts(type);
        if (!parts) return null;
        const a2 = this.plantCardArt(parts[1]);
        if (!a2) return null;
        const ov = document.createElement('div');
        ov.style.cssText = 'position:absolute; right:1px; bottom:1px; width:' + (widthPct || '62%') +
            '; aspect-ratio:5/3; pointer-events:none;' +
            "background-image:url('assets/images/Card/Plants/" + a2 + ".png?v=" + stamp + "');" +
            'background-size:100% 200%; background-position:top; background-repeat:no-repeat;';
        return ov;
    }
    _pickGoldenZombie() {
        // 融合僵尸（豌豆/坚果/向日葵/寒冰射手头，出金罐强化 1000 血）+ 高血僵尸（冰车×2 加权/橄榄球/巨人）
        // v3.23.0：加入火爆辣椒/机枪/高坚果头与盲盒僵尸
        const pool = ['peahead', 'nuthead', 'sunhead', 'snowpeahead', 'jalapenohead', 'machinegunhead', 'tallnuthead', 'mysterybox', 'zomboni', 'zomboni', 'football', 'gargantuar', 'hammerzombie'];
        let t = pool[Math.floor(Math.random() * pool.length)];
        // v3.30.0：金罐的冰车/橄榄球同样计入每局 ≤3 封顶；超限改出巨人（金罐不落空）
        if (t === 'zomboni' || t === 'football' || t === 'dancing') {
            this._vaseEliteCount = (this._vaseEliteCount || 0) + 1;
            if (this._vaseEliteCount > 3) t = 'gargantuar';
        }
        return t;
    }
    // 罐子类型 → 中文前缀（v3.15.0 增加金罐）
    _vaseTypeLabel(t) {
        return t === 'plant' ? '植物罐' : (t === 'zombie' ? '僵尸罐' : (t === 'golden' ? '金罐' : '问号罐'));
    }

    // ===== v3.12.0 南瓜套罐：外壳的移除与啃伤 =====
    // v3.25.0 罐子碎裂特效：从罐身贴图上随机裁 8 片"碎片"，向四周抛飞 + 旋转 + 淡出
    // v3.26.0：礼盒裂开残骸（植物盲盒开箱用）——8 片礼盒碎片飞溅旋转淡出
    _giftShatterFX(cx, cy) {
        const layer = this.entityLayer;
        const url = `assets/images/Plants/PlantBox/GiftBox.png?v=${this.assetStamp()}`;
        for (let i = 0; i < 8; i++) {
            const sh = document.createElement('div');
            const size = 8 + Math.floor(Math.random() * 12);
            const sx = Math.floor(Math.random() * (129 - size));
            const sy = Math.floor(Math.random() * (179 - size));
            sh.style.cssText = 'position:absolute;width:' + size + 'px;height:' + size + 'px;pointer-events:none;' +
                'left:' + cx + 'px;top:' + cy + 'px;background-image:url(\'' + url + '\');' +
                'background-position:-' + sx + 'px -' + sy + 'px;z-index:' + (Math.floor(cy) + 3) + ';';
            layer.appendChild(sh);
            const ang = Math.random() * Math.PI * 2;
            const dist = 40 + Math.random() * 55;
            const dx = Math.cos(ang) * dist;
            const dy = Math.sin(ang) * dist * 0.7;
            const rot = Math.random() * 260 - 130;
            setTimeout(() => {
                sh.style.transition = 'transform 0.45s ease-out, opacity 0.45s ease-in';
                sh.style.transform = 'translate(' + dx + 'px,' + dy + 'px) rotate(' + rot + 'deg)';
                sh.style.opacity = '0';
            }, 20);
            setTimeout(() => { if (sh.parentNode) sh.parentNode.removeChild(sh); }, 500);
        }
    }

    _vaseShatterFX(v) {
        const layer = this.entityLayer;
        const cx = this.board.offsetX + v.col * this.board.cellWidth + this.board.cellWidth / 2;
        const cy = this.board.offsetY + v.row * this.board.cellHeight + this.board.cellHeight / 2 + 12;
        const sprite = v.golden ? 'Vase_Gold.png'
                      : v.type === 'plant' ? 'Vase_Plant.png'
                      : v.type === 'zombie' ? 'Vase_Zombie.png'
                      : 'Vase_Question.png';
        const url = `assets/images/Vase/${sprite}?v=${this.assetStamp()}`;
        for (let i = 0; i < 8; i++) {
            const sh = document.createElement('div');
            const size = 8 + Math.floor(Math.random() * 10);
            const sx = Math.floor(Math.random() * (90 - size));
            const sy = Math.floor(Math.random() * (100 - size));
            sh.style.cssText = 'position:absolute;width:' + size + 'px;height:' + size + 'px;pointer-events:none;' +
                'left:' + cx + 'px;top:' + cy + 'px;background-image:url(\'' + url + '\');' +
                'background-position:-' + sx + 'px -' + sy + 'px;z-index:' + (Math.floor(cy) + 3) + ';';
            layer.appendChild(sh);
            const ang = Math.random() * Math.PI * 2;
            const dist = 40 + Math.random() * 55;
            const dx = Math.cos(ang) * dist;
            const dy = Math.sin(ang) * dist * 0.7;
            const rot = Math.random() * 260 - 130;
            requestAnimationFrame(() => requestAnimationFrame(() => {
                sh.style.transition = 'transform 0.55s cubic-bezier(.2,.5,.6,1), opacity 0.55s ease-in';
                sh.style.transform = 'translate(' + dx + 'px,' + (dy + 55) + 'px) rotate(' + rot + 'deg)';
                sh.style.opacity = '0';
            }));
            setTimeout(() => { if (sh.parentNode) sh.parentNode.removeChild(sh); }, 640);
        }
    }

    _removeVasePumpkin(v) {
        v.pumpkinHp = 0;
        if (v.pumpkinEl && v.pumpkinEl.parentNode) v.pumpkinEl.parentNode.removeChild(v.pumpkinEl);
        v.pumpkinEl = null;
        if (v.pumpkinBackEl && v.pumpkinBackEl.parentNode) v.pumpkinBackEl.parentNode.removeChild(v.pumpkinBackEl);
        v.pumpkinBackEl = null;
    }
    // 僵尸啃一口套罐的壳；返回剩余耐久（0 = 已啃穿，壳被移除）
    // v3.13.2：南瓜套从生到死只有完好态一个外观，不做任何裂纹/糊态变化
    //（用户明确要求），耐久只走数值。
    _damageVasePumpkin(v, dmg) {
        if (!v.pumpkinEl) { v.pumpkinHp = 0; return 0; }
        v.pumpkinHp = Math.max(0, v.pumpkinHp - dmg);
        if (v.pumpkinEl.src.indexOf('shield_full.png') === -1) {
            v.pumpkinEl.src = 'assets/images/Plants/PumpkinHead/shield_full.png';
        }
        if (v.pumpkinHp <= 0) this._removeVasePumpkin(v);
        return v.pumpkinHp;
    }

    smashVase(row, col) {
        if (this.state !== 'PLAYING') return;
        const v = this.vases.find(x => !x.smashed && x.row === row && x.col === col);
        if (!v) return;
        v.smashed = true;
        this.vasesSmashed++;
        // v3.13.2：套罐被砸后南瓜套不消失 —— 转为独立壳墙留在格内（耐久=剩余值），
        // 该格照常可种植新植物（进壳）、壳内植物被铲后也可再种，与经典模式一致。
        const shellHp = v.pumpkinHp;
        this._removeVasePumpkin(v);
        // 罐子破碎音效（原版 PvZ 陶瓷破碎声，与破碎动画同步响起）
        this.audioManager.play('vasebreak');
        // v3.25.0 罐子碎裂特效：罐身碎片四散飞溅（问号/植物/僵尸罐各自用自己的贴图）
        this._vaseShatterFX(v);
        // 罐子破碎动画：放大 + 淡出
        if (v.element && v.element.parentNode) {
            const el = v.element;
            el.style.transition = 'transform 0.18s ease-out, opacity 0.18s ease-out';
            el.style.transform = 'translate(-50%, -50%) scale(1.5)';
            el.style.opacity = '0';
            setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 200);
        }
        // 罐内揭示内容(若已被路灯花照亮: 半透明罐里可见的缩略图) 随罐一起消失
        if (v.contentEl && v.contentEl.parentNode) v.contentEl.parentNode.removeChild(v.contentEl);
        v.contentEl = null;
        // 按预掷内容揭示: 植物 → 发免费卡; 僵尸 → 出现该种僵尸; 阳光 → 掉落可收集阳光
        if (v.content.kind === 'plant') {
            this._grantVasePlantCard(v.content.type, v.type);
        } else if (v.content.kind === 'zombie') {
            this._revealZombieFromVase(v.content.type, v);
        } else if (v.content.kind === 'sun') {
            // 阳光罐: 在该格生成一颗自动落地的阳光, 落地 0.5s 后飞入阳光计数器
            const cx = this.board.offsetX + v.col * this.board.cellWidth + this.board.cellWidth / 2;
            const cy = this.board.offsetY + v.row * this.board.cellHeight + this.board.cellHeight / 2;
            const s = new Sun(this, cx, cy, cy); // targetY=cy → 原地落地
            s.value = v.content.value || 50;
            this.entities.push(s);
            this.score += 15;
            this.updateScore();
            const prefix = this._vaseTypeLabel(v.type); // v3.15.0 支持金罐
            this.showAnnouncement(`${prefix}：+${s.value} 阳光！攒够 75 可在种子栏购买路灯花`, '#ffd54a');
        }
        // v3.13.2：南瓜套落地成壳墙（放在内容揭示之后，格内无植物才落；耐久=南瓜套剩余值）
        if (shellHp > 0 && this.board.canPlant(row, col) && !this.board.grid[row][col]) {
            const shell = new Plant(this, 'pumpkinhead');
            shell.hp = Math.max(1, Math.min(4000, Math.round(shellHp)));
            this.board.addPlant(shell, row, col);
        }
        // 罐子减少提示
        this.showAnnouncement(`已砸开 ${this.vasesSmashed}/${this.vasesTotal}`, '#ffdd66');
        this.checkVaseVictory();
    }

    // type -> Card/Plants 素材文件名（大小写与 git 入库路径严格一致，部署环境大小写敏感！）
    plantCardArt(type) {
        const map = {
            peashooter: 'Peashooter', snowpea: 'SnowPea', repeater: 'Repeater',
            sunflower: 'SunFlower', wallnut: 'WallNut', cherrybomb: 'CherryBomb',
            squash: 'Squash', jalapeno: 'Jalapeno', potatomine: 'PotatoMine',
            chomper: 'Chomper', puffshroom: 'PuffShroom', fumeshroom: 'FumeShroom',
            spikeweed: 'Spikeweed', threepeater: 'Threepeater', splitpea: 'SplitPea',
            gatlingpea: 'GatlingPea', melonpult: 'MelonPult', tallnut: 'TallNut',
            iceshroom: 'IceShroom', doomshroom: 'DoomShroom', cattail: 'Cattail',
            wintermelon: 'WinterMelon', torchwood: 'Torchwood', garlic: 'Garlic', plantern: 'Plantern',
            sunshroom: 'SunShroom', scaredyshroom: 'ScaredyShroom', twinSunflower: 'TwinSunflower', twinsunflower: 'TwinSunflower', // v3.15.0 补小写键（金罐植物池）
            spikerock: 'Spikerock', // v3.15.0 金罐植物池
            cabbagepult: 'CabbagePult', kernelpult: 'KernelPult',
            starfruit: 'Starfruit', hypnoshroom: 'HypnoShroom', // v3.16.0 补卡面（此前砸开无图）
            pumpkinhead: 'PumpkinHead', gloomshroom: 'GloomShroom'
        };
        return map[type] || null;
    }

    // ===== 路灯花商店：vase 模式种子栏首位常驻一张 75 阳光的购买卡 =====
    // 路灯花唯一获得方式 —— 罐子(植物/问号/僵尸)都打不出, 只能攒阳光购买
    insertPlanternShop() {
        const bank = document.getElementById('seed-bank');
        if (!bank || bank.querySelector('.plantern-shop-card')) return;
        const el = document.createElement('div');
        el.className = 'seed-card plantern-shop-card';
        el.dataset.type = 'plantern';
        el.dataset.cost = 75;
        el.dataset.cooldown = 0.5;
        el.style.backgroundImage = `url('assets/images/Card/Plants/Plantern.png?v=${this.assetStamp()}')`;
        el.innerHTML = '<div class="cooldown-overlay"></div><span class="shop-price">☀75</span>';
        el.title = '路灯花商店：花 75 阳光购买一盏路灯花（罐子里打不出，只能购买）\n种植后照亮周围一圈罐子里真正的内容';
        bank.prepend(el);
    }

    buyPlantern() {
        if (this.state !== 'PLAYING') return;
        const COST = 75;
        if (this.sunCount < COST) {
            this.showAnnouncement(`阳光不足：路灯花需要 ${COST} 阳光，继续砸植物罐攒阳光吧`, '#ff6666');
            this.audioManager.play('btn');
            return;
        }
        this.sunCount -= COST;
        this.sunCountElement.innerText = this.sunCount;
        // 生成一张可拖动的路灯花免费卡（复用免费卡机制：拖到草地任意格种植）
        const art = this.plantCardArt('plantern');
        const el = document.createElement('div');
        el.className = 'seed-card vase-free-card';
        el.dataset.type = 'plantern';
        el.dataset.cost = 0;
        el.dataset.cooldown = 0.5;
        if (art) {
            el.style.backgroundImage = `url('assets/images/Card/Plants/${art}.png?v=${this.assetStamp()}')`;
        }
        el.innerHTML = '<div class="cooldown-overlay"></div>';
        el.title = '路灯花（已购买 · 拖到草地上种植，照亮周围一圈罐子）';
        const bank = document.getElementById('seed-bank');
        if (bank) bank.appendChild(el);
        this.vaseFreeCards.push({ type: 'plantern', element: el, consumed: false });
        this.updateUI();
        this.audioManager.play('sun');
        this.showAnnouncement('已用 75 阳光购买路灯花！拖到草地上种植即可照亮周围一圈罐子的内容', '#ffd54a');
    }

    // 砸罐子: 给一张预掷种类的免费植物卡(无阳光/无冷却, 种下即消耗)
    _grantVasePlantCard(type, vaseType) {
        vaseType = vaseType || 'question';
        const art = this.plantCardArt(type);
        const el = document.createElement('div');
        el.className = 'seed-card vase-free-card';
        el.dataset.type = type;
        el.dataset.cost = 0;
        el.dataset.cooldown = 0.5;
        if (art) {
            el.style.backgroundImage = `url('assets/images/Card/Plants/${art}.png?v=${this.assetStamp()}')`;
        }
        el.innerHTML = '<div class="cooldown-overlay"></div>';
        el.title = `${this.getPlantName(type)}（免费 · 拖到草地上种植）`;
        if (!art) {
            // v3.16.0：融合株（金罐植物池）—— 双部件合成卡面
            const parts = this._fusionCardParts(type);
            const a1 = parts && this.plantCardArt(parts[0]);
            if (a1) {
                el.style.position = 'relative';
                el.style.backgroundImage = `url('assets/images/Card/Plants/${a1}.png?v=${this.assetStamp()}')`;
                const ov = this._fusionCardOverlay(type, this.assetStamp());
                if (ov) el.appendChild(ov);
            }
        }
        const bank = document.getElementById('seed-bank');
        if (bank) bank.appendChild(el);

        this.vaseFreeCards.push({ type, element: el, consumed: false });
        this.updateUI();
        this.audioManager.play('plant');
        this.score += 20;
        this.updateScore();
        const prefix = this._vaseTypeLabel(vaseType); // v3.15.0 支持金罐
        this.showAnnouncement(`${prefix}：获得「${this.getPlantName(type)}」卡片！拖到草地上任意格子种植`, '#66ff66');
    }

    assetStamp() {
        // 与 bump_version.py 同步的缓存戳：读取当前 URL 使用的 ?v=（取第一个种子图片的值兜底）
        const m = (this.seeds && this.seeds[0] && this.seeds[0].img || '').match(/v=(\d+)/);
        return m ? m[1] : '';
    }

    // 砸罐子: 让一只预掷种类的僵尸从该格左侧出现
    _revealZombieFromVase(type, vase) {
        const z = new Zombie(this, vase.row, type);
        // 让僵尸从罐子格 x 出现(默认 950 太靠右,不合理)
        z.x = this.board.offsetX + vase.col * this.board.cellWidth + this.board.cellWidth / 2;
        z.element.style.left = z.x + 'px';
        // v3.21.0：撤销 v3.18.0/v3.19.0 的"罐中僵尸站定"——恢复原版行走+啃食（用户确认站定非所需）
        // v3.15.0：金罐强化 —— 融合植物头僵尸本体仅 200 血，从金罐出来时按"很厉害"定位强化为 1000 血
        //（先强化基准值，地狱 hpMul ×1.35 再在其上生效 —— 顺序不能颠倒）
        if (vase.golden && (type === 'peahead' || type === 'nuthead' || type === 'sunhead' || type === 'snowpeahead' || type === 'jalapenohead' || type === 'machinegunhead' || type === 'tallnuthead')) {
            z.hp = 1000; z.maxHp = 1000;
        }
        // 地狱难度: 血量 ×1.35（简单/困难为 1.0 不生效）
        const hpMul = this._vaseDiffCfg().hpMul;
        if (hpMul > 1) {
            z.hp = Math.round(z.hp * hpMul);
            z.maxHp = z.hp;
        }
        this.entities.push(z);
        this.score = Math.max(0, this.score - 5);
        this.updateScore();
        const zhName = this._zombieZhName(type); // v3.23.0 统一出口
        const prefix = this._vaseTypeLabel(vase.golden ? 'golden' : vase.type); // v3.15.0 支持金罐
        this.showAnnouncement(`${prefix}：${zhName} 来了！`, '#ff6666');
    }

    // 路灯花照亮周围一圈(8 邻居)的罐子: 罐子变成半透明, 罐内直接可见真正的内容
    //   (植物 → 卡图预览; 僵尸 → 僵尸立绘)。揭示内容与预掷 v.content 完全一致。
    lightUpNeighbors(row, col) {
        if (!this.vases || this.vases.length === 0) return;
        const stamp = this.assetStamp();
        // 僵尸类型 → 在场上的小立绘,用于罐内预览
        const zombieIcon = {
            normal:    'Zombie/Zombie.gif',
            flag:      'FlagZombie/FlagZombie.gif',
            conehead:  'ConeheadZombie/ConeheadZombie.gif',
            buckethead:'BucketheadZombie/BucketheadZombie.gif',
            polevaulting:'PoleVaultingZombie/PoleVaultingZombie.gif',
            newspaper: 'NewspaperZombie/HeadWalk1.gif',
            screendoor:'ScreenDoorZombie/HeadWalk1.gif',
            football:'FootballZombie/FootballZombie.gif',   // v3.14.0 罐子特殊僵尸
            zomboni:  'Zomboni/1.gif',
            dancing:  'DancingZombie/DancingZombie.gif',
            // v3.15.0 金罐新僵尸：植物头僵尸用头顶植物立绘做预览（本体与普通僵尸同图）
            peahead:     '../Plants/Peashooter/Peashooter.gif',
            nuthead:     '../Plants/WallNut/WallNut.gif',
            sunhead:     '../Plants/SunFlower/SunFlower1.gif',
            snowpeahead: '../Plants/SnowPea/SnowPea.gif',
            jalapenohead:'../Plants/Jalapeno/Jalapeno.gif',
            machinegunhead:'../Plants/GatlingPea/GatlingPea.gif',
            tallnuthead: '../Plants/TallNut/TallNut.gif',
            mysterybox:  '../Plants/PlantBox/GiftBox.png',
            gargantuar:  'Zombie/Zombie.gif'
        };
        let lit = 0;
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const r = row + dr, c = col + dc;
                if (r < 0 || r >= this.board.rows || c < 0 || c >= this.board.cols) continue;
                const v = this.vases.find(x => !x.smashed && x.row === r && x.col === c);
                if (!v || v.revealed) continue;
                v.revealed = true;
                // 1) 罐子半透明化 + 暖光, 让罐内内容透出来
                if (v.element) {
                    v.element.style.opacity = '0.40';
                    v.element.style.filter = 'drop-shadow(0 0 5px rgba(255, 225, 110, 0.9))';
                    v.element.style.transition = 'opacity 0.25s ease-out, filter 0.25s ease-out';
                }
                // 2) 内容缩略图叠在罐子中心（看起来"装在罐子里"）
                let inner;
                if (v.content.kind === 'plant') {
                    // v3.29.0：罐内植物预览统一换成「植物本体立绘」—— 与植物头僵尸的罐内预览
                    // 同款风格（用户：罐里"只有一个植物脑袋"的那张图很好看，全部植物都用它）。
                    // 探针 Plant 实例只读素材路径（element.src / fusionOverlay.src），读完立即摘除
                    // ——不进主循环、不参与碰撞、不计分，对游戏状态零影响。
                    const probe = new Plant(this, v.content.type);
                    const bodySrc = probe.element.getAttribute('src');
                    if (probe.element.parentNode) probe.element.parentNode.removeChild(probe.element);
                    if (probe.fusionOverlay && probe.fusionOverlay.parentNode) {
                        probe.fusionOverlay.parentNode.removeChild(probe.fusionOverlay);
                    }
                    if (bodySrc) {
                        inner = document.createElement('img');
                        inner.className = 'entity vase-reveal';
                        inner.style.pointerEvents = 'none';
                        inner.src = bodySrc.includes('?') ? bodySrc : `${bodySrc}?v=${stamp}`;
                        inner.style.width = 'auto';
                        inner.style.maxWidth = '58px';
                        inner.style.maxHeight = '64px';
                        inner.style.objectFit = 'contain';
                    } else {
                        // 兜底：素材表查不到的异常类型 → 退回旧版卡面裁切预览
                        //（种子卡素材 100×120 上下双段，只露出上半段彩色卡面）
                        const art = this.plantCardArt(v.content.type);
                        inner = document.createElement('div');
                        inner.className = 'entity vase-reveal vase-reveal-card';
                        inner.style.pointerEvents = 'none';
                        if (art) inner.style.backgroundImage = `url('assets/images/Card/Plants/${art}.png?v=${stamp}')`;
                        inner.style.width = '58px';
                        inner.style.height = '35px';
                    }
                } else {
                    inner = document.createElement('img');
                    inner.className = 'entity vase-reveal';
                    inner.style.pointerEvents = 'none';
                    if (v.content.kind === 'zombie') {
                        // v3.30.0：植物头僵尸（含盲盒僵尸）罐内预览 = 僵尸身体 + 头顶植物头合成
                        //（旧版只给植物立绘 —— 与 v3.29.0 后的植物罐预览长得一模一样，分不清罐里是什么）
                        const headCfg = Zombie.PLANT_HEAD_CFG && Zombie.PLANT_HEAD_CFG[v.content.type];
                        if (headCfg) {
                            const wrap = document.createElement('div');
                            wrap.className = 'entity vase-reveal';
                            wrap.style.pointerEvents = 'none';
                            wrap.style.width = '56px';
                            wrap.style.height = '64px';
                            // 身体：普通僵尸 gif，按预览宽度等比（场上立绘 144px → 56px，k=缩放系数）
                            const k = 56 / 144;
                            const body = document.createElement('img');
                            body.src = `assets/images/Zombies/Zombie/Zombie.gif?v=${stamp}`;
                            body.style.position = 'absolute';
                            body.style.left = '0';
                            body.style.bottom = '0';
                            body.style.width = '56px';
                            body.style.height = '56px';
                            wrap.appendChild(body);
                            // 头：复用场上 createPlantHead 的裁剪参数（等比缩小，水平翻转朝左）
                            const hw = headCfg.w * k;
                            const head = document.createElement('div');
                            head.style.position = 'absolute';
                            head.style.overflow = 'hidden';
                            head.style.width = hw + 'px';
                            head.style.height = (hw * headCfg.ch / headCfg.cw * headCfg.keepTop) + 'px';
                            head.style.left = (28 - hw / 2 + 10 * k) + 'px';   // 头区中心=身体中心右偏 10px（同 syncPlantHead）
                            const topOff = (headCfg.topOff !== undefined) ? headCfg.topOff : -48;
                            head.style.top = (36 + topOff * k) + 'px';          // 身体中心(36px) + 头顶锚点等比偏移
                            const hImg = document.createElement('img');
                            hImg.src = headCfg.src.includes('?') ? headCfg.src : `${headCfg.src}?v=${stamp}`;
                            hImg.style.position = 'absolute';
                            hImg.style.left = '0';
                            hImg.style.top = '0';
                            hImg.style.width = hw + 'px';
                            hImg.style.transform = 'scaleX(-1)';
                            head.appendChild(hImg);
                            wrap.appendChild(head);
                            inner = wrap;
                        } else {
                            inner.src = `assets/images/Zombies/${zombieIcon[v.content.type] || 'Zombie/Zombie.gif'}?v=${stamp}`;
                            inner.style.width = '56px';
                            inner.style.height = 'auto';
                            inner.style.maxHeight = '64px';
                        }
                    } else {
                        // 阳光罐：罐内直接显示一个小太阳
                        inner.src = `assets/images/interface/Sun.gif?v=${stamp}`;
                        inner.style.width = '40px';
                        inner.style.height = '40px';
                    }
                }
                const cx = this.board.offsetX + v.col * this.board.cellWidth + this.board.cellWidth / 2;
                const cy = this.board.offsetY + v.row * this.board.cellHeight + this.board.cellHeight / 2 + 12;
                inner.style.left = cx + 'px';
                inner.style.top = cy + 'px';
                inner.style.transform = 'translate(-50%, -50%)';
                inner.style.zIndex = String(Math.floor(cy) + 2);
                this.entityLayer.appendChild(inner);
                v.contentEl = inner;
                lit++;
            }
        }
        if (lit > 0) {
            this.showAnnouncement(`路灯花照亮了 ${lit} 个罐子：罐子变透明，可看清里面装的是什么`, '#ffff66');
        } else {
            this.showAnnouncement('路灯花附近没有可以照亮的罐子', '#ffff66');
        }
    }

    // 战场左侧打出帅气的「区耀丁」署名（vase 模式专属）：
    // 罐子从 col1 起摆，其左边正是第一列 col0 —— 该列永远不会出现罐子，
    // 竖排金字署名固定浮在那里，作为玩家签名水印（种植物/僵尸经过都在其上，不影响游戏）
    _showVaseSignature() {
        if (!this.vaseMode) return;
        if (this._sigEl && this._sigEl.parentNode) this._sigEl.parentNode.removeChild(this._sigEl);
        this._sigEl = null;
        const sig = document.createElement('div');
        sig.className = 'vase-sign';
        sig.textContent = '区耀丁';
        const x = this.board.offsetX + this.board.cellWidth / 2; // col0 中心
        const y = this.board.offsetY + (this.board.rows * this.board.cellHeight) / 2; // 战场垂直中点
        sig.style.left = x + 'px';
        sig.style.top = y + 'px';
        this.entityLayer.appendChild(sig);
        this._sigEl = sig;
    }

    // HUD 常驻难度角标（右上角 Speed 按钮旁），仅 vase 模式显示
    _syncVaseHud() {
        const old = document.getElementById('vase-diff-chip');
        if (old && old.parentNode) old.parentNode.removeChild(old);
        if (!this.vaseMode) return;
        const cfg = this._vaseDiffCfg();
        const chip = document.createElement('div');
        chip.id = 'vase-diff-chip';
        chip.className = 'diff-chip diff-' + cfg.key;
        chip.innerHTML = `难度 · ${cfg.label}<span class="diff-chip-en">${cfg.key.toUpperCase()}</span>`;
        chip.title = `砸罐子 · ${cfg.label}难度`;
        const top = document.getElementById('top-bar');
        if (top) top.appendChild(chip);
    }

    checkVaseVictory() {
        if (this.state !== 'PLAYING') return;
        if (this.vases.length === 0) return;
        if (!this.vases.every(v => v.smashed)) return;
        // 等场上僵尸清空（Dying 动画允许播放完、元素已移除）
        const live = this.entities.some(e => e instanceof Zombie && !e.isDead && e.state !== 'DYING');
        if (live) return;
        this.state = 'GAMEOVER';
        this.audioManager.stop('bgm');
        this.audioManager.play('win'); // v3.5.2 修复: 胜利必须播胜利音乐(此前误播 lose)
        // 胜利弹窗：居中 modal —— LEVEL CLEAR + VICTORY! 砸罐子完成! + 难度 + Final Score + 再玩一局/退出
        const container = this.container;
        const diffLabel = this._vaseDiffCfg().label; // 简单/困难/地狱
        const overlay = document.createElement('div');
        overlay.className = 'vase-win-overlay';
        overlay.innerHTML = `
            <div class="vase-win-panel">
                <div class="vase-win-lv">LEVEL CLEAR</div>
                <div class="vase-win-title">VICTORY!</div>
                <div class="vase-win-sub">砸罐子完成！<span class="vase-win-diff">难度 · ${diffLabel}</span></div>
                <div class="vase-win-score">Final Score：<b>${this.score}</b></div>
                <div class="vase-win-btns">
                    <button id="vase-win-replay" class="vase-win-btn again">再玩一局</button>
                    <button id="vase-win-exit" class="vase-win-btn exit">退出</button>
                </div>
            </div>`;
        container.appendChild(overlay);
        overlay.querySelector('#vase-win-replay').onclick = () => this.restartVaseLevel();
        overlay.querySelector('#vase-win-exit').onclick = () => location.reload(); // 回主菜单（干净重载）
        this._vaseWinEls = [overlay];
    }

    // 胜利后"再玩一局"：清掉整场残留(罐子/植物/僵尸/阳光/子弹) 后原地开一局新砸罐子
    restartVaseLevel() {
        this.audioManager.play('btn');
        // 1) 移除胜利画面（v3.11.1：失败画面 _gameOverEls 同样可能存在，一并移除）
        this._removeGameOverEls();
        if (this._vaseWinEls) {
            this._vaseWinEls.forEach(el => { if (el.parentNode) el.parentNode.removeChild(el); });
            this._vaseWinEls = null;
        }
        // 2) 移除所有罐子与其罐内揭示内容（含 v3.12.0 南瓜套罐的外壳层）
        (this.vases || []).forEach(v => {
            if (v.element && v.element.parentNode) v.element.parentNode.removeChild(v.element);
            if (v.contentEl && v.contentEl.parentNode) v.contentEl.parentNode.removeChild(v.contentEl);
            if (v.pumpkinEl && v.pumpkinEl.parentNode) v.pumpkinEl.parentNode.removeChild(v.pumpkinEl);
            if (v.pumpkinBackEl && v.pumpkinBackEl.parentNode) v.pumpkinBackEl.parentNode.removeChild(v.pumpkinBackEl);
        });
        this.vases = [];
        this.vasesTotal = 0;
        this.vasesSmashed = 0;
        // 3) 清掉场上所有实体(植物/僵尸/阳光/子弹)的 DOM 与数组, 重置棋盘
        this.entities.forEach(e => this._removeEntityDom(e));
        this.entities = [];
        this._hardSweepEntityLayer(); // v3.18.0：硬清场，孤儿 DOM 一律带走
        for (let r = 0; r < this.board.rows; r++) {
            for (let c = 0; c < this.board.cols; c++) this.board.grid[r][c] = null;
        }
        this.score = 0;
        this.updateScore();
        // 4) 走标准开局：清种子栏 + 阳光归零 + 商店 + 重掷罐子 + 重启主循环(state: GAMEOVER→PLAYING)
        this.startGame();
    }
}

// Start game when page loads
window.onload = () => {
    window._pvzGame = new Game();
};
