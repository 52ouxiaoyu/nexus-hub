import re

with open('pvz-web/js/managers/WaveManager.js', 'r') as f:
    content = f.read()

old_vars = """        let danceChance = 0, jackChance = 0, zomboniChance = 0, impChance = 0;
        let bossChance = 0;"""

new_vars = """        let danceChance = 0, jackChance = 0, zomboniChance = 0, impChance = 0;
        let pogoChance = 0, ladderChance = 0, gargantuarChance = 0;
        let bossChance = 0;"""

old_chances = """        if (this.timeElapsed > 540) zomboniChance = Math.min(0.05, (this.timeElapsed - 540) / 600);
        if (this.timeElapsed > 600) impChance = Math.min(0.1, (this.timeElapsed - 600) / 500);
        if (this.timeElapsed > 600) bossChance = Math.min(0.05, (this.timeElapsed - 600) / 1000); // Rare boss spawn"""

new_chances = """        if (this.timeElapsed > 540) zomboniChance = Math.min(0.05, (this.timeElapsed - 540) / 600);
        if (this.timeElapsed > 540) pogoChance = Math.min(0.1, (this.timeElapsed - 540) / 500);
        if (this.timeElapsed > 540) ladderChance = Math.min(0.1, (this.timeElapsed - 540) / 500);
        if (this.timeElapsed > 600) impChance = Math.min(0.1, (this.timeElapsed - 600) / 500);
        if (this.timeElapsed > 600) gargantuarChance = Math.min(0.05, (this.timeElapsed - 600) / 800);
        if (this.timeElapsed > 600) bossChance = Math.min(0.05, (this.timeElapsed - 600) / 1000); // Rare boss spawn"""

old_select = """        if (r < (acc += bossChance)) type = 'lgboss';
        else if (r < (acc += zomboniChance)) type = 'zomboni';"""

new_select = """        if (r < (acc += bossChance)) type = 'lgboss';
        else if (r < (acc += gargantuarChance)) type = 'gargantuar';
        else if (r < (acc += zomboniChance)) type = 'zomboni';
        else if (r < (acc += pogoChance)) type = 'pogo';
        else if (r < (acc += ladderChance)) type = 'ladder';"""

content = content.replace(old_vars, new_vars)
content = content.replace(old_chances, new_chances)
content = content.replace(old_select, new_select)

with open('pvz-web/js/managers/WaveManager.js', 'w') as f:
    f.write(content)
