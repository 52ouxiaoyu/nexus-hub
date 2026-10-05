import re

with open('pvz-web/js/GameLoop.js', 'r') as f:
    content = f.read()

content = content.replace("translate(0px, 30px)", "translate(0px, 40px)")

with open('pvz-web/js/GameLoop.js', 'w') as f:
    f.write(content)
