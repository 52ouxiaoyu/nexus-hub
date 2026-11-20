import re

with open('pvz-web/js/managers/EventManager.js', 'r') as f:
    content = f.read()

old_event = """            { msg: '🍄 孢子：天降蘑菇！', color: '#aa44aa', exec: g => {
                const r = Math.floor(Math.random()*g.board.rows); const c = Math.floor(Math.random()*g.board.cols);
                const x = g.board.offsetX + c * g.board.cellWidth + g.board.cellWidth/2;
                const y = g.board.offsetY + r * g.board.cellHeight + g.board.cellHeight/2;
                if(!g.entities.find(e => e instanceof Plant && e.row===r && Math.abs(e.x-x)<20)) {
                    g.entities.push(new Plant(g, x, y, r, c, 'puffshroom'));
                }
            }},"""

new_event = """            { msg: '🍄 孢子：天降蘑菇！', color: '#aa44aa', exec: g => {
                const r = Math.floor(Math.random()*g.board.rows); const c = Math.floor(Math.random()*g.board.cols);
                if (g.board.canPlant(r, c)) {
                    const p = new Plant(g, 'puffshroom');
                    g.board.addPlant(p, r, c);
                }
            }},"""

content = content.replace(old_event, new_event)

with open('pvz-web/js/managers/EventManager.js', 'w') as f:
    f.write(content)

