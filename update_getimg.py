import re

with open('pvz-web/js/GameLoop.js', 'r') as f:
    content = f.read()

old_map = """                    'potatomine': 'assets/images/Plants/PotatoMine/PotatoMine.gif',
                    'chomper': 'assets/images/Plants/Chomper/Chomper.gif'
                };"""

new_map = """                    'potatomine': 'assets/images/Plants/PotatoMine/PotatoMine.gif',
                    'chomper': 'assets/images/Plants/Chomper/Chomper.gif',
                    'repeater': 'assets/images/Plants/RepeaterPea/RepeaterPea.gif',
                    'iceshroom': 'assets/images/Plants/IceShroom/IceShroom.gif',
                    'squash': 'assets/images/Plants/Squash/Squash.gif',
                    'doomshroom': 'assets/images/Plants/DoomShroom/DoomShroom.gif',
                    'jalapeno': 'assets/images/Plants/Jalapeno/Jalapeno.gif'
                };"""

content = content.replace(old_map, new_map)

with open('pvz-web/js/GameLoop.js', 'w') as f:
    f.write(content)

