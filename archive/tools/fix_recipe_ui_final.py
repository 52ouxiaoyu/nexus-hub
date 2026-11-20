import re

with open('pvz-web/js/GameLoop.js', 'r') as f:
    content = f.read()

# Revert overTransforms to match Plant.js exactly (except Sporemine which uses armed state)
content = content.replace("overTransform: 'translate(0px, -15px) scale(1.0)'", "overTransform: 'translate(0px, -20px) scale(1.0)'") # Peaflower
content = content.replace("overTransform: 'translate(5px, -10px) scale(1.0)'", "overTransform: 'translate(5px, -15px) scale(1.0)'") # Nutshooter
content = content.replace("overTransform: 'translate(0px, -20px) scale(0.9)'", "overTransform: 'translate(0px, -45px) scale(0.9)'") # Sporemine
content = content.replace("overTransform: 'translate(0px, -15px) scale(0.9)'", "overTransform: 'translate(0px, -25px) scale(0.9)'") # Spikynut

# Rewrite the HTML rendering block
old_html = """                    <div style="position: relative; width: 60px; height: 60px;">
                        ${r.base ? 
                          `<img src="${r.base}" style="position: absolute; left: 0; top: 0; height: 50px;">
                           <img src="${r.over}" style="position: absolute; left: 0; top: 0; height: 50px; transform: ${r.overTransform}; transform-origin: center center; ${r.overClip ? `clip-path: ${r.overClip}; -webkit-clip-path: ${r.overClip};` : ''}">` 
                          : `<img src="${r.img}" style="height: 50px; filter: ${r.filter || 'none'}; object-fit: contain;">`
                        }
                    </div>"""

new_html = """                    <div style="position: relative; width: 60px; height: 60px; display: flex; justify-content: center; align-items: center;">
                        ${r.base ? 
                          `<div style="position: relative; transform: scale(0.5); transform-origin: center center;">
                              <img src="${r.base}" style="display: block;">
                              <img src="${r.over}" style="position: absolute; left: 0; top: 0; transform: ${r.overTransform}; transform-origin: center center; ${r.overClip ? `clip-path: ${r.overClip}; -webkit-clip-path: ${r.overClip};` : ''}">
                           </div>` 
                          : `<img src="${r.img}" style="height: 50px; filter: ${r.filter || 'none'}; object-fit: contain;">`
                        }
                    </div>"""

content = content.replace(old_html, new_html)

with open('pvz-web/js/GameLoop.js', 'w') as f:
    f.write(content)

