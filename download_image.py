import urllib.request
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

req = urllib.request.Request(
    'https://static.wikia.nocookie.net/plantsvszombies/images/3/30/Melon_pult_anim.gif/revision/latest?format=original',
    headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
)
with urllib.request.urlopen(req, context=ctx) as response:
    with open('pvz-web/assets/images/Plants/MelonPult/MelonPult.gif', 'wb') as f:
        f.write(response.read())

req2 = urllib.request.Request(
    'https://static.wikia.nocookie.net/plantsvszombies/images/3/36/Winter_Melon_anim.gif/revision/latest?format=original',
    headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
)
with urllib.request.urlopen(req2, context=ctx) as response:
    with open('pvz-web/assets/images/Plants/WinterMelon/WinterMelon.gif', 'wb') as f:
        f.write(response.read())
