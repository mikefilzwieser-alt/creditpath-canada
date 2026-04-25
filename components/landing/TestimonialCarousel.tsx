"use client";

import { useCallback, useEffect, useRef, type KeyboardEvent } from "react";

const testimonials = [
  {
    name: "Sarah M., Vancouver BC",
    quote:
      "I went from 521 to 674 in 9 months. Got approved for my first car loan on my own. This program actually works.",
  },
  {
    name: "Jason T., Calgary AB",
    quote:
      "I had 4 collections and zero credit cards. They mapped out exactly what to do and in what order. Month 6 I hit 640.",
  },
  {
    name: "Michelle R., Saskatoon SK",
    quote:
      "My husband was my co-signer for everything. After 10 months on this program I qualified on my own. Best $4.44/week I ever spent.",
  },
  {
    name: "David K., Edmonton AB",
    quote:
      "I had no idea where to start. The monthly plan told me exactly what to do. Month 8 I was at 695 and got approved for a mortgage pre-approval.",
  },
  {
    name: "Priya S., Burnaby BC",
    quote:
      "Three collections and a repo on my file. I followed every step. 11 months later I was at 658 and driving a new car.",
  },
] as const;

const TEAL = "var(--cp-teal)";
const TEAL_HEX = "#00C9A7";

const DRIFT_PX_PER_FRAME = 0.45;

const GAP_PX = 24;

export function TestimonialCarousel({ headingClass }: { headingClass: string }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    const tick = () => {
      const el = scrollerRef.current;
      if (el && !pausedRef.current) {
        el.scrollLeft += DRIFT_PX_PER_FRAME;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  /** Desktop: Shift + vertical wheel scrolls the strip (scrollbar also visible from md). */
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth + 2) return;
      if (!e.shiftKey) return;
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const scrollByCards = useCallback(
    (direction: -1 | 1) => {
      const el = scrollerRef.current;
      if (!el) return;
      const firstCard = el.querySelector<HTMLElement>("[data-testimonial-card]");
      const step = (firstCard?.offsetWidth ?? 280) + GAP_PX;

      el.scrollBy({ left: direction * step, behavior: "smooth" });
    },
    [],
  );

  const onScrollerKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        scrollByCards(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        scrollByCards(1);
      }
    },
    [scrollByCards],
  );

  return (
    <div className="relative mt-10 w-full max-w-full">
      <button
        type="button"
        aria-label="Previous testimonials"
        onClick={() => scrollByCards(-1)}
        className={`absolute left-0 top-1/2 z-20 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full text-[var(--cp-dark)] shadow-md transition-opacity hover:opacity-90 md:flex ${headingClass}`}
        style={{ backgroundColor: TEAL_HEX }}
      >
        <span className="text-xl font-bold leading-none" aria-hidden="true">
          ‹
        </span>
      </button>
      <button
        type="button"
        aria-label="Next testimonials"
        onClick={() => scrollByCards(1)}
        className={`absolute right-0 top-1/2 z-20 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full text-[var(--cp-dark)] shadow-md transition-opacity hover:opacity-90 md:flex ${headingClass}`}
        style={{ backgroundColor: TEAL_HEX }}
      >
        <span className="text-xl font-bold leading-none" aria-hidden="true">
          ›
        </span>
      </button>

      <div
        ref={scrollerRef}
        role="region"
        aria-label="Testimonials. Scroll horizontally, or hold Shift and use the mouse wheel."
        tabIndex={0}
        onKeyDown={onScrollerKeyDown}
        onPointerDownCapture={(e) => {
          if (e.pointerType === "touch") pausedRef.current = true;
        }}
        onPointerUpCapture={() => {
          pausedRef.current = false;
        }}
        onPointerCancel={() => {
          pausedRef.current = false;
        }}
        className="w-full max-w-full overflow-x-scroll overflow-y-hidden overscroll-x-contain pb-2 pt-1 outline-none focus-visible:ring-2 focus-visible:ring-[var(--cp-teal)] focus-visible:ring-offset-2 max-md:[-ms-overflow-style:none] max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden md:cursor-grab md:px-12 md:pb-3 md:[scrollbar-width:thin] md:[scrollbar-color:rgba(15,25,35,0.35)_transparent] md:[&::-webkit-scrollbar]:h-2 md:[&::-webkit-scrollbar-thumb]:rounded-full md:[&::-webkit-scrollbar-thumb]:bg-[#0F1923]/25 md:active:cursor-grabbing"
      >
        {/* Do not use min-w-0 here — it collapses the row to the viewport and kills scrolling. */}
        <div className="flex w-max flex-nowrap px-1" style={{ gap: GAP_PX }}>
          {testimonials.map((t) => (
            <blockquote
              key={t.name}
              data-testimonial-card
              className={`box-border w-[min(300px,calc(100vw-3rem))] shrink-0 snap-start snap-always rounded-2xl border border-[var(--cp-border)] bg-white p-6 shadow-[0_8px_24px_rgba(15,25,35,0.06)] sm:w-[300px] ${headingClass}`}
            >
              <p className={`text-sm font-bold ${headingClass}`} style={{ color: TEAL }}>
                {t.name}
              </p>
              <p className="mt-4 text-sm leading-relaxed text-[#0F1923]/90">&ldquo;{t.quote}&rdquo;</p>
            </blockquote>
          ))}
        </div>
      </div>

      <div className="mt-4 flex justify-center gap-3 md:hidden">
        <button
          type="button"
          aria-label="Previous testimonials"
          onClick={() => scrollByCards(-1)}
          className={`inline-flex size-11 items-center justify-center rounded-full text-[var(--cp-dark)] shadow-md ${headingClass}`}
          style={{ backgroundColor: TEAL_HEX }}
        >
          <span className="text-xl font-bold leading-none" aria-hidden="true">
            ‹
          </span>
        </button>
        <button
          type="button"
          aria-label="Next testimonials"
          onClick={() => scrollByCards(1)}
          className={`inline-flex size-11 items-center justify-center rounded-full text-[var(--cp-dark)] shadow-md ${headingClass}`}
          style={{ backgroundColor: TEAL_HEX }}
        >
          <span className="text-xl font-bold leading-none" aria-hidden="true">
            ›
          </span>
        </button>
      </div>
    </div>
  );
}
