import re

with open("zombie-shooter/index.html", "r") as f:
    html = f.read()

center_box_regex = r'<div class="label" style="color:#00ff66;">TEAM SCORE</div>\s*<div id="score" style="font-size:32px; color:#00ff66; text-shadow: 0 0 10px #00ff66;">0</div>'
new_center = """<div class="label" style="color:#00ff66;">TEAM SCORE</div>
                <div id="score" style="font-size:32px; color:#00ff66; text-shadow: 0 0 10px #00ff66;">0</div>
                <div style="font-size: 12px; color: #888;">HIGHSCORE: <span id="high-score">0</span></div>"""

html = re.sub(center_box_regex, new_center, html)

with open("zombie-shooter/index.html", "w") as f:
    f.write(html)
