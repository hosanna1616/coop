"use client";

import { useState, useEffect, useRef } from "react";

const MESSAGES = [
  {
    tagline: "Cooperative Bank of Oromia",
    headline: "Field operations & branch management, unified.",
    description:
      "Scout zones, onboard merchants, and run missions from one place. Built for teams that move.",
    quote: "Growth through cooperation.",
  },
  {
    tagline: "Merchant Nation Command",
    headline: "Territory, missions, and reports in one platform.",
    description:
      "Track zones at risk, assign tasks to staff, and view activity across branches from a single dashboard.",
    quote: "One command. Every branch.",
  },
  {
    tagline: "Built for the field",
    headline: "From scout to report, without switching tools.",
    description:
      "Capture leads on the map, induct merchants, submit daily reports, and get tasks approved—all in one flow.",
    quote: "Move fast. Stay coordinated.",
  },
  {
    tagline: "Cooperative Bank of Oromia",
    headline: "Admin, managers, and staff—aligned.",
    description:
      "Admins see all branches; managers run their branch; staff execute missions and grow the territory.",
    quote: "Growth through cooperation.",
  },
];

const ROTATION_MS = 5500;

export function LoginHeroPanel() {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % MESSAGES.length);
    }, ROTATION_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPaused]);

  const msg = MESSAGES[index];

  return (
    <div
      className="flex flex-col justify-center text-center md:max-w-md md:text-left"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      <div className="mb-4 inline-block w-12 border-t-2 border-primary md:mb-6" aria-hidden />
      <div
        key={index}
        className="animate-hero-enter overflow-hidden"
      >
        <p
          className="font-mono text-sm font-medium uppercase tracking-[0.2em] text-primary animate-hero-line"
          style={{ animationDelay: "80ms" }}
        >
          {msg.tagline}
        </p>
        <h2
          className="mt-3 text-2xl font-semibold leading-tight tracking-tight text-foreground md:mt-4 md:text-3xl animate-hero-line"
          style={{ animationDelay: "200ms" }}
        >
          {msg.headline}
        </h2>
        <p
          className="mt-3 text-muted-foreground md:mt-4 md:text-base animate-hero-line"
          style={{ animationDelay: "320ms" }}
        >
          {msg.description}
        </p>
        <blockquote
          className="mt-6 border-l-2 border-primary/50 pl-4 font-serif italic text-foreground/90 md:mt-8 md:pl-5 animate-hero-line"
          style={{ animationDelay: "440ms" }}
        >
          &ldquo;{msg.quote}&rdquo;
        </blockquote>
      </div>
    </div>
  );
}
