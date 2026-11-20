import re

with open('css/style.css', 'r') as f:
    content = f.read()

# Fix HUD panel positioning
hud_panel_old = """#hud-panel {
    background: transparent; pointer-events: none;
    padding: 20px; box-sizing: border-box;
}"""

hud_panel_new = """#hud-panel {
    background: transparent; pointer-events: none;
    padding: 20px; box-sizing: border-box;
    justify-content: flex-start; /* FIX: Don't center vertically */
}"""

content = content.replace(hud_panel_old, hud_panel_new)

with open('css/style.css', 'w') as f:
    f.write(content)

