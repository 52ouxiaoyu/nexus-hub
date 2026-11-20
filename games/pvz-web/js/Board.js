class Board {
    constructor(game) {
        this.game = game;
        this.rows = 5;
        this.cols = 9;
        
        // Coordinates for the top-left of the first cell
        // Adjusted for the new background image (left: -200px)
        this.offsetX = 50; 
        this.offsetY = 85;
        
        this.cellWidth = 80;
        this.cellHeight = 100;
        
        this.grid = [];
        for (let r = 0; r < this.rows; r++) {
            this.grid[r] = [];
            for (let c = 0; c < this.cols; c++) {
                this.grid[r][c] = null; 
            }
        }
    }
    
    getGridPos(x, y) {
        if (x < this.offsetX || x >= this.offsetX + this.cols * this.cellWidth ||
            y < this.offsetY || y >= this.offsetY + this.rows * this.cellHeight) {
            return null;
        }
        
        const col = Math.floor((x - this.offsetX) / this.cellWidth);
        const row = Math.floor((y - this.offsetY) / this.cellHeight);
        return { row, col };
    }
    
    canPlant(row, col) {
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return false;
        if (this.grid[row][col] !== null) return false;
        if (this.game.isIced && this.game.isIced(row, col)) return false; // v3.40.0：冰道禁种
        return true;
    }
    
    addPlant(plant, row, col) {
        if (this.canPlant(row, col)) {
            this.grid[row][col] = plant;
            plant.row = row;
            plant.col = col;
            
            plant.x = this.offsetX + col * this.cellWidth + this.cellWidth / 2;
            plant.y = this.offsetY + row * this.cellHeight + this.cellHeight / 2;
            
            this.game.entities.push(plant);
            // v3.48.0：火焰地刺落位即烤化本行已有冰道——它镇守的行不允许有冰
            //（本格冰面本来就不能种（canPlant 拦截），这里烧的是同行其它格的存量冰）
            if (plant.type === 'fusion_firespikeweed' && this.game.meltIceTrailsInRow) {
                this.game.meltIceTrailsInRow(row);
            }
            return true;
        }
        return false;
    }
    
    removePlant(row, col) {
        if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
            const plant = this.grid[row][col];
            if (plant) {
                plant.hp = 0;
                this.grid[row][col] = null;
                if (this.game.audioManager) this.game.audioManager.play('plant');
            }
        }
    }
}
