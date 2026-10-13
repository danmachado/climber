# App icon: the current hero's idle frame on the teal background, with the bandana tails drawn in by hand.
# Run from src/:  python3 make-icon.py   (writes ../icon-512.png and ../icon-192.png; bump ?v= in ../manifest.json)
import os
from PIL import Image
os.chdir(os.path.dirname(os.path.abspath(__file__)))
BG, GROUND, GROUND_LO = (31, 128, 112), (95, 230, 180), (16, 64, 56)
hero = Image.open('hero-wolf/hero-idle.png').convert('RGBA').crop((0, 0, 16, 16))
N = 20
cv = Image.new('RGBA', (N, N), BG + (255,))
# ground strip under the feet
for x in range(N):
    cv.putpixel((x, 17), GROUND + (255,))
    for y in (18, 19): cv.putpixel((x, y), GROUND_LO + (255,))
# tails: two short strands from the knot, hanging back and down
for (x, y, c) in [(2, 5, (217, 58, 46)), (1, 6, (217, 58, 46)), (1, 7, (160, 38, 30)), (0, 8, (160, 38, 30)), (3, 6, (217, 58, 46)), (3, 7, (160, 38, 30)), (2, 8, (160, 38, 30))]:
    cv.putpixel((x + 2, y + 2), c + (255,))
# the hero stands on the strip: his feet are on row 15 of the frame, so lift by 2
cv.alpha_composite(hero, (2, 2))
for size in (512, 192):
    cv.resize((size, size), Image.NEAREST).convert('RGB').save('../icon-%d.png' % size)
print('icons written')
