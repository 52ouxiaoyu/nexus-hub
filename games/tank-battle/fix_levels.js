const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

// MAX_WEAPON gives level 4
code = code.replace(/player\.level = 30;/g, 'player.level = 4;');
code = code.replace(/this\.level >= 30/g, 'this.level >= 4');

// Bullet destroying steel at level 2 instead of 5
code = code.replace(/tile === TILE_TYPES\.STEEL && this\.level >= 5/g, 'tile === TILE_TYPES.STEEL && this.level >= 2');

// Bullet drawing
code = code.replace(/this\.level >= 3 \? '#ff0' : '#fff'/g, "this.level >= 1 ? '#ff0' : '#fff'");

// Bullet type
code = code.replace(/if \(this\.level >= 20\) bType = 'LASER_MISSILE';/g, "if (this.level >= 4) bType = 'LASER_MISSILE';");
code = code.replace(/else if \(this\.level >= 10\) bType = 'LASER';/g, "else if (this.level >= 3) bType = 'LASER';");
code = code.replace(/else if \(this\.level >= 5\) bType = 'MISSILE';/g, "else if (this.level >= 2) bType = 'MISSILE';");

// Tank drawing shadow
code = code.replace(/ctx\.shadowColor = this\.level >= 20 \? '#f0f' : \(this\.level >= 10 \? '#0ff' : \(this\.level >= 5 \? '#f00' : \(this\.level >= 3 \? '#ff0' : \(this\.level === 2 \? '#0f0' : '#fff'\)\)\)\);/g,
    "ctx.shadowColor = this.level >= 4 ? '#f0f' : (this.level >= 3 ? '#0ff' : (this.level >= 2 ? '#f00' : (this.level >= 1 ? '#ff0' : '#fff')));");

// Tank drawing fillStyle
code = code.replace(/ctx\.fillStyle = this\.level >= 20 \? '#f0f' : \(this\.level >= 10 \? '#0ff' : \(this\.level >= 5 \? '#f00' : \(this\.level >= 3 \? '#ff0' : this\.color\)\)\);/g,
    "ctx.fillStyle = this.level >= 4 ? '#f0f' : (this.level >= 3 ? '#0ff' : (this.level >= 2 ? '#f00' : (this.level >= 1 ? '#ff0' : this.color)));");

// Tank drawing fillStyle 2
code = code.replace(/ctx\.fillStyle = this\.level >= 3 \? '#fa0' : '#0ff';/g, "ctx.fillStyle = this.level >= 1 ? '#fa0' : '#0ff';");
code = code.replace(/if \(this\.level >= 2\)/g, "if (this.level >= 1)");

// Spread check
code = code.replace(/this\.level >= 15/g, "this.level >= 3");

// HUD getWeaponHTML
code = code.replace(/if \(level >= 20\) return "<span style='color:#f0f;'>追踪激光\(紫\)<\/span>";/g, 'if (level >= 4) return "<span style=\'color:#f0f;\'>追踪激光(紫)</span>";');
code = code.replace(/if \(level >= 10\) return "<span style='color:#0ff;'>穿透激光\(青\)<\/span>";/g, 'if (level >= 3) return "<span style=\'color:#0ff;\'>穿透激光(青)</span>";');
code = code.replace(/if \(level >= 5\) return "<span style='color:#f00;'>跟踪导弹\(红\)<\/span>";/g, 'if (level >= 2) return "<span style=\'color:#f00;\'>跟踪导弹(红)</span>";');
code = code.replace(/if \(level >= 3\) return "<span style='color:#ff0;'>强化高爆\(黄\)<\/span>";/g, 'if (level >= 1) return "<span style=\'color:#ff0;\'>强化高爆(黄)</span>";');

// Boss drops level jump
code = code.replace(/killer\.level = Math\.max\(killer\.level, 5\);/g, "killer.level = Math.max(killer.level, 2);");

fs.writeFileSync('game.js', code);
