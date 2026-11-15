/* UBG45 -> Google Sheet.  Paste this whole file into Extensions > Apps Script of your Google Sheet.
 * Every game report and every developer submission from the site shows up as a new row.
 * The SECRET below must match the one in the UBG45 database (already filled in). Keep this file private. */
var SECRET = "PASTE-THE-SECRET-FROM-THE-ubg45_config-TABLE";
var TZ = 'Australia/Sydney';
var SITE = 'https://ubg45.github.io/';

var REASONS = { load: "Won't load / blank screen", crash: 'Freezes or crashes', controls: "Controls don't work", ads: 'Pop-ups or redirects', unsuitable: 'Not suitable for school', other: 'Something else' };
var TABS = {
  Reports: ['Time', 'Game', 'Problem', 'Game page', 'Status', 'Notes'],
  Submissions: ['Time', 'Reference', 'Game', 'Developer', 'Email', 'Category', 'Description', 'How to play', 'Works on', 'Play link', 'Picture', 'Website', 'Status', 'Notes']
};

/* Run this once (Run > setup) to create the tabs. It also makes the "Summary" tab. */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(TABS).forEach(function (n) { sheet_(ss, n); });
  var s = ss.getSheetByName('Summary') || ss.insertSheet('Summary', 0);
  s.clear();
  s.getRange('A1').setValue('Reports per game (all time)').setFontWeight('bold').setFontSize(13);
  s.getRange('A3').setFormula('=IFERROR(QUERY(Reports!B2:B,"select B, count(B) where B is not null group by B order by count(B) desc label B \'Game\', count(B) \'Reports\'",0),"No reports yet")');
  s.getRange('D1').setValue('New submissions waiting').setFontWeight('bold').setFontSize(13);
  s.getRange('D3').setFormula('=COUNTIF(Submissions!M2:M,"New")');
  s.setColumnWidth(1, 220); s.setColumnWidth(4, 190);
  SpreadsheetApp.flush();
}

function sheet_(ss, name) {
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  var head = TABS[name];
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#2f5bff').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    var widths = name === 'Reports' ? [150, 170, 190, 260, 110, 260] : [150, 100, 190, 160, 220, 110, 380, 220, 130, 300, 240, 240, 110, 260];
    widths.forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
    var statusCol = name === 'Reports' ? 5 : 13;
    sh.getRange(2, statusCol, 1000, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(name === 'Reports' ? ['New', 'Checking', 'Fixed', 'Removed', 'Ignore'] : ['New', 'Playing it', 'Added', 'Declined'], true).build());
    if (name === 'Submissions') sh.getRange(2, 7, 1000, 1).setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
  }
  return sh;
}

/* stops anything a visitor typed from running as a formula in the sheet */
function safe_(v) {
  v = v == null ? '' : String(v);
  return /^[=+\-@\t\r]/.test(v) ? "'" + v : v;
}
function link_(url, label) {
  url = String(url || '');
  if (!/^https:\/\/[^\s"<>]+$/.test(url)) return safe_(url);
  return '=HYPERLINK("' + url.replace(/"/g, '%22') + '","' + String(label).replace(/"/g, '') + '")';
}
function out_(t) { return ContentService.createTextOutput(t); }

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var d = JSON.parse(e.postData.contents);
    if (!d || d.secret !== SECRET) return out_('forbidden');
    lock.waitLock(15000);
    var ss = SpreadsheetApp.getActiveSpreadsheet(), p = d.data || {}, now = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm');
    if (d.kind === 'report') {
      var sh = sheet_(ss, 'Reports'), slug = String(p.game || '');
      var title = slug.split('-').map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ');
      sh.appendRow([now, safe_(title), REASONS[p.reason] || 'Something else', link_(SITE + '#/play/' + slug, 'Open game page'), 'New', '']);
    } else if (d.kind === 'submission') {
      var s2 = sheet_(ss, 'Submissions');
      s2.appendRow([now, safe_(p.ref), safe_(p.title), safe_(p.dev), safe_(p.email), safe_(p.category), safe_(p.desc), safe_(p.controls), safe_(p.platforms),
        link_(p.url, p.url), p.thumb ? link_(p.thumb, 'Picture') : '', p.site ? link_(p.site, p.site) : '', 'New', '']);
    } else return out_('unknown');
    return out_('ok');
  } catch (err) {
    return out_('error: ' + err);
  } finally {
    try { lock.releaseLock(); } catch (e2) { /* not locked */ }
  }
}

function doGet() { return out_('UBG45 sheet is running.'); }
