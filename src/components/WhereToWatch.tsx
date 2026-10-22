import { ExternalLink } from "lucide-react";
import type { Availability, Provider } from "@shared/types.ts";
import { groupAvailability, type WatchOption } from "@shared/availability.ts";
import { imageUrl } from "../lib/img.ts";

interface ChipProps {
  provider: WatchOption;
  fallbackUrl: string | null;
  highlight?: boolean;
}

function ProviderChip({ provider, fallbackUrl, highlight = false }: ChipProps) {
  const logo = imageUrl(provider.logoPath, "w92");
  const href = provider.url ?? fallbackUrl;
  const body = (
    <>
      {logo ? (
        <img src={logo} alt="" loading="lazy" className="size-10 rounded-lg" />
      ) : (
        <span className="flex size-10 items-center justify-center rounded-lg bg-surface-2 text-xs font-bold">
          {provider.name.slice(0, 2)}
        </span>
      )}
      <span className="text-left leading-tight">
        <span className="block font-semibold">{provider.name}</span>
        {provider.withAds && <span className="block text-xs text-muted">Free with ads</span>}
      </span>
      {href && <ExternalLink size={16} className="ml-1 text-muted" aria-hidden />}
    </>
  );
  const classes = `inline-flex items-center gap-3 rounded-xl border px-3 py-2 transition ${
    highlight ? "border-free/50 bg-free/10 hover:bg-free/20" : "border-line bg-surface hover:bg-surface-2"
  }`;
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" data-nav className={classes}>
      {body}
    </a>
  ) : (
    <span className={classes}>{body}</span>
  );
}

function Group({ label, providers, fallbackUrl, highlight }: { label: string; providers: WatchOption[]; fallbackUrl: string | null; highlight?: boolean }) {
  if (providers.length === 0) return null;
  return (
    <div>
      <h3 className={`mb-2 text-sm font-semibold uppercase tracking-wider ${highlight ? "text-free" : "text-muted"}`}>{label}</h3>
      <div className="flex flex-wrap gap-3">
        {providers.map((p) => (
          <ProviderChip key={p.id} provider={p} fallbackUrl={fallbackUrl} highlight={highlight} />
        ))}
      </div>
    </div>
  );
}

const asOptions = (list: Provider[]): WatchOption[] => list;

export function WhereToWatch({ availability }: { availability: Availability }) {
  const groups = groupAvailability(availability);
  const hasAny = groups.free.length + groups.subscription.length + groups.paid.length > 0;

  return (
    <section aria-label="Where to watch" className="space-y-5">
      <h2 className="text-xl font-bold">Where to watch</h2>
      {hasAny ? (
        <>
          {groups.free.length === 0 && (
            <p className="text-muted">Not free anywhere right now. Here's where else you can find it.</p>
          )}
          <Group label="Watch free" providers={groups.free} fallbackUrl={groups.link} highlight />
          <Group label="With a subscription" providers={asOptions(groups.subscription)} fallbackUrl={groups.link} />
          <Group label="Rent or buy" providers={asOptions(groups.paid)} fallbackUrl={groups.link} />
          {groups.link && (
            <a
              href={groups.link}
              target="_blank"
              rel="noopener noreferrer"
              data-nav
              className="inline-flex items-center gap-1 text-sm text-muted underline-offset-4 hover:text-text hover:underline"
            >
              See every option <ExternalLink size={14} aria-hidden />
            </a>
          )}
          <p className="text-xs text-muted">Availability data from JustWatch via TMDB.</p>
        </>
      ) : (
        <p className="text-muted">No streaming options listed yet. It may still be in theaters, or not released.</p>
      )}
    </section>
  );
}
