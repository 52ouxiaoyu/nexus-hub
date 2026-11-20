import re

with open("zombie-shooter/game.js", "r") as f:
    code = f.read()

# Add lives, reviveProgress to Player
player_constructor_regex = r"(this\.vehicleTime = 0;)"
new_player_vars = """\\1
        this.lives = 3;
        this.reviveProgress = 0; // 0 to 180 (3 seconds at 60fps)
        this.isDowned = false;"""
code = re.sub(player_constructor_regex, new_player_vars, code)

# Update Player shoot to prevent shooting when downed
player_shoot_regex = r"if\(this\.hp <= 0 \|\| this\.cooldown > 0\) return;"
new_player_shoot = """if(this.hp <= 0 || this.isDowned || this.cooldown > 0) return;"""
code = re.sub(player_shoot_regex, new_player_shoot, code)

# Player Update to handle downed state and reviving
player_update_regex = r"if\(this\.isAI\) \{"
new_player_update = """if(this.hp <= 0) {
            if(!this.isDowned && this.lives > 0) {
                this.isDowned = true;
                this.lives--;
                this.reviveProgress = 0;
            }
            if(this.isDowned) {
                // Check if other alive player is near
                let beingRevived = false;
                players.forEach(p => {
                    if(p !== this && p.hp > 0 && !p.isDowned) {
                        if(Math.hypot(p.x - this.x, p.y - this.y) < 60) {
                            beingRevived = true;
                            this.reviveProgress++;
                            if(this.reviveProgress >= 120) { // 2 seconds to revive
                                this.isDowned = false;
                                this.hp = this.maxHp / 2;
                                this.reviveProgress = 0;
                                addFloatingText(this.x, this.y - 40, "被队友救活!", "#00ff00");
                                audio.levelUp();
                            }
                        }
                    }
                });
                if(!beingRevived) this.reviveProgress = Math.max(0, this.reviveProgress - 2);
            }
            return; // Downed/dead player cannot move or shoot
        }

        if(this.isAI) {"""
code = re.sub(player_update_regex, new_player_update, code)


# Player Draw to handle downed state
player_draw_regex = r"if\(this\.hp <= 0\) return;\s*if\(this\.mechTime > 0\) \{"
new_player_draw = """if(this.hp <= 0 && !this.isDowned) return;

        if(this.isDowned) {
            // Draw Tombstone
            ctx.fillStyle = '#666';
            ctx.fillRect(this.x - 15, this.y - 15, 30, 35);
            ctx.beginPath(); ctx.arc(this.x, this.y - 15, 15, Math.PI, 0); ctx.fill();
            ctx.fillStyle = '#000'; ctx.font = '20px Arial'; ctx.fillText('RIP', this.x, this.y + 5);
            
            ctx.fillStyle = '#fff';
            ctx.font = '12px ZCOOL KuaiLe';
            ctx.fillText('P' + this.id + ' 等待救援...', this.x, this.y - 35);
            
            // Draw Revive Progress Bar
            if(this.reviveProgress > 0) {
                ctx.fillStyle = '#222'; ctx.fillRect(this.x - 20, this.y + 25, 40, 6);
                ctx.fillStyle = '#0f0'; ctx.fillRect(this.x - 20, this.y + 25, 40 * (this.reviveProgress/120), 6);
            }
            return;
        }

        if(this.mechTime > 0) {"""
code = re.sub(player_draw_regex, new_player_draw, code)

# Player HUD to draw lives
player_hud_regex = r"// Player ID\s*ctx\.fillStyle = '#fff';\s*ctx\.font = '12px ZCOOL KuaiLe';\s*ctx\.textAlign = 'center';\s*ctx\.fillText\(this\.isAI \? 'P' \+ this\.id \+ ' \(AI托管\)' : 'P' \+ this\.id, this\.x, this\.y - 25\);"
new_player_hud = """// Player ID and Lives
        ctx.fillStyle = '#fff';
        ctx.font = '12px ZCOOL KuaiLe';
        ctx.textAlign = 'center';
        let idText = this.isAI ? 'P' + this.id + ' (AI托管)' : 'P' + this.id;
        ctx.fillText(idText, this.x, this.y - 35);
        ctx.fillStyle = '#ff3333';
        ctx.fillText('❤️'.repeat(this.lives), this.x, this.y - 23);"""
code = re.sub(player_hud_regex, new_player_hud, code)

# Fix gameOver check inside Zombie update (when zombie hits player)
zombie_dmg_regex = r"if\(players\.every\(p => p\.hp <= 0\)\) \{\s*gameOver\(\);\s*\}"
new_zombie_dmg = """if(players.every(p => (p.hp <= 0 && p.lives <= 0) || (p.hp <= 0 && p.isDowned && !players.some(pl => pl.hp > 0)))) {
                    gameOver();
                }"""
code = re.sub(zombie_dmg_regex, new_zombie_dmg, code)

# Also fix the Trap damage game over check
trap_dmg_regex = r"if\(p\.hp <= 0 && players\.every\(pl => pl\.hp <= 0\)\) gameOver\(\);"
new_trap_dmg = """if(players.every(pl => (pl.hp <= 0 && pl.lives <= 0) || (pl.hp <= 0 && pl.isDowned && !players.some(alive => alive.hp > 0)))) gameOver();"""
code = re.sub(trap_dmg_regex, new_trap_dmg, code)

with open("zombie-shooter/game.js", "w") as f:
    f.write(code)
