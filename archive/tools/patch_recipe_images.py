import re

with open('pvz-web/js/GameLoop.js', 'r') as f:
    content = f.read()

old_getImg = """            const getImg = (t) => {
                const s = this.seeds.find(x => x.type === t);
                if (s) return s.img;
                if (t === 'chomper') return 'assets/images/Plants/Chomper/Chomper.gif';
                return '';
            };"""

new_getImg = """            const getImg = (t) => {
                const map = {
                    'peashooter': 'assets/images/Plants/Peashooter/Peashooter.gif',
                    'sunflower': 'assets/images/Plants/SunFlower/SunFlower1.gif',
                    'wallnut': 'assets/images/Plants/WallNut/WallNut.gif',
                    'snowpea': 'assets/images/Plants/SnowPea/SnowPea.gif',
                    'cherrybomb': 'assets/images/Plants/CherryBomb/CherryBomb.gif',
                    'puffshroom': 'assets/images/Plants/PuffShroom/PuffShroom.gif',
                    'potatomine': 'assets/images/Plants/PotatoMine/PotatoMine.gif',
                    'chomper': 'assets/images/Plants/Chomper/Chomper.gif'
                };
                return map[t] || '';
            };"""

content = content.replace(old_getImg, new_getImg)

with open('pvz-web/js/GameLoop.js', 'w') as f:
    f.write(content)
