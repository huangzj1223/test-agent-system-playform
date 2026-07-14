import { cn } from "@/lib/utils";

export function SystemMark({ className, variant = "dark", title }: { className?: string; variant?: "light" | "dark" | "mono"; title?: string }) {
  const stroke = variant === "dark" ? "#F4F5FF" : variant === "light" ? "#252A47" : "currentColor";
  const center = variant === "mono" ? "currentColor" : "#6570F4";
  return (
    <svg viewBox="0 0 48 48" className={cn("shrink-0", className)} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <path d="M24 4.5 40.5 14v20L24 43.5 7.5 34V14Z" fill="none" stroke={stroke} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M24 12.5v7M35.5 31 29 27.2M12.5 31l6.5-3.8" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="24" cy="24" r="5.3" fill={center} />
      <circle cx="24" cy="10" r="2.7" fill={variant === "mono" ? "currentColor" : "#2BC8C4"} />
      <circle cx="36.5" cy="31.5" r="2.7" fill={variant === "mono" ? "currentColor" : "#A7D436"} />
      <circle cx="11.5" cy="31.5" r="2.7" fill={variant === "mono" ? "currentColor" : "#F2B84B"} />
      <circle cx="24" cy="24" r="1.6" fill="#FFFFFF" />
    </svg>
  );
}
