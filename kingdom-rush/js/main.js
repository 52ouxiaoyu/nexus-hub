
const CONFIG = {
    CELL_SIZE: 80,
    COLS: 12,
    ROWS: 8,
    WIDTH: 960,
    HEIGHT: 640,
    START_GOLD: 300,
    START_HP: 20
};

// 0: empty, 1: path, 2: spawn, 3: base, 4: small prop, 5: large prop
const MAP_GRID = [
    [4, 4, 0, 0, 0, 5, 5, 0, 0, 4, 4, 0],
    [2, 1, 1, 1, 0, 0, 4, 1, 1, 1, 0, 0],
    [0, 5, 4, 1, 0, 0, 0, 1, 4, 1, 0, 5],
    [0, 0, 0, 1, 1, 1, 1, 1, 0, 1, 0, 4],
    [4, 5, 0, 0, 5, 4, 0, 0, 0, 1, 0, 0],
    [0, 4, 1, 1, 1, 1, 1, 1, 1, 1, 0, 4],
    [0, 0, 1, 4, 5, 0, 4, 0, 5, 0, 0, 5],
    [5, 4, 1, 1, 1, 1, 3, 0, 4, 0, 0, 4]
];

// Calculate waypoints from MAP_GRID intuitively
let WAYPOINTS = [
    {c: 0, r: 1}, {c: 3, r: 1}, {c: 3, r: 3}, {c: 7, r: 3}, 
    {c: 7, r: 1}, {c: 9, r: 1}, {c: 9, r: 5}, {c: 2, r: 5}, 
    {c: 2, r: 7}, {c: 6, r: 7}
];
WAYPOINTS = WAYPOINTS.map(wp => ({
    x: wp.c * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE/2,
    y: wp.r * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE/2
}));

const TOWER_DEFS = {
    'ARCHER': { 
        name: '弓箭塔', icon: '🏹', color: '#a0522d',
        levels: [
            { cost: 70, range: 180, dmg: 10, cd: 400, type: 'single' },
            { cost: 110, range: 200, dmg: 20, cd: 350, type: 'single' },
            { cost: 160, range: 220, dmg: 40, cd: 300, type: 'single' }
        ]
    },
    'MAGE': { 
        name: '魔法塔', icon: '🔮', color: '#8e44ad',
        levels: [
            { cost: 100, range: 150, dmg: 30, cd: 1000, type: 'pierce' },
            { cost: 160, range: 160, dmg: 60, cd: 950, type: 'pierce' },
            { cost: 240, range: 180, dmg: 120, cd: 900, type: 'pierce' }
        ]
    },
    'ARTILLERY': { 
        name: '火炮塔', icon: '💣', color: '#c0392b',
        levels: [
            { cost: 125, range: 140, dmg: 25, cd: 1800, type: 'splash', splash: 80 },
            { cost: 220, range: 150, dmg: 50, cd: 1700, type: 'splash', splash: 90 },
            { cost: 320, range: 160, dmg: 100, cd: 1500, type: 'splash', splash: 110 }
        ]
    },
    'ICE': { 
        name: '冰霜塔', icon: '❄️', color: '#2980b9',
        levels: [
            { cost: 150, range: 130, dmg: 10, cd: 800, type: 'slow', slowDur: 1500, slowMult: 0.6 },
            { cost: 200, range: 150, dmg: 20, cd: 800, type: 'slow', slowDur: 2000, slowMult: 0.5 },
            { cost: 250, range: 170, dmg: 40, cd: 800, type: 'slow', slowDur: 2500, slowMult: 0.4 }
        ]
    }
};

const ENEMY_TYPES = [
    { name: '哥布林', hp: 80, speed: 2.0, reward: 10, color: '#27ae60', size: 12 },
    { name: '兽人', hp: 200, speed: 1.2, reward: 20, color: '#556b2f', size: 16 },
    { name: '狼骑士', hp: 150, speed: 2.8, reward: 25, color: '#8b4513', size: 14 },
    { name: '巨魔 (首领)', hp: 800, speed: 0.8, reward: 100, color: '#2f4f4f', size: 24 }
];

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.overlay = document.getElementById('grid-overlay');
        
        this.state = 'menu';
        
        this.setupDOMEvents();
        this.resetGame();
        
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
        this.props = [];
        
        // Initialize Props from MAP_GRID
        for (let r = 0; r < CONFIG.ROWS; r++) {
            for (let c = 0; c < CONFIG.COLS; c++) {
                if (MAP_GRID[r][c] === 4) {
                    this.props.push({ c: c, r: r, x: c*80+40, y: r*80+40, type: 'tree', hp: 200, maxHp: 200, reward: 50, icon: '🌲' });
                } else if (MAP_GRID[r][c] === 5) {
                    this.props.push({ c: c, r: r, x: c*80+40, y: r*80+40, type: 'rock', hp: 400, maxHp: 400, reward: 100, icon: '🪨' });
                }
            }
        }
        
        this.spawnTimer = 0;
        this.enemiesToSpawn = [];
        this.prepareWave();
        
        this.selectedTowerType = null;
        this.selectedEntity = null; // Can be a tower (to upgrade) or a prop (to target)
        
        document.querySelectorAll('.tower-card').forEach(el => el.classList.remove('selected'));
        document.getElementById('upgrade-menu').style.display = 'none';
        
        this.setupGrid();
        this.updateHUD();
    }
    
    prepareWave() {
        this.enemiesToSpawn = [];
        let count = 10 + this.wave * 2;
        for(let i=0; i<count; i++) {
            if (i === count-1 && this.wave % 5 === 0) {
                this.enemiesToSpawn.push(3); // Boss
            } else if (Math.random() < 0.2 && this.wave > 2) {
                this.enemiesToSpawn.push(2); // Wolf
            } else if (Math.random() < 0.4 && this.wave > 1) {
                this.enemiesToSpawn.push(1); // Orc
            } else {
                this.enemiesToSpawn.push(0); // Goblin
            }
        }
        this.spawnInterval = Math.max(600, 1500 - this.wave * 50);
        this.spawnTimer = 2000;
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
                this.selectedEntity = null; // clear tower selection
                document.getElementById('upgrade-menu').style.display = 'none';
                
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
        
        document.getElementById('btn-upgrade').onclick = () => {
            if (this.selectedEntity && this.selectedEntity.isTower && this.selectedEntity.lvl < 2) {
                let def = TOWER_DEFS[this.selectedEntity.type].levels[this.selectedEntity.lvl + 1];
                if (this.gold >= def.cost) {
                    this.gold -= def.cost;
                    this.selectedEntity.lvl++;
                    this.spawnParticles(this.selectedEntity.x, this.selectedEntity.y, '#ffd700', 20);
                    this.updateUpgradeMenu();
                    this.updateHUD();
                }
            }
        };
        
        document.getElementById('btn-sell').onclick = () => {
            if (this.selectedEntity && this.selectedEntity.isTower) {
                let totalCost = 0;
                for(let i=0; i<=this.selectedEntity.lvl; i++) totalCost += TOWER_DEFS[this.selectedEntity.type].levels[i].cost;
                this.gold += Math.floor(totalCost * 0.6);
                
                this.towers = this.towers.filter(t => t !== this.selectedEntity);
                this.spawnParticles(this.selectedEntity.x, this.selectedEntity.y, '#ccc', 15);
                this.selectedEntity = null;
                document.getElementById('upgrade-menu').style.display = 'none';
                this.updateHUD();
            }
        };
    }
    
    setupGrid() {
        this.overlay.innerHTML = '';
        this.overlay.style.display = 'grid';
        this.overlay.style.gridTemplateColumns = `repeat(${CONFIG.COLS}, ${CONFIG.CELL_SIZE}px)`;
        this.overlay.style.gridTemplateRows = `repeat(${CONFIG.ROWS}, ${CONFIG.CELL_SIZE}px)`;
        
        for (let r = 0; r < CONFIG.ROWS; r++) {
            for (let c = 0; c < CONFIG.COLS; c++) {
                let cell = document.createElement('div');
                cell.style.width = '100%'; cell.style.height = '100%';
                
                cell.onclick = (e) => {
                    if (this.state !== 'playing') return;
                    
                    // Check if clicked on a tower
                    let clickedTower = this.towers.find(t => t.c === c && t.r === r);
                    if (clickedTower) {
                        this.selectedTowerType = null;
                        document.querySelectorAll('.tower-card').forEach(el => el.classList.remove('selected'));
                        this.selectedEntity = clickedTower;
                        this.updateUpgradeMenu();
                        
                        let menu = document.getElementById('upgrade-menu');
                        menu.style.display = 'flex';
                        menu.style.left = (c * 80 + 40) + 'px';
                        menu.style.top = (r * 80) + 'px';
                        return;
                    }
                    
                    // Check if clicked on a prop (to target it)
                    let clickedProp = this.props.find(p => p.c === c && p.r === r);
                    if (clickedProp) {
                        this.selectedTowerType = null;
                        document.querySelectorAll('.tower-card').forEach(el => el.classList.remove('selected'));
                        this.selectedEntity = clickedProp;
                        document.getElementById('upgrade-menu').style.display = 'none';
                        // Add target marker
                        this.spawnParticles(clickedProp.x, clickedProp.y, '#f39c12', 10);
                        return;
                    }
                    
                    // Clicked empty space
                    document.getElementById('upgrade-menu').style.display = 'none';
                    if (MAP_GRID[r][c] === 0 && this.selectedTowerType) {
                        let towerDef = TOWER_DEFS[this.selectedTowerType].levels[0];
                        if (this.gold >= towerDef.cost) {
                            this.gold -= towerDef.cost;
                            this.towers.push({
                                isTower: true, c: c, r: r,
                                x: c * 80 + 40, y: r * 80 + 40,
                                type: this.selectedTowerType, lvl: 0, cdTimer: 0
                            });
                            this.updateHUD();
                            this.spawnParticles(c * 80 + 40, r * 80 + 40, '#FFD700', 15);
                            this.selectedTowerType = null;
                            document.querySelectorAll('.tower-card').forEach(el => el.classList.remove('selected'));
                        }
                    } else {
                        this.selectedEntity = null;
                    }
                };
                
                cell.onmouseover = () => {
                    if (this.selectedTowerType && MAP_GRID[r][c] === 0) {
                        cell.style.backgroundColor = 'rgba(255, 215, 0, 0.2)';
                    }
                };
                cell.onmouseout = () => { cell.style.backgroundColor = 'transparent'; };
                
                this.overlay.appendChild(cell);
            }
        }
    }
    
    updateUpgradeMenu() {
        if (!this.selectedEntity || !this.selectedEntity.isTower) return;
        let t = this.selectedEntity;
        let baseDef = TOWER_DEFS[t.type];
        
        let title = document.getElementById('upg-title');
        title.innerText = `${baseDef.name} Lv.${t.lvl + 1}`;
        
        let btnUpg = document.getElementById('btn-upgrade');
        if (t.lvl < 2) {
            let nextDef = baseDef.levels[t.lvl + 1];
            btnUpg.innerText = `升级 (${nextDef.cost})`;
            btnUpg.disabled = this.gold < nextDef.cost;
        } else {
            btnUpg.innerText = `已满级`;
            btnUpg.disabled = true;
        }
        
        let totalCost = 0;
        for(let i=0; i<=t.lvl; i++) totalCost += baseDef.levels[i].cost;
        document.getElementById('btn-sell').innerText = `出售 (${Math.floor(totalCost * 0.6)})`;
    }
    
    updateHUD() {
        document.getElementById('hud-gold').innerText = this.gold;
        document.getElementById('king-hp-text').innerText = `${this.hp} / ${CONFIG.START_HP}`;
        document.getElementById('hud-wave').innerText = this.wave;
        
        document.querySelectorAll('.tower-card').forEach(card => {
            let cost = TOWER_DEFS[card.dataset.type].levels[0].cost;
            if (this.gold < cost) card.style.opacity = '0.4';
            else card.style.opacity = '1';
        });
        
        if (this.selectedEntity && this.selectedEntity.isTower) {
            this.updateUpgradeMenu();
        }
    }
    
    spawnParticles(x, y, color, count) {
        for(let i=0; i<count; i++) {
            this.particles.push({
                x: x + (Math.random()-0.5)*20, y: y + (Math.random()-0.5)*20,
                vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4,
                life: 1.0, color: color
            });
        }
    }
    
    gameLoop(timestamp) {
        let dt = timestamp - this.lastTime;
        this.lastTime = timestamp;
        if (dt > 100) dt = 16;
        
        if (this.state === 'playing') this.update(dt);
        this.draw();
        
        requestAnimationFrame((t) => this.gameLoop(t));
    }
    
    update(dt) {
        // Wave
        if (this.enemiesToSpawn.length > 0) {
            this.spawnTimer -= dt;
            if (this.spawnTimer <= 0) {
                let eTypeIdx = this.enemiesToSpawn.shift();
                let eDef = ENEMY_TYPES[eTypeIdx];
                let maxHp = eDef.hp * (1 + this.wave * 0.2);
                this.enemies.push({
                    def: eDef, wpIdx: 0,
                    x: WAYPOINTS[0].x - 40, y: WAYPOINTS[0].y,
                    maxHp: maxHp, hp: maxHp, slowTimer: 0
                });
                this.spawnTimer = this.spawnInterval;
            }
        } else if (this.enemies.length === 0) {
            this.wave++;
            this.gold += 150 + this.wave * 10;
            this.prepareWave();
            this.updateHUD();
        }
        
        // Enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            let e = this.enemies[i];
            if (e.slowTimer > 0) e.slowTimer -= dt;
            
            let spd = e.def.speed * (e.slowTimer > 0 ? 0.5 : 1.0);
            let moveDist = spd * (dt/16);
            
            let target = WAYPOINTS[e.wpIdx];
            let dx = target.x - e.x;
            let dy = target.y - e.y;
            let dist = Math.hypot(dx, dy);
            
            if (dist <= moveDist) {
                e.x = target.x; e.y = target.y;
                e.wpIdx++;
                if (e.wpIdx >= WAYPOINTS.length) {
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
        
        // Towers
        this.towers.forEach(t => {
            if (t.cdTimer > 0) t.cdTimer -= dt;
            
            let def = TOWER_DEFS[t.type].levels[t.lvl];
            let target = null;
            let minDist = def.range;
            
            // Priority: Explicit prop target > Enemies
            if (this.selectedEntity && !this.selectedEntity.isTower) {
                let p = this.selectedEntity; // Prop
                let d = Math.hypot(p.x - t.x, p.y - t.y);
                if (d <= def.range) {
                    target = p;
                }
            }
            
            if (!target) {
                // Find enemy furthest along the path (highest wpIdx, lowest dist to next wp)
                let bestScore = -1;
                this.enemies.forEach(e => {
                    let d = Math.hypot(e.x - t.x, e.y - t.y);
                    if (d <= def.range) {
                        let distToNext = Math.hypot(WAYPOINTS[e.wpIdx].x - e.x, WAYPOINTS[e.wpIdx].y - e.y);
                        let score = e.wpIdx * 1000 - distToNext; // Higher score = closer to end
                        if (score > bestScore) {
                            bestScore = score;
                            target = e;
                        }
                    }
                });
            }
            
            if (target && t.cdTimer <= 0) {
                t.cdTimer = def.cd;
                this.projectiles.push({
                    x: t.x, y: t.y - 20,
                    target: target,
                    def: def, color: TOWER_DEFS[t.type].color, speed: 10
                });
            }
        });
        
        // Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            let p = this.projectiles[i];
            
            // If target is an enemy and it died, projectile still flies to last known pos? Or just disappears.
            // Let's make it disappear if enemy dies to keep it simple, or track x/y. Track x/y is better.
            let tx = p.target.x;
            let ty = p.target.y;
            
            let dx = tx - p.x;
            let dy = ty - p.y;
            let dist = Math.hypot(dx, dy);
            
            if (dist < 15) {
                // Hit
                if (p.def.type === 'splash') {
                    this.spawnParticles(tx, ty, '#e74c3c', 20);
                    this.enemies.forEach(e => {
                        if (Math.hypot(e.x - tx, e.y - ty) <= p.def.splash) {
                            e.hp -= p.def.dmg;
                        }
                    });
                    // Also damage props in splash
                    this.props.forEach(prop => {
                        if (Math.hypot(prop.x - tx, prop.y - ty) <= p.def.splash) {
                            prop.hp -= p.def.dmg;
                        }
                    });
                } else {
                    p.target.hp -= p.def.dmg;
                    if (p.def.type === 'slow' && p.target.def) { // Only slow enemies
                        p.target.slowTimer = p.def.slowDur;
                    }
                    this.spawnParticles(tx, ty, p.color, 5);
                }
                this.projectiles.splice(i, 1);
            } else {
                p.x += (dx / dist) * p.speed * (dt/16);
                p.y += (dy / dist) * p.speed * (dt/16);
            }
        }
        
        // Kill Enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            if (this.enemies[i].hp <= 0) {
                let e = this.enemies[i];
                this.gold += e.def.reward;
                this.spawnParticles(e.x, e.y, e.def.color, 15);
                this.enemies.splice(i, 1);
                this.updateHUD();
            }
        }
        
        // Kill Props
        for (let i = this.props.length - 1; i >= 0; i--) {
            if (this.props[i].hp <= 0) {
                let prop = this.props[i];
                this.gold += prop.reward;
                MAP_GRID[prop.r][prop.c] = 0; // Free the grid!
                this.spawnParticles(prop.x, prop.y, '#d4af37', 30);
                if (this.selectedEntity === prop) this.selectedEntity = null;
                this.props.splice(i, 1);
                this.updateHUD();
            }
        }
        
        // Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let pt = this.particles[i];
            pt.x += pt.vx * (dt/16); pt.y += pt.vy * (dt/16);
            pt.life -= dt / 1000;
            if(pt.life <= 0) this.particles.splice(i, 1);
        }
    }
    
    draw() {
        // Epic Background (Grass/Dirt)
        this.ctx.fillStyle = '#355E24'; // KR Grass
        this.ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
        
        // Draw Path
        for (let r = 0; r < CONFIG.ROWS; r++) {
            for (let c = 0; c < CONFIG.COLS; c++) {
                let v = MAP_GRID[r][c];
                let px = c * CONFIG.CELL_SIZE;
                let py = r * CONFIG.CELL_SIZE;
                let s = CONFIG.CELL_SIZE;
                
                if (v === 1 || v === 2 || v === 3) {
                    this.ctx.fillStyle = '#6d5b4c'; // Dirt path
                    this.ctx.fillRect(px, py, s, s);
                    this.ctx.fillStyle = '#5d4037';
                    this.ctx.fillRect(px + 10, py + 10, 10, 10);
                    this.ctx.fillRect(px + 50, py + 50, 15, 15);
                }
                
                if (v === 2) {
                    this.ctx.fillStyle = '#2b1712'; // Spawn cave
                    this.ctx.beginPath(); this.ctx.arc(px + s/2, py + s/2, s/2.2, 0, Math.PI*2); this.ctx.fill();
                    this.ctx.fillStyle = '#111';
                    this.ctx.beginPath(); this.ctx.arc(px + s/2, py + s/2, s/3, 0, Math.PI*2); this.ctx.fill();
                }
                
                if (v === 3) {
                    // Castle / Base
                    this.ctx.font = '50px Arial';
                    this.ctx.textAlign = 'center'; this.ctx.textBaseline = 'middle';
                    this.ctx.fillText('🏰', px + s/2, py + s/2);
                }
            }
        }
        
        // Grid lines (subtle)
        this.ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        this.ctx.lineWidth = 1;
        for(let r=0; r<=CONFIG.ROWS; r++) { this.ctx.beginPath(); this.ctx.moveTo(0, r*80); this.ctx.lineTo(960, r*80); this.ctx.stroke(); }
        for(let c=0; c<=CONFIG.COLS; c++) { this.ctx.beginPath(); this.ctx.moveTo(c*80, 0); this.ctx.lineTo(c*80, 640); this.ctx.stroke(); }
        
        // Draw Props
        this.props.forEach(p => {
            this.ctx.font = '50px Arial';
            this.ctx.textAlign = 'center'; this.ctx.textBaseline = 'middle';
            this.ctx.fillText(p.icon, p.x, p.y);
            
            // Prop HP
            if (p.hp < p.maxHp) {
                let hpPct = p.hp / p.maxHp;
                this.ctx.fillStyle = '#000'; this.ctx.fillRect(p.x - 20, p.y - 30, 40, 6);
                this.ctx.fillStyle = '#d4af37'; this.ctx.fillRect(p.x - 19, p.y - 29, 38 * hpPct, 4);
            }
            
            // Targeted mark
            if (this.selectedEntity === p) {
                this.ctx.strokeStyle = '#e74c3c'; this.ctx.lineWidth = 3;
                this.ctx.strokeRect(p.x - 30, p.y - 30, 60, 60);
                this.ctx.fillStyle = '#e74c3c';
                this.ctx.fillText('🎯', p.x, p.y - 40);
            }
        });
        
        // Draw Towers
        this.towers.forEach(t => {
            // Shadow
            this.ctx.fillStyle = 'rgba(0,0,0,0.4)';
            this.ctx.beginPath(); this.ctx.ellipse(t.x, t.y + 20, 25, 10, 0, 0, Math.PI*2); this.ctx.fill();
            
            // Base based on level
            this.ctx.fillStyle = ['#7f8c8d', '#bdc3c7', '#ecf0f1'][t.lvl];
            this.ctx.fillRect(t.x - 25, t.y - 15 - t.lvl*5, 50, 30 + t.lvl*5);
            this.ctx.fillStyle = '#2c3e50';
            this.ctx.fillRect(t.x - 25, t.y + 15, 50, 5);
            
            this.ctx.font = '36px Arial';
            this.ctx.fillText(TOWER_DEFS[t.type].icon, t.x, t.y - 10 - t.lvl*10);
            
            // Level indicator
            this.ctx.fillStyle = '#d4af37';
            this.ctx.font = '12px Arial';
            let stars = ''; for(let i=0; i<=t.lvl; i++) stars += '★';
            this.ctx.fillText(stars, t.x, t.y + 25);
            
            if (this.selectedEntity === t) {
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(t.x, t.y, TOWER_DEFS[t.type].levels[t.lvl].range, 0, Math.PI*2);
                this.ctx.stroke();
            }
        });
        
        // Ghost Tower Range
        if (this.selectedTowerType && this.state === 'playing') {
            // Can't easily track mouse in canvas without adding an event listener.
            // But we can just show global highlight.
        }
        
        // Draw Enemies
        this.enemies.forEach(e => {
            this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
            this.ctx.beginPath(); this.ctx.ellipse(e.x, e.y + e.def.size, e.def.size, e.def.size/2, 0, 0, Math.PI*2); this.ctx.fill();
            
            this.ctx.fillStyle = e.slowTimer > 0 ? '#3498db' : e.def.color;
            this.ctx.beginPath(); this.ctx.arc(e.x, e.y, e.def.size, 0, Math.PI*2); this.ctx.fill();
            
            let hpPct = e.hp / e.maxHp;
            this.ctx.fillStyle = '#000'; this.ctx.fillRect(e.x - 12, e.y - e.def.size - 10, 24, 4);
            this.ctx.fillStyle = hpPct > 0.5 ? '#2ecc71' : '#e74c3c';
            this.ctx.fillRect(e.x - 11, e.y - e.def.size - 9, 22 * hpPct, 2);
        });
        
        // Draw Projectiles
        this.projectiles.forEach(p => {
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath(); this.ctx.arc(p.x, p.y, p.def.type === 'splash' ? 8 : 4, 0, Math.PI*2); this.ctx.fill();
        });
        
        // Particles
        this.particles.forEach(pt => {
            this.ctx.globalAlpha = pt.life;
            this.ctx.fillStyle = pt.color;
            this.ctx.fillRect(pt.x, pt.y, 4, 4);
            this.ctx.globalAlpha = 1.0;
        });
    }
}

window.addEventListener('load', () => new Game());
