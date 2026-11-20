const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

// 1. Boss Traits
let oldTraits = `            const ultimateTraits = [
                { name: "天启·奥米茄 (Omega)", temper: "毁灭倾向 - 极具攻击性，移速快", skill: "dash", color: "#ff0000" },
                { name: "终焉·尤弥尔 (Ymir)", temper: "坚韧壁垒 - 体型巨大且不断恢复", skill: "heal", color: "#cc0000" },
                { name: "暴戾·阿瑞斯 (Ares)", temper: "狂暴突进 - 致命的突进连击", skill: "dash", color: "#ffaa00" },
                { name: "深渊·利维坦 (Leviathan)", temper: "巢穴之主 - 不断召唤机械虫群", skill: "summon", color: "#aa00ff" },
                { name: "湮灭·赛博 (Cyber)", temper: "弹幕核心 - 发射密集的死亡弹幕", skill: "shoot", color: "#ff0055" }
            ];
            const normalTraits = [
                { name: "机械屠夫 (Butcher)", temper: "横冲直撞", skill: "dash", color: "#ff5500" },
                { name: "主脑 (Mastermind)", temper: "召唤机械群", skill: "summon", color: "#aa00ff" },
                { name: "重装堡垒 (Fortress)", temper: "护甲恢复", skill: "heal", color: "#aa3300" },
                { name: "雷霆几何 (Thunder)", temper: "狂暴加速", skill: "dash", color: "#ffaa00" },
                { name: "弹幕矩阵 (Matrix)", temper: "发射弹幕", skill: "shoot", color: "#ff0055" }
            ];`;

let newTraits = `            const ultimateTraits = [
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
            ];`;

code = code.replace(oldTraits, newTraits);

// 2. Boss Skills Logic
let oldSkills = `                if (this.bossSkill === 'dash') {
                    this.isDashing = true;
                    this.speed *= 4;
                    addFloatingText(this.x, this.y - this.size - 40, "!! 突进 !!", "#ff0000");
                    setTimeout(() => { if(this) { this.speed /= 4; this.isDashing = false; } }, 800);
                    this.skillCooldown = 240;
                } else if (this.bossSkill === 'summon') {
                    for(let i=0; i<4; i++) {
                        let z = new Zombie();
                        z.type = 'fast'; z.x = this.x + (Math.random()-0.5)*100; z.y = this.y + (Math.random()-0.5)*100;
                        zombies.push(z);
                    }
                    addFloatingText(this.x, this.y - this.size - 40, "!! 召唤子体 !!", "#ff3300");
                    this.skillCooldown = 300;
                } else if (this.bossSkill === 'heal') {
                    let healAmt = this.maxHp * 0.1;
                    this.hp = Math.min(this.maxHp, this.hp + healAmt);
                    createParticles(this.x, this.y, '#00ff00', 10);
                    addFloatingText(this.x, this.y - this.size - 40, "+ 护甲修复", "#ff0000");
                    this.skillCooldown = 360;
                } else if (this.bossSkill === 'shoot') {
                    for(let i=0; i<12; i++) {
                        let angle = (i / 12) * Math.PI * 2;
                        let b = new Bullet(this.x, this.y, Math.cos(angle), Math.sin(angle), 2.5, 1, '#ff0000', true, -1, false);
                        b.size = 8;
                        bullets.push(b);
                    }
                    audio.shootLaser();
                    addFloatingText(this.x, this.y - this.size - 40, "!! 能量弹幕 !!", "#ff0044");
                    this.skillCooldown = 180;
                }`;

let newSkills = `                if (this.bossSkill === 'teleport') {
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
                }`;

code = code.replace(oldSkills, newSkills);

// 3. Invis Drawing logic
code = code.replace(`    draw(ctx) {
        if (!this.active) return;
        ctx.save();`, `    draw(ctx) {
        if (!this.active) return;
        ctx.save();
        if (this.isInvisible) ctx.globalAlpha = 0.15;`);

// 4. Remove Random Barrels
let oldBarrels = `    // Periodic Barrel Drops from sky
    if(frameCount % 400 === 0) {
        let bx = camera.x + (Math.random()-0.5)*CANVAS_W*0.8;
        let by = camera.y + (Math.random()-0.5)*CANVAS_H*0.8;
        barrels.push(new Barrel(bx, by));
        addFloatingText(bx, by, "🛬 空投炸弹!", "#ff5500");
    }`;
let newBarrels = `    // Periodic Barrel Drops removed (now a boss-exclusive skill)`;
code = code.replace(oldBarrels, newBarrels);

// 5. Replay logic
let replayHelpers = `
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
                videoContainer.innerHTML = \`
                    <h3 style="color:#ff5555; text-shadow: 0 0 5px red;">💀 死亡回放 (Death Replay - Last 5s)</h3>
                    <video id="replay-video" width="600" controls autoplay loop style="border: 2px solid red; border-radius: 10px;"></video>
                \`;
                let goScreen = document.getElementById('game-over');
                goScreen.insertBefore(videoContainer, goScreen.firstChild);
            }
            if (replayVideoUrl) {
                document.getElementById('replay-video').src = replayVideoUrl;
            }
        }, 200);
    }
}
`;

code = code.replace('let isPaused = false;', 'let isPaused = false;' + replayHelpers);
code = code.replace('    currentWave = 1;', '    currentWave = 1;\n    startRecording();');
code = code.replace('function gameOver() {', 'function gameOver() {\n    stopRecording();');

fs.writeFileSync('game.js', code);
console.log('Successfully patched boss skills and replay');
