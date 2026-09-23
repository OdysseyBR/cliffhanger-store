import { formatStars } from "@/lib/format";

export function Stars({ rating, count }: { rating: number; count?: number }) {
  const full = Math.round(rating);

  return (
    <span className="flex items-center gap-1 text-xs" aria-label={`Avaliação ${rating} de 5`}>
      <span className="flex text-gold" aria-hidden>
        {"★★★★★".split("").map((star, i) => (
          <span key={i} className={i < full ? "opacity-100" : "opacity-25"}>
            {star}
          </span>
        ))}
      </span>
      <span className="font-semibold text-[var(--text-muted)]">
        {formatStars(rating)}
        {typeof count === "number" && <span className="font-normal"> ({count})</span>}
      </span>
    </span>
  );
}
