import re

with open('pvz-web/js/HauntedDorm.js', 'r') as f:
    content = f.read()

# 1. Update GHOST_LEVELS HP
old_ghost_levels = """    static GHOST_LEVELS = [
        { name: '普通僵尸', hp: 300, speed: 45 },
        { name: '路障僵尸', hp: 800, speed: 48 },
        { name: '铁桶僵尸', hp: 1600, speed: 50 },
        { name: '橄榄球僵尸', hp: 2800, speed: 53 },
        { name: '铁门僵尸', hp: 4800, speed: 55 },
        { name: '冰车僵尸', hp: 8000, speed: 58 },
        { name: '扶梯僵尸', hp: 13000, speed: 60 },
        { name: '投石车僵尸', hp: 22000, speed: 62 },
        { name: '伽刚特尔', hp: 40000, speed: 65 },
        { name: '僵王博士', hp: 100000, speed: 68 }
    ];"""

new_ghost_levels = """    static GHOST_LEVELS = [
        { name: '普通僵尸', hp: 1000, speed: 45 },
        { name: '路障僵尸', hp: 2500, speed: 48 },
        { name: '铁桶僵尸', hp: 5000, speed: 50 },
        { name: '橄榄球僵尸', hp: 9000, speed: 53 },
        { name: '铁门僵尸', hp: 15000, speed: 55 },
        { name: '冰车僵尸', hp: 25000, speed: 58 },
        { name: '扶梯僵尸', hp: 40000, speed: 60 },
        { name: '投石车僵尸', hp: 60000, speed: 62 },
        { name: '伽刚特尔', hp: 90000, speed: 65 },
        { name: '僵王博士', hp: 150000, speed: 68 }
    ];"""
content = content.replace(old_ghost_levels, new_ghost_levels)

# 2. Update MENU to remove wallnut and set initial prices
old_menu = """    static MENU = ['sunshroom', 'peashooter', 'wallnut', 'puffshroom', 'potatomine', 'cherrybomb', 'iceshroom', 'jalapeno', 'doomshroom'];"""
new_menu = """    static MENU = ['sunshroom', 'peashooter', 'puffshroom', 'potatomine', 'cherrybomb', 'iceshroom', 'jalapeno', 'doomshroom'];"""
content = content.replace(old_menu, new_menu)

# 3. Update DEFS for Sunshroom chain, Pea chain, Wallnut chain
old_sun_defs = """            // —— 阳光系 (10级) ——
            sunshroom:     { name: '阳光菇',     img: 'Plants/SunShroom/0.gif',     card: 'SunShroom.png',     hp: 300,  cost: 0,   scale: 0.75,
                             produce: { sun: 2, every: 8 },  up: { cost: 25, cur: 'sun', to: 'sunshroom2' } },
            sunshroom2:    { name: '大阳光菇',   img: 'Plants/SunShroom/0.gif',     hp: 350,  cost: 0,   scale: 1.1,
                             produce: { sun: 3, every: 8 },  up: { cost: 75, cur: 'sun', to: 'sunflower' } },
            sunflower:     { name: '向日葵',     img: 'Plants/SunFlower/0.gif',     hp: 400,  cost: 0,   scale: 1.1,
                             produce: { sun: 5, every: 7 },  up: { cost: 200, cur: 'sun', to: 'twinsunflower' } },
            twinsunflower: { name: '双子向日葵', img: 'Plants/TwinSunflower/0.gif', hp: 450,  cost: 0,   scale: 1.2,
                             produce: { sun: 10, every: 7 }, up: { cost: 400, cur: 'sun', to: 'sunpea' } },
            sunpea:        { name: '豌豆向日葵', img: 'Plants/TwinSunflower/0.gif', hp: 550, cost: 0, scale: 1.2,
                             overlay: 'Plants/Peashooter/0.gif',
                             produce: { sun: 15, every: 6 }, shoot: { dmg: 20, cd: 1.5, n: 1, range: 320, img: 'Plants/PB00.gif' }, 
                             up: { cost: 800, cur: 'sun', to: 'sunnut' } },
            sunnut:        { name: '坚果向日葵', img: 'Plants/WallNut/0.gif', hp: 2000, cost: 0, scale: 1.2, 
                             overlay: 'Plants/TwinSunflower/0.gif',
                             produce: { sun: 20, every: 5 }, shoot: { dmg: 20, cd: 1.5, n: 1, range: 320, img: 'Plants/PB00.gif' }, 
                             up: { cost: 1600, cur: 'sun', to: 'suncherry' } },
            suncherry:     { name: '樱桃向日葵', img: 'Plants/TwinSunflower/0.gif', hp: 3000, cost: 0, scale: 1.3,
                             overlay: 'Plants/CherryBomb/0.gif',
                             produce: { sun: 30, every: 4 }, shoot: { dmg: 40, cd: 1.0, n: 3, range: 400, img: 'Plants/PB00.gif', back: true },
                             up: { cost: 3200, cur: 'sun', to: 'sunjala' } },
            sunjala:       { name: '火爆向日葵', img: 'Plants/TwinSunflower/0.gif', hp: 5000, cost: 0, scale: 1.4,
                             overlay: 'Plants/Jalapeno/0.gif',
                             produce: { sun: 60, every: 3 }, shoot: { dmg: 50, cd: 0.8, n: 4, range: 500, img: 'Plants/PB00.gif', homing: true },
                             up: { cost: 6000, cur: 'sun', to: 'sundoom' } },
            sundoom:       { name: '毁灭向日葵', img: 'Plants/TwinSunflower/0.gif', hp: 8000, cost: 0, scale: 1.5, tint: 'hue-rotate(240deg)',
                             overlay: 'Plants/DoomShroom/0.gif',
                             produce: { sun: 150, every: 3 }, shoot: { dmg: 70, cd: 0.6, n: 6, range: 600, img: 'Plants/PB00.gif', homing: true, aoe: 50 },
                             up: { cost: 12000, cur: 'sun', to: 'sungatling' } },
            sungatling:    { name: '机枪向日葵', img: 'Plants/TwinSunflower/0.gif', hp: 15000, cost: 0, scale: 1.6,
                             overlay: 'Plants/GatlingPea/0.gif',
                             produce: { sun: 400, every: 2 }, shoot: { dmg: 100, cd: 0.4, n: 8, range: 800, img: 'Plants/PB00.gif', homing: true } },

            // —— 蘑菇系 (10级，喂养大) ——"""

new_sun_defs = """            // —— 阳光系 (10级) ——
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

            // —— 蘑菇系 (10级，喂养大) ——"""

pattern1 = re.compile(r"            // —— 阳光系 \(10级\) ——.*?            // —— 蘑菇系 \(10级，喂养大\) ——", re.DOTALL)
content = pattern1.sub(new_sun_defs, content)

old_pea_defs = """            // —— 攻击系 (10级，升门提供战力输出) ——
            peashooter:    { name: '豌豆射手',   img: 'Plants/Peashooter/0.gif',    card: 'Peashooter.png',    hp: 300,  cost: 0, 
                             shoot: { dmg: 20, cd: 1.5, n: 1, range: 300, img: 'Plants/PB00.gif' }, up: { cost: 50, cur: 'sun', to: 'repeater' } },
            repeater:      { name: '双发射手',   img: 'Plants/Repeater/0.gif',      hp: 400,  cost: 0, 
                             shoot: { dmg: 20, cd: 1.5, n: 2, range: 320, img: 'Plants/PB00.gif' }, up: { cost: 100, cur: 'sun', to: 'threepeater' } },
            threepeater:   { name: '三线射手',   img: 'Plants/Threepeater/0.gif',   hp: 500,  cost: 0, 
                             shoot: { dmg: 20, cd: 1.5, n: 3, range: 350, img: 'Plants/PB00.gif' }, up: { cost: 200, cur: 'sun', to: 'splitpea' } },
            splitpea:      { name: '分裂射手',   img: 'Plants/SplitPea/0.gif',      hp: 600,  cost: 0, 
                             shoot: { dmg: 20, cd: 1.5, n: 3, range: 350, img: 'Plants/PB00.gif', back: true }, up: { cost: 400, cur: 'sun', to: 'gatlingpea' } },
            gatlingpea:    { name: '机枪射手',   img: 'Plants/GatlingPea/0.gif',    hp: 800,  cost: 0, 
                             shoot: { dmg: 20, cd: 1.5, n: 4, range: 400, img: 'Plants/PB00.gif', back: true }, up: { cost: 800, cur: 'sun', to: 'snowpea' } },
            snowpea:       { name: '寒冰射手',   img: 'Plants/SnowPea/0.gif',       hp: 1000, cost: 0, 
                             shoot: { dmg: 25, cd: 1.4, n: 4, range: 420, img: 'Plants/PB-10.gif', back: true, slow: true }, up: { cost: 1600, cur: 'sun', to: 'firepea' } },
            firepea:       { name: '烈火豌豆',   img: 'Plants/Peashooter/0.gif',    hp: 1500, cost: 0, tint: 'hue-rotate(-40deg) brightness(1.2)',
                             shoot: { dmg: 40, cd: 1.2, n: 4, range: 450, img: 'Plants/PB00.gif', back: true, homing: true }, up: { cost: 3200, cur: 'sun', to: 'firerepeater' } },
            firerepeater:  { name: '烈火双发',   img: 'Plants/Repeater/0.gif',      hp: 2000, cost: 0, tint: 'hue-rotate(-40deg) brightness(1.2)',
                             shoot: { dmg: 45, cd: 1.0, n: 5, range: 500, img: 'Plants/PB00.gif', back: true, homing: true }, up: { cost: 6400, cur: 'sun', to: 'firethreepeater' } },
            firethreepeater:{name: '烈火三线',   img: 'Plants/Threepeater/0.gif',   hp: 3000, cost: 0, tint: 'hue-rotate(-40deg) brightness(1.2)',
                             shoot: { dmg: 50, cd: 0.8, n: 6, range: 550, img: 'Plants/PB00.gif', back: true, homing: true, aoe: 30 }, up: { cost: 12800, cur: 'sun', to: 'snowthreepeater' } },
            snowthreepeater:{name: '寒冰三线',   img: 'Plants/Threepeater/0.gif',   hp: 5000, cost: 0, tint: 'hue-rotate(180deg) brightness(1.5)',
                             shoot: { dmg: 60, cd: 0.6, n: 8, range: 600, img: 'Plants/PB-10.gif', back: true, homing: true, aoe: 40, slow: true } },

            // —— 门系 (10级，充当玩家房门护盾，顺带极强辅助火力) ——
            wallnut:       { name: '坚果门板',   img: 'Plants/WallNut/0.gif',       card: 'WallNut.png',       hp: 2000, cost: 0,   isDoor: true, 
                             up: { cost: 50, cur: 'sun', to: 'nutshooter' } },
            nutshooter:    { name: '坚果射手',   img: 'Plants/WallNut/0.gif',       hp: 4000, cost: 0,   isDoor: true, overlay: 'Plants/Peashooter/0.gif',
                             shoot: { dmg: 20, cd: 1.5, n: 1, range: 300, img: 'Plants/PB00.gif' }, up: { cost: 100, cur: 'sun', to: 'nutgunner' } },
            nutgunner:     { name: '坚果机枪',   img: 'Plants/WallNut/0.gif',       hp: 6000, cost: 0,   isDoor: true, overlay: 'Plants/GatlingPea/0.gif',
                             shoot: { dmg: 20, cd: 1.5, n: 4, range: 350, img: 'Plants/PB00.gif' }, up: { cost: 200, cur: 'sun', to: 'cabbagenut' } },
            cabbagenut:    { name: '卷心菜坚果', img: 'Plants/WallNut/0.gif',       hp: 10000, cost: 0,  isDoor: true, overlay: 'Plants/Cabbagepult/0.gif',
                             shoot: { dmg: 40, cd: 1.5, n: 4, range: 400, img: 'Plants/Cabbagepult/Proj.gif', homing: true }, up: { cost: 400, cur: 'sun', to: 'melonnut' } },
            melonnut:      { name: '西瓜坚果',   img: 'Plants/WallNut/0.gif',       hp: 15000, cost: 0,  isDoor: true, overlay: 'Plants/Melonpult/0.gif',
                             shoot: { dmg: 80, cd: 1.5, n: 4, range: 450, img: 'Plants/Melonpult/Proj.gif', homing: true, aoe: 50 }, up: { cost: 800, cur: 'sun', to: 'wintermelonnut' } },
            wintermelonnut:{ name: '冰瓜坚果',   img: 'Plants/WallNut/0.gif',       hp: 25000, cost: 0,  isDoor: true, overlay: 'Plants/WinterMelon/0.gif',
                             shoot: { dmg: 80, cd: 1.5, n: 4, range: 500, img: 'Plants/WinterMelon/Proj.gif', homing: true, aoe: 50, slow: true }, up: { cost: 1600, cur: 'sun', to: 'tallnut' } },
            tallnut:       { name: '高坚果',     img: 'Plants/TallNut/0.gif',       hp: 40000, cost: 0,  isDoor: true, scale: 1.2,
                             shoot: { dmg: 100, cd: 1.2, n: 5, range: 550, img: 'Plants/WinterMelon/Proj.gif', homing: true, aoe: 50, slow: true }, up: { cost: 3200, cur: 'sun', to: 'pumpkin' } },
            pumpkin:       { name: '南瓜高坚果', img: 'Plants/TallNut/0.gif',       hp: 70000, cost: 0,  isDoor: true, scale: 1.3, overlay: 'Plants/PumpkinHead/0.gif',
                             shoot: { dmg: 120, cd: 1.0, n: 6, range: 600, img: 'Plants/WinterMelon/Proj.gif', homing: true, aoe: 60, slow: true }, up: { cost: 6400, cur: 'sun', to: 'doomtallnut' } },
            doomtallnut:   { name: '毁灭高坚果', img: 'Plants/TallNut/0.gif',       hp: 120000, cost: 0, isDoor: true, scale: 1.4, overlay: ['Plants/PumpkinHead/0.gif', 'Plants/DoomShroom/0.gif'], tint: 'hue-rotate(240deg)',
                             shoot: { dmg: 150, cd: 0.8, n: 7, range: 650, img: 'Plants/WinterMelon/Proj.gif', homing: true, aoe: 70, slow: true }, up: { cost: 12800, cur: 'sun', to: 'holotallnut' } },
            holotallnut:   { name: '全息高坚果', img: 'Plants/TallNut/0.gif',       hp: 200000, cost: 0, isDoor: true, scale: 1.5, overlay: 'Plants/PumpkinHead/0.gif', tint: 'hue-rotate(180deg) brightness(1.5)',
                             shoot: { dmg: 200, cd: 0.5, n: 8, range: 700, img: 'Plants/WinterMelon/Proj.gif', homing: true, aoe: 80, slow: true } },

            // —— 一次性系 (无需升级，即插即用) ——"""

new_pea_defs = """            // —— 攻击系 (10级，升门提供战力输出) ——
            peashooter:    { name: '豌豆射手',   img: 'Plants/Peashooter/0.gif',    card: 'Peashooter.png',    hp: 300,  cost: 10, 
                             shoot: { dmg: 20, cd: 1.5, n: 1, range: 300, img: 'Plants/PB00.gif' }, up: { cost: 20, cur: 'sun', to: 'repeater' } },
            repeater:      { name: '双发射手',   img: 'Plants/Repeater/0.gif',      hp: 400,  cost: 0, 
                             shoot: { dmg: 20, cd: 1.5, n: 2, range: 320, img: 'Plants/PB00.gif' }, up: { cost: 40, cur: 'sun', to: 'threepeater' } },
            threepeater:   { name: '三线射手',   img: 'Plants/Threepeater/0.gif',   hp: 500,  cost: 0, 
                             shoot: { dmg: 20, cd: 1.5, n: 3, range: 350, img: 'Plants/PB00.gif' }, up: { cost: 80, cur: 'sun', to: 'splitpea' } },
            splitpea:      { name: '分裂射手',   img: 'Plants/SplitPea/0.gif',      hp: 600,  cost: 0, 
                             shoot: { dmg: 20, cd: 1.5, n: 3, range: 350, img: 'Plants/PB00.gif', back: true }, up: { cost: 160, cur: 'sun', to: 'gatlingpea' } },
            gatlingpea:    { name: '机枪射手',   img: 'Plants/GatlingPea/0.gif',    hp: 800,  cost: 0, 
                             shoot: { dmg: 20, cd: 1.5, n: 4, range: 400, img: 'Plants/PB00.gif', back: true }, up: { cost: 320, cur: 'sun', to: 'snowpea' } },
            snowpea:       { name: '寒冰射手',   img: 'Plants/SnowPea/0.gif',       hp: 1000, cost: 0, 
                             shoot: { dmg: 25, cd: 1.4, n: 4, range: 420, img: 'Plants/PB-10.gif', back: true, slow: true }, up: { cost: 640, cur: 'sun', to: 'firepea' } },
            firepea:       { name: '烈火豌豆',   img: 'Plants/Peashooter/0.gif',    hp: 1500, cost: 0, tint: 'hue-rotate(-40deg) brightness(1.2)',
                             shoot: { dmg: 40, cd: 1.2, n: 4, range: 450, img: 'Plants/PB00.gif', back: true, homing: true }, up: { cost: 1280, cur: 'sun', to: 'firerepeater' } },
            firerepeater:  { name: '烈火双发',   img: 'Plants/Repeater/0.gif',      hp: 2000, cost: 0, tint: 'hue-rotate(-40deg) brightness(1.2)',
                             shoot: { dmg: 45, cd: 1.0, n: 5, range: 500, img: 'Plants/PB00.gif', back: true, homing: true }, up: { cost: 2560, cur: 'sun', to: 'firethreepeater' } },
            firethreepeater:{name: '烈火三线',   img: 'Plants/Threepeater/0.gif',   hp: 3000, cost: 0, tint: 'hue-rotate(-40deg) brightness(1.2)',
                             shoot: { dmg: 50, cd: 0.8, n: 6, range: 550, img: 'Plants/PB00.gif', back: true, homing: true, aoe: 30 }, up: { cost: 5120, cur: 'sun', to: 'snowthreepeater' } },
            snowthreepeater:{name: '寒冰三线',   img: 'Plants/Threepeater/0.gif',   hp: 5000, cost: 0, tint: 'hue-rotate(180deg) brightness(1.5)',
                             shoot: { dmg: 60, cd: 0.6, n: 8, range: 600, img: 'Plants/PB-10.gif', back: true, homing: true, aoe: 40, slow: true } },

            // —— 门系 (10级，充当玩家房门护盾，顺带极强辅助火力) ——
            wallnut:       { name: '坚果门板',   img: 'Plants/WallNut/0.gif',       card: 'WallNut.png',       hp: 2000, cost: 0,   isDoor: true, 
                             up: { cost: 50, cur: 'sun', to: 'nutshooter' } },
            nutshooter:    { name: '坚果射手',   img: 'Plants/WallNut/0.gif',       hp: 4000, cost: 0,   isDoor: true, overlay: 'Plants/Peashooter/0.gif',
                             shoot: { dmg: 20, cd: 1.5, n: 1, range: 300, img: 'Plants/PB00.gif' }, up: { cost: 100, cur: 'sun', to: 'nutgunner' } },
            nutgunner:     { name: '坚果机枪',   img: 'Plants/WallNut/0.gif',       hp: 6000, cost: 0,   isDoor: true, overlay: 'Plants/GatlingPea/0.gif',
                             shoot: { dmg: 20, cd: 1.5, n: 4, range: 350, img: 'Plants/PB00.gif' }, up: { cost: 200, cur: 'sun', to: 'cabbagenut' } },
            cabbagenut:    { name: '卷心菜坚果', img: 'Plants/WallNut/0.gif',       hp: 10000, cost: 0,  isDoor: true, overlay: 'Plants/Cabbagepult/0.gif',
                             shoot: { dmg: 40, cd: 1.5, n: 4, range: 400, img: 'Plants/Cabbagepult/Proj.gif', homing: true }, up: { cost: 400, cur: 'sun', to: 'melonnut' } },
            melonnut:      { name: '西瓜坚果',   img: 'Plants/WallNut/0.gif',       hp: 15000, cost: 0,  isDoor: true, overlay: 'Plants/Melonpult/0.gif',
                             shoot: { dmg: 80, cd: 1.5, n: 4, range: 450, img: 'Plants/Melonpult/Proj.gif', homing: true, aoe: 50 }, up: { cost: 800, cur: 'sun', to: 'wintermelonnut' } },
            wintermelonnut:{ name: '冰瓜坚果',   img: 'Plants/WallNut/0.gif',       hp: 25000, cost: 0,  isDoor: true, overlay: 'Plants/WinterMelon/0.gif',
                             shoot: { dmg: 80, cd: 1.5, n: 4, range: 500, img: 'Plants/WinterMelon/Proj.gif', homing: true, aoe: 50, slow: true }, up: { cost: 1600, cur: 'sun', to: 'tallnut' } },
            tallnut:       { name: '高坚果',     img: 'Plants/TallNut/0.gif',       hp: 40000, cost: 0,  isDoor: true, scale: 1.2,
                             shoot: { dmg: 100, cd: 1.2, n: 5, range: 550, img: 'Plants/WinterMelon/Proj.gif', homing: true, aoe: 50, slow: true }, up: { cost: 0, sporeCost: 5, cur: 'sun', to: 'pumpkin' } },
            pumpkin:       { name: '南瓜高坚果', img: 'Plants/TallNut/0.gif',       hp: 70000, cost: 0,  isDoor: true, scale: 1.3, overlay: 'Plants/PumpkinHead/0.gif',
                             shoot: { dmg: 120, cd: 1.0, n: 6, range: 600, img: 'Plants/WinterMelon/Proj.gif', homing: true, aoe: 60, slow: true }, up: { cost: 0, sporeCost: 25, cur: 'sun', to: 'doomtallnut' } },
            doomtallnut:   { name: '毁灭高坚果', img: 'Plants/TallNut/0.gif',       hp: 120000, cost: 0, isDoor: true, scale: 1.4, overlay: ['Plants/PumpkinHead/0.gif', 'Plants/DoomShroom/0.gif'], tint: 'hue-rotate(240deg)',
                             shoot: { dmg: 150, cd: 0.8, n: 7, range: 650, img: 'Plants/WinterMelon/Proj.gif', homing: true, aoe: 70, slow: true }, up: { cost: 0, sporeCost: 125, cur: 'sun', to: 'holotallnut' } },
            holotallnut:   { name: '全息高坚果', img: 'Plants/TallNut/0.gif',       hp: 200000, cost: 0, isDoor: true, scale: 1.5, overlay: 'Plants/PumpkinHead/0.gif', tint: 'hue-rotate(180deg) brightness(1.5)',
                             shoot: { dmg: 200, cd: 0.5, n: 8, range: 700, img: 'Plants/WinterMelon/Proj.gif', homing: true, aoe: 80, slow: true } },

            // —— 一次性系 (无需升级，即插即用) ——"""
pattern2 = re.compile(r"            // —— 攻击系 \(10级，升门提供战力输出\) ——.*?            // —— 一次性系 \(无需升级，即插即用\) ——", re.DOTALL)
content = pattern2.sub(new_pea_defs, content)

# 4. Spore logic in PP (Plant Popup)
old_pp_up = """        if (def.up) {
            this.ppUp.style.display = 'block';
            this.ppUp.innerText = `升级 (${def.up.cost} 阳光)`;
            this.ppUp.className = 'pp-btn' + (this.player.sun >= def.up.cost ? '' : ' pp-disabled');
            this.ppUp.onclick = () => {
                if (this.player.sun >= def.up.cost) {
                    this.addSun(-def.up.cost);"""
new_pp_up = """        if (def.up) {
            this.ppUp.style.display = 'block';
            let cstr = [];
            if (def.up.cost) cstr.push(`${def.up.cost}阳光`);
            if (def.up.sporeCost) cstr.push(`${def.up.sporeCost}包子`);
            this.ppUp.innerText = `升级 (${cstr.join('+')})`;
            const canAfford = (def.up.cost ? this.player.sun >= def.up.cost : true) && (def.up.sporeCost ? this.player.spore >= def.up.sporeCost : true);
            this.ppUp.className = 'pp-btn' + (canAfford ? '' : ' pp-disabled');
            this.ppUp.onclick = () => {
                if (canAfford) {
                    if (def.up.cost) this.addSun(-def.up.cost);
                    if (def.up.sporeCost) this.addSpore(-def.up.sporeCost);"""
content = content.replace(old_pp_up, new_pp_up)

# 5. Zombie target logic & Game Over logic
# When zombie attacks a plant, check if it's player's sunshroom. If so, GAME OVER.
old_zombie_eat = """                        atkPlant.hp -= biteDmg;
                        this._flashEntity(atkPlant.el, 'red');
                        this.playSfx('zombie_bite.mp3', 0.25);
                        
                        // 门板升降级（僵尸啃门时每口直接判定并触发降级动画，而不是等到0才降）
                        if (atkPlant.def.isDoor) {
                            if (atkPlant.hp <= 0) {
                                // 门破了！
                                this.playSfx('WoodCrumble.mp3', 0.5);
                                atkPlant.el.remove();
                                this.plants.splice(this.plants.indexOf(atkPlant), 1);
                                this._levelUpGhostDirect(); // v3.94.5：只在门破时升级
                            } else {
                                this._checkDoorDowngrade(atkPlant);
                            }
                        } else {
                            if (atkPlant.hp <= 0) {
                                this.playSfx('gulp.mp3', 0.4);
                                atkPlant.el.remove();
                                this.plants.splice(this.plants.indexOf(atkPlant), 1);
                            }
                        }"""
new_zombie_eat = """                        atkPlant.hp -= biteDmg;
                        this._flashEntity(atkPlant.el, 'red');
                        this.playSfx('zombie_bite.mp3', 0.25);
                        
                        // 门板升降级（僵尸啃门时每口直接判定并触发降级动画，而不是等到0才降）
                        if (atkPlant.def.isDoor) {
                            if (atkPlant.hp <= 0) {
                                // 门破了！
                                this.playSfx('WoodCrumble.mp3', 0.5);
                                atkPlant.el.remove();
                                this.plants.splice(this.plants.indexOf(atkPlant), 1);
                                this._levelUpGhostDirect(); // v3.94.5：只在门破时升级
                            } else {
                                this._checkDoorDowngrade(atkPlant);
                            }
                        } else {
                            if (atkPlant.hp <= 0) {
                                this.playSfx('gulp.mp3', 0.4);
                                atkPlant.el.remove();
                                this.plants.splice(this.plants.indexOf(atkPlant), 1);
                                // 如果玩家的阳光菇被铲掉或吃掉，游戏结束
                                if (atkPlant.def.produce && atkPlant.def.produce.sun && this.player.room && atkPlant.c >= this.player.room.x && atkPlant.c < this.player.room.x + this.player.room.w && atkPlant.r >= this.player.room.y && atkPlant.r < this.player.room.y + this.player.room.h) {
                                    this.gameOver(false); // 玩家阳光菇被吃，直接失败
                                    return;
                                }
                            }
                        }"""
content = content.replace(old_zombie_eat, new_zombie_eat)

# Also check shovel game over
old_shovel = """        if (this.ppDemolish) {
            this.ppDemolish.onclick = () => {
                if (pl.def.isDoor) return; // 门不能拆
                pl.el.remove();
                this.plants.splice(this.plants.indexOf(pl), 1);
                this._closePopup();
            };
        }"""
new_shovel = """        if (this.ppDemolish) {
            this.ppDemolish.onclick = () => {
                if (pl.def.isDoor) return; // 门不能拆
                pl.el.remove();
                this.plants.splice(this.plants.indexOf(pl), 1);
                this._closePopup();
                if (pl.def.produce && pl.def.produce.sun && this.player.room && pl.c >= this.player.room.x && pl.c < this.player.room.x + this.player.room.w && pl.r >= this.player.room.y && pl.r < this.player.room.y + this.player.room.h) {
                    this.gameOver(false); // 玩家自己铲掉阳光菇，游戏结束
                }
            };
        }"""
content = content.replace(old_shovel, new_shovel)

# Change zombie target to player's sunshroom
old_zombie_target = """            // 追踪所有玩家（包含真人+人机）中距离最近的一个
            let closestTarget = null, minDist = Infinity;
            for (const p of this.allPlayers) {
                const dist = Math.hypot(zb.x - p.x, zb.y - p.y);
                if (dist < minDist) { minDist = dist; closestTarget = p; }
            }
            if (!closestTarget) closestTarget = this.player;

            let targetX = closestTarget.x;
            let targetY = closestTarget.y;"""
new_zombie_target = """            // 追踪所有玩家（包含真人+人机）中距离最近的一个
            let closestTarget = null, minDist = Infinity;
            for (const p of this.allPlayers) {
                const dist = Math.hypot(zb.x - p.x, zb.y - p.y);
                if (dist < minDist) { minDist = dist; closestTarget = p; }
            }
            if (!closestTarget) closestTarget = this.player;

            // 僵尸首要目标是玩家的【阳光菇】（而不是玩家本人）
            let targetX = closestTarget.x;
            let targetY = closestTarget.y;
            if (closestTarget.room) {
                const tr = closestTarget.room;
                // 找出该房间里产阳光的植物（阳光菇系列）
                const shroom = this.plants.find(pl => pl.c >= tr.x && pl.c < tr.x + tr.w && pl.r >= tr.y && pl.r < tr.y + tr.h && pl.def.produce && pl.def.produce.sun);
                if (shroom) {
                    targetX = shroom.c * 80 + 40;
                    targetY = shroom.r * 80 + 40;
                }
            }"""
content = content.replace(old_zombie_target, new_zombie_target)

with open('pvz-web/js/HauntedDorm.js', 'w') as f:
    f.write(content)
