import re

with open("zombie-shooter/game.js", "r") as f:
    code = f.read()

# Boss
code = re.sub(r"this\.speed = 1\.5; this\.hp = 1000 \+ survivalTime\*10; this\.color = '#ff00ff';", "this.speed = 0.8; this.hp = 1000 + survivalTime*10; this.color = '#ff00ff';", code)

# Fast
code = re.sub(r"this\.speed = 2\.5 \+ Math\.random\(\) \+ \(survivalTime/60\); this\.hp = 10 \+ survivalTime/2; this\.color = '#ffff00';", "this.speed = 1.5 + Math.random()*0.5 + (survivalTime/180); this.hp = 10 + survivalTime/2; this.color = '#ffff00';", code)

# Tank
code = re.sub(r"this\.speed = 0\.5 \+ Math\.random\(\)\*0\.5 \+ \(survivalTime/120\); this\.hp = 100 \+ survivalTime\*3; this\.color = '#4444ff';", "this.speed = 0.3 + Math.random()*0.3 + (survivalTime/300); this.hp = 100 + survivalTime*3; this.color = '#4444ff';", code)

# Exploder
code = re.sub(r"this\.speed = 1\.2 \+ Math\.random\(\) \+ \(survivalTime/60\); this\.hp = 15 \+ survivalTime; this\.color = '#ff5500';", "this.speed = 0.8 + Math.random()*0.5 + (survivalTime/180); this.hp = 15 + survivalTime; this.color = '#ff5500';", code)

# Normal
code = re.sub(r"this\.speed = 1 \+ Math\.random\(\)\*1\.5 \+ \(survivalTime/60\); this\.hp = 20 \+ survivalTime; this\.color = '#00ff00';", "this.speed = 0.6 + Math.random()*0.6 + (survivalTime/180); this.hp = 20 + survivalTime; this.color = '#00ff00';", code)

with open("zombie-shooter/game.js", "w") as f:
    f.write(code)
