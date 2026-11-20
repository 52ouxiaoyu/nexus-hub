import re

with open('pvz-web/js/GameLoop.js', 'r') as f:
    content = f.read()

content = content.replace("'assets/images/Card/Plants/Cactus.png'", "'assets/images/Card/Plants/MelonPult.png'")
content = content.replace("img: 'assets/images/Plants/Cactus/Cactus.gif', filter: 'hue-rotate(180deg) saturate(1.5) brightness(1.2)'", "img: 'assets/images/Plants/WinterMelon/WinterMelon.gif', css: false")
content = content.replace("'melonpult': 'assets/images/Plants/Cactus/Cactus.gif'", "'melonpult': 'assets/images/Plants/MelonPult/MelonPult.gif'\n                    ,'wintermelon': 'assets/images/Plants/WinterMelon/WinterMelon.gif'")

with open('pvz-web/js/GameLoop.js', 'w') as f:
    f.write(content)

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

content = content.replace("stat.src = 'assets/images/Plants/Cactus/Cactus.gif';", "stat.src = 'assets/images/Plants/MelonPult/MelonPult.gif';")

old_vis = """                } else if (type === 'wintermelon') {
                    this.element.src = s1.src; // cactus
                    this.element.style.filter = 'hue-rotate(180deg) saturate(1.5) brightness(1.2)';
                }"""
new_vis = """                } else if (type === 'wintermelon') {
                    this.element.src = 'assets/images/Plants/WinterMelon/WinterMelon.gif';
                }"""
content = content.replace(old_vis, new_vis)

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)

with open('pvz-web/js/entities/Projectile.js', 'r') as f:
    content = f.read()

content = content.replace("this.element.src = 'assets/images/Plants/Cactus/Projectile32.png';", "this.element.src = 'assets/images/Plants/MelonPult/Melon.gif';")
content = content.replace("this.element.style.filter = 'hue-rotate(180deg) saturate(1.5) brightness(1.2)';", "this.element.src = 'assets/images/Plants/WinterMelon/Melon.gif';")

with open('pvz-web/js/entities/Projectile.js', 'w') as f:
    f.write(content)

