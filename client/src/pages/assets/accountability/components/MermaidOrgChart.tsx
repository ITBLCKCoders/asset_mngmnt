'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  FileDown,
  Loader2,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import {
  AppDialogFrame,
  AppDialogGradientHeader,
  AppDialogChromeFooter,
} from '@/components/common/appDialogChrome';
import {
  buildMermaidDefinition,
  type MermaidOrgModel,
} from '../mermaidOrgChartModel';

interface MermaidOrgChartProps {
  model: MermaidOrgModel;
  title?: string;
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 10;
const ZOOM_STEP = 0.25;

async function svgToCanvas(svg: SVGSVGElement): Promise<HTMLCanvasElement> {
  const naturalW = svg.viewBox.baseVal.width || 800;
  const naturalH = svg.viewBox.baseVal.height || 600;

  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(naturalW));
  clone.setAttribute('height', String(naturalH));
  const serialized = new XMLSerializer().serializeToString(clone);
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to rasterize the org chart'));
    img.src = url;
  });

  const canvas = document.createElement('canvas');
  canvas.width = naturalW;
  canvas.height = naturalH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, naturalW, naturalH);
  ctx.drawImage(img, 0, 0, naturalW, naturalH);
  return canvas;
}

async function exportOrgChartPdf(
  svg: SVGSVGElement,
  filename: string
): Promise<void> {
  const canvas = await svgToCanvas(svg);
  const { jsPDF } = await import('jspdf');
  const orientation =
    canvas.height > canvas.width ? 'portrait' : 'landscape';
  const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
  const margin = 10;
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const availW = pageW - margin * 2;
  const availH = pageH - margin * 2;
  const ratio = canvas.height / canvas.width;
  let w = availW;
  let h = w * ratio;
  if (h > availH) {
    h = availH;
    w = h / ratio;
  }
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, margin, w, h);
  pdf.save(filename);
}

interface ChartPanelProps {
  model: MermaidOrgModel;
  filename: string;
  containerClassName?: string;
}

function ChartPanel({
  model,
  filename,
  containerClassName = 'mx-1 sm:mx-2 max-h-[calc(100dvh-12rem)]',
}: ChartPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgWrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<HTMLDivElement>(null);
  const [svgHtml, setSvgHtml] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'loose',
          theme: 'base',
          fontFamily: 'inherit',
          flowchart: { htmlLabels: true, curve: 'basis', padding: 10 },
          themeVariables: { fontSize: '13px' },
        });
        const def = buildMermaidDefinition(model);
        const uid = `orgchart-${Math.random().toString(36).slice(2, 10)}`;
        const { svg } = await mermaid.render(uid, def);
        if (cancelled) return;
        setSvgHtml(svg);
        setError(null);
      } catch (e) {
        if (!cancelled) {
          console.error('Mermaid org chart render failed:', e);
          setError('Failed to render the org chart');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [model]);

  useEffect(() => {
    const container = svgRef.current;
    if (!container || !svgHtml) return;
    const nodeIds = Object.keys(model.actions);
    const groups = container.querySelectorAll<SVGGElement>(
      'g[id^="flowchart-"]'
    );
    groups.forEach(g => {
      const matched = nodeIds.find(id => g.id.startsWith(`flowchart-${id}-`));
      if (!matched) return;
      const action = model.actions[matched];
      if (!action) return;
      g.style.cursor = 'pointer';
      g.addEventListener('click', action);
    });
  }, [svgHtml, model]);

  useEffect(() => {
    const svgEl = svgRef.current?.querySelector('svg');
    if (!svgEl) return;
    const w = svgEl.viewBox.baseVal.width || 800;
    const h = svgEl.viewBox.baseVal.height || 600;
    svgEl.setAttribute('width', String(w * zoom));
    svgEl.setAttribute('height', String(h * zoom));
    svgEl.style.maxWidth = 'none';
  }, [svgHtml, zoom]);

  useEffect(() => {
    const svgEl = svgRef.current?.querySelector('svg');
    const container = containerRef.current;
    const wrap = svgWrapRef.current;
    if (!svgEl || !container) return;
    const naturalW = svgEl.viewBox.baseVal.width || 800;
    const padX = wrap
      ? parseFloat(window.getComputedStyle(wrap).paddingLeft) +
        parseFloat(window.getComputedStyle(wrap).paddingRight)
      : 0;
    const availW = container.clientWidth - padX;
    if (!availW || availW <= 0) return;
    const fit = availW / naturalW;
    setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(fit.toFixed(2)))));
  }, [svgHtml]);

  const zoomIn = useCallback(() => {
    setZoom(z => Math.min(MAX_ZOOM, Number((z + ZOOM_STEP).toFixed(2))));
  }, []);
  const zoomOut = useCallback(() => {
    setZoom(z => Math.max(MIN_ZOOM, Number((z - ZOOM_STEP).toFixed(2))));
  }, []);
  const resetZoom = useCallback(() => setZoom(1), []);

  const handleExportPdf = useCallback(async () => {
    const svgEl = svgRef.current?.querySelector('svg');
    if (!svgEl || exporting) return;
    setExporting(true);
    setExportError(null);
    try {
      await exportOrgChartPdf(svgEl, filename);
    } catch (e) {
      console.error('Org chart PDF export failed:', e);
      setExportError('Failed to export the PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  }, [filename, exporting]);

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={zoomOut}
        title="Zoom out"
        aria-label="Zoom out"
      >
        <Minus className="h-4 w-4" />
      </Button>
      <span className="w-14 text-center text-sm tabular-nums text-gray-600">
        {Math.round(zoom * 100)}%
      </span>
      <Button
        variant="outline"
        size="icon"
        onClick={zoomIn}
        title="Zoom in"
        aria-label="Zoom in"
      >
        <Plus className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={resetZoom}
        title="Reset zoom"
        aria-label="Reset zoom"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportPdf}
        disabled={exporting}
        title="Export chart as PDF"
      >
        {exporting ? (
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
        ) : (
          <FileDown className="h-4 w-4 mr-1" />
        )}
        {exporting ? 'Exporting...' : 'Export PDF'}
      </Button>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {toolbar}
      {exportError && (
        <div className="flex items-center gap-2 text-xs text-red-600">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{exportError}</span>
        </div>
      )}
      <div
        ref={containerRef}
        className={`overflow-auto rounded-lg border border-slate-200 bg-white ${containerClassName}`}
      >
        {error ? (
          <div className="flex h-64 items-center justify-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        ) : !svgHtml ? (
          <div className="flex h-64 items-center justify-center text-gray-500">
            Rendering org chart...
          </div>
        ) : (
          <div
            ref={svgWrapRef}
            className="flex w-max min-w-full justify-center p-5 sm:p-6"
          >
            <div
              ref={svgRef}
              dangerouslySetInnerHTML={{ __html: svgHtml }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function MermaidOrgChart({
  model,
  title = 'Asset Movement Org Chart',
}: MermaidOrgChartProps) {
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-gray-500">
          Click a node to preview the form.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFullscreen(true)}
          title="Open fullscreen"
        >
          <Maximize2 className="h-4 w-4 mr-1" />
          Fullscreen
        </Button>
      </div>

      <ChartPanel
        model={model}
        filename={`${title.replace(/\s+/g, '-')}.pdf`}
      />

      {fullscreen && (
        <Dialog open onOpenChange={open => !open && setFullscreen(false)}>
          <AppDialogFrame className="max-w-[98vw] h-[96dvh] max-h-[calc(100dvh-1rem)] min-h-0 overflow-hidden !flex !flex-col">
            <AppDialogGradientHeader
              title={title}
              description="Asset Movement Org Chart"
            />
            <div className="min-h-0 flex-1 flex flex-col overflow-hidden bg-white px-4 sm:px-6 py-4">
              <ChartPanel
                model={model}
                filename={`${title.replace(/\s+/g, '-')}-fullscreen.pdf`}
                containerClassName="flex-1 min-h-0"
              />
            </div>
            <AppDialogChromeFooter className="flex-shrink-0 flex-row justify-end gap-3">
              <Button variant="outline" onClick={() => setFullscreen(false)}>
                Close
              </Button>
            </AppDialogChromeFooter>
          </AppDialogFrame>
        </Dialog>
      )}
    </div>
  );
}

export default MermaidOrgChart;