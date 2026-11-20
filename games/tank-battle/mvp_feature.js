const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

// 1. Update gameOver
let gameOverRegex = /gameOver\(\) \{[\s\S]*?showGameOverScreen\(\);\n\s*\}\n\s*\}/;
let newGameOver = `gameOver() {
        if (this.replayHistory.length > 0) {
            this.gameState = 'REPLAY';
            this.replayIndex = 0;
            this.showAnnouncement('💀 DEATH REPLAY 💀', '#f00');
            audio.play('explosion');
        } else {
            this.showMVPScreen();
        }
    }`;
code = code.replace(gameOverRegex, newGameOver);

// 2. Add showMVPScreen and drawMVP
let drawReplayRegex = /if \(this\.replayIndex >= this\.replayHistory\.length\) \{\n\s*this\.showGameOverScreen\(\);\n\s*return;\n\s*\}/;
let newDrawReplayRegex = `if (this.replayIndex >= this.replayHistory.length) {
            this.showMVPScreen();
            return;
        }`;
code = code.replace(drawReplayRegex, newDrawReplayRegex);

let loopFuncRegex = /loop\(\) \{\n\s*if \(this\.gameState === 'REPLAY'\) \{/;
let newLoopFunc = `loop() {
        if (this.gameState === 'MVP_SHOWCASE') {
            this.drawMVP();
            requestAnimationFrame(() => this.loop());
            return;
        }
        if (this.gameState === 'REPLAY') {`;
code = code.replace(loopFuncRegex, newLoopFunc);

let classEnd = code.lastIndexOf('}');
let insertIndex = code.lastIndexOf('}', classEnd - 1); // find end of Game class methods

let mvpMethods = `
    showMVPScreen() {
        this.gameState = 'MVP_SHOWCASE';
        this.mvpTimer = 0;
        let sortedPlayers = [...this.players].sort((a, b) => b.score - a.score);
        this.mvpPlayer = sortedPlayers[0];
        audio.play('powerup');
        setTimeout(() => {
            this.showGameOverScreen();
        }, 5000); // show MVP screen for 5 seconds
    }
    
    drawMVP() {
        this.mvpTimer++;
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'; // Dim background instead of fully black so it feels like overlay
        if (this.mvpTimer === 1) this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        else this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height); // redraw full black for now
        
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
        this.ctx.fillText(\`\${this.mvpPlayer.id} MVP!\`, 0, 0);
        
        this.ctx.shadowBlur = 0;
        this.ctx.font = 'bold 40px Arial';
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText(\`SCORE: \${this.mvpPlayer.score}\`, 0, 60);
        this.ctx.restore();
    }
`;

code = code.slice(0, insertIndex) + mvpMethods + code.slice(insertIndex);
fs.writeFileSync('game.js', code);
console.log('MVP logic applied');
