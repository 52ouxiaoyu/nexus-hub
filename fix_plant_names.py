import re

with open('pvz-web/js/GameLoop.js', 'r') as f:
    content = f.read()

old_names = """            fusion_peaflower: '豌豆向日葵', fusion_nutshooter: '坚果射手', fusion_frostbomb: '寒冰炸弹',
            fusion_sporemine: '孢子地雷', fusion_spikynut: '尖刺坚果', fusion_snownut: '寒冰坚果'
        };"""

new_names = """            fusion_peaflower: '豌豆向日葵', fusion_nutshooter: '坚果射手', fusion_frostbomb: '寒冰炸弹',
            fusion_sporemine: '孢子地雷', fusion_spikynut: '尖刺坚果', fusion_snownut: '寒冰坚果',
            fusion_cherrybomb_peashooter: '樱桃射手', fusion_doomshroom_sunflower: '毁灭向日葵'
        };"""

content = content.replace(old_names, new_names)

with open('pvz-web/js/GameLoop.js', 'w') as f:
    f.write(content)

