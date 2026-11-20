
const SPRITE_PALETTE = {
    '0': 'transparent',
    '1': '#000000', // Outline/Eyes
    '2': '#FFCDB2', // Skin
    '3': '#FFFFFF', // White
    '4': '#FF0000', // Red (Lu Bu)
    '5': '#8B4513', // Brown
    '6': '#808080', // Grey
    '7': '#FFD700', // Gold (Zhang Jiao)
    '8': '#8A2BE2', // Purple (Dong Zhuo)
    '9': '#006400', // Dark Green
    'A': '#00FFFF', // Cyan
    'B': '#32CD32'  // Lime
};

const SPRITES = {
    HERO: [
        "00004440000",
        "00004440000",
        "00077777000",
        "00677777600",
        "06622222660",
        "06612221660",
        "00066666000",
        "00CCCCCCC00",
        "06C6CCC6C60",
        "066C666C660",
        "00660006600"
    ],
    INFANTRY: [
        "000777000",
        "007777700",
        "002121200",
        "002222200",
        "005555500",
        "065555560",
        "005555500",
        "001101100"
    ],
    CAVALRY: [
        "00000220000",
        "00002120000",
        "00004440000",
        "00554445500",
        "05555555550",
        "55155555155",
        "55555555555",
        "05500000550",
        "01100000110"
    ],
    HEAVY: [
        "0006666000",
        "0066666600",
        "0666116660",
        "0666666660",
        "0666666660",
        "6666666666",
        "6666666666",
        "6666666666",
        "0666006660",
        "0666006660",
        "0111001110"
    ],
    BOSS_LUBU: [
        "000044440000",
        "000444444000",
        "004144441400",
        "004441144400",
        "000444444000",
        "004444444400",
        "044044440440",
        "000044440000",
        "000010010000"
    ],
    BOSS_ZHANGJIAO: [
        "000077770000",
        "000777777000",
        "007177771700",
        "007771177700",
        "000777777000",
        "007777777700",
        "077077770770",
        "000077770000",
        "000010010000"
    ],
    BOSS_DONGZHUO: [
        "000088880000",
        "000888888000",
        "008188881800",
        "008881188800",
        "000888888000",
        "008888888800",
        "088088880880",
        "000088880000",
        "000010010000"
    ],
    FINAL_BOSS: [
        "000004444400000",
        "000044444440000",
        "004414444414400",
        "044444111444440",
        "004444444444400",
        "000444444444000",
        "004400000004400",
        "044000000000440",
        "440000000000044",
        "444444444444444",
        "444444444444444",
        "444444444444444",
        "044440000044440",
        "004400000004400",
        "001100000001100"
    ],
    ARROW: [
        "0110", "1661", "0110", "0550", "0550", "0550", "0550", "1441", "1441"
    ],
    BOLT: [
        "0770", "7777", "7777", "0770"
    ],
    ROCK: [
        "06660", "66366", "63666", "66666", "06660"
    ],
    BALLISTA: [
        "AA", "33", "33", "33", "33", "33", "33", "33", "33", "AA"
    ],
    DRAGON: [
        "004400", "047740", "043340", "033330", "033330", "033330", "166661", "166661", "440044"
    ],
    BOMB_WEAPON: [
        "00411400", "04133140", "41333314", "41333314", "41333314", "41333314", "04133140", "00411400"
    ],
    AXE: [
        "001100", "016610", "163361", "163361", "016610", "001100"
    ],
    SHOCKWAVE: [
        "0000000000000000",
        "A33333333333333A",
        "0A333333333333A0",
        "00AAAAAAAAAAAA00",
        "0000000000000000"
    ],
    FAN: [
        "003300", "03A300", "3AAA30", "3A3A30", "033300", "005000"
    ],
    SWORD: [
        "00300", "03A30", "03A30", "03A30", "03A30", "01710", "00700"
    ]
};

const spriteCache = {};

function drawSprite(ctx, spriteObj, x, y, sizeMultiplier, dynamicColor) {
    if (!spriteObj) return;
    const rows = spriteObj.length;
    const cols = spriteObj[0].length;
    const pSize = sizeMultiplier;
    
    // Create a cache key based on the sprite string shape, size, and dynamic color.
    // Using the first row as a quick signature since each sprite starts differently.
    const cacheKey = spriteObj[0] + "_" + rows + "_" + pSize + "_" + (dynamicColor || "");

    let cachedCanvas = spriteCache[cacheKey];

    if (!cachedCanvas) {
        cachedCanvas = document.createElement('canvas');
        cachedCanvas.width = cols * pSize;
        cachedCanvas.height = rows * pSize;
        const cctx = cachedCanvas.getContext('2d');
        
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const char = spriteObj[r][c];
                if (char === '0') continue;
                
                let color = SPRITE_PALETTE[char];
                if (char === 'C') color = dynamicColor;
                
                if (color) {
                    cctx.fillStyle = color;
                    cctx.fillRect(c * pSize, r * pSize, pSize, pSize);
                }
            }
        }
        spriteCache[cacheKey] = cachedCanvas;
    }
    
    const startX = x - (cols * pSize) / 2;
    const startY = y - (rows * pSize) / 2;
    ctx.drawImage(cachedCanvas, startX, startY);
}
