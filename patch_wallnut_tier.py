import re

with open('pvz-web/js/HauntedDorm.js', 'r') as f:
    content = f.read()

new_wallnut = """            // —— 坚果系 (10级，肉盾) ——
            wallnut:       { tier: 1, name: '坚果',       img: 'Plants/WallNut/0.gif',       card: 'WallNut.png',     hp: 4000,  cost: 50,
                             up: { cost: 40, cur: 'sun', to: 'nutshooter' } },
            nutshooter:    { tier: 2, name: '豌豆坚果',   img: 'Plants/WallNut/0.gif',       card: 'WallNut.png',  hp: 5000,  cost: 0, scale: 1.05,
                             overlay: 'Plants/Peashooter/0.gif',
                             shoot: { dmg: 20, cd: 1.6, n: 1, range: 320, img: 'Plants/PB00.gif', homing: true }, up: { cost: 100, cur: 'sun', to: 'nutgunner' } },
            nutgunner:     { tier: 3, name: '射手坚果',   img: 'Plants/WallNut/0.gif',       hp: 6500,  cost: 0, scale: 1.1, tint: 'saturate(1.4) brightness(1.12)',
                             overlay: 'Plants/Repeater/0.gif',
                             shoot: { dmg: 20, cd: 1.3, n: 2, range: 320, img: 'Plants/PB00.gif', homing: true }, up: { cost: 160, cur: 'sun', to: 'cabbagenut' } },
            cabbagenut:    { tier: 4, name: '卷心菜坚果', img: 'Plants/WallNut/0.gif',       hp: 8500,  cost: 0, scale: 1.15, hat: 'Plants/CabbagePult/Cabbage.png',
                             lob: { dmg: 45, cd: 2.2, range: 420, aoe: 70, img: 'Plants/CabbagePult/Cabbage.png' }, up: { cost: 260, cur: 'sun', to: 'melonnut' } },
            melonnut:      { tier: 5, name: '西瓜坚果',   img: 'Plants/WallNut/0.gif',       hp: 12000, cost: 0, scale: 1.2, hat: 'Plants/MelonPult/Melon.png',
                             lob: { dmg: 80, cd: 2.0, range: 450, aoe: 100, img: 'Plants/MelonPult/Melon.png' }, up: { cost: 450, cur: 'sun', to: 'wintermelonnut' } },
            wintermelonnut:{ tier: 6, name: '冰瓜坚果',   img: 'Plants/WallNut/0.gif',       hp: 18000, cost: 0, scale: 1.25, hat: 'Plants/WinterMelon/WinterMelon.png',
                             lob: { dmg: 100, cd: 1.8, range: 480, aoe: 120, img: 'Plants/WinterMelon/WinterMelon.png', slow: true }, up: { cost: 800, cur: 'sun', to: 'tallnut' } },
            tallnut:       { tier: 7, name: '高坚果',     img: 'Plants/TallNut/0.gif',       card: 'TallNut.png',     hp: 30000, cost: 0, scale: 1.3,
                             up: { cost: 0, sporeCost: 5, cur: 'sun', to: 'pumpkin' } },
            pumpkin:       { tier: 8, name: '南瓜高坚果', img: 'Plants/TallNut/0.gif',       hp: 50000, cost: 0, scale: 1.4, hat: 'Plants/PumpkinHead/0.gif',
                             up: { cost: 0, sporeCost: 25, cur: 'sun', to: 'doomtallnut' } },
            doomtallnut:   { tier: 9, name: '毁灭高坚果', img: 'Plants/TallNut/0.gif',       hp: 90000, cost: 0, scale: 1.5, overlays: ['Plants/PumpkinHead/0.gif', 'Plants/DoomShroom/0.gif'], tint: 'hue-rotate(240deg)',
                             spike: { dps: 200, r: 80 }, up: { cost: 0, sporeCost: 125, cur: 'sun', to: 'holotallnut' } },
            holotallnut:   { tier: 10, name: '神界高坚果', img: 'Plants/TallNut/0.gif',       hp: 200000, cost: 0, scale: 1.7, tint: 'drop-shadow(0 0 20px #ff0) brightness(2)',
                             spike: { dps: 500, r: 120 } }"""
pattern_wallnut = re.compile(r"            // —— 坚果系 \(10级，肉盾\) ——.*?spike: \{ dps: 500, r: 120 \} \}", re.DOTALL)
content = pattern_wallnut.sub(new_wallnut, content)

with open('pvz-web/js/HauntedDorm.js', 'w') as f:
    f.write(content)
