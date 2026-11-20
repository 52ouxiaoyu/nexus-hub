import re

with open("zombie-shooter/game.js", "r") as f:
    code = f.read()

# Add fading logic into the update function
update_start_regex = r"function update\(\) \{\s*if\(gameState !== 'PLAYING'\) return;\s*frameCount\+\+;"
new_update_start = """function update() {
    if(gameState !== 'PLAYING') return;
    frameCount++;
    
    // Gradually fade out blood stains from the background canvas
    if (frameCount % 2 === 0) {
        bgCtx.globalCompositeOperation = 'destination-out';
        bgCtx.fillStyle = 'rgba(0, 0, 0, 0.01)';
        bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
        bgCtx.globalCompositeOperation = 'source-over';
    }"""

code = re.sub(update_start_regex, new_update_start, code)

with open("zombie-shooter/game.js", "w") as f:
    f.write(code)
