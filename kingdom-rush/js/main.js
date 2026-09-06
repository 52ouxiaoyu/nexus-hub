
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.renderer = new Renderer(this.canvas);
        this.ui = new UI(this.renderer, this);
        
        this.state = 'menu';
        
        this.numPlayers = 2;
        this.numLanes = 5;
        
        this.heroes = [];
        this.lanes = [];
        this.projectiles = [];
        this.enemies = [];
        this.items = [];
        this.particles = [];
        this.floatingTexts = [];
        this.finalBossSpawned = false;
        this.gameWon = false;
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
        
        
        this.setupDOMEvents();
        this.showMainMenu();
        this.gameLoop(0);
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        CONFIG.CANVAS_WIDTH = window.innerWidth;
        CONFIG.CANVAS_HEIGHT = window.innerHeight;
        
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

    
    setupDOMEvents() {
        document.getElementById('btn-players-minus').onclick = () => { this.numPlayers = Math.max(1, this.numPlayers - 1); document.getElementById('lbl-players').innerText = this.numPlayers; };
        document.getElementById('btn-players-plus').onclick = () => { this.numPlayers = Math.min(3, this.numPlayers + 1); document.getElementById('lbl-players').innerText = this.numPlayers; };
        document.getElementById('btn-lanes-minus').onclick = () => { this.numLanes = Math.max(1, this.numLanes - 1); document.getElementById('lbl-lanes').innerText = this.numLanes; };
        document.getElementById('btn-lanes-plus').onclick = () => { this.numLanes = Math.min(10, this.numLanes + 1); document.getElementById('lbl-lanes').innerText = this.numLanes; };
        
        document.getElementById('btn-start').onclick = () => { Audio.init(); Audio.resume(); this.startGame(); };
        document.getElementById('btn-restart').onclick = () => { this.showMainMenu(); };
    }
    
    updateHUDDOM() {
        if (this.state !== 'playing') return;
        
        // Update King HP
        const hpPercent = (this.castleHp / this.maxCastleHp) * 100;
        const fill = document.getElementById('king-hp-fill');
        const container = document.querySelector('.hp-bar-container');
        fill.style.width = hpPercent + '%';
        document.getElementById('king-hp-text').innerText = this.castleHp + '/' + this.maxCastleHp;
        
        if (this.castleHp <= 3) {
            container.classList.add('danger');
            fill.classList.add('danger');
        } else {
            container.classList.remove('danger');
            fill.classList.remove('danger');
        }
        
        // Update Wave
        document.getElementById('hud-wave').innerText = Math.floor(1 + this.gameTimer/30000);
        
        // Update Player Cards (create if not exist)
        const playersBar = document.getElementById('players-bar');
        if (playersBar.children.length !== this.numPlayers) {
            playersBar.innerHTML = '';
            for (let i = 0; i < this.numPlayers; i++) {
                const hero = this.heroes[i];
                const card = document.createElement('div');
                card.className = 'player-card';
                card.style.borderColor = hero.color;
                card.innerHTML = `
                    <div class="p-name" style="color:${hero.color}">${hero.name}</div>
                    <div class="p-stat"><span>💰金币</span> <span class="p-gold" id="p${i}-gold">${hero.gold}</span></div>
                    <div class="p-stat"><span>🏆得分</span> <span id="p${i}-score">${hero.score}</span></div>
                    <div style="margin-top:8px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.2); font-size:14px; color:#aaa; display:flex; justify-content:space-between;">
                        <span>⚔️<span id="p${i}-dmg">${hero.damage}</span></span>
                        <span>⚡<span id="p${i}-spd">${(1000/hero.fireRate).toFixed(1)}</span>/s</span>
                        <span>🏹<span id="p${i}-arr">${hero.arrows}</span></span>
                    </div>
                `;
                playersBar.appendChild(card);
            }
        } else {
            for (let i = 0; i < this.numPlayers; i++) {
                document.getElementById(`p${i}-gold`).innerText = this.heroes[i].gold;
                document.getElementById(`p${i}-score`).innerText = this.heroes[i].score;
                document.getElementById(`p${i}-dmg`).innerText = this.heroes[i].damage;
                document.getElementById(`p${i}-spd`).innerText = (1000/this.heroes[i].fireRate).toFixed(1);
                document.getElementById(`p${i}-arr`).innerText = this.heroes[i].arrows;
            }
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
        Audio.init();
        Audio.resume();
        // Canvas clicks can be used for manual interaction in the future (like tower defense grid placement)
        // For now, in lane defense, mostly auto or keyboard.
    }


    
        showMainMenu() {
        this.state = 'menu';
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        document.getElementById('menu-panel').classList.add('active');
        document.getElementById('lbl-players').innerText = this.numPlayers;
        document.getElementById('lbl-lanes').innerText = this.numLanes;
    }
    
    startGame() {
        this.state = 'playing';
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        document.getElementById('hud-panel').classList.add('active');
        document.getElementById('players-bar').innerHTML = ''; // Force redraw player cards

        this.resize();
        
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
                y: CONFIG.CANVAS_HEIGHT - 120,
                color: config.color,
                name: config.name,
                controls: config.keys,
                lastShotTime: 0,
                gold: CONFIG.STARTING_GOLD,
                score: 0,
                combo: 0,
                comboTimer: 0,
                damage: CONFIG.WEAPON_TIERS[0].damage,
                fireRate: CONFIG.WEAPON_TIERS[0].fireRate,
                arrows: 1,
                upgradeLevels: [0, 0, 0],
                weaponTier: 0,
                buffs: { rapidTimer: 0, multiTimer: 0, slowTimer: 0, disarmTimer: 0 }
            });
        }

        this.projectiles = [];
        this.enemies = [];
        this.items = [];
        this.particles = [];
        this.floatingTexts = [];
        this.finalBossSpawned = false;
        this.gameWon = false;
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
            y: 110, // Under new HUD
            hp: type.hp * this.waveMultiplier,
            maxHp: type.hp * this.waveMultiplier,
            frozenTimer: 0,
            hitTimer: 0
        });
    }

    shoot(hero) {
        let actualArrows = hero.arrows;
        if (hero.buffs.multiTimer > 0) actualArrows += 5;
        const weapon = CONFIG.WEAPON_TIERS[hero.weaponTier || 0];

        const spread = 20;
        for (let i = 0; i < actualArrows; i++) {
            let targetX = hero.x;
            if (actualArrows > 1) targetX = hero.x - (spread * (actualArrows - 1)) / 2 + i * spread;
            
            let vx_straight = 0;
            if (actualArrows > 1) vx_straight = ((i / (actualArrows - 1)) - 0.5) * 4;

            let dmg = weapon.damage * (hero.damageMultiplier || 1);
            let pSize = 1;
            if (hero.buffs.giantTimer > 0) { dmg *= 3; pSize = 3; }
            if (this.projectiles.length > 250) {
                this.projectiles.shift(); // Hard cap to prevent lag
            }
            this.projectiles.push({
                heroOwner: hero,
                x: targetX,
                y: hero.y - 20,
                vx: vx_straight,
                vy: -weapon.speed,
                damage: dmg,
                pScale: pSize,
                color: weapon.color,
                sprite: weapon.sprite,
                homing: weapon.homing,
                splash: weapon.splash,
                pierce: weapon.pierce,
                boomerang: weapon.boomerang,
                isWave: weapon.isWave,
                freeze: weapon.freeze,
                rotation: 0,
                piercedEnemies: new Set(),
                speedMultiplier: weapon.speed,
                alive: true
            });
        }
        if (weapon.id === 'trebuchet' || weapon.id === 'zhentianlei' || weapon.id === 'shockwave') Audio.playExplosion();
        else Audio.playShoot();
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

    spawnFloatingText(text, x, y, color, size=16) {
        this.floatingTexts.push({
            text: text,
            x: x + (Math.random()-0.5)*20,
            y: y,
            vy: -1,
            life: 1.0,
            color: color,
            size: size
        });
    }

    triggerShake(magnitude, time) {
        // We now rely on natural decay rather than a strict timer
        this.screenShakeMagnitude = Math.max(this.screenShakeMagnitude, magnitude);
    }

    update(currentTime, deltaTime) {
        if (deltaTime > 100) deltaTime = 16; 

        if (this.screenShakeMagnitude > 0.5) {
            this.screenShakeMagnitude *= 0.9;
        } else {
            this.screenShakeMagnitude = 0;
        }

        if (this.state !== 'playing' || this.paused) return;

        this.gameTimer += deltaTime;
        if (this.reverseTimer > 0) this.reverseTimer -= deltaTime;
        if (this.blindTimer > 0) this.blindTimer -= deltaTime;
        this.waveMultiplier = 1 + Math.floor(this.gameTimer / 30000) * 0.2;
        this.updateHUDDOM();

        this.heroes.forEach(hero => {
            if (hero.buffs.rapidTimer > 0) hero.buffs.rapidTimer -= deltaTime;
            if (hero.buffs.rapidTimer > 0) hero.buffs.rapidTimer -= deltaTime;
            if (hero.buffs.multiTimer > 0) hero.buffs.multiTimer -= deltaTime;
            if (hero.buffs.slowTimer > 0) hero.buffs.slowTimer -= deltaTime;
            if (hero.buffs.disarmTimer > 0) hero.buffs.disarmTimer -= deltaTime;
            if (hero.buffs.giantTimer > 0) hero.buffs.giantTimer -= deltaTime;

            let currentFireRate = hero.fireRate;
            if (hero.buffs.rapidTimer > 0) currentFireRate = 100; // Limit rapid fire to 100ms
            if (hero.buffs.slowTimer > 0) currentFireRate = Math.max(1000, currentFireRate * 3);

            if (hero.buffs.disarmTimer <= 0) {
                if (currentTime - hero.lastShotTime > currentFireRate) {
                    this.shoot(hero);
                    hero.lastShotTime = currentTime;
                }
            }

            if (hero.comboTimer > 0) hero.comboTimer -= deltaTime;
            else hero.combo = 0;
            
            // Auto Upgrade Logic: Buy the cheapest available upgrade
            let cheapestIdx = -1;
            let minCost = Infinity;
            for (let i = 0; i < CONFIG.UPGRADES.length; i++) {
                const upg = CONFIG.UPGRADES[i];
                if (upg.type === 'weapon' && hero.weaponTier >= CONFIG.WEAPON_TIERS.length - 1) continue; // Max weapon
                
                const cost = Math.floor(upg.cost * Math.pow(upg.costMult, hero.upgradeLevels[i]));
                if (cost < minCost && hero.gold >= cost) {
                    minCost = cost;
                    cheapestIdx = i;
                }
            }
            if (cheapestIdx !== -1) {
                const upg = CONFIG.UPGRADES[cheapestIdx];
                hero.gold -= minCost;
                hero.upgradeLevels[cheapestIdx]++;
                if (upg.type === 'weapon') {
                    hero.weaponTier = Math.min(CONFIG.WEAPON_TIERS.length - 1, hero.weaponTier + 1);
                } else if (upg.type === 'speed') {
                    if (hero.fireRate > 150) {
                        hero.fireRate *= upg.fireRateMult;
                    } else {
                        hero.damageMultiplier *= 1.2; // Cap reached, convert to damage
                    }
                } else if (upg.type === 'arrows') {
                    if (hero.arrows < 5) {
                        hero.arrows += upg.arrows;
                    } else {
                        hero.damageMultiplier *= 1.5; // Cap reached, convert to damage
                    }
                }
                this.spawnFloatingText(`自动升级: ${upg.name}!`, hero.x, hero.y - 40, '#FFD700', 16);
                Audio.playHit(); // Feedback sound
            }
        });

        this.enemySpawnTimer += deltaTime;
        const baseInterval = Math.max(150, 1500 - (this.numLanes * 120)); 
        const spawnInterval = baseInterval / this.waveMultiplier;
        if (this.enemySpawnTimer > spawnInterval) { 
            this.spawnEnemy();
            this.enemySpawnTimer = 0;
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            let pt = this.particles[i];
            let ts = deltaTime / 16;
            pt.x += pt.vx * ts; pt.y += pt.vy * ts;
            pt.life -= deltaTime / 500;
            if(pt.life <= 0) this.particles.splice(i, 1);
        }

        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            let ft = this.floatingTexts[i];
            ft.x += (Math.random() - 0.5);
            ft.y += ft.vy * (deltaTime / 16);
            ft.life -= deltaTime / 1000;
            if(ft.life <= 0) this.floatingTexts.splice(i, 1);
        }

        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            let ts = deltaTime / 16;
            
            if (p.boomerang) p.vy += 0.4 * ts;
            
            if (p.homing) {
                let closest = null, minD = Infinity;
                this.enemies.forEach(eTarget => {
                    if (eTarget.y < p.y) {
                        let d = Math.hypot(eTarget.x - p.x, eTarget.y - p.y);
                        if (d < minD) { minD = d; closest = eTarget; }
                    }
                });
                if (closest) {
                    const dx = closest.x - p.x, dy = closest.y - p.y;
                    const len = Math.hypot(dx, dy);
                    p.vx += (dx/len * 0.8) * ts; p.vy += (dy/len * 0.8) * ts;
                    const vlen = Math.hypot(p.vx, p.vy);
                    if (vlen > p.speedMultiplier) { p.vx = (p.vx/vlen) * p.speedMultiplier; p.vy = (p.vy/vlen) * p.speedMultiplier; }
                }
            }
            
            p.x += p.vx * ts;
            p.y += p.vy * ts;
            if (p.y < 110 || p.x < 0 || p.x > CONFIG.CANVAS_WIDTH || p.y > CONFIG.CANVAS_HEIGHT) {
                this.projectiles.splice(i, 1);
            }
        }

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            if (e.hitTimer > 0) e.hitTimer -= deltaTime;
            if (e.frozenTimer > 0) {
                e.frozenTimer -= deltaTime;
            } else {
                e.y += e.type.speed * (0.8 + this.waveMultiplier*0.2) * (deltaTime / 16);
                
                // Strafe logic for bosses
                if (e.type.jumpInterval && this.numLanes > 1) {
                    e.jumpTimer -= deltaTime;
                    if (e.jumpTimer <= 0) {
                        e.jumpTimer = e.type.jumpInterval + Math.random() * 500;
                        const currentLaneIdx = Math.floor(e.x / (CONFIG.CANVAS_WIDTH / this.numLanes));
                        let dir = (Math.random() > 0.5 ? 1 : -1) * Math.ceil(Math.random() * e.type.jumpRange);
                        let newLaneIdx = currentLaneIdx + dir;
                        if (newLaneIdx < 0) newLaneIdx = 0;
                        if (newLaneIdx >= this.numLanes) newLaneIdx = this.numLanes - 1;
                        
                        e.targetX = (newLaneIdx + 0.5) * (CONFIG.CANVAS_WIDTH / this.numLanes);
                    }
                }
                
                // Smooth horizontal dash
                if (e.targetX !== undefined && Math.abs(e.x - e.targetX) > 1) {
                    e.x += (e.targetX - e.x) * 0.15;
                }
            } 
            
            if (e.y + (e.type.size*2) >= CONFIG.CANVAS_HEIGHT - 100) {
                
                this.castleHp--;
                const hpBox = document.querySelector('.king-hp-box');
                if (hpBox) {
                    hpBox.classList.remove('shake');
                    void hpBox.offsetWidth; // trigger reflow
                    hpBox.classList.add('shake');
                }

                this.triggerShake(10, 300);
                this.spawnParticles(e.x, e.y, '#FF0000', 20);
                Audio.playHit();
                this.enemies.splice(i, 1);
                
                if (this.castleHp <= 0) {
                    this.gameOver = true;
                    this.state = 'gameover';
                    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
                    document.getElementById('gameover-panel').classList.add('active');
                    document.getElementById('final-wave').innerText = Math.floor(1 + this.gameTimer/30000);
                    Audio.playGameOver();
                }
                continue;
            }

            let hit = false;
            let lastHitter = null;
            for (let j = this.projectiles.length - 1; j >= 0; j--) {
                const p = this.projectiles[j];

                let hitbox = e.type.size * 2;
                if (p.isWave) hitbox += 150; // Massively wider hitbox for shockwave
                if (p.boomerang) hitbox += 30; // Slightly larger for axe

                if (Math.hypot(e.x - p.x, e.y - p.y) < hitbox) {
                    if (p.pierce) {
                        if (p.piercedEnemies.has(e)) continue;
                        p.piercedEnemies.add(e);
                    }
                    
                    e.hp -= p.damage;
                    e.hitTimer = 100;
                    lastHitter = p.heroOwner;
                    this.spawnParticles(p.x, p.y, p.color, 5);
                    this.spawnFloatingText(`-${p.damage}`, e.x, e.y - e.type.size, p.color, 14);
                    Audio.playHit();
                    
                    if (p.splash) {
                        this.triggerShake(p.splash/20, 200);
                        Audio.playExplosion();
                        this.spawnParticles(p.x, p.y, '#FF4500', p.splash/10);
                        this.enemies.forEach(e2 => {
                            if (e !== e2 && Math.hypot(e2.x - p.x, e2.y - p.y) < p.splash) {
                                e2.hp -= p.damage / 2;
                                e2.hitTimer = 100;
                                this.spawnFloatingText(`-${Math.floor(p.damage/2)}`, e2.x, e2.y - e2.type.size, '#FFA500', 12);
                                if(e2.hp <= 0 && lastHitter) {
                                    lastHitter.score += e2.type.reward * 10;
                                    lastHitter.gold += Math.floor(e2.type.reward * this.waveMultiplier); // Economy fix
                                }
                            }
                        });
                    }

                    if (!p.pierce) {
                        this.projectiles.splice(j, 1);
                    }
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
                if (Math.random() < 0.40) { // 提高爆率到40%，让场面更混乱
                    const itemTypes = Object.values(CONFIG.ITEMS);
                    this.items.push({
                        type: itemTypes[Math.floor(Math.random() * itemTypes.length)],
                        x: e.x, y: e.y, vy: 2
                    });
                }
                this.enemies.splice(i, 1);
            }
        }

        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            item.y += item.vy * (deltaTime / 16);
            
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
        const id = itemType.id;
        
        if (id === 'bomb') {
            this.triggerShake(15, 400);
            this.enemies.forEach(e => {
                e.hp -= 200;
                e.hitTimer = 100;
            });
            this.spawnFloatingText("全屏轰炸!", x, y, '#FF4500');
        } else if (id === 'freeze') {
            this.enemies.forEach(e => e.frozenTimer = 3000);
            this.spawnFloatingText("时间冻结!", x, y, '#00FFFF');
        } else if (id === 'heal') {
            if(heroOwner) heroOwner.gold += 150; 
            if (this.castleHp < this.maxCastleHp) this.castleHp++;
            this.spawnFloatingText("城墙修复!", x, y, '#32CD32');
        } else if (id === 'rapid' && heroOwner) {
            heroOwner.buffs.rapidTimer = 5000;
            this.spawnFloatingText("攻速拉满!", x, y, '#FF00FF');
        } else if (id === 'knockback') {
            this.enemies.forEach(e => e.y = Math.max(100, e.y - 150));
            this.spawnFloatingText("全体击退!", x, y, '#FFFFFF');
        } else if (id === 'rich' && heroOwner) {
            heroOwner.gold += 500;
            this.spawnFloatingText("+500G!", x, y, '#FFD700');
        } else if (id === 'multishot' && heroOwner) {
            heroOwner.buffs.multiTimer = 5000;
            this.spawnFloatingText("万箭齐发!", x, y, '#00FF00');
        } else if (id === 'poison' && heroOwner) {
            heroOwner.gold = Math.max(0, heroOwner.gold - 200);
            this.spawnFloatingText("毒酒扣钱!", x, y, '#8B0000');
        } else if (id === 'slow' && heroOwner) {
            heroOwner.buffs.slowTimer = 5000;
            this.spawnFloatingText("深陷泥沼!", x, y, '#808080');
        } else if (id === 'disarm' && heroOwner) {
            heroOwner.buffs.disarmTimer = 3000;
            this.spawnFloatingText("妖风大作!", x, y, '#000000');
        } else if (id === 'empty_city') {
            this.enemies.forEach(e => e.y = -50);
            this.spawnFloatingText("空城计!", x, y, '#DAA520');
        } else if (id === 'reverse') {
            this.reverseTimer = 3000;
            this.spawnFloatingText("反间计!", x, y, '#8A2BE2');
        } else if (id === 'giant' && heroOwner) {
            heroOwner.buffs.giantTimer = 5000;
            this.spawnFloatingText("武神附体!", x, y, '#FF4500');
        } else if (id === 'gamble') {
            if (Math.random() < 0.5) {
                this.castleHp = this.maxCastleHp;
                this.spawnFloatingText("七星续命!", x, y, '#FFD700');
            } else {
                this.castleHp = 1;
                this.spawnFloatingText("七星灯灭!", x, y, '#FF0000');
            }
        } else if (id === 'blind') {
            this.blindTimer = 5000;
            this.spawnFloatingText("大雾漫江!", x, y, '#2F4F4F');
        }
    }

    drawPixelText(ctx, text, x, y, size, color, align='center') {
        ctx.fillStyle = color;
        ctx.font = `bold ${size}px 'Courier New', Courier, monospace`;
        ctx.textAlign = align;
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.fillText(text, x, y);
        ctx.shadowColor = 'transparent';
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    }

    drawButton(ctx, x, y, w, h, text, color, fontSize=20) {
        ctx.fillStyle = '#111';
        ctx.fillRect(x+2, y+2, w, h);
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);
        
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x+2, y+2, w-4, h-4);

        ctx.textBaseline = 'middle';
        this.drawPixelText(ctx, text, x + w/2, y + h/2 + 2, fontSize, 'white', 'center');
        ctx.textBaseline = 'alphabetic';
    }

    render() {
        const ctx = this.renderer.ctx;
        ctx.save();

        if (this.screenShakeMagnitude > 0) {
            const dx = (Math.random() - 0.5) * this.screenShakeMagnitude;
            const dy = (Math.random() - 0.5) * this.screenShakeMagnitude;
            ctx.translate(dx, dy);
        }

        ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        ctx.textBaseline = 'alphabetic'; 
        
        const cx = CONFIG.CANVAS_WIDTH / 2;
        const cy = CONFIG.CANVAS_HEIGHT / 2;

        if (this.state !== 'playing') {
            ctx.restore();
            return;
        }

        ctx.fillStyle = '#2d4c1e'; 
        ctx.fillStyle = '#2d4c1e'; 
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        ctx.fillStyle = '#355E24';
        for(let i=0; i<300; i++) {
            let sx = (i * 137.5) % CONFIG.CANVAS_WIDTH;
            let sy = (i * 93.1) % CONFIG.CANVAS_HEIGHT;
            ctx.fillRect(sx, sy, 4, 12);
        }
        
        ctx.fillStyle = '#4a3b2c'; 
        let laneWidth = Math.min(80, (CONFIG.CANVAS_WIDTH / (this.numLanes + 1)) - 10);
        this.lanes.forEach(lane => {
            ctx.fillRect(lane - laneWidth/2, 110, laneWidth, CONFIG.CANVAS_HEIGHT);
        });

        const castleY = CONFIG.CANVAS_HEIGHT - 100;
        if (this.screenShakeMagnitude > 2 && this.castleHp < this.maxCastleHp) {
            ctx.fillStyle = '#8e3c3c';
        } else {
            ctx.fillStyle = '#5c5c5c'; 
        }
        ctx.fillRect(0, castleY, CONFIG.CANVAS_WIDTH, 100);
        for(let i=0; i<CONFIG.CANVAS_WIDTH; i+=60) {
            ctx.fillRect(i, castleY - 30, 40, 30);
            ctx.strokeStyle = '#222';
            ctx.lineWidth = 3;
            ctx.strokeRect(i, castleY - 30, 40, 30);
        }
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 3;
        for(let y = castleY; y < CONFIG.CANVAS_HEIGHT; y += 40) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CONFIG.CANVAS_WIDTH, y); ctx.stroke();
            let offset = (y % 80 === 0) ? 0 : 50;
            for(let x = offset; x < CONFIG.CANVAS_WIDTH; x += 100) {
                ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 40); ctx.stroke();
            }
        }
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
        ctx.fillStyle = '#111';
        for (let ix = gateX + 20; ix < gateX + gateWidth; ix += 30) {
            ctx.fillRect(ix, gateY + 30, 6, gateHeight - 30);
        }

        this.items.forEach(item => {
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.beginPath(); ctx.ellipse(item.x, item.y + 10, 15, 5, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = 'white'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.font = '24px Arial'; ctx.fillText(item.type.text, item.x, item.y);
        });
        ctx.textBaseline = 'alphabetic';

        this.enemies.forEach(e => {
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.beginPath(); ctx.ellipse(e.x, e.y + e.type.size*1.5, e.type.size, e.type.size*0.4, 0, 0, Math.PI*2); ctx.fill();
            
            const spriteId = e.type.id.toUpperCase();
            ctx.save();
            if (e.hitTimer > 0) {
                ctx.globalAlpha = 0.5;
                ctx.filter = 'brightness(200%)';
            }
            if (e.hitTimer > 0) {
                ctx.filter = 'brightness(200%)';
            }
            // Support exact boss sprite IDs
            const exactSprite = SPRITES[e.type.id.toUpperCase()];
            drawSprite(ctx, exactSprite || SPRITES[spriteId], e.x, e.y, e.type.size/4, null);
            ctx.restore();
            
            if (e.frozenTimer > 0) {
                ctx.fillStyle = 'rgba(173, 216, 230, 0.6)';
                ctx.fillRect(e.x - e.type.size, e.y - e.type.size, e.type.size*2, e.type.size*2);
            }
            
            // Redesigned Health Bar (Only visible when damaged)
            if (e.hp < e.maxHp) {
                const hpPercent = Math.max(0, e.hp) / e.maxHp;
                const barW = 32;
                const barH = 4;
                const barX = e.x - barW / 2;
                const barY = e.y - e.type.size*2 - 8;
                
                // Dark background
                ctx.fillStyle = '#222';
                ctx.fillRect(barX, barY, barW, barH);
                
                // Dynamic health color
                if (hpPercent > 0.5) ctx.fillStyle = '#00FF00';
                else if (hpPercent > 0.2) ctx.fillStyle = '#FFD700';
                else ctx.fillStyle = '#FF4500';
                
                ctx.fillRect(barX, barY, barW * hpPercent, barH);
                
                // Thin Gold Border
                ctx.strokeStyle = '#D4AF37';
                ctx.lineWidth = 1;
                ctx.strokeRect(barX - 1, barY - 1, barW + 2, barH + 2);
            }
        });

        this.heroes.forEach(hero => {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.beginPath(); ctx.ellipse(hero.x, hero.y + 25, 20, 8, 0, 0, Math.PI*2); ctx.fill();

            drawSprite(ctx, SPRITES.HERO, hero.x, hero.y, 4, hero.color);
            // Draw P1/P2/P3 text above head in their distinct color
            const pName = hero.name.split('(')[0];
            this.drawPixelText(ctx, pName, hero.x, hero.y - 35, 20, hero.color, 'center');
        });

        this.projectiles.forEach(p => {
            let size = (p.sprite === 'BOMB_WEAPON') ? 4 : (p.sprite === 'ROCK' || p.sprite === 'DRAGON' || p.sprite === 'SHOCKWAVE') ? 3 : 2;
            if (p.pScale) size *= p.pScale;
            ctx.save();
            ctx.translate(p.x, p.y);
            if (p.sprite === 'AXE') {
                p.rotation += 0.3;
                ctx.rotate(p.rotation);
            } else if (p.sprite === 'SWORD' || p.sprite === 'DRAGON') {
                ctx.rotate(Math.atan2(p.vy, p.vx) + Math.PI/2);
            }
            drawSprite(ctx, SPRITES[p.sprite] || SPRITES.ARROW, 0, 0, size, p.color);
            ctx.restore();
        });

        this.particles.forEach(pt => {
            ctx.fillStyle = pt.color;
            ctx.globalAlpha = pt.life;
            ctx.fillRect(pt.x, pt.y, 6, 6);
            ctx.globalAlpha = 1.0;
        });

        this.floatingTexts.forEach(ft => {
            ctx.globalAlpha = ft.life;
            this.drawPixelText(ctx, ft.text, ft.x, ft.y, ft.size || 16, ft.color, 'center');
            ctx.globalAlpha = 1.0;
        });

        ctx.restore();
    }
}

window.addEventListener('load', () => {
    new Game();
});

window.addEventListener('load', () => {
    new Game();
});
