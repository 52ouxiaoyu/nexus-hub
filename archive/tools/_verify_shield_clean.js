// 验证南瓜壳素材底部中央黑斑已清除(不再有近黑像素团)
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const repo = path.resolve(__dirname);
const py = '/Users/clawbox/.workbuddy/binaries/python/envs/default/bin/python';
const tmpPy = path.join(repo, '_verify_shield_clean_tmp.py');
const pySrc = [
    'from PIL import Image',
    'import sys',
    'files = sys.argv[1:]',
    'allok = True',
    'for f in files:',
    '    img = Image.open(f).convert("RGBA")',
    '    W,H = img.size',
    '    px = img.load()',
    '    x0,x1 = int(W*0.30), int(W*0.62)',
    '    y0 = int(H*0.60)',
    '    dark = 0',
    '    for y in range(y0, H):',
    '        for x in range(x0, x1+1):',
    '            a = px[x,y][3]',
    '            if a < 40: continue',
    '            r,g,b,_ = px[x,y]',
    '            lum = 0.3*r+0.59*g+0.11*b',
    '            if lum < 80: dark += 1',
    '    ok = dark < 30',
    '    allok = allok and ok',
    '    print(("PASS" if ok else "FAIL") + " " + f + ": dark_px=" + str(dark))',
    'sys.exit(0 if allok else 1)'
].join('\n');
fs.writeFileSync(tmpPy, pySrc);
try {
    const full = path.join(repo, 'pvz-web/assets/images/Plants/PumpkinHead/shield_full.png');
    const mid = path.join(repo, 'pvz-web/assets/images/Plants/PumpkinHead/shield_mid.png');
    const out = execSync(`"${py}" "${tmpPy}" "${full}" "${mid}"`, { encoding: 'utf8' });
    console.log(out.trim());
    console.log('ALL PASS');
} catch (e) {
    console.log((e.stdout ? e.stdout.trim() : ''));
    console.log('FAILED');
    process.exitCode = 1;
} finally {
    fs.unlinkSync(tmpPy);
}
