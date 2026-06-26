'use client';

/**
 * Permission Matrix — read-only RBAC reference table.
 *
 * Rows = permission keys grouped by module.
 * Columns = roles (Super Admin, Publisher, Content Editor).
 * Super Admin is always a wildcard (all cells granted).
 * Other roles show a checkmark only if the key is in their ROLE_PERMISSION_MAP set.
 */

import { Check } from 'lucide-react';
import { ROLE_DEFINITIONS, PERMISSION_DEFINITIONS, ROLE_PERMISSION_MAP, MODULE_LABELS, MODULE_ORDER } from '../types';
import type { PermissionDefinition } from '../types';
import { humanize } from '@/utils/format';

function hasPermission(roleKey: string, permKey: string): boolean {
  if (roleKey === 'super_admin') return true;
  const set = ROLE_PERMISSION_MAP[roleKey as keyof typeof ROLE_PERMISSION_MAP];
  return set ? set.has(permKey) : false;
}

function groupByModule(perms: PermissionDefinition[]): Array<{ module: string; perms: PermissionDefinition[] }> {
  const map = new Map<string, PermissionDefinition[]>();
  for (const p of perms) {
    if (!map.has(p.module)) map.set(p.module, []);
    map.get(p.module)!.push(p);
  }
  return MODULE_ORDER
    .filter((m) => map.has(m))
    .map((m) => ({ module: m, perms: map.get(m)! }));
}

export function PermissionMatrix() {
  const groups = groupByModule(PERMISSION_DEFINITIONS);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            <th
              scope="col"
              className="sticky left-0 z-10 bg-background py-3 pl-4 pr-6 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Permission
            </th>
            {ROLE_DEFINITIONS.map((role) => (
              <th
                key={role.key}
                scope="col"
                className="min-w-[120px] px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {role.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map(({ module, perms }) => (
            <>
              {/* Module group header */}
              <tr key={`group-${module}`} className="border-t border-border bg-muted/50">
                <td
                  colSpan={ROLE_DEFINITIONS.length + 1}
                  className="py-2 pl-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {MODULE_LABELS[module] ?? humanize(module)}
                </td>
              </tr>
              {perms.map((perm) => (
                <tr
                  key={perm.key}
                  className="border-b border-border/50 transition-colors hover:bg-muted/30"
                >
                  <td className="sticky left-0 z-10 bg-background py-2.5 pl-4 pr-6">
                    <span className="font-mono text-xs text-foreground">{perm.key}</span>
                    {perm.description ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">{perm.description}</p>
                    ) : null}
                  </td>
                  {ROLE_DEFINITIONS.map((role) => {
                    const granted = hasPermission(role.key, perm.key);
                    return (
                      <td key={role.key} className="px-4 py-2.5 text-center">
                        {granted ? (
                          <Check
                            className="mx-auto h-4 w-4 text-success"
                            aria-label={`${role.name} has ${perm.key}`}
                          />
                        ) : (
                          <span
                            className="text-muted-foreground/30"
                            aria-label={`${role.name} does not have ${perm.key}`}
                          >
                            —
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
