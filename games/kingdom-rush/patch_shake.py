import re

with open('js/main.js', 'r') as f:
    content = f.read()

shake_code = """
                this.castleHp--;
                const hpBox = document.querySelector('.king-hp-box');
                if (hpBox) {
                    hpBox.classList.remove('shake');
                    void hpBox.offsetWidth; // trigger reflow
                    hpBox.classList.add('shake');
                }
"""

content = content.replace("this.castleHp--;", shake_code)

# Add danger class if HP <= 3
hud_code_old = """        // Update King HP
        const hpPercent = (this.castleHp / this.maxCastleHp) * 100;
        document.getElementById('king-hp-fill').style.width = hpPercent + '%';
        document.getElementById('king-hp-text').innerText = this.castleHp + '/' + this.maxCastleHp;"""

hud_code_new = """        // Update King HP
        const hpPercent = (this.castleHp / this.maxCastleHp) * 100;
        const fill = document.getElementById('king-hp-fill');
        const container = document.querySelector('.hp-bar-container');
        fill.style.width = hpPercent + '%';
        document.getElementById('king-hp-text').innerText = this.castleHp + '/' + this.maxCastleHp;
        
        if (this.castleHp <= 3) {
            container.classList.add('danger');
            fill.classList.add('danger');
        } else {
            container.classList.remove('danger');
            fill.classList.remove('danger');
        }"""
        
content = content.replace(hud_code_old, hud_code_new)

with open('js/main.js', 'w') as f:
    f.write(content)
