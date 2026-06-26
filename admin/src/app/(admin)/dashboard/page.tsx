'use client';

/**
 * Shell landing page — NOT the Dashboard module (that is a later phase). This is a
 * minimal home that confirms the foundation is wired: it greets the authenticated
 * user and lists the building blocks now available to module teams. Content is
 * intentionally a "foundation status" placeholder, not production claims.
 */

import { LayoutGrid, ShieldCheck, Boxes, Layers } from 'lucide-react';
import { PageContainer, ContentWrapper, PageHeader, Card, CardContent, GridLayout } from '@/components/layout';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';

export default function DashboardPage() {
  const { user } = useAuth();
  const { permissions, roles } = usePermissions();

  return (
    <PageContainer>
      <ContentWrapper>
        <PageHeader
          title={`Welcome${user ? `, ${user.full_name.split(' ')[0]}` : ''}`}
          description="SIDHKOFED CMS administration console — frontend foundation."
          breadcrumbs={[{ label: 'Dashboard' }]}
        />

        <Alert tone="info" title="Frontend foundation (Phase 15.0)">
          Reusable shell, providers, API layer, authentication, authorization, and the design system are
          in place. Module pages (Events, Documents, Dashboard, …) are built in later phases by composing
          this infrastructure — no layouts, forms, tables, or auth are rewritten.
        </Alert>

        <GridLayout columns={3}>
          <StatCard
            icon={<ShieldCheck className="h-5 w-5" />}
            label="Your roles"
            value={roles.length === 0 ? '—' : roles.map((r) => r.replace(/_/g, ' ')).join(', ')}
          />
          <StatCard
            icon={<Layers className="h-5 w-5" />}
            label="Granted permissions"
            value={permissions.includes('*') ? 'All (Super Admin)' : String(permissions.length)}
          />
          <StatCard icon={<Boxes className="h-5 w-5" />} label="Modules reserved" value="22" />
        </GridLayout>

        <Card>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LayoutGrid className="h-4 w-4" aria-hidden="true" />
              <span>
                Navigation reflects your access. Items appear here only when your backend-granted
                permissions allow them.
              </span>
              <Badge tone="success" dot>
                Permission-aware
              </Badge>
            </div>
          </CardContent>
        </Card>
      </ContentWrapper>
    </PageContainer>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="truncate text-base font-semibold capitalize text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
