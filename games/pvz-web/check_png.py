from PIL import Image
import os

img = Image.open('assets/images/Card/Plants/TallNut.png')
bbox = img.getbbox()
print(f"TallNut bounding box: {bbox}")

img = Image.open('assets/images/Card/Plants/Squash.png')
bbox = img.getbbox()
print(f"Squash bounding box: {bbox}")
