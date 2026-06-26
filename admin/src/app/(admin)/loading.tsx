import { PageContainer, ContentWrapper } from '@/components/layout';
import { Skeleton, SkeletonText } from '@/components/feedback/skeleton';

/** Suspense fallback for admin pages — keeps the shell visible while loading. */
export default function AdminLoading() {
  return (
    <PageContainer>
      <ContentWrapper>
        <Skeleton className="h-8 w-64" />
        <SkeletonText lines={2} className="max-w-md" />
        <Skeleton className="h-48 w-full" />
      </ContentWrapper>
    </PageContainer>
  );
}
