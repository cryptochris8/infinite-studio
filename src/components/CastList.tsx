import { User } from "lucide-react";
import type { CastMember } from "@shared/types.ts";
import { imageUrl } from "../lib/img.ts";

export function CastList({ cast }: { cast: CastMember[] }) {
  if (cast.length === 0) return null;
  return (
    <section aria-label="Cast">
      <h2 className="mb-4 text-xl font-bold">Cast</h2>
      <ul className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {cast.map((person) => {
          const photo = imageUrl(person.profilePath, "w185");
          return (
            <li key={person.id} className="w-28 shrink-0 text-center sm:w-32">
              {photo ? (
                <img
                  src={photo}
                  alt=""
                  loading="lazy"
                  className="mx-auto aspect-square w-24 rounded-full object-cover ring-2 ring-white/10 sm:w-28"
                />
              ) : (
                <div className="mx-auto flex aspect-square w-24 items-center justify-center rounded-full bg-surface-2 text-muted sm:w-28">
                  <User size={36} aria-hidden />
                </div>
              )}
              <p className="mt-2 text-sm font-semibold leading-tight">{person.name}</p>
              {person.character && <p className="text-xs leading-tight text-muted">{person.character}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
