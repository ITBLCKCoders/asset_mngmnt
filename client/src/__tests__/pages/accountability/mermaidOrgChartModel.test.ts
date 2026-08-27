import { describe, it, expect, vi } from 'vitest';
import {
  buildMermaidOrgModel,
  buildMermaidDefinition,
  ORG_CLASS_DEFS,
  type MovementFormModeInput,
  type MovementAssetModeInput,
  type MermaidOrgModel,
} from '@/pages/assets/accountability/mermaidOrgChartModel';

const actions = {
  onViewReturn: vi.fn(),
  onViewTransfer: vi.fn(),
  onViewNew: vi.fn(),
};

function nodeIdByClass(model: MermaidOrgModel, className: string) {
  return model.nodes.find(n => n.className === className)?.id ?? '';
}

function edgePairs(model: MermaidOrgModel) {
  return model.edges.map(e => `${e.from}->${e.to}`);
}

describe('buildMermaidOrgModel (form mode)', () => {
  const input: MovementFormModeInput = {
    mode: 'form',
    form: { id: 'af-1', formNumber: 'AF-2026-0001', status: 'Signed' },
    assets: [
      {
        asset: { id: 'asset-1', code: 'AST-001', name: 'Laptop' },
        returnForms: [
          { id: 'ret-1', formNumber: 'RF-2026-0001', userName: 'John Doe' },
        ],
        transferForms: [
          {
            id: 'trf-1',
            formNumber: 'TF-2026-0001',
            userName: 'John Doe',
            returnFormId: 'ret-1',
            newUserName: 'Jane Smith',
          },
        ],
        newAccountabilityForms: [
          {
            id: 'new-1',
            formNumber: 'AF-2026-0002-LONG-SEQUENCE-NUMBER-1234',
            userName: 'Jane Smith',
            status: 'Pending',
          },
        ],
      },
    ],
  };

  it('builds the expected tree with return/transfer below the asset and new acc below both', () => {
    const model = buildMermaidOrgModel(input, actions);
    const assetId = nodeIdByClass(model, 'asset');
    const retId = nodeIdByClass(model, 'ret');
    const trfId = nodeIdByClass(model, 'trf');
    const newId = nodeIdByClass(model, 'new');
    const pairs = edgePairs(model);

    expect(model.nodes).toHaveLength(5);
    expect(pairs).toContain(`${assetId}->${retId}`);
    expect(pairs).toContain(`${assetId}->${trfId}`);
    expect(pairs).toContain(`${retId}->${newId}`);
    expect(pairs).toContain(`${trfId}->${newId}`);
  });

  it('never adds a return->transfer edge, even when the records link them', () => {
    const model = buildMermaidOrgModel(input, actions);
    const retId = nodeIdByClass(model, 'ret');
    const trfId = nodeIdByClass(model, 'trf');
    expect(edgePairs(model)).not.toContain(`${retId}->${trfId}`);
  });

  it('keeps the full form number and adds a "New owner:" label', () => {
    const model = buildMermaidOrgModel(input, actions);
    const newAccNode = model.nodes.find(n => n.className === 'new')!;
    expect(newAccNode.label).toContain('AF-2026-0002-LONG-SEQUENCE-NUMBER-1234');
    expect(newAccNode.label).toContain('<b>New owner:</b>');
    expect(newAccNode.label).toContain('Jane Smith');
  });

  it('escapes HTML in user names', () => {
    const evil: MovementFormModeInput = {
      mode: 'form',
      form: { id: 'af-1', formNumber: 'AF-1', status: 'Signed' },
      assets: [
        {
          asset: { id: 'asset-1', code: 'AST-001', name: 'Laptop' },
          returnForms: [
            {
              id: 'ret-1',
              formNumber: 'RF-1',
              userName: '<script>alert(1)</script>',
            },
          ],
          transferForms: [],
          newAccountabilityForms: [],
        },
      ],
    };
    const model = buildMermaidOrgModel(evil, actions);
    const retNode = model.nodes.find(n => n.className === 'ret')!;
    expect(retNode.label).toContain('&lt;script&gt;');
    expect(retNode.label).not.toContain('<script>');
  });

  it('connects a new accountability form straight to the asset when there are no return/transfer forms', () => {
    const noReturnOrTransfer: MovementFormModeInput = {
      mode: 'form',
      form: { id: 'af-1', formNumber: 'AF-2026-0001', status: 'Signed' },
      assets: [
        {
          asset: { id: 'asset-1', code: 'AST-001', name: 'Laptop' },
          returnForms: [],
          transferForms: [],
          newAccountabilityForms: [
            {
              id: 'new-1',
              formNumber: 'AF-2026-0002',
              userName: 'Jane Smith',
              status: 'Pending',
            },
          ],
        },
      ],
    };
    const model = buildMermaidOrgModel(noReturnOrTransfer, actions);
    const assetId = nodeIdByClass(model, 'asset');
    const newId = nodeIdByClass(model, 'new');
    expect(edgePairs(model)).toContain(`${assetId}->${newId}`);
  });

  it('registers click actions keyed by node id', () => {
    const model = buildMermaidOrgModel(input, actions);
    const retId = nodeIdByClass(model, 'ret');
    const trfId = nodeIdByClass(model, 'trf');
    const newId = nodeIdByClass(model, 'new');

    expect(typeof model.actions[retId]).toBe('function');
    expect(typeof model.actions[trfId]).toBe('function');
    expect(typeof model.actions[newId]).toBe('function');

    model.actions[retId]();
    expect(actions.onViewReturn).toHaveBeenCalledWith('ret-1');
    model.actions[trfId]();
    expect(actions.onViewTransfer).toHaveBeenCalledWith('trf-1');
    model.actions[newId]();
    expect(actions.onViewNew).toHaveBeenCalledWith('new-1');
  });
});

describe('buildMermaidOrgModel (asset mode)', () => {
  const input: MovementAssetModeInput = {
    mode: 'asset',
    asset: { id: 'asset-1', code: 'AST-001', name: 'Laptop' },
    forms: [
      {
        form: {
          id: 'af-1',
          formNumber: 'AF-2026-0001',
          status: 'Signed',
          userName: 'John Doe',
        },
        returnForms: [],
        transferForms: [
          {
            id: 'trf-1',
            formNumber: 'TF-2026-0001',
            userName: 'John Doe',
            returnFormId: null,
            newUserName: 'Jane Smith',
          },
        ],
        newAccountabilityForms: [
          {
            id: 'new-1',
            formNumber: 'AF-2026-0002',
            userName: 'Jane Smith',
            status: 'Pending',
          },
        ],
      },
    ],
  };

  it('builds asset -> form -> transfer -> new acc', () => {
    const model = buildMermaidOrgModel(input, actions);
    const assetId = nodeIdByClass(model, 'asset');
    const afId = nodeIdByClass(model, 'af');
    const trfId = nodeIdByClass(model, 'trf');
    const newId = nodeIdByClass(model, 'new');
    const pairs = edgePairs(model);

    expect(pairs).toContain(`${assetId}->${afId}`);
    expect(pairs).toContain(`${afId}->${trfId}`);
    expect(pairs).toContain(`${trfId}->${newId}`);
  });

  it('skips a standalone form node when the form is itself the new accountability form', () => {
    const dupInput: MovementAssetModeInput = {
      mode: 'asset',
      asset: { id: 'asset-1', code: 'AST-001', name: 'Laptop' },
      forms: [
        {
          form: {
            id: 'af-1',
            formNumber: 'AF-2026-0001',
            status: 'Signed',
            userName: 'John Doe',
          },
          returnForms: [],
          transferForms: [
            {
              id: 'trf-1',
              formNumber: 'TF-2026-0001',
              userName: 'John Doe',
              returnFormId: null,
              newUserName: 'Jane Smith',
            },
          ],
          newAccountabilityForms: [
            {
              id: 'af-new',
              formNumber: 'AF-2026-0002',
              userName: 'Jane Smith',
              status: 'Pending',
            },
          ],
        },
        {
          form: {
            id: 'af-new',
            formNumber: 'AF-2026-0002',
            status: 'Pending',
            userName: 'Jane Smith',
          },
          returnForms: [],
          transferForms: [],
          newAccountabilityForms: [],
        },
      ],
    };
    const model = buildMermaidOrgModel(dupInput, actions);
    const afNodes = model.nodes.filter(n => n.className === 'af');
    const newNodes = model.nodes.filter(n => n.className === 'new');

    expect(afNodes).toHaveLength(1);
    expect(afNodes[0].label).toContain('AF-2026-0001');
    expect(newNodes).toHaveLength(1);
    expect(newNodes[0].label).toContain('AF-2026-0002');
    expect(newNodes[0].label).toContain('<b>New owner:</b>');
  });

  it('attaches direct return/transfer sheets to the asset root without a synthetic form node', () => {
    const directInput: MovementAssetModeInput = {
      mode: 'asset',
      asset: { id: 'asset-1', code: 'AST-001', name: 'Laptop' },
      forms: [
        {
          form: {
            id: 'asset-root',
            formNumber: 'AST-001',
            status: 'Completed',
            userName: 'Laptop',
          },
          returnForms: [
            { id: 'ret-1', formNumber: 'RF-2026-0001', userName: 'John Doe' },
          ],
          transferForms: [
            {
              id: 'trf-1',
              formNumber: 'TF-2026-0001',
              userName: 'John Doe',
              returnFormId: null,
              newUserName: 'Jane Smith',
            },
          ],
          newAccountabilityForms: [],
        },
      ],
    };
    const model = buildMermaidOrgModel(directInput, actions);
    const assetId = nodeIdByClass(model, 'asset');
    const afNodes = model.nodes.filter(n => n.className === 'af');
    const retId = nodeIdByClass(model, 'ret');
    const trfId = nodeIdByClass(model, 'trf');
    const pairs = edgePairs(model);

    expect(afNodes).toHaveLength(0);
    expect(pairs).toContain(`${assetId}->${retId}`);
    expect(pairs).toContain(`${assetId}->${trfId}`);
  });
});

describe('buildMermaidDefinition', () => {
  it('produces a valid graph TD definition with classDefs', () => {
    const input: MovementFormModeInput = {
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
    };
    const model = buildMermaidOrgModel(input, actions);
    const def = buildMermaidDefinition(model);

    expect(def.startsWith('graph TD')).toBe(true);
    expect(def).toContain('af0["');
    expect(def).toContain('asset1["');
    expect(def).toContain('ret2["');
    expect(def).toContain('af0 --> asset1');
    expect(def).toContain('asset1 --> ret2');
    expect(def).toContain('classDef af');
    expect(def).toContain('classDef ret');
    expect(def).toContain(`classDef ret ${ORG_CLASS_DEFS.ret};`);
    expect(def).toContain('class af0 af;');
    expect(def).toContain('class ret2 ret;');
  });
});