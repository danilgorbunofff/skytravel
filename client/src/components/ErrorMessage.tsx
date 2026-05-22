import type { ReactNode } from "react";

interface Props {
  title?: string;
  message: string;
  onRetry?: () => void;
  icon?: ReactNode;
}

export function ErrorMessage({ title, message, onRetry, icon }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center" role="alert">
      {icon && <div className="text-destructive text-3xl">{icon}</div>}
      {title && <h3 className="text-lg font-semibold text-foreground">{title}</h3>}
      <p className="text-sm text-muted-foreground max-w-md">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Zkusit znovu
        </button>
      )}
    </div>
  );
}
