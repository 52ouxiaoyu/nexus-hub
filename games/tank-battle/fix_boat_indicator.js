const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

code = code.replace(/if \(this\.shieldTimer > 0\)/, 
    `if (this.canBoat) { ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 6; ctx.setLineDash([10, 5]); ctx.strokeRect(px - 6, py - 6, w + 12, h + 12); ctx.setLineDash([]); }
        if (this.canFly) { ctx.strokeStyle = '#ffaa00'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(px + 30, py + 30, 45, 0, Math.PI * 2); ctx.stroke(); }
        if (this.shieldTimer > 0)`);

fs.writeFileSync('game.js', code);
