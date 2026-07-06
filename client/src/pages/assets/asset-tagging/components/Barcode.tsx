'use client';

import { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeProps {
  value: string;
  width?: number;
  format?: string;
  className?: string;
}

export function Barcode({ value, width = 200, format = 'CODE128', className }: BarcodeProps) {
  const [dataUrl, setDataUrl] = useState('');
  const [naturalWidth, setNaturalWidth] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const encodedValue = format === 'CODE39' ? value.toUpperCase() : value;
      JsBarcode(canvas, encodedValue, {
        format,
        width: 6,
        height: 120,
        displayValue: false,
        margin: 20,
        background: '#ffffff',
        lineColor: '#000000',
      });
      if (mountedRef.current) {
        setNaturalWidth(canvas.width);
        setDataUrl(canvas.toDataURL('image/png'));
      }
    } catch {
      if (mountedRef.current) setDataUrl('');
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
