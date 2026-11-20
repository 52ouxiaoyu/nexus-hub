import re

with open("zombie-shooter/game.js", "r") as f:
    code = f.read()

old_logic = "        resolveBuildingCollision(this);"

new_logic = """        resolveBuildingCollision(this);

        // Keep players within the current camera view (Co-op screen binding)
        const margin = 50;
        if(this.x < camera.x - CANVAS_W/2 + margin) this.x = camera.x - CANVAS_W/2 + margin;
        if(this.x > camera.x + CANVAS_W/2 - margin) this.x = camera.x + CANVAS_W/2 - margin;
        if(this.y < camera.y - CANVAS_H/2 + margin) this.y = camera.y - CANVAS_H/2 + margin;
        if(this.y > camera.y + CANVAS_H/2 - margin) this.y = camera.y + CANVAS_H/2 - margin;"""

code = code.replace(old_logic, new_logic)

with open("zombie-shooter/game.js", "w") as f:
    f.write(code)
