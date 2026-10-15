# The heavy (original art): a muscle-bound brute about three times the raider's height, drawn at full size (not the
# raider scaled up). Huge bare shoulders and arms, a khaki vest over a barrel chest, short thick legs, a small masked
# head sunk between the traps with the raiders' goggle band in red, and a drum-fed cannon carried low in both hands so
# its shots fly at the hero's chest height. Frames face right, 44 x 44, feet on the bottom row, body centred on
# column CX. Shapes are filled first, then a shading pass lights the top edge of every colour region and darkens its
# bottom edge, then one outline pass closes the silhouette.
W, H, CX = 44, 44, 16
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
    # legs: thick, set wide, knees a touch bent; the walk swings them
    lf, ln = (0, 0) if step is None else [(-3, 2), (-1, 1), (2, -3), (1, -1)][step]
    for lx in (CX - 5 + lf, CX + 5 + ln):
        part(f, [('l', [(lx, 27 + b), (lx + 1, 34), (lx, 39)], 3)], 'p')
        part(f, [('e', lx + 1, 41.5, 4, 1.6)], 'c')                    # boot, toe forward
    # far arm, behind the body: only its shoulder and the outside of the bicep show
    part(f, [('e', CX - 10, 12 + b, 5, 4.5), ('e', CX - 12, 18 + b, 4, 4.5), ('l', [(CX - 11, 22 + b), (CX - 8, 29 + b), (CX - 5, 32)], 2.5)], 'k')
    # torso: a sleeveless vest over a barrel chest, widest across the top, narrowing to the belt; bare traps
    part(f, [('e', CX - 6, 10 + b, 6, 3.5), ('e', CX + 6, 10 + b, 6, 3.5)], 'k')
    rows = []
    for y in range(9 + b, 27 + b):
        t = (y - 9 - b) / 17.0
        half = int(round(9.5 - 2.5 * t * t - 1.5 * t)); rows.append((y, half))
    for y, half in rows: rect(f, CX - half - 1, y, CX + half, y, 'o')
    for y, half in rows[1:]: rect(f, CX - half, y, CX + half - 1, y, 'v')
    for y in range(13 + b, 25 + b, 3): rect(f, CX - 6, y, CX + 5, y, 'z')   # quilted ribs
    rect(f, CX, 11 + b, CX, 26 + b, 'z')                                  # zip
    rect(f, CX - 7, 26 + b, CX + 6, 27 + b, 'o'); rect(f, CX - 7, 27 + b, CX + 6, 27 + b, 'z'); px(f, CX, 27 + b, 'y')   # belt, buckle
    # head: small for the body, masked, sunk between the traps, the red goggle band facing forward
    part(f, [('e', CX + 1, 5 + b, 4, 4.5)], 'm')
    rect(f, CX - 1, 4 + b, CX + 6, 5 + b, 'L'); rect(f, CX + 1, 4 + b, CX + 6, 4 + b, 'l')
    # the cannon: carried low in both hands, barrels out front, a red ring at the muzzle, a drum on top at the back
    cy = 35; kx = -kick
    part(f, [('l', [(CX - 6 + kx, cy), (CX + 13 + kx, cy)], 2.5)], 'g')
    part(f, [('e', CX - 1 + kx, cy - 4, 3, 2)], 'r'); rect(f, CX - 3 + kx, cy - 4, CX + 1 + kx, cy - 4, 'y')
    for i, by in enumerate((cy - 2, cy, cy + 2)):                         # three barrels
        rect(f, CX + 15 + kx, by - 1, CX + 25 + kx, by + (1 if i == 2 else 0), 'o')
    for i, by in enumerate((cy - 2, cy, cy + 2)):
        rect(f, CX + 15 + kx, by, CX + 25 + kx, by, 'G' if (i + spin) % 3 == 0 else 'g')
    rect(f, CX + 18 + kx, cy - 3, CX + 18 + kx, cy + 3, 'h'); rect(f, CX + 23 + kx, cy - 3, CX + 23 + kx, cy + 3, 'h')   # clamps
    rect(f, CX + 26 + kx, cy - 3, CX + 27 + kx, cy + 3, 'R'); px(f, CX + 27 + kx, cy, 'r')                              # muzzle ring
    # near arm, in front: a huge shoulder, a bicep that bulges out, a thick forearm down to a fist on the front grip
    sh = [('e', CX + 10, 12 + b, 5.5, 4.5), ('e', CX + 12, 18 + b, 4.5, 4.5), ('l', [(CX + 12, 22 + b), (CX + 12, 27 + b), (CX + 11 - kick, 32)], 2.5), ('e', CX + 11 - kick, 34, 3, 2.5)]
    part(f, sh, 'k')
    f = shade(f)
    g = [row[:] for row in f]                                             # skin volume: lit along the front edge, shaded along the back
    for y in range(H):
        for x in range(1, W - 1):
            if f[y][x] in 'k' and f[y][x + 1] == 'o': g[y][x] = 'K'
            elif f[y][x] in 'kK' and f[y][x - 1] == 'o': g[y][x] = 'j'
    f = g
    for dx, dy in ((1, -1), (2, -1), (2, 0), (1, 0)): px(f, CX + 13 + dx, 17 + b + dy, 'K')   # the bicep's peak catches the light
    for dx, dy in ((0, -2), (1, -2), (2, -1)): px(f, CX + 10 + dx, 11 + b + dy, 'K')         # and the shoulder's
    for x in range(CX + 7, CX + 15):                                      # creases: under the shoulder, at the elbow
        if f[16 + b][x] in 'kK': f[16 + b][x] = 'j'
    for x in range(CX + 9, CX + 15):
        if f[23 + b][x] in 'kK': f[23 + b][x] = 'j'
    for x in range(CX + 8, CX + 14):
        if f[33][x - kick] in 'kKj' and f[34][x - kick] in 'kKj': f[33][x - kick] = 'j'   # knuckles
    return outline(f)

# muzzle: where shots leave, per frame (the ring's front column, the middle barrel's row)
def muzzle(kick): return [CX + 28 - kick, 35]
ANIMS = [
    ('idle', 3, True, [frame(0), frame(0), frame(1), frame(1)], [muzzle(0)] * 4),
    ('walk', 6, True, [frame(0, s) for s in range(4)], [muzzle(0)] * 4),
    ('fire', 20, False, [frame(0, None, 2, 1), frame(0, None, 1, 2), frame(0, None, 0, 0)], [muzzle(2), muzzle(1), muzzle(0)]),
]
GIBS = [PAL['k'], PAL['K'], PAL['v'], PAL['w'], PAL['p'], PAL['m'], PAL['g'], PAL['r']]
