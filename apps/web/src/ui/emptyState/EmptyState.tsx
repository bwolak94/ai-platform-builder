import type { EmptyStateProps } from "./EmptyState.types";

export function EmptyState({ title, description, icon }: EmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      {icon && <div className="text-muted-foreground">{icon}</div>}
      <p className="font-medium">{title}</p>
      {description && <p className="text-muted-foreground text-sm">{description}</p>}
    </div>
  );
}
