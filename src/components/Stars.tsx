import { IconStar } from "@/components/Icons";
import { formatStars } from "@/lib/format";

export function Stars({ rating, count }: { rating: number; count?: number }) {
  const full = Math.round(rating);

  return (
    <span className="flex items-center gap-1 text-xs" aria-label={`Avaliação ${rating} de 5`}>
      <span className="flex gap-0.5 text-gold" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <IconStar key={i} filled={i < full} className={`h-3.5 w-3.5 ${i < full ? "opacity-100" : "opacity-35"}`} />
        ))}
      </span>
      <span className="font-semibold text-[var(--text-muted)]">
        {formatStars(rating)}
        {typeof count === "number" && <span className="font-normal"> ({count})</span>}
      </span>
    </span>
  );
}
