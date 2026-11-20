const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

// 1. Add replay variables to constructor
let constrRegex = /this\.lives = 3;\n\s*this\.hitStopTimer = 0;/;
let newConstr = `this.lives = 3;
        this.hitStopTimer = 0;
        this.replayHistory = [];
        this.replayIndex = 0;`;
code = code.replace(constrRegex, newConstr);

// 2. Add history saving at the end of Game.update()
let updateEndRegex = /if \(this\.enemies\.length !== this\.lastEnemyCount\) \{ this\.updateHUD\(\); this\.lastEnemyCount = this\.enemies\.length; \}\n\s*if \(this\.players\.every\(p => !p\.alive\) && this\.lives === 0\) this\.gameOver\(\);\n\s*\}/;
let newUpdateEnd = `if (this.enemies.length !== this.lastEnemyCount) { this.updateHUD(); this.lastEnemyCount = this.enemies.length; }
        
        // Record state for Death Replay
        if (this.gameState === 'PLAYING') {
            const snapshot = {
                tanks: [...this.players, ...this.enemies].filter(t => t.alive).map(t => ({ x: t.x, y: t.y, w: t.width, h: t.height, dir: t.direction, color: t.color, isBoss: t.isBoss, level: t.level })),
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
        
        if (this.players.every(p => !p.alive) && this.lives === 0) this.gameOver();
    }`;
code = code.replace(updateEndRegex, newUpdateEnd);

// 3. Update gameOver to trigger replay
let gameOverRegex = /gameOver\(\) \{\n\s*this\.gameState = 'GAME_OVER';\n\s*const totalScore = this\.players\.reduce\(\(sum, p\) => sum \+ p\.score, 0\);\n\s*if \(totalScore > this\.highScore\) \{\n\s*this\.highScore = totalScore;\n\s*localStorage\.setItem\('tankBattleHighScore', String\(totalScore\)\);\n\s*\}\n\s*document\.getElementById\('game-over-screen'\)\.classList\.remove\('hidden'\);\n\s*\}/;
let newGameOver = `gameOver() {
        if (this.replayHistory.length > 0) {
            this.gameState = 'REPLAY';
            this.replayIndex = 0;
            this.showAnnouncement('💀 DEATH REPLAY 💀', '#f00');
            audio.play('explosion');
        } else {
            this.showGameOverScreen();
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
    }`;
code = code.replace(gameOverRegex, newGameOver);

// 4. Draw Replay Frame
let drawReplayFunc = `
    drawReplay() {
        if (this.replayIndex >= this.replayHistory.length) {
            this.showGameOverScreen();
            return;
        }
        const frame = this.replayHistory[this.replayIndex];
        this.ctx.fillStyle = '#000'; this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.save();
        this.ctx.translate(frame.shakeX, frame.shakeY);
        
        // Map
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                const tile = frame.mapGrid[y][x]; if (tile === TILE_TYPES.EMPTY || tile === TILE_TYPES.FOREST) continue;
                const px = x * TILE_SIZE; const py = y * TILE_SIZE;
                if (tile === TILE_TYPES.BRICK) {
                    this.ctx.fillStyle = COLORS.BRICK; this.ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                    this.ctx.fillStyle = COLORS.BRICK_LIGHT; this.ctx.fillRect(px, py, TILE_SIZE, 4); this.ctx.fillRect(px, py, 4, TILE_SIZE);
                    this.ctx.fillStyle = '#000'; this.ctx.fillRect(px + TILE_SIZE/2, py, 2, TILE_SIZE); this.ctx.fillRect(px, py + TILE_SIZE/2, TILE_SIZE, 2);
                } else if (tile === TILE_TYPES.BARREL) {
                    this.ctx.fillStyle = COLORS.BARREL; this.ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
                    this.ctx.fillStyle = '#000'; this.ctx.fillRect(px + TILE_SIZE/2 - 2, py + 4, 4, TILE_SIZE - 8);
                    this.ctx.fillStyle = '#FFF'; this.ctx.font = '16px Arial'; this.ctx.textAlign='center'; this.ctx.fillText('☠️', px+TILE_SIZE/2, py+TILE_SIZE/2+6);
                } else if (tile === TILE_TYPES.HARD_BRICK) {
                    this.ctx.fillStyle = '#8B4513'; this.ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                } else if (tile === TILE_TYPES.STEEL) {
                    this.ctx.fillStyle = COLORS.STEEL; this.ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                    this.ctx.fillStyle = COLORS.STEEL_LIGHT; this.ctx.beginPath(); this.ctx.moveTo(px, py + TILE_SIZE); this.ctx.lineTo(px, py); this.ctx.lineTo(px + TILE_SIZE, py); this.ctx.fill();
                    this.ctx.fillStyle = '#fff'; this.ctx.fillRect(px + 4, py + 4, 4, 4);
                } else if (tile === TILE_TYPES.UNBREAKABLE) {
                    this.ctx.fillStyle = '#333'; this.ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                    this.ctx.strokeStyle = '#666'; this.ctx.lineWidth = 2; this.ctx.strokeRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
                    this.ctx.beginPath(); this.ctx.moveTo(px + 4, py + 4); this.ctx.lineTo(px + TILE_SIZE - 4, py + TILE_SIZE - 4); this.ctx.moveTo(px + TILE_SIZE - 4, py + 4); this.ctx.lineTo(px + 4, py + TILE_SIZE - 4); this.ctx.stroke();
                } else if (tile === TILE_TYPES.WATER) {
                    this.ctx.fillStyle = COLORS.WATER; this.ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                    this.ctx.fillStyle = 'rgba(255,255,255,0.2)'; this.ctx.fillRect(px + 4, py + 10, 8, 2); this.ctx.fillRect(px + 16, py + 20, 10, 2);
                } else if (tile === TILE_TYPES.ICE) {
                    this.ctx.fillStyle = '#A0E6FF'; this.ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                    this.ctx.fillStyle = '#FFF'; this.ctx.fillRect(px+4, py+4, 8, 2);
                } else if (tile === TILE_TYPES.BASE) {
                    this.ctx.fillStyle = COLORS.BASE; this.ctx.fillRect(px, py, TILE_SIZE*2, TILE_SIZE*2);
                    this.ctx.fillStyle = '#fff'; this.ctx.font = '24px Arial'; this.ctx.textAlign='center'; this.ctx.fillText('🦅', px+TILE_SIZE, py+TILE_SIZE+8);
                } else if (tile === TILE_TYPES.BASE_DESTROYED) {
                    this.ctx.fillStyle = '#555'; this.ctx.fillRect(px, py, TILE_SIZE*2, TILE_SIZE*2);
                    this.ctx.fillStyle = '#000'; this.ctx.font = '24px Arial'; this.ctx.textAlign='center'; this.ctx.fillText('🏳️', px+TILE_SIZE, py+TILE_SIZE+8);
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
            this.ctx.fillText("🔴 死亡回放 (DEATH REPLAY) 🔴", CANVAS_SIZE / 2, 60);
        }
    }`;
let loopRegex = /loop\(\) \{[\s\S]*?requestAnimationFrame\(\(\) => this\.loop\(\)\);\n\s*\}/;
let newLoop = `loop() {
        if (this.gameState === 'REPLAY') {
            // Half speed playback
            this.replayIndex++;
            this.drawReplay();
            setTimeout(() => requestAnimationFrame(() => this.loop()), 33); // 30 FPS for slow motion
            return;
        }
        
        try { this.update(); } catch (e) { console.error('Game update error:', e); } 
        try { this.draw(); } catch (e) { console.error('Game draw error:', e); } 
        requestAnimationFrame(() => this.loop()); 
    }
    
    ${drawReplayFunc}`;
code = code.replace(loopRegex, newLoop);

fs.writeFileSync('game.js', code);
console.log('Replay logic complete');
