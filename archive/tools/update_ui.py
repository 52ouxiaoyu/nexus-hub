import re

with open('kingdom-rush/js/ui.js', 'r') as f:
    content = f.read()

replacements = {
    "'防御塔'": "'防御塔 Towers'",
    "'金币: ": "'金币 Gold: ",
    "'生命: ": "'生命 Lives: ",
    "'波次: ": "'波次 Wave: ",
    "'等级: ": "'等级 Lv: ",
    "'伤害: ": "'伤害 Dmg: ",
    "'范围: ": "'范围 Rng: ",
    "'升级 $": "'升级 Upgrade $",
    "'出售 $": "'出售 Sell $",
    "'开始游戏'": "'开始游戏 START'",
    "'游戏说明'": "'游戏说明 HOW TO'",
    "'退出游戏'": "'退出游戏 QUIT'",
    "'返回'": "'返回 BACK'",
    "'选择关卡'": "'选择关卡 SELECT LEVEL'",
    "'游戏结束'": "'游戏结束 GAME OVER'",
    "坚持到第 ${wave} 波": "坚持到第 ${wave} 波 Survived ${wave} waves",
    "'重新开始'": "'重新开始 RESTART'",
    "'返回菜单'": "'返回菜单 MENU'",
    "'胜利!'": "'胜利! VICTORY!'",
    "成功防守 ${wave} 波攻击": "成功防守 ${wave} 波攻击 Defended ${wave} waves",
    "'下一关'": "'下一关 NEXT'",
    "'暂停'": "'暂停 PAUSED'",
    "'继续'": "'继续 RESUME'"
}

for k, v in replacements.items():
    content = content.replace(k, v)

with open('kingdom-rush/js/ui.js', 'w') as f:
    f.write(content)
