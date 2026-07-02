import { UserDetailPage } from '@/features/users';

export default function UserDetailRoute({ params }: { params: { id: string } }) {
  return <UserDetailPage id={params.id} />;
}
