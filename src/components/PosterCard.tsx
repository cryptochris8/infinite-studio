import { Star } from "lucide-react";
import { Link } from "react-router-dom";
import type { Title } from "@shared/types.ts";
import { formatRating, titlePath, typeLabel, yearLabel } from "@shared/format.ts";
import { imageUrl, posterSrcSet } from "../lib/img.ts";

interface Props {
  title: Title;
  /** Fixed width for use inside a horizontal row; omit inside grids. */
  fixedWidth?: boolean;
}

export function PosterCard({ title, fixedWidth = false }: Props) {
  const rating = formatRating(title);
  const src = imageUrl(title.posterPath, "w342");

  return (
    <Link
      to={titlePath(title)}
      data-nav
      aria-label={`${title.title}, ${typeLabel(title)}, ${yearLabel(title)}`}
      className={`group relative block shrink-0 snap-start overflow-hidden rounded-xl bg-surface ring-1 ring-white/5 transition duration-200 hover:z-10 hover:scale-105 focus-visible:z-10 focus-visible:scale-105 ${
        fixedWidth ? "w-36 sm:w-44 lg:w-52" : "w-full"
      }`}
    >
      <div className="aspect-[2/3] w-full">
        {src ? (
          <img
            src={src}
            srcSet={posterSrcSet(title.posterPath)}
            sizes="(min-width: 1024px) 208px, (min-width: 640px) 176px, 144px"
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-surface-2 to-surface p-3 text-center text-sm font-semibold text-muted">
            {title.title}
          </div>
        )}
      </div>

      {rating && (
        <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-xs font-semibold backdrop-blur">
          <Star size={12} className="fill-amber-400 text-amber-400" aria-hidden />
          {rating}
        </span>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-1 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-3 pb-3 pt-10 opacity-0 transition duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
        <p className="line-clamp-2 text-sm font-semibold leading-tight">{title.title}</p>
        <p className="mt-0.5 text-xs text-muted">
          {typeLabel(title)} · {yearLabel(title)}
        </p>
      </div>
    </Link>
  );
}
