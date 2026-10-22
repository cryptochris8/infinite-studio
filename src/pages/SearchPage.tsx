import { useSearchParams } from "react-router-dom";
import { api } from "../api.ts";
import { EmptyState, ErrorMessage, Spinner } from "../components/States.tsx";
import { TitleGrid } from "../components/TitleGrid.tsx";
import { usePaged } from "../hooks/usePaged.ts";

export function SearchPage() {
  const [params] = useSearchParams();
  const q = (params.get("q") ?? "").trim();
  const paged = usePaged((page, signal) => (q ? api.search(q, page, signal) : Promise.resolve({ page: 1, totalPages: 0, items: [] })), [q]);

  return (
    <main className="px-4 pb-16 pt-28 sm:px-8 sm:pt-32 lg:px-12">
      <h1 className="mb-6 text-3xl font-extrabold">{q ? `Results for "${q}"` : "Search"}</h1>
      {!q ? (
        <EmptyState title="Search for a movie or show">Type a title in the search box above.</EmptyState>
      ) : paged.loading ? (
        <Spinner label="Searching" />
      ) : paged.error && paged.items.length === 0 ? (
        <ErrorMessage error={paged.error} onRetry={paged.reload} />
      ) : paged.items.length === 0 ? (
        <EmptyState title={`No results for "${q}"`}>Check the spelling or try fewer words.</EmptyState>
      ) : (
        <TitleGrid items={paged.items} hasMore={paged.hasMore} loadingMore={paged.loadingMore} onLoadMore={paged.loadMore} />
      )}
    </main>
  );
}
