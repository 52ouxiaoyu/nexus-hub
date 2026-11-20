import re

with open('pvz-web/index.html', 'r') as f:
    content = f.read()

old_btn = """                <div id="recipe-book-btn" style="margin-left: 10px; padding: 0 15px; background: rgba(0,0,0,0.7); color: white; border: 2px solid #a65; border-radius: 10px; display: none; cursor: pointer; font-weight: bold; z-index: 2000; align-items: center; justify-content: center; height: 34px; margin-top: 18px;">
                    融合图鉴
                </div>"""

new_btn = """                <div id="recipe-book-btn" style="width: 70px; height: 72px; margin-left: 10px; background: rgba(0,0,0,0.5); border: 2px solid #a65; border-radius: 10px; display: none; cursor: pointer; justify-content: center; align-items: center; box-sizing: border-box;" title="融合图鉴">
                    <div style="font-size: 36px; line-height: 72px;">📖</div>
                </div>"""

content = content.replace(old_btn, new_btn)

# Make modal wider to fit images
content = content.replace('width: 400px;', 'width: 500px;')

with open('pvz-web/index.html', 'w') as f:
    f.write(content)

with open('pvz-web/js/GameLoop.js', 'r') as f:
    content = f.read()

old_list = """        const list = document.getElementById('recipe-list');
        list.innerHTML = '';
        recipes.forEach(r => {
            let li = document.createElement('li');
            li.style.borderBottom = '1px dashed #ccc';
            li.style.padding = '5px 0';
            li.innerText = `${this.getPlantName(r.a)} + ${this.getPlantName(r.b)} = ${r.result}`;
            list.appendChild(li);
        });"""

new_list = """        const list = document.getElementById('recipe-list');
        list.innerHTML = '';
        recipes.forEach(r => {
            let li = document.createElement('li');
            li.style.borderBottom = '1px dashed #ccc';
            li.style.padding = '10px 0';
            li.style.display = 'flex';
            li.style.alignItems = 'center';
            li.style.justifyContent = 'space-between';
            
            const getImg = (t) => {
                const s = this.seeds.find(x => x.type === t);
                if (s) return s.img;
                if (t === 'chomper') return 'assets/images/Plants/Chomper/Chomper.gif';
                return '';
            };
            
            li.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px; width: 40%;">
                    <img src="${getImg(r.a)}" style="height: 50px;"> 
                    <span style="font-weight: bold; font-size: 20px;">+</span> 
                    <img src="${getImg(r.b)}" style="height: 50px;">
                </div>
                <div style="width: 10%; text-align: center; font-size: 24px; font-weight: bold;">=</div>
                <div style="width: 50%; text-align: right; font-weight: bold; color: #822; font-size: 16px;">
                    ${r.result}
                </div>
            `;
            list.appendChild(li);
        });"""

content = content.replace(old_list, new_list)

with open('pvz-web/js/GameLoop.js', 'w') as f:
    f.write(content)
