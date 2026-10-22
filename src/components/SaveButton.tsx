import { Check, Plus } from "lucide-react";
import type { Title } from "@shared/types.ts";
import { useProfile } from "../state/profile.ts";

interface Props {
  title: Title;
  className?: string;
}

/** Adds or removes a title from the current profile's My List. */
export function SaveButton({ title, className = "" }: Props) {
  const saved = useProfile((s) => s.watchlist.some((w) => w.id === title.id && w.mediaType === title.mediaType));
  const toggleSaved = useProfile((s) => s.toggleSaved);
  const disabled = useProfile((s) => s.current === null);

  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={saved}
      onClick={() => void toggleSaved(title).catch(() => {})}
      className={`inline-flex items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-5 py-3 font-semibold backdrop-blur transition hover:bg-white/20 disabled:opacity-50 ${className}`}
    >
      {saved ? <Check size={20} aria-hidden /> : <Plus size={20} aria-hidden />}
      {saved ? "In My List" : "My List"}
    </button>
  );
}
