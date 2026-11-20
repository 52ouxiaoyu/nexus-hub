
class DOMElement {
    constructor(id) { this.id = id; this.classList = { add: ()=>{}, remove: ()=>{} }; this.value = 'normal'; this.textContent = ''; this.style = {}; }
    addEventListener() {}
    getContext() { return { 
        fillRect: ()=>{}, strokeRect: ()=>{}, beginPath: ()=>{}, moveTo: ()=>{}, lineTo: ()=>{},
        arc: ()=>{}, fill: ()=>{}, stroke: ()=>{}, closePath: ()=>{}, save: ()=>{}, restore: ()=>{},
        translate: ()=>{}, rotate: ()=>{}, scale: ()=>{}, fillText: ()=>{}, measureText: ()=>({width:10}),
        setLineDash: ()=>{}, ellipse: ()=>{}, rect: ()=>{},
        shadowBlur: 0, shadowColor: '', fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1
    }; }
    captureStream() { return {}; }
}
global.window = { innerWidth: 800, innerHeight: 600, addEventListener: ()=>{}, AudioContext: class { constructor(){ this.state='running'; } } };
global.document = { 
    getElementById: (id) => new DOMElement(id),
    createElement: (tag) => new DOMElement(tag)
};
global.performance = { now: () => Date.now() };
global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
global.localStorage = { getItem: ()=>null, setItem: ()=>{} };
global.MediaRecorder = class { constructor() {} start() {} stop() {} };
global.URL = { createObjectURL: ()=>{} };
global.Blob = class {};
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Death Replay Globals
let mediaRecorder = null;
let recordedChunks = [];
let replayVideoUrl = null;

function startRecording() {
    try {
        let stream = canvas.captureStream(30);
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        recordedChunks = [];
        mediaRecorder.ondataavailable = e => {
            if (e.data.size > 0) {
                recordedChunks.push(e.data);
                if (recordedChunks.length > 60) recordedChunks.shift(); // Keep last 6 seconds
            }
        };
        mediaRecorder.start(100);
    } catch(e) { console.warn("MediaRecorder not supported", e); }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        setTimeout(() => {
            let blob = new Blob(recordedChunks, { type: 'video/webm' });
            replayVideoUrl = URL.createObjectURL(blob);
            let videoContainer = document.getElementById('replay-container');
            if (!videoContainer) {
                videoContainer = document.createElement('div');
                videoContainer.id = 'replay-container';
                videoContainer.style.marginTop = '20px';
                videoContainer.innerHTML = `
                    <h3 style="color:#ff5555; text-shadow: 0 0 5px red;">💀 死亡回放 (Death Replay - Last 5s)</h3>
                    <video id="replay-video" width="600" controls autoplay loop style="border: 2px solid red; border-radius: 10px;"></video>
                `;
                let goScreen = document.getElementById('game-over-screen');
                goScreen.insertBefore(videoContainer, goScreen.firstChild);
            }
            if (replayVideoUrl) {
                document.getElementById('replay-video').src = replayVideoUrl;
            }
        }, 200);
    }
}

let CANVAS_W = window.innerWidth;
let CANVAS_H = window.innerHeight;
canvas.width = CANVAS_W;
canvas.height = CANVAS_H;

window.addEventListener('resize', () => {
    CANVAS_W = window.innerWidth;
    CANVAS_H = window.innerHeight;
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;

    bgCanvas.width = CANVAS_W;
    bgCanvas.height = CANVAS_H;
});

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

let players = [];
let zombies = [];
let bullets = [];
let particles = [];
let floatingTexts = [];
let lootBoxes = [];
let boars = [];
let lootTimer = 0;

let spawnTimer = 0;
let spawnRate = 60;
let frameCount = 0;
let screenShake = 0;
let comboCount = 0;
let comboTimer = 0;
let bgCanvas = document.createElement('canvas');
bgCanvas.width = window.innerWidth;
bgCanvas.height = window.innerHeight;
let bgCtx = bgCanvas.getContext('2d');
let hitStopFrames = 0;
let flashFrames = 0;
let currentWave = 1;
let waveTimer = 0;
let barrels = [];

let camera = {x: 0, y: 0};
let buildings = [];
let shockwaves = [];
let bloodStains = [];
let geoms = [];
let scoreMultiplier = 1;
let generatedChunks = new Set();
const CHUNK_SIZE = 800;

class Building {
    constructor(x, y, w, h, type = 'solid') {
        this.x = x; this.y = y; this.w = w; this.h = h;
        this.type = type;
    }
    draw(ctx) {
        if (this.type === 'shelter') {
            ctx.fillStyle = 'rgba(0, 255, 255, 0.05)';
            ctx.fillRect(this.x, this.y, this.w, this.h);
            
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00ffff';
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
            ctx.setLineDash([10, 10]);
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x, this.y, this.w, this.h);
            ctx.setLineDash([]);
            ctx.shadowBlur = 0;
            
            ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
            ctx.font = '14px "Share Tech Mono", monospace';
            ctx.fillText('避难所 (Shelter)', this.x + 10, this.y + 20);
        } else {
            ctx.fillStyle = '#000000';
            ctx.fillRect(this.x, this.y, this.w, this.h);
            
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00ffff';
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x, this.y, this.w, this.h);
            ctx.shadowBlur = 0;
        }
    }
}

class Blood {
    constructor(x, y, w, h, color) {
        this.x = x; this.y = y; this.w = w; this.h = h; this.color = color;
        this.life = 1.0;
    }
    draw(ctx) {
        if(this.life <= 0) return;
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life;
        ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.globalAlpha = 1.0;
    }
}


class Barrel {
    constructor(x, y) {
        this.size = 20;
        let pos = getValidDropPosition(x, y, this.size);
        this.x = pos.x; 
        this.y = pos.y;
        this.hp = 50;
        this.active = true;
        this.dropY = -500; // For drop animation
    }
    update() {
        if(!this.active) return;
        if(this.dropY < 0) {
            this.dropY += 15;
            if(this.dropY >= 0) {
                this.dropY = 0;
                screenShake = 2;
            }
            return; // Don't explode while dropping
        }
        
        let shouldExplode = false;
        zombies.forEach(z => {
            if(z.active && Math.hypot(z.x - this.x, z.y - this.y) < this.size + z.size) shouldExplode = true;
        });
        players.forEach(p => {
            if(p.hp > 0 && Math.hypot(p.x - this.x, p.y - this.y) < this.size + p.size) shouldExplode = true;
        });
        
        if(shouldExplode || this.hp <= 0) {
            this.explode();
        }
    }
    explode() {
        if(!this.active) return;
        this.active = false;
        createParticles(this.x, this.y, '#ffaa00', 50);
        audio.shootShotgun();
        
        zombies.forEach(z => {
            if(z.active && Math.hypot(z.x - this.x, z.y - this.y) < 150) {
                z.hp -= 500;
                if(z.hp <= 0) {
                    z.active = false;
                    score += z.scoreVal;
                    if(this.lastHitBy) {
                        let owner = players.find(pl => pl.id === this.lastHitBy);
                        if(owner) owner.score += z.scoreVal;
                    }
                }
            }
        });
        players.forEach(p => {
            if(p.hp > 0 && Math.hypot(p.x - this.x, p.y - this.y) < 100) {
                p.hp -= 5;
                audio.playerHit();
            }
        });
        addFloatingText(this.x, this.y, "💥 轰隆!", "#ff5500");
    }
    draw(ctx) {
        if(!this.active) return;
        let drawY = this.y + this.dropY;
        
        // Draw warning shadow if dropping
        if(this.dropY < 0) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.ellipse(this.x, this.y, Math.max(0.1, 20 + this.dropY/10), Math.max(0.1, 10 + this.dropY/20), 0, 0, Math.PI*2);
            ctx.fill();
        }
        
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff3300';
        ctx.fillStyle = '#000000';
        ctx.strokeStyle = '#ff3300';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, drawY, 15, 0, Math.PI*2);
        ctx.fill();
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(this.x - 8, drawY - 8); ctx.lineTo(this.x + 8, drawY + 8);
        ctx.moveTo(this.x + 8, drawY - 8); ctx.lineTo(this.x - 8, drawY + 8);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
}

let activeEvent = null;
let eventTimer = 0;

// Inputs
const keys = {
    ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
    KeyW: false, KeyS: false, KeyA: false, KeyD: false,
    Space: false, Enter: false, NumpadEnter: false, KeyQ: false, ShiftRight: false, Slash: false
};

let mouse = {x: 0, y: 0, isDown: false, screenX: 0, screenY: 0};

function resetP1AI() {
    if(gameState === 'PLAYING') {
        players.forEach(p => {
            if(p.id === 1) {
                p.lastInputTime = Date.now();
                p.isAI = false;
            }
        });
    }
}

window.addEventListener('mousemove', e => {
    let rect = canvas.getBoundingClientRect();
    let scaleX = canvas.width / rect.width;
    let scaleY = canvas.height / rect.height;
    mouse.screenX = (e.clientX - rect.left) * scaleX;
    mouse.screenY = (e.clientY - rect.top) * scaleY;
    resetP1AI();
});
window.addEventListener('mousedown', e => { if(e.button === 0) { mouse.isDown = true; resetP1AI(); } });
window.addEventListener('mouseup', e => { if(e.button === 0) mouse.isDown = false; });

window.addEventListener('keydown', e => {
    if(keys.hasOwnProperty(e.code)) keys[e.code] = true;
    if(['KeyI', 'KeyJ', 'KeyK', 'KeyL'].includes(e.code)) keys[e.code] = true;
    
    // Reset AI timer on any key press
    if(gameState === 'PLAYING') {
        players.forEach(p => {
            if(p.id === 1 && (e.code === 'KeyW' || e.code === 'KeyA' || e.code === 'KeyS' || e.code === 'KeyD' || e.code === 'Space')) {
                p.lastInputTime = Date.now();
                p.isAI = false;
            }
            if(p.id === 2 && (e.code === 'ArrowUp' || e.code === 'ArrowLeft' || e.code === 'ArrowDown' || e.code === 'ArrowRight' || e.code === 'Enter' || e.code === 'NumpadEnter')) {
                p.lastInputTime = Date.now();
                p.isAI = false;
            }
        });
    }
    if((e.code === 'KeyQ' || e.code === 'ShiftRight' || e.code === 'Slash') && gameState === 'PLAYING') {
        players.forEach(p => { 
            if(((e.code==='KeyQ'&&p.id===1) || ((e.code==='ShiftRight'||e.code==='Slash')&&p.id===2)) && p.hasUlt) {
                p.hasUlt = false;
                // Fire Ultimate: 360 degree lasers
                audio.levelUp();
                screenShake = 10;
                addFloatingText(p.x, p.y - 50, "⚡ 万剑归宗 ⚡", "#00ffff");
                for(let angle=0; angle<Math.PI*2; angle+=Math.PI/16) {
                    let b = new Bullet(p.x, p.y, Math.cos(angle), Math.sin(angle), 20, 150, '#00ffff', true, p.id);
                    b.size = 10;
                    bullets.push(b);
                }
            }
        });
    }
    if((e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter') && gameState === 'PLAYING') {
        players.forEach(p => { if((e.code==='Space'&&p.id===1) || ((e.code==='Enter'||e.code==='NumpadEnter')&&p.id===2)) p.shoot(); });
        e.preventDefault();
    }
});
window.addEventListener('keyup', e => {
    if(keys.hasOwnProperty(e.code)) keys[e.code] = false;
    if(['KeyI', 'KeyJ', 'KeyK', 'KeyL'].includes(e.code)) keys[e.code] = false;
});

// UI Elements
document.getElementById('high-score').textContent = highScore;
document.getElementById('start-btn').onclick = startGame;
document.getElementById('restart-btn').onclick = startGame;
document.getElementById('pause-btn').onclick = togglePause;
document.getElementById('resume-btn').onclick = togglePause;

// --- CLASSES ---

class Player {
    constructor(id) {
        this.id = id;
        this.x = CANVAS_W / 2 + (id === 1 ? -50 : 50);
        this.y = CANVAS_H / 2;
        this.size = 20;
        this.speed = 4.0;
        this.color = id === 1 ? '#00bfff' : '#00ff00';
        this.facing = {x: 1, y: 0}; // default facing right
        this.hp = 3;
        this.score = 0;
        this.maxHp = 10;
        this.weaponLevel = 0;
        this.cooldown = 0;
        this.buffTime = 0;
        this.shieldTime = 0;
        this.mechTime = 0; this.vehicleHp = 0;
        this.mechType = 0;
        this.ultType = null;
        this.ultLevel = 0;
        this.ultCooldown = 0;
        this.mechHp = 0;
        this.vehicleTime = 0;
        this.reviveProgress = 0; // 0 to 180 (3 seconds at 60fps)
        this.invincibleTime = 0; // I-frames
        this.isDowned = false;
        this.lastInputTime = Date.now();
        this.isAI = false;
        
        this.weapons = [];
        for(let i=1; i<=30; i++) {
            let w = {name: `Lv.${i} 手枪`, cd: 15, damage: 20, speed: 10, count: 1, spread: 0, pierce: false, isShockwave: false, isHoming: false};
            
            w.damage = 20 + Math.floor(i / 2) * 10;
            w.speed = 10 + i * 0.4;
            w.req = i * 4; // Much faster leveling
            
            if(i <= 5) {
                w.name = `Lv.${i} 战术手枪`;
                w.count = 1;
                w.cd = Math.max(5, 14 - i * 1.5);
                w.color = '#ffffff'; // White
            } else if (i <= 10) {
                w.name = `Lv.${i} 霰弹枪`;
                w.count = 3 + Math.floor((i-5)); // 3 to 8 bullets!
                w.spread = 0.6 + (i-5)*0.1;
                w.cd = 20 - (i-5)*1.5;
                w.damage = 40 + i * 4;
                w.color = '#add8e6'; // Light Blue
            } else if (i <= 15) {
                w.name = `Lv.${i} 突击步枪`;
                w.count = 1 + Math.floor((i-10)/2); // 1 to 3 bullets per shot
                w.spread = 0.2; 
                w.cd = Math.max(3, 8 - Math.floor((i-10)*1.2)); // Extremely fast
                w.damage = 35 + i * 5;
                w.speed = 18;
                w.color = '#00ffff'; // Cyan
            } else if (i <= 20) {
                w.name = `Lv.${i} 高能激光`;
                w.count = 1 + Math.floor((i-15)/2); // 1 to 3 piercing lasers
                w.spread = 0.2;
                w.pierce = true;
                w.speed = 30; // Super fast
                w.size = 10 + (i-15); // Larger and larger!
                w.cd = 18 - (i-15);
                w.damage = 120 + i * 10;
                w.color = '#00ffcc'; // Mint Green
            } else if (i <= 25) {
                w.name = `Lv.${i} 蜂群导弹`;
                w.count = 3 + (i-20); // 3 to 8 missiles!
                w.spread = 1.2;
                w.isHoming = true;
                w.cd = 25 - (i-20);
                w.damage = 180 + i * 5;
                w.speed = 10;
                w.color = '#00ff00'; // Lime Green
            } else if (i < 30) {
                w.name = `Lv.${i} 电磁脉冲`;
                w.isShockwave = true;
                w.radius = 250 + (i-25)*25;
                w.damage = 250 + (i-25)*50;
                w.cd = 18 - (i-25)*2;
                w.color = '#ffff00'; // Yellow pulse
            } else { 
                w.name = "🌌 超新星爆破 🌌";
                w.isShockwave = true;
                w.radius = 600;
                w.damage = 1000;
                w.cd = 10;
                w.color = '#ffffff'; // Blinding white
            }
            this.weapons.push(w);
        }
        this.weapon = this.weapons[this.weaponLevel];
    }

    update() {
        if(this.cooldown > 0 && this.buffTime <= 0) this.cooldown--;
        if(this.cooldown > 0 && this.buffTime > 0) this.cooldown -= 2;
        if(this.buffTime > 0) this.buffTime--;
        if(this.shieldTime > 0) this.shieldTime--;
        if(this.invincibleTime > 0) this.invincibleTime--;

        
        if(this.vehicleHp > 0) {
            // Vehicle ramming
            zombies.forEach(z => {
                if(!z.active) return;
                let d = Math.hypot(z.x - this.x, z.y - this.y);
                if(d < this.size + z.size + 10) {
                    if (z.isBoss || z.isUltimateBoss) {
                        z.hp -= 100; // Deal damage to bosses instead of instant kill
                        this.vehicleHp -= 0.5; // Vehicle takes damage from ramming bosses
                        createParticles(z.x, z.y, '#ffff00', 10);
                        return;
                    }
                    z.active = false;
                    score += z.scoreVal;
                    this.score += z.scoreVal;
                    killCount++;
                    createParticles(z.x, z.y, '#ff0000', 15);
                    screenShake = Math.max(screenShake, 5);
                    for(let b=0; b<5; b++) bloodStains.push(new Blood(z.x + (Math.random()-0.5)*40, z.y + (Math.random()-0.5)*40, Math.random()*8+4, Math.random()*8+4, '#800000'));
                    comboCount++; comboTimer = 180;
                    if(comboCount % 10 === 0) { addFloatingText(CANVAS_W/2, 100, `${comboCount} 连杀 (COMBO)!`, '#00ccff'); audio.levelUp(); }
                    audio.zombieDie();
                    addFloatingText(z.x, z.y, "🔵 疾速冲击!", "#00ffff");
                }
            });
        }
        let dx = 0; let dy = 0;
        let currentSpeed = this.speed;
        if(this.buffTime > 0) currentSpeed *= 1.5;
        if(this.mechHp > 0) {
            if(this.mechType === 1) currentSpeed *= 0.4;
            else if(this.mechType === 2) currentSpeed *= 0.6;
            else if(this.mechType === 3) currentSpeed *= 1.3;
        }
        if(this.vehicleHp > 0) currentSpeed *= 3.0; // Vehicle is fast

        
        if(Date.now() - this.lastInputTime > 5000) {
            this.isAI = true;
        }

        if(this.hp <= 0) {
            if(!this.isDowned) {
                this.isDowned = true;
                this.reviveProgress = 0;
                this.mechHp = 0;
                this.vehicleHp = 0;
                this.buffTime = 0;
            }
            if(this.isDowned) {
                // Check if other alive player is near
                let beingRevived = false;
                players.forEach(p => {
                    if(p !== this && p.hp > 0 && !p.isDowned) {
                        if(Math.hypot(p.x - this.x, p.y - this.y) < 60) {
                            beingRevived = true;
                            this.reviveProgress++;
                            if(this.reviveProgress >= 120) { // 2 seconds to revive
                                this.isDowned = false;
                                this.hp = this.maxHp / 2;
                                this.mechHp = 0;
                                this.vehicleHp = 0;
                                this.shieldTime = 0;
                                this.buffTime = 0;
                                this.reviveProgress = 0;
                                addFloatingText(this.x, this.y - 40, "💉 重生协议启动!", "#00ff00");
                                audio.levelUp();
                            }
                        }
                    }
                });
                if(!beingRevived) this.reviveProgress = Math.max(0, this.reviveProgress - 2);
            }
            return; // Downed/dead player cannot move or shoot
        }

        if(this.isAI) {
            let closestZDist = Infinity;
            let targetZ = null;
            zombies.forEach(z => {
                if(!z.active) return;
                let d = Math.hypot(z.x - this.x, z.y - this.y);
                if(d < closestZDist) { closestZDist = d; targetZ = z; }
            });

            let closestLootDist = Infinity;
            let targetLoot = null;
            lootBoxes.forEach(lb => {
                let d = Math.hypot(lb.x - this.x, lb.y - this.y);
                if(d < closestLootDist) { closestLootDist = d; targetLoot = lb; }
            });
            
            let closestBarrelDist = Infinity;
            let targetBarrel = null;
            barrels.forEach(b => {
                if(!b.active) return;
                let d = Math.hypot(b.x - this.x, b.y - this.y);
                if(d < closestBarrelDist) { closestBarrelDist = d; targetBarrel = b; }
            });

            let downedTeammate = null;
            players.forEach(p => {
                if(p !== this && p.isDowned) downedTeammate = p;
            });

            if(targetZ) {
                let tdx = targetZ.x - this.x;
                let tdy = targetZ.y - this.y;
                let tLen = Math.hypot(tdx, tdy);
                if(tLen > 0) this.facing = {x: tdx/tLen, y: tdy/tLen};
                // Don't shoot if a barrel is right in front of us, or if blocked by a wall
                let safeToShoot = true;
                if(!hasLineOfSight(this.x, this.y, targetZ.x, targetZ.y)) {
                    safeToShoot = false;
                }
                if(targetBarrel && closestBarrelDist < 200) {
                    // Check if barrel is roughly in the direction we are facing
                    let bdx = (targetBarrel.x - this.x) / closestBarrelDist;
                    let bdy = (targetBarrel.y - this.y) / closestBarrelDist;
                    let dotProd = (bdx * this.facing.x) + (bdy * this.facing.y);
                    if(dotProd > 0.8) safeToShoot = false; // Barrel is in line of fire!
                }
                if(safeToShoot) this.shoot();
            }
            
            // Priority 1: Dodge Barrels (Extremely dangerous)
            if(closestBarrelDist < 160 && targetBarrel) {
                dx = -(targetBarrel.x - this.x) / closestBarrelDist;
                dy = -(targetBarrel.y - this.y) / closestBarrelDist;
            }
            // Priority 2: Dodge Zombies
            else if(closestZDist < 120 && targetZ) {
                dx = -(targetZ.x - this.x) / closestZDist;
                dy = -(targetZ.y - this.y) / closestZDist;
            } 
            // Priority 3: Revive
            else if(downedTeammate) {
                let dist = Math.hypot(downedTeammate.x - this.x, downedTeammate.y - this.y);
                if(dist > 10) {
                    dx = (downedTeammate.x - this.x) / dist;
                    dy = (downedTeammate.y - this.y) / dist;
                }
            } 
            // Priority 4: Loot
            else if(targetLoot) {
                dx = (targetLoot.x - this.x) / closestLootDist;
                dy = (targetLoot.y - this.y) / closestLootDist;
            } 
            // Priority 5: Kite Zombies
            else if(targetZ) {
                if(closestZDist > 250) {
                    dx = (targetZ.x - this.x) / closestZDist;
                    dy = (targetZ.y - this.y) / closestZDist;
                } else {
                    dx = -this.facing.y;
                    dy = this.facing.x;
                }
            }

            
        } else {
            // Player Logic
            let wantsToUlt = false;
            let wantsToShoot = false;
            if(this.id === 1) {
                if(keys.KeyW) dy -= 1;
                if(keys.KeyS) dy += 1;
                if(keys.KeyA) dx -= 1;
                if(keys.KeyD) dx += 1;
                if(keys.Space) wantsToUlt = true;
            } else {
                if(keys.ArrowUp) dy -= 1;
                if(keys.ArrowDown) dy += 1;
                if(keys.ArrowLeft) dx -= 1;
                if(keys.ArrowRight) dx += 1;
                if(keys.Enter || keys.NumpadEnter) wantsToUlt = true;
            }

            if(dx !== 0 || dy !== 0) {
                const len = Math.hypot(dx, dy);
                dx /= len; dy /= len;
            }

            // Hybrid Aiming (Geometry Wars / Vampire Survivors style)
            if(this.id === 1) {
                if(mouse.isDown) {
                    // Manual Override: aim and shoot at mouse
                    let mx = mouse.screenX + camera.x - canvas.width/2;
                    let my = mouse.screenY + camera.y - canvas.height/2;
                    let ax = mx - this.x;
                    let ay = my - this.y;
                    let aLen = Math.hypot(ax, ay);
                    if(aLen > 0) this.facing = {x: ax/aLen, y: ay/aLen};
                    wantsToShoot = true;
                } else {
                    // Auto-Aim \u0026 Auto-Shoot at nearest enemy
                    let closestZDist = Infinity;
                    let targetZ = null;
                    zombies.forEach(z => {
                        if(!z.active) return;
                        let d = Math.hypot(z.x - this.x, z.y - this.y);
                        if(d < closestZDist && hasLineOfSight(this.x, this.y, z.x, z.y)) { 
                            closestZDist = d; 
                            targetZ = z; 
                        }
                    });
                    
                    if(targetZ && closestZDist < 800) {
                        let ax = targetZ.x - this.x;
                        let ay = targetZ.y - this.y;
                        let aLen = Math.hypot(ax, ay);
                        if(aLen > 0) this.facing = {x: ax/aLen, y: ay/aLen};
                        
                        // Avoid shooting barrels by accident
                        let safeToShoot = true;
                        barrels.forEach(b => {
                            if(!b.active) return;
                            let bd = Math.hypot(b.x - this.x, b.y - this.y);
                            if(bd < 250) {
                                let bdx = (b.x - this.x) / bd;
                                let bdy = (b.y - this.y) / bd;
                                let dotProd = (bdx * this.facing.x) + (bdy * this.facing.y);
                                if(dotProd > 0.85) safeToShoot = false;
                            }
                        });
                        
                        if(safeToShoot) wantsToShoot = true;
                    }
                }
            } else {
                let ax = 0; let ay = 0;
                if(keys.KeyI) ay -= 1;
                if(keys.KeyK) ay += 1;
                if(keys.KeyJ) ax -= 1;
                if(keys.KeyL) ax += 1;
                
                if(ax !== 0 || ay !== 0) {
                    // Manual Override: aim and shoot using IJKL
                    let aLen = Math.hypot(ax, ay);
                    this.facing = {x: ax/aLen, y: ay/aLen};
                    wantsToShoot = true;
                } else {
                    // Auto-Aim & Auto-Shoot at nearest enemy
                    let closestZDist = Infinity;
                    let targetZ = null;
                    zombies.forEach(z => {
                        if(!z.active) return;
                        let d = Math.hypot(z.x - this.x, z.y - this.y);
                        if(d < closestZDist && hasLineOfSight(this.x, this.y, z.x, z.y)) { 
                            closestZDist = d; 
                            targetZ = z; 
                        }
                    });
                    
                    if(targetZ && closestZDist < 800) {
                        let tx = targetZ.x - this.x;
                        let ty = targetZ.y - this.y;
                        let tLen = Math.hypot(tx, ty);
                        if(tLen > 0) this.facing = {x: tx/tLen, y: ty/tLen};
                        
                        // Avoid shooting barrels by accident
                        let safeToShoot = true;
                        barrels.forEach(b => {
                            if(!b.active) return;
                            let bd = Math.hypot(b.x - this.x, b.y - this.y);
                            if(bd < 250) {
                                let bdx = (b.x - this.x) / bd;
                                let bdy = (b.y - this.y) / bd;
                                let dotProd = (bdx * this.facing.x) + (bdy * this.facing.y);
                                if(dotProd > 0.85) safeToShoot = false;
                            }
                        });
                        
                        if(safeToShoot) wantsToShoot = true;
                    } else if(dx !== 0 || dy !== 0) {
                        // Just look in moving direction if no enemies
                        this.facing = {x: dx, y: dy};
                    }
                }
            }
            
            if(wantsToShoot) this.shoot();
            if(wantsToUlt) this.useUltimate();
            
            if(this.ultCooldown > 0) this.ultCooldown--;
        }

        // Apply jitter to avoid perfect perpendicular lock, and split X/Y axes to allow sliding
        let jitterX = (Math.random() - 0.5) * 0.1;
        let jitterY = (Math.random() - 0.5) * 0.1;

        this.x += (dx + jitterX) * currentSpeed;
        resolveBuildingCollision(this);
        this.y += (dy + jitterY) * currentSpeed;
        resolveBuildingCollision(this);

        // Co-op Screen Binding: Restrict movement relative to teammates to prevent camera easing stutter
        let aliveTeammates = players.filter(p => p !== this && p.hp > 0);
        if (aliveTeammates.length > 0) {
            let margin = 50;
            let other = aliveTeammates[0];
            let maxDx = canvas.width - 2*margin;
            let maxDy = canvas.height - 2*margin;
            if (this.x < other.x - maxDx) this.x = other.x - maxDx;
            if (this.x > other.x + maxDx) this.x = other.x + maxDx;
            if (this.y < other.y - maxDy) this.y = other.y - maxDy;
            if (this.y > other.y + maxDy) this.y = other.y + maxDy;
        }

        // Check weapon level up
        for(let i = this.weapons.length - 1; i >= 0; i--) {
            if(killCount >= this.weapons[i].req) {
                if(this.weaponLevel !== i) {
                    this.weaponLevel = i;
                    audio.levelUp();
                    addFloatingText(this.x, this.y - 30, "🔫 火力升级!", "#00ff00");
                    if(this.id === 1) document.getElementById('p1-weapon').textContent = this.weapons[i].name;
                }
                break;
            }
        }
    }

    shoot() {
        if(this.hp <= 0 || this.isDowned || this.cooldown > 0) return;
        
        if(this.vehicleHp > 0) {
            this.cooldown = 15;
            audio.shootLaser();
            // Motorcycle fires multiple homing missiles
            let angle = Math.atan2(this.facing.y, this.facing.x);
            bullets.push(new Bullet(this.x, this.y, Math.cos(angle), Math.sin(angle), 12, 150, '#00bfff', false, this.id, true));
            bullets.push(new Bullet(this.x, this.y, Math.cos(angle-0.3), Math.sin(angle-0.3), 12, 150, '#00bfff', false, this.id, true));
            bullets.push(new Bullet(this.x, this.y, Math.cos(angle+0.3), Math.sin(angle+0.3), 12, 150, '#00bfff', false, this.id, true));
            return;
        }

        if(this.mechHp > 0) {
            if(this.mechType === 1) { 
                this.cooldown = 20;
                audio.shootLaser();
                let b = new Bullet(this.x, this.y, this.facing.x, this.facing.y, 10, 400, '#00ff88', true, this.id);
                b.size = 15;
                bullets.push(b);
                let angle = Math.atan2(this.facing.y, this.facing.x);
                bullets.push(new Bullet(this.x, this.y, Math.cos(angle-0.2), Math.sin(angle-0.2), 12, 200, '#00ffff', false, this.id, true));
                bullets.push(new Bullet(this.x, this.y, Math.cos(angle+0.2), Math.sin(angle+0.2), 12, 200, '#00ffff', false, this.id, true));
            } else if(this.mechType === 2) { 
                this.cooldown = 10;
                audio.shootLaser();
                for(let i=0; i<8; i++) {
                    let angle = Math.PI/4 * i + (frameCount*0.1);
                    bullets.push(new Bullet(this.x, this.y, Math.cos(angle), Math.sin(angle), 15, 50, '#00ffff', false, this.id, true));
                }
                bullets.push(new Bullet(this.x, this.y, this.facing.x, this.facing.y, 12, 100, '#00ffcc', false, this.id, true));
            } else if(this.mechType === 3) { 
                this.cooldown = 3;
                audio.shootMachine();
                let angle = Math.atan2(this.facing.y, this.facing.x) + (Math.random()-0.5)*0.15;
                bullets.push(new Bullet(this.x, this.y, Math.cos(angle), Math.sin(angle), 25, 30, '#00ffff', true, this.id));
                bullets.push(new Bullet(this.x, this.y, Math.cos(angle), Math.sin(angle), 15, 80, '#00ffcc', false, this.id, true));
            }
            return;
        }

        let w = this.weapon;
        this.cooldown = w.cd;
        
        if (w.isShockwave) {
            shockwaves.push(new Shockwave(this.x, this.y, w.color || '#00ffff', w.damage, w.radius, this.id));
            audio.shootShotgun();
            screenShake = 2;
            return;
        }

        let baseAngle = Math.atan2(this.facing.y, this.facing.x);
        let count = w.count;
        let spread = w.spread;
        
        let startAngle = count === 1 ? baseAngle : baseAngle - spread/2;
        let angleStep = count === 1 ? 0 : spread / (count - 1);
        
        for(let i = 0; i < count; i++) {
            let angle = startAngle + i * angleStep;
            let b = new Bullet(this.x, this.y, Math.cos(angle), Math.sin(angle), w.speed, w.damage, w.color || '#fff', w.pierce, this.id, w.isHoming);
            
            if(!w.color) {
                if(this.weaponLevel >= 29) b.color = '#00ffcc';
                else if(count >= 5) b.color = '#00ff00';
                else if(w.pierce) b.color = '#00ffff';
            }
            
            b.size = w.size || (w.pierce ? 5 : 4);
            if(w.isHoming) b.size = 6;
            bullets.push(b);
        }
        audio.shootPistol();
    }

    useUltimate() {
        if(this.hp <= 0 || this.isDowned) return;
        if(this.ultLevel === 0 || this.ultCooldown > 0) return;
        
        let baseCooldown = 900; // 15 seconds base
        this.ultCooldown = Math.max(120, baseCooldown - (this.ultLevel * 100)); // Reduces with level
        
        audio.levelUp(); 
        createParticles(this.x, this.y, '#00ffff', 50); 
        screenShake = 10;
        
        let levelScale = 1 + (this.ultLevel * 0.3);
        let ultNames = ["", "霓虹新星 (Neon Nova)", "时光裂隙 (Time Flux)", "追踪光刃 (Homing Swarm)", "电磁网阵 (Laser Grid)", "轨道打击 (Orbital Strike)", "等离子雷 (Plasma Mines)", "剑气风暴 (Blade Vortex)", "治愈波纹 (Heal Burst)", "绝对领域 (God Mode)", "闪电链 (Chain Lightning)"];
        addFloatingText(this.x, this.y - 50, `大招: ${ultNames[this.ultType]}!`, "#00ffff");

        switch(this.ultType) {
            case 1: // Neon Nova
                shockwaves.push(new Shockwave(this.x, this.y, '#00ffff', 2000 * levelScale, 400 * levelScale, this.id));
                for(let i=0; i<30; i++) createParticles(this.x, this.y, '#00ffff', 5);
                break;
            case 2: // Time Flux
                hitStopFrames = Math.floor(180 * levelScale); // Freeze all zombies
                break;
            case 3: // Homing Swarm
                for(let i=0; i<20 * levelScale; i++) {
                    let a = Math.random() * Math.PI * 2;
                    let b = new Bullet(this.x, this.y, Math.cos(a), Math.sin(a), 15, 300, '#00ffcc', false, this.id, true);
                    b.size = 8;
                    bullets.push(b);
                }
                break;
            case 4: // Laser Grid
                for(let i=0; i<16; i++) {
                    let a = (Math.PI * 2 / 16) * i;
                    let b = new Bullet(this.x, this.y, Math.cos(a), Math.sin(a), 25, 800 * levelScale, '#00ffff', true, this.id);
                    b.size = 10;
                    bullets.push(b);
                }
                break;
            case 5: // Orbital Strike
                let ang = Math.atan2(this.facing.y, this.facing.x);
                let beam = new Bullet(this.x, this.y, Math.cos(ang), Math.sin(ang), 40, 3000 * levelScale, '#00ff00', true, this.id);
                beam.size = 80 * levelScale;
                bullets.push(beam);
                break;
            case 6: // Plasma Mines
                for(let i=0; i<10 + this.ultLevel*3; i++) {
                    barrels.push(new Barrel(this.x + (Math.random()-0.5)*500, this.y + (Math.random()-0.5)*500));
                }
                break;
            case 7: // Blade Vortex
                for(let i=0; i<30 * levelScale; i++) {
                    let a = Math.random() * Math.PI * 2;
                    let b = new Bullet(this.x, this.y, Math.cos(a), Math.sin(a), 3 + Math.random()*2, 400, '#00ff00', true, this.id);
                    b.size = 6;
                    bullets.push(b);
                }
                break;
            case 8: // Heal Burst
                this.hp = Math.min(this.maxHp, this.hp + 3 * levelScale);
                players.forEach(p => { if(p!==this && p.hp>0) p.hp = Math.min(p.maxHp, p.hp + 3 * levelScale); });
                break;
            case 9: // God Mode
                this.shieldTime = 400 * levelScale;
                this.buffTime = 400 * levelScale;
                break;
            case 10: // Chain Lightning
                let radius = 500 * levelScale;
                zombies.forEach(z => {
                    if(z.active && Math.hypot(z.x-this.x, z.y-this.y) < radius) {
                        z.hp -= 2000 * levelScale;
                        createParticles(z.x, z.y, '#00ffff', 5);
                        if(z.hp <= 0) { z.active = false; this.score += z.scoreVal; }
                    }
                });
                break;
        }
    }

    draw(ctx) {
        if(this.hp <= 0) {
            // Draw Tombstone
            ctx.fillStyle = '#666';
            ctx.fillRect(this.x - 15, this.y - 15, 30, 35);
            ctx.beginPath(); ctx.arc(this.x, this.y - 15, 15, Math.PI, 0); ctx.fill();
            ctx.fillStyle = '#000'; ctx.font = '16px "Share Tech Mono", monospace'; ctx.fillText('阵亡', this.x, this.y - 2);
            ctx.font = '12px "Share Tech Mono", monospace'; ctx.fillText('(RIP)', this.x, this.y + 10);
            
            ctx.fillStyle = '#fff';
            ctx.font = '12px "Share Tech Mono", monospace';
            ctx.fillText('P' + this.id + ' 等待救援...', this.x, this.y - 35);
            
            // Draw Revive Progress Bar
            if(this.reviveProgress > 0) {
                ctx.fillStyle = '#222'; ctx.fillRect(this.x - 20, this.y + 25, 40, 6);
                ctx.fillStyle = '#0f0'; ctx.fillRect(this.x - 20, this.y + 25, 40 * (this.reviveProgress/120), 6);
            }
            return;
        }

        // Damage flickering (I-frames)
        if (this.invincibleTime > 0 && Math.floor(frameCount / 4) % 2 === 0) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(Math.atan2(this.facing.y, this.facing.x));
        
        // Aura states (Mech/Vehicle)
        if (this.mechHp > 0) {
            // High-tech Mech Aura (Orange/Red hexagon or rings)
            ctx.strokeStyle = `rgba(255, 100, 0, ${0.8 + Math.sin(frameCount * 0.2)*0.2})`;
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(0, 0, this.size + 15, 0, Math.PI * 2);
            ctx.stroke();
            
            // Outer dashed ring
            ctx.setLineDash([10, 15]);
            ctx.strokeStyle = '#ff3300';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, this.size + 22, frameCount*0.05, Math.PI * 2 + frameCount*0.05);
            ctx.stroke();
            ctx.setLineDash([]); // reset
        } else if (this.vehicleHp > 0) {
            // Speed Vehicle Aura (Blue/Cyan streamlined rings)
            ctx.strokeStyle = `rgba(0, 255, 255, ${0.8 + Math.sin(frameCount * 0.4)*0.2})`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.ellipse(0, 0, this.size + 18, this.size + 10, 0, 0, Math.PI * 2);
            ctx.stroke();
            
            // Speed trail lines
            ctx.strokeStyle = '#0088ff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-this.size - 25, -10); ctx.lineTo(-this.size - 15, -10);
            ctx.moveTo(-this.size - 30, 0); ctx.lineTo(-this.size - 12, 0);
            ctx.moveTo(-this.size - 25, 10); ctx.lineTo(-this.size - 15, 10);
            ctx.stroke();
        }
        
        // Draw the player as a sleek glowing geometric arrow/ship
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color; // Fill with solid bright color to distinguish players
        ctx.strokeStyle = '#ffffff'; // White outline for contrast
        ctx.lineWidth = 3;

        ctx.beginPath();
        // Pointy tip at the front (facing direction)
        ctx.moveTo(this.size, 0); 
        // Back corners
        ctx.lineTo(-this.size * 0.7, this.size * 0.8);
        ctx.lineTo(-this.size * 0.3, 0); // Indent at the back
        ctx.lineTo(-this.size * 0.7, -this.size * 0.8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Faint glowing ring around the player (Geometry Wars style)
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 1.5, 0, Math.PI * 2);
        ctx.strokeStyle = this.color;
        ctx.globalAlpha = 0.3; // Faint
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.globalAlpha = 1.0;

        ctx.shadowBlur = 0;

        ctx.restore();


        // Player ID
        ctx.fillStyle = '#fff';
        ctx.font = '12px "Share Tech Mono", monospace';
        ctx.textAlign = 'center';
        let idText = this.isAI ? 'P' + this.id + ' (AI托管)' : 'P' + this.id;
        ctx.fillText(idText, this.x, this.y - 35);
        
        // Draw Floating HP Bar (Neon Style)
        let barW = 40;
        let barH = 6;
        let offsetY = 25;
        
        // Background track
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(this.x - barW/2, this.y + offsetY, barW, barH);
        
        // Neon Fill
        let hpRatio = Math.max(0, this.hp / this.maxHp);
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - barW/2, this.y + offsetY, barW * hpRatio, barH);
        ctx.shadowBlur = 0;
        
        // Border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x - barW/2, this.y + offsetY, barW, barH);

        // Draw Shield
        if(this.shieldTime > 0) {
            ctx.strokeStyle = `rgba(255, 255, 0, ${0.5 + Math.sin(frameCount * 0.2)*0.3})`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size + 10, 0, Math.PI * 2);
            ctx.stroke();
        }
        // Draw Buff aura
        if(this.buffTime > 0) {
            ctx.strokeStyle = `rgba(0, 255, 255, 0.8)`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size + 5, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Ultimate Indicator
        if(this.hasUlt) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#00ffff';
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, 40 + Math.sin(frameCount*0.2)*5, 0, Math.PI*2);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

    }
}


function resolveBuildingCollision(obj) {
    buildings.forEach(b => {
        if (b.type === 'shelter') {
            if (obj.constructor.name === 'Player' || obj.constructor.name === 'Barrel') return;
            if (obj.constructor.name === 'Zombie' && !obj.isBoss && !obj.isUltimateBoss && obj.size <= 30) return;
        }
        let testX = obj.x;
        let testY = obj.y;
        if (obj.x < b.x) testX = b.x; else if (obj.x > b.x + b.w) testX = b.x + b.w;
        if (obj.y < b.y) testY = b.y; else if (obj.y > b.y + b.h) testY = b.y + b.h;
        let distX = obj.x - testX;
        let distY = obj.y - testY;
        let distance = Math.hypot(distX, distY);
        let s = obj.size || 15;
        if (distance < s) {
            let overlap = s - distance;
            if(distance === 0) { distX = 1; distY = 0; distance = 1; }
            obj.x += (distX / distance) * overlap;
            obj.y += (distY / distance) * overlap;
        }
    });
}

function getValidDropPosition(x, y, size) {
    let validX = x, validY = y;
    let isRandom = (x === undefined || y === undefined);
    
    let attempts = 0;
    let isValid = false;
    while(!isValid && attempts < 50) {
        if(isRandom) {
            let cw = canvas.width || window.innerWidth;
            let ch = canvas.height || window.innerHeight;
            validX = camera.x - cw/2 + 50 + Math.random() * (cw - 100);
            validY = camera.y - ch/2 + 50 + Math.random() * (ch - 100);
        }
        
        isValid = true;
        for(let b of buildings) {
            if(validX + size > b.x && validX - size < b.x + b.w &&
               validY + size > b.y && validY - size < b.y + b.h) {
                isValid = false;
                break;
            }
        }
        
        if(!isRandom && !isValid) {
            // If it was a specific coordinate but stuck, slightly jitter it out
            validX += (Math.random() - 0.5) * 50;
            validY += (Math.random() - 0.5) * 50;
        }
        attempts++;
    }
    
    if(!isValid) {
        validX = camera.x;
        validY = camera.y;
    }
    return {x: validX, y: validY};
}

function hasLineOfSight(x1, y1, x2, y2) {
    let dist = Math.hypot(x2 - x1, y2 - y1);
    let steps = Math.max(1, Math.ceil(dist / 20)); // Sample every 20 pixels
    for(let i = 0; i <= steps; i++) {
        let px = x1 + (x2 - x1) * (i / steps);
        let py = y1 + (y2 - y1) * (i / steps);
        for(let b of buildings) {
            if(px > b.x && px < b.x + b.w && py > b.y && py < b.y + b.h) {
                return false;
            }
        }
    }
    return true;
}

class Bullet {
    constructor(x, y, dx, dy, speed, damage, color, pierce=false, ownerId=0, isHoming=false) {
        this.ownerId = ownerId;
        this.x = x; this.y = y;
        this.dx = dx; this.dy = dy;
        this.speed = speed;
        this.damage = damage;
        this.color = color;
        this.pierce = pierce;
        this.isHoming = isHoming;
        this.size = pierce ? 4 : 3;
        if(this.isHoming) this.size = 6;
        this.active = true;
        this.hitZombies = new Set();
    }
    update() {
        if(this.isHoming) {
            let closestDist = 400; // Seeking range
            let target = null;
            zombies.forEach(z => {
                if (!z.active) return;
                let dx = z.x - this.x;
                let dy = z.y - this.y;
                if(Math.abs(dx) < closestDist && Math.abs(dy) < closestDist) {
                    let d = dx*dx + dy*dy;
                    if(d < closestDist*closestDist) { 
                        closestDist = Math.sqrt(d); 
                        target = z; 
                    }
                }
            });
            if(target) {
                let tx = target.x - this.x;
                let ty = target.y - this.y;
                let tLen = Math.hypot(tx, ty);
                if(tLen > 0) {
                    this.dx = this.dx * 0.90 + (tx/tLen) * 0.10;
                    this.dy = this.dy * 0.90 + (ty/tLen) * 0.10;
                    let norm = Math.hypot(this.dx, this.dy);
                    this.dx /= norm; this.dy /= norm;
                }
            }
            createParticles(this.x, this.y, '#ffaa00', 1); // Flame trail
        }

        this.x += this.dx * this.speed;
        this.y += this.dy * this.speed;
        
        // Destroy bullet if it hits a wall (instead of sliding along it)
        for(let b of buildings) {
            if(this.x > b.x && this.x < b.x + b.w && this.y > b.y && this.y < b.y + b.h) {
                this.active = false;
                createParticles(this.x, this.y, '#555', 5);
                break;
            }
        }
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

class Shockwave {
    constructor(x, y, color, damage, maxRadius, ownerId) {
        this.x = x; this.y = y; this.color = color; this.damage = damage;
        this.maxRadius = maxRadius; this.ownerId = ownerId;
        this.radius = 10;
        this.active = true;
        this.hitZombies = new Set();
    }
    update() {
        if(!this.active) return;
        this.radius += 15;
        if(this.radius >= this.maxRadius) this.active = false;
        
        zombies.forEach(z => {
            if(z.active && !this.hitZombies.has(z) && Math.hypot(z.x - this.x, z.y - this.y) < this.radius + z.size) {
                this.hitZombies.add(z);
                z.hp -= this.damage;
                if(z.hp <= 0) { 
                    z.active = false; 
                    score += z.scoreVal; 
                    let owner = players.find(pl => pl.id === this.ownerId);
                    if(owner) owner.score += z.scoreVal;
                }
                createParticles(z.x, z.y, '#00ffff', 3);
            }
        });
    }
    draw(ctx) {
        if(!this.active) return;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = Math.max(1, 8 * (1 - this.radius/this.maxRadius));
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2);
        ctx.stroke();
    }
}

class Zombie {
    get scoreVal() { return this._baseScore * scoreMultiplier; }
    
    constructor(isBoss = false, isUltimateBoss = false, bossId = 0) {
        this.isBoss = isBoss;
        this.isUltimateBoss = isUltimateBoss;
        this.bossId = bossId;
        this.tier = 1;
        this.mergeTimer = 0;
        
        // Types
        if(this.isUltimateBoss) {
            this.type = 'ultimate_boss';
        } else if(this.isBoss) {
            this.type = 'boss';
        } else {
            const rand = Math.random();
            if(rand < 0.85) this.type = 'normal';
            else this.type = 'exploder';
        }
        
        if (!this.isUltimateBoss && !this.isBoss) {
            let maxSides = Math.min(11, 3 + Math.floor(survivalTime / 60)); // Unlocks higher polygons over time
            let r = Math.random();
            if (r < 0.4) this.shapeSides = 3;
            else if (r < 0.7) this.shapeSides = Math.min(4, maxSides);
            else if (r < 0.85) this.shapeSides = Math.min(5, maxSides);
            else if (r < 0.95) this.shapeSides = Math.min(6 + Math.floor(Math.random()*3), maxSides);
            else this.shapeSides = Math.min(9 + Math.floor(Math.random()*3), maxSides);
        } else {
            // Bosses have bizarre/complex shapes
            this.shapeSides = Math.floor(Math.random() * 8) + 12; // 12 to 19 sides for bosses!
        }

        if(this.isUltimateBoss) {
            let angle = (this.bossId / 10) * Math.PI * 2;
            this.x = camera.x + Math.cos(angle) * 4500;
            this.y = camera.y + Math.sin(angle) * 4500;
        } else {
            const edge = Math.floor(Math.random() * 4);
            let cw = canvas.width || window.innerWidth;
            let ch = canvas.height || window.innerHeight;
            let cx = camera.x - cw/2;
            let cy = camera.y - ch/2;
            if(edge === 0) { this.x = cx + Math.random() * cw; this.y = cy - 30; }
            else if(edge === 1) { this.x = cx + cw + 30; this.y = cy + Math.random() * ch; }
            else if(edge === 2) { this.x = cx + Math.random() * cw; this.y = cy + ch + 30; }
            else { this.x = cx - 30; this.y = cy + Math.random() * ch; }
        }

        if(this.type === 'ultimate_boss') {
            this.size = 60 + (this.bossId % 4) * 10; 
            this.speed = 0.8 + (this.bossId % 3) * 0.3; 
            this.hp = 10000 + this.bossId * 1500; 
            this.color = `hsl(${this.bossId * 36}, 100%, 50%)`; 
            this.damage = 3 + (this.bossId % 2); 
            this._baseScore = 50000;
        } else if(this.type === 'boss') {
            this.size = 40; this.speed = 0.6; this.hp = 1000 + survivalTime*10; this.color = '#ff0044'; this.damage = 2; this._baseScore = 500;
        } else {
            let mult = (this.shapeSides - 2); // 3 sides -> 1x, 4 sides -> 2x, etc.
            if (this.shapeSides >= 11) mult = 15; // Circle is very strong!
            
            this.size = 12 + mult * 1.5 + Math.random()*2;
            this.speed = Math.max(0.3, 1.0 - (mult * 0.05)) + Math.random()*0.2 + (survivalTime/400);
            this.hp = (15 + survivalTime) * (mult * 0.8);
            this.damage = 1 + Math.floor(mult / 4);
            this._baseScore = 10 * mult;
            this.color = `hsl(${this.shapeSides * 30}, 100%, 50%)`; // Different color for different shapes
            
            if (this.type === 'exploder') {
                this.color = '#ff3300'; // Keep exploders reddish
                this.speed *= 1.2;
            }
        }
        
        if(activeEvent === 'bloodmoon') this.speed *= 2;
        this.maxHp = this.hp;
        this.active = true;
        this.facing = {x: 1, y: 0};
        
        // Boss Attributes
        if (this.isBoss) {
            const ultimateTraits = [
                { name: "天启·奥米茄 (Omega)", temper: "空间折跃 - 随机瞬移到玩家身边", skill: "teleport", color: "#ff0000" },
                { name: "终焉·尤弥尔 (Ymir)", temper: "隐秘猎手 - 能够完全隐身", skill: "invis", color: "#cc0000" },
                { name: "暴戾·阿瑞斯 (Ares)", temper: "狂暴极速 - 移速突然飙升", skill: "speed", color: "#ffaa00" },
                { name: "深渊·利维坦 (Leviathan)", temper: "爆破轰炸 - 召唤全屏空投炸弹", skill: "bomber", color: "#aa00ff" },
                { name: "湮灭·赛博 (Cyber)", temper: "天女散花 - 发射全屏密集弹幕", skill: "bullethell", color: "#ff0055" }
            ];
            const normalTraits = [
                { name: "折跃者 (Jumper)", temper: "瞬移突袭", skill: "teleport", color: "#ff5500" },
                { name: "幽灵 (Ghost)", temper: "隐身潜行", skill: "invis", color: "#aa00ff" },
                { name: "极速者 (Runner)", temper: "狂暴加速", skill: "speed", color: "#aa3300" },
                { name: "轰炸机 (Bomber)", temper: "空投炸弹", skill: "bomber", color: "#ffaa00" },
                { name: "弹幕矩阵 (Matrix)", temper: "天女散花", skill: "bullethell", color: "#ff0055" }
            ];

            let traitList = this.isUltimateBoss ? ultimateTraits : normalTraits;
            let trait = traitList[Math.floor(Math.random() * traitList.length)];
            if(this.isUltimateBoss) trait = ultimateTraits[this.bossId % ultimateTraits.length];

            this.bossName = trait.name;
            this.bossTemper = trait.temper;
            this.bossSkill = trait.skill;
            this.color = trait.color;
            this.skillCooldown = 120;
            this.isDashing = false;
        }
    }
    
    update() {
        if (!this.active) return;
        
        // Boss Skills logic
        if (this.isBoss) {
            this.skillCooldown--;
            if (this.skillCooldown <= 0) {
                if (this.bossSkill === 'teleport') {
                    let alivePlayers = players.filter(p => p.hp > 0);
                    if (alivePlayers.length > 0) {
                        let target = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
                        createParticles(this.x, this.y, '#aa00ff', 30);
                        this.x = target.x + (Math.random()-0.5)*300;
                        this.y = target.y + (Math.random()-0.5)*300;
                        createParticles(this.x, this.y, '#aa00ff', 30);
                        addFloatingText(this.x, this.y - this.size - 40, "!! 空间折跃 !!", "#ff00ff");
                    }
                    this.skillCooldown = 300;
                } else if (this.bossSkill === 'invis') {
                    this.isInvisible = true;
                    addFloatingText(this.x, this.y - this.size - 40, "!! 隐身 !!", "#444444");
                    setTimeout(() => { if(this) this.isInvisible = false; }, 3500);
                    this.skillCooldown = 400;
                } else if (this.bossSkill === 'speed') {
                    this.isDashing = true;
                    this.speed *= 5;
                    addFloatingText(this.x, this.y - this.size - 40, "!! 狂暴加速 !!", "#ff0000");
                    setTimeout(() => { if(this) { this.speed /= 5; this.isDashing = false; } }, 1500);
                    this.skillCooldown = 360;
                } else if (this.bossSkill === 'bomber') {
                    for(let i=0; i<5; i++) {
                        let bx = camera.x + (Math.random()-0.5)*CANVAS_W*0.8;
                        let by = camera.y + (Math.random()-0.5)*CANVAS_H*0.8;
                        barrels.push(new Barrel(bx, by));
                        addFloatingText(bx, by, "🛬 空投炸弹!", "#ff5500");
                    }
                    this.skillCooldown = 420;
                } else if (this.bossSkill === 'bullethell') {
                    for(let i=0; i<36; i++) {
                        let angle = (i / 36) * Math.PI * 2;
                        let b = new Bullet(this.x, this.y, Math.cos(angle), Math.sin(angle), 2.5, 1, '#ff0055', false, -1, false);
                        b.size = 12;
                        bullets.push(b);
                    }
                    audio.shootLaser();
                    addFloatingText(this.x, this.y - this.size - 40, "!! 天女散花 !!", "#ff0055");
                    this.skillCooldown = 240;
                }
            }
            if (this.isDashing) {
                createParticles(this.x, this.y, this.color, 1);
            }
        }

        let target = null;
        let minDist = Infinity;
        players.forEach(p => {
            if(p.hp > 0) {
                let d = Math.hypot(p.x - this.x, p.y - this.y);
                if(d < minDist) { minDist = d; target = p; }
            }
        });
        if(target) {
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            if(minDist > 0) {
                let moveX = dx/minDist;
                let moveY = dy/minDist;

                if (this.type === 'fast') { // Wanderer (Purple)
                    this.moveTimer = (this.moveTimer || 0) - 1;
                    if (this.moveTimer <= 0) {
                        let angle = Math.random() * Math.PI * 2;
                        this.wanderDir = {x: Math.cos(angle), y: Math.sin(angle)};
                        this.moveTimer = 30 + Math.random() * 60;
                    }
                    moveX = this.wanderDir.x;
                    moveY = this.wanderDir.y;
                } else if (this.type === 'tank') { // Weaver (Green)
                    if (minDist < 300) {
                        let angle = Math.atan2(dy, dx);
                        angle += Math.sin(frameCount * 0.1 + this.x) * 1.5; 
                        moveX = Math.cos(angle);
                        moveY = Math.sin(angle);
                    }
                }

                this.facing = {x: moveX, y: moveY};
                let jitterX = (Math.random() - 0.5) * 0.2;
                let jitterY = (Math.random() - 0.5) * 0.2;
                
                this.x += (moveX + jitterX) * this.speed;
                resolveBuildingCollision(this);
                this.y += (moveY + jitterY) * this.speed;
                resolveBuildingCollision(this);
            }
            if(minDist < this.size + target.size) {
                if(target.shieldTime <= 0 && target.invincibleTime <= 0) {
                    if(target.mechHp > 0) {
                        target.mechHp -= 1;
                        target.invincibleTime = 30; // 0.5s I-frames
                        audio.playerHit();
                        if(target.mechHp <= 0) addFloatingText(target.x, target.y - 30, "🔥 防护罩过载!", "#ff0000");
                    } else if(target.vehicleHp > 0) {
                        target.vehicleHp -= 1;
                        target.invincibleTime = 30; // 0.5s I-frames
                        audio.playerHit();
                        if(target.vehicleHp <= 0) addFloatingText(target.x, target.y - 30, "🔥 加速护盾碎裂!", "#ff0000");
                    } else if(target.vehicleHp <= 0) {
                        target.hp -= this.damage;
                        scoreMultiplier = 1; // Reset multiplier on hit!
                        screenShake = 10;
                        target.invincibleTime = 30; // 0.5s I-frames
                        audio.playerHit();
                    }
                }
                if(!this.isBoss && !this.isUltimateBoss) {
                    this.active = false;
                    createParticles(this.x, this.y, '#ff0000', 10);
                } else {
                    let dx = this.x - target.x;
                    let dy = this.y - target.y;
                    let len = Math.hypot(dx, dy);
                    if(len > 0) {
                        target.x -= (dx/len) * 30;
                        target.y -= (dy/len) * 30;
                    }
                }
            }
        }
    }

    draw(ctx) {
        if(!this.active) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(Math.atan2(this.facing.y, this.facing.x));
        
        let s = this.size;

        if (this.isUltimateBoss || this.isBoss) {
            // Complex/Bizarre Boss Shapes
            let points = this.shapeSides || 12; // 12 to 19
            let outerRadius = s * (1.5 + Math.sin(frameCount * 0.1) * 0.2);
            let innerRadius = s * (0.5 + Math.cos(frameCount * 0.15) * 0.3);
            
            ctx.shadowBlur = 20;
            ctx.shadowColor = this.color;
            ctx.fillStyle = '#111';
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 4;

            // Base pulsing Star/Polygon
            ctx.beginPath();
            for (let i = 0; i < points * 2; i++) {
                let radius = i % 2 === 0 ? outerRadius : innerRadius;
                let angle = (i * Math.PI) / points + (frameCount * 0.02);
                if (i === 0) ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
                else ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            // Nested bizarre geometry
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            let innerPoints = Math.max(3, points - 8);
            for(let i=0; i<innerPoints; i++) {
                let angle = (i * Math.PI * 2) / innerPoints - (frameCount * 0.05);
                let px = Math.cos(angle) * s;
                let py = Math.sin(angle) * s;
                if(i===0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();

            // Core
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2);
            ctx.fill();

        } else {
            ctx.fillStyle = '#111';
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;

            ctx.beginPath();
            let sides = this.shapeSides || 3;
            
            if (sides >= 11) {
                // Circle (strongest normal enemy)
                ctx.arc(0, 0, s * 1.2, 0, Math.PI * 2);
            } else {
                for (let i = 0; i < sides; i++) {
                    let angle = (i * Math.PI * 2) / sides;
                    // Rotate squares to look like diamonds, keep others pointing right
                    if (sides === 4) angle += Math.PI / 4; 
                    
                    let px = Math.cos(angle) * s * 1.2;
                    let py = Math.sin(angle) * s * 1.2;
                    
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
            }
            
            // Special flashing effect for exploder
            if (this.type === 'exploder' && Math.floor(frameCount / 10) % 2 === 0) {
                ctx.fillStyle = this.color;
            }
            ctx.fill();
            ctx.stroke();
            
            // Glowing core/eye
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2);
            ctx.fill(); // Wait, the old code didn't actually fill the eye, but let's fix it so the eye shows up
            ctx.shadowBlur = 0;
        }
        ctx.restore();
        
        // Boss Beautiful UI Overlay
        if(this.isBoss) {
            let barW = this.isUltimateBoss ? 200 : 120;
            let barH = this.isUltimateBoss ? 12 : 8;
            let offsetY = -this.size - 45; 
            
            // Floating Boss Name & Temper
            ctx.fillStyle = this.color;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 5;
            ctx.font = this.isUltimateBoss ? 'bold 18px "Share Tech Mono", monospace' : 'bold 14px "Share Tech Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(this.bossName, this.x, this.y + offsetY - 18);
            
            ctx.fillStyle = '#aaaaaa';
            ctx.shadowBlur = 0;
            ctx.font = '12px "Share Tech Mono", monospace';
            ctx.fillText(this.bossTemper, this.x, this.y + offsetY - 4);
            
            // High-tech HP Bar Background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            ctx.fillRect(this.x - barW/2, this.y + offsetY + 6, barW, barH);
            ctx.strokeRect(this.x - barW/2, this.y + offsetY + 6, barW, barH);
            
            // HP Bar Fill
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x - barW/2 + 2, this.y + offsetY + 8, (barW - 4) * Math.max(0, this.hp/this.maxHp), barH - 4);
            
            // HP Text
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px Arial';
            ctx.fillText(`${Math.ceil(this.hp)} / ${this.maxHp}`, this.x, this.y + offsetY + 15);
        }
    }
}

class LootBox {
    constructor(x, y) {
        this.size = 20;
        let pos = getValidDropPosition(x, y, this.size);
        this.x = pos.x;
        this.y = pos.y;
        
        const rand = Math.random();
        if(rand < 0.10) this.type = 'nuke'; 
        else if(rand < 0.20) this.type = 'ult'; 
        else if(rand < 0.30) this.type = 'mech';
        else if(rand < 0.40) this.type = 'vehicle';
        else if(rand < 0.80) this.type = 'weapon_box'; // 40% dedicated chance to drop weapon upgrades!
        else {
            const types = ['heal', 'shield', 'buff', 'trap', 'revive'];
            this.type = types[Math.floor(Math.random() * types.length)];
        }

        this.color = '#fff';
        if(this.type === 'heal') this.color = '#00ff00';
        else if(this.type === 'shield') this.color = '#0088ff';
        else if(this.type === 'buff') this.color = '#00ffff';
        else if(this.type === 'weapon_box') this.color = '#00bfff';
        else if(this.type === 'mech') this.color = '#00ffaa';
        else if(this.type === 'vehicle') this.color = '#00ccff';
        else if(this.type === 'nuke') this.color = '#00ffff';
        else if(this.type === 'trap') this.color = '#880000';
        else if(this.type === 'revive') this.color = '#ffffff';
        else if(this.type === 'ult') this.color = '#00ffff';
        
        this.active = true;
        this.life = 600;
    }
    
    update() {
        if(!this.active) return;
        this.life--;
        if(this.life <= 0) this.active = false;

        // Push out of walls
        resolveBuildingCollision(this);

        // Magnetic siphon effect for items (except traps)
        if(this.type !== 'trap') {
            let closestDist = 150;
            let targetPlayer = null;
            players.forEach(p => {
                if(p.hp > 0) {
                    let d = Math.hypot(p.x - this.x, p.y - this.y);
                    // Must have line of sight to magnetize, otherwise it pulls against walls
                    if(d < closestDist && hasLineOfSight(this.x, this.y, p.x, p.y)) {
                        closestDist = d;
                        targetPlayer = p;
                    }
                }
            });
            if(targetPlayer) {
                let dx = targetPlayer.x - this.x;
                let dy = targetPlayer.y - this.y;
                let norm = Math.hypot(dx, dy);
                if(norm > 0) {
                    this.x += (dx/norm) * 4;
                    this.y += (dy/norm) * 4;
                }
            }
        }

        // Check if zombies step on traps
        if(this.type === 'trap') {
            zombies.forEach(z => {
                if(this.active && z.active && Math.hypot(z.x - this.x, z.y - this.y) < z.size + this.size) {
                    this.triggerTrap();
                }
            });
        }

        if(!this.active) return;

        
        players.forEach(p => {
            if(p.hp > 0 && Math.hypot(p.x - this.x, p.y - this.y) < p.size + this.size) {
                this.active = false;
                if(this.type === 'heal') {
                    p.hp = Math.min(p.maxHp, p.hp + 1);
                    addFloatingText(p.x, p.y - 30, "❤️ 护甲修复!", "#00ff00");
                    audio.levelUp();
                } else if(this.type === 'shield') {
                    p.shieldTime = 300;
                    addFloatingText(p.x, p.y - 30, "🛡️ 能量偏导盾!", "#0088ff");
                    audio.levelUp();
                } else if(this.type === 'buff') {
                    p.buffTime = 300;
                    addFloatingText(p.x, p.y - 30, "🌀 射速超频!", "#00ffff");
                    audio.levelUp();
                } else if(this.type === 'weapon_box') {
                    if(p.weaponLevel < 29) p.weaponLevel++;
                    p.weapon = p.weapons[p.weaponLevel];
                    
                    addFloatingText(p.x, p.y - 30, `🔫 火力升级! ${p.weapon.name}`, "#00bfff");
                    audio.levelUp();
                } else if(this.type === 'mech') {
                    p.mechHp = 8;
                    addFloatingText(p.x, p.y - 30, "🔴 重力护盾启动!", "#00ffaa");
                    audio.levelUp();
                } else if(this.type === 'vehicle') {
                    p.vehicleHp = 3;
                    addFloatingText(p.x, p.y - 30, "🔵 加速力场启动!", "#00ffff");
                    audio.levelUp();
                } else if(this.type === 'nuke') {
                    zombies.forEach(z => { 
                        if(z.isUltimateBoss || z.isBoss) {
                            z.hp -= 2000;
                            if(z.hp <= 0) { 
                                z.active = false; 
                                score += z.scoreVal; 
                                p.score += z.scoreVal; 
                                geoms.push(new Geom(z.x, z.y));
                            }
                        } else {
                            z.active = false; 
                            score += z.scoreVal; 
                            p.score += z.scoreVal;
                            geoms.push(new Geom(z.x, z.y));
                        }
                        createParticles(z.x, z.y, z.color, 15); 
                    });
                    screenShake = 10;
                    audio.shootShotgun();
                    addFloatingText(CANVAS_W/2, CANVAS_H/2, "☢️ 战术核打击!", "#00ffff");
                } else if(this.type === 'trap') {
                    this.triggerTrap();
                } else if(this.type === 'revive') {
                    let deadPlayer = players.find(pl => pl.hp <= 0);
                    if(deadPlayer) {
                        deadPlayer.hp = 3;
                        deadPlayer.isDowned = false;
                        deadPlayer.x = p.x; deadPlayer.y = p.y;
                        addFloatingText(p.x, p.y - 30, "👼 战地救援!", "#00ff00");
                        audio.levelUp();
                    } else {
                        p.hp = Math.min(p.maxHp, p.hp + 1);
                        addFloatingText(p.x, p.y - 30, "❤️ 护甲+1", "#00ff00");
                        audio.levelUp();
                    }
                } else if(this.type === 'ult') {
                    if (p.ultType === null) {
                        p.ultType = Math.floor(Math.random() * 10) + 1;
                        p.ultLevel = 1;
                    } else if (p.ultLevel < 5) {
                        p.ultLevel++;
                    } else {
                        p.score += 1000;
                    }
                    p.ultCooldown = 0; // Instantly refresh cooldown
                    let ultNames = ["", "霓虹新星 (Neon Nova)", "时光裂隙 (Time Flux)", "追踪光刃 (Homing Swarm)", "电磁网阵 (Laser Grid)", "轨道打击 (Orbital Strike)", "等离子雷 (Plasma Mines)", "剑气风暴 (Blade Vortex)", "治愈波纹 (Heal Burst)", "绝对领域 (God Mode)", "闪电链 (Chain Lightning)"];
                    addFloatingText(p.x, p.y - 30, `⚡ 大招: ${ultNames[p.ultType]} (Lv.${p.ultLevel})`, "#00ccff");
                    audio.levelUp();
                }
            }
        });
    }

    triggerTrap() {
        this.active = false;
        createParticles(this.x, this.y, '#ffaa00', 30);
        audio.shootShotgun();
        screenShake = 15;
        zombies.forEach(z => {
            if(z.active && Math.hypot(z.x - this.x, z.y - this.y) < 120) {
                z.hp -= 300;
                // Note: score will be handled in gameLoop if zombie dies, or we can handle it here if it's not a boss.
            }
        });
        players.forEach(p2 => {
            if(p2.hp > 0 && Math.hypot(p2.x - this.x, p2.y - this.y) < 100) {
                p2.hp -= 1;
                audio.playerHit();
            }
        });
        addFloatingText(this.x, this.y, "💥 地雷引爆!", "#ff5500");
    }
    
    draw(ctx) {
        if(!this.active) return;
        
        // Add floating and glowing effects to make items distinct
        const time = Date.now() / 200;
        const floatY = Math.sin(time) * 4;
        const glowRadius = 15 + Math.sin(time * 2) * 5;
        
        ctx.save();
        
        // Blink when about to disappear
        if (this.life < 120 && Math.floor(Date.now() / 150) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }
        
        ctx.translate(this.x, this.y + floatY);
        
        // Minimalist Neon Box
        ctx.fillStyle = '#000000';
        ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
        
        ctx.shadowBlur = glowRadius;
        ctx.shadowColor = this.color;
        
        ctx.lineWidth = 2;
        ctx.strokeStyle = this.color;
        ctx.strokeRect(-this.size/2, -this.size/2, this.size, this.size);
        
        ctx.fillStyle = this.color;
        ctx.font = 'bold 14px "Share Tech Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        let text = '?';
        let label = '未知道具';
        if(this.type === 'heal') { text = '+'; label = '修复补给'; }
        else if(this.type === 'shield') { text = 'O'; label = '无敌护盾'; }
        else if(this.type === 'buff') { text = '^'; label = '火力狂热'; }
        else if(this.type === 'weapon_box') { text = 'W'; label = '武器升级'; }
        else if(this.type === 'mech') { text = 'M'; label = '重力护盾'; }
        else if(this.type === 'vehicle') { text = 'V'; label = '加速力场'; }
        else if(this.type === 'nuke') { text = '*'; label = '清屏核弹'; }
        else if(this.type === 'trap') { text = 'X'; label = '地雷陷阱'; }
        else if(this.type === 'revive') { text = 'R'; label = '复活信标'; }
        else if(this.type === 'ult') { text = 'U'; label = '大招充能'; }
        
        ctx.fillText(text, 0, 1);
        
        // Explain the item to the player
        ctx.shadowBlur = 0;
        let fullLabel = label + ` (${text})`;
        ctx.font = 'bold 12px "Share Tech Mono", monospace'; // Increased font size
        
        let textWidth = ctx.measureText(fullLabel).width;
        let textHeight = 12;
        
        // Draw solid background box
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(-textWidth/2 - 6, -this.size - 18 - textHeight/2, textWidth + 12, textHeight + 8, 4);
        ctx.fill();
        ctx.stroke();
        
        // Draw text
        ctx.fillStyle = this.color;
        ctx.fillText(fullLabel, 0, -this.size - 16);
        
        ctx.restore();
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

class Geom {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.size = 6;
        this.life = 600; // 10 seconds at 60fps
        this.active = true;
        // Random drift
        this.dx = (Math.random() - 0.5) * 2;
        this.dy = (Math.random() - 0.5) * 2;
    }
    update() {
        this.x += this.dx;
        this.y += this.dy;
        this.dx *= 0.98;
        this.dy *= 0.98;
        this.life--;
        if (this.life <= 0) this.active = false;
        
        // Attract to players if close
        players.forEach(p => {
            if(p.hp > 0) {
                let dist = Math.hypot(p.x - this.x, p.y - this.y);
                if(dist < 100) {
                    this.x += (p.x - this.x) / dist * 5;
                    this.y += (p.y - this.y) / dist * 5;
                }
                if(dist < p.size + this.size) {
                    this.active = false;
                    scoreMultiplier = Math.min(999, scoreMultiplier + 1);
                    if (p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + 0.5); // Heal 0.5 HP per Geom!
                    audio.shootPistol(); // Use a subtle sound for pickup
                }
            }
        });
    }
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(frameCount * 0.05);
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00ff00';
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -this.size);
        ctx.lineTo(this.size, 0);
        ctx.lineTo(0, this.size);
        ctx.lineTo(-this.size, 0);
        ctx.closePath();
        
        // Blink if about to die
        if (this.life > 120 || Math.floor(frameCount / 10) % 2 === 0) {
            ctx.stroke();
        }
        ctx.restore();
    }
}

function createParticles(x, y, color, count) {
    for(let i=0; i<count; i++) particles.push(new Particle(x, y, color));
}

function addFloatingText(x, y, text, color) {
    floatingTexts.push({x, y, text, color, life: 1.0});
}

let gameDifficulty = 'normal';
let gameBossAmount = 'normal';

// --- GAME LOOP ---

function startGame() {
    let diffSelect = document.getElementById('difficulty-select');
    if (diffSelect) gameDifficulty = diffSelect.value;
    
    let bossSelect = document.getElementById('boss-select');
    if (bossSelect) gameBossAmount = bossSelect.value;

    gameState = 'PLAYING';
    score = 0;
    killCount = 0;
    survivalTime = 0;
    startTime = Date.now();
    players = [new Player(1), new Player(2)];
    players[0].x = CANVAS_W/2 - 20;
    players[1].x = CANVAS_W/2 + 20;
    players[0].y = CANVAS_H/2;
    players[1].y = CANVAS_H/2;
    zombies = [];
    
    let initialBossCount = 0;
    if (gameBossAmount === 'many') initialBossCount = 10;
    else if (gameBossAmount === 'normal') initialBossCount = 3;
    else if (gameBossAmount === 'few') initialBossCount = 1;
    else if (gameBossAmount === 'none') initialBossCount = 0;

    for(let i=0; i<initialBossCount; i++) {
        zombies.push(new Zombie(true, true, i)); // Spawn ultimate bosses!
    }
    bullets = [];
    particles = [];
    floatingTexts = [];
    lootBoxes = [];
    barrels = [];
    buildings = [];
    bloodStains = [];
    shockwaves = [];
    geoms = [];
    scoreMultiplier = 1;
    generatedChunks.clear();
    camera = {x: CANVAS_W/2, y: CANVAS_H/2};
    for(let i=0; i<5; i++) {
        let bx, by;
        do {
            bx = Math.random()*(CANVAS_W-200)+100;
            by = Math.random()*(CANVAS_H-200)+100;
        } while(Math.hypot(bx - CANVAS_W/2, by - CANVAS_H/2) < 300); // Keep away from spawn center
        barrels.push(new Barrel(bx, by));
    }
    currentWave = 1;
    startRecording();
    waveTimer = 0;
    hitStopFrames = 0;
    flashFrames = 0;
    lootTimer = 0;
    spawnRate = 100;
    frameCount = 0;

    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('pause-screen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('score').textContent = '0';
    document.getElementById('p1-weapon').textContent = players[0].weapons[0].name;
    document.getElementById('p2-weapon').textContent = players[1].weapons[0].name;
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

function updateMVPDisplay() {
    let mvpDisplay = document.getElementById('mvp-display');
    if(!mvpDisplay) return;
    let p1 = players[0];
    let p2 = players[1];
    
    if(p1.score === p2.score) {
        mvpDisplay.innerHTML = `🤝 势均力敌 (平局)<br><span style="font-size: 16px; color: #aaa">你们是并肩作战的最佳拍档！</span>`;
        return;
    }

    let winner = p1.score > p2.score ? p1 : p2;
    let loser = p1.score > p2.score ? p2 : p1;
    let winnerName = p1.score > p2.score ? "Player 1" : "Player 2";
    let loserName = p1.score > p2.score ? "Player 2" : "Player 1";
    let diff = winner.score - loser.score;
    
    let winnerTitle = "";
    let loserTitle = "";
    
    if (diff > 50000) {
        winnerTitle = "✨ 银河孤星 (降维打击) ✨";
        loserTitle = "🛡️ 最佳挂件 (负责喊666)";
    } else if (diff > 20000) {
        winnerTitle = "⚔️ 战场主宰 (疯狂收割)";
        loserTitle = "🤝 护卫僚机 (边缘OB)";
    } else if (diff > 5000) {
        winnerTitle = "🏆 核心先锋 (略胜一筹)";
        loserTitle = "🛡️ 坚韧后卫 (不可或缺)";
    } else {
        winnerTitle = "🌟 绝代双骄";
        loserTitle = "🌟 绝代双骄";
    }

    mvpDisplay.innerHTML = `
        <div style="margin-bottom: 10px;">🏆 MVP: ${winnerName} [${winnerTitle}] <br><span style="font-size: 16px; color: #00ff00;">(领先 ${diff} 分)</span></div>
        <div style="font-size: 18px; color: #aaa;">🏅 队伍中坚: ${loserName} [${loserTitle}]</div>
    `;
}

function gameWon() {
    gameState = 'GAME_WON';
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('game-over-screen').classList.remove('hidden');
    
    let title = document.querySelector('#game-over-screen h1');
    title.innerHTML = '游戏胜利<br><span style="font-size:24px;">YOU WIN!</span>';
    title.style.color = '#0f0';
    title.style.textShadow = '0 0 20px #0f0';
    
    document.getElementById('final-score').textContent = score;
    document.getElementById('survival-time').textContent = survivalTime;
    document.getElementById('kill-count').textContent = killCount;
    updateMVPDisplay();
    
    if(score > highScore) {
        highScore = score;
        localStorage.setItem('zs_highscore', highScore);
        document.getElementById('high-score').textContent = highScore;
        document.getElementById('new-high').classList.remove('hidden');
    }
}

function gameOver() {
    stopRecording();
    gameState = 'GAME_OVER';
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('game-over-screen').classList.remove('hidden');
    
    let title = document.querySelector('#game-over-screen h1');
    title.innerHTML = '游戏结束<br><span style="font-size:24px;">GAME OVER</span>';
    title.style.color = '#fff';
    title.style.textShadow = '0 0 20px #f00';
    
    document.getElementById('final-score').textContent = score;
    document.getElementById('survival-time').textContent = survivalTime;
    document.getElementById('kill-count').textContent = killCount;
    updateMVPDisplay();
    
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
    

    // Camera Update
    let cx = 0, cy = 0, count = 0;
    players.forEach(p => { if(p.hp > 0) { cx += p.x; cy += p.y; count++; }});
    if(count > 0) {
        // Use faster easing (0.8 instead of 0.1) to prevent players from moving off-screen due to camera lag
        camera.x += (cx/count - camera.x) * 0.8;
        camera.y += (cy/count - camera.y) * 0.8;
    }
    
    // World Generation
    let cX = Math.floor(camera.x / CHUNK_SIZE);
    let cY = Math.floor(camera.y / CHUNK_SIZE);
    for(let i = cX - 1; i <= cX + 1; i++) {
        for(let j = cY - 1; j <= cY + 1; j++) {
            let key = `${i},${j}`;
            if(!generatedChunks.has(key)) {
                generatedChunks.add(key);
                // Advanced Procedural Chunk Layouts for Tactical Chokepoints
                let hash1 = Math.abs(Math.sin(i * 12.9898 + j * 78.233) * 43758.5453);
                let rand1 = hash1 - Math.floor(hash1);
                let hash2 = Math.abs(Math.cos(i * 3.1415 + j * 2.7182) * 23456.789);
                let rand2 = hash2 - Math.floor(hash2);
                let hash3 = Math.abs(Math.sin(i * 45.123 + j * 12.456) * 65432.109);
                let rand3 = hash3 - Math.floor(hash3);

                let chunkType = Math.floor(rand1 * 11); // Expanded chunk types for varied density
                let cx = i * CHUNK_SIZE;
                let cy = j * CHUNK_SIZE;

                if (chunkType < 3) {
                    // 30% chance for completely open plaza (maybe 1 tiny cover)
                    if(rand3 > 0.5) {
                        buildings.push(new Building(cx + CHUNK_SIZE/2 - 50, cy + CHUNK_SIZE/2 - 50, 100, 100));
                    }
                } else if (chunkType === 3) {
                    // Open area with scattered small covers
                    let numCovers = Math.floor(rand2 * 4) + 2;
                    for(let k=0; k<numCovers; k++) {
                        let w = 60 + (Math.abs(Math.sin(hash3+k)) * 120);
                        let h = 60 + (Math.abs(Math.cos(hash3+k)) * 120);
                        let px = cx + (Math.abs(Math.sin(hash1+k)) * (CHUNK_SIZE - w));
                        let py = cy + (Math.abs(Math.cos(hash2+k)) * (CHUNK_SIZE - h));
                        buildings.push(new Building(px, py, w, h));
                    }
                } else if (chunkType === 4) {
                    // Classic Room with very wide doors
                    let doorSize = 350 + rand2 * 100;
                    let wallThick = 60;
                    let wallLen = (CHUNK_SIZE - doorSize) / 2;
                    if(wallLen > 0) {
                        buildings.push(new Building(cx, cy, wallLen, wallThick));
                        buildings.push(new Building(cx + wallLen + doorSize, cy, wallLen, wallThick));
                        buildings.push(new Building(cx, cy, wallThick, wallLen));
                        buildings.push(new Building(cx, cy + wallLen + doorSize, wallThick, wallLen));
                    }
                    if(rand3 < 0.3) buildings.push(new Building(cx + CHUNK_SIZE/2 - 100, cy + CHUNK_SIZE/2 - 100, 200, 200));
                } else if (chunkType === 5) {
                    // Dense L-Shape Blockade + Corner hideout
                    buildings.push(new Building(cx, cy, CHUNK_SIZE * 0.7, 80));
                    buildings.push(new Building(cx, cy, 80, CHUNK_SIZE * 0.7));
                    if(rand3 > 0.2) {
                        buildings.push(new Building(cx + CHUNK_SIZE - 300, cy + CHUNK_SIZE - 300, 300, 300));
                    }
                } else if (chunkType === 6) {
                    // Cross / X Blockade (creates 4 quadrants)
                    let thick = 80 + rand2 * 40;
                    buildings.push(new Building(cx + CHUNK_SIZE/2 - thick/2, cy + 150, thick, CHUNK_SIZE - 300));
                    buildings.push(new Building(cx + 150, cy + CHUNK_SIZE/2 - thick/2, CHUNK_SIZE - 300, thick));
                } else if (chunkType <= 8) {
                    // Parallel Corridors / Trenches (Dense)
                    let thick = 80;
                    let gap = 150 + rand2 * 100;
                    if(rand3 < 0.5) {
                        // Vertical trenches
                        buildings.push(new Building(cx + gap, cy, thick, CHUNK_SIZE));
                        buildings.push(new Building(cx + CHUNK_SIZE - gap - thick, cy, thick, CHUNK_SIZE));
                    } else {
                        // Horizontal trenches
                        buildings.push(new Building(cx, cy + gap, CHUNK_SIZE, thick));
                        buildings.push(new Building(cx, cy + CHUNK_SIZE - gap - thick, CHUNK_SIZE, thick));
                    }
                } else if (chunkType === 9) {
                    // Massive central monolith (Dense blocker)
                    buildings.push(new Building(cx + 150, cy + 150, CHUNK_SIZE - 300, CHUNK_SIZE - 300));
                } else {
                    // Shelter chunk (Safe zone for players, blocked for bosses)
                    buildings.push(new Building(cx + 200, cy + 200, CHUNK_SIZE - 400, CHUNK_SIZE - 400, 'shelter'));
                }
            }
        }
    }

    // Wave System
    waveTimer++;
    if(waveTimer > 3600) { // 60 seconds per wave
        currentWave++;
        waveTimer = 0;
        addFloatingText(camera.x, camera.y, `🚨 第 ${currentWave} 波 尸潮来袭! 🚨`, "#ff0000");
        
        audio.levelUp();
        // Spawn Wave Boss
        for(let i=0; i<Math.floor(currentWave/2)+1; i++) {
            let z = new Zombie(true);
            z.x = camera.x + (Math.random()-0.5)*CANVAS_W;
            z.y = camera.y + (Math.random()-0.5)*CANVAS_H;
            zombies.push(z);
        }
        for(let i=0; i<3; i++) barrels.push(new Barrel(camera.x + (Math.random()-0.5)*CANVAS_W, camera.y + (Math.random()-0.5)*CANVAS_H));
    }

    
    // Update blood stains
    bloodStains.forEach(b => b.life -= 0.005);
    bloodStains = bloodStains.filter(b => b.life > 0);

    // Random Events every 40 seconds
    if(frameCount > 0 && frameCount % 2400 === 0) {
        const events = ['swarm', 'bloodmoon', 'orbital'];
        activeEvent = events[Math.floor(Math.random() * events.length)];
        eventTimer = 600; // 10 seconds duration
        
        if(activeEvent === 'swarm') {
            addFloatingText(camera.x, camera.y, "⚠️ 警告：侦测到大规模感染者群！ ⚠️", "#ff0000");
            audio.levelUp();
            screenShake = 10;
            for(let i=0; i<30; i++) {
                let z = new Zombie();
                z.x = camera.x + (Math.random()-0.5)*CANVAS_W*1.5;
                z.y = camera.y + (Math.random()-0.5)*CANVAS_H*1.5;
                zombies.push(z);
            }
        } else if(activeEvent === 'bloodmoon') {
            addFloatingText(camera.x, camera.y, "🌙 战地预警：目标进入狂暴状态！ 🌙", "#ff0000");
            audio.levelUp();
            
        } else if(activeEvent === 'orbital') {
            addFloatingText(camera.x, camera.y, "🚀 轨道打击火力覆盖中！ 🚀", "#ff4400");
            audio.levelUp();
            
        }
    }
    
    // Process active event
    if(eventTimer > 0) {
        eventTimer--;
        if(activeEvent === 'orbital' && eventTimer % 10 === 0) {
            // Drop bombs randomly
            let bx = camera.x + (Math.random()-0.5)*CANVAS_W*1.5;
            let by = camera.y + (Math.random()-0.5)*CANVAS_H*1.5;
            createParticles(bx, by, '#ffaa00', 30);
            screenShake = 2;
            audio.shootShotgun();
            zombies.forEach(z => {
                if(Math.hypot(z.x - bx, z.y - by) < 150) {
                    z.hp -= 200;
                    if(z.hp <= 0 && z.active) {
                        z.active = false;
                        score += z.scoreVal;
                        createParticles(z.x, z.y, z.color, 15);
                    if(z.type === 'exploder') {
                        createParticles(z.x, z.y, '#ffaa00', 30);
                        audio.shootShotgun();
                        screenShake = Math.max(screenShake, 10);
                        addFloatingText(z.x, z.y, "💥 异种自爆!", "#ff5500");
                        players.forEach(p => {
                            if(p.hp > 0 && Math.hypot(p.x - z.x, p.y - z.y) < 80) {
                                p.hp -= 2;
                                audio.playerHit();
                            }
                        });
                        zombies.forEach(oz => {
                            if(oz.active && oz !== z && Math.hypot(oz.x - z.x, oz.y - z.y) < 80) {
                                oz.hp -= 50;
                            }
                        });
                    }
                    }
                }
            });
        }
        if(eventTimer <= 0) {
            activeEvent = null;
        }
    }

    if(screenShake > 0) screenShake--;
    if(comboTimer > 0) {
        comboTimer--;
        if(comboTimer <= 0) {
            if(comboCount >= 10) addFloatingText(CANVAS_W/2, 150, `🔥 ${comboCount} 连杀终结!`, '#00ccff');
            comboCount = 0;
        }
    }

    // Check for ultimate win condition
    if (gameBossAmount !== 'none') {
        // Must kill all Ultimate Bosses AND all regular Bosses to win
        let ultimateBossesAlive = zombies.some(z => z.isUltimateBoss && z.active);
        let regularBossesAlive = zombies.some(z => z.isBoss && z.active);
        
        // We only trigger win if Ultimate Bosses were spawned and are now dead, 
        // AND no regular bosses are currently alive.
        // Wait, we also need to make sure the game doesn't instantly win on frame 1 before they spawn.
        // initialBossCount tells us if they were spawned.
        if (frameCount > 10 && !ultimateBossesAlive && !regularBossesAlive) {
            if(gameState === 'PLAYING') {
                score += 50000;
                gameWon();
                return;
            }
        }
    }

    // Garbage collection
    bullets = bullets.filter(b => b.active && Math.hypot(b.x - camera.x, b.y - camera.y) < (canvas.width || window.innerWidth));
    zombies = zombies.filter(z => z.active && (z.isUltimateBoss || Math.hypot(z.x - camera.x, z.y - camera.y) < (canvas.width || window.innerWidth) * 2));
    particles = particles.filter(p => p.life > 0);
    floatingTexts = floatingTexts.filter(ft => ft.life > 0);
    lootBoxes = lootBoxes.filter(lb => lb.active && Math.hypot(lb.x - camera.x, lb.y - camera.y) < CANVAS_W * 3);
    barrels = barrels.filter(b => b.active && Math.hypot(b.x - camera.x, b.y - camera.y) < CANVAS_W * 3);
    shockwaves = shockwaves.filter(s => s.active);

    // Check Game Over condition safely
    if(players.every(p => (p.hp <= 0))) {
        gameOver();
    }

    // Time
    survivalTime = Math.floor((Date.now() - startTime) / 1000);

    players.forEach(p => p.update());

    // Resolve Player-Player collision
    if(players.length === 2 && players[0].hp > 0 && players[1].hp > 0) {
        let p1 = players[0];
        let p2 = players[1];
        let dx = p2.x - p1.x;
        let dy = p2.y - p1.y;
        let dist = Math.hypot(dx, dy);
        let minDist = p1.size + p2.size;
        
        if(dist < minDist && dist > 0) {
            let overlap = minDist - dist;
            let nx = dx / dist;
            let ny = dy / dist;
            
            p1.x -= nx * (overlap / 2);
            p1.y -= ny * (overlap / 2);
            p2.x += nx * (overlap / 2);
            p2.y += ny * (overlap / 2);
            

        }
    }

    // Spawning

    // Periodic Barrel Drops removed (now a boss-exclusive skill)

    if(frameCount % Math.max(5, spawnRate) === 0 && zombies.length < 200) {
        let count = Math.min(5, Math.floor(survivalTime / 30) + 1); // Cap spawn count to reduce lag
        if (gameDifficulty === 'easy') count = Math.max(1, Math.floor(count * 0.5));
        if (gameDifficulty === 'hard') count += 2;
        
        let baseTier = Math.floor(survivalTime / 60); // Increase base tier every 60 seconds
        
        for(let i=0; i<count; i++) {
            let z = new Zombie();
            if (gameDifficulty === 'easy') z.hp *= 0.5;
            if (gameDifficulty === 'hard') z.hp *= 1.5;
            
            // Instantly level up zombie based on survival time to create large enemies late game
            if (baseTier > 0) {
                let tierBoost = Math.floor(Math.random() * (baseTier + 1)); 
                for(let t=0; t<tierBoost; t++) {
                    z.tier++;
                    z.maxHp *= 3;
                    z.hp = z.maxHp;
                    z.damage *= 2; 
                    z.size = Math.min(z.size * 1.5, 120);
                    z._baseScore *= 3;
                    z.speed *= 0.98; // slightly slower
                }
            }
            zombies.push(z);
        }
    }
    
    // Boss spawn based on settings
    let bossInterval = 1800; // Normal: 30s
    if (gameBossAmount === 'few') bossInterval = 3600; // 60s
    if (gameBossAmount === 'many') bossInterval = 900; // 15s
    
    if (gameBossAmount !== 'none' && frameCount > 0 && frameCount % bossInterval === 0) {
        let b = new Zombie(true);
        if (gameDifficulty === 'easy') b.hp *= 0.5;
        if (gameDifficulty === 'hard') b.hp *= 1.5;
        zombies.push(b);
        addFloatingText(CANVAS_W/2, CANVAS_H/2, "⚠️ 极度危险：首领级变异体出现！ ⚠️", "#ff0000");
        
    }

    // Difficulty increase
    let diffIncreaseInterval = 300;
    if (gameDifficulty === 'easy') diffIncreaseInterval = 600;
    if (gameDifficulty === 'hard') diffIncreaseInterval = 200;
    
    if(frameCount > 0 && frameCount % diffIncreaseInterval === 0) {
        spawnRate = Math.max(5, spawnRate - 5);
    }

    bullets.forEach(b => b.update());
    shockwaves.forEach(s => s.update());
    zombies.forEach(z => z.update());
    
    // Zombie Merging Mechanic (Every 1 second)
    if(frameCount % 60 === 0) {
        let maxMergeDistSq = 60 * 60;
        zombies.forEach(z => { if(z.mergeTimer > 0) z.mergeTimer -= 0.5; });
        
        for(let i=0; i<zombies.length; i++) {
            let z1 = zombies[i];
            if(!z1.active || z1.isBoss || z1.isUltimateBoss) continue;
            
            for(let j=i+1; j<zombies.length; j++) {
                let z2 = zombies[j];
                if(!z2.active || z1.shapeSides !== z2.shapeSides) continue;
                
                let dx = z1.x - z2.x;
                let dy = z1.y - z2.y;
                let mergeDistSq = (z1.size + z2.size) * (z1.size + z2.size) * 1.5;
                if(dx*dx + dy*dy < mergeDistSq) {
                    let survivor, consumed;
                    if(z1.tier > z2.tier || (z1.tier === z2.tier && z1.size >= z2.size)) {
                        survivor = z1; consumed = z2;
                    } else {
                        survivor = z2; consumed = z1;
                    }
                    
                    consumed.active = false;
                    survivor.tier++;
                    survivor.maxHp += consumed.hp;
                    survivor.hp += consumed.hp;
                    survivor.damage += consumed.damage * 0.5;
                    survivor.size = Math.min(survivor.size + consumed.size * 0.25, 120);
                    survivor._baseScore += consumed._baseScore;
                    
                    createParticles(survivor.x, survivor.y, survivor.color, 15);
                    if(survivor.tier % 3 === 0) {
                        addFloatingText(survivor.x, survivor.y - survivor.size - 10, `LV${survivor.tier} 巨型体!`, "#ff3300");
                    }
                    if (z1 === consumed) break;
                }
            }
        }
    }
    particles.forEach(p => p.update());
    geoms.forEach(g => g.update());
    barrels.forEach(b => b.update());
    lootBoxes.forEach(lb => lb.update());
    lootTimer++;
    if(lootTimer > 1200) {
        lootTimer = 0;
        if(Math.random() < 0.4) lootBoxes.push(new LootBox());
    }
    floatingTexts.forEach(ft => { ft.y -= 1; ft.life -= 0.02; });
    if(typeof boars !== 'undefined') boars.forEach(b => b.update());

    // Collisions
    for(let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        if(!b.active) continue;
        
        // Enemy Bullet hitting players
        if(b.ownerId === -1) {
            players.forEach(p => {
                if(p.hp > 0 && Math.hypot(b.x - p.x, b.y - p.y) < p.size + b.size) {
                    if(p.shieldTime <= 0 && p.invincibleTime <= 0) {
                        if(p.mechHp > 0) {
                            p.mechHp -= 1;
                            p.invincibleTime = 30;
                            audio.playerHit();
                        } else if(p.vehicleHp > 0) {
                            p.vehicleHp -= 1;
                            p.invincibleTime = 30;
                            audio.playerHit();
                        } else {
                            p.hp -= b.damage;
                            scoreMultiplier = 1;
                            screenShake = 10;
                            p.invincibleTime = 30;
                            audio.playerHit();
                        }
                    }
                    b.active = false;
                    createParticles(b.x, b.y, '#ff0000', 10);
                }
            });
            if(!b.active) continue;
        }
        
        // Check Barrels
        barrels.forEach(barrel => {
            if(barrel.active && Math.hypot(b.x - barrel.x, b.y - barrel.y) < barrel.size + b.size) {
                barrel.hp -= b.damage;
                barrel.lastHitBy = b.ownerId;
                if(!b.pierce) b.active = false;
                if(barrel.hp <= 0) barrel.explode();
            }
        });

        for(let j = zombies.length - 1; j >= 0; j--) {
            const z = zombies[j];
            if(!z.active) continue;
            
            let dx = b.x - z.x;
            let dy = b.y - z.y;
            let totalSize = z.size + b.size;
            
            // Fast AABB check before squared distance check
            if(!b.hitZombies.has(z) && Math.abs(dx) < totalSize && Math.abs(dy) < totalSize && (dx*dx + dy*dy < totalSize*totalSize)) {
                b.hitZombies.add(z);
                z.hp -= b.damage;
                if(b.isHoming) {
                    createParticles(b.x, b.y, '#ff5500', 10);
                    audio.shootShotgun();
                    // Removed splash damage O(N) loop here to fix late-game lag!
                    // Homing missiles are already strong enough.
                }
                if(!b.pierce) b.active = false;
                createParticles(b.x, b.y, '#fff', 3);
                
                if(z.hp <= 0) {
                    z.active = false;
                    score += z.scoreVal;
                    let owner = players.find(pl => pl.id === b.ownerId);
                    if(owner) owner.score += z.scoreVal;
                    killCount++;
                    geoms.push(new Geom(z.x, z.y));
                    
                    // 怪物死亡掉落道具
                    if(z.isBoss) {
                        lootBoxes.push(new LootBox(z.x, z.y));
                        lootBoxes.push(new LootBox(z.x+30, z.y+30));
                        lootBoxes.push(new LootBox(z.x-30, z.y-30));
                        hitStopFrames = 12; // 0.2s freeze
                        flashFrames = 15;
                        screenShake = 10;
                        addFloatingText(camera.x, camera.y, "🌟 斩杀目标! 🌟", "#00ff00");
                    } else if(Math.random() < 0.15) {
                        lootBoxes.push(new LootBox(z.x, z.y));
                    }
                    
                    document.getElementById('score').textContent = score;
                    let multiplierEl = document.getElementById('multiplier');
                    if(multiplierEl) multiplierEl.textContent = scoreMultiplier;
                    
                    // Check level up based on killCount
                    createParticles(z.x, z.y, z.color, 15);
                    if(z.type === 'exploder') {
                        createParticles(z.x, z.y, '#ffaa00', 30);
                        audio.shootShotgun();
                        screenShake = Math.max(screenShake, 10);
                        addFloatingText(z.x, z.y, "💥 异种自爆!", "#ff5500");
                        players.forEach(p => {
                            if(p.hp > 0 && Math.hypot(p.x - z.x, p.y - z.y) < 80) {
                                p.hp -= 2;
                                audio.playerHit();
                            }
                        });
                        zombies.forEach(oz => {
                            if(oz.active && oz !== z && Math.hypot(oz.x - z.x, oz.y - z.y) < 80) {
                                oz.hp -= 50;
                            }
                        });
                    }
                    for(let b=0; b<5; b++) bloodStains.push(new Blood(z.x + (Math.random()-0.5)*40, z.y + (Math.random()-0.5)*40, Math.random()*8+4, Math.random()*8+4, '#800000'));
                    comboCount++; comboTimer = 180;
                    if(comboCount % 10 === 0) { addFloatingText(CANVAS_W/2, 100, `🔥 ${comboCount} 连杀 (COMBO)!`, '#00ccff'); audio.levelUp(); }
                    audio.zombieDie();
                    if(z.isBoss) {
                        addFloatingText(z.x, z.y, `+${z.scoreVal} BOSS击杀!`, '#00bfff');
                    } else if(Math.random() < 0.1) {
                        addFloatingText(z.x, z.y, `+${z.scoreVal}`, '#00ff00');
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
    geoms = geoms.filter(g => g.active);
    floatingTexts = floatingTexts.filter(ft => ft.life > 0);
    lootBoxes = lootBoxes.filter(lb => lb.active);
    if(typeof boars !== 'undefined') boars = boars.filter(b => b.active);

    // Update Player HUD
    if(players.length >= 2) {
        let p1 = players[0];
        let p1hpElem = document.getElementById('p1-hp-bar');
        let p1hpText = document.getElementById('p1-hp-text');
        if(p1hpElem) p1hpElem.style.width = Math.max(0, (p1.hp / p1.maxHp) * 100) + '%';
        if(p1hpText) p1hpText.textContent = `${Math.ceil(p1.hp)}/${p1.maxHp}`;
        document.getElementById('p1-score').textContent = p1.score;
        document.getElementById('p1-weapon').textContent = p1.weapon.name;
        
        let ultNames = ["无大招", "霓虹新星(Nova)", "时光裂隙(Time)", "追踪光刃(Swarm)", "电磁网阵(Laser)", "轨道打击(Strike)", "等离子雷(Mines)", "剑气风暴(Blades)", "治愈波纹(Heal)", "绝对领域(God)", "闪电链(Chain)"];
        
        let p1b = [];
        if(p1.shieldTime > 0) p1b.push('🛡️');
        if(p1.buffTime > 0) p1b.push('🌀');
        if(p1.mechHp > 0) p1b.push('🔴超载护盾');
        if(p1.vehicleHp > 0) p1b.push('🔵疾步光环');
        document.getElementById('p1-buffs').textContent = p1b.length > 0 ? p1b.join(' ') : '常规';

        let p1ultElem = document.getElementById('p1-ult');
        if(p1ultElem) {
            if(p1.ultLevel === 0) {
                p1ultElem.textContent = '无大招';
                p1ultElem.style.color = '#555'; p1ultElem.style.borderColor = '#555';
            } else {
                let readyText = p1.ultCooldown > 0 ? `CD:${Math.ceil(p1.ultCooldown/60)}s` : 'READY';
                p1ultElem.textContent = `${ultNames[p1.ultType]} Lv.${p1.ultLevel} [${readyText}]`;
                p1ultElem.style.color = p1.ultCooldown > 0 ? '#ff0000' : '#00ccff';
                p1ultElem.style.borderColor = p1ultElem.style.color;
            }
        }

        let p2 = players[1];
        let p2hpElem = document.getElementById('p2-hp-bar');
        let p2hpText = document.getElementById('p2-hp-text');
        if(p2hpElem) p2hpElem.style.width = Math.max(0, (p2.hp / p2.maxHp) * 100) + '%';
        if(p2hpText) p2hpText.textContent = `${Math.ceil(p2.hp)}/${p2.maxHp}`;
        document.getElementById('p2-score').textContent = p2.score;
        document.getElementById('p2-weapon').textContent = p2.weapon.name;
        
        let p2b = [];
        if(p2.shieldTime > 0) p2b.push('🛡️');
        if(p2.buffTime > 0) p2b.push('🌀');
        if(p2.mechHp > 0) p2b.push('🔴超载护盾');
        if(p2.vehicleHp > 0) p2b.push('🔵疾步光环');
        document.getElementById('p2-buffs').textContent = p2b.length > 0 ? p2b.join(' ') : '常规';

        let p2ultElem = document.getElementById('p2-ult');
        if(p2ultElem) {
            if(p2.ultLevel === 0) {
                p2ultElem.textContent = '无大招';
                p2ultElem.style.color = '#555'; p2ultElem.style.borderColor = '#555';
            } else {
                let readyText = p2.ultCooldown > 0 ? `CD:${Math.ceil(p2.ultCooldown/60)}s` : 'READY';
                p2ultElem.textContent = `${ultNames[p2.ultType]} Lv.${p2.ultLevel} [${readyText}]`;
                p2ultElem.style.color = p2.ultCooldown > 0 ? '#ff0000' : '#00ffff';
                p2ultElem.style.borderColor = p2ultElem.style.color;
            }
        }
    }
    
    // Update Central HUD
    let tMins = Math.floor(survivalTime / 60).toString().padStart(2, '0');
    let tSecs = (survivalTime % 60).toString().padStart(2, '0');
    let timeElem = document.getElementById('time-display');
    if (timeElem) timeElem.textContent = `${tMins}:${tSecs}`;
    
    let scoreElem = document.getElementById('score');
    if (scoreElem) scoreElem.textContent = score;
    let multElem = document.getElementById('multiplier');
    if (multElem) multElem.textContent = scoreMultiplier;
}

function draw() {
    // Solid Black Background for pure neon contrast
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    if(screenShake > 0) {
        ctx.translate((Math.random()-0.5)*screenShake, (Math.random()-0.5)*screenShake);
    }

    // Apply Camera Translation (rounded to prevent subpixel drifting of walls)
    ctx.translate(Math.round(canvas.width/2 - camera.x), Math.round(canvas.height/2 - camera.y));

    // Draw Geometric Grid (Geometry Wars style)
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.15)'; // Faint glowing cyan grid
    ctx.lineWidth = 1;
    let startX = camera.x - canvas.width/2;
    let startY = camera.y - canvas.height/2;
    let offsetX = startX % 60; // Larger grid squares
    let offsetY = startY % 60;
    
    ctx.beginPath();
    for(let i = -offsetX; i < canvas.width + 60; i+=60) { 
        ctx.moveTo(startX + i, startY); ctx.lineTo(startX + i, startY + canvas.height); 
    }
    for(let i = -offsetY; i < canvas.height + 60; i+=60) { 
        ctx.moveTo(startX, startY + i); ctx.lineTo(startX + canvas.width, startY + i); 
    }
    ctx.stroke();
    
    // Draw Buildings
    buildings.forEach(b => b.draw(ctx));

    ctx.globalCompositeOperation = 'lighter';
    particles.forEach(p => p.draw(ctx));
    buildings.forEach(b => b.draw(ctx));
    bloodStains.forEach(b => b.draw(ctx));
    lootBoxes.forEach(lb => lb.draw(ctx));
    barrels.forEach(b => b.draw(ctx));
    shockwaves.forEach(s => s.draw(ctx));
    geoms.forEach(g => g.draw(ctx));
    zombies.forEach(z => z.draw(ctx));
    if(typeof boars !== 'undefined') boars.forEach(b => b.draw(ctx));
    bullets.forEach(b => b.draw(ctx));
    if(players) players.forEach(p => p.draw(ctx));

    ctx.globalCompositeOperation = 'source-over';
    floatingTexts.forEach(ft => {
        ctx.globalAlpha = Math.max(0, ft.life);
        ctx.fillStyle = ft.color;
        ctx.font = 'bold 20px "ZCOOL KuaiLe"';
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.globalAlpha = 1.0;
    });
    
    // Draw Combo HUD
    if(comboCount > 1) {
        ctx.fillStyle = `rgba(255, 170, 0, ${comboTimer/180})`;
        ctx.font = 'bold 30px "ZCOOL KuaiLe"';
        ctx.textAlign = 'right';
        ctx.fillText(`${comboCount} 连杀!`, CANVAS_W - 20, 40);
        ctx.fillStyle = '#555';
        ctx.fillRect(CANVAS_W - 120, 50, 100, 5);
        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(CANVAS_W - 120, 50, 100 * (comboTimer/180), 5);
    }
    
    // Draw Ultimate Boss Arrow Pointers
    let ultBosses = zombies.filter(z => z.isUltimateBoss && z.active);
    ultBosses.forEach(ultBoss => {
        let dx = ultBoss.x - camera.x;
        let dy = ultBoss.y - camera.y;
        let dist = Math.hypot(dx, dy);
        
        ctx.save();
        ctx.translate(canvas.width/2, canvas.height/2);
        let angle = Math.atan2(dy, dx);
        let arrowDist = Math.min(dist, Math.min(canvas.width, canvas.height)/2 - 60);
        ctx.translate(Math.cos(angle) * arrowDist, Math.sin(angle) * arrowDist);
        ctx.rotate(angle);
        
        ctx.fillStyle = ultBoss.color || '#ff00ff';
        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.lineTo(-10, 10);
        ctx.lineTo(-10, -10);
        ctx.fill();
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        // Rotate text to stay upright
        ctx.rotate(-angle);
        ctx.fillText(`BOSS ${ultBoss.bossId + 1}`, 0, -20);
        ctx.fillText(Math.floor(dist/10) + "m", 0, 20);
        ctx.restore();
    });
    
    ctx.restore();
}

let lastTimestamp = 0;
let timeAccumulator = 0;
const TICK_RATE = 1000 / 60; // 60 FPS Fixed Time Step

function gameLoop(timestamp) {
    if(gameState !== 'PLAYING') {
        lastTimestamp = timestamp;
        requestAnimationFrame(gameLoop);
        return;
    }
    
    let dt = timestamp - lastTimestamp;
    if(dt > 100) dt = 100; // Cap dt to prevent spiral of death
    lastTimestamp = timestamp;
    timeAccumulator += dt;
    
    try {
        while(timeAccumulator >= TICK_RATE) {
            if(hitStopFrames > 0) {
                hitStopFrames--;
            } else {
                update();
            }
            timeAccumulator -= TICK_RATE;
        }
        draw();
        
        if(flashFrames > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${flashFrames / 15})`;
            ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
            flashFrames--;
        }
    } catch(e) {
        console.error("Game Loop Error:", e);
        if(frameCount % 60 === 0) {
             addFloatingText(camera.x, camera.y - CANVAS_H/2 + 50, "⚠️ 战术头盔系统已自动重启", "#ff0000");
        }
    }
    
    requestAnimationFrame(gameLoop);
}

// Initial draw
if(activeEvent === 'bloodmoon') {
        ctx.fillStyle = '#300';
    } else {
        ctx.fillStyle = '#111';
    }
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

startGame();
for(let i=0;i<100;i++){update();draw();}
console.log('Runtime is OK.');