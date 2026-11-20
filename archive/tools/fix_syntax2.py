with open('pvz-web/js/HauntedDorm.js', 'r') as f:
    content = f.read()

bad_str = "spore: { n: 512, every: 1.0 } }, shoot: { dmg: 300, cd: 0.3, n: 12, range: 400, img: 'Plants/ShroomBullet.gif', fan: 0.5, homing: true } },"
good_str = "spore: { n: 512, every: 1.0 } },"
content = content.replace(bad_str, good_str)

with open('pvz-web/js/HauntedDorm.js', 'w') as f:
    f.write(content)
