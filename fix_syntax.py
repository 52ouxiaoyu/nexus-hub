with open('pvz-web/js/HauntedDorm.js', 'r') as f:
    content = f.read()

bad_str = "produce: { sun: 512, every: 0.5 }, shoot: { dmg: 100, cd: 0.4, n: 8, range: 800, img: 'Plants/PB00.gif', homing: true } }, shoot: { dmg: 100, cd: 0.4, n: 8, range: 800, img: 'Plants/PB00.gif', homing: true } },"
good_str = "produce: { sun: 512, every: 0.5 }, shoot: { dmg: 100, cd: 0.4, n: 8, range: 800, img: 'Plants/PB00.gif', homing: true } },"
content = content.replace(bad_str, good_str)

with open('pvz-web/js/HauntedDorm.js', 'w') as f:
    f.write(content)
