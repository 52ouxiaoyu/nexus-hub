import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.readlines()

# Insert the missing brace before the sunflower block!
# Line 366 is blank. Line 365 is `        }`
content.insert(365, "            }\n")

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.writelines(content)

