# Packs a hero animation pack (native 16px strips + manifest) into the sheet the game embeds.
import json, base64, io, sys
from PIL import Image
def rgb(h): h = h.lstrip('#'); return [int(h[i:i+2], 16) for i in (0, 2, 4)]
m = json.load(open('hero/hero-animation-manifest.json'))
pal = {v['hex'].upper(): k for k, v in m['palette'].items()}
rows = m['animations']
atlas = Image.new('RGBA', (max(a['frameCount'] for a in rows) * 16, 16 * len(rows)), (0, 0, 0, 0))
meta = {}
for i, a in enumerate(rows):
    im = Image.open('hero/hero-%s.png' % a['name']).convert('RGBA')
    assert im.size == (a['frameCount'] * 16, 16), (a['name'], im.size)
    atlas.paste(im, (0, i * 16))
    meta[a['name']] = {'row': i, 'n': a['frameCount'], 'fps': a['fps'] or 16, 'loop': bool(a['loop'])}
buf = io.BytesIO(); atlas.save(buf, 'PNG', optimize=True)
# colour roles for this design (the rest of the game takes its effect colours from here)
USE_SPRITES = False   # False = the simple lantern character drawn in code; True = the sprite pack in hero/
cfg = {
    'enabled': USE_SPRITES,
    'frame': 16,
    'dashColor': rgb(m['dashIndicator']['hex']),
    'spentColor': rgb('#8A482C'),                                   # badge when the dash is used: hat band brown
    'tired': [[rgb('#6391D7'), rgb('#355A9D')], [rgb('#F1C69A'), rgb('#C89468')]],   # low stamina: shirt and skin drop to their shadow tones
    'trail': [rgb('#F47A20'), rgb('#F1C69A')],                      # dash afterimages: hat orange, then skin tone (shirt blue would vanish against the blue bricks)
    'burst': ['#f1c69a', '#f47a20'] if USE_SPRITES else ['#ffe9b8', '#ffb74a'],   # death, respawn and trail colours
    'anims': meta,
    'src': 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()
}
open('shared-hero.js', 'w').write("  // ---- hero sprite sheet: 16 x 16 frames, one row per animation, facing right (" + m['design'] + ") ----\n  var HERO = " + json.dumps(cfg) + ";\n")
print('sheet', atlas.size, 'colours', len(pal))
