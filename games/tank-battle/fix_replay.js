const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

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
    }`;
let loopRegex = /loop\(\) \{\s*try \{ this\.update\(\); \} catch \(e\) \{ console\.error\('Game update error:', e\); \} \s*try \{ this\.draw\(\); \} catch \(e\) \{ console\.error\('Game draw error:', e\); \} \s*requestAnimationFrame\(\(\) => this\.loop\(\)\);\s*\}/;
let newLoop = `loop() {
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
    
    ${drawReplayFunc}`;

if (code.match(loopRegex)) {
    code = code.replace(loopRegex, newLoop);
    fs.writeFileSync('game.js', code);
    console.log('Fixed loop and added drawReplay');
} else {
    console.log('Regex did not match!');
}
