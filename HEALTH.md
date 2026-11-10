# Game health

No check has run yet. The first one runs automatically on Monday, or press **Run workflow** on the "Check games" action in the GitHub Actions tab.

## Game clear-out tools (2026-11-10)

- `tools/verify-games.py` + the "Verify games" / "Confirm" / "Recheck" workflows open games in a real browser on GitHub and report which ones run. Results land on the `verify-results`, `verify-confirm` and `recheck-results` branches.
- `tools/remove-games.py URLS.txt` takes games off the site and records them in `tools/removed-games.json` (title, address, picture, the card's HTML). `python3 tools/remove-games.py --restore` puts them all back (or `--only "Title"` for one).
- `tools/import-lessons.py PLAN.json --lessons <classroom-15x folder>` copies classroom-15x games into `games/<name>/`, makes their thumbnails in `img/c15x/`, adds the cards and the random-game entries.
- On 2026-11-10 the sites ubg42.github.io and monkeygg2.github.io (and a few smaller ones) answered "site not found", so 347 games were removed and 68 tested classroom-15x games were added.
