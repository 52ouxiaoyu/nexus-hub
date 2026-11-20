class GameMap {
    constructor(mapData) {
        this.data = mapData;
        this.pathPixels = Utils.getPathPixels(mapData.path);
        this.grid = this.createGrid();
    }
    
    createGrid() {
        const grid = [];
        for (let y = 0; y < CONFIG.GRID_ROWS; y++) {
            grid[y] = [];
            for (let x = 0; x < CONFIG.GRID_COLS; x++) {
                grid[y][x] = {
                    type: Utils.isOnPath(x, y, this.data.path) ? 'path' : 'buildable',
                    tower: null
                };
            }
        }
        return grid;
    }
    
    canBuild(gridX, gridY) {
        if (gridX < 0 || gridX >= CONFIG.GRID_COLS || gridY < 0 || gridY >= CONFIG.GRID_ROWS) {
            return false;
        }
        const cell = this.grid[gridY][gridX];
        return cell.type === 'buildable' && cell.tower === null;
    }
    
    placeTower(gridX, gridY, tower) {
        if (this.canBuild(gridX, gridY)) {
            this.grid[gridY][gridX].tower = tower;
            return true;
        }
        return false;
    }
    
    removeTower(gridX, gridY) {
        if (this.grid[gridY] && this.grid[gridY][gridX]) {
            this.grid[gridY][gridX].tower = null;
        }
    }
    
    render(ctx) {
        ctx.fillStyle = this.data.bgColor;
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        
        ctx.fillStyle = this.data.pathColor;
        for (let i = 0; i < this.data.path.length - 1; i++) {
            const p1 = this.data.path[i];
            const p2 = this.data.path[i + 1];
            
            const x1 = p1.x * CONFIG.TILE_SIZE;
            const y1 = p1.y * CONFIG.TILE_SIZE;
            const x2 = p2.x * CONFIG.TILE_SIZE;
            const y2 = p2.y * CONFIG.TILE_SIZE;
            
            const minX = Math.min(x1, x2);
            const maxX = Math.max(x1, x2) + CONFIG.TILE_SIZE;
            const minY = Math.min(y1, y2);
            const maxY = Math.max(y1, y2) + CONFIG.TILE_SIZE;
            
            ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
        }
        
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        for (let x = 0; x <= CONFIG.GRID_COLS; x++) {
            ctx.beginPath();
            ctx.moveTo(x * CONFIG.TILE_SIZE, 0);
            ctx.lineTo(x * CONFIG.TILE_SIZE, CONFIG.CANVAS_HEIGHT);
            ctx.stroke();
        }
        for (let y = 0; y <= CONFIG.GRID_ROWS; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * CONFIG.TILE_SIZE);
            ctx.lineTo(CONFIG.CANVAS_WIDTH, y * CONFIG.TILE_SIZE);
            ctx.stroke();
        }
    }
}
