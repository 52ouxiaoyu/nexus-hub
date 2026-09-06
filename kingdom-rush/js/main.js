
const CONFIG = {
    CELL_SIZE: 80, COLS: 12, ROWS: 8, WIDTH: 960, HEIGHT: 640,
    START_GOLD: 400, START_HP: 20
};

// 0: empty, 1: path, 2: spawn, 3: base, 4: tree, 5: rock
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

let WAYPOINTS = [
    {c: 0, r: 1}, {c: 3, r: 1}, {c: 3, r: 3}, {c: 7, r: 3}, 
    {c: 7, r: 1}, {c: 9, r: 1}, {c: 9, r: 5}, {c: 2, r: 5}, 
    {c: 2, r: 7}, {c: 6, r: 7}
].map(wp => ({x: wp.c * 80 + 40, y: wp.r * 80 + 40}));

const TOWER_DEFS = {
    'ARCHER': { 
        name: '弓箭塔', color: '#a0522d', dmgType: 'physical', baseColor: '#5d4037', barrelColor: '#8d6e63',
        levels: [
            { cost: 70, range: 180, dmg: 15, cd: 400, type: 'single' },
            { cost: 110, range: 230, dmg: 30, cd: 350, type: 'single' },
            { cost: 160, range: 280, dmg: 55, cd: 300, type: 'single' }
        ]
    },
    'MAGE': { 
        name: '魔法塔', color: '#9b59b6', dmgType: 'magic', baseColor: '#34495e', barrelColor: '#8e44ad',
        levels: [
            { cost: 100, range: 160, dmg: 40, cd: 1200, type: 'single' },
            { cost: 160, range: 200, dmg: 80, cd: 1100, type: 'single' },
            { cost: 240, range: 250, dmg: 160, cd: 1000, type: 'single' }
        ]
    },
    'ARTILLERY': { 
        name: '火炮塔', color: '#e74c3c', dmgType: 'physical', baseColor: '#2c3e50', barrelColor: '#7f8c8d',
        levels: [
            { cost: 125, range: 150, dmg: 35, cd: 2000, type: 'splash', splash: 90 },
            { cost: 220, range: 190, dmg: 70, cd: 1800, type: 'splash', splash: 100 },
            { cost: 320, range: 230, dmg: 140, cd: 1600, type: 'splash', splash: 120 }
        ]
    },
    'ICE': { 
        name: '冰霜塔', color: '#3498db', dmgType: 'magic', baseColor: '#ecf0f1', barrelColor: '#2980b9',
        levels: [
            { cost: 150, range: 140, dmg: 15, cd: 1000, type: 'splash', splash: 80, slowDur: 1500, slowMult: 0.6 },
            { cost: 200, range: 180, dmg: 30, cd: 950, type: 'splash', splash: 90, slowDur: 2000, slowMult: 0.5 },
            { cost: 250, range: 220, dmg: 50, cd: 900, type: 'splash', splash: 100, slowDur: 2500, slowMult: 0.4 }
        ]
    },
    'SNIPER': { 
        name: '巨弩塔', color: '#f39c12', dmgType: 'physical', baseColor: '#5c4033', barrelColor: '#d35400',
        levels: [
            { cost: 180, range: 250, dmg: 100, cd: 2500, type: 'single' },
            { cost: 250, range: 300, dmg: 220, cd: 2300, type: 'single' },
            { cost: 380, range: 380, dmg: 450, cd: 2000, type: 'single' }
        ]
    },
    'POISON': { 
        name: '剧毒塔', color: '#27ae60', dmgType: 'magic', baseColor: '#1e824c', barrelColor: '#2ecc71',
        levels: [
            { cost: 140, range: 140, dmg: 10, cd: 1500, type: 'poison', splash: 70, poisonDmg: 5, poisonDur: 4000 },
            { cost: 200, range: 170, dmg: 20, cd: 1400, type: 'poison', splash: 80, poisonDmg: 12, poisonDur: 4000 },
            { cost: 280, range: 200, dmg: 35, cd: 1300, type: 'poison', splash: 90, poisonDmg: 25, poisonDur: 4000 }
        ]
    }
};

const ENEMY_DEFS = {
    'GOBLIN': { name: '哥布林', hp: 80, speed: 2.5, reward: 10, color: '#2ecc71', size: 10, armor: 0, mr: 0, flying: false },
    'ORC': { name: '重甲兽人', hp: 250, speed: 1.2, reward: 20, color: '#27ae60', size: 16, armor: 50, mr: 0, flying: false },
    'GARGOYLE': { name: '石像鬼', hp: 120, speed: 1.8, reward: 25, color: '#7f8c8d', size: 14, armor: 0, mr: 70, flying: true },
    'BOSS': { name: '巨魔首领', hp: 1500, speed: 0.8, reward: 150, color: '#1abc9c', size: 24, armor: 30, mr: 30, flying: false, boss: true }
};

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.overlay = document.getElementById('grid-overlay');
        this.state = 'menu';
        this.gameSpeed = 1.0;
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        this.setupDOMEvents();
        this.resetGame();
        
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.gameLoop(t));
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.offsetX = (window.innerWidth - CONFIG.WIDTH) / 2;
        this.offsetY = (window.innerHeight - CONFIG.HEIGHT) / 2;
        
        this.overlay.style.width = CONFIG.WIDTH + 'px';
        this.overlay.style.height = CONFIG.HEIGHT + 'px';
        this.overlay.style.left = this.offsetX + 'px';
        this.overlay.style.top = this.offsetY + 'px';
        
        if (this.state === 'playing' && this.selectedEntity && this.selectedEntity.isTower) {
            let menu = document.getElementById('upgrade-menu');
            menu.style.left = (this.selectedEntity.c * 80 + 40 + this.offsetX) + 'px'; 
            menu.style.top = (this.selectedEntity.r * 80 + this.offsetY) + 'px';
        }
    }
    
    resetGame() {
        this.gold = CONFIG.START_GOLD;
        this.hp = CONFIG.START_HP;
        this.wave = 0;
        this.enemies = []; this.towers = []; this.projectiles = []; this.particles = []; this.props = [];
        
        for (let r = 0; r < CONFIG.ROWS; r++) {
            for (let c = 0; c < CONFIG.COLS; c++) {
                if (MAP_GRID[r][c] === 4) this.props.push({ c: c, r: r, x: c*80+40, y: r*80+40, type: 'tree', hp: 300, maxHp: 300, reward: 50, color: '#228B22' });
                else if (MAP_GRID[r][c] === 5) this.props.push({ c: c, r: r, x: c*80+40, y: r*80+40, type: 'rock', hp: 600, maxHp: 600, reward: 100, color: '#808080' });
            }
        }
        
        this.spawnTimer = 0;
        this.enemiesToSpawn = [];
        this.waveBreakTimer = 5000; 
        
        this.selectedTowerType = null;
        this.selectedEntity = null;
        
        document.querySelectorAll('.tower-card').forEach(el => el.classList.remove('selected'));
        document.getElementById('upgrade-menu').style.display = 'none';
        
        this.setupGrid();
        this.updateHUD();
    }
    
    prepareNextWave() {
        this.wave++;
        this.enemiesToSpawn = [];
        let count = 10 + this.wave * 3;
        for(let i=0; i<count; i++) {
            if (i === count-1 && this.wave % 4 === 0) this.enemiesToSpawn.push('BOSS');
            else if (Math.random() < 0.25 && this.wave > 3) this.enemiesToSpawn.push('GARGOYLE');
            else if (Math.random() < 0.4 && this.wave > 1) this.enemiesToSpawn.push('ORC');
            else this.enemiesToSpawn.push('GOBLIN');
        }
        this.spawnInterval = Math.max(500, 1500 - this.wave * 50);
        this.waveBreakTimer = 0;
        document.getElementById('btn-call-wave').style.display = 'none';
        this.updateHUD();
    }
    
    setupDOMEvents() {
        document.getElementById('btn-start').onclick = () => {
            Audio.init(); Audio.resume();
            this.state = 'playing'; this.resetGame();
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
        
        this.speeds = [1.0, 2.0, 3.0, 5.0];
        document.getElementById('btn-speed').onclick = () => {
            let idx = this.speeds.indexOf(this.gameSpeed);
            idx = (idx + 1) % this.speeds.length;
            this.gameSpeed = this.speeds[idx];
            document.getElementById('btn-speed').innerText = `▶️ ${this.gameSpeed}x`;
        };
        
        document.getElementById('btn-call-wave').onclick = () => {
            if (this.waveBreakTimer > 0) {
                this.gold += Math.floor(this.waveBreakTimer / 100); 
                this.prepareNextWave();
                Audio.playGoodItem();
                this.spawnParticles(WAYPOINTS[0].x, WAYPOINTS[0].y, '#ffd700', 30);
            }
        };
        
        document.querySelectorAll('.tower-card').forEach(card => {
            card.onclick = () => {
                if (this.state !== 'playing') return;
                this.selectedEntity = null; document.getElementById('upgrade-menu').style.display = 'none';
                let type = card.dataset.type;
                if (this.selectedTowerType === type) { this.selectedTowerType = null; card.classList.remove('selected'); }
                else {
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
                    this.spawnParticles(this.selectedEntity.x, this.selectedEntity.y, '#ffd700', 30);
                    Audio.playGoodItem();
                    this.updateUpgradeMenu(); this.updateHUD();
                }
            }
        };
        
        document.getElementById('btn-sell').onclick = () => {
            if (this.selectedEntity && this.selectedEntity.isTower) {
                let totalCost = 0;
                for(let i=0; i<=this.selectedEntity.lvl; i++) totalCost += TOWER_DEFS[this.selectedEntity.type].levels[i].cost;
                this.gold += Math.floor(totalCost * 0.6);
                this.towers = this.towers.filter(t => t !== this.selectedEntity);
                this.spawnParticles(this.selectedEntity.x, this.selectedEntity.y, '#ccc', 20);
                Audio.playHit();
                this.selectedEntity = null; document.getElementById('upgrade-menu').style.display = 'none';
                this.updateHUD();
            }
        };
    }
    
    setupGrid() {
        this.overlay.innerHTML = ''; this.overlay.style.display = 'grid';
        this.overlay.style.gridTemplateColumns = `repeat(${CONFIG.COLS}, 80px)`;
        this.overlay.style.gridTemplateRows = `repeat(${CONFIG.ROWS}, 80px)`;
        
        for (let r = 0; r < CONFIG.ROWS; r++) {
            for (let c = 0; c < CONFIG.COLS; c++) {
                let cell = document.createElement('div');
                cell.style.width = '100%'; cell.style.height = '100%';
                
                cell.onclick = () => {
                    if (this.state !== 'playing') return;
                    
                    let clickedTower = this.towers.find(t => t.c === c && t.r === r);
                    if (clickedTower) {
                        this.selectedTowerType = null; document.querySelectorAll('.tower-card').forEach(el => el.classList.remove('selected'));
                        this.selectedEntity = clickedTower;
                        this.updateUpgradeMenu();
                        let menu = document.getElementById('upgrade-menu');
                        menu.style.display = 'flex'; menu.style.left = (c * 80 + 40 + this.offsetX) + 'px'; menu.style.top = (r * 80 + this.offsetY) + 'px';
                        Audio.playHit(); return;
                    }
                    
                    let clickedProp = this.props.find(p => p.c === c && p.r === r);
                    if (clickedProp) {
                        this.selectedTowerType = null; document.querySelectorAll('.tower-card').forEach(el => el.classList.remove('selected'));
                        this.selectedEntity = clickedProp; document.getElementById('upgrade-menu').style.display = 'none';
                        this.spawnParticles(clickedProp.x, clickedProp.y, '#e74c3c', 10);
                        Audio.playHit(); return;
                    }
                    
                    document.getElementById('upgrade-menu').style.display = 'none';
                    if (MAP_GRID[r][c] === 0 && this.selectedTowerType) {
                        let towerDef = TOWER_DEFS[this.selectedTowerType].levels[0];
                        if (this.gold >= towerDef.cost) {
                            this.gold -= towerDef.cost;
                            this.towers.push({
                                isTower: true, c: c, r: r, x: c * 80 + 40, y: r * 80 + 40,
                                type: this.selectedTowerType, lvl: 0, cdTimer: 0, angle: 0, recoil: 0
                            });
                            this.updateHUD();
                            this.spawnParticles(c * 80 + 40, r * 80 + 40, '#FFD700', 20);
                            Audio.playShoot();
                            this.selectedTowerType = null; document.querySelectorAll('.tower-card').forEach(el => el.classList.remove('selected'));
                        }
                    } else { this.selectedEntity = null; }
                };
                
                cell.onmouseover = () => { if (this.selectedTowerType && MAP_GRID[r][c] === 0) cell.style.backgroundColor = 'rgba(255, 215, 0, 0.2)'; };
                cell.onmouseout = () => { cell.style.backgroundColor = 'transparent'; };
                this.overlay.appendChild(cell);
            }
        }
    }
    
    updateUpgradeMenu() {
        if (!this.selectedEntity || !this.selectedEntity.isTower) return;
        let t = this.selectedEntity; let baseDef = TOWER_DEFS[t.type];
        
        let curDef = baseDef.levels[t.lvl];
        document.getElementById('upg-title').innerText = `${baseDef.name} Lv.${t.lvl + 1}`;
        
        let statsDiv = document.getElementById('upg-stats');
        let btnUpg = document.getElementById('btn-upgrade');
        
        if (t.lvl < baseDef.levels.length - 1) {
            let nextDef = baseDef.levels[t.lvl + 1];
            
            // Build stats preview
            let dpsCur = Math.round(curDef.dmg / (curDef.cd / 1000)) + (curDef.poisonDmg || 0);
            let dpsNext = Math.round(nextDef.dmg / (nextDef.cd / 1000)) + (nextDef.poisonDmg || 0);
            
            statsDiv.innerHTML = `
                🗡️ 秒伤: ${dpsCur} <span style="color:#2ecc71;">➜ ${dpsNext}</span><br>
                🎯 范围: ${curDef.range} <span style="color:#2ecc71;">➜ ${nextDef.range}</span>
            `;
            statsDiv.style.display = 'block';
            
            btnUpg.innerText = `升级 (${nextDef.cost})`; btnUpg.disabled = this.gold < nextDef.cost;
        } else {
            let dpsCur = Math.round(curDef.dmg / (curDef.cd / 1000));
            statsDiv.innerHTML = `🗡️ 秒伤: ${dpsCur}<br>🎯 范围: ${curDef.range}`;
            statsDiv.style.display = 'block';
            
            btnUpg.innerText = `已满级`; btnUpg.disabled = true;
        }
        
        let totalCost = 0; for(let i=0; i<=t.lvl; i++) totalCost += baseDef.levels[i].cost;
        document.getElementById('btn-sell').innerText = `出售 (${Math.floor(totalCost * 0.6)})`;
    }
    
    updateHUD() {
        document.getElementById('hud-gold').innerText = this.gold;
        document.getElementById('king-hp-text').innerText = `${this.hp} / ${CONFIG.START_HP}`;
        document.getElementById('hud-wave').innerText = this.wave === 0 ? 1 : this.wave;
        
        document.querySelectorAll('.tower-card').forEach(card => {
            let cost = TOWER_DEFS[card.dataset.type].levels[0].cost;
            if (this.gold < cost) card.style.opacity = '0.4'; else card.style.opacity = '1';
        });
        if (this.selectedEntity && this.selectedEntity.isTower) this.updateUpgradeMenu();
    }
    
    spawnParticles(x, y, color, count, speedMult=1) {
        for(let i=0; i<count; i++) {
            this.particles.push({
                x: x, y: y,
                vx: (Math.random() - 0.5) * 8 * speedMult, vy: (Math.random() - 0.5) * 8 * speedMult,
                life: 1.0, color: color
            });
        }
    }
    
    gameLoop(timestamp) {
        let dt = (timestamp - this.lastTime) * this.gameSpeed;
        this.lastTime = timestamp;
        if (dt > 100 * this.gameSpeed) dt = 16 * this.gameSpeed;
        
        if (this.state === 'playing') this.update(dt);
        this.draw();
        
        requestAnimationFrame((t) => this.gameLoop(t));
    }
    
    calculateDamage(dmg, type, armor, mr) {
        if (type === 'physical') {
            let reduction = armor / (armor + 100);
            return Math.max(1, dmg * (1 - reduction));
        } else if (type === 'magic') {
            let reduction = mr / (mr + 100);
            return Math.max(1, dmg * (1 - reduction));
        }
        return dmg;
    }
    
    update(dt) {
        // Wave Management
        if (this.waveBreakTimer > 0) {
            this.waveBreakTimer -= dt;
            let btn = document.getElementById('btn-call-wave');
            btn.style.display = 'inline-block';
            btn.innerText = `提前召唤(+${Math.floor(this.waveBreakTimer/100)}🪙)`;
            if (this.waveBreakTimer <= 0) {
                this.prepareNextWave();
            }
        } else if (this.enemiesToSpawn.length > 0) {
            this.spawnTimer -= dt;
            if (this.spawnTimer <= 0) {
                let eKey = this.enemiesToSpawn.shift();
                let eDef = ENEMY_DEFS[eKey];
                let maxHp = eDef.hp * (1 + this.wave * 0.15); // Health scaling
                
                // Gargoyles fly direct after spawn
                let startX = WAYPOINTS[0].x - 40; let startY = WAYPOINTS[0].y;
                let targetIdx = 0;
                
                this.enemies.push({
                    def: eDef, wpIdx: targetIdx,
                    x: startX, y: startY,
                    maxHp: maxHp, hp: maxHp, slowTimer: 0,
                    spawnTimer: 0, poisonTimer: 0, poisonDps: 0
                });
                this.spawnTimer = this.spawnInterval;
            }
        } else if (this.enemies.length === 0) {
            this.gold += 100 + this.wave * 15;
            this.waveBreakTimer = 5000;
            this.updateHUD();
        }
        
        // Enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            let e = this.enemies[i];
            if (e.slowTimer > 0) e.slowTimer -= dt;
            if (e.poisonTimer > 0) {
                e.poisonTimer -= dt;
                e.hp -= e.poisonDps * (dt / 1000);
                if (Math.random() < 0.1) this.spawnParticles(e.x, e.y, '#2ecc71', 1, 0.5); // Poison drips
            }
            
            // Boss mechanics (Spawn small goblins)
            if (e.def.boss) {
                e.spawnTimer += dt;
                if (e.spawnTimer > 3000) {
                    e.spawnTimer = 0;
                    this.enemies.push({
                        def: ENEMY_DEFS['GOBLIN'], wpIdx: e.wpIdx,
                        x: e.x + (Math.random()-0.5)*40, y: e.y + (Math.random()-0.5)*40,
                        maxHp: 150, hp: 150, slowTimer: 0, spawnTimer: 0, poisonTimer: 0, poisonDps: 0
                    });
                    this.spawnParticles(e.x, e.y, '#2ecc71', 10);
                }
            }
            
            let spd = e.def.speed * (e.slowTimer > 0 ? 0.5 : 1.0);
            let moveDist = spd * (dt/16);
            
            let target;
            if (e.def.flying) {
                target = WAYPOINTS[WAYPOINTS.length - 1]; // Fly straight to end!
            } else {
                target = WAYPOINTS[e.wpIdx];
            }
            
            let dx = target.x - e.x; let dy = target.y - e.y;
            let dist = Math.hypot(dx, dy);
            
            if (dist <= moveDist) {
                e.x = target.x; e.y = target.y;
                if (e.def.flying || e.wpIdx >= WAYPOINTS.length - 1) {
                    this.hp -= e.def.boss ? 5 : 1;
                    Audio.playExplosion();
                    this.enemies.splice(i, 1);
                    this.updateHUD();
                    
                    if (this.hp <= 0) {
                        this.state = 'gameover';
                        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
                        document.getElementById('gameover-panel').classList.add('active');
                        document.getElementById('build-menu').style.display = 'none';
                        document.getElementById('end-desc').innerText = `抵挡到了第 ${this.wave} 波`;
                        Audio.playGameOver();
                    }
                    continue;
                } else {
                    e.wpIdx++;
                }
            } else {
                e.x += (dx / dist) * moveDist; e.y += (dy / dist) * moveDist;
            }
        }
        
        // Towers
        this.towers.forEach(t => {
            if (t.cdTimer > 0) t.cdTimer -= dt;
            if (t.recoil > 0) t.recoil -= dt/5;
            
            let baseDef = TOWER_DEFS[t.type];
            let def = baseDef.levels[t.lvl];
            let target = null;
            let minDist = def.range;
            
            // Smart Targeting Priority
            // 1. If an enemy is within danger zone (close to end), target it unconditionally.
            // 2. Else, if a prop is manually selected and in range, target it.
            // 3. Else, target enemy furthest along path.
            
            let bestScore = -1;
            let dangerEnemy = null;
            
            this.enemies.forEach(e => {
                let d = Math.hypot(e.x - t.x, e.y - t.y);
                if (d <= def.range) {
                    let distToEnd = e.def.flying ? d : WAYPOINTS.length - e.wpIdx; 
                    if (distToEnd < 3) dangerEnemy = e; // Very close to base
                    
                    let score = e.def.flying ? 9000 - d : e.wpIdx * 1000 - Math.hypot(WAYPOINTS[e.wpIdx].x - e.x, WAYPOINTS[e.wpIdx].y - e.y);
                    if (score > bestScore) { bestScore = score; target = e; }
                }
            });
            
            if (dangerEnemy) target = dangerEnemy;
            
            if (this.selectedEntity && !this.selectedEntity.isTower && !dangerEnemy) {
                let p = this.selectedEntity;
                if (Math.hypot(p.x - t.x, p.y - t.y) <= def.range) {
                    target = p;
                }
            }
            
            if (target) {
                // Smooth rotation
                let targetAngle = Math.atan2(target.y - t.y, target.x - t.x);
                let diff = targetAngle - t.angle;
                while (diff < -Math.PI) diff += Math.PI*2;
                while (diff > Math.PI) diff -= Math.PI*2;
                t.angle += diff * 0.2;
                
                if (t.cdTimer <= 0) {
                    t.cdTimer = def.cd;
                    t.recoil = 10;
                    this.projectiles.push({
                        x: t.x + Math.cos(t.angle)*20, y: t.y + Math.sin(t.angle)*20,
                        target: target,
                        def: def, baseDef: baseDef,
                        speed: 12
                    });
                    if (t.type === 'ARTILLERY') Audio.playExplosion();
                    else if (t.type === 'MAGE') Audio.playGoodItem();
                    else Audio.playShoot();
                    
                    // Muzzle flash
                    this.spawnParticles(t.x + Math.cos(t.angle)*25, t.y + Math.sin(t.angle)*25, baseDef.color, 5, 0.5);
                }
            }
        });
        
        // Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            let p = this.projectiles[i];
            
            // If tracking enemy died, seek last known position
            let tx = p.target.x || p.target.lastX;
            let ty = p.target.y || p.target.lastY;
            if (p.target.hp <= 0 && p.target.def) {
                p.target.lastX = tx; p.target.lastY = ty;
            }
            
            let dx = tx - p.x; let dy = ty - p.y;
            let dist = Math.hypot(dx, dy);
            
            if (dist < 20 || (p.target.hp <= 0 && dist < 30)) {
                // HIT!
                let isSplash = p.def.type === 'splash';
                
                if (isSplash || p.def.type === 'poison') {
                    let splashColor = p.def.type === 'poison' ? '#2ecc71' : '#e74c3c';
                    this.spawnParticles(tx, ty, splashColor, 30, 2);
                    Audio.playExplosion();
                    
                    this.enemies.forEach(e => {
                        if (e.def.flying) return; // Flying immune to splash
                        if (Math.hypot(e.x - tx, e.y - ty) <= p.def.splash) {
                            let actualDmg = this.calculateDamage(p.def.dmg, p.baseDef.dmgType, e.def.armor, e.def.mr);
                            e.hp -= actualDmg;
                            if (p.def.slowDur) e.slowTimer = p.def.slowDur;
                            if (p.def.type === 'poison') {
                                e.poisonTimer = p.def.poisonDur;
                                // Magic resist reduces poison DoT as well
                                let red = e.def.mr / (e.def.mr + 100);
                                e.poisonDps = p.def.poisonDmg * (1 - red);
                            }
                        }
                    });
                    this.props.forEach(prop => {
                        if (Math.hypot(prop.x - tx, prop.y - ty) <= p.def.splash) prop.hp -= p.def.dmg;
                    });
                } else {
                    if (p.target.def) {
                        let actualDmg = this.calculateDamage(p.def.dmg, p.baseDef.dmgType, p.target.def.armor, p.target.def.mr);
                        p.target.hp -= actualDmg;
                        this.spawnParticles(tx, ty, '#c0392b', 10); // Blood
                        Audio.playHit();
                    } else if (p.target.type === 'tree' || p.target.type === 'rock') {
                        p.target.hp -= p.def.dmg;
                        this.spawnParticles(tx, ty, p.target.color, 10);
                        Audio.playHit();
                    }
                }
                this.projectiles.splice(i, 1);
            } else {
                p.x += (dx / dist) * p.speed * (dt/16); p.y += (dy / dist) * p.speed * (dt/16);
            }
        }
        
        // Kill Enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            if (this.enemies[i].hp <= 0) {
                let e = this.enemies[i];
                this.gold += e.def.reward;
                this.spawnParticles(e.x, e.y, '#c0392b', 40, 2); // Bloody explosion
                this.enemies.splice(i, 1);
                this.updateHUD();
            }
        }
        
        // Kill Props
        for (let i = this.props.length - 1; i >= 0; i--) {
            if (this.props[i].hp <= 0) {
                let prop = this.props[i];
                this.gold += prop.reward;
                MAP_GRID[prop.r][prop.c] = 0; 
                this.spawnParticles(prop.x, prop.y, '#d4af37', 50, 3);
                Audio.playGoodItem();
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
        // Fill entire window with grass
        this.ctx.fillStyle = '#355E24'; 
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.save();
        this.ctx.translate(this.offsetX, this.offsetY);
        
        // Draw playable area background (darker dirt/grass base)
        this.ctx.fillStyle = '#2b3a1a';
        this.ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
        
        // Dirt path
        for (let r = 0; r < CONFIG.ROWS; r++) {
            for (let c = 0; c < CONFIG.COLS; c++) {
                let v = MAP_GRID[r][c];
                let px = c * 80; let py = r * 80;
                
                if (v === 1 || v === 2 || v === 3) {
                    this.ctx.fillStyle = '#4a3b2c';
                    this.ctx.fillRect(px, py, 80, 80);
                    // Dirt texture
                    this.ctx.fillStyle = 'rgba(0,0,0,0.2)';
                    this.ctx.fillRect(px+10, py+20, 15, 10);
                    this.ctx.fillRect(px+50, py+50, 20, 15);
                }
                
                if (v === 2) {
                    // Epic Monster Cave
                    this.ctx.fillStyle = '#4a4a4a'; // Outer rock
                    this.ctx.beginPath(); this.ctx.arc(px+40, py+40, 38, 0, Math.PI*2); this.ctx.fill();
                    this.ctx.fillStyle = '#2c2c2c'; // Inner rock
                    this.ctx.beginPath(); this.ctx.arc(px+40, py+45, 30, 0, Math.PI*2); this.ctx.fill();
                    this.ctx.fillStyle = '#000'; // Pure dark entrance
                    this.ctx.beginPath(); this.ctx.arc(px+40, py+50, 22, 0, Math.PI*2); this.ctx.fill();
                    
                    // Creepy glowing eyes inside the cave
                    this.ctx.fillStyle = '#e74c3c';
                    this.ctx.beginPath(); this.ctx.arc(px+32, py+52, 3, 0, Math.PI*2); this.ctx.fill();
                    this.ctx.beginPath(); this.ctx.arc(px+48, py+52, 3, 0, Math.PI*2); this.ctx.fill();
                    
                    // Rock debris around
                    this.ctx.fillStyle = '#555';
                    this.ctx.fillRect(px+10, py+60, 15, 10);
                    this.ctx.fillRect(px+60, py+55, 12, 12);
                }
                if (v === 3) {
                    // Epic Castle Base
                    this.ctx.fillStyle = '#95a5a6'; // Light stone
                    this.ctx.fillRect(px + 15, py + 30, 50, 45);
                    this.ctx.fillStyle = '#7f8c8d'; // Darker stone (shadow/side)
                    this.ctx.fillRect(px + 40, py + 30, 25, 45);
                    
                    // Side Towers
                    this.ctx.fillStyle = '#7f8c8d';
                    this.ctx.fillRect(px + 5, py + 15, 20, 60);
                    this.ctx.fillRect(px + 55, py + 15, 20, 60);
                    this.ctx.fillStyle = '#95a5a6';
                    this.ctx.fillRect(px + 5, py + 15, 10, 60);
                    this.ctx.fillRect(px + 55, py + 15, 10, 60);
                    
                    // Battlements (teeth) on side towers
                    this.ctx.fillStyle = '#bdc3c7';
                    for(let i=0; i<3; i++) {
                        this.ctx.fillRect(px + 5 + i*8, py + 10, 5, 5);
                        this.ctx.fillRect(px + 55 + i*8, py + 10, 5, 5);
                    }
                    
                    // Battlements on main body
                    for(let i=0; i<5; i++) {
                        this.ctx.fillRect(px + 18 + i*10, py + 25, 6, 5);
                    }
                    
                    // Gate/Arch
                    this.ctx.fillStyle = '#2c3e50'; // Dark inside
                    this.ctx.beginPath(); this.ctx.arc(px + 40, py + 60, 14, Math.PI, 0); this.ctx.fill();
                    this.ctx.fillRect(px + 26, py + 60, 28, 20);
                    
                    // Portcullis (Iron bars)
                    this.ctx.strokeStyle = '#111';
                    this.ctx.lineWidth = 2;
                    for(let i=0; i<4; i++) {
                        this.ctx.beginPath(); this.ctx.moveTo(px + 30 + i*6.5, py + 50); this.ctx.lineTo(px + 30 + i*6.5, py + 80); this.ctx.stroke();
                    }
                    this.ctx.beginPath(); this.ctx.moveTo(px + 26, py + 58); this.ctx.lineTo(px + 54, py + 58); this.ctx.stroke();
                    this.ctx.beginPath(); this.ctx.moveTo(px + 26, py + 68); this.ctx.lineTo(px + 54, py + 68); this.ctx.stroke();
                    
                    // Windows on side towers
                    this.ctx.fillStyle = '#2c3e50';
                    this.ctx.fillRect(px + 12, py + 30, 4, 12);
                    this.ctx.fillRect(px + 64, py + 30, 4, 12);
                    
                    // Flags on towers
                    this.ctx.strokeStyle = '#7f8c8d'; this.ctx.lineWidth = 2;
                    this.ctx.beginPath(); this.ctx.moveTo(px + 15, py + 10); this.ctx.lineTo(px + 15, py - 12); this.ctx.stroke();
                    this.ctx.beginPath(); this.ctx.moveTo(px + 65, py + 10); this.ctx.lineTo(px + 65, py - 12); this.ctx.stroke();
                    this.ctx.fillStyle = '#e74c3c'; // Red flag
                    this.ctx.beginPath(); this.ctx.moveTo(px + 15, py - 12); this.ctx.lineTo(px + 32, py - 6); this.ctx.lineTo(px + 15, py); this.ctx.fill();
                    this.ctx.beginPath(); this.ctx.moveTo(px + 65, py - 12); this.ctx.lineTo(px + 82, py - 6); this.ctx.lineTo(px + 65, py); this.ctx.fill();
                }
            }
        }
        
        // Grid lines
        this.ctx.strokeStyle = 'rgba(0,0,0,0.3)'; this.ctx.lineWidth = 1;
        for(let r=0; r<=CONFIG.ROWS; r++) { this.ctx.beginPath(); this.ctx.moveTo(0, r*80); this.ctx.lineTo(960, r*80); this.ctx.stroke(); }
        for(let c=0; c<=CONFIG.COLS; c++) { this.ctx.beginPath(); this.ctx.moveTo(c*80, 0); this.ctx.lineTo(c*80, 640); this.ctx.stroke(); }
        
        // Draw Props
        this.props.forEach(p => {
            if (p.type === 'tree') {
                this.ctx.fillStyle = '#5d4037'; this.ctx.fillRect(p.x-10, p.y-10, 20, 30); // Trunk
                this.ctx.fillStyle = '#228B22'; this.ctx.beginPath(); this.ctx.arc(p.x, p.y-20, 25, 0, Math.PI*2); this.ctx.fill(); // Leaves
                this.ctx.fillStyle = '#1E6B1E'; this.ctx.beginPath(); this.ctx.arc(p.x-10, p.y-10, 20, 0, Math.PI*2); this.ctx.fill(); 
            } else {
                this.ctx.fillStyle = '#7f8c8d'; this.ctx.beginPath(); this.ctx.arc(p.x, p.y+10, 30, 0, Math.PI*2); this.ctx.fill(); // Rock base
                this.ctx.fillStyle = '#95a5a6'; this.ctx.beginPath(); this.ctx.arc(p.x-5, p.y-5, 20, 0, Math.PI*2); this.ctx.fill(); // Rock top
            }
            
            if (p.hp < p.maxHp) {
                let hpPct = p.hp / p.maxHp;
                this.ctx.fillStyle = '#000'; this.ctx.fillRect(p.x - 20, p.y - 45, 40, 6);
                this.ctx.fillStyle = '#f1c40f'; this.ctx.fillRect(p.x - 19, p.y - 44, 38 * hpPct, 4);
            }
            
            if (this.selectedEntity === p) {
                this.ctx.strokeStyle = '#e74c3c'; this.ctx.lineWidth = 3;
                this.ctx.beginPath(); this.ctx.arc(p.x, p.y, 40, 0, Math.PI*2); this.ctx.stroke();
                this.ctx.fillStyle = '#e74c3c'; this.ctx.font="20px Arial"; this.ctx.fillText('🎯', p.x-10, p.y-45);
            }
        });
        
        // Draw Towers
        this.towers.forEach(t => {
            let baseDef = TOWER_DEFS[t.type];
            
            // Base shadow
            this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
            this.ctx.beginPath(); this.ctx.ellipse(t.x, t.y+25, 30, 15, 0, 0, Math.PI*2); this.ctx.fill();
            
            // Tower Base
            this.ctx.fillStyle = baseDef.baseColor;
            this.ctx.fillRect(t.x - 25, t.y - 10 - t.lvl*5, 50, 35 + t.lvl*5);
            this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
            this.ctx.fillRect(t.x - 25, t.y + 20, 50, 5); // bottom shading
            
            // Level indicator
            this.ctx.fillStyle = '#f1c40f';
            for(let i=0; i<=t.lvl; i++) {
                this.ctx.beginPath(); this.ctx.arc(t.x - 10 + i*10, t.y + 15, 3, 0, Math.PI*2); this.ctx.fill();
            }
            
            // Rotating Turret Head
            this.ctx.save();
            this.ctx.translate(t.x, t.y - 15 - t.lvl*5);
            this.ctx.rotate(t.angle);
            
            // Recoil
            if (t.recoil > 0) this.ctx.translate(-t.recoil, 0);
            
            if (t.type === 'ARCHER') {
                this.ctx.fillStyle = baseDef.barrelColor;
                this.ctx.fillRect(-10, -10, 20, 20); // Center
                this.ctx.fillStyle = '#e67e22'; // bow arms
                this.ctx.fillRect(0, -20, 5, 40);
                this.ctx.fillStyle = '#bdc3c7'; // arrow
                this.ctx.fillRect(0, -2, 25, 4);
            } else if (t.type === 'MAGE') {
                this.ctx.fillStyle = baseDef.barrelColor;
                this.ctx.beginPath(); this.ctx.arc(0, 0, 15, 0, Math.PI*2); this.ctx.fill(); // Orb
                this.ctx.fillStyle = '#fff';
                this.ctx.beginPath(); this.ctx.arc(0, 0, 8, 0, Math.PI*2); this.ctx.fill(); // Inner glow
            } else if (t.type === 'ARTILLERY') {
                this.ctx.fillStyle = '#2c3e50';
                this.ctx.beginPath(); this.ctx.arc(0, 0, 18, 0, Math.PI*2); this.ctx.fill(); // Dome
                this.ctx.fillStyle = baseDef.barrelColor;
                this.ctx.fillRect(0, -8, 30, 16); // Cannon barrel
                this.ctx.fillStyle = '#000';
                this.ctx.fillRect(25, -6, 5, 12); // Hole
            } else if (t.type === 'ICE') {
                this.ctx.fillStyle = baseDef.barrelColor;
                this.ctx.beginPath(); this.ctx.moveTo(15, 0); this.ctx.lineTo(-10, 15); this.ctx.lineTo(-10, -15); this.ctx.fill(); // Ice shard
                this.ctx.fillStyle = '#fff';
                this.ctx.beginPath(); this.ctx.moveTo(10, 0); this.ctx.lineTo(-5, 8); this.ctx.lineTo(-5, -8); this.ctx.fill(); // Inner shard
            } else if (t.type === 'SNIPER') {
                this.ctx.fillStyle = '#e67e22'; // Big wood arms
                this.ctx.fillRect(0, -30, 8, 60);
                this.ctx.fillStyle = '#2c3e50'; // Metal track
                this.ctx.fillRect(-15, -4, 35, 8);
                this.ctx.fillStyle = '#bdc3c7'; // Huge bolt
                this.ctx.fillRect(-10, -2, 40, 4);
                this.ctx.fillStyle = '#c0392b'; // Bolt tip
                this.ctx.beginPath(); this.ctx.moveTo(30, -4); this.ctx.lineTo(40, 0); this.ctx.lineTo(30, 4); this.ctx.fill();
            } else if (t.type === 'POISON') {
                this.ctx.fillStyle = baseDef.barrelColor;
                this.ctx.beginPath(); this.ctx.arc(0, 0, 16, 0, Math.PI*2); this.ctx.fill(); // Bulb
                this.ctx.fillStyle = '#1e824c';
                this.ctx.beginPath(); this.ctx.arc(0, 0, 8, 0, Math.PI*2); this.ctx.fill(); // Inner core
                this.ctx.fillStyle = '#27ae60';
                this.ctx.fillRect(5, -4, 15, 8); // Spout
            }
            
            this.ctx.restore();
            
            // Range highlight
            if (this.selectedEntity === t) {
                // Current Range (Solid White)
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath(); this.ctx.arc(t.x, t.y, baseDef.levels[t.lvl].range, 0, Math.PI*2); this.ctx.stroke();
                
                // Next Level Range (Dashed Green) if not max level
                if (t.lvl < baseDef.levels.length - 1) {
                    this.ctx.save();
                    this.ctx.strokeStyle = 'rgba(46, 204, 113, 0.6)'; // Emerald green
                    this.ctx.lineWidth = 2;
                    this.ctx.setLineDash([5, 5]);
                    this.ctx.beginPath(); this.ctx.arc(t.x, t.y, baseDef.levels[t.lvl + 1].range, 0, Math.PI*2); this.ctx.stroke();
                    this.ctx.restore();
                }
            }
        });
        
        // Draw Enemies
        this.enemies.forEach(e => {
            // Shadow
            this.ctx.fillStyle = 'rgba(0,0,0,0.4)';
            this.ctx.beginPath(); this.ctx.ellipse(e.x, e.y + e.def.size, e.def.size, e.def.size/2, 0, 0, Math.PI*2); this.ctx.fill();
            
            this.ctx.fillStyle = e.slowTimer > 0 ? '#3498db' : e.def.color;
            
            // Shape based on enemy type
            if (e.def.boss) {
                this.ctx.fillRect(e.x-e.def.size, e.y-e.def.size*1.5, e.def.size*2, e.def.size*2);
                this.ctx.fillStyle = '#000'; this.ctx.fillRect(e.x-10, e.y-e.def.size, 8, 8); this.ctx.fillRect(e.x+2, e.y-e.def.size, 8, 8);
            } else if (e.def.flying) {
                // Wings
                this.ctx.fillStyle = '#555';
                this.ctx.beginPath(); this.ctx.moveTo(e.x, e.y); this.ctx.lineTo(e.x-25, e.y-20); this.ctx.lineTo(e.x-10, e.y+10); this.ctx.fill();
                this.ctx.beginPath(); this.ctx.moveTo(e.x, e.y); this.ctx.lineTo(e.x+25, e.y-20); this.ctx.lineTo(e.x+10, e.y+10); this.ctx.fill();
                this.ctx.fillStyle = e.slowTimer > 0 ? '#3498db' : e.def.color;
                this.ctx.beginPath(); this.ctx.arc(e.x, e.y, e.def.size, 0, Math.PI*2); this.ctx.fill();
            } else {
                this.ctx.beginPath(); this.ctx.arc(e.x, e.y, e.def.size, 0, Math.PI*2); this.ctx.fill();
                // Armor visual indicator
                if (e.def.armor > 0) {
                    this.ctx.strokeStyle = '#bdc3c7'; this.ctx.lineWidth = 3;
                    this.ctx.beginPath(); this.ctx.arc(e.x, e.y, e.def.size, 0, Math.PI*2); this.ctx.stroke();
                }
            }
            
            // HP Bar
            let hpPct = e.hp / e.maxHp;
            let barW = e.def.boss ? 40 : 24;
            this.ctx.fillStyle = '#000'; this.ctx.fillRect(e.x - barW/2, e.y - e.def.size - 12, barW, 6);
            this.ctx.fillStyle = hpPct > 0.5 ? '#2ecc71' : (hpPct > 0.2 ? '#f1c40f' : '#e74c3c');
            this.ctx.fillRect(e.x - barW/2+1, e.y - e.def.size - 11, (barW-2) * hpPct, 4);
        });
        
        // Draw Projectiles
        this.projectiles.forEach(p => {
            this.ctx.save();
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate(Math.atan2(p.target.y - p.y, p.target.x - p.x));
            
            if (p.def.type === 'splash') {
                this.ctx.fillStyle = '#c0392b';
                this.ctx.beginPath(); this.ctx.arc(0, 0, 8, 0, Math.PI*2); this.ctx.fill();
            } else if (p.def.type === 'poison') {
                this.ctx.fillStyle = '#2ecc71';
                this.ctx.beginPath(); this.ctx.arc(0, 0, 6, 0, Math.PI*2); this.ctx.fill();
            } else if (p.baseDef.dmgType === 'magic') {
                this.ctx.fillStyle = p.baseDef.color;
                this.ctx.beginPath(); this.ctx.arc(0, 0, 6, 0, Math.PI*2); this.ctx.fill();
                this.ctx.fillStyle = '#fff';
                this.ctx.beginPath(); this.ctx.arc(0, 0, 3, 0, Math.PI*2); this.ctx.fill();
            } else {
                this.ctx.fillStyle = '#bdc3c7'; // Arrow
                this.ctx.fillRect(-10, -2, 20, 4);
            }
            this.ctx.restore();
        });
        
        // Particles
        this.particles.forEach(pt => {
            this.ctx.globalAlpha = pt.life;
            this.ctx.fillStyle = pt.color;
            this.ctx.fillRect(pt.x, pt.y, 5, 5);
        });
        this.ctx.globalAlpha = 1.0;
        this.ctx.restore();
    }
}

window.addEventListener('load', () => new Game());
