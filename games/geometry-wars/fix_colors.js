const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

// 1. Player Colors
// Player 2: orange -> mint green
code = code.replace(/this\.color = id === 1 \? '#00bfff' : '#ff9900';/g, "this.color = id === 1 ? '#00bfff' : '#00ffcc';");

// 2. Zombie Colors (Harmful -> Red/Orange)
// normal: #00ff00 -> #ff4400
code = code.replace(/this\.color = '#00ff00'; \/\/ normal/g, "this.color = '#ff4400'; // normal");
// fast: #ffff00 -> #ff8800
code = code.replace(/this\.color = '#ffff00'; \/\/ fast/g, "this.color = '#ff8800'; // fast");
// shooter: #ff00ff -> #ff0044
code = code.replace(/this\.color = '#ff00ff'; \/\/ shooter/g, "this.color = '#ff0044'; // shooter");

// 3. Boss Traits (Harmful -> Red/Orange/Dark)
// Ymir: #00ff00 -> #cc0000
code = code.replace(/name: "终焉·尤弥尔 \(Ymir\)", temper: "坚韧壁垒 - 体型巨大且不断恢复", skill: "heal", color: "#00ff00"/g,
                    'name: "终焉·尤弥尔 (Ymir)", temper: "坚韧壁垒 - 体型巨大且不断恢复", skill: "heal", color: "#cc0000"');
// Fortress: #00ff00 -> #aa3300
code = code.replace(/name: "重装堡垒 \(Fortress\)", temper: "护甲恢复", skill: "heal", color: "#00ff00"/g,
                    'name: "重装堡垒 (Fortress)", temper: "护甲恢复", skill: "heal", color: "#aa3300"');
// Thunder: #00ffff -> #ffaa00
code = code.replace(/name: "雷霆几何 \(Thunder\)", temper: "狂暴加速", skill: "dash", color: "#00ffff"/g,
                    'name: "雷霆几何 (Thunder)", temper: "狂暴加速", skill: "dash", color: "#ffaa00"');
// Cyber / Matrix: #ff00ff -> #ff0055
code = code.replace(/name: "湮灭·赛博 \(Cyber\)", temper: "弹幕核心 - 发射密集的死亡弹幕", skill: "shoot", color: "#ff00ff"/g,
                    'name: "湮灭·赛博 (Cyber)", temper: "弹幕核心 - 发射密集的死亡弹幕", skill: "shoot", color: "#ff0055"');
code = code.replace(/name: "弹幕矩阵 \(Matrix\)", temper: "发射弹幕", skill: "shoot", color: "#ff00ff"/g,
                    'name: "弹幕矩阵 (Matrix)", temper: "发射弹幕", skill: "shoot", color: "#ff0055"');

// 4. Enemy Bullets (Harmful -> Red/Orange)
// Shooter bullet
code = code.replace(/let b = new Bullet\(this\.x, this\.y, dx\/len, dy\/len, 5, 1, '#ff00ff'/g,
                    "let b = new Bullet(this.x, this.y, dx/len, dy/len, 5, 1, '#ff3300'");
// Boss shoot bullet
code = code.replace(/let b = new Bullet\(this\.x, this\.y, Math\.cos\(angle\), Math\.sin\(angle\), 2\.5, 1, '#ff00ff'/g,
                    "let b = new Bullet(this.x, this.y, Math.cos(angle), Math.sin(angle), 2.5, 1, '#ff0000'");
// Enemy bullet particle explosion when hitting player
code = code.replace(/createParticles\(b\.x, b\.y, '#ff00ff', 10\);/g,
                    "createParticles(b.x, b.y, '#ff0000', 10);");

// 5. LootBoxes (Beneficial -> Green/Blue)
// health: #ff0000 -> #00ff00
code = code.replace(/w\.color = '#ff0000';/g, "w.color = '#00ff00';");
// ultimate: #ff00ff -> #0088ff
code = code.replace(/w\.color = '#ff00ff';/g, "w.color = '#0088ff';");
// vehicle: #ffaa00 -> #00ccff
code = code.replace(/w\.color = '#ffaa00';/g, "w.color = '#00ccff';");
// nuke: #ffffff -> #00ffff
code = code.replace(/w\.color = '#ffffff';/g, "w.color = '#00ffff';");

// 6. Player Bullets and Ults (Beneficial -> Green/Blue)
// weaponLevel >= 29: #ff00ff -> #00ffcc
code = code.replace(/if\(this\.weaponLevel >= 29\) b\.color = '#ff00ff';/g, "if(this.weaponLevel >= 29) b.color = '#00ffcc';");
// count >= 5: #ffaa00 -> #00ff00
code = code.replace(/else if\(count >= 5\) b\.color = '#ffaa00';/g, "else if(count >= 5) b.color = '#00ff00';");
// Shotgun (id=1): #ff0000 -> #00bfff
code = code.replace(/bullets\.push\(new Bullet\(this\.x, this\.y, Math\.cos\(angle\), Math\.sin\(angle\), 12, 150, '#ff0000'/g, "bullets.push(new Bullet(this.x, this.y, Math.cos(angle), Math.sin(angle), 12, 150, '#00bfff'");
code = code.replace(/bullets\.push\(new Bullet\(this\.x, this\.y, Math\.cos\(angle-0\.3\), Math\.sin\(angle-0\.3\), 12, 150, '#ff0000'/g, "bullets.push(new Bullet(this.x, this.y, Math.cos(angle-0.3), Math.sin(angle-0.3), 12, 150, '#00bfff'");
code = code.replace(/bullets\.push\(new Bullet\(this\.x, this\.y, Math\.cos\(angle\+0\.3\), Math\.sin\(angle\+0\.3\), 12, 150, '#ff0000'/g, "bullets.push(new Bullet(this.x, this.y, Math.cos(angle+0.3), Math.sin(angle+0.3), 12, 150, '#00bfff'");
// Shotgun high level: #ff0000 -> #00ffff
code = code.replace(/bullets\.push\(new Bullet\(this\.x, this\.y, Math\.cos\(angle-0\.2\), Math\.sin\(angle-0\.2\), 12, 200, '#ff0000'/g, "bullets.push(new Bullet(this.x, this.y, Math.cos(angle-0.2), Math.sin(angle-0.2), 12, 200, '#00ffff'");
code = code.replace(/bullets\.push\(new Bullet\(this\.x, this\.y, Math\.cos\(angle\+0\.2\), Math\.sin\(angle\+0\.2\), 12, 200, '#ff0000'/g, "bullets.push(new Bullet(this.x, this.y, Math.cos(angle+0.2), Math.sin(angle+0.2), 12, 200, '#00ffff'");
code = code.replace(/bullets\.push\(new Bullet\(this\.x, this\.y, Math\.cos\(angle\), Math\.sin\(angle\), 15, 50, '#ff0000'/g, "bullets.push(new Bullet(this.x, this.y, Math.cos(angle), Math.sin(angle), 15, 50, '#00ffff'");
// Machine gun tracking: #ff5500 -> #00ff88
code = code.replace(/let b = new Bullet\(this\.x, this\.y, this\.facing\.x, this\.facing\.y, 10, 400, '#ff5500'/g, "let b = new Bullet(this.x, this.y, this.facing.x, this.facing.y, 10, 400, '#00ff88'");
// Laser base & pierce: #ff00ff -> #00ffcc
code = code.replace(/bullets\.push\(new Bullet\(this\.x, this\.y, this\.facing\.x, this\.facing\.y, 12, 100, '#ff00ff'/g, "bullets.push(new Bullet(this.x, this.y, this.facing.x, this.facing.y, 12, 100, '#00ffcc'");
code = code.replace(/bullets\.push\(new Bullet\(this\.x, this\.y, Math\.cos\(angle\), Math\.sin\(angle\), 15, 80, '#ff00ff'/g, "bullets.push(new Bullet(this.x, this.y, Math.cos(angle), Math.sin(angle), 15, 80, '#00ffcc'");

// Ult: Exploder #ff00ff -> #00ffff
code = code.replace(/shockwaves\.push\(new Shockwave\(this\.x, this\.y, '#ff00ff'/g, "shockwaves.push(new Shockwave(this.x, this.y, '#00ffff'");
// Ult: Tracking #ff00ff -> #00ffcc
code = code.replace(/let b = new Bullet\(this\.x, this\.y, Math\.cos\(a\), Math\.sin\(a\), 15, 300, '#ff00ff'/g, "let b = new Bullet(this.x, this.y, Math.cos(a), Math.sin(a), 15, 300, '#00ffcc'");
// Ult: Beam #ffff00 -> #00ff00
code = code.replace(/let beam = new Bullet\(this\.x, this\.y, Math\.cos\(ang\), Math\.sin\(ang\), 40, 3000 \* levelScale, '#ffff00'/g, "let beam = new Bullet(this.x, this.y, Math.cos(ang), Math.sin(ang), 40, 3000 * levelScale, '#00ff00'");

fs.writeFileSync('game.js', code);
console.log("Colors successfully replaced.");
