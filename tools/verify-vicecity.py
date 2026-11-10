#!/usr/bin/env python3
"""Slow check for the one huge game (classroom-15x lesson170, a ~630 MB download).
Serves the lesson folder locally, opens it in Chromium, and every 20 s records the loading text and a photo, for up to --minutes."""
import argparse, asyncio, json, os, shutil, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib.util
spec = importlib.util.spec_from_file_location('vg', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'verify-games.py'))
vg = importlib.util.module_from_spec(spec); spec.loader.exec_module(vg)


async def run(url, out, minutes):
    from playwright.async_api import async_playwright
    log = []
    async with async_playwright() as p:
        b = await p.chromium.launch(args=vg.LAUNCH_ARGS)
        ctx = await b.new_context(viewport={'width': 1280, 'height': 720})
        page = await ctx.new_page()
        errs, fails = [], []
        page.on('pageerror', lambda e: errs.append(str(e)[:160]))
        page.on('requestfailed', lambda r: fails.append(r.url[:140]))
        await page.goto(url, wait_until='domcontentloaded', timeout=60000)
        t0 = time.time(); i = 0
        while time.time() - t0 < minutes * 60:
            await page.wait_for_timeout(20000); i += 1
            row = {'t': int(time.time() - t0)}
            try:
                row['text'] = (await page.evaluate('(document.body.innerText||"").replace(/\\s+/g," ").slice(0,200)'))
                row['visible'] = await page.evaluate('[...document.querySelectorAll("canvas,video")].map(e=>e.tagName+":"+e.getBoundingClientRect().width+"x"+e.getBoundingClientRect().height)')
            except Exception as e:
                row['text'] = 'eval failed: ' + str(e)[:80]
            try:
                png = await page.screenshot(timeout=60000)
                path = os.path.join(out, 'vc_%02d.png' % i); open(path, 'wb').write(png); row['shot'] = os.path.basename(path)
            except Exception as e:
                row['shot'] = 'timeout'
            if i in (6, 12, 18):
                try: await page.mouse.click(640, 360); await page.keyboard.press('Enter')
                except Exception: pass
            log.append(row); print(row, flush=True)
        json.dump({'log': log, 'errors': errs[:20], 'failed': fails[:20]}, open(os.path.join(out, 'vicecity.json'), 'w'), indent=1)
        await b.close()


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--lessons', required=True); ap.add_argument('--out', default='verify-out'); ap.add_argument('--minutes', type=int, default=10)
    a = ap.parse_args(); os.makedirs(a.out, exist_ok=True)
    site = os.path.join(a.out, '_site'); shutil.rmtree(site, ignore_errors=True); os.makedirs(os.path.join(site, 'games'))
    shutil.copytree(os.path.join(a.lessons, 'resources', 'lesson170'), os.path.join(site, 'games', 'lesson170'))
    srv, base = vg.serve(site)
    asyncio.run(run('%s/games/lesson170/' % base, a.out, a.minutes))
    srv.shutdown(); shutil.rmtree(site, ignore_errors=True)


if __name__ == '__main__':
    main()
