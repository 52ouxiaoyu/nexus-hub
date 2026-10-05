import re

with open('pvz-web/js/GameLoop.js', 'r') as f:
    content = f.read()

# Add -webkit-clip-path for Safari compatibility
content = content.replace("clip-path: ${r.overClip};", "clip-path: ${r.overClip}; -webkit-clip-path: ${r.overClip};")

with open('pvz-web/js/GameLoop.js', 'w') as f:
    f.write(content)

