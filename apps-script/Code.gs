const CONFIG = {
  spreadsheetProperty: 'KVARCIT_LEADS_SPREADSHEET_ID',
  spreadsheetName: 'Кварцит — заявки',
  sheetName: 'Заявки',
  headers: [
    'request_id', 'created_at', 'name', 'phone', 'email', 'direction',
    'preferred_time', 'utm_source', 'utm_medium', 'utm_campaign',
    'utm_content', 'page_url', 'consent', 'status'
  ]
};

/** Serves the small cross-origin bridge used by the static website. */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Bridge')
    .setTitle('Кварцит — приёмник заявок')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Run once from the Apps Script editor to create and authorize the leads sheet. */
function setupLeadSheet() {
  const properties = PropertiesService.getScriptProperties();
  let spreadsheetId = properties.getProperty(CONFIG.spreadsheetProperty);
  let spreadsheet;

  if (spreadsheetId) {
    spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  } else {
    spreadsheet = SpreadsheetApp.create(CONFIG.spreadsheetName);
    properties.setProperty(CONFIG.spreadsheetProperty, spreadsheet.getId());
  }
  spreadsheet.setSpreadsheetTimeZone('Europe/Moscow');

  let sheet = spreadsheet.getSheetByName(CONFIG.sheetName);
  if (!sheet) {
    const existingSheets = spreadsheet.getSheets();
    if (existingSheets.length === 1 && existingSheets[0].getLastRow() === 0) {
      sheet = existingSheets[0];
      sheet.setName(CONFIG.sheetName);
    } else {
      sheet = spreadsheet.insertSheet(CONFIG.sheetName);
    }
  }
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, CONFIG.headers.length).setValues([CONFIG.headers]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, CONFIG.headers.length)
      .setFontWeight('bold')
      .setBackground('#25262b')
      .setFontColor('#ffffff');
    sheet.getRange('A:A').setNumberFormat('@');
    sheet.getRange('D:D').setNumberFormat('@');
    sheet.getRange('E:E').setNumberFormat('@');
    sheet.getRange('L:L').setNumberFormat('@');
    sheet.autoResizeColumns(1, CONFIG.headers.length);
    sheet.setColumnWidth(3, 180);
    sheet.setColumnWidth(12, 260);
    sheet.getRange(1, 1, 1, CONFIG.headers.length).createFilter();
  }

  Logger.log('Таблица заявок: ' + spreadsheet.getUrl());
  return spreadsheet.getUrl();
}

/** Called from Bridge.html after checking the website origin. */
function saveLead(payload) {
  const lead = normalizeLead_(payload);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const spreadsheet = getLeadSpreadsheet_();
    const sheet = spreadsheet.getSheetByName(CONFIG.sheetName);
    if (!sheet) throw new Error('Не найден лист «' + CONFIG.sheetName + '». Запустите setupLeadSheet.');

    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const duplicate = sheet.getRange(2, 1, lastRow - 1, 1)
        .createTextFinder(lead.request_id)
        .matchEntireCell(true)
        .findNext();
      if (duplicate) return { ok: true, duplicate: true };
    }

    sheet.appendRow([
      safeCell_(lead.request_id), new Date(), safeCell_(lead.name),
      safeCell_(lead.phone), safeCell_(lead.email), safeCell_(lead.direction),
      safeCell_(lead.preferred_time), safeCell_(lead.utm_source),
      safeCell_(lead.utm_medium), safeCell_(lead.utm_campaign),
      safeCell_(lead.utm_content), safeCell_(lead.page_url), true, 'Новая'
    ]);
    return { ok: true, duplicate: false };
  } finally {
    lock.releaseLock();
  }
}

function getLeadSpreadsheet_() {
  const spreadsheetId = PropertiesService.getScriptProperties()
    .getProperty(CONFIG.spreadsheetProperty);
  if (!spreadsheetId) throw new Error('Сначала запустите setupLeadSheet.');
  return SpreadsheetApp.openById(spreadsheetId);
}

function normalizeLead_(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('Пустая заявка.');
  const value = (key, limit) => String(payload[key] == null ? '' : payload[key]).trim().slice(0, limit);
  const lead = {
    request_id: value('request_id', 80),
    name: value('name', 60),
    phone: value('phone', 20).replace(/[\s()-]/g, ''),
    email: value('email', 254),
    direction: value('direction', 40),
    preferred_time: value('preferred_time', 30),
    utm_source: value('utm_source', 120),
    utm_medium: value('utm_medium', 120),
    utm_campaign: value('utm_campaign', 160),
    utm_content: value('utm_content', 160),
    page_url: value('page_url', 500)
  };

  if (!/^REQ-[A-Za-z0-9-]{8,80}$/.test(lead.request_id)) throw new Error('Некорректный номер заявки.');
  if (lead.name.length < 2) throw new Error('Укажите имя.');
  if (!/^\+7\d{10}$/.test(lead.phone)) throw new Error('Проверьте номер телефона.');
  if (lead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) throw new Error('Проверьте электронную почту.');
  if (!['bouldering', 'top_rope', 'kids', 'corporate'].includes(lead.direction)) throw new Error('Выберите направление.');
  if (!['morning', 'day', 'evening', 'weekend'].includes(lead.preferred_time)) throw new Error('Выберите удобное время.');
  if (!/^https:\/\/tz-01-skalodrom-kvarcit\.vercel\.app(?:\/|$)/.test(lead.page_url)) throw new Error('Неизвестный адрес сайта.');
  if (!(payload.consent === true || payload.consent === 'true')) throw new Error('Нет согласия на обработку данных.');
  return lead;
}

/** Prevent form values beginning with formula markers from being evaluated by Sheets. */
function safeCell_(value) {
  const text = String(value == null ? '' : value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}
