import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

old_update = """    update(deltaTime) {

        super.update(deltaTime);
        this.element.style.top = `${this.y + this.yOffset}px`;
        
        if (this.hp <= 0 && !this.isDead) {"""

new_update = """    update(deltaTime) {

        super.update(deltaTime);
        this.element.style.top = `${this.y + this.yOffset}px`;
        
        if (this.fusionOverlay) {
            this.fusionOverlay.style.left = `${this.x}px`;
            this.fusionOverlay.style.top = `${this.y + this.yOffset}px`;
        }
        
        if (this.hp <= 0 && !this.isDead) {"""

content = content.replace(old_update, new_update)
with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)

