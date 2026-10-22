import { Link } from "react-router-dom";
import { EmptyState } from "../components/States.tsx";
import { TitleGrid } from "../components/TitleGrid.tsx";
import { useProfile } from "../state/profile.ts";

export function MyListPage() {
  const watchlist = useProfile((s) => s.watchlist);
  const profile = useProfile((s) => s.current);

  return (
    <main className="px-4 pb-16 pt-28 sm:px-8 sm:pt-32 lg:px-12">
      <h1 className="mb-6 text-3xl font-extrabold">{profile ? `${profile.name}'s List` : "My List"}</h1>
      {watchlist.length === 0 ? (
        <EmptyState title="Nothing saved yet">
          Press <strong>My List</strong> on any title to save it here.{" "}
          <Link to="/movies" data-nav className="underline">
            Browse movies
          </Link>
        </EmptyState>
      ) : (
        <TitleGrid items={watchlist} />
      )}
    </main>
  );
}
