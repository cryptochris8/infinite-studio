import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import type { Title } from "@shared/types.ts";
import { PosterCard } from "./PosterCard.tsx";

interface Props {
  title: string;
  items: Title[];
}

export function Row({ title, items }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  if (items.length === 0) return null;

  const scrollBy = (direction: 1 | -1) => {
    const el = scroller.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: "smooth" });
  };

  return (
    <section aria-label={title} className="group/row relative">
      <h2 className="mb-3 px-4 text-xl font-bold sm:px-8 lg:px-12">{title}</h2>
      <div className="relative">
        <button
          type="button"
          aria-label={`Scroll ${title} left`}
          onClick={() => scrollBy(-1)}
          className="absolute inset-y-0 left-0 z-20 hidden w-12 items-center justify-center bg-gradient-to-r from-bg to-transparent opacity-0 transition group-hover/row:opacity-100 focus-visible:opacity-100 md:flex"
        >
          <ChevronLeft size={32} aria-hidden />
        </button>
        <div
          ref={scroller}
          className="no-scrollbar flex snap-x gap-3 overflow-x-auto scroll-px-4 px-4 py-3 sm:scroll-px-8 sm:gap-4 sm:px-8 lg:scroll-px-12 lg:px-12"
        >
          {items.map((item) => (
            <PosterCard key={`${item.mediaType}-${item.id}`} title={item} fixedWidth />
          ))}
        </div>
        <button
          type="button"
          aria-label={`Scroll ${title} right`}
          onClick={() => scrollBy(1)}
          className="absolute inset-y-0 right-0 z-20 hidden w-12 items-center justify-center bg-gradient-to-l from-bg to-transparent opacity-0 transition group-hover/row:opacity-100 focus-visible:opacity-100 md:flex"
        >
          <ChevronRight size={32} aria-hidden />
        </button>
      </div>
    </section>
  );
}
