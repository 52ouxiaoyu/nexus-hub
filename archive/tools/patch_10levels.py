import re

with open('pvz-web/js/HauntedDorm.js', 'r') as f:
    content = f.read()

# Replace DEFS
new_defs = """    static get DEFS() {
        return {
            // —— 阳光系 (10级) ——
            sunshroom:     { name: '阳光菇',     img: 'Plants/SunShroom/0.gif',     card: 'SunShroom.png',     hp: 300,  cost: 0,   scale: 0.75,
                             produce: { sun: 2, every: 8 },  up: { cost: 25, cur: 'sun', to: 'sunshroom2' } },
            sunshroom2:    { name: '大阳光菇',   img: 'Plants/SunShroom/0.gif',     hp: 350,  cost: 0,   scale: 1.1,
                             produce: { sun: 3, every: 8 },  up: { cost: 75, cur: 'sun', to: 'sunflower' } },
            sunflower:     { name: '向日葵',     img: 'Plants/SunFlower/0.gif',     hp: 400,  cost: 0,   scale: 1.1,
                             produce: { sun: 5, every: 7 },  up: { cost: 200, cur: 'sun', to: 'twinsunflower' } },
            twinsunflower: { name: '双子向日葵', img: 'Plants/TwinSunflower/0.gif', hp: 450,  cost: 0,   scale: 1.2,
                             produce: { sun: 10, every: 7 }, up: { cost: 400, cur: 'sun', to: 'sunpea' } },
            sunpea:        { name: '向日葵豌豆', img: 'Plants/TwinSunflower/0.gif', hp: 550, cost: 0, scale: 1.2,
                             overlay: 'Plants/Peashooter/0.gif',
                             produce: { sun: 15, every: 6 }, shoot: { dmg: 20, cd: 1.5, n: 1, range: 320, img: 'Plants/PB00.gif' }, 
                             up: { cost: 800, cur: 'sun', to: 'doompeaflower' } },
            doompeaflower: { name: '毁灭向日葵双向', img: 'Plants/TwinSunflower/0.gif', hp: 700, cost: 0, scale: 1.3, tint: 'hue-rotate(240deg)',
                             overlay: 'Plants/SplitPea/0.gif', hat: 'Plants/DoomShroom/0.gif',
                             produce: { sun: 20, every: 5 }, shoot: { dmg: 40, cd: 1.2, n: 2, range: 400, img: 'Plants/PB00.gif', back: true }, 
                             up: { cost: 1600, cur: 'sun', to: 'sunsplitnut' } },
            sunsplitnut:   { name: '向日葵双向坚果', img: 'Plants/WallNut/0.gif', hp: 6000, cost: 0, scale: 1.4,
                             overlay: 'Plants/TwinSunflower/0.gif', hat: 'Plants/SplitPea/0.gif',
                             produce: { sun: 30, every: 4 }, shoot: { dmg: 40, cd: 1.0, n: 3, range: 400, img: 'Plants/PB00.gif', back: true },
                             up: { cost: 3200, cur: 'sun', to: 'quadsunflower' } },
            quadsunflower: { name: '四头向日葵', img: 'Plants/TwinSunflower/0.gif', hp: 10000, cost: 0, scale: 1.6, tint: 'brightness(1.5)',
                             overlays: ['Plants/TwinSunflower/0.gif'],
                             produce: { sun: 60, every: 3 }, shoot: { dmg: 50, cd: 0.8, n: 4, range: 500, img: 'Plants/PB00.gif', homing: true },
                             up: { cost: 6000, cur: 'sun', to: 'octosunflower' } },
            octosunflower: { name: '八头向日葵', img: 'Plants/TwinSunflower/0.gif', hp: 15000, cost: 0, scale: 1.8, tint: 'saturate(2)',
                             overlays: ['Plants/TwinSunflower/0.gif', 'Plants/TwinSunflower/0.gif', 'Plants/TwinSunflower/0.gif'],
                             produce: { sun: 150, every: 3 }, shoot: { dmg: 70, cd: 0.6, n: 8, range: 600, img: 'Plants/PB00.gif', homing: true },
                             up: { cost: 12000, cur: 'sun', to: 'ultisunflower' } },
            ultisunflower: { name: '终极向日葵', img: 'Plants/TwinSunflower/0.gif', hp: 30000, cost: 0, scale: 2.2, tint: 'hue-rotate(90deg) brightness(2)',
                             overlays: ['Plants/TwinSunflower/0.gif', 'Plants/TwinSunflower/0.gif', 'Plants/TwinSunflower/0.gif', 'Plants/TwinSunflower/0.gif'],
                             produce: { sun: 400, every: 2 }, shoot: { dmg: 100, cd: 0.4, n: 16, range: 800, img: 'Plants/PB00.gif', homing: true } },

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
                             up: { cost: 1500, cur: 'sun', to: 'pumpkin' } },
            pumpkin:       { name: '南瓜高坚果', img: 'Plants/TallNut/0.gif',       hp: 50000, cost: 0, scale: 1.4, hat: 'Plants/PumpkinHead/0.gif',
                             up: { cost: 3000, cur: 'sun', to: 'doomtallnut' } },
            doomtallnut:   { name: '毁灭高坚果', img: 'Plants/TallNut/0.gif',       hp: 90000, cost: 0, scale: 1.5, hat: 'Plants/DoomShroom/0.gif', tint: 'hue-rotate(240deg)',
                             spike: { dps: 200, r: 80 }, up: { cost: 6000, cur: 'sun', to: 'holotallnut' } },
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
        return ['puffshroom', 'peashooter', 'wallnut', 'potatomine', 'spikeweed', 'iceshroom', 'doomshroom'];
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
    }"""

# Use regex to find and replace DEFS and GHOST_LEVELS block
pattern = re.compile(r"    static get DEFS\(\) \{.*?(?=    static get GHOST_MAX_LV)", re.DOTALL)
content = pattern.sub(new_defs + "\n", content)

with open('pvz-web/js/HauntedDorm.js', 'w') as f:
    f.write(content)
