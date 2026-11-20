import re

with open('pvz-web/index.html', 'r') as f:
    content = f.read()

old_modal = """        <!-- v3.86.0 猛鬼宿舍：阵营选择（与难度选择同款面板样式；进入方式与其他模式统一） -->
        <div id="dorm-role-modal" style="display:none; position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.78); z-index:2400; align-items:center; justify-content:center; flex-direction:column;">
            <div class="diff-panel">
                <div class="diff-title">守屋大作战<span>HOUSE GUARD · 阵营选择</span></div>
                <div class="diff-sub">大地图随机房间 · 浇水种植物 · 僵尸逐波来袭</div>
                <div class="diff-row">
                    <button id="dorm-plant" class="diff-btn diff-easy">
                        <span class="diff-name">植物阵营</span>
                        <span class="diff-en">PLANT</span>
                        <span class="diff-desc">守住房间 · 浇水攒阳光<br>门板+植物造防线 · 挺过 8 波</span>
                    </button>
                    <button id="dorm-zombie" class="diff-btn diff-hell" style="filter: grayscale(1) brightness(0.75); cursor: not-allowed;">
                        <span class="diff-name">僵尸阵营</span>
                        <span class="diff-en">ZOMBIE</span>
                        <span class="diff-desc">扮演僵尸抓人<br>（开发中 · 敬请期待）</span>
                    </button>
                </div>
                <div class="diff-foot">
                    <button id="dorm-back">返回主菜单</button>
                </div>
            </div>
        </div>"""

new_modal = """        <!-- v3.94.7 猛鬼宿舍：皮肤选择弹窗 -->
        <div id="dorm-role-modal" style="display:none; position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.78); z-index:2400; align-items:center; justify-content:center; flex-direction:column;">
            <div class="diff-panel" style="width: auto;">
                <div class="diff-title">守屋大作战<span>HOUSE GUARD · 选择你的专属皮肤</span></div>
                <div class="diff-sub">每个皮肤都有独特的【M键】专属技能！</div>
                <div class="diff-row" style="gap: 12px;">
                    <button class="diff-btn diff-easy dorm-skin-btn" data-role="sunflower" style="width:140px;">
                        <img src="assets/images/Plants/SunFlower/0.gif" style="height:50px; margin-bottom:8px;">
                        <span class="diff-name" style="font-size:20px;">向日葵</span>
                        <span class="diff-desc">阳光产量翻倍</span>
                    </button>
                    <button class="diff-btn diff-easy dorm-skin-btn" data-role="peashooter" style="width:140px;">
                        <img src="assets/images/Plants/Peashooter/0.gif" style="height:50px; margin-bottom:8px;">
                        <span class="diff-name" style="font-size:20px;">豌豆射手</span>
                        <span class="diff-desc">攻击植物伤害翻倍</span>
                    </button>
                    <button class="diff-btn diff-easy dorm-skin-btn" data-role="wallnut" style="width:140px;">
                        <img src="assets/images/Plants/WallNut/0.gif" style="height:50px; margin-bottom:8px;">
                        <span class="diff-name" style="font-size:20px;">坚果</span>
                        <span class="diff-desc">免费升级一次门板</span>
                    </button>
                    <button class="diff-btn diff-easy dorm-skin-btn" data-role="chomper" style="width:140px;">
                        <img src="assets/images/Plants/Chomper/0.gif" style="height:50px; margin-bottom:8px;">
                        <span class="diff-name" style="font-size:20px;">大嘴花</span>
                        <span class="diff-desc">强制赶跑僵尸一次</span>
                    </button>
                    <button class="diff-btn diff-easy dorm-skin-btn" data-role="squash" style="width:140px;">
                        <img src="assets/images/Plants/Squash/0.gif" style="height:50px; margin-bottom:8px;">
                        <span class="diff-name" style="font-size:20px;">倭瓜</span>
                        <span class="diff-desc">半血以上砸掉一半血</span>
                    </button>
                </div>
                <div class="diff-foot">
                    <button id="dorm-back">返回主菜单</button>
                </div>
            </div>
        </div>"""
content = content.replace(old_modal, new_modal)

old_bind = """        // ===== v3.86.0 猛鬼宿舍：与其他模式统一的进入方式（JS 绑定 + 同款面板弹窗）=====
        (function bindDorm() {
            const btn = document.getElementById('btn-dorm');
            const modal = document.getElementById('dorm-role-modal');
            if (btn && modal) btn.addEventListener('click', () => { modal.style.display = 'flex'; });
            const bp = document.getElementById('dorm-plant');
            if (bp) bp.addEventListener('click', () => { location.href = 'haunted-dorm.html?role=plant'; });
            const back = document.getElementById('dorm-back');
            if (back) back.addEventListener('click', () => { modal.style.display = 'none'; });
            // 僵尸阵营（dorm-zombie）开发中：置灰不可点
        })();"""

new_bind = """        // ===== v3.86.0 猛鬼宿舍：与其他模式统一的进入方式（JS 绑定 + 同款面板弹窗）=====
        (function bindDorm() {
            const btn = document.getElementById('btn-dorm');
            const modal = document.getElementById('dorm-role-modal');
            if (btn && modal) btn.addEventListener('click', () => { modal.style.display = 'flex'; });
            const skinBtns = document.querySelectorAll('.dorm-skin-btn');
            skinBtns.forEach(sb => {
                sb.addEventListener('click', () => {
                    location.href = 'haunted-dorm.html?role=' + sb.getAttribute('data-role');
                });
            });
            const back = document.getElementById('dorm-back');
            if (back) back.addEventListener('click', () => { modal.style.display = 'none'; });
        })();"""
content = content.replace(old_bind, new_bind)

with open('pvz-web/index.html', 'w') as f:
    f.write(content)
