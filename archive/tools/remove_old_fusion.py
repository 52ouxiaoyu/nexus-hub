import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

old_fusion = r"if \(this.fusionTarget && !this.fusionTarget.isDead\) {[\s\S]*?setTimeout\(\(\) => { this.hp = 0; }, 500\);"
new_fusion = "setTimeout(() => { this.hp = 0; }, 500);"

content = re.sub(old_fusion, new_fusion, content)

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)

