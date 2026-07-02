import { redirect } from 'next/navigation';
import { ROUTES } from '@/constants/routes';

/** Root entry — send users to the shell. Auth gating happens in (admin)/layout. */
export default function RootPage() {
  redirect(ROUTES.dashboard);
}
