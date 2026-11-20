import urllib.request
import re

url = "https://pvz.fandom.com/zh/wiki/%E7%8C%AB%E5%B0%BE%E8%8D%89"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    html = urllib.request.urlopen(req).read().decode('utf-8')
    # Look for image URLs
    matches = re.findall(r'https://[^"]+Cattail[^\.]*\.gif[^"]*', html, re.IGNORECASE)
    if matches:
        img_url = matches[0].split('.gif')[0] + '.gif'
        print(f"Found GIF: {img_url}")
        urllib.request.urlretrieve(img_url, "pvz-web/assets/images/Plants/Cattail/Cattail.gif")
        print("Downloaded to Cattail.gif")
    else:
        print("No GIF found with 'Cattail'")
except Exception as e:
    print(f"Error: {e}")
