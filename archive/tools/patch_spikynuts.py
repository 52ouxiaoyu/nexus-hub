import re

with open('pvz-web/js/GameLoop.js', 'r') as f:
    content = f.read()

# Add to getFusionResult
old_fusion = """        if (set.has('peashooter') && set.has('sunflower')) return 'fusion_peaflower';"""
new_fusion = """        if (set.has('peashooter') && set.has('sunflower')) return 'fusion_peaflower';
        if (set.has('spikeweed') && set.has('wallnut')) return 'fusion_spikynut';
        if (set.has('spikerock') && set.has('tallnut')) return 'fusion_spikerock_tallnut';"""
content = content.replace(old_fusion, new_fusion)

# Remove the old fusion_spikynut if it was wallnut+chomper (I saw this earlier)
old_chomper = """        if (set.has('wallnut') && set.has('chomper')) return 'fusion_spikynut';"""
new_chomper = """"""
content = content.replace(old_chomper, new_chomper)

# Add to names
old_names = """            fusion_cherrybomb_peashooter: '樱桃射手', fusion_doomshroom_sunflower: '毁灭向日葵'
        };"""
new_names = """            fusion_cherrybomb_peashooter: '樱桃射手', fusion_doomshroom_sunflower: '毁灭向日葵',
            fusion_spikerock_tallnut: '钢刺高坚果'
        };"""
content = content.replace(old_names, new_names)

with open('pvz-web/js/GameLoop.js', 'w') as f:
    f.write(content)

