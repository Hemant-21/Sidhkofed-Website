'use client';

/**
 * Admin Dashboard (Phase 15.2). A fixed, role-aware overview composed entirely from
 * shared infrastructure + existing backend APIs. It is NOT analytics/BI/a report
 * builder — fixed KPIs, fixed cards, fixed reports. Every figure is backend-
 * resolved; the frontend computes no KPI. The whole surface refreshes via one
 * manual control (React Query) and degrades per-card on error.
 */

import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import {
  PageContainer,
  ContentWrapper,
  PageHeader,
  Section,
  SplitLayout,
  Card,
  CardContent,
} from '@/components/layout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { queryKeys } from '@/constants/query-keys';
import {
  ContentKpiGrid,
  HeadlineKpiGrid,
  QuickActions,
  RecentActivity,
  ContentStateSummary,
  ReportStatus,
  SystemStatus,
  SearchShortcut,
} from './components';

export function DashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Manual refresh re-fetches every dashboard surface (audit, reports, KPIs, counts).
  const refreshAll = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.audit.all });
  };

  return (
    <PageContainer>
      <ContentWrapper>
        <PageHeader
          title={`Welcome${user ? `, ${user.full_name.split(' ')[0]}` : ''}`}
          description="SIDHKOFED CMS — your administration overview."
          breadcrumbs={[{ label: 'Dashboard' }]}
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={refreshAll}
              leftIcon={<RefreshCw className="h-4 w-4" />}
            >
              Refresh
            </Button>
          }
        />

        <Card>
          <CardContent>
            <SearchShortcut />
          </CardContent>
        </Card>

        <Section title="Content overview" description="Records managed in the CMS, by module.">
          <ContentKpiGrid />
        </Section>

        <Section
          title="Headline figures"
          description="Published public dashboard KPIs — resolved by the backend."
        >
          <HeadlineKpiGrid />
        </Section>

        <Section title="Quick actions" description="Shortcuts you have permission to use.">
          <QuickActions />
        </Section>

        <SplitLayout
          ratio="wide-left"
          left={
            <div className="space-y-6">
              <ContentStateSummary />
              <RecentActivity />
            </div>
          }
          right={
            <div className="space-y-6">
              <SystemStatus />
              <ReportStatus />
            </div>
          }
        />
      </ContentWrapper>
    </PageContainer>
  );
}
