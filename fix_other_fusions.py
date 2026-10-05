import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

old_peaflower = """                if (type === 'fusion_peaflower') {
                    // Sunflower body, Peashooter snout on the face
                    this.element.src = s2.src;
                    this.fusionOverlay.src = s1.src;
                    // Clip out just the Peashooter head/snout (roughly top 40%, right 60%)
                    this.fusionOverlay.style.clipPath = 'polygon(30% 0%, 100% 0%, 100% 45%, 30% 45%)';
                    this.fusionOverlay.style.transform = 'translate(-2px, -8px) scale(0.9)';"""

new_peaflower = """                if (type === 'fusion_peaflower') {
                    this.element.src = s2.src;
                    this.fusionOverlay.src = s1.src;
                    // Keep the entire Peashooter head (remove just the stem)
                    this.fusionOverlay.style.clipPath = 'polygon(0 0, 100% 0, 100% 65%, 0 65%)';
                    this.fusionOverlay.style.transform = 'translate(0px, -20px) scale(1.0)';"""

content = content.replace(old_peaflower, new_peaflower)

old_nutshooter = """                } else if (type === 'fusion_nutshooter') {
                    // Wallnut body, Peashooter snout on the face
                    this.element.src = s2.src;
                    this.fusionOverlay.src = s1.src;
                    // Same clip path for the snout
                    this.fusionOverlay.style.clipPath = 'polygon(30% 0%, 100% 0%, 100% 45%, 30% 45%)';
                    this.fusionOverlay.style.transform = 'translate(10px, 5px) scale(0.9)';"""

new_nutshooter = """                } else if (type === 'fusion_nutshooter') {
                    this.element.src = s2.src;
                    this.fusionOverlay.src = s1.src;
                    // Keep the entire Peashooter head
                    this.fusionOverlay.style.clipPath = 'polygon(0 0, 100% 0, 100% 65%, 0 65%)';
                    this.fusionOverlay.style.transform = 'translate(5px, -15px) scale(1.0)';"""

content = content.replace(old_nutshooter, new_nutshooter)

old_spikynut = """                } else if (type === 'fusion_spikynut') {
                    this.element.src = s2.src;
                    this.fusionOverlay.src = s1.src;
                    this.fusionOverlay.style.clipPath = 'polygon(0 0, 100% 0, 100% 60%, 0 60%)'; 
                    // Chomper head worn as a large hat on Wallnut. Chomper is big, so scale down slightly and move up
                    this.fusionOverlay.style.transform = 'translate(0px, -30px) scale(0.85)';"""

new_spikynut = """                } else if (type === 'fusion_spikynut') {
                    this.element.src = s2.src;
                    this.fusionOverlay.src = s1.src;
                    // Chomper has a huge head/jaw, keep almost all of it
                    this.fusionOverlay.style.clipPath = 'polygon(0 0, 100% 0, 100% 85%, 0 85%)'; 
                    this.fusionOverlay.style.transform = 'translate(0px, -25px) scale(0.9)';"""

content = content.replace(old_spikynut, new_spikynut)

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)

# We also need to update the recipe UI in GameLoop.js!
with open('pvz-web/js/GameLoop.js', 'r') as f:
    content2 = f.read()

# Replace the recipe UI clips
old_recipes = """            { a: 'peashooter', b: 'sunflower', result: '豌豆向日葵', base: 'assets/images/Plants/SunFlower/SunFlower1.gif', over: 'assets/images/Plants/Peashooter/Peashooter.gif', overClip: 'polygon(30% 0%, 100% 0%, 100% 45%, 30% 45%)', overTransform: 'translate(-2px, -8px) scale(0.9)' },
            { a: 'peashooter', b: 'wallnut', result: '坚果射手', base: 'assets/images/Plants/WallNut/WallNut.gif', over: 'assets/images/Plants/Peashooter/Peashooter.gif', overClip: 'polygon(30% 0%, 100% 0%, 100% 45%, 30% 45%)', overTransform: 'translate(10px, 5px) scale(0.9)' },
            { a: 'snowpea', b: 'cherrybomb', result: '寒冰炸弹', base: 'assets/images/Plants/CherryBomb/CherryBomb.gif', over: 'assets/images/Plants/SnowPea/SnowPea.gif', overTransform: 'translate(0, -10px) scale(0.5)' },
            { a: 'puffshroom', b: 'potatomine', result: '孢子地雷', base: 'assets/images/Plants/PotatoMine/PotatoMine.gif', over: 'assets/images/Plants/PuffShroom/PuffShroom.gif', overClip: 'polygon(0 0, 100% 0, 100% 85%, 0 85%)', overTransform: 'translate(0px, -45px) scale(0.9)' },
            { a: 'chomper', b: 'wallnut', result: '尖刺坚果', base: 'assets/images/Plants/WallNut/WallNut.gif', over: 'assets/images/Plants/Chomper/Chomper.gif', overClip: 'polygon(0 0, 100% 0, 100% 60%, 0 60%)', overTransform: 'translate(0px, -30px) scale(0.85)' },"""

new_recipes = """            { a: 'peashooter', b: 'sunflower', result: '豌豆向日葵', base: 'assets/images/Plants/SunFlower/SunFlower1.gif', over: 'assets/images/Plants/Peashooter/Peashooter.gif', overClip: 'polygon(0 0, 100% 0, 100% 65%, 0 65%)', overTransform: 'translate(0px, -20px) scale(1.0)' },
            { a: 'peashooter', b: 'wallnut', result: '坚果射手', base: 'assets/images/Plants/WallNut/WallNut.gif', over: 'assets/images/Plants/Peashooter/Peashooter.gif', overClip: 'polygon(0 0, 100% 0, 100% 65%, 0 65%)', overTransform: 'translate(5px, -15px) scale(1.0)' },
            { a: 'snowpea', b: 'cherrybomb', result: '寒冰炸弹', base: 'assets/images/Plants/CherryBomb/CherryBomb.gif', over: 'assets/images/Plants/SnowPea/SnowPea.gif', overTransform: 'translate(0, -10px) scale(0.5)' },
            { a: 'puffshroom', b: 'potatomine', result: '孢子地雷', base: 'assets/images/Plants/PotatoMine/PotatoMine.gif', over: 'assets/images/Plants/PuffShroom/PuffShroom.gif', overClip: 'polygon(0 0, 100% 0, 100% 85%, 0 85%)', overTransform: 'translate(0px, -45px) scale(0.9)' },
            { a: 'chomper', b: 'wallnut', result: '尖刺坚果', base: 'assets/images/Plants/WallNut/WallNut.gif', over: 'assets/images/Plants/Chomper/Chomper.gif', overClip: 'polygon(0 0, 100% 0, 100% 85%, 0 85%)', overTransform: 'translate(0px, -25px) scale(0.9)' },"""

content2 = content2.replace(old_recipes, new_recipes)

with open('pvz-web/js/GameLoop.js', 'w') as f:
    f.write(content2)

