import re

with open('pvz-web/js/GameLoop.js', 'r') as f:
    content = f.read()

content = content.replace("'assets/images/Card/Plants/MelonPult.png'", "'assets/images/Card/Plants/Cactus.png'")
content = content.replace("img: 'assets/images/Plants/WinterMelon/WinterMelon.gif', css: false", "img: 'assets/images/Plants/Cactus/Cactus.gif', filter: 'hue-rotate(180deg) saturate(1.5) brightness(1.2)', css: false")
content = content.replace("'melonpult': 'assets/images/Plants/MelonPult/MelonPult.gif'\n                    ,'wintermelon': 'assets/images/Plants/WinterMelon/WinterMelon.gif'", "'melonpult': 'assets/images/Plants/Cactus/Cactus.gif',\n                    'wintermelon': 'assets/images/Plants/Cactus/Cactus.gif'")
content = content.replace("'melonpult': 'assets/images/Plants/MelonPult/MelonPult.gif',\n                    'wintermelon': 'assets/images/Plants/WinterMelon/WinterMelon.gif'", "'melonpult': 'assets/images/Plants/Cactus/Cactus.gif',\n                    'wintermelon': 'assets/images/Plants/Cactus/Cactus.gif'")

with open('pvz-web/js/GameLoop.js', 'w') as f:
    f.write(content)

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

content = content.replace("stat.src = 'assets/images/Plants/MelonPult/MelonPult.gif';", "stat.src = 'assets/images/Plants/Cactus/Cactus.gif';")

old_vis = """                } else if (type === 'wintermelon') {
                    this.element.src = 'assets/images/Plants/WinterMelon/WinterMelon.gif';
                }"""
new_vis = """                } else if (type === 'wintermelon') {
                    this.element.src = 'assets/images/Plants/Cactus/Cactus.gif'; // cactus
                    this.element.style.filter = 'hue-rotate(180deg) saturate(1.5) brightness(1.2)';
                }"""
content = content.replace(old_vis, new_vis)

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)

with open('pvz-web/js/entities/Projectile.js', 'r') as f:
    content = f.read()

content = content.replace("this.element.src = 'assets/images/Plants/MelonPult/Melon.gif';", "this.element.src = 'assets/images/Plants/Cactus/Projectile32.png';")
content = content.replace("this.element.src = 'assets/images/Plants/WinterMelon/Melon.gif';", "this.element.style.filter = 'hue-rotate(180deg) saturate(1.5) brightness(1.2)';")

with open('pvz-web/js/entities/Projectile.js', 'w') as f:
    f.write(content)

