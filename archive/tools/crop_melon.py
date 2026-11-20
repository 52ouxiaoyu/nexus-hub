from PIL import Image

img = Image.open('pvz-web/assets/images/Plants/MelonPult/MelonPult.gif')
img = img.convert("RGBA")

# Crop top-left region: x from 0 to 40, y from 0 to 35
crop_box = (0, 0, 36, 32)
melon = img.crop(crop_box)
melon.save('pvz-web/assets/images/Plants/MelonPult/Melon.gif', format='WebP')
print("Cropped to 36x32 and saved to Melon.gif")

