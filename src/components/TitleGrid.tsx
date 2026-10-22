import type { Title } from "@shared/types.ts";
import { PosterCard } from "./PosterCard.tsx";

interface Props {
  items: Title[];
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}

export function TitleGrid({ items, hasMore = false, loadingMore = false, onLoadMore }: Props) {
  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
        {items.map((item) => (
          <li key={`${item.mediaType}-${item.id}`}>
            <PosterCard title={item} />
          </li>
        ))}
      </ul>
      {hasMore && onLoadMore && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            data-nav
            onClick={onLoadMore}
            disabled={loadingMore}
            className="rounded-lg border border-line bg-surface px-8 py-3 font-semibold hover:bg-surface-2 disabled:opacity-60"
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </>
  );
}
