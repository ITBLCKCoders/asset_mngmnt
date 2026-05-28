/**
 * Route prefetch map for the sidebar.
 *
 * Each sidebar navigation `path` maps to the same `() => import(...)` factory
 * used by `React.lazy` in `client/src/App.tsx`. Calling `prefetchRoute(path)`
 * on hover/focus warm-loads the corresponding JS chunk so that the subsequent
 * navigation feels instant and avoids the `RouteContentFallback` flash from
 * the layout's top-level `<Suspense>`.
 *
 * The map is intentionally co-located with the sidebar (the only caller) to
 * avoid drifting from `App.tsx`'s lazy imports. If a new lazy page is added
 * there, mirror it here.
 */

type Importer = () => Promise<unknown>;

const ROUTE_IMPORTERS: Record<string, Importer> = {
  '/dashboard': () => import('@/pages/dashboard/dashboard'),
  '/profile': () => import('@/pages/profile/profilePage'),
  '/user': () => import('@/pages/user'),
  '/settings': () => import('@/pages/settings/settings'),
  '/my-assets': () => import('@/pages/assets/myAssets'),

  '/assets': () => import('@/pages/assets/assets-list/assets'),
  '/assets/assignment': () =>
    import('@/pages/assets/asset-issuance/assetsIssuance'),
  '/assets/request': () => import('@/pages/assets/assetRequest'),
  '/assets/request-admin': () =>
    import('@/pages/assets/admin/assetRequestAdmin'),

  '/assets/borrow': () => import('@/pages/assets/assetBorrowing'),
  '/assets/borrow-requests': () => import('@/pages/assets/borrowRequestsPage'),

  '/assets/tagging': () => import('@/pages/assets/asset-tagging/assetTagging'),
  '/assets/transfer': () => import('@/pages/assets/assetsTransfer'),
  '/assets/transfer-requests': () =>
    import('@/pages/assets/transferRequestsPage'),

  '/assets/maintenance': () => import('@/pages/assets/assetsMaintenance'),
  '/assets/repair': () => import('@/pages/assets/assetsRepair'),

  '/assets/return': () => import('@/pages/assets/assetsReturn'),
  '/assets/return-requests': () => import('@/pages/assets/returnRequestsPage'),

  '/assets/return-request': () => import('@/pages/assets/assetReturnRequest'),
  '/assets/transfer-request': () =>
    import('@/pages/assets/assetTransferRequest'),

  '/assets/disposal': () => import('@/pages/assets/assetsDisposal'),
  '/assets/gate-pass': () => import('@/pages/assets/gatePass'),

  '/forms/accountability': () =>
    import('@/pages/forms/AccountabilityFormsPage'),
  '/forms/borrow': () => import('@/pages/forms/BorrowFormsPage'),
  '/forms/checklist': () => import('@/pages/forms/AssetChecklistFormsPage'),
  '/forms/return': () => import('@/pages/forms/AssetReturnFormsPage'),
  '/forms/transfer': () => import('@/pages/forms/AssetTransferFormsPage'),

  '/approvals': () => import('@/pages/approvals/ApprovalsPage'),
  '/reports': () => import('@/pages/reports/reportsPage'),
  '/audit': () => import('@/pages/assets-history/auditTrail'),
  '/user-manual': () => import('@/pages/userManual'),
  '/flow-diagrams': () => import('@/pages/flowDiagrams'),
};

const prefetched = new Set<string>();

type IdleScheduler = (cb: () => void) => void;

const scheduleIdle: IdleScheduler =
  typeof window !== 'undefined' &&
  typeof (window as unknown as { requestIdleCallback?: unknown })
    .requestIdleCallback === 'function'
    ? cb =>
        (
          window as unknown as {
            requestIdleCallback: (cb: () => void) => void;
          }
        ).requestIdleCallback(cb)
    : cb => setTimeout(cb, 1);

/**
 * Strip query/hash and normalize a sidebar destination to a key in
 * `ROUTE_IMPORTERS`. Returns the original path if no transformation applies.
 */
function normalizePath(path: string): string {
  const qIdx = path.indexOf('?');
  const hIdx = path.indexOf('#');
  let end = path.length;
  if (qIdx >= 0) end = Math.min(end, qIdx);
  if (hIdx >= 0) end = Math.min(end, hIdx);
  return path.slice(0, end);
}

/**
 * Warm-load the JS chunk for the page at `path`. Safe to call repeatedly:
 * each chunk is fetched at most once per session. Unknown paths are ignored.
 */
export function prefetchRoute(path: string): void {
  const key = normalizePath(path);
  if (prefetched.has(key)) return;
  const importer = ROUTE_IMPORTERS[key];
  if (!importer) return;
  prefetched.add(key);
  scheduleIdle(() => {
    importer().catch(() => {
      // Allow a future hover to retry if the network blip dropped the chunk.
      prefetched.delete(key);
    });
  });
}

/**
 * Convenience: prefetch many paths at once (e.g. when hovering a submenu
 * parent so all of its children warm-load before the first click).
 */
export function prefetchRoutes(paths: readonly string[]): void {
  for (const p of paths) prefetchRoute(p);
}
