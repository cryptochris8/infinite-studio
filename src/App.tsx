import { useEffect } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import { Header } from "./components/Header.tsx";
import { EmptyState, ErrorMessage, Spinner } from "./components/States.tsx";
import { useRemoteNavigation } from "./hooks/useRemoteNavigation.ts";
import { BrowsePage } from "./pages/BrowsePage.tsx";
import { DetailPage } from "./pages/DetailPage.tsx";
import { HomePage } from "./pages/HomePage.tsx";
import { MyListPage } from "./pages/MyListPage.tsx";
import { SearchPage } from "./pages/SearchPage.tsx";
import { useProfile } from "./state/profile.ts";

function NotFound() {
  return (
    <div className="pt-24">
      <EmptyState title="Page not found">
        <Link to="/" data-nav className="underline">
          Back to Home
        </Link>
      </EmptyState>
    </div>
  );
}

export function App() {
  const { pathname } = useLocation();
  const { ready, error, init } = useProfile();
  useRemoteNavigation();

  useEffect(() => {
    void init();
  }, [init]);

  // Each page starts at the top.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  if (!ready) return <Spinner label="Starting" />;
  if (error) return <ErrorMessage error={new Error(error)} onRetry={() => void init()} />;

  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/movies" element={<BrowsePage type="movie" />} />
        <Route path="/shows" element={<BrowsePage type="tv" />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/my-list" element={<MyListPage />} />
        <Route path="/movie/:id" element={<DetailPage type="movie" />} />
        <Route path="/tv/:id" element={<DetailPage type="tv" />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
