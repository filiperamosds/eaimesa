import { PinJoinView } from "../../../components/pin-join-view";
import { requireGuestOrdering } from "../../../lib/load-public-menu";

export const metadata = { title: "PIN da mesa" };

export default async function EntrarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireGuestOrdering(slug);
  return <PinJoinView />;
}
