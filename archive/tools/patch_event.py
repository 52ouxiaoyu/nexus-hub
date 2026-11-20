import re

with open('pvz-web/js/managers/EventManager.js', 'r') as f:
    content = f.read()

# find and remove the stimulant event
pattern = r"\s*\{\s*msg:\s*'💪\s*兴奋剂：植物强壮！'[^}]+}},"
content = re.sub(pattern, "", content)

with open('pvz-web/js/managers/EventManager.js', 'w') as f:
    f.write(content)
