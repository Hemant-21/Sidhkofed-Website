import { Trophy } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/feedback/empty-state';

export default function SuccessStoriesRoute() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Success Stories"
        description="Beneficiary and programme success stories published on the SIDHKOFED website."
      />
      <EmptyState
        icon={Trophy}
        title="Success Stories module coming soon"
        description="This module will allow creating and publishing success stories once the Phase 2 success-stories API is available."
      />
    </div>
  );
}
