with open('index.html', 'r') as f:
    html = f.read()

# Replace the start of game-container contents
old_start = """    <div id="game-container">
        <canvas id="gameCanvas" width="960" height="640"></canvas>
        <div id="grid-overlay" style="width: 960px; height: 640px;"></div>

        <div id="ui-layer">"""

new_start = """    <div id="game-container">
        <div id="game-wrapper" style="position: relative; width: 960px; height: 640px;">
            <canvas id="gameCanvas" width="960" height="640"></canvas>
            <div id="grid-overlay" style="position: absolute; top:0; left:0; width: 960px; height: 640px;"></div>

            <div id="ui-layer" style="position: absolute; top:0; left:0; width: 100%; height: 100%;">"""

html = html.replace(old_start, new_start)

# Add closing div for game-wrapper right before closing game-container
old_end = """        </div>
    </div>
    
    <script src="js/audio.js"></script>"""

new_end = """        </div>
        </div>
    </div>
    
    <script src="js/audio.js"></script>"""

html = html.replace(old_end, new_end)

with open('index.html', 'w') as f:
    f.write(html)
