import re

with open('pvz-web/index.html', 'r') as f:
    content = f.read()

# Replace the messy UI layer with a clean one
old_ui = """                <div id="seed-bank"></div>
                        <div id="shovel-bank">
            <img src="assets/images/interface/Shovel.png" id="shovel" title="铲子">
        </div>
        <div id="glove-bank" style="position: absolute; top: 10px; right: 100px; width: 60px; height: 60px; background: rgba(0,0,0,0.5); border: 2px solid #a65; border-radius: 10px; display: none; cursor: pointer; text-align: center;">
            <div style="font-size: 30px; line-height: 60px;">🧤</div>
        </div>
        <div id="recipe-book-btn" style="position: absolute; top: 80px; right: 10px; padding: 10px; background: rgba(0,0,0,0.7); color: white; border: 2px solid #a65; border-radius: 10px; display: none; cursor: pointer; font-weight: bold; z-index: 2000;">
            融合配方
        </div>
        
        <!-- Recipe Modal -->
        <div id="recipe-modal" style="display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 400px; background: #c69c6d; border: 4px solid #4a3018; border-radius: 10px; z-index: 3000; padding: 20px; box-shadow: 0 0 20px #000;">
            <h2 style="text-align: center; color: #fff; text-shadow: 2px 2px 0 #000; margin-top: 0;">融合配方大全</h2>
            <ul id="recipe-list" style="list-style: none; padding: 0; max-height: 300px; overflow-y: auto; background: #fff; border: 2px inset #000; padding: 10px;">
            </ul>
            <div style="text-align: center; margin-top: 15px;">
                <button id="close-recipe" style="padding: 5px 20px; font-weight: bold; cursor: pointer;">关闭</button>
            </div>
        </div>
                </div>"""

new_ui = """                <div id="seed-bank"></div>
                
                <div id="shovel-bank">
                    <img src="assets/images/interface/Shovel.png" id="shovel" title="铲子">
                </div>
                
                <div id="glove-bank" style="width: 70px; height: 72px; margin-left: 10px; background: rgba(0,0,0,0.5); border: 2px solid #a65; border-radius: 10px; display: none; cursor: pointer; justify-content: center; align-items: center; box-sizing: border-box;">
                    <div style="font-size: 36px; line-height: 72px;">🧤</div>
                </div>
                
                <div id="recipe-book-btn" style="margin-left: 10px; padding: 0 15px; background: rgba(0,0,0,0.7); color: white; border: 2px solid #a65; border-radius: 10px; display: none; cursor: pointer; font-weight: bold; z-index: 2000; align-items: center; justify-content: center; height: 34px; margin-top: 18px;">
                    融合图鉴
                </div>"""

content = content.replace(old_ui, new_ui)

# We removed the recipe-modal from inside top-bar, let's put it outside top-bar!
modal_html = """        <!-- Recipe Modal -->
        <div id="recipe-modal" style="display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 400px; background: #c69c6d; border: 4px solid #4a3018; border-radius: 10px; z-index: 3000; padding: 20px; box-shadow: 0 0 20px #000; pointer-events: auto;">
            <h2 style="text-align: center; color: #fff; text-shadow: 2px 2px 0 #000; margin-top: 0;">融合配方大全</h2>
            <ul id="recipe-list" style="list-style: none; padding: 0; max-height: 300px; overflow-y: auto; background: #fff; border: 2px inset #000; padding: 10px; color: #000;">
            </ul>
            <div style="text-align: center; margin-top: 15px;">
                <button id="close-recipe" style="padding: 5px 20px; font-weight: bold; cursor: pointer;">关闭</button>
            </div>
        </div>
"""

# Append modal_html just before closing ui-layer
content = content.replace('            <div id="drag-ghost" style="display: none;"></div>', modal_html + '            <div id="drag-ghost" style="display: none;"></div>')

# Fix top-bar width and wrap
content = content.replace('<div id="top-bar">', '<div id="top-bar" style="width: 100%; display: flex; flex-wrap: nowrap; align-items: flex-start;">')

with open('pvz-web/index.html', 'w') as f:
    f.write(content)
