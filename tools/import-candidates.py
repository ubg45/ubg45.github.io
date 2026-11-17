#!/usr/bin/env python3
"""Add tested games to UBG45.

  python3 tools/import-candidates.py PLAN.json [--dry-run]

PLAN.json is a list of games, each one of three kinds:
  {"kind": "url",   "title": "Slope 2",  "slug": "slope-2",  "url": "https://other-site/slope-2/", "thumb": "/path/picture.jpg"}
      a game that lives on another website: only the card is added (picture is saved as img/pfg/<slug>.jpg)
  {"kind": "dir",   "title": "Vex 3",    "slug": "vex-3",    "src": "/path/to/folder", "thumb": "/path/picture.jpg", "pics": "mgg2"}
      a game folder that is copied into games/<slug>/ (served from our own site)
  {"kind": "flash", "title": "Sugar, Sugar", "slug": "sugar-sugar", "swf": "/path/sugar-sugar.swf", "player": "/path/to/flash-player-folder", "thumb": "..."}
      a Flash game: the Ruffle player is installed once in games/flash/ and the .swf is copied to games/flash/files/<slug>.swf
For every game this adds a card at the end of the game grid in index.html and the game's address to the random-game list.
A game whose title is already on the site, or whose folder already exists, is skipped, so running it twice is safe.
"""
import argparse, html, json, os, re, shutil, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX = os.path.join(ROOT, 'index.html')
SITE = 'https://ubg45.github.io'
GRID_END = '\n\t\t\t\n\t</div>\n        <div class="empty" id="searchEmpty"'
PLAYER_FILES = re.compile(r'^(index\.html|ruffle\.js|core\.ruffle\..*\.js|.*\.wasm)$')


def slugify(t):
    s = re.sub(r'[^a-z0-9]+', '-', t.lower().replace("'", '').replace('&', 'and')).strip('-')
    return s or 'game'


def norm(s):
    s = html.unescape(s).lower().replace('&', ' and ')
    s = re.sub(r'\b(unblocked|online|game|games|play|free|the|hacked|3d)\b', ' ', s)
    return re.sub(r'[^a-z0-9]', '', s)


def square_thumb(src, dst, size=300):
    im = Image.open(src).convert('RGBA')
    bg = Image.new('RGBA', im.size, (255, 255, 255, 255)); bg.alpha_composite(im); im = bg.convert('RGB')
    w, h = im.size
    if w == h == size and src.lower().endswith('.jpg'):
        os.makedirs(os.path.dirname(dst), exist_ok=True); shutil.copyfile(src, dst); return
    m = min(w, h)
    im = im.crop(((w - m) // 2, (h - m) // 2, (w - m) // 2 + m, (h - m) // 2 + m)).resize((size, size), Image.LANCZOS)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    im.save(dst, 'JPEG', quality=84, optimize=True, progressive=True)


def install_player(player):
    dst = os.path.join(ROOT, 'games', 'flash')
    os.makedirs(os.path.join(dst, 'files'), exist_ok=True)
    for f in os.listdir(player):
        if PLAYER_FILES.match(f) and os.path.isfile(os.path.join(player, f)):
            if not os.path.exists(os.path.join(dst, f)): shutil.copyfile(os.path.join(player, f), os.path.join(dst, f))
    return dst


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('plan'); ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()
    plan = json.load(open(a.plan, encoding='utf-8'))
    src = open(INDEX, encoding='utf-8').read()
    have = {norm(t) for t in re.findall(r'<h3>(.*?)</h3>', src[src.index('id="gameGrid"'):], re.S)}
    have_urls = set(re.findall(r"openGame\('([^']+)'", src))
    cards, urls, done, skipped = [], [], [], []
    for p in plan:
        title, kind = p['title'], p['kind']
        slug = p.get('slug') or slugify(title)
        pics = p.get('pics') or ('pfg' if kind == 'url' else 'mgg2')
        if norm(title) in have: skipped.append((title, 'title already on the site')); continue
        if not p.get('thumb') or not os.path.exists(p['thumb']): skipped.append((title, 'no picture')); continue
        if kind == 'url':
            url = p['url']
            if url in have_urls: skipped.append((title, 'address already on the site')); continue
        elif kind == 'dir':
            url = '%s/games/%s/' % (SITE, slug)
            if os.path.exists(os.path.join(ROOT, 'games', slug)): skipped.append((title, 'folder games/%s exists' % slug)); continue
            if not os.path.isdir(p['src']): skipped.append((title, 'missing folder')); continue
        elif kind == 'flash':
            url = '%s/games/flash/?game=%s' % (SITE, slug)
            if os.path.exists(os.path.join(ROOT, 'games', 'flash', 'files', slug + '.swf')): skipped.append((title, 'swf exists')); continue
            if not os.path.exists(p['swf']): skipped.append((title, 'missing swf')); continue
        else:
            skipped.append((title, 'unknown kind')); continue
        if not a.dry_run:
            if kind == 'dir':
                shutil.copytree(p['src'], os.path.join(ROOT, 'games', slug), ignore=shutil.ignore_patterns('.git', '.DS_Store', 'node_modules', '*.zip', '*.md'))
            elif kind == 'flash':
                install_player(p['player'])
                shutil.copyfile(p['swf'], os.path.join(ROOT, 'games', 'flash', 'files', slug + '.swf'))
            square_thumb(p['thumb'], os.path.join(ROOT, 'img', pics, slug + '.jpg'))
        t = html.escape(title, quote=False)
        cards.append('\t\t<div class="game-card" onclick="openGame(\'%s\', \'Google Docs\')">\n\t\t<img src="img/%s/%s.jpg" alt="%s" loading="lazy" decoding="async">\n\t\t<h3>%s</h3>\n\t</div>' % (url, pics, slug, html.escape(title), t))
        urls.append(url); have.add(norm(title)); have_urls.add(url); done.append(title)
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
