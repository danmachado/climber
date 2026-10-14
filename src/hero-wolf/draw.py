# Draws the lone-climber hero pack (original art) as 16 px strips plus the manifest make-hero.py reads.
# Every frame is POSED, not pasted: a hand-drawn head and torso plus limbs drawn as short lines between joints.
#   - the head always sits directly on the torso (its chin row touches the torso's top row), so it can never float
#   - the torso always sits on the hips (belt row), and the legs start on the row under the belt
#   - limbs are layered: far arm, far leg, torso, near leg, head, near arm. Far limbs are a shade darker.
#   - one outline pass at the end closes the silhouette (the bandana knot is left bare for the tails)
# The bandana tails are NOT here: the game simulates them as a chain behind the head (see template.html).
# Check:  python3 audit.py  (the quality test; it fails on gaps, loose parts, floating feet, dead idles ...)
# Run:    python3 draw.py   then in src/:  python3 make-hero.py && node build.js
import json, os
from PIL import Image, ImageDraw

C = {
    'o': '#0D0F18',                                   # outline
    'd': '#2E201C', 'D': '#543A30',                   # hair, hair tuft
    'B': '#F05C46', 'b': '#D93A2E', 'k': '#A0261E',   # bandana highlight, main, knot / shadow
    's': '#D8A77A', 'S': '#B2805A', 'T': '#9A6D4C',   # skin, skin shadow, far arm shadow
    'e': '#14101A',                                   # eye
    'H': '#606E58', 'h': '#3E483A', 'v': '#2C342A',   # shirt highlight, shirt, shirt shadow
    'y': '#CDAA5A',                                   # buckle
    'Q': '#5C6478', 'P': '#424858', 'p': '#2A2F3A',   # near leg lit, pants highlight, pants
    'c': '#604C3C', 'C': '#80665A',                   # boots, boot highlight
}
NAMES = {
    'o': 'Outline', 'd': 'Hair', 'D': 'Hair tuft', 'B': 'Bandana highlight', 'b': 'Bandana', 'k': 'Bandana knot',
    's': 'Skin', 'S': 'Skin shadow', 'T': 'Far arm shadow', 'e': 'Eye', 'H': 'Shirt highlight', 'h': 'Shirt', 'v': 'Shirt shadow',
    'y': 'Buckle', 'Q': 'Pants lit', 'P': 'Pants highlight', 'p': 'Pants', 'c': 'Boots', 'C': 'Boot highlight',
}

def G(s): return [r for r in s.strip('\n').split('\n')]

# ---- head (facing right): swept dark hair, the band across it with the knot at the back (the tails hang from the
# knot), a squint shadow under the band instead of eyes, a nose pixel that juts past the face at the front. 9 x 8,
# the last row is the chin and always lands on the row above the torso. ----
HEAD = {
    'normal': G("""
..o.o.o..
.odDdddo.
oddddddo.
oddddddo.
kobBBBBo.
.odSSSSo.
.oSsssso.
..oSSSo..
"""),
    'up': G("""
..o.o.o..
.odDdddo.
oddddddo.
oddddddo.
kobBBBBo.
.odSssso.
.oSsssSo.
..oSSSo..
"""),
    'down': G("""
..o.o.o..
.odDdddo.
oddddddo.
oddddddo.
kobBBBBo.
.odSSSSo.
.oSSssSo.
..oSSsso.
"""),
    'shut': G("""
..o.o.o..
.odDdddo.
oddddddo.
oddddddo.
kobBBBBo.
.odSSSSo.
.oSSSSso.
..oSSSo..
"""),
    'tuft': G("""
...o.o.o.
.odDdddo.
oddddddo.
oddddddo.
kobBBBBo.
.odSSSSo.
.oSsssso.
..oSSSo..
"""),
}
HEAD_H = 8
# ---- torsos: tank top, the belt is the last row and sits on the hips. Width 10, the shirt is cols 3..6. ----
TORSO = {
    'mid': G("""
..ovhHHo..
..ovhhHo..
..ovhhHo..
.oooooyoo.
"""),
    'tall': G("""
..ovhHHo..
..ovhHHo..
..ovhhHo..
..ovhhHo..
.oooooyoo.
"""),
    'short': G("""
..ovhHHo..
..ovhhHo..
.oooooyoo.
"""),
    'squash': G("""
.ovhhHHHo.
.ovhhhHHo.
oooooooyoo
"""),
    'side': G("""
..ovhHHo..
..ovhhHo..
..ovhhHo..
..oooyoo..
"""),
    'flat': G("""
.ovhhhHHHo
oooooooyoo
"""),
}

def blank(): return [['.'] * 16 for _ in range(16)]
def put(fr, part, x, y):
    for r, row in enumerate(part):
        for c, ch in enumerate(row):
            if ch != '.' and 0 <= y + r < 16 and 0 <= x + c < 16: fr[y + r][x + c] = ch
def line(a, b):
    (x0, y0), (x1, y1) = a, b
    dx, dy = abs(x1 - x0), -abs(y1 - y0); sx = 1 if x0 < x1 else -1; sy = 1 if y0 < y1 else -1; err = dx + dy; pts = []
    while True:
        pts.append((x0, y0))
        if x0 == x1 and y0 == y1: return pts
        e2 = 2 * err
        if e2 >= dy: err += dy; x0 += sx
        if e2 <= dx: err += dx; y0 += sy
def path(pts):
    out = []
    for i in range(len(pts) - 1):
        for p in line(pts[i], pts[i + 1]):
            if p not in out: out.append(p)
    return out or list(pts)

class Frame(list): arms = None                                      # a frame, carrying its arm lengths for the audit
ARM_LEN, ARM_REACH = 4, 5                                         # shoulder to hand, relaxed and reaching
class Pose:
    def __init__(self): self.fr = blank(); self.mask = {}; self.arm_lengths = []   # mask: which limb owns a pixel (for separation lines)
    def px(self, x, y, ch, who=None):
        if 0 <= x < 16 and 0 <= y < 16:
            self.fr[y][x] = ch
            if who: self.mask[(x, y)] = who
            else: self.mask.pop((x, y), None)
    def limb(self, pts, cols, who, thick=1, sep=None):
        # a line through the joints. thick 2 = pants (two columns, the front one lit). sep: outline the pixels of
        # that other limb which this one covers the edge of, so near and far legs read as two legs, not a blob.
        cells = []
        for x, y in path(pts):
            cells.append((x, y, cols[0]))
            if thick == 2: cells.append((x + 1, y, cols[1]))
        mine = {(x, y) for x, y, _ in cells}
        if sep:
            for x, y in mine:
                for ax, ay in ((x - 1, y), (x, y - 1), (x, y + 1)):
                    if (ax, ay) not in mine and self.mask.get((ax, ay)) == sep: self.px(ax, ay, 'o', None)
        for x, y, ch in cells: self.px(x, y, ch, who)
    def arm(self, pts, near):
        # Arms are always the same length so they read as the same limb in every pose: 4 pixels from shoulder to hand,
        # 5 when reaching (any arm drawn longer than 4 is a reach). The joints give the direction; the arm is cut or
        # extended along them to that length, keeping the shoulder where it is.
        # They taper like a real limb: the upper arm is two pixels thick and shaded, the forearm one pixel, the hand lit.
        # Light comes from the upper front: on an upright stretch the front column is lit and the back one in shadow,
        # on a level stretch the top row is lit and the row under it in shadow. An upright upper arm thickens away from
        # the body's middle (column 7.5) so it never eats into the torso. The far arm is a shade darker all over.
        pix = path(pts)
        want = ARM_REACH if len(pix) > ARM_LEN else ARM_LEN
        pix = pix[:want]
        while len(pix) < want:                                         # too short: carry on the way the forearm points
            (x0, y0), (x1, y1) = pix[-2] if len(pix) > 1 else (pix[-1][0], pix[-1][1] - 1), pix[-1]
            dx, dy = x1 - x0, y1 - y0
            step = (0, (dy > 0) - (dy < 0)) if abs(dy) >= abs(dx) else ((dx > 0) - (dx < 0), 0)
            pix.append((x1 + step[0], y1 + step[1]))
        self.arm_lengths.append(len(pix))
        lit, shade = ('s', 'S') if near else ('S', 'T')
        who = 'na' if near else 'fa'; cells = {}
        for i, (x, y) in enumerate(pix):
            if (x, y) in cells and cells[(x, y)] == lit: continue
            nx, ny = pix[min(i + 1, len(pix) - 1)]; px_, py_ = pix[max(i - 1, 0)]
            upright = abs(ny - py_) >= abs(nx - px_)
            thick = i < 2                                              # upper arm: shoulder and elbow
            ox = x + 1 if x >= 7.5 else x - 1
            cells[(x, y)] = shade if thick and upright and ox > x else lit
            if not thick: continue
            if upright:
                if ox > x: cells[(ox, y)] = lit
                else: cells.setdefault((ox, y), shade)
            else: cells.setdefault((x, y + 1), shade)
        cells[pix[-1]] = lit                                           # the hand
        for (x, y), ch in cells.items(): self.px(x, y, ch, who)

    def boot(self, x, y, near, kind='flat', toe=1, leg=None):
        # Tall, narrow boots (two wide, the width of the leg): a sole on the given row and a cuff on the row above it,
        # where the boot covers the bottom of the leg. The boot sits under the end of the leg, never more than one
        # pixel ahead or behind, so a foot never trails off the leg like a board.
        who = 'nl' if near else 'fl'
        if leg:
            lx = leg[-1][0]; x = lx + max(-1, min(1, x - lx))
        sole, cuff = ('c', 'C') if near else ('c', 'c')
        for cx in (x, x + 1):
            if self.mask.get((cx, y - 1)) == who: self.px(cx, y - 1, cuff, who)
            self.px(cx, y, cuff if near and cx == x + 1 and kind == 'flat' else sole, who)

def outline(fr):
    add = []
    for y in range(16):
        for x in range(16):
            if fr[y][x] != '.': continue
            for ax, ay in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if 0 <= ax < 16 and 0 <= ay < 16 and fr[ay][ax] not in '.ok': add.append((x, y)); break
    for x, y in add: fr[y][x] = 'o'
    return fr

def pose(hip=12, tx=3, torso='mid', head='normal', hdx=0, near_leg=None, far_leg=None, near_boot=None, far_boot=None,
         near_arm=None, far_arm=None, hips=True, near_behind=False, shift=0):
    """hip: the belt row. tx: torso column. Legs and arms are joint lists in frame coords (x right, y down).
    A boot is (x, y[, kind[, toe]]). The head is placed so its chin row is the row above the torso: it cannot float.
    near_behind: the near arm goes behind the head (hands at the back of the head). shift: move the whole pose sideways."""
    P = Pose(); t = TORSO[torso]; ty = hip - len(t) + 1
    if far_arm: P.arm(far_arm, False)
    if far_leg: P.limb(far_leg, 'pP', 'fl', 2)
    if far_boot: P.boot(*far_boot[:2], False, *far_boot[2:], leg=far_leg)
    put(P.fr, t, tx, ty)
    for x in range(16):
        for y in range(ty, hip + 1): P.mask.pop((x, y), None)
    if hips and near_leg and far_leg:                                   # the seat of the pants, joining both legs to the belt
        xs = [near_leg[0][0], near_leg[0][0] + 1, far_leg[0][0], far_leg[0][0] + 1]
        for x in range(min(xs), max(xs) + 1): P.px(x, hip + 1, 'p', 'hip')
    if near_leg: P.limb(near_leg, 'PQ', 'nl', 2, sep='fl')
    if near_boot: P.boot(*near_boot[:2], True, *near_boot[2:], leg=near_leg)
    if near_arm and near_behind: P.arm(near_arm, True)
    put(P.fr, HEAD[head], tx + hdx, ty - HEAD_H)
    if near_arm and not near_behind: P.arm(near_arm, True)
    fr = outline(P.fr)
    if shift: fr = [(['.'] * shift + row)[:16] if shift > 0 else (row[-shift:] + ['.'] * -shift) for row in fr]
    fr = Frame(fr); fr.arms = P.arm_lengths
    return fr

# ---------------------------------------------------------------- idle: breathing, the whole body
# stand: hips on row 12, legs straight, arms hang. Breathing in lifts the chest (taller torso) and with it the head and
# shoulders, the arms ride up and swing out a touch. Breathing out the knees give and the body settles a pixel (squash).
LEGS_STAND = dict(far_leg=[(4, 13), (4, 14)], far_boot=(4, 15), near_leg=[(9, 13), (9, 14)], near_boot=(9, 15))
LEGS_GIVE = dict(far_leg=[(4, 14)], far_boot=(3, 15), near_leg=[(9, 14)], near_boot=(9, 15))
def stand(state=0, head='normal', near_arm=None, far_arm=None, near_behind=False):
    if state == 1:   # in: chest up, shoulders and hands ride up, hands drift out
        return pose(hip=12, torso='tall', head=head, near_behind=near_behind, **LEGS_STAND,
                    far_arm=far_arm or [(4, 8), (4, 9), (3, 10)], near_arm=near_arm or [(11, 8), (11, 9), (12, 10)])
    if state == 2:   # out: knees give, everything settles a pixel
        return pose(hip=13, torso='mid', head=head, near_behind=near_behind, **LEGS_GIVE,
                    far_arm=far_arm or [(4, 10), (4, 11), (4, 12)], near_arm=near_arm or [(11, 10), (11, 11), (11, 12)])
    return pose(hip=12, torso='mid', head=head, near_behind=near_behind, **LEGS_STAND,
                far_arm=far_arm or [(4, 9), (4, 10), (4, 11)], near_arm=near_arm or [(11, 9), (11, 10), (11, 11)])

# idle one-shots, played by the game after a few seconds still
SHADE = [(11, 8), (12, 7), (12, 6), (11, 5), (10, 5)]                              # hand up to the brow, looking up the climb
def tie(k):                                                              # both hands at the knot behind the head, tugging
    return stand(1, near_behind=True, far_arm=[(4, 8), (2, 7), (2, 5 - k)], near_arm=[(11, 8), (12, 6 - k), (10, 4)])
def flex(k, state=0):                                                    # near hand out front, shaking loose
    hy = 9 if state == 0 else 8
    return stand(state, near_arm=[(11, hy), (12, hy + 1), (13, hy + 1 - k), (14, hy + 1 - 2 * k)])

# ---------------------------------------------------------------- air
JUMP = [
    pose(hip=11, torso='mid', far_leg=[(5, 12), (5, 14)], far_boot=(5, 15, 'toe'), near_leg=[(8, 12), (8, 14)], near_boot=(8, 15, 'toe'),
         far_arm=[(4, 8), (3, 6), (3, 4)], near_arm=[(11, 8), (12, 6), (12, 4)]),                                    # take-off: long, toes pointed, arms thrown up
    pose(hip=11, torso='mid', far_leg=[(5, 12), (6, 13)], far_boot=(5, 14, 'toe'), near_leg=[(8, 12), (10, 13)], near_boot=(9, 14),
         far_arm=[(4, 8), (3, 7), (3, 5)], near_arm=[(11, 8), (12, 7), (13, 6)]),                                    # rising: knees come up
]
FALL = [
    pose(hip=12, torso='short', far_leg=[(5, 13), (6, 14)], far_boot=(5, 15, 'toe'), near_leg=[(8, 13), (10, 14)], near_boot=(10, 15),
         far_arm=[(5, 10), (3, 10), (2, 9)], near_arm=[(10, 10), (12, 10), (13, 9)]),                                # apex: floaty, arms out, knees up
    pose(hip=12, torso='mid', far_leg=[(5, 13), (5, 14)], far_boot=(4, 15, 'toe'), near_leg=[(8, 13), (8, 14)], near_boot=(8, 15, 'toe'),
         far_arm=[(4, 9), (3, 7), (3, 5)], near_arm=[(11, 9), (12, 7), (12, 5)]),                                    # dropping: arms up, legs hang
    pose(hip=12, torso='mid', far_leg=[(5, 13), (4, 14)], far_boot=(3, 15, 'toe'), near_leg=[(8, 13), (9, 14)], near_boot=(9, 15, 'toe'),
         far_arm=[(4, 9), (2, 8), (2, 6)], near_arm=[(11, 9), (13, 8), (13, 6)]),                                    # dropping: arms flap out
]
LAND = [
    pose(hip=14, torso='squash', head='down', far_leg=[(4, 15)], near_leg=[(9, 15)], far_boot=(3, 15), near_boot=(10, 15), hips=False,
         far_arm=[(3, 12), (2, 13), (1, 13)], near_arm=[(12, 12), (13, 13), (14, 13)]),                              # impact: flattened, arms out low
    pose(hip=13, torso='short', head='down', **LEGS_GIVE, far_arm=[(4, 11), (3, 12)], near_arm=[(11, 11), (12, 12)]),   # coming up
    stand(1),                                                                                                       # a little overshoot
]
HURT = pose(hip=13, torso='squash', head='shut', far_leg=[(4, 14)], far_boot=(2, 15), near_leg=[(9, 14)], near_boot=(11, 15),
            far_arm=[(3, 11), (2, 9), (1, 8)], near_arm=[(12, 11), (13, 9), (14, 8)])
DUCK = pose(hip=13, torso='short', head='down', far_leg=[(4, 14)], near_leg=[(9, 14)], far_boot=(3, 15), near_boot=(10, 15),
            far_arm=[(4, 11), (4, 13)], near_arm=[(11, 11), (11, 13)])                                              # squat, hands on knees
LOOKUP = stand(1, 'up')
# skid: facing the new way while the body still slides back, so lean into it and dig both heels in behind
SKID = pose(hip=13, tx=4, torso='short', hdx=1, far_leg=[(5, 14)], far_boot=(4, 15), near_leg=[(8, 14)], near_boot=(7, 15),
            far_arm=[(7, 11), (9, 11), (11, 10)], near_arm=[(12, 11), (14, 10), (15, 9)])

# ---------------------------------------------------------------- dashes: a coil, then the body thrown along the dash
COIL = pose(hip=13, torso='short', head='down', far_leg=[(5, 14)], far_boot=(3, 15), near_leg=[(9, 14)], near_boot=(9, 15),
            far_arm=[(5, 11), (3, 12)], near_arm=[(10, 11), (8, 12), (7, 13)])
DASH_SIDE = pose(hip=13, tx=3, torso='flat', hdx=3, far_leg=[(6, 14), (3, 15)], far_boot=(2, 15, 'toe', -1), near_leg=[(7, 14), (4, 14)], near_boot=(2, 14, 'toe', -1),
                 far_arm=[(9, 12), (7, 13)], near_arm=[(11, 12), (13, 12), (15, 11)])
DASH_UP = pose(hip=13, torso='tall', far_leg=[(5, 14)], far_boot=(5, 15, 'toe'), near_leg=[(8, 14)], near_boot=(8, 15, 'toe'),
               far_arm=[(4, 9), (3, 11), (3, 12)], near_arm=[(11, 9), (12, 6), (12, 3), (12, 1)])
DASH_DOWN = pose(hip=12, torso='mid', head='down', far_leg=[(4, 13), (3, 14)], far_boot=(2, 15, 'flat', -1), near_leg=[(9, 13), (10, 14)], near_boot=(11, 15),
                 far_arm=[(4, 9), (3, 7), (3, 6)], near_arm=[(11, 9), (12, 7), (12, 6)])
DASH_DIAG_UP = pose(hip=12, tx=3, torso='mid', hdx=2, far_leg=[(6, 13), (4, 14)], far_boot=(3, 15, 'toe'), near_leg=[(8, 13), (7, 14)], near_boot=(6, 15, 'toe'),
                    far_arm=[(6, 9), (4, 10), (3, 11)], near_arm=[(11, 9), (13, 6), (14, 4), (15, 3)])
DASH_DIAG_DOWN = pose(hip=12, tx=3, torso='short', head='down', hdx=2, far_leg=[(5, 13), (6, 14)], far_boot=(6, 15), near_leg=[(8, 13), (10, 14)], near_boot=(11, 15),
                      far_arm=[(5, 10), (3, 9)], near_arm=[(10, 10), (8, 8), (7, 7)])

# ---------------------------------------------------------------- on the wall (the wall is to the right, from column 12)
# hands grip the wall face at column 11, the feet push on it, the near limbs and the far limbs climb in turn.
def wall(dy, near_hand, far_hand, near_foot, far_foot, torso='side', tx=2):
    hip = 12 + dy; top = hip - len(TORSO[torso]) + 1
    return pose(hip=hip, tx=tx, torso=torso,
                far_arm=[(8, top), (10, top + 1), (11, far_hand)], near_arm=[(9, top), (10, top - 1), (11, top - 2), (11, near_hand), (12, near_hand)],
                far_leg=[(5, hip + 1), (8, far_foot - 1)], far_boot=(10, far_foot, 'toe'), near_leg=[(6, hip + 1), (8, near_foot - 1)], near_boot=(10, near_foot, 'toe'))
CLIMB = [
    wall(0, 3, 9, 15, 13),     # near hand high, far knee up
    wall(-1, 4, 8, 14, 14),    # pull: body rises, hands stay where they gripped
    wall(0, 9, 3, 13, 15),     # far hand high, near knee up
    wall(-1, 8, 4, 14, 14),
]
HOLD = [wall(0, 5, 9, 15, 14), wall(0, 5, 9, 15, 14, torso='tall')]           # hanging on: breathing
def slide(k):                                                             # leaning out, one arm straight to the wall, feet scraping
    hip = 12; top = hip - 3
    return pose(hip=hip, tx=1, torso='side', far_arm=[(6, top + 1), (9, top + 1), (11, top + 1 + k)], near_arm=[(7, top), (10, top + 1), (12, top + 1 - k)],
                far_leg=[(5, 13), (8, 14)], far_boot=(10, 14, 'toe'), near_leg=[(6, 13), (8, 15)], near_boot=(10, 15, 'toe'))

def LG(row, s): return (row, G(s))
RUN_LEGS = [   # per phase: hip (belt) row, lead leg, trail leg
    (12, LG(13, """
.......LL.......
.........LL.....
..........KK....
"""), LG(13, """
.....LL.........
....LL..........
...KK...........
""")),                                                                   # contact: lead heel down, trail toe behind
    (13, LG(14, """
.......LLL......
.........KK.....
"""), LG(13, """
....KK..........
.....LL.........
""")),                                                                   # down: weight on the lead, trail foot kicks up
    (12, LG(13, """
......LL........
......LL........
......KK........
"""), LG(13, """
........LL......
.........KK.....
""")),                                                                   # pass: trail knee swings through
    (11, LG(12, """
......LL........
.....LL.........
....LL..........
...KK...........
"""), LG(12, """
.......LL.......
.........LL.....
..........KK....
""")),                                                                   # up: lead pushes off on the toe, trail reaches
]
RUN_ARMS = [   # per phase, shoulder at (8, torso top): arm on the lead-leg side, the other arm
    ([(8, 0), (7, 1), (6, 2), (5, 2)], [(8, 0), (9, 1), (10, 1), (11, 0)]),
    ([(8, 0), (7, 1), (6, 2)], [(8, 0), (9, 1), (10, 1)]),
    ([(8, 0), (8, 1), (8, 2)], [(8, 0), (8, 1), (8, 2)]),
    ([(8, 0), (9, 1), (10, 1), (11, 0)], [(8, 0), (7, 1), (6, 2), (5, 2)]),
]
def leg_grid(P, lg, near):
    row, rows = lg; cells = []
    rows = [list(r) for r in rows]
    for r in range(1, len(rows)):                                        # a boot's cuff: the leg pixel above it is boot too
        for x, ch in enumerate(rows[r]):
            if ch == 'K' and x < len(rows[r - 1]) and rows[r - 1][x] == 'L': rows[r - 1][x] = 'k'
    rows = [''.join('K' if c == 'k' else c for c in r) for r in rows]
    for r, s in enumerate(rows):
        for x, ch in enumerate(s):
            if ch == 'L': cells.append((x, row + r, 'Q' if near else 'P'))
            elif ch == 'K': cells.append((x, row + r, ('C' if near else 'c')))
    # the near leg: shade its back column, and cut a dark line into the far leg wherever it lies against it
    mine = {(x, y) for x, y, _ in cells}
    if near:
        for x, y in mine:
            for ax, ay in ((x - 1, y), (x, y - 1), (x, y + 1)):
                if (ax, ay) not in mine and P.mask.get((ax, ay)) == 'fl': P.px(ax, ay, 'o')
        cells = [(x, y, 'P' if ch == 'Q' and (x - 1, y) not in mine else ch) for x, y, ch in cells]
    for x, y, ch in cells: P.px(x, y, ch, 'nl' if near else 'fl')

def run_frame(k):
    ph = k % 4; near_leads = k < 4
    hip, lead, trail = RUN_LEGS[ph]
    near, far = (lead, trail) if near_leads else (trail, lead)
    top = hip - 3
    lead_arm, other_arm = [[(x, top + y) for x, y in a] for a in RUN_ARMS[ph]]
    near_arm, far_arm = (lead_arm, other_arm) if near_leads else (other_arm, lead_arm)
    P = Pose(); t = TORSO['side']; ty = hip - len(t) + 1; tx = 3
    P.arm(far_arm, False)
    leg_grid(P, far, False)
    put(P.fr, t, tx, ty)
    for x in range(16):
        for y in range(ty, hip + 1): P.mask.pop((x, y), None)
    leg_grid(P, near, True)
    put(P.fr, HEAD['normal'], tx + 1, ty - HEAD_H)
    P.arm(near_arm, True)
    fr = Frame(outline(P.fr)); fr.arms = P.arm_lengths
    return fr


def exit_frames():
    a = run_frame(0); b = run_frame(1)
    r2 = run_frame(2); c = Frame([(['.'] * 3 + row)[:16] for row in r2]); c.arms = r2.arms
    return [a, b, c, blank()]

ANIMS = [
    # name, fps, loop, frames   (loop may be a frame number: play through once, then loop from that frame)
    ('idle', 6, True, [stand(0), stand(0), stand(1), stand(1), stand(1, 'tuft'), stand(0), stand(2), stand(2, 'tuft')]),
    ('run', 14, True, [run_frame(k) for k in range(8)]),
    ('idle_look', 4, False, [stand(1, 'up'), stand(1, 'up', near_arm=SHADE), stand(1, 'up', near_arm=SHADE), stand(1, 'tuft', near_arm=SHADE), stand(1, 'up'), stand(0)]),
    ('idle_tie', 6, False, [stand(1), tie(0), tie(1), tie(0), tie(1), stand(1), stand(0)]),
    ('idle_flex', 8, False, [stand(0), flex(0), flex(1), flex(0, 1), flex(1, 1), flex(0), stand(0)]),
    ('jump_up', 12, False, JUMP),
    ('fall', 8, 1, FALL),
    ('land', 18, False, LAND),
    ('dash_side', 0, False, [COIL, DASH_SIDE]),
    ('dash_up', 0, False, [COIL, DASH_UP]),
    ('dash_down', 0, False, [COIL, DASH_DOWN]),
    ('dash_diag_up', 0, False, [COIL, DASH_DIAG_UP]),
    ('dash_diag_down', 0, False, [COIL, DASH_DIAG_DOWN]),
    ('wall_hold', 3, True, HOLD),
    ('climb', 8, True, CLIMB),
    ('wall_slide', 10, True, [slide(0), slide(1)]),
    ('hurt', 0, False, [HURT]),
    ('duck', 0, False, [DUCK]),
    ('look_up', 0, False, [LOOKUP]),
    ('skid', 0, False, [SKID]),
    ('spawn', 12, False, [LAND[0], LAND[1], JUMP[0], stand(1), stand(0)]),
    ('exit', 10, False, exit_frames()),
]

def hexrgb(h): h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,)
def write(anims=None):
    anims = anims or ANIMS
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    manifest = {'design': 'Lone climber: dark olive shirt, slate pants, red bandana (tails simulated in the game)', 'dashIndicator': {'feature': 'Bandana', 'hex': C['b']},
                'palette': {k: {'name': NAMES[k], 'hex': C[k]} for k in C}, 'animations': []}
    for name, fps, loop, frames in anims:
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
        row = {'name': name, 'frameCount': len(frames), 'fps': fps, 'loop': loop is True, 'anchors': anchors,
               'arms': [getattr(fr, 'arms', None) for fr in frames]}   # arm lengths per frame (shoulder to hand), checked by audit.py
        if loop is not True and loop is not False: row['loopFrom'] = loop
        manifest['animations'].append(row)
    json.dump(manifest, open('hero-animation-manifest.json', 'w'), indent=1)
    # contact sheet at 8x for review
    Z = 8; W = 16 * Z * 8 + 120; H = len(anims) * (16 * Z + 14) + 20
    sheet = Image.new('RGB', (W, H), (10, 13, 28)); d = ImageDraw.Draw(sheet)
    for r, (name, fps, loop, frames) in enumerate(anims):
        y0 = 10 + r * (16 * Z + 14); d.text((6, y0 + 4), name, fill=(255, 183, 74))
        for i, fr in enumerate(frames):
            x0 = 110 + i * 16 * Z
            d.rectangle([x0, y0 + 16 * Z - 1, x0 + 16 * Z - 1, y0 + 16 * Z + 2], fill=(74, 90, 208))
            for y in range(16):
                for x in range(16):
                    ch = fr[y][x]
                    if ch != '.': d.rectangle([x0 + x * Z, y0 + y * Z, x0 + x * Z + Z - 1, y0 + y * Z + Z - 1], fill=hexrgb(C[ch])[:3])
    sheet.save('sheet.png')
    print('pack written:', len(anims), 'animations')

if __name__ == '__main__': write()
