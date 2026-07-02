import type { Metadata } from 'next';
import { Suspense } from 'react';
import { GuestRoute } from '@/components/auth';
import { EmptyLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/layout';
import { Brand } from '@/components/navigation/brand';
import { FullPageLoader } from '@/components/feedback/full-page-loader';
import { LoginForm } from '@/features/auth/components/login-form';
import { APP } from '@/constants/app';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <GuestRoute>
      <EmptyLayout>
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Brand />
          <div>
            <h1 className="text-xl font-semibold text-foreground">Sign in to {APP.shortName} CMS</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your credentials to access the administration console.
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="py-6">
            <Suspense fallback={<FullPageLoader label="Loading…" />}>
              <LoginForm />
            </Suspense>
          </CardContent>
        </Card>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Authorized users only. All actions are audited.
        </p>
      </EmptyLayout>
    </GuestRoute>
  );
}
