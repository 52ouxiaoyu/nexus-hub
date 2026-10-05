import re

with open('js/main.js', 'r') as f:
    content = f.read()

# Replace everything from // ========================== down to the end of the class
new_tail = """
    }
}

window.addEventListener('load', () => {
    new Game();
});
"""

content = re.sub(r'\s*// ==========================\s*// HUD.*?window\.addEventListener', new_tail + "\nwindow.addEventListener", content, flags=re.DOTALL)

with open('js/main.js', 'w') as f:
    f.write(content)
