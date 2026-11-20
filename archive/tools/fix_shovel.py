import re

with open('pvz-web/index.html', 'r') as f:
    content = f.read()

old_shovel = """                <div id="shovel-bank">
                    <img src="assets/images/interface/Shovel.png" id="shovel" title="铲子">
                </div>"""

new_shovel = """                <div id="shovel-bank">
                    <div id="shovel" class="tool-card" title="铲子"></div>
                </div>"""

content = content.replace(old_shovel, new_shovel)
with open('pvz-web/index.html', 'w') as f:
    f.write(content)
