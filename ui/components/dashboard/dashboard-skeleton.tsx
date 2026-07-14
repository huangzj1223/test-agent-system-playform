import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><div><Skeleton className="h-7 w-52" /><Skeleton className="mt-2 h-3 w-72" /></div><Skeleton className="h-9 w-28" /></div>
      <div className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 lg:grid-cols-5">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="bg-card p-4"><Skeleton className="h-3 w-20" /><Skeleton className="mt-3 h-7 w-24" /></div>)}</div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.8fr)]"><Skeleton className="h-[440px] rounded-lg" /><Skeleton className="h-[440px] rounded-lg" /></div>
      <Skeleton className="h-[360px] rounded-lg" />
    </div>
  );
}
