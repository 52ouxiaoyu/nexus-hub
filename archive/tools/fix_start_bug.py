import re

with open("zombie-shooter/game.js", "r") as f:
    code = f.read()

# Replace the null reference in startGame
old_start = "document.getElementById('current-weapon').textContent = players[0].weapons[0].name;"
new_start = """document.getElementById('p1-weapon').textContent = players[0].weapons[0].name;
    document.getElementById('p2-weapon').textContent = players[1].weapons[0].name;"""

code = code.replace(old_start, new_start)

# Let's also make sure there are no other references to 'current-weapon'
code = code.replace("document.getElementById('current-weapon')", "document.getElementById('p1-weapon')")

with open("zombie-shooter/game.js", "w") as f:
    f.write(code)
