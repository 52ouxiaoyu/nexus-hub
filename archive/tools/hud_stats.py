import re

# 1. Update index.html HUD
with open("zombie-shooter/index.html", "r") as f:
    html = f.read()

hud_regex = r"<div id=\"hud\" class=\"hidden\">.*?</div>\s*</div>\s*<!-- 游戏UI层 -->"
new_hud = """<div id="hud" class="hidden">
            <div id="p1-stats" class="hud-item left-box" style="color: #00bfff; font-size: 14px;">
                <div style="font-weight: bold; font-size: 18px; margin-bottom: 5px;">[ P1 ]</div>
                <div>得分: <span id="p1-score">0</span></div>
                <div>火力: <span id="p1-weapon">Lv.1</span></div>
                <div>状态: <span id="p1-buffs">无</span></div>
            </div>
            
            <div class="hud-item center-box" style="text-align: center;">
                <div class="label" style="color:#00ff66;">TEAM SCORE</div>
                <div id="score" style="font-size:32px; color:#00ff66; text-shadow: 0 0 10px #00ff66;">0</div>
                <div id="kill-combo" class="hidden glow-text">连击 <span id="combo-count">x1</span></div>
                <button id="pause-btn" style="margin-top: 10px; background: rgba(0,50,20,0.8); border: 1px solid #00ff66; color: #00ff66; cursor: pointer; padding: 5px 15px;">⏸ 战术面板</button>
            </div>

            <div id="p2-stats" class="hud-item right-box" style="color: #ff9900; font-size: 14px; text-align: right;">
                <div style="font-weight: bold; font-size: 18px; margin-bottom: 5px;">[ P2 ]</div>
                <div>得分: <span id="p2-score">0</span></div>
                <div>火力: <span id="p2-weapon">Lv.1</span></div>
                <div>状态: <span id="p2-buffs">无</span></div>
            </div>
        </div>
        <!-- 游戏UI层 -->"""
html = re.sub(hud_regex, new_hud, html, flags=re.DOTALL)

with open("zombie-shooter/index.html", "w") as f:
    f.write(html)

# 2. Update game.js
with open("zombie-shooter/game.js", "r") as f:
    code = f.read()

# Add score to Player
code = code.replace("this.hp = 3;", "this.hp = 3;\n        this.score = 0;")

# Add ownerId to Bullet constructor
bullet_constructor_regex = r"class Bullet \{\s*constructor\(x, y, dx, dy, speed, damage, color, pierce=false\) \{"
new_bullet_constructor = """class Bullet {
    constructor(x, y, dx, dy, speed, damage, color, pierce=false, ownerId=0) {
        this.ownerId = ownerId;"""
code = re.sub(bullet_constructor_regex, new_bullet_constructor, code)

# Update shoot() to pass ownerId
shoot_bullet_regex = r"let b = new Bullet\(this\.x, this\.y, Math\.cos\(angle\), Math\.sin\(angle\), this\.weapon\.speed, this\.weapon\.damage, '#fff', this\.weapon\.pierce\);"
new_shoot_bullet = "let b = new Bullet(this.x, this.y, Math.cos(angle), Math.sin(angle), this.weapon.speed, this.weapon.damage, '#fff', this.weapon.pierce, this.id);"
code = re.sub(shoot_bullet_regex, new_shoot_bullet, code)

# Also update AI ultimate bullet push
ai_ult_bullet_regex = r"let b = new Bullet\(this\.x, this\.y, Math\.cos\(angle\), Math\.sin\(angle\), 20, 150, '#00ffff', true\);"
new_ai_ult_bullet = "let b = new Bullet(this.x, this.y, Math.cos(angle), Math.sin(angle), 20, 150, '#00ffff', true, this.id);"
code = re.sub(ai_ult_bullet_regex, new_ai_ult_bullet, code)

# Also update Player ultimate bullet push
player_ult_bullet_regex = r"let b = new Bullet\(p\.x, p\.y, Math\.cos\(angle\), Math\.sin\(angle\), 20, 150, '#00ffff', true\);"
new_player_ult_bullet = "let b = new Bullet(p.x, p.y, Math.cos(angle), Math.sin(angle), 20, 150, '#00ffff', true, p.id);"
code = re.sub(player_ult_bullet_regex, new_player_ult_bullet, code)

# Update collision to add score to owner
zombie_death_regex = r"if\(z\.hp <= 0\) \{\s*z\.active = false;\s*score \+= z\.scoreVal;\s*killCount\+\+;"
new_zombie_death = """if(z.hp <= 0) {
                    z.active = false;
                    score += z.scoreVal;
                    let owner = players.find(pl => pl.id === b.ownerId);
                    if(owner) owner.score += z.scoreVal;
                    killCount++;"""
code = re.sub(zombie_death_regex, new_zombie_death, code)

# Remove the old weapon_box text updates
code = code.replace("document.getElementById('current-weapon').textContent = p.weapon.name;", "")

# Add HUD update logic in game loop
update_end_regex = r"floatingTexts = floatingTexts\.filter\(ft => ft\.life > 0\);\s*lootBoxes = lootBoxes\.filter\(lb => lb\.active\);\s*if\(typeof boars !== 'undefined'\) boars = boars\.filter\(b => b\.active\);\s*\}"
new_update_end = """floatingTexts = floatingTexts.filter(ft => ft.life > 0);
    lootBoxes = lootBoxes.filter(lb => lb.active);
    if(typeof boars !== 'undefined') boars = boars.filter(b => b.active);

    // Update Player HUD
    if(players.length >= 2) {
        let p1 = players[0];
        document.getElementById('p1-score').textContent = p1.score;
        document.getElementById('p1-weapon').textContent = p1.weapon.name;
        let p1b = [];
        if(p1.shieldTime > 0) p1b.push('🛡️');
        if(p1.buffTime > 0) p1b.push('🌀');
        if(p1.mechTime > 0) p1b.push('🤖');
        if(p1.vehicleTime > 0) p1b.push('🏍️');
        if(p1.hasUlt) p1b.push('⚡');
        document.getElementById('p1-buffs').textContent = p1b.length > 0 ? p1b.join(' ') : '无';

        let p2 = players[1];
        document.getElementById('p2-score').textContent = p2.score;
        document.getElementById('p2-weapon').textContent = p2.weapon.name;
        let p2b = [];
        if(p2.shieldTime > 0) p2b.push('🛡️');
        if(p2.buffTime > 0) p2b.push('🌀');
        if(p2.mechTime > 0) p2b.push('🤖');
        if(p2.vehicleTime > 0) p2b.push('🏍️');
        if(p2.hasUlt) p2b.push('⚡');
        document.getElementById('p2-buffs').textContent = p2b.length > 0 ? p2b.join(' ') : '无';
    }
}"""
code = re.sub(update_end_regex, new_update_end, code)

with open("zombie-shooter/game.js", "w") as f:
    f.write(code)
