import re

with open("zombie-shooter/game.js", "r") as f:
    code = f.read()

old_death_logic = """        if(this.hp <= 0) {
            if(!this.isDowned && this.lives > 0) {
                this.isDowned = true;
                this.lives--;
                this.reviveProgress = 0;
            }"""

new_death_logic = """        if(this.hp <= 0) {
            if(!this.isDowned) {
                this.isDowned = true;
                this.reviveProgress = 0;
            }"""

code = code.replace(old_death_logic, new_death_logic)

with open("zombie-shooter/game.js", "w") as f:
    f.write(code)
