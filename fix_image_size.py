import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

old_logic = """            if (customImages[type]) {
                // Use custom single sprite!
                this.element.src = customImages[type];
                this.element.style.transform = 'scale(0.8)'; // AI images are a bit big
            }"""

new_logic = """            if (customImages[type]) {
                // Use custom single sprite!
                this.element.src = customImages[type];
                this.element.style.width = '70px';
                this.element.style.height = '70px';
                this.element.style.objectFit = 'contain';
                this.element.style.transform = 'scale(1.2)';
            }"""

content = content.replace(old_logic, new_logic)

# Delete the fake sporemine image that was scraped as JPG
import os
if os.path.exists('pvz-web/assets/images/Plants/Fusions/sporemine.png'):
    os.remove('pvz-web/assets/images/Plants/Fusions/sporemine.png')

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)
