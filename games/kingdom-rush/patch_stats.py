import re

with open('js/main.js', 'r') as f:
    content = f.read()

card_html_old = """                card.innerHTML = `
                    <div class="p-name" style="color:${hero.color}">${hero.name}</div>
                    <div class="p-stat"><span>💰金币</span> <span class="p-gold" id="p${i}-gold">${hero.gold}</span></div>
                    <div class="p-stat"><span>🏆得分</span> <span id="p${i}-score">${hero.score}</span></div>
                `;"""

card_html_new = """                card.innerHTML = `
                    <div class="p-name" style="color:${hero.color}">${hero.name}</div>
                    <div class="p-stat"><span>💰金币</span> <span class="p-gold" id="p${i}-gold">${hero.gold}</span></div>
                    <div class="p-stat"><span>🏆得分</span> <span id="p${i}-score">${hero.score}</span></div>
                    <div style="margin-top:8px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.2); font-size:14px; color:#aaa; display:flex; justify-content:space-between;">
                        <span>⚔️<span id="p${i}-dmg">${hero.damage}</span></span>
                        <span>⚡<span id="p${i}-spd">${(1000/hero.fireRate).toFixed(1)}</span>/s</span>
                        <span>🏹<span id="p${i}-arr">${hero.arrows}</span></span>
                    </div>
                `;"""
content = content.replace(card_html_old, card_html_new)

update_stats_old = """            for (let i = 0; i < this.numPlayers; i++) {
                document.getElementById(`p${i}-gold`).innerText = this.heroes[i].gold;
                document.getElementById(`p${i}-score`).innerText = this.heroes[i].score;
            }"""

update_stats_new = """            for (let i = 0; i < this.numPlayers; i++) {
                document.getElementById(`p${i}-gold`).innerText = this.heroes[i].gold;
                document.getElementById(`p${i}-score`).innerText = this.heroes[i].score;
                document.getElementById(`p${i}-dmg`).innerText = this.heroes[i].damage;
                document.getElementById(`p${i}-spd`).innerText = (1000/this.heroes[i].fireRate).toFixed(1);
                document.getElementById(`p${i}-arr`).innerText = this.heroes[i].arrows;
            }"""
content = content.replace(update_stats_old, update_stats_new)

with open('js/main.js', 'w') as f:
    f.write(content)
