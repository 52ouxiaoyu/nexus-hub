import re

with open('pvz-web/js/HauntedDorm.js', 'r') as f:
    content = f.read()

old_menu = """    // 商店可购清单（阳光 / 孢子两种货币）
    static get MENU() {
        return ['puffshroom', 'peashooter', 'wallnut', 'potatomine', 'spikeweed', 'iceshroom', 'doomshroom'];
    }"""
new_menu = """    // 商店可购清单（阳光 / 孢子两种货币）
    static get MENU() {
        return ['sunshroom', 'puffshroom', 'peashooter', 'potatomine', 'spikeweed', 'iceshroom', 'doomshroom'];
    }"""
content = content.replace(old_menu, new_menu)

with open('pvz-web/js/HauntedDorm.js', 'w') as f:
    f.write(content)
