import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

old_stats = """        } else if (type === 'torchwood') {
            stat.hp = 300;
            stat.src = 'assets/images/Plants/Torchwood/Torchwood.gif';
        }"""

new_stats = """        } else if (type === 'torchwood') {
            stat.hp = 300;
            stat.src = 'assets/images/Plants/Torchwood/Torchwood.gif';
        } else if (type === 'melonpult') {
            stat.hp = 300;
            stat.fireRate = 1.0;
            stat.fireTimer = 0;
            stat.src = 'assets/images/Plants/Cactus/Cactus.gif';
        } else if (type === 'wintermelon') {
            stat.hp = 300;
            stat.fireRate = 1.0;
            stat.fireTimer = 0;
            stat.src = 'assets/images/Plants/Cactus/Cactus.gif';
        }"""

content = content.replace(old_stats, new_stats)

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)

