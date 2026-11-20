import re

with open("zombie-shooter/game.js", "r") as f:
    code = f.read()

# Find zombie death
zombie_death_regex = r"if\(z\.hp <= 0\) \{\s*z\.active = false;\s*score \+= z\.scoreVal;\s*killCount\+\+;"
new_zombie_death = """if(z.hp <= 0) {
                    z.active = false;
                    score += z.scoreVal;
                    killCount++;
                    
                    // 怪物死亡掉落道具
                    if(z.isBoss) {
                        lootBoxes.push(new LootBox(z.x, z.y));
                        lootBoxes.push(new LootBox(z.x+30, z.y+30));
                        lootBoxes.push(new LootBox(z.x-30, z.y-30));
                    } else if(Math.random() < 0.15) {
                        lootBoxes.push(new LootBox(z.x, z.y));
                    }
                    """
code = re.sub(zombie_death_regex, new_zombie_death, code)

with open("zombie-shooter/game.js", "w") as f:
    f.write(code)
