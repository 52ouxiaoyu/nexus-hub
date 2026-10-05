import re

with open('pvz-web/js/GameLoop.js', 'r') as f:
    content = f.read()

content = content.replace(
    "{ a: 'chomper', b: 'wallnut', result: '尖刺坚果', base: 'assets/images/Plants/WallNut/WallNut.gif', over: 'assets/images/Plants/Chomper/Chomper.gif', overClip: 'polygon(0 0, 100% 0, 100% 85%, 0 85%)', overTransform: 'translate(0px, -25px) scale(0.9)' },",
    "{ a: 'chomper', b: 'wallnut', result: '大嘴坚果', base: 'assets/images/Plants/WallNut/WallNut.gif', over: 'assets/images/Plants/Chomper/Chomper.gif', overClip: 'polygon(0 0, 100% 0, 100% 85%, 0 85%)', overTransform: 'translate(0px, -25px) scale(0.9)' },"
)

content = content.replace(
    "{ a: 'spikeweed', b: 'wallnut', result: '尖刺坚果', img: 'assets/images/Plants/WallNut/WallNut.gif', css: false },",
    "{ a: 'spikeweed', b: 'wallnut', result: '地刺坚果', base: 'assets/images/Plants/WallNut/WallNut.gif', over: 'assets/images/Plants/Spikeweed/Spikeweed.gif', overTransform: 'translate(0px, 30px) scale(1.0)' },"
)

content = content.replace(
    "{ a: 'spikerock', b: 'tallnut', result: '钢刺高坚果', img: 'assets/images/Plants/TallNut/TallNut.gif', css: false },",
    "{ a: 'spikerock', b: 'tallnut', result: '钢地刺高坚果', base: 'assets/images/Plants/TallNut/TallNut.gif', over: 'assets/images/Plants/Spikerock/Spikerock.gif', overTransform: 'translate(0px, 40px) scale(1.0)' },"
)

with open('pvz-web/js/GameLoop.js', 'w') as f:
    f.write(content)
