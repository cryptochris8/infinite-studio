import { Play } from "lucide-react";
import { useState } from "react";
import type { Trailer as TrailerData } from "@shared/types.ts";
import { imageUrl, youtubeEmbedUrl } from "../lib/img.ts";

interface Props {
  trailer: TrailerData | null;
  title: string;
  backdropPath: string | null;
}

/** Shows the backdrop with a play button; only loads YouTube when pressed (fast on a Pi and old TVs). */
export function Trailer({ trailer, title, backdropPath }: Props) {
  const [playing, setPlaying] = useState(false);
  if (!trailer) return null;

  const poster = imageUrl(backdropPath, "w780");

  return (
    <section aria-label="Trailer">
      <h2 className="mb-4 text-xl font-bold">Trailer</h2>
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-surface ring-1 ring-white/10">
        {playing ? (
          <iframe
            title={`${title} trailer`}
            src={youtubeEmbedUrl(trailer.key, true)}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <button
            type="button"
            data-nav
            onClick={() => setPlaying(true)}
            aria-label={`Play ${title} trailer`}
            className="group absolute inset-0 flex items-center justify-center"
          >
            {poster && <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />}
            <span className="relative flex size-20 items-center justify-center rounded-full bg-accent shadow-2xl transition group-hover:scale-110 group-focus-visible:scale-110">
              <Play size={36} className="ml-1 fill-white" aria-hidden />
            </span>
          </button>
        )}
      </div>
    </section>
  );
}
