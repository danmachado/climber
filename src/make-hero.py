# Packs a hero animation pack (native 16px strips + manifest) into the sheet the game embeds.
import json, base64, io, sys
from PIL import Image
def rgb(h): h = h.lstrip('#'); return [int(h[i:i+2], 16) for i in (0, 2, 4)]
# WHICH HERO THE GAME USES. Change this one line, then run:  python3 make-hero.py && node build.js
#   'lantern'        the simple lantern character drawn in code (no sprite sheet)
#   'hero-mustache'  Dan's mustached hero (sprite pack in hero-mustache/)
#   'hero'           the earlier human with the orange hat (sprite pack in hero/)
HERO_CHOICE = 'hero-mustache'

# colour roles per pack: the game recolours these for "dash used" and "tired", and takes its effect colours from here
ROLES = {
    'hero': {
        'spent': '#8A482C',                                                   # badge when the dash is used: hat band brown
        'tired': [['#6391D7', '#355A9D'], ['#F1C69A', '#C89468']],            # low stamina: shirt and skin drop to their shadow tones
        'trail': ['#F47A20', '#F1C69A'], 'burst': ['#f1c69a', '#f47a20'],
    },
    'hero-mustache': {
        'spent': '#3A2E14',                                                   # belt buckle goes dull when there is not enough stamina to dash
        'tired': [['#FFFFFF', '#C9CEDD'], ['#E0E0E0', '#A9AFC2'], ['#EEC39A', '#CFA07A'], ['#EABD8B', '#C2936C']],   # low stamina: shirt and skin go grey and flat
        'trail': ['#FFFFFF', '#EEC39A'], 'burst': ['#ffffff', '#eec39a'],     # dash afterimages and the death burst: shirt white, then skin
    },
}
PACK = HERO_CHOICE if HERO_CHOICE != 'lantern' else 'hero-mustache'           # the lantern still carries a sheet, it just is not switched on
USE_SPRITES = HERO_CHOICE != 'lantern'
R = ROLES[PACK]
m = json.load(open(PACK + '/hero-animation-manifest.json'))
pal = {v['hex'].upper(): k for k, v in m['palette'].items()}
rows = m['animations']
atlas = Image.new('RGBA', (max(a['frameCount'] for a in rows) * 16, 16 * len(rows)), (0, 0, 0, 0))
meta = {}
for i, a in enumerate(rows):
    im = Image.open(PACK + '/hero-%s.png' % a['name']).convert('RGBA')
    assert im.size == (a['frameCount'] * 16, 16), (a['name'], im.size)
    atlas.paste(im, (0, i * 16))
    meta[a['name']] = {'row': i, 'n': a['frameCount'], 'fps': a['fps'] or 16, 'loop': bool(a['loop'])}
buf = io.BytesIO(); atlas.save(buf, 'PNG', optimize=True)
cfg = {
    'enabled': USE_SPRITES,
    'frame': 16,
    'dashColor': rgb(m['dashIndicator']['hex']),
    'spentColor': rgb(R['spent']),
    'tired': [[rgb(a), rgb(b)] for a, b in R['tired']],
    'trail': [rgb(c) for c in R['trail']],
    'burst': R['burst'] if USE_SPRITES else ['#ffe9b8', '#ffb74a'],          # death, respawn and trail colours
    'anims': meta,
    'src': 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()
}
open('shared-hero.js', 'w').write("  // ---- hero sprite sheet: 16 x 16 frames, one row per animation, facing right (" + m['design'] + ") ----\n  var HERO = " + json.dumps(cfg) + ";\n")
print('hero:', HERO_CHOICE, '| sheet', atlas.size, 'colours', len(pal))
