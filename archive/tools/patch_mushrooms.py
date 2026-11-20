import re

with open('pvz-web/js/HauntedDorm.js', 'r') as f:
    content = f.read()

# Replace Mushroom Chain
new_mushroom = """            // —— 孢子系 (10级，纯产包子) ——
            puffshroom:    { name: '小喷菇', img: 'Plants/PuffShroom/0.gif',     card: 'PuffShroom.png',     hp: 300, cost: 0, scale: 0.9,
                             spore: { n: 1, every: 1.0 }, up: { cost: 50, cur: 'sun', to: 'sunpuff' } },
            sunpuff:       { name: '阳光喷菇', img: 'Plants/PuffShroom/0.gif',   hp: 400, cost: 0,   scale: 1.0, hat: 'Plants/SunShroom/0.gif',
                             spore: { n: 2, every: 1.0 }, up: { cost: 100, cur: 'sun', to: 'fumeshroom' } },
            fumeshroom:    { name: '大喷菇', img: 'Plants/FumeShroom/0.gif',     card: 'FumeShroom.png',     hp: 500, cost: 0,   scale: 1.1,
                             spore: { n: 4, every: 1.0 }, up: { cost: 200, cur: 'sun', to: 'gloomshroom' } },
            gloomshroom:   { name: '忧郁菇', img: 'Plants/GloomShroom/0.gif',    card: 'GloomShroom.png',    hp: 600, cost: 0,   scale: 1.2,
                             spore: { n: 8, every: 1.0 }, up: { cost: 400, cur: 'sun', to: 'hypnoshroom' } },
            hypnoshroom:   { name: '魅惑喷菇', img: 'Plants/HypnoShroom/0.gif', hp: 800, cost: 0, scale: 1.3,
                             spore: { n: 16, every: 1.0 }, up: { cost: 800, cur: 'sun', to: 'scaredyshroom' } },
            scaredyshroom: { name: '胆小喷菇', img: 'Plants/ScaredyShroom/0.gif', hp: 1200, cost: 0, scale: 1.35,
                             spore: { n: 32, every: 1.0 }, up: { cost: 1600, cur: 'sun', to: 'iceshroom_puff' } },
            iceshroom_puff:{ name: '冰霜喷菇', img: 'Plants/FumeShroom/0.gif', hp: 1800, cost: 0, scale: 1.4, hat: 'Plants/IceShroom/0.gif', tint: 'hue-rotate(180deg)',
                             spore: { n: 64, every: 1.0 }, up: { cost: 3200, cur: 'sun', to: 'doomshroom_puff' } },
            doomshroom_puff:{name: '毁灭喷菇', img: 'Plants/FumeShroom/0.gif', hp: 3000, cost: 0, scale: 1.5, hat: 'Plants/DoomShroom/0.gif', tint: 'hue-rotate(240deg)',
                             spore: { n: 128, every: 1.0 }, up: { cost: 6400, cur: 'sun', to: 'seashroom' } },
            seashroom:     { name: '海蘑菇', img: 'Plants/SeaShroom/0.gif', hp: 5000, cost: 0, scale: 1.6,
                             spore: { n: 256, every: 1.0 }, up: { cost: 12800, cur: 'sun', to: 'ultimategloom' } },
            ultimategloom: { name: '终极孢子', img: 'Plants/GloomShroom/0.gif', hp: 12000, cost: 0, scale: 2.0, tint: 'brightness(1.5) drop-shadow(0 0 10px #ff0)', hat: 'Plants/HypnoShroom/0.gif',
                             spore: { n: 512, every: 1.0 } },"""

pattern = re.compile(r"            // —— 蘑菇系 \(10级，喂养大\) ——.*?ultimategloom: \{ name: '终极魅惑菇'.*?\},", re.DOTALL)
content = pattern.sub(new_mushroom, content)

# Replace Sunshroom Chain
new_sun = """            // —— 阳光系 (10级) ——
            sunshroom:     { name: '阳光菇',     img: 'Plants/SunShroom/0.gif',     card: 'SunShroom.png',     hp: 300,  cost: 10,   scale: 0.75,
                             produce: { sun: 1, every: 0.5 },  up: { cost: 30, cur: 'sun', to: 'sunshroom2' } },
            sunshroom2:    { name: '大阳光菇',   img: 'Plants/SunShroom/0.gif',     hp: 350,  cost: 0,   scale: 1.1,
                             produce: { sun: 2, every: 0.5 },  up: { cost: 90, cur: 'sun', to: 'sunflower' } },
            sunflower:     { name: '向日葵',     img: 'Plants/SunFlower/0.gif',     hp: 400,  cost: 0,   scale: 1.1,
                             produce: { sun: 4, every: 0.5 },  up: { cost: 270, cur: 'sun', to: 'twinsunflower' } },
            twinsunflower: { name: '双子向日葵', img: 'Plants/TwinSunflower/0.gif', hp: 450,  cost: 0,   scale: 1.2,
                             produce: { sun: 8, every: 0.5 }, up: { cost: 810, sporeCost: 1, cur: 'sun', to: 'sunpea' } },
            sunpea:        { name: '豌豆向日葵', img: 'Plants/TwinSunflower/0.gif', hp: 550, cost: 0, scale: 1.2,
                             overlay: 'Plants/Peashooter/0.gif',
                             produce: { sun: 16, every: 0.5 }, shoot: { dmg: 20, cd: 1.5, n: 1, range: 320, img: 'Plants/PB00.gif' }, 
                             up: { cost: 2430, sporeCost: 10, cur: 'sun', to: 'sunnut' } },
            sunnut:        { name: '坚果向日葵', img: 'Plants/WallNut/0.gif', hp: 2000, cost: 0, scale: 1.2, 
                             overlay: 'Plants/TwinSunflower/0.gif',
                             produce: { sun: 32, every: 0.5 }, shoot: { dmg: 20, cd: 1.5, n: 1, range: 320, img: 'Plants/PB00.gif' }, 
                             up: { cost: 7290, sporeCost: 50, cur: 'sun', to: 'suncherry' } },
            suncherry:     { name: '樱桃向日葵', img: 'Plants/TwinSunflower/0.gif', hp: 3000, cost: 0, scale: 1.3,
                             overlay: 'Plants/CherryBomb/0.gif',
                             produce: { sun: 64, every: 0.5 }, shoot: { dmg: 40, cd: 1.0, n: 3, range: 400, img: 'Plants/PB00.gif', back: true },
                             up: { cost: 21870, sporeCost: 250, cur: 'sun', to: 'sunjala' } },
            sunjala:       { name: '火爆向日葵', img: 'Plants/TwinSunflower/0.gif', hp: 5000, cost: 0, scale: 1.4,
                             overlay: 'Plants/Jalapeno/0.gif',
                             produce: { sun: 128, every: 0.5 }, shoot: { dmg: 50, cd: 0.8, n: 4, range: 500, img: 'Plants/PB00.gif', homing: true },
                             up: { cost: 65610, sporeCost: 1000, cur: 'sun', to: 'sundoom' } },
            sundoom:       { name: '毁灭向日葵', img: 'Plants/TwinSunflower/0.gif', hp: 8000, cost: 0, scale: 1.5, tint: 'hue-rotate(240deg)',
                             overlay: 'Plants/DoomShroom/0.gif',
                             produce: { sun: 256, every: 0.5 }, shoot: { dmg: 70, cd: 0.6, n: 6, range: 600, img: 'Plants/PB00.gif', homing: true, aoe: 50 },
                             up: { cost: 196830, sporeCost: 5000, cur: 'sun', to: 'sungatling' } },
            sungatling:    { name: '机枪向日葵', img: 'Plants/TwinSunflower/0.gif', hp: 15000, cost: 0, scale: 1.6,
                             overlay: 'Plants/GatlingPea/0.gif',
                             produce: { sun: 512, every: 0.5 }, shoot: { dmg: 100, cd: 0.4, n: 8, range: 800, img: 'Plants/PB00.gif', homing: true } },"""
pattern_sun = re.compile(r"            // —— 阳光系 \(10级\) ——.*?sungatling:    \{ name: '机枪向日葵'.*?\},", re.DOTALL)
content = pattern_sun.sub(new_sun, content)


# Change Peashooter chain
new_pea = """            // —— 豌豆系 (10级，纯输出，阳光升级) ——
            peashooter:    { name: '豌豆射手', img: 'Plants/Peashooter/0.gif',   card: 'Peashooter.png',  hp: 300, cost: 10,
                             shoot: { dmg: 20, cd: 1.5, n: 1, range: 320, img: 'Plants/PB00.gif' }, up: { cost: 50, cur: 'sun', to: 'repeater' } },
            repeater:      { name: '双发射手', img: 'Plants/Repeater/0.gif',     card: 'Repeater.png',    hp: 350, cost: 0,
                             shoot: { dmg: 20, cd: 1.5, n: 2, range: 320, img: 'Plants/PB00.gif' }, up: { cost: 150, cur: 'sun', to: 'threepeater' } },
            threepeater:   { name: '三线射手', img: 'Plants/Threepeater/0.gif',  card: 'Threepeater.png', hp: 450, cost: 0,   scale: 1.15,
                             shoot: { dmg: 20, cd: 1.5, n: 3, range: 320, img: 'Plants/PB00.gif', fan: 0.35 }, up: { cost: 400, cur: 'sun', to: 'splitpea' } },
            splitpea:      { name: '双向射手', img: 'Plants/SplitPea/0.gif',     card: 'SplitPea.png',    hp: 550, cost: 0,
                             shoot: { dmg: 25, cd: 1.3, n: 4, range: 320, img: 'Plants/PB00.gif', back: true }, up: { cost: 1000, cur: 'sun', to: 'gatlingpea' } },
            gatlingpea:    { name: '机枪射手', img: 'Plants/GatlingPea/0.gif',   card: 'GatlingPea.png',  hp: 700, cost: 0,   scale: 1.15,
                             shoot: { dmg: 25, cd: 1.0, n: 4, range: 340, img: 'Plants/PB00.gif' }, up: { cost: 2500, cur: 'sun', to: 'snowpea' } },
            snowpea:       { name: '寒冰射手', img: 'Plants/SnowPea/0.gif',      card: 'SnowPea.png',     hp: 1000, cost: 0,
                             shoot: { dmg: 35, cd: 1.2, n: 4, range: 350, img: 'Plants/PB01.gif', slow: true }, up: { cost: 6000, cur: 'sun', to: 'firepea' } },
            firepea:       { name: '火焰豌豆', img: 'Plants/Peashooter/0.gif',   hp: 1500, cost: 0, scale: 1.2, hat: 'Plants/Torchwood/0.gif',
                             shoot: { dmg: 80, cd: 1.2, n: 4, range: 380, img: 'Plants/PB10.gif', aoe: 50 }, up: { cost: 15000, cur: 'sun', to: 'firerepeater' } },
            firerepeater:  { name: '火焰双发', img: 'Plants/Repeater/0.gif',     hp: 2200, cost: 0, scale: 1.3, hat: 'Plants/Torchwood/0.gif',
                             shoot: { dmg: 80, cd: 1.0, n: 6, range: 400, img: 'Plants/PB10.gif', aoe: 50 }, up: { cost: 40000, cur: 'sun', to: 'firethreepeater' } },
            firethreepeater:{name: '火焰三线', img: 'Plants/Threepeater/0.gif',  hp: 3500, cost: 0, scale: 1.4, hat: 'Plants/Torchwood/0.gif',
                             shoot: { dmg: 80, cd: 0.8, n: 9, range: 420, img: 'Plants/PB10.gif', aoe: 50, fan: 0.35 }, up: { cost: 100000, cur: 'sun', to: 'snowthreepeater' } },
            snowthreepeater:{name: '寒冰三线', img: 'Plants/Threepeater/0.gif',  hp: 6000, cost: 0, scale: 1.5, hat: 'Plants/IceShroom/0.gif',
                             shoot: { dmg: 150, cd: 0.6, n: 12, range: 450, img: 'Plants/PB01.gif', slow: true, fan: 0.35, homing: true } },"""
pattern_pea = re.compile(r"            // —— 豌豆系 \(10级，纯输出，阳光升级\) ——.*?snowthreepeater:\{name: '寒冰三线'.*?\},", re.DOTALL)
content = pattern_pea.sub(new_pea, content)

# Change array 'overlay' to 'overlays' for doomtallnut
old_doomtallnut = """            doomtallnut:   { name: '毁灭高坚果', img: 'Plants/TallNut/0.gif',       hp: 90000, cost: 0, scale: 1.5, hat: 'Plants/DoomShroom/0.gif', tint: 'hue-rotate(240deg)',"""
new_doomtallnut = """            doomtallnut:   { name: '毁灭高坚果', img: 'Plants/TallNut/0.gif',       hp: 90000, cost: 0, scale: 1.5, overlays: ['Plants/PumpkinHead/0.gif', 'Plants/DoomShroom/0.gif'], tint: 'hue-rotate(240deg)',"""
content = content.replace(old_doomtallnut, new_doomtallnut)

# AI Tick Delay: Make them slower when they have more plants to simulate human limit
old_ai_brain_start = """    _updateAIs(dt) {
        this.aiTick = (this.aiTick || 0) + dt;
        if (this.aiTick > 1.5) { // 每 1.5 秒做一次决策"""
new_ai_brain_start = """    _updateAIs(dt) {
        this.aiTick = (this.aiTick || 0) + dt;
        if (this.aiTick > 2.0) { // 每 2 秒做一次决策（降速防过快雪球）"""
content = content.replace(old_ai_brain_start, new_ai_brain_start)

# Change AI sun check for Puffshroom: it costs 0, but previously we limited to 2 puffs.
# Now that puffshroom can be upgraded up to 10 levels, limit to 4.
old_ai_puff = """                    // 小喷菇产孢子 (上限 2 个)
                    const puffs = myPlants.filter(p => p.def.spore);
                    if (puffs.length < 2) {"""
new_ai_puff = """                    // 孢子植物上限 4 个
                    const puffs = myPlants.filter(p => p.def.spore);
                    if (puffs.length < 4) {"""
content = content.replace(old_ai_puff, new_ai_puff)


with open('pvz-web/js/HauntedDorm.js', 'w') as f:
    f.write(content)
