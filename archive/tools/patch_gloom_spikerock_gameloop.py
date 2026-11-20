import re

with open('pvz-web/js/GameLoop.js', 'r') as f:
    content = f.read()

# Add to getFusionResult
old_fusion = """        if (set.has('puffshroom') && set.has('sunflower')) return 'sunshroom';"""
new_fusion = """        if (set.has('puffshroom') && set.has('sunflower')) return 'sunshroom';
        if (plantA === 'fumeshroom' && plantB === 'fumeshroom') return 'gloomshroom';
        if (plantA === 'spikeweed' && plantB === 'spikeweed') return 'spikerock';"""
content = content.replace(old_fusion, new_fusion)

# Add to names
old_names = """            melonpult: '西瓜投手', wintermelon: '冰西瓜投手', cattail: '猫尾草'
        };"""
new_names = """            melonpult: '西瓜投手', wintermelon: '冰西瓜投手', cattail: '猫尾草', gloomshroom: '忧郁菇', spikerock: '钢地刺'
        };"""
content = content.replace(old_names, new_names)

# Add to manual recipes
old_recipes = """            { a: 'repeater', b: 'spikeweed', result: '猫尾草', img: 'assets/images/Plants/Cattail/Cattail.gif', css: false }
        ];"""
new_recipes = """            { a: 'repeater', b: 'spikeweed', result: '猫尾草', img: 'assets/images/Plants/Cattail/Cattail.gif', css: false },
            { a: 'fumeshroom', b: 'fumeshroom', result: '忧郁菇', img: 'assets/images/Plants/GloomShroom/GloomShroom.gif', css: false },
            { a: 'spikeweed', b: 'spikeweed', result: '钢地刺', img: 'assets/images/Plants/Spikerock/Spikerock.gif', css: false }
        ];"""
content = content.replace(old_recipes, new_recipes)

# Add to getImg map
old_map = """                    'cattail': 'assets/images/Plants/Cattail/Cattail.gif'
                };"""
new_map = """                    'cattail': 'assets/images/Plants/Cattail/Cattail.gif',
                    'gloomshroom': 'assets/images/Plants/GloomShroom/GloomShroom.gif',
                    'spikerock': 'assets/images/Plants/Spikerock/Spikerock.gif'
                };"""
content = content.replace(old_map, new_map)

with open('pvz-web/js/GameLoop.js', 'w') as f:
    f.write(content)

