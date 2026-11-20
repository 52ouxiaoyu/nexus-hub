with open('index.html', 'r') as f:
    html = f.read()

# Replace confusing icons/labels
html = html.replace('<span class="icon">🏰</span>', '<span class="icon">🏰 基地血量</span>')
html = html.replace('<span class="icon">🪙</span>', '<span class="icon">💰 金币</span>')

with open('index.html', 'w') as f:
    f.write(html)
