/**
 * `/faqs/[id]/edit` — edit an FAQ (Phase 15.7).
 */
import { FaqFormPage } from '@/features/faqs';

export default function EditFaqRoute({ params }: { params: { id: string } }) {
  return <FaqFormPage id={params.id} />;
}
