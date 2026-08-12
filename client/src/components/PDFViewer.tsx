'use client';

import { useEffect, useState } from 'react';

interface PDFViewerProps {
  pdfUrl?: string | null;
  className?: string;
}

const IFRAME_LOAD_TIMEOUT = 15000;

export function PDFViewer({ pdfUrl, className }: PDFViewerProps) {
  const [isIframeLoading, setIsIframeLoading] = useState(true);

  useEffect(() => {
    if (!pdfUrl) return;

    setIsIframeLoading(true);
    const timer = window.setTimeout(() => setIsIframeLoading(false), IFRAME_LOAD_TIMEOUT);

    return () => {
      window.clearTimeout(timer);
    };
  }, [pdfUrl]);

  if (!pdfUrl) {
    return (
      <div
        className={`flex min-h-[320px] items-center justify-center ${className ?? ''}`}
      >
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
          <p className="text-sm">Loading PDF preview...</p>
        </div>
      </div>
    );
  }

  // PDF is 8.5 x 13 inches (215.9mm x 330.2mm)
  // Calculate aspect ratio: 330.2 / 215.9 ≈ 1.53
  const aspectRatio = 330.2 / 215.9;

  return (
    <div className={`flex justify-center py-4 ${className ?? ''}`}>
      <div className="relative w-full max-w-[800px]" style={{ aspectRatio: `${aspectRatio}` }}>
        {isIframeLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/90">
            <div className="flex flex-col items-center gap-3 text-gray-500">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
              <p className="text-sm">Loading PDF preview...</p>
            </div>
          </div>
        )}
        <iframe
          src={pdfUrl}
          onLoad={() => setIsIframeLoading(false)}
          className="absolute inset-0 h-full w-full border-0 shadow-lg"
          title="PDF Preview"
        />
      </div>
    </div>
  );
}
