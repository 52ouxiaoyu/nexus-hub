import re

# 1. Update Zombie Types in game.js
with open("zombie-shooter/game.js", "r") as f:
    code = f.read()

zombie_constructor_regex = r"constructor\(isBoss = false\) \{\s*this\.isBoss = isBoss;\s*// Spawn at edges\s*const edge = Math\.floor\(Math\.random\(\) \* 4\);\s*if\(edge === 0\) \{ this\.x = Math\.random\(\) \* CANVAS_W; this\.y = -30; \}\s*else if\(edge === 1\) \{ this\.x = CANVAS_W \+ 30; this\.y = Math\.random\(\) \* CANVAS_H; \}\s*else if\(edge === 2\) \{ this\.x = Math\.random\(\) \* CANVAS_W; this\.y = CANVAS_H \+ 30; \}\s*else \{ this\.x = -30; this\.y = Math\.random\(\) \* CANVAS_H; \}\s*this\.size = isBoss \? 35 : 15 \+ Math\.random\(\) \* 5;\s*this\.speed = isBoss \? 1\.5 : 1 \+ Math\.random\(\) \* 2 \+ \(survivalTime / 60\);\s*if\(activeEvent === 'bloodmoon'\) this\.speed \*= 2;\s*this\.hp = isBoss \? 1000 \+ survivalTime\*10 : 20 \+ survivalTime;\s*this\.maxHp = this\.hp;\s*this\.color = isBoss \? '#ff00ff' : '#00ff00';\s*this\.active = true;\s*this\.damage = isBoss \? 30 : 10;\s*this\.scoreVal = isBoss \? 500 : 10;\s*this\.facing = \{x: 1, y: 0\};\s*\}"

new_zombie_constructor = """constructor(isBoss = false) {
        this.isBoss = isBoss;
        
        // Types
        if(isBoss) {
            this.type = 'boss';
        } else {
            const rand = Math.random();
            if(rand < 0.5) this.type = 'normal';
            else if(rand < 0.75) this.type = 'fast';
            else if(rand < 0.9) this.type = 'tank';
            else this.type = 'exploder';
        }

        // Spawn at edges
        const edge = Math.floor(Math.random() * 4);
        if(edge === 0) { this.x = Math.random() * CANVAS_W; this.y = -30; }
        else if(edge === 1) { this.x = CANVAS_W + 30; this.y = Math.random() * CANVAS_H; }
        else if(edge === 2) { this.x = Math.random() * CANVAS_W; this.y = CANVAS_H + 30; }
        else { this.x = -30; this.y = Math.random() * CANVAS_H; }

        if(this.type === 'boss') {
            this.size = 35; this.speed = 1.5; this.hp = 1000 + survivalTime*10; this.color = '#ff00ff'; this.damage = 30; this.scoreVal = 500;
        } else if(this.type === 'fast') {
            this.size = 12 + Math.random()*3; this.speed = 2.5 + Math.random() + (survivalTime/60); this.hp = 10 + survivalTime/2; this.color = '#ffff00'; this.damage = 5; this.scoreVal = 15;
        } else if(this.type === 'tank') {
            this.size = 25 + Math.random()*5; this.speed = 0.5 + Math.random()*0.5 + (survivalTime/120); this.hp = 100 + survivalTime*3; this.color = '#4444ff'; this.damage = 20; this.scoreVal = 30;
        } else if(this.type === 'exploder') {
            this.size = 18 + Math.random()*4; this.speed = 1.2 + Math.random() + (survivalTime/60); this.hp = 15 + survivalTime; this.color = '#ff5500'; this.damage = 10; this.scoreVal = 20;
        } else { // normal
            this.size = 15 + Math.random()*5; this.speed = 1 + Math.random()*1.5 + (survivalTime/60); this.hp = 20 + survivalTime; this.color = '#00ff00'; this.damage = 10; this.scoreVal = 10;
        }
        
        if(activeEvent === 'bloodmoon') this.speed *= 2;
        this.maxHp = this.hp;
        this.active = true;
        this.facing = {x: 1, y: 0};
    }"""
code = re.sub(zombie_constructor_regex, new_zombie_constructor, code)

# Exploder logic
# Find where zombie is marked as active = false (bullet death, boar death)
# But it's easier to just add an Exploder check in update() if hp <= 0?
# Actually, if z.active = false is set in bullets and boar, we can just patch `createParticles(z.x, z.y, z.color, 15);` 
exploder_logic = """createParticles(z.x, z.y, z.color, 15);
                    if(z.type === 'exploder') {
                        createParticles(z.x, z.y, '#ffaa00', 30);
                        audio.shootShotgun();
                        screenShake = Math.max(screenShake, 10);
                        addFloatingText(z.x, z.y, "💥 自爆!", "#ff5500");
                        players.forEach(p => {
                            if(p.hp > 0 && Math.hypot(p.x - z.x, p.y - z.y) < 80) {
                                p.hp -= 40;
                                audio.playerHit();
                            }
                        });
                        zombies.forEach(oz => {
                            if(oz.active && oz !== z && Math.hypot(oz.x - z.x, oz.y - z.y) < 80) {
                                oz.hp -= 50;
                            }
                        });
                    }"""
code = code.replace("createParticles(z.x, z.y, z.color, 15);", exploder_logic)


with open("zombie-shooter/game.js", "w") as f:
    f.write(code)

# 2. Update style.css
with open("zombie-shooter/style.css", "r") as f:
    css = f.read()

hud_regex = r"#hud \{\s*position: absolute;\s*top: 10px;\s*left: 10px;\s*right: 10px;\s*display: flex;\s*justify-content: space-between;\s*pointer-events: none;\s*\}"
new_hud = """#hud {
    position: absolute;
    top: 15px;
    left: 15px;
    right: 15px;
    display: flex;
    justify-content: space-between;
    pointer-events: none;
    font-family: 'ZCOOL KuaiLe', cursive;
}"""
css = re.sub(hud_regex, new_hud, css)

stats_regex = r"#stats \{\s*background: rgba\(0,0,0,0\.5\);\s*padding: 10px;\s*border-radius: 5px;\s*\}"
new_stats = """#stats {
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    padding: 15px 25px;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.1);
    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    font-size: 20px;
    text-shadow: 1px 1px 2px #000;
}
#stats div { margin-bottom: 5px; }
#stats span { color: #ffaa00; font-weight: bold; font-size: 24px; }
"""
css = re.sub(stats_regex, new_stats, css)

players_hud_regex = r"#players-hud \{\s*display: flex;\s*gap: 20px;\s*\}"
new_players_hud = """#players-hud {
    display: flex;
    gap: 20px;
}"""
css = re.sub(players_hud_regex, new_players_hud, css)

player_stat_regex = r"\.player-stat \{\s*background: rgba\(0,0,0,0\.5\);\s*padding: 10px;\s*border-radius: 5px;\s*width: 200px;\s*\}"
new_player_stat = """.player-stat {
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    padding: 15px;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.1);
    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    width: 220px;
    text-shadow: 1px 1px 2px #000;
}
.player-stat h3 { margin: 0 0 10px 0; font-size: 16px; color: #aaa; }
.player-stat div { font-size: 16px; margin-top: 5px; }
"""
css = re.sub(player_stat_regex, new_player_stat, css)

hp_bar_regex = r"\.hp-bar \{\s*width: 100%;\s*height: 20px;\s*background: #333;\s*border-radius: 10px;\s*overflow: hidden;\s*margin-bottom: 5px;\s*\}"
new_hp_bar = """.hp-bar {
    width: 100%;
    height: 18px;
    background: rgba(0,0,0,0.6);
    border-radius: 9px;
    border: 1px solid rgba(255,255,255,0.2);
    overflow: hidden;
    margin-bottom: 10px;
    box-shadow: inset 0 2px 5px rgba(0,0,0,0.5);
}"""
css = re.sub(hp_bar_regex, new_hp_bar, css)

hp_fill_regex = r"\.hp-fill \{\s*height: 100%;\s*background: #0f0;\s*width: 100%;\s*transition: width 0\.2s;\s*\}"
new_hp_fill = """.hp-fill {
    height: 100%;
    background: linear-gradient(90deg, #00ff00, #55ff55);
    width: 100%;
    transition: width 0.2s;
    box-shadow: 0 0 10px rgba(0,255,0,0.5);
}"""
css = re.sub(hp_fill_regex, new_hp_fill, css)

# Screen optimizations
screen_regex = r"\.screen \{\s*position: absolute;\s*top: 0;\s*left: 0;\s*width: 100%;\s*height: 100%;\s*background: rgba\(0,0,0,0\.8\);\s*display: flex;\s*flex-direction: column;\s*justify-content: center;\s*align-items: center;\s*\}"
new_screen = """.screen {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.85);
    backdrop-filter: blur(5px);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}"""
css = re.sub(screen_regex, new_screen, css)

btn_regex = r"button \{\s*margin-top: 20px;\s*padding: 10px 20px;\s*font-size: 20px;\s*cursor: pointer;\s*font-family: 'ZCOOL KuaiLe', cursive;\s*\}"
new_btn = """button {
    margin-top: 25px;
    padding: 12px 30px;
    font-size: 24px;
    cursor: pointer;
    font-family: 'ZCOOL KuaiLe', cursive;
    background: linear-gradient(180deg, #ffaa00, #ff5500);
    border: none;
    border-radius: 8px;
    color: white;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
    box-shadow: 0 5px 15px rgba(255,170,0,0.4);
    transition: transform 0.1s, box-shadow 0.1s;
}
button:hover {
    transform: scale(1.05);
    box-shadow: 0 8px 20px rgba(255,170,0,0.6);
}
button:active {
    transform: scale(0.95);
}
"""
css = re.sub(btn_regex, new_btn, css)

with open("zombie-shooter/style.css", "w") as f:
    f.write(css)

