"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";

type Props = {
  /**
   * Target value to count up to.
   */
  to: number;
  /**
   * Optional suffix appended after the formatted number (e.g. "+", "%", "k").
   */
  suffix?: string;
  className?: string;
};

const DURATION_MS = 1800;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Counter — animates a number from 0 → `to` with an ease-out-cubic curve over
 * 1800ms once the element enters the viewport (one-shot). Direct port of the
 * counter logic from `design-handoff/project/site/scripts.js` (lines 18-31).
 *
 * Locale formatting follows `next-intl`'s active locale (Intl-style grouping).
 *
 * Respects `prefers-reduced-motion`: when reduced motion is requested, the
 * final value is shown immediately with no animation.
 */
export function Counter({ to, suffix, className }: Props) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const locale = useLocale();
  // Começa em `to`, não em 0: o HTML do servidor tem de conter o valor real
  // (crawlers de AI/pesquisa não executam JS — um SSR a "0" publica o número
  // errado). O reset a 0 acontece só no cliente, antes de a animação arrancar.
  const [value, setValue] = useState(to);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduced) {
      setValue(to);
      setDone(true);
      return;
    }

    const node = ref.current;
    if (!node) return;

    setValue(0);

    let rafId = 0;
    let started = false;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || started) return;
          started = true;
          observer.unobserve(entry.target);

          const start = performance.now();
          const tick = (now: number) => {
            const t = Math.min(1, (now - start) / DURATION_MS);
            const eased = easeOutCubic(t);
            setValue(Math.round(to * eased));
            if (t < 1) {
              rafId = window.requestAnimationFrame(tick);
            } else {
              setDone(true);
            }
          };
          rafId = window.requestAnimationFrame(tick);
        });
      },
      { threshold: 0.4 }
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [to]);

  // Lock to the final value once animation completes to avoid any subtle
  // re-render drift.
  const displayed = done ? to : value;
  const formatted = displayed.toLocaleString(locale);

  return (
    <span ref={ref} className={className}>
      {formatted}
      {suffix}
    </span>
  );
}

export default Counter;
