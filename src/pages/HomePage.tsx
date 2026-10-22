import { api } from "../api.ts";
import { Hero } from "../components/Hero.tsx";
import { Row } from "../components/Row.tsx";
import { ErrorMessage, Spinner } from "../components/States.tsx";
import { useAsync } from "../hooks/useAsync.ts";
import { useProfile } from "../state/profile.ts";

export function HomePage() {
  const { data, error, loading, reload } = useAsync((signal) => api.home(signal), []);
  const myList = useProfile((s) => s.watchlist);

  if (error && !data) return <div className="pt-24"><ErrorMessage error={error} onRetry={reload} /></div>;
  if (!data) return <div className="pt-24" aria-busy={loading}><Spinner label="Loading the catalog" /></div>;

  return (
    <div className="pb-16">
      <Hero titles={data.hero} />
      <div className="-mt-16 space-y-8 sm:-mt-20">
        <Row title="My List" items={myList} />
        {data.rows.map((row) => (
          <Row key={row.id} title={row.title} items={row.items} />
        ))}
      </div>
    </div>
  );
}
