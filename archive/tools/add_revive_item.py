import re

with open("zombie-shooter/game.js", "r") as f:
    code = f.read()

# 1. Prevent gameLoop from freezing
gameloop_regex = r"function gameLoop\(timestamp\) \{\s*if\(gameState !== 'PLAYING'\) return;\s*update\(\);\s*draw\(\);\s*requestAnimationFrame\(gameLoop\);\s*\}"
new_gameloop = """function gameLoop(timestamp) {
    if(gameState !== 'PLAYING') return;
    try {
        update();
        draw();
    } catch(e) {
        console.error("Game Loop Error:", e);
    }
    requestAnimationFrame(gameLoop);
}"""
code = re.sub(gameloop_regex, new_gameloop, code)

# 2. Add 'revive' to LootBox types
lootbox_constructor_regex = r"const types = \['heal', 'shield', 'buff', 'weapon_box', 'mech', 'vehicle', 'nuke', 'trap'\];"
new_lootbox_constructor = """const types = ['heal', 'shield', 'buff', 'weapon_box', 'mech', 'vehicle', 'nuke', 'trap', 'revive'];"""
code = re.sub(lootbox_constructor_regex, new_lootbox_constructor, code)

# 3. Add 'revive' logic and color in LootBox
lootbox_color_regex = r"else if\(this\.type === 'nuke'\) this\.color = '#ff00ff';"
new_lootbox_color = """else if(this.type === 'nuke') this.color = '#ff00ff';
        else if(this.type === 'revive') this.color = '#ffffff';"""
code = re.sub(lootbox_color_regex, new_lootbox_color, code)

lootbox_draw_regex = r"else if\(this\.type === 'nuke'\) text = '☢️';"
new_lootbox_draw = """else if(this.type === 'nuke') text = '☢️';
        else if(this.type === 'revive') text = '👼';"""
code = re.sub(lootbox_draw_regex, new_lootbox_draw, code)

lootbox_update_regex = r"else if\(this\.type === 'trap'\) \{\s*addFloatingText\(p\.x, p\.y - 30, \"⚠️ 陷阱!\", \"#ff0000\"\);\s*p\.hp -= 30;\s*audio\.playerHit\(\);\s*\}"
new_lootbox_update = """else if(this.type === 'trap') {
                    addFloatingText(p.x, p.y - 30, "⚠️ 陷阱!", "#ff0000");
                    p.hp -= 30;
                    audio.playerHit();
                } else if(this.type === 'revive') {
                    // Find dead players
                    let revived = false;
                    players.forEach(deadPlayer => {
                        if(deadPlayer.hp <= 0 || deadPlayer.isDowned) {
                            deadPlayer.isDowned = false;
                            deadPlayer.hp = deadPlayer.maxHp;
                            if(deadPlayer.lives <= 0) deadPlayer.lives = 1;
                            revived = true;
                            addFloatingText(deadPlayer.x, deadPlayer.y - 30, "🌟 死者苏生!", "#ffff00");
                            createParticles(deadPlayer.x, deadPlayer.y, '#ffff00', 30);
                        }
                    });
                    if(revived) {
                        audio.levelUp();
                    } else {
                        // Give extra life if no one is dead
                        p.lives++;
                        addFloatingText(p.x, p.y - 30, "💖 生命+1", "#ff3333");
                        audio.levelUp();
                    }
                }"""
code = re.sub(lootbox_update_regex, new_lootbox_update, code)

with open("zombie-shooter/game.js", "w") as f:
    f.write(code)
