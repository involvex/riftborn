# Microsoft Store beta keys (promo codes)

Codes live only in Google Drive / Partner Center — **never** commit TSV,
Sheet exports, or raw codes to git or GitHub Pages.

## Assets (owner Drive)

| Item                | Link                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Codes sheet         | [Beta Tester spreadsheet](https://docs.google.com/spreadsheets/d/1xLcgNcFBdpWauL3uuWdqyXiiQ4C5-kiIOmG_rf5Yg0A/edit) |
| Request form (edit) | [Beta Tester form](https://docs.google.com/forms/d/14DwACzNuCnQZY7XPYKmTO61yOIueZLC3re6XLDHxIvQ/edit)               |
| Public form         | [viewform](https://docs.google.com/forms/d/e/1FAIpQLSeTad_Ueu_EawTRLPI5KUIcTiw-nLaOZMxRHFpXzP70NpXIXw/viewform)     |
| Site page           | https://involvex.github.io/riftborn/beta.html                                                                       |

Sheet tab **Beta Tester** holds Partner Center columns including
`Promotional code`, `Redeemable URL`, `Given to`, `Available`, `Redeemed`.

## One-time: email keys on submit

1. Open the spreadsheet → **Extensions → Apps Script**.
2. Paste [`scripts/msstore-beta-key-appscript.js`](../scripts/msstore-beta-key-appscript.js).
3. Save → **Triggers** → Add trigger:
   - Function: `onFormSubmit`
   - Event source: **From spreadsheet**
   - Event type: **On form submit**
4. Authorize Google account + Mail permissions when prompted.
5. Submit a test response to yourself; confirm email + `Given to` filled.

Without the trigger, form responses still land in
**Formularantworten 1** — assign codes manually from the **Beta Tester**
tab.

## Refresh codes from Partner Center

1. Partner Center → Attract → Promo codes → download order TSV.
2. Replace / append into the **Beta Tester** tab (keep header row).
3. Leave `Given to` empty for unused rows; keep `Available=1`.

## GitHub Pages

`site/beta.html` embeds the public form. Codes are never in the repo.
