'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Maximize2, Minimize2 } from 'lucide-react';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  pdfUrl: string;
  className?: string;
}

export function PDFViewer({ pdfUrl, className }: PDFViewerProps) {
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [scale, setScale] = useState(1.0);
  const [pageCanvases, setPageCanvases] = useState<{ pageNum: number; viewport: pdfjsLib.PageViewport }[]>([]);
  const renderTasksRef = useRef<pdfjsLib.RenderTask[]>([]);
  const [renderedPages, setRenderedPages] = useState<Set<number>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const loadPDF = async () => {
      try {
        // Cancel any existing render tasks
        renderTasksRef.current.forEach(task => {
          if (task) task.cancel();
        });
        renderTasksRef.current = [];

        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        canvasRefs.current = new Array(pdf.numPages).fill(null);
        setRenderedPages(new Set());
        setPageCanvases([]);
      } catch (error) {
        console.error('Error loading PDF:', error);
      }
    };

    loadPDF();
  }, [pdfUrl]);

  // Render a single page
  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDoc || renderedPages.has(pageNum)) return;

    const canvas = canvasRefs.current[pageNum - 1];
    if (!canvas) return;

    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale, rotation: page.rotate });

      // Clear the canvas before rendering
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        canvas.style.height = `${viewport.height}px`;
        canvas.style.width = `${viewport.width}px`;

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
          canvas: canvas,
        };

        const renderTask = page.render(renderContext);
        renderTasksRef.current[pageNum - 1] = renderTask;
        await renderTask.promise;

        setRenderedPages(prev => new Set([...prev, pageNum]));
        setPageCanvases(prev => {
          const existing = prev.find(p => p.pageNum === pageNum);
          if (existing) return prev;
          return [...prev, { pageNum, viewport }];
        });
      }
    } catch (error) {
      // Ignore RenderingCancelledException
      if (error && (error as any).name === 'RenderingCancelledException') {
        return;
      }
      console.error(`Error rendering page ${pageNum}:`, error);
    }
  }, [pdfDoc, scale, renderedPages]);

  // Set up Intersection Observer for lazy loading
  useEffect(() => {
    if (!pdfDoc || !containerRef.current) return;

    // Clean up previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Pre-render first 3 pages immediately
    const pagesToPreRender = Math.min(3, pdfDoc.numPages);
    for (let i = 1; i <= pagesToPreRender; i++) {
      renderPage(i);
    }

    // Set up intersection observer for remaining pages
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const pageNum = parseInt(entry.target.getAttribute('data-page-num') || '0');
            if (pageNum > 0 && pageNum <= pdfDoc.numPages) {
              renderPage(pageNum);
            }
          }
        });
      },
      {
        root: containerRef.current,
        rootMargin: '200px', // Start rendering before page enters viewport
        threshold: 0.1,
      }
    );

    observerRef.current = observer;

    // Observe all canvas elements
    canvasRefs.current.forEach((canvas, index) => {
      if (canvas && index + 1 > pagesToPreRender) {
        canvas.setAttribute('data-page-num', String(index + 1));
        observer.observe(canvas);
      }
    });

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [pdfDoc, renderPage]);

  // Re-render all rendered pages when scale changes
  useEffect(() => {
    if (!pdfDoc || scale === 1.0) return; // Skip initial render

    const rerenderPages = async () => {
      // Cancel existing render tasks
      renderTasksRef.current.forEach(task => {
        if (task) task.cancel();
      });
      renderTasksRef.current = [];

      const pagesToRerender = Array.from(renderedPages).sort((a, b) => a - b);
      
      for (const pageNum of pagesToRerender) {
        await renderPage(pageNum);
      }
    };

    rerenderPages();
  }, [scale, pdfDoc, renderedPages, renderPage]);

  const onZoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3.0));
  };

  const onZoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

  const onFitToWidth = () => {
    if (pageCanvases.length === 0) return;
    const containerWidth = canvasRefs.current[0]?.parentElement?.clientWidth || 800;
    const newScale = (containerWidth - 32) / pageCanvases[0].viewport.width;
    setScale(Math.max(newScale, 0.5));
  };

  const onFitToPage = () => {
    if (pageCanvases.length === 0) return;
    const containerWidth = canvasRefs.current[0]?.parentElement?.clientWidth || 800;
    const containerHeight = canvasRefs.current[0]?.parentElement?.clientHeight || 600;
    const scaleX = (containerWidth - 32) / pageCanvases[0].viewport.width;
    const scaleY = (containerHeight - 32) / pageCanvases[0].viewport.height;
    setScale(Math.max(Math.min(scaleX, scaleY), 0.5));
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Controls */}
      <div className="flex items-center justify-between gap-2 p-2 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onZoomOut}
            disabled={scale <= 0.5}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[60px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={onZoomIn}
            disabled={scale >= 3.0}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onFitToWidth}>
            <Minimize2 className="h-4 w-4 mr-2" />
            Fit Width
          </Button>
          <Button variant="outline" size="sm" onClick={onFitToPage}>
            <Maximize2 className="h-4 w-4 mr-2" />
            Fit Page
          </Button>
        </div>

        {pdfDoc && (
          <span className="text-sm text-gray-600">
            {pdfDoc.numPages} page{pdfDoc.numPages > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Canvas Container */}
      <div ref={containerRef} className="flex-1 overflow-auto bg-gray-100 p-4 min-h-0">
        <div className="flex flex-col items-center gap-4">
          {pdfDoc &&
            Array.from({ length: pdfDoc.numPages }, (_, i) => (
              <div key={i} className="relative">
                <canvas
                  ref={el => {
                    canvasRefs.current[i] = el;
                  }}
                  className="shadow-lg"
                />
                {pageCanvases[i] && (
                  <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                    Page {i + 1}
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
