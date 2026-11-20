import re

with open('pvz-web/js/GameLoop.js', 'r') as f:
    content = f.read()

content = content.replace("overClip: 'polygon(30% 0%, 100% 0%, 100% 45%, 30% 45%)', overTransform: 'translate(-2px, -8px) scale(0.9)'", "overClip: 'polygon(0 0, 100% 0, 100% 65%, 0 65%)', overTransform: 'translate(0px, -20px) scale(1.0)'")
content = content.replace("overClip: 'polygon(30% 0%, 100% 0%, 100% 45%, 30% 45%)', overTransform: 'translate(10px, 5px) scale(0.9)'", "overClip: 'polygon(0 0, 100% 0, 100% 65%, 0 65%)', overTransform: 'translate(5px, -15px) scale(1.0)'")
content = content.replace("overClip: 'polygon(0 0, 100% 0, 100% 60%, 0 60%)', overTransform: 'translate(0px, -30px) scale(0.85)'", "overClip: 'polygon(0 0, 100% 0, 100% 85%, 0 85%)', overTransform: 'translate(0px, -25px) scale(0.9)'")

with open('pvz-web/js/GameLoop.js', 'w') as f:
    f.write(content)

