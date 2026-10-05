import urllib.request
import urllib.parse
import json
import re
import os

os.makedirs('pvz-web/assets/images/Plants/Fusions', exist_ok=True)

def search_ddg_image(query):
    print(f"Searching for {query}...")
    url = "https://html.duckduckgo.com/html/?q=" + urllib.parse.quote(query)
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        html = urllib.request.urlopen(req).read().decode('utf-8')
        # In duckduckgo html, image links are often embedded or we can use another method
        # Let's search Bing images instead, it's easier to scrape sometimes
    except Exception as e:
        print("Error:", e)

# Actually DuckDuckGo requires a token for images. Let's try searching bilibili wiki via API or just Bing.
def search_bing_image(query):
    url = "https://www.bing.com/images/search?q=" + urllib.parse.quote(query)
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    try:
        html = urllib.request.urlopen(req).read().decode('utf-8')
        # Find murl":"http..."
        urls = re.findall(r'murl&quot;:&quot;(.*?)&quot;', html)
        if not urls:
            urls = re.findall(r'murl":"(.*?)"', html)
        if urls:
            return urls[0]
    except Exception as e:
        print("Error:", e)
    return None

plants = {
    'peaflower': '植物大战僵尸融合版 豌豆向日葵',
    'nutshooter': '植物大战僵尸融合版 豌豆坚果',
    'frostbomb': '植物大战僵尸融合版 冰霜樱桃炸弹',
    'sporemine': '植物大战僵尸融合版 樱桃土豆地雷', # Let's just use cherry mine
}

for name, q in plants.items():
    img_url = search_bing_image(q)
    if img_url:
        print(f"Found {name}: {img_url}")
        try:
            req = urllib.request.Request(img_url, headers={'User-Agent': 'Mozilla/5.0'})
            data = urllib.request.urlopen(req, timeout=5).read()
            ext = 'gif' if 'gif' in img_url.lower() else 'png'
            with open(f'pvz-web/assets/images/Plants/Fusions/{name}.{ext}', 'wb') as f:
                f.write(data)
            print("Saved!")
        except Exception as e:
            print("Download failed:", e)
    else:
        print(f"Not found: {name}")

