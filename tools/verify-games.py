#!/usr/bin/env python3
"""Open game pages in a real browser (Chromium + Playwright) and report which ones actually show something.

  python3 tools/verify-games.py --mode ours     test every game address in index.html
  python3 tools/verify-games.py --mode lessons  test every game folder of a classroom-15x checkout (served locally at /games/<folder>/)

Why: an address that answers "200 OK" can still show a white page (the game files it loads are gone). So each page is opened for real,
given time to load, photographed, clicked once in the middle (many games wait for a click) and photographed again.

Verdicts per page
  ok          something is drawn (the picture is not one flat colour) and the page did not show an error
  blank       nothing visible after loading and after a click (white / black / single colour page)
  error       the page answered with an error (HTTP 4xx/5xx or an error page text)
  unreachable the browser could not connect at all (DNS error, refused, certificate problem)
  timeout     the page did not finish loading in time
Pages that are not "ok" in the first pass are tried again, slower, in a second pass; only the second answer counts.

This is meant to run on GitHub Actions (.github/workflows/verify-games.yml), where the network is open. Results go to --out.
"""
import argparse, asyncio, collections, html, io, json, os, re, shutil, sys, threading, time, warnings
warnings.filterwarnings("ignore", category=DeprecationWarning)
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ERR_TEXT = re.compile(r"(^|\s)(404|403|410|502|503)(\s|$)|not found|can.?t be reached|isn.?t a github pages site|no such app|access denied|forbidden|bad gateway|service unavailable|this page isn.?t working|err_[a-z_]+", re.I)
LAUNCH_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', '--mute-audio', '--no-sandbox']


def read_games(index_path):
    src = open(index_path, encoding='utf-8').read()
    grid = src[src.index('id="gameGrid"'):]
    out, seen = [], set()
    for m in re.finditer(r'<div class="game-card"[^>]*?onclick="openGame\(\'([^\']+)\'[^"]*"[^>]*>(.*?)</div>', grid, re.S):
        url, inner = html.unescape(m.group(1)), m.group(2)
        h = re.search(r'<h3>(.*?)</h3>', inner, re.S)
        title = re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', h.group(1)))).strip() if h else ''
        if title and url not in seen:
            seen.add(url); out.append({'key': url, 'title': title, 'url': url})
    return out


def analyse(png):
    """How flat is the picture? Returns the share taken by its most common colour and how many colours it has."""
    from PIL import Image
    im = Image.open(io.BytesIO(png)).convert('RGB'); im.thumbnail((192, 108))
    px = list(im.getdata()); n = len(px)
    c = collections.Counter((r >> 3, g >> 3, b >> 3) for r, g, b in px)
    top = c.most_common(1)[0][1] / n
    return {'top': round(top, 3), 'colors': len(c), 'blank': top >= 0.985 or len(c) <= 3}


def save_shot(png, path, w=480):
    from PIL import Image
    im = Image.open(io.BytesIO(png)).convert('RGB'); im.thumbnail((w, w * 9 // 16 + 1))
    im.save(path, 'JPEG', quality=58, optimize=True)


async def probe(browser, t, wait_ms, shots_dir, sem, clicks=1, shot_w=480):
    async with sem:
        res = {'key': t['key'], 'title': t.get('title', ''), 'url': t['url'], 'verdict': 'timeout', 'detail': ''}
        ctx = await browser.new_context(viewport={'width': 1280, 'height': 720}, ignore_https_errors=False)
        page = await ctx.new_page()
        errs, failed, bad = [], [], []
        page.on('pageerror', lambda e: errs.append(str(e)[:120]))
        page.on('requestfailed', lambda r: failed.append(r.url[:140]))
        page.on('response', lambda r: bad.append('%d %s' % (r.status, r.url[:140])) if r.status >= 400 else None)

        def popup(p):
            if p is not page:
                asyncio.ensure_future(p.close())
        ctx.on('page', popup)
        t0 = time.time()
        try:
            try:
                resp = await page.goto(t['url'], wait_until='domcontentloaded', timeout=35000)
            except Exception as e:
                msg = str(e)
                kind = 'unreachable' if re.search(r'ERR_(NAME_NOT_RESOLVED|CONNECTION_REFUSED|CONNECTION_RESET|CERT|SSL|ADDRESS_UNREACHABLE|TUNNEL)', msg) else 'timeout'
                res.update(verdict=kind, detail=re.sub(r'\s+', ' ', msg)[:160]); return res
            status = resp.status if resp else 0
            await page.wait_for_timeout(wait_ms)
            shot1 = await page.screenshot()
            text = ''
            try:
                for fr in page.frames[:6]:
                    text += ' ' + (await fr.evaluate('(document.body && document.body.innerText || "").slice(0,400)'))
            except Exception:
                pass
            text = re.sub(r'\s+', ' ', text).strip()
            title = ''
            try:
                title = (await page.title())[:80]
            except Exception:
                pass
            spots = [(640, 360), (640, 440), (400, 360), (880, 360), (640, 280), (640, 600)]
            for i in range(max(1, clicks)):
                await page.mouse.click(*spots[i % len(spots)])
                await page.wait_for_timeout(3500 if clicks <= 1 else 4000)
            shot2 = await page.screenshot()
            a1, a2 = analyse(shot1), analyse(shot2)
            res.update(status=status, page_title=title, text=text[:160], first=a1, after_click=a2, errors=len(errs), failed_requests=len(failed),
                       bad_responses=bad[:4], seconds=round(time.time() - t0, 1))
            if status >= 400 or (len(text) < 140 and ERR_TEXT.search(text) and a1['blank']):
                res.update(verdict='error', detail='HTTP %d %s' % (status, text[:80]))
            elif a1['blank'] and a2['blank']:
                res.update(verdict='blank', detail='nothing visible; %d requests failed, %d script errors' % (len(failed), len(errs)))
            else:
                res.update(verdict='ok')
            if shots_dir:
                base = os.path.join(shots_dir, re.sub(r'[^A-Za-z0-9._-]+', '_', t['key'])[-90:])
                save_shot(shot2 if (a1['blank'] and not a2['blank']) else shot1, base + '.jpg', shot_w)
                if clicks > 1:
                    save_shot(shot1, base + '_a.jpg', shot_w); save_shot(shot2, base + '_b.jpg', shot_w)
        except Exception as e:
            res.update(verdict='timeout', detail=re.sub(r'\s+', ' ', str(e))[:160])
        finally:
            try:
                await ctx.close()
            except Exception:
                pass
        return res


async def run(targets, workers, wait_ms, shots_dir, passes=2, clicks=1, shot_w=480):
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=LAUNCH_ARGS)
        sem = asyncio.Semaphore(workers)
        done = {}
        first = await asyncio.gather(*[probe(browser, t, wait_ms, shots_dir, sem, clicks, shot_w) for t in targets])
        for r in first:
            r['pass1'] = r['verdict']; done[r['key']] = r
        print('pass 1:', dict(collections.Counter(r['verdict'] for r in first)), flush=True)
        if passes > 1:
            again = [t for t in targets if done[t['key']]['verdict'] != 'ok']
            if again:
                await asyncio.sleep(20)
                second = await asyncio.gather(*[probe(browser, t, wait_ms * 2, shots_dir, sem, clicks, shot_w) for t in again])
                for r in second:
                    r['pass1'] = done[r['key']]['pass1']; done[r['key']] = r
                print('pass 2 (retry of %d):' % len(again), dict(collections.Counter(r['verdict'] for r in second)), flush=True)
        await browser.close()
    return [done[t['key']] for t in targets]


def serve(directory):
    handler = partial(SimpleHTTPRequestHandler, directory=directory)
    handler.log_message = lambda *a, **k: None
    srv = ThreadingHTTPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, 'http://127.0.0.1:%d' % srv.server_address[1]


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument('--mode', choices=['ours', 'lessons', 'urls'], required=True)
    ap.add_argument('--index', default=os.path.join(ROOT, 'index.html'))
    ap.add_argument('--lessons', default='', help='path to a classroom-15x checkout (mode lessons)')
    ap.add_argument('--urls', default='', help='text file with one address per line (mode urls)')
    ap.add_argument('--out', default=os.path.join(ROOT, 'verify-out'))
    ap.add_argument('--workers', type=int, default=6)
    ap.add_argument('--wait', type=int, default=9000, help='milliseconds to let a page load before the first photo')
    ap.add_argument('--limit', type=int, default=0)
    ap.add_argument('--passes', type=int, default=2)
    ap.add_argument('--only', default='', help='text file listing the lesson folders (or addresses) to test; others are skipped')
    ap.add_argument('--clicks', type=int, default=1, help='how many times to click while testing (confirm runs use 4)')
    ap.add_argument('--shot-width', type=int, default=480)
    ap.add_argument('--tag', default='', help='added to the results file name, e.g. confirm')
    a = ap.parse_args(argv)

    os.makedirs(a.out, exist_ok=True)
    shots = os.path.join(a.out, 'shots-' + a.mode + (('-' + a.tag) if a.tag else '')); os.makedirs(shots, exist_ok=True)
    srv = None
    if a.mode == 'ours':
        targets = read_games(a.index)
    elif a.mode == 'urls':
        targets = [{'key': u.strip(), 'title': '', 'url': u.strip()} for u in open(a.urls) if u.strip() and not u.startswith('#')]
    else:
        res = os.path.join(a.lessons, 'resources')
        site = os.path.join(a.out, '_site'); shutil.rmtree(site, ignore_errors=True); os.makedirs(os.path.join(site, 'games'))
        names = sorted(d for d in os.listdir(res) if os.path.isdir(os.path.join(res, d)))
        for d in names:
            shutil.copytree(os.path.join(res, d), os.path.join(site, 'games', d))
        srv, base = serve(site)
        targets = [{'key': d, 'title': d, 'url': '%s/games/%s/' % (base, d)} for d in names]
    if a.only:
        want = [l.strip() for l in open(a.only) if l.strip() and not l.startswith('#')]
        targets = [t for t in targets if t['key'] in want]
    if a.limit:
        targets = targets[:a.limit]
    print('testing %d pages (%s)' % (len(targets), a.mode), flush=True)
    results = asyncio.run(run(targets, a.workers, a.wait, shots, a.passes, a.clicks, a.shot_width))
    summary = dict(collections.Counter(r['verdict'] for r in results))
    json.dump({'mode': a.mode, 'when': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'summary': summary, 'results': results},
              open(os.path.join(a.out, 'results-%s.json' % (a.mode + (('-' + a.tag) if a.tag else ''))), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
    print('summary:', summary)
    if srv:
        srv.shutdown()
        shutil.rmtree(os.path.join(a.out, '_site'), ignore_errors=True)
    return 0


if __name__ == '__main__':
    sys.exit(main())
