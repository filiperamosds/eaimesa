import { ComandaProfileView } from "../../../components/comanda-profile-view";
import { requireGuestOrdering } from "../../../lib/load-public-menu";

export const metadata = { title: "Sua comanda" };

export default async function ComandaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireGuestOrdering(slug);
  return <ComandaProfileView />;
}
