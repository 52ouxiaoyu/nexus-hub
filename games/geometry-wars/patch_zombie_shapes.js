const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

// 1. Add shapeSides to Zombie constructor
let oldConstr = `        this.tier = 1;
        this.type = 'normal'; // normal, fast, tank
        let rand = Math.random();`;

let newConstr = `        this.tier = 1;
        this.type = 'normal'; // normal, fast, tank
        this.shapeSides = Math.floor(Math.random() * 5) + 3; // 3, 4, 5, 6, 7 sides (Triangle to Heptagon)
        let rand = Math.random();`;

code = code.replace(oldConstr, newConstr);

// 2. Rewrite Zombie draw method for normal zombies
let oldDraw = `            ctx.beginPath();
            if (this.type === 'fast') {
                // Sleek Triangle pointing forward
                ctx.moveTo(s, 0);
                ctx.lineTo(-s, s * 0.8);
                ctx.lineTo(-s, -s * 0.8);
                ctx.closePath();
            } else if (this.type === 'tank') {
                // Hexagon
                for (let i = 0; i < 6; i++) {
                    let angle = (i * Math.PI) / 3;
                    if (i === 0) ctx.moveTo(Math.cos(angle) * s * 1.2, Math.sin(angle) * s * 1.2);
                    else ctx.lineTo(Math.cos(angle) * s * 1.2, Math.sin(angle) * s * 1.2);
                }
                ctx.closePath();
            } else {
                // Square
                ctx.rect(-s, -s, s * 2, s * 2);
            }
            ctx.fill();
            ctx.stroke();`;

let newDraw = `            ctx.beginPath();
            let sides = this.shapeSides || 3;
            for (let i = 0; i < sides; i++) {
                let angle = (i * Math.PI * 2) / sides;
                // Offset angle so shapes point forward or look balanced
                if (sides === 4) angle += Math.PI / 4; 
                else if (sides % 2 !== 0) angle += 0; // Point forward

                let px = Math.cos(angle) * s * 1.2;
                let py = Math.sin(angle) * s * 1.2;
                
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();`;

if (code.includes(oldDraw)) {
    code = code.replace(oldDraw, newDraw);
    console.log("Patched Zombie draw");
} else {
    console.log("Error: old draw not found");
}

fs.writeFileSync('game.js', code);
