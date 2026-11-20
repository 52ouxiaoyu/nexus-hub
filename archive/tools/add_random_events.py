import re

with open("zombie-shooter/game.js", "r") as f:
    code = f.read()

# 1. Faster Difficulty Scaling
spawn_rate_regex = r"let spawnRate = 100; // frames"
code = re.sub(spawn_rate_regex, "let spawnRate = 60;", code)

difficulty_inc_regex = r"if\(frameCount % 600 === 0\) \{\s*spawnRate = Math\.max\(15, spawnRate - 5\);\s*\}"
new_difficulty = """if(frameCount % 300 === 0) {
        spawnRate = Math.max(5, spawnRate - 5);
    }"""
code = re.sub(difficulty_inc_regex, new_difficulty, code)

# 2. Spawn multiple zombies at higher difficulties
spawn_regex = r"if\(frameCount % Math\.max\(20, spawnRate\) === 0\) \{\s*zombies\.push\(new Zombie\(\)\);\s*\}"
new_spawn = """if(frameCount % Math.max(5, spawnRate) === 0) {
        let count = Math.floor(survivalTime / 15) + 1;
        if (count > 10) count = 10;
        for(let i=0; i<count; i++) zombies.push(new Zombie());
    }"""
code = re.sub(spawn_regex, new_spawn, code)

# 3. Random Event System
# Add eventTimer and activeEvent to globals
globals_regex = r"let bgCtx = bgCanvas\.getContext\('2d'\);"
new_globals = """let bgCtx = bgCanvas.getContext('2d');
let activeEvent = null;
let eventTimer = 0;"""
code = re.sub(globals_regex, new_globals, code)

# In update, handle events
event_update = """
    // Random Events every 40 seconds
    if(frameCount > 0 && frameCount % 2400 === 0) {
        const events = ['swarm', 'bloodmoon', 'orbital'];
        activeEvent = events[Math.floor(Math.random() * events.length)];
        eventTimer = 600; // 10 seconds duration
        
        if(activeEvent === 'swarm') {
            addFloatingText(CANVAS_W/2, CANVAS_H/2, "⚠️ 警告：尸潮来袭！ ⚠️", "#ff0000");
            audio.levelUp();
            screenShake = 30;
            for(let i=0; i<30; i++) zombies.push(new Zombie());
        } else if(activeEvent === 'bloodmoon') {
            addFloatingText(CANVAS_W/2, CANVAS_H/2, "🌙 血月降临：丧尸狂暴！ 🌙", "#ff0000");
            audio.levelUp();
            screenShake = 20;
        } else if(activeEvent === 'orbital') {
            addFloatingText(CANVAS_W/2, CANVAS_H/2, "🚀 天降正义：全图轰炸！ 🚀", "#00ffff");
            audio.levelUp();
            screenShake = 20;
        }
    }
    
    // Process active event
    if(eventTimer > 0) {
        eventTimer--;
        if(activeEvent === 'orbital' && eventTimer % 10 === 0) {
            // Drop bombs randomly
            let bx = Math.random() * CANVAS_W;
            let by = Math.random() * CANVAS_H;
            createParticles(bx, by, '#ffaa00', 30);
            screenShake = 5;
            audio.shootShotgun();
            zombies.forEach(z => {
                if(Math.hypot(z.x - bx, z.y - by) < 150) {
                    z.hp -= 200;
                    if(z.hp <= 0 && z.active) {
                        z.active = false;
                        score += z.scoreVal;
                        createParticles(z.x, z.y, z.color, 15);
                    }
                }
            });
        }
        if(eventTimer <= 0) {
            activeEvent = null;
        }
    }
"""

# Insert event_update into gameLoop's update()
# Wait, let's put it right after frameCount++
update_start_regex = r"frameCount\+\+;"
code = re.sub(update_start_regex, "frameCount++;\n" + event_update, code)


# 4. Apply Blood Moon speed buff to zombies
zombie_speed_regex = r"this\.speed = isBoss \? 1\.5 : 1 \+ Math\.random\(\) \* 2 \+ \(survivalTime / 60\);"
new_zombie_speed = """this.speed = isBoss ? 1.5 : 1 + Math.random() * 2 + (survivalTime / 60);
        if(activeEvent === 'bloodmoon') this.speed *= 2;"""
code = re.sub(zombie_speed_regex, new_zombie_speed, code)

# 5. Add a cool visual for Blood Moon
draw_bg_regex = r"ctx\.fillStyle = '#111';\s*ctx\.fillRect\(0, 0, CANVAS_W, CANVAS_H\);"
new_draw_bg = """if(activeEvent === 'bloodmoon') {
        ctx.fillStyle = '#300';
    } else {
        ctx.fillStyle = '#111';
    }
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);"""
code = re.sub(draw_bg_regex, new_draw_bg, code)


# 6. Add "Ultimate skill" (大招) drops
# Add 'ult' to LootBox
lootbox_constructor_regex = r"const types = \['heal', 'shield', 'buff', 'weapon_box', 'mech', 'vehicle', 'nuke', 'trap', 'revive'\];"
new_lootbox_constructor = """const types = ['heal', 'shield', 'buff', 'weapon_box', 'mech', 'vehicle', 'nuke', 'trap', 'revive', 'ult'];"""
code = re.sub(lootbox_constructor_regex, new_lootbox_constructor, code)

lootbox_color_regex = r"else if\(this\.type === 'revive'\) this\.color = '#ffffff';"
new_lootbox_color = """else if(this.type === 'revive') this.color = '#ffffff';
        else if(this.type === 'ult') this.color = '#00ffff';"""
code = re.sub(lootbox_color_regex, new_lootbox_color, code)

lootbox_draw_regex = r"else if\(this\.type === 'revive'\) text = '👼';"
new_lootbox_draw = """else if(this.type === 'revive') text = '👼';
        else if(this.type === 'ult') text = '⚡';"""
code = re.sub(lootbox_draw_regex, new_lootbox_draw, code)

lootbox_update_regex = r"addFloatingText\(p\.x, p\.y - 30, \"💖 生命\+1\", \"#ff3333\"\);\s*audio\.levelUp\(\);\s*\}"
new_lootbox_update = """addFloatingText(p.x, p.y - 30, "💖 生命+1", "#ff3333");
                        audio.levelUp();
                    }
                } else if(this.type === 'ult') {
                    p.hasUlt = true;
                    addFloatingText(p.x, p.y - 30, "⚡ 获得大招！按Q或右Shift释放！", "#00ffff");
                    audio.levelUp();
                """
code = re.sub(lootbox_update_regex, new_lootbox_update, code)

# 7. Player inputs for Ultimate
# Add Q and Right Shift to keys
keys_regex = r"Space: false, Enter: false, NumpadEnter: false"
new_keys = """Space: false, Enter: false, NumpadEnter: false, KeyQ: false, ShiftRight: false, Slash: false"""
code = re.sub(keys_regex, new_keys, code)

# Add ultimate fire logic in keydown
# Space/Enter shooting
shoot_regex = r"if\(\(e\.code === 'Space' \|\| e\.code === 'Enter' \|\| e\.code === 'NumpadEnter'\) && gameState === 'PLAYING'\) \{"
new_shoot = """if((e.code === 'KeyQ' || e.code === 'ShiftRight' || e.code === 'Slash') && gameState === 'PLAYING') {
        players.forEach(p => { 
            if(((e.code==='KeyQ'&&p.id===1) || ((e.code==='ShiftRight'||e.code==='Slash')&&p.id===2)) && p.hasUlt) {
                p.hasUlt = false;
                // Fire Ultimate: 360 degree lasers
                audio.levelUp();
                screenShake = 30;
                addFloatingText(p.x, p.y - 50, "⚡ 万剑归宗 ⚡", "#00ffff");
                for(let angle=0; angle<Math.PI*2; angle+=Math.PI/16) {
                    let b = new Bullet(p.x, p.y, {x: Math.cos(angle), y: Math.sin(angle)}, p.weapon);
                    b.damage = 100;
                    b.pierce = true;
                    b.size = 10;
                    bullets.push(b);
                }
            }
        });
    }
    if((e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter') && gameState === 'PLAYING') {"""
code = re.sub(shoot_regex, new_shoot, code)

# Init hasUlt
player_constructor_regex = r"this\.reviveTime = 0;"
new_player_constructor = """this.reviveTime = 0;
        this.hasUlt = false;"""
code = re.sub(player_constructor_regex, new_player_constructor, code)

# Draw Ultimate Indicator
player_draw_regex = r"// HP Bar\s*if\(this\.hp < this\.maxHp\) \{"
new_player_draw = """// Ultimate Indicator
        if(this.hasUlt) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#00ffff';
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, 40 + Math.sin(frameCount*0.2)*5, 0, Math.PI*2);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // HP Bar
        if(this.hp < this.maxHp) {"""
code = re.sub(player_draw_regex, new_player_draw, code)


with open("zombie-shooter/game.js", "w") as f:
    f.write(code)
