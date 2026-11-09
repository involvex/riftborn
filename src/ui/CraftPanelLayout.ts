/** Axis-aligned rect in panel-local top-left coordinates. */
export type Rect = { x: number; y: number; w: number; h: number };

export type CraftPanelLayoutInput = {
  panelW: number;
  panelH: number;
  recipeCount: number;
  touch: boolean;
};

export type CraftPanelLayout = {
  panel: Rect;
  title: Rect;
  close: Rect;
  rows: Rect[];
  listClip: Rect;
  rowPitch: number;
  rowH: number;
  scrollable: boolean;
  pad: number;
};

/** Match craft overlay sizing against short mobile viewports. */
export function craftPanelFromViewport(
  viewW: number,
  viewH: number,
  touch: boolean,
): { panelW: number; panelH: number } {
  const widthFrac = touch ? 0.92 : 0.5;
  const heightFrac = touch ? 0.9 : 0.72;
  const maxW = touch ? 480 : 420;
  const maxH = touch ? 440 : 400;
  return {
    panelW: Math.min(maxW, Math.floor(viewW * widthFrac)),
    panelH: Math.min(maxH, Math.floor(viewH * heightFrac)),
  };
}

/**
 * Pure craft overlay geometry: title top, Close pinned bottom,
 * recipe rows in between. Scroll only when recipes cannot fit.
 */
export function computeCraftPanelLayout(
  input: CraftPanelLayoutInput,
): CraftPanelLayout {
  const { panelW, panelH, recipeCount, touch } = input;
  const pad = touch ? 12 : 18;
  const titleH = touch ? 26 : 30;
  const closeH = touch ? 28 : 26;
  const gap = touch ? 8 : 10;
  const rowPitch = 48;
  const rowH = touch ? 40 : 36;

  const title: Rect = {
    x: pad,
    y: pad,
    w: panelW - pad * 2,
    h: titleH,
  };
  const close: Rect = {
    x: pad,
    y: panelH - pad - closeH,
    w: panelW - pad * 2,
    h: closeH,
  };

  const listTop = title.y + title.h + gap;
  const listBottom = close.y - gap;
  const listH = Math.max(0, listBottom - listTop);
  const needed = recipeCount <= 0 ? 0 : rowH + (recipeCount - 1) * rowPitch;
  const scrollable = needed > listH + 0.01;

  const listClip: Rect = {
    x: pad,
    y: listTop,
    w: panelW - pad * 2,
    h: listH,
  };

  const rows: Rect[] = [];
  for (let i = 0; i < recipeCount; i++) {
    rows.push({
      x: pad,
      y: listTop + i * rowPitch,
      w: panelW - pad * 2,
      h: rowH,
    });
  }

  return {
    panel: { x: 0, y: 0, w: panelW, h: panelH },
    title,
    close,
    rows,
    listClip,
    rowPitch,
    rowH,
    scrollable,
    pad,
  };
}

/** Convert top-left panel rect center to Phaser container-local (0,0 = center). */
export function craftRectCenter(
  panelW: number,
  panelH: number,
  rect: Rect,
): { x: number; y: number } {
  return {
    x: rect.x + rect.w / 2 - panelW / 2,
    y: rect.y + rect.h / 2 - panelH / 2,
  };
}
