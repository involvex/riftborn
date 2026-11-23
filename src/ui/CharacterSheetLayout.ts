/** Character sheet geometry, panel-center coordinates. */

export type CharButton = { x: number; y: number; w: number; h: number };

export type CharacterSheetLayout = {
  titleY: number;
  titleFont: number;
  bodyX: number;
  bodyY: number;
  bodyW: number;
  bodyFont: number;
  buttons: CharButton[];
  btnFont: number;
  closeY: number;
  closeFont: number;
  showClose: boolean;
};

/**
 * Body on the left, four attribute buttons in a right column.
 * Touch hides the Close line — the corner X already dismisses.
 */
export function layoutCharacterSheet(
  panelW: number,
  panelH: number,
  touch: boolean,
): CharacterSheetLayout {
  const pad = Math.max(8, Math.round(Math.min(panelW, panelH) * 0.035));
  const titleH = Math.max(18, Math.round(panelH * (touch ? 0.1 : 0.08)));
  const closeH = touch ? 0 : Math.max(22, Math.round(panelH * 0.07));
  const bodyTop = pad + titleH + 6;
  const bodyBottom = panelH - pad - closeH - (touch ? 4 : 8);
  const bodyH = Math.max(40, bodyBottom - bodyTop);
  const gap = Math.max(4, Math.round(panelH * 0.015));
  const btnH = Math.max(22, Math.min(36, Math.floor((bodyH - gap * 3) / 4)));
  const btnW = Math.max(52, Math.min(96, Math.round(panelW * 0.22)));
  const bodyW = Math.max(80, panelW - pad * 3 - btnW);
  const btnX = panelW / 2 - pad - btnW / 2;
  const btnY0 = -panelH / 2 + bodyTop + btnH / 2;

  return {
    titleY: -panelH / 2 + pad + titleH / 2,
    titleFont: Math.max(14, Math.min(22, Math.round(titleH * 0.72))),
    bodyX: -panelW / 2 + pad,
    bodyY: -panelH / 2 + bodyTop,
    bodyW,
    bodyFont: touch ? 10 : 12,
    buttons: [0, 1, 2, 3].map((i) => ({
      x: btnX,
      y: btnY0 + i * (btnH + gap),
      w: btnW,
      h: btnH,
    })),
    btnFont: Math.max(11, Math.min(14, Math.round(btnH * 0.4))),
    closeY: panelH / 2 - pad - Math.max(closeH, 16) / 2,
    closeFont: 13,
    showClose: !touch,
  };
}
