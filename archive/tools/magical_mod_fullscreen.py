import os

base_dir = "/Users/clawbox/game-portal/kingdom-rush"

index_html = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>王国保卫战 - Kingdom Rush</title>
    <style>
        body, html {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            background: #000;
        }
        #game-container {
            width: 100%;
            height: 100%;
        }
        canvas {
            display: block;
            width: 100%;
            height: 100%;
        }
    </style>
</head>
<body>
    <div id="game-container">
        <canvas id="gameCanvas"></canvas>
    </div>
    <script src="js/config.js"></script>
    <script src="js/audio.js"></script>
    <script src="js/sprites.js"></script>
    <script src="js/utils.js"></script>
    <script src="js/renderer.js"></script>
    <script src="js/ui.js"></script>
    <script src="js/main.js"></script>
</body>
</html>
"""

config_js = """
const CONFIG = {
    CANVAS_WIDTH: window.innerWidth,
    CANVAS_HEIGHT: window.innerHeight,
    FPS: 60,
    
    STARTING_GOLD: 0,
    
    HERO: {
        baseDamage: 20,
        fireRate: 500, // ms
        projectileSpeed: 10,
        size: 20
    },

    UPGRADES: [
        { name: '攻击+', cost: 50, damageInc: 10, costMult: 1.5, type: 'damage' },
        { name: '射速+', cost: 100, fireRateMult: 0.85, costMult: 1.6, type: 'speed' },
        { name: '多重箭', cost: 300, arrows: 1, costMult: 2.0, type: 'arrows' }
    ],
    
    ENEMY_TYPES: {
        GOBLIN: { id: 'goblin', name: '哥布林', hp: 30, speed: 1.5, reward: 5, color: '#228B22', size: 15 },
        ORC: { id: 'orc', name: '兽人', hp: 80, speed: 1.0, reward: 15, color: '#556B2F', size: 20 },
        TROLL: { id: 'troll', name: '巨魔', hp: 200, speed: 0.6, reward: 30, color: '#8B0000', size: 25 }
    },

    ITEMS: {
        BOMB: { id: 'bomb', color: '#000000', size: 15, text: '💣' },
        FREEZE: { id: 'freeze', color: '#00FFFF', size: 15, text: '❄️' },
        HEAL: { id: 'heal', color: '#00FF00', size: 15, text: '💰' } // Changed to gold bag
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
        this.numLanes = 5;   // Default 5
        
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
        
        this.resize();
        this.initEventListeners();
        Audio.init();
        
        this.showMainMenu();
        this.gameLoop(0);
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        CONFIG.CANVAS_WIDTH = window.innerWidth;
        CONFIG.CANVAS_HEIGHT = window.innerHeight;
        
        // Update lanes and heroes X positions if playing
        if (this.state === 'playing') {
            this.lanes = [];
            for (let i = 1; i <= this.numLanes; i++) {
                this.lanes.push((CONFIG.CANVAS_WIDTH / (this.numLanes + 1)) * i);
            }
            this.heroes.forEach(hero => {
                hero.x = this.lanes[hero.laneIndex];
                hero.y = CONFIG.CANVAS_HEIGHT - 100;
            });
        }
    }

    initEventListeners() {
        window.addEventListener('resize', () => this.resize());

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
            const pos = { x: e.clientX, y: e.clientY };
            this.handleClick(pos);
        });
    }

    handleHeroMovement(key) {
        this.heroes.forEach(hero => {
            if (key === hero.controls[0] || key === hero.controls[1]) {
                if (hero.laneIndex > 0) hero.laneIndex--;
            } else if (key === hero.controls[2] || key === hero.controls[3]) {
                if (hero.laneIndex < this.numLanes - 1) hero.laneIndex++;
            }
            hero.x = this.lanes[hero.laneIndex];
        });
    }
    
    handleClick(pos) {
        const cx = CONFIG.CANVAS_WIDTH / 2;
        const cy = CONFIG.CANVAS_HEIGHT / 2;

        if (this.state === 'menu') {
            // Players
            if (pos.y >= cy - 20 && pos.y <= cy + 20) {
                if (pos.x >= cx - 110 && pos.x <= cx - 70) this.numPlayers = Math.max(1, this.numPlayers - 1);
                else if (pos.x >= cx + 70 && pos.x <= cx + 110) this.numPlayers = Math.min(3, this.numPlayers + 1);
            }
            // Lanes
            if (pos.y >= cy + 50 && pos.y <= cy + 90) {
                if (pos.x >= cx - 110 && pos.x <= cx - 70) this.numLanes = Math.max(1, this.numLanes - 1);
                else if (pos.x >= cx + 70 && pos.x <= cx + 110) this.numLanes = Math.min(10, this.numLanes + 1);
            }
            // Start
            if (pos.x >= cx - 100 && pos.x <= cx + 100 && pos.y >= cy + 140 && pos.y <= cy + 190) {
                this.startGame();
            }
        } else if (this.state === 'gameover') {
            this.showMainMenu();
        } else if (this.state === 'playing') {
            // Check HUD upgrade clicks
            const sectionWidth = CONFIG.CANVAS_WIDTH / this.numPlayers;
            for (let p = 0; p < this.numPlayers; p++) {
                const hero = this.heroes[p];
                const startX = p * sectionWidth;
                
                // 3 upgrades
                for (let i = 0; i < CONFIG.UPGRADES.length; i++) {
                    const upg = CONFIG.UPGRADES[i];
                    const cost = Math.floor(upg.cost * Math.pow(upg.costMult, hero.upgradeLevels[i]));
                    const btnX = startX + 10 + i * 110;
                    const btnY = 50;
                    
                    if (pos.x >= btnX && pos.x <= btnX + 100 && pos.y >= btnY && pos.y <= btnY + 30) {
                        if (hero.gold >= cost) {
                            hero.gold -= cost;
                            hero.upgradeLevels[i]++;
                            if (upg.type === 'damage') hero.damage += upg.damageInc;
                            if (upg.type === 'speed') hero.fireRate *= upg.fireRateMult;
                            if (upg.type === 'arrows') hero.arrows += upg.arrows;
                        }
                    }
                }
            }
        }
    }
    
    showMainMenu() {
        this.state = 'menu';
    }
    
    startGame() {
        this.resize();
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
                y: CONFIG.CANVAS_HEIGHT - 100,
                color: config.color,
                name: config.name,
                controls: config.keys,
                lastShotTime: 0,
                // INDEPENDENT STATS
                gold: CONFIG.STARTING_GOLD,
                score: 0,
                damage: CONFIG.HERO.baseDamage,
                fireRate: CONFIG.HERO.fireRate,
                arrows: 1,
                upgradeLevels: [0, 0, 0]
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
            y: 90, // Spawn below HUD
            hp: type.hp,
            maxHp: type.hp,
            frozenTimer: 0
        });
    }

    shoot(hero) {
        const spread = 20;
        for (let i = 0; i < hero.arrows; i++) {
            let targetX = hero.x;
            if (hero.arrows > 1) targetX = hero.x - (spread * (hero.arrows - 1)) / 2 + i * spread;
            
            let vx_straight = 0;
            if (hero.arrows > 1) vx_straight = ((i / (hero.arrows - 1)) - 0.5) * 4;

            this.projectiles.push({
                heroOwner: hero,
                x: hero.x,
                y: hero.y,
                vx: vx_straight,
                vy: -CONFIG.HERO.projectileSpeed,
                damage: hero.damage,
                color: hero.color,
                alive: true
            });
        }
        Audio.playShoot();
    }
    
    update(currentTime, deltaTime) {
        if (this.state !== 'playing' || this.paused) return;
        
        this.heroes.forEach(hero => {
            if (currentTime - hero.lastShotTime > hero.fireRate) {
                this.shoot(hero);
                hero.lastShotTime = currentTime;
            }
        });

        this.enemySpawnTimer += deltaTime;
        const spawnInterval = Math.max(250, 1500 - (this.numLanes * 150)); 
        if (this.enemySpawnTimer > spawnInterval) { 
            this.spawnEnemy();
            this.enemySpawnTimer = 0;
        }

        // Update Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.x += p.vx;
            p.y += p.vy;
            if (p.y < 90 || p.x < 0 || p.x > CONFIG.CANVAS_WIDTH) { // Destroy at HUD line
                this.projectiles.splice(i, 1);
            }
        }

        // Update Enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            if (e.frozenTimer > 0) e.frozenTimer -= deltaTime;
            else e.y += e.type.speed;
            
            if (e.y + e.type.size >= CONFIG.CANVAS_HEIGHT - 100) { // Castle boundary
                this.gameOver = true;
                this.state = 'gameover';
                Audio.playGameOver();
                return;
            }

            let hit = false;
            let lastHitter = null;
            for (let j = this.projectiles.length - 1; j >= 0; j--) {
                const p = this.projectiles[j];
                if (Math.hypot(e.x - p.x, e.y - p.y) < e.type.size + 5) {
                    e.hp -= p.damage;
                    lastHitter = p.heroOwner;
                    this.projectiles.splice(j, 1);
                    hit = true;
                }
            }

            if (e.hp <= 0) {
                if (lastHitter) {
                    lastHitter.gold += e.type.reward;
                    lastHitter.score += e.type.reward * 10;
                }
                if (Math.random() < 0.1) {
                    const itemTypes = Object.values(CONFIG.ITEMS);
                    this.items.push({
                        type: itemTypes[Math.floor(Math.random() * itemTypes.length)],
                        x: e.x, y: e.y, vy: 2
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
                if (Math.hypot(item.x - p.x, item.y - p.y) < item.type.size + 10) {
                    this.applyItem(item.type, p.heroOwner);
                    this.projectiles.splice(j, 1);
                    this.items.splice(i, 1);
                    break;
                }
            }
            if (item && item.y > CONFIG.CANVAS_HEIGHT) this.items.splice(i, 1);
        }
    }
    
    applyItem(itemType, heroOwner) {
        if (itemType.id === 'bomb') {
            this.enemies.forEach(e => {
                e.hp -= 100;
                if(e.hp <= 0 && heroOwner) {
                    heroOwner.score += e.type.reward * 10;
                    heroOwner.gold += e.type.reward;
                }
            });
        } else if (itemType.id === 'freeze') {
            this.enemies.forEach(e => e.frozenTimer = 3000);
        } else if (itemType.id === 'heal') {
            if(heroOwner) heroOwner.gold += 100; 
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
        ctx.textBaseline = 'alphabetic'; 
        
        const cx = CONFIG.CANVAS_WIDTH / 2;
        const cy = CONFIG.CANVAS_HEIGHT / 2;

        if (this.state === 'menu') {
            ctx.fillStyle = '#111';
            ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
            
            ctx.fillStyle = 'white';
            ctx.font = '50px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('王国保卫战 (全屏独立射击版)', cx, cy - 150);
            
            ctx.font = '20px Arial';
            ctx.fillText('操作指南：P1 (A/D) | P2 (左右方向键) | P3 (J/L)', cx, cy - 70);
            
            ctx.font = '24px Arial';
            ctx.fillText('玩家数量: ' + this.numPlayers, cx, cy);
            this.drawButton(ctx, cx - 110, cy - 20, 40, 40, '-', '#555');
            this.drawButton(ctx, cx + 70, cy - 20, 40, 40, '+', '#555');

            ctx.textBaseline = 'alphabetic';
            ctx.fillText('敌人路线: ' + this.numLanes + ' (最多10条)', cx, cy + 70);
            this.drawButton(ctx, cx - 110, cy + 50, 40, 40, '-', '#555');
            this.drawButton(ctx, cx + 70, cy + 50, 40, 40, '+', '#555');

            ctx.textBaseline = 'alphabetic';
            this.drawButton(ctx, cx - 100, cy + 140, 200, 50, '开始游戏', '#4CAF50');
            return;
        }

        if (this.state === 'gameover') {
            ctx.fillStyle = '#111';
            ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
            ctx.fillStyle = 'red';
            ctx.font = '50px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('游戏结束', cx, cy - 50);
            ctx.fillStyle = 'white';
            ctx.font = '20px Arial';
            ctx.fillText('城堡被攻破了！点击返回主菜单', cx, cy + 50);
            return;
        }

        // Draw Background
        ctx.fillStyle = '#2d4c1e'; 
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        
        // Draw Lanes
        ctx.fillStyle = '#4a3b2c'; 
        let laneWidth = Math.min(80, (CONFIG.CANVAS_WIDTH / (this.numLanes + 1)) - 10);
        this.lanes.forEach(lane => {
            ctx.fillRect(lane - laneWidth/2, 90, laneWidth, CONFIG.CANVAS_HEIGHT);
        });

        // Castle
        const castleY = CONFIG.CANVAS_HEIGHT - 100;
        ctx.fillStyle = '#6e6e6e'; 
        ctx.fillRect(0, castleY, CONFIG.CANVAS_WIDTH, 100);
        for(let i=0; i<CONFIG.CANVAS_WIDTH; i+=60) {
            ctx.fillRect(i, castleY - 30, 40, 30);
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.strokeRect(i, castleY - 30, 40, 30);
        }
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 2;
        for(let y = castleY; y < CONFIG.CANVAS_HEIGHT; y += 40) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CONFIG.CANVAS_WIDTH, y); ctx.stroke();
            let offset = (y % 80 === 0) ? 0 : 50;
            for(let x = offset; x < CONFIG.CANVAS_WIDTH; x += 100) {
                ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 40); ctx.stroke();
            }
        }
        const gateWidth = 160; const gateHeight = 100;
        const gateX = (CONFIG.CANVAS_WIDTH - gateWidth) / 2;
        const gateY = CONFIG.CANVAS_HEIGHT - gateHeight;
        ctx.fillStyle = '#3a2512';
        ctx.beginPath();
        ctx.moveTo(gateX, CONFIG.CANVAS_HEIGHT); ctx.lineTo(gateX, gateY + gateWidth/2);
        ctx.arc(gateX + gateWidth/2, gateY + gateWidth/2, gateWidth/2, Math.PI, 0);
        ctx.lineTo(gateX + gateWidth, CONFIG.CANVAS_HEIGHT); ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 4; ctx.stroke();

        // Entities
        this.items.forEach(item => {
            ctx.fillStyle = item.type.color;
            ctx.beginPath(); ctx.arc(item.x, item.y, item.type.size, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = 'white'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.font = '16px Arial'; ctx.fillText(item.type.text, item.x, item.y);
        });
        ctx.textBaseline = 'alphabetic';

        this.enemies.forEach(e => {
            ctx.fillStyle = e.frozenTimer > 0 ? '#aaaaff' : e.type.color;
            ctx.beginPath(); ctx.arc(e.x, e.y, e.type.size, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = 'red'; ctx.fillRect(e.x - 15, e.y - e.type.size - 10, 30, 5);
            ctx.fillStyle = 'green'; ctx.fillRect(e.x - 15, e.y - e.type.size - 10, 30 * (Math.max(0, e.hp) / e.type.maxHp), 5);
        });

        this.heroes.forEach(hero => {
            ctx.fillStyle = hero.color;
            ctx.beginPath(); ctx.arc(hero.x, hero.y, CONFIG.HERO.size, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#8B4513'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(hero.x, hero.y - 5, 15, Math.PI, 0); ctx.stroke();
            ctx.fillStyle = 'white'; ctx.font = '14px Arial'; ctx.textAlign = 'center';
            ctx.shadowColor = 'black'; ctx.shadowBlur = 4; ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 1;
            ctx.fillText(hero.name, hero.x, hero.y + 35);
            ctx.shadowColor = 'transparent';
        });

        this.projectiles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color; ctx.shadowBlur = 10;
            ctx.fillRect(p.x - 2, p.y - 10, 4, 20);
            ctx.shadowColor = 'transparent';
        });

        // ==========================
        // HUD
        // ==========================
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, 90);
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, 90); ctx.lineTo(CONFIG.CANVAS_WIDTH, 90); ctx.stroke();

        const sectionWidth = CONFIG.CANVAS_WIDTH / this.numPlayers;
        for (let p = 0; p < this.numPlayers; p++) {
            const hero = this.heroes[p];
            const startX = p * sectionWidth;
            
            // Divider
            if (p > 0) {
                ctx.beginPath(); ctx.moveTo(startX, 0); ctx.lineTo(startX, 90); ctx.stroke();
            }

            ctx.fillStyle = hero.color;
            ctx.font = 'bold 18px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(hero.name, startX + 10, 25);
            
            ctx.fillStyle = 'white';
            ctx.font = '14px Arial';
            ctx.fillText(`得分: ${hero.score}`, startX + 110, 25);
            ctx.fillStyle = 'gold';
            ctx.fillText(`金币: ${hero.gold} G`, startX + 210, 25);
            
            ctx.fillStyle = '#ccc';
            let speedStr = (1000/hero.fireRate).toFixed(1) + '/s';
            ctx.fillText(`攻击: ${hero.damage} | 射速: ${speedStr} | 箭数: ${hero.arrows}`, startX + 10, 45);

            // Independent Upgrades
            for (let i = 0; i < CONFIG.UPGRADES.length; i++) {
                const upg = CONFIG.UPGRADES[i];
                const cost = Math.floor(upg.cost * Math.pow(upg.costMult, hero.upgradeLevels[i]));
                const btnX = startX + 10 + i * 110;
                const btnY = 55;
                
                ctx.fillStyle = hero.gold >= cost ? '#4CAF50' : '#555';
                ctx.fillRect(btnX, btnY, 100, 25);
                ctx.fillStyle = 'white';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`${upg.name} (${cost}G)`, btnX + 50, btnY + 12.5);
                ctx.textBaseline = 'alphabetic';
            }
        }
    }
}

window.addEventListener('load', () => {
    new Game();
});
"""

with open(os.path.join(base_dir, 'js', 'config.js'), 'w') as f:
    f.write(config_js)

with open(os.path.join(base_dir, 'js', 'main.js'), 'w') as f:
    f.write(main_js)

with open(os.path.join(base_dir, 'index.html'), 'w') as f:
    f.write(index_html)

print("Fullscreen and individual HUD successfully added!")
