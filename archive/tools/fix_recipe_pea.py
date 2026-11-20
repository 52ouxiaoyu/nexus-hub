import re

with open('pvz-web/js/GameLoop.js', 'r') as f:
    content = f.read()

old_recipes = """        const recipes = [
            { a: 'peashooter', b: 'sunflower', result: '豌豆向日葵', img: 'assets/images/Plants/Fusions/peaflower.png', css: false },
            { a: 'peashooter', b: 'wallnut', result: '坚果射手', img: 'assets/images/Plants/Fusions/nutshooter.png', css: false },"""

new_recipes = """        const recipes = [
            { a: 'peashooter', b: 'sunflower', result: '豌豆向日葵', base: 'assets/images/Plants/SunFlower/SunFlower1.gif', over: 'assets/images/Plants/Peashooter/Peashooter.gif', overClip: 'polygon(30% 0%, 100% 0%, 100% 45%, 30% 45%)', overTransform: 'translate(-2px, -8px) scale(0.9)' },
            { a: 'peashooter', b: 'wallnut', result: '坚果射手', base: 'assets/images/Plants/WallNut/WallNut.gif', over: 'assets/images/Plants/Peashooter/Peashooter.gif', overClip: 'polygon(30% 0%, 100% 0%, 100% 45%, 30% 45%)', overTransform: 'translate(10px, 5px) scale(0.9)' },"""

content = content.replace(old_recipes, new_recipes)
with open('pvz-web/js/GameLoop.js', 'w') as f:
    f.write(content)

