import os
import json

base_dir = "/Users/clawbox/game-portal/kingdom-rush/js"

config_js = """
const CONFIG = {
    CANVAS_WIDTH: 1024,
    CANVAS_HEIGHT: 768,
    FPS: 60,
    
    STARTING_GOLD: 0,
    
    HERO: {
        y: 650,
        speed: 5,
        baseDamage: 20,
        fireRate: 500, // ms
        projectileSpeed: 10,
        color: '#FFD700',
        size: 20
    },

    UPGRADES: [
        { name: '攻击力提升', cost: 50, damageInc: 10, costMult: 1.5 },
        { name: '射速提升', cost: 100, fireRateMult: 0.9, costMult: 1.6 },
        { name: '多重箭', cost: 300, arrows: 1, costMult: 2.0 }
    ],
    
    ENEMY_TYPES: {
        GOBLIN: { id: 'goblin', name: '哥布林', hp: 30, speed: 1.5, reward: 5, color: '#228B22', size: 15 },
        ORC: { id: 'orc', name: '兽人', hp: 80, speed: 1.0, reward: 15, color: '#556B2F', size: 20 },
        TROLL: { id: 'troll', name: '巨魔', hp: 200, speed: 0.6, reward: 30, color: '#8B0000', size: 25 }
    },

    LANES: [256, 512, 768],
    CASTLE_Y: 700,

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
        
        this.gold = CONFIG.STARTING_GOLD;
        this.heroStats = {
            damage: CONFIG.HERO.baseDamage,
            fireRate: CONFIG.HERO.fireRate,
            arrows: 1,
            upgradeLevels: [0, 0, 0]
        };

        this.hero = { x: 512, y: CONFIG.HERO.y };
        this.projectiles = [];
        this.enemies = [];
        this.items = [];
        this.particles = [];
        
        this.lastTime = 0;
        this.lastShotTime = 0;
        this.enemySpawnTimer = 0;
        
        this.paused = false;
        this.gameOver = false;
        
        this.mouseX = 512;
        
        this.initEventListeners();
        Audio.init();
        
        this.showMainMenu();
        this.gameLoop(0);
    }
    
    initEventListeners() {
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            this.mouseX = (e.clientX - rect.left) * scaleX;
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
    
    handleClick(pos) {
        if (this.state === 'menu') {
            this.startGame();
        } else if (this.state === 'gameover') {
            this.showMainMenu();
        } else if (this.state === 'playing') {
            // Check upgrade clicks
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
        this.hero = { x: 512, y: CONFIG.HERO.y };
        this.projectiles = [];
        this.enemies = [];
        this.items = [];
        this.particles = [];
        this.lastShotTime = 0;
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
        const lane = CONFIG.LANES[Math.floor(Math.random() * CONFIG.LANES.length)];
        
        // Add random offset within lane
        const offsetX = (Math.random() - 0.5) * 60;

        this.enemies.push({
            type: type,
            x: lane + offsetX,
            y: -50,
            hp: type.hp,
            maxHp: type.hp,
            frozenTimer: 0
        });
    }

    shoot() {
        const numArrows = this.heroStats.arrows;
        const spread = 20; // pixels spread at target y
        const startX = this.hero.x;
        const startY = this.hero.y;

        for (let i = 0; i < numArrows; i++) {
            let targetX = startX;
            if (numArrows > 1) {
                targetX = startX - (spread * (numArrows - 1)) / 2 + i * spread;
            }
            
            // angle
            const angle = Math.atan2(-startY, targetX - startX);
            const vx = Math.cos(angle) * CONFIG.HERO.projectileSpeed;
            const vy = Math.sin(angle) * CONFIG.HERO.projectileSpeed; // will be negative
            // Actually just shoot straight up, but spread slightly
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
                alive: true
            });
        }
        Audio.playShoot();
    }
    
    update(currentTime, deltaTime) {
        if (this.state !== 'playing' || this.paused) return;
        
        // Move hero towards mouse
        this.hero.x += (this.mouseX - this.hero.x) * 0.1;
        this.hero.x = Math.max(20, Math.min(CONFIG.CANVAS_WIDTH - 20, this.hero.x));

        // Shooting
        if (currentTime - this.lastShotTime > this.heroStats.fireRate) {
            this.shoot();
            this.lastShotTime = currentTime;
        }

        // Spawning
        this.enemySpawnTimer += deltaTime;
        if (this.enemySpawnTimer > 1000) { // spawn every second, gets faster later?
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

            // Check projectile collision
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
                // Chance to drop item
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
            
            // Check projectile collision with item
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
            this.gold += 50; // Replace with gold since no lives
        }
    }

    render() {
        const ctx = this.renderer.ctx;
        ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        
        if (this.state === 'menu') {
            ctx.fillStyle = '#333';
            ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
            ctx.fillStyle = 'white';
            ctx.font = '40px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('将军保卫战 (弓箭射击版)', CONFIG.CANVAS_WIDTH/2, 300);
            ctx.font = '20px Arial';
            ctx.fillText('点击开始游戏', CONFIG.CANVAS_WIDTH/2, 400);
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
        ctx.fillStyle = '#2d4c1e'; // grass
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        
        // Draw Lanes
        ctx.fillStyle = '#4a3b2c'; // dirt
        CONFIG.LANES.forEach(lane => {
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

        // Draw Hero (General)
        ctx.fillStyle = CONFIG.HERO.color;
        ctx.beginPath();
        ctx.arc(this.hero.x, this.hero.y, CONFIG.HERO.size, 0, Math.PI*2);
        ctx.fill();
        // Bow
        ctx.strokeStyle = 'brown';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(this.hero.x, this.hero.y - 5, 15, Math.PI, 0);
        ctx.stroke();

        // Draw Projectiles
        ctx.fillStyle = 'white';
        this.projectiles.forEach(p => {
            ctx.fillRect(p.x - 2, p.y - 10, 4, 20);
        });

        // UI
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, 40);
        ctx.fillStyle = 'gold';
        ctx.font = '20px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`金币: ${this.gold}`, 20, 28);
        ctx.fillText(`攻击力: ${this.heroStats.damage}`, 150, 28);

        // Upgrade Panel
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(780, 40, 220, 240);
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText('升级', 890, 70);
        
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
"""

audio_js = """
const Audio = {
    init: () => {},
    playShoot: () => {},
    playGameOver: () => {},
    playVictory: () => {},
    playPlace: () => {},
    playWaveComplete: () => {},
    resume: () => {}
};
"""

ui_js = """
class UI {
    constructor(renderer, game) {
        this.renderer = renderer;
        this.game = game;
    }
}
"""

sprites_js = """
const Sprites = {};
"""

renderer_js = """
class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    }
}
"""

utils_js = """
const Utils = {};
"""

# Overwrite files
with open(os.path.join(base_dir, 'config.js'), 'w') as f:
    f.write(config_js)

with open(os.path.join(base_dir, 'main.js'), 'w') as f:
    f.write(main_js)

with open(os.path.join(base_dir, 'audio.js'), 'w') as f:
    f.write(audio_js)

with open(os.path.join(base_dir, 'ui.js'), 'w') as f:
    f.write(ui_js)

with open(os.path.join(base_dir, 'sprites.js'), 'w') as f:
    f.write(sprites_js)

with open(os.path.join(base_dir, 'renderer.js'), 'w') as f:
    f.write(renderer_js)

with open(os.path.join(base_dir, 'utils.js'), 'w') as f:
    f.write(utils_js)

print("Game mechanics successfully updated!")
