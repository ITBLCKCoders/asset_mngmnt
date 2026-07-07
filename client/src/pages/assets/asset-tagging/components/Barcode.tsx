'use client';

import { useMemo } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeProps {
  value: string;
  width?: number;
  format?: string;
  className?: string;
}

export function Barcode({ value, width = 200, format = 'CODE128', className }: BarcodeProps) {
  const { dataUrl, naturalWidth } = useMemo(() => {
    try {
      const canvas = document.createElement('canvas');
      const encodedValue = format === 'CODE39' ? value.toUpperCase() : value;
      JsBarcode(canvas, encodedValue, {
        format,
        width: 8,
        height: 120,
        displayValue: false,
        margin: 16,
        background: '#ffffff',
        lineColor: '#000000',
      });
      return { dataUrl: canvas.toDataURL('image/png'), naturalWidth: canvas.width };
    } catch {
      return { dataUrl: '', naturalWidth: 0 };
    }
  }, [value, format]);

  if (!dataUrl) return null;

  const displayWidth = Math.min(naturalWidth, width);

  return (
    <img
      src={dataUrl}
      alt="barcode"
      className={className}
      style={{ width: displayWidth, height: 'auto', imageRendering: 'pixelated' }}
    />
  );
}
