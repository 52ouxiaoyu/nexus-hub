const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

// 1. Replace the weapon generation loop
const oldWeapons = `        this.weapons = [];
        for(let i=1; i<=30; i++) {
            let w = {name: \`Lv.\${i} 手枪\`, cd: 15, damage: 20, speed: 10, count: 1, spread: 0, pierce: false, isShockwave: false, isHoming: false};
            
            w.damage = 20 + Math.floor(i / 2) * 10;
            w.speed = 10 + i * 0.4;
            w.req = i * 4; // Much faster leveling // Faster leveling: Requires only 8 kills per level
            
            if(i <= 5) {
                w.name = \`Lv.\${i} 战术手枪\`;
                w.count = 1;
                w.cd = Math.max(5, 14 - i * 1.5);
            } else if (i <= 10) {
                w.name = \`Lv.\${i} 霰弹枪\`;
                w.count = 3 + Math.floor((i-5)/2); // 3 to 5 bullets
                w.spread = 0.6 + (i-5)*0.1;
                w.cd = 20 - (i-5)*1.5;
                w.damage = 40 + i * 4;
            } else if (i <= 15) {
                w.name = \`Lv.\${i} 突击步枪\`;
                w.count = 1;
                w.cd = Math.max(3, 8 - Math.floor((i-10)*1.2)); // Extremely fast
                w.damage = 35 + i * 5;
                w.speed = 18;
            } else if (i <= 20) {
                w.name = \`Lv.\${i} 高能激光\`;
                w.count = 1;
                w.pierce = true;
                w.speed = 30; // Super fast
                w.size = 10; // Larger
                w.cd = 18 - (i-15);
                w.damage = 120 + i * 10;
                w.color = '#00ffff';
            } else if (i <= 25) {
                w.name = \`Lv.\${i} 蜂群导弹\`;
                w.count = 3 + Math.floor((i-20)/2); // 3 to 5 missiles
                w.spread = 1.2;
                w.isHoming = true;
                w.cd = 25 - (i-20);
                w.damage = 180 + i * 5;
                w.speed = 10;
                w.color = '#00ff00';
            } else if (i < 30) {
                w.name = \`Lv.\${i} 电磁脉冲\`;
                w.isShockwave = true;
                w.radius = 250 + (i-25)*25;
                w.damage = 250 + (i-25)*50;
                w.cd = 18 - (i-25)*2;
            } else { 
                w.name = "🌌 超新星爆破 🌌";
                w.isShockwave = true;
                w.radius = 600;
                w.damage = 1000;
                w.cd = 10;
            }
            this.weapons.push(w);
        }`;

const newWeapons = `        this.weapons = [];
        for(let i=1; i<=30; i++) {
            let w = {name: \`Lv.\${i} 手枪\`, cd: 15, damage: 20, speed: 10, count: 1, spread: 0, pierce: false, isShockwave: false, isHoming: false};
            
            w.damage = 20 + Math.floor(i / 2) * 10;
            w.speed = 10 + i * 0.4;
            w.req = i * 4; // Much faster leveling
            
            if(i <= 5) {
                w.name = \`Lv.\${i} 战术手枪\`;
                w.count = 1;
                w.cd = Math.max(5, 14 - i * 1.5);
                w.color = '#ffffff'; // White
            } else if (i <= 10) {
                w.name = \`Lv.\${i} 霰弹枪\`;
                w.count = 3 + Math.floor((i-5)); // 3 to 8 bullets!
                w.spread = 0.6 + (i-5)*0.1;
                w.cd = 20 - (i-5)*1.5;
                w.damage = 40 + i * 4;
                w.color = '#add8e6'; // Light Blue
            } else if (i <= 15) {
                w.name = \`Lv.\${i} 突击步枪\`;
                w.count = 1 + Math.floor((i-10)/2); // 1 to 3 bullets per shot
                w.spread = 0.2; 
                w.cd = Math.max(3, 8 - Math.floor((i-10)*1.2)); // Extremely fast
                w.damage = 35 + i * 5;
                w.speed = 18;
                w.color = '#00ffff'; // Cyan
            } else if (i <= 20) {
                w.name = \`Lv.\${i} 高能激光\`;
                w.count = 1 + Math.floor((i-15)/2); // 1 to 3 piercing lasers
                w.spread = 0.2;
                w.pierce = true;
                w.speed = 30; // Super fast
                w.size = 10 + (i-15); // Larger and larger!
                w.cd = 18 - (i-15);
                w.damage = 120 + i * 10;
                w.color = '#00ffcc'; // Mint Green
            } else if (i <= 25) {
                w.name = \`Lv.\${i} 蜂群导弹\`;
                w.count = 3 + (i-20); // 3 to 8 missiles!
                w.spread = 1.2;
                w.isHoming = true;
                w.cd = 25 - (i-20);
                w.damage = 180 + i * 5;
                w.speed = 10;
                w.color = '#00ff00'; // Lime Green
            } else if (i < 30) {
                w.name = \`Lv.\${i} 电磁脉冲\`;
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
        }`;

if (code.includes(oldWeapons)) {
    code = code.replace(oldWeapons, newWeapons);
    console.log("Successfully replaced weapon defs.");
} else {
    console.log("Error: old weapons string not matched.");
}

// 2. Fix shockwave color
code = code.replace(/shockwaves\.push\(new Shockwave\(this\.x, this\.y, '#00ffff', w\.damage, w\.radius, this\.id\)\);/, 
    "shockwaves.push(new Shockwave(this.x, this.y, w.color || '#00ffff', w.damage, w.radius, this.id));");

fs.writeFileSync('game.js', code);
