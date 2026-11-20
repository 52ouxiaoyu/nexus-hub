import os

base_dir = "/Users/clawbox/game-portal/kingdom-rush/js"

sprites_js = """
const SPRITE_PALETTE = {
    '0': 'transparent',
    '1': '#000000', // Outline
    '2': '#FFCDB2', // Skin
    '3': '#FFFFFF', // White
    '4': '#FF0000', // Red
    '5': '#A0522D', // Wood/Brown
    '6': '#808080', // Metal/Grey
    '7': '#FFD700', // Gold
};

const SPRITES = {
    HERO: [
        "0001111000",
        "0012222100",
        "0121221210",
        "0122222210",
        "0011111100",
        "011CCCC110", // C = color (dynamic)
        "1C1CCCC1C1",
        "1C1CCCC1C1",
        "0111111110",
        "0011001100",
        "0111001110"
    ],
    GOBLIN: [
        "00111100",
        "01GGGG10", // G = green
        "1G1GG1G1",
        "1GGGGGG1",
        "011GG110",
        "01GGGG10",
        "1G1001G1",
        "11000011"
    ],
    ORC: [
        "0011111100",
        "01OOOOOO10", // O = Olive
        "1O1OOOO1O1",
        "1O4OOOO4O1",
        "1OOOOOOOO1",
        "011OOOO110",
        "01OOOOOO10",
        "1O100001O1",
        "1100000011"
    ],
    TROLL: [
        "001111111100",
        "01TTTTTTTT10", // T = Dark Red
        "1T1TTTTTT1T1",
        "1T4TTTTTT4T1",
        "1TTTTTTTTTT1",
        "1TT111111TT1",
        "01TTTTTTTT10",
        "01TTTTTTTT10",
        "1T11000011T1",
        "110000000011"
    ],
    ARROW: [
        "0110",
        "1661",
        "0110",
        "0550",
        "0550",
        "0550",
        "0550",
        "1331",
        "1331"
    ]
};

function drawSprite(ctx, spriteObj, x, y, sizeMultiplier, dynamicColor) {
    if (!spriteObj) return;
    const rows = spriteObj.length;
    const cols = spriteObj[0].length;
    const pSize = sizeMultiplier;
    
    // x and y are the center of the sprite
    const startX = x - (cols * pSize) / 2;
    const startY = y - (rows * pSize) / 2;
    
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const char = spriteObj[r][c];
            if (char === '0') continue;
            
            let color = SPRITE_PALETTE[char];
            if (char === 'C') color = dynamicColor;
            if (char === 'G') color = '#32CD32'; // Green
            if (char === 'O') color = '#556B2F'; // Olive
            if (char === 'T') color = '#8B0000'; // Dark Red
            
            if (color) {
                ctx.fillStyle = color;
                ctx.fillRect(startX + c * pSize, startY + r * pSize, pSize, pSize);
            }
        }
    }
}
"""

main_js_content = """
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
                hero.y = CONFIG.CANVAS_HEIGHT - 120;
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
                    const btnY = 55;
                    
                    if (pos.x >= btnX && pos.x <= btnX + 100 && pos.y >= btnY && pos.y <= btnY + 25) {
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
                y: CONFIG.CANVAS_HEIGHT - 120, // Standing higher on castle
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
                y: hero.y - 20, // shoot slightly above hero
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
            
            if (e.y + (e.type.size*2) >= CONFIG.CANVAS_HEIGHT - 100) { // Castle boundary check adjusted for sprite size
                this.gameOver = true;
                this.state = 'gameover';
                Audio.playGameOver();
                return;
            }

            let hit = false;
            let lastHitter = null;
            for (let j = this.projectiles.length - 1; j >= 0; j--) {
                const p = this.projectiles[j];
                // collision detection tweaked for sprites
                if (Math.hypot(e.x - p.x, e.y - p.y) < e.type.size * 2) {
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
                if (Math.hypot(item.x - p.x, item.y - p.y) < item.type.size + 15) {
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

    drawPixelText(ctx, text, x, y, size, color, align='center') {
        ctx.fillStyle = color;
        ctx.font = `bold ${size}px 'Courier New', Courier, monospace`;
        ctx.textAlign = align;
        // Text shadow for pixel pop
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.fillText(text, x, y);
        ctx.shadowColor = 'transparent';
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    }

    drawButton(ctx, x, y, w, h, text, color) {
        // Pixel art style button
        ctx.fillStyle = '#111';
        ctx.fillRect(x+2, y+2, w, h); // shadow
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);
        
        // Inner highlight/border
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x+2, y+2, w-4, h-4);

        ctx.textBaseline = 'middle';
        this.drawPixelText(ctx, text, x + w/2, y + h/2 + 2, 20, 'white', 'center');
        ctx.textBaseline = 'alphabetic';
    }

    render() {
        const ctx = this.renderer.ctx;
        ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        ctx.textBaseline = 'alphabetic'; 
        
        const cx = CONFIG.CANVAS_WIDTH / 2;
        const cy = CONFIG.CANVAS_HEIGHT / 2;

        if (this.state === 'menu') {
            // Dark stone background
            ctx.fillStyle = '#222';
            ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
            ctx.strokeStyle = '#111';
            ctx.lineWidth = 2;
            for(let y=0; y<CONFIG.CANVAS_HEIGHT; y+=40) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CONFIG.CANVAS_WIDTH, y); ctx.stroke();
                let offset = (y%80===0)?0:20;
                for(let x=offset; x<CONFIG.CANVAS_WIDTH; x+=40) {
                    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y+40); ctx.stroke();
                }
            }
            
            this.drawPixelText(ctx, '王国保卫战', cx, cy - 160, 60, '#FFD700');
            this.drawPixelText(ctx, '像素射击版', cx, cy - 110, 30, '#FFF');
            
            this.drawPixelText(ctx, '操作指南：P1 (A/D) | P2 (左右) | P3 (J/L)', cx, cy - 50, 18, '#CCC');
            
            this.drawPixelText(ctx, '玩家数量: ' + this.numPlayers, cx, cy, 24, '#FFF');
            this.drawButton(ctx, cx - 130, cy - 20, 40, 40, '-', '#444');
            this.drawButton(ctx, cx + 90, cy - 20, 40, 40, '+', '#444');

            // Removed "(最多10条)"
            this.drawPixelText(ctx, '敌人路线: ' + this.numLanes, cx, cy + 70, 24, '#FFF');
            this.drawButton(ctx, cx - 130, cy + 50, 40, 40, '-', '#444');
            this.drawButton(ctx, cx + 90, cy + 50, 40, 40, '+', '#444');

            this.drawButton(ctx, cx - 100, cy + 140, 200, 50, '开始游戏', '#8B0000');
            return;
        }

        if (this.state === 'gameover') {
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
            this.drawPixelText(ctx, '游戏结束', cx, cy - 50, 60, '#FF0000');
            this.drawPixelText(ctx, '城堡被攻破了！点击返回主菜单', cx, cy + 50, 24, '#FFF');
            return;
        }

        // Draw Background (Grass)
        ctx.fillStyle = '#2d4c1e'; 
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        // Grass texture
        ctx.fillStyle = '#355E24';
        for(let i=0; i<300; i++) {
            ctx.fillRect(Math.random()*CONFIG.CANVAS_WIDTH, Math.random()*CONFIG.CANVAS_HEIGHT, 4, 12);
        }
        
        // Draw Lanes
        ctx.fillStyle = '#4a3b2c'; 
        let laneWidth = Math.min(80, (CONFIG.CANVAS_WIDTH / (this.numLanes + 1)) - 10);
        this.lanes.forEach(lane => {
            ctx.fillRect(lane - laneWidth/2, 90, laneWidth, CONFIG.CANVAS_HEIGHT);
        });

        // ==========================
        // CASTLE PIXEL ART STYLE
        // ==========================
        const castleY = CONFIG.CANVAS_HEIGHT - 100;
        ctx.fillStyle = '#5c5c5c'; // Base stone color
        ctx.fillRect(0, castleY, CONFIG.CANVAS_WIDTH, 100);
        // Battlements
        ctx.fillStyle = '#5c5c5c';
        for(let i=0; i<CONFIG.CANVAS_WIDTH; i+=60) {
            ctx.fillRect(i, castleY - 30, 40, 30);
            ctx.strokeStyle = '#222';
            ctx.lineWidth = 3;
            ctx.strokeRect(i, castleY - 30, 40, 30);
        }
        // Bricks
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 3;
        for(let y = castleY; y < CONFIG.CANVAS_HEIGHT; y += 40) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CONFIG.CANVAS_WIDTH, y); ctx.stroke();
            let offset = (y % 80 === 0) ? 0 : 50;
            for(let x = offset; x < CONFIG.CANVAS_WIDTH; x += 100) {
                ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 40); ctx.stroke();
            }
        }
        // Gate
        const gateWidth = 140; const gateHeight = 90;
        const gateX = cx - gateWidth/2;
        const gateY = CONFIG.CANVAS_HEIGHT - gateHeight;
        ctx.fillStyle = '#3a2512';
        ctx.fillRect(gateX, gateY + gateWidth/2, gateWidth, gateHeight - gateWidth/2);
        ctx.beginPath();
        ctx.arc(gateX + gateWidth/2, gateY + gateWidth/2, gateWidth/2, Math.PI, 0);
        ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 5; ctx.stroke();
        ctx.strokeRect(gateX, gateY + gateWidth/2, gateWidth, gateHeight - gateWidth/2);
        // Gate Bars
        ctx.fillStyle = '#111';
        for (let ix = gateX + 20; ix < gateX + gateWidth; ix += 30) {
            ctx.fillRect(ix, gateY + 30, 6, gateHeight - 30);
        }

        // ==========================
        // ENTITIES (Pixel Art)
        // ==========================
        this.items.forEach(item => {
            // Drop shadow
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.beginPath(); ctx.ellipse(item.x, item.y + 10, 15, 5, 0, 0, Math.PI*2); ctx.fill();
            
            // Emoji item representation (works well as pixel style fallback)
            ctx.fillStyle = 'white'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.font = '24px Arial'; ctx.fillText(item.type.text, item.x, item.y);
        });
        ctx.textBaseline = 'alphabetic';

        this.enemies.forEach(e => {
            // Drop shadow
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.beginPath(); ctx.ellipse(e.x, e.y + e.type.size*1.5, e.type.size, e.type.size*0.4, 0, 0, Math.PI*2); ctx.fill();
            
            const spriteId = e.type.id.toUpperCase();
            drawSprite(ctx, SPRITES[spriteId], e.x, e.y, e.type.size/4, null);
            
            // HP Bar
            ctx.fillStyle = '#000'; ctx.fillRect(e.x - 20, e.y - e.type.size*2 - 10, 40, 8);
            ctx.fillStyle = 'red'; ctx.fillRect(e.x - 18, e.y - e.type.size*2 - 8, 36, 4);
            ctx.fillStyle = '#32CD32'; ctx.fillRect(e.x - 18, e.y - e.type.size*2 - 8, 36 * (Math.max(0, e.hp) / e.type.maxHp), 4);
        });

        this.heroes.forEach(hero => {
            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.beginPath(); ctx.ellipse(hero.x, hero.y + 25, 20, 8, 0, 0, Math.PI*2); ctx.fill();

            // Draw Hero Pixel Sprite
            drawSprite(ctx, SPRITES.HERO, hero.x, hero.y, 4, hero.color);

            // Name plate
            this.drawPixelText(ctx, hero.name, hero.x, hero.y + 45, 14, 'white', 'center');
        });

        this.projectiles.forEach(p => {
            drawSprite(ctx, SPRITES.ARROW, p.x, p.y, 2, null);
        });

        // ==========================
        // HUD
        // ==========================
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, 90);
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(0, 90); ctx.lineTo(CONFIG.CANVAS_WIDTH, 90); ctx.stroke();

        const sectionWidth = CONFIG.CANVAS_WIDTH / this.numPlayers;
        for (let p = 0; p < this.numPlayers; p++) {
            const hero = this.heroes[p];
            const startX = p * sectionWidth;
            
            // Divider
            if (p > 0) {
                ctx.beginPath(); ctx.moveTo(startX, 0); ctx.lineTo(startX, 90); ctx.stroke();
            }

            this.drawPixelText(ctx, hero.name, startX + 10, 30, 20, hero.color, 'left');
            
            this.drawPixelText(ctx, `得分: ${hero.score}`, startX + 130, 30, 16, '#FFF', 'left');
            this.drawPixelText(ctx, `金币: ${hero.gold}G`, startX + 250, 30, 16, '#FFD700', 'left');
            
            let speedStr = (1000/hero.fireRate).toFixed(1) + '/s';
            this.drawPixelText(ctx, `攻击:${hero.damage} 射速:${speedStr} 多重:${hero.arrows}`, startX + 10, 50, 14, '#AAA', 'left');

            // Upgrades
            for (let i = 0; i < CONFIG.UPGRADES.length; i++) {
                const upg = CONFIG.UPGRADES[i];
                const cost = Math.floor(upg.cost * Math.pow(upg.costMult, hero.upgradeLevels[i]));
                const btnX = startX + 10 + i * 110;
                const btnY = 60;
                
                const btnColor = hero.gold >= cost ? '#2E8B57' : '#555';
                this.drawButton(ctx, btnX, btnY, 100, 24, `${upg.name}(${cost}G)`, btnColor);
            }
        }
    }
}

window.addEventListener('load', () => {
    new Game();
});
"""

with open(os.path.join(base_dir, 'sprites.js'), 'w') as f:
    f.write(sprites_js)

with open(os.path.join(base_dir, 'main.js'), 'w') as f:
    f.write(main_js_content)

print("Pixel art UI applied successfully!")
