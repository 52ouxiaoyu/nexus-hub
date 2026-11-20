import re

with open("zombie-shooter/game.js", "r") as f:
    code = f.read()

old_draw = """    // Clear background
    if(activeEvent === 'bloodmoon') {
        ctx.fillStyle = '#300';
    } else {
        ctx.fillStyle = '#111';
    }
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Draw Grid
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    for(let i=0; i<CANVAS_W; i+=40) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,CANVAS_H); ctx.stroke(); }
    for(let i=0; i<CANVAS_H; i+=40) { ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(CANVAS_W,i); ctx.stroke(); }
    
    // Draw Blood Stains
    ctx.drawImage(bgCanvas, 0, 0);

    particles.forEach(p => p.draw(ctx));"""

new_draw = """    // Clear background
    if(activeEvent === 'bloodmoon') {
        ctx.fillStyle = '#300';
    } else {
        ctx.fillStyle = '#111';
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply Camera Translation
    ctx.translate(canvas.width/2 - camera.x, canvas.height/2 - camera.y);

    // Draw Grid (Infinite scrolling floor)
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    let startX = camera.x - canvas.width/2;
    let startY = camera.y - canvas.height/2;
    let offsetX = startX % 40;
    let offsetY = startY % 40;
    for(let i = -offsetX; i < canvas.width + 40; i+=40) { 
        ctx.beginPath(); ctx.moveTo(startX + i, startY); ctx.lineTo(startX + i, startY + canvas.height); ctx.stroke(); 
    }
    for(let i = -offsetY; i < canvas.height + 40; i+=40) { 
        ctx.beginPath(); ctx.moveTo(startX, startY + i); ctx.lineTo(startX + canvas.width, startY + i); ctx.stroke(); 
    }
    
    // Draw Buildings (This was missing!)
    buildings.forEach(b => b.draw(ctx));

    particles.forEach(p => p.draw(ctx));"""

code = code.replace(old_draw, new_draw)

with open("zombie-shooter/game.js", "w") as f:
    f.write(code)
