import os

base_dir = "/Users/clawbox/game-portal/kingdom-rush/js"

config_js = """
const CONFIG = {
    CANVAS_WIDTH: 1024,
    CANVAS_HEIGHT: 1000,
    FPS: 60,
    
    STARTING_GOLD: 0,
    
    HERO: {
        y: 850,
        baseDamage: 20,
        fireRate: 500, // ms
        projectileSpeed: 10,
        size: 20
    },

    UPGRADES: [
        { name: '全军攻击力提升', cost: 50, damageInc: 10, costMult: 1.5 },
        { name: '全军射速提升', cost: 100, fireRateMult: 0.9, costMult: 1.6 },
        { name: '全军多重箭', cost: 300, arrows: 1, costMult: 2.0 }
    ],
    
    ENEMY_TYPES: {
        GOBLIN: { id: 'goblin', name: '哥布林', hp: 30, speed: 1.5, reward: 5, color: '#228B22', size: 15 },
        ORC: { id: 'orc', name: '兽人', hp: 80, speed: 1.0, reward: 15, color: '#556B2F', size: 20 },
        TROLL: { id: 'troll', name: '巨魔', hp: 200, speed: 0.6, reward: 30, color: '#8B0000', size: 25 }
    },

    CASTLE_Y: 900,

    ITEMS: {
        BOMB: { id: 'bomb', color: '#000000', size: 15, text: '💣' },
        FREEZE: { id: 'freeze', color: '#00FFFF', size: 15, text: '❄️' },
        HEAL: { id: 'heal', color: '#00FF00', size: 15, text: '❤️' }
    }
};
"""

main_js = """
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.renderer = new Renderer(this.canvas);
        this.ui = new UI(this.renderer, this);
        
        this.state = 'menu';
        
        // Settings
        this.numPlayers = 2; // Default 2
        this.numLanes = 3;   // Default 3
        
        this.gold = CONFIG.STARTING_GOLD;
        this.heroStats = {
            damage: CONFIG.HERO.baseDamage,
            fireRate: CONFIG.HERO.fireRate,
            arrows: 1,
            upgradeLevels: [0, 0, 0]
        };

        this.heroes = [];
        this.lanes = [];
        this.projectiles = [];
        this.enemies = [];
        this.items = [];
        this.keys = {};
        
        this.lastTime = 0;
        this.enemySpawnTimer = 0;
        
        this.paused = false;
        this.gameOver = false;
        
        this.initEventListeners();
        Audio.init();
        
        this.showMainMenu();
        this.gameLoop(0);
    }
    
    initEventListeners() {
        window.addEventListener('keydown', (e) => {
            if (this.state === 'playing' && !this.keys[e.key]) {
                this.handleHeroMovement(e.key);
            }
            this.keys[e.key] = true;
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });

        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const pos = {
                x: (e.clientX - rect.left) * scaleX,
                y: (e.clientY - rect.top) * scaleY
            };
            this.handleClick(pos);
        });
    }

    handleHeroMovement(key) {
        this.heroes.forEach(hero => {
            if (key === hero.controls[0] || key === hero.controls[1]) {
                // Left
                if (hero.laneIndex > 0) {
                    hero.laneIndex--;
                }
            } else if (key === hero.controls[2] || key === hero.controls[3]) {
                // Right
                if (hero.laneIndex < this.numLanes - 1) {
                    hero.laneIndex++;
                }
            }
            hero.x = this.lanes[hero.laneIndex];
        });
    }
    
    handleClick(pos) {
        if (this.state === 'menu') {
            // Check Players Buttons
            if (pos.y >= 380 && pos.y <= 420) {
                if (pos.x >= 400 && pos.x <= 440) {
                    this.numPlayers = Math.max(1, this.numPlayers - 1);
                } else if (pos.x >= 580 && pos.x <= 620) {
                    this.numPlayers = Math.min(3, this.numPlayers + 1);
                }
            }
            // Check Lanes Buttons
            if (pos.y >= 450 && pos.y <= 490) {
                if (pos.x >= 400 && pos.x <= 440) {
                    this.numLanes = Math.max(1, this.numLanes - 1);
                } else if (pos.x >= 580 && pos.x <= 620) {
                    this.numLanes = Math.min(5, this.numLanes + 1);
                }
            }
            
            // Start Button
            if (pos.x >= 412 && pos.x <= 612 && pos.y >= 540 && pos.y <= 590) {
                this.startGame();
            }
            
        } else if (this.state === 'gameover') {
            this.showMainMenu();
        } else if (this.state === 'playing') {
            for (let i = 0; i < CONFIG.UPGRADES.length; i++) {
                const upg = CONFIG.UPGRADES[i];
                const cost = Math.floor(upg.cost * Math.pow(upg.costMult, this.heroStats.upgradeLevels[i]));
                const btnX = 800;
                const btnY = 50 + i * 60;
                if (pos.x >= btnX && pos.x <= btnX + 180 && pos.y >= btnY && pos.y <= btnY + 40) {
                    if (this.gold >= cost) {
                        this.gold -= cost;
                        this.heroStats.upgradeLevels[i]++;
                        if (i === 0) this.heroStats.damage += upg.damageInc;
                        if (i === 1) this.heroStats.fireRate *= upg.fireRateMult;
                        if (i === 2) this.heroStats.arrows += upg.arrows;
                    }
                }
            }
        }
    }
    
    showMainMenu() {
        this.state = 'menu';
    }
    
    startGame() {
        this.gold = CONFIG.STARTING_GOLD;
        this.heroStats = {
            damage: CONFIG.HERO.baseDamage,
            fireRate: CONFIG.HERO.fireRate,
            arrows: 1,
            upgradeLevels: [0, 0, 0]
        };
        
        // Init Lanes
        this.lanes = [];
        for (let i = 1; i <= this.numLanes; i++) {
            this.lanes.push((CONFIG.CANVAS_WIDTH / (this.numLanes + 1)) * i);
        }

        // Init Heroes
        this.heroes = [];
        const heroConfigs = [
            { color: '#FFD700', name: 'P1(A/D)', keys: ['a', 'A', 'd', 'D'] },
            { color: '#00FFFF', name: 'P2(左右)', keys: ['ArrowLeft', 'ArrowLeft', 'ArrowRight', 'ArrowRight'] },
            { color: '#FF00FF', name: 'P3(J/L)', keys: ['j', 'J', 'l', 'L'] }
        ];

        for (let i = 0; i < this.numPlayers; i++) {
            const config = heroConfigs[i];
            const laneIdx = Math.min(i, this.numLanes - 1);
            this.heroes.push({
                laneIndex: laneIdx,
                x: this.lanes[laneIdx],
                y: CONFIG.HERO.y,
                color: config.color,
                name: config.name,
                controls: config.keys,
                lastShotTime: 0
            });
        }

        this.projectiles = [];
        this.enemies = [];
        this.items = [];
        this.enemySpawnTimer = 0;
        this.gameOver = false;
        this.state = 'playing';
    }
    
    gameLoop(timestamp) {
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;
        
        this.update(timestamp, deltaTime);
        this.render();
        
        requestAnimationFrame((t) => this.gameLoop(t));
    }
    
    spawnEnemy() {
        const types = Object.values(CONFIG.ENEMY_TYPES);
        const type = types[Math.floor(Math.random() * types.length)];
        const lane = this.lanes[Math.floor(Math.random() * this.lanes.length)];
        
        this.enemies.push({
            type: type,
            x: lane,
            y: -50,
            hp: type.hp,
            maxHp: type.hp,
            frozenTimer: 0
        });
    }

    shoot(hero) {
        const numArrows = this.heroStats.arrows;
        const spread = 20;
        const startX = hero.x;
        const startY = hero.y;

        for (let i = 0; i < numArrows; i++) {
            let targetX = startX;
            if (numArrows > 1) {
                targetX = startX - (spread * (numArrows - 1)) / 2 + i * spread;
            }
            
            const angle = Math.atan2(-startY, targetX - startX);
            const vx = Math.cos(angle) * CONFIG.HERO.projectileSpeed;
            const vy = Math.sin(angle) * CONFIG.HERO.projectileSpeed;
            
            let vx_straight = 0;
            if (numArrows > 1) {
                vx_straight = ((i / (numArrows - 1)) - 0.5) * 4;
            }

            this.projectiles.push({
                x: startX,
                y: startY,
                vx: vx_straight,
                vy: -CONFIG.HERO.projectileSpeed,
                damage: this.heroStats.damage,
                color: hero.color,
                alive: true
            });
        }
        Audio.playShoot();
    }
    
    update(currentTime, deltaTime) {
        if (this.state !== 'playing' || this.paused) return;
        
        // Update Heroes Shooting
        this.heroes.forEach(hero => {
            if (currentTime - hero.lastShotTime > this.heroStats.fireRate) {
                this.shoot(hero);
                hero.lastShotTime = currentTime;
            }
        });

        // Spawning
        this.enemySpawnTimer += deltaTime;
        // spawn faster based on number of lanes
        const spawnInterval = Math.max(300, 1500 - (this.numLanes * 200)); 
        if (this.enemySpawnTimer > spawnInterval) { 
            this.spawnEnemy();
            this.enemySpawnTimer = 0;
        }

        // Update Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.x += p.vx;
            p.y += p.vy;
            if (p.y < -50 || p.x < 0 || p.x > CONFIG.CANVAS_WIDTH) {
                this.projectiles.splice(i, 1);
            }
        }

        // Update Enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            if (e.frozenTimer > 0) {
                e.frozenTimer -= deltaTime;
            } else {
                e.y += e.type.speed;
            }
            
            if (e.y + e.type.size >= CONFIG.CASTLE_Y) {
                this.gameOver = true;
                this.state = 'gameover';
                Audio.playGameOver();
                return;
            }

            let hit = false;
            for (let j = this.projectiles.length - 1; j >= 0; j--) {
                const p = this.projectiles[j];
                const dist = Math.hypot(e.x - p.x, e.y - p.y);
                if (dist < e.type.size + 5) {
                    e.hp -= p.damage;
                    this.projectiles.splice(j, 1);
                    hit = true;
                }
            }

            if (e.hp <= 0) {
                this.gold += e.type.reward;
                if (Math.random() < 0.1) {
                    const itemTypes = Object.values(CONFIG.ITEMS);
                    const item = itemTypes[Math.floor(Math.random() * itemTypes.length)];
                    this.items.push({
                        type: item,
                        x: e.x,
                        y: e.y,
                        vy: 2
                    });
                }
                this.enemies.splice(i, 1);
            }
        }

        // Update Items
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            item.y += item.vy;
            
            for (let j = this.projectiles.length - 1; j >= 0; j--) {
                const p = this.projectiles[j];
                const dist = Math.hypot(item.x - p.x, item.y - p.y);
                if (dist < item.type.size + 10) {
                    this.applyItem(item.type);
                    this.projectiles.splice(j, 1);
                    this.items.splice(i, 1);
                    break;
                }
            }
            
            if (item && item.y > CONFIG.CANVAS_HEIGHT) {
                this.items.splice(i, 1);
            }
        }
    }
    
    applyItem(itemType) {
        if (itemType.id === 'bomb') {
            this.enemies.forEach(e => e.hp -= 100);
        } else if (itemType.id === 'freeze') {
            this.enemies.forEach(e => e.frozenTimer = 3000);
        } else if (itemType.id === 'heal') {
            this.gold += 50; 
        }
    }

    drawButton(ctx, x, y, w, h, text, color) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = 'white';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x + w/2, y + h/2);
    }

    render() {
        const ctx = this.renderer.ctx;
        ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        ctx.textBaseline = 'alphabetic'; // default
        
        if (this.state === 'menu') {
            ctx.fillStyle = '#333';
            ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
            
            ctx.fillStyle = 'white';
            ctx.font = '50px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('王国保卫战 (射击版)', CONFIG.CANVAS_WIDTH/2, 200);
            
            ctx.font = '20px Arial';
            ctx.fillText('操作指南：P1 (A/D) | P2 (左右方向键) | P3 (J/L)', CONFIG.CANVAS_WIDTH/2, 280);
            
            // Player Selection
            ctx.font = '24px Arial';
            ctx.fillText('玩家数量: ' + this.numPlayers, 512, 410);
            this.drawButton(ctx, 400, 380, 40, 40, '-', '#555');
            this.drawButton(ctx, 580, 380, 40, 40, '+', '#555');
            ctx.textBaseline = 'alphabetic';

            // Lanes Selection
            ctx.font = '24px Arial';
            ctx.fillText('敌人路线: ' + this.numLanes, 512, 480);
            this.drawButton(ctx, 400, 450, 40, 40, '-', '#555');
            this.drawButton(ctx, 580, 450, 40, 40, '+', '#555');
            ctx.textBaseline = 'alphabetic';

            // Start
            this.drawButton(ctx, 412, 540, 200, 50, '开始游戏', '#4CAF50');
            ctx.textBaseline = 'alphabetic';
            
            return;
        }

        if (this.state === 'gameover') {
            ctx.fillStyle = '#333';
            ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
            ctx.fillStyle = 'red';
            ctx.font = '50px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('游戏结束', CONFIG.CANVAS_WIDTH/2, 300);
            ctx.fillStyle = 'white';
            ctx.font = '20px Arial';
            ctx.fillText('城堡被攻破了！点击返回主菜单', CONFIG.CANVAS_WIDTH/2, 400);
            return;
        }

        // Draw Background
        ctx.fillStyle = '#2d4c1e'; 
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        
        // Draw Lanes
        ctx.fillStyle = '#4a3b2c'; 
        this.lanes.forEach(lane => {
            ctx.fillRect(lane - 40, 0, 80, CONFIG.CASTLE_Y);
        });

        // Draw Castle
        ctx.fillStyle = '#555';
        ctx.fillRect(0, CONFIG.CASTLE_Y, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT - CONFIG.CASTLE_Y);
        ctx.fillStyle = '#333';
        for(let i=0; i<CONFIG.CANVAS_WIDTH; i+=40) {
            ctx.fillRect(i, CONFIG.CASTLE_Y - 20, 20, 20);
        }

        // Draw Items
        this.items.forEach(item => {
            ctx.fillStyle = item.type.color;
            ctx.beginPath();
            ctx.arc(item.x, item.y, item.type.size, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '16px Arial';
            ctx.fillText(item.type.text, item.x, item.y);
        });
        ctx.textBaseline = 'alphabetic';

        // Draw Enemies
        this.enemies.forEach(e => {
            ctx.fillStyle = e.frozenTimer > 0 ? '#aaaaff' : e.type.color;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.type.size, 0, Math.PI*2);
            ctx.fill();
            
            // HP Bar
            ctx.fillStyle = 'red';
            ctx.fillRect(e.x - 15, e.y - e.type.size - 10, 30, 5);
            ctx.fillStyle = 'green';
            ctx.fillRect(e.x - 15, e.y - e.type.size - 10, 30 * (Math.max(0, e.hp) / e.type.maxHp), 5);
        });

        // Draw Heroes
        this.heroes.forEach(hero => {
            ctx.fillStyle = hero.color;
            ctx.beginPath();
            ctx.arc(hero.x, hero.y, CONFIG.HERO.size, 0, Math.PI*2);
            ctx.fill();
            // Bow
            ctx.strokeStyle = 'brown';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(hero.x, hero.y - 5, 15, Math.PI, 0);
            ctx.stroke();
            // Name
            ctx.fillStyle = 'white';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(hero.name, hero.x, hero.y + 30);
        });

        // Draw Projectiles
        this.projectiles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - 2, p.y - 10, 4, 20);
        });

        // UI
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, 40);
        ctx.fillStyle = 'gold';
        ctx.font = '20px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`共享军费: ${this.gold} G`, 20, 28);
        ctx.fillText(`全军攻击力: ${this.heroStats.damage}`, 200, 28);

        // Upgrade Panel
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(780, 40, 220, 240);
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText('军队升级', 890, 70);
        
        CONFIG.UPGRADES.forEach((upg, i) => {
            const cost = Math.floor(upg.cost * Math.pow(upg.costMult, this.heroStats.upgradeLevels[i]));
            const btnX = 800;
            const btnY = 90 + i * 50;
            
            ctx.fillStyle = this.gold >= cost ? '#4CAF50' : '#888';
            ctx.fillRect(btnX, btnY, 180, 40);
            ctx.fillStyle = 'white';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${upg.name} (${cost}G)`, btnX + 90, btnY + 25);
        });
    }
}

window.addEventListener('load', () => {
    new Game();
});
"""

with open(os.path.join(base_dir, 'config.js'), 'w') as f:
    f.write(config_js)

with open(os.path.join(base_dir, 'main.js'), 'w') as f:
    f.write(main_js)

print("Game screen elongated and lanes snapping mechanism implemented!")
