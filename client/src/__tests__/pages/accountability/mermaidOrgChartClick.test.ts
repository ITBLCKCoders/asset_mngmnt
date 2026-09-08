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
  it('binds clicks to node groups regardless of the mermaid uid prefix', async () => {
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
    const container = document.createElement('div');
    container.appendChild(document.importNode(doc.documentElement, true));
    document.body.appendChild(container);

    // --- Production binding logic ---
    decorateSvg(container, model);
    const nodeIds = Object.keys(model.actions);
    const groups = Array.from(container.querySelectorAll('g[id]'));
    let bound = 0;
    for (const g of groups) {
      const matched = matchMermaidNodeId(g.id, nodeIds);
      if (!matched) continue;
      const action = model.actions[matched];
      if (!action) continue;
      g.dataset.clickable = 'true';
      g.addEventListener('click', action);
      bound++;
    }

    // All 4 nodes (root AF, asset, return form) must bind
    expect(bound).toBe(3);

    // Clicking the asset box fires onViewAsset with the asset code
    const assetGroup = groups.find(g =>
      matchMermaidNodeId(g.id, ['asset1'])
    ) as unknown as HTMLElement;
    expect(assetGroup).toBeDefined();
    assetGroup.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(actions.onViewAsset).toHaveBeenCalledWith('AST-001');

    // Clicking the AF box fires onViewAccountabilityForm with the form id
    const afGroup = groups.find(g =>
      matchMermaidNodeId(g.id, ['af0'])
    ) as unknown as HTMLElement;
    afGroup.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(actions.onViewAccountabilityForm).toHaveBeenCalledWith('af-1');

    // Clicking the return box fires onViewReturn
    const retGroup = groups.find(g =>
      matchMermaidNodeId(g.id, ['ret2'])
    ) as unknown as HTMLElement;
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
});
