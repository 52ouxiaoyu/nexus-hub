import re

with open('pvz-web/js/HauntedDorm.js', 'r') as f:
    content = f.read()

# Restore Sunshroom Chain
new_sun = """            // —— 阳光系 (10级) ——
            sunshroom:     { tier: 1, name: '阳光菇',     img: 'Plants/SunShroom/0.gif',     card: 'SunShroom.png',     hp: 300,  cost: 10,   scale: 0.75,
                             produce: { sun: 10, every: 0.5 },  up: { cost: 30, cur: 'sun', to: 'sunshroom2' } },
            sunshroom2:    { tier: 2, name: '大阳光菇',   img: 'Plants/SunShroom/0.gif',     hp: 350,  cost: 0,   scale: 1.1,
                             produce: { sun: 30, every: 0.5 },  up: { cost: 90, cur: 'sun', to: 'sunflower' } },
            sunflower:     { tier: 3, name: '向日葵',     img: 'Plants/SunFlower/0.gif',     hp: 400,  cost: 0,   scale: 1.1,
                             produce: { sun: 90, every: 0.5 },  up: { cost: 270, cur: 'sun', to: 'twinsunflower' } },
            twinsunflower: { tier: 4, name: '双子向日葵', img: 'Plants/TwinSunflower/0.gif', hp: 450,  cost: 0,   scale: 1.2,
                             produce: { sun: 270, every: 0.5 }, up: { cost: 810, sporeCost: 1, cur: 'sun', to: 'sunpea' } },
            sunpea:        { tier: 5, name: '豌豆向日葵', img: 'Plants/TwinSunflower/0.gif', hp: 550, cost: 0, scale: 1.2,
                             overlay: 'Plants/Peashooter/0.gif',
                             produce: { sun: 810, every: 0.5 }, shoot: { dmg: 20, cd: 1.5, n: 1, range: 320, img: 'Plants/PB00.gif' }, 
                             up: { cost: 2430, sporeCost: 10, cur: 'sun', to: 'sunnut' } },
            sunnut:        { tier: 6, name: '坚果向日葵', img: 'Plants/WallNut/0.gif', hp: 2000, cost: 0, scale: 1.2, 
                             overlay: 'Plants/TwinSunflower/0.gif',
                             produce: { sun: 2430, every: 0.5 }, shoot: { dmg: 20, cd: 1.5, n: 1, range: 320, img: 'Plants/PB00.gif' }, 
                             up: { cost: 7290, sporeCost: 50, cur: 'sun', to: 'suncherry' } },
            suncherry:     { tier: 7, name: '樱桃向日葵', img: 'Plants/TwinSunflower/0.gif', hp: 3000, cost: 0, scale: 1.3,
                             overlay: 'Plants/CherryBomb/0.gif',
                             produce: { sun: 7290, every: 0.5 }, shoot: { dmg: 40, cd: 1.0, n: 3, range: 400, img: 'Plants/PB00.gif', back: true },
                             up: { cost: 21870, sporeCost: 250, cur: 'sun', to: 'sunjala' } },
            sunjala:       { tier: 8, name: '火爆向日葵', img: 'Plants/TwinSunflower/0.gif', hp: 5000, cost: 0, scale: 1.4,
                             overlay: 'Plants/Jalapeno/0.gif',
                             produce: { sun: 21870, every: 0.5 }, shoot: { dmg: 50, cd: 0.8, n: 4, range: 500, img: 'Plants/PB00.gif', homing: true },
                             up: { cost: 65610, sporeCost: 1000, cur: 'sun', to: 'sundoom' } },
            sundoom:       { tier: 9, name: '毁灭向日葵', img: 'Plants/TwinSunflower/0.gif', hp: 8000, cost: 0, scale: 1.5, tint: 'hue-rotate(240deg)',
                             overlay: 'Plants/DoomShroom/0.gif',
                             produce: { sun: 65610, every: 0.5 }, shoot: { dmg: 70, cd: 0.6, n: 6, range: 600, img: 'Plants/PB00.gif', homing: true, aoe: 50 },
                             up: { cost: 196830, sporeCost: 5000, cur: 'sun', to: 'sungatling' } },
            sungatling:    { tier: 10, name: '机枪向日葵', img: 'Plants/TwinSunflower/0.gif', hp: 15000, cost: 0, scale: 1.6,
                             overlay: 'Plants/GatlingPea/0.gif',
                             produce: { sun: 196830, every: 0.5 }, shoot: { dmg: 100, cd: 0.4, n: 8, range: 800, img: 'Plants/PB00.gif', homing: true } },"""
pattern_sun = re.compile(r"            // —— 阳光系 \(10级\) ——.*?sungatling:    \{ name: '机枪向日葵'.*?\},", re.DOTALL)
content = pattern_sun.sub(new_sun, content)

# Restore Spore Chain
new_mushroom = """            // —— 孢子系 (10级，纯产包子) ——
            puffshroom:    { tier: 1, name: '小喷菇', img: 'Plants/PuffShroom/0.gif',     card: 'PuffShroom.png',     hp: 300, cost: 0, scale: 0.9,
                             spore: { n: 1, every: 1.0 }, up: { cost: 50, cur: 'sun', to: 'sunpuff' } },
            sunpuff:       { tier: 2, name: '阳光喷菇', img: 'Plants/PuffShroom/0.gif',   hp: 400, cost: 0,   scale: 1.0, hat: 'Plants/SunShroom/0.gif',
                             spore: { n: 5, every: 1.0 }, up: { cost: 150, cur: 'sun', to: 'fumeshroom' } },
            fumeshroom:    { tier: 3, name: '大喷菇', img: 'Plants/FumeShroom/0.gif',     card: 'FumeShroom.png',     hp: 500, cost: 0,   scale: 1.1,
                             spore: { n: 25, every: 1.0 }, up: { cost: 450, cur: 'sun', to: 'gloomshroom' } },
            gloomshroom:   { tier: 4, name: '忧郁菇', img: 'Plants/GloomShroom/0.gif',    card: 'GloomShroom.png',    hp: 600, cost: 0,   scale: 1.2,
                             spore: { n: 125, every: 1.0 }, up: { cost: 1350, cur: 'sun', to: 'hypnoshroom' } },
            hypnoshroom:   { tier: 5, name: '魅惑喷菇', img: 'Plants/HypnoShroom/0.gif', hp: 800, cost: 0, scale: 1.3,
                             spore: { n: 625, every: 1.0 }, up: { cost: 4050, cur: 'sun', to: 'scaredyshroom' } },
            scaredyshroom: { tier: 6, name: '胆小喷菇', img: 'Plants/ScaredyShroom/0.gif', hp: 1200, cost: 0, scale: 1.35,
                             spore: { n: 3125, every: 1.0 }, up: { cost: 12150, cur: 'sun', to: 'iceshroom_puff' } },
            iceshroom_puff:{ tier: 7, name: '冰霜喷菇', img: 'Plants/FumeShroom/0.gif', hp: 1800, cost: 0, scale: 1.4, hat: 'Plants/IceShroom/0.gif', tint: 'hue-rotate(180deg)',
                             spore: { n: 15625, every: 1.0 }, up: { cost: 36450, cur: 'sun', to: 'doomshroom_puff' } },
            doomshroom_puff:{tier: 8, name: '毁灭喷菇', img: 'Plants/FumeShroom/0.gif', hp: 3000, cost: 0, scale: 1.5, hat: 'Plants/DoomShroom/0.gif', tint: 'hue-rotate(240deg)',
                             spore: { n: 78125, every: 1.0 }, up: { cost: 109350, cur: 'sun', to: 'seashroom' } },
            seashroom:     { tier: 9, name: '海蘑菇', img: 'Plants/SeaShroom/0.gif', hp: 5000, cost: 0, scale: 1.6,
                             spore: { n: 390625, every: 1.0 }, up: { cost: 328050, cur: 'sun', to: 'ultimategloom' } },
            ultimategloom: { tier: 10, name: '终极孢子', img: 'Plants/GloomShroom/0.gif', hp: 12000, cost: 0, scale: 2.0, tint: 'brightness(1.5) drop-shadow(0 0 10px #ff0)', hat: 'Plants/HypnoShroom/0.gif',
                             spore: { n: 1953125, every: 1.0 } },"""
pattern_mushroom = re.compile(r"            // —— 孢子系 \(10级，纯产包子\) ——.*?ultimategloom: \{ name: '终极孢子'.*?\},", re.DOTALL)
content = pattern_mushroom.sub(new_mushroom, content)

# Restore Peashooter Chain
new_pea = """            // —— 豌豆系 (10级，纯输出，阳光升级) ——
            peashooter:    { tier: 1, name: '豌豆射手', img: 'Plants/Peashooter/0.gif',   card: 'Peashooter.png',  hp: 300, cost: 10,
                             shoot: { dmg: 20, cd: 1.5, n: 1, range: 320, img: 'Plants/PB00.gif' }, up: { cost: 30, cur: 'sun', to: 'repeater' } },
            repeater:      { tier: 2, name: '双发射手', img: 'Plants/Repeater/0.gif',     card: 'Repeater.png',    hp: 350, cost: 0,
                             shoot: { dmg: 20, cd: 1.5, n: 2, range: 320, img: 'Plants/PB00.gif' }, up: { cost: 90, cur: 'sun', to: 'threepeater' } },
            threepeater:   { tier: 3, name: '三线射手', img: 'Plants/Threepeater/0.gif',  card: 'Threepeater.png', hp: 450, cost: 0,   scale: 1.15,
                             shoot: { dmg: 20, cd: 1.5, n: 3, range: 320, img: 'Plants/PB00.gif', fan: 0.35 }, up: { cost: 270, cur: 'sun', to: 'splitpea' } },
            splitpea:      { tier: 4, name: '双向射手', img: 'Plants/SplitPea/0.gif',     card: 'SplitPea.png',    hp: 550, cost: 0,
                             shoot: { dmg: 25, cd: 1.3, n: 4, range: 320, img: 'Plants/PB00.gif', back: true }, up: { cost: 810, cur: 'sun', to: 'gatlingpea' } },
            gatlingpea:    { tier: 5, name: '机枪射手', img: 'Plants/GatlingPea/0.gif',   card: 'GatlingPea.png',  hp: 700, cost: 0,   scale: 1.15,
                             shoot: { dmg: 25, cd: 1.0, n: 4, range: 340, img: 'Plants/PB00.gif' }, up: { cost: 2430, cur: 'sun', to: 'snowpea' } },
            snowpea:       { tier: 6, name: '寒冰射手', img: 'Plants/SnowPea/0.gif',      card: 'SnowPea.png',     hp: 1000, cost: 0,
                             shoot: { dmg: 35, cd: 1.2, n: 4, range: 350, img: 'Plants/PB01.gif', slow: true }, up: { cost: 7290, cur: 'sun', to: 'firepea' } },
            firepea:       { tier: 7, name: '火焰豌豆', img: 'Plants/Peashooter/0.gif',   hp: 1500, cost: 0, scale: 1.2, hat: 'Plants/Torchwood/0.gif',
                             shoot: { dmg: 80, cd: 1.2, n: 4, range: 380, img: 'Plants/PB10.gif', aoe: 50 }, up: { cost: 21870, cur: 'sun', to: 'firerepeater' } },
            firerepeater:  { tier: 8, name: '火焰双发', img: 'Plants/Repeater/0.gif',     hp: 2200, cost: 0, scale: 1.3, hat: 'Plants/Torchwood/0.gif',
                             shoot: { dmg: 80, cd: 1.0, n: 6, range: 400, img: 'Plants/PB10.gif', aoe: 50 }, up: { cost: 65610, cur: 'sun', to: 'firethreepeater' } },
            firethreepeater:{tier: 9, name: '火焰三线', img: 'Plants/Threepeater/0.gif',  hp: 3500, cost: 0, scale: 1.4, hat: 'Plants/Torchwood/0.gif',
                             shoot: { dmg: 80, cd: 0.8, n: 9, range: 420, img: 'Plants/PB10.gif', aoe: 50, fan: 0.35 }, up: { cost: 196830, cur: 'sun', to: 'snowthreepeater' } },
            snowthreepeater:{tier: 10, name: '寒冰三线', img: 'Plants/Threepeater/0.gif',  hp: 6000, cost: 0, scale: 1.5, hat: 'Plants/IceShroom/0.gif',
                             shoot: { dmg: 150, cd: 0.6, n: 12, range: 450, img: 'Plants/PB01.gif', slow: true, fan: 0.35, homing: true } },"""
pattern_pea = re.compile(r"            // —— 豌豆系 \(10级，纯输出，阳光升级\) ——.*?snowthreepeater:\{name: '寒冰三线'.*?\},", re.DOTALL)
content = pattern_pea.sub(new_pea, content)


# Throttle AI based on Zombie level
old_ai_brain_weight = """                        if (ai.sun >= c && ai.spore >= sc) {
                            // 优先升门，其次阳光菇
                            let weight = p.def.isDoor ? 3 : (p.def.produce ? 2 : 1);
                            // 如果快破门了，强制升门补血
                            if (p.def.isDoor && p.hp < p.def.hp * 0.4) weight += 10;
                            actions.push({ type: 'up', pl: p, cost: c, sporeCost: sc, to: p.def.up.to, weight: weight });
                        }"""
new_ai_brain_weight = """                        if (ai.sun >= c && ai.spore >= sc) {
                            // 【人机战力控制】检查目标等级，防止人机开挂秒杀僵尸
                            // 获取目标植物的 tier。如果不带 tier，默认当做 1。
                            const targetTier = HauntedDorm.DEFS[p.def.up.to].tier || 1;
                            const zLv = this.ghostLevel || 1;
                            // 规则：人机的最高植物等级不能超过 僵尸等级 + 2 
                            // （给玩家发挥空间，人机陪跑但不抢戏）
                            if (targetTier <= zLv + 2) {
                                // 优先升门，其次阳光菇
                                let weight = p.def.isDoor ? 3 : (p.def.produce ? 2 : 1);
                                // 如果快破门了，强制升门补血
                                if (p.def.isDoor && p.hp < p.def.hp * 0.4) weight += 10;
                                actions.push({ type: 'up', pl: p, cost: c, sporeCost: sc, to: p.def.up.to, weight: weight });
                            }
                        }"""
content = content.replace(old_ai_brain_weight, new_ai_brain_weight)

with open('pvz-web/js/HauntedDorm.js', 'w') as f:
    f.write(content)
