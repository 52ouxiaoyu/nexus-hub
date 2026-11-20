import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

content = content.replace("else if (type === 'fusion_spikynut') { p1 = 'chomper'; p2 = 'wallnut'; }", "else if (type === 'fusion_spikynut') { p1 = 'spikeweed'; p2 = 'wallnut'; }")
content = content.replace("else if (type === 'fusion_chompernut') { p1 = 'chomper'; p2 = 'wallnut'; }", "else if (type === 'fusion_chompernut') { p1 = 'chomper'; p2 = 'wallnut'; }") # just to be sure it exists

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)

