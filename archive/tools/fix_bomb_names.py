import re

with open('pvz-web/js/GameLoop.js', 'r') as f:
    content = f.read()

content = content.replace("fusion_cherry_peashooter", "fusion_cherrybomb_peashooter")
content = content.replace("fusion_doom_sunflower", "fusion_doomshroom_sunflower")

with open('pvz-web/js/GameLoop.js', 'w') as f:
    f.write(content)

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

content = content.replace("fusionResult = 'fusion_cherry_peashooter'", "fusionResult = 'fusion_cherrybomb_peashooter'")
content = content.replace("fusionResult = 'fusion_doom_sunflower'", "fusionResult = 'fusion_doomshroom_sunflower'")

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)

