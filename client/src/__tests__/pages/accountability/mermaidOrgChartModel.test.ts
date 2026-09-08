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
  onViewAccountabilityForm: vi.fn(),
  onViewAsset: vi.fn(),
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

  it('renders only ONE box per shared return/transfer/new form when multiple assets went through the same forms', () => {
    const sharedFormId = 'new-1';
    const multiAssetInput: MovementFormModeInput = {
      mode: 'form',
      form: { id: 'af-1', formNumber: 'AF-2026-0001', status: 'Disabled' },
      assets: [
        {
          asset: { id: 'asset-1', code: 'AST-001', name: 'Laptop' },
          returnForms: [
            { id: 'ret-1', formNumber: 'RF-2026-0001', userName: 'John Doe' },
          ],
          transferForms: [],
          newAccountabilityForms: [
            {
              id: sharedFormId,
              formNumber: 'AF-2026-0002',
              userName: 'Jane Smith',
              status: 'Pending',
            },
          ],
        },
        {
          asset: { id: 'asset-2', code: 'AST-002', name: 'Monitor' },
          returnForms: [
            { id: 'ret-1', formNumber: 'RF-2026-0001', userName: 'John Doe' },
          ],
          transferForms: [],
          newAccountabilityForms: [
            {
              id: sharedFormId,
              formNumber: 'AF-2026-0002',
              userName: 'Jane Smith',
              status: 'Pending',
            },
          ],
        },
      ],
    };
    const model = buildMermaidOrgModel(multiAssetInput, actions);
    const retNodes = model.nodes.filter(n => n.className === 'ret');
    const newNodes = model.nodes.filter(n => n.className === 'new');
    const assetNodes = model.nodes.filter(n => n.className === 'asset');
    const pairs = edgePairs(model);

    // Exactly one box each for the shared return form and shared new AF
    expect(retNodes).toHaveLength(1);
    expect(newNodes).toHaveLength(1);
    expect(assetNodes).toHaveLength(2);
    expect(newNodes[0].label).toContain('AF-2026-0002');

    // Both assets link into the single shared return box...
    const retId = retNodes[0].id;
    const [assetOne, assetTwo] = assetNodes.map(n => n.id);
    expect(pairs).toContain(`${assetOne}->${retId}`);
    expect(pairs).toContain(`${assetTwo}->${retId}`);
    // ...and the return box links once into the single shared new AF box
    const newId = newNodes[0].id;
    expect(pairs.filter(p => p === `${retId}->${newId}`)).toHaveLength(1);
    // no duplicate edges anywhere
    expect(new Set(pairs).size).toBe(pairs.length);
  });

  it('renders a shared transfer form once with converging edges from all assets', () => {
    const multiAssetInput: MovementFormModeInput = {
      mode: 'form',
      form: { id: 'af-1', formNumber: 'AF-2026-0001', status: 'Disabled' },
      assets: [
        {
          asset: { id: 'asset-1', code: 'AST-001', name: 'Laptop' },
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
          newAccountabilityForms: [],
        },
        {
          asset: { id: 'asset-2', code: 'AST-002', name: 'Monitor' },
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
          newAccountabilityForms: [],
        },
      ],
    };
    const model = buildMermaidOrgModel(multiAssetInput, actions);
    const trfNodes = model.nodes.filter(n => n.className === 'trf');
    const assetNodes = model.nodes.filter(n => n.className === 'asset');
    const pairs = edgePairs(model);

    expect(trfNodes).toHaveLength(1);
    const [assetOne, assetTwo] = assetNodes.map(n => n.id);
    expect(pairs).toContain(`${assetOne}->${trfNodes[0].id}`);
    expect(pairs).toContain(`${assetTwo}->${trfNodes[0].id}`);
    expect(new Set(pairs).size).toBe(pairs.length);
  });

  it('renders distinct forms separately when each asset has its own', () => {
    const distinctInput: MovementFormModeInput = {
      mode: 'form',
      form: { id: 'af-1', formNumber: 'AF-2026-0001', status: 'Disabled' },
      assets: [
        {
          asset: { id: 'asset-1', code: 'AST-001', name: 'Laptop' },
          returnForms: [
            { id: 'ret-1', formNumber: 'RF-2026-0001', userName: 'John Doe' },
          ],
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
        {
          asset: { id: 'asset-2', code: 'AST-002', name: 'Monitor' },
          returnForms: [
            { id: 'ret-2', formNumber: 'RF-2026-0002', userName: 'John Doe' },
          ],
          transferForms: [],
          newAccountabilityForms: [
            {
              id: 'new-2',
              formNumber: 'AF-2026-0003',
              userName: 'Jane Smith',
              status: 'Pending',
            },
          ],
        },
      ],
    };
    const model = buildMermaidOrgModel(distinctInput, actions);
    const retNodes = model.nodes.filter(n => n.className === 'ret');
    const newNodes = model.nodes.filter(n => n.className === 'new');

    expect(retNodes).toHaveLength(2);
    expect(newNodes).toHaveLength(2);
  });

  it('registers click actions for the root AF and every Asset box, and appends date lines', () => {
    const datedInput: MovementFormModeInput = {
      mode: 'form',
      form: { id: 'af-1', formNumber: 'AF-2026-0001', status: 'Signed' },
      assets: [
        {
          asset: { id: 'asset-1', code: 'AST-001', name: 'Laptop' },
          returnForms: [
            {
              id: 'ret-1',
              formNumber: 'RF-2026-0001',
              userName: 'John Doe',
              created_at: '2026-01-15T10:30:00Z',
            },
          ],
          transferForms: [],
          newAccountabilityForms: [],
        },
        {
          asset: { id: 'asset-2', code: 'AST-002', name: 'Monitor' },
          returnForms: [],
          transferForms: [],
          newAccountabilityForms: [],
        },
      ],
    };
    const model = buildMermaidOrgModel(datedInput, actions);
    const afNode = model.nodes.find(n => n.className === 'af')!;
    const assetNodes = model.nodes.filter(n => n.className === 'asset');
    const retNode = model.nodes.find(n => n.className === 'ret')!;

    // Root AF + both asset boxes + the return box are all clickable.
    expect(typeof model.actions[afNode.id]).toBe('function');
    for (const a of assetNodes) {
      expect(typeof model.actions[a.id]).toBe('function');
    }
    expect(typeof model.actions[retNode.id]).toBe('function');

    // Click payloads
    model.actions[afNode.id]();
    expect(actions.onViewAccountabilityForm).toHaveBeenCalledWith('af-1');
    model.actions[assetNodes[0].id]();
    expect(actions.onViewAsset).toHaveBeenCalledWith('AST-001');
    model.actions[assetNodes[1].id]();
    expect(actions.onViewAsset).toHaveBeenCalledWith('AST-002');
    model.actions[retNode.id]();
    expect(actions.onViewReturn).toHaveBeenCalledWith('ret-1');

    // Date line rendered for the dated return form
    expect(retNode.label).toContain('15/01/2026');

    // No emoji anywhere in labels (icons are injected at render time, not here)
    for (const n of model.nodes) {
      expect(n.label).not.toMatch(
        /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u
      );
    }
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

  it('registers click actions for the root asset box and every backbone AF box', () => {
    const backboneInput: MovementAssetModeInput = {
      mode: 'asset',
      asset: { id: 'asset-1', code: 'AST-001', name: 'Laptop' },
      forms: [
        {
          form: {
            id: 'af-1',
            formNumber: 'AF-2026-0001',
            status: 'Signed',
            userName: 'John Doe',
            created_at: '2026-01-01T08:00:00Z',
          },
          returnForms: [],
          transferForms: [],
          newAccountabilityForms: [],
        },
        {
          form: {
            id: 'af-2',
            formNumber: 'AF-2026-0002',
            status: 'Pending',
            userName: 'Jane Smith',
            created_at: '2026-02-01T08:00:00Z',
          },
          returnForms: [],
          transferForms: [],
          newAccountabilityForms: [],
        },
      ],
    };
    const model = buildMermaidOrgModel(backboneInput, actions);
    const rootAsset = model.nodes.find(n => n.className === 'asset')!;
    const afNodes = model.nodes.filter(n => n.className === 'af');

    expect(afNodes).toHaveLength(2);
    expect(typeof model.actions[rootAsset.id]).toBe('function');
    for (const af of afNodes) {
      expect(typeof model.actions[af.id]).toBe('function');
    }

    model.actions[rootAsset.id]();
    expect(actions.onViewAsset).toHaveBeenCalledWith('AST-001');
    model.actions[afNodes[0].id]();
    expect(actions.onViewAccountabilityForm).toHaveBeenCalledWith('af-1');
    model.actions[afNodes[1].id]();
    expect(actions.onViewAccountabilityForm).toHaveBeenCalledWith('af-2');

    // AF labels carry the creation date line
    expect(afNodes[0].label).toContain('01/01/2026');
    expect(afNodes[1].label).toContain('01/02/2026');
  });

  it('reuses the standalone AF node when the form also appears as a new accountability form (no duplicate box)', () => {
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
    const trfId = nodeIdByClass(model, 'trf');
    const pairs = edgePairs(model);

    // Both forms appear once each in the chronological backbone; the form
    // number AF-2026-0002 is NOT duplicated as a separate green "new" node.
    expect(afNodes).toHaveLength(2);
    expect(afNodes.map(n => n.label)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('AF-2026-0001'),
        expect.stringContaining('AF-2026-0002'),
      ])
    );
    expect(newNodes).toHaveLength(0);
    // The transfer form links to the reused AF node in the chain.
    const reusedAfId = afNodes.find(n => n.label.includes('AF-2026-0002'))!.id;
    expect(pairs).toContain(`${trfId}->${reusedAfId}`);
    // Clicking the reused AF node opens the new-form preview.
    expect(typeof model.actions[reusedAfId]).toBe('function');
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