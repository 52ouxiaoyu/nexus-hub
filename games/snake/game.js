// === SERPENT - Neon Arcade Snake Game v3.0 ===

// Audio Engine with BGM
class AudioEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.bgmGain = null;
        this.bgmPlaying = false;
        this.soundEnabled = true;
        this.musicEnabled = true;
    }

    init() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.3;
            this.masterGain.connect(this.ctx.destination);
            this.bgmGain = this.ctx.createGain();
            this.bgmGain.gain.value = 0.15;
            this.bgmGain.connect(this.masterGain);
        } catch (e) {}
    }

    play(type, freq = 440, duration = 0.1, volume = 0.15) {
        if (!this.soundEnabled || !this.ctx) return;
        try {
            if (this.ctx.state === 'suspended') this.ctx.resume();
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.frequency.value = freq;
            osc.type = type;
            gain.gain.setValueAtTime(volume, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
            osc.start(this.ctx.currentTime);
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {}
    }

    playSequence(notes, interval = 80) {
        notes.forEach((note, i) => {
            setTimeout(() => this.play(note.type, note.freq, note.duration || 0.1, note.volume || 0.1), i * interval);
        });
    }

    startBGM() {
        if (!this.musicEnabled || !this.ctx || this.bgmPlaying) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        
        this.bgmPlaying = true;
        const playLoop = () => {
            if (!this.bgmPlaying || !this.musicEnabled) return;
            
            const melody = [
                { freq: 262, dur: 0.2 }, { freq: 294, dur: 0.2 },
                { freq: 330, dur: 0.2 }, { freq: 262, dur: 0.2 },
                { freq: 330, dur: 0.2 }, { freq: 349, dur: 0.2 },
                { freq: 392, dur: 0.4 },
                { freq: 392, dur: 0.1 }, { freq: 440, dur: 0.1 },
                { freq: 392, dur: 0.1 }, { freq: 349, dur: 0.1 },
                { freq: 330, dur: 0.2 }, { freq: 262, dur: 0.2 },
            ];

            let time = 0;
            melody.forEach(note => {
                setTimeout(() => {
                    if (this.bgmPlaying && this.musicEnabled) {
                        this.play('square', note.freq, note.dur, 0.05);
                    }
                }, time * 1000);
                time += note.dur;
            });

            setTimeout(playLoop, time * 1000);
        };
        playLoop();
    }

    stopBGM() {
        this.bgmPlaying = false;
    }

    eat() {
        if (!this.soundEnabled) return;
        this.play('square', 880, 0.06);
        setTimeout(() => this.play('square', 1100, 0.06), 40);
    }

    eatSpecial() {
        if (!this.soundEnabled) return;
        this.playSequence([
            { type: 'sine', freq: 523, duration: 0.08 },
            { type: 'sine', freq: 659, duration: 0.08 },
            { type: 'sine', freq: 784, duration: 0.12 },
        ], 60);
    }

    powerup() {
        if (!this.soundEnabled) return;
        this.playSequence([
            { type: 'sine', freq: 523, duration: 0.1 },
            { type: 'sine', freq: 659, duration: 0.1 },
            { type: 'sine', freq: 784, duration: 0.15 },
            { type: 'sine', freq: 1047, duration: 0.2 },
        ], 70);
    }

    die() {
        if (!this.soundEnabled) return;
        this.play('sawtooth', 200, 0.3);
        setTimeout(() => this.play('sawtooth', 150, 0.3), 150);
        setTimeout(() => this.play('sawtooth', 100, 0.4), 300);
    }

    combo() {
        if (!this.soundEnabled) return;
        this.play('sine', 660, 0.04, 0.08);
        this.play('sine', 880, 0.04, 0.08);
    }

    comboHigh() {
        if (!this.soundEnabled) return;
        this.playSequence([
            { type: 'sine', freq: 880, duration: 0.05, volume: 0.12 },
            { type: 'sine', freq: 1100, duration: 0.05, volume: 0.12 },
            { type: 'sine', freq: 1320, duration: 0.08, volume: 0.12 },
        ], 40);
    }

    boost() {
        if (!this.soundEnabled) return;
        this.play('square', 330, 0.05, 0.08);
        this.play('square', 440, 0.05, 0.08);
    }

    levelUp() {
        if (!this.soundEnabled) return;
        this.playSequence([
            { type: 'sine', freq: 440, duration: 0.1 },
            { type: 'sine', freq: 554, duration: 0.1 },
            { type: 'sine', freq: 659, duration: 0.1 },
            { type: 'sine', freq: 880, duration: 0.15 },
        ], 80);
    }

    frenzy() {
        if (!this.soundEnabled) return;
        this.playSequence([
            { type: 'square', freq: 660, duration: 0.08, volume: 0.12 },
            { type: 'square', freq: 880, duration: 0.08, volume: 0.12 },
            { type: 'square', freq: 1100, duration: 0.08, volume: 0.12 },
            { type: 'square', freq: 880, duration: 0.08, volume: 0.12 },
        ], 60);
    }

    achievement() {
        if (!this.soundEnabled) return;
        this.playSequence([
            { type: 'sine', freq: 523, duration: 0.15, volume: 0.15 },
            { type: 'sine', freq: 659, duration: 0.15, volume: 0.15 },
            { type: 'sine', freq: 784, duration: 0.15, volume: 0.15 },
            { type: 'sine', freq: 1047, duration: 0.3, volume: 0.18 },
        ], 100);
    }

    countdown() {
        if (!this.soundEnabled) return;
        this.play('square', 440, 0.1, 0.1);
    }

    countdownGo() {
        if (!this.soundEnabled) return;
        this.play('square', 880, 0.2, 0.15);
    }

    eatEnemy() {
        if (!this.soundEnabled) return;
        this.playSequence([
            { type: 'square', freq: 523, duration: 0.1, volume: 0.12 },
            { type: 'square', freq: 659, duration: 0.1, volume: 0.12 },
            { type: 'square', freq: 784, duration: 0.15, volume: 0.15 },
            { type: 'square', freq: 1047, duration: 0.2, volume: 0.18 },
        ], 60);
    }

    tick() {
        if (!this.soundEnabled) return;
        this.play('sine', 800, 0.02, 0.03);
    }
}

// Floating Text Class
class FloatingText {
    constructor(x, y, text, color, size = 16) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.size = size;
        this.life = 60;
        this.maxLife = 60;
        this.vy = -2;
    }

    update() {
        this.y += this.vy;
        this.vy *= 0.95;
        this.life--;
    }

    draw(ctx) {
        const alpha = this.life / this.maxLife;
        const scale = 1 + (1 - alpha) * 0.3;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.font = `bold ${this.size * scale}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }

    isDead() {
        return this.life <= 0;
    }
}

// AI Snake Class
class AISnake {
    constructor(x, y, color, speed) {
        this.segments = [];
        for (let i = 0; i < 5; i++) {
            this.segments.push({ x: x - i, y: y });
        }
        this.dir = { x: 1, y: 0 };
        this.color = color;
        this.speed = speed;
        this.moveTimer = 0;
        this.alive = true;
        this.changeTimer = 0;
        this.hitWall = false;
        this.stunned = false;
        this.patrolDir = { x: 1, y: 0 }; // 巡逻方向
        this.patrolTimer = 0;
    }

    update(dt, snakeHead, foods, walls) {
        if (!this.alive || this.stunned) return;

        this.moveTimer += dt;
        this.changeTimer += dt;
        this.patrolTimer += dt;

        if (this.changeTimer > 400) {
            this.changeTimer = 0;
            this.changeDirection(snakeHead, foods, walls);
        }

        // 巡逻模式：定期改变方向
        if (this.patrolTimer > 2000) {
            this.patrolTimer = 0;
            this.patrolDir = { x: (Math.random() - 0.5) * 2 | 0, y: (Math.random() - 0.5) * 2 | 0 };
            if (this.patrolDir.x === 0 && this.patrolDir.y === 0) {
                this.patrolDir = { x: 1, y: 0 };
            }
        }

        if (this.moveTimer < this.speed) return;
        this.moveTimer = 0;

        const head = this.segments[0];
        const newHead = {
            x: head.x + this.dir.x,
            y: head.y + this.dir.y
        };

        newHead.x = (newHead.x + GRID_W) % GRID_W;
        newHead.y = (newHead.y + GRID_H) % GRID_H;

        // 检查撞墙
        if (walls.some(w => w.x === newHead.x && w.y === newHead.y)) {
            this.hitWall = true;
            this.changeDirection(snakeHead, foods, walls);
            return;
        }

        if (this.segments.some((s, i) => i > 0 && s.x === newHead.x && s.y === newHead.y)) {
            this.respawn();
            return;
        }

        this.segments.unshift(newHead);

        let ate = false;
        for (let i = foods.length - 1; i >= 0; i--) {
            if (foods[i].x === newHead.x && foods[i].y === newHead.y) {
                ate = true;
                break;
            }
        }

        if (!ate) {
            this.segments.pop();
        }
    }

    changeDirection(target, foods, walls) {
        let bestDir = this.dir;
        let bestScore = -Infinity;

        const dirs = [
            { x: 0, y: -1 },
            { x: 0, y: 1 },
            { x: -1, y: 0 },
            { x: 1, y: 0 }
        ];

        // AI行为模式：根据距离选择策略
        const distToPlayer = Math.abs(this.segments[0].x - target.x) + Math.abs(this.segments[0].y - target.y);
        
        for (const d of dirs) {
            if (d.x === -this.dir.x && d.y === -this.dir.y) continue;

            const testX = this.segments[0].x + d.x;
            const testY = this.segments[0].y + d.y;

            if (walls.some(w => w.x === testX && w.y === testY)) continue;
            if (this.segments.some(s => s.x === testX && s.y === testY)) continue;

            let score = 0;
            const testDist = Math.abs(testX - target.x) + Math.abs(testY - target.y);

            // 策略1：保持安全距离（不要太近也不要太远）
            if (distToPlayer < 5) {
                // 太近了，逃跑
                score += testDist * 3;
            } else if (distToPlayer > 10) {
                // 太远了，靠近
                score -= testDist * 2;
            } else {
                // 理想距离，巡逻
                score += Math.random() * 5;
            }

            // 策略2：优先吃食物
            for (const food of foods) {
                const distToFood = Math.abs(testX - food.x) + Math.abs(testY - food.y);
                if (distToFood < 5) {
                    score -= distToFood * 2;
                }
            }

            // 策略3：避免撞墙（更智能的避墙）
            const wallAhead = walls.some(w => w.x === testX + d.x * 2 && w.y === testY + d.y * 2);
            if (wallAhead) {
                score -= 15;
            }

            // 策略4：避免撞到自己
            const selfAhead = this.segments.some((s, i) => i < 3 && s.x === testX + d.x && s.y === testY + d.y);
            if (selfAhead) {
                score -= 20;
            }

            // 加入一些随机性让AI不那么死板
            score += (Math.random() - 0.5) * 8;

            if (score > bestScore) {
                bestScore = score;
                bestDir = d;
            }
        }

        this.dir = bestDir;
    }

    respawn() {
        this.segments = [];
        const x = Math.floor(Math.random() * (GRID_W - 4)) + 2;
        const y = Math.floor(Math.random() * (GRID_H - 4)) + 2;
        for (let i = 0; i < 5; i++) {
            this.segments.push({ x: x - i, y: y });
        }
        this.dir = { x: 1, y: 0 };
    }

    draw(ctx) {
        if (!this.alive) return;

        this.segments.forEach((seg, i) => {
            const x = seg.x * TILE_SIZE;
            const y = seg.y * TILE_SIZE;
            const isHead = i === 0;
            const progress = i / this.segments.length;

            ctx.save();

            if (isHead) {
                ctx.shadowColor = this.color;
                ctx.shadowBlur = 15;
            }

            const alpha = 0.9 - progress * 0.3;
            ctx.fillStyle = this.color;
            ctx.globalAlpha = alpha;

            if (isHead) {
                ctx.beginPath();
                ctx.roundRect(x + 3, y + 3, TILE_SIZE - 6, TILE_SIZE - 6, 6);
                ctx.fill();

                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(x + 10 + this.dir.x * 4, y + 12, 3, 0, Math.PI * 2);
                ctx.arc(x + 22 + this.dir.x * 4, y + 12, 3, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#000';
                ctx.beginPath();
                ctx.arc(x + 10 + this.dir.x * 5, y + 12, 1.5, 0, Math.PI * 2);
                ctx.arc(x + 22 + this.dir.x * 5, y + 12, 1.5, 0, Math.PI * 2);
                ctx.fill();
            } else {
                const shrink = 3 + progress * 4;
                ctx.beginPath();
                ctx.roundRect(x + shrink, y + shrink, TILE_SIZE - shrink * 2, TILE_SIZE - shrink * 2, 4);
                ctx.fill();
            }

            ctx.restore();
        });
    }

    checkCollisionWithSnake(playerSnake) {
        if (!this.alive) return false;
        const head = this.segments[0];
        return playerSnake.some((s, i) => i > 0 && s.x === head.x && s.y === head.y);
    }

    checkPlayerEating(playerHead) {
        if (!this.alive) return false;
        return this.segments.some(s => s.x === playerHead.x && s.y === playerHead.y);
    }
}

// Achievement System
const ACHIEVEMENTS = {
    firstBlood: { name: 'First Blood', desc: '吃第一个食物', icon: '🍎' },
    combo5: { name: 'Combo King', desc: '达成5连击', icon: '🔥' },
    combo10: { name: 'Combo Master', desc: '达成10连击', icon: '💥' },
    score100: { name: 'Century', desc: '得分超过100', icon: '💯' },
    score500: { name: 'High Roller', desc: '得分超过500', icon: '🎰' },
    score1000: { name: 'Grand Master', desc: '得分超过1000', icon: '👑' },
    length20: { name: 'Long Snake', desc: '蛇长达到20', icon: '🐍' },
    length50: { name: 'Mega Snake', desc: '蛇长达到50', icon: '🐉' },
    level5: { name: 'Explorer', desc: '到达第5关', icon: '🗺️' },
    level10: { name: 'Veteran', desc: '到达第10关', icon: '🎖️' },
    noDeath100: { name: 'Untouchable', desc: '存活100秒无死亡', icon: '🛡️' },
    allEffects: { name: 'Powerhoarder', desc: '使用所有特殊效果', icon: '⚡' },
    ghostMaster: { name: 'Ghost Rider', desc: '穿墙5次', icon: '👻' },
    shieldMaster: { name: 'Shield Bearer', desc: '护盾抵挡5次', icon: '🛡️' },
    killEnemy: { name: 'Slayer', desc: '消灭敌人蛇', icon: '⚔️' },
    timeAttack: { name: 'Speed Demon', desc: '计时模式得分200+', icon: '⏱️' },
};

// Particle System
class Particle {
    constructor(x, y, color, vx, vy, life, size = 3) {
        this.x = x; this.y = y;
        this.color = color;
        this.vx = vx; this.vy = vy;
        this.life = life;
        this.maxLife = life;
        this.size = size;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
        this.vy += 0.05;
        this.vx *= 0.99;
        this.size = (this.life / this.maxLife) * this.size;
    }

    draw(ctx) {
        ctx.globalAlpha = this.life / this.maxLife;
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(this.x, this.y, Math.max(0.5, this.size), 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    }
}

// Death Animation
class DeathAnimation {
    constructor(x, y, color, segments) {
        this.particles = [];
        this.done = false;
        this.life = 60;

        segments.forEach((seg) => {
            const px = seg.x * TILE_SIZE + TILE_SIZE / 2;
            const py = seg.y * TILE_SIZE + TILE_SIZE / 2;
            for (let j = 0; j < 8; j++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 2 + Math.random() * 4;
                this.particles.push(new Particle(
                    px, py, color,
                    Math.cos(angle) * speed,
                    Math.sin(angle) * speed,
                    30 + Math.random() * 30,
                    2 + Math.random() * 3
                ));
            }
        });
    }

    update() {
        this.life--;
        this.particles = this.particles.filter(p => p.life > 0);
        this.particles.forEach(p => p.update());
        if (this.life <= 0 && this.particles.length === 0) {
            this.done = true;
        }
    }

    draw(ctx) {
        this.particles.forEach(p => p.draw(ctx));
    }
}

// Game Constants
const TILE_SIZE = 32;
const GRID_W = 25;
const GRID_H = 20;
const CANVAS_W = TILE_SIZE * GRID_W;
const CANVAS_H = TILE_SIZE * GRID_H;

const FOOD_TYPES = {
    normal:    { color: '#00ff66', points: 10, effect: null, chance: 0.55, icon: '' },
    speed:     { color: '#ffaa00', points: 15, effect: 'speed', chance: 0.1, icon: '⚡' },
    slow:      { color: '#66aaff', points: 15, effect: 'slow', chance: 0.08, icon: '❄️' },
    double:    { color: '#ff44ff', points: 20, effect: 'double', chance: 0.08, icon: '×2' },
    magnet:    { color: '#ff6600', points: 12, effect: 'magnet', chance: 0.06, icon: '🧲' },
    ghost:     { color: '#aaaaff', points: 25, effect: 'ghost', chance: 0.04, icon: '👻' },
    shrink:    { color: '#ff4444', points: 30, effect: 'shrink', chance: 0.025, icon: '✂️' },
    shield:    { color: '#ffff00', points: 20, effect: 'shield', chance: 0.025, icon: '🛡️' },
    frenzy:    { color: '#ff00ff', points: 50, effect: 'frenzy', chance: 0.015, icon: '🔥' },
    teleport:  { color: '#00ffff', points: 20, effect: 'teleport', chance: 0.01, icon: '🌀' },
};

const DIFFICULTY = {
    easy:   { baseSpeed: 140, speedIncrease: 2, maxSpeed: 60, lives: 1 },
    normal: { baseSpeed: 100, speedIncrease: 3, maxSpeed: 45, lives: 1 },
    hard:   { baseSpeed: 65, speedIncrease: 4, maxSpeed: 30, lives: 1 },
};

// Game State
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const audio = new AudioEngine();

let gameState = 'menu';
let score = 0;
let highScore = parseInt(localStorage.getItem('snakeHighScore') || '0');
let lives = 3;
let level = 1;
let combo = 0;
let comboTimer = 0;
let maxCombo = 0;
let difficulty = 'easy';
let gameMode = 'classic';

let snake = [];
let snakeDir = { x: 1, y: 0 };
let snakeNextDir = { x: 1, y: 0 };
let snakeSpeed = 100;
let baseSpeed = 100;
let moveTimer = 0;
let boostActive = false;
let canBoost = true;
let boostCooldownTimer = 0;

let foods = [];
let walls = [];
let particles = [];
let floatingTexts = [];
let deathAnimations = [];
let screenShake = 0;

let activeShield = false;
let activeGhost = false;
let activeMagnet = false;
let activeDouble = false;
let activeFrenzy = false;

let frenzyTimer = 0;
let survivalTime = 0;
let ghostWallCount = 0;
let shieldBlockCount = 0;
let effectsUsed = new Set();

let lastTime = 0;
let animationFrame = 0;
let countdownValue = 0;
let countdownTimer = 0;

let unlockedAchievements = JSON.parse(localStorage.getItem('snakeAchievements') || '{}');

let enemySnake = null;
let enemyEnabled = false;
let enemyKillCount = 0;

let timeAttackMode = false;
let timeAttackTimer = 60;
let timeAttackActive = false;

let leaderboard = JSON.parse(localStorage.getItem('snakeLeaderboard') || '[]');
let stats = JSON.parse(localStorage.getItem('snakeStats') || '{"gamesPlayed":0,"totalScore":0,"totalFood":0,"totalTime":0,"bestCombo":0,"enemiesKilled":0}');

// Initialize
function init() {
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    document.getElementById('high-score').textContent = String(highScore).padStart(5, '0');

    document.getElementById('start-btn').addEventListener('click', startCountdown);
    document.getElementById('restart-btn').addEventListener('click', startCountdown);
    document.getElementById('menu-btn').addEventListener('click', showMenu);
    document.getElementById('resume-btn').addEventListener('click', togglePause);
    document.getElementById('pause-btn').addEventListener('click', togglePause);
    document.getElementById('stats-btn').addEventListener('click', showStats);
    document.getElementById('close-stats-btn').addEventListener('click', hideStats);
    document.getElementById('sound-btn').addEventListener('click', toggleSound);
    document.getElementById('music-btn').addEventListener('click', toggleMusic);

    document.querySelectorAll('.diff-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            difficulty = btn.dataset.diff;
        });
    });

    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            gameMode = btn.dataset.mode;
            enemyEnabled = (gameMode === 'battle');
            timeAttackMode = (gameMode === 'timeattack');
        });
    });

    document.addEventListener('keydown', handleKey);
    setupTouchControls();

    audio.init();
    updateSoundButtons();
    requestAnimationFrame(gameLoop);
}

function setupTouchControls() {
    const dpadBtns = document.querySelectorAll('.dpad-btn');
    const boostBtn = document.getElementById('touch-boost');
    const dirMap = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };

    dpadBtns.forEach(btn => {
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const d = dirMap[btn.dataset.dir];
            if (d) setDirection(d.x, d.y);
        });
    });

    if (boostBtn) {
        boostBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (canBoost && !boostActive && gameState === 'playing') {
                activateBoost();
            }
        });
    }
}

function handleKey(e) {
    const key = e.key.toLowerCase();

    if (gameState === 'menu') {
        if (key === 'enter' || key === ' ') startCountdown();
        return;
    }

    if (key === 'p' || key === 'escape') {
        if (gameState === 'playing' || gameState === 'paused') {
            togglePause();
        }
        return;
    }

    if (gameState !== 'playing') return;

    switch (key) {
        case 'w': case 'arrowup':    setDirection(0, -1); break;
        case 's': case 'arrowdown':  setDirection(0, 1); break;
        case 'a': case 'arrowleft':  setDirection(-1, 0); break;
        case 'd': case 'arrowright': setDirection(1, 0); break;
        case ' ':
            if (canBoost && !boostActive) activateBoost();
            e.preventDefault();
            break;
    }
}

function setDirection(x, y) {
    if (snakeDir.x === -x && snakeDir.y === -y) return;
    snakeNextDir = { x, y };
}

function activateBoost() {
    boostActive = true;
    canBoost = false;
    snakeSpeed = Math.max(25, baseSpeed / 3);
    audio.boost();
    spawnParticles(snake[0].x * TILE_SIZE + TILE_SIZE / 2, snake[0].y * TILE_SIZE + TILE_SIZE / 2, '#ffaa00', 8);
    setTimeout(() => {
        boostActive = false;
        snakeSpeed = baseSpeed;
        boostCooldownTimer = 120;
    }, 1500);
}

function startCountdown() {
    audio.init();
    gameState = 'countdown';
    countdownValue = 3;
    countdownTimer = 0;

    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');

    if (timeAttackMode) {
        document.getElementById('time-attack').classList.remove('hidden');
    } else {
        document.getElementById('time-attack').classList.add('hidden');
    }

    resetGame();
    audio.countdown();
}

function resetGame() {
    score = 0;
    lives = DIFFICULTY[difficulty].lives;
    combo = 0;
    comboTimer = 0;
    maxCombo = 0;
    survivalTime = 0;
    ghostWallCount = 0;
    shieldBlockCount = 0;
    effectsUsed = new Set();
    enemyKillCount = 0;

    snakeSpeed = DIFFICULTY[difficulty].baseSpeed;
    baseSpeed = snakeSpeed;
    boostActive = false;
    canBoost = true;
    boostCooldownTimer = 0;

    const startX = Math.floor(GRID_W / 2);
    const startY = Math.floor(GRID_H / 2);
    snake = [];
    for (let i = 0; i < 4; i++) {
        snake.push({ x: startX - i, y: startY });
    }
    snakeDir = { x: 1, y: 0 };
    snakeNextDir = { x: 1, y: 0 };

    foods = [];
    walls = [];
    particles = [];
    floatingTexts = [];
    deathAnimations = [];
    activeShield = false;
    activeGhost = false;
    activeMagnet = false;
    activeDouble = false;
    activeFrenzy = false;
    frenzyTimer = 0;

    if (enemyEnabled) {
        enemySnake = new AISnake(5, 5, '#ff0044', 120);
    } else {
        enemySnake = null;
    }

    if (timeAttackMode) {
        timeAttackTimer = 60;
        timeAttackActive = true;
    } else {
        timeAttackActive = false;
    }

    generateWalls();
    updateHUD();
}

function startGame() {
    gameState = 'playing';
    spawnFood();
    spawnFood();
    audio.startBGM();
    
    // 显示模式提示
    const modeHint = document.getElementById('mode-hint');
    if (gameMode === 'walls') {
        modeHint.textContent = '收集墙壁旁的能量球获得加分 Collect energy balls near walls';
        modeHint.classList.remove('hidden');
    } else if (gameMode === 'maze') {
        modeHint.textContent = '寻找迷宫中的宝藏获得奖励 Find treasures in the maze';
        modeHint.classList.remove('hidden');
    } else if (gameMode === 'battle') {
        modeHint.textContent = '引诱AI撞墙可获得额外分数 Lure AI into walls for bonus points';
        modeHint.classList.remove('hidden');
    } else {
        modeHint.classList.add('hidden');
    }
}

function showMenu() {
    gameState = 'menu';
    audio.stopBGM();
    document.getElementById('start-screen').classList.remove('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('hud').classList.add('hidden');
}

function togglePause() {
    if (gameState === 'playing') {
        gameState = 'paused';
        audio.stopBGM();
        document.getElementById('pause-screen').classList.remove('hidden');
    } else if (gameState === 'paused') {
        gameState = 'playing';
        audio.startBGM();
        document.getElementById('pause-screen').classList.add('hidden');
    }
}

function showStats() {
    document.getElementById('stats-screen').classList.remove('hidden');
    document.getElementById('stats-games').textContent = stats.gamesPlayed;
    document.getElementById('stats-score').textContent = stats.totalScore;
    document.getElementById('stats-food').textContent = stats.totalFood;
    document.getElementById('stats-time').textContent = Math.floor(stats.totalTime) + 's';
    document.getElementById('stats-combo').textContent = stats.bestCombo;
    document.getElementById('stats-enemies').textContent = stats.enemiesKilled;

    const lbList = document.getElementById('leaderboard-list');
    lbList.innerHTML = '';
    leaderboard.slice(0, 10).forEach((entry, i) => {
        const li = document.createElement('li');
        li.innerHTML = `<span class="lb-rank">${i + 1}</span><span class="lb-score">${entry.score}</span><span class="lb-mode">${entry.mode}</span>`;
        lbList.appendChild(li);
    });
}

function hideStats() {
    document.getElementById('stats-screen').classList.add('hidden');
}

function toggleSound() {
    audio.soundEnabled = !audio.soundEnabled;
    updateSoundButtons();
}

function toggleMusic() {
    audio.musicEnabled = !audio.musicEnabled;
    if (audio.musicEnabled && gameState === 'playing') {
        audio.startBGM();
    } else {
        audio.stopBGM();
    }
    updateSoundButtons();
}

function updateSoundButtons() {
    const soundBtn = document.getElementById('sound-btn');
    const musicBtn = document.getElementById('music-btn');
    if (soundBtn) soundBtn.textContent = audio.soundEnabled ? '🔊' : '🔇';
    if (musicBtn) musicBtn.textContent = audio.musicEnabled ? '🎵' : '🎶';
}

function gameOver() {
    gameState = 'gameover';
    audio.stopBGM();
    audio.die();
    screenShake = 8;

    stats.gamesPlayed++;
    stats.totalScore += score;
    stats.totalTime += survivalTime;
    if (combo > stats.bestCombo) stats.bestCombo = combo;
    stats.enemiesKilled += enemyKillCount;
    localStorage.setItem('snakeStats', JSON.stringify(stats));

    if (score > 0) {
        leaderboard.push({ score, mode: gameMode, difficulty, date: Date.now() });
        leaderboard.sort((a, b) => b.score - a.score);
        leaderboard = leaderboard.slice(0, 10);
        localStorage.setItem('snakeLeaderboard', JSON.stringify(leaderboard));
    }

    if (score > highScore) {
        highScore = score;
        localStorage.setItem('snakeHighScore', highScore.toString());
        document.getElementById('new-high').classList.remove('hidden');
    } else {
        document.getElementById('new-high').classList.add('hidden');
    }

    document.getElementById('final-score').textContent = `得分 Score: ${score}`;
    document.getElementById('survival-time').textContent = Math.floor(survivalTime);
    document.getElementById('max-combo').textContent = maxCombo;
    document.getElementById('high-score').textContent = String(highScore).padStart(5, '0');
    document.getElementById('game-over-screen').classList.remove('hidden');
    document.getElementById('hud').classList.add('hidden');

    saveAchievements();
}

// Energy Orbs and Treasures
let energyOrbs = [];
let treasures = [];

// Level Generation
function generateWalls() {
    walls = [];
    energyOrbs = [];
    treasures = [];
    
    if (gameMode === 'classic' || gameMode === 'battle' || gameMode === 'timeattack') return;

    const rng = mulberry32(level * 7919 + 12345);

    if (gameMode === 'walls') {
        // 能量墙壁模式：墙壁较少但有能量球
        const count = 2 + Math.floor(level / 3);
        for (let i = 0; i < count; i++) {
            const x = Math.floor(rng() * (GRID_W - 8)) + 4;
            const y = Math.floor(rng() * (GRID_H - 8)) + 4;
            const horizontal = rng() > 0.5;
            const len = 2 + Math.floor(rng() * 3);
            for (let j = 0; j < len; j++) {
                const wx = horizontal ? x + j : x;
                const wy = horizontal ? y : y + j;
                if (wx >= 3 && wx < GRID_W - 3 && wy >= 3 && wy < GRID_H - 3) {
                    walls.push({ x: wx, y: wy, hasEnergy: rng() < 0.4 });
                }
            }
        }
        // 在墙壁附近生成能量球
        walls.forEach(w => {
            if (w.hasEnergy && rng() < 0.6) {
                const dirs = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
                const d = dirs[Math.floor(rng() * 4)];
                const ex = w.x + d.x;
                const ey = w.y + d.y;
                if (ex >= 0 && ex < GRID_W && ey >= 0 && ey < GRID_H && 
                    !walls.some(wall => wall.x === ex && wall.y === ey)) {
                    energyOrbs.push({ x: ex, y: ey, collected: false });
                }
            }
        });
    } else if (gameMode === 'maze') {
        // 宝藏迷宫模式：环形迷宫+宝藏
        const cx = Math.floor(GRID_W / 2);
        const cy = Math.floor(GRID_H / 2);
        const rings = 1 + Math.floor(level / 5);
        
        for (let r = 0; r < rings; r++) {
            const radius = 4 + r * 4;
            const gaps = 3 + Math.floor(rng() * 3);
            const gapPositions = [];
            for (let g = 0; g < gaps; g++) {
                gapPositions.push(Math.floor(rng() * (radius * 4)));
            }
            for (let a = 0; a < radius * 4; a++) {
                if (gapPositions.includes(a)) continue;
                const angle = (a / (radius * 4)) * Math.PI * 2;
                const wx = Math.floor(cx + Math.cos(angle) * radius);
                const wy = Math.floor(cy + Math.sin(angle) * radius);
                if (wx >= 1 && wx < GRID_W - 1 && wy >= 1 && wy < GRID_H - 1) {
                    walls.push({ x: wx, y: wy });
                }
            }
        }
        
        // 在迷宫中放置宝藏
        const treasureCount = 2 + Math.floor(level / 3);
        for (let t = 0; t < treasureCount; t++) {
            const pos = getEmptyTile();
            if (pos) {
                treasures.push({ 
                    x: pos.x, y: pos.y, 
                    type: rng() < 0.3 ? 'big' : 'small',
                    collected: false 
                });
            }
        }
    }
}

function mulberry32(seed) {
    let s = seed;
    return function() {
        s |= 0; s = s + 0x6D2B79F5 | 0;
        let t = Math.imul(s ^ s >>> 15, 1 | s);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

// Food System
function spawnFood() {
    if (activeFrenzy) {
        if (foods.length >= 8) return;
    } else {
        if (foods.length >= 3) return;
    }

    const available = Object.entries(FOOD_TYPES);
    let roll = Math.random();
    let type = 'normal';

    for (const [name, data] of available) {
        if (roll < data.chance) {
            type = name;
            break;
        }
        roll -= data.chance;
    }

    const pos = getEmptyTile();
    if (!pos) return;

    foods.push({
        x: pos.x, y: pos.y,
        type: type,
        spawnTime: Date.now(),
        pulse: 0,
    });
}

function getEmptyTile() {
    for (let i = 0; i < 100; i++) {
        const x = Math.floor(Math.random() * GRID_W);
        const y = Math.floor(Math.random() * GRID_H);
        const isSnake = snake.some(s => s.x === x && s.y === y);
        const isWall = walls.some(w => w.x === x && w.y === y);
        const isFood = foods.some(f => f.x === x && f.y === y);
        const isOrb = energyOrbs.some(o => o.x === x && o.y === y);
        const isTreasure = treasures.some(t => t.x === x && t.y === y);
        if (!isSnake && !isWall && !isFood && !isOrb && !isTreasure) return { x, y };
    }
    return null;
}

// Update
function update(dt) {
    if (gameState === 'countdown') {
        countdownTimer += dt;
        if (countdownTimer >= 800) {
            countdownTimer = 0;
            countdownValue--;
            if (countdownValue > 0) {
                audio.countdown();
            } else if (countdownValue === 0) {
                audio.countdownGo();
            } else {
                startGame();
            }
        }
    }

    if (gameState !== 'playing') return;

    moveTimer += dt;
    survivalTime += dt / 1000;

    if (timeAttackActive) {
        timeAttackTimer -= dt / 1000;
        if (timeAttackTimer <= 0) {
            timeAttackTimer = 0;
            gameOver();
            return;
        }
        if (timeAttackTimer <= 10 && Math.floor(timeAttackTimer) !== Math.floor((timeAttackTimer + dt / 1000))) {
            audio.tick();
        }
        document.getElementById('time-attack-timer').textContent = Math.ceil(timeAttackTimer);
    }

    if (survivalTime >= 100 && !unlockedAchievements.noDeath100) {
        unlockAchievement('noDeath100');
    }

    if (boostCooldownTimer > 0) {
        boostCooldownTimer--;
    }

    if (activeFrenzy) {
        frenzyTimer -= dt;
        if (frenzyTimer <= 0) {
            activeFrenzy = false;
            removeEffectIndicator('frenzy');
        }
    }

    if (enemySnake) {
        enemySnake.update(dt, snake[0], foods, walls);

        // 检查AI是否撞墙（玩家引诱成功）
        if (enemySnake.alive && enemySnake.hitWall) {
            enemySnake.hitWall = false;
            score += 50;
            audio.powerup();
            spawnParticles(
                enemySnake.segments[0].x * TILE_SIZE + TILE_SIZE / 2,
                enemySnake.segments[0].y * TILE_SIZE + TILE_SIZE / 2,
                '#ffaa00', 15
            );
            addFloatingText(
                enemySnake.segments[0].x * TILE_SIZE + TILE_SIZE / 2,
                enemySnake.segments[0].y * TILE_SIZE,
                '+50 陷阱!',
                '#ffaa00',
                20
            );
            // AI撞墙后短暂眩晕
            enemySnake.stunned = true;
            setTimeout(() => {
                if (enemySnake) enemySnake.stunned = false;
            }, 1500);
        }

        if (enemySnake.checkPlayerEating(snake[0])) {
            enemySnake.alive = false;
            score += 100;
            enemyKillCount++;
            audio.eatEnemy();
            deathAnimations.push(new DeathAnimation(
                enemySnake.segments[0].x,
                enemySnake.segments[0].y,
                enemySnake.color,
                enemySnake.segments
            ));
            addFloatingText(
                enemySnake.segments[0].x * TILE_SIZE + TILE_SIZE / 2,
                enemySnake.segments[0].y * TILE_SIZE,
                '+100 消灭!',
                '#ff0044',
                24
            );

            if (!unlockedAchievements.killEnemy) {
                unlockAchievement('killEnemy');
            }

            setTimeout(() => {
                if (enemySnake && gameState === 'playing') {
                    enemySnake.respawn();
                    enemySnake.alive = true;
                }
            }, 3000);
        }

        if (enemySnake.alive && enemySnake.checkCollisionWithSnake(snake)) {
            loseLife();
            return;
        }
    }

    if (moveTimer < snakeSpeed) return;
    moveTimer = 0;

    animationFrame++;
    comboTimer = Math.max(0, comboTimer - 1);

    if (comboTimer === 0) {
        combo = 0;
        document.getElementById('combo-info').classList.add('hidden');
    }

    snakeDir = { ...snakeNextDir };

    const head = snake[0];
    let newHead = { x: head.x + snakeDir.x, y: head.y + snakeDir.y };

    // 边界环绕：蛇总是可以穿过边界到另一边
    newHead.x = (newHead.x + GRID_W) % GRID_W;
    newHead.y = (newHead.y + GRID_H) % GRID_H;

    const hitWall = walls.some(w => w.x === newHead.x && w.y === newHead.y);
    if (hitWall && activeGhost) {
        ghostWallCount++;
        checkGhostAchievement();
    } else if (hitWall) {
        if (activeShield) {
            activeShield = false;
            shieldBlockCount++;
            audio.powerup();
            spawnParticles(newHead.x * TILE_SIZE + TILE_SIZE / 2, newHead.y * TILE_SIZE + TILE_SIZE / 2, '#ffff00', 15);
            addFloatingText(newHead.x * TILE_SIZE + TILE_SIZE / 2, newHead.y * TILE_SIZE, '护盾抵挡!', '#ffff00');
            checkShieldAchievement();
            return;
        } else {
            loseLife();
            return;
        }
    }

    const hitSelf = snake.some((s, i) => i > 0 && s.x === newHead.x && s.y === newHead.y);
    if (hitSelf) {
        if (activeShield) {
            activeShield = false;
            shieldBlockCount++;
            audio.powerup();
            spawnParticles(newHead.x * TILE_SIZE + TILE_SIZE / 2, newHead.y * TILE_SIZE + TILE_SIZE / 2, '#ffff00', 15);
            addFloatingText(newHead.x * TILE_SIZE + TILE_SIZE / 2, newHead.y * TILE_SIZE, '护盾抵挡!', '#ffff00');
            checkShieldAchievement();
            return;
        }
        loseLife();
        return;
    }

    snake.unshift(newHead);

    let ate = false;
    for (let i = foods.length - 1; i >= 0; i--) {
        const f = foods[i];
        const dist = Math.hypot(newHead.x - f.x, newHead.y - f.y);
        if (dist < 1.5) {
            if (activeMagnet || dist < 0.8) {
                eatFood(f, i);
                ate = true;
                break;
            }
        }
    }

    // 能量球收集
    for (let i = energyOrbs.length - 1; i >= 0; i--) {
        const orb = energyOrbs[i];
        if (!orb.collected && newHead.x === orb.x && newHead.y === orb.y) {
            orb.collected = true;
            const bonus = 30 + level * 5;
            score += bonus;
            audio.powerup();
            spawnParticles(orb.x * TILE_SIZE + TILE_SIZE / 2, orb.y * TILE_SIZE + TILE_SIZE / 2, '#00ffff', 15);
            addFloatingText(orb.x * TILE_SIZE + TILE_SIZE / 2, orb.y * TILE_SIZE, `+${bonus} 能量!`, '#00ffff', 18);
            ate = true;
            break;
        }
    }

    // 宝藏收集
    for (let i = treasures.length - 1; i >= 0; i--) {
        const treasure = treasures[i];
        if (!treasure.collected && newHead.x === treasure.x && newHead.y === treasure.y) {
            treasure.collected = true;
            const bonus = treasure.type === 'big' ? 100 : 50;
            score += bonus;
            audio.achievement();
            spawnParticles(treasure.x * TILE_SIZE + TILE_SIZE / 2, treasure.y * TILE_SIZE + TILE_SIZE / 2, '#ffdd00', 20);
            addFloatingText(treasure.x * TILE_SIZE + TILE_SIZE / 2, treasure.y * TILE_SIZE, `+${bonus} 宝藏!`, '#ffdd00', 22);
            
            // 大宝藏给额外奖励
            if (treasure.type === 'big') {
                score += 500;
                addFloatingText(CANVAS_W / 2, CANVAS_H / 2, '+500 巨额宝藏!', '#ffdd00', 20);
            }
            ate = true;
            break;
        }
    }

    if (!ate) {
        snake.pop();
    }

    updateEffects(dt);
    updateParticles();
    updateDeathAnimations();
}

function eatFood(food, index) {
    const type = FOOD_TYPES[food.type];
    let points = type.points;

    if (!unlockedAchievements.firstBlood) {
        unlockAchievement('firstBlood');
    }

    if (type.effect) {
        effectsUsed.add(type.effect);
        if (effectsUsed.size >= 6 && !unlockedAchievements.allEffects) {
            unlockAchievement('allEffects');
        }
    }

    combo++;
    comboTimer = 90;
    if (combo > maxCombo) maxCombo = combo;

    if (combo > 1) {
        const multiplier = Math.min(combo, 10);
        points *= multiplier;
        if (combo >= 10) {
            audio.comboHigh();
        } else {
            audio.combo();
        }
        document.getElementById('combo-info').classList.remove('hidden');
        document.getElementById('combo').textContent = `x${multiplier}`;

        if (combo >= 5 && !unlockedAchievements.combo5) {
            unlockAchievement('combo5');
        }
        if (combo >= 10 && !unlockedAchievements.combo10) {
            unlockAchievement('combo10');
        }
    } else {
        if (type.effect) {
            audio.eatSpecial();
        } else {
            audio.eat();
        }
    }

    if (activeDouble) points *= 2;
    if (activeFrenzy) points *= 3;

    score += points;
    stats.totalFood++;
    foods.splice(index, 1);

    const px = food.x * TILE_SIZE + TILE_SIZE / 2;
    const py = food.y * TILE_SIZE + TILE_SIZE / 2;
    spawnParticles(px, py, type.color, type.effect ? 20 : 12);
    addFloatingText(px, py - 10, `+${points}`, type.color, points >= 50 ? 20 : 16);

    if (score >= 100 && !unlockedAchievements.score100) {
        unlockAchievement('score100');
    }
    if (score >= 500 && !unlockedAchievements.score500) {
        unlockAchievement('score500');
    }
    if (score >= 1000 && !unlockedAchievements.score1000) {
        unlockAchievement('score1000');
    }

    if (timeAttackMode && score >= 200 && !unlockedAchievements.timeAttack) {
        unlockAchievement('timeAttack');
    }

    if (snake.length >= 20 && !unlockedAchievements.length20) {
        unlockAchievement('length20');
    }
    if (snake.length >= 50 && !unlockedAchievements.length50) {
        unlockAchievement('length50');
    }

    if (type.effect) {
        applyEffect(type.effect);
        audio.powerup();
    }

    const speedUp = DIFFICULTY[difficulty].speedIncrease;
    baseSpeed = Math.max(DIFFICULTY[difficulty].maxSpeed, baseSpeed - speedUp);
    if (!boostActive) snakeSpeed = baseSpeed;

    if (snake.length % 5 === 0) {
        level++;
        audio.levelUp();
        generateWalls();
        addFloatingText(CANVAS_W / 2, CANVAS_H / 2, `STAGE ${level}!`, '#00ff66', 28);

        if (level >= 5 && !unlockedAchievements.level5) {
            unlockAchievement('level5');
        }
        if (level >= 10 && !unlockedAchievements.level10) {
            unlockAchievement('level10');
        }
    }

    spawnFood();
    updateHUD();
}

function applyEffect(effect) {
    switch (effect) {
        case 'speed':
            snakeSpeed = Math.max(25, baseSpeed / 2);
            addEffectIndicator('speed', '⚡ 加速', 5000);
            setTimeout(() => { if (!boostActive) snakeSpeed = baseSpeed; }, 5000);
            break;
        case 'slow':
            snakeSpeed = baseSpeed * 1.8;
            addEffectIndicator('slow', '❄️ 减速', 5000);
            setTimeout(() => { if (!boostActive) snakeSpeed = baseSpeed; }, 5000);
            break;
        case 'double':
            activeDouble = true;
            addEffectIndicator('double', '×2 双倍', 8000);
            setTimeout(() => { activeDouble = false; removeEffectIndicator('double'); }, 8000);
            break;
        case 'magnet':
            activeMagnet = true;
            addEffectIndicator('magnet', '🧲 磁铁', 8000);
            setTimeout(() => { activeMagnet = false; removeEffectIndicator('magnet'); }, 8000);
            break;
        case 'ghost':
            activeGhost = true;
            addEffectIndicator('ghost', '👻 穿墙', 6000);
            setTimeout(() => { activeGhost = false; removeEffectIndicator('ghost'); }, 6000);
            break;
        case 'shrink':
            if (snake.length > 3) {
                snake.splice(snake.length - 3, 3);
                addFloatingText(snake[0].x * TILE_SIZE + TILE_SIZE / 2, snake[0].y * TILE_SIZE, '✂️ 缩短!', '#ff4444');
            }
            break;
        case 'shield':
            activeShield = true;
            addEffectIndicator('shield', '🛡️ 护盾', -1);
            break;
        case 'frenzy':
            activeFrenzy = true;
            frenzyTimer = 10000;
            audio.frenzy();
            addEffectIndicator('frenzy', '🔥 狂热!', 10000);
            for (let i = 0; i < 5; i++) spawnFood();
            addFloatingText(CANVAS_W / 2, CANVAS_H / 2, '🔥 狂热模式! 🔥', '#ff00ff', 32);
            break;
        case 'teleport':
            const pos = getEmptyTile();
            if (pos) {
                snake[0] = { x: pos.x, y: pos.y };
                spawnParticles(pos.x * TILE_SIZE + TILE_SIZE / 2, pos.y * TILE_SIZE + TILE_SIZE / 2, '#00ffff', 20);
                addFloatingText(pos.x * TILE_SIZE + TILE_SIZE / 2, pos.y * TILE_SIZE, '🌀 传送!', '#00ffff');
            }
            break;
    }
}

function addEffectIndicator(id, text, duration) {
    const container = document.getElementById('effect-indicators');
    if (!container) return;

    const existing = document.getElementById(`effect-${id}`);
    if (existing) existing.remove();

    const indicator = document.createElement('div');
    indicator.id = `effect-${id}`;
    indicator.className = 'effect-indicator';
    indicator.textContent = text;
    container.appendChild(indicator);

    if (duration > 0) {
        setTimeout(() => indicator.remove(), duration);
    }
}

function removeEffectIndicator(id) {
    const indicator = document.getElementById(`effect-${id}`);
    if (indicator) indicator.remove();
}

function updateEffects(dt) {
    if (screenShake > 0) screenShake *= 0.85;
    if (screenShake < 0.5) screenShake = 0;
}

function updateParticles() {
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => p.update());

    floatingTexts = floatingTexts.filter(t => !t.isDead());
    floatingTexts.forEach(t => t.update());
}

function updateDeathAnimations() {
    deathAnimations = deathAnimations.filter(d => !d.done);
    deathAnimations.forEach(d => d.update());
}

function loseLife() {
    lives = 0;
    audio.die();
    screenShake = 5;

    deathAnimations.push(new DeathAnimation(
        snake[0].x,
        snake[0].y,
        '#00ff66',
        snake
    ));

    addFloatingText(snake[0].x * TILE_SIZE + TILE_SIZE / 2, snake[0].y * TILE_SIZE, '💀', '#ff4444', 24);

    gameOver();
    return;

    const startX = Math.floor(GRID_W / 2);
    const startY = Math.floor(GRID_H / 2);
    snake = [];
    for (let i = 0; i < 4; i++) {
        snake.push({ x: startX - i, y: startY });
    }
    snakeDir = { x: 1, y: 0 };
    snakeNextDir = { x: 1, y: 0 };
    moveTimer = 0;

    activeShield = false;
    activeGhost = false;
    activeMagnet = false;
    activeDouble = false;
    activeFrenzy = false;
    frenzyTimer = 0;
    boostActive = false;
    baseSpeed = DIFFICULTY[difficulty].baseSpeed;
    snakeSpeed = baseSpeed;

    document.querySelectorAll('.effect-indicator').forEach(el => el.remove());

    updateHUD();
}

function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 4;
        particles.push(new Particle(
            x, y, color,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            25 + Math.random() * 25,
            2 + Math.random() * 2
        ));
    }
}

function addFloatingText(x, y, text, color, size = 16) {
    floatingTexts.push(new FloatingText(x, y, text, color, size));
}

function updateHUD() {
    document.getElementById('score').textContent = String(score).padStart(5, '0');
    document.getElementById('high-score').textContent = String(highScore).padStart(5, '0');
    document.getElementById('level-info').textContent = `第 ${level} 关 Stage ${level}`;
    document.getElementById('lives').textContent = lives;
}

// Achievement System
function unlockAchievement(id) {
    if (unlockedAchievements[id]) return;
    unlockedAchievements[id] = true;
    localStorage.setItem('snakeAchievements', JSON.stringify(unlockedAchievements));

    const achievement = ACHIEVEMENTS[id];
    if (achievement) {
        audio.achievement();
        showAchievementPopup(achievement);
    }
}

function showAchievementPopup(achievement) {
    const popup = document.getElementById('achievement-popup');
    if (!popup) return;

    const icon = popup.querySelector('.achievement-icon');
    const name = popup.querySelector('.achievement-name');
    const desc = popup.querySelector('.achievement-desc');

    if (icon) icon.textContent = achievement.icon;
    if (name) name.textContent = achievement.name;
    if (desc) desc.textContent = achievement.desc;

    popup.classList.remove('hidden');
    popup.classList.add('show');

    setTimeout(() => {
        popup.classList.remove('show');
        popup.classList.add('hidden');
    }, 3000);
}

function saveAchievements() {
    localStorage.setItem('snakeAchievements', JSON.stringify(unlockedAchievements));
}

function checkGhostAchievement() {
    if (ghostWallCount >= 5 && !unlockedAchievements.ghostMaster) {
        unlockAchievement('ghostMaster');
    }
}

function checkShieldAchievement() {
    if (shieldBlockCount >= 5 && !unlockedAchievements.shieldMaster) {
        unlockAchievement('shieldMaster');
    }
}

// Render
function render() {
    ctx.save();

    if (screenShake > 0) {
        const sx = (Math.random() - 0.5) * screenShake;
        const sy = (Math.random() - 0.5) * screenShake;
        ctx.translate(sx, sy);
    }

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    drawGrid();
    drawWalls();
    drawEnergyOrbs();
    drawTreasures();
    drawFood();
    drawSnake();
    if (enemySnake) enemySnake.draw(ctx);
    drawParticles();
    drawFloatingTexts();
    drawDeathAnimations();
    drawSpeedLines();

    if (gameState === 'countdown') {
        drawCountdown();
    }

    ctx.restore();
}

function drawGrid() {
    ctx.strokeStyle = 'rgba(0, 255, 102, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= GRID_W; x++) {
        ctx.beginPath();
        ctx.moveTo(x * TILE_SIZE, 0);
        ctx.lineTo(x * TILE_SIZE, CANVAS_H);
        ctx.stroke();
    }
    for (let y = 0; y <= GRID_H; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * TILE_SIZE);
        ctx.lineTo(CANVAS_W, y * TILE_SIZE);
        ctx.stroke();
    }
}

function drawWalls() {
    walls.forEach(w => {
        const x = w.x * TILE_SIZE;
        const y = w.y * TILE_SIZE;

        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        ctx.fillStyle = '#3a3a3a';
        ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);

        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8);

        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
        
        // 墙壁发光效果
        if (w.hasEnergy) {
            ctx.shadowColor = '#00ffff';
            ctx.shadowBlur = 8;
            ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
            ctx.fillRect(x + 6, y + 6, TILE_SIZE - 12, TILE_SIZE - 12);
            ctx.shadowBlur = 0;
        }
    });
}

function drawEnergyOrbs() {
    const time = Date.now();
    energyOrbs.forEach(orb => {
        if (orb.collected) return;
        
        const x = orb.x * TILE_SIZE + TILE_SIZE / 2;
        const y = orb.y * TILE_SIZE + TILE_SIZE / 2;
        const pulse = Math.sin(time * 0.008) * 4;
        
        ctx.save();
        
        // 外圈光环
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 15 + pulse;
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 10 + pulse, 0, Math.PI * 2);
        ctx.stroke();
        
        // 内部能量球
        ctx.fillStyle = '#00ffff';
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
        
        // 高光
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(x - 2, y - 2, 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    });
}

function drawTreasures() {
    const time = Date.now();
    treasures.forEach(treasure => {
        if (treasure.collected) return;
        
        const x = treasure.x * TILE_SIZE + TILE_SIZE / 2;
        const y = treasure.y * TILE_SIZE + TILE_SIZE / 2;
        const pulse = Math.sin(time * 0.005) * 3;
        
        ctx.save();
        
        if (treasure.type === 'big') {
            // 大宝箱 - 金色
            ctx.shadowColor = '#ffdd00';
            ctx.shadowBlur = 20 + pulse;
            
            // 宝箱主体
            ctx.fillStyle = '#ffaa00';
            ctx.fillRect(x - 10, y - 6, 20, 12);
            
            // 宝箱盖
            ctx.fillStyle = '#ffdd00';
            ctx.fillRect(x - 12, y - 8, 24, 6);
            
            // 锁
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
            
            // 闪光效果
            ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + pulse * 0.1})`;
            ctx.beginPath();
            ctx.arc(x - 5, y - 4, 2, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // 小宝石 - 绿色
            ctx.shadowColor = '#00ff66';
            ctx.shadowBlur = 12 + pulse;
            
            // 宝石形状
            ctx.fillStyle = '#00ff66';
            ctx.beginPath();
            ctx.moveTo(x, y - 8);
            ctx.lineTo(x + 8, y);
            ctx.lineTo(x, y + 8);
            ctx.lineTo(x - 8, y);
            ctx.closePath();
            ctx.fill();
            
            // 高光
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.beginPath();
            ctx.arc(x - 2, y - 3, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    });
}

function drawFood() {
    const time = Date.now();
    foods.forEach(f => {
        const type = FOOD_TYPES[f.type];
        const x = f.x * TILE_SIZE + TILE_SIZE / 2;
        const y = f.y * TILE_SIZE + TILE_SIZE / 2;
        const pulse = Math.sin(time * 0.006) * 3;

        ctx.save();

        ctx.shadowColor = type.color;
        ctx.shadowBlur = 20 + pulse * 2;

        ctx.strokeStyle = type.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 12 + pulse, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = type.color;
        ctx.beginPath();
        ctx.arc(x, y, 8 + pulse / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(x - 3, y - 3, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;

        if (type.icon) {
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(type.icon, x, y);
        }

        ctx.restore();
    });
}

function drawSnake() {
    snake.forEach((seg, i) => {
        const x = seg.x * TILE_SIZE;
        const y = seg.y * TILE_SIZE;
        const isHead = i === 0;
        const progress = i / snake.length;

        ctx.save();

        if (isHead) {
            ctx.shadowColor = activeGhost ? '#aaaaff' : activeShield ? '#ffff00' : '#00ff66';
            ctx.shadowBlur = 25;
        }

        let bodyColor;
        if (activeGhost) {
            bodyColor = `rgba(100, 100, 255, ${0.8 - progress * 0.4})`;
        } else if (isHead) {
            bodyColor = activeShield ? '#ffff00' : '#00ff66';
        } else {
            const g = Math.floor(255 - progress * 100);
            bodyColor = `rgb(0, ${g}, ${Math.floor(102 - progress * 50)})`;
        }

        if (isHead) {
            ctx.fillStyle = bodyColor;
            ctx.beginPath();
            ctx.roundRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4, 8);
            ctx.fill();

            ctx.fillStyle = '#fff';
            const eyeOffsetX = snakeDir.x * 5;
            const eyeOffsetY = snakeDir.y * 5;
            ctx.beginPath();
            ctx.arc(x + 10 + eyeOffsetX, y + 11 + eyeOffsetY, 4, 0, Math.PI * 2);
            ctx.arc(x + 22 + eyeOffsetX, y + 11 + eyeOffsetY, 4, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(x + 10 + eyeOffsetX + snakeDir.x * 2, y + 11 + eyeOffsetY + snakeDir.y * 2, 2, 0, Math.PI * 2);
            ctx.arc(x + 22 + eyeOffsetX + snakeDir.x * 2, y + 11 + eyeOffsetY + snakeDir.y * 2, 2, 0, Math.PI * 2);
            ctx.fill();

            if (animationFrame % 40 < 5) {
                ctx.strokeStyle = '#ff4444';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x + 16 + snakeDir.x * 14, y + 16 + snakeDir.y * 14);
                ctx.lineTo(x + 16 + snakeDir.x * 20, y + 16 + snakeDir.y * 20);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(x + 16 + snakeDir.x * 20, y + 16 + snakeDir.y * 20);
                ctx.lineTo(x + 16 + snakeDir.x * 22 + snakeDir.y * 3, y + 16 + snakeDir.y * 22 + snakeDir.x * 3);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(x + 16 + snakeDir.x * 20, y + 16 + snakeDir.y * 20);
                ctx.lineTo(x + 16 + snakeDir.x * 22 - snakeDir.y * 3, y + 16 + snakeDir.y * 22 - snakeDir.x * 3);
                ctx.stroke();
            }
        } else {
            ctx.fillStyle = bodyColor;
            const shrink = 2 + progress * 5;
            ctx.beginPath();
            ctx.roundRect(x + shrink, y + shrink, TILE_SIZE - shrink * 2, TILE_SIZE - shrink * 2, 5);
            ctx.fill();

            ctx.fillStyle = `rgba(255, 255, 255, ${0.2 - progress * 0.15})`;
            ctx.beginPath();
            ctx.roundRect(x + shrink + 2, y + shrink + 2, TILE_SIZE - shrink * 2 - 8, 5, 2);
            ctx.fill();
        }

        ctx.restore();
    });

    if (boostActive && animationFrame % 2 === 0) {
        const tail = snake[snake.length - 1];
        if (tail) {
            spawnParticles(
                tail.x * TILE_SIZE + TILE_SIZE / 2,
                tail.y * TILE_SIZE + TILE_SIZE / 2,
                '#ffaa00', 3
            );
        }
    }
}

function drawSpeedLines() {
    if (!boostActive) return;

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 170, 0, 0.3)';
    ctx.lineWidth = 2;

    for (let i = 0; i < 10; i++) {
        const x = Math.random() * CANVAS_W;
        const y = Math.random() * CANVAS_H;
        const len = 20 + Math.random() * 30;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - snakeDir.x * len, y - snakeDir.y * len);
        ctx.stroke();
    }

    ctx.restore();
}

function drawParticles() {
    particles.forEach(p => p.draw(ctx));
}

function drawFloatingTexts() {
    floatingTexts.forEach(t => t.draw(ctx));
}

function drawDeathAnimations() {
    deathAnimations.forEach(d => d.draw(ctx));
}

function drawCountdown() {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.fillStyle = countdownValue > 0 ? '#00ff66' : '#ffaa00';
    ctx.font = 'bold 80px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = countdownValue > 0 ? '#00ff66' : '#ffaa00';
    ctx.shadowBlur = 30;

    const text = countdownValue > 0 ? countdownValue.toString() : 'GO!';
    const scale = 1 + (countdownTimer / 800) * 0.3;
    ctx.translate(CANVAS_W / 2, CANVAS_H / 2);
    ctx.scale(scale, scale);
    ctx.fillText(text, 0, 0);

    ctx.restore();
}

// Game Loop
function gameLoop(timestamp) {
    const dt = timestamp - lastTime;
    lastTime = timestamp;

    update(dt);
    render();

    requestAnimationFrame(gameLoop);
}

// Start
init();
