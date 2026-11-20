import re

with open('pvz-web/js/GameLoop.js', 'r') as f:
    content = f.read()

# Add to seed bank
old_seeds = """            { type: 'chomper', cost: 150, cooldown: 7.5, img: 'assets/images/Card/Plants/Chomper.png' },
            { type: 'tallnut', cost: 125, cooldown: 30, img: 'assets/images/Card/Plants/TallNut.png' },
            { type: 'puffshroom', cost: 0, cooldown: 7.5, img: 'assets/images/Card/Plants/PuffShroom.png' },"""
new_seeds = """            { type: 'chomper', cost: 150, cooldown: 7.5, img: 'assets/images/Card/Plants/Chomper.png' },
            { type: 'tallnut', cost: 125, cooldown: 30, img: 'assets/images/Card/Plants/TallNut.png' },
            { type: 'puffshroom', cost: 0, cooldown: 7.5, img: 'assets/images/Card/Plants/PuffShroom.png' },
            { type: 'melonpult', cost: 300, cooldown: 7.5, img: 'assets/images/Card/Plants/Cactus.png' },"""
content = content.replace(old_seeds, new_seeds)

# Add to getFusionResult
old_fusion = """        if (set.has('peashooter') && set.has('squash')) return 'splitpea';"""
new_fusion = """        if (set.has('peashooter') && set.has('squash')) return 'splitpea';
        if (set.has('melonpult') && set.has('iceshroom')) return 'wintermelon';"""
content = content.replace(old_fusion, new_fusion)

# Add to names
old_names = """            fusion_cherrybomb_peashooter: '樱桃射手', fusion_doomshroom_sunflower: '毁灭向日葵',
            snowpea: '寒冰射手', splitpea: '双向豌豆', gatlingpea: '机枪射手',
            fumeshroom: '大喷菇', sunshroom: '阳光菇', scaredyshroom: '胆小菇', torchwood: '火炬树桩'
        };"""
new_names = """            fusion_cherrybomb_peashooter: '樱桃射手', fusion_doomshroom_sunflower: '毁灭向日葵',
            snowpea: '寒冰射手', splitpea: '双向豌豆', gatlingpea: '机枪射手',
            fumeshroom: '大喷菇', sunshroom: '阳光菇', scaredyshroom: '胆小菇', torchwood: '火炬树桩',
            melonpult: '西瓜投手', wintermelon: '冰西瓜投手'
        };"""
content = content.replace(old_names, new_names)

# Add to manual recipes
old_recipes = """            { a: 'sunflower', b: 'doomshroom', result: '毁灭向日葵', img: 'assets/images/Plants/SunFlower/SunFlower1.gif', filter: 'grayscale(0.8) brightness(0.6) sepia(1) hue-rotate(240deg) saturate(3)', css: false }
        ];"""
new_recipes = """            { a: 'sunflower', b: 'doomshroom', result: '毁灭向日葵', img: 'assets/images/Plants/SunFlower/SunFlower1.gif', filter: 'grayscale(0.8) brightness(0.6) sepia(1) hue-rotate(240deg) saturate(3)', css: false },
            { a: 'melonpult', b: 'iceshroom', result: '冰西瓜投手', img: 'assets/images/Plants/Cactus/Cactus.gif', filter: 'hue-rotate(180deg) saturate(1.5) brightness(1.2)', css: false }
        ];"""
content = content.replace(old_recipes, new_recipes)

# Add to getImg map
old_map = """                    'squash': 'assets/images/Plants/Squash/Squash.gif',
                    'doomshroom': 'assets/images/Plants/DoomShroom/DoomShroom.gif',
                    'jalapeno': 'assets/images/Plants/Jalapeno/Jalapeno.gif'
                };"""
new_map = """                    'squash': 'assets/images/Plants/Squash/Squash.gif',
                    'doomshroom': 'assets/images/Plants/DoomShroom/DoomShroom.gif',
                    'jalapeno': 'assets/images/Plants/Jalapeno/Jalapeno.gif',
                    'melonpult': 'assets/images/Plants/Cactus/Cactus.gif'
                };"""
content = content.replace(old_map, new_map)

with open('pvz-web/js/GameLoop.js', 'w') as f:
    f.write(content)

