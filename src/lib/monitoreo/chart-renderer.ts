/**
 * Chart renderer — Canvas bar chart for DOCX embedding.
 * Adapted from the standalone baseline-quality-dashboards' generateBarChart function.
 * Returns a base64-encoded PNG string for embedding in Word documents.
 */

export interface ChartDataset {
  label: string;
  value: number;
  exceeds: boolean;
}

export interface ChartOptions {
  title?: string;
  unit?: string;
  ecaThreshold?: number | null;
  width?: number;
  height?: number;
  colorNormal?: string;
  colorExceed?: string;
}

const DEFAULT_WIDTH = 480;
const DEFAULT_HEIGHT = 240;

function hexToRgba(hex: string, alpha = 1): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function renderBarChart(
  datasets: ChartDataset[],
  options: ChartOptions = {},
): string {
  const {
    title = "",
    unit = "",
    ecaThreshold = null,
    width = DEFAULT_WIDTH,
    height = DEFAULT_HEIGHT,
    colorNormal = "#1A6BAD",
    colorExceed = "#C0392B",
  } = options;

  const dpr = 2; // retina
  const w = width * dpr;
  const h = height * dpr;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  // Background
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);

  // Title
  if (title) {
    ctx.fillStyle = "#0F2E4A";
    ctx.font = `bold 12px "Segoe UI", Arial, sans-serif`;
    ctx.fillText(title, 12, 20);
  }

  const chartLeft = 50;
  const chartRight = width - 12;
  const chartTop = title ? 30 : 12;
  const chartBottom = height - 30;
  const chartW = chartRight - chartLeft;
  const chartH = chartBottom - chartTop;

  if (datasets.length === 0) {
    ctx.fillStyle = "#9ca3af";
    ctx.font = "11px 'Segoe UI', Arial";
    ctx.fillText("Sin datos", chartLeft + chartW / 2 - 20, chartTop + chartH / 2);
    return canvas.toDataURL("image/png");
  }

  const maxVal = Math.max(
    ...datasets.map((d) => Math.abs(d.value)),
    ecaThreshold ?? 0,
  );
  const yMax = Math.ceil((maxVal * 1.15) / 10) * 10 || 100;
  const yMin = 0;

  const barCount = datasets.length;
  const groupPadding = 10;
  const barPadding = 2;
  const groupW = (chartW - groupPadding * 2) / barCount;
  const barW = Math.max(4, groupW - barPadding * 2);

  // Y-axis gridlines
  const gridLines = 4;
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= gridLines; i++) {
    const yFrac = i / gridLines;
    const yPx = chartBottom - yFrac * chartH;
    const val = yMin + yFrac * (yMax - yMin);
    ctx.beginPath();
    ctx.moveTo(chartLeft, yPx);
    ctx.lineTo(chartRight, yPx);
    ctx.stroke();
    ctx.fillStyle = "#9ca3af";
    ctx.font = "10px 'Segoe UI', Arial";
    ctx.fillText(String(Math.round(val)), 2, yPx + 3);
  }

  // ECA threshold line
  if (ecaThreshold != null && ecaThreshold > 0) {
    const ecaYFrac = (ecaThreshold - yMin) / (yMax - yMin);
    const ecaYPx = chartBottom - ecaYFrac * chartH;
    ctx.save();
    ctx.strokeStyle = "#C0392B";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(chartLeft, ecaYPx);
    ctx.lineTo(chartRight, ecaYPx);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#C0392B";
    ctx.font = "10px 'Segoe UI', Arial";
    ctx.fillText(`ECA: ${ecaThreshold}`, chartRight - 55, ecaYPx - 4);
    ctx.restore();
  }

  // Bars
  datasets.forEach((d, i) => {
    const xFrac = i / barCount;
    const xPx = chartLeft + groupPadding + xFrac * (chartW - groupPadding * 2) + (groupW - barW) / 2;
    const valFrac = d.value / yMax;
    const barH = Math.max(2, valFrac * chartH);
    const barY = chartBottom - barH;

    // Gradient
    const grad = ctx.createLinearGradient(xPx, barY, xPx, chartBottom);
    const baseColor = d.exceeds ? colorExceed : colorNormal;
    grad.addColorStop(0, hexToRgba(baseColor, 0.9));
    grad.addColorStop(1, hexToRgba(baseColor, 0.5));
    ctx.fillStyle = grad;
    ctx.fillRect(xPx, barY, barW, barH);

    // Border
    ctx.strokeStyle = baseColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(xPx, barY, barW, barH);

    // Value label
    ctx.fillStyle = d.exceeds ? colorExceed : "#374151";
    ctx.font = "9px 'Segoe UI', Arial";
    const valText = d.value % 1 === 0 ? String(d.value) : d.value.toFixed(1);
    ctx.fillText(valText, xPx + barW / 2 - ctx.measureText(valText).width / 2, barY - 3);

    // X label (station code)
    ctx.fillStyle = "#6b7280";
    ctx.font = "9px 'Segoe UI', Arial";
    const lbl = d.label.length > 8 ? d.label.slice(0, 7) + "…" : d.label;
    ctx.fillText(lbl, xPx + barW / 2 - ctx.measureText(lbl).width / 2, chartBottom + 12, barW);
  });

  // Y-axis label
  ctx.save();
  ctx.translate(14, chartTop + chartH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = "#6b7280";
  ctx.font = "10px 'Segoe UI', Arial";
  ctx.fillText(unit || "Valor", 0, 0);
  ctx.restore();

  // X-axis line
  ctx.strokeStyle = "#d1d5db";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(chartLeft, chartBottom);
  ctx.lineTo(chartRight, chartBottom);
  ctx.stroke();

  return canvas.toDataURL("image/png");
}
