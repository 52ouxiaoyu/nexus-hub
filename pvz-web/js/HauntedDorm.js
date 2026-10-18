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
            // —— 阳光系 (v4.0.53 重排：按用户清单与产阳光量定级——阳光菇→大阳光菇→向日葵→豌豆向日葵→双子向日葵→杨桃(星星果)→毁灭向日葵→四头向日葵→水晶向日葵→魅惑向日葵→石芒杨桃；
            //      每 0.4s 一跳、无需浇水按键；产 1→1024 翻倍；v4.0.46：作息反转——白天醒着产阳光，夜晚熄灯睡觉) ——
            sunshroom:     { tier: 1, name: '阳光菇',   img: 'Plants/SunShroom/0.gif',   hp: 1000, cost: 0, nightOnly: true,
                             produce: { sun: 1, every: 0.4 }, up: { cost: 25, to: 'bigsunshroom' } },
            bigsunshroom:  { tier: 2, name: '大阳光菇', img: 'Plants/SunShroom/0.gif',   hp: 1500, cost: 0, scale: 1.2, nightOnly: true,
                             produce: { sun: 2, every: 0.4 }, up: { cost: 50, to: 'sunflower' } },
            sunflower:     { tier: 3, name: '向日葵',   img: 'Plants/SunFlower/0.gif',   hp: 2000, cost: 0, scale: 1.0, nightOnly: true,
                             produce: { sun: 4, every: 0.4 }, up: { cost: 100, to: 'peasunflower' } },
            peasunflower:  { tier: 4, name: '豌豆向日葵',img: 'Plants/SunFlower/SunFlower1.gif', overlay: 'Plants/Peashooter/Peashooter.gif', hp: 2500, cost: 0, scale: 1.1, nightOnly: true,
                             overTransform: 'translate(-50%, -50%) translate(0px, -28px) scale(0.6)',
                             produce: { sun: 8, every: 0.4 }, up: { cost: 200, to: 'twinsunflower' } },
            twinsunflower: { tier: 5, name: '双子向日葵',img: 'Plants/TwinSunflower/TwinSunflower1.gif', hp: 5000, cost: 0, scale: 1.1, nightOnly: true,
                             produce: { sun: 16, every: 0.4 }, up: { cost: 800, sporeCost: 16, to: 'starfruit' } },
            starfruit:     { tier: 6, name: '杨桃',     img: 'Plants/Starfruit/Starfruit.gif', hp: 7000, cost: 0, scale: 1.1, nightOnly: true, // v4.0.53：新——杨桃=星星果，五角放射产阳光
                             produce: { sun: 32, every: 0.4 }, up: { cost: 1600, sporeCost: 32, to: 'doomsunflower' } },
            doomsunflower: { tier: 7, name: '毁灭向日葵',img: 'Plants/SunFlower/SunFlower1.gif', hp: 8000, cost: 0, scale: 1.2, tint: 'grayscale(0.8) brightness(0.6) sepia(1) hue-rotate(240deg) saturate(3)', nightOnly: true,
                             produce: { sun: 64, every: 0.4 }, up: { cost: 3200, sporeCost: 64, to: 'fourheadsunflower' } },
            fourheadsunflower:{ tier: 8, name: '四头向日葵',img: 'Plants/TwinSunflower/TwinSunflower1.gif', hp: 12000, cost: 0, scale: 1.15, tint: 'saturate(1.35) brightness(1.12)', nightOnly: true,
                             overlay: 'Plants/TwinSunflower/TwinSunflower1.gif',
                             overTransform: 'translate(-50%, -50%) translate(10px, 6px) scaleX(-1) scale(1.15)',
                             produce: { sun: 128, every: 0.4 }, up: { cost: 6400, sporeCost: 128, to: 'crystalsunflower' } },
            crystalsunflower:{ tier: 9, name: '水晶向日葵',img: 'Plants/TwinSunflower/TwinSunflower1.gif', hp: 16000, cost: 0, scale: 1.25, // v4.0.53：新——冰蓝水晶质感多头
                             tint: 'hue-rotate(180deg) saturate(1.6) brightness(1.3) drop-shadow(0 0 8px #7fd8ff)',
                             overlay: 'Plants/TwinSunflower/TwinSunflower1.gif',
                             overTransform: 'translate(-50%, -50%) translate(10px, 6px) scaleX(-1) scale(1.15)',
                             produce: { sun: 256, every: 0.4 }, up: { cost: 12800, sporeCost: 256, to: 'charmsunflower' } },
            charmsunflower:{ tier: 10, name: '魅惑向日葵',img: 'Plants/TwinSunflower/TwinSunflower1.gif', hp: 20000, cost: 0, scale: 1.35, // v4.0.53：新——粉紫魅惑光晕多头
                             tint: 'hue-rotate(290deg) saturate(1.8) brightness(1.15) drop-shadow(0 0 10px #ff9de0)',
                             overlay: 'Plants/TwinSunflower/TwinSunflower1.gif',
                             overTransform: 'translate(-50%, -50%) translate(10px, 6px) scaleX(-1) scale(1.15)',
                             produce: { sun: 512, every: 0.4 }, up: { cost: 25600, sporeCost: 512, to: 'stonestarfruit' } },
            stonestarfruit:{ tier: 11, name: '石芒杨桃', img: 'Plants/Starfruit/Starfruit.gif', hp: 25000, cost: 0, scale: 1.35, // v4.0.53：新——岩石质感巨型杨桃
                             tint: 'grayscale(0.35) sepia(0.6) saturate(1.6) brightness(0.95) drop-shadow(0 0 8px #ffcc80)',
                             produce: { sun: 1024, every: 0.4 } },

            // —— 豌豆系 (v4.0.53 重排：豌豆射手→卷心菜投手→玉米投手→双向投手→双向豌豆→寒冰豌豆→双发豌豆→三线豌豆→机枪射手→
            //      西瓜投手→冰西瓜投手→猫尾草→超级机箱→机箱猫尾草→西瓜猫尾草→冰西瓜猫尾草；伤害 1→32768 翻倍、射程 3→8 格) ——
            peashooter:    { tier: 1, name: '豌豆射手', img: 'Plants/Peashooter/Peashooter.gif',   card: 'Peashooter.png', hp: 300, cost: 8,
                             shoot: { dmg: 1, cd: 1.5, n: 1, range: 240, img: 'Plants/PB00.gif', homing: true },
                             up: { cost: 16, to: 'cabbagepult' } },
            cabbagepult:   { tier: 2, name: '卷心菜投手', img: 'Plants/CabbagePult/CabbagePult.png',   hp: 400, cost: 0,
                             shoot: { dmg: 2, cd: 1.5, n: 1, range: 280, img: 'Plants/PB00.gif', homing: true },
                             up: { cost: 32, to: 'kernelpult' } },
            kernelpult:    { tier: 3, name: '玉米投手',   img: 'Plants/KernelPult/KernelPult.png',    hp: 500, cost: 0,
                             shoot: { dmg: 4, cd: 1.5, n: 1, range: 320, img: 'Plants/PB00.gif', homing: true },
                             up: { cost: 64, to: 'dualpea' } },
            dualpea:       { tier: 4, name: '双向投手', img: 'Plants/SplitPea/SplitPea.gif',      hp: 600, cost: 0,
                             shoot: { dmg: 8, cd: 1.5, n: 1, range: 360, img: 'Plants/PB00.gif', homing: true },
                             up: { cost: 128, to: 'bidipea' } },
            bidipea:       { tier: 5, name: '双向豌豆', img: 'Plants/SplitPea/SplitPea.gif',      hp: 700, cost: 0, // v4.0.53：新——前后双向连发
                             tint: 'hue-rotate(200deg) saturate(1.4) brightness(1.05)',
                             shoot: { dmg: 16, cd: 1.3, n: 2, range: 400, img: 'Plants/PB00.gif', homing: true },
                             up: { cost: 256, to: 'snowpea' } },
            snowpea:       { tier: 6, name: '寒冰豌豆', img: 'Plants/SnowPea/SnowPea.gif',       hp: 800, cost: 0, scale: 1.1,
                             shoot: { dmg: 32, cd: 1.5, n: 1, range: 420, img: 'Plants/PB00.gif', homing: true, slow: true },
                             up: { cost: 512, to: 'repeater' } },
            repeater:      { tier: 7, name: '双发豌豆', img: 'Plants/Repeater/Repeater.gif',      hp: 1000, cost: 0, scale: 1.1,
                             shoot: { dmg: 64, cd: 1.5, n: 2, range: 440, img: 'Plants/PB00.gif', homing: true },
                             up: { cost: 1024, to: 'threepeater' } },
            threepeater:   { tier: 8, name: '三线豌豆', img: 'Plants/Threepeater/Threepeater.gif',   hp: 1500, cost: 0, scale: 1.2,
                             shoot: { dmg: 128, cd: 1.5, n: 3, range: 480, img: 'Plants/PB00.gif', homing: true },
                             up: { cost: 2048, to: 'gatlingpea' } },
            gatlingpea:    { tier: 9, name: '机枪射手', img: 'Plants/GatlingPea/GatlingPea.gif',    hp: 2500, cost: 0, scale: 1.2,
                             shoot: { dmg: 256, cd: 1.2, n: 4, range: 520, img: 'Plants/PB00.gif', homing: true },
                             up: { cost: 4096, to: 'melonpult' } },
            melonpult:     { tier: 10, name: '西瓜投手', img: 'Plants/MelonPult/MelonPult.png',   hp: 3200, cost: 0, scale: 1.2, // v4.0.53：新——抛射大西瓜范围溅射
                             shoot: { dmg: 512, cd: 2.2, n: 1, range: 540, img: 'Plants/MelonPult/Melon.png', homing: true, aoe: 70 },
                             up: { cost: 8192, to: 'wintermelon' } },
            wintermelon:   { tier: 11, name: '冰西瓜投手', img: 'Plants/WinterMelon/WinterMelon.png', hp: 3800, cost: 0, scale: 1.2, // v4.0.53：新——冰西瓜溅射+减速（v4.0.54 修复：本体图原来是 MelonPult 目录的弹药小图，改回正确投手本体）
                             shoot: { dmg: 1024, cd: 2.2, n: 1, range: 560, img: 'Plants/MelonPult/WinterMelon_small.png', homing: true, aoe: 80, slow: true },
                             up: { cost: 16384, to: 'cattail' } },
            cattail:       { tier: 12, name: '猫尾草', img: 'Plants/Cattail/Cattail.gif',       hp: 4200, cost: 0, scale: 1.15, // v4.0.53：新——尖刺针雨自动索敌
                             shoot: { dmg: 2048, cd: 1.1, n: 3, range: 580, img: 'Plants/Cattail/Cattail.png', homing: true },
                             up: { cost: 32768, to: 'superbox' } },
            superbox:      { tier: 13, name: '超级机箱', img: 'Plants/GatlingPea/GatlingPea.gif', hp: 5000, cost: 0, scale: 1.25, // v4.0.53：新——金色重炮机箱
                             tint: 'sepia(1) saturate(2.4) hue-rotate(-12deg) brightness(1.1) drop-shadow(0 0 6px #ffd54a)',
                             shoot: { dmg: 4096, cd: 1.0, n: 5, range: 600, img: 'Plants/PB00.gif', homing: true },
                             up: { cost: 65536, to: 'machinestail' } },
            machinestail:  { tier: 14, name: '机箱猫尾草', img: 'Plants/Cattail/Cattail.gif',   hp: 6000, cost: 0, scale: 1.2, // v4.0.53：新——机枪猫尾草（金属色）
                             tint: 'grayscale(0.3) sepia(0.8) saturate(1.6) brightness(1.05) drop-shadow(0 0 6px #bdbdbd)',
                             overlay: 'Plants/GatlingPea/GatlingPea.gif', overTransform: 'translate(-50%, -50%) translate(0px, -24px) scale(0.55)',
                             shoot: { dmg: 8192, cd: 0.95, n: 5, range: 620, img: 'Plants/PB00.gif', homing: true },
                             up: { cost: 131072, to: 'melonstail' } },
            melonstail:    { tier: 15, name: '西瓜猫尾草', img: 'Plants/Cattail/Cattail.gif',   hp: 7000, cost: 0, scale: 1.2, // v4.0.53：新——西瓜猫尾草（绿瓜纹）
                             tint: 'hue-rotate(90deg) saturate(1.5) brightness(1.0)',
                             overlay: 'Plants/MelonPult/Melon.png', overTransform: 'translate(-50%, -50%) translate(0px, -22px) scale(0.6)',
                             shoot: { dmg: 16384, cd: 1.05, n: 4, range: 640, img: 'Plants/MelonPult/Melon.png', homing: true, aoe: 70 },
                             up: { cost: 262144, to: 'icemelonstail' } },
            icemelonstail: { tier: 16, name: '冰西瓜猫尾草', img: 'Plants/Cattail/Cattail.gif', hp: 8000, cost: 0, scale: 1.25, // v4.0.53：新——冰西瓜猫尾草（冰蓝终级）
                             tint: 'hue-rotate(180deg) saturate(1.7) brightness(1.25) drop-shadow(0 0 10px #7fd8ff)',
                             overlay: 'Plants/MelonPult/WinterMelon.png', overTransform: 'translate(-50%, -50%) translate(0px, -22px) scale(0.6)',
                             shoot: { dmg: 32768, cd: 1.0, n: 5, range: 660, img: 'Plants/MelonPult/WinterMelon_small.png', homing: true, aoe: 85, slow: true } },

            // —— 坚果系 (v4.0.41：12 级每级换模型——回归旧链「坚果射手/卷心菜堡垒/地刺坚果/高坚果/钢刺/辣椒」外观，
            //      高阶沿用「操作与说明」里的坚果模型（寒冰坚果/大嘴坚果/十人坚果/南瓜壳）；升费与血量沿用 v4.0.39 不变) ——
            wallnut:       { tier: 1,  name: '坚果墙',     img: 'Plants/WallNut/WallNut.gif',       card: 'WallNut.png',     hp: 4000,   cost: 50,
                             up: { cost: 16, to: 'nutlv2' } },
            nutlv2:        { tier: 2,  name: '坚果射手',   img: 'Plants/WallNut/WallNut.gif',       hp: 6000,   cost: 0,
                             overlay: 'Plants/Peashooter/Peashooter.gif', overTransform: 'translate(-50%, -50%) translate(2px, -28px) scale(0.6)',
                             up: { cost: 32, to: 'nutlv3' } },
            nutlv3:        { tier: 3,  name: '卷心菜堡垒', img: 'Plants/WallNut/WallNut.gif',       hp: 9000,   cost: 0,
                             overlay: 'Plants/CabbagePult/CabbagePult.png', overTransform: 'translate(-50%, -50%) translate(4px, -34px) scale(0.62)',
                             up: { cost: 64, to: 'nutlv4' } },
            nutlv4:        { tier: 4,  name: '地刺坚果',   img: 'Plants/WallNut/WallNut.gif',       hp: 13500,  cost: 0,
                             overlay: 'Plants/Spikeweed/Spikeweed.gif', overTransform: 'translate(-50%, -50%) translate(0px, 34px)', // v4.0.52：地刺上抬14px（原48px），避免与下方格的地刺本体视觉重合
                             up: { cost: 128, to: 'tallnut' } },
            tallnut:       { tier: 5,  name: '高坚果',     img: 'Plants/TallNut/TallNut.gif',       card: 'TallNut.png',     hp: 20000,  cost: 0, scale: 1.0,
                             up: { cost: 256, to: 'nutlv6' } },
            nutlv6:        { tier: 6,  name: '钢刺高坚果', img: 'Plants/TallNut/TallNut.gif',       hp: 30000,  cost: 0,
                             overlay: 'Plants/Spikerock/Spikerock.gif', overTransform: 'translate(-50%, -50%) translate(0px, 44px)', // v4.0.52：地刺上抬14px（原58px），避免与下方格的地刺本体视觉重合
                             up: { cost: 512, sporeCost: 16, to: 'nutlv7' } },
            nutlv7:        { tier: 7,  name: '辣椒高坚果', img: 'Plants/TallNut/TallNut.gif',       hp: 45000,  cost: 0,
                             tint: 'sepia(1) saturate(2.6) hue-rotate(-20deg) brightness(1.1)',
                             up: { cost: 1024, sporeCost: 32, to: 'nutlv8' } },
            nutlv8:        { tier: 8,  name: '寒冰高坚果', img: 'Plants/TallNut/TallNut.gif',       hp: 67500,  cost: 0,
                             tint: 'hue-rotate(180deg) saturate(1.5) brightness(1.2)',
                             up: { cost: 2048, sporeCost: 64, to: 'nutlv9' } },
            nutlv9:        { tier: 9,  name: '大嘴坚果',   img: 'Plants/Chomper/Chomper.gif',       hp: 100000, cost: 0,
                             overlay: 'Plants/WallNut/WallNut.gif', overTransform: 'translate(-50%, -50%) translate(0px, 16px) scale(0.85)',
                             up: { cost: 4096, sporeCost: 128, to: 'nutlv10' } },
            nutlv10:       { tier: 10, name: '巨型坚果',   img: 'Plants/TenManNut/0.gif',           hp: 150000, cost: 0, scale: 1.1,
                             up: { cost: 8192, sporeCost: 256, to: 'nutlv11' } },
            nutlv11:       { tier: 11, name: '南瓜堡垒',   img: 'Plants/PumpkinHead/PumpkinHead.gif', hp: 225000, cost: 0, scale: 1.4,
                             tint: 'brightness(1.1) saturate(1.2)',
                             up: { cost: 16384, sporeCost: 512, to: 'nutlv12' } },
            nutlv12:       { tier: 12, name: '永恒高坚果', img: 'Plants/TallNut/TallNut.gif',       hp: 340000, cost: 0, scale: 1.2,
                             tint: 'brightness(1.25) saturate(1.3) drop-shadow(0 0 12px #ffd700)',
                             overlay: 'Plants/WallNut/WallNut.gif', overTransform: 'translate(-50%, -50%) translate(0px, -40px) scale(0.7)' },

            // —— 孢子系 (v4.0.39：每 0.4s 产包子 1→50；建造 200☀，升费 400 起翻倍) ——
            puffshroom:    { tier: 1, name: '小喷菇', img: 'Plants/PuffShroom/PuffShroom.gif',     card: 'PuffShroom.png',     hp: 300, cost: 200, scale: 0.9,
                             spore: { n: 1, every: 0.4 }, up: { cost: 400, to: 'scaredyshroom' } },
            scaredyshroom: { tier: 2, name: '胆小菇', img: 'Plants/ScaredyShroom/ScaredyShroom.gif',  hp: 500, cost: 0, scale: 1.1,
                             spore: { n: 2, every: 0.4 }, up: { cost: 800, to: 'fumeshroom' } },
            fumeshroom:    { tier: 3, name: '大喷菇', img: 'Plants/FumeShroom/FumeShroom.gif',     card: 'FumeShroom.png',     hp: 800, cost: 0,   scale: 1.2,
                             spore: { n: 4, every: 0.4 }, up: { cost: 1600, to: 'hypnoshroom' } },
            hypnoshroom:   { tier: 4, name: '魅惑菇', img: 'Plants/HypnoShroom/HypnoShroom.gif',    hp: 1200, cost: 0, scale: 1.3,
                             spore: { n: 8, every: 0.4 }, up: { cost: 3200, to: 'sporemine' } },
            sporemine:     { tier: 5, name: '孢子地雷', img: 'Plants/PotatoMine/PotatoMine.gif',   hp: 2000, cost: 0, scale: 1.0, overlay: 'Plants/PuffShroom/PuffShroom.gif', overTransform: 'translate(-50%, -50%) translate(0px, -30px) scale(0.9)',
                             spore: { n: 10, every: 0.4 }, mine: true, up: { cost: 6400, to: 'gloompuff' } },
            gloompuff:     { tier: 6, name: '忧郁菇', img: 'Plants/GloomShroom/GloomShroom.gif', hp: 3000, cost: 0, scale: 1.0,
                             spore: { n: 15, every: 0.4 }, up: { cost: 12800, to: 'icegloom' } },
            icegloom:      { tier: 7, name: '冰忧郁菇', img: 'Plants/GloomShroom/GloomShroom.gif', hp: 6000, cost: 0, scale: 1.0, tint: 'brightness(1.15) hue-rotate(160deg) saturate(1.7)',
                             spore: { n: 20, every: 0.4 }, auraSlow: true, up: { cost: 25600, to: 'sporelv8' } },
            sporelv8:      { tier: 8, name: '巨型忧郁菇', img: 'Plants/GloomShroom/GloomShroom.gif', hp: 8000, cost: 0, scale: 1.15, tint: 'saturate(1.5) brightness(1.2)',
                             spore: { n: 22, every: 0.4 }, up: { cost: 51200, to: 'sporelv9' } },
            sporelv9:      { tier: 9, name: '暗影忧郁菇', img: 'Plants/GloomShroom/GloomShroom.gif', hp: 10000, cost: 0, scale: 1.25, tint: 'grayscale(0.6) brightness(0.9) hue-rotate(260deg) saturate(1.8)',
                             spore: { n: 30, every: 0.4 }, up: { cost: 102400, to: 'sporelv10' } },
            sporelv10:     { tier: 10, name: '星际忧郁菇', img: 'Plants/GloomShroom/GloomShroom.gif', hp: 12000, cost: 0, scale: 1.35, tint: 'saturate(1.8) brightness(1.25) drop-shadow(0 0 10px #c79aff)',
                             spore: { n: 40, every: 0.4 }, up: { cost: 204800, to: 'sporelv11' } },
            sporelv11:     { tier: 11, name: '宇宙忧郁菇', img: 'Plants/GloomShroom/GloomShroom.gif', hp: 15000, cost: 0, scale: 1.45, tint: 'hue-rotate(280deg) saturate(2.2) brightness(1.3) drop-shadow(0 0 14px #9d6bff)',
                             spore: { n: 50, every: 0.4 } },

            // —— 地刺系 + 土豆雷（v4.0.53：门口可种地刺与土豆雷；火焰地刺改用钢地刺模型+火焰色，图鉴一致） ——
            spikeweed:     { name: '地刺',   img: 'Plants/Spikeweed/Spikeweed.gif',  card: 'Spikeweed.png',  hp: 99999, cost: 0, sporeCost: 50, ground: true,
                             spike: { dps: 4, r: 55 }, up: { sporeCost: 250, to: 'firespikeweed' } },
            firespikeweed: { name: '火焰地刺',img: 'Plants/Spikerock/Spikerock.gif', hp: 99999, cost: 0, scale: 1.0, tint: 'sepia(1) saturate(3.2) hue-rotate(-22deg) brightness(1.2)', ground: true, // v4.0.53：改用钢地刺模型（火焰钢刺）
                             spike: { dps: 16, r: 55 }, up: { sporeCost: 1250, to: 'spikerock' } },
            spikerock:     { name: '钢地刺', img: 'Plants/Spikerock/Spikerock.gif', hp: 99999, cost: 0, scale: 1.0, ground: true,
                             spike: { dps: 64, r: 55 }, up: { sporeCost: 6250, to: 'ultimatefirespikeweed' } },
            ultimatefirespikeweed: { name: '终极火焰地刺', img: 'Plants/Spikerock/Spikerock.gif', hp: 99999, cost: 0, scale: 1.1, tint: 'hue-rotate(-50deg) saturate(3) drop-shadow(0 0 10px #f00)', ground: true,
                             spike: { dps: 256, r: 60 } },

            // —— 土豆地雷（v4.0.53 新：门口可种；30 秒引信后伸头待爆；被啃不炸直接消失；威慑僵尸 50% 绕开；升级烈焰地雷） ——
            potatomine:    { name: '土豆地雷', img: 'Plants/PotatoMine/PotatoMineNotReady.gif', card: 'PotatoMine.png', hp: 1000, cost: 0, sporeCost: 100, scale: 0.9,
                             potatoMine: true, deter: 0.5, up: { sporeCost: 250, to: 'firemine' } },
            firemine:      { name: '烈焰地雷', img: 'Plants/PotatoMine/PotatoMine.gif', hp: 1200, cost: 0, sporeCost: 250, scale: 1.0, // v4.0.53：火焰版——引信更短、伤害更高
                             tint: 'sepia(1) saturate(2.8) hue-rotate(-18deg) brightness(1.2) drop-shadow(0 0 6px #ff6d3d)',
                             potatoMine: true, deter: 0.5 },

            // —— 路灯花 (v4.0.39：128🦠 种植每 0.4s 产 8☀；升费 1024/2028/4056/4056 🦠，产 32/128/512/1024；v4.0.46：夜班作息——只在夜晚产阳光) ——
            // v4.0.70：scale 1.0→1.3（用户：v4.0.63 降到 1.0 后路灯花"反而更小了"；1.8 过大、1.0 偏小，
            // 取 1.3 使瘦长路灯造型的视觉占比追上正常植物）
            plantern:      { name: '路灯花', img: 'Plants/Plantern/Plantern.gif', card: 'Plantern.png', hp: 2000, cost: 0, sporeCost: 128, scale: 1.3, nightProduce: true,
                             produce: { sun: 8, every: 0.4 }, up: { sporeCost: 1024, to: 'plantern2' } },
            plantern2:     { name: '路灯花 Lv2', img: 'Plants/Plantern/Plantern.gif', hp: 2500, cost: 0, scale: 1.3, nightProduce: true, produce: { sun: 32, every: 0.4 }, tint: 'brightness(1.1)', up: { sporeCost: 2028, to: 'plantern3' } },
            plantern3:     { name: '路灯花 Lv3', img: 'Plants/Plantern/Plantern.gif', hp: 3000, cost: 0, scale: 1.3, nightProduce: true, produce: { sun: 128, every: 0.4 }, tint: 'brightness(1.4) drop-shadow(0 0 10px #ff0)', up: { sporeCost: 4056, to: 'plantern4' } },
            plantern4:     { name: '路灯花 Lv4', img: 'Plants/Plantern/Plantern.gif', hp: 4000, cost: 0, scale: 1.3, nightProduce: true, produce: { sun: 512, every: 0.4 }, tint: 'brightness(1.8) drop-shadow(0 0 20px #ff0)', up: { sporeCost: 4056, to: 'plantern5' } },
            plantern5:     { name: '路灯花 Lv5', img: 'Plants/Plantern/Plantern.gif', hp: 5000, cost: 0, scale: 1.3, nightProduce: true, produce: { sun: 1024, every: 0.4 }, tint: 'brightness(2.2) drop-shadow(0 0 28px #ffd700)' },

            // —— 特殊 ——
            iceshroom:     { name: '寒冰菇', img: 'Plants/IceShroom/0.gif',  card: 'IceShroom.png',  hp: 99999,  cost: 0, sporeCost: 200, instant: true }, // v4.0.53：涨价 50→200
            doomshroom:    { name: '毁灭菇', img: 'Plants/DoomShroom/0.gif', card: 'DoomShroom.png', hp: 2000,  cost: 0, sporeCost: 2000,
                             nuke: { lob: true, dmg: 512, cd: 2.0, img: 'Plants/DoomShroom/0.gif' } }, // v4.0.56：攻击力 2048→512 = 正常机枪射手(256)的两倍（用户：毁灭菇强度太高）
            garlic:        { name: '大蒜',   img: 'Plants/Garlic/0.gif',     card: 'Garlic.png',     hp: 1000,  cost: 100, isGarlic: true,
                             up: { cost: 200, to: 'icgarlic' } },
            icgarlic:      { name: '冰蒜卫士', img: 'Plants/Garlic/0.gif',    card: 'Garlic.png',     hp: 1000,  cost: 0, scale: 1.1, // v4.0.53：新——血量不变，僵尸吃后减速
                             tint: 'hue-rotate(175deg) saturate(1.7) brightness(1.25)',
                             isGarlic: true, iceGarlic: true, up: { cost: 600, to: 'goldgarlic' } },
            goldgarlic:    { name: '金蒜坚果', img: 'Plants/Garlic/0.gif',    card: 'Garlic.png',     hp: 5000,  cost: 0, scale: 1.2, // v4.0.53：新——任意僵尸要啃 4 下才啃掉
                             tint: 'sepia(1) saturate(2.2) hue-rotate(8deg) brightness(1.25) drop-shadow(0 0 6px #ffd54a)',
                             isGarlic: true, biteArmor: 4, up: { cost: 2000, to: 'supergarlic' } },
            supergarlic:   { name: '蒜味高坚果', img: 'Plants/Garlic/0.gif', card: 'Garlic.png',     hp: 20000, cost: 0, scale: 1.35, // v4.0.53：新——僵尸要啃 10 下才啃掉
                             tint: 'sepia(0.7) saturate(1.6) brightness(0.9) hue-rotate(20deg)',
                             isGarlic: true, biteArmor: 10 },
            blindbox:      { name: '植物盲盒',img: 'Plants/FlowerPot/0.gif', card: 'PlantBox.png', hp: 100,  cost: 0, sporeCost: 100, isBlindBox: true },

            // —— 高级植物（v4.0.53 新增：火爆辣椒/南瓜壳/倭瓜/火炬树桩/樱桃炸弹，全部 🦠 种植，进「高级」栏） ——
            jalapeno:      { name: '火爆辣椒', img: 'Plants/Jalapeno/Jalapeno.gif', card: 'Jalapeno.png', hp: 2000, cost: 0, sporeCost: 2048,
                             jalapeno: true }, // 距离伤害光环：攻击植物离僵尸越近伤害越高
            // v4.0.63：南瓜壳外观修复（用户实报：图是路灯花的样子，且 scale 1.8 导致砸罐子套路灯花时路灯花位置下移）——
            // 改用正常南瓜套立绘 PumpkinHead.gif，scale 统一 1.0，去掉路灯花的 sepia 滤镜
            pumpkinshell:  { name: '南瓜壳', img: 'Plants/PumpkinHead/PumpkinHead.gif', card: 'PumpkinHead.png', hp: 3000, cost: 0, sporeCost: 128, scale: 1.0,
                             healDoor: 35, up: { sporeCost: 512, to: 'pumpkinshell2' } },
            pumpkinshell2: { name: '南瓜壳·愈', img: 'Plants/PumpkinHead/PumpkinHead.gif', hp: 3500, cost: 0, sporeCost: 0, scale: 1.0,
                             tint: 'brightness(1.1)',
                             healDoor: 30, up: { sporeCost: 2048, to: 'pumpkinshell3' } },
            pumpkinshell3: { name: '南瓜壳·愈金', img: 'Plants/PumpkinHead/PumpkinHead.gif', hp: 4000, cost: 0, sporeCost: 0, scale: 1.0,
                             tint: 'brightness(1.2) drop-shadow(0 0 6px #ffd54a)',
                             healDoor: 20, up: { sporeCost: 8192, to: 'pumpkinshell4' } },
            pumpkinshell4: { name: '南瓜壳·不朽', img: 'Plants/PumpkinHead/PumpkinHead.gif', hp: 5000, cost: 0, sporeCost: 0, scale: 1.0,
                             tint: 'brightness(1.3) drop-shadow(0 0 10px #ffb74d)',
                             healDoor: 15 },
            // v4.0.63：倭瓜位置修复（用户实报：躺在向日葵上、身体约等于下一格）——
            // 素材 Squash.gif 是 100×226 竖条动画帧，主体集中在图片下部 55%~99%，顶部 40% 是空白；
            // 旧 scale 1.1 在 80×80 格里 contain 后主体被压成 35×50 的小瓜且贴格底 → 视觉错位。
            // 修复：放大到正常植物尺寸（scale 1.3）+ 底部锚定（imgPos 50% 100%）+
            // 裁掉顶部 40% 空白（imgClip）→ 主体约 55×75px 与其他植物同规格站进格内。
            squash:        { name: '倭瓜',   img: 'Plants/Squash/Squash.gif',    card: 'Squash.png',    hp: 2500, cost: 0, sporeCost: 2048, scale: 1.3, raisePx: 4,
                             imgPos: '50% 100%', imgClip: 'polygon(0 40%, 100% 40%, 100% 100%, 0 100%)',
                             squashSkill: 120 }, // B/5 技能：2分钟CD，打掉僵尸一半血
            torchwood:     { name: '火炬树桩', img: 'Plants/Torchwood/Torchwood.gif', card: 'Torchwood.png', hp: 4000, cost: 0, sporeCost: 2048, scale: 1.1,
                             torch: true }, // 攻击命中产阳光
            cherrybomb:    { name: '樱桃炸弹', img: 'Plants/CherryBomb/CherryBomb.gif', card: 'CherryBomb.png', hp: 99999, cost: 0, sporeCost: 1000,
                             instant: true, cherry: true } // 一次性：3×3 外圈爆炸+全植物增益
        };
    }
    // 商店可购清单（阳光 / 孢子两种货币）——v4.0.53：MENU 保留为「全部可购」基线（AI 建家用），菜单三栏另行分组
    static get MENU() {
        return ['wallnut', 'puffshroom', 'peashooter', 'plantern', 'spikeweed', 'potatomine', 'iceshroom', 'doomshroom', 'garlic', 'blindbox', 'jalapeno', 'pumpkinshell', 'squash', 'torchwood', 'cherrybomb'];
    }
    // v4.0.53：种植菜单三栏分类（常用=豌豆射手/小喷菇/路灯花；陷阱=土豆地雷/地刺；高级=寒冰菇等全部新植物）
    static get MENU_COMMON() { return ['peashooter', 'puffshroom', 'plantern']; }
    static get MENU_TRAP() { return ['potatomine', 'spikeweed']; }
    static get MENU_ADV() { return ['iceshroom', 'doomshroom', 'garlic', 'blindbox', 'jalapeno', 'pumpkinshell', 'squash', 'torchwood', 'cherrybomb']; }
    static get MENU_TABS() {
        return [
            { id: 0, label: '常用', types: HauntedDorm.MENU_COMMON },
            { id: 1, label: '陷阱', types: HauntedDorm.MENU_TRAP },
            { id: 2, label: '高级', types: HauntedDorm.MENU_ADV }
        ];
    }

    // ===== v4.0.19：存活祝福池（每 90 秒三选一，全局生效）=====
    static get BLESSINGS() {
        return [
            { id: 'sun',   icon: '☀',  name: '阳光雨',   desc: '立即 +300 阳光',
              apply: (g, p) => g.addSun(300, p) },
            { id: 'spore', icon: '🦠', name: '孢子潮',   desc: '立即 +200 孢子',
              apply: (g, p) => g.addSpore(200, p) },
            { id: 'rage',  icon: '⚔',  name: '狂怒',     desc: '20 秒内植物伤害翻倍',
              apply: (g) => { g.plantDmgBoostT = 20; } },
            { id: 'heal',  icon: '🛡', name: '硬化',     desc: '所有植物与门板血量回满',
              apply: (g) => { for (const pl of g.plants) pl.hp = pl.maxHp; } },
            { id: 'water', icon: '🚿', name: '丰收祝福', desc: '45 秒内全植物产出 ×2（阳光+包子）',
              apply: (g) => { g.waterBoostT = 45; } },
            { id: 'cd',    icon: '⏱',  name: '冷却清零', desc: 'P1/P2 技能立刻就绪',
              apply: (g) => { for (const p of g.allPlayers) if (!p.isAi) p.skillCd = 0; } },
            { id: 'mower', icon: '🛒', name: '推车布防', desc: '恢复自家门口的小推车，或随身获得一台（走回自家门口自动放置）',
              apply: (g, p) => {
                  if (g._restoreMowers(p)) return;
                  if (p.isAi) {
                      // v4.0.30：AI 直接布防到自家未防的门口
                      const rms = g._ownedRooms(p);
                      for (const rm of rms) {
                          if (!g.mowers.some(mw => mw.room === rm && !mw.used && !mw.gone)) {
                              g._placeMower(rm, rm.doorCol, rm.doorRow);
                              g._flyText(rm.doorCol * 80 + 40, rm.doorRow * 80, '🛒 AI 布防推车！', '#ffd54f');
                              return;
                          }
                      }
                      g.addSpore(150, p); g._flyText(p.x, p.y - 30, '推车尚在 +150🦠', '#9dff6b');
                      return;
                  }
                  if (!p.mowerCarry) { p.mowerCarry = 1; g._updateMowerBadge(p); g._flyText(p.x, p.y - 30, '🛒 随身小推车 +1，走回自家门口放置', '#9dff6b'); }
                  else { g.addSpore(150, p); g._flyText(p.x, p.y - 30, '推车尚在 +150🦠', '#9dff6b'); }
              } },
        ];
    }

    // ===== 僵尸升级链（v4.0.75 精简为 2 阶）=====
    // 用户要求：僵尸视角重做——不再出现气球僵尸等其它种类，只保留 小鬼僵尸 → 机甲僵王（最终压轴）。
    // 植物防守视角（另一视角）里看到的 AI 僵尸同样只刷这两种；普通/路障/铁桶/橄榄球/铁门/舞王/冰车/小丑/气球不再出现。
    // 血量：小鬼 200（沿用原普通僵尸）· 僵王 102400（v4.0.69 最终形态，保最终压迫感）；速度与旧链一致 450。
    static get GHOST_LEVELS() {
        return [
            { name: '小鬼僵尸',   img: 'Zombies/Imp/0.gif',                   hp: 200,    speed: 450 },
            { name: '机甲僵王',   img: 'Zombies/LGBOSS/0.gif',                 hp: 102400, speed: 450 }
        ];
    }
    static get GHOST_MAX_LV() { return HauntedDorm.GHOST_LEVELS.length; }
    // v4.0.36：真人僵尸玩家血量倍率——AI 植物火力（豌豆/投掷/地刺/毁灭菇真伤）对 500 血玩家几秒融化（用户实报），
    // 仅放大真人玩家血池，AI 僵尸小怪不变；所有伤害源按数值照扣，等效生存 ×3，地图中心 %回血自动同步放大
    static get PLAYER_HP_MUL() { return 3; }

    // v4.0.26：opts 支持主站 index.html 内嵌启动（startHauntedDorm({mode,role1,role2,faction})）；
    // 未传 opts 的键回退到 URL 参数（旧独立页 haunted-dorm.html 直链兼容，行为不变）
    constructor(opts = {}) {
        this.cols = 60;
        this.rows = 45;
        this.gridSize = 80;
        this.worldWidth = this.cols * this.gridSize;
        this.worldHeight = this.rows * this.gridSize;

        const cx = this.worldWidth / 2;
        const cy = this.worldHeight / 2;

        const urlParams = new URLSearchParams(window.location.search);
        const gp = (k) => (opts[k] !== undefined && opts[k] !== null) ? String(opts[k]) : urlParams.get(k);
        this.gameMode = opts.gameMode || gp('mode') || '1p'; // '1p' or '2p'
        this.role1 = gp('role1') || gp('role') || 'peashooter';
        this.role2 = gp('role2') || 'peashooter';
        this.faction = gp('faction') || (opts.isZombieFaction ? 'zombie' : 'plant');
        this.isZombieFaction = (this.faction === 'zombie') || !!opts.isZombieFaction;

        // v4.0.35：同页复玩 HUD 还原——僵尸局会改写 #hud-p1（控制行换僵尸文案、属性行 id 改 zombie-stats-bar
        // 并整体覆盖内容，阳光/孢子 span 被销毁），destroy 未还原导致下一局植物方 P1 HUD 永久显示僵尸属性（用户实报）。
        // 开局先把 P1 HUD 恢复出厂结构（首次捕获 pristine 模板，之后每局重放；僵尸分支随后再按阵营改写）。
        const hudP1El = document.getElementById('hud-p1');
        if (hudP1El) {
            if (!window._dormP1HudTpl) window._dormP1HudTpl = hudP1El.innerHTML;
            hudP1El.innerHTML = window._dormP1HudTpl;
        }

        // v4.0.26：实例代际号——主站内嵌可重复开局，旧实例的 rAF 循环检测到代际变化自动停转
        window.__dormGen = (window.__dormGen || 0) + 1;
        this._dormGen = window.__dormGen;

        // v4.0.19：小推车（最后防线）+ 存活三选一祝福
        // v4.0.30：小推车最终形态=存活奖励（祝福发放），不再地图散落；僵尸玩家开局 10 秒禁行动给 AI 布防窗口
        this.mowers = [];
        this.zombieFreezeT = this.isZombieFaction ? 10 : 0;
        // v4.0.61：僵尸阵营指挥——G 键循环切换优先猎杀目标；H 键号令尸潮（60s CD）
        this.commandTarget = null;
        this.waveOrderCd = 0;
        this.blessingAt = 90000;      // 存活 90 秒后首次送出祝福
        this.aiBlessAt = 90000;       // 僵尸方模式下 AI 植物的存活奖励计时
        this.blessing = null;         // 当前打开的三选一 { options, idx, deadline }
        this.plantDmgBoostT = 0;      // 狂怒：植物伤害翻倍剩余秒数
        this.waterBoostT = 0;         // 丰收浇水：浇水产出 ×3 剩余秒数

        // v4.0.20：尸潮波次 + 昼夜循环 + 内鬼模式
        this.waveN = 0;               // 已到来的尸潮波数
        this.waveAt = 75000;          // 下一波尸潮时间（ms，游戏时间）
        this.waveWarned = false;      // 是否已播报「一大波僵尸正在接近」
        this.isNight = false;         // v4.0.46：作息反转后开局即白天——阳光系白天醒着产出（夜晚开局会 90s 零收入死局）；白天 60s
        this.dnNext = 60000;          // 下一次昼夜切换时间（开局白天 60s）
        this.traitor = null;          // 内鬼（AI 引用，开局秘密选定）
        this.traitorRevealed = false;
        this.traitorRevealAt = 160000; // 160 秒时揭露内鬼
        this.traitorHinted = false;
        // v4.0.44：单人死亡抉择——天使 / 内鬼 二选一
        this.playerAngelic = false;   // 天使形态：光环、无房、N捕获/M加速、一条命
        this.playerTraitor = false;   // 内鬼形态：僵尸血量、挠人机门、团灭幸存者
        this.fateOpen = false;        // 抉择弹窗打开中（全场冻结）
        this._fateShown = false;
        
        this.playerRoles = [
            { id: 'sunflower', name: '向日葵', icon: 'assets/images/Plants/SunFlower/0.gif', skillDesc: '10秒阳光翻倍 (CD:60s)' },
            { id: 'peashooter', name: '豌豆射手', icon: 'assets/images/Plants/Peashooter/0.gif', skillDesc: '15秒攻击翻倍 (CD:60s)', imgStyle: 'width: 120%; height: 120%; margin-left: -10%; margin-top: -10%;' },
            { id: 'wallnut', name: '坚果', icon: 'assets/images/Plants/WallNut/0.gif', skillDesc: '免费升一级门 (CD:60s)' },
            { id: 'chomper', name: '大嘴花', icon: 'assets/images/Plants/Chomper/0.gif', skillDesc: '赶跑全场僵尸10秒 (CD:30s)', imgStyle: 'width: 120%; height: 120%; margin-left: -10%; margin-top: -10%;' },
            { id: 'squash', name: '倭瓜', icon: 'assets/images/Plants/Squash/0.gif', skillDesc: '重创僵尸半血 (CD:60s)', imgStyle: 'width: 200%; height: 200%; margin-left: -50%; margin-top: -50%;' }
        ];
        
        this.playerRoleDef1 = this.playerRoles.find(r => r.id === this.role1) || this.playerRoles[1];
        this.playerRoleDef2 = this.playerRoles.find(r => r.id === this.role2) || this.playerRoles[1];

        this.player = {
            id: 1,
            x: this.gameMode === '2p' ? cx - 60 : cx, y: cy, sun: 0, spore: 0, hp: 100, maxHp: 100,
            icon: this.playerRoleDef1.icon,
            roleDef: this.playerRoleDef1,
            camX: 0, camY: 0, skillCd: 0, sunBuffT: 0, atkBuffT: 0,
            biteT: 0, level: 1, speedBuffT: 0, waterOn: false, waterTick: 0, lastWaterTime: 0,
            nutHealCd: 0 // v4.0.48：坚果门板修复 CD（60s，回 25% 总血）
        };
        
        if (this.gameMode === '2p') {
            this.player2 = {
                id: 2,
                x: cx + 60, y: cy, sun: 0, spore: 0, hp: 100, maxHp: 100,
                icon: this.playerRoleDef2.icon,
                roleDef: this.playerRoleDef2,
                camX: 0, camY: 0, skillCd: 0, sunBuffT: 0, atkBuffT: 0,
                biteT: 0, level: 1, speedBuffT: 0, waterOn: false, waterTick: 0, lastWaterTime: 0,
                nutHealCd: 0
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
            this.player.hp = zCfg.hp * HauntedDorm.PLAYER_HP_MUL; // v4.0.36：真人玩家血池 ×3
            this.player.maxHp = zCfg.hp * HauntedDorm.PLAYER_HP_MUL;
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
        this.ghostSpawned = this.isZombieFaction ? true : false;
        this.gameTime = 0;
        this.timeScale = 1;
        this.ghostSpawnAt = this.isZombieFaction ? 0 : 20000; // 开局 20s 出笼（僵尸阵营立刻开战）
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
        this._ensureSafeSpawn(); // v4.0.16：出生点防墙里（地图生成后校验，此时 walls 才有数据）
        this.bindInput();
        this._updateGhostChip();
        this._refreshHud();

        this.startTime = 0;
        this.lastTime = performance.now();
        // v4.0.74：玩家出生点（地图中心防墙校正后）+ 绿色虚线出生圈
        this.spawnPoint = { x: this.player.x, y: this.player.y };
        if (this.world1) {
            const spM = document.createElement('div');
            spM.className = 'spawn-marker';
            spM.style.left = (this.spawnPoint.x - 120) + 'px';
            spM.style.top = (this.spawnPoint.y - 120) + 'px';
            spM.style.width = '240px'; spM.style.height = '240px';
            this.world1.appendChild(spM);
        }
        this._animId = requestAnimationFrame(t => this.loop(t));
        // v4.0.73 成就：守屋开局（防重入）
        if (window.AchTracker && !this._achStarted) {
            this._achStarted = true;
            window.AchTracker.sessionStart('dorm');
        }
    }


    setTimeScale(label) {
        const speedMap = { 1: 1, 2: 2, 5: 5, 10: 10 };
        this.timeScale = speedMap[label] || 1;
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
        if (this.world1) this.world1.innerHTML = '';
        document.getElementById('wave-announce')?.remove();
        document.getElementById('zombie-warning')?.remove();
        document.getElementById('bless-board')?.remove();

        // v4.0.20：昼夜色调层（夜晚全屏罩一层暗蓝，2.5s 渐变过渡）
        let dnTint = document.getElementById('dn-tint');
        if (!dnTint) {
            dnTint = document.createElement('div');
            dnTint.id = 'dn-tint';
            document.body.appendChild(dnTint);
        }
        dnTint.style.cssText = 'position:fixed; left:0; top:0; width:100%; height:100%; pointer-events:none; z-index:400; transition:background 2.5s;';
        dnTint.style.background = (this.isNight && !this.isZombieFaction) ? 'rgba(10, 14, 52, 0.45)' : 'transparent'; // v4.0.39：开局夜幕（僵尸方无昼夜不上色）
        this.dnTint = dnTint;
        
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
            // 僵尸阵营的 HUD 控制行与状态栏适配（隐藏无意义的植物键位与经济）
            const p1Ctl = document.querySelector('#hud-p1 > div');
            if (p1Ctl) {
                // v4.0.61：加入指挥键位说明（G 切换猎杀目标 / H 号令尸潮）
                p1Ctl.innerHTML = '<div>【僵尸 控制】移动: W/A/S/D ｜ 靠近植物自动慢咬 ｜ 技能: M 狂暴冲刺</div>' +
                                  '<div>【指挥】G: 切换优先猎杀目标 ｜ H: 号令尸潮(60s) ｜ 最上排中心红圈自动回血 ｜ 啃破大门吃掉幸存者获胜</div>';
            }
            const p1Stats = document.querySelector('#hud-p1 > div:nth-child(2)');
            if (p1Stats) p1Stats.id = 'zombie-stats-bar';
            this.player.el1.innerHTML = `<img src="assets/images/${HauntedDorm.GHOST_LEVELS[0].img}" style="width:150%; height:150%; transform:translate(-20%, -30%);">` +
                                        `<div class="lv-badge" style="position:absolute; top:-10px; right:-10px; background:red; color:white; border-radius:10px; padding:4px 8px; font-size:18px; z-index:2;">Lv.1</div>` +
                                        `<div style="position:absolute; top:-35px; left:50%; transform:translateX(-50%); color:#ff5252; font-size:24px; font-weight:bold; text-shadow:1px 1px 2px black, -1px -1px 2px black; white-space:nowrap;">你 (${HauntedDorm.GHOST_LEVELS[0].name})</div>`;
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
            // v4.0.49：植物方出生时控制框隐藏（选定房间后由 _positionPlayerHud 显示）；僵尸阵营立即显示
            if (this.isZombieFaction) {
                p2hud.style.display = 'flex';
                p2hud.style.flexDirection = 'column';
            } else {
                p2hud.style.display = 'none';
            }
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
        // v4.0.49：植物方出生时 P1 控制框也隐藏（选定房间后才显示）；僵尸阵营保持可见
        {
            const p1hud = document.getElementById('hud-p1');
            if (p1hud) p1hud.style.display = this.isZombieFaction ? 'flex' : 'none';
        }
        


        this.plantMenu = document.getElementById('plant-menu');

        // v4.0.19：存活三选一祝福面板（复用建造菜单的上下+确认键）
        this.blessEl = document.createElement('div');
        this.blessEl.id = 'bless-board';
        this.blessEl.style.cssText = 'position:absolute; bottom:300px; left:50%; transform:translateX(-50%); display:none; z-index:2100; text-align:center; font-family:"Kaiti SC",serif; pointer-events:auto;';
        if (this.plantMenu && this.plantMenu.parentElement) this.plantMenu.parentElement.appendChild(this.blessEl);
        else document.body.appendChild(this.blessEl);
        this.minimap = document.getElementById('minimap').getContext('2d');

        // 商店菜单（数据驱动生成）——v4.0.53：三栏分类（常用/陷阱/高级），默认打开「常用」
        const defs = HauntedDorm.DEFS;
        this.menuTab = 0; // 当前菜单栏：0=常用 1=陷阱 2=高级
        this._renderPlantMenuTabs();
        this._onPlantMenuClick = e => {
            const tab = e.target.closest('.pm-tab');
            if (tab) {
                this.menuTab = parseInt(tab.dataset.tab, 10);
                this._renderPlantMenuTabs();
                if (this.menuOpen) this._applyPlantMenuFilters();
                this.playSfx('buttonclick.mp3', 0.25);
                return;
            }
            const opt = e.target.closest('.plant-option');
            if (opt) this.doPlant(opt.dataset.t);
        };
        this.plantMenu.addEventListener('click', this._onPlantMenuClick);

        // 升级/拆除弹窗
        this.popup = document.getElementById('plant-popup');
        this.ppTitle = document.getElementById('pp-title');
        this.ppFeed = document.getElementById('pp-feed');
        this.ppUp = document.getElementById('pp-upgrade');
        this.ppDemolish = document.getElementById('pp-demolish');
        // v4.0.74：升级/拆除弹窗去掉「拆除」键——拆除只走种植菜单的 del 选项（且三类不可拆）
        if (this.ppDemolish) this.ppDemolish.style.display = 'none';
        this.popupPlant = null;
        // v4.0.16：拆除二次确认——第一次点只进入「待确认」状态（按钮变红），2.5 秒内再点才真正拆除（防误删）
        this.ppDemolish.onclick = () => {
            const pl = this.popupPlant;
            if (!pl) return;
            if (this._delArmed !== pl || performance.now() - (this._delArmAt || 0) > 2500) {
                this._delArmed = pl;
                this._delArmAt = performance.now();
                this.ppDemolish.innerText = '⚠️ 再点一次确认拆除';
                this.ppDemolish.style.background = '#c62828';
                this.playSfx('buttonclick.mp3', 0.35);
                return;
            }
            this._delArmed = null;
            this._closePopup();
            const p = this.popupPlayer || this.player;
            // v4.0.47：返还=累计真实投入的一半（种植+历次升级）；盲盒/白得的植物没有投入，不返还（用户规格）
            const refSun = Math.floor((pl.investSun || 0) * 0.5);
            const refSpore = Math.floor((pl.investSpore || 0) * 0.5);
            if (refSun > 0) this.addSun(refSun, p);
            if (refSpore > 0) this.addSpore(refSpore, p);
            pl.el1.remove();
            if (pl.txtEl) pl.txtEl.remove();
            this.plants = this.plants.filter(p => p !== pl);
            this._flyText(pl.c * 80 + 40, pl.r * 80,
                (refSun > 0 || refSpore > 0)
                    ? `${pl.def.name} 已拆除（返还 ${refSun > 0 ? '☀' + refSun + ' ' : ''}${refSpore > 0 ? '🦠' + refSpore : ''}）`
                    : `${pl.def.name} 已拆除（白得的，无返还）`, '#ffb0b0');
            this.playSfx('chomp.mp3', 0.4);
        };
        this.ppUp.onclick = () => {
            const pl = this.popupPlant;
            if (!pl || !pl.def.up) { this._closePopup(); return; }
            const p = this.popupPlayer || this.player;
            const cost = pl.def.up.cost || 0;
            const sporeCost = pl.def.up.sporeCost || 0;
            const canAfford = p.sun >= cost && p.spore >= sporeCost;
            if (!canAfford) {
                let err = [];
                if (p.sun < cost) err.push(`☀${cost}`);
                if (p.spore < sporeCost) err.push(`🦠${sporeCost}`);
                this._flyText(pl.c * 80 + 40, pl.r * 80, `资源不足（需 ${err.join(' ')}）`, '#ff8a8a');
                this.playSfx('buttonclick.mp3', 0.35);
                return;
            }
            const to = pl.def.up.to;
            const nd = HauntedDorm.DEFS[to];
            const fac = pl.isDoor ? 0.3 : 1;
            this._closePopup();
            if (cost) this.addSun(-cost, p);
            if (sporeCost) this.addSpore(-sporeCost, p);
            this.playSfx('readysetplant.mp3', 0.5);
            this._flyText(pl.c * 80 + 40, pl.r * 80,
                `${pl.def.name} → ${nd.name}！（血量 ${Math.round(pl.def.hp * fac)}→${Math.round(nd.hp * fac)}）`, '#9dff6b');
            this._evolve(pl, to, cost, sporeCost); // v4.0.47：升级花费计入累计投入（拆除返还依据）
        };
    }

    // 简易音效（独立页面不引 AudioManager，直接用主素材库音频）
    playSfx(name, vol = 0.5) {
        const SFX_MAP = {
            'plant.mp3': 'plant_water.mp3',
            'plant2.mp3': 'plant_water.mp3',
            'sun.mp3': 'points.mp3',
            'shovel.mp3': 'plant_water.mp3',
            'gulp.mp3': 'chomp.mp3',
            'throw.mp3': 'bowling.mp3',
            'buzzer.mp3': 'crazydaveshort1.mp3',
            'squash_hmm.mp3': 'groan3.mp3'
        };
        const actualName = SFX_MAP[name] || name;
        const now = performance.now();
        this._sfxT = this._sfxT || {};
        // 对极度频繁的音效进行节流 (50ms)
        if (this._sfxT[actualName] && now - this._sfxT[actualName] < 50) return;
        this._sfxT[actualName] = now;
        try {
            const a = new Audio('assets/audio/' + actualName);
            a.volume = vol;
            a.play().catch(() => {});
        } catch (e) {}
    }

    generateMap() {
        this.rooms = [];
        const makeGrid = (w, h) => Array.from({length: h}, () => Array(w).fill(1));
        // v4.0.50：中间庭院 8×8 房间——中间缺 2×2 但四面用墙围成封闭庭院（房间外墙闭合、内部为环形走廊），
        // 不再是 v4.0.49 的"漏风地洞"（用户实报：中间扣一个洞=未封闭图形）
        const notchGrid = () => {
            const g = makeGrid(8, 8);
            g[3][3] = g[3][4] = g[4][3] = g[4][4] = 0;
            return g;
        };
        // v4.0.49：L 形 8×8 房间（缺右上 4×4）
        const lGrid = () => {
            const g = makeGrid(8, 8);
            for (let r = 0; r < 4; r++) for (let c = 4; c < 8; c++) g[r][c] = 0;
            return g;
        };

        // v4.0.49：房屋布局多样化——大小不一（8×8 / 6×6 / 8×6 / 6×8）、形状各异（正方/中间庭院/L形），
        // 门不再全部两两相对：仅上排左侧 A-B 一对门对门，其余全部单独立户（门朝上/下/左/右各不相同）。
        // 全部网格对齐生成，不存在“半个方块”。
        const roomsDef = [
            // —— 上排左组（唯一一对门对门）——
            { x: 4,  y: 6,  w: 8, h: 8, grid: makeGrid(8,8), door: {r: 4, c: 8},  beds: [{r: 4, c: 2}] },  // A 大正方·门朝右
            { x: 16, y: 6,  w: 8, h: 8, grid: makeGrid(8,8), door: {r: 4, c: -1}, beds: [{r: 4, c: 5}] }, // B 大正方·门朝左（与 A 对门）
            // —— 上排右组（独立户）——
            { x: 38, y: 6,  w: 8, h: 8, grid: makeGrid(8,8), door: {r: 8, c: 4},  beds: [{r: 4, c: 2}] },  // C 大正方·门朝下
            { x: 50, y: 6,  w: 6, h: 6, grid: makeGrid(6,6), door: {r: 6, c: 3},  beds: [{r: 3, c: 1}] },  // D 小正方·门朝下
            // —— 中排（独立户）——
            { x: 14, y: 16, w: 8, h: 8, grid: notchGrid(), door: {r: 8, c: 4},  beds: [{r: 1, c: 1}] },    // E 中间庭院（墙围·封闭）·门朝下
            { x: 32, y: 16, w: 6, h: 8, grid: makeGrid(6,8), door: {r: 8, c: 3},  beds: [{r: 4, c: 1}] },  // F 高房·门朝下（远离地图中心玩家出生点）
            { x: 42, y: 18, w: 8, h: 8, grid: lGrid(),      door: {r: 4, c: 8},  beds: [{r: 4, c: 1}] },   // G L形·门朝右
            // —— 下排（独立户，门都朝上）——
            { x: 6,  y: 30, w: 8, h: 8, grid: makeGrid(8,8), door: {r: -1, c: 4}, beds: [{r: 4, c: 2}] },  // H 大正方·门朝上
            { x: 24, y: 30, w: 8, h: 6, grid: makeGrid(8,6), door: {r: -1, c: 4}, beds: [{r: 3, c: 2}] },  // I 宽房·门朝上
            { x: 44, y: 30, w: 8, h: 8, grid: makeGrid(8,8), door: {r: -1, c: 4}, beds: [{r: 4, c: 5}] }   // J 大正方·门朝上
        ];

        // 随机给一户加第二张床（两人合住一房），床必须落在实心地板上
        if (Math.random() < 0.4) {
            const idx = Math.floor(Math.random() * roomsDef.length);
            const b = roomsDef[idx].beds[0];
            const up = (b.r - 2 >= 0 && roomsDef[idx].grid[b.r - 2][b.c] === 1);
            const down = (b.r + 2 < roomsDef[idx].h && roomsDef[idx].grid[b.r + 2][b.c] === 1);
            if (up) roomsDef[idx].beds.push({ r: b.r - 2, c: b.c });
            else if (down) roomsDef[idx].beds.push({ r: b.r + 2, c: b.c });
        }
        for (const d of roomsDef) {
            this.rooms.push({ x: d.x, y: d.y, w: d.w, h: d.h, tpl: { grid: d.grid, door: d.door, beds: d.beds } });
        }

        for (const rm of this.rooms) {
            rm.doorCol = rm.x + rm.tpl.door.c;
            rm.doorRow = rm.y + rm.tpl.door.r;
            // 确保AI寻路用的门前坐标(frontX, frontY)被正确初始化
            rm.frontX = rm.doorCol * 80 + 40;
            rm.frontY = rm.doorRow * 80 + 40;
        }

        // v4.0.49：僵尸出生/回血圆圈——最上排两组房间的正中心（原地图中心圆圈取消）
        this._computeSpawnCenter();
        const sc = this._spawnCenterPx();
        const center1 = document.createElement('div');
        center1.className = 'tile center';
        center1.style.left = (sc.x - 120) + 'px';
        center1.style.top = (sc.y - 120) + 'px';
        center1.style.width = '240px'; center1.style.height = '240px';
        this.world1.appendChild(center1);

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
                    // v4.0.71：整个房间 footprint 全铺木地板——含庭院/L形缺口等洞格（grid=0）。
                    // 用户实报：木地板只铺在实心格上，房间内洞格仍露一片草地，观感割裂
                    const tile = document.createElement('div');
                    tile.className = 'tile room';
                    tile.style.left = ((rm.x + c) * this.gridSize) + 'px';
                    tile.style.top = ((rm.y + r) * this.gridSize) + 'px';
                    this.world1.appendChild(tile);
                }
            }
        }

        // v4.0.72：房间跳板——每房间放一个快速出门跳板（门被啃毁/僵尸堵门时逃命；内鬼/AI 逃亡也走它）。
        // 位置：离门最远的实心格（避开床），踩上即传送到房间门外空地
        for (const rm of this.rooms) {
            const isBed = (r, c) => rm.tpl.beds.some(b => b.r === r && b.c === c);
            let best = null, bestD = -1;
            for (let r = 0; r < rm.h; r++) {
                for (let c = 0; c < rm.w; c++) {
                    if (rm.tpl.grid[r][c] !== 1 || isBed(r, c)) continue;
                    const d = Math.hypot(c - rm.tpl.door.c, r - rm.tpl.door.r);
                    if (d > bestD) { bestD = d; best = { c: c, r: r }; }
                }
            }
            if (!best) continue;
            const padEl = document.createElement('div');
            padEl.className = 'jump-pad';
            padEl.innerHTML = '⤴';
            padEl.style.left = ((rm.x + best.c) * this.gridSize + 8) + 'px';
            padEl.style.top = ((rm.y + best.r) * this.gridSize + 8) + 'px';
            this.world1.appendChild(padEl);
            rm.jumpPad = { el: padEl, c: rm.x + best.c, r: rm.y + best.r, cd: 0 };
        }

        // 渲染墙体（v3.88.0：墙=蓝色河道）
        for (const rm of this.rooms) {
            const isInside = (r, c) => r>=0 && r<rm.h && c>=0 && c<rm.w && rm.tpl.grid[r][c] === 1;
            // v4.0.50：洞格（庭院/缺口）同样按"8 邻域有实心格"生成墙——房间外墙沿实心区边界闭合，
            // 中间庭院四面墙围死、L 形缺口内壁封口，任何房间都是封闭图形（不再有漏风地洞）
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
            // v4.0.72：删除 transform scale(1.02)——每墙一个独立合成层是走廊卡顿元凶；
            // 子像素缝隙改由 CSS 同色 border:1px 兜底，墙体回归 world1 单层内绘制
            
            this.world1.appendChild(wall1);
        }

        // 修复：清除在生成门和床时被错误赋予给玩家的房间归属
        this.player.room = null;
        this.player.room2 = null; // v4.0.18：副房一并清空
        if (this.player2) { this.player2.room = null; this.player2.room2 = null; }

        // v4.0.19：祝福计时归零
        this.blessingAt = 90000;
        this.aiBlessAt = 90000;
        this.zombieFreezeT = this.isZombieFaction ? 10 : 0;
        if (this.blessing) { this.blessing = null; if (this.blessEl) this.blessEl.style.display = 'none'; }

        // v4.0.30：小推车=存活奖励（祝福发放），删地图散落道具；僵尸方开局 10 秒禁行动
        this.mowers.forEach(mw => { if (mw.el1) mw.el1.remove(); });
        this.mowers = [];
        this._announce(this.isZombieFaction
            ? '🧟 开局 10 秒观察期：AI 幸存者将获得存活奖励并加强布防！'
            : '🛒 小推车已改为存活奖励：在祝福三选一中选取，放回自家门口布防！', 'readysetplant.mp3');
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

        // v4.0.44：AI 实力分配——2 强 3 弱（用户：不能开局全员强势；强者≈玩家水平，弱者先倒下，胜负靠玩家决胜）
        const aiCount = Math.min(5, shuffledBeds.length);
        const strongPool = new Set();
        while (strongPool.size < Math.min(2, aiCount)) strongPool.add(Math.floor(Math.random() * aiCount));

        for (let i = 0; i < 5; i++) {
            if (i >= shuffledBeds.length) break;
            const bedChoice = shuffledBeds[i];
            const rm = bedChoice.room;
            const roleDef = this.playerRoles[i];
            const sx = (this.worldWidth / 2) + (Math.random() * 40 - 20);
            const sy = (this.worldHeight / 2) + (Math.random() * 40 - 20);
            const p = this._findPath(sx, sy, rm.frontX, rm.frontY);
            if (p) p.push({ x: (rm.x + bedChoice.bedCoords.c) * this.gridSize + 40, y: (rm.y + bedChoice.bedCoords.r) * this.gridSize + 40 }); // 走到专属床位（v4.0.16：寻路失败为 null，靠 update 里的重试兜底）
            const isStrong = strongPool.has(i); // v4.0.44：2强3弱
            const ai = {
                x: sx,
                y: sy,
                path: p || [],
                // v4.0.33：血量 300→500（AI 队友存活更久）+ 血条常显（像真人一样可见掉血过程）
                // v4.0.44：强者 sun150/行动 1.2~2.7s，弱者 sun60/行动 3.5~7s
                sun: isStrong ? 150 : 60, spore: 0, hp: 500, maxHp: 500,
                actTimer: isStrong ? 1.2 + Math.random() * 1.5 : 3.5 + Math.random() * 3.5,
                isAi: true, isStrong: isStrong, targetRoom: rm, room: null, roleDef: roleDef,
                icon: roleDef.icon, dead: false, waterOn: true,
                el1: document.createElement('div')
            };
            ai.el1.className = 'entity avatar';
            const colors = ['#ff7777', '#77ff77', '#7777ff', '#ffff77', '#ff77ff'];
            const color = colors[i % colors.length];
            ai.color = color;
            ai.el1.innerHTML = `<img src="${ai.icon}" style="${ai.roleDef.imgStyle || ''}">` +
                               `<div style="position:absolute; top:-35px; left:50%; transform:translateX(-50%); color:${color}; font-size:18px; font-weight:bold; text-shadow:1px 1px 2px black, -1px -1px 2px black; white-space:nowrap;">人机 - ${ai.roleDef.name}${isStrong ? ' 💪' : ' 🌱'}</div>`;
            ai.el1.style.filter = `drop-shadow(0 0 10px ${color})`;
            // v4.0.31：AI 血条（受伤时显示）
            const aiHb = document.createElement('div');
            aiHb.className = 'hp-bar-bg';
            aiHb.style.cssText = 'top:-16px; display:block;'; // v4.0.33：血条常显
            aiHb.innerHTML = '<div class="hp-bar-fg" style="width:100%; background:#7cff6b;"></div>';
            ai.el1.appendChild(aiHb);
            ai.hpBg = aiHb; ai.hpFg = aiHb.firstChild;
            this.world1.appendChild(ai.el1);
            this.ais.push(ai);
            this.allPlayers.push(ai);
        }

        // v4.0.20：内鬼模式——秘密选定一名人机，160 秒时反水（植物阵营专属）
        if (!this.isZombieFaction && this.ais.length >= 3) {
            this.traitor = this.ais[Math.floor(Math.random() * this.ais.length)];
        }

        // v4.0.44：阵容播报——让玩家知道谁是老手谁是新手
        if (!this.isZombieFaction && this.ais.length >= 3) {
            const nStrong = this.ais.filter(a => a.isStrong).length;
            this._announce(`🤖 幸存者阵容：${nStrong} 名老手 💪 · ${this.ais.length - nStrong} 名新手 🌱——关键时刻还得靠你！`);
        }

    }

    // v4.0.56：盲盒奖池再调整（用户：毁灭菇太没可玩性 / 坚果没用还概率高 / 攻击类要更容易出）
    // —— ①毁灭菇从奖池彻底移除；②坚果权重 10→1、阳光菇权重 10→3（向日葵不在原主池，按"高级植物低概率"入 rare 权重 1）；
    // ③攻击类大幅加权：豌豆射手 1~5 级（豌豆→卷心菜→玉米→双向→寒冰）全部进主池权重 10，小喷菇系也保持高权重，
    // 寒冰菇/大蒜/路灯花保留但降为 6；④高级植物（双发/三线/机枪/大喷菇系/高坚果/双子向日葵/向日葵）权重 1——都可能抽到但概率很低。
    _blindBoxType() {
        const main10 = [ // 权重 10：攻击类主力——1~5 级豌豆射手 + 小喷菇系（最容易抽到）
            'peashooter', 'cabbagepult', 'kernelpult', 'dualpea', 'snowpea', // 豌豆射手 Lv1–Lv5
            'puffshroom', 'scaredyshroom'                                    // 小喷菇 Lv1/Lv2
        ];
        const main6 = [ // 权重 6：点名保留但略降
            'plantern', 'plantern2',  // 路灯花 Lv1/Lv2
            'iceshroom',              // 寒冰菇（开出即冰全场 5 秒）
            'garlic'                  // 大蒜
        ];
        const main3 = [ // 权重 3：产阳光类调低
            'sunshroom', 'bigsunshroom' // 阳光菇 Lv1/Lv2
        ];
        const main1 = [ // 权重 1：坚果大幅调低（放置价值低，用户点名）
            'wallnut'
        ];
        const rare = [ // 权重 1：高级植物都可能出但概率很低
            'repeater', 'threepeater', 'gatlingpea', // 豌豆系 6–8 级
            'fumeshroom', 'hypnoshroom', 'sporemine', 'gloompuff', 'icegloom', // 孢子系高阶
            'tallnut', 'twinsunflower', 'sunflower'  // 高坚果 / 双子向日葵 / 向日葵（原主池无向日葵，按低概率入 rare）
        ];
        const weighted = [];
        for (const t of main10) for (let i = 0; i < 10; i++) weighted.push(t);
        for (const t of main6) for (let i = 0; i < 6; i++) weighted.push(t);
        for (const t of main3) for (let i = 0; i < 3; i++) weighted.push(t);
        for (const t of main1) weighted.push(t);
        for (const t of rare) weighted.push(t);
        return weighted[Math.floor(Math.random() * weighted.length)];
    }

    spawnPlant(col, row, type, isDoor = false, owner = null) {
        if (this.plants.some(pl => pl.c === col && pl.r === row)) return null;

        if (type === 'blindbox') {
            type = this._blindBoxType();
            // 兜底：DEFS 缺失或 instant（一次性）且非寒冰菇（寒冰菇走下方特判：开出即冰全场）→ 退化为豌豆射手
            if (!HauntedDorm.DEFS[type] || (HauntedDorm.DEFS[type].instant && type !== 'iceshroom')) type = 'peashooter';

            this._flyText(col * 80 + 40, row * 80, '🎁 盲盒开出：' + HauntedDorm.DEFS[type].name + '！', '#ffd54a');
            // v4.0.73 成就：打开盲盒累计
            if (window.AchTracker) window.AchTracker.bump('dBlind', 1);
            this.playSfx('plant2.mp3', 0.6);
            if (this.world1) {
                const fxEl = document.createElement('div');
                fxEl.className = 'entity';
                fxEl.style.cssText = `width:90px; height:90px; left:${col * 80 + 40}px; top:${row * 80 + 40}px; z-index:150; pointer-events:none; font-size:32px; display:flex; align-items:center; justify-content:center; filter:drop-shadow(0 0 10px #ffd54a);`;
                fxEl.innerHTML = '✨📦✨';
                this.world1.appendChild(fxEl);
                setTimeout(() => fxEl.remove(), 700);
            }
        }
        if (type === 'iceshroom') {
            const hostiles = this._getHostileTargets().filter(z => !z.dead);
            if (hostiles.length > 0) {
                for (const zb of hostiles) {
                    zb.stunT = 5.0; // 冰冻 5 秒
                    zb.iceFxT = 5.0; // v4.0.39：冰冻特效全程可视（不再把寒冰菇贴僵尸脸上）
                    this._applyFrozenFx(zb, true);
                    this._flyText(zb.x, zb.y, '❄️ 极寒冰封 (5秒)', '#7fd8ff');
                }
                this.playSfx('frozen.mp3', 0.5);
            } else {
                if (owner) this.addSpore(200, owner); // v4.0.53：寒冰菇涨价 50→200，退款同步
                this._flyText(this.player.x, this.player.y, '无敌对目标，已退还200🦠', '#ff8a8a');
                this.playSfx('buzzer.mp3', 0.3);
            }
            return null;
        }

        // v4.0.53：樱桃炸弹——一次性：种下立即爆炸（3×3 外圈）+ 范围内植物增益，本体不保留
        if (type === 'cherrybomb') {
            const tmpPl = { r: row, c: col, def: HauntedDorm.DEFS[type], owner: owner || null };
            this._cherryBoom(tmpPl);
            this.playSfx('boom.mp3', 0.6);
            return null;
        }

        const rm = this._insideRoom(col, row);
        // v4.0.23：兜底认领改走统一入口且认给真正的种植者——原逻辑写死给 this.player（P1），
        // 双人模式下 P2 先建房会被顺手记到 P1 名下；初始化/门板等无主生成（owner=null）不认领
        if (rm && owner) this._claimRoom(owner, rm);

        const defs = HauntedDorm.DEFS;
        const def = defs[type];
        if (!def) return null;

        // 门板血量按图鉴血量的 30% 折算（v3.89.0：跟随升级成长——原先是固定 1200，升级坚果后门板血量不涨，
        // 玩家看不出升级收益；现在墙坚果门板 1200，豌豆坚果门板 1500……逐级变硬）
        const maxHp = isDoor ? Math.round(def.hp * 0.3) : def.hp;
        // v4.0.23：植物随身携带种植者——MVP 伤害记账的单一事实来源（不再反查房间 owners[0]，杜绝 P2 输出记到 P1 头上）
        const pl = { r: row, c: col, type: type, def: def, hp: maxHp, maxHp: maxHp, isDoor: isDoor, owner: owner || null,
                     shootCd: 1.5, prodT: 0, sporeT: 0, fed: 0, freezeT: 0,
                     investSun: 0, investSpore: 0 }; // v4.0.47：累计真实投入（拆除返还一半的依据；盲盒/白给路径没人付钱，保持 0）

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
        let inner = `<img src="assets/images/${def.img}" style="width:100%; height:100%; object-fit:contain; transform: scale(${1.2 * scale}) translateY(${-10 - (def.raisePx || 0)}px); ${tint}${doorOpacity}${blend} ${baseClip} ${def.imgPos ? 'object-position:' + def.imgPos + ';' : ''} ${def.imgClip ? 'clip-path:' + def.imgClip + '; -webkit-clip-path:' + def.imgClip + ';' : ''}">`;
        
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

        // v4.0.40：等级徽标——升级链层级一眼可见（用户实报：技能点/等级不凸显）
        if (def.tier) {
            inner += `<div style="position:absolute; right:3px; top:12px; background:rgba(40,26,8,0.88); color:#ffd54a; border:1px solid #8a6d2f; border-radius:8px; padding:0 5px; font-size:11px; font-weight:bold; line-height:15px; pointer-events:none; z-index:5; text-shadow:0 1px 2px #000;">Lv${def.tier}</div>`;
        }

        el1.innerHTML = hpBar + inner;
        this.world1.appendChild(el1);
        pl.el1 = el1;
        this.plants.push(pl);
        this._applySleepVisual(pl); // v4.0.20：白天种蘑菇 → 直接套上睡眠滤镜

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
        if (this.isZombieFaction || this.playerAngelic || this.playerTraitor) return; // v4.0.44：天使/内鬼不可操作植物
        
        // 禁止跨房间操作：不能帮人机或其他人升级植物
        // 门和周围地刺也算在该房间的归属内
        let room = this.rooms.find(rm => pl.c >= rm.x && pl.c < rm.x + rm.w && pl.r >= rm.y && pl.r < rm.y + rm.h);
        if (!room) room = this.rooms.find(rm => Math.abs(pl.c - rm.doorCol) + Math.abs(pl.r - rm.doorRow) <= 1);
        let actor = this.player;
        if (this.gameMode === '2p' && this.player2 && !this.player2.dead) {
            if (room && this._ownsRoom(this.player2, room)) actor = this.player2;
        }
        if (room && room.owners && room.owners.length > 0 && !room.owners.includes(actor)) {
            this._flyText(pl.c * 80 + 40, pl.r * 80 + 40, '不能操作别人的设备！', '#ff4b4b');
            return;
        }
        this.popupPlayer = actor;

        this._closePlantMenu();
        const def = pl.def;
        this.popupPlant = pl;
        // v4.0.16：重置拆除确认状态
        this._delArmed = null;
        this.ppDemolish.innerText = '拆除' + (() => { // v4.0.47：按钮上直接显示预计返还（累计投入的一半）
            const rs = Math.floor((pl.investSun || 0) * 0.5), rp = Math.floor((pl.investSpore || 0) * 0.5);
            if (!rs && !rp) return '（无返还）';
            return `（返${rs ? '☀' + rs : ''}${rp ? '🦠' + rp : ''}）`;
        })();
        this.ppDemolish.style.background = '';
        this.ppTitle.innerText = (def.tier ? `Lv${def.tier} ` : '') + def.name + (pl.isDoor ? '（门板）' : '');
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
            const canAfford = (!def.up.cost || actor.sun >= def.up.cost) && (!def.up.sporeCost || actor.spore >= def.up.sporeCost);
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
        // v4.0.16：复位拆除确认状态与按钮外观
        this._delArmed = null;
        if (this.ppDemolish) {
            this.ppDemolish.innerText = '拆除';
            this.ppDemolish.style.background = '';
        }
    }

    _evolve(pl, to, costSun = 0, costSpore = 0) {
        const col = pl.c, row = pl.r;
        const isDoor = pl.isDoor;
        const oldInvestSun = pl.investSun || 0, oldInvestSpore = pl.investSpore || 0; // v4.0.47：传承累计投入
        pl.el1.remove();
        if (pl.txtEl) pl.txtEl.remove();
        this.plants = this.plants.filter(p => p !== pl);
        const np = this.spawnPlant(col, row, to, isDoor, pl.owner); // v4.0.23：升级后保留原种植者
        // v4.0.40：升级结果可视化——报出新等级与新增益（用户实报：等级/技能点不凸显）
        if (np) {
            np.investSun = oldInvestSun + (costSun || 0);   // v4.0.47：累计投入=旧投入+本次升级花费
            np.investSpore = oldInvestSpore + (costSpore || 0);
            const d = np.def;
            let detail = '';
            if (d.produce) detail = ` 产${d.produce.sun}☀`;
            else if (d.spore) detail = ` 产${d.spore.n}🦠`;
            else if (d.shoot) detail = ` 伤${d.shoot.dmg}`;
            else if (d.spike) detail = ` 伤${d.spike.dps}/s`;
            this._flyText(col * 80 + 40, row * 80, `⬆ Lv${d.tier} ${d.name}${detail}`, '#ffd54a');
        }
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
            if (zb.el1) {
                const im = zb.el1.querySelector('img');
                if (im) im.src = 'assets/images/' + cfg.img;
                if (zb.hpBg) zb.hpBg.style.display = 'none';
                const bdg = zb.el1.querySelector('.lv-badge');
                if (bdg) bdg.innerText = 'Lv.' + this.ghostLevel;
            }
            this._announce(`👻 僵尸升级为【${cfg.name}】！`, 'finalwave.mp3', true);
        } else {
            this._announce(`👻 僵尸成长为【${cfg.name}】…`, 'finalwave.mp3', true);
        }
        this._updateGhostChip();
    }

    _ghostSpawnPoint() {
        // v4.0.16：出笼点必须离所有存活玩家 ≥600px——原主路径只查了格子非墙，可能正好出在玩家房间门口，
        // 僵尸 20s 出笼即堵门，玩家开局没门板没植物直接被吃（用户实拍 bug）
        const farFromPlayers = (x, y) => this.allPlayers.every(p => p.dead || Math.hypot(p.x - x, p.y - y) >= 600);
        // v4.0.49：僵尸出生优先在最上排中心圆圈（出生/回血点）附近——出生和回血同处一圆
        const scp = this._spawnCenterPx();
        for (let tries = 0; tries < 40; tries++) {
            const x = scp.x + (Math.random() * 240 - 120);
            const y = scp.y + (Math.random() * 240 - 120);
            const c = Math.floor(x / this.gridSize), r = Math.floor(y / this.gridSize);
            if (x < 60 || y < 60 || x > this.worldWidth - 60 || y > this.worldHeight - 60) continue;
            if (!this.walls.has(`${c},${r}`) && !this.checkCollision(x, y) && farFromPlayers(x, y)) return { x, y };
        }
        for (let tries = 0; tries < 40; tries++) {
            const rm = this.rooms[Math.floor(Math.random() * this.rooms.length)];
            const d = rm.tpl.door;
            let dx = 0, dy = 0;
            if (d.r >= rm.h) dy = 1; else if (d.r < 0) dy = -1;
            else if (d.c >= rm.w) dx = 1; else dx = -1;
            const c = rm.x + d.c + dx * 2, r = rm.y + d.r + dy * 2;
            const x = c * this.gridSize + 40, y = r * this.gridSize + 40;
            if (!this.walls.has(`${c},${r}`) && !this.checkCollision(x, y) && farFromPlayers(x, y)) return { x, y };
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

    // v4.0.16：出生点安全校验——玩家/P2/人机出生在墙里时，就近螺旋找空位搬迁
    _ensureSafeSpawn() {
        const fix = (p) => {
            if (!p || p.dead) return;
            if (!this.checkCollision(p.x, p.y, 14)) return; // 原位安全
            for (let radius = 40; radius <= 320; radius += 40) {
                for (let a = 0; a < 12; a++) {
                    const x = p.x + Math.cos(a / 12 * Math.PI * 2) * radius;
                    const y = p.y + Math.sin(a / 12 * Math.PI * 2) * radius;
                    if (x < 60 || y < 60 || x > this.worldWidth - 60 || y > this.worldHeight - 60) continue;
                    if (!this.checkCollision(x, y, 14)) { p.x = x; p.y = y; return; }
                }
            }
        };
        for (const p of this.allPlayers) fix(p);
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
            if (ai._jumpFly) continue; // v4.0.74：跳板飞行中 AI 不寻路不行动
            if (ai === this.traitor && this.traitorRevealed) continue; // v4.0.20：内鬼由 _updateTraitor 接管
            // v4.0.46：人机会使用手持技能——CD 好了之后 1 分钟内随机时机释放，随后 CD 重新计时（赶路/干活时不耽误放技能）
            if (ai.skillAt === undefined) ai.skillAt = this.gameTime + 10000 + Math.random() * 50000;
            if (this.gameTime >= ai.skillAt && (!ai.skillCd || ai.skillCd <= 0)) {
                this._useSkill(ai);
                if (!ai.skillCd || ai.skillCd <= 0) {
                    ai.skillAt = this.gameTime + 8000 + Math.random() * 7000;   // 没放出来（无敌可咬/门不可升）→ 8~15s 后再试
                } else {
                    // v4.0.49：大嘴花 CD 30s，其余角色仍 60s——AI 按角色实际 CD 重新计时
                    const cdMs = (ai.roleDef && ai.roleDef.id === 'chomper') ? 30000 : 60000;
                    ai.skillAt = this.gameTime + cdMs + Math.random() * cdMs; // 放成功 → 等 CD 结束后再随机 0~1 个 CD
                }
            }
            // v4.0.72：门危逃亡——自己门板血量 < 1/20 → 走跳板出房，去其他有空床的房间。
            // 用户需求：门被啃到将破时 AI 不该等死，跳板快速转移（跳板传送在 _updateJumpPads 里统一处理）
            if (ai.fleeing) {
                const fromRm = ai.fleeFrom || ai.room;
                const pad = fromRm && fromRm.jumpPad;
                if (fromRm && pad) {
                    const padPx = pad.c * this.gridSize + 40, padPy = pad.r * this.gridSize + 40;
                    if (!ai.fled) {
                        // 还困在房内：先走到跳板（到点自动传送）
                        if (!ai.path || ai.path.length === 0) {
                            const p0 = this._findPath(ai.x, ai.y, padPx, padPy);
                            ai.path = p0 || [];
                        }
                        if (Math.hypot(ai.x - padPx, ai.y - padPy) < 40) ai.fled = true; // 已到跳板（传送即将触发）
                    } else if (!this._insideRoom(Math.floor(ai.x / 80), Math.floor(ai.y / 80))) {
                        // 已出房：释放旧房 → 找新房间认领
                        const oldRm = ai.fleeFrom || ai.room;
                        if (oldRm) {
                            oldRm.owners = (oldRm.owners || []).filter(o => o !== ai);
                            if (ai.room === oldRm) ai.room = null;
                        }
                        if (!ai.newRoom) {
                            const cands = this.rooms.filter(r => r !== oldRm && (!r.owners || r.owners.length < (r.capacity || 1)));
                            if (cands.length === 0) { ai.fleeing = false; ai.fled = false; ai.fleeFrom = null; continue; }
                            ai.newRoom = cands[Math.floor(Math.random() * cands.length)];
                            const p0 = this._findPath(ai.x, ai.y, ai.newRoom.frontX, ai.newRoom.frontY);
                            if (p0) p0.push({ x: (ai.newRoom.x + ai.newRoom.tpl.beds[0].c) * 80 + 40, y: (ai.newRoom.y + ai.newRoom.tpl.beds[0].r) * 80 + 40 });
                            ai.path = p0 || [];
                        } else if (!ai.path || ai.path.length === 0) {
                            this._claimRoom(ai, ai.newRoom);
                            ai.fleeing = false; ai.fled = false; ai.fleeFrom = null; ai.newRoom = null;
                        }
                    }
                }
                if (ai.fleeing) continue; // 逃亡中不发育
            }
            const aiRm0 = ai.room;
            if (aiRm0 && !ai.fleeing) {
                const doorPl = this.getPlantAt(aiRm0.doorCol * this.gridSize, aiRm0.doorRow * this.gridSize);
                if (doorPl && doorPl.isDoor && doorPl.hp < doorPl.maxHp * 0.05) {
                    ai.fleeing = true; ai.fled = false; ai.fleeFrom = aiRm0; ai.path = null;
                    continue;
                }
            }
            if (ai.path && ai.path.length > 0) continue; // 还在赶路，等到了床边再开始发育
            
            ai.actTimer = (ai.actTimer || 0) - dt;
            if (ai.actTimer > 0) continue;
            
            // v4.0.30：行动间隔 8~15秒 → 2.5~6秒（用户反馈 AI 建造太慢，改成正常人的建造速度）
            ai.actTimer = 2.5 + Math.random() * 3.5;
            
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
                        this.spawnPlant(rm.x + rm.tpl.beds[0].c, rm.y + rm.tpl.beds[0].r, 'sunshroom', false, ai);
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
                            const targetTier = HauntedDorm.DEFS[p.def.up.to].tier || 1;
                            const zLv = this.ghostLevel || 1;
                            if (targetTier <= zLv + 1) { // 允许+1阶宽限以解锁初级植物升2阶
                                let weight = p.isDoor ? 5 : (p.def.produce ? 2 : 1); // v4.0.30：升门更积极
                                if (p.isDoor && p.hp < p.maxHp * 0.6) weight += 20; // 门血量低时极高优先级升级补血
                                actions.push({ type: 'up', pl: p, cost: c, sporeCost: sc, to: p.def.up.to, weight: weight });
                            }
                        }
                    }
                    // v4.0.37：删除「AI 修补」——门板受伤 AI 花 20 阳光瞬间回 800 血，用户反馈太难（僵尸啃门白啃）
                }
                
                // 2. 尝试种武器与孢子小喷菇
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
                    // 智能阵型规划：离门近的种武器，靠后的种产孢子小喷菇
                    const doorC = rm.doorCol, doorR = rm.doorRow;
                    emptyTiles.sort((a, b) => Math.hypot(a.c - doorC, a.r - doorR) - Math.hypot(b.c - doorC, b.r - doorR));
                    const frontTile = emptyTiles[0]; // 最靠近门
                    const backTile = emptyTiles[emptyTiles.length - 1]; // 靠后
                    
                    // v4.0.31：AI 持续建造——武器上限 2→4、孢子菇 1→2、新增大蒜布防（诊断发现开局预置满编后 AI 永远不再新建）
                    const peaCost = HauntedDorm.DEFS['peashooter'].cost || 0;
                    if (ai.sun >= peaCost && peas.length < 4) {
                        actions.push({ type: 'plant', id: 'peashooter', cost: peaCost, c: frontTile.c, r: frontTile.r, weight: 1 });
                    }
                    const puffCost = HauntedDorm.DEFS['puffshroom'].cost || 200;
                    const sporePlants = myPlants.filter(p => p.def.spore);
                    if (ai.sun >= puffCost && sporePlants.length < 2) {
                        actions.push({ type: 'plant', id: 'puffshroom', cost: puffCost, c: backTile.c, r: backTile.r, weight: 2 });
                    }
                    const garlics = myPlants.filter(p => p.def.isGarlic);
                    if (ai.sun >= 100 && garlics.length < 2 && emptyTiles.length > 1) { // v4.0.33：大蒜上限 2
                        actions.push({ type: 'plant', id: 'garlic', cost: 100, c: frontTile.c, r: frontTile.r, weight: 2 });
                    }
                }

                // v4.0.48：AI 补门逻辑已删（用户实报「它竟然能修复坚果」很抽象）——大门被咬毁即永久消失，谁都补不回来

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
                        this._evolve(chosen.pl, chosen.to, chosen.cost, chosen.sporeCost); // v4.0.47：AI 升级花费同样计入累计投入
                        this._flyText(chosen.pl.c * 80 + 40, chosen.pl.r * 80, `AI 升级！`, '#bfa8e0');
                    } else if (chosen.type === 'plant') {
                        ai.sun -= chosen.cost;
                        const sp = this.spawnPlant(chosen.c, chosen.r, chosen.id, false, ai);
                        if (sp) sp.investSun = chosen.cost; // v4.0.47
                        this._flyText(chosen.c * 80 + 40, chosen.r * 80, `AI 种植！`, '#bfa8e0');
                        if (Math.random() < 0.15) this._say(ai, ["门再厚点！僵尸你过来啊！", "阳光怎么这么少，搞快点！", "只要我跑得快，僵尸就吃不到我脑子！", "这局带飞！稳住我们能赢！", "吓死宝宝了，多种点豌豆压压惊！", "僵尸大哥别杀我，我肉酸！", "我这房间风水好，僵尸看不见我！"][Math.floor(Math.random()*7)]);
                    }
                    // v4.0.37：repair 分支已随「AI 修补」机制一并删除；v4.0.48：plant_door 补门分支一并删除（门毁即永久消失）
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
        // 僵尸等级按时间升级（v4.0.75：僵尸链仅 2 阶——开局小鬼僵尸，5 分钟进化机甲僵王；普通/路障/铁桶/橄榄球/铁门/舞王/冰车/小丑/气球不再出现）
        if (!this.over && this.zombies.length > 0 && !this.zombies[0].dead) {
            const activeSeconds = (time - this.ghostSpawnAt) / 1000;
            const timeLevels = [
                { s: 300, lv: 2 }
            ];
            for (const step of timeLevels) {
                // v4.0.68：< 而非 ===——空投"僵尸降级"会拉低 ghostLevel，旧 === 判定从此永不匹配，僵尸等级卡死不升级
                if (activeSeconds >= step.s && this.ghostLevel < step.lv) {
                    this._levelUpGhostDirect();
                    break;
                }
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
        if (this.isZombieFaction) {
            const aliveCount = [...this.ais, ...(this.player2 ? [this.player2] : [])].filter(v => !v.dead).length;
            const cfg = HauntedDorm.GHOST_LEVELS[this.player.level - 1];
            chip.innerText = `🧟 猎杀模式：存活幸存者 ${aliveCount} 人 ｜ 形态: Lv.${this.player.level} ${cfg ? cfg.name : ''}`;
            return;
        }
        if (!this.ghostSpawned) {
            chip.innerText = `👻 僵尸出笼还有 ${Math.max(0, Math.ceil((this.ghostSpawnAt - now) / 1000))}s`;
        } else if (this.ghostRespawnAt > 0) {
            chip.innerText = `🏆 主僵尸已被击败！肃清剩余残部即可获胜！`; // v4.0.68：旧文案"游戏胜利"误报——主僵尸死后可能还有波次小怪/内鬼没清
        } else {
            const cfg = HauntedDorm.GHOST_LEVELS[this.ghostLevel - 1];
            const lvTxt = this.ghostLevel >= HauntedDorm.GHOST_MAX_LV
                ? `Lv.${this.ghostLevel} ${cfg.name}（最终形态）`
                : `Lv.${this.ghostLevel} ${cfg.name}`;
            chip.innerText = `👻 ${lvTxt} · 击杀 ${this.kills}`;
        }
        // v4.0.20：追加尸潮/昼夜倒计时（所有事件都有预告，绝不搞突然袭击）
        if (!this.isZombieFaction && !this.over) {
            let extra = '';
            if (this.ghostSpawned && this.ghostRespawnAt === 0) {
                extra += ` · 下一波 ${Math.max(0, Math.ceil((this.waveAt - now) / 1000))}s`;
            }
            const dnLeft = Math.max(0, Math.ceil((this.dnNext - now) / 1000));
            extra += this.isNight ? ` · 🌙${dnLeft}s` : ` · ☀${dnLeft}s`;
            if (this.traitor && !this.traitorRevealed) extra += ' · 👥x6';
            chip.innerText += extra;
        }
    }

    // v4.0.15：修复严重 bug——调用处传了第二参 p（双人模式 P2 购买/升级/拆除退款），旧定义却忽略它，全部扣到/加到 P1 头上
    // v4.0.38：AI 产出也走 addSun，旧判定「非 P2 一律写 sun1」把 AI 的阳光写进了 P1 显示框——P1 阳光随 AI 产出不停乱跳（用户实报）
    // 只有点名是真人（P1/P2）才刷对应 DOM，AI 的增减不碰 HUD
    addSun(n, p) {
        p = p || this.player;
        p.sun = Math.max(0, p.sun + n);
        let el = null;
        if (p === this.player2) el = document.getElementById('sun2');
        else if (p === this.player) el = document.getElementById('sun1');
        if (el) el.innerText = p.sun;
        this._refreshPopupCurrency();
        // v4.0.73 成就：守屋阳光累计（仅正向收入）
        if (n > 0 && window.AchTracker) window.AchTracker.dSun(n);
    }

    addSpore(n, p) {
        p = p || this.player;
        p.spore = Math.max(0, p.spore + n);
        let el = null;
        if (p === this.player2) el = document.getElementById('spore2');
        else if (p === this.player) el = document.getElementById('spore1');
        if (el) el.innerText = p.spore;
        this._refreshPopupCurrency();
        // v4.0.73 成就：守屋孢子累计（仅正向收入）
        if (n > 0 && window.AchTracker) window.AchTracker.dSpore(n);
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
        if (this.isZombieFaction) {
            const zBar = document.getElementById('zombie-stats-bar');
            if (zBar) {
                const aliveSurvivors = [...this.ais, ...(this.player2 ? [this.player2] : [])].filter(v => !v.dead).length;
                const cfg = HauntedDorm.GHOST_LEVELS[this.player.level - 1];
                const curBite = Math.round((140 + 75 * (this.player.level - 1)) * (this.player.speedBuffT > 0 ? 1.6 : 1.0));
                zBar.innerHTML = `
                    <span style="color:#ffd54a;">阶级: <b>Lv.${this.player.level} ${cfg ? cfg.name : ''}</b></span>
                    <span style="color:#ff5252;">🩸击杀: <b>${this.kills || 0}</b></span>
                    <span style="color:#4da6ff;">🎯幸存者: <b>${aliveSurvivors}</b></span>
                    <span style="color:#ff9e9e;">⚔啃咬: <b>${curBite}</b></span>
                `;
            }
        } else {
            const s1 = document.getElementById('sun1');
            if (s1) s1.innerText = this.player.sun;
            const sp1 = document.getElementById('spore1');
            if (sp1) sp1.innerText = this.player.spore;
        }
        const skillEl = document.getElementById('skill-hud');
        if (skillEl) {
            if (this.playerAngelic) {
                // v4.0.44：天使双技能面板（取代角色技能）；v4.0.60：功德成长动态显示
                const capSec = this.playerMerit >= 6 ? 5 : 3;
                const capCdMax = this.playerMerit >= 3 ? 20 : 30;
                const spdCdMax = this.playerMerit >= 9 ? 20 : 30;
                const cap = this.player.capCd > 0
                    ? `<span style="color:#777777;"><s>【N】捕获</s> (CD:${Math.ceil(this.player.capCd)}s)</span>`
                    : `<span style="color:#7fd8ff;">【N】捕获</span> <span style="color:#aaaaaa;">(定身僵尸${capSec}秒)</span>`;
                const spd = this.player.spdCd > 0
                    ? `<span style="color:#777777;"><s>【M】加速</s> (CD:${Math.ceil(this.player.spdCd)}s)</span>`
                    : `<span style="color:#ffd700;">【M】加速</span> <span style="color:#aaaaaa;">(6秒疾跑)</span>`;
                skillEl.innerHTML = `😇 ${cap} ｜ ${spd} <span style="color:#ffd54a; font-size:12px;">｜ ⭐功德 ${this.playerMerit || 0}/9 (3:捕获CD20s｜6:定身5s｜9:加速CD20s)</span>`;
            } else if (this.isZombieFaction) {
                // v4.0.61：指挥键位并入技能栏——尸潮冷却与令旗目标动态显示
                const cmdTxt = this.commandTarget
                    ? (this.commandTarget === this.player ? (this.player2 ? 'P2' : '你') : (this.commandTarget.roleDef ? this.commandTarget.roleDef.name : '?'))
                    : '无';
                const hordTxt = this.waveOrderCd > 0
                    ? `<span style="color:#777777;"><s>【H】号令尸潮</s> (CD:${Math.ceil(this.waveOrderCd)}s)</span>`
                    : `<span style="color:#ff5252;">【H】号令尸潮</span>`;
                if (this.player.skillCd > 0) {
                    skillEl.innerHTML = `<span style="color:#aaa;"><s>【M键】狂暴冲刺</s> (CD: ${Math.ceil(this.player.skillCd)}s)</span> ｜ ${hordTxt} <span style="color:#ffd54a; font-size:12px;">⚑ 目标:${cmdTxt} (G切换)</span>`;
                } else {
                    skillEl.innerHTML = `<span style="color:#ff5252;">【M键】狂暴冲刺 (5秒内极速免疫)</span> ｜ ${hordTxt} <span style="color:#ffd54a; font-size:12px;">⚑ 目标:${cmdTxt} (G切换)</span>`;
                }
            } else if (this.player.roleDef) {
                const nut = this.player.nutHealCd > 0
                    ? `<span style="color:#777777;"><s>【N】修门</s> (CD:${Math.ceil(this.player.nutHealCd)}s)</span>`
                    : `<span style="color:#9dff6b;">【N】修门</span> <span style="color:#aaaaaa;">(回25%门板血)</span>`;
                if (this.player.skillCd > 0) {
                    skillEl.innerHTML = `<span style="color:#aaa;"><s>${this.player.roleDef.skillDesc}</s> (CD: ${Math.ceil(this.player.skillCd)}s)</span> ｜ ${nut}`;
                } else {
                    skillEl.innerHTML = `<span style="color:#0f0;">【M键】${this.player.roleDef.skillDesc}</span> ｜ ${nut}`;
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
                const nut2 = (this.player2.nutHealCd || 0) > 0
                    ? `<span style="color:#777777;"><s>【+】修门</s> (CD:${Math.ceil(this.player2.nutHealCd)}s)</span>`
                    : `<span style="color:#9dff6b;">【+】修门</span>`;
                if (this.player2.skillCd > 0) {
                    skillEl2.innerHTML = `<span style="color:#aaa;"><s>【3键】${this.player2.roleDef.skillDesc}</s> (CD: ${Math.ceil(this.player2.skillCd)}s)</span> ｜ ${nut2}`;
                } else {
                    skillEl2.innerHTML = `<span style="color:#4fc3f7;">【3键】${this.player2.roleDef.skillDesc}</span> ｜ ${nut2}`;
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
        if (this.over || this._destroyed) return;
        this.over = true;
        // v4.0.73 成就：守屋胜负
        if (window.AchTracker) window.AchTracker[win ? 'win' : 'lose']('dorm');
        if (this._gameOverTimer) {
            clearTimeout(this._gameOverTimer);
            this._gameOverTimer = null;
        }
        for (const p of this.allPlayers) this.setWatering(p, false); // v4.0.15：结算时关掉所有人的浇水标志
        document.getElementById('wave-announce')?.remove(); // 结算时移除残留的播报字
        this.playSfx(win ? 'winmusic.mp3' : 'losemusic.mp3', 0.6);
        this._closePopup();
        const secs = Math.floor((this.gameTime) / 1000);
        if (this.playerTraitor) {
            // v4.0.44：内鬼结局
            document.getElementById('ov-title').innerText = win ? '😈 内鬼得逞！幸存者团灭！' : '🏠 植物们守住了家园…';
        } else if (this.playerAngelic) {
            // v4.0.44：天使结局
            document.getElementById('ov-title').innerText = win ? '😇 天使的胜利！幸存者都活了下来！' : '😇 天使陨落…';
        } else if (this.isZombieFaction) {
            document.getElementById('ov-title').innerText = win ? '🏆 猎杀完成！' : '💀 猎杀失败…';
        } else {
            document.getElementById('ov-title').innerText = win ? '🏆 僵尸被击倒了！' : '💀 被僵尸抓住了…';
        }
        document.getElementById('ov-title').style.color = win ? '#ffd54a' : '#ff6b6b';
        document.getElementById('ov-time').innerText = `${Math.floor(secs/60)}:${String(secs%60).padStart(2,'0')}`;
        document.getElementById('ov-waves').innerText = this.ghostLevel;
        
        // v4.0.16：MVP 重做——按对僵尸的累计伤害评定（旧逻辑 lastKiller||player 会让"被吃掉的人"因无击杀者而成为 MVP，
        // 且 2P 模式下 P2 会被误显示成"人机-xxx"）
        let mvp = null, bestDmg = 0;
        if (this.isZombieFaction && win) {
            mvp = this.player;
        } else {
            for (const p of this.allPlayers) {
                const d = p.dmgDealt || 0;
                if (d > bestDmg) { bestDmg = d; mvp = p; }
            }
            if (!mvp) mvp = (win ? (this.lastKiller || this.player) : this.player);
        }
        const mvpEl = document.getElementById('ov-mvp');
        if (mvpEl) {
            let dmgTxt = bestDmg > 0 ? ` · 伤害${Math.round(bestDmg)}` : '';
            let label;
            if (this.isZombieFaction && mvp === this.player) {
                label = '你（僵尸）';
                dmgTxt = ` · 击杀 ${this.kills} 人`;
            } else if (mvp === this.player) {
                label = (this.gameMode === '2p' && !this.isZombieFaction) ? `P1（${mvp.roleDef ? mvp.roleDef.name : ''}）` : '你';
            } else if (mvp === this.player2) {
                label = `P2（${mvp.roleDef ? mvp.roleDef.name : ''}）`;
            } else if (mvp.isAi) {
                label = `人机-${mvp.roleDef ? mvp.roleDef.name : ''}`;
            } else {
                label = (mvp.roleDef && mvp.roleDef.name) ? mvp.roleDef.name : '';
            }
            mvpEl.innerText = `本局MVP：${label}${dmgTxt}`;
            mvpEl.style.color = mvp === this.player ? '#00ff00' : (mvp.color || '#ffd54a');
        }

        document.getElementById('dorm-over').style.display = 'flex';
    }

    // v4.0.53：种植菜单三栏渲染（常用/陷阱/高级）——标签+网格同源一次重绘
    _renderPlantMenuTabs() {
        const defs = HauntedDorm.DEFS;
        const tabs = HauntedDorm.MENU_TABS.map(t =>
            `<span class="pm-tab${t.id === this.menuTab ? ' active' : ''}" data-tab="${t.id}">${t.label}</span>`
        ).join('');
        const grid = HauntedDorm.MENU_TABS[this.menuTab].types.map(t => {
            const d = defs[t];
            const price = d.sporeCost ? `🦠${d.sporeCost}` : (d.cost > 0 ? `☀${d.cost}` : '免费');
            return `<div class="plant-option" data-t="${t}"><img src="assets/images/Card/Plants/${d.card}"><br>${d.name}(${price})</div>`;
        }).join('');
        this.plantMenu.innerHTML = `<div class="pm-tabs">${tabs}</div><div class="pm-grid">${grid}</div>`;
    }

    openPlantMenu(mouseX, mouseY) {
        if (this.isZombieFaction || this.playerAngelic || this.playerTraitor) return; // v4.0.44：天使/内鬼不可建造
        if (this.player.dead) return; // v4.0.23：倒下的 P1 不能建造

        const rect = this.vp1.getBoundingClientRect();
        const worldX = mouseX - rect.left + this.player.camX;
        const worldY = mouseY - rect.top + this.player.camY;

        const col = Math.floor(worldX / this.gridSize);
        const row = Math.floor(worldY / this.gridSize);

        if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return;
        if (this.walls.has(`${col},${row}`)) return;
        if (this.plants.some(pl => pl.c === col && pl.r === row)) return;
        // v3.91.0：植物只能种在房间里——房间外的草地不允许种植 (新增: 地刺可以种在门外一格)
        // v4.0.17：改用统一解析器（门邻格优先自己的房间，修「站在自己房间却提示你已经有房间了」）
        const inRoomGrid = !!this._insideRoom(col, row);
        const targetRm = inRoomGrid ? this._insideRoom(col, row) : this._resolveBuildRoom(col, row, this.player);
        const isDoorTile = !!targetRm && (col === targetRm.doorCol && row === targetRm.doorRow);
        let isSpikeTile = false;
        if (!targetRm) {
            this._flyText(col * this.gridSize + 40, row * this.gridSize, '只能种房内，或门周围一格种地刺', '#ff8a8a');
            return;
        }
        if (!inRoomGrid && !isDoorTile) isSpikeTile = true;
        
        // 检查房间归属（v4.0.23：只认真正认领过的 AI——临时避难的 ai.room 不算数，否则会把玩家堵得没法建造）
        if (this.ais.some(ai => ai.room === targetRm && targetRm.owners.includes(ai)) && !this._ownsRoom(this.player, targetRm)) {
            this._flyText(col * this.gridSize + 40, row * this.gridSize, '这是人机的房间！', '#ff8a8a');
            return;
        }
        if (targetRm.owners && !targetRm.owners.includes(this.player) && targetRm.owners.length >= (targetRm.capacity || 1)) {
            this._flyText(col * this.gridSize + 40, row * this.gridSize, '别人的地盘！', '#ff8a8a');
            return;
        }
        // v4.0.18：支持第二间房——空房且自己未满两间即可去建造（建造时自动认领）
        if (!this._ownsRoom(this.player, targetRm) && this._ownedRooms(this.player).length >= 2) {
            this._flyText(col * this.gridSize + 40, row * this.gridSize, '最多只能拥有两间房！', '#ff8a8a');
            return;
        }

        this.menuCol = col;
        this.menuRow = row;
        this.menuOpen = true;

        this.plantMenu.style.display = 'flex';

        // 门格：大门(坚果) / 地刺 / 土豆地雷均可；地刺格：地刺/土豆地雷；房内地皮：其余植物（v4.0.53：门口可种地刺与土豆雷）
        this._applyPlantMenuFilters(isDoorTile, isSpikeTile);

        // v4.0.18：菜单贴边自动回调——格子太靠下/靠右时整体上移/左移，别让下半截被屏幕裁掉
        this.plantMenu.style.left = (mouseX + 20) + 'px';
        this.plantMenu.style.top = (mouseY - 20) + 'px';
        const mr = this.plantMenu.getBoundingClientRect();
        if (mr.bottom > window.innerHeight - 8) {
            this.plantMenu.style.top = Math.max(8, mouseY - 20 - (mr.bottom - window.innerHeight + 8)) + 'px';
        }
        if (mr.right > window.innerWidth - 8) {
            this.plantMenu.style.left = Math.max(8, mouseX + 20 - (mr.right - window.innerWidth + 8)) + 'px';
        }
    }

    // v4.0.53：菜单过滤（门格/地刺格/房内）——tab 切换时也会重跑
    _applyPlantMenuFilters(isDoorTile, isSpikeTile) {
        const opts = this.plantMenu.querySelectorAll('.plant-option');
        const doorOk = t => t === 'wallnut' || t === 'spikeweed' || t === 'firespikeweed' || t === 'spikerock' || t === 'ultimatefirespikeweed' || t === 'potatomine' || t === 'firemine';
        const spikeOk = t => t === 'spikeweed' || t === 'firespikeweed' || t === 'spikerock' || t === 'ultimatefirespikeweed' || t === 'potatomine' || t === 'firemine';
        opts.forEach(opt => {
            if (isDoorTile) {
                opt.style.display = doorOk(opt.dataset.t) ? 'block' : 'none';
            } else if (isSpikeTile) {
                opt.style.display = spikeOk(opt.dataset.t) ? 'block' : 'none';
            } else {
                opt.style.display = (opt.dataset.t === 'spikeweed' || opt.dataset.t === 'firespikeweed' || opt.dataset.t === 'spikerock' || opt.dataset.t === 'ultimatefirespikeweed' || opt.dataset.t === 'wallnut') ? 'none' : 'block';
            }
            // 实时状态：若阳光或孢子不足，视觉置灰提示
            const d = HauntedDorm.DEFS[opt.dataset.t];
            if (d) {
                const canAfford = (!d.cost || this.player.sun >= d.cost) && (!d.sporeCost || this.player.spore >= d.sporeCost);
                if (!canAfford) {
                    opt.style.opacity = '0.55';
                    opt.style.filter = 'grayscale(0.7)';
                } else {
                    opt.style.opacity = '1';
                    opt.style.filter = 'none';
                }
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

    // v4.0.49：僵尸出生/回血点 = 最上排两组房间的正中心（原地图中心圆圈取消，圆圈随布局上移）
    _computeSpawnCenter() {
        const topY = Math.min(...this.rooms.map(r => r.y));
        const topRooms = this.rooms.filter(r => r.y === topY);
        const minX = Math.min(...topRooms.map(r => r.x));
        const maxX = Math.max(...topRooms.map(r => r.x + r.w));
        const minY = Math.min(...topRooms.map(r => r.y));
        const maxY = Math.max(...topRooms.map(r => r.y + r.h));
        this.spawnCenter = { c: Math.round((minX + maxX) / 2), r: Math.round((minY + maxY) / 2) };
    }
    _spawnCenterPx() {
        const sc = this.spawnCenter || { c: Math.round(this.cols / 2), r: Math.round(this.rows / 2) };
        return { x: sc.c * this.gridSize + 40, y: sc.r * this.gridSize + 40 };
    }

    // v4.0.17：统一的「目标格 → 可建造房间」解析——修「站在自己房间却提示『你已经有房间了！』」
    // 根因：键盘建造菜单用外接矩形判定 + 门邻格兜底 find 首个匹配——站在自家门口/桥上（门邻格、
    // 属于房间但不在地形格内）时，门的两侧房间都可能命中，find 抓到隔壁房间 → p.room !== room → 误报
    _resolveBuildRoom(col, row, p) {
        // 1. 真实地形格内（最准）
        const inRm = this._insideRoom(col, row);
        if (inRm) return inRm;
        // 2. 房间包围盒内（站位在床位/装饰格等非地形格上）
        const bbox = this.rooms.find(r => col >= r.x && col < r.x + r.w && row >= r.y && row < r.y + r.h);
        if (bbox) return bbox;
        // 3. 门邻格（地刺区）：优先解析回自己的房间——家门口永远算自己的地盘
        if (p && p.room && Math.abs(col - p.room.doorCol) + Math.abs(row - p.room.doorRow) <= 1) return p.room;
        return this.rooms.find(r => Math.abs(col - r.doorCol) + Math.abs(row - r.doorRow) <= 1) || null;
    }

    // v4.0.18：房间归属助手——每人最多拥有两间房（p.room 主房 + p.room2 副房）
    _ownedRooms(p) {
        const arr = [];
        if (p.room && !arr.includes(p.room)) arr.push(p.room);
        if (p.room2 && !arr.includes(p.room2)) arr.push(p.room2);
        return arr;
    }
    _ownsRoom(p, rm) { return !!rm && (p.room === rm || p.room2 === rm); }
    // 认领房间：别人的地盘 / 满员 / 自己已满两间时认领失败（返回 false）
    _claimRoom(p, rm) {
        if (!rm || this._ownsRoom(p, rm)) return true;
        if (rm.owners && !rm.owners.includes(p) && rm.owners.length >= (rm.capacity || 1)) return false;
        if (this._ownedRooms(p).length >= 2) return false;
        if (rm.owners && rm.owners.length >= (rm.capacity || 1)) return false;
        rm.owners.push(p);
        if (!p.room) p.room = rm; else p.room2 = rm;
        // v4.0.49：选定房间后，顶部控制框按房间左右位置显示（P1 在哪边框在哪边，上下住房自动 P1 左 P2 右）
        if (p === this.player || p === this.player2) this._positionPlayerHud(p);
        // 首个占领者自动在门口放一块坚果门板
        if (rm.owners.length === 1 && !this.plants.some(x => x.c === rm.doorCol && x.r === rm.doorRow)) {
            this.spawnPlant(rm.doorCol, rm.doorRow, 'wallnut', true);
            this.playSfx('plant.mp3', 0.5);
        }
        return true;
    }

    // v4.0.49：玩家选定房间后，顶部“阳光/孢子”控制框才出现，并按房间左右位置落在对应小角
    _positionPlayerHud(p) {
        const rm = p.room || p.room2;
        if (!rm) return;
        const isLeft = (rm.x + rm.w / 2) * this.gridSize < this.worldWidth / 2;
        const place = (el, left) => {
            if (!el) return;
            el.style.display = 'flex';
            el.style.flexDirection = 'column';
            if (left) { el.style.left = '20px'; el.style.right = 'auto'; }
            else { el.style.right = '20px'; el.style.left = 'auto'; }
        };
        if (p === this.player) {
            place(document.getElementById('hud-p1'), isLeft);
        } else if (p === this.player2) {
            place(document.getElementById('p2-hud'), isLeft);
        }
        this._fixVerticalPairHuds(); // 双人：上下住房或同侧住房 → 强制 P1 左、P2 右，防 HUD 重叠
    }
    // 双人 HUD 防重叠：房间一上一下（中心行差 ≥4 格）或两人房间同在画面一侧时，
    // 不按左右判位置，固定 P1 左上、P2 右上；只有明确一左一右时各自归位。
    _fixVerticalPairHuds() {
        if (!this.player2) return;
        const p1 = document.getElementById('hud-p1');
        const p2 = document.getElementById('p2-hud');
        const p1rm = this.player.room || this.player.room2;
        const p2rm = this.player2.room || this.player2.room2;
        if (!p1rm || !p2rm) return;
        const p1c = p1rm.y + p1rm.h / 2;
        const p2c = p2rm.y + p2rm.h / 2;
        const p1Left = (p1rm.x + p1rm.w / 2) * this.gridSize < this.worldWidth / 2;
        const p2Left = (p2rm.x + p2rm.w / 2) * this.gridSize < this.worldWidth / 2;
        // 上下住房 或 两人同侧住房（都会叠在一起）→ P1 左、P2 右
        if (Math.abs(p1c - p2c) >= 4 || p1Left === p2Left) {
            if (p1) { p1.style.left = '20px'; p1.style.right = 'auto'; }
            if (p2) { p2.style.right = '20px'; p2.style.left = 'auto'; }
            return;
        }
        // 一左一右 → 各自归位（v4.0.49 用户要求：P1 在哪边框在哪边）
        if (p1) { if (p1Left) { p1.style.left = '20px'; p1.style.right = 'auto'; } else { p1.style.right = '20px'; p1.style.left = 'auto'; } }
        if (p2) { if (p2Left) { p2.style.left = '20px'; p2.style.right = 'auto'; } else { p2.style.right = '20px'; p2.style.left = 'auto'; } }
    }

    doPlant(type) {
        this._closePlantMenu();

        const col = this.menuCol;
        const row = this.menuRow;
        if (col == null || row == null || col < 0 || col >= this.cols || row < 0 || row >= this.rows) return;
        const tx = col * 80 + 40, ty = row * 80;

        if (this.plants.some(pl => pl.c === col && pl.r === row)) {
            this._flyText(tx, ty, '该位置已有植物！', '#ff8a8a');
            this.playSfx('buzzer.mp3', 0.3);
            return;
        }

        let p = this.player;

        // v4.0.17：统一房间解析器
        let targetRm = this._resolveBuildRoom(col, row, p);

        // v4.0.18：建造时认领房间（支持主房+副房，最多两间）
        if (targetRm) this._claimRoom(p, targetRm);

        const def = HauntedDorm.DEFS[type];
        if (!def) return;
        if (type === 'iceshroom') {
            const hostiles = this._getHostileTargets().filter(z => !z.dead);
            if (hostiles.length === 0) {
                this._flyText(tx, ty, '当前无敌对目标，无法施放', '#ff8a8a');
                this._flyText(p.x, p.y, '当前无敌对目标，无法施放', '#ff8a8a');
                this.playSfx('buzzer.mp3', 0.3);
                return;
            }
        }

        const cost = def.cost || 0;
        const sporeCost = def.sporeCost || 0;
        if (sporeCost > 0) {
            if (p.spore < sporeCost) {
                this._flyText(tx, ty, `🦠 孢子不足 (需${sporeCost}，当前${Math.floor(p.spore)})`, '#ff8a8a');
                this._flyText(p.x, p.y - 20, `🦠 孢子不足 (需${sporeCost})`, '#ff8a8a');
                this.playSfx('buzzer.mp3', 0.3);
                return;
            }
            this.addSpore(-sporeCost, p);
        } else if (cost > 0) {
            if (p.sun < cost) {
                this._flyText(tx, ty, `☀ 阳光不足 (需${cost}，当前${Math.floor(p.sun)})`, '#ff8a8a');
                this._flyText(p.x, p.y - 20, `☀ 阳光不足 (需${cost})`, '#ff8a8a');
                this.playSfx('buzzer.mp3', 0.3);
                return;
            }
            this.addSun(-cost, p);
        }

        const isDoor = !!targetRm && (col === targetRm.doorCol && row === targetRm.doorRow);
        // v4.0.48：门毁即永久——门口格空着（原门已被咬毁）时禁止任何人重种门板（AI 补门已删，玩家同样不行）
        if (isDoor && !this.plants.some(q => q.c === col && q.r === row)) {
            if (sporeCost > 0) this.addSpore(sporeCost, p); // 已扣费，全额原路退还
            else if (cost > 0) this.addSun(cost, p);
            this._flyText(tx, ty, '🚪 大门已被咬毁，永久失效，无法重建！', '#ff8a8a');
            this.playSfx('buzzer.mp3', 0.3);
            return;
        }
        const spawned = this.spawnPlant(col, row, type, isDoor, p); // v4.0.23：带上种植者与门板属性
        if (!spawned && type !== 'iceshroom' && type !== 'cherrybomb') {
            // 保底兜底：若意外阻断未成功生成植物，全额原路退还（v4.0.53：樱桃炸弹一次性不退还）
            if (sporeCost > 0) this.addSpore(sporeCost, p);
            else if (cost > 0) this.addSun(cost, p);
            this._flyText(tx, ty, '建造未生效，已全额退还！', '#ff8a8a');
        } else if (spawned) {
            // v4.0.47：记录真实投入（拆除返还一半的依据）；盲盒开出的是随机赠品，不计投入（用户规格：从盲盒里开到的除外）
            const isBoxRoll = (type === 'blindbox');
            spawned.investSun = isBoxRoll ? 0 : cost;
            spawned.investSpore = isBoxRoll ? 0 : sporeCost;
            // v4.0.73 成就：守屋种植累计（盲盒开出另计 dBlind，不重复计种植）
            if (window.AchTracker && !isBoxRoll) window.AchTracker.dPlant();
        }
    }

    _useSkill(target = null) {
        // v4.0.16：接收目标玩家——原实现忽略参数，2P 模式下 P2 按 /键 释放的技能加在了 P1 身上
        const p = target || this.player;
        if (p.skillCd > 0) return;
        if (this._zombieFrozen()) return; // v4.0.30：开局 10 秒观察期内不可行动
        // v4.0.73 成就：释放技能累计（任意阵营）
        if (window.AchTracker) window.AchTracker.bump('dSkill', 1);

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
            const rms = this._ownedRooms(p);
            if (rms.length === 0) {
                this._announce('❌ 你还没有绑定任何房间！', 'buzzer.mp3');
                return;
            }
            // 优先检测当前肉身所在/邻近的房间，否则扫描名下大门可升级的房间
            let targetRm = null, targetDoor = null;
            const curRm = this._insideRoom(Math.floor(p.x / 80), Math.floor(p.y / 80));
            if (curRm && rms.includes(curRm)) {
                const d = this.getPlantAt(curRm.doorCol * this.gridSize, curRm.doorRow * this.gridSize);
                if (d && d.def.up) { targetRm = curRm; targetDoor = d; }
            }
            if (!targetDoor) {
                for (const rm of rms) {
                    const d = this.getPlantAt(rm.doorCol * this.gridSize, rm.doorRow * this.gridSize);
                    if (d && d.def.up) { targetRm = rm; targetDoor = d; break; }
                }
            }
            if (targetDoor && targetDoor.def.up) {
                p.skillCd = 60;
                this._evolve(targetDoor, targetDoor.def.up.to);
                const rmLabel = (targetRm === p.room2) ? '副房' : '主房';
                this._announce(`🌰 技能激活：${rmLabel}大门免费升级完毕！`, 'points.mp3');
            } else {
                this._announce('❌ 门不存在或无法再升级！', 'buzzer.mp3');
                return;
            }
        } else if (r === 'chomper') {
            const hostiles = this._getHostileTargets().filter(z => !z.dead);
            if (hostiles.length === 0) {
                this._announce('❌ 当前场上没有敌对僵尸！', 'buzzer.mp3');
                return;
            }
            // v4.0.49：大嘴花大招重做——不再单体重创（那是倭瓜的事），改为怒吼赶跑全场僵尸 10 秒：
            // 场上有“别人”（其他幸存者）→ 全场僵尸全部被赶到最近别人的房间门口；
            // 只剩自己 → 赶到回血台待 10 秒再返回。CD 由 60s 缩短为 30s。
            p.skillCd = 30;
            const others = [...this.ais, ...(this.player2 ? [this.player2] : [])].filter(v => !v.dead && v !== p);
            const scP = this._spawnCenterPx();
            for (const z of hostiles) {
                z.chomperScareT = 10;
                z.retreating = false; // 赶跑≠撤退：不许借机跑回家回血
                z.isHealing = false;
                let tx = scP.x, ty = scP.y; // 只剩自己 → 回血台
                if (others.length > 0) {
                    let best = null, bestD = Infinity;
                    for (const o of others) {
                        const orm = o.room || o.room2;
                        if (!orm) continue;
                        const d = Math.hypot(orm.doorCol * this.gridSize + 40 - z.x, orm.doorRow * this.gridSize + 40 - z.y);
                        if (d < bestD) { bestD = d; best = orm; }
                    }
                    if (best) { tx = best.doorCol * this.gridSize + 40; ty = best.doorRow * this.gridSize + 40; }
                }
                z.scareX = tx;
                z.scareY = ty;
                this._flyText(z.x, z.y - 20, '🌸 吓跑了！', '#ff69b4');
                if (z.hpBg) z.hpBg.style.display = 'block';
            }
            this._announce('🌸 技能激活：大嘴花怒吼——僵尸全被赶跑10秒！', 'chomp.mp3');
        } else if (r === 'squash') {
            const hostiles = this._getHostileTargets().filter(z => !z.dead);
            if (hostiles.length === 0) {
                this._announce('❌ 当前场上没有敌对僵尸！', 'buzzer.mp3');
                return;
            }
            let targetZb = hostiles[0], bestScore = Infinity;
            for (const z of hostiles) {
                const d = Math.hypot(z.x - p.x, z.y - p.y);
                const score = d - (z.lockedTarget === p ? 250 : 0);
                if (score < bestScore) { bestScore = score; targetZb = z; }
            }
            p.skillCd = 60;
            const dealt = Math.min(targetZb.hp, Math.max(1, Math.round(targetZb.maxHp * 0.5)));
            if (p.roleDef) p.dmgDealt = (p.dmgDealt || 0) + dealt;
            targetZb.hp -= dealt;
            if (targetZb.hpBg) targetZb.hpBg.style.display = 'block';
            this._flyText(targetZb.x, targetZb.y - 30, `-${dealt} 🎃倭瓜泰山压顶!`, '#ff9800');
            if (targetZb.hp <= 0) this._killZombie(targetZb, p);
            this._announce('🎃 技能激活：倭瓜重创了敌人！', 'squash_hmm.mp3');
        }
        this._refreshHud();
    }

    bindInput() {
        this._onKeyDown = e => {
            const key = e.key ? e.key.toLowerCase() : '';
            this.keys[key] = true;
            if (e.key) this.keys[e.key] = true;
            if (e.code) this.keys[e.code] = true;
            if (!e.repeat) {
                this.keysJustPressed[key] = true;
                if (e.key) this.keysJustPressed[e.key] = true;
                if (e.code) this.keysJustPressed[e.code] = true;
            }
            if ((key === 'm' || e.code === 'KeyM') && !e.repeat && this.player && !this.player.dead) {
                // v4.0.44：天使形态 M=加速；内鬼/普通形态 M=角色技能
                if (this.playerAngelic) {
                    if (this.player.spdCd <= 0) this._angelSpeed();
                } else if (!this.playerTraitor && this.player.skillCd <= 0) {
                    this._useSkill(this.player);
                }
            }
            // N 键：v4.0.44 天蛇形态=捕获；v4.0.48 普通植物形态=坚果门板修复（CD 60s）
            if ((key === 'n' || e.code === 'KeyN') && !e.repeat && this.player && !this.player.dead) {
                if (this.playerAngelic) {
                    if (this.player.capCd <= 0) this._angelCapture();
                } else if (!this.isZombieFaction && !this.playerTraitor) {
                    this._healDoor(this.player);
                }
            }
            // v4.0.48：P2 加号键（小键盘+）坚果门板修复
            if ((key === '+' || e.code === 'NumpadAdd') && !e.repeat && this.gameMode === '2p' && this.player2 && !this.player2.dead && !this.isZombieFaction) {
                this._healDoor(this.player2);
            }
            // v4.0.53：倭瓜技能——P1 B 键、P2 5 键（2 分钟 CD，打掉僵尸一半血）
            if ((key === 'b' || e.code === 'KeyB') && !e.repeat && this.player && !this.player.dead) {
                this._squashSkill(this.player);
            }
            if ((key === '5' || e.code === 'Digit5' || e.code === 'Numpad5') && !e.repeat && this.gameMode === '2p' && this.player2 && !this.player2.dead) {
                this._squashSkill(this.player2);
            }
            if ((key === '/' || key === '3' || key === 'pagedown' || e.code === 'Slash' || e.code === 'Digit3' || e.code === 'Numpad3' || e.code === 'PageDown') && !e.repeat && this.gameMode === '2p' && this.player2 && this.player2.skillCd <= 0) {
                this._useSkill(this.player2);
            }
            if (e.code === 'Space') {
                e.preventDefault();
            }
            if ((key === ' ' || e.code === 'Space') && !e.repeat && !this.isZombieFaction && !this.playerAngelic && !this.playerTraitor) {
                this.setWatering(this.player, !this.player.waterOn);
            }
            // v4.0.15：P2 浇水开关（0键 / 小键盘0）——全量支持 e.code
            if ((key === '0' || e.code === 'Digit0' || e.code === 'Numpad0') && !e.repeat && this.gameMode === '2p' && this.player2 && !this.isZombieFaction) {
                this.setWatering(this.player2, !this.player2.waterOn);
            }
            // v4.0.61：僵尸阵营指挥——G 键循环切换优先猎杀目标；H 键号令尸潮（60s CD）
            if ((key === 'g' || e.code === 'KeyG') && !e.repeat && this.isZombieFaction && this.player && !this.player.dead) {
                this._cycleCommandTarget();
            }
            if ((key === 'h' || e.code === 'KeyH') && !e.repeat && this.isZombieFaction && this.player && !this.player.dead) {
                this._orderHorde();
            }
        };

        this._onKeyUp = e => {
            const key = e.key ? e.key.toLowerCase() : '';
            this.keys[key] = false;
            if (e.key) this.keys[e.key] = false;
            if (e.code) this.keys[e.code] = false;
        };

        // 【优化1】防卡键：当浏览器失去焦点时强制清空所有按键状态
        this._onBlur = () => {
            this.keys = {};
            this.keysJustPressed = {};
        };

        window.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('keyup', this._onKeyUp);
        window.addEventListener('blur', this._onBlur);

        this._onVp1MouseDown = e => {
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
        };
        this.vp1.addEventListener('mousedown', this._onVp1MouseDown);
    }

    // ===== 浇水（per-player）：v4.0.39 不再直接产阳光（阳光一律由植物夜晚自动产出），保留催熟身边植物（加速生产/射击周期）；v4.0.48 回血自愈已删（用户实报：僵尸啃向日葵时它自己回血很抽象——植物不再有任何自愈途径，门板只能靠 N/加号键修复） =====
    _water(p) {
        p = p || this.player;
        if (p === this.player || p === this.player2) this.playSfx('plant_water.mp3', 0.4); // v4.0.31：AI 自动浇水不播声
        let fedAny = false;
        for (const pl of this.plants) {
            const px = pl.c * 80 + 40, py = pl.r * 80 + 40;
            if (Math.hypot(p.x - px, p.y - py) < 130) {
                fedAny = true;
                // 真正催熟身边植物：加速生产周期、加速射击冷却（v4.0.48：微量回血自愈已删——植物血量不可再生）
                if (pl.prodT !== undefined) pl.prodT += 0.2;
                if (pl.sporeT !== undefined) pl.sporeT += 0.2;
                if (pl.def.feed) {
                    pl.fed = (pl.fed || 0) + 1;
                    if (pl.fed >= pl.def.feed.goal) {
                        this._flyText(px, py, `${pl.def.name} 进化了！`, '#9dff6b');
                        this.playSfx('readysetplant.mp3', 0.5);
                        this._evolve(pl, pl.def.feed.to);
                    } else {
                        this._refreshPrompt(pl);
                    }
                }
            }
        }
        // v4.0.39：飘字节流提示催熟（不再显示 +☀）
        p.waterTick = (p.waterTick || 0) + 1;
        if (p.waterTick % 5 === 1 && fedAny) {
            this._flyText(p.x, p.y - 20, `🚿 催熟中`, '#9bd8ff');
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

    _findPath(startX, startY, targetX, targetY, passDoors = true) {
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
            // v4.0.16：门板(isDoor)对玩家方(玩家/人机)不阻挡——玩家可自由过门，AI 同权；
            // 僵尸(passDoors=false)仍视门板为障碍，会被引导到门前啃门。
            // 原先门格一律阻挡 → 玩家造门后其他 AI 进房 BFS 必失败 → 走直线穿墙（用户实拍 bug）
            if (!pl.def.ground && !(passDoors && pl.isDoor)) plantMap[pl.r * this.cols + pl.c] = 1;
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
        
        // v4.0.16：寻路失败返回 null（原返回直线目标 → AI 直线穿墙）——调用方必须兜底
        if (!found) return null;
        
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

    // v4.0.72：跳板传送——植物方实体（玩家/玩家2/AI/内鬼）踩上跳板 → 瞬移到房间门外空地。
    // 僵尸不触发（否则守屋失去意义）；传送清空 path 防寻路死循环；每跳板 2s 冷却
    // v4.0.74：拆除规则——路灯花(plantern)、坚果(wallnut/tallnut/nutlv/garlic 大蒜链)、向日葵(sunflower 系)不可拆除
    _canDemolish(pl) {
        if (!pl) return false;
        const t = pl.type || (pl.def && pl.def.type) || '';
        if (t === 'plantern' || t.indexOf('plantern') === 0) return false;
        if (t === 'sunflower' || t.indexOf('sunflower') >= 0) return false;
        if (t === 'nut' || t === 'wallnut' || t === 'tallnut' || t.indexOf('nut') === 0) return false;
        if (t.indexOf('garlic') >= 0) return false; // 大蒜→冰蒜卫士→金蒜坚果→蒜味高坚果 属坚果防御链
        return true;
    }
    _updateJumpPads(dt) {
        const ents = [];
        if (this.player && !this.player.dead) ents.push(this.player);
        if (this.player2 && !this.player2.dead) ents.push(this.player2);
        for (const ai of this.ais) if (!ai.dead) ents.push(ai);
        if (ents.length === 0) return;
        for (const rm of this.rooms) {
            const pad = rm.jumpPad;
            if (!pad) continue;
            if (pad.cd > 0) { pad.cd -= dt; continue; }
            const px = pad.c * this.gridSize + 40, py = pad.r * this.gridSize + 40;
            for (const e of ents) {
                if (e.isZombie) continue; // v4.0.72 语义：僵尸（阵营玩家/内鬼）不触发跳板
                if (Math.hypot(e.x - px, e.y - py) < 34) {
                    if (e._jumpFly) continue; // 已在飞行中
                    // v4.0.74：跳板改为飞向玩家出生点（地图中心），抛物线动画在 _tick 插值
                    const t = this._jumpPadTarget(rm);
                    e._jumpFly = { sx: e.x, sy: e.y, tx: t.x, ty: t.y, elapsed: 0, origT: e.el1 ? e.el1.style.transform : '' };
                    e.path = null; e.pathTimer = 0; e.stuck = 0;
                    pad.cd = 2;
                    // v4.0.73 成就：使用跳板累计
                    if (window.AchTracker) window.AchTracker.bump('dJump', 1);
                    this._flyText(e.x, e.y - 30, '🪂 跳板起飞！', '#a9ffa9');
                    this.playSfx('plant.mp3', 0.5);
                    break;
                }
            }
        }
    }
    // 跳板落点：v4.0.74 改为玩家出生点（地图中心防墙校正后的坐标）——不再落到门口被僵尸堵抓
    _jumpPadTarget(rm) {
        const sp = this.spawnPoint || { x: Math.round(this.worldWidth / 2), y: Math.round(this.worldHeight / 2) };
        // 兜底：出生点被植物/墙占时向外螺旋找空位（正常不会发生）
        let tx = sp.x, ty = sp.y;
        let guard = 0;
        while ((this.getPlantAt(tx, ty) || this.walls.has(Math.floor(tx / 80) + ',' + Math.floor(ty / 80))) && guard++ < 8) {
            tx += 80; ty += 80;
        }
        return { x: tx, y: ty };
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
            if (!this._shroomAwake() && this._isShroom(pl.def)) continue; // v4.0.20：白天蘑菇睡觉
            pl.shootCd -= dt;
            if (pl.shootCd > 0) continue;
            const px = pl.c * 80 + 40, py = pl.r * 80 + 40;
            let best = null, bestD = (sh ? sh.range : lob.range);
            const targets = this._getHostileTargets();
            for (const zb of targets) {
                if (zb.dead) continue;
                const d = Math.hypot(zb.x - px, zb.y - py);
                if (d < bestD) { bestD = d; best = zb; }
            }
            if (!best) continue;

            const rm = this._insideRoom(pl.c, pl.r);
            // v4.0.23：优先按种植者记账；查不到不再兜底给 P1（旧兜底把 P2 的输出全记到 P1 头上，MVP 冤案根源）
            const owner = pl.owner || ((rm && rm.owners && rm.owners.length > 0) ? rm.owners[0] : null);
            let dmgMul = this.plantDmgBoostT > 0 ? 2 : 1; // v4.0.19：狂怒祝福——伤害翻倍
            // v4.0.53：火爆辣椒光环——攻击植物离僵尸越近伤害越高（隔 1 格 ×1.5、远一点 ×1.25、再远 ×1.1，永不减伤）
            if (this._jalapenoActive) {
                const dd = Math.hypot(best.x - px, best.y - py);
                if (dd < 160) dmgMul *= 1.5;
                else if (dd < 240) dmgMul *= 1.25;
                else if (dd < 320) dmgMul *= 1.1;
            }

            if (lob) {
                pl.shootCd = (lob.cd || 1.5) * (pl._cbShootMul || 1); // v4.0.53：樱桃炸弹攻速增益
                const isButter = lob.stunChance && Math.random() < lob.stunChance;
                this._firePea(px, py, Math.atan2(best.y - py, best.x - px), lob.dmg * dmgMul,
                    { img: isButter ? 'Plants/KernelPult/butter.png' : lob.img, range: lob.range, aoe: lob.aoe, speed: 300, size: 34, owner, stunTime: isButter ? lob.stunTime : 0 });
            } else {
                if (sh.crazySpray && Math.random() < sh.crazySpray) {
                    pl.crazySpray = 10;
                }
                
                if (pl.crazySpray > 0) {
                    pl.shootCd = 0.1;
                    pl.crazySpray--;
                } else {
                    pl.shootCd = (sh.cd || 1.5) * (pl._cbShootMul || 1); // v4.0.53：樱桃炸弹攻速增益
                }
                
                let isFocus = sh.focus && (best.lockedTarget === this.player || (best.lockedTarget && best.lockedTarget === owner));
                const base = Math.atan2(best.y - py, best.x - px);
                if (sh.fan) { // 三线/忧郁菇：扇形多向
                    for (let i = 0; i < sh.n; i++) {
                        const a = isFocus ? base : base + (i - (sh.n - 1) / 2) * sh.fan;
                        this._firePea(px, py, a, sh.dmg * dmgMul, { img: sh.img, range: sh.range, slow: sh.slow, homing: sh.homing, owner });
                    }
                } else { // 连发：同向串行
                    const actualN = (sh.dualChance && Math.random() < sh.dualChance) ? 2 : sh.n;
                    for (let i = 0; i < actualN; i++) {
                        this._firePea(px - Math.cos(base) * i * 22, py - Math.sin(base) * i * 22, base, sh.dmg * dmgMul,
                            { img: sh.img, range: sh.range, slow: sh.slow, homing: sh.homing, owner });
                    }
                }
                if (sh.back) { // 双向射手：脑后再补一发
                    this._firePea(px, py, base + Math.PI, sh.dmg * dmgMul, { img: sh.img, range: sh.range, slow: sh.slow, homing: sh.homing, owner });
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
                for (const zb of this._getHostileTargets()) {
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
            const targets = this._getHostileTargets();
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
                        // v4.0.53：火炬树桩——攻击每命中一次，为出手者产一个阳光（伤害越高阳光越多）
                        if (this._torchActive && pea.owner && !pea.owner.isAi) {
                            const tsun = Math.max(1, Math.round(pea.dmg / 16));
                            if (pea.owner === this.player || pea.owner === this.player2) this.addSun(tsun, pea.owner);
                            else pea.owner.sun = (pea.owner.sun || 0) + tsun;
                        }
                        // v4.0.16：MVP 伤害归属——按出手者（玩家/人机）累计对僵尸的实际伤害
                        if (pea.owner && pea.owner.roleDef) {
                            pea.owner.dmgDealt = (pea.owner.dmgDealt || 0) + pea.dmg + (pea.pctDmg ? z.maxHp * pea.pctDmg : 0);
                        }
                        if (pea.pctDmg) {
                            // 毁灭大炮特效
                            const boom = this._getDomElement('boom');
                            boom.style.cssText = `position:absolute; left:${pea.x-100}px; top:${pea.y-100}px; width:200px; height:200px; border-radius:50%; background:radial-gradient(circle, rgba(190,120,255,0.9) 0%, rgba(255,0,0,0) 70%); z-index:600; pointer-events:none;`;
                            setTimeout(() => this._recycleDomElement('boom', boom), 400);
                            this.playSfx('explosion.mp3', 0.4);
                        }
                        if (pea.slow) z.slowT = 2.5;
                        if (pea.stunTime) z.stunT = Math.max(z.stunT || 0, pea.stunTime);
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

    // v4.0.23：P1 倒下的统一处理——双人模式只要 P2 还活着就继续，不再直接结算
    // 注意：allPlayers 含 5 个人机（他们几乎不会死），结算判定只能看真人玩家
    _humansAll() { return this.player2 ? [this.player, this.player2] : [this.player]; }

    _checkP1Down() {
        if (this.player.dead || this.player.hp > 0) return;
        this.player.dead = true;
        this.player.el1.classList.add('dead-slash');
        this.player.el1.style.filter = 'grayscale(1)';
        this.player.vx = 0; this.player.vy = 0;
        // v4.0.44：单人模式首次阵亡 → 弹出「天使 / 内鬼」抉择框（天使/内鬼形态下再倒下=直接结算）
        // v4.0.48：僵尸阵营不弹抉择（用户实报：当僵尸死了也弹天使/内鬼很抽象）——只有单人植物方才有，僵尸玩家死亡直接结算
        if (this.gameMode !== '2p' && !this.isZombieFaction && !this.playerAngelic && !this.playerTraitor && !this.over) {
            this._showFateChoice();
            return;
        }
        if (this.playerAngelic) this._announce('😇 天使陨落！你被僵尸抓住了…', 'scream.mp3', true);
        if (this._humansAll().every(q => q.dead)) {
            this.gameOver(false);
        } else {
            this._announce('💀 P1 倒下了！P2 继续战斗！', 'scream.mp3', true);
        }
    }

    // v4.0.65：植物方存活成员数（人机 AI + 植物形态的 P1/P2；内鬼/僵尸阵营玩家/AI 内鬼不算植物方）
    _plantSideAlive() {
        let n = 0;
        for (const a of this.ais) {
            if (!a.dead && !a.isTraitor) n++; // AI 内鬼反水后不算幸存者
        }
        for (const p of [this.player, this.player2]) {
            if (p && !p.dead && !p.isZombie) n++; // 僵尸形态（僵尸阵营玩家/玩家内鬼）不算植物方
        }
        return n;
    }

    _checkPlayerDown(p) {
        if (!p || p.dead || p.hp > 0) return;
        if (p === this.player) {
            this._checkP1Down();
        } else if (p === this.player2) {
            p.dead = true;
            p.el1.classList.add('dead-slash');
            p.el1.style.filter = 'grayscale(1)';
            p.vx = 0; p.vy = 0;
            if (this._humansAll().every(q => q.dead)) {
                this.gameOver(false);
            } else {
                this._announce('💔 P2 倒下了！P1 继续战斗！', 'scream.mp3', true);
            }
        } else {
            p.dead = true;
            p.el1.classList.add('dead-slash');
            p.el1.style.filter = 'grayscale(1)';
            p.vx = 0; p.vy = 0;
            // v4.0.44：天使形态下——人机全灭=没人可帮，直接失败结算
            if (this.playerAngelic && this.ais.every(a => a.dead)) {
                this.gameOver(false);
                return;
            }
            // v4.0.61：内鬼形态下——全部植物（幸存者）死光（不含内鬼自己）= 内鬼胜利。
            // 旧版这里只判了天使，内鬼把 5 个人机咬死后没有任何结算 → 游戏永远不结束（用户实报）
            // v4.0.65：改为统一判定"植物方全灭"（含双人 P2 植物形态、AI 内鬼反水排除）——
            // 用户实报"只要场上都是僵尸和内鬼就直接宣布胜利"，此前人机全灭即判胜、漏判 P2 还在守屋的情况
            if (this.playerTraitor && this._plantSideAlive() === 0) {
                this._announce('😈 内鬼屠尽了所有幸存者——邪恶胜利！', 'evillaugh.mp3', true);
                this.gameOver(true);
                return;
            }
            if (this.ghostLevel >= 4) this._levelUpGhostDirect();
        }
    }

    // ===== v4.0.44：单人死亡抉择——天使 / 内鬼 二选一 =====
    _showFateChoice() {
        if (this._fateShown) return;
        this._fateShown = true;
        this.fateOpen = true; // 全场冻结（loop 里拦截）
        document.getElementById('fate-choice')?.remove();
        const ov = document.createElement('div');
        ov.id = 'fate-choice';
        ov.style.cssText = 'position:fixed; left:0; top:0; width:100%; height:100%; background:rgba(0,0,0,0.82); z-index:9000; display:flex; align-items:center; justify-content:center; font-family:"Kaiti SC",serif;';
        ov.innerHTML = `
            <div style="background:#2a2118; border:3px solid #8a6d2f; border-radius:16px; padding:30px 42px; text-align:center; box-shadow:0 0 40px rgba(0,0,0,0.9); max-width:700px;">
                <div style="font-size:34px; color:#ffd54a; font-weight:bold; text-shadow:2px 2px 0 #000; margin-bottom:6px;">💀 你倒下了…</div>
                <div style="font-size:17px; color:#cccccc; margin-bottom:22px;">最后的执念让你获得了第二次选择——</div>
                <div style="display:flex; gap:22px; justify-content:center;">
                    <div id="fate-angel" style="cursor:pointer; width:264px; background:#3a2f14; border:2px solid #ffd700; border-radius:12px; padding:16px 14px; transition:transform 0.15s;">
                        <div style="font-size:42px;">😇</div>
                        <div style="font-size:24px; color:#ffd700; font-weight:bold; margin:4px 0 8px;">天 使</div>
                        <div style="font-size:13.5px; color:#dddddd; line-height:1.7; text-align:left;">
                            · 头顶光环，无房无产出，不可建造升级<br>
                            · <b style="color:#7fd8ff;">【N】捕获</b>：100% 命中，定住僵尸 3 秒（不能挠门、不能回血，站桩挨打）<br>
                            · <b style="color:#ffd700;">【M】加速</b>：6 秒疾跑，甩开僵尸的追杀<br>
                            · <b style="color:#ffd54a;">⭐ 功德成长</b>：每捕获一只僵尸 +1 功德——功德 3 捕获CD 30s→20s；功德 6 定身 3s→5s；功德 9 加速CD 30s→20s<br>
                            · 已不再是存活者：<b style="color:#ff8a8a;">不再收到每 90 秒的存活祝福</b><br>
                            · <b style="color:#ff8a8a;">僵尸会来追杀你，只有一条命——被抓住直接 Game Over！</b><br>
                            · 帮人机活到僵尸被消灭即胜利！
                        </div>
                    </div>
                    <div id="fate-traitor" style="cursor:pointer; width:264px; background:#33161a; border:2px solid #c62828; border-radius:12px; padding:16px 14px; transition:transform 0.15s;">
                        <div style="font-size:42px;">😈</div>
                        <div style="font-size:24px; color:#ff5252; font-weight:bold; margin:4px 0 8px;">内 鬼</div>
                        <div style="font-size:13.5px; color:#dddddd; line-height:1.7; text-align:left;">
                            · 旁边贴上「😈 内鬼」标签<br>
                            · 血量 = 当前僵尸的血量<br>
                            · 走到人机门口挠门、贴身咬人（跟僵尸一样）<br>
                            · <b style="color:#ff5252;">😈 堕落成长</b>：每拆掉一株植物/门板或咬杀一名幸存者 +1 堕落值——伤害 +25%、血上限 +10%（封顶 6 层：伤害 +150%、血量 +77%）<br>
                            · 已不再是存活者：<b style="color:#ff8a8a;">不再收到每 90 秒的存活祝福</b><br>
                            · <b style="color:#ffd54a;">团灭所有幸存者即胜利！</b><br>
                            · 若主僵尸被植物消灭，内鬼计划失败…
                        </div>
                    </div>
                </div>
                <div id="fate-giveup" style="cursor:pointer; margin-top:18px; font-size:13px; color:#888888; text-decoration:underline;">放弃机会，直接结算失败</div>
            </div>`;
        document.body.appendChild(ov);
        ov.querySelector('#fate-angel').onclick = () => this._becomeAngel(ov);
        ov.querySelector('#fate-traitor').onclick = () => this._becomeTraitor(ov);
        ov.querySelector('#fate-giveup').onclick = () => { ov.remove(); this.fateOpen = false; this.gameOver(false); };
    }

    _becomeAngel(ov) {
        ov.remove();
        this.fateOpen = false;
        this.keys = {}; this.keysJustPressed = {};
        const p = this.player;
        this.playerAngelic = true;
        // v4.0.73 成就：变身天使累计
        if (window.AchTracker) window.AchTracker.bump('dAngel', 1);
        // v4.0.60：天使不再是"存活者"——关闭当前祝福并停止 90 秒存活奖励计时
        this.playerMerit = 0; // v4.0.60：功德值（捕获僵尸成长，越救越强）
        if (this.blessing) { this.blessing = null; if (this.blessEl) this.blessEl.style.display = 'none'; }
        this.blessingAt = Infinity;
        // v4.0.49：天使无房间——直接显示 P1 控制框（技能面板 M/N 键提示可见）
        {
            const p1hud = document.getElementById('hud-p1');
            if (p1hud) { p1hud.style.display = 'flex'; p1hud.style.flexDirection = 'column'; p1hud.style.left = '20px'; p1hud.style.right = 'auto'; }
        }
        p.dead = false; p.hp = 100; p.maxHp = 100;
        p.capCd = 0; p.spdCd = 0;
        p.waterOn = false; // v4.0.44：天使不再浇水
        p.invincibleT = 3; // 复活短暂无敌
        p.el1.classList.remove('dead-slash');
        p.el1.style.filter = 'drop-shadow(0 0 14px #ffd700)';
        const halo = document.createElement('div');
        halo.className = 'angel-halo'; // 头顶光环
        p.el1.appendChild(halo);
        const nameEl = p.el1.querySelector('div[style*="top:-35px"]');
        if (nameEl) { nameEl.innerText = '你 (天使)'; nameEl.style.color = '#ffd700'; }
        // HUD：阳光/孢子/伤害 → 天使状态条（技能显示走 #skill-hud）
        const statsRow = document.querySelector('#hud-p1 > div:nth-child(2)');
        if (statsRow) statsRow.innerHTML = '<span style="color:#ffd700;">😇 天使形态</span><span style="color:#aaaaaa; font-size:13px;">无房 · 不可建造 · 只有一条命</span><span style="color:#7fd8ff; font-size:13px;">功德:0（捕获僵尸成长）</span>';
        this.setHp();
        this._refreshHud();
        // v4.0.65：变天使瞬间人机已全灭 → 没人可帮，立即失败结算（否则挂起）
        if (this.ais.every(a => a.dead)) {
            this.gameOver(false);
            return;
        }
        this._announce('😇 你化作天使！【N】捕获定住僵尸、【M】加速逃离追杀——帮人机活到胜利！小心：你只有一条命！', 'points.mp3', true);
    }

    _becomeTraitor(ov) {
        ov.remove();
        this.fateOpen = false;
        this.keys = {}; this.keysJustPressed = {};
        const p = this.player;
        this.playerTraitor = true;
        // v4.0.73 成就：变身内鬼累计
        if (window.AchTracker) window.AchTracker.bump('dTraitor', 1);
        // v4.0.60：内鬼不再是"存活者"——关闭当前祝福并停止 90 秒存活奖励计时
        this.playerCorrupt = 0; // v4.0.60：堕落值（拆门/啃掉植物成长，越拆越凶）
        if (this.blessing) { this.blessing = null; if (this.blessEl) this.blessEl.style.display = 'none'; }
        this.blessingAt = Infinity;
        p.dead = false;
        const cfg = HauntedDorm.GHOST_LEVELS[Math.max(0, this.ghostLevel - 1)];
        p.maxHp = cfg.hp;     // 血量 = 当前僵尸的血量
        p.hp = cfg.hp;
        p.isZombie = true;    // 碰撞按僵尸处理：被门板/植物阻挡，站门口挠
        p.waterOn = false;    // v4.0.44：内鬼不再浇水
        p.invincibleT = 3;
        p.el1.classList.remove('dead-slash');
        p.el1.style.filter = 'drop-shadow(0 0 12px #ff5252)';
        const badge = document.createElement('div');
        badge.className = 'lv-badge';
        badge.style.background = '#c62828';
        badge.innerText = '😈 内鬼';
        p.el1.appendChild(badge);
        const nameEl = p.el1.querySelector('div[style*="top:-35px"]');
        if (nameEl) { nameEl.innerText = '你 (内鬼)'; nameEl.style.color = '#ff5252'; }
        const p1Ctl = document.querySelector('#hud-p1 > div');
        if (p1Ctl) p1Ctl.innerHTML = '<div>【内鬼 控制】移动: W/A/S/D ｜ 靠近门/植物自动慢咬 ｜ 靠近幸存者啃咬</div><div>血量=当前僵尸血量 ｜ 堕落值:0（每拆掉一株植物+1：伤害+25%、血量+10%）｜ 团灭所有幸存者即胜利 ｜ 主僵尸被消灭=失败</div>';
        this.setHp();
        // v4.0.65：变内鬼瞬间植物方已全灭（人机早在你倒下前被 AI 内鬼/尸潮肃清）→ 立即邪恶胜利，
        // 否则没有任何 AI 死亡事件会触发结算，游戏永远挂起（v4.0.61 同类问题的残留场景）
        if (this._plantSideAlive() === 0) {
            this._announce('😈 内鬼屠尽了所有幸存者——邪恶胜利！', 'evillaugh.mp3', true);
            this.gameOver(true);
            return;
        }
        this._announce('😈 你化身内鬼！去挠开人机的门，咬杀所有幸存者——主僵尸被消灭则计划失败！', 'evillaugh.mp3', true);
    }

    // 天使技能①：捕获（N）——100% 命中，定身最近僵尸 3 秒
    _angelCapture() {
        const p = this.player;
        const zbs = this.zombies.filter(z => !z.dead);
        if (zbs.length === 0) {
            this._flyText(p.x, p.y - 30, '场上没有僵尸', '#ff8a8a');
            this.playSfx('buzzer.mp3', 0.3);
            return; // 空放不消耗 CD
        }
        let best = null, bd = Infinity;
        for (const z of zbs) { const d = Math.hypot(z.x - p.x, z.y - p.y); if (d < bd) { bd = d; best = z; } }
        best.stunT = 3;
        best.capturedT = this.playerMerit >= 6 ? 5 : 3; // v4.0.60：功德 6 → 定身 3s→5s
        best.lockedTarget = null; best.path = null;
        this._applyFrozenFx(best, true);
        this._flyText(best.x, best.y - 30, `🔒 天使捕获！(定身${best.capturedT}秒)`, '#7fd8ff');
        this.playSfx('frozen.mp3', 0.5);
        p.capCd = this.playerMerit >= 3 ? 20 : 30; // v4.0.60：功德 3 → 捕获 CD 30s→20s
        this._gainMerit(); // v4.0.60：每次成功捕获 +1 功德
        this._refreshHud();
    }

    // 天使技能②：加速（M）——6 秒疾跑甩开追杀
    _angelSpeed() {
        const p = this.player;
        p.speedBuffT = 6; // 复用全局疾跑通道（移速 800）
        p.spdCd = this.playerMerit >= 9 ? 20 : 30; // v4.0.60：功德 9 → 加速 CD 30s→20s
        this._flyText(p.x, p.y - 30, '💨 天使加速！(6秒)', '#ffd700');
        this.playSfx('readysetplant.mp3', 0.4);
        this._refreshHud();
    }

    // ===== v4.0.60：内鬼堕落值 / 天使功德值 成长 =====
    // 内鬼：每拆掉一株植物（含门板）或咬杀一名幸存者 +1 堕落值
    // 判定成长：伤害 +25%/层、血上限 +10%/层（封顶 6 层 = 伤害 +150%、血量 +77%）
    _gainCorrupt() {
        this.playerCorrupt = (this.playerCorrupt || 0) + 1;
        const c = this.playerCorrupt;
        const p = this.player;
        p.maxHp = Math.round(p.maxHp * 1.10);
        p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.25));
        this._flyText(p.x, p.y - 44, `😈 堕落值 +1（${c}/6）`, '#ff5252');
        if (c === 1 || c === 6) {
            this._announce(c === 1 ? '😈 堕落值开启！拆门/咬杀幸存者持续变强（伤害+25%、血量+10%/层）！' : '😈 堕落值已满（6/6）！伤害+150%、血量+77%，无人能挡！', 'evillaugh.mp3');
        } else {
            this.playSfx('evillaugh.mp3', 0.25);
        }
        this.setHp();
        this._refreshHud();
        const p1Ctl = document.querySelector('#hud-p1 > div');
        if (p1Ctl && this.playerTraitor) {
            p1Ctl.innerHTML = `<div>【内鬼 控制】移动: W/A/S/D ｜ 靠近门/植物自动慢咬 ｜ 靠近幸存者啃咬</div><div>血量=${p.maxHp} ｜ 堕落值:${c}/6（伤害+${25 * Math.min(6, c)}%）｜ 团灭所有幸存者即胜利 ｜ 主僵尸被消灭=失败</div>`;
        }
    }

    // 天使：每成功捕获一只僵尸 +1 功德值
    // 判定成长：功德 3 → 捕获 CD 30s→20s；功德 6 → 定身 3s→5s；功德 9 → 加速 CD 30s→20s
    _gainMerit() {
        this.playerMerit = (this.playerMerit || 0) + 1;
        const m = this.playerMerit;
        const bonus = m >= 9 ? '加速CD减至20s！' : m >= 6 ? '捕获定身升至5秒！' : m >= 3 ? '捕获CD减至20s！' : '';
        this._flyText(this.player.x, this.player.y - 30, `⭐ 功德 +1（${m}/9）${bonus}`, '#ffd700');
        this.playSfx('points.mp3', 0.35);
        this._refreshHud();
        const statsRow = document.querySelector('#hud-p1 > div:nth-child(2)');
        if (statsRow && this.playerAngelic) {
            statsRow.innerHTML = `<span style="color:#ffd700;">😇 天使形态</span><span style="color:#aaaaaa; font-size:13px;">无房 · 不可建造 · 只有一条命</span><span style="color:#7fd8ff; font-size:13px;">功德:${m}/9（捕获僵尸成长）</span>`;
        }
    }

    // v4.0.48：坚果门板修复（P1=N键 / P2=加号键）——给自己的门板回 25% 总血，CD 60 秒
    // 门毁即永久：门板没了就无从修复（提示玩家）；满血时不消耗 CD
    _healDoor(p) {
        if (p.dead || this.isZombieFaction || this.playerAngelic || this.playerTraitor) return;
        if ((p.nutHealCd || 0) > 0) {
            this._flyText(p.x, p.y - 30, `🔧 门板修复冷却中 (${Math.ceil(p.nutHealCd)}s)`, '#ff8a8a');
            this.playSfx('buzzer.mp3', 0.3);
            return;
        }
        // 找 p 名下房间的门板（主房+副房），优先修损毁最重的
        const myRooms = this._ownedRooms(p);
        let door = null, worst = 1;
        for (const rm of myRooms) {
            const d = this.plants.find(q => q.isDoor && q.c === rm.doorCol && q.r === rm.doorRow);
            if (d && d.hp < d.maxHp) {
                const ratio = d.hp / d.maxHp;
                if (ratio < worst) { worst = ratio; door = d; }
            }
        }
        if (!door) {
            const anyDoor = myRooms.some(rm => this.plants.some(q => q.isDoor && q.c === rm.doorCol && q.r === rm.doorRow));
            this._flyText(p.x, p.y - 30, anyDoor ? '🔧 门板完好无损，无需修复' : '🚪 没有门板可修（已毁的门板无法重建）', '#ff8a8a');
            this.playSfx('buzzer.mp3', 0.3);
            return;
        }
        const heal = Math.round(door.maxHp * 0.25);
        const oldHp = door.hp;
        door.hp = Math.min(door.maxHp, door.hp + heal);
        const bg = door.el1.querySelector('.hp-bar-bg');
        const fg = door.el1.querySelector('.hp-bar-fg');
        if (bg && fg) {
            if (door.hp >= door.maxHp) { bg.style.display = 'none'; }
            else { bg.style.display = 'block'; fg.style.width = Math.max(0, (door.hp / door.maxHp) * 100) + '%'; }
        }
        this._flyText(door.c * 80 + 40, door.r * 80, `🔧 门板修复 +${door.hp - oldHp} 血`, '#9dff6b');
        this._flyText(p.x, p.y - 30, '🔧 门板修复！', '#9dff6b');
        this.playSfx('plant.mp3', 0.5);
        // v4.0.73 成就：修门累计
        if (window.AchTracker) window.AchTracker.bump('dDoors', 1);
        p.nutHealCd = 60;
        this._refreshHud();
    }

    _killZombie(zb, killer = null) {
        // v4.0.20：内鬼分流必须放在 zb.dead=true 之前——否则 _defeatTraitor 的守卫会被自己短路，奖励发不出来
        if (zb.isTraitor && !zb.dead) {
            this._defeatTraitor(killer);
            return;
        }
        if (zb.dead) return;
        zb.dead = true;
        this.kills++;
        this.lastKiller = killer; // 记录击杀者
        // v4.0.73 成就：守屋击杀累计
        if (window.AchTracker) window.AchTracker.dKill();

        // v4.0.20：尸潮小怪 / 巨人 BOSS——只做死亡演出，不触发胜负
        if (zb.isMinion || zb.isBoss) {
            zb.el1.style.transition = 'all 0.45s ease-in';
            zb.el1.style.transform = 'translate(-50%, -50%) scale(1.25) rotate(12deg)';
            zb.el1.style.opacity = '0';
            setTimeout(() => zb.el1.remove(), 480);
            this.playSfx('scream.mp3', 0.35);
            if (zb.isBoss) {
                this._announce('🏆 僵王机甲被击毁了！它洒落了一地阳光！', 'points.mp3', true);
                // v4.0.73 成就：击败机甲僵王
                if (window.AchTracker) window.AchTracker.bump('dBoss', 1);
                for (const p of this.allPlayers) if (!p.dead) this.addSun(100, p);
            }
            // 若主僵尸此前已被消灭，检查场上残存威胁是否已全部肃清
            if (this.ghostRespawnAt > 0 && !this.isZombieFaction) {
                const aliveThreats = this.zombies.filter(z => !z.dead);
                if (this.traitorRevealed && this.traitor && !this.traitor.dead) aliveThreats.push(this.traitor);
                if (aliveThreats.length === 0) {
                    if (this._gameOverTimer) clearTimeout(this._gameOverTimer);
                    this._gameOverTimer = setTimeout(() => this.gameOver(!this.playerTraitor && !this.isZombieFaction), 2000); // v4.0.65：玩家内鬼时植物赢=内鬼败
                }
            }
            return;
        }

        zb.el1.style.transition = 'all 0.45s ease-in';
        zb.el1.style.transform = 'translate(-50%, -50%) scale(1.25) rotate(12deg)';
        zb.el1.style.opacity = '0';
        setTimeout(() => zb.el1.remove(), 480);
        this.playSfx('scream.mp3', 0.35);
        
        if (this.isZombieFaction && zb === this.player) {
            this._announce('💀 你被植物击败了…', 'scream.mp3', true);
            if (this._gameOverTimer) clearTimeout(this._gameOverTimer);
            this._gameOverTimer = setTimeout(() => this.gameOver(false), 3000);
            return;
        }

        // v4.0.44：内鬼模式下主僵尸被植物消灭 → 植物阵营胜利，内鬼计划失败
        if (this.playerTraitor && !zb.isMinion && !zb.isBoss) {
            this._announce('🎉 植物们守住了家园！内鬼计划失败…', 'losemusic.mp3', true);
            if (this._gameOverTimer) clearTimeout(this._gameOverTimer);
            this._gameOverTimer = setTimeout(() => this.gameOver(false), 3000);
            return;
        }
        
        this.ghostRespawnAt = 1;
        this._updateGhostChip();
        // 检查场上是否还有未肃清的波次小怪、BOSS或内鬼
        const remainingThreats = this.zombies.filter(z => !z.dead && (z.isBoss || z.isMinion));
        if (this.traitorRevealed && this.traitor && !this.traitor.dead) remainingThreats.push(this.traitor);
        if (remainingThreats.length > 0) {
            this._announce('🏆 领主幽灵被击败！肃清剩余残部即可获胜！', 'points.mp3', true);
            return;
        }
        if (this._gameOverTimer) clearTimeout(this._gameOverTimer);
        this._gameOverTimer = setTimeout(() => this.gameOver(!this.playerTraitor && !this.isZombieFaction), 3000); // v4.0.65：玩家内鬼时植物赢=内鬼败
    }

    _updateSuns() {
        this.suns = this.suns.filter(s => {
            let picker = null;
            if (!this.player.dead && Math.hypot(s.x - this.player.x, s.y - this.player.y) < 55) {
                picker = this.player;
            } else if (this.gameMode === '2p' && this.player2 && !this.player2.dead && Math.hypot(s.x - this.player2.x, s.y - this.player2.y) < 55) {
                picker = this.player2;
            }
            if (picker) {
                s.el.remove();
                this.addSun(25, picker);
                this._flyText(s.x, s.y, '+25 ☀', 'yellow');
                this.playSfx('points.mp3', 0.4);
                return false;
            }
            return true;
        });
    }

    // ===== 植物产出：阳光 / 孢子 =====
    // v4.0.39：阳光经济全面重构——阳光系自动产出（走进房屋即产，无需浇水按键，打盹保底取消）；v4.0.46：作息反转（白天阳光系/夜晚菇类+路灯花）；
    //          产出 0.4s 高频化，飘字/音效节流累计显示
    _updateProduce(dt) {
        for (const pl of this.plants) {
            const rm = this._insideRoom(pl.c, pl.r);
            const owner = pl.owner || ((rm && rm.owners && rm.owners.length > 0) ? rm.owners[0] : null); // v4.0.23：按种植者记账
            if (!owner || owner.dead) continue;
            if (owner.isAi) continue; // v4.0.45：削人机——人机的产出类植物（向日葵/小喷菇等）不再自动产资源，人机主要靠开局资金+事件奖励行动
            if (owner === this.player && (this.playerAngelic || this.playerTraitor)) continue; // v4.0.44：天使无产出；内鬼不再享受植物供奉
            const def = pl.def;
            const wx = pl.c * 80 + 40, wy = pl.r * 80 + 40;
            // v4.0.46：作息反转——阳光系（nightOnly：阳光菇/向日葵链）白天醒着产出，夜晚熄灯睡觉（僵尸阵营无昼夜，不受限）
            if (def.produce && def.nightOnly && this.isNight && !this.isZombieFaction) continue;
            // v4.0.46：路灯花（nightProduce）只在夜晚产阳光，白天睡觉
            if (def.produce && def.nightProduce && !this._shroomAwake()) continue;
            // v4.0.20：孢子线（def.spore：小喷菇/孢子地雷等）白天打盹不产，只上夜班
            if (!this._shroomAwake() && def.spore) continue;

            // v4.0.45：房间内的植物一律常产（用户：「在房间里的所有东西，无论人在不在身边，都应该处于在浇水的状态」），不再要求主人贴身；
            // 只有房外植物（野外地堡）仍需主人在 300px 内照看才产出
            if (!rm && Math.hypot(wx - owner.x, wy - owner.y) > 300) continue;

            const boost = this.waterBoostT > 0 ? 2 : 1; // v4.0.39：丰收祝福改「全植物产出 ×2」
            if (def.produce) {
                pl.prodT += dt;
                if (pl.prodT >= (def.produce.every * (pl._cbProduceMul || 1))) { // v4.0.53：樱桃炸弹产速增益（+1/8）
                    pl.prodT = 0;
                    let sAmt = def.produce.sun * boost;
                    if (owner.sunBuffT > 0) sAmt *= 2; // 向日葵技能生效
                    if (owner === this.player || owner === this.player2) {
                        this.addSun(sAmt, owner);
                        pl._tickN = (pl._tickN || 0) + 1;
                        // v4.0.40：飘字显示「单跳真实产出」（原累计数 +4 会被误读成一次产 4 点——用户实报开局应产 1 点）；仍 1.6s 一飘防刷屏
                        if (pl._tickN % 4 === 0) {
                            this._flyText(wx, pl.r * 80, `+${sAmt} ☀`, 'yellow');
                            if (pl._tickN % 8 === 0) this.playSfx('points.mp3', 0.25);
                        }
                    } else {
                        owner.sun = (owner.sun || 0) + sAmt;
                    }
                }
            }
            if (def.spore) {
                pl.sporeT += dt;
                if (pl.sporeT >= (def.spore.every * (pl._cbProduceMul || 1))) { // v4.0.53：樱桃炸弹产速增益（+1/8）
                    pl.sporeT = 0;
                    const spAmt = def.spore.n * boost;
                    if (owner === this.player || owner === this.player2) {
                        this.addSpore(spAmt, owner);
                        pl._tickS = (pl._tickS || 0) + 1;
                        // v4.0.40：同阳光——飘字显示单跳真实产出
                        if (pl._tickS % 4 === 0) {
                            this._flyText(wx, pl.r * 80 + 10, `+${spAmt} 🦠`, '#c79aff');
                        }
                    } else {
                        owner.spore = (owner.spore || 0) + spAmt;
                    }
                }
            }
        }
    }

    // ===== 高级植物（孢子系）=====
    _getHostileTargets() {
        const targets = this.isZombieFaction ? this.allPlayers.filter(p => p.isZombie) : this.zombies.slice();
        if (!this.isZombieFaction && this.traitorRevealed && this.traitor && !this.traitor.dead) targets.push(this.traitor);
        // v4.0.64：玩家内鬼（死后化身）同样被植物方锁定为敌对目标——用户实报"变内鬼后所有豌豆射手都不打我"；
        // 内鬼等级/血量与当前僵尸一致（_becomeTraitor 按 GHOST_LEVELS[ghostLevel-1] 取），植物理应攻击它
        if (!this.isZombieFaction && this.playerTraitor && this.player && !this.player.dead) targets.push(this.player);
        return targets;
    }

    _updateSpike(dt) {
        const targets = this._getHostileTargets();
        for (const pl of this.plants) {
            const sp = pl.def.spike;
            if (!sp) continue;
            const px = pl.c * 80 + 40, py = pl.r * 80 + 40;
            for (const zb of targets) {
                if (zb.dead) continue;
                if (Math.hypot(zb.x - px, zb.y - py) < sp.r) {
                    const rm = this._insideRoom(pl.c, pl.r);
                    const owner = pl.owner || ((rm && rm.owners && rm.owners.length > 0) ? rm.owners[0] : null); // v4.0.23：按种植者记账
                    let fdps = sp.dps;
                    if (owner && owner.atkBuffT > 0) fdps *= 2;
                    zb.hp -= fdps * dt;
                    if (zb.hpBg) {
                        zb.hpBg.style.display = 'block';
                        zb.hpFg.style.width = Math.max(0, zb.hp / zb.maxHp * 100) + '%';
                    }
                    if (zb.hp <= 0) {
                        this._killZombie(zb, pl.owner || ((rm && rm.owners && rm.owners.length > 0) ? rm.owners[0] : null)); // v4.0.23
                    }
                }
            }
        }
    }

    _updateIceshroom(dt) {
        // 极寒冰阵：全局减速并造成持续伤害
        // v4.0.17：按种植者（房间归属）记账——原全局 dps 都算在 P1 头上，MVP 伤害失真
        const auras = [];
        for (const pl of this.plants) {
            const fz = pl.def.freeze;
            if (fz && fz.aura) {
                const rm = this._insideRoom(pl.c, pl.r);
                const owner = pl.owner || ((rm && rm.owners && rm.owners.length > 0) ? rm.owners[0] : null); // v4.0.23：按种植者记账
                auras.push({ owner, dps: fz.dps });
            }
        }
        const hasAura = auras.length > 0;
        const targets = this._getHostileTargets();
        for (const zb of targets) {
            if (zb.dead) continue;
            let slowedByIcegloom = false;
            // 冰忧郁菇范围寒气减速
            for (const pl of this.plants) {
                if (pl.def.auraSlow && this._shroomAwake()) {
                    const px = pl.c * 80 + 40, py = pl.r * 80 + 40;
                    if (Math.hypot(zb.x - px, zb.y - py) < 220) {
                        zb.slowT = 0.5;
                        slowedByIcegloom = true;
                        break;
                    }
                }
            }
            if (hasAura) {
                zb.slowT = 0.5;
                for (const a of auras) {
                    zb.hp -= a.dps * dt;
                    if (a.owner && a.owner.roleDef) a.owner.dmgDealt = (a.owner.dmgDealt || 0) + a.dps * dt; // v4.0.23：owner 可能为 null
                }
                if (zb.el1 && zb.el1.querySelector('img')) zb.el1.querySelector('img').style.filter = 'saturate(0.35) brightness(1.5) drop-shadow(0 0 8px #7fd8ff)';
                if (zb.hp <= 0) this._killZombie(zb, auras[auras.length - 1].owner);
            } else if (slowedByIcegloom) {
                if (zb.el1 && zb.el1.querySelector('img')) zb.el1.querySelector('img').style.filter = 'saturate(0.35) brightness(1.5) drop-shadow(0 0 8px #7fd8ff)';
            } else {
                // v4.0.39：寒冰菇冰冻期间（❄️徽标在场）不得清僵尸滤镜——原逻辑每帧擦掉冰冻特效
                if (zb.slowT <= 0 && !zb._iceBadge && zb.el1 && zb.el1.querySelector('img')) zb.el1.querySelector('img').style.filter = '';
            }
        }
    }

    _updateDoomshroom(dt) {
        // 毁灭重炮：无限射程重炮，造成真伤
        const targets = this._getHostileTargets();
        for (const pl of this.plants) {
            const nk = pl.def.nuke;
            if (!nk || !nk.lob) continue;
            if (!this._shroomAwake()) continue; // v4.0.20：白天毁灭菇睡觉
            pl.nukeT = (pl.nukeT || 0) + dt;
            if (pl.nukeT >= nk.cd) {
                pl.nukeT = 0;
                let best = null, bd = Infinity;
                for (const zb of targets) {
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
                // v4.0.17：补 owner——原导弹不带 owner，伤害不计入任何人的 MVP 伤害账
                const nRm = this._insideRoom(pl.c, pl.r);
                // v4.0.23：按种植者记账，查不到不再兜底给 P1
                const nOwner = pl.owner || ((nRm && nRm.owners && nRm.owners.length > 0) ? nRm.owners[0] : null);
                this.peas.push({
                    x: px, y: py,
                    vx: 0, vy: -200,
                    el: el, life: 10,
                    dmg: nk.dmg,
                    pctDmg: nk.pct,
                    homing: true,
                    homeR: 9999, // 无论多远都追踪
                    speed: 350,
                    owner: nOwner
                });
            }
        }
    }

    // 土豆雷：僵尸踩上引爆
    _updateMines(dt = 1/60) {
        const targets = this._getHostileTargets();
        for (const pl of [...this.plants]) {
            if (pl.def.mine === undefined) continue;
            if (pl._arming === undefined) pl._arming = 3; // 3s 拱土起爆准备
            if (pl._arming > 0) { pl._arming -= dt; continue; }
            const px = pl.c * this.gridSize + 40, py = pl.r * this.gridSize + 40;
            const victim = targets.find(zb => !zb.dead && Math.hypot(zb.x - px, zb.y - py) < 55);
            if (!victim) continue;
            // 引爆
            this.playSfx('explosion.mp3', 0.55);
            const boom = document.createElement('div');
            boom.style.cssText = `position:absolute; left:${px - 130}px; top:${py - 130}px; width:260px; height:260px; border-radius:50%; background:radial-gradient(circle, rgba(255,230,120,0.95) 0%, rgba(255,110,30,0.7) 45%, rgba(255,0,0,0) 72%); z-index:600; pointer-events:none;`;
            this.world1.appendChild(boom);
            setTimeout(() => boom.remove(), 500);
            const MINE_DMG = 2500;
            for (const zb of targets) {
                if (!zb.dead && Math.hypot(zb.x - px, zb.y - py) < 130) {
                    const rm = this._insideRoom(pl.c, pl.r);
                    const owner = pl.owner || ((rm && rm.owners && rm.owners.length > 0) ? rm.owners[0] : this.player);
                    const dealt = Math.min(zb.hp, MINE_DMG);
                    zb.hp -= dealt;
                    if (owner && owner.roleDef) owner.dmgDealt = (owner.dmgDealt || 0) + dealt;
                    this._flyText(zb.x, zb.y - 20, `-${dealt} 💥`, '#ff5252');
                    if (zb.hpBg) {
                        zb.hpBg.style.display = 'block';
                        zb.hpFg.style.width = Math.max(0, zb.hp / zb.maxHp * 100) + '%';
                    }
                    if (zb.hp <= 0) {
                        this._killZombie(zb, owner);
                    }
                }
            }
            if (pl.def.spore) {
                // 孢子地雷：保全高阶科技树，不自毁本体，自损 30% 血量并进入 15 秒重新埋雷冷却
                pl.hp = Math.max(1, pl.hp - pl.maxHp * 0.3);
                pl._arming = 15;
                this._flyText(px, py - 30, '⚡ 地雷起爆充能(15s)', '#ffd54a');
                const bg = pl.el1.querySelector('.hp-bar-bg');
                const fg = pl.el1.querySelector('.hp-bar-fg');
                if (bg && fg) {
                    bg.style.display = 'block';
                    fg.style.width = Math.max(0, (pl.hp / pl.maxHp) * 100) + '%';
                }
            } else {
                pl.el1.remove();
                if (pl.txtEl) pl.txtEl.remove();
                this.plants = this.plants.filter(p => p !== pl);
            }
        }
    }

    // v4.0.53：土豆地雷——30 秒引信（烈焰地雷 15 秒）后伸头待爆；踩上即爆；被啃不炸直接被砍掉
    _updatePotatoMines(dt = 1/60) {
        const targets = this._getHostileTargets();
        for (const pl of this.plants) {
            if (!pl.def.potatoMine) continue;
            const px = pl.c * this.gridSize + 40, py = pl.r * this.gridSize + 40;
            if (pl._pArming === undefined) {
                pl._pArming = (pl.def === HauntedDorm.DEFS.firemine) ? 15 : 30; // 引信：土豆雷 30s / 烈焰地雷 15s
            }
            if (pl._pArming > 0) {
                pl._pArming -= dt;
                if (pl._pArming <= 0) {
                    // 到点伸头——换成已就绪外观
                    const img = pl.el1.querySelector('img');
                    if (img) img.src = 'assets/images/Plants/PotatoMine/PotatoMine.gif';
                    this._flyText(px, py - 30, '💣 土豆雷就绪！', '#ffd54a');
                    // 检查是否一就绪就被踩
                }
                continue;
            }
            const victim = targets.find(zb => !zb.dead && Math.hypot(zb.x - px, zb.y - py) < 55);
            if (!victim) continue;
            // 引爆
            this.playSfx('explosion.mp3', 0.55);
            const boom = document.createElement('div');
            boom.style.cssText = `position:absolute; left:${px - 150}px; top:${py - 150}px; width:300px; height:300px; border-radius:50%; background:radial-gradient(circle, rgba(255,230,120,0.95) 0%, rgba(255,110,30,0.7) 45%, rgba(255,0,0,0) 72%); z-index:600; pointer-events:none;`;
            this.world1.appendChild(boom);
            setTimeout(() => boom.remove(), 500);
            const MINE_DMG = (pl.def === HauntedDorm.DEFS.firemine) ? 4000 : 2000; // 烈焰地雷伤害翻倍
            for (const zb of targets) {
                if (!zb.dead && Math.hypot(zb.x - px, zb.y - py) < 130) {
                    const rm = this._insideRoom(pl.c, pl.r);
                    const owner = pl.owner || ((rm && rm.owners && rm.owners.length > 0) ? rm.owners[0] : this.player);
                    const dealt = Math.min(zb.hp, MINE_DMG);
                    zb.hp -= dealt;
                    if (owner && owner.roleDef) owner.dmgDealt = (owner.dmgDealt || 0) + dealt;
                    this._flyText(zb.x, zb.y - 20, `-${dealt} 💥`, '#ff5252');
                    if (zb.hpBg) {
                        zb.hpBg.style.display = 'block';
                        zb.hpFg.style.width = Math.max(0, zb.hp / zb.maxHp * 100) + '%';
                    }
                    if (zb.hp <= 0) this._killZombie(zb, owner);
                }
            }
            pl.el1.remove();
            if (pl.txtEl) pl.txtEl.remove();
            this.plants = this.plants.filter(p => p !== pl);
        }
    }

    // v4.0.53：南瓜壳——每秒回复自己门板 maxHp 的 1/N（35→30→20→15），外貌与路灯花一致
    _updatePumpkin(dt = 1/60) {
        for (const pl of this.plants) {
            const hd = pl.def.healDoor;
            if (!hd) continue;
            if (pl.owner && !pl.owner.dead) {
                pl._phT = (pl._phT || 0) + dt;
                if (pl._phT >= 1.0) {
                    pl._phT = 0;
                    // 找 owner 名下所有房间的门板，修损毁最重的
                    const myRooms = this._ownedRooms(pl.owner);
                    let door = null, worst = 1;
                    for (const rm of myRooms) {
                        const d = this.plants.find(q => q.isDoor && q.c === rm.doorCol && q.r === rm.doorRow);
                        if (d && d.hp < d.maxHp) {
                            const ratio = d.hp / d.maxHp;
                            if (ratio < worst) { worst = ratio; door = d; }
                        }
                    }
                    if (!door) continue;
                    const heal = Math.max(1, Math.round(door.maxHp / hd));
                    const oldHp = door.hp;
                    door.hp = Math.min(door.maxHp, door.hp + heal);
                    const bg = door.el1.querySelector('.hp-bar-bg');
                    const fg = door.el1.querySelector('.hp-bar-fg');
                    if (bg && fg) {
                        if (door.hp >= door.maxHp) { bg.style.display = 'none'; }
                        else { bg.style.display = 'block'; fg.style.width = Math.max(0, (door.hp / door.maxHp) * 100) + '%'; }
                    }
                    if (door.hp - oldHp > 0) {
                        const dx = door.c * 80 + 40, dy = door.r * 80;
                        this._flyText(dx, dy, `🎃 南瓜壳修复 +${door.hp - oldHp}`, '#ffb74d');
                    }
                }
            }
        }
    }

    // v4.0.53：倭瓜——技能冷却刷新（B/5 键触发见按键处理；CD 2 分钟）
    _updateSquash(dt = 1/60) {
        for (const pl of this.plants) {
            if (!pl.def.squashSkill) continue;
            if (pl._sqCd === undefined) pl._sqCd = 0;
            if (pl._sqCd > 0) pl._sqCd -= dt;
        }
    }

    // v4.0.53：火炬树桩——存在时攻击植物每次命中僵尸产生阳光（伤害越高阳光越多），这里做光环开关；火爆辣椒光环同算
    _updateTorch(dt = 1/60) {
        const has = this.plants.some(pl => pl.def.torch && !pl._gone);
        if (this._torchActive !== has) this._torchActive = has;
        const hasJ = this.plants.some(pl => pl.def.jalapeno && !pl._gone);
        if (this._jalapenoActive !== hasJ) this._jalapenoActive = hasJ;
        // 樱桃增益倒计时
        for (const pl of this.plants) {
            if (pl._cbBuffT) {
                pl._cbBuffT -= dt;
                if (pl._cbBuffT <= 0) { pl._cbShootMul = null; pl._cbProduceMul = null; pl._cbBuffT = 0; }
            }
        }
    }

    // v4.0.53：僵尸盯上印记——被任何未撤退僵尸锁定的角色，四周显示醒目的红色角框
    _updateTargetMarks(dt = 1/60) {
        if (this.isZombieFaction) return; // 僵尸阵营：植物方不锁人，维持全屏警告即可
        const targeted = new Set();
        for (const zb of this.zombies) {
            if (zb.dead || zb.retreating) continue;
            const t = zb.lockedTarget;
            if (t && !t.dead && !t.isZombie && t !== zb) targeted.add(t);
        }
        for (const p of this.allPlayers) {
            if (!p.el1) continue;
            const on = targeted.has(p);
            if (on) {
                if (!p._markEl) {
                    p._markEl = document.createElement('div');
                    p._markEl.className = 'target-mark';
                    p.el1.appendChild(p._markEl);
                }
                p._markEl.style.display = 'block';
            } else if (p._markEl) {
                p._markEl.style.display = 'none';
            }
        }
    }

    // v4.0.53：樱桃炸弹——以自身为中心 3×3 外圈爆炸，范围内己方植物获得增益（射击攻速+1/4、产阳光+1/8）
    _cherryBoom(pl) {
        const px = pl.c, py = pl.r;
        const hostiles = this._getHostileTargets().filter(z => !z.dead);
        const cx = px * this.gridSize + 40, cy = py * this.gridSize + 40;
        this.playSfx('explosion.mp3', 0.7);
        const boom = document.createElement('div');
        boom.style.cssText = `position:absolute; left:${cx - 170}px; top:${cy - 170}px; width:340px; height:340px; border-radius:50%; background:radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,150,40,0.85) 35%, rgba(255,0,0,0.6) 62%, rgba(255,0,0,0) 75%); z-index:600; pointer-events:none;`;
        this.world1.appendChild(boom);
        setTimeout(() => boom.remove(), 600);
        // 爆炸伤害：3×3 外圈（不含中心格）——切比雪夫距离 1 的环
        const CHERRY_DMG = 1500;
        for (const zb of hostiles) {
            const zc = Math.floor(zb.x / this.gridSize), zr = Math.floor(zb.y / this.gridSize);
            const md = Math.max(Math.abs(zc - px), Math.abs(zr - py));
            if (md === 1) {
                const owner = pl.owner;
                const dealt = Math.min(zb.hp, CHERRY_DMG);
                zb.hp -= dealt;
                if (owner && owner.roleDef) owner.dmgDealt = (owner.dmgDealt || 0) + dealt;
                this._flyText(zb.x, zb.y - 20, `-${dealt} 💥`, '#ff5252');
                if (zb.hpBg) { zb.hpBg.style.display = 'block'; zb.hpFg.style.width = Math.max(0, zb.hp / zb.maxHp * 100) + '%'; }
                if (zb.hp <= 0) this._killZombie(zb, owner);
            }
        }
        // 范围增益：外圈（md===1）所有己方植物——除坚果墙/高级植物外：射击系攻速×0.8（cd-1/4）、产阳光系 every×0.875（+1/8）
        const BUFF_T = 30; // 增益持续 30 秒
        for (const q of this.plants) {
            const qc = q.c, qr = q.r;
            const md = Math.max(Math.abs(qc - px), Math.abs(qr - py));
            if (md !== 1) continue;
            if (!q.def.shoot && !q.def.produce && !q.def.spore) continue; // 仅对射击/产资源类生效
            q._cbShootMul = 0.8;   // 攻速：cd 乘 0.8（即 +1/4 速度）
            q._cbProduceMul = 0.875; // 产速：every 乘 0.875（即 +1/8）
            q._cbBuffT = BUFF_T;
            this._flyText(q.c * 80 + 40, q.r * 80, '🍒 樱桃增益!', '#ff8a8a');
        }
    }

    // v4.0.53：倭瓜技能——B（P1）/5（P2）键触发，打掉敌对僵尸一半血量；每 2 分钟刷新一次
    _squashSkill(p) {
        if (!p || p.dead || this.isZombieFaction || this.playerAngelic || this.playerTraitor) return;
        const mySquash = this.plants.find(pl => pl.owner === p && pl.def.squashSkill && !pl._gone);
        if (!mySquash) {
            this._flyText(p.x, p.y - 30, '🥒 还没有种下倭瓜！', '#ff8a8a');
            this.playSfx('buzzer.mp3', 0.3);
            return;
        }
        if (mySquash._sqCd > 0) {
            this._flyText(p.x, p.y - 30, `🥒 倭瓜技能冷却中 (${Math.ceil(mySquash._sqCd)}s)`, '#ff8a8a');
            this.playSfx('buzzer.mp3', 0.3);
            return;
        }
        const hostiles = this._getHostileTargets().filter(z => !z.dead);
        if (hostiles.length === 0) {
            this._flyText(p.x, p.y - 30, '🥒 场上没有僵尸！', '#ff8a8a');
            this.playSfx('buzzer.mp3', 0.3);
            return;
        }
        mySquash._sqCd = mySquash.def.squashSkill; // 120s
        this.playSfx('explosion.mp3', 0.6);
        const px = mySquash.c * 80 + 40, py = mySquash.r * 80 + 40;
        for (const zb of hostiles) {
            const dealt = Math.max(1, Math.round(zb.maxHp * 0.5)); // 打掉僵尸一半血
            zb.hp -= dealt;
            if (p.roleDef) p.dmgDealt = (p.dmgDealt || 0) + dealt;
            this._flyText(zb.x, zb.y - 20, `-${dealt} 🥒 半血重击`, '#ff5252');
            if (zb.hpBg) { zb.hpBg.style.display = 'block'; zb.hpFg.style.width = Math.max(0, zb.hp / zb.maxHp * 100) + '%'; }
            if (zb.hp <= 0) this._killZombie(zb, p);
        }
        this._announce(`🥒 ${p.roleDef ? p.roleDef.name : p.name} 倭瓜技能：全场僵尸半血！`, 'explosion.mp3');
        mySquash.el1.classList.add('shake');
        setTimeout(() => { if (mySquash && mySquash.el1) mySquash.el1.classList.remove('shake'); }, 300);
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

        // 小推车（门口备用防线）
        ctx.fillStyle = '#64b5f6';
        if (this.mowers) {
            for (const mw of this.mowers) {
                if (mw.gone || mw.used) continue;
                ctx.fillRect(mw.x * sx - 2, mw.y * sy - 2, 4, 4);
            }
        }

        // 阳光袋
        ctx.fillStyle = '#ffe14a';
        for (const s of this.suns) ctx.fillRect(s.x * sx - 1.5, s.y * sy - 1.5, 3, 3);
        
        // 僵尸（小怪/普通僵尸 vs 巨型僵王机甲）
        for (const zb of this.zombies) {
            if (zb.dead) continue;
            if (zb.isBoss) {
                ctx.fillStyle = '#ff1744';
                ctx.fillRect(zb.x * sx - 5, zb.y * sy - 5, 10, 10);
            } else {
                ctx.fillStyle = '#ff5252';
                ctx.fillRect(zb.x * sx - 3, zb.y * sy - 3, 6, 6);
            }
        }
        
        // 玩家与人机（内鬼反水后标红）
        for (const p of this.allPlayers) {
            if (p.dead) continue;
            const isMe = p === this.player;
            if (this.traitorRevealed && p === this.traitor) {
                ctx.fillStyle = '#d50000';
                ctx.beginPath();
                ctx.arc(p.x * sx, p.y * sy, 6, 0, Math.PI * 2);
                ctx.fill();
                continue;
            }
            let color = isMe ? '#00ff00' : (p === this.player2 ? '#4fc3f7' : p.color);
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(p.x * sx, p.y * sy, (isMe || p === this.player2) ? 6 : 5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    loop(time) {
        if (this.over || this._destroyed) return;
        if (window.__dormGen !== this._dormGen) return; // v4.0.26：已被新开的一局取代，旧循环停转
        if (!this.lastTime) this.lastTime = time;
        const realDt = Math.min((time - this.lastTime) / 1000, 0.1);
        this.lastTime = time;
        if (this.fateOpen) { // v4.0.44：死亡抉择弹窗期间全场冻结（只保留渲染）
            this._animId = requestAnimationFrame(t => this.loop(t));
            return;
        }

        const simulatedDt = realDt * (this.timeScale || 1.0);
        const steps = Math.max(1, Math.ceil(simulatedDt / 0.016));
        const dt = simulatedDt / steps;

        for (let i = 0; i < steps; i++) {
            this.gameTime += dt * 1000;
            // v4.0.73 成就：守屋时间累计
            if (window.AchTracker) window.AchTracker.dTime(dt);
            this._tick(dt, this.gameTime);
        }
        
        this._render(); // 将样式更新移出高频逻辑循环，统一渲染

        this._updateMinimap();
        this._animId = requestAnimationFrame(t => this.loop(t));
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
                    // v4.0.16：血条是 zb.el1 的子元素（.hp-bar-bg CSS top:-10px 已相对定位）——
                    // 此处原写成世界绝对坐标造成双重偏移，血条悬空在约 2 倍坐标处且随僵尸移动（用户实拍 bug）
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
            this.p1Cursor.style.display = (this.isZombieFaction || this.player.dead) ? 'none' : 'block';
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
            if (this.player.dead) {
                // v4.0.23：P1 倒下后镜头完全跟随 P2，别让尸体把画面拽回原地
                midX = this.player2.x; midY = this.player2.y;
            } else {
                midX = (this.player.x + this.player2.x) / 2;
                midY = (this.player.y + this.player2.y) / 2;
                const dx = Math.abs(this.player.x - this.player2.x) + 300;
                const dy = Math.abs(this.player.y - this.player2.y) + 300;
                const scaleX = vpw / dx;
                const scaleY = vph / dy;
                scale = Math.max(0.4, Math.min(1.2, scaleX, scaleY));
            }
        }
        

        
        const cx = Math.max(0, Math.min(this.worldWidth - vpw / scale, midX - vpw / 2 / scale));
        const cy = Math.max(0, Math.min(this.worldHeight - vph / scale, midY - vph / 2 / scale));
        this.camScale = scale;
        this.player.camX = cx;
        this.player.camY = cy;
        
        this.world1.style.transform = `scale(${scale}) translate(${-cx}px, ${-cy}px)`;

        // v4.0.18：键盘建造菜单贴到屏幕下缘/右缘时整体上移/左移，避免下半截被裁掉看不见
        const visBottom = cy + vph / scale;
        const visRight = cx + vpw / scale;
        for (const km of [this.p1Kmenu, this.p2Kmenu]) {
            if (!km || km.style.display !== 'block') continue;
            const kh = km.offsetHeight || 0, kw = km.offsetWidth || 0;
            const kt = parseFloat(km.style.top) || 0, kl = parseFloat(km.style.left) || 0;
            if (kt + kh > visBottom) km.style.top = Math.max(0, visBottom - kh - 8) + 'px';
            if (kl + kw > visRight) km.style.left = Math.max(0, visRight - kw - 8) + 'px';
        }
    }


    _updateKMenus() {
        // 【优化3】冗余按键映射：为每个操作提供2-3个备用键。如果主键被硬件冲突屏蔽，玩家可以下意识用备用键
        // v4.0.23：倒下的玩家不能打开建造菜单；僵尸阵营玩家禁止打开植物建造菜单
        if (!this.player.dead && !this.isZombieFaction && !this.playerAngelic && !this.playerTraitor) this._handleKMenu(1, this.player, ['f', 'j'], ['altright', 'g', 'k'], ['w'], ['s'], ['a'], ['d'], this.p1Kmenu, this.p1Cursor); // v4.0.44：天使/内鬼不可开建造菜单
        if (this.gameMode === '2p' && this.player2 && !this.player2.dead) {
            // v4.0.16：P2 主键改数字位 1确认/2取消（0浇水/3技能）——原主键 Delete 在 Mac 上是退格(Backspace)根本不触发，
            // 用户实际一直用的是备用键 1；Enter 保留为取消备用
            this._handleKMenu(2, this.player2, ['1', 'shiftright', 'delete'], ['2', 'enter', 'controlright'], ['arrowup'], ['arrowdown'], ['arrowleft'], ['arrowright'], this.p2Kmenu, this.p2Cursor);
        }
    }
    
    _checkAnyKey(keyArr) {
        return keyArr.some(k => {
            if (this.keysJustPressed[k] || this.keysJustPressed[k.toLowerCase()]) return true;
            if (k.length === 1 && k >= 'a' && k <= 'z') {
                if (this.keysJustPressed['Key' + k.toUpperCase()]) return true;
            }
            if (k >= '0' && k <= '9') {
                if (this.keysJustPressed['Digit' + k] || this.keysJustPressed['Numpad' + k]) return true;
            }
            if (k === ' ' && this.keysJustPressed['Space']) return true;
            if (k === 'enter' && (this.keysJustPressed['Enter'] || this.keysJustPressed['NumpadEnter'])) return true;
            if ((k === 'arrowup' || k === 'up') && this.keysJustPressed['ArrowUp']) return true;
            if ((k === 'arrowdown' || k === 'down') && this.keysJustPressed['ArrowDown']) return true;
            if ((k === 'arrowleft' || k === 'left') && this.keysJustPressed['ArrowLeft']) return true;
            if ((k === 'arrowright' || k === 'right') && this.keysJustPressed['ArrowRight']) return true;
            if (k === 'shiftright' && this.keysJustPressed['ShiftRight']) return true;
            if (k === 'controlright' && this.keysJustPressed['ControlRight']) return true;
            if (k === 'altright' && this.keysJustPressed['AltRight']) return true;
            if (k === 'delete' && this.keysJustPressed['Delete']) return true;
            return false;
        });
    }
    
    _handleKMenu(pId, p, keysOk, keysCancel, keysUp, keysDown, keysTabL, keysTabR, uiEl, cursorEl) {
        if (this.blessing) return; // v4.0.19：祝福选择期间屏蔽建造菜单（共用确认键，防止一手按出一串）
        const menu = this.kmenus[pId];
        
        if (this._checkAnyKey(keysCancel)) {
            menu.active = false;
            menu.delArm = null;
            menu.delArmAt = 0;
            uiEl.style.display = 'none';
        }
        
        if (menu.active) {
            // v4.0.53：三栏分类切换（P1 A/D、P2 ←/→）——只有房内地皮的种植菜单才可切栏，升级/拆除菜单、门格/地刺格不可切
            if (menu.planting) {
                const c0 = menu.targetCol, r0 = menu.targetRow;
                const inRoom0 = c0 !== undefined && !!this._insideRoom(c0, r0);
                const rm0 = inRoom0 ? this._insideRoom(c0, r0) : this._resolveBuildRoom(c0, r0, menu.player || this.player);
                const isDoor0 = !!rm0 && (c0 === rm0.doorCol && r0 === rm0.doorRow);
                if ((inRoom0 && !isDoor0) && (this._checkAnyKey(keysTabL) || this._checkAnyKey(keysTabR))) {
                    const dir = this._checkAnyKey(keysTabL) ? -1 : 1;
                    const tabs = HauntedDorm.MENU_TABS;
                    if (menu.tab === undefined || menu.tab === null) menu.tab = 0; // v4.0.53 修复：门格打开时 tab 未初始化，直接取模会 NaN
                    menu.tab = (menu.tab + dir + tabs.length) % tabs.length;
                    menu.index = 0;
                    // v4.0.53 修复：切栏后必须重建可选植物列表，否则渲染的仍是旧栏内容（用户：除常用以外全部出现不了）
                    this._rebuildKMenuPlantOptions(menu);
                    this._renderKMenu(menu, uiEl);
                }
            }
            // v4.0.18：循环翻页——到顶再往上直接跳到最底一条，到底再往下回到最顶
            const len = menu.options.length;
            if (len > 0) {
                if (this._checkAnyKey(keysUp)) { menu.index = (menu.index - 1 + len) % len; this._renderKMenu(menu, uiEl); }
                if (this._checkAnyKey(keysDown)) { menu.index = (menu.index + 1) % len; this._renderKMenu(menu, uiEl); }
            }
            
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

            // v4.0.17：统一房间解析器（原外接矩形+门邻格 find 首匹配会误抓隔壁房间，
            // 站在自家门口/桥上想建造时误报「你已经有房间了！」）
            const room = this._resolveBuildRoom(col, row, p);
            
            if (room && room.owners && !room.owners.includes(p) && room.owners.length >= (room.capacity || 1)) {
                this._flyText(col * 80 + 40, row * 80, '别人的地盘！', '#ff4b4b');
                return;
            }
            
            if (pl) {
                // 有植物 -> 升级/拆除
                menu.planting = false;
                menu.options = [];
                if (pl.def.up) menu.options.push({ action: 'up', text: `升级 (${pl.def.up.cost ? '☀'+pl.def.up.cost : ''} ${pl.def.up.sporeCost ? '🦠'+pl.def.up.sporeCost : ''})` });
                const refSunPrev = Math.floor((pl.investSun || 0) * 0.5), refSporePrev = Math.floor((pl.investSpore || 0) * 0.5); // v4.0.47
                // v4.0.74：路灯花/坚果/向日葵不可拆除——菜单不出现拆除选项
                if (this._canDemolish(pl)) {
                    menu.options.push({ action: 'del', text: '拆除' + ((refSunPrev || refSporePrev) ? `（返${refSunPrev ? '☀' + refSunPrev : ''}${refSporePrev ? '🦠' + refSporePrev : ''}）` : '（无返还）') });
                }
                menu.targetPl = pl;
            } else {
                // 没植物 -> 种植
                if (this.walls.has(`${col},${row}`)) return;
                const inRoomGrid = !!this._insideRoom(col, row);
                const isDoorTile = !!room && (col === room.doorCol && row === room.doorRow);
                if (!room) return; // 不在房间

                menu.targetCol = col;
                menu.targetRow = row;
                menu.planting = true;
                // v4.0.53：统一入口（门格/门邻格只给地刺+土豆雷，房内按当前栏；F/1 初次打开即「常用」）
                this._rebuildKMenuPlantOptions(menu);
                
                // v4.0.18：支持第二间房——空房且自己未满两间即可建造（建造时自动认领）
                if (!this._ownsRoom(p, room) && this._ownedRooms(p).length >= 2) {
                    this._flyText(col * 80 + 40, row * 80, '最多只能拥有两间房！', '#ff4b4b');
                    return;
                }
            }
            
            menu.active = true;
            menu.player = p;
            menu.index = 0;
            uiEl.style.display = 'block';
            uiEl.style.left = (col * 80 + 80) + 'px';
            uiEl.style.top = (row * 80) + 'px';
            this._renderKMenu(menu, uiEl);
        }
    }
    
    // v4.0.53：重建键盘种植菜单的可选植物列表（打开菜单与切栏共用）——门格/门邻格只给地刺+土豆雷，房内按当前栏
    _rebuildKMenuPlantOptions(menu) {
        const p = menu.player || this.player;
        const col = menu.targetCol, row = menu.targetRow;
        const doorSpike = ['spikeweed', 'firespikeweed', 'spikerock', 'ultimatefirespikeweed', 'potatomine', 'firemine'];
        let availableTypes;
        if (col === undefined || row === undefined) {
            availableTypes = HauntedDorm.MENU_TABS[(menu.tab === undefined || menu.tab === null) ? 0 : menu.tab].types.slice();
        } else {
            const inRoomGrid = !!this._insideRoom(col, row);
            const room = this._resolveBuildRoom(col, row, p);
            const isDoorTile = !!room && (col === room.doorCol && row === room.doorRow);
            if (isDoorTile || (!inRoomGrid && !isDoorTile)) {
                availableTypes = doorSpike; // 门格/门邻地刺格：只有地刺系+土豆雷系
            } else {
                menu.tab = (menu.tab === undefined || menu.tab === null) ? 0 : menu.tab;
                availableTypes = HauntedDorm.MENU_TABS[menu.tab].types.slice();
            }
        }
        menu.options = availableTypes.map(t => {
            const d = HauntedDorm.DEFS[t];
            const price = d.sporeCost ? `🦠${d.sporeCost}` : (d.cost > 0 ? `☀${d.cost}` : '免费');
            return { action: 'buy', type: t, text: `${d.name} (${price})` };
        });
    }

    _renderKMenu(menu, uiEl) {
        const p = menu.player || this.player;
        let header = '';
        if (menu.planting && menu.tab !== undefined && HauntedDorm.MENU_TABS[menu.tab]) {
            header = `<div style="padding:4px 10px; background:#8c6a4d; color:#fff; font-size:12px; text-align:center; border-bottom:1px solid #5a4632;">【${HauntedDorm.MENU_TABS[menu.tab].label}】<span style="opacity:0.8; font-size:11px;">（A/D 或 ←/→ 切栏）</span></div>`;
        }
        uiEl.innerHTML = header + menu.options.map((opt, i) => {
            let dimStyle = '';
            if (opt.action === 'buy') {
                const def = HauntedDorm.DEFS[opt.type];
                if (def && ((def.cost && p.sun < def.cost) || (def.sporeCost && p.spore < def.sporeCost))) {
                    dimStyle = 'opacity:0.55;';
                }
            } else if (opt.action === 'up') {
                if (menu.targetPl && menu.targetPl.def && menu.targetPl.def.up) {
                    const upDef = menu.targetPl.def.up;
                    if ((upDef.cost && p.sun < upDef.cost) || (upDef.sporeCost && p.spore < upDef.sporeCost)) {
                        dimStyle = 'opacity:0.55;';
                    }
                }
            }
            return `<div style="padding:5px 10px; background:${i === menu.index ? '#fff' : 'transparent'}; color:${i === menu.index ? '#000' : '#fff'}; border-bottom:1px solid #444; ${dimStyle}">
                ${opt.text}
            </div>`;
        }).join('');
    }

    // v4.0.17：实时伤害榜 + P1/P2 HUD 伤害数字——让「谁对僵尸输出最多」全程可见，MVP 结算不再意外
    _updateDmgBoard() {
        if (this.isZombieFaction) return;
        this._dmgBoardTick = (this._dmgBoardTick || 0) + 1;
        if (this._dmgBoardTick % 20 !== 0) return; // 约 0.33s 刷新一次

        // P1/P2 HUD 实时伤害
        const d1 = document.getElementById('dmg1');
        if (d1) d1.innerText = Math.round(this.player.dmgDealt || 0);
        const d2 = document.getElementById('dmg2');
        if (d2) d2.innerText = Math.round((this.player2 && this.player2.dmgDealt) || 0);

        // 顶部伤害榜：所有人（含人机）按伤害降序，领先者标出
        const board = document.getElementById('dmg-board');
        if (!board) return;
        const entries = this.allPlayers
            .map(p => ({
                label: p === this.player ? 'P1' : (p === this.player2 ? 'P2' : `人机-${p.roleDef ? p.roleDef.name : '?'}`),
                dmg: Math.round(p.dmgDealt || 0),
                cls: p === this.player ? 'dmg-me' : (p === this.player2 ? 'dmg-p2' : '')
            }))
            .sort((a, b) => b.dmg - a.dmg);
        if (entries.length <= 1 && entries[0] && entries[0].dmg === 0) { board.style.display = 'none'; return; }
        board.innerHTML = '⚔ 伤害榜：' + entries.map(e =>
            `<span class="${e.cls}">${e.label} ${e.dmg}</span>`
        ).join(' ｜ ');
        board.style.display = 'block';
    }
    
    _execKMenu(p, menu, opt) {
        if (opt.action === 'up') {
            const pl = menu.targetPl;
            const up = pl.def.up;
            if (p.sun >= (up.cost || 0) && p.spore >= (up.sporeCost || 0)) {
                this.addSun(-(up.cost || 0), p);
                this.addSpore(-(up.sporeCost || 0), p);
                this._evolve(pl, up.to, up.cost || 0, up.sporeCost || 0); // v4.0.47：升级花费计入累计投入
                this.playSfx('plant.mp3', 0.5);
            } else {
                this.playSfx('buzzer.mp3', 0.3);
            }
        } else if (opt.action === 'del') {
            const pl = menu.targetPl;
            // v4.0.74：三类不可拆（兜底守卫，菜单已不显示）
            if (!this._canDemolish(pl)) {
                this._flyText(pl.c * 80 + 40, pl.r * 80, '路灯花/坚果/向日葵不可拆除', '#ffb0b0');
                this.playSfx('buzzer.mp3', 0.3);
                return;
            }
            const now = performance.now();
            if (menu.delArm !== pl || now - (menu.delArmAt || 0) > 2500) {
                menu.delArm = pl;
                menu.delArmAt = now;
                this._flyText(pl.c * 80 + 40, pl.r * 80, '再按一次确认拆除 (2.5s内)', '#ffb0b0');
                this.playSfx('buttonclick.mp3', 0.35);
                return;
            }
            menu.delArm = null;
            menu.delArmAt = 0;
            pl.el1.remove();
            if (pl.txtEl) pl.txtEl.remove();
            this.plants = this.plants.filter(x => x !== pl);
            const refSun = Math.floor((pl.investSun || 0) * 0.5);   // v4.0.47：返还=累计投入一半（盲盒/白得=0）
            const refSpore = Math.floor((pl.investSpore || 0) * 0.5);
            if (refSun > 0) this.addSun(refSun, p);
            if (refSpore > 0) this.addSpore(refSpore, p);
            this._flyText(pl.c * 80 + 40, pl.r * 80,
                (refSun > 0 || refSpore > 0) ? `返还 ${refSun > 0 ? '☀' + refSun + ' ' : ''}${refSpore > 0 ? '🦠' + refSpore : ''}` : '白得的，无返还', '#ffb0b0');
            this.playSfx('shovel.mp3', 0.5);
        } else if (opt.action === 'buy') {
            const type = opt.type;
            const def = HauntedDorm.DEFS[type];
            if (!def) return;
            const tx = menu.targetCol * 80 + 40, ty = menu.targetRow * 80;
            if (this.plants.some(pl => pl.c === menu.targetCol && pl.r === menu.targetRow)) {
                this._flyText(tx, ty, '该位置已有植物！', '#ff8a8a');
                this.playSfx('buzzer.mp3', 0.3);
                return;
            }
            if (type === 'iceshroom') {
                const hostiles = this._getHostileTargets().filter(z => !z.dead);
                if (hostiles.length === 0) {
                    this._flyText(tx, ty, '当前无敌对目标，无法施放', '#ff8a8a');
                    this._flyText(p.x, p.y, '当前无敌对目标，无法施放', '#ff8a8a');
                    this.playSfx('buzzer.mp3', 0.3);
                    return;
                }
            }
            const cost = def.cost || 0;
            const sporeCost = def.sporeCost || 0;
            if (p.sun >= cost && p.spore >= sporeCost) {
                // v4.0.18：统一房间认领（支持主房+副房，最多两间；首个占领者自动补门板坚果）
                const room = this._resolveBuildRoom(menu.targetCol, menu.targetRow, p);
                if (room) this._claimRoom(p, room);
                
                if (cost > 0) this.addSun(-cost, p);
                if (sporeCost > 0) this.addSpore(-sporeCost, p);
                const isDoor = !!room && (menu.targetCol === room.doorCol && menu.targetRow === room.doorRow);
                // v4.0.48：门毁即永久——门口格空着（原门已被咬毁）时禁止重种门板（键盘菜单路径，同 doPlant）
                if (isDoor && !this.plants.some(q => q.c === menu.targetCol && q.r === menu.targetRow)) {
                    if (cost > 0) this.addSun(cost, p);
                    if (sporeCost > 0) this.addSpore(sporeCost, p);
                    this._flyText(tx, ty, '🚪 大门已被咬毁，永久失效，无法重建！', '#ff8a8a');
                    this.playSfx('buzzer.mp3', 0.3);
                    return;
                }
                const spawned = this.spawnPlant(menu.targetCol, menu.targetRow, type, isDoor, p); // v4.0.23：带上种植者与门板属性
                if (!spawned && type !== 'iceshroom' && type !== 'cherrybomb') {
                    if (cost > 0) this.addSun(cost, p);
                    if (sporeCost > 0) this.addSpore(sporeCost, p);
                    this._flyText(tx, ty, '建造未生效，已全额退还！', '#ff8a8a');
                } else {
                    // v4.0.47：记录真实投入；盲盒开出不计投入（同 doPlant）
                    if (spawned) {
                        const isBoxRoll = (type === 'blindbox');
                        spawned.investSun = isBoxRoll ? 0 : cost;
                        spawned.investSpore = isBoxRoll ? 0 : sporeCost;
                    }
                    this.playSfx('plant.mp3', 0.5);
                }
            } else {
                if (p.spore < sporeCost) {
                    this._flyText(tx, ty, `🦠 孢子不足 (需${sporeCost}，当前${Math.floor(p.spore)})`, '#ff8a8a');
                    this._flyText(p.x, p.y - 20, `🦠 孢子不足 (需${sporeCost})`, '#ff8a8a');
                } else if (p.sun < cost) {
                    this._flyText(tx, ty, `☀ 阳光不足 (需${cost}，当前${Math.floor(p.sun)})`, '#ff8a8a');
                    this._flyText(p.x, p.y - 20, `☀ 阳光不足 (需${cost})`, '#ff8a8a');
                }
                this.playSfx('buzzer.mp3', 0.3);
            }
        }
    }

    // ===== v4.0.30：僵尸玩家开局 10 秒观察期 =====
    _zombieFrozen() {
        return this.isZombieFaction && this.zombieFreezeT > 0;
    }
    _updateZombieFreeze(dt) {
        if (!this.isZombieFaction || this.over || !(this.zombieFreezeT > 0)) {
            if (this.freezeEl) this.freezeEl.style.display = 'none';
            return;
        }
        this.zombieFreezeT -= dt;
        if (!this.freezeEl) {
            this.freezeEl = document.createElement('div');
            this.freezeEl.style.cssText = 'position:fixed; top:14%; left:50%; transform:translateX(-50%); color:#ff8a8a; font-size:30px; font-weight:bold; text-shadow:2px 2px 0 #000; z-index:2500; font-family:"Kaiti SC",serif; pointer-events:none; white-space:nowrap;';
            document.body.appendChild(this.freezeEl);
        }
        if (this.zombieFreezeT > 0) {
            this.freezeEl.style.display = 'block';
            this.freezeEl.innerText = '🧟 僵尸还在发呆… ' + Math.ceil(this.zombieFreezeT) + ' 秒后开始行动（AI 正在布防）';
        } else {
            this.freezeEl.style.display = 'none';
            this._announce('🧟 观察期结束，行动开始！', 'scream.mp3');
        }
    }

    // ===== v4.0.33：大蒜守卫——坚果墙/门板血量过半，大蒜飞过去臭晕所有进攻僵尸 =====
    _updateGarlicGuard(dt) {
        if (this.over || !this.plants) return;
        for (const g of this.plants) {
            if (!g.def || !g.def.isGarlic) continue;
            if (g.guardCd > 0) { g.guardCd -= dt; continue; }
            const rm = this._insideRoom(g.c, g.r);
            if (!rm) continue;
            // 找本房间内血量过半的坚果墙（含门板）
            let nut = null;
            for (const p of this.plants) {
                if (p === g || p.hp <= 0) continue;
                if (!(p.isDoor || p.def.name === '坚果墙')) continue;
                if (p.hp > p.maxHp * 0.5) continue;
                if (this._insideRoom(p.c, p.r) !== rm && !(p.c === rm.doorCol && p.r === rm.doorRow)) continue;
                nut = p; break;
            }
            if (!nut) continue;
            // 大蒜飞到坚果旁最近的空格（找不到空格则短暂冷却后重试）
            const nx = nut.c * 80 + 40, ny = nut.r * 80 + 40;
            let spot = null;
            for (const [dc, dr] of [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
                const c = nut.c + dc, r = nut.r + dr;
                if (this.walls.has(`${c},${r}`)) continue;
                if (this.plants.some(p => p.c === c && p.r === r && p.hp > 0)) continue;
                // v4.0.33：落点避开有僵尸的格——否则大蒜落在僵尸脚下，僵尸会被植物碰撞卡死走不开
                if (this.zombies.some(z => !z.dead && Math.floor(z.x / 80) === c && Math.floor(z.y / 80) === r)) continue;
                spot = { c, r }; break;
            }
            if (!spot) { g.guardCd = 3; continue; }
            g.guardCd = 45; // 触发后冷却
            g.c = spot.c; g.r = spot.r;
            if (g.el1) {
                g.el1.style.transition = 'all 0.8s ease-in-out';
                g.el1.style.left = (spot.c * 80) + 'px';
                g.el1.style.top = (spot.r * 80) + 'px';
                setTimeout(() => { if (g.el1) g.el1.style.transition = 'none'; }, 850);
            }
            this._flyText(nx, ny - 40, '🧄 大蒜驰援！', '#c8ff6b');
            // 臭晕坚果周围所有进攻僵尸：晕 2.5 秒 + 20 秒内不敢回此目标
            let hit = 0;
            for (const zb of this.zombies) {
                if (zb.dead) continue;
                if (Math.hypot(zb.x - nx, zb.y - ny) < 120) {
                    zb.stunT = Math.max(zb.stunT || 0, 2.5);
                    zb.garlicScareT = 20;
                    zb.targetSwitched = true;
                    hit++;
                    this._flyText(zb.x, zb.y - 26, '🤢 臭晕！20 秒不敢再来！', '#9dff6b');
                }
            }
            if (hit > 0) this.playSfx('gulp.mp3', 0.5);
        }
    }

    // ===== v4.0.30：小推车=存活奖励——随身推车走到自家门口自动放置 =====
    _updateMowerPlacement() {
        const holders = this.allPlayers.filter(p => !p.isZombie && !p.dead && p.el1 && p.mowerCarry);
        for (const p of holders) {
            const c = Math.floor(p.x / this.gridSize), r = Math.floor(p.y / this.gridSize);
            const rm = this._ownedRooms(p).find(rm => rm.doorCol === c && rm.doorRow === r);
            if (!rm) continue;
            if (this.mowers.some(mw => mw.room === rm && !mw.used && !mw.gone)) continue; // 门口已有推车
            p.mowerCarry = 0;
            this._updateMowerBadge(p);
            this._placeMower(rm, c, r);
            this._flyText(p.x, p.y - 40, '🛒 小推车已就位！', '#ffd54f');
            if (p === this.player || p === this.player2) this._announce('🛒 小推车已就位：敌方靠近即冲撞！', 'plant.mp3');
        }
    }

    _placeMower(rm, mc, mr) {
        const dx = rm.doorCol - (rm.x + rm.w / 2), dy = rm.doorRow - (rm.y + rm.h / 2);
        const len = Math.hypot(dx, dy) || 1;
        const dirX = dx / len, dirY = dy / len; // 门外方向
        const mx = mc * this.gridSize + 40, my = mr * this.gridSize + 40;
        const el = document.createElement('div');
        el.className = 'tile';
        el.style.left = (mc * this.gridSize) + 'px';
        el.style.top = (mr * this.gridSize) + 'px';
        el.style.zIndex = 5;
        el.innerHTML = `<img src="assets/images/interface/LawnCleaner.png" style="width:100%; height:100%; object-fit:contain; transform:scale(1.1);">`;
        this.world1.appendChild(el);
        this.mowers.push({ room: rm, homeX: mx, homeY: my, x: mx, y: my,
                           dirX, dirY, el1: el, used: false, active: false, dist: 0, gone: false,
                           hits: new Set() });
    }

    _updateMowerBadge(p) {
        if (!p.el1) return;
        if (!p.mowerBadge) {
            p.mowerBadge = document.createElement('div');
            p.mowerBadge.style.cssText = 'position:absolute; top:-52px; left:50%; transform:translateX(-50%); font-size:20px; z-index:2; pointer-events:none;';
            p.mowerBadge.innerText = '🛒';
            p.el1.appendChild(p.mowerBadge);
        }
        p.mowerBadge.style.display = p.mowerCarry ? 'block' : 'none';
    }

    // ===== v4.0.19：小推车（每房一台的最后防线，撞击所有敌对单位）=====
    _updateMowers(dt) {
        if (!this.mowers || this.mowers.length === 0) return;
        const targets = this._getHostileTargets();
        for (const mw of this.mowers) {
            if (mw.gone) continue;
            if (!mw.active) {
                // 触发：任何靠近 75px 的敌对单位（含僵尸玩家与叛徒）
                for (const zb of targets) {
                    if (zb.dead) continue;
                    if (Math.hypot(zb.x - mw.x, zb.y - mw.y) < 75) {
                        mw.active = true; mw.used = true;
                        this._announce('🛒 小推车启动！', 'cherrybomb.mp3');
                        break;
                    }
                }
                if (!mw.active) continue;
            }
            // 冲撞：向门外方向疾驰
            mw.x += mw.dirX * 520 * dt;
            mw.y += mw.dirY * 520 * dt;
            mw.dist += 520 * dt;
            mw.el1.style.left = mw.x + 'px';
            mw.el1.style.top = mw.y + 'px';
            // 撞击敌对单位：大伤害 + 击退 + 眩晕（每次冲锋每个敌对单位只撞一次）
            const owner = (mw.room.owners && mw.room.owners.length > 0) ? mw.room.owners[0] : null;
            for (const zb of targets) {
                if (zb.dead || mw.hits.has(zb)) continue;
                if (Math.hypot(zb.x - mw.x, zb.y - mw.y) < 50) {
                    const dmg = 800;
                    zb.hp -= dmg;
                    if (owner) owner.dmgDealt = (owner.dmgDealt || 0) + dmg;
                    mw.hits.add(zb);
                    zb.hitFlashT = 0.3;
                    zb.stunT = Math.max(zb.stunT || 0, 2.5);
                    const pushNx = zb.x + mw.dirX * 60;
                    const pushNy = zb.y + mw.dirY * 60;
                    if (!this.checkCollision(pushNx, zb.y, 10, zb.isZombie)) zb.x = pushNx;
                    if (!this.checkCollision(zb.x, pushNy, 10, zb.isZombie)) zb.y = pushNy;
                    if (zb.el1) { zb.el1.style.left = zb.x + 'px'; zb.el1.style.top = zb.y + 'px'; }
                    this._flyText(zb.x, zb.y - 30, '-' + dmg, '#ff8a5c');
                    if (zb.hpBg) {
                        zb.hpBg.style.display = 'block';
                        zb.hpFg.style.width = Math.max(0, zb.hp / zb.maxHp * 100) + '%';
                    }
                    if (zb === this.player && this.isZombieFaction) {
                        this.setHp();
                        this.flashDamage();
                    }
                    if (zb.hp <= 0) {
                        if (zb === this.player && this.isZombieFaction) {
                            this._checkPlayerDown(zb);
                        } else {
                            this._killZombie(zb, owner);
                        }
                    }
                }
            }
            if (mw.dist >= 260) {
                mw.gone = true;
                mw.el1.remove();
            }
        }
    }

    // 后备推车祝福：恢复 picker 拥有房间门口已用掉的小推车（返回恢复台数）
    _restoreMowers(p) {
        let n = 0;
        for (const mw of this.mowers) {
            if (!this._ownsRoom(p, mw.room)) continue;
            if (mw.used) {
                mw.used = false; mw.active = false; mw.gone = false;
                mw.dist = 0; mw.x = mw.homeX; mw.y = mw.homeY;
                if (mw.hits) mw.hits.clear();
                if (!mw.el1.isConnected) this.world1.appendChild(mw.el1);
                mw.el1.style.left = mw.x + 'px';
                mw.el1.style.top = mw.y + 'px';
                n++;
            }
        }
        return n;
    }

    // ===== v4.0.19：存活三选一祝福 =====
    _offerBlessings() {
        // v4.0.60：内鬼/天使已反水/升华，不再是"存活者"——不发存活奖励
        if (this.over || this.isZombieFaction || this.playerTraitor || this.playerAngelic) return;
        const pool = HauntedDorm.BLESSINGS.slice();
        // 洗牌取三个不重复
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        this.blessing = { options: pool.slice(0, 3), idx: 0, deadline: this.gameTime + 15000 };
        this._renderBlessing();
        this.blessEl.style.display = 'block';
        this._announce('🎁 存活奖励：选一个祝福！', 'readysetplant.mp3');
    }

    _pickBlessing(idx, picker = this.player) {
        const b = this.blessing;
        if (!b) return;
        const opt = b.options[idx];
        if (opt) {
            opt.apply(this, picker);
            this._announce('🎁 祝福生效：' + opt.name, 'points.mp3');
        }
        this._closeBlessing();
    }

    _renderBlessing() {
        const b = this.blessing;
        if (!b) return;
        this.blessEl.innerHTML =
            `<div style="color:#ffe14a; font-size:20px; font-weight:bold; text-shadow:1px 1px 2px #000; margin-bottom:8px;">🎁 存活奖励——选一个祝福！</div>` +
            `<div style="display:flex; gap:14px; justify-content:center;">` +
            b.options.map((o, i) =>
                `<div class="bless-card" data-idx="${i}" style="cursor:pointer; width:150px; padding:10px 8px; border-radius:10px; background:rgba(30,16,8,${i === b.idx ? '0.95' : '0.75'}); border:3px solid ${i === b.idx ? '#ffe14a' : '#8c6a4d'}; color:#f5e6c8; transition:transform 0.1s;">
                    <div style="font-size:26px;">${o.icon}</div>
                    <div style="font-size:16px; font-weight:bold; color:${i === b.idx ? '#ffe14a' : '#f5e6c8'};">${o.name}</div>
                    <div style="font-size:12px; opacity:0.9; line-height:1.5;">${o.desc}</div>
                </div>`
            ).join('') +
            `</div>` +
            `<div style="margin-top:8px; color:#c8b8a0; font-size:13px; text-shadow:1px 1px 2px #000;">鼠标直接点击 ｜ P1：W/S+F ｜ P2：↑/↓+1 ｜ 15秒后自动跳过</div>`;
        this.blessEl.querySelectorAll('.bless-card').forEach(el => {
            el.onclick = (e) => {
                e.stopPropagation();
                this._pickBlessing(parseInt(el.dataset.idx));
            };
        });
    }

    _updateBlessing() {
        // v4.0.30：僵尸方模式——AI 植物的存活奖励：每 90 秒自动发放，AI 自动挑选（推车双倍权重）
        if (this.isZombieFaction) {
            if (!this.over && this.gameTime >= this.aiBlessAt) {
                this.aiBlessAt = this.gameTime + 90000;
                for (const ai of this.ais) {
                    if (ai.dead) continue;
                    const weighted = [];
                    for (const bl of HauntedDorm.BLESSINGS) weighted.push(bl, ...(bl.id === 'mower' ? [bl] : []));
                    const pick = weighted[Math.floor(Math.random() * weighted.length)];
                    pick.apply(this, ai);
                    this._flyText(ai.x, ai.y - 46, '🎁 AI 存活奖励：' + pick.name, '#ffd54f');
                }
            }
            return;
        }
        // 计时触发（每 90 秒一次；v4.0.60：内鬼/天使已非存活者，不再发放存活奖励）
        if (!this.blessing && !this.over && !this.playerTraitor && !this.playerAngelic && this.gameTime >= this.blessingAt) {
            this._offerBlessings();
        }
        const b = this.blessing;
        if (!b) return;
        // 15 秒无人选 → 自动跳过
        if (this.gameTime > b.deadline) { this._closeBlessing(); return; }
        const len = b.options.length;
        if (len === 0) { this._closeBlessing(); return; }
        const up = this._checkAnyKey(['w']) || this._checkAnyKey(['arrowup']);
        const down = this._checkAnyKey(['s']) || this._checkAnyKey(['arrowdown']);
        const ok = this._checkAnyKey(['f', 'j']) || this._checkAnyKey(['1', 'shiftright']);
        if (up) { b.idx = (b.idx - 1 + len) % len; this._renderBlessing(); }
        if (down) { b.idx = (b.idx + 1) % len; this._renderBlessing(); }
        if (ok) {
            const picker = this.player2 && this._checkAnyKey(['1', 'shiftright']) ? this.player2 : this.player;
            this._pickBlessing(b.idx, picker);
        }
    }

    _closeBlessing() {
        this.blessing = null;
        if (this.blessEl) this.blessEl.style.display = 'none';
        this.blessingAt = this.gameTime + 90000;
    }

    // ===== v4.0.20：昼夜循环 =====
    _isShroom(def) {
        return !!def && (def.name.includes('菇') || !!def.mine); // 蘑菇系（含孢子地雷）；向日葵/豌豆/地刺等不受影响
    }
    _shroomAwake() {
        return this.isZombieFaction || this.isNight; // 僵尸阵营不搞昼夜；白天蘑菇睡觉
    }
    _applySleepVisual(pl) {
        if (!pl || !pl.el1 || pl.isDoor || (!this._isShroom(pl.def) && !pl.def.nightOnly && !pl.def.nightProduce)) return; // v4.0.46：路灯花（nightProduce）同样有作息
        const imgs = pl.el1.querySelectorAll('img');
        // v4.0.46：作息反转——阳光系（nightOnly，优先判定：阳光菇名字带「菇」但作息跟向日葵）夜晚熄灯；菇类/路灯花白天睡觉
        const asleep = this.isZombieFaction ? false : (pl.def.nightOnly ? this.isNight : !this.isNight);
        imgs.forEach(img => {
            // v4.0.22：灰化减磅（0.75→0.45，保留大部分原色）——睡觉是「打盹」不是「换皮」
            const base = pl.def.tint || '';
            const sleepFx = 'grayscale(0.45) brightness(0.95) opacity(0.88)';
            img.style.filter = asleep ? (base ? base + ' ' + sleepFx : sleepFx) : base;
        });
        // v4.0.22：头顶 💤 徽标——一眼看懂「在睡觉」，而不是以为掉色 bug
        let badge = pl.sleepBadge;
        if (asleep && !badge) {
            badge = document.createElement('div');
            badge.className = 'lv-badge';
            badge.style.cssText = 'background:rgba(255,255,255,0.92); border-color:#3a5fa8; color:#1e3a8a; top:-20px; font-size:13px; padding:1px 6px; animation:zzzFloat 1.6s ease-in-out infinite;';
            badge.innerText = '💤';
            pl.el1.appendChild(badge);
            pl.sleepBadge = badge;
        } else if (!asleep && badge) {
            badge.remove();
            pl.sleepBadge = null;
        }
    }

    // ===== v4.0.39：僵尸冰冻全程可视——冰蓝滤镜 + ❄️ 徽标（替代旧「把寒冰菇贴僵尸脸上 1 秒」）=====
    _applyFrozenFx(zb, on) {
        if (!zb || !zb.el1) return;
        if (on && !zb._iceBadge) {
            if (zb.imgEl) zb.imgEl.style.filter = 'brightness(1.2) saturate(0.5) hue-rotate(160deg) drop-shadow(0 0 8px #7fd8ff)';
            const b = document.createElement('div');
            b.className = 'lv-badge';
            b.style.cssText = 'background:rgba(210,240,255,0.95); border-color:#3a7fa8; color:#155e8a; top:-20px; font-size:13px; padding:1px 6px;';
            b.innerText = '❄️ 冰冻';
            zb.el1.appendChild(b);
            zb._iceBadge = b;
        } else if (!on && zb._iceBadge) {
            if (zb.imgEl) zb.imgEl.style.filter = '';
            zb._iceBadge.remove();
            zb._iceBadge = null;
        }
    }

    _updateDayNight(time) {
        if (this.isZombieFaction || this.over) return;
        if (time < this.dnNext) return;
        this.isNight = !this.isNight;
        this.dnNext = time + (this.isNight ? 90000 : 60000); // 白天 60s / 夜晚 90s
        if (this.dnTint) this.dnTint.style.background = this.isNight ? 'rgba(10, 14, 52, 0.45)' : 'transparent';
        if (this.isNight) {
            this._announce('🌙 夜幕降临！向日葵们熄灯睡觉，蘑菇和路灯花开始上夜班（僵尸提速 15%）', 'evillaugh.mp3', true);
        } else {
            this._announce('☀ 天亮了！向日葵们醒来产阳光，蘑菇们睡觉去了，抓紧布防发育', 'points.mp3', true);
        }
        for (const pl of this.plants) this._applySleepVisual(pl);
        this._updateGhostChip();
    }

    // ===== v4.0.20：尸潮波次（附加小怪/BOSS，不影响单僵尸胜负体系）=====
    _updateWaves(time) {
        if (this.isZombieFaction) {
            // v4.0.61：僵尸阵营不自动刷波——尸潮由 H 键号令发动（见 _orderHorde），这里只递减冷却
            if (this.waveOrderCd > 0) {
                const dSec = (this._lastWaveT !== undefined) ? (time - this._lastWaveT) / 1000 : 0;
                this.waveOrderCd = Math.max(0, this.waveOrderCd - dSec);
            }
            this._lastWaveT = time;
            return;
        }
        if (this.over || !this.ghostSpawned) return;
        // 开波前 10 秒预警——PVZ 经典台词，绝不搞突然袭击
        if (!this.waveWarned && time >= this.waveAt - 10000) {
            this.waveWarned = true;
            const bossComing = (this.waveN + 1) % 5 === 0;
            this._announce(bossComing ? '⚠️ 警报：一大波僵尸正在接近——地面在震动！' : '⚠️ 一大波僵尸正在接近！', 'finalwave.mp3', true);
        }
        if (time < this.waveAt) return;
        // 开波
        this.waveN++;
        this.waveWarned = false;
        this.waveAt = time + 75000;
        const n = Math.min(6, 3 + Math.floor(this.waveN / 2));
        for (let i = 0; i < n; i++) this._spawnMinion();
        if (this.waveN % 5 === 0) {
            this._spawnBoss();
            this._announce(`🚨 第 ${this.waveN} 波尸潮来袭——僵王机甲驾到！！`, 'scream.mp3', true);
        } else {
            this._announce(`🧟 第 ${this.waveN} 波尸潮来袭！`, 'evillaugh.mp3', true);
        }
        this._updateGhostChip();
    }

    _spawnMinion(isBoss = false) {
        const lv = this.ghostLevel;
        const cfg = isBoss
            ? { name: '僵王机甲', img: 'Zombies/LGBOSS/0.gif', hp: Math.round(3000 * Math.pow(2, Math.min(this.waveN, 6))), speed: 170 } // v4.0.42：随波次翻倍；v4.0.54：基数 800→3000、封顶 25600→192000（玩家豌豆链已到 32768 单发，原 25600 一炮即秒，用户实报 Boss 太弱）
            : { name: '小鬼僵尸', img: 'Zombies/Imp/0.gif', hp: Math.round(100 * Math.pow(2, lv - 1)), speed: 260 }; // v4.0.69：25→100（×4，与主僵尸同步上调；保持"小鬼=主僵尸同级半血"梯度）
        const p = this._ghostSpawnPoint();
        const zb = { x: p.x, y: p.y, hp: cfg.hp, maxHp: cfg.hp, speed: cfg.speed, level: lv, cfg: cfg,
                     side: Math.random() < 0.5 ? 1 : -1, stuck: 0, detourT: 0, stunT: 0, slowT: 0, dead: false,
                     isMinion: !isBoss, isBoss: isBoss };
        this.zombies.push(zb);

        const zEl1 = document.createElement('div');
        zEl1.className = 'entity avatar';
        const size = isBoss ? 'width:220%; height:220%; transform:translate(-42%, -40%);'
                            : 'width:100%; height:100%; transform:translate(-3%, -25%);';
        const barTop = isBoss ? 'top:-42px;' : 'top:-14px;';
        zEl1.innerHTML = `<img src="assets/images/${cfg.img}" style="${size}">` +
            (isBoss ? `<div class="lv-badge" style="background:#a00000; top:-36px;">僵王</div>` : '') +
            `<div class="hp-bar-bg" style="${barTop} display:none;"><div class="hp-bar-fg" style="width:100%; background:#ff5252;"></div></div>` +
            (this.isZombieFaction && !isBoss ? `<div style="position:absolute; top:-30px; left:50%; transform:translateX(-50%); font-size:15px; color:#ff5252; text-shadow:0 0 5px #000; z-index:60; pointer-events:none;">🧟 尸潮</div>` : ''); // v4.0.77：号令尸潮的小鬼加「尸潮」角标，与玩家本体（无角标）区分，避免"看到一样的僵尸"
        this.world1.appendChild(zEl1);
        zb.el1 = zEl1;
        zb.imgEl = zEl1.querySelector('img');
        zb.hpBg = zEl1.querySelector('.hp-bar-bg');
        zb.hpFg = zEl1.querySelector('.hp-bar-fg');
    }

    _spawnBoss() { this._spawnMinion(true); }

    // ===== v4.0.20：内鬼模式 =====
    _updateTraitor(dt) {
        const t = this.traitor;
        if (!t || t.dead) return;
        if (!this.traitorRevealed) {
            // 揭露前 10 秒：气氛提示（不指名道姓，纯铺垫）
            if (!this.traitorHinted && this.gameTime >= this.traitorRevealAt - 10000) {
                this.traitorHinted = true;
                this._announce('🕯 气氛突然安静得可怕……幸存者中，混进了一个内鬼……', 'evillaugh.mp3');
            }
            if (this.gameTime < this.traitorRevealAt) return;
            // 揭露：变红名、上血条、开始反水
            this.traitorRevealed = true;
            t.isTraitor = true;
            t.hp = 300; t.maxHp = 300; // v4.0.22：600→300，植物集火打得动
            const badge = document.createElement('div');
            badge.className = 'lv-badge';
            badge.style.background = '#c62828';
            badge.innerText = '😈 内鬼';
            t.el1.appendChild(badge);
            const hb = document.createElement('div');
            hb.className = 'hp-bar-bg';
            hb.style.top = '-14px';
            hb.style.display = 'block';
            hb.innerHTML = '<div class="hp-bar-fg" style="width:100%; background:#ff5252;"></div>';
            t.el1.appendChild(hb);
            t.trHpBg = hb;
            t.trHpFg = hb.firstChild;
            this._announce(`😈 内鬼现身：【${t.roleDef.name}】反水了！它会像僵尸一样挠门破房——护好自己的门板！击败有重赏！`, 'scream.mp3', true);
            return;
        }
        // v4.0.43 重做（用户实报：内鬼卡在墙里、不挠门）：跟正常僵尸同一套行为——
        // ①穿门寻路走出自己的房间（旧 passDoors=false 被自己的门锁死 → BFS 失败走直线撞墙卡死）
        // ②目标在房内且门活着 → 走到门口格「挠门」（前方 25px probe 咬门，同僵尸范式）
        // ③破门后自然穿门进屋贴身咬人
        // v4.0.72：内鬼先出门——自己房间的门还活着挡路时，先走跳板瞬移出房（省去慢慢挠门），
        // 跟普通僵尸一样出门去找别人；否则玩家/植物永远打不到缩在房内的内鬼，游戏无法结束
        if (t.room && !t.fleeing) {
            const myDoor = this.getPlantAt(t.room.doorCol * this.gridSize, t.room.doorRow * this.gridSize);
            if (myDoor && myDoor.isDoor && myDoor.hp > 0) {
                const pad = t.room.jumpPad;
                if (pad) {
                    const padPx = pad.c * this.gridSize + 40, padPy = pad.r * this.gridSize + 40;
                    if (Math.hypot(t.x - padPx, t.y - padPy) > 40) {
                        t.path = this._findPath(t.x, t.y, padPx, padPy) || [];
                        if (t.path && t.path.length > 0) t.path.push({ x: padPx, y: padPy });
                        t.pathTimer = 0;
                        let dxx = 0, dyy = 0;
                        if (t.path && t.path.length > 0) { dxx = t.path[0].x - t.x; dyy = t.path[0].y - t.y; }
                        else { dxx = padPx - t.x; dyy = padPy - t.y; }
                        const l = Math.hypot(dxx, dyy) || 1;
                        const sp = 300;
                        const nx = t.x + dxx / l * sp * dt, ny = t.y + dyy / l * sp * dt;
                        if (!this.checkCollision(nx, t.y, 14, true)) t.x = nx;
                        if (!this.checkCollision(t.x, ny, 14, true)) t.y = ny;
                        t.el1.style.left = t.x + 'px';
                        t.el1.style.top = t.y + 'px';
                        return; // 这一帧只走去跳板
                    }
                }
            }
        }
        let best = null, bd = Infinity;
        for (const p of this.allPlayers) {
            if (p.dead || p === t) continue;
            if (this.playerTraitor && p === this.player) continue; // v4.0.44：玩家也是内鬼——内鬼不咬内鬼
            const d = Math.hypot(p.x - t.x, p.y - t.y);
            if (d < bd) { bd = d; best = p; }
        }
        if (!best) return;
        // 目标所在房间与门板状态
        const bcol = Math.floor(best.x / this.gridSize), brow = Math.floor(best.y / this.gridSize);
        const brm = this._insideRoom(bcol, brow)
            || this.rooms.find(r => best.x >= r.x * 80 && best.x < (r.x + r.w) * 80 && best.y >= r.y * 80 && best.y < (r.y + r.h) * 80);
        const doorPlant = brm ? this.getPlantAt(brm.doorCol * 80, brm.doorRow * 80) : null;
        const scratchingDoor = !!(brm && doorPlant);

        // 追击点：门活着 → 门口格（挠门）；门没了/目标在屋外 → 目标本体
        const tx = scratchingDoor ? brm.doorCol * this.gridSize + 40 : best.x;
        const ty = scratchingDoor ? brm.doorRow * this.gridSize + 40 : best.y;
        t.pathTimer = (t.pathTimer || 0) + dt;
        if (t.pathTimer > 1.0 || !t.path) {
            t.pathTimer = 0;
            // v4.0.61：与普通僵尸完全一致——门板视为障碍（false），BFS 引导到门前而不是穿门格，
            //   配合下方"碰撞=实体 + probe 啃门"，内鬼能自己挠开任何挡路的门（含自己房间的门）
            t.path = this._findPath(t.x, t.y, tx, ty, false);
            if (t.path && t.path.length > 0) t.path.push({ x: tx, y: ty }); // 末步精确定位
        }
        let dx, dy;
        if (t.path && t.path.length > 0) {
            const nd = t.path[0];
            dx = nd.x - t.x; dy = nd.y - t.y;
            if (Math.hypot(dx, dy) < 12) {
                t.path.shift();
                if (t.path.length > 0) { dx = t.path[0].x - t.x; dy = t.path[0].y - t.y; }
            }
        } else {
            dx = tx - t.x; dy = ty - t.y;
        }
        const len = Math.hypot(dx, dy) || 1;
        const spd = 300; // v4.0.22：330→300，走廊上跑得掉
        const nx = t.x + dx / len * spd * dt, ny = t.y + dy / len * spd * dt;
        // v4.0.61：碰撞同普通僵尸（isZombie=true，一切植物=绝对实体）+ stuck 卡死强制重寻路
        let tMoved = false;
        if (!this.checkCollision(nx, t.y, 14, true)) { t.x = nx; tMoved = true; }
        if (!this.checkCollision(t.x, ny, 14, true)) { t.y = ny; tMoved = true; }
        if (!tMoved) {
            t.stuck = (t.stuck || 0) + dt;
            if (t.stuck > 0.4) { t.stuck = 0; t.path = null; t.pathTimer = 0; } // 卡死→立刻重寻路
        } else {
            t.stuck = 0;
        }
        t.el1.style.left = t.x + 'px';
        t.el1.style.top = t.y + 'px';
        if (t.trHpFg) t.trHpFg.style.width = Math.max(0, t.hp / t.maxHp * 100) + '%';

        // v4.0.61：probe 啃门（同普通僵尸范式）——前方 25px 有非贴地植物就站定啃，
        //   不再只认"目标房间的门"：自己房间的门挡路也能挠开（这就是"内鬼走不出来门"的根治）
        const probeX = t.x + dx * 25, probeY = t.y + dy * 25;
        const atkPlant = this.getPlantAt(probeX, probeY);
        if (atkPlant && !atkPlant.def.ground) {
            t.biteT = (t.biteT || 0) + dt;
            if (t.biteT >= 1.8) {
                t.biteT = 0;
                atkPlant.hp -= 50;
                this._flyText(atkPlant.c * 80 + 40, atkPlant.r * 80, '-50 😈挠门', '#ff5252');
                this.playSfx('chomp.mp3', 0.35);
                const bg = atkPlant.el1.querySelector('.hp-bar-bg');
                const fg = atkPlant.el1.querySelector('.hp-bar-fg');
                if (bg) {
                    bg.style.display = 'block';
                    fg.style.width = Math.max(0, (atkPlant.hp / atkPlant.maxHp) * 100) + '%';
                }
                atkPlant.el1.classList.add('shake');
                if (!atkPlant._shakeT) {
                    atkPlant._shakeT = setTimeout(() => { if (atkPlant && atkPlant.el1) atkPlant.el1.classList.remove('shake'); atkPlant._shakeT = null; }, 100);
                }
                if (atkPlant.hp <= 0) {
                    atkPlant.el1.remove();
                    if (atkPlant.txtEl) atkPlant.txtEl.remove();
                    this.plants = this.plants.filter(pl => pl !== atkPlant);
                    this._flyText(atkPlant.c * 80 + 40, atkPlant.r * 80, '😈 门被内鬼拆了！', '#ff5252');
                    t.path = null; // 立即重寻路进屋
                }
            }
            return; // 啃门期不咬人
        }

        // 贴身咬人：v4.0.22 每 1.8 秒一口 12 血（v4.0.43：删 safeBehindDoor——破门后进屋照咬）
        if (bd < 48) {
            t.biteT = (t.biteT || 0) + dt;
            if (t.biteT >= 1.8) {
                t.biteT = 0;
                best.hp -= 12;
                this._flyText(best.x, best.y - 26, '-12 😈', '#ff5252');
                this.playSfx('chomp.mp3', 0.4);
                if (best === this.player || best === this.player2) this.setHp();
                if (best.hp <= 0 && !best.dead) {
                    this._checkPlayerDown(best);
                    // v4.0.65：AI 内鬼肃清全部植物方成员 → 邪恶胜利（此前 AI 内鬼咬死人机后无任何结算，
                    // 玩家已死/变内鬼/变天使时游戏永远挂起；玩家植物形态还活着则不算全灭，游戏继续）
                    if (this._plantSideAlive() === 0) {
                        this._announce('😈 内鬼屠尽了所有幸存者——邪恶胜利！', 'evillaugh.mp3', true);
                        this.gameOver(true);
                    }
                }
            }
        }
    }

    // ===== v4.0.61：僵尸阵营指挥 =====
    // G 键：在存活幸存者（人机 + P1/P2）中循环切换"优先猎杀目标"，小怪集火该目标
    _cycleCommandTarget() {
        const candidates = [...this.ais, ...(this.player2 ? [this.player2] : [])].filter(v => !v.dead);
        if (this.player && !this.player.dead) candidates.unshift(this.player);
        if (candidates.length === 0) return;
        let idx = candidates.indexOf(this.commandTarget);
        this.commandTarget = candidates[(idx + 1) % candidates.length];
        const nm = this.commandTarget === this.player ? (this.player2 ? 'P2' : '你(本体)')
            : (this.commandTarget.roleDef ? this.commandTarget.roleDef.name : '幸存者');
        this._announce(`⚑ 指挥令旗指向：${nm}——尸潮优先猎杀他！`, 'points.mp3');
        this._updateGhostChip();
    }
    // H 键：号令一波尸潮（3~6 只小鬼僵尸）立即进攻，60s CD
    _orderHorde() {
        if (this.waveOrderCd > 0) {
            this._flyText(this.player.x, this.player.y - 40, `尸潮冷却 ${Math.ceil(this.waveOrderCd)}s`, '#ff8a8a');
            this.playSfx('buzzer.mp3', 0.3);
            return;
        }
        this.waveOrderCd = 60;
        const n = 3 + Math.floor(Math.random() * 4); // 3~6 只
        for (let i = 0; i < n; i++) this._spawnMinion();
        this._announce(`🧟 尸潮号令：${n} 只小鬼僵尸听令出击！`, 'evillaugh.mp3', true);
        this._updateGhostChip();
    }

    _defeatTraitor(killer) {
        const t = this.traitor;
        if (!t || t.dead) return;
        t.dead = true;
        t.el1.classList.add('dead-slash');
        t.el1.style.filter = 'grayscale(1)';
        this._announce('🎉 内鬼被击败了！全体幸存者 +200🦠 庆功！', 'points.mp3', true);
        for (const p of this.allPlayers) {
            if (!p.dead && p !== t) this.addSpore(200, p);
        }
        if (killer && killer.roleDef) killer.dmgDealt = (killer.dmgDealt || 0) + 300;
        // 若主僵尸此前已被消灭，检查场上残存波次与僵尸是否已全部清空
        if (this.ghostRespawnAt > 0 && !this.isZombieFaction) {
            const aliveThreats = this.zombies.filter(z => !z.dead);
            if (aliveThreats.length === 0) {
                if (this._gameOverTimer) clearTimeout(this._gameOverTimer);
                this._gameOverTimer = setTimeout(() => this.gameOver(!this.playerTraitor && !this.isZombieFaction), 2000); // v4.0.65：玩家内鬼时植物赢=内鬼败
            }
        }
    }

    _tick(dt, time) {
        // v4.0.74：跳板抛物线飞行插值（0.9s 空中抛物线，先升后降落到出生点）
        for (const e of this.allPlayers.concat(this.ais)) {
            if (!e || !e._jumpFly) continue;
            const f = e._jumpFly;
            f.elapsed += dt;
            const k = Math.min(1, f.elapsed / 0.9);
            e.x = f.sx + (f.tx - f.sx) * k;
            e.y = f.sy + (f.ty - f.sy) * k;
            const h = Math.sin(Math.PI * k) * 200;
            if (e.el1) {
                e.el1.style.left = e.x + 'px';
                e.el1.style.top = e.y + 'px';
                // 直接覆盖为标准定位 transform + 抛物线抬升（不用 origT 前缀避免 'none ' 无效组合）
                e.el1.style.transform = 'translate(-50%, -50%) translateY(' + (-h) + 'px)';
            }
            if (k >= 1) {
                if (e.el1) { e.el1.style.left = f.tx + 'px'; e.el1.style.top = f.ty + 'px'; e.el1.style.transform = f.origT || ''; }
                e.x = f.tx; e.y = f.ty;
                delete e._jumpFly;
                this._flyText(e.x, e.y - 30, '🪂 安全着陆！', '#a9ffa9');
            }
        }
        // v4.0.19：全局祝福计时递减
        if (this.plantDmgBoostT > 0) this.plantDmgBoostT -= dt;
        if (this.waterBoostT > 0) this.waterBoostT -= dt;
        for (const p of this.allPlayers) {
            if (p.skillCd > 0) {
                p.skillCd -= dt;
                if (p.skillCd <= 0) this._refreshHud();
            }
            // v4.0.44：天使双技能 CD
            if (p.capCd > 0) {
                p.capCd -= dt;
                if (p.capCd <= 0) this._refreshHud();
            }
            if (p.spdCd > 0) {
                p.spdCd -= dt;
                if (p.spdCd <= 0) this._refreshHud();
            }
            // v4.0.48：门板修复 CD
            if ((p.nutHealCd || 0) > 0) {
                p.nutHealCd -= dt;
                if (p.nutHealCd <= 0) this._refreshHud();
            }
        }
        for (const zb of this.zombies) { if (zb.hitFlashT > 0) zb.hitFlashT -= dt; }
        this._updateGhostDirector(time);
        this._updateAIs(dt);
        this._updateWaves(time);      // v4.0.20：尸潮波次
        this._updateDayNight(time);   // v4.0.20：昼夜循环
        this._updateTraitor(dt);      // v4.0.20：内鬼模式
        this._updateJumpPads(dt);     // v4.0.72：房间跳板传送
        if (Math.floor(time / 500) !== Math.floor((time - dt * 1000) / 500)) this._updateGhostChip(); // 0.5s 刷一次信息牌
        if (Math.floor(time / 1000) !== Math.floor((time - dt * 1000) / 1000)) this._refreshHud(); // 1s 刷一次 HUD (为了技能倒计时)

        for (const p of this.allPlayers) {
            if (p.sunBuffT > 0) p.sunBuffT -= dt;
            if (p.atkBuffT > 0) p.atkBuffT -= dt;
            if (p.speedBuffT > 0) p.speedBuffT -= dt;
            if (p.dmgMulT > 0) p.dmgMulT -= dt; // v4.0.77：盲盒「尸怒啃咬」倒计时
            
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
        // v4.0.22：走廊加成 2×→1.5×——倍速全开时出门瞬间过冲、追战时根本控不住
        const playerPhysRoom = this._insideRoom(Math.floor(this.player.x/this.gridSize), Math.floor(this.player.y/this.gridSize));
        if (playerPhysRoom) {
            moveSpeed = baseSpeed / this.timeScale;
        } else {
            moveSpeed = baseSpeed * 1.5 / this.timeScale;
        }

        // P1 Movement - 【SOC防冲突】
        // v4.0.16：菜单打开（建造菜单/升级拆除弹窗）时 P1 停止移动，防止选菜单时人物走位
        // v4.0.23：P1 倒下后尸体不再接受移动输入
        const p1MenuBusy = this.kmenus[1].active || (this.popup && this.popup.style.display === 'block') || this.player.dead || !!this.blessing || this._zombieFrozen() || !!this.player._jumpFly; // v4.0.30：观察期禁移动；v4.0.74：跳板飞行中禁移动
        let vx1 = 0, vy1 = 0;
        const p1L = this.keys['a'] || this.keys['KeyA'], p1R = this.keys['d'] || this.keys['KeyD'], p1U = this.keys['w'] || this.keys['KeyW'], p1D = this.keys['s'] || this.keys['KeyS'];
        if (!p1MenuBusy) {
            if (p1L && !p1R) vx1 -= moveSpeed;
            if (p1R && !p1L) vx1 += moveSpeed;
            if (p1U && !p1D) vy1 -= moveSpeed;
            if (p1D && !p1U) vy1 += moveSpeed;
        }

        // v4.0.22：速度平滑（加减速缓冲）——修「卡住/过冲」：瞬时速度改为指数趋近目标速度，
        // 碰墙的轴速度立即清零（防贴墙磨蹭），松键自然滑停
        const acc = Math.min(1, 12 * dt);
        this.player.vx = (this.player.vx || 0) + (vx1 - (this.player.vx || 0)) * acc;
        this.player.vy = (this.player.vy || 0) + (vy1 - (this.player.vy || 0)) * acc;
        let nx1 = this.player.x + this.player.vx * dt;
        let ny1 = this.player.y;
        if (nx1 > 20 && nx1 < this.worldWidth - 20 && !this.checkCollision(nx1, ny1, 10, this.player.isZombie)) this.player.x = nx1;
        else this.player.vx = 0;
        nx1 = this.player.x; ny1 = this.player.y + this.player.vy * dt;
        if (ny1 > 30 && ny1 < this.worldHeight - 10 && !this.checkCollision(nx1, ny1, 10, this.player.isZombie)) this.player.y = ny1;
        else this.player.vy = 0;

        // P2 Movement - 【SOC防冲突】
        if (this.player2 && !this.player2.dead) {
            // v4.0.16：P2 建造菜单打开时同样停止移动；祝福时亦停步
            const p2MenuBusy = this.kmenus[2].active || !!this.blessing || this._zombieFrozen(); // v4.0.30：观察期禁移动
            let vx2 = 0, vy2 = 0;
            let moveSpeed2 = this.player2.speedBuffT > 0 ? 800 : 400;
            const p2PhysRoom = this._insideRoom(Math.floor(this.player2.x/this.gridSize), Math.floor(this.player2.y/this.gridSize));
            if (p2PhysRoom) moveSpeed2 = baseSpeed / this.timeScale;
            else moveSpeed2 = baseSpeed * 1.5 / this.timeScale; // v4.0.22：走廊 1.5×

            const p2L = this.keys['arrowleft'] || this.keys['ArrowLeft'], p2R = this.keys['arrowright'] || this.keys['ArrowRight'], p2U = this.keys['arrowup'] || this.keys['ArrowUp'], p2D = this.keys['arrowdown'] || this.keys['ArrowDown'];
            if (!p2MenuBusy) {
                if (p2L && !p2R) vx2 -= moveSpeed2;
                if (p2R && !p2L) vx2 += moveSpeed2;
                if (p2U && !p2D) vy2 -= moveSpeed2;
                if (p2D && !p2U) vy2 += moveSpeed2;
            }

            // v4.0.22：P2 同样速度平滑
            const acc2 = Math.min(1, 12 * dt);
            this.player2.vx = (this.player2.vx || 0) + (vx2 - (this.player2.vx || 0)) * acc2;
            this.player2.vy = (this.player2.vy || 0) + (vy2 - (this.player2.vy || 0)) * acc2;
            let nx2 = this.player2.x + this.player2.vx * dt;
            let ny2 = this.player2.y;
            if (nx2 > 20 && nx2 < this.worldWidth - 20 && !this.checkCollision(nx2, ny2, 10, this.player2.isZombie)) this.player2.x = nx2;
            else this.player2.vx = 0;
            nx2 = this.player2.x; ny2 = this.player2.y + this.player2.vy * dt;
            if (ny2 > 30 && ny2 < this.worldHeight - 10 && !this.checkCollision(nx2, ny2, 10, this.player2.isZombie)) this.player2.y = ny2;
            else this.player2.vy = 0;
        }
        
        this._updateKMenus();
        this._updateBlessing(); // v4.0.19：祝福三选一（复用 _checkAnyKey，须在 keysJustPressed 清空前）
        this._updateMowers(dt); // v4.0.19：小推车触发与冲撞
        this._updateMowerPlacement(); // v4.0.30：随身推车走到自家门口自动放置
        this._updateZombieFreeze(dt); // v4.0.30：僵尸玩家开局 10 秒观察期倒计时
        this._updateGarlicGuard(dt); // v4.0.33：大蒜守卫——坚果墙过半血自动飞去臭晕僵尸
        this._updateDmgBoard(); // v4.0.17：实时伤害榜（内部自带节流）
        this.keysJustPressed = {}; // 清空单帧按键缓存

        // 人机开局自动寻路（按路点走到床位，避免穿模穿墙）
        for (const ai of this.ais) {
            if (ai.dead) continue;
            
            // 发现僵尸逻辑（v4.0.33：原只检测 zombies[0] 一只——其他僵尸贴脸也发现不了，AI 会撞进僵尸群里）
            let zombieNear = false;
            let zbTarget = this.isZombieFaction ? this.player : null;
            if (!this.isZombieFaction) {
                let bestD = Infinity;
                for (const z of this.zombies) {
                    if (z.dead) continue;
                    const d = Math.hypot(ai.x - z.x, ai.y - z.y);
                    if (d < bestD) { bestD = d; zbTarget = z; }
                }
            }
            if (zbTarget && !zbTarget.dead && Math.hypot(ai.x - zbTarget.x, ai.y - zbTarget.y) < 350) {
                zombieNear = true;
            }
            // v4.0.34：无房流浪 AI 遇僵尸 → 直接冲进房间避难（原「背向逃向地图边缘」会把 AI 赶到场地外卡死，永远进不了房）
            if (zombieNear && !ai.room && zbTarget && !zbTarget.dead) {
                const dToZb = Math.hypot(ai.x - zbTarget.x, ai.y - zbTarget.y);
                if (dToZb < 130) { // 贴脸才逃——半径太大会被玩家站着不动无限放风筝，永远进不了房
                    ai.fleeT = (ai.fleeT || 0) - dt;
                    if (ai.fleeT <= 0 || !ai.fleeing) {
                        ai.fleeT = 2; ai.fleeing = true;
                        // 逃进房间：优先自己分到的目标房，其次最近的可用空房（避开玩家所在/已认领的房）
                        const pPhysRoom = this._insideRoom(Math.floor(this.player.x / this.gridSize), Math.floor(this.player.y / this.gridSize));
                        const canEnter = (r) => r && r.owners.length < r.capacity &&
                            r !== this.player.room && r !== this.player.room2 && r !== pPhysRoom;
                        let refuge = canEnter(ai.targetRoom) ? ai.targetRoom : null;
                        if (!refuge) {
                            const cand = this.rooms.filter(r => canEnter(r) &&
                                Math.hypot((r.doorCol * 80 + 40) - zbTarget.x, (r.doorRow * 80 + 40) - zbTarget.y) > 200);
                            cand.sort((a, b) =>
                                Math.hypot((a.doorCol * 80 + 40) - ai.x, (a.doorRow * 80 + 40) - ai.y) -
                                Math.hypot((b.doorCol * 80 + 40) - ai.x, (b.doorRow * 80 + 40) - ai.y));
                            if (cand.length > 0) refuge = cand[0];
                        }
                        if (refuge) {
                            ai.targetRoom = refuge;
                            const p2 = this._findPath(ai.x, ai.y, refuge.frontX, refuge.frontY);
                            if (p2 && p2.length > 0) {
                                p2.push({ x: (refuge.x + refuge.tpl.beds[0].c) * this.gridSize + 40, y: (refuge.y + refuge.tpl.beds[0].r) * this.gridSize + 40 });
                                ai.path = p2; ai.speed = 300;
                            }
                        } else {
                            // 无房可逃的兜底：背向僵尸撤到安全点（保留 v4.0.31b 行为）
                            const nx = ai.x + (ai.x - zbTarget.x) / (dToZb || 1) * 400;
                            const ny = ai.y + (ai.y - zbTarget.y) / (dToZb || 1) * 400;
                            const p2 = this._findPath(ai.x, ai.y,
                                Math.max(80, Math.min(this.worldWidth - 80, nx)),
                                Math.max(80, Math.min(this.worldHeight - 80, ny)));
                            if (p2 && p2.length > 0) { ai.path = p2; ai.speed = 300; }
                        }
                    }
                } else if (dToZb > 320) {
                    ai.fleeing = false; ai.speed = 200; // 已安全，恢复常速
                }
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
                    const safeDrops = this.airdrops.filter(d => !zbTarget || zbTarget.dead || Math.hypot(d.x - zbTarget.x, d.y - zbTarget.y) > 280);
                    if (safeDrops.length > 0) {
                        const drop = safeDrops[Math.floor(Math.random() * safeDrops.length)];
                        ai.targetDrop = drop;
                        ai.path = this._findPath(ai.x, ai.y, drop.x, drop.y) || ai.path; // v4.0.16：寻路失败不穿墙
                        if (Math.random() < 0.5) this._say(ai, "发育好了！去抢盲盒！");
                    }
                }
                // 如果盲盒消失了，或者碰到僵尸靠近，立刻放弃目标回家！
                if (ai.targetDrop && ai.path && ai.path.length > 0) {
                    if (!this.airdrops.includes(ai.targetDrop) || zombieNear) {
                        if (zombieNear) this._say(ai, "僵尸来了，快撤！放弃盲盒保命！", 2500);
                        ai.targetDrop = null;
                        if (ai.room) {
                            const p = this._findPath(ai.x, ai.y, ai.room.frontX, ai.room.frontY);
                            if (p) {
                                p.push({ x: (ai.room.x + ai.room.tpl.beds[0].c) * 80 + 40, y: (ai.room.y + ai.room.tpl.beds[0].r) * 80 + 40 });
                                ai.path = p;
                            }
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
                    
                    let candidateRooms = this.rooms.filter(r => {
                        if (r === oldRoom) return false;
                        const hasDoor = this.getPlantAt(r.doorCol*80, r.doorRow*80);
                        if (r.owners.length >= r.capacity && !hasDoor) return false; // 不去没门且被占的死胡同
                        return true;
                    });
                    // v4.0.31：优先逃向门口 250px 内没有僵尸玩家的房间（不再往枪口上撞）
                    if (this.isZombieFaction && this.player && !this.player.dead) {
                        const safeRooms = candidateRooms.filter(r =>
                            Math.hypot((r.doorCol * 80 + 40) - this.player.x, (r.doorRow * 80 + 40) - this.player.y) > 250);
                        if (safeRooms.length > 0) candidateRooms = safeRooms;
                    }
                    if (candidateRooms.length > 0) {
                        ai.targetRoom = candidateRooms[Math.floor(Math.random() * candidateRooms.length)];
                        const p = this._findPath(ai.x, ai.y, ai.targetRoom.frontX, ai.targetRoom.frontY);
                        ai.speed = 300; // 极速逃生
                        if (p) {
                            p.push({ x: (ai.targetRoom.x + ai.targetRoom.tpl.beds[0].c) * this.gridSize + 40, y: (ai.targetRoom.y + ai.targetRoom.tpl.beds[0].r) * this.gridSize + 40 });
                            ai.path = p;
                        }
                    }
                }
            }

            // v4.0.16：寻路失败重试——没路时原地等待，每 2 秒重试一次（绝不直线穿墙）
            if ((!ai.path || ai.path.length === 0) && ai.targetRoom && !ai.room) {
                ai.repathT = (ai.repathT || 0) + dt;
                if (ai.repathT > 2) {
                    ai.repathT = 0;
                    const rp = this._findPath(ai.x, ai.y, ai.targetRoom.frontX, ai.targetRoom.frontY);
                    if (rp) {
                        rp.push({ x: (ai.targetRoom.x + ai.targetRoom.tpl.beds[0].c) * this.gridSize + 40, y: (ai.targetRoom.y + ai.targetRoom.tpl.beds[0].r) * this.gridSize + 40 });
                        ai.path = rp;
                    }
                }
            }

            if (ai.path && ai.path.length > 0) {
                // 获取玩家当前物理所在的房间
                const playerCol = Math.floor(this.player.x / this.gridSize);
                const playerRow = Math.floor(this.player.y / this.gridSize);
                const playerPhysicalRoom = this._insideRoom(playerCol, playerRow);
                // v4.0.23：P2 物理所在房间同样保护——玩家先进去的房间，AI 不许进来宣誓主权
                const p2PhysicalRoom = (this.player2 && !this.player2.dead)
                    ? this._insideRoom(Math.floor(this.player2.x / this.gridSize), Math.floor(this.player2.y / this.gridSize)) : null;

                // 房间被占用的条件：满员、玩家已认领（主房/副房）、或玩家正站在里面（哪怕还没建造认领）
                // v4.0.23：原判定漏掉「玩家物理在房间内但尚未建造认领」——AI 会走进玩家先到的房间抢注，
                // 玩家再建造就弹「别人的地盘！」（用户实报：我第一个进房间，提示却是别人的）
                const isTaken = (rm) => rm.owners.length >= rm.capacity || rm === this.player.room ||
                                       rm === this.player.room2 || rm === playerPhysicalRoom || rm === p2PhysicalRoom;

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
                        // v4.0.49：寻路失败返回 null 时跳过（原代码 null.push 直接抛错中断整帧 AI 更新——
                        // 新多样化布局下门朝向更多，AI 临时换房路径偶发不可达的几率上升，必须有保护）
                        if (!p) continue;
                        p.push({ x: (ai.targetRoom.x + ai.targetRoom.tpl.beds[0].c) * this.gridSize + 40, y: (ai.targetRoom.y + ai.targetRoom.tpl.beds[0].r) * this.gridSize + 40 });
                        ai.path = p;
                        continue;
                    }
                }

                const target = ai.path[0];
                const dx = target.x - ai.x;
                const dy = target.y - ai.y;
                const dist = Math.hypot(dx, dy);
                // v4.0.34：原「180 内丢路点蹲避」会被僵尸玩家站在旁边无限卡死在场地外——
                // 改为加速冲向房间（路点本来通向房内床边，房间就是避难所，进去才算安全）
                if (dist > 5 && zbTarget && !zbTarget.dead && !ai.room && !isFleeing &&
                    Math.hypot(ai.x - zbTarget.x, ai.y - zbTarget.y) < 180) {
                    ai.speed = 300;
                } else if (dist > 5) {
                    const spd = ai.speed || 200; // v4.0.34：速度字段真正生效（原硬编码 200，「极速逃生」从未加速）
                    ai.x += (dx / dist) * spd * dt;
                    ai.y += (dy / dist) * spd * dt;
                } else {
                    ai.path.shift(); // 抵达当前路点，切下一个
                    // 彻底抵达床位，宣誓主权
                    if (ai.path.length === 0 && ai.targetRoom) {
                        // v4.0.23：玩家的主房/副房/物理所在房间一律不可认领
                        const rmBlockedByPlayer = ai.targetRoom === this.player.room || ai.targetRoom === this.player.room2 ||
                                                  ai.targetRoom === playerPhysicalRoom || ai.targetRoom === p2PhysicalRoom;
                        if (ai.targetRoom.owners.length < ai.targetRoom.capacity && !rmBlockedByPlayer) {
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
                                if (rm.owners.length < rm.capacity && rm !== this.player.room && rm !== this.player.room2 &&
                                    rm !== playerPhysicalRoom && rm !== p2PhysicalRoom) {
                                    ai.targetRoom = rm;
                                    const p = this._findPath(ai.x, ai.y, rm.frontX, rm.frontY);
                                    if (!p) continue; // v4.0.68：寻路失败跳过换房（多样化布局下门朝多向，偶发不可达会 null.push 崩溃整帧）
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

        // v4.0.39：走进空房自动认领——「只要一走进房屋就可以产阳光」；旧版靠浇水产sun开局，浇水不再产sun后需此入口破死局
        for (const p of this.allPlayers) {
            if (p.isAi || p.dead) continue;
            if (p === this.player && (this.playerAngelic || this.playerTraitor)) continue; // v4.0.44：天使没有房间；内鬼也不再认领
            const rmHere = this._insideRoom(Math.floor(p.x / 80), Math.floor(p.y / 80));
            if (rmHere && rmHere.owners && rmHere.owners.length < (rmHere.capacity || 1) && !rmHere.owners.includes(p)) {
                if (this._claimRoom(p, rmHere)) {
                    this._flyText(p.x, p.y - 30, '🏠 占领了这间房！床铺植物开始为你产出', '#9dff6b');
                }
            }
        }
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
        this._updateMines(dt);
        this._updatePotatoMines(dt); // v4.0.53：土豆地雷（30s 引信+威慑）
        this._updatePumpkin(dt); // v4.0.53：南瓜壳每秒回门板血
        this._updateSquash(dt); // v4.0.53：倭瓜技能冷却刷新
        this._updateTorch(dt); // v4.0.53：火炬树桩光环（命中产阳光）
        this._updateTargetMarks(dt); // v4.0.53：僵尸盯上红框印记
        
        // 僵尸阵营玩家啃咬逻辑（v4.0.44：内鬼玩家同享——挠门/咬幸存者/中心回血）
        if ((this.isZombieFaction || this.playerTraitor) && !this.player.dead) {
            // 每 2.4s 啃食身边的植物（优先啃门）
            this.player.biteT = (this.player.biteT || 0) + dt;
            if (this.player.biteT >= 2.4) {
                let bitten = false;
                // 搜索身边的植物（优先啃门）
                for (const p of this.plants) {
                    if (p.def.ground) continue;
                    const px = p.c * 80 + 40, py = p.r * 80 + 40;
                    if (Math.hypot(this.player.x - px, this.player.y - py) < 80) { // 判定范围
                        // v4.0.60：内鬼堕落值——每层伤害 +25%（封顶 6 层 +150%）
                        const corMul = 1 + 0.25 * Math.min(6, this.playerCorrupt || 0);
                        // v4.0.77：盲盒「尸怒啃咬」伤害翻倍（dmgMulT>0 时 ×2）
                        const biteDmg = Math.round((140 + 75 * (this.player.level - 1)) * (this.player.speedBuffT > 0 ? 1.6 : 1.0) * corMul * (this.player.dmgMulT > 0 ? 2 : 1));
                        // v4.0.53：未就绪的土豆地雷被啃——不爆炸，直接被砍掉
                        if (p.def.potatoMine && (p._pArming === undefined || p._pArming > 0)) {
                            this.playSfx('chomp.mp3', 0.25);
                            this._flyText(px, py - 20, '🥔 土豆雷被砍掉了！', '#ff8a8a');
                            p.el1.remove();
                            if (p.txtEl) p.txtEl.remove();
                            this.plants = this.plants.filter(pl => pl !== p);
                            bitten = true;
                            break;
                        }
                        // v4.0.53：大蒜护甲——金蒜坚果啃 4 口、蒜味高坚果啃 10 口才啃掉
                        let armorBlocked = false;
                        if (p.def.biteArmor) {
                            if (p._armor === undefined) p._armor = p.def.biteArmor;
                            if (p._armor > 0) {
                                p._armor--;
                                armorBlocked = true;
                                this.playSfx('chomp.mp3', 0.25);
                                this._flyText(px, py - 20, `🛡 大蒜护甲 (剩${p._armor}口)`, '#ffd54a');
                            }
                        }
                        if (!armorBlocked) {
                            p.hp -= biteDmg;
                            this.playSfx('chomp.mp3', 0.25);
                            this._flyText(px, py - 20, `-${biteDmg}`, '#ff5252');
                        }
                        if (p.def.isGarlic) {
                            this._say(this.player, "呸！好臭的大蒜！");
                            this._flyText(this.player.x, this.player.y - 20, '🤢 刺鼻驱离！', '#9dff6b');
                            this.player.stunT = 2.0;
                            if (p.def.iceGarlic) this.player.slowT = 3.0; // v4.0.53：冰蒜卫士——啃后减速
                            const pushDirX = Math.sign(this.player.x - px) || 1;
                            const pushDirY = Math.sign(this.player.y - py) || 1;
                            const nx = this.player.x + pushDirX * 60;
                            const ny = this.player.y + pushDirY * 60;
                            if (!this.checkCollision(nx, this.player.y, 10, true)) this.player.x = nx;
                            if (!this.checkCollision(this.player.x, ny, 10, true)) this.player.y = ny;
                        } else if (!armorBlocked && Math.random() < 0.1) {
                            this._say(this.player, ["太美味了！", "门像纸一样脆！", "我要吃光你们！"][Math.floor(Math.random()*3)]);
                        }
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
                            // v4.0.60：内鬼堕落值成长——拆掉一株植物（含门板）
                            if (this.playerTraitor) this._gainCorrupt();
                        }
                        break; // 每次只啃一个
                    }
                }
                if (bitten) this.player.biteT = 0;
            }
            
            // 僵尸自动回血（v4.0.49：随圆圈上移到最上排中心回血台）
            const scP = this._spawnCenterPx();
            if (Math.hypot(this.player.x - scP.x, this.player.y - scP.y) < 120) {
                this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.maxHp * 0.25 * dt);
                this.setHp(); // 实时同步顶部血条
                this.player.el1.style.filter = 'drop-shadow(0 0 10px #0f0)';
            } else {
                this.player.el1.style.filter = '';
            }
            
            // 玩家僵尸时间升级逻辑（v4.0.75：僵尸链仅 2 阶——5 分钟进化机甲僵王；v4.0.44：内鬼不升僵尸形态——保持植物外观与转化时血量）
            if (!this.playerTraitor) {
            const activeSeconds = this.gameTime / 1000;
            let targetLevel = 1;
            const timeLevels = [
                { s: 300, lv: 2 }
            ];
            for (const step of timeLevels) {
                if (activeSeconds >= step.s) targetLevel = step.lv;
            }
            targetLevel = Math.min(HauntedDorm.GHOST_MAX_LV, targetLevel + (this.kills || 0));
            if (this.player.level < targetLevel && this.player.level < HauntedDorm.GHOST_MAX_LV) {
                this.player.level = targetLevel;
                this.ghostLevel = this.player.level; // 同步给AI升级判断
                const cfg = HauntedDorm.GHOST_LEVELS[this.player.level - 1];
                this.player.maxHp = cfg.hp * HauntedDorm.PLAYER_HP_MUL; // v4.0.36：升级同步 ×3
                this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.maxHp * 0.4); // 升级奖励回血（40% 最大血）
                this.setHp();
                const im = this.player.el1.querySelector('img');
                if (im) im.src = 'assets/images/' + cfg.img;
                const bdg = this.player.el1.querySelector('.lv-badge');
                if (bdg) bdg.innerText = 'Lv.' + this.player.level;
                this._announce(`👻 你已进化为【${cfg.name}】！`, 'finalwave.mp3', true);
            }
            } // v4.0.44：end !playerTraitor（内鬼不走僵尸升级链）
            
            // v4.0.31：接触幸存者改为按血量啃咬——AI 有血量能扛（不再一碰到就死），隔门免疫保留
            // 开局前 5 秒无敌保护，防止一出生人机就被吃掉
            const victims = [...this.ais, ...(this.player2 ? [this.player2] : [])];
            for (const v of victims) {
                if (!v.dead && this.gameTime > 5000 && Math.hypot(v.x - this.player.x, v.y - this.player.y) < 50) {
                    // 如果中间隔着门（幸存者在房间里且门活着，僵尸在外面），则免疫接触伤害
                    const vRm = this._insideRoom(Math.floor(v.x / 80), Math.floor(v.y / 80));
                    let safeBehindDoor = false;
                    if (vRm) {
                        const doorPlant = this.getPlantAt(vRm.doorCol * 80, vRm.doorRow * 80);
                        const zRm = this._insideRoom(Math.floor(this.player.x / 80), Math.floor(this.player.y / 80));
                        if (doorPlant && zRm !== vRm) safeBehindDoor = true;
                    }
                    if (!safeBehindDoor) {
                        v.biteT = (v.biteT || 0) + dt;
                        if (v.biteT >= 1.5) {
                            v.biteT = 0;
                            const dmg = Math.round((80 + 40 * ((this.playerTraitor ? this.ghostLevel : this.player.level) - 1)) * (this.player.speedBuffT > 0 ? 1.6 : 1.0) * (1 + 0.25 * Math.min(6, this.playerCorrupt || 0))); // v4.0.60：内鬼堕落值伤害加成
                            v.hp -= dmg;
                            v.fleeing = true; v.fleeT = 0; // v4.0.31b：被咬立即刷新逃离目标
                            if (v.hpBg) { v.hpBg.style.display = 'block'; v.hpFg.style.width = Math.max(0, v.hp / v.maxHp * 100) + '%'; }
                            this._flyText(v.x, v.y - 26, '-' + dmg + ' 😈', '#ff5252');
                            this.playSfx('chomp.mp3', 0.4);
                            if (v.hp <= 0 && !v.dead) {
                                this.kills++;
                                this._announce('🩸 击杀了一名幸存者！', 'finalwave.mp3');
                                // v4.0.60：内鬼堕落值成长——咬杀一名幸存者
                                if (this.playerTraitor) this._gainCorrupt();
                                this._checkPlayerDown(v);
                                // v4.0.65：植物方全灭（人机 + 植物形态 P1/P2）才算僵尸/内鬼胜利——
                                // 旧判定 victims.every（只含人机+P2、且 P2 无论阵营都算）会漏判/误判；统一走 _plantSideAlive
                                if (this._plantSideAlive() === 0) {
                                    this._announce('😈 所有植物方成员已被肃清——邪恶胜利！', 'evillaugh.mp3', true);
                                    this.gameOver(true); // 僵尸赢了
                                }
                            }
                        }
                    }
                } else if (!v.dead && v.biteT) {
                    v.biteT = 0; // 离开接触范围重置咬合计时
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
                    // v4.0.77：盲盒空投必须避开所有存活玩家（≥220px）——否则刷在玩家脚下会被站着不动自动捡到，
                    // 触发 buff 后玩家误以为"大招自己放了"
                    const dropX = c * this.gridSize + 40, dropY = r * this.gridSize + 40;
                    if (this.allPlayers.some(p => !p.dead && Math.hypot(p.x - dropX, p.y - dropY) < 220)) continue;
                    rx = dropX;
                    ry = dropY;
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
                        if (!p) { pickedByAI.path = null; pickedByAI.targetDrop = null; } // v4.0.68：寻路失败不崩溃，原地等下次重试
                        else {
                            p.push({ x: (pickedByAI.room.x + pickedByAI.room.tpl.beds[0].c) * 80 + 40, y: (pickedByAI.room.y + pickedByAI.room.tpl.beds[0].r) * 80 + 40 });
                            pickedByAI.path = p;
                            pickedByAI.targetDrop = null;
                        }
                    }
                    continue;
                }

                let pickedByPlayer = null;
                if (Math.hypot(this.player.x - a.x, this.player.y - a.y) < 50) pickedByPlayer = this.player;
                else if (this.gameMode === '2p' && this.player2 && !this.player2.dead && Math.hypot(this.player2.x - a.x, this.player2.y - a.y) < 50) pickedByPlayer = this.player2;

                if (pickedByPlayer) {
                    if (pickedByPlayer.isZombie) {
                        // v4.0.77：盲盒补给不再触发「疾走狂暴/狂暴冲刺冷却清零」——这两项让玩家误以为大招自己放了
                        // （技能只能由 M 键手动释放）。改为纯补给：尸怒啃咬 / 尸毒愈合 / 钢化之躯 / 腐肉盛宴。
                        const zr = Math.floor(Math.random() * 4);
                        if (zr === 0) {
                            pickedByPlayer.dmgMulT = 15; // 啃咬伤害翻倍 15s（不影响技能/移速）
                            this._flyText(a.x, a.y, '💢 尸怒啃咬 (伤害翻倍15s)', '#ff5252');
                        } else if (zr === 1) {
                            pickedByPlayer.hp = Math.min(pickedByPlayer.maxHp, pickedByPlayer.hp + pickedByPlayer.maxHp * 0.4);
                            this._flyText(a.x, a.y, '💉 尸毒愈合 (+40%最大生命)', '#0f0');
                        } else if (zr === 2) {
                            pickedByPlayer.invincibleT = 10;
                            this._flyText(a.x, a.y, '🛡 钢化之躯 (10s无敌免疫弹幕)', '#fff');
                        } else {
                            pickedByPlayer.hp = Math.min(pickedByPlayer.maxHp, pickedByPlayer.hp + pickedByPlayer.maxHp * 0.6);
                            this._flyText(a.x, a.y, '🍖 腐肉盛宴 (+60%最大生命)', '#ffd54a');
                        }
                        this.playSfx('evillaugh.mp3', 0.5);
                        a.el.remove();
                        this.airdrops.splice(i, 1);
                        continue;
                    }
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
                        case 5: {
                            const targets = this._getHostileTargets().filter(z => !z.dead);
                            if (targets.length > 0) {
                                for (const z of targets) {
                                    const dmg = Math.max(1, Math.round(z.maxHp * 0.1));
                                    z.hp -= dmg;
                                    if (z.hpBg) z.hpBg.style.display = 'block';
                                    if (z.hp <= 0) this._killZombie(z, pickedByPlayer);
                                }
                                this._flyText(a.x, a.y, '💣 全屏核爆 (-10%全体敌人血量)', '#ff5252');
                            } else {
                                this.addSun(500, pickedByPlayer);
                                this._flyText(a.x, a.y, '☀️ 阳光替代 (+500)', '#ffeb3b');
                            }
                            break;
                        }
                        case 6: {
                            const targets = this._getHostileTargets().filter(z => !z.dead);
                            if (targets.length > 0) {
                                for (const z of targets) z.stunT = 10;
                                this._flyText(a.x, a.y, '❄️ 绝对零度 (全体冻结10s)', '#7fd8ff');
                            } else {
                                this.addSun(500, pickedByPlayer);
                                this._flyText(a.x, a.y, '☀️ 阳光替代 (+500)', '#ffeb3b');
                            }
                            break;
                        }
                        case 7:
                            pickedByPlayer.stealthT = 20;
                            this._flyText(a.x, a.y, '👻 隐身斗篷 (20s无视你)', '#aaa');
                            break;
                        case 8:
                            pickedByPlayer.hp -= 10;
                            this.addSun(1500, pickedByPlayer);
                            this.setHp();
                            this._flyText(a.x, a.y, '💰 恶魔交易 (-10血, +1500阳光)', '#ffeb3b');
                            this._checkPlayerDown(pickedByPlayer);
                            break;
                        case 9:
                            if (this.zombies[0] && !this.zombies[0].dead && this.ghostLevel > 1) {
                                this.ghostLevel--;
                                const zb = this.zombies[0];
                                const cfg = HauntedDorm.GHOST_LEVELS[this.ghostLevel - 1];
                                zb.level = this.ghostLevel;
                                zb.maxHp = cfg.hp;
                                zb.hp = Math.min(zb.hp, cfg.hp);
                                zb.speed = cfg.speed;
                                zb.cfg = cfg;
                                const im = zb.el1.querySelector('img');
                                if (im) im.src = 'assets/images/' + cfg.img;
                                const bdg = zb.el1.querySelector('.lv-badge');
                                if (bdg) bdg.innerText = 'Lv.' + this.ghostLevel;
                                this._updateGhostChip();
                                this._flyText(a.x, a.y, `📉 僵尸降级 (Lv.${this.ghostLevel})`, '#ff5252');
                            } else {
                                this.addSun(500, pickedByPlayer);
                                this._flyText(a.x, a.y, '☀️ 阳光替代 (+500)', '#ffeb3b');
                            }
                            break;
                        case 10:
                            for (const pl of this.plants) {
                                if (pl.c >= pickedByPlayer.x/80 - 10 && pl.c <= pickedByPlayer.x/80 + 10) {
                                    pl.hp = pl.def.hp || pl.maxHp || pl.hp;
                                }
                            }
                            this._flyText(a.x, a.y, '🍄 圣光洗礼 (植物全回血)', '#0f0');
                            break;
                        case 11:
                            let sc = Math.floor(pickedByPlayer.x/80), sr = Math.floor(pickedByPlayer.y/80);
                            const inMyRm = this._insideRoom(sc, sr) && (pickedByPlayer.room === this._insideRoom(sc, sr) || pickedByPlayer.room2 === this._insideRoom(sc, sr));
                            if (!inMyRm) {
                                const myRm = pickedByPlayer.room || pickedByPlayer.room2;
                                if (myRm) {
                                    for (let r = myRm.y; r < myRm.y + myRm.h; r++) {
                                        for (let c = myRm.x; c < myRm.x + myRm.w; c++) {
                                            if (myRm.tpl.grid[r - myRm.y][c - myRm.x] === 1 && !this.plants.some(x => x.c === c && x.r === r)) {
                                                sc = c; sr = r; break;
                                            }
                                        }
                                        if (sc !== Math.floor(pickedByPlayer.x/80)) break;
                                    }
                                }
                            }
                            if (this._insideRoom(sc, sr) && !this.plants.some(x => x.c === sc && x.r === sr)) {
                                this.spawnPlant(sc, sr, 'doomshroom', false, pickedByPlayer);
                                this._flyText(a.x, a.y, '🎁 意外之喜 (白给毁灭重炮)', '#ff00ff');
                            } else {
                                this.addSpore(200, pickedByPlayer);
                                this._flyText(a.x, a.y, '🎁 意外之喜 (+200🦠)', '#ff00ff');
                            }
                            break;
                        case 12:
                            pickedByPlayer.hp -= 30;
                            this.setHp();
                            this._flyText(a.x, a.y, '☠️ 倒霉透顶 (-30血)', '#ff0000');
                            this._checkPlayerDown(pickedByPlayer);
                            break;
                        case 13:
                            for(const pl of this.plants) { if(pl.shootCd !== undefined) pl.shootCd = 0; }
                            this._flyText(a.x, a.y, '⏱️ 时光倒流 (全图植物冷却清零)', '#00ffff');
                            break;
                        case 14: {
                            const targets = this.zombies.filter(z => !z.dead);
                            if (targets.length > 0) {
                                for (const zb of targets) {
                                    zb.speed *= 1.5;
                                    zb.hp = zb.maxHp;
                                }
                                this._flyText(a.x, a.y, '🧟 僵尸狂暴 (全体僵尸满血且移速暴增)', '#ff0000');
                            } else {
                                this.addSun(500, pickedByPlayer);
                                this._flyText(a.x, a.y, '☀️ 阳光替代 (+500)', '#ffeb3b');
                            }
                            break;
                        }
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

            // 眩晕（眩晕菇/冰冻）：停住不动、不咬人
            if (zb.stunT > 0) {
                zb.stunT -= dt;
                if (zb.capturedT > 0) { // v4.0.44：天使捕获锁——定身期内不可被撤退逻辑清掉眩晕（不挠门不回血）
                    zb.capturedT -= dt;
                    zb.stunT = Math.max(zb.stunT, zb.capturedT);
                }
                if (zb.iceFxT > 0) { zb.iceFxT -= dt; if (zb.iceFxT <= 0) this._applyFrozenFx(zb, false); } // v4.0.39：冰冻特效倒计时
                if (zb.el1) { zb.el1.style.left = zb.x + 'px'; zb.el1.style.top = zb.y + 'px'; }
                continue;
            }
            if (zb._iceBadge) this._applyFrozenFx(zb, false); // 眩晕提前结束（如被打破）→ 立刻解除冰冻外观
            if (zb.slowT > 0) zb.slowT -= dt;
            // 根据用户要求，撤退时不再使用 1000 冲刺速度，而是保持普通走路速度
            // v4.0.20：夜晚僵尸提速 15%、白天迟缓 10%（昼夜节奏）
            const dnMul = (!this.isZombieFaction && !this.over) ? (this.isNight ? 1.15 : 0.9) : 1;
            const spd = (zb.retreating ? zb.speed : (zb.speed * (zb.slowT > 0 ? 0.5 : 1))) * dnMul;

            // 找综合仇恨值最高的目标（距离、门血量、门等级综合判断）
            zb.targetEvalT = (zb.targetEvalT || 0) + dt;
            let closestTarget = zb.lockedTarget;
            
            // 每 8 秒或者当前目标死亡，强制重新评估全场最弱的人
            if (this.traitorRevealed && zb.lockedTarget === this.traitor) zb.lockedTarget = null; // v4.0.20：僵尸不咬内鬼（自己人）
            if (!closestTarget || closestTarget.dead || zb.targetEvalT > 8) {
                zb.targetEvalT = 0;
                let minScore = Infinity;
                let weakestTarget = null;
                for (const p of this.allPlayers) {
                    if (p.hp <= 0 || p.dead) continue;
                    if (this.traitorRevealed && p === this.traitor) continue; // v4.0.20：内鬼是僵尸方的
                    if (this.playerTraitor && p === this.player) continue; // v4.0.44：玩家内鬼=僵尸方
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
                    // v4.0.53：门口（门格或门旁地刺格）有土豆地雷时，僵尸有 50% 几率避开该目标（威慑）
                    if (rm && doorHpScore > 0) {
                        const hasMineNear = this.plants.some(gp => gp.def.potatoMine &&
                            Math.max(Math.abs(gp.c - rm.doorCol), Math.abs(gp.r - rm.doorRow)) <= 1);
                        if (hasMineNear && Math.random() < 0.5) {
                            score += 30000; // 大幅拉低优先级，转而寻找其他目标
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
            // v4.0.61：僵尸阵营指挥——被指挥的小怪/僵王优先锁定令旗目标（G 键），其余行为不变
            if (this.isZombieFaction && this.commandTarget && !this.commandTarget.dead && (zb.isMinion || zb.isBoss) &&
                closestTarget !== this.commandTarget) {
                zb.lockedTarget = this.commandTarget;
                closestTarget = this.commandTarget;
                zb.targetSwitched = true;
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

            // v4.0.33：被大蒜臭晕恐吓——20 秒内不回此目标，直接走开去别处
            if (zb.garlicScareT > 0) {
                zb.garlicScareT -= dt;
                const scP = this._spawnCenterPx(); // v4.0.49：回城点随圆圈上移到最上排中心
                targetX = scP.x;
                targetY = scP.y;
            }
            // v4.0.49：大嘴花怒吼赶跑——10 秒内逃往别处/回血台，不攻击不回血（优先级高于撤退回城）
            if (zb.chomperScareT > 0) {
                zb.chomperScareT -= dt;
                zb.retreating = false;
                zb.isHealing = false;
                if (zb.chomperScareT <= 0) {
                    zb.targetSwitched = true; // 时间到 → 重新评估目标返回进攻
                } else if (zb.scareX != null) {
                    targetX = zb.scareX;
                    targetY = zb.scareY;
                }
            }
            // 残血回城逻辑（仅主幽灵僵尸逃跑回血，尸潮小怪与僵王机甲决死进攻不逃跑）
            if (!zb.isMinion && !zb.isBoss && zb.hp < zb.maxHp * 0.3) zb.retreating = true;
            if (zb.hp >= zb.maxHp) zb.retreating = false;
            if (zb.isMinion || zb.isBoss) zb.retreating = false;
            
            if (zb.retreating) {
                zb.slowT = 0; // 逃跑时免疫减速
                zb.stunT = 0; // 逃跑时免疫眩晕
                const scP = this._spawnCenterPx(); // v4.0.49：回城点随圆圈上移到最上排中心
                targetX = scP.x;
                targetY = scP.y;
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
                zb.path = this._findPath(zb.x, zb.y, targetX, targetY, false); // 僵尸：门板视为障碍（引到门前啃）
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
                if (atkPlant && !atkPlant.def.ground && !zb.retreating && !(zb.garlicScareT > 0)) { // v4.0.33：被大蒜臭吓的僵尸径直走开不啃食
                    // 站定慢啃：每 2.4s 一口，一口一口咬
                    zb.biteT = (zb.biteT || 0) + dt;
                    if (zb.biteT >= BITE_CD) {
                        zb.biteT = 0;
                        const curBiteDmg = zb.isBoss ? biteDmg * 3.5 : biteDmg;
                        // v4.0.53：未就绪的土豆地雷被啃——不爆炸，直接被砍掉
                        if (atkPlant.def.potatoMine && (atkPlant._pArming === undefined || atkPlant._pArming > 0)) {
                            this.playSfx('chomp.mp3', 0.25);
                            this._flyText(atkPlant.c * 80 + 40, atkPlant.r * 80, '🥔 土豆雷被砍掉了！', '#ff8a8a');
                            atkPlant.el1.remove();
                            if (atkPlant.txtEl) atkPlant.txtEl.remove();
                            this.plants = this.plants.filter(p => p !== atkPlant);
                            moved = false;
                            continue;
                        }
                        // v4.0.53：大蒜护甲——金蒜坚果啃 4 口、蒜味高坚果啃 10 口才啃掉
                        let armorBlocked = false;
                        if (atkPlant.def.biteArmor) {
                            if (atkPlant._armor === undefined) atkPlant._armor = atkPlant.def.biteArmor;
                            if (atkPlant._armor > 0) {
                                atkPlant._armor--;
                                armorBlocked = true;
                                this.playSfx('chomp.mp3', 0.25);
                                this._flyText(atkPlant.c * 80 + 40, atkPlant.r * 80 - 20, `🛡 大蒜护甲 (剩${atkPlant._armor}口)`, '#ffd54a');
                            }
                        }
                        if (!armorBlocked) {
                            atkPlant.hp -= curBiteDmg;
                            this.playSfx('chomp.mp3', 0.25);
                        }
                        if (atkPlant.def.isGarlic) {
                            this._say(zb, "呸！好臭的大蒜！");
                            this._flyText(zb.x, zb.y - 20, '🤢 刺鼻驱离！', '#9dff6b');
                            zb.stunT = 2.0;
                            if (atkPlant.def.iceGarlic) zb.slowT = 3.0; // v4.0.53：冰蒜卫士——啃后减速
                            zb.lockedTarget = null;
                            zb.path = null;
                            const pushX = zb.x - dx * 70;
                            const pushY = zb.y - dy * 70;
                            if (!this.checkCollision(pushX, zb.y, 15, true)) zb.x = pushX;
                            if (!this.checkCollision(zb.x, pushY, 15, true)) zb.y = pushY;
                        } else if (!armorBlocked && Math.random() < 0.05) {
                            this._say(zb, ["这门真硬！", "看我咬碎它！", "饿饿饿饿饿！", "别以为躲在里面就安全！"][Math.floor(Math.random()*4)]);
                        }
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
                if (this.traitorRevealed && p === this.traitor) continue; // v4.0.20：僵尸不咬内鬼
                if (this.playerTraitor && p === this.player) continue; // v4.0.44：僵尸不咬玩家内鬼
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
                        const curTouchDps = zb.isBoss ? touchDps * 3.5 : touchDps;
                        if (p === this.player) {
                            if (!this.player.invincibleT || this.player.invincibleT <= 0) {
                                playerHurt += curTouchDps * dt;
                            }
                        } else {
                            if (!p.invincibleT || p.invincibleT <= 0) {
                                p.hp -= curTouchDps * dt;
                                this.setHp(); // 更新P2血条UI
                                if (p === this.player2) this.flashDamage();
                                if (p.hp <= 0 && !p.dead) {
                                    this._checkPlayerDown(p);
                                }
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
            if (zb.el1) { zb.el1.style.left = zb.x + 'px'; zb.el1.style.top = zb.y + 'px'; }
        }
        this.zombies = this.zombies.filter(z => !z.dead || (z.el1 && z.el1.parentNode)); // 清理已完成动画的死尸

        // 警告系统更新（全实体与双人覆盖：任意未撤退敌对单位锁定 P1 或 P2 均触发危险红光）
        let isTargeted = false;
        if (!this.isZombieFaction) {
            const hostiles = this._getHostileTargets().filter(z => !z.dead && !z.retreating);
            for (const zb of hostiles) {
                if ((zb.lockedTarget === this.player && !this.player.dead) ||
                    (this.gameMode === '2p' && this.player2 && !this.player2.dead && zb.lockedTarget === this.player2)) {
                    isTargeted = true;
                    break;
                }
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
                this._checkP1Down(); // v4.0.23：P2 还活着就不结算
                return; 
            }
        }

        this.player.el1.style.left = this.player.x + 'px';
        this.player.el1.style.top = this.player.y + 'px';
    }

    destroy() {
        this._destroyed = true;
        this.over = true;
        if (this._gameOverTimer) {
            clearTimeout(this._gameOverTimer);
            this._gameOverTimer = null;
        }
        if (this._animId) {
            cancelAnimationFrame(this._animId);
            this._animId = null;
        }
        if (this._onKeyDown) window.removeEventListener('keydown', this._onKeyDown);
        if (this._onKeyUp) window.removeEventListener('keyup', this._onKeyUp);
        if (this._onBlur) window.removeEventListener('blur', this._onBlur);
        if (this.plantMenu && this._onPlantMenuClick) {
            this.plantMenu.removeEventListener('click', this._onPlantMenuClick);
        }
        if (this.vp1 && this._onVp1MouseDown) {
            this.vp1.removeEventListener('mousedown', this._onVp1MouseDown);
        }
        this._closePopup();
        this._closePlantMenu();
        // v4.0.35：退出时还原 P1 HUD 出厂结构（防僵尸局的控制行/属性行残留到同页下一局）
        const hudP1El = document.getElementById('hud-p1');
        if (hudP1El && window._dormP1HudTpl) hudP1El.innerHTML = window._dormP1HudTpl;
        this.keys = {};
        this.keysJustPressed = {};
        if (this.world1) this.world1.innerHTML = '';
        document.getElementById('wave-announce')?.remove();
        document.getElementById('bless-board')?.remove();
        document.getElementById('zombie-warning')?.remove();
        document.getElementById('pulse-style')?.remove();
        if (this.dnTint) { this.dnTint.remove(); this.dnTint = null; }
    }

}

window.HauntedDorm = HauntedDorm;

// v4.0.26：守屋大作战并入主站——index.html 内嵌为 #dorm-screen 界面（选完皮肤原页启动，不再跳独立网页）。
// 主站通过 window.startHauntedDorm(opts) 显式开局；旧独立页 haunted-dorm.html（直链/书签/历史验证脚本兼容）保持自动开局不变。
window.startHauntedDorm = function (opts = {}) {
    window._lastDormOpts = opts;
    if (window.game && typeof window.game.destroy === 'function') {
        window.game.destroy();
    }
    window.game = new HauntedDorm(opts);
    return window.game;
};

window.retryDormGame = function () {
    const overEl = document.getElementById('dorm-over');
    if (overEl) overEl.style.display = 'none';
    if (typeof window.startHauntedDorm === 'function') {
        window.startHauntedDorm(window._lastDormOpts || {});
    } else {
        location.reload();
    }
};

window.exitDormGame = function () {
    const overEl = document.getElementById('dorm-over');
    if (overEl) overEl.style.display = 'none';
    if (window.game && typeof window.game.destroy === 'function') {
        window.game.destroy();
    }
    const dormScreen = document.getElementById('dorm-screen');
    const startMenu = document.getElementById('start-menu') || document.getElementById('start-screen');
    // v4.0.57：返回首页必须同时关掉守屋的选择弹窗层（阵营/模式/皮肤），否则用户还要一层层点返回
    ['dorm-faction-modal', 'dorm-mode-modal', 'dorm-role-modal'].forEach(id => {
        const m = document.getElementById(id);
        if (m) m.style.display = 'none';
    });
    if (dormScreen && startMenu) {
        dormScreen.style.display = 'none';
        startMenu.style.display = 'block';
        return;
    }
    location.href = 'index.html';
};

if (/haunted-dorm\.html$/.test(window.location.pathname)) {
    window.addEventListener('load', () => { window.startHauntedDorm(); });
}
