import re

with open('pvz-web/js/HauntedDorm.js', 'r') as f:
    content = f.read()

old_ai_label = """`<div style="position:absolute; top:-25px; left:50%; transform:translateX(-50%); color:${color}; font-size:16px; font-weight:bold; text-shadow:1px 1px 2px black, -1px -1px 2px black; white-space:nowrap;">人机 - ${ai.roleDef.name}</div>`;"""
new_ai_label = """`<div style="position:absolute; top:-35px; left:50%; transform:translateX(-50%); color:${color}; font-size:18px; font-weight:bold; text-shadow:1px 1px 2px black, -1px -1px 2px black; white-space:nowrap;">人机 - ${ai.roleDef.name}</div>`;"""
content = content.replace(old_ai_label, new_ai_label)

with open('pvz-web/js/HauntedDorm.js', 'w') as f:
    f.write(content)
