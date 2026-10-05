import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

old_die = """        if (this.hp <= 0 && !this.isDead) {
            this.isDead = true;
            if (this.game.board.grid[this.row] && this.game.board.grid[this.row][this.col] === this) {
                this.game.board.grid[this.row][this.col] = null; // Clear from grid
            }"""

new_die = """        if (this.hp <= 0 && !this.isDead) {
            this.isDead = true;
            
            if (this.type === 'fusion_cherrybomb_peashooter' || this.type === 'fusion_doomshroom_sunflower') {
                let boom = document.createElement('img');
                boom.src = 'assets/images/Plants/CherryBomb/Boom.gif';
                if (this.type === 'fusion_doomshroom_sunflower') {
                    boom.style.filter = 'hue-rotate(270deg) invert(1)';
                    for (let zombie of this.game.zombies) {
                        if (Math.abs(zombie.col - this.col) <= 2 && Math.abs(zombie.row - this.row) <= 2) {
                            zombie.takeDamage(1800);
                        }
                    }
                } else {
                    for (let zombie of this.game.zombies) {
                        if (Math.abs(zombie.col - this.col) <= 1 && Math.abs(zombie.row - this.row) <= 1) {
                            zombie.takeDamage(1800);
                        }
                    }
                }
                boom.style.position = 'absolute';
                boom.style.left = (this.element.offsetLeft - 80) + 'px';
                boom.style.top = (this.element.offsetTop - 80) + 'px';
                boom.style.zIndex = '100';
                this.game.container.appendChild(boom);
                setTimeout(() => boom.remove(), 1000);
            }
            
            if (this.game.board.grid[this.row] && this.game.board.grid[this.row][this.col] === this) {
                this.game.board.grid[this.row][this.col] = null; // Clear from grid
            }"""

content = content.replace(old_die, new_die)

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)

