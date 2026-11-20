import re

with open('pvz-web/js/GameLoop.js', 'r') as f:
    content = f.read()

old_bomb_logic = """        // Bomb planting exception: allow planting cherrybomb on snowpea
        if (existingPlant && type === 'cherrybomb' && existingPlant.type === 'snowpea') {
            let plant = new Plant(this, type);
            // DO NOT assign row/col to avoid grid collision yet, just set coordinates for visual
            plant.x = this.board.offsetX + col * this.board.cellWidth + this.board.cellWidth / 2;
            plant.y = this.board.offsetY + row * this.board.cellHeight + this.board.cellHeight / 2;
            plant.row = row;
            plant.col = col;
            plant.fusionTarget = existingPlant; // tag it to fuse upon explosion
            this.entities.push(plant);
            
            // Deduct sun cost
            let seed = this.seeds.find(s => s.type === type);
            if (seed) this.sun -= seed.cost;
            return true;
        }"""

new_bomb_logic = """        // Bomb planting exception: allow planting bomb on plants
        if (existingPlant && (type === 'cherrybomb' || type === 'doomshroom')) {
            // Check if it's a valid combination
            let valid = false;
            if (type === 'cherrybomb' && existingPlant.type === 'snowpea') valid = true;
            if (type === 'cherrybomb' && existingPlant.type === 'peashooter') valid = true;
            if (type === 'doomshroom' && existingPlant.type === 'sunflower') valid = true;
            
            if (valid) {
                let plant = new Plant(this, type);
                plant.x = this.board.offsetX + col * this.board.cellWidth + this.board.cellWidth / 2;
                plant.y = this.board.offsetY + row * this.board.cellHeight + this.board.cellHeight / 2;
                plant.row = row;
                plant.col = col;
                plant.fusionTarget = existingPlant; // tag it to fuse upon explosion
                this.entities.push(plant);
                
                let seed = this.seeds.find(s => s.type === type);
                if (seed) this.sun -= seed.cost;
                return true;
            }
        }"""

content = content.replace(old_bomb_logic, new_bomb_logic)

with open('pvz-web/js/GameLoop.js', 'w') as f:
    f.write(content)

