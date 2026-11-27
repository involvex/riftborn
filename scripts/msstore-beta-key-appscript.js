/**
 * Paste into: Beta Tester spreadsheet → Extensions → Apps Script
 * Then: Triggers → Add trigger → onFormSubmit → From spreadsheet →
 * On form submit. Authorize MailApp when prompted.
 *
 * Sheet tab "Beta Tester" columns (from Partner Center TSV):
 * A Product name … C Promotional code · D Redeemable URL ·
 * I Given to · J Available · K Redeemed
 */
const CODES_SHEET = 'Beta Tester';
const GIVEN_COL = 9; // I
const AVAILABLE_COL = 10; // J
const CODE_COL = 3; // C
const URL_COL = 4; // D

function onFormSubmit(e) {
  const email = String(
    e?.namedValues?.['E-Mail-Adresse']?.[0] ||
      e?.namedValues?.['Email Address']?.[0] ||
      e?.namedValues?.Email?.[0] ||
      '',
  ).trim();
  const name = String(
    e?.namedValues?.['Display name']?.[0] || e?.namedValues?.Name?.[0] || '',
  ).trim();

  if (!email) {
    console.error('No respondent email on form submit');
    return;
  }

  const lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CODES_SHEET);
    if (!sheet) throw new Error('Missing sheet: ' + CODES_SHEET);

    const values = sheet.getDataRange().getValues();
    let rowIndex = -1;
    for (let i = 1; i < values.length; i++) {
      const given = String(values[i][GIVEN_COL - 1] || '').trim();
      const available = String(values[i][AVAILABLE_COL - 1]);
      if (!given && available === '1') {
        rowIndex = i + 1; // 1-based
        break;
      }
    }
    if (rowIndex < 0) {
      MailApp.sendEmail({
        to: email,
        subject: 'Riftborn beta — no keys left',
        body:
          'Thanks for requesting a Riftborn Store key.\n\n' +
          'All promotional codes are currently assigned. ' +
          'We will follow up if more become available.\n',
      });
      return;
    }

    const code = String(sheet.getRange(rowIndex, CODE_COL).getValue());
    const url = String(sheet.getRange(rowIndex, URL_COL).getValue());
    const stamp = new Date().toISOString();
    sheet
      .getRange(rowIndex, GIVEN_COL)
      .setValue(name ? `${email} | ${name} | ${stamp}` : `${email} | ${stamp}`);

    MailApp.sendEmail({
      to: email,
      subject: 'Your Riftborn Microsoft Store beta key',
      body:
        `Hi${name ? ' ' + name : ''},\n\n` +
        'Here is your Riftborn Microsoft Store promotional code.\n\n' +
        `Code: ${code}\n` +
        `Redeem: ${url}\n\n` +
        '1. On Windows 10/11, sign into the Microsoft Store with your Microsoft account.\n' +
        '2. Open the redeem link (or enter the code in Store → Profile → Redeem code).\n' +
        '3. Install Riftborn. Updates arrive automatically from the Store.\n\n' +
        'One key per person — please do not share publicly.\n' +
        'Feedback: https://github.com/involvex/riftborn/issues\n' +
        'Privacy: https://involvex.github.io/riftborn/privacy.html\n',
    });
  } finally {
    lock.releaseLock();
  }
}
