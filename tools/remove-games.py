#!/usr/bin/env python3
"""Take games whose pages no longer exist off the site, and keep a record so they can be put back.

  python3 tools/remove-games.py URLS.txt [--reason "text"] [--dry-run]
  python3 tools/remove-games.py --restore [--only "Title"]       put removed games back (from tools/removed-games.json)

URLS.txt holds one game address per line (exactly as written in index.html).
Each removed game is written to tools/removed-games.json with its title, address, picture and the card's HTML, and its
address is taken out of the random-game list (const links = [...]). Pictures stay in the repo, so restoring is instant.
"""
import argparse, datetime, html, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX = os.path.join(ROOT, 'index.html')
LOG = os.path.join(ROOT, 'tools', 'removed-games.json')
GRID_END = '\n\t\t\t\n\t</div>\n        <div class="empty" id="searchEmpty"'
CARD = re.compile(r'[ \t]*<div class="game-card"[^>]*openGame\(\s*([\'"])(.*?)\1[^>]*>.*?</div>[ \t]*\n?', re.S)


def load_log():
    return json.load(open(LOG, encoding='utf-8')) if os.path.exists(LOG) else []


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('urls', nargs='?'); ap.add_argument('--reason', default='page no longer exists')
    ap.add_argument('--dry-run', action='store_true'); ap.add_argument('--restore', action='store_true'); ap.add_argument('--only', default='')
    a = ap.parse_args()
    src = open(INDEX, encoding='utf-8').read()
    log = load_log()

    if a.restore:
        back = [e for e in log if not a.only or e['title'].lower() == a.only.lower()]
        if not back: print('nothing to restore'); return 0
        src = src.replace(GRID_END, '\n' + '\n'.join(e['card'] for e in back) + GRID_END)
        m = re.search(r'const links = \[(.*?)\n(\s*)\];', src, re.S)
        body = m.group(1).rstrip(); add = ('' if body.endswith(',') else ',') + ''.join('\n\t  "%s",' % e['url'] for e in back if e.get('in_random_list', True))
        src = src[:m.start(1)] + body + add + src[m.start(1) + len(m.group(1)):]
        open(INDEX, 'w', encoding='utf-8').write(src)
        json.dump([e for e in log if e not in back], open(LOG, 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
        print('restored %d' % len(back)); return 0

    want = [l.strip() for l in open(a.urls, encoding='utf-8') if l.strip() and not l.startswith('#')]
    wantset = set(want)
    grid_at = src.index('id="gameGrid"')
    head, grid = src[:grid_at], src[grid_at:]
    removed, missing = [], set(wantset)
    lm = re.search(r'const links = \[(.*?)\n(\s*)\];', src, re.S)
    in_links = set(re.findall(r'"(https?://[^"]+)"', lm.group(1))) if lm else set()

    def take(m):
        url = html.unescape(m.group(2))
        if url not in wantset: return m.group(0)
        card = m.group(0).rstrip('\n')
        t = re.search(r'<h3>(.*?)</h3>', card, re.S); img = re.search(r'<img[^>]*src="([^"]+)"', card)
        removed.append({'title': html.unescape(t.group(1)).strip() if t else '', 'url': url, 'img': img.group(1) if img else '',
                        'in_random_list': url in in_links, 'reason': a.reason, 'removed': datetime.date.today().isoformat(), 'card': card})
        missing.discard(url)
        return ''
    grid = CARD.sub(take, grid)
    src = head + grid
    m = re.search(r'const links = \[(.*?)\n(\s*)\];', src, re.S)
    if m:
        kept = [l for l in m.group(1).split('\n') if not (re.search(r'"([^"]+)"', l) and re.search(r'"([^"]+)"', l).group(1) in wantset)]
        src = src[:m.start(1)] + '\n'.join(kept) + src[m.end(1):]
    print('removed %d game(s); %d address(es) not found in the grid' % (len(removed), len(missing)))
    for u in sorted(missing)[:10]: print('  not found:', u)
    if not a.dry_run:
        open(INDEX, 'w', encoding='utf-8').write(src)
        json.dump(log + removed, open(LOG, 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
    return 0


if __name__ == '__main__':
    sys.exit(main())
