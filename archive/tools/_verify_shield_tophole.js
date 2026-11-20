const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const repo = path.resolve(__dirname);
const py = '/Users/clawbox/.workbuddy/binaries/python/envs/default/bin/python';
const tmpPy = path.join(repo, '_verify_shield_tophole_tmp.py');
const pySrc = [
    'from PIL import Image',
    'import sys',
    'files = sys.argv[1:]',
    'allok = True',
    'for f in files:',
    '    img = Image.open(f).convert("RGBA")',
    '    W,H = img.size',
    '    px = img.load()',
    '    # 顶部椭圆洞区(壳顶部 y2-y21, 中央 x30-x64): 检测灰色不透明像素数',
    '    # 修复后应几乎为 0(<5)',
    '    gray_dark = 0',
    '    for y in range(2, 22):',
    '        for x in range(28, 67):',
    '            a = px[x,y][3]',
    '            if a < 30: continue',
    '            r,g,b,_ = px[x,y]',
    '            gray = abs(r-g)<20 and abs(g-b)<20 and abs(r-b)<25 and max(r,g,b) < 110',
    '            if gray: gray_dark += 1',
    '    ok = gray_dark < 5',
    '    allok = allok and ok',
    '    print(("PASS" if ok else "FAIL") + " " + f + ": gray_dark_top=" + str(gray_dark))',
    'sys.exit(0 if allok else 1)'
].join('\n');
fs.writeFileSync(tmpPy, pySrc);
try {
    const files = ['shield_full.png','shield_mid.png','shield_bad.png']
        .map(n => path.join(repo, 'pvz-web/assets/images/Plants/PumpkinHead/'+n))
        .map(p => `"${p}"`).join(' ');
    const out = execSync(`"${py}" "${tmpPy}" ${files}`, { encoding: 'utf8' });
    console.log(out.trim());
    console.log('ALL PASS');
} catch (e) {
    console.log((e.stdout ? e.stdout.trim() : ''));
    console.log('FAILED');
    process.exitCode = 1;
} finally {
    fs.unlinkSync(tmpPy);
}
