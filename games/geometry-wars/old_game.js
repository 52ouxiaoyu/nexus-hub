const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const CANVAS_W = 800;
const CANVAS_H = 600;
canvas.width = CANVAS_W;
canvas.height = CANVAS_H;

// --- AUDIO SYSTEM (Web Audio API) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const audio = {
    playTone: (freq, type, duration, vol=0.1) => {
        if(audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(freq*0.5, audioCtx.currentTime + duration);
        gain.gain.setValueAtTime(vol, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    },
    shootPistol: () => audio.playTone(400, 'square', 0.1, 0.05),
    shootShotgun: () => audio.playTone(200, 'sawtooth', 0.2, 0.1),
    shootMachine: () => audio.playTone(500, 'square', 0.05, 0.03),
    shootLaser: () => audio.playTone(800, 'sine', 0.3, 0.05),
    zombieHit: () => audio.playTone(150, 'triangle', 0.1, 0.05),
    zombieDie: () => audio.playTone(100, 'sawtooth', 0.2, 0.1),
    levelUp: () => {
        audio.playTone(400, 'square', 0.1, 0.1);
        setTimeout(() => audio.playTone(600, 'square', 0.2, 0.1), 100);
        setTimeout(() => audio.playTone(800, 'square', 0.4, 0.1), 200);
    },
    playerHit: () => audio.playTone(150, 'sawtooth', 0.5, 0.2)
};

// --- GAME STATE ---
let gameState = 'START'; // START, PLAYING, GAME_OVER, PAUSED
let score = 0;
let highScore = parseInt(localStorage.getItem('zs_highscore') || '0');
let survivalTime = 0;
let killCount = 0;
let startTime = 0;
let lastTime = 0;

let player;
let zombies = [];
let bullets = [];
let particles = [];
let floatingTexts = [];

let spawnTimer = 0;
let spawnRate = 100; // frames
let frameCount = 0;

// Inputs
const keys = {
    ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
    KeyW: false, KeyS: false, KeyA: false, KeyD: false,
    Space: false
};

window.addEventListener('keydown', e => {
    if(keys.hasOwnProperty(e.code)) keys[e.code] = true;
    if(e.code === 'Space' && gameState === 'PLAYING') {
        player.shoot();
        e.preventDefault();
    }
});
window.addEventListener('keyup', e => {
    if(keys.hasOwnProperty(e.code)) keys[e.code] = false;
});

// UI Elements
document.getElementById('high-score').textContent = highScore;
document.getElementById('start-btn').onclick = startGame;
document.getElementById('restart-btn').onclick = startGame;
document.getElementById('pause-btn').onclick = togglePause;
document.getElementById('resume-btn').onclick = togglePause;

// --- CLASSES ---

class Player {
    constructor() {
        this.x = CANVAS_W / 2;
        this.y = CANVAS_H / 2;
        this.size = 20;
        this.speed = 5;
        this.color = '#00ffff';
        this.facing = {x: 1, y: 0}; // default facing right
        this.hp = 100;
        this.maxHp = 100;
        this.weaponLevel = 0;
        this.cooldown = 0;
        
        this.weapons = [
            { name: "双持手枪 Pistols", cd: 20, type: "pistol", req: 0 },
            { name: "重型霰弹枪 Shotgun", cd: 35, type: "shotgun", req: 20 },
            { name: "突击步枪 Rifle", cd: 8, type: "machinegun", req: 60 },
            { name: "等离子激光 Laser", cd: 2, type: "laser", req: 150 }
        ];
    }

    update() {
        // Movement
        let dx = 0; let dy = 0;
        if(keys.ArrowLeft || keys.KeyA) dx -= 1;
        if(keys.ArrowRight || keys.KeyD) dx += 1;
        // User requested left/right movement, but let's allow up/down so they don't get stuck easily
        if(keys.ArrowUp || keys.KeyW) dy -= 1;
        if(keys.ArrowDown || keys.KeyS) dy += 1;

        if(dx !== 0 || dy !== 0) {
            // Normalize
            const len = Math.hypot(dx, dy);
            dx /= len; dy /= len;
            this.x += dx * this.speed;
            this.y += dy * this.speed;
            this.facing = {x: dx, y: dy};
        }

        // Constrain
        this.x = Math.max(this.size, Math.min(CANVAS_W - this.size, this.x));
        this.y = Math.max(this.size, Math.min(CANVAS_H - this.size, this.y));

        if(this.cooldown > 0) this.cooldown--;

        // Weapon Upgrade Check
        let nextWep = this.weaponLevel + 1;
        if(nextWep < this.weapons.length && killCount >= this.weapons[nextWep].req) {
            this.weaponLevel = nextWep;
            audio.levelUp();
            document.getElementById('current-weapon').textContent = this.weapons[this.weaponLevel].name;
            addFloatingText(this.x, this.y - 30, "武器升级! UPGRADE!", "#00ff66");
            createParticles(this.x, this.y, '#00ff66', 30);
        }
        
        // Auto-shoot or Space-shoot
        // Space is handled in keydown for singles, but machinegun/laser needs holding
        if(keys.Space) {
            this.shoot();
        }
    }

    shoot() {
        if(this.cooldown > 0) return;
        const wep = this.weapons[this.weaponLevel];
        this.cooldown = wep.cd;

        const bx = this.x + this.facing.x * this.size;
        const by = this.y + this.facing.y * this.size;
        const angle = Math.atan2(this.facing.y, this.facing.x);

        if(wep.type === 'pistol') {
            audio.shootPistol();
            // Two parallel bullets
            const pX = Math.cos(angle + Math.PI/2) * 5;
            const pY = Math.sin(angle + Math.PI/2) * 5;
            bullets.push(new Bullet(bx + pX, by + pY, this.facing.x, this.facing.y, 10, 20, '#fff'));
            bullets.push(new Bullet(bx - pX, by - pY, this.facing.x, this.facing.y, 10, 20, '#fff'));
        } else if(wep.type === 'shotgun') {
            audio.shootShotgun();
            for(let i = -2; i <= 2; i++) {
                const a = angle + i * 0.2;
                bullets.push(new Bullet(bx, by, Math.cos(a), Math.sin(a), 12, 25, '#ffaa00'));
            }
            this.x -= this.facing.x * 5; // knockback
            this.y -= this.facing.y * 5;
        } else if(wep.type === 'machinegun') {
            audio.shootMachine();
            const a = angle + (Math.random() - 0.5) * 0.15;
            bullets.push(new Bullet(bx, by, Math.cos(a), Math.sin(a), 15, 15, '#ffff00'));
        } else if(wep.type === 'laser') {
            audio.shootLaser();
            bullets.push(new Bullet(bx, by, this.facing.x, this.facing.y, 25, 10, '#00ffff', true));
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Gun
        ctx.rotate(Math.atan2(this.facing.y, this.facing.x));
        ctx.fillStyle = '#aaa';
        ctx.fillRect(10, -5, 15, 10);
        
        ctx.restore();

        // HP Bar
        ctx.fillStyle = '#f00';
        ctx.fillRect(this.x - 20, this.y + 25, 40, 5);
        ctx.fillStyle = '#0f0';
        ctx.fillRect(this.x - 20, this.y + 25, 40 * (this.hp / this.maxHp), 5);
    }
}

class Bullet {
    constructor(x, y, dx, dy, speed, damage, color, pierce=false) {
        this.x = x; this.y = y;
        this.dx = dx; this.dy = dy;
        this.speed = speed;
        this.damage = damage;
        this.color = color;
        this.pierce = pierce;
        this.size = pierce ? 4 : 3;
        this.active = true;
    }
    update() {
        this.x += this.dx * this.speed;
        this.y += this.dy * this.speed;
        if(this.x < 0 || this.x > CANVAS_W || this.y < 0 || this.y > CANVAS_H) this.active = false;
    }
    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        if(this.pierce) {
            ctx.arc(this.x, this.y, this.size+2, 0, Math.PI*2);
        } else {
            ctx.arc(this.x, this.y, this.size, 0, Math.PI*2);
        }
        ctx.fill();
    }
}

class Zombie {
    constructor(isBoss = false) {
        this.isBoss = isBoss;
        
        // Spawn at edges
        const edge = Math.floor(Math.random() * 4);
        if(edge === 0) { this.x = Math.random() * CANVAS_W; this.y = -30; }
        else if(edge === 1) { this.x = CANVAS_W + 30; this.y = Math.random() * CANVAS_H; }
        else if(edge === 2) { this.x = Math.random() * CANVAS_W; this.y = CANVAS_H + 30; }
        else { this.x = -30; this.y = Math.random() * CANVAS_H; }

        this.size = isBoss ? 35 : 15 + Math.random() * 5;
        this.speed = isBoss ? 1.5 : 1 + Math.random() * 2 + (survivalTime / 60);
        this.hp = isBoss ? 1000 + survivalTime*10 : 20 + survivalTime;
        this.maxHp = this.hp;
        this.color = isBoss ? '#ff00ff' : '#00ff00';
        this.active = true;
        this.damage = isBoss ? 30 : 10;
        this.scoreVal = isBoss ? 500 : 10;
    }
    
    update() {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.hypot(dx, dy);
        
        if(dist > 0) {
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
        }

        // Collision with player
        if(dist < this.size + player.size) {
            player.hp -= this.damage;
            audio.playerHit();
            this.active = false;
            createParticles(this.x, this.y, '#ff0000', 10);
            if(player.hp <= 0) {
                gameOver();
            }
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.rect(this.x - this.size, this.y - this.size, this.size*2, this.size*2);
        ctx.fill();
        
        if(this.hp < this.maxHp) {
            ctx.fillStyle = '#f00';
            ctx.fillRect(this.x - this.size, this.y - this.size - 8, this.size*2, 4);
            ctx.fillStyle = '#0f0';
            ctx.fillRect(this.x - this.size, this.y - this.size - 8, this.size*2 * (this.hp/this.maxHp), 4);
        }
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 1;
        this.dx = Math.cos(angle) * speed;
        this.dy = Math.sin(angle) * speed;
        this.size = Math.random() * 3 + 1;
        this.life = 1.0;
        this.color = color;
    }
    update() {
        this.x += this.dx;
        this.y += this.dy;
        this.life -= 0.05;
    }
    draw(ctx) {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.globalAlpha = 1.0;
    }
}

function createParticles(x, y, color, count) {
    for(let i=0; i<count; i++) particles.push(new Particle(x, y, color));
}

function addFloatingText(x, y, text, color) {
    floatingTexts.push({x, y, text, color, life: 1.0});
}

// --- GAME LOOP ---

function startGame() {
    gameState = 'PLAYING';
    score = 0;
    killCount = 0;
    survivalTime = 0;
    startTime = Date.now();
    player = new Player();
    zombies = [];
    bullets = [];
    particles = [];
    floatingTexts = [];
    spawnRate = 100;
    frameCount = 0;

    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('pause-screen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('score').textContent = '0';
    document.getElementById('current-weapon').textContent = player.weapons[0].name;
    document.getElementById('new-high').classList.add('hidden');

    requestAnimationFrame(gameLoop);
}

function togglePause() {
    if(gameState === 'PLAYING') {
        gameState = 'PAUSED';
        document.getElementById('pause-screen').classList.remove('hidden');
    } else if(gameState === 'PAUSED') {
        gameState = 'PLAYING';
        document.getElementById('pause-screen').classList.add('hidden');
        lastTime = performance.now();
        requestAnimationFrame(gameLoop);
    }
}

function gameOver() {
    gameState = 'GAME_OVER';
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('game-over-screen').classList.remove('hidden');
    document.getElementById('final-score').textContent = score;
    document.getElementById('survival-time').textContent = survivalTime;
    document.getElementById('kill-count').textContent = killCount;
    
    if(score > highScore) {
        highScore = score;
        localStorage.setItem('zs_highscore', highScore);
        document.getElementById('high-score').textContent = highScore;
        document.getElementById('new-high').classList.remove('hidden');
    }
}

function update() {
    if(gameState !== 'PLAYING') return;
    frameCount++;

    // Time
    survivalTime = Math.floor((Date.now() - startTime) / 1000);

    player.update();

    // Spawning
    if(frameCount % Math.max(20, spawnRate) === 0) {
        zombies.push(new Zombie());
    }
    // Boss spawn every 30 seconds
    if(frameCount % 1800 === 0) {
        zombies.push(new Zombie(true));
        addFloatingText(CANVAS_W/2, CANVAS_H/2, "⚠️ BOSS 出现 ⚠️", "#ff00ff");
    }

    // Difficulty increase
    if(frameCount % 600 === 0) {
        spawnRate = Math.max(15, spawnRate - 5);
    }

    bullets.forEach(b => b.update());
    zombies.forEach(z => z.update());
    particles.forEach(p => p.update());
    floatingTexts.forEach(ft => { ft.y -= 1; ft.life -= 0.02; });

    // Collisions
    for(let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        if(!b.active) continue;
        for(let j = zombies.length - 1; j >= 0; j--) {
            const z = zombies[j];
            if(!z.active) continue;
            
            const dist = Math.hypot(b.x - z.x, b.y - z.y);
            if(dist < z.size + b.size) {
                z.hp -= b.damage;
                if(!b.pierce) b.active = false;
                createParticles(b.x, b.y, '#fff', 3);
                
                if(z.hp <= 0) {
                    z.active = false;
                    score += z.scoreVal;
                    killCount++;
                    document.getElementById('score').textContent = score;
                    createParticles(z.x, z.y, z.color, 15);
                    audio.zombieDie();
                    if(z.isBoss) {
                        addFloatingText(z.x, z.y, `+${z.scoreVal} BOSS击杀!`, '#ff00ff');
                    } else if(Math.random() < 0.1) {
                        addFloatingText(z.x, z.y, `+${z.scoreVal}`, '#0f0');
                    }
                } else {
                    audio.zombieHit();
                }
                if(!b.pierce) break;
            }
        }
    }

    // Cleanup
    bullets = bullets.filter(b => b.active);
    zombies = zombies.filter(z => z.active);
    particles = particles.filter(p => p.life > 0);
    floatingTexts = floatingTexts.filter(ft => ft.life > 0);
}

function draw() {
    // Clear background
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Draw Grid
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    for(let i=0; i<CANVAS_W; i+=40) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,CANVAS_H); ctx.stroke(); }
    for(let i=0; i<CANVAS_H; i+=40) { ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(CANVAS_W,i); ctx.stroke(); }

    particles.forEach(p => p.draw(ctx));
    bullets.forEach(b => b.draw(ctx));
    zombies.forEach(z => z.draw(ctx));
    if(player) player.draw(ctx);

    floatingTexts.forEach(ft => {
        ctx.globalAlpha = Math.max(0, ft.life);
        ctx.fillStyle = ft.color;
        ctx.font = 'bold 20px "ZCOOL KuaiLe"';
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.globalAlpha = 1.0;
    });
}

function gameLoop(timestamp) {
    if(gameState !== 'PLAYING') return;
    
    // Fixed time step for logic if needed, but simple update works for standard 60fps
    update();
    draw();
    
    requestAnimationFrame(gameLoop);
}

// Initial draw
ctx.fillStyle = '#111';
ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
