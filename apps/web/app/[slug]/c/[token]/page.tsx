import { ClaimRedeemView } from "../../../../components/claim-redeem-view";
import { requireGuestOrdering } from "../../../../lib/load-public-menu";

export const metadata = { title: "Abrindo comanda" };

export default async function ClaimRedeemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireGuestOrdering(slug);
  return <ClaimRedeemView />;
}
