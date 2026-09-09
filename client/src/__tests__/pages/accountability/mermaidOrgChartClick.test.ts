import { describe, it, expect, vi } from 'vitest';

// The chart's decorate helpers only need DOM APIs; import them directly.
import {
  decorateSvg,
  matchMermaidNodeId,
} from '@/pages/assets/accountability/components/MermaidOrgChart';
import {
  buildMermaidOrgModel,
  buildMermaidDefinition,
} from '@/pages/assets/accountability/mermaidOrgChartModel';
import type { MermaidOrgModel } from '@/pages/assets/accountability/mermaidOrgChartModel';

/**
 * Integration test proving that clicks on mermaid-rendered boxes fire the
 * mapped actions. Mermaid 11 changed node DOM ids from
 * `flowchart-{id}-{n}` to `{renderUid}-flowchart-{id}-{n}`, which broke the
 * old prefix-based binding — this test guards the suffix matcher fix.
 */
describe('mermaid org chart click binding', () => {
  it(
    'binds clicks to node groups regardless of the mermaid uid prefix',
    { timeout: 30000 },
    async () => {
    const actions = {
      onViewReturn: vi.fn(),
      onViewTransfer: vi.fn(),
      onViewNew: vi.fn(),
      onViewAccountabilityForm: vi.fn(),
      onViewAsset: vi.fn(),
    };
    const model: MermaidOrgModel = buildMermaidOrgModel(
      {
        mode: 'form',
        form: { id: 'af-1', formNumber: 'AF-2026-0001', status: 'Signed' },
        assets: [
          {
            asset: { id: 'asset-1', code: 'AST-001', name: 'Laptop' },
            returnForms: [
              { id: 'ret-1', formNumber: 'RF-2026-0001', userName: 'John Doe' },
            ],
            transferForms: [],
            newAccountabilityForms: [],
          },
        ],
      },
      actions
    );

    // Render with mermaid exactly as production does (uid-prefixed ids).
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
    const { svg } = await mermaid.render('prod-uid-xyz', def);

    // Parse with DOMParser (full-fidelity SVG), like a real browser DOM.
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    const svgElement = document.importNode(doc.documentElement, true);

    // Reproduce the production DOM structure: a stable wrapper (delegation
    // target) containing the mermaid scope div (dangerouslySetInnerHTML).
    const wrap = document.createElement('div');
    const scope = document.createElement('div');
    scope.className = 'orgchart-svg-scope';
    scope.appendChild(svgElement);
    wrap.appendChild(scope);
    document.body.appendChild(wrap);

    // --- Production logic (MermaidOrgChart ChartPanel) ---
    decorateSvg(scope, model);
    // Delegated click listener on the stable wrapper (survives innerHTML
    // re-commits, unlike listeners bound directly to <g> nodes).
    const modelRef = { current: model };
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
    wrap.addEventListener('click', handleDelegatedClick);
    const groups = Array.from(scope.querySelectorAll('g[id]'));
    const bound = groups.filter(g => g.dataset.clickable === 'true').length;

    // All 3 nodes (root AF, asset, return form) must be decorated
    expect(bound).toBe(3);

    // REGRESSION GUARD: React re-commits dangerouslySetInnerHTML on unrelated
    // re-renders (e.g. the auto-fit zoom state update right after mount).
    // That replaces the scope's children and wipes per-<g> listeners — but the
    // delegated wrapper listener must keep working on the fresh DOM.
    const freshScope = document.createElement('div');
    freshScope.className = 'orgchart-svg-scope';
    const freshSvg = document.importNode(
      new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement,
      true
    );
    freshScope.appendChild(freshSvg);
    wrap.replaceChild(freshScope, scope);
    decorateSvg(freshScope, model); // production re-decorates after each commit

    // Clicking the asset box (inside the REPLACED scope) still fires the action
    const assetGroup = freshScope.querySelectorAll('g[id]')[1];
    expect(assetGroup.id).toContain('flowchart-asset1');
    assetGroup.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(actions.onViewAsset).toHaveBeenCalledWith('AST-001');

    // Clicking the AF box fires onViewAccountabilityForm with the form id
    const afGroup = freshScope.querySelectorAll('g[id]')[0];
    expect(afGroup.id).toContain('flowchart-af0');
    afGroup.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(actions.onViewAccountabilityForm).toHaveBeenCalledWith('af-1');

    // Clicking the return box fires onViewReturn
    const retGroup = freshScope.querySelectorAll('g[id]')[2];
    expect(retGroup.id).toContain('flowchart-ret2');
    retGroup.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(actions.onViewReturn).toHaveBeenCalledWith('ret-1');

    // Decoration: clickable marker + tooltip + rounded corners + icon svg
    expect(afGroup.dataset.clickable).toBe('true');
    expect(afGroup.getAttribute('style')).toContain('cursor');
    const titleEl = afGroup.querySelector('title');
    expect(titleEl?.textContent).toContain('Accountability Form');
    const rect = afGroup.querySelector('rect');
    expect(rect?.getAttribute('rx')).toBe('8');
    const iconSvg = afGroup.querySelector('span.nodeLabel svg') as SVGElement | null;
    expect(iconSvg).not.toBeNull();
    expect(iconSvg!.getAttribute('stroke')).toBe('#16a34a');
  });

  it('the matcher rejects edge and foreign ids', () => {
    expect(matchMermaidNodeId('anyuid-flowchart-af0-0', ['af0'])).toBe('af0');
    expect(matchMermaidNodeId('flowchart-af0-0', ['af0'])).toBe('af0');
    expect(matchMermaidNodeId('anyuid-flowchart-af0-12', ['af0'])).toBe('af0');
    expect(matchMermaidNodeId('anyuid-flowchart-af0-x', ['af0'])).toBeUndefined();
    expect(matchMermaidNodeId('anyuid-flowchart-af01-2', ['af0'])).toBeUndefined();
    expect(matchMermaidNodeId('L_af0_asset1_0', ['af0'])).toBeUndefined();
  });

  it('the matcher escapes regex metacharacters in node ids', () => {
    // A node id containing regex metacharacters must match literally.
    expect(matchMermaidNodeId('anyuid-flowchart-a.b+1-2', ['a.b+1'])).toBe('a.b+1');
    // And must NOT be treatable as a regex wildcard ('af0' with '.' should not
    // match the plain 'af0' id).
    expect(matchMermaidNodeId('anyuid-flowchart-af0-0', ['af.0'])).toBeUndefined();
  });
});

describe('renderMermaidSerialized', () => {
  it('serializes concurrent render tasks and keeps the queue usable after a failure', async () => {
    const { renderMermaidSerialized } = await import(
      '@/pages/assets/accountability/components/MermaidOrgChart'
    );
    const order: string[] = [];
    const makeTask = (name: string, ms: number, fail = false) => async () => {
      await new Promise(r => setTimeout(r, ms));
      order.push(name);
      if (fail) throw new Error(`boom-${name}`);
      return name;
    };

    // Queue: pending -> fast -> failing -> slow (runs after the failure)
    const pending = renderMermaidSerialized(makeTask('pending', 1));
    const fast = renderMermaidSerialized(makeTask('fast', 10));
    const failing = renderMermaidSerialized(makeTask('failing', 1, true));
    const slow = renderMermaidSerialized(makeTask('slow', 30));

    await expect(pending).resolves.toBe('pending');
    await expect(fast).resolves.toBe('fast');
    await expect(failing).rejects.toThrow('boom-failing');
    await expect(slow).resolves.toBe('slow');

    // Strict FIFO order regardless of task durations/failures
    expect(order).toEqual(['pending', 'fast', 'failing', 'slow']);

    // Queue still works for subsequent renders
    await expect(renderMermaidSerialized(makeTask('after', 1))).resolves.toBe(
      'after'
    );
    expect(order).toEqual(['pending', 'fast', 'failing', 'slow', 'after']);
  });
});
