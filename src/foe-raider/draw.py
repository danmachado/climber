# Draws the raider, the first bad guy (original art), with the hero's pose system (hero-wolf/draw.py): the same 16 px
# frames, joints and outline pass, a masked head with glowing goggles, a khaki vest and a dark carbine with a red cell.
# Writes raider-<anim>.png strips, a contact sheet, and ../shared-foes.js (the sheet as a data URI plus the frame
# table, muzzle points per frame, and the colours the game uses for gibs).
# Run:  python3 draw.py   then in src/:  node build.js
import os, sys, json, base64, io
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'hero-wolf'))
import draw as H                                                   # the pose system (Pose, pose, run_frame, outline ...)

C = {
    'o': '#0D0F18',                                                # outline
    'm': '#2A2530', 'M': '#4A4252',                                # balaclava, its lit side
    'l': '#D7F25A', 'L': '#7E9A2A',                                # goggle lens, lens rim
    's': '#8A7650', 'S': '#6A5A3C', 'T': '#4E4330',                # sleeves: lit, shade, far arm
    'H': '#9A8558', 'h': '#75633F', 'v': '#4E422B',                # vest
    'y': '#C7A04E',                                                # buckle
    'Q': '#56653F', 'P': '#455233', 'p': '#2E3724',                # olive pants
    'c': '#2A2420', 'C': '#4A3E36',                                # boots
    'g': '#2E2E35', 'G': '#74747E', 'a': '#E8433A',                # carbine: body, lit top and muzzle, red cell
    'd': '#2A2530', 'D': '#4A4252', 'B': '#D7F25A', 'b': '#7E9A2A', 'k': '#2A2530', 'e': '#0D0F18',   # (hero keys, unused by the mask)
}
H.HEAD['mask'] = H.G("""
..ooooo..
.oMmmmmo.
oMmmmmmo.
ommmmmmo.
omLlllLo.
.ommmmmo.
.oMmmmmo.
..ommmo..
""")

def stand(state=0, kick=0):
    top = {0: 9, 1: 8, 2: 10}[state]
    arm = [(11 - kick, top), (13 - kick, top + 1), (14 - kick, top + 1)]
    if state == 1:
        fr = H.pose(hip=12, torso='tall', head='mask', **H.LEGS_STAND, far_arm=[(4, 8), (5, 9), (6, 10)], near_arm=arm, gun=True)
    elif state == 2:
        fr = H.pose(hip=13, torso='mid', head='mask', **H.LEGS_GIVE, far_arm=[(4, 10), (5, 11), (6, 12)], near_arm=arm, gun=True)
    else:
        fr = H.pose(hip=12, torso='mid', head='mask', **H.LEGS_STAND, far_arm=[(4, 9), (5, 10), (6, 11)], near_arm=arm, gun=True)
    return fr

def walk(k):
    H.HEAD['normal'], keep = H.HEAD['mask'], H.HEAD['normal']        # run_frame draws the 'normal' head: lend it the mask
    try: return H.run_frame(k, True)
    finally: H.HEAD['normal'] = keep

import heavy as HV                                                 # the heavy: drawn full size in heavy.py

ANIMS = [
    ('idle', 4, True, [stand(0), stand(0), stand(1), stand(1), stand(0), stand(2)]),
    ('walk', 9, True, [walk(k) for k in range(8)]),
    ('fire', 20, False, [stand(0, 1), stand(0, 1), stand(0)]),      # the kick: the arm drops back a pixel, then settles
]

def hexrgb(h): h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,)
def strip(frames, pal=None):
    pal = pal or C
    im = Image.new('RGBA', (16 * len(frames), 16), (0, 0, 0, 0))
    for i, fr in enumerate(frames):
        for y in range(16):
            for x in range(16):
                if fr[y][x] != '.': im.putpixel((i * 16 + x, y), hexrgb(pal[fr[y][x]]))
    return im

# Body parts for deaths: the standing frame cut into pieces by what each pixel is (mask = head, carbine = gun, pants
# and boots = legs, split left and right, the rest = torso; the heavy's front arm comes off on its own). Outline pixels
# go with the part most of their neighbours belong to. The game throws these with physics and the head rolls.
def cut(fr, groups, w, h, extra=None):
    own = [[None] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            ch = fr[y][x]
            if ch in '.o': continue
            g = extra(x, y, ch) if extra else None
            if not g:
                for name, chars in groups:
                    if ch in chars: g = name; break
            own[y][x] = g or '?'
    for _ in range(2):                                                   # ambiguous colours and outlines take their neighbours' part
        for y in range(h):
            for x in range(w):
                if fr[y][x] == '.' or (own[y][x] and own[y][x] != '?'): continue
                votes = {}
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        if 0 <= x + dx < w and 0 <= y + dy < h and own[y + dy][x + dx] not in (None, '?'): votes[own[y + dy][x + dx]] = votes.get(own[y + dy][x + dx], 0) + 1
                if votes: own[y][x] = max(votes, key=votes.get)
    legs = [x for y in range(h) for x in range(w) if own[y][x] == 'legs']
    mid = (min(legs) + max(legs)) / 2 if legs else 0
    for y in range(h):
        for x in range(w):
            if own[y][x] == 'legs': own[y][x] = 'leg1' if x <= mid else 'leg2'
    out = []
    for name in ['head', 'torso', 'arm', 'leg1', 'leg2', 'gun']:
        pts = [(x, y) for y in range(h) for x in range(w) if own[y][x] == name]
        if pts: out.append((name, pts, min(x for x, y in pts), min(y for x, y in pts), max(x for x, y in pts) + 1, max(y for x, y in pts) + 1))
    return out

if __name__ == '__main__':
    os.chdir(HERE)
    atlas = Image.new('RGBA', (16 * max(len(a[3]) for a in ANIMS), 16 * len(ANIMS)), (0, 0, 0, 0)); meta = {}
    for i, a in enumerate(ANIMS):
        name, fps, loop, frames = a[:4]; pal = a[4] if len(a) > 4 else C
        im = strip(frames, pal); im.save('raider-%s.png' % name); atlas.paste(im, (0, i * 16))
        muz = []
        for fr in frames:
            gs = [(x, y) for y in range(16) for x in range(16) if fr[y][x] in 'gGa']
            mx = max(x for x, y in gs); muz.append([mx, [y for x, y in gs if x == mx][0]])
        meta[name] = {'row': i, 'n': len(frames), 'fps': fps, 'loop': loop, 'muzzles': muz}
    buf = io.BytesIO(); atlas.save(buf, 'PNG', optimize=True)
    hatlas = Image.new('RGBA', (HV.W * max(len(a[3]) for a in HV.ANIMS), HV.H * len(HV.ANIMS)), (0, 0, 0, 0)); hmeta = {}
    for i, (name, fps, loop, frames, muz) in enumerate(HV.ANIMS):
        for k, fr in enumerate(frames):
            for y in range(HV.H):
                for x in range(HV.W):
                    if fr[y][x] != '.': hatlas.putpixel((k * HV.W + x, i * HV.H + y), hexrgb(HV.PAL[fr[y][x]]))
        hmeta[name] = {'row': i, 'n': len(frames), 'fps': fps, 'loop': loop, 'muzzles': muz}
    hatlas.save('heavy-sheet.png'); hbuf = io.BytesIO(); hatlas.save(hbuf, 'PNG', optimize=True)
    rcut = cut(ANIMS[0][3][0], [('head', 'mMlL'), ('gun', 'gGa'), ('legs', 'QPpcC'), ('torso', 'sSTHhvy')], 16, 16)
    hcut = cut(HV.ANIMS[0][3][0], [('head', 'mMnlL'), ('gun', 'gGhrR'), ('legs', 'pPqcC'), ('torso', 'kKjvVwz')], HV.W, HV.H,
               lambda x, y, ch: 'arm' if ch in 'kKj' and x >= HV.CX + 4 and y >= 7 + HV.OY else None)
    pw = sum(c[4] - c[2] + 1 for c in rcut + hcut); ph = max(HV.H, 16)
    patlas = Image.new('RGBA', (pw, ph), (0, 0, 0, 0)); pmeta = {'raider': [], 'heavy': []}; px_ = 0
    for kind, cuts, fr, pal in (('raider', rcut, ANIMS[0][3][0], C), ('heavy', hcut, HV.ANIMS[0][3][0], HV.PAL)):
        for name, pts, x0, y0, x1, y1 in cuts:
            for x, y in pts: patlas.putpixel((px_ + x - x0, y - y0), hexrgb(pal[fr[y][x]]))
            pmeta[kind].append({'n': name, 'sx': px_, 'w': x1 - x0, 'h': y1 - y0, 'ox': x0, 'oy': y0})
            px_ += x1 - x0 + 1
    patlas.save('parts.png'); pbuf = io.BytesIO(); patlas.save(pbuf, 'PNG', optimize=True)
    cfg = {'frame': 16, 'anims': meta, 'gibs': [C['m'], C['M'], C['H'], C['h'], C['Q'], C['p'], C['g'], C['l']],
           'heavyGibs': HV.GIBS,
           'src': 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode(),
           'heavy': {'w': HV.W, 'h': HV.H, 'cx': HV.CX, 'anims': hmeta, 'src': 'data:image/png;base64,' + base64.b64encode(hbuf.getvalue()).decode()},
           'parts': {'list': pmeta, 'src': 'data:image/png;base64,' + base64.b64encode(pbuf.getvalue()).decode()}}
    open(os.path.join(HERE, '..', 'shared-foes.js'), 'w').write(
        '  // ---- bad guys: the raider sheet, 16 x 16 frames facing right (drawn by src/foe-raider/draw.py, original art) ----\n'
        '  var FOES = ' + json.dumps(cfg) + ';\n')
    Z = 8; sheet = Image.new('RGB', (16 * Z * 8 + 80, len(ANIMS) * (16 * Z + 12) + 10), (70, 80, 110)); d = ImageDraw.Draw(sheet)
    for r, a in enumerate(ANIMS):
        name, fps, loop, frames = a[:4]
        y0 = 6 + r * (16 * Z + 12); d.text((4, y0), name, fill=(255, 220, 120))
        big = strip(frames, a[4] if len(a) > 4 else C).resize((16 * Z * len(frames), 16 * Z), Image.NEAREST); sheet.paste(big, (76, y0), big)
    sheet.save('sheet.png'); print('raider written:', ', '.join(a[0] for a in ANIMS), '| heavy:', ', '.join(hmeta), '| parts:', {k: [p['n'] for p in v] for k, v in pmeta.items()})
