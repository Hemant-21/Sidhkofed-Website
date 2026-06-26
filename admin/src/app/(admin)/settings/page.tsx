<<<<<<< HEAD
/**
 * `/settings` — system settings (Administration; Super Admin only).
 */
import { SettingsPage } from '@/features/settings';

export default function SettingsRoute() {
=======
import { SettingsPage } from '@/features/settings';

export const metadata = { title: 'System Settings' };

export default function Page() {
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
  return <SettingsPage />;
}
