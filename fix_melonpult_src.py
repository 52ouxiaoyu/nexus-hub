import re
with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

old_block = """        } else if (type === 'melonpult') {
            stat.hp = 300;
            stat.fireRate = 1.0;
            stat.fireTimer = 0;
            stat.src = 'https://static.wikia.nocookie.net/plantsvszombies/images/3/36/Winter_Melon_anim.gif';
        } else if (type === 'wintermelon') {"""

new_block = """        } else if (type === 'melonpult') {
            stat.hp = 300;
            stat.fireRate = 1.0;
            stat.fireTimer = 0;
            stat.src = 'https://static.wikia.nocookie.net/plantsvszombies/images/c/c5/Melon-pult.gif';
        } else if (type === 'wintermelon') {"""

content = content.replace(old_block, new_block)

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)
