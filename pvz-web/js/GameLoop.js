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
            vasebreak: new Audio('assets/audio/vase_breaking.mp3') // 砸罐破碎音效(原版官方) — v3.5.2 补注册(v3.5.0 漏加导致从未响起)
        };
        this.sounds.bgm.loop = true;
    }
    
    play(name) {
        if (this.sounds[name]) {
            // Clone node to allow overlapping sounds (bgm/lose/win 是长音乐, 播原对象以便 stop)
            if (name !== 'bgm' && name !== 'lose' && name !== 'win') {
                const s = this.sounds[name].cloneNode();
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
            if (this.state !== 'PLAYING' || !this.fusionMode) return;
            // 选卡界面 / 开始菜单 / 融合图鉴弹窗打开时不响应
            const overlayOpen = (id) => {
                const el = document.getElementById(id);
                return !!el && el.style.display !== 'none' && el.style.display !== '';
            };
            if (overlayOpen('seed-chooser') || overlayOpen('start-menu') || overlayOpen('recipe-modal')) return;
            e.preventDefault(); // 阻止空格滚动页面
            if (!e.repeat) this.toggleGlove(); // 按住不放只触发一次
        });
    }
    
    updateScore() {
        const scoreEl = document.getElementById('score-count');
        if (scoreEl) {
            scoreEl.innerText = this.score;
        }
        
        // Trigger event on milestone (融合进化模式关闭全局随机事件)
        if (!this.fusionMode && this.scoreMilestones && this.scoreMilestones.length > 0) {
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
        
        btnAdv.onclick = () => {
            this.audioManager.play('btn');
            menu.style.display = 'none';
            this.fusionMode = false;
            this.vaseMode = false;
            this.showSeedChooser();
        };
        
        btnFusion.onclick = () => {
            this.audioManager.play('btn');
            menu.style.display = 'none';
            this.fusionMode = true;
            this.vaseMode = false;
            this.showSeedChooser();
        };
        
        // 砸罐子：先弹难度选择（简单/困难/地狱），选定后免选卡直接开局
        btnVase.onclick = () => {
            this.audioManager.play('btn');
            this._openVaseDifficulty();
        };

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
        this.selectedSeeds = [];
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
                pCard: 0.78,     // 植物罐 78% 植物卡 / 22% 阳光
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
                pCard: 0.55,
                plantPerm: 0.8,  // 植物罐砸出的植物 80% 永久 / 20% 一次性
                qPerm: 0.62,     // 问号罐砸出的植物 62% 永久 / 38% 一次性
                zPool: ['normal','normal','normal','normal','conehead','conehead','buckethead','flag','polevaulting','newspaper'],
                hpMul: 1.0
            },
            hell: {
                key: 'hell', label: '地狱', totalMin: 26, totalMax: 28,
                bag: ['plant','plant','plant',
                      'question','question','question','question','question','question','question','question','question','question','question',
                      'zombie','zombie','zombie','zombie','zombie','zombie'], // 植物罐仅 3/20≈15%, 僵尸罐高达 6/20≈30%
                qZombie: 0.6,    // 地狱: 问号罐 60% 僵尸 —— 僵尸偏多但 40% 保底是植物, 绝不是全僵尸
                pCard: 0.45,     // 植物罐过半是阳光 —— 植物稀缺, 全靠路灯花先侦察
                plantPerm: 0.9,  // 地狱植物金贵: 植物罐砸出的植物 90% 永久 / 10% 一次性
                qPerm: 0.72,     // 问号罐砸出的植物 72% 永久 / 28% 一次性
                zPool: ['normal','normal','normal','conehead','conehead','buckethead','buckethead','newspaper','polevaulting','flag','screendoor'],
                hpMul: 1.35      // 所有砸出僵尸血量 +35%
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
        const fusionBasePlants = ['sunflower', 'peashooter', 'wallnut', 'cherrybomb', 'squash',
            'jalapeno', 'potatomine', 'chomper', 'tallnut', 'puffshroom',
            'iceshroom', 'doomshroom', 'spikeweed', 'garlic', 'melonpult'];
        const seedList = this.fusionMode
            ? this.seeds.filter(s => fusionBasePlants.includes(s.type))
            : this.seeds;
        
        seedList.forEach(s => {
            const card = document.createElement('div');
            card.className = 'chooser-card';
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
        
        if (this.fusionMode) {
            document.getElementById('glove-bank').style.display = 'flex';
            document.getElementById('recipe-book-btn').style.display = 'flex';
            this.initFusionUI();
        } else {
            document.getElementById('glove-bank').style.display = 'none';
            document.getElementById('recipe-book-btn').style.display = 'none';
        }

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
            { type: 'sunflower', cost: 50, cooldown: 7.5, img: 'assets/images/Card/Plants/SunFlower.png?v=1788959180' },
            { type: 'twinsunflower', cost: 150, cooldown: 50, img: 'assets/images/Card/Plants/TwinSunflower.png?v=1788959180' },
            { type: 'sunshroom', cost: 25, cooldown: 7.5, img: 'assets/images/Card/Plants/SunShroom.png?v=1788959180' },
            { type: 'peashooter', cost: 100, cooldown: 7.5, img: 'assets/images/Card/Plants/Peashooter.png?v=1788959180' },
            { type: 'repeater', cost: 200, cooldown: 7.5, img: 'assets/images/Card/Plants/Repeater.png?v=1788959180' },
            { type: 'threepeater', cost: 300, cooldown: 7.5, img: 'assets/images/Card/Plants/Threepeater.png?v=1788959180' },
            { type: 'gatlingpea', cost: 250, cooldown: 50, img: 'assets/images/Card/Plants/GatlingPea.png?v=1788959180' },
            { type: 'snowpea', cost: 175, cooldown: 7.5, img: 'assets/images/Card/Plants/SnowPea.png?v=1788959180' },
            { type: 'splitpea', cost: 125, cooldown: 7.5, img: 'assets/images/Card/Plants/SplitPea.png?v=1788959180' },
            { type: 'torchwood', cost: 175, cooldown: 7.5, img: 'assets/images/Card/Plants/Torchwood.png?v=1788959180' },
            { type: 'wallnut', cost: 50, cooldown: 30, img: 'assets/images/Card/Plants/WallNut.png?v=1788959180' },
            { type: 'cherrybomb', cost: 150, cooldown: 50, img: 'assets/images/Card/Plants/CherryBomb.png?v=1788959180' },            { type: 'squash', cost: 50, cooldown: 30, img: 'assets/images/Card/Plants/Squash.png?v=1788959180' },
            { type: 'jalapeno', cost: 125, cooldown: 50, img: 'assets/images/Card/Plants/Jalapeno.png?v=1788959180' },
            { type: 'potatomine', cost: 25, cooldown: 30, img: 'assets/images/Card/Plants/PotatoMine.png?v=1788959180' },
            { type: 'chomper', cost: 150, cooldown: 7.5, img: 'assets/images/Card/Plants/Chomper.png?v=1788959180' },
            { type: 'tallnut', cost: 125, cooldown: 30, img: 'assets/images/Card/Plants/TallNut.png?v=1788959180' },
            { type: 'puffshroom', cost: 0, cooldown: 7.5, img: 'assets/images/Card/Plants/PuffShroom.png?v=1788959180' },
            { type: 'fumeshroom', cost: 75, cooldown: 7.5, img: 'assets/images/Card/Plants/FumeShroom.png?v=1788959180' },
            { type: 'scaredyshroom', cost: 25, cooldown: 7.5, img: 'assets/images/Card/Plants/ScaredyShroom.png?v=1788959180' },
            { type: 'gloomshroom', cost: 150, cooldown: 7.5, img: 'assets/images/Card/Plants/GloomShroom.png?v=1788959180' },
            { type: 'spikerock', cost: 125, cooldown: 7.5, img: 'assets/images/Card/Plants/Spikerock.png?v=1788959180' },
            { type: 'cattail', cost: 225, cooldown: 7.5, img: 'assets/images/Card/Plants/Cattail.png?v=1788959180' },
            { type: 'melonpult', cost: 300, cooldown: 7.5, img: 'assets/images/Card/Plants/MelonPult.png?v=1788959180' },{ type: 'iceshroom', cost: 75, cooldown: 50, img: 'assets/images/Card/Plants/IceShroom.png?v=1788959180' },
            { type: 'doomshroom', cost: 125, cooldown: 50, img: 'assets/images/Card/Plants/DoomShroom.png?v=1788959180' },
            { type: 'spikeweed', cost: 100, cooldown: 7.5, img: 'assets/images/Card/Plants/Spikeweed.png?v=1788959180' },
            { type: 'garlic', cost: 50, cooldown: 7.5, img: 'assets/images/Card/Plants/Garlic.png?v=1788959180' },
            // ===== v3.6.0 经典模式新增 4 植物（数值取 PVZ1 原版；融合模式选卡仍过滤为 15 基础牌，不受影响）=====
            { type: 'wintermelon', cost: 200, cooldown: 7.5, img: 'assets/images/Card/Plants/WinterMelon.png?v=1788959180' },
            { type: 'starfruit', cost: 125, cooldown: 7.5, img: 'assets/images/Card/Plants/Starfruit.png?v=1788959180' },
            { type: 'hypnoshroom', cost: 75, cooldown: 30, img: 'assets/images/Card/Plants/HypnoShroom.png?v=1788959180' },
            { type: 'pumpkinhead', cost: 125, cooldown: 30, img: 'assets/images/Card/Plants/PumpkinHead.png?v=1788959180' }
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
        
        gloveBtn.addEventListener('click', () => this.toggleGlove());
        
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
            { a: 'chomper', b: 'tallnut', result: '西瓜投手', img: 'assets/images/Plants/MelonPult/MelonPult.png?v=1788959180', css: false },
            { a: 'peashooter', b: 'sunflower', result: '豌豆向日葵', base: 'assets/images/Plants/SunFlower/SunFlower1.gif', over: 'assets/images/Plants/Peashooter/Peashooter.gif', overClip: 'polygon(0 0, 100% 0, 100% 65%, 0 65%)', overTransform: 'translate(0px, -20px) scale(1.0)' },
            { a: 'peashooter', b: 'wallnut', result: '坚果射手', base: 'assets/images/Plants/WallNut/WallNut.gif', over: 'assets/images/Plants/Peashooter/Peashooter.gif', overClip: 'polygon(0 0, 100% 0, 100% 65%, 0 65%)', overTransform: 'translate(5px, -15px) scale(1.0)' },
            { a: 'snowpea', b: 'cherrybomb', result: '寒冰炸弹', img: 'assets/images/Plants/CherryBomb/CherryBomb.gif', filter: 'hue-rotate(180deg) saturate(1.5)', css: false },
            { a: 'puffshroom', b: 'potatomine', result: '孢子地雷', base: 'assets/images/Plants/PotatoMine/PotatoMine.gif', over: 'assets/images/Plants/PuffShroom/PuffShroom.gif', overClip: 'polygon(0 0, 100% 0, 100% 85%, 0 85%)', overTransform: 'translate(0px, -45px) scale(0.9)' },
            { a: 'chomper', b: 'wallnut', result: '大嘴坚果', base: 'assets/images/Plants/WallNut/WallNut.gif', over: 'assets/images/Plants/Chomper/Chomper.gif', overClip: 'polygon(0 0, 100% 0, 100% 85%, 0 85%)', overTransform: 'translate(0px, -25px) scale(0.9)' },
            { a: 'snowpea', b: 'wallnut', result: '寒冰坚果', img: 'assets/images/Plants/WallNut/WallNut.gif', filter: 'hue-rotate(180deg) saturate(1.5) brightness(1.2)', css: false },
            { a: 'peashooter', b: 'cherrybomb', result: '樱桃射手', img: 'assets/images/Plants/Peashooter/Peashooter.gif', filter: 'hue-rotate(-45deg) saturate(2.0)', css: false },
            { a: 'sunflower', b: 'doomshroom', result: '毁灭向日葵', img: 'assets/images/Plants/SunFlower/SunFlower1.gif', filter: 'grayscale(0.8) brightness(0.6) sepia(1) hue-rotate(240deg) saturate(3)', css: false },
            { a: 'melonpult', b: 'iceshroom', result: '冰西瓜投手', img: 'assets/images/Plants/WinterMelon/WinterMelon.png?v=1788959180', css: false },
            { a: 'repeater', b: 'spikeweed', result: '猫尾草', img: 'assets/images/Plants/Cattail/Cattail.gif', css: false },
            { a: 'fumeshroom', b: 'fumeshroom', result: '忧郁菇', img: 'assets/images/Plants/GloomShroom/GloomShroom.gif', css: false },
            { a: 'spikeweed', b: 'spikeweed', result: '钢地刺', img: 'assets/images/Plants/Spikerock/Spikerock.gif', css: false },
            { a: 'spikeweed', b: 'wallnut', result: '地刺坚果', base: 'assets/images/Plants/WallNut/WallNut.gif', over: 'assets/images/Plants/Spikeweed/Spikeweed.gif', overTransform: 'translate(0px, 40px) scale(1.0)' },
            { a: 'spikerock', b: 'tallnut', result: '钢刺高坚果', base: 'assets/images/Plants/TallNut/TallNut.gif', over: 'assets/images/Plants/Spikerock/Spikerock.gif', overTransform: 'translate(0px, 40px) scale(1.0)' },
            // ===== v3.2.38 新增 =====
            { a: 'splitpea', b: 'sunflower', result: '杨桃', img: 'assets/images/Plants/Starfruit/Starfruit.gif', css: false },
            { a: 'puffshroom', b: 'garlic', result: '魅惑菇', img: 'assets/images/Plants/HypnoShroom/HypnoShroom.gif', css: false },
            { a: 'wallnut', b: 'tallnut', result: '南瓜壳（可套在任意植物上）', img: 'assets/images/Plants/PumpkinHead/PumpkinHead.gif', css: false },
            { a: 'melonpult', b: 'cattail', result: '西瓜猫尾草', base: 'assets/images/Plants/Cattail/Cattail.gif', over: 'assets/images/Plants/MelonPult/MelonPult.png?v=1788959180', overTransform: 'translate(-5px, -30px) scale(0.7)' },
            { a: 'wintermelon', b: 'cattail', result: '冰西瓜猫尾草', base: 'assets/images/Plants/Cattail/Cattail.gif', over: 'assets/images/Plants/WinterMelon/WinterMelon.png?v=1788959180', overTransform: 'translate(-5px, -30px) scale(0.7)' }
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
                    'melonpult': 'assets/images/Plants/MelonPult/MelonPult.png?v=1788959180',
                    'wintermelon': 'assets/images/Plants/WinterMelon/WinterMelon.png?v=1788959180',
                    'cattail': 'assets/images/Plants/Cattail/Cattail.gif',
                    'gloomshroom': 'assets/images/Plants/GloomShroom/GloomShroom.gif',
                    'spikerock': 'assets/images/Plants/Spikerock/Spikerock.gif',
                    'threepeater': 'assets/images/Plants/Threepeater/Threepeater.gif',
                    'splitpea': 'assets/images/Plants/SplitPea/SplitPea.gif',
                    'garlic': 'assets/images/Plants/Garlic/Garlic.gif',
                    'starfruit': 'assets/images/Plants/Starfruit/Starfruit.gif',
                    'hypnoshroom': 'assets/images/Plants/HypnoShroom/HypnoShroom.gif',
                    'pumpkinhead': 'assets/images/Plants/PumpkinHead/PumpkinHead.gif'
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
                    <div style="position: relative; width: 72px; height: 74px; display: flex; justify-content: center; align-items: center;">
                        ${r.base ? 
                          `<div style="position: relative; transform-origin: center center;">
                              <img src="${r.base}" style="display: block; max-width: 72px; max-height: 74px; object-fit: contain;">
                              <img src="${r.over}" style="position: absolute; left: 0; top: 0; transform: ${r.overTransform}; transform-origin: center center; max-width: 72px; max-height: 74px; object-fit: contain; ${r.overClip ? `clip-path: ${r.overClip}; -webkit-clip-path: ${r.overClip};` : ''}">
                           </div>` 
                          : `<img src="${r.img}" style="max-width: 72px; max-height: 74px; filter: ${r.filter || 'none'}; object-fit: contain;">`
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

    tryGloveInteraction(row, col) {
        if (!this.isGloveActive) return false;
        
        const plant = this.board.grid[row][col];
        if (!plant) {
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
            
            // 手套融合（普通）：任何两株植物（含炸弹类）都可直接合成。
            // 注：炸弹种下会自动爆炸并在爆炸时融合周围 3×3，因此炸弹主要靠"种下"触发融合。
            // Try to fuse
            let fusionType = null;
            try { fusionType = this.getFusionResult(this.gloveSource.type, plant.type); } catch(e) { console.error(e); }
            if (fusionType) {
                if (fusionType === 'fusion_pumpkinhead') {
                    // 南瓜壳：PVZ 原版"套壳"玩法——材料植物被消耗，宿主植物保留并套上外壳
                    this.applyPumpkinShell(this.gloveSource, plant);
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
                            this.showAnnouncement(`融合成功：${this.getPlantName(fusionType)}!`, '#ff00ff');
                        }
                    } catch(e) { console.error(e); }
                }
            } else if (this.gloveSource.type === 'wallnut' || this.gloveSource.type === 'tallnut') {
                // 墙果材料（坚果墙/高坚果）拖到任意植物上 = 给那株植物套上南瓜壳
                // （PVZ 原版：南瓜壳可保护任何常驻植物；材料被消耗、宿主保留）
                this.applyPumpkinShell(this.gloveSource, plant);
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
            this.showAnnouncement('这株植物已经套有南瓜壳了', '#ff0000');
            return;
        }
        if (oneShot.includes(host.type)) {
            restoreMaterial();
            this.showAnnouncement('这种植物套不了南瓜壳', '#ff0000');
            return;
        }
        restoreMaterial(); // Reset display before dying to ensure cleanup
        material.hp = 0; // 消耗材料植物（坚果墙/高坚果之一）
        this.board.grid[material.row][material.col] = null;
        try {
            if (host.attachShield()) {
                if (this.audioManager) this.audioManager.play('btn');
                this.showAnnouncement(`融合成功：南瓜壳已套在${this.getPlantName(host.type)}上！(+4000耐久)`, '#ff00ff');
            }
        } catch(e) { console.error(e); }
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
            fusion_pumpkinhead: '南瓜壳', fusion_chomper_wallnut: '大嘴坚果'
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
        if (set.has('chomper') && set.has('tallnut')) return 'melonpult';
        
        // ===== v3.2.38 新增低成本配方 =====
        if (set.has('splitpea') && set.has('sunflower')) return 'fusion_starfruit';   // 杨桃：裂荚射手+向日葵
        if (set.has('puffshroom') && set.has('garlic')) return 'fusion_hypnoshroom'; // 魅惑菇：小喷菇+大蒜
        if (set.has('wallnut') && set.has('tallnut')) return 'fusion_pumpkinhead';    // 南瓜壳：坚果墙+高坚果（手套特殊流程=套壳）
        if (set.has('chomper') && set.has('wallnut')) return 'fusion_chomper_wallnut'; // 大嘴坚果：大嘴花+坚果墙（修复"图鉴有、规则无"）
        return null;
    }
    
    tryPlanting(type, row, col) {
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
        
        // ===== 南瓜壳（PVZ 原版玩法）：只能套在已有的常驻植物上 =====
        // 与融合模式"手套套壳"同一套机制：宿主保留、南瓜壳 +4000 耐久挡在前面，
        // 僵尸必须先啃穿外壳才会伤到里面的植物；空地不能单独种南瓜壳。
        if (type === 'pumpkinhead') {
            if (!existingPlant || existingPlant.isDead) {
                this.showAnnouncement('南瓜壳要套在已有的植物上：先种一株植物，再把南瓜壳种到它上面', '#ffaa00');
                return;
            }
            if (existingPlant.shield || existingPlant.shieldEl) {
                this.showAnnouncement('这株植物已经套有南瓜壳了', '#ffaa00');
                return;
            }
            const oneShot = ['cherrybomb', 'jalapeno', 'potatomine', 'squash', 'doomshroom', 'iceshroom', 'crater'];
            if (oneShot.includes(existingPlant.type)) {
                this.showAnnouncement('这种植物套不了南瓜壳', '#ffaa00');
                return;
            }
            if (existingPlant.attachShield()) {
                this.sunCount -= seed.cost;
                this.sunCountElement.innerText = this.sunCount;
                this.cooldowns[type] = seed.cooldown;
                this.updateUI();
                this.audioManager.play('plant');
                this.showAnnouncement(`南瓜壳已套在${this.getPlantName(existingPlant.type)}上！(+4000耐久)`, '#ffe45c');
            }
            return;
        }

        // Bomb planting on an existing plant (融合进化模式)：
        // 不再瞬间静默替换 —— 把炸弹放到目标植物 3×3 内最近的空格，
        // 让它先执行原版爆炸功能(炸僵尸)，再以自己为中心融合 3×3(含目标植物)。
        const isBomb = ['cherrybomb', 'doomshroom', 'iceshroom', 'jalapeno'].includes(type);
        if (existingPlant && isBomb && this.fusionMode) {
            const fusionType = this.getFusionResult(type, existingPlant.type);
            if (!fusionType) {
                this.showAnnouncement('该植物没有与这颗炸弹的融合配方，可种在它旁边的空格上', '#ff0000');
                return; // 不消耗阳光
            }
            // 在目标植物周围 3×3 内找最近的空格作为炸弹落点
            let dest = null;
            for (let dr = -1; dr <= 1 && !dest; dr++) {
                for (let dc = -1; dc <= 1 && !dest; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const rr = row + dr, cc = col + dc;
                    if (rr >= 0 && rr < this.board.rows && cc >= 0 && cc < this.board.cols && this.board.canPlant(rr, cc)) {
                        dest = { row: rr, col: cc };
                    }
                }
            }
            if (!dest) {
                // 目标周围 3×3 全部被占满(极少见)：退回同格立即融合
                this.sunCount -= seed.cost;
                this.sunCountElement.innerText = this.sunCount;
                this.cooldowns[type] = seed.cooldown;
                this.updateUI();
                this.audioManager.play('btn');
                existingPlant.hp = 0;
                this.board.grid[row][col] = null;
                let plant = new Plant(this, fusionType);
                if (this.board.addPlant(plant, row, col)) {
                    this.showAnnouncement(`爆炸融合成功：${this.getPlantName(fusionType)}！`, '#ff00ff');
                }
                return;
            }
            // 落点在旁边空格 → 走标准种植：炸弹自动引爆 → 先炸后融 3×3
            this.sunCount -= seed.cost;
            this.sunCountElement.innerText = this.sunCount;
            this.cooldowns[type] = seed.cooldown;
            this.updateUI();
            let plant = new Plant(this, type);
            if (this.board.addPlant(plant, dest.row, dest.col)) {
                this.audioManager.play('plant');
                this.showAnnouncement(`炸弹已放到${this.getPlantName(existingPlant.type)}旁：将自动引爆并融合周围 3×3`, '#ffaa00');
            }
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
        
        // Add ZombiesWon.png overlay
        const wonImg = document.createElement('img');
        wonImg.src = 'assets/images/interface/ZombiesWon.png';
        wonImg.style.position = 'absolute';
        wonImg.style.top = '50%';
        wonImg.style.left = '50%';
        wonImg.style.transform = 'translate(-50%, -50%)';
        wonImg.style.zIndex = '1000';
        document.getElementById('game-container').appendChild(wonImg);
        
        // Add Score overlay
        const scoreDiv = document.createElement('div');
        scoreDiv.innerText = `Final Score: ${this.score}`;
        scoreDiv.style.position = 'absolute';
        scoreDiv.style.top = '70%';
        scoreDiv.style.left = '50%';
        scoreDiv.style.transform = 'translate(-50%, -50%)';
        scoreDiv.style.color = 'white';
        scoreDiv.style.fontSize = '40px';
        scoreDiv.style.fontWeight = 'bold';
        scoreDiv.style.textShadow = '2px 2px 4px black';
        scoreDiv.style.zIndex = '1001';
        document.getElementById('game-container').appendChild(scoreDiv);
        
        // Add Replay Button
        const replayBtn = document.createElement('button');
        replayBtn.innerText = 'Death Replay';
        replayBtn.style.position = 'absolute';
        replayBtn.style.top = '80%';
        replayBtn.style.left = '40%';
        replayBtn.style.transform = 'translate(-50%, -50%)';
        replayBtn.style.fontSize = '24px';
        replayBtn.style.padding = '10px 20px';
        replayBtn.style.zIndex = '1002';
        replayBtn.style.cursor = 'pointer';
        
        // Add Restart Button
        const restartBtn = document.createElement('button');
        restartBtn.innerText = 'Restart';
        restartBtn.style.position = 'absolute';
        restartBtn.style.top = '80%';
        restartBtn.style.left = '60%';
        restartBtn.style.transform = 'translate(-50%, -50%)';
        restartBtn.style.fontSize = '24px';
        restartBtn.style.padding = '10px 20px';
        restartBtn.style.zIndex = '1002';
        restartBtn.style.cursor = 'pointer';

        replayBtn.onclick = () => {
            wonImg.style.display = 'none';
            scoreDiv.style.display = 'none';
            replayBtn.style.display = 'none';
            restartBtn.style.display = 'none';
            this.playReplay();
        };
        restartBtn.onclick = () => {
            location.reload();
        };
        
        document.getElementById('game-container').appendChild(replayBtn);
        document.getElementById('game-container').appendChild(restartBtn);
    }
    
    playReplay() {
        if (!this.history || this.history.length === 0) return;
        
        this.showAnnouncement('DEATH REPLAY', 'red');
        
        // Clear all live entities
        this.entities.forEach(e => {
            if (e.element && e.element.parentNode) {
                e.element.parentNode.removeChild(e.element);
            }
        });
        
        let frameIndex = 0;
        const replayLoop = () => {
            if (frameIndex >= this.history.length) {
                setTimeout(() => {
                    this.showAnnouncement('END OF REPLAY', 'white');
                }, 500);
                return;
            }
            
            const frame = this.history[frameIndex];
            this.entityLayer.innerHTML = '';
            
            frame.forEach(state => {
                const img = document.createElement('img');
                img.className = 'entity';
                img.src = state.src;
                img.style.left = state.left;
                img.style.top = state.top;
                img.style.zIndex = state.zIndex;
                img.style.filter = state.filter;
                img.style.pointerEvents = 'none';
                img.style.position = 'absolute';
                this.entityLayer.appendChild(img);
            });
            
            frameIndex++;
            requestAnimationFrame(replayLoop);
        };
        
        requestAnimationFrame(replayLoop);
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
        
        // Sky sun generation（砸罐子模式关闭天降阳光：阳光只能靠植物罐砸出，用于买路灯花）
        if (!this.vaseMode) {
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
                if (e.element && e.element.parentNode) {
                    e.element.parentNode.removeChild(e.element);
                }
                return false;
            }
            return true;
        });
        
        // Z-Sorting using element zIndex
        this.entities.forEach(e => {
            if (e.element) {
                let z = Math.floor(e.y);
                if (e instanceof Projectile) z += 1000; // Projectiles always on top of row
                if (e instanceof Sun) z += 2000; // Suns always on top of EVERYTHING
                e.element.style.zIndex = z;
            }
        });

        // Record history for replay
        if (!this.history) this.history = [];
        this.history.push(this.entities.map(e => ({
            src: e.element.src,
            left: e.element.style.left,
            top: e.element.style.top,
            zIndex: e.element.style.zIndex,
            filter: e.element.style.filter
        })));
        if (this.history.length > 180) { // Keep last 3 seconds at ~60fps
            this.history.shift();
        }
        // 砸罐子：每帧检查胜利条件（罐子全砸完 + 场上僵尸消失）——
        // 这样即使最后一波僵尸是被植物打死而非砸罐砸出来的，胜利画面也会出现
        if (this.vaseMode) this.checkVaseVictory();
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
        if (this.fusionMode || this.vaseMode) return; // 融合进化 / 砸罐子模式 不触发全局随机事件
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

        this.vases = [];
        this.vasesTotal = total;
        this.vasesSmashed = 0;
        this.score = 0;
        this.updateScore();

        chosen.forEach((pos, i) => {
            const vType = types[i];
            // 预掷罐内内容（概率全部取自当前难度配置）:
            //   植物罐: pCard 概率出植物卡 / 其余出阳光罐(50 阳光, 供买路灯花)
            //   问号罐: qZombie 概率出僵尸 / 其余出植物卡
            //   僵尸罐: 必出僵尸
            //   任何罐子都不再出 plantern —— 路灯花只能从商店购买
            const content = (vType === 'zombie')
                ? { kind: 'zombie', type: this._rollVaseZombieType() }
                : (vType === 'plant')
                    ? (Math.random() < cfg.pCard)
                        ? { kind: 'plant', type: this._rollVasePlantContent(vType) }
                        : { kind: 'sun', value: 50 }
                    : (Math.random() < cfg.qZombie)
                        ? { kind: 'zombie', type: this._rollVaseZombieType() }
                        : { kind: 'plant', type: this._rollVasePlantContent(vType) };

            const v = { row: pos[0], col: pos[1], type: vType, content, smashed: false, revealed: false, element: null, contentEl: null };
            const sprite = vType === 'plant' ? 'Vase_Plant.png'
                          : vType === 'zombie' ? 'Vase_Zombie.png'
                          : 'Vase_Question.png';
            const img = document.createElement('img');
            img.src = 'assets/images/Vase/' + sprite + '?v=1788959180'; // v= 占位,bump_version 替换为新 cache-buster
            img.className = 'entity vase-entity';
            img.style.pointerEvents = 'none';
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
            const qVases = this.vases.filter(v => v.type === 'question');
            if (qVases.length >= 2 && qVases.every(v => v.content && v.content.kind === 'zombie')) {
                qVases[0].content = { kind: 'plant', type: this._rollVasePlantContent('question') };
            }
        }

        // v3.5.1 每局保底(最后执行, 覆盖问号罐保底新塞入的植物): 无论随机如何,
        // 本局所有植物内容中「一次性炸弹」占比强制 ≤ 40% (永久植物 ≥ 60%)。
        // 分层抽取只能保证长期期望, 保底杜绝单局极端 ——
        // 玩家不会遇到"整局砸出来的全是樱桃炸弹/窝瓜, 没火力防不住"的情况。
        {
            const plantContents = this.vases.filter(v => v.content && v.content.kind === 'plant');
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

        const warn = cfg.key === 'hell'
            ? '僵尸血厚 +35%，祝你好运！'
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
            'gatlingpea',                                         // 机枪(惊喜)
            'melonpult',                                          // 西瓜(惊喜)
            'wintermelon',                                        // 冰西瓜(惊喜)
            'cattail'                                             // 猫尾草(惊喜)
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
    _rollVasePlantContent(vaseType) {
        const cfg = this._vaseDiffCfg();
        // 植物罐(绿)是玩家主要植物来源, 偏永久; 问号罐赌性略高但永久仍占多数
        const permRatio = vaseType === 'plant'
            ? (cfg.plantPerm ?? 0.85)
            : (cfg.qPerm ?? 0.65);
        const pool = Math.random() < permRatio ? this._vasePermPool() : this._vaseOncePool();
        return pool[Math.floor(Math.random() * pool.length)];
    }

    // 砸罐子僵尸池: 轻中为主
    _rollVaseZombieType() {
        const pool = [
            'normal','normal','normal','normal',
            'conehead','conehead',
            'buckethead',
            'flag',
            'polevaulting',
            'newspaper'
        ];
        return pool[Math.floor(Math.random() * pool.length)];
    }

    smashVase(row, col) {
        if (this.state !== 'PLAYING') return;
        const v = this.vases.find(x => !x.smashed && x.row === row && x.col === col);
        if (!v) return;
        v.smashed = true;
        this.vasesSmashed++;
        // 罐子破碎音效（原版 PvZ 陶瓷破碎声，与破碎动画同步响起）
        this.audioManager.play('vasebreak');
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
            const prefix = v.type === 'plant' ? '植物罐' : (v.type === 'zombie' ? '僵尸罐' : '问号罐');
            this.showAnnouncement(`${prefix}：+${s.value} 阳光！攒够 75 可在种子栏购买路灯花`, '#ffd54a');
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
            sunshroom: 'SunShroom', scaredyshroom: 'ScaredyShroom', twinSunflower: 'TwinSunflower'
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
        const bank = document.getElementById('seed-bank');
        if (bank) bank.appendChild(el);

        this.vaseFreeCards.push({ type, element: el, consumed: false });
        this.updateUI();
        this.audioManager.play('plant');
        this.score += 20;
        this.updateScore();
        const prefix = vaseType === 'plant' ? '植物罐' : (vaseType === 'zombie' ? '僵尸罐' : '问号罐');
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
        // 地狱难度: 血量 ×1.35（简单/困难为 1.0 不生效）
        const hpMul = this._vaseDiffCfg().hpMul;
        if (hpMul > 1) {
            z.hp = Math.round(z.hp * hpMul);
            z.maxHp = z.hp;
        }
        this.entities.push(z);
        this.score = Math.max(0, this.score - 5);
        this.updateScore();
        const zhName = { normal:'普通僵尸', conehead:'路障僵尸', buckethead:'铁桶僵尸', flag:'旗手僵尸', polevaulting:'撑杆僵尸', newspaper:'读报僵尸', screendoor:'铁门僵尸' }[type] || type;
        const prefix = vase.type === 'plant' ? '植物罐' : (vase.type === 'zombie' ? '僵尸罐' : '问号罐');
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
            screendoor:'ScreenDoorZombie/HeadWalk1.gif' // 地狱难度专用
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
                    // 种子卡素材是 100×120 上下双段：上 60px 彩色卡面 + 下 60px 灰度种子图标。
                    // 种子栏卡片用 background-size:100% 200% + position:top 只露出上半段彩色；
                    // 若把整图当 <img> 直出会连带露出下半截灰度（玩家反馈"上面彩色下面黑白"）。
                    // 罐内预览走同样的背景裁切，只显示彩色卡面。
                    const art = this.plantCardArt(v.content.type);
                    inner = document.createElement('div');
                    inner.className = 'entity vase-reveal vase-reveal-card';
                    inner.style.pointerEvents = 'none';
                    if (art) inner.style.backgroundImage = `url('assets/images/Card/Plants/${art}.png?v=${stamp}')`;
                    inner.style.width = '58px';
                    inner.style.height = '35px';
                } else {
                    inner = document.createElement('img');
                    inner.className = 'entity vase-reveal';
                    inner.style.pointerEvents = 'none';
                    if (v.content.kind === 'zombie') {
                        inner.src = `assets/images/Zombies/${zombieIcon[v.content.type] || 'Zombie/Zombie.gif'}?v=${stamp}`;
                        inner.style.width = '56px';
                        inner.style.height = 'auto';
                        inner.style.maxHeight = '64px';
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
        // 1) 移除胜利画面
        if (this._vaseWinEls) {
            this._vaseWinEls.forEach(el => { if (el.parentNode) el.parentNode.removeChild(el); });
            this._vaseWinEls = null;
        }
        // 2) 移除所有罐子与其罐内揭示内容
        (this.vases || []).forEach(v => {
            if (v.element && v.element.parentNode) v.element.parentNode.removeChild(v.element);
            if (v.contentEl && v.contentEl.parentNode) v.contentEl.parentNode.removeChild(v.contentEl);
        });
        this.vases = [];
        this.vasesTotal = 0;
        this.vasesSmashed = 0;
        // 3) 清掉场上所有实体(植物/僵尸/阳光/子弹)的 DOM 与数组, 重置棋盘
        this.entities.forEach(e => {
            if (e.element && e.element.parentNode) e.element.parentNode.removeChild(e.element);
        });
        this.entities = [];
        for (let r = 0; r < this.board.rows; r++) {
            for (let c = 0; c < this.board.cols; c++) this.board.grid[r][c] = null;
        }
        this.history = [];
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
