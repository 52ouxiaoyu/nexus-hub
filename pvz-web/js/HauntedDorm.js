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
            // —— 阳光系 (产阳光) ——
            sunshroom:     { tier: 1, name: '阳光菇',   img: 'Plants/SunShroom/0.gif',   hp: 1000, cost: 0,
                             produce: { sun: 1, every: 2.0 }, up: { cost: 30, to: 'bigsunshroom' } },
            bigsunshroom:  { tier: 2, name: '大阳光菇', img: 'Plants/SunShroom/0.gif',   hp: 1500, cost: 0, scale: 1.2,
                             produce: { sun: 2, every: 2.0 }, up: { cost: 90, to: 'sunflower' } },
            sunflower:     { tier: 3, name: '向日葵',   img: 'Plants/SunFlower/0.gif',   hp: 2000, cost: 0, scale: 1.0,
                             produce: { sun: 4, every: 2.0 }, up: { cost: 150, to: 'peasunflower' } },
            peasunflower:  { tier: 4, name: '豌豆向日葵',img: 'Plants/SunFlower/SunFlower1.gif', overlay: 'Plants/Peashooter/Peashooter.gif', hp: 2500, cost: 0, scale: 1.1,
                             overTransform: 'translate(-50%, -50%) translate(0px, -28px) scale(0.6)',
                             produce: { sun: 6, every: 2.0 }, shoot: {dmg: 15, cd: 2.0, n: 1, range: 450, img: 'Plants/PB00.gif', homing: true}, up: { cost: 800, sporeCost: 80, to: 'twinsunflower' } },
            twinsunflower: { tier: 5, name: '双子向日葵',img: 'Plants/TwinSunflower/TwinSunflower1.gif', hp: 5000, cost: 0, scale: 1.1,
                             produce: { sun: 50, every: 2.0 }, shoot: {dmg: 45, cd: 1.2, n: 2, range: 450, img: 'Plants/PB00.gif', homing: true}, up: { cost: 8000, sporeCost: 800, to: 'doomsunflower' } },
            doomsunflower: { tier: 6, name: '毁灭向日葵',img: 'Plants/SunFlower/SunFlower1.gif', hp: 8000, cost: 0, scale: 1.2, tint: 'grayscale(0.8) brightness(0.6) sepia(1) hue-rotate(240deg) saturate(3)',
                             produce: { sun: 100, every: 2.0 }, shoot: {dmg: 80, cd: 1.0, n: 2, range: 450, img: 'Plants/PB10.gif', homing: true}, up: { cost: 20000, sporeCost: 2000, to: 'fourheadsunflower' } },
            fourheadsunflower:{ tier: 7, name: '四头向日葵',img: 'Plants/TwinSunflower/TwinSunflower1.gif', hp: 12000, cost: 0, scale: 1.15, tint: 'saturate(1.35) brightness(1.12)',
                             overlay: 'Plants/TwinSunflower/TwinSunflower1.gif',
                             overTransform: 'translate(-50%, -50%) translate(10px, 6px) scaleX(-1) scale(1.15)',
                             produce: { sun: 250, every: 2.0 }, shoot: {dmg: 150, cd: 0.8, n: 4, range: 450, img: 'Plants/PB10.gif', homing: true} },

            // —— 豌豆系 (常规单体输出，单线升级) ——
            peashooter:    { tier: 1, name: '豌豆射手', img: 'Plants/Peashooter/Peashooter.gif',   card: 'Peashooter.png', hp: 300, cost: 30,
                             shoot: { dmg: 15, cd: 1.5, n: 1, range: 450, img: 'Plants/PB00.gif', homing: true },
                             up: { cost: 80, to: 'cabbagepult' } },
            cabbagepult:   { tier: 2, name: '卷心菜投手', img: 'Plants/CabbagePult/CabbagePult.png',   hp: 400, cost: 0,
                             lob: { dmg: 45, cd: 2.2, range: 450, aoe: 50, img: 'Plants/CabbagePult/Cabbage.png' },
                             up: { cost: 160, to: 'kernelpult' } },
            kernelpult:    { tier: 3, name: '玉米投手',   img: 'Plants/KernelPult/KernelPult.png',    hp: 500, cost: 0,
                             lob: { dmg: 30, cd: 2.0, range: 450, aoe: 50, img: 'Plants/KernelPult/Kernel.png', stunChance: 0.2, stunTime: 2.5 },
                             up: { cost: 250, to: 'dualpea' } },
            dualpea:       { tier: 4, name: '双向(融合)', img: 'Plants/SplitPea/SplitPea.gif',      hp: 600, cost: 0,
                             shoot: { dmg: 15, cd: 1.5, n: 1, range: 450, img: 'Plants/PB00.gif', homing: true, dualChance: 0.5 },
                             up: { cost: 500, to: 'snowpea' } },
            snowpea:       { tier: 5, name: '寒冰射手', img: 'Plants/SnowPea/SnowPea.gif',       hp: 800, cost: 0, scale: 1.1,
                             shoot: { dmg: 20, cd: 1.5, n: 1, range: 450, img: 'Plants/PB01.gif', slow: true, homing: true },
                             up: { cost: 1000, sporeCost: 50, to: 'repeater' } },
            repeater:      { tier: 6, name: '双发射手', img: 'Plants/Repeater/Repeater.gif',      hp: 1000, cost: 0, scale: 1.1,
                             shoot: { dmg: 15, cd: 1.2, n: 2, range: 450, img: 'Plants/PB00.gif', homing: true },
                             up: { cost: 2000, sporeCost: 150, to: 'threepeater' } },
            threepeater:   { tier: 7, name: '三线射手', img: 'Plants/Threepeater/Threepeater.gif',   hp: 1500, cost: 0, scale: 1.2,
                             shoot: { dmg: 20, cd: 1.2, n: 3, range: 450, img: 'Plants/PB00.gif', fan: 0.35, homing: true, focus: true },
                             up: { cost: 5000, sporeCost: 500, to: 'gatlingpea' } },
            gatlingpea:    { tier: 8, name: '机枪射手', img: 'Plants/GatlingPea/GatlingPea.gif',    hp: 2500, cost: 0, scale: 1.2,
                             shoot: { dmg: 15, cd: 1.0, n: 4, range: 450, img: 'Plants/PB00.gif', homing: true, crazySpray: 0.05 } },

            // —— 坚果系 (肉盾防线) ——
            wallnut:       { tier: 1, name: '坚果墙',     img: 'Plants/WallNut/WallNut.gif',       card: 'WallNut.png',     hp: 4000,  cost: 50,
                             up: { cost: 80, to: 'nutshooter' } },
            nutshooter:    { tier: 2, name: '坚果射手',   img: 'Plants/WallNut/WallNut.gif',       overlay: 'Plants/Peashooter/Peashooter.gif', hp: 6000,  cost: 0, scale: 1.0,
                             overTransform: 'translate(-50%, -50%) translate(2px, -28px) scale(0.6)',
                             shoot: { dmg: 15, cd: 1.5, n: 1, range: 400, img: 'Plants/PB00.gif', homing: true }, up: { cost: 160, to: 'cabbagefort' } },
            cabbagefort:   { tier: 3, name: '卷心菜堡垒', img: 'Plants/WallNut/WallNut.gif',       hp: 8500,  cost: 0, scale: 1.0, overlay: 'Plants/CabbagePult/CabbagePult.png', overTransform: 'translate(-50%, -50%) translate(4px, -34px) scale(0.62)',
                             lob: { dmg: 45, cd: 2.2, range: 450, aoe: 70, img: 'Plants/CabbagePult/Cabbage.png' }, up: { cost: 300, to: 'spikeweednut' } },
            spikeweednut:  { tier: 4, name: '地刺坚果',   img: 'Plants/WallNut/WallNut.gif',       hp: 12000, cost: 0, scale: 1.0, overlay: 'Plants/Spikeweed/Spikeweed.gif', overTransform: 'translate(-50%, -50%) translate(0px, 48px)',
                             spike: { dps: 30, r: 80 }, up: { cost: 600, to: 'tallnut' } },
            tallnut:       { tier: 5, name: '高坚果',     img: 'Plants/TallNut/TallNut.gif',       card: 'TallNut.png',     hp: 24000, cost: 0, scale: 1.0,
                             up: { cost: 1200, to: 'spikerocknut' } },
            spikerocknut:  { tier: 6, name: '钢刺高坚果',   img: 'Plants/TallNut/TallNut.gif',       hp: 24000, cost: 0, scale: 1.0, overlay: 'Plants/Spikerock/Spikerock.gif', overTransform: 'translate(-50%, -50%) translate(0px, 58px)',
                             spike: { dps: 60, r: 80 }, up: { cost: 2500, to: 'chompernut' } },
            chompernut:    { tier: 7, name: '大嘴坚果', img: 'Plants/Chomper/Chomper.gif',       hp: 48000, cost: 0, scale: 1.0, overlay: 'Plants/WallNut/WallNut.gif', overTransform: 'translate(-50%, -50%) translate(0px, 16px) scale(0.85)',
                             up: { cost: 5000, to: 'jalapenotallnut' } },
            jalapenotallnut:{ tier: 8, name: '辣椒高坚果',img: 'Plants/TallNut/TallNut.gif',      hp: 48000, cost: 0, scale: 1.0, tint: 'sepia(1) saturate(2.6) hue-rotate(-20deg) brightness(1.1)',
                             spike: { dps: 60, r: 90 } },

            // —— 孢子系 (不产阳光，专产孢子) ——
            puffshroom:    { tier: 1, name: '小喷菇', img: 'Plants/PuffShroom/PuffShroom.gif',     card: 'PuffShroom.png',     hp: 300, cost: 200, scale: 0.9,
                             spore: { n: 1, every: 2.0 }, up: { cost: 400, to: 'scaredyshroom' } },
            scaredyshroom: { tier: 2, name: '胆小菇', img: 'Plants/ScaredyShroom/ScaredyShroom.gif',  hp: 500, cost: 0, scale: 1.1,
                             spore: { n: 2, every: 2.0 }, up: { cost: 800, to: 'fumeshroom' } },
            fumeshroom:    { tier: 3, name: '大喷菇', img: 'Plants/FumeShroom/FumeShroom.gif',     card: 'FumeShroom.png',     hp: 800, cost: 0,   scale: 1.2,
                             spore: { n: 4, every: 2.0 }, up: { cost: 1600, to: 'hypnoshroom' } },
            hypnoshroom:   { tier: 4, name: '魅惑菇', img: 'Plants/HypnoShroom/HypnoShroom.gif',    hp: 1200, cost: 0, scale: 1.3,
                             spore: { n: 8, every: 2.0 }, up: { cost: 3200, to: 'sporemine' } },
            sporemine:     { tier: 5, name: '孢子地雷', img: 'Plants/PotatoMine/PotatoMine.gif',   hp: 2000, cost: 0, scale: 1.0, overlay: 'Plants/PuffShroom/PuffShroom.gif', overTransform: 'translate(-50%, -50%) translate(0px, -30px) scale(0.9)',
                             spore: { n: 16, every: 2.0 }, mine: true, up: { cost: 6400, to: 'gloompuff' } },
            gloompuff:     { tier: 6, name: '忧郁菇', img: 'Plants/GloomShroom/GloomShroom.gif', hp: 3000, cost: 0, scale: 1.0,
                             spore: { n: 32, every: 2.0 }, up: { cost: 12800, to: 'icegloom' } },
            icegloom:      { tier: 7, name: '冰忧郁菇', img: 'Plants/GloomShroom/GloomShroom.gif', hp: 6000, cost: 0, scale: 1.0, tint: 'brightness(1.15) hue-rotate(160deg) saturate(1.7)',
                             spore: { n: 128, every: 2.0 }, auraSlow: true },

            // —— 地刺系 (仅用孢子) ——
            spikeweed:     { name: '地刺',   img: 'Plants/Spikeweed/Spikeweed.gif',  card: 'Spikeweed.png',  hp: 99999, cost: 0, sporeCost: 50, ground: true,
                             spike: { dps: 20, r: 55 }, up: { sporeCost: 100, to: 'firespikeweed' } },
            firespikeweed: { name: '火焰地刺',img: 'Plants/Spikeweed/Spikeweed.gif', hp: 99999, cost: 0, scale: 1.0, tint: 'sepia(1) saturate(3) hue-rotate(-25deg) brightness(1.15)', ground: true,
                             spike: { dps: 40, r: 55 }, up: { sporeCost: 200, to: 'spikerock' } },
            spikerock:     { name: '钢地刺', img: 'Plants/Spikerock/Spikerock.gif', hp: 99999, cost: 0, scale: 1.0, ground: true,
                             spike: { dps: 60, r: 55 }, up: { sporeCost: 400, to: 'ultimatefirespikeweed' } },
            ultimatefirespikeweed: { name: '终极火焰地刺', img: 'Plants/Spikerock/Spikerock.gif', hp: 99999, cost: 0, scale: 1.1, tint: 'hue-rotate(-50deg) saturate(3) drop-shadow(0 0 10px #f00)', ground: true,
                             spike: { dps: 100, r: 60 } },

            // —— 路灯花 (产阳光，只耗孢子升级) ——
            plantern:      { name: '路灯花', img: 'Plants/Plantern/Plantern.gif', card: 'Plantern.png', hp: 2000, cost: 0, sporeCost: 50, scale: 1.8,
                             produce: { sun: 4, every: 2.0 }, up: { sporeCost: 100, to: 'plantern2' } },
            plantern2:     { name: '路灯花 Lv2', img: 'Plants/Plantern/Plantern.gif', hp: 2500, cost: 0, scale: 1.8, produce: { sun: 6, every: 2.0 }, tint: 'brightness(1.1)', up: { sporeCost: 200, to: 'plantern3' } },
            plantern3:     { name: '路灯花 Lv3', img: 'Plants/Plantern/Plantern.gif', hp: 3000, cost: 0, scale: 1.8, produce: { sun: 10, every: 2.0 }, tint: 'brightness(1.2)', up: { sporeCost: 400, to: 'plantern4' } },
            plantern4:     { name: '路灯花 Lv4', img: 'Plants/Plantern/Plantern.gif', hp: 4000, cost: 0, scale: 1.8, produce: { sun: 20, every: 2.0 }, tint: 'brightness(1.4) drop-shadow(0 0 10px #ff0)', up: { sporeCost: 800, to: 'plantern5' } },
            plantern5:     { name: '路灯花 Lv5', img: 'Plants/Plantern/Plantern.gif', hp: 5000, cost: 0, scale: 1.8, produce: { sun: 50, every: 2.0 }, tint: 'brightness(1.6) drop-shadow(0 0 15px #ff0)', up: { sporeCost: 1600, to: 'plantern6' } },
            plantern6:     { name: '路灯花 Lv6', img: 'Plants/Plantern/Plantern.gif', hp: 6000, cost: 0, scale: 1.8, produce: { sun: 100, every: 2.0 }, tint: 'brightness(1.8) drop-shadow(0 0 20px #ff0)', up: { sporeCost: 3200, to: 'plantern7' } },
            plantern7:     { name: '路灯花 Lv7', img: 'Plants/Plantern/Plantern.gif', hp: 8000, cost: 0, scale: 1.8, produce: { sun: 250, every: 2.0 }, tint: 'brightness(2.0) drop-shadow(0 0 25px #ff0)' },

            // —— 特殊 ——
            iceshroom:     { name: '寒冰菇', img: 'Plants/IceShroom/0.gif',  card: 'IceShroom.png',  hp: 99999,  cost: 0, sporeCost: 50, instant: true },
            doomshroom:    { name: '毁灭菇', img: 'Plants/DoomShroom/0.gif', card: 'DoomShroom.png', hp: 2000,  cost: 0, sporeCost: 1000,
                             nuke: { lob: true, dmg: 1000, pct: 0.05, cd: 4.0, img: 'Plants/DoomShroom/0.gif' } },
            garlic:        { name: '大蒜',   img: 'Plants/Garlic/0.gif',     card: 'Garlic.png',     hp: 1000,  cost: 100, isGarlic: true },
            blindbox:      { name: '植物盲盒',img: 'Plants/FlowerPot/0.gif', card: 'PlantBox.png', hp: 100,  cost: 100, sporeCost: 5, isBlindBox: true }
        };
    }
    // 商店可购清单（阳光 / 孢子两种货币）
    static get MENU() {
        return ['puffshroom', 'peashooter', 'plantern', 'spikeweed', 'iceshroom', 'doomshroom', 'garlic', 'blindbox'];
    }

    // ===== 僵尸升级链（10级）=====
    static get GHOST_LEVELS() {
        // 用户要求：僵尸速度变成原来的 3 倍（原来150 -> 450），比玩家还快！
        // 等级顺序：1 普通，2 路障，3 铁桶，4 橄榄球，后续铁门舞王等
        return [
            { name: '普通僵尸',   img: 'Zombies/Zombie/Zombie.gif',                    hp: 500,   speed: 450 },
            { name: '路障僵尸',   img: 'Zombies/ConeheadZombie/ConeheadZombie.gif',    hp: 1200,  speed: 450 },
            { name: '铁桶僵尸',   img: 'Zombies/BucketheadZombie/BucketheadZombie.gif', hp: 3000,  speed: 450 },
            { name: '橄榄球僵尸', img: 'Zombies/FootballZombie/FootballZombie.gif',    hp: 5000,  speed: 450 },
            { name: '铁门僵尸',   img: 'Zombies/ScreenDoorZombie/ScreenDoorZombie.gif', hp: 8000,  speed: 450 },
            { name: '舞王僵尸',   img: 'Zombies/DancingZombie/0.gif',                  hp: 12000, speed: 450 },
            { name: '冰车僵尸',   img: 'Zombies/Zomboni/1.gif',                        hp: 18000, speed: 450 },
            { name: '小丑僵尸',   img: 'Zombies/JackinTheBoxZombie/0.gif',             hp: 28000, speed: 450 },
            { name: '气球僵尸',   img: 'Zombies/BalloonZombie/0.gif',                  hp: 50000, speed: 450 },
            { name: '机甲僵王',   img: 'Zombies/LGBOSS/0.gif',                         hp: 100000, speed: 450 }
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
        this.gameMode = urlParams.get('mode') || '1p'; // '1p' or '2p'
        this.role1 = urlParams.get('role1') || urlParams.get('role') || 'peashooter';
        this.role2 = urlParams.get('role2') || 'peashooter';
        this.faction = urlParams.get('faction') || 'plant';
        this.isZombieFaction = (this.faction === 'zombie');
        
        this.playerRoles = [
            { id: 'sunflower', name: '向日葵', icon: 'assets/images/Plants/SunFlower/0.gif', skillDesc: '10秒阳光翻倍 (CD:60s)' },
            { id: 'peashooter', name: '豌豆射手', icon: 'assets/images/Plants/Peashooter/0.gif', skillDesc: '15秒攻击翻倍 (CD:60s)', imgStyle: 'width: 120%; height: 120%; margin-left: -10%; margin-top: -10%;' },
            { id: 'wallnut', name: '坚果', icon: 'assets/images/Plants/WallNut/0.gif', skillDesc: '免费升一级门 (CD:60s)' },
            { id: 'chomper', name: '大嘴花', icon: 'assets/images/Plants/Chomper/0.gif', skillDesc: '强制赶跑僵尸 (CD:60s)', imgStyle: 'width: 120%; height: 120%; margin-left: -10%; margin-top: -10%;' },
            { id: 'squash', name: '倭瓜', icon: 'assets/images/Plants/Squash/0.gif', skillDesc: '重创僵尸半血 (CD:60s)', imgStyle: 'width: 200%; height: 200%; margin-left: -50%; margin-top: -50%;' }
        ];
        
        this.playerRoleDef1 = this.playerRoles.find(r => r.id === this.role1) || this.playerRoles[1];
        this.playerRoleDef2 = this.playerRoles.find(r => r.id === this.role2) || this.playerRoles[1];

        this.player = {
            id: 1,
            x: this.gameMode === '2p' ? cx - 40 : cx, y: cy, sun: 0, spore: 0, hp: 100, maxHp: 100,
            icon: this.playerRoleDef1.icon,
            roleDef: this.playerRoleDef1,
            camX: 0, camY: 0, skillCd: 0, sunBuffT: 0, atkBuffT: 0,
            biteT: 0, level: 1, speedBuffT: 0, waterOn: false, waterTick: 0, lastWaterTime: 0
        };
        
        if (this.gameMode === '2p') {
            this.player2 = {
                id: 2,
                x: cx + 40, y: cy, sun: 0, spore: 0, hp: 100, maxHp: 100,
                icon: this.playerRoleDef2.icon,
                roleDef: this.playerRoleDef2,
                camX: 0, camY: 0, skillCd: 0, sunBuffT: 0, atkBuffT: 0,
                biteT: 0, level: 1, speedBuffT: 0, waterOn: false, waterTick: 0, lastWaterTime: 0
            };
            this.allPlayers = [this.player, this.player2];
        } else {
            this.allPlayers = [this.player];
        }
        this.kmenus = {
            1: { active: false, type: '', options: [], index: 0, c: 0, r: 0 },
            2: { active: false, type: '', options: [], index: 0, c: 0, r: 0 }
        };
        this.keysJustPressed = {};
        
        if (this.isZombieFaction) {
            const zCfg = HauntedDorm.GHOST_LEVELS[0];
            this.player.hp = zCfg.hp;
            this.player.maxHp = zCfg.hp;
            this.player.x = this.worldWidth ? this.worldWidth / 2 : cx;
            this.player.y = this.worldHeight ? this.worldHeight / 2 : cy;
            this.player.isZombie = true;
            this.player.cfg = zCfg;
            this.ghostSpawned = true;
            this.ghostSpawnAt = 0;
        }

        this.keys = {};
        this.walls = new Set();
        this.plants = [];
        this.zombies = [];   // 永远最多 1 只（单僵尸体系）
        this.peas = [];
        this.ais = [];
        
        this.suns = [];      // 僵尸掉落的阳光袋

        // ===== 单僵尸导演系统 =====
        this.ghostSpawned = false;
        this.gameTime = 0;
        this.timeScale = 2;
        this.ghostSpawnAt = 20000; // 开局 20s 出笼，修复准备中 bug
        this.ghostLevel = 1;              // 当前等级 1..10
        this.ghostRespawnAt = 0;          // >0 = 死亡等待重生
        this.kills = 0;
        this.over = false;
        this.lastFlashAt = 0;

        this.menuOpen = false;
        this.menuCol = -1;
        this.menuRow = -1;

        this.initDOM();
        this.generateMap();
        this.bindInput();
        this._updateGhostChip();
        this._refreshHud();

        this.startTime = 0;
        this.lastTime = performance.now();
        requestAnimationFrame(t => this.loop(t));
    }


    setTimeScale(label) {
        const speedMap = { 1: 2, 2: 4, 5: 10, 10: 20 };
        this.timeScale = speedMap[label] || 2;
        document.querySelectorAll('#speed-hud .speed-btn').forEach(b => {
            if (b.innerText === label + 'x') {
                b.classList.add('active');
            } else {
                b.classList.remove('active');
            }
        });
    }

    initDOM() {
        this.world1 = document.getElementById('world1');
        this.vp1 = document.getElementById('vp1');
        
        // 动态创建键盘 UI 元素（如果不存在）
        const createKUI = (id, html, z) => {
            let el = document.getElementById(id);
            if (!el) {
                el = document.createElement('div');
                el.id = id;
                this.world1.appendChild(el); // append to world1 so it scrolls with the map
            }
            el.style = `position:absolute; display:none; z-index:${z};`;
            el.innerHTML = html;
            return el;
        };
        
        this.p1Cursor = createKUI('p1-cursor', '', 500);
        this.p2Cursor = createKUI('p2-cursor', '', 500);
        this.p1Cursor.style.border = '3px solid #ffeb3b';
        this.p1Cursor.style.width = '80px'; this.p1Cursor.style.height = '80px';
        this.p1Cursor.style.boxSizing = 'border-box';
        this.p1Cursor.style.transition = 'all 0.1s';
        
        this.p2Cursor.style.border = '3px solid #4fc3f7';
        this.p2Cursor.style.width = '80px'; this.p2Cursor.style.height = '80px';
        this.p2Cursor.style.boxSizing = 'border-box';
        this.p2Cursor.style.transition = 'all 0.1s';
        
        this.p1Kmenu = createKUI('p1-kmenu', '', 600);
        this.p2Kmenu = createKUI('p2-kmenu', '', 600);
        this.p1Kmenu.style.background = 'rgba(0,0,0,0.8)';
        this.p1Kmenu.style.border = '2px solid #ffeb3b';
        this.p1Kmenu.style.borderRadius = '5px';
        this.p1Kmenu.style.padding = '5px';
        this.p1Kmenu.style.minWidth = '120px';
        this.p1Kmenu.style.fontFamily = 'Kaiti SC, serif';
        
        this.p2Kmenu.style.background = 'rgba(0,0,0,0.8)';
        this.p2Kmenu.style.border = '2px solid #4fc3f7';
        this.p2Kmenu.style.borderRadius = '5px';
        this.p2Kmenu.style.padding = '5px';
        this.p2Kmenu.style.minWidth = '120px';
        this.p2Kmenu.style.fontFamily = 'Kaiti SC, serif';

        this.world1.style.width = this.worldWidth + 'px';
        this.world1.style.height = this.worldHeight + 'px';

        this.player.el1 = document.createElement('div');
        this.player.el1.className = 'entity avatar';
        if (this.isZombieFaction) {
            // v4.0.15：僵尸阵营的 HUD 控制行换成僵尸键位（原先是静态的植物键位文案，误导玩家）
            const p1Ctl = document.querySelector('#hud-p1 > div');
            if (p1Ctl) p1Ctl.innerHTML = '【僵尸 控制】移动: W/A/S/D | 技能: M（狂暴冲刺）| 咬人: 走近幸存者';
            this.player.el1.innerHTML = `<img src="assets/images/Zombies/Zombie/0.gif" style="width:150%; height:150%; transform:translate(-20%, -30%);">` +
                                        `<div class="lv-badge" style="position:absolute; top:-10px; right:-10px; background:red; color:white; border-radius:10px; padding:4px 8px; font-size:18px; z-index:2;">Lv.1</div>` +
                                        `<div style="position:absolute; top:-35px; left:50%; transform:translateX(-50%); color:#ff5252; font-size:24px; font-weight:bold; text-shadow:1px 1px 2px black, -1px -1px 2px black; white-space:nowrap;">你 (僵尸)</div>`;
            this.player.el1.style.filter = `drop-shadow(0 0 10px #ff0000)`;
        } else {
            const p1Name = this.gameMode === '2p' ? `P1 (${this.playerRoleDef1.name})` : `你 (${this.playerRoleDef1.name})`;
        this.player.el1.innerHTML = `<img src="${this.player.icon}" style="${this.playerRoleDef1.imgStyle || ''}">` + 
                                        `<div style="position:absolute; top:-35px; left:50%; transform:translateX(-50%); color:#ffeb3b; font-size:24px; font-weight:bold; text-shadow:1px 1px 2px black, -1px -1px 2px black; white-space:nowrap;">${p1Name}</div>`;
            this.player.el1.style.filter = `drop-shadow(0 0 10px #00ff00)`;
        }
        // v3.92.0：浇水开启时头顶显示 🚿 标志（跟随玩家移动）
        const wb = document.createElement('div');
        wb.id = 'water-badge';
        wb.className = 'water-badge';
        wb.innerText = '🚿';
        wb.style.display = 'none';
        this.player.el1.appendChild(wb);
        this.world1.appendChild(this.player.el1);
        
        if (this.gameMode === '2p') {
            // v4.0.15：补 flex-direction:column——此前容器级 display:flex 让 P2 HUD 所有子元素横排成"长条"，
            // 而 P1 HUD 是 block 竖排"长块"，这正是用户反馈的左右显示不一致的直接根源
            const p2hud = document.getElementById('p2-hud');
            p2hud.style.display = 'flex';
            p2hud.style.flexDirection = 'column';
            this.player2.el1 = document.createElement('div');
            this.player2.el1.className = 'entity avatar';
            this.player2.el1.innerHTML = `<img src="${this.player2.icon}" style="${this.playerRoleDef2.imgStyle || ''}">` + 
                                         `<div style="position:absolute; top:-35px; left:50%; transform:translateX(-50%); color:#4fc3f7; font-size:24px; font-weight:bold; text-shadow:1px 1px 2px black, -1px -1px 2px black; white-space:nowrap;">P2 (${this.playerRoleDef2.name})</div>`;
            this.player2.el1.style.filter = `drop-shadow(0 0 10px #4fc3f7)`;
            const wb2 = document.createElement('div');
            wb2.id = 'water-badge2';
            wb2.className = 'water-badge';
            wb2.innerText = '🚿';
            wb2.style.display = 'none';
            this.player2.el1.appendChild(wb2);
            this.world1.appendChild(this.player2.el1);
        } else {
            // 隐藏 P2 相关的 UI
            document.getElementById('p2-cursor').style.display = 'none';
            document.getElementById('p2-hud').style.display = 'none';
        }
        


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
        const now = performance.now();
        this._sfxT = this._sfxT || {};
        // 对极度频繁的音效进行节流 (50ms)
        if (this._sfxT[name] && now - this._sfxT[name] < 50) return;
        this._sfxT[name] = now;
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
        const makeGrid = (w, h) => Array.from({length: h}, () => Array(w).fill(1));
        
        // 5对门对门的对称房间布局 (共10个房间)
        const pairCoords = [
            {x: 4, y: 6},   // 左上
            {x: 36, y: 6},  // 右上
            {x: 4, y: 28},  // 左下
            {x: 36, y: 28}, // 右下
            {x: 20, y: 17}  // 中间
        ];

        pairCoords.forEach(p => {
            // 左边房间，门朝右
            this.rooms.push({
                x: p.x, y: p.y, w: 8, h: 8,
                tpl: { grid: makeGrid(8,8), door: {r: 4, c: 8}, beds: [{r: 4, c: 2}] }
            });
            // 右边房间，门朝左
            this.rooms.push({
                x: p.x + 12, y: p.y, w: 8, h: 8,
                tpl: { grid: makeGrid(8,8), door: {r: 4, c: -1}, beds: [{r: 4, c: 5}] }
            });
        });

        // 较高几率刷出有一个双床房间（他们共同守护这一个房间）
        if (Math.random() < 0.3) {
            const idx = Math.floor(Math.random() * this.rooms.length);
            const baseBed = this.rooms[idx].tpl.beds[0];
            // 在上或下加一张床
            this.rooms[idx].tpl.beds.push({ r: baseBed.r === 4 ? 2 : 6, c: baseBed.c });
        }

        for (const rm of this.rooms) {
            rm.doorCol = rm.x + rm.tpl.door.c;
            rm.doorRow = rm.y + rm.tpl.door.r;
            // 确保AI寻路用的门前坐标(frontX, frontY)被正确初始化
            rm.frontX = rm.doorCol * 80 + 40;
            rm.frontY = rm.doorRow * 80 + 40;
        }

        // 初始化所有房间归属信息
        for (const rm of this.rooms) {
            rm.owners = [];
            rm.capacity = rm.tpl.beds.length;
        }

        this.walls = new Set();
        // 渲染地面
        for (const rm of this.rooms) {
            for (let r = 0; r < rm.h; r++) {
                for (let c = 0; c < rm.w; c++) {
                    if (rm.tpl.grid[r][c] === 1) {
                        const tile = document.createElement('div');
                        tile.className = 'tile room';
                        tile.style.left = ((rm.x + c) * this.gridSize) + 'px';
                        tile.style.top = ((rm.y + r) * this.gridSize) + 'px';
                        this.world1.appendChild(tile);
                    }
                }
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
                            continue;
                        }

                        const key = `${rm.x + c},${rm.y + r}`;
                        this.walls.add(key);
                    }
                }
            }

            // 生成床(阳光菇)
            rm.tpl.beds.forEach(b => {
                this.spawnPlant(rm.x + b.c, rm.y + b.r, 'sunshroom');
            });
        }
        // 添加地图边界的河道墙，防止玩家走到地图边缘时撞上无形的“空气墙”
        for (let c = 0; c < this.cols; c++) {
            this.walls.add(`${c},0`);
            this.walls.add(`${c},${this.rows - 1}`);
        }
        for (let r = 0; r < this.rows; r++) {
            this.walls.add(`0,${r}`);
            this.walls.add(`${this.cols - 1},${r}`);
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

        // 修复：清除在生成门和床时被错误赋予给玩家的房间归属
        this.player.room = null;
        for (const rm of this.rooms) {
            rm.owners = [];
            rm.capacity = rm.tpl.beds.length;
        }

        // v3.93.0 安排 5 个人机，所有人都出生在地图正中央，然后走向各自房间
        // v3.97.18 让人机按床位分配，如果有个房间有2张床，他们就能共享房间
        let allBeds = [];
        for (const rm of this.rooms) {
            rm.tpl.beds.forEach((bed, idx) => allBeds.push({ room: rm, bedIdx: idx, bedCoords: bed }));
        }
        let shuffledBeds = allBeds.sort(() => Math.random() - 0.5);
        
        for (let i = 0; i < 5; i++) {
            if (i >= shuffledBeds.length) break;
            const bedChoice = shuffledBeds[i];
            const rm = bedChoice.room;
            const roleDef = this.playerRoles[i];
            const sx = (this.worldWidth / 2) + (Math.random() * 40 - 20);
            const sy = (this.worldHeight / 2) + (Math.random() * 40 - 20);
            const p = this._findPath(sx, sy, rm.frontX, rm.frontY);
            p.push({ x: (rm.x + bedChoice.bedCoords.c) * this.gridSize + 40, y: (rm.y + bedChoice.bedCoords.r) * this.gridSize + 40 }); // 走到专属床位
            const ai = {
                x: sx,
                y: sy,
                path: p,
                sun: 0, spore: 0, hp: 100, maxHp: 100, actTimer: 5.0 + Math.random() * 3.0,
                isAi: true, targetRoom: rm, room: null, roleDef: roleDef,
                icon: roleDef.icon, dead: false,
                el1: document.createElement('div')
            };
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
        if (type === 'blindbox') {
            const pool = ['peashooter', 'cabbagepult', 'kernelpult', 'dualpea', 'snowpea', 'repeater', 'threepeater', 'gatlingpea', 'puffshroom', 'scaredyshroom', 'fumeshroom', 'hypnoshroom', 'sporemine', 'gloompuff', 'icegloom', 'plantern', 'doomshroom', 'iceshroom', 'garlic'];
            type = pool[Math.floor(Math.random() * pool.length)];
            this._flyText(col * 80 + 40, row * 80, '盲盒开出了：' + HauntedDorm.DEFS[type].name, '#fff');
            this.playSfx('plant2.mp3', 0.5);
        }
        if (type === 'iceshroom') {
            if (this.zombies[0] && !this.zombies[0].dead) {
                const zb = this.zombies[0];
                zb.stunT = 5.0; // 冰冻 5 秒
                this._flyText(zb.x, zb.y, '❄️ 极寒冰封 (5秒)', '#7fd8ff');
                this.playSfx('frozen.mp3', 0.5);
                const iceEl = document.createElement('div');
                iceEl.className = 'entity';
                iceEl.style.cssText = `width:100px; height:100px; left:${zb.x}px; top:${zb.y}px; z-index:200; pointer-events:none;`;
                iceEl.innerHTML = '<img src="assets/images/Plants/IceShroom/0.gif" style="width:100%;height:100%; transform:translate(-50%,-50%);">';
                this.world1.appendChild(iceEl);
                setTimeout(() => iceEl.remove(), 1000);
            } else {
                this._flyText(this.player.x, this.player.y, '僵尸未出笼或已死', '#ff8a8a');
            }
            return;
        }

        if (this.plants.some(pl => pl.c === col && pl.r === row)) return;
        const rm = this._insideRoom(col, row);
        if (rm && rm.owners.length < rm.capacity && !this.player.room) {
            rm.owners.push(this.player);
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
        const baseClip = def.baseClip ? `clip-path:${def.baseClip}; -webkit-clip-path:${def.baseClip};` : '';
        let inner = `<img src="assets/images/${def.img}" style="width:100%; height:100%; object-fit:contain; transform: scale(${1.2 * scale}) translateY(-10px); ${tint}${doorOpacity}${blend} ${baseClip}">`;
        
        if (def.overlay) {
            const overClip = def.overClip ? `clip-path:${def.overClip}; -webkit-clip-path:${def.overClip};` : '';
            const overTrans = def.overTransform || 'translate(-50%, -50%) translate(2px, -26px) scale(0.6)';
            inner += `<img src="assets/images/${def.overlay}" style="position:absolute; left:50%; top:50%; width:100%; height:100%; object-fit:contain; pointer-events:none; transform: ${overTrans}; ${overClip}">`;
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

    }

    _setHint(pl, on) {
        // Disabled user floating hint
    }

    // ===== 点击植物 → 弹出「升级 / 拆除」面板 =====
    plantClick(pl, clientX, clientY) {
        if (this.role === 'zombie') return;
        
        // 禁止跨房间操作：不能帮人机或其他人升级植物
        // 门和周围地刺也算在该房间的归属内
        let room = this.rooms.find(rm => pl.c >= rm.x && pl.c < rm.x + rm.w && pl.r >= rm.y && pl.r < rm.y + rm.h);
        if (!room) room = this.rooms.find(rm => Math.abs(pl.c - rm.doorCol) + Math.abs(pl.r - rm.doorRow) <= 1);
        if (room && room.owners && room.owners.length > 0 && !room.owners.includes(this.player)) {
            this._flyText(pl.c * 80 + 40, pl.r * 80 + 40, '不能操作别人的设备！', '#ff4b4b');
            return;
        }

        this._closePlantMenu();
        const def = pl.def;
        this.popupPlant = pl;
        this.ppTitle.innerText = def.name + (pl.isDoor ? '（门板）' : '');
        // 用户反馈：因为已经有升级按键了，不需要长篇大论的升级预览框了，简化UI
        if (def.feed) {
            this.ppFeed.style.display = 'block';
            this.ppFeed.innerText = `浇水进度: ${Math.min(pl.fed, def.feed.goal)}/${def.feed.goal}`;
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
            this._announce(`👻 僵尸升级为【${cfg.name}】！`, 'finalwave.mp3', true);
        } else {
            this._announce(`👻 僵尸成长为【${cfg.name}】…`, 'finalwave.mp3', true);
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

    _announce(text, sfx, priority = false) {
        if (!this.announceQueue) this.announceQueue = [];
        if (priority) {
            this.announceQueue.unshift({ text, sfx });
        } else {
            this.announceQueue.push({ text, sfx });
        }
        this._processAnnounceQueue();
    }

    _processAnnounceQueue() {
        if (this.isAnnouncing || !this.announceQueue || this.announceQueue.length === 0) return;
        
        this.isAnnouncing = true;
        const current = this.announceQueue.shift();
        
        const msg = document.createElement('div');
        msg.id = 'wave-announce';
        msg.style = "position:absolute; top:38%; left:50%; transform:translate(-50%,-50%); color:#ff4b4b; font-size:44px; font-weight:bold; text-shadow:3px 3px 0 #000; z-index:9999; font-family:'Kaiti SC',serif; letter-spacing:6px; text-align:center; white-space:nowrap; pointer-events:none; transition: opacity 0.3s;";
        msg.innerText = current.text;
        document.body.appendChild(msg);
        
        if (current.sfx) this.playSfx(current.sfx, 0.55);
        
        setTimeout(() => {
            msg.style.opacity = '0';
            setTimeout(() => {
                msg.remove();
                this.isAnnouncing = false;
                this._processAnnounceQueue();
            }, 300);
        }, 2200);
    }

    _updateAIs(dt) {
        for (const ai of this.ais) {
            if (ai.dead) continue;
            if (ai.path && ai.path.length > 0) continue; // 还在赶路，等到了床边再开始发育
            
            ai.actTimer = (ai.actTimer || 0) - dt;
            if (ai.actTimer > 0) continue;
            
            // 设定下一次行动间隔：8~15秒（极大地降低人机行动频率，让它们显得笨一点，经济积压严重）
            ai.actTimer = 8.0 + Math.random() * 7.0;
            
            const rm = ai.room;
            if (!rm) continue;

                const myPlants = this.plants.filter(p => (p.c >= rm.x && p.c < rm.x + rm.w && p.r >= rm.y && p.r < rm.y + rm.h) || (p.c === rm.doorCol && p.r === rm.doorRow));
                const shrooms = myPlants.filter(p => p.def.produce && p.def.produce.sun);
                const door = myPlants.find(p => p.isDoor);
                const peas = myPlants.filter(p => p.def.shoot && !p.isDoor);

                // Priority 1: Plant a Sunshroom if none
                if (shrooms.length === 0) {
                    const cost = HauntedDorm.DEFS['sunshroom'].cost || 0;
                    if (ai.sun >= cost) {
                        ai.sun -= cost;
                        this.spawnPlant(rm.x + rm.tpl.beds[0].c, rm.y + rm.tpl.beds[0].r, 'sunshroom');
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
                            // 【人机战力控制 - 终极削弱版】人机的装备等级绝对不能超过僵尸等级（移除+1宽限）！
                            const targetTier = HauntedDorm.DEFS[p.def.up.to].tier || 1;
                            const zLv = this.ghostLevel || 1;
                            if (targetTier <= zLv) {
                                let weight = p.isDoor ? 3 : (p.def.produce ? 2 : 1);
                                if (p.isDoor && p.hp < p.maxHp * 0.6) weight += 20; // 门血量低时极高优先级升级补血
                                actions.push({ type: 'up', pl: p, cost: c, sporeCost: sc, to: p.def.up.to, weight: weight });
                            }
                        }
                    } else if (p.isDoor && p.hp < p.maxHp * 0.9 && ai.sun >= 20) {
                        // 增加“修门”逻辑：如果无法升级或无需升级，花20阳光修500血
                        actions.push({ type: 'repair', pl: p, cost: 20, weight: 15 });
                    }
                }
                
                // 2. 尝试种武器
                const emptyTiles = [];
                for(let r = rm.y; r < rm.y + rm.h; r++) {
                    for(let c = rm.x; c < rm.x + rm.w; c++) {
                        if (rm.tpl.grid[r - rm.y][c - rm.x] === 1) {
                            if (!myPlants.some(p => p.c === c && p.r === r)) {
                                emptyTiles.push({c, r});
                            }
                        }
                    }
                }
                
                if (emptyTiles.length > 0) {
                    // 智能阵型规划：离门近的种武器
                    const doorC = rm.doorCol, doorR = rm.doorRow;
                    emptyTiles.sort((a, b) => Math.hypot(a.c - doorC, a.r - doorR) - Math.hypot(b.c - doorC, b.r - doorR));
                    const frontTile = emptyTiles[0]; // 最靠近门
                    
                    const peaCost = HauntedDorm.DEFS['peashooter'].cost || 0;
                    // 限制武器数量最多2个，且绝不建造小喷菇（白嫖太假）和额外阳光菇
                    if (ai.sun >= peaCost && peas.length < 2) {
                        actions.push({ type: 'plant', id: 'peashooter', cost: peaCost, c: frontTile.c, r: frontTile.r, weight: 1 });
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
                        if (Math.random() < 0.15) this._say(ai, ["门再厚点！僵尸你过来啊！", "阳光怎么这么少，搞快点！", "只要我跑得快，僵尸就吃不到我脑子！", "这局带飞！稳住我们能赢！", "吓死宝宝了，多种点豌豆压压惊！", "僵尸大哥别杀我，我肉酸！", "我这房间风水好，僵尸看不见我！"][Math.floor(Math.random()*7)]);
                    } else if (chosen.type === 'repair') {
                        ai.sun -= chosen.cost;
                        chosen.pl.hp = Math.min(chosen.pl.maxHp, chosen.pl.hp + 800);
                        this._flyText(chosen.pl.c * 80 + 40, chosen.pl.r * 80, "AI 修补！", "#0f0");
                        if (Math.random() < 0.3) this._say(ai, ["门快碎了，吓尿了，赶紧修修！", "僵尸牙口真好，门都啃秃了！", "门在人在，门亡我跑！"][Math.floor(Math.random()*3)]);
                    }
                }
        }
    }

    _updateGhostDirector(time) {
        if (this.isZombieFaction) return; // 僵尸阵营由玩家自己控制，关闭导演
        // 出笼
        if (!this.ghostSpawned) {
            if (time >= this.ghostSpawnAt) {
                this.ghostSpawned = true;
                this._spawnGhost();
                this._announce('👻 僵尸出笼！', 'evillaugh.mp3');
            }
            return;
        }
        // 僵尸等级按时间升级逻辑（刚开始30秒升2，1分钟升3，再1分钟升4）
        if (!this.over && this.zombies.length > 0 && !this.zombies[0].dead) {
            const activeSeconds = (time - this.ghostSpawnAt) / 1000;
            if (activeSeconds >= 30 && this.ghostLevel === 1) {
                this._levelUpGhostDirect();
            } else if (activeSeconds >= 90 && this.ghostLevel === 2) {
                this._levelUpGhostDirect();
            } else if (activeSeconds >= 150 && this.ghostLevel === 3) {
                this._levelUpGhostDirect();
            }
        }
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
        zb.imgEl = zEl1.querySelector('img');
        zb.hpBg = zEl1.querySelector('.hp-bar-bg');
        zb.hpFg = zEl1.querySelector('.hp-bar-fg');
        this._updateGhostChip();
    }

    _updateGhostChip() {
        const chip = document.getElementById('ghost-chip') || document.getElementById('wave-chip');
        if (!chip) return;
        const now = this.gameTime;
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

    // v4.0.15：修复严重 bug——调用处传了第二参 p（双人模式 P2 购买/升级/拆除退款），旧定义却忽略它，全部扣到/加到 P1 头上
    addSun(n, p) {
        p = p || this.player;
        p.sun = Math.max(0, p.sun + n);
        const el = document.getElementById(p === this.player2 ? 'sun2' : 'sun1');
        if (el) el.innerText = p.sun;
        this._refreshPopupCurrency();
    }

    addSpore(n, p) {
        p = p || this.player;
        p.spore = Math.max(0, p.spore + n);
        const el = document.getElementById(p === this.player2 ? 'spore2' : 'spore1');
        if (el) el.innerText = p.spore;
        this._refreshPopupCurrency();
    }

    // v3.90.0：弹窗开着时阳光/孢子变动 → 实时刷新升级按钮的置灰状态（原先只在打开瞬间判断一次）
    _refreshPopupCurrency() {
        if (this.popup && this.popup.style.display === 'block' && this.popupPlant && this.popupPlant.def.up) {
            const cost = this.popupPlant.def.up.cost || 0;
            const sporeCost = this.popupPlant.def.up.sporeCost || 0;
            const canAfford = this.player.sun >= cost && this.player.spore >= sporeCost;
            this.ppUp.classList.toggle('pp-disabled', !canAfford);
        }
    }

    _refreshHud() {
        document.getElementById('sun1').innerText = this.player.sun;
        document.getElementById('spore1').innerText = this.player.spore;
        const skillEl = document.getElementById('skill-hud');
        if (skillEl) {
            if (this.isZombieFaction) {
                if (this.player.skillCd > 0) {
                    skillEl.innerHTML = `<span style="color:#aaa;"><s>【M键】狂暴冲刺</s> (CD: ${Math.ceil(this.player.skillCd)}s)</span>`;
                } else {
                    skillEl.innerHTML = `<span style="color:#ff5252;">【M键】狂暴冲刺 (5秒内极速免疫)</span>`;
                }
            } else if (this.player.roleDef) {
                if (this.player.skillCd > 0) {
                    skillEl.innerHTML = `<span style="color:#aaa;"><s>${this.player.roleDef.skillDesc}</s> (CD: ${Math.ceil(this.player.skillCd)}s)</span>`;
                } else {
                    skillEl.innerHTML = `<span style="color:#0f0;">【M键】${this.player.roleDef.skillDesc}</span>`;
                }
            }
        }
        
        if (this.gameMode === '2p' && this.player2) {
            const sun2El = document.getElementById('sun2');
            if (sun2El) sun2El.innerText = this.player2.sun;
            const spore2El = document.getElementById('spore2');
            if (spore2El) spore2El.innerText = this.player2.spore;
            const skillEl2 = document.getElementById('skill-hud2');
            if (skillEl2 && this.player2.roleDef) {
                if (this.player2.skillCd > 0) {
                    skillEl2.innerHTML = `<span style="color:#aaa;"><s>${this.player2.roleDef.skillDesc}</s> (CD: ${Math.ceil(this.player2.skillCd)}s)</span>`;
                } else {
                    skillEl2.innerHTML = `<span style="color:#0f0;">【/键】${this.player2.roleDef.skillDesc}</span>`;
                }
            }
        }
    }

    setHp() {
        const p = this.player;
        const pct = Math.max(0, p.hp / p.maxHp * 100);
        document.getElementById('hp-fill').style.width = pct + '%';
        document.getElementById('hp-num').innerText = Math.max(0, Math.ceil(p.hp));
        
        if (this.gameMode === '2p' && this.player2) {
            const p2 = this.player2;
            const pct2 = Math.max(0, p2.hp / p2.maxHp * 100);
            const fill2 = document.getElementById('hp-fill2');
            if (fill2) fill2.style.width = pct2 + '%';
            const num2 = document.getElementById('hp-num2');
            if (num2) num2.innerText = Math.max(0, Math.ceil(p2.hp));
        }
    }

    // 受击红闪（节流）
    flashDamage() {
        const now = this.gameTime;
        if (now - this.lastFlashAt < 300) return;
        this.lastFlashAt = now;
        const f = document.getElementById('dmg-flash');
        f.style.opacity = 1;
        setTimeout(() => f.style.opacity = 0, 180);
        this.playSfx('chompsoft.mp3', 0.6);
    }

    _say(entity, text, duration = 3000) {
        if (!entity || !entity.el1) return;
        if (entity.chatBubble) entity.chatBubble.remove();
        
        const bubble = document.createElement('div');
        bubble.innerText = text;
        bubble.style.cssText = `
            position: absolute; bottom: 105%; left: 50%; transform: translateX(-50%);
            background: #fff; color: #000; padding: 10px 18px;
            border-radius: 20px; font-size: 20px; font-weight: 900; white-space: nowrap;
            box-shadow: 4px 4px 0px rgba(0,0,0,0.9); border: 3px solid #000;
            z-index: 500; opacity: 0; transition: opacity 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); pointer-events: none;
            font-family: 'Marker Felt', 'Comic Sans MS', 'Arial Black', sans-serif;
            text-transform: uppercase;
        `;
        const arrow = document.createElement('div');
        arrow.style.cssText = `
            position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
            border-left: 10px solid transparent; border-right: 10px solid transparent; border-top: 14px solid #000;
        `;
        const innerArrow = document.createElement('div');
        innerArrow.style.cssText = `
            position: absolute; top: 100%; left: 50%; transform: translateX(-50%) translateY(-3px);
            border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid #fff;
        `;
        bubble.appendChild(arrow);
        bubble.appendChild(innerArrow);
        
        entity.el1.appendChild(bubble);
        entity.chatBubble = bubble;
        setTimeout(() => bubble.style.opacity = 1, 10);
        setTimeout(() => {
            if (bubble.parentNode) {
                bubble.style.opacity = 0;
                setTimeout(() => {
                    if (bubble.parentNode) bubble.remove();
                    if (entity.chatBubble === bubble) entity.chatBubble = null;
                }, 200);
            }
        }, duration);
    }

    _getDomElement(type) {
        if (!this.domPool) this.domPool = { pea: [], flyText: [], boom: [] };
        if (this.domPool[type] && this.domPool[type].length > 0) {
            const el = this.domPool[type].pop();
            el.style.display = 'block';
            el.style.opacity = '1';
            el.style.transition = 'none'; // reset transition when borrowing
            return el;
        }
        const el = document.createElement('div');
        this.world1.appendChild(el);
        return el;
    }

    _recycleDomElement(type, el) {
        el.style.display = 'none';
        this.domPool[type].push(el);
    }

    _flyText(x, y, text, color) {
        const now = performance.now();
        if (!this.activeTexts) this.activeTexts = [];
        this.activeTexts = this.activeTexts.filter(t => now - t.t < 2000); // 慢一点，保留2秒
        if (this.activeTexts.length > 30) return; // v3.97.13 限制同屏文字数量防卡顿
        
        let flyY = y - 30;
        let overlap = true;
        let attempts = 0;
        while (overlap && attempts < 15) {
            overlap = false;
            for (const t of this.activeTexts) {
                if (Math.abs(t.x - x) < 60 && Math.abs(t.y - flyY) < 35) {
                    flyY -= 30; // 向上避让
                    overlap = true;
                    break;
                }
            }
            attempts++;
        }
        this.activeTexts.push({ x: x, y: flyY, t: now });

        const fly = this._getDomElement('flyText');
        fly.innerText = text;
        fly.style = `position:absolute; color:${color || 'yellow'}; font-weight:bold; font-size:22px; left:${x}px; top:${flyY}px; transition:none; pointer-events:none; z-index:500; text-shadow:1px 1px 2px #000; transform:translate(-50%,-50%); white-space:nowrap;`;
        // Force reflow
        void fly.offsetWidth;
        fly.style.transition = 'all 2s ease-out';
        setTimeout(() => { fly.style.top = (flyY - 80) + 'px'; fly.style.opacity = '0'; }, 50);
        setTimeout(() => this._recycleDomElement('flyText', fly), 2050);
    }

    gameOver(win) {
        if (this.over) return;
        this.over = true;
        for (const p of this.allPlayers) this.setWatering(p, false); // v4.0.15：结算时关掉所有人的浇水标志
        document.getElementById('wave-announce')?.remove(); // 结算时移除残留的播报字
        this.playSfx(win ? 'winmusic.mp3' : 'losemusic.mp3', 0.6);
        this._closePopup();
        const secs = Math.floor((this.gameTime) / 1000);
        if (this.isZombieFaction) {
            document.getElementById('ov-title').innerText = win ? '🏆 猎杀完成！' : '💀 猎杀失败…';
        } else {
            document.getElementById('ov-title').innerText = win ? '🏆 僵尸被击倒了！' : '💀 被僵尸抓住了…';
        }
        document.getElementById('ov-title').style.color = win ? '#ffd54a' : '#ff6b6b';
        document.getElementById('ov-time').innerText = `${Math.floor(secs/60)}:${String(secs%60).padStart(2,'0')}`;
        document.getElementById('ov-waves').innerText = this.ghostLevel;
        
        let mvp = this.lastKiller || this.player; // 最终击杀者直接成为MVP
        const mvpEl = document.getElementById('ov-mvp');
        if (mvpEl) {
            mvpEl.innerText = mvp === this.player ? '你' : `人机-${mvp.roleDef.name}`;
            mvpEl.style.color = mvp === this.player ? '#00ff00' : mvp.color;
        }

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
        // v3.91.0：植物只能种在房间里——房间外的草地不允许种植 (新增: 地刺可以种在门外一格)
        let targetRm = this._insideRoom(col, row);
        let isSpikeTile = false;
        if (!targetRm) {
            // 允许地刺种在门的上下左右相邻一格（适应各种朝向的门）
            targetRm = this.rooms.find(rm => Math.abs(col - rm.doorCol) + Math.abs(row - rm.doorRow) <= 1);
            if (targetRm) {
                isSpikeTile = true;
            } else {
                this._flyText(col * this.gridSize + 40, row * this.gridSize, '只能种房内，或门周围一格种地刺', '#ff8a8a');
                return;
            }
        }
        
        // 检查房间归属
        if (this.ais.some(ai => ai.room === targetRm) && targetRm !== this.player.room) {
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
        
        // 地刺格子只能种地刺，别的植物隐藏
        const opts = this.plantMenu.querySelectorAll('.plant-option');
        opts.forEach(opt => {
            if (isSpikeTile) {
                opt.style.display = (opt.dataset.t === 'spikeweed') ? 'block' : 'none';
            } else {
                opt.style.display = (opt.dataset.t === 'spikeweed') ? 'none' : 'block';
            }
        });
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
        
        let targetRm = this._insideRoom(this.menuCol, this.menuRow);
        if (!targetRm) targetRm = this.rooms.find(rm => this.menuCol === rm.doorCol && this.menuRow === rm.doorRow + 1);
        
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
        if (this.player.skillCd > 0) return;
        const p = this.player;

        if (this.isZombieFaction) {
            p.skillCd = 60;
            p.speedBuffT = 5; // 提速免疫
            this._announce('🧟 技能激活：僵尸狂暴冲刺！', 'scream.mp3');
            this._refreshHud();
            return;
        }

        const r = p.roleDef.id;
        const zb = this.zombies[0];

        if (r === 'sunflower') {
            p.skillCd = 60;
            p.sunBuffT = 10;
            this._announce('🌻 技能激活：10秒内阳光产出翻倍！', 'points.mp3');
        } else if (r === 'peashooter') {
            p.skillCd = 60;
            p.atkBuffT = 15;
            this._announce('🌿 技能激活：15秒内植物攻击力翻倍！', 'points.mp3');
        } else if (r === 'wallnut') {
            const myRm = p.room; // 取消位置限制，只要有房间就能用
            if (myRm) {
                const doorPlant = this.getPlantAt(myRm.doorCol * this.gridSize, myRm.doorRow * this.gridSize);
                if (doorPlant && doorPlant.def.up) {
                    p.skillCd = 60;
                    this._evolve(doorPlant, doorPlant.def.up.to);
                    this._announce('🌰 技能激活：大门免费升级完毕！', 'points.mp3');
                } else {
                    this._announce('❌ 门不存在或无法再升级！', 'buzzer.mp3');
                    return; // 失败不扣CD
                }
            } else {
                this._announce('❌ 你还没有绑定任何房间！', 'buzzer.mp3');
                return;
            }
        } else if (r === 'chomper') {
            if (zb && !zb.dead) {
                p.skillCd = 60;
                zb.hp = Math.min(zb.hp, zb.maxHp * 0.05); // 触发回城
                zb.retreating = true;
                this._announce('🌸 技能激活：大嘴花将僵尸吓跑了！', 'chomp.mp3');
            } else {
                return;
            }
        } else if (r === 'squash') {
            if (zb && !zb.dead) {
                p.skillCd = 60;
                zb.hp = Math.max(1, zb.hp - zb.maxHp * 0.5); // 取消血量限制，直接扣除半管血
                if (zb.hpBg) zb.hpBg.style.display = 'block';
                this._announce('🎃 技能激活：倭瓜重创了僵尸！', 'squash_hmm.mp3');
            } else {
                return;
            }
        }
        this._refreshHud();
    }

    bindInput() {
        window.addEventListener('keydown', e => {
            const key = e.key.toLowerCase();
            this.keys[key] = true;
            this.keys[e.code] = true;
            if (!e.repeat) {
                this.keysJustPressed[key] = true;
                this.keysJustPressed[e.code] = true;
            }
            if (key === 'm' && !e.repeat && this.player.skillCd <= 0) {
                this._useSkill(this.player);
            }
            if ((key === '/' || key === '3' || key === 'pagedown') && !e.repeat && this.gameMode === '2p' && this.player2 && this.player2.skillCd <= 0) {
                this._useSkill(this.player2);
            }
            if (e.code === 'Space') {
                e.preventDefault();
            }
            if ((key === ' ' || e.code === 'Space') && !e.repeat && !this.isZombieFaction) {
                this.setWatering(this.player, !this.player.waterOn);
            }
            // v4.0.15：P2 浇水开关（0键 / 小键盘0）——此前浇水只有 P1 能用
            if ((key === '0' || e.code === 'Numpad0') && !e.repeat && this.gameMode === '2p' && this.player2 && !this.isZombieFaction) {
                this.setWatering(this.player2, !this.player2.waterOn);
            }
        });
        window.addEventListener('keyup', e => {
            this.keys[e.key.toLowerCase()] = false;
            this.keys[e.code] = false;
        });
        
        // 【优化1】防卡键：当浏览器失去焦点（如弹窗、切屏、硬件冲突导致系统级中断）时，强制清空所有按键状态
        window.addEventListener('blur', () => {
            this.keys = {};
            this.keysJustPressed = {};
        });

        this.vp1.addEventListener('mousedown', e => {
            if (this.gameMode === '2p') return; // 双人模式禁用鼠标操作
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

    // ===== 浇水（per-player）：每次 +1 该玩家的阳光，并催熟身边所有蘑菇 =====
    _water(p) {
        p = p || this.player;
        this.addSun(1, p);
        this.playSfx('plant_water.mp3', 0.4);
        let fedAny = false;
        for (const pl of this.plants) {
            if (!pl.def.feed) continue;
            const px = pl.c * 80 + 40, py = pl.r * 80 + 40;
            if (Math.hypot(p.x - px, p.y - py) < 130) {
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
        p.waterTick = (p.waterTick || 0) + 1;
        if (p.waterTick % 5 === 1) {
            this._flyText(p.x, p.y - 20, fedAny ? '+1 ☀·浇水' : '+1 ☀', '#ffe14a');
        }
    }

    // v3.92.0 空格开关式浇水；v4.0.15 改 per-player——P1 空格、P2 0键/小键盘0，各自头顶 🚿 标志、各自加阳光
    setWatering(p, on) {
        if (!p) p = this.player;
        if (on === undefined) { on = p; p = this.player; } // 兼容旧签名 setWatering(bool)
        p.waterOn = !!on;
        const badge = document.getElementById(p === this.player2 ? 'water-badge2' : 'water-badge');
        if (badge) badge.style.display = p.waterOn ? 'block' : 'none';
    }

    _getBfsArrays(MAX_CELLS) {
        if (!this._bfsVisited || this._bfsVisited.length !== MAX_CELLS) {
            this._bfsVisited = new Uint8Array(MAX_CELLS);
            this._bfsParent = new Int32Array(MAX_CELLS);
            this._bfsQ = new Int32Array(MAX_CELLS);
            this._bfsPlantMap = new Uint8Array(MAX_CELLS);
        } else {
            this._bfsVisited.fill(0);
            this._bfsPlantMap.fill(0);
        }
        return { visited: this._bfsVisited, parent: this._bfsParent, q: this._bfsQ, plantMap: this._bfsPlantMap };
    }

    _findPath(startX, startY, targetX, targetY) {
        const sc = Math.floor(startX / this.gridSize);
        const sr = Math.floor(startY / this.gridSize);
        const tc = Math.floor(targetX / this.gridSize);
        const tr = Math.floor(targetY / this.gridSize);
        
        if (sc === tc && sr === tr) return [{x: targetX, y: targetY}];

        // 使用 1D 数组且复用全局内存代替每次 new，彻底消除寻路 GC 造成的卡顿
        const MAX_CELLS = this.cols * this.rows;
        const { visited, parent, q, plantMap } = this._getBfsArrays(MAX_CELLS);
        
        const startIdx = sr * this.cols + sc;
        const targetIdx = tr * this.cols + tc;
        
        for (const pl of this.plants) {
            if (!pl.def.ground) plantMap[pl.r * this.cols + pl.c] = 1;
        }
        
        let head = 0;
        let tail = 0;
        
        q[tail++] = startIdx;
        visited[startIdx] = 1;
        
        const dirs = [-this.cols, this.cols, -1, 1]; // 上, 下, 左, 右
        let found = false;
        
        while(head < tail) {
            const currIdx = q[head++];
            if (currIdx === targetIdx) { found = true; break; }
            
            const c = currIdx % this.cols;
            const r = Math.floor(currIdx / this.cols);
            
            for (let i = 0; i < 4; i++) {
                // 防止左右跨行
                if (i === 2 && c === 0) continue;
                if (i === 3 && c === this.cols - 1) continue;
                
                const nextIdx = currIdx + dirs[i];
                if (nextIdx < 0 || nextIdx >= MAX_CELLS) continue;
                
                if (visited[nextIdx]) continue;
                
                const nc = nextIdx % this.cols;
                const nr = Math.floor(nextIdx / this.cols);
                
                if ((this.walls.has(`${nc},${nr}`) || plantMap[nextIdx]) && nextIdx !== targetIdx) continue;
                
                visited[nextIdx] = 1;
                parent[nextIdx] = currIdx;
                q[tail++] = nextIdx;
            }
        }
        
        if (!found) return [{x: targetX, y: targetY}];
        
        const path = [];
        let curr = targetIdx;
        while (curr !== startIdx) {
            const c = curr % this.cols;
            const r = Math.floor(curr / this.cols);
            path.unshift({ x: c * this.gridSize + 40, y: r * this.gridSize + 40 });
            curr = parent[curr];
        }
        return path;
    }

    checkCollision(x, y, r = 20, isZombie = false) {
        // 彻底修复穿墙：不仅查四个角，还查中心，确保绝对实体
        r = 15; // 强制半径 15，避免过小导致在角落漏检
        const corners = [
            { c: Math.floor(x/this.gridSize), r: Math.floor(y/this.gridSize) }, // 中心点
            { c: Math.floor((x-r)/this.gridSize), r: Math.floor((y-r)/this.gridSize) },
            { c: Math.floor((x+r)/this.gridSize), r: Math.floor((y-r)/this.gridSize) },
            { c: Math.floor((x-r)/this.gridSize), r: Math.floor((y+r)/this.gridSize) },
            { c: Math.floor((x+r)/this.gridSize), r: Math.floor((y+r)/this.gridSize) },
            { c: Math.floor(x/this.gridSize), r: Math.floor((y-r)/this.gridSize) },
            { c: Math.floor(x/this.gridSize), r: Math.floor((y+r)/this.gridSize) },
            { c: Math.floor((x-r)/this.gridSize), r: Math.floor(y/this.gridSize) },
            { c: Math.floor((x+r)/this.gridSize), r: Math.floor(y/this.gridSize) }
        ];
        return corners.some(p => {
            if (this.walls.has(`${p.c},${p.r}`)) return true;
            
            // 实体碰撞逻辑优化：大门是绝对的物理阻挡
            const plant = this.getPlantAt(p.c * this.gridSize, p.r * this.gridSize);
            if (plant && !plant.def.ground) {
                // 如果是僵尸阵营（包括僵尸玩家和AI僵尸），所有植物（门、塔等）都是绝对实体，绝不允许穿透！
                if (isZombie) return true;
                
                // 以下逻辑针对人类幸存者阵营玩家：
                if (plant.isDoor) {
                    // 空房间的门可以进出，但一旦有人入住则变成死实体
                    const rm = this._insideRoom(plant.c, plant.r);
                    if (rm && rm.owners && rm.owners.length > 0) return true;
                } else {
                    // 人类自己种的其他植物可以走过去（除非以后有特殊要求）
                    // 暂时只阻挡僵尸
                }
            }
            return false;
        });
    }

    getPlantAt(x, y) {
        const c = Math.floor(x / this.gridSize);
        const r = Math.floor(y / this.gridSize);
        return this.plants.find(pl => pl.c === c && pl.r === r);
    }

    // ===== 通用弹道 =====
    _firePea(px, py, angle, dmg, opts = {}) {
        let finalDmg = dmg;
        if (opts.owner && opts.owner.atkBuffT > 0) finalDmg *= 2;
        dmg = finalDmg;
        const el = this._getDomElement('pea');
        el.className = 'entity';
        const size = (opts.size || 26) * 1.8; // 放大 1.8 倍
        el.style.cssText = `width:${size}px;height:${size}px;z-index:90;`;
        el.innerHTML = `<img src="assets/images/${opts.img}" style="width:100%;height:100%;object-fit:contain;">`;
        const sp = opts.speed || 500;
        this.peas.push({
            x: px, y: py, vx: Math.cos(angle) * sp, vy: Math.sin(angle) * sp,
            el, life: (opts.range || 320) / sp + 0.3, dmg: dmg,
            slow: !!opts.slow, aoe: opts.aoe || 0,
            homing: !!opts.homing, homeR: 260,  // 跟踪区：260px 内追踪僵尸，出了区域变直线
            owner: opts.owner, stunTime: opts.stunTime || 0,
            pctDmg: opts.pctDmg || 0
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
            const targets = this.isZombieFaction ? this.allPlayers.filter(p => p.isZombie) : this.zombies;
            for (const zb of targets) {
                if (zb.dead) continue;
                const d = Math.hypot(zb.x - px, zb.y - py);
                if (d < bestD) { bestD = d; best = zb; }
            }
            if (!best) continue;

            const rm = this._insideRoom(pl.c, pl.r);
            const owner = (rm && rm.owners && rm.owners.length > 0) ? rm.owners[0] : this.player;

            if (lob) {
                pl.shootCd = lob.cd;
                const isButter = lob.stunChance && Math.random() < lob.stunChance;
                this._firePea(px, py, Math.atan2(best.y - py, best.x - px), lob.dmg,
                    { img: isButter ? 'Plants/KernelPult/butter.png' : lob.img, range: lob.range, aoe: lob.aoe, speed: 300, size: 34, owner, stunTime: isButter ? lob.stunTime : 0 });
            } else {
                if (sh.crazySpray && Math.random() < sh.crazySpray) {
                    pl.crazySpray = 10;
                }
                
                if (pl.crazySpray > 0) {
                    pl.shootCd = 0.1;
                    pl.crazySpray--;
                } else {
                    pl.shootCd = sh.cd;
                }
                
                let isFocus = sh.focus && (best.lockedTarget === this.player || (best.lockedTarget && best.lockedTarget === owner));
                const base = Math.atan2(best.y - py, best.x - px);
                if (sh.fan) { // 三线/忧郁菇：扇形多向
                    for (let i = 0; i < sh.n; i++) {
                        const a = isFocus ? base : base + (i - (sh.n - 1) / 2) * sh.fan;
                        this._firePea(px, py, a, sh.dmg, { img: sh.img, range: sh.range, slow: sh.slow, homing: sh.homing, owner });
                    }
                } else { // 连发：同向串行
                    const actualN = (sh.dualChance && Math.random() < sh.dualChance) ? 2 : sh.n;
                    for (let i = 0; i < actualN; i++) {
                        this._firePea(px - Math.cos(base) * i * 22, py - Math.sin(base) * i * 22, base, sh.dmg,
                            { img: sh.img, range: sh.range, slow: sh.slow, homing: sh.homing, owner });
                    }
                }
                if (sh.back) { // 双向射手：脑后再补一发
                    this._firePea(px, py, base + Math.PI, sh.dmg, { img: sh.img, range: sh.range, slow: sh.slow, owner });
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
                    const spd = pea.speed || Math.hypot(pea.vx, pea.vy);
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
            // 撞墙消失 (被移除：允许子弹穿墙)
            const c = Math.floor(pea.x / this.gridSize), r = Math.floor(pea.y / this.gridSize);
            // if (this.walls.has(`${c},${r}`)) pea.life = 0; // 用户要求子弹能穿透墙壁
            // 命中检测（34px）
            const targets = this.isZombieFaction ? this.allPlayers.filter(p => p.isZombie) : this.zombies;
            for (const zb of targets) {
                if (zb.dead) continue; // 撤退时不再免疫，可以被击杀
                if (Math.hypot(zb.x - pea.x, zb.y - pea.y) < 34) {
                    pea.life = 0;
                    if (this.isZombieFaction && zb === this.player && this.player.speedBuffT > 0) continue; // 提速免疫技能生效
                    const hits = pea.aoe > 0
                        ? targets.filter(z => !z.dead && Math.hypot(z.x - pea.x, z.y - pea.y) < pea.aoe)
                        : [zb];
                    for (const z of hits) {
                        z.hp -= pea.dmg;
                        if (pea.pctDmg) z.hp -= z.maxHp * pea.pctDmg;
                        if (pea.pctDmg) {
                            // 毁灭大炮特效
                            const boom = this._getDomElement('boom');
                            boom.style.cssText = `position:absolute; left:${pea.x-100}px; top:${pea.y-100}px; width:200px; height:200px; border-radius:50%; background:radial-gradient(circle, rgba(190,120,255,0.9) 0%, rgba(255,0,0,0) 70%); z-index:600; pointer-events:none;`;
                            setTimeout(() => this._recycleDomElement('boom', boom), 400);
                            this.playSfx('explosion.mp3', 0.4);
                        }
                        if (pea.slow) z.slowT = 2.5;
                        if (pea.stunTime) z.stunT = pea.stunTime;
                        if (z.hpBg) z.hpBg.style.display = 'block';
                        z.hitFlashT = 0.1; // 记录受击闪烁状态交由 _render 处理
                        if (z.hp <= 0) this._killZombie(z, pea.owner);
                    }
                    this.playSfx('bowlingimpact2.mp3', 0.22);
                    break;
                }
            }
        }
        this.peas = this.peas.filter(p => {
            if (p.life > 0) return true;
            this._recycleDomElement('pea', p.el);
            return false;
        });
    }

    _killZombie(zb, killer = null) {
        if (zb.dead) return;
        zb.dead = true;
        this.kills++;
        this.lastKiller = killer; // 记录击杀者

        
        zb.el1.style.transition = 'all 0.45s ease-in';
        zb.el1.style.transform = 'translate(-50%, -50%) scale(1.25) rotate(12deg)';
        zb.el1.style.opacity = '0';
        setTimeout(() => zb.el1.remove(), 480);
        this.playSfx('scream.mp3', 0.35);
        
        if (this.isZombieFaction && zb === this.player) {
            this._announce('💀 你被植物击败了…', 'scream.mp3', true);
            setTimeout(() => this.gameOver(false), 3000);
            return;
        }
        
        this.ghostRespawnAt = 1;
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
            const owner = (rm && rm.owners && rm.owners.length > 0) ? rm.owners[0] : null;
            if (!owner || owner.dead) continue;
            
            const def = pl.def;
            const wx = pl.c * 80 + 40, wy = pl.r * 80 + 40;
            // 只有站得近才产出（AI 永远在房间里所以始终满足，玩家必须在房间附近）
            if (Math.hypot(wx - owner.x, wy - owner.y) > 300) continue;

            if (def.produce) {
                pl.prodT += dt;
                if (pl.prodT >= def.produce.every) {
                    pl.prodT = 0;
                    let sAmt = def.produce.sun;
                    if (owner.sunBuffT > 0) sAmt *= 2; // 向日葵技能生效
                    owner.sun = (owner.sun || 0) + sAmt;
                    if (owner === this.player) {
                        this.addSun(sAmt); // 顺便更新UI
                        this._flyText(wx, pl.r * 80, `+${sAmt} ☀`, 'yellow');
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
                    const rm = this._insideRoom(pl.c, pl.r);
                    const owner = (rm && rm.owners && rm.owners.length > 0) ? rm.owners[0] : this.player;
                    let fdps = sp.dps;
                    if (owner.atkBuffT > 0) fdps *= 2;
                    zb.hp -= fdps * dt;
                    if (zb.hpBg) {
                        zb.hpBg.style.display = 'block';
                        zb.hpFg.style.width = Math.max(0, zb.hp / zb.maxHp * 100) + '%';
                    }
                    if (zb.hp <= 0) {
                        const rm = this._insideRoom(pl.c, pl.r);
                        this._killZombie(zb, (rm && rm.owners && rm.owners.length > 0) ? rm.owners[0] : this.player);
                    }
                }
            }
        }
    }

    _updateIceshroom(dt) {
        // 极寒冰阵：全局减速并造成持续伤害
        let hasAura = false;
        let dps = 0;
        for (const pl of this.plants) {
            const fz = pl.def.freeze;
            if (fz && fz.aura) {
                hasAura = true;
                dps += fz.dps;
            }
        }
        for (const zb of this.zombies) {
            if (zb.dead) continue;
            if (hasAura) {
                zb.slowT = 0.5;
                zb.hp -= dps * dt;
                zb.el1.querySelector('img').style.filter = 'saturate(0.35) brightness(1.5) drop-shadow(0 0 8px #7fd8ff)';
                if (zb.hp <= 0) this._killZombie(zb, this.player); // 冰阵是全局的，算在玩家头上，或者暂不追究
            } else {
                if (zb.slowT <= 0 && zb.el1) zb.el1.querySelector('img').style.filter = '';
            }
        }
    }

    _updateDoomshroom(dt) {
        // 毁灭重炮：无限射程重炮，造成真伤
        for (const pl of this.plants) {
            const nk = pl.def.nuke;
            if (!nk || !nk.lob) continue;
            pl.nukeT = (pl.nukeT || 0) + dt;
            if (pl.nukeT >= nk.cd) {
                pl.nukeT = 0;
                let best = null, bd = Infinity;
                for (const zb of this.zombies) {
                    if (zb.dead) continue;
                    const d = Math.hypot(zb.x - pl.c*80, zb.y - pl.r*80);
                    if (d < bd) { bd = d; best = zb; }
                }
                if (!best) continue;
                
                this.playSfx('throw.mp3', 0.4);
                const px = pl.c * 80 + 40, py = pl.r * 80 + 40;
                const el = document.createElement('div');
                el.className = 'entity';
                el.style.cssText = `width:60px;height:60px;z-index:150; transition: transform 0.1s linear;`;
                el.innerHTML = `<img src="assets/images/${nk.img}" style="width:100%;height:100%;object-fit:contain; filter:drop-shadow(0 0 5px #f00);">`;
                this.world1.appendChild(el);
                
                // 给导弹加上无限范围追踪属性
                this.peas.push({
                    x: px, y: py,
                    vx: 0, vy: -200, 
                    el: el, life: 10,
                    dmg: nk.dmg,
                    pctDmg: nk.pct,
                    homing: true,
                    homeR: 9999, // 无论多远都追踪
                    speed: 350
                });
            }
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
                if (!zb.dead && Math.hypot(zb.x - px, zb.y - py) < 130) {
                    const rm = this._insideRoom(pl.c, pl.r);
                    this._killZombie(zb, (rm && rm.owners && rm.owners.length > 0) ? rm.owners[0] : this.player);
                }
            }
            pl.el1.remove();
            this.plants = this.plants.filter(p => p !== pl);
        }
    }

    _updateMinimap() {
        const ctx = this.minimap;
        const W = 320, H = 240; // 扩大版小地图
        const sx = W / this.worldWidth, sy = H / this.worldHeight;
        ctx.clearRect(0, 0, W, H);
        
        // 【背景】整个地图默认都是草地
        ctx.fillStyle = 'rgba(53, 133, 62, 0.95)';
        ctx.fillRect(0, 0, W, H);

        // 【墙体】河道（障碍物，严格按照物理碰撞矩阵绘制，杜绝空气墙/假墙）
        ctx.fillStyle = 'rgba(46, 109, 168, 0.9)'; // 蓝色河道
        for (const key of this.walls) {
            const [cStr, rStr] = key.split(',');
            const c = parseInt(cStr);
            const r = parseInt(rStr);
            ctx.fillRect(c * this.gridSize * sx, r * this.gridSize * sy, this.gridSize * sx, this.gridSize * sy);
        }

        // 门（木桥）和床位示意
        for (const rm of this.rooms) {
            ctx.fillStyle = '#ffa040';
            ctx.fillRect((rm.x + rm.tpl.door.c) * this.gridSize * sx, (rm.y + rm.tpl.door.r) * this.gridSize * sy, this.gridSize * sx, this.gridSize * sy);
            
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.fillRect((rm.x + rm.tpl.beds[0].c) * this.gridSize * sx, (rm.y + rm.tpl.beds[0].r) * this.gridSize * sy, this.gridSize * sx, this.gridSize * sy);
        }

        // 【植物和门】
        for (const pl of this.plants) {
            if (pl.isDoor) {
                ctx.fillStyle = '#ffa040'; // 门是橙黄色
            } else {
                ctx.fillStyle = '#a0ffa0'; // 其他植物浅绿色
            }
            ctx.fillRect(pl.c * this.gridSize * sx, pl.r * this.gridSize * sy, this.gridSize * sx, this.gridSize * sy);
        }

        // 阳光袋
        ctx.fillStyle = '#ffe14a';
        for (const s of this.suns) ctx.fillRect(s.x * sx - 1.5, s.y * sy - 1.5, 3, 3);
        
        // 僵尸
        ctx.fillStyle = '#ff5252';
        for (const zb of this.zombies) {
            if (zb.dead) continue;
            ctx.fillRect(zb.x * sx - 3, zb.y * sy - 3, 6, 6);
        }
        
        // 玩家与人机
        for (const p of this.allPlayers) {
            if (p.dead) continue;
            const isMe = p === this.player;
            let color = isMe ? '#00ff00' : p.color;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(p.x * sx, p.y * sy, isMe ? 6 : 5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    loop(time) {
        if (this.over) return;
        if (!this.lastTime) this.lastTime = time;
        const realDt = Math.min((time - this.lastTime) / 1000, 0.1);
        this.lastTime = time;

        const simulatedDt = realDt * (this.timeScale || 1.0);
        const steps = Math.max(1, Math.ceil(simulatedDt / 0.016));
        const dt = simulatedDt / steps;

        for (let i = 0; i < steps; i++) {
            this.gameTime += dt * 1000;
            this._tick(dt, this.gameTime);
        }
        
        this._render(); // 将样式更新移出高频逻辑循环，统一渲染

        this._updateMinimap();
        requestAnimationFrame(t => this.loop(t));
    }
    
    _render() {
        // 更新玩家
        if (this.player.el1) {
            this.player.el1.style.left = this.player.x + 'px';
            this.player.el1.style.top = this.player.y + 'px';
        }
        // 更新AI
        for (const ai of this.ais) {
            if (ai.el1 && !ai.dead) {
                ai.el1.style.left = ai.x + 'px';
                ai.el1.style.top = ai.y + 'px';
            }
        }
        // 更新僵尸
        for (const zb of this.zombies) {
            if (zb.el1 && !zb.dead) {
                zb.el1.style.left = zb.x + 'px';
                zb.el1.style.top = zb.y + 'px';
                if (zb.hpBg) {
                    zb.hpBg.style.left = (zb.x - 30) + 'px';
                    zb.hpBg.style.top = (zb.y - 60) + 'px';
                    zb.hpFg.style.width = Math.max(0, zb.hp / zb.maxHp * 100) + '%';
                }
                
                // 统一处理僵尸滤镜（性能优化）
                if (zb.hitFlashT > 0) {
                    zb.el1.style.filter = zb.slowT > 0 ? 'saturate(0.4) brightness(1.5)' : 'brightness(2.2)';
                } else if (zb.slowT > 0) {
                    zb.el1.style.filter = 'saturate(0.4) brightness(1.2)';
                } else if (zb.isHealing) {
                    zb.el1.style.filter = 'drop-shadow(0 0 10px #0f0)';
                } else if (zb.retreating) {
                    zb.el1.style.filter = 'drop-shadow(0 0 10px #00f)';
                } else {
                    zb.el1.style.filter = '';
                }
                
                // 统一处理僵尸透明度
                zb.el1.style.opacity = zb.retreating ? '0.5' : '1';
            }
        }
        // 更新子弹
        for (const pea of this.peas) {
            if (pea.el) {
                pea.el.style.left = pea.x + 'px';
                pea.el.style.top = pea.y + 'px';
            }
        }
        if (this.player2 && this.player2.el1 && !this.player2.dead) {
            this.player2.el1.style.left = this.player2.x + 'px';
            this.player2.el1.style.top = this.player2.y + 'px';
        }
        
        // 渲染高亮光标
        const c1 = Math.floor(this.player.x / this.gridSize) * this.gridSize;
        const r1 = Math.floor(this.player.y / this.gridSize) * this.gridSize;
        if (this.p1Cursor) {
            this.p1Cursor.style.display = 'block';
            this.p1Cursor.style.left = c1 + 'px';
            this.p1Cursor.style.top = r1 + 'px';
        }
        if (this.player2 && this.p2Cursor) {
            const c2 = Math.floor(this.player2.x / this.gridSize) * this.gridSize;
            const r2 = Math.floor(this.player2.y / this.gridSize) * this.gridSize;
            this.p2Cursor.style.display = 'block';
            this.p2Cursor.style.left = c2 + 'px';
            this.p2Cursor.style.top = r2 + 'px';
        }

        // 摄像机逻辑
        const vpw = this.vp1.clientWidth;
        const vph = this.vp1.clientHeight;
        let midX = this.player.x, midY = this.player.y, scale = 1;
        
        if (this.player2 && !this.player2.dead) {
            midX = (this.player.x + this.player2.x) / 2;
            midY = (this.player.y + this.player2.y) / 2;
            const dx = Math.abs(this.player.x - this.player2.x) + 300;
            const dy = Math.abs(this.player.y - this.player2.y) + 300;
            const scaleX = vpw / dx;
            const scaleY = vph / dy;
            scale = Math.max(0.4, Math.min(1.2, scaleX, scaleY));
        }
        

        
        const cx = Math.max(0, Math.min(this.worldWidth - vpw / scale, midX - vpw / 2 / scale));
        const cy = Math.max(0, Math.min(this.worldHeight - vph / scale, midY - vph / 2 / scale));
        
        this.world1.style.transform = `scale(${scale}) translate(${-cx}px, ${-cy}px)`;
    }


    _updateKMenus() {
        // 【优化3】冗余按键映射：为每个操作提供2-3个备用键。如果主键被硬件冲突屏蔽，玩家可以下意识用备用键
        this._handleKMenu(1, this.player, ['f', 'j'], ['altright', 'g', 'k'], ['w'], ['s'], this.p1Kmenu, this.p1Cursor);
        if (this.gameMode === '2p' && this.player2) {
            this._handleKMenu(2, this.player2, ['delete', 'shiftright', '1'], ['enter', 'controlright', '2'], ['arrowup'], ['arrowdown'], this.p2Kmenu, this.p2Cursor);
        }
    }
    
    _checkAnyKey(keyArr) {
        return keyArr.some(k => this.keysJustPressed[k] || this.keysJustPressed['Key'+k.toUpperCase()]);
    }
    
    _handleKMenu(pId, p, keysOk, keysCancel, keysUp, keysDown, uiEl, cursorEl) {
        const menu = this.kmenus[pId];
        
        if (this._checkAnyKey(keysCancel)) {
            menu.active = false;
            uiEl.style.display = 'none';
        }
        
        if (menu.active) {
            if (this._checkAnyKey(keysUp)) { menu.index = Math.max(0, menu.index - 1); this._renderKMenu(menu, uiEl); }
            if (this._checkAnyKey(keysDown)) { menu.index = Math.min(menu.options.length - 1, menu.index + 1); this._renderKMenu(menu, uiEl); }
            
            if (this._checkAnyKey(keysOk)) {
                const opt = menu.options[menu.index];
                if (opt) this._execKMenu(p, menu, opt);
                menu.active = false;
                uiEl.style.display = 'none';
            }
            return;
        }
        
        if (this._checkAnyKey(keysOk)) {
            const col = Math.floor(p.x / this.gridSize);
            const row = Math.floor(p.y / this.gridSize);
            const pl = this.plants.find(x => x.c === col && x.r === row);
            
            let room = this.rooms.find(rm => col >= rm.x && col < rm.x + rm.w && row >= rm.y && row < rm.y + rm.h);
            if (!room) room = this.rooms.find(rm => Math.abs(col - rm.doorCol) + Math.abs(row - rm.doorRow) <= 1);
            
            if (room && room.owners && room.owners.length > 0 && !room.owners.includes(p)) {
                this._flyText(col * 80 + 40, row * 80, '别人的地盘！', '#ff4b4b');
                return;
            }
            
            if (pl) {
                // 有植物 -> 升级/拆除
                menu.options = [];
                if (pl.def.up) menu.options.push({ action: 'up', text: `升级 (${pl.def.up.cost ? '☀'+pl.def.up.cost : ''} ${pl.def.up.sporeCost ? '🦠'+pl.def.up.sporeCost : ''})` });
                menu.options.push({ action: 'del', text: '拆除' });
                menu.targetPl = pl;
            } else {
                // 没植物 -> 种植
                if (this.walls.has(`${col},${row}`)) return;
                let isValid = room && true;
                if (!isValid) return; // 不在房间
                
                menu.options = HauntedDorm.MENU.map(t => {
                    const d = HauntedDorm.DEFS[t];
                    const price = d.sporeCost ? `🦠${d.sporeCost}` : (d.cost > 0 ? `☀${d.cost}` : '免费');
                    return { action: 'buy', type: t, text: `${d.name} (${price})` };
                });
                menu.targetCol = col;
                menu.targetRow = row;
                
                if (p.room && p.room !== room) {
                    this._flyText(col * 80 + 40, row * 80, '你已经有房间了！', '#ff4b4b');
                    return;
                }
            }
            
            menu.active = true;
            menu.index = 0;
            uiEl.style.display = 'block';
            uiEl.style.left = (col * 80 + 80) + 'px';
            uiEl.style.top = (row * 80) + 'px';
            this._renderKMenu(menu, uiEl);
        }
    }
    
    _renderKMenu(menu, uiEl) {
        uiEl.innerHTML = menu.options.map((opt, i) => 
            `<div style="padding:5px 10px; background:${i === menu.index ? '#fff' : 'transparent'}; color:${i === menu.index ? '#000' : '#fff'}; border-bottom:1px solid #444;">
                ${opt.text}
            </div>`
        ).join('');
    }
    
    _execKMenu(p, menu, opt) {
        if (opt.action === 'up') {
            const pl = menu.targetPl;
            const up = pl.def.up;
            if (p.sun >= (up.cost || 0) && p.spore >= (up.sporeCost || 0)) {
                this.addSun(-(up.cost || 0), p);
                this.addSpore(-(up.sporeCost || 0), p);
                this._evolve(pl, up.to);
                this.playSfx('plant.mp3', 0.5);
            } else {
                this.playSfx('buzzer.mp3', 0.3);
            }
        } else if (opt.action === 'del') {
            const pl = menu.targetPl;
            pl.el1.remove();
            if (pl.txtEl) pl.txtEl.remove();
            this.plants = this.plants.filter(x => x !== pl);
            this.addSun(Math.floor((pl.def.cost||0) * 0.5), p);
            this.addSpore(Math.floor((pl.def.sporeCost||0) * 0.5), p);
            this.playSfx('shovel.mp3', 0.5);
        } else if (opt.action === 'buy') {
            const type = opt.type;
            const def = HauntedDorm.DEFS[type];
            if (p.sun >= (def.cost || 0) && p.spore >= (def.sporeCost || 0)) {
                let room = this._insideRoom(menu.targetCol, menu.targetRow);
                if (!room) room = this.rooms.find(rm => Math.abs(menu.targetCol - rm.doorCol) + Math.abs(menu.targetRow - rm.doorRow) <= 1);
                
                if (room && room.owners && !room.owners.includes(p)) {
                    room.owners.push(p);
                    p.room = room;
                    if (room.owners.length === 1 && !this.plants.some(x => x.c === room.doorCol && x.r === room.doorRow)) {
                        this.spawnPlant(room.doorCol, room.doorRow, 'wallnut', true);
                        this.playSfx('plant.mp3', 0.5);
                    }
                }
                
                this.addSun(-(def.cost || 0), p);
                this.addSpore(-(def.sporeCost || 0), p);
                this.spawnPlant(menu.targetCol, menu.targetRow, type, false);
                this.playSfx('plant.mp3', 0.5);
            } else {
                this.playSfx('buzzer.mp3', 0.3);
            }
        }
    }

    _tick(dt, time) {
        for (const p of this.allPlayers) {
            if (p.skillCd > 0) {
                p.skillCd -= dt;
                if (p.skillCd <= 0) this._refreshHud();
            }
        }
        for (const zb of this.zombies) { if (zb.hitFlashT > 0) zb.hitFlashT -= dt; }
        this._updateGhostDirector(time);
        this._updateAIs(dt);
        if (Math.floor(time / 500) !== Math.floor((time - dt * 1000) / 500)) this._updateGhostChip(); // 0.5s 刷一次信息牌
        if (Math.floor(time / 1000) !== Math.floor((time - dt * 1000) / 1000)) this._refreshHud(); // 1s 刷一次 HUD (为了技能倒计时)

        for (const p of this.allPlayers) {
            if (p.sunBuffT > 0) p.sunBuffT -= dt;
            if (p.atkBuffT > 0) p.atkBuffT -= dt;
            if (p.speedBuffT > 0) p.speedBuffT -= dt;
            
            if (p.stealthT > 0) {
                p.stealthT -= dt;
                p.el1.style.opacity = '0.5';
            } else {
                p.el1.style.opacity = '1';
            }
            if (p.invincibleT > 0) {
                p.invincibleT -= dt;
                p.el1.style.filter = 'drop-shadow(0 0 10px #fff)';
            } else {
                p.el1.style.filter = '';
            }
        }

        const baseSpeed = this.isZombieFaction ? (HauntedDorm.GHOST_LEVELS[this.player.level-1].speed * (this.player.speedBuffT > 0 ? 1.5 : 1)) : (this.player.speedBuffT > 0 ? 800 : 400);
        let moveSpeed = baseSpeed;
        
        // 玩家如果在房间内，移动速度不吃时间倍速，防止10倍速下走位失控；在走廊则正常吃倍速（为了跑图快）
        const playerPhysRoom = this._insideRoom(Math.floor(this.player.x/this.gridSize), Math.floor(this.player.y/this.gridSize));
        if (playerPhysRoom) {
            moveSpeed = baseSpeed / this.timeScale;
        }

        // P1 Movement - 【SOC防冲突】
        let vx1 = 0, vy1 = 0;
        const p1L = this.keys['a'], p1R = this.keys['d'], p1U = this.keys['w'], p1D = this.keys['s'];
        if (p1L && !p1R) vx1 -= moveSpeed;
        if (p1R && !p1L) vx1 += moveSpeed;
        if (p1U && !p1D) vy1 -= moveSpeed;
        if (p1D && !p1U) vy1 += moveSpeed;

        let nx1 = this.player.x + vx1 * dt;
        let ny1 = this.player.y;
        if (nx1 > 20 && nx1 < this.worldWidth - 20 && !this.checkCollision(nx1, ny1, 10, this.player.isZombie)) this.player.x = nx1;
        nx1 = this.player.x; ny1 = this.player.y + vy1 * dt;
        if (ny1 > 30 && ny1 < this.worldHeight - 10 && !this.checkCollision(nx1, ny1, 10, this.player.isZombie)) this.player.y = ny1;

        // P2 Movement - 【SOC防冲突】
        if (this.player2 && !this.player2.dead) {
            let vx2 = 0, vy2 = 0;
            let moveSpeed2 = this.player2.speedBuffT > 0 ? 800 : 400;
            const p2PhysRoom = this._insideRoom(Math.floor(this.player2.x/this.gridSize), Math.floor(this.player2.y/this.gridSize));
            if (p2PhysRoom) moveSpeed2 = baseSpeed / this.timeScale;
            
            const p2L = this.keys['arrowleft'], p2R = this.keys['arrowright'], p2U = this.keys['arrowup'], p2D = this.keys['arrowdown'];
            if (p2L && !p2R) vx2 -= moveSpeed2;
            if (p2R && !p2L) vx2 += moveSpeed2;
            if (p2U && !p2D) vy2 -= moveSpeed2;
            if (p2D && !p2U) vy2 += moveSpeed2;

            let nx2 = this.player2.x + vx2 * dt;
            let ny2 = this.player2.y;
            if (nx2 > 20 && nx2 < this.worldWidth - 20 && !this.checkCollision(nx2, ny2, 10, this.player2.isZombie)) this.player2.x = nx2;
            nx2 = this.player2.x; ny2 = this.player2.y + vy2 * dt;
            if (ny2 > 30 && ny2 < this.worldHeight - 10 && !this.checkCollision(nx2, ny2, 10, this.player2.isZombie)) this.player2.y = ny2;
        }
        
        this._updateKMenus();
        this.keysJustPressed = {}; // 清空单帧按键缓存

        // 人机开局自动寻路（按路点走到床位，避免穿模穿墙）
        for (const ai of this.ais) {
            if (ai.dead) continue;
            
            // 发现僵尸逻辑
            let zombieNear = false;
            const zbTarget = this.isZombieFaction ? this.player : this.zombies[0];
            if (zbTarget && !zbTarget.dead && Math.hypot(ai.x - zbTarget.x, ai.y - zbTarget.y) < 350) {
                zombieNear = true;
            }

            // 【新增】人机抢盲盒机制
            if (!ai.dead && this.ghostSpawned && this.airdrops && this.airdrops.length > 0) {
                // 如果在自己房间待命，且僵尸不在附近，才有概率出门抢盲盒
                let isWellDeveloped = false;
                if (ai.room) {
                    const doorPlant = this.getPlantAt(ai.room.doorCol * 80, ai.room.doorRow * 80);
                    isWellDeveloped = (ai.sun > 1000 || (doorPlant && (!doorPlant.def.up || doorPlant.maxHp > 10000)));
                }
                
                if (ai.room && (!ai.path || ai.path.length === 0) && Math.random() < 0.001) {
                    this._say(ai, ["好无聊啊，僵尸怎么还不来？", "谁敢跟我比阳光多？", "外面的世界太危险，还是床舒服~", "睡一觉醒来，希望能赢！", "室友别抢我阳光啊！"][Math.floor(Math.random()*5)]);
                }
                if (isWellDeveloped && ai.room && (!ai.path || ai.path.length === 0) && !zombieNear && Math.random() < 0.005) {
                    const drop = this.airdrops[Math.floor(Math.random() * this.airdrops.length)];
                    ai.targetDrop = drop;
                    ai.path = this._findPath(ai.x, ai.y, drop.x, drop.y);
                    if (Math.random() < 0.5) this._say(ai, "发育好了！去抢盲盒！");
                }
                // 如果盲盒消失了，或者碰到僵尸靠近，立刻放弃目标回家！
                if (ai.targetDrop && ai.path && ai.path.length > 0) {
                    if (!this.airdrops.includes(ai.targetDrop) || zombieNear) {
                        if (zombieNear) this._say(ai, "僵尸来了，快撤！放弃盲盒保命！", 2500);
                        ai.targetDrop = null;
                        if (ai.room) {
                            const p = this._findPath(ai.x, ai.y, ai.room.frontX, ai.room.frontY);
                            p.push({ x: (ai.room.x + ai.room.tpl.beds[0].c) * 80 + 40, y: (ai.room.y + ai.room.tpl.beds[0].r) * 80 + 40 });
                            ai.path = p;
                            if (zombieNear) ai.speed = 300; // 吓得跑快点
                        }
                    }
                }
            }

            // 【新增】人机逃生机制
            if (ai.room && this.ghostSpawned) {
                const door = this.getPlantAt(ai.room.doorCol * 80, ai.room.doorRow * 80);
                if (!door && Math.random() < 0.05) { // 门破了，5%概率触发逃跑（防扎堆计算）
                    const oldRoom = ai.room;
                    ai.room.owners = ai.room.owners.filter(o => o !== ai);
                    ai.room = null;
                    this._flyText(ai.x, ai.y, "门破了！快跑！", "#ff5252");
                    
                    const candidateRooms = this.rooms.filter(r => {
                        if (r === oldRoom) return false;
                        const hasDoor = this.getPlantAt(r.doorCol*80, r.doorRow*80);
                        if (r.owners.length >= r.capacity && !hasDoor) return false; // 不去没门且被占的死胡同
                        return true;
                    });
                    if (candidateRooms.length > 0) {
                        ai.targetRoom = candidateRooms[Math.floor(Math.random() * candidateRooms.length)];
                        const p = this._findPath(ai.x, ai.y, ai.targetRoom.frontX, ai.targetRoom.frontY);
                        p.push({ x: (ai.targetRoom.x + ai.targetRoom.tpl.beds[0].c) * this.gridSize + 40, y: (ai.targetRoom.y + ai.targetRoom.tpl.beds[0].r) * this.gridSize + 40 });
                        ai.speed = 300; // 极速逃生
                        ai.path = p;
                    }
                }
            }

            if (ai.path && ai.path.length > 0) {
                // 获取玩家当前物理所在的房间
                const playerCol = Math.floor(this.player.x / this.gridSize);
                const playerRow = Math.floor(this.player.y / this.gridSize);
                const playerPhysicalRoom = this._insideRoom(playerCol, playerRow);
                
                // 房间被占用的条件：有owner，或者是玩家正站在里面的房间，或者是玩家已经绑定的房间
                const isTaken = (rm) => rm.owners.length >= rm.capacity || (rm === this.player.room && rm.owners.length >= rm.capacity);

                const isFleeing = ai.speed === 300;
                // 动态查房：如果目标房间已经被玩家抢了或玩家正站在里面，立刻换房（逃跑时不介意房间有人，直接躲进去共享）
                if (!isFleeing && ai.targetRoom && (isTaken(ai.targetRoom) && !ai.targetRoom.owners.includes(ai))) {
                    // Find a room where (current owners + AIs targeting it) < capacity
                    const emptyRooms = this.rooms.filter(r => {
                        if (isTaken(r)) return false;
                        const incoming = this.ais.filter(a => a !== ai && a.targetRoom === r).length;
                        return (r.owners.length + incoming) < r.capacity;
                    });
                    if (emptyRooms.length > 0) {
                        ai.targetRoom = emptyRooms[Math.floor(Math.random() * emptyRooms.length)];
                        const p = this._findPath(ai.x, ai.y, ai.targetRoom.frontX, ai.targetRoom.frontY);
                        p.push({ x: (ai.targetRoom.x + ai.targetRoom.tpl.beds[0].c) * this.gridSize + 40, y: (ai.targetRoom.y + ai.targetRoom.tpl.beds[0].r) * this.gridSize + 40 });
                        ai.path = p;
                        continue;
                    }
                }

                const target = ai.path[0];
                const dx = target.x - ai.x;
                const dy = target.y - ai.y;
                const dist = Math.hypot(dx, dy);
                if (dist > 5) {
                    ai.x += (dx / dist) * 200 * dt; // speed 200
                    ai.y += (dy / dist) * 200 * dt;
                } else {
                    ai.path.shift(); // 抵达当前路点，切下一个
                    // 彻底抵达床位，宣誓主权
                    if (ai.path.length === 0 && ai.targetRoom) {
                        if (ai.targetRoom.owners.length < ai.targetRoom.capacity && !(ai.targetRoom === this.player.room && ai.targetRoom.owners.length >= ai.targetRoom.capacity)) {
                            ai.targetRoom.owners.push(ai);
                            ai.room = ai.targetRoom;
                            ai.speed = 200;
                        } else if (isFleeing) {
                            ai.room = ai.targetRoom; // 躲进别人的房间，如果满了就不进owners，但认定为避难所
                            ai.speed = 200;
                        } else {
                            // 如果到了床边发现玩家站在这里或满员了，触发重新寻路
                            let foundNew = false;
                            for (const rm of this.rooms) {
                                if (rm.owners.length < rm.capacity && rm !== this.player.room) {
                                    ai.targetRoom = rm;
                                    const p = this._findPath(ai.x, ai.y, rm.frontX, rm.frontY);
                                    p.push({ x: (rm.x + rm.tpl.beds[0].c) * this.gridSize + 40, y: (rm.y + rm.tpl.beds[0].r) * this.gridSize + 40 });
                                    ai.path = p;
                                    foundNew = true;
                                    break;
                                }
                            }
                            if (!foundNew) ai.path = [{x: ai.x, y: ai.y}]; 
                        }
                    }
                }
                ai.el1.style.left = ai.x + 'px';
                ai.el1.style.top = ai.y + 'px';
            }
        }

        // 移除卡墙推挤（这会导致高速贴墙时被硬挤出地图或穿墙）
        // 墙永远是实体，不需要自救穿墙

        // 浇水（v4.0.15 per-player：P1 空格 / P2 0键 开关式——按一下持续浇水不用按住，0.2 秒一次；各加各的阳光）
        for (const p of this.allPlayers) {
            if (p.waterOn && !this.over && time - (p.lastWaterTime || 0) > 200) {
                p.lastWaterTime = time;
                this._water(p);
            }
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
        
        // 僵尸阵营玩家啃咬逻辑
        if (this.isZombieFaction && !this.player.dead) {
            // 每 2.4s 啃食身边的植物
            this.player.biteT = (this.player.biteT || 0) + dt;
            if (this.player.biteT >= 2.4) {
                let bitten = false;
                // 搜索身边的植物（优先啃门）
                for (const p of this.plants) {
                    if (p.def.ground) continue;
                    const px = p.c * 80 + 40, py = p.r * 80 + 40;
                    if (Math.hypot(this.player.x - px, this.player.y - py) < 80) { // 稍微大一点的判定范围
                        p.hp -= 100; // 玩家僵尸基础伤害100
                        this.playSfx('chomp.mp3', 0.25);
                        if (Math.random() < 0.1) this._say(this.player, ["太美味了！", "门像纸一样脆！", "我要吃光你们！"][Math.floor(Math.random()*3)]);
                        bitten = true;
                        const bg = p.el1.querySelector('.hp-bar-bg');
                        const fg = p.el1.querySelector('.hp-bar-fg');
                        if (bg) {
                            bg.style.display = 'block';
                            fg.style.width = Math.max(0, (p.hp / p.maxHp) * 100) + '%';
                        }
                        p.el1.style.transform = `translate(${(Math.random()-0.5)*10}px, ${(Math.random()-0.5)*10}px)`;
                        setTimeout(() => { if(p && p.el1) p.el1.style.transform = 'none'; }, 100);
                        if (p.hp <= 0) {
                            p.el1.remove();
                            if (p.txtEl) p.txtEl.remove();
                            this.plants = this.plants.filter(pl => pl !== p);
                        }
                        break; // 每次只啃一个
                    }
                }
                if (bitten) this.player.biteT = 0;
            }
            
            // 僵尸自动回血（地图中心）
            if (Math.hypot(this.player.x - this.worldWidth / 2, this.player.y - this.worldHeight / 2) < 120) {
                this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.maxHp * 0.25 * dt);
                this.player.el1.style.filter = 'drop-shadow(0 0 10px #0f0)';
            } else {
                this.player.el1.style.filter = '';
            }
            
            // 玩家僵尸时间升级逻辑
            const activeSeconds = this.gameTime / 1000;
            let targetLevel = 1;
            if (activeSeconds >= 30) targetLevel = 2;
            if (activeSeconds >= 90) targetLevel = 3;
            if (activeSeconds >= 150) targetLevel = 4;
            // 简单根据击杀升级（假设 kills 增加）
            targetLevel = Math.min(10, targetLevel + this.kills);
            if (this.player.level < targetLevel && this.player.level < 10) {
                this.player.level++;
                this.ghostLevel = this.player.level; // 同步给AI升级判断
                const cfg = HauntedDorm.GHOST_LEVELS[this.player.level - 1];
                this.player.maxHp = cfg.hp;
                this.player.hp = cfg.hp;
                const im = this.player.el1.querySelector('img');
                if (im) im.src = 'assets/images/' + cfg.img;
                const bdg = this.player.el1.querySelector('.lv-badge');
                if (bdg) bdg.innerText = 'Lv.' + this.player.level;
                this._announce(`👻 你已升级为【${cfg.name}】！`, 'finalwave.mp3', true);
            }
            
            // 接触AI造成秒杀（抓破门后吃人）
            // 开局前 5 秒无敌保护，防止一出生人机就被吃掉
            for (const ai of this.ais) {
                if (!ai.dead && this.gameTime > 5000 && Math.hypot(ai.x - this.player.x, ai.y - this.player.y) < 50) {
                    ai.dead = true;
                    ai.el1.remove();
                    this.playSfx('gulp.mp3', 0.8);
                    this.kills++;
                    this._announce(`🩸 击杀了一名幸存者！`, 'finalwave.mp3');
                    if (this.ais.every(a => a.dead)) {
                        this.gameOver(true); // 僵尸赢了
                    }
                }
            }
        }
        // 【新增】物资盲盒空投机制
        if (this.ghostSpawned && !this.over) {
            this.airdropTimer = (this.airdropTimer || 0) + dt;
            if (this.airdropTimer > 30) {
                this.airdropTimer = 0;
                let rx, ry;
                for (let tries = 0; tries < 50; tries++) {
                    const c = Math.floor(Math.random() * (this.cols - 2)) + 1;
                    const r = Math.floor(Math.random() * (this.rows - 2)) + 1;
                    if (this.walls.has(`${c},${r}`)) continue;
                    if (this._insideRoom(c, r)) continue;
                    rx = c * this.gridSize + 40;
                    ry = r * this.gridSize + 40;
                    break;
                }
                if (rx && ry) {
                    const box = { x: rx, y: ry, life: 25 };
                    const el = document.createElement('div');
                    el.className = 'entity';
                    const icons = ['🎁', '📦', '💎', '💰', '🎒', '🏆'];
                    const icon = icons[Math.floor(Math.random() * icons.length)];
                    el.style.cssText = `width:70px; height:70px; z-index:50; left:${rx}px; top:${ry}px;`;
                    el.innerHTML = `<div style="font-size:60px; transform:translate(-50%, -50%); filter:drop-shadow(0 0 15px #ff00ff);">${icon}</div>`;
                    this.world1.appendChild(el);
                    box.el = el;
                    if (!this.airdrops) this.airdrops = [];
                    this.airdrops.push(box);
                    this._announce('🎁 神秘盲盒已空降过道！快出房抢！', 'readysetplant.mp3');
                }
            }
        }
        if (this.airdrops) {
            for (let i = this.airdrops.length - 1; i >= 0; i--) {
                const a = this.airdrops[i];
                a.life -= dt;
                a.el.style.opacity = Math.min(1, a.life / 2);
                if (a.life <= 0) {
                    a.el.remove();
                    this.airdrops.splice(i, 1);
                    continue;
                }
                
                // AI 抢夺检测
                let pickedByAI = null;
                for (const ai of this.ais) {
                    if (!ai.dead && Math.hypot(ai.x - a.x, ai.y - a.y) < 50) {
                        pickedByAI = ai;
                        break;
                    }
                }
                if (pickedByAI) {
                    pickedByAI.sun += 1000;
                    pickedByAI.spore += 100;
                    this._flyText(a.x, a.y, '🤖 盲盒被AI抢走了！', '#aaa');
                    this.playSfx('sun.mp3', 0.5);
                    a.el.remove();
                    this.airdrops.splice(i, 1);
                    // AI 抢到后回家
                    if (pickedByAI.room) {
                        const p = this._findPath(pickedByAI.x, pickedByAI.y, pickedByAI.room.frontX, pickedByAI.room.frontY);
                        p.push({ x: (pickedByAI.room.x + pickedByAI.room.tpl.beds[0].c) * 80 + 40, y: (pickedByAI.room.y + pickedByAI.room.tpl.beds[0].r) * 80 + 40 });
                        pickedByAI.path = p;
                        pickedByAI.targetDrop = null;
                    }
                    continue;
                }

                let pickedByPlayer = null;
                if (Math.hypot(this.player.x - a.x, this.player.y - a.y) < 50) pickedByPlayer = this.player;
                else if (this.gameMode === '2p' && this.player2 && !this.player2.dead && Math.hypot(this.player2.x - a.x, this.player2.y - a.y) < 50) pickedByPlayer = this.player2;

                if (pickedByPlayer) {
                    const r = Math.floor(Math.random() * 15);
                    switch(r) {
                        case 0:
                            this.addSun(800, pickedByPlayer);
                            this._flyText(a.x, a.y, '☀️ 阳光暴雨 (+800)', '#ffeb3b');
                            break;
                        case 1:
                            this.addSpore(80, pickedByPlayer);
                            this._flyText(a.x, a.y, '🦠 孢子丰收 (+80)', '#c79aff');
                            break;
                        case 2:
                            pickedByPlayer.hp = Math.min((pickedByPlayer.maxHp || 100), pickedByPlayer.hp + 50);
                            this.setHp();
                            this._flyText(a.x, a.y, '💖 强效急救包 (+50血)', '#0f0');
                            break;
                        case 3:
                            pickedByPlayer.invincibleT = 15;
                            this._flyText(a.x, a.y, '🛡️ 无敌护盾 (15s)', '#fff');
                            break;
                        case 4:
                            pickedByPlayer.speedBuffT = 15;
                            this._flyText(a.x, a.y, '🚀 飞毛腿 (移速翻倍)', '#0ff');
                            break;
                        case 5:
                            if (this.zombies[0] && !this.zombies[0].dead) {
                                this.zombies[0].hp -= this.zombies[0].maxHp * 0.1;
                                this._flyText(a.x, a.y, '💣 全屏核爆 (-10%BOSS血)', '#ff5252');
                                if (this.zombies[0].hp <= 0) this._killZombie(this.zombies[0]);
                            }
                            break;
                        case 6:
                            if (this.zombies[0] && !this.zombies[0].dead) {
                                this.zombies[0].stunT = 10;
                                this._flyText(a.x, a.y, '❄️ 绝对零度 (冻结10s)', '#7fd8ff');
                            }
                            break;
                        case 7:
                            this.player.stealthT = 20;
                            this._flyText(a.x, a.y, '👻 隐身斗篷 (20s无视你)', '#aaa');
                            break;
                        case 8:
                            this.player.hp -= 10;
                            this.addSun(1500);
                            this._flyText(a.x, a.y, '💰 恶魔交易 (-10血, +1500阳光)', '#ffeb3b');
                            if (this.player.hp <= 0) this.gameOver(false);
                            break;
                        case 9:
                            if (this.zombies[0] && !this.zombies[0].dead && this.ghostLevel > 1) {
                                this.ghostLevel--;
                                this._flyText(a.x, a.y, '📉 僵尸降级 (Lv-1)', '#ff5252');
                            } else {
                                this.addSun(500);
                                this._flyText(a.x, a.y, '☀️ 阳光替代 (+500)', '#ffeb3b');
                            }
                            break;
                        case 10:
                            for (const pl of this.plants) {
                                if (pl.c >= this.player.x/80 - 10 && pl.c <= this.player.x/80 + 10) {
                                    pl.hp = pl.def.hp || pl.maxHp || pl.hp;
                                }
                            }
                            this._flyText(a.x, a.y, '🍄 圣光洗礼 (植物全回血)', '#0f0');
                            break;
                        case 11:
                            this.spawnPlant(Math.floor(this.player.x/80), Math.floor(this.player.y/80), 'doomshroom');
                            this._flyText(a.x, a.y, '🎁 意外之喜 (白给毁灭重炮)', '#ff00ff');
                            break;
                        case 12:
                            this.player.hp -= 30;
                            this._flyText(a.x, a.y, '☠️ 倒霉透顶 (-30血)', '#ff0000');
                            if (this.player.hp <= 0) this.gameOver(false);
                            break;
                        case 13:
                            for(const pl of this.plants) { if(pl.shootCd !== undefined) pl.shootCd = 0; }
                            this._flyText(a.x, a.y, '⏱️ 时光倒流 (全图植物冷却清零)', '#00ffff');
                            break;
                        case 14:
                            if (this.zombies[0] && !this.zombies[0].dead) {
                                this.zombies[0].speed *= 1.5;
                                this.zombies[0].hp = this.zombies[0].maxHp;
                                this._flyText(a.x, a.y, '🧟 僵尸狂暴 (僵尸满血且移速暴增)', '#ff0000');
                            } else {
                                this.addSun(500);
                                this._flyText(a.x, a.y, '☀️ 阳光替代 (+500)', '#ffeb3b');
                            }
                            break;
                    }
                    this.playSfx('sun.mp3', 0.5);
                    a.el.remove();
                    this.airdrops.splice(i, 1);
                }
            }
        }


        // 僵尸AI：追踪玩家，啃食沿途植物，接触玩家掉血；撞墙自动切向绕行
        // v3.90.0：啃咬改离散慢咬——站在植物上一口一口啃（2.4s/口），不再逐帧持续扣血（用户：开局啃门要非常慢）；
        //          咬力随等级上涨（升级既涨血量也涨实际战力）
        const lv = this.ghostLevel;
        const biteDmg = 10 + 8 * (lv - 1);       // 降低伤害（根据用户反馈下调）
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
            // 根据用户要求，撤退时不再使用 1000 冲刺速度，而是保持普通走路速度
            const spd = zb.retreating ? zb.speed : (zb.speed * (zb.slowT > 0 ? 0.5 : 1));

            // 找综合仇恨值最高的目标（距离、门血量、门等级综合判断）
            zb.targetEvalT = (zb.targetEvalT || 0) + dt;
            let closestTarget = zb.lockedTarget;
            
            // 每 8 秒或者当前目标死亡，强制重新评估全场最弱的人
            if (!closestTarget || closestTarget.dead || zb.targetEvalT > 8) {
                zb.targetEvalT = 0;
                let minScore = Infinity;
                let weakestTarget = null;
                for (const p of this.allPlayers) {
                    if (p.hp <= 0 || p.dead) continue;
                    if (p === this.player && this.player.stealthT > 0) continue; 
                    let score = Math.hypot(p.x - zb.x, p.y - zb.y);
                    const rm = p.room || this.rooms.find(r => p.x >= r.x*80 && p.x <= (r.x+r.w)*80 && p.y >= r.y*80 && p.y <= (r.y+r.h)*80);
                    let doorHpScore = 0;
                    if (rm) {
                        const doorPlant = this.getPlantAt(rm.doorCol * 80, rm.doorRow * 80);
                        if (doorPlant) {
                            // 极大地增加防御设施的权重，确保僵尸主动换线去抓防御薄弱的人
                            doorHpScore = (doorPlant.hp * 0.2) + (doorPlant.def.tier || 1) * 2500; 
                        } else {
                            doorHpScore = -50000; // 门破了！绝对优先干他！
                        }
                    }
                    score += doorHpScore;
                    if (score < minScore) { minScore = score; weakestTarget = p; }
                }
                
                if (weakestTarget && weakestTarget !== closestTarget) {
                    zb.lockedTarget = weakestTarget;
                    closestTarget = weakestTarget;
                    zb.targetSwitched = true;
                    if (Math.random() < 0.6) {
                        const zLines = ["发现软柿子！", "那个门最破，就你了！", "让我尝尝你的脑子！", "我要去吃最弱的那个！", "这扇门看起来一碰就碎！"];
                        this._say(zb, zLines[Math.floor(Math.random() * zLines.length)], 4000);
                    }
                }
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
            if (zb.hp < zb.maxHp * 0.3) zb.retreating = true;
            if (zb.hp >= zb.maxHp) zb.retreating = false;
            
            if (zb.retreating) {
                zb.slowT = 0; // 逃跑时免疫减速
                zb.stunT = 0; // 逃跑时免疫眩晕
                targetX = this.worldWidth / 2;
                targetY = 200; // 回到地图上方主干道，而不是中心（中心可能是墙壁）
                if (Math.hypot(targetX - zb.x, targetY - zb.y) < 120) {
                    zb.hp = Math.min(zb.maxHp, zb.hp + zb.maxHp * 0.25 * dt); // 回血变快
                    if (zb.hpBg) zb.hpBg.style.display = 'block';
                    zb.isHealing = true;
                } else {
                    zb.isHealing = false;
                }
            } else {
                zb.isHealing = false;
            }
            // 僵尸寻路逻辑：无论攻击还是撤退都走寻路，防止穿墙瞬移
            zb.pathTimer = (zb.pathTimer || 0) + dt;
            // 移除 zb.path.length === 0，防止僵尸到达目标门时每帧疯狂调用 BFS 导致严重卡顿
            if (zb.pathTimer > 1.0 || !zb.path || zb.targetSwitched) {
                zb.pathTimer = 0;
                zb.targetSwitched = false;
                zb.path = this._findPath(zb.x, zb.y, targetX, targetY);
                if (zb.path && zb.path.length > 0) {
                    zb.path.push({x: targetX, y: targetY}); // 确保最后一步精确定位到玩家
                }
            }

            let dx = 0, dy = 0;
            if (!zb.path || zb.path.length === 0) {
                dx = targetX - zb.x;
                dy = targetY - zb.y;
            } else {
                let nextNode = zb.path[0];
                dx = nextNode.x - zb.x;
                dy = nextNode.y - zb.y;
                if (Math.hypot(dx, dy) < 10) {
                    zb.path.shift();
                    if (zb.path.length > 0) {
                        nextNode = zb.path[0];
                        dx = nextNode.x - zb.x;
                        dy = nextNode.y - zb.y;
                    }
                }
            }

            const len = Math.hypot(dx, dy);

            if (len > 1) {
                dx /= len; dy /= len;


                // 【僵尸转身逻辑】正着走
                if (zb.imgEl) {
                    if (dx > 0.05) zb.imgEl.style.transform = 'translate(-20%, -30%) scaleX(-1)';
                    else if (dx < -0.05) zb.imgEl.style.transform = 'translate(-20%, -30%) scaleX(1)';
                }

                let moved = false;
                const nzx = zb.x + dx * spd * dt;
                const nzy = zb.y + dy * spd * dt;

                // 先看目标前方25像素的格子有没有植物（啃食优先；地刺贴地不挡路不被啃）
                // 因为僵尸自身有15像素碰撞体积，用 nzx 可能会判定在自己脚下导致找不到前面的门
                const probeX = zb.x + dx * 25;
                const probeY = zb.y + dy * 25;
                const atkPlant = this.getPlantAt(probeX, probeY);
                if (atkPlant && !atkPlant.def.ground && !zb.retreating) {
                    // 站定慢啃：每 2.4s 一口，一口一口咬
                    zb.biteT = (zb.biteT || 0) + dt;
                    if (zb.biteT >= BITE_CD) {
                        zb.biteT = 0;
                        atkPlant.hp -= biteDmg;
                        this.playSfx('chomp.mp3', 0.25);
                        if (Math.random() < 0.05) this._say(zb, ["这门真硬！", "看我咬碎它！", "饿饿饿饿饿！", "别以为躲在里面就安全！"][Math.floor(Math.random()*4)]);
                        const bg = atkPlant.el1.querySelector('.hp-bar-bg');
                        const fg = atkPlant.el1.querySelector('.hp-bar-fg');
                        if (bg) {
                            bg.style.display = 'block';
                            fg.style.width = Math.max(0, (atkPlant.hp / atkPlant.maxHp) * 100) + '%';
                        }
                        // 受击抖动反馈（使用 CSS class 以避免 setTimeout 和内联样式卡顿）
                        atkPlant.el1.classList.add('shake');
                        if (!atkPlant._shakeT) {
                            atkPlant._shakeT = setTimeout(() => { if(atkPlant && atkPlant.el1) atkPlant.el1.classList.remove('shake'); atkPlant._shakeT = null; }, 100);
                        }
                        if (atkPlant.hp <= 0) {
                            atkPlant.el1.remove();
                            if (atkPlant.txtEl) atkPlant.txtEl.remove();
                            this.plants = this.plants.filter(p => p !== atkPlant);
                            // if (atkPlant.isDoor) this._levelUpGhostDirect(); // 用户要求：破门不再升级，只有按时间和击杀玩家升级
                        }
                    }
                    moved = false; // 啃食时不挪窝
                } else {
                    // 撤退时也不再无脑穿墙，老老实实寻路走路
                    const bx = !this.checkCollision(nzx, zb.y, 15, true);
                    const by = !this.checkCollision(zb.x, nzy, 15, true);
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
                if (p.dead) continue;
                if (Math.hypot(p.x - zb.x, p.y - zb.y) < 50) {
                    // 如果中间隔着门（玩家在房间里且门活着，僵尸在外面），则免疫接触伤害
                    const pRm = this._insideRoom(Math.floor(p.x/80), Math.floor(p.y/80));
                    let safeBehindDoor = false;
                    if (pRm) {
                        const doorPlant = this.getPlantAt(pRm.doorCol*80, pRm.doorRow*80);
                        const zRm = this._insideRoom(Math.floor(zb.x/80), Math.floor(zb.y/80));
                        if (doorPlant && zRm !== pRm) safeBehindDoor = true;
                    }
                    
                    if (!safeBehindDoor) {
                        if (p === this.player) {
                            if (!this.player.invincibleT || this.player.invincibleT <= 0) {
                                playerHurt += touchDps * dt;
                            }
                        } else {
                            p.hp -= touchDps * dt;
                            this.setHp(); // 更新P2血条UI
                            if (p.hp <= 0 && !p.dead) {
                                p.dead = true;
                                p.el1.classList.add('dead-slash');
                                p.el1.style.filter = 'grayscale(1)';
                                if (this.ghostLevel >= 4) this._levelUpGhostDirect();
                            }
                        }
                        
                        // 所有人受击都会被微击退，防止被挤进墙角卡死
                        const angle = Math.atan2(p.y - zb.y, p.x - zb.x);
                        const pushSpd = 200;
                        const nx = p.x + Math.cos(angle) * pushSpd * dt;
                        const ny = p.y + Math.sin(angle) * pushSpd * dt;
                        if (!this.checkCollision(nx, p.y, 10, p.isZombie)) p.x = nx;
                        if (!this.checkCollision(p.x, ny, 10, p.isZombie)) p.y = ny;
                    }
                }
            }
            zb.el1.style.left = zb.x + 'px'; zb.el1.style.top = zb.y + 'px';
        }
        this.zombies = this.zombies.filter(z => !z.dead || z.el1.parentNode); // 清理已完成动画的死尸

        // 警告系统更新
        let isTargeted = false;
        if (!this.isZombieFaction && this.zombies.length > 0) {
            const zb = this.zombies[0];
            if (!zb.dead && zb.lockedTarget === this.player && !zb.retreating) {
                isTargeted = true;
            }
        }
        if (this.warningOverlay === undefined) {
            this.warningOverlay = document.getElementById('zombie-warning');
            this.warningText = document.getElementById('zombie-warning-text');
        }
        let warningOverlay = this.warningOverlay;
        let warningText = this.warningText;
        if (!warningOverlay) {
            warningOverlay = document.createElement('div');
            warningOverlay.id = 'zombie-warning';
            this.warningOverlay = warningOverlay;
            warningOverlay.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                pointer-events: none; z-index: 1000;
                box-shadow: inset 0 0 150px rgba(255, 0, 0, 0.5);
                opacity: 0;
                transition: opacity 0.5s;
                display: flex; align-items: flex-end; justify-content: center;
                padding-bottom: 80px;
            `;
            warningText = document.createElement('div');
            warningText.id = 'zombie-warning-text';
            warningText.style.cssText = `
                color: #ff3333; font-size: 36px; font-weight: bold; text-shadow: 0 0 15px #000, 2px 2px 6px #000;
                opacity: 1;
                font-family: 'Kaiti SC', 'SimHei', sans-serif;
                letter-spacing: 2px;
            `;
            warningText.innerText = "僵尸已经盯上你了，请你注意！";
            warningOverlay.appendChild(warningText);
            document.body.appendChild(warningOverlay);
            this.warningText = warningText;
        }

        if (warningOverlay) {
            if (isTargeted) {
                // 使用 opacity 开关配合 CSS 动画，避免每帧改 boxShadow 导致严重卡顿
                warningOverlay.style.opacity = '1';
                // 使用 css animation 进行呼吸，防止主线程卡顿
                if (!warningOverlay.classList.contains('pulse-anim')) {
                    warningOverlay.classList.add('pulse-anim');
                    if (!document.getElementById('pulse-style')) {
                        const style = document.createElement('style');
                        style.id = 'pulse-style';
                        style.innerHTML = `@keyframes dangerPulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } } .pulse-anim { animation: dangerPulse 1.5s infinite; }`;
                        document.head.appendChild(style);
                    }
                }
            } else {
                warningOverlay.style.opacity = '0';
                warningOverlay.classList.remove('pulse-anim');
            }
        }

        if (playerHurt > 0 && !this.player.dead) {
            this.player.hp -= playerHurt;
            this.setHp();
            this.flashDamage();
            if (this.player.hp <= 0) { 
                this.player.dead = true;
                this.player.el1.classList.add('dead-slash');
                this.player.el1.style.filter = 'grayscale(1)';
                this.gameOver(false); 
                return; 
            }
        }

        this.player.el1.style.left = this.player.x + 'px';
        this.player.el1.style.top = this.player.y + 'px';

        const vpw = this.vp1.clientWidth;
        const vph = this.vp1.clientHeight;

        const cx = Math.max(0, Math.min(this.worldWidth - vpw, this.player.x - vpw / 2));
        const cy = Math.max(0, Math.min(this.worldHeight - vph, this.player.y - vph / 2));
        this.player.camX = cx; this.player.camY = cy;
        this.world1.style.transform = `translate(${-cx}px, ${-cy}px)`;
    }

}

window.onload = () => {
    window.game = new HauntedDorm();
};
