import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

old_visuals = """                } else if (type === 'fusion_snownut') {
                    // Wallnut colored ice blue
                    this.element.src = s2.src; // wallnut
                    this.element.style.filter = 'hue-rotate(180deg) saturate(1.5) brightness(1.2)';
                    this.fusionOverlay.style.display = 'none'; // hide overlay
                }"""

new_visuals = """                } else if (type === 'fusion_snownut') {
                    // Wallnut colored ice blue
                    this.element.src = s2.src; // wallnut
                    this.element.style.filter = 'hue-rotate(180deg) saturate(1.5) brightness(1.2)';
                    this.fusionOverlay.style.display = 'none'; // hide overlay
                } else if (type === 'fusion_cherrybomb_peashooter') {
                    this.element.src = s2.src; // peashooter
                    this.element.style.filter = 'hue-rotate(-45deg) saturate(2.0)';
                    this.fusionOverlay.style.display = 'none';
                } else if (type === 'fusion_doomshroom_sunflower') {
                    this.element.src = s2.src; // sunflower
                    this.element.style.filter = 'grayscale(0.8) brightness(0.6) sepia(1) hue-rotate(240deg) saturate(3)';
                    this.fusionOverlay.style.display = 'none';
                }"""

content = content.replace(old_visuals, new_visuals)

# Also ensure constructor init sums fire/sun timers
old_timer = """        if (type === 'peashooter' || type === 'snowpea' || type === 'repeater' || type === 'splitpea' || type === 'gatlingpea' || type === 'threepeater' || type === 'fusion_peaflower' || type === 'fusion_nutshooter') {
            this.shootTimer = 1.5;
        }
        if (type === 'sunflower' || type === 'twinsunflower' || type === 'fusion_peaflower') {
            this.sunTimer = 5.0; // maybe 5 sec initial
        }"""

new_timer = """        if (type === 'peashooter' || type === 'snowpea' || type === 'repeater' || type === 'splitpea' || type === 'gatlingpea' || type === 'threepeater' || type === 'fusion_peaflower' || type === 'fusion_nutshooter' || type === 'fusion_cherrybomb_peashooter') {
            this.shootTimer = 1.5;
        }
        if (type === 'sunflower' || type === 'twinsunflower' || type === 'fusion_peaflower' || type === 'fusion_doomshroom_sunflower') {
            this.sunTimer = 5.0; // maybe 5 sec initial
        }"""

content = content.replace(old_timer, new_timer)

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)

# Update GameLoop recipes too
with open('pvz-web/js/GameLoop.js', 'r') as f:
    content2 = f.read()

# Add cherrybomb peashooter and doomshroom sunflower to manual
old_manual_list = """            { a: 'snowpea', b: 'wallnut', result: '寒冰坚果', img: 'assets/images/Plants/WallNut/WallNut.gif', filter: 'hue-rotate(180deg) saturate(1.5) brightness(1.2)', css: false }
        ];"""

new_manual_list = """            { a: 'snowpea', b: 'wallnut', result: '寒冰坚果', img: 'assets/images/Plants/WallNut/WallNut.gif', filter: 'hue-rotate(180deg) saturate(1.5) brightness(1.2)', css: false },
            { a: 'peashooter', b: 'cherrybomb', result: '樱桃射手', img: 'assets/images/Plants/Peashooter/Peashooter.gif', filter: 'hue-rotate(-45deg) saturate(2.0)', css: false },
            { a: 'sunflower', b: 'doomshroom', result: '毁灭向日葵', img: 'assets/images/Plants/SunFlower/SunFlower1.gif', filter: 'grayscale(0.8) brightness(0.6) sepia(1) hue-rotate(240deg) saturate(3)', css: false }
        ];"""

content2 = content2.replace(old_manual_list, new_manual_list)

old_names2 = """            repeater: '双发豌豆', twinsunflower: '双子向日葵', threepeater: '三线射手'
        };"""

new_names2 = """            repeater: '双发豌豆', twinsunflower: '双子向日葵', threepeater: '三线射手',
            fusion_cherrybomb_peashooter: '樱桃射手', fusion_doomshroom_sunflower: '毁灭向日葵'
        };"""

content2 = content2.replace(old_names2, new_names2)

with open('pvz-web/js/GameLoop.js', 'w') as f:
    f.write(content2)

