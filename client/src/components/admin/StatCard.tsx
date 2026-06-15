import { cn } from "../../lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Skeleton } from "../Skeleton";

interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  up?: boolean;
  loading?: boolean;
}

export function StatCard({ label, value, change, up, loading }: StatCardProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <Skeleton className="mb-2 h-4 w-24" />
        <Skeleton className="mb-2 h-8 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {change !== undefined && (
        <p
          className={cn(
            "mt-1 flex items-center gap-1 text-xs font-medium",
            up ? "text-success" : "text-destructive",
          )}
        >
          {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {change}
        </p>
      )}
    </div>
  );
}
