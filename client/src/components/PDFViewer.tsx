'use client';

import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { GlobalWorkerOptions } from 'pdfjs-dist';

// Set worker to use local file from node_modules
GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

interface PDFViewerProps {
  pdfUrl: string;
  className?: string;
}

export function PDFViewer({ pdfUrl, className }: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);
  const renderRunRef = useRef(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const renderRunId = ++renderRunRef.current;
    let isActive = true;

    const renderPDF = async () => {
      // Cancel previous render if any
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }

      if (!containerRef.current || !pdfUrl) return;

      // Clear previous canvases
      containerRef.current.innerHTML = '';

      try {
        setError(null);
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        if (!isActive || renderRunRef.current !== renderRunId) return;
        
        const numPages = pdf.numPages;
        const scale = 1.5;

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          if (!isActive || renderRunRef.current !== renderRunId) return;

          const page = await pdf.getPage(pageNum);
          if (!isActive || renderRunRef.current !== renderRunId) return;

          const viewport = page.getViewport({ scale });

          const canvas = document.createElement('canvas');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          canvas.className = 'mx-auto mb-4 block max-w-full bg-white shadow-sm';

          const context = canvas.getContext('2d');
          if (!context) continue;

          const renderContext = {
            canvasContext: context,
            viewport: viewport,
            canvas: canvas,
          };

          renderTaskRef.current = page.render(renderContext);
          await renderTaskRef.current.promise;
          renderTaskRef.current = null;

          if (!isActive || renderRunRef.current !== renderRunId || !containerRef.current) {
            return;
          }

          containerRef.current.appendChild(canvas);
        }
      } catch (err) {
        if (
          isActive &&
          renderRunRef.current === renderRunId &&
          (err as any).name !== 'RenderingCancelledException'
        ) {
          console.error('Error rendering PDF:', err);
          setError('Failed to load PDF');
        }
      }
    };

    renderPDF();

    return () => {
      isActive = false;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [pdfUrl]);

  if (error) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`bg-gray-100 p-4 ${className ?? ''}`}
      style={{ overflowY: 'auto' }}
    />
  );
}
