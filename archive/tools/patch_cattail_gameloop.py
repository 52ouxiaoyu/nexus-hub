import re

with open('pvz-web/js/GameLoop.js', 'r') as f:
    content = f.read()

# Add to getFusionResult
old_fusion = """        if (set.has('melonpult') && set.has('iceshroom')) return 'wintermelon';"""
new_fusion = """        if (set.has('melonpult') && set.has('iceshroom')) return 'wintermelon';
        if (set.has('repeater') && set.has('spikeweed')) return 'cattail';"""
content = content.replace(old_fusion, new_fusion)

# Add to names
old_names = """            melonpult: '西瓜投手', wintermelon: '冰西瓜投手'
        };"""
new_names = """            melonpult: '西瓜投手', wintermelon: '冰西瓜投手', cattail: '猫尾草'
        };"""
content = content.replace(old_names, new_names)

# Add to manual recipes
old_recipes = """            { a: 'melonpult', b: 'iceshroom', result: '冰西瓜投手', img: 'assets/images/Plants/Cactus/Cactus.gif', filter: 'hue-rotate(180deg) saturate(1.5) brightness(1.2)', css: false, css: false }
        ];"""
new_recipes = """            { a: 'melonpult', b: 'iceshroom', result: '冰西瓜投手', img: 'assets/images/Plants/Cactus/Cactus.gif', filter: 'hue-rotate(180deg) saturate(1.5) brightness(1.2)', css: false },
            { a: 'repeater', b: 'spikeweed', result: '猫尾草', img: 'assets/images/Plants/Cattail/Cattail.gif', css: false }
        ];"""
content = content.replace(old_recipes, new_recipes)

# Add to getImg map
old_map = """                    'wintermelon': 'assets/images/Plants/Cactus/Cactus.gif'
                };"""
new_map = """                    'wintermelon': 'assets/images/Plants/Cactus/Cactus.gif',
                    'cattail': 'assets/images/Plants/Cattail/Cattail.gif'
                };"""
content = content.replace(old_map, new_map)

with open('pvz-web/js/GameLoop.js', 'w') as f:
    f.write(content)

