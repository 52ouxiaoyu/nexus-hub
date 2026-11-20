import re

# 1. Update style.css
with open("zombie-shooter/style.css", "r") as f:
    css = f.read()

# Change fonts and base styling
css = css.replace("font-family: 'ZCOOL KuaiLe', 'Comic Sans MS', sans-serif;", "font-family: 'Share Tech Mono', 'Courier New', Courier, monospace;")
css = css.replace("font-family: 'ZCOOL KuaiLe', cursive;", "font-family: 'Share Tech Mono', 'Courier New', Courier, monospace;")

# Update HUD
new_hud = """#hud {
    position: absolute;
    top: 0; left: 0; right: 0;
    padding: 15px 30px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    z-index: 10;
    background: linear-gradient(to bottom, rgba(0, 50, 20, 0.9), transparent);
    border-bottom: 2px solid rgba(0, 255, 102, 0.4);
    box-shadow: 0 5px 20px rgba(0, 255, 102, 0.2);
    pointer-events: none;
    text-transform: uppercase;
    letter-spacing: 2px;
}

#hud::before {
    content: '';
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    pointer-events: none;
    background: repeating-linear-gradient(
        0deg,
        rgba(0, 0, 0, 0.15),
        rgba(0, 0, 0, 0.15) 1px,
        transparent 1px,
        transparent 2px
    );
    z-index: 100;
}
"""
css = re.sub(r"#hud \{.*?(?=\.hud-item)", new_hud, css, flags=re.DOTALL)

# Update texts
css = css.replace("color: #ffaa00;", "color: #00ff66;")
css = css.replace("text-shadow: 0 2px 4px rgba(0,0,0,0.5);", "text-shadow: 0 0 8px rgba(0,255,102,0.8);")

# Update weapon info
weapon_info = """#weapon-info {
    font-size: 18px;
    color: #00ff66;
    background: rgba(0, 30, 10, 0.8);
    padding: 8px 25px;
    border: 1px solid #00ff66;
    box-shadow: inset 0 0 10px rgba(0, 255, 102, 0.3), 0 0 10px rgba(0, 255, 102, 0.3);
    text-shadow: 0 0 5px #00ff66;
    position: relative;
}
#weapon-info::before {
    content: '[ ';
    color: #fff;
}
#weapon-info::after {
    content: ' ]';
    color: #fff;
}"""
css = re.sub(r"#weapon-info \{.*?(?=#kill-combo)", weapon_info, css, flags=re.DOTALL)

# Update buttons
btn_style = """.big-btn {
    background: rgba(0, 50, 20, 0.8);
    color: #00ff66;
    border: 2px solid #00ff66;
    padding: 15px 40px;
    font-size: 24px;
    font-family: 'Share Tech Mono', 'Courier New', Courier, monospace;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 4px;
    box-shadow: 0 0 15px rgba(0,255,102,0.3), inset 0 0 15px rgba(0,255,102,0.3);
    transition: all 0.2s;
    position: relative;
    overflow: hidden;
}

.big-btn:hover {
    background: #00ff66;
    color: #000;
    box-shadow: 0 0 30px rgba(0,255,102,0.8);
    transform: scale(1.05);
}"""
css = re.sub(r"\.big-btn \{.*?\.big-btn:active", btn_style + "\n.big-btn:active", css, flags=re.DOTALL)

# Update screen background to have crosshairs/grid
css = css.replace("background: rgba(0, 0, 0, 0.85);", "background: rgba(0, 10, 5, 0.9); background-image: radial-gradient(circle, rgba(0,255,102,0.05) 1px, transparent 1px); background-size: 30px 30px;")

with open("zombie-shooter/style.css", "w") as f:
    f.write(css)

# 2. Update index.html fonts
with open("zombie-shooter/index.html", "r") as f:
    html = f.read()

html = html.replace('family=ZCOOL+KuaiLe', 'family=Share+Tech+Mono')
with open("zombie-shooter/index.html", "w") as f:
    f.write(html)

# 3. Update game.js
with open("zombie-shooter/game.js", "r") as f:
    game_js = f.read()

# Change Player.draw to draw tactical soldier
player_draw_regex = r"// Body\s*ctx\.fillStyle = this\.color;\s*ctx\.fillRect\(-s, -s, s\*2, s\*2\);\s*// Gun\s*ctx\.fillStyle = '#666';\s*ctx\.fillRect\(s, -4, s, 8\);"

tactical_draw = """// Tactical Soldier Top-Down
        let shoulderS = s * 0.85;
        
        // Backpack
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(-s - 4, -shoulderS + 2, 8, shoulderS * 2 - 4);
        
        // Vest / Armor
        ctx.fillStyle = this.id === 1 ? '#2c3e2c' : '#3e2c2c'; // Camo tint based on player ID
        ctx.fillRect(-s + 4, -shoulderS, s * 1.4, shoulderS * 2);
        
        // Tactical Helmet
        ctx.fillStyle = '#111'; 
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.65, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = this.id === 1 ? '#00bfff' : '#ff9900';
        ctx.stroke();
        
        // NVG (Night Vision Goggles) glow
        ctx.fillStyle = '#00ff66';
        ctx.fillRect(s * 0.4, -4, 4, 3);
        ctx.fillRect(s * 0.4, 1, 4, 3);
        
        // Tactical Rifle
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(s * 0.3, -3, s * 1.8, 5); // Barrel
        ctx.fillStyle = '#222';
        ctx.fillRect(0, -4, s * 0.8, 7); // Receiver
        
        // Laser Sight (Active when not on cooldown maybe? Or just always on)
        if (this.weaponLevel > 0) {
            ctx.beginPath();
            ctx.moveTo(s * 2, -2);
            ctx.lineTo(s * 2 + 150, -2);
            ctx.strokeStyle = this.id === 1 ? 'rgba(0, 255, 255, 0.15)' : 'rgba(255, 100, 0, 0.15)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }"""
        
game_js = re.sub(player_draw_regex, tactical_draw, game_js)

# Also change font for player ID text from ZCOOL KuaiLe to Share Tech Mono
game_js = game_js.replace("font = '12px ZCOOL KuaiLe'", "font = '12px \"Share Tech Mono\", monospace'")

with open("zombie-shooter/game.js", "w") as f:
    f.write(game_js)
