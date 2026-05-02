import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { USER_MODULE_TREE, moduleChildLabel } from '@/constants/userModuleTree';

export type ModulePermissionKey = 'view' | 'create' | 'edit' | 'delete';

export interface ModulePermissions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export type ModulePermissionsMap = Record<string, ModulePermissions>;

const emptyPerms = (): ModulePermissions => ({
  view: false,
  create: false,
  edit: false,
  delete: false,
});

const fullPerms = (): ModulePermissions => ({
  view: true,
  create: true,
  edit: true,
  delete: true,
});

const PERM_KEYS: ModulePermissionKey[] = [
  'view',
  'create',
  'edit',
  'delete',
];

export interface ModulePermissionsMatrixProps {
  value: ModulePermissionsMap;
  onChange: (next: ModulePermissionsMap) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Same module × view/create/edit/delete matrix as Users → Permissions.
 */
export function ModulePermissionsMatrix({
  value,
  onChange,
  disabled = false,
  className,
}: ModulePermissionsMatrixProps) {
  const [openModules, setOpenModules] = useState<Set<string>>(new Set());

  const get = (module: string, perm: string) => {
    const modPerm = value[module];
    if (!modPerm) return false;
    return modPerm[perm as ModulePermissionKey];
  };

  const getModulePermissionState = (moduleName: string, perm: string) => {
    const module = USER_MODULE_TREE.find(m => m.name === moduleName);
    if (!module || module.children.length === 0) {
      const modPerm = value[moduleName];
      return modPerm?.[perm as ModulePermissionKey] ?? false;
    }
    const childrenPerms = module.children.map(
      child => value[child]?.[perm as ModulePermissionKey] ?? false
    );
    const allTrue = childrenPerms.every(v => v);
    const allFalse = childrenPerms.every(v => !v);
    if (allTrue) return 'all';
    if (allFalse) return 'none';
    return 'some';
  };

  const toggle = (module: string, perm: string, newValue?: boolean) => {
    if (disabled) return;
    const moduleData = USER_MODULE_TREE.find(m => m.name === module);
    const permissionKey = perm as ModulePermissionKey;

    if (moduleData && moduleData.children.length > 0) {
      const currentState = getModulePermissionState(module, perm);
      const valueToSet =
        newValue !== undefined
          ? newValue
          : currentState === 'all'
            ? false
            : true;
      const updated: ModulePermissionsMap = { ...value };
      if (!updated[module]) updated[module] = emptyPerms();
      updated[module] = { ...updated[module], [permissionKey]: valueToSet };
      moduleData.children.forEach(child => {
        if (!updated[child]) updated[child] = emptyPerms();
        updated[child] = { ...updated[child], [permissionKey]: valueToSet };
      });
      onChange(updated);
    } else {
      const parentModules = USER_MODULE_TREE.filter(m =>
        m.children.includes(module)
      );
      const current = get(module, perm);
      const valueToSet = newValue !== undefined ? newValue : !current;
      const updated: ModulePermissionsMap = { ...value };
      if (!updated[module]) updated[module] = emptyPerms();
      updated[module] = { ...updated[module], [permissionKey]: valueToSet };

      const readChildPerm = (mod: string) =>
        updated[mod]?.[permissionKey] ?? false;

      parentModules.forEach(parentModule => {
        const parentName = parentModule.name;
        if (!updated[parentName]) updated[parentName] = emptyPerms();
        const childrenPerms = parentModule.children.map(child =>
          readChildPerm(child)
        );
        const allTrue = childrenPerms.every(v => v);
        const allFalse = childrenPerms.every(v => !v);
        if (allTrue) {
          updated[parentName] = {
            ...updated[parentName],
            [permissionKey]: true,
          };
        } else if (allFalse) {
          updated[parentName] = {
            ...updated[parentName],
            [permissionKey]: false,
          };
        }
      });

      onChange(updated);
    }
  };

  /** Roll up parent module flags from children (same rules as toggle). */
  const syncParentsFromChildren = (
    updated: ModulePermissionsMap,
    leafModule: string
  ) => {
    const parentModules = USER_MODULE_TREE.filter(m =>
      m.children.includes(leafModule)
    );
    parentModules.forEach(parentModule => {
      const parentName = parentModule.name;
      if (!updated[parentName]) updated[parentName] = emptyPerms();
      PERM_KEYS.forEach(pk => {
        const childrenPerms = parentModule.children.map(
          ch => updated[ch]?.[pk] ?? false
        );
        const allTrue = childrenPerms.every(v => v);
        const allFalse = childrenPerms.every(v => !v);
        if (allTrue) {
          updated[parentName] = { ...updated[parentName], [pk]: true };
        } else if (allFalse) {
          updated[parentName] = { ...updated[parentName], [pk]: false };
        }
      });
    });
  };

  const isFullPerms = (m: ModulePermissions | undefined) =>
    !!m && PERM_KEYS.every(k => m[k] === true);

  const isEmptyPerms = (m: ModulePermissions | undefined) =>
    !m || PERM_KEYS.every(k => !m[k]);

  /** 'all' = every permission on; 'none' = all off; 'some' = mixed. */
  const getMasterAllState = (moduleName: string): 'all' | 'none' | 'some' => {
    const moduleData = USER_MODULE_TREE.find(m => m.name === moduleName);
    if (moduleData && moduleData.children.length > 0) {
      const parentFull = isFullPerms(value[moduleName]);
      const parentEmpty = isEmptyPerms(value[moduleName]);
      const childrenFull = moduleData.children.every(c => isFullPerms(value[c]));
      const childrenEmpty = moduleData.children.every(c => isEmptyPerms(value[c]));
      if (parentFull && childrenFull) return 'all';
      if (parentEmpty && childrenEmpty) return 'none';
      return 'some';
    }
    if (isFullPerms(value[moduleName])) return 'all';
    if (isEmptyPerms(value[moduleName])) return 'none';
    return 'some';
  };

  /** Turn every permission on or off for this module (and all children if parent). */
  const setModuleAllPerms = (module: string, full: boolean) => {
    if (disabled) return;
    const moduleData = USER_MODULE_TREE.find(m => m.name === module);
    const updated: ModulePermissionsMap = { ...value };
    const target = full ? fullPerms() : emptyPerms();

    if (moduleData && moduleData.children.length > 0) {
      if (!updated[module]) updated[module] = emptyPerms();
      updated[module] = { ...target };
      moduleData.children.forEach(child => {
        if (!updated[child]) updated[child] = emptyPerms();
        updated[child] = { ...target };
      });
    } else {
      if (!updated[module]) updated[module] = emptyPerms();
      updated[module] = { ...target };
      syncParentsFromChildren(updated, module);
    }

    onChange(updated);
  };

  const headerCell =
    'sticky top-0 z-20 bg-gray-50/95 backdrop-blur border-b-2 border-gray-200 shadow-sm';
  const switchColumnClass =
    'w-20 px-2 py-3 text-center align-middle text-xs font-bold text-gray-700 sm:w-24 sm:px-4 sm:py-4 sm:text-sm';
  const switchBodyCellClass =
    'w-20 px-2 text-center align-middle sm:w-24 sm:px-4';

  return (
    <div
      className={cn(
        'overflow-auto overflow-x-auto rounded-xl px-0 custom-scrollbar',
        className
      )}
    >
      <table className="min-w-[640px] w-full border-collapse">
        <thead>
          <tr>
            <th
              className={cn(
                headerCell,
                'min-w-[9rem] px-3 py-3 text-left text-base font-bold text-gray-800 sm:min-w-[12rem] sm:px-6 sm:py-4 sm:text-lg'
              )}
            >
              Module
            </th>
            <th
              className={cn(
                headerCell,
                switchColumnClass,
                'whitespace-nowrap'
              )}
            >
              All
            </th>
            <th
              className={cn(headerCell, switchColumnClass)}
            >
              View
            </th>
            <th
              className={cn(headerCell, switchColumnClass)}
            >
              Create
            </th>
            <th
              className={cn(headerCell, switchColumnClass)}
            >
              Edit
            </th>
            <th
              className={cn(headerCell, switchColumnClass)}
            >
              Delete
            </th>
          </tr>
        </thead>
        <tbody>
          {USER_MODULE_TREE.map((module, idx) => {
            const parentMaster = getMasterAllState(module.name);
            return (
              <React.Fragment key={module.name}>
                <motion.tr
                  className={`border-t-2 border-gray-100 hover:bg-gradient-to-r hover:from-red-50/50 hover:to-red-50/50 transition-all duration-200 ${idx % 2 === 0 ? 'bg-gray-50/30' : 'bg-white'}`}
                  whileHover={{ y: -1 }}
                  transition={{
                    type: 'spring',
                    stiffness: 420,
                    damping: 28,
                    mass: 0.55,
                  }}
                >
                  <td className="px-3 py-4 align-middle sm:px-6 sm:py-5">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="h-8 w-2 shrink-0 rounded-full bg-gradient-to-b from-red-500 to-red-600" />
                      {module.children.length > 0 ? (
                        <motion.button
                          type="button"
                          onClick={() =>
                            setOpenModules(prev => {
                              const newSet = new Set(prev);
                              if (newSet.has(module.name)) {
                                newSet.delete(module.name);
                              } else {
                                newSet.add(module.name);
                              }
                              return newSet;
                            })
                          }
                          className="inline-flex min-w-0 max-w-full items-center gap-2 rounded-md text-left font-bold text-gray-900 transition-colors hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30"
                          whileHover={{ x: 4 }}
                          transition={{
                            type: 'spring',
                            stiffness: 360,
                            damping: 24,
                            mass: 0.6,
                          }}
                        >
                            <span className="truncate text-sm sm:text-base">{module.name}</span>
                          <ChevronDown
                            className={cn(
                              'h-4 w-4 shrink-0 transition-transform',
                              openModules.has(module.name) && 'rotate-180'
                            )}
                          />
                        </motion.button>
                      ) : (
                        <span className="truncate text-sm font-bold text-gray-900 sm:text-lg">
                          {module.name}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className={cn(switchBodyCellClass, 'py-5')}>
                    <Switch
                      checked={parentMaster === 'all'}
                      indeterminate={parentMaster === 'some'}
                      onCheckedChange={on =>
                        setModuleAllPerms(module.name, on)
                      }
                      disabled={disabled}
                      aria-label={`All permissions for ${module.name}`}
                    />
                  </td>
                  {(['view', 'create', 'edit', 'delete'] as const).map(
                    perm => (
                      <td
                        key={perm}
                        className={cn(switchBodyCellClass, 'py-6')}
                      >
                        <Switch
                          checked={get(module.name, perm)}
                          indeterminate={
                            module.children.length > 0 &&
                            getModulePermissionState(module.name, perm) ===
                              'some'
                          }
                          onCheckedChange={newChecked =>
                            toggle(module.name, perm, newChecked)
                          }
                          disabled={disabled}
                        />
                      </td>
                    )
                  )}
                </motion.tr>
                {openModules.has(module.name) &&
                  module.children.map(child => {
                    const childMaster = getMasterAllState(child);
                    return (
                      <motion.tr
                        key={`${module.name}:${child}`}
                        className={`border-t border-gray-100 hover:bg-gradient-to-r hover:from-red-50/30 hover:to-red-50/30 transition-all duration-200 ${idx % 2 === 0 ? 'bg-gray-50/20' : 'bg-white/50'}`}
                        whileHover={{ y: -1 }}
                        transition={{
                          type: 'spring',
                          stiffness: 420,
                          damping: 28,
                          mass: 0.55,
                        }}
                      >
                        <td className="px-8 py-4 align-middle sm:px-12">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="h-6 w-1.5 shrink-0 rounded-full bg-gradient-to-b from-red-400 to-red-500" />
                            <span className="text-sm font-medium text-gray-700 sm:text-base">
                              {moduleChildLabel(module.name, child)}
                            </span>
                          </div>
                        </td>
                        <td className={cn(switchBodyCellClass, 'py-4')}>
                          <Switch
                            checked={childMaster === 'all'}
                            indeterminate={childMaster === 'some'}
                            onCheckedChange={on =>
                              setModuleAllPerms(child, on)
                            }
                            disabled={disabled}
                            aria-label={`All permissions for ${moduleChildLabel(module.name, child)}`}
                          />
                        </td>
                        {(['view', 'create', 'edit', 'delete'] as const).map(
                          perm => (
                            <td
                              key={perm}
                              className={cn(switchBodyCellClass, 'py-4')}
                            >
                              <Switch
                                checked={get(child, perm)}
                                onCheckedChange={newChecked =>
                                  toggle(child, perm, newChecked)
                                }
                                disabled={disabled}
                              />
                            </td>
                          )
                        )}
                      </motion.tr>
                    );
                  })}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
