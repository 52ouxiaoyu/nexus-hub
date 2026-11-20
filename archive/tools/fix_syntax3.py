with open('pvz-web/js/HauntedDorm.js', 'r') as f:
    content = f.read()

bad_str = "produce: { sun: 196830, every: 0.5 }, shoot: { dmg: 100, cd: 0.4, n: 8, range: 800, img: 'Plants/PB00.gif', homing: true } }, shoot: { dmg: 100, cd: 0.4, n: 8, range: 800, img: 'Plants/PB00.gif', homing: true } },"
good_str = "produce: { sun: 196830, every: 0.5 }, shoot: { dmg: 100, cd: 0.4, n: 8, range: 800, img: 'Plants/PB00.gif', homing: true } },"
content = content.replace(bad_str, good_str)

bad_str2 = "spore: { n: 1953125, every: 1.0 } }, shoot: { dmg: 300, cd: 0.3, n: 12, range: 400, img: 'Plants/ShroomBullet.gif', fan: 0.5, homing: true } },"
good_str2 = "spore: { n: 1953125, every: 1.0 } },"
content = content.replace(bad_str2, good_str2)

with open('pvz-web/js/HauntedDorm.js', 'w') as f:
    f.write(content)
