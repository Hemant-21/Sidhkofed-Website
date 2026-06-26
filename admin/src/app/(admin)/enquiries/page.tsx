import { Inbox } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/feedback/empty-state';

export default function EnquiriesRoute() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Enquiries"
        description="Public contact-form enquiries submitted through the SIDHKOFED website."
      />
      <EmptyState
        icon={Inbox}
        title="Enquiries module coming soon"
        description="This module will list and manage public enquiries once the Phase 2 enquiries API is available."
      />
    </div>
  );
}
