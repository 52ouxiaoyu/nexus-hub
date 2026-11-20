import re

with open("zombie-shooter/game.js", "r") as f:
    code = f.read()

# 1. Remove this.lives = 3
code = re.sub(r"this\.lives\s*=\s*3;\n?", "", code)

# 2. Remove the old ❤️ drawing block
old_hearts_regex = r"ctx\.fillStyle\s*=\s*'#ff3333';\s*ctx\.fillText\('❤️'\.repeat\(this\.lives\), this\.x, this\.y - 23\);"
code = re.sub(old_hearts_regex, "", code)

# 3. Change ⭐ to ❤️ in the Stars drawing block
new_hearts_regex = r"let stars = '⭐'\.repeat\(this\.hp\);"
code = re.sub(new_hearts_regex, "let stars = '❤️'.repeat(this.hp);", code)

# 4. Change all "⭐" and "星星" floating texts to "❤️" and "生命"
code = code.replace("⭐ 获得星星!", "❤️ 获得生命!")
code = code.replace("⭐ 星星+1", "❤️ 生命+1")

# 5. Fix UI text
code = code.replace("生命 Stars:", "生命:")
code = code.replace("'⭐'.repeat(p.hp)", "'❤️'.repeat(p.hp)")

# 6. Remove this.lives logic in update()
lives_decrement_regex = r"if\(!this\.isDowned && this\.lives > 0\) \{\s*this\.lives--;\s*"
code = re.sub(lives_decrement_regex, "if(!this.isDowned) {\n", code)

with open("zombie-shooter/game.js", "w") as f:
    f.write(code)
