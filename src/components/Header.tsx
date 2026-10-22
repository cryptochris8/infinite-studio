import { Play, Search } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ProfileMenu } from "./ProfileMenu.tsx";

const LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/movies", label: "Movies" },
  { to: "/shows", label: "Shows" },
  { to: "/my-list", label: "My List" },
];

export function Header() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const onSearchPage = pathname === "/search";
  const [text, setText] = useState(onSearchPage ? (params.get("q") ?? "") : "");

  // Keep the box in sync when arriving on /search from a link or the back button.
  useEffect(() => {
    setText(onSearchPage ? (params.get("q") ?? "") : "");
  }, [onSearchPage, params]);

  // Search as you type, after a short pause. Enter searches immediately.
  useEffect(() => {
    const q = text.trim();
    if (q.length < 2 || (onSearchPage && q === (params.get("q") ?? "").trim())) return;
    const timer = setTimeout(() => navigate(`/search?q=${encodeURIComponent(q)}`, { replace: onSearchPage }), 450);
    return () => clearTimeout(timer);
  }, [text, onSearchPage, params, navigate]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const q = text.trim();
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`, { replace: onSearchPage });
  }

  return (
    <header className="fixed inset-x-0 top-0 z-40 bg-gradient-to-b from-black/90 via-black/60 to-transparent">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-8 lg:px-12">
        <Link to="/" data-nav className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-lg bg-accent">
            <Play size={16} className="ml-0.5 fill-white" aria-hidden />
          </span>
          multistream
        </Link>

        <nav aria-label="Main" className="order-last flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              data-nav
              className={({ isActive }) =>
                `rounded-full px-4 py-1.5 text-sm font-semibold whitespace-nowrap transition ${
                  isActive ? "bg-white text-black" : "text-muted hover:bg-white/10 hover:text-text"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <form role="search" onSubmit={submit} className="relative">
            <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
            <input
              type="search"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Search"
              aria-label="Search movies and shows"
              data-nav
              className="w-36 rounded-full border border-line bg-black/50 py-2 pl-10 pr-3 text-sm placeholder:text-muted focus:w-52 sm:w-48 sm:focus:w-64"
              style={{ transition: "width 150ms" }}
            />
          </form>
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}
