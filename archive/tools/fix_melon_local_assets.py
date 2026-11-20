import re

# GameLoop.js
with open('pvz-web/js/GameLoop.js', 'r') as f:
    content = f.read()

content = content.replace("img: 'https://static.wikia.nocookie.net/plantsvszombies/images/4/4b/Melon-pult_Seed_Packet.png'", "img: 'assets/images/Card/Plants/MelonPult.png'")
content = content.replace("img: 'https://static.wikia.nocookie.net/plantsvszombies/images/3/36/Winter_Melon_anim.gif'", "img: 'assets/images/Plants/MelonPult/MelonPult.gif', filter: 'hue-rotate(200deg) saturate(1.5) brightness(1.2)'")
content = content.replace("'melonpult': 'https://static.wikia.nocookie.net/plantsvszombies/images/c/c5/Melon-pult.gif',\n                    'wintermelon': 'https://static.wikia.nocookie.net/plantsvszombies/images/3/36/Winter_Melon_anim.gif'", "'melonpult': 'assets/images/Plants/MelonPult/MelonPult.gif',\n                    'wintermelon': 'assets/images/Plants/MelonPult/MelonPult.gif'")

with open('pvz-web/js/GameLoop.js', 'w') as f:
    f.write(content)

# Plant.js
with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

content = content.replace("stat.src = 'https://static.wikia.nocookie.net/plantsvszombies/images/c/c5/Melon-pult.gif';", "stat.src = 'assets/images/Plants/MelonPult/MelonPult.gif';")
content = content.replace("stat.src = 'https://static.wikia.nocookie.net/plantsvszombies/images/3/36/Winter_Melon_anim.gif';", "stat.src = 'assets/images/Plants/MelonPult/MelonPult.gif';")

old_vis = """                } else if (type === 'wintermelon') {
                    this.element.src = 'https://static.wikia.nocookie.net/plantsvszombies/images/3/36/Winter_Melon_anim.gif';
                }"""
new_vis = """                } else if (type === 'wintermelon') {
                    this.element.src = 'assets/images/Plants/MelonPult/MelonPult.gif';
                    this.element.style.filter = 'hue-rotate(200deg) saturate(1.5) brightness(1.2)';
                }"""
content = content.replace(old_vis, new_vis)

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)

# Projectile.js
with open('pvz-web/js/entities/Projectile.js', 'r') as f:
    content = f.read()

old_proj_melon = """        } else if (type === 'melon') {
            this.element.src = 'https://static.wikia.nocookie.net/plantsvszombies/images/1/13/Melon.png';
            this.damage = 60;"""
new_proj_melon = """        } else if (type === 'melon') {
            this.element.src = 'assets/images/Plants/MelonPult/Melon.gif';
            this.element.style.transform = 'scale(0.5)';
            this.damage = 60;"""
content = content.replace(old_proj_melon, new_proj_melon)

old_proj_winter = """        } else if (type === 'wintermelon') {
            this.element.src = 'https://static.wikia.nocookie.net/plantsvszombies/images/f/f6/WinterMelon.png';
            this.damage = 60;"""
new_proj_winter = """        } else if (type === 'wintermelon') {
            this.element.src = 'assets/images/Plants/MelonPult/Melon.gif';
            this.element.style.transform = 'scale(0.5)';
            this.element.style.filter = 'hue-rotate(200deg) saturate(1.5) brightness(1.2)';
            this.damage = 60;"""
content = content.replace(old_proj_winter, new_proj_winter)

with open('pvz-web/js/entities/Projectile.js', 'w') as f:
    f.write(content)

