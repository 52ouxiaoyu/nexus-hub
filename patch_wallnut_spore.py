import re

with open('pvz-web/js/HauntedDorm.js', 'r') as f:
    content = f.read()

old_wallnut = """            tallnut:       { name: '高坚果',     img: 'Plants/TallNut/0.gif',       card: 'TallNut.png',     hp: 30000, cost: 0, scale: 1.3,
                             up: { cost: 1500, cur: 'sun', to: 'pumpkin' } },
            pumpkin:       { name: '南瓜高坚果', img: 'Plants/TallNut/0.gif',       hp: 50000, cost: 0, scale: 1.4, hat: 'Plants/PumpkinHead/0.gif',
                             up: { cost: 3000, cur: 'sun', to: 'doomtallnut' } },
            doomtallnut:   { name: '毁灭高坚果', img: 'Plants/TallNut/0.gif',       hp: 90000, cost: 0, scale: 1.5, hat: 'Plants/DoomShroom/0.gif', tint: 'hue-rotate(240deg)',
                             spike: { dps: 200, r: 80 }, up: { cost: 6000, cur: 'sun', to: 'holotallnut' } },
            holotallnut:   { name: '神界高坚果', img: 'Plants/TallNut/0.gif',       hp: 200000, cost: 0, scale: 1.7, tint: 'drop-shadow(0 0 20px #ff0) brightness(2)',
                             spike: { dps: 500, r: 100 } },"""

new_wallnut = """            tallnut:       { name: '高坚果',     img: 'Plants/TallNut/0.gif',       card: 'TallNut.png',     hp: 30000, cost: 0, scale: 1.3,
                             up: { cost: 0, sporeCost: 5, cur: 'sun', to: 'pumpkin' } },
            pumpkin:       { name: '南瓜高坚果', img: 'Plants/TallNut/0.gif',       hp: 50000, cost: 0, scale: 1.4, hat: 'Plants/PumpkinHead/0.gif',
                             up: { cost: 0, sporeCost: 25, cur: 'sun', to: 'doomtallnut' } },
            doomtallnut:   { name: '毁灭高坚果', img: 'Plants/TallNut/0.gif',       hp: 90000, cost: 0, scale: 1.5, hat: 'Plants/DoomShroom/0.gif', tint: 'hue-rotate(240deg)',
                             spike: { dps: 200, r: 80 }, up: { cost: 0, sporeCost: 125, cur: 'sun', to: 'holotallnut' } },
            holotallnut:   { name: '神界高坚果', img: 'Plants/TallNut/0.gif',       hp: 200000, cost: 0, scale: 1.7, tint: 'drop-shadow(0 0 20px #ff0) brightness(2)',
                             spike: { dps: 500, r: 100 } },"""
content = content.replace(old_wallnut, new_wallnut)

with open('pvz-web/js/HauntedDorm.js', 'w') as f:
    f.write(content)
