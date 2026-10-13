# Draws the lone-climber hero pack (original art) as 16 px strips plus the manifest make-hero.py reads.
# Frames are composed from parts (head, torso, legs) so a tweak to the head changes every animation at once.
# The bandana tails are NOT here: the game simulates them as a chain behind the head (see template.html).
# Run:  python3 draw.py   then in src/:  python3 make-hero.py && node build.js
import json, os
from PIL import Image, ImageDraw

C = {
    'o': '#0D0F18',                                   # outline
    'd': '#2E201C', 'D': '#543A30',                   # hair, hair tuft
    'B': '#F05C46', 'b': '#D93A2E', 'k': '#A0261E',   # bandana highlight, main, knot / shadow
    's': '#D8A77A', 'S': '#B2805A',                   # skin, skin shadow
    'e': '#14101A',                                   # eye
    'H': '#606E58', 'h': '#3E483A', 'v': '#2C342A',   # shirt highlight, shirt, shirt shadow
    'y': '#CDAA5A',                                   # buckle
    'P': '#424858', 'p': '#2A2F3A',                   # pants highlight, pants
    'c': '#604C3C', 'C': '#80665A',                   # boots, boot highlight
}
NAMES = {
    'o': 'Outline', 'd': 'Hair', 'D': 'Hair tuft', 'B': 'Bandana highlight', 'b': 'Bandana', 'k': 'Bandana knot',
    's': 'Skin', 'S': 'Skin shadow', 'e': 'Eye', 'H': 'Shirt highlight', 'h': 'Shirt', 'v': 'Shirt shadow',
    'y': 'Buckle', 'P': 'Pants highlight', 'p': 'Pants', 'c': 'Boots', 'C': 'Boot highlight',
}

def G(s): return [r for r in s.strip('\n').split('\n')]

# ---- parts (facing right) ----
HEAD = {                                              # no eyes: long hair comes out from under the band and hangs over the face
    'normal': G("""
...oooo..
..oddDdo.
.oBBBBBBo
kobbbbbbo
koSdddddo
.oSsdsdso
.oSssssso
..oSSSSo.
"""),
    'blink': G("""
...oooo..
..oddDdo.
.oBBBBBBo
kobbbbbbo
koSdddddo
.oSsddsdo
.oSssssso
..oSSSSo.
"""),
    'up': G("""
...oooo..
..oddDdo.
.oBBBBBBo
kobbbbbbo
koSddddso
.oSsdsdso
.oSssssso
..oSSSSo.
"""),
    'profile': G("""
...oooo..
..oddDdo.
.oBBBBBBo
kobbbbbbo
koSdddddo
.oSssdsdo
.oSssssso
..oSSSSo.
"""),
    'shut': G("""
...oooo..
..oddDdo.
.oBBBBBBo
kobbbbbbo
koSdddddo
.oSdsdsdo
.oSssssso
..oSSSSo.
"""),
}
TORSO = {                                             # 9 wide: back arm, body, front arm; belt row last
    'idle': G("""
.ovhHHHo.
oSvhhHHso
oSvhhhHso
.oooooyoo
"""),
    'breath': G("""
.ovhHHHo.
oSvhhHHso
oSvhhhHso
.oooooyoo
"""),
    'run_a': G("""
.ovhHHHso
oSvhhHHo.
.ovhhhHo.
.oooooyoo
"""),
    'run_b': G("""
.ovhHHHo.
oSvhhHHso
.ovhhhHo.
.oooooyoo
"""),
    'reach': G("""
oSvhHHHso
oSvhhHHso
.ovhhhHo.
.oooooyoo
"""),
    'brace': G("""
.ovhHHHo.
.ovhhHHso
oSvhhhHso
.oooooyoo
"""),
    'squash': G("""
oSvhhHHso
.oooooyoo
"""),
    'wall': G("""
.ovhHHHo.
oSvhhHHHo
.ovhhhHo.
.oooooyoo
"""),
    'bare': G("""
.ovhHHHo.
.ovhhHHo.
.ovhhhHo.
.oooooyoo
"""),
    'tie': G("""
.ovhHHHo.
.ovhhHHo.
.ovhhhHo.
.oooooyoo
"""),
}
ARM_F = G("""
os
so
""")                                                  # front arm: a bent forearm, skin with outline
ARM_B = G("""
oS
So
""")                                                  # back arm, in shadow

LEGS = {
    'stand': G("""
opPPpPPo
oCc..Cco
"""),
    'run1': G("""
pPPo.oPPo
Cco...oCo
"""),
    'run2': G("""
.opPPpPo.
.oCc.Cco.
"""),
    'run3': G("""
.opPPPpo.
..oCcCco.
"""),
    'tuck': G("""
.opPPpo.
.oCc.Co.
"""),
    'kick': G("""
opPo.oPo
oCc..oCo
"""),
    'wide': G("""
opPPPPPPo
oCc...Cco
"""),
    'wall': G("""
.opPPPPo
.oCc.Cco
"""),
}

def blank(): return [['.'] * 16 for _ in range(16)]
def put(fr, part, x, y):
    for r, row in enumerate(part):
        for c, ch in enumerate(row):
            if ch != '.' and 0 <= y + r < 16 and 0 <= x + c < 16: fr[y + r][x + c] = ch
def pose(head='normal', hy=2, torso='idle', ty=10, legs='stand', ly=14, hx=3, tx=4, lx=4, extra=None):
    fr = blank()
    put(fr, LEGS[legs], lx, ly); put(fr, TORSO[torso], tx, ty); put(fr, HEAD[head], hx, hy)
    if extra: put(fr, G(extra), 0, 0)
    return fr

def run_frame(k, bob):                                    # k 0..5: arms swing opposite each other, legs cycle
    # front arm goes forward-high, forward, down, back-low, back, down; back arm is half a cycle behind
    swing = [(9, 10), (10, 11), (8, 12), (5, 12), (4, 11), (6, 12)]
    legs = ['run1', 'run2', 'run3', 'run1', 'run2', 'run3']
    ty = 10 - bob
    fr = pose(hy=2 - bob, ty=ty, torso='bare', legs=legs[k], ly=14 - bob, lx=3 if k % 3 == 0 else 4)
    bx, by = swing[(k + 3) % 6]; fx_, fy_ = swing[k]
    put(fr, ARM_B, bx - 1, by - bob - (1 if k in (3, 4) else 0))
    put(fr, ARM_F, fx_, fy_ - bob)
    return fr

def raw(s):                                            # a whole hand-drawn frame
    fr = blank(); put(fr, G(s), 0, 0); return fr

DASH_SIDE = raw("""
................
................
................
................
................
.......oooo.....
......oddDdo....
.....oBBBBBBo...
....kobbbbbbo...
....koSsssSso...
.....oSsseseo...
...oooSSSSSso...
..oSvvhhhHHHHso.
..oovvhhhhHHoo..
....oooooyoooo..
....oCc.oCc.oo..
""")
DASH_UP = raw("""
...........oo...
...........so...
.......oooooso..
......oddDdoo...
.....oBBBBBBo...
....kobbbbbbo...
....koSsseseo...
.....oSsssSso...
.....oSssssso...
......oSSSSo....
......ovhHHo....
.....oSvhHHo....
.....oSvhhHo....
......ooooyo....
......opPPpo....
......oCcCco....
""")
DASH_DOWN = raw("""
................
......oooo......
.....oddDdo.....
....oBBBBBBo....
...kobbbbbbo....
...koSsssSso....
....oSssssso....
....oSsseseo....
.....oSSSSo.....
...osvhHHHso....
...oSvhhHHHo....
....ovhhhHo.....
....oooooyo.....
....opPPpPo.....
....oCc.Cco.....
.....oo.oo......
""")
DASH_DIAG_UP = raw("""
............oo..
...........oso..
......oooooso...
.....oddDdoo....
....oBBBBBBo....
...kobbbbbbo....
...koSsseseo....
....oSsssSso....
....oSssssso....
..ooooSSSSo.....
.oSvvhhHHHo.....
.oovvhhhHHo.....
...ooooyooo.....
...opPPpo.......
...oCcCco.......
....oo..........
""")
DASH_DIAG_DOWN = raw("""
................
................
................
.......oooo.....
......oddDdo....
.....oBBBBBBo...
....kobbbbbbo...
....koSsssSso...
.....oSsseseo...
.....oSssssSso..
...ooooSSSSSSo..
..oSvvhhhHHHHo..
..oovvhhhhHHo...
...ooooooyoo....
..opPPpoooo.....
..oCcCco........
""")
def tie_frame(k):                                         # both hands up at the knot behind the head
    fr = pose(torso='bare', head='blink' if k else 'normal')
    put(fr, G('oS\noS\noS\nSS'), 2, 7 - k)            # back arm reaches up to the knot (in shadow, behind the head)
    put(fr, G('.o\nos\nos\nos\nss'), 3, 5 + k)          # front arm over it, hand at the knot
    return fr
def flex_frame(k):                                        # front arm out, hand opening and closing
    fr = pose(torso='bare')
    put(fr, G('oS\nSo'), 4, 11)
    put(fr, G('oss\nsso') if k else G('os\nso'), 10, 11)
    return fr
COIL = pose(head='normal', hy=4, torso='brace', ty=11, legs='wide', ly=14, lx=3)   # the crouch before any dash

def wall_frame(dy, hand_hi):                            # facing the wall on the right; arm up to the grip
    fr = pose(head='profile', hy=2 + dy, torso='wall', ty=10 + dy, legs='wall', ly=14, lx=5)
    arm = G("""
.o
so
so
oo
""")
    put(fr, arm, 12, hand_hi)
    return fr

ANIMS = [
    # name, fps, loop, frames
    ('idle', 4, True, [pose(), pose(hy=1, ty=10, torso='breath'), pose(head='blink', hy=1), pose()]),
    ('run', 12, True, [run_frame(0, 0), run_frame(1, 1), run_frame(2, 1), run_frame(3, 0), run_frame(4, 1), run_frame(5, 1)]),
    # idle one-shots: look up at the climb, retighten the knot, shake out a hand. Played by the game after a few seconds still.
    ('idle_look', 4, False, [pose(head='up'), pose(head='up'), pose(head='up', hy=1, ty=10), pose(head='up'), pose()]),
    ('idle_tie', 6, False, [tie_frame(0), tie_frame(1), tie_frame(0), tie_frame(1), pose()]),
    ('idle_flex', 8, False, [flex_frame(0), flex_frame(1), flex_frame(0), flex_frame(1), pose()]),
    ('jump_up', 0, False, [pose(hy=1, ty=9, torso='reach', legs='tuck', ly=13), pose(hy=0, ty=8, torso='reach', legs='kick', ly=12)]),
    ('fall', 0, False, [pose(hy=2, ty=10, torso='brace', legs='tuck', ly=14), pose(hy=3, ty=11, torso='brace', legs='wide', ly=14, lx=3)]),
    ('land', 12, False, [pose(head='shut', hy=5, torso='squash', ty=13, legs='wide', ly=15, lx=3), pose(hy=3, ty=11, torso='brace', legs='wide', ly=14, lx=3)]),
    ('dash_side', 0, False, [COIL, DASH_SIDE]),
    ('dash_up', 0, False, [COIL, DASH_UP]),
    ('dash_down', 0, False, [COIL, DASH_DOWN]),
    ('dash_diag_up', 0, False, [COIL, DASH_DIAG_UP]),
    ('dash_diag_down', 0, False, [COIL, DASH_DIAG_DOWN]),
    ('wall_hold', 4, True, [wall_frame(0, 5), wall_frame(1, 5)]),
    ('climb', 8, True, [wall_frame(0, 4), wall_frame(-1, 2), wall_frame(-1, 3), wall_frame(0, 6)]),
    ('wall_slide', 8, True, [wall_frame(1, 7), wall_frame(2, 7)]),
    ('hurt', 0, False, [pose(head='shut', hy=3, torso='brace', ty=11, legs='wide', ly=14, lx=3)]),
    ('spawn', 12, False, [pose(head='shut', hy=5, torso='squash', ty=13, legs='wide', ly=15, lx=3), pose(hy=3, ty=11, torso='brace', legs='stand'), pose(hy=0, ty=8, torso='reach', legs='stand', ly=14), pose(hy=1, ty=9, torso='breath'), pose()]),
    ('exit', 10, False, [pose(torso='run_a', legs='run1', lx=3), pose(hy=1, ty=9, ly=13, torso='run_b', legs='run2', hx=4, tx=5, lx=5), pose(hx=6, tx=7, lx=7), blank()]),
]

def hexrgb(h): h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,)
os.chdir(os.path.dirname(os.path.abspath(__file__)))
manifest = {'design': 'Lone climber: dark olive shirt, slate pants, red bandana (tails simulated in the game)', 'dashIndicator': {'feature': 'Bandana', 'hex': C['b']},
            'palette': {k: {'name': NAMES[k], 'hex': C[k]} for k in C}, 'animations': []}
for name, fps, loop, frames in ANIMS:
    im = Image.new('RGBA', (16 * len(frames), 16), (0, 0, 0, 0))
    for i, fr in enumerate(frames):
        for y in range(16):
            for x in range(16):
                ch = fr[y][x]
                if ch != '.': im.putpixel((i * 16 + x, y), hexrgb(C[ch]))
    im.save('hero-%s.png' % name)
    anchors = []                                       # where the bandana chain hangs from: the knot pixels (colour k), per frame
    for fr in frames:
        ks = [(x, y) for y in range(16) for x in range(16) if fr[y][x] == 'k']
        anchors.append([min(x for x, y in ks), round(sum(y for x, y in ks) / len(ks), 1)] if ks else None)
    manifest['animations'].append({'name': name, 'frameCount': len(frames), 'fps': fps, 'loop': loop, 'anchors': anchors})
json.dump(manifest, open('hero-animation-manifest.json', 'w'), indent=1)

# contact sheet at 8x for review
Z = 8; W = 16 * Z * 6 + 120; H = len(ANIMS) * (16 * Z + 14) + 20
sheet = Image.new('RGB', (W, H), (10, 13, 28)); d = ImageDraw.Draw(sheet)
for r, (name, fps, loop, frames) in enumerate(ANIMS):
    y0 = 10 + r * (16 * Z + 14); d.text((6, y0 + 4), name, fill=(255, 183, 74))
    for i, fr in enumerate(frames):
        x0 = 110 + i * 16 * Z
        d.rectangle([x0, y0 + 16 * Z - 1, x0 + 16 * Z - 1, y0 + 16 * Z + 2], fill=(74, 90, 208))
        for y in range(16):
            for x in range(16):
                ch = fr[y][x]
                if ch != '.': d.rectangle([x0 + x * Z, y0 + y * Z, x0 + x * Z + Z - 1, y0 + y * Z + Z - 1], fill=hexrgb(C[ch])[:3])
sheet.save('sheet.png')
print('pack written:', len(ANIMS), 'animations')
