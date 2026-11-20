const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

// 1. P2 Color
code = code.replace(/this\.color = id === 1 \? '#00bfff' : '#00ffcc';/, "this.color = id === 1 ? '#00bfff' : '#00ff00';");

// 2. Merge Logic
const oldMerge = `if(!z2.active || z1.type !== z2.type || z1.tier !== z2.tier) continue;
                
                let dx = z1.x - z2.x;
                let dy = z1.y - z2.y;
                if(dx*dx + dy*dy < maxMergeDistSq) {
                    z1.mergeTimer += 1.5; // Net +1 per second
                    z2.mergeTimer += 1.5;
                    
                    if(z1.mergeTimer >= 3) { // 3 seconds of contact
                        z2.active = false;
                        z1.mergeTimer = 0;
                        z1.tier++;
                        z1.maxHp *= 3;
                        z1.hp = z1.maxHp;
                        z1.damage *= 2; 
                        z1.size *= 1.5;
                        z1._baseScore *= 3;
                        
                        createParticles(z1.x, z1.y, z1.color, 30);
                        addFloatingText(z1.x, z1.y - z1.size - 10, \`LV\${z1.tier} 聚合体!\`, "#ff3300");
                        screenShake = Math.max(screenShake, 5);
                        break;
                    }
                }`;

const newMerge = `if(!z2.active || z1.type !== z2.type) continue;
                
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
                        addFloatingText(survivor.x, survivor.y - survivor.size - 10, \`LV\${survivor.tier} 巨型体!\`, "#ff3300");
                    }
                    if (z1 === consumed) break;
                }`;

if (code.includes(oldMerge)) {
    code = code.replace(oldMerge, newMerge);
} else {
    console.log("Merge logic not found!");
}

// 3. Make Ultimates visually cooler
// Neon Nova
code = code.replace(/shockwaves\.push\(new Shockwave\(this\.x, this\.y, '#00ffff', 2000 \* levelScale, 400 \* levelScale, this\.id\)\);/g, 
"shockwaves.push(new Shockwave(this.x, this.y, '#00ffff', 2000 * levelScale, 400 * levelScale, this.id));\n                for(let i=0; i<30; i++) createParticles(this.x, this.y, '#00ffff', 5);");

// Flashier particles on Ult
code = code.replace(/audio\.levelUp\(\); \/\/ ultimate sound/g, "audio.levelUp(); \n        createParticles(this.x, this.y, '#00ffff', 50); \n        screenShake = 30;");

// Weapon 10-15 Assualt Rifle speed up requirement so they get to Laser faster
// "Requires only 8 kills per level"
code = code.replace(/w\.req = i \* 8;/g, "w.req = i * 4; // Much faster leveling");

fs.writeFileSync('game.js', code);
console.log("Patched game.js");
