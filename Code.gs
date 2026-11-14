/**
 * 證照管理系統 — Google Sheet 後端
 * 放在範本 Sheet 的「擴充功能 → Apps Script」裡。
 * 使用者複製範本後，部署成「網頁應用程式」，把網址貼到網站即可。
 */

const TABS = {
  certs:    { name: '證照',     head: ['id','證照名稱','分類ID','分類（顯示用）','發證單位','證照字號','發證日／本期起','到期日','效期（年）','需求時數','分類門檻（JSON）','備註'] },
  records:  { name: '進修紀錄', head: ['id','日期','課程／活動','主辦單位','時數','課程類別ID','課程類別（顯示用）','採計證照ID','採計證照（顯示用）','備註'] },
  certCats: { name: '證照分類', head: ['id','名稱','顏色'] },
  ceCats:   { name: '課程類別', head: ['id','名稱'] },
  meta:     { name: '_系統',    head: ['key','value'] }
};

function doGet(e) {
  try {
    return json_({ ok: true, data: readAll_() });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const body = JSON.parse(e.postData.contents || '{}');
    if (body.action !== 'save' || !body.data) return json_({ ok: false, error: 'bad_request' });
    const current = getMeta_('updatedAt') || '';
    if (!body.force && body.baseUpdatedAt !== undefined && body.baseUpdatedAt !== current) {
      return json_({ ok: false, error: 'conflict', data: readAll_() });
    }
    writeAll_(body.data);
    const now = new Date().toISOString();
    setMeta_('updatedAt', now);
    return json_({ ok: true, updatedAt: now });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

/* ---------- 讀取 ---------- */
function readAll_() {
  ensureTabs_();
  const certCats = rows_('certCats').map(r => ({ id: s_(r[0]), name: s_(r[1]), color: s_(r[2]) || '#667085' })).filter(x => x.id);
  const ceCats   = rows_('ceCats').map(r => ({ id: s_(r[0]), name: s_(r[1]) })).filter(x => x.id);
  const certs = rows_('certs').map(r => ({
    id: s_(r[0]), name: s_(r[1]), catId: s_(r[2]), issuer: s_(r[4]), number: s_(r[5]),
    issueDate: d_(r[6]), expiryDate: d_(r[7]), validYears: n_(r[8]), requiredHours: n_(r[9]),
    cats: parse_(r[10], []), note: s_(r[11])
  })).filter(x => x.id);
  const records = rows_('records').map(r => ({
    id: s_(r[0]), date: d_(r[1]), title: s_(r[2]), org: s_(r[3]), hours: n_(r[4]),
    ceCatId: s_(r[5]), certIds: s_(r[7]) ? s_(r[7]).split(',').map(x => x.trim()).filter(Boolean) : [], note: s_(r[9])
  })).filter(x => x.id);
  return { certs, records, certCats, ceCats, updatedAt: getMeta_('updatedAt') || '', sheetUrl: ss_().getUrl() };
}

/* ---------- 寫入（整份覆寫） ---------- */
function writeAll_(d) {
  ensureTabs_();
  const gName = id => ((d.certCats || []).find(g => g.id === id) || {}).name || '';
  const kName = id => ((d.ceCats || []).find(k => k.id === id) || {}).name || '';
  const cName = id => ((d.certs || []).find(c => c.id === id) || {}).name || '';
  put_('certCats', (d.certCats || []).map(g => [g.id, g.name, g.color]));
  put_('ceCats', (d.ceCats || []).map(k => [k.id, k.name]));
  put_('certs', (d.certs || []).map(c => [c.id, c.name, c.catId || '', gName(c.catId), c.issuer || '', c.number || '',
    c.issueDate || '', c.expiryDate || '', c.validYears || '', c.requiredHours || '', JSON.stringify(c.cats || []), c.note || '']));
  put_('records', (d.records || []).map(r => [r.id, r.date || '', r.title || '', r.org || '', r.hours || 0,
    r.ceCatId || '', kName(r.ceCatId), (r.certIds || []).join(','), (r.certIds || []).map(cName).join('、'), r.note || '']));
}

/* ---------- 工具 ---------- */
function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }
function sheet_(key) { return ss_().getSheetByName(TABS[key].name); }
function ensureTabs_() {
  Object.keys(TABS).forEach(k => {
    let sh = ss_().getSheetByName(TABS[k].name);
    if (!sh) {
      sh = ss_().insertSheet(TABS[k].name);
      sh.getRange(1, 1, 1, TABS[k].head.length).setValues([TABS[k].head]).setFontWeight('bold').setBackground('#eef2f7');
      sh.setFrozenRows(1);
      if (k === 'meta') sh.hideSheet();
    }
  });
}
function rows_(key) {
  const sh = sheet_(key), n = sh.getLastRow() - 1;
  if (n < 1) return [];
  return sh.getRange(2, 1, n, TABS[key].head.length).getValues().filter(r => r.some(v => v !== ''));
}
function put_(key, rows) {
  const sh = sheet_(key), w = TABS[key].head.length, last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, w).clearContent();
  if (!rows.length) return;
  const rg = sh.getRange(2, 1, rows.length, w);
  rg.setNumberFormat('@');           // 存成純文字，避免日期被 Sheet 自動轉換
  rg.setValues(rows.map(r => r.map(v => v === null || v === undefined ? '' : String(v))));
}
function getMeta_(key) {
  const sh = sheet_('meta'); if (!sh) return '';
  const n = sh.getLastRow() - 1; if (n < 1) return '';
  const row = sh.getRange(2, 1, n, 2).getValues().find(r => r[0] === key);
  return row ? String(row[1]) : '';
}
function setMeta_(key, value) {
  const sh = sheet_('meta'), n = sh.getLastRow() - 1;
  if (n >= 1) {
    const vals = sh.getRange(2, 1, n, 1).getValues();
    for (let i = 0; i < vals.length; i++) if (vals[i][0] === key) { sh.getRange(i + 2, 2).setNumberFormat('@').setValue(value); return; }
  }
  sh.appendRow([key, value]);
}
function s_(v) { return v === null || v === undefined ? '' : String(v).trim(); }
function n_(v) { const x = parseFloat(v); return isFinite(x) ? x : 0; }
function d_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, ss_().getSpreadsheetTimeZone(), 'yyyy-MM-dd');
  const t = s_(v); const m = t.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/);
  return m ? `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : t;
}
function parse_(v, dflt) { try { return v ? JSON.parse(v) : dflt; } catch (e) { return dflt; } }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/** 範本建立者執行一次：建立分頁與預設分類 */
function setup() {
  ensureTabs_();
  if (!rows_('certCats').length) put_('certCats', [['g1','運動指導','#2f6fed'],['g2','急救救生','#c4320a'],['g3','醫療防護','#12805c'],['g4','其他','#667085']]);
  if (!rows_('ceCats').length) put_('ceCats', [['k1','專業課程'],['k2','一般課程'],['k3','法規／倫理']]);
  const first = ss_().getSheets()[0];
  if (first.getName() !== TABS.certs.name && first.getLastRow() === 0 && first.getName().match(/^(工作表|Sheet)\d*$/)) ss_().deleteSheet(first);
}
