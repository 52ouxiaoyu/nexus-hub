import re

with open('pvz-web/js/GameLoop.js', 'r') as f:
    content = f.read()

old_recipes = """            { a: 'fumeshroom', b: 'fumeshroom', result: '忧郁菇', img: 'assets/images/Plants/GloomShroom/GloomShroom.gif', css: false },
            { a: 'spikeweed', b: 'spikeweed', result: '钢地刺', img: 'assets/images/Plants/Spikerock/Spikerock.gif', css: false }
        ];"""
new_recipes = """            { a: 'fumeshroom', b: 'fumeshroom', result: '忧郁菇', img: 'assets/images/Plants/GloomShroom/GloomShroom.gif', css: false },
            { a: 'spikeweed', b: 'spikeweed', result: '钢地刺', img: 'assets/images/Plants/Spikerock/Spikerock.gif', css: false },
            { a: 'spikeweed', b: 'wallnut', result: '尖刺坚果', img: 'assets/images/Plants/WallNut/WallNut.gif', css: false },
            { a: 'spikerock', b: 'tallnut', result: '钢刺高坚果', img: 'assets/images/Plants/TallNut/TallNut.gif', css: false }
        ];"""
content = content.replace(old_recipes, new_recipes)

with open('pvz-web/js/GameLoop.js', 'w') as f:
    f.write(content)
