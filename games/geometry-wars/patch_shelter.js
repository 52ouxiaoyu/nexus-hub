const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

// 1. Update Building class
let oldBuilding = `class Building {
    constructor(x, y, w, h) {
        this.x = x; this.y = y; this.w = w; this.h = h;
    }
    draw(ctx) {
        // Solid black box with neon wireframe outline
        ctx.fillStyle = '#000000';
        ctx.fillRect(this.x, this.y, this.w, this.h);
        
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00ffff';
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.w, this.h);
        ctx.shadowBlur = 0;
    }
}`;

let newBuilding = `class Building {
    constructor(x, y, w, h, type = 'solid') {
        this.x = x; this.y = y; this.w = w; this.h = h;
        this.type = type;
    }
    draw(ctx) {
        if (this.type === 'shelter') {
            ctx.fillStyle = 'rgba(0, 255, 255, 0.05)';
            ctx.fillRect(this.x, this.y, this.w, this.h);
            
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00ffff';
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
            ctx.setLineDash([10, 10]);
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x, this.y, this.w, this.h);
            ctx.setLineDash([]);
            ctx.shadowBlur = 0;
            
            ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
            ctx.font = '14px "Share Tech Mono", monospace';
            ctx.fillText('避难所 (Shelter)', this.x + 10, this.y + 20);
        } else {
            ctx.fillStyle = '#000000';
            ctx.fillRect(this.x, this.y, this.w, this.h);
            
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00ffff';
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x, this.y, this.w, this.h);
            ctx.shadowBlur = 0;
        }
    }
}`;
code = code.replace(oldBuilding, newBuilding);

// 2. Update resolveBuildingCollision
let oldCollision = `function resolveBuildingCollision(obj) {
    buildings.forEach(b => {
        let testX = obj.x;`;

let newCollision = `function resolveBuildingCollision(obj) {
    buildings.forEach(b => {
        if (b.type === 'shelter') {
            if (obj.constructor.name === 'Player' || obj.constructor.name === 'Barrel') return;
            if (obj.constructor.name === 'Zombie' && !obj.isBoss && !obj.isUltimateBoss && obj.size <= 30) return;
        }
        let testX = obj.x;`;
code = code.replace(oldCollision, newCollision);

// 3. Update Map Generation
let oldGen = `                let chunkType = Math.floor(rand1 * 10); // Expanded chunk types for varied density`;
let newGen = `                let chunkType = Math.floor(rand1 * 11); // Expanded chunk types for varied density`;
code = code.replace(oldGen, newGen);

let oldGenEnd = `                } else {
                    // Massive central monolith (Dense blocker)
                    buildings.push(new Building(cx + 150, cy + 150, CHUNK_SIZE - 300, CHUNK_SIZE - 300));
                }`;
let newGenEnd = `                } else if (chunkType === 9) {
                    // Massive central monolith (Dense blocker)
                    buildings.push(new Building(cx + 150, cy + 150, CHUNK_SIZE - 300, CHUNK_SIZE - 300));
                } else {
                    // Shelter chunk (Safe zone for players, blocked for bosses)
                    buildings.push(new Building(cx + 200, cy + 200, CHUNK_SIZE - 400, CHUNK_SIZE - 400, 'shelter'));
                }`;
code = code.replace(oldGenEnd, newGenEnd);

fs.writeFileSync('game.js', code);
console.log('Successfully patched Shelters');
