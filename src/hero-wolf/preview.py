# Animated preview of every hero animation at its real speed (preview.gif), for reviewing motion without the game.
# Run after draw.py:  python3 preview.py
import json, os
from PIL import Image, ImageDraw
os.chdir(os.path.dirname(os.path.abspath(__file__)))
m = json.load(open('hero-animation-manifest.json'))
Z, COLS, CELL, TICK, SECS = 6, 5, 16 * 6 + 16, 0.02, 4
anims = m['animations']; rows = (len(anims) + COLS - 1) // COLS
strips = {a['name']: Image.open('hero-%s.png' % a['name']).convert('RGBA') for a in anims}
frames = []
for k in range(int(SECS / TICK)):
    t = k * TICK
    im = Image.new('RGB', (COLS * CELL, rows * (CELL + 12)), (16, 19, 38)); d = ImageDraw.Draw(im)
    for i, a in enumerate(anims):
        x0, y0 = (i % COLS) * CELL, (i // COLS) * (CELL + 12)
        fps = a['fps'] or 16; n = a['frameCount']; f = int(t * fps)
        if a['loop']: f %= n
        elif a.get('loopFrom') is not None and f >= n: f = a['loopFrom'] + (f - a['loopFrom']) % (n - a['loopFrom'])
        else: f = min(n - 1, f)
        fr = strips[a['name']].crop((f * 16, 0, f * 16 + 16, 16)).resize((16 * Z, 16 * Z), Image.NEAREST)
        d.rectangle([x0 + 4, y0 + 8 + 16 * Z, x0 + CELL - 4, y0 + 10 + 16 * Z], fill=(74, 90, 208))
        im.paste(fr, (x0 + 8, y0 + 8), fr)
        d.text((x0 + 6, y0 + 14 + 16 * Z), a['name'], fill=(255, 183, 74))
    frames.append(im)
frames[0].save('preview.gif', save_all=True, append_images=frames[1:], duration=int(TICK * 1000), loop=0, optimize=True)
print('preview.gif', frames[0].size, len(frames), 'frames')
