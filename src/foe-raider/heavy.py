# The heavy (original art): a muscle-bound brute about twice the raider's height (Dan, Oct 2026: three times was too
# big), drawn at full size (never the raider scaled up). Huge bare shoulders and arms, a khaki vest over a barrel chest, short thick legs, a small masked
# head sunk between the traps with the raiders' goggle band in red, and a drum-fed cannon carried low in both hands so
# its shots fly at the hero's chest height. Frames face right, 32 x 31, feet on the bottom row, body centred on
# column CX. Shapes are filled first, then a shading pass lights the top edge of every colour region and darkens its
# bottom edge, then one outline pass closes the silhouette.
W, H, CX = 32, 31, 11
OY = 1                                                                 # everything drawn a row down, so the head's outline fits
PAL = {
    'o': '#0D0F18',
    'm': '#2A2530', 'M': '#4A4252', 'n': '#1A161E',                    # balaclava
    'l': '#FF6A3C', 'L': '#A02A1E',                                    # goggle band
    'k': '#D9A066', 'K': '#F0C08A', 'j': '#A8743F',                    # skin: base, lit, shade
    'v': '#7A7A48', 'V': '#9A9A5C', 'w': '#56562F',                    # vest
    'z': '#3A3A22',                                                    # vest seams and zip
    'p': '#3D4930', 'P': '#55653F', 'q': '#2A3322',                    # pants
    'c': '#2A2420', 'C': '#4A3E36',                                    # boots
    'g': '#3B414E', 'G': '#7A8396', 'h': '#262A33',                    # cannon metal
    'r': '#C0392B', 'R': '#FF6A3C',                                    # the drum and muzzle ring
    'y': '#E8B83A',                                                    # belt buckle and drum band
}
LIT = {'k': 'K', 'v': 'V', 'p': 'P', 'm': 'M', 'g': 'G', 'c': 'C'}
SHADE = {'k': 'j', 'v': 'w', 'p': 'q', 'm': 'n', 'g': 'h'}

def blank(): return [['.'] * W for _ in range(H)]
def px(f, x, y, ch):
    y += OY
    if 0 <= x < W and 0 <= y < H: f[y][x] = ch
def rect(f, x0, y0, x1, y1, ch):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1): px(f, x, y, ch)
def ell(f, cx, cy, rx, ry, ch):
    for y in range(int(cy - ry), int(cy + ry) + 1):
        for x in range(int(cx - rx), int(cx + rx) + 1):
            if ((x - cx) / (rx + 0.35)) ** 2 + ((y - cy) / (ry + 0.35)) ** 2 <= 1: px(f, x, y, ch)
def limb(f, pts, r, ch):                                                # a thick line through joints (r: half width)
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        n = max(abs(x1 - x0), abs(y1 - y0), 1)
        for i in range(n + 1):
            ell(f, x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, r, r, ch)

def shade(f):
    out = [row[:] for row in f]
    for y in range(H):
        for x in range(W):
            ch = f[y][x]
            if ch in LIT and (y == 0 or f[y - 1][x] != ch) and (y + 1 < H and f[y + 1][x] == ch): out[y][x] = LIT[ch]
            elif ch in SHADE and (y + 1 >= H or f[y + 1][x] != ch) and y > 0 and f[y - 1][x] == ch: out[y][x] = SHADE[ch]
            elif ch in SHADE and x > 0 and f[y][x - 1] == ch and (x + 1 >= W or f[y][x + 1] != ch) and ch == 'k': out[y][x] = 'j'   # arms: the back edge in shade
    return out
def outline(f):
    out = [row[:] for row in f]
    for y in range(H):
        for x in range(W):
            if f[y][x] != '.': continue
            if any(0 <= x + dx < W and 0 <= y + dy < H and f[y + dy][x + dx] not in '.o' for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))): out[y][x] = 'o'
    return out

def part(f, shapes, ch, rim=True):
    """shapes: ('e', cx, cy, rx, ry) ellipses or ('l', pts, r) thick lines. Draws a dark rim one pixel out first (so the
    part reads as its own mass over whatever is behind it), then the fill."""
    for pass_, c in ((1, 'o'), (0, ch)) if rim else ((0, ch),):
        for sh in shapes:
            if sh[0] == 'e': ell(f, sh[1], sh[2], sh[3] + pass_, sh[4] + pass_, c)
            else: limb(f, sh[1], sh[2] + pass_, c)

def frame(breath=0, step=None, kick=0, spin=0):
    """breath: 0/1 (chest, head and arms up a pixel). step: None standing, or 0..3 walk phase. kick: cannon pushed
    back. spin: which barrel is lit (the barrels turn while it fires)."""
    f = blank()
    bob = 0 if step is None else (1 if step in (1, 3) else 0)
    b = -breath + bob
    # legs: thick, set wide; the walk swings them
    lf, ln = (0, 0) if step is None else [(-2, 2), (-1, 1), (2, -2), (1, -1)][step]
    for lx in (CX - 3 + lf, CX + 3 + ln):
        part(f, [('l', [(lx, 19 + b), (lx, 26)], 2)], 'p')
        part(f, [('e', lx + 1, 28, 2.6, 1.1)], 'c')                    # boot, toe forward
    # far arm, behind the body
    part(f, [('e', CX - 7, 8 + b, 3.5, 3), ('e', CX - 8, 12 + b, 2.8, 3), ('l', [(CX - 8, 15 + b), (CX - 6, 19 + b), (CX - 3, 22)], 1.8)], 'k')
    # torso: a sleeveless vest over a barrel chest, widest across the top, narrowing to the belt; bare traps
    part(f, [('e', CX - 4, 7 + b, 4, 2.5), ('e', CX + 4, 7 + b, 4, 2.5)], 'k')
    rows = []
    for y in range(6 + b, 19 + b):
        t = (y - 6 - b) / 12.0
        half = int(round(6.5 - 1.5 * t * t - 1.0 * t)); rows.append((y, half))
    for y, half in rows: rect(f, CX - half - 1, y, CX + half, y, 'o')
    for y, half in rows[1:]: rect(f, CX - half, y, CX + half - 1, y, 'v')
    for y in range(9 + b, 18 + b, 3): rect(f, CX - 4, y, CX + 3, y, 'z')    # quilted ribs
    rect(f, CX, 8 + b, CX, 18 + b, 'z')                                   # zip
    rect(f, CX - 5, 18 + b, CX + 4, 19 + b, 'o'); rect(f, CX - 5, 19 + b, CX + 4, 19 + b, 'z'); px(f, CX, 19 + b, 'y')   # belt, buckle
    # head: small for the body, masked, sunk between the traps, the red goggle band facing forward
    part(f, [('e', CX + 1, 3.5 + b, 2.8, 3.2)], 'm')
    rect(f, CX, 3 + b, CX + 4, 3 + b, 'l'); px(f, CX - 1, 3 + b, 'L')
    # the cannon: carried low in both hands, two barrels out front, a red ring at the muzzle, a drum on top
    cy = 22; kx = -kick
    part(f, [('l', [(CX - 4 + kx, cy), (CX + 8 + kx, cy)], 1.8)], 'g')
    part(f, [('e', CX + kx, cy - 3, 2, 1.2)], 'r'); px(f, CX - 1 + kx, cy - 3, 'y'); px(f, CX + kx, cy - 3, 'y')
    rect(f, CX + 10 + kx, cy - 2, CX + 17 + kx, cy + 2, 'o')
    for i, by in enumerate((cy - 1, cy + 1)):                             # two barrels
        rect(f, CX + 10 + kx, by, CX + 17 + kx, by, 'G' if (i + spin) % 2 == 0 else 'g')
    rect(f, CX + 10 + kx, cy, CX + 17 + kx, cy, 'h')
    rect(f, CX + 13 + kx, cy - 2, CX + 13 + kx, cy + 2, 'h')                                                              # clamp
    rect(f, CX + 18 + kx, cy - 2, CX + 18 + kx, cy + 2, 'R'); px(f, CX + 18 + kx, cy, 'r')                              # muzzle ring
    # near arm, in front: a big shoulder, a bicep that bulges out, a forearm down to a fist on the front grip
    sh = [('e', CX + 6, 8 + b, 3.8, 3.2), ('e', CX + 8, 12 + b, 3, 3), ('l', [(CX + 8, 15 + b), (CX + 8, 19 + b), (CX + 7 - kick, 21)], 1.8), ('e', CX + 7 - kick, 22, 2, 1.6)]
    part(f, sh, 'k')
    f = shade(f)
    g = [row[:] for row in f]                                             # skin volume: lit along the front edge, shaded along the back
    for y in range(H):
        for x in range(1, W - 1):
            if f[y][x] in 'k' and f[y][x + 1] == 'o': g[y][x] = 'K'
            elif f[y][x] in 'kK' and f[y][x - 1] == 'o': g[y][x] = 'j'
    f = g
    for dx, dy in ((0, -1), (1, -1), (1, 0)): px(f, CX + 9 + dx, 11 + b + dy, 'K')   # the bicep's peak catches the light
    for x in range(CX + 5, CX + 11):                                      # crease under the shoulder
        if f[11 + b + OY][x] in 'kK' and x < CX + 7: f[11 + b + OY][x] = 'j'
    return outline(f)

# muzzle: where shots leave, per frame (the ring's front column, the middle barrel's row)
def muzzle(kick): return [CX + 19 - kick, 22 + OY]
ANIMS = [
    ('idle', 3, True, [frame(0), frame(0), frame(1), frame(1)], [muzzle(0)] * 4),
    ('walk', 6, True, [frame(0, s) for s in range(4)], [muzzle(0)] * 4),
    ('fire', 20, False, [frame(0, None, 2, 1), frame(0, None, 1, 2), frame(0, None, 0, 0)], [muzzle(2), muzzle(1), muzzle(0)]),
]
GIBS = [PAL['k'], PAL['K'], PAL['v'], PAL['w'], PAL['p'], PAL['m'], PAL['g'], PAL['r']]
