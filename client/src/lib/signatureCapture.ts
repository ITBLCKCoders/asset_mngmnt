/**
 * Shared digital-signature capture utility.
 *
 * Every saved signature image is normalized onto the same fixed-size canvas
 * (ink trimmed, aspect-preserving fit, centered) so signatures look the same
 * size everywhere they are displayed — profile preview, on-screen forms, and
 * every generated PDF.
 */

/** Fixed output canvas every saved signature is rendered onto (px). */
export const SIGNATURE_OUTPUT_WIDTH = 1000;
export const SIGNATURE_OUTPUT_HEIGHT = 400;
/** Whitespace kept between the ink and the canvas edges (px). */
export const SIGNATURE_OUTPUT_PADDING = 40;
/** Stroke width (px) used when re-drawing strokes on the output canvas. */
export const SIGNATURE_OUTPUT_STROKE_WIDTH = 6;

/**
 * Minimal shape of the parts of a react-signature-canvas ref we need.
 * Typed loosely on purpose: the library's internal point objects carry
 * extra fields (time, etc.) that we intentionally ignore.
 */
export interface SignaturePadLike {
  toData?: () => unknown;
  getCanvas?: () => HTMLCanvasElement | null;
  getTrimmedCanvas?: () => HTMLCanvasElement | null;
}

/** Placement of a source box scaled/centered inside a target box. */
export interface SignaturePlacement {
  scale: number;
  drawWidth: number;
  drawHeight: number;
  offsetX: number;
  offsetY: number;
}

/**
 * Pure geometry (unit-agnostic): compute how a source box (e.g. a
 * signature's ink bounding box) must be scaled and offset so it fits —
 * centered, aspect ratio preserved — inside a target box with inner padding.
 */
export const fitSignaturePlacement = (
  srcWidth: number,
  srcHeight: number,
  targetWidth: number,
  targetHeight: number,
  padding = 0
): SignaturePlacement => {
  const availW = Math.max(1, targetWidth - padding * 2);
  const availH = Math.max(1, targetHeight - padding * 2);
  const safeSrcW = Math.max(1, srcWidth);
  const safeSrcH = Math.max(1, srcHeight);
  const scale = Math.min(availW / safeSrcW, availH / safeSrcH);
  const drawWidth = safeSrcW * scale;
  const drawHeight = safeSrcH * scale;
  return {
    scale,
    drawWidth,
    drawHeight,
    offsetX: (targetWidth - drawWidth) / 2,
    offsetY: (targetHeight - drawHeight) / 2,
  };
};

interface StrokePoint {
  x: number;
  y: number;
}

/** Draw the strokes onto a fixed-size canvas, normalized/centered. */
const renderStrokesToNormalizedCanvas = (
  strokes: StrokePoint[][]
): string | null => {
  // Ink bounding box across all strokes
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  strokes.forEach(stroke => {
    if (!stroke || stroke.length === 0) return;
    stroke.forEach(point => {
      if (point.x < minX) minX = point.x;
      if (point.y < minY) minY = point.y;
      if (point.x > maxX) maxX = point.x;
      if (point.y > maxY) maxY = point.y;
    });
  });
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null;

  const inkWidth = Math.max(1, maxX - minX);
  const inkHeight = Math.max(1, maxY - minY);
  const { scale, offsetX, offsetY } = fitSignaturePlacement(
    inkWidth,
    inkHeight,
    SIGNATURE_OUTPUT_WIDTH,
    SIGNATURE_OUTPUT_HEIGHT,
    SIGNATURE_OUTPUT_PADDING
  );

  const canvas = document.createElement('canvas');
  canvas.width = SIGNATURE_OUTPUT_WIDTH;
  canvas.height = SIGNATURE_OUTPUT_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // White background (matches what Cloudinary previously stored)
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'black';
  ctx.lineWidth = SIGNATURE_OUTPUT_STROKE_WIDTH;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  strokes.forEach(stroke => {
    if (!stroke || stroke.length === 0) return;
    ctx.beginPath();
    ctx.moveTo(
      (stroke[0].x - minX) * scale + offsetX,
      (stroke[0].y - minY) * scale + offsetY
    );
    for (let i = 1; i < stroke.length; i++) {
      ctx.lineTo(
        (stroke[i].x - minX) * scale + offsetX,
        (stroke[i].y - minY) * scale + offsetY
      );
    }
    ctx.stroke();
  });
  return canvas.toDataURL('image/png');
};

/** Fit an existing (trimmed or raw) canvas onto the fixed output canvas. */
const renderSourceCanvasToNormalizedCanvas = (
  source: HTMLCanvasElement | null
): string | null => {
  try {
    if (!source || !source.width || !source.height) return null;
    const { scale, offsetX, offsetY } = fitSignaturePlacement(
      source.width,
      source.height,
      SIGNATURE_OUTPUT_WIDTH,
      SIGNATURE_OUTPUT_HEIGHT,
      SIGNATURE_OUTPUT_PADDING
    );
    const canvas = document.createElement('canvas');
    canvas.width = SIGNATURE_OUTPUT_WIDTH;
    canvas.height = SIGNATURE_OUTPUT_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
      source,
      offsetX,
      offsetY,
      source.width * scale,
      source.height * scale
    );
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
};

/**
 * Capture a signature pad into a normalized, fixed-size PNG data URL.
 *
 * Strategy (first success wins):
 *  1. Stroke data (`toData`) — re-drawn normalized onto the output canvas.
 *  2. Trimmed canvas (`getTrimmedCanvas`) — fit-centered.
 *  3. Raw canvas (`getCanvas`) — fit-centered (may carry whitespace).
 *
 * Returns `null` when the pad is empty or capture fails.
 */
export const captureSignatureFromPad = (
  pad: SignaturePadLike | null
): string | null => {
  if (!pad) return null;

  // 1. Preferred: stroke data
  try {
    const strokes = pad.toData?.() as StrokePoint[][] | undefined;
    if (strokes && strokes.length > 0) {
      const dataUrl = renderStrokesToNormalizedCanvas(strokes);
      if (dataUrl && dataUrl !== 'data:,') return dataUrl;
    }
  } catch {
    /* fall through to canvas fallbacks */
  }

  // 2. Trimmed canvas fallback
  try {
    const dataUrl = renderSourceCanvasToNormalizedCanvas(
      pad.getTrimmedCanvas?.() ?? null
    );
    if (dataUrl && dataUrl !== 'data:,') return dataUrl;
  } catch {
    /* fall through */
  }

  // 3. Raw canvas fallback
  try {
    const dataUrl = renderSourceCanvasToNormalizedCanvas(
      pad.getCanvas?.() ?? null
    );
    if (dataUrl && dataUrl !== 'data:,') return dataUrl;
  } catch {
    /* ignore */
  }

  return null;
};