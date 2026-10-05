import re

with open('pvz-web/js/HauntedDorm.js', 'r') as f:
    content = f.read()

# Replace Sun chain DEFS
new_sun_defs = """            // —— 阳光系 (10级) ——
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

pattern = re.compile(r"            // —— 阳光系 \(10级\) ——.*?            // —— 蘑菇系 \(10级，喂养大\) ——", re.DOTALL)
content = pattern.sub(new_sun_defs, content)

with open('pvz-web/js/HauntedDorm.js', 'w') as f:
    f.write(content)
