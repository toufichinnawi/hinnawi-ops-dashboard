import { useState } from "react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  maxStars?: number;
  size?: "sm" | "md" | "lg";
}

export function StarRating({
  value,
  onChange,
  disabled = false,
  maxStars = 5,
  size = "md",
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState(0);

  const sizeClasses = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-3xl",
  };

  return (
    <div
      className="flex gap-1"
      onMouseLeave={() => setHoverValue(0)}
    >
      {Array.from(
        { length: maxStars },
        (_, i) => i + 1
      ).map((star) => {
        const isActive =
          star <= (hoverValue || value);
        return (
          <button
            key={star}
            type="button"
            disabled={disabled}
            className={cn(
              sizeClasses[size],
              "transition-colors focus:outline-none",
              isActive
                ? "text-amber-400"
                : "text-gray-300",
              disabled
                ? "cursor-not-allowed opacity-50"
                : "cursor-pointer hover:scale-110 transition-transform"
            )}
            onClick={() => onChange(star)}
            onMouseEnter={() =>
              !disabled && setHoverValue(star)
            }
          >
            ★
          </button>
        );
      })}
    </div>
  );
}
