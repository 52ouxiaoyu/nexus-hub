import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

# In update:
#         this.element.style.left = `${this.x}px`; // from Entity
#         this.element.style.top = `${this.y + this.yOffset}px`;

update_str = """
    update(deltaTime) {
        super.update(deltaTime);
        this.element.style.top = `${this.y + (this.yOffset || 0)}px`;
        if (this.fusionOverlay) {
            this.fusionOverlay.style.left = `${this.x + 10}px`;
            this.fusionOverlay.style.top = `${this.y + (this.yOffset || 0) + 10}px`;
        }
"""
content = content.replace("    update(deltaTime) {\n        super.update(deltaTime);\n        this.element.style.top = `${this.y + this.yOffset}px`;", update_str)

# In death check:
death_str = """
        if (this.hp <= 0 && !this.isDead) {
            this.isDead = true;
            if (this.game.board.grid[this.row] && this.game.board.grid[this.row][this.col] === this) {
                this.game.board.grid[this.row][this.col] = null; // Clear from grid
            }
            if (this.fusionOverlay && this.fusionOverlay.parentNode) {
                this.fusionOverlay.parentNode.removeChild(this.fusionOverlay);
            }
            return;
        }
"""
content = re.sub(r"        if \(this\.hp <= 0 && !this\.isDead\) \{[\s\S]*?return;\n        \}", death_str.strip('\n'), content)

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)
