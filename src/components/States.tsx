import { AlertTriangle, Loader2 } from "lucide-react";
import type { ReactNode } from "react";

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-20 text-muted">
      <Loader2 className="animate-spin" aria-hidden />
      <span>{label}…</span>
    </div>
  );
}

export function ErrorMessage({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-20 text-center">
      <AlertTriangle size={40} className="text-accent" aria-hidden />
      <p className="text-lg font-semibold">Something went wrong</p>
      <p className="text-muted">{error.message}</p>
      {onRetry && (
        <button
          type="button"
          data-nav
          onClick={onRetry}
          className="rounded-lg bg-white px-5 py-2.5 font-semibold text-black hover:bg-white/85"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <p className="text-lg font-semibold">{title}</p>
      {children && <p className="mt-2 text-muted">{children}</p>}
    </div>
  );
}
