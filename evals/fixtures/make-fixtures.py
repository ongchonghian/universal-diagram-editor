"""
Draw the pictures for the image evaluation cases (evals/cases/image.json).

The pictures imitate a whiteboard photo, a paper sketch and a marked-up screenshot. Every label is
invented. Run from the repository root on macOS (the script uses the system's handwriting fonts):

    python3 evals/fixtures/make-fixtures.py

The random seed is fixed, so the pictures come out the same on every run.
"""
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = Path(__file__).parent
FONTS = Path('/System/Library/Fonts')
rng = random.Random(7)


def font(name, size, index=0):
    for folder in (FONTS, FONTS / 'Supplemental'):
        if (folder / name).exists():
            return ImageFont.truetype(str(folder / name), size, index=index)
    raise SystemExit(f'Font {name} not found')


def wobble_line(d, a, b, fill, width, jitter=2.5):
    """A hand-drawn line: a polyline whose points wander a little from the straight line."""
    (x1, y1), (x2, y2) = a, b
    steps = max(4, int(math.dist(a, b) / 18))
    points = []
    for i in range(steps + 1):
        t = i / steps
        j = 0 if i in (0, steps) else jitter
        points.append((x1 + (x2 - x1) * t + rng.uniform(-j, j), y1 + (y2 - y1) * t + rng.uniform(-j, j)))
    d.line(points, fill=fill, width=width, joint='curve')


def box(d, x, y, w, h, fill, width=4):
    corners = [(x, y), (x + w, y), (x + w, y + h), (x, y + h)]
    for i in range(4):
        a = corners[i]
        b = corners[(i + 1) % 4]
        # Overshoot the corners a little, as a marker does
        wobble_line(d, (a[0] + rng.uniform(-4, 4), a[1] + rng.uniform(-4, 4)), (b[0] + rng.uniform(-4, 4), b[1] + rng.uniform(-4, 4)), fill, width)


def diamond(d, cx, cy, w, h, fill, width=4):
    pts = [(cx, cy - h / 2), (cx + w / 2, cy), (cx, cy + h / 2), (cx - w / 2, cy)]
    for i in range(4):
        wobble_line(d, pts[i], pts[(i + 1) % 4], fill, width)


def circle(d, cx, cy, r, fill, width=4):
    pts = [(cx + (r + rng.uniform(-2, 2)) * math.cos(t / 24 * 2 * math.pi), cy + (r + rng.uniform(-2, 2)) * math.sin(t / 24 * 2 * math.pi)) for t in range(26)]
    d.line(pts, fill=fill, width=width, joint='curve')


def arrow(d, a, b, fill, width=4):
    wobble_line(d, a, b, fill, width)
    angle = math.atan2(b[1] - a[1], b[0] - a[0])
    for side in (-1, 1):
        tip = (b[0] - 18 * math.cos(angle + side * 0.45), b[1] - 18 * math.sin(angle + side * 0.45))
        wobble_line(d, b, tip, fill, width, jitter=1)


def label(d, cx, cy, text, f, fill):
    l, t, r, b = d.textbbox((0, 0), text, font=f)
    d.text((cx - (r - l) / 2, cy - (b - t) / 2 - t), text, font=f, fill=fill)


def whiteboard_flowchart():
    """A whiteboard photo: grey-white board, uneven light, blue and black marker."""
    w, h = 1400, 1000
    img = Image.new('RGB', (w, h), (236, 238, 240))
    shade = Image.new('L', (w, h))
    sd = ImageDraw.Draw(shade)
    for i in range(0, w, 4):
        sd.line([(i, 0), (i, h)], fill=int(30 * (i / w)))
    img = Image.composite(Image.new('RGB', (w, h), (205, 208, 212)), img, shade)
    d = ImageDraw.Draw(img)
    ink, blue = (30, 32, 38), (28, 70, 160)
    f = font('MarkerFelt.ttc', 40)

    box(d, 100, 120, 300, 110, ink)
    label(d, 250, 175, 'Order received', f, ink)
    box(d, 550, 120, 300, 110, ink)
    label(d, 700, 175, 'Check stock', f, ink)
    diamond(d, 700, 470, 340, 220, blue)
    label(d, 700, 470, 'In stock?', f, blue)
    box(d, 1030, 415, 280, 110, ink)
    label(d, 1170, 470, 'Pack order', f, ink)
    box(d, 1030, 760, 280, 110, ink)
    label(d, 1170, 815, 'Ship', f, ink)
    box(d, 120, 415, 260, 110, ink)
    label(d, 250, 470, 'Reorder', f, ink)

    arrow(d, (405, 175), (540, 175), ink)
    arrow(d, (700, 235), (700, 355), ink)
    arrow(d, (875, 470), (1020, 470), blue)
    label(d, 950, 435, 'yes', font('MarkerFelt.ttc', 32), blue)
    arrow(d, (525, 470), (390, 470), blue)
    label(d, 455, 435, 'no', font('MarkerFelt.ttc', 32), blue)
    arrow(d, (250, 410), (560, 235), ink)
    arrow(d, (1170, 530), (1170, 750), ink)
    img = img.filter(ImageFilter.GaussianBlur(0.8))
    img.save(OUT / 'whiteboard-flowchart.jpg', quality=82)


def paper_sequence():
    """A pen sketch on lined paper: three lifelines and four messages."""
    w, h = 1200, 1000
    img = Image.new('RGB', (w, h), (250, 248, 238))
    d = ImageDraw.Draw(img)
    for y in range(60, h, 44):
        d.line([(0, y), (w, y)], fill=(200, 215, 235), width=2)
    ink = (25, 35, 90)
    f = font('Noteworthy.ttc', 38, index=1)
    small = font('Noteworthy.ttc', 30)
    xs = {'Browser': 200, 'API': 600, 'Database': 1000}
    for name, x in xs.items():
        box(d, x - 120, 80, 240, 80, ink, width=3)
        label(d, x, 120, name, f, ink)
        for y in range(170, 930, 30):
            wobble_line(d, (x, y), (x, y + 16), ink, 3, jitter=1)
    messages = [
        ('Browser', 'API', 'POST /login', 270),
        ('API', 'Database', 'find user', 420),
        ('Database', 'API', 'user row', 570),
        ('API', 'Browser', 'token', 720),
    ]
    for source, target, text, y in messages:
        arrow(d, (xs[source], y), (xs[target], y), ink, width=3)
        label(d, (xs[source] + xs[target]) / 2, y - 30, text, small, ink)
    img.save(OUT / 'paper-sequence.jpg', quality=85)


def paper_process():
    """A process sketch with a start circle, tasks, a decision and end circles."""
    w, h = 1500, 760
    img = Image.new('RGB', (w, h), (252, 252, 247))
    d = ImageDraw.Draw(img)
    ink = (20, 20, 20)
    f = font('Bradley Hand Bold.ttf', 36)
    circle(d, 90, 300, 36, ink)
    label(d, 90, 370, 'start', font('Bradley Hand Bold.ttf', 26), ink)
    box(d, 190, 245, 230, 110, ink)
    label(d, 305, 300, 'Submit claim', f, ink)
    box(d, 500, 245, 230, 110, ink)
    label(d, 615, 300, 'Review claim', f, ink)
    diamond(d, 900, 300, 200, 160, ink)
    label(d, 900, 300, 'Approved?', font('Bradley Hand Bold.ttf', 30), ink)
    box(d, 1080, 120, 230, 110, ink)
    label(d, 1195, 175, 'Pay claim', f, ink)
    box(d, 1080, 420, 230, 110, ink)
    label(d, 1195, 475, 'Reject claim', f, ink)
    circle(d, 1420, 175, 36, ink, width=8)
    circle(d, 1420, 475, 36, ink, width=8)
    arrow(d, (128, 300), (185, 300), ink)
    arrow(d, (425, 300), (495, 300), ink)
    arrow(d, (735, 300), (798, 300), ink)
    arrow(d, (950, 250), (1075, 180), ink)
    label(d, 1000, 190, 'yes', font('Bradley Hand Bold.ttf', 26), ink)
    arrow(d, (950, 350), (1075, 470), ink)
    label(d, 990, 445, 'no', font('Bradley Hand Bold.ttf', 26), ink)
    arrow(d, (1315, 175), (1380, 175), ink)
    arrow(d, (1315, 475), (1380, 475), ink)
    img.save(OUT / 'paper-process.jpg', quality=85)


def marked_up_screenshot():
    """A screenshot of a rendered flowchart (Draft, Review, Publish) with a step added in red pen."""
    w, h = 1300, 520
    img = Image.new('RGB', (w, h), (255, 255, 255))
    d = ImageDraw.Draw(img)
    node_fill, node_line, text = (236, 236, 255), (147, 112, 219), (51, 51, 51)
    f = font('Supplemental/Arial.ttf', 30) if (FONTS / 'Supplemental/Arial.ttf').exists() else ImageFont.load_default()
    nodes = {'Draft': 160, 'Review': 560, 'Publish': 1110}
    for name, cx in nodes.items():
        d.rounded_rectangle([cx - 110, 200, cx + 110, 290], radius=6, fill=node_fill, outline=node_line, width=2)
        label(d, cx, 245, name, f, text)
    d.line([(270, 245), (440, 245)], fill=text, width=2)
    d.polygon([(450, 245), (436, 238), (436, 252)], fill=text)
    d.line([(670, 245), (990, 245)], fill=text, width=2)
    d.polygon([(1000, 245), (986, 238), (986, 252)], fill=text)
    # The red markup: cross out the arrow, add a box between Review and Publish
    red = (215, 30, 30)
    wobble_line(d, (790, 215), (850, 275), red, 5)
    wobble_line(d, (850, 215), (790, 275), red, 5)
    box(d, 735, 360, 230, 90, red, width=5)
    label(d, 850, 405, 'Legal check', font('MarkerFelt.ttc', 34), red)
    arrow(d, (640, 295), (745, 355), red, width=5)
    arrow(d, (965, 360), (1060, 295), red, width=5)
    img.save(OUT / 'marked-up-screenshot.png')


if __name__ == '__main__':
    whiteboard_flowchart()
    paper_sequence()
    paper_process()
    marked_up_screenshot()
    print('Wrote the pictures to', OUT)
