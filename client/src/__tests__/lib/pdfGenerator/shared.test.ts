import { describe, it, expect } from 'vitest';
import {
  pdfDefaultStyles,
  formatPdfDate,
  computeSignatureFitSize,
  PDF_SIGNATURE_STD_WIDTH_MM,
  PDF_SIGNATURE_STD_HEIGHT_MM,
  PDF_SIGNATURE_MAX_WIDTH_MM,
  PDF_SIGNATURE_MAX_HEIGHT_MM,
  PDF_SIGNATURE_FILL_RATIO,
} from '@/lib/pdfGenerator/shared';
import {
  fitSignaturePlacement,
  SIGNATURE_OUTPUT_WIDTH,
  SIGNATURE_OUTPUT_HEIGHT,
} from '@/lib/signatureCapture';

describe('signatureCapture', () => {
  describe('fitSignaturePlacement', () => {
    it('scales a wide source to fill the output width when width-limited', () => {
      // Wide ink (4:1) in a 1000x400 canvas with 40px padding
      const p = fitSignaturePlacement(800, 200, 1000, 400, 40);
      const availW = 1000 - 80;
      // width-limited: availW/800 < availH/200
      expect(p.scale).toBeCloseTo(availW / 800, 6);
      expect(p.drawWidth).toBeCloseTo(availW, 6);
      expect(p.drawHeight).toBeCloseTo(availW / 4, 6);
      // centered
      expect(p.offsetX).toBeCloseTo(40, 6);
      expect(p.offsetY).toBeCloseTo((400 - p.drawHeight) / 2, 6);
    });

    it('scales a tall source to fill the output height when height-limited', () => {
      const p = fitSignaturePlacement(300, 600, 1000, 400, 40);
      const availH = 400 - 80;
      expect(p.scale).toBeCloseTo(availH / 600, 6);
      expect(p.drawHeight).toBeCloseTo(availH, 6);
      // aspect preserved
      expect(p.drawWidth / p.drawHeight).toBeCloseTo(0.5, 6);
    });

    it('always preserves the source aspect ratio', () => {
      const cases = [
        [1000, 100],
        [10, 900],
        [500, 500],
        [1234, 377],
      ];
      for (const [w, h] of cases) {
        const p = fitSignaturePlacement(w, h, SIGNATURE_OUTPUT_WIDTH, SIGNATURE_OUTPUT_HEIGHT, 40);
        expect(p.drawWidth / p.drawHeight).toBeCloseTo(w / h, 6);
      }
    });

    it('centers the drawing inside the target box', () => {
      const p = fitSignaturePlacement(400, 400, 1000, 400, 40);
      expect(p.offsetX + p.drawWidth / 2).toBeCloseTo(500, 6);
      expect(p.offsetY + p.drawHeight / 2).toBeCloseTo(200, 6);
    });

    it('degenerate source sizes do not divide by zero', () => {
      const p = fitSignaturePlacement(0, 0, 1000, 400, 40);
      expect(Number.isFinite(p.scale)).toBe(true);
      expect(Number.isFinite(p.drawWidth)).toBe(true);
      expect(Number.isFinite(p.drawHeight)).toBe(true);
    });

    it('handles a target box smaller than the padding', () => {
      const p = fitSignaturePlacement(500, 500, 50, 50, 40);
      // available space is clamped to >= 1px so the math stays finite
      expect(Number.isFinite(p.scale)).toBe(true);
      expect(p.drawWidth).toBeGreaterThan(0);
      expect(p.drawHeight).toBeGreaterThan(0);
    });
  });
});

describe('pdfGenerator shared', () => {
  describe('pdfDefaultStyles', () => {
    it('should provide default style constants', () => {
      expect(pdfDefaultStyles).toBeDefined();
      expect(typeof pdfDefaultStyles.primaryColor).toBe('string');
    });
  });

  describe('formatPdfDate', () => {
    it('should format date string', () => {
      const result = formatPdfDate('2026-06-23');
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle empty input', () => {
      expect(formatPdfDate('')).toBe('');
    });
  });

  describe('computeSignatureFitSize', () => {
    it('fits signatures inside the shared standard box', () => {
      // Wide ink (aspect 3:1) — width-limited inside 36x18 box
      const wide = computeSignatureFitSize(300, 100);
      expect(wide.width).toBeCloseTo(PDF_SIGNATURE_STD_WIDTH_MM, 6);
      expect(wide.height).toBeCloseTo(PDF_SIGNATURE_STD_WIDTH_MM / 3, 6);
      expect(wide.height).toBeLessThanOrEqual(PDF_SIGNATURE_STD_HEIGHT_MM);

      // Tall ink (aspect 0.5:1) — height-limited
      const tall = computeSignatureFitSize(100, 200);
      expect(tall.height).toBeCloseTo(PDF_SIGNATURE_STD_HEIGHT_MM, 6);
      expect(tall.width).toBeCloseTo(PDF_SIGNATURE_STD_HEIGHT_MM / 2, 6);
      expect(tall.width).toBeLessThanOrEqual(PDF_SIGNATURE_STD_WIDTH_MM);
    });

    it('renders every signature at the same size regardless of input size', () => {
      // A huge saved image and a small one with the same aspect must
      // produce identical mm dimensions (uniform display size).
      const big = computeSignatureFitSize(3000, 1000);
      const small = computeSignatureFitSize(300, 100);
      expect(big.width).toBeCloseTo(small.width, 6);
      expect(big.height).toBeCloseTo(small.height, 6);
    });

    it('caps width further for cell-centered signatures', () => {
      const cellWidthMm = 30;
      const fit = computeSignatureFitSize(1000, 400, { cellWidthMm });
      const allowance =
        (cellWidthMm - 2 /* PDF_SIGNATURE_CELL_PADDING_MM */ * 2) *
        PDF_SIGNATURE_FILL_RATIO;
      expect(fit.width).toBeLessThanOrEqual(allowance);
      expect(fit.height).toBeLessThanOrEqual(PDF_SIGNATURE_STD_HEIGHT_MM);
    });

    it('respects the outer max bounds', () => {
      const fit = computeSignatureFitSize(10, 1000, {
        maxWidthMm: PDF_SIGNATURE_MAX_WIDTH_MM,
        maxHeightMm: PDF_SIGNATURE_MAX_HEIGHT_MM,
      });
      expect(fit.height).toBeLessThanOrEqual(PDF_SIGNATURE_MAX_HEIGHT_MM);
      expect(fit.width).toBeLessThanOrEqual(PDF_SIGNATURE_MAX_WIDTH_MM);
      // tiny-but-tall ink is height-limited by the standard box
      expect(fit.height).toBeCloseTo(PDF_SIGNATURE_STD_HEIGHT_MM, 6);
    });

    it('returns zero size for a degenerate cell allowance', () => {
      const fit = computeSignatureFitSize(100, 100, { cellWidthMm: 4 });
      expect(fit.width).toBe(0);
      expect(fit.height).toBe(0);
    });

    it('preserves aspect ratio', () => {
      const fit = computeSignatureFitSize(1234, 377);
      expect(fit.width / fit.height).toBeCloseTo(1234 / 377, 6);
    });
  });
});
