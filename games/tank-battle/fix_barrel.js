const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

// The line for barrelW: const barrelW = 6 + Math.min(this.level, 10) * 2;
// We'll replace the block for UP/DOWN
code = code.replace(/if \(this\.direction === 'UP'\) ctx\.fillRect\(px \+ w\/2 - barrelW\/2, py - 8, barrelW, 24 \+ Math\.min\(this\.level, 10\) \* 4\);\s+else ctx\.fillRect\(px \+ w\/2 - barrelW\/2, py \+ h - 16 - Math\.min\(this\.level, 10\) \* 4, barrelW, 24 \+ Math\.min\(this\.level, 10\) \* 4\);/g,
    `const ext = Math.min(this.level, 4) * 2;
            if (this.direction === 'UP') ctx.fillRect(px + w/2 - barrelW/2, py - 8 - ext, barrelW, 24 + ext);
            else ctx.fillRect(px + w/2 - barrelW/2, py + h - 16, barrelW, 24 + ext);`);

// And the block for LEFT/RIGHT
code = code.replace(/if \(this\.direction === 'LEFT'\) ctx\.fillRect\(px - 8 - Math\.min\(this\.level, 10\) \* 4, py \+ h\/2 - barrelW\/2, 24 \+ Math\.min\(this\.level, 10\) \* 4, barrelW\);\s+else ctx\.fillRect\(px \+ w - 16 - Math\.min\(this\.level, 10\) \* 4, py \+ h\/2 - barrelW\/2, 24 \+ Math\.min\(this\.level, 10\) \* 4, barrelW\);/g,
    `const ext = Math.min(this.level, 4) * 2;
            if (this.direction === 'LEFT') ctx.fillRect(px - 8 - ext, py + h/2 - barrelW/2, 24 + ext, barrelW);
            else ctx.fillRect(px + w - 16, py + h/2 - barrelW/2, 24 + ext, barrelW);`);

fs.writeFileSync('game.js', code);
