import { Info, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Title } from "@shared/types.ts";
import { formatRating, titlePath, truncate, typeLabel, yearLabel } from "@shared/format.ts";
import { imageUrl } from "../lib/img.ts";
import { SaveButton } from "./SaveButton.tsx";

interface Props {
  titles: Title[];
  /** Milliseconds between slides; 0 turns auto-advance off. */
  intervalMs?: number;
}

export function Hero({ titles, intervalMs = 8000 }: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || intervalMs <= 0 || titles.length < 2) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % titles.length), intervalMs);
    return () => clearInterval(timer);
  }, [paused, intervalMs, titles.length]);

  const current = titles[index % Math.max(titles.length, 1)];
  if (!current) return null;
  const rating = formatRating(current);

  return (
    <section
      aria-label="Featured"
      className="relative isolate min-h-[62vh] overflow-hidden sm:min-h-[72vh]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {titles.map((t, i) => (
        <img
          key={`${t.mediaType}-${t.id}`}
          src={imageUrl(t.backdropPath, "w1280") ?? undefined}
          alt=""
          fetchPriority={i === 0 ? "high" : "low"}
          className={`absolute inset-0 -z-20 h-full w-full object-cover object-top transition-opacity duration-700 ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-bg via-bg/60 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-2/5 bg-gradient-to-t from-bg to-transparent" />

      <div className="flex min-h-[62vh] max-w-3xl flex-col justify-end gap-4 px-4 pb-28 pt-44 sm:min-h-[72vh] sm:pt-32 sm:px-8 lg:px-12">
        <p className="text-sm font-semibold uppercase tracking-widest text-accent">Featured · {typeLabel(current)}</p>
        <h1 className="text-4xl font-extrabold leading-tight drop-shadow sm:text-6xl">{current.title}</h1>
        <p className="flex items-center gap-3 text-base text-muted">
          <span>{yearLabel(current)}</span>
          {rating && (
            <span className="inline-flex items-center gap-1 text-text">
              <Star size={16} className="fill-amber-400 text-amber-400" aria-hidden />
              {rating}
            </span>
          )}
        </p>
        <p className="max-w-2xl text-base leading-relaxed text-text/90 sm:text-lg">{truncate(current.overview, 220)}</p>
        <div className="mt-2 flex flex-wrap gap-3">
          <Link
            to={titlePath(current)}
            data-nav
            className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-bold text-black transition hover:bg-white/85"
          >
            <Info size={20} aria-hidden />
            Details &amp; trailer
          </Link>
          <SaveButton title={current} />
        </div>

        {titles.length > 1 && (
          <div role="group" aria-label="Choose featured title" className="mt-4 flex gap-2">
            {titles.map((t, i) => (
              <button
                key={`${t.mediaType}-${t.id}`}
                type="button"
                aria-label={`Show ${t.title}`}
                aria-current={i === index}
                onClick={() => setIndex(i)}
                className={`h-2 rounded-full transition-all ${i === index ? "w-8 bg-white" : "w-2 bg-white/40 hover:bg-white/70"}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
