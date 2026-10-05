import re

with open('pvz-web/js/GameLoop.js', 'r') as f:
    content = f.read()

# Add to getPlantName
old_names = """            fusion_cherrybomb_peashooter: '樱桃射手', fusion_doomshroom_sunflower: '毁灭向日葵',
            fusion_spikerock_tallnut: '钢地刺高坚果'"""
new_names = """            fusion_cherrybomb_peashooter: '樱桃射手', fusion_doomshroom_sunflower: '毁灭向日葵',
            fusion_spikerock_tallnut: '钢地刺高坚果',
            fusion_melon_cattail: '西瓜猫尾草', fusion_wintermelon_cattail: '冰西瓜猫尾草'"""
content = content.replace(old_names, new_names)

# Add to getFusionResult
old_fusion = """        if (set.has('repeater') && set.has('spikeweed')) return 'cattail';"""
new_fusion = """        if (set.has('repeater') && set.has('spikeweed')) return 'cattail';
        if (set.has('melonpult') && set.has('cattail')) return 'fusion_melon_cattail';
        if (set.has('wintermelon') && set.has('cattail')) return 'fusion_wintermelon_cattail';"""
content = content.replace(old_fusion, new_fusion)

# Add to fusions array
old_fusions_array = """            { a: 'spikerock', b: 'tallnut', result: '钢地刺高坚果', base: 'assets/images/Plants/TallNut/TallNut.gif', over: 'assets/images/Plants/Spikerock/Spikerock.gif', overTransform: 'translate(0px, 40px) scale(1.0)' },
        ];"""
new_fusions_array = """            { a: 'spikerock', b: 'tallnut', result: '钢地刺高坚果', base: 'assets/images/Plants/TallNut/TallNut.gif', over: 'assets/images/Plants/Spikerock/Spikerock.gif', overTransform: 'translate(0px, 40px) scale(1.0)' },
            { a: 'melonpult', b: 'cattail', result: '西瓜猫尾草', base: 'assets/images/Plants/Cattail/Cattail.gif', over: 'assets/images/Plants/MelonPult/MelonPult.gif', overTransform: 'translate(0px, -20px) scale(0.7)' },
            { a: 'wintermelon', b: 'cattail', result: '冰西瓜猫尾草', base: 'assets/images/Plants/Cattail/Cattail.gif', over: 'assets/images/Plants/MelonPult/MelonPult.gif', overTransform: 'translate(0px, -20px) scale(0.7)', css: 'sepia(1) hue-rotate(180deg) saturate(2) brightness(1.2)' },
        ];"""
content = content.replace(old_fusions_array, new_fusions_array)

with open('pvz-web/js/GameLoop.js', 'w') as f:
    f.write(content)
