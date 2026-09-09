'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  FileDown,
  Loader2,
  Maximize2,
  Minus,
  MousePointerClick,
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
  type MermaidOrgNodeClassName,
} from '../mermaidOrgChartModel';

interface MermaidOrgChartProps {
  model: MermaidOrgModel;
  title?: string;
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 10;
const ZOOM_STEP = 0.25;

/**
 * Mermaid's renderer is not concurrency-safe (shared temp DOM node +
 * module-level render state). Multiple ChartPanels can be mounted at once
 * (inline chart + fullscreen dialog), so renders are serialized through a
 * promise chain. Exported for tests.
 */
let renderQueue: Promise<unknown> = Promise.resolve();

export function renderMermaidSerialized<T>(task: () => Promise<T>): Promise<T> {
  const run = renderQueue.then(task, task);
  // Keep the chain alive even if a render fails; the rejection is already
  // delivered to `run`'s caller.
  renderQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

/**
 * Lucide icon path data keyed by node class. Injected as inline SVG into each
 * box title so icons survive the SVG -> canvas -> PDF export pipeline (which
 * plain HTML <svg> from mermaid htmlLabels would not reliably).
 */
const NODE_ICON_PATHS: Record<
  MermaidOrgNodeClassName,
  { d: string[]; color: string; title: string }
> = {
  af: {
    color: '#16a34a',
    title: 'Accountability Form',
    d: [
      'M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z',
      'M14 2v5a1 1 0 0 0 1 1h5',
      'M10 9H8',
      'M16 13H8',
      'M16 17H8',
    ],
  },
  asset: {
    color: '#64748b',
    title: 'Asset',
    d: [
      'M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z',
      'M12 22V12',
      'M3.29 7 12 12 20.71 7',
      'm7.5 4.27 9 5.15',
    ],
  },
  ret: {
    color: '#d97706',
    title: 'Return Form',
    d: [
      'M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8',
      'M3 3v5h5',
    ],
  },
  trf: {
    color: '#2563eb',
    title: 'Transfer Form',
    d: [
      'm16 3 4 4-4 4',
      'M20 7H4',
      'm8 21-4-4 4-4',
      'M4 17h16',
    ],
  },
  new: {
    color: '#16a34a',
    title: 'New Accountability Form',
    d: [
      'M11.35 22H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.706.706l3.588 3.588A2.4 2.4 0 0 1 20 8v5.35',
      'M14 2v5a1 1 0 0 0 1 1h5',
      'M14 19h6',
      'M17 16v6',
    ],
  },
};

/** Build a small inline SVG string for a node class icon. */
function nodeIconSvg(className: MermaidOrgNodeClassName): string {
  const icon = NODE_ICON_PATHS[className];
  const paths = icon.d
    .map(d => `<path d="${d}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`)
    .join('');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" ` +
    `stroke="${icon.color}" style="vertical-align:-2px;margin-right:4px" aria-hidden="true">${paths}</svg>`
  );
}

/** Legend items shown above the chart. */
const LEGEND_ITEMS: Array<{
  className: MermaidOrgNodeClassName;
  label: string;
}> = [
  { className: 'af', label: 'Accountability Form' },
  { className: 'asset', label: 'Asset' },
  { className: 'ret', label: 'Return Form' },
  { className: 'trf', label: 'Transfer Form' },
  { className: 'new', label: 'New Accountability Form' },
];

/** Scoped CSS injected into the SVG wrapper: hover lift, tooltips, pointer. */
const CHART_INTERACTIVE_CSS = `
  .orgchart-svg-scope g[data-clickable="true"] { cursor: pointer; }
  .orgchart-svg-scope g[data-clickable="true"] rect,
  .orgchart-svg-scope g[data-clickable="true"] polygon {
    transition: filter 120ms ease, stroke-width 120ms ease;
  }
  .orgchart-svg-scope g[data-clickable="true"]:hover rect,
  .orgchart-svg-scope g[data-clickable="true"]:hover polygon {
    filter: drop-shadow(0 3px 6px rgba(15, 23, 42, 0.25)) brightness(0.97);
    stroke-width: 2.5px;
  }
  .orgchart-svg-scope g[data-clickable="true"]:active rect,
  .orgchart-svg-scope g[data-clickable="true"]:active polygon {
    filter: brightness(0.93);
  }
`;

/**
 * Mermaid 11 prefixes every DOM id with the render uid: the node group ends up
 * with id `{uid}-flowchart-{nodeId}-{counter}` (older versions had no uid
 * prefix). Match by SUFFIX so clicks bind regardless of the uid.
 * Exported for tests.
 */
export function matchMermaidNodeId(
  gId: string,
  nodeIds: string[]
): string | undefined {
  return nodeIds.find(id =>
    new RegExp(`(?:^|-)flowchart-${escapeRegExp(id)}-\\d+$`).test(gId)
  );
}

/** Escape regex metacharacters so node ids can never break the matcher. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Post-process the rendered mermaid SVG: inject Lucide icons before each box
 * title, mark clickable groups (cursor + hover CSS + native <title> tooltip),
 * and round the box corners. Exported for tests.
 */
export function decorateSvg(
  container: HTMLElement,
  model: MermaidOrgModel
): void {
  const nodeIds = Object.keys(model.actions);
  const idToClass = new Map<string, MermaidOrgNodeClassName>();
  for (const node of model.nodes) {
    if (node.className) idToClass.set(node.id, node.className);
  }

  container
    .querySelectorAll<SVGGElement>('g[id]')
    .forEach(g => {
      const matched = matchMermaidNodeId(g.id, nodeIds);
      if (!matched) return;
      const cls = idToClass.get(matched);
      if (!cls) return;

      // 1) Clickability affordances: hover CSS hook + native tooltip
      g.dataset.clickable = 'true';
      g.style.cursor = 'pointer';
      const title = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'title'
      );
      title.textContent = `Click to view ${NODE_ICON_PATHS[cls].title} details`;
      g.insertBefore(title, g.firstChild);

      // 2) Rounded corners on the box shape
      g.querySelectorAll('rect').forEach(shape => {
        shape.setAttribute('rx', '8');
      });

      // 3) Lucide icon before the bold title text line
      const labelRoot = g.querySelector('.nodeLabel, span.nodeLabel') ?? g;
      const titleEl = labelRoot.querySelector('b');
      if (titleEl && !titleEl.previousElementSibling?.matches('svg')) {
        titleEl.insertAdjacentHTML('beforebegin', nodeIconSvg(cls));
      }
    });
}

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

  // Latest model for the delegated click handler. React re-commits
  // dangerouslySetInnerHTML whenever the panel re-renders with a fresh
  // { __html } object (e.g. the auto-fit zoom right after mount), which wipes
  // listeners attached directly to <g> nodes. Delegation on the stable
  // wrapper survives those re-commits.
  const modelRef = useRef(model);
  modelRef.current = model;

  // Memoize so unrelated re-renders (zoom/export state) never re-commit the
  // same innerHTML and destroy applied decorations.
  const svgInnerHtml = useMemo(
    () => ({ __html: svgHtml }),
    [svgHtml]
  );

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
        // Serialized: mermaid render uses shared module state and a temp DOM
        // node, so two panels rendering concurrently corrupt each other's
        // output (blank/undecorated SVG, dead click handlers).
        const { svg } = await renderMermaidSerialized(() =>
          mermaid.render(uid, def)
        );
        if (cancelled) return;
        setSvgHtml(svg);
        setError(null);
      } catch (e) {
        if (!cancelled) {
          console.error(
            'Mermaid org chart render failed. Definition:',
            '\n' + buildMermaidDefinition(model),
            e
          );
          setError('Failed to render the org chart');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [model]);

  // Decorate (icons, tooltips, rounded corners, cursor) after each new SVG.
  // Click handling itself is delegated below and survives re-commits.
  useEffect(() => {
    const container = svgRef.current;
    if (!container || !svgHtml) return;
    decorateSvg(container, model);
  }, [svgHtml, model]);

  // Delegated click handling: one listener on the scroll container, which is
  // mounted for the panel's whole lifetime (the svg wrap div only exists
  // after the chart loads, so it cannot be the stable target). React
  // re-commits dangerouslySetInnerHTML on re-renders, which would wipe any
  // listener bound directly to a <g>; this listener outlives those commits.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const handleDelegatedClick = (event: Event) => {
      const target = event.target as Element | null;
      const g = target?.closest?.('g[id]') as SVGGElement | null;
      if (!g) return;
      const nodeIds = Object.keys(modelRef.current.actions);
      const matched = matchMermaidNodeId(g.id, nodeIds);
      if (!matched) return;
      const action = modelRef.current.actions[matched];
      if (action) action();
    };
    container.addEventListener('click', handleDelegatedClick);
    return () => {
      container.removeEventListener('click', handleDelegatedClick);
    };
  }, []);

  // Hover/active styling, injected once per document (scoped by class).
  useEffect(() => {
    const styleId = 'orgchart-interactive-style';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = CHART_INTERACTIVE_CSS;
    document.head.appendChild(style);
  }, []);

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
              className="orgchart-svg-scope"
              dangerouslySetInnerHTML={svgInnerHtml}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/** Color/icon legend row shown above the chart. */
function ChartLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600">
      {LEGEND_ITEMS.map(item => (
        <span key={item.className} className="inline-flex items-center gap-1.5">
          <span
            className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-slate-300 bg-white"
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: nodeIconSvg(item.className) }}
          />
          {item.label}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5 text-slate-500">
        <MousePointerClick className="h-4 w-4 text-slate-400" />
        Click any box to open its details
      </span>
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
        <ChartLegend />
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
              <ChartLegend />
              <ChartPanel
                model={model}
                filename={`${title.replace(/\s+/g, '-')}-fullscreen.pdf`}
                containerClassName="flex-1 min-h-0 mt-2"
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