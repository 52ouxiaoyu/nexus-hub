const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

// 1. Geom Healing + Screen Shake fixes in Geom update
let oldGeomUpdate = `                if(dist < p.size + this.size) {
                    this.active = false;
                    scoreMultiplier = Math.min(999, scoreMultiplier + 1);
                    audio.shootPistol(); // Use a subtle sound for pickup
                }`;
let newGeomUpdate = `                if(dist < p.size + this.size) {
                    this.active = false;
                    scoreMultiplier = Math.min(999, scoreMultiplier + 1);
                    if (p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + 0.2); // Heal 0.2 HP per Geom!
                    audio.shootPistol(); // Use a subtle sound for pickup
                }`;
code = code.replace(oldGeomUpdate, newGeomUpdate);

// 2. Remove lag and screen shake from Homing Missiles
let oldHoming = `                if(b.isHoming) {
                    createParticles(b.x, b.y, '#ff5500', 20);
                    screenShake = 5;
                    audio.shootShotgun();
                    zombies.forEach(z2 => {
                        if(!z2.active) return;
                        let ddx = z2.x - b.x;
                        let ddy = z2.y - b.y;
                        if(Math.abs(ddx) < 80 && Math.abs(ddy) < 80 && (ddx*ddx + ddy*ddy < 6400)) {
                            z2.hp -= b.damage * 0.5;
                            if(z2.hp <= 0) { 
                                z2.active = false; 
                                score += z2.scoreVal; 
                                let owner = players.find(pl => pl.id === b.ownerId);
                                if(owner) owner.score += z2.scoreVal;
                                geoms.push(new Geom(z2.x, z2.y));
                            }
                        }
                    });
                }`;
let newHoming = `                if(b.isHoming) {
                    createParticles(b.x, b.y, '#ff5500', 10);
                    audio.shootShotgun();
                    // Removed splash damage O(N) loop here to fix late-game lag!
                    // Homing missiles are already strong enough.
                }`;
if (code.includes(oldHoming)) {
    code = code.replace(oldHoming, newHoming);
    console.log("Patched homing missiles.");
} else {
    console.log("Homing missile block not found.");
}

// 3. Tone down other Screen Shakes
// Combo shake
code = code.replace(/screenShake = 10; addFloatingText\(CANVAS_W\/2, 100, `\$\{comboCount\} 连杀 \(COMBO\)!`, '#00ccff'\);/g, "addFloatingText(CANVAS_W/2, 100, `${comboCount} 连杀 (COMBO)!`, '#00ccff');");
code = code.replace(/screenShake = 10; addFloatingText\(CANVAS_W\/2, 100, `🔥 \$\{comboCount\} 连杀 \(COMBO\)!`, '#00ccff'\);/g, "addFloatingText(CANVAS_W/2, 100, `🔥 ${comboCount} 连杀 (COMBO)!`, '#00ccff');");

// Ultimate shake
code = code.replace(/screenShake = 30;/g, "screenShake = 10;"); // Reduced ult shake
code = code.replace(/screenShake = 20;/g, ""); // Remove duplicate/extra shakes

// Shockwave shake
code = code.replace(/screenShake = 5;/g, "screenShake = 2;"); // Very minor shake instead of 5

fs.writeFileSync('game.js', code);
console.log("Patched game.js");
