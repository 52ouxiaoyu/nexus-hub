import re

with open('pvz-web/js/GameLoop.js', 'r') as f:
    content = f.read()

# 1. Remove repeater and other advanced plants from the seed bank if desired.
# User mentioned removing repeater. I will also remove threepeater, splitpea, maybe gatlingpea.
# Let's just remove repeater for now, since it was explicitly mentioned.

old_repeater = "            { type: 'repeater', cost: 200, cooldown: 7.5, img: 'assets/images/Card/Plants/Repeater.png' },\n"
content = content.replace(old_repeater, "")

# Remove threepeater
old_threepeater = "            { type: 'threepeater', cost: 325, cooldown: 7.5, img: 'assets/images/Card/Plants/Threepeater.png' },\n"
content = content.replace(old_threepeater, "")

# 2. Add recipes for repeater and twinsunflower
# In getFusionResult:
old_get_fusion = """    getFusionResult(sourceType, targetType) {
        let set = new Set([sourceType, targetType]);
        if (set.has('peashooter') && set.has('sunflower')) return 'fusion_peaflower';
        if (set.has('wallnut') && set.has('peashooter')) return 'fusion_nutshooter';
        if (set.has('snowpea') && set.has('cherrybomb')) return 'fusion_frostbomb';
        if (set.has('puffshroom') && set.has('potatomine')) return 'fusion_sporemine';
        if (set.has('wallnut') && set.has('chomper')) return 'fusion_spikynut';
        if (set.has('wallnut') && set.has('snowpea')) return 'fusion_snownut';
        
        return null;
    }"""

new_get_fusion = """    getFusionResult(sourceType, targetType) {
        if (sourceType === 'peashooter' && targetType === 'peashooter') return 'repeater';
        if (sourceType === 'repeater' && targetType === 'peashooter') return 'threepeater';
        if (sourceType === 'peashooter' && targetType === 'repeater') return 'threepeater';
        if (sourceType === 'sunflower' && targetType === 'sunflower') return 'twinsunflower';
        
        let set = new Set([sourceType, targetType]);
        if (set.has('peashooter') && set.has('sunflower')) return 'fusion_peaflower';
        if (set.has('wallnut') && set.has('peashooter')) return 'fusion_nutshooter';
        if (set.has('snowpea') && set.has('cherrybomb')) return 'fusion_frostbomb';
        if (set.has('puffshroom') && set.has('potatomine')) return 'fusion_sporemine';
        if (set.has('wallnut') && set.has('chomper')) return 'fusion_spikynut';
        if (set.has('wallnut') && set.has('snowpea')) return 'fusion_snownut';
        
        return null;
    }"""

content = content.replace(old_get_fusion, new_get_fusion)

# 3. Update the names dictionary to include them
old_names = """        const names = {
            fusion_peaflower: '豌豆向日葵', fusion_nutshooter: '坚果射手', fusion_frostbomb: '寒冰炸弹',
            fusion_sporemine: '孢子地雷', fusion_spikynut: '尖刺坚果', fusion_snownut: '寒冰坚果'
        };"""

new_names = """        const names = {
            fusion_peaflower: '豌豆向日葵', fusion_nutshooter: '坚果射手', fusion_frostbomb: '寒冰炸弹',
            fusion_sporemine: '孢子地雷', fusion_spikynut: '尖刺坚果', fusion_snownut: '寒冰坚果',
            repeater: '双发豌豆', twinsunflower: '双子向日葵', threepeater: '三线射手'
        };"""

content = content.replace(old_names, new_names)

# 4. Add them to the manual UI list
old_recipes_list = """        const recipes = [
            { a: 'peashooter', b: 'sunflower', result: '豌豆向日葵', base: 'assets/images/Plants/SunFlower/SunFlower1.gif', over: 'assets/images/Plants/Peashooter/Peashooter.gif', overClip: 'polygon(0 0, 100% 0, 100% 65%, 0 65%)', overTransform: 'translate(0px, -20px) scale(1.0)' },
            { a: 'peashooter', b: 'wallnut', result: '坚果射手', base: 'assets/images/Plants/WallNut/WallNut.gif', over: 'assets/images/Plants/Peashooter/Peashooter.gif', overClip: 'polygon(0 0, 100% 0, 100% 65%, 0 65%)', overTransform: 'translate(5px, -15px) scale(1.0)' },
            { a: 'snowpea', b: 'cherrybomb', result: '寒冰炸弹', img: 'assets/images/Plants/CherryBomb/CherryBomb.gif', filter: 'hue-rotate(180deg) saturate(1.5)', css: false },
            { a: 'puffshroom', b: 'potatomine', result: '孢子地雷', base: 'assets/images/Plants/PotatoMine/PotatoMine.gif', over: 'assets/images/Plants/PuffShroom/PuffShroom.gif', overClip: 'polygon(0 0, 100% 0, 100% 85%, 0 85%)', overTransform: 'translate(0px, -45px) scale(0.9)' },
            { a: 'chomper', b: 'wallnut', result: '尖刺坚果', base: 'assets/images/Plants/WallNut/WallNut.gif', over: 'assets/images/Plants/Chomper/Chomper.gif', overClip: 'polygon(0 0, 100% 0, 100% 85%, 0 85%)', overTransform: 'translate(0px, -25px) scale(0.9)' },
            { a: 'snowpea', b: 'wallnut', result: '寒冰坚果', img: 'assets/images/Plants/WallNut/WallNut.gif', filter: 'hue-rotate(180deg) saturate(1.5) brightness(1.2)', css: false }
        ];"""

new_recipes_list = """        const recipes = [
            { a: 'peashooter', b: 'peashooter', result: '双发豌豆', img: 'assets/images/Plants/RepeaterPea/RepeaterPea.gif', css: false },
            { a: 'peashooter', b: 'repeater', result: '三线射手', img: 'assets/images/Plants/Threepeater/Threepeater.gif', css: false },
            { a: 'sunflower', b: 'sunflower', result: '双子向日葵', img: 'assets/images/Plants/TwinSunflower/TwinSunflower1.gif', css: false },
            { a: 'peashooter', b: 'sunflower', result: '豌豆向日葵', base: 'assets/images/Plants/SunFlower/SunFlower1.gif', over: 'assets/images/Plants/Peashooter/Peashooter.gif', overClip: 'polygon(0 0, 100% 0, 100% 65%, 0 65%)', overTransform: 'translate(0px, -20px) scale(1.0)' },
            { a: 'peashooter', b: 'wallnut', result: '坚果射手', base: 'assets/images/Plants/WallNut/WallNut.gif', over: 'assets/images/Plants/Peashooter/Peashooter.gif', overClip: 'polygon(0 0, 100% 0, 100% 65%, 0 65%)', overTransform: 'translate(5px, -15px) scale(1.0)' },
            { a: 'snowpea', b: 'cherrybomb', result: '寒冰炸弹', img: 'assets/images/Plants/CherryBomb/CherryBomb.gif', filter: 'hue-rotate(180deg) saturate(1.5)', css: false },
            { a: 'puffshroom', b: 'potatomine', result: '孢子地雷', base: 'assets/images/Plants/PotatoMine/PotatoMine.gif', over: 'assets/images/Plants/PuffShroom/PuffShroom.gif', overClip: 'polygon(0 0, 100% 0, 100% 85%, 0 85%)', overTransform: 'translate(0px, -45px) scale(0.9)' },
            { a: 'chomper', b: 'wallnut', result: '尖刺坚果', base: 'assets/images/Plants/WallNut/WallNut.gif', over: 'assets/images/Plants/Chomper/Chomper.gif', overClip: 'polygon(0 0, 100% 0, 100% 85%, 0 85%)', overTransform: 'translate(0px, -25px) scale(0.9)' },
            { a: 'snowpea', b: 'wallnut', result: '寒冰坚果', img: 'assets/images/Plants/WallNut/WallNut.gif', filter: 'hue-rotate(180deg) saturate(1.5) brightness(1.2)', css: false }
        ];"""

content = content.replace(old_recipes_list, new_recipes_list)

with open('pvz-web/js/GameLoop.js', 'w') as f:
    f.write(content)

