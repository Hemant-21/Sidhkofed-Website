/**
 * `/enquiries/[id]` — enquiry detail: message, contact info, annotate, archive.
 */
import { EnquiryDetailPage } from '@/features/enquiries';

export default function EnquiryDetailRoute({ params }: { params: { id: string } }) {
  return <EnquiryDetailPage id={params.id} />;
}
