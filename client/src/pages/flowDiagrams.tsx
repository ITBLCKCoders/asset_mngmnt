'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, ChevronDown, ChevronUp } from 'lucide-react';

type Diagram = {
  title: string;
  src: string;
  pdfSrc?: string;
};

const DIAGRAMS: Diagram[] = [
  {
    title: 'Asset Assignment Flow Diagram',
    src: '/diagrams/asset-assignment.html',
    pdfSrc: '/diagrams/asset-assignment.pdf',
  },
  {
    title: 'Return Request Flow Diagram',
    src: '/diagrams/Return Request Flow Diagram.drawio.html',
    pdfSrc: '/diagrams/Return Request Flow Diagram.pdf',
  },
  {
    title: 'Return Flow Diagram',
    src: '/diagrams/return-flow.drawio.html',
    pdfSrc: '/diagrams/return-flow.pdf',
  },
  {
    title: 'Asset Transfer Request Diagram',
    src: '/diagrams/Asset Transfer Request.drawio.html',
    pdfSrc: '/diagrams/Asset Transfer Request.pdf',
  },
  {
    title: 'Asset Transfer Flow Diagram',
    src: '/diagrams/assettransfer.drawio.html',
    pdfSrc: '/diagrams/assettransfer.pdf',
  },
];

export default function FlowDiagrams() {
  const iframeRefs = useRef<(HTMLIFrameElement | null)[]>([]);
  const [heights, setHeights] = useState<number[]>(
    () => DIAGRAMS.map(() => 800) // sensible default height
  );
  const [loading, setLoading] = useState<boolean[]>(() =>
    DIAGRAMS.map(() => true)
  );
  const [expanded, setExpanded] = useState<boolean[]>(() =>
    DIAGRAMS.map(() => false)
  );

  useEffect(() => {
    const updateHeights = () => {
      const newHeights = DIAGRAMS.map((_, index) => {
        const iframe = iframeRefs.current[index];
        if (!iframe) return heights[index] ?? 800;

        try {
          const doc = iframe.contentDocument || iframe.contentWindow?.document;
          const body = doc?.body;
          const html = doc?.documentElement;
          const contentHeight = Math.max(
            body?.scrollHeight ?? 0,
            body?.offsetHeight ?? 0,
            html?.clientHeight ?? 0,
            html?.scrollHeight ?? 0,
            html?.offsetHeight ?? 0
          );

          // Fallback if we somehow get 0
          return contentHeight > 0
            ? contentHeight + 40
            : (heights[index] ?? 800);
        } catch {
          // Cross-origin or other access issue; keep existing height
          return heights[index] ?? 800;
        }
      });

      setHeights(newHeights);
    };

    // Run once after mount; iframes will also trigger onLoad handler
    const timeoutId = window.setTimeout(updateHeights, 1000);
    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleIframeLoad = (index: number) => {
    const iframe = iframeRefs.current[index];
    if (!iframe) return;

    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      const body = doc?.body;
      const html = doc?.documentElement;
      const contentHeight = Math.max(
        body?.scrollHeight ?? 0,
        body?.offsetHeight ?? 0,
        html?.clientHeight ?? 0,
        html?.scrollHeight ?? 0,
        html?.offsetHeight ?? 0
      );

      if (contentHeight > 0) {
        setHeights(prev => {
          const next = [...prev];
          next[index] = contentHeight + 40; // small padding
          return next;
        });
      }
    } catch {
      // Ignore if we can't read contents
    }

    setLoading(prev => {
      const next = [...prev];
      next[index] = false;
      return next;
    });
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-red-700 mb-2 tracking-tight">
            FLOW DIAGRAMS
          </h1>
          <p className="text-red-900/80">
            Swimlane flowcharts for assignment, returns, and transfers.
          </p>
        </div>

        {DIAGRAMS.map((diagram, index) => (
          <Card key={diagram.src} className="mb-10 border-red-200 shadow-sm">
            <button
              onClick={() =>
                setExpanded(prev => {
                  const next = [...prev];
                  next[index] = !next[index];
                  return next;
                })
              }
              className="w-full p-4 border-b border-red-100 bg-red-50/60 hover:bg-red-50/80 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-red-900 tracking-wide">
                  {diagram.title}
                </div>
                {expanded[index] ? (
                  <ChevronUp className="h-5 w-5 text-red-700" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-red-700" />
                )}
              </div>
            </button>

            <div
              className="overflow-hidden transition-all duration-300 ease-in-out"
              style={{
                maxHeight: expanded[index]
                  ? `${heights[index] ?? 800}px`
                  : '0px',
                opacity: expanded[index] ? 1 : 0,
              }}
            >
              <div className="p-2 overflow-hidden relative">
                {loading[index] && (
                  <div className="absolute inset-0 bg-gradient-to-r from-red-100 via-red-50 to-red-100 animate-pulse" />
                )}
                <div className="flex justify-center">
                  <div className="w-full max-w-4xl">
                    <iframe
                      ref={el => {
                        iframeRefs.current[index] = el;
                      }}
                      title={diagram.title}
                      src={diagram.src}
                      style={{
                        width: '100%',
                        height: `${heights[index] ?? 800}px`,
                      }}
                      className="border-0 overflow-hidden bg-white w-full"
                      scrolling="no"
                      onLoad={() => handleIframeLoad(index)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
