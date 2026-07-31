import { Star } from "lucide-react";

interface StarRatingProps {
  /** Score out of `max`, rounded to the nearest whole star for display. */
  score: number;
  max?: number;
  size?: number;
  className?: string;
}

export function StarRating({ score, max = 5, size = 16, className = "" }: StarRatingProps) {
  const filled = Math.round(score);
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          size={size}
          className={i < filled ? "fill-yellow-400 text-yellow-400" : "fill-none text-gray-300"}
        />
      ))}
    </span>
  );
}
