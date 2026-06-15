import type { ReactNode } from "react";
import { Search, Database, AlertTriangle } from "lucide-react";

type Variant = "default" | "search" | "no-data" | "error";

interface Props {
  variant?: Variant;
  icon?: ReactNode;
  title?: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

const variantDefaults: Record<Variant, { icon?: ReactNode; title?: string }> = {
  default: {},
  search: { icon: <Search />, title: "Nic nenalezeno" },
  "no-data": { icon: <Database />, title: "Žádná data" },
  error: { icon: <AlertTriangle />, title: "Chyba při načítání" },
};

export function EmptyState({ variant = "default", icon, title, description, action }: Props) {
  const defaults = variantDefaults[variant];
  const resolvedIcon = icon ?? defaults.icon;
  const resolvedTitle = title ?? defaults.title ?? "";

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      {resolvedIcon && <div className="text-muted-foreground text-4xl">{resolvedIcon}</div>}
      {resolvedTitle && <h3 className="text-lg font-semibold text-foreground">{resolvedTitle}</h3>}
      {description && <p className="text-sm text-muted-foreground max-w-sm">{description}</p>}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
