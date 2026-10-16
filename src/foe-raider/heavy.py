# The heavy (original art): a hunched brute about twice the raider's height, drawn side-on like the hero and the
# raider (Dan, Oct 2026: bigger in pixels, never the raider scaled up; three times was too big; the first, front-on
# drawing did not match the others). A huge forward shoulder and bare arm, a broad back under a khaki vest crossed by a
# bandolier of shotgun shells, thick legs braced apart, a small masked head jutting forward with the raiders' visor in
# red, and a pump scattergun held low in both hands (stock under the arm, forend in the far hand) so its pellets leave
# at the hero's chest height. Frames face right, 32 x 31, feet on the bottom row, body centred on column CX.
# Shapes are drawn with a dark rim so each mass reads on its own, then a shading pass (lit tops, shaded undersides,
# skin lit along its front edge) and one outline pass.
W, H, CX = 32, 31, 11
OY = 0
PAL = {
    'o': '#0D0F18',
    'm': '#2A2530', 'M': '#4A4252', 'n': '#1A161E',                    # balaclava
    'l': '#FF6A3C', 'L': '#A02A1E',                                    # visor
    'k': '#C98E58', 'K': '#E8B47E', 'j': '#94643A',                    # skin: base, lit, shade
    'v': '#77754A', 'V': '#97955E', 'w': '#53522F',                    # vest
    'z': '#3A3A22',                                                    # straps and seams
    'y': '#E0B040', 'Y': '#9A2A20',                                    # bandolier shells: brass base, red hull
    'p': '#3F4A33', 'P': '#566444', 'q': '#2B3323',                    # pants
    'c': '#2A2420', 'C': '#4A3E36',                                    # boots
    'g': '#3A3F4A', 'G': '#7C8494', 'h': '#24272F',                    # gun metal
    'b': '#6E4428', 'B': '#94603A',                                    # wooden stock and pump
    'r': '#C0392B', 'R': '#FF6A3C',                                    # the red cell, the hot muzzle
}
LIT = {'k': 'K', 'v': 'V', 'q': 'p', 'm': 'M', 'g': 'G', 'c': 'C', 'b': 'B'}
SHADE = {'k': 'j', 'v': 'w', 'P': 'p', 'm': 'n', 'g': 'h'}

def blank(): return [['.'] * W for _ in range(H)]
def px(f, x, y, ch):
    y += OY
    if 0 <= x < W and 0 <= y < H: f[y][x] = ch
def rect(f, x0, y0, x1, y1, ch):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1): px(f, x, y, ch)
def ell(f, cx, cy, rx, ry, ch):
    for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
            if ((x - cx) / (rx + 0.35)) ** 2 + ((y - cy) / (ry + 0.35)) ** 2 <= 1: px(f, x, y, ch)
def limb(f, pts, r, ch):                                                # a thick line through joints (r: half width)
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        n = max(abs(x1 - x0), abs(y1 - y0), 1)
        for i in range(n + 1):
            ell(f, x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, r, r, ch)
def part(f, shapes, ch, rim=True):
    """shapes: ('e', cx, cy, rx, ry) ellipses or ('l', pts, r) thick lines. A dark rim one pixel out first (so the
    part reads as its own mass over whatever is behind it), then the fill."""
    for grow, c in ((1, 'o'), (0, ch)) if rim else ((0, ch),):
        for sh in shapes:
            if sh[0] == 'e': ell(f, sh[1], sh[2], sh[3] + grow, sh[4] + grow, c)
            else: limb(f, sh[1], sh[2] + grow, c)

def shade(f):
    out = [row[:] for row in f]
    for y in range(H):
        for x in range(W):
            ch = f[y][x]
            up = f[y - 1][x] if y else '.'; dn = f[y + 1][x] if y + 1 < H else '.'
            if ch in LIT and up != ch and dn == ch: out[y][x] = LIT[ch]
            elif ch in SHADE and dn != ch and up == ch: out[y][x] = SHADE[ch]
    for y in range(H):                                                   # skin: lit along the front, shaded along the back
        for x in range(1, W - 1):
            if f[y][x] == 'k' and f[y][x + 1] == 'o': out[y][x] = 'K'
            elif f[y][x] == 'k' and f[y][x - 1] == 'o': out[y][x] = 'j'
    return out
def outline(f):
    out = [row[:] for row in f]
    for y in range(H):
        for x in range(W):
            if f[y][x] != '.': continue
            if any(0 <= x + dx < W and 0 <= y + dy < H and f[y + dy][x + dx] not in '.o' for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))): out[y][x] = 'o'
    return out

GUN_Y = 22                                                               # the scattergun's barrel row (8 above the feet)

def poly(f, pts, ch):                                                    # a filled polygon (scanline, pixel centres)
    ys = [p[1] for p in pts]
    for y in range(int(min(ys)), int(max(ys)) + 1):
        xs = []
        for (x0, y0), (x1, y1) in zip(pts, pts[1:] + pts[:1]):
            if (y0 <= y + 0.5 < y1) or (y1 <= y + 0.5 < y0): xs.append(x0 + (y + 0.5 - y0) * (x1 - x0) / (y1 - y0))
        xs.sort()
        for a, b in zip(xs[::2], xs[1::2]):
            for x in range(int(round(a)), int(round(b))): px(f, x, y, ch)
def rimpoly(f, pts, ch):
    grown = []
    cx = sum(p[0] for p in pts) / len(pts); cy = sum(p[1] for p in pts) / len(pts)
    for x, y in pts:
        dx, dy = x - cx, y - cy; d = max(1e-6, (dx * dx + dy * dy) ** 0.5); grown.append((x + dx / d * 1.2, y + dy / d * 1.2))
    poly(f, grown, 'o'); poly(f, pts, ch)

def frame(breath=0, step=None, kick=0, pump=0):
    """breath: 0/1 (chest, head and arms up a pixel). step: None standing, or 0..3 walk phase. kick: the gun shoved back
    by a shot. pump: the forend racked back (after a shot)."""
    f = blank()
    bob = 0 if step is None else (1 if step in (1, 3) else 0)
    b = -breath + bob
    sh = lambda pts: [(x, y + b) for x, y in pts]
    # legs: thick thighs braced apart, the near leg forward with the knee bent; boots with a toe; the walk swings them
    lf, ln = (0, 0) if step is None else [(-2, 2), (-1, 1), (2, -2), (1, -1)][step]
    rimpoly(f, [(5, 19 + b), (11, 19 + b), (10 + lf, 24), (9 + lf, 28), (5 + lf, 28), (5 + lf, 24)], 'q')
    rimpoly(f, [(4 + lf, 28), (10 + lf, 28), (11 + lf, 30.5), (4 + lf, 30.5)], 'c')
    rimpoly(f, [(10, 19 + b), (17, 19 + b), (17 + ln, 23), (16 + ln, 28), (12 + ln, 28), (11, 23)], 'P')
    rimpoly(f, [(11 + ln, 28), (17 + ln, 28), (19 + ln, 30.5), (11 + ln, 30.5)], 'c')
    # torso: a broad back, a deep chest pushed forward, narrowing to the belt; a sleeveless vest
    rimpoly(f, sh([(4, 11), (6, 7), (11, 5), (17, 6), (20.5, 10), (20.5, 15), (19.5, 19), (5, 19), (3.5, 15)]), 'v')
    for y in (10, 13, 16): rect(f, 5, y + b, 8, y + b, 'w')                              # quilting on the back panel
    for i, (x, y) in enumerate([(15, 8), (16, 9), (17, 10), (17, 11), (18, 12), (18, 13), (19, 14), (19, 15), (19, 16)]):   # bandolier down the chest
        px(f, x, y + b, 'Y' if i % 2 else 'y'); px(f, x - 1, y + b, 'z')
    rect(f, 5, 18 + b, 19, 19 + b, 'z'); px(f, 18, 18 + b, 'y'); px(f, 18, 19 + b, 'y')  # belt, buckle
    # traps and neck: bare and thick, the head pushed forward off them
    rimpoly(f, sh([(11, 6), (15, 3), (18, 5), (17, 8), (12, 8)]), 'k')
    # head: masked, the red visor across the front
    part(f, [('e', 18, 3.3 + b, 3, 2.9)], 'm')
    rect(f, 18, 3 + b, 21, 3 + b, 'l'); px(f, 17, 3 + b, 'L')
    # the scattergun: wooden stock under the forearm, a receiver with a red cell, a long barrel over the magazine tube,
    # a wooden pump, a hot muzzle
    k = -kick; gy = GUN_Y
    rimpoly(f, [(9 + k, gy), (15 + k, gy - 1), (15 + k, gy + 1.5), (9 + k, gy + 2)], 'b')
    rimpoly(f, [(15 + k, gy - 2), (21 + k, gy - 2), (21 + k, gy + 2), (15 + k, gy + 2)], 'g')
    px(f, 17 + k, gy - 1, 'r'); px(f, 18 + k, gy - 1, 'r')
    rect(f, 21 + k, gy - 2, 30 + k, gy + 2, 'o')
    rect(f, 21 + k, gy - 1, 30 + k, gy - 1, 'G'); rect(f, 21 + k, gy, 30 + k, gy, 'g')    # barrel
    rect(f, 21 + k, gy + 1, 28 + k, gy + 1, 'h')                                         # magazine tube
    fx = 23 + k - pump
    rect(f, fx - 1, gy, fx + 4, gy + 3, 'o'); rect(f, fx, gy + 1, fx + 3, gy + 1, 'B'); rect(f, fx, gy + 2, fx + 3, gy + 2, 'b')   # the pump
    rect(f, 31 + k, gy - 2, 31 + k, gy + 1, 'o'); rect(f, 30 + k, gy - 1, 30 + k, gy, 'R')                        # muzzle
    # the near arm, hanging at his side in front of the body: a round shoulder, a thick upper arm, the forearm forward to the grip
    part(f, [('e', 12, 9 + b, 3.2, 2.9), ('l', [(12, 11 + b), (12, 15 + b)], 2.3), ('e', 14, 12.5 + b, 1.9, 2.3), ('l', [(12, 16 + b), (15 + k, gy - 1)], 1.9), ('e', 15.5 + k, gy - 0.5, 1.8, 1.6)], 'k')
    # the far hand on the pump, under the barrel
    part(f, [('e', fx + 2, gy + 3, 1.5, 1.1)], 'k')
    f = shade(f)
    for dx, dy in ((-1, -2), (0, -2), (1, -2), (-2, -1)): px(f, 12 + dx, 9 + b + dy, 'K')   # the shoulder catches the light
    for dy in (11, 12, 13): px(f, 15, dy + b, 'K')                                          # the bicep's front
    for x in (11, 12, 13): px(f, x, 15 + b, 'j')                                            # the crook of the elbow
    return outline(f)

def muzzle(kick): return [30 - kick, GUN_Y + OY]
ANIMS = [
    ('idle', 3, True, [frame(0), frame(0), frame(1), frame(1)], [muzzle(0)] * 4),
    ('walk', 6, True, [frame(0, s) for s in range(4)], [muzzle(0)] * 4),
    ('fire', 14, False, [frame(0, None, 2), frame(0, None, 1, 2), frame(0, None, 0, 2), frame(0)], [muzzle(2), muzzle(1), muzzle(0), muzzle(0)]),
]
GIBS = [PAL['k'], PAL['K'], PAL['v'], PAL['w'], PAL['p'], PAL['m'], PAL['y'], PAL['b']]
