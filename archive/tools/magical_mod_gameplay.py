import os

base_dir = "/Users/clawbox/game-portal/kingdom-rush/js"

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
        this.particles = [];
        this.floatingTexts = [];
        this.keys = {};
        
        this.lastTime = 0;
        this.enemySpawnTimer = 0;
        this.gameTimer = 0;
        this.waveMultiplier = 1;
        this.castleHp = 10;
        this.maxCastleHp = 10;
        
        this.screenShakeTime = 0;
        this.screenShakeMagnitude = 0;

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
                
                for (let i = 0; i < CONFIG.UPGRADES.length; i++) {
                    const upg = CONFIG.UPGRADES[i];
                    const cost = Math.floor(upg.cost * Math.pow(upg.costMult, hero.upgradeLevels[i]));
                    const btnX = startX + 10 + i * 110;
                    const btnY = 60;
                    
                    if (pos.x >= btnX && pos.x <= btnX + 100 && pos.y >= btnY && pos.y <= btnY + 25) {
                        if (hero.gold >= cost) {
                            hero.gold -= cost;
                            hero.upgradeLevels[i]++;
                            if (upg.type === 'damage') hero.damage += upg.damageInc;
                            if (upg.type === 'speed') hero.fireRate *= upg.fireRateMult;
                            if (upg.type === 'arrows') hero.arrows += upg.arrows;
                            
                            // Visual feedback for upgrade
                            this.spawnFloatingText("升级成功!", btnX + 50, btnY, '#4CAF50');
                        } else {
                            this.spawnFloatingText("金钱不足", btnX + 50, btnY, '#FF0000');
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
        this.state = 'playing'; // Set state FIRST
        this.resize();          // Then resize so lanes generate
        
        this.castleHp = this.maxCastleHp;
        this.gameTimer = 0;
        this.waveMultiplier = 1;

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
                combo: 0,
                comboTimer: 0,
                damage: CONFIG.HERO.baseDamage,
                fireRate: CONFIG.HERO.fireRate,
                arrows: 1,
                upgradeLevels: [0, 0, 0]
            });
        }

        this.projectiles = [];
        this.enemies = [];
        this.items = [];
        this.particles = [];
        this.floatingTexts = [];
        this.enemySpawnTimer = 0;
        this.gameOver = false;
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
            hp: type.hp * this.waveMultiplier,
            maxHp: type.hp * this.waveMultiplier,
            frozenTimer: 0,
            hitTimer: 0
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
    
    spawnParticles(x, y, color, count) {
        for(let i=0; i<count; i++) {
            this.particles.push({
                x: x, y: y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 1.0,
                color: color
            });
        }
    }

    spawnFloatingText(text, x, y, color) {
        this.floatingTexts.push({
            text: text,
            x: x + (Math.random()-0.5)*20,
            y: y,
            vy: -1,
            life: 1.0,
            color: color
        });
    }

    triggerShake(magnitude, time) {
        this.screenShakeMagnitude = magnitude;
        this.screenShakeTime = time;
    }

    update(currentTime, deltaTime) {
        if (this.state !== 'playing' || this.paused) return;
        
        if (deltaTime > 100) deltaTime = 16; // Prevent huge delta spikes

        this.gameTimer += deltaTime;
        // Increase difficulty every 30 seconds
        this.waveMultiplier = 1 + Math.floor(this.gameTimer / 30000) * 0.2;

        if (this.screenShakeTime > 0) this.screenShakeTime -= deltaTime;

        this.heroes.forEach(hero => {
            if (currentTime - hero.lastShotTime > hero.fireRate) {
                this.shoot(hero);
                hero.lastShotTime = currentTime;
            }
            if (hero.comboTimer > 0) hero.comboTimer -= deltaTime;
            else hero.combo = 0;
        });

        this.enemySpawnTimer += deltaTime;
        const baseInterval = Math.max(150, 1500 - (this.numLanes * 120)); 
        const spawnInterval = baseInterval / this.waveMultiplier;
        if (this.enemySpawnTimer > spawnInterval) { 
            this.spawnEnemy();
            this.enemySpawnTimer = 0;
        }

        // Update Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let pt = this.particles[i];
            pt.x += pt.vx; pt.y += pt.vy;
            pt.life -= deltaTime / 500;
            if(pt.life <= 0) this.particles.splice(i, 1);
        }

        // Update Floating Texts
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            let ft = this.floatingTexts[i];
            ft.x += (Math.random() - 0.5);
            ft.y += ft.vy;
            ft.life -= deltaTime / 1000;
            if(ft.life <= 0) this.floatingTexts.splice(i, 1);
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
            if (e.hitTimer > 0) e.hitTimer -= deltaTime;
            if (e.frozenTimer > 0) e.frozenTimer -= deltaTime;
            else e.y += e.type.speed * (0.8 + this.waveMultiplier*0.2); // speed scales
            
            if (e.y + (e.type.size*2) >= CONFIG.CANVAS_HEIGHT - 100) { // Castle boundary check
                this.castleHp--;
                this.triggerShake(10, 300);
                this.spawnParticles(e.x, e.y, '#FF0000', 20);
                this.enemies.splice(i, 1);
                
                if (this.castleHp <= 0) {
                    this.gameOver = true;
                    this.state = 'gameover';
                    Audio.playGameOver();
                }
                continue; // Enemy destroyed, skip projectile check
            }

            let hit = false;
            let lastHitter = null;
            for (let j = this.projectiles.length - 1; j >= 0; j--) {
                const p = this.projectiles[j];
                // collision detection tweaked for sprites
                if (Math.hypot(e.x - p.x, e.y - p.y) < e.type.size * 2) {
                    e.hp -= p.damage;
                    e.hitTimer = 100;
                    lastHitter = p.heroOwner;
                    this.spawnParticles(p.x, p.y, p.color, 3);
                    this.projectiles.splice(j, 1);
                    hit = true;
                }
            }

            if (e.hp <= 0) {
                this.spawnParticles(e.x, e.y, e.type.color, 15);
                if (lastHitter) {
                    lastHitter.combo++;
                    lastHitter.comboTimer = 2000;
                    const bonus = 1 + (lastHitter.combo * 0.1);
                    
                    const goldGained = Math.floor(e.type.reward * bonus);
                    const scoreGained = Math.floor(e.type.reward * 10 * bonus);
                    lastHitter.gold += goldGained;
                    lastHitter.score += scoreGained;
                    
                    this.spawnFloatingText(`+${goldGained}G`, e.x, e.y, '#FFD700');
                    if (lastHitter.combo > 1) {
                        this.spawnFloatingText(`${lastHitter.combo}x COMBO!`, e.x, e.y - 20, lastHitter.color);
                    }
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
                    this.applyItem(item.type, p.heroOwner, item.x, item.y);
                    this.projectiles.splice(j, 1);
                    this.items.splice(i, 1);
                    break;
                }
            }
            if (item && item.y > CONFIG.CANVAS_HEIGHT) this.items.splice(i, 1);
        }
    }
    
    applyItem(itemType, heroOwner, x, y) {
        if (itemType.id === 'bomb') {
            this.triggerShake(15, 400);
            this.enemies.forEach(e => {
                e.hp -= 200;
                e.hitTimer = 100;
                if(e.hp <= 0 && heroOwner) {
                    heroOwner.score += e.type.reward * 10;
                    heroOwner.gold += e.type.reward;
                    this.spawnParticles(e.x, e.y, '#FF4500', 10);
                }
            });
            this.spawnFloatingText("全屏轰炸!", x, y, '#FF4500');
        } else if (itemType.id === 'freeze') {
            this.enemies.forEach(e => e.frozenTimer = 3000);
            this.spawnFloatingText("时间冻结!", x, y, '#00FFFF');
        } else if (itemType.id === 'heal') {
            if(heroOwner) heroOwner.gold += 150; 
            this.spawnFloatingText("+150G!", x, y, '#FFD700');
            // If Castle is damaged, heal it instead?
            if (this.castleHp < this.maxCastleHp) {
                this.castleHp++;
                this.spawnFloatingText("城墙修复!", x, y - 20, '#32CD32');
            }
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
        ctx.save();

        if (this.screenShakeTime > 0) {
            const dx = (Math.random() - 0.5) * this.screenShakeMagnitude;
            const dy = (Math.random() - 0.5) * this.screenShakeMagnitude;
            ctx.translate(dx, dy);
        }

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

            this.drawPixelText(ctx, '敌人路线: ' + this.numLanes, cx, cy + 70, 24, '#FFF');
            this.drawButton(ctx, cx - 130, cy + 50, 40, 40, '-', '#444');
            this.drawButton(ctx, cx + 90, cy + 50, 40, 40, '+', '#444');

            this.drawButton(ctx, cx - 100, cy + 140, 200, 50, '开始游戏', '#8B0000');
            ctx.restore();
            return;
        }

        if (this.state === 'gameover') {
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
            this.drawPixelText(ctx, '城堡被攻破！', cx, cy - 50, 60, '#FF0000');
            this.drawPixelText(ctx, '点击返回主菜单', cx, cy + 50, 24, '#FFF');
            ctx.restore();
            return;
        }

        // Draw Background (Grass)
        ctx.fillStyle = '#2d4c1e'; 
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        // Grass texture
        ctx.fillStyle = '#355E24';
        for(let i=0; i<300; i++) {
            // Seeded random for consistent grass (pseudo)
            let sx = (i * 137.5) % CONFIG.CANVAS_WIDTH;
            let sy = (i * 93.1) % CONFIG.CANVAS_HEIGHT;
            ctx.fillRect(sx, sy, 4, 12);
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
        
        // Flash castle red if damaged
        if (this.screenShakeTime > 0 && this.castleHp < this.maxCastleHp) {
            ctx.fillStyle = '#8e3c3c';
        } else {
            ctx.fillStyle = '#5c5c5c'; // Base stone color
        }
        
        ctx.fillRect(0, castleY, CONFIG.CANVAS_WIDTH, 100);
        // Battlements
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
        // ENTITIES
        // ==========================
        this.items.forEach(item => {
            // Drop shadow
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.beginPath(); ctx.ellipse(item.x, item.y + 10, 15, 5, 0, 0, Math.PI*2); ctx.fill();
            
            ctx.fillStyle = 'white'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.font = '24px Arial'; ctx.fillText(item.type.text, item.x, item.y);
        });
        ctx.textBaseline = 'alphabetic';

        this.enemies.forEach(e => {
            // Drop shadow
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.beginPath(); ctx.ellipse(e.x, e.y + e.type.size*1.5, e.type.size, e.type.size*0.4, 0, 0, Math.PI*2); ctx.fill();
            
            const spriteId = e.type.id.toUpperCase();
            
            ctx.save();
            // Hit flash
            if (e.hitTimer > 0) {
                ctx.globalAlpha = 0.5;
                ctx.filter = 'brightness(200%)';
            }
            if (e.frozenTimer > 0) {
                ctx.filter = 'hue-rotate(180deg) brightness(150%)';
            }
            drawSprite(ctx, SPRITES[spriteId], e.x, e.y, e.type.size/4, null);
            ctx.restore();
            
            // HP Bar
            ctx.fillStyle = '#000'; ctx.fillRect(e.x - 20, e.y - e.type.size*2 - 10, 40, 8);
            ctx.fillStyle = 'red'; ctx.fillRect(e.x - 18, e.y - e.type.size*2 - 8, 36, 4);
            ctx.fillStyle = '#32CD32'; ctx.fillRect(e.x - 18, e.y - e.type.size*2 - 8, 36 * (Math.max(0, e.hp) / e.type.maxHp), 4);
        });

        this.heroes.forEach(hero => {
            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.beginPath(); ctx.ellipse(hero.x, hero.y + 25, 20, 8, 0, 0, Math.PI*2); ctx.fill();

            drawSprite(ctx, SPRITES.HERO, hero.x, hero.y, 4, hero.color);
            this.drawPixelText(ctx, hero.name, hero.x, hero.y + 45, 14, 'white', 'center');
        });

        this.projectiles.forEach(p => {
            drawSprite(ctx, SPRITES.ARROW, p.x, p.y, 2, null);
        });

        // Particles
        this.particles.forEach(pt => {
            ctx.fillStyle = pt.color;
            ctx.globalAlpha = pt.life;
            ctx.fillRect(pt.x, pt.y, 6, 6);
            ctx.globalAlpha = 1.0;
        });

        // Floating Texts
        this.floatingTexts.forEach(ft => {
            ctx.globalAlpha = ft.life;
            this.drawPixelText(ctx, ft.text, ft.x, ft.y, 16, ft.color, 'center');
            ctx.globalAlpha = 1.0;
        });

        ctx.restore(); // Restore shake transform

        // ==========================
        // HUD (Drawn above everything, untransformed)
        // ==========================
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, 90);
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(0, 90); ctx.lineTo(CONFIG.CANVAS_WIDTH, 90); ctx.stroke();

        // Draw Wave Info
        this.drawPixelText(ctx, `难度加成: ${(this.waveMultiplier*100).toFixed(0)}%`, CONFIG.CANVAS_WIDTH - 150, 30, 16, '#FF4500', 'center');
        
        // Draw Castle HP
        let hpColor = this.castleHp > 5 ? '#32CD32' : (this.castleHp > 2 ? '#FFD700' : '#FF0000');
        this.drawPixelText(ctx, `城墙血量: ${this.castleHp}/${this.maxCastleHp}`, CONFIG.CANVAS_WIDTH - 150, 55, 16, hpColor, 'center');

        const sectionWidth = (CONFIG.CANVAS_WIDTH - 300) / this.numPlayers; // Leave 300px for global stats
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

with open(os.path.join(base_dir, 'main.js'), 'w') as f:
    f.write(main_js_content)

print("Bug fixed and game feel enhanced!")
