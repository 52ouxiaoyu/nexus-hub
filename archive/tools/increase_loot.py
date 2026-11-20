import re

with open("zombie-shooter/game.js", "r") as f:
    code = f.read()

# 1. Increase LootBox drop rate
loot_spawn_regex = r"if\(frameCount % 600 === 0\) \{\s*lootBoxes\.push\(new LootBox\(\)\);\s*\}"
new_loot_spawn = """if(frameCount % 200 === 0) { // Every ~3 seconds
        lootBoxes.push(new LootBox());
    }"""
code = re.sub(loot_spawn_regex, new_loot_spawn, code)

# 2. Increase probability of Nuke and Ult
loot_constructor_regex = r"const types = \['heal', 'shield', 'buff', 'weapon_box', 'mech', 'vehicle', 'nuke', 'trap', 'revive', 'ult'\];\s*this\.type = types\[Math\.floor\(Math\.random\(\) \* types\.length\)\];"
new_loot_constructor = """
        const rand = Math.random();
        if(rand < 0.25) this.type = 'nuke'; // 25% chance for Nuke
        else if(rand < 0.50) this.type = 'ult'; // 25% chance for Ultimate
        else if(rand < 0.60) this.type = 'mech';
        else if(rand < 0.70) this.type = 'vehicle';
        else {
            const types = ['heal', 'shield', 'buff', 'weapon_box', 'trap', 'revive'];
            this.type = types[Math.floor(Math.random() * types.length)];
        }"""
code = re.sub(loot_constructor_regex, new_loot_constructor, code)

# Fix possible issue where 'nuke' or 'ult' color isn't applied properly if the regex replaced earlier parts
# In the LootBox constructor:
# if(this.type === 'heal') ...

with open("zombie-shooter/game.js", "w") as f:
    f.write(code)
