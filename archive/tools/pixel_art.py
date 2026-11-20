import re

with open("zombie-shooter/game.js", "r") as f:
    code = f.read()

pixel_art_consts = """
// --- PIXEL ART SPRITES ---
const SPRITE_COLORS = {
    'A': '#228B22', // P1 Green
    'B': '#FF8C00', // P2 Orange
    'H': '#1a3300', // Helmet dark green
    'N': '#ffccaa', // Skin
    'G': '#222222', // Gun
    'V': '#00ffff', // Visor/Glass
    'T': '#222222', // Treads/Wheels
    'O': '#ff8800', // Goliath Orange
    'C': '#00ffff', // Core/Lights
    'L': '#aaaaaa', // Titan Light Grey
    'D': '#555555', // Titan Dark Grey
    'R': '#ff0000', // Titan Red Core / Bike Red
    'S': '#00aaff', // Valkyrie Blue
    'W': '#333333'  // Dark details
};

const SPRITE_P1 = [
    "...........",
    "....AAA....",
    "...AAAAA...",
    "..AAHHHAA..",
    "..NHHHHHN..",
    "..NGGGGGGG.",
    "..NHHHHHN..",
    "..AAHHHAA..",
    "...AAAAA...",
    "....AAA....",
    "..........."
];

const SPRITE_P2 = [
    "...........",
    "....BBB....",
    "...BBBBB...",
    "..BBHHHBB..",
    "..NHHHHHN..",
    "..NGGGGGGG.",
    "..NHHHHHN..",
    "..BBHHHBB..",
    "...BBBBB...",
    "....BBB....",
    "..........."
];

const SPRITE_GOLIATH = [
    "TTTTTTTTTTT....",
    "TTTTTTTTTTTTT..",
    ".T.........T...",
    "....OOOOO......",
    "...OOOOOOO.....",
    "..OOOOOOOOO....",
    "..OOOCCCOOOOO..",
    "..OOOCCCWWWWWWW",
    "..OOOCCCOOOOO..",
    "..OOOOOOOOO....",
    "...OOOOOOO.....",
    "....OOOOO......",
    ".T.........T...",
    "TTTTTTTTTTTTT..",
    "TTTTTTTTTTT...."
];

const SPRITE_TITAN = [
    "....WWWWW......",
    "...LLLLLLL.....",
    "..LLLLLLLLL....",
    ".LLLLLLLLLLL...",
    "WLLLDDDDDBLLW..",
    "WLLLDDDDDBLLW..",
    "WLLLDDDDDBLLW..",
    "WLLLDRDRDBLLW..",
    "WLLLDDDDDBLLW..",
    "WLLLDDDDDBLLW..",
    "WLLLDDDDDBLLW..",
    ".LLLLLLLLLLL...",
    "..LLLLLLLLL....",
    "...LLLLLLL.....",
    "....WWWWW......"
];

const SPRITE_VALKYRIE = [
    "...............",
    "...SSSS........",
    "..SSSSSS.......",
    "..SSSSSSS......",
    ".SSSSSSSSSS....",
    ".SSSCCCCSSSSS..",
    "SSSCCCCCCSSSSSS",
    "SSCCCCCCCWWWWWW",
    "SSSCCCCCCSSSSSS",
    ".SSSCCCCSSSSS..",
    ".SSSSSSSSSS....",
    "..SSSSSSS......",
    "..SSSSSS.......",
    "...SSSS........",
    "..............."
];

const SPRITE_BIKE = [
    "...............",
    "...............",
    "....TTTTT......",
    "..TTRRRRRTT....",
    ".TTRRRRRRRRTT..",
    "TTRRRWWWRRRRTT.",
    "TTRRWWWWWRRRTT.",
    "TTRRWWWWWRRRTT.",
    "TTRRWWWWWRRRTT.",
    "TTRRRWWWRRRRTT.",
    ".TTRRRRRRRRTT..",
    "..TTRRRRRTT....",
    "....TTTTT......",
    "...............",
    "..............."
];

function drawPixelSprite(ctx, sprite, pxSize, cx, cy) {
    let w = sprite[0].length;
    let h = sprite.length;
    let ox = - (w * pxSize) / 2;
    let oy = - (h * pxSize) / 2;
    for(let r=0; r<h; r++) {
        for(let c=0; c<w; c++) {
            let char = sprite[r][c];
            if(char !== '.' && SPRITE_COLORS[char]) {
                ctx.fillStyle = SPRITE_COLORS[char];
                ctx.fillRect(cx + ox + c * pxSize, cy + oy + r * pxSize, pxSize, pxSize);
            }
        }
    }
}
"""

# Insert pixel art consts before Player class
code = code.replace("class Player {", pixel_art_consts + "\nclass Player {")

# Replace Player.draw
old_draw_start = "draw(ctx) {"
old_draw_end = """        // Player ID and Lives
        ctx.fillStyle = '#fff';"""

old_draw_full = code[code.find(old_draw_start) : code.find(old_draw_end) + len(old_draw_end)]

new_draw_full = """draw(ctx) {
        if(this.hp <= 0 && !this.isDowned) return;

        if(this.isDowned) {
            // Draw Tombstone
            ctx.fillStyle = '#666';
            ctx.fillRect(this.x - 15, this.y - 15, 30, 35);
            ctx.beginPath(); ctx.arc(this.x, this.y - 15, 15, Math.PI, 0); ctx.fill();
            ctx.fillStyle = '#000'; ctx.font = '20px Arial'; ctx.fillText('RIP', this.x, this.y + 5);
            
            ctx.fillStyle = '#fff';
            ctx.font = '12px "Share Tech Mono", monospace';
            ctx.fillText('P' + this.id + ' 等待救援...', this.x, this.y - 35);
            
            // Draw Revive Progress Bar
            if(this.reviveProgress > 0) {
                ctx.fillStyle = '#222'; ctx.fillRect(this.x - 20, this.y + 25, 40, 6);
                ctx.fillStyle = '#0f0'; ctx.fillRect(this.x - 20, this.y + 25, 40 * (this.reviveProgress/120), 6);
            }
            return;
        }

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(Math.atan2(this.facing.y, this.facing.x));

        if(this.mechTime > 0) {
            if(this.mechType === 1) {
                drawPixelSprite(ctx, SPRITE_GOLIATH, 6, 0, 0);
            } else if(this.mechType === 2) {
                drawPixelSprite(ctx, SPRITE_TITAN, 5, 0, 0);
            } else if(this.mechType === 3) {
                drawPixelSprite(ctx, SPRITE_VALKYRIE, 5, 0, 0);
            } else {
                drawPixelSprite(ctx, SPRITE_TITAN, 5, 0, 0); // Fallback
            }
        } else if(this.vehicleTime > 0) {
            drawPixelSprite(ctx, SPRITE_BIKE, 4, 0, 0);
        } else {
            if(this.id === 1) {
                drawPixelSprite(ctx, SPRITE_P1, 4, 0, 0);
            } else {
                drawPixelSprite(ctx, SPRITE_P2, 4, 0, 0);
            }
        }
        ctx.restore();

        // Player ID and Lives
        ctx.fillStyle = '#fff';"""

code = code.replace(old_draw_full, new_draw_full)

with open("zombie-shooter/game.js", "w") as f:
    f.write(code)
