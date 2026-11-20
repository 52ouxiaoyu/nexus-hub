import re

with open('pvz-web/js/GameLoop.js', 'r') as f:
    content = f.read()

content = content.replace("RepeaterPea/RepeaterPea.gif", "Repeater/Repeater.gif")

with open('pvz-web/js/GameLoop.js', 'w') as f:
    f.write(content)

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

content = content.replace("RepeaterPea/RepeaterPea.gif", "Repeater/Repeater.gif")

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)

