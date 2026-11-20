import re

with open('pvz-web/js/GameLoop.js', 'r') as f:
    content = f.read()

content = content.replace("fusion_spikynut: '尖刺坚果'", "fusion_spikynut: '地刺坚果'")
content = content.replace("fusion_spikerock_tallnut: '钢刺高坚果'", "fusion_spikerock_tallnut: '钢地刺高坚果'")

with open('pvz-web/js/GameLoop.js', 'w') as f:
    f.write(content)

