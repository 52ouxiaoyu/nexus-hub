import re

with open('pvz-web/js/entities/Projectile.js', 'r') as f:
    content = f.read()

old_filter = """            this.element.style.filter = 'hue-rotate(200deg) saturate(1.5) brightness(1.2)';"""
new_filter = """            this.element.style.filter = 'sepia(1) hue-rotate(180deg) saturate(2) brightness(1.2)';"""
content = content.replace(old_filter, new_filter)

with open('pvz-web/js/entities/Projectile.js', 'w') as f:
    f.write(content)
