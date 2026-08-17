import type { SocialPlatformId } from "@/lib/profile";

export function SocialIcon({ id, className }: { id: SocialPlatformId; className?: string }) {
  const props = {
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
  };

  switch (id) {
    case "x":
      return (
        <svg {...props}>
          <path d="M5 5l14 14M19 5L5 19" />
        </svg>
      );
    case "instagram":
      return (
        <svg {...props}>
          <rect x="4" y="4" width="16" height="16" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="16.5" cy="7.5" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      );
    case "youtube":
      return (
        <svg {...props}>
          <rect x="3" y="6" width="18" height="12" rx="3" />
          <path d="M10.5 9.5l5 2.5-5 2.5z" fill="currentColor" stroke="none" />
        </svg>
      );
    case "tiktok":
      return (
        <svg {...props}>
          <path d="M14 4v10.5a3.5 3.5 0 11-3.5-3.5" />
          <path d="M14 4a4.5 4.5 0 004.5 4.5" />
        </svg>
      );
    case "facebook":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path
            d="M13.8 8.3h-1.1a1.7 1.7 0 00-1.7 1.7v2h-1.8v2.2h1.8V19h2.2v-4.8h1.8l.3-2.2h-2.1v-1.7c0-.3.2-.5.5-.5h1.6z"
            fill="currentColor"
            stroke="none"
          />
        </svg>
      );
    case "reddit":
      return (
        <svg {...props}>
          <circle cx="12" cy="14" r="5.5" />
          <circle cx="9.3" cy="14" r="1" fill="currentColor" stroke="none" />
          <circle cx="14.7" cy="14" r="1" fill="currentColor" stroke="none" />
          <path d="M9 17c1.2.9 4.8.9 6 0" />
          <circle cx="17.5" cy="8" r="1.3" />
          <path d="M17.5 9.3V11M12 8.5V5.5a1.5 1.5 0 011.5-1.5" />
        </svg>
      );
    case "letterboxd":
      return (
        <svg {...props}>
          <circle cx="7.5" cy="12" r="4" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="16.5" cy="12" r="4" />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 2.3 4 5.6 4 9s-1.5 6.7-4 9c-2.5-2.3-4-5.6-4-9s1.5-6.7 4-9z" />
        </svg>
      );
  }
}
