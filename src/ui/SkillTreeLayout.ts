/** Fit a class skill tree inside a panel so cards do not cover each other. */

export type SkillTreeNodePos = { col: number; row: number };

export type SkillTreeFit = {
  cellW: number;
  cellH: number;
  nodeW: number;
  nodeH: number;
  /** Shift so an asymmetric tree stays centered. */
  originX: number;
  originY: number;
  titleY: number;
  pointsY: number;
  detailY: number;
  detailWrap: number;
  nodeFont: number;
  rankFont: number;
  pointsFont: number;
};

export function skillNodeCenter(
  fit: SkillTreeFit,
  col: number,
  row: number,
): { x: number; y: number } {
  return {
    x: fit.originX + col * fit.cellW,
    y: fit.originY + row * fit.cellH,
  };
}

function span(
  nodes: SkillTreeNodePos[],
  key: 'col' | 'row',
): {
  min: number;
  max: number;
} {
  let min = 0;
  let max = 0;
  for (const n of nodes) {
    min = Math.min(min, n[key]);
    max = Math.max(max, n[key]);
  }
  return { min, max };
}

/**
 * Panel-center coordinates. Cards scale down on a short phone so the
 * header, the close control, and the detail line each keep their own band.
 */
export function fitSkillTree(
  panelW: number,
  panelH: number,
  nodes: SkillTreeNodePos[],
): SkillTreeFit {
  const pad = Math.max(8, Math.round(Math.min(panelW, panelH) * 0.03));
  const closeBtn = Math.max(28, Math.round(panelH * 0.12));
  const titleH = Math.max(16, Math.round(panelH * 0.07));
  const pointsH = Math.max(14, Math.round(panelH * 0.06));
  const detailH = Math.max(32, Math.round(panelH * 0.18));
  const top = pad + Math.max(titleH + pointsH, closeBtn) + 6;
  const innerH = Math.max(48, panelH - top - detailH - pad);
  const innerW = Math.max(48, panelW - pad * 2);

  const cols = span(nodes, 'col');
  const rows = span(nodes, 'row');
  const colSpan = Math.max(1, cols.max - cols.min);
  const rowSpan = Math.max(1, rows.max - rows.min);

  let cellW = innerW / (colSpan + 0.9);
  let cellH = innerH / (rowSpan + 0.9);
  cellW = Math.min(cellW, 168);
  cellH = Math.min(cellH, 92);
  // Stay inside the cell. A fixed minimum made short phones overlap.
  const nodeW = Math.min(150, cellW * 0.84);
  const nodeH = Math.min(70, cellH * 0.72, nodeW * 0.62);

  const midCol = (cols.min + cols.max) / 2;
  const midRow = (rows.min + rows.max) / 2;
  const bandCenter = -panelH / 2 + top + innerH / 2;

  return {
    cellW,
    cellH,
    nodeW,
    nodeH,
    originX: -midCol * cellW,
    originY: bandCenter - midRow * cellH,
    titleY: -panelH / 2 + pad + titleH / 2,
    pointsY: -panelH / 2 + pad + titleH + 4 + pointsH / 2,
    detailY: panelH / 2 - pad - detailH,
    detailWrap: Math.max(120, panelW - pad * 2),
    nodeFont: Math.max(10, Math.min(15, Math.round(nodeH * 0.26))),
    rankFont: Math.max(9, Math.min(12, Math.round(nodeH * 0.2))),
    pointsFont: Math.max(10, Math.min(14, Math.round(pointsH * 0.8))),
  };
}
