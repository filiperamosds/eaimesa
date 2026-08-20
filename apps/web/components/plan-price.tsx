import { formatBrlFromCents, hasPromoPrice, effectivePriceCents } from "@eaimesa/shared";

type PlanPriceFields = {
  priceCents: number;
  promoPriceCents?: number | null;
};

export function planCtaPrice(plan: PlanPriceFields): string {
  const effective = effectivePriceCents(plan);
  if (hasPromoPrice(plan)) {
    return `de ${formatBrlFromCents(plan.priceCents)} por ${formatBrlFromCents(effective)}/mês`;
  }
  return `${formatBrlFromCents(effective)}/mês`;
}

export function PlanPrice({
  priceCents,
  promoPriceCents,
  suffix = "/mês",
  className = "",
  size = "md",
}: PlanPriceFields & { suffix?: string; className?: string; size?: "sm" | "md" | "lg" }) {
  const effective = effectivePriceCents({ priceCents, promoPriceCents });
  const suffixClass =
    size === "lg" ? "text-xl font-sans font-normal text-ink-soft" : "font-sans font-normal text-ink-soft";
  if (!hasPromoPrice({ priceCents, promoPriceCents })) {
    return (
      <span className={className}>
        {formatBrlFromCents(priceCents)}
        {suffix ? <span className={suffixClass}>{suffix}</span> : null}
      </span>
    );
  }
  return (
    <span className={className}>
      <span className="text-[0.65em] font-sans font-normal text-ink-soft">de </span>
      <s className="text-[0.7em] font-sans font-normal text-ink-soft">{formatBrlFromCents(priceCents)}</s>
      <span className="text-[0.65em] font-sans font-normal text-ink-soft"> por </span>
      {formatBrlFromCents(effective)}
      {suffix ? <span className={suffixClass}>{suffix}</span> : null}
    </span>
  );
}
