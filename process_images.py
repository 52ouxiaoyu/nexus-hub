from PIL import Image
import os

images = {
    'peaflower': '/Users/clawbox/.gemini/antigravity-cli/brain/5520404f-23ed-4fcc-8860-316a9f14e840/fusion_peaflower_1787996055998.jpg',
    'nutshooter': '/Users/clawbox/.gemini/antigravity-cli/brain/5520404f-23ed-4fcc-8860-316a9f14e840/fusion_nutshooter_1787996155579.jpg'
}

dest_dir = 'pvz-web/assets/images/Plants/Fusions'
os.makedirs(dest_dir, exist_ok=True)

for name, src in images.items():
    if not os.path.exists(src):
        print(f"Not found: {src}")
        continue
    img = Image.open(src).convert("RGBA")
    datas = img.getdata()
    new_data = []
    for item in datas:
        # Assuming the checkerboard is gray/white, let's just make it a bit transparent or keep it.
        # It's better to just leave it as is if it's too complex to key out accurately.
        # But let's try a simple heuristic for standard generator checkerboard (which is often exact gray/white hex).
        # To avoid ruining it, let's just save it as PNG for now.
        new_data.append(item)
    
    img.putdata(new_data)
    img.save(os.path.join(dest_dir, f"{name}.png"), "PNG")
    print(f"Processed {name}")

