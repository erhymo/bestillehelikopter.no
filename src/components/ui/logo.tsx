interface HelicopterIconProps {
  className?: string;
}

/**
 * Brand mark — a helicopter silhouette drawn in the same stroke style as
 * the Lucide icon set used everywhere else (24x24, round caps/joins,
 * currentColor), so it reads as part of the same icon family rather than
 * a clashing one-off graphic.
 */
export function HelicopterIcon({ className = "h-6 w-6" }: HelicopterIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="2.5" y1="5" x2="21.5" y2="5" />
      <line x1="12" y1="5" x2="12" y2="7" />
      <path d="M6 15.2 C5.6 10.6 8.4 7.6 12 7.6 C14 7.6 15.6 8.6 16.7 10.2 L21 11.2" />
      <line x1="21" y1="9" x2="21" y2="13.2" />
      <path d="M6 15.2 L16 15.2" />
      <line x1="4" y1="18" x2="17.5" y2="18" />
      <line x1="7.2" y1="15.2" x2="7.2" y2="18" />
      <line x1="15" y1="15.2" x2="15" y2="18" />
    </svg>
  );
}

interface LogoProps {
  /** "full" adds the .no suffix; "short" omits it for tighter spaces. */
  variant?: "full" | "short";
  className?: string;
  iconClassName?: string;
}

/** Full brand lockup: icon + "BestilleHelikopter.no" wordmark. */
export function Logo({ variant = "full", className = "", iconClassName = "h-7 w-7" }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 text-brand-700 ${className}`}>
      <HelicopterIcon className={iconClassName} />
      <span className="leading-none whitespace-nowrap">
        <span className="font-bold">Bestille</span>
        <span className="font-medium">Helikopter</span>
        {variant === "full" && <span className="font-semibold text-brand-300">.no</span>}
      </span>
    </span>
  );
}
