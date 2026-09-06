
const CONFIG = {
    CELL_SIZE: 80,
    COLS: 10,
    ROWS: 6,
    WIDTH: 800,
    HEIGHT: 480,
    START_GOLD: 350,
    START_HP: 10
};

// 0: empty, 1: path, 2: spawn, 3: base (carrot)
const MAP_GRID = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [2, 1, 1, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 0, 0, 1, 1, 1, 0],
    [0, 0, 0, 1, 1, 1, 1, 0, 1, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 1, 3],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
];

// Calculate waypoints from MAP_GRID
let WAYPOINTS = [];
function initWaypoints() {
    WAYPOINTS = [
        {c: 0, r: 1}, {c: 3, r: 1}, {c: 3, r: 3}, 
        {c: 6, r: 3}, {c: 6, r: 2}, {c: 8, r: 2},
        {c: 8, r: 4}, {c: 9, r: 4}
    ];
    // Convert to pixel coordinates (center of cell)
    WAYPOINTS = WAYPOINTS.map(wp => ({
        x: wp.c * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE/2,
        y: wp.r * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE/2
    }));
}

const TOWER_TYPES = {
    'BOTTLE': { cost: 100, range: 160, dmg: 20, cd: 400, color: '#FFEB3B', type: 'single', name: '弓箭', icon: '🏹' },
    'MAGIC':  { cost: 180, range: 120, dmg: 10, cd: 800, color: '#9C27B0', type: 'aoe_ring', name: '魔法', icon: '🔮' },
    'MORTAR': { cost: 220, range: 240, dmg: 40, cd: 1500, color: '#FF5722', type: 'splash', splashRadius: 100, name: '炮塔', icon: '💣' },
    'ICE':    { cost: 150, range: 160, dmg: 5, cd: 1000, color: '#00BCD4', type: 'slow', name: '冰霜', icon: '❄️' }
};

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.overlay = document.getElementById('grid-overlay');
        
        this.state = 'menu'; // menu, playing, gameover
        
        this.resetGame();
        initWaypoints();
        this.setupDOMEvents();
        this.setupGrid();
        
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.gameLoop(t));
    }
    
    resetGame() {
        this.gold = CONFIG.START_GOLD;
        this.hp = CONFIG.START_HP;
        this.wave = 1;
        this.enemies = [];
        this.towers = [];
        this.projectiles = [];
        this.particles = [];
        
        this.spawnTimer = 0;
        this.waveTimer = 0;
        this.enemiesToSpawn = 10;
        this.spawnInterval = 1500;
        
        this.selectedTowerType = null;
        
        // Clear DOM highlights
        document.querySelectorAll('.tower-card').forEach(el => el.classList.remove('selected'));
        this.updateHUD();
    }
    
    setupDOMEvents() {
        document.getElementById('btn-start').onclick = () => {
            this.state = 'playing';
            this.resetGame();
            document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
            document.getElementById('hud-panel').classList.add('active');
            document.getElementById('build-menu').style.display = 'flex';
        };
        
        document.getElementById('btn-restart').onclick = () => {
            this.state = 'menu';
            document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
            document.getElementById('menu-panel').classList.add('active');
            document.getElementById('build-menu').style.display = 'none';
        };
        
        document.querySelectorAll('.tower-card').forEach(card => {
            card.onclick = () => {
                if (this.state !== 'playing') return;
                let type = card.dataset.type;
                if (this.selectedTowerType === type) {
                    this.selectedTowerType = null;
                    card.classList.remove('selected');
                } else {
                    this.selectedTowerType = type;
                    document.querySelectorAll('.tower-card').forEach(el => el.classList.remove('selected'));
                    card.classList.add('selected');
                }
            };
        });
    }
    
    setupGrid() {
        this.overlay.innerHTML = '';
        this.overlay.style.display = 'grid';
        this.overlay.style.gridTemplateColumns = `repeat(${CONFIG.COLS}, ${CONFIG.CELL_SIZE}px)`;
        this.overlay.style.gridTemplateRows = `repeat(${CONFIG.ROWS}, ${CONFIG.CELL_SIZE}px)`;
        
        for (let r = 0; r < CONFIG.ROWS; r++) {
            for (let c = 0; c < CONFIG.COLS; c++) {
                let cell = document.createElement('div');
                cell.style.width = '100%';
                cell.style.height = '100%';
                cell.style.boxSizing = 'border-box';
                cell.style.cursor = MAP_GRID[r][c] === 0 ? 'pointer' : 'not-allowed';
                
                // Optional visual grid lines
                cell.style.border = '1px solid rgba(255,255,255,0.1)';
                
                cell.onclick = () => this.handleCellClick(c, r);
                
                // Hover effect showing range if tower selected
                cell.onmouseover = () => {
                    if (this.selectedTowerType && MAP_GRID[r][c] === 0) {
                        cell.style.backgroundColor = 'rgba(76, 175, 80, 0.4)';
                    }
                };
                cell.onmouseout = () => { cell.style.backgroundColor = 'transparent'; };
                
                this.overlay.appendChild(cell);
            }
        }
    }
    
    handleCellClick(c, r) {
        if (this.state !== 'playing' || !this.selectedTowerType) return;
        
        if (MAP_GRID[r][c] !== 0) return; // Not buildable (path/spawn/base)
        
        // Check if tower already exists here
        if (this.towers.find(t => t.c === c && t.r === r)) return;
        
        let towerDef = TOWER_TYPES[this.selectedTowerType];
        if (this.gold >= towerDef.cost) {
            this.gold -= towerDef.cost;
            this.towers.push({
                c: c, r: r,
                x: c * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE/2,
                y: r * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE/2,
                type: this.selectedTowerType,
                def: towerDef,
                cdTimer: 0,
                targetAngle: 0
            });
            this.updateHUD();
            this.spawnParticles(c * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE/2, r * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE/2, '#FFEB3B', 15);
            
            // Deselect after build
            this.selectedTowerType = null;
            document.querySelectorAll('.tower-card').forEach(el => el.classList.remove('selected'));
        }
    }
    
    spawnEnemy() {
        let hpBase = 100 + (this.wave * 40);
        this.enemies.push({
            wpIdx: 0,
            x: WAYPOINTS[0].x - 40, // start slightly offscreen
            y: WAYPOINTS[0].y,
            maxHp: hpBase,
            hp: hpBase,
            speed: 1.5 + (this.wave * 0.1),
            slowTimer: 0,
            color: `hsl(${Math.random()*360}, 70%, 50%)`
        });
    }
    
    updateHUD() {
        document.getElementById('hud-gold').innerText = this.gold;
        document.getElementById('king-hp-text').innerText = `${this.hp} / ${CONFIG.START_HP}`;
        document.getElementById('hud-wave').innerText = this.wave;
        
        // Update cards availability
        document.querySelectorAll('.tower-card').forEach(card => {
            let cost = TOWER_TYPES[card.dataset.type].cost;
            if (this.gold < cost) card.style.opacity = '0.5';
            else card.style.opacity = '1';
        });
    }
    
    spawnParticles(x, y, color, count) {
        for(let i=0; i<count; i++) {
            this.particles.push({
                x: x, y: y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 1.0, color: color
            });
        }
    }
    
    gameLoop(timestamp) {
        let dt = timestamp - this.lastTime;
        this.lastTime = timestamp;
        if (dt > 100) dt = 16;
        
        if (this.state === 'playing') {
            this.update(dt);
        }
        
        this.draw();
        
        requestAnimationFrame((t) => this.gameLoop(t));
    }
    
    update(dt) {
        // Wave management
        if (this.enemiesToSpawn > 0) {
            this.spawnTimer -= dt;
            if (this.spawnTimer <= 0) {
                this.spawnEnemy();
                this.enemiesToSpawn--;
                this.spawnTimer = this.spawnInterval;
            }
        } else if (this.enemies.length === 0) {
            // Wave cleared!
            this.wave++;
            this.gold += 100 + this.wave * 20; // Wave clear bonus
            this.enemiesToSpawn = 10 + Math.floor(this.wave * 1.5);
            this.spawnInterval = Math.max(500, 1500 - this.wave * 50);
            this.spawnTimer = 2000; // Break between waves
            this.updateHUD();
        }
        
        // Update Enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            let e = this.enemies[i];
            
            if (e.slowTimer > 0) e.slowTimer -= dt;
            let currentSpeed = e.slowTimer > 0 ? e.speed * 0.4 : e.speed;
            let moveDist = currentSpeed * (dt/16);
            
            let target = WAYPOINTS[e.wpIdx];
            let dx = target.x - e.x;
            let dy = target.y - e.y;
            let dist = Math.hypot(dx, dy);
            
            if (dist <= moveDist) {
                e.x = target.x;
                e.y = target.y;
                e.wpIdx++;
                if (e.wpIdx >= WAYPOINTS.length) {
                    // Reached the end!
                    this.hp--;
                    this.enemies.splice(i, 1);
                    this.updateHUD();
                    
                    if (this.hp <= 0) {
                        this.state = 'gameover';
                        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
                        document.getElementById('gameover-panel').classList.add('active');
                        document.getElementById('build-menu').style.display = 'none';
                        document.getElementById('end-desc').innerText = `抵挡到了第 ${this.wave} 波`;
                    }
                    continue;
                }
            } else {
                e.x += (dx / dist) * moveDist;
                e.y += (dy / dist) * moveDist;
            }
        }
        
        // Update Towers
        this.towers.forEach(t => {
            if (t.cdTimer > 0) t.cdTimer -= dt;
            
            // Find target
            let target = null;
            let minDist = t.def.range;
            
            this.enemies.forEach(e => {
                let d = Math.hypot(e.x - t.x, e.y - t.y);
                if (d < minDist) {
                    minDist = d;
                    target = e;
                }
            });
            
            if (target) {
                t.targetAngle = Math.atan2(target.y - t.y, target.x - t.x);
                
                if (t.cdTimer <= 0) {
                    t.cdTimer = t.def.cd;
                    
                    if (t.def.type === 'aoe_ring') {
                        // Magic tower damages everyone in range immediately
                        this.spawnParticles(t.x, t.y, t.def.color, 10);
                        this.enemies.forEach(e => {
                            if (Math.hypot(e.x - t.x, e.y - t.y) <= t.def.range) {
                                e.hp -= t.def.dmg;
                            }
                        });
                    } else {
                        // Shoot projectile
                        this.projectiles.push({
                            x: t.x, y: t.y,
                            target: target,
                            def: t.def,
                            speed: 8
                        });
                    }
                }
            }
        });
        
        // Update Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            let p = this.projectiles[i];
            
            if (p.target && !this.enemies.includes(p.target)) {
                p.target = null; // target died while projectile in air
            }
            
            if (p.target) {
                let dx = p.target.x - p.x;
                let dy = p.target.y - p.y;
                let dist = Math.hypot(dx, dy);
                
                if (dist < 20) {
                    // Hit!
                    if (p.def.type === 'splash') {
                        this.enemies.forEach(e => {
                            if (Math.hypot(e.x - p.target.x, e.y - p.target.y) <= p.def.splashRadius) {
                                e.hp -= p.def.dmg;
                            }
                        });
                        this.spawnParticles(p.x, p.y, p.def.color, 20);
                    } else {
                        p.target.hp -= p.def.dmg;
                        if (p.def.type === 'slow') p.target.slowTimer = 2000;
                        this.spawnParticles(p.x, p.y, p.def.color, 5);
                    }
                    this.projectiles.splice(i, 1);
                    continue;
                } else {
                    p.x += (dx / dist) * p.speed * (dt/16);
                    p.y += (dy / dist) * p.speed * (dt/16);
                }
            } else {
                // Fly straight if target lost
                p.x += p.speed * (dt/16);
                if (p.x < 0 || p.x > CONFIG.WIDTH || p.y < 0 || p.y > CONFIG.HEIGHT) {
                    this.projectiles.splice(i, 1);
                }
            }
        }
        
        // Kill enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            let e = this.enemies[i];
            if (e.hp <= 0) {
                this.gold += 15;
                this.updateHUD();
                this.spawnParticles(e.x, e.y, e.color, 15);
                this.enemies.splice(i, 1);
            }
        }
        
        // Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let pt = this.particles[i];
            pt.x += pt.vx * (dt/16); pt.y += pt.vy * (dt/16);
            pt.life -= dt / 500;
            if(pt.life <= 0) this.particles.splice(i, 1);
        }
    }
    
    draw() {
        // Clear background
        this.ctx.fillStyle = '#8BC34A';
        this.ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
        
        // Draw grid lines
        this.ctx.strokeStyle = 'rgba(0,0,0,0.05)';
        this.ctx.lineWidth = 1;
        for (let r=0; r<=CONFIG.ROWS; r++) { this.ctx.beginPath(); this.ctx.moveTo(0, r*CONFIG.CELL_SIZE); this.ctx.lineTo(CONFIG.WIDTH, r*CONFIG.CELL_SIZE); this.ctx.stroke(); }
        for (let c=0; c<=CONFIG.COLS; c++) { this.ctx.beginPath(); this.ctx.moveTo(c*CONFIG.CELL_SIZE, 0); this.ctx.lineTo(c*CONFIG.CELL_SIZE, CONFIG.HEIGHT); this.ctx.stroke(); }
        
        // Draw Map Tiles
        for (let r = 0; r < CONFIG.ROWS; r++) {
            for (let c = 0; c < CONFIG.COLS; c++) {
                let v = MAP_GRID[r][c];
                let px = c * CONFIG.CELL_SIZE;
                let py = r * CONFIG.CELL_SIZE;
                let s = CONFIG.CELL_SIZE;
                
                if (v === 1 || v === 2 || v === 3) {
                    // Path (dirt)
                    this.ctx.fillStyle = '#D7CCC8';
                    this.ctx.fillRect(px, py, s, s);
                    // Add some dirt texture dots
                    this.ctx.fillStyle = '#BCAAA4';
                    this.ctx.fillRect(px + 10, py + 10, 8, 8);
                    this.ctx.fillRect(px + 50, py + 30, 12, 12);
                    this.ctx.fillRect(px + 20, py + 60, 10, 10);
                }
                
                if (v === 2) {
                    // Spawn Cave
                    this.ctx.fillStyle = '#4E342E';
                    this.ctx.beginPath();
                    this.ctx.arc(px + s/2, py + s/2, s/2.5, 0, Math.PI*2);
                    this.ctx.fill();
                }
                
                if (v === 3) {
                    // Carrot/Base
                    this.ctx.font = '50px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    this.ctx.fillText('🥕', px + s/2, py + s/2);
                }
            }
        }
        
        // Draw Towers
        this.towers.forEach(t => {
            let s = CONFIG.CELL_SIZE;
            // Base
            this.ctx.fillStyle = 'rgba(0,0,0,0.2)';
            this.ctx.beginPath(); this.ctx.ellipse(t.x, t.y + s/3, s/3, s/6, 0, 0, Math.PI*2); this.ctx.fill();
            
            // Tower Icon
            this.ctx.font = '40px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(t.def.icon, t.x, t.y);
            
            // Selected outline range
            if (this.selectedTowerType && !this.selectedTowerType) {
                // If we want to show range of existing towers on click (future enhancement)
            }
        });
        
        // Draw building ghost (if selected)
        if (this.state === 'playing' && this.selectedTowerType) {
            // Find mouse pos from overlay? 
            // In a real game we track mouse, but here hover is handled by DOM
        }
        
        // Draw Enemies
        this.enemies.forEach(e => {
            // Shadow
            this.ctx.fillStyle = 'rgba(0,0,0,0.2)';
            this.ctx.beginPath(); this.ctx.ellipse(e.x, e.y + 20, 20, 8, 0, 0, Math.PI*2); this.ctx.fill();
            
            // Monster body (cute blob)
            this.ctx.fillStyle = e.slowTimer > 0 ? '#81D4FA' : e.color;
            this.ctx.beginPath();
            this.ctx.arc(e.x, e.y, 20, 0, Math.PI*2);
            this.ctx.fill();
            
            // Eyes
            this.ctx.fillStyle = 'white';
            this.ctx.beginPath(); this.ctx.arc(e.x - 8, e.y - 5, 6, 0, Math.PI*2); this.ctx.fill();
            this.ctx.beginPath(); this.ctx.arc(e.x + 8, e.y - 5, 6, 0, Math.PI*2); this.ctx.fill();
            this.ctx.fillStyle = 'black';
            this.ctx.beginPath(); this.ctx.arc(e.x - 8, e.y - 5, 2, 0, Math.PI*2); this.ctx.fill();
            this.ctx.beginPath(); this.ctx.arc(e.x + 8, e.y - 5, 2, 0, Math.PI*2); this.ctx.fill();
            
            // HP Bar
            let hpPct = e.hp / e.maxHp;
            this.ctx.fillStyle = '#000'; this.ctx.fillRect(e.x - 16, e.y - 30, 32, 6);
            this.ctx.fillStyle = hpPct > 0.5 ? '#4CAF50' : '#F44336';
            this.ctx.fillRect(e.x - 15, e.y - 29, 30 * hpPct, 4);
        });
        
        // Draw Projectiles
        this.projectiles.forEach(p => {
            this.ctx.fillStyle = p.def.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.def.type === 'splash' ? 10 : 6, 0, Math.PI*2);
            this.ctx.fill();
            
            // Trail
            this.ctx.fillStyle = 'rgba(255,255,255,0.5)';
            this.ctx.beginPath(); this.ctx.arc(p.x, p.y, p.def.type === 'splash' ? 6 : 3, 0, Math.PI*2); this.ctx.fill();
        });
        
        // Draw Particles
        this.particles.forEach(pt => {
            this.ctx.globalAlpha = pt.life;
            this.ctx.fillStyle = pt.color;
            this.ctx.beginPath(); this.ctx.arc(pt.x, pt.y, 4, 0, Math.PI*2); this.ctx.fill();
            this.ctx.globalAlpha = 1.0;
        });
    }
}

window.addEventListener('load', () => {
    new Game();
});
