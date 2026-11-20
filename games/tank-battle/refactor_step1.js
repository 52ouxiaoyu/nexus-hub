const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

// 1. Add TILE_TYPES.BARREL and COLORS.BARREL
code = code.replace(/const TILE_TYPES = \{ EMPTY: 0, BRICK: 1, STEEL: 2, WATER: 3, FOREST: 4, ICE: 5, HARD_BRICK: 6, UNBREAKABLE: 7, BASE: 9, BASE_DESTROYED: 10 \};/, "const TILE_TYPES = { EMPTY: 0, BRICK: 1, STEEL: 2, WATER: 3, FOREST: 4, ICE: 5, HARD_BRICK: 6, UNBREAKABLE: 7, BARREL: 8, BASE: 9, BASE_DESTROYED: 10 };");
code = code.replace(/const COLORS = \{ BRICK: '#B53120', BRICK_LIGHT: '#DC5341', STEEL: '#AAAAAA', STEEL_LIGHT: '#EEEEEE', WATER: '#2131E7', FOREST: '#21B521', PLAYER1: '#E7E721', PLAYER2: '#63C6FF', ENEMY: '#E7E7E7', BASE: '#E79C21' \};/, "const COLORS = { BRICK: '#B53120', BRICK_LIGHT: '#DC5341', STEEL: '#AAAAAA', STEEL_LIGHT: '#EEEEEE', WATER: '#2131E7', FOREST: '#21B521', PLAYER1: '#E7E721', PLAYER2: '#63C6FF', ENEMY: '#E7E7E7', BASE: '#E79C21', BARREL: '#FF4400' };");

// 2. Add BARREL to map generation
let mapGenRegex = /\/\/ Force spawn 4~8 UNBREAKABLE pillars/;
let newMapGen = `
        // Spawn Explosive Barrels
        const numBarrels = 3 + Math.floor(Math.random() * 4);
        for (let k = 0; k < numBarrels; k++) {
            const bx = 2 + Math.floor(Math.random() * 20);
            const by = 4 + Math.floor(Math.random() * 16);
            if (this.grid[by][bx] !== TILE_TYPES.BASE && this.grid[by][bx] !== TILE_TYPES.UNBREAKABLE) {
                this.grid[by][bx] = TILE_TYPES.BARREL;
            }
        }
        
        // Force spawn 4~8 UNBREAKABLE pillars`;
code = code.replace(mapGenRegex, newMapGen);

// 3. Draw BARREL
let drawTileRegex = /\} else if \(tile === TILE_TYPES\.HARD_BRICK\) \{/;
let drawBarrel = `} else if (tile === TILE_TYPES.BARREL) {
                    ctx.fillStyle = COLORS.BARREL; ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
                    ctx.fillStyle = '#000'; ctx.fillRect(px + TILE_SIZE/2 - 2, py + 4, 4, TILE_SIZE - 8);
                    ctx.fillStyle = '#FFF'; ctx.font = '16px Arial'; ctx.textAlign='center'; ctx.fillText('☠️', px+TILE_SIZE/2, py+TILE_SIZE/2+6);
                } else if (tile === TILE_TYPES.HARD_BRICK) {`;
code = code.replace(drawTileRegex, drawBarrel);

// 4. Bullet collision with BARREL
let wallCheckRegex = /if \(tile === TILE_TYPES\.BRICK \|\| tile === TILE_TYPES\.HARD_BRICK \|\| tile === TILE_TYPES\.STEEL \|\| tile === TILE_TYPES\.UNBREAKABLE \|\| tile === TILE_TYPES\.BASE\) \{/;
let newWallCheck = `if (tile === TILE_TYPES.BRICK || tile === TILE_TYPES.HARD_BRICK || tile === TILE_TYPES.STEEL || tile === TILE_TYPES.UNBREAKABLE || tile === TILE_TYPES.BASE || tile === TILE_TYPES.BARREL) {`;
code = code.replace(wallCheckRegex, newWallCheck);

let pierceRegex = /if \(tile === TILE_TYPES\.BRICK \|\| tile === TILE_TYPES\.HARD_BRICK\) \{/g;
let newPierce = `if (tile === TILE_TYPES.BRICK || tile === TILE_TYPES.HARD_BRICK || tile === TILE_TYPES.BARREL) {`;
code = code.replace(pierceRegex, newPierce);

let barrelTriggerRegex = /if \(tile === TILE_TYPES\.BASE\) \{/;
let barrelTrigger = `if (tile === TILE_TYPES.BARREL) {
                this.game.map.grid[ty][tx] = TILE_TYPES.EMPTY;
                this.game.hitStopTimer = 6; // Hit Stop!
                let explosionRadius = 3.5;
                audio.play('explosion');
                this.game.effects.push(new Effect(tx*TILE_SIZE+16, ty*TILE_SIZE+16, 'EXPLOSION', explosionRadius));
                // Destructive AOE
                for (let iy = ty - 3; iy <= ty + 3; iy++) {
                    for (let ix = tx - 3; ix <= tx + 3; ix++) {
                        if (iy >= 0 && iy < GRID_SIZE && ix >= 0 && ix < GRID_SIZE) {
                            let d = Math.hypot(ix - tx, iy - ty);
                            if (d <= explosionRadius) {
                                let t = this.game.map.grid[iy][ix];
                                if (t === TILE_TYPES.BRICK || t === TILE_TYPES.HARD_BRICK || t === TILE_TYPES.STEEL || t === TILE_TYPES.BARREL) {
                                    this.game.map.grid[iy][ix] = TILE_TYPES.EMPTY;
                                }
                            }
                        }
                    }
                }
                // Damage tanks
                for (let tank of [...this.game.players, ...this.game.enemies]) {
                    if (!tank.alive) continue;
                    let d = Math.hypot(tank.x/TILE_SIZE - tx, tank.y/TILE_SIZE - ty);
                    if (d <= explosionRadius + 1) tank.destroy(this.owner || this, 5);
                }
            } else if (tile === TILE_TYPES.BASE) {`;
code = code.replace(barrelTriggerRegex, barrelTrigger);

// 5. Death Protection (Spawn STAR or MAX_WEAPON)
let playerDeathRegex = /handlePlayerDeath\(player\) \{[\s\S]*?player\.alive = false;/;
let newPlayerDeath = `handlePlayerDeath(player) {
        // Drop inheritance star
        if (player.level > 0) {
            this.powerUps.push(new PowerUp(this, player.x, player.y, POWERUP_TYPES.MAX_WEAPON));
        }
        player.alive = false;`;
code = code.replace(playerDeathRegex, newPlayerDeath);

fs.writeFileSync('game.js', code);
console.log('Step 1 complete');
