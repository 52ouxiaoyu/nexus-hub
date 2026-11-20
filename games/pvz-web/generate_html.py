html = "<html><body style='background-color: #333;'><div style='display: flex; flex-wrap: wrap;'>"
plants = ['Squash', 'TallNut', 'DoomShroom', 'GatlingPea', 'Threepeater', 'FumeShroom']
for p in plants:
    html += f"<div style='margin: 10px;'><h3 style='color: white;'>{p} (100x60)</h3>"
    html += f"<div style='width: 100px; height: 60px; background-image: url(\"assets/images/Card/Plants/{p}.png\"); background-position: 0 0; background-size: 100px 120px; border: 1px solid red;'></div>"
    html += f"<h3 style='color: white;'>{p} (100x120)</h3>"
    html += f"<div style='width: 100px; height: 120px; background-image: url(\"assets/images/Card/Plants/{p}.png\"); border: 1px solid blue;'></div>"
    html += "</div>"
html += "</div></body></html>"
with open("test.html", "w") as f:
    f.write(html)
