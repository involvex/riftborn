/** Axis-aligned rect in panel-local top-left coordinates. */
export type Rect = { x: number; y: number; w: number; h: number };

export type InventoryLayoutInput = {
  panelW: number;
  panelH: number;
  touch: boolean;
  bagCols: number;
  bagRows: number;
  /** When true, Close text row is omitted (X button handles dismiss). */
  showCloseX: boolean;
};

export type InventoryLayout = {
  panel: Rect;
  title: Rect;
  equipment: Rect;
  hint: Rect;
  /** Full bag header band (label + Sort). */
  bagHeader: Rect;
  /** Capacity/gold label — left side of bagHeader. */
  bagLabel: Rect;
  /** Sort control — right side of bagHeader, no overlap with hint. */
  sortBtn: Rect;
  bagGrid: Rect;
  detail: Rect;
  close: Rect | null;
  cellSize: number;
  visibleRows: number;
  scrollable: boolean;
  detailBeside: boolean;
  showCloseText: boolean;
  pad: number;
  gap: number;
  eqCols: number;
  eqCellH: number;
  eqGap: number;
  bagGap: number;
  headerBand: number;
  /** Max pixel width for equipment name text inside a card. */
  eqNameMaxPx: number;
};

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}

/** Match InventoryPanel / uiPanelSize fractions. */
export function inventoryPanelFromViewport(
  viewW: number,
  viewH: number,
  touch: boolean,
): { panelW: number; panelH: number } {
  const widthFrac = touch ? 0.96 : 0.94;
  const heightFrac = touch ? 0.94 : 0.88;
  const maxW = 860;
  const maxH = 620;
  return {
    panelW: Math.min(maxW, Math.floor(viewW * widthFrac)),
    panelH: Math.min(maxH, Math.floor(viewH * heightFrac)),
  };
}

/**
 * Pure inventory overlay geometry from panel size.
 * Short panels put the detail band beside the bag; otherwise stack.
 * Touch cells stay ≥36px; excess bag rows become scrollable.
 */
export function computeInventoryLayout(
  input: InventoryLayoutInput,
): InventoryLayout {
  const { panelW, panelH, touch, bagCols, bagRows, showCloseX } = input;
  const short = panelH < 360;
  const pad = touch ? (short ? 10 : 14) : 22;
  const gap = touch ? 6 : 8;
  const titleH = touch ? (short ? 22 : 28) : 34;
  const hintH = touch ? (short ? 16 : 18) : 18;
  const headerBand = short ? 22 : 24;
  // Padding on the Sort text (~8px×2) needs room — avoid spilling into detail.
  const sortW = touch ? 64 : 68;
  const sortH = Math.min(headerBand - 2, touch ? 20 : 22);
  const bagGap = touch ? 4 : 6;
  const minCell = touch ? 36 : 24;
  const maxCell = touch ? 44 : 52;
  const eqCols = 3;
  const eqGap = touch ? (short ? 4 : 6) : 10;
  const showCloseText = !showCloseX;
  const closeH = showCloseText ? (touch ? 22 : 24) : 0;
  const detailMinH = touch ? 64 : 72;

  // Prefer side-by-side detail when the panel is short.
  const detailBeside = panelH < 500;

  let y = pad;
  const title: Rect = {
    x: pad,
    y,
    w: panelW - pad * 2,
    h: titleH,
  };
  y += titleH + (short ? 2 : 4);

  // Equipment: 2 rows × 3 cols; shrink on short panels to free bag rows.
  const eqMinCell = touch ? (short ? 28 : 34) : 36;
  const eqMaxCell = touch ? (short ? 34 : 40) : 48;
  const eqAvailGuess = Math.max(
    eqMinCell * 2 + eqGap,
    panelH - y - hintH - gap - (detailBeside ? 0 : detailMinH) - closeH - pad,
  );
  // Cap equipment so at least ~2 bag rows fit when beside+touch.
  let eqCellH = Math.min(
    eqMaxCell,
    Math.max(eqMinCell, Math.floor((eqAvailGuess - eqGap) / 2)),
  );
  if (detailBeside && touch) {
    const reserveBag = headerBand + minCell * 2 + bagGap + hintH + pad + 8;
    const eqBudget = panelH - pad - titleH - 2 - reserveBag;
    eqCellH = Math.min(
      eqCellH,
      Math.max(eqMinCell, Math.floor((eqBudget - eqGap) / 2)),
    );
  }
  const eqBlockH = 2 * eqCellH + eqGap;
  const equipment: Rect = {
    x: pad,
    y,
    w: panelW - pad * 2,
    h: eqBlockH,
  };
  y += eqBlockH + 6;

  const hint: Rect = {
    x: pad,
    y,
    w: panelW - pad * 2,
    h: hintH,
  };
  y += hintH + 8;

  const bottomY = panelH - pad - closeH;
  const close: Rect | null = showCloseText
    ? {
        x: pad,
        y: panelH - pad - closeH,
        w: panelW - pad * 2,
        h: closeH,
      }
    : null;

  let bagGrid: Rect;
  let detail: Rect;
  let cellSize: number;
  let visibleRows: number;
  let scrollable: boolean;
  let bagHeader: Rect = { x: 0, y: 0, w: 0, h: 0 };
  let bagLabel: Rect = { x: 0, y: 0, w: 0, h: 0 };
  let sortBtn: Rect = { x: 0, y: 0, w: 0, h: 0 };

  const contentTop = y;
  const contentH = Math.max(80, bottomY - contentTop);

  const placeBagHeader = (x: number, bandY: number, bandW: number): void => {
    bagHeader = { x, y: bandY, w: bandW, h: headerBand };
    sortBtn = {
      x: x + bandW - sortW,
      y: bandY + Math.max(0, Math.floor((headerBand - sortH) / 2)),
      w: sortW,
      h: sortH,
    };
    bagLabel = {
      x,
      y: bandY,
      w: Math.max(40, bandW - sortW - gap),
      h: headerBand,
    };
  };

  if (detailBeside) {
    const detailW = Math.min(
      220,
      Math.max(140, Math.floor((panelW - pad * 2) * 0.28)),
    );
    const bagW = panelW - pad * 2 - gap - detailW;
    detail = {
      x: pad + bagW + gap,
      y: contentTop,
      w: detailW,
      h: contentH,
    };
    placeBagHeader(pad, contentTop, bagW);
    const gridH = contentH - headerBand;
    bagGrid = {
      x: pad,
      y: contentTop + headerBand,
      w: bagW,
      h: gridH,
    };

    const fitW = Math.floor((bagW - bagGap * (bagCols - 1)) / bagCols);
    const fitAllH = Math.floor((gridH - bagGap * (bagRows - 1)) / bagRows);
    cellSize = Math.max(
      minCell,
      Math.min(maxCell, fitW, Math.max(fitAllH, minCell)),
    );
    // Cap by width always.
    cellSize = Math.min(cellSize, fitW);
    cellSize = Math.max(minCell, Math.min(maxCell, cellSize));

    const rowPitch = cellSize + bagGap;
    visibleRows = Math.max(
      1,
      Math.min(bagRows, Math.floor((gridH + bagGap) / rowPitch)),
    );
    // If min cell forces fewer rows than bagRows, scroll.
    if (visibleRows < bagRows) {
      scrollable = true;
    } else {
      // Prefer fitting all rows by shrinking cell (not below min).
      const fitH = Math.floor((gridH - bagGap * (bagRows - 1)) / bagRows);
      if (fitH >= minCell) {
        cellSize = Math.min(
          cellSize,
          Math.max(minCell, Math.min(maxCell, fitW, fitH)),
        );
        visibleRows = bagRows;
        scrollable = false;
      } else {
        scrollable = true;
      }
    }
  } else {
    const detailH = detailMinH;
    detail = {
      x: pad,
      y: bottomY - detailH,
      w: panelW - pad * 2,
      h: detailH,
    };
    const bagBottom = detail.y - gap;
    const bagAreaH = Math.max(60, bagBottom - contentTop);
    const bagW = panelW - pad * 2;
    placeBagHeader(pad, contentTop, bagW);
    const gridH = bagAreaH - headerBand;
    bagGrid = {
      x: pad,
      y: contentTop + headerBand,
      w: bagW,
      h: gridH,
    };

    const fitW = Math.floor((bagW - bagGap * (bagCols - 1)) / bagCols);
    const fitH = Math.floor((gridH - bagGap * (bagRows - 1)) / bagRows);
    if (fitH >= minCell && fitW >= minCell) {
      cellSize = Math.min(maxCell, fitW, fitH);
      visibleRows = bagRows;
      scrollable = false;
    } else {
      cellSize = Math.max(minCell, Math.min(maxCell, fitW));
      const rowPitch = cellSize + bagGap;
      visibleRows = Math.max(
        1,
        Math.min(bagRows, Math.floor((gridH + bagGap) / rowPitch)),
      );
      scrollable = visibleRows < bagRows;
    }
  }

  // Equipment name column: card width minus icon + padding.
  const eqCellW = (equipment.w - eqGap * (eqCols - 1)) / eqCols;
  const eqIconGuess = touch ? (short ? 24 : 28) : 36;
  const eqNameMaxPx = Math.max(48, Math.floor(eqCellW - eqIconGuess - 14));

  return {
    panel: { x: 0, y: 0, w: panelW, h: panelH },
    title,
    equipment,
    hint,
    bagHeader,
    bagLabel,
    sortBtn,
    bagGrid,
    detail,
    close,
    cellSize,
    visibleRows,
    scrollable,
    detailBeside,
    showCloseText,
    pad,
    gap,
    eqCols,
    eqCellH,
    eqGap,
    bagGap,
    headerBand,
    eqNameMaxPx,
  };
}
