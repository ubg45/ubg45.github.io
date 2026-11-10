#!/usr/bin/env python3
"""Bring classroom-15x games onto UBG45.

  python3 tools/import-lessons.py PLAN.json --lessons /path/to/classroom-15x [--dry-run]

PLAN.json is a list of {"lesson": "lesson003", "title": "10 Minutes Till Dawn", "thumb": "lesson003"}.
  "thumb" is the image to use (images/<thumb>.png) - it is not always the same number as the lesson.

For every entry this:
  * copies resources/<lesson>/ to games/<slug>/                         (the game itself, served from our own site)
  * saves the picture as img/c15x/<slug>.jpg                            (300x300 JPEG, like our other thumbnails)
  * adds a game card at the end of the game grid in index.html
  * adds the game's address to the random-game list (const links = [...])
A game whose slug folder or title already exists is skipped, so running it twice is safe.
"""
import argparse, html, json, os, re, shutil, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX = os.path.join(ROOT, 'index.html')
SITE = 'https://ubg45.github.io'
GRID_END = '\n\t\t\t\n\t</div>\n        <div class="empty" id="searchEmpty"'


def slugify(t):
    s = re.sub(r'[^a-z0-9]+', '-', t.lower().replace("'", '').replace('&', 'and')).strip('-')
    return s or 'game'


def norm(s):
    return re.sub(r'[^a-z0-9]', '', html.unescape(s).lower())


def make_thumb(src, dst, size=300):
    im = Image.open(src).convert('RGBA')
    bg = Image.new('RGBA', im.size, (255, 255, 255, 255)); bg.alpha_composite(im); im = bg.convert('RGB')
    w, h = im.size; m = min(w, h)
    im = im.crop(((w - m) // 2, (h - m) // 2, (w - m) // 2 + m, (h - m) // 2 + m)).resize((size, size), Image.LANCZOS)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    im.save(dst, 'JPEG', quality=84, optimize=True, progressive=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('plan'); ap.add_argument('--lessons', required=True); ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()
    plan = json.load(open(a.plan, encoding='utf-8'))
    src = open(INDEX, encoding='utf-8').read()
    have = {norm(t) for t in re.findall(r'<h3>(.*?)</h3>', src[src.index('id="gameGrid"'):], re.S)}
    cards, urls, done, skipped = [], [], [], []
    for p in plan:
        title, lesson = p['title'], p['lesson']
        slug = p.get('slug') or slugify(title)
        res = os.path.join(a.lessons, 'resources', lesson)
        img = os.path.join(a.lessons, 'images', p.get('thumb', lesson) + '.png')
        if norm(title) in have: skipped.append((title, 'title already on the site')); continue
        if os.path.exists(os.path.join(ROOT, 'games', slug)): skipped.append((title, 'folder games/%s exists' % slug)); continue
        if not os.path.isdir(res) or not os.path.exists(img): skipped.append((title, 'missing lesson folder or picture')); continue
        url = '%s/games/%s/' % (SITE, slug)
        if not a.dry_run:
            shutil.copytree(res, os.path.join(ROOT, 'games', slug))
            make_thumb(img, os.path.join(ROOT, 'img', 'c15x', slug + '.jpg'))
        t = html.escape(title, quote=False)
        cards.append('\t\t<div class="game-card" onclick="openGame(\'%s\', \'Google Docs\')">\n\t\t<img src="img/c15x/%s.jpg" alt="%s" loading="lazy" decoding="async">\n\t\t<h3>%s</h3>\n\t</div>' % (url, slug, html.escape(title), t))
        urls.append(url); have.add(norm(title)); done.append(title)
    if cards and not a.dry_run:
        if src.count(GRID_END) != 1: sys.exit('could not find the end of the game grid')
        src = src.replace(GRID_END, '\n' + '\n'.join(cards) + GRID_END)
        m = re.search(r'const links = \[(.*?)\n(\s*)\];', src, re.S)
        if not m: sys.exit('could not find the random-game list')
        body = m.group(1).rstrip()
        add = ('' if body.endswith(',') else ',') + ''.join('\n\t  "%s",' % u for u in urls)
        src = src[:m.start(1)] + body + add + src[m.start(1) + len(m.group(1)):]
        open(INDEX, 'w', encoding='utf-8').write(src)
    print('added %d, skipped %d' % (len(done), len(skipped)))
    for t, why in skipped: print('  skipped %s: %s' % (t, why))
    return 0


if __name__ == '__main__':
    sys.exit(main())
