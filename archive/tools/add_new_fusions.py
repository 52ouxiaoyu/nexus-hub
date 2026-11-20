import re

with open('pvz-web/js/GameLoop.js', 'r') as f:
    content = f.read()

# Add to getFusionResult
old_fusion = """        if (sourceType === 'peashooter' && targetType === 'peashooter') return 'repeater';
        if (sourceType === 'repeater' && targetType === 'peashooter') return 'threepeater';
        if (sourceType === 'peashooter' && targetType === 'repeater') return 'threepeater';
        if (sourceType === 'sunflower' && targetType === 'sunflower') return 'twinsunflower';
        
        let set = new Set([sourceType, targetType]);"""

new_fusion = """        if (sourceType === 'peashooter' && targetType === 'peashooter') return 'repeater';
        if (sourceType === 'repeater' && targetType === 'peashooter') return 'threepeater';
        if (sourceType === 'peashooter' && targetType === 'repeater') return 'threepeater';
        if (sourceType === 'repeater' && targetType === 'repeater') return 'gatlingpea';
        if (sourceType === 'sunflower' && targetType === 'sunflower') return 'twinsunflower';
        if (sourceType === 'puffshroom' && targetType === 'puffshroom') return 'fumeshroom';
        
        let set = new Set([sourceType, targetType]);
        if (set.has('peashooter') && set.has('iceshroom')) return 'snowpea';
        if (set.has('peashooter') && set.has('squash')) return 'splitpea';
        if (set.has('puffshroom') && set.has('sunflower')) return 'sunshroom';
        if (set.has('puffshroom') && set.has('peashooter')) return 'scaredyshroom';
        if (set.has('wallnut') && set.has('jalapeno')) return 'torchwood';
        """

content = content.replace(old_fusion, new_fusion)

# Update names dictionary
old_names = """            repeater: '双发豌豆', twinsunflower: '双子向日葵', threepeater: '三线射手',
            fusion_cherrybomb_peashooter: '樱桃射手', fusion_doomshroom_sunflower: '毁灭向日葵'
        };"""

new_names = """            repeater: '双发豌豆', twinsunflower: '双子向日葵', threepeater: '三线射手',
            fusion_cherrybomb_peashooter: '樱桃射手', fusion_doomshroom_sunflower: '毁灭向日葵',
            snowpea: '寒冰射手', splitpea: '双向豌豆', gatlingpea: '机枪射手',
            fumeshroom: '大喷菇', sunshroom: '阳光菇', scaredyshroom: '胆小菇', torchwood: '火炬树桩'
        };"""

content = content.replace(old_names, new_names)

# Update recipes array
old_recipes = """            { a: 'peashooter', b: 'peashooter', result: '双发豌豆', img: 'assets/images/Plants/RepeaterPea/RepeaterPea.gif', css: false },
            { a: 'peashooter', b: 'repeater', result: '三线射手', img: 'assets/images/Plants/Threepeater/Threepeater.gif', css: false },
            { a: 'sunflower', b: 'sunflower', result: '双子向日葵', img: 'assets/images/Plants/TwinSunflower/TwinSunflower1.gif', css: false },"""

new_recipes = """            { a: 'peashooter', b: 'peashooter', result: '双发豌豆', img: 'assets/images/Plants/RepeaterPea/RepeaterPea.gif', css: false },
            { a: 'peashooter', b: 'repeater', result: '三线射手', img: 'assets/images/Plants/Threepeater/Threepeater.gif', css: false },
            { a: 'repeater', b: 'repeater', result: '机枪射手', img: 'assets/images/Plants/GatlingPea/GatlingPea.gif', css: false },
            { a: 'sunflower', b: 'sunflower', result: '双子向日葵', img: 'assets/images/Plants/TwinSunflower/TwinSunflower1.gif', css: false },
            { a: 'peashooter', b: 'iceshroom', result: '寒冰射手', img: 'assets/images/Plants/SnowPea/SnowPea.gif', css: false },
            { a: 'peashooter', b: 'squash', result: '双向豌豆', img: 'assets/images/Plants/SplitPea/SplitPea.gif', css: false },
            { a: 'puffshroom', b: 'puffshroom', result: '大喷菇', img: 'assets/images/Plants/FumeShroom/FumeShroom.gif', css: false },
            { a: 'puffshroom', b: 'sunflower', result: '阳光菇', img: 'assets/images/Plants/SunShroom/SunShroom.gif', css: false },
            { a: 'puffshroom', b: 'peashooter', result: '胆小菇', img: 'assets/images/Plants/ScaredyShroom/ScaredyShroom.gif', css: false },
            { a: 'wallnut', b: 'jalapeno', result: '火炬树桩', img: 'assets/images/Plants/Torchwood/Torchwood.gif', css: false },"""

content = content.replace(old_recipes, new_recipes)

with open('pvz-web/js/GameLoop.js', 'w') as f:
    f.write(content)

