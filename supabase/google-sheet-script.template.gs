/* UBG45 -> Google Sheet   (version 3: specific reports, report boxes, clearer overview)
 *
 * What you get in your Google Sheet (tabs along the bottom):
 *   Summary          the overview: what is waiting for you, the latest reports (game + problem + device), most reported games, problems
 *   Report inbox     ONE BOX PER REPORT: the game, the problem (coloured), the device, what the player wrote, a Status box you can change
 *   Developer inbox  ONE BOX PER DEVELOPER GAME: a CONTACT THEM bar (name + clickable email), the game, the developer, the picture, description, a review checklist and a Status box
 *   Reports          every report as one plain row (for sorting, filtering and searching)
 *   Submissions      every developer game as one plain row (for sorting, filtering and searching)
 *
 * HOW TO UPDATE (takes 1 minute):
 *   1. Extensions > Apps Script. Click in the code, press Ctrl+A, press Delete, then paste this whole file.
 *   2. Press the Save button (disk icon).
 *   3. In the toolbar pick "setup" in the drop-down and press Run (allow it if Google asks). It builds all the tabs.
 *   4. Deploy > Manage deployments > pencil (Edit) > Version: "New version" > Deploy.   (the web app link stays the same)
 *
 * The SECRET must match the one in the UBG45 database (already filled in). Keep this file private. */
var SECRET = 'PASTE-THE-SECRET-HERE';
var TZ = 'Australia/Sydney';
var SITE = 'https://ubg45.github.io/';
var VERSION = 3;

var REASONS = { load: "Won't load / blank screen", crash: 'Freezes or crashes', controls: "Controls don't work", ads: 'Pop-ups or redirects', unsuitable: 'Not suitable for school', other: 'Something else' };
var DEVICES = { computer: 'Computer', chromebook: 'Chromebook', phone: 'Phone', tablet: 'Tablet' };

var REPORT_HEAD = ['Time', 'Report', 'Game', 'Problem', 'Device', 'What the player wrote', 'Reports today', 'Reports this week', 'Game page'];
var SUB_HEAD = ['Time', 'Reference', 'Game', 'Developer', 'Email', 'Category', 'Description', 'How to play', 'Works on', 'Play link', 'Picture', 'Website'];
var SUB_STATUS = ['New', 'Playing it', 'Added', 'Declined'];
var REP_STATUS = ['New', 'Checking', 'Fixed', 'Removed', 'Ignore'];
var STATUS_LOOK = { 'New': ['#fff0d6', '#a15c00'], 'Playing it': ['#dfe9ff', '#1f3fcf'], 'Checking': ['#dfe9ff', '#1f3fcf'], 'Added': ['#d8f3e5', '#0e7a4b'], 'Fixed': ['#d8f3e5', '#0e7a4b'], 'Declined': ['#f6dcdc', '#9a3030'], 'Removed': ['#f6dcdc', '#9a3030'], 'Ignore': ['#e9ecf3', '#5b6685'] };
var PROBLEM_LOOK = {};
PROBLEM_LOOK[REASONS.load] = ['#fde1e1', '#a12626'];
PROBLEM_LOOK[REASONS.crash] = ['#ffe9d2', '#a15000'];
PROBLEM_LOOK[REASONS.controls] = ['#fff6c9', '#8a6a00'];
PROBLEM_LOOK[REASONS.ads] = ['#ece2ff', '#5a2fb3'];
PROBLEM_LOOK[REASONS.unsuitable] = ['#f6d7e8', '#9b1f62'];
PROBLEM_LOOK[REASONS.other] = ['#e9ecf3', '#5b6685'];

var COL = { blue: '#2f5bff', ink: '#1b2250', sky: '#e8eeff', violet: '#efe7ff', mint: '#e5f6ee', amber: '#fff0d6', grey: '#f4f6fb', label: '#5b6685', line: '#c9d2ea', note: '#fffbe6', white: '#ffffff', orange: '#e8590c', purple: '#6b3fd4' };
var CARD_TOP = 4;            // the newest box is always inserted at this row
var DEV_ROWS = 14;           // rows used by one developer box (13 + 1 spacer)
var REP_ROWS = 10;           // rows used by one report box (9 + 1 spacer)
var WEEK = 'TEXT(TODAY()-6,"yyyy-mm-dd")';   // "last 7 days" starts here

/* ================================================================ setup (run once) */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  try { ss.setSpreadsheetTimeZone(TZ); } catch (e) { /* keeps whatever time zone it had */ }
  migrate_(ss);
  reportInbox_(ss);
  devInbox_(ss);
  reports_(ss);
  table_(ss);
  summary_(ss);
  var blank = ss.getSheetByName('Sheet1');
  if (blank && blank.getLastRow() === 0 && ss.getNumSheets() > 1) ss.deleteSheet(blank);
  var order = ['Summary', 'Report inbox', 'Developer inbox', 'Reports', 'Submissions'];
  order.forEach(function (n, i) { var sh = ss.getSheetByName(n); if (sh) { ss.setActiveSheet(sh); ss.moveActiveSheet(i + 1); } });
  ss.getSheets().forEach(function (sh) { if (/\(old/.test(sh.getName())) { sh.setTabColor('#9aa3b8'); ss.setActiveSheet(sh); ss.moveActiveSheet(ss.getNumSheets()); } });
  ss.setActiveSheet(ss.getSheetByName('Summary'));
  SpreadsheetApp.flush();
}

/* The first time version 3 runs, the old "Reports" and "Submissions" tabs (different columns) are renamed "... (old)" so nothing is lost.
 * You can delete the "(old)" tabs whenever you like. */
function migrate_(ss) {
  var pr = PropertiesService.getScriptProperties();
  if (pr.getProperty('layout') === String(VERSION)) return;
  ['Reports', 'Submissions'].forEach(function (n) {
    var sh = ss.getSheetByName(n);
    if (!sh) return;
    var nm = n + ' (old)', i = 2;
    while (ss.getSheetByName(nm)) nm = n + ' (old ' + (i++) + ')';
    sh.setName(nm);
  });
  pr.setProperty('layout', String(VERSION));
}

/* Only if you want to throw the developer boxes away and make them again from the "Submissions" tab (this resets the checklists, Status and notes you typed). */
function rebuildInbox() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), inbox = devInbox_(ss), tab = table_(ss);
  if (inbox.getMaxRows() >= CARD_TOP) inbox.deleteRows(CARD_TOP, inbox.getMaxRows() - CARD_TOP + 1);
  if (inbox.getMaxRows() < CARD_TOP + DEV_ROWS) inbox.insertRowsAfter(inbox.getMaxRows(), CARD_TOP + DEV_ROWS - inbox.getMaxRows());
  var n = tab.getLastRow() - 1;
  if (n < 1) return;
  var rng = tab.getRange(2, 1, n, SUB_HEAD.length), vals = rng.getValues(), forms = rng.getFormulas();
  vals.forEach(function (r, i) {
    if (!String(r[2]).trim()) return;
    var url = function (c) { var m = /HYPERLINK\("([^"]+)"/.exec(forms[i][c] || ''); return m ? m[1] : String(r[c] || ''); };
    addDevCard_(inbox, { ref: r[1], title: r[2], dev: r[3], email: r[4], category: r[5], desc: r[6], controls: r[7], platforms: r[8], url: url(9), thumb: url(10), site: url(11) }, String(r[0]));
  });
}

/* ================================================================ the tabs */
function statusRules_(sh) {
  grow_(sh, 5000);
  var rng = sh.getRange('B' + (CARD_TOP - 1) + ':B5000')   /* starts one row ABOVE where new boxes are inserted, so new boxes are always inside it */, rules = [];
  Object.keys(STATUS_LOOK).forEach(function (t) { rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(t).setBackground(STATUS_LOOK[t][0]).setFontColor(STATUS_LOOK[t][1]).setRanges([rng]).build()); });
  sh.setConditionalFormatRules(rules);
}

function reportInbox_(ss) {
  var sh = ss.getSheetByName('Report inbox');
  if (sh) return sh;
  sh = ss.insertSheet('Report inbox');
  sh.setHiddenGridlines(true);
  sh.setTabColor(COL.orange);
  [120, 280, 150, 280].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  sh.getRange('A1:D1').merge().setValue('UBG45  ·  Report inbox').setFontSize(20).setFontWeight('bold').setFontColor(COL.orange).setVerticalAlignment('middle');
  sh.getRange('A2:D2').merge().setValue('One box per report from a player. Newest at the top. When you have dealt with one, change its Status box.').setFontColor(COL.label).setFontStyle('italic');
  sh.setRowHeight(1, 44); sh.setFrozenRows(2);
  statusRules_(sh);
  return sh;
}

function devInbox_(ss) {
  var sh = ss.getSheetByName('Developer inbox');
  if (!sh) {
    sh = ss.insertSheet('Developer inbox');
    sh.setHiddenGridlines(true);
    [120, 280, 120, 280].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
    sh.setRowHeight(1, 44); sh.setFrozenRows(2);
  }
  sh.setTabColor(COL.purple);
  sh.getRange('A1:D1').merge().setValue('UBG45  ·  Developer inbox').setFontSize(20).setFontWeight('bold').setFontColor(COL.purple).setVerticalAlignment('middle');
  sh.getRange('A2:D2').merge().setValue('One box per game a developer sent in. Newest at the top. Try the game, tick the checklist, then change its Status box.').setFontColor(COL.label).setFontStyle('italic');
  statusRules_(sh);
  return sh;
}

function head_(sh, names, widths, color) {
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, names.length).setValues([names]).setFontWeight('bold').setBackground(color || COL.blue).setFontColor('#ffffff').setVerticalAlignment('middle').setWrap(true);
    sh.setRowHeight(1, 34); sh.setFrozenRows(1);
    widths.forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  }
}
function colorRules_(sh, col, map, first, last) {
  var rng = sh.getRange(first, col, last - first + 1, 1), rules = [];
  Object.keys(map).forEach(function (t) { rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(t).setBackground(map[t][0]).setFontColor(map[t][1]).setRanges([rng]).build()); });
  return rules;
}
function tidy_(sh, cols) {
  try { if (!sh.getFilter()) sh.getRange(1, 1, sh.getMaxRows(), cols).createFilter(); } catch (e) { /* the filter is optional */ }
  try { if (sh.getBandings().length === 0) sh.getRange(2, 1, 4999, cols).applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, false, false); } catch (e2) { /* so is the banding */ }
}

function grow_(sh, rows) { if (sh.getMaxRows() < rows) sh.insertRowsAfter(sh.getMaxRows(), rows - sh.getMaxRows()); }

function reports_(ss) {
  var sh = ss.getSheetByName('Reports') || ss.insertSheet('Reports');
  grow_(sh, 5001);
  head_(sh, REPORT_HEAD, [140, 80, 190, 200, 110, 380, 90, 100, 170], COL.orange);
  sh.setTabColor('#c9d2ea');
  sh.setConditionalFormatRules(colorRules_(sh, 4, PROBLEM_LOOK, 2, 5000));
  sh.getRange(2, 1, 4999, 9).setVerticalAlignment('middle');
  sh.getRange(2, 6, 4999, 1).setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
  sh.getRange(2, 7, 4999, 2).setHorizontalAlignment('center');
  tidy_(sh, 9);
  return sh;
}

function table_(ss) {
  var sh = ss.getSheetByName('Submissions') || ss.insertSheet('Submissions');
  grow_(sh, 5001);
  head_(sh, SUB_HEAD, [140, 100, 190, 160, 220, 110, 380, 220, 130, 300, 240, 240], COL.purple);
  sh.setTabColor('#c9d2ea');
  sh.getRange(2, 1, 4999, 12).setVerticalAlignment('middle');
  sh.getRange(2, 7, 4999, 1).setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
  tidy_(sh, 12);
  return sh;
}

/* ================================================================ the overview */
function summary_(ss) {
  var s = ss.getSheetByName('Summary') || ss.insertSheet('Summary');
  s.getRange(1, 1, s.getMaxRows(), s.getMaxColumns()).breakApart();
  s.clear(); s.clearConditionalFormatRules(); s.setHiddenGridlines(true); s.setTabColor(COL.blue);
  s.getCharts().forEach(function (c) { s.removeChart(c); });
  [200, 200, 100, 130, 200, 160, 230, 130, 200, 200, 330].forEach(function (w, i) { s.setColumnWidth(i + 1, w); });
  s.getRange('A1:H1').merge().setValue('UBG45  ·  Overview').setFontSize(22).setFontWeight('bold').setFontColor(COL.blue).setVerticalAlignment('middle');
  s.getRange('A2:H2').merge().setFormula('="Live overview  ·  today is "&TEXT(TODAY(),"dddd d mmmm yyyy")&"  ·  all times are Sydney time"').setFontColor(COL.label).setFontStyle('italic');
  s.setRowHeight(1, 48); s.setRowHeight(2, 24); s.setRowHeight(3, 10);

  /* four big numbers */
  var boxes = [
    ['A', 'B', 'NEW REPORTS  ·  waiting for you', '=COUNTIFS(\'Report inbox\'!A3:A5000,"Status",\'Report inbox\'!B3:B5000,"New")', COL.amber],
    ['C', 'D', 'NEW DEVELOPER GAMES', '=COUNTIFS(\'Developer inbox\'!A3:A5000,"Status",\'Developer inbox\'!B3:B5000,"New")', COL.violet],
    ['E', 'F', 'REPORTS  ·  last 7 days', '=SUMPRODUCT(--(LEFT(Reports!A2:A5000,10)>=' + WEEK + '))', COL.sky],
    ['G', 'H', 'GAMES REPORTED  ·  last 7 days', '=IFERROR(COUNTA(UNIQUE(FILTER(Reports!C2:C5000,LEFT(Reports!A2:A5000,10)>=' + WEEK + '))),0)', COL.mint]
  ];
  boxes.forEach(function (b) {
    s.getRange(b[0] + '4:' + b[1] + '4').merge().setValue(b[2]).setFontSize(9).setFontWeight('bold').setFontColor(COL.label).setHorizontalAlignment('center').setVerticalAlignment('middle').setBackground(b[4]);
    s.getRange(b[0] + '5:' + b[1] + '5').merge().setFormula(b[3]).setFontSize(32).setFontWeight('bold').setFontColor(COL.ink).setHorizontalAlignment('center').setVerticalAlignment('middle').setBackground(b[4]);
    s.getRange(b[0] + '4:' + b[1] + '5').setBorder(true, true, true, true, false, false, COL.white, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  });
  s.setRowHeight(4, 28); s.setRowHeight(5, 64); s.setRowHeight(6, 16);
  s.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThan(0).setBackground('#ffc98a').setRanges([s.getRange('A5:B5')]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThan(0).setBackground('#d9c6ff').setRanges([s.getRange('C5:D5')]).build()
  ].concat(colorRules_(s, 2, PROBLEM_LOOK, 9, 16)).concat(colorRules_(s, 5, PROBLEM_LOOK, 20, 27)));

  /* latest reports + latest developer games */
  band_(s, 'A7:D7', 'LATEST REPORTS  ·  newest first', COL.orange);
  band_(s, 'E7:H7', 'LATEST DEVELOPER GAMES  ·  newest first', COL.purple);
  s.getRange('A8').setFormula('=IFERROR(QUERY(Reports!A2:I5000,"select C, D, E, A where A is not null order by A desc limit 8 label C \'Game\', D \'Problem\', E \'Device\', A \'When\'",0),"No reports yet")');
  s.getRange('E8').setFormula('=IFERROR(QUERY(Submissions!A2:L5000,"select C, D, E, A where A is not null order by A desc limit 8 label C \'Game\', D \'Developer\', E \'Email\', A \'When\'",0),"No developer games yet")');
  listLook_(s, 'A8:D16'); listLook_(s, 'E8:H16');

  /* last 7 days */
  band_(s, 'A18:D18', 'MOST REPORTED GAMES  ·  last 7 days', COL.blue);
  band_(s, 'E18:H18', 'WHAT PEOPLE REPORT  ·  last 7 days', COL.blue);
  s.getRange('A19').setFormula('=IFERROR(QUERY(Reports!A2:I5000,"select C, count(C) where A >= \'"&' + WEEK + '&"\' group by C order by count(C) desc limit 8 label C \'Game\', count(C) \'Reports\'",0),"No reports in the last 7 days")');
  s.getRange('E19').setFormula('=IFERROR(QUERY(Reports!A2:I5000,"select D, count(D) where A >= \'"&' + WEEK + '&"\' group by D order by count(D) desc limit 8 label D \'Problem\', count(D) \'Reports\'",0),"No reports in the last 7 days")');
  for (var r = 20; r <= 27; r++) {
    s.getRange('C' + r).setFormula('=IF(ISNUMBER(B' + r + '),REPT("█",MIN(B' + r + ',12)),"")');
    s.getRange('G' + r).setFormula('=IF(ISNUMBER(F' + r + '),REPT("█",MIN(F' + r + ',12)),"")');
  }
  s.getRange('C20:C27').setFontColor(COL.blue); s.getRange('G20:G27').setFontColor(COL.blue);
  listLook_(s, 'A19:D27'); listLook_(s, 'E19:H27');
  s.getRange('B19:B27').setHorizontalAlignment('center'); s.getRange('F19:F27').setHorizontalAlignment('center');
  for (var h = 7; h <= 27; h++) if (h !== 7 && h !== 18) s.setRowHeight(h, 26);
  s.setRowHeight(7, 28); s.setRowHeight(17, 16); s.setRowHeight(18, 28); s.setRowHeight(28, 16);

  /* your progress: how many boxes are in each Status */
  band_(s, 'A29:D29', 'REPORTS  ·  by Status', COL.orange);
  band_(s, 'E29:H29', 'DEVELOPER GAMES  ·  by Status', COL.purple);
  REP_STATUS.forEach(function (st, i) {
    var r = 30 + i;
    s.getRange('A' + r).setValue(st);
    s.getRange('B' + r).setFormula('=COUNTIFS(\'Report inbox\'!A3:A5000,"Status",\'Report inbox\'!B3:B5000,A' + r + ')').setHorizontalAlignment('center').setFontWeight('bold');
    s.getRange('C' + r).setFormula('=REPT("█",MIN(B' + r + ',12))').setFontColor(COL.orange);
  });
  SUB_STATUS.forEach(function (st, i) {
    var r = 30 + i;
    s.getRange('E' + r).setValue(st);
    s.getRange('F' + r).setFormula('=COUNTIFS(\'Developer inbox\'!A3:A5000,"Status",\'Developer inbox\'!B3:B5000,E' + r + ')').setHorizontalAlignment('center').setFontWeight('bold');
    s.getRange('G' + r).setFormula('=REPT("█",MIN(F' + r + ',12))').setFontColor(COL.purple);
  });
  s.getRange('A30:D34').setVerticalAlignment('middle').setBorder(true, true, true, true, false, true, COL.line, SpreadsheetApp.BorderStyle.SOLID);
  s.getRange('E30:H33').setVerticalAlignment('middle').setBorder(true, true, true, true, false, true, COL.line, SpreadsheetApp.BorderStyle.SOLID);
  for (var q = 30; q <= 34; q++) s.setRowHeight(q, 26);
  s.setRowHeight(35, 16);
  s.setConditionalFormatRules(s.getConditionalFormatRules().concat(colorRules_(s, 1, STATUS_LOOK, 30, 34)).concat(colorRules_(s, 5, STATUS_LOOK, 30, 33)));

  /* every detail a developer typed into the website form, newest first */
  band_(s, 'A36:K36', 'DEVELOPER GAMES  ·  every detail the developer entered  ·  newest first', COL.purple);
  s.getRange('A37').setFormula('=IFERROR(QUERY(Submissions!A2:L5000,"select A, C, F, I, D, E, J, L, H, K, G where A is not null order by A desc limit 10 label A \'When\', C \'Game\', F \'Category\', I \'Works on\', D \'Developer\', E \'Email\', J \'Play link\', L \'Website\', H \'How to play\', K \'Picture\', G \'Description\'",0),"No developer games yet")');
  listLook_(s, 'A37:K47');
  s.getRange('A38:K47').setWrap(true).setVerticalAlignment('top');
  s.setRowHeight(37, 26);
  for (var dr = 38; dr <= 47; dr++) s.setRowHeight(dr, 48);
  s.setRowHeight(48, 16);

  /* how it works */
  band_(s, 'A49:H49', 'HOW THIS WORKS', COL.ink);
  var help = [
    'Report inbox:  every report from a player is one box with the game, the problem, the device and what they wrote. Set its Status when you have looked at it (New > Checking > Fixed, Removed or Ignore).',
    'Developer inbox:  every game a developer sends in is one box. Try the play link, tick the checklist, then set the Status (New > Playing it > Added or Declined).',
    'Developer table (above):  everything a developer typed into the website form, one row per game. Click a game\'s box in the Developer inbox tab for clickable links.',
    'Reports and Submissions:  the same things as plain rows, for sorting, filtering and searching. Click the filter icon in the top row of those tabs.',
    'Nothing here changes the website. New boxes and rows appear on their own a few seconds after someone sends a report or a game.'
  ];
  help.forEach(function (t, i) { s.getRange('A' + (50 + i) + ':H' + (50 + i)).merge().setValue(t).setWrap(true).setFontColor(COL.ink).setVerticalAlignment('middle').setBackground(i % 2 ? COL.white : COL.grey); s.setRowHeight(50 + i, 38); });
}
function band_(s, a1, text, color) {
  s.getRange(a1).merge().setValue(text).setFontSize(9).setFontWeight('bold').setFontColor('#ffffff').setBackground(color).setHorizontalAlignment('left').setVerticalAlignment('middle');
}
function listLook_(s, a1) {
  var r = s.getRange(a1);
  r.setVerticalAlignment('middle').setFontColor(COL.ink).setBorder(true, true, true, true, false, true, COL.line, SpreadsheetApp.BorderStyle.SOLID);
  var first = a1.split(':')[0].replace(/[0-9]+/, ''), row = a1.split(':')[0].replace(/[A-Z]+/, '');
  var last = a1.split(':')[1].replace(/[0-9]+/, '');
  s.getRange(first + row + ':' + last + row).setFontWeight('bold').setBackground(COL.grey).setFontColor(COL.label);
}

/* ================================================================ one report = one box (10 rows) */
function addReportCard_(sh, p) {
  var t = CARD_TOP, g = function (r, c, nr, nc) { return sh.getRange(t + r, c, nr || 1, nc || 1); };
  if (sh.getMaxRows() < t) sh.insertRowsAfter(sh.getMaxRows(), t - sh.getMaxRows());
  sh.insertRowsBefore(t, REP_ROWS);
  var all = sh.getRange(t, 1, REP_ROWS, 4);
  all.breakApart(); all.clear(); all.clearDataValidations();
  all.setNumberFormat('@').setVerticalAlignment('middle').setWrap(true).setFontColor(COL.ink).setFontSize(10);

  var look = PROBLEM_LOOK[p.problem] || PROBLEM_LOOK[REASONS.other];
  var noNote = !String(p.note || '').trim();
  all.setValues([
    [safe_(p.title), '', p.id + '   ·   ' + p.when, ''],
    ['THE PROBLEM', '', '', ''],
    [p.problem, '', '', ''],
    ['THE DETAILS', '', '', ''],
    ['Device', p.device, 'Reports today', String(p.today)],
    ['Game page', '', 'Reports this week', String(p.week)],
    ['WHAT THE PLAYER WROTE', '', '', ''],
    [noNote ? 'The player did not write anything.' : safe_(p.note), '', '', ''],
    ['Status', 'New', 'Your notes', ''],
    ['', '', '', '']
  ]);
  var page = SITE + '#/play/' + encodeURIComponent(p.slug || '');
  if (p.slug) g(5, 2).setNumberFormat('General').setFormula('=HYPERLINK("' + page + '","Open ' + String(p.title).replace(/["\n\r]/g, '') + ' on the site")').setFontColor(COL.blue).setFontWeight('bold');
  else g(5, 2).setValue('Not known');

  /* title band */
  g(0, 1, 1, 2).merge(); g(0, 3, 1, 2).merge();
  g(0, 1, 1, 4).setBackground(COL.orange).setFontColor('#ffffff');
  g(0, 1).setFontSize(16).setFontWeight('bold'); g(0, 3).setHorizontalAlignment('right').setFontSize(9);
  /* the problem, in its own colour */
  g(1, 1, 1, 4).merge().setBackground(COL.sky).setFontSize(9).setFontWeight('bold').setFontColor(COL.blue);
  g(2, 1, 1, 4).merge().setBackground(look[0]).setFontColor(look[1]).setFontSize(15).setFontWeight('bold').setHorizontalAlignment('center');
  /* details */
  g(3, 1, 1, 4).merge().setBackground(COL.sky).setFontSize(9).setFontWeight('bold').setFontColor(COL.blue);
  [4, 5].forEach(function (r) {
    g(r, 1).setBackground(COL.grey).setFontWeight('bold').setFontColor(COL.label);
    g(r, 3).setBackground(COL.grey).setFontWeight('bold').setFontColor(COL.label);
    g(r, 4).setFontWeight('bold').setHorizontalAlignment('left');
  });
  g(4, 2).setFontWeight('bold');
  /* what the player wrote */
  g(6, 1, 1, 4).merge().setBackground(COL.mint).setFontSize(9).setFontWeight('bold').setFontColor('#0e7a4b');
  g(7, 1, 1, 4).merge().setWrap(true).setVerticalAlignment('top').setFontSize(11);
  if (noNote) g(7, 1).setFontColor(COL.label).setFontStyle('italic');
  /* status + notes */
  g(8, 1).setBackground(COL.grey).setFontWeight('bold').setFontColor(COL.label);
  g(8, 3).setBackground(COL.grey).setFontWeight('bold').setFontColor(COL.label);
  g(8, 2).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(REP_STATUS, true).build()).setNumberFormat('General').setFontWeight('bold').setHorizontalAlignment('center');
  g(8, 4).setBackground(COL.note);
  /* lines and borders */
  g(4, 1, 2, 4).setBorder(null, null, null, null, false, true, COL.line, SpreadsheetApp.BorderStyle.SOLID);
  g(0, 1, 9, 4).setBorder(true, true, true, true, false, false, COL.orange, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  /* heights */
  sh.setRowHeight(t, 38); sh.setRowHeight(t + 1, 22); sh.setRowHeight(t + 2, 46); sh.setRowHeight(t + 3, 22);
  sh.setRowHeight(t + 4, 26); sh.setRowHeight(t + 5, 26); sh.setRowHeight(t + 6, 22); sh.setRowHeight(t + 7, 56);
  sh.setRowHeight(t + 8, 32); sh.setRowHeight(t + 9, 18);
}

/* ================================================================ one developer game = one box (14 rows) */
function mailLink_(email, label) {
  email = String(email || '').trim();
  if (!/^[^\s"<>@]+@[^\s"<>@]+\.[^\s"<>@]+$/.test(email)) return '';
  return '=HYPERLINK("mailto:' + email + '","' + String(label || email).replace(/["\n\r]/g, '') + '")';
}
function addDevCard_(sh, p, when) {
  var t = CARD_TOP, g = function (r, c, nr, nc) { return sh.getRange(t + r, c, nr || 1, nc || 1); };
  if (sh.getMaxRows() < t) sh.insertRowsAfter(sh.getMaxRows(), t - sh.getMaxRows());
  sh.insertRowsBefore(t, DEV_ROWS);
  var all = sh.getRange(t, 1, DEV_ROWS, 4);
  all.breakApart(); all.clear(); all.clearDataValidations();
  all.setNumberFormat('@').setVerticalAlignment('middle').setWrap(true).setFontColor(COL.ink).setFontSize(10);

  var v = safe_;
  all.setValues([
    [v(p.title), '', 'Reference ' + v(p.ref) + '   ·   ' + when, ''],
    ['CONTACT THEM', v(p.dev) + '   ·   ' + (v(p.email) || 'no email given'), '', ''],
    ['THE GAME', '', 'THE DEVELOPER', ''],
    ['Play link', '', 'Name', v(p.dev)],
    ['Category', v(p.category) || 'Not chosen', 'Email', v(p.email) || 'Not given'],
    ['Works on', v(p.platforms) || 'Not said', 'Website', v(p.site) || 'None'],
    ['How to play', v(p.controls) || 'Not said', 'Picture', v(p.thumb) || 'None'],
    ['THE PICTURE', '', 'WHAT THE GAME IS', ''],
    ['', '', v(p.desc), ''],
    ['YOUR REVIEW  ·  tick each one when you have checked it', '', '', ''],
    ['', 'It loads inside the site', '', 'Keyboard / mouse controls work'],
    ['', 'It is safe for school', '', 'It works on a phone or Chromebook'],
    ['Status', 'New', 'Your notes', ''],
    ['', '', '', '']
  ]);

  /* real, clickable links (the email opens a new message to the developer) */
  var link = function (r, c, url, label) {
    url = String(url || '');
    if (!/^https:\/\/[^\s"<>]+$/.test(url)) return;
    g(r, c).setNumberFormat('General').setFormula('=HYPERLINK("' + url.replace(/"/g, '%22') + '","' + String(label).replace(/"/g, '') + '")').setFontColor(COL.blue).setFontWeight('bold');
  };
  link(3, 2, p.url, p.url);
  link(5, 4, p.site, p.site);
  link(6, 4, p.thumb, 'Open the picture');
  var mail = mailLink_(p.email, p.email), contact = mailLink_(p.email, String(p.dev || '').replace(/["\n\r]/g, '') + '   ·   ' + p.email);
  if (mail) g(4, 4).setNumberFormat('General').setFormula(mail).setFontColor(COL.blue).setFontWeight('bold');
  if (contact) g(1, 2).setNumberFormat('General').setFormula(contact);

  /* title band */
  g(0, 1, 1, 2).merge(); g(0, 3, 1, 2).merge();
  g(0, 1, 1, 4).setBackground(COL.purple).setFontColor('#ffffff');
  g(0, 1).setFontSize(16).setFontWeight('bold'); g(0, 3).setHorizontalAlignment('right').setFontSize(9);
  /* contact bar: who to write to, one click */
  g(1, 2, 1, 3).merge().setHorizontalAlignment('left').setFontSize(12).setFontWeight('bold').setFontColor(contact ? COL.blue : COL.ink);
  g(1, 1, 1, 4).setBackground('#d8f3e5');
  g(1, 1).setFontSize(9).setFontWeight('bold').setFontColor('#0e7a4b');
  /* the two boxes */
  g(2, 1, 1, 2).merge().setBackground(COL.sky); g(2, 3, 1, 2).merge().setBackground(COL.violet);
  g(2, 1, 1, 4).setFontSize(9).setFontWeight('bold').setFontColor(COL.blue);
  [3, 4, 5, 6].forEach(function (r) {
    g(r, 1).setBackground(COL.grey).setFontWeight('bold').setFontColor(COL.label);
    g(r, 3).setBackground(COL.grey).setFontWeight('bold').setFontColor(COL.label);
  });
  /* picture + description */
  g(7, 1, 1, 2).merge().setBackground(COL.amber).setFontSize(9).setFontWeight('bold').setFontColor('#a15c00');
  g(7, 3, 1, 2).merge().setBackground(COL.mint).setFontSize(9).setFontWeight('bold').setFontColor('#0e7a4b');
  g(8, 1, 1, 2).merge().setHorizontalAlignment('center').setVerticalAlignment('middle');
  g(8, 3, 1, 2).merge().setWrap(true).setVerticalAlignment('top').setFontSize(11);
  if (/^https:\/\/[^\s"<>]+$/.test(String(p.thumb || ''))) g(8, 1).setNumberFormat('General').setFormula('=IFERROR(IMAGE("' + String(p.thumb).replace(/"/g, '%22') + '",1),"The picture could not be shown. Use the Picture link above.")');
  else g(8, 1).setValue('No picture was sent.').setFontColor(COL.label).setFontStyle('italic');
  /* the checklist */
  g(9, 1, 1, 4).merge().setBackground(COL.amber).setFontSize(9).setFontWeight('bold').setFontColor('#a15c00');
  [10, 11].forEach(function (r) {
    [1, 3].forEach(function (c) { g(r, c).setNumberFormat('General').insertCheckboxes().setHorizontalAlignment('right'); });
  });
  /* status + notes */
  g(12, 1).setBackground(COL.grey).setFontWeight('bold').setFontColor(COL.label);
  g(12, 3).setBackground(COL.grey).setFontWeight('bold').setFontColor(COL.label);
  g(12, 2).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(SUB_STATUS, true).build()).setNumberFormat('General').setFontWeight('bold').setHorizontalAlignment('center');
  g(12, 4).setBackground(COL.note);
  g(3, 1, 4, 4).setBorder(null, null, null, null, false, true, COL.line, SpreadsheetApp.BorderStyle.SOLID);
  g(0, 1, 13, 4).setBorder(true, true, true, true, false, false, COL.purple, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  sh.setRowHeight(t, 38); sh.setRowHeight(t + 1, 36); sh.setRowHeight(t + 2, 22);
  for (var i = 3; i <= 6; i++) sh.setRowHeight(t + i, 26);
  sh.setRowHeight(t + 7, 22); sh.setRowHeight(t + 8, 120); sh.setRowHeight(t + 9, 22);
  sh.setRowHeight(t + 10, 26); sh.setRowHeight(t + 11, 26); sh.setRowHeight(t + 12, 32); sh.setRowHeight(t + 13, 18);
}

/* ================================================================ what the website sends */
/* stops anything a visitor typed from running as a formula in the sheet */
function safe_(v) {
  v = v == null ? '' : String(v);
  return /^[=+\-@\t\r]/.test(v) ? ' ' + v : v;
}
function link_(url, label) {
  url = String(url || '');
  if (!/^https:\/\/[^\s"<>]+$/.test(url)) return safe_(url);
  return '=HYPERLINK("' + url.replace(/"/g, '%22') + '","' + String(label).replace(/"/g, '') + '")';
}
function out_(t) { return ContentService.createTextOutput(t); }
function nextId_(key, prefix) {
  var pr = PropertiesService.getScriptProperties(), n = Number(pr.getProperty(key) || 0) + 1;
  pr.setProperty(key, String(n));
  return prefix + ('0000' + n).slice(-4);
}
function nice_(slug) { return String(slug || '').split('-').map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ').trim(); }

/* one plain row at the bottom of a log tab (text stays text, so times never turn into dates) */
function logRow_(sh, vals, numCols) {
  var r = Math.max(sh.getLastRow(), 1) + 1;
  if (sh.getMaxRows() < r) sh.insertRowsAfter(sh.getMaxRows(), 50);
  sh.getRange(r, 1, 1, vals.length).setNumberFormat('@').setValues([vals]);
  return r;
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var d = JSON.parse(e.postData.contents);
    if (!d || d.secret !== SECRET) return out_('forbidden');
    lock.waitLock(20000);
    var ss = SpreadsheetApp.getActiveSpreadsheet(), p = d.data || {}, now = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm');
    if (d.kind === 'inspect') return out_(inspect_(ss));
    if (d.kind === 'cleanup') return out_(cleanup_(ss, new RegExp(String(p.match || '^$'), 'i'), p.dropOld === true));
    if (d.kind !== 'report' && d.kind !== 'submission') return out_('unknown');
    if (PropertiesService.getScriptProperties().getProperty('layout') !== String(VERSION)) setup();   // in case "setup" was never run

    if (d.kind === 'report') {
      var slug = String(p.game || '').replace(/[^a-z0-9\-]/gi, '').toLowerCase();
      var title = String(p.title || '').trim() || nice_(slug) || 'Unknown game';
      var problem = REASONS[p.reason] || 'Something else';
      var device = DEVICES[p.device] || 'Not known';
      var note = String(p.note || '').replace(/\s+/g, ' ').trim().slice(0, 200);
      var today = Math.max(0, Number(p.today) || 0), week = Math.max(0, Number(p.week) || 0);
      var id = nextId_('reportCount', 'R-');
      var sh = ss.getSheetByName('Reports') || reports_(ss);
      var r = logRow_(sh, [now, id, safe_(title), problem, device, safe_(note), '', '', ''], 9);
      sh.getRange(r, 7, 1, 2).setNumberFormat('0').setValues([[today, week]]);
      if (slug) sh.getRange(r, 9).setNumberFormat('General').setFormula('=HYPERLINK("' + SITE + '#/play/' + slug + '","Open game page")');
      addReportCard_(ss.getSheetByName('Report inbox') || reportInbox_(ss), { id: id, when: now, title: title, slug: slug, problem: problem, device: device, note: note, today: today, week: week });
    } else {
      var sub = ss.getSheetByName('Submissions') || table_(ss), rr = logRow_(sub, [now, safe_(p.ref), safe_(p.title), safe_(p.dev), safe_(p.email), safe_(p.category), safe_(p.desc), safe_(p.controls), safe_(p.platforms), '', '', ''], 12);
      var ml = mailLink_(p.email, p.email);
      if (ml) sub.getRange(rr, 5).setNumberFormat('General').setFormula(ml);
      sub.getRange(rr, 10, 1, 3).setNumberFormat('General').setFormulas([[link_(p.url, p.url), p.thumb ? link_(p.thumb, 'Picture') : '', p.site ? link_(p.site, p.site) : '']]);
      addDevCard_(devInbox_(ss), p, now);
    }
    return out_('ok');
  } catch (err) {
    return out_('error: ' + err);
  } finally {
    try { lock.releaseLock(); } catch (e2) { /* not locked */ }
  }
}

/* removes test boxes and rows (used by the UBG45 team after a test). Needs the secret. match = words to look for in the game title. */
function cleanup_(ss, re, dropOld) {
  var out = { reportBoxes: 0, developerBoxes: 0, reportRows: 0, submissionRows: 0, oldTabs: 0 };
  [['Report inbox', 'THE PROBLEM', 'reportBoxes'], ['Developer inbox', 'THE GAME', 'developerBoxes']].forEach(function (cfg) {
    var sh = ss.getSheetByName(cfg[0]), last = sh ? sh.getLastRow() : 0;
    if (!sh || last < CARD_TOP) return;
    var col = sh.getRange(CARD_TOP, 1, last - CARD_TOP + 1, 1).getValues().map(function (r) { return String(r[0]); }), starts = [], i;
    for (i = 0; i < col.length - 1; i++) if (col[i] !== '' && (col[i + 1] === cfg[1] || (cfg[1] === 'THE GAME' && col[i + 1] === 'CONTACT THEM'))) starts.push(i);
    for (i = starts.length - 1; i >= 0; i--) {                       // bottom up, so the row numbers above stay right
      var from = starts[i], to = i + 1 < starts.length ? starts[i + 1] : col.length;
      if (re.test(col[from].trim())) { sh.deleteRows(CARD_TOP + from, to - from); out[cfg[2]]++; }
    }
  });
  [['Reports', 'reportRows'], ['Submissions', 'submissionRows']].forEach(function (cfg) {
    var sh = ss.getSheetByName(cfg[0]), last = sh ? sh.getLastRow() : 0;
    if (!sh || last < 2) return;
    var games = sh.getRange(2, 3, last - 1, 1).getValues();
    for (var r = games.length - 1; r >= 0; r--) if (re.test(String(games[r][0]).trim())) { sh.deleteRows(r + 2, 1); out[cfg[1]]++; }
  });
  var rep = ss.getSheetByName('Reports');
  if (rep && rep.getLastRow() < 2) PropertiesService.getScriptProperties().setProperty('reportCount', '0');   // next report is R-0001 again
  if (dropOld) ss.getSheets().forEach(function (sh) { if (/\(old/.test(sh.getName()) && ss.getNumSheets() > 1) { ss.deleteSheet(sh); out.oldTabs++; } });
  SpreadsheetApp.flush();
  return JSON.stringify(out);
}

/* lets the UBG45 team read back what the sheet shows (needs the secret) */
function inspect_(ss) {
  var out = { version: VERSION, timezone: ss.getSpreadsheetTimeZone(), sheets: {} };
  ss.getSheets().forEach(function (sh) {
    var rows = Math.min(sh.getLastRow(), 45), cols = Math.min(sh.getLastColumn(), 12);
    out.sheets[sh.getName()] = { lastRow: sh.getLastRow(), top: rows && cols ? sh.getRange(1, 1, rows, cols).getDisplayValues() : [] };
  });
  return JSON.stringify(out);
}

function doGet() { return out_('UBG45 sheet is running (version ' + VERSION + ').'); }
