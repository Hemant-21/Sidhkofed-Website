'use client';

import { useRouter } from 'next/navigation';
import { LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { ROUTES } from '@/constants/routes';
import { Avatar } from '@/components/ui/avatar';
import { Dropdown } from '@/components/ui/dropdown';

/** Top-bar account menu: identity, profile link, and logout. */
export function UserMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const toast = useToast();
  if (!user) return null;

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      toast.error('Could not sign out. Please try again.');
    }
  };

  return (
    <Dropdown
      align="end"
      trigger={
        <button
          type="button"
          aria-label="Account menu"
          className="flex items-center gap-2 rounded-full p-0.5 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Avatar name={user.full_name} size="sm" />
        </button>
      }
      items={[
        { label: <UserHeader name={user.full_name} email={user.email} />, disabled: true },
        { separator: true },
        { label: 'Profile', icon: <UserIcon className="h-4 w-4" />, onSelect: () => router.push(ROUTES.profile) },
        { separator: true },
        { label: 'Sign out', icon: <LogOut className="h-4 w-4" />, danger: true, onSelect: handleLogout },
      ]}
    />
  );
}

function UserHeader({ name, email }: { name: string; email: string }) {
  return (
    <span className="flex flex-col py-0.5">
      <span className="text-sm font-medium text-surface-foreground">{name}</span>
      <span className="text-xs text-muted-foreground">{email}</span>
    </span>
  );
}
