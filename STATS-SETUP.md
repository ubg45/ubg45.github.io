# Trending: how the play statistics work (Supabase)

UBG45 stores anonymous play counts in your Supabase project **ubg43-global-trending**
(`https://wewynhmybroxzynaxnrx.supabase.co`) in its own table, `ubg45_daily_stats`
(the UBG43 tables `game_trending` and `game_play_events` are not touched).

* Per day and per game id: number of opens and seconds played. No accounts, no IPs, nothing personal.
* The table is locked (RLS on, no policies). The site can only call two functions:
  * `ubg45_record(p_game, p_opens, p_seconds)` - adds at most +1 open / +60 seconds per call, game id must match `[a-z0-9-]{1,80}`, at most 700 different games per day.
  * `ubg45_stats(p_days)` - returns opens/seconds per game summed over the last N days (max 30).
* The key in `ubg45-config.js` (`supabaseKey`, a `sb_publishable_...` key) is meant to be public.
* A game gets the Trending tag when, in the last 7 days, it has 3+ opens or 15+ minutes played (always 2+ opens), top 12 by score.
  The homepage row is labelled "Trending" once 3+ games qualify, otherwise "Popular".
* Players can switch sharing off in Settings.

## Notes
* Supabase free projects pause after about 7 days with no activity at all; restore it from the dashboard if that happens (visitors playing games keeps it awake).
* To see the data: Supabase dashboard -> SQL editor -> `select * from ubg45_daily_stats order by day desc, opens desc;`
* To reset the stats: `delete from ubg45_daily_stats;`
* To use Firebase Realtime Database instead, empty `supabaseUrl`/`supabaseKey` and set `databaseUrl` (rules in `database.rules.json`).

## New tags
`tools/stamp-added.py` (run by the GitHub workflow on every push) records the date each game first appears and refreshes the `?v=` version
on the css/js tags in index.html. A game shows "New" for 14 days.
