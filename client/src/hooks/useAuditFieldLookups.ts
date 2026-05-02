import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import {
  buildMergedIdLabelMap,
  type AuditFieldLookups,
} from '@/components/common/AuditFieldChanges';

export type AuditFieldLookupsState = {
  lookups: AuditFieldLookups;
  /** True after the fetch attempt finished (success or failure). */
  ready: boolean;
  /** All entity id → label (for replacing UUIDs in details / timeline prose). */
  mergedIdLabels: Record<string, string>;
};

function userDisplayName(u: {
  first_name?: string;
  last_name?: string;
  email?: string;
}): string {
  const fn = (u.first_name ?? '').trim();
  const ln = (u.last_name ?? '').trim();
  const full = `${fn} ${ln}`.trim();
  return full || (u.email ?? '').trim() || 'User';
}

/**
 * Loads department, location, room, category, type, company, user, brand, supplier,
 * and asset builder name maps for audit FK and UUID display.
 */
export function useAuditFieldLookups(): AuditFieldLookupsState {
  const [lookups, setLookups] = useState<AuditFieldLookups>({});
  const [ready, setReady] = useState(false);

  const mergedIdLabels = useMemo(
    () => buildMergedIdLabelMap(lookups),
    [lookups]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [
          deptRes,
          locRes,
          catRes,
          typeRes,
          compRes,
          usersRes,
          brandsRes,
          suppliersRes,
          buildersRes,
        ] = await Promise.all([
          api.get('/departments'),
          api.get('/locations'),
          api.get('/categories'),
          api.get('/types'),
          api.get('/companies').catch(() => null),
          api.get('/users').catch(() => null),
          api.get('/brands').catch(() => null),
          api.get('/suppliers').catch(() => null),
          api.get('/asset-builders').catch(() => null),
        ]);
        if (cancelled) return;

        const department_id: Record<string, string> = {};
        const depts =
          (deptRes as { data?: { departments?: any[] }; departments?: any[] })
            .data?.departments ??
          (deptRes as { departments?: any[] }).departments ??
          [];
        depts.forEach((d: any) => {
          const id = d.departmentID ?? d.id;
          if (id) department_id[String(id)] = d.name ?? String(id);
        });

        const location_id: Record<string, string> = {};
        const location_room_id: Record<string, string> = {};
        const locs =
          (locRes as { data?: { locations?: any[] }; locations?: any[] }).data
            ?.locations ??
          (locRes as { locations?: any[] }).locations ??
          [];
        locs.forEach((l: any) => {
          const id = l.locationID ?? l.id;
          if (id) location_id[String(id)] = l.name ?? String(id);
          const rooms = l.room_areas;
          if (Array.isArray(rooms)) {
            rooms.forEach((r: any) => {
              const rid = r?.roomID ?? r?.room_id;
              const rname = (r?.room_name ?? '').trim();
              if (!rid) return;
              const locName = l.name ?? '';
              location_room_id[String(rid)] = locName
                ? `${rname} (${locName})`
                : rname || String(rid);
            });
          }
        });

        const category_id: Record<string, string> = {};
        (Array.isArray(catRes) ? catRes : []).forEach((c: any) => {
          const id = c.categoryID ?? c.id;
          if (id) category_id[String(id)] = c.name ?? String(id);
        });

        const type_id: Record<string, string> = {};
        (Array.isArray(typeRes) ? typeRes : []).forEach((t: any) => {
          const id = t.typeID ?? t.id;
          if (id) type_id[String(id)] = t.name ?? String(id);
        });

        const company_id: Record<string, string> = {};
        if (compRes && typeof compRes === 'object') {
          const comps =
            (compRes as { companies?: any[]; data?: { companies?: any[] } })
              .companies ??
            (compRes as { data?: { companies?: any[] } }).data?.companies ??
            [];
          comps.forEach((c: any) => {
            const id = c.companyID ?? c.id;
            if (id) company_id[String(id)] = c.name ?? String(id);
          });
        }

        const user_id: Record<string, string> = {};
        const users =
          usersRes && typeof usersRes === 'object'
            ? (usersRes as { users?: any[] }).users ?? []
            : [];
        users.forEach((u: any) => {
          const id = u.userID ?? u.id;
          if (id == null) return;
          const label = userDisplayName(u);
          const key = String(id);
          user_id[key] = label;
        });

        const assigned_to = { ...user_id };

        const brand_id: Record<string, string> = {};
        const brandRows = Array.isArray(brandsRes) ? brandsRes : [];
        brandRows.forEach((b: any) => {
          const id = b.brandID ?? b.id;
          if (id) brand_id[String(id)] = b.name ?? String(id);
        });

        const supplier_id: Record<string, string> = {};
        const supRows = Array.isArray(suppliersRes) ? suppliersRes : [];
        supRows.forEach((s: any) => {
          const id = s.supplierID ?? s.id;
          if (id) supplier_id[String(id)] = s.name ?? String(id);
        });

        const builder_id: Record<string, string> = {};
        const builders =
          buildersRes && typeof buildersRes === 'object'
            ? (buildersRes as { builders?: any[] }).builders ?? []
            : [];
        builders.forEach((b: any) => {
          const id = b.builderID ?? b.id;
          if (id)
            builder_id[String(id)] = (b.name ?? '').trim() || 'Asset builder';
        });

        setLookups({
          department_id,
          location_id,
          location_room_id,
          category_id,
          type_id,
          company_id,
          user_id,
          assigned_to,
          brand_id,
          supplier_id,
          builder_id,
        });
      } catch {
        /* non-fatal */
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { lookups, ready, mergedIdLabels };
}
