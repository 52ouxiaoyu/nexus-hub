import re

with open('pvz-web/js/managers/CollisionManager.js', 'r') as f:
    content = f.read()

old_ignore = """if (p.row === z.row && p.type !== 'cattail') {"""
new_ignore = """if (p.row === z.row && p.type !== 'cattail' && p.type !== 'gloom_puff') {"""
content = content.replace(old_ignore, new_ignore)

with open('pvz-web/js/managers/CollisionManager.js', 'w') as f:
    f.write(content)
