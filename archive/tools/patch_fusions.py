import re

with open('pvz-web/js/HauntedDorm.js', 'r') as f:
    content = f.read()

# 1. Update DEFS with new sunflower chain
old_twinsun = """            twinsunflower: { name: '双子向日葵', img: 'Plants/TwinSunflower/0.gif', hp: 450,  cost: 0,   scale: 1.2,
                             produce: { sun: 10, every: 7 } },"""

new_twinsun = """            twinsunflower: { name: '双子向日葵', img: 'Plants/TwinSunflower/0.gif', hp: 450,  cost: 0,   scale: 1.2,
                             produce: { sun: 10, every: 7 }, up: { cost: 400, cur: 'sun', to: 'sunpea' } },
            sunpea:        { name: '向日葵豌豆', img: 'Plants/TwinSunflower/0.gif', hp: 550, cost: 0, scale: 1.2,
                             overlay: 'Plants/Peashooter/0.gif',
                             produce: { sun: 15, every: 6 }, shoot: { dmg: 20, cd: 1.5, n: 1, range: 320, img: 'Plants/PB00.gif' }, 
                             up: { cost: 800, cur: 'sun', to: 'doompeaflower' } },
            doompeaflower: { name: '毁灭菇向日葵双向', img: 'Plants/TwinSunflower/0.gif', hp: 700, cost: 0, scale: 1.3, tint: 'hue-rotate(240deg)',
                             overlay: 'Plants/SplitPea/0.gif', hat: 'Plants/DoomShroom/0.gif',
                             produce: { sun: 20, every: 5 }, shoot: { dmg: 40, cd: 1.2, n: 2, range: 400, img: 'Plants/PB00.gif', back: true }, 
                             up: { cost: 1600, cur: 'sun', to: 'sunsplitnut' } },
            sunsplitnut:   { name: '向日葵双向坚果', img: 'Plants/WallNut/0.gif', hp: 6000, cost: 0, scale: 1.4,
                             overlay: 'Plants/TwinSunflower/0.gif', hat: 'Plants/SplitPea/0.gif',
                             produce: { sun: 30, every: 4 }, shoot: { dmg: 40, cd: 1.0, n: 3, range: 400, img: 'Plants/PB00.gif', back: true },
                             up: { cost: 3200, cur: 'sun', to: 'quadsunflower' } },
            quadsunflower: { name: '四头向日葵', img: 'Plants/TwinSunflower/0.gif', hp: 10000, cost: 0, scale: 1.6, tint: 'brightness(1.5)',
                             overlays: ['Plants/TwinSunflower/0.gif'],
                             produce: { sun: 60, every: 3 }, shoot: { dmg: 50, cd: 0.8, n: 4, range: 500, img: 'Plants/PB00.gif', homing: true } },"""

content = content.replace(old_twinsun, new_twinsun)

# 2. Update spawnPlant rendering to support overlays array and better hat positioning
old_overlay = """        if (def.overlay) {
            inner += `<img src="assets/images/${def.overlay}" style="position:absolute; left:50%; top:50%; width:100%; height:100%; object-fit:contain; pointer-events:none; transform: translate(-50%, -50%) translate(2px, -26px) scale(0.6);">`;
        }
        if (def.hat) {
            inner += `<img src="assets/images/${def.hat}" style="position:absolute; left:22%; top:-34%; width:56%; pointer-events:none;">`;
        }"""

new_overlay = """        if (def.overlay) {
            inner += `<img src="assets/images/${def.overlay}" style="position:absolute; left:50%; top:50%; width:100%; height:100%; object-fit:contain; pointer-events:none; transform: translate(-50%, -50%) translate(2px, -26px) scale(0.6);">`;
        }
        if (def.overlays) {
            def.overlays.forEach((ov, i) => {
                inner += `<img src="assets/images/${ov}" style="position:absolute; left:50%; top:50%; width:100%; height:100%; object-fit:contain; pointer-events:none; transform: translate(-50%, -50%) translate(${10 + i*15}px, ${-15 - i*10}px) scale(0.6);">`;
            });
        }
        if (def.hat) {
            inner += `<img src="assets/images/${def.hat}" style="position:absolute; left:50%; top:50%; width:100%; height:100%; object-fit:contain; pointer-events:none; transform: translate(-50%, -50%) translate(0, -45px) scale(0.5);">`;
        }"""

content = content.replace(old_overlay, new_overlay)

with open('pvz-web/js/HauntedDorm.js', 'w') as f:
    f.write(content)
