// ===== 守屋大作战（大地图模式）House Guard =====
// v3.92.0 浇水开关化：空格按一下开启持续浇水（头顶 🚿 标志，不用按住），再按一下停止；
//   浇水间隔 1s → 0.2s（用户选定），+1 ☀/次、催熟同步提速 5 倍；飘字节流到约 1 秒一飘防刷屏。
// v3.91.0 改名「守屋大作战」（原猛鬼宿舍）+ 植物只能种在房间里面。
// v3.90.0 货币与啃咬修正：
//   向日葵链（阳光菇→大阳光菇→向日葵→双子）与坚果链（坚果→…→南瓜壳）升级改耗普通阳光 ☀（25/75/200、40/100/160/260/400）；
//   孢子 🦠 只管蘑菇特殊植物（地刺/眩晕菇/毁灭菇）与豌豆射手分支——用户澄清：门和向日葵用的都是普通阳光
//   阳光菇只在玩家 300px 内才产阳光（原先全场每间房的床铺菇同时产出 ≈2.5 ☀/秒，远超浇水 1 秒 1 阳光）
//   僵尸啃咬改离散慢咬：站定每 2.4s 一口、每口 15+12×(等级-1) 伤害（开局非常慢，升级既涨血量也涨实际战力）
// v3.89.0 阳光经济重构版：删除包子系统、开局 0 阳光、浇水 1 秒 1 次防手速、喂大 40/80/160、
//   升级收益预览、门板血量按图鉴 30% 折算随升级成长、坚果链逐级变大。
// 保留：单僵尸六级成长（普通→路障→铁桶→橄榄球→铁门→冰车）、跟踪弹、河道木桥、棋盘草地、小地图、音效、胜负结算。
class HauntedDorm {
    // ===== 植物图鉴（配方唯一，绝不撞衫）=====
    static get DEFS() {
        return {
            // —— 阳光系 (10级) ——
            sunshroom:     { name: '阳光菇',     img: 'Plants/SunShroom/0.gif',     card: 'SunShroom.png',     hp: 300,  cost: 10,   scale: 0.75,
                             produce: { sun: 10, every: 0.5 },  up: { cost: 30, cur: 'sun', to: 'sunshroom2' } },
            sunshroom2:    { name: '大阳光菇',   img: 'Plants/SunShroom/0.gif',     hp: 350,  cost: 0,   scale: 1.1,
                             produce: { sun: 30, every: 0.5 },  up: { cost: 90, cur: 'sun', to: 'sunflower' } },
            sunflower:     { name: '向日葵',     img: 'Plants/SunFlower/0.gif',     hp: 400,  cost: 0,   scale: 1.1,
                             produce: { sun: 90, every: 0.5 },  up: { cost: 270, cur: 'sun', to: 'twinsunflower' } },
            twinsunflower: { name: '双子向日葵', img: 'Plants/TwinSunflower/0.gif', hp: 450,  cost: 0,   scale: 1.2,
                             produce: { sun: 270, every: 0.5 }, up: { cost: 810, sporeCost: 1, cur: 'sun', to: 'sunpea' } },
            sunpea:        { name: '豌豆向日葵', img: 'Plants/TwinSunflower/0.gif', hp: 550, cost: 0, scale: 1.2,
                             overlay: 'Plants/Peashooter/0.gif',
                             produce: { sun: 810, every: 0.5 }, shoot: { dmg: 20, cd: 1.5, n: 1, range: 320, img: 'Plants/PB00.gif' }, 
                             up: { cost: 2430, sporeCost: 10, cur: 'sun', to: 'sunnut' } },
            sunnut:        { name: '坚果向日葵', img: 'Plants/WallNut/0.gif', hp: 2000, cost: 0, scale: 1.2, 
                             overlay: 'Plants/TwinSunflower/0.gif',
                             produce: { sun: 2430, every: 0.5 }, shoot: { dmg: 20, cd: 1.5, n: 1, range: 320, img: 'Plants/PB00.gif' }, 
                             up: { cost: 7290, sporeCost: 50, cur: 'sun', to: 'suncherry' } },
            suncherry:     { name: '樱桃向日葵', img: 'Plants/TwinSunflower/0.gif', hp: 3000, cost: 0, scale: 1.3,
                             overlay: 'Plants/CherryBomb/0.gif',
                             produce: { sun: 7290, every: 0.5 }, shoot: { dmg: 40, cd: 1.0, n: 3, range: 400, img: 'Plants/PB00.gif', back: true },
                             up: { cost: 21870, sporeCost: 250, cur: 'sun', to: 'sunjala' } },
            sunjala:       { name: '火爆向日葵', img: 'Plants/TwinSunflower/0.gif', hp: 5000, cost: 0, scale: 1.4,
                             overlay: 'Plants/Jalapeno/0.gif',
                             produce: { sun: 21870, every: 0.5 }, shoot: { dmg: 50, cd: 0.8, n: 4, range: 500, img: 'Plants/PB00.gif', homing: true },
                             up: { cost: 65610, sporeCost: 1000, cur: 'sun', to: 'sundoom' } },
            sundoom:       { name: '毁灭向日葵', img: 'Plants/TwinSunflower/0.gif', hp: 8000, cost: 0, scale: 1.5, tint: 'hue-rotate(240deg)',
                             overlay: 'Plants/DoomShroom/0.gif',
                             produce: { sun: 65610, every: 0.5 }, shoot: { dmg: 70, cd: 0.6, n: 6, range: 600, img: 'Plants/PB00.gif', homing: true, aoe: 50 },
                             up: { cost: 196830, sporeCost: 5000, cur: 'sun', to: 'sungatling' } },
            sungatling:    { name: '机枪向日葵', img: 'Plants/TwinSunflower/0.gif', hp: 15000, cost: 0, scale: 1.6,
                             overlay: 'Plants/GatlingPea/0.gif',
                             produce: { sun: 196830, every: 0.5 }, shoot: { dmg: 100, cd: 0.4, n: 8, range: 800, img: 'Plants/PB00.gif', homing: true } },

            // —— 蘑菇系 (10级，喂养大) ——
            puffshroom:    { name: '小喷菇', img: 'Plants/PuffShroom/0.gif',     card: 'PuffShroom.png',     hp: 300, cost: 200, scale: 0.9,
                             spore: { n: 1, every: 7 }, feed: { goal: 40, to: 'scaredyshroom' } },
            scaredyshroom: { name: '胆小菇', img: 'Plants/ScaredyShroom/0.gif',  card: 'ScaredyShroom.png',  hp: 400, cost: 0,   scale: 1.0,
                             spore: { n: 2, every: 7 }, feed: { goal: 80, to: 'fumeshroom' } },
            fumeshroom:    { name: '大喷菇', img: 'Plants/FumeShroom/0.gif',     card: 'FumeShroom.png',     hp: 500, cost: 0,   scale: 1.15,
                             spore: { n: 3, every: 7 }, shoot: { dmg: 25, cd: 1.6, n: 1, range: 240, img: 'Plants/ShroomBullet.gif' },
                             feed: { goal: 160, to: 'gloomshroom' } },
            gloomshroom:   { name: '忧郁菇', img: 'Plants/GloomShroom/0.gif',    card: 'GloomShroom.png',    hp: 600, cost: 0,   scale: 1.25,
                             spore: { n: 5, every: 6 }, shoot: { dmg: 30, cd: 1.4, n: 3, range: 210, img: 'Plants/ShroomBullet.gif', fan: 0.5 },
                             feed: { goal: 350, to: 'sunfumeshroom' } },
            sunfumeshroom: { name: '阳光大喷菇', img: 'Plants/GloomShroom/0.gif', hp: 800, cost: 0, scale: 1.3,
                             hat: 'Plants/TwinSunflower/0.gif',
                             spore: { n: 8, every: 5 }, shoot: { dmg: 40, cd: 1.2, n: 4, range: 250, img: 'Plants/ShroomBullet.gif', fan: 0.5 },
                             feed: { goal: 800, to: 'snowfumeshroom' } },
            snowfumeshroom:{ name: '寒冰大喷菇', img: 'Plants/GloomShroom/0.gif', hp: 1200, cost: 0, scale: 1.35, tint: 'hue-rotate(180deg)',
                             spore: { n: 12, every: 5 }, shoot: { dmg: 45, cd: 1.0, n: 4, range: 250, img: 'Plants/ShroomBullet.gif', fan: 0.5, slow: true },
                             feed: { goal: 1600, to: 'toxicshroom' } },
            toxicshroom:   { name: '猛毒喷菇', img: 'Plants/GloomShroom/0.gif', hp: 1800, cost: 0, scale: 1.4, tint: 'hue-rotate(270deg)',
                             spore: { n: 20, every: 4 }, shoot: { dmg: 80, cd: 0.8, n: 5, range: 280, img: 'Plants/ShroomBullet.gif', fan: 0.5 },
                             feed: { goal: 3000, to: 'doomgloomshroom' } },
            doomgloomshroom:{name: '毁灭忧郁菇', img: 'Plants/GloomShroom/0.gif', hp: 3000, cost: 0, scale: 1.5,
                             hat: 'Plants/DoomShroom/0.gif',
                             spore: { n: 35, every: 4 }, shoot: { dmg: 120, cd: 0.6, n: 6, range: 300, img: 'Plants/ShroomBullet.gif', fan: 0.5 },
                             feed: { goal: 6000, to: 'icegloomshroom' } },
            icegloomshroom:{ name: '冰霜毁灭菇', img: 'Plants/GloomShroom/0.gif', hp: 5000, cost: 0, scale: 1.6,
                             hat: 'Plants/IceShroom/0.gif',
                             spore: { n: 60, every: 3 }, shoot: { dmg: 150, cd: 0.5, n: 8, range: 350, img: 'Plants/ShroomBullet.gif', fan: 0.5, slow: true },
                             feed: { goal: 12000, to: 'ultimategloom' } },
            ultimategloom: { name: '终极魅惑菇', img: 'Plants/GloomShroom/0.gif', hp: 12000, cost: 0, scale: 2.0, tint: 'brightness(1.5)',
                             hat: 'Plants/HypnoShroom/0.gif',
                             spore: { n: 120, every: 2 }, shoot: { dmg: 300, cd: 0.3, n: 12, range: 400, img: 'Plants/ShroomBullet.gif', fan: 0.5, homing: true } },

            // —— 豌豆系 (10级，纯输出，阳光升级) ——
            peashooter:    { name: '豌豆射手', img: 'Plants/Peashooter/0.gif',   card: 'Peashooter.png',  hp: 300, cost: 100,
                             shoot: { dmg: 20, cd: 1.5, n: 1, range: 320, img: 'Plants/PB00.gif' }, up: { cost: 20, to: 'repeater' } },
            repeater:      { name: '双发射手', img: 'Plants/Repeater/0.gif',     card: 'Repeater.png',    hp: 350, cost: 0,
                             shoot: { dmg: 20, cd: 1.5, n: 2, range: 320, img: 'Plants/PB00.gif' }, up: { cost: 60, to: 'threepeater' } },
            threepeater:   { name: '三线射手', img: 'Plants/Threepeater/0.gif',  card: 'Threepeater.png', hp: 450, cost: 0,   scale: 1.15,
                             shoot: { dmg: 20, cd: 1.5, n: 3, range: 320, img: 'Plants/PB00.gif', fan: 0.35 }, up: { cost: 100, to: 'splitpea' } },
            splitpea:      { name: '双向射手', img: 'Plants/SplitPea/0.gif',     card: 'SplitPea.png',    hp: 550, cost: 0,
                             shoot: { dmg: 25, cd: 1.3, n: 4, range: 320, img: 'Plants/PB00.gif', back: true }, up: { cost: 150, to: 'gatlingpea' } },
            gatlingpea:    { name: '机枪射手', img: 'Plants/GatlingPea/0.gif',   card: 'GatlingPea.png',  hp: 700, cost: 0,   scale: 1.15,
                             shoot: { dmg: 25, cd: 1.0, n: 4, range: 340, img: 'Plants/PB00.gif' }, up: { cost: 250, to: 'snowpea' } },
            snowpea:       { name: '寒冰射手', img: 'Plants/SnowPea/0.gif',      card: 'SnowPea.png',     hp: 1000, cost: 0,
                             shoot: { dmg: 35, cd: 1.2, n: 4, range: 350, img: 'Plants/PB01.gif', slow: true }, up: { cost: 400, to: 'firepea' } },
            firepea:       { name: '火焰豌豆', img: 'Plants/Peashooter/0.gif',   hp: 1500, cost: 0, scale: 1.2, hat: 'Plants/Torchwood/0.gif',
                             shoot: { dmg: 80, cd: 1.2, n: 4, range: 380, img: 'Plants/PB10.gif', aoe: 50 }, up: { cost: 800, to: 'firerepeater' } },
            firerepeater:  { name: '火焰双发', img: 'Plants/Repeater/0.gif',     hp: 2200, cost: 0, scale: 1.3, hat: 'Plants/Torchwood/0.gif',
                             shoot: { dmg: 80, cd: 1.0, n: 6, range: 400, img: 'Plants/PB10.gif', aoe: 50 }, up: { cost: 1500, to: 'firethreepeater' } },
            firethreepeater:{name: '火焰三线', img: 'Plants/Threepeater/0.gif',  hp: 3500, cost: 0, scale: 1.4, hat: 'Plants/Torchwood/0.gif',
                             shoot: { dmg: 80, cd: 0.8, n: 9, range: 420, img: 'Plants/PB10.gif', aoe: 50, fan: 0.35 }, up: { cost: 3000, to: 'snowthreepeater' } },
            snowthreepeater:{name: '寒冰三线', img: 'Plants/Threepeater/0.gif',  hp: 6000, cost: 0, scale: 1.5, hat: 'Plants/IceShroom/0.gif',
                             shoot: { dmg: 150, cd: 0.6, n: 12, range: 450, img: 'Plants/PB01.gif', slow: true, fan: 0.35, homing: true } },

            // —— 坚果系 (10级，肉盾) ——
            wallnut:       { name: '坚果',       img: 'Plants/WallNut/0.gif',       card: 'WallNut.png',     hp: 4000,  cost: 50,
                             up: { cost: 40, cur: 'sun', to: 'nutshooter' } },
            nutshooter:    { name: '豌豆坚果',   img: 'Plants/WallNut/0.gif',       card: 'WallNut.png',  hp: 5000,  cost: 0, scale: 1.05,
                             overlay: 'Plants/Peashooter/0.gif',
                             shoot: { dmg: 20, cd: 1.6, n: 1, range: 320, img: 'Plants/PB00.gif', homing: true }, up: { cost: 100, cur: 'sun', to: 'nutgunner' } },
            nutgunner:     { name: '射手坚果',   img: 'Plants/WallNut/0.gif',       hp: 6500,  cost: 0, scale: 1.1, tint: 'saturate(1.4) brightness(1.12)',
                             overlay: 'Plants/Repeater/0.gif',
                             shoot: { dmg: 20, cd: 1.3, n: 2, range: 320, img: 'Plants/PB00.gif', homing: true }, up: { cost: 160, cur: 'sun', to: 'cabbagenut' } },
            cabbagenut:    { name: '卷心菜坚果', img: 'Plants/WallNut/0.gif',       hp: 8500,  cost: 0, scale: 1.15, hat: 'Plants/CabbagePult/Cabbage.png',
                             lob: { dmg: 45, cd: 2.2, range: 420, aoe: 70, img: 'Plants/CabbagePult/Cabbage.png' }, up: { cost: 260, cur: 'sun', to: 'melonnut' } },
            melonnut:      { name: '西瓜坚果',   img: 'Plants/WallNut/0.gif',       hp: 12000, cost: 0, scale: 1.2, hat: 'Plants/MelonPult/Melon.png',
                             lob: { dmg: 80, cd: 2.0, range: 450, aoe: 100, img: 'Plants/MelonPult/Melon.png' }, up: { cost: 450, cur: 'sun', to: 'wintermelonnut' } },
            wintermelonnut:{ name: '冰瓜坚果',   img: 'Plants/WallNut/0.gif',       hp: 18000, cost: 0, scale: 1.25, hat: 'Plants/WinterMelon/WinterMelon.png',
                             lob: { dmg: 100, cd: 1.8, range: 480, aoe: 120, img: 'Plants/WinterMelon/WinterMelon.png', slow: true }, up: { cost: 800, cur: 'sun', to: 'tallnut' } },
            tallnut:       { name: '高坚果',     img: 'Plants/TallNut/0.gif',       card: 'TallNut.png',     hp: 30000, cost: 0, scale: 1.3,
                             up: { cost: 0, sporeCost: 5, cur: 'sun', to: 'pumpkin' } },
            pumpkin:       { name: '南瓜高坚果', img: 'Plants/TallNut/0.gif',       hp: 50000, cost: 0, scale: 1.4, hat: 'Plants/PumpkinHead/0.gif',
                             up: { cost: 0, sporeCost: 25, cur: 'sun', to: 'doomtallnut' } },
            doomtallnut:   { name: '毁灭高坚果', img: 'Plants/TallNut/0.gif',       hp: 90000, cost: 0, scale: 1.5, hat: 'Plants/DoomShroom/0.gif', tint: 'hue-rotate(240deg)',
                             spike: { dps: 200, r: 80 }, up: { cost: 0, sporeCost: 125, cur: 'sun', to: 'holotallnut' } },
            holotallnut:   { name: '神界高坚果', img: 'Plants/TallNut/0.gif',       hp: 200000, cost: 0, scale: 1.7, tint: 'drop-shadow(0 0 20px #ff0) brightness(2)',
                             spike: { dps: 500, r: 100 } },

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
        return ['sunshroom', 'puffshroom', 'peashooter', 'potatomine', 'spikeweed', 'iceshroom', 'doomshroom'];
    }

    // ===== 僵尸升级链（10级）=====
    static get GHOST_LEVELS() {
        return [
            { name: '普通僵尸',   img: 'Zombies/Zombie/Zombie.gif',                    hp: 300,   speed: 85 },
            { name: '路障僵尸',   img: 'Zombies/ConeheadZombie/ConeheadZombie.gif',    hp: 800,   speed: 90 },
            { name: '铁门僵尸',   img: 'Zombies/ScreenDoorZombie/ScreenDoorZombie.gif', hp: 1600,  speed: 95 },
            { name: '铁桶僵尸',   img: 'Zombies/BucketheadZombie/BucketheadZombie.gif', hp: 2800,  speed: 95 },
            { name: '橄榄球僵尸', img: 'Zombies/FootballZombie/FootballZombie.gif',    hp: 4800,  speed: 135 },
            { name: '舞王僵尸',   img: 'Zombies/DancingZombie/0.gif',                  hp: 8000,  speed: 100 },
            { name: '冰车僵尸',   img: 'Zombies/Zomboni/1.gif',                        hp: 13000, speed: 80 },
            { name: '小丑僵尸',   img: 'Zombies/JackinTheBoxZombie/0.gif',             hp: 22000, speed: 110 },
            { name: '气球僵尸',   img: 'Zombies/BalloonZombie/0.gif',                  hp: 40000, speed: 120 },
            { name: '机甲僵王',   img: 'Zombies/LGBOSS/0.gif',                         hp: 100000, speed: 100 }
        ];
    }
    static get GHOST_MAX_LV() { return HauntedDorm.GHOST_LEVELS.length; }

    constructor() {
        this.cols = 60;
        this.rows = 45;
        this.gridSize = 80;
        this.worldWidth = this.cols * this.gridSize;
        this.worldHeight = this.rows * this.gridSize;

        const cx = this.worldWidth / 2;
        const cy = this.worldHeight / 2;

        const urlParams = new URLSearchParams(window.location.search);
        this.role = urlParams.get('role') || 'peashooter'; // Default to peashooter if missing
        
        this.playerRoles = [
            { id: 'sunflower', name: '向日葵', icon: 'assets/images/Plants/SunFlower/0.gif', skillDesc: '【M键】10秒内阳光产出翻倍' },
            { id: 'peashooter', name: '豌豆射手', icon: 'assets/images/Plants/Peashooter/0.gif', skillDesc: '【M键】15秒内全场植物攻击力翻倍', imgStyle: 'transform: scale(1.2)' },
            { id: 'wallnut', name: '坚果', icon: 'assets/images/Plants/WallNut/0.gif', skillDesc: '【M键】一局一次免费升级门' },
            { id: 'chomper', name: '大嘴花', icon: 'assets/images/Plants/Chomper/0.gif', skillDesc: '【M键】赶跑僵尸一次', imgStyle: 'transform: scale(1.2)' },
            { id: 'squash', name: '倭瓜', icon: 'assets/images/Plants/Squash/0.gif', skillDesc: '【M键】半血以上砸掉僵尸一半血', imgStyle: 'transform: scale(2.0)' }
        ];
        
        this.playerRoleDef = this.playerRoles.find(r => r.id === this.role) || this.playerRoles[1];

        this.player = {
            x: cx, y: cy, sun: 0, spore: 0, hp: 100, maxHp: 100,
            icon: this.playerRoleDef.icon,
            roleDef: this.playerRoleDef,
            camX: 0, camY: 0, skillUsed: false, sunBuffT: 0, atkBuffT: 0
        };

        this.keys = {};
        this.walls = new Set();
        this.plants = [];
        this.zombies = [];   // 永远最多 1 只（单僵尸体系）
        this.peas = [];
        this.ais = [];
        this.allPlayers = [this.player];
        this.suns = [];      // 僵尸掉落的阳光袋

        // ===== 单僵尸导演系统 =====
        this.ghostSpawned = false;
        this.ghostSpawnAt = performance.now() + 20000; // 开局 20s 出笼，修复准备中 bug
        this.ghostLevel = 1;              // 当前等级 1..10
        this.ghostRespawnAt = 0;          // >0 = 死亡等待重生
        this.kills = 0;
        this.over = false;
        this.lastFlashAt = 0;

        this.lastWaterTime = 0;
        this.waterOn = false;   // v3.92.0：开关式浇水状态
        this.menuOpen = false;
        this.menuCol = -1;
        this.menuRow = -1;

        this.initDOM();
        this.generateMap();
        this.bindInput();
        this._updateGhostChip();
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
        this.player.el1.innerHTML = `<img src="${this.player.icon}" style="${this.playerRoleDef.imgStyle || ''}">` + 
                                    `<div style="position:absolute; top:-35px; left:50%; transform:translateX(-50%); color:#00ff00; font-size:18px; font-weight:bold; text-shadow:1px 1px 2px black, -1px -1px 2px black; white-space:nowrap;">你 (${this.playerRoleDef.name})</div>`;
        this.player.el1.style.filter = `drop-shadow(0 0 10px #00ff00)`;
        // v3.92.0：浇水开启时头顶显示 🚿 标志（跟随玩家移动）
        const wb = document.createElement('div');
        wb.id = 'water-badge';
        wb.className = 'water-badge';
        wb.innerText = '🚿';
        wb.style.display = 'none';
        this.player.el1.appendChild(wb);
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

        // 升级/拆除弹窗
        this.popup = document.getElementById('plant-popup');
        this.ppTitle = document.getElementById('pp-title');
        this.ppFeed = document.getElementById('pp-feed');
        this.ppUp = document.getElementById('pp-upgrade');
        this.ppDemolish = document.getElementById('pp-demolish');
        this.popupPlant = null;
        this.ppDemolish.onclick = () => {
            const pl = this.popupPlant;
            this._closePopup();
            if (!pl) return;
            pl.el1.remove();
            if (pl.txtEl) pl.txtEl.remove();
            this.plants = this.plants.filter(p => p !== pl);
            this._flyText(pl.c * 80 + 40, pl.r * 80, `${pl.def.name} 已拆除`, '#ffb0b0');
            this.playSfx('chomp.mp3', 0.4);
        };
        this.ppUp.onclick = () => {
            const pl = this.popupPlant;
            if (!pl || !pl.def.up) { this._closePopup(); return; }
            const cost = pl.def.up.cost || 0;
            const sporeCost = pl.def.up.sporeCost || 0;
            const canAfford = this.player.sun >= cost && this.player.spore >= sporeCost;
            if (!canAfford) {
                let err = [];
                if (this.player.sun < cost) err.push(`☀${cost}`);
                if (this.player.spore < sporeCost) err.push(`🦠${sporeCost}`);
                this._flyText(pl.c * 80 + 40, pl.r * 80, `资源不足（需 ${err.join(' ')}）`, '#ff8a8a');
                this.playSfx('buttonclick.mp3', 0.35);
                return;
            }
            const to = pl.def.up.to;
            const nd = HauntedDorm.DEFS[to];
            const fac = pl.isDoor ? 0.3 : 1;
            this._closePopup();
            if (cost) this.addSun(-cost);
            if (sporeCost) this.addSpore(-sporeCost);
            this.playSfx('readysetplant.mp3', 0.5);
            this._flyText(pl.c * 80 + 40, pl.r * 80,
                `${pl.def.name} → ${nd.name}！（血量 ${Math.round(pl.def.hp * fac)}→${Math.round(nd.hp * fac)}）`, '#9dff6b');
            this._evolve(pl, to);
        };
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

        // 房间形状模板 (1=地面) - 尺寸翻倍
        const templates = [
            { // 8x8 矩形
                grid: [
                    [1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1],
                    [1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1]
                ],
                door: {r: 8, c: 4}, bed: {r: 2, c: 4}
            },
            { // L型 10x10
                grid: [
                    [1,1,1,1,0,0,0,0],[1,1,1,1,0,0,0,0],[1,1,1,1,0,0,0,0],[1,1,1,1,0,0,0,0],
                    [1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1]
                ],
                door: {r: 8, c: 2}, bed: {r: 2, c: 1}
            },
            { // 凹型 10x8
                grid: [
                    [1,1,1,0,0,1,1,1],[1,1,1,0,0,1,1,1],[1,1,1,0,0,1,1,1],
                    [1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1]
                ],
                door: {r: 6, c: 4}, bed: {r: 4, c: 4}
            },
            { // 长条型 6x12
                grid: [
                    [1,1,1,1],[1,1,1,1],[1,1,1,1],[1,1,1,1],[1,1,1,1],
                    [1,1,1,1],[1,1,1,1],[1,1,1,1],[1,1,1,1],[1,1,1,1]
                ],
                door: {r: 10, c: 2}, bed: {r: 2, c: 2}
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

                
                // 确保房间不会覆盖中心回血区（以中心点为圆心，半径约 4 格的区域必须空出）
                const centerLeft = this.cols/2 - 4;
                const centerRight = this.cols/2 + 4;
                const centerTop = this.rows/2 - 4;
                const centerBottom = this.rows/2 + 4;
                if (!(rx + rw < centerLeft || rx > centerRight || ry + rh < centerTop || ry > centerBottom)) {
                    continue;
                }


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

        // 渲染墙体（v3.88.0：墙=蓝色河道）
        for (const rm of this.rooms) {
            const isInside = (r, c) => r>=0 && r<rm.h && c>=0 && c<rm.w && rm.tpl.grid[r][c] === 1;
            for (let r = -1; r <= rm.h; r++) {
                for (let c = -1; c <= rm.w; c++) {
                    if (isInside(r, c)) continue;

                    if (isInside(r-1, c) || isInside(r+1, c) || isInside(r, c-1) || isInside(r, c+1) ||
                        isInside(r-1, c-1) || isInside(r-1, c+1) || isInside(r+1, c-1) || isInside(r+1, c+1)) {

                        // 生成门（木桥 + 坚果门板：玩家自由穿行，僵尸要啃门）
                        if (r === rm.tpl.door.r && c === rm.tpl.door.c) {
                            const bridge = document.createElement('div');
                            bridge.className = 'tile bridge';
                            bridge.style.left = ((rm.x + c) * this.gridSize) + 'px';
                            bridge.style.top = ((rm.y + r) * this.gridSize) + 'px';
                            this.world1.appendChild(bridge);
                            this.spawnPlant(rm.x + c, rm.y + r, 'wallnut', true);
                            rm.doorCol = rm.x + c;
                            rm.doorRow = rm.y + r;
                            continue;
                        }

                        const key = `${rm.x + c},${rm.y + r}`;
                        this.walls.add(key);
                    }
                }
            }


            // 生成床(阳光菇)
            this.spawnPlant(rm.x + rm.tpl.bed.c, rm.y + rm.tpl.bed.r, 'sunshroom');
        }

        // 第二遍遍历：根据相邻关系渲染墙面，只让外侧角圆润
        for (const key of this.walls) {
            const [cStr, rStr] = key.split(',');
            const c = parseInt(cStr);
            const r = parseInt(rStr);

            const hasTop = this.walls.has(`${c},${r-1}`);
            const hasBottom = this.walls.has(`${c},${r+1}`);
            const hasLeft = this.walls.has(`${c-1},${r}`);
            const hasRight = this.walls.has(`${c+1},${r}`);

            let tl = (!hasTop && !hasLeft) ? 24 : 0;
            let tr = (!hasTop && !hasRight) ? 24 : 0;
            let bl = (!hasBottom && !hasLeft) ? 24 : 0;
            let br = (!hasBottom && !hasRight) ? 24 : 0;

            const wall1 = document.createElement('div');
            wall1.className = 'tile wall';
            wall1.style.left = (c * this.gridSize) + 'px';
            wall1.style.top = (r * this.gridSize) + 'px';
            wall1.style.borderRadius = `${tl}px ${tr}px ${br}px ${bl}px`;
            
            // 为了消除子像素间隙，让它们轻微放大
            wall1.style.transform = 'scale(1.02)';
            
            this.world1.appendChild(wall1);
        }

        // v3.93.0 安排 5 个人机，所有人都出生在地图正中央，然后走向各自房间
        let shuffledRooms = [...this.rooms].sort(() => Math.random() - 0.5);
        // 分配给人机的皮肤（不包含玩家当前选的那个，保证 1+5 刚好凑齐 6 个但不全部重复）
        // 或者直接给5个人机分配 5 个标准皮肤
        for (let i = 0; i < 5; i++) {
            if (i >= shuffledRooms.length) break;
            const rm = shuffledRooms[i];
            const roleDef = this.playerRoles[i]; // 5个人机刚好一人分一个固定皮肤，涵盖全部5种
            const ai = {
                x: (this.worldWidth / 2) + (Math.random() * 40 - 20),
                y: (this.worldHeight / 2) + (Math.random() * 40 - 20),
                path: [
                    { x: rm.frontX, y: rm.frontY }, // 先走到门外引导点
                    { x: (rm.x + rm.tpl.bed.c) * this.gridSize + 40, y: (rm.y + rm.tpl.bed.r) * this.gridSize + 40 } // 再走进去
                ],
                sun: 50, spore: 0, hp: 100, maxHp: 100,
                isAi: true, room: rm, roleDef: roleDef,
                icon: roleDef.icon, dead: false,
                el1: document.createElement('div')
            };
            rm.owner = ai; // AI 预占领房间
            ai.el1.className = 'entity avatar';
            const colors = ['#ff7777', '#77ff77', '#7777ff', '#ffff77', '#ff77ff'];
            const color = colors[i % colors.length];
            ai.el1.innerHTML = `<img src="${ai.icon}" style="${ai.roleDef.imgStyle || ''}">` +
                               `<div style="position:absolute; top:-35px; left:50%; transform:translateX(-50%); color:${color}; font-size:18px; font-weight:bold; text-shadow:1px 1px 2px black, -1px -1px 2px black; white-space:nowrap;">人机 - ${ai.roleDef.name}</div>`;
            ai.el1.style.filter = `drop-shadow(0 0 10px ${color})`;
            this.world1.appendChild(ai.el1);
            this.ais.push(ai);
            this.allPlayers.push(ai);
        }

    }

    spawnPlant(col, row, type, isDoor = false) {
        if (this.plants.some(pl => pl.c === col && pl.r === row)) return;
        const rm = this._insideRoom(col, row);
        if (rm && !rm.owner && !this.player.room) {
            rm.owner = this.player;
            this.player.room = rm; // 玩家占领该房间
        }

        const defs = HauntedDorm.DEFS;
        const def = defs[type];
        if (!def) return;

        // 门板血量按图鉴血量的 30% 折算（v3.89.0：跟随升级成长——原先是固定 1200，升级坚果后门板血量不涨，
        // 玩家看不出升级收益；现在墙坚果门板 1200，豌豆坚果门板 1500……逐级变硬）
        const maxHp = isDoor ? Math.round(def.hp * 0.3) : def.hp;
        const pl = { r: row, c: col, type: type, def: def, hp: maxHp, maxHp: maxHp, isDoor: isDoor,
                     shootCd: 1.5, prodT: 0, sporeT: 0, fed: 0, freezeT: 0 };

        const el1 = document.createElement('div');
        el1.className = 'tile';
        el1.style.left = (col * this.gridSize) + 'px';
        el1.style.top = (row * this.gridSize) + 'px';

        let scale = def.scale || 1.0;
        if (isDoor) scale *= 0.85; // 门板缩小一号，门口通道视觉上更通透
        const tint = def.tint ? `filter:${def.tint};` : '';
        const doorOpacity = isDoor ? 'opacity:0.85;' : '';
        // blend：白底融合素材（Fusions 系列）用 multiply 吃掉白底，避免草地上出现白色方块
        const blend = def.blend ? 'mix-blend-mode:multiply;' : '';
        let inner = `<img src="assets/images/${def.img}" style="width:100%; height:100%; object-fit:contain; transform: scale(${1.2 * scale}) translateY(-10px); ${tint}${doorOpacity}${blend}">`;
        // v3.92.1：overlay——原版素材组装（主游戏融合同款）：第二张贴图居中叠放，上移缩小
        // 定位对齐主游戏 fusion_nutshooter（Plant.js: translate(2px,-28px) scale(0.6)，此处按 80px 格换算）
        if (def.overlay) {
            inner += `<img src="assets/images/${def.overlay}" style="position:absolute; left:50%; top:50%; width:100%; height:100%; object-fit:contain; pointer-events:none; transform: translate(-50%, -50%) translate(2px, -26px) scale(0.6);">`;
        }
        if (def.overlays) {
            def.overlays.forEach((ov, i) => {
                inner += `<img src="assets/images/${ov}" style="position:absolute; left:50%; top:50%; width:100%; height:100%; object-fit:contain; pointer-events:none; transform: translate(-50%, -50%) translate(${10 + i*15}px, ${-15 - i*10}px) scale(0.6);">`;
            });
        }
        if (def.hat) {
            inner += `<img src="assets/images/${def.hat}" style="position:absolute; left:50%; top:50%; width:100%; height:100%; object-fit:contain; pointer-events:none; transform: translate(-50%, -50%) translate(0, -45px) scale(0.5);">`;
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
        else if (def.up) txt = `点击升级 ${def.up.cur === 'sun' ? '☀' : '🦠'}${def.up.cost}`;
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

    // ===== 点击植物 → 弹出「升级 / 拆除」面板 =====
    plantClick(pl, clientX, clientY) {
        if (this.role === 'zombie') return;
        this._closePlantMenu();
        const def = pl.def;
        this.popupPlant = pl;
        this.ppTitle.innerText = def.name + (pl.isDoor ? '（门板）' : '');
        if (def.feed) {
            this.ppFeed.style.display = 'block';
            this.ppFeed.innerText = `浇水 ${Math.min(pl.fed, def.feed.goal)}/${def.feed.goal}（站旁边开浇水）`;
        } else if (def.up) {
            // v3.89.0：升级收益预览——血量/产阳光/弹数的具体提升，让升级看得见好处
            const nd = HauntedDorm.DEFS[def.up.to];
            const fac = pl.isDoor ? 0.3 : 1;
            const bits = [];
            if (nd.hp > def.hp) bits.push(`血量 ${Math.round(def.hp * fac)}→${Math.round(nd.hp * fac)}`);
            if (nd.produce) bits.push(`产阳光 ${nd.produce.sun}/每${nd.produce.every}秒`);
            if (nd.shoot && nd.shoot.homing && !(def.shoot && def.shoot.homing)) bits.push('子弹跟踪');
            if (nd.shoot && def.shoot && nd.shoot.n > def.shoot.n) bits.push(`${def.shoot.n}连发→${nd.shoot.n}连发`);
            if (nd.shoot && !def.shoot) bits.push('会喷射攻击');
            if (nd.lob) bits.push('投掷爆炸卷心菜');
            if (nd.shoot && nd.shoot.slow && !(def.shoot && def.shoot.slow)) bits.push('子弹减速');
            this.ppFeed.style.display = 'block';
            this.ppFeed.innerText = bits.length ? bits.join('，') : '全面强化';
        } else {
            this.ppFeed.style.display = 'none';
        }
        if (def.up) {
            let cstr = [];
            if (def.up.cost) cstr.push(`☀${def.up.cost}`);
            if (def.up.sporeCost) cstr.push(`🦠${def.up.sporeCost}`);
            this.ppUp.style.display = '';
            this.ppUp.innerText = `升级 ${cstr.join(' ')}`;
            const canAfford = (!def.up.cost || this.player.sun >= def.up.cost) && (!def.up.sporeCost || this.player.spore >= def.up.sporeCost);
            this.ppUp.classList.toggle('pp-disabled', !canAfford);
        } else {
            this.ppUp.style.display = 'none';
        }
        this.popup.style.display = 'block';
        const pw = this.popup.offsetWidth, ph = this.popup.offsetHeight;
        let x = clientX + 18, y = clientY - 24;
        if (x + pw > window.innerWidth - 8) x = window.innerWidth - pw - 8;
        if (y + ph > window.innerHeight - 8) y = window.innerHeight - ph - 8;
        this.popup.style.left = x + 'px';
        this.popup.style.top = y + 'px';
    }

    _closePopup() {
        this.popup.style.display = 'none';
        this.popupPlant = null;
    }

    _evolve(pl, to) {
        const col = pl.c, row = pl.r;
        const isDoor = pl.isDoor;
        pl.el1.remove();
        if (pl.txtEl) pl.txtEl.remove();
        this.plants = this.plants.filter(p => p !== pl);
        this.spawnPlant(col, row, to, isDoor);
    }

    // ===== 单僵尸：出场 / 升级 / 重生 导演 =====
    _levelUpGhostDirect() {
        if (this.ghostLevel >= HauntedDorm.GHOST_MAX_LV) return;
        this.ghostLevel++;
        const cfg = HauntedDorm.GHOST_LEVELS[this.ghostLevel - 1];
        const zb = this.zombies[0];
        if (zb && !zb.dead) {
            zb.level = this.ghostLevel;
            zb.hp = cfg.hp; zb.maxHp = cfg.hp; zb.speed = cfg.speed; zb.cfg = cfg;
            const im = zb.el1.querySelector('img');
            if (im) im.src = 'assets/images/' + cfg.img;
            if (zb.hpBg) zb.hpBg.style.display = 'none';
            const bdg = zb.el1.querySelector('.lv-badge');
            if (bdg) bdg.innerText = 'Lv.' + this.ghostLevel;
            this._announce(`👻 僵尸咬破门，升级为【${cfg.name}】！`, 'finalwave.mp3');
        } else {
            this._announce(`👻 僵尸成长为【${cfg.name}】…`, 'finalwave.mp3');
        }
        this._updateGhostChip();
    }

    _ghostSpawnPoint() {
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

    _announce(text, sfx) {
        const msg = document.createElement('div');
        msg.id = 'wave-announce';
        msg.style = "position:absolute; top:38%; left:50%; transform:translate(-50%,-50%); color:#ff4b4b; font-size:44px; font-weight:bold; text-shadow:3px 3px 0 #000; z-index:9999; font-family:'Kaiti SC',serif; letter-spacing:6px;";
        msg.innerText = text;
        document.body.appendChild(msg);
        setTimeout(() => msg.remove(), 2600);
        if (sfx) this.playSfx(sfx, 0.55);
    }

    _updateAIs(dt) {
        this.aiTick = (this.aiTick || 0) + dt;
        if (this.aiTick > 1.5) { // 每 1.5 秒做一次决策
            this.aiTick = 0;
            for (const ai of this.ais) {
                if (ai.dead) continue;
                if (ai.path && ai.path.length > 0) continue; // 还在赶路，等到了床边再开始发育
                
                const rm = ai.room;
                if (!rm) continue;

                const myPlants = this.plants.filter(p => p.c >= rm.x && p.c < rm.x + rm.w && p.r >= rm.y && p.r < rm.y + rm.h);
                const shrooms = myPlants.filter(p => p.def.produce && p.def.produce.sun);
                const door = myPlants.find(p => p.def.isDoor);
                const peas = myPlants.filter(p => p.def.shoot && !p.def.isDoor);

                // Priority 1: Plant a Sunshroom if none
                if (shrooms.length === 0) {
                    const cost = HauntedDorm.DEFS['sunshroom'].cost || 0;
                    if (ai.sun >= cost) {
                        ai.sun -= cost;
                        this.spawnPlant(rm.x + rm.tpl.bed.c, rm.y + rm.tpl.bed.r, 'sunshroom');
                    }
                    continue; // 一次只做一个动作
                }

                // 收集可行操作
                let actions = [];
                
                // 1. 尝试升级已有的植物 (门、阳光菇、豌豆)
                for (const p of myPlants) {
                    if (p.def.up) {
                        const c = p.def.up.cost || 0, sc = p.def.up.sporeCost || 0;
                        if (ai.sun >= c && ai.spore >= sc) {
                            // 优先升门，其次阳光菇
                            let weight = p.def.isDoor ? 3 : (p.def.produce ? 2 : 1);
                            // 如果快破门了，强制升门补血
                            if (p.def.isDoor && p.hp < p.def.hp * 0.4) weight += 10;
                            actions.push({ type: 'up', pl: p, cost: c, sporeCost: sc, to: p.def.up.to, weight: weight });
                        }
                    }
                }
                
                // 2. 尝试种豌豆或小喷菇
                const emptyTiles = [];
                for(let r = rm.y + 1; r < rm.y + rm.h - 1; r++) {
                    for(let c = rm.x + 1; c < rm.x + rm.w - 1; c++) {
                        if (!myPlants.some(p => p.c === c && p.r === r)) {
                            emptyTiles.push({c, r});
                        }
                    }
                }
                
                if (emptyTiles.length > 0) {
                    // 随机打乱空地
                    emptyTiles.sort(() => Math.random() - 0.5);
                    const peaCost = HauntedDorm.DEFS['peashooter'].cost || 0;
                    if (ai.sun >= peaCost && peas.length < 5) {
                        actions.push({ type: 'plant', id: 'peashooter', cost: peaCost, c: emptyTiles[0].c, r: emptyTiles[0].r, weight: 1 });
                    }
                    // 小喷菇产孢子 (上限 2 个)
                    const puffs = myPlants.filter(p => p.def.spore);
                    if (puffs.length < 2) {
                        actions.push({ type: 'plant', id: 'puffshroom', cost: 0, c: emptyTiles[0].c, r: emptyTiles[0].r, weight: 2 });
                    }
                }

                // 随机轮盘选择执行
                if (actions.length > 0) {
                    const totalW = actions.reduce((sum, a) => sum + a.weight, 0);
                    let r = Math.random() * totalW;
                    let chosen = actions[actions.length - 1];
                    for (const a of actions) {
                        r -= a.weight;
                        if (r <= 0) { chosen = a; break; }
                    }
                    
                    if (chosen.type === 'up') {
                        ai.sun -= chosen.cost;
                        ai.spore -= chosen.sporeCost;
                        this._evolve(chosen.pl, chosen.to);
                        this._flyText(chosen.pl.c * 80 + 40, chosen.pl.r * 80, `AI 升级！`, '#bfa8e0');
                    } else if (chosen.type === 'plant') {
                        ai.sun -= chosen.cost;
                        this.spawnPlant(chosen.c, chosen.r, chosen.id);
                        this._flyText(chosen.c * 80 + 40, chosen.r * 80, `AI 种植！`, '#bfa8e0');
                    }
                }
            }
        }
    }

    _updateGhostDirector(time) {
        // 出笼
        if (!this.ghostSpawned) {
            if (time >= this.ghostSpawnAt) {
                this.ghostSpawned = true;
                this._spawnGhost();
                this._announce('👻 僵尸出笼！', 'evillaugh.mp3');
            }
            return;
        }
        // 僵尸升级改为咬破门触发。这里保留重生逻辑即可。
        // 一条命，不再重生
    }

    _spawnGhost() {
        const lv = this.ghostLevel;
        const cfg = HauntedDorm.GHOST_LEVELS[lv - 1];
        const p = this._ghostSpawnPoint();
        const zb = { x: p.x, y: p.y, hp: cfg.hp, maxHp: cfg.hp, speed: cfg.speed, level: lv, cfg: cfg,
                     side: Math.random() < 0.5 ? 1 : -1, stuck: 0, detourT: 0, stunT: 0, slowT: 0, dead: false };
        this.zombies = [zb]; // 全场唯一

        const zEl1 = document.createElement('div');
        zEl1.className = 'entity avatar';
        zEl1.innerHTML = `<img src="assets/images/${cfg.img}" style="width:150%; height:150%; transform:translate(-20%, -30%);">` +
            `<div class="lv-badge">Lv.${lv}</div>` +
            `<div class="hp-bar-bg" style="top:-14px;"><div class="hp-bar-fg" style="width:100%; background:#ff5252;"></div></div>`;
        this.world1.appendChild(zEl1);
        zb.el1 = zEl1;
        zb.hpBg = zEl1.querySelector('.hp-bar-bg');
        zb.hpFg = zEl1.querySelector('.hp-bar-fg');
        this._updateGhostChip();
    }

    _updateGhostChip() {
        const chip = document.getElementById('wave-chip');
        if (!chip) return;
        const now = performance.now();
        if (!this.ghostSpawned) {
            chip.innerText = `👻 僵尸出笼还有 ${Math.max(0, Math.ceil((this.ghostSpawnAt - now) / 1000))}s`;
        } else if (this.ghostRespawnAt > 0) {
            chip.innerText = `🏆 僵尸已被击杀，游戏胜利！`;
        } else {
            const cfg = HauntedDorm.GHOST_LEVELS[this.ghostLevel - 1];
            const lvTxt = this.ghostLevel >= HauntedDorm.GHOST_MAX_LV
                ? `Lv.${this.ghostLevel} ${cfg.name}（最终形态）`
                : `Lv.${this.ghostLevel} ${cfg.name}`;
            chip.innerText = `👻 ${lvTxt} · 击杀 ${this.kills}`;
        }
    }

    addSun(n) {
        this.player.sun = Math.max(0, this.player.sun + n);
        document.getElementById('sun1').innerText = this.player.sun;
        this._refreshPopupCurrency();
    }

    addSpore(n) {
        this.player.spore = Math.max(0, this.player.spore + n);
        const el = document.getElementById('spore1');
        if (el) el.innerText = this.player.spore;
        this._refreshPopupCurrency();
    }

    // v3.90.0：弹窗开着时阳光/孢子变动 → 实时刷新升级按钮的置灰状态（原先只在打开瞬间判断一次）
    _refreshPopupCurrency() {
        if (this.popup && this.popup.style.display === 'block' && this.popupPlant && this.popupPlant.def.up) {
            const up = this.popupPlant.def.up;
            const have = up.cur === 'sun' ? this.player.sun : this.player.spore;
            this.ppUp.classList.toggle('pp-disabled', have < up.cost);
        }
    }

    _refreshHud() {
        document.getElementById('sun1').innerText = this.player.sun;
        document.getElementById('spore1').innerText = this.player.spore;
        const skillEl = document.getElementById('skill-hud');
        if (skillEl && this.player.roleDef) {
            if (this.player.skillUsed) {
                skillEl.innerHTML = `<span style="color:#aaa;"><s>${this.player.roleDef.skillDesc}</s> (已使用)</span>`;
            } else {
                skillEl.innerHTML = `<span style="color:#0f0;">${this.player.roleDef.skillDesc}</span>`;
            }
        }
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
        this.setWatering(false); // v3.92.0：结算时关掉浇水标志
        document.getElementById('wave-announce')?.remove(); // 结算时移除残留的播报字
        this.playSfx(win ? 'winmusic.mp3' : 'losemusic.mp3', 0.6);
        this._closePopup();
        const secs = Math.floor((performance.now() - this.startTime) / 1000);
        document.getElementById('ov-title').innerText = win ? '🏆 僵尸被击倒了！' : '💀 被僵尸抓住了…';
        document.getElementById('ov-title').style.color = win ? '#ffd54a' : '#ff6b6b';
        document.getElementById('ov-time').innerText = `${Math.floor(secs/60)}:${String(secs%60).padStart(2,'0')}`;
        document.getElementById('ov-kills').innerText = this.kills;
        document.getElementById('ov-waves').innerText = this.ghostLevel;
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
        // v3.91.0：植物只能种在房间里——房间外的草地不允许种植
        const targetRm = this._insideRoom(col, row);
        if (!targetRm) {
            this._flyText(col * this.gridSize + 40, row * this.gridSize, '只能种在房间里', '#ff8a8a');
            return;
        }
        
        // v3.94.6: 检查房间归属
        if (this.ais.some(ai => ai.room === targetRm)) {
            this._flyText(col * this.gridSize + 40, row * this.gridSize, '这是人机的房间！', '#ff8a8a');
            return;
        }
        if (this.player.room && this.player.room !== targetRm) {
            this._flyText(col * this.gridSize + 40, row * this.gridSize, '你已经有房间了！', '#ff8a8a');
            return;
        }

        this.menuCol = col;
        this.menuRow = row;
        this.menuOpen = true;

        this.plantMenu.style.display = 'flex';
        this.plantMenu.style.left = (mouseX + 20) + 'px';
        this.plantMenu.style.top = (mouseY - 20) + 'px';
    }

    _closePlantMenu() {
        this.plantMenu.style.display = 'none';
        this.menuOpen = false;
    }

    // v3.91.0：判定某格是否在某个房间内部，并返回该房间对象
    _insideRoom(col, row) {
        for (const rm of this.rooms) {
            if (col >= rm.x && col < rm.x + rm.w && row >= rm.y && row < rm.y + rm.h &&
                rm.tpl.grid[row - rm.y][col - rm.x] === 1) return rm;
        }
        return null;
    }

    doPlant(type) {
        this._closePlantMenu();
        
        const targetRm = this._insideRoom(this.menuCol, this.menuRow);
        if (targetRm && !this.player.room) {
            this.player.room = targetRm; // 绑定房间归属
        }

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

    _useSkill() {
        if (this.player.skillUsed) return;
        const p = this.player;
        const r = p.roleDef.id;
        const zb = this.zombies[0];

        if (r === 'sunflower') {
            p.skillUsed = true;
            p.sunBuffT = 10;
            this._announce('🌻 技能激活：10秒内阳光产出翻倍！', 'points.mp3');
        } else if (r === 'peashooter') {
            p.skillUsed = true;
            p.atkBuffT = 15;
            this._announce('🌿 技能激活：15秒内植物攻击力翻倍！', 'points.mp3');
        } else if (r === 'wallnut') {
            let myRm = null;
            for (const rm of this.rooms) {
                const rxMin = rm.x * this.gridSize, rxMax = (rm.x + rm.w) * this.gridSize;
                const ryMin = rm.y * this.gridSize, ryMax = (rm.y + rm.h) * this.gridSize;
                if (p.x >= rxMin && p.x <= rxMax && p.y >= ryMin && p.y <= ryMax) {
                    myRm = rm; break;
                }
            }
            if (myRm) {
                const doorPlant = this.getPlantAt(myRm.doorCol * this.gridSize, myRm.doorRow * this.gridSize);
                if (doorPlant && doorPlant.def.up) {
                    p.skillUsed = true;
                    this._upgradePlant(doorPlant, doorPlant.def.up.to);
                    this._announce('🌰 技能激活：大门免费升级完毕！', 'points.mp3');
                } else {
                    this._announce('❌ 门不存在或无法再升级！', 'buzzer.mp3');
                }
            } else {
                this._announce('❌ 必须在房间内才能升级门！', 'buzzer.mp3');
            }
        } else if (r === 'chomper') {
            if (zb && !zb.dead) {
                p.skillUsed = true;
                zb.hp = Math.min(zb.hp, zb.maxHp * 0.05); // 触发回城
                zb.retreating = true;
                this._announce('🌸 技能激活：大嘴花将僵尸吓跑了！', 'chomp.mp3');
            }
        } else if (r === 'squash') {
            if (zb && !zb.dead) {
                if (zb.hp >= zb.maxHp / 2) {
                    p.skillUsed = true;
                    zb.hp -= zb.maxHp / 2;
                    if (zb.hpBg) zb.hpBg.style.display = 'block';
                    if (zb.hpFg) zb.hpFg.style.width = Math.max(0, zb.hp / zb.maxHp * 100) + '%';
                    this._announce('🎃 技能激活：倭瓜砸掉了僵尸一半血！', 'squash_hmm.mp3');
                } else {
                    this._announce('❌ 僵尸血量不足一半，无法使用！', 'buzzer.mp3');
                }
            }
        }
        this._refreshHud();
    }

    bindInput() {
        window.addEventListener('keydown', e => {
            this.keys[e.key.toLowerCase()] = true;
            if (e.key.toLowerCase() === 'm' && !e.repeat && !this.player.skillUsed) {
                this._useSkill();
            }
            // v3.92.0：空格开关式浇水——按一下开启持续浇水，再按一下停止（过滤按住触发的 auto-repeat）
            if (e.key === ' ' && !e.repeat && this.role !== 'zombie') this.setWatering(!this.waterOn);
        });
        window.addEventListener('keyup', e => this.keys[e.key.toLowerCase()] = false);

        this.vp1.addEventListener('mousedown', e => {
            if (e.target.closest('#plant-menu')) return;
            if (this.popup.style.display === 'block') { this._closePopup(); return; }
            if (this.menuOpen) {
                this._closePlantMenu();
                return;
            }
            // 点在植物上 → 升级/拆除面板；点空地 → 种植菜单
            const rect = this.vp1.getBoundingClientRect();
            const worldX = e.clientX - rect.left + this.player.camX;
            const worldY = e.clientY - rect.top + this.player.camY;
            const pl = this.getPlantAt(worldX, worldY);
            if (pl) { this.plantClick(pl, e.clientX, e.clientY); return; }
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
        // v3.92.0：0.2 秒一浇，飘字节流到约 1 秒一飘（+1 ☀），避免 5 个飘字叠成一柱
        this._waterTick = (this._waterTick || 0) + 1;
        if (this._waterTick % 5 === 1) {
            this._flyText(this.player.x, this.player.y - 20, fedAny ? '+1 ☀·浇水' : '+1 ☀', '#ffe14a');
        }
    }

    // v3.92.0：空格开关式浇水——按一下开启持续浇水（头顶 🚿 标志），再按一下停止
    setWatering(on) {
        this.waterOn = !!on;
        const badge = document.getElementById('water-badge');
        if (badge) badge.style.display = this.waterOn ? 'block' : 'none';
    }

    checkCollision(x, y) {
        const r = 20; // v3.88.0：25 → 20，穿门更容易
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
            slow: !!opts.slow, aoe: opts.aoe || 0,
            homing: !!opts.homing, homeR: 260  // 跟踪区：260px 内追踪僵尸，出了区域变直线
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
                        this._firePea(px, py, a, sh.dmg, { img: sh.img, range: sh.range, slow: sh.slow, homing: sh.homing });
                    }
                } else { // 连发：同向串行
                    for (let i = 0; i < sh.n; i++) {
                        this._firePea(px - Math.cos(base) * i * 22, py - Math.sin(base) * i * 22, base, sh.dmg,
                            { img: sh.img, range: sh.range, slow: sh.slow, homing: sh.homing });
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
            // 跟踪弹：260px 内有活僵尸 → 弹道转向追击；出了区域保持直线
            if (pea.homing && pea.life > 0) {
                let best = null, bd = pea.homeR;
                for (const zb of this.zombies) {
                    if (zb.dead) continue;
                    const d = Math.hypot(zb.x - pea.x, zb.y - pea.y);
                    if (d < bd) { bd = d; best = zb; }
                }
                if (best) {
                    const spd = Math.hypot(pea.vx, pea.vy);
                    const cur = Math.atan2(pea.vy, pea.vx);
                    const want = Math.atan2(best.y - pea.y, best.x - pea.x);
                    let diff = want - cur;
                    while (diff > Math.PI) diff -= 2 * Math.PI;
                    while (diff < -Math.PI) diff += 2 * Math.PI;
                    const turn = 7 * dt; // 转向速率 7 rad/s
                    const a = cur + Math.max(-turn, Math.min(turn, diff));
                    pea.vx = Math.cos(a) * spd;
                    pea.vy = Math.sin(a) * spd;
                }
            }
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
        // 击倒最终形态（冰车僵尸）= 胜利；否则 8s 后同级重生
        // 一命通关：僵尸死后游戏直接胜利
        this.ghostRespawnAt = 1; // 标记已死
        this._updateGhostChip();
        setTimeout(() => this.gameOver(true), 3000);
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

    // ===== 植物产出：阳光 / 孢子 =====
    // v3.90.0：阳光菇只在玩家 300px 内才产——否则全场每间房的床铺菇同时产出（约 2.5 ☀/秒），
    // 收入远超浇水的 1 秒 1 阳光，用户反馈"阳光涨得太快，并不是一秒一个"
    _updateProduce(dt) {
        for (const pl of this.plants) {
            const rm = this._insideRoom(pl.c, pl.r);
            const owner = rm ? rm.owner : null;
            if (!owner || owner.dead) continue;
            
            const def = pl.def;
            const wx = pl.c * 80 + 40, wy = pl.r * 80 + 40;
            // 只有站得近才产出（AI 永远在房间里所以始终满足，玩家必须在房间附近）
            if (Math.hypot(wx - owner.x, wy - owner.y) > 300) continue;

            if (def.produce) {
                pl.prodT += dt;
                if (pl.prodT >= def.produce.every) {
                    pl.prodT = 0;
                    owner.sun = (owner.sun || 0) + def.produce.sun;
                    if (owner === this.player) {
                        this.addSun(def.produce.sun); // 顺便更新UI
                        this._flyText(wx, pl.r * 80, `+${def.produce.sun} ☀`, 'yellow');
                        this.playSfx('points.mp3', 0.25);
                    }
                }
            }
            if (def.spore) {
                pl.sporeT += dt;
                if (pl.sporeT >= def.spore.every) {
                    pl.sporeT = 0;
                    owner.spore = (owner.spore || 0) + def.spore.n;
                    if (owner === this.player) {
                        this.addSpore(def.spore.n);
                        this._flyText(wx, pl.r * 80 + 10, `+${def.spore.n} 🦠`, '#c79aff');
                    }
                }
            }
        }
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
                if (!zb.dead && Math.hypot(zb.x - px, zb.y - py) < nk.r) this._killZombie(zb);
            }
            pl.el1.remove();
            this.plants = this.plants.filter(p => p !== pl);
        }
    }

    // 土豆雷：僵尸踩上引爆
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
                if (!zb.dead && Math.hypot(zb.x - px, zb.y - py) < 130) this._killZombie(zb);
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
        ctx.fillStyle = 'rgba(8,25,45,0.55)';
        ctx.fillRect(0, 0, W, H);
        // 房间外框（河道蓝）
        ctx.strokeStyle = 'rgba(90,160,220,0.9)';
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

        // 单僵尸导演：出笼 → 定时升级 → 打倒重生
        this._updateGhostDirector(time);
        this._updateAIs(dt);
        if (Math.floor(time / 500) !== Math.floor((time - dt * 1000) / 500)) this._updateGhostChip(); // 0.5s 刷一次信息牌

        if (this.player.sunBuffT > 0) this.player.sunBuffT -= dt;
        if (this.player.atkBuffT > 0) this.player.atkBuffT -= dt;

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

        // 人机开局自动寻路（按路点走到床位，避免穿模穿墙）
        for (const ai of this.ais) {
            if (ai.path && ai.path.length > 0) {
                const target = ai.path[0];
                const dx = target.x - ai.x;
                const dy = target.y - ai.y;
                const dist = Math.hypot(dx, dy);
                if (dist > 5) {
                    ai.x += (dx / dist) * 200 * dt; // speed 200
                    ai.y += (dy / dist) * 200 * dt;
                } else {
                    ai.path.shift(); // 抵达当前路点，切下一个
                }
                ai.el1.style.left = ai.x + 'px';
                ai.el1.style.top = ai.y + 'px';
            }
        }

        // 防卡墙自救
        if (this.checkCollision(this.player.x, this.player.y)) {
            // 被卡在墙内了，尝试推出去
            const r = 20;
            if (!this.checkCollision(this.player.x + r, this.player.y)) this.player.x += r;
            else if (!this.checkCollision(this.player.x - r, this.player.y)) this.player.x -= r;
            else if (!this.checkCollision(this.player.x, this.player.y + r)) this.player.y += r;
            else if (!this.checkCollision(this.player.x, this.player.y - r)) this.player.y -= r;
        }

        // 浇水（v3.89.0：1 秒才能浇一次——按再快也只按时间间隔计，杜绝拼手速；+1 阳光 / 催熟身边蘑菇）
        // 浇水（v3.92.0：空格开关式——按一下持续浇水不用按住，0.2 秒一次；+1 阳光 / 催熟身边蘑菇）
        if (this.waterOn && !this.over && time - this.lastWaterTime > 200) {
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
        this._updateProduce(dt);
        this._updateSpike(dt);
        this._updateIceshroom(dt);
        this._updateDoomshroom(dt);
        this._updateMines();

        // 僵尸AI：追踪玩家，啃食沿途植物，接触玩家掉血；撞墙自动切向绕行
        // v3.90.0：啃咬改离散慢咬——站在植物上一口一口啃（2.4s/口），不再逐帧持续扣血（用户：开局啃门要非常慢）；
        //          咬力随等级上涨（升级既涨血量也涨实际战力）
        const lv = this.ghostLevel;
        const biteDmg = 15 + 12 * (lv - 1);      // 每口伤害（随僵尸等级成长）
        const BITE_CD = 2.4;                     // 每口间隔（秒）
        const touchDps = 12 + 3 * (lv - 1);      // 接触玩家
        let playerHurt = 0;
        for (const zb of [...this.zombies]) {
            if (zb.dead) continue;

            // 眩晕（眩晕菇）：停住不动、不咬人
            if (zb.stunT > 0) {
                zb.stunT -= dt;
                zb.el1.style.left = zb.x + 'px'; zb.el1.style.top = zb.y + 'px';
                continue;
            }
            if (zb.slowT > 0) zb.slowT -= dt;
            const spd = zb.speed * (zb.slowT > 0 ? 0.5 : 1);

            // 找最近目标（玩家 + AI）
            let closestTarget = null;
            let minDist = Infinity;
            for (const p of this.allPlayers) {
                if (p.hp <= 0) continue;
                const d = Math.hypot(p.x - zb.x, p.y - zb.y);
                if (d < minDist) { minDist = d; closestTarget = p; }
            }
            if (!closestTarget) closestTarget = this.player;

            // 如果目标在房间里，优先攻击门的坐标
            let targetX = closestTarget.x;
            let targetY = closestTarget.y;
            
            // 简单判断目标是否在某个房间附近，且门存活
            for (const rm of this.rooms) {
                const doorC = rm.doorCol, doorR = rm.doorRow;
                // 判断房间范围
                const rxMin = rm.x * this.gridSize, rxMax = (rm.x + rm.w) * this.gridSize;
                const ryMin = rm.y * this.gridSize, ryMax = (rm.y + rm.h) * this.gridSize;
                if (closestTarget.x >= rxMin && closestTarget.x <= rxMax && closestTarget.y >= ryMin && closestTarget.y <= ryMax) {
                    // 目标在房间内，检查门是否存在
                    const doorPlant = this.getPlantAt(doorC * this.gridSize, doorR * this.gridSize);
                    if (doorPlant) {
                        targetX = doorC * this.gridSize + 40;
                        targetY = doorR * this.gridSize + 40;
                        // 为了避免贴着墙死磕，如果僵尸被墙卡死，它会尝试切换攻击对象（在下面detour逻辑里）
                    }
                    break;
                }
            }

            // 残血回城逻辑
            if (zb.hp < zb.maxHp * 0.1) zb.retreating = true;
            if (zb.hp >= zb.maxHp) zb.retreating = false;
            
            if (zb.retreating) {
                targetX = this.worldWidth / 2;
                targetY = this.worldHeight / 2;
                if (Math.hypot(targetX - zb.x, targetY - zb.y) < 120) {
                    zb.hp = Math.min(zb.maxHp, zb.hp + zb.maxHp * 0.1 * dt);
                    if (zb.hpBg) {
                        zb.hpBg.style.display = 'block';
                        zb.hpFg.style.width = (zb.hp / zb.maxHp * 100) + '%';
                    }
                    zb.el1.style.filter = 'drop-shadow(0 0 10px #0f0)';
                } else {
                    zb.el1.style.filter = '';
                }
            } else {
                zb.el1.style.filter = '';
            }

            let dx = targetX - zb.x;
            let dy = targetY - zb.y;
            
            // 防卡墙：如果一直撞墙没有位移，切换目标或者大范围绕行
            if (zb.stuckTime > 3) {
                // 如果卡了太久，强制瞬移一点点或者往反方向走
                dx = (Math.random() - 0.5) * 100;
                dy = (Math.random() - 0.5) * 100;
                zb.stuckTime -= dt;
            }

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
                    // 站定慢啃：每 2.4s 一口，一口一口咬
                    zb.biteT = (zb.biteT || 0) + dt;
                    if (zb.biteT >= BITE_CD) {
                        zb.biteT = 0;
                        atkPlant.hp -= biteDmg;
                        this.playSfx('chomp.mp3', 0.25);
                        const bg = atkPlant.el1.querySelector('.hp-bar-bg');
                        const fg = atkPlant.el1.querySelector('.hp-bar-fg');
                        if (bg) {
                            bg.style.display = 'block';
                            fg.style.width = Math.max(0, (atkPlant.hp / atkPlant.maxHp) * 100) + '%';
                        }
                        if (atkPlant.hp <= 0) {
                            atkPlant.el1.remove();
                            if (atkPlant.txtEl) atkPlant.txtEl.remove();
                            this.plants = this.plants.filter(p => p !== atkPlant);
                            if (atkPlant.isDoor) this._levelUpGhostDirect();
                        }
                    }
                    moved = false; // 啃食时不挪窝
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

            // 接触目标 → 持续掉血
            for (const p of this.allPlayers) {
                if (Math.hypot(p.x - zb.x, p.y - zb.y) < 48) {
                    if (p === this.player) playerHurt += touchDps * dt;
                    else p.hp -= touchDps * dt;
                }
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
