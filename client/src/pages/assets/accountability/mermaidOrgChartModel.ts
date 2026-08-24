'use client';

export type MermaidOrgNodeClassName =
  | 'af'
  | 'asset'
  | 'ret'
  | 'trf'
  | 'new';

export interface MermaidOrgNode {
  id: string;
  label: string;
  className?: MermaidOrgNodeClassName;
}

export interface MermaidOrgEdge {
  from: string;
  to: string;
}

export interface MermaidOrgModel {
  nodes: MermaidOrgNode[];
  edges: MermaidOrgEdge[];
  actions: Record<string, () => void>;
}

export interface MovementNodeActions {
  onViewReturn: (formId: string) => void;
  onViewTransfer: (formId: string) => void;
  onViewNew: (formId: string) => void;
}

export interface MovementFormInput {
  id: string;
  formNumber: string;
  userName?: string;
  created_at?: string | null;
}

export interface MovementTransferInput extends MovementFormInput {
  returnFormId?: string | null;
  newUserName?: string;
}

export interface MovementNewAccInput extends MovementFormInput {
  status?: string;
}

export interface MovementAssetChildren {
  returnForms: MovementFormInput[];
  transferForms: MovementTransferInput[];
  newAccountabilityForms: MovementNewAccInput[];
}

export interface MovementAssetInput extends MovementAssetChildren {
  asset: { id: string; code?: string; name?: string };
}

export interface MovementFormModeInput {
  mode: 'form';
  form: { id: string; formNumber: string; status?: string };
  assets: MovementAssetInput[];
}

export interface MovementAssetModeFormInput {
  form: {
    id: string;
    formNumber: string;
    status?: string;
    userName?: string;
    created_at?: string;
  };
  returnForms: MovementFormInput[];
  transferForms: MovementTransferInput[];
  newAccountabilityForms: MovementNewAccInput[];
}

export interface MovementAssetModeInput {
  mode: 'asset';
  asset: { id: string; code?: string; name?: string };
  forms: MovementAssetModeFormInput[];
}

export type MovementInput = MovementFormModeInput | MovementAssetModeInput;

export const ORG_CLASS_DEFS: Record<MermaidOrgNodeClassName, string> = {
  af: 'fill:#ecfdf5,stroke:#16a34a,color:#0f172a,font-size:12px',
  asset: 'fill:#f8fafc,stroke:#64748b,color:#0f172a,font-size:12px',
  ret: 'fill:#fffbeb,stroke:#d97706,color:#0f172a,font-size:12px',
  trf: 'fill:#eff6ff,stroke:#2563eb,color:#0f172a,font-size:12px',
  new: 'fill:#ecfdf5,stroke:#16a34a,color:#0f172a,font-size:12px',
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Build a multi-line HTML label for a mermaid node. `main` is the full,
 * untruncated form number / asset code. `subtitle` is inserted verbatim
 * (must be pre-escaped) so it can carry inline HTML such as `&rarr;` or
 * `<b>New owner:</b>`.
 */
function nodeLabel(
  title: string,
  main: string,
  subtitle?: string,
  badge?: string
): string {
  const parts: string[] = [
    `<b>${escapeHtml(title)}</b>`,
    escapeHtml(main),
  ];
  if (subtitle) parts.push(subtitle);
  if (badge) parts.push(`<i>${escapeHtml(badge)}</i>`);
  return parts.join('<br/>');
}

/**
 * Convert movement data into a mermaid flow model. Edges follow the actual
 * record links only:
 *  - Asset -> Return Form / Transfer Form (shared assignment)
 *  - Return / Transfer -> New Accountability Form (shared asset coverage)
 */
export function buildMermaidOrgModel(
  input: MovementInput,
  actions: MovementNodeActions
): MermaidOrgModel {
  const nodes: MermaidOrgNode[] = [];
  const edges: MermaidOrgEdge[] = [];
  const nodeActions: Record<string, () => void> = {};
  let counter = 0;
  const nextId = (prefix: string) => `${prefix}${counter++}`;

  const addNode = (node: MermaidOrgNode) => {
    nodes.push(node);
  };

  const addAssetChildren = (item: MovementAssetChildren, parentId: string) => {
    const returnIds: string[] = [];
    for (const r of item.returnForms) {
      const rid = nextId('ret');
      addNode({
        id: rid,
        label: nodeLabel(
          'Return Form',
          r.formNumber,
          escapeHtml(r.userName || '')
        ),
        className: 'ret',
      });
      edges.push({ from: parentId, to: rid });
      nodeActions[rid] = () => actions.onViewReturn(r.id);
      returnIds.push(rid);
    }

    const transferIds: string[] = [];
    for (const t of item.transferForms) {
      const tid = nextId('trf');
      const subtitle = t.newUserName
        ? `${escapeHtml(t.userName || '')} &rarr; ${escapeHtml(t.newUserName)}`
        : escapeHtml(t.userName || '');
      addNode({
        id: tid,
        label: nodeLabel('Transfer Form', t.formNumber, subtitle),
        className: 'trf',
      });
      edges.push({ from: parentId, to: tid });
      nodeActions[tid] = () => actions.onViewTransfer(t.id);
      transferIds.push(tid);
    }

    for (const n of item.newAccountabilityForms) {
      const nid = nextId('newacc');
      addNode({
        id: nid,
        label: nodeLabel(
          'New Accountability Form',
          n.formNumber,
          `<b>New owner:</b> ${escapeHtml(n.userName || '')}`,
          n.status
        ),
        className: 'new',
      });
      nodeActions[nid] = () => actions.onViewNew(n.id);
      if (returnIds.length === 0 && transferIds.length === 0) {
        edges.push({ from: parentId, to: nid });
      }
      for (const rid of returnIds) edges.push({ from: rid, to: nid });
      for (const tid of transferIds) edges.push({ from: tid, to: nid });
    }
  };

  if (input.mode === 'form') {
    const rootId = nextId('af');
    addNode({
      id: rootId,
      label: nodeLabel(
        'Accountability Form',
        input.form.formNumber,
        undefined,
        input.form.status
      ),
      className: 'af',
    });
    for (const item of input.assets) {
      const assetId = nextId('asset');
      addNode({
        id: assetId,
        label: nodeLabel(
          'Asset',
          item.asset.code || item.asset.name || 'Asset',
          escapeHtml(item.asset.name || '')
        ),
        className: 'asset',
      });
      edges.push({ from: rootId, to: assetId });
      addAssetChildren(item, assetId);
    }
  } else {
    const rootId = nextId('asset');
    addNode({
      id: rootId,
      label: nodeLabel(
        'Asset',
        input.asset.code || input.asset.name || 'Asset',
        escapeHtml(input.asset.name || '')
      ),
      className: 'asset',
    });

    // Chronological backbone: oldest → latest so forms appear "under each other"
    const sortedForms = [...input.forms].sort((a, b) => {
      const da = a.form.created_at ? new Date(a.form.created_at).getTime() : 0;
      const db = b.form.created_at ? new Date(b.form.created_at).getTime() : 0;
      if (da !== db) return da - db;
      return String(a.form.formNumber).localeCompare(String(b.form.formNumber));
    });

    // Map form.id → mermaid node id for re-use when a form appears as a "new"
    // accountability form under a previous form. This prevents the same number
    // appearing twice (once as a standalone AF and once as a green "New" node).
    const formIdToNodeId = new Map<string, string>();
    const assetRootChildren: MovementAssetChildren[] = [];

    for (const f of sortedForms) {
      if (String(f.form.id) === 'asset-root') {
        assetRootChildren.push(f);
        continue;
      }
      const nid = nextId('af');
      formIdToNodeId.set(String(f.form.id), nid);
      addNode({
        id: nid,
        label: nodeLabel(
          'Accountability Form',
          f.form.formNumber,
          escapeHtml(f.form.userName || ''),
          f.form.status
        ),
        className: 'af',
      });
    }

    // Backbone edges: Asset → first AF, then AF(n) → AF(n+1) to force vertical stacking
    const afNodeIds = sortedForms
      .filter(f => String(f.form.id) !== 'asset-root')
      .map(f => formIdToNodeId.get(String(f.form.id))!)
      .filter(Boolean);
    if (afNodeIds.length > 0) {
      edges.push({ from: rootId, to: afNodeIds[0] });
      for (let i = 1; i < afNodeIds.length; i++) {
        edges.push({ from: afNodeIds[i - 1], to: afNodeIds[i] });
      }
    }

    // Helper: same as addAssetChildren but reuses an existing AF node when the
    // "new accountability" already exists as a standalone AF (prevents duplicate numbers).
    const addAssetChildrenWithReuse = (item: MovementAssetChildren, parentId: string, _parentStatus?: string) => {
      const returnIds: string[] = [];
      for (const r of item.returnForms) {
        const rid = nextId('ret');
        addNode({
          id: rid,
          label: nodeLabel('Return Form', r.formNumber, escapeHtml(r.userName || '')),
          className: 'ret',
        });
        edges.push({ from: parentId, to: rid });
        nodeActions[rid] = () => actions.onViewReturn(r.id);
        returnIds.push(rid);
      }
      const transferIds: string[] = [];
      for (const t of item.transferForms) {
        const tid = nextId('trf');
        const subtitle = t.newUserName
          ? `${escapeHtml(t.userName || '')} &rarr; ${escapeHtml(t.newUserName)}`
          : escapeHtml(t.userName || '');
        addNode({
          id: tid,
          label: nodeLabel('Transfer Form', t.formNumber, subtitle),
          className: 'trf',
        });
        edges.push({ from: parentId, to: tid });
        nodeActions[tid] = () => actions.onViewTransfer(t.id);
        transferIds.push(tid);
      }
      for (const n of item.newAccountabilityForms) {
        const key = String(n.id);
        const existing = formIdToNodeId.get(key);
        if (existing) {
          // Link return/transfer sheets to the existing AF node instead of duplicating.
          if (returnIds.length === 0 && transferIds.length === 0) {
            edges.push({ from: parentId, to: existing });
          }
          for (const rid of returnIds) edges.push({ from: rid, to: existing });
          for (const tid of transferIds) edges.push({ from: tid, to: existing });
          // Make the reused AF node open the new-form preview as well (keeps click UX).
          if (!nodeActions[existing]) nodeActions[existing] = () => actions.onViewNew(n.id);
          continue;
        }
        const nid = nextId('newacc');
        addNode({
          id: nid,
          label: nodeLabel('New Accountability Form', n.formNumber, `<b>New owner:</b> ${escapeHtml(n.userName || '')}`, n.status),
          className: 'new',
        });
        nodeActions[nid] = () => actions.onViewNew(n.id);
        if (returnIds.length === 0 && transferIds.length === 0) edges.push({ from: parentId, to: nid });
        for (const rid of returnIds) edges.push({ from: rid, to: nid });
        for (const tid of transferIds) edges.push({ from: tid, to: nid });
      }
    };

    // Direct-return/transfer roots (no accountability behind them) attach to asset
    for (const f of assetRootChildren) {
      addAssetChildrenWithReuse(f, rootId, (f as any).form?.status);
    }

    // For each AF, attach its return/transfer sheets. "New" forms are linked to
    // the existing AF node instead of creating a duplicate green node.
    for (const f of sortedForms) {
      if (String(f.form.id) === 'asset-root') continue;
      const parentId = formIdToNodeId.get(String(f.form.id))!;
      addAssetChildrenWithReuse(f, parentId, f.form.status);
    }
  }

  return { nodes, edges, actions: nodeActions };
}

/** Generate the mermaid `graph TD` definition text from a model. */
export function buildMermaidDefinition(model: MermaidOrgModel): string {
  const lines: string[] = ['graph TD'];
  for (const n of model.nodes) {
    lines.push(`    ${n.id}["${n.label}"]`);
  }
  for (const e of model.edges) {
    lines.push(`    ${e.from} --> ${e.to}`);
  }
  lines.push('');
  for (const [name, def] of Object.entries(ORG_CLASS_DEFS)) {
    lines.push(`    classDef ${name} ${def};`);
  }
  for (const n of model.nodes) {
    if (n.className) lines.push(`    class ${n.id} ${n.className};`);
  }
  return lines.join('\n');
}