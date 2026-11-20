import re

with open('pvz-web/js/GameLoop.js', 'r') as f:
    content = f.read()

# Remove the requested plants from the seed array
to_remove = [
    "{ type: 'snowpea', cost: 175, cooldown: 7.5, img: 'assets/images/Card/Plants/SnowPea.png' },\n",
    "{ type: 'splitpea', cost: 125, cooldown: 7.5, img: 'assets/images/Card/Plants/SplitPea.png' },\n",
    "{ type: 'gatlingpea', cost: 250, cooldown: 50, img: 'assets/images/Card/Plants/GatlingPea.png' },\n",
    "{ type: 'fumeshroom', cost: 75, cooldown: 7.5, img: 'assets/images/Card/Plants/FumeShroom.png' },\n",
    "{ type: 'sunshroom', cost: 25, cooldown: 7.5, img: 'assets/images/Card/Plants/SunShroom.png' },\n",
    "{ type: 'scaredyshroom', cost: 25, cooldown: 7.5, img: 'assets/images/Card/Plants/ScaredyShroom.png' },\n",
    "{ type: 'twinsunflower', cost: 150, cooldown: 50, img: 'assets/images/Card/Plants/TwinSunflower.png' },\n"
]

for s in to_remove:
    # Use spaces carefully, might need regex if indentation varies.
    content = re.sub(r'\s*' + re.escape(s), '', content)

with open('pvz-web/js/GameLoop.js', 'w') as f:
    f.write(content)

