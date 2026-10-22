import { useSearchParams } from "react-router-dom";
import type { MediaType } from "@shared/types.ts";
import { api, type Sort } from "../api.ts";
import { EmptyState, ErrorMessage, Spinner } from "../components/States.tsx";
import { TitleGrid } from "../components/TitleGrid.tsx";
import { useAsync } from "../hooks/useAsync.ts";
import { usePaged } from "../hooks/usePaged.ts";

const SORTS: { value: Sort; label: string }[] = [
  { value: "popularity.desc", label: "Most popular" },
  { value: "vote_average.desc", label: "Top rated" },
  { value: "primary_release_date.desc", label: "Newest" },
];

const isSort = (v: string | null): v is Sort => SORTS.some((s) => s.value === v);

export function BrowsePage({ type }: { type: MediaType }) {
  const [params, setParams] = useSearchParams();
  const genre = Number(params.get("genre")) || undefined;
  const sortParam = params.get("sort");
  const sort: Sort = isSort(sortParam) ? sortParam : "popularity.desc";

  const genres = useAsync((signal) => api.genres(type, signal), [type]);
  const paged = usePaged((page, signal) => api.browse(type, { genre, sort, page }, signal), [type, genre, sort]);

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    setParams(next, { replace: true });
  };

  const heading = type === "movie" ? "Movies" : "Shows";

  return (
    <main className="px-4 pb-16 pt-28 sm:px-8 sm:pt-32 lg:px-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-extrabold">{heading}</h1>
        <label className="flex items-center gap-2 text-sm text-muted">
          Sort
          <select
            value={sort}
            data-nav
            onChange={(e) => update({ sort: e.target.value === "popularity.desc" ? null : e.target.value })}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-text"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div role="group" aria-label="Genres" className="no-scrollbar -mx-4 mb-8 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {[{ id: 0, name: "All" }, ...(genres.data ?? [])].map((g) => {
          const active = (g.id || undefined) === genre;
          return (
            <button
              key={g.id}
              type="button"
              data-nav
              aria-pressed={active}
              onClick={() => update({ genre: g.id ? String(g.id) : null })}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold whitespace-nowrap transition ${
                active ? "bg-white text-black" : "bg-surface text-muted hover:bg-surface-2 hover:text-text"
              }`}
            >
              {g.name}
            </button>
          );
        })}
      </div>

      {paged.loading ? (
        <Spinner />
      ) : paged.error && paged.items.length === 0 ? (
        <ErrorMessage error={paged.error} onRetry={paged.reload} />
      ) : paged.items.length === 0 ? (
        <EmptyState title="Nothing here">Try a different genre.</EmptyState>
      ) : (
        <TitleGrid items={paged.items} hasMore={paged.hasMore} loadingMore={paged.loadingMore} onLoadMore={paged.loadMore} />
      )}
    </main>
  );
}
