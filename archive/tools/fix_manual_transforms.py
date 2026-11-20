import re

with open('pvz-web/js/GameLoop.js', 'r') as f:
    content = f.read()

# Replace the pixel translates in the recipe manual with relative/adjusted values
# Peaflower: 0, -20px -> 0, -15px
content = content.replace("overTransform: 'translate(0px, -20px) scale(1.0)'", "overTransform: 'translate(0px, -15px) scale(1.0)'")

# Nutshooter: 5px, -15px -> 5px, -10px
content = content.replace("overTransform: 'translate(5px, -15px) scale(1.0)'", "overTransform: 'translate(5px, -10px) scale(1.0)'")

# Sporemine: 0, -45px -> 0, -20px (since potato is 50px tall, -20px puts it nicely on top)
content = content.replace("overTransform: 'translate(0px, -45px) scale(0.9)'", "overTransform: 'translate(0px, -20px) scale(0.9)'")

# Spikynut: 0, -25px -> 0, -15px
content = content.replace("overTransform: 'translate(0px, -25px) scale(0.9)'", "overTransform: 'translate(0px, -15px) scale(0.9)'")

with open('pvz-web/js/GameLoop.js', 'w') as f:
    f.write(content)

