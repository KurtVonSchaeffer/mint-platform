import { OffersClient } from './OffersClient';

export default async function QuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OffersClient requestId={id} />;
}
