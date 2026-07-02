'use client';

/**
 * Profile page. Reads the current user from the auth context (already populated on boot
 * via GET /auth/me — no extra network call). Renders `<ProfileForm>` and `<PasswordForm>`
 * side by side. Full-page loader covers the brief session-restore window.
 */

import { PageHeader } from '@/components/layout/page-header';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/layout/card';
import { FullPageLoader } from '@/components/feedback/full-page-loader';
import { useAuth } from '@/hooks/use-auth';
import { humanize } from '@/utils/format';
import { ProfileForm } from './components/profile-form';
import { PasswordForm } from './components/password-form';

export function ProfilePage() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <FullPageLoader />;
  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        description="Manage your account details and security settings."
      />

      {/* Identity card */}
      <Card>
        <CardContent className="flex items-center gap-4 py-5">
          <Avatar name={user.full_name} size="lg" />
          <div className="min-w-0 space-y-1">
            <p className="text-base font-semibold text-foreground truncate">{user.full_name}</p>
            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {user.roles.map((role) => (
                <Badge key={role} tone="default" className="text-xs">
                  {humanize(role)}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <ProfileForm user={user} />
        <PasswordForm />
      </div>
    </div>
  );
}
