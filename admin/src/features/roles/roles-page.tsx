'use client';

/**
 * Roles & Permissions page — read-only RBAC reference.
 * No API calls: roles and permissions are static (seeded by backend, no listing endpoint).
 * Accessible to all authenticated users — no Super Admin gate needed (it's reference info).
 */

import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader } from '@/components/layout/card';
import { Badge } from '@/components/ui/badge';
import { PermissionMatrix } from './components/permission-matrix';
import { ROLE_DEFINITIONS } from './types';

export function RolesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & Permissions"
        description="Read-only reference of the three seeded system roles and their permission grants. Roles are system-managed and cannot be created, edited, or deleted."
      />

      {/* Role cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {ROLE_DEFINITIONS.map((role) => (
          <Card key={role.key}>
            <CardHeader
              title={role.name}
              description={role.description}
            />
            <CardContent>
              {role.isWildcard ? (
                <Badge tone="success">Wildcard — all permissions</Badge>
              ) : (
                <Badge tone="default">Scoped permissions</Badge>
              )}
              <p className="mt-2 font-mono text-xs text-muted-foreground">{role.key}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Permission matrix */}
      <Card>
        <CardHeader
          title="Permission matrix"
          description="Which actions each role is granted. Super Admin is an implicit wildcard and holds every permission automatically."
        />
        <CardContent className="p-0">
          <PermissionMatrix />
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        These roles are seeded at application startup and cannot be modified. The backend enforces
        every permission check; this view is informational only.
      </p>
    </div>
  );
}
