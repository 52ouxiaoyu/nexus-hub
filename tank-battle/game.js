// Game Constants - Final Full-Screen Scaled Version
const TILE_SIZE = 32; 
const GRID_SIZE = 26;
const CANVAS_SIZE = TILE_SIZE * GRID_SIZE; // 832px

const TILE_TYPES = { EMPTY: 0, BRICK: 1, STEEL: 2, WATER: 3, FOREST: 4, ICE: 5, HARD_BRICK: 6, UNBREAKABLE: 7, BARREL: 8, BASE: 9, BASE_DESTROYED: 10 };
const COLORS = { BRICK: '#B53120', BRICK_LIGHT: '#DC5341', STEEL: '#AAAAAA', STEEL_LIGHT: '#EEEEEE', WATER: '#2131E7', FOREST: '#21B521', PLAYER1: '#E7E721', PLAYER2: '#63C6FF', ENEMY: '#E7E7E7', BASE: '#E79C21', BARREL: '#FF4400' };
const POWERUP_TYPES = { SHIELD: '🛡️', BOMB: '💣', STAR: '⭐', SHOVEL: '🏗️', LIFE: '❤️', TIME: '⏳', MAX_WEAPON: '🚀', BOAT: '🚤', FLY: '🚁', W_MISSILE: '🎯', W_LASER: '⚡', W_EXPLOSIVE: '💥', FAKE_BOMB: '🧨' };

function seededRandom(seed) {
    let s = seed;
    return function() {
        s = (s * 16807 + 0) % 2147483647;
        return (s - 1) / 2147483646;
    };
}

function generateLevel(index) {
    const rng = seededRandom(index * 7919 + 12345);
    const level = { bricks: [], steels: [], waters: [], forests: [], ices: [], totalEnemies: 0 };
    if (index === 0) {
        level.totalEnemies = 10;
        for (let x of [2, 6, 10, 14, 18, 22]) {
            for (let y = 2; y < 10; y += 2) level.bricks.push([y, x, 2, 2]);
            for (let y = 14; y < 20; y += 2) level.bricks.push([y, x, 2, 2]);
        }
        level.steels.push([12, 12, 2, 2]);
        return level;
    }
    if (index === 1) {
        level.totalEnemies = 12;
        for (let x of [4, 8, 12, 16, 20]) {
            for (let y = 4; y < 18; y += 2) if (y !== 10) level.bricks.push([y, x, 2, 2]);
        }
        level.steels.push([10, 4, 2, 2]); level.steels.push([10, 20, 2, 2]);
        for (let x = 6; x <= 18; x += 4) level.forests.push([20, x, 2, 4]);
        return level;
    }
    const difficulty = Math.min(index / 100, 1);
    level.totalEnemies = Math.floor(8 + index * 0.25 + difficulty * 8);
    const patterns = ['grid', 'cross', 'maze', 'circle', 'diamond', 'spiral', 'fortress', 'arena', 'corridor', 'scattered'];
    const pattern = patterns[index % patterns.length];
    const brickDensity = 0.15 + difficulty * 0.2;
    const steelDensity = 0.02 + difficulty * 0.08;
    const forestDensity = 0.05 + difficulty * 0.15;
    const iceDensity = 0.02 + difficulty * 0.1;
    const waterDensity = 0.03 + difficulty * 0.1;
    const isProtected = (x, y) => (x >= 7 && x <= 17 && y >= 21) || (x >= 11 && x <= 14 && y >= 23);
    const isSpawn = (x, y) => (x >= 0 && x <= 3 && y >= 0 && y <= 3) || (x >= 11 && x <= 14 && y >= 0 && y <= 3) || (x >= 22 && x <= 25 && y >= 0 && y <= 3);
    if (pattern === 'grid') {
        for (let y = 2; y < 22; y += 4) for (let x = 2; x < 24; x += 4) {
            if (isProtected(x, y) || isSpawn(x, y)) continue;
            if (rng() < brickDensity) { const w = 2 + Math.floor(rng() * 2); const h = 2 + Math.floor(rng() * 2); level.bricks.push([y, x, h, w]); }
            if (rng() < steelDensity) level.steels.push([y, x, 2, 2]);
        }
    } else if (pattern === 'cross') {
        for (let i = 2; i < 24; i++) {
            if (isProtected(i, 12) || isSpawn(i, 12)) continue;
            if (rng() < brickDensity) level.bricks.push([12, i, 2, 2]);
            if (rng() < brickDensity) level.bricks.push([i, 12, 2, 2]);
            if (rng() < steelDensity) level.steels.push([i, i, 2, 2]);
        }
    } else if (pattern === 'maze') {
        for (let y = 2; y < 22; y += 3) for (let x = 2; x < 24; x += 3) {
            if (isProtected(x, y) || isSpawn(x, y)) continue;
            if (rng() < brickDensity * 1.5) level.bricks.push([y, x, 3, 1]);
            if (rng() < brickDensity * 1.5) level.bricks.push([y, x, 1, 3]);
            if (rng() < steelDensity) level.steels.push([y, x, 2, 2]);
        }
    } else if (pattern === 'circle') {
        const cx = 13, cy = 13;
        for (let y = 2; y < 24; y++) for (let x = 2; x < 24; x++) {
            if (isProtected(x, y) || isSpawn(x, y)) continue;
            const dist = Math.hypot(x - cx, y - cy);
            if (dist > 4 && dist < 10 && rng() < brickDensity) level.bricks.push([y, x, 1, 1]);
            if (dist > 3 && dist < 4 && rng() < steelDensity * 2) level.steels.push([y, x, 1, 1]);
        }
    } else if (pattern === 'diamond') {
        for (let y = 2; y < 24; y++) for (let x = 2; x < 24; x++) {
            if (isProtected(x, y) || isSpawn(x, y)) continue;
            const dist = Math.abs(x - 13) + Math.abs(y - 13);
            if (dist > 5 && dist < 12 && rng() < brickDensity) level.bricks.push([y, x, 1, 1]);
            if (dist === 5 && rng() < steelDensity * 3) level.steels.push([y, x, 1, 1]);
        }
    } else if (pattern === 'spiral') {
        for (let i = 0; i < 30; i++) {
            const angle = i * 0.5;
            const r = 2 + i * 0.4;
            const x = Math.floor(13 + Math.cos(angle) * r);
            const y = Math.floor(13 + Math.sin(angle) * r);
            if (x >= 2 && x < 24 && y >= 2 && y < 22) {
                if (isProtected(x, y) || isSpawn(x, y)) continue;
                if (rng() < brickDensity * 2) level.bricks.push([y, x, 2, 2]);
                if (rng() < steelDensity) level.steels.push([y, x, 2, 2]);
            }
        }
    } else if (pattern === 'fortress') {
        for (let x = 4; x < 22; x += 2) {
            if (!isProtected(x, 4) && !isSpawn(x, 4)) level.bricks.push([4, x, 2, 1]);
            if (!isProtected(x, 20) && !isSpawn(x, 20)) level.bricks.push([20, x, 2, 1]);
        }
        for (let y = 4; y < 20; y += 2) {
            if (!isProtected(4, y) && !isSpawn(4, y)) level.bricks.push([y, 4, 1, 2]);
            if (!isProtected(20, y) && !isSpawn(20, y)) level.bricks.push([y, 20, 1, 2]);
        }
        level.steels.push([6, 6, 2, 2]); level.steels.push([6, 18, 2, 2]); level.steels.push([16, 6, 2, 2]); level.steels.push([16, 18, 2, 2]);
        if (difficulty > 0.3) level.steels.push([10, 10, 4, 4]);
    } else if (pattern === 'arena') {
        for (let x = 6; x < 20; x += 2) {
            if (!isProtected(x, 6) && !isSpawn(x, 6)) level.bricks.push([6, x, 2, 1]);
            if (!isProtected(x, 18) && !isSpawn(x, 18)) level.bricks.push([18, x, 2, 1]);
        }
        for (let y = 6; y < 18; y += 2) {
            if (!isProtected(6, y) && !isSpawn(6, y)) level.bricks.push([y, 6, 1, 2]);
            if (!isProtected(18, y) && !isSpawn(18, y)) level.bricks.push([y, 18, 1, 2]);
        }
        level.steels.push([12, 12, 2, 2]);
        if (difficulty > 0.5) { level.steels.push([8, 8, 2, 2]); level.steels.push([16, 16, 2, 2]); }
    } else if (pattern === 'corridor') {
        for (let y = 4; y < 20; y += 4) for (let x = 2; x < 24; x++) {
            if (isProtected(x, y) || isSpawn(x, y)) continue;
            if (rng() < brickDensity) level.bricks.push([y, x, 1, 1]);
            if (x === 12 && rng() < steelDensity * 3) level.steels.push([y, x, 1, 1]);
        }
    } else {
        const count = Math.floor(15 + difficulty * 15);
        for (let i = 0; i < count; i++) {
            const x = 2 + Math.floor(rng() * 22);
            const y = 2 + Math.floor(rng() * 18);
            if (isProtected(x, y) || isSpawn(x, y)) continue;
            const w = 1 + Math.floor(rng() * 3);
            const h = 1 + Math.floor(rng() * 3);
            if (rng() < steelDensity) level.steels.push([y, x, h, w]);
            else { level.bricks.push([y, x, h, w]); }
        }
    }
    // Generate realistic large features instead of scattered blocks
    if (waterDensity > 0) {
        if (rng() < 0.33) {
            // Horizontal River with a bridge
            const y = 6 + Math.floor(rng() * 8);
            const gapX = 4 + Math.floor(rng() * 12);
            level.waters.push([y, 0, 2, gapX]); 
            level.waters.push([y, gapX + 3, 2, 26]); 
        } else if (rng() < 0.5) {
            // Vertical River with a bridge
            const x = 6 + Math.floor(rng() * 12);
            const gapY = 6 + Math.floor(rng() * 8);
            level.waters.push([0, x, gapY, 2]); 
            level.waters.push([gapY + 3, x, 26, 2]); 
        } else {
            // Big Lake
            const x = 4 + Math.floor(rng() * 12);
            const y = 4 + Math.floor(rng() * 10);
            level.waters.push([y, x, 5 + Math.floor(rng()*3), 5 + Math.floor(rng()*3)]);
        }
    }
    if (forestDensity > 0) {
        // 1 or 2 large dense forests
        const forestCount = 1 + Math.floor(rng() * 2);
        for (let i = 0; i < forestCount; i++) {
            const x = 2 + Math.floor(rng() * 16);
            const y = 2 + Math.floor(rng() * 14);
            level.forests.push([y, x, 5 + Math.floor(rng()*4), 5 + Math.floor(rng()*4)]);
        }
    }
    if (iceDensity > 0) {
        // 1 large snowfield
        const x = 2 + Math.floor(rng() * 12);
        const y = 2 + Math.floor(rng() * 12);
        level.ices.push([y, x, 6 + Math.floor(rng()*5), 6 + Math.floor(rng()*5)]);
    }
    if (index < 10) {
        level.totalEnemies = Math.floor(6 + index * 0.8);
        level.bricks = [];
        level.steels = [];
        const baseCount = 15 + Math.floor(rng() * 10);
        for (let i = 0; i < baseCount; i++) {
            const x = 2 + Math.floor(rng() * 22);
            const y = 2 + Math.floor(rng() * 18);
            if (isProtected(x, y) || isSpawn(x, y)) continue;
            const w = 1 + Math.floor(rng() * 2);
            const h = 1 + Math.floor(rng() * 2);
            level.bricks.push([y, x, h, w]);
        }
        if (index > 3) {
            const steelCount = 1 + Math.floor(rng() * 2);
            for (let i = 0; i < steelCount; i++) {
                const x = 4 + Math.floor(rng() * 18);
                const y = 4 + Math.floor(rng() * 14);
                if (isProtected(x, y) || isSpawn(x, y)) continue;
                level.steels.push([y, x, 2, 2]);
            }
        }
    }
    return level;
}

class AudioManager {
    constructor() { this.ctx = null; this.enabled = false; }
    init() {
        if (!this.ctx) { const AudioContext = window.AudioContext || window.webkitAudioContext; if (AudioContext) { this.ctx = new AudioContext(); this.enabled = true; } }
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    }
    play(type) {
        if (!this.enabled || !this.ctx) return;
        const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
        osc.connect(gain); gain.connect(this.ctx.destination);
        const now = this.ctx.currentTime;
        if (type === 'shoot') {
            osc.type = 'square'; osc.frequency.setValueAtTime(300, now); osc.frequency.exponentialRampToValueAtTime(10, now + 0.1);
            gain.gain.setValueAtTime(0.05, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now); osc.stop(now + 0.1);
        } else if (type === 'explosion') {
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(100, now); osc.frequency.exponentialRampToValueAtTime(10, now + 0.3);
            gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.start(now); osc.stop(now + 0.3);
        } else if (type === 'powerup') {
            osc.type = 'sine'; osc.frequency.setValueAtTime(400, now); osc.frequency.setValueAtTime(800, now + 0.1);
            gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0, now + 0.2);
            osc.start(now); osc.stop(now + 0.2);
        } else if (type === 'start') {
            osc.type = 'square'; osc.frequency.setValueAtTime(300, now); osc.frequency.setValueAtTime(400, now + 0.1); osc.frequency.setValueAtTime(500, now + 0.2);
            gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0, now + 0.5);
            osc.start(now); osc.stop(now + 0.5);
        } else if (type === 'hit') {
            osc.type = 'square'; osc.frequency.setValueAtTime(150, now);
            gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now); osc.stop(now + 0.1);
        }
    }
}
const audio = new AudioManager();

class Effect {
    constructor(x, y, type, data = 1) { this.x = x; this.y = y; this.type = type; this.timer = type === 'SPAWN' ? 60 : (type === 'TRACK' ? 30 : 20); this.active = true; this.data = data; }
    update() { this.timer--; if (this.timer <= 0) this.active = false; }
    draw(ctx) {
        if (this.type === 'EXPLOSION') {
            const progress = (20 - this.timer) / 20;
            const size = (TILE_SIZE * this.data) * progress;
            ctx.beginPath(); ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
            ctx.fillStyle = progress < 0.5 ? '#fff' : (progress < 0.8 ? '#ff0' : '#f00');
            ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
        } else if (this.type === 'SPAWN') {
            if (Math.floor(this.timer / 4) % 2 === 0) {
                ctx.fillStyle = '#fff'; ctx.beginPath(); const s = 20 * this.data;
                ctx.moveTo(this.x, this.y - s); ctx.lineTo(this.x + s/3, this.y - s/3); ctx.lineTo(this.x + s, this.y); ctx.lineTo(this.x + s/3, this.y + s/3); ctx.lineTo(this.x, this.y + s); ctx.lineTo(this.x - s/3, this.y + s/3); ctx.lineTo(this.x - s, this.y); ctx.lineTo(this.x - s/3, this.y - s/3); ctx.closePath(); ctx.fill();
            }
        } else if (this.type === 'TRACK') {
            const { dir, w, h } = this.data;
            ctx.fillStyle = `rgba(0, 0, 0, ${this.timer / 150})`;
            if (dir === 'UP' || dir === 'DOWN') {
                ctx.fillRect(this.x - w/2 + 6, this.y - 4, 6, 8);
                ctx.fillRect(this.x + w/2 - 12, this.y - 4, 6, 8);
            } else {
                ctx.fillRect(this.x - 4, this.y - h/2 + 6, 8, 6);
                ctx.fillRect(this.x - 4, this.y + h/2 - 12, 8, 6);
            }
        }
    }
}

class PowerUp {
    constructor(game, x, y, type) { 
        this.game = game; this.x = x; this.y = y; this.type = type; this.width = 64; this.height = 64; this.timer = 900; this.active = true;
        if (type === POWERUP_TYPES.FLY) this.game.showTip("💡 TIP: 吃到直升机🚁可获得飞行能力，无视地形与子弹，按开火键轰炸！", 600);
        else if (type === POWERUP_TYPES.BOAT) this.game.showTip("💡 TIP: 吃到小艇🚤可在水面上自由移动，利用湖泊躲避不会游泳的敌人！", 600);
        else if (type === POWERUP_TYPES.MAX_WEAPON) this.game.showTip("💡 TIP: 遗产火箭！吃到🚀直接升至满级5级，火力全开！", 600);
        else if (type === POWERUP_TYPES.BOMB) this.game.showTip("💡 TIP: 吃到炸弹💣可以瞬间消灭屏幕上的所有敌人！", 400);
        else if (type === POWERUP_TYPES.SHOVEL) this.game.showTip("💡 TIP: 吃到铁锹🏗️可以把基地周围的砖块升级为坚不可摧的钢板！", 400);
        else if (type === POWERUP_TYPES.TIME) this.game.showTip("💡 TIP: 吃到时钟⏳可以冻结所有敌人一段时间！", 400);
        else if (type === POWERUP_TYPES.STAR) this.game.showTip("💡 TIP: 吃到星星⭐可以直接升一级，火力提升！", 400);
        else if (type === POWERUP_TYPES.W_MISSILE) this.game.showTip("💡 TIP: 吃到🎯切换为【跟踪导弹】，自动追踪敌人！", 400);
        else if (type === POWERUP_TYPES.W_LASER) this.game.showTip("💡 TIP: 吃到⚡切换为【穿透激光】，拥有极高弹速和穿透力！", 400);
        else if (type === POWERUP_TYPES.W_EXPLOSIVE) this.game.showTip("💡 TIP: 吃到💥切换为【高爆弹】，拥有巨大爆炸范围！", 400);
                else if (type === POWERUP_TYPES.W_BOUNCE) this.game.showTip("💡 TIP: 吃到🪀切换为【弹射炮】，子弹能在墙壁间疯狂弹射！", 400);
    }
    update() {
        this.timer--; if (this.timer <= 0) this.active = false;
        if (!this.active) return;
        [...this.game.players, ...this.game.enemies].forEach(p => { 
            const margin = 20;
            if (this.active && p.alive && this.x - margin < p.x + p.width && this.x + this.width + margin > p.x && this.y - margin < p.y + p.height && this.y + this.height + margin > p.y) { 
                this.applyEffect(p); this.active = false; 
            } 
        });
    }
    handleWeaponPickup(player, newClass, name, color) {
        const isPlayer = player instanceof Player;
        if (player.weaponClass !== newClass) {
            player.weaponClass = newClass;
            if (isPlayer) this.game.showAnnouncement(`火力切换: ${name}!`, color);
            else this.game.showAnnouncement(`⚠️ 敌人获得了: ${name}!`, '#f00');
        }
        if (player.level < 9) {
            player.upgrade();
            if (isPlayer) this.game.showAnnouncement(`${name}升级 (Lv ${player.level})!`, color);
        } else {
            player.overdriveTimer = 600; // 10 seconds
            if (isPlayer) {
                this.game.showAnnouncement(`火力超载 (OVERDRIVE) 启动!`, '#f0f');
                this.game.shakeScreen(15);
                this.game.hitStopTimer = 10;
            }
        }
    }
    applyEffect(player) {
        audio.play('powerup');
        this.game.shakeScreen(6);
        this.game.effects.push(new Effect(this.x + 32, this.y + 32, 'EXPLOSION', 1.5));
        for (let i = 0; i < 6; i++) {
            setTimeout(() => {
                this.game.effects.push(new Effect(this.x + 32 + (Math.random() - 0.5) * 60, this.y + 32 + (Math.random() - 0.5) * 60, 'SPARK'));
            }, i * 80);
        }
        const isPlayer = player instanceof Player;
        if (this.type === POWERUP_TYPES.FAKE_BOMB) {
            this.game.effects.push(new Effect(this.x + 32, this.y + 32, 'EXPLOSION', 2));
            if (isPlayer) {
                this.game.showAnnouncement('💀 中计了！这是敌人的陷阱炸药包！', '#f00');
                player.destroy(this.game.enemies.find(e => e.isBoss) || player, 5);
            } else {
                player.health = Math.min(player.maxHealth, player.health + 5);
                this.game.showFloatingText('+5 HP', player.x, player.y, '#0f0');
            }
        }
        else if (this.type === POWERUP_TYPES.BOMB) {
            if (isPlayer) { this.game.enemies.forEach(e => { if (e.isBoss) e.destroy(player, 10); else e.destroy(player, 100); }); }
            else { this.game.players.forEach(p => p.destroy(player, 2)); this.game.showAnnouncement('⚠️ 敌人使用了全屏炸弹!', '#f00'); }
        }
        else if (this.type === POWERUP_TYPES.SHIELD) player.setShield(360);
        else if (this.type === POWERUP_TYPES.STAR) player.upgrade();
        else if (this.type === POWERUP_TYPES.SHOVEL) {
            if (isPlayer) this.game.fortifyBase();
            else { this.game.unfortifyBase(); this.game.showAnnouncement('⚠️ 基地防御被削弱!', '#f00'); }
        }
        else if (this.type === POWERUP_TYPES.LIFE) {
            if (isPlayer) {
                player.lives++;
                this.game.updateHUD();
            }
            else { player.health += 5; player.maxHealth += 5; this.game.showAnnouncement('⚠️ 敌方坦克获得了强效治疗!', '#f00'); }
        }
        else if (this.type === POWERUP_TYPES.TIME) {
            if (isPlayer) this.game.enemyFrozenTimer = 300;
            else { this.game.playerFrozenTimer = 300; this.game.showAnnouncement('⚠️ 玩家被冻结!', '#f00'); }
        }
        else if (this.type === POWERUP_TYPES.MAX_WEAPON) {
            player.level = 9;
            player.speed = Math.min(8, 4 + 9 * 0.15);
            player.maxHealth = 1 + 9 * 2;
            player.health = player.maxHealth;
            if (isPlayer) {
                this.game.showAnnouncement('终极武器 MAX WEAPON!', '#f0f');
                this.game.updateHUD();
            } else {
                this.game.showAnnouncement('⚠️ 敌方坦克获得了终极武器!', '#f00');
            }
        }
        else if (this.type === POWERUP_TYPES.W_MISSILE) { this.handleWeaponPickup(player, 'MISSILE', '跟踪导弹', '#0f0'); }
        else if (this.type === POWERUP_TYPES.W_LASER) { this.handleWeaponPickup(player, 'LASER', '穿透激光', '#0ff'); }
        else if (this.type === POWERUP_TYPES.W_EXPLOSIVE) { this.handleWeaponPickup(player, 'EXPLOSIVE', '高爆弹', '#f00'); }
                else if (this.type === POWERUP_TYPES.W_BOUNCE) { this.handleWeaponPickup(player, 'BOUNCE', '弹射炮', '#f0f'); }
        else if (this.type === POWERUP_TYPES.BOAT) {
            player.canBoat = true;
            this.game.showAnnouncement('获得渡河能力 CAN BOAT!', '#0cf');
        }
        else if (this.type === POWERUP_TYPES.FLY) {
            player.canFly = true;
            player.flyTimer = 1800;
            this.game.showAnnouncement('获得飞行能力 CAN FLY!', '#ccc');
        }
        this.game.updateHUD();
    }
    draw(ctx) {
        if (this.timer < 300 && Math.floor(this.timer / 10) % 2 !== 0) return;
        let scale = 1 + Math.sin(Date.now() / 150) * 0.2;
        ctx.save();
        ctx.translate(this.x + 32, this.y + 32);
        ctx.scale(scale, scale);
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#FFD700';
        ctx.fillStyle = 'rgba(255, 215, 0, 0.4)';
        ctx.beginPath();
        ctx.arc(0, 0, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.type, 0, 0);
        ctx.restore();
    }
}

class GameMap {
    constructor(game) { this.game = game; this.grid = []; }
    reset(levelIndex) {
        const level = generateLevel(levelIndex);
        this.currentLevel = level;
        this.grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
        for (let i = 0; i < GRID_SIZE; i++) this.grid[0][i] = this.grid[GRID_SIZE - 1][i] = this.grid[i][0] = this.grid[i][GRID_SIZE - 1] = TILE_TYPES.UNBREAKABLE;
        const hardBrickChance = Math.min(0.05 + levelIndex * 0.01, 0.4);
        const unbreakableChance = Math.min(0.02 + levelIndex * 0.005, 0.2);
        level.bricks.forEach(([y,x,h,w]) => { for(let i=0; i<h; i++) for(let j=0; j<w; j++) if (y+i < GRID_SIZE && x+j < GRID_SIZE) this.grid[y+i][x+j] = Math.random() < hardBrickChance ? TILE_TYPES.HARD_BRICK : TILE_TYPES.BRICK; });
        level.steels.forEach(([y,x,h,w]) => { for(let i=0; i<h; i++) for(let j=0; j<w; j++) if (y+i < GRID_SIZE && x+j < GRID_SIZE) this.grid[y+i][x+j] = Math.random() < unbreakableChance ? TILE_TYPES.UNBREAKABLE : TILE_TYPES.STEEL; });
        if (level.waters) level.waters.forEach(([y,x,h,w]) => { for(let i=0; i<h; i++) for(let j=0; j<w; j++) if (y+i < GRID_SIZE && x+j < GRID_SIZE) this.grid[y+i][x+j] = TILE_TYPES.WATER; });
        if (!level.waters || level.waters.length === 0) {
            if (Math.random() < 0.4) {
                const lx = 4 + Math.floor(Math.random() * 12);
                const ly = 8 + Math.floor(Math.random() * 8);
                const lw = 4 + Math.floor(Math.random() * 4);
                const lh = 2 + Math.floor(Math.random() * 4);
                for(let i=0; i<lh; i++) for(let j=0; j<lw; j++) if (ly+i < GRID_SIZE && lx+j < GRID_SIZE) this.grid[ly+i][lx+j] = TILE_TYPES.WATER;
            }
        }
        if (level.forests) level.forests.forEach(([y,x,h,w]) => { for(let i=0; i<h; i++) for(let j=0; j<w; j++) if (y+i < GRID_SIZE && x+j < GRID_SIZE) this.grid[y+i][x+j] = TILE_TYPES.FOREST; });
        if (level.ices) level.ices.forEach(([y,x,h,w]) => { for(let i=0; i<h; i++) for(let j=0; j<w; j++) if (y+i < GRID_SIZE && x+j < GRID_SIZE) this.grid[y+i][x+j] = TILE_TYPES.ICE; });
        
        
        // Spawn Explosive Barrels
        const numBarrels = 3 + Math.floor(Math.random() * 4);
        for (let k = 0; k < numBarrels; k++) {
            const bx = 2 + Math.floor(Math.random() * 20);
            const by = 4 + Math.floor(Math.random() * 16);
            if (this.grid[by][bx] !== TILE_TYPES.BASE && this.grid[by][bx] !== TILE_TYPES.UNBREAKABLE) {
                this.grid[by][bx] = TILE_TYPES.BARREL;
            }
        }
        
        // Force spawn 4~8 UNBREAKABLE pillars/blocks on every map for guaranteed cover
        const numPillars = 4 + Math.floor(Math.random() * 5);
        for (let k = 0; k < numPillars; k++) {
            const ux = 2 + Math.floor(Math.random() * 20);
            const uy = 4 + Math.floor(Math.random() * 16);
            if (Math.random() < 0.5) {
                this.grid[uy][ux] = TILE_TYPES.UNBREAKABLE;
                this.grid[uy+1][ux] = TILE_TYPES.UNBREAKABLE;
            } else {
                this.grid[uy][ux] = TILE_TYPES.UNBREAKABLE;
                this.grid[uy][ux+1] = TILE_TYPES.UNBREAKABLE;
                this.grid[uy+1][ux] = TILE_TYPES.UNBREAKABLE;
                this.grid[uy+1][ux+1] = TILE_TYPES.UNBREAKABLE;
            }
        }

        this.clearArea(8, 22, 2, 2); this.clearArea(16, 22, 2, 2); this.clearArea(1, 1, 3, 3); this.clearArea(11, 1, 3, 3); this.clearArea(21, 1, 3, 3);
        this.grid[24][12] = this.grid[24][13] = this.grid[25][12] = this.grid[25][13] = TILE_TYPES.BASE;
        this.setBaseWalls(TILE_TYPES.BRICK);
    }
    setBaseWalls(type) {
        const walls = [
            [23,11],[23,12],[23,13],[23,14],
            [24,11],[25,11],[24,14],[25,14],
            [22,10],[22,11],[22,14],[22,15],
            [23,10],[24,10],[25,10],
            [23,15],[24,15],[25,15],
            [21,11],[21,12],[21,13],[21,14],
            [22,12],[22,13]
        ];
        walls.forEach(([y,x]) => { if (y >= 0 && y < GRID_SIZE && x >= 0 && x < GRID_SIZE) this.grid[y][x] = type; });
    }
    clearArea(tx, ty, tw, th) { for (let y = ty; y < ty + th; y++) for (let x = tx; x < tx + tw; x++) if (y < GRID_SIZE && x < GRID_SIZE) this.grid[y][x] = TILE_TYPES.EMPTY; }
    draw(ctx) {
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                const tile = this.grid[y][x]; if (tile === TILE_TYPES.EMPTY || tile === TILE_TYPES.FOREST) continue;
                const px = x * TILE_SIZE; const py = y * TILE_SIZE;
                if (tile === TILE_TYPES.BRICK) {
                    ctx.fillStyle = COLORS.BRICK; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                    ctx.fillStyle = COLORS.BRICK_LIGHT; ctx.fillRect(px, py, TILE_SIZE, 4); ctx.fillRect(px, py, 4, TILE_SIZE);
                    ctx.fillStyle = '#000'; ctx.fillRect(px + TILE_SIZE/2, py, 2, TILE_SIZE); ctx.fillRect(px, py + TILE_SIZE/2, TILE_SIZE, 2);
                } else if (tile === TILE_TYPES.BARREL) {
                    ctx.fillStyle = COLORS.BARREL; ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
                    ctx.fillStyle = '#000'; ctx.fillRect(px + TILE_SIZE/2 - 2, py + 4, 4, TILE_SIZE - 8);
                    ctx.fillStyle = '#FFF'; ctx.font = '16px Arial'; ctx.textAlign='center'; ctx.fillText('☠️', px+TILE_SIZE/2, py+TILE_SIZE/2+6);
                } else if (tile === TILE_TYPES.HARD_BRICK) {
                    ctx.fillStyle = '#8B4513'; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                    ctx.fillStyle = '#A0522D'; ctx.fillRect(px, py, TILE_SIZE, 4); ctx.fillRect(px, py, 4, TILE_SIZE);
                    ctx.fillStyle = '#000'; ctx.fillRect(px + TILE_SIZE/2, py, 2, TILE_SIZE); ctx.fillRect(px, py + TILE_SIZE/2, TILE_SIZE, 2);
                } else if (tile === TILE_TYPES.UNBREAKABLE) {
                    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                    ctx.fillStyle = '#3a3a4a'; ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
                    ctx.fillStyle = '#5a2a7a'; ctx.fillRect(px + 8, py + 8, TILE_SIZE - 16, TILE_SIZE - 16);
                    ctx.strokeStyle = '#a4f'; ctx.lineWidth = 1; ctx.strokeRect(px + 8, py + 8, TILE_SIZE - 16, TILE_SIZE - 16);
                } else if (tile === TILE_TYPES.STEEL) {
                    ctx.fillStyle = COLORS.STEEL; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                    ctx.fillStyle = COLORS.STEEL_LIGHT; ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
                    ctx.fillStyle = COLORS.STEEL; ctx.fillRect(px + 8, py + 8, TILE_SIZE - 16, TILE_SIZE - 16);
                } else if (tile === TILE_TYPES.WATER) {
                    ctx.fillStyle = COLORS.WATER; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                    ctx.fillStyle = '#fff'; ctx.fillRect(px + 8, py + 8, 4, 4);
                } else if (tile === TILE_TYPES.ICE) {
                    ctx.fillStyle = '#a8d8ea'; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                    ctx.fillStyle = '#d4f1f9'; ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, 4);
                    ctx.fillStyle = '#b8e6f0'; ctx.fillRect(px + 4, py + 12, 8, 8);
                } else if (tile === TILE_TYPES.BASE) this.drawEagle(ctx, px, py);
                else if (tile === TILE_TYPES.BASE_DESTROYED) { ctx.fillStyle = '#555'; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE); ctx.fillStyle = '#000'; ctx.font = '24px Arial'; ctx.fillText('X', px + 8, py + 24); }
            }
        }
    }
    drawEagle(ctx, px, py) {
        const tx = Math.floor(px / TILE_SIZE); const ty = Math.floor(py / TILE_SIZE);
        if (this.grid[ty][tx-1] === TILE_TYPES.BASE || (this.grid[ty-1] && this.grid[ty-1][tx] === TILE_TYPES.BASE)) return;
        const hpRatio = this.game.baseHealth / this.game.maxBaseHealth;
        const baseColor = hpRatio > 0.6 ? COLORS.BASE : (hpRatio > 0.3 ? '#fa0' : '#f00');
        ctx.fillStyle = baseColor; ctx.fillRect(px + 8, py + 8, 48, 48); ctx.fillStyle = '#000';
        ctx.fillRect(px+8, py+8, 8, 8); ctx.fillRect(px+48, py+8, 8, 8); ctx.fillRect(px+24, py+16, 16, 8);
        ctx.fillStyle = '#333'; ctx.fillRect(px + 8, py - 8, 48, 5);
        ctx.fillStyle = baseColor; ctx.fillRect(px + 8, py - 8, 48 * hpRatio, 5);
        ctx.strokeStyle = '#666'; ctx.lineWidth = 1; ctx.strokeRect(px + 8, py - 8, 48, 5);
    }
    isBlocked(x, y, width, height, isBullet = false, canBoat = false, canFly = false) {
        const left = Math.floor(x / TILE_SIZE); const right = Math.floor((x + width - 0.1) / TILE_SIZE);
        const top = Math.floor(y / TILE_SIZE); const bottom = Math.floor((y + height - 0.1) / TILE_SIZE);
        for (let i = top; i <= bottom; i++) {
            for (let j = left; j <= right; j++) {
                if (i < 0 || i >= GRID_SIZE || j < 0 || j >= GRID_SIZE) return true;
                const tile = this.grid[i][j];
                if (isBullet) { if (tile === TILE_TYPES.BRICK || tile === TILE_TYPES.HARD_BRICK || tile === TILE_TYPES.STEEL || tile === TILE_TYPES.UNBREAKABLE || tile === TILE_TYPES.BASE) return true; }
                else { 
                    if (tile === TILE_TYPES.EMPTY || tile === TILE_TYPES.FOREST || tile === TILE_TYPES.ICE) continue;
                    if (tile === TILE_TYPES.WATER && (canBoat || canFly)) continue;
                    if (tile !== TILE_TYPES.UNBREAKABLE && canFly) continue;
                    return true;
                }
            }
        }
        return false;
    }
    isOnWater(x, y, width, height) {
        const cx = Math.floor((x + width/2) / TILE_SIZE);
        const cy = Math.floor((y + height/2) / TILE_SIZE);
        if (cx < 0 || cx >= GRID_SIZE || cy < 0 || cy >= GRID_SIZE) return false;
        return this.grid[cy][cx] === TILE_TYPES.WATER;
    }
}

class InputHandler {
    constructor() {
        this.keys = {};
        this.gameKeys = ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'NumpadEnter', 'KeyP', 'KeyU', 'Numpad9'];
        this.touchState = { up: false, down: false, left: false, right: false, shoot: false };
        this.isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        window.addEventListener('keydown', (e) => { this.keys[e.code] = true; if (this.gameKeys.includes(e.code)) e.preventDefault(); });
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);
        if (this.isMobile) this.initTouchControls();
    }
    initTouchControls() {
        const dpadBtns = document.querySelectorAll('.dpad-btn');
        const shootBtn = document.getElementById('touch-shoot');
        dpadBtns.forEach(btn => {
            const dir = btn.dataset.dir;
            btn.addEventListener('touchstart', (e) => { e.preventDefault(); this.touchState[dir] = true; });
            btn.addEventListener('touchend', (e) => { e.preventDefault(); this.touchState[dir] = false; });
        });
        if (shootBtn) {
            shootBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.touchState.shoot = true; });
            shootBtn.addEventListener('touchend', (e) => { e.preventDefault(); this.touchState.shoot = false; });
        }
    }
    isDown(code) {
        if (this.keys[code]) return true;
        if (!this.isMobile) return false;
        if (code === 'KeyW' || code === 'ArrowUp') return this.touchState.up;
        if (code === 'KeyS' || code === 'ArrowDown') return this.touchState.down;
        if (code === 'KeyA' || code === 'ArrowLeft') return this.touchState.left;
        if (code === 'KeyD' || code === 'ArrowRight') return this.touchState.right;
        if (code === 'Space' || code === 'NumpadEnter') return this.touchState.shoot;
        return false;
    }
}

class Bullet {
    constructor(game, owner, x, y, dir, level = 0, type = 'NORMAL') {
        this.game = game; this.owner = owner; this.x = x; this.y = y; this.dir = dir;
        this.level = level; this.type = type;
        this.active = true;
        this.size = 8;
        this.speed = 6;
        this.damage = 1 + Math.floor(level / 2);
        this.piercing = false;

        if (this.type === 'NORMAL') {
            if (level >= 5) this.speed = 10;
            else if (level >= 3) this.speed = 8;
        } else if (this.type === 'LASER') {
            this.speed = 12;
            this.piercing = true;
            this.size = level >= 3 ? 14 : 8;
            if (level >= 3) this.damage *= 1.5;
        } else if (this.type === 'MISSILE') {
            this.speed = level >= 5 ? 7 : 5;
            if (this.owner instanceof Enemy) this.speed *= 0.6; // 40% slower for enemies
        } else if (this.type === 'EXPLOSIVE') {
            this.speed = 5;
            this.damage *= 2;
            this.size = 12;
        }
        this.vx = undefined; this.vy = undefined;
    }
    update() {
        if (this.type === 'MISSILE' || this.type === 'LASER_MISSILE') {
            let target = null;
            let minDist = Infinity;
            let targets = this.owner instanceof Player ? this.game.enemies : this.game.players;
            for (let t of targets) {
                if (!t.alive) continue;
                let d = Math.hypot(t.x + t.width/2 - this.x, t.y + t.height/2 - this.y);
                if (d < minDist && d < TILE_SIZE * 8) { minDist = d; target = t; }
            }
            if (target) {
                let dx = target.x + target.width/2 - this.x;
                let dy = target.y + target.height/2 - this.y;
                let angle = Math.atan2(dy, dx);
                let currentAngle = this.vx !== undefined ? Math.atan2(this.vy, this.vx) : 
                                   (this.dir === 'UP' ? -Math.PI/2 : this.dir === 'DOWN' ? Math.PI/2 : this.dir === 'LEFT' ? Math.PI : 0);
                let diff = angle - currentAngle;
                if (isNaN(diff)) diff = 0;
                diff = (diff + Math.PI) % (Math.PI * 2);
                if (diff < 0) diff += Math.PI * 2;
                diff -= Math.PI;
                let turnSpeed = this.owner instanceof Player ? 0.05 : 0.015; // Enemies turn much slower
                let newAngle = currentAngle + Math.max(-turnSpeed, Math.min(turnSpeed, diff));
                this.vx = Math.cos(newAngle) * this.speed;
                this.vy = Math.sin(newAngle) * this.speed;
                if (Math.abs(this.vx) > Math.abs(this.vy)) this.dir = this.vx > 0 ? 'RIGHT' : 'LEFT';
                else this.dir = this.vy > 0 ? 'DOWN' : 'UP';
            } else if (this.vx === undefined) {
                this.vx = (this.dir === 'LEFT' ? -this.speed : this.dir === 'RIGHT' ? this.speed : 0);
                this.vy = (this.dir === 'UP' ? -this.speed : this.dir === 'DOWN' ? this.speed : 0);
            }
        }
        
        if (this.vx !== undefined && this.vy !== undefined) {
            this.x += this.vx; this.y += this.vy;
        } else {
            if (this.dir === 'UP') this.y -= this.speed; else if (this.dir === 'DOWN') this.y += this.speed; else if (this.dir === 'LEFT') this.x -= this.speed; else if (this.dir === 'RIGHT') this.x += this.speed;
        }
        for (let other of this.game.bullets) {
            if (other === this || !other.active || this.owner === other.owner) continue;
            if (this.x < other.x + other.size && this.x + this.size > other.x && this.y < other.y + other.size && this.y + this.size > other.y) { this.active = false; other.active = false; this.triggerExplosion(this.x, this.y, true); return; }
        }
        const tx = Math.floor((this.x + this.size/2) / TILE_SIZE); const ty = Math.floor((this.y + this.size/2) / TILE_SIZE);
        if (tx < 0 || tx >= GRID_SIZE || ty < 0 || ty >= GRID_SIZE) { 
            this.active = false;
            return; 
        }
        const tile = this.game.map.grid[ty][tx];
        if (tile === TILE_TYPES.BRICK || tile === TILE_TYPES.HARD_BRICK || tile === TILE_TYPES.STEEL || tile === TILE_TYPES.UNBREAKABLE || tile === TILE_TYPES.BASE || tile === TILE_TYPES.BARREL) {
            if (this.piercing) {
                if (tile === TILE_TYPES.BRICK || tile === TILE_TYPES.HARD_BRICK || tile === TILE_TYPES.BARREL) {
                    this.game.map.grid[ty][tx] = TILE_TYPES.EMPTY;
                    return;
                }
                if (tile === TILE_TYPES.STEEL && this.type === 'LASER' && this.level >= 5) {
                    this.game.map.grid[ty][tx] = TILE_TYPES.EMPTY;
                    return;
                }
            }
            if (tile === TILE_TYPES.BARREL) {
                this.game.map.grid[ty][tx] = TILE_TYPES.EMPTY;
                this.game.hitStopTimer = 6; // Hit Stop!
                let explosionRadius = 3.5;
                audio.play('explosion');
                this.game.effects.push(new Effect(tx*TILE_SIZE+16, ty*TILE_SIZE+16, 'EXPLOSION', explosionRadius));
                // Destructive AOE
                for (let iy = ty - 3; iy <= ty + 3; iy++) {
                    for (let ix = tx - 3; ix <= tx + 3; ix++) {
                        if (iy >= 0 && iy < GRID_SIZE && ix >= 0 && ix < GRID_SIZE) {
                            let d = Math.hypot(ix - tx, iy - ty);
                            if (d <= explosionRadius) {
                                let t = this.game.map.grid[iy][ix];
                                if (t === TILE_TYPES.BRICK || t === TILE_TYPES.HARD_BRICK || t === TILE_TYPES.STEEL || t === TILE_TYPES.BARREL) {
                                    this.game.map.grid[iy][ix] = TILE_TYPES.EMPTY;
                                }
                            }
                        }
                    }
                }
                // Damage tanks
                for (let tank of [...this.game.players, ...this.game.enemies]) {
                    if (!tank.alive) continue;
                    let d = Math.hypot(tank.x/TILE_SIZE - tx, tank.y/TILE_SIZE - ty);
                    if (d <= explosionRadius + 1) tank.destroy(this.owner || this, 5);
                }
            } else if (tile === TILE_TYPES.BASE) {
                if (this.owner instanceof Enemy) {
                    this.game.baseHealth--;
                    if (this.game.baseHealth === 2 || this.game.baseHealth === 1) {
                        this.game.showAnnouncement('⚠️ 警告！大本营血量告急！ ⚠️', '#f00');
                        audio.play('explosion');
                    }
                    if (this.game.baseHealth <= 0) {
                        this.game.map.grid[24][12] = TILE_TYPES.BASE_DESTROYED;
                        this.game.map.grid[24][13] = TILE_TYPES.BASE_DESTROYED;
                        this.game.map.grid[25][12] = TILE_TYPES.BASE_DESTROYED;
                        this.game.map.grid[25][13] = TILE_TYPES.BASE_DESTROYED;
                        this.game.gameOver();
                    }
                    this.game.shakeScreen(8);
                }
            } else {
                this.triggerExplosion(this.x + this.size/2, this.y + this.size/2);
            }
            this.active = false;
            return;
        }
        const isEnemyBullet = this.owner instanceof Enemy;
        const tanks = isEnemyBullet ? this.game.players : this.game.enemies;
        for (const tank of tanks) {
            if (!tank.alive) continue;
            if (tank.canFly && this.owner instanceof Enemy) continue;
            if (this.x < tank.x + tank.width && this.x + this.size > tank.x && this.y < tank.y + tank.height && this.y + this.size > tank.y) { 
                this.triggerExplosion(this.x + this.size/2, this.y + this.size/2); 
                tank.destroy(this.owner, this.damage); 
                if (!this.piercing) { this.active = false; break; }
            }
        }
    }
    triggerExplosion(ex, ey, small = false) {
        let radius = 0.5;
        if (!small && this.type === 'EXPLOSIVE') {
            if (this.level >= 5) radius = 3.5;
            else if (this.level >= 3) radius = 2.5;
            else radius = 1.5;
        }
        audio.play('explosion');
        this.game.effects.push(new Effect(ex, ey, 'EXPLOSION', radius));
        if (small || this.type !== 'EXPLOSIVE') return;
        
        const gridX = Math.floor(ex / TILE_SIZE); const gridY = Math.floor(ey / TILE_SIZE); const range = Math.ceil(radius);
        for (let iy = gridY - range; iy <= gridY + range; iy++) {
            for (let ix = gridX - range; ix <= gridX + range; ix++) {
                if (iy >= 0 && iy < GRID_SIZE && ix >= 0 && ix < GRID_SIZE) {
                    let d = Math.hypot(ix - gridX, iy - gridY);
                    if (d <= radius) {
                        let t = this.game.map.grid[iy][ix];
                        if (t === TILE_TYPES.BRICK) {
                            this.game.map.grid[iy][ix] = TILE_TYPES.EMPTY;
                        } else if (t === TILE_TYPES.HARD_BRICK && this.level >= 5) {
                            this.game.map.grid[iy][ix] = TILE_TYPES.EMPTY;
                        } else if (t === TILE_TYPES.STEEL && this.level >= 5 && d <= radius - 1.5) {
                            this.game.map.grid[iy][ix] = TILE_TYPES.EMPTY;
                        }
                    }
                }
            }
        }
        
        const targets = (this.owner instanceof Enemy) ? this.game.players : this.game.enemies;
        for (const tank of targets) {
            if (!tank.alive) continue;
            let d = Math.hypot(tank.x/TILE_SIZE - gridX, tank.y/TILE_SIZE - gridY);
            if (d <= radius + 0.5) tank.destroy(this.owner || this, this.damage);
        }
    }
    draw(ctx) { 
        ctx.save(); 
        if (this.type === 'LASER' || this.type === 'LASER_MISSILE') {
            ctx.fillStyle = '#0ff';
            ctx.shadowBlur = 10; ctx.shadowColor = '#0ff';
            ctx.fillRect(this.x, this.y, this.dir === 'UP' || this.dir === 'DOWN' ? this.size/2 : this.size*2, this.dir === 'UP' || this.dir === 'DOWN' ? this.size*2 : this.size/2);
        } else if (this.type === 'MISSILE') {
            ctx.fillStyle = '#f55';
            ctx.shadowBlur = 10; ctx.shadowColor = '#f00';
            ctx.beginPath(); ctx.arc(this.x + this.size/2, this.y + this.size/2, this.size/2, 0, Math.PI * 2); ctx.fill();
            if (Math.random() < 0.5) this.game.effects.push(new Effect(this.x + this.size/2, this.y + this.size/2, 'EXPLOSION', 0.2));
        } else {
            ctx.fillStyle = this.level >= 1 ? '#ff0' : '#fff'; 
            ctx.beginPath(); ctx.arc(this.x + this.size/2, this.y + this.size/2, this.size/2, 0, Math.PI * 2); ctx.fill(); 
            if (this.level >= 1) { ctx.shadowBlur = 15; ctx.shadowColor = this.level >= 1 ? '#ff0' : '#fff'; } 
        }
        ctx.restore(); 
    }
}

class Tank {
    constructor(game, x, y, color) { this.game = game; this.x = x; this.y = y; this.width = 60; this.height = 60; this.color = color; this.direction = 'UP'; this.speed = 4; this.cooldown = 0; this.alive = true; this.shieldTimer = 0; this.level = 0; this.score = 0; this.weaponClass = 'NORMAL'; }
    setShield(d) { this.shieldTimer = d; }
    upgrade() { 
        if (this.level >= 9) return;
        this.level++;
        this.speed = Math.min(8, 4 + this.level * 0.15); 
        if (this instanceof Player) {
            this.game.showFloatingText(`LEVEL ${this.level}!`, this.x, this.y, '#0f0');
            this.game.updateHUD();
        }
    }
    update() { if (this.cooldown > 0) this.cooldown--;
        if (this.overdriveTimer > 0) this.overdriveTimer--; if (this.shieldTimer > 0) this.shieldTimer--; if (this.flyBombCooldown > 0) this.flyBombCooldown--; }
    move(dir) {
        this.direction = dir; let nx = this.x; let ny = this.y;
        const onWater = this.game.map.isOnWater(this.x, this.y, this.width, this.height);
        const moveSpeed = onWater ? this.speed * 0.5 : this.speed;
        if (dir === 'UP') ny -= moveSpeed; else if (dir === 'DOWN') ny += moveSpeed; else if (dir === 'LEFT') nx -= moveSpeed; else if (dir === 'RIGHT') nx += moveSpeed;
        if (!this.game.map.isBlocked(nx, ny, this.width, this.height, false, this.canBoat, this.canFly)) { 
            this.x = nx; this.y = ny; this.onIce = false; 
            this.moveCounter = (this.moveCounter || 0) + 1;
            if (this.moveCounter % 5 === 0) this.game.effects.push(new Effect(this.x + this.width/2, this.y + this.height/2, 'TRACK', { dir: this.direction, w: this.width, h: this.height }));
        }
        else {
            if (dir === 'UP' || dir === 'DOWN') { 
                const gx = Math.round(this.x / TILE_SIZE) * TILE_SIZE + 2; 
                if (Math.abs(this.x - gx) < 24) {
                    if (this.x < gx) this.x = Math.min(gx, this.x + moveSpeed);
                    else if (this.x > gx) this.x = Math.max(gx, this.x - moveSpeed);
                }
            } else { 
                const cy = this.y + this.height / 2; 
                const gy = Math.round(this.y / TILE_SIZE) * TILE_SIZE + 2; 
                if (Math.abs(this.y - gy) < 24) {
                    if (this.y < gy) this.y = Math.min(gy, this.y + moveSpeed);
                    else if (this.y > gy) this.y = Math.max(gy, this.y - moveSpeed);
                }
            }
        }
        const gx = Math.floor((this.x + this.width/2) / TILE_SIZE);
        const gy = Math.floor((this.y + this.height/2) / TILE_SIZE);
        if (gx >= 0 && gx < GRID_SIZE && gy >= 0 && gy < GRID_SIZE && this.game.map.grid[gy][gx] === TILE_TYPES.ICE) {
            if (!this.onIce) { this.onIce = true; this.iceSlideDir = dir; this.iceSlideTimer = 10; }
        } else { this.onIce = false; }
        if (this.onIce && this.iceSlideTimer > 0) {
            this.iceSlideTimer--;
            let sx = this.x, sy = this.y;
            if (this.iceSlideDir === 'UP') sy -= this.speed * 0.5; else if (this.iceSlideDir === 'DOWN') sy += this.speed * 0.5;
            else if (this.iceSlideDir === 'LEFT') sx -= this.speed * 0.5; else if (this.iceSlideDir === 'RIGHT') sx += this.speed * 0.5;
            if (!this.game.map.isBlocked(sx, sy, this.width, this.height, false, this.canBoat, this.canFly)) { this.x = sx; this.y = sy; }
        }
    }
    shoot() {
        if (!this.alive) return;
        if (this.cooldown > 0) return;
        
        // Cooldown depends on level and type
        this.cooldown = 20 - Math.min(this.level, 5) * 2;
        if (this.weaponClass === 'EXPLOSIVE') this.cooldown += 15;
        if (this.weaponClass === 'LASER') this.cooldown += 10;
        if (this.overdriveTimer > 0) this.cooldown = Math.max(2, Math.floor(this.cooldown * 0.3)); // 70% cooldown reduction in overdrive
        
        audio.play('shoot');
        
        let bx = this.x + this.width / 2 - 4;
        let by = this.y + this.height / 2 - 4;
        if (this.direction === 'UP') by = this.y - 8;
        else if (this.direction === 'DOWN') by = this.y + this.height;
        else if (this.direction === 'LEFT') bx = this.x - 8;
        else if (this.direction === 'RIGHT') bx = this.x + this.width;
        
        let bType = this.weaponClass || 'NORMAL';
        let numShots = 1;
        
        // Weapon Logic Revamp
        if (bType === 'NORMAL' || bType === 'MISSILE') {
            if (this.level >= 9) numShots = 5;
            else if (this.level >= 7) numShots = 4;
            else if (this.level >= 5) numShots = 3;
            else if (this.level >= 3) numShots = 2;
        } else if (bType === 'LASER' || bType === 'EXPLOSIVE') {
            if (this.level >= 8) numShots = 3;
            else if (this.level >= 4) numShots = 2;
            else numShots = 1;
        }
        
        for (let i = 0; i < numShots; i++) {
            let offset = (numShots === 1) ? 0 : (i - (numShots - 1) / 2);
            let bx_i = bx, by_i = by;
            if (this.direction === 'UP' || this.direction === 'DOWN') { bx_i += offset * 12; }
            else { by_i += offset * 12; }
            
            let b = new Bullet(this.game, this, bx_i, by_i, this.direction, this.level, bType);
            this.game.bullets.push(b);
        }
    }

    destroy(killer, damage = 1) {
        if (!this.alive) return;
        if (this.shieldTimer > 0) return; 
        this.health = (this.health || 1) - damage;
        if (this.health > 0) {
            audio.play('hit');
            this.game.effects.push(new Effect(this.x + 30, this.y + 30, 'EXPLOSION', 1));
            if (this instanceof Player) {
                this.game.shakeScreen(4);
                if (this.level > 0) {
                    this.level = Math.max(0, this.level - 1);
                    this.speed = Math.min(8, 4 + this.level * 0.15);
                    this.game.effects.push(new Effect(this.x + 30, this.y + 30, 'EXPLOSION', 1));
                    this.game.showFloatingText('火力下降!', this.x, this.y, '#f00');
                }
                this.shieldTimer = 30;
                this.game.updateHUD();
            } else if (this.variant === 'HEAVY') {
                this.color = this.health === 2 ? '#B56B20' : '#B53120';
            }
            return;
        }
        
        

        this.alive = false; this.game.effects.push(new Effect(this.x + 30, this.y + 30, 'EXPLOSION', this.isBoss ? 3 : 1));
        this.game.shakeScreen(this.isBoss ? 15 : 5);
        if (killer instanceof Player) {
            const points = this.isBoss ? 500 : 100;
            killer.score += points;
            this.game.showFloatingText(`+${points}`, this.x + this.width/2, this.y - 10, '#fff');
            const now = Date.now();
            if (now - killer.lastKillTime < 5000) {
                killer.killStreak++;
            } else {
                killer.killStreak = 1;
            }
            killer.lastKillTime = now;
            
            if (killer.killStreak > 2) {
                this.game.showFloatingText(`${killer.killStreak} COMBO!`, this.x + this.width/2, this.y - 30, '#ff0');
                if (killer.killStreak === 5) this.game.showTip('💡 TIP: 连续击杀不仅能获得分数，连击10次还可以直升1级并获得天赋！', 400);
                this.game.shakeScreen(Math.min(killer.killStreak * 2, 12));
                if (killer.killStreak % 10 === 0) {
                    killer.upgrade();
                }
            }
            // Vampiric Perk hook
            if (killer.perks && killer.perks.includes('VAMPIRIC') && Math.random() < 0.5) {
                killer.health = Math.min(killer.health + 1, killer.maxHealth);
                this.game.showFloatingText('+1 HP', killer.x, killer.y, '#0f0');
            }
        }
        if (this instanceof Player) this.game.handlePlayerDeath(this);
        
        if (this instanceof Enemy) {
            // Wreckage
            this.game.wreckages.push({x: this.x, y: this.y, timer: 600, type: this.isBoss ? 'BOSS' : 'NORMAL'});
            
            // Hit Stop for Boss
            if (this.isBoss) this.game.hitStopTimer = 10;
            
            // Combo
            if (killer instanceof Player) {
                this.game.comboCount++;
                this.game.comboTimer = 180;
                let comboMsg = '';
                if (this.game.comboCount === 2) comboMsg = 'DOUBLE KILL!';
                else if (this.game.comboCount === 3) comboMsg = 'TRIPLE KILL!!';
                else if (this.game.comboCount === 4) comboMsg = 'DOMINATING!!!';
                else if (this.game.comboCount >= 5) comboMsg = 'UNSTOPPABLE!!!!';
                
                if (comboMsg) {
                    this.game.showFloatingText(comboMsg, this.x, this.y - 30, '#f0f');
                    killer.score += this.game.comboCount * 100;
                    if (this.game.comboCount >= 3) this.game.hitStopTimer = 4;
                }
            }
        }
        if (this instanceof Enemy && !this.isBoss) {
            let dropChance = 0.15; // Increased base drop chance
            let type = null;
            
            if (this.weaponClass && this.weaponClass !== 'NORMAL') {
                dropChance = 1.0;
                if (this.weaponClass === 'MISSILE') type = POWERUP_TYPES.W_MISSILE;
                else if (this.weaponClass === 'LASER') type = POWERUP_TYPES.W_LASER;
                else if (this.weaponClass === 'EXPLOSIVE') type = POWERUP_TYPES.W_EXPLOSIVE;
                else if (this.weaponClass === 'SPREAD') type = POWERUP_TYPES.W_SPREAD;
                else if (this.weaponClass === 'BOUNCE') type = POWERUP_TYPES.W_BOUNCE;
            } else {
                let dropTypes = [
                    POWERUP_TYPES.SHIELD, POWERUP_TYPES.BOMB, POWERUP_TYPES.SHOVEL, 
                    POWERUP_TYPES.TIME, POWERUP_TYPES.STAR, 
                    POWERUP_TYPES.W_MISSILE, POWERUP_TYPES.W_MISSILE, POWERUP_TYPES.W_MISSILE, POWERUP_TYPES.W_MISSILE,
                    POWERUP_TYPES.W_LASER, POWERUP_TYPES.W_EXPLOSIVE
                ];
                
                if (this.variant === 'HEAVY') {
                    dropChance = 0.3;
                    dropTypes = [POWERUP_TYPES.LIFE, POWERUP_TYPES.SHOVEL, POWERUP_TYPES.W_EXPLOSIVE, POWERUP_TYPES.W_MISSILE, POWERUP_TYPES.BOMB];
                } else if (this.variant === 'FAST') {
                    dropChance = 0.25;
                    dropTypes = [POWERUP_TYPES.TIME, POWERUP_TYPES.SHIELD, POWERUP_TYPES.W_LASER, POWERUP_TYPES.W_MISSILE];
                } else if (this.variant === 'ELITE') {
                    dropChance = 0.5;
                    dropTypes = [POWERUP_TYPES.STAR, POWERUP_TYPES.STAR, POWERUP_TYPES.LIFE, POWERUP_TYPES.W_EXPLOSIVE, POWERUP_TYPES.W_MISSILE, POWERUP_TYPES.W_MISSILE];
                } else if (this.variant === 'SMART') {
                    dropChance = 0.35;
                    dropTypes = [POWERUP_TYPES.STAR, POWERUP_TYPES.SHIELD, POWERUP_TYPES.W_LASER, POWERUP_TYPES.W_MISSILE];
                } else if (this.variant === 'RAPID') {
                    dropChance = 0.3;
                    dropTypes = [POWERUP_TYPES.STAR, POWERUP_TYPES.W_MISSILE];
                }
                type = dropTypes[Math.floor(Math.random() * dropTypes.length)];
            }

            if (Math.random() < dropChance && type) {
                this.game.powerUps.push(new PowerUp(this.game, this.x, this.y, type));
            }
        }
    }
    draw(ctx) {
        const px = this.x; const py = this.y; const w = this.width; const h = this.height;
        
        // Boss Telegraph
        if (this.isBoss && this.cooldown > 0 && this.cooldown < 20) {
            ctx.save();
            ctx.strokeStyle = `rgba(255, 0, 0, ${(20 - this.cooldown) / 20})`;
            ctx.lineWidth = 4;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            let startX = px + w/2, startY = py + h/2;
            ctx.moveTo(startX, startY);
            if (this.direction === 'UP') ctx.lineTo(startX, startY - 800);
            else if (this.direction === 'DOWN') ctx.lineTo(startX, startY + 800);
            else if (this.direction === 'LEFT') ctx.lineTo(startX - 800, startY);
            else if (this.direction === 'RIGHT') ctx.lineTo(startX + 800, startY);
            ctx.stroke();
            ctx.restore();
        }
        
        ctx.save();
        if (this.overdriveTimer > 0) {
            ctx.shadowBlur = 30 + Math.sin(Date.now() / 50) * 20;
            ctx.shadowColor = Math.floor(Date.now() / 100) % 2 === 0 ? '#ff0000' : '#ffff00';
        } else if (this.level >= 1) {
            ctx.shadowBlur = 8 + Math.min(this.level, 5) * 4;
            ctx.shadowColor = this.level >= 4 ? '#f0f' : (this.level >= 3 ? '#0ff' : (this.level >= 2 ? '#f00' : (this.level >= 1 ? '#ff0' : '#fff')));
        }
        ctx.fillStyle = this.color;
        if (this.direction === 'UP' || this.direction === 'DOWN') {
            ctx.fillRect(px + 8, py + 8, w - 16, h - 16); ctx.fillStyle = '#000'; ctx.fillRect(px, py, 8, h); ctx.fillRect(px + w - 8, py, 8, h);
            ctx.fillStyle = this.color; for (let i = 0; i < h; i += 8) { ctx.fillRect(px, py + i, 8, 4); ctx.fillRect(px + w - 8, py + i, 8, 4); }
            ctx.fillRect(px + w/2 - 8, py + h/2 - 8, 16, 16); ctx.strokeStyle = '#000'; ctx.strokeRect(px + w/2 - 8, py + h/2 - 8, 16, 16);
            ctx.fillStyle = this.level >= 4 ? '#f0f' : (this.level >= 3 ? '#0ff' : (this.level >= 2 ? '#f00' : (this.level >= 1 ? '#ff0' : this.color)));
            const barrelW = 6 + Math.min(this.level, 10) * 2;
            const ext = Math.min(this.level, 4) * 2;
            if (this.direction === 'UP') ctx.fillRect(px + w/2 - barrelW/2, py - 8 - ext, barrelW, 24 + ext);
            else ctx.fillRect(px + w/2 - barrelW/2, py + h - 16, barrelW, 24 + ext);
        } else {
            ctx.fillRect(px + 8, py + 8, w - 16, h - 16); ctx.fillStyle = '#000'; ctx.fillRect(px, py, w, 8); ctx.fillRect(px, py + h - 8, w, 8);
            ctx.fillStyle = this.color; for (let i = 0; i < w; i += 8) { ctx.fillRect(px + i, py, 4, 8); ctx.fillRect(px + i, py + h - 8, 4, 8); }
            ctx.fillRect(px + w/2 - 8, py + h/2 - 8, 16, 16); ctx.strokeStyle = '#000'; ctx.strokeRect(px + w/2 - 8, py + h/2 - 8, 16, 16);
            ctx.fillStyle = this.level >= 4 ? '#f0f' : (this.level >= 3 ? '#0ff' : (this.level >= 2 ? '#f00' : (this.level >= 1 ? '#ff0' : this.color)));
            const barrelW = 6 + Math.min(this.level, 10) * 2;
            const ext = Math.min(this.level, 4) * 2;
            if (this.direction === 'LEFT') ctx.fillRect(px - 8 - ext, py + h/2 - barrelW/2, 24 + ext, barrelW);
            else ctx.fillRect(px + w - 16, py + h/2 - barrelW/2, 24 + ext, barrelW);
        }
        if (this.level >= 1) {
            ctx.fillStyle = this.level >= 1 ? '#fa0' : '#0ff';
            ctx.fillRect(px + 2, py + 2, 6, 6);
            ctx.fillRect(px + w - 8, py + 2, 6, 6);
            ctx.fillRect(px + 2, py + h - 8, 6, 6);
            ctx.fillRect(px + w - 8, py + h - 8, 6, 6);
        }
        ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(px + 12, py + 12, 4, 4); ctx.restore();
        if (this.canBoat) { ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 6; ctx.setLineDash([10, 5]); ctx.strokeRect(px - 6, py - 6, w + 12, h + 12); ctx.setLineDash([]); }
        if (this.canFly) {
            let drawAura = true;
            if (this.flyTimer && this.flyTimer <= 600) {
                drawAura = (this.flyTimer % 10) < 5;
            }
            if (drawAura) {
                ctx.strokeStyle = '#ffaa00'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(px + 30, py + 30, 45, 0, Math.PI * 2); ctx.stroke();
            }
        }
        if (this.shieldTimer > 0) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(px + 30, py + 30, 38, 0, Math.PI * 2); ctx.stroke(); }
    }
}

class Player extends Tank {
    constructor(game, x, y, color, controls, id) {
        super(game, x, y, color);
        this.controls = controls;
        this.id = id;
        this.shownTips = new Set();
        this.health = 1;
        this.maxHealth = 1;
        this.aiActive = false;
        this.lastInputTime = Date.now();
        this.aiDodgeDir = null;
        this.aiDodgeTimer = 0;
        this.aiMoveDir = null;
        this.aiMoveTimer = 0;
        this.killStreak = 0;
        this.lastKillTime = 0;
        this.lives = 2;
    }
    
    draw(ctx) {
        super.draw(ctx);
        if (!this.alive) return;
        
        ctx.save();
        const bounce = Math.sin(Date.now() / 150) * 5;
        const textY = this.y - 15 + bounce;
        const textX = this.x + this.width / 2;
        
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#000';
        
        ctx.strokeText(`P${this.id}`, textX, textY);
        ctx.fillText(`P${this.id}`, textX, textY);
        
        ctx.beginPath();
        ctx.moveTo(textX - 6, textY + 5);
        ctx.lineTo(textX + 6, textY + 5);
        ctx.lineTo(textX, textY + 13);
        ctx.closePath();
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
    
    update() {
        if (!this.alive) return;
        if (this.game.playerFrozenTimer > 0) return;
        if (isNaN(this.x) || isNaN(this.y)) { this.x = TILE_SIZE * 8; this.y = TILE_SIZE * 22; }
        
        if (this.comboTimer > 0) this.comboTimer--; else this.combo = 0;
        
        

        super.update();
        if (this.canFly && this.flyTimer > 0) {
            this.flyTimer--;
            if (this.flyTimer <= 0) {
                if (!this.game.map.isBlocked(this.x, this.y, this.width, this.height, false, this.canBoat, false)) {
                    this.canFly = false;
                    this.game.showFloatingText('降落！', this.x, this.y, '#ccc');
                } else {
                    this.flyTimer = 1;
                }
            }
        }
        this.checkIdle();
        if (this.aiActive) this.runAI();
        else {
            if (this.game.input.isDown(this.controls.up)) this.move('UP');
            else if (this.game.input.isDown(this.controls.down)) this.move('DOWN');
            else if (this.game.input.isDown(this.controls.left)) this.move('LEFT');
            else if (this.game.input.isDown(this.controls.right)) this.move('RIGHT');
            if (this.game.input.isDown(this.controls.shoot)) this.shoot();
        }
    }
    checkIdle() {
        if (!this.alive || this.game.gameState !== 'PLAYING') return;
        const keys = [this.controls.up, this.controls.down, this.controls.left, this.controls.right, this.controls.shoot];
        const anyPressed = keys.some(k => this.game.input.isDown(k));
        if (anyPressed) {
            this.aiActive = false;
            this.lastInputTime = Date.now();
        } else if (!this.aiActive && Date.now() - this.lastInputTime > 5000) {
            this.aiActive = true;
        }
    }
    runAI() {
        const myX = this.x + this.width / 2;
        const myY = this.y + this.height / 2;
        const baseX = 13 * TILE_SIZE;
        const baseY = 24 * TILE_SIZE;

        let threat = this.findIncomingBullet(myX, myY);
        if (threat) {
            if (this.aiDodgeTimer <= 0) {
                this.aiDodgeDir = this.getSmartDodgeDir(threat, myX, myY);
                this.aiDodgeTimer = 15 + Math.floor(Math.random() * 10);
            }
            if (this.aiDodgeTimer > 0) {
                this.aiDodgeTimer--;
                this.move(this.aiDodgeDir);
                this.shoot();
                return;
            }
        }
        this.aiDodgeTimer = 0;

        let nearestEnemy = null;
        let nearestDist = Infinity;
        let baseThreat = null;
        let baseThreatDist = Infinity;
        for (const e of this.game.enemies) {
            if (!e.alive) continue;
            const d = Math.hypot(e.x - this.x, e.y - this.y);
            if (d < nearestDist) { nearestDist = d; nearestEnemy = e; }
            const dBase = Math.hypot(e.x - baseX, e.y - baseY);
            if (dBase < baseThreatDist) { baseThreatDist = dBase; baseThreat = e; }
        }

        let powerUp = null;
        let powerUpDist = Infinity;
        for (const p of this.game.powerUps) {
            if (!p.active) continue;
            const d = Math.hypot(p.x - this.x, p.y - this.y);
            if (d < powerUpDist && d < TILE_SIZE * 10) { powerUpDist = d; powerUp = p; }
        }

        let targetX, targetY;
        if (powerUp && powerUpDist < TILE_SIZE * 8) {
            targetX = powerUp.x + powerUp.width / 2;
            targetY = powerUp.y + powerUp.height / 2;
        } else if (baseThreat && baseThreatDist < TILE_SIZE * 12) {
            targetX = baseThreat.x + baseThreat.width / 2;
            targetY = baseThreat.y + baseThreat.height / 2;
        } else if (nearestEnemy) {
            targetX = nearestEnemy.x + nearestEnemy.width / 2;
            targetY = nearestEnemy.y + nearestEnemy.height / 2;
        } else {
            targetX = baseX;
            targetY = baseY - TILE_SIZE * 3;
        }

        const dx = targetX - myX;
        const dy = targetY - myY;
        let moveDir;
        if (Math.abs(dx) > Math.abs(dy)) moveDir = dx > 0 ? 'RIGHT' : 'LEFT';
        else moveDir = dy > 0 ? 'DOWN' : 'UP';

        if (!this.aiMoveDir) {
            this.aiMoveDir = moveDir;
            this.aiMoveTimer = 30 + Math.floor(Math.random() * 20);
        }
        if (this.aiMoveTimer > 0) {
            this.aiMoveTimer--;
        } else {
            if (moveDir !== this.aiMoveDir) {
                this.aiMoveDir = moveDir;
                this.aiMoveTimer = 30 + Math.floor(Math.random() * 20);
            }
        }

        if (this.isTileBlocked(myX, myY, this.aiMoveDir)) {
            this.aiMoveDir = this.getAlternateDir(this.aiMoveDir, dx, dy, myX, myY);
            this.aiMoveTimer = 20;
        }

        this.move(this.aiMoveDir);

        if (!this.isFacingBase()) {
            let shot = false;
            for (const e of this.game.enemies) {
                if (!e.alive) continue;
                if (this.canShootTarget(e)) { this.shoot(); shot = true; break; }
            }
            if (!shot && Math.random() < 0.03) this.shoot();
        }
    }
    isFacingBase() {
        const baseX = 13 * TILE_SIZE;
        const baseY = 24 * TILE_SIZE;
        const myX = this.x + this.width / 2;
        const myY = this.y + this.height / 2;
        if (this.direction === 'UP' && myY > baseY && Math.abs(myX - baseX) < TILE_SIZE * 3) return true;
        if (this.direction === 'DOWN' && myY < baseY && Math.abs(myX - baseX) < TILE_SIZE * 3) return true;
        if (this.direction === 'LEFT' && myX > baseX && Math.abs(myY - baseY) < TILE_SIZE * 3) return true;
        if (this.direction === 'RIGHT' && myX < baseX && Math.abs(myY - baseY) < TILE_SIZE * 3) return true;
        return false;
    }
    isTileBlocked(x, y, dir) {
        const checkDist = TILE_SIZE * 1.5;
        let tx = x, ty = y;
        if (dir === 'UP') ty -= checkDist; else if (dir === 'DOWN') ty += checkDist;
        else if (dir === 'LEFT') tx -= checkDist; else if (dir === 'RIGHT') tx += checkDist;
        return this.game.map.isBlocked(tx - this.width/2, ty - this.height/2, this.width, this.height, false, this.canBoat, this.canFly);
    }
    getAlternateDir(blockedDir, dx, dy, myX, myY) {
        let dirs = ['UP', 'DOWN', 'LEFT', 'RIGHT'].filter(d => d !== blockedDir);
        if (myX !== undefined && myY !== undefined) {
            dirs = dirs.filter(d => !this.isTileBlocked(myX, myY, d));
        }
        if (dirs.length === 0) {
            const rev = { 'UP': 'DOWN', 'DOWN': 'UP', 'LEFT': 'RIGHT', 'RIGHT': 'LEFT' };
            return rev[blockedDir] || 'UP';
        }
        dirs.sort((a, b) => {
            const costA = (a === 'UP' && dy < 0) || (a === 'DOWN' && dy > 0) || (a === 'LEFT' && dx < 0) || (a === 'RIGHT' && dx > 0) ? 0 : 1;
            const costB = (b === 'UP' && dy < 0) || (b === 'DOWN' && dy > 0) || (b === 'LEFT' && dx < 0) || (b === 'RIGHT' && dx > 0) ? 0 : 1;
            return costA - costB;
        });
        return dirs[0];
    }
    canShootTarget(target) {
        const myX = this.x + this.width / 2;
        const myY = this.y + this.height / 2;
        const tx = target.x + target.width / 2;
        const ty = target.y + target.height / 2;
        const angle = Math.atan2(ty - myY, tx - myX);
        const myAngle = this.direction === 'RIGHT' ? 0 : this.direction === 'DOWN' ? Math.PI/2 : this.direction === 'LEFT' ? Math.PI : -Math.PI/2;
        let diff = Math.abs(angle - myAngle);
        if (diff > Math.PI) diff = Math.PI * 2 - diff;
        if (diff > Math.PI / 4) return false;
        const dist = Math.hypot(tx - myX, ty - myY);
        if (dist > TILE_SIZE * 12) return false;
        const steps = Math.ceil(dist / TILE_SIZE);
        for (let i = 1; i < steps; i++) {
            const px = myX + Math.cos(angle) * i * TILE_SIZE;
            const py = myY + Math.sin(angle) * i * TILE_SIZE;
            const gx = Math.floor(px / TILE_SIZE);
            const gy = Math.floor(py / TILE_SIZE);
            if (gx < 0 || gx >= GRID_SIZE || gy < 0 || gy >= GRID_SIZE) return false;
            const tile = this.game.map.grid[gy][gx];
            if (tile === TILE_TYPES.BRICK || tile === TILE_TYPES.STEEL) return false;
        }
        return true;
    }
    findIncomingBullet(x, y) {
        const range = TILE_SIZE * 6;
        for (const b of this.game.bullets) {
            if (!b.active || !(b.owner instanceof Player)) continue;
            let incoming = false;
            if (b.dir === 'DOWN' && Math.abs(b.x + b.size/2 - x) < 24 && b.y < y && y - b.y < range) incoming = true;
            if (b.dir === 'UP' && Math.abs(b.x + b.size/2 - x) < 24 && b.y > y && b.y - y < range) incoming = true;
            if (b.dir === 'RIGHT' && Math.abs(b.y + b.size/2 - y) < 24 && b.x < x && x - b.x < range) incoming = true;
            if (b.dir === 'LEFT' && Math.abs(b.y + b.size/2 - y) < 24 && b.x > x && b.x - x < range) incoming = true;
            if (incoming) return b;
        }
        return null;
    }
    getPerpendicularDir(dir) {
        if (dir === 'UP' || dir === 'DOWN') return Math.random() < 0.5 ? 'LEFT' : 'RIGHT';
        return Math.random() < 0.5 ? 'UP' : 'DOWN';
    }
    getSmartDodgeDir(bullet, myX, myY) {
        const perpDirs = (bullet.dir === 'UP' || bullet.dir === 'DOWN') ? ['LEFT', 'RIGHT'] : ['UP', 'DOWN'];
        const validDirs = perpDirs.filter(d => !this.isTileBlocked(myX, myY, d));
        if (validDirs.length > 0) return validDirs[Math.floor(Math.random() * validDirs.length)];
        return perpDirs[0];
    }
}
class Enemy extends Tank { 
    constructor(game, x, y, stage = 0) { 
        super(game, x, y, COLORS.ENEMY); 
        const diffMult = game.difficulty === 'easy' ? 0.8 : (game.difficulty === 'hard' ? 1.2 : 1); 
        const r = Math.random();
        
        if (stage > 4 && r < 0.15) this.variant = 'ELITE';
        else if (stage > 2 && r < 0.3) this.variant = 'HEAVY';
        else if (stage > 3 && r < 0.45) this.variant = 'SMART';
        else if (stage > 5 && r < 0.6) this.variant = 'RAPID';
        else if (r < 0.75) this.variant = 'FAST';
        else this.variant = 'BASIC';

        if (this.variant === 'FAST') { this.speed = (2.5 + Math.min(stage * 0.05, 0.8)) * diffMult; this.health = 1; this.color = '#FF9999'; }
        else if (this.variant === 'HEAVY') { 
            this.speed = (1.0 + Math.min(stage * 0.02, 0.5)) * diffMult; this.health = 3 + Math.floor(stage / 10); this.color = '#777777'; 
            if (Math.random() < 0.3) this.weaponClass = 'EXPLOSIVE';
        }
        else if (this.variant === 'ELITE') { 
            this.speed = (1.8 + Math.min(stage * 0.05, 0.8)) * diffMult; this.health = 3 + Math.floor(stage / 5); this.level = Math.min(3, 1 + Math.floor(stage / 10)); this.color = '#FF55FF'; 
            const wClasses = ['LASER', 'SPREAD', 'BOUNCE'];
            this.weaponClass = wClasses[Math.floor(Math.random() * wClasses.length)];
        }
        else if (this.variant === 'SMART') { this.speed = (1.6 + Math.min(stage * 0.05, 0.8)) * diffMult; this.health = 2; this.color = '#55FFFF'; }
        else if (this.variant === 'RAPID') { 
            this.speed = (1.2 + Math.min(stage * 0.05, 0.8)) * diffMult; this.health = 2; this.color = '#FFFF55'; 
            if (Math.random() < 0.2) this.weaponClass = 'SPREAD';
        }
        else { this.speed = (1.5 + Math.min(stage * 0.05, 0.8)) * diffMult; this.health = 1; this.level = Math.min(3, Math.floor(stage / 15)); }
        
        this.dirTimer = 0; 
    } 
    findIncomingBullet() {
        const range = TILE_SIZE * 6; const cx = this.x + this.width/2; const cy = this.y + this.height/2;
        for (const b of this.game.bullets) {
            if (!b.active || b.owner instanceof Enemy) continue;
            let incoming = false;
            if (b.dir === 'DOWN' && Math.abs(b.x + b.size/2 - cx) < 24 && b.y < cy && cy - b.y < range) incoming = true;
            if (b.dir === 'UP' && Math.abs(b.x + b.size/2 - cx) < 24 && b.y > cy && b.y - cy < range) incoming = true;
            if (b.dir === 'RIGHT' && Math.abs(b.y + b.size/2 - cy) < 24 && b.x < cx && cx - b.x < range) incoming = true;
            if (b.dir === 'LEFT' && Math.abs(b.y + b.size/2 - cy) < 24 && b.x > cx && b.x - cx < range) incoming = true;
            if (incoming) return b;
        }
        return null;
    }
    getSmartDodgeDir(bullet) {
        const perpDirs = (bullet.dir === 'UP' || bullet.dir === 'DOWN') ? ['LEFT', 'RIGHT'] : ['UP', 'DOWN'];
        const validDirs = perpDirs.filter(d => !this.isTileBlocked(this.x, this.y, d));
        if (validDirs.length > 0) return validDirs[Math.floor(Math.random() * validDirs.length)];
        return perpDirs[0];
    }
    update() { 
        super.update();
        if (this.canFly && this.flyTimer > 0) {
            this.flyTimer--;
            if (this.flyTimer <= 0) {
                if (!this.game.map.isBlocked(this.x, this.y, this.width, this.height, false, this.canBoat, false)) {
                    this.canFly = false; this.game.showFloatingText('降落！', this.x, this.y, '#ccc');
                } else this.flyTimer = 1;
            }
        } 
        if (this.game.enemyFrozenTimer > 0) return;
        
        if (this.variant === 'SMART' || this.variant === 'ELITE') {
            const incBullet = this.findIncomingBullet();
            if (incBullet) {
                this.direction = this.getSmartDodgeDir(incBullet);
                this.dirTimer = 10;
            } else if (this.dirTimer <= 0) {
                let nearestP = null; let nearestD = Infinity;
                for (const p of this.game.players) {
                    if (!p.alive) continue;
                    const d = Math.hypot(p.x - this.x, p.y - this.y);
                    if (d < nearestD) { nearestD = d; nearestP = p; }
                }
                if (nearestP && Math.random() < 0.6) {
                    let dx = nearestP.x - this.x; let dy = nearestP.y - this.y;
                    if (Math.abs(dx) > Math.abs(dy)) this.direction = dx > 0 ? 'RIGHT' : 'LEFT';
                    else this.direction = dy > 0 ? 'DOWN' : 'UP';
                } else this.direction = ['UP', 'DOWN', 'LEFT', 'RIGHT'][Math.floor(Math.random() * 4)];
                this.dirTimer = 30 + Math.random() * 30;
            } else this.dirTimer--;
        } else {
            if (this.dirTimer <= 0) { 
                this.direction = ['UP', 'DOWN', 'LEFT', 'RIGHT'][Math.floor(Math.random() * 4)]; 
                this.dirTimer = 30 + Math.random() * 60; 
            } else this.dirTimer--; 
        }
        
        const ox = this.x; const oy = this.y; 
        this.move(this.direction); 
        if (this.x === ox && this.y === oy) this.dirTimer = 0; 
        
        let shootChance = this.variant === 'ELITE' ? 4 : 2;
        if (this.variant === 'RAPID') shootChance = 8;
        if (Math.random() * 100 < shootChance) this.shoot(); 
    }
}

class Boss extends Enemy {
    constructor(game, x, y, stage = 0) {
        super(game, x, y, stage);
        const difficulty = Math.min(stage / 50, 1);
        
        const variants = [
            'SPREAD', 'HEAVY', 'FAST', 'GREEDY', 'CHASER', 'ENRAGE', 'SNOW_YETI',
            'LAZY', 'COWARD', 'BOMBER', 'NINJA', 'DANCER', 'SHIELDER', 'SUMMONER',
            'THIEF', 'GIANT', 'TINY', 'GHOST', 'DRUNK', 'MIMIC'
        ];
        this.bossVariant = variants[Math.floor(Math.random() * variants.length)];
        
        let scaleMult = 1;
        let hpMult = 1;
        let speedMult = 1;
        
        this.title = 'MECH OVERLORD';
        this.color = `hsl(${200 + Math.random() * 40}, 60%, 35%)`;
        this.canFly = false;
        
        if (this.bossVariant === 'HEAVY') { scaleMult = 1.3; hpMult = 1.8; speedMult = 0.5; this.title = 'JUGGERNAUT'; this.color = '#700'; }
        else if (this.bossVariant === 'FAST') { scaleMult = 0.8; hpMult = 0.6; speedMult = 1.6; this.title = 'PHANTOM'; this.color = '#007'; }
        else if (this.bossVariant === 'GREEDY') { this.title = 'GREEDY GOBLIN'; this.color = '#0a0'; }
        else if (this.bossVariant === 'CHASER') { speedMult = 1.3; this.title = 'BLOOD HOUND'; this.color = '#a00'; }
        else if (this.bossVariant === 'ENRAGE') { this.title = 'BERSERKER'; this.color = '#500'; }
        else if (this.bossVariant === 'SNOW_YETI') { this.title = 'SNOW YETI'; this.color = '#fff'; }
        else if (this.bossVariant === 'LAZY') { speedMult = 0.6; this.title = 'SLOTHY'; this.color = '#888'; }
        else if (this.bossVariant === 'COWARD') { speedMult = 1.5; this.title = 'RUNNER'; this.color = '#0aa'; }
        else if (this.bossVariant === 'BOMBER') { this.title = 'BOMBERMAN'; this.color = '#f80'; }
        else if (this.bossVariant === 'NINJA') { speedMult = 1.5; hpMult = 0.8; this.title = 'NINJA MASTER'; this.color = '#222'; }
        else if (this.bossVariant === 'DANCER') { this.title = 'DISCO DANCER'; this.color = '#f0f'; }
        else if (this.bossVariant === 'SHIELDER') { hpMult = 1.2; this.title = 'TURTLE'; this.color = '#00a'; }
        else if (this.bossVariant === 'SUMMONER') { this.title = 'NECROMANCER'; this.color = '#a0a'; }
        else if (this.bossVariant === 'THIEF') { speedMult = 2; hpMult = 0.5; this.title = 'BANDIT'; this.color = '#880'; }
        else if (this.bossVariant === 'GIANT') { scaleMult = 2.0; hpMult = 3.0; speedMult = 0.3; this.title = 'TITAN'; this.color = '#444'; }
        else if (this.bossVariant === 'TINY') { scaleMult = 0.5; hpMult = 0.3; speedMult = 2.5; this.title = 'ANT'; this.color = '#ff0'; }
        else if (this.bossVariant === 'GHOST') { this.canFly = true; this.title = 'POLTERGEIST'; this.color = '#aaa'; }
        else if (this.bossVariant === 'DRUNK') { this.title = 'DRUNKARD'; this.color = '#a50'; }
        else if (this.bossVariant === 'MIMIC') { this.title = 'DOPPELGANGER'; this.color = '#ccc'; }
        else if (this.bossVariant === 'SPREAD') { this.title = 'MACHINE GUNNER'; }
        
        const scale = (1.5 + Math.random() * 0.5 + difficulty * 0.5) * scaleMult;
        this.width = TILE_SIZE * scale; this.height = TILE_SIZE * scale;
        
        // Ensure starting players can defeat the boss with skillful movement (~15-30 hits for normal boss)
        const avgPlayerLvl = Math.max(1, ...this.game.players.map(p => p.level || 1));
        this.health = Math.floor((15 + stage * 3 + avgPlayerLvl * 2) * hpMult); 
        this.maxHealth = this.health;
        this.speed = (1.0 + difficulty * 0.8) * speedMult; 
        this.baseSpeed = this.speed;
        this.isBoss = true;
        this.turretAngle = 0; this.turretTargetAngle = 0;
        this.barrelLength = this.width * 0.6;
        this.level = 2 + Math.floor(difficulty * 2);
        this.metalColor = `hsl(0, 0%, ${40 + Math.random() * 20}%)`;
        
        const weathers = ['RAIN', 'SNOW', 'WIND', 'LIGHTNING'];
        this.game.weather = weathers[Math.floor(Math.random() * weathers.length)];
        
        if (this.bossVariant === 'SNOW_YETI' && this.game.weather === 'SNOW') {
            this.speed *= 1.5;
            this.baseSpeed = this.speed;
            this.health *= 1.5;
            this.maxHealth = this.health;
        }
        
        this.stateTimer = 0;
        this.ninjaTeleportCd = 300;
        this.shieldActive = false;
        this.shieldCooldown = 300;
        this.summonCooldown = 400;
        this.trickeryCooldown = 300 + Math.random() * 300;
        this.stealthTimer = 0;
    }
    
    draw(ctx) {
        if (this.stealthTimer > 0) ctx.globalAlpha = 0.2;
        super.draw(ctx);
        if (this.stealthTimer > 0) ctx.globalAlpha = 1.0;
    }
    shoot() {
        if (this.cooldown > 0 || (this.bossVariant === 'LAZY' && this.stateTimer > 0)) return; 
        if (this.bossVariant === 'SHIELDER' && this.shieldActive) return;
        
        let cdBase = 25;
        let offsets = [-0.25, 0, 0.25];
        let bType = 'NORMAL';
        
        if (this.bossVariant === 'HEAVY' || this.bossVariant === 'GIANT') {
            cdBase = 45; offsets = [0];
        } else if (this.bossVariant === 'FAST' || this.bossVariant === 'TINY') {
            cdBase = 10; offsets = [-0.15, 0.15];
        } else if (this.bossVariant === 'SNOW_YETI' && this.game.weather === 'SNOW') {
            offsets = [-0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75];
        } else if (this.bossVariant === 'BOMBER') {
            bType = 'EXPLOSIVE'; cdBase = 60; offsets = [0];
        } else if (this.bossVariant === 'DANCER') {
            cdBase = 8; offsets = [0]; this.turretAngle += 0.5;
        } else if (this.bossVariant === 'MIMIC') {
            if (this.game.players.length > 0 && this.game.players[0].alive) {
                bType = this.game.players[0].weaponClass || 'NORMAL';
            }
        } else if (this.bossVariant === 'NINJA') {
            bType = 'BOUNCE';
        }
        
        if (this.bossVariant === 'ENRAGE' && this.health < this.maxHealth * 0.3) {
            cdBase /= 2;
        }
        
        this.cooldown = Math.max(cdBase, cdBase + 20 - this.level * 4);
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        
        for (let offset of offsets) {
            let angle = this.turretAngle + offset;
            if (this.bossVariant === 'DRUNK') angle += (Math.random() - 0.5) * 2;
            if (this.bossVariant === 'DANCER') angle = this.turretAngle;

            const bx = cx + Math.cos(angle) * (this.barrelLength + 10);
            const by = cy + Math.sin(angle) * (this.barrelLength + 10);
            
            let normAngle = Math.atan2(Math.sin(angle), Math.cos(angle));
            let dir = 'DOWN';
            if (normAngle > -Math.PI/4 && normAngle <= Math.PI/4) dir = 'RIGHT';
            else if (normAngle > Math.PI/4 && normAngle <= 3*Math.PI/4) dir = 'DOWN';
            else if (normAngle > -3*Math.PI/4 && normAngle <= -Math.PI/4) dir = 'UP';
            else dir = 'LEFT';
            
            const gx = Math.floor(bx / TILE_SIZE);
            const gy = Math.floor(by / TILE_SIZE);
            if (gx >= 0 && gx < GRID_SIZE && gy >= 0 && gy < GRID_SIZE) {
                const tile = this.game.map.grid[gy][gx];
                if (tile !== TILE_TYPES.BRICK && tile !== TILE_TYPES.STEEL && !this.canFly) {
                    let blvl = this.level;
                    if (this.bossVariant === 'HEAVY' || this.bossVariant === 'GIANT') blvl += 2; 
                    let b = new Bullet(this.game, this, bx - 8, by - 8, dir, blvl, bType);
                    b.vx = Math.cos(angle) * b.speed;
                    b.vy = Math.sin(angle) * b.speed;
                    this.game.bullets.push(b);
                } else if (this.canFly) {
                    let blvl = this.level;
                    let b = new Bullet(this.game, this, bx - 8, by - 8, dir, blvl, bType);
                    b.vx = Math.cos(angle) * b.speed;
                    b.vy = Math.sin(angle) * b.speed;
                    this.game.bullets.push(b);
                }
            }
        }
        audio.play('shoot');
    }
    update() {
        this.cooldown--;
        this.shieldTimer--;
        
        if (this.game.enemyFrozenTimer > 0) return;
        
        let nearestEnemy = null;
        let nearestDist = Infinity;
        for (const p of this.game.players) {
            if (!p.alive) continue;
            const d = Math.hypot(p.x - this.x, p.y - this.y);
            if (d < nearestDist) { nearestDist = d; nearestEnemy = p; }
        }
        
        if (this.bossVariant === 'ENRAGE') {
            if (this.health < this.maxHealth * 0.3) {
                this.speed = this.baseSpeed * 2.5;
                this.color = '#f00';
            }
        }
        if (this.bossVariant === 'LAZY') {
            if (this.stateTimer <= 0) {
                if (Math.random() < 0.2) this.stateTimer = 180;
                else this.stateTimer = -300;
            }
            if (this.stateTimer > 0) {
                this.stateTimer--;
                if (this.stateTimer % 30 === 0) this.game.showFloatingText('Zzz...', this.x + this.width/2, this.y, '#fff');
                return;
            }
            if (this.stateTimer < 0) this.stateTimer++;
        }
        if (this.bossVariant === 'NINJA') {
            this.ninjaTeleportCd--;
            if (this.ninjaTeleportCd <= 0 && nearestEnemy) {
                this.x = nearestEnemy.x + (Math.random() > 0.5 ? 150 : -150);
                this.y = nearestEnemy.y + (Math.random() > 0.5 ? 150 : -150);
                this.x = Math.max(0, Math.min(CANVAS_SIZE - this.width, this.x));
                this.y = Math.max(0, Math.min(CANVAS_SIZE - this.height, this.y));
                this.ninjaTeleportCd = 300;
                this.game.effects.push(new Effect(this.x + this.width/2, this.y + this.height/2, 'SPAWN', 3));
            }
        }
        if (this.bossVariant === 'SHIELDER') {
            this.shieldCooldown--;
            if (this.shieldCooldown <= 0) {
                this.shieldActive = true;
                this.shieldCooldown = 400; 
                this.setShield(180); 
            }
            if (this.shieldTimer <= 0) this.shieldActive = false;
        }
        if (this.bossVariant === 'SUMMONER') {
            this.summonCooldown--;
            if (this.summonCooldown <= 0) {
                this.summonCooldown = 300;
                this.game.effects.push(new Effect(this.x + this.width/2, this.y + this.height/2, 'SPAWN', 3));
                this.game.enemies.push(new Enemy(this.game, this.x, this.y + this.height + 10, this.game.currentStage));
            }
        }
        
        if (this.game.enemyFrozenTimer <= 0) {
            if (this.trickeryCooldown > 0) this.trickeryCooldown--;
            if (this.trickeryCooldown <= 0) {
                this.stealthTimer = 240; 
                this.trickeryCooldown = 500 + Math.random() * 500; 
                this.game.showAnnouncement(`⚠️ 狡猾的Boss使用了隐身术！`, '#f0f');
                for (let i = 0; i < 3; i++) {
                    let rx = this.x + (Math.random() - 0.5) * TILE_SIZE * 8;
                    let ry = this.y + (Math.random() - 0.5) * TILE_SIZE * 8;
                    rx = Math.max(0, Math.min(CANVAS_SIZE - 32, rx));
                    ry = Math.max(0, Math.min(CANVAS_SIZE - 32, ry));
                    this.game.powerUps.push(new PowerUp(this.game, rx, ry, POWERUP_TYPES.FAKE_BOMB));
                }
            }
            if (this.stealthTimer > 0) {
                this.stealthTimer--;
                if (this.stealthTimer % 30 === 0 && Math.random() < 0.5) {
                    let rx = this.x + (Math.random() - 0.5) * TILE_SIZE * 6;
                    let ry = this.y + (Math.random() - 0.5) * TILE_SIZE * 6;
                    rx = Math.max(0, Math.min(CANVAS_SIZE - 32, rx));
                    ry = Math.max(0, Math.min(CANVAS_SIZE - 32, ry));
                    this.game.powerUps.push(new PowerUp(this.game, rx, ry, POWERUP_TYPES.FAKE_BOMB));
                }
            }
        }
        
        let targetX = this.x; let targetY = this.y;
        let moving = false;
        
        if (this.bossVariant === 'GREEDY') {
            let nearestPowerup = null;
            let pDist = Infinity;
            for (const p of this.game.powerUps) {
                const d = Math.hypot(p.x - this.x, p.y - this.y);
                if (d < pDist) { pDist = d; nearestPowerup = p; }
            }
            if (nearestPowerup) {
                targetX = nearestPowerup.x; targetY = nearestPowerup.y;
                moving = true;
                if (pDist < this.width) {
                    nearestPowerup.active = false; 
                    this.health = Math.min(this.maxHealth, this.health + 50);
                    this.game.showFloatingText('+50 HP', this.x, this.y, '#0f0');
                }
            }
        }
        if (!moving && nearestEnemy) {
            if (this.bossVariant === 'CHASER' || this.bossVariant === 'ENRAGE') {
                targetX = nearestEnemy.x; targetY = nearestEnemy.y; moving = true;
            } else if (this.bossVariant === 'COWARD') {
                if (nearestDist < TILE_SIZE * 8) {
                    targetX = this.x + (this.x - nearestEnemy.x);
                    targetY = this.y + (this.y - nearestEnemy.y);
                    moving = true;
                }
            } else if (this.bossVariant === 'DRUNK' || this.bossVariant === 'DANCER') {
                if (this.dirTimer <= 0) {
                    this.dirTimer = 30 + Math.random() * 30;
                    this.direction = ['UP', 'DOWN', 'LEFT', 'RIGHT'][Math.floor(Math.random() * 4)];
                } else this.dirTimer--;
            } else {
                if (this.dirTimer <= 0) {
                    this.dirTimer = 30 + Math.random() * 60;
                    this.direction = ['UP', 'DOWN', 'LEFT', 'RIGHT'][Math.floor(Math.random() * 4)];
                } else this.dirTimer--;
            }
        }
        
        if (moving) {
            let dx = targetX - this.x; let dy = targetY - this.y;
            if (Math.abs(dx) > Math.abs(dy)) this.direction = dx > 0 ? 'RIGHT' : 'LEFT';
            else this.direction = dy > 0 ? 'DOWN' : 'UP';
        }
        
        const ox = this.x; const oy = this.y; 
        if (this.bossVariant !== 'SUMMONER' || !this.shieldActive) {
            this.move(this.direction); 
        }
        if (this.x === ox && this.y === oy) this.dirTimer = 0; 
        
        if (nearestEnemy) {
            const cx = this.x + this.width / 2;
            const cy = this.y + this.height / 2;
            if (this.bossVariant !== 'DANCER') {
                this.turretTargetAngle = Math.atan2(nearestEnemy.y + nearestEnemy.height/2 - cy, nearestEnemy.x + nearestEnemy.width/2 - cx);
            }
            if (nearestDist < TILE_SIZE * 15 && Math.random() < 0.1) this.shoot();
        }
        let diff = this.turretTargetAngle - this.turretAngle;
        if (isNaN(diff)) diff = 0;
        diff = (diff + Math.PI) % (Math.PI * 2);
        if (diff < 0) diff += Math.PI * 2;
        diff -= Math.PI;
        this.turretAngle += diff * 0.1;
        
        for (const p of this.game.players) {
            if (!p.alive) continue;
            if (this.x < p.x + p.width && this.x + this.width > p.x && this.y < p.y + p.height && this.y + this.height > p.y) {
                p.destroy(this, 999);
                if (this.bossVariant === 'THIEF') {
                    p.score = Math.max(0, p.score - 500);
                    this.game.showFloatingText('-500 SCORE!', p.x, p.y, '#f00');
                }
            }
        }
    }
    destroy(killer, damage = 1) {
        if (!this.alive) return;
        if (this.shieldTimer > 0) {
            audio.play('hit');
            this.game.effects.push(new Effect(this.x + this.width/2, this.y + this.height/2, 'EXPLOSION', 1));
            return;
        }
        this.health -= damage; 
        this.game.effects.push(new Effect(this.x + Math.random()*this.width, this.y + Math.random()*this.height, 'EXPLOSION', 2.5));
        audio.play('hit');
        const oldColor = this.color;
        this.color = '#ffffff';
        setTimeout(() => { if (this.alive) this.color = oldColor; }, 100);

        if (this.health <= 0) {
            this.alive = false; this.game.weather = 'NONE';
            for (let i = 0; i < 12; i++) {
                const standardTypes = [POWERUP_TYPES.SHIELD, POWERUP_TYPES.BOMB, POWERUP_TYPES.SHOVEL, POWERUP_TYPES.TIME, POWERUP_TYPES.LIFE, POWERUP_TYPES.STAR, POWERUP_TYPES.STAR, POWERUP_TYPES.W_LASER, POWERUP_TYPES.W_EXPLOSIVE];
                const angle = (i / 12) * Math.PI * 2;
                const dist = TILE_SIZE * 3;
                let px = this.x + this.width/2 + Math.cos(angle) * dist - 32;
                let py = this.y + this.height/2 + Math.sin(angle) * dist - 32;
                px = Math.max(0, Math.min(CANVAS_SIZE - 64, px));
                py = Math.max(0, Math.min(CANVAS_SIZE - 64, py));
                this.game.powerUps.push(new PowerUp(this.game, px, py, standardTypes[Math.floor(Math.random()*standardTypes.length)]));
            }
            
            for(let i = 0; i < 5; i++) {
                setTimeout(() => {
                    this.game.effects.push(new Effect(this.x + Math.random()*this.width, this.y + Math.random()*this.height, 'EXPLOSION', 3));
                    audio.play('explosion');
                }, i * 200);
            }
            this.game.effects.push(new Effect(this.x + this.width/2, this.y + this.height/2, 'EXPLOSION', 8));
            this.game.shakeScreen(40);
            
            this.game.baseHealth = this.game.maxBaseHealth;
            this.game.fortifyBase();
            this.game.enemies.forEach(e => { if (e !== this && e.alive) e.destroy(killer, 999); });
            
            if (killer instanceof Player) { 
                killer.score += 20000; 
                killer.level = Math.max(killer.level, 2); 
                killer.speed = Math.min(8, 4 + killer.level * 0.15);
                killer.setShield(600);
                this.game.showFloatingText('+20000', this.x + this.width/2, this.y - 20, '#ff0');
                this.game.showAnnouncement('BOSS 陨落! BOSS DESTROYED!', '#ff0');
                this.game.showAnnouncement('基地防御加强! BASE FORTIFIED!', '#0f0');
                this.game.updateHUD(); 
            }
        }
    }
    draw(ctx) {
        const px = this.x; const py = this.y; const w = this.width; const h = this.height;
        const cx = px + w / 2; const cy = py + h / 2;
        ctx.save();
        
        if (this.bossVariant === 'GHOST') {
            ctx.globalAlpha = 0.5;
        }
        
        const cBase = this.color;
        const cHighlight = this.metalColor;
        
        ctx.fillStyle = cBase; ctx.fillRect(px, py, w, h);
        ctx.fillStyle = cHighlight; ctx.fillRect(px + 4, py + 4, w - 8, h - 8);
        ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
            const offset = 8 + i * 6;
            if (w - offset * 2 > 0) ctx.strokeRect(px + offset, py + offset, w - offset * 2, h - offset * 2);
        }
        
        ctx.fillStyle = '#222';
        ctx.fillRect(px - 6, py + 4, 8, h - 8);
        ctx.fillRect(px + w - 2, py + 4, 8, h - 8);
        ctx.fillStyle = '#111';
        for (let i = 0; i < h; i += 10) {
            ctx.fillRect(px - 6, py + i, 8, 5);
            ctx.fillRect(px + w - 2, py + i, 8, 5);
        }
        
        ctx.fillStyle = '#444'; ctx.fillRect(px + w/2 - 20, py + h/2 - 20, 40, 40);
        ctx.fillStyle = '#555'; ctx.beginPath(); ctx.arc(cx, cy, 16, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.fill();
        
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(this.turretAngle);
        ctx.fillStyle = '#444'; 
        ctx.fillRect(0, -5, this.barrelLength, 10);
        
        if (this.bossVariant === 'SPREAD' || this.bossVariant === 'SNOW_YETI') {
            ctx.fillStyle = '#4a4a5a'; 
            ctx.rotate(-0.25); ctx.fillRect(0, -3, this.barrelLength - 10, 6); ctx.rotate(0.5);
            ctx.fillRect(0, -3, this.barrelLength - 10, 6); ctx.rotate(-0.25);
        } else if (this.bossVariant === 'FAST' || this.bossVariant === 'TINY') {
            ctx.fillStyle = '#4a4a5a';
            ctx.fillRect(0, -12, this.barrelLength, 6);
            ctx.fillRect(0, 6, this.barrelLength, 6);
        }
        
        ctx.fillStyle = '#5a5a6a'; ctx.fillRect(this.barrelLength - 15, -7, 15, 14);
        ctx.fillStyle = '#6a6a7a'; ctx.fillRect(this.barrelLength - 8, -4, 8, 8);
        ctx.fillStyle = '#7a7a8a'; ctx.fillRect(this.barrelLength - 3, -2, 6, 4);
        
        ctx.fillStyle = '#3a3a4a'; ctx.fillRect(-8, -8, 16, 16);
        ctx.strokeStyle = '#5a5a6a'; ctx.lineWidth = 1; ctx.strokeRect(-8, -8, 16, 16);
        ctx.restore();
        
        if (this.shieldTimer > 0) {
            ctx.beginPath();
            ctx.arc(cx, cy, w/2 + 10, 0, Math.PI * 2);
            ctx.strokeStyle = '#0ff';
            ctx.lineWidth = 4;
            ctx.stroke();
        }
        
        ctx.restore();
        
        ctx.fillStyle = this.color === '#ffffff' ? '#ffffff' : this.color; 
        ctx.font = 'bold 16px Arial'; ctx.textAlign = 'center';
        ctx.fillText(this.title, cx, py - 25);
        const barW = w * 0.8; const barH = 8;
        const barX = cx - barW / 2; const barY = py - 18;
        ctx.fillStyle = '#333'; ctx.fillRect(barX, barY, barW, barH);
        const hpRatio = this.health / this.maxHealth;
        ctx.fillStyle = hpRatio > 0.5 ? '#0a0' : (hpRatio > 0.25 ? '#fa0' : '#f00');
        ctx.fillRect(barX, barY, barW * hpRatio, barH);
        ctx.strokeStyle = '#666'; ctx.lineWidth = 1; ctx.strokeRect(barX, barY, barW, barH);
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas'); this.ctx = this.canvas.getContext('2d');
        this.canvas.width = CANVAS_SIZE; this.canvas.height = CANVAS_SIZE; this.input = new InputHandler(); this.map = new GameMap(this);
        this.players = []; this.enemies = []; this.bullets = []; this.effects = []; this.powerUps = []; this.fortifyTimer = 0; this.spawnTimer = 0; this.enemyFrozenTimer = 0; this.playerFrozenTimer = 0;
        this.currentStage = 0; this.gameState = 'START'; this.lives = 3;
        this.hitStopTimer = 0;
        this.replayHistory = [];
        this.replayIndex = 0;
        this.comboCount = 0;
        this.comboTimer = 0;
        this.wreckages = []; this.paused = false;
        this.highScore = parseInt(localStorage.getItem('tankBattleHighScore') || '0');
        this.baseHealth = 5; this.maxBaseHealth = 5;
        this.weather = 'NONE'; this.weatherParticles = [];
        this.shakeX = 0; this.shakeY = 0; this.shakeTimer = 0;
        this.announcements = [];
        this.floatingTexts = [];
        this.shownTips = new Set();
        this.pausePressed = false;
        this.bossWarning = 0;
        this.lastEnemyCount = 0;
        for(let i=0; i<100; i++) this.weatherParticles.push({x: Math.random()*CANVAS_SIZE, y: Math.random()*CANVAS_SIZE, s: 2 + Math.random()*5});
        document.getElementById('start-btn').onclick = () => this.startGame();
        document.getElementById('restart-btn').onclick = () => this.startGame();
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            };
        });
        this.difficulty = 'normal';
        this.canvas.setAttribute('tabindex', '0');
        this.canvas.focus();
        this.canvas.addEventListener('click', () => this.canvas.focus());
        this.loop();
    }
    shakeScreen(intensity) { this.shakeTimer = intensity; this.shakeIntensity = intensity; }
    showAnnouncement(text, color = '#fff') { this.announcements.push({ text, color, timer: 120, y: CANVAS_SIZE / 2 }); }
    showFloatingText(text, x, y, color = '#fff') { this.floatingTexts.push({ text, x, y, color, timer: 60, vy: -2 }); }
    showTip(text, duration = 300) {
        if (this.shownTips.has(text)) return;
        this.shownTips.add(text);
        const banner = document.getElementById('tips-banner');
        if (banner) {
            banner.innerText = text;
            banner.classList.remove('hidden');
            this.tipTimer = duration;
        }
    }
    startGame() {
        audio.init();
        audio.play('start');
        const levelInput = document.getElementById('start-level');
        const startLevel = Math.max(1, Math.min(1000, parseInt(levelInput.value) || 1)) - 1;
        this.currentStage = startLevel;
        this.lives = 3;
        this.players = [];
        this.difficulty = document.querySelector('.diff-btn.active')?.dataset.diff || 'normal';
        this.startLevel();
        document.getElementById('hud').classList.remove('hidden');
        if (this.input.isMobile) document.getElementById('touch-controls').classList.remove('hidden');
        this.canvas.focus();
    }
    startLevel() {
        this.gameState = 'STAGE_START'; this.stageStartTimer = 120;
        document.getElementById('start-screen').classList.add('hidden'); document.getElementById('game-over-screen').classList.add('hidden');
        document.getElementById('stage-info').innerText = `关卡 Stage ${this.currentStage + 1}`;

        this.map.reset(this.currentStage); this.bullets = []; this.enemies = []; this.effects = []; this.powerUps = []; this.fortifyTimer = 0; this.enemyFrozenTimer = 0; this.playerFrozenTimer = 0;
        this.stageClearTimer = 0;
        this.spawningEnemies = 0;
        this.currentLevel = this.map.currentLevel;
        const diffMult = this.difficulty === 'easy' ? 0.7 : (this.difficulty === 'hard' ? 1.3 : 1);
        this.enemiesRemaining = Math.floor(this.currentLevel.totalEnemies * diffMult);
        this.initialEnemies = this.enemiesRemaining;
        if (this.currentStage === 0) { this.baseHealth = 5; this.maxBaseHealth = 5; }
        else { this.baseHealth = this.maxBaseHealth; }
        if (this.players.length === 0) {
            this.players = [
                new Player(this, TILE_SIZE * 8, TILE_SIZE * 22, COLORS.PLAYER1, { up:'KeyW', down:'KeyS', left:'KeyA', right:'KeyD', shoot:'Space', rescue:'KeyU' }, 1),
                new Player(this, TILE_SIZE * 16, TILE_SIZE * 22, COLORS.PLAYER2, { up:'ArrowUp', down:'ArrowDown', left:'ArrowLeft', right:'ArrowRight', shoot:'NumpadEnter', rescue:'Numpad9' }, 2)
            ];
        } else {
            this.players.forEach(p => { p.alive = true; });
            this.players[0].x = TILE_SIZE * 8; this.players[0].y = TILE_SIZE * 22;
            this.players[1].x = TILE_SIZE * 16; this.players[1].y = TILE_SIZE * 22;
        }
        this.players.forEach(p => p.setShield(180)); this.updateHUD();
    }
    updateHUD() {
        document.getElementById('p1-score').innerText = String(this.players[0].score).padStart(5, '0');
        document.getElementById('p2-score').innerText = String(this.players[1].score).padStart(5, '0');
        
        const p1LvlEl = document.getElementById('p1-level');
        const p2LvlEl = document.getElementById('p2-level');
        const getWeaponHTML = (p) => {
            const levelStr = p.level;
            let wName = "普通炮弹";
            let color = "#fff";
            if (p.weaponClass === 'MISSILE') { wName = "跟踪导弹(红)"; color = "#f00"; }
            else if (p.weaponClass === 'LASER') { wName = "穿透激光(青)"; color = "#0ff"; }
            else if (p.weaponClass === 'EXPLOSIVE') { wName = "高爆弹(黄)"; color = "#ff0"; }
            else if (p.weaponClass === 'SPREAD') { wName = "霰弹枪(绿)"; color = "#0f0"; }
            else if (p.weaponClass === 'BOUNCE') { wName = "弹射炮(紫)"; color = "#f0f"; }
            
            return `<span style='color:${color};'>${wName}</span>`;
        };
        if(p1LvlEl) p1LvlEl.innerHTML = this.players[0].alive ? `火力: Lv.${this.players[0].level} [${getWeaponHTML(this.players[0])}]` : `DEAD`;
        if(p2LvlEl) p2LvlEl.innerHTML = this.players[1].alive ? `火力: Lv.${this.players[1].level} [${getWeaponHTML(this.players[1])}]` : `DEAD`;

        document.getElementById('p1-lives').innerText = '❤️x' + this.players[0].lives;
        document.getElementById('p2-lives').innerText = '❤️x' + this.players[1].lives;
        
        const livesInfo = document.getElementById('lives-info');
        if (livesInfo) livesInfo.innerText = '';
        document.getElementById('enemies-info').innerText = `敌人 Enemies: ${this.enemiesRemaining + this.enemies.length + (this.spawningEnemies || 0)}`;
    }
    handlePlayerDeath(player) {
        if (player.level > 0) {
            player.level = Math.floor(player.level / 2);
            player.speed = Math.min(8, 4 + player.level * 0.15);
            player.health = 1;
            player.maxHealth = 1;
            this.showFloatingText('火力减半!', player.x + player.width/2, player.y - 10, '#f00');
        } else {
            player.health = 1;
            player.maxHealth = 1;
        }

        if (player.lives > 0) {
            player.lives--; this.updateHUD();
            player.respawning = true;
            setTimeout(() => {
                player.respawning = false;
                this.respawnPlayer(player);
            }, 2000);
        } else {
            this.updateHUD();
        }
    }

    respawnPlayer(player) {
        player.alive = true;
        player.x = (player.id === 1) ? TILE_SIZE * 8 : TILE_SIZE * 16;
        player.y = TILE_SIZE * 22;
        player.setShield(180);
        this.updateHUD();
    }

    revivePlayer(player) {
        player.level = 0;
        player.speed = 4;
        player.maxHealth = 1;
        player.health = 1;
        player.weaponClass = 'NORMAL';
        player.alive = true;
        player.setShield(180);
        this.updateHUD();
        this.showFloatingText('被救活了! REVIVED!', player.x + player.width/2, player.y - 10, '#0f0');
    }
    nextLevel() { this.currentStage++; this.startLevel(); }
    fortifyBase() { this.fortifyTimer = 600; this.map.setBaseWalls(TILE_TYPES.STEEL); }
    unfortifyBase() { this.map.setBaseWalls(TILE_TYPES.BRICK); }
    gameOver() {
        if (this.replayHistory.length > 0) {
            this.gameState = 'REPLAY';
            this.replayIndex = 0;
            this.showAnnouncement('💀 DEATH REPLAY 💀', '#f00');
            audio.play('explosion');
        } else {
            this.showMVPScreen();
        }
    }
    showGameOverScreen() {
        this.gameState = 'GAME_OVER';
        const totalScore = this.players.reduce((sum, p) => sum + p.score, 0);
        if (totalScore > this.highScore) {
            this.highScore = totalScore;
            localStorage.setItem('tankBattleHighScore', String(totalScore));
        }
        document.getElementById('game-over-screen').classList.remove('hidden');
    }
    update() {
        if (this.gameState === 'STAGE_START') { this.stageStartTimer--; if (this.stageStartTimer <= 0) this.gameState = 'PLAYING'; return; }
        if (this.gameState !== 'PLAYING') return;

        if (this.input.isDown('KeyP') && !this.pausePressed) { this.paused = !this.paused; this.pausePressed = true; }
        if (!this.input.isDown('KeyP')) this.pausePressed = false;
        if (this.paused) return;

        if (this.tipTimer > 0) {
            this.tipTimer--;
            if (this.tipTimer <= 0) {
                const banner = document.getElementById('tips-banner');
                if (banner) banner.classList.add('hidden');
            }
        }

        if (this.weather !== 'NONE') {
            this.weatherParticles.forEach(p => {
                if (this.weather === 'RAIN') { p.y += p.s * 2; p.x += 1; }
                else if (this.weather === 'SNOW') { p.y += p.s * 0.5; p.x += Math.sin(p.y/20); }
                else if (this.weather === 'WIND') { p.x += p.s * 3; }
                if (p.y > CANVAS_SIZE) p.y = 0; if (p.x > CANVAS_SIZE) p.x = 0; if (p.x < 0) p.x = CANVAS_SIZE;
            });
        }
        if (this.weather === 'LIGHTNING' && Math.random() < 0.02) this.lightningFlash = 5;
        if (this.lightningFlash > 0) this.lightningFlash--;

        if (this.shakeTimer > 0) {
            this.shakeX = (Math.random() - 0.5) * this.shakeIntensity * 2;
            this.shakeY = (Math.random() - 0.5) * this.shakeIntensity * 2;
            this.shakeTimer--;
        } else {
            this.shakeX = 0; this.shakeY = 0;
        }

        this.announcements = this.announcements.filter(a => { a.timer--; a.y -= 0.5; return a.timer > 0; });
        this.floatingTexts = this.floatingTexts.filter(t => { t.timer--; t.y += t.vy; return t.timer > 0; });
        if (this.enemyFrozenTimer > 0) this.enemyFrozenTimer--;
        if (this.playerFrozenTimer > 0) {
            this.playerFrozenTimer--;
            if (this.playerFrozenTimer % 30 === 0) this.players.forEach(p => this.effects.push(new Effect(p.x + p.width/2, p.y + p.height/2, 'EXPLOSION', 0.5))); // visual cue
        }

        const bossChance = this.currentStage < 5 ? 0 : (this.currentStage < 20 ? 0.0002 : 0.0005);
        if (Math.random() < bossChance && !this.enemies.some(e => e.isBoss) && !this.bossWarning) {
            this.bossWarning = 180;
            this.showAnnouncement('警告! BOSS降临! BOSS INCOMING!', '#f00');
        }
        if (this.bossWarning > 0) {
            this.bossWarning--;
            if (this.bossWarning === 0) {
                const bossSize = TILE_SIZE * 3;
                const spawnPositions = [
                    { x: CANVAS_SIZE/2 - bossSize/2, y: CANVAS_SIZE/2 - bossSize/2 },
                    { x: TILE_SIZE * 2, y: TILE_SIZE * 2 },
                    { x: TILE_SIZE * 20, y: TILE_SIZE * 2 }
                ];
                let spawnPos = spawnPositions[Math.floor(Math.random() * spawnPositions.length)];
                const isPlayerNear = this.players.some(p => p.alive && Math.hypot(p.x - spawnPos.x, p.y - spawnPos.y) < TILE_SIZE * 5);
                if (this.map.isBlocked(spawnPos.x, spawnPos.y, bossSize, bossSize) || isPlayerNear) {
                    spawnPos = spawnPositions.find(p => !this.map.isBlocked(p.x, p.y, bossSize, bossSize) && !this.players.some(pl => pl.alive && Math.hypot(pl.x - p.x, pl.y - p.y) < TILE_SIZE * 5)) || spawnPositions[0];
                }
                this.effects.push(new Effect(spawnPos.x + bossSize/2, spawnPos.y + bossSize/2, 'SPAWN', 5));
                this.spawningEnemies = (this.spawningEnemies || 0) + 1;
                setTimeout(() => { this.spawningEnemies--; if (this.gameState === 'PLAYING') { this.enemies.push(new Boss(this, spawnPos.x, spawnPos.y, this.currentStage)); this.updateHUD(); } }, 1000);
            }
        }

        if (this.fortifyTimer > 0) { this.fortifyTimer--; if (this.fortifyTimer === 0) this.unfortifyBase(); }
        
        // Random Airdrop for Rare Items
        if (Math.random() < 0.0001) {
            const px = TILE_SIZE * 2 + Math.random() * (CANVAS_SIZE - TILE_SIZE * 4);
            const py = TILE_SIZE * 2 + Math.random() * (CANVAS_SIZE - TILE_SIZE * 4);
            const rareTypes = [POWERUP_TYPES.MAX_WEAPON, POWERUP_TYPES.BOAT, POWERUP_TYPES.FLY];
            const type = rareTypes[Math.floor(Math.random() * rareTypes.length)];
            this.powerUps.push(new PowerUp(this, px, py, type));
            this.effects.push(new Effect(px + 32, py + 32, 'SPAWN', 5));
            this.showAnnouncement('天降奇遇 AIRDROP!', '#0ff');
        }

        if (this.enemiesRemaining > 0 && this.enemies.length < 30) {
            this.spawnTimer--;
            if (this.spawnTimer <= 0) {
                const sx = [TILE_SIZE * 2, TILE_SIZE * 12, TILE_SIZE * 22][Math.floor(Math.random() * 3)]; const sy = TILE_SIZE * 2; this.effects.push(new Effect(sx + TILE_SIZE, sy + TILE_SIZE, 'SPAWN'));
                this.enemiesRemaining--;
                this.spawningEnemies = (this.spawningEnemies || 0) + 1;
                setTimeout(() => { this.spawningEnemies--; if (this.gameState === 'PLAYING') { this.enemies.push(new Enemy(this, sx, sy, this.currentStage)); this.updateHUD(); } }, 1000); 
                let interval = Math.max(20, Math.floor(2400 / Math.max(1, this.initialEnemies || 1)));
                if (this.difficulty === 'hard') interval = Math.floor(interval * 0.7);
                this.spawnTimer = interval;
            }
        } else if (this.enemiesRemaining === 0 && this.enemies.length === 0 && (!this.spawningEnemies || this.spawningEnemies === 0)) {
            if (this.stageClearTimer === 0) {
                this.stageClearTimer = 300;
                this.showAnnouncement('奖励时间 BONUS TIME: 5s!', '#0f0');
            } else {
                this.stageClearTimer--;
                if (this.stageClearTimer <= 0) {
                    this.gameState = 'STAGE_CLEAR';
                    setTimeout(() => this.nextLevel(), 2000);
                }
            }
        }
        
        if (this.comboTimer > 0) {
            this.comboTimer--;
            if (this.comboTimer <= 0) this.comboCount = 0;
        }

        this.players.forEach(p => { try { p.update(); } catch(e) { console.error(e); } }); 
        this.enemies.forEach(e => { try { e.update(); } catch(e) { console.error(e); } });
        this.bullets.forEach(b => { try { b.update(); } catch(e) { console.error(e); } });
        this.effects.forEach(e => { try { e.update(); } catch(e) { console.error(e); } });
        this.powerUps.forEach(p => { try { p.update(); } catch(e) { console.error(e); } });
        this.wreckages.forEach(w => w.timer--);
        this.wreckages = this.wreckages.filter(w => w.timer > 0);
        this.bullets = this.bullets.filter(b => b.active && !isNaN(b.x) && !isNaN(b.y));
        this.effects = this.effects.filter(e => e.active && !isNaN(e.x) && !isNaN(e.y));
        this.powerUps = this.powerUps.filter(p => p.active && !isNaN(p.x) && !isNaN(p.y));
        this.enemies = this.enemies.filter(e => e.alive && !isNaN(e.x) && !isNaN(e.y));
        if (this.enemies.length !== this.lastEnemyCount) { this.updateHUD(); this.lastEnemyCount = this.enemies.length; }
        
        // Record state for Death Replay
        if (this.gameState === 'PLAYING') {
            const snapshot = {
                tanks: [...this.players, ...this.enemies].filter(t => t.alive).map(t => ({ x: t.x, y: t.y, w: t.width, h: t.height, dir: t.direction, color: t.color, isBoss: t.isBoss, level: t.level, isPlayer: t instanceof Player })),
                bullets: this.bullets.map(b => ({ x: b.x, y: b.y, size: b.size, type: b.type })),
                effects: this.effects.map(e => ({ x: e.x, y: e.y, radius: e.radius, type: e.type, color: e.color })),
                powerUps: this.powerUps.map(p => ({ x: p.x, y: p.y, type: p.type, timer: p.timer })),
                wreckages: this.wreckages.map(w => ({ x: w.x, y: w.y, timer: w.timer, type: w.type })),
                mapGrid: this.map.grid.map(row => [...row]),
                shakeX: this.shakeX, shakeY: this.shakeY
            };
            this.replayHistory.push(snapshot);
            if (this.replayHistory.length > 200) this.replayHistory.shift(); // keep last ~3.3 seconds
        }
        
        const deadPlayers = this.players.filter(p => !p.alive);
        const alivePlayers = this.players.filter(p => p.alive);
        
        for (const deadP of deadPlayers) {
            for (const aliveP of alivePlayers) {
                if (Math.hypot(aliveP.x - deadP.x, aliveP.y - deadP.y) < TILE_SIZE) {
                    this.revivePlayer(deadP);
                }
                
                if (this.input.isDown(deadP.controls.rescue) && !deadP.respawning) {
                    if (aliveP.lives > 0) {
                        aliveP.lives--;
                        let scoreCost = Math.floor(deadP.score / 2);
                        deadP.score -= scoreCost;
                        aliveP.score += scoreCost;
                        this.updateHUD();
                        this.respawnPlayer(deadP);
                        this.showFloatingText('借命成功!', aliveP.x + aliveP.width/2, aliveP.y - 10, '#0f0');
                    }
                }
            }
        }
        
        if (this.players.every(p => !p.alive && !p.respawning)) this.gameOver();
    }
    draw() {
        this.ctx.fillStyle = '#000'; this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.gameState === 'STAGE_START') {
            const progress = 1 - this.stageStartTimer / 120;
            this.ctx.fillStyle = '#000'; this.ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
            this.ctx.fillStyle = '#aaa'; this.ctx.font = '60px "Courier New"'; this.ctx.textAlign = 'center';
            this.ctx.globalAlpha = progress < 0.1 ? progress * 10 : (progress > 0.8 ? (1 - progress) * 5 : 1);
            this.ctx.fillText(`关卡 Stage ${this.currentStage + 1}`, CANVAS_SIZE/2, CANVAS_SIZE/2 - 20);
            this.ctx.font = '30px "Courier New"';
            this.ctx.fillText(`敌人 Enemies: ${this.enemiesRemaining}`, CANVAS_SIZE/2, CANVAS_SIZE/2 + 30);
            this.ctx.globalAlpha = 1;
            return;
        }
        if (this.gameState === 'PLAYING' || this.gameState === 'STAGE_CLEAR') {
            this.ctx.save();
            this.ctx.translate(this.shakeX, this.shakeY);
            this.map.draw(this.ctx); 
            if (this.weather !== 'NONE') {
                this.ctx.save();
                if (this.weather === 'RAIN') { this.ctx.strokeStyle = 'rgba(100, 150, 255, 0.4)'; this.ctx.lineWidth = 2; this.weatherParticles.forEach(p => { this.ctx.beginPath(); this.ctx.moveTo(p.x, p.y); this.ctx.lineTo(p.x+1, p.y+15); this.ctx.stroke(); }); }
                else if (this.weather === 'SNOW') { this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'; this.weatherParticles.forEach(p => { this.ctx.beginPath(); this.ctx.arc(p.x, p.y, 3, 0, Math.PI*2); this.ctx.fill(); }); }
                else if (this.weather === 'WIND') { this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'; this.ctx.lineWidth = 1; this.weatherParticles.forEach(p => { this.ctx.beginPath(); this.ctx.moveTo(p.x, p.y); this.ctx.lineTo(p.x+30, p.y); this.ctx.stroke(); }); }
                else if (this.weather === 'LIGHTNING') { if (this.lightningFlash > 0) { this.ctx.fillStyle = `rgba(255, 255, 255, ${this.lightningFlash/10})`; this.ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE); } }
                this.ctx.restore();
            }
            this.players.forEach(p => { try { if(p.alive) { p.draw(this.ctx); if (p.aiActive) { this.ctx.save(); this.ctx.fillStyle = 'rgba(0,0,0,0.7)'; this.ctx.beginPath(); this.ctx.arc(p.x + 30, p.y - 12, 14, 0, Math.PI * 2); this.ctx.fill(); this.ctx.fillStyle = '#0f0'; this.ctx.font = 'bold 12px Arial'; this.ctx.textAlign = 'center'; this.ctx.fillText('AI', p.x + 30, p.y - 8); this.ctx.restore(); } } else { const otherP = this.players.find(o => o.id !== p.id); if (p.lives === 0 && !p.respawning && otherP && otherP.alive && otherP.lives > 0) { this.ctx.save(); this.ctx.fillStyle = '#0f0'; this.ctx.font = 'bold 12px Arial'; this.ctx.textAlign = 'center'; this.ctx.shadowBlur = 4; this.ctx.shadowColor = '#000'; const key = p.id === 1 ? 'U键' : '9键'; this.ctx.fillText(`按 ${key} 借命(-50%分)`, p.x + 30, p.y + 30); this.ctx.restore(); } } } catch(e) {} });
            this.enemies.forEach(e => { try { e.draw(this.ctx); } catch(e) {} }); 
            this.bullets.forEach(b => { try { b.draw(this.ctx); } catch(e) {} }); 
            this.effects.forEach(e => { try { e.draw(this.ctx); } catch(e) {} }); 
            this.powerUps.forEach(p => { try { p.draw(this.ctx); } catch(e) {} });
            // Draw Wreckages
            this.wreckages.forEach(w => {
                this.ctx.save();
                this.ctx.globalAlpha = Math.min(1, w.timer / 120) * 0.6;
                this.ctx.fillStyle = '#111';
                this.ctx.beginPath();
                this.ctx.arc(w.x + 30, w.y + 30, w.type === 'BOSS' ? 40 : 25, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
            });
            this.drawForest();
            this.ctx.restore();
            if (this.baseHealth > 0 && this.baseHealth <= 2) {
                this.ctx.save();
                this.ctx.fillStyle = `rgba(255, 0, 0, ${Math.abs(Math.sin(Date.now() / 200)) * 0.3})`;
                this.ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
                this.ctx.fillStyle = '#f00';
                this.ctx.font = 'bold 48px Arial';
                this.ctx.textAlign = 'center';
                if (Math.floor(Date.now() / 500) % 2 === 0) {
                    this.ctx.fillText("🚨 大本营血量告急！速回防！ 🚨", CANVAS_SIZE/2, 100);
                }
                this.ctx.restore();
            }
            this.floatingTexts.forEach(t => { this.ctx.save(); this.ctx.fillStyle = t.color; this.ctx.font = 'bold 16px Arial'; this.ctx.textAlign = 'center'; this.ctx.globalAlpha = t.timer / 60; this.ctx.fillText(t.text, t.x, t.y); this.ctx.restore(); });
            this.announcements.forEach(a => { this.ctx.save(); const scale = 1 + Math.sin(a.timer / 10) * 0.1; this.ctx.translate(CANVAS_SIZE / 2, a.y); this.ctx.scale(scale, scale); this.ctx.fillStyle = '#000'; this.ctx.font = 'bold 48px Arial'; this.ctx.textAlign = 'center'; this.ctx.fillText(a.text, 2, 2); this.ctx.fillStyle = a.color; this.ctx.fillText(a.text, 0, 0); this.ctx.restore(); });
            if (this.gameState === 'STAGE_CLEAR') { this.ctx.fillStyle = 'rgba(0,0,0,0.5)'; this.ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE); this.ctx.fillStyle = '#fff'; this.ctx.font = '60px "Courier New"'; this.ctx.textAlign = 'center'; this.ctx.fillText("过关 STAGE CLEAR!", CANVAS_SIZE/2, CANVAS_SIZE/2); }
            if (this.paused) { this.ctx.fillStyle = 'rgba(0,0,0,0.7)'; this.ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE); this.ctx.fillStyle = '#fff'; this.ctx.font = '60px "Courier New"'; this.ctx.textAlign = 'center'; this.ctx.fillText("暂停 PAUSED", CANVAS_SIZE/2, CANVAS_SIZE/2 - 20); this.ctx.font = '24px "Courier New"'; this.ctx.fillText("按P键继续 Press P to resume", CANVAS_SIZE/2, CANVAS_SIZE/2 + 30); }
        }
        if (this.highScore > 0) { this.ctx.fillStyle = '#ff0'; this.ctx.font = '16px Arial'; this.ctx.textAlign = 'right'; this.ctx.fillText(`HIGH SCORE: ${this.highScore}`, CANVAS_SIZE - 10, CANVAS_SIZE - 10); }
    }
    drawForest() {
        this.ctx.save();
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                if (this.map.grid[y][x] === TILE_TYPES.FOREST) {
                    const px = x * TILE_SIZE; const py = y * TILE_SIZE;
                    const ts = TILE_SIZE;
                    this.ctx.fillStyle = 'rgba(20, 80, 20, 0.9)';
                    this.ctx.beginPath();
                    this.ctx.arc(px + ts*0.25, py + ts*0.25, ts*0.3, 0, Math.PI*2);
                    this.ctx.arc(px + ts*0.75, py + ts*0.25, ts*0.3, 0, Math.PI*2);
                    this.ctx.arc(px + ts*0.25, py + ts*0.75, ts*0.3, 0, Math.PI*2);
                    this.ctx.arc(px + ts*0.75, py + ts*0.75, ts*0.3, 0, Math.PI*2);
                    this.ctx.arc(px + ts*0.5, py + ts*0.5, ts*0.4, 0, Math.PI*2);
                    this.ctx.fill();
                    
                    this.ctx.fillStyle = 'rgba(40, 120, 40, 0.9)';
                    this.ctx.beginPath();
                    this.ctx.arc(px + ts*0.3, py + ts*0.3, ts*0.15, 0, Math.PI*2);
                    this.ctx.arc(px + ts*0.7, py + ts*0.7, ts*0.15, 0, Math.PI*2);
                    this.ctx.arc(px + ts*0.5, py + ts*0.3, ts*0.2, 0, Math.PI*2);
                    this.ctx.fill();
                }
            }
        }
        this.ctx.restore();
    }
    loop() {
        if (this.gameState === 'MVP_SHOWCASE') {
            this.drawMVP();
            requestAnimationFrame(() => this.loop());
            return;
        }
        if (this.gameState === 'REPLAY') {
            this.replayIndex++;
            this.drawReplay();
            setTimeout(() => requestAnimationFrame(() => this.loop()), 33);
            return;
        }
        
        try { this.update(); } catch (e) { console.error('Game update error:', e); } 
        try { this.draw(); } catch (e) { console.error('Game draw error:', e); } 
        requestAnimationFrame(() => this.loop()); 
    }
    
    
    drawReplay() {
        if (this.replayIndex >= this.replayHistory.length) {
            this.showMVPScreen();
            return;
        }
        const frame = this.replayHistory[this.replayIndex];
        this.ctx.fillStyle = '#000'; this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.save();
        this.ctx.translate(frame.shakeX, frame.shakeY);
        
        // Map
        for (let y = 0; y < 26; y++) {
            for (let x = 0; x < 26; x++) {
                const tile = frame.mapGrid[y][x]; if (tile === 0 || tile === 4) continue;
                const px = x * 32; const py = y * 32;
                if (tile === 1) { // BRICK
                    this.ctx.fillStyle = '#B53120'; this.ctx.fillRect(px, py, 32, 32);
                    this.ctx.fillStyle = '#DC5341'; this.ctx.fillRect(px, py, 32, 4); this.ctx.fillRect(px, py, 4, 32);
                    this.ctx.fillStyle = '#000'; this.ctx.fillRect(px + 16, py, 2, 32); this.ctx.fillRect(px, py + 16, 32, 2);
                } else if (tile === 8) { // BARREL
                    this.ctx.fillStyle = '#FF4400'; this.ctx.fillRect(px + 4, py + 4, 24, 24);
                    this.ctx.fillStyle = '#000'; this.ctx.fillRect(px + 14, py + 4, 4, 24);
                    this.ctx.fillStyle = '#FFF'; this.ctx.font = '16px Arial'; this.ctx.textAlign='center'; this.ctx.fillText('☠️', px+16, py+22);
                } else if (tile === 6) { // HARD_BRICK
                    this.ctx.fillStyle = '#8B4513'; this.ctx.fillRect(px, py, 32, 32);
                } else if (tile === 2) { // STEEL
                    this.ctx.fillStyle = '#AAAAAA'; this.ctx.fillRect(px, py, 32, 32);
                    this.ctx.fillStyle = '#EEEEEE'; this.ctx.beginPath(); this.ctx.moveTo(px, py + 32); this.ctx.lineTo(px, py); this.ctx.lineTo(px + 32, py); this.ctx.fill();
                    this.ctx.fillStyle = '#fff'; this.ctx.fillRect(px + 4, py + 4, 4, 4);
                } else if (tile === 7) { // UNBREAKABLE
                    this.ctx.fillStyle = '#333'; this.ctx.fillRect(px, py, 32, 32);
                    this.ctx.strokeStyle = '#666'; this.ctx.lineWidth = 2; this.ctx.strokeRect(px + 2, py + 2, 28, 28);
                    this.ctx.beginPath(); this.ctx.moveTo(px + 4, py + 4); this.ctx.lineTo(px + 28, py + 28); this.ctx.moveTo(px + 28, py + 4); this.ctx.lineTo(px + 4, py + 28); this.ctx.stroke();
                } else if (tile === 3) { // WATER
                    this.ctx.fillStyle = '#2131E7'; this.ctx.fillRect(px, py, 32, 32);
                    this.ctx.fillStyle = 'rgba(255,255,255,0.2)'; this.ctx.fillRect(px + 4, py + 10, 8, 2); this.ctx.fillRect(px + 16, py + 20, 10, 2);
                } else if (tile === 5) { // ICE
                    this.ctx.fillStyle = '#A0E6FF'; this.ctx.fillRect(px, py, 32, 32);
                    this.ctx.fillStyle = '#FFF'; this.ctx.fillRect(px+4, py+4, 8, 2);
                } else if (tile === 9) { // BASE
                    this.ctx.fillStyle = '#E79C21'; this.ctx.fillRect(px, py, 64, 64);
                    this.ctx.fillStyle = '#fff'; this.ctx.font = '24px Arial'; this.ctx.textAlign='center'; this.ctx.fillText('🦅', px+32, py+40);
                } else if (tile === 10) { // BASE_DESTROYED
                    this.ctx.fillStyle = '#555'; this.ctx.fillRect(px, py, 64, 64);
                    this.ctx.fillStyle = '#000'; this.ctx.font = '24px Arial'; this.ctx.textAlign='center'; this.ctx.fillText('🏳️', px+32, py+40);
                }
            }
        }
        
        // Wreckages
        frame.wreckages.forEach(w => {
            this.ctx.save();
            this.ctx.globalAlpha = Math.min(1, w.timer / 120) * 0.6;
            this.ctx.fillStyle = '#111';
            this.ctx.beginPath();
            this.ctx.arc(w.x + 30, w.y + 30, w.type === 'BOSS' ? 40 : 25, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
        
        // Tanks
        frame.tanks.forEach(t => {
            this.ctx.save();
            if (t.isPlayer) {
                this.ctx.shadowBlur = 15 + Math.sin(Date.now() / 100) * 10;
                this.ctx.shadowColor = '#0f0';
                this.ctx.strokeStyle = '#0f0';
                this.ctx.lineWidth = 3;
                this.ctx.strokeRect(t.x - 4, t.y - 4, t.w + 8, t.h + 8);
                this.ctx.shadowBlur = 0;
                this.ctx.fillStyle = '#0f0';
                this.ctx.font = 'bold 20px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText("▼ YOU", t.x + t.w/2, t.y - 12 + Math.sin(Date.now() / 150) * 5);
                this.ctx.shadowBlur = 15 + Math.sin(Date.now() / 100) * 10;
            }
            this.ctx.fillStyle = t.color;
            if (t.dir === 'UP' || t.dir === 'DOWN') {
                this.ctx.fillRect(t.x + 8, t.y + 8, t.w - 16, t.h - 16); this.ctx.fillStyle = '#000'; this.ctx.fillRect(t.x, t.y, 8, t.h); this.ctx.fillRect(t.x + t.w - 8, t.y, 8, t.h);
                this.ctx.fillStyle = '#888'; this.ctx.fillRect(t.x + t.w/2 - 2, t.dir === 'UP' ? t.y - 8 : t.y + t.h/2, 4, t.h/2 + 8);
            } else {
                this.ctx.fillRect(t.x + 8, t.y + 8, t.w - 16, t.h - 16); this.ctx.fillStyle = '#000'; this.ctx.fillRect(t.x, t.y, t.w, 8); this.ctx.fillRect(t.x, t.y + t.h - 8, t.w, 8);
                this.ctx.fillStyle = '#888'; this.ctx.fillRect(t.dir === 'LEFT' ? t.x - 8 : t.x + t.w/2, t.y + t.h/2 - 2, t.w/2 + 8, 4);
            }
            this.ctx.restore();
        });
        
        // Bullets
        frame.bullets.forEach(b => {
            this.ctx.fillStyle = b.type === 'LASER' ? '#0ff' : '#fff';
            this.ctx.beginPath(); this.ctx.arc(b.x + b.size/2, b.y + b.size/2, b.size/2, 0, Math.PI*2); this.ctx.fill();
        });
        
        // Effects
        frame.effects.forEach(e => {
            this.ctx.fillStyle = e.color || '#f80';
            this.ctx.beginPath(); this.ctx.arc(e.x, e.y, e.radius, 0, Math.PI*2); this.ctx.fill();
        });
        
        // Powerups
        frame.powerUps.forEach(p => {
            let scale = 1 + Math.sin(p.timer / 15) * 0.2;
            this.ctx.save();
            this.ctx.translate(p.x + 32, p.y + 32);
            this.ctx.scale(scale, scale);
            this.ctx.fillStyle = 'rgba(255, 215, 0, 0.4)';
            this.ctx.beginPath(); this.ctx.arc(0, 0, 24, 0, Math.PI * 2); this.ctx.fill();
            this.ctx.font = '48px Arial'; this.ctx.textAlign = 'center'; this.ctx.textBaseline = 'middle'; this.ctx.fillText(p.type, 0, 0);
            this.ctx.restore();
        });
        
        this.ctx.restore();
        
        // Overlay Grayscale/Red Tint for Death Replay
        this.ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#f00';
        this.ctx.font = 'bold 36px Arial';
        this.ctx.textAlign = 'center';
        if (Math.floor(Date.now() / 200) % 2 === 0) {
            this.ctx.fillText("🔴 死亡回放 (DEATH REPLAY) 🔴", 416, 60);
        }
    }
    
    showMVPScreen() {
        this.gameState = 'MVP_SHOWCASE';
        this.mvpTimer = 0;
        let sortedPlayers = [...this.players].sort((a, b) => b.score - a.score);
        if (this.players.length >= 2 && sortedPlayers[0].score === sortedPlayers[1].score) {
            this.mvpPlayer = 'DRAW';
        } else {
            this.mvpPlayer = sortedPlayers[0];
        }
        audio.play('powerup');
        setTimeout(() => {
            this.showGameOverScreen();
        }, 5000); // show MVP screen for 5 seconds
    }
    
    drawMVP() {
        this.mvpTimer++;
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.mvpPlayer === 'DRAW') {
            let cx1 = 250;
            let cx2 = 582;
            let cy = 416 + 50;
            
            let shakeX = (Math.random() - 0.5) * 8;
            let shakeY = (Math.random() - 0.5) * 8;
            
            this.ctx.font = 'bold 80px Arial';
            this.ctx.fillStyle = '#ff0';
            this.ctx.textAlign = 'center';
            this.ctx.fillText("TIE GAME!", 416, 200);
            
            this.ctx.font = 'bold 40px Arial';
            this.ctx.fillStyle = '#fff';
            this.ctx.fillText("不分上下！都在哭！😭", 416, 260);
            
            for (let i = 0; i < 2; i++) {
                let p = this.players[i];
                if (!p) continue;
                let px = i === 0 ? cx1 : cx2;
                
                this.ctx.save();
                this.ctx.translate(px + shakeX, cy + shakeY);
                this.ctx.scale(3, 3);
                
                this.ctx.fillStyle = p.color;
                this.ctx.fillRect(-12, -12, 24, 24);
                this.ctx.fillStyle = '#000'; this.ctx.fillRect(-16, -16, 8, 32); this.ctx.fillRect(8, -16, 8, 32);
                this.ctx.fillStyle = '#888'; this.ctx.fillRect(-2, -16, 4, 16);
                
                // Draw Tears
                this.ctx.fillStyle = '#0ff';
                let tear1 = (this.mvpTimer % 20) / 20 * 16;
                let tear2 = ((this.mvpTimer + 10) % 20) / 20 * 16;
                this.ctx.fillRect(-8, -4 + tear1, 4, 6);
                this.ctx.fillRect(4, -4 + tear2, 4, 6);
                
                this.ctx.restore();
                
                this.ctx.font = 'bold 40px Arial';
                this.ctx.fillStyle = p.color;
                this.ctx.fillText(`P${p.id}: ${p.score}`, px, cy + 120);
            }
            return;
        }
        
        if (!this.mvpPlayer) return;
        
        let cx = 416;
        let cy = 416 + 50;
        
        let jump = Math.abs(Math.sin(this.mvpTimer / 10)) * 30;
        let rot = Math.sin(this.mvpTimer / 5) * 0.3;
        
        // Draw Spotlight
        this.ctx.save();
        let grad = this.ctx.createRadialGradient(cx, cy - 20, 10, cx, cy - 20, 200);
        grad.addColorStop(0, this.mvpPlayer.color);
        grad.addColorStop(1, 'transparent');
        this.ctx.fillStyle = grad;
        this.ctx.globalAlpha = 0.5 + Math.sin(this.mvpTimer / 5) * 0.2;
        this.ctx.beginPath(); this.ctx.arc(cx, cy - 20, 200, 0, Math.PI * 2); this.ctx.fill();
        this.ctx.restore();
        
        // Draw Dancing Tank
        this.ctx.save();
        this.ctx.translate(cx, cy - jump);
        this.ctx.rotate(rot);
        this.ctx.scale(3, 3);
        
        this.ctx.shadowBlur = 30 + Math.sin(this.mvpTimer / 5) * 20;
        this.ctx.shadowColor = Math.floor(this.mvpTimer / 10) % 2 === 0 ? '#fff' : this.mvpPlayer.color;
        
        this.ctx.fillStyle = this.mvpPlayer.color;
        this.ctx.fillRect(-12, -12, 24, 24);
        this.ctx.fillStyle = '#000'; this.ctx.fillRect(-16, -16, 8, 32); this.ctx.fillRect(8, -16, 8, 32);
        this.ctx.fillStyle = '#888'; this.ctx.fillRect(-2, -16, 4, 16);
        this.ctx.restore();
        
        // MVP Text
        this.ctx.save();
        let textScale = 1 + Math.sin(this.mvpTimer / 15) * 0.1;
        this.ctx.translate(cx, cy - 120 - jump*0.5);
        this.ctx.scale(textScale, textScale);
        this.ctx.rotate(-rot * 0.5);
        
        this.ctx.font = 'bold 80px Arial';
        this.ctx.textAlign = 'center';
        
        this.ctx.fillStyle = Math.floor(this.mvpTimer / 5) % 2 === 0 ? '#ff0' : '#fff';
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = '#f00';
        this.ctx.fillText(`${this.mvpPlayer.id} MVP!`, 0, 0);
        
        this.ctx.shadowBlur = 0;
        this.ctx.font = 'bold 40px Arial';
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText(`SCORE: ${this.mvpPlayer.score}`, 0, 60);
        this.ctx.restore();
    }
}
window.onload = () => new Game();
