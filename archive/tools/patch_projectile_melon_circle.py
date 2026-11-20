import re

with open('pvz-web/js/entities/Projectile.js', 'r') as f:
    content = f.read()

# Add border-radius to melon projectiles
old_melon1 = """        } else if (type === 'melon') {
            this.element.src = 'assets/images/Plants/MelonPult/Melon.gif';
            this.element.style.transform = 'scale(1.0)';
            this.damage = 60;"""
new_melon1 = """        } else if (type === 'melon') {
            this.element.src = 'assets/images/Plants/MelonPult/Melon.gif';
            this.element.style.transform = 'scale(1.0)';
            this.element.style.borderRadius = '50%';
            this.damage = 60;"""
            
old_melon2 = """        } else if (type === 'wintermelon') {
            this.element.src = 'assets/images/Plants/MelonPult/Melon.gif';
            this.element.style.transform = 'scale(1.0)';
            this.element.style.filter = 'sepia(1) hue-rotate(180deg) saturate(2) brightness(1.2)';
            this.damage = 60;"""
new_melon2 = """        } else if (type === 'wintermelon') {
            this.element.src = 'assets/images/Plants/MelonPult/Melon.gif';
            this.element.style.transform = 'scale(1.0)';
            this.element.style.borderRadius = '50%';
            this.element.style.filter = 'sepia(1) hue-rotate(180deg) saturate(2) brightness(1.2)';
            this.damage = 60;"""
            
old_melon3 = """        } else if (type === 'cattail_melon') {
            this.element.src = 'assets/images/Plants/MelonPult/Melon.gif';
            this.element.style.transform = 'scale(0.8)';
            this.damage = 60;"""
new_melon3 = """        } else if (type === 'cattail_melon') {
            this.element.src = 'assets/images/Plants/MelonPult/Melon.gif';
            this.element.style.transform = 'scale(0.8)';
            this.element.style.borderRadius = '50%';
            this.damage = 60;"""

old_melon4 = """        } else if (type === 'cattail_wintermelon') {
            this.element.src = 'assets/images/Plants/MelonPult/Melon.gif';
            this.element.style.transform = 'scale(0.8)';
            this.element.style.filter = 'sepia(1) hue-rotate(180deg) saturate(2) brightness(1.2)';
            this.damage = 60;"""
new_melon4 = """        } else if (type === 'cattail_wintermelon') {
            this.element.src = 'assets/images/Plants/MelonPult/Melon.gif';
            this.element.style.transform = 'scale(0.8)';
            this.element.style.borderRadius = '50%';
            this.element.style.filter = 'sepia(1) hue-rotate(180deg) saturate(2) brightness(1.2)';
            this.damage = 60;"""

content = content.replace(old_melon1, new_melon1)
content = content.replace(old_melon2, new_melon2)
content = content.replace(old_melon3, new_melon3)
content = content.replace(old_melon4, new_melon4)

with open('pvz-web/js/entities/Projectile.js', 'w') as f:
    f.write(content)
