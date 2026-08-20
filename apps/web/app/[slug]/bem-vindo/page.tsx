import { WelcomeView } from "../../../components/welcome-view";
import { requireGuestOrdering } from "../../../lib/load-public-menu";

export const metadata = { title: "Bem-vindo" };

export default async function BemVindoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireGuestOrdering(slug);
  return <WelcomeView />;
}
