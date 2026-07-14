import type { ReactNode } from "react";
import type { ProductIconKey } from "@/lib/icons/icon-system";
import { IconFrame, ProductIcon } from "@/components/icons";

export function DashboardSection({
  title,
  description,
  iconName,
  action,
  children,
  className = "",
  id,
}: {
  title: string;
  description?: string;
  iconName?: ProductIconKey;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`workspace-panel overflow-hidden ${className}`}>
      <div className="flex min-h-16 items-center justify-between gap-4 border-b px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          {iconName && (
            <IconFrame variant="feature">
              <ProductIcon name={iconName} className="h-4 w-4" />
            </IconFrame>
          )}
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-foreground sm:text-base">{title}</h2>
            {description && <p className="mt-0.5 truncate text-xs text-muted-foreground">{description}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
