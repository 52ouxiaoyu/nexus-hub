import re

with open('pvz-web/js/GameLoop.js', 'r') as f:
    content = f.read()

content = content.replace("'assets/images/Card/Plants/Cactus.png'", "'https://static.wikia.nocookie.net/plantsvszombies/images/4/4b/Melon-pult_Seed_Packet.png'")
content = content.replace("img: 'assets/images/Plants/Cactus/Cactus.gif', filter: 'hue-rotate(180deg) saturate(1.5) brightness(1.2)'", "img: 'https://static.wikia.nocookie.net/plantsvszombies/images/3/36/Winter_Melon_anim.gif'")
content = content.replace("'melonpult': 'assets/images/Plants/Cactus/Cactus.gif',\n                    'wintermelon': 'assets/images/Plants/Cactus/Cactus.gif'", "'melonpult': 'https://static.wikia.nocookie.net/plantsvszombies/images/c/c5/Melon-pult.gif',\n                    'wintermelon': 'https://static.wikia.nocookie.net/plantsvszombies/images/3/36/Winter_Melon_anim.gif'")

with open('pvz-web/js/GameLoop.js', 'w') as f:
    f.write(content)

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

content = content.replace("stat.src = 'assets/images/Plants/Cactus/Cactus.gif';", "stat.src = 'https://static.wikia.nocookie.net/plantsvszombies/images/c/c5/Melon-pult.gif';")

old_vis = """                } else if (type === 'wintermelon') {
                    this.element.src = 'assets/images/Plants/Cactus/Cactus.gif'; // cactus
                    this.element.style.filter = 'hue-rotate(180deg) saturate(1.5) brightness(1.2)';
                }"""
new_vis = """                } else if (type === 'wintermelon') {
                    this.element.src = 'https://static.wikia.nocookie.net/plantsvszombies/images/3/36/Winter_Melon_anim.gif';
                }"""
content = content.replace(old_vis, new_vis)

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)

with open('pvz-web/js/entities/Projectile.js', 'r') as f:
    content = f.read()

old_proj_melon = """        } else if (type === 'melon') {
            this.element.src = 'assets/images/Plants/Cactus/Projectile32.png';
            this.element.style.transform = 'scale(1.5)';
            this.damage = 60;"""
new_proj_melon = """        } else if (type === 'melon') {
            this.element.src = 'https://static.wikia.nocookie.net/plantsvszombies/images/1/13/Melon.png';
            this.damage = 60;"""
content = content.replace(old_proj_melon, new_proj_melon)

old_proj_winter = """        } else if (type === 'wintermelon') {
            this.element.src = 'assets/images/Plants/Cactus/Projectile32.png';
            this.element.style.transform = 'scale(1.5)';
            this.element.style.filter = 'hue-rotate(180deg) saturate(1.5) brightness(1.2)';
            this.damage = 60;"""
new_proj_winter = """        } else if (type === 'wintermelon') {
            this.element.src = 'https://static.wikia.nocookie.net/plantsvszombies/images/f/f6/WinterMelon.png';
            this.damage = 60;"""
content = content.replace(old_proj_winter, new_proj_winter)

with open('pvz-web/js/entities/Projectile.js', 'w') as f:
    f.write(content)

