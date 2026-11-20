const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

const replacements = [
    [/addFloatingText\(CANVAS_W\/2, 100, \`\$\{comboCount\} 连杀 \(COMBO\)!\`, '#ffaa00'\)/g, "addFloatingText(CANVAS_W/2, 100, `${comboCount} 连杀 (COMBO)!`, '#00ccff')"],
    [/addFloatingText\(this\.x, this\.y - 30, \"🔫 火力升级!\", \"#ffff00\"\)/g, "addFloatingText(this.x, this.y - 30, \"🔫 火力升级!\", \"#00ff00\")"],
    [/addFloatingText\(this\.x, this\.y - 50, \`大招: \$\{ultNames\[this\.ultType\]\}!\`, \"#ff00ff\"\)/g, "addFloatingText(this.x, this.y - 50, `大招: ${ultNames[this.ultType]}!`, \"#00ffff\")"],
    [/addFloatingText\(this\.x, this\.y - this\.size - 40, \"!! 召唤子体 !!\", \"#aa00ff\"\)/g, "addFloatingText(this.x, this.y - this.size - 40, \"!! 召唤子体 !!\", \"#ff3300\")"],
    [/addFloatingText\(this\.x, this\.y - this\.size - 40, \"\+ 护甲修复\", \"#00ff00\"\)/g, "addFloatingText(this.x, this.y - this.size - 40, \"+ 护甲修复\", \"#ff0000\")"],
    [/addFloatingText\(this\.x, this\.y - this\.size - 40, \"!! 能量弹幕 !!\", \"#ff00ff\"\)/g, "addFloatingText(this.x, this.y - this.size - 40, \"!! 能量弹幕 !!\", \"#ff0044\")"],
    [/addFloatingText\(p\.x, p\.y - 30, \"🛡️ 能量偏导盾!\", \"#0000ff\"\)/g, "addFloatingText(p.x, p.y - 30, \"🛡️ 能量偏导盾!\", \"#0088ff\")"],
    [/addFloatingText\(p\.x, p\.y - 30, \`🔫 火力升级! \$\{p\.weapon\.name\}\`, \"#aa00ff\"\)/g, "addFloatingText(p.x, p.y - 30, `🔫 火力升级! ${p.weapon.name}`, \"#00bfff\")"],
    [/addFloatingText\(p\.x, p\.y - 30, \"🔴 重力护盾启动!\", \"#ff3300\"\)/g, "addFloatingText(p.x, p.y - 30, \"🔴 重力护盾启动!\", \"#00ffaa\")"],
    [/addFloatingText\(CANVAS_W\/2, CANVAS_H\/2, \"☢️ 战术核打击!\", \"#ff0000\"\)/g, "addFloatingText(CANVAS_W/2, CANVAS_H/2, \"☢️ 战术核打击!\", \"#00ffff\")"],
    [/addFloatingText\(p\.x, p\.y - 30, \"👼 战地救援!\", \"#ffffff\"\)/g, "addFloatingText(p.x, p.y - 30, \"👼 战地救援!\", \"#00ff00\")"],
    [/addFloatingText\(p\.x, p\.y - 30, \"❤️ 护甲\+1\", \"#ff3333\"\)/g, "addFloatingText(p.x, p.y - 30, \"❤️ 护甲+1\", \"#00ff00\")"],
    [/addFloatingText\(p\.x, p\.y - 30, \`⚡ 大招: \$\{ultNames\[p\.ultType\]\} \(Lv\.\$\{p\.ultLevel\}\)\`, \"#ff00ff\"\)/g, "addFloatingText(p.x, p.y - 30, `⚡ 大招: ${ultNames[p.ultType]} (Lv.${p.ultLevel})`, \"#00ccff\")"],
    [/addFloatingText\(camera\.x, camera\.y, \"🚀 轨道打击火力覆盖中！ 🚀\", \"#00ffff\"\)/g, "addFloatingText(camera.x, camera.y, \"🚀 轨道打击火力覆盖中！ 🚀\", \"#ff4400\")"],
    [/addFloatingText\(CANVAS_W\/2, 150, \`🔥 \$\{comboCount\} 连杀终结!\`, '#ffaa00'\)/g, "addFloatingText(CANVAS_W/2, 150, `🔥 ${comboCount} 连杀终结!`, '#00ccff')"],
    [/addFloatingText\(CANVAS_W\/2, CANVAS_H\/2, \"⚠️ 极度危险：首领级变异体出现！ ⚠️\", \"#ff00ff\"\)/g, "addFloatingText(CANVAS_W/2, CANVAS_H/2, \"⚠️ 极度危险：首领级变异体出现！ ⚠️\", \"#ff0000\")"],
    [/addFloatingText\(z1\.x, z1\.y - z1\.size - 10, \`LV\$\{z1\.tier\} 聚合体!\`, \"#ffffff\"\)/g, "addFloatingText(z1.x, z1.y - z1.size - 10, `LV${z1.tier} 聚合体!`, \"#ff3300\")"],
    [/addFloatingText\(camera\.x, camera\.y, \"🌟 斩杀目标! 🌟\", \"#ffff00\"\)/g, "addFloatingText(camera.x, camera.y, \"🌟 斩杀目标! 🌟\", \"#00ff00\")"],
    [/addFloatingText\(CANVAS_W\/2, 100, \`🔥 \$\{comboCount\} 连杀 \(COMBO\)!\`, '#ffaa00'\)/g, "addFloatingText(CANVAS_W/2, 100, `🔥 ${comboCount} 连杀 (COMBO)!`, '#00ccff')"],
    [/addFloatingText\(z\.x, z\.y, \`\+\$\{z\.scoreVal\} BOSS击杀!\`, '#ff00ff'\)/g, "addFloatingText(z.x, z.y, `+${z.scoreVal} BOSS击杀!`, '#00bfff')"],
    [/addFloatingText\(z\.x, z\.y, \`\+\$\{z\.scoreVal\}\`, '#0f0'\)/g, "addFloatingText(z.x, z.y, `+${z.scoreVal}`, '#00ff00')"]
];

replacements.forEach(rep => {
    code = code.replace(rep[0], rep[1]);
});

fs.writeFileSync('game.js', code);
