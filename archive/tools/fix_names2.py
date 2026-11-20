import re

with open('pvz-web/js/GameLoop.js', 'r') as f:
    content = f.read()

new_names = """    getPlantName(type) {
        const names = {
            sunflower: '向日葵', peashooter: '豌豆射手', wallnut: '坚果墙', cherrybomb: '樱桃炸弹',
            snowpea: '寒冰射手', repeater: '双发射手', squash: '窝瓜', jalapeno: '火爆辣椒',
            potatomine: '土豆地雷', chomper: '大嘴花', tallnut: '高坚果', puffshroom: '小喷菇',
            fumeshroom: '大喷菇', sunshroom: '阳光菇', scaredyshroom: '胆小菇', iceshroom: '寒冰菇',
            doomshroom: '毁灭菇', spikeweed: '地刺', threepeater: '三线射手', splitpea: '裂荚射手',
            gatlingpea: '机枪射手', twinsunflower: '双子向日葵', torchwood: '火炬树桩', garlic: '大蒜',
            fusion_peaflower: '豌豆向日葵', fusion_nutshooter: '坚果射手', fusion_frostbomb: '冰霜樱桃炸弹',
            fusion_sporemine: '孢子地雷', fusion_spikynut: '尖刺坚果', fusion_snownut: '寒冰坚果'
        };
        return names[type] || type;
    }"""

# Replace from `getPlantName(type) {` up to the closing `}`
pattern = r"    getPlantName\(type\) \{[\s\S]*?return names\[type\] \|\| type;\n    \}"
content = re.sub(pattern, new_names, content)

with open('pvz-web/js/GameLoop.js', 'w') as f:
    f.write(content)
