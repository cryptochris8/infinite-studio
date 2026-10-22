import { Check, Plus, Trash2, UserRound } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useProfile } from "../state/profile.ts";

export function ProfileMenu() {
  const { profiles, current, select, addProfile, removeProfile } = useProfile();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  if (!current) return null;

  async function run(action: () => Promise<void>) {
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await run(async () => {
      await addProfile(name);
      setName("");
      setOpen(false);
    });
  }

  return (
    <div
      ref={root}
      className="relative"
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.preventDefault();
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        data-nav
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`Profile: ${current.name}`}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full bg-white/10 py-1.5 pl-1.5 pr-3 hover:bg-white/20"
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-accent text-sm font-bold">
          {current.name.slice(0, 1).toUpperCase()}
        </span>
        <span className="hidden max-w-24 truncate text-sm font-semibold sm:inline">{current.name}</span>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-line bg-surface p-2 shadow-2xl">
          <ul>
            {profiles.map((p) => (
              <li key={p.id} className="flex items-center gap-1">
                <button
                  type="button"
                  data-nav
                  onClick={() => void run(async () => { await select(p.id); setOpen(false); })}
                  className="flex flex-1 items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-white/10"
                >
                  <UserRound size={18} aria-hidden />
                  <span className="flex-1 truncate">{p.name}</span>
                  {p.id === current.id && <Check size={18} className="text-free" aria-label="Current profile" />}
                </button>
                {profiles.length > 1 && (
                  <button
                    type="button"
                    data-nav
                    aria-label={`Delete profile ${p.name}`}
                    onClick={() => {
                      if (window.confirm(`Delete "${p.name}" and its My List?`)) void run(() => removeProfile(p.id));
                    }}
                    className="rounded-lg p-2 text-muted hover:bg-white/10 hover:text-accent"
                  >
                    <Trash2 size={16} aria-hidden />
                  </button>
                )}
              </li>
            ))}
          </ul>
          <form onSubmit={onAdd} className="mt-2 flex gap-2 border-t border-line pt-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New profile"
              maxLength={30}
              aria-label="New profile name"
              className="min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 py-2 text-sm"
            />
            <button type="submit" data-nav aria-label="Add profile" className="rounded-lg bg-white/10 p-2 hover:bg-white/20">
              <Plus size={18} aria-hidden />
            </button>
          </form>
          {error && (
            <p role="alert" className="px-2 pt-2 text-sm text-accent">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
