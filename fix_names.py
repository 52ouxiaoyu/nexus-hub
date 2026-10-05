import re

with open('pvz-web/js/GameLoop.js', 'r') as f:
    content = f.read()

content = content.replace("'冰霜樱桃炸弹'", "'寒冰炸弹'")

with open('pvz-web/js/GameLoop.js', 'w') as f:
    f.write(content)

