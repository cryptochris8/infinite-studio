import { Star } from "lucide-react";
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import type { MediaType, TitleDetails } from "@shared/types.ts";
import { api } from "../api.ts";
import { CastList } from "../components/CastList.tsx";
import { SaveButton } from "../components/SaveButton.tsx";
import { Row } from "../components/Row.tsx";
import { ErrorMessage, Spinner } from "../components/States.tsx";
import { Trailer } from "../components/Trailer.tsx";
import { WhereToWatch } from "../components/WhereToWatch.tsx";
import { useAsync } from "../hooks/useAsync.ts";
import { formatRating, formatRuntime, typeLabel, yearLabel } from "@shared/format.ts";
import { imageUrl, posterSrcSet } from "../lib/img.ts";

function Meta({ details }: { details: TitleDetails }) {
  const rating = formatRating(details);
  const runtime = formatRuntime(details.runtime);
  const parts = [
    typeLabel(details),
    yearLabel(details),
    runtime,
    details.seasons ? `${details.seasons} season${details.seasons === 1 ? "" : "s"}` : "",
  ].filter(Boolean);

  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted">
      {rating && (
        <span className="inline-flex items-center gap-1 font-semibold text-text">
          <Star size={16} className="fill-amber-400 text-amber-400" aria-hidden />
          {rating}
        </span>
      )}
      {details.certification && (
        <span className="rounded border border-muted/60 px-1.5 text-xs font-semibold text-text">{details.certification}</span>
      )}
      <span>{parts.join(" · ")}</span>
    </p>
  );
}

export function DetailPage({ type }: { type: MediaType }) {
  const { id } = useParams();
  const titleId = Number(id);
  const valid = Number.isInteger(titleId) && titleId > 0;
  const { data: details, error, loading, reload } = useAsync(
    (signal) => (valid ? api.title(type, titleId, signal) : Promise.reject(new Error("That title doesn't exist."))),
    [type, titleId],
  );

  useEffect(() => {
    if (details) document.title = `${details.title} · multistream`;
    return () => {
      document.title = "multistream";
    };
  }, [details]);

  if (error) return <div className="pt-24"><ErrorMessage error={error} onRetry={valid ? reload : undefined} /></div>;
  if (!details || details.id !== titleId) return <div className="pt-24" aria-busy={loading}><Spinner /></div>;

  const backdrop = imageUrl(details.backdropPath, "w1280");
  const poster = imageUrl(details.posterPath, "w500");

  return (
    <article className="pb-16">
      <div className="relative isolate">
        {backdrop && <img src={backdrop} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover object-top opacity-60" />}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-bg via-bg/70 to-bg/30" />
        <div className="flex flex-col gap-8 px-4 pb-10 pt-28 sm:px-8 md:flex-row lg:px-12">
          {poster && (
            <img
              src={poster}
              srcSet={posterSrcSet(details.posterPath)}
              sizes="(min-width: 768px) 288px, 192px"
              alt={`${details.title} poster`}
              className="w-48 self-center rounded-2xl shadow-2xl ring-1 ring-white/10 md:w-72 md:self-start"
            />
          )}
          <div className="max-w-3xl space-y-4">
            <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">{details.title}</h1>
            {details.tagline && <p className="text-lg italic text-muted">{details.tagline}</p>}
            <Meta details={details} />
            {details.genres.length > 0 && (
              <ul className="flex flex-wrap gap-2" aria-label="Genres">
                {details.genres.map((g) => (
                  <li key={g.id} className="rounded-full bg-white/10 px-3 py-1 text-sm">
                    {g.name}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-base leading-relaxed sm:text-lg">{details.overview || "No description available yet."}</p>
            {details.directors.length > 0 && (
              <p className="text-muted">
                <span className="font-semibold text-text">{details.mediaType === "movie" ? "Directed by" : "Created by"}</span>{" "}
                {details.directors.join(", ")}
              </p>
            )}
            <SaveButton title={details} className="mt-2" />
          </div>
        </div>
      </div>

      <div className="space-y-12 px-4 sm:px-8 lg:px-12">
        <WhereToWatch availability={details.availability} />
        <Trailer trailer={details.trailer} title={details.title} backdropPath={details.backdropPath} />
        <CastList cast={details.cast} />
      </div>
      <div className="mt-12">
        <Row title="More like this" items={details.similar} />
      </div>
    </article>
  );
}
