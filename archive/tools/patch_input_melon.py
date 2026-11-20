import re

with open('pvz-web/js/InputManager.js', 'r') as f:
    content = f.read()

old_mapping = """            else if (type === 'garlic') imgName = 'Garlic/Garlic';"""
new_mapping = """            else if (type === 'garlic') imgName = 'Garlic/Garlic';
            else if (type === 'melonpult') imgName = 'MelonPult/MelonPult';
            else if (type === 'wintermelon') imgName = 'MelonPult/MelonPult';
            else if (type === 'cattail') imgName = 'Cattail/Cattail';"""
content = content.replace(old_mapping, new_mapping)

with open('pvz-web/js/InputManager.js', 'w') as f:
    f.write(content)

