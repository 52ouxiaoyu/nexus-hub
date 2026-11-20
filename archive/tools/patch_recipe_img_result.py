import re

with open('pvz-web/js/GameLoop.js', 'r') as f:
    content = f.read()

old_recipes = """        const recipes = [
            { a: 'peashooter', b: 'sunflower', result: '豌豆向日葵 (产阳光+射击)' },
            { a: 'peashooter', b: 'wallnut', result: '坚果射手 (高血量+射击)' },
            { a: 'snowpea', b: 'cherrybomb', result: '冰霜樱桃炸弹 (爆炸+大范围冰冻)' },
            { a: 'puffshroom', b: 'potatomine', result: '孢子地雷 (短手射击+秒杀爆炸)' },
            { a: 'chomper', b: 'wallnut', result: '尖刺坚果 (高血量+反伤)' },
            { a: 'snowpea', b: 'wallnut', result: '寒冰坚果 (高血量+受击冰冻)' }
        ];"""

new_recipes = """        const recipes = [
            { a: 'peashooter', b: 'sunflower', result: '豌豆向日葵', img: 'assets/images/Plants/Fusions/peaflower.png', css: false },
            { a: 'peashooter', b: 'wallnut', result: '坚果射手', img: 'assets/images/Plants/Fusions/nutshooter.png', css: false },
            { a: 'snowpea', b: 'cherrybomb', result: '冰霜樱桃炸弹', img: 'assets/images/Plants/CherryBomb/CherryBomb.gif', filter: 'hue-rotate(180deg) saturate(1.5)', css: false },
            { a: 'puffshroom', b: 'potatomine', result: '孢子地雷', base: 'assets/images/Plants/PotatoMine/PotatoMine.gif', over: 'assets/images/Plants/PuffShroom/PuffShroom.gif', overTransform: 'translate(10px, -15px) scale(0.7)' },
            { a: 'chomper', b: 'wallnut', result: '尖刺坚果', base: 'assets/images/Plants/WallNut/WallNut.gif', over: 'assets/images/Plants/Chomper/Chomper.gif', overTransform: 'translate(0px, -20px) scale(0.5)' },
            { a: 'snowpea', b: 'wallnut', result: '寒冰坚果', img: 'assets/images/Plants/WallNut/WallNut.gif', filter: 'hue-rotate(180deg) saturate(1.5) brightness(1.2)', css: false }
        ];"""

content = content.replace(old_recipes, new_recipes)

old_render = """                <div style="width: 50%; text-align: right; font-weight: bold; color: #822; font-size: 16px;">
                    ${r.result}
                </div>"""

new_render = """                <div style="width: 50%; text-align: right; display: flex; align-items: center; justify-content: flex-end; gap: 10px; font-weight: bold; color: #822; font-size: 16px;">
                    <span>${r.result}</span>
                    <div style="position: relative; width: 60px; height: 60px;">
                        ${r.base ? 
                          `<img src="${r.base}" style="position: absolute; left: 0; top: 0; height: 50px;">
                           <img src="${r.over}" style="position: absolute; left: 0; top: 0; height: 50px; transform: ${r.overTransform};">` 
                          : `<img src="${r.img}" style="height: 50px; filter: ${r.filter || 'none'}; object-fit: contain;">`
                        }
                    </div>
                </div>"""

content = content.replace(old_render, new_render)
with open('pvz-web/js/GameLoop.js', 'w') as f:
    f.write(content)
