#!/usr/bin/env python3
"""Test candidate games the way UBG45 really shows them: inside an iframe on a page that belongs to https://ubg45.github.io.

  python3 tools/verify-candidates.py --list candidates.json --out out [--local-dir DIR] [--workers 6] [--tag pfg]

candidates.json is a list of {"key": "slope-2", "title": "Slope 2", "url": "https://...", "thumb": "https://...jpg", "path": "hextris/"}.
  * "url" is an address on another website (tested as it is).
  * "path" is a folder inside --local-dir (a checkout of a game collection); it is served locally and tested the same way.

For every game it records
  verdict   ok | blank | blocked (the other site refuses to be shown inside another page) | framebust (the game tries to take over the tab)
            | error (HTTP error / "not found" text) | unreachable | timeout
  a photo before and after a click + key press, the text the game shows, and which address the frame ended up on.
It also downloads the game's picture, makes a 300x300 JPEG of it (like the other UBG45 thumbnails) and notes how big the original was.
Runs on GitHub Actions (open internet); see .github/workflows/verify-candidates.yml.
"""
import argparse, asyncio, collections, io, json, os, re, shutil, sys, threading, time, warnings
warnings.filterwarnings("ignore", category=DeprecationWarning)
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial

HERE = os.path.dirname(os.path.abspath(__file__))
LAUNCH_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', '--mute-audio', '--no-sandbox']
ERR_TEXT = re.compile(r"(^|\s)(404|403|410|502|503)(\s|$)|not found|can.?t be reached|isn.?t a github pages site|no such app|access denied|forbidden|bad gateway|service unavailable|this page isn.?t working|err_[a-z_]+|domain (is )?(for sale|expired)|site can.?t be reached", re.I)
HARNESS_PUBLIC = 'https://ubg45.github.io/__harness'
UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'


def analyse(png):
    from PIL import Image
    im = Image.open(io.BytesIO(png)).convert('RGB'); im.thumbnail((192, 108))
    px = list(im.getdata()); n = len(px)
    c = collections.Counter((r >> 3, g >> 3, b >> 3) for r, g, b in px)
    top = c.most_common(1)[0][1] / n
    return {'top': round(top, 3), 'colors': len(c), 'blank': top >= 0.985 or len(c) <= 3}


def save_shot(png, path, w=480):
    from PIL import Image
    im = Image.open(io.BytesIO(png)).convert('RGB'); im.thumbnail((w, w * 9 // 16 + 1))
    im.save(path, 'JPEG', quality=60, optimize=True)


def make_thumb(data, dst, size=300):
    from PIL import Image
    im = Image.open(io.BytesIO(data)); im.load()
    ow, oh = im.size
    im = im.convert('RGBA'); bg = Image.new('RGBA', im.size, (255, 255, 255, 255)); bg.alpha_composite(im); im = bg.convert('RGB')
    w, h = im.size; m = min(w, h)
    im = im.crop(((w - m) // 2, (h - m) // 2, (w - m) // 2 + m, (h - m) // 2 + m)).resize((size, size), Image.LANCZOS)
    im.save(dst, 'JPEG', quality=84, optimize=True, progressive=True)
    return ow, oh


async def fetch_image(ctx, url):
    """Download a picture; pictures PIL cannot read (webp variants, avif, svg) are drawn by the browser and photographed instead."""
    r = await ctx.request.get(url, headers={'User-Agent': UA, 'Referer': 'https://ubg45.github.io/'}, timeout=25000)
    if r.status >= 400:
        raise RuntimeError('HTTP %d' % r.status)
    data = await r.body()
    try:
        from PIL import Image
        im = Image.open(io.BytesIO(data)); im.load()
        return data, None
    except Exception:
        pg = await ctx.new_page()
        try:
            await pg.set_viewport_size({'width': 800, 'height': 800})
            await pg.goto(url, wait_until='load', timeout=25000)
            el = await pg.query_selector('img')
            png = await (el or pg).screenshot()
        finally:
            await pg.close()
        return png, 'drawn by the browser'


async def page_images(ctx, page_url):
    """Pictures a game's own page advertises (og:image, twitter:image, apple-touch-icon)."""
    try:
        from urllib.parse import urljoin
        r = await ctx.request.get(page_url, headers={'User-Agent': UA}, timeout=20000)
        if r.status >= 400:
            return []
        h = (await r.text())[:200000]
        found = re.findall(r'<meta[^>]+(?:property|name)=["\'](?:og:image|twitter:image)["\'][^>]+content=["\']([^"\']+)', h, re.I) + \
            re.findall(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+(?:property|name)=["\'](?:og:image|twitter:image)["\']', h, re.I) + \
            re.findall(r'<link[^>]+rel=["\']apple-touch-icon[^"\']*["\'][^>]+href=["\']([^"\']+)', h, re.I)
        return [urljoin(page_url, u) for u in found][:4]
    except Exception:
        return []


async def fetch_thumb(ctx, url, dst, page_url=''):
    out = {'thumb_ok': False}
    tries = [('given', url)] if url else []
    errs = []
    fell_back = False
    while True:
        for kind, u in tries:
            try:
                data, how = await fetch_image(ctx, u)
                ow, oh = make_thumb(data, dst)
                out.update(thumb_ok=True, thumb_w=ow, thumb_h=oh, thumb_bytes=len(data), thumb_from=u if kind != 'given' else 'repo list')
                if kind != 'given': out['thumb_source'] = 'game page (og:image)'
                if how: out['thumb_note'] = how
                return out
            except Exception as e:
                errs.append(re.sub(r'\s+', ' ', str(e))[:80])
        if fell_back or not page_url:
            break
        fell_back = True
        tries = [('page', u) for u in await page_images(ctx, page_url)]
        if not tries:
            break
    if errs:
        out['thumb_error'] = ' | '.join(errs)[:200]
    return out


async def probe(browser, t, base, wait_ms, dirs, sem, thumbs=True):
    async with sem:
        url = t['url'] if t.get('url') else base + '/' + t['path'].lstrip('/')
        res = {'key': t['key'], 'title': t.get('title', ''), 'url': url, 'verdict': 'timeout', 'detail': ''}
        HARNESS = base + '/__harness' if (base and not t.get('url')) else HARNESS_PUBLIC   # a local http game cannot sit inside an https page
        ctx = await browser.new_context(viewport={'width': 1280, 'height': 720}, user_agent=UA)
        page = await ctx.new_page()
        errs, bad, nav = [], [], {}
        page.on('pageerror', lambda e: errs.append(str(e)[:120]))
        page.on('response', lambda r: bad.append('%d %s' % (r.status, r.url[:120])) if r.status >= 400 else None)

        async def harness(route):
            body = ('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Google Docs</title><style>body{margin:0;overflow:hidden}iframe{width:100vw;height:100vh;border:none}</style></head><body>'
                    '<iframe id="g" src="%s" frameborder="0" allow="fullscreen; autoplay; gamepad; clipboard-write" allowfullscreen></iframe></body></html>' % url.replace('&', '&amp;').replace('"', '&quot;'))
            await route.fulfill(status=200, content_type='text/html', body=body)
        await ctx.route(HARNESS + '*', harness)

        def on_resp(r):
            try:
                if r.request.is_navigation_request() and r.frame.parent_frame is not None and r.frame.parent_frame == page.main_frame and 'frame' not in nav:
                    h = r.headers
                    nav.update(frame=1, status=r.status, xfo=h.get('x-frame-options', ''), csp=(h.get('content-security-policy', '') or '')[:300], final=r.url)
            except Exception:
                pass
        page.on('response', on_resp)
        top_changes = []
        page.on('framenavigated', lambda f: top_changes.append(f.url) if f == page.main_frame else None)
        t0 = time.time()
        try:
            try:
                await page.goto(HARNESS, wait_until='load', timeout=60000)
            except Exception as e:
                res.update(verdict='timeout', detail=re.sub(r'\s+', ' ', str(e))[:140]); return res
            await page.wait_for_timeout(wait_ms)
            frames = [f for f in page.frames if f != page.main_frame]
            fr = frames[0] if frames else None
            furl = fr.url if fr else ''
            if page.url.rstrip('/') != HARNESS.rstrip('/') and not page.url.startswith('about:blank'):
                res.update(verdict='framebust', detail='the game moved the whole tab to ' + page.url[:120]); return res
            xfo = (nav.get('xfo') or '').lower(); csp = (nav.get('csp') or '').lower()
            fa = re.search(r"frame-ancestors([^;]*)", csp)
            blocked_hdr = ('deny' in xfo or 'sameorigin' in xfo or (fa and '*' not in fa.group(1).split() and 'ubg45.github.io' not in fa.group(1) and 'https:' not in fa.group(1).split()))
            if furl.startswith('chrome-error') or blocked_hdr:
                res.update(verdict='blocked', detail=('x-frame-options=%s ' % xfo if xfo else '') + ('csp=%s' % (fa.group(0) if fa else '') if fa else '') + (' (browser refused)' if furl.startswith('chrome-error') else ''))
                if furl.startswith('chrome-error'):
                    return res
            shot1 = await page.screenshot()
            text = ''
            try:
                for f in frames[:5]:
                    text += ' ' + (await f.evaluate('(document.body && document.body.innerText || "").slice(0,500)'))
            except Exception:
                pass
            text = re.sub(r'\s+', ' ', text).strip()
            for pt in [(640, 360), (640, 440)]:
                await page.mouse.click(*pt); await page.wait_for_timeout(1500)
            await page.keyboard.press('Space'); await page.keyboard.press('ArrowRight')
            await page.wait_for_timeout(4000)
            shot2 = await page.screenshot()
            a1, a2 = analyse(shot1), analyse(shot2)
            if page.url.rstrip('/') != HARNESS.rstrip('/') and not page.url.startswith('about:blank'):
                res.update(verdict='framebust', detail='the game moved the whole tab to ' + page.url[:120]); return res
            res.update(status=nav.get('status', 0), frame_url=furl[:200], text=text[:300], first=a1, after_click=a2, errors=len(errs), bad_responses=bad[:4], seconds=round(time.time() - t0, 1))
            if nav.get('status', 200) >= 400 or (len(text) < 160 and ERR_TEXT.search(text)):
                res.update(verdict='error', detail='HTTP %s %s' % (nav.get('status', '?'), text[:100]))
            elif a1['blank'] and a2['blank']:
                res.update(verdict='blank', detail='nothing drawn; %d script errors' % len(errs))
            else:
                res.update(verdict='ok')
            if res['verdict'] == 'blocked':
                pass
            base_name = re.sub(r'[^A-Za-z0-9._-]+', '_', t['key'])[:90]
            save_shot(shot1, os.path.join(dirs['shots'], base_name + '_a.jpg')); save_shot(shot2, os.path.join(dirs['shots'], base_name + '_b.jpg'))
            if res['verdict'] == 'ok':
                try:
                    save_shot(shot2 if a1['blank'] else shot1, os.path.join(dirs['full'], base_name + '.jpg'), 640)
                except Exception:
                    pass
        except Exception as e:
            res.update(verdict='timeout', detail=re.sub(r'\s+', ' ', str(e))[:140])
        finally:
            if thumbs and (t.get('thumb') or t.get('url')):
                try:
                    res.update(await fetch_thumb(ctx, t['thumb'], os.path.join(dirs['thumbs'], re.sub(r'[^A-Za-z0-9._-]+', '_', t['key'])[:90] + '.jpg'), t.get('url', '')))
                except Exception:
                    pass
            try:
                await ctx.close()
            except Exception:
                pass
        return res


async def run(targets, base, workers, wait_ms, dirs, passes):
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=LAUNCH_ARGS)
        sem = asyncio.Semaphore(workers)
        done = {}
        first = await asyncio.gather(*[probe(browser, t, base, wait_ms, dirs, sem) for t in targets])
        for r in first:
            r['pass1'] = r['verdict']; done[r['key']] = r
        print('pass 1:', dict(collections.Counter(r['verdict'] for r in first)), flush=True)
        if passes > 1:
            again = [t for t in targets if done[t['key']]['verdict'] not in ('ok', 'blocked', 'framebust')]
            if again:
                await asyncio.sleep(15)
                second = await asyncio.gather(*[probe(browser, t, base, wait_ms * 2, dirs, sem, thumbs=False) for t in again])
                for r in second:
                    old = done[r['key']]
                    for k in ('thumb_ok', 'thumb_w', 'thumb_h', 'thumb_bytes', 'thumb_error'):
                        if k in old: r[k] = old[k]
                    r['pass1'] = old['pass1']; done[r['key']] = r
                print('pass 2 (retry of %d):' % len(again), dict(collections.Counter(r['verdict'] for r in second)), flush=True)
        await browser.close()
    return [done[t['key']] for t in targets]


def serve(directory):
    handler = partial(SimpleHTTPRequestHandler, directory=directory)
    handler.log_message = lambda *a, **k: None
    srv = ThreadingHTTPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, 'http://127.0.0.1:%d' % srv.server_address[1]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--list', required=True); ap.add_argument('--out', required=True)
    ap.add_argument('--local-dir', default=''); ap.add_argument('--workers', type=int, default=6)
    ap.add_argument('--wait', type=int, default=10000); ap.add_argument('--passes', type=int, default=2)
    ap.add_argument('--tag', default='run'); ap.add_argument('--limit', type=int, default=0)
    a = ap.parse_args()
    targets = json.load(open(a.list, encoding='utf-8'))
    if a.limit: targets = targets[:a.limit]
    dirs = {k: os.path.join(a.out, '%s-%s' % (k, a.tag)) for k in ('shots', 'thumbs', 'full')}
    for d in dirs.values(): os.makedirs(d, exist_ok=True)
    srv, base = (None, '')
    if a.local_dir:
        srv, base = serve(a.local_dir)
    print('testing %d games' % len(targets), flush=True)
    results = asyncio.run(run(targets, base, a.workers, a.wait, dirs, a.passes))
    summary = dict(collections.Counter(r['verdict'] for r in results))
    json.dump({'when': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'summary': summary, 'results': results}, open(os.path.join(a.out, 'results-%s.json' % a.tag), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
    print('summary:', summary)
    if srv: srv.shutdown()
    return 0


if __name__ == '__main__':
    sys.exit(main())
