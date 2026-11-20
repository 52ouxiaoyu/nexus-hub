import re

with open('pvz-web/js/GameLoop.js', 'r') as f:
    content = f.read()

content = content.replace("document.getElementById('glove-bank').style.display = 'block';", "document.getElementById('glove-bank').style.display = 'flex';")
content = content.replace("document.getElementById('recipe-book-btn').style.display = 'block';", "document.getElementById('recipe-book-btn').style.display = 'flex';")

with open('pvz-web/js/GameLoop.js', 'w') as f:
    f.write(content)
