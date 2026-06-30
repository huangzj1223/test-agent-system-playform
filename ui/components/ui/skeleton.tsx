// eslint-disable  MC8yOmFIVnBZMlhwdTRUbGphRG1zWjg2VERoelNBPT06N2FhYjUyOTI=

import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

export { Skeleton };
