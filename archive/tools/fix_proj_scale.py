import re

with open('pvz-web/js/entities/Projectile.js', 'r') as f:
    content = f.read()

# For normal melon
old_melon = """        } else if (type === 'melon') {
            this.element.src = 'assets/images/Plants/MelonPult/Melon.gif';
            this.element.style.transform = 'scale(0.5)';
            this.damage = 60;"""
new_melon = """        } else if (type === 'melon') {
            this.element.src = 'assets/images/Plants/MelonPult/Melon.gif';
            this.element.style.transform = 'scale(1.0)';
            this.damage = 60;"""
content = content.replace(old_melon, new_melon)

# For winter melon
old_winter = """        } else if (type === 'wintermelon') {
            this.element.src = 'assets/images/Plants/MelonPult/Melon.gif';
            this.element.style.transform = 'scale(0.5)';
            this.element.style.filter = 'hue-rotate(200deg) saturate(1.5) brightness(1.2)';
            this.damage = 60;"""
new_winter = """        } else if (type === 'wintermelon') {
            this.element.src = 'assets/images/Plants/MelonPult/Melon.gif';
            this.element.style.transform = 'scale(1.0)';
            this.element.style.filter = 'hue-rotate(200deg) saturate(1.5) brightness(1.2)';
            this.damage = 60;"""
content = content.replace(old_winter, new_winter)

with open('pvz-web/js/entities/Projectile.js', 'w') as f:
    f.write(content)
